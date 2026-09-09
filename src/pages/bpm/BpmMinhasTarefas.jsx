import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ListChecks, Inbox, Users, AlertTriangle, Loader2, Hand } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listarMinhasTarefas, listarTarefasPorPapeis, assumirTarefa } from '../../services/bpm/bpmService'

const PAPEIS_PADRAO = ['fiscal', 'financeiro', 'estoque', 'gerencia']
const CHAVE_LOCALSTORAGE = 'bpm_papeis_observados'

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function LinhaTarefa({ tarefa, acao }) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="p-3 font-semibold">{tarefa.elemento_nome || tarefa.elemento_id}</td>
      <td className="p-3 text-slate-500">{tarefa.bpm_process_instances?.bpm_process_definitions?.nome}</td>
      <td className="p-3 text-slate-500">{tarefa.bpm_process_instances?.titulo}</td>
      <td className="p-3 text-slate-400">{fmtData(tarefa.criada_em)}</td>
      <td className="p-3 text-slate-400">{tarefa.prazo_em ? fmtData(tarefa.prazo_em) : '—'}</td>
      <td className="p-3 text-center">{acao}</td>
    </tr>
  )
}

export default function BpmMinhasTarefas() {
  const { user } = useAuth()
  const [minhas, setMinhas] = useState([])
  const [fila, setFila] = useState([])
  const [papeis, setPapeis] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_LOCALSTORAGE)) || PAPEIS_PADRAO } catch { return PAPEIS_PADRAO }
  })
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [assumindo, setAssumindo] = useState(null)

  const carregar = useCallback(async () => {
    if (!user?.id) return
    setLoading(true); setErro(null)
    try {
      const [m, f] = await Promise.all([
        listarMinhasTarefas({ userId: user.id }),
        listarTarefasPorPapeis({ papeis }),
      ])
      setMinhas(m); setFila(f)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }, [user?.id, papeis])

  useEffect(() => { carregar() }, [carregar])

  const alternarPapel = (papel) => {
    setPapeis(prev => {
      const novo = prev.includes(papel) ? prev.filter(p => p !== papel) : [...prev, papel]
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(novo))
      return novo
    })
  }

  const assumir = async (taskId) => {
    setAssumindo(taskId)
    try { await assumirTarefa({ taskId, userId: user.id }); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
    finally { setAssumindo(null) }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-indigo-600" /> Minhas Tarefas
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">Tarefas de processos BPM atribuídas a você ou em fila por papel.</p>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" /> Atribuídas a mim</h2>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {minhas.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Nenhuma tarefa aberta atribuída a você.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Etapa</th><th className="p-3">Processo</th><th className="p-3">Instância</th><th className="p-3">Aberta em</th><th className="p-3">Prazo</th><th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {minhas.map(t => (
                      <LinhaTarefa key={t.id} tarefa={t} acao={
                        <Link to={`/bpm/instancias/${t.bpm_process_instances?.id}`} className="text-indigo-600 hover:underline text-[11px] font-bold">Abrir</Link>
                      } />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Fila por papel</h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PAPEIS_PADRAO.map(p => (
                  <button key={p} onClick={() => alternarPapel(p)}
                    className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border transition-colors ${papeis.includes(p) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Sem cadastro formal de papéis por usuário ainda — selecione aqui quais filas você acompanha. Ao assumir, a tarefa passa a ser sua.
            </p>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {fila.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">Nenhuma tarefa em aberto nas filas selecionadas.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Etapa</th><th className="p-3">Processo</th><th className="p-3">Instância</th><th className="p-3">Aberta em</th><th className="p-3">Prazo</th><th className="p-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {fila.map(t => (
                      <LinhaTarefa key={t.id} tarefa={t} acao={
                        <button onClick={() => assumir(t.id)} disabled={assumindo === t.id}
                          className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-50 mx-auto">
                          <Hand className="h-3 w-3" /> Assumir
                        </button>
                      } />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
