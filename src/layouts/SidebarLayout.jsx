import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Settings, TableProperties, Users, ShieldCheck,
  Building2, Layers, FolderTree, Box as BoxIcon, Briefcase, Tag,
  Wrench, Package, TrendingUp, FileCheck2,
  BadgePercent, ScrollText, Clock, CalendarX, Calendar,
  Target, ShoppingBag, Car, Cog, ClipboardCheck, UserCheck,
  LogOut, BarChart2, Wallet,
  ClipboardList, Home, FolderKanban, CircleDot, FileText, CalendarDays, DollarSign, Truck, LayoutGrid,
  Calculator, BookOpen, GraduationCap,
  KeyRound, Eye, EyeOff, X, AlertTriangle, Bike, Network, PieChart, Share2, RefreshCw, Gauge, Ruler,
  ShieldAlert, Landmark, Database, Hash, ListChecks, ExternalLink,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import TrocarSenhaObrigatoria from '../pages/TrocarSenhaObrigatoria'
import { supabase } from '../services/supabaseClient'
import { MENU_TREE, getLeafKeys } from '../config/menuTree'
import { APP_VERSION } from '../version'
import { resetDashProjetos } from '../pages/projetos/ProjetosDashboard'

// ── Precompute leaf key sets (recursive) ─────────────────────────────────────
const sectionLeaves = {}
function buildSectionLeaves(node) {
  sectionLeaves[node.key] = new Set(getLeafKeys(node))
  if (node.children) node.children.forEach(buildSectionLeaves)
}
MENU_TREE.forEach(buildSectionLeaves)

// ── Map route to section key ──────────────────────────────────────────────────
function getActiveSectionKey(pathname) {
  if (pathname === '/usuarios' || pathname === '/grupos' || pathname === '/permissoes-matriz') return '_config'
  if (pathname === '/folha-pagamento-daf' || pathname === '/politica-comissao' || pathname === '/fontes-calculo' || pathname === '/bases-calculo' || pathname === '/cargos-remuneracoes' || pathname === '/rubricas' || pathname === '/tipos-processo' || pathname === '/plano-dms') return '_comissoes-calculo'
  const cadastros = ['/segmentos','/agrup-empresas','/empresas','/areas','/agrup-departamentos',
    '/departamentos','/setores','/box','/agrup-cargos','/cargos','/organograma',
    '/movimento-venda','/natureza-operacoes','/tipos-produtos','/tipos-os',
    '/classificacao-compra','/funcionarios','/feriados','/calendario','/sincronizacao-dados']
  if (cadastros.includes(pathname)) return '_config'
  if (pathname.startsWith('/metas')) return '_metas'
  if (pathname.startsWith('/garantias-daf') || pathname.startsWith('/auditoria-os-aberto') || pathname.startsWith('/auditoria') || pathname.startsWith('/garantia') || pathname.startsWith('/honda')) return '_controle-processos'
  if (pathname.startsWith('/projetos') || pathname.startsWith('/auditoria-externa')) return '_gestao-projetos'
  if (pathname.startsWith('/calculadoras')) return '_calculadoras'
  if (pathname.startsWith('/bi') || pathname.startsWith('/kpi')) return '_bi'
  if (pathname.startsWith('/documentacoes') || pathname.startsWith('/rpa') || pathname.startsWith('/ecossistema')) return '_documentacoes'
  if (pathname.startsWith('/treinamentos')) return '_treinamentos'
  if (pathname.startsWith('/governanca')) return '_governanca'
  return null
}

// ── Tooltip via portal (bypasses overflow:hidden) ─────────────────────────────
// Position computed synchronously from the anchor's current bounding rect.
function SidebarTooltip({ label, anchorRef }) {
  if (!anchorRef?.current) return null
  const rect = anchorRef.current.getBoundingClientRect()
  return createPortal(
    <div
      className="fixed pointer-events-none z-[200] bg-slate-900 text-white text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border border-slate-700 whitespace-nowrap"
      style={{ left: rect.right + 10, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }}
    >
      {label}
    </div>,
    document.body
  )
}

