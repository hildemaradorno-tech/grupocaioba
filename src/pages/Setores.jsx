import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, FolderTree, Layers, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

export default function Setores() {
  const location = useLocation()
  const navigate = useNavigate()
  const [departamentos, setDepartamentos] = useState([])
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('set_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modo, setModo] = useSessionState('set_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('set_editid', null)

  const [nomeSetor, setNomeSetor] = useSessionState('set_nome', '')
  const [departamentoSelecionado, setDepartamentoSelecionado] = useSessionState('set_depto', '')
  const [agrupamentoDepto, setAgrupamentoDepto] = useState('')
  const [tipoSetor, setTipoSetor] = useSessionState('set_tipo', '')
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('setores', 'editar')
  const canDelete = hasPermission('setores', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [setoresData, departamentosData] = await Promise.all([
        apiService.getSetores(),
        apiService.getDepartamentos()
      ])
      setDados(setoresData)
      setDepartamentos(departamentosData)
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setNomeSetor('')
    const primeiroDepto = departamentos[0]
    setDepartamentoSelecionado(primeiroDepto?.id || '')
    setAgrupamentoDepto(primeiroDepto?.agrupamento_departamento_nome || '')
    setTipoSetor('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setNomeSetor(item.nome_setor)
    setDepartamentoSelecionado(item.departamento_id)
    const depto = departamentos.find(d => d.id === item.departamento_id)
    setAgrupamentoDepto(depto?.agrupamento_departamento_nome || '')
    setTipoSetor(item.tipo_setor || '')
    setModalAberto(true)
  }

  // Veio de outra tela (ex: Organograma, clicando no lápis de editar) pedindo pra abrir direto
  // a edição de um setor específico — consome o state da navegação uma única vez.
  useEffect(() => {
    const idParaEditar = location.state?.editarId
    if (!idParaEditar || dados.length === 0) return
    const item = dados.find(s => s.id === idParaEditar)
    if (item) abrirEditar(item)
    navigate(location.pathname, { replace: true, state: {} })
  }, [dados, location.state])

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setNomeSetor(item.nome_setor)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const payload = { nome_setor: nomeSetor, departamento_id: departamentoSelecionado, tipo_setor: tipoSetor || null, ativo: true }
      if (modo === 'incluir') {
        await apiService.createSetor(payload)
      } else {
        await apiService.updateSetor(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar setor', err)
      alert('Erro ao salvar setor: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteSetor(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir setor', err)
      alert('Erro ao excluir setor: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const getDepartamentoNome = (id) => departamentos.find(d => d.id === id)?.nome_departamento || '-'

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Setor de Serviços</h1>
          <p className="text-xs text-slate-500">Cadastre os setores específicos vinculando-os aos Departamentos.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Setor
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Setor</th>
              <th className="p-3">Departamento</th>
              <th className="p-3">Agrupamento Depto.</th>
              <th className="p-3 w-40">Tipo</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">Nenhum setor cadastrado.</td>
              </tr>
            ) : (
              dados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold">{item.nome_setor}</td>
                  <td className="p-3 text-slate-600 font-semibold">{getDepartamentoNome(item.departamento_id)}</td>
                  <td className="p-3">
                    {(() => {
                      const depto = departamentos.find(d => d.id === item.departamento_id)
                      return depto?.agrupamento_departamento_nome
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{depto.agrupamento_departamento_nome}</span>
                        : <span className="text-slate-300">—</span>
                    })()}
                  </td>
                  <td className="p-3">
                    {item.tipo_setor === 'consultoria' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-700">Consultoria</span>}
                    {item.tipo_setor === 'manutencao_reparo' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Manutenção / Reparo</span>}
                    {item.tipo_setor === 'vendas_balcao' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">Vendas Balcão</span>}
                    {item.tipo_setor === 'departamento' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Departamento</span>}
                    {!item.tipo_setor && <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="setores"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[450px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Incluir Novo Setor' : 'Editar Setor'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Setor *</label>
                  <input
                    type="text"
                    required
                    value={nomeSetor}
                    onChange={(e) => setNomeSetor(e.target.value)}
                    placeholder="Ex: Oficina Mecânica Pesada"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                    <Layers className="h-3 w-3" /> Departamento *
                  </label>
                  <select
                    value={departamentoSelecionado}
                    onChange={(e) => {
                      const id = e.target.value
                      setDepartamentoSelecionado(id)
                      const depto = departamentos.find(d => d.id === id)
                      setAgrupamentoDepto(depto?.agrupamento_departamento_nome || '')
                    }}
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione um departamento</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento Depto.</label>
                  {agrupamentoDepto ? (
                    <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {agrupamentoDepto}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Preenchido ao selecionar o departamento</span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_setor"
                        value="consultoria"
                        checked={tipoSetor === 'consultoria'}
                        onChange={() => setTipoSetor('consultoria')}
                        className="accent-purple-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Consultoria</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_setor"
                        value="manutencao_reparo"
                        checked={tipoSetor === 'manutencao_reparo'}
                        onChange={() => setTipoSetor('manutencao_reparo')}
                        className="accent-amber-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Manutenção / Reparo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_setor"
                        value="vendas_balcao"
                        checked={tipoSetor === 'vendas_balcao'}
                        onChange={() => setTipoSetor('vendas_balcao')}
                        className="accent-blue-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Vendas Balcão</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="tipo_setor"
                        value="departamento"
                        checked={tipoSetor === 'departamento'}
                        onChange={() => setTipoSetor('departamento')}
                        className="accent-green-600"
                      />
                      <span className="text-xs font-medium text-slate-700">Departamento</span>
                    </label>
                  </div>
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
                  disabled={!departamentoSelecionado}
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
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Setor</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Setor</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome_setor || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamento</span>
                <span className="text-xs font-semibold text-slate-800">{getDepartamentoNome(itemVisualizado.departamento_id)}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento Depto.</span>
                {(() => {
                  const depto = departamentos.find(d => d.id === itemVisualizado.departamento_id)
                  return depto?.agrupamento_departamento_nome
                    ? <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">{depto.agrupamento_departamento_nome}</span>
                    : <span className="text-xs text-slate-400">—</span>
                })()}
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo</span>
                <span className="text-xs font-semibold text-slate-800">
                  {itemVisualizado.tipo_setor === 'consultoria' ? 'Consultoria' : itemVisualizado.tipo_setor === 'manutencao_reparo' ? 'Manutenção / Reparo' : itemVisualizado.tipo_setor === 'vendas_balcao' ? 'Vendas Balcão' : '—'}
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
                  Deseja realmente excluir o setor <strong className="text-slate-800">"{nomeSetor}"</strong>? Os cruzamentos analíticos associados a esta ramificação serão desconectados.
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
