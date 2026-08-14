import React, { useState } from 'react'
import { Edit2, Trash2, Loader2, X, Check } from 'lucide-react'
import { apiService } from '../../services/api'

const fmtDataHora = (s) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) } catch { return s }
}

// Histórico de observações de um título (gar_titulos_observacoes) — usado tanto em
// "Editar Título" (Títulos a Receber) quanto em "Editar Garantia" (mesma fonte de dados,
// pela chave nro_titulo), para que as duas telas sempre mostrem a mesma informação.
export default function TituloObservacoesPanel({ nroTitulo, observacoes, podeEditar, bloqueado, userEmail, onChange }) {
  const [novoTexto, setNovoTexto] = useState('')
  const [salvandoNovo, setSalvandoNovo] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [salvandoId, setSalvandoId] = useState(null)
  const [excluindoId, setExcluindoId] = useState(null)

  const lista = (observacoes || []).filter(o => o.nro_titulo === nroTitulo)

  const adicionar = async () => {
    if (!novoTexto.trim() || !nroTitulo) return
    setSalvandoNovo(true)
    try {
      await apiService.createTituloObservacao(nroTitulo, novoTexto.trim(), userEmail)
      setNovoTexto('')
      await onChange()
    } catch (err) {
      alert('Erro ao salvar observação: ' + (err.message || String(err)))
    } finally {
      setSalvandoNovo(false)
    }
  }

  const iniciarEdicao = (o) => { setEditandoId(o.id); setTextoEdicao(o.observacao) }
  const cancelarEdicao = () => { setEditandoId(null); setTextoEdicao('') }

  const salvarEdicao = async (id) => {
    if (!textoEdicao.trim()) return
    setSalvandoId(id)
    try {
      await apiService.updateTituloObservacao(id, textoEdicao.trim(), userEmail)
      setEditandoId(null)
      await onChange()
    } catch (err) {
      alert('Erro ao salvar observação: ' + (err.message || String(err)))
    } finally {
      setSalvandoId(null)
    }
  }

  const excluir = async (id) => {
    if (!confirm('Excluir esta observação?')) return
    setExcluindoId(id)
    try {
      await apiService.deleteTituloObservacao(id)
      await onChange()
    } catch (err) {
      alert('Erro ao excluir observação: ' + (err.message || String(err)))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="space-y-2">
      {lista.length > 0 && (
        <div className="space-y-1.5">
          {lista.map(o => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-md px-3 py-2">
              {editandoId === o.id ? (
                <div className="space-y-1.5">
                  <textarea
                    value={textoEdicao}
                    onChange={e => setTextoEdicao(e.target.value)}
                    rows={3}
                    className="w-full text-xs p-2 border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={cancelarEdicao} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Cancelar">
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => salvarEdicao(o.id)}
                      disabled={salvandoId === o.id}
                      className="p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                      title="Salvar"
                    >
                      {salvandoId === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-xs text-slate-700 whitespace-pre-wrap">{o.observacao}</p>
                  {podeEditar && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => iniciarEdicao(o)} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Editar">
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => excluir(o.id)}
                        disabled={excluindoId === o.id}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Excluir"
                      >
                        {excluindoId === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {o.atualizado_por || '—'} · {fmtDataHora(o.atualizado_em || o.criado_em)}
              </p>
            </div>
          ))}
        </div>
      )}

      {podeEditar && (
        bloqueado ? (
          <p className="text-[11px] text-orange-600 bg-orange-50 border border-orange-200 rounded-md px-2.5 py-1.5">
            Vincule este título a uma OS em Garantias DAF Faturadas antes de adicionar observações.
          </p>
        ) : (
          <div className="flex items-start gap-2">
            <textarea
              value={novoTexto}
              onChange={e => setNovoTexto(e.target.value)}
              rows={2}
              placeholder="Adicionar nova observação..."
              className="flex-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none"
            />
            <button
              onClick={adicionar}
              disabled={salvandoNovo || !novoTexto.trim()}
              className="shrink-0 px-3 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {salvandoNovo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Adicionar'}
            </button>
          </div>
        )
      )}

      {lista.length === 0 && !podeEditar && (
        <p className="text-[11px] text-slate-400">Nenhuma observação registrada.</p>
      )}
    </div>
  )
}
