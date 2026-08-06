import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Layers, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/supabaseClient'

export default function AgrupamentoDepartamentos() {
  const [items, setItems] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('agrup_dep_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('agrup_dep_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('agrup_dep_form', { nome_agrupamento: '', area: '', ativo: true })
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('agrup-departamentos', 'editar')
  const canDelete = hasPermission('agrup-departamentos', 'excluir')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [itemsData, areasData] = await Promise.all([
        apiService.getAgrupamentoDepartamentos(),
        apiService.getAreas(),
      ])
      setItems(itemsData)
      setAreas(areasData.filter(a => a.ativo !== false))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome_agrupamento: '', area: '', ativo: true })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ nome_agrupamento: item.nome_agrupamento, area: item.area || '', ativo: item.ativo ?? true })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, nome_agrupamento: item.nome_agrupamento }))
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (editingId) {
        await apiService.updateAgrupamentoDepartamento(editingId, form)
      } else {
        await apiService.createAgrupamentoDepartamento(form)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteAgrupamentoDepartamento(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agrupamento de Departamentos</h1>
          <p className="text-xs text-slate-500">Categorias que agrupam departamentos de forma transversal às empresas.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Agrupamento
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Agrupamento</th>
              <th className="p-3 w-40">Área</th>
              <th className="p-3 w-28 text-center">Situação</th>
              <th className="p-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">Nenhum agrupamento cadastrado.</td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  {item.nome_agrupamento}
                </td>
                <td className="p-3">
                  {item.area ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.area === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {item.area}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-[10px]">—</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="agrup-departamentos"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Agrupamento' : 'Incluir Novo Agrupamento'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Agrupamento *</label>
                  <input
                    type="text"
                    required
                    value={form.nome_agrupamento}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_agrupamento: e.target.value }))}
                    placeholder="Ex: Comercial, Operacional, Administrativo"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Área</label>
                  <select
                    value={form.area}
                    onChange={(e) => setForm(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">— Sem área —</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.nome_area}>{a.nome_area}</option>
                    ))}
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
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Agrupamento</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Agrupamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_agrupamento || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Área</span>
                {itemVisualizado.area ? (
                  <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.area === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                    {itemVisualizado.area}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.ativo ? 'Ativo' : 'Inativo'}
                </span>
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
                  Deseja excluir o agrupamento <strong className="text-slate-800">"{form.nome_agrupamento}"</strong>? Os departamentos vinculados perderão esta referência.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
