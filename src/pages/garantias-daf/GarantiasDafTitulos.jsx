import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Search, RefreshCw, Loader2, Eye, X, ArrowDown, Receipt, XCircle, Link2, Link2Off, AlertTriangle, Info, BarChart2, Clock, Edit2,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import GarantiasNav from './GarantiasNav'
import RegistroHistoricoPanel from './RegistroHistoricoPanel'

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
  const [titulosBusca, setTitulosBusca]             = useState('')
  const [filtroOS, setFiltroOS]                     = useState(() => location.state?.osNumero || '')
  const [titulosEmpresa, setTitulosEmpresa]         = useState('')
  const [tiposCadastrados, setTiposCadastrados]     = useState([])
  // null | 'aguardando_pagamento' | 'os_nao_vinculado' | 'nf_nao_enviado'
  const [filtroSituacao, setFiltroSituacao]         = useState(null)
  const [filtroCritico, setFiltroCritico]           = useState(false)
  const [filtroCardSemVinculo, setFiltroCardSemVinculo] = useState(false)
  const [filtroCardVencido, setFiltroCardVencido]   = useState(false)
  const [filtroCardVenceHoje, setFiltroCardVenceHoje] = useState(false)
  const [filtroCardAVencer, setFiltroCardAVencer]   = useState(false)
  const [dataInicio, setDataInicio]                 = useState('')
  const [dataFim, setDataFim]                       = useState('')
  const [garantias, setGarantias]                   = useState([])
  const [filtrosAbertos, setFiltrosAbertos]         = useState(false)
  const [titulosObs, setTitulosObs]                 = useState([]) // linhas de gar_titulos_observacoes (histórico)

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
      setTitulosObs(await apiService.getTitulosObservacoes())
    } catch {}
  }, [])

  // nro_titulo → tem ao menos uma observação registrada — usado para destacar o botão Editar na linha.
  const titulosComObsSet = useMemo(
    () => new Set(titulosObs.map(o => o.nro_titulo)),
    [titulosObs]
  )

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

  // OS presentes em Histórico de O.S. — usado para saber se o título tem vínculo
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

  // Mapa id → garantia completa — usado pelo modal "Visualizar OS e Garantia"
  const garantiaById = useMemo(() => new Map(garantias.map(g => [g.id, g])), [garantias])

  // Propaga Nº Título / Nº Lançamento / Data de Vencimento (não a observação, que mora só em
  // gar_titulos_observacoes) para a OS vinculada — mantém esses dados visíveis em Editar
  // Garantia mesmo se o título sair do arquivo RFN003 (ex: já liquidado/pago).
  useEffect(() => {
    if (titulosRows.length === 0 || garantias.length === 0) return
    const garantiaById = new Map(garantias.map(g => [g.id, g]))
    for (const tituloRow of titulosRows) {
      const osKey = String(tituloRow.os_numero ?? '').trim()
      if (!osKey) continue
      const garantiaId = garantiaIdByOS.get(osKey)
      if (!garantiaId) continue
      const g = garantiaById.get(garantiaId)
      if (!g) continue
      const novo = {
        numero_titulo: tituloRow.nro_titulo || '',
        titulo_nro_lancamento: tituloRow.nro_lancamento || '',
        titulo_data_vencimento: tituloRow.data_vencimento || '',
      }
      const mudou = novo.numero_titulo !== (g.numero_titulo || '')
        || novo.titulo_nro_lancamento !== (g.titulo_nro_lancamento || '')
        || novo.titulo_data_vencimento !== (g.titulo_data_vencimento || '')
      if (!mudou) continue
      apiService.updateGarantia(garantiaId, {
        numero_titulo: novo.numero_titulo || null,
        titulo_nro_lancamento: novo.titulo_nro_lancamento || null,
        titulo_data_vencimento: novo.titulo_data_vencimento || null,
      }, user?.email, g.status_codigo).catch(() => {})
    }
  }, [titulosRows, garantias, garantiaIdByOS, user])

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

  // Vencido / Vence Hoje / A Vencer: pela Data de Vencimento comparada à data de hoje — não pela
  // coluna "Atr." do RFN003, que fica travada em 0 para títulos já vencidos (campo do Dealer.net
  // não é recalculado a cada dia). Independe de vínculo (OS identificada) ou envio à fábrica.
  const hojeISO = new Date().toISOString().slice(0, 10)
  const ehVencido   = (r) => !!r.data_vencimento && r.data_vencimento < hojeISO
  const ehVenceHoje = (r) => r.data_vencimento === hojeISO
  const ehAVencer   = (r) => !!r.data_vencimento && r.data_vencimento > hojeISO

  // Classifica a linha numa única "Situação" (mesma lógica exibida na coluna da tabela e no modal
  // Visualizar). Ordem obrigatória: 1) OS precisa estar vinculada — sem isso, nem faz sentido
  // olhar a NF; 2) só então verifica se a NF foi enviada à fábrica; 3) com os dois OK, é só
  // "Aguard. Pagto" (a data exata de vencimento já aparece na coluna Vencto./Atr.).
  const situacaoDeLinha = useCallback((r) => {
    const vinculado = garantiasOsSet.has(String(r.os_numero ?? '').trim())
    if (!vinculado) return 'os_nao_vinculado'
    if (!temEnvioTitulo(r)) return 'nf_nao_enviado'
    return 'aguardando_pagamento'
  }, [garantiasOsSet, temEnvioTitulo])

  // Aplica somente os filtros de base (tipo cadastrado, empresa, período, busca) — usado para os
  // cards de alerta, que devem refletir contagens absolutas independentes dos filtros de situação.
  const aplicarFiltrosBase = useCallback((rows) => {
    let out = rows
    if (tiposCadastrados.length > 0)
      out = out.filter(r => tiposCadastrados.includes(String(r.tipo_titulo ?? '').trim()))
    if (titulosEmpresa) out = out.filter(r => r.empresa === titulosEmpresa)
    if (dataInicio) out = out.filter(r => r.data_emissao && r.data_emissao >= dataInicio)
    if (dataFim) out = out.filter(r => r.data_emissao && r.data_emissao <= dataFim)
    const osQ = filtroOS.trim().toLowerCase()
    if (osQ) out = out.filter(r => String(r.os_numero).toLowerCase().includes(osQ))
    const q = titulosBusca.trim().toLowerCase()
    if (!q) return out
    return out.filter(r =>
      String(r.nro_titulo).toLowerCase().includes(q) ||
      String(r.cliente_fornecedor).toLowerCase().includes(q) ||
      String(r.nota_fiscal).toLowerCase().includes(q) ||
      String(r.nota_fiscal_servico).toLowerCase().includes(q)
    )
  }, [tiposCadastrados, titulosEmpresa, dataInicio, dataFim, filtroOS, titulosBusca])

  // Aplica os filtros de base + o filtro de Situação (pill única) + os filtros dos cards de alerta.
  const aplicarFiltrosComuns = useCallback((rows) => {
    let out = aplicarFiltrosBase(rows)
    if (filtroSituacao) out = out.filter(r => situacaoDeLinha(r) === filtroSituacao)
    if (filtroCritico) out = out.filter(ehCritico)
    if (filtroCardSemVinculo) out = out.filter(r => !garantiasOsSet.has(String(r.os_numero ?? '').trim()))
    if (filtroCardVencido) out = out.filter(ehVencido)
    if (filtroCardVenceHoje) out = out.filter(ehVenceHoje)
    if (filtroCardAVencer) out = out.filter(ehAVencer)
    // Os cards de vencimento (A Vencer/Vence Hoje/Vencido) ordenam a tabela pela Data de Vencimento.
    if (filtroCardVencido || filtroCardVenceHoje || filtroCardAVencer) {
      out = [...out].sort((a, b) => String(a.data_vencimento || '').localeCompare(String(b.data_vencimento || '')))
    }
    return out
  }, [aplicarFiltrosBase, filtroSituacao, situacaoDeLinha, filtroCritico, filtroCardSemVinculo, garantiasOsSet, filtroCardVencido, filtroCardVenceHoje, filtroCardAVencer])

  // Base dos cards de alerta: só os filtros de base (tipo/empresa/período/busca) — contagens
  // absolutas, independentes da pill de Situação e dos próprios toggles dos cards.
  const baseAlerta = useMemo(
    () => aplicarFiltrosBase(titulosRows),
    [titulosRows, aplicarFiltrosBase]
  )
  const grpNfCritica = useMemo(() => baseAlerta.filter(ehCritico), [baseAlerta])
  // Títulos cuja OS ainda não está vinculada (cadastrada) em Histórico de O.S.
  const grpNaoVinculado = useMemo(
    () => baseAlerta.filter(r => !garantiasOsSet.has(String(r.os_numero ?? '').trim())),
    [baseAlerta, garantiasOsSet]
  )
  const grpVencidos = useMemo(() => baseAlerta.filter(ehVencido), [baseAlerta])
  const grpVenceHoje = useMemo(() => baseAlerta.filter(ehVenceHoje), [baseAlerta])
  const grpAVencer = useMemo(() => baseAlerta.filter(ehAVencer), [baseAlerta])

  const titulosFiltrados = useMemo(
    () => aplicarFiltrosComuns(titulosRows),
    [titulosRows, aplicarFiltrosComuns]
  )

  // Indica se algum filtro que afeta os alertas (empresa/período/busca) está ativo — usado para
  // avisar que os números dos alertas já refletem esse recorte, e não a base total.
  const filtrosComunsAtivos = !!(titulosEmpresa || dataInicio || dataFim || filtroOS.trim() || titulosBusca.trim())
  // Indica se há QUALQUER filtro ativo no painel (comuns + situação + cards) — usado para só
  // mostrar o botão "Limpar todos os filtros" quando existir algo para limpar.
  const algumFiltroAtivo = filtrosComunsAtivos || !!filtroSituacao || filtroCritico || filtroCardSemVinculo || filtroCardVencido || filtroCardVenceHoje || filtroCardAVencer

  const totalValor = useMemo(() => titulosFiltrados.reduce((s, r) => s + (r.valor || 0), 0), [titulosFiltrados])
  const totalSaldo = useMemo(() => titulosFiltrados.reduce((s, r) => s + (r.saldo || 0), 0), [titulosFiltrados])

  const valorGrpNfCritica = useMemo(() => grpNfCritica.reduce((s, r) => s + (r.valor || 0), 0), [grpNfCritica])
  const valorGrpNaoVinculado = useMemo(() => grpNaoVinculado.reduce((s, r) => s + (r.valor || 0), 0), [grpNaoVinculado])
  const valorGrpVencidos = useMemo(() => grpVencidos.reduce((s, r) => s + (r.valor || 0), 0), [grpVencidos])
  const valorGrpVenceHoje = useMemo(() => grpVenceHoje.reduce((s, r) => s + (r.valor || 0), 0), [grpVenceHoje])
  const valorGrpAVencer = useMemo(() => grpAVencer.reduce((s, r) => s + (r.valor || 0), 0), [grpAVencer])

  const toggleFiltroCritico = () => setFiltroCritico(v => !v)
  const toggleFiltroNaoVinculado = () => setFiltroCardSemVinculo(v => !v)
  const toggleFiltroVencido = () => setFiltroCardVencido(v => !v)
  const toggleFiltroVenceHoje = () => setFiltroCardVenceHoje(v => !v)
  const toggleFiltroAVencer = () => setFiltroCardAVencer(v => !v)
  const toggleFiltroSituacao = (valor) => setFiltroSituacao(prev => prev === valor ? null : valor)

  // Algum dos cards de alerta está selecionado como filtro — o card Resumo Geral limpa todos.
  const algumCardFiltroAtivo = filtroCritico || filtroCardSemVinculo || filtroCardVencido || filtroCardVenceHoje || filtroCardAVencer
  const limparFiltrosCards = () => {
    setFiltroSituacao(null)
    setFiltroCritico(false)
    setFiltroCardSemVinculo(false)
    setFiltroCardVencido(false)
    setFiltroCardVenceHoje(false)
    setFiltroCardAVencer(false)
  }

  // Limpa todos os filtros do painel Filtros avançados (empresa, período, busca, situação e cards).
  const limparTodosFiltros = () => {
    setTitulosEmpresa('')
    setDataInicio('')
    setDataFim('')
    setFiltroOS('')
    setTitulosBusca('')
    limparFiltrosCards()
  }

  // ── Edição de observações do título (gar_titulos_observacoes) ──────────
  const [modalEditarTitulo, setModalEditarTitulo] = useState(null) // linha do título sendo editado

  const abrirEdicaoTitulo = (row) => setModalEditarTitulo(row)

  // ── Visualização da OS/Garantia vinculada, sem sair da tela de Títulos ──
  const [modalVisualizarOS, setModalVisualizarOS] = useState(null) // garantia (gar_garantias) sendo visualizada

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-500" />
              Garantias DAF a Receber
              <span className="relative group cursor-help">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="absolute top-full left-0 mt-2 w-96 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal space-y-1">
                  <div>Fonte de dados: Relatório extraído do sistema Dealer.net através do sistema Robert Automation</div>
                  <div>RPA: Processo 2: Extração Relatórios Financeiro</div>
                  <div>Nome do Arquivo: RFN003_PosicaoAnaliticoReceber_Excel (4 arquivos, um por unidade — busca por início do nome)</div>
                  <div>Pasta SharePoint: /Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF</div>
                </span>
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Títulos financeiros a receber vinculados às OS faturadas.
            </p>
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
              title="Atualizar arquivo"
              className="flex items-center justify-center p-2 rounded-md text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${titulosRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {hasPermission('bi/garantias-daf') && (
              <button
                onClick={() => navigate('/bi/garantias-daf', { state: { aba: 'titulos' } })}
                title="Ir para Dashboard"
                className="flex items-center justify-center p-2 rounded-md text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
              >
                <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <GarantiasNav />
        </div>
      </div>

      {/* ── ALERTAS (lado a lado, clicáveis para filtrar) ── */}
      {(grpNaoVinculado.length > 0 || grpNfCritica.length > 0) && (
        <div className="flex flex-col md:flex-row gap-3">
          {grpNaoVinculado.length > 0 && (
            <button
              type="button"
              onClick={toggleFiltroNaoVinculado}
              className={`flex-1 flex items-center gap-3 bg-orange-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-orange-100 ${filtroCardSemVinculo ? 'border-orange-500 ring-2 ring-offset-1 ring-orange-300' : 'border-orange-300'}`}
            >
              <Link2Off className="h-4 w-4 text-orange-600 shrink-0" />
              <p className="text-xs text-orange-700 font-semibold flex-1">
                {grpNaoVinculado.length} título(s) · Não vinculado a Histórico de O.S.
                <span className="text-orange-500 font-normal"> — {fmtMoeda(valorGrpNaoVinculado)}</span>
                {filtrosComunsAtivos && <span className="ml-1.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-bold">filtrado</span>}
              </p>
            </button>
          )}

          {grpNfCritica.length > 0 && (
            <button
              type="button"
              onClick={toggleFiltroCritico}
              className={`flex-1 flex items-center gap-3 bg-red-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-red-100 ${filtroCritico ? 'border-red-500 ring-2 ring-offset-1 ring-red-300' : 'border-red-300'}`}
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

      {/* ── CARDS: A VENCER + VENCE HOJE + VENCIDOS + RESUMO GERAL ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {grpVencidos.length > 0 && (
          <button
            type="button"
            onClick={toggleFiltroVencido}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-red-50 border-red-300 ${filtroCardVencido ? 'ring-2 ring-offset-1 ring-red-400 shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-red-100"><AlertTriangle className="h-3.5 w-3.5 text-red-700" /></div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Vencidos</p>
              </div>
              {filtrosComunsAtivos && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">filtrado</span>}
            </div>
            <p className="text-2xl font-bold text-red-700 leading-none">{grpVencidos.length}</p>
            <p className="text-[10px] text-red-600 mt-0.5 mb-2">título(s) · pela data de vencimento</p>
            <p className="text-sm font-bold text-red-900 pt-2 border-t border-red-300">{fmtMoeda(valorGrpVencidos)}</p>
          </button>
        )}

        {grpVenceHoje.length > 0 && (
          <button
            type="button"
            onClick={toggleFiltroVenceHoje}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-yellow-50 border-yellow-300 ${filtroCardVenceHoje ? 'ring-2 ring-offset-1 ring-yellow-400 shadow-md' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded bg-yellow-100"><Clock className="h-3.5 w-3.5 text-yellow-700" /></div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-yellow-600">Vence Hoje</p>
              </div>
              {filtrosComunsAtivos && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-bold">filtrado</span>}
            </div>
            <p className="text-2xl font-bold text-yellow-700 leading-none">{grpVenceHoje.length}</p>
            <p className="text-[10px] text-yellow-600 mt-0.5 mb-2">título(s) · pela data de vencimento</p>
            <p className="text-sm font-bold text-yellow-800 pt-2 border-t border-yellow-300">{fmtMoeda(valorGrpVenceHoje)}</p>
          </button>
        )}

        {grpAVencer.length > 0 && (
          <button
            type="button"
            onClick={toggleFiltroAVencer}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroCardAVencer ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}
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
            {filtroOS && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">OS {filtroOS}</span>}
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

        <div className="relative w-32 shrink-0">
          <input
            type="text"
            placeholder="Nº OS"
            value={filtroOS}
            onChange={e => setFiltroOS(e.target.value)}
            className="w-full pl-2 pr-7 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
          {filtroOS && (
            <button
              onClick={() => setFiltroOS('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              title="Limpar Nº OS"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, cliente, nota fiscal..."
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

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button type="button"
            onClick={() => setFiltroSituacao(null)}
            className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${!filtroSituacao ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
          >Todos</button>
          <button type="button"
            onClick={() => toggleFiltroSituacao('os_nao_vinculado')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroSituacao === 'os_nao_vinculado' ? 'bg-orange-600 text-white border-orange-600' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
          ><Link2Off className="h-3 w-3" /> OS não vinculado</button>
          <button type="button"
            onClick={() => toggleFiltroSituacao('nf_nao_enviado')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroSituacao === 'nf_nao_enviado' ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
          ><ArrowDown className="h-3 w-3" /> NF não enviado</button>
          <button type="button"
            onClick={() => toggleFiltroSituacao('aguardando_pagamento')}
            className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroSituacao === 'aguardando_pagamento' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
          ><Clock className="h-3 w-3" /> Aguard. Pagto</button>
        </div>
        </div>
        )}
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
                <th className="p-3 w-20 text-center">Ações</th>
                <th className="p-3 w-24">Situação</th>
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
                const atrasado = ehVencido(r)
                const { rps, nfse } = parseNFServico(r.nota_fiscal_servico)
                const osKey    = String(r.os_numero   || '').trim()
                const danfeKey = String(r.nota_fiscal || '').trim()
                const dataEnvio = envioMap.get(`${osKey}||${danfeKey}`) ?? envioMap.get(osKey) ?? null
                const garantiaId = garantiaIdByOS.get(osKey)
                const semOS = !garantiaId
                const semNF = !dataEnvio
                const situacaoTitulo = semOS ? 'OS não vinculado'
                  : semNF ? 'NF não enviado'
                  : 'Aguard. Pagto'
                const corSituacao = semOS ? 'bg-orange-100 text-orange-700'
                  : semNF ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
                const irParaOS = () => {
                  if (garantiaId) navigate(`/garantias-daf/${garantiaId}`, { state: { from: '/garantias-daf-titulos' } })
                  else alert(`A OS ${osKey || ''} deste título ainda não está cadastrada em Histórico de O.S.`)
                }
                const abrirVisualizarOS = () => {
                  if (!garantiaId) { alert(`A OS ${osKey || ''} deste título ainda não está cadastrada em Histórico de O.S.`); return }
                  const g = garantiaById.get(garantiaId)
                  if (g) setModalVisualizarOS(g)
                }
                return (
                  <tr key={i} className={`transition-colors hover:bg-slate-50/70 ${atrasado ? 'bg-red-50/30' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={abrirVisualizarOS}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Visualizar Ordem de Serviço e Garantia"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => abrirEdicaoTitulo({ ...r, _dataEnvio: dataEnvio })}
                          className={`p-1 rounded transition-colors hover:bg-indigo-50 ${titulosComObsSet.has(r.nro_titulo) ? 'text-indigo-500 hover:text-indigo-700' : 'text-slate-400 hover:text-indigo-600'}`}
                          title="Visualizar informações do título"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={irParaOS}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar Garantia — vincular OS e informar envio à fábrica"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${corSituacao}`}>{situacaoTitulo}</span>
                    </td>
                    <td className="p-3 text-slate-600 truncate max-w-[160px]" title={r.empresa}>{r.empresa || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {dataEnvio
                        ? <span className="font-semibold text-slate-700">{fmtData(dataEnvio)}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.nro_titulo || '—'}</td>
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Editar Título */}
      {modalEditarTitulo && (() => {
        const t = modalEditarTitulo
        const osKey = String(t.os_numero ?? '').trim()
        const garantiaId = garantiaIdByOS.get(osKey)
        const atrasado = ehVencido(t)
        const semOSModal = !garantiaId
        const semNFModal = !t._dataEnvio
        const situacao = semOSModal ? 'OS não vinculado'
          : semNFModal ? 'NF não enviado'
          : 'Aguard. Pagto'
        const { rps, nfse } = parseNFServico(t.nota_fiscal_servico)
        const campos = [
          { label: 'Situação',         valor: situacao, destaque: semOSModal || semNFModal || atrasado },
          { label: 'Empresa',          valor: t.empresa },
          { label: 'Data Envio',       valor: t._dataEnvio ? fmtData(t._dataEnvio) : '—' },
          { label: 'Nro Lançamento',   valor: t.nro_lancamento },
          { label: 'Emissão',          valor: fmtData(t.data_emissao) },
          { label: 'Vencimento',       valor: fmtData(t.data_vencimento) },
          { label: 'Atraso',           valor: t.atraso !== null ? `${t.atraso}d` : '—', destaque: atrasado },
          { label: 'RPS',              valor: rps },
          { label: 'NFSe',             valor: nfse },
          { label: 'DANFE',            valor: t.nota_fiscal },
          { label: 'Código Cliente',   valor: t.codigo_cliente },
          { label: 'Tipo de Título',   valor: t.tipo_titulo },
          { label: 'Conta Gerencial',  valor: t.conta_gerencial },
          { label: 'Cliente/Fornecedor', valor: t.cliente_fornecedor, span: true },
          { label: 'Agente Cobrador',  valor: t.agente_cobrador },
          { label: 'Valor',            valor: t.valor > 0 ? fmtMoeda(t.valor) : '—' },
          { label: 'Saldo',            valor: t.saldo > 0 ? fmtMoeda(t.saldo) : '—' },
        ]
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[640px] max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-bold text-slate-900">Título a Receber</h3>
                <button onClick={() => setModalEditarTitulo(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Título: <strong className="text-slate-800 font-mono">{t.nro_titulo}</strong></span>
                  <span>OS: <strong className="text-slate-800 font-mono">{t.os_numero || '—'}</strong></span>
                </div>
                {garantiaId ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-2.5 py-1.5">
                    <Link2 className="h-3 w-3 shrink-0" />
                    Vinculado a OS em Histórico de O.S. — as observações também aparecem lá.
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5">
                    <Link2Off className="h-3 w-3 shrink-0" />
                    Sem vínculo com OS — vincule a OS {osKey || 'deste título'} em Histórico de O.S. antes de adicionar observações. Toda informação do título deve estar gravada na OS.
                  </div>
                )}
                <div className="grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                  {campos.map(({ label, valor, span, destaque }) => (
                    <div key={label} className={span ? 'col-span-3' : ''}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                      <p className={`text-xs font-semibold truncate ${destaque ? 'text-red-600' : 'text-slate-700'}`} title={valor || ''}>{valor || '—'}</p>
                    </div>
                  ))}
                </div>
                {t.observacao && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Observação do Arquivo (RFN003)</label>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{t.observacao}</p>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Observações</label>
                  <RegistroHistoricoPanel
                    itens={titulosObs.filter(o => o.nro_titulo === t.nro_titulo)}
                    podeEditar={canEditarTitulo}
                    bloqueado={!garantiaId}
                    bloqueadoMsg="Vincule este título a uma OS em Histórico de O.S. antes de adicionar observações."
                    placeholder="Adicionar nova observação..."
                    onCreate={(texto) => apiService.createTituloObservacao(t.nro_titulo, texto, user?.email).then(loadTitulosObs)}
                    onUpdate={(id, texto) => apiService.updateTituloObservacao(id, texto, user?.email).then(loadTitulosObs)}
                    onDelete={(id) => apiService.deleteTituloObservacao(id).then(loadTitulosObs)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button onClick={() => setModalEditarTitulo(null)} className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal Visualizar OS e Garantia — mesmo padrão do modal de Título, sem sair da tela */}
      {modalVisualizarOS && (() => {
        const g = modalVisualizarOS
        const valorTotal = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
        const camposAbertura = [
          { label: 'Empresa',            valor: g.empresa_nome },
          { label: 'Consultor',          valor: g.consultor_nome },
          { label: 'Tipo de OS',         valor: g.tipo_garantia_descricao || g.tipo_os_sigla },
          { label: 'Cliente',            valor: g.cliente, span: true },
          { label: 'Chassi',             valor: g.chassi },
          { label: 'Data Abertura OS',   valor: fmtData(g.data_abertura_os) },
          { label: 'Data Fechamento OS', valor: fmtData(g.data_fechamento_os) },
          { label: 'Nº SG',              valor: g.numero_sg },
          { label: 'Data SG',            valor: fmtData(g.data_sg) },
          { label: 'Valor Peças',        valor: g.valor_pecas > 0 ? fmtMoeda(g.valor_pecas) : '—' },
          { label: 'Valor Serviços',     valor: g.valor_servicos > 0 ? fmtMoeda(g.valor_servicos) : '—' },
          { label: 'Valor Total',        valor: valorTotal > 0 ? fmtMoeda(valorTotal) : '—' },
        ]
        const camposAnalise = [
          { label: 'Status',                valor: g.status_codigo },
          { label: 'Data Final Avaliação',  valor: fmtData(g.data_final_avaliacao) },
          { label: 'SG Reapresentada',      valor: g.sg_reapresentada === 'S' ? 'Sim' : 'Não' },
          ...(g.sg_reapresentada === 'S' ? [
            { label: 'Nº SG (Reapresentação)', valor: g.numero_sg_reapresentacao },
            { label: 'Data Reapresentação',    valor: fmtData(g.data_reapresentacao) },
          ] : []),
          { label: 'Motivo da Recusa',      valor: g.motivo_recusa_descricao, span: true },
          { label: 'Nº NF Envio de Peça',   valor: g.nf_peca_numero },
          { label: 'Data NF Envio de Peça', valor: fmtData(g.nf_peca_data) },
        ]
        const camposFaturamento = [
          { label: 'Nº NF',              valor: g.numero_nf },
          { label: 'Emissão NF',         valor: fmtData(g.data_emissao_nf) },
          { label: 'Envio Fábrica',      valor: fmtData(g.data_envio_fabrica) },
        ]
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[640px] max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-bold text-slate-900">Ordem de Serviço e Garantia — OS {g.numero_os}</h3>
                <button onClick={() => setModalVisualizarOS(null)} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">1 — Abertura</p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                    {camposAbertura.map(({ label, valor, span }) => (
                      <div key={label} className={span ? 'col-span-3' : ''}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={valor || ''}>{valor || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">2 — Análise</p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                    {camposAnalise.map(({ label, valor, span }) => (
                      <div key={label} className={span ? 'col-span-3' : ''}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={valor || ''}>{valor || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {g.observacoes && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Informações (Aguardando Material)</label>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{g.observacoes}</p>
                    </div>
                  )}
                  {g.resposta_shc && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Resposta SHC</label>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">{g.resposta_shc}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">3 — Faturamento</p>
                  <div className="grid grid-cols-3 gap-x-4 gap-y-3 bg-slate-50 border border-slate-100 rounded-lg px-4 py-3">
                    {camposFaturamento.map(({ label, valor, span }) => (
                      <div key={label} className={span ? 'col-span-3' : ''}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="text-xs font-semibold text-slate-700 truncate" title={valor || ''}>{valor || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => navigate(`/garantias-daf/${g.id}`, { state: { from: '/garantias-daf-titulos' } })}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >Abrir tela completa</button>
                <button onClick={() => setModalVisualizarOS(null)} className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
