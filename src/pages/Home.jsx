import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, AlertTriangle, ChevronRight, KeyRound,
  Settings, Wallet, Target, ClipboardList, FolderKanban, Calculator, BookOpen,
  Folder, FileText, X, PieChart, Settings2, GripVertical, Check, RotateCcw, GraduationCap,
} from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../services/supabaseClient'
import { MENU_TREE, getLeafKeys } from '../config/menuTree'

const DIAS_LIMITE_SENHA = 30

const GRUPO_ICONES = {
  '_config': Settings,
  '_comissoes-calculo': Wallet,
  '_metas': Target,
  '_controle-processos': ClipboardList,
  '_gestao-projetos': FolderKanban,
  '_calculadoras': Calculator,
  '_documentacoes': BookOpen,
  '_bi': PieChart,
  '_treinamentos': GraduationCap,
}

const COR_PADRAO = {
  grad: 'from-slate-400 to-slate-600', ring: 'border-slate-400 ring-slate-200',
  accent: 'border-l-slate-400', headerBg: 'bg-slate-50', headerBorder: 'border-slate-100',
  pill: 'bg-slate-200 text-slate-700', chevron: 'text-slate-300',
}

const GRUPO_CORES = {
  '_config':             { grad: 'from-blue-400 to-blue-600',       ring: 'border-blue-400 ring-blue-200',       accent: 'border-l-blue-400',    headerBg: 'bg-blue-50',    headerBorder: 'border-blue-100',    pill: 'bg-blue-100 text-blue-700',       chevron: 'text-blue-300' },
  '_comissoes-calculo':   { grad: 'from-emerald-400 to-emerald-600', ring: 'border-emerald-400 ring-emerald-200', accent: 'border-l-emerald-400', headerBg: 'bg-emerald-50', headerBorder: 'border-emerald-100', pill: 'bg-emerald-100 text-emerald-700', chevron: 'text-emerald-300' },
  '_metas':               { grad: 'from-amber-400 to-amber-600',    ring: 'border-amber-400 ring-amber-200',    accent: 'border-l-amber-400',   headerBg: 'bg-amber-50',   headerBorder: 'border-amber-100',   pill: 'bg-amber-100 text-amber-700',    chevron: 'text-amber-300' },
  '_controle-processos':  { grad: 'from-purple-400 to-purple-600',  ring: 'border-purple-400 ring-purple-200',  accent: 'border-l-purple-400',  headerBg: 'bg-purple-50',  headerBorder: 'border-purple-100',  pill: 'bg-purple-100 text-purple-700',  chevron: 'text-purple-300' },
  '_gestao-projetos':     { grad: 'from-indigo-400 to-indigo-600',  ring: 'border-indigo-400 ring-indigo-200',  accent: 'border-l-indigo-400',  headerBg: 'bg-indigo-50',  headerBorder: 'border-indigo-100',  pill: 'bg-indigo-100 text-indigo-700',  chevron: 'text-indigo-300' },
  '_calculadoras':        { grad: 'from-pink-400 to-pink-600',      ring: 'border-pink-400 ring-pink-200',      accent: 'border-l-pink-400',    headerBg: 'bg-pink-50',    headerBorder: 'border-pink-100',    pill: 'bg-pink-100 text-pink-700',      chevron: 'text-pink-300' },
  '_documentacoes':       { grad: 'from-orange-400 to-orange-600',  ring: 'border-orange-400 ring-orange-200',  accent: 'border-l-orange-400',  headerBg: 'bg-orange-50',  headerBorder: 'border-orange-100',  pill: 'bg-orange-100 text-orange-700',  chevron: 'text-orange-300' },
  '_bi':                  { grad: 'from-teal-400 to-teal-600',      ring: 'border-teal-400 ring-teal-200',      accent: 'border-l-teal-400',    headerBg: 'bg-teal-50',    headerBorder: 'border-teal-100',    pill: 'bg-teal-100 text-teal-700',      chevron: 'text-teal-300' },
  '_treinamentos':        { grad: 'from-violet-400 to-violet-600',  ring: 'border-violet-400 ring-violet-200',  accent: 'border-l-violet-400',  headerBg: 'bg-violet-50',  headerBorder: 'border-violet-100',  pill: 'bg-violet-100 text-violet-700',  chevron: 'text-violet-300' },
}

