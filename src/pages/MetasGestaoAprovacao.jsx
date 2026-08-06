import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardCheck, AlertTriangle, CheckCircle2, Loader2, Sparkles, Pencil,
  ArrowRight, RefreshCw, Building2, ChevronDown, ChevronRight,
  Package, Wrench, Paintbrush, Users, Send, TrendingUp, Clock,
  BarChart3, Cog, Eye, XCircle, Info, Ban,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
const sumArr = (a) => a.reduce((s, v) => s + v, 0)

const TIPOS = [
  { key: 'pecas',     grupo: 'pecas',    contabilizaTotal: true,  label: 'Peças',              labelCurto: 'Peças',     icon: Package,    color: 'blue',   nav: '/metas/pos-vendas/pecas' },
  { key: 'consultor', grupo: 'servicos', contabilizaTotal: true,  label: 'Consultores',         labelCurto: 'Consultor', icon: Cog,        color: 'violet', nav: '/metas/pos-vendas/distribuicao-consultores' },
  { key: 'mecanico',  grupo: 'servicos', contabilizaTotal: false, label: 'Serviços Mecânico',  labelCurto: 'Mecânico',  icon: Wrench,     color: 'indigo', nav: '/metas/pos-vendas/servicos/mecanico' },
  { key: 'funilaria', grupo: 'servicos', contabilizaTotal: false, label: 'Funilaria e Pintura', labelCurto: 'Funilaria', icon: Paintbrush, color: 'orange', nav: '/metas/pos-vendas/funilaria-pintura' },
  { key: 'terceiros', grupo: 'servicos', contabilizaTotal: false, label: 'Terceiros',           labelCurto: 'Terceiros', icon: Users,      color: 'teal',   nav: '/metas/pos-vendas/terceiros' },
]

const COLORS = {
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   hdr: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', hdr: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', hdr: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700', btn: 'bg-violet-600 hover:bg-violet-700 text-white' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', hdr: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', btn: 'bg-orange-600 hover:bg-orange-700 text-white' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   hdr: 'bg-teal-600',   badge: 'bg-teal-100 text-teal-700',   btn: 'bg-teal-600 hover:bg-teal-700 text-white' },
}

function isPendente(r) {
  const cur = Number(r.meta_faturamento) || 0
  if (cur === 0) return false
  if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
  return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
}

// Agrupa dados de um tipo por empresa → { [empId]: { nome, rows, pendentes } }
function agruparPorEmpresa(rows) {
  const m = {}
  rows.forEach(r => {
    if (!m[r.empresa_id]) m[r.empresa_id] = { nome: r.empresa_nome, rows: [], pendentes: 0, total: 0 }
    m[r.empresa_id].rows.push(r)
    m[r.empresa_id].total += Number(r.meta_faturamento) || 0
    if (isPendente(r)) m[r.empresa_id].pendentes++
  })
  return m
}

