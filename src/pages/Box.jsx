import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Box as BoxIcon, CheckSquare, Square, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function Box() {
  const [setores, setSetores] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('box_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('box_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('box_editid', null)

  const [nomeBox, setNomeBox] = useSessionState('box_nome', '')
  const [setoresSelecionados, setSetoresSelecionados] = useSessionState('box_setores', [])
  const [departamentoAutoInfo, setDepartamentoAutoInfo] = useState('')
  const [areaAutoInfo, setAreaAutoInfo] = useState('')
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('box', 'editar')
  const canDelete = hasPermission('box', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [boxData, setoresData, departamentosData] = await Promise.all([
        apiService.getBox(),
        apiService.getSetores(),
        apiService.getDepartamentos()
      ])
      setDados(boxData)
      setSetores(setoresData)
      setDepartamentos(departamentosData)
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const toggleSetor = (id) => {
    setSetoresSelecionados(prev => {
      const novos = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
      setDepartamentoAutoInfo(getDeptosDoSetores(novos))
      setAreaAutoInfo(getAreaDoSetores(novos))
      return novos
    })
  }

  const handleSelecionarTodos = () => {
    setSetoresSelecionados(
      setoresSelecionados.length === setores.length ? [] : setores.map(s => s.id)
    )
  }

  const getDeptosDoSetores = (ids) => {
    if (!ids || ids.length === 0) return ''
    const deptoIds = [...new Set(
      ids.map(id => setores.find(s => s.id === id)?.departamento_id).filter(Boolean)
    )]
    return deptoIds.map(id => departamentos.find(d => d.id === id)?.nome_departamento).filter(Boolean).join(', ')
  }

  const getAreaDoSetores = (ids) => {
    if (!ids || ids.length === 0) return ''
    const deptoIds = [...new Set(
      ids.map(id => setores.find(s => s.id === id)?.departamento_id).filter(Boolean)
    )]
    const areas = [...new Set(
      deptoIds.map(id => departamentos.find(d => d.id === id)?.area).filter(Boolean)
    )]
    return areas.join(', ')
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setNomeBox('')
    setSetoresSelecionados([])
    setDepartamentoAutoInfo('')
    setAreaAutoInfo('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setNomeBox(item.nome_box)
    setSetoresSelecionados(item.setor_ids || [])
    setDepartamentoAutoInfo(getDeptosDoSetores(item.setor_ids || []))
    setAreaAutoInfo(getAreaDoSetores(item.setor_ids || []))
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setNomeBox(item.nome_box)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const payload = { nome_box: nomeBox, setor_ids: setoresSelecionados, ativo: true }
      if (modo === 'incluir') {
        await apiService.createBox(payload)
      } else {
        await apiService.updateBox(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar box', err)
      alert('Erro ao salvar box: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteBox(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir box', err)
      alert('Erro ao excluir box: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const renderSetoresVinculados = (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return '-'
    return ids
      .map(id => setores.find(s => s.id === id)?.nome_setor)
      .filter(Boolean)
      .join(', ')
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Box da Oficina</h1>
          <p className="text-xs text-slate-500">Cadastre as baias de serviços e vincule-as aos setores correspondentes.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Box
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-1/4">Nome do Box</th>
              <th className="p-3">Setores</th>
              <th className="p-3 w-1/5">Departamento</th>
              <th className="p-3 w-28">Área</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">Nenhum box cadastrado.</td>
              </tr>
            ) : (
              dados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0"></span>
                    {item.nome_box}
                  </td>
                  <td className="p-3 text-slate-500 truncate" title={renderSetoresVinculados(item.setor_ids)}>
                    <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-semibold border border-slate-200/60">
                      {renderSetoresVinculados(item.setor_ids)}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-xs">
                    {getDeptosDoSetores(item.setor_ids) || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-3">
                    {(() => {
                      const area = getAreaDoSetores(item.setor_ids)
                      return area
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${area === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{area}</span>
                        : <span className="text-slate-300">—</span>
                    })()}
                  </td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="box"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BoxIcon className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Novo Box' : 'Editar Nome do Box'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Identificação / Nome do Box *</label>
                  <input
                    type="text"
                    required
                    value={nomeBox}
                    onChange={(e) => setNomeBox(e.target.value)}
                    placeholder="Ex: Box 04 - Alinhamento Computadorizado"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setores *</label>
                    <button
                      type="button"
                      onClick={handleSelecionarTodos}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      {setoresSelecionados.length === setores.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                    </button>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 space-y-1 custom-scrollbar">
                    {setores.length === 0 ? (
                      <p className="text-xs text-slate-400 p-2">Nenhum setor cadastrado.</p>
                    ) : (
                      setores.map((s) => {
                        const estaSelecionado = setoresSelecionados.includes(s.id)
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleSetor(s.id)}
                            className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-xs font-semibold select-none ${
                              estaSelecionado
                                ? 'bg-blue-50/60 text-blue-900 border border-blue-200/50'
                                : 'text-slate-700 hover:bg-slate-100 border border-transparent'
                            }`}
                          >
                            {estaSelecionado ? (
                              <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-300 shrink-0" />
                            )}
                            <span>{s.nome_setor}</span>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {setoresSelecionados.length === 0 && (
                    <p className="text-[10px] text-red-500 font-semibold">* Atribua este Box a pelo menos um setor.</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Departamento</label>
                  {departamentoAutoInfo ? (
                    <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {departamentoAutoInfo}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Preenchido ao selecionar o(s) setor(es)</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Área</label>
                  {areaAutoInfo ? (
                    <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold border ${areaAutoInfo === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {areaAutoInfo}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Preenchido ao selecionar o(s) setor(es)</span>
                  )}
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
                  disabled={setoresSelecionados.length === 0}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Box</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Box</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_box || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamento</span>
                <span className="text-xs font-semibold text-slate-800">{getDeptosDoSetores(itemVisualizado.setor_ids) || '—'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Área</span>
                {(() => {
                  const area = getAreaDoSetores(itemVisualizado.setor_ids)
                  return area
                    ? <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${area === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>{area}</span>
                    : <span className="text-xs text-slate-400">—</span>
                })()}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Setores</span>
                <span className="text-xs font-semibold text-slate-800">{renderSetoresVinculados(itemVisualizado.setor_ids)}</span>
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
                  Tem certeza que deseja remover o <strong className="text-slate-800">"{nomeBox}"</strong>? Esta operação removerá de forma permanente as amarrações do Box com os setores selecionados.
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
