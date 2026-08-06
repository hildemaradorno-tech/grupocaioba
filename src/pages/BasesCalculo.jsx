import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Calculator, Eye, Search, Loader2, PlayCircle, Trash2, ArrowUp, ArrowDown, ListPlus, Copy, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const TIPOS_AGREGACAO = [
  { value: 'SOMA', label: 'Soma' },
  { value: 'CONTAGEM', label: 'Contagem' },
  { value: 'MEDIA', label: 'Média' },
]

const TIPOS_ACAO = [
  { value: 'FILTRAR', label: 'Filtrar (incluir linha somente se...)' },
  { value: 'DEFINIR_VALOR', label: 'Definir valor = coluna...' },
  { value: 'INVERTER_SINAL', label: 'Inverter sinal (× -1)' },
  { value: 'FORCAR_NEGATIVO', label: 'Forçar negativo (ignora o sinal original)' },
  { value: 'FORCAR_POSITIVO', label: 'Forçar positivo (ignora o sinal original)' },
  { value: 'SOMAR_COLUNA', label: 'Somar coluna...' },
  { value: 'SUBTRAIR_COLUNA', label: 'Subtrair coluna...' },
  { value: 'MULTIPLICAR_COLUNA', label: 'Multiplicar por coluna...' },
  { value: 'DIVIDIR_COLUNA', label: 'Dividir por coluna...' },
]
const ACOES_COM_COLUNA_ALVO = ['DEFINIR_VALOR', 'SOMAR_COLUNA', 'SUBTRAIR_COLUNA', 'MULTIPLICAR_COLUNA', 'DIVIDIR_COLUNA']
// Nessas, a Coluna Alvo é opcional: se vazia, a ação usa o valor de trabalho corrente da linha
// (comportamento padrão); se preenchida, aplica o sinal sobre o valor dessa coluna específica.
const ACOES_COM_COLUNA_ALVO_OPCIONAL = ['INVERTER_SINAL', 'FORCAR_NEGATIVO', 'FORCAR_POSITIVO']
const OPERADORES = [
  { value: 'IGUAL', label: 'Igual a' },
  { value: 'DIFERENTE', label: 'Diferente de' },
  { value: 'CONTEM', label: 'Contém' },
  { value: 'NAO_CONTEM', label: 'Não contém' },
  { value: 'COMECA_COM', label: 'Começa com' },
  { value: 'NAO_COMECA_COM', label: 'Não começa com' },
  { value: 'SETOR_OS_IGUAL', label: 'Setor da O.S. é' },
  { value: 'SETOR_OS_DIFERENTE', label: 'Setor da O.S. não é' },
  { value: 'EM_BRANCO', label: 'Está em branco' },
  { value: 'NAO_EM_BRANCO', label: 'Não está em branco' },
]
// Operadores cujo valor é um SETOR (escolhido do cadastro de Tipos de O.S.), não texto livre —
// a coluna da condição deve ser a que traz a sigla/tipo da O.S. no arquivo.
const OPERADORES_SETOR_OS = ['SETOR_OS_IGUAL', 'SETOR_OS_DIFERENTE']
const OPERADORES_SEM_VALOR = ['EM_BRANCO', 'NAO_EM_BRANCO']

// Código não é mais editável na tela — é gerado automaticamente a partir do Nome só na
// criação (preservado depois, mesmo se o Nome for renomeado, pra não quebrar Políticas que
// já apontam pra esse código).
const REGEX_ACENTOS = /[\u0300-\u036f]/g
const gerarCodigo = (nome) => (nome || '')
  .trim()
  .toUpperCase()
  .normalize('NFD').replace(REGEX_ACENTOS, '')
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const novoTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const novaCondicao = () => ({ tempId: novoTempId(), coluna: '', operador: 'IGUAL', valor: '' })
const novaRegra = () => ({ tempId: novoTempId(), tipo_acao: 'FILTRAR', coluna_alvo: '', condicao_logica: 'E', condicoes: [novaCondicao()] })

