import React, { useState, useMemo } from 'react'
import {
  X, Download, CheckSquare, Square, Loader2,
  CheckCircle2, AlertCircle, Search, Receipt, Calendar, Info,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const fmt = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const fmtDate = (s) => {
  if (!s) return '—'
  try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s }
}

// Retorna o dia 1º de janeiro do ano atual até o último dia do mês atual como default
function defaultPeriodo() {
  const hoje = new Date()
  const ini  = new Date(hoje.getFullYear(), 0, 1)
  const fim  = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
  const fmt2 = (d) => d.toISOString().slice(0, 10)
  return { ini: fmt2(ini), fim: fmt2(fim) }
}

async function fetchFaturados(dataInicio, dataFim, numeroOS = null) {
  const params = new URLSearchParams()
  if (numeroOS) {
    // Quando OS específica: backend retorna todos os tipos dela sem filtrar data
    params.set('numeroOS', numeroOS)
  } else {
    if (dataInicio) params.set('dataInicio', dataInicio)
    if (dataFim)    params.set('dataFim',    dataFim)
  }

  const res = await fetch(`${BACKEND_URL}/api/garantias/faturados?${params}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erro ${res.status} ao buscar SharePoint`)
  }
  return res.json()
}

export default function GarantiasDafImportFaturadosModal({ onClose, onImported, osJaImportadas }) {
  const { user }    = useAuth()
  const defaults    = defaultPeriodo()

  // ── Estado de datas ────────────────────────────────────
  const [dataInicio, setDataInicio] = useState(defaults.ini)
  const [dataFim,    setDataFim]    = useState(defaults.fim)

  // ── Estado de dados ────────────────────────────────────
  const [shareRows,  setShareRows]  = useState(null)   // null = ainda não buscou
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  // ── Filtros da tabela (após a busca) ───────────────────
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroOS,      setFiltroOS]      = useState('')

  // ── Seleção e importação ───────────────────────────────
  const [selecionados,  setSelecionados]  = useState(new Set())
  const [importando,    setImportando]    = useState(false)
  const [importResult,  setImportResult]  = useState(null)
  const [empresasDim,   setEmpresasDim]   = useState([])
  const [tiposOS,       setTiposOS]       = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])

  // ── Popup de confirmação antes de importar ─────────────
  const [modalConfirmar,      setModalConfirmar]      = useState(false)
  const [confirmEmpresaId,    setConfirmEmpresaId]    = useState('')
  const [confirmTipoOSId,     setConfirmTipoOSId]     = useState('')
  const [confirmConsultorNome,setConfirmConsultorNome]= useState('')

  // Carrega cadastros uma vez
  useState(() => {
    apiService.getEmpresas()
      .then(d => setEmpresasDim(d.filter(e => e.ativo !== false)))
      .catch(() => {})
    apiService.getTiposOS()
      .then(d => setTiposOS(d.filter(t => t.ativo !== false && t.classificacao === 'Garantia')))
      .catch(() => {})
    apiService.getFuncionarios()
      .then(d => setFuncionarios(d.filter(f => f.ativo !== false)))
      .catch(() => {})
  })

  // Extrai só o código do tipo: "G01 - GARANTIA NORMAL..." → "G01"
  const tipoCode = (s) => String(s || '').trim().split(' ')[0].toUpperCase()

  // Chave composta: numero_os||código_tipo (ex: "134||G01")
  const importadosSet = useMemo(
    () => new Set((osJaImportadas || []).map(o =>
      `${String(o.numero_os).trim()}||${tipoCode(o.tipo_os_sigla) || tipoCode(o.tipo_garantia_descricao)}`
    )),
    [osJaImportadas]
  )
  // Fallback A: Supabase tem numero_os mas sem tipo registrado
  const importadosSemTipo = useMemo(
    () => new Set(
      (osJaImportadas || [])
        .filter(o => !tipoCode(o.tipo_os_sigla) && !tipoCode(o.tipo_garantia_descricao))
        .map(o => String(o.numero_os).trim())
    ),
    [osJaImportadas]
  )
  // Fallback B: todos os numero_os do Supabase — usado quando SharePoint não retorna tipo
  const importadosTodosPorOS = useMemo(
    () => new Set((osJaImportadas || []).map(o => String(o.numero_os).trim())),
    [osJaImportadas]
  )
  const jaFoiImportado = (r) => {
    if (importadosSet.has(rowId(r))) return true
    const osNum = String(r.os_numero ?? '').trim()
    const temTipoSP = tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)
    if (!temTipoSP) return importadosTodosPorOS.has(osNum)
    return importadosSemTipo.has(osNum)
  }

  const empresaLookup = useMemo(() => {
    const map = new Map()
    for (const e of empresasDim) {
      if (e.empresa_fantasia) map.set(e.empresa_fantasia.toLowerCase().trim(), e.id)
    }
    for (const e of empresasDim) {
      if (e.nome_empresa) map.set(e.nome_empresa.toLowerCase().trim(), e.id)
    }
    for (const e of empresasDim) {
      if (e.nome_empresa_sistema) map.set(e.nome_empresa_sistema.toLowerCase().trim(), e.id)
    }
    return map
  }, [empresasDim])

  const findEmpresaId = (nome) => {
    if (!nome) return null
    return empresaLookup.get(nome.toLowerCase().trim()) || null
  }

  // ── Busca ───────────────────────────────────────────────
  const buscarDados = async () => {
    setError(null)
    setSelecionados(new Set())
    setImportResult(null)
    setFiltroEmpresa('')
    setLoading(true)
    try {
      const osAlvo = filtroOS.trim() || null
      const rows = await fetchFaturados(dataInicio, dataFim, osAlvo)
      setShareRows(rows)
    } catch (err) {
      setError(err.message || String(err))
      setShareRows([])
    } finally {
      setLoading(false)
    }
  }

  // Siglas de tipo de O.S. classificadas como "Garantia" no cadastro — usadas para restringir
  // o resultado do ROF017 (que traz OS de todos os tipos) só às de garantia.
  const garantiaSiglas = useMemo(
    () => new Set(tiposOS.map(t => tipoCode(t.sigla)).filter(Boolean)),
    [tiposOS]
  )

  // ── Empresas disponíveis nos resultados (já restrito a garantia) ───
  const empresas = useMemo(() => {
    if (!shareRows) return []
    const rows = garantiaSiglas.size > 0
      ? shareRows.filter(r => garantiaSiglas.has(tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)))
      : shareRows
    const set = new Set(rows.map(r => r.empresa_nome).filter(Boolean))
    return Array.from(set).sort()
  }, [shareRows, garantiaSiglas])

  // ── Filtro de tabela (tipo garantia + OS + empresa) ────
  const rowsFiltradas = useMemo(() => {
    if (!shareRows) return []
    let rows = shareRows
    if (garantiaSiglas.size > 0) rows = rows.filter(r => garantiaSiglas.has(tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)))
    const os = filtroOS.trim()
    if (os) rows = rows.filter(r => String(r.os_numero ?? '').includes(os))
    if (filtroEmpresa) rows = rows.filter(r => r.empresa_nome === filtroEmpresa)
    return rows
  }, [shareRows, filtroEmpresa, filtroOS, garantiaSiglas])

  // ── Seleção ────────────────────────────────────────────
  // Chave composta: numero_os + código do tipo (ex: "134||G01")
  const rowId = (r) => `${String(r.os_numero ?? '').trim()}||${tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)}`

  const disponíveis = useMemo(
    () => rowsFiltradas.filter(r => !jaFoiImportado(r) && !!r.data_liberacao),
    [rowsFiltradas, importadosSet, importadosSemTipo]
  )

  const todosDispSelecionados =
    disponíveis.length > 0 && disponíveis.every(r => selecionados.has(rowId(r)))

  const toggleRow = (id) =>
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleTodos = () =>
    todosDispSelecionados
      ? setSelecionados(new Set())
      : setSelecionados(new Set(disponíveis.map(r => rowId(r))))

  // ── Importação (chamada após confirmação no popup) ─────
  const handleImportar = async () => {
    if (selecionados.size === 0 || !shareRows) return
    setModalConfirmar(false)
    setImportando(true)
    setImportResult(null)

    const empresaSel = empresasDim.find(e => e.id === confirmEmpresaId)
    const tipoSel    = tiposOS.find(t => t.id === confirmTipoOSId)

    const paraImportar = shareRows.filter(r => selecionados.has(rowId(r)))
    let ok = 0
    const erros = []

    for (const row of paraImportar) {
      try {
        await apiService.createGarantia({
          numero_os:               row.os_numero,
          empresa_id:              confirmEmpresaId || findEmpresaId(row.empresa_nome) || null,
          empresa_nome:            empresaSel?.empresa_fantasia || empresaSel?.nome_empresa || row.empresa_nome || '',
          cliente:                 row.proprietario_veiculo,
          consultor_nome:          confirmConsultorNome || row.consultor_nome || '',
          tipo_garantia_descricao: tipoSel?.tipo_os || row.tipo_os_descricao || '',
          tipo_os_sigla:           tipoSel?.sigla   || row.tipo_os_sigla     || '',
          chassi:                  row.chassi,
          data_abertura_os:        row.data_criacao,
          fechado:                 !!row.data_liberacao,
          data_fechamento_os:      row.data_liberacao || null,
          data_emissao_nf:         row.data_liberacao || null,
          nf_valor_produto:        row.nf_valor_produto,
          nf_valor_servico:        row.nf_valor_servico,
          valor_pecas:             row.nf_valor_produto,
          valor_servicos:          row.nf_valor_servico,
          status_codigo:           'E',
        }, user?.email)
        ok++
      } catch (err) {
        erros.push({ os: row.os_numero, msg: err.message || String(err) })
      }
    }

    setImportResult({ ok, erros })
    setSelecionados(new Set())
    setImportando(false)
    if (ok > 0) onImported()
  }

  // ── Render ─────────────────────────────────────────────
  const jaBuscou = shareRows !== null

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-7xl flex flex-col" style={{ height: '92vh' }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-green-600" />
              Importar OS Faturadas do SharePoint
              <span className="relative group cursor-help">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="absolute top-full left-0 mt-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal">
                  Fonte de dados: ROF017_FATURAMENTOPOROS
                </span>
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Importa para a base de Garantias DAF as OS de garantia já faturadas (nota fiscal emitida) no SharePoint.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* BARRA DE PERÍODO + BUSCA */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 shrink-0 flex-wrap">

          {/* Calendário De / Até */}
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data Criação</span>
            <input
              type="date"
              value={dataInicio}
              onChange={e => setDataInicio(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-green-500/20 outline-none w-[130px]"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={e => setDataFim(e.target.value)}
              className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-green-500/20 outline-none w-[130px]"
            />
          </div>

          {/* Filtro por Nº OS */}
          <div className="relative shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Nº OS..."
              value={filtroOS}
              onChange={e => setFiltroOS(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && buscarDados()}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-green-500/20 outline-none w-[110px]"
            />
          </div>

          {/* Botão Buscar */}
          <button
            onClick={() => buscarDados()}
            disabled={loading || (!filtroOS.trim() && (!dataInicio || !dataFim))}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-50"
          >
            {loading
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</>
              : <><Search className="h-3.5 w-3.5" /> Buscar</>
            }
          </button>

          {/* Filtro empresa (só após primeira busca) */}
          {jaBuscou && !loading && (
            <select
              value={filtroEmpresa}
              onChange={e => setFiltroEmpresa(e.target.value)}
              className="py-1.5 pl-2 pr-7 text-xs border border-slate-200 rounded-md text-slate-600 outline-none bg-white shrink-0 max-w-[240px]"
            >
              <option value="">Todas as empresas</option>
              {empresas.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          )}

          {/* Contador + botão importar (só após busca) */}
          {jaBuscou && !loading && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] text-slate-400">
                {rowsFiltradas.length} resultado(s) · {importadosSet.size} já importadas ·{' '}
                <strong className="text-green-600">{selecionados.size} selecionadas</strong>
              </span>
              <button
                onClick={() => { setConfirmEmpresaId(''); setConfirmTipoOSId(''); setConfirmConsultorNome(''); setModalConfirmar(true) }}
                disabled={selecionados.size === 0 || importando}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-40"
              >
                {importando
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...</>
                  : <><Download className="h-3.5 w-3.5" /> Importar {selecionados.size > 0 ? selecionados.size : ''} selecionada(s)</>
                }
              </button>
            </div>
          )}
        </div>

        {/* RESULTADO DA IMPORTAÇÃO */}
        {importResult && (
          <div className={`mx-5 mt-3 px-4 py-3 rounded-md text-xs flex flex-col gap-1 shrink-0 ${importResult.erros.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-semibold text-slate-800">
              {importResult.ok} OS importada(s) com sucesso.
              {importResult.erros.length > 0 && ` ${importResult.erros.length} com erro.`}
            </p>
            {importResult.erros.map((e, i) => (
              <p key={i} className="text-red-600">OS {e.os}: {e.msg}</p>
            ))}
          </div>
        )}

        {/* CORPO */}
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar-light" style={{ flex: '1 1 0', minHeight: 0 }}>

          {/* Estado inicial — ainda não buscou */}
          {!jaBuscou && !loading && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <div className="p-4 bg-slate-50 rounded-full">
                <Calendar className="h-10 w-10 text-slate-300" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Selecione o período de criação das OS</p>
                <p className="text-xs text-slate-400 mt-1">Preencha as datas acima e clique em <strong>Buscar</strong> para carregar os registros do SharePoint.</p>
              </div>
            </div>
          )}

          {/* Carregando */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Buscando registros no SharePoint...</p>
              <p className="text-[10px]">Lendo arquivo ROF017_FATURAMENTOPOROS · pode levar alguns segundos.</p>
            </div>
          )}

          {/* Erro */}
          {!loading && jaBuscou && error && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-xs text-red-600 font-semibold">{error}</p>
              <button onClick={() => buscarDados()} className="text-xs text-blue-600 underline">Tentar novamente</button>
            </div>
          )}

          {/* Tabela de resultados */}
          {!loading && jaBuscou && !error && (
            <table className="w-full text-left border-collapse min-w-[1600px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <button onClick={toggleTodos} className="flex items-center justify-center">
                      {todosDispSelecionados
                        ? <CheckSquare className="h-4 w-4 text-green-600" />
                        : <Square className="h-4 w-4 text-slate-300" />
                      }
                    </button>
                  </th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-24">Nº OS</th>
                  <th className="p-3 w-48">Empresa</th>
                  <th className="p-3 w-24">Data Criação</th>
                  <th className="p-3 w-28">Fechado em</th>
                  <th className="p-3 w-44">Tipo OS</th>
                  <th className="p-3 w-60">Consultor</th>
                  <th className="p-3">Proprietário do Veículo</th>
                  <th className="p-3 w-36">Chassi</th>
                  <th className="p-3 w-40">Modelo Veículo</th>
                  <th className="p-3 w-24 text-right">Produto</th>
                  <th className="p-3 w-24 text-right">Serviço</th>
                  <th className="p-3 w-28 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {rowsFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="p-10 text-center text-slate-400">
                      Nenhuma OS encontrada para o período selecionado.
                    </td>
                  </tr>
                ) : rowsFiltradas.map(row => {
                  const jaImportado = jaFoiImportado(row)
                  const id          = rowId(row)
                  const selecionado = selecionados.has(id)
                  const total       = (row.nf_valor_produto || 0) + (row.nf_valor_servico || 0)
                  return (
                    <tr
                      key={`${row.os_numero}_${row.tipo_os_descricao}`}
                      onClick={() => !jaImportado && !!row.data_liberacao && toggleRow(id)}
                      className={`transition-colors ${
                        jaImportado
                          ? 'bg-slate-50/60 cursor-default'
                          : !row.data_liberacao
                            ? 'bg-slate-50/40 cursor-default'
                            : selecionado
                              ? 'bg-green-50 cursor-pointer'
                              : 'hover:bg-slate-50/80 cursor-pointer'
                      }`}
                    >
                      <td className="p-3">
                        {!jaImportado && !!row.data_liberacao && (
                          <button onClick={e => { e.stopPropagation(); toggleRow(id) }} className="flex items-center justify-center">
                            {selecionado
                              ? <CheckSquare className="h-4 w-4 text-green-600" />
                              : <Square className="h-4 w-4 text-slate-300" />
                            }
                          </button>
                        )}
                      </td>
                      <td className="p-3">
                        {jaImportado
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" /> Importado</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700"><Receipt className="h-3 w-3" /> Disponível</span>
                        }
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{row.os_numero || '—'}</td>
                      <td className="p-3 text-slate-600 whitespace-normal leading-snug">{row.empresa_nome || '—'}</td>
                      <td className="p-3 text-slate-500">{fmtDate(row.data_criacao)}</td>
                      <td className="p-3">
                        {row.data_liberacao
                          ? <span className="text-[11px] font-semibold text-green-700">{fmtDate(row.data_liberacao)}</span>
                          : <span className="text-[11px] font-semibold text-amber-600">Pendente</span>
                        }
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[160px]" title={row.tipo_os_descricao}>{row.tipo_os_descricao || '—'}</td>
                      <td className="p-3 text-slate-600">{row.consultor_nome || '—'}</td>
                      <td className="p-3 truncate max-w-[180px]" title={row.proprietario_veiculo}>{row.proprietario_veiculo || '—'}</td>
                      <td className="p-3 font-mono text-slate-500">{row.chassi || '—'}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]" title={row.modelo_veiculo}>{row.modelo_veiculo || '—'}</td>
                      <td className="p-3 text-right text-slate-700">{row.nf_valor_produto > 0 ? fmt(row.nf_valor_produto) : '—'}</td>
                      <td className="p-3 text-right text-slate-700">{row.nf_valor_servico > 0 ? fmt(row.nf_valor_servico) : '—'}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{total > 0 ? fmt(total) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* POPUP CONFIRMAR IMPORTAÇÃO */}
        {modalConfirmar && (
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-[460px]">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Download className="h-4 w-4 text-green-600" />
                  Completar informações da importação
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Estes dados não constam no arquivo ROF017. Serão aplicados a todas as <strong>{selecionados.size}</strong> OS selecionadas.
                </p>
              </div>
              <div className="p-5 space-y-4">
                {/* Empresa */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Nome Fantasia <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={confirmEmpresaId}
                    onChange={e => setConfirmEmpresaId(e.target.value)}
                    className="w-full py-2 pl-3 pr-8 text-xs border border-slate-200 rounded-md text-slate-700 outline-none bg-white focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">Selecione a empresa...</option>
                    {empresasDim.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.empresa_fantasia || e.nome_empresa || e.nome_empresa_sistema}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Tipo de O.S. */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Tipo de O.S. <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={confirmTipoOSId}
                    onChange={e => setConfirmTipoOSId(e.target.value)}
                    className="w-full py-2 pl-3 pr-8 text-xs border border-slate-200 rounded-md text-slate-700 outline-none bg-white focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">Selecione o tipo de O.S....</option>
                    {[...tiposOS].sort((a, b) => String(a.tipo_os || '').localeCompare(String(b.tipo_os || ''), 'pt-BR')).map(t => (
                      <option key={t.id} value={t.id}>{t.tipo_os}</option>
                    ))}
                  </select>
                </div>
                {/* Consultor */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Consultor / Funcionário <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={confirmConsultorNome}
                    onChange={e => setConfirmConsultorNome(e.target.value)}
                    className="w-full py-2 pl-3 pr-8 text-xs border border-slate-200 rounded-md text-slate-700 outline-none bg-white focus:ring-2 focus:ring-green-500/20"
                  >
                    <option value="">Selecione o consultor...</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.nome_funcionario}>{f.nome_funcionario}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <button
                  onClick={() => setModalConfirmar(false)}
                  className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportar}
                  disabled={!confirmEmpresaId || !confirmTipoOSId || !confirmConsultorNome}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-40"
                >
                  <Download className="h-3.5 w-3.5" /> Confirmar e importar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 rounded-b-xl">
          <p className="text-[10px] text-slate-400">
            Linhas já importadas ou sem Data Liberação não podem ser selecionadas.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  )
}
