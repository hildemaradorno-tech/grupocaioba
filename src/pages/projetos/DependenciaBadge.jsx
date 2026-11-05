import React, { useState } from 'react'
import { Link2, CheckCircle2, Clock } from 'lucide-react'

const STATUS_LABEL = {
  mapeado: 'Mapeado',
  programado: 'Programado',
  em_andamento: 'Em Andamento',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

const textoPlano = (s) => (s || '').replace(/\*\*?/g, '')

export default function DependenciaBadge({ deps, projetoAtualId }) {
  const [pos, setPos] = useState(null)
  if (!deps || deps.length === 0) return null

  const pendentes = deps.filter(d => d.predecessora && d.predecessora.status_kanban !== 'concluido')
  const bloqueada = pendentes.length > 0

  const abrir = (e) => {
    e.stopPropagation()
    if (pos) { setPos(null); return }
    const r = e.currentTarget.getBoundingClientRect()
    const abaixo = window.innerHeight - r.bottom > 220
    setPos(abaixo ? { top: r.bottom + 4, left: r.left } : { bottom: window.innerHeight - r.top + 4, left: r.left })
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title={bloqueada ? `Aguardando ${pendentes.length} de ${deps.length} dependência(s)` : 'Todas as dependências concluídas'}
        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
          bloqueada
            ? 'bg-slate-600 border-slate-700 text-white hover:bg-slate-700'
            : 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300'
        }`}
      >
        <Link2 className="h-3 w-3" />
        {bloqueada ? `Depende (${pendentes.length})` : 'Liberada'}
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-30" onClick={e => { e.stopPropagation(); setPos(null) }} />
          <div
            className="fixed z-40 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-2"
            style={pos}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase text-slate-500 px-1 pb-1.5">Depende de</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {deps.map(d => {
                const p = d.predecessora
                if (!p) return null
                const ok = p.status_kanban === 'concluido'
                const outroProjeto = p.projeto_id !== projetoAtualId
                return (
                  <div key={d.id} className={`flex items-start gap-1.5 rounded px-1.5 py-1 text-[11px] ${ok ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                    {ok
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      : <Clock className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />}
                    <div className="min-w-0 flex-1">
                      {outroProjeto && <div className="text-[10px] font-semibold text-slate-500 truncate">{p.proj_projetos?.nome}</div>}
                      <div className="text-slate-700 leading-snug">
                        {p.etapa != null && <span className="font-bold text-indigo-600 mr-1">{p.etapa}ª</span>}
                        {textoPlano(p.nome)}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-semibold">
                        <span className={ok ? 'text-emerald-600' : 'text-orange-600'}>{STATUS_LABEL[p.status_kanban] || p.status_kanban}</span>
                        <span className="text-slate-500 font-normal">
                          {ok ? 'Término' : 'Previsão de término'}: <span className="font-semibold text-slate-700">{p.data_fim ? new Date(p.data_fim + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </>
  )
}
