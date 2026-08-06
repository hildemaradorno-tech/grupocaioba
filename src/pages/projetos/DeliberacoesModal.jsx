import React, { useEffect, useState } from 'react'
import { X, Trash2, Plus, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'

const hoje = new Date().toISOString().slice(0, 10)

export default function DeliberacoesModal({ tarefa, onClose }) {
  const [deliberacoes, setDeliberacoes] = useState([])
  const [nova, setNova] = useState({ data: hoje, texto: '' })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

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
              <span className="text-slate-400 shrink-0 font-medium whitespace-nowrap">
                {d.data ? new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
              </span>
              <span className="flex-1 leading-relaxed">{d.texto}</span>
              <button
                onClick={() => excluir(d.id)}
                className="shrink-0 text-slate-300 hover:text-red-500 transition-colors mt-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Nova deliberação */}
        <div className="border-t border-slate-100 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={nova.data}
              onChange={e => setNova(prev => ({ ...prev, data: e.target.value }))}
              className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 w-32 shrink-0"
            />
            <input
              type="text"
              value={nova.texto}
              onChange={e => setNova(prev => ({ ...prev, texto: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') salvar() }}
              placeholder="Nova deliberação... (Enter para salvar)"
              className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              disabled={!nova.texto.trim() || salvando}
              onClick={salvar}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0 flex items-center gap-1"
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
