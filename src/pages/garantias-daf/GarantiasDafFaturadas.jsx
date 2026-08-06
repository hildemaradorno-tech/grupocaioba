import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { useNavigate } from 'react-router-dom'
import {
  Search, Edit2, ShieldAlert, FileText,
  AlertTriangle, Filter, RotateCcw, Download,
  XCircle, Truck, ArrowUp, ArrowDown, Link2, Link2Off, Info,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import GarantiasDafImportFaturadosModal from './GarantiasDafImportFaturadosModal'
import GarantiasNav from './GarantiasNav'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const fmtData  = (s) => { if (!s) return '—'; try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }

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

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const FILTROS_VAZIOS = { numero_os: '', chassi: '', numero_nf: '', data_inicio: '', data_fim: '' }

function CardGrupo({ icon: Icon, label, count, ativo, onClick, st }) {
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
      <p className={`text-[9px] ${st.labelTxt} mt-0.5`}>OS</p>
    </button>
  )
}

export default function GarantiasDafFaturadas() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, hasActionOrDefault } = useAuth()
  const canEditarOS = hasActionOrDefault('garantias-daf-faturadas', 'editar')
  const canExcluirOS = hasActionOrDefault('garantias-daf-faturadas', 'excluir')

  const [dados, setDados] = useState([])
  const [dadosTodos, setDadosTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useSessionState('daf_fat_filtros', FILTROS_VAZIOS)
  const [filtrosAbertos, setFiltrosAbertos] = useSessionState('daf_fat_filtros_abertos', false)
  const [filtroCard, setFiltroCard] = useSessionState('daf_fat_card', null)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [modalImportarFaturados, setModalImportarFaturados] = useState(false)
  const [filtroEmpresaDash, setFiltroEmpresaDash] = useSessionState('daf_fat_empresa', '')
  const [idExcluir, setIdExcluir] = useState(null)
  const [nomeExcluir, setNomeExcluir] = useState('')
  const [sortCol, setSortCol] = useSessionState('daf_fat_sort_col', 'data_abertura_os')
  const [sortDir, setSortDir] = useSessionState('daf_fat_sort_dir', 'desc')
  const [empresasDim, setEmpresasDim] = useState([])
  const [titulosOsSet, setTitulosOsSet] = useState(new Set())
  const [rof001LastModified, setRof001LastModified] = useState(null)

  const loadData = useCallback(async (f = filtros) => {
    setLoading(true); setError(null)
    try {
      const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
      const todos = await apiService.getAllGarantiasParaImport({ ...filtrosEmpresa })
      setDadosTodos(todos)
      const garantias = await apiService.getGarantias({ ...f, ...filtrosEmpresa, status_in: ['E', 'F'] })
      setDados(garantias)
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }, [filtros, isAdmin, empresasPermitidas])

  const carregarVinculoTitulos = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/garantias/financeiro/titulos`)
      const data = r.ok ? await r.json() : { rows: [] }
      setTitulosOsSet(new Set((data.rows ?? []).map(row => String(row.os_numero ?? '').trim()).filter(Boolean)))
    } catch {}
  }, [])

  useEffect(() => {
    loadData(filtros)
    const hasActive = Object.values(filtros).some(v => !!v) || !!filtroEmpresaDash
    if (!hasActive) setFiltrosAbertos(false)
    apiService.getEmpresas().then(d => setEmpresasDim(d.filter(e => e.ativo !== false))).catch(() => {})
    carregarVinculoTitulos()
    fetch(`${BACKEND_URL}/api/garantias/sharepoint/aberta`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setRof001LastModified(data.lastModified ?? null))
      .catch(() => {})
  }, [isAdmin, empresasPermitidas])

  // empresa_id → empresa_fantasia (fallback nome_empresa)
  const empresaFantasiaMap = useMemo(() => {
    const m = new Map()
    for (const e of empresasDim) m.set(e.id, e.empresa_fantasia || e.nome_empresa || e.nome_empresa_sistema || '')
    return m
  }, [empresasDim])

  // nome_empresa_sistema → empresa_fantasia — resolve registros sem empresa_id (ex: importados direto do
  // SharePoint) que podem ter o nome gravado com/sem acento, evitando duplicar a empresa no seletor.
  const sistemaNomeMap = useMemo(() => {
    const m = new Map()
    for (const e of empresasDim) {
      const sistema = String(e.nome_empresa_sistema || '').trim()
      if (sistema) m.set(sistema, e.empresa_fantasia || sistema)
    }
    return m
  }, [empresasDim])

  const empresaNome = (item) => {
    if (item.empresa_id) {
      const byId = empresaFantasiaMap.get(item.empresa_id)
      if (byId) return byId
    }
    if (item.empresa_nome) {
      const bySistema = sistemaNomeMap.get(String(item.empresa_nome).trim())
      if (bySistema) return bySistema
    }
    return item.empresa_nome || '—'
  }

  const tipoCode = (s) => String(s || '').trim().split(' ')[0].toUpperCase()

  const importadosSet = useMemo(
    () => new Set(dadosTodos.map(d =>
      `${String(d.numero_os).trim()}||${tipoCode(d.tipo_os_sigla) || tipoCode(d.tipo_garantia_descricao)}`
    )),
    [dadosTodos]
  )
  const importadosSemTipo = useMemo(
    () => new Set(
      dadosTodos
        .filter(d => !tipoCode(d.tipo_os_sigla) && !tipoCode(d.tipo_garantia_descricao))
        .map(d => String(d.numero_os).trim())
    ),
    [dadosTodos]
  )
  const importadosTodosPorOS = useMemo(
    () => new Set(dadosTodos.map(d => String(d.numero_os).trim())),
    [dadosTodos]
  )

  const empresasDisponiveis = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const d of dadosTodos) {
      const fantasia = empresaNome(d)
      if (fantasia && fantasia !== '—' && !seen.has(fantasia)) { seen.add(fantasia); list.push({ fantasia, empresa_nome: d.empresa_nome, empresa_id: d.empresa_id }) }
    }
    return list.sort((a, b) => a.fantasia.localeCompare(b.fantasia, 'pt-BR'))
  }, [dadosTodos, empresaFantasiaMap, sistemaNomeMap])

  const dadosBase = useMemo(
    () => filtroEmpresaDash
      ? dados.filter(d => empresaNome(d) === filtroEmpresaDash)
      : dados,
    [dados, filtroEmpresaDash, empresaFantasiaMap, sistemaNomeMap]
  )

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros(prev => ({ ...prev, [name]: value }))
  }

  const handleBuscar = (e) => { e.preventDefault(); loadData(filtros) }
  const handleLimpar = () => { setFiltros(FILTROS_VAZIOS); setFiltroCard(null); loadData(FILTROS_VAZIOS) }

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

  const handleCardClick = (key) => {
    setFiltroCard(prev => prev === key ? null : key)
  }

  const hoje = new Date()

  const diasSemEnvio = (g) => {
    if (g.data_envio_fabrica) return null
    if (!g.data_emissao_nf) return null
    return Math.floor((hoje - new Date(g.data_emissao_nf + 'T12:00:00')) / 86400000)
  }

  // Crítico e "a enviar" particionam TODAS as não-enviadas (status ≠ F), inclusive as sem
  // data_emissao_nf preenchida — evita registros "sumirem" da soma dos cards por dado incompleto.
  const isCritico = (g) => { const d = diasSemEnvio(g); return d !== null && d > 5 }
  const grpEnviado = dadosBase.filter(g => g.status_codigo === 'F')
  const grpCritico = dadosBase.filter(g => g.status_codigo !== 'F' && isCritico(g))
  const grpAEnviar = dadosBase.filter(g => g.status_codigo !== 'F' && !isCritico(g))
  const grpSemVinculo = dadosBase.filter(g => !titulosOsSet.has(String(g.numero_os ?? '').trim()))

  const dadosFiltrados = (() => {
    if (filtroCard) {
      switch (filtroCard) {
        case 'total':       return dadosBase
        case 'a_enviar':    return grpAEnviar
        case 'critico':     return grpCritico
        case 'enviado':     return grpEnviado
        case 'sem_vinculo': return grpSemVinculo
        default: return dadosBase
      }
    }
    return dadosBase
  })()

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortedDados = useMemo(() => {
    const arr = [...dadosFiltrados]
    arr.sort((a, b) => {
      if (sortCol === 'total') {
        const va = Number(a.valor_pecas || 0) + Number(a.valor_servicos || 0)
        const vb = Number(b.valor_pecas || 0) + Number(b.valor_servicos || 0)
        return sortDir === 'asc' ? va - vb : vb - va
      }
      const va = String(a[sortCol] ?? '').toLowerCase()
      const vb = String(b[sortCol] ?? '').toLowerCase()
      const cmp = va.localeCompare(vb, 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [dadosFiltrados, sortCol, sortDir])

  const CARDS_GRUPOS = [
    {
      key: 'total', label: 'Total Faturadas', icon: FileText, items: dadosBase,
      st: { bg: 'bg-sky-50', border: 'border-sky-200', ring: 'ring-sky-300', icoBg: 'bg-sky-100', icoTxt: 'text-sky-600', numTxt: 'text-sky-700', labelTxt: 'text-sky-500', divider: 'border-sky-200' },
    },
    {
      key: 'a_enviar', label: 'Nota Fiscal a Enviar', icon: FileText, items: grpAEnviar,
      st: { bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-300', icoBg: 'bg-amber-100', icoTxt: 'text-amber-600', numTxt: 'text-amber-700', labelTxt: 'text-amber-500', divider: 'border-amber-200' },
    },
    {
      key: 'critico', label: 'Crítico — Sem Envio >5d', icon: AlertTriangle, items: grpCritico,
      st: { bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-300', icoBg: 'bg-red-100', icoTxt: 'text-red-500', numTxt: 'text-red-600', labelTxt: 'text-red-400', divider: 'border-red-100' },
    },
    {
      key: 'enviado', label: 'Processo Enviado', icon: Truck, items: grpEnviado,
      st: { bg: 'bg-blue-100', border: 'border-blue-300', ring: 'ring-blue-400', icoBg: 'bg-blue-200', icoTxt: 'text-blue-700', numTxt: 'text-blue-800', labelTxt: 'text-blue-600', divider: 'border-blue-300' },
    },
    {
      key: 'sem_vinculo', label: 'Não Identificado — Títulos a Receber', icon: Link2Off, items: grpSemVinculo,
      st: { bg: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-300', icoBg: 'bg-orange-100', icoTxt: 'text-orange-600', numTxt: 'text-orange-700', labelTxt: 'text-orange-500', divider: 'border-orange-200' },
    },
  ]

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
            Garantias DAF Faturadas
            <span className="relative group cursor-help">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span className="absolute top-full left-0 mt-2 w-72 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal">
                Fonte: ROF001_OSABERTA_ENCERRADA.xlsx e ROF017_FATURAMENTOPOROS.xlsx
              </span>
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Ordens de serviço com nota fiscal emitida (Status E).
          </p>
          <div className="mt-3"><GarantiasNav /></div>
        </div>
        <div className="flex items-center gap-2">
          {rof001LastModified && (
            <span className="text-[10px] text-slate-400">
              Arquivo: <strong className="text-slate-500">{new Date(rof001LastModified).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
            </span>
          )}
          <button
            onClick={() => setModalImportarFaturados(true)}
            className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors"
          >
            <Download className="h-4 w-4 text-green-500" /> Importar Faturados
          </button>
        </div>
      </div>

      {/* ── CARDS GRUPOS ── */}
      <div className="grid grid-cols-5 gap-4">
        {CARDS_GRUPOS.map(c => (
          <CardGrupo
            key={c.key}
            icon={c.icon}
            label={c.label}
            count={c.items.length}
            ativo={filtroCard === c.key}
            onClick={() => handleCardClick(c.key)}
            st={c.st}
          />
        ))}
      </div>

      {/* ── FILTROS AVANÇADOS ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <button
          onClick={() => setFiltrosAbertos(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filtros avançados
            {filtroEmpresaDash && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">{filtroEmpresaDash}</span>}
          </span>
          <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
        </button>
        {filtrosAbertos && (
          <form onSubmit={handleBuscar} className="px-4 pb-4 border-t border-slate-100">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mt-3">
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
                <select
                  value={filtroEmpresaDash}
                  onChange={e => { setFiltroEmpresaDash(e.target.value); setFiltroCard(null) }}
                  className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">Todas as empresas</option>
                  {empresasDisponiveis.map(e => <option key={e.fantasia} value={e.fantasia}>{e.fantasia}</option>)}
                </select>
              </div>
              {[
                { name: 'numero_os', placeholder: 'Nº OS' },
                { name: 'chassi', placeholder: 'Chassi' },
                { name: 'numero_nf', placeholder: 'Nº NF' },
              ].map(({ name, placeholder }) => (
                <div key={name} className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{placeholder}</label>
                  <input type="text" name={name} value={filtros[name]} onChange={handleFiltroChange}
                    placeholder={placeholder}
                    className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
              <div className="flex flex-col gap-1 lg:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Período</label>
                <div className="flex gap-1">
                  <input type="date" name="data_inicio" value={filtros.data_inicio} onChange={handleFiltroChange}
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                  <input type="date" name="data_fim" value={filtros.data_fim} onChange={handleFiltroChange}
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                <Search className="h-3.5 w-3.5" /> Buscar
              </button>
              <button type="button" onClick={() => { handleLimpar(); setFiltroEmpresaDash('') }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Limpar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── TABELA ── */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {[
                  { col: 'numero_os',               label: 'Nº OS',                cls: 'whitespace-nowrap' },
                  { col: 'empresa_nome',             label: 'Empresa',              cls: 'whitespace-nowrap min-w-[220px]' },
                  { col: 'tipo_garantia_descricao',  label: 'Tipo OS',              cls: 'whitespace-nowrap' },
                  { col: 'consultor_nome',           label: 'Consultor',            cls: 'whitespace-nowrap' },
                  { col: 'cliente',                  label: 'Proprietário Veículo', cls: 'whitespace-nowrap min-w-[200px]' },
                  { col: 'chassi',                   label: 'Nº Chassi',            cls: 'whitespace-nowrap' },
                  { col: 'total',                    label: 'Total',                cls: 'whitespace-nowrap text-right' },
                  { col: 'numero_sg',                label: 'Nº SG',               cls: 'whitespace-nowrap' },
                  { col: 'numero_nf',                label: 'Nº NF',               cls: 'whitespace-nowrap' },
                  { col: 'data_emissao_nf',          label: 'Emissão NF',          cls: 'whitespace-nowrap' },
                  { col: 'data_envio_fabrica',       label: 'Envio Fábrica',       cls: 'whitespace-nowrap' },
                  { col: 'status_codigo',            label: 'Status',              cls: 'whitespace-nowrap w-full' },
                ].map(({ col, label, cls }) => (
                  <th key={col} onClick={() => handleSort(col)}
                    className={`p-3 ${cls} cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors`}>
                    <span className={`flex items-center gap-1 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
                      {label}
                      <span className={sortCol === col ? 'text-blue-500' : 'text-slate-300'}>
                        {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </span>
                  </th>
                ))}
                <th className="p-3 whitespace-nowrap text-center sticky right-0 bg-slate-50 border-l border-slate-200">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {sortedDados.length === 0 ? (
                <tr><td colSpan="13" className="p-10 text-center text-slate-400">Nenhuma garantia faturada encontrada.</td></tr>
              ) : sortedDados.map(item => {
                const vt = Number(item.valor_pecas || 0) + Number(item.valor_servicos || 0)
                const dc = diasSemEnvio(item)
                // Status E usa a mesma cor do card correspondente: âmbar (Nota Fiscal a Enviar) ou
                // vermelho (Crítico — Sem Envio >5d), conforme os dias desde a emissão da NF.
                const st = item.status_codigo === 'E'
                  ? { label: STATUS_MAP.E.label, cor: dc !== null && dc > 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700' }
                  : STATUS_MAP[item.status_codigo] || { label: item.status_codigo, cor: 'bg-slate-100 text-slate-500' }
                return (
                  <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${dc !== null && dc > 5 ? 'bg-red-50/40' : ''}`}>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/garantias-daf/${item.id}`, { state: { from: '/garantias-daf-faturadas' } })}
                          className={`shrink-0 p-0.5 rounded transition-colors ${item.data_envio_fabrica ? 'hover:bg-slate-100' : 'bg-amber-100 hover:bg-amber-200'}`}
                          title={item.data_envio_fabrica
                            ? `Enviado para fábrica em ${fmtData(item.data_envio_fabrica)} — clique para editar`
                            : 'Ainda não enviado para fábrica — clique para informar a data de envio'}
                        >
                          {item.data_envio_fabrica
                            ? <ArrowUp className="h-3.5 w-3.5 text-green-500" />
                            : <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/garantias-daf-titulos', { state: { osNumero: item.numero_os } })}
                          className={`shrink-0 p-0.5 rounded transition-colors ${titulosOsSet.has(String(item.numero_os ?? '').trim()) ? 'hover:bg-slate-100' : 'bg-orange-100 hover:bg-orange-200'}`}
                          title={titulosOsSet.has(String(item.numero_os ?? '').trim())
                            ? 'Vinculado a título em Títulos a Receber — clique para ver'
                            : 'Sem vínculo em Títulos a Receber — clique para conferir'}
                        >
                          {titulosOsSet.has(String(item.numero_os ?? '').trim())
                            ? <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                            : <Link2Off className="h-3.5 w-3.5 text-orange-600" />
                          }
                        </button>
                        <span className="font-mono font-bold text-slate-900">{item.numero_os || '—'}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{empresaNome(item)}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap" title={item.tipo_garantia_descricao || item.tipo_os_sigla}>{item.tipo_garantia_descricao || item.tipo_os_sigla || '—'}</td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{item.consultor_nome || '—'}</td>
                    <td className="p-3 text-slate-700">{item.cliente || '—'}</td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{item.chassi ? item.chassi.slice(-8) : '—'}</td>
                    <td className="p-3 text-right font-semibold text-slate-900 whitespace-nowrap">{vt > 0 ? fmt(vt) : '—'}</td>
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{item.numero_sg || '—'}</td>
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">{item.numero_nf || '—'}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{item.data_emissao_nf ? new Date(item.data_emissao_nf + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{item.data_envio_fabrica ? new Date(item.data_envio_fabrica + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${st.cor}`}>{st.label}</span>
                    </td>
                    <td className="p-3 text-center sticky right-0 bg-white border-l border-slate-100 shadow-[-4px_0_12px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-center gap-1">
                        {canEditarOS && (
                          <button onClick={() => navigate(`/garantias-daf/${item.id}`, { state: { from: '/garantias-daf-faturadas' } })} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canExcluirOS && (
                        <button onClick={() => confirmarExcluir(item)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                          <XCircle className="h-3.5 w-3.5" />
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
      <p className="text-[10px] text-slate-400">
        {dadosFiltrados.length} registro(s) exibido(s)
        {filtroCard && <> · filtrado por <strong>{CARDS_GRUPOS.find(c => c.key === filtroCard)?.label ?? filtroCard}</strong></>}
        {dadosFiltrados.length !== dadosBase.length && <> de {dadosBase.length} total</>}
      </p>

      {/* MODAL IMPORTAR FATURADOS */}
      {modalImportarFaturados && (
        <GarantiasDafImportFaturadosModal
          osJaImportadas={dadosTodos}
          onClose={() => setModalImportarFaturados(false)}
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
    </div>
  )
}