// ── Icon button with hover tooltip ───────────────────────────────────────────
function SidebarIconBtn({ icon: Icon, label, onClick, isActive, className }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef(null)

  return (
    <div
      ref={ref}
      className="w-full flex justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-blue-400 hover:text-white hover:bg-blue-800/60'
        } ${className || ''}`}
      >
        <Icon className="h-5 w-5" />
      </button>
      {hovered && <SidebarTooltip label={label} anchorRef={ref} />}
    </div>
  )
}

// ── Direct-nav icon (no flyout) with tooltip ─────────────────────────────────
function SidebarNavIconBtn({ to, icon: Icon, label }) {
  const [hovered, setHovered] = useState(false)
  const ref = useRef(null)

  return (
    <div
      ref={ref}
      className="w-full flex justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <NavLink
        to={to}
        end
        className={({ isActive }) =>
          `w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
            isActive ? 'bg-blue-600 text-white shadow-md' : 'text-blue-400 hover:text-white hover:bg-blue-800/60'
          }`
        }
      >
        <Icon className="h-5 w-5" />
      </NavLink>
      {hovered && <SidebarTooltip label={label} anchorRef={ref} />}
    </div>
  )
}

// ── User avatar with dropdown ─────────────────────────────────────────────────
function UserAvatarBtn({ email, nome, senhaVencida, onAlterarSenha }) {
  const inicial = (nome?.trim().charAt(0) || email.charAt(0))
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="w-full flex justify-center relative">
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => !open && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-blue-800/40 hover:bg-blue-700/60 transition-colors cursor-pointer"
      >
        <span className="text-[11px] font-bold text-blue-300 uppercase">{inicial}</span>
        {senhaVencida && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-blue-950" />
        )}
      </button>
      {!open && hovered && <SidebarTooltip label={email} anchorRef={ref} />}
      {open && createPortal(
        <div
          onMouseDown={e => e.stopPropagation()}
          className="fixed z-[300] bg-white border border-slate-200 rounded-lg shadow-xl py-1 w-52"
          style={(() => {
            const r = ref.current?.getBoundingClientRect()
            return r ? { left: r.right + 8, bottom: window.innerHeight - r.bottom - 4 } : {}
          })()}
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800 truncate">{email}</p>
            {senhaVencida && (
              <p className="text-[10px] text-red-600 font-medium mt-0.5 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Senha expirada
              </p>
            )}
          </div>
          <button
            onClick={() => { setOpen(false); onAlterarSenha() }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-400" />
            Alterar minha senha
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Flyout: group label ───────────────────────────────────────────────────────
function FlyGroup({ label }) {
  return (
    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide px-3 pt-3 pb-1 select-none">
      {label}
    </p>
  )
}

// ── Flyout: nav item ──────────────────────────────────────────────────────────
function FlyItem({ to, icon: Icon, children, badge, onClose }) {
  return (
    <NavLink
      to={to}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
          isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-blue-700/60'
        }`
      }
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
      <span className="flex-1 truncate">{children}</span>
      {badge > 0 && (
        <span className="bg-amber-400 text-blue-950 text-[10px] font-bold px-1 rounded-full min-w-[18px] text-center leading-5">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </NavLink>
  )
}

// ── Flyout: link externo (abre em nova aba, sem passar pelo react-router) ────
function FlyItemExternal({ href, icon: Icon, children, onClose }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClose}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors text-slate-300 hover:text-white hover:bg-blue-700/60"
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-blue-400" />}
      <span className="flex-1 truncate">{children}</span>
      <ExternalLink className="h-3 w-3 shrink-0 text-slate-500" />
    </a>
  )
}

