import React, { useEffect, useState } from 'react'
import { Database, X, Loader2, FolderOpen, ExternalLink, RefreshCw } from 'lucide-react'

// Fontes de dados da Garantias DAF: arquivos do SharePoint usados pelas abas, em qual pasta estão e a data da
// última atualização de cada um (GET /api/garantias/fontes — mesma leitura do Monitor SharePoint).
// embutido: só o conteúdo (aba Fontes da janela Regras e Metas da engrenagem), sem a moldura de janela.
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const fmtDataHora = (s) => {
  if (!s) return '—'
  try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return s }
}
const COR_NIVEL = { ok: 'bg-emerald-100 text-emerald-700', atencao: 'bg-amber-100 text-amber-700', critico: 'bg-red-100 text-red-700' }
const TXT_NIVEL = { ok: 'Em dia', atencao: 'Atenção', critico: 'Desatualizado' }

export default function FontesGarantiasModal({ onClose, embutido = false }) {
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = () => {
    setCarregando(true); setErro(null)
    fetch(`${BACKEND}/api/garantias/fontes`)
      .then(async r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setDados)
      .catch(err => setErro('Não foi possível ler as fontes: ' + (err.message || String(err))))
      .finally(() => setCarregando(false))
  }
  useEffect(carregar, [])

  const topo = (
    <div className="flex items-center justify-between gap-3 mb-3">
      <p className="text-[11px] text-slate-500">Arquivos do SharePoint lidos pelas abas, a pasta onde estão e quando foram atualizados pela última vez.</p>
      <button onClick={carregar} disabled={carregando} title="Ler de novo" className="shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${carregando ? 'animate-spin' : ''}`} />
      </button>
    </div>
  )

  const lista = (
    <div className="space-y-3">
      {erro && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}
      {carregando && !dados ? (
        <p className="flex items-center gap-2 text-xs text-slate-400 py-8 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Lendo o SharePoint...</p>
      ) : (dados?.fontes || []).map(f => (
        <div key={f.id} className="border border-slate-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800">{f.nome}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{f.uso}</p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${COR_NIVEL[f.nivel] || 'bg-slate-100 text-slate-600'}`}>
              {f.encontrado ? (TXT_NIVEL[f.nivel] || f.nivel) : 'Não encontrado'}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-2">
            <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            <span className="font-mono break-all">{f.pasta}</span>
          </p>
          {f.todos?.length > 0 ? (
            <table className="w-full text-[11px] mt-2">
              <thead className="text-[10px] uppercase text-slate-400 font-bold">
                <tr><th className="text-left py-1">Arquivo</th><th className="text-right py-1 w-40">Última atualização</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {f.todos.slice(0, 1).map(a => (
                  <tr key={a.nome}>
                    <td className="py-1 text-slate-700">
                      {a.link
                        ? <a href={a.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-blue-700 hover:underline">{a.nome}<ExternalLink className="h-3 w-3" /></a>
                        : a.nome}
                    </td>
                    <td className="py-1 text-right font-semibold text-slate-800">{fmtDataHora(a.modificado_em)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[11px] text-slate-400 mt-2">Nenhum arquivo encontrado ({f.padrao}).</p>
          )}
          {f.motivo && <p className="text-[10px] text-amber-700 mt-1.5">{f.motivo}</p>}
        </div>
      ))}
    </div>
  )

  if (embutido) return <div>{topo}{lista}</div>

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Database className="h-4 w-4 text-sky-600" /> Fontes de dados — Garantias DAF
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {topo}
        <div className="overflow-y-auto pr-1 -mr-1">{lista}</div>
        <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
