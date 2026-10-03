import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'

import { ClipboardCheck, AlertTriangle, CheckCircle2, Loader2, Package, Wrench, TrendingUp, BarChart3, Cog, XCircle, Ban } from 'lucide-react'
import { apiService } from '../services/api'
import MetasPosVendaTotal from './MetasPosVendaTotal'
import { EmpresaMultiFilter, empresasDasMetas } from '../components/EmpresaMultiFilter'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)

const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const TIPOS = [
  { key: 'pecas',     grupo: 'pecas',    contabilizaTotal: true,  label: 'Peças',              labelCurto: 'Peças',     icon: Package,    color: 'blue',   nav: '/metas/pos-vendas/pecas' },
  { key: 'consultor', grupo: 'servicos', contabilizaTotal: true,  label: 'Serviços', labelCurto: 'Consultor', icon: Cog,        color: 'violet', nav: '/metas/pos-vendas/distribuicao-consultores' },
  { key: 'mecanico',  grupo: 'servicos', contabilizaTotal: false, label: 'Serviços Mecânico',  labelCurto: 'Mecânico',  icon: Wrench,     color: 'indigo', nav: '/metas/pos-vendas/servicos_pecas/mecanico' },
]


function isPendente(r) {
  const cur = Number(r.meta_faturamento) || 0
  if (cur === 0) return false
  if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
  return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
}


