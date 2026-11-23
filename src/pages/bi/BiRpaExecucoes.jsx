// BI — Controle de Execuções RPA (Robert Automation).
// Fonte: SharePoint › BD › "Banco de Dados - Log RPA" (CSV Historico_Geral_Execucoes_RPA + um .txt por execução),
// lido pelo backend (/api/rpa-log), cruzado com a agenda de Documentações › Agendamento de Processos
// (rotinas ativas dos processos RPA). Todos os horários em MS.
import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Bot, Users, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Timer, Activity, FileText, X, CalendarClock,
  ListChecks, LayoutDashboard, Bug, CalendarX2, BarChart2, ClipboardList,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import RpaAgendamentos from '../rpa/RpaAgendamentos'
import logoRobert from '../../assets/logo-robert.jpg'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['resumo', 'Resumo', LayoutDashboard],
  // Execuções e Agenda × Execução viraram uma aba só (21/11/2026)
  ['execucoes', 'Execuções', ListChecks],
  ['erros', 'Erros', Bug],
]
// Abas do Controle (antes um seletor de ícones Dashboard | Controle) — 21/11/2026: tudo numa fileira só de abas
const ABAS_CONTROLE = [
  ['processos', 'Processos', ClipboardList],
  ['horario', 'Agenda', Clock],
  ['atualizacao', 'Atualização', RefreshCw],
]
// Tolerâncias do cruzamento agenda × execução
const ANTECIPACAO_MIN = 10   // execução até 10 min antes do horário agendado ainda conta para ele
const JANELA_MIN = 180       // execução até 3 h depois do horário agendado conta para ele
const ESPERA_MIN = 60        // horário agendado sem log há mais de 1 h = "Não executado"

// ── Helpers ─────────────────────────────────────────────────────────────────
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const chaveSetor = (s) => normalizar(s).replace(/[^A-Z0-9]/g, '')
// Chave de ligação: sem "PROCESSO <nº> -/:" no começo e sem pontuação/espaços
const chaveLigacao = (s) => normalizar(s).replace(/^PROCESSO\s*\d*\s*[-:–.]?\s*/, '').replace(/[^A-Z0-9]/g, '')
// Exibição padronizada em MAIÚSCULAS (21/11/2026); a ligação log × cadastro usa normalizar(), não isto
const maiusc = (s) => (s == null || s === '' ? '—' : String(s).toUpperCase())
const pad = (n) => String(n).padStart(2, '0')
const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtDia = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
const fmtDataHora = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : '—')
const fmtHora = (iso) => (iso ? iso.slice(11, 16) : '—')
const minutosDe = (iso) => Math.round(new Date(iso).getTime() / 60000)
const fmtDuracao = (seg) => {
  if (seg == null) return '—'
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = Math.round(seg % 60)
  return h ? `${h}h ${pad(m)}m` : m ? `${m}m ${pad(s)}s` : `${s}s`
}
const diaSemana = (iso) => ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1 // 1=Seg ... 7=Dom
const NOME_DIA = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')

const COR_STATUS = {
  Sucesso: 'bg-emerald-100 text-emerald-700',
  Erro: 'bg-red-100 text-red-700',
  'Não executado': 'bg-orange-100 text-orange-700',
  Aguardando: 'bg-slate-100 text-slate-500',
  'Fora da agenda': 'bg-violet-100 text-violet-700',
}
// Nome exibido de cada status (23/11/2026: "Fora da agenda" aparece como "Manual"; o valor interno não muda)
const ROTULO_STATUS = { 'Fora da agenda': 'Manual' }
function Badge({ status }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${COR_STATUS[status] || 'bg-slate-100 text-slate-600'}`}>{ROTULO_STATUS[status] || status}</span>
}

function Card({ icon: Icon, titulo, valor, sub, cor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cor}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{titulo}</p>
        <p className="text-base font-bold text-slate-900 leading-tight">{valor}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

// Esteira (21/11/2026): faixa horizontal que corre sozinha e para com o mouse em cima. Com poucos itens fica parada.
function Esteira({ titulo, icone: Icone, cor, itens, vazio, render }) {
  // Parada (pedido do usuário 21/11/2026): rola para o lado com o mouse/trackpad quando não cabe
  const anda = false
  const lista = anda ? [...itens, ...itens] : itens // duplicada para emendar o fim no começo
  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden ${cor.borda}`}>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide border-b ${cor.cab}`}>
        <Icone className="h-3.5 w-3.5" /> {titulo} <span className="font-normal normal-case opacity-70">({itens.length})</span>
      </div>
      {itens.length === 0
        ? <p className="px-3 py-2 text-[11px] text-slate-400">{vazio}</p>
        : (
          <div className="overflow-x-auto py-2 group">
            <div className={`flex gap-2 w-max px-3 ${anda ? 'esteira-anda group-hover:[animation-play-state:paused]' : ''}`}
              style={anda ? { animationDuration: `${Math.max(20, itens.length * 6)}s` } : undefined}>
              {lista.map((it, i) => <React.Fragment key={i}>{render(it)}</React.Fragment>)}
            </div>
          </div>
        )}
    </div>
  )
}
const ESTILO_ESTEIRA = '@keyframes esteira-anda { from { transform: translateX(0) } to { transform: translateX(-50%) } } .esteira-anda { animation: esteira-anda linear infinite }'

// Cabeçalho que ordena ao clicar (seta mostra a coluna e o sentido)
function ThOrd({ children, col, ord, setOrd, className = '' }) {
  const ativo = ord.col === col
  return (
    <th className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none ${ativo ? 'text-indigo-700' : 'text-slate-500 hover:text-slate-700'} ${className}`}
      onClick={() => setOrd(o => ({ col, dir: o.col === col && o.dir === 'desc' ? 'asc' : 'desc' }))}
      title="Clique para ordenar">
      {children} <span className="text-[9px]">{ativo ? (ord.dir === 'desc' ? '▼' : '▲') : '↕'}</span>
    </th>
  )
}
const Th = ({ children, className = '' }) => <th className={`px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide ${className}`}>{children}</th>
const Td = ({ children, className = '', ...p }) => <td className={`px-3 py-2 text-[11px] text-slate-700 ${className}`} {...p}>{children}</td>

