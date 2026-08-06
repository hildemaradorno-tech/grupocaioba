import React, { useEffect, useState } from 'react'
import { Plus, X, AlertTriangle, Eye, Truck, Mail, Phone } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const _cache = { dados: null }
const FORM_VAZIO = { nome: '', contato_nome: '', email: '', telefone: '', ativo: true }

export default function Fornecedores() {
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('fornecedores', 'editar')

  useEffect(() => { loadDados(_cache.dados !== null) }, [])
  useEffect(() => { _cache.dados = dados }, [dados])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      setDados(await apiService.getFornecedores())
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(FORM_VAZIO)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ nome: item.nome, contato_nome: item.contato_nome || '', email: item.email || '', telefone: item.telefone || '', ativo: item.ativo })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm({ nome: item.nome })
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const handleSalvar = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        nome:         (form.nome || '').trim(),
        contato_nome: (form.contato_nome || '').trim() || null,
        email:        (form.email || '').trim() || null,
        telefone:     (form.telefone || '').trim() || null,
        ativo:        form.ativo ?? true,
      }
      if (editingId) await apiService.updateFornecedor(editingId, payload)
      else await apiService.createFornecedor(payload)
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar fornecedor: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteFornecedor(idExcluir)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir fornecedor: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-400">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar fornecedores</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={() => loadDados()} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-lg">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fornecedores</h1>
          <p className="text-xs text-slate-500">Cadastre os fornecedores utilizados nos custos de projetos.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Fornecedor
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Fornecedor</th>
              <th className="p-3">Contato</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">WhatsApp / Telefone</th>
              <th className="p-3 w-24">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400">Nenhum fornecedor cadastrado.</td></tr>
            ) : dados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold">
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-blue-500 shrink-0" /> {item.nome}
                  </div>
                </td>
                <td className="p-3 text-slate-600">{item.contato_nome || '—'}</td>
                <td className="p-3 text-slate-500">{item.email || '—'}</td>
                <td className="p-3 text-slate-500">{item.telefone || '—'}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons menuPath="fornecedores" onView={() => abrirVisualizar(item)} onEdit={() => abrirEditar(item)} onDelete={() => abrirExcluir(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal incluir/editar */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[460px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Fornecedor' : 'Incluir Fornecedor'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                {/* Nome */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Fornecedor *</label>
                  <input
                    type="text" required autoFocus
                    value={form.nome}
                    onChange={e => setForm(p => ({ ...p, nome: e.target.value.toUpperCase() }))}
                    placeholder="Ex: Print Copy, Amazon, Localweb…"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* Nome do Contato */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Contato</label>
                  <input
                    type="text"
                    value={form.contato_nome}
                    onChange={e => setForm(p => ({ ...p, contato_nome: e.target.value }))}
                    placeholder="Ex: João Silva, Maria Santos…"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {/* E-mail e Telefone lado a lado */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Mail className="h-3 w-3" /> E-mail
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="contato@empresa.com"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Phone className="h-3 w-3" /> WhatsApp / Telefone
                    </label>
                    <input
                      type="tel"
                      value={form.telefone}
                      onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))}
                      placeholder="(67) 9 9999-9999"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Ativo */}
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal visualizar */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Visualizar Fornecedor</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome || '—'}</span>
              </div>
              {itemVisualizado.contato_nome && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contato</span>
                  <span className="text-xs font-medium text-slate-700">{itemVisualizado.contato_nome}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</span>
                  <span className="text-xs text-slate-600">{itemVisualizado.email || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><Phone className="h-3 w-3" /> WhatsApp / Tel.</span>
                  <span className="text-xs text-slate-600">{itemVisualizado.telefone || '—'}</span>
                </div>
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

      {/* Modal excluir */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o fornecedor <strong className="text-slate-800">"{form.nome}"</strong>?</p>
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