export default function MetasGestaoAprovacao() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('/metas/gestao-aprovacao', 'editar')
  const canDelete = hasPermission('/metas/gestao-aprovacao', 'excluir')

  const [filtroAno, setFiltroAno] = useSessionState('mga_ano', anoAtual)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  // Dados pendentes (para fila de aprovação)
  const [pending, setPending] = useState({ pecas: [], mecanico: [], consultor: [], funilaria: [], terceiros: [] })
  // Dados completos (para visão geral)
  const [resumo,  setResumo]  = useState({ pecas: [], mecanico: [], consultor: [], funilaria: [], terceiros: [] })
  // Última publicação
  const [ultimaPublicacao, setUltimaPublicacao] = useState(null)

  const [aprovando,      setAprovando]      = useState(null) // 'empId|tipo'
  const [naoAprovando,   setNaoAprovando]   = useState(null) // 'empId|tipo'
  const [modalNaoAprovar, setModalNaoAprovar] = useState(null)
  const [publicando,     setPublicando]     = useState(false)
  const [modalConf,    setModalConf]    = useState(null)
  const [modalPublicar, setModalPublicar] = useState(false)
  const [sucessoPubl,  setSucessoPubl]  = useState(null)

  const [abaAtiva,      setAbaAtiva]      = useSessionState('mga_aba', 'pecas')
  const [subAba,        setSubAba]        = useSessionState('mga_subaba', 'fila')
  const [expandedEmps,  setExpandedEmps]  = useState(new Set())
  const [expandedTipos, setExpandedTipos] = useState(new Set())

  const togEmp  = (id) => setExpandedEmps(p  => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const togTipo = (id) => setExpandedTipos(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [pendPecas, pendMec, pendCons, pendFun, pendTer, res, ultPub] = await Promise.all([
        apiService.getPendingApprovals(),
        apiService.getPendingApprovalsMecanico(),
        apiService.getPendingApprovalsConsultor(),
        apiService.getPendingApprovalsFunilaria(),
        apiService.getPendingApprovalsTerceiros(),
        apiService.getResumoMetasAprovacao(filtroAno),
        apiService.getUltimaPublicacao(filtroAno),
      ])
      setPending({ pecas: pendPecas, mecanico: pendMec, consultor: pendCons, funilaria: pendFun, terceiros: pendTer })
      setResumo(res)
      setUltimaPublicacao(ultPub)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [filtroAno])

  useEffect(() => { load() }, [load])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const allPend = [...pending.pecas, ...pending.mecanico, ...pending.consultor, ...pending.funilaria, ...pending.terceiros]
    const allRes  = [...resumo.pecas,  ...resumo.mecanico,  ...resumo.consultor,  ...resumo.funilaria,  ...resumo.terceiros]
    const totalPendItems  = allPend.length
    const totalAprovados  = allRes.filter(r => !isPendente(r)).length
    const totalRegistros  = allRes.length
    const totalR$Pendente = allPend.reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
    const totalR$Geral    = allRes.reduce((s, r) => s + (Number(r.meta_faturamento) || 0), 0)
    const pctAprovado     = totalRegistros > 0 ? ((totalAprovados / totalRegistros) * 100) : 0
    const empsComPend = new Set(allPend.map(r => r.empresa_id)).size
    return { totalPendItems, totalAprovados, totalRegistros, totalR$Pendente, totalR$Geral, pctAprovado, empsComPend }
  }, [pending, resumo])

  const tudo_aprovado = kpi.totalPendItems === 0 && kpi.totalRegistros > 0

  // ── Estrutura por empresa (para fila de aprovação) ─────────────────────
  const empresasComPendencia = useMemo(() => {
    const empMap = {}
    TIPOS.forEach(t => {
      const grupos = agruparPorEmpresa(pending[t.key])
      Object.entries(grupos).forEach(([empId, info]) => {
        if (!empMap[empId]) empMap[empId] = { id: empId, nome: info.nome, tipos: {} }
        empMap[empId].tipos[t.key] = info
      })
    })
    return Object.values(empMap).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [pending])

  // ── Estrutura por empresa para visão geral ────────────────────────────
  const empresasResumo = useMemo(() => {
    const empMap = {}
    TIPOS.forEach(t => {
      resumo[t.key].forEach(r => {
        if (!empMap[r.empresa_id]) empMap[r.empresa_id] = { id: r.empresa_id, nome: r.empresa_nome, tipos: {} }
        if (!empMap[r.empresa_id].tipos[t.key]) empMap[r.empresa_id].tipos[t.key] = { meses: {}, total: 0, pendentes: 0 }
        const mes = empMap[r.empresa_id].tipos[t.key].meses
        mes[r.mes] = (mes[r.mes] || 0) + (Number(r.meta_faturamento) || 0)
        empMap[r.empresa_id].tipos[t.key].total += Number(r.meta_faturamento) || 0
        if (isPendente(r)) empMap[r.empresa_id].tipos[t.key].pendentes++
      })
    })
    return Object.values(empMap).sort((a, b) => a.nome.localeCompare(b.nome))
  }, [resumo])

  // ── Filtragem por aba ──────────────────────────────────────────────────
  const tiposAba = useMemo(() =>
    abaAtiva === 'geral' ? TIPOS : TIPOS.filter(t => t.grupo === abaAtiva),
    [abaAtiva]
  )

  const empresasAba = useMemo(() =>
    empresasComPendencia.filter(emp => tiposAba.some(t => emp.tipos[t.key])),
    [empresasComPendencia, tiposAba]
  )

  const empresasResumoAba = useMemo(() => {
    if (abaAtiva === 'geral') return empresasResumo
    return empresasResumo
      .map(emp => ({
        ...emp,
        tipos: Object.fromEntries(tiposAba.map(t => [t.key, emp.tipos[t.key]]).filter(([, v]) => v != null))
      }))
      .filter(emp => Object.keys(emp.tipos).length > 0)
  }, [empresasResumo, tiposAba, abaAtiva])

  const pendAba = useMemo(() =>
    tiposAba.reduce((s, t) => s + (pending[t.key]?.length || 0), 0),
    [tiposAba, pending]
  )

  // ── Aprovação ─────────────────────────────────────────────────────────
  const confirmarAprovacao = (empId, empNome, tipo, count, totalR$) => {
    setModalConf({ empId, empNome, tipo, count, totalR$ })
  }

  const handleAprovar = async () => {
    if (!modalConf) return
    const { empId, empNome, tipo, ano } = modalConf
    const chave = `${empId}|${tipo}`
    setAprovando(chave); setModalConf(null)
    try {
      if (tipo === 'pecas')     await apiService.approveMetasPecasEmpresa(empId, filtroAno)
      if (tipo === 'mecanico')  await apiService.approveMetasMecanicoEmpresa(empId, filtroAno)
      if (tipo === 'consultor') await apiService.approveMetasConsultorEmpresa(empId, filtroAno)
      if (tipo === 'funilaria') await apiService.approveMetasFunilariaEmpresa(empId, filtroAno)
      if (tipo === 'terceiros') await apiService.approveMetasTerceirosEmpresa(empId, filtroAno)
      await load()
    } catch (err) { setError(err.message || String(err)) }
    finally { setAprovando(null) }
  }

  // ── Pendênciar — reverte meta_aprovada para null ─────────────────────
  const confirmarNaoAprovacao = (empId, empNome, tipo, count, totalR$) => {
    setModalNaoAprovar({ empId, empNome, tipo, count, totalR$ })
  }

  const handleNaoAprovar = async () => {
    if (!modalNaoAprovar) return
    const { empId, tipo } = modalNaoAprovar
    const chave = `${empId}|${tipo}`
    setNaoAprovando(chave); setModalNaoAprovar(null)
    try {
      if (tipo === 'pecas')     await apiService.unapproveMetasPecasEmpresa(empId, filtroAno)
      if (tipo === 'mecanico')  await apiService.unapproveMetasMecanicoEmpresa(empId, filtroAno)
      if (tipo === 'consultor') await apiService.unapproveMetasConsultorEmpresa(empId, filtroAno)
      if (tipo === 'funilaria') await apiService.unapproveMetasFunilariaEmpresa(empId, filtroAno)
      if (tipo === 'terceiros') await apiService.unapproveMetasTerceirosEmpresa(empId, filtroAno)
      await load()
    } catch (err) { setError(err.message || String(err)) }
    finally { setNaoAprovando(null) }
  }

  // ── Publicar para Power BI ────────────────────────────────────────────
  const handlePublicar = async () => {
    setPublicando(true); setModalPublicar(false)
    try {
      const result = await apiService.publishMetasAprovadas(filtroAno)
      setSucessoPubl(result)
      await load()
    } catch (err) { setError(err.message || String(err)) }
    finally { setPublicando(false) }
  }

  // ── Render helpers ────────────────────────────────────────────────────
  const AprovandoSpinner = ({ chave }) => aprovando === chave
    ? <Loader2 size={12} className="animate-spin" />
    : <CheckCircle2 size={12} />

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ═══════════════════════════════════════════════════════════════════
          CABEÇALHO
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
              <ClipboardCheck size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Gestão de Aprovação — Metas</h1>
              <p className="text-xs text-slate-400">Revise e autorize o planejamento antes da publicação para o Power BI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={load} disabled={loading}
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">

        {/* Banner: tudo aprovado → publicar */}
        {tudo_aprovado && (
          <div className="flex items-center justify-between gap-4 bg-green-50 border border-green-300 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={22} className="text-green-600 shrink-0" />
              <div>
                <p className="font-bold text-green-800">Todas as metas foram aprovadas!</p>
                <p className="text-xs text-green-600">
                  {ultimaPublicacao ? `Última publicação: ${fmtDate(ultimaPublicacao)}` : 'Nenhuma publicação registrada para este ano.'}
                </p>
              </div>
            </div>
            <button onClick={() => setModalPublicar(true)} disabled={publicando}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors shadow disabled:opacity-50 shrink-0">
              {publicando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Publicar para Power BI
            </button>
          </div>
        )}

        {/* Banner: publicação realizada */}
        {sucessoPubl && (
          <div className="flex items-center justify-between gap-4 bg-indigo-50 border border-indigo-300 rounded-xl px-5 py-4">
            <div className="flex items-center gap-3">
              <Send size={18} className="text-indigo-600 shrink-0" />
              <p className="text-sm font-semibold text-indigo-800">
                {sucessoPubl.count} registros publicados com sucesso em {fmtDate(sucessoPubl.publicado_em)}.
                A tabela <code className="bg-indigo-100 px-1 rounded">fato_metas_publicadas</code> foi atualizada.
              </p>
            </div>
            <button onClick={() => setSucessoPubl(null)}><XCircle size={16} className="text-indigo-400 hover:text-indigo-600" /></button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            <AlertTriangle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><XCircle size={15} /></button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABAS
        ════════════════════════════════════════════════════════════════== */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {[
            { key: 'pecas',    label: 'Peças',    icon: Package,    badge: pending.pecas.length },
            { key: 'servicos', label: 'Serviços', icon: Wrench,     badge: pending.mecanico.length + pending.consultor.length + pending.funilaria.length + pending.terceiros.length },
            { key: 'novos',    label: 'Novos',    icon: TrendingUp, badge: 0 },
            { key: 'usados',   label: 'Usados',   icon: RefreshCw,  badge: 0 },
            { key: 'geral',    label: 'Geral',    icon: BarChart3,  badge: 0 },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setAbaAtiva(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-1 justify-center
                ${abaAtiva === key ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'}`}>
              <Icon size={15} />
              {label}
              {badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${abaAtiva === key ? 'bg-white text-indigo-700' : 'bg-amber-400 text-slate-900'}`}>
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Sub-abas: Fila / Visão ── */}
        {!['novos', 'usados'].includes(abaAtiva) && (
          <div className="flex gap-1.5">
            {[
              { key: 'fila',  label: 'Fila de Aprovação',  icon: ClipboardCheck, badge: pendAba },
              { key: 'visao', label: 'Visão Consolidada',   icon: BarChart3,      badge: 0 },
            ].map(({ key, label, icon: Icon, badge }) => (
              <button key={key} onClick={() => setSubAba(key)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors
                  ${subAba === key ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                <Icon size={12} />
                {label}
                {badge > 0 && (
                  <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${subAba === key ? 'bg-white text-slate-800' : 'bg-amber-400 text-slate-900'}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400"><Loader2 size={20} className="animate-spin" /> Carregando...</div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABAS: PEÇAS / SERVIÇOS — FILA DE APROVAÇÃO
        ════════════════════════════════════════════════════════════════== */}
        {!loading && subAba === 'fila' && (abaAtiva === 'pecas' || abaAtiva === 'servicos' || abaAtiva === 'geral') && (
          <div className="space-y-4">
            {empresasAba.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white border border-slate-200 rounded-xl">
                <CheckCircle2 size={48} className="text-green-400" />
                <p className="text-lg font-bold text-slate-700">Fila de aprovação vazia</p>
                <p className="text-sm text-slate-400">Nenhum valor aguardando sua autorização.</p>
                {kpi.totalRegistros === 0 && (
                  <p className="text-xs text-slate-400 mt-1">Nenhuma meta cadastrada para {filtroAno}.</p>
                )}
              </div>
            ) : (
              empresasAba.map(emp => {
                const empOpen = expandedEmps.has(emp.id)
                const totalPend = tiposAba.reduce((s, t) => s + (emp.tipos[t.key]?.pendentes || 0), 0)
                const totalR$ = tiposAba.filter(t => t.contabilizaTotal).reduce((s, t) => s + (emp.tipos[t.key]?.total || 0), 0)
                return (
                  <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Cabeçalho da empresa */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800 text-white cursor-pointer select-none"
                         onClick={() => togEmp(emp.id)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Building2 size={18} className="text-slate-400 shrink-0" />
                        <span className="font-bold text-base">{emp.nome}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-xs font-bold">
                          {totalPend} pendente{totalPend !== 1 ? 's' : ''}
                        </span>
                        <span className="text-slate-300 text-sm font-semibold">{fmtBRL(totalR$)}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); navigate('/metas/pos-vendas/total') }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">
                          <Eye size={12} /> Ver Total Pós-Vendas
                        </button>
                        {empOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      </div>
                    </div>

                    {/* Tipos dentro da empresa */}
                    {empOpen && (
                      <div className="divide-y divide-slate-100">
                        {tiposAba.map(tipo => {
                          const info = emp.tipos[tipo.key]
                          if (!info) return null
                          const Icon = tipo.icon
                          const cl = COLORS[tipo.color]
                          const tipoKey = `${emp.id}|${tipo.key}`
                          const tipoOpen = expandedTipos.has(tipoKey)
                          const aprovandoEste = aprovando === tipoKey
                          const mesArr = Array(12).fill(0)
                          info.rows.forEach(r => { mesArr[r.mes - 1] += Number(r.meta_faturamento) || 0 })

                          // Agrupa pendentes por colaborador para mini-tabela
                          const colabPend = {}
                          info.rows.filter(isPendente).forEach(r => {
                            const nome = r.colaborador_nome || r.empresa_nome
                            if (!colabPend[nome]) colabPend[nome] = Array(12).fill(null)
                            colabPend[nome][r.mes - 1] = Number(r.meta_faturamento) || 0
                          })
                          const colabNomes = Object.keys(colabPend)

                          return (
                            <div key={tipo.key} className={`${cl.bg}`}>
                              {/* Linha do tipo */}
                              <div className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none"
                                   onClick={() => togTipo(tipoKey)}>
                                <span className={`w-7 h-7 rounded-lg ${cl.hdr} flex items-center justify-center shrink-0`}>
                                  <Icon size={13} className="text-white" />
                                </span>
                                <span className={`font-semibold text-sm ${cl.text} flex-1`}>{tipo.label}</span>
                                {info.pendentes > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                                    {info.pendentes} pendente{info.pendentes !== 1 ? 's' : ''}
                                  </span>
                                )}
                                <span className={`text-xs font-semibold ${cl.text}`}>{fmtBRL(info.total)}</span>
                                <button
                                  onClick={e => { e.stopPropagation(); navigate(tipo.nav) }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors shrink-0">
                                  <ArrowRight size={11} /> Detalhes
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={e => { e.stopPropagation(); confirmarAprovacao(emp.id, emp.nome, tipo.key, info.pendentes, info.total) }}
                                    disabled={!!aprovandoEste || info.pendentes === 0}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 disabled:opacity-40 bg-green-600 hover:bg-green-700 text-white">
                                    <AprovandoSpinner chave={tipoKey} />
                                    Aprovar
                                  </button>
                                )}
                                {canEdit && (
                                  <button
                                    onClick={e => { e.stopPropagation(); confirmarNaoAprovacao(emp.id, emp.nome, tipo.key, info.pendentes, info.total) }}
                                    disabled={naoAprovando === tipoKey}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 bg-red-600 hover:bg-red-700 text-white disabled:opacity-40">
                                    {naoAprovando === tipoKey ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                                    Pendênciar
                                  </button>
                                )}
                                {tipoOpen ? <ChevronDown size={14} className={cl.text} /> : <ChevronRight size={14} className={cl.text} />}
                              </div>

                              {/* Mini-tabela de pendentes */}
                              {tipoOpen && (
                                <div className="px-5 pb-4">
                                  {colabNomes.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">Nenhum item pendente neste tipo.</p>
                                  ) : (
                                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                      <table className="text-xs border-separate border-spacing-0" style={{ minWidth: '1100px' }}>
                                        <thead>
                                          <tr className="bg-slate-50">
                                            <th className="px-3 py-2 text-left font-semibold text-slate-500 sticky left-0 bg-slate-50 border-b border-slate-200 whitespace-nowrap">Colaborador / Empresa</th>
                                            {MESES.map(m => <th key={m} className="px-2 py-2 text-center font-semibold text-slate-500 border-b border-slate-200 w-20">{m}</th>)}
                                            <th className="px-2 py-2 text-center font-semibold text-indigo-700 border-b border-slate-200 w-24 bg-indigo-50">Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {colabNomes.map(nome => {
                                            const vals = colabPend[nome]
                                            const tot = vals.reduce((s, v) => s + (v || 0), 0)
                                            return (
                                              <tr key={nome} className="border-b border-slate-100 hover:bg-amber-50/40">
                                                <td className="px-3 py-2 font-semibold text-slate-700 sticky left-0 bg-white whitespace-nowrap border-b border-slate-100">{nome}</td>
                                                {vals.map((v, i) => (
                                                  <td key={i} className="px-2 py-2 text-right whitespace-nowrap">
                                                    {v != null && v > 0
                                                      ? <span className="font-semibold text-amber-700">{fmtBRL(v)}</span>
                                                      : <span className="text-slate-200">—</span>
                                                    }
                                                  </td>
                                                ))}
                                                <td className="px-2 py-2 text-right font-bold text-indigo-700 bg-indigo-50 whitespace-nowrap">{fmtBRL(tot)}</td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA: NOVOS
        ════════════════════════════════════════════════════════════════== */}
        {!loading && abaAtiva === 'novos' && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 bg-white border border-slate-200 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={32} className="text-indigo-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">Aprovação — Veículos Novos</p>
            <p className="text-sm text-slate-400 text-center max-w-sm">
              Em breve os valores, metas e responsáveis pela aprovação desta área serão definidos.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA: USADOS
        ════════════════════════════════════════════════════════════════== */}
        {!loading && abaAtiva === 'usados' && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 bg-white border border-slate-200 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <RefreshCw size={32} className="text-indigo-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">Aprovação — Veículos Usados</p>
            <p className="text-sm text-slate-400 text-center max-w-sm">
              Em breve os valores, metas e responsáveis pela aprovação desta área serão definidos.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA: GERAL — VISÃO CONSOLIDADA
        ════════════════════════════════════════════════════════════════== */}
        {!loading && subAba === 'visao' && !['novos', 'usados'].includes(abaAtiva) && (
          <div className="space-y-4">
            {/* Legenda */}
            <div className="flex items-center gap-6 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Legenda:</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-amber-400" /> Pendente de aprovação
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-full bg-green-400" /> Aprovado
              </span>
              <span className="flex items-center gap-1.5 ml-auto text-slate-400">
                <Info size={12} /> Valores em R$ — clique na empresa para expandir
              </span>
            </div>

            {empresasResumoAba.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 bg-white border border-slate-200 rounded-xl">
                <BarChart3 size={40} className="text-slate-300" />
                <p className="text-slate-500 font-semibold">Nenhuma meta cadastrada para {filtroAno}.</p>
              </div>
            ) : (
              empresasResumoAba.map(emp => {
                const empOpen = expandedEmps.has(`geral-${emp.id}`)
                const totalEmp = Object.values(emp.tipos).reduce((s, t) => s + t.total, 0)
                const pendEmp  = Object.values(emp.tipos).reduce((s, t) => s + t.pendentes, 0)

                return (
                  <div key={emp.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Cabeçalho empresa */}
                    <div className="flex items-center justify-between px-5 py-3.5 bg-indigo-700 text-white cursor-pointer select-none"
                         onClick={() => togEmp(`geral-${emp.id}`)}>
                      <div className="flex items-center gap-3 flex-wrap">
                        <Building2 size={17} className="text-indigo-300 shrink-0" />
                        <span className="font-bold">{emp.nome}</span>
                        <span className="text-indigo-200 text-sm font-semibold">{fmtBRL(totalEmp)}</span>
                        {pendEmp > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-bold">
                            {pendEmp} pendente{pendEmp !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={e => { e.stopPropagation(); navigate('/metas/pos-vendas/total') }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold">
                          <Eye size={11} /> Ver Total
                        </button>
                        {empOpen ? <ChevronDown size={16} className="text-indigo-300" /> : <ChevronRight size={16} className="text-indigo-300" />}
                      </div>
                    </div>

                    {empOpen && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-separate border-spacing-0" style={{ minWidth: '1200px' }}>
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="px-4 py-2 text-left font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 w-44 sticky left-0 bg-slate-50 z-10">Tipo</th>
                              {MESES.map(m => <th key={m} className="px-1 py-2 text-center font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 w-20">{m}</th>)}
                              <th className="px-2 py-2 text-center font-semibold text-indigo-700 uppercase border-b border-slate-200 w-28 bg-indigo-50">Total Ano</th>
                              <th className="px-2 py-2 text-center font-semibold text-slate-500 uppercase border-b border-slate-200 w-24">Situação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tiposAba.map(tipo => {
                              const info = emp.tipos[tipo.key]
                              if (!info) return null
                              const Icon = tipo.icon
                              const cl = COLORS[tipo.color]
                              const mesVals = Array.from({ length: 12 }, (_, i) => info.meses[i + 1] || 0)
                              const tot = sumArr(mesVals)
                              const aprovado = info.pendentes === 0
                              return (
                                <tr key={tipo.key} className={`border-b border-slate-100 hover:brightness-95 ${cl.bg}`}>
                                  <td className={`px-4 py-2 sticky left-0 z-10 whitespace-nowrap border-b border-slate-100 ${cl.bg}`}>
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded ${cl.hdr} flex items-center justify-center shrink-0`}>
                                        <Icon size={11} className="text-white" />
                                      </span>
                                      <span className={`font-semibold ${cl.text}`}>{tipo.label}</span>
                                    </div>
                                  </td>
                                  {mesVals.map((v, i) => (
                                    <td key={i} className={`px-1 py-2 text-right whitespace-nowrap font-mono ${info.meses[i+1] ? (info.pendentes > 0 ? 'text-amber-700 font-semibold' : 'text-slate-600') : 'text-slate-200'}`}>
                                      {v > 0 ? fmtBRL(v) : '—'}
                                    </td>
                                  ))}
                                  <td className={`px-2 py-2 text-right font-bold whitespace-nowrap ${cl.text} bg-white/60`}>{tot > 0 ? fmtBRL(tot) : '—'}</td>
                                  <td className="px-2 py-2 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {aprovado
                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold"><CheckCircle2 size={9}/> Aprovado</span>
                                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold"><AlertTriangle size={9}/> {info.pendentes} pend.</span>
                                      }
                                      {canEdit && aprovado && (
                                        <button
                                          onClick={() => confirmarNaoAprovacao(emp.id, emp.nome, tipo.key, 0, info.total)}
                                          disabled={naoAprovando === `${emp.id}|${tipo.key}`}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold transition-colors disabled:opacity-40">
                                          {naoAprovando === `${emp.id}|${tipo.key}` ? <Loader2 size={8} className="animate-spin" /> : <Ban size={8}/>}
                                          Reverter
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                            {/* Linha total */}
                            <tr className="bg-indigo-50">
                              <td className="px-4 py-2 font-bold text-indigo-800 sticky left-0 bg-indigo-50 z-10 whitespace-nowrap">TOTAL EMPRESA</td>
                              {Array.from({ length: 12 }, (_, i) => {
                                const v = tiposAba.reduce((s, t) => s + (emp.tipos[t.key]?.meses[i+1] || 0), 0)
                                return <td key={i} className="px-1 py-2 text-right font-bold text-indigo-700 whitespace-nowrap">{v > 0 ? fmtBRL(v) : '—'}</td>
                              })}
                              <td className="px-2 py-2 text-right font-bold text-indigo-800 bg-indigo-100 whitespace-nowrap">{fmtBRL(totalEmp)}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Botão publicar também na visão geral */}
            {tudo_aprovado && (
              <div className="flex justify-end pt-2">
                <button onClick={() => setModalPublicar(true)} disabled={publicando}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow disabled:opacity-50">
                  {publicando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Publicar para Power BI
                </button>
              </div>
            )}
          </div>
        )}

      </div>{/* fim overflow */}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — CONFIRMAR NÃO APROVAÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      {modalNaoAprovar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Ban size={28} className="text-slate-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Pendênciar</h2>
              <p className="text-sm text-slate-500 mb-3">
                Os registros de <strong className="text-slate-800">{TIPOS.find(t => t.key === modalNaoAprovar.tipo)?.label}</strong> para a empresa abaixo retornarão ao estado <strong className="text-amber-700">pendente de aprovação</strong>.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 mb-3 text-left space-y-1">
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="font-bold text-slate-800">{modalNaoAprovar.empNome}</p>
                <p className="text-xs text-slate-500 mt-2">Ano</p>
                <p className="font-semibold text-slate-700">{filtroAno}</p>
              </div>
              <p className="text-xs text-slate-400">Os valores poderão ser corrigidos ou excluídos nas páginas originais de cadastro.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalNaoAprovar(null)}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleNaoAprovar}
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2">
                <Ban size={15} /> Pendênciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — CONFIRMAR APROVAÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      {modalConf && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-1">Confirmar Aprovação</h2>
              <p className="text-sm text-slate-500 mb-3">
                Você está aprovando{' '}
                <strong className="text-slate-800">{modalConf.count} {modalConf.count === 1 ? 'registro' : 'registros'}</strong>{' '}
                de <strong className="text-slate-800">{TIPOS.find(t => t.key === modalConf.tipo)?.label}</strong>
              </p>
              <div className="bg-slate-50 rounded-xl p-4 mb-3 text-left space-y-1">
                <p className="text-xs text-slate-500">Empresa</p>
                <p className="font-bold text-slate-800">{modalConf.empNome}</p>
                <p className="text-xs text-slate-500 mt-2">Valor total</p>
                <p className="font-bold text-indigo-700 text-lg">{fmtBRL(modalConf.totalR$)}</p>
                <p className="text-xs text-slate-400 mt-2">Ano: {filtroAno}</p>
              </div>
              <p className="text-xs text-slate-400">A data e hora da aprovação serão registradas automaticamente.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalConf(null)}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleAprovar}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2">
                <CheckCircle2 size={15} /> Aprovar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL — PUBLICAR PARA POWER BI
      ══════════════════════════════════════════════════════════════════════ */}
      {modalPublicar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <Send size={22} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Publicar Metas para Power BI</h2>
                  <p className="text-xs text-slate-400">Ano {filtroAno} — {kpi.totalAprovados} registros aprovados</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 space-y-2">
                <p className="text-sm font-semibold text-blue-800">O que será publicado:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  {TIPOS.map(t => {
                    const tot = resumo[t.key].filter(r => r.meta_aprovada != null).length
                    return tot > 0 ? <li key={t.key}>{t.label}: {tot} registros</li> : null
                  })}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-amber-700">
                  <strong>Tabela de destino:</strong> <code>fato_metas_publicadas</code><br/>
                  Os dados serão gravados com upsert — registros existentes do mesmo período serão atualizados.
                  Esta tabela deve existir no Supabase com os campos: <code>empresa_id, ano, mes, tipo, colaborador_id, meta_faturamento, meta_pecas, meta_servicos, publicado_em</code>.
                </p>
              </div>

              {ultimaPublicacao && (
                <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                  <Clock size={11} /> Última publicação: {fmtDate(ultimaPublicacao)}
                </p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalPublicar(false)}
                className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handlePublicar}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-2">
                <Send size={15} /> Publicar agora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
