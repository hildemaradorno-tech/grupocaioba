import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, BadgePercent, Eye, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, ChevronDown, ChevronRight, Copy, Loader2, Info, Briefcase, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import { buscaComCoringa } from '../utils/buscaTexto'

const NIVEIS_CALCULO = ['EMPRESA', 'EQUIPE', 'INDIVIDUAL']
const USA_FAIXA_OPCOES = ['NÃO', 'SIM']

const FORM_VAZIO = {
  cargo_ids: [],
  tipo_calculo: 'PADRAO',
  descricao_comissao: '',
  codigo_rubrica: '',
  tipo_processo: '11',
  fonte_calculo_id: '',
  base_calculo_id: '',
  nivel_calculo: '',
  comissao_servicos: '',
  comissao_pecas: '',
  comissao_total: '',
  comissao_valor: '',
  usa_faixa: 'NÃO',
  comissao_todas_empresas: false,
  detalhar_por_empresa: false,
  vig_inicio: '',
  vig_fim: '',
  ativo: true,
}

const fmtPct = (v) => (v != null && v !== '') ? `${parseFloat(v).toFixed(2)}%` : '-'
const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

// Dropdown com checkbox por cargo (código + nome + empresa, pra diferenciar o mesmo cargo em
// CNPJs diferentes) — usado tanto pra incluir quanto pra editar, sempre multi-seleção: marcar
// vários cria uma linha de política por cargo; editar deixa acrescentar/remover cargos do grupo.
function CargoMultiSelect({ cargos, selecionados, onToggle }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtrosEmpresa, setFiltrosEmpresa] = useState([])
  const ref = useRef(null)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  useEffect(() => { if (!aberto) { setBusca(''); setFiltrosEmpresa([]) } }, [aberto])

  const empresasUnicas = [...new Set(cargos.map(c => c.nome_empresa).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  const toggleFiltroEmpresa = (nome) => setFiltrosEmpresa(prev => prev.includes(nome) ? prev.filter(n => n !== nome) : [...prev, nome])

  const cargosFiltrados = cargos
    .filter(c => filtrosEmpresa.length === 0 || filtrosEmpresa.includes(c.nome_empresa))
    .filter(c => !busca.trim() || buscaComCoringa(`${c.codigo_cargo || ''} ${c.nome_cargo} ${c.nome_empresa || ''}`, busca))
    // Ordena pelo Código (numérico quando possível) — é o primeiro dado que aparece em cada
    // linha, então navegar em ordem crescente de código é mais previsível do que por nome.
    .sort((a, b) => {
      const numA = parseInt(a.codigo_cargo, 10)
      const numB = parseInt(b.codigo_cargo, 10)
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB
      return (a.codigo_cargo || '').localeCompare(b.codigo_cargo || '', 'pt-BR', { numeric: true }) || (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR')
    })

  const selecionadosObjs = cargos.filter(c => selecionados.includes(c.id))
  const rotulo = (c) => `${c.codigo_cargo ? c.codigo_cargo + ' — ' : ''}${c.nome_cargo} (${c.nome_empresa || 'sem empresa'})`
  const texto = selecionadosObjs.length === 0 ? 'Selecione o(s) cargo(s)'
    : selecionadosObjs.length === 1 ? rotulo(selecionadosObjs[0])
    : `${selecionadosObjs.map(c => c.codigo_cargo).filter(Boolean).join(', ')} — ${selecionadosObjs.length} cargos selecionados`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        className={`${SEL} flex items-center justify-between gap-2 text-left`}
      >
        <span className={`truncate ${selecionadosObjs.length === 0 ? 'text-slate-400 font-normal' : 'text-slate-800'}`}>{texto}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div className="absolute z-30 mt-1 w-full max-h-80 flex flex-col bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          <div className="flex flex-col gap-1.5 shrink-0 border-b border-slate-100 p-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300 pointer-events-none" />
              <input
                type="text"
                autoFocus
                value={busca}
                onChange={e => setBusca(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Buscar por código, cargo ou empresa..."
                className="w-full text-xs pl-7 pr-2 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {empresasUnicas.map(nome => {
                const sel = filtrosEmpresa.includes(nome)
                return (
                  <button
                    key={nome}
                    type="button"
                    onClick={e => { e.stopPropagation(); toggleFiltroEmpresa(nome) }}
                    className={`px-2 py-1 rounded text-[10px] font-semibold border transition-colors ${
                      sel ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {nome}
                  </button>
                )
              })}
              {filtrosEmpresa.length > 0 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setFiltrosEmpresa([]) }}
                  className="px-2 py-1 rounded text-[10px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto py-1 custom-scrollbar">
          {cargosFiltrados.length === 0 ? (
            <p className="px-2 py-1.5 text-[11px] text-slate-400">{cargos.length === 0 ? 'Nenhum cargo com empresa vinculada.' : 'Nenhum cargo encontrado.'}</p>
          ) : cargosFiltrados.map(c => {
            const sel = selecionados.includes(c.id)
            return (
              <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sel}
                  onChange={() => onToggle(c.id)}
                  className="accent-blue-600 shrink-0"
                />
                <span className="font-mono text-[10px] text-slate-400 shrink-0 w-10">{c.codigo_cargo || '—'}</span>
                <span className="truncate text-slate-700 font-medium flex-1">{c.nome_cargo}</span>
                <span className="text-[10px] text-slate-400 shrink-0 truncate max-w-[140px]">{c.nome_empresa || '—'}</span>
              </label>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PoliticaComissao() {
  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cargos, setCargos] = useState([])
  const [fontesCalculo, setFontesCalculo] = useState([])
  const [basesCalculo, setBasesCalculo] = useState([])
  const [rubricas, setRubricas] = useState([])
  const [tiposProcesso, setTiposProcesso] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [duplicandoId, setDuplicandoId] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('polcom_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('polcom_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useSessionState('polcom_form', FORM_VAZIO)
  // cargo_id (política já existente) -> id da linha de fato_politica_comissao, capturado ao
  // abrir Editar — permite saber, ao salvar, quais linhas atualizar/criar/excluir do grupo.
  const [itensOriginais, setItensOriginais] = useState(new Map())
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('politica-comissao', 'editar')
  const canDelete = hasPermission('politica-comissao', 'excluir')
  const location = useLocation()
  const navigate = useNavigate()

  // Cargo só entra no seletor se já tiver empresa vinculada (dim_cargos.empresa_id) — é dali
  // que a política herda empresa/agrupamento de cada linha, então sem isso não tem como saber
  // pra quem a comissão vale.
  const cargosComEmpresa = useMemo(() => cargos.filter(c => c.empresa_id), [cargos])
  const cargosSemEmpresaCount = cargos.length - cargosComEmpresa.length
  // fato_politica_comissao não guarda o código do cargo — busca no cadastro de Cargos pra exibir.
  const codigoDoCargo = (cargoId) => cargos.find(c => c.id === cargoId)?.codigo_cargo || ''

  // Filtro de texto por coluna + ordenação A-Z/Z-A clicando no cabeçalho.
  const [colFiltro, setColFiltro] = useState({ empresa: '', cargo: '', descricao: '' })
  const temFiltroColuna = Object.values(colFiltro).some(Boolean)
  const [filtrosAbertos, setFiltrosAbertos] = useSessionState('polcom_filtros_abertos', false)
  const limparFiltroColuna = () => setColFiltro({ empresa: '', cargo: '', descricao: '' })
  const [ordenacao, setOrdenacao] = useState({ coluna: 'cargo', direcao: 'asc' })
  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  // Junta as linhas de fato_politica_comissao em grupos (grupo_politica_id) — uma "comissão" na
  // tela pode ter vários cargos por baixo. Os campos da comissão em si (descrição, fonte, base,
  // percentuais...) são os mesmos em todas as linhas do grupo, então basta ler da primeira.
  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const p of dados) {
      const gid = p.grupo_politica_id || p.id
      if (!mapa.has(gid)) mapa.set(gid, [])
      mapa.get(gid).push(p)
    }
    return [...mapa.entries()].map(([grupoId, itens]) => {
      const primeiro = itens[0]
      return {
        grupoId,
        itens,
        cargosNomes: [...new Set(itens.map(i => i.cargo_nome).filter(Boolean))],
        empresasNomes: [...new Set(itens.map(i => i.empresa_nome).filter(Boolean))],
        tipo_calculo: primeiro.tipo_calculo || 'PADRAO',
        descricao_comissao: primeiro.descricao_comissao,
        codigo_rubrica: primeiro.codigo_rubrica,
        tipo_processo: primeiro.tipo_processo,
        fonte_calculo_id: primeiro.fonte_calculo_id,
        base_calculo_id: primeiro.base_calculo_id,
        fonte_calculo: primeiro.fonte_calculo,
        base_calculo: primeiro.base_calculo,
        nivel_calculo: primeiro.nivel_calculo,
        comissao_servicos: primeiro.comissao_servicos,
        comissao_pecas: primeiro.comissao_pecas,
        comissao_total: primeiro.comissao_total,
        comissao_valor: primeiro.comissao_valor,
        usa_faixa: primeiro.usa_faixa,
        comissao_todas_empresas: primeiro.comissao_todas_empresas,
        detalhar_por_empresa: primeiro.detalhar_por_empresa,
        vig_inicio: primeiro.vig_inicio,
        vig_fim: primeiro.vig_fim,
        ativo: primeiro.ativo,
      }
    })
  }, [dados])

  const textoEmpresas = (grupo) => grupo.empresasNomes.join(', ')
  const textoCargo = (grupo) => grupo.cargosNomes.join(', ')
  const textoDescricao = (grupo) => grupo.descricao_comissao || ''
  const numeroServicos = (grupo) => grupo.comissao_servicos != null ? parseFloat(grupo.comissao_servicos) : null
  const numeroPecas = (grupo) => grupo.comissao_pecas != null ? parseFloat(grupo.comissao_pecas) : null
  const numeroTotal = (grupo) => grupo.comissao_total != null ? parseFloat(grupo.comissao_total) : null
  const numeroValor = (grupo) => grupo.comissao_valor != null ? parseFloat(grupo.comissao_valor) : null

  // Opções dos seletores = só o que realmente aparece na tabela principal.
  const empresasDisponiveis = useMemo(() =>
    [...new Set(grupos.flatMap(g => g.empresasNomes))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [grupos])
  const cargosDisponiveis = useMemo(() =>
    [...new Set(grupos.flatMap(g => g.cargosNomes))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [grupos])
  // Filtro continua batendo pelo NOME (é o que fato_politica_comissao.cargo_nome guarda) — o
  // código aqui é só pra exibir junto no rótulo da opção, buscado no cadastro de Cargos.
  const codigoPorNomeCargo = (nome) => cargos.find(c => c.nome_cargo === nome)?.codigo_cargo || ''

  const gruposExibidos = useMemo(() => {
    const filtrados = grupos.filter(grupo => {
      if (colFiltro.empresa && !grupo.empresasNomes.includes(colFiltro.empresa)) return false
      if (colFiltro.cargo && !grupo.cargosNomes.includes(colFiltro.cargo)) return false
      if (colFiltro.descricao && !buscaComCoringa(textoDescricao(grupo), colFiltro.descricao)) return false
      return true
    })

    if (!ordenacao.coluna) return filtrados
    const dir = ordenacao.direcao === 'desc' ? -1 : 1
    const comparadorNumerico = (fn) => (a, b) => {
      const va = fn(a); const vb = fn(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return dir * (va - vb)
    }
    const comparadores = {
      empresa: (a, b) => dir * textoEmpresas(a).localeCompare(textoEmpresas(b), 'pt-BR'),
      cargo: (a, b) => dir * textoCargo(a).localeCompare(textoCargo(b), 'pt-BR'),
      descricao: (a, b) => dir * textoDescricao(a).localeCompare(textoDescricao(b), 'pt-BR'),
      servicos: comparadorNumerico(numeroServicos),
      pecas: comparadorNumerico(numeroPecas),
      total: comparadorNumerico(numeroTotal),
      valor: comparadorNumerico(numeroValor),
      vigencia: (a, b) => dir * (a.vig_inicio || '').localeCompare(b.vig_inicio || ''),
    }
    return [...filtrados].sort(comparadores[ordenacao.coluna] || (() => 0))
  }, [grupos, colFiltro, ordenacao])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [politicas, emps, carg, fontes, bases, rubs, tiposProc] = await Promise.all([
        apiService.getPoliticaComissao(),
        apiService.getEmpresas(),
        apiService.getCargos(),
        apiService.getFontesCalculo(),
        apiService.getBasesCalculo(),
        apiService.getRubricas(),
        apiService.getTiposProcesso(),
      ])
      setDados(politicas)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || '', 'pt-BR')))
      setCargos([...carg].sort((a, b) => (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR')))
      setFontesCalculo([...fontes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')))
      setBasesCalculo([...bases].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')))
      setRubricas(rubs.filter(r => r.ativo !== false).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { numeric: true })))
      setTiposProcesso(tiposProc.filter(t => t.ativo !== false).sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { numeric: true })))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Arredonda pra 2 casas decimais ao sair do campo (% Serviços/Peças/Total e R$ Valor) — mesmo
  // padrão nos 4 campos, sem forçar nada enquanto o usuário ainda está digitando.
  const formatarDuasCasas = (campo) => {
    setForm(prev => (prev[campo] !== '' && !Number.isNaN(parseFloat(prev[campo])))
      ? { ...prev, [campo]: parseFloat(prev[campo]).toFixed(2) }
      : prev)
  }

  // Marca/desmarca livremente, tanto pra incluir quanto pra editar — editar só troca o que já
  // era update por create/delete na hora de salvar (ver handleSalvar).
  const toggleCargo = (cargoId) => {
    setForm(prev => {
      const jaSelecionado = prev.cargo_ids.includes(cargoId)
      return { ...prev, cargo_ids: jaSelecionado ? prev.cargo_ids.filter(id => id !== cargoId) : [...prev.cargo_ids, cargoId] }
    })
  }

  // Base de Cálculo é sempre de uma Fonte específica — trocar a Fonte limpa a Base selecionada
  // se ela não pertencer mais à nova Fonte (evita salvar uma combinação Fonte/Base inconsistente).
  const handleFonteChange = (e) => {
    const novaFonteId = e.target.value
    setForm(prev => {
      const baseAindaValida = basesCalculo.some(b => b.id === prev.base_calculo_id && b.fonte_calculo_id === novaFonteId)
      return { ...prev, fonte_calculo_id: novaFonteId, base_calculo_id: baseAindaValida ? prev.base_calculo_id : '' }
    })
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setItensOriginais(new Map())
    setForm({ ...FORM_VAZIO })
    setModalAberto(true)
  }

  const abrirEditar = (grupo) => {
    setEditingId(grupo.grupoId)
    setItensOriginais(new Map(grupo.itens.map(i => [i.cargo_id, i.id])))
    setForm({
      cargo_ids: grupo.itens.map(i => i.cargo_id).filter(Boolean),
      tipo_calculo: grupo.tipo_calculo || 'PADRAO',
      descricao_comissao: grupo.descricao_comissao || '',
      codigo_rubrica: grupo.codigo_rubrica || '',
      tipo_processo: grupo.tipo_processo || '',
      fonte_calculo_id: grupo.fonte_calculo_id || '',
      base_calculo_id: grupo.base_calculo_id || '',
      nivel_calculo: grupo.nivel_calculo || '',
      comissao_servicos: grupo.comissao_servicos ?? '',
      comissao_pecas: grupo.comissao_pecas ?? '',
      comissao_total: grupo.comissao_total ?? '',
      comissao_valor: grupo.comissao_valor ?? '',
      usa_faixa: grupo.usa_faixa || 'NÃO',
      comissao_todas_empresas: grupo.comissao_todas_empresas ?? false,
      detalhar_por_empresa: grupo.detalhar_por_empresa ?? false,
      vig_inicio: grupo.vig_inicio || '',
      vig_fim: grupo.vig_fim || '',
      ativo: grupo.ativo ?? true,
    })
    setModalAberto(true)
  }

  // Veio de outra tela (Cargos e Remunerações, clicando num cargo/linha) pedindo pra abrir
  // direto a edição de uma política específica — acha o grupo que contém aquela linha e abre o
  // grupo inteiro. Consome o state da navegação uma única vez, senão reabriria a cada re-render.
  useEffect(() => {
    const idParaEditar = location.state?.editarPoliticaId
    if (!idParaEditar || grupos.length === 0) return
    const grupo = grupos.find(g => g.itens.some(i => i.id === idParaEditar))
    if (grupo) abrirEditar(grupo)
    navigate(location.pathname, { replace: true, state: {} })
  }, [grupos, location.state])

  const abrirExcluir = (grupo) => {
    setIdExcluir(grupo.grupoId)
    setItemVisualizado(grupo)
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (grupo) => {
    setItemVisualizado(grupo)
    setModalVisualizarAberto(true)
  }

  // Duplica o grupo inteiro (todos os cargos) como um grupo novo — ponto de partida pra criar
  // uma variação da mesma comissão sem mexer na original.
  const handleDuplicar = async (grupo) => {
    setDuplicandoId(grupo.grupoId)
    try {
      const novoGrupoId = crypto.randomUUID()
      for (const item of grupo.itens) {
        await apiService.createPoliticaComissao({
          grupo_politica_id: novoGrupoId,
          agrupamento_empresa_id: item.agrupamento_empresa_id || null,
          agrupamento_nome: item.agrupamento_nome || null,
          empresa_id: item.empresa_id || null,
          empresa_nome: item.empresa_nome || null,
          cargo_id: item.cargo_id || null,
          cargo_nome: item.cargo_nome || null,
          tipo_calculo: item.tipo_calculo || 'PADRAO',
          descricao_comissao: item.descricao_comissao ? `${item.descricao_comissao} (Cópia)` : null,
          codigo_rubrica: item.codigo_rubrica || null,
          tipo_processo: item.tipo_processo || null,
          fonte_calculo_id: item.fonte_calculo_id || null,
          base_calculo_id: item.base_calculo_id || null,
          nivel_calculo: item.nivel_calculo,
          comissao_servicos: item.comissao_servicos,
          comissao_pecas: item.comissao_pecas,
          comissao_total: item.comissao_total,
          comissao_valor: item.comissao_valor,
          usa_faixa: item.usa_faixa || 'NÃO',
          comissao_todas_empresas: item.comissao_todas_empresas ?? false,
          detalhar_por_empresa: item.detalhar_por_empresa ?? false,
          vig_inicio: item.vig_inicio || null,
          vig_fim: item.vig_fim || null,
          ativo: item.ativo,
        })
      }
      await loadData()
    } catch (err) {
      alert('Erro ao duplicar política: ' + (err.message || String(err)))
    } finally {
      setDuplicandoId(null)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (salvando) return
    setSalvando(true)
    try {
      // Dedupe defensivo — cada cargo (que já carrega sua empresa) só pode entrar uma vez na
      // política, senão vira lançamento duplicado (mesmo cargo+empresa com 2 linhas idênticas).
      const { cargo_ids: cargoIdsForm, ...resto } = form
      const cargo_ids = [...new Set(cargoIdsForm)]
      const payloadBase = {
        ...resto,
        fonte_calculo_id: form.fonte_calculo_id || null,
        base_calculo_id: form.base_calculo_id || null,
        comissao_servicos: form.comissao_servicos !== '' ? parseFloat(form.comissao_servicos) : null,
        comissao_pecas: form.comissao_pecas !== '' ? parseFloat(form.comissao_pecas) : null,
        comissao_total: form.comissao_total !== '' ? parseFloat(form.comissao_total) : null,
        comissao_valor: form.comissao_valor !== '' ? parseFloat(form.comissao_valor) : null,
        vig_inicio: form.vig_inicio || null,
        vig_fim: form.vig_fim || null,
      }
      // Empresa/Agrupamento não vêm mais de um seletor do formulário — cada cargo já pertence a
      // uma empresa específica (dim_cargos.empresa_id), então herdam dali linha a linha.
      const montarLinha = (cargoId) => {
        const cargo = cargos.find(c => c.id === cargoId)
        const empresa = empresas.find(e => e.id === cargo?.empresa_id)
        return {
          ...payloadBase,
          cargo_id: cargoId,
          cargo_nome: cargo?.nome_cargo || null,
          empresa_id: cargo?.empresa_id || null,
          empresa_nome: empresa?.empresa_fantasia || empresa?.nome_empresa || null,
          agrupamento_empresa_id: empresa?.agrupamento_empresa_id || null,
          agrupamento_nome: empresa?.agrupamento_nome || null,
        }
      }

      if (editingId) {
        if (cargo_ids.length === 0) {
          // Rascunho: sem cargo marcado, mantém só 1 linha "vazia" (cargo_id null) representando
          // a política — ela some de Cálculo de Comissões e Cargos e Remunerações (que filtram
          // por cargo_id) até algum cargo ser marcado depois, mas continua visível na lista aqui.
          const idsOriginais = [...itensOriginais.values()]
          const linhaVazia = { ...montarLinha(null), grupo_politica_id: editingId }
          await apiService.updatePoliticaComissao(idsOriginais[0], linhaVazia)
          for (const rowId of idsOriginais.slice(1)) await apiService.deletePoliticaComissao(rowId)
        } else {
          const idsAtuais = new Set(cargo_ids)
          // Cargo marcado: atualiza a linha já existente, ou cria uma nova se acabou de entrar no grupo.
          for (const cargoId of cargo_ids) {
            const linha = { ...montarLinha(cargoId), grupo_politica_id: editingId }
            if (itensOriginais.has(cargoId)) {
              await apiService.updatePoliticaComissao(itensOriginais.get(cargoId), linha)
            } else {
              await apiService.createPoliticaComissao(linha)
            }
          }
          // Cargo que estava no grupo e foi desmarcado (ou era o placeholder do rascunho): sai
          // do grupo (linha excluída).
          for (const [cargoId, rowId] of itensOriginais) {
            if (!idsAtuais.has(cargoId)) await apiService.deletePoliticaComissao(rowId)
          }
        }
      } else if (cargo_ids.length === 0) {
        // Política nova salva como rascunho, sem nenhum cargo ainda.
        const grupoId = crypto.randomUUID()
        await apiService.createPoliticaComissao({ ...montarLinha(null), grupo_politica_id: grupoId })
      } else {
        // Um grupo novo, uma linha por cargo marcado — todas com o mesmo grupo_politica_id.
        const grupoId = crypto.randomUUID()
        for (const cargoId of cargo_ids) {
          await apiService.createPoliticaComissao({ ...montarLinha(cargoId), grupo_politica_id: grupoId })
        }
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar política: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      for (const item of itemVisualizado.itens) {
        await apiService.deletePoliticaComissao(item.id)
      }
      await loadData()
    } catch (err) {
      alert('Erro ao excluir política: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
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
    <div className="p-6 space-y-4 max-w-[1700px]">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Política de Comissões</h1>
          <p className="text-xs text-slate-500">Defina as regras e políticas de comissionamento por empresa, cargo e tipo de evento.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cargos-remuneracoes')}
            className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
          >
            <Briefcase className="h-4 w-4" />
            Cargos e Remunerações
          </button>
          {canEdit && (
            <button
              onClick={abrirIncluir}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Incluir Política
            </button>
          )}
        </div>
      </div>

      {/* FILTROS AVANÇADOS — retrátil */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltrosAbertos(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
        >
          {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-700">Filtros Avançados</span>
          {temFiltroColuna && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>
          )}
          {temFiltroColuna && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); limparFiltroColuna() }}
              className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors"
            >
              <X className="h-3 w-3" /> Limpar
            </span>
          )}
        </button>
        {filtrosAbertos && (
          <div className="px-4 pb-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
              <select value={colFiltro.empresa} onChange={e => setColFiltro(p => ({ ...p, empresa: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                <option value="">Todas</option>
                {empresasDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo</label>
              <select value={colFiltro.cargo} onChange={e => setColFiltro(p => ({ ...p, cargo: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                <option value="">Todos</option>
                {cargosDisponiveis.map(c => <option key={c} value={c}>{codigoPorNomeCargo(c) ? `${codigoPorNomeCargo(c)} — ${c}` : c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição da Comissão</label>
              <input type="text" placeholder="Filtrar..." value={colFiltro.descricao} onChange={e => setColFiltro(p => ({ ...p, descricao: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400" />
            </div>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1500px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 min-w-[280px]">
                <button onClick={() => alternarOrdenacao('descricao')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Descrição da Comissão {iconeOrdenacao('descricao')}
                </button>
              </th>
              <th className="p-3 min-w-[320px]">
                <button onClick={() => alternarOrdenacao('cargo')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Cargos {iconeOrdenacao('cargo')}
                </button>
              </th>
              <th className="p-3 min-w-[100px]">Rubrica</th>
              <th className="p-3 min-w-[110px]">Tipo de Processo</th>
              <th className="p-3 min-w-[110px] text-right">
                <button onClick={() => alternarOrdenacao('servicos')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                  {iconeOrdenacao('servicos')} % Serviços
                </button>
              </th>
              <th className="p-3 min-w-[100px] text-right">
                <button onClick={() => alternarOrdenacao('pecas')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                  {iconeOrdenacao('pecas')} % Peças
                </button>
              </th>
              <th className="p-3 min-w-[100px] text-right">
                <button onClick={() => alternarOrdenacao('total')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                  {iconeOrdenacao('total')} % Total
                </button>
              </th>
              <th className="p-3 min-w-[130px] text-right">
                <button onClick={() => alternarOrdenacao('valor')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                  {iconeOrdenacao('valor')} R$ Valor
                </button>
              </th>
              <th className="p-3 min-w-[110px]">
                <button onClick={() => alternarOrdenacao('vigencia')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Vigência {iconeOrdenacao('vigencia')}
                </button>
              </th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {gruposExibidos.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-6 text-center text-slate-400">
                  {grupos.length === 0 ? 'Nenhuma política de comissão cadastrada.' : 'Nenhuma política encontrada para os filtros aplicados.'}
                </td>
              </tr>
            ) : gruposExibidos.map((grupo) => (
              <tr key={grupo.grupoId} className="hover:bg-slate-50/70 transition-colors align-top">
                <td className="p-3 min-w-[280px] text-slate-600 whitespace-nowrap">{grupo.descricao_comissao || '-'}</td>
                <td className="p-3 min-w-[320px]">
                  <div className="flex flex-col gap-1">
                    {grupo.itens.map(i => (
                      <span key={i.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 whitespace-nowrap w-fit" title={i.empresa_nome || ''}>
                        {codigoDoCargo(i.cargo_id) && <span className="font-mono text-slate-400">{codigoDoCargo(i.cargo_id)} —</span>}
                        {i.cargo_nome || '-'}
                        {i.empresa_nome && <span className="font-normal text-slate-400">({i.empresa_nome})</span>}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 min-w-[100px] font-mono text-slate-600">
                  {grupo.codigo_rubrica ? (() => {
                    const desc = rubricas.find(r => r.codigo === grupo.codigo_rubrica)?.descricao
                    return (
                      <span className={`relative group ${desc ? 'cursor-help' : ''}`}>
                        {grupo.codigo_rubrica}
                        {desc && (
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-slate-800 text-white text-[11px] font-normal font-sans rounded-md p-2 shadow-xl z-30 leading-relaxed whitespace-normal">
                            {desc}
                          </span>
                        )}
                      </span>
                    )
                  })() : '-'}
                </td>
                <td className="p-3 min-w-[110px] font-mono text-slate-600">
                  {grupo.tipo_processo ? (() => {
                    const desc = tiposProcesso.find(t => t.codigo === grupo.tipo_processo)?.descricao
                    return (
                      <span className={`relative group ${desc ? 'cursor-help' : ''}`}>
                        {grupo.tipo_processo}
                        {desc && (
                          <span className="absolute left-0 top-full mt-1 hidden group-hover:block w-56 bg-slate-800 text-white text-[11px] font-normal font-sans rounded-md p-2 shadow-xl z-30 leading-relaxed whitespace-normal">
                            {desc}
                          </span>
                        )}
                      </span>
                    )
                  })() : '-'}
                </td>
                {grupo.tipo_calculo === 'PLANO_DMS' ? (
                  <td className="p-3 text-center" colSpan={4}>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">Plano DMS</span>
                  </td>
                ) : (
                  <>
                    <td className="p-3 min-w-[110px] text-right font-mono">{fmtPct(grupo.comissao_servicos)}</td>
                    <td className="p-3 min-w-[100px] text-right font-mono">{fmtPct(grupo.comissao_pecas)}</td>
                    <td className="p-3 min-w-[100px] text-right font-mono text-slate-900">{fmtPct(grupo.comissao_total)}</td>
                    <td className="p-3 min-w-[130px] text-right text-emerald-700">{fmtBRL(grupo.comissao_valor)}</td>
                  </>
                )}
                <td className="p-3 min-w-[110px] font-mono text-[11px] text-slate-600">
                  <div>{fmtDate(grupo.vig_inicio)}</div>
                  <div className="text-slate-400">{fmtDate(grupo.vig_fim)}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <PermissionActionButtons
                      menuPath="politica-comissao"
                      onView={() => abrirVisualizar(grupo)}
                      onEdit={() => abrirEditar(grupo)}
                      onDelete={() => abrirExcluir(grupo)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDuplicar(grupo)}
                        disabled={duplicandoId === grupo.grupoId}
                        title="Duplicar Política de Comissão"
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {duplicandoId === grupo.grupoId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[1000px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BadgePercent className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Política de Comissão' : 'Incluir Política de Comissão'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto custom-scrollbar">

                {/* Cargo(s) — empresa e agrupamento vêm do próprio cargo, um por linha */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Cargo(s) <span className="font-normal normal-case text-slate-400">(pode marcar mais de um — código, cargo e empresa aparecem na lista; deixe em branco pra salvar como rascunho, sem afetar Cálculo de Comissões)</span></label>
                  <CargoMultiSelect cargos={cargosComEmpresa} selecionados={form.cargo_ids} onToggle={toggleCargo} />
                  {form.cargo_ids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {form.cargo_ids.map(cargoId => {
                        const c = cargos.find(x => x.id === cargoId)
                        if (!c) return null
                        return (
                          <span key={cargoId} className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-800">
                            {c.codigo_cargo && <span className="font-mono text-blue-400">{c.codigo_cargo} —</span>}
                            {c.nome_cargo}
                            <span className="font-normal text-blue-400">({c.nome_empresa || 'sem empresa'})</span>
                            <button type="button" onClick={() => toggleCargo(cargoId)} className="p-0.5 rounded hover:bg-blue-200/60 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {cargosSemEmpresaCount > 0 && (
                    <p className="text-[11px] text-amber-600">
                      {cargosSemEmpresaCount} cargo(s) sem empresa vinculada não aparecem aqui — vincule a empresa em Cargos antes de usá-los numa política.
                    </p>
                  )}
                </div>

                {/* Tipo de Cálculo — Padrão usa Fonte/Base de Cálculo (comportamento de sempre);
                    Plano DMS calcula pelo motor bespoke de O.S. P04 x Chassi x Valor do Plano,
                    sem Fonte/Base configurados aqui. */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Tipo de Cálculo</label>
                  <div className="inline-flex rounded-md border border-slate-200 overflow-hidden w-fit">
                    {[{ v: 'PADRAO', l: 'Padrão' }, { v: 'PLANO_DMS', l: 'Plano DMS' }].map(op => (
                      <button
                        key={op.v}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, tipo_calculo: op.v }))}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                          form.tipo_calculo === op.v ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {op.l}
                      </button>
                    ))}
                  </div>
                  {form.tipo_calculo === 'PLANO_DMS' && (
                    <p className="text-[11px] text-slate-400">
                      O valor é calculado pelo cálculo de Plano DMS (O.S. P04 × Chassi × Valor do Plano), em Folha de Pagamento - DAF. Fonte/Base de Cálculo e percentuais não se aplicam aqui.
                    </p>
                  )}
                </div>

                {/* Descrição + Código da Rubrica + Tipo do Processo */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <label className={LBL}>Descrição da Comissão</label>
                    <input
                      type="text"
                      name="descricao_comissao"
                      value={form.descricao_comissao}
                      onChange={handleInputChange}
                      placeholder="Descreva a política de comissão"
                      className={INP}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Código da Rubrica
                      <span className="relative group cursor-help normal-case tracking-normal">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span className="absolute right-0 top-full mt-1 hidden group-hover:block w-72 bg-slate-800 text-white text-[11px] font-normal rounded-md p-3 shadow-xl z-30 leading-relaxed">
                          Código da rubrica no sistema Domínio — usado só na hora de gerar o TXT de importação de lançamentos em Processamento de Comissões (Processar p/ Pagamento). Sem selecionar, essa comissão fica de fora do TXT. Cadastre novos códigos em Regras de Comissões → Rubrica.
                        </span>
                      </span>
                    </label>
                    <select name="codigo_rubrica" value={form.codigo_rubrica} onChange={handleInputChange} className={SEL}>
                      <option value="">Selecione...</option>
                      {form.codigo_rubrica && !rubricas.some(r => r.codigo === form.codigo_rubrica) && (
                        <option value={form.codigo_rubrica}>{form.codigo_rubrica}</option>
                      )}
                      {rubricas.map(r => <option key={r.id} value={r.codigo}>{r.codigo}{r.descricao ? ` — ${r.descricao}` : ''}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Tipo do Processo
                      <span className="relative group cursor-help normal-case tracking-normal">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span className="absolute right-0 top-full mt-1 hidden group-hover:block w-72 bg-slate-800 text-white text-[11px] font-normal rounded-md p-3 shadow-xl z-30 leading-relaxed">
                          Código do "Tipo do Processo" no leiaute do Domínio (ex: 11 = Mensal) — vai junto no TXT de Processar p/ Pagamento. Sem selecionar, essa comissão fica de fora do TXT. Cadastre novos códigos em Regras de Comissões → Tipo de Processo.
                        </span>
                      </span>
                    </label>
                    <select name="tipo_processo" value={form.tipo_processo} onChange={handleInputChange} className={SEL}>
                      <option value="">Selecione...</option>
                      {form.tipo_processo && !tiposProcesso.some(t => t.codigo === form.tipo_processo) && (
                        <option value={form.tipo_processo}>{form.tipo_processo}</option>
                      )}
                      {tiposProcesso.map(t => <option key={t.id} value={t.codigo}>{t.codigo}{t.descricao ? ` — ${t.descricao}` : ''}</option>)}
                    </select>
                  </div>
                </div>

                {/* Fonte de Cálculo + Base de Cálculo + Nível de Cálculo — Fonte/Base só fazem
                    sentido no cálculo Padrão; Plano DMS não usa (valor vem do motor bespoke). */}
                <div className={`grid gap-4 ${form.tipo_calculo === 'PLANO_DMS' ? 'grid-cols-1' : 'grid-cols-3'}`}>
                  {form.tipo_calculo !== 'PLANO_DMS' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Fonte de Cálculo *</label>
                        <select required name="fonte_calculo_id" value={form.fonte_calculo_id} onChange={handleFonteChange} className={SEL}>
                          <option value="">Selecione</option>
                          {fontesCalculo.filter(f => f.ativo).map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Base de Cálculo *</label>
                        <select required name="base_calculo_id" value={form.base_calculo_id} onChange={handleInputChange} disabled={!form.fonte_calculo_id} className={`${SEL} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}>
                          <option value="">{form.fonte_calculo_id ? 'Selecione' : 'Selecione a Fonte primeiro'}</option>
                          {basesCalculo.filter(b => b.ativo && b.fonte_calculo_id === form.fonte_calculo_id).map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Nível de Cálculo *
                      <span className="relative group cursor-help normal-case tracking-normal">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        {/* Padrão fica na 3ª coluna (perto da borda direita do modal) — expande pra
                            esquerda. Plano DMS fica sozinho na 1ª coluna (perto da borda esquerda) —
                            com right-0 aqui, o tooltip estourava pra fora do modal, por baixo do
                            menu lateral. */}
                        <span className={`absolute top-full mt-1 hidden group-hover:block w-80 bg-slate-800 text-white text-[11px] font-normal rounded-md p-3 shadow-xl z-30 leading-relaxed space-y-1 ${form.tipo_calculo === 'PLANO_DMS' ? 'left-0' : 'right-0'}`}>
                          <span className="block"><strong>EMPRESA</strong> — soma o valor de TODAS as empresas do Agrupamento do funcionário (o grupo inteiro), sem separar por pessoa. Todos do cargo recebem sobre esse total.</span>
                          <span className="block mt-1.5"><strong>EQUIPE</strong> — soma o valor só da empresa onde o funcionário está registrado, sem separar por pessoa. Todos do cargo naquela empresa recebem sobre o mesmo total.</span>
                          <span className="block mt-1.5"><strong>INDIVIDUAL</strong> — soma só as linhas do PRÓPRIO funcionário (a Fonte de Cálculo precisa ter a "Coluna Funcionário" configurada). Cada um recebe sobre o que ele mesmo produziu.</span>
                          <span className="block mt-1.5 text-slate-300">Obs: com "Comissão sobre todas as empresas?" marcado, a soma passa a incluir TODAS as empresas cadastradas, ignorando o nível.</span>
                        </span>
                      </span>
                    </label>
                    <select required name="nivel_calculo" value={form.nivel_calculo} onChange={handleInputChange} className={SEL}>
                      <option value="">Selecione</option>
                      {NIVEIS_CALCULO.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {/* Percentuais + Valor — não se aplicam ao Plano DMS (valor vem do motor bespoke) */}
                {form.tipo_calculo !== 'PLANO_DMS' && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Serviços</label>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" max="100" name="comissao_servicos" value={form.comissao_servicos} onChange={handleInputChange} onBlur={() => formatarDuasCasas('comissao_servicos')} placeholder="0.00" className={`${INP} pr-6`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Peças</label>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" max="100" name="comissao_pecas" value={form.comissao_pecas} onChange={handleInputChange} onBlur={() => formatarDuasCasas('comissao_pecas')} placeholder="0.00" className={`${INP} pr-6`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Total</label>
                    <div className="relative">
                      <input type="number" step="0.01" min="0" max="100" name="comissao_total" value={form.comissao_total} onChange={handleInputChange} onBlur={() => formatarDuasCasas('comissao_total')} placeholder="0.00" className={`${INP} pr-6`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL} title="Valor por unidade apurada — a comissão é Valor × R$ Valor (ex: R$ 0,60 por hora vendida)">R$ Valor (por unidade)</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">R$</span>
                      <input
                        type="number" step="0.01" min="0" name="comissao_valor"
                        value={form.comissao_valor} onChange={handleInputChange}
                        onBlur={() => formatarDuasCasas('comissao_valor')}
                        placeholder="0,00" className={`${INP} pl-8`}
                      />
                    </div>
                  </div>
                </div>
                )}

                {/* Usa Faixa + Vigência */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Usa Faixa *</label>
                    <select required name="usa_faixa" value={form.usa_faixa} onChange={handleInputChange} className={SEL}>
                      {USA_FAIXA_OPCOES.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Início</label>
                    <input type="date" name="vig_inicio" value={form.vig_inicio} onChange={handleInputChange} className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Fim</label>
                    <input type="date" name="vig_fim" value={form.vig_fim} onChange={handleInputChange} className={INP} />
                  </div>
                </div>

                {/* Comissão sobre todas as empresas */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="comissao_todas_empresas" checked={form.comissao_todas_empresas} onChange={handleInputChange} className="w-4 h-4" />
                    Comissão sobre todas as empresas?
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Muda só QUAIS empresas entram na soma: TODAS as empresas cadastradas, em vez da empresa do funcionário (Individual/Equipe) ou do Agrupamento dele (Empresa).
                    O nível continua decidindo DE QUEM são as linhas somadas — Individual + este checkbox = as vendas daquele funcionário específico em todas as lojas.
                  </p>
                </div>

                {/* Detalhar valor por empresa (só faz sentido no Nível EMPRESA, que soma várias empresas num total só) */}
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" name="detalhar_por_empresa" checked={form.detalhar_por_empresa} onChange={handleInputChange} className="w-4 h-4" />
                    Detalhar valor por empresa no cálculo?
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Só tem efeito com Nível de Cálculo = EMPRESA (que soma várias empresas num total único). Se marcado, em Cálculo de Comissões aparece, abaixo da Descrição da Comissão, uma linha por empresa com a Base e a Comissão daquela empresa — pra auditar de onde veio o total.
                  </p>
                </div>

                {/* Ativo */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleInputChange} className="w-4 h-4" />
                  Ativo
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors">
                  {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[600px] max-h-[90vh] shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Política de Comissão
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4 overflow-y-auto">
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargos ({itemVisualizado.itens.length})</span>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {itemVisualizado.itens.map(i => (
                    <span key={i.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
                      {codigoDoCargo(i.cargo_id) && <span className="font-mono text-slate-400">{codigoDoCargo(i.cargo_id)} —</span>}
                      {i.cargo_nome || '-'}
                      <span className="font-normal text-slate-400">({i.empresa_nome || 'sem empresa'})</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao_comissao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código da Rubrica</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.codigo_rubrica || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo do Processo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.tipo_processo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fonte de Cálculo</span>
                <span className="text-xs font-bold text-blue-700">{itemVisualizado.fonte_calculo?.nome || itemVisualizado.tipo_evento_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Base de Cálculo</span>
                <span className="text-xs font-bold text-purple-700">{itemVisualizado.base_calculo?.nome || itemVisualizado.base_tipo_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nível de Cálculo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nivel_calculo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usa Faixa</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.usa_faixa === 'SIM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.usa_faixa || 'NÃO'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">% Serviços</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{fmtPct(itemVisualizado.comissao_servicos)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">% Peças</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{fmtPct(itemVisualizado.comissao_pecas)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">% Total</span>
                <span className="text-xs font-mono font-bold text-slate-900">{fmtPct(itemVisualizado.comissao_total)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">R$ Valor</span>
                <span className="text-xs font-mono font-bold text-emerald-700">{fmtBRL(itemVisualizado.comissao_valor)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vigência Início</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{fmtDate(itemVisualizado.vig_inicio)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Vigência Fim</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{fmtDate(itemVisualizado.vig_fim)}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comissão Todas Empresas</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.comissao_todas_empresas ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.comissao_todas_empresas ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Detalhar por Empresa</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.detalhar_por_empresa ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.detalhar_por_empresa ? 'SIM' : 'NÃO'}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100 shrink-0">
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a remoção da política <strong className="text-slate-800">"{itemVisualizado.descricao_comissao || 'sem descrição'}"</strong> ({itemVisualizado.itens.length} cargo(s))? Esta ação não pode ser desfeita.
                </p>
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
