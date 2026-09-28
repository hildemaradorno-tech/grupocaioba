import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Hash, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const FORM_VAZIO = { codigo: '', descricao: '', ativo: true, empresa_ids: [] }

export default function Rubricas() {
  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('rubricas_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('rubricas_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('rubricas_form', FORM_VAZIO)
  const [buscaEmpresa, setBuscaEmpresa] = useState('')
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('rubricas', 'editar')
  const canDelete = hasActionOrDefault('rubricas', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rubricas, emps] = await Promise.all([apiService.getRubricas(), apiService.getEmpresas()])
      setDados(rubricas)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa
  const nomesEmpresas = (ids) => (ids || []).map(id => empresas.find(e => e.id === id)).filter(Boolean).map(nomeEmpresa)

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(FORM_VAZIO)
    setErroModal(null)
    setBuscaEmpresa('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ codigo: item.codigo, descricao: item.descricao || '', ativo: item.ativo ?? true, empresa_ids: item.empresa_ids || [] })
    setErroModal(null)
    setBuscaEmpresa('')
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, codigo: item.codigo }))
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const toggleEmpresa = (id) => setForm(prev => ({
    ...prev,
    empresa_ids: prev.empresa_ids.includes(id) ? prev.empresa_ids.filter(x => x !== id) : [...prev.empresa_ids, id],
  }))

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErroModal(null)
    try {
      if (editingId) {
        await apiService.updateRubrica(editingId, form)
      } else {
        await apiService.createRubrica(form)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = err.message || String(err)
      if (msg.includes('duplicate key') || msg.includes('unique')) {
        setErroModal(`Já existe uma rubrica com o código "${form.codigo}".`)
      } else {
        setErroModal('Erro ao salvar: ' + msg)
      }
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteRubrica(idExcluir)
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

      <div className="flex items-center justify-end border-b border-slate-200 pb-4">
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Rubrica
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-32">Código</th>
              <th className="p-3">Descrição</th>
              <th className="p-3">Empresas</th>
              <th className="p-3 w-28 text-center">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">Nenhuma rubrica cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold font-mono">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {item.codigo}
                  </div>
                </td>
                <td className="p-3 text-slate-600 whitespace-nowrap">{item.descricao || '-'}</td>
                <td className="p-3 text-slate-600">
                  {(item.empresa_ids || []).length === 0 ? (
                    <span className="text-slate-300">Todas</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {nomesEmpresas(item.empresa_ids).map(n => (
                        <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">{n}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="rubricas"
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
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[460px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Hash className="h-4 w-4 text-indigo-600" />
                {editingId ? 'Editar Rubrica' : 'Incluir Nova Rubrica'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código *</label>
                  <input
                    type="text"
                    required
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ex: 315"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Comissão sobre Margem de Venda"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Empresas que atendem ({form.empresa_ids.length === 0 ? 'todas' : form.empresa_ids.length})
                  </label>
                  <span className="text-[10px] text-slate-400 leading-relaxed">Nenhuma empresa marcada = vale pra todas.</span>
                  <input type="text" value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)}
                    placeholder="Buscar empresa..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {empresas
                      .filter(e => !buscaEmpresa.trim() || nomeEmpresa(e).toLowerCase().includes(buscaEmpresa.trim().toLowerCase()))
                      .sort((a, b) => Number(form.empresa_ids.includes(b.id)) - Number(form.empresa_ids.includes(a.id)))
                      .map(e => (
                        <label key={e.id} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${form.empresa_ids.includes(e.id) ? 'bg-emerald-50/60' : ''}`}>
                          <input type="checkbox" className="w-3.5 h-3.5" checked={form.empresa_ids.includes(e.id)} onChange={() => toggleEmpresa(e.id)} />
                          <span className="font-medium text-slate-700">{nomeEmpresa(e)}</span>
                        </label>
                      ))}
                    {empresas.length === 0 && <div className="px-3 py-3 text-[11px] text-slate-400">Nenhuma empresa cadastrada.</div>}
                  </div>
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
                <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroModal}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
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
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Rubrica</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresas que atendem</span>
                {(itemVisualizado.empresa_ids || []).length === 0 ? (
                  <span className="text-xs font-semibold text-slate-800">Todas</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {nomesEmpresas(itemVisualizado.empresa_ids).map(n => (
                      <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">{n}</span>
                    ))}
                  </div>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja excluir a rubrica <strong className="text-slate-800 font-mono">"{form.codigo}"</strong>? Políticas de Comissão que já usam esse código continuam com o valor salvo — só o cadastro que alimenta o seletor é removido.
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