const FORM_VAZIO = {
  fonte_calculo_id: '', nome: '', codigo: '', descricao: '',
  coluna_valor: '', tipo_agregacao: 'SOMA', ativo: true,
}

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
// Sem w-full — usado quando o próprio elemento precisa controlar sua largura (ex: w-40 shrink-0),
// já que combinar "w-full" com uma largura fixa no mesmo className gera conflito de CSS.
const SEL_SM = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

// Prefixa "R$" quando a agregação é monetária (SOMA/MEDIA); CONTAGEM é só um número de linhas, sem moeda.
const fmtValor = (v, tipoAgregacao) => {
  if (v == null) return '-'
  const numero = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return tipoAgregacao === 'CONTAGEM' ? v.toLocaleString('pt-BR') : `R$ ${numero}`
}

// Seletor de coluna: vira um <select> de verdade assim que "Detectar Colunas" já rodou;
// antes disso (ou se falhar), cai pra texto livre com uma dica de onde clicar.
function CampoColuna({ value, onChange, colunas, layoutClass, opcional }) {
  if (colunas && colunas.length > 0) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} className={`${SEL} font-mono ${layoutClass}`}>
        <option value="">{opcional ? '(usar valor atual da linha)' : 'Selecione a coluna...'}</option>
        {value && !colunas.includes(value) && <option value={value}>{value}</option>}
        {colunas.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    )
  }
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={opcional ? 'Coluna (opcional) — Detectar Colunas ↑' : 'Clique em Detectar Colunas ↑'}
      className={`${INP} font-mono ${layoutClass}`}
    />
  )
}

