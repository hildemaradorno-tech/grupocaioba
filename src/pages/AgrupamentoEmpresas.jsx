import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Building2, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function AgrupamentoEmpresas() {
  const location = useLocation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [segmentos, setSegmentos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('agrup_emp_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('agrup_emp_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('agrup_emp_form', { nome_agrupamento: '', segmento_id: '', ativo: true })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('agrup-empresas', 'editar')
  const canDelete = hasPermission('agrup-empresas', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [agrupamentosData, segmentosData, empresasData] = await Promise.all([
        apiService.getAgrupamentoEmpresas(),
        apiService.getSegmentos(),
        apiService.getEmpresas()
      ])
      setItems(agrupamentosData)
      setSegmentos(segmentosData)
      setEmpresas(empresasData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome_agrupamento: '', segmento_id: segmentos[0]?.id || '', ativo: true })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ nome_agrupamento: item.nome_agrupamento || '', segmento_id: item.segmento_id || '', ativo: item.ativo ?? true })
    setModalAberto(true)
  }

  // Veio de outra tela (ex: Organograma, clicando no lápis de editar) pedindo pra abrir direto
  // a edição de um agrupamento de empresas específico — consome o state da navegação uma única vez.
  useEffect(() => {
    const idParaEditar = location.state?.editarId
    if (!idParaEditar || items.length === 0) return
    const item = items.find(i => i.id === idParaEditar)
    if (item) abrirEditar(item)
    navigate(location.pathname, { replace: true, state: {} })
  }, [items, location.state])

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, nome_agrupamento: item.nome_agrupamento }))
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const segObj = segmentos.find(s => s.id === form.segmento_id)
      const payload = { ...form, segmento_nome: segObj?.nome_segmento || '' }
      if (editingId) {
        await apiService.updateAgrupamentoEmpresa(editingId, payload)
      } else {
        await apiService.createAgrupamentoEmpresa(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar agrupamento: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteAgrupamentoEmpresa(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir agrupamento: ' + (err.message || String(err)))
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agrupamento Empresas</h1>
          <p className="text-xs text-slate-500">Defina os grupos corporativos que reúnem as empresas da holding.</p>
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
              <th className="p-3 w-36">Segmento</th>
              <th className="p-3">EMPRESAS</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">Nenhum agrupamento cadastrado.</td>
              </tr>
            ) : items.map((item) => {
              const empresasAgrupadas = empresas.filter(e => e.agrupamento_empresa_id === item.id)
              const empresasTexto = empresasAgrupadas.length > 0
                ? empresasAgrupadas.map(e => e.empresa_fantasia || e.sigla_empresa).join(', ')
                : 'Nenhuma empresa'

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    {item.nome_agrupamento}
                  </td>
                  <td className="p-3 text-slate-600">{item.segmento_nome || '-'}</td>
                  <td className="p-3 text-slate-500 truncate max-w-[260px]" title={empresasTexto}>{empresasTexto}</td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="agrup-empresas"
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
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
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
                    placeholder="Ex: Caiobá Trucks"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Segmento *</label>
                  <select
                    value={form.segmento_id}
                    onChange={(e) => setForm(prev => ({ ...prev, segmento_id: e.target.value }))}
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione um segmento</option>
                    {segmentos.map(s => (
                      <option key={s.id} value={s.id}>{s.nome_segmento}</option>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[440px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Agrupamento</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Agrupamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_agrupamento || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Segmento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.segmento_nome || '-'}</span>
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
                  Deseja excluir o agrupamento <strong className="text-slate-800">"{form.nome_agrupamento}"</strong>? As empresas vinculadas perderão esta referência.
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
