import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Briefcase, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function AgrupamentoCargos() {
  const [dados, setDados] = useState([])
  const [cargos, setCargos] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('agrup_cgo_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('agrup_cgo_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('agrup_cgo_editid', null)
  const [nomeAgrupamento, setNomeAgrupamento] = useSessionState('agrup_cgo_nome', '')
  const [areaAgrupamento, setAreaAgrupamento] = useSessionState('agrup_cgo_area', '')
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('agrup-cargos', 'editar')
  const canDelete = hasPermission('agrup-cargos', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, cargosData, areasData] = await Promise.all([
        apiService.getAgrupamentoCargos(),
        apiService.getCargos(),
        apiService.getAreas(),
      ])
      setDados(data)
      setCargos(cargosData)
      setAreas(areasData.filter(a => a.ativo !== false))
    } catch (err) {
      console.error('Erro ao carregar agrupamentos', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setNomeAgrupamento('')
    setAreaAgrupamento('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setNomeAgrupamento(item.nome_agrupamento_cargo)
    setAreaAgrupamento(item.area || '')
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setNomeAgrupamento(item.nome_agrupamento_cargo)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      if (modo === 'incluir') {
        await apiService.createAgrupamentoCargo({ nome_agrupamento_cargo: nomeAgrupamento, area: areaAgrupamento || null, ativo: true })
      } else {
        await apiService.updateAgrupamentoCargo(idSelecionado, { nome_agrupamento_cargo: nomeAgrupamento, area: areaAgrupamento || null, ativo: true })
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar agrupamento', err)
      alert('Erro ao salvar: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteAgrupamentoCargo(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir agrupamento', err)
      alert('Erro ao excluir: ' + (err.message || String(err)))
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Agrupamento de Cargos</h1>
          <p className="text-xs text-slate-500">Defina as grandes categorias estruturais de funções para a organização do RH.</p>
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-1/4">Agrupamento de Cargos</th>
              <th className="p-3 w-28">Área</th>
              <th className="p-3">Cargos</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">Nenhum agrupamento cadastrado.</td>
              </tr>
            ) : (
              dados.map((item) => {
                const cargosDoAgrup = cargos.filter(c => c.agrupamento_id === item.id)
                return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {item.nome_agrupamento_cargo}
                    </div>
                  </td>
                  <td className="p-3">
                    {item.area
                      ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">{item.area}</span>
                      : <span className="text-slate-300">—</span>
                    }
                  </td>
                  <td className="p-3">
                    {cargosDoAgrup.length === 0 ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {cargosDoAgrup.map(c => (
                          <span key={c.id} className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200/80 text-[10px]">
                            {c.nome_cargo}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="agrup-cargos"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[450px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Novo Agrupamento' : 'Editar Agrupamento'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-4 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Agrupamento *</label>
                  <input
                    type="text"
                    required
                    value={nomeAgrupamento}
                    onChange={(e) => setNomeAgrupamento(e.target.value)}
                    placeholder="Ex: Operacional Oficina"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Área</label>
                  <select
                    value={areaAgrupamento}
                    onChange={(e) => setAreaAgrupamento(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">— Sem área —</option>
                    {areas.map(a => (
                      <option key={a.id} value={a.nome_area}>{a.nome_area}</option>
                    ))}
                  </select>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Agrupamento de Cargos</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Agrupamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_agrupamento_cargo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{itemVisualizado.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargos</span>
                {cargos.filter(c => c.agrupamento_id === itemVisualizado.id).length === 0 ? (
                  <span className="text-xs text-slate-400">Nenhum cargo vinculado.</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {cargos.filter(c => c.agrupamento_id === itemVisualizado.id).map(c => (
                      <span key={c.id} className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200/80 text-[10px]">
                        {c.nome_cargo}
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
                  Tem certeza que deseja excluir o agrupamento <strong className="text-slate-800">"{nomeAgrupamento}"</strong>? Os cargos associados a esta categoria perderão a referência estrutural.
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
