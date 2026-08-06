import React, { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, BadgePercent, Eye, ArrowUp, ArrowDown, ArrowUpDown, SlidersHorizontal, ChevronDown, ChevronRight, Copy, Loader2, Info, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import { buscaComCoringa } from '../utils/buscaTexto'

const NIVEIS_CALCULO = ['EMPRESA', 'EQUIPE', 'INDIVIDUAL']
const USA_FAIXA_OPCOES = ['NÃO', 'SIM']

const FORM_VAZIO = {
  agrupamento_empresa_id: '',
  agrupamento_nome: '',
  empresa_id: '',
  empresa_nome: '',
  cargo_id: '',
  cargo_nome: '',
  descricao_comissao: '',
  codigo_rubrica: '',
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

export default function PoliticaComissao() {
  const [dados, setDados] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [cargos, setCargos] = useState([])
  const [fontesCalculo, setFontesCalculo] = useState([])
  const [basesCalculo, setBasesCalculo] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [duplicandoId, setDuplicandoId] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('polcom_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('polcom_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('polcom_form', FORM_VAZIO)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('politica-comissao', 'editar')
  const canDelete = hasPermission('politica-comissao', 'excluir')
  const location = useLocation()
  const navigate = useNavigate()

  // Filtro de texto por coluna + ordenação A-Z/Z-A clicando no cabeçalho.
  const [colFiltro, setColFiltro] = useState({ agrupamento: '', cargo: '', descricao: '' })
  const temFiltroColuna = Object.values(colFiltro).some(Boolean)
  const [filtrosAbertos, setFiltrosAbertos] = useSessionState('polcom_filtros_abertos', false)
  const limparFiltroColuna = () => setColFiltro({ agrupamento: '', cargo: '', descricao: '' })
  const [ordenacao, setOrdenacao] = useState({ coluna: 'cargo', direcao: 'asc' })
  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  const textoAgrupamento = (item) => item.agrupamento_nome || ''
  const textoCargo = (item) => item.cargo_nome || ''
  const textoDescricao = (item) => item.descricao_comissao || ''
  const numeroServicos = (item) => item.comissao_servicos != null ? parseFloat(item.comissao_servicos) : null
  const numeroPecas = (item) => item.comissao_pecas != null ? parseFloat(item.comissao_pecas) : null
  const numeroTotal = (item) => item.comissao_total != null ? parseFloat(item.comissao_total) : null
  const numeroValor = (item) => item.comissao_valor != null ? parseFloat(item.comissao_valor) : null

  // Opções dos seletores = só o que realmente aparece na tabela principal (não todo o
  // cadastro de Agrupamentos/Cargos, que pode ter itens sem nenhuma política ainda).
  const agrupamentosDisponiveis = useMemo(() =>
    [...new Set(dados.map(textoAgrupamento).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [dados])
  const cargosDisponiveis = useMemo(() =>
    [...new Set(dados.map(textoCargo).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [dados])

  const dadosExibidos = useMemo(() => {
    const filtrados = dados.filter(item => {
      if (colFiltro.agrupamento && textoAgrupamento(item) !== colFiltro.agrupamento) return false
      if (colFiltro.cargo && textoCargo(item) !== colFiltro.cargo) return false
      if (colFiltro.descricao && !buscaComCoringa(textoDescricao(item), colFiltro.descricao)) return false
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
      agrupamento: (a, b) => dir * textoAgrupamento(a).localeCompare(textoAgrupamento(b), 'pt-BR'),
      cargo: (a, b) => dir * textoCargo(a).localeCompare(textoCargo(b), 'pt-BR'),
      descricao: (a, b) => dir * textoDescricao(a).localeCompare(textoDescricao(b), 'pt-BR'),
      servicos: comparadorNumerico(numeroServicos),
      pecas: comparadorNumerico(numeroPecas),
      total: comparadorNumerico(numeroTotal),
      valor: comparadorNumerico(numeroValor),
      vigencia: (a, b) => dir * (a.vig_inicio || '').localeCompare(b.vig_inicio || ''),
    }
    return [...filtrados].sort(comparadores[ordenacao.coluna] || (() => 0))
  }, [dados, colFiltro, ordenacao])

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [politicas, agrup, emps, carg, fontes, bases] = await Promise.all([
        apiService.getPoliticaComissao(),
        apiService.getAgrupamentoEmpresas(),
        apiService.getEmpresas(),
        apiService.getCargos(),
        apiService.getFontesCalculo(),
        apiService.getBasesCalculo(),
      ])
      setDados(politicas)
      setAgrupamentos(agrup)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || '', 'pt-BR')))
      setCargos([...carg].sort((a, b) => (a.nome_cargo || '').localeCompare(b.nome_cargo || '', 'pt-BR')))
      setFontesCalculo([...fontes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')))
      setBasesCalculo([...bases].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')))
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

  const handleAgrupamentoChange = (e) => {
    const ag = agrupamentos.find(x => x.id === e.target.value)
    setForm(prev => ({ ...prev, agrupamento_empresa_id: e.target.value, agrupamento_nome: ag?.nome_agrupamento || '' }))
  }

  const handleEmpresaChange = (e) => {
    const emp = empresas.find(x => x.id === e.target.value)
    setForm(prev => ({ ...prev, empresa_id: e.target.value, empresa_nome: emp?.empresa_fantasia || '' }))
  }

  const handleCargoChange = (e) => {
    const cargo = cargos.find(x => x.id === e.target.value)
    setForm(prev => ({ ...prev, cargo_id: e.target.value, cargo_nome: cargo?.nome_cargo || '' }))
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
    setForm({ ...FORM_VAZIO })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({
      agrupamento_empresa_id: item.agrupamento_empresa_id || '',
      agrupamento_nome: item.agrupamento_nome || '',
      empresa_id: item.empresa_id || '',
      empresa_nome: item.empresa_nome || '',
      cargo_id: item.cargo_id || '',
      cargo_nome: item.cargo_nome || '',
      descricao_comissao: item.descricao_comissao || '',
      codigo_rubrica: item.codigo_rubrica || '',
      fonte_calculo_id: item.fonte_calculo_id || '',
      base_calculo_id: item.base_calculo_id || '',
      nivel_calculo: item.nivel_calculo || '',
      comissao_servicos: item.comissao_servicos ?? '',
      comissao_pecas: item.comissao_pecas ?? '',
      comissao_total: item.comissao_total ?? '',
      comissao_valor: item.comissao_valor ?? '',
      usa_faixa: item.usa_faixa || 'NÃO',
      comissao_todas_empresas: item.comissao_todas_empresas ?? false,
      detalhar_por_empresa: item.detalhar_por_empresa ?? false,
      vig_inicio: item.vig_inicio || '',
      vig_fim: item.vig_fim || '',
      ativo: item.ativo ?? true,
    })
    setModalAberto(true)
  }

  // Veio de outra tela (Cargos e Remunerações, clicando num cargo/linha) pedindo pra abrir
  // direto a edição de uma política específica — consome o state da navegação uma única vez,
  // senão reabriria o modal a cada re-render.
  useEffect(() => {
    const idParaEditar = location.state?.editarPoliticaId
    if (!idParaEditar || dados.length === 0) return
    const item = dados.find(p => p.id === idParaEditar)
    if (item) abrirEditar(item)
    navigate(location.pathname, { replace: true, state: {} })
  }, [dados, location.state])

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setItemVisualizado(item)
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => {
    setItemVisualizado(item)
    setModalVisualizarAberto(true)
  }

  const handleDuplicar = async (item) => {
    setDuplicandoId(item.id)
    try {
      await apiService.createPoliticaComissao({
        agrupamento_empresa_id: item.agrupamento_empresa_id || null,
        agrupamento_nome: item.agrupamento_nome || null,
        empresa_id: item.empresa_id || null,
        empresa_nome: item.empresa_nome || null,
        cargo_id: item.cargo_id || null,
        cargo_nome: item.cargo_nome || null,
        descricao_comissao: item.descricao_comissao ? `${item.descricao_comissao} (Cópia)` : null,
        codigo_rubrica: item.codigo_rubrica || null,
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
      await loadData()
    } catch (err) {
      alert('Erro ao duplicar política: ' + (err.message || String(err)))
    } finally {
      setDuplicandoId(null)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        agrupamento_empresa_id: form.agrupamento_empresa_id || null,
        empresa_id: form.empresa_id || null,
        cargo_id: form.cargo_id || null,
        fonte_calculo_id: form.fonte_calculo_id || null,
        base_calculo_id: form.base_calculo_id || null,
        comissao_servicos: form.comissao_servicos !== '' ? parseFloat(form.comissao_servicos) : null,
        comissao_pecas: form.comissao_pecas !== '' ? parseFloat(form.comissao_pecas) : null,
        comissao_total: form.comissao_total !== '' ? parseFloat(form.comissao_total) : null,
        comissao_valor: form.comissao_valor !== '' ? parseFloat(form.comissao_valor) : null,
        vig_inicio: form.vig_inicio || null,
        vig_fim: form.vig_fim || null,
      }
      if (editingId) {
        await apiService.updatePoliticaComissao(editingId, payload)
      } else {
        await apiService.createPoliticaComissao(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar política: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deletePoliticaComissao(idExcluir)
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
              <label className="text-[10px] font-bold text-slate-400 uppercase">Agrupamento Empresa</label>
              <select value={colFiltro.agrupamento} onChange={e => setColFiltro(p => ({ ...p, agrupamento: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                <option value="">Todos</option>
                {agrupamentosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo</label>
              <select value={colFiltro.cargo} onChange={e => setColFiltro(p => ({ ...p, cargo: e.target.value }))}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-400">
                <option value="">Todos</option>
                {cargosDisponiveis.map(c => <option key={c} value={c}>{c}</option>)}
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
              <th className="p-3 min-w-[200px]">
                <button onClick={() => alternarOrdenacao('agrupamento')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Agrupamento Empresa {iconeOrdenacao('agrupamento')}
                </button>
              </th>
              <th className="p-3 min-w-[180px]">
                <button onClick={() => alternarOrdenacao('cargo')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Cargo {iconeOrdenacao('cargo')}
                </button>
              </th>
              <th className="p-3 min-w-[280px]">
                <button onClick={() => alternarOrdenacao('descricao')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Descrição da Comissão {iconeOrdenacao('descricao')}
                </button>
              </th>
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
            {dadosExibidos.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-6 text-center text-slate-400">
                  {dados.length === 0 ? 'Nenhuma política de comissão cadastrada.' : 'Nenhuma política encontrada para os filtros aplicados.'}
                </td>
              </tr>
            ) : dadosExibidos.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 min-w-[200px] font-semibold text-slate-900">{item.agrupamento_nome || '-'}</td>
                <td className="p-3 min-w-[180px] text-slate-700">{item.cargo_nome || '-'}</td>
                <td className="p-3 min-w-[280px] text-slate-600">{item.descricao_comissao || '-'}</td>
                <td className="p-3 min-w-[110px] text-right font-mono">{fmtPct(item.comissao_servicos)}</td>
                <td className="p-3 min-w-[100px] text-right font-mono">{fmtPct(item.comissao_pecas)}</td>
                <td className="p-3 min-w-[100px] text-right font-mono font-bold text-slate-900">{fmtPct(item.comissao_total)}</td>
                <td className="p-3 min-w-[130px] text-right font-mono font-bold text-emerald-700">{fmtBRL(item.comissao_valor)}</td>
                <td className="p-3 min-w-[110px] font-mono text-[11px] text-slate-600">
                  <div>{fmtDate(item.vig_inicio)}</div>
                  <div className="text-slate-400">{fmtDate(item.vig_fim)}</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <PermissionActionButtons
                      menuPath="politica-comissao"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleDuplicar(item)}
                        disabled={duplicandoId === item.id}
                        title="Duplicar Política de Comissão"
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

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[720px] shadow-xl overflow-hidden">
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

                {/* Agrupamento + Cargo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Agrupamento de Empresas *</label>
                    <select required name="agrupamento_empresa_id" value={form.agrupamento_empresa_id} onChange={handleAgrupamentoChange} className={SEL}>
                      <option value="">Selecione o agrupamento</option>
                      {agrupamentos.map(a => <option key={a.id} value={a.id}>{a.nome_agrupamento}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Cargo *</label>
                    <select required name="cargo_id" value={form.cargo_id} onChange={handleCargoChange} className={SEL}>
                      <option value="">Selecione o cargo</option>
                      {cargos.map(c => <option key={c.id} value={c.id}>{c.nome_cargo}</option>)}
                    </select>
                  </div>
                </div>

                {/* Descrição + Código da Rubrica */}
                <div className="grid grid-cols-3 gap-4">
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
                          Código da rubrica no sistema de folha (RM/TOTVS) — usado só na hora de gerar o TXT de importação de lançamentos em Histórico de Comissões (Processar p/ Pagamento). Sem preencher, essa comissão fica de fora do TXT.
                        </span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="codigo_rubrica"
                      value={form.codigo_rubrica}
                      onChange={handleInputChange}
                      placeholder="Ex: 8111"
                      className={INP}
                    />
                  </div>
                </div>

                {/* Fonte de Cálculo + Base de Cálculo + Nível de Cálculo */}
                <div className="grid grid-cols-3 gap-4">
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
                  <div className="flex flex-col gap-1.5">
                    <label className={`${LBL} flex items-center gap-1`}>
                      Nível de Cálculo *
                      <span className="relative group cursor-help normal-case tracking-normal">
                        <Info className="h-3.5 w-3.5 text-blue-500" />
                        <span className="absolute right-0 top-full mt-1 hidden group-hover:block w-80 bg-slate-800 text-white text-[11px] font-normal rounded-md p-3 shadow-xl z-30 leading-relaxed space-y-1">
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

                {/* Percentuais + Valor */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Serviços</label>
                    <div className="relative">
                      <input type="number" step="0.0001" min="0" max="100" name="comissao_servicos" value={form.comissao_servicos} onChange={handleInputChange} placeholder="0.00" className={`${INP} pr-6`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Peças</label>
                    <div className="relative">
                      <input type="number" step="0.0001" min="0" max="100" name="comissao_pecas" value={form.comissao_pecas} onChange={handleInputChange} placeholder="0.00" className={`${INP} pr-6`} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">%</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>% Total</label>
                    <div className="relative">
                      <input type="number" step="0.0001" min="0" max="100" name="comissao_total" value={form.comissao_total} onChange={handleInputChange} placeholder="0.00" className={`${INP} pr-6`} />
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
                        onBlur={() => setForm(prev => prev.comissao_valor !== '' && !Number.isNaN(parseFloat(prev.comissao_valor))
                          ? { ...prev, comissao_valor: parseFloat(prev.comissao_valor).toFixed(2) }
                          : prev)}
                        placeholder="0,00" className={`${INP} pl-8`}
                      />
                    </div>
                  </div>
                </div>

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
                    Só tem efeito com Nível de Cálculo = EMPRESA (que soma várias empresas num total único). Se marcado, em Cálculo de Comissões DAF aparece, abaixo da Descrição da Comissão, uma linha por empresa com a Base e a Comissão daquela empresa — pra auditar de onde veio o total.
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
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[600px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Política de Comissão
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento Corporativo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome Fantasia</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.empresa_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.cargo_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao_comissao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código da Rubrica</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.codigo_rubrica || '-'}</span>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a remoção da política de <strong className="text-slate-800">"{itemVisualizado.empresa_nome} — {itemVisualizado.cargo_nome}"</strong>? Esta ação não pode ser desfeita.
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
