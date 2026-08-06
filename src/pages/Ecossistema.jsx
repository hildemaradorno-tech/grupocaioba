import React, { useState, useEffect, useRef } from 'react'
import {
  User, Home, Smartphone, Lock, Globe, AlarmClock, MessageCircle,
  CalendarDays, GraduationCap, Headphones, Send, Briefcase, Store, Share2,
  Disc, HardDrive, Cloud, Database, KeyRound, Server, ShieldCheck, FileSpreadsheet,
  Building2, Plus, Trash2, X, Loader2, Monitor, Layers, Boxes,
} from 'lucide-react'
import { apiService } from '../services/api'

// Um nó do diagrama: ícone dentro de um círculo colorido + rótulo embaixo.
function NoRede({ icon: Icon, label, x, y, bg, corIcone = '#fff', hub = false }) {
  const tam = hub ? 58 : 46
  return (
    <div
      className="absolute flex flex-col items-center gap-1.5"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)', width: 120 }}
    >
      <div
        className="rounded-full flex items-center justify-center shadow-sm shrink-0"
        style={{ width: tam, height: tam, backgroundColor: bg }}
      >
        <Icon style={{ width: tam * 0.52, height: tam * 0.52, color: corIcone }} />
      </div>
      <span className="text-[10.5px] font-semibold text-slate-700 text-center leading-tight whitespace-nowrap">{label}</span>
    </div>
  )
}

// Camada de linhas SVG conectando os nós pelo id (desenhada atrás dos ícones).
function Linhas({ pares, pontos }) {
  return (
    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
      {pares.map(([a, b], i) => {
        const pa = pontos[a], pb = pontos[b]
        if (!pa || !pb) return null
        return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} stroke="#cbd5e1" strokeWidth="1.5" />
      })}
    </svg>
  )
}

const LARGURA = 1100
const ALTURA = 760

const clamp = (v, a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b); return Math.min(hi, Math.max(lo, v)) }

