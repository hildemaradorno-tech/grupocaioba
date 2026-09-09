import React, { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight, Download,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// ── Colunas obrigatórias no Excel (nesta ordem) ──────────────────────────────
const COLUNAS = ['Título da Divergência']

const CABECALHO_MODELO = [
  'Título da Divergência', 'Motivo', 'Fundamentação Técnica', 'Impacto',
  'Total Apontado', 'Fatos Apontados', 'Recomendações',
]

const LINHA_EXEMPLO = [
  'Divergência entre relatório financeiro e registros contábeis', 'Inconsistências na conciliação das contas a receber',
  'NBC TG 26', 'Reconhecimento contábil', 8956905.11,
  'Descreva aqui os fatos apontados pela auditoria...', 'Descreva aqui as recomendações da auditoria...',
]

// ── Parse de valor monetário (aceita "8.956.905,11", "8956905.11" ou número) ──
const parseMoeda = (val) => {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  let s = String(val).trim().replace(/[R$\s]/g, '')
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

// Texto simples (Excel) → HTML básico, pro campo rich-text aceitar o conteúdo.
const textoParaHtml = (s) => {
  if (!s) return null
  const esc = String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<p>${esc.replace(/\n/g, '<br>')}</p>`
}

export default function ImportarDivergenciasModal({ onClose, onImported, cicloIdPadrao }) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [ciclos, setCiclos] = useState([])
  const [cicloId, setCicloId] = useState(cicloIdPadrao || '')

  useEffect(() => {
    apiService.getAuditExtCiclos().then(setCiclos).catch(() => {})
  }, [])

  const baixarModelo = () => {
    const ws = XLSX.utils.aoa_to_sheet([CABECALHO_MODELO, LINHA_EXEMPLO])
    ws['!cols'] = CABECALHO_MODELO.map(() => ({ wch: 30 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Divergências')
    XLSX.writeFile(wb, 'Modelo_Importacao_Divergencias.xlsx')
  }

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        if (raw.length < 2) {
          setErroArquivo('O arquivo está vazio ou não possui dados.')
          return
        }

        const cabecalho = raw[0].map(h => String(h).trim())
        const faltando = COLUNAS.filter(c => !cabecalho.includes(c))
        if (faltando.length > 0) {
          setErroArquivo(`Colunas não encontradas no arquivo:\n${faltando.join(', ')}`)
          return
        }

        const idx = {}
        CABECALHO_MODELO.forEach(c => { idx[c] = cabecalho.indexOf(c) })

        const col = (r, nome) => idx[nome] >= 0 ? String(r[idx[nome]] ?? '').trim() : ''

        const rows = raw.slice(1)
          .map(r => ({
            titulo:               col(r, 'Título da Divergência'),
            motivo:               col(r, 'Motivo'),
            fundamentacaoTecnica: col(r, 'Fundamentação Técnica'),
            impacto:              col(r, 'Impacto'),
            totalApontado:        parseMoeda(idx['Total Apontado'] >= 0 ? r[idx['Total Apontado']] : ''),
            fatosApontados:       col(r, 'Fatos Apontados'),
            recomendacoes:        col(r, 'Recomendações'),
          }))
          .filter(r => r.titulo)

        if (rows.length === 0) {
          setErroArquivo('Nenhuma linha com Título da Divergência preenchido foi encontrada no arquivo.')
          return
        }

        setLinhas(rows)
        setEtapa('preview')
      } catch (err) {
        setErroArquivo('Erro ao processar o arquivo: ' + (err.message || String(err)))
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleFileInput = (e) => processarArquivo(e.target.files[0])
  const handleDrop = (e) => {
    e.preventDefault()
    setArrastando(false)
    processarArquivo(e.dataTransfer.files[0])
  }

  const handleImportar = async () => {
    setEtapa('importando')
    let divergenciasCriadas = 0
    const erros = []

    for (const d of linhas) {
      try {
        await apiService.createAuditExtAchado({
          ciclo_id: cicloId,
          titulo: d.titulo,
          motivo: d.motivo || null,
          fundamentacao_tecnica: d.fundamentacaoTecnica || null,
          impactos: d.impacto || null,
          total_apontado: d.totalApontado,
          fatos_apontados: textoParaHtml(d.fatosApontados),
          recomendacoes: textoParaHtml(d.recomendacoes),
        }, user?.email)
        divergenciasCriadas++
      } catch (err) {
        erros.push(`Divergência "${d.titulo}": ${err.message}`)
      }
    }

    setResultado({ divergenciasCriadas, erros })
    setEtapa('resultado')
    if (divergenciasCriadas > 0) onImported?.()
  }

  const cicloSelecionado = ciclos.find(c => c.id === cicloId)
  const rotuloCiclo = cicloSelecionado ? `${cicloSelecionado.proj_empresas?.nome || '—'} · ${cicloSelecionado.periodo_competencia}` : ''

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[720px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Divergências via Excel</h2>
              <p className="text-[11px] text-slate-500">Selecione o Ciclo de Auditoria já cadastrado e importe as divergências para dentro dele.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── ETAPA: seleção ── */}
          {etapa === 'selecao' && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ciclo de Auditoria *</label>
                <select required value={cicloId} onChange={e => setCicloId(e.target.value)}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="">— Selecione o ciclo que receberá as divergências —</option>
                  {ciclos.map(c => (
                    <option key={c.id} value={c.id}>{c.proj_empresas?.nome || '—'} · {c.periodo_competencia}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={baixarModelo}
                className="flex items-center gap-2 w-full justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold px-3 py-2.5 rounded-lg border border-emerald-200 transition-colors"
              >
                <Download className="h-4 w-4" /> Baixar Modelo de Excel
              </button>

              <div
                onDragOver={(e) => { e.preventDefault(); if (cicloId) setArrastando(true) }}
                onDragLeave={() => setArrastando(false)}
                onDrop={(e) => { if (cicloId) handleDrop(e); else e.preventDefault() }}
                onClick={() => cicloId && fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${!cicloId ? 'border-slate-100 bg-slate-50 cursor-not-allowed' : arrastando ? 'border-blue-400 bg-blue-50 cursor-pointer' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer'}`}
              >
                <Upload className={`h-10 w-10 mx-auto mb-3 ${cicloId ? 'text-slate-300' : 'text-slate-200'}`} />
                <p className={`text-sm font-semibold ${cicloId ? 'text-slate-700' : 'text-slate-400'}`}>
                  {cicloId ? 'Arraste o arquivo preenchido aqui' : 'Selecione um Ciclo de Auditoria acima primeiro'}
                </p>
                {cicloId && <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — .xlsx / .xls</p>}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} disabled={!cicloId} />
              </div>

              {erroArquivo && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 whitespace-pre-line">{erroArquivo}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas do modelo</p>
                <div className="flex flex-wrap gap-1.5">
                  {CABECALHO_MODELO.map(c => (
                    <span key={c} className={`px-2 py-0.5 border rounded text-[10px] font-medium ${COLUNAS.includes(c) ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600'}`}>{c}</span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Em amarelo: obrigatória. Cada linha vira uma divergência dentro do ciclo selecionado acima. Evidências (documentos/imagens anexados) não entram pelo Excel — anexe depois, direto na divergência já importada.</p>
              </div>
            </>
          )}

          {/* ── ETAPA: preview ── */}
          {etapa === 'preview' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>{nomeArquivo}</strong> — {linhas.length} divergência(s) serão criadas em <strong>{rotuloCiclo}</strong>
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="text-left border-collapse" style={{ minWidth: '900px' }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 whitespace-nowrap">Título da Divergência</th>
                      <th className="p-2 whitespace-nowrap">Impacto</th>
                      <th className="p-2 whitespace-nowrap text-right">Total Apontado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhas.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="p-1.5 text-[11px] max-w-[320px] truncate text-slate-900 font-medium" title={r.titulo}>{r.titulo}</td>
                        <td className="p-1.5 text-[11px] text-slate-500 whitespace-nowrap">{r.impacto || '—'}</td>
                        <td className="p-1.5 text-[11px] text-slate-700 text-right whitespace-nowrap">{r.totalApontado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 text-center">{linhas.length} divergência(s) → {rotuloCiclo}</p>
            </>
          )}

          {/* ── ETAPA: importando ── */}
          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando divergências...</p>
              <p className="text-xs text-slate-400">Não feche esta janela.</p>
            </div>
          )}

          {/* ── ETAPA: resultado ── */}
          {etapa === 'resultado' && resultado && (
            <div className="space-y-4">
              <div className={`rounded-lg p-4 border flex items-start gap-3 ${resultado.erros.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                {resultado.erros.length === 0
                  ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                }
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {resultado.erros.length === 0 ? 'Importação concluída com sucesso!' : 'Importação concluída com avisos'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    <strong>{resultado.divergenciasCriadas}</strong> divergência(s) criada(s) em {rotuloCiclo}
                  </p>
                </div>
              </div>

              {resultado.erros.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">{resultado.erros.length} erro(s)</p>
                  {resultado.erros.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {etapa === 'selecao' && (
            <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          )}
          {etapa === 'preview' && (
            <>
              <button onClick={() => { setEtapa('selecao'); setLinhas([]) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button
                onClick={handleImportar}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors text-white bg-blue-600 hover:bg-blue-700"
              >
                Confirmar Importação <ChevronRight className="h-3.5 w-3.5" />
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
