import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, RefreshCw, Loader2, Eye, X, ArrowUp, ArrowDown, Receipt, XCircle, Link2, Link2Off, AlertTriangle, Edit2, Info, BarChart2,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import GarantiasNav from './GarantiasNav'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (s) => { if (!s) return '—'; try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }
const parseNFServico = (v) => {
  const parts = String(v || '').split('/').map(s => s.trim()).filter(Boolean)
  return parts.length >= 2 ? { rps: parts[0], nfse: parts[1] } : { rps: parts[0] || '—', nfse: parts[0] || '—' }
}

export default function GarantiasDafTitulos() {
  const { isAdmin, empresasPermitidas, user, hasActionOrDefault, hasPermission } = useAuth()
  const canEditarTitulo = hasActionOrDefault('garantias-daf-titulos', 'editar')
  const location = useLocation()
  const navigate = useNavigate()

  const [titulosRows, setTitulosRows]               = useState([])
  const [titulosLoading, setTitulosLoading]         = useState(false)
  const [titulosRefreshing, setTitulosRefreshing]   = useState(false)
  const [titulosLastMod, setTitulosLastMod]         = useState(null)
  const [titulosBusca, setTitulosBusca]             = useState(() => location.state?.osNumero || '')
  const [titulosEmpresa, setTitulosEmpresa]         = useState('')
  const [tiposCadastrados, setTiposCadastrados]     = useState([])
  const [obsModal, setObsModal]                     = useState(null)
  const [filtroEnvio, setFiltroEnvio]               = useState('todos')
  const [filtroVinculo, setFiltroVinculo]           = useState('todos')
  const [filtroSituacaoVencimento, setFiltroSituacaoVencimento] = useState(null) // null | 'vencido' | 'a_vencer'
  const [dataInicio, setDataInicio]                 = useState('')
  const [dataFim, setDataFim]                       = useState('')
  const [garantias, setGarantias]                   = useState([])
  const [filtrosAbertos, setFiltrosAbertos]         = useState(false)
  const [titulosObs, setTitulosObs]                 = useState(new Map()) // nro_titulo → observação editável
  const [salvandoObs, setSalvandoObs]               = useState(false)

  const loadTitulos = useCallback(async (force = false) => {
    if (force) setTitulosRefreshing(true); else setTitulosLoading(true)
    try {
      const [spRes, tiposData] = await Promise.all([
        fetch(
          force ? `${BACKEND_URL}/api/garantias/financeiro/titulos/refresh` : `${BACKEND_URL}/api/garantias/financeiro/titulos`,
          force ? { method: 'POST' } : undefined
        ),
        apiService.getTipoTituloGarantia(),
      ])
      const data = spRes.ok ? await spRes.json() : {}
      setTitulosRows(data.rows ?? [])
      setTitulosLastMod(data.lastModified ?? null)
      setTiposCadastrados(tiposData.filter(t => t.ativo).map(t => t.descricao.trim()))
    } catch {}
    finally { setTitulosLoading(false); setTitulosRefreshing(false) }
  }, [])

  const loadTitulosObs = useCallback(async () => {
    try {
      const rows = await apiService.getTitulosObservacoes()
      setTitulosObs(new Map(rows.map(r => [r.nro_titulo, r.observacao || ''])))
    } catch {}
  }, [])

  useEffect(() => {
    loadTitulos()
    loadTitulosObs()
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getGarantias({ ...filtrosEmpresa, status_in: ['E', 'F'] })
      .then(setGarantias)
      .catch(() => {})
  }, [isAdmin, empresasPermitidas])

  // Mapa OS||NF → data_envio_fabrica (vem das garantias do Supabase)
  const envioMap = useMemo(() => {
    const map = new Map()
    for (const os of garantias) {
      if (!os.numero_os) continue
      const osNum = String(os.numero_os).trim()
      const nfParts = String(os.numero_nf || '').split('/').map(s => s.trim()).filter(Boolean)
      const data = os.data_envio_fabrica || null
      for (const nf of nfParts) map.set(`${osNum}||${nf}`, data)
      if (!map.has(osNum)) map.set(osNum, data)
    }
    return map
  }, [garantias])

  const empresasTitulos = useMemo(
    () => [...new Set(titulosRows.map(r => r.empresa).filter(Boolean))].sort(),
    [titulosRows]
  )

  // OS presentes em Garantias DAF (Faturadas) — usado para saber se o título tem vínculo
  const garantiasOsSet = useMemo(
    () => new Set(garantias.map(g => String(g.numero_os ?? '').trim()).filter(Boolean)),
    [garantias]
  )

  // Mapa OS → id da garantia — usado para navegar até a OS vinculada
  const garantiaIdByOS = useMemo(() => {
    const m = new Map()
    for (const g of garantias) {
      const osNum = String(g.numero_os ?? '').trim()
      if (osNum) m.set(osNum, g.id)
    }
    return m
  }, [garantias])

  // Reconciliação: títulos com observação salva que ganharam vínculo com uma OS (ex: título estava
  // desvinculado quando a observação foi gravada, e depois passou a aparecer vinculado) — propaga
  // o número do título + a observação para a OS Faturada automaticamente ao carregar a tela.
  useEffect(() => {
    if (titulosRows.length === 0 || garantias.length === 0 || titulosObs.size === 0) return
    const garantiaById = new Map(garantias.map(g => [g.id, g]))
    for (const [nroTitulo, observacao] of titulosObs.entries()) {
      const tituloRow = titulosRows.find(r => r.nro_titulo === nroTitulo)
      if (!tituloRow) continue
      const osKey = String(tituloRow.os_numero ?? '').trim()
      const garantiaId = garantiaIdByOS.get(osKey)
      if (!garantiaId) continue
      const g = garantiaById.get(garantiaId)
      if (!g || (g.numero_titulo === nroTitulo && (g.titulo_observacao || '') === observacao)) continue
      apiService.updateGarantia(garantiaId, { numero_titulo: nroTitulo, titulo_observacao: observacao }, user?.email, g.status_codigo).catch(() => {})
    }
  }, [titulosRows, garantias, titulosObs, garantiaIdByOS, user])

  const temEnvioTitulo = useCallback((r) => {
    const osKey    = String(r.os_numero   || '').trim()
    const danfeKey = String(r.nota_fiscal || '').trim()
    return !!(envioMap.get(`${osKey}||${danfeKey}`) ?? envioMap.get(osKey) ?? null)
  }, [envioMap])

  const diasDesdeEmissao = (r) => {
    if (!r.data_emissao) return null
    return Math.floor((new Date() - new Date(r.data_emissao + 'T12:00:00')) / 86400000)
  }

  // Crítico: NF sem envio à fábrica e emitida há 4 dias ou mais (com base na data de Emissão).
  const ehCritico = (r) => !temEnvioTitulo(r) && (diasDesdeEmissao(r) ?? -1) >= 4
  // Vencido / A Vencer: apenas pela coluna Atr. (atraso em relação ao vencimento) — independe de
  // vínculo (OS identificada) ou envio à fábrica.
  const ehVencido = (r) => r.atraso !== null && r.atraso !== undefined && r.atraso > 0
  const ehAVencer = (r) => r.atraso !== null && r.atraso !== undefined && r.atraso <= 0

  // Aplica somente os filtros de base (tipo cadastrado, empresa, período, busca) — usado para os
  // cards Vencidos/A Vencer, que devem refletir apenas a data de vencimento, independente dos
  // filtros de envio/vínculo.
  const aplicarFiltrosBase = useCallback((rows) => {
    let out = rows
    if (tiposCadastrados.length > 0)
      out = out.filter(r => tiposCadastrados.includes(String(r.tipo_titulo ?? '').trim()))
    if (titulosEmpresa) out = out.filter(r => r.empresa === titulosEmpresa)
    if (dataInicio) out = out.filter(r => r.data_emissao && r.data_emissao >= dataInicio)
    if (dataFim) out = out.filter(r => r.data_emissao && r.data_emissao <= dataFim)
    const q = titulosBusca.trim().toLowerCase()
    if (!q) return out
    return out.filter(r =>
      String(r.nro_titulo).toLowerCase().includes(q) ||
      String(r.cliente_fornecedor).toLowerCase().includes(q) ||
      String(r.os_numero).toLowerCase().includes(q) ||
      String(r.nota_fiscal).toLowerCase().includes(q) ||
      String(r.nota_fiscal_servico).toLowerCase().includes(q)
    )
  }, [tiposCadastrados, titulosEmpresa, dataInicio, dataFim, titulosBusca])

  // Aplica os filtros de base e, opcionalmente, os filtros de envio/vínculo/situação de vencimento —
  // usado para que os alertas reflitam os demais filtros ativos sem se auto-filtrar pela própria
  // situação que eles representam.
  const aplicarFiltrosComuns = useCallback((rows, { pularEnvio, pularVinculo, pularSituacaoVencimento } = {}) => {
    let out = aplicarFiltrosBase(rows)
    if (!pularEnvio && filtroEnvio !== 'todos') {
      out = out.filter(r => {
        const temEnvio = temEnvioTitulo(r)
        if (filtroEnvio === 'enviados') return temEnvio
        if (filtroEnvio === 'critico') return ehCritico(r)
        return !temEnvio
      })
    }
    if (!pularVinculo && filtroVinculo !== 'todos') {
      out = out.filter(r => {
        const vinculado = garantiasOsSet.has(String(r.os_numero ?? '').trim())
        return filtroVinculo === 'vinculados' ? vinculado : !vinculado
      })
    }
    if (!pularSituacaoVencimento && filtroSituacaoVencimento) {
      out = out.filter(filtroSituacaoVencimento === 'vencido' ? ehVencido : ehAVencer)
    }
    return out
  }, [aplicarFiltrosBase, filtroEnvio, temEnvioTitulo, filtroVinculo, garantiasOsSet, filtroSituacaoVencimento])

  // Base do alerta de NF crítica: reflete empresa/período/busca/vínculo/situação de vencimento ativos, mas não o próprio filtro de envio.
  const baseAlertaEnvio = useMemo(
    () => aplicarFiltrosComuns(titulosRows, { pularEnvio: true }),
    [titulosRows, aplicarFiltrosComuns]
  )
  const grpNfCritica = useMemo(
    () => baseAlertaEnvio.filter(ehCritico),
    [baseAlertaEnvio, temEnvioTitulo]
  )

  // Base do alerta de não vinculado: reflete empresa/período/busca/envio/situação de vencimento ativos, mas não o próprio filtro de vínculo.
  const baseAlertaVinculo = useMemo(
    () => aplicarFiltrosComuns(titulosRows, { pularVinculo: true }),
    [titulosRows, aplicarFiltrosComuns]
  )
  // Títulos cuja OS ainda não está vinculada (cadastrada) em Garantias DAF Faturadas
  const grpNaoVinculado = useMemo(
    () => baseAlertaVinculo.filter(r => !garantiasOsSet.has(String(r.os_numero ?? '').trim())),
    [baseAlertaVinculo, garantiasOsSet]
  )

  // Base dos cards Vencidos/A Vencer: só os filtros de base (tipo/empresa/período/busca) — não
  // considera envio/vínculo, conforme pedido: a classificação é só pela data de vencimento.
  const baseVencimento = useMemo(
    () => aplicarFiltrosBase(titulosRows),
    [titulosRows, aplicarFiltrosBase]
  )
  const grpVencidos = useMemo(() => baseVencimento.filter(ehVencido), [baseVencimento])
  const grpAVencer = useMemo(() => baseVencimento.filter(ehAVencer), [baseVencimento])

  const titulosFiltrados = useMemo(
    () => aplicarFiltrosComuns(titulosRows),
    [titulosRows, aplicarFiltrosComuns]
  )

  // Indica se algum filtro que afeta os alertas (empresa/período/busca) está ativo — usado para
  // avisar que os números dos alertas já refletem esse recorte, e não a base total.
  const filtrosComunsAtivos = !!(titulosEmpresa || dataInicio || dataFim || titulosBusca.trim())
  // Indica se há QUALQUER filtro ativo no painel (comuns + envio + vínculo + situação de vencimento) —
  // usado para só mostrar o botão "Limpar todos os filtros" quando existir algo para limpar.
  const algumFiltroAtivo = filtrosComunsAtivos || filtroEnvio !== 'todos' || filtroVinculo !== 'todos' || !!filtroSituacaoVencimento

  const totalValor = useMemo(() => titulosFiltrados.reduce((s, r) => s + (r.valor || 0), 0), [titulosFiltrados])
  const totalSaldo = useMemo(() => titulosFiltrados.reduce((s, r) => s + (r.saldo || 0), 0), [titulosFiltrados])

  const valorGrpNfCritica = useMemo(() => grpNfCritica.reduce((s, r) => s + (r.valor || 0), 0), [grpNfCritica])
  const valorGrpNaoVinculado = useMemo(() => grpNaoVinculado.reduce((s, r) => s + (r.valor || 0), 0), [grpNaoVinculado])
  const valorGrpVencidos = useMemo(() => grpVencidos.reduce((s, r) => s + (r.valor || 0), 0), [grpVencidos])
  const valorGrpAVencer = useMemo(() => grpAVencer.reduce((s, r) => s + (r.valor || 0), 0), [grpAVencer])

  const toggleFiltroCritico = () => setFiltroEnvio(prev => prev === 'critico' ? 'todos' : 'critico')
  const toggleFiltroNaoVinculado = () => setFiltroVinculo(prev => prev === 'nao_vinculados' ? 'todos' : 'nao_vinculados')
  const toggleFiltroVencido = () => setFiltroSituacaoVencimento(prev => prev === 'vencido' ? null : 'vencido')
  const toggleFiltroAVencer = () => setFiltroSituacaoVencimento(prev => prev === 'a_vencer' ? null : 'a_vencer')

  // Algum dos cards de alerta está selecionado como filtro — o card Resumo Geral limpa todos.
  const algumCardFiltroAtivo = filtroEnvio === 'critico' || filtroVinculo === 'nao_vinculados' || !!filtroSituacaoVencimento
  const limparFiltrosCards = () => { setFiltroEnvio('todos'); setFiltroVinculo('todos'); setFiltroSituacaoVencimento(null) }

  // Limpa todos os filtros do painel Filtros avançados (empresa, período, busca, envio, vínculo e situação de vencimento).
  const limparTodosFiltros = () => {
    setTitulosEmpresa('')
    setDataInicio('')
    setDataFim('')
    setTitulosBusca('')
    setFiltroEnvio('todos')
    setFiltroVinculo('todos')
    setFiltroSituacaoVencimento(null)
  }

  // ── Edição de observação do título (gar_titulos_observacoes) ──────────
  const [modalEditarTitulo, setModalEditarTitulo] = useState(null) // linha do título sendo editado
  const [textoEdicaoObs, setTextoEdicaoObs]        = useState('')

  const abrirEdicaoTitulo = (row) => {
    setModalEditarTitulo(row)
    setTextoEdicaoObs(titulosObs.get(row.nro_titulo) || '')
  }

  const salvarObservacaoTitulo = async () => {
    if (!modalEditarTitulo) return
    setSalvandoObs(true)
    try {
      const nroTitulo = modalEditarTitulo.nro_titulo
      await apiService.upsertTituloObservacao(nroTitulo, textoEdicaoObs, user?.email)
      setTitulosObs(prev => new Map(prev).set(nroTitulo, textoEdicaoObs))

      // Se o título já tem OS vinculada, propaga nº do título + observação para a OS Faturada.
      const osKey = String(modalEditarTitulo.os_numero ?? '').trim()
      const garantiaId = garantiaIdByOS.get(osKey)
      if (garantiaId) {
        const g = garantias.find(x => x.id === garantiaId)
        await apiService.updateGarantia(
          garantiaId,
          { numero_titulo: nroTitulo, titulo_observacao: textoEdicaoObs },
          user?.email,
          g?.status_codigo
        )
      }
      setModalEditarTitulo(null)
    } catch (err) {
      alert('Erro ao salvar observação do título: ' + (err.message || String(err)))
    } finally {
      setSalvandoObs(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="h-5 w-5 text-indigo-500" />
            Garantias DAF Faturadas
            <span className="relative group cursor-help">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span className="absolute top-full left-0 mt-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal">
                Fonte: RFN003_PosicaoAnaliticoReceber_Excel.xls
              </span>
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Títulos financeiros a receber vinculados às OS faturadas.
          </p>
          <div className="mt-3"><GarantiasNav /></div>
        </div>
        <div className="flex items-center gap-3">
          {titulosLastMod && (
            <span className="text-[10px] text-slate-400">
              Modificado em <strong className="text-slate-500">{new Date(titulosLastMod).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
            </span>
          )}
          <button
            onClick={() => loadTitulos(true)}
            disabled={titulosRefreshing || titulosLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${titulosRefreshing ? 'animate-spin' : ''}`} />
            Atualizar arquivo
          </button>
          {hasPermission('garantias-daf-faturadas') && (
            <button
              onClick={() => navigate('/garantias-daf-faturadas')}
              title="Ver OS faturadas (Status E)"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Receipt className="h-3.5 w-3.5 text-indigo-500" />
              Faturadas
            </button>
          )}
          {hasPermission('bi/garantias-daf') && (
            <button
              onClick={() => navigate('/bi/garantias-daf', { state: { aba: 'titulos' } })}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
              <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
              Ir para Dashboard
            </button>
          )}
        </div>
      </div>

      {/* ── FILTROS AVANÇADOS ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="w-full flex items-center justify-between px-4 py-3 gap-3">
          <button
            onClick={() => setFiltrosAbertos(p => !p)}
            className="flex-1 flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors min-w-0"
          >
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            Filtros avançados
            {titulosEmpresa && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{titulosEmpresa}</span>}
            {titulosBusca && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">"{titulosBusca}"</span>}
            <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
          </button>
          {algumFiltroAtivo && (
            <button
              type="button"
              onClick={limparTodosFiltros}
              className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
            >
              <XCircle className="h-3 w-3" /> Limpar todos os filtros
            </button>
          )}
        </div>
        {filtrosAbertos && (
        <div className="flex items-center gap-3 flex-wrap px-4 pb-4 pt-1 border-t border-slate-100">
        <select
          value={titulosEmpresa}
          onChange={e => setTitulosEmpresa(e.target.value)}
          className="py-1.5 pl-2 pr-7 text-xs border border-slate-200 rounded-md text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none shrink-0 max-w-[260px]"
        >
          <option value="">Todas as empresas</option>
          {empresasTitulos.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <div className="flex items-center gap-1.5 shrink-0">
          <input
            type="date"
            value={dataInicio}
            onChange={e => setDataInicio(e.target.value)}
            title="Emissão de"
            className="py-1.5 px-2 text-xs border border-slate-200 rounded-md text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
          <span className="text-slate-400 text-xs">até</span>
          <input
            type="date"
            value={dataFim}
            onChange={e => setDataFim(e.target.value)}
            title="Emissão até"
            className="py-1.5 px-2 text-xs border border-slate-200 rounded-md text-slate-600 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
          {(dataInicio || dataFim) && (
            <button
              onClick={() => { setDataInicio(''); setDataFim('') }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              title="Limpar período"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, cliente, OS, nota fiscal..."
            value={titulosBusca}
            onChange={e => setTitulosBusca(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
          {titulosBusca && (
            <button
              onClick={() => setTitulosBusca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Limpar busca"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button"
            onClick={() => setFiltroEnvio('todos')}
            className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroEnvio === 'todos' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >Todos</button>
          <button type="button"
            onClick={() => setFiltroEnvio('enviados')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroEnvio === 'enviados' ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
          ><ArrowUp className="h-3 w-3" /> Enviados</button>
          <button type="button"
            onClick={() => setFiltroEnvio('nao_enviados')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroEnvio === 'nao_enviados' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
          ><ArrowDown className="h-3 w-3" /> Não enviados</button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button"
            onClick={() => setFiltroVinculo('todos')}
            className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroVinculo === 'todos' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >Todos</button>
          <button type="button"
            onClick={() => setFiltroVinculo('vinculados')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroVinculo === 'vinculados' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
          ><Link2 className="h-3 w-3" /> Vinculados</button>
          <button type="button"
            onClick={() => setFiltroVinculo('nao_vinculados')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroVinculo === 'nao_vinculados' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
          ><Link2Off className="h-3 w-3" /> Não vinculados</button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button type="button"
            onClick={() => setFiltroSituacaoVencimento(null)}
            className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${!filtroSituacaoVencimento ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >Todos</button>
          <button type="button"
            onClick={toggleFiltroAVencer}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroSituacaoVencimento === 'a_vencer' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
          ><Eye className="h-3 w-3" /> A Vencer</button>
          <button type="button"
            onClick={toggleFiltroVencido}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroSituacaoVencimento === 'vencido' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'}`}
          ><AlertTriangle className="h-3 w-3" /> Vencidos</button>
        </div>
        </div>
        )}
      </div>

      {/* ── ALERTAS (lado a lado, clicáveis para filtrar) ── */}
      {(grpNaoVinculado.length > 0 || grpNfCritica.length > 0) && (
        <div className="flex flex-col md:flex-row gap-3">
          {grpNaoVinculado.length > 0 && (
            <button
              type="button"
              onClick={toggleFiltroNaoVinculado}
              className={`flex-1 flex items-center gap-3 bg-orange-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-orange-100 ${filtroVinculo === 'nao_vinculados' ? 'border-orange-500 ring-2 ring-offset-1 ring-orange-300' : 'border-orange-300'}`}
            >
              <Link2Off className="h-4 w-4 text-orange-600 shrink-0" />
              <p className="text-xs text-orange-700 font-semibold flex-1">
                {grpNaoVinculado.length} título(s) · Não identificado O.S. Faturadas
                <span className="text-orange-500 font-normal"> — {fmtMoeda(valorGrpNaoVinculado)}</span>
                {filtrosComunsAtivos && <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-bold">filtrado</span>}
              </p>
            </button>
          )}

          {grpNfCritica.length > 0 && (
            <button
              type="button"
              onClick={toggleFiltroCritico}
              className={`flex-1 flex items-center gap-3 bg-red-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-red-100 ${filtroEnvio === 'critico' ? 'border-red-500 ring-2 ring-offset-1 ring-red-300' : 'border-red-300'}`}
            >
              <ArrowDown className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 font-semibold flex-1">
                {grpNfCritica.length} título(s) · NF sem envio à fábrica (Emissão ≥ 4 dias)
                <span className="text-red-500 font-normal"> — {fmtMoeda(valorGrpNfCritica)}</span>
                {filtrosComunsAtivos && <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">filtrado</span>}
              </p>
            </button>
          )}
        </div>
      )}

      {/* ── CARDS: A VENCER + VENCIDOS + RESUMO GERAL ── */}
      <div className="grid grid-cols-3 gap-3">
        {grpAVencer.length > 0 && (
          <button
            type="button"
            onClick={toggleFiltroAVencer}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroSituacaoVencimento === 'a_vencer' ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-emerald-100"><Eye className="h-3.5 w-3.5 text-emerald-600" /></div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">A Vencer</p>
              </div>
              {filtrosComunsAtivos && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold">filtrado</span>}
            </div>
            <p className="text-2xl font-bold text-emerald-700 leading-none">{grpAVencer.length}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5 mb-2">título(s) · pela data de vencimento</p>
            <p className="text-sm font-bold text-emerald-800 pt-2 border-t border-emerald-200">{fmtMoeda(valorGrpAVencer)}</p>
          </button>
        )}

        {grpVencidos.length > 0 && (
          <button
            type="button"
            onClick={toggleFiltroVencido}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-slate-100 border-slate-300 ${filtroSituacaoVencimento === 'vencido' ? 'ring-2 ring-offset-1 ring-slate-400 shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-slate-200"><AlertTriangle className="h-3.5 w-3.5 text-slate-700" /></div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Vencidos</p>
              </div>
              {filtrosComunsAtivos && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-bold">filtrado</span>}
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{grpVencidos.length}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 mb-2">título(s) · pela data de vencimento</p>
            <p className="text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">{fmtMoeda(valorGrpVencidos)}</p>
          </button>
        )}

        {/* CARD RESUMO GERAL — clica para limpar o filtro de card ativo (NF crítica / não vinculado / vencimento) */}
        <button
          type="button"
          onClick={limparFiltrosCards}
          title={algumCardFiltroAtivo ? 'Limpar filtro do card selecionado' : undefined}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all bg-indigo-50 border-indigo-200 ${algumCardFiltroAtivo ? 'hover:shadow-md hover:bg-indigo-100 cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-indigo-100"><Receipt className="h-3.5 w-3.5 text-indigo-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Resumo Geral</p>
            </div>
            {algumCardFiltroAtivo && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold">
                <X className="h-2.5 w-2.5" /> limpar
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Títulos</p>
              <p className="text-sm font-bold text-indigo-900">{titulosFiltrados.length}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Valor</p>
              <p className="text-sm font-bold text-indigo-900">{fmtMoeda(totalValor)}</p>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-indigo-200">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Saldo</p>
              <p className="text-sm font-bold text-indigo-900">{fmtMoeda(totalSaldo)}</p>
            </div>
          </div>
        </button>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto custom-scrollbar-light" style={{ maxHeight: '560px' }}>
        {titulosLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="text-xs">Carregando arquivo do SharePoint...</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '2600px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 w-10 text-center">Editar</th>
                <th className="p-3 w-44">Empresa</th>
                <th className="p-3 w-28">Data Envio</th>
                <th className="p-3 w-28">Nro Título</th>
                <th className="p-3 w-24">Lanç.</th>
                <th className="p-3 w-24">Emiss.</th>
                <th className="p-3 w-24">Vencto.</th>
                <th className="p-3 w-16 text-right">Atr.</th>
                <th className="p-3 w-24">O.S</th>
                <th className="p-3 w-28">RPS</th>
                <th className="p-3 w-28">NFSe</th>
                <th className="p-3 w-28">DANFE</th>
                <th className="p-3 w-32">Cód. Cliente</th>
                <th className="p-3 w-64">Cliente/Fornecedor</th>
                <th className="p-3 w-36">Tipo de Título</th>
                <th className="p-3 w-44">Conta Gerencial</th>
                <th className="p-3 w-48">Agente Cobrador</th>
                <th className="p-3 w-28 text-right">Valor</th>
                <th className="p-3 w-28 text-right">Saldo</th>
                <th className="p-3 w-16 text-center">Obs.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {titulosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="20" className="p-10 text-center text-slate-400">
                    {titulosRows.length === 0 ? 'Nenhum dado carregado.' : 'Nenhum título encontrado para os filtros aplicados.'}
                  </td>
                </tr>
              ) : titulosFiltrados.map((r, i) => {
                const atrasado = r.atraso !== null && r.atraso > 0
                const { rps, nfse } = parseNFServico(r.nota_fiscal_servico)
                const osKey    = String(r.os_numero   || '').trim()
                const danfeKey = String(r.nota_fiscal || '').trim()
                const dataEnvio = envioMap.get(`${osKey}||${danfeKey}`) ?? envioMap.get(osKey) ?? null
                const garantiaId = garantiaIdByOS.get(osKey)
                const irParaOS = () => {
                  if (garantiaId) navigate(`/garantias-daf/${garantiaId}`, { state: { from: '/garantias-daf-titulos' } })
                  else alert(`A OS ${osKey || ''} deste título ainda não está cadastrada em Garantias DAF Faturadas.`)
                }
                return (
                  <tr key={i} className={`transition-colors hover:bg-slate-50/70 ${atrasado ? 'bg-red-50/30' : ''}`}>
                    <td className="p-3 text-center">
                      {canEditarTitulo && (
                        <button
                          onClick={() => abrirEdicaoTitulo(r)}
                          className={`p-1 rounded transition-colors hover:bg-indigo-50 ${titulosObs.get(r.nro_titulo) ? 'text-indigo-500 hover:text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`}
                          title={titulosObs.get(r.nro_titulo) ? 'Editar observação do título' : 'Adicionar observação ao título'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 truncate max-w-[160px]" title={r.empresa}>{r.empresa || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {dataEnvio
                        ? <span className="font-semibold text-slate-700">{fmtData(dataEnvio)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={irParaOS}
                          className={`shrink-0 p-0.5 rounded transition-colors ${dataEnvio ? 'hover:bg-slate-100' : 'bg-amber-100 hover:bg-amber-200'}`}
                          title={garantiaId
                            ? (dataEnvio ? 'Enviado para fábrica — clique para editar' : 'Sem data de envio — clique para informar a data de envio')
                            : 'OS não cadastrada em Garantias DAF — clique para detalhes'}
                        >
                          {dataEnvio
                            ? <ArrowUp className="h-3.5 w-3.5 text-green-500" />
                            : <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
                          }
                        </button>
                        <button
                          type="button"
                          onClick={irParaOS}
                          className={`shrink-0 p-0.5 rounded transition-colors ${garantiaId ? 'hover:bg-slate-100' : 'bg-orange-100 hover:bg-orange-200'}`}
                          title={garantiaId
                            ? 'Vinculado a OS em Garantias DAF Faturadas — clique para ver'
                            : 'Não identificado O.S. Faturadas — clique para detalhes'}
                        >
                          {garantiaId
                            ? <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                            : <Link2Off className="h-3.5 w-3.5 text-orange-600" />
                          }
                        </button>
                        <span className="font-mono font-bold text-slate-900">{r.nro_titulo || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{r.nro_lancamento || '—'}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{fmtData(r.data_emissao)}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={atrasado ? 'font-semibold text-red-600' : 'text-slate-500'}>{fmtData(r.data_vencimento)}</span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      {r.atraso !== null
                        ? <span className={`font-semibold ${atrasado ? 'text-red-600' : 'text-slate-500'}`}>{r.atraso}d</span>
                        : '—'}
                    </td>
                    <td className="p-3 font-mono text-slate-600">{r.os_numero || '—'}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">{rps}</td>
                    <td className="p-3 font-mono text-slate-600">{nfse}</td>
                    <td className="p-3 text-slate-500">{r.nota_fiscal || '—'}</td>
                    <td className="p-3 text-slate-500">{r.codigo_cliente || '—'}</td>
                    <td className="p-3 truncate max-w-[240px]" title={r.cliente_fornecedor}>{r.cliente_fornecedor || '—'}</td>
                    <td className="p-3 text-slate-600">{r.tipo_titulo || '—'}</td>
                    <td className="p-3 text-slate-500 truncate max-w-[160px]" title={r.conta_gerencial}>{r.conta_gerencial || '—'}</td>
                    <td className="p-3 text-slate-600 truncate max-w-[180px]" title={r.agente_cobrador}>{r.agente_cobrador || '—'}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">{r.valor > 0 ? fmtMoeda(r.valor) : '—'}</td>
                    <td className="p-3 text-right font-semibold text-blue-700 whitespace-nowrap">{r.saldo > 0 ? fmtMoeda(r.saldo) : '—'}</td>
                    <td className="p-3 text-center">
                      {r.observacao ? (
                        <button
                          onClick={() => setObsModal(r.observacao)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Ver observação do arquivo (RFN003)"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Observação */}
      {obsModal && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Observação</h3>
              <button onClick={() => setObsModal(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{obsModal}</p>
            </div>
            <div className="flex justify-end px-4 py-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setObsModal(null)} className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Título */}
      {modalEditarTitulo && (() => {
        const osKey = String(modalEditarTitulo.os_numero ?? '').trim()
        const garantiaId = garantiaIdByOS.get(osKey)
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Editar Título</h3>
                <button onClick={() => setModalEditarTitulo(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Título: <strong className="text-slate-800 font-mono">{modalEditarTitulo.nro_titulo}</strong></span>
                  <span>OS: <strong className="text-slate-800 font-mono">{modalEditarTitulo.os_numero || '—'}</strong></span>
                </div>
                {garantiaId ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-2.5 py-1.5">
                    <Link2 className="h-3 w-3 shrink-0" />
                    Vinculado a OS em Garantias DAF Faturadas — a observação será gravada também na OS.
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5">
                    <Link2Off className="h-3 w-3 shrink-0" />
                    Sem vínculo com OS no momento — a observação fica salva no título e será propagada automaticamente quando ele for vinculado.
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Observação</label>
                  <textarea
                    value={textoEdicaoObs}
                    onChange={e => setTextoEdicaoObs(e.target.value)}
                    rows={4}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none resize-none"
                    placeholder="Digite uma observação para este título..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setModalEditarTitulo(null)} className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button
                  onClick={salvarObservacaoTitulo}
                  disabled={salvandoObs}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {salvandoObs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {salvandoObs ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
