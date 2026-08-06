import React, { useEffect, useState, useMemo } from 'react'
import {
  X, RefreshCw, Download, CheckSquare, Square, Loader2,
  Clock, AlertCircle, Search,
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

// Busca as OS do SharePoint (ROF001_OSABERTA_ENCERRADA)
async function fetchSharepointOs(forceRefresh = false) {
  const endpoint = forceRefresh
    ? `${BACKEND_URL}/api/garantias/sharepoint/encerrada/refresh`
    : `${BACKEND_URL}/api/garantias/sharepoint/encerrada`
  const method = forceRefresh ? 'POST' : 'GET'
  const res = await fetch(endpoint, { method })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Erro ${res.status} ao buscar SharePoint`)
  }
  return res.json()
}

export default function GarantiasDafImportModal({ onClose, onImported, osJaImportadas }) {
  const { user } = useAuth()

  const [shareRows, setShareRows]       = useState([])
  const [lastModified, setLastModified] = useState(null)
  const [loading, setLoading]           = useState(true)
  const [refreshing, setRefreshing]     = useState(false)
  const [error, setError]               = useState(null)
  const [busca, setBusca]           = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [selecionados, setSelecionados] = useState(new Set())
  const [importando, setImportando] = useState(false)
  const [importResult, setImportResult] = useState(null) // { ok, erros }
  const [empresasDim, setEmpresasDim] = useState([])    // dim_empresas para lookup de empresa_id

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
    // Fallback: se existe no Supabase só pelo numero_os (tipo pode ter sido salvo diferente)
    const osNum = String(r.os_numero ?? '').trim()
    return importadosTodosPorOS.has(osNum)
  }

  // Mapa nome (lowercase) → empresa_id para resolução durante importação
  // Prioridade: nome_empresa_sistema > nome_empresa > empresa_fantasia
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

  const findEmpresaId = (empresaNome) => {
    if (!empresaNome) return null
    return empresaLookup.get(empresaNome.toLowerCase().trim()) || null
  }

  const load = async (forceRefresh = false) => {
    setError(null)
    if (forceRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await fetchSharepointOs(forceRefresh)
      setShareRows(result.rows ?? result)
      setLastModified(result.lastModified ?? null)
      setSelecionados(new Set())
      setImportResult(null)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load(false) }, [])
  useEffect(() => {
    apiService.getEmpresas()
      .then(data => setEmpresasDim(data.filter(e => e.ativo !== false)))
      .catch(() => {})
  }, [])

  const empresas = useMemo(() => {
    const set = new Set(shareRows.map(r => r.empresa_nome).filter(Boolean))
    return Array.from(set).sort()
  }, [shareRows])

  // Chave composta: numero_os + código do tipo (ex: "134||G01")
  // tipoCode normaliza qualquer formato: "G01", "G01 - GARANTIA NORMAL...", etc.
  const rowId = (r) => `${String(r.os_numero ?? '').trim()}||${tipoCode(r.tipo_os_sigla) || tipoCode(r.tipo_os_descricao)}`

  // Exibe somente OS ainda não importadas, filtra por empresa e busca
  const rowsFiltradas = useMemo(() => {
    let rows = shareRows.filter(r => !jaFoiImportado(r))
    if (filtroEmpresa) rows = rows.filter(r => r.empresa_nome === filtroEmpresa)
    const q = busca.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      String(r.os_numero ?? '').includes(q) ||
      String(r.proprietario_veiculo ?? '').toLowerCase().includes(q) ||
      String(r.veiculo_chassi ?? '').toLowerCase().includes(q) ||
      String(r.consultor_nome ?? '').toLowerCase().includes(q)
    )
  }, [shareRows, busca, filtroEmpresa, importadosSet])

  const disponíveis = rowsFiltradas

  const todosDispSelecionados =
    disponíveis.length > 0 && disponíveis.every(r => selecionados.has(rowId(r)))

  const toggleRow = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (todosDispSelecionados) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(disponíveis.map(r => rowId(r))))
    }
  }

  // placeholder — mantido para evitar reescrever bloco seguinte
  const handleImportar = async () => {
    if (selecionados.size === 0) return
    setImportando(true)
    setImportResult(null)

    const paraImportar = shareRows.filter(r => selecionados.has(rowId(r)))
    let ok = 0; const erros = []; const duplicatas = []

    for (const row of paraImportar) {
      try {
        await apiService.createGarantia(
          {
            numero_os:              row.os_numero,
            empresa_id:             findEmpresaId(row.empresa_nome),
            empresa_nome:           row.empresa_nome,
            cliente:                row.proprietario_veiculo,
            consultor_nome:         row.consultor_nome,
            tipo_garantia_descricao: row.tipo_os_descricao || '',
            tipo_os_sigla:          row.tipo_os_sigla || '',
            chassi:                 row.veiculo_chassi,
            valor_pecas:            row.produto,
            valor_servicos:         row.servico,
            data_abertura_os:       row.data_criacao,
            fechado:                !!row.fechado_data,
            data_fechamento_os:     row.fechado_data || null,
            status_codigo:          'A',
          },
          user?.email
        )
        ok++
      } catch (err) {
        const msg = err.message || String(err)
        if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
          duplicatas.push(row.os_numero)
        } else {
          erros.push({ os: row.os_numero, msg })
        }
      }
    }

    setImportResult({ ok, erros, duplicatas })
    setSelecionados(new Set())
    setImportando(false)

    if (ok > 0) onImported()   // avisa o dashboard para recarregar
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-7xl flex flex-col" style={{ height: '92vh' }}>

        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              Importar OS do SharePoint — ROF001_OSABERTA_ENCERRADA
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Badges indicam se a OS (número + tipo) já está na tabela de controle.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastModified && (
              <span className="text-[10px] text-slate-400">
                Modificado em{' '}
                <strong className="text-slate-500">
                  {new Date(lastModified).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </strong>
              </span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar arquivo
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por OS, proprietário, chassi, consultor..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none"
            />
          </div>

          {/* Filtro Empresa */}
          <select
            value={filtroEmpresa}
            onChange={e => setFiltroEmpresa(e.target.value)}
            className="py-1.5 pl-2 pr-7 text-xs border border-slate-200 rounded-md text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white shrink-0 max-w-[280px]"
          >
            <option value="">Todas as empresas</option>
            {empresas.map(emp => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>

<div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleImportar}
              disabled={selecionados.size === 0 || importando}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-40"
            >
              {importando
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando...</>
                : <><Download className="h-3.5 w-3.5" /> Importar {selecionados.size > 0 ? selecionados.size : ''} selecionada(s)</>
              }
            </button>
          </div>
        </div>

        {/* RESULTADO DA IMPORTAÇÃO */}
        {importResult && (
          <div className={`mx-5 mt-3 px-4 py-3 rounded-md text-xs flex flex-col gap-1 shrink-0 ${importResult.erros.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="font-semibold text-slate-800">
              {importResult.ok} OS importada(s) com sucesso.
              {importResult.duplicatas?.length > 0 && ` ${importResult.duplicatas.length} já existente(s) — ignorada(s).`}
              {importResult.erros.length > 0 && ` ${importResult.erros.length} com erro.`}
            </p>
            {importResult.duplicatas?.length > 0 && (
              <p className="text-slate-500">Já importadas: OS {importResult.duplicatas.join(', ')}</p>
            )}
            {importResult.erros.map((e, i) => (
              <p key={i} className="text-red-600">OS {e.os}: {e.msg}</p>
            ))}
          </div>
        )}

        {/* CORPO — TABELA */}
        <div className="overflow-x-auto overflow-y-auto custom-scrollbar-light" style={{ flex: '1 1 0', minHeight: 0 }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Carregando arquivo do SharePoint...</p>
              <p className="text-[10px]">O arquivo pode demorar alguns segundos na primeira leitura.</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-xs text-red-600 font-semibold">{error}</p>
              <button onClick={() => load(false)} className="text-xs text-blue-600 underline">Tentar novamente</button>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1600px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-10">
                    <button onClick={toggleTodos} className="flex items-center justify-center">
                      {todosDispSelecionados
                        ? <CheckSquare className="h-4 w-4 text-blue-600" />
                        : <Square className="h-4 w-4 text-slate-300" />
                      }
                    </button>
                  </th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-24">Nº OS</th>
                  <th className="p-3 w-48">Empresa</th>
                  <th className="p-3 w-24">Data Criação</th>
                  <th className="p-3 w-24">Fechado em</th>
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
                      Nenhuma OS encontrada.
                    </td>
                  </tr>
                ) : rowsFiltradas.map(row => {
                  const id = rowId(row)
                  const selecionado = selecionados.has(id)
                  return (
                    <tr
                      key={`${row.os_numero}_${row.tipo_os_descricao}`}
                      onClick={() => toggleRow(id)}
                      className={`transition-colors ${selecionado ? 'bg-blue-50 cursor-pointer' : 'hover:bg-slate-50/80 cursor-pointer'}`}
                    >
                      <td className="p-3">
                        <button onClick={e => { e.stopPropagation(); toggleRow(id) }} className="flex items-center justify-center">
                          {selecionado
                            ? <CheckSquare className="h-4 w-4 text-blue-600" />
                            : <Square className="h-4 w-4 text-slate-300" />
                          }
                        </button>
                      </td>

                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          <Clock className="h-3 w-3" /> Disponível
                        </span>
                      </td>

                      <td className="p-3 font-mono font-bold text-slate-900">{row.os_numero || '—'}</td>
                      <td className="p-3 text-slate-600 whitespace-normal leading-snug">{row.empresa_nome || '—'}</td>
                      <td className="p-3 text-slate-500">{fmtDate(row.data_criacao)}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">
                        {row.fechado_data
                          ? <span className="text-green-700 font-semibold">{fmtDate(row.fechado_data)}</span>
                          : <span className="text-amber-600">Aberto</span>}
                      </td>
                      <td className="p-3 text-slate-600 truncate max-w-[160px]" title={row.tipo_os_descricao}>{row.tipo_os_descricao || '—'}</td>
                      <td className="p-3 text-slate-600">{row.consultor_nome || '—'}</td>
                      <td className="p-3 truncate max-w-[180px]" title={row.proprietario_veiculo}>{row.proprietario_veiculo || '—'}</td>
                      <td className="p-3 font-mono text-slate-500">{row.veiculo_chassi || '—'}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]" title={row.modelo_veiculo}>{row.modelo_veiculo || '—'}</td>
                      <td className="p-3 text-right text-slate-700">{row.produto > 0 ? fmt(row.produto) : '—'}</td>
                      <td className="p-3 text-right text-slate-700">{row.servico > 0 ? fmt(row.servico) : '—'}</td>
                      <td className="p-3 text-right font-semibold text-slate-900">{row.total > 0 ? fmt(row.total) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50 shrink-0 rounded-b-xl">
          <p className="text-[10px] text-slate-400">
            Clique na linha para selecionar. Linhas já importadas não podem ser re-selecionadas.
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
