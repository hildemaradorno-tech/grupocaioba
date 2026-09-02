import { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, AlertTriangle, ChevronRight, KeyRound,
  Settings, Wallet, Target, ClipboardList, FolderKanban, Calculator, BookOpen,
  Folder, FileText, X, PieChart, GraduationCap, ExternalLink,
} from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
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

// ── Bloco grande (grade) representando um grupo de menu ──────────────────────
function GrupoBloco({ node, ativo, quantidade, onClick }) {
  const Icone = GRUPO_ICONES[node.key] || Folder
  const cor = GRUPO_CORES[node.key] || COR_PADRAO

  return (
    <button
      onClick={onClick}
      className={`w-full flex flex-col rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all ${
        ativo ? `${cor.ring} ring-2` : 'border-slate-200'
      }`}
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
  )
}

// ── Coluna com o conteúdo de um nível do grupo — cada subpasta clicada abre uma
// nova coluna ao lado (cascata lateral, estilo colunas do Finder) ──
function ColunaMenu({ node, rootNode, selecionadoKey, hasPermission, navigate, onSelecionar, onFechar }) {
  const itens = (node.children || []).filter(n => !n.virtual && nodeVisivel(n, hasPermission))
  const Icone = GRUPO_ICONES[rootNode.key] || Folder
  const cor = GRUPO_CORES[rootNode.key] || COR_PADRAO

  return (
    <div className={`w-full sm:w-[280px] shrink-0 border border-slate-200 border-l-4 ${cor.accent} rounded-2xl overflow-hidden bg-white shadow-sm`}>
      <div className={`flex items-center gap-2 px-4 py-3 ${cor.headerBg} border-b ${cor.headerBorder}`}>
        <div className={`bg-gradient-to-br ${cor.grad} text-white rounded-lg p-1.5 shrink-0`}>
          <Icone size={14} />
        </div>
        <span className="text-xs font-bold text-slate-700 flex-1 truncate">{node.label}</span>
        <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {itens.map(item => {
          // navTo faz um nó com children se comportar como link direto (ex.: Matriz KPIs
          // mantém os leaves para o editor de permissões, mas navega direto pra página única).
          const isFolder = !!item.children && !item.navTo
          const ativo = isFolder && selecionadoKey === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                if (item.href) { window.open(item.href, '_blank', 'noopener,noreferrer'); return }
                isFolder ? onSelecionar(item) : navigate('/' + (item.navTo || item.key))
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                ativo ? cor.pill : 'bg-slate-100 hover:bg-slate-200'
              }`}
            >
              {isFolder
                ? <Folder size={20} className="text-amber-400 fill-amber-300 shrink-0" />
                : item.href
                ? <ExternalLink size={20} className="text-slate-400 shrink-0" />
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
  const { hasPermission, isAdminEfetivo } = useAuth()
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

  // path[0] é o bloco de topo aberto (só um por vez — os demais blocos somem, ficando só
  // o selecionado); cada nível seguinte é uma subpasta aberta em cascata, ao lado do anterior.
  const [caminhoAberto, setCaminhoAberto] = useState([])

  const toggleGrupo = (node) => {
    setCaminhoAberto(prev => prev[0]?.key === node.key ? [] : [node])
  }
  const selecionarSub = (index, item) => {
    setCaminhoAberto(prev => prev[index + 1]?.key === item.key
      ? prev.slice(0, index + 1)
      : [...prev.slice(0, index + 1), item])
  }
  const fecharColuna = (index) => {
    setCaminhoAberto(prev => prev.slice(0, index))
  }

  const nodesOrdenados = MENU_TREE
    .filter(node => nodeVisivel(node, hasPermission))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  return (
    <div className="p-8 max-w-screen-xl flex flex-col gap-4">

      {/* Título */}
      <div className="mb-4">
        <h1 className="text-4xl font-bold text-slate-900 mb-1">Bem-vindo ao Portal de Gestão</h1>
        <p className="text-lg text-slate-500">Grupo Caiobá</p>
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

      {/* Menus da barra lateral, em blocos — ao selecionar um, só ele fica visível e os submenus abrem em cascata ao lado */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className={caminhoAberto.length ? 'w-40 shrink-0' : 'grid gap-4 flex-1 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'}>
          {nodesOrdenados
            .filter(node => !caminhoAberto.length || caminhoAberto[0].key === node.key)
            .map(node => (
              <GrupoBloco
                key={node.key}
                node={node}
                ativo={caminhoAberto[0]?.key === node.key}
                quantidade={getLeafKeys(node).filter(k => hasPermission(k)).length}
                onClick={() => toggleGrupo(node)}
              />
            ))}
        </div>

        {caminhoAberto.length > 0 && (
          <div className="flex gap-4 items-start overflow-x-auto pb-2 flex-1 min-w-0">
            {caminhoAberto.map((n, i) => (
              <ColunaMenu
                key={n.key}
                node={n}
                rootNode={caminhoAberto[0]}
                selecionadoKey={caminhoAberto[i + 1]?.key}
                hasPermission={hasPermission}
                navigate={navigate}
                onSelecionar={item => selecionarSub(i, item)}
                onFechar={() => fecharColuna(i)}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
