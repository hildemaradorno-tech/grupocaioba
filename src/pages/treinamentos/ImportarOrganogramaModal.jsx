import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight, RefreshCw, Plus as PlusIcon, EyeOff,
  Search, Sheet, ChevronLeft,
} from 'lucide-react'
import { apiService } from '../../services/api'

// Colunas literais do export de organograma do Bizneo.
const COL_ID = 'Organization ID'
const COL_NOME = 'Organization Name'
const COL_PARENT_ID = 'Organization Parent ID'
const COL_PARENT_NOME = 'Organization Parent Name'
const COL_SUPERVISOR_ID = 'Organization Supervisor ID'
const COL_SUPERVISOR_NOME = 'Organization Supervisor Name'
const COL_HEADCOUNT = 'Organization Headcount'
const COLUNAS_ESPERADAS = [COL_ID, COL_NOME, COL_PARENT_ID, COL_PARENT_NOME, COL_SUPERVISOR_ID, COL_SUPERVISOR_NOME, COL_HEADCOUNT]

// Compara a planilha com o que já está em trein_organograma (chave natural =
// bizneo_org_id) e classifica cada linha: novo / atualizado (nome, pai,
// headcount, supervisor ou reativação) / sem alteração. Quem está no banco
// e não veio na planilha é listado à parte como "será desativado" — não é
// apagado, só some da árvore, pra não perder vínculos de curso já feitos.
function construirLinhas(excelRows, existentes) {
  const porBizneoId = new Map(existentes.map(e => [e.bizneo_org_id, e]))
  const bizneoIdPorInternoId = new Map(existentes.map(e => [e.id, e.bizneo_org_id]))
  const vistos = new Set()
  const linhas = []
  for (const r of excelRows) {
    const bizneoOrgId = Number(r[COL_ID])
    const nome = String(r[COL_NOME] || '').trim()
    if (!bizneoOrgId || !nome || vistos.has(bizneoOrgId)) continue
    vistos.add(bizneoOrgId)
    const bizneoPaiId = r[COL_PARENT_ID] ? Number(r[COL_PARENT_ID]) : null
    const supervisorNome = String(r[COL_SUPERVISOR_NOME] || '').trim() || null
    const headcount = Number(r[COL_HEADCOUNT]) || 0
    const existente = porBizneoId.get(bizneoOrgId)
    let status
    if (!existente) {
      status = 'novo'
    } else {
      const paiAtualBizneoId = existente.pai_id ? (bizneoIdPorInternoId.get(existente.pai_id) ?? null) : null
      const mudou = existente.nome !== nome
        || (existente.headcount || 0) !== headcount
        || (existente.supervisor_nome || null) !== supervisorNome
        || paiAtualBizneoId !== bizneoPaiId
        || existente.ativo === false
      status = mudou ? 'atualizado' : 'sem_alteracao'
    }
    linhas.push({ key: String(bizneoOrgId), bizneo_org_id: bizneoOrgId, nome, bizneo_pai_id: bizneoPaiId, supervisor_nome: supervisorNome, headcount, status })
  }
  const idsImportados = new Set(linhas.map(l => l.bizneo_org_id))
  const removidos = existentes.filter(e => e.ativo !== false && !idsImportados.has(e.bizneo_org_id))
  return { linhas, removidos }
}