// ── Modal do log .txt ───────────────────────────────────────────────────────
function ModalLog({ execucao, onClose }) {
  const [texto, setTexto] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => {
    const q = new URLSearchParams({ pasta: execucao.pasta, arquivo: execucao.arquivo_log })
    fetch(`${BACKEND_URL}/api/rpa-log/arquivo?${q}`)
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); setTexto(j.texto) })
      .catch(e => setErro(e.message))
  }, [execucao])
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{maiusc(execucao.processo?.nome || execucao.robo)}</p>
            <p className="text-[11px] text-slate-500">{execucao.pasta} · {fmtDataHora(execucao.inicio)} · {fmtDuracao(execucao.duracao_seg)} · <Badge status={execucao.status} /></p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="p-4 overflow-auto">
          {erro ? <p className="text-[11px] text-red-600">Não foi possível abrir o log: {erro}</p>
            : texto == null ? <p className="text-[11px] text-slate-400">Carregando log...</p>
            : <pre className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words font-mono">{texto}</pre>}
          <p className="text-[10px] text-slate-400 mt-3">Arquivo: {execucao.pasta}/{execucao.arquivo_log}</p>
        </div>
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
// Duas visões, como no BI Garantias DAF (18/11/2026): Dashboard (permissão bi/rpa-execucoes) e Controle
// (permissão rpa/agendamentos = tela Agendamento de Processos, com todas as abas). Visão na URL (?modo=).
// Um monitor por sistema (21/11/2026): Robert Automation (RPA, com Dashboard do log), Power BI (PBI) e Microsoft
// Fabric (FAB) — os dois últimos só têm o Controle (o log de execuções do SharePoint é dos robôs).
export const SISTEMAS_PROCESSO = {
  RPA: { titulo: 'Monitor Robert Automation', controle: 'Controle — processos do Robert Automation (RPA)', cor: 'from-indigo-400 to-indigo-600' },
  PBI: { titulo: 'Monitor Power BI', controle: 'Controle — atualizações dos relatórios do Power BI', cor: 'from-amber-400 to-amber-600' },
  FAB: { titulo: 'Monitor Microsoft Fabric', controle: 'Controle — processos do Microsoft Fabric', cor: 'from-teal-400 to-teal-600' },
}
export default function BiRpaExecucoes({ sistema = null }) {
  const { hasPermission } = useAuth()
  const [params, setParams] = useSearchParams()
  const cfg = SISTEMAS_PROCESSO[sistema] || null
  const temDashboard = !sistema || sistema === 'RPA'
  const podeDashboard = temDashboard && hasPermission('bi/rpa-execucoes')
  const podeControle = hasPermission('rpa/agendamentos')
  // Aba na URL (?aba=): as do Dashboard e as do Controle na mesma fileira. ?modo=controle (link antigo) abre Processos.
  // Monitor Robert Automation sem a aba Atualização (pedido do usuário 21/11/2026) — ela trata da ordem robô → relatório
  const abasControle = sistema === 'RPA' ? ABAS_CONTROLE.filter(a => a[0] !== 'atualizacao') : ABAS_CONTROLE
  const abasDisponiveis = [...(podeDashboard ? ABAS.map(a => a[0]) : []), ...(podeControle ? abasControle.map(a => a[0]) : [])]
  const abaUrl = (params.get('aba') === 'agenda' ? 'execucoes' : params.get('aba')) || (params.get('modo') === 'controle' ? 'processos' : null)
  const aba = abasDisponiveis.includes(abaUrl) ? abaUrl : (abasDisponiveis[0] || 'resumo')
  const setAba = (k) => setParams({ aba: k }, { replace: true })
  const modo = ABAS_CONTROLE.some(a => a[0] === aba) ? 'controle' : 'dashboard'
  const [slotAcoes, setSlotAcoes] = useState(null)
  const hoje = isoDia(new Date())
  const seteDiasAtras = isoDia(new Date(Date.now() - 6 * 86400000))

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [ini, setIni] = useState(hoje) // De / até abre no dia de hoje (21/11/2026)
  // Período do gráfico e da tabela Situação por processos: 7 / 14 / 30 dias até hoje (abre em 7)
  const [gIni, setGIni] = useState(seteDiasAtras)
  const gFim = hoje
  const [fim, setFim] = useState(hoje)
  // Setor (chave sem acento/pontuação) + nome para exibir — um filtro só para TODAS as abas (21/11/2026)
  const [setor, setSetor] = useState(() => { try { return sessionStorage.getItem('rpa_monitor_setor') || '' } catch { return '' } })
  const [setorNome, setSetorNome] = useState(() => { try { return sessionStorage.getItem('rpa_monitor_setor_nome') || '' } catch { return '' } })
  const escolherSetor = (chave, nome) => {
    setSetor(chave || ''); setSetorNome(nome || '')
    try { sessionStorage.setItem('rpa_monitor_setor', chave || ''); sessionStorage.setItem('rpa_monitor_setor_nome', nome || '') } catch { /* */ }
  }
  const [robo, setRobo] = useState('')
  const [status, setStatus] = useState('')
  const [logAberto, setLogAberto] = useState(null)
  const [agora, setAgora] = useState(() => new Date())

  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try {
      const r = await fetch(`${BACKEND_URL}/api/rpa-log${refresh ? '/refresh' : ''}`, { method: refresh ? 'POST' : 'GET' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setDados(j); setAgora(new Date())
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
  // O log do SharePoint só é lido quando a visão Dashboard é aberta
  useEffect(() => { if (modo === 'dashboard' && !dados) carregar() }, [modo])
  // Link da Saúde do Sistema (21/11/2026): ?processo=&de=&ate= já filtram a tela (processo e período do erro)
  useEffect(() => {
    const proc = params.get('processo'), de = params.get('de'), ate = params.get('ate'), st = params.get('status')
    if (!proc && !de && !ate && !st) return
    if (proc && !dados) return // espera o log para ligar o nome ao cadastro
    if (de) setIni(de)
    if (ate) setFim(ate)
    if (proc) setRobo(chaveRobo(proc))
    if (st) setStatus(st)
    const q = new URLSearchParams(window.location.search)
    ;['processo', 'de', 'ate', 'status'].forEach(k => q.delete(k))
    setParams(Object.fromEntries(q), { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, params])

  const agenda = dados?.agenda || []
  const agendaPorNome = useMemo(() => new Map(agenda.map(a => [normalizar(a.nome), a])), [agenda])
  // Mesma chave sem o número do processo → só vale quando é única no cadastro (evita ligar ao processo errado)
  const agendaPorChave = useMemo(() => {
    const m = new Map()
    agenda.forEach(a => { const k = chaveLigacao(a.nome); m.set(k, m.has(k) ? null : a) })
    return m
  }, [agenda])
  const processoDoNome = (nome) => agendaPorNome.get(normalizar(nome)) || agendaPorChave.get(chaveLigacao(nome)) || null
  // Chave única do processo: a do cadastro quando ligado, senão o nome do log
  const chaveRobo = (nome) => { const p = processoDoNome(nome); return p ? normalizar(p.nome) : normalizar(nome) }

  // Execuções do período, com o processo do cadastro (quando o nome do robô bate com o Agendamento de Processos)
  const execucoesPeriodo = useMemo(() => (dados?.execucoes || [])
    .filter(e => e.inicio.slice(0, 10) >= ini && e.inicio.slice(0, 10) <= fim)
    .map(e => ({ ...e, processo: processoDoNome(e.robo) })), [dados, ini, fim, agendaPorNome, agendaPorChave])

  const setores = useMemo(() => {
    const m = new Map()
    ;(dados?.execucoes || []).forEach(e => m.set(chaveSetor(e.pasta), e.pasta))
    agenda.filter(a => a.horarios.length).forEach(a => { const k = chaveSetor(a.setor); if (!m.has(k)) m.set(k, a.setor) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [dados, agenda])

  // Cruzamento agenda × execução: um "slot" por horário agendado em cada dia do período (a partir do 1º dia
  // com log no CSV — antes disso o robô ainda não gravava histórico). Cada execução vai para o último horário
  // agendado do mesmo processo até ANTECIPACAO_MIN depois do seu início, se tiver começado em até JANELA_MIN.
  const { slots, foraAgenda } = useMemo(() => {
    const todas = dados?.execucoes || []
    if (!todas.length) return { slots: [], foraAgenda: [] }
    const primeiroDia = todas.reduce((m, e) => (e.inicio < m ? e.inicio : m), todas[0].inicio).slice(0, 10)
    const iniFaixa = ini < gIni ? ini : gIni // cobre o período do topo e o do gráfico
    const fimFaixa = fim > gFim ? fim : gFim
    const inicioCalc = iniFaixa > primeiroDia ? iniFaixa : primeiroDia
    const agoraMin = Math.round(agora.getTime() / 60000)
    const slots = []
    const usadas = new Set()
    for (let d = new Date(`${inicioCalc}T12:00:00`); isoDia(d) <= fimFaixa; d = new Date(d.getTime() + 86400000)) {
      const dia = isoDia(d)
      const ds = diaSemana(dia)
      for (const p of agenda) {
        if (!p.ativo) continue
        const horas = [...new Set(p.horarios.filter(h => h.dia_semana === ds).map(h => h.hora))].sort()
        if (!horas.length) continue
        const nomeN = normalizar(p.nome)
        const execsDia = todas.filter(e => e.inicio.slice(0, 10) === dia && chaveRobo(e.robo) === nomeN).sort((a, b) => a.inicio.localeCompare(b.inicio))
        const meus = horas.map(h => ({ dia, hora: h, processo: p, execs: [] }))
        for (const e of execsDia) {
          const em = minutosDe(e.inicio)
          const alvo = [...meus].reverse().find(s => minutosDe(`${dia}T${s.hora}:00`) <= em + ANTECIPACAO_MIN)
          if (alvo && em - minutosDe(`${dia}T${alvo.hora}:00`) <= JANELA_MIN) { alvo.execs.push(e); usadas.add(e) }
        }
        // Rodou depois (23/11/2026): horário sem sucesso + execução com sucesso mais tarde no mesmo dia, antes do próximo
        // horário do processo (ex.: o robô falhou às 00:10 e alguém rodou à mão às 08:52) → o horário conta como cumprido
        meus.forEach((sl, idx) => {
          if (sl.execs.some(e => e.status === 'Sucesso')) return
          const iniMin = minutosDe(`${dia}T${sl.hora}:00`) - ANTECIPACAO_MIN
          const prox = meus[idx + 1] ? minutosDe(`${dia}T${meus[idx + 1].hora}:00`) - ANTECIPACAO_MIN : Infinity
          const depois = execsDia.filter(e => !usadas.has(e) && minutosDe(e.inicio) >= iniMin && minutosDe(e.inicio) < prox)
          const suc = depois.find(e => e.status === 'Sucesso')
          if (!suc) return
          depois.filter(e => e.inicio <= suc.inicio).forEach(e => { sl.execs.push(e); usadas.add(e) })
          sl.execs.sort((a, b) => a.inicio.localeCompare(b.inicio))
          sl.rodouDepois = true
        })
        for (const s of meus) {
          const slotMin = minutosDe(`${dia}T${s.hora}:00`)
          const ok = s.execs.find(e => e.status === 'Sucesso')
          const ultima = s.execs[s.execs.length - 1]
          s.status = ok ? 'Sucesso' : ultima ? 'Erro' : agoraMin > slotMin + ESPERA_MIN ? 'Não executado' : 'Aguardando'
          s.execucao = ok || ultima || null
          s.atrasoMin = s.execs[0] ? minutosDe(s.execs[0].inicio) - slotMin : null
          slots.push(s)
        }
      }
    }
    const foraAgenda = execucoesPeriodo.filter(e => !usadas.has(todas.find(t => t.inicio === e.inicio && t.robo === e.robo)))
    slots.sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora))
    return { slots, foraAgenda }
  }, [dados, agenda, ini, fim, gIni, gFim, agora, execucoesPeriodo])

  // Filtros (setor / robô / status) aplicados a execuções, slots e erros
  const passaSetor = (pasta, setorCad) => !setor || chaveSetor(pasta || setorCad) === setor
  const passaRobo = (nome) => !robo || chaveRobo(nome) === robo
  const execs = execucoesPeriodo.filter(e => passaSetor(e.pasta, e.processo?.setor) && passaRobo(e.robo) && (!status || e.status === status || (status === 'Fora da agenda' && foraAgenda.includes(e))))
  const slotsF = slots.filter(s => s.dia >= ini && s.dia <= fim && passaSetor(s.execucao?.pasta, s.processo.setor) && passaRobo(s.processo.nome) && (!status || s.status === status))
  const foraF = foraAgenda.filter(e => passaSetor(e.pasta) && passaRobo(e.robo))
  // Gráfico + Situação por processos: mesmos filtros, período dos botões do gráfico
  const execsG = useMemo(() => (dados?.execucoes || [])
    .filter(e => e.inicio.slice(0, 10) >= gIni && e.inicio.slice(0, 10) <= gFim)
    .map(e => ({ ...e, processo: processoDoNome(e.robo) }))
    .filter(e => passaSetor(e.pasta, e.processo?.setor) && passaRobo(e.robo) && (!status || e.status === status))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [dados, gIni, gFim, setor, robo, status, agendaPorNome, agendaPorChave])
  const slotsG = slots.filter(sl => sl.dia >= gIni && sl.dia <= gFim && passaSetor(sl.execucao?.pasta, sl.processo.setor) && passaRobo(sl.processo.nome) && (!status || sl.status === status))

  const robos = useMemo(() => {
    const m = new Map()
    ;(dados?.execucoes || []).forEach(e => { const k = chaveRobo(e.robo); if (!m.has(k)) m.set(k, processoDoNome(e.robo)?.nome || e.robo) })
    agenda.filter(a => a.horarios.length).forEach(a => { const k = normalizar(a.nome); if (!m.has(k)) m.set(k, a.nome) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [dados, agenda])

  // Robôs do log que não existem no cadastro do Agendamento de Processos (nome diferente ou processo não cadastrado)
  const semCadastro = useMemo(() => [...new Set((dados?.execucoes || []).filter(e => !processoDoNome(e.robo)).map(e => e.robo))], [dados, agendaPorNome, agendaPorChave])

  // ── Indicadores ──
  const total = execs.length
  const nSucesso = execs.filter(e => e.status === 'Sucesso').length
  const nErro = execs.filter(e => e.status === 'Erro').length
  const nNaoExec = slotsF.filter(s => s.status === 'Não executado').length
  const nAgendados = slotsF.filter(s => s.status !== 'Aguardando').length
  const nCumpridos = slotsF.filter(s => s.status === 'Sucesso').length
  const tempoTotal = execs.reduce((s, e) => s + (e.duracao_seg || 0), 0)

  const porDia = useMemo(() => {
    const m = new Map()
    for (let d = new Date(`${gIni}T12:00:00`); isoDia(d) <= gFim; d = new Date(d.getTime() + 86400000)) m.set(isoDia(d), { dia: fmtDia(isoDia(d)), Sucesso: 0, Erro: 0, 'Não executado': 0 })
    execsG.forEach(e => { const r = m.get(e.inicio.slice(0, 10)); if (r) r[e.status === 'Sucesso' ? 'Sucesso' : 'Erro']++ })
    slotsG.forEach(s => { if (s.status === 'Não executado') { const r = m.get(s.dia); if (r) r['Não executado']++ } })
    return [...m.values()]
  }, [execsG, slotsG, gIni, gFim])

  const porRobo = useMemo(() => {
    const m = new Map()
    const linha = (nome, setorNome, processo) => {
      const k = chaveRobo(nome)
      if (!m.has(k)) m.set(k, { nome, setor: setorNome, processo, execs: [], naoExec: 0, slots: 0 })
      return m.get(k)
    }
    execsG.forEach(e => linha(e.processo?.nome || e.robo, e.processo?.setor || e.pasta, e.processo).execs.push(e))
    slotsG.forEach(s => { if (s.status === 'Aguardando') return; const l = linha(s.processo.nome, s.processo.setor, s.processo); l.slots++; if (s.status === 'Não executado') l.naoExec++ })
    return [...m.values()].map(l => {
      const ord = [...l.execs].sort((a, b) => b.inicio.localeCompare(a.inicio))
      const suc = l.execs.filter(e => e.status === 'Sucesso').length
      return { ...l, ultima: ord[0] || null, suc, err: l.execs.length - suc, media: l.execs.length ? l.execs.reduce((s, e) => s + e.duracao_seg, 0) / l.execs.length : null }
    }).sort((a, b) => (b.ultima?.status === 'Erro') - (a.ultima?.status === 'Erro') || b.naoExec - a.naoExec || b.err - a.err || a.nome.localeCompare(b.nome))
  }, [execsG, slotsG])

  // Aba Execuções × Agenda: um horário agendado por linha (com a execução que contou para ele) + as execuções que
  // rodaram fora da agenda. Mais recente primeiro.
  const [soAgendadas, setSoAgendadas] = useState(false) // opção "Só agendadas" da aba Execuções
  const linhasExecAgenda = useMemo(() => {
    const doSlot = slotsF.map(s => ({
      chave: 'a|' + s.dia + s.hora + s.processo.id, quando: `${s.dia}T${s.hora}`, dia: s.dia, agendado: s.hora,
      nome: s.processo.nome, setor: s.processo.setor, situacao: s.status, exec: s.execucao || s.execs?.[0] || null,
      atrasoMin: s.atrasoMin, tentativas: s.execs?.length || 0, processo: s.processo, rodouDepois: !!s.rodouDepois,
    }))
    const fora = foraF.filter(e => !status || status === 'Fora da agenda' || e.status === status).map(e => ({
      chave: 'f|' + e.inicio + e.robo, quando: e.inicio, dia: e.inicio.slice(0, 10), agendado: null,
      nome: e.processo?.nome || e.robo, setor: e.processo?.setor || e.pasta, situacao: 'Fora da agenda', exec: e,
      atrasoMin: null, tentativas: null, processo: e.processo, semCadastro: !e.processo,
    }))
    return [...doSlot, ...(soAgendadas ? [] : fora)].sort((a, b) => b.quando.localeCompare(a.quando))
  }, [slotsF, foraF, status, soAgendadas])

  // Tempo total humano: para cada execução com SUCESSO de processo ligado ao cadastro, soma o Tempo Humano (min)
  // informado no cadastro. Conta quantos processos executados ainda não têm esse tempo preenchido.
  const tempoHumano = useMemo(() => {
    let seg = 0
    const semTempo = new Set()
    execs.filter(e => e.status === 'Sucesso').forEach(e => {
      const t = e.processo?.tempo_humano_min
      if (t > 0) seg += t * 60
      else semTempo.add(e.processo?.nome || e.robo)
    })
    return { seg, semTempo: semTempo.size }
  }, [execs])

  // Esteira 2: erros de HOJE (mais recente primeiro), respeitando setor/processo
  const errosHoje = useMemo(() => {
    const hojeIso = isoDia(agora)
    return (dados?.execucoes || [])
      .filter(e => e.status === 'Erro' && e.inicio.slice(0, 10) === hojeIso)
      // erro já resolvido: o mesmo processo rodou com sucesso depois, hoje (23/11/2026)
      .filter(e => !(dados?.execucoes || []).some(x => x.status === 'Sucesso' && x.inicio.slice(0, 10) === hojeIso && x.inicio > e.inicio && chaveRobo(x.robo) === chaveRobo(e.robo)))
      .map(e => ({ ...e, processo: processoDoNome(e.robo) }))
      .filter(e => passaSetor(e.pasta, e.processo?.setor) && passaRobo(e.robo))
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, agora, setor, robo, agendaPorChave])

  // Esteira "Erros e não executados de hoje": horários de hoje que ficaram "Não executado" (setor/processo do filtro)
  const naoExecHoje = useMemo(() => {
    const hojeIso = isoDia(agora)
    return slots.filter(sl => sl.dia === hojeIso && sl.status === 'Não executado' && passaSetor(null, sl.processo.setor) && passaRobo(sl.processo.nome))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, agora, setor, robo])
  const ocorrenciasHoje = useMemo(() => [
    ...errosHoje.map(e => ({ tipo: 'erro', quando: e.inicio.slice(11, 16), e })),
    ...naoExecHoje.map(sl => ({ tipo: 'nao', quando: sl.hora, sl })),
  ].sort((a, b) => b.quando.localeCompare(a.quando)), [errosHoje, naoExecHoje])

  const [ordErros, setOrdErros] = useState({ col: 'ultima', dir: 'desc' })
  const [ordResumo, setOrdResumo] = useState({ col: 'ultima', dir: 'desc' })
  const porRoboOrdenado = useMemo(() => {
    const val = {
      nome: l => maiusc(l.nome), setor: l => maiusc(l.setor), ultima: l => l.ultima?.inicio || '',
      execs: l => l.execs.length, suc: l => l.suc, err: l => l.err, naoExec: l => l.naoExec, media: l => l.media ?? -1,
    }[ordResumo.col] || (l => l.ultima?.inicio || '')
    const dir = ordResumo.dir === 'asc' ? 1 : -1
    return [...porRobo].sort((a, b) => {
      const x = val(a), y = val(b)
      // sem última execução vai sempre para o fim quando ordena por ela
      if (ordResumo.col === 'ultima' && (!x || !y)) return !x && !y ? 0 : !x ? 1 : -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * dir
    })
  }, [porRobo, ordResumo])

  const erros = useMemo(() => {
    const m = new Map()
    execs.filter(e => e.status === 'Erro').forEach(e => {
      const k = `${chaveRobo(e.robo)}|${e.acao_erro || e.erro || ''}`
      if (!m.has(k)) m.set(k, { robo: e.processo?.nome || e.robo, pasta: e.processo?.setor || e.pasta, acao: e.acao_erro, processo: e.processo, ocorrencias: [] })
      m.get(k).ocorrencias.push(e)
    })
    return [...m.values()].map(g => ({ ...g, ultima: g.ocorrencias.reduce((a, b) => (b.inicio > a.inicio ? b : a)) }))
      .sort((a, b) => b.ultima.inicio.localeCompare(a.ultima.inicio))
  }, [execs])

  const errosOrdenados = useMemo(() => {
    const val = {
      ultima: g => g.ultima.inicio, nome: g => maiusc(g.robo), setor: g => maiusc(g.pasta), acao: g => g.acao || '',
      ocorr: g => g.ocorrencias.length, msg: g => g.ultima.erro || '',
    }[ordErros.col] || (g => g.ultima.inicio)
    const dir = ordErros.dir === 'asc' ? 1 : -1
    return [...erros].sort((a, b) => {
      const x = val(a), y = val(b)
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * dir
    })
  }, [erros, ordErros])


  const sel ='border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white text-slate-700'

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      {/* Sem quebra de linha: o subtítulo quebra embaixo do título e o bloco Atualizar fica sempre à direita (21/11/2026) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Logo do Robert Automation (enviado pelo usuário 21/11/2026) no monitor RPA; ícone nos demais */}
          {(!sistema || sistema === 'RPA')
            ? <img src={logoRobert} alt="Robert Automation" className="w-10 h-10 rounded-xl object-cover shrink-0" />
            : (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg?.cor || 'from-indigo-400 to-indigo-600'} flex items-center justify-center shrink-0`}>
                <Bot className="h-4 w-4 text-white" />
              </div>
            )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">{cfg?.titulo || 'Controle de Processos'}</h1>
            <p className="text-[10px] text-slate-500">
              {modo === 'dashboard' ? 'Robôs de extração (RPA) — é o robô que entra nos sistemas (Dealer.net, SAP, CRM...), extrai os relatórios nos horários agendados e salva no SharePoint, de onde o portal e os BIs leem os dados' : (cfg?.controle || 'Controle — Agendamento de Processos (RPA e Power BI)')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {modo === 'dashboard' && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 leading-tight text-right whitespace-nowrap">
                Atualizado em: <strong className="text-slate-700">{carregando ? '...' : dados?.lido_em ? new Date(dados.lido_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong>
              </p>
              <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Atualizar dados" aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          {/* Engrenagem do Controle (Novo Processo, Nova Rotina, Baixar PDF), colocada aqui pelo RpaAgendamentos */}
          {modo === 'controle' && <div ref={setSlotAcoes} className="flex items-center" />}
        </div>
      </div>

      {/* Fileira única de abas (21/11/2026): Dashboard (Resumo, Execuções, Agenda × Execução, Erros) + Controle
          (Processos, Agenda, Atualização). Cada grupo só aparece com a permissão dele. */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {[...(podeDashboard ? ABAS : []), ...(podeControle ? abasControle : [])].map(([k, n, Icon], i, lista) => (
          <button key={k} onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px ${aba === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="h-3.5 w-3.5" /> {n}
          </button>
        ))}
      </div>

      {/* Só a visão da aba escolhida é montada */}
      {modo === 'controle' ? <RpaAgendamentos slotAcoes={slotAcoes} sistema={sistema} abaExterna={aba}
        setorExterno={{ chave: setor, nome: setorNome }} onSetorExterno={v => escolherSetor(v?.chave, v?.nome)} /> : (<>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
        <label className="text-[11px] text-slate-500">De</label>
        <input type="date" value={ini} max={fim} onChange={e => e.target.value && setIni(e.target.value)} className={sel} />
        <label className="text-[11px] text-slate-500">até</label>
        <input type="date" value={fim} min={ini} onChange={e => e.target.value && setFim(e.target.value)} className={sel} />
        <select value={setor} onChange={e => escolherSetor(e.target.value, setores.find(([k]) => k === e.target.value)?.[1])} className={sel}>
          <option value="">Todos os setores</option>
          {setores.map(([k, n]) => <option key={k} value={k}>{maiusc(n)}</option>)}
          {setor && !setores.some(([k]) => k === setor) && <option value={setor}>{setorNome || setor}</option>}
        </select>
        <select value={robo} onChange={e => setRobo(e.target.value)} className={`${sel} max-w-xs`}>
          <option value="">Todos os processos</option>
          {robos.map(([k, n]) => <option key={k} value={k}>{maiusc(n)}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
          <option value="">Todos os status</option>
          {['Sucesso', 'Erro', 'Não executado', 'Aguardando', 'Fora da agenda'].map(s => <option key={s} value={s}>{ROTULO_STATUS[s] || s}</option>)}
        </select>
        {(setor || robo || status) && (
          <button onClick={() => { escolherSetor('', ''); setRobo(''); setStatus('') }} className="text-[11px] text-slate-500 hover:text-slate-700 underline">Limpar filtros</button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Não foi possível ler o log do SharePoint: {erro}
        </div>
      )}

      {semCadastro.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Processos do log sem cadastro no Agendamento de Processos ({semCadastro.length})</p>
          <p className="mt-1">O nome do robô no log precisa ser igual ao nome do processo (maiúsculas e acentos não importam) para entrar na comparação com a agenda:</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {semCadastro.map(n => <span key={n} className="px-2 py-0.5 rounded-full bg-white border border-amber-200">{maiusc(n)}</span>)}
          </div>
        </div>
      )}

      {carregando && !dados ? <p className="text-[11px] text-slate-400">Carregando log do SharePoint...</p> : (
        <>
          {aba === 'resumo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                <Card icon={Activity} titulo="Execuções" valor={total} cor="bg-indigo-50 text-indigo-600" />
                <Card icon={CheckCircle2} titulo="Sucessos" valor={nSucesso} sub={pct(nSucesso, total)} cor="bg-emerald-50 text-emerald-600" />
                <Card icon={XCircle} titulo="Erros" valor={nErro} sub={pct(nErro, total)} cor="bg-red-50 text-red-600" />
                <Card icon={CalendarX2} titulo="Não executados" valor={nNaoExec} sub="agendados sem log" cor="bg-orange-50 text-orange-600" />
                <Card icon={CalendarClock} titulo="Agenda cumprida" valor={pct(nCumpridos, nAgendados)} sub={`${nCumpridos} de ${nAgendados} horários`} cor="bg-sky-50 text-sky-600" />
                <Card icon={Timer} titulo="Duração média" valor={fmtDuracao(total ? tempoTotal / total : null)} cor="bg-slate-100 text-slate-600" />
                <Card icon={Clock} titulo="Tempo total de robô" valor={fmtDuracao(tempoTotal)} cor="bg-slate-100 text-slate-600" />
                {/* Tempo total humano (21/11/2026): execuções com sucesso × Tempo Humano do cadastro do processo */}
                <Card icon={Users} titulo="Tempo total humano" valor={tempoHumano.seg ? fmtDuracao(tempoHumano.seg) : '—'}
                  sub={tempoHumano.semTempo ? `${tempoHumano.semTempo} processo(s) sem tempo humano no cadastro` : 'se fosse feito à mão'} cor="bg-amber-50 text-amber-600" />
              </div>

              {/* Esteiras (21/11/2026): próximas execuções e erros do dia */}
              <style>{ESTILO_ESTEIRA}</style>
              {/* Esteira "Próximas execuções" removida a pedido do usuário (21/11/2026) — ver opção Só agendadas em Execuções */}
              <Esteira titulo="Erros e não executados de hoje" icone={XCircle} itens={ocorrenciasHoje}
                cor={{ borda: 'border-red-200', cab: 'bg-red-50 text-red-700 border-red-100' }}
                vazio="Nenhum erro e nenhum horário sem execução hoje."
                render={o => o.tipo === 'erro' ? (
                  <button type="button" onClick={() => o.e.arquivo_log && setLogAberto(o.e)} title={o.e.erro || ''}
                    className="shrink-0 flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border border-red-100 bg-red-50/40 text-[11px] whitespace-nowrap hover:bg-red-50 text-left">
                    <span className="font-bold text-red-700 tabular-nums">Hoje {o.quando} · Erro</span>
                    <span className="font-semibold text-slate-800">{maiusc(o.e.processo?.nome || o.e.robo)}</span>
                    <span className="text-[10px] text-red-600 max-w-[320px] truncate">{o.e.acao_erro || o.e.erro || 'Erro'}</span>
                  </button>
                ) : (
                  <div className="shrink-0 flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border border-orange-100 bg-orange-50/50 text-[11px] whitespace-nowrap">
                    <span className="font-bold text-orange-700 tabular-nums">Hoje {o.quando} · Não executado</span>
                    <span className="font-semibold text-slate-800">{maiusc(o.sl.processo.nome)}</span>
                    <span className="text-[10px] text-orange-600">sem execução no log do robô</span>
                  </div>
                )} />

              {/* Aviso "Relatórios que podem estar desatualizados" removido a pedido do usuário (21/11/2026) */}

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                {/* Período rápido no gráfico (21/11/2026): sempre termina HOJE; a tela abre em 7 dias */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Execuções por dia</p>
                <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
                  {[[7, '7 dias'], [14, '14 dias'], [30, '1 mês']].map(([n, rot]) => {
                    const iniBtn = isoDia(new Date(Date.now() - (n - 1) * 86400000))
                    const ativo = gIni === iniBtn
                    return (
                      <button key={n} type="button" onClick={() => setGIni(iniBtn)}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${ativo ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {rot}
                      </button>
                    )
                  })}
                </div>
                </div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porDia} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Sucesso" stackId="a" fill="#10b981" />
                      <Bar dataKey="Erro" stackId="a" fill="#ef4444" />
                      <Bar dataKey="Não executado" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide px-3 pt-3">Situação por processos</p>
                <table className="w-full mt-2">
                  <thead className="bg-slate-50 border-y border-slate-200"><tr>
                    <ThOrd col="nome" ord={ordResumo} setOrd={setOrdResumo}>Processos</ThOrd>
                    <ThOrd col="setor" ord={ordResumo} setOrd={setOrdResumo}>Setor</ThOrd>
                    <ThOrd col="ultima" ord={ordResumo} setOrd={setOrdResumo}>Última execução</ThOrd>
                    <ThOrd col="execs" ord={ordResumo} setOrd={setOrdResumo} className="text-right">Execuções</ThOrd>
                    <ThOrd col="suc" ord={ordResumo} setOrd={setOrdResumo} className="text-right">Sucesso</ThOrd>
                    <ThOrd col="err" ord={ordResumo} setOrd={setOrdResumo} className="text-right">Erro</ThOrd>
                    <ThOrd col="naoExec" ord={ordResumo} setOrd={setOrdResumo} className="text-right">Não executados</ThOrd>
                    <ThOrd col="media" ord={ordResumo} setOrd={setOrdResumo} className="text-right">Duração média</ThOrd>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {porRoboOrdenado.map(l => (
                      <tr key={l.nome} className="hover:bg-slate-50">
                        <Td className="font-semibold text-slate-800 whitespace-nowrap">
                          {/* Clique: abre a aba Execuções filtrada neste processo (21/11/2026) */}
                          <button type="button" onClick={() => { setRobo(chaveRobo(l.nome)); setAba('execucoes') }} title="Ver as execuções deste processo"
                            className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline text-left">{maiusc(l.nome)}</button>
                          {!l.processo && <span className="ml-1 text-[10px] text-amber-600" title="Sem cadastro no Agendamento de Processos">(sem cadastro)</span>}
                        </Td>
                        <Td>{maiusc(l.setor)}</Td>
                        <Td className="whitespace-nowrap">{l.ultima ? <span className="flex items-center gap-1.5 whitespace-nowrap"><Badge status={l.ultima.status} /> {fmtDataHora(l.ultima.inicio)}</span> : '—'}</Td>
                        <Td className="text-right">{l.execs.length}</Td>
                        <Td className="text-right text-emerald-700">{l.suc}</Td>
                        <Td className="text-right text-red-600">{l.err || ''}</Td>
                        <Td className="text-right text-orange-600">{l.naoExec || ''}</Td>
                        <Td className="text-right">{fmtDuracao(l.media)}</Td>
                      </tr>
                    ))}
                    {!porRobo.length && <tr><Td colSpan={8} className="text-center text-slate-400">Nenhuma execução no período.</Td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba === 'execucoes' && (
            <div className="space-y-2">
              {/* Opção "Só agendadas" (21/11/2026) */}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={soAgendadas} onChange={e => setSoAgendadas(e.target.checked)} className="w-3.5 h-3.5" />
                Só agendadas
                <span className="font-normal text-slate-400">— horários da agenda no período ({slotsF.length}), inclusive os que ainda vão acontecer</span>
              </label>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr>
                    <Th>Dia</Th><Th>Agendado</Th><Th>Processos</Th><Th>Setor</Th><Th>Situação</Th>
                    <Th>Início real</Th><Th>Fim</Th><Th className="text-right">Duração</Th><Th className="text-right">Atraso</Th>
                    <Th className="text-right">Tentativas</Th><Th>Erro</Th><Th></Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasExecAgenda.map(l => (
                      <tr key={l.chave} className="hover:bg-slate-50">
                        <Td className="whitespace-nowrap">{fmtDia(l.dia)} {NOME_DIA[diaSemana(l.dia)]}</Td>
                        <Td className="whitespace-nowrap">{l.agendado || <span className="text-slate-300">—</span>}</Td>
                        <Td className="font-semibold text-slate-800 whitespace-nowrap">{maiusc(l.nome)}{l.semCadastro && <span className="ml-1 text-[10px] font-normal text-amber-600">(sem cadastro)</span>}</Td>
                        <Td className="whitespace-nowrap">{maiusc(l.setor)}</Td>
                        <Td><span className="flex gap-1 whitespace-nowrap"><Badge status={l.situacao} />{l.situacao === 'Fora da agenda' && l.exec && <Badge status={l.exec.status} />}{l.rodouDepois && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 text-violet-700" title="O horário agendado falhou ou não rodou, e o processo foi executado com sucesso mais tarde no mesmo dia (manual)">Manual</span>}</span></Td>
                        <Td className="whitespace-nowrap">{l.exec ? fmtHora(l.exec.inicio) : '—'}</Td>
                        <Td className="whitespace-nowrap">{l.exec ? fmtHora(l.exec.fim) : ''}</Td>
                        <Td className="text-right whitespace-nowrap">{l.exec ? fmtDuracao(l.exec.duracao_seg) : ''}</Td>
                        <Td className={`text-right whitespace-nowrap ${l.atrasoMin > 15 ? 'text-orange-600 font-semibold' : ''}`}>{l.atrasoMin == null ? '' : `${l.atrasoMin} min`}</Td>
                        <Td className="text-right">{l.tentativas || ''}</Td>
                        <Td className="min-w-[260px] max-w-md whitespace-normal break-words text-red-600" title={l.exec?.erro || ''}>{l.exec?.status === 'Erro' ? l.exec.erro : ''}</Td>
                        <Td>{l.exec?.arquivo_log && (
                          <button onClick={() => setLogAberto({ ...l.exec, processo: l.processo })} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>
                        )}</Td>
                      </tr>
                    ))}
                    {!linhasExecAgenda.length && <tr><Td colSpan={12} className="text-center text-slate-400">Nada no período com os filtros escolhidos.</Td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba === 'erros' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr>
                  <ThOrd col="ultima" ord={ordErros} setOrd={setOrdErros}>Última</ThOrd>
                  <ThOrd col="nome" ord={ordErros} setOrd={setOrdErros}>Processos</ThOrd>
                  <ThOrd col="setor" ord={ordErros} setOrd={setOrdErros}>Setor</ThOrd>
                  <ThOrd col="acao" ord={ordErros} setOrd={setOrdErros}>Ação que falhou</ThOrd>
                  <ThOrd col="ocorr" ord={ordErros} setOrd={setOrdErros} className="text-right">Ocorrências</ThOrd>
                  <ThOrd col="msg" ord={ordErros} setOrd={setOrdErros}>Mensagem</ThOrd>
                  <Th></Th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {errosOrdenados.map(g => (
                    <tr key={g.robo + g.acao} className="hover:bg-slate-50 align-top">
                      <Td className="whitespace-nowrap">{fmtDataHora(g.ultima.inicio)}</Td>
                      <Td className="font-semibold text-slate-800 whitespace-nowrap">{maiusc(g.robo)}</Td>
                      <Td>{maiusc(g.pasta)}</Td>
                      <Td><code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">{g.acao || '—'}</code></Td>
                      <Td className="text-right font-semibold text-red-600">{g.ocorrencias.length}</Td>
                      <Td className="max-w-md"><p className="line-clamp-3 break-words" title={g.ultima.erro}>{g.ultima.erro}</p></Td>
                      <Td>{g.ultima.arquivo_log && <button onClick={() => setLogAberto(g.ultima)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>}</Td>
                    </tr>
                  ))}
                  {!erros.length && <tr><Td colSpan={7} className="text-center text-slate-400">Nenhum erro no período.</Td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {logAberto && <ModalLog execucao={logAberto} onClose={() => setLogAberto(null)} />}
      </>)}
    </div>
  )
}