function nodeVisivel(n, hasPermission) {
  return n.children ? getLeafKeys(n).some(k => hasPermission(k)) : hasPermission(n.key)
}

// Ordena os grupos: sem ordem salva, A-Z; com ordem salva, respeita a posição escolhida pelo usuário
function ordenarNodes(nodes, ordem) {
  if (!ordem) return [...nodes].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  const indice = new Map(ordem.map((k, i) => [k, i]))
  return [...nodes].sort((a, b) => {
    const ia = indice.has(a.key) ? indice.get(a.key) : Infinity
    const ib = indice.has(b.key) ? indice.get(b.key) : Infinity
    return ia !== ib ? ia - ib : a.label.localeCompare(b.label, 'pt-BR')
  })
}

// ── Bloco grande (grade) representando um grupo de menu ──────────────────────
function GrupoBloco({ node, ativo, quantidade, onClick, editando, arrastando, onDragStart, onDragOver, onDrop, onDragEnd }) {
  const Icone = GRUPO_ICONES[node.key] || Folder
  const cor = GRUPO_CORES[node.key] || COR_PADRAO

  return (
    <div
      draggable={editando}
      onDragStart={editando ? (e) => onDragStart(e, node.key) : undefined}
      onDragOver={editando ? (e) => onDragOver(e, node.key) : undefined}
      onDrop={editando ? (e) => onDrop(e, node.key) : undefined}
      onDragEnd={editando ? onDragEnd : undefined}
      className="relative"
    >
      <button
        onClick={editando ? undefined : onClick}
        className={`w-full flex flex-col rounded-2xl overflow-hidden border shadow-sm transition-all ${
          editando ? 'border-dashed border-slate-300 cursor-grab active:cursor-grabbing' : 'hover:shadow-md'
        } ${
          !editando && ativo ? `${cor.ring} ring-2` : ''
        } ${
          !editando && !ativo ? 'border-slate-200' : ''
        } ${arrastando === node.key ? 'opacity-40' : ''}`}
      >
        <div className="flex-1 flex items-center justify-center bg-slate-100 py-8">
          <div className={`bg-gradient-to-br ${cor.grad} text-white rounded-2xl p-4 shadow`}>
            <Icone size={32} />
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 bg-slate-200/70 px-3 py-2.5">
          <span className="text-sm font-bold text-slate-800 text-left leading-tight">{node.label}</span>
          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-500 text-white text-[10px] font-bold flex items-center justify-center">
            {quantidade}
          </span>
        </div>
      </button>
      {editando && (
        <div className="absolute top-1.5 right-1.5 bg-white/90 rounded-md p-1 shadow pointer-events-none">
          <GripVertical size={14} className="text-slate-400" />
        </div>
      )}
    </div>
  )
}