const STATUS_INFO = {
  novo:          { label: 'Novo',           cls: 'bg-blue-50 text-blue-700 border-blue-200',       icon: PlusIcon },
  atualizado:    { label: 'Atualizado',     cls: 'bg-amber-50 text-amber-700 border-amber-200',    icon: RefreshCw },
  sem_alteracao: { label: 'Sem alteração',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
}

export default function ImportarOrganogramaModal({ organograma, onClose, onImported }) {
  const fileRef = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [etapa, setEtapa] = useState('selecao') // selecao | selecao-aba | preview | importando | resultado
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [workbook, setWorkbook] = useState(null) // wb do XLSX.read, guardado pra poder trocar de aba sem re-upload
  const [abaEscolhida, setAbaEscolhida] = useState('')
  const [linhas, setLinhas] = useState([])
  const [removidos, setRemovidos] = useState([])
  const [resultado, setResultado] = useState(null)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const linhasFiltradas = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase()
    return linhas.filter(l => {
      if (filtroStatus && l.status !== filtroStatus) return false
      if (!q) return true
      return l.nome.toLowerCase().includes(q)
    })
  }, [linhas, filtroTexto, filtroStatus])

  const contagens = linhas.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc }, {})

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          setErroArquivo('O arquivo não tem nenhuma aba com dados.')
          return
        }
        setWorkbook(wb)
        if (wb.SheetNames.length === 1) {
          processarAba(wb, wb.SheetNames[0])
        } else {
          setAbaEscolhida('')
          setEtapa('selecao-aba')
        }
      } catch (err) {
        setErroArquivo('Erro ao processar o arquivo: ' + (err.message || String(err)))
      }
    }
    reader.readAsBinaryString(file)
  }

  // Lê a aba escolhida (do arquivo já em memória, sem precisar reenviar) e
  // valida as colunas — separado de processarArquivo pra poder trocar de aba
  // depois sem reprocessar o upload inteiro.
  const processarAba = (wb, sheetName) => {
    setErroArquivo(null)
    setAbaEscolhida(sheetName)
    try {
      const ws = wb.Sheets[sheetName]
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

      if (raw.length === 0) {
        setErroArquivo(`A aba "${sheetName}" está vazia ou não possui dados.`)
        setEtapa(wb.SheetNames.length > 1 ? 'selecao-aba' : 'selecao')
        return
      }
      const cabecalho = Object.keys(raw[0])
      const faltando = COLUNAS_ESPERADAS.filter(c => !cabecalho.includes(c))
      if (faltando.length > 0) {
        setErroArquivo(`Colunas não encontradas na aba "${sheetName}":\n${faltando.join(', ')}`)
        setEtapa(wb.SheetNames.length > 1 ? 'selecao-aba' : 'selecao')
        return
      }

      const { linhas: construidas, removidos: rem } = construirLinhas(raw, organograma)
      if (construidas.length === 0) {
        setErroArquivo(`Nenhuma linha válida encontrada na aba "${sheetName}".`)
        setEtapa(wb.SheetNames.length > 1 ? 'selecao-aba' : 'selecao')
        return
      }
      setLinhas(construidas)
      setRemovidos(rem)
      setFiltroTexto('')
      setFiltroStatus('')
      setEtapa('preview')
    } catch (err) {
      setErroArquivo('Erro ao processar a aba: ' + (err.message || String(err)))
      setEtapa(wb.SheetNames.length > 1 ? 'selecao-aba' : 'selecao')
    }
  }

  const handleFileInput = (e) => processarArquivo(e.target.files[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setArrastando(false)
    processarArquivo(e.dataTransfer.files[0])
  }

  const handleImportar = async () => {
    setEtapa('importando')
    try {
      const res = await apiService.salvarTreinOrganogramaLote(linhas.map(l => ({
        bizneo_org_id: l.bizneo_org_id,
        nome: l.nome,
        bizneo_pai_id: l.bizneo_pai_id,
        supervisor_nome: l.supervisor_nome,
        headcount: l.headcount,
      })))
      setResultado({ ok: true, total: res.total, novos: contagens.novo || 0, atualizados: contagens.atualizado || 0, inativados: res.inativados })
      onImported?.()
    } catch (err) {
      setResultado({ ok: false, erro: err.message || String(err) })
    } finally {
      setEtapa('resultado')
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[820px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Organograma (Bizneo)</h2>
              <p className="text-[11px] text-slate-500">Atualiza a árvore de cargos a partir do relatório de organograma exportado do Bizneo.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── ETAPA: seleção ── */}
          {etapa === 'selecao' && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${arrastando ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
              >
                <Upload className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Arraste o arquivo Excel aqui</p>
                <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — .xlsx / .xls</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
              </div>

              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas obrigatórias (export do Bizneo)</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS_ESPERADAS.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">{c}</span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1.5">
                  <EyeOff className="h-3.5 w-3.5 shrink-0" /> ID e Supervisor ficam só no banco — não aparecem na árvore.
                </p>
              </div>
            </>
          )}

          {/* ── ETAPA: seleção de aba (arquivo com mais de uma planilha) ── */}
          {etapa === 'selecao-aba' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700"><strong>{nomeArquivo}</strong> tem {workbook?.SheetNames.length} abas — escolha qual tem os dados do organograma.</p>
              </div>

              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
                {(workbook?.SheetNames || []).map(nome => (
                  <button
                    key={nome}
                    type="button"
                    onClick={() => processarAba(workbook, nome)}
                    className={`w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors ${
                      nome === abaEscolhida ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <Sheet className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-800 flex-1">{nome}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── ETAPA: preview ── */}
          {etapa === 'preview' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>{nomeArquivo}</strong>{workbook?.SheetNames.length > 1 ? <> — aba <strong>{abaEscolhida}</strong></> : ''} — {linhas.length} posição(ões) encontradas
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_INFO).map(([key, info]) => contagens[key] ? (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFiltroStatus(prev => prev === key ? '' : key)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition-shadow ${info.cls} ${filtroStatus === key ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                  >
                    <info.icon className="h-3 w-3" /> {contagens[key]} {info.label.toLowerCase()}
                  </button>
                ) : null)}
              </div>

              {removidos.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>{removidos.length}</strong> posição(ões) que estão na árvore hoje não vieram nesta planilha — serão marcadas como inativas (não aparecem mais na árvore, mas os vínculos de curso já feitos não são apagados):{' '}
                    <span className="italic">{removidos.slice(0, 6).map(r => r.nome).join(', ')}{removidos.length > 6 ? `, +${removidos.length - 6}` : ''}</span>
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar por nome..."
                    className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {filtroStatus && (
                  <button onClick={() => setFiltroStatus('')} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" /> Limpar filtro de status
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 whitespace-nowrap">Nome</th>
                      <th className="p-2 whitespace-nowrap">Headcount</th>
                      <th className="p-2 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasFiltradas.length === 0 ? (
                      <tr><td colSpan={3} className="p-6 text-center text-xs text-slate-400">Nenhuma linha encontrada para o filtro aplicado.</td></tr>
                    ) : linhasFiltradas.map(l => {
                      const info = STATUS_INFO[l.status]
                      return (
                        <tr key={l.key} className="hover:bg-slate-50/60 align-top">
                          <td className="p-2 text-[11px] font-semibold text-slate-800">{l.nome}</td>
                          <td className="p-2 text-[11px] text-slate-500 tabular-nums">{l.headcount}</td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${info.cls}`}>
                              <info.icon className="h-3 w-3" /> {info.label}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── ETAPA: importando ── */}
          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando organograma...</p>
              <p className="text-xs text-slate-400">Não feche esta janela.</p>
            </div>
          )}

          {/* ── ETAPA: resultado ── */}
          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border flex items-start gap-3 ${resultado.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {resultado.ok
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {resultado.ok ? 'Organograma importado com sucesso!' : 'Erro ao importar'}
                  </p>
                  {resultado.ok ? (
                    <p className="text-xs text-slate-600 mt-0.5">
                      <strong>{resultado.novos}</strong> posição(ões) nova(s) · <strong>{resultado.atualizados}</strong> atualizada(s)
                      {resultado.inativados > 0 && <> · <strong>{resultado.inativados}</strong> inativada(s)</>}
                    </p>
                  ) : (
                    <p className="text-xs text-red-700 mt-0.5">{resultado.erro}</p>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {etapa === 'selecao' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          )}
          {etapa === 'selecao-aba' && (
            <button
              onClick={() => { setEtapa('selecao'); setWorkbook(null); setAbaEscolhida(''); setErroArquivo(null) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Escolher outro arquivo
            </button>
          )}
          {etapa === 'preview' && (
            <>
              <button
                onClick={() => {
                  if (workbook?.SheetNames.length > 1) { setEtapa('selecao-aba') }
                  else { setEtapa('selecao'); setWorkbook(null) }
                  setLinhas([]); setRemovidos([])
                }}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleImportar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
              >
                Importar ({linhas.length}) <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {etapa === 'resultado' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
          )}
        </div>

      </div>
    </div>
  )
}