export default function MetasGestaoAprovacao() {

  const [filtroAno, setFiltroAno] = useSessionState('mga_ano', anoAtual)
  // Mesma seleção de empresas das demais telas de Metas.
  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('mpvs_servicos_empresas', [])
  const [empresasLista, setEmpresasLista] = useState([])
  useEffect(() => {
    apiService.getEmpresas()
      .then(emps => setEmpresasLista([...empresasDasMetas(emps)].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || ''))))
      .catch(() => {})
  }, [])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  // Dados pendentes (para fila de aprovação)
  const [pending, setPending] = useState({ pecas: [], mecanico: [], consultor: [] })
  // Dados completos (para visão geral)
  const [resumo,  setResumo]  = useState({ pecas: [], mecanico: [], consultor: [] })
  // Última publicação
  const [ultimaPublicacao, setUltimaPublicacao] = useState(null)

  const [, setAprovando]      = useState(null) // 'empId|tipo'
  const [, setNaoAprovando]   = useState(null) // 'empId|tipo'
  const [modalNaoAprovar, setModalNaoAprovar] = useState(null)
  const [modalConf,    setModalConf]    = useState(null)

  const [abaSalva,      setAbaAtiva]      = useSessionState('mga_aba', 'posvendas')
  // Aba salva que não existe mais (Novos / Usados foram unificadas em Vendas) volta para Pós-Vendas.
  const abaAtiva = ['posvendas', 'vendas', 'geral'].includes(abaSalva) ? abaSalva : 'posvendas'


  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [pendPecas, pendMec, pendCons, res, ultPub] = await Promise.all([
        apiService.getPendingApprovals(),
        apiService.getPendingApprovalsMecanico(),
        apiService.getPendingApprovalsConsultor(),
        apiService.getResumoMetasAprovacao(filtroAno),
        apiService.getUltimaPublicacao(filtroAno),
      ])
      setPending({ pecas: pendPecas, mecanico: pendMec, consultor: pendCons })
      setResumo(res)
      setUltimaPublicacao(ultPub)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [filtroAno])

  useEffect(() => { load() }, [load])


  // ── KPIs ──────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const allPend = [...pending.pecas, ...pending.mecanico, ...pending.consultor, ]
    const allRes  = [...resumo.pecas,  ...resumo.mecanico,  ...resumo.consultor,  ]
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








  const handleAprovar = async () => {
    if (!modalConf) return
    const { empId, tipo } = modalConf
    const chave = `${empId}|${tipo}`
    setAprovando(chave); setModalConf(null)
    try {
      if (tipo === 'pecas')     await apiService.approveMetasPecasEmpresa(empId, filtroAno)
      if (tipo === 'mecanico')  await apiService.approveMetasMecanicoEmpresa(empId, filtroAno)
      if (tipo === 'consultor') {
        // Mecânico, Funilaria e Terceiros estão vinculados ao consultor (o valor do
        // consultor é a mesma meta de Oficina redistribuída entre eles): aprovar o
        // consultor aprova os três juntos.
        await apiService.approveMetasConsultorEmpresa(empId, filtroAno)
        await apiService.approveMetasMecanicoEmpresa(empId, filtroAno)
        await apiService.approveMetasFunilariaEmpresa(empId, filtroAno)
        await apiService.approveMetasTerceirosEmpresa(empId, filtroAno)
      }
      await load()
    } catch (err) { setError(err.message || String(err)) }
    finally { setAprovando(null) }
  }


  const handleNaoAprovar = async () => {
    if (!modalNaoAprovar) return
    const { empId, tipo } = modalNaoAprovar
    const chave = `${empId}|${tipo}`
    setNaoAprovando(chave); setModalNaoAprovar(null)
    try {
      if (tipo === 'pecas')     await apiService.unapproveMetasPecasEmpresa(empId, filtroAno)
      if (tipo === 'mecanico')  await apiService.unapproveMetasMecanicoEmpresa(empId, filtroAno)
      if (tipo === 'consultor') {
        await apiService.unapproveMetasConsultorEmpresa(empId, filtroAno)
        await apiService.unapproveMetasMecanicoEmpresa(empId, filtroAno)
        await apiService.unapproveMetasFunilariaEmpresa(empId, filtroAno)
        await apiService.unapproveMetasTerceirosEmpresa(empId, filtroAno)
      }
      await load()
    } catch (err) { setError(err.message || String(err)) }
    finally { setNaoAprovando(null) }
  }


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
              <h1 className="text-xl font-bold text-slate-800">Total Grupo — Gestão de Aprovação de Metas</h1>
              <p className="text-xs text-slate-400">Revise e autorize o planejamento antes da publicação para o Power BI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-64"><EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresasLista} /></div>
            <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-5 space-y-5">

        {/* Banner: tudo aprovado (cada Aprovar já publica pra fato_metas_publicadas na hora) */}
        {tudo_aprovado && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-300 rounded-xl px-5 py-4">
            <CheckCircle2 size={22} className="text-green-600 shrink-0" />
            <div>
              <p className="font-bold text-green-800">Todas as metas foram aprovadas e publicadas!</p>
              <p className="text-xs text-green-600">
                {ultimaPublicacao ? `Última publicação: ${fmtDate(ultimaPublicacao)}` : 'Nenhuma publicação registrada para este ano.'}
              </p>
            </div>
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
            { key: 'posvendas', label: 'Pós-Vendas', icon: Wrench,   badge: [...resumo.pecas, ...resumo.mecanico, ...resumo.consultor].filter(r => !filtroEmpresa.length || filtroEmpresa.includes(r.empresa_id)).filter(isPendente).length },
            { key: 'vendas',   label: 'Vendas',   icon: TrendingUp, badge: 0 },
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

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-2 text-slate-400"><Loader2 size={20} className="animate-spin" /> Carregando...</div>
          </div>
        )}

        {/* FILA DE APROVAÇÃO: mesma árvore das telas de Serviços (Grupo > Segmento/Marca > Empresa > Departamento
            > Setor > Box > Funcionário), com o status ao lado do setor e a coluna final de aprovação. */}
        {abaAtiva === 'posvendas' && (
          <MetasPosVendaTotal modoAprovacao anoExterno={filtroAno} empresasExterno={filtroEmpresa} aoAlterarAprovacao={load} />
        )}

        {/* GERAL: consolidado do grupo, só leitura e só com o que já foi aprovado. */}
        {abaAtiva === 'geral' && (
          <MetasPosVendaTotal key={`${filtroAno}|${ultimaPublicacao}|${kpi.totalPendItems}`} somenteAprovado anoExterno={filtroAno} empresasExterno={filtroEmpresa} />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            ABA: VENDAS (Novos + Usados)
        ════════════════════════════════════════════════════════════════== */}
        {!loading && abaAtiva === 'vendas' && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 bg-white border border-slate-200 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={32} className="text-indigo-300" />
            </div>
            <p className="text-lg font-bold text-slate-600">Aprovação — Vendas</p>
            <p className="text-sm text-slate-400 text-center max-w-sm">
              Em breve os valores, metas e responsáveis pela aprovação desta área (Novos e Usados) serão definidos.
            </p>
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

    </div>
  )
}
