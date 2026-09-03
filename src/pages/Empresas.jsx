import React, { useEffect, useMemo, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Building2, Eye, Search, ArrowUp, ArrowDown, ArrowUpDown, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const marcaColors = {
  DAF: 'bg-blue-100 text-blue-700 border-blue-200',
  HONDA: 'bg-red-100 text-red-700 border-red-200',
  default: 'bg-slate-100 border-slate-200 text-slate-700'
}

const getMarcaClasses = (marca) => {
  if (!marca) return marcaColors.default
  return marcaColors[marca.toUpperCase()] || marcaColors.default
}

const fmtCnpj = (v) => {
  if (!v) return null
  const s = String(v).replace(/\D/g, '')
  if (s.length === 14) return `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}`
  return v
}

export default function Empresas() {
  const [agrupamentos, setAgrupamentos] = useState([])
  const [segmentos, setSegmentos] = useState([])
  const [dados, setDados] = useState([])
  const [modalAberto, setModalAberto] = useSessionState('emp_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('emp_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('emp_editid', null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [form, setForm] = useSessionState('emp_form', {
    agrupamento_empresa_id: '',
    segmento_id: '',
    codigo_empresa: '',
    codigo_empresa_dominio: '',
    sigla_empresa: '',
    nome_empresa: '',
    empresa_fantasia: '',
    marca: '',
    cnpj: '',
    codigo_concessionaria: '',
    nome_empresa_sistema: '',
    sistema_dms: '',
    numero_filial: ''
  })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [busca, setBusca] = useState('')
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  const SortIcon = ({ col }) => sortCol !== col
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('empresas', 'editar')
  const canDelete = hasPermission('empresas', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [empresasData, agrupamentosData, segmentosData] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getAgrupamentoEmpresas(),
        apiService.getSegmentos()
      ])
      setDados(empresasData)
      setAgrupamentos(agrupamentosData)
      setSegmentos(segmentosData)
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setForm({
      agrupamento_empresa_id: agrupamentos[0]?.id || '',
      segmento_id: segmentos[0]?.id || '',
      codigo_empresa: '',
      codigo_empresa_dominio: '',
      sigla_empresa: '',
      nome_empresa: '',
      empresa_fantasia: '',
      marca: '',
      cnpj: '',
      codigo_concessionaria: '',
      nome_empresa_sistema: '',
      sistema_dms: '',
      numero_filial: ''
    })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setForm({
      agrupamento_empresa_id: item.agrupamento_empresa_id,
      segmento_id: item.segmento_id || '',
      codigo_empresa: item.codigo_empresa,
      codigo_empresa_dominio: item.codigo_empresa_dominio || '',
      sigla_empresa: item.sigla_empresa,
      nome_empresa: item.nome_empresa,
      empresa_fantasia: item.empresa_fantasia,
      marca: item.marca,
      cnpj: item.cnpj,
      codigo_concessionaria: item.codigo_concessionaria,
      nome_empresa_sistema: item.nome_empresa_sistema || '',
      sistema_dms: item.sistema_dms || '',
      numero_filial: item.numero_filial || ''
    })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setForm(item)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()

    const agrupObj = agrupamentos.find(g => g.id === form.agrupamento_empresa_id)
    const segmentoObj = segmentos.find(s => s.id === form.segmento_id)
    const payload = {
      agrupamento_empresa_id: form.agrupamento_empresa_id,
      agrupamento_nome: agrupObj ? agrupObj.nome_agrupamento : '',
      segmento_id: form.segmento_id,
      segmento_nome: segmentoObj ? segmentoObj.nome_segmento : '',
      codigo_empresa: parseInt(form.codigo_empresa),
      codigo_empresa_dominio: form.codigo_empresa_dominio || null,
      sigla_empresa: form.sigla_empresa,
      nome_empresa: form.nome_empresa,
      empresa_fantasia: form.empresa_fantasia,
      marca: form.marca,
      cnpj: form.cnpj,
      codigo_concessionaria: form.codigo_concessionaria,
      nome_empresa_sistema: form.nome_empresa_sistema || null,
      sistema_dms: form.sistema_dms || null,
      numero_filial: form.numero_filial || null,
      ativo: true
    }

    try {
      if (modo === 'incluir') {
        await apiService.createEmpresa(payload)
      } else {
        await apiService.updateEmpresa(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar empresa', err)
      alert('Erro ao salvar empresa: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteEmpresa(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir empresa', err)
      alert('Erro ao excluir empresa: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const dadosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    let result = dados
    if (q) {
      const qDigits = q.replace(/\D/g, '')
      result = dados.filter(item => {
        const texto = `${item.empresa_fantasia || ''} ${item.nome_empresa || ''} ${item.sigla_empresa || ''} ${item.codigo_empresa || ''} ${item.marca || ''}`.toLowerCase()
        if (texto.includes(q)) return true
        if (qDigits && String(item.cnpj || '').replace(/\D/g, '').includes(qDigits)) return true
        return false
      })
    }

    if (!sortCol) return result
    const getVal = (item) => {
      if (sortCol === 'codigo') return item.codigo_empresa ?? ''
      if (sortCol === 'nome') return item.empresa_fantasia || ''
      if (sortCol === 'cnpj') return item.cnpj || ''
      if (sortCol === 'marca') return item.marca || ''
      if (sortCol === 'segmento') return item.segmento_nome || ''
      if (sortCol === 'agrupamento') return item.agrupamento_nome || ''
      return ''
    }
    return [...result].sort((a, b) => {
      const va = getVal(a); const vb = getVal(b)
      const cmp = typeof va === 'number' && typeof vb === 'number'
        ? va - vb
        : String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base', numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dados, busca, sortCol, sortDir])

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
      {/* CABEÇALHO DA TELA */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Empresas</h1>
          <p className="text-xs text-slate-500">Gerencie as concessionárias e filiais vinculadas aos seus agrupamentos de negócios.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Empresa
          </button>
        )}
      </div>

      {/* BUSCA */}
      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, sigla, código ou CNPJ..."
          className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* TABELA DENSA (TOTALMENTE ESPAÇADA EM LARGURA TOTAL) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full table-auto text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-16 text-center">
                <button onClick={() => toggleSort('codigo')} className="flex items-center gap-1 mx-auto hover:text-slate-600 transition-colors">
                  Cód. <SortIcon col="codigo" />
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => toggleSort('nome')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Nome Fantasia <SortIcon col="nome" />
                </button>
              </th>
              <th className="p-3 w-44">
                <button onClick={() => toggleSort('cnpj')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  CNPJ <SortIcon col="cnpj" />
                </button>
              </th>
              <th className="p-3 w-28">
                <button onClick={() => toggleSort('marca')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Marca <SortIcon col="marca" />
                </button>
              </th>
              <th className="p-3 w-40">
                <button onClick={() => toggleSort('segmento')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Segmento <SortIcon col="segmento" />
                </button>
              </th>
              <th className="p-3 w-40">
                <button onClick={() => toggleSort('agrupamento')} className="flex items-center gap-1 hover:text-slate-600 transition-colors">
                  Agrupamento <SortIcon col="agrupamento" />
                </button>
              </th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-slate-400">
                  {busca ? 'Nenhuma empresa encontrada para a busca.' : 'Nenhuma empresa cadastrada.'}
                </td>
              </tr>
            ) : dadosFiltrados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-center text-slate-500 font-mono font-bold">{item.codigo_empresa}</td>
                <td className="p-3 text-slate-900 font-semibold whitespace-nowrap truncate" title={item.empresa_fantasia}>
                  {item.empresa_fantasia}
                </td>
                <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{fmtCnpj(item.cnpj) || '-'}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded font-bold uppercase tracking-wider text-[10px] border ${getMarcaClasses(item.marca)}`}>
                    {item.marca}
                  </span>
                </td>
                <td className="p-3 text-slate-500">{item.segmento_nome || '-'}</td>
                <td className="p-3 text-slate-500">{item.agrupamento_nome}</td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="empresas"
                    onView={() => abrirVisualizar(item)}
                    onEdit={() => abrirEditar(item)}
                    onDelete={() => abrirExcluir(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR (GRID 2 COLUNAS) */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[900px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Nova Empresa' : 'Editar Dados da Empresa'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 grid grid-cols-2 gap-4">
                {/* Razão Social + CNPJ */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome da Empresa (Razão Social) *</label>
                    <input
                      type="text"
                      required
                      name="nome_empresa"
                      value={form.nome_empresa}
                      onChange={handleInputChange}
                      placeholder="Razão Social completa"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">CNPJ *</label>
                    <input
                      type="text"
                      required
                      name="cnpj"
                      value={form.cnpj}
                      onChange={handleInputChange}
                      placeholder="00.000.000/0001-00"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Empresa Fantasia + Código Concessionária Fabricante */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa Fantasia *</label>
                    <input
                      type="text"
                      required
                      name="empresa_fantasia"
                      value={form.empresa_fantasia}
                      onChange={handleInputChange}
                      placeholder="Ex: Caiobá DAF"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código Concessionária Fabricante</label>
                    <input
                      type="text"
                      name="codigo_concessionaria"
                      value={form.codigo_concessionaria}
                      onChange={handleInputChange}
                      placeholder="Código junto à montadora"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Agrupamento + Segmento + Marca */}
                <div className="col-span-2 grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento Empresas *</label>
                    <select
                      name="agrupamento_empresa_id"
                      value={form.agrupamento_empresa_id}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      {agrupamentos.map(g => (
                        <option key={g.id} value={g.id}>{g.nome_agrupamento}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Segmento *</label>
                    <select
                      name="segmento_id"
                      value={form.segmento_id}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione um segmento</option>
                      {segmentos.map(s => (
                        <option key={s.id} value={s.id}>{s.nome_segmento}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Marca *</label>
                    <select
                      required
                      name="marca"
                      value={form.marca}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">— Selecione a marca —</option>
                      <option value="DAF">DAF</option>
                      <option value="HONDA">HONDA</option>
                      <option value="OUTRAS">OUTRAS</option>
                    </select>
                  </div>
                </div>

                {/* Sistema DMS + Sigla Empresa Sistema */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistema DMS</label>
                    <select
                      name="sistema_dms"
                      value={form.sistema_dms}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">— Selecione —</option>
                      <option value="Dealer.net">Dealer.net</option>
                      <option value="MicroWork Cloud">MicroWork Cloud</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sigla Empresa Sistema *</label>
                    <input
                      type="text"
                      required
                      name="sigla_empresa"
                      value={form.sigla_empresa}
                      onChange={handleInputChange}
                      placeholder="Ex: CBT DAF"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Código Empresa Sistema + Nº Filial Sistema */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código Empresa Sistema *</label>
                    <input
                      type="number"
                      required
                      name="codigo_empresa"
                      value={form.codigo_empresa}
                      onChange={handleInputChange}
                      placeholder="Ex: 10"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      Nº Filial Sistema
                      <span className="relative group cursor-help">
                        <Info className="h-3 w-3 text-slate-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                          Esse valor só é usado por empresas que utilizam o sistema MicroWork Cloud
                        </span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="numero_filial"
                      value={form.numero_filial}
                      onChange={handleInputChange}
                      placeholder="Ex: 01"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Nome Empresa no Sistema + Código Empresa no Domínio */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome Empresa no Sistema</label>
                    <input
                      type="text"
                      name="nome_empresa_sistema"
                      value={form.nome_empresa_sistema}
                      onChange={handleInputChange}
                      placeholder="Nome utilizado no sistema interno"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código Empresa no Domínio</label>
                    <input
                      type="text"
                      name="codigo_empresa_dominio"
                      value={form.codigo_empresa_dominio}
                      onChange={handleInputChange}
                      placeholder="Código da empresa no sistema Domínio"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

              </div>

              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                >
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
          <div className="bg-white rounded-lg border border-slate-200 w-[540px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Empresa</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.codigo_empresa || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sigla</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.sigla_empresa || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresa Fantasia</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.empresa_fantasia || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Razão Social</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_empresa || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Marca</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.marca || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CNPJ</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.cnpj || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código Concessionária Fabricante</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_concessionaria || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sistema DMS</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.sistema_dms || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nº Filial Sistema</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.numero_filial || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código Empresa no Domínio</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_empresa_dominio || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Segmento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.segmento_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5 col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_nome || '-'}</span>
              </div>
              {itemVisualizado.nome_empresa_sistema && (
                <div className="flex flex-col gap-0.5 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome Empresa no Sistema</span>
                  <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_empresa_sistema}</span>
                </div>
              )}
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
                  Tem certeza que deseja excluir a empresa <strong className="text-slate-800">"{form.empresa_fantasia}"</strong> (Cód. {form.codigo_empresa})? Esta ação irá romper os vínculos operacionais estruturados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalExcluirAberto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
