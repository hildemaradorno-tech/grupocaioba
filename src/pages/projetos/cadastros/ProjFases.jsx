import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Eye, Milestone } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import PermissionActionButtons from '../../../components/PermissionActionButtons'
import { apiService } from '../../../services/api'
import { clearProjLookups } from '../../../services/projLookups'

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

const _cache = { dados: null }

export default function ProjFases() {
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useSessionState('proj_fase_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('proj_fase_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('proj_fase_form', { nome: '', ativo: true, cor: '#1e293b', ordem: '' })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [editandoOrdem, setEditandoOrdem] = useState(null) // { id, valor }
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('proj-fases', 'editar')
  const canDelete = hasPermission('proj-fases', 'excluir')

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadDados(_cache.dados !== null) }, [])
  useEffect(() => { _cache.dados = dados }, [dados])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      setDados(await apiService.getProjFases())
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const proximaOrdem = () => {
    const ordens = dados.map(d => d.ordem).filter(o => o != null)
    return ordens.length ? Math.max(...ordens) + 1 : 1
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome: '', ativo: true, cor: '#1e293b', ordem: proximaOrdem() })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ nome: item.nome, ativo: item.ativo, cor: item.cor || '#1e293b', ordem: item.ordem ?? '' })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm({ nome: item.nome })
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form, ordem: form.ordem !== '' ? Number(form.ordem) : null }
      if (editingId) await apiService.updateProjFase(editingId, payload)
      else await apiService.createProjFase(payload)
      clearProjLookups('fases')
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar fase: ' + (err.message || String(err)))
    }
  }

  const handleSalvarOrdemInline = async (item) => {
    const novaOrdem = editandoOrdem?.valor === '' ? null : Number(editandoOrdem?.valor)
    setEditandoOrdem(null)
    if (novaOrdem === item.ordem) return
    try {
      await apiService.updateProjFase(item.id, { nome: item.nome, ativo: item.ativo, cor: item.cor, ordem: novaOrdem })
      await loadDados(true)
    } catch (err) {
      alert('Erro ao salvar ordem: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteProjFase(idExcluir)
      clearProjLookups('fases')
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir fase: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar fases</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadDados} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-md">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fases</h1>
          <p className="text-xs text-slate-500">Cadastre as fases utilizadas na Gestão de Projetos.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Fase
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-16 text-center">Ordem</th>
              <th className="p-3">Fase</th>
              <th className="p-3 w-24">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr><td colSpan="3" className="p-6 text-center text-slate-400">Nenhuma fase cadastrada.</td></tr>
            ) : dados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-center">
                  {canEdit && editandoOrdem?.id === item.id ? (
                    <input
                      type="number" min="1" autoFocus
                      value={editandoOrdem.valor}
                      onChange={e => setEditandoOrdem(prev => ({ ...prev, valor: e.target.value }))}
                      onBlur={() => handleSalvarOrdemInline(item)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.target.blur()
                        if (e.key === 'Escape') setEditandoOrdem(null)
                      }}
                      className="w-12 text-center text-[11px] font-bold p-1 border border-blue-400 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : canEdit ? (
                    <button
                      onClick={() => setEditandoOrdem({ id: item.id, valor: item.ordem ?? '' })}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 text-[11px] font-bold transition-colors"
                      title="Clique para editar a ordem"
                    >
                      {item.ordem ?? '—'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold">
                      {item.ordem ?? '—'}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className="text-xs font-bold" style={{ color: item.cor || '#1e293b' }}>{item.nome}</span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons menuPath="proj-fases" onView={() => abrirVisualizar(item)} onEdit={() => abrirEditar(item)} onDelete={() => abrirExcluir(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Fase' : 'Incluir Nova Fase'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 w-24">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ordem</label>
                    <input type="number" min="1" value={form.ordem} onChange={e => setForm(prev => ({ ...prev, ordem: e.target.value }))}
                      placeholder="1" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center" />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome da Fase *</label>
                    <input type="text" required value={form.nome} onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                      placeholder="Ex: Planejamento, Execução, Encerramento" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cor da Fase</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.cor || '#1e293b'} onChange={e => setForm(prev => ({ ...prev, cor: e.target.value }))}
                      className="w-10 h-9 p-0.5 border border-slate-200 rounded-md cursor-pointer" />
                    <span className="text-sm font-bold" style={{ color: form.cor || '#1e293b' }}>
                      {form.nome || 'Prévia'}
                    </span>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Visualizar Fase</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome da Fase</span>
                <span className="text-xs font-bold" style={{ color: itemVisualizado.cor || '#1e293b' }}>{itemVisualizado.nome || '-'}</span>
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

      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir a fase <strong className="text-slate-800">"{form.nome}"</strong>?</p>
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