// Viewport com arrastar (mouse) e zoom (+/-) para os diagramas — o canvas é
// maior que a área visível, então em vez de rolar com scrollbar dá pra
// arrastar direto, sempre limitado pra não sumir de vista.
function PanZoomCanvas({ largura, altura, children }) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const viewportRef = useRef(null)
  const arrastoRef = useRef({ ativo: false, x: 0, y: 0, panX: 0, panY: 0 })

  const limitarPan = (p, z) => {
    const vw = viewportRef.current?.clientWidth || 800
    const vh = viewportRef.current?.clientHeight || 620
    const margem = 150
    return {
      x: clamp(p.x, vw - largura * z - margem, margem),
      y: clamp(p.y, vh - altura * z - margem, margem),
    }
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!arrastoRef.current.ativo) return
      const dx = e.clientX - arrastoRef.current.x
      const dy = e.clientY - arrastoRef.current.y
      setPan(limitarPan({ x: arrastoRef.current.panX + dx, y: arrastoRef.current.panY + dy }, zoom))
    }
    const onUp = () => { arrastoRef.current.ativo = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [zoom, largura, altura])

  const onMouseDown = (e) => {
    arrastoRef.current = { ativo: true, x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const aplicarZoom = (delta) => {
    const novo = clamp(+(zoom + delta).toFixed(2), 0.4, 1.5)
    setZoom(novo)
    setPan(p => limitarPan(p, novo))
  }

  const resetar = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/95 backdrop-blur border border-slate-200 rounded-lg shadow-sm p-1">
        <button type="button" onClick={() => aplicarZoom(-0.1)} title="Diminuir zoom"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 font-bold">−</button>
        <span className="text-[10px] font-semibold text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => aplicarZoom(0.1)} title="Aumentar zoom"
          className="w-7 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 font-bold">+</button>
        <button type="button" onClick={resetar} title="Restaurar"
          className="ml-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-1.5">100%</button>
      </div>
      <div
        ref={viewportRef}
        onMouseDown={onMouseDown}
        className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/40 cursor-grab active:cursor-grabbing select-none"
        style={{ height: 620 }}
      >
        <div className="relative" style={{ width: largura, height: altura, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// ── Diagrama 1: ecossistema real do Portal de Gestão GC ──────────────────────
function DiagramaReal() {
  const nos = {
    admin:        { x: 90,  y: 90,  icon: User,           label: 'Admin',                     bg: '#e2e8f0', cor: '#334155' },
    gestor:       { x: 220, y: 55,  icon: User,           label: 'Gestor',                    bg: '#e2e8f0', cor: '#334155' },
    colaborador:  { x: 350, y: 95,  icon: User,           label: 'Colaborador',               bg: '#e2e8f0', cor: '#334155' },
    empresa:      { x: 55,  y: 230, icon: Home,           label: 'Empresas do Grupo',         bg: '#e2e8f0', cor: '#334155' },
    mobile:       { x: 55,  y: 390, icon: Smartphone,     label: 'Acesso via Celular',        bg: '#e2e8f0', cor: '#334155' },

    frontend:     { x: 270, y: 300, icon: Cloud,          label: 'Cloudflare Pages\n(Frontend React)', bg: '#f97316', cor: '#fff', hub: true },

    supabase:     { x: 620, y: 300, icon: Database,       label: 'Supabase\n(Banco + Login)', bg: '#10b981', cor: '#fff', hub: true },
    auth:         { x: 560, y: 100, icon: KeyRound,       label: 'Autenticação (Login)',      bg: '#e2e8f0', cor: '#334155' },
    crud:         { x: 780, y: 80,  icon: Share2,         label: 'Dados de quase\ntodas as telas', bg: '#e2e8f0', cor: '#334155' },

    backend:      { x: 620, y: 540, icon: Server,         label: 'Backend Express\n(Railway)', bg: '#7c3aed', cor: '#fff', hub: true },
    azuread:      { x: 460, y: 620, icon: ShieldCheck,    label: 'Azure AD',                  bg: '#e2e8f0', cor: '#334155' },
    graph:        { x: 620, y: 640, icon: Share2,         label: 'Microsoft Graph',           bg: '#e2e8f0', cor: '#334155' },
    sharepoint:   { x: 800, y: 620, icon: FileSpreadsheet,label: 'SharePoint\n(planilhas)',   bg: '#e2e8f0', cor: '#334155' },
  }

  const pares = [
    ['admin', 'frontend'], ['gestor', 'frontend'], ['colaborador', 'frontend'],
    ['empresa', 'frontend'], ['mobile', 'frontend'],
    ['frontend', 'supabase'],
    ['auth', 'supabase'], ['crud', 'supabase'],
    ['supabase', 'backend'],
    ['azuread', 'backend'], ['graph', 'backend'], ['sharepoint', 'backend'],
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <PanZoomCanvas largura={LARGURA} altura={ALTURA}>
        <Linhas pares={pares} pontos={nos} />
        {Object.entries(nos).map(([id, n]) => (
          <NoRede key={id} x={n.x} y={n.y} icon={n.icon} bg={n.bg} corIcone={n.cor} hub={n.hub}
            label={n.label.split('\n').map((l, i) => <span key={i} className="block">{l}</span>)} />
        ))}
      </PanZoomCanvas>
      <p className="text-[11px] text-slate-400 text-center mt-2">
        Ecossistema do Portal de Gestão GC — a maioria das telas fala direto com o Supabase; só as que dependem do
        SharePoint (KPIs, Garantias, Comissões, Férias) passam pelo backend no Railway.
      </p>
    </div>
  )
}

// ── Diagrama 2: recriação fiel da imagem de referência (rede genérica) ───────
function DiagramaExemplo() {
  const nos = {
    user1:    { x: 91,  y: 80,  icon: User,           label: 'User',              bg: '#f1f5f9', cor: '#1e293b' },
    user2:    { x: 210, y: 48,  icon: User,           label: 'User',              bg: '#f1f5f9', cor: '#1e293b' },
    user3:    { x: 330, y: 93,  icon: User,           label: 'User',              bg: '#f1f5f9', cor: '#1e293b' },
    home:     { x: 48,  y: 196, icon: Home,           label: 'Home',              bg: '#f1f5f9', cor: '#1e293b' },
    mobile:   { x: 88,  y: 313, icon: Smartphone,     label: 'Mobile',            bg: '#f1f5f9', cor: '#1e293b' },
    sec1:     { x: 240, y: 238, icon: Lock,           label: 'Security',          bg: '#f97316', cor: '#fff', hub: true },

    alarm:    { x: 529, y: 84,  icon: AlarmClock,     label: 'Alarm',             bg: '#fecaca', cor: '#b91c1c' },
    chat:     { x: 691, y: 55,  icon: MessageCircle,  label: 'Chat',              bg: '#99f6e4', cor: '#0f766e' },
    calendar: { x: 849, y: 122, icon: CalendarDays,   label: 'Calendar',          bg: '#fca5a5', cor: '#7f1d1d' },
    internet: { x: 691, y: 272, icon: Globe,          label: 'Internet',          bg: '#38bdf8', cor: '#fff', hub: true },
    education:{ x: 936, y: 238, icon: GraduationCap,  label: 'Education',        bg: '#e2e8f0', cor: '#334155' },
    support:  { x: 909, y: 371, icon: Headphones,     label: 'Customer Support',  bg: '#fb923c', cor: '#fff' },

    sec2:     { x: 524, y: 432, icon: Lock,           label: 'Security',          bg: '#f97316', cor: '#fff', hub: true },
    report:   { x: 254, y: 429, icon: Send,           label: 'Report',            bg: '#e2e8f0', cor: '#334155' },
    business: { x: 284, y: 575, icon: Briefcase,      label: 'Business',          bg: '#e2e8f0', cor: '#334155' },
    store:    { x: 409, y: 596, icon: Store,          label: 'Store',             bg: '#bbf7d0', cor: '#15803d' },
    analytics:{ x: 556, y: 602, icon: Share2,         label: 'Analytics',         bg: '#e9d5ff', cor: '#7e22ce' },
    tape:     { x: 724, y: 624, icon: Disc,           label: 'Tape Storage',      bg: '#bbf7d0', cor: '#15803d' },
    storage:  { x: 866, y: 536, icon: HardDrive,      label: 'Storage',           bg: '#e2e8f0', cor: '#334155' },
  }

  const pares = [
    ['user1', 'sec1'], ['user2', 'sec1'], ['user3', 'sec1'], ['home', 'sec1'], ['mobile', 'sec1'],
    ['sec1', 'internet'],
    ['alarm', 'internet'], ['chat', 'internet'], ['calendar', 'internet'],
    ['internet', 'education'], ['internet', 'support'], ['internet', 'sec2'],
    ['report', 'sec2'], ['sec2', 'business'], ['sec2', 'store'], ['sec2', 'analytics'],
    ['sec2', 'tape'], ['sec2', 'storage'],
  ]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <PanZoomCanvas largura={LARGURA} altura={ALTURA}>
        <Linhas pares={pares} pontos={nos} />
        {Object.entries(nos).map(([id, n]) => (
          <NoRede key={id} x={n.x} y={n.y} icon={n.icon} bg={n.bg} corIcone={n.cor} hub={n.hub} label={n.label} />
        ))}
      </PanZoomCanvas>
      <p className="text-[11px] text-slate-400 text-center mt-2">Network</p>
    </div>
  )
}

const PALETA = ['#f97316', '#0ea5e9', '#8b5cf6', '#10b981', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1', '#ef4444', '#84cc16']

// Catálogo de ícones que um sistema pode usar (escolhido no modal "Editar Sistema").
const SISTEMA_ICONES = {
  monitor: Monitor, cloud: Cloud, database: Database, server: Server,
  smartphone: Smartphone, globe: Globe, share2: Share2, keyround: KeyRound,
  shield: ShieldCheck, harddrive: HardDrive, filespreadsheet: FileSpreadsheet,
  layers: Layers, boxes: Boxes,
}

// Campo de tags: digita o nome do sistema e Enter (ou "+") adiciona um chip
// removível. `valores` é um array de objetos { nome, cor, icone, emoji }.
function TagsInput({ valores, onAdicionar, onRemover }) {
  const [texto, setTexto] = useState('')
  const adicionar = () => {
    const v = texto.trim()
    if (!v) return
    onAdicionar(v)
    setTexto('')
  }
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }}
          placeholder="Nome do sistema e Enter..."
          className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <button type="button" onClick={adicionar}
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {valores.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {valores.map(v => (
            <span key={v.nome} className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
              {v.nome}
              <button type="button" onClick={() => onRemover(v.nome)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[10px] text-slate-400 mt-1.5">Depois de salvar, clique no ícone do sistema no diagrama pra escolher cor e ícone/emoji.</p>
    </div>
  )
}

// ── Diagrama 3: "Minha Concessionária" — departamentos + sistemas cadastrados
// pelo usuário, sempre ligados ao hub central fixo "Concessionária".
function MinhaConcessionaria() {
  const [departamentos, setDepartamentos] = useState([])
  const [loading, setLoading]             = useState(true)
  const [modalAberto, setModalAberto]     = useState(false)
  const [form, setForm]                   = useState({ id: null, nome: '', sistemas: [] })
  const [salvando, setSalvando]           = useState(false)
  const [erro, setErro]                   = useState('')
  const [modalExcluir, setModalExcluir]   = useState(null)
  const [excluindo, setExcluindo]         = useState(false)
  const [modalSistema, setModalSistema]   = useState(null)
  const [salvandoSistema, setSalvandoSistema] = useState(false)
  const [novoFilhoNome, setNovoFilhoNome] = useState('')

  const carregar = () => {
    setLoading(true)
    apiService.getEcossistemaDepartamentos()
      .then(setDepartamentos)
      .catch(err => console.error('Erro ao carregar departamentos:', err))
      .finally(() => setLoading(false))
  }
  useEffect(() => { carregar() }, [])

  const abrirNovo = () => { setForm({ id: null, nome: '', sistemas: [] }); setErro(''); setModalAberto(true) }
  const abrirEditar = (dep) => { setForm({ id: dep.id, nome: dep.nome, sistemas: dep.sistemas || [] }); setErro(''); setModalAberto(true) }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Informe o nome do departamento.'); return }
    setSalvando(true)
    try {
      if (form.id) {
        const corAtual = departamentos.find(d => d.id === form.id)?.cor
        await apiService.updateEcossistemaDepartamento(form.id, { nome: form.nome, sistemas: form.sistemas, cor: corAtual })
      } else {
        const cor = PALETA[departamentos.length % PALETA.length]
        await apiService.createEcossistemaDepartamento({ nome: form.nome, sistemas: form.sistemas, cor })
      }
      setModalAberto(false)
      carregar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async () => {
    if (!modalExcluir) return
    setExcluindo(true)
    try {
      await apiService.deleteEcossistemaDepartamento(modalExcluir.id)
      setModalExcluir(null)
      carregar()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluindo(false)
    }
  }

  // Lista de todos os sistemas de todos os departamentos, pra escolher no
  // seletor "sistema pai" — chave é departamentoId::nome (sem precisar de id
  // próprio por sistema).
  const todosSistemas = departamentos.flatMap(d => (d.sistemas || []).map(s => ({
    key: `${d.id}::${s.nome}`, departamentoId: d.id, nome: s.nome, departamentoNome: d.nome,
  })))

  const abrirSistema = (departamentoId, sis) => {
    setModalSistema({
      departamentoId, index: sis.idx, nome: sis.nome,
      cor: sis.cor || '', icone: sis.icone || 'monitor', emoji: sis.emoji || '',
      paiKey: sis.paiKey || '',
    })
    setNovoFilhoNome('')
  }

  // Cria um sistema novo já nascendo "dentro" do sistema que está sendo
  // editado (pai = o sistema atual) — evita o caminho de 2 passos (criar
  // solto pelo departamento e só depois reatribuir o pai).
  const criarSistemaFilho = async () => {
    if (!modalSistema || !novoFilhoNome.trim()) return
    const dep = departamentos.find(d => d.id === modalSistema.departamentoId)
    if (!dep) return
    const nomeNovo = novoFilhoNome.trim()
    // Duas chaves iguais (mesmo departamento + mesmo nome) fazem o diagrama
    // confundir qual delas usar — bloqueia antes de criar duplicado.
    if ((dep.sistemas || []).some(s => s.nome === nomeNovo)) {
      alert(`Já existe um sistema chamado "${nomeNovo}" nesse departamento. Escolha outro nome.`)
      return
    }
    setSalvandoSistema(true)
    try {
      const novoSistema = {
        nome: nomeNovo, cor: null, icone: null, emoji: null,
        pai: { departamentoId: modalSistema.departamentoId, nome: modalSistema.nome },
      }
      const novosSistemas = [...dep.sistemas, novoSistema]
      await apiService.updateEcossistemaDepartamento(dep.id, { nome: dep.nome, sistemas: novosSistemas, cor: dep.cor })
      setNovoFilhoNome('')
      setModalSistema(null)
      carregar()
    } catch (err) {
      alert('Erro ao criar sistema: ' + (err.message || String(err)))
    } finally {
      setSalvandoSistema(false)
    }
  }

  const salvarSistema = async () => {
    if (!modalSistema) return
    const dep = departamentos.find(d => d.id === modalSistema.departamentoId)
    if (!dep) return
    setSalvandoSistema(true)
    try {
      let pai = null
      if (modalSistema.paiKey) {
        const alvo = todosSistemas.find(s => s.key === modalSistema.paiKey)
        if (alvo) pai = { departamentoId: alvo.departamentoId, nome: alvo.nome }
      }
      const novosSistemas = dep.sistemas.map((s, i) => i === modalSistema.index
        ? { nome: s.nome, cor: modalSistema.cor || null, icone: modalSistema.emoji ? null : modalSistema.icone, emoji: modalSistema.emoji || null, pai }
        : s)
      await apiService.updateEcossistemaDepartamento(dep.id, { nome: dep.nome, sistemas: novosSistemas, cor: dep.cor })
      setModalSistema(null)
      carregar()
    } catch (err) {
      alert('Erro ao salvar sistema: ' + (err.message || String(err)))
    } finally {
      setSalvandoSistema(false)
    }
  }

  const removerSistema = async () => {
    if (!modalSistema) return
    const dep = departamentos.find(d => d.id === modalSistema.departamentoId)
    if (!dep) return
    setSalvandoSistema(true)
    try {
      const novosSistemas = dep.sistemas.filter((_, i) => i !== modalSistema.index)
      await apiService.updateEcossistemaDepartamento(dep.id, { nome: dep.nome, sistemas: novosSistemas, cor: dep.cor })
      setModalSistema(null)
      carregar()
    } catch (err) {
      alert('Erro ao remover sistema: ' + (err.message || String(err)))
    } finally {
      setSalvandoSistema(false)
    }
  }

  const centro = { x: LARGURA / 2, y: ALTURA / 2 }
  const raioDept = Math.min(LARGURA, ALTURA) / 2 - 170
  const raioSistemas = raioDept + 100
  const passoNinho = 90 // quanto cada nível de "sistema dentro de sistema" soma ao raio
  const anguloSlot = (2 * Math.PI) / Math.max(departamentos.length, 1)
  const fanWidth = Math.min(anguloSlot * 0.8, 0.9)

  // Departamentos ficam ligados ao hub central, em círculo.
  const posicoes = departamentos.map((d, i) => {
    const angulo = (2 * Math.PI * i / Math.max(departamentos.length, 1)) - Math.PI / 2
    return { ...d, angulo, x: centro.x + raioDept * Math.cos(angulo), y: centro.y + raioDept * Math.sin(angulo) }
  })
  const posDeptPorId = Object.fromEntries(posicoes.map(p => [p.id, p]))

  // Sistemas "crus" de todos os departamentos, com a referência de "sistema
  // pai" já validada (pai inexistente ou apontando pra si mesmo é ignorado).
  const sistemasRaw = departamentos.flatMap(d => (d.sistemas || []).map((s, j) => ({
    key: `${d.id}::${s.nome}`, departamentoId: d.id, idx: j,
    nome: s.nome, cor: s.cor, icone: s.icone, emoji: s.emoji,
    paiKey: s.pai ? `${s.pai.departamentoId}::${s.pai.nome}` : null,
  })))
  const chavesValidas = new Set(sistemasRaw.map(s => s.key))
  sistemasRaw.forEach(s => { if (s.paiKey && (!chavesValidas.has(s.paiKey) || s.paiKey === s.key)) s.paiKey = null })

  const filhosPorChave = {}
  sistemasRaw.forEach(s => { if (s.paiKey) (filhosPorChave[s.paiKey] ||= []).push(s) })

  // Sistema sem pai fica em leque a partir do próprio departamento (nível 1);
  // sistema com pai fica em leque a partir da posição do sistema-pai (nível
  // 2, 3...), formando "sistema dentro de sistema" em vez de ligar direto ao
  // departamento.
  const posSistemaPorChave = {}
  const fila = []
  const porDepto = {}
  sistemasRaw.forEach(s => { if (!s.paiKey) (porDepto[s.departamentoId] ||= []).push(s) })

  Object.entries(porDepto).forEach(([depId, lista]) => {
    const dep = posDeptPorId[depId]
    if (!dep) return
    const passo = lista.length > 1 ? fanWidth / (lista.length - 1) : 0
    lista.forEach((s, j) => {
      const off = lista.length > 1 ? (j - (lista.length - 1) / 2) * passo : 0
      const angulo = dep.angulo + off
      posSistemaPorChave[s.key] = {
        ...s, angulo, raio: raioSistemas, parentKey: null,
        x: centro.x + raioSistemas * Math.cos(angulo), y: centro.y + raioSistemas * Math.sin(angulo),
      }
      fila.push(s.key)
    })
  })

  while (fila.length > 0) {
    const chavePai = fila.shift()
    const pai = posSistemaPorChave[chavePai]
    const filhos = filhosPorChave[chavePai] || []
    if (filhos.length === 0) continue
    const passo = filhos.length > 1 ? Math.min(fanWidth, 0.7) / (filhos.length - 1) : 0
    const raioFilhos = pai.raio + passoNinho
    filhos.forEach((s, j) => {
      if (posSistemaPorChave[s.key]) return // evita loop infinito se houver ciclo
      const off = filhos.length > 1 ? (j - (filhos.length - 1) / 2) * passo : 0
      const angulo = pai.angulo + off
      posSistemaPorChave[s.key] = {
        ...s, angulo, raio: raioFilhos, parentKey: chavePai,
        x: centro.x + raioFilhos * Math.cos(angulo), y: centro.y + raioFilhos * Math.sin(angulo),
      }
      fila.push(s.key)
    })
  }

  // Sistema que nunca foi alcançado (ciclo entre sistemas — A pertence a B e
  // B pertence a A, por exemplo) cai de volta pro leque do próprio
  // departamento, sem pai. Agrupado por departamento e espalhado em leque
  // igual aos demais, senão dois "órfãos" do mesmo departamento ficam
  // exatamente no mesmo ponto (amontoados).
  const orfaosPorDepto = {}
  sistemasRaw.forEach(s => { if (!posSistemaPorChave[s.key]) (orfaosPorDepto[s.departamentoId] ||= []).push(s) })
  Object.entries(orfaosPorDepto).forEach(([depId, lista]) => {
    const dep = posDeptPorId[depId]
    if (!dep) return
    const passo = lista.length > 1 ? fanWidth / (lista.length - 1) : 0
    lista.forEach((s, j) => {
      const off = lista.length > 1 ? (j - (lista.length - 1) / 2) * passo : 0
      const angulo = dep.angulo + off
      posSistemaPorChave[s.key] = {
        ...s, angulo, raio: raioSistemas, parentKey: null,
        x: centro.x + raioSistemas * Math.cos(angulo), y: centro.y + raioSistemas * Math.sin(angulo),
      }
    })
  })

  const todasPosSistemas = Object.values(posSistemaPorChave)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Cada departamento cadastrado aparece ligado à Concessionária (centro). Clique num departamento para editar.
        </p>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" /> Novo Departamento
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        {loading ? (
          <div className="p-16 text-center text-sm text-slate-400">Carregando...</div>
        ) : (
          <PanZoomCanvas largura={LARGURA} altura={ALTURA}>
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {posicoes.map(p => (
                <line key={p.id} x1={centro.x} y1={centro.y} x2={p.x} y2={p.y} stroke="#cbd5e1" strokeWidth="1.5" />
              ))}
              {todasPosSistemas.map(s => {
                const origem = s.parentKey ? posSistemaPorChave[s.parentKey] : posDeptPorId[s.departamentoId]
                if (!origem) return null
                return <line key={s.key} x1={origem.x} y1={origem.y} x2={s.x} y2={s.y} stroke="#dbeafe" strokeWidth="1.5" />
              })}
            </svg>

            <NoRede x={centro.x} y={centro.y} icon={Building2} label="Concessionária" bg="#1e293b" corIcone="#fff" hub />

            {posicoes.length === 0 && (
              <div className="absolute text-center text-xs text-slate-400 leading-relaxed"
                style={{ left: centro.x, top: centro.y + 90, transform: 'translateX(-50%)', width: 280 }}>
                Nenhum departamento cadastrado ainda.<br />Clique em "Novo Departamento" para começar.
              </div>
            )}

            {posicoes.map(dep => (
              <div key={dep.id} className="absolute flex flex-col items-center gap-1.5 group"
                style={{ left: dep.x, top: dep.y, transform: 'translate(-50%,-50%)', width: 150 }}>
                <div className="relative">
                  <button
                    onClick={() => abrirEditar(dep)}
                    className="rounded-full flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                    style={{ width: 50, height: 50, backgroundColor: dep.cor || '#64748b' }}
                    title="Clique para editar"
                  >
                    <Building2 className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setModalExcluir(dep) }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex w-5 h-5 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 shadow-sm transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">{dep.nome}</span>
              </div>
            ))}

            {todasPosSistemas.map(sis => {
              const IconeSis = SISTEMA_ICONES[sis.icone] || Monitor
              const corConteudo = sis.cor ? '#fff' : '#334155'
              return (
                <div key={sis.key} className="absolute flex flex-col items-center gap-1"
                  style={{ left: sis.x, top: sis.y, transform: 'translate(-50%,-50%)', width: 100 }}>
                  <button
                    onClick={() => abrirSistema(sis.departamentoId, sis)}
                    className="rounded-full flex items-center justify-center shadow-sm hover:opacity-90 transition-opacity"
                    style={{ width: 34, height: 34, backgroundColor: sis.cor || '#e2e8f0' }}
                    title="Clique para editar"
                  >
                    {sis.emoji
                      ? <span style={{ fontSize: 16, lineHeight: 1 }}>{sis.emoji}</span>
                      : <IconeSis className="w-4 h-4" style={{ color: corConteudo }} />}
                  </button>
                  <span className="text-[9.5px] font-semibold text-slate-500 text-center leading-tight whitespace-nowrap">{sis.nome}</span>
                </div>
              )
            })}
          </PanZoomCanvas>
        )}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{form.id ? 'Editar Departamento' : 'Novo Departamento'}</h3>
              <button onClick={() => setModalAberto(false)} className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Departamento</label>
              <input
                autoFocus
                value={form.nome}
                onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex.: Financeiro, Pós-Vendas, Peças..."
                className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistemas utilizados</label>
              <TagsInput
                valores={form.sistemas}
                onAdicionar={(nome) => setForm(prev => prev.sistemas.some(s => s.nome === nome) ? prev : { ...prev, sistemas: [...prev.sistemas, { nome, cor: null, icone: null, emoji: null }] })}
                onRemover={(nome) => setForm(prev => ({ ...prev, sistemas: prev.sistemas.filter(s => s.nome !== nome) }))}
              />
            </div>

            {erro && <p className="text-xs text-red-600">{erro}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition-colors"
              >
                {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExcluir && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900">Excluir departamento?</h3>
            <p className="text-xs text-slate-500">
              Tem certeza que deseja excluir <strong>{modalExcluir.nome}</strong>? Essa ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setModalExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
              <button
                onClick={excluir}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white transition-colors"
              >
                {excluindo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {modalSistema && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Editar Sistema</h3>
              <button onClick={() => setModalSistema(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs font-bold text-slate-700 -mt-2">{modalSistema.nome}</p>

            {modalSistema.paiKey && (
              <div className="flex items-center justify-between gap-2 -mt-2 px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500">
                  Está dentro de <strong className="text-slate-700">{todosSistemas.find(s => s.key === modalSistema.paiKey)?.nome || '—'}</strong>
                </span>
                <button type="button" onClick={() => setModalSistema(prev => ({ ...prev, paiKey: '' }))}
                  className="text-[11px] font-semibold text-red-600 hover:underline whitespace-nowrap">
                  Remover vínculo
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cor</label>
              <div className="flex flex-wrap gap-2">
                {PALETA.map(c => (
                  <button key={c} type="button" onClick={() => setModalSistema(prev => ({ ...prev, cor: c }))}
                    className="w-7 h-7 rounded-full border-2 transition-transform"
                    style={{ backgroundColor: c, borderColor: modalSistema.cor === c ? '#1e293b' : 'transparent', transform: modalSistema.cor === c ? 'scale(1.15)' : 'scale(1)' }}
                    title={c}
                  />
                ))}
                <button type="button" onClick={() => setModalSistema(prev => ({ ...prev, cor: '' }))}
                  className={`w-7 h-7 rounded-full border flex items-center justify-center text-slate-400 hover:text-red-600 transition-colors ${!modalSistema.cor ? 'border-slate-800' : 'border-slate-300'}`}
                  title="Sem cor (padrão cinza)"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ícone</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SISTEMA_ICONES).map(([key, Icon]) => (
                  <button key={key} type="button"
                    onClick={() => setModalSistema(prev => ({ ...prev, icone: key, emoji: '' }))}
                    className={`w-8 h-8 rounded-md border flex items-center justify-center transition-colors ${!modalSistema.emoji && modalSistema.icone === key ? 'border-indigo-500 bg-indigo-50 text-indigo-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ou emoji (substitui o ícone acima)</label>
              <input
                value={modalSistema.emoji}
                onChange={e => setModalSistema(prev => ({ ...prev, emoji: e.target.value }))}
                placeholder="Ex.: 💰"
                maxLength={4}
                className="text-sm p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-20"
              />
            </div>

            <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Criar sistema dentro deste</label>
              <div className="flex items-center gap-2">
                <input
                  value={novoFilhoNome}
                  onChange={e => setNovoFilhoNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); criarSistemaFilho() } }}
                  placeholder="Nome do novo sistema..."
                  className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button type="button" onClick={criarSistemaFilho} disabled={salvandoSistema || !novoFilhoNome.trim()}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 transition-colors">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <button onClick={removerSistema} disabled={salvandoSistema} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-60">
                Remover sistema
              </button>
              <div className="flex gap-2">
                <button onClick={() => setModalSistema(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button
                  onClick={salvarSistema}
                  disabled={salvandoSistema}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white transition-colors"
                >
                  {salvandoSistema && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Ecossistema() {
  const [aba, setAba] = useState('real')

  return (
    <div className="p-8 max-w-screen-xl flex flex-col gap-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-1">Ecossistema</h1>
        <p className="text-lg text-slate-500">Diagrama visual de como as peças do sistema se conectam</p>
      </div>

      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setAba('real')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${aba === 'real' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Ecossistema do Sistema
        </button>
        <button
          onClick={() => setAba('exemplo')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${aba === 'exemplo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Exemplo (modelo de referência)
        </button>
        <button
          onClick={() => setAba('minha')}
          className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${aba === 'minha' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Minha Concessionária
        </button>
      </div>

      {aba === 'real' && <DiagramaReal />}
      {aba === 'exemplo' && <DiagramaExemplo />}
      {aba === 'minha' && <MinhaConcessionaria />}
    </div>
  )
}