export default function BasesCalculo() {
  const [dados, setDados] = useState([])
  const [fontes, setFontes] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [setoresOS, setSetoresOS] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [duplicandoId, setDuplicandoId] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('basecalc_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('basecalc_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('basecalc_form', FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [erroExcluir, setErroExcluir] = useState(null)

  const [detectando, setDetectando] = useState(false)
  const [erroDetectar, setErroDetectar] = useState(null)
  const [colunasDetectadas, setColunasDetectadas] = useState(null)

  // Regras de Cálculo (motor de regras da Base — filtros/transformações antes da agregação)
  const [regras, setRegras] = useState([])
  const [carregandoRegras, setCarregandoRegras] = useState(false)

  // Painel de conferência
  const [confBaseId, setConfBaseId] = useSessionState('basecalc_conf_base', '')
  const [confEmpresaId, setConfEmpresaId] = useSessionState('basecalc_conf_empresa', '')
  const [confDataInicio, setConfDataInicio] = useSessionState('basecalc_conf_ini', '')
  const [confDataFim, setConfDataFim] = useSessionState('basecalc_conf_fim', '')
  const [calculando, setCalculando] = useState(false)
  const [erroCalcular, setErroCalcular] = useState(null)
  const [resultado, setResultado] = useState(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('bases-calculo', 'editar')
  const canDelete = hasPermission('bases-calculo', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [bases, fontesData, emps, tiposOS] = await Promise.all([
        apiService.getBasesCalculoComFonte(),
        apiService.getFontesCalculo(),
        apiService.getEmpresas(),
        apiService.getTiposOS().catch(() => []),
      ])
      setDados(bases)
      setFontes(fontesData)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
      // Setores únicos do cadastro de Tipos de O.S. — opções do operador "Setor da O.S.".
      setSetoresOS([...new Set(tiposOS.map(t => (t.setor_servico || '').trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR')))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const fonteSelecionada = useMemo(() => fontes.find(f => f.id === form.fonte_calculo_id) || null, [fontes, form.fonte_calculo_id])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO })
    setErroModal(null)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setRegras([])
    setModalAberto(true)
  }

  const abrirEditar = async (item) => {
    setEditingId(item.id)
    setForm({
      fonte_calculo_id: item.fonte_calculo_id || '',
      nome: item.nome || '',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      coluna_valor: item.coluna_valor || '',
      tipo_agregacao: item.tipo_agregacao || 'SOMA',
      ativo: item.ativo ?? true,
    })
    setErroModal(null)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setRegras([])
    setModalAberto(true)
    setCarregandoRegras(true)
    try {
      const regrasDb = await apiService.getRegrasComCondicoes(item.id)
      setRegras(regrasDb.map(r => ({
        tempId: novoTempId(),
        tipo_acao: r.tipo_acao,
        coluna_alvo: r.coluna_alvo || '',
        condicao_logica: r.condicao_logica || 'E',
        condicoes: (r.condicoes || []).map(c => ({
          tempId: novoTempId(), coluna: c.coluna || '', operador: c.operador || 'IGUAL', valor: c.valor || '',
        })),
      })))
    } catch (err) {
      setErroModal('Erro ao carregar regras: ' + (err.message || String(err)))
    } finally {
      setCarregandoRegras(false)
    }
  }

  const adicionarRegra = () => setRegras(prev => [...prev, novaRegra()])
  const removerRegra = (tempId) => setRegras(prev => prev.filter(r => r.tempId !== tempId))
  const atualizarRegra = (tempId, patch) => setRegras(prev => prev.map(r => r.tempId === tempId ? { ...r, ...patch } : r))
  const moverRegra = (tempId, direcao) => setRegras(prev => {
    const idx = prev.findIndex(r => r.tempId === tempId)
    const novoIdx = idx + direcao
    if (idx < 0 || novoIdx < 0 || novoIdx >= prev.length) return prev
    const copia = [...prev]
    ;[copia[idx], copia[novoIdx]] = [copia[novoIdx], copia[idx]]
    return copia
  })

  const adicionarCondicao = (regraTempId) => setRegras(prev => prev.map(r =>
    r.tempId === regraTempId ? { ...r, condicoes: [...r.condicoes, novaCondicao()] } : r
  ))
  const removerCondicao = (regraTempId, condTempId) => setRegras(prev => prev.map(r =>
    r.tempId === regraTempId ? { ...r, condicoes: r.condicoes.filter(c => c.tempId !== condTempId) } : r
  ))
  const atualizarCondicao = (regraTempId, condTempId, patch) => setRegras(prev => prev.map(r =>
    r.tempId === regraTempId
      ? { ...r, condicoes: r.condicoes.map(c => c.tempId === condTempId ? { ...c, ...patch } : c) }
      : r
  ))

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setItemVisualizado(item)
    setErroExcluir(null)
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => {
    setItemVisualizado(item)
    setModalVisualizarAberto(true)
  }

  const handleDuplicar = async (item) => {
    setDuplicandoId(item.id)
    setError(null)
    try {
      const regrasOriginais = await apiService.getRegrasComCondicoes(item.id)
      // Acha um sufixo livre: "(Cópia)", "(Cópia 2)", "(Cópia 3)"... conferindo tanto o Nome
      // quanto o Código gerado — uma cópia antiga renomeada mantém o código dela, então só
      // checar o nome não basta pra evitar o erro de duplicidade.
      const nomesExistentes = new Set(dados.map(b => (b.nome || '').trim().toLowerCase()))
      const codigosExistentes = new Set(dados.map(b => b.codigo).filter(Boolean))
      let nomeCopia = `${item.nome} (Cópia)`
      for (let n = 2; nomesExistentes.has(nomeCopia.trim().toLowerCase()) || codigosExistentes.has(gerarCodigo(nomeCopia)); n++) {
        nomeCopia = `${item.nome} (Cópia ${n})`
      }
      const criada = await apiService.createBaseCalculo({
        fonte_calculo_id: item.fonte_calculo_id,
        nome: nomeCopia,
        codigo: gerarCodigo(nomeCopia),
        descricao: item.descricao || null,
        coluna_valor: item.coluna_valor || null,
        tipo_agregacao: item.tipo_agregacao,
        ativo: item.ativo,
      })
      const regrasParaCopia = regrasOriginais.map((r, i) => ({
        ordem: i,
        tipo_acao: r.tipo_acao,
        coluna_alvo: r.coluna_alvo || null,
        condicao_logica: r.condicao_logica || null,
        condicoes: (r.condicoes || []).map((c, j) => ({ ordem: j, coluna: c.coluna, operador: c.operador, valor: c.valor })),
      }))
      await apiService.setRegrasCalculo(criada.id, regrasParaCopia)
      await loadData()
    } catch (err) {
      const msg = String(err.message || err)
      alert(msg.includes('duplicate key') || msg.includes('unique')
        ? 'Já existe uma Base de Cálculo com nome/código equivalente ao da cópia. Renomeie a existente e tente de novo.'
        : 'Erro ao duplicar: ' + msg)
    } finally {
      setDuplicandoId(null)
    }
  }

  const handleDetectarColunas = async () => {
    if (!fonteSelecionada?.pasta_sharepoint || !fonteSelecionada?.prefixo_arquivo) return
    setDetectando(true)
    setErroDetectar(null)
    setColunasDetectadas(null)
    try {
      const info = await apiService.getColunasFonteCalculo({
        pasta: fonteSelecionada.pasta_sharepoint,
        prefixo: fonteSelecionada.prefixo_arquivo,
        usaSubpastaAno: fonteSelecionada.usa_subpasta_ano,
        linhaCabecalho: fonteSelecionada.linha_cabecalho,
      })
      setColunasDetectadas(info)
    } catch (err) {
      setErroDetectar(err.message || String(err))
    } finally {
      setDetectando(false)
    }
  }

  const regrasParaPayload = () => regras.map((r, i) => ({
    ordem: i,
    tipo_acao: r.tipo_acao,
    coluna_alvo: (ACOES_COM_COLUNA_ALVO.includes(r.tipo_acao) || ACOES_COM_COLUNA_ALVO_OPCIONAL.includes(r.tipo_acao)) ? (r.coluna_alvo || null) : null,
    condicao_logica: r.condicoes.length >= 2 ? (r.condicao_logica || 'E') : null,
    condicoes: r.condicoes
      .filter(c => c.coluna)
      .map((c, j) => ({
        ordem: j,
        coluna: c.coluna,
        operador: c.operador,
        valor: OPERADORES_SEM_VALOR.includes(c.operador) ? null : (c.valor || null),
      })),
  }))

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    try {
      const payload = {
        fonte_calculo_id: form.fonte_calculo_id,
        nome: form.nome,
        // Código sempre acompanha o Nome (criação E edição). Desde a troca do vínculo
        // Política↔Base pra ID, o código é só um rótulo interno — regenerar ao renomear não
        // quebra nada e libera o código antigo (ex: o "..._COPIA" de uma cópia renomeada).
        codigo: gerarCodigo(form.nome),
        descricao: form.descricao || null,
        coluna_valor: form.coluna_valor || null,
        tipo_agregacao: form.tipo_agregacao,
        ativo: form.ativo,
      }
      let baseId = editingId
      if (editingId) {
        await apiService.updateBaseCalculo(editingId, payload)
      } else {
        const criada = await apiService.createBaseCalculo(payload)
        baseId = criada.id
      }
      await apiService.setRegrasCalculo(baseId, regrasParaPayload())
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = String(err.message || err)
      setErroModal(msg.includes('duplicate key') || msg.includes('unique')
        ? `Já existe uma Base de Cálculo com um nome equivalente a "${form.nome}". Use um nome diferente.`
        : 'Erro ao salvar: ' + msg)
    }
  }

  const handleConfirmarExclusao = async () => {
    setErroExcluir(null)
    try {
      await apiService.deleteBaseCalculo(idExcluir)
      await loadData()
      setModalExcluirAberto(false)
    } catch (err) {
      setErroExcluir('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  const baseConferencia = useMemo(() => dados.find(b => b.id === confBaseId) || null, [dados, confBaseId])
  const empresaConferencia = useMemo(() => empresas.find(e => e.id === confEmpresaId) || null, [empresas, confEmpresaId])

  const handleCalcular = async () => {
    if (!baseConferencia) return
    const fonte = baseConferencia.fonte_calculo
    if (!fonte?.pasta_sharepoint || !fonte?.prefixo_arquivo || !baseConferencia.coluna_valor) {
      setErroCalcular('Esta Base (ou sua Fonte) ainda não tem arquivo/coluna do SharePoint configurados.')
      return
    }
    setCalculando(true)
    setErroCalcular(null)
    setResultado(null)
    try {
      const empresaLabel = empresaConferencia
        ? (empresaConferencia.nome_empresa_sistema || empresaConferencia.empresa_fantasia || empresaConferencia.nome_empresa)
        : null
      const regrasDaBase = await apiService.getRegrasParaCalculo(baseConferencia.id)
      const res = await apiService.previewCalculoComissao({
        pasta: fonte.pasta_sharepoint,
        prefixo: fonte.prefixo_arquivo,
        usaSubpastaAno: fonte.usa_subpasta_ano,
        linhaCabecalho: fonte.linha_cabecalho,
        colunaEmpresa: fonte.coluna_empresa,
        colunaData: fonte.coluna_data,
        colunaValor: baseConferencia.coluna_valor,
        tipoAgregacao: baseConferencia.tipo_agregacao,
        empresaNome: empresaLabel,
        dataInicio: confDataInicio,
        dataFim: confDataFim,
        regras: regrasDaBase,
      })
      setResultado(res)
    } catch (err) {
      setErroCalcular(err.message || String(err))
    } finally {
      setCalculando(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Base de Cálculo</h1>
          <p className="text-xs text-slate-500">Defina qual coluna e agregação extraem o valor de cada Fonte de Cálculo.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Base
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Nome</th>
              <th className="p-3">Fonte de Cálculo</th>
              <th className="p-3 w-40">Coluna Valor</th>
              <th className="p-3 w-28 text-center">Tipo de Cálculo</th>
              <th className="p-3 w-20 text-center">Ativo</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-400">Nenhuma Base de Cálculo cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {item.nome}
                  </div>
                </td>
                <td className="p-3 text-slate-700">{item.fonte_calculo?.nome || '-'}</td>
                <td className="p-3 text-slate-600 font-mono text-[11px]">{item.coluna_valor || '-'}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">{item.tipo_agregacao}</span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <PermissionActionButtons
                      menuPath="bases-calculo"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDuplicar(item)}
                        disabled={duplicandoId === item.id}
                        title="Duplicar Base de Cálculo (copia as Regras de Cálculo também)"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {duplicandoId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAINEL DE CONFERÊNCIA / AUDITORIA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <PlayCircle className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Conferência de Valores</h2>
          <span className="text-[11px] text-slate-400">Calcule o valor real lido do SharePoint para auditar uma Base, Empresa e período.</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Base de Cálculo</label>
              <select className={SEL} value={confBaseId} onChange={e => { setConfBaseId(e.target.value); setResultado(null); setErroCalcular(null) }}>
                <option value="">Selecione...</option>
                {dados.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Empresa</label>
              <select className={SEL} value={confEmpresaId} onChange={e => setConfEmpresaId(e.target.value)}>
                <option value="">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
              </select>
              {empresaConferencia && !empresaConferencia.nome_empresa_sistema && (
                <span className="text-[10px] text-amber-500">
                  Esta empresa não tem "Nome Empresa no Sistema" cadastrado — o filtro pode não encontrar nenhuma linha.
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Data Início</label>
              <input type="date" className={INP} value={confDataInicio} onChange={e => setConfDataInicio(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Data Fim</label>
              <input type="date" className={INP} value={confDataFim} onChange={e => setConfDataFim(e.target.value)} />
            </div>
          </div>

          <button
            onClick={handleCalcular}
            disabled={!confBaseId || calculando}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            {calculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            Calcular
          </button>

          {erroCalcular && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroCalcular}
            </div>
          )}

          {resultado && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4 flex flex-wrap items-center gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Valor Calculado</span>
                <span className="text-xl font-mono font-bold text-emerald-800">{fmtValor(resultado.valor, baseConferencia?.tipo_agregacao)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linhas Filtradas</span>
                <span className="text-sm font-mono font-semibold text-slate-700">{resultado.total_linhas_filtradas?.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linhas no Arquivo</span>
                <span className="text-sm font-mono font-semibold text-slate-700">{resultado.total_linhas_fonte?.toLocaleString('pt-BR')}</span>
              </div>
              {resultado.empresas_disponiveis_amostra?.length > 0 && (
                <div className="w-full flex flex-col gap-1 border-t border-emerald-200 pt-3">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">
                    Nenhuma linha bateu com a empresa selecionada — nomes encontrados no arquivo:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {resultado.empresas_disponiveis_amostra.map(nome => (
                      <span key={nome} className="px-1.5 py-0.5 rounded bg-white border border-amber-200 text-[10px] font-mono text-amber-700">{nome}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[680px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Base de Cálculo' : 'Incluir Base de Cálculo'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto custom-scrollbar">

                {/* Fonte */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Fonte de Cálculo *</label>
                  <select required name="fonte_calculo_id" value={form.fonte_calculo_id} onChange={handleInputChange} className={SEL}>
                    <option value="">Selecione a fonte</option>
                    {fontes.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                  {fonteSelecionada && !fonteSelecionada.pasta_sharepoint && (
                    <span className="text-[10px] text-amber-500">Esta Fonte ainda não tem arquivo do SharePoint configurado.</span>
                  )}
                </div>

                {/* Nome */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Nome *</label>
                  <input type="text" name="nome" required value={form.nome} onChange={handleInputChange} placeholder="Ex: Faturamento de Peças" className={INP} />
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição</label>
                  <input type="text" name="descricao" value={form.descricao} onChange={handleInputChange} placeholder="Observações sobre esta base" className={INP} />
                </div>

                {/* Coluna Valor + Agregação */}
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna do Valor</label>
                    <input type="text" name="coluna_valor" value={form.coluna_valor} onChange={handleInputChange} placeholder="Ex: NotaFiscal_ValorProduto" className={`${INP} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tipo de Cálculo *</label>
                    <select required name="tipo_agregacao" value={form.tipo_agregacao} onChange={handleInputChange} className={SEL}>
                      {TIPOS_AGREGACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDetectarColunas}
                    disabled={!fonteSelecionada?.pasta_sharepoint || !fonteSelecionada?.prefixo_arquivo || detectando}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    {detectando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                    Detectar Colunas
                  </button>
                  {colunasDetectadas && (
                    <span className="text-[10px] text-slate-400">{colunasDetectadas.total_linhas.toLocaleString('pt-BR')} linha(s) no arquivo</span>
                  )}
                </div>

                {erroDetectar && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-[11px] leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroDetectar}
                  </div>
                )}

                {colunasDetectadas && colunasDetectadas.colunas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
                    {colunasDetectadas.colunas.map(col => (
                      <button key={col} type="button" onClick={() => setForm(prev => ({ ...prev, coluna_valor: col }))}
                        className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-[10px] font-mono text-slate-700 hover:text-blue-700 transition-colors">
                        {col}
                      </button>
                    ))}
                  </div>
                )}

                {/* Regras de Cálculo */}
                <div className="border-t border-slate-100 pt-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={LBL}>Regras de Cálculo</label>
                      <p className="text-[10px] text-slate-400 mt-0.5">Filtros e transformações aplicados linha a linha, antes da agregação acima.</p>
                    </div>
                    <button type="button" onClick={adicionarRegra}
                      className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2.5 py-1.5 rounded-md transition-colors shrink-0">
                      <ListPlus className="h-3 w-3" /> Adicionar Regra
                    </button>
                  </div>

                  {carregandoRegras ? (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando regras...</div>
                  ) : regras.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">Nenhuma regra — o valor será a Coluna do Valor acima, agregada diretamente.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {regras.map((regra, idxRegra) => (
                        <div key={regra.tempId} className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50/50">
                          {/* Cabeçalho da regra: número, ação, coluna alvo, mover/excluir */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 shrink-0">#{idxRegra + 1}</span>
                            <select
                              value={regra.tipo_acao}
                              onChange={e => atualizarRegra(regra.tempId, { tipo_acao: e.target.value })}
                              className={`${SEL} flex-1 min-w-[180px]`}
                            >
                              {TIPOS_ACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            {(ACOES_COM_COLUNA_ALVO.includes(regra.tipo_acao) || ACOES_COM_COLUNA_ALVO_OPCIONAL.includes(regra.tipo_acao)) && (
                              <CampoColuna
                                value={regra.coluna_alvo}
                                onChange={v => atualizarRegra(regra.tempId, { coluna_alvo: v })}
                                colunas={colunasDetectadas?.colunas}
                                layoutClass="flex-1 min-w-[140px]"
                                opcional={ACOES_COM_COLUNA_ALVO_OPCIONAL.includes(regra.tipo_acao)}
                              />
                            )}
                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <button type="button" onClick={() => moverRegra(regra.tempId, -1)} disabled={idxRegra === 0}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                <ArrowUp className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => moverRegra(regra.tempId, 1)} disabled={idxRegra === regras.length - 1}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed">
                                <ArrowDown className="h-3 w-3" />
                              </button>
                              <button type="button" onClick={() => removerRegra(regra.tempId)}
                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>

                          {/* Condições */}
                          <div className="pl-1 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Condições (vazio = sempre aplica)</span>
                              {regra.condicoes.length >= 2 && (
                                <div className="flex items-center rounded-md border border-slate-200 overflow-hidden text-[10px] font-bold">
                                  <button type="button" onClick={() => atualizarRegra(regra.tempId, { condicao_logica: 'E' })}
                                    className={`px-2 py-0.5 ${regra.condicao_logica !== 'OU' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>E</button>
                                  <button type="button" onClick={() => atualizarRegra(regra.tempId, { condicao_logica: 'OU' })}
                                    className={`px-2 py-0.5 ${regra.condicao_logica === 'OU' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>OU</button>
                                </div>
                              )}
                            </div>
                            <div className="divide-y divide-slate-100">
                              {regra.condicoes.map(cond => (
                                <div key={cond.tempId} className="flex items-center gap-1.5 py-1.5">
                                  <CampoColuna
                                    value={cond.coluna}
                                    onChange={v => atualizarCondicao(regra.tempId, cond.tempId, { coluna: v })}
                                    colunas={colunasDetectadas?.colunas}
                                    layoutClass="flex-1 min-w-[100px]"
                                  />
                                  <select
                                    value={cond.operador}
                                    onChange={e => atualizarCondicao(regra.tempId, cond.tempId, { operador: e.target.value })}
                                    className={`${SEL_SM} w-40 shrink-0`}
                                  >
                                    {OPERADORES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                  </select>
                                  {OPERADORES_SETOR_OS.includes(cond.operador) ? (
                                    <select
                                      value={cond.valor}
                                      onChange={e => atualizarCondicao(regra.tempId, cond.tempId, { valor: e.target.value })}
                                      title="Setor vindo do cadastro de Tipos de O.S. — no cálculo, vira a lista de siglas de O.S. desse setor"
                                      className={`${SEL_SM} flex-1 min-w-[120px]`}
                                    >
                                      <option value="">Selecione o setor...</option>
                                      {cond.valor && !setoresOS.includes(cond.valor) && <option value={cond.valor}>{cond.valor}</option>}
                                      {setoresOS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  ) : !OPERADORES_SEM_VALOR.includes(cond.operador) && (
                                    <input
                                      type="text"
                                      value={cond.valor}
                                      onChange={e => atualizarCondicao(regra.tempId, cond.tempId, { valor: e.target.value })}
                                      placeholder="Valor"
                                      className={`${INP} flex-1 min-w-[80px]`}
                                    />
                                  )}
                                  <button type="button" onClick={() => removerCondicao(regra.tempId, cond.tempId)}
                                    className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button type="button" onClick={() => adicionarCondicao(regra.tempId)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800">
                              + Adicionar Condição
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ativo */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleInputChange} className="w-4 h-4" />
                  Ativo
                </label>
              </div>

              {erroModal && (
                <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                  Salvar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[560px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Base de Cálculo
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono font-bold border border-slate-200">{itemVisualizado.codigo}</span>
                  {itemVisualizado.nome}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fonte de Cálculo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.fonte_calculo?.nome || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna do Valor</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_valor || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Cálculo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.tipo_agregacao}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ativo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.ativo ? 'Sim' : 'Não'}</span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a remoção da base <strong className="text-slate-800">"{itemVisualizado.nome}"</strong>? Esta ação não pode ser desfeita.
                </p>
                {erroExcluir && (
                  <p className="text-xs text-red-600 leading-relaxed pt-1">{erroExcluir}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
