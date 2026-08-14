import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { useNavigate } from 'react-router-dom'
import {
  Search, Edit2, Trash2, ShieldAlert, FileText,
  Activity, Clock, AlertTriangle, Filter, RotateCcw, Download,
  Bell, ChevronDown, ChevronUp, CheckCircle, XCircle, Send, BarChart2,
  CheckSquare, Square, Loader2, Info, Eye,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import GarantiasDafImportModal from './GarantiasDafImportModal'
import GarantiasNav from './GarantiasNav'

const STATUS_MAP = {
  A:  { label: 'Em Análise',                      cor: 'bg-blue-100 text-blue-700' },
  B:  { label: 'B — Em processo de consideração', cor: 'bg-slate-100 text-slate-600' },
  C:  { label: 'C — Fora de Garantia (aceita)',   cor: 'bg-orange-100 text-orange-700' },
  E:  { label: 'E — Nota Fiscal Emitida',         cor: 'bg-blue-100 text-blue-600' },
  F:  { label: 'F — Enviado para Fábrica',        cor: 'bg-blue-200 text-blue-800' },
  G:  { label: 'G — Reivindicação apresentada',   cor: 'bg-sky-100 text-sky-700' },
  M:  { label: 'M — Aprovação por matriz',        cor: 'bg-violet-100 text-violet-700' },
  N:  { label: 'N — Análise Subsidiária DAF',     cor: 'bg-purple-100 text-purple-700' },
  P:  { label: 'P — Enviada para ASI',            cor: 'bg-indigo-100 text-indigo-700' },
  Q:  { label: 'Q — Ag. material (peças)',        cor: 'bg-amber-100 text-amber-700' },
  R:  { label: 'R — Avaliação Subsidiária DAF',   cor: 'bg-pink-100 text-pink-700' },
  S:  { label: 'S — Processo selecionado',        cor: 'bg-teal-100 text-teal-700' },
  T:  { label: 'T — Análise escritório DAF',      cor: 'bg-cyan-100 text-cyan-700' },
  U:  { label: 'U — Fase de crédito',             cor: 'bg-lime-100 text-lime-700' },
  V:  { label: 'V — Reembolso calculado',         cor: 'bg-green-100 text-green-700' },
  W:  { label: 'W — Ag. material/informação',     cor: 'bg-yellow-100 text-yellow-700' },
  X:  { label: 'X — Pronta análise DAF',          cor: 'bg-emerald-100 text-emerald-700' },
  Y:  { label: 'Y — Fase de crédito (conc.)',     cor: 'bg-green-100 text-green-800' },
  FA: { label: 'F — Financeiro APROVADO',         cor: 'bg-green-200 text-green-800' },
  FR: { label: 'F — Financeiro RECUSADO',         cor: 'bg-red-100 text-red-700' },
  Z:  { label: 'Z — Processo recusado',           cor: 'bg-red-200 text-red-800' },
}

function getStatusDisplay(item) {
  if (item.status_codigo !== 'A') {
    return STATUS_MAP[item.status_codigo] || { label: item.status_codigo, cor: 'bg-slate-100 text-slate-500' }
  }
  if (!item.data_abertura_os) {
    return { label: 'A — Em fase de digitação (D+1)', cor: 'bg-blue-100 text-blue-700' }
  }
  const hoje    = new Date()
  const abertura = new Date(item.data_abertura_os + 'T12:00:00')
  const d = Math.floor((hoje - abertura) / 86400000)
  return d > 1
    ? { label: 'A — Digitação Atrasada (>D+1)',  cor: 'bg-red-100 text-red-700' }
    : { label: 'A — Em fase de digitação (D+1)', cor: 'bg-blue-100 text-blue-700' }
}

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const diffDias = (a, b) => {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

const FILTROS_VAZIOS = { numero_os: '', chassi: '', data_inicio: '', data_fim: '' }

function CardGrupo({ icon: Icon, label, count, valor, diasMedio, ativo, onClick, st }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition-all hover:shadow-md w-full ${st.bg} ${st.border} ${ativo ? 'ring-2 ring-offset-1 ' + st.ring + ' shadow-md' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`p-1 rounded ${st.icoBg}`}>
          <Icon className={`h-3 w-3 ${st.icoTxt}`} />
        </div>
        <p className={`text-[9px] font-bold uppercase tracking-wide leading-tight ${st.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-2xl font-bold ${st.numTxt} leading-none`}>{count}</p>
      <p className={`text-[9px] ${st.labelTxt} mt-0.5 mb-2`}>OS</p>
      <div className={`border-t ${st.divider} pt-1.5 space-y-0.5`}>
        <p className={`text-[11px] font-bold ${st.numTxt}`}>{fmt(valor)}</p>
        <p className={`text-[9px] ${st.labelTxt}`}>{diasMedio !== null ? `${diasMedio}d tempo médio` : '—'}</p>
      </div>
    </button>
  )
}

export default function GarantiasDafDashboard({ variante = 'aberto' }) {
  const isAndamento = variante === 'andamento'
  const pfx = isAndamento ? 'daf_and' : 'daf_ab'

  const navigate = useNavigate()
  const { user, isAdmin, empresasPermitidas, hasActionOrDefault, hasPermission } = useAuth()
  const canEditarOS = hasActionOrDefault('garantias-daf', 'editar')
  const canExcluirOS = hasActionOrDefault('garantias-daf', 'excluir')

  const [dados, setDados] = useState([])          // resultado dos filtros avançados (tabela)
  const [dadosTodos, setDadosTodos] = useState([]) // TODOS os registros — nunca filtrado
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useSessionState(`${pfx}_filtros`, FILTROS_VAZIOS)
  const [filtrosAbertos, setFiltrosAbertos] = useSessionState(`${pfx}_filtros_abertos`, false)
  const [statusFiltro, setStatusFiltro] = useSessionState(`${pfx}_status`, '')
  const [filtroCard, setFiltroCard] = useSessionState(`${pfx}_card`, null)
  const [sortCol, setSortCol] = useSessionState(`${pfx}_sort_col`, 'numero_os')
  const [sortDir, setSortDir] = useSessionState(`${pfx}_sort_dir`, 'asc')
  const [sortColAnd, setSortColAnd] = useSessionState(`${pfx}_and_sort_col`, 'os_numero')
  const [sortDirAnd, setSortDirAnd] = useSessionState(`${pfx}_and_sort_dir`, 'asc')
  const [alertaAberto, setAlertaAberto] = useState(true)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [modalImportar, setModalImportar] = useState(false)
  const [spRows, setSpRows]             = useState([])
  const [spLoading, setSpLoading]       = useState(false)
  const [spLastModified, setSpLastModified] = useState(null)
  const [filtroEmpresaDash, setFiltroEmpresaDash] = useSessionState(`${pfx}_empresa`, '')
  const [filtroTipoOS, setFiltroTipoOS] = useSessionState(`${pfx}_tipo_os`, '')
  const [filtroNaBase, setFiltroNaBase] = useSessionState(`${pfx}_na_base`, '')
  const [idExcluir, setIdExcluir] = useState(null)
  const [nomeExcluir, setNomeExcluir] = useState('')
  const [filtroMais14, setFiltroMais14] = useState(false)
  const [selecionados, setSelecionados] = useState(new Set())
  const [modalExcluirLote, setModalExcluirLote] = useState(false)
  const [excluindoLote, setExcluindoLote] = useState(false)
  const [empresasDim, setEmpresasDim] = useState([])
  const [siglasGarantia, setSiglasGarantia] = useState(new Set())
  const [buscandoFaturamentoLote, setBuscandoFaturamentoLote] = useState(false)
  const [progressoBuscaLote, setProgressoBuscaLote] = useState(null) // { atual, total }

  const loadData = useCallback(async (f = filtros) => {
    setLoading(true); setError(null)
    try {
      const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
      // Sempre carrega todos (paginado) para importadosSet e modais
      const todos = await apiService.getAllGarantiasParaImport({ ...filtrosEmpresa })
      setDadosTodos(todos)
      // Carrega resultado filtrado (exclui E e F — ambos ficam em Faturadas)
      const extraFiltros = isAndamento ? { sem_fechamento: true } : {}
      const garantias = await apiService.getGarantias({ ...f, ...filtrosEmpresa, status_not_in: ['E', 'F'], ...extraFiltros })
      setDados(garantias)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [filtros, isAdmin, empresasPermitidas, isAndamento])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const hasActive = Object.values(filtros).some(v => !!v) || !!filtroEmpresaDash || !!filtroTipoOS
    if (!hasActive) setFiltrosAbertos(false)
    setFiltros(FILTROS_VAZIOS)
    loadData(FILTROS_VAZIOS)
    apiService.getEmpresas().then(d => setEmpresasDim(d.filter(e => e.ativo !== false))).catch(() => {})
    apiService.getTiposOS().then(tipos => {
      const siglas = new Set(tipos.filter(t => t.classificacao === 'Garantia' && t.sigla).map(t => String(t.sigla).trim().toUpperCase()))
      setSiglasGarantia(siglas)
    }).catch(() => {})
  }, [isAdmin, empresasPermitidas])

  const fetchSharePoint = useCallback(async (force = false) => {
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    setSpLoading(true)
    try {
      // aberta não tem cache — GET já lê ao vivo; encerrada tem cache, usa POST para forçar
      const url = isAndamento
        ? `${BACKEND}/api/garantias/sharepoint/aberta`
        : force
          ? `${BACKEND}/api/garantias/sharepoint/encerrada/refresh`
          : `${BACKEND}/api/garantias/sharepoint/encerrada`
      const r = await fetch(url, (!isAndamento && force) ? { method: 'POST' } : undefined)
      const data = r.ok ? await r.json() : []
      const rows = Array.isArray(data) ? data : (data.rows ?? [])
      setSpRows(rows)
      if (data.lastModified) setSpLastModified(data.lastModified)
    } catch {}
    finally { setSpLoading(false) }
  }, [isAndamento])

  useEffect(() => { fetchSharePoint() }, [fetchSharePoint])

  const empresaFantasiaMap = useMemo(() => {
    const m = new Map()
    for (const e of empresasDim) m.set(e.id, e.empresa_fantasia || e.nome_empresa || e.nome_empresa_sistema || '')
    return m
  }, [empresasDim])

  // Mapa nome_empresa_sistema → empresa_fantasia (correspondência direta sem normalização)
  const sistemaNomeMap = useMemo(() => {
    const m = new Map()
    for (const e of empresasDim) {
      const sistema = String(e.nome_empresa_sistema || '').trim()
      if (sistema) m.set(sistema, e.empresa_fantasia || sistema)
    }
    return m
  }, [empresasDim])

  const empresaNome = useCallback((item) => {
    if (item.empresa_id) {
      const byId = empresaFantasiaMap.get(item.empresa_id)
      if (byId) return byId
    }
    if (item.empresa_nome) {
      const bySistema = sistemaNomeMap.get(String(item.empresa_nome).trim())
      if (bySistema) return bySistema
    }
    return item.empresa_nome || '—'
  }, [empresaFantasiaMap, sistemaNomeMap])

  // Extrai só o código do tipo: "G01 - GARANTIA NORMAL..." → "G01"
  const tipoCode = (s) => String(s || '').trim().split(' ')[0].toUpperCase()

  // Chave composta numero_os||código_tipo — construída sempre sobre TODOS os registros
  const importadosSet = useMemo(
    () => new Set(dadosTodos.map(d =>
      `${String(d.numero_os).trim()}||${tipoCode(d.tipo_os_sigla) || tipoCode(d.tipo_garantia_descricao)}`
    )),
    [dadosTodos]
  )
  // Fallback A: Supabase tem numero_os mas sem tipo registrado
  const importadosSemTipo = useMemo(
    () => new Set(
      dadosTodos
        .filter(d => !tipoCode(d.tipo_os_sigla) && !tipoCode(d.tipo_garantia_descricao))
        .map(d => String(d.numero_os).trim())
    ),
    [dadosTodos]
  )
  // Fallback B: todos os numero_os — usado quando SharePoint não retorna tipo
  const importadosTodosPorOS = useMemo(
    () => new Set(dadosTodos.map(d => String(d.numero_os).trim())),
    [dadosTodos]
  )

  // Set de chaves OS||tipo vindas do SharePoint — para cruzamento na tabela Aberto
  const spSet = useMemo(
    () => new Set(spRows.map(r =>
      `${String(r.os_numero ?? '').trim()}||${tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)}`
    )),
    [spRows]
  )
  const isNaBase = (item) => {
    const key = `${String(item.numero_os ?? '').trim()}||${tipoCode(item.tipo_os_sigla) || tipoCode(item.tipo_garantia_descricao)}`
    return spSet.has(key)
  }

  // Mapa OS → id Supabase (para botão editar na view andamento)
  const supabaseIdByOS = useMemo(
    () => new Map(dadosTodos.map(d => [String(d.numero_os).trim(), d.id])),
    [dadosTodos]
  )

  // Mapa OS → empresa (nome fantasia) vinda do Supabase — fonte confiável para filtro
  const osEmpresaMap = useMemo(() => {
    const m = new Map()
    for (const d of dadosTodos) {
      const os = String(d.numero_os || '').trim()
      if (os) m.set(os, empresaNome(d))
    }
    return m
  }, [dadosTodos, empresaNome])

  // Pré-computa _empresa direto do SharePoint, sem cruzamento com Supabase
  const spRowsEnriquecidos = useMemo(() => spRows.map(r => ({
    ...r,
    _empresa: String(r.empresa_nome || '').trim() || '—'
  })), [spRows])

  const spEmpresaNome = useCallback((r) => r._empresa || String(r.empresa_nome || '').trim() || '—', [])

  const empresasDisponiveis = useMemo(() => {
    const list = isAndamento
      ? spRowsEnriquecidos.map(r => r._empresa)
      : dadosTodos.map(d => empresaNome(d))
    return Array.from(new Set(list.filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dadosTodos, spRowsEnriquecidos, isAndamento, empresaNome])

  // Limpa filtroEmpresaDash se o valor salvo não bate com nenhuma opção disponível (evita stale do localStorage)
  useEffect(() => {
    if (filtroEmpresaDash && empresasDisponiveis.length > 0 && !empresasDisponiveis.includes(filtroEmpresaDash)) {
      setFiltroEmpresaDash('')
    }
  }, [empresasDisponiveis]) // eslint-disable-line react-hooks/exhaustive-deps

  // Registros do SharePoint em andamento com filtros aplicados
  const spAndamentoFiltrado = useMemo(() => {
    if (!isAndamento) return []
    let rows = [...spRowsEnriquecidos]
    if (siglasGarantia.size > 0) rows = rows.filter(r => siglasGarantia.has(tipoCode(r.tipo_os_sigla)))
    if (filtros.numero_os?.trim()) rows = rows.filter(r => r.os_numero.includes(filtros.numero_os.trim()))
    if (filtros.chassi?.trim()) rows = rows.filter(r => r.veiculo_chassi.toLowerCase().includes(filtros.chassi.toLowerCase().trim()))
    if (filtroEmpresaDash) rows = rows.filter(r => r._empresa === filtroEmpresaDash)
    if (filtros.data_inicio) rows = rows.filter(r => r.data_criacao >= filtros.data_inicio)
    if (filtros.data_fim) rows = rows.filter(r => r.data_criacao <= filtros.data_fim)
    return rows
  }, [spRowsEnriquecidos, isAndamento, filtros, filtroEmpresaDash, siglasGarantia])

  const handleSortAnd = (col) => {
    if (sortColAnd === col) setSortDirAnd(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortColAnd(col); setSortDirAnd('asc') }
  }

  const spAndamentoOrdenado = useMemo(() => {
    const diasAberto = (r) => r.data_criacao
      ? Math.floor((new Date() - new Date(r.data_criacao + 'T12:00:00')) / 86400000)
      : -1
    const base = filtroMais14
      ? spAndamentoFiltrado.filter(r => diasAberto(r) > 14)
      : spAndamentoFiltrado
    const arr = [...base]
    arr.sort((a, b) => {
      if (sortColAnd === 'total') {
        return sortDirAnd === 'asc' ? a.total - b.total : b.total - a.total
      }
      if (sortColAnd === 'dias_aberto') {
        return sortDirAnd === 'asc' ? diasAberto(a) - diasAberto(b) : diasAberto(b) - diasAberto(a)
      }
      const va = String(a[sortColAnd] ?? '').toLowerCase()
      const vb = String(b[sortColAnd] ?? '').toLowerCase()
      const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true })
      return sortDirAnd === 'asc' ? cmp : -cmp
    })
    return arr
  }, [spAndamentoFiltrado, filtroMais14, sortColAnd, sortDirAnd])

  const tiposOsDisponiveis = useMemo(
    () => Array.from(new Set(dadosTodos.map(d => d.tipo_garantia_descricao).filter(Boolean))).sort(),
    [dadosTodos]
  )

  // Mapa sigla → descrição completa (ex: "G07" → "G07 - GARANTIA COMPLEMENTAR (MEC)")
  // Usado para enriquecer dados do SharePoint que chegam sem descrição
  const tipoOsDescMap = useMemo(() => {
    const map = new Map()
    for (const d of dadosTodos) {
      if (d.tipo_os_sigla?.trim() && d.tipo_garantia_descricao)
        map.set(d.tipo_os_sigla.trim(), d.tipo_garantia_descricao)
    }
    return map
  }, [dadosTodos])

  const dadosBase = useMemo(() => {
    let base = dados
    if (filtroEmpresaDash) base = base.filter(d => empresaNome(d) === filtroEmpresaDash)
    if (filtroTipoOS) base = base.filter(d => d.tipo_garantia_descricao === filtroTipoOS)
    return base
  }, [dados, filtroEmpresaDash, filtroTipoOS, empresaFantasiaMap])

  // OS que não foram encontradas no arquivo SharePoint — só faz sentido na tela Aberto
  const grpNaoEncontrado = !isAndamento ? dadosBase.filter(g => !isNaBase(g)) : []

  // Busca faturamento (ROF017) somente para as OS do alerta "não encontrada no SharePoint"
  // (grpNaoEncontrado) — são as candidatas a já terem sido faturadas ou canceladas.
  // Se encontrar NF emitida, grava os dados de faturamento e muda status para 'E',
  // fazendo a OS sair desta lista e passar a aparecer em Garantias DAF Faturadas.
  const handleBuscarFaturamentoLote = useCallback(async () => {
    if (grpNaoEncontrado.length === 0) return
    const confirmar = window.confirm(
      `Buscar faturamento para ${grpNaoEncontrado.length} OS não encontrada(s) no SharePoint?\n\nAs OS com Nota Fiscal emitida terão o status alterado automaticamente para "E — Nota Fiscal Emitida" e passarão a aparecer em Garantias DAF Faturadas.`
    )
    if (!confirmar) return

    setBuscandoFaturamentoLote(true)
    setProgressoBuscaLote({ atual: 0, total: grpNaoEncontrado.length })
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    let encontrados = 0
    let naoEncontrados = 0
    let erros = 0

    try {
      for (let i = 0; i < grpNaoEncontrado.length; i++) {
        const item = grpNaoEncontrado[i]
        setProgressoBuscaLote({ atual: i + 1, total: grpNaoEncontrado.length })

        // Prioriza a sigla embutida na própria descrição — evita usar tipo_os_sigla desatualizado
        // quando a OS tem múltiplas linhas/tipos no ROF001 (mesma causa do bug de sigla trocada).
        const candidatoDesc = (item.tipo_garantia_descricao?.trim() || '').split(' ')[0].toUpperCase()
        const siglaDaDescricao = /^[A-Z]\d{2,3}$/.test(candidatoDesc) ? candidatoDesc : ''
        const sigla = (siglaDaDescricao || item.tipo_os_sigla?.trim() || '').toUpperCase()
        if (!item.numero_os?.trim() || !sigla) { naoEncontrados++; continue }

        try {
          const params = new URLSearchParams()
          params.set('tipoSigla', sigla)
          if (item.tipo_garantia_descricao?.trim()) params.set('tipoOS', item.tipo_garantia_descricao.trim())
          const res = await fetch(`${BACKEND}/api/garantias/faturamento/${encodeURIComponent(item.numero_os.trim())}?${params}`)

          if (res.status === 404) { naoEncontrados++; continue }
          if (!res.ok) { erros++; continue }

          const data = await res.json()
          const nfEmitida = data.nf_numeros?.trim() && data.nf_data_emissao?.trim()
          if (!nfEmitida) { naoEncontrados++; continue }

          const nfListaJson = data.notas_fiscais?.length ? JSON.stringify(data.notas_fiscais) : null

          await apiService.updateGarantia(
            item.id,
            {
              numero_nf:          data.nf_numeros,
              data_emissao_nf:    data.nf_data_emissao,
              nf_valor_produto:   data.nf_valor_produto  ?? null,
              nf_valor_servico:   data.nf_valor_servico  ?? null,
              nf_margem_contabil: data.nf_margem_contabil ?? null,
              nf_lista_json:      nfListaJson,
              status_codigo:      'E',
            },
            user?.email,
            item.status_codigo
          )
          encontrados++
        } catch {
          erros++
        }
      }

      await loadData()
      alert(
        `Busca de faturamento concluída:\n` +
        `✅ ${encontrados} OS com NF emitida — status alterado para E e movida(s) para Faturadas\n` +
        `⏳ ${naoEncontrados} sem NF emitida ainda\n` +
        (erros > 0 ? `❌ ${erros} erro(s) na busca` : '')
      )
    } finally {
      setBuscandoFaturamentoLote(false)
      setProgressoBuscaLote(null)
    }
  }, [grpNaoEncontrado, user, loadData])

  const pendFechadas = useMemo(
    () => loading ? [] : spRows.filter(r => {
      const osNum    = String(r.os_numero ?? '').trim()
      const tipoSP   = tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)
      const key      = `${osNum}||${tipoSP}`
      const jaImportado = importadosSet.has(key)
        || importadosSemTipo.has(osNum)
        || importadosTodosPorOS.has(osNum)
      return !jaImportado &&
        (!filtroEmpresaDash || r.empresa_nome === filtroEmpresaDash || empresaNome(r) === filtroEmpresaDash)
    }),
    [spRows, importadosSet, importadosSemTipo, importadosTodosPorOS, loading, filtroEmpresaDash]
  )

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({ ...prev, [name]: value }))
  }

  const handleBuscar = (e) => { e.preventDefault(); loadData(filtros) }
  const handleLimpar = () => { setFiltros(FILTROS_VAZIOS); setStatusFiltro(''); setFiltroCard(null); loadData(FILTROS_VAZIOS) }

  const confirmarExcluir = (item) => {
    setIdExcluir(item.id)
    setNomeExcluir(`OS ${item.numero_os}`)
    setModalExcluir(true)
  }

  const handleExcluir = async () => {
    try { await apiService.deleteGarantia(idExcluir); await loadData(filtros) }
    catch (err) { alert('Erro ao excluir: ' + (err.message || String(err))) }
    finally { setModalExcluir(false) }
  }

  const handleExcluirLote = async () => {
    setExcluindoLote(true)
    const ids = [...selecionados]
    let erros = 0
    for (const id of ids) {
      try { await apiService.deleteGarantia(id) }
      catch { erros++ }
    }
    setSelecionados(new Set())
    setModalExcluirLote(false)
    setExcluindoLote(false)
    await loadData(filtros)
    if (erros > 0) alert(`${erros} registro(s) não puderam ser excluídos.`)
  }

  const toggleSelecionado = (id) =>
    setSelecionados(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleTodos = () =>
    setSelecionados(prev =>
      sortedDados.every(d => prev.has(d.id))
        ? new Set()
        : new Set(sortedDados.map(d => d.id))
    )

  const handleCardClick = (key) => {
    setFiltroCard(prev => prev === key ? null : key)
    setStatusFiltro('')
  }

  // ── Cálculos ─────────────────────────────────────────
  const STATUSES_FINAIS = ['FA', 'FR', 'Z']
  const STATUS_ANDAMENTO_GRUPO = ['B','C','E','G','M','N','P','Q','R','S','T','U','V','W','X','Y']
  const hoje = new Date()

  const diasParado = (g) => {
    if (!g.atualizado_em) return 0
    return Math.floor((hoje - new Date(g.atualizado_em)) / 86400000)
  }

  const isDigAtrasada = (g) => {
    if (g.status_codigo !== 'A' || !g.data_abertura_os) return false
    return Math.floor((hoje - new Date(g.data_abertura_os + 'T12:00:00')) / 86400000) > 1
  }

  const grpADigitar  = dadosBase.filter(g => g.status_codigo === 'A' && !isDigAtrasada(g))
  const grpAtrasado  = dadosBase.filter(g => isDigAtrasada(g))
  const grpAndamento = dadosBase.filter(g => STATUS_ANDAMENTO_GRUPO.includes(g.status_codigo))
  const grpAnd15     = grpAndamento.filter(g => diasParado(g) >= 14)
  const grpAprovada  = dadosBase.filter(g => g.status_codigo === 'FA')
  const grpRecusas   = dadosBase.filter(g => ['FR','Z'].includes(g.status_codigo))
  const grpNfEnviar  = dadosBase.filter(g => g.status_codigo === 'E')

  const sumValor = (arr) => arr.reduce((s, g) => s + Number(g.valor_pecas||0) + Number(g.valor_servicos||0), 0)

  const totalOsDistintas  = useMemo(() => new Set(dadosBase.map(d => d.numero_os)).size, [dadosBase])
  const totalValorPecas   = useMemo(() => dadosBase.reduce((s, g) => s + Number(g.valor_pecas    || 0), 0), [dadosBase])
  const totalValorServicos= useMemo(() => dadosBase.reduce((s, g) => s + Number(g.valor_servicos || 0), 0), [dadosBase])
  const totalValorGeral   = totalValorPecas + totalValorServicos
  const avgDias  = (arr) => {
    if (!arr.length) return null
    return Math.round(arr.reduce((s, g) => s + diasParado(g), 0) / arr.length)
  }

  // Notificações
  const processosAtivos  = dadosBase.filter(g => !STATUSES_FINAIS.includes(g.status_codigo))
  const alertasCriticos  = processosAtivos.filter(g => diasParado(g) >= 30).sort((a, b) => diasParado(b) - diasParado(a))
  const alertasAlerta    = processosAtivos.filter(g => diasParado(g) >= 21 && diasParado(g) < 30).sort((a, b) => diasParado(b) - diasParado(a))
  const alertasAtencao   = processosAtivos.filter(g => diasParado(g) >= 14 && diasParado(g) <= 20).sort((a, b) => diasParado(b) - diasParado(a))
  const totalAlertas = alertasCriticos.length + alertasAlerta.length + alertasAtencao.length

  const statusesPresentes = Object.keys(STATUS_MAP).filter(k => dadosBase.some(g => g.status_codigo === k))

  const dadosFiltrados = (() => {
    let base
    if (filtroCard) {
      switch (filtroCard) {
        case 'a_digitar':   base = grpADigitar; break
        case 'atrasado':    base = grpAtrasado; break
        case 'andamento':   base = grpAndamento; break
        case 'andamento15': base = grpAnd15; break
        case 'aprovada':    base = grpAprovada; break
        case 'recusas':     base = grpRecusas; break
        default: base = dadosBase
      }
    } else {
      base = statusFiltro ? dadosBase.filter(g => g.status_codigo === statusFiltro) : dadosBase
    }
    if (filtroNaBase === 'sim') return base.filter(g => isNaBase(g))
    if (filtroNaBase === 'nao') return base.filter(g => !isNaBase(g))
    return base
  })()

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortedDados = useMemo(() => {
    const arr = [...dadosFiltrados]
    arr.sort((a, b) => {
      let va, vb
      if (sortCol === 'total') {
        va = Number(a.valor_pecas || 0) + Number(a.valor_servicos || 0)
        vb = Number(b.valor_pecas || 0) + Number(b.valor_servicos || 0)
        return sortDir === 'asc' ? va - vb : vb - va
      }
      va = String(a[sortCol] ?? '').toLowerCase()
      vb = String(b[sortCol] ?? '').toLowerCase()
      const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [dadosFiltrados, sortCol, sortDir])

  const CARDS_GRUPOS = [
    {
      key: 'a_digitar', label: 'A Digitar', icon: FileText, items: grpADigitar,
      st: { bg: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-300', icoBg: 'bg-blue-100', icoTxt: 'text-blue-600', numTxt: 'text-blue-700', labelTxt: 'text-blue-500', divider: 'border-blue-200' },
    },
    {
      key: 'atrasado', label: 'Digitação Atrasada', icon: AlertTriangle, items: grpAtrasado,
      st: { bg: 'bg-slate-100', border: 'border-slate-300', ring: 'ring-slate-400', icoBg: 'bg-slate-200', icoTxt: 'text-slate-600', numTxt: 'text-slate-800', labelTxt: 'text-slate-500', divider: 'border-slate-200' },
    },
    {
      key: 'andamento', label: 'Aguardando Aprovação DAF', icon: Activity, items: grpAndamento,
      st: { bg: 'bg-indigo-50', border: 'border-indigo-200', ring: 'ring-indigo-300', icoBg: 'bg-indigo-100', icoTxt: 'text-indigo-600', numTxt: 'text-indigo-700', labelTxt: 'text-indigo-500', divider: 'border-indigo-200' },
    },
    {
      key: 'aprovada', label: 'Aprovada', icon: CheckCircle, items: grpAprovada,
      st: { bg: 'bg-green-50', border: 'border-green-200', ring: 'ring-green-300', icoBg: 'bg-green-100', icoTxt: 'text-green-600', numTxt: 'text-green-700', labelTxt: 'text-green-500', divider: 'border-green-200' },
    },
    {
      key: 'recusas', label: 'Recusas', icon: XCircle, items: grpRecusas,
      st: { bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-300', icoBg: 'bg-red-100', icoTxt: 'text-red-500', numTxt: 'text-red-600', labelTxt: 'text-red-400', divider: 'border-red-100' },
    },
  ]
  // ─────────────────────────────────────────────────────

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">{error}
        <button onClick={() => loadData(filtros)} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
            {isAndamento ? 'Garantias DAF Na Oficina' : 'Garantias DAF com Garantista'}
            <span className="relative group cursor-help">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span className="absolute top-full left-0 mt-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal">
                Fonte de dados: {isAndamento ? 'ROF001_OSABERTA.xlsx' : 'ROF001_OSABERTA_ENCERRADA.xlsx'}
              </span>
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            {isAndamento ? 'Ordens de serviço em andamento na oficina.' : 'Ordens de serviço encerrada em fase de digitação da garantia'}
          </p>
          <div className="mt-3"><GarantiasNav /></div>
        </div>
        <div className="flex items-center gap-2">
          {isAndamento && (
            <div className="flex items-center gap-3">
              {spLastModified && (
                <span className="text-[10px] text-slate-400">
                  Arquivo: {new Date(spLastModified).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={() => fetchSharePoint(true)}
                disabled={spLoading}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`h-3.5 w-3.5 text-blue-500 ${spLoading ? 'animate-spin' : ''}`} />
                {spLoading ? 'Atualizando...' : 'Atualizar SharePoint'}
              </button>
              {hasPermission('bi/garantias-daf') && (
                <button
                  onClick={() => navigate('/bi/garantias-daf', { state: { aba: 'oficina' } })}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors"
                >
                  <BarChart2 className="h-4 w-4 text-indigo-500" /> Ir para Dashboard
                </button>
              )}
            </div>
          )}
          {!isAndamento && (
            <div className="flex items-center gap-2">
              {spLastModified && (
                <span className="text-[10px] text-slate-400">
                  Arquivo: {new Date(spLastModified).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {canExcluirOS && selecionados.size > 0 && (
                <button
                  onClick={() => setModalExcluirLote(true)}
                  className="flex items-center gap-2 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" /> Excluir {selecionados.size} selecionado(s)
                </button>
              )}
              {hasPermission('bi/garantias-daf') && (
                <button
                  onClick={() => navigate('/bi/garantias-daf', { state: { aba: 'aberto' } })}
                  className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors"
                >
                  <BarChart2 className="h-4 w-4 text-indigo-500" /> Ir para Dashboard
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ALERTAS ── */}
      {!isAndamento && (grpNaoEncontrado.length > 0 || (!spLoading && pendFechadas.length > 0) || grpAnd15.length > 0) && (
        <div className="space-y-3">
        {(grpNaoEncontrado.length > 0 || (!spLoading && pendFechadas.length > 0)) && (
        <div className="flex gap-3">
          {grpNaoEncontrado.length > 0 && (
            <div className="flex flex-1 items-center gap-3 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
              <div className="p-1.5 bg-red-100 rounded-md shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-800">
                  {grpNaoEncontrado.length} OS não encontrada(s) no arquivo SharePoint
                </p>
                <p className="text-[10px] text-red-600 mt-0.5">
                  Podem ter sido faturadas ou canceladas — vale conferir.
                </p>
              </div>
              <button
                onClick={() => setFiltroNaBase(prev => prev === 'nao' ? '' : 'nao')}
                title={filtroNaBase === 'nao' ? 'Limpar filtro e mostrar todas as OS' : 'Filtrar a tabela abaixo só com estas OS'}
                className={`shrink-0 flex items-center justify-center p-2 rounded-md border transition-colors ${
                  filtroNaBase === 'nao'
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-white border-red-300 text-red-700 hover:bg-red-100'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleBuscarFaturamentoLote}
                disabled={buscandoFaturamentoLote}
                title="Busca faturamento (ROF017) para as OS não encontradas no arquivo SharePoint; se encontrar NF emitida, muda o status para E e move para Faturadas"
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
              >
                {buscandoFaturamentoLote
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileText className="h-3.5 w-3.5" />}
                {buscandoFaturamentoLote
                  ? `Buscando ${progressoBuscaLote?.atual ?? 0}/${progressoBuscaLote?.total ?? 0}...`
                  : 'Buscar'}
              </button>
            </div>
          )}
          {!spLoading && pendFechadas.length > 0 && (
            <div className="flex flex-1 items-center gap-3 bg-blue-50 border border-blue-300 rounded-lg px-4 py-3">
              <div className="p-1.5 bg-blue-100 rounded-md shrink-0">
                <Download className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-blue-800">
                  {pendFechadas.length} OS disponíve{pendFechadas.length === 1 ? 'l' : 'is'} para importar do SharePoint
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Ordens de serviço fechadas ainda não importadas para o sistema.
                </p>
              </div>
              <button
                onClick={() => setModalImportar(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Importar
              </button>
            </div>
          )}
        </div>
        )}
          {grpAnd15.length > 0 && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-300 rounded-lg px-4 py-3">
              <div className="p-1.5 bg-orange-100 rounded-md shrink-0">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-orange-800">
                  {grpAnd15.length} OS na oficina ≥14 dias aguardando análise
                </p>
                <p className="text-[10px] text-orange-600 mt-0.5">
                  Processos sem movimentação que requerem atenção.
                </p>
              </div>
              <button
                onClick={() => { setFiltroCard(prev => prev === 'andamento15' ? null : 'andamento15'); setStatusFiltro('') }}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${filtroCard === 'andamento15' ? 'bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {filtroCard === 'andamento15' ? 'Limpar filtro' : 'Ver quais'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── CARDS GRUPOS ── */}
      {!isAndamento && (
        <div className="grid grid-cols-6 gap-3">
          {CARDS_GRUPOS.map(c => (
            <CardGrupo
              key={c.key}
              icon={c.icon}
              label={c.label}
              count={c.items.length}
              valor={sumValor(c.items)}
              diasMedio={avgDias(c.items)}
              ativo={filtroCard === c.key}
              onClick={() => handleCardClick(c.key)}
              st={c.st}
            />
          ))}
          {/* Card resumo total em aberto */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="p-1 bg-violet-100 rounded">
                <BarChart2 className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Total Aberto</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-violet-700">{dadosBase.length}</span>
              <span className="text-[10px] text-violet-400">OS</span>
            </div>
            <div className="border-t border-violet-200 mt-1 pt-1.5 space-y-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-violet-400">OS distintas</span>
                <span className="font-semibold text-violet-700">{totalOsDistintas}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-violet-400">Peças</span>
                <span className="font-mono text-violet-600">{fmt(totalValorPecas)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-violet-400">Serviços</span>
                <span className="font-mono text-violet-600">{fmt(totalValorServicos)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-violet-200 pt-1 mt-1">
                <span className="font-bold text-violet-600">Total</span>
                <span className="font-bold font-mono text-violet-700">{fmt(totalValorGeral)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTROS AVANÇADOS ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="w-full flex items-center justify-between px-4 py-3 gap-3">
          <button
            onClick={() => setFiltrosAbertos(p => !p)}
            className="flex-1 flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors min-w-0"
          >
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            Filtros avançados
            {filtroEmpresaDash && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{filtroEmpresaDash}</span>}
            {filtroTipoOS && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">{filtroTipoOS}</span>}
            {filtroNaBase === 'sim' && <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-bold">● Encontrado</span>}
            {filtroNaBase === 'nao' && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-bold">● Não encontrado</span>}
            <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
          </button>
          {!!(filtroEmpresaDash || filtroTipoOS || filtroNaBase || filtros.numero_os || filtros.chassi || filtros.data_inicio || filtros.data_fim) && (
            <button
              type="button"
              onClick={() => { handleLimpar(); setFiltroEmpresaDash(''); setFiltroTipoOS(''); setFiltroNaBase('') }}
              className="whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors shrink-0"
            >
              <XCircle className="h-3 w-3" /> Limpar filtros
            </button>
          )}
        </div>
        {filtrosAbertos && (
          <form onSubmit={handleBuscar} className="px-4 pb-4 border-t border-slate-100">
            {/* Linha 1: Empresa | Tipo de OS | Período */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
                <select
                  value={filtroEmpresaDash}
                  onChange={e => { setFiltroEmpresaDash(e.target.value); setFiltroCard(null); setStatusFiltro('') }}
                  className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Todas as empresas</option>
                  {empresasDisponiveis.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de OS</label>
                <select
                  value={filtroTipoOS}
                  onChange={e => { setFiltroTipoOS(e.target.value); setFiltroCard(null); setStatusFiltro('') }}
                  className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Todos os tipos</option>
                  {tiposOsDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Período</label>
                <div className="flex gap-1">
                  <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange}
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                  <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange}
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
            {/* Linha 2: Nº OS | Chassi | No Arquivo SP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {[
                { name: 'numero_os', placeholder: 'Nº OS' },
                { name: 'chassi', placeholder: 'Chassi' },
              ].map(({ name, placeholder }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{placeholder}</label>
                  <input type="text" name={name} value={filtros[name]} onChange={handleFiltroChange}
                    placeholder={placeholder}
                    className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
              {!isAndamento && (
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">&nbsp;</label>
                  <div className="flex gap-2 items-center h-[30px]">
                    <button type="button"
                      onClick={() => setFiltroNaBase('')}
                      className={`whitespace-nowrap px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroNaBase === '' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                    >Todos</button>
                    <button type="button"
                      onClick={() => setFiltroNaBase('sim')}
                      className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroNaBase === 'sim' ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                    ><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Sharepoint</button>
                    <button type="button"
                      onClick={() => setFiltroNaBase('nao')}
                      className={`whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors ${filtroNaBase === 'nao' ? 'bg-red-600 text-white border-red-600' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
                    ><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Não encontrado</button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Search className="h-3.5 w-3.5" /> Buscar
              </button>
              <button type="button" onClick={() => { handleLimpar(); setFiltroEmpresaDash(''); setFiltroTipoOS(''); setFiltroNaBase('') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── FILTRO DE STATUS (somente Aberto) ── */}
      {!isAndamento && <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
          <button
            onClick={() => { setStatusFiltro(''); setFiltroCard(null) }}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              !statusFiltro && !filtroCard ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Todos ({dadosBase.length})
          </button>
          {statusesPresentes.map(k => {
            const count = dadosBase.filter(g => g.status_codigo === k).length
            const { label, cor } = STATUS_MAP[k]
            const ativo = statusFiltro === k
            return (
              <button key={k}
                onClick={() => { setStatusFiltro(ativo ? '' : k); setFiltroCard(null) }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
                  ativo ? `${cor} border-current ring-2 ring-offset-1 ring-current/30` : `${cor} border-transparent opacity-70 hover:opacity-100`
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>}

      {/* ── CARDS RESUMO ANDAMENTO ── */}
      {isAndamento && !spLoading && spAndamentoFiltrado.length > 0 && (() => {
        const totalOS       = spAndamentoFiltrado.length
        const osDistintas   = new Set(spAndamentoFiltrado.map(r => r.os_numero)).size
        // Deduplica por (OS, tipo) — evita duplicar quando mesma OS aparece várias vezes no mesmo tipo
        const dedupMap = new Map()
        for (const r of spAndamentoFiltrado) {
          const key = `${r.os_numero}||${r.tipo_os_sigla?.trim() || '—'}`
          if (!dedupMap.has(key)) dedupMap.set(key, r)
        }
        const rowsDedup     = Array.from(dedupMap.values())
        const totalPecas    = rowsDedup.reduce((s, r) => s + (r.produto  || 0), 0)
        const totalServicos = rowsDedup.reduce((s, r) => s + (r.servico  || 0), 0)
        const totalGeral    = totalPecas + totalServicos
        const mais14        = spAndamentoFiltrado.filter(r =>
          r.data_criacao && Math.floor((hoje - new Date(r.data_criacao + 'T12:00:00')) / 86400000) > 14
        ).length
        return (
          <div className="grid grid-cols-3 gap-3">
            {/* Card Tipos de OS */}
            {(() => {
              const tipoMap = new Map()
              for (const r of spAndamentoFiltrado) {
                const sigla = r.tipo_os_sigla?.trim() || '—'
                const desc  = r.tipo_os_descricao?.trim() || sigla
                if (!tipoMap.has(sigla)) tipoMap.set(sigla, { sigla, desc, count: 0, osNums: new Set(), produto: 0, servico: 0 })
                const entry = tipoMap.get(sigla)
                entry.count++
                if (!entry.osNums.has(r.os_numero)) {
                  entry.osNums.add(r.os_numero)
                  entry.produto += r.produto || 0
                  entry.servico += r.servico || 0
                }
              }
              const tipos = Array.from(tipoMap.values())
                .sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'))
              return (
                <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-indigo-100 rounded">
                      <FileText className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Tipos de OS</span>
                    <span className="ml-auto text-[10px] text-slate-400">{tipos.length} tipos</span>
                  </div>
                  <div className="overflow-y-auto max-h-52 divide-y divide-slate-50">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_40px_90px_90px] gap-2 pb-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <div>Tipo</div>
                      <div className="text-center">Qtd</div>
                      <div className="text-right">Peças</div>
                      <div className="text-right">Serviços</div>
                    </div>
                    {tipos.map(t => (
                      <div key={t.sigla} className="grid grid-cols-[1fr_40px_90px_90px] gap-2 py-1.5 text-[10px] hover:bg-slate-50/70">
                        <div className="font-semibold text-slate-700 truncate" title={t.desc}>{t.sigla}</div>
                        <div className="text-center font-bold text-indigo-600">{t.count}</div>
                        <div className="text-right font-mono text-slate-600">{fmt(t.produto)}</div>
                        <div className="text-right font-mono text-slate-600">{fmt(t.servico)}</div>
                      </div>
                    ))}
                  </div>
                  {tipos.length > 1 && (
                    <div className="grid grid-cols-[1fr_40px_90px_90px] gap-2 pt-2 mt-1 border-t border-slate-200 text-[10px] font-bold">
                      <div className="text-slate-500">Total</div>
                      <div className="text-center text-indigo-700">{totalOS}</div>
                      <div className="text-right font-mono text-slate-700">{fmt(totalPecas)}</div>
                      <div className="text-right font-mono text-slate-700">{fmt(totalServicos)}</div>
                    </div>
                  )}
                </div>
              )
            })()}
            {/* Card totais */}
            <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-sky-100 rounded">
                  <Activity className="h-4 w-4 text-sky-600" />
                </div>
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wide">Resumo Na Oficina</span>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between items-center border-b border-sky-100 pb-2">
                  <span className="text-sky-400">Total OS Distintas</span>
                  <span className="font-bold text-sky-700 text-base">{osDistintas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-400">Peças</span>
                  <span className="font-mono font-semibold text-sky-700">{fmt(totalPecas)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-400">Serviços</span>
                  <span className="font-mono font-semibold text-sky-700">{fmt(totalServicos)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-sky-200 pt-2 mt-1">
                  <span className="font-bold text-sky-600">Total Geral</span>
                  <span className="font-bold font-mono text-sky-800">{fmt(totalGeral)}</span>
                </div>
              </div>
            </div>
            {/* Card +14 dias */}
            {(() => {
              const rows14 = spAndamentoFiltrado.filter(r =>
                r.data_criacao && Math.floor((hoje - new Date(r.data_criacao + 'T12:00:00')) / 86400000) > 14
              )
              const dedup14Map = new Map()
              for (const r of rows14) {
                const key = `${r.os_numero}||${r.tipo_os_sigla?.trim() || '—'}`
                if (!dedup14Map.has(key)) dedup14Map.set(key, r)
              }
              const unicos14 = Array.from(dedup14Map.values())
              const pec14  = unicos14.reduce((s, r) => s + (r.produto  || 0), 0)
              const ser14  = unicos14.reduce((s, r) => s + (r.servico  || 0), 0)
              const tot14  = pec14 + ser14
              const ativo  = filtroMais14
              return (
                <div className={`border rounded-lg p-4 ${mais14 > 0 ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${mais14 > 0 ? 'bg-orange-100' : 'bg-slate-100'}`}>
                        <Clock className={`h-4 w-4 ${mais14 > 0 ? 'text-orange-600' : 'text-slate-400'}`} />
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-wide ${mais14 > 0 ? 'text-orange-600' : 'text-slate-500'}`}>
                        Mais de 14 Dias na Oficina
                      </span>
                    </div>
                    {mais14 > 0 && (
                      <button
                        onClick={() => setFiltroMais14(p => !p)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border transition-colors ${
                          ativo
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                        }`}
                      >
                        {ativo ? 'Limpar filtro' : 'Ver na tabela'}
                      </button>
                    )}
                  </div>
                  <div className={`text-4xl font-bold mb-3 ${mais14 > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{mais14}</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs border-t border-orange-200 pt-3">
                    <div className="flex justify-between">
                      <span className="text-orange-400">Peças</span>
                      <span className="font-mono font-semibold text-orange-700">{fmt(pec14)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-400">Serviços</span>
                      <span className="font-mono font-semibold text-orange-700">{fmt(ser14)}</span>
                    </div>
                    <div className="flex justify-between col-span-2 border-t border-orange-200 pt-1">
                      <span className="font-bold text-orange-600">Total</span>
                      <span className="font-bold font-mono text-orange-800">{fmt(tot14)}</span>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })()}

      {/* ── TABELA ANDAMENTO (SharePoint) ── */}
      {isAndamento && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          {spLoading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando dados do SharePoint...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {[
                    { col: 'os_numero',            label: 'Nº OS',                cls: 'whitespace-nowrap' },
                    { col: 'empresa_nome',          label: 'Empresa',              cls: 'whitespace-nowrap min-w-[280px]' },
                    { col: 'data_criacao',          label: 'Data Criação',         cls: 'whitespace-nowrap' },
                    { col: 'dias_aberto',           label: 'Dias',                 cls: 'whitespace-nowrap text-right' },
                    { col: 'tipo_os_sigla',         label: 'Tipo OS',              cls: 'whitespace-nowrap' },
                    { col: 'consultor_nome',        label: 'Consultor',            cls: 'whitespace-nowrap' },
                    { col: 'proprietario_veiculo',  label: 'Proprietário Veículo', cls: 'whitespace-nowrap min-w-[260px]' },
                    { col: 'veiculo_chassi',        label: 'Nº Chassi',            cls: 'whitespace-nowrap' },
                    { col: 'total',                 label: 'Total',                cls: 'whitespace-nowrap text-right' },
                  ].map(({ col, label, cls }) => (
                    <th key={col} onClick={() => handleSortAnd(col)}
                      className={`p-3 ${cls} cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors`}>
                      <span className={`flex items-center gap-1 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
                        {label}
                        <span className={sortColAnd === col ? 'text-blue-500' : 'text-slate-300'}>
                          {sortColAnd === col ? (sortDirAnd === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {spAndamentoOrdenado.length === 0 ? (
                  <tr><td colSpan="9" className="p-10 text-center text-slate-400">
                    {spRows.length === 0 ? 'SharePoint não configurado ou sem dados disponíveis.' : 'Nenhuma OS na oficina encontrada.'}
                  </td></tr>
                ) : spAndamentoOrdenado.map((r, idx) => {
                  const diasAberto = r.data_criacao ? Math.floor((hoje - new Date(r.data_criacao + 'T12:00:00')) / 86400000) : null
                  const diasCor = diasAberto === null ? 'text-slate-400'
                    : diasAberto >= 30 ? 'text-red-600 font-bold'
                    : diasAberto >= 15 ? 'text-yellow-600 font-semibold'
                    : 'text-green-700'
                  return (
                  <tr key={`${r.os_numero}_${r.tipo_os_sigla}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.os_numero || '—'}</td>
                    <td className="p-3 text-slate-700">{spEmpresaNome(r)}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{r.data_criacao ? new Date(r.data_criacao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className={`p-3 text-right whitespace-nowrap ${diasCor}`}>{diasAberto !== null ? `${diasAberto}d` : '—'}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{r.tipo_os_descricao || tipoOsDescMap.get(r.tipo_os_sigla?.trim()) || r.tipo_os_sigla || '—'}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{r.consultor_nome || '—'}</td>
                    <td className="p-3 text-slate-700">{r.proprietario_veiculo || '—'}</td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{r.veiculo_chassi ? r.veiculo_chassi.slice(-8) : '—'}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">{r.total > 0 ? fmt(r.total) : '—'}</td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {isAndamento && (
        <p className="text-[10px] text-slate-400">
          {spAndamentoFiltrado.length} OS na oficina no SharePoint
          {(filtros.numero_os || filtros.chassi || filtroEmpresaDash || filtros.data_inicio || filtros.data_fim) && ' (com filtros aplicados)'}
        </p>
      )}

      {/* ── TABELA ABERTO (Supabase) ── */}
      {!isAndamento && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto custom-scrollbar-light" style={{ maxHeight: '440px' }}>
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[2700px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">
                    <button onClick={toggleTodos} className="text-slate-400 hover:text-blue-500 transition-colors">
                      {sortedDados.length > 0 && sortedDados.every(d => selecionados.has(d.id))
                        ? <CheckSquare className="h-4 w-4 text-blue-500" />
                        : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  {[
                    { col: 'numero_os',              label: 'Nº OS',               cls: 'w-32' },
                    { col: 'empresa_nome',            label: 'Empresa',             cls: 'w-80' },
                    { col: 'data_abertura_os',        label: 'Data Criação',        cls: 'w-32' },
                    { col: 'data_fechamento_os',      label: 'Fechado em',          cls: 'w-36' },
                    { col: 'tipo_garantia_descricao', label: 'Tipo OS',             cls: 'w-56' },
                    { col: 'consultor_nome',          label: 'Consultor',           cls: 'w-72' },
                    { col: 'cliente',                 label: 'Proprietário Veículo',cls: 'w-72' },
                    { col: 'chassi',                  label: 'Nº Chassi',           cls: 'w-36' },
                    { col: 'total',                   label: 'Total',               cls: 'w-36 text-right' },
                    { col: 'numero_sg',               label: 'Nº SG',              cls: 'w-40' },
                    { col: 'data_sg',                 label: 'Data SG',             cls: 'w-28' },
                    { col: 'status_codigo',           label: 'Status',              cls: 'w-56' },
                  ].map(({ col, label, cls }) => (
                    <th key={col} onClick={() => handleSort(col)}
                      className={`p-3 ${cls} cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors`}>
                      <span className="flex items-center gap-1">
                        {label}
                        <span className={sortCol === col ? 'text-blue-500' : 'text-slate-300'}>
                          {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                        </span>
                      </span>
                    </th>
                  ))}
                  <th className="p-3 w-24 text-center sticky right-0 bg-slate-50 border-l border-slate-200">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {sortedDados.length === 0 ? (
                  <tr><td colSpan="14" className="p-10 text-center text-slate-400">Nenhuma garantia encontrada.</td></tr>
                ) : sortedDados.map(item => {
                  const vt = Number(item.valor_pecas || 0) + Number(item.valor_servicos || 0)
                  const st = getStatusDisplay(item)
                  const dp = diasParado(item)
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${selecionados.has(item.id) ? 'bg-blue-50/50' : dp >= 30 ? 'bg-red-50/40' : dp >= 15 ? 'bg-orange-50/30' : dp >= 7 ? 'bg-yellow-50/30' : ''}`}>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleSelecionado(item.id)} className="text-slate-400 hover:text-blue-500 transition-colors">
                          {selecionados.has(item.id)
                            ? <CheckSquare className="h-4 w-4 text-blue-500" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <span className={`shrink-0 w-2 h-2 rounded-full ${isNaBase(item) ? 'bg-green-500' : 'bg-red-500'}`} title={isNaBase(item) ? 'Encontrado no arquivo SP' : 'Não encontrado no arquivo SP'} />
                          {item.numero_os || '—'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-normal leading-snug">{empresaNome(item)}</td>
                      <td className="p-3 text-slate-500">{item.data_abertura_os ? new Date(item.data_abertura_os + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="p-3">
                        {item.data_fechamento_os
                          ? <span className="text-[11px] font-semibold text-green-700">{new Date(item.data_fechamento_os + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                          : <span className="text-[11px] font-semibold text-amber-600">Aberto</span>
                        }
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[160px]" title={item.tipo_garantia_descricao || item.tipo_os_sigla}>{item.tipo_garantia_descricao || item.tipo_os_sigla || '—'}</td>
                      <td className="p-3 text-slate-600">{item.consultor_nome || '—'}</td>
                      <td className="p-3 truncate max-w-[200px]" title={item.cliente}>{item.cliente || '—'}</td>
                      <td className="p-3 font-mono text-slate-500" title={item.chassi}>{item.chassi ? item.chassi.slice(-8) : '—'}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{vt > 0 ? fmt(vt) : '—'}</td>
                      <td className="p-3 font-mono text-slate-700">{item.numero_sg || '—'}</td>
                      <td className="p-3 text-slate-500">{item.data_sg ? new Date(item.data_sg + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="p-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cor}`}>{st.label}</span>
                      </td>
                      <td className="p-3 text-center sticky right-0 bg-white border-l border-slate-100 shadow-[-4px_0_12px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-center gap-1">
                          {canEditarOS && (
                            <button onClick={() => navigate(`/garantias-daf/${item.id}`)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canExcluirOS && (
                            <button onClick={() => confirmarExcluir(item)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      {!isAndamento && (
        <p className="text-[10px] text-slate-400">
          {dadosFiltrados.length} registro(s) exibido(s)
          {filtroCard && <> · filtrado por <strong>{CARDS_GRUPOS.find(c => c.key === filtroCard)?.label}</strong></>}
          {statusFiltro && <> · filtrado por <strong>{STATUS_MAP[statusFiltro]?.label}</strong></>}
          {dadosFiltrados.length !== dados.length && <> de {dados.length} total</>}
        </p>
      )}

      {/* MODAL IMPORTAR ABERTOS */}
      {modalImportar && (
        <GarantiasDafImportModal
          osJaImportadas={dadosTodos}
          onClose={() => setModalImportar(false)}
          onImported={() => { loadData(filtros) }}
        />
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Garantia</h3>
                <p className="text-xs text-slate-500">Confirma a exclusão permanente de <strong className="text-slate-800">"{nomeExcluir}"</strong>? O histórico de alterações também será apagado.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluir(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleExcluir} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Excluir em lote */}
      {modalExcluirLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Excluir {selecionados.size} registro(s)?</h3>
            <p className="text-xs text-slate-500 mb-5">
              Esta ação removerá permanentemente os {selecionados.size} registro(s) selecionados de Garantias DAF Aberto. Não é possível desfazer.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalExcluirLote(false)}
                disabled={excluindoLote}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirLote}
                disabled={excluindoLote}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-60"
              >
                {excluindoLote && <Loader2 className="h-3 w-3 animate-spin" />}
                {excluindoLote ? 'Excluindo...' : 'Sim, Excluir Todos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
