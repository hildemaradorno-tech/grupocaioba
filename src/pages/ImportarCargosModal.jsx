import React, { useState, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2,
  Loader2, ChevronRight, RefreshCw, Plus as PlusIcon, HelpCircle,
  Search, CheckSquare, Square,
} from 'lucide-react'
import { apiService } from '../services/api'

// Mesma normalização de nome de cargo usada em Cargos.jsx — mantém consistência.
const toUpperCargo = (str) => String(str || '').trim().replace(/\s+/g, ' ').toUpperCase()
const soDigitos = (v) => String(v || '').replace(/\D/g, '')

// Colunas literais do export do ERP (mesmo arquivo usado no cadastro de Funcionários).
const COL_CNPJ = 'cgce_emp'
const COL_CODIGO = 'i_cargos'
const COL_NOME = 'nome_cargo'

// Monta a lista de combinações únicas (CNPJ + Código) do Excel e classifica cada uma contra
// o que já existe no sistema. Pra um código com candidato único, separa se o cargo JÁ tem
// empresa_id gravado igual ao da planilha (nada a fazer) de quando só bate por código/nome mas
// ainda não foi vinculado (precisa do import pra gravar) — são estados bem diferentes na tela,
// mesmo que os dois "combinem". Só cai em novo/ambíguo quando não há candidato único.
function construirLinhas(excelRows, cargosExistentes, empresas) {
  const vistos = new Set()
  const unicos = []
  for (const r of excelRows) {
    const cnpj = soDigitos(r[COL_CNPJ])
    const codigo = String(r[COL_CODIGO] ?? '').trim()
    const nome = toUpperCargo(r[COL_NOME])
    if (!cnpj || !codigo || !nome) continue
    const key = `${cnpj}|${codigo}`
    if (vistos.has(key)) continue
    vistos.add(key)
    unicos.push({ key, cnpj, codigo, nomeExcel: nome })
  }
  unicos.sort((a, b) => a.nomeExcel.localeCompare(b.nomeExcel, 'pt-BR'))

  const claimed = new Set()
  return unicos.map(u => {
    const empresa = empresas.find(e => soDigitos(e.cnpj) === u.cnpj)
    if (!empresa) {
      return { ...u, empresaId: null, empresaNome: null, status: 'empresa_nao_encontrada' }
    }
    const empresaNome = empresa.empresa_fantasia || empresa.nome_empresa || '—'
    const candidatos = cargosExistentes.filter(c =>
      !claimed.has(c.id) &&
      (c.codigo_cargo || '').trim() === u.codigo &&
      (!c.empresa_id || c.empresa_id === empresa.id)
    )
    if (candidatos.length === 1) {
      const cargoAtual = candidatos[0]
      claimed.add(cargoAtual.id)
      const nomesIguais = toUpperCargo(cargoAtual.nome_cargo) === u.nomeExcel
      const jaVinculado = cargoAtual.empresa_id === empresa.id
      const status = jaVinculado
        ? (nomesIguais ? 'ok' : 'match_update_nome')
        : (nomesIguais ? 'vincular' : 'vincular_update_nome')
      return {
        ...u, empresaId: empresa.id, empresaNome,
        cargoExistenteId: cargoAtual.id,
        nomeAtual: cargoAtual.nome_cargo,
        nomeMudou: !nomesIguais,
        status,
      }
    }
    if (candidatos.length === 0) {
      return { ...u, empresaId: empresa.id, empresaNome, status: 'novo', agrupamentoId: '' }
    }
    return { ...u, empresaId: empresa.id, empresaNome, status: 'ambiguo', candidatos, escolha: '' }
  })
}

