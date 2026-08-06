import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function Segmentos() {
  const [segmentos, setSegmentos] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useSessionState('seg_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('seg_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('seg_form', { nome_segmento: '', ativo: true })
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('segmentos', 'editar')
  const canDelete = hasPermission('segmentos', 'excluir')

  const abrirVisualizar = (seg) => { setItemVisualizado(seg); setModalVisualizarAberto(true) }

  const getAgrupamentosDoSegmento = (segId) =>
    agrupamentos.filter(a => a.segmento_id === segId).map(a => a.nome_agrupamento)

  useEffect(() => { loadSegmentos() }, [])

  const loadSegmentos = async () => {
    setLoading(true)
    setError(null)
    try {
      const [segs, agrup] = await Promise.all([
        apiService.getSegmentos(),
        apiService.getAgrupamentoEmpresas()
      ])
      setSegmentos(segs)
      setAgrupamentos(agrup)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome_segmento: '', ativo: true })
    setModalAberto(true)
  }

  const abrirEditar = (seg) => {
    setEditingId(seg.id)
    setForm({ nome_segmento: seg.nome_segmento, ativo: seg.ativo })
    setModalAberto(true)
  }

  const abrirExcluir = (seg) => {
    setIdExcluir(seg.id)
    setForm({ nome_segmento: seg.nome_segmento })
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      if (editingId) {
        await apiService.updateSegmento(editingId, form)
      } else {
        await apiService.createSegmento(form)
      }
      await loadSegmentos()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar segmento: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteSegmento(idExcluir)
      await loadSegmentos()
    } catch (err) {
      alert('Erro ao excluir segmento: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar segmentos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadSegmentos} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Segmentos</h1>
          <p className="text-xs text-slate-500">Cadastre os segmentos usados em Agrupamento Empresas e Empresas.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Segmento
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-40">Segmento</th>
              <th className="p-3">Agrupamento Empresas</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {segmentos.length === 0 ? (
              <tr>
                <td colSpan="3" className="p-6 text-center text-slate-400">Nenhum segmento cadastrado.</td>
              </tr>
            ) : segmentos.map(seg => {
              const agrupNomes = getAgrupamentosDoSegmento(seg.id)
              return (
              <tr key={seg.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold whitespace-nowrap">{seg.nome_segmento}</td>
                <td className="p-3">
                  {agrupNomes.length === 0 ? (
                    <span className="text-slate-300 text-[10px]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {agrupNomes.map(nome => (
                        <span key={nome} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {nome}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="segmentos"
                    onView={() => abrirVisualizar(seg)}
                    onEdit={() => abrirEditar(seg)}
                    onDelete={() => abrirExcluir(seg)}
                  />
                </td>
              </tr>
            )})}

          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Segmento' : 'Incluir Novo Segmento'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Segmento *</label>
                  <input
                    type="text"
                    required
                    value={form.nome_segmento}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_segmento: e.target.value }))}
                    placeholder="Ex: Caminhões"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Segmento
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Segmento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_segmento || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{itemVisualizado.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento Empresas</span>
                {getAgrupamentosDoSegmento(itemVisualizado.id).length === 0 ? (
                  <span className="text-xs text-slate-400">— Não utilizado —</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {getAgrupamentosDoSegmento(itemVisualizado.id).map(nome => (
                      <span key={nome} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {nome}
                      </span>
                    ))}
                  </div>
                )}
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
                  Deseja excluir o segmento <strong className="text-slate-800">"{form.nome_segmento}"</strong>? Agrupamentos e empresas vinculados perderão esta referência.
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
