import React, { useState, useRef, useEffect } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// ── Colunas obrigatórias no Excel (nesta ordem) ──────────────────────────────
const COLUNAS = [
  'Título', 'Tarefa', 'Deliberações', 'Departamento', 'Área',
  'Fase', 'Status', '% Conclusão', 'Data Início', 'Data Término',
  'Sistema', 'Unidade', 'Responsável',
]
// Colunas opcionais (usadas se presentes)
const COLUNAS_OPCIONAIS = ['Tipo de Item', 'Caminho']

// ── Mapeamento Status Excel → status_kanban ───────────────────────────────────
const mapStatusKanban = (s) => {
  if (!s) return 'mapeado'
  const v = String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (v.includes('programado')) return 'programado'
  if (v.includes('andamento')) return 'em_andamento'
  if (v.includes('pausado')) return 'pausado'
  if (v.includes('conclu')) return 'concluido'
  return 'mapeado'
}

// ── Parse de data (DD/MM/YYYY, YYYY-MM-DD, número serial Excel) ───────────────
const parseData = (val) => {
  if (val === null || val === undefined || val === '') return null
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val)
      if (parsed) {
        return `${parsed.y}-${String(parsed.m).padStart(2,'0')}-${String(parsed.d).padStart(2,'0')}`
      }
    } catch { return null }
  }
  const s = String(val).trim()
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return null
}