const STATUS_INFO = {
  ok: { label: 'Já vinculado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  vincular: { label: 'Vincular empresa', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: RefreshCw },
  match_update_nome: { label: 'Atualizar nome', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  vincular_update_nome: { label: 'Vincular + atualizar nome', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: RefreshCw },
  novo: { label: 'Novo cargo', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: PlusIcon },
  ambiguo: { label: 'Escolha necessária', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: HelpCircle },
  empresa_nao_encontrada: { label: 'Empresa não cadastrada', cls: 'bg-red-50 text-red-700 border-red-200', icon: AlertTriangle },
}

export default function ImportarCargosModal({ cargos, empresas, agrupamentos, onClose, onImported }) {
  const fileRef = useRef(null)
  const [arrastando, setArrastando] = useState(false)
  const [etapa, setEtapa] = useState('selecao') // selecao | preview | importando | resultado
  const [erroArquivo, setErroArquivo] = useState(null)
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [linhas, setLinhas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [selecionados, setSelecionados] = useState(new Set())
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [somentePendentes, setSomentePendentes] = useState(false)

  const atualizarLinha = (key, campo, valor) =>
    setLinhas(prev => prev.map(l => l.key === key ? { ...l, [campo]: valor } : l))

  // Linhas sem empresa cadastrada, ou já 100% vinculadas (nada a fazer), ficam de fora da seleção.
  const importavel = (l) => l.status !== 'empresa_nao_encontrada' && l.status !== 'ok'
  // Precisa de uma escolha (agrupamento ou cargo existente) antes de poder ser importada.
  const pendente = (l) => (l.status === 'novo' && !l.agrupamentoId) || (l.status === 'ambiguo' && !l.escolha)

  const linhasFiltradas = useMemo(() => {
    const q = filtroTexto.trim().toLowerCase()
    return linhas.filter(l => {
      if (somentePendentes && !pendente(l)) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      if (!q) return true
      return `${l.empresaNome || ''} ${l.codigo} ${l.nomeExcel}`.toLowerCase().includes(q)
    })
  }, [linhas, filtroTexto, filtroStatus, somentePendentes])

  const toggleSelecionado = (key) => setSelecionados(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const todasFiltradasSelecionadas = linhasFiltradas.filter(importavel).length > 0 &&
    linhasFiltradas.filter(importavel).every(l => selecionados.has(l.key))

  const toggleSelecionarTodasFiltradas = () => setSelecionados(prev => {
    const next = new Set(prev)
    const alvo = linhasFiltradas.filter(importavel)
    if (todasFiltradasSelecionadas) alvo.forEach(l => next.delete(l.key))
    else alvo.forEach(l => next.add(l.key))
    return next
  })

  const processarArquivo = (file) => {
    if (!file) return
    setErroArquivo(null)
    setNomeArquivo(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'binary' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (raw.length === 0) {
          setErroArquivo('O arquivo está vazio ou não possui dados.')
          return
        }
        const cabecalho = Object.keys(raw[0])
        const faltando = [COL_CNPJ, COL_CODIGO, COL_NOME].filter(c => !cabecalho.includes(c))
        if (faltando.length > 0) {
          setErroArquivo(`Colunas não encontradas no arquivo:\n${faltando.join(', ')}`)
          return
        }

        const construidas = construirLinhas(raw, cargos, empresas)
        if (construidas.length === 0) {
          setErroArquivo('Nenhuma combinação válida de empresa + código de cargo encontrada no arquivo.')
          return
        }
        setLinhas(construidas)
        setSelecionados(new Set())
        setFiltroTexto('')
        setFiltroStatus('')
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

  const linhasSelecionadas = linhas.filter(l => selecionados.has(l.key))
  const pendentes = linhasSelecionadas.filter(pendente).length
  const prontasParaImportar = linhasSelecionadas.length - pendentes

  const contagens = linhas.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1
    return acc
  }, {})

  const handleImportar = async () => {
    setEtapa('importando')
    let atualizados = 0
    let criados = 0
    let ignorados = 0
    const erros = []

    let pendentesIgnorados = 0

    for (const l of linhasSelecionadas) {
      try {
        if ((l.status === 'novo' && !l.agrupamentoId) || (l.status === 'ambiguo' && !l.escolha)) {
          pendentesIgnorados++
          continue
        }
        if (l.status === 'vincular' || l.status === 'vincular_update_nome' || l.status === 'match_update_nome') {
          await apiService.updateCargo(l.cargoExistenteId, {
            ...cargos.find(c => c.id === l.cargoExistenteId),
            empresa_id: l.empresaId,
            nome_cargo: l.nomeExcel,
          })
          atualizados++
        } else if (l.status === 'novo') {
          await apiService.createCargo({
            nome_cargo: l.nomeExcel,
            codigo_cargo: l.codigo,
            empresa_id: l.empresaId,
            agrupamento_id: l.agrupamentoId,
            departamento_ids: [],
            setor_ids: [],
            ativo: true,
            nivel_cargo: null,
          })
          criados++
        } else if (l.status === 'ambiguo') {
          if (l.escolha === '__novo__') {
            await apiService.createCargo({
              nome_cargo: l.nomeExcel,
              codigo_cargo: l.codigo,
              empresa_id: l.empresaId,
              agrupamento_id: l.agrupamentoAmbiguo || l.candidatos[0]?.agrupamento_id,
              departamento_ids: [],
              setor_ids: [],
              ativo: true,
              nivel_cargo: null,
            })
            criados++
          } else {
            const cargoEscolhido = cargos.find(c => c.id === l.escolha)
            await apiService.updateCargo(l.escolha, {
              ...cargoEscolhido,
              empresa_id: l.empresaId,
              nome_cargo: l.nomeExcel,
            })
            atualizados++
          }
        } else {
          ignorados++
        }
      } catch (err) {
        erros.push(`${l.nomeExcel} (código ${l.codigo}): ${err.message || String(err)}`)
      }
    }

    if (atualizados > 0 || criados > 0) onImported?.()

    // Sem erros: fecha direto, o resultado já foi aplicado. Com erros, mostra a tela de
    // resultado pra não esconder o que precisa de atenção manual.
    if (erros.length === 0) {
      onClose?.()
      return
    }
    setResultado({ atualizados, criados, ignorados, pendentesIgnorados, erros })
    setEtapa('resultado')
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[920px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><FileSpreadsheet className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Importar Cargos via Excel</h2>
              <p className="text-[11px] text-slate-500">Compara CNPJ + Código de Cargo da planilha com o cadastro atual e resolve as diferenças.</p>
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
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">Colunas obrigatórias (export do ERP)</p>
                <div className="flex flex-wrap gap-1.5">
                  {[COL_CNPJ, COL_CODIGO, COL_NOME].map(c => (
                    <span key={c} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">{c}</span>
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
                <p className="text-xs text-blue-700"><strong>{nomeArquivo}</strong> — {linhas.length} combinação(ões) de empresa + código encontradas</p>
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

              {/* Filtro de busca + seleção */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={filtroTexto}
                    onChange={e => setFiltroTexto(e.target.value)}
                    placeholder="Filtrar por empresa, código ou nome do cargo..."
                    className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400"
                  />
                </div>
                {filtroStatus && (
                  <button onClick={() => setFiltroStatus('')} className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                    <X className="h-3 w-3" /> Limpar filtro de status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSomentePendentes(v => !v)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors ${somentePendentes ? 'bg-amber-100 text-amber-700 border-amber-300' : 'text-slate-500 border-slate-200 hover:border-amber-300 hover:text-amber-600'}`}
                >
                  <HelpCircle className="h-3 w-3" /> Só pendências
                </button>
                <span className="text-[11px] font-semibold text-slate-400 ml-auto whitespace-nowrap">
                  {selecionados.size} de {linhas.filter(importavel).length} selecionado(s)
                </span>
              </div>

              {pendentes > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>{pendentes}</strong> das linhas selecionadas ainda não têm uma escolha feita (agrupamento ou cargo existente) — elas serão <strong>ignoradas</strong> nesta importação.
                    Clique em <strong>"Só pendências"</strong> pra encontrá-las e resolver, ou desmarque-as pra importar só o restante agora.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                      <th className="p-2 w-8">
                        <button type="button" onClick={toggleSelecionarTodasFiltradas} className="flex items-center text-slate-400 hover:text-blue-600" title="Selecionar/desmarcar todos os filtrados">
                          {todasFiltradasSelecionadas ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5" />}
                        </button>
                      </th>
                      <th className="p-2 whitespace-nowrap">Empresa</th>
                      <th className="p-2 whitespace-nowrap">Código</th>
                      <th className="p-2 whitespace-nowrap">Cargo (planilha)</th>
                      <th className="p-2 whitespace-nowrap">Status</th>
                      <th className="p-2 whitespace-nowrap">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasFiltradas.length === 0 ? (
                      <tr><td colSpan={6} className="p-6 text-center text-xs text-slate-400">Nenhuma linha encontrada para o filtro aplicado.</td></tr>
                    ) : linhasFiltradas.map(l => {
                      const info = STATUS_INFO[l.status]
                      const sel = selecionados.has(l.key)
                      return (
                        <tr key={l.key} className={`hover:bg-slate-50/60 align-top ${!importavel(l) ? 'opacity-50' : ''}`}>
                          <td className="p-2">
                            {importavel(l) && (
                              <button type="button" onClick={() => toggleSelecionado(l.key)} className="flex items-center">
                                {sel ? <CheckSquare className="h-3.5 w-3.5 text-blue-600" /> : <Square className="h-3.5 w-3.5 text-slate-300" />}
                              </button>
                            )}
                          </td>
                          <td className="p-2 text-[11px] text-slate-700 whitespace-nowrap">{l.empresaNome || <span className="text-red-500 font-mono">{l.cnpj}</span>}</td>
                          <td className="p-2 text-[11px] font-mono text-slate-500">{l.codigo}</td>
                          <td className="p-2 text-[11px] font-semibold text-slate-800">
                            {l.nomeExcel}
                            {l.nomeMudou && (
                              <div className="text-[10px] font-normal text-amber-600 mt-0.5">antes: {l.nomeAtual}</div>
                            )}
                          </td>
                          <td className="p-2">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${info.cls}`}>
                              <info.icon className="h-3 w-3" /> {info.label}
                            </span>
                          </td>
                          <td className="p-2 min-w-[220px]">
                            {l.status === 'novo' && (
                              <select
                                value={l.agrupamentoId}
                                onChange={e => atualizarLinha(l.key, 'agrupamentoId', e.target.value)}
                                className={`w-full text-[11px] p-1.5 border rounded-md bg-white font-medium text-slate-800 ${!l.agrupamentoId ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                              >
                                <option value="">Selecione o agrupamento...</option>
                                {agrupamentos.map(a => <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>)}
                              </select>
                            )}
                            {l.status === 'ambiguo' && (
                              <select
                                value={l.escolha}
                                onChange={e => atualizarLinha(l.key, 'escolha', e.target.value)}
                                className={`w-full text-[11px] p-1.5 border rounded-md bg-white font-medium text-slate-800 ${!l.escolha ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}
                              >
                                <option value="">Selecione...</option>
                                {l.candidatos.map(c => (
                                  <option key={c.id} value={c.id}>Vincular a "{c.nome_cargo}"</option>
                                ))}
                                <option value="__novo__">Criar como cargo novo</option>
                              </select>
                            )}
                            {l.status === 'vincular' && (
                              <span className="text-[11px] text-slate-400">Vai gravar a empresa neste cargo</span>
                            )}
                            {l.status === 'vincular_update_nome' && (
                              <span className="text-[11px] text-slate-400">Vai gravar a empresa e atualizar o nome</span>
                            )}
                            {l.status === 'match_update_nome' && (
                              <span className="text-[11px] text-slate-400">Empresa já vinculada — só atualiza o nome</span>
                            )}
                            {l.status === 'ok' && (
                              <span className="text-[11px] text-emerald-500">Nenhuma ação necessária</span>
                            )}
                            {l.status === 'empresa_nao_encontrada' && (
                              <span className="text-[11px] text-red-500">CNPJ não cadastrado em Empresas — não será importado</span>
                            )}
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
              <p className="text-sm font-semibold text-slate-700">Importando cargos...</p>
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
                    <strong>{resultado.atualizados}</strong> cargo(s) atualizado(s) ·{' '}
                    <strong>{resultado.criados}</strong> cargo(s) criado(s)
                    {resultado.ignorados > 0 && <> · <strong>{resultado.ignorados}</strong> ignorado(s)</>}
                    {resultado.pendentesIgnorados > 0 && <> · <strong>{resultado.pendentesIgnorados}</strong> pendente(s) sem escolha (não importados)</>}
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
              <button onClick={() => { setEtapa('selecao'); setLinhas([]); setSelecionados(new Set()) }} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              {pendentes > 0 && (
                <span className="text-[11px] text-amber-600 font-semibold">{pendentes} pendência(s) — serão ignoradas</span>
              )}
              {prontasParaImportar === 0 && (
                <span className="text-[11px] text-slate-400 font-semibold">Selecione ao menos um cargo pronto pra importar</span>
              )}
              <button
                onClick={handleImportar}
                disabled={prontasParaImportar === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold shadow-sm transition-colors ${prontasParaImportar === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'text-white bg-blue-600 hover:bg-blue-700'}`}
              >
                Importar {prontasParaImportar > 0 ? `(${prontasParaImportar})` : ''} <ChevronRight className="h-3.5 w-3.5" />
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
