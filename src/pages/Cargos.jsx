import React, { useEffect, useMemo, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Briefcase, CheckSquare, Square, Eye, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const LIGACOES = new Set(['de','do','da','dos','das','e','ou','a','o','as','os','que','com','em','no','na','nos','nas','para','por','pelo','pela','pelos','pelas','ao','aos','um','uma'])
const capPart = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s
const toTitleCargo = (str) =>
  str.trim().split(/\s+/).map((word, i) => {
    if (!word) return word
    // Palavras com hífen: capitaliza cada parte (ex: Pós-Vendas, Pré-Venda)
    if (word.includes('-')) return word.split('-').map(capPart).join('-')
    const low = word.toLowerCase()
    return (i === 0 || !LIGACOES.has(low))
      ? low.charAt(0).toUpperCase() + low.slice(1)
      : low
  }).join(' ')

export default function Cargos() {
  const [agrupamentos, setAgrupamentos] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [agrupamentosEmpresa, setAgrupamentosEmpresa] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('cgo_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('cgo_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('cgo_editid', null)
  const [form, setForm] = useSessionState('cgo_form', { nome_cargo: '', codigo_cargo: '', agrupamento_id: '', agrupamento_empresa_id: '', departamento_ids: [], setor_ids: [], nivel_cargo: '' })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [erroModal, setErroModal] = useState(null)

  const [filtros, setFiltros] = useState({ cargo: '', agrupamento: '', agrupamentoEmpresa: '', departamentos: '', setores: '', area: '', nivel: '' })
  const [sortCol, setSortCol] = useState('nome_cargo')
  const [sortDir, setSortDir] = useState('asc')

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const setFiltro = (key, val) => setFiltros(prev => ({ ...prev, [key]: val }))
  const limparFiltros = () => setFiltros({ cargo: '', agrupamento: '', agrupamentoEmpresa: '', departamentos: '', setores: '', area: '', nivel: '' })
  const temFiltro = Object.values(filtros).some(v => v !== '')

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('cargos', 'editar')
  const canDelete = hasPermission('cargos', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cargosData, agrupamentosData, departamentosData, setoresData, agrupamentosEmpresaData] = await Promise.all([
        apiService.getCargos(),
        apiService.getAgrupamentoCargos(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getAgrupamentoEmpresas(),
      ])
      setDados(cargosData)
      setAgrupamentos(agrupamentosData)
      setDepartamentos(departamentosData)
      setSetores(setoresData)
      setAgrupamentosEmpresa(agrupamentosEmpresaData.filter(a => a.ativo !== false))
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
    setForm({ nome_cargo: '', codigo_cargo: '', agrupamento_id: agrupamentos[0]?.id || '', agrupamento_empresa_id: '', departamento_ids: [], setor_ids: [], nivel_cargo: '' })
    setErroModal(null)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setForm({
      nome_cargo: item.nome_cargo,
      codigo_cargo: item.codigo_cargo || '',
      agrupamento_id: item.agrupamento_id,
      agrupamento_empresa_id: item.agrupamento_empresa_id || '',
      departamento_ids: item.departamento_ids || [],
      setor_ids: item.setor_ids || [],
      nivel_cargo: item.nivel_cargo || ''
    })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setForm(prev => ({ ...prev, nome_cargo: item.nome_cargo }))
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    try {
      if (modo === 'incluir') {
        await apiService.createCargo({ ...form, ativo: true })
      } else {
        await apiService.updateCargo(idSelecionado, { ...form, ativo: true })
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate key') || msg.includes('unique constraint')) {
        setErroModal(`Já existe um cargo com o nome "${form.nome_cargo}" para o agrupamento de empresa selecionado.`)
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

  const dadosFiltrados = useMemo(() => {
    const match = (val, q) => !q || (val || '').toLowerCase().includes(q.toLowerCase())
    let result = dados.filter(item =>
      match(item.nome_cargo, filtros.cargo) &&
      match(item.nome_agrupamento_cargo, filtros.agrupamento) &&
      match(item.nome_agrupamento_empresa, filtros.agrupamentoEmpresa) &&
      match(renderNomes(item.departamento_ids, departamentos, 'nome_departamento'), filtros.departamentos) &&
      match(renderNomes(item.setor_ids, setores, 'nome_setor'), filtros.setores) &&
      match(getArea(item), filtros.area) &&
      match(item.nivel_cargo, filtros.nivel)
    )
    const getVal = (item) => {
      if (sortCol === 'nome_cargo') return item.nome_cargo || ''
      if (sortCol === 'agrupamento') return item.nome_agrupamento_cargo || ''
      if (sortCol === 'agrupamentoEmpresa') return item.nome_agrupamento_empresa || ''
      if (sortCol === 'departamentos') return renderNomes(item.departamento_ids, departamentos, 'nome_departamento')
      if (sortCol === 'setores') return renderNomes(item.setor_ids, setores, 'nome_setor')
      if (sortCol === 'area') return getArea(item)
      return ''
    }
    return [...result].sort((a, b) => {
      const cmp = getVal(a).localeCompare(getVal(b), 'pt-BR', { sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dados, filtros, sortCol, sortDir, departamentos, setores])

  const CheckList = ({ itens, campo, subcampo, selecionados, onToggle }) => (
    <div className="max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 space-y-1 custom-scrollbar">
      {itens.length === 0 ? (
        <p className="text-xs text-slate-400 p-1">Nenhum registro.</p>
      ) : itens.map(item => {
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
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Cargo
          </button>
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
                <button onClick={() => toggleSort('agrupamentoEmpresa')} className="flex items-center gap-1 hover:text-slate-600 transition-colors w-full">
                  Agrupamento Empresa <SortIcon col="agrupamentoEmpresa" />
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
              <td className="px-3 pb-2" />
              <td className="px-3 pb-2">
                <input value={filtros.cargo} onChange={e => setFiltro('cargo', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.agrupamento} onChange={e => setFiltro('agrupamento', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.agrupamentoEmpresa} onChange={e => setFiltro('agrupamentoEmpresa', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.area} onChange={e => setFiltro('area', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.departamentos} onChange={e => setFiltro('departamentos', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.setores} onChange={e => setFiltro('setores', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2">
                <input value={filtros.nivel} onChange={e => setFiltro('nivel', e.target.value)} placeholder="Filtrar..." className="w-full text-[11px] p-1.5 border border-slate-200 rounded bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-blue-400" />
              </td>
              <td className="px-3 pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="9" className="p-6 text-center text-slate-400">
                  {temFiltro ? 'Nenhum cargo encontrado para os filtros aplicados.' : 'Nenhum cargo cadastrado.'}
                </td>
              </tr>
            ) : (
              dadosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-mono text-slate-500 text-[11px]">{item.codigo_cargo || '—'}</td>
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
                  <td className="p-3 text-slate-500 text-[11px] truncate max-w-[160px]" title={item.nome_agrupamento_empresa}>{item.nome_agrupamento_empresa || '—'}</td>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[760px] shadow-xl overflow-hidden animate-scale-in">
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

                {/* Nome do Cargo */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Cargo *</label>
                  <input
                    type="text"
                    required
                    value={form.nome_cargo}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_cargo: e.target.value }))}
                    onBlur={(e) => setForm(prev => ({ ...prev, nome_cargo: toTitleCargo(e.target.value) }))}
                    placeholder="Ex: Técnico de Manutenção"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
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
                      value={form.codigo_cargo}
                      onChange={(e) => setForm(prev => ({ ...prev, codigo_cargo: e.target.value }))}
                      placeholder="Ex: CGO-001"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento de Empresa</label>
                    <select
                      value={form.agrupamento_empresa_id}
                      onChange={(e) => setForm(prev => ({ ...prev, agrupamento_empresa_id: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">— Selecione —</option>
                      {agrupamentosEmpresa.map(a => (
                        <option key={a.id} value={a.id}>{a.nome_agrupamento}</option>
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
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setores</label>
                    <CheckList
                      itens={setores}
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código do Cargo</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_cargo || '—'}</span>
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
                {itemVisualizado.nome_agrupamento_empresa && (
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento de Empresa</span>
                    <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_agrupamento_empresa}</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamentos</span>
                <span className="text-xs font-semibold text-slate-800">{renderNomes(itemVisualizado.departamento_ids, departamentos, 'nome_departamento') || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Setores</span>
                <span className="text-xs font-semibold text-slate-800">{renderNomes(itemVisualizado.setor_ids, setores, 'nome_setor') || '-'}</span>
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

    </div>
  )
}
