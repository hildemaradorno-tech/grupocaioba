import React, { useEffect, useState } from 'react'
import { Plus, Edit2, Trash2, ShieldAlert, Tag, AlertTriangle } from 'lucide-react'
import { apiService } from '../../services/api'

const CORES = [
  { label: 'Cinza',    value: 'bg-slate-100 text-slate-700' },
  { label: 'Azul',     value: 'bg-blue-100 text-blue-700' },
  { label: 'Verde',    value: 'bg-green-100 text-green-700' },
  { label: 'Amarelo',  value: 'bg-yellow-100 text-yellow-700' },
  { label: 'Laranja',  value: 'bg-orange-100 text-orange-700' },
  { label: 'Vermelho', value: 'bg-red-100 text-red-700' },
  { label: 'Violeta',  value: 'bg-violet-100 text-violet-700' },
]

const VAZIO = { nome: '', cor: 'bg-slate-100 text-slate-700', ativo: true }

export default function AuditoriaSituacoes() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(VAZIO)
  const [editId, setEditId] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(false)
  const [idExcluir, setIdExcluir] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const load = async () => {
    setLoading(true)
    try { setLista(await apiService.getAuditoriaSituacoes()) }
    catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) return
    setSalvando(true); setErro(null)
    try {
      if (editId) await apiService.updateAuditoriaSituacao(editId, form)
      else await apiService.createAuditoriaSituacao(form)
      setForm(VAZIO); setEditId(null)
      await load()
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setSalvando(false) }
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({ nome: item.nome, cor: item.cor || 'bg-slate-100 text-slate-700', ativo: item.ativo })
  }

  const handleExcluir = async () => {
    setErro(null)
    try { await apiService.deleteAuditoriaSituacao(idExcluir); await load() }
    catch (e) { setErro(e.message || String(e)) }
    finally { setModalExcluir(false) }
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Tag className="h-5 w-5 text-indigo-600" /> Situações de Auditoria
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Cadastro de situações para classificar as OS nas auditorias.</p>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Formulário */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
          {editId ? 'Editar Situação' : 'Nova Situação'}
        </h2>
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Pendente, Aprovado, Recusado..."
              className="text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Cor</label>
            <select
              value={form.cor}
              onChange={e => setForm(p => ({ ...p, cor: e.target.value }))}
              className="text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white"
            >
              {CORES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Ativo</label>
            <select
              value={form.ativo ? 'true' : 'false'}
              onChange={e => setForm(p => ({ ...p, ativo: e.target.value === 'true' }))}
              className="text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white"
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Preview</label>
            <span className={`inline-flex px-2 py-1.5 rounded-md text-[11px] font-bold ${form.cor}`}>{form.nome || 'Situação'}</span>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {editId ? 'Salvar' : 'Adicionar'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setForm(VAZIO) }}
              className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
          )}
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">Nenhuma situação cadastrada.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3">Nome</th>
                <th className="p-3 text-center">Cor</th>
                <th className="p-3 text-center">Ativo</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {lista.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 font-semibold">{item.nome}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${item.cor || 'bg-slate-100 text-slate-700'}`}>{item.nome}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Editar">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => { setIdExcluir(item.id); setModalExcluir(true) }} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Remover Situação</h3>
                <p className="text-xs text-slate-500">Confirma a exclusão? A situação será removida do cadastro.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluir(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleExcluir} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
