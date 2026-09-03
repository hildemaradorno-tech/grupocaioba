import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Edit2, Trash2, X, AlertTriangle, Users, Eye, BadgePercent, Search, Info, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown, FileDown, FileSpreadsheet, RefreshCw, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import { useSessionState } from '../hooks/useSessionState'
import ImportarFuncionariosModal from './ImportarFuncionariosModal'

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP_RO = 'w-full text-xs p-2 border border-indigo-100 rounded-md font-medium text-slate-600 bg-indigo-50/40 cursor-default select-none'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
const LBL_RO = 'text-[11px] font-bold text-indigo-400 uppercase tracking-wide'

// Dropdown compacto (fechado por padrão) com checkbox por opção — pros filtros de coluna que
// aceitam selecionar vários valores de uma vez, sem precisar da caixa de lista aberta do <select multiple>.
function FiltroMultiSelect({ placeholder, opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-filtro-multiselect-panel]')) setAberto(false)
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  // A tabela usa overflow-x-auto, que corta qualquer dropdown posicionado com "absolute" dentro
  // dela (o eixo Y vira scroll implicitamente). Renderiza o painel via portal em document.body,
  // "fixed" na posição real do botão, pra ele aparecer por cima da tabela sem ser cortado.
  const abrir = () => {
    if (!aberto && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, minWidth: r.width })
    }
    setAberto(v => !v)
  }

  useEffect(() => {
    if (!aberto) return
    // capture:true pega o scroll de QUALQUER elemento (inclusive o scroll interno da própria
    // lista de opções) — só fecha se o scroll não for dentro do painel, senão rolar a lista de
    // opções fecharia o dropdown imediatamente.
    const fechar = (e) => {
      if (e.target?.closest?.('[data-filtro-multiselect-panel]')) return
      setAberto(false)
    }
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const toggleOpcao = (valor) => {
    onChange(selecionados.includes(valor) ? selecionados.filter(v => v !== valor) : [...selecionados, valor])
  }

  const textoBotao = selecionados.length === 0 ? placeholder
    : selecionados.length === 1 ? selecionados[0]
    : `${selecionados.length} selecionados`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrir}
        className="w-full flex items-center justify-between gap-1 px-2 py-1 text-[11px] border border-slate-200 rounded bg-slate-50 hover:bg-white focus:outline-none focus:border-blue-400 transition-colors"
      >
        <span className={`truncate ${selecionados.length === 0 ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>{textoBotao}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selecionados.length > 0 && (
            <X
              className="h-3 w-3 text-slate-400 hover:text-red-600"
              onClick={(e) => { e.stopPropagation(); onChange([]) }}
            />
          )}
          <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
        </span>
      </button>
      {aberto && pos && createPortal(
        <div
          data-filtro-multiselect-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.minWidth }}
          className="z-50 w-max max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg py-1 custom-scrollbar"
        >
          {opcoes.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-slate-400">Nenhuma opção.</p>
          ) : opcoes.map(op => (
            <label key={op} className="flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-slate-50 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selecionados.includes(op)}
                onChange={() => toggleOpcao(op)}
                className="w-3 h-3 rounded accent-blue-600 shrink-0"
              />
              <span className="whitespace-nowrap">{op}</span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

const SITUACOES_FUNCIONARIO = [
  { value: '1', label: '1 - Trabalhando' },
  { value: '2', label: '2 - Afastado Direitos Integrais' },
  { value: '3', label: '3 - Acid. Trabalho periodo superior a 15 dias' },
  { value: '4', label: '4 - Servico Militar' },
  { value: '5', label: '5 - Licenca maternidade' },
  { value: '6', label: '6 - Doenca periodo superior a 15 dias' },
  { value: '7', label: '7 - Licenca sem Vencimento' },
  { value: '8', label: '8 - Demitido' },
  { value: '9', label: '9 - Ferias' },
  { value: '10', label: '10 - Novo afast. mesmo acid. trabalho' },
  { value: '11', label: '11 - Prorrogacao licenca maternidade' },
  { value: '12', label: '12 - Novo afast. mesma doenca' },
  { value: '13', label: '13 - Exercicio de mandato sindical' },
  { value: '14', label: '14 - Aposent. por invalid. acidente de trabalho' },
  { value: '15', label: '15 - Aposent. por invalid. doenca profissional' },
  { value: '16', label: '16 - Aposent. por invalid. exceto acid. trab. e doenca profissional' },
  { value: '17', label: '17 - Acid. Trabalho periodo igual ou inferior a 15 dias' },
  { value: '18', label: '18 - Doenca periodo igual ou inferior a 15 dias' },
  { value: '19', label: '19 - Aborto nao criminoso' },
  { value: '20', label: '20 - Licenca maternidade adocao 1 ano' },
  { value: '21', label: '21 - Licenca maternidade adocao 1 a 4 anos' },
  { value: '22', label: '22 - Licenca maternidade adocao 4 a 8 anos' },
  { value: '24', label: '24 - Outros motivos de afastamento' },
]
const SITUACAO_DEMITIDO = '8'

// Rótulo curto (com acento) pro badge principal de "Situação (Ativo)" — em vez do genérico
// "Afastado", mostra o motivo direto (Férias, Doença, etc.).
const SITUACAO_BADGE_LABEL = {
  '2': 'Direitos Integrais',
  '3': 'Acidente Trabalho',
  '4': 'Serviço Militar',
  '5': 'Licença Maternidade',
  '6': 'Doença',
  '7': 'Licença s/ Vencimento',
  '9': 'Férias',
  '10': 'Acidente Trabalho',
  '11': 'Licença Maternidade',
  '12': 'Doença',
  '13': 'Mandato Sindical',
  '14': 'Aposentado p/ Invalidez',
  '15': 'Aposentado p/ Invalidez',
  '16': 'Aposentado p/ Invalidez',
  '17': 'Acidente Trabalho',
  '18': 'Doença',
  '19': 'Licença Médica',
  '20': 'Licença Maternidade',
  '21': 'Licença Maternidade',
  '22': 'Licença Maternidade',
  '24': 'Afastado',
}

const FORM_VAZIO = {
  nome_funcionario: '',
  codigo_funcionario: '',
  codigo_sistema_bi: '',
  empresa_id: '',
  empresa_nome: '',
  cargo_id: '',
  cargo_nome: '',
  departamento_ids: [],
  setor_ids: [],
  box_id: '',
  box_nome: '',
  data_admissao: '',
  data_demissao: '',
  situacao_funcionario: '',
  recebe_comissao_ferias: false,
  politica_id: '',
  descricao_comissao: '',
  base_tipo: '',
  tipo_evento: '',
  nivel_calculo: '',
  comissao_servicos: '',
  comissao_pecas: '',
  comissao_total: '',
  comissao_valor: '',
}

const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}
const fmtCnpj = (v) => {
  if (!v) return null
  const s = String(v).replace(/\D/g, '')
  if (s.length === 14) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
  return v
}
const fmtPct = (v) => (v != null && v !== '') ? `${parseFloat(v).toFixed(2)}%` : '-'
const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

// Mostra só os campos que a Política realmente tem preenchidos — sem adivinhar pelo Nome da
// Base (que pode não bater com o campo de fato usado). R$ Valor (fixo) tem prioridade e aparece
// sozinho, porque no motor de cálculo ele substitui os percentuais em vez de somar com eles;
// senão, mostra cada percentual preenchido (uma política pode ter % Serviços E % Peças juntos).
const percentuaisDaPolitica = (politica) => {
  if (politica.comissao_valor != null) return [{ label: 'R$ Valor', valor: politica.comissao_valor, moeda: true }]
  const partes = []
  if (politica.comissao_servicos != null) partes.push({ label: '% Serviços', valor: politica.comissao_servicos })
  if (politica.comissao_pecas != null) partes.push({ label: '% Peças', valor: politica.comissao_pecas })
  if (politica.comissao_total != null) partes.push({ label: '% Total', valor: politica.comissao_total })
  return partes
}

// Agrupa políticas do mesmo cargo por Descrição — quando o cargo tem, por exemplo, uma política
// de Peças e outra de Serviços com a MESMA descrição, elas viram um card só (Descrição mostrada
// uma vez), com cada Fonte/Base/Nível/percentual empilhado — em vez de repetir o card inteiro.
function agruparPoliticasPorDescricao(politicasList) {
  const grupos = new Map()
  for (const p of politicasList) {
    const chave = p.descricao_comissao || p.id
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(p)
  }
  return [...grupos.entries()].map(([descricao, itens]) => ({ descricao, itens }))
}

// Mesma lógica de match funcionário -> política usada em CalculoComissoes.jsx: cargo +
// agrupamento de empresa, com fallback só pro cargo. Retorna TODAS as políticas que baterem —
// um cargo pode ter mais de uma (ex: uma pra Peças, outra pra Serviços).
function resolvePoliticasCargo(cargoId, agrupamentoId, politicas) {
  if (!cargoId) return []
  const porAgrupamento = agrupamentoId
    ? politicas.filter(p => p.cargo_id === cargoId && p.agrupamento_empresa_id === agrupamentoId && p.ativo !== false)
    : []
  if (porAgrupamento.length > 0) return porAgrupamento
  return politicas.filter(p => p.cargo_id === cargoId && p.ativo !== false)
}

export default function Funcionarios() {
  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cargos, setCargos] = useState([])
  const [boxes, setBoxes] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [politicasTodas, setPoliticasTodas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [gerandoExcel, setGerandoExcel] = useState(false)
  const [menuSalvarAberto, setMenuSalvarAberto] = useState(false)
  const menuSalvarRef = useRef(null)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  // colFiltros persiste no localStorage — quem já usava a tela antes do filtro de CNPJ
  // existir tem um objeto salvo sem essa chave, então nunca confia direto em
  // colFiltros.cnpj (undefined quebraria .length/.includes); sempre usa cnpjFiltro.
  const [colFiltros, setColFiltros] = useSessionState('func_colfiltros', { nome: '', empresa: [], cnpj: [], cargo: [], departamento: [], setor: [], box: [], ativo: [] })
  const cnpjFiltro = colFiltros.cnpj || []
  const departamentoFiltro = colFiltros.departamento || []
  const setorFiltro = colFiltros.setor || []
  const boxFiltro = colFiltros.box || []

  const [modalAberto, setModalAberto] = useSessionState('func_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('func_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('func_form', FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [buscandoPolitica, setBuscandoPolitica] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('funcionarios', 'editar')
  const canDelete = hasPermission('funcionarios', 'excluir')

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!menuSalvarAberto) return
    const fechar = (e) => { if (menuSalvarRef.current && !menuSalvarRef.current.contains(e.target)) setMenuSalvarAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [menuSalvarAberto])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [funcs, emps, carg, box, depts, sets, politicas] = await Promise.all([
        apiService.getFuncionarios(),
        apiService.getEmpresas(),
        apiService.getCargos(),
        apiService.getBox(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getPoliticaComissao(),
      ])

      const empsMap = Object.fromEntries(emps.map(e => [e.id, e]))
      const cargosMap = Object.fromEntries(carg.map(c => [c.id, c]))

      // Enriquece cargo_nome e política sempre com dados frescos das tabelas de referência.
      // Fonte/Base de Cálculo vêm da política já resolvidas por ID (fonte_calculo/base_calculo
      // embutidos) — não por um código texto, que quebrava ao renomear a Fonte/Base.
      const funcsEnriquecidos = funcs.map(f => {
        const cargoAtual = f.cargo_id ? cargosMap[f.cargo_id] : null
        const base = cargoAtual ? { ...f, cargo_nome: cargoAtual.nome_cargo, cargo_codigo: cargoAtual.codigo_cargo || null } : f

        if (!f.cargo_id) return base
        const agrupId = empsMap[f.empresa_id]?.agrupamento_empresa_id || null
        const politica =
          (agrupId && politicas.find(p => p.cargo_id === f.cargo_id && p.agrupamento_empresa_id === agrupId && p.ativo !== false)) ||
          politicas.find(p => p.cargo_id === f.cargo_id && p.ativo !== false) ||
          null
        if (!politica) return base
        return {
          ...base,
          politica_id: politica.id,
          descricao_comissao: politica.descricao_comissao,
          base_tipo: politica.base_calculo?.nome || null,
          tipo_evento: politica.fonte_calculo?.nome || null,
          nivel_calculo: politica.nivel_calculo,
          comissao_servicos: politica.comissao_servicos,
          comissao_pecas: politica.comissao_pecas,
          comissao_total: politica.comissao_total,
          comissao_valor: politica.comissao_valor,
        }
      })

      setDados(funcsEnriquecidos)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || '', 'pt-BR')))
      setCargos([...carg].sort((a, b) => (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR')))
      setBoxes(box.filter(b => b.ativo !== false))
      setDepartamentos(depts)
      setSetores(sets)
      setPoliticasTodas(politicas)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const buscarPolitica = async (cargoId, agrupamentoId) => {
    if (!cargoId) return
    setBuscandoPolitica(true)
    try {
      const politica = await apiService.getPoliticaByCargoEmpresa(cargoId, agrupamentoId)
      setForm(prev => ({
        ...prev,
        politica_id: politica?.id || '',
        descricao_comissao: politica?.descricao_comissao || '',
        base_tipo: politica?.base_calculo?.nome || '',
        tipo_evento: politica?.fonte_calculo?.nome || '',
        nivel_calculo: politica?.nivel_calculo || '',
        comissao_servicos: politica?.comissao_servicos ?? '',
        comissao_pecas: politica?.comissao_pecas ?? '',
        comissao_total: politica?.comissao_total ?? '',
        comissao_valor: politica?.comissao_valor ?? '',
      }))
    } catch (err) {
      console.error('Erro ao buscar política:', err)
    } finally {
      setBuscandoPolitica(false)
    }
  }

  const clearPolitica = () => ({
    politica_id: '', descricao_comissao: '', base_tipo: '', tipo_evento: '',
    nivel_calculo: '', comissao_servicos: '', comissao_pecas: '', comissao_total: '', comissao_valor: '',
  })

  const getAgrupamentoId = (empId) => {
    const emp = empresas.find(x => x.id === empId)
    return emp?.agrupamento_empresa_id || null
  }

  const handleEmpresaChange = (e) => {
    const empId = e.target.value
    const emp = empresas.find(x => x.id === empId)
    const agrupId = emp?.agrupamento_empresa_id || null
    const currentCargo = cargos.find(c => c.id === form.cargo_id)
    const cargoCompativel = currentCargo && (!currentCargo.empresa_id || currentCargo.empresa_id === empId)
    const novoCargoId = cargoCompativel ? form.cargo_id : ''
    setForm(prev => ({
      ...prev,
      empresa_id: empId,
      empresa_nome: emp?.empresa_fantasia || emp?.nome_empresa || '',
      ...(cargoCompativel ? {} : { cargo_id: '', cargo_nome: '', departamento_ids: [], setor_ids: [] }),
      ...clearPolitica(),
    }))
    if (empId && novoCargoId) buscarPolitica(novoCargoId, agrupId)
  }

  const handleCargoChange = (e) => {
    const cargoId = e.target.value
    const cargo = cargos.find(c => c.id === cargoId)
    const currentEmpresaId = form.empresa_id
    const cargoSetorIds = cargo?.setor_ids || []
    const cargoDeptoIds = cargo?.departamento_ids || []
    // Deriva box a partir dos setores do cargo
    const boxDoCargo = cargoSetorIds.length > 0
      ? boxes.find(b => Array.isArray(b.setor_ids) && b.setor_ids.some(sid => cargoSetorIds.includes(sid)))
      : null
    setForm(prev => ({
      ...prev,
      cargo_id: cargoId,
      cargo_nome: cargo?.nome_cargo || '',
      departamento_ids: cargoDeptoIds,
      setor_ids: cargoSetorIds,
      box_id: boxDoCargo?.id || '',
      box_nome: boxDoCargo?.nome_box || '',
      ...clearPolitica(),
    }))
    if (cargoId && currentEmpresaId) buscarPolitica(cargoId, getAgrupamentoId(currentEmpresaId))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const getNomes = (ids, lista, campo) => {
    if (!Array.isArray(ids) || ids.length === 0) return '-'
    return ids.map(id => lista.find(i => i.id === id)?.[campo]).filter(Boolean).join(', ') || '-'
  }

  // Situação (Ativo) tem 3 estados: Sim (1-Trabalhando), Não (8-Demitido ou com data de
  // demissão), e Afastado pra qualquer outro código (férias, doença, licença etc — ainda é
  // funcionário, só não está trabalhando no momento).
  // Rótulo oficial completo (com o número do código) — mostrado como detalhe, pra referência,
  // ao lado do motivo já traduzido/acentuado que vai no badge principal.
  const situacaoTexto = (codigo) => SITUACOES_FUNCIONARIO.find(s => s.value === codigo)?.label || null

  const statusInfo = (item) => {
    if (item.situacao_funcionario === SITUACAO_DEMITIDO || item.data_demissao) {
      return { label: 'Não', cls: 'bg-red-50 text-red-700 border-red-200', detalhe: 'Demitido' }
    }
    if (!item.situacao_funcionario || item.situacao_funcionario === '1') {
      return { label: 'Sim', cls: 'bg-green-50 text-green-700 border-green-200', detalhe: 'Em atividade' }
    }
    const motivo = SITUACAO_BADGE_LABEL[item.situacao_funcionario] || 'Afastado'
    return { label: motivo, cls: 'bg-amber-50 text-amber-700 border-amber-200', detalhe: situacaoTexto(item.situacao_funcionario) }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO })
    setErroModal(null)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    const cargo = cargos.find(c => c.id === item.cargo_id)
    const cargoSetorIds = cargo?.setor_ids || item.setor_ids || []
    const cargoDeptoIds = cargo?.departamento_ids || item.departamento_ids || []
    const boxDoCargo = item.box_id
      ? boxes.find(b => b.id === item.box_id)
      : null
    setForm({
      nome_funcionario: item.nome_funcionario || '',
      codigo_funcionario: item.codigo_funcionario || '',
      codigo_sistema_bi: item.codigo_sistema_bi || '',
      empresa_id: item.empresa_id || '',
      empresa_nome: item.empresa_nome || '',
      cargo_id: item.cargo_id || '',
      cargo_nome: item.cargo_nome || '',
      departamento_ids: cargoDeptoIds,
      setor_ids: cargoSetorIds,
      box_id: boxDoCargo?.id || '',
      box_nome: boxDoCargo?.nome_box || '',
      data_admissao: item.data_admissao || '',
      data_demissao: item.data_demissao || '',
      situacao_funcionario: item.situacao_funcionario || '',
      recebe_comissao_ferias: item.recebe_comissao_ferias ?? false,
      politica_id: item.politica_id || '',
      descricao_comissao: item.descricao_comissao || '',
      base_tipo: item.base_tipo || '',
      tipo_evento: item.tipo_evento || '',
      nivel_calculo: item.nivel_calculo || '',
      comissao_servicos: item.comissao_servicos ?? '',
      comissao_pecas: item.comissao_pecas ?? '',
      comissao_total: item.comissao_total ?? '',
      comissao_valor: item.comissao_valor ?? '',
    })
    setErroModal(null)
    setModalAberto(true)
  }

  // Departamento/Setor do funcionário são herdados do Cargo, mas só ficam gravados de novo no
  // registro do funcionário quando alguém abre e salva a tela dele — se o cargo mudar de
  // departamento/setor depois, quem já tinha esse cargo fica com o dado antigo até ser resalvo.
  // Este botão varre todo mundo e resalva só quem estiver desatualizado, sem precisar abrir um
  // por um.
  const arraysIguaisIgnorandoOrdem = (a, b) => {
    const sa = [...(a || [])].sort()
    const sb = [...(b || [])].sort()
    return sa.length === sb.length && sa.every((v, i) => v === sb[i])
  }

  const handleSincronizarDepartamentos = async () => {
    setSincronizando(true)
    try {
      let atualizados = 0
      for (const item of dados) {
        const cargo = cargos.find(c => c.id === item.cargo_id)
        if (!cargo) continue
        const deptoIdsCargo = cargo.departamento_ids || []
        const setorIdsCargo = cargo.setor_ids || []
        if (arraysIguaisIgnorandoOrdem(deptoIdsCargo, item.departamento_ids) && arraysIguaisIgnorandoOrdem(setorIdsCargo, item.setor_ids)) continue
        await apiService.updateFuncionario(item.id, { departamento_ids: deptoIdsCargo, setor_ids: setorIdsCargo })
        atualizados++
      }
      await loadData()
      alert(atualizados > 0
        ? `${atualizados} funcionário(s) atualizado(s) com o departamento/setor mais recente do cargo.`
        : 'Todos os funcionários já estavam com o departamento/setor em dia.')
    } catch (err) {
      alert('Erro ao sincronizar: ' + (err.message || String(err)))
    } finally {
      setSincronizando(false)
    }
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setItemVisualizado(item)
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => {
    setItemVisualizado(item)
    setModalVisualizarAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)

    // Situação "Demitido" exige Data de Demissão preenchida
    if (form.situacao_funcionario === SITUACAO_DEMITIDO && !form.data_demissao) {
      setErroModal('Situação "Demitido" selecionada — informe a Data de Demissão.')
      return
    }

    // Impede duplicata de funcionário ativo (sem data de demissão)
    if (!editingId) {
      const nomeLower = (form.nome_funcionario || '').trim().toLowerCase()
      const ativo = dados.find(f =>
        (f.nome_funcionario || '').trim().toLowerCase() === nomeLower && !f.data_demissao
      )
      if (ativo) {
        setErroModal(
          `"${ativo.nome_funcionario}" já está ativo (${ativo.cargo_nome || 'sem cargo'} — ${ativo.empresa_nome || 'sem empresa'}). ` +
          `Para adicionar um novo vínculo, primeiro registre a data de demissão do registro atual.`
        )
        return
      }
    }

    try {
      const payload = {
        nome_funcionario: form.nome_funcionario,
        codigo_funcionario: form.codigo_funcionario || null,
        codigo_sistema_bi: form.codigo_sistema_bi || null,
        empresa_id: form.empresa_id || null,
        empresa_nome: form.empresa_nome || null,
        cargo_id: form.cargo_id || null,
        cargo_nome: form.cargo_nome || null,
        departamento_ids: form.departamento_ids,
        setor_ids: form.setor_ids,
        box_id: form.box_id || null,
        box_nome: form.box_nome || null,
        data_admissao: form.data_admissao || null,
        data_demissao: form.data_demissao || null,
        situacao_funcionario: form.situacao_funcionario || null,
        recebe_comissao_ferias: form.recebe_comissao_ferias ?? false,
        politica_id: form.politica_id || null,
        descricao_comissao: form.descricao_comissao || null,
        base_tipo: form.base_tipo || null,
        tipo_evento: form.tipo_evento || null,
        nivel_calculo: form.nivel_calculo || null,
        comissao_servicos: form.comissao_servicos !== '' ? parseFloat(form.comissao_servicos) : null,
        comissao_pecas: form.comissao_pecas !== '' ? parseFloat(form.comissao_pecas) : null,
        comissao_total: form.comissao_total !== '' ? parseFloat(form.comissao_total) : null,
        comissao_valor: form.comissao_valor !== '' ? parseFloat(form.comissao_valor) : null,
        ativo: !form.data_demissao,
      }
      if (editingId) {
        await apiService.updateFuncionario(editingId, payload)
      } else {
        await apiService.createFuncionario(payload)
      }
      await loadData()
      setForm(FORM_VAZIO)
      setEditingId(null)
      setModalAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteFuncionario(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir funcionário: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const handleSalvarPDF = async (listaAtual) => {
    if (!listaAtual.length) return
    setGerandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 28

      const empresasMap = Object.fromEntries(empresas.map(e => [e.id, e]))

      // 4 colunas (Empresa e CNPJ aparecem no cabeçalho de cada grupo)
      const COLS = [
        { header: 'Cód. Func.',      w: 70  },
        { header: 'Nome Funcionário', w: 300 },
        { header: 'Cód. Cargo',      w: 70  },
        { header: 'Nome do Cargo',   w: 346 },
      ]

      const ROW_H = 16
      const HEADER_H = 20
      let y = 0

      const fmtCnpj = (v) => {
        if (!v) return '-'
        const s = String(v).replace(/\D/g, '')
        if (s.length === 14) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`
        return v
      }

      const truncar = (texto, largura) => {
        const t = texto || '-'
        let r = t
        while (r.length > 1 && pdf.getTextWidth(r) > largura - 6) r = r.slice(0, -1)
        return r.length < t.length ? `${r.slice(0, -1)}…` : r
      }

      const desenharCabecalho = () => {
        // Título
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(12)
        pdf.setTextColor(30, 41, 59)
        pdf.text('Lista de Funcionários', M, M + 8)
        pdf.setFont(undefined, 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(130, 130, 130)
        pdf.text(
          `Gerado em ${new Date().toLocaleString('pt-BR')} · ${listaAtual.length} funcionário${listaAtual.length !== 1 ? 's' : ''}`,
          M, M + 18,
        )

        // Cabeçalho da tabela
        const ty = M + 30
        pdf.setFillColor(241, 245, 249)
        pdf.rect(M, ty, PW - 2 * M, HEADER_H, 'F')
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(7.5)
        pdf.setTextColor(71, 85, 105)
        let cx = M
        COLS.forEach(col => {
          pdf.text(col.header, cx + 4, ty + 13)
          cx += col.w
        })

        pdf.setDrawColor(203, 213, 225)
        pdf.line(M, ty + HEADER_H, PW - M, ty + HEADER_H)

        y = ty + HEADER_H
      }

      desenharCabecalho()

      // Agrupa por empresa (chave = nome fantasia ou nome), ordena empresas e funcionários por nome
      const grupos = new Map()
      listaAtual.forEach(f => {
        const emp = empresasMap[f.empresa_id]
        const nomeEmp = emp?.empresa_fantasia || emp?.nome_empresa || f.empresa_nome || '(sem empresa)'
        if (!grupos.has(nomeEmp)) grupos.set(nomeEmp, { emp, funcs: [] })
        grupos.get(nomeEmp).funcs.push(f)
      })
      const gruposOrdenados = [...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .map(([nome, { emp, funcs }]) => ({
          nome,
          emp,
          funcs: [...funcs].sort((a, b) => (a.nome_funcionario || '').localeCompare(b.nome_funcionario || '', 'pt-BR')),
        }))

      const GROUP_H = 18

      gruposOrdenados.forEach(({ nome, emp, funcs }) => {
        // Cabeçalho do grupo (empresa)
        if (y + GROUP_H > PH - M) { pdf.addPage(); desenharCabecalho() }
        pdf.setFillColor(30, 64, 175)
        pdf.rect(M, y, PW - 2 * M, GROUP_H, 'F')
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(8)
        pdf.setTextColor(255, 255, 255)
        const cnpjEmp = fmtCnpj(emp?.cnpj)
        const labelEmp = cnpjEmp && cnpjEmp !== '-' ? `${nome}   CNPJ: ${cnpjEmp}` : nome
        pdf.text(truncar(labelEmp, PW - 2 * M), M + 5, y + 12)
        pdf.setFont(undefined, 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(191, 219, 254)
        pdf.text(`${funcs.length} funcionário${funcs.length !== 1 ? 's' : ''}`, PW - M - 5, y + 12, { align: 'right' })
        y += GROUP_H

        funcs.forEach((f, idx) => {
          if (y + ROW_H > PH - M) { pdf.addPage(); desenharCabecalho() }

          const valores = [
            f.codigo_funcionario || '-',
            f.nome_funcionario || '-',
            f.cargo_codigo || '-',
            f.cargo_nome || '-',
          ]

          if (idx % 2 === 0) {
            pdf.setFillColor(248, 250, 252)
            pdf.rect(M, y, PW - 2 * M, ROW_H, 'F')
          }

          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(8)
          pdf.setTextColor(30, 41, 59)

          // Só as 4 colunas sem Empresa e CNPJ (já estão no cabeçalho do grupo)
          const colsSemEmp = COLS.slice(0, 4)
          let cx = M
          colsSemEmp.forEach((col, ci) => {
            pdf.text(truncar(valores[ci], col.w), cx + 4, y + 11)
            cx += col.w
          })

          pdf.setDrawColor(226, 232, 240)
          pdf.line(M, y + ROW_H, PW - M, y + ROW_H)
          y += ROW_H
        })

        y += 6 // espaço entre grupos
      })

      // Borda externa
      pdf.setDrawColor(203, 213, 225)
      pdf.rect(M, M + 30, PW - 2 * M, y - (M + 30), 'S')

      pdf.save(`funcionarios_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  const handleBaixarExcel = async (listaAtual) => {
    if (!listaAtual.length) return
    setGerandoExcel(true)
    try {
      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Portal de Gestão'
      const ws = wb.addWorksheet('Funcionários')

      const empresasMap = Object.fromEntries(empresas.map(e => [e.id, e]))

      const fmtCnpj = (v) => {
        if (!v) return ''
        const s = String(v).replace(/\D/g, '')
        if (s.length === 14) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`
        return v
      }

      ws.columns = [
        { key: 'cod',       width: 14 },
        { key: 'nome',      width: 42 },
        { key: 'cod_cargo', width: 14 },
        { key: 'cargo',     width: 42 },
      ]

      // Linha de cabeçalho das colunas
      const headerRow = ws.addRow(['Cód. Func.', 'Nome Funcionário', 'Cód. Cargo', 'Nome do Cargo'])
      headerRow.height = 18
      headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } }
      })

      // Agrupar e ordenar igual ao PDF
      const grupos = new Map()
      listaAtual.forEach(f => {
        const emp = empresasMap[f.empresa_id]
        const nomeEmp = emp?.empresa_fantasia || emp?.nome_empresa || f.empresa_nome || '(sem empresa)'
        if (!grupos.has(nomeEmp)) grupos.set(nomeEmp, { emp, funcs: [] })
        grupos.get(nomeEmp).funcs.push(f)
      })
      const gruposOrdenados = [...grupos.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
        .map(([nome, { emp, funcs }]) => ({
          nome, emp,
          funcs: [...funcs].sort((a, b) => (a.nome_funcionario || '').localeCompare(b.nome_funcionario || '', 'pt-BR')),
        }))

      gruposOrdenados.forEach(({ nome, emp, funcs }) => {
        const cnpj = fmtCnpj(emp?.cnpj)
        const label = cnpj ? `${nome}   CNPJ: ${cnpj}` : nome

        const groupRow = ws.addRow([label, '', '', ''])
        ws.mergeCells(`A${groupRow.number}:D${groupRow.number}`)
        groupRow.height = 18
        const gc = groupRow.getCell(1)
        gc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
        gc.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        gc.alignment = { vertical: 'middle', horizontal: 'left' }

        funcs.forEach((f, idx) => {
          const row = ws.addRow([
            f.codigo_funcionario || '',
            f.nome_funcionario || '',
            f.cargo_codigo || '',
            f.cargo_nome || '',
          ])
          row.height = 15
          if (idx % 2 === 0) {
            row.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
            })
          }
        })
      })

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `funcionarios_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Erro ao gerar Excel: ' + (err.message || String(err)))
    } finally {
      setGerandoExcel(false)
    }
  }

  const getCnpj = useCallback((f) =>
    fmtCnpj(empresas.find(e => e.id === f.empresa_id)?.cnpj) || null,
    [empresas])

  // Padrão "Sem X" — funcionário sem departamento/setor/box preenchido ganha uma opção própria
  // no filtro, em vez de simplesmente sumir do seletor sem dar como localizar esses registros.
  const SEM_DEPARTAMENTO = 'Sem departamento'
  const SEM_SETOR = 'Sem setor'
  const SEM_BOX = 'Sem box'
  // Departamento/Setor são definidos no Cargo — o funcionário só guarda uma cópia desses ids
  // (gravada da última vez que o cadastro dele foi salvo). Se o Cargo mudar de
  // departamento/setor depois, essa cópia fica desatualizada, então sempre prioriza o valor
  // atual do Cargo vinculado e só cai pro campo do próprio funcionário se ele não tiver cargo.
  const deptoIdsDe = (f) => cargos.find(c => c.id === f.cargo_id)?.departamento_ids || f.departamento_ids || []
  const setorIdsDe = (f) => cargos.find(c => c.id === f.cargo_id)?.setor_ids || f.setor_ids || []
  const getDeptLabels = (f) => {
    const n = deptoIdsDe(f).map(id => departamentos.find(d => d.id === id)?.nome_departamento).filter(Boolean)
    return n.length > 0 ? n : [SEM_DEPARTAMENTO]
  }
  const getSetorLabelsF = (f) => {
    const n = setorIdsDe(f).map(id => setores.find(s => s.id === id)?.nome_setor).filter(Boolean)
    return n.length > 0 ? n : [SEM_SETOR]
  }
  const getBoxLabel = (f) => f.box_nome || SEM_BOX
  const comSemOpcao = (nomes, semLabel, temAlgumVazio) => {
    const unicos = [...new Set(nomes.filter(n => n && n !== semLabel))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return temAlgumVazio ? [semLabel, ...unicos] : unicos
  }

  // Filtros dinâmicos (facetados): as opções de cada seletor são calculadas aplicando todos os
  // OUTROS filtros ativos, menos o dele mesmo — mesmo padrão usado em Cargos/Cargos e Remunerações.
  // Só estreita as OPÇÕES exibidas; nunca mexe na seleção que o usuário já fez nos outros filtros.
  const filtrarComExcecao = useMemo(() => (ignorar) => dados.filter(f =>
    (ignorar === 'nome' || !colFiltros.nome || (f.nome_funcionario || '').toLowerCase().includes(colFiltros.nome.toLowerCase())) &&
    (ignorar === 'empresa' || colFiltros.empresa.length === 0 || colFiltros.empresa.includes(f.empresa_nome)) &&
    (ignorar === 'cnpj' || cnpjFiltro.length === 0 || cnpjFiltro.includes(getCnpj(f))) &&
    (ignorar === 'cargo' || colFiltros.cargo.length === 0 || colFiltros.cargo.includes(f.cargo_nome)) &&
    (ignorar === 'departamento' || departamentoFiltro.length === 0 || getDeptLabels(f).some(v => departamentoFiltro.includes(v))) &&
    (ignorar === 'setor' || setorFiltro.length === 0 || getSetorLabelsF(f).some(v => setorFiltro.includes(v))) &&
    (ignorar === 'box' || boxFiltro.length === 0 || boxFiltro.includes(getBoxLabel(f))) &&
    (ignorar === 'ativo' || colFiltros.ativo.length === 0 || colFiltros.ativo.includes(statusInfo(f).label))
  ), [dados, colFiltros, cnpjFiltro, departamentoFiltro, setorFiltro, boxFiltro, departamentos, setores, cargos, getCnpj])

  const empresasUnicas = useMemo(() =>
    [...new Set(filtrarComExcecao('empresa').map(f => f.empresa_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [filtrarComExcecao])

  const cargosUnicos = useMemo(() =>
    [...new Set(filtrarComExcecao('cargo').map(f => f.cargo_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [filtrarComExcecao])

  const departamentosUnicos = useMemo(() => {
    const base = filtrarComExcecao('departamento')
    return comSemOpcao(base.flatMap(f => getDeptLabels(f)), SEM_DEPARTAMENTO, base.some(f => getDeptLabels(f).includes(SEM_DEPARTAMENTO)))
  }, [filtrarComExcecao, departamentos, cargos])

  const setoresUnicos = useMemo(() => {
    const base = filtrarComExcecao('setor')
    return comSemOpcao(base.flatMap(f => getSetorLabelsF(f)), SEM_SETOR, base.some(f => getSetorLabelsF(f).includes(SEM_SETOR)))
  }, [filtrarComExcecao, setores, cargos])

  const boxesUnicos = useMemo(() => {
    const base = filtrarComExcecao('box')
    return comSemOpcao(base.map(f => getBoxLabel(f)), SEM_BOX, base.some(f => getBoxLabel(f) === SEM_BOX))
  }, [filtrarComExcecao])

  const cnpjsUnicos = useMemo(() =>
    [...new Set(filtrarComExcecao('cnpj').map(f => getCnpj(f)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [filtrarComExcecao, getCnpj])

  const statusOpcoes = useMemo(() =>
    [...new Set(filtrarComExcecao('ativo').map(f => statusInfo(f).label))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [filtrarComExcecao])

  // TODAS as políticas que batem com o cargo/empresa selecionados no formulário — quando o
  // cargo tem mais de uma (ex: Peças + Serviços), mostra a lista inteira abaixo da Descrição.
  const politicasResolvidasForm = useMemo(() => {
    if (!form.cargo_id) return []
    const agrupId = getAgrupamentoId(form.empresa_id)
    return resolvePoliticasCargo(form.cargo_id, agrupId, politicasTodas)
  }, [form.cargo_id, form.empresa_id, politicasTodas, empresas])

  const politicasResolvidasVisualizar = useMemo(() => {
    if (!itemVisualizado?.cargo_id) return []
    const agrupId = getAgrupamentoId(itemVisualizado.empresa_id)
    return resolvePoliticasCargo(itemVisualizado.cargo_id, agrupId, politicasTodas)
  }, [itemVisualizado, politicasTodas, empresas])

  const setCol = (campo, valor) => setColFiltros(prev => ({ ...prev, [campo]: valor }))

  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: 'asc' })
  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  const dadosFiltrados = useMemo(() => {
    const filtrados = filtrarComExcecao(null)

    if (!ordenacao.coluna) return filtrados
    const dir = ordenacao.direcao === 'desc' ? -1 : 1
    const getVal = {
      codigo: (f) => f.codigo_funcionario || '',
      nome: (f) => f.nome_funcionario || '',
      empresa: (f) => f.empresa_nome || '',
      cargo: (f) => f.cargo_nome || '',
      departamento: (f) => getNomes(deptoIdsDe(f), departamentos, 'nome_departamento'),
      setor: (f) => getNomes(setorIdsDe(f), setores, 'nome_setor'),
      box: (f) => f.box_nome || '',
      admissao: (f) => f.data_admissao || '',
      demissao: (f) => f.data_demissao || '',
      ativo: (f) => statusInfo(f).label || '',
    }[ordenacao.coluna]
    return [...filtrados].sort((a, b) => dir * getVal(a).localeCompare(getVal(b), 'pt-BR', { sensitivity: 'base' }))
  }, [filtrarComExcecao, ordenacao, departamentos, setores, cargos])

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

  const statusFormAtual = statusInfo(form)

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Funcionários</h1>
          <p className="text-xs text-slate-500">Gerencie os funcionários vinculados a empresas, cargos e políticas de comissão.</p>
        </div>
        <div className="flex items-center gap-2">
          <div ref={menuSalvarRef} className="relative">
            <button
              onClick={() => setMenuSalvarAberto(v => !v)}
              disabled={(gerandoPDF || gerandoExcel) || dadosFiltrados.length === 0}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {(gerandoPDF || gerandoExcel) ? 'Gerando...' : 'Salvar'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {menuSalvarAberto && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden">
                <button
                  onClick={() => { setMenuSalvarAberto(false); handleSalvarPDF(dadosFiltrados) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileDown className="h-4 w-4 text-slate-500" />
                  Salvar PDF
                </button>
                <button
                  onClick={() => { setMenuSalvarAberto(false); handleBaixarExcel(dadosFiltrados) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Salvar Excel
                </button>
              </div>
            )}
          </div>
          {canEdit && (
            <button
              onClick={handleSincronizarDepartamentos}
              disabled={sincronizando}
              title="Reaplica o Departamento/Setor mais recente do Cargo em quem ainda está com o dado antigo"
              className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar Departamentos
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => setModalImportarAberto(true)}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Excel
            </button>
          )}
          {canEdit && (
            <button
              onClick={abrirIncluir}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Incluir Funcionário
            </button>
          )}
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-20">
                <button onClick={() => alternarOrdenacao('codigo')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Código {iconeOrdenacao('codigo')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('nome')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Funcionário {iconeOrdenacao('nome')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('empresa')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Empresa {iconeOrdenacao('empresa')}
                </button>
              </th>
              <th className="p-3 w-36">CNPJ</th>
              <th className="p-3 w-20">Cód. Cargo</th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('cargo')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Cargo {iconeOrdenacao('cargo')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('departamento')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Departamento {iconeOrdenacao('departamento')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('setor')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Setor {iconeOrdenacao('setor')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('box')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Box {iconeOrdenacao('box')}
                </button>
              </th>
              <th className="p-3 whitespace-nowrap">
                <button onClick={() => alternarOrdenacao('admissao')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Data Admissão {iconeOrdenacao('admissao')}
                </button>
              </th>
              <th className="p-3 whitespace-nowrap">
                <button onClick={() => alternarOrdenacao('demissao')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Data Demissão {iconeOrdenacao('demissao')}
                </button>
              </th>
              <th className="p-3 w-20 text-center">
                <button onClick={() => alternarOrdenacao('ativo')} className="flex items-center gap-1 mx-auto hover:text-slate-600 transition-colors">
                  Ativo {iconeOrdenacao('ativo')}
                </button>
              </th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
            <tr className="bg-white border-b border-slate-100">
              <th className="px-2 py-1.5 w-20" />
              <th className="px-2 py-1.5">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-300 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filtrar nome..."
                    value={colFiltros.nome}
                    onChange={e => setCol('nome', e.target.value)}
                    className="w-full pl-6 pr-6 py-1 text-[11px] border border-slate-200 rounded bg-slate-50 focus:outline-none focus:border-blue-400 focus:bg-white"
                  />
                  {colFiltros.nome && (
                    <X
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 hover:text-red-600 cursor-pointer"
                      onClick={() => setCol('nome', '')}
                    />
                  )}
                </div>
              </th>
              <th className="px-2 py-1.5">
                <FiltroMultiSelect
                  placeholder="Todas"
                  opcoes={empresasUnicas}
                  selecionados={colFiltros.empresa}
                  onChange={v => setCol('empresa', v)}
                />
              </th>
              <th className="px-2 py-1.5 w-36">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={cnpjsUnicos}
                  selecionados={cnpjFiltro}
                  onChange={v => setCol('cnpj', v)}
                />
              </th>
              <th className="px-2 py-1.5 w-20" />
              <th className="px-2 py-1.5">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={cargosUnicos}
                  selecionados={colFiltros.cargo}
                  onChange={v => setCol('cargo', v)}
                />
              </th>
              <th className="px-2 py-1.5">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={departamentosUnicos}
                  selecionados={departamentoFiltro}
                  onChange={v => setCol('departamento', v)}
                />
              </th>
              <th className="px-2 py-1.5">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={setoresUnicos}
                  selecionados={setorFiltro}
                  onChange={v => setCol('setor', v)}
                />
              </th>
              <th className="px-2 py-1.5">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={boxesUnicos}
                  selecionados={boxFiltro}
                  onChange={v => setCol('box', v)}
                />
              </th>
              <th className="px-2 py-1.5" />
              <th className="px-2 py-1.5" />
              <th className="px-2 py-1.5 w-20">
                <FiltroMultiSelect
                  placeholder="Todos"
                  opcoes={statusOpcoes}
                  selecionados={colFiltros.ativo}
                  onChange={v => setCol('ativo', v)}
                />
              </th>
              <th className="px-2 py-1.5 w-24 text-center">
                <button
                  onClick={() => setColFiltros({ nome: '', empresa: [], cnpj: [], cargo: [], departamento: [], setor: [], box: [], ativo: [] })}
                  disabled={!colFiltros.nome && colFiltros.empresa.length === 0 && cnpjFiltro.length === 0 && colFiltros.cargo.length === 0 && departamentoFiltro.length === 0 && setorFiltro.length === 0 && boxFiltro.length === 0 && colFiltros.ativo.length === 0}
                  className="flex items-center gap-1 mx-auto text-[11px] font-semibold text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-slate-400 transition-colors"
                  title="Limpar todos os filtros"
                >
                  <X className="h-3 w-3" />
                  Limpar
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="13" className="p-6 text-center text-slate-400">
                  {(colFiltros.nome || colFiltros.empresa.length > 0 || cnpjFiltro.length > 0 || colFiltros.cargo.length > 0 || departamentoFiltro.length > 0 || setorFiltro.length > 0 || boxFiltro.length > 0 || colFiltros.ativo.length > 0)
                    ? 'Nenhum funcionário encontrado para os filtros aplicados.' : 'Nenhum funcionário cadastrado.'}
                </td>
              </tr>
            ) : dadosFiltrados.map((item) => {
              const st = statusInfo(item)
              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{item.codigo_funcionario || '-'}</td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                      {item.nome_funcionario}
                    </div>
                  </td>
                  <td className="p-3 text-slate-700 whitespace-nowrap">{item.empresa_nome || '-'}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {fmtCnpj(empresas.find(e => e.id === item.empresa_id)?.cnpj) || '-'}
                  </td>
                  <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{item.cargo_codigo || '-'}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-100 text-[10px] whitespace-nowrap">
                      {item.cargo_nome || '-'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[180px]" title={getNomes(deptoIdsDe(item), departamentos, 'nome_departamento')}>
                    {getNomes(deptoIdsDe(item), departamentos, 'nome_departamento')}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[180px]" title={getNomes(setorIdsDe(item), setores, 'nome_setor')}>
                    {getNomes(setorIdsDe(item), setores, 'nome_setor')}
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">{item.box_nome || '-'}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{fmtDate(item.data_admissao) || '-'}</td>
                  <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{fmtDate(item.data_demissao) || '-'}</td>
                  <td className="p-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <PermissionActionButtons
                    menuPath="funcionarios"
                    onView={() => abrirVisualizar(item)}
                    onEdit={() => abrirEditar(item)}
                    onDelete={() => abrirExcluir(item)}
                  />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[980px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Funcionário' : 'Incluir Funcionário'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto custom-scrollbar">

                {/* Nome */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-3 flex flex-col gap-1.5">
                    <label className={LBL}>Nome do Funcionário *</label>
                    <input
                      type="text"
                      name="nome_funcionario"
                      required
                      value={form.nome_funcionario}
                      onChange={handleInputChange}
                      placeholder="Nome completo do funcionário"
                      className={INP}
                    />
                  </div>
                </div>

                {/* Código Domínio Web + Código Sistema */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Código Domínio Web
                      <span className="relative group cursor-help">
                        <Info className="h-3 w-3 text-slate-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                          Código do funcionário cadastrado no sistema Domínio Web
                        </span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="codigo_funcionario"
                      value={form.codigo_funcionario}
                      onChange={handleInputChange}
                      placeholder="Ex: 000123"
                      className={INP}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Código Sistema
                      <span className="relative group cursor-help">
                        <Info className="h-3 w-3 text-slate-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                          Código do funcionário no sistema de origem dos relatórios de BI (SharePoint) — usado pra relacionar com as Fontes BI configuradas pra casar por código em vez do Nome do Funcionário
                        </span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="codigo_sistema_bi"
                      value={form.codigo_sistema_bi}
                      onChange={handleInputChange}
                      placeholder="Ex: código do vendedor no sistema de vendas"
                      className={INP}
                    />
                  </div>
                </div>

                {/* Empresa + CNPJ */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={LBL}>Empresa *</label>
                    <select required value={form.empresa_id} onChange={handleEmpresaChange} className={SEL}>
                      <option value="">Selecione a empresa</option>
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL_RO}>CNPJ</label>
                    <div className={INP_RO}>
                      {fmtCnpj(empresas.find(e => e.id === form.empresa_id)?.cnpj) || <span className="text-slate-300">—</span>}
                    </div>
                  </div>
                </div>

                {/* Cargo + Departamento + Setor + Box */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Cargo *</label>
                    <select required value={form.cargo_id} onChange={handleCargoChange} className={SEL}>
                      <option value="">Selecione o cargo</option>
                      {cargos
                        .filter(c => !form.empresa_id || !c.empresa_id || c.empresa_id === form.empresa_id)
                        .sort((a, b) => (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR'))
                        .map(c => <option key={c.id} value={c.id}>{c.codigo_cargo ? `${c.codigo_cargo} — ${c.nome_cargo}` : c.nome_cargo}</option>)
                      }
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={form.cargo_id ? LBL_RO : LBL}>Departamento</label>
                    <div className={INP_RO}>
                      {getNomes(form.departamento_ids, departamentos, 'nome_departamento')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={form.cargo_id ? LBL_RO : LBL}>Setor</label>
                    <div className={INP_RO}>
                      {getNomes(form.setor_ids, setores, 'nome_setor')}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Box</label>
                    <select
                      value={form.box_id}
                      onChange={e => {
                        const b = boxes.find(x => x.id === e.target.value)
                        setForm(prev => ({ ...prev, box_id: b?.id || '', box_nome: b?.nome_box || '' }))
                      }}
                      className={SEL}
                    >
                      <option value="">Nenhum</option>
                      {boxes
                        .filter(b =>
                          form.setor_ids?.length > 0
                            ? Array.isArray(b.setor_ids) && b.setor_ids.some(sid => form.setor_ids.includes(sid))
                            : true
                        )
                        .map(b => <option key={b.id} value={b.id}>{b.nome_box}</option>)
                      }
                    </select>
                  </div>
                </div>

                {/* Situação do Funcionário */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Situação do Funcionário</label>
                  <select name="situacao_funcionario" value={form.situacao_funcionario} onChange={handleInputChange} className={SEL}>
                    <option value="">Selecione a situação</option>
                    {SITUACOES_FUNCIONARIO.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Datas + Status */}
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Data Admissão</label>
                    <input type="date" name="data_admissao" value={form.data_admissao} onChange={handleInputChange} className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>
                      Data Demissão{form.situacao_funcionario === SITUACAO_DEMITIDO && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="date" name="data_demissao" value={form.data_demissao} onChange={handleInputChange}
                      required={form.situacao_funcionario === SITUACAO_DEMITIDO}
                      className={INP}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Situação (Ativo)</label>
                    <div className={`${INP_RO} flex items-center`}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusFormAtual.cls}`}>
                        {statusFormAtual.label}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-400">
                        {statusFormAtual.detalhe}
                      </span>
                    </div>
                  </div>
                </div>


                {/* Opção: receber comissão durante férias */}
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 cursor-pointer select-none w-fit">
                  <input
                    type="checkbox"
                    checked={!!form.recebe_comissao_ferias}
                    onChange={e => setForm(prev => ({ ...prev, recebe_comissao_ferias: e.target.checked }))}
                    className="w-4 h-4 rounded accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Recebe comissão durante férias</span>
                  <span className="text-[10px] text-slate-400">(aparece no Cálculo de Comissões mesmo em férias)</span>
                </label>

                {/* Seção Política de Comissão */}
                <div className="rounded-md border border-indigo-200 bg-indigo-50/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                    <BadgePercent className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
                      Política de Comissão
                    </span>
                    {buscandoPolitica && <span className="text-[10px] text-indigo-400 ml-auto">Buscando...</span>}
                    {!buscandoPolitica && form.cargo_id && form.empresa_id && !form.politica_id && (
                      <span className="text-[10px] text-amber-500 ml-auto">Nenhuma política encontrada</span>
                    )}
                    {!form.cargo_id || !form.empresa_id ? (
                      <span className="text-[10px] text-slate-400 ml-auto">Selecione empresa e cargo</span>
                    ) : null}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Descrição */}
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL_RO}>Descrição da Comissão</label>
                      <div className={INP_RO}>{form.descricao_comissao || <span className="text-slate-300">—</span>}</div>
                    </div>

                    {/* Políticas com a MESMA Descrição viram um card só (Descrição mostrada uma vez),
                        com cada Fonte/Base/Nível/percentual empilhado — economiza espaço vertical. */}
                    {politicasResolvidasForm.length > 0 && (
                      <div className="flex flex-col gap-1.5 pl-3 border-l-2 border-indigo-200">
                        {politicasResolvidasForm.length > 1 && (
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                            Este cargo tem {politicasResolvidasForm.length} políticas de comissão — os valores se somam
                          </span>
                        )}
                        {agruparPoliticasPorDescricao(politicasResolvidasForm).map(grupo => (
                          <div key={grupo.descricao} className="rounded-md border border-indigo-100 bg-white px-3 py-2 text-[11px] divide-y divide-indigo-50">
                            <div className="font-semibold text-slate-800 pb-1">{grupo.itens[0].descricao_comissao || '—'}</div>
                            {grupo.itens.map(p => (
                              <div key={p.id} className="py-1.5 space-y-0.5 first:pt-0 last:pb-0">
                                <div className="grid grid-cols-3 gap-x-3 text-slate-500">
                                  <div><span className="text-slate-400">Fonte:</span> {p.fonte_calculo?.nome || '—'}</div>
                                  <div><span className="text-slate-400">Base:</span> {p.base_calculo?.nome || '—'}</div>
                                  <div><span className="text-slate-400">Nível:</span> {p.nivel_calculo || '—'}</div>
                                </div>
                                <div className="font-mono font-bold text-indigo-600 flex flex-wrap gap-x-2">
                                  {percentuaisDaPolitica(p).length === 0
                                    ? <span className="text-slate-300 font-normal">—</span>
                                    : percentuaisDaPolitica(p).map((pct, i) => (
                                      <span key={i}>{pct.label} {pct.moeda ? fmtBRL(pct.valor) : fmtPct(pct.valor)}</span>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {politicasResolvidasForm.length === 0 && (
                      <p className="text-[11px] text-slate-400">Nenhuma política de comissão configurada pra esse cargo/empresa ainda.</p>
                    )}
                  </div>
                </div>

              </div>

              {erroModal && (
                <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit"
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
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
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[860px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Funcionário
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-start gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Funcionário</span>
                  <div className="flex items-baseline gap-2">
                    {itemVisualizado.codigo_funcionario && (
                      <span className="text-[11px] font-mono font-bold text-slate-400">{itemVisualizado.codigo_funcionario}</span>
                    )}
                    <span className="text-sm font-bold text-slate-900">{itemVisualizado.nome_funcionario || '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação (Ativo)</span>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo(itemVisualizado).cls}`}>
                      {statusInfo(itemVisualizado).label}
                    </span>
                    <span className="text-[10px] text-slate-400">{statusInfo(itemVisualizado).detalhe}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data Admissão</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{fmtDate(itemVisualizado.data_admissao)}</span>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data Demissão</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{fmtDate(itemVisualizado.data_demissao)}</span>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresa</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.empresa_nome || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CNPJ</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">
                    {fmtCnpj(empresas.find(e => e.id === itemVisualizado.empresa_id)?.cnpj) || '-'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código Sistema (BI)</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_sistema_bi || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação do Funcionário</span>
                  <span className="text-xs font-semibold text-slate-800">{situacaoTexto(itemVisualizado.situacao_funcionario) || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comissão nas Férias</span>
                  <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.recebe_comissao_ferias ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {itemVisualizado.recebe_comissao_ferias ? 'Sim' : 'Não'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-x-6 gap-y-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargo</span>
                  <div className="flex items-baseline gap-2">
                    {itemVisualizado.cargo_codigo && (
                      <span className="text-[11px] font-mono font-bold text-slate-400">{itemVisualizado.cargo_codigo}</span>
                    )}
                    <span className="text-xs font-semibold text-slate-800">{itemVisualizado.cargo_nome || '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamento</span>
                  <span className="text-xs font-semibold text-slate-800">{getNomes(deptoIdsDe(itemVisualizado), departamentos, 'nome_departamento')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Setor</span>
                  <span className="text-xs font-semibold text-slate-800">{getNomes(setorIdsDe(itemVisualizado), setores, 'nome_setor')}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Box</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.box_nome || '-'}</span>
                </div>
              </div>

              {/* Política */}
              <div className="rounded-md border border-indigo-200 bg-indigo-50/30 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                  <BadgePercent className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Política de Comissão</span>
                  {politicasResolvidasVisualizar.length > 1 && (
                    <span className="ml-auto text-[10px] font-bold text-indigo-400">{politicasResolvidasVisualizar.length} políticas</span>
                  )}
                </div>
                <div className="p-4">
                  {politicasResolvidasVisualizar.length === 0 && (
                    <p className="text-[11px] text-slate-400">Nenhuma política de comissão configurada para esse cargo/empresa.</p>
                  )}
                  {politicasResolvidasVisualizar.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {politicasResolvidasVisualizar.length > 1 && (
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">
                          Este cargo tem {politicasResolvidasVisualizar.length} políticas — os valores se somam
                        </span>
                      )}
                      {agruparPoliticasPorDescricao(politicasResolvidasVisualizar).map(grupo => (
                        <div key={grupo.descricao} className="rounded-md border border-indigo-100 bg-white px-3 py-2 text-[11px] divide-y divide-indigo-50">
                          <div className="font-semibold text-slate-800 pb-1">{grupo.itens[0].descricao_comissao || '—'}</div>
                          {grupo.itens.map(p => (
                            <div key={p.id} className="py-1.5 space-y-0.5 first:pt-0 last:pb-0">
                              <div className="grid grid-cols-3 gap-x-3 text-slate-500">
                                <div><span className="text-slate-400">Fonte:</span> {p.fonte_calculo?.nome || '—'}</div>
                                <div><span className="text-slate-400">Base:</span> {p.base_calculo?.nome || '—'}</div>
                                <div>
                                  <span className="text-slate-400">Nível:</span> {p.nivel_calculo || '—'}
                                  {(p.codigo_rubrica || p.tipo_processo) && (
                                    <span className="text-[10px] text-slate-400">
                                      {p.codigo_rubrica && <> · Rubrica <span className="font-mono text-slate-500">{p.codigo_rubrica}</span></>}
                                      {p.tipo_processo && <> · Tipo <span className="font-mono text-slate-500">{p.tipo_processo}</span></>}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="font-mono font-bold text-indigo-600 flex flex-wrap gap-x-2">
                                {percentuaisDaPolitica(p).length === 0
                                  ? <span className="text-slate-300 font-normal">—</span>
                                  : percentuaisDaPolitica(p).map((pct, i) => (
                                    <span key={i}>{pct.label} {pct.moeda ? fmtBRL(pct.valor) : fmtPct(pct.valor)}</span>
                                  ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a remoção do funcionário <strong className="text-slate-800">"{itemVisualizado.nome_funcionario}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirmarExclusao}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTAR EXCEL */}
      {modalImportarAberto && (
        <ImportarFuncionariosModal
          funcionarios={dados}
          empresas={empresas}
          cargos={cargos}
          boxes={boxes}
          onClose={() => setModalImportarAberto(false)}
          onImported={loadData}
        />
      )}

    </div>
  )
}
