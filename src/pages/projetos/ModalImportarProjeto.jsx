import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { X, Upload, Download, CheckCircle, AlertTriangle, Loader2, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { apiService } from '../../services/api'

const sel = 'text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/30 w-full'
const lbl = 'text-[10px] font-bold text-slate-500 uppercase tracking-wide'

// ─── Multi-select de responsáveis ───────────────────────────────────────────
function MultiSelectResponsaveis({ opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const ref = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (aberto) setTimeout(() => inputRef.current?.focus(), 50)
    else setBusca('')
  }, [aberto])

  const toggle = (id) => {
    onChange(selecionados.includes(id) ? selecionados.filter(x => x !== id) : [...selecionados, id])
  }

  const filtrados = busca.trim()
    ? opcoes.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()))
    : opcoes

  const label = selecionados.length === 0
    ? '— Nenhum —'
    : selecionados.length === 1
      ? opcoes.find(o => o.id === selecionados[0])?.nome || '—'
      : `${selecionados.length} selecionados`

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setAberto(v => !v)}
          className="flex-1 flex items-center justify-between text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          <span className={selecionados.length === 0 ? 'text-slate-400' : 'text-slate-700'}>{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        </button>
        {selecionados.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            title="Limpar seleção"
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md border border-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {aberto && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl">
          <div className="p-2 border-b border-slate-100 flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar responsável..."
              className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            />
            {busca && (
              <button type="button" onClick={() => { setBusca(''); inputRef.current?.focus() }}
                className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-44 overflow-y-auto">
            {filtrados.length === 0
              ? <p className="text-xs text-slate-400 italic px-3 py-2">Nenhum resultado.</p>
              : filtrados.map(o => (
                <label key={o.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(o.id)}
                    onChange={() => toggle(o.id)}
                    className="accent-blue-600 h-3.5 w-3.5 shrink-0"
                  />
                  <span className="text-xs text-slate-700">{o.nome}</span>
                </label>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Gera e baixa o modelo Excel ───────────────────────────────────────────
export function baixarModeloExcel() {
  const wb = XLSX.utils.book_new()

  const rows = [
    ['MODELO DE IMPORTAÇÃO DE PROJETO'],
    [],
    ['TÍTULO DO PROJETO:', '(preencha o título aqui)'],
    [],
    ['NOME DA TAREFA *'],
    ['Exemplo de Tarefa 1'],
    ['Exemplo de Tarefa 2'],
    ['Exemplo de Tarefa 3'],
  ]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 50 }, { wch: 30 }]
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]

  XLSX.utils.book_append_sheet(wb, ws, 'Projeto')
  XLSX.writeFile(wb, 'modelo_importacao_projeto.xlsx')
}

// ─── Modal principal ────────────────────────────────────────────────────────
export default function ModalImportarProjeto({ onClose, onProjetoCriado, userEmail }) {
  const inputRef = useRef(null)

  const [lookups, setLookups] = useState({ departamentos: [], areas: [], empresas: [], sistemas: [], responsaveis: [] })
  const [loadingLookups, setLoadingLookups] = useState(true)

  const [tituloProjeto, setTituloProjeto] = useState('')
  const [tarefas, setTarefas] = useState([])   // [{nome}]
  const [erroArquivo, setErroArquivo] = useState('')
  const [arquivoNome, setArquivoNome] = useState('')

  // Campos globais aplicados ao projeto e a cada tarefa
  const [deptId, setDeptId] = useState('')
  const [deptNome, setDeptNome] = useState('')
  const [areaId, setAreaId] = useState('')
  const [areaNome, setAreaNome] = useState('')
  const [empresaId, setEmpresaId] = useState('')
  const [empresaNome, setEmpresaNome] = useState('')
  const [sistemaId, setSistemaId] = useState('')
  const [sistemaNome, setSistemaNome] = useState('')
  const [responsaveisIds, setResponsaveisIds] = useState([])

  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState('')

  const arquivoCarregado = tarefas.length > 0 || tituloProjeto !== ''

  useEffect(() => {
    Promise.all([
      apiService.getDepartamentos(),
      apiService.getProjAreas(),
      apiService.getProjEmpresas(),
      apiService.getProjSistemas(),
      apiService.getProjResponsaveis(),
    ]).then(([depts, areas, emps, sists, resps]) => {
      setLookups({
        departamentos: depts.filter(d => d.ativo !== false),
        areas:         areas.filter(a => a.ativo !== false),
        empresas:      emps,
        sistemas:      sists.filter(s => s.ativo !== false),
        responsaveis:  resps.filter(r => r.ativo !== false),
      })
    }).catch(() => {}).finally(() => setLoadingLookups(false))
  }, [])

  // ── Parse do Excel ──────────────────────────────────────────────────────
  const handleArquivo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErroArquivo('')
    setArquivoNome(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Título: linha com "TÍTULO DO PROJETO:", valor na coluna B
        let titulo = ''
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          if (String(rows[i][0] || '').toUpperCase().includes('TÍTULO DO PROJETO')) {
            titulo = String(rows[i][1] || '').trim()
            break
          }
        }

        // Tarefas: linha com "NOME DA TAREFA" é cabeçalho, dados abaixo
        let headerRow = -1
        for (let i = 0; i < rows.length; i++) {
          if (String(rows[i][0] || '').toUpperCase().includes('NOME DA TAREFA')) { headerRow = i; break }
        }

        const tarefasImportadas = []
        if (headerRow >= 0) {
          for (let i = headerRow + 1; i < rows.length; i++) {
            const nome = String(rows[i][0] || '').trim()
            if (!nome || nome.toLowerCase().startsWith('exemplo')) continue
            tarefasImportadas.push({ nome })
          }
        }

        if (!titulo && tarefasImportadas.length === 0) {
          setErroArquivo('Arquivo não reconhecido. Use o modelo oficial para preenchimento.')
          return
        }

        setTituloProjeto(titulo)
        setTarefas(tarefasImportadas)
      } catch {
        setErroArquivo('Erro ao ler o arquivo. Verifique se é um Excel válido (.xlsx).')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  // ── Criar projeto + tarefas ─────────────────────────────────────────────
  const handleImportar = async () => {
    if (!tituloProjeto.trim()) { setErroSalvar('Informe o título do projeto.'); return }
    if (tarefas.length === 0)  { setErroSalvar('O arquivo não contém tarefas.'); return }
    setSalvando(true)
    setErroSalvar('')
    try {
      const responsaveisNomes = responsaveisIds
        .map(id => lookups.responsaveis.find(r => r.id === id)?.nome)
        .filter(Boolean)

      const projeto = await apiService.createProjeto({
        nome:               tituloProjeto.trim().toUpperCase(),
        departamento_id:    deptId              || null,
        departamento_nome:  deptNome            || null,
        area_nome:          areaNome            || null,
        empresa_id:         empresaId           || null,
        empresa_nome:       empresaNome         || null,
        sistema_id:         sistemaId           || null,
        sistema_nome:       sistemaNome         || null,
        sistemas_nomes:     sistemaNome ? [sistemaNome] : [],
        responsavel_nome:   responsaveisNomes[0] || null,
        responsavel2_nome:  responsaveisNomes[1] || null,
        status:             'mapeado',
        ativo:              true,
      }, userEmail)

      for (let i = 0; i < tarefas.length; i++) {
        await apiService.createTarefa({
          projeto_id:    projeto.id,
          nome:          tarefas[i].nome,
          etapa:         i + 1,
          status_kanban: 'mapeado',
          area_nome:     areaNome    || null,
          empresa_id:    empresaId   || null,
          empresa_nome:  empresaNome || null,
          sistema_nome:  sistemaNome || null,
          progresso_pct: 0,
        })
      }

      onProjetoCriado(projeto.id)
    } catch (err) {
      setErroSalvar('Erro ao criar projeto: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[640px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-full">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Importar Projeto do Excel</h3>
              <p className="text-xs text-slate-500">Preencha o modelo e importe para criar o projeto com todas as tarefas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Passo 1: Upload */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">1. Selecione o arquivo Excel preenchido</p>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-5 flex flex-col items-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-6 w-6 text-slate-400" />
              {arquivoNome
                ? <span className="text-xs font-semibold text-blue-700">{arquivoNome}</span>
                : <span className="text-xs text-slate-500">Clique para selecionar o arquivo <span className="font-semibold">.xlsx</span></span>
              }
              <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleArquivo} />
            </div>
            {erroArquivo && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroArquivo}
              </div>
            )}
          </div>

          {arquivoCarregado && (
            <>
              {/* Passo 2: Título */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">2. Título do Projeto</p>
                <input
                  type="text"
                  value={tituloProjeto}
                  onChange={e => setTituloProjeto(e.target.value.toUpperCase())}
                  placeholder="TÍTULO DO PROJETO"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-md font-semibold text-slate-800 focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                />
              </div>

              {/* Passo 3: Seletores globais */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-700">3. Informações aplicadas ao projeto e a todas as tarefas</p>
                {loadingLookups
                  ? <div className="text-xs text-slate-400 flex items-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando opções...</div>
                  : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className={lbl}>Departamento</label>
                        <select className={sel} value={deptId} onChange={e => {
                          const d = lookups.departamentos.find(x => x.id === e.target.value)
                          setDeptId(e.target.value)
                          setDeptNome(d?.nome_departamento || d?.nome || '')
                        }}>
                          <option value="">— Nenhum —</option>
                          {lookups.departamentos.map(d => <option key={d.id} value={d.id}>{d.nome_departamento || d.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={lbl}>Área</label>
                        <select className={sel} value={areaId} onChange={e => {
                          const a = lookups.areas.find(x => x.id === e.target.value)
                          setAreaId(e.target.value)
                          setAreaNome(a?.nome || '')
                        }}>
                          <option value="">— Nenhuma —</option>
                          {lookups.areas.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={lbl}>Empresa / Unidade</label>
                        <select className={sel} value={empresaId} onChange={e => {
                          const emp = lookups.empresas.find(x => x.id === e.target.value)
                          setEmpresaId(e.target.value)
                          setEmpresaNome(emp?.nome || '')
                        }}>
                          <option value="">— Nenhuma —</option>
                          {lookups.empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className={lbl}>Sistema</label>
                        <select className={sel} value={sistemaId} onChange={e => {
                          const s = lookups.sistemas.find(x => x.id === e.target.value)
                          setSistemaId(e.target.value)
                          setSistemaNome(s?.nome || '')
                        }}>
                          <option value="">— Nenhum —</option>
                          {lookups.sistemas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1 col-span-2">
                        <label className={lbl}>Responsável</label>
                        <MultiSelectResponsaveis
                          opcoes={lookups.responsaveis}
                          selecionados={responsaveisIds}
                          onChange={setResponsaveisIds}
                        />
                      </div>
                    </div>
                  )
                }
              </div>

              {/* Passo 4: Preview das tarefas */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700">4. Tarefas encontradas ({tarefas.length})</p>
                {tarefas.length === 0
                  ? <p className="text-xs text-slate-400 italic">Nenhuma tarefa encontrada no arquivo.</p>
                  : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5 w-8">#</th>
                            <th className="px-3 py-1.5">Nome da Tarefa</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tarefas.map((t, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                              <td className="px-3 py-1.5 text-slate-800">{t.nome}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
              </div>

              {erroSalvar && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroSalvar}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={baixarModeloExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 border border-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Baixar Modelo Projeto
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
              Cancelar
            </button>
            {arquivoCarregado && (
              <button
                onClick={handleImportar}
                disabled={salvando || !tituloProjeto.trim() || tarefas.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {salvando
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Criando...</>
                  : <><CheckCircle className="h-3.5 w-3.5" /> Criar Projeto</>
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
