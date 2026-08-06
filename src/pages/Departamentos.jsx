import React, { useState, useEffect } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Layers, CheckSquare, Square, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function Departamentos() {
  const [empresasCadastradas, setEmpresasCadastradas] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados de controle dos Modais
  const [modalAberto, setModalAberto] = useSessionState('dep_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)

  // Estado do formulário
  const [modo, setModo] = useSessionState('dep_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('dep_editid', null)
  const [nomeDepartamento, setNomeDepartamento] = useSessionState('dep_nome', '')
  const [empresasSelecionadas, setEmpresasSelecionadas] = useSessionState('dep_empresas', [])
  const [agrupamentoId, setAgrupamentoId] = useSessionState('dep_agrupid', '')
  const [area, setArea] = useSessionState('dep_area', '')
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('departamentos', 'editar')
  const canDelete = hasPermission('departamentos', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [empresasData, departamentosData, agrupamentosData] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getDepartamentos(),
        apiService.getAgrupamentoDepartamentos()
      ])
      setEmpresasCadastradas(empresasData)
      setDados(departamentosData)
      setAgrupamentos(agrupamentosData)
    } catch (err) {
      console.error('Erro ao carregar departamentos', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  // Alternar seleção de uma empresa individualmente
  const toggleEmpresa = (id) => {
    if (empresasSelecionadas.includes(id)) {
      setEmpresasSelecionadas(empresasSelecionadas.filter(item => item !== id))
    } else {
      setEmpresasSelecionadas([...empresasSelecionadas, id])
    }
  }

  // Botão Selecionar Todas / Limpar Todas
  const handleSelecionarTodas = () => {
    if (empresasSelecionadas.length === empresasCadastradas.length) {
      setEmpresasSelecionadas([])
    } else {
      setEmpresasSelecionadas(empresasCadastradas.map(e => e.id))
    }
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setNomeDepartamento('')
    setEmpresasSelecionadas([])
    setAgrupamentoId('')
    setArea('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setNomeDepartamento(item.nome_departamento)
    setEmpresasSelecionadas(item.empresa_ids || [])
    setAgrupamentoId(item.agrupamento_departamento_id || '')
    const agrupObj = agrupamentos.find(a => a.id === item.agrupamento_departamento_id)
    setArea(agrupObj?.area || item.area || '')
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setNomeDepartamento(item.nome_departamento)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!nomeDepartamento.trim() || empresasSelecionadas.length === 0) return

    try {
      const agrupObj = agrupamentos.find(a => a.id === agrupamentoId)
      const payload = {
        nome_departamento: nomeDepartamento,
        empresa_ids: empresasSelecionadas,
        agrupamento_departamento_id: agrupamentoId || null,
        agrupamento_departamento_nome: agrupObj?.nome_agrupamento || null,
        area: agrupObj?.area || null,
        ativo: true
      }

      if (modo === 'incluir') {
        await apiService.createDepartamento(payload)
      } else {
        await apiService.updateDepartamento(idSelecionado, payload)
      }

      setModalAberto(false)
      await loadData()
    } catch (err) {
      console.error('Erro ao salvar departamento', err)
      alert('Erro ao salvar departamento: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteDepartamento(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir departamento', err)
      alert('Erro ao excluir departamento: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar departamentos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  const renderEmpresasVinculadas = (ids) => {
    return ids.map(id => {
      const emp = empresasCadastradas.find(e => e.id === id)
      return emp ? (emp.empresa_fantasia || emp.nome_empresa || emp.sigla_empresa) : ''
    }).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')).join(', ')
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Departamentos</h1>
          <p className="text-xs text-slate-500">Cadastre departamentos e defina em quais empresas da holding eles operam.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Departamento
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-64">Departamento</th>
              <th className="p-3 w-48">Agrupamento</th>
              <th className="p-3 w-40">Área</th>
              <th className="p-3 w-28 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold">{item.nome_departamento}</td>
                <td className="p-3 text-slate-600 text-xs">
                  {item.agrupamento_departamento_nome
                    ? <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold">{item.agrupamento_departamento_nome}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="p-3 text-slate-600 text-xs">
                  {item.area
                    ? <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-semibold">{item.area}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="departamentos"
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

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Novo Departamento' : 'Editar Departamento'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Departamento *</label>
                  <input
                    type="text"
                    required
                    value={nomeDepartamento}
                    onChange={(e) => setNomeDepartamento(e.target.value)}
                    placeholder="Ex: Pós-Vendas"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento de Departamento</label>
                  <select
                    value={agrupamentoId}
                    onChange={(e) => {
                      const id = e.target.value
                      setAgrupamentoId(id)
                      const agrupObj = agrupamentos.find(a => a.id === id)
                      setArea(agrupObj?.area || '')
                    }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">— Sem agrupamento —</option>
                    {agrupamentos.map(a => (
                      <option key={a.id} value={a.id}>{a.nome_agrupamento}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Área</label>
                  {area ? (
                    <span className={`inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold border ${area === 'Vendas' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {area}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Preenchido automaticamente ao selecionar o agrupamento</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Vincular Empresas *</label>
                    <button
                      type="button"
                      onClick={handleSelecionarTodas}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      {empresasSelecionadas.length === empresasCadastradas.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
                    </button>
                  </div>

                  <div className="max-h-[160px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 space-y-1 custom-scrollbar">
                    {empresasCadastradas.map((emp) => {
                      const estaSelecionado = empresasSelecionadas.includes(emp.id)
                      return (
                        <div
                          key={emp.id}
                          onClick={() => toggleEmpresa(emp.id)}
                          className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-xs font-semibold select-none ${estaSelecionado ? 'bg-blue-50/60 text-blue-900 border border-blue-200/50' : 'text-slate-700 hover:bg-slate-100 border border-transparent'}`}
                        >
                          {estaSelecionado ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                          <span>{emp.empresa_fantasia || emp.nome_empresa || emp.sigla_empresa}</span>
                        </div>
                      )
                    })}
                  </div>
                  {empresasSelecionadas.length === 0 && (
                    <p className="text-[10px] text-red-500 font-semibold">* Escolha ao menos uma empresa para este departamento.</p>
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
                  disabled={empresasSelecionadas.length === 0}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[440px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Departamento</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Departamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_departamento || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_departamento_nome || '—'}</span>
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
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresas Vinculadas</span>
                {(() => {
                  const nomes = (itemVisualizado.empresa_ids || [])
                    .map(id => {
                      const emp = empresasCadastradas.find(e => e.id === id)
                      return emp ? (emp.empresa_fantasia || emp.nome_empresa || emp.sigla_empresa) : null
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
                  return nomes.length > 0
                    ? <div className="flex flex-col gap-1">
                        {nomes.map((nome, i) => (
                          <span key={i} className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1">{nome}</span>
                        ))}
                      </div>
                    : <span className="text-xs text-slate-400">—</span>
                })()}
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
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja deletar o departamento <strong className="text-slate-800">"{nomeDepartamento}"</strong>? Essa ação removerá automaticamente todos os vínculos de empresas ativos.
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
