import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Briefcase, CheckSquare, Square, Eye, ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import ImportarCargosModal from './ImportarCargosModal'

// Nome do cargo é sempre gravado em maiúsculas — padronizado em todo o sistema
// (telas, relatórios, PDFs), então normaliza aqui na origem em vez de em cada lugar que exibe.
const toUpperCargo = (str) => str.trim().replace(/\s+/g, ' ').toUpperCase()
const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
const FILTROS_VAZIOS = { codigo: '', cargo: '', tipoContratacao: [], agrupamento: [], empresa: [], departamentos: [], setores: [], area: [], nivel: [] }

// Dropdown compacto (fechado por padrão) com checkbox por opção — mesmo padrão usado nos
// filtros de coluna de Funcionários/Cálculo de Comissões, pra selecionar vários valores de vez.
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
        className="w-full flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] border border-slate-200 rounded bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors"
      >
        <span className={`truncate ${selecionados.length === 0 ? 'text-slate-300' : 'text-slate-700 font-semibold'}`}>{textoBotao}</span>
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

export default function Cargos() {
  const location = useLocation()
  const navigate = useNavigate()
  const [agrupamentos, setAgrupamentos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('cgo_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('cgo_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('cgo_editid', null)
  const [form, setForm] = useSessionState('cgo_form', { nome_cargo: '', tipo_contratacao: 'CLT', codigo_cargo_clt: '', codigo_cargo_pj: '', agrupamento_id: '', empresa_id: '', departamento_ids: [], setor_ids: [], nivel_cargo: '' })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [erroModal, setErroModal] = useState(null)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS)
  const [sortCol, setSortCol] = useState('nome_cargo')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const setFiltro = (key, val) => setFiltros(prev => ({ ...prev, [key]: val }))
  const limparFiltros = () => setFiltros(FILTROS_VAZIOS)
  const temFiltro = Object.values(filtros).some(v => v.length > 0)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('cargos', 'editar')
  const canDelete = hasPermission('cargos', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cargosData, agrupamentosData, departamentosData, setoresData, empresasData] = await Promise.all([
        apiService.getCargos(),
        apiService.getAgrupamentoCargos(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getEmpresas(),
      ])
      setDados(cargosData)
      setAgrupamentos(agrupamentosData)
      setDepartamentos(departamentosData)
      setSetores(setoresData)
      setEmpresas(empresasData.filter(e => e.ativo !== false))
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const toggleDepartamento = (id) => {
    setForm(prev => ({
      ...prev,
      departamento_ids: prev.departamento_ids.includes(id)
        ? prev.departamento_ids.filter(d => d !== id)
        : [...prev.departamento_ids, id]
    }))
  }

  const toggleSetor = (id) => {
    setForm(prev => ({
      ...prev,
      setor_ids: prev.setor_ids.includes(id)
        ? prev.setor_ids.filter(s => s !== id)
        : [...prev.setor_ids, id]
    }))
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setForm({ nome_cargo: '', tipo_contratacao: 'CLT', codigo_cargo_clt: '', codigo_cargo_pj: '', agrupamento_id: agrupamentos[0]?.id || '', empresa_id: '', departamento_ids: [], setor_ids: [], nivel_cargo: '' })
    setErroModal(null)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setForm({
      nome_cargo: item.nome_cargo,
      tipo_contratacao: item.tipo_contratacao || 'CLT',
      codigo_cargo_clt: item.codigo_cargo_clt || (item.tipo_contratacao !== 'PJ' ? item.codigo_cargo : '') || '',
      codigo_cargo_pj: item.codigo_cargo_pj || (item.tipo_contratacao === 'PJ' ? item.codigo_cargo : '') || '',
      agrupamento_id: item.agrupamento_id,
      empresa_id: item.empresa_id || '',
      departamento_ids: item.departamento_ids || [],
      setor_ids: item.setor_ids || [],
      nivel_cargo: item.nivel_cargo || ''
    })
    setModalAberto(true)
  }

  // Veio de outra tela (ex: Organograma, clicando no lápis de editar) pedindo pra abrir direto
  // a edição de um cargo específico — consome o state da navegação uma única vez.
  useEffect(() => {
    const idParaEditar = location.state?.editarId
    if (!idParaEditar || dados.length === 0) return
    const item = dados.find(c => c.id === idParaEditar)
    if (item) abrirEditar(item)
    navigate(location.pathname, { replace: true, state: {} })
  }, [dados, location.state])

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setForm(prev => ({ ...prev, nome_cargo: item.nome_cargo }))
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    try {
      const codigoEfetivo = form.tipo_contratacao === 'PJ' ? form.codigo_cargo_pj : form.codigo_cargo_clt
      const payload = { ...form, nome_cargo: toUpperCargo(form.nome_cargo), codigo_cargo: codigoEfetivo, ativo: true }
      if (modo === 'incluir') {
        await apiService.createCargo(payload)
      } else {
        await apiService.updateCargo(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        const codigoEfetivo = form.tipo_contratacao === 'PJ' ? form.codigo_cargo_pj : form.codigo_cargo_clt
        setErroModal(`Já existe um cargo com o código "${codigoEfetivo}" para a empresa selecionada.`)
      } else {
        setErroModal('Erro ao salvar cargo: ' + msg)
      }
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteCargo(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir cargo', err)
      alert('Erro ao excluir cargo: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const renderNomes = (ids, lista, campo) => {
    if (!Array.isArray(ids) || ids.length === 0) return '-'
    return ids.map(id => lista.find(i => i.id === id)?.[campo]).filter(Boolean).join(', ')
  }

  const getAreas = (item) =>
    [...new Set((item.departamento_ids || []).map(id => departamentos.find(d => d.id === id)?.area).filter(Boolean))]

  const getArea = (item) => getAreas(item).join(', ')

  const areaCls = (() => {
    const paleta = [
      'bg-blue-50 text-blue-700 border-blue-200',
      'bg-purple-50 text-purple-700 border-purple-200',
      'bg-emerald-50 text-emerald-700 border-emerald-200',
      'bg-amber-50 text-amber-700 border-amber-200',
      'bg-rose-50 text-rose-700 border-rose-200',
      'bg-cyan-50 text-cyan-700 border-cyan-200',
      'bg-orange-50 text-orange-700 border-orange-200',
      'bg-indigo-50 text-indigo-700 border-indigo-200',
      'bg-teal-50 text-teal-700 border-teal-200',
      'bg-pink-50 text-pink-700 border-pink-200',
    ]
    const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0)
    return (area) => paleta[hash(area) % paleta.length]
  })()

  const getDeptNomes = (item) => (item.departamento_ids || []).map(id => departamentos.find(d => d.id === id)?.nome_departamento).filter(Boolean)
  const getSetorNomes = (item) => (item.setor_ids || []).map(id => setores.find(s => s.id === id)?.nome_setor).filter(Boolean)

  // Padrão "Sem X" — cada coluna filtrável ganha uma opção pra achar os registros sem
  // informação preenchida, em vez de eles simplesmente desaparecerem do seletor de filtro.
  const SEM_AGRUPAMENTO = 'Sem agrupamento'
  const SEM_EMPRESA = 'Sem empresa'
  const SEM_AREA = 'Sem área'
  const SEM_DEPARTAMENTO = 'Sem departamento'
  const SEM_SETOR = 'Sem setor'
  const SEM_NIVEL = 'Sem nível'
  const getAgrupamentoLabel = (item) => item.nome_agrupamento_cargo || SEM_AGRUPAMENTO
  const getEmpresaLabel = (item) => item.nome_empresa || SEM_EMPRESA
  const getNivelLabel = (item) => item.nivel_cargo || SEM_NIVEL
  const getAreaLabels = (item) => { const n = getAreas(item); return n.length > 0 ? n : [SEM_AREA] }
  const getDeptLabels = (item) => { const n = getDeptNomes(item); return n.length > 0 ? n : [SEM_DEPARTAMENTO] }
  const getSetorLabels = (item) => { const n = getSetorNomes(item); return n.length > 0 ? n : [SEM_SETOR] }

  const comSemOpcao = (nomes, semLabel, temAlgumVazio) =>
    temAlgumVazio ? [semLabel, ...juntaUnicos(nomes)] : juntaUnicos(nomes)

  // Filtros dinâmicos (facetados): as opções de cada seletor são calculadas aplicando todos os
  // OUTROS filtros ativos, menos o dele mesmo — mesmo padrão do Cálculo de Comissões/Cargos e Remunerações.
  const bateTexto = (q, val) => !q || (val || '').toLowerCase().includes(q.toLowerCase())
  const bate = (selecionados, val) => selecionados.length === 0 || selecionados.includes(val)
  const bateAlgum = (selecionados, valores) => selecionados.length === 0 || selecionados.some(v => valores.includes(v))

  const filtrarComExcecao = useMemo(() => (ignorar) => dados.filter(item =>
    (ignorar === 'codigo' || bateTexto(filtros.codigo, item.codigo_cargo)) &&
    (ignorar === 'cargo' || bateTexto(filtros.cargo, item.nome_cargo)) &&
    (ignorar === 'agrupamento' || bate(filtros.agrupamento, getAgrupamentoLabel(item))) &&
    (ignorar === 'empresa' || bate(filtros.empresa, getEmpresaLabel(item))) &&
    (ignorar === 'departamentos' || bateAlgum(filtros.departamentos, getDeptLabels(item))) &&
    (ignorar === 'setores' || bateAlgum(filtros.setores, getSetorLabels(item))) &&
    (ignorar === 'area' || bateAlgum(filtros.area, getAreaLabels(item))) &&
    (ignorar === 'nivel' || bate(filtros.nivel, getNivelLabel(item))) &&
    (ignorar === 'tipoContratacao' || bate(filtros.tipoContratacao, item.tipo_contratacao || 'CLT'))
  ), [dados, filtros, departamentos, setores])

  const agrupamentosUnicos = useMemo(() => {
    const base = filtrarComExcecao('agrupamento')
    return comSemOpcao(base.map(c => c.nome_agrupamento_cargo), SEM_AGRUPAMENTO, base.some(c => !c.nome_agrupamento_cargo))
  }, [filtrarComExcecao])
  const empresasUnicasFiltro = useMemo(() => {
    const base = filtrarComExcecao('empresa')
    return comSemOpcao(base.map(c => c.nome_empresa), SEM_EMPRESA, base.some(c => !c.nome_empresa))
  }, [filtrarComExcecao])
  const areasUnicas = useMemo(() => {
    const base = filtrarComExcecao('area')
    return comSemOpcao(base.flatMap(c => getAreas(c)), SEM_AREA, base.some(c => getAreas(c).length === 0))
  }, [filtrarComExcecao])
  const departamentosUnicos = useMemo(() => {
    const base = filtrarComExcecao('departamentos')
    return comSemOpcao(base.flatMap(c => getDeptNomes(c)), SEM_DEPARTAMENTO, base.some(c => getDeptNomes(c).length === 0))
  }, [filtrarComExcecao])
  const setoresUnicos = useMemo(() => {
    const base = filtrarComExcecao('setores')
    return comSemOpcao(base.flatMap(c => getSetorNomes(c)), SEM_SETOR, base.some(c => getSetorNomes(c).length === 0))
  }, [filtrarComExcecao])
  const niveisUnicos = useMemo(() => {
    const base = filtrarComExcecao('nivel')
    return comSemOpcao(base.map(c => c.nivel_cargo), SEM_NIVEL, base.some(c => !c.nivel_cargo))
  }, [filtrarComExcecao])
  const tiposContratacaoUnicos = useMemo(() =>
    juntaUnicos(filtrarComExcecao('tipoContratacao').map(c => c.tipo_contratacao || 'CLT')),
    [filtrarComExcecao])

  const dadosFiltrados = useMemo(() => {
    let result = filtrarComExcecao(null)
    const getVal = (item) => {
      if (sortCol === 'nome_cargo') return item.nome_cargo || ''
      if (sortCol === 'tipoContratacao') return item.tipo_contratacao || 'CLT'
      if (sortCol === 'agrupamento') return item.nome_agrupamento_cargo || ''
      if (sortCol === 'empresa') return item.nome_empresa || ''
      if (sortCol === 'departamentos') return renderNomes(item.departamento_ids, departamentos, 'nome_departamento')
      if (sortCol === 'setores') return renderNomes(item.setor_ids, setores, 'nome_setor')
      if (sortCol === 'area') return getArea(item)
      return ''
    }
    return [...result].sort((a, b) => {
      const cmp = getVal(a).localeCompare(getVal(b), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtrarComExcecao, sortCol, sortDir, departamentos, setores])

  const CheckList = ({ itens, campo, subcampo, selecionados, onToggle }) => {
    // Selecionados sobem pro topo — facilita ver de cara o que já está marcado numa lista longa.
    const ordenados = [...itens].sort((a, b) =>
      (selecionados.includes(b.id) ? 1 : 0) - (selecionados.includes(a.id) ? 1 : 0)
    )
    return (
    <div className="max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 space-y-1 custom-scrollbar">
      {ordenados.length === 0 ? (
        <p className="text-xs text-slate-400 p-1">Nenhum registro.</p>
      ) : ordenados.map(item => {
        const sel = selecionados.includes(item.id)
        return (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs font-semibold select-none transition-colors ${
              sel ? 'bg-blue-50/60 text-blue-900 border border-blue-200/50' : 'text-slate-700 hover:bg-slate-100 border border-transparent'
            }`}
          >
            {sel
              ? <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              : <Square className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            }
            <span>
              {item[campo]}
              {subcampo && item[subcampo] && (
                <span className="ml-1 text-[10px] font-normal italic text-slate-400">({item[subcampo]})</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
    )
  }

  const SortIcon = ({ col }) => sortCol !== col
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cargos</h1>
          <p className="text-xs text-slate-500">Gerencie os cargos vinculados a agrupamentos, departamentos e setores.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModalImportarAberto(true)}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Importar Excel
            </button>
            <button
              onClick={abrirIncluir}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Incluir Cargo
            </button>
          </div>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
        {temFiltro && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-b border-blue-100">
            <span className="text-[11px] text-blue-700 font-semibold">{dadosFiltrados.length} resultado(s) encontrado(s)</span>
            <button onClick={limparFiltros} className="ml-auto flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold">
              <X className="h-3 w-3" /> Limpar filtros
            </button>
          </div>
        )}
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-28">Código</th>
              <th className="p-3 w-24">
                <button onClick={() => toggleSort('tipoContratacao')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  CLT/PJ <SortIcon col="tipoContratacao" />
                </button>
              </th>
              <th className="p-3 w-1/4">
                <button onClick={() => toggleSort('nome_cargo')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Cargo <SortIcon col="nome_cargo" />
                </button>
              </th>
              <th className="p-3 w-56">
                <button onClick={() => toggleSort('agrupamento')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Agrupamento <SortIcon col="agrupamento" />
                </button>
              </th>
              <th className="p-3 w-44">
                <button onClick={() => toggleSort('empresa')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Empresa <SortIcon col="empresa" />
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => toggleSort('area')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Área <SortIcon col="area" />
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => toggleSort('departamentos')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Departamentos <SortIcon col="departamentos" />
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => toggleSort('setores')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Setores <SortIcon col="setores" />
                </button>
              </th>
              <th className="p-3 w-32">Nível</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              <td className="px-3 pb-2">
                <input value={filtros.codigo} onChange={e => setFiltro('codigo', e.target.value)} placeholder="Buscar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todos" opcoes={tiposContratacaoUnicos} selecionados={filtros.tipoContratacao} onChange={v => setFiltro('tipoContratacao', v)} />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.cargo} onChange={e => setFiltro('cargo', e.target.value)} placeholder="Buscar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todos" opcoes={agrupamentosUnicos} selecionados={filtros.agrupamento} onChange={v => setFiltro('agrupamento', v)} />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todas" opcoes={empresasUnicasFiltro} selecionados={filtros.empresa} onChange={v => setFiltro('empresa', v)} />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todas" opcoes={areasUnicas} selecionados={filtros.area} onChange={v => setFiltro('area', v)} />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todos" opcoes={departamentosUnicos} selecionados={filtros.departamentos} onChange={v => setFiltro('departamentos', v)} />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todos" opcoes={setoresUnicos} selecionados={filtros.setores} onChange={v => setFiltro('setores', v)} />
              </td>
              <td className="px-3 pb-2">
                <FiltroMultiSelect placeholder="Todos" opcoes={niveisUnicos} selecionados={filtros.nivel} onChange={v => setFiltro('nivel', v)} />
              </td>
              <td className="px-3 pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-6 text-center text-slate-400">
                  {temFiltro ? 'Nenhum cargo encontrado para os filtros aplicados.' : 'Nenhum cargo cadastrado.'}
                </td>
              </tr>
            ) : (
              dadosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{item.codigo_cargo || '—'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                      (item.tipo_contratacao || 'CLT') === 'PJ'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                      {item.tipo_contratacao || 'CLT'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-900 font-bold whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {item.nome_cargo}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200/50 text-[10px] whitespace-nowrap">
                      {item.nome_agrupamento_cargo || '-'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap" title={[item.nome_empresa, item.cnpj_empresa, item.nome_agrupamento_empresa].filter(Boolean).join(' — ')}>{item.nome_empresa || '—'}</td>
                  <td className="p-3">
                    {getAreas(item).length > 0
                      ? <div className="flex flex-wrap gap-1">
                          {getAreas(item).map(area => (
                            <span key={area} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${areaCls(area)}`}>
                              {area}
                            </span>
                          ))}
                        </div>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[180px]" title={renderNomes(item.departamento_ids, departamentos, 'nome_departamento')}>
                    {renderNomes(item.departamento_ids, departamentos, 'nome_departamento')}
                  </td>
                  <td className="p-3 text-slate-500 truncate max-w-[180px]" title={renderNomes(item.setor_ids, setores, 'nome_setor')}>
                    {renderNomes(item.setor_ids, setores, 'nome_setor')}
                  </td>
                  <td className="p-3">
                    {item.nivel_cargo
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200 whitespace-nowrap">{item.nivel_cargo}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="cargos"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[920px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Novo Cargo' : 'Editar Cargo'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">

                {/* Nome do Cargo | CLT ou PJ */}
                <div className="flex items-end gap-3">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Cargo *</label>
                    <input
                      type="text"
                      required
                      value={form.nome_cargo}
                      onChange={(e) => setForm(prev => ({ ...prev, nome_cargo: e.target.value }))}
                      onBlur={(e) => setForm(prev => ({ ...prev, nome_cargo: toUpperCargo(e.target.value) }))}
                      placeholder="Ex: Técnico de Manutenção"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contratação</label>
                    <div className="flex border border-slate-200 rounded-md overflow-hidden">
                      {['CLT', 'PJ'].map(tipo => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, tipo_contratacao: tipo }))}
                          className={`px-3 py-2 text-xs font-bold transition-colors ${
                            form.tipo_contratacao === tipo
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {tipo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Nível do Cargo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nível do Cargo</label>
                  <div className="flex flex-wrap gap-2">
                    {['Operacional', 'Líder', 'Coordenação', 'Supervisão', 'Gerência', 'Direção', 'Departamento'].map(nivel => (
                      <button
                        key={nivel}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, nivel_cargo: prev.nivel_cargo === nivel ? '' : nivel }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          form.nivel_cargo === nivel
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                        }`}
                      >
                        {nivel}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Código | Empresa | Agrupamento */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código do Cargo</label>
                    <input
                      type="text"
                      value={form.tipo_contratacao === 'PJ' ? form.codigo_cargo_pj : form.codigo_cargo_clt}
                      onChange={(e) => setForm(prev => (
                        prev.tipo_contratacao === 'PJ'
                          ? { ...prev, codigo_cargo_pj: e.target.value }
                          : { ...prev, codigo_cargo_clt: e.target.value }
                      ))}
                      placeholder="Ex: CGO-001"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    {form.tipo_contratacao === 'PJ' && form.codigo_cargo_clt && (
                      <span className="text-[10px] text-slate-400">CLT: {form.codigo_cargo_clt}</span>
                    )}
                    {form.tipo_contratacao === 'CLT' && form.codigo_cargo_pj && (
                      <span className="text-[10px] text-slate-400">PJ: {form.codigo_cargo_pj}</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
                    <select
                      value={form.empresa_id}
                      onChange={(e) => setForm(prev => ({ ...prev, empresa_id: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">— Selecione —</option>
                      {empresas.map(e => (
                        <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa} — {e.cnpj}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento *</label>
                    <select
                      value={form.agrupamento_id}
                      onChange={(e) => setForm(prev => ({ ...prev, agrupamento_id: e.target.value }))}
                      required
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione um agrupamento</option>
                      {agrupamentos.map(a => (
                        <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Área | Departamentos | Setores */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      Área
                      <span className="text-[9px] font-normal text-slate-400 normal-case">(automático)</span>
                    </label>
                    <div className="max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 flex flex-wrap gap-1.5 content-start custom-scrollbar">
                      {(() => {
                        const areas = [...new Set(
                          form.departamento_ids
                            .map(id => departamentos.find(d => d.id === id)?.area)
                            .filter(Boolean)
                        )]
                        return areas.length > 0
                          ? areas.map(area => (
                              <span key={area} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {area}
                              </span>
                            ))
                          : <p className="text-xs text-slate-400 p-1">Selecione departamentos.</p>
                      })()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Departamentos</label>
                    <CheckList
                      itens={departamentos}
                      campo="nome_departamento"
                      subcampo="agrupamento_departamento_nome"
                      selecionados={form.departamento_ids}
                      onToggle={toggleDepartamento}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                      Setores
                      {form.departamento_ids.length > 0 && (
                        <span className="text-[9px] font-normal text-slate-400 normal-case">(só dos departamentos marcados)</span>
                      )}
                    </label>
                    <CheckList
                      itens={form.departamento_ids.length === 0 ? setores : setores.filter(s => form.departamento_ids.includes(s.departamento_id))}
                      campo="nome_setor"
                      selecionados={form.setor_ids}
                      onToggle={toggleSetor}
                    />
                  </div>
                </div>

              </div>

                      {erroModal && (
                <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroModal}
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
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Cargo</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Cargo</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_cargo || '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contratação</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.tipo_contratacao || 'CLT'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código CLT</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_cargo_clt || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código PJ</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_cargo_pj || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_agrupamento_cargo || '-'}</span>
                </div>
                {itemVisualizado.nivel_cargo && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nível do Cargo</span>
                    <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">{itemVisualizado.nivel_cargo}</span>
                  </div>
                )}
                {itemVisualizado.nome_empresa && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresa</span>
                    <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_empresa}{itemVisualizado.cnpj_empresa ? ` — ${itemVisualizado.cnpj_empresa}` : ''}</span>
                    {itemVisualizado.nome_agrupamento_empresa && (
                      <span className="text-[10px] text-slate-400">Agrupamento: {itemVisualizado.nome_agrupamento_empresa}</span>
                    )}
                  </div>
                )}
              </div>
              {(() => {
                const areas = [...new Set(
                  (itemVisualizado.departamento_ids || [])
                    .map(id => departamentos.find(d => d.id === id)?.area)
                    .filter(Boolean)
                )]
                return areas.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Área</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {areas.map(area => (
                        <span key={area} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{area}</span>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamentos</span>
                <span className="text-xs font-semibold text-slate-800">{renderNomes(itemVisualizado.departamento_ids, departamentos, 'nome_departamento') || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Setores</span>
                <span className="text-xs font-semibold text-slate-800">{renderNomes(itemVisualizado.setor_ids, setores, 'nome_setor') || '-'}</span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja excluir o cargo <strong className="text-slate-800">"{form.nome_cargo}"</strong>? Todos os vínculos com departamentos e setores serão removidos.
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
        <ImportarCargosModal
          cargos={dados}
          empresas={empresas}
          agrupamentos={agrupamentos}
          onClose={() => setModalImportarAberto(false)}
          onImported={loadData}
        />
      )}

    </div>
  )
}
