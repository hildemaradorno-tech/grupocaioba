import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, PackagePlus, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const GRUPOS = [
  'Acessórios',
  'Combustíveis e Lubrificantes',
  'Material Consumo',
  'Outros',
  'Peças',
  'Pneus e Câmaras',
]

const GRUPOS_CONTABEIS = [
  'ACESSORIOS',
  'COMB. E LUBRIFICANTES',
  'OUTRAS MERCADORIAS',
  'PEÇAS',
  'PNEUS E CAMARAS',
  'TRP',
]

const AGRUPAMENTOS_PRODUTO = [
  'ACESSÓRIOS EM GERAL',
  'CAPACETES',
  'DAF',
  'HONDA',
  'LUBRIFICANTE',
  'OUTRAS MERCADORIAS',
  'PNEUS',
  'TRP',
]

const FORM_VAZIO = {
  agrupamento_empresa_id: '',
  codigo: '',
  nome_tipo_produto: '',
  grupo: '',
  grupo_contabil: '',
  agrupamento_produto: '',
  ativo: true,
}

export default function TiposProdutos() {
  const [dados, setDados] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('tprod_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('tprod_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('tprod_form', FORM_VAZIO)

  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('tipos-produtos', 'editar')
  const canDelete = hasPermission('tipos-produtos', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tiposData, agrupamentosData] = await Promise.all([
        apiService.getTiposProdutos(),
        apiService.getAgrupamentoEmpresas()
      ])
      setDados(tiposData)
      setAgrupamentos(agrupamentosData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO, agrupamento_empresa_id: agrupamentos[0]?.id || '' })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({
      agrupamento_empresa_id: item.agrupamento_empresa_id || '',
      codigo: item.codigo || '',
      nome_tipo_produto: item.nome_tipo_produto || '',
      grupo: item.grupo || '',
      grupo_contabil: item.grupo_contabil || '',
      agrupamento_produto: item.agrupamento_produto || '',
      ativo: item.ativo ?? true,
    })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, nome_tipo_produto: item.nome_tipo_produto }))
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const agrupObj = agrupamentos.find(g => g.id === form.agrupamento_empresa_id)
      const payload = { ...form, agrupamento_nome: agrupObj?.nome_agrupamento || '' }
      if (editingId) {
        await apiService.updateTipoProduto(editingId, payload)
      } else {
        await apiService.createTipoProduto(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar tipo de produto: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteTipoProduto(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir tipo de produto: ' + (err.message || String(err)))
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

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tipos de Produtos</h1>
          <p className="text-xs text-slate-500">Cadastre e estruture as grandes categorias de peças, insumos e materiais de estoque.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Tipo de Produto
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Tipo de Produto</th>
              <th className="p-3 w-52">Grupo</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-6 text-center text-slate-400">Nenhum tipo de produto cadastrado.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  {item.nome_tipo_produto}
                </td>
                <td className="p-3 text-slate-500">
                  <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 font-semibold text-slate-600">
                    {item.grupo || '-'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="tipos-produtos"
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

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[500px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PackagePlus className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Tipo de Produto' : 'Incluir Tipo de Produto'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento de Empresas *</label>
                  <select
                    required
                    value={form.agrupamento_empresa_id}
                    onChange={(e) => setForm(prev => ({ ...prev, agrupamento_empresa_id: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione um agrupamento</option>
                    {agrupamentos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome_agrupamento}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código do Produto</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ex: 001"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição do Tipo de Produto *</label>
                  <input
                    type="text"
                    required
                    value={form.nome_tipo_produto}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_tipo_produto: e.target.value }))}
                    placeholder="Ex: Óleos, Graxas e Insumos Químicos"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Grupo *</label>
                    <select
                      required
                      value={form.grupo}
                      onChange={(e) => setForm(prev => ({ ...prev, grupo: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      {GRUPOS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Grupo Contábil *</label>
                    <select
                      required
                      value={form.grupo_contabil}
                      onChange={(e) => setForm(prev => ({ ...prev, grupo_contabil: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione</option>
                      {GRUPOS_CONTABEIS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento de Produtos *</label>
                  <select
                    required
                    value={form.agrupamento_produto}
                    onChange={(e) => setForm(prev => ({ ...prev, agrupamento_produto: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione</option>
                    {AGRUPAMENTOS_PRODUTO.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="w-4 h-4"
                  />
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
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Tipo de Produto</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-semibold text-slate-800 font-mono">{itemVisualizado.codigo || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Produto</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_tipo_produto || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento Corporativo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grupo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.grupo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grupo Contábil</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.grupo_contabil || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento de Produtos</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_produto || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{itemVisualizado.ativo ? 'Ativo' : 'Inativo'}</span>
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
                  Tem certeza que deseja remover a classificação <strong className="text-slate-800">"{form.nome_tipo_produto}"</strong>? Os produtos pertencentes a esta categoria perderão o seu nó relacional.
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