// ── Tabela de linhas com o conteúdo do grupo selecionado (com navegação por pastas) ──
function TabelaMenu({ node, hasPermission, navigate, onFechar }) {
  const [caminho, setCaminho] = useState([]) // array de nós (subpastas) navegados

  const atual = caminho.length ? caminho[caminho.length - 1] : node
  const itens = (atual.children || []).filter(n => nodeVisivel(n, hasPermission))
  const Icone = GRUPO_ICONES[node.key] || Folder
  const cor = GRUPO_CORES[node.key] || COR_PADRAO

  return (
    <div className={`border border-slate-200 border-l-4 ${cor.accent} rounded-2xl overflow-hidden bg-white shadow-sm`}>
      <div className={`flex items-center gap-2 flex-wrap px-4 py-3 ${cor.headerBg} border-b ${cor.headerBorder}`}>
        <div className={`bg-gradient-to-br ${cor.grad} text-white rounded-lg p-1.5 shrink-0`}>
          <Icone size={14} />
        </div>
        <button
          onClick={() => setCaminho([])}
          className={`px-3 py-1 rounded-full ${cor.pill} hover:opacity-80 text-xs font-bold transition-opacity`}
        >
          {node.label}
        </button>
        {caminho.map((n, i) => (
          <React.Fragment key={n.key}>
            <ChevronRight size={12} className={`${cor.chevron} shrink-0`} />
            <button
              onClick={() => setCaminho(caminho.slice(0, i + 1))}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors"
            >
              {n.label}
            </button>
          </React.Fragment>
        ))}
        <button onClick={onFechar} className="ml-auto text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {itens.map(item => {
          // navTo faz um nó com children se comportar como link direto (ex.: Matriz KPIs
          // mantém os leaves para o editor de permissões, mas navega direto pra página única).
          const isFolder = !!item.children && !item.navTo
          return (
            <button
              key={item.key}
              onClick={() => isFolder ? setCaminho([...caminho, item]) : navigate('/' + (item.navTo || item.key))}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-left"
            >
              {isFolder
                ? <Folder size={20} className="text-amber-400 fill-amber-300 shrink-0" />
                : <FileText size={20} className="text-slate-400 shrink-0" />}
              <span className="text-sm font-bold text-slate-800 flex-1">{item.label}</span>
              {isFolder && <ChevronRight size={16} className="text-slate-400 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PALETA_ALERTA = {
  red:   { border: 'border-red-300',   bg: 'bg-red-50',   hover: 'hover:bg-red-100',   icon: 'text-red-500',   text: 'text-red-800',   badge: 'bg-red-600' },
  amber: { border: 'border-amber-300', bg: 'bg-amber-50', hover: 'hover:bg-amber-100', icon: 'text-amber-500', text: 'text-amber-800', badge: 'bg-amber-500' },
}

function AlertaExpandivel({ cor, icone: Icone, categoria, resumo, detalhe, quantidade, textoBotao, onBotao, extraConteudo }) {
  const [aberto, setAberto] = useState(false)
  const p = PALETA_ALERTA[cor]

  return (
    <div className={`max-w-lg border-2 ${p.border} rounded-2xl overflow-hidden shadow-sm`}>
      <button
        onClick={() => setAberto(a => !a)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${p.bg} ${p.hover} transition-colors`}
      >
        <AlertTriangle size={18} className={`${p.icon} shrink-0`} />
        <span className={`text-sm font-bold ${p.text} shrink-0`}>Alerta</span>
        <span className={`text-sm ${p.text} truncate flex-1 text-left`}>{resumo}</span>
        {quantidade != null && (
          <span className={`${p.badge} text-white text-xs font-black rounded-lg px-2 py-0.5 tabular-nums shrink-0`}>
            {quantidade}
          </span>
        )}
        <ChevronRight size={16} className={`${p.icon} shrink-0 transition-transform ${aberto ? 'rotate-90' : ''}`} />
      </button>

      {aberto && (
        <div className={`px-4 py-3 bg-white border-t ${p.border} flex flex-col gap-3`}>
          {categoria && (
            <div className="flex items-center gap-2">
              {Icone && <Icone size={14} className="text-slate-500" />}
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{categoria}</span>
              {extraConteudo}
            </div>
          )}
          <p className="text-sm text-slate-700">{detalhe}</p>
          <button
            onClick={onBotao}
            className={`self-start text-xs font-semibold ${p.text} hover:underline flex items-center gap-1`}
          >
            {textoBotao} <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { user, hasPermission, isAdminEfetivo } = useAuth()
  const podeVerAprovacao = hasPermission('metas/gestao-aprovacao')

  const [pendentes, setPendentes]   = useState(null) // null = carregando
  const [ano,       setAno]         = useSessionState('home_ano', new Date().getFullYear())

  const [usuariosSenhaVencida, setUsuariosSenhaVencida] = useState(null) // null = carregando

  useEffect(() => {
    if (!podeVerAprovacao) return
    setPendentes(null)
    apiService.getPendingCountTotal(ano)
      .then(n => setPendentes(n))
      .catch(() => setPendentes(0))
  }, [ano, podeVerAprovacao])

  useEffect(() => {
    if (!isAdminEfetivo) return
    setUsuariosSenhaVencida(null)
    apiService.getUsuarios()
      .then(lista => {
        const vencidos = (lista || []).filter(u => {
          if (u.ativo === false) return false
          const refDate = u.senha_atualizada_em || u.criado_em
          if (!refDate) return false
          const dias = Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24))
          return dias > DIAS_LIMITE_SENHA
        })
        setUsuariosSenhaVencida(vencidos)
      })
      .catch(() => setUsuariosSenhaVencida([]))
  }, [isAdminEfetivo])

  const carregando = pendentes === null
  const carregandoSenhas = usuariosSenhaVencida === null

  const [grupoAberto, setGrupoAberto] = useState(null) // nó do MENU_TREE em exibição na tabela

  const [editando, setEditando]     = useState(false)
  const [arrastando, setArrastando] = useState(null) // key do bloco sendo arrastado
  const [ordem, setOrdem]           = useState(null)       // array de keys, null = padrão A-Z
  const [ordemCarregada, setOrdemCarregada] = useState(false)

  // Ordem personalizada dos blocos vem do próprio usuário no Supabase — assim
  // acompanha o mesmo login em qualquer dispositivo (celular, outro computador etc.),
  // em vez de ficar presa ao localStorage de um navegador só.
  useEffect(() => {
    if (!user?.email) return
    // Busca por e-mail (não por id) — auth.users.id pode não bater com usuarios.id,
    // mesmo cuidado já tomado em AuthContext ao carregar o perfil/permissões.
    supabase.from('usuarios').select('home_ordem_blocos').eq('email', user.email).maybeSingle()
      .then(({ data }) => setOrdem(data?.home_ordem_blocos || null))
      .catch(() => setOrdem(null))
      .finally(() => setOrdemCarregada(true))
  }, [user?.email])

  const nodesVisiveis  = MENU_TREE.filter(node => nodeVisivel(node, hasPermission))
  const nodesOrdenados = ordenarNodes(nodesVisiveis, ordem)

  const salvarOrdem = (novaOrdem) => {
    setOrdem(novaOrdem)
    if (!user?.email) return
    supabase.from('usuarios').update({ home_ordem_blocos: novaOrdem }).eq('email', user.email)
      .then(({ error }) => { if (error) console.error('[Home] Erro ao salvar ordem dos blocos:', error) })
  }

  const handleDragStartBloco = (e, key) => {
    setArrastando(key)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOverBloco = (e) => { e.preventDefault() }
  const handleDropBloco = (e, keyAlvo) => {
    e.preventDefault()
    if (!arrastando || arrastando === keyAlvo) return
    const keys = nodesOrdenados.map(n => n.key)
    const origemIdx = keys.indexOf(arrastando)
    const destinoIdx = keys.indexOf(keyAlvo)
    if (origemIdx === -1 || destinoIdx === -1) return
    const novaOrdem = [...keys]
    novaOrdem.splice(origemIdx, 1)
    novaOrdem.splice(destinoIdx, 0, arrastando)
    salvarOrdem(novaOrdem)
  }

  const alternarEdicao = () => {
    setEditando(e => !e)
    setGrupoAberto(null)
  }

  return (
    <div className="p-8 max-w-screen-xl flex flex-col gap-4">

      {/* Título */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 mb-1">Bem-vindo ao Portal de Gestão</h1>
          <p className="text-lg text-slate-500">Grupo Caiobá</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {editando && (
            <button
              onClick={() => salvarOrdem(null)}
              title="Restaurar ordem alfabética (A-Z)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw size={14} />
              Restaurar A-Z
            </button>
          )}
          <button
            onClick={alternarEdicao}
            title={editando ? 'Concluir personalização' : 'Personalizar organização dos blocos'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
              editando ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {editando ? <Check size={14} /> : <Settings2 size={14} />}
            {editando ? 'Concluir' : 'Personalizar'}
          </button>
        </div>
      </div>

      {/* Alerta de usuários com senha não renovada — só para admin, e só quando há pendência */}
      {isAdminEfetivo && !carregandoSenhas && usuariosSenhaVencida.length > 0 && (
        <AlertaExpandivel
          cor="red"
          icone={KeyRound}
          categoria="Segurança de Acesso"
          quantidade={usuariosSenhaVencida.length}
          resumo={`${usuariosSenhaVencida.length} ${usuariosSenhaVencida.length === 1 ? 'usuário com senha não renovada' : 'usuários com senha não renovada'}`}
          detalhe={`${usuariosSenhaVencida.slice(0, 3).map(u => u.nome).join(', ')}${usuariosSenhaVencida.length > 3 ? ` e mais ${usuariosSenhaVencida.length - 3}` : ''} — sem redefinição há mais de ${DIAS_LIMITE_SENHA} dias.`}
          textoBotao="Ir para Usuários"
          onBotao={() => navigate('/usuarios')}
        />
      )}

      {/* Alerta de aprovação de metas — só para quem tem acesso, e só quando há pendência */}
      {podeVerAprovacao && !carregando && pendentes > 0 && (
        <AlertaExpandivel
          cor="amber"
          icone={ClipboardCheck}
          categoria="Planejamento de Metas"
          quantidade={pendentes}
          resumo={`${pendentes} ${pendentes === 1 ? 'aprovação pendente' : 'aprovações pendentes'} de metas`}
          detalhe={`Há metas de ${ano} aguardando sua análise e aprovação antes de serem publicadas.`}
          textoBotao="Ir para Gestão de Aprovação"
          onBotao={() => navigate('/metas/gestao-aprovacao')}
          extraConteudo={
            <select
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
              onClick={e => e.stopPropagation()}
              className="ml-auto border border-slate-300 rounded-md px-2 py-0.5 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          }
        />
      )}

      {editando && (
        <p className="text-xs text-slate-500 -mt-2">
          Arraste os blocos para reorganizá-los do seu jeito. Clique em "Concluir" quando terminar.
        </p>
      )}

      {/* Menus da barra lateral, em blocos — ao selecionar um, só ele fica visível ao lado da tabela */}
      {ordemCarregada && (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className={(grupoAberto && !editando) ? 'w-40 shrink-0' : 'grid gap-4 flex-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}>
            {nodesOrdenados
              .filter(node => editando || !grupoAberto || grupoAberto.key === node.key)
              .map(node => (
                <GrupoBloco
                  key={node.key}
                  node={node}
                  ativo={grupoAberto?.key === node.key}
                  quantidade={getLeafKeys(node).filter(k => hasPermission(k)).length}
                  onClick={() => setGrupoAberto(g => g?.key === node.key ? null : node)}
                  editando={editando}
                  arrastando={arrastando}
                  onDragStart={handleDragStartBloco}
                  onDragOver={handleDragOverBloco}
                  onDrop={handleDropBloco}
                  onDragEnd={() => setArrastando(null)}
                />
              ))}
          </div>
          {grupoAberto && !editando && (
            <div className="w-full lg:flex-1 shrink-0">
              <TabelaMenu
                node={grupoAberto}
                hasPermission={hasPermission}
                navigate={navigate}
                onFechar={() => setGrupoAberto(null)}
              />
            </div>
          )}
        </div>
      )}

    </div>
  )
}
