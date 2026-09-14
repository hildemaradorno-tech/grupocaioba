import React, { useEffect, useState } from 'react'
import { X, Trash2, Plus, Loader2, Pencil, Check } from 'lucide-react'
import { apiService } from '../../services/api'

const hoje = new Date().toISOString().slice(0, 10)

export default function DeliberacoesModal({ tarefa, onClose }) {
  const [deliberacoes, setDeliberacoes] = useState([])
  const [nova, setNova] = useState({ data: hoje, texto: '' })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(null) // { id, data, texto }
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  useEffect(() => {
    apiService.getDeliberacoes(tarefa.id)
      .then(setDeliberacoes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tarefa.id])

  const salvar = async () => {
    if (!nova.texto.trim()) return
    setSalvando(true)
    try {
      await apiService.createDeliberacao(tarefa.id, nova.data || hoje, nova.texto.trim(), null)
      const rows = await apiService.getDeliberacoes(tarefa.id)
      setDeliberacoes(rows)
      setNova({ data: hoje, texto: '' })
    } finally { setSalvando(false) }
  }

  const excluir = async (id) => {
    await apiService.deleteDeliberacao(id)
    setDeliberacoes(prev => prev.filter(x => x.id !== id))
  }

  const salvarEdicao = async () => {
    if (!editando?.texto.trim()) return
    setSalvandoEdit(true)
    try {
      await apiService.updateDeliberacao(editando.id, editando.data, editando.texto.trim())
      setDeliberacoes(prev => prev.map(x => x.id === editando.id ? { ...x, data: editando.data, texto: editando.texto.trim() } : x))
      setEditando(null)
    } finally { setSalvandoEdit(false) }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[520px] max-h-[80vh] shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Deliberações</h3>
            <p className="text-[11px] text-slate-500 truncate max-w-[400px]">{tarefa.nome}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : deliberacoes.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic text-center py-6">Nenhuma deliberação registrada.</p>
          ) : deliberacoes.map(d => (
            <div key={d.id} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded px-3 py-2">
              {editando?.id === d.id ? (
                <div className="flex-1 flex flex-col gap-1.5">
                  <input
                    type="date"
                    value={editando.data}
                    onChange={e => setEditando(p => ({ ...p, data: e.target.value }))}
                    className="text-xs p-1 border border-blue-300 rounded w-32 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <textarea
                    autoFocus
                    rows={5}
                    value={editando.texto}
                    onChange={e => setEditando(p => ({ ...p, texto: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Escape') setEditando(null); if (e.key === 'Enter' && e.ctrlKey) salvarEdicao() }}
                    className="w-full text-xs p-1.5 border border-blue-300 rounded resize-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => setEditando(null)} className="text-[11px] px-2 py-0.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors">
                      Cancelar
                    </button>
                    <button
                      disabled={!editando.texto.trim() || salvandoEdit}
                      onClick={salvarEdicao}
                      className="text-[11px] px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-colors flex items-center gap-1"
                    >
                      {salvandoEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-slate-400 shrink-0 font-medium whitespace-nowrap">
                    {d.data ? new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                  </span>
                  <span className="flex-1 leading-relaxed">{d.texto}</span>
                  <button
                    onClick={() => setEditando({ id: d.id, data: d.data || hoje, texto: d.texto })}
                    className="shrink-0 text-slate-300 hover:text-blue-500 transition-colors mt-0.5"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => excluir(d.id)}
                    className="shrink-0 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Nova deliberação */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          <input
            type="date"
            value={nova.data}
            onChange={e => setNova(prev => ({ ...prev, data: e.target.value }))}
            className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 w-32"
          />
          <textarea
            rows={5}
            value={nova.texto}
            onChange={e => setNova(prev => ({ ...prev, texto: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) salvar() }}
            placeholder="Nova deliberação... (Ctrl+Enter para salvar)"
            className="w-full text-xs p-1.5 border border-slate-200 rounded-md resize-none focus:ring-2 focus:ring-blue-500/20"
          />
          <div className="flex justify-end">
            <button
              disabled={!nova.texto.trim() || salvando}
              onClick={salvar}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors flex items-center gap-1"
            >
              {salvando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
