import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, FileCheck2, ArrowUpRight, ArrowDownLeft, Eye } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const FORM_VAZIO = {
  agrupamento_empresa_id: '',
  codigo: '',
  natureza_operacao: '',
  movimento_venda_id: '',
  movimento_venda_descricao: '',
  grupo_movimento: 'Compra'
}

export default function NaturezaOperacoes() {
  const [items, setItems] = useState([])
  const [agrupamentos, setAgrupamentos] = useState([])
  const [movimentos, setMovimentos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('natop_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('natop_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('natop_form', FORM_VAZIO)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('natureza-operacoes', 'editar')
  const canDelete = hasPermission('natureza-operacoes', 'excluir')
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [naturezas, agrupamentosData, movimentosData] = await Promise.all([
        apiService.getNaturezaOperacoes(),
        apiService.getAgrupamentoEmpresas(),
        apiService.getMovimentoVenda()
      ])
      setItems(naturezas)
      setAgrupamentos(agrupamentosData)
      setMovimentos(movimentosData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO, agrupamento_empresa_id: agrupamentos[0]?.id || '' })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    const mov = movimentos.find(m => m.id === item.movimento_venda_id)
    setForm({
      agrupamento_empresa_id: item.agrupamento_empresa_id || '',
      codigo: item.codigo || '',
      natureza_operacao: item.natureza_operacao || '',
      movimento_venda_id: item.movimento_venda_id || '',
      movimento_venda_descricao: mov?.tipo_movimento || '',
      grupo_movimento: item.grupo_movimento || 'Compra'
    })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, codigo: item.codigo, natureza_operacao: item.natureza_operacao }))
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const agObj = agrupamentos.find(g => g.id === form.agrupamento_empresa_id)
      const payload = {
        agrupamento_empresa_id: form.agrupamento_empresa_id,
        agrupamento_nome: agObj?.nome_agrupamento || '',
        codigo: parseInt(form.codigo),
        natureza_operacao: form.natureza_operacao,
        movimento_venda_id: form.movimento_venda_id || null,
        movimento_venda_descricao: form.movimento_venda_descricao || '',
        grupo_movimento: form.grupo_movimento
      }
      if (editingId) {
        await apiService.updateNaturezaOperacao(editingId, payload)
      } else {
        await apiService.createNaturezaOperacao(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar natureza de operação: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteNaturezaOperacao(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir natureza de operação: ' + (err.message || String(err)))
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Natureza de Operações</h1>
          <p className="text-xs text-slate-500">Gerencie e classifique as regras fiscais de movimentação de entrada e saída por grupo econômico.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Natureza
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-28 text-center">Código</th>
              <th className="p-3 w-2/5">Natureza de Operação</th>
              <th className="p-3 w-36">Grupo Movimento</th>
              <th className="p-3">Agrupamento Empresas</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {items.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">Nenhuma natureza de operação cadastrada.</td>
              </tr>
            ) : items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-center text-slate-900 font-mono font-bold bg-slate-50/30">{item.codigo}</td>
                <td className="p-3 text-slate-900 font-bold">{item.natureza_operacao}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold ${
                    item.grupo_movimento === 'Compra' || item.grupo_movimento === 'Devolução de Venda' || item.grupo_movimento === 'Outras Entradas'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {item.grupo_movimento === 'Compra' || item.grupo_movimento === 'Devolução de Venda' || item.grupo_movimento === 'Outras Entradas'
                      ? <ArrowDownLeft className="h-3 w-3" />
                      : <ArrowUpRight className="h-3 w-3" />}
                    {item.grupo_movimento}
                  </span>
                </td>
                <td className="p-3 text-slate-500">{item.agrupamento_nome || '-'}</td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="natureza-operacoes"
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
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Natureza de Operação' : 'Incluir Natureza de Operação'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento Empresas *</label>
                  <select
                    value={form.agrupamento_empresa_id}
                    onChange={(e) => setForm(prev => ({ ...prev, agrupamento_empresa_id: e.target.value }))}
                    required
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione o agrupamento</option>
                    {agrupamentos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome_agrupamento}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código *</label>
                    <input
                      type="number"
                      required
                      value={form.codigo}
                      onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                      placeholder="Ex: 5102"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Grupo Movimento *</label>
                    <select
                      value={form.grupo_movimento}
                      onChange={(e) => setForm(prev => ({ ...prev, grupo_movimento: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="Compra">Compra</option>
                      <option value="Vendas">Vendas</option>
                      <option value="Devolução de Venda">Devolução de Venda</option>
                      <option value="Devolução de Compra">Devolução de Compra</option>
                      <option value="Outras Entradas">Outras Entradas</option>
                      <option value="Outras Saídas">Outras Saídas</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Natureza de Operação *</label>
                  <input
                    type="text"
                    required
                    value={form.natureza_operacao}
                    onChange={(e) => setForm(prev => ({ ...prev, natureza_operacao: e.target.value }))}
                    placeholder="Ex: Venda de produção do estabelecimento"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo de Movimento *</label>
                  <select
                    required
                    value={form.movimento_venda_id}
                    onChange={(e) => {
                      const mov = movimentos.find(m => m.id === e.target.value)
                      setForm(prev => ({ ...prev, movimento_venda_id: e.target.value, movimento_venda_descricao: mov?.tipo_movimento || '' }))
                    }}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione o tipo de movimento</option>
                    {movimentos.map(m => (
                      <option key={m.id} value={m.id}>{m.tipo_movimento}</option>
                    ))}
                  </select>
                </div>
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
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Natureza de Operação</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-mono font-bold text-slate-800">{itemVisualizado.codigo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grupo Movimento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.grupo_movimento || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Natureza de Operação</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.natureza_operacao || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo de Movimento</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.movimento_venda_descricao || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento Empresas</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.agrupamento_nome || '-'}</span>
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
                  Tem certeza que deseja remover a natureza de operação <strong className="text-slate-800">"{form.codigo} - {form.natureza_operacao}"</strong>? Esta ação pode impactar os agrupamentos e filtros fiscais gerados no Power BI.
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
