import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Ruler, Eye, Search, Loader2, PlayCircle, Trash2, ArrowUp, ArrowDown, ListPlus } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'

const TIPOS_AGREGACAO = [
  { value: 'SOMA', label: 'Soma' },
  { value: 'CONTAGEM', label: 'Contagem' },
  { value: 'CONTAGEM_DISTINTA', label: 'Contagem Distinta' },
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
const OPERADORES_SETOR_OS = ['SETOR_OS_IGUAL', 'SETOR_OS_DIFERENTE']
const OPERADORES_SEM_VALOR = ['EM_BRANCO', 'NAO_EM_BRANCO']

const NIVEIS_FUNCIONARIO = [
  { value: 'funcionario', label: 'Funcionário' },
  { value: 'departamento', label: 'Departamento' },
  { value: 'setor', label: 'Setor' },
  { value: 'box', label: 'Box' },
  { value: 'grupo', label: 'Grupo (Agrupamento de Empresas)' },
]

const REGEX_ACENTOS = /[̀-ͯ]/g
const gerarCodigo = (nome) => (nome || '')
  .trim()
  .toUpperCase()
  .normalize('NFD').replace(REGEX_ACENTOS, '')
  .replace(/[^A-Z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')

const novoTempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
const novaCondicao = () => ({ tempId: novoTempId(), coluna: '', operador: 'IGUAL', valor: '' })
const novaRegra = () => ({ tempId: novoTempId(), tipo_acao: 'FILTRAR', coluna_alvo: '', condicao_logica: 'E', condicoes: [novaCondicao()] })

// Coluna da tabela de Faturamento (BI — Possibilidades) que esta Medida pode alimentar direto,
// sempre com o valor TOTAL (sem corte por dimensão). A tabela hoje só tem a linha Total (sem
// quebra por departamento), então o slot é só por coluna — não por departamento.
const SLOTS_FATURAMENTO = [
  { value: '', label: 'Nenhum (não aparece na tabela de Faturamento)' },
  { value: 'realPecas', label: 'Real Peças' },
  { value: 'realServicos', label: 'Real Serviços' },
  { value: 'margemPecas', label: 'Margem Peças' },
  { value: 'margemServicos', label: 'Margem Serviços' },
  { value: 'pass', label: 'Passagens' },
]
const rotuloSlot = (v) => SLOTS_FATURAMENTO.find(s => s.value === v)?.label || v

const FORM_VAZIO = {
  fonte_bi_id: '', nome: '', codigo: '', descricao: '',
  coluna_valor: '', tipo_agregacao: 'SOMA', slot_faturamento: '', ativo: true,
}

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const SEL_SM = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

// Remove acentos além de trim/uppercase — nomes de funcionário costumam divergir só na
// acentuação entre o relatório do SharePoint e o cadastro (ex: "MENDONÇA" vs "MENDONCA").
const normaliza = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const fmtValor = (v, tipoAgregacao) => {
  if (v == null) return '-'
  const numero = v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (tipoAgregacao === 'CONTAGEM' || tipoAgregacao === 'CONTAGEM_DISTINTA') ? v.toLocaleString('pt-BR') : `R$ ${numero}`
}

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

export default function MedidasBi() {
  const [dados, setDados] = useState([])
  const [fontes, setFontes] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [setoresOS, setSetoresOS] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('medidasbi_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('medidasbi_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('medidasbi_form', FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [erroExcluir, setErroExcluir] = useState(null)

  const [detectando, setDetectando] = useState(false)
  const [erroDetectar, setErroDetectar] = useState(null)
  const [colunasDetectadas, setColunasDetectadas] = useState(null)
  const [filtroColunas, setFiltroColunas] = useState('')

  const [regras, setRegras] = useState([])
  const [carregandoRegras, setCarregandoRegras] = useState(false)

  // Painel de conferência com corte por dimensão
  const [confMedidaId, setConfMedidaId] = useSessionState('medidasbi_conf_medida', '')
  const [confEmpresaId, setConfEmpresaId] = useSessionState('medidasbi_conf_empresa', '')
  const [confDataInicio, setConfDataInicio] = useSessionState('medidasbi_conf_ini', '')
  const [confDataFim, setConfDataFim] = useSessionState('medidasbi_conf_fim', '')
  const [cortarFuncionario, setCortarFuncionario] = useState(false)
  const [nivelFuncionario, setNivelFuncionario] = useState('funcionario')
  const [cortarTipoOs, setCortarTipoOs] = useState(false)
  const [cortarNatureza, setCortarNatureza] = useState(false)
  const [cortarMovimento, setCortarMovimento] = useState(false)
  const [calculando, setCalculando] = useState(false)
  const [erroCalcular, setErroCalcular] = useState(null)
  const [resultado, setResultado] = useState(null)

  // Dados de dimensão pra resolver os valores brutos devolvidos pelo backend
  const [funcionarios, setFuncionarios] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [tiposOS, setTiposOS] = useState([])
  const [naturezas, setNaturezas] = useState([])
  const [movimentos, setMovimentos] = useState([])

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('bi/medidas', 'editar')
  const canDelete = hasPermission('bi/medidas', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [
        medidas, fontesData, emps, tipos, funcs, depts, sets, ags, naturezasData, movimentosData,
      ] = await Promise.all([
        apiService.getMedidasBiComFonte(),
        apiService.getFontesBi(),
        apiService.getEmpresas(),
        apiService.getTiposOS().catch(() => []),
        apiService.getFuncionarios().catch(() => []),
        apiService.getDepartamentos().catch(() => []),
        apiService.getSetores().catch(() => []),
        apiService.getAgrupamentoEmpresas().catch(() => []),
        apiService.getNaturezaOperacoes().catch(() => []),
        apiService.getMovimentoVenda().catch(() => []),
      ])
      setDados(medidas)
      setFontes(fontesData)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
      setSetoresOS([...new Set(tipos.map(t => (t.setor_servico || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')))
      setTiposOS(tipos)
      setFuncionarios(funcs)
      setDepartamentos(depts)
      setSetores(sets)
      setAgrupamentos(ags)
      setNaturezas(naturezasData)
      setMovimentos(movimentosData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const fonteSelecionada = useMemo(() => fontes.find(f => f.id === form.fonte_bi_id) || null, [fontes, form.fonte_bi_id])

  const colunasFiltradas = useMemo(() => {
    const colunas = colunasDetectadas?.colunas || []
    const alvo = filtroColunas.trim().toLowerCase()
    if (!alvo) return colunas
    return colunas.filter(c => c.toLowerCase().includes(alvo))
  }, [colunasDetectadas, filtroColunas])

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
    setFiltroColunas('')
    setRegras([])
    setModalAberto(true)
  }

  const abrirEditar = async (item) => {
    setEditingId(item.id)
    setForm({
      fonte_bi_id: item.fonte_bi_id || '',
      nome: item.nome || '',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      coluna_valor: item.coluna_valor || '',
      tipo_agregacao: item.tipo_agregacao || 'SOMA',
      slot_faturamento: item.slot_faturamento || '',
      ativo: item.ativo ?? true,
    })
    setErroModal(null)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setFiltroColunas('')
    setRegras([])
    setModalAberto(true)
    setCarregandoRegras(true)
    try {
      const regrasDb = await apiService.getRegrasMedidaBiComCondicoes(item.id)
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

  const handleDetectarColunas = async () => {
    if (!fonteSelecionada?.pasta_sharepoint || !fonteSelecionada?.prefixo_arquivo) return
    setDetectando(true)
    setErroDetectar(null)
    setColunasDetectadas(null)
    setFiltroColunas('')
    try {
      const info = await apiService.getColunasFonteBi({
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
        fonte_bi_id: form.fonte_bi_id,
        nome: form.nome,
        codigo: gerarCodigo(form.nome),
        descricao: form.descricao || null,
        coluna_valor: form.coluna_valor || null,
        tipo_agregacao: form.tipo_agregacao,
        slot_faturamento: form.slot_faturamento || null,
        ativo: form.ativo,
      }
      let medidaId = editingId
      if (editingId) {
        await apiService.updateMedidaBi(editingId, payload)
      } else {
        const criada = await apiService.createMedidaBi(payload)
        medidaId = criada.id
      }
      await apiService.setRegrasMedidaBi(medidaId, regrasParaPayload())
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = String(err.message || err)
      setErroModal(msg.includes('duplicate key') || msg.includes('unique')
        ? `Já existe uma Medida BI com um nome equivalente a "${form.nome}". Use um nome diferente.`
        : 'Erro ao salvar: ' + msg)
    }
  }

  const handleConfirmarExclusao = async () => {
    setErroExcluir(null)
    try {
      await apiService.deleteMedidaBi(idExcluir)
      await loadData()
      setModalExcluirAberto(false)
    } catch (err) {
      setErroExcluir('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  const medidaConferencia = useMemo(() => dados.find(m => m.id === confMedidaId) || null, [dados, confMedidaId])
  const empresaConferencia = useMemo(() => empresas.find(e => e.id === confEmpresaId) || null, [empresas, confEmpresaId])
  const fonteConferencia = medidaConferencia?.fonte_bi || null

  // Só oferece o corte por uma dimensão quando a Fonte BI da Medida realmente tem a coluna
  // correspondente configurada — não adianta cortar por algo que o arquivo não informa.
  const podeCortarFuncionario = !!fonteConferencia?.coluna_funcionario
  const podeCortarTipoOs = !!fonteConferencia?.coluna_tipo_os
  const podeCortarNatureza = !!fonteConferencia?.coluna_natureza_operacao
  const podeCortarMovimento = !!fonteConferencia?.coluna_movimento

  // ── Resolução dos valores brutos devolvidos pelo backend contra os cadastros de dimensão ──
  // A Fonte BI escolhe se relaciona o Funcionário pelo Nome ou pela Identificação no Relatório
  // (BI) — campo livre no cadastro do Funcionário, pra quando o nome do relatório não bate 100%.
  const campoRelacaoFuncionario = medidaConferencia?.fonte_bi?.campo_relacao_funcionario === 'codigo_sistema_bi' ? 'codigo_sistema_bi' : 'nome_funcionario'
  const funcionarioPorNome = useMemo(() => {
    const map = new Map()
    for (const f of funcionarios) {
      const chave = normaliza(f[campoRelacaoFuncionario])
      if (chave) map.set(chave, f)
    }
    return map
  }, [funcionarios, campoRelacaoFuncionario])
  const departamentoPorId = useMemo(() => new Map(departamentos.map(d => [d.id, d.nome_departamento])), [departamentos])
  const setorPorId = useMemo(() => new Map(setores.map(s => [s.id, s.nome_setor])), [setores])
  const empresaPorId = useMemo(() => new Map(empresas.map(e => [e.id, e])), [empresas])
  const agrupamentoPorId = useMemo(() => new Map(agrupamentos.map(a => [a.id, a.nome_agrupamento])), [agrupamentos])

  const resolverNivelFuncionario = (func, nivel) => {
    if (!func) return null
    if (nivel === 'funcionario') return func.nome_funcionario
    if (nivel === 'departamento') return departamentoPorId.get(func.departamento_ids?.[0]) || null
    if (nivel === 'setor') return setorPorId.get(func.setor_ids?.[0]) || null
    if (nivel === 'box') return func.box_nome || null
    if (nivel === 'grupo') {
      const emp = empresaPorId.get(func.empresa_id)
      return emp?.agrupamento_empresa_id ? (agrupamentoPorId.get(emp.agrupamento_empresa_id) || null) : null
    }
    return null
  }

  const resolverTipoOs = (bruto) => {
    const alvo = normaliza(bruto)
    if (!alvo) return null
    return tiposOS.find(t => normaliza(t.sigla) === alvo || String(t.codigo ?? '').trim() === String(bruto).trim()) || null
  }
  const resolverNatureza = (bruto) => {
    const alvo = String(bruto ?? '').trim()
    if (!alvo) return null
    return naturezas.find(n => String(n.codigo ?? '').trim() === alvo) || null
  }
  const resolverMovimento = (bruto) => {
    const alvo = normaliza(bruto)
    if (!alvo) return null
    return movimentos.find(m => normaliza(m.sigla) === alvo || String(m.codigo ?? '').trim() === String(bruto).trim()) || null
  }
  // Junta os grupos brutos devolvidos pelo backend, resolve cada dimensão contra os cadastros
  // e faz o merge (várias combinações brutas podem cair no mesmo rótulo resolvido — ex: vários
  // Funcionários no mesmo Departamento). Sem correspondência cadastrada, mostra o valor bruto.
  const linhasResolvidas = useMemo(() => {
    if (!resultado?.grupos) return []
    const colunas = []
    if (cortarFuncionario) colunas.push('funcionario')
    if (cortarTipoOs) colunas.push('tipo_os')
    if (cortarNatureza) colunas.push('natureza_operacao')
    if (cortarMovimento) colunas.push('movimento')

    const mapa = new Map()
    for (const g of resultado.grupos) {
      const partes = {}
      if (colunas.includes('funcionario')) {
        const func = funcionarioPorNome.get(normaliza(g.dims.funcionario))
        const label = resolverNivelFuncionario(func, nivelFuncionario)
        partes.funcionario = { label: label || g.dims.funcionario || '(vazio)', classificado: !!label }
      }
      if (colunas.includes('tipo_os')) {
        const t = resolverTipoOs(g.dims.tipo_os)
        partes.tipo_os = { label: t ? (t.sigla ? `${t.sigla} - ${t.tipo_os}` : t.tipo_os) : (g.dims.tipo_os || '(vazio)'), classificado: !!t }
      }
      if (colunas.includes('natureza_operacao')) {
        const n = resolverNatureza(g.dims.natureza_operacao)
        partes.natureza_operacao = { label: n ? n.natureza_operacao : (g.dims.natureza_operacao || '(vazio)'), classificado: !!n }
      }
      if (colunas.includes('movimento')) {
        const m = resolverMovimento(g.dims.movimento)
        partes.movimento = { label: m ? (m.tipo_movimento || m.sigla) : (g.dims.movimento || '(vazio)'), classificado: !!m }
      }
      const chave = colunas.map(c => `${c}:${partes[c].label}`).join('||') || '__total__'
      let linha = mapa.get(chave)
      if (!linha) {
        linha = { partes, soma: 0, linhas: 0, distintos: new Set() }
        mapa.set(chave, linha)
      }
      linha.soma += g.soma
      linha.linhas += g.linhas
      // Une os conjuntos (não soma os tamanhos) — várias combinações brutas caindo no mesmo
      // rótulo resolvido (ex: 2 Funcionários no mesmo Departamento) não podem contar o mesmo
      // valor distinto duas vezes.
      if (g.distintos) for (const v of g.distintos) linha.distintos.add(v)
    }

    const tipoAgregacao = medidaConferencia?.tipo_agregacao || 'SOMA'
    return [...mapa.values()]
      .map(l => ({
        ...l,
        valor: tipoAgregacao === 'CONTAGEM_DISTINTA' ? l.distintos.size
          : tipoAgregacao === 'CONTAGEM' ? l.linhas
          : tipoAgregacao === 'MEDIA' ? (l.linhas > 0 ? l.soma / l.linhas : 0)
          : l.soma,
      }))
      .sort((a, b) => b.valor - a.valor)
  }, [resultado, cortarFuncionario, cortarTipoOs, cortarNatureza, cortarMovimento, nivelFuncionario, funcionarioPorNome, medidaConferencia])

  const colunasAtivas = useMemo(() => {
    const cols = []
    if (cortarFuncionario) cols.push({ key: 'funcionario', label: NIVEIS_FUNCIONARIO.find(n => n.value === nivelFuncionario)?.label || 'Funcionário' })
    if (cortarTipoOs) cols.push({ key: 'tipo_os', label: 'Tipo de OS' })
    if (cortarNatureza) cols.push({ key: 'natureza_operacao', label: 'Natureza de Operação' })
    if (cortarMovimento) cols.push({ key: 'movimento', label: 'Tipo de Movimento' })
    return cols
  }, [cortarFuncionario, cortarTipoOs, cortarNatureza, cortarMovimento, nivelFuncionario])

  const handleCalcular = async () => {
    if (!medidaConferencia) return
    const fonte = medidaConferencia.fonte_bi
    if (!fonte?.pasta_sharepoint || !fonte?.prefixo_arquivo || !medidaConferencia.coluna_valor) {
      setErroCalcular('Esta Medida (ou sua Fonte BI) ainda não tem arquivo/coluna do SharePoint configurados.')
      return
    }
    setCalculando(true)
    setErroCalcular(null)
    setResultado(null)
    try {
      const empresaLabel = empresaConferencia
        ? (empresaConferencia.nome_empresa_sistema || empresaConferencia.empresa_fantasia || empresaConferencia.nome_empresa)
        : null
      const regrasDaMedida = await apiService.getRegrasParaCalculoMedidaBi(medidaConferencia.id)
      const colunasDimensao = {}
      if (cortarFuncionario && fonte.coluna_funcionario) colunasDimensao.funcionario = fonte.coluna_funcionario
      if (cortarTipoOs && fonte.coluna_tipo_os) colunasDimensao.tipo_os = fonte.coluna_tipo_os
      if (cortarNatureza && fonte.coluna_natureza_operacao) colunasDimensao.natureza_operacao = fonte.coluna_natureza_operacao
      if (cortarMovimento && fonte.coluna_movimento) colunasDimensao.movimento = fonte.coluna_movimento

      const res = await apiService.agregarMedidaBi({
        pasta: fonte.pasta_sharepoint,
        prefixo: fonte.prefixo_arquivo,
        usaSubpastaAno: fonte.usa_subpasta_ano,
        linhaCabecalho: fonte.linha_cabecalho,
        colunaEmpresa: fonte.coluna_empresa,
        colunaData: fonte.coluna_data,
        colunaValor: medidaConferencia.coluna_valor,
        tipoAgregacao: medidaConferencia.tipo_agregacao,
        colunasDimensao,
        empresaNome: empresaLabel,
        dataInicio: confDataInicio,
        dataFim: confDataFim,
        regras: regrasDaMedida,
      })
      setResultado(res)
    } catch (err) {
      setErroCalcular(err.message || String(err))
    } finally {
      setCalculando(false)
    }
  }

  // Contagem Distinta não pode ser somada linha a linha (um mesmo valor pode cair em mais de
  // uma linha resolvida) — o total real é o tamanho da união de todos os grupos brutos.
  const valorTotal = useMemo(() => {
    const tipo = medidaConferencia?.tipo_agregacao
    if (tipo === 'MEDIA') return 0
    if (tipo === 'CONTAGEM_DISTINTA') {
      const todos = new Set()
      for (const g of (resultado?.grupos || [])) for (const v of (g.distintos || [])) todos.add(v)
      return todos.size
    }
    return linhasResolvidas.reduce((s, l) => s + l.valor, 0)
  }, [linhasResolvidas, medidaConferencia, resultado])

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">BI — Medidas</h1>
          <p className="text-xs text-slate-500">Defina medidas (coluna + agregação + regras) e veja o resultado cortado por Funcionário/Departamento/Setor/Box/Grupo, Tipo de OS, Natureza de Operação e Tipo de Movimento — sem criar uma métrica por combinação.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Medida
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[820px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Nome</th>
              <th className="p-3">Fonte BI</th>
              <th className="p-3 w-40">Coluna Valor</th>
              <th className="p-3 w-28 text-center">Tipo de Cálculo</th>
              <th className="p-3">Slot no BI</th>
              <th className="p-3 w-20 text-center">Ativo</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-slate-400">Nenhuma Medida BI cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <Ruler className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {item.nome}
                  </div>
                </td>
                <td className="p-3 text-slate-700">{item.fonte_bi?.nome || '-'}</td>
                <td className="p-3 text-slate-600 font-mono text-[11px]">{item.coluna_valor || '-'}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">{item.tipo_agregacao}</span>
                </td>
                <td className="p-3 text-slate-600">
                  {item.slot_faturamento
                    ? <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">{rotuloSlot(item.slot_faturamento)}</span>
                    : <span className="text-slate-400">-</span>}
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <PermissionActionButtons
                      menuPath="bi/medidas"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAINEL DE CONFERÊNCIA / PIVOT POR DIMENSÃO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
          <PlayCircle className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">Conferência com Corte por Dimensão</h2>
          <span className="text-[11px] text-slate-400">Calcule a Medida e veja o valor por Funcionário/Departamento/Setor/Box/Grupo, Tipo de OS, Natureza e Movimento.</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Medida</label>
              <select className={SEL} value={confMedidaId} onChange={e => {
                setConfMedidaId(e.target.value)
                setResultado(null); setErroCalcular(null)
                setCortarFuncionario(false); setCortarTipoOs(false); setCortarNatureza(false); setCortarMovimento(false)
              }}>
                <option value="">Selecione...</option>
                {dados.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Empresa</label>
              <select className={SEL} value={confEmpresaId} onChange={e => setConfEmpresaId(e.target.value)}>
                <option value="">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
              </select>
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

          {medidaConferencia && (
            <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3">
              <span className={LBL}>Cortar por:</span>
              <label className={`flex items-center gap-1.5 text-xs font-semibold ${podeCortarFuncionario ? 'text-slate-700 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}>
                <input type="checkbox" disabled={!podeCortarFuncionario} checked={cortarFuncionario} onChange={e => setCortarFuncionario(e.target.checked)} className="w-3.5 h-3.5" />
                Funcionário
              </label>
              {cortarFuncionario && (
                <select className={SEL_SM} value={nivelFuncionario} onChange={e => setNivelFuncionario(e.target.value)}>
                  {NIVEIS_FUNCIONARIO.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              )}
              <label className={`flex items-center gap-1.5 text-xs font-semibold ${podeCortarTipoOs ? 'text-slate-700 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}>
                <input type="checkbox" disabled={!podeCortarTipoOs} checked={cortarTipoOs} onChange={e => setCortarTipoOs(e.target.checked)} className="w-3.5 h-3.5" />
                Tipo de OS
              </label>
              <label className={`flex items-center gap-1.5 text-xs font-semibold ${podeCortarNatureza ? 'text-slate-700 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}>
                <input type="checkbox" disabled={!podeCortarNatureza} checked={cortarNatureza} onChange={e => setCortarNatureza(e.target.checked)} className="w-3.5 h-3.5" />
                Natureza de Operação
              </label>
              <label className={`flex items-center gap-1.5 text-xs font-semibold ${podeCortarMovimento ? 'text-slate-700 cursor-pointer' : 'text-slate-300 cursor-not-allowed'}`}>
                <input type="checkbox" disabled={!podeCortarMovimento} checked={cortarMovimento} onChange={e => setCortarMovimento(e.target.checked)} className="w-3.5 h-3.5" />
                Tipo de Movimento
              </label>
              {!podeCortarFuncionario && !podeCortarTipoOs && !podeCortarNatureza && !podeCortarMovimento && (
                <span className="text-[11px] text-amber-500">A Fonte BI desta Medida não tem nenhuma coluna de dimensão configurada — sem corte, mostra só o total.</span>
              )}
            </div>
          )}

          <button
            onClick={handleCalcular}
            disabled={!confMedidaId || calculando}
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
            <div className="space-y-3 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linhas Filtradas</span>
                  <span className="text-sm font-mono font-semibold text-slate-700">{resultado.total_linhas_filtradas?.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linhas no Arquivo</span>
                  <span className="text-sm font-mono font-semibold text-slate-700">{resultado.total_linhas_fonte?.toLocaleString('pt-BR')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grupos</span>
                  <span className="text-sm font-mono font-semibold text-slate-700">{linhasResolvidas.length}</span>
                </div>
              </div>

              {linhasResolvidas.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma linha encontrada para os filtros selecionados.</p>
              ) : (
                <div className="rounded-md border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[560px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                        {colunasAtivas.length === 0 && <th className="p-2">Total</th>}
                        {colunasAtivas.map(c => <th key={c.key} className="p-2">{c.label}</th>)}
                        <th className="p-2 text-right">Linhas</th>
                        <th className="p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                      {linhasResolvidas.map((l, i) => (
                        <tr key={i} className="hover:bg-slate-50/70">
                          {colunasAtivas.length === 0 && <td className="p-2 font-semibold text-slate-800">Total geral</td>}
                          {colunasAtivas.map(c => (
                            <td key={c.key} className="p-2">
                              <span className={l.partes[c.key].classificado ? 'text-slate-800 font-medium' : 'text-amber-600'}>
                                {l.partes[c.key].label}
                              </span>
                              {!l.partes[c.key].classificado && (
                                <span className="ml-1 text-[9px] text-amber-500 uppercase font-bold">não classificado</span>
                              )}
                            </td>
                          ))}
                          <td className="p-2 text-right font-mono text-slate-500">{l.linhas.toLocaleString('pt-BR')}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">{fmtValor(l.valor, medidaConferencia?.tipo_agregacao)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {medidaConferencia?.tipo_agregacao !== 'MEDIA' && linhasResolvidas.length > 1 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-900">
                          <td className="p-2" colSpan={Math.max(colunasAtivas.length, 1)}>Total</td>
                          <td className="p-2 text-right font-mono">{linhasResolvidas.reduce((s, l) => s + l.linhas, 0).toLocaleString('pt-BR')}</td>
                          <td className="p-2 text-right font-mono">{fmtValor(valorTotal, medidaConferencia?.tipo_agregacao)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
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
                <Ruler className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Medida BI' : 'Incluir Medida BI'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto custom-scrollbar">

                {/* Fonte */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Fonte BI *</label>
                  <select required name="fonte_bi_id" value={form.fonte_bi_id} onChange={handleInputChange} className={SEL}>
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
                  <input type="text" name="nome" required value={form.nome} onChange={handleInputChange} placeholder="Ex: Real Peças Balcão" className={INP} />
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição</label>
                  <input type="text" name="descricao" value={form.descricao} onChange={handleInputChange} placeholder="Observações sobre esta medida" className={INP} />
                </div>

                {/* Coluna Valor + Agregação */}
                <div className="grid grid-cols-2 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna do Valor</label>
                    <input type="text" name="coluna_valor" value={form.coluna_valor} onChange={handleInputChange} placeholder="Ex: NFItem_VlTotal" className={`${INP} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tipo de Cálculo *</label>
                    <select required name="tipo_agregacao" value={form.tipo_agregacao} onChange={handleInputChange} className={SEL}>
                      {TIPOS_AGREGACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Slot no BI — alimenta direto a tabela de BI — Possibilidades */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Slot no BI</label>
                  <select name="slot_faturamento" value={form.slot_faturamento} onChange={handleInputChange} className={SEL}>
                    {SLOTS_FATURAMENTO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
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
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filtroColunas}
                        onChange={e => setFiltroColunas(e.target.value)}
                        placeholder={`Buscar entre ${colunasDetectadas.colunas.length} colunas...`}
                        className={`${INP} pl-7`}
                      />
                    </div>
                    {colunasFiltradas.length === 0 ? (
                      <p className="text-[11px] text-slate-400 text-center py-2">Nenhuma coluna encontrada para "{filtroColunas}".</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {colunasFiltradas.map(col => (
                          <button key={col} type="button" onClick={() => setForm(prev => ({ ...prev, coluna_valor: col }))}
                            className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-[10px] font-mono text-slate-700 hover:text-blue-700 transition-colors">
                            {col}
                          </button>
                        ))}
                      </div>
                    )}
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
                Visualizar Medida BI
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fonte BI</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.fonte_bi?.nome || '-'}</span>
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
                  Confirma a remoção da medida <strong className="text-slate-800">"{itemVisualizado.nome}"</strong>? Esta ação não pode ser desfeita.
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