// ── Main layout ───────────────────────────────────────────────────────────────
export default function SidebarLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userNome, logout, hasPermission, permissionsLoading, impersonando, encerrarVisualizacao, trocarSenha, marcarSenhaTrocada } = useAuth()

  const [activeSection, setActiveSection] = useState(null)
  const [pendingMetas, setPendingMetas] = useState(0)
  const sidebarRef = useRef(null)

  // ─ Alterar senha própria ──────────────────────────────────────────────────
  const [modalSenha, setModalSenha] = useState(false)
  const [formSenha, setFormSenha] = useState({ nova: '', confirmar: '' })
  const [showNova, setShowNova] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)
  const [savingSenha, setSavingSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState(null)
  const [senhaVencida, setSenhaVencida] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('usuarios').select('senha_atualizada_em, criado_em').eq('id', user.id).single()
      .then(({ data }) => {
        if (!data) return
        const ref = data.senha_atualizada_em || data.criado_em
        if (!ref) return
        const dias = Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
        setSenhaVencida(dias > 30)
      })
  }, [user?.id])

  const abrirModalSenha = () => {
    setFormSenha({ nova: '', confirmar: '' })
    setErroSenha(null)
    setShowNova(false)
    setShowConfirmar(false)
    setModalSenha(true)
  }

  const handleSalvarSenha = async (e) => {
    e.preventDefault()
    if (formSenha.nova.length < 6) return setErroSenha('A senha deve ter no mínimo 6 caracteres.')
    if (formSenha.nova !== formSenha.confirmar) return setErroSenha('As senhas não coincidem.')
    setSavingSenha(true)
    setErroSenha(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: formSenha.nova })
      if (error) throw error
      await supabase.from('usuarios').update({ senha_atualizada_em: new Date().toISOString() }).eq('id', user.id)
      setSenhaVencida(false)
      setModalSenha(false)
    } catch (err) {
      const msg = err.message || ''
      if (msg.toLowerCase().includes('different from the old password'))
        setErroSenha('A nova senha deve ser diferente da senha atual.')
      else if (msg.toLowerCase().includes('password should be at least'))
        setErroSenha('A senha deve ter no mínimo 6 caracteres.')
      else
        setErroSenha('Erro ao alterar senha. Tente novamente.')
    } finally {
      setSavingSenha(false)
    }
  }

  const currentSection = useMemo(() => getActiveSectionKey(location.pathname), [location.pathname])

  const canView = (path) => hasPermission(path)
  const canViewSection = (key) => {
    const leaves = sectionLeaves[key]
    if (!leaves) return false
    return [...leaves].some(k => hasPermission(k))
  }

  useEffect(() => { setActiveSection(null) }, [location.pathname])

  useEffect(() => {
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setActiveSection(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setActiveSection(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const [{ data: pecas }, { data: mecanico }, { data: funilaria }, { data: terceiros }] = await Promise.all([
          supabase.rpc('get_pending_metas_pecas'),
          supabase.from('fato_rascunho_metas_servicos_mecanico').select('id,meta_faturamento,meta_aprovada').gt('meta_faturamento', 0),
          supabase.from('fato_rascunho_metas_funilaria_pintura').select('id,meta_faturamento,meta_aprovada').gt('meta_faturamento', 0),
          supabase.from('fato_rascunho_metas_terceiros').select('id,meta_faturamento,meta_aprovada').gt('meta_faturamento', 0),
        ])
        const pending = (rows) => (rows || []).filter(r => {
          const cur = Number(r.meta_faturamento) || 0
          if (cur === 0) return false
          if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
          return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
        }).length
        setPendingMetas((pecas?.length || 0) + pending(mecanico) + pending(funilaria) + pending(terceiros))
      } catch { /* non-fatal */ }
    }
    fetchPending()
  }, [location.pathname])

  const handleLogout = async () => {
    resetDashProjetos()
    await logout()
    navigate('/login')
  }

  const toggleSection = (key) => setActiveSection(prev => prev === key ? null : key)
  const closeFlyout = () => setActiveSection(null)

  // ── Flyout content ────────────────────────────────────────────────────────
  const renderFlyoutContent = () => {
    switch (activeSection) {

      case '_config':
        return (
          <>
            {(canView('usuarios') || canView('grupos') || canView('permissoes-matriz')) && <FlyGroup label="Cadastros" />}
            {canView('usuarios') && <FlyItem to="/usuarios" icon={Users} onClose={closeFlyout}>Usuários</FlyItem>}
            {canView('grupos') && <FlyItem to="/grupos" icon={ShieldCheck} onClose={closeFlyout}>Grupos de Acessos</FlyItem>}
            {canView('permissoes-matriz') && <FlyItem to="/permissoes-matriz" icon={KeyRound} onClose={closeFlyout}>Matriz de Permissões</FlyItem>}
            {canViewSection('_gestao-tempo') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Gestão de Tempo" />
                {canView('feriados') && <FlyItem to="/feriados" icon={CalendarX} onClose={closeFlyout}>Feriados</FlyItem>}
                {canView('calendario') && <FlyItem to="/calendario" icon={Calendar} onClose={closeFlyout}>Calendário</FlyItem>}
              </>
            )}
            {canView('sincronizacao-dados') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyItem to="/sincronizacao-dados" icon={RefreshCw} onClose={closeFlyout}>Sincronização de Dados</FlyItem>
              </>
            )}
            {canViewSection('_cadastros.gerais') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Tabelas Gerais" />
                {canView('segmentos') && <FlyItem to="/segmentos" icon={Building2} onClose={closeFlyout}>Segmentos</FlyItem>}
                {canView('agrup-empresas') && <FlyItem to="/agrup-empresas" icon={Building2} onClose={closeFlyout}>Agrupamento Empresas</FlyItem>}
                {canView('empresas') && <FlyItem to="/empresas" icon={Building2} onClose={closeFlyout}>Empresas</FlyItem>}
                {canView('areas') && <FlyItem to="/areas" icon={Tag} onClose={closeFlyout}>Áreas</FlyItem>}
                {canView('agrup-departamentos') && <FlyItem to="/agrup-departamentos" icon={Layers} onClose={closeFlyout}>Agrupamento Depto.</FlyItem>}
                {canView('departamentos') && <FlyItem to="/departamentos" icon={Layers} onClose={closeFlyout}>Departamentos</FlyItem>}
                {canView('setores') && <FlyItem to="/setores" icon={FolderTree} onClose={closeFlyout}>Setor de Serviços</FlyItem>}
                {canView('box') && <FlyItem to="/box" icon={BoxIcon} onClose={closeFlyout}>Box</FlyItem>}
                {canView('agrup-cargos') && <FlyItem to="/agrup-cargos" icon={Briefcase} onClose={closeFlyout}>Agrupamento de Cargos</FlyItem>}
                {canView('cargos') && <FlyItem to="/cargos" icon={Briefcase} onClose={closeFlyout}>Cargos</FlyItem>}
                {canView('organograma') && <FlyItem to="/organograma" icon={Network} onClose={closeFlyout}>Organograma</FlyItem>}
              </>
            )}
            {canView('funcionarios') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Funcionários" />
                <FlyItem to="/funcionarios" icon={Users} onClose={closeFlyout}>Funcionários</FlyItem>
              </>
            )}
            {canViewSection('_cadastros.vendas') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Tabelas de Vendas" />
                {canView('movimento-venda') && <FlyItem to="/movimento-venda" icon={TrendingUp} onClose={closeFlyout}>Movimento de Venda</FlyItem>}
                {canView('natureza-operacoes') && <FlyItem to="/natureza-operacoes" icon={FileCheck2} onClose={closeFlyout}>Natureza de Operações</FlyItem>}
                {canView('tipos-produtos') && <FlyItem to="/tipos-produtos" icon={Package} onClose={closeFlyout}>Tipos de Produtos</FlyItem>}
                {canView('tipos-os') && <FlyItem to="/tipos-os" icon={Wrench} onClose={closeFlyout}>Tipos de O.S.</FlyItem>}
                {canView('classificacao-compra') && <FlyItem to="/classificacao-compra" icon={ShoppingBag} onClose={closeFlyout}>Classificação de Compra</FlyItem>}
              </>
            )}
            {canViewSection('_cadastros.compras') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Tabelas de Compras" />
                {canView('fornecedores') && <FlyItem to="/fornecedores" icon={Truck} onClose={closeFlyout}>Fornecedores</FlyItem>}
              </>
            )}
          </>
        )

      case '_funcionarios':
        return (
          <>
            <FlyGroup label="Funcionários" />
            {canView('funcionarios') && <FlyItem to="/funcionarios" icon={Users} onClose={closeFlyout}>Funcionários</FlyItem>}
            {canViewSection('_gestao-tempo') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyGroup label="Gestão de Tempo" />
                {canView('feriados') && <FlyItem to="/feriados" icon={CalendarX} onClose={closeFlyout}>Feriados</FlyItem>}
                {canView('calendario') && <FlyItem to="/calendario" icon={Calendar} onClose={closeFlyout}>Calendário</FlyItem>}
              </>
            )}
            {canView('sincronizacao-dados') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyItem to="/sincronizacao-dados" icon={RefreshCw} onClose={closeFlyout}>Sincronização de Dados</FlyItem>
              </>
            )}
          </>
        )

      case '_comissoes-calculo':
        return (
          <>
            {canViewSection('_comissoes') && (
              <>
                <FlyGroup label="Regras de Comissões" />
                {canView('fontes-calculo') && <FlyItem to="/fontes-calculo" icon={TableProperties} onClose={closeFlyout}>Fonte de Cálculo</FlyItem>}
                {canView('bases-calculo') && <FlyItem to="/bases-calculo" icon={Calculator} onClose={closeFlyout}>Base de Cálculo</FlyItem>}
                {canView('politica-comissao') && <FlyItem to="/politica-comissao" icon={ScrollText} onClose={closeFlyout}>Política de Comissões</FlyItem>}
                {canView('cargos-remuneracoes') && <FlyItem to="/cargos-remuneracoes" icon={Briefcase} onClose={closeFlyout}>Cargos e Remunerações</FlyItem>}
                {canView('rubricas') && <FlyItem to="/rubricas" icon={Hash} onClose={closeFlyout}>Rubrica</FlyItem>}
                {canView('tipos-processo') && <FlyItem to="/tipos-processo" icon={ListChecks} onClose={closeFlyout}>Tipo de Processo</FlyItem>}
                {canView('plano-dms') && <FlyItem to="/plano-dms" icon={Wrench} onClose={closeFlyout}>Valor Plano DMS</FlyItem>}
                <div className="mx-3 my-2 border-t border-blue-800/50" />
              </>
            )}
            {(canView('ferias') || canView('calculo-comissoes') || canView('processamento-comissoes') || canView('sobreaviso-plantao') || canView('plano-dms-calculo')) && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyItem to="/folha-pagamento-daf" icon={Wallet} onClose={closeFlyout}>Folha de Pagamento - DAF</FlyItem>
              </>
            )}
          </>
        )

      case '_metas':
        return (
          <>
            {canViewSection('_metas.vendas') && (
              <>
                <FlyGroup label="Vendas" />
                {canView('metas/vendas/novos') && <FlyItem to="/metas/vendas/novos" icon={Car} onClose={closeFlyout}>Novos</FlyItem>}
                {canView('metas/vendas/seminovos') && <FlyItem to="/metas/vendas/seminovos" icon={Car} onClose={closeFlyout}>Seminovos</FlyItem>}
                {canView('metas/vendas/total') && <FlyItem to="/metas/vendas/total" icon={TrendingUp} onClose={closeFlyout}>Total Vendas</FlyItem>}
              </>
            )}
            {canViewSection('_metas.pos-vendas') && (
              <>
                <FlyGroup label="Pós-Vendas" />
                {canView('metas/pos-vendas/pecas') && <FlyItem to="/metas/pos-vendas/pecas" icon={Package} onClose={closeFlyout}>Peças</FlyItem>}
                {canView('metas/pos-vendas/servicos') && <FlyItem to="/metas/pos-vendas/servicos" icon={Cog} onClose={closeFlyout}>Serviços</FlyItem>}
                {canView('metas/pos-vendas/total') && <FlyItem to="/metas/pos-vendas/total" icon={TrendingUp} onClose={closeFlyout}>Total Pós-Vendas</FlyItem>}
              </>
            )}
            {(canView('metas/gestao-aprovacao') || canView('metas/total-grupo')) && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                {canView('metas/gestao-aprovacao') && (
                  <FlyItem to="/metas/gestao-aprovacao" icon={ClipboardCheck} badge={pendingMetas} onClose={closeFlyout}>
                    Gestão de Aprovação
                  </FlyItem>
                )}
                {canView('metas/total-grupo') && <FlyItem to="/metas/total-grupo" icon={Layers} onClose={closeFlyout}>Total Grupo</FlyItem>}
              </>
            )}
          </>
        )

      case '_controle-processos':
        return (
          <>
            {(canView('garantias-daf-andamento') || canView('garantias-daf') || canView('garantias-daf-faturadas') || canView('garantias-daf-titulos') || canView('honda/garantias-a-receber')) && (
              <FlyGroup label="Controle de Processos" />
            )}
            {/* Dashboard e as demais telas (Encerradas, Faturadas, a Receber) já ficam acessíveis como abas dentro de Garantias DAF. */}
            {(canView('garantias-daf-andamento') || canView('garantias-daf')) && (
              <FlyItem to={canView('garantias-daf-andamento') ? '/garantias-daf-andamento' : '/garantias-daf'} icon={ShieldCheck} onClose={closeFlyout}>Garantias DAF</FlyItem>
            )}
            {canView('honda/garantias-a-receber') && <FlyItem to="/honda/garantias-a-receber" icon={Bike} onClose={closeFlyout}>Contas a Receber HONDA</FlyItem>}
            {(canView('auditoria/responsaveis') || canView('auditoria/situacoes') || canView('auditoria-os-aberto')) && (
              <FlyGroup label="Cadastros de Auditoria" />
            )}
            {canView('auditoria/responsaveis') && <FlyItem to="/auditoria/responsaveis" icon={Users} onClose={closeFlyout}>Responsáveis</FlyItem>}
            {canView('auditoria/situacoes') && <FlyItem to="/auditoria/situacoes" icon={Tag} onClose={closeFlyout}>Situações</FlyItem>}
            {canView('auditoria-os-aberto') && <FlyItem to="/auditoria-os-aberto" icon={ClipboardList} onClose={closeFlyout}>Auditoria O.S. Aberta</FlyItem>}
            {canView('garantia/tipo-titulo') && <FlyGroup label="Cadastros de Garantia" />}
            {canView('garantia/tipo-titulo') && <FlyItem to="/garantia/tipo-titulo" icon={FileText} onClose={closeFlyout}>Tipo de Título Garantia</FlyItem>}
          </>
        )

      case '_gestao-projetos':
        return (
          <>
            <FlyGroup label="Gestão de Projetos" />
            {canView('projetos') && <FlyItem to="/projetos" icon={FolderKanban} onClose={closeFlyout}>Projetos</FlyItem>}

            {(canView('auditoria-externa/ciclos') || canView('auditoria-externa/dashboard') || canView('auditoria-externa/divergencias') || canView('auditoria-externa/plano-acao') || canView('auditoria-externa/tipos-acao') || canView('auditoria-externa/impactos')) && (
              <FlyItem to="/auditoria-externa/dashboard" icon={ShieldAlert} onClose={closeFlyout}>Auditoria Externa</FlyItem>
            )}

            {canViewSection('_gestao-projetos.cadastros') && (
              <>
                <div className="h-px bg-slate-100 my-2" />
                <FlyGroup label="Cadastros" />
              </>
            )}
            {canView('projetos/empresas') && <FlyItem to="/projetos/empresas" icon={Building2} onClose={closeFlyout}>Empresas</FlyItem>}
            {canView('projetos/departamentos') && <FlyItem to="/projetos/departamentos" icon={Layers} onClose={closeFlyout}>Departamentos</FlyItem>}
            {canView('projetos/areas') && <FlyItem to="/projetos/areas" icon={Tag} onClose={closeFlyout}>Áreas</FlyItem>}
            {canView('projetos/sistemas') && <FlyItem to="/projetos/sistemas" icon={BoxIcon} onClose={closeFlyout}>Sistemas</FlyItem>}
            {canView('projetos/responsaveis') && <FlyItem to="/projetos/responsaveis" icon={Users} onClose={closeFlyout}>Responsáveis</FlyItem>}
            {canView('projetos/fases') && <FlyItem to="/projetos/fases" icon={Layers} onClose={closeFlyout}>Fases</FlyItem>}
            {canView('projetos/status') && <FlyItem to="/projetos/status" icon={CircleDot} onClose={closeFlyout}>Status</FlyItem>}
            {canView('projetos/templates') && <FlyItem to="/projetos/templates" icon={FileText} onClose={closeFlyout}>Templates de Tarefa</FlyItem>}
          </>
        )

      case '_calculadoras':
        return (
          <>
            <FlyGroup label="Calculadoras" />
            {canView('calculadoras/venda-servico') && (
              <FlyItem to="/calculadoras/venda-servico" icon={Calculator} onClose={closeFlyout}>
                Venda de Serviço Terceiro
              </FlyItem>
            )}
          </>
        )

      case '_bi':
        return (
          <>
            <FlyGroup label="BI - Dashboard" />
            {canView('bi/garantias-daf') && <FlyItem to="/bi/garantias-daf" icon={ShieldCheck} onClose={closeFlyout}>Garantias DAF</FlyItem>}
            {canView('bi/projetos') && <FlyItem to="/bi/projetos" icon={FolderKanban} onClose={closeFlyout}>Gestão de Projetos</FlyItem>}
            {canView('bi/possibilidades') && <FlyItem to="/bi/possibilidades" icon={Gauge} onClose={closeFlyout}>Possibilidades</FlyItem>}
            {canView('bi/fontes') && <FlyItem to="/bi/fontes" icon={Database} onClose={closeFlyout}>Fontes</FlyItem>}
            {canView('bi/medidas') && <FlyItem to="/bi/medidas" icon={Ruler} onClose={closeFlyout}>Medidas</FlyItem>}
            {canView('bi/comissoes') && <FlyItem to="/bi/comissoes" icon={Wallet} onClose={closeFlyout}>Comissões</FlyItem>}
            {canViewSection('_bi.kpis') && (
              <>
                <div className="mx-3 my-2 border-t border-blue-800/50" />
                <FlyItem to="/kpi/matriz" icon={BarChart2} onClose={closeFlyout}>Matriz KPIs</FlyItem>
              </>
            )}
          </>
        )

      case '_documentacoes':
        return (
          <>
            <FlyGroup label="Documentações" />
            {canView('rpa/agendamentos') && <FlyItem to="/rpa/agendamentos" icon={Clock} onClose={closeFlyout}>Agendamento de Processos</FlyItem>}
            {canView('documentacoes') && <FlyItem to="/documentacoes" icon={BookOpen} onClose={closeFlyout}>Documentações</FlyItem>}
            {canView('ecossistema') && <FlyItem to="/ecossistema" icon={Share2} onClose={closeFlyout}>Ecossistema</FlyItem>}
          </>
        )

      case '_treinamentos':
        return (
          <>
            <FlyGroup label="Treinamentos" />
            {canView('treinamentos/grade') && <FlyItem to="/treinamentos/grade" icon={GraduationCap} onClose={closeFlyout}>Grade de Treinamentos</FlyItem>}
            {canView('treinamentos/central') && <FlyItemExternal href="https://centraldetreinamentos.netlify.app/" icon={BookOpen} onClose={closeFlyout}>Central de Treinamentos</FlyItemExternal>}
          </>
        )

      case '_governanca':
        return (
          <>
            <FlyGroup label="Governança" />
            {canView('governanca/grupo-acessos') && <FlyItem to="/governanca/grupo-acessos" icon={Landmark} onClose={closeFlyout}>Grupo de Acessos</FlyItem>}
            {canView('governanca/perfis-acesso') && <FlyItem to="/governanca/perfis-acesso" icon={ShieldCheck} onClose={closeFlyout}>Perfis de Acesso</FlyItem>}
          </>
        )

      default:
        return null
    }
  }

  if (permissionsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <span className="text-xs text-slate-400">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">

      {/* ── SIDEBAR ── */}
      <aside
        ref={sidebarRef}
        className="relative w-16 bg-blue-950 flex flex-col h-full border-r border-blue-900 shrink-0 z-40"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-blue-900 shrink-0">
          <div className="h-9 w-9 bg-blue-600 rounded-md flex items-center justify-center font-bold text-lg shadow-md text-white select-none">
            GC
          </div>
        </div>

        {/* Nav icons */}
        <nav className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-1">

          <SidebarNavIconBtn to="/" icon={Home} label="Home" />

          <div className="w-8 border-t border-blue-900/60 my-1" />

          {canViewSection('_config') && (
            <SidebarIconBtn
              icon={Settings}
              label="Configurações"
              isActive={currentSection === '_config' || activeSection === '_config'}
              onClick={() => toggleSection('_config')}
            />
          )}
          {canViewSection('_comissoes-calculo') && (
            <SidebarIconBtn
              icon={Wallet}
              label="Comissões"
              isActive={currentSection === '_comissoes-calculo' || activeSection === '_comissoes-calculo'}
              onClick={() => toggleSection('_comissoes-calculo')}
            />
          )}

          {canViewSection('_metas') && (
            <SidebarIconBtn
              icon={Target}
              label="Planejamento de Metas"
              isActive={currentSection === '_metas' || activeSection === '_metas'}
              onClick={() => toggleSection('_metas')}
            />
          )}
          {canViewSection('_controle-processos') && (
            <SidebarIconBtn
              icon={ClipboardList}
              label="Controle de Processos"
              isActive={currentSection === '_controle-processos' || activeSection === '_controle-processos'}
              onClick={() => toggleSection('_controle-processos')}
            />
          )}
          {canViewSection('_gestao-projetos') && (
            <SidebarIconBtn
              icon={FolderKanban}
              label="Gestão de Projetos"
              isActive={currentSection === '_gestao-projetos' || activeSection === '_gestao-projetos'}
              onClick={() => toggleSection('_gestao-projetos')}
            />
          )}
          {canViewSection('_calculadoras') && (
            <SidebarIconBtn
              icon={Calculator}
              label="Calculadoras"
              isActive={currentSection === '_calculadoras' || activeSection === '_calculadoras'}
              onClick={() => toggleSection('_calculadoras')}
            />
          )}
          {canViewSection('_bi') && (
            <SidebarIconBtn
              icon={PieChart}
              label="BI - Dashboard"
              isActive={currentSection === '_bi' || activeSection === '_bi'}
              onClick={() => toggleSection('_bi')}
            />
          )}
          {canViewSection('_documentacoes') && (
            <SidebarIconBtn
              icon={BookOpen}
              label="Documentações"
              isActive={currentSection === '_documentacoes' || activeSection === '_documentacoes'}
              onClick={() => toggleSection('_documentacoes')}
            />
          )}
          {canViewSection('_treinamentos') && (
            <SidebarIconBtn
              icon={GraduationCap}
              label="Treinamentos"
              isActive={currentSection === '_treinamentos' || activeSection === '_treinamentos'}
              onClick={() => toggleSection('_treinamentos')}
            />
          )}
          {canViewSection('_governanca') && (
            <SidebarIconBtn
              icon={Landmark}
              label="Governança"
              isActive={currentSection === '_governanca' || activeSection === '_governanca'}
              onClick={() => toggleSection('_governanca')}
            />
          )}

        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700/50 py-2 flex flex-col items-center gap-1 shrink-0">
          {user?.email && (
            <UserAvatarBtn email={user.email} nome={userNome} senhaVencida={senhaVencida} onAlterarSenha={abrirModalSenha} />
          )}
          <SidebarIconBtn
            icon={LogOut}
            label="Sair"
            isActive={false}
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10"
          />
          <span className="text-[10px] font-medium text-slate-400 select-none">v{APP_VERSION}</span>
        </div>

        {/* ── Flyout panel ── */}
        {activeSection && (
          <div className="absolute left-full top-0 bottom-0 w-56 bg-blue-950 border-r border-blue-800/50 shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="h-16 flex items-center px-4 border-b border-blue-900 bg-blue-900/40 shrink-0">
              <span className="text-sm font-bold text-white truncate">
                {activeSection === '_config' && 'Configurações'}
                {activeSection === '_comissoes-calculo' && 'Comissões'}
                {activeSection === '_cadastros' && 'Cadastro de Tabelas'}
                {activeSection === '_comissoes' && 'Regras de Comissões'}
                {activeSection === '_gestao-tempo' && 'Gestão de Tempo'}
                {activeSection === '_metas' && 'Planejamento de Metas'}
                {activeSection === '_controle-processos' && 'Controle de Processos'}
                {activeSection === '_gestao-projetos' && 'Gestão de Projetos'}
                {activeSection === '_calculadoras' && 'Calculadoras'}
                {activeSection === '_bi' && 'BI - Dashboard'}
                {activeSection === '_documentacoes' && 'Documentações'}
                {activeSection === '_treinamentos' && 'Treinamentos'}
                {activeSection === '_governanca' && 'Governança'}
                {activeSection === 'organograma' && 'Organograma'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto py-1 px-2">
              {renderFlyoutContent()}
            </div>
          </div>
        )}

      </aside>

      {/* Overlay to close flyout on main content click */}
      {activeSection && (
        <div
          className="fixed inset-0 z-30"
          style={{ left: '288px' }}
          onClick={closeFlyout}
        />
      )}

      {/* ── CONTEÚDO ── */}
      <main className="flex-1 h-full overflow-y-auto bg-slate-50 relative z-0">
        {impersonando && (
          <div className="sticky top-0 z-30 flex items-center gap-3 bg-violet-600 text-white px-4 py-2 text-sm shadow-md">
            <UserCheck size={16} className="shrink-0" />
            <span className="flex-1">
              Visualizando como <span className="font-bold">{impersonando.nome}</span>
              <span className="ml-2 text-violet-200 text-xs">({impersonando.email})</span>
              {impersonando.semGrupo && <span className="ml-2 text-violet-200 text-xs">— sem grupo de acesso</span>}
            </span>
            <button
              onClick={encerrarVisualizacao}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-semibold text-xs transition-colors"
            >
              Sair da visualização
            </button>
          </div>
        )}
        {senhaVencida && (
          <div className="sticky top-0 z-29 flex items-center gap-3 bg-red-600 text-white px-4 py-2 text-sm shadow-md">
            <AlertTriangle size={16} className="shrink-0" />
            <span className="flex-1">Sua senha tem mais de 30 dias. Redefina agora para manter o acesso seguro.</span>
            <button
              onClick={abrirModalSenha}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              <KeyRound size={13} /> Alterar senha
            </button>
          </div>
        )}
        <Outlet />

        {/* Identificador da rota atual — no final do conteúdo de cada tela (não fixo, não
            sobrepõe nada ao rolar a página), pra localizar rápido qual tela/arquivo ajustar
            quando o usuário pedir uma mudança (informa o path exato usado no App.jsx).
            Não mostra na Home. */}
        {location.pathname !== '/' && (
          <div className="flex justify-end px-4 py-3">
            <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm select-text">
              {location.pathname}
            </span>
          </div>
        )}
      </main>

      {trocarSenha && !impersonando && (
        <TrocarSenhaObrigatoria onSuccess={marcarSenhaTrocada} />
      )}

      {/* ── MODAL ALTERAR SENHA ── */}
      {modalSenha && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[400]">
          <div className="bg-white rounded-xl border border-slate-200 w-[380px] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-500" /> Alterar Minha Senha
              </h3>
              <button onClick={() => setModalSenha(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvarSenha} className="p-5 space-y-4">
              <div className="relative">
                <input
                  type={showNova ? 'text' : 'password'}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  value={formSenha.nova}
                  onChange={e => setFormSenha(f => ({ ...f, nova: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowNova(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmar ? 'text' : 'password'}
                  placeholder="Confirmar nova senha"
                  value={formSenha.confirmar}
                  onChange={e => setFormSenha(f => ({ ...f, confirmar: e.target.value }))}
                  required
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowConfirmar(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formSenha.nova && formSenha.confirmar && formSenha.nova !== formSenha.confirmar && (
                <p className="text-xs text-red-600">As senhas não coincidem.</p>
              )}
              {erroSenha && <p className="text-xs text-red-600">{erroSenha}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingSenha}
                  className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingSenha ? 'Salvando...' : 'Salvar nova senha'}
                </button>
                <button type="button" onClick={() => setModalSenha(false)}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