// ── Parse de % Conclusão ──────────────────────────────────────────────────────
const parseProgresso = (val) => {
  if (val === null || val === undefined || val === '') return 0
  let n = parseFloat(String(val).replace(',', '.').replace('%', ''))
  if (isNaN(n)) return 0
  if (n > 0 && n <= 1) n = n * 100
  return Math.min(100, Math.max(0, Math.round(n * 100) / 100))
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ImportarProjetosModal({ onClose, onImported }) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState([])
  const [resultado, setResultado] = useState(null)

  const [deptos, setDeptos] = useState([])
  const [opcAreas, setOpcAreas] = useState([])
  const [opcFases, setOpcFases] = useState([])
  const [opcSistemas, setOpcSistemas] = useState([])
  const [opcResponsaveis, setOpcResponsaveis] = useState([])
  const [opcEmpresas, setOpcEmpresas] = useState([])

  useEffect(() => {
    Promise.all([
      apiService.getProjDepartamentos(),
      apiService.getProjAreas(),
      apiService.getProjFases(),
      apiService.getProjSistemas(),
      apiService.getProjResponsaveis(),
      apiService.getProjEmpresas(),
    ]).then(([d, a, f, s, r, e]) => {
      setDeptos(d.filter(x => x.ativo !== false).map(x => x.nome))
      setOpcAreas(a.filter(x => x.ativo !== false).map(x => x.nome))
      setOpcFases(f.filter(x => x.ativo !== false).map(x => x.nome))
      setOpcSistemas(s.filter(x => x.ativo !== false).map(x => x.nome))
      setOpcResponsaveis(r.filter(x => x.ativo !== false).map(x => x.nome))
      setOpcEmpresas(e.filter(x => x.ativo !== false).map(x => x.nome))
    }).catch(() => {})
  }, [])

  const atualizarLinha = (i, campo, valor) =>
    setLinhas(prev => prev.map((r, idx) => idx === i ? { ...r, [campo]: valor } : r))

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
        ;[...COLUNAS, ...COLUNAS_OPCIONAIS].forEach(c => {
          idx[c] = cabecalho.indexOf(c) // -1 se não existir (opcionais)
        })

        const col = (r, nome) => idx[nome] >= 0 ? String(r[idx[nome]] || '').trim() : ''

        const rows = raw.slice(1)
          .map(r => ({
            titulo:       col(r, 'Título'),
            tarefa:       col(r, 'Tarefa'),
            deliberacoes: col(r, 'Deliberações'),
            departamento: col(r, 'Departamento'),
            area:         col(r, 'Área'),
            fase:         col(r, 'Fase'),
            status:       col(r, 'Status'),
            progresso:    parseProgresso(idx['% Conclusão'] >= 0 ? r[idx['% Conclusão']] : ''),
            dataInicio:   parseData(idx['Data Início'] >= 0 ? r[idx['Data Início']] : ''),
            dataTermino:  parseData(idx['Data Término'] >= 0 ? r[idx['Data Término']] : ''),
            sistema:      col(r, 'Sistema'),
            unidade:      col(r, 'Unidade'),
            responsavel:  col(r, 'Responsável'),
            tipoItem:     col(r, 'Tipo de Item'),
            caminho:      col(r, 'Caminho'),
          }))
          .filter(r => r.titulo || r.tarefa)

        if (rows.length === 0) {
          setErroArquivo('Nenhuma linha com dados encontrada no arquivo.')
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
    let projetosCriados = 0
    let tarefasCriadas = 0
    const erros = []

    // Agrupa por Título (mantém ordem de aparição)
    const grupos = new Map()
    for (const row of linhas) {
      const key = row.titulo || '(sem título)'
      if (!grupos.has(key)) grupos.set(key, { info: row, tarefas: [] })
      if (row.tarefa) grupos.get(key).tarefas.push(row)
    }

    for (const [titulo, grupo] of grupos) {
      try {
        const projeto = await apiService.createProjeto({
          nome:              titulo,
          descricao:         grupo.info.deliberacoes  || null,
          empresa_nome:      grupo.info.unidade        || null,
          departamento_nome: grupo.info.departamento   || null,
          sistema_nome:      grupo.info.sistema        || null,
          responsavel_nome:  grupo.info.responsavel    || null,
          data_inicio:       grupo.info.dataInicio     || null,
          data_fim_prevista: grupo.info.dataTermino    || null,
          status:            'mapeado',
          ativo:             true,
        }, user?.email)
        projetosCriados++

        for (let i = 0; i < grupo.tarefas.length; i++) {
          const t = grupo.tarefas[i]
          try {
            await apiService.createTarefa({
              projeto_id:      projeto.id,
              nome:            t.tarefa,
              descricao:       t.deliberacoes  || null,
              sistema_nome:    t.sistema        || null,
              fase_nome:       t.fase           || null,
              responsavel_nome:t.responsavel    || null,
              area_nome:       t.area           || null,
              tipo_item:       t.tipoItem       || null,
              caminho:         t.caminho        || null,
              progresso_pct:   t.progresso,
              status_kanban:   mapStatusKanban(t.status),
              data_inicio:     t.dataInicio     || null,
              data_fim:        t.dataTermino    || null,
              ordem:           i,
              ativo:           true,
            })
            tarefasCriadas++
          } catch (err) {
            erros.push(`Tarefa "${t.tarefa}" (${titulo}): ${err.message}`)
          }
        }
      } catch (err) {
        erros.push(`Projeto "${titulo}": ${err.message}`)
      }
    }

    setResultado({ projetosCriados, tarefasCriadas, erros })
    setEtapa('resultado')
    if (projetosCriados > 0) onImported?.()
  }

  // ── Contagens do preview ──────────────────────────────────────────────────
  const projetos = [...new Set(linhas.map(r => r.titulo).filter(Boolean))]
  const STATUS_EXCEL = ['Mapeado', 'Programado', 'Em Andamento', 'Pausado', 'Concluído']
  const CAMPOS_OBRIG = ['titulo', 'departamento', 'area', 'fase', 'status', 'sistema', 'unidade', 'responsavel']
  const vazios = linhas.reduce((acc, r) => acc + CAMPOS_OBRIG.filter(c => !r[c]).length, 0)

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[720px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Projetos via Excel</h2>
              <p className="text-[11px] text-slate-500">Cada linha do Excel vira uma tarefa. Linhas com o mesmo Título são agrupadas no mesmo projeto.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── ETAPA: seleção ── */}
          {etapa === 'selecao' && (
            <>
              {/* Drop zone */}
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

              {/* Estrutura esperada */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas obrigatórias (nesta ordem)</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-medium text-slate-600">{c}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── ETAPA: preview ── */}
          {etapa === 'preview' && (
            <>
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>{nomeArquivo}</strong> — {linhas.length} linha(s) →
                  <strong> {projetos.length}</strong> projeto(s) e
                  <strong> {linhas.filter(r => r.tarefa).length}</strong> tarefa(s)
                </p>
              </div>

              {vazios > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>{vazios}</strong> campo(s) em branco detectado(s) — destacados em amarelo. Preencha-os antes de importar.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="text-left border-collapse" style={{ minWidth: '1400px' }}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 whitespace-nowrap">Título</th>
                      <th className="p-2 whitespace-nowrap">Tarefa</th>
                      <th className="p-2 whitespace-nowrap">Deliberações</th>
                      <th className="p-2 whitespace-nowrap">Departamento</th>
                      <th className="p-2 whitespace-nowrap">Área</th>
                      <th className="p-2 whitespace-nowrap">Fase</th>
                      <th className="p-2 whitespace-nowrap">Status</th>
                      <th className="p-2 whitespace-nowrap">% Conclusão</th>
                      <th className="p-2 whitespace-nowrap">Data Início</th>
                      <th className="p-2 whitespace-nowrap">Data Término</th>
                      <th className="p-2 whitespace-nowrap">Sistema</th>
                      <th className="p-2 whitespace-nowrap">Unidade</th>
                      <th className="p-2 whitespace-nowrap">Responsável</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhas.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        {/* Título */}
                        <td className="p-1.5 max-w-[160px]">
                          {r.titulo
                            ? <span className="text-[11px] font-semibold text-slate-900">{r.titulo}</span>
                            : <input type="text" value={r.titulo} placeholder="Título..." onChange={e => atualizarLinha(i, 'titulo', e.target.value)}
                                className="w-full min-w-[120px] px-1.5 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-amber-300" />}
                        </td>
                        {/* Tarefa */}
                        <td className="p-1.5 max-w-[160px]">
                          {r.tarefa
                            ? <span className="text-[11px] text-slate-700">{r.tarefa}</span>
                            : <input type="text" value={r.tarefa} placeholder="Tarefa..." onChange={e => atualizarLinha(i, 'tarefa', e.target.value)}
                                className="w-full min-w-[120px] px-1.5 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-amber-300" />}
                        </td>
                        {/* Deliberações */}
                        <td className="p-1.5 max-w-[140px]">
                          {r.deliberacoes
                            ? <span className="text-[11px] text-slate-500 truncate block" title={r.deliberacoes}>{r.deliberacoes}</span>
                            : <input type="text" value={r.deliberacoes} placeholder="Deliberações..." onChange={e => atualizarLinha(i, 'deliberacoes', e.target.value)}
                                className="w-full min-w-[110px] px-1.5 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400 placeholder-amber-300" />}
                        </td>
                        {/* Departamento */}
                        <td className="p-1.5">
                          {r.departamento
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.departamento}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'departamento', e.target.value)}
                                className="min-w-[130px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Departamento...</option>
                                {deptos.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* Área */}
                        <td className="p-1.5">
                          {r.area
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.area}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'area', e.target.value)}
                                className="min-w-[120px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Área...</option>
                                {opcAreas.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* Fase */}
                        <td className="p-1.5">
                          {r.fase
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.fase}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'fase', e.target.value)}
                                className="min-w-[150px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Fase...</option>
                                {opcFases.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* Status */}
                        <td className="p-1.5">
                          {r.status
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.status}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'status', e.target.value)}
                                className="min-w-[130px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Status...</option>
                                {STATUS_EXCEL.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* % Conclusão */}
                        <td className="p-1.5">
                          <input type="number" min="0" max="100" value={r.progresso}
                            onChange={e => atualizarLinha(i, 'progresso', parseProgresso(e.target.value))}
                            className={`w-16 px-1.5 py-0.5 border rounded text-[11px] text-center focus:outline-none focus:ring-1 ${r.progresso === 0 ? 'border-amber-300 bg-amber-50 focus:ring-amber-400' : 'border-slate-200 bg-white text-slate-700 focus:ring-blue-400'}`} />
                        </td>
                        {/* Data Início */}
                        <td className="p-1.5">
                          {r.dataInicio
                            ? <span className="text-[11px] text-slate-500 whitespace-nowrap">{r.dataInicio}</span>
                            : <input type="date" value="" onChange={e => atualizarLinha(i, 'dataInicio', e.target.value || null)}
                                className="border border-amber-300 bg-amber-50 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400" />}
                        </td>
                        {/* Data Término */}
                        <td className="p-1.5">
                          {r.dataTermino
                            ? <span className="text-[11px] text-slate-500 whitespace-nowrap">{r.dataTermino}</span>
                            : <input type="date" value="" onChange={e => atualizarLinha(i, 'dataTermino', e.target.value || null)}
                                className="border border-amber-300 bg-amber-50 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400" />}
                        </td>
                        {/* Sistema */}
                        <td className="p-1.5">
                          {r.sistema
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.sistema}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'sistema', e.target.value)}
                                className="min-w-[120px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Sistema...</option>
                                {opcSistemas.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* Unidade */}
                        <td className="p-1.5">
                          {r.unidade
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.unidade}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'unidade', e.target.value)}
                                className="min-w-[140px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Unidade...</option>
                                {opcEmpresas.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                        {/* Responsável */}
                        <td className="p-1.5">
                          {r.responsavel
                            ? <span className="text-[11px] text-slate-700 whitespace-nowrap">{r.responsavel}</span>
                            : <select value="" onChange={e => atualizarLinha(i, 'responsavel', e.target.value)}
                                className="min-w-[130px] px-1 py-0.5 border border-amber-300 bg-amber-50 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-amber-400">
                                <option value="">Responsável...</option>
                                {opcResponsaveis.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-slate-400 text-center">{linhas.length} linha(s) · {projetos.length} projeto(s)</p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Cada título único criará um <strong>novo projeto</strong>. Projetos com o mesmo nome do Excel não serão mesclados com os já existentes no sistema.</p>
              </div>
            </>
          )}

          {/* ── ETAPA: importando ── */}
          {etapa === 'importando' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Importando projetos e tarefas...</p>
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
                    <strong>{resultado.projetosCriados}</strong> projeto(s) criado(s) ·{' '}
                    <strong>{resultado.tarefasCriadas}</strong> tarefa(s) criada(s)
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
              {vazios > 0 && (
                <span className="text-[11px] text-amber-600 font-semibold">{vazios} campo(s) em branco</span>
              )}
              <button
                onClick={handleImportar}
                disabled={vazios > 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${vazios > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
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
