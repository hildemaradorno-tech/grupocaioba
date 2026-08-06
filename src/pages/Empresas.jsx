import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Building2, Eye } from 'lucide-react'
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
    sigla_empresa: '',
    nome_empresa: '',
    empresa_fantasia: '',
    marca: '',
    cnpj: '',
    codigo_concessionaria: '',
    nome_empresa_sistema: ''
  })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
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
      sigla_empresa: '',
      nome_empresa: '',
      empresa_fantasia: '',
      marca: '',
      cnpj: '',
      codigo_concessionaria: '',
      nome_empresa_sistema: ''
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
      sigla_empresa: item.sigla_empresa,
      nome_empresa: item.nome_empresa,
      empresa_fantasia: item.empresa_fantasia,
      marca: item.marca,
      cnpj: item.cnpj,
      codigo_concessionaria: item.codigo_concessionaria,
      nome_empresa_sistema: item.nome_empresa_sistema || ''
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
      sigla_empresa: form.sigla_empresa,
      nome_empresa: form.nome_empresa,
      empresa_fantasia: form.empresa_fantasia,
      marca: form.marca,
      cnpj: form.cnpj,
      codigo_concessionaria: form.codigo_concessionaria,
      nome_empresa_sistema: form.nome_empresa_sistema || null,
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

      {/* TABELA DENSA (TOTALMENTE ESPAÇADA EM LARGURA TOTAL) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar">
        <table className="w-full table-auto text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-16 text-center">Cód.</th>
              <th className="p-3">Nome Fantasia</th>
              <th className="p-3 w-28">Marca</th>
              <th className="p-3 w-40">Segmento</th>
              <th className="p-3 w-40">Agrupamento</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-center text-slate-500 font-mono font-bold">{item.codigo_empresa}</td>
                <td className="p-3 text-slate-900 font-semibold whitespace-nowrap truncate" title={item.empresa_fantasia}>
                  {item.empresa_fantasia}
                </td>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[650px] shadow-xl overflow-hidden animate-scale-in">
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
                {/* Agrupamento */}
                <div className="flex flex-col gap-1 col-span-2">
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

                {/* Segmento */}
                <div className="flex flex-col gap-1 col-span-2">
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

                {/* Código Empresa */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código Empresa *</label>
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

                {/* Sigla Empresa */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sigla Empresa *</label>
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

                {/* Nome Fantasia */}
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

                {/* Marca */}
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

                {/* Nome Empresa no Sistema */}
                <div className="flex flex-col gap-1 col-span-2">
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

                {/* Razão Social */}
                <div className="flex flex-col gap-1 col-span-2">
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

                {/* CNPJ */}
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

                {/* Código Concessionária */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código Concessionária</label>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código Concessionária</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo_concessionaria || '-'}</span>
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
