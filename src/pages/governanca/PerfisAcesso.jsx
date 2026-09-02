import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, ShieldCheck, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'

const SISTEMAS = ['Dealer.net', 'MicroWork']

const SISTEMA_COR = {
  'Dealer.net': 'bg-blue-50 text-blue-700 border-blue-200',
  'MicroWork':  'bg-purple-50 text-purple-700 border-purple-200',
}

export default function PerfisAcesso() {
  const [dados, setDados]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const [filtroSistema, setFiltroSistema] = useSessionState('governanca_perfil_filtro', '')

  const [modalAberto, setModalAberto]     = useSessionState('governanca_perfil_modal', false)
  const [modo, setModo]                   = useSessionState('governanca_perfil_modo', 'incluir')
  const [idSelecionado, setIdSelecionado] = useSessionState('governanca_perfil_editid', null)
  const [nome, setNome]                   = useSessionState('governanca_perfil_nome', '')
  const [sistema, setSistema]             = useSessionState('governanca_perfil_sistema', SISTEMAS[0])
  const [descricao, setDescricao]         = useSessionState('governanca_perfil_descricao', '')

  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('governanca/perfis-acesso', 'editar')
  const canDelete = hasPermission('governanca/perfis-acesso', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const listas = await Promise.all(SISTEMAS.map(s => apiService.getGovernancaPerfis(s)))
      setDados(listas.flat())
    } catch (err) {
      console.error('Erro ao carregar perfis de acesso', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setModo('incluir')
    setNome('')
    setSistema(SISTEMAS[0])
    setDescricao('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setModo('editar')
    setIdSelecionado(item.id)
    setNome(item.nome)
    setSistema(item.sistema)
    setDescricao(item.descricao || '')
    setModalAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const abrirExcluir = (item) => {
    setIdSelecionado(item.id)
    setNome(item.nome)
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      const payload = { nome, sistema, descricao }
      if (modo === 'incluir') {
        await apiService.createGovernancaPerfil(payload)
      } else {
        await apiService.updateGovernancaPerfil(idSelecionado, payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      console.error('Erro ao salvar perfil', err)
      alert('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteGovernancaPerfil(idSelecionado)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir perfil', err)
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const dadosFiltrados = filtroSistema ? dados.filter(d => d.sistema === filtroSistema) : dados

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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Perfis de Acesso</h1>
          <p className="text-xs text-slate-500">Cadastro dos perfis de acesso de cada sistema externo (Dealer.net, MicroWork).</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Perfil
          </button>
        )}
      </div>

      {/* FILTRO POR SISTEMA */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setFiltroSistema('')}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${!filtroSistema ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
        >
          Todos
        </button>
        {SISTEMAS.map(s => (
          <button
            key={s}
            onClick={() => setFiltroSistema(s)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${filtroSistema === s ? SISTEMA_COR[s] : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-1/3">Perfil</th>
              <th className="p-3 w-32">Sistema</th>
              <th className="p-3">Descrição</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-6 text-center text-slate-400">Nenhum perfil cadastrado.</td>
              </tr>
            ) : (
              dadosFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {item.nome}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${SISTEMA_COR[item.sistema] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {item.sistema}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{item.descricao || <span className="text-slate-300">—</span>}</td>
                  <td className="p-3">
                    <PermissionActionButtons
                      menuPath="governanca/perfis-acesso"
                      onView={() => abrirVisualizar(item)}
                      onEdit={canEdit ? () => abrirEditar(item) : undefined}
                      onDelete={canDelete ? () => abrirExcluir(item) : undefined}
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
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                {modo === 'incluir' ? 'Novo Perfil' : 'Editar Perfil'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-4 space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Perfil *</label>
                  <input
                    type="text"
                    autoFocus
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Vendedor, Gerente Financeiro..."
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistema *</label>
                  <select
                    required
                    value={sistema}
                    onChange={(e) => setSistema(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {SISTEMAS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Descrição do perfil"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-800 resize-none"
                  />
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
                  disabled={salvando}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-sm transition-colors"
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
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Perfil</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Perfil</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sistema</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${SISTEMA_COR[itemVisualizado.sistema] || ''}`}>{itemVisualizado.sistema}</span>
              </div>
              {itemVisualizado.descricao && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                  <span className="text-xs text-slate-600">{itemVisualizado.descricao}</span>
                </div>
              )}
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
                  Tem certeza que deseja excluir o perfil <strong className="text-slate-800">"{nome}"</strong>? Essa ação não pode ser desfeita.
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
