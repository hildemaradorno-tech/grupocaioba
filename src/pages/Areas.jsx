import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Tag, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function Areas() {
  const location = useLocation()
  const navigate = useNavigate()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('areas_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('areas_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('areas_form', { nome_area: '', ativo: true })
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('areas', 'editar')
  const canDelete = hasPermission('areas', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      setDados(await apiService.getAreas())
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome_area: '', ativo: true })
    setErroModal(null)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ nome_area: item.nome_area, ativo: item.ativo ?? true })
    setErroModal(null)
    setModalAberto(true)
  }

  // Veio de outra tela (ex: Organograma, clicando no lápis de editar) pedindo pra abrir direto
  // a edição de uma área específica — consome o state da navegação uma única vez.
  useEffect(() => {
    const idParaEditar = location.state?.editarId
    if (!idParaEditar || dados.length === 0) return
    const item = dados.find(a => a.id === idParaEditar)
    if (item) abrirEditar(item)
    navigate(location.pathname, { replace: true, state: {} })
  }, [dados, location.state])

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, nome_area: item.nome_area }))
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErroModal(null)
    try {
      if (editingId) {
        await apiService.updateArea(editingId, form)
      } else {
        await apiService.createArea(form)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate key') || msg.includes('unique')) {
        setErroModal(`Já existe uma área com o nome "${form.nome_area}".`)
      } else {
        setErroModal('Erro ao salvar: ' + msg)
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteArea(idExcluir)
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

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Áreas</h1>
          <p className="text-xs text-slate-500">Defina as grandes áreas organizacionais que conectam agrupamentos e departamentos.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Área
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Área</th>
              <th className="p-3 w-28 text-center">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-6 text-center text-slate-400">Nenhuma área cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {item.nome_area}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="areas"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600" />
                {editingId ? 'Editar Área' : 'Incluir Nova Área'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome da Área *</label>
                  <input
                    type="text"
                    required
                    value={form.nome_area}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_area: e.target.value }))}
                    placeholder="Ex: Vendas, Pós-Vendas, Administrativo"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
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
                <button type="submit" disabled={salvando}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
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
          <div className="bg-white rounded-lg border border-slate-200 w-[380px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Área</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome da Área</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_area || '-'}</span>
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
                  Tem certeza que deseja excluir a área <strong className="text-slate-800">"{form.nome_area}"</strong>? Os agrupamentos e departamentos vinculados perderão a referência.
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
