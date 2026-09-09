import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Workflow, Plus, Edit2, UploadCloud, PlayCircle, ListChecks, AlertTriangle, Loader2, Trash2, ShieldAlert, FileWarning } from 'lucide-react'
import { listarDefinicoes, listarInstancias, publicarDefinicao, excluirInstancia, excluirDefinicao } from '../../services/bpm/bpmService'

const STATUS_DEFINICAO = {
  rascunho: 'bg-amber-50 text-amber-700',
  publicado: 'bg-emerald-50 text-emerald-700',
  arquivado: 'bg-slate-100 text-slate-500',
}

const STATUS_INSTANCIA = {
  em_andamento: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-700' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700' },
  pendencia_manual: { label: 'Pendência manual', cls: 'bg-red-50 text-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function BpmProcessos() {
  const [aba, setAba] = useState('catalogo')
  const [definicoes, setDefinicoes] = useState([])
  const [instancias, setInstancias] = useState([])
  const [loading, setLoading] = useState(true)
  const [publicandoId, setPublicandoId] = useState(null)
  const [erro, setErro] = useState(null)
  const [instanciaExcluir, setInstanciaExcluir] = useState(null)
  const [definicaoExcluir, setDefinicaoExcluir] = useState(null)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const [defs, insts] = await Promise.all([listarDefinicoes(), listarInstancias()])
      setDefinicoes(defs)
      setInstancias(insts)
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const publicar = async (id) => {
    setPublicandoId(id)
    try { await publicarDefinicao(id); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
    finally { setPublicandoId(null) }
  }

  const confirmarExclusaoInstancia = async () => {
    if (!instanciaExcluir) return
    setExcluindo(true)
    try { await excluirInstancia(instanciaExcluir.id); setInstanciaExcluir(null); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
    finally { setExcluindo(false) }
  }

  const confirmarExclusaoDefinicao = async () => {
    if (!definicaoExcluir) return
    setExcluindo(true); setErro(null)
    try { await excluirDefinicao(definicaoExcluir.id); setDefinicaoExcluir(null); await carregar() }
    catch (e) { setErro(e.message || String(e)); setDefinicaoExcluir(null) }
    finally { setExcluindo(false) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Workflow className="h-5 w-5 text-indigo-600" /> BPM - Processos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Catálogo de processos publicados e instâncias em execução.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/bpm/nfe-cancelamento-devolucao" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
            <FileWarning className="h-3.5 w-3.5" /> Cancelamento/Devolução NF-e
          </Link>
          <Link to="/bpm/minhas-tarefas" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
            <ListChecks className="h-3.5 w-3.5" /> Minhas Tarefas
          </Link>
          <Link to="/bpm/modelador" className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" /> Novo Processo
          </Link>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {[['catalogo', 'Catálogo de Processos'], ['instancias', 'Instâncias']].map(([key, label]) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${aba === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
      ) : aba === 'catalogo' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {definicoes.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhum processo modelado ainda. Clique em "Novo Processo" para começar.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3">Nome</th>
                  <th className="p-3">Chave</th>
                  <th className="p-3 text-center">Versão</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Atualizado em</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {definicoes.map(def => (
                  <tr key={def.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-semibold">{def.nome}</td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{def.chave}</td>
                    <td className="p-3 text-center">{def.versao}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_DEFINICAO[def.status] || 'bg-slate-100 text-slate-500'}`}>{def.status}</span>
                    </td>
                    <td className="p-3 text-slate-500">{fmtData(def.atualizado_em)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {(def.status === 'rascunho' || def.status === 'publicado') && (
                          <Link to={`/bpm/modelador/${def.id}`} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Editar">
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        {def.status === 'rascunho' && (
                          <button onClick={() => publicar(def.id)} disabled={publicandoId === def.id}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors disabled:opacity-40" title="Publicar">
                            <UploadCloud className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {def.status === 'publicado' && (
                          <Link to={`/bpm/instancias/novo/${def.id}`} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Iniciar instância">
                            <PlayCircle className="h-3.5 w-3.5" />
                          </Link>
                        )}
                        <button onClick={() => setDefinicaoExcluir(def)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
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
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {instancias.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhuma instância iniciada ainda.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3">Instância</th>
                  <th className="p-3">Processo</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Iniciado em</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {instancias.map(inst => {
                  const st = STATUS_INSTANCIA[inst.status] || { label: inst.status, cls: 'bg-slate-100 text-slate-500' }
                  return (
                    <tr key={inst.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold">{inst.titulo || inst.id.slice(0, 8)}</td>
                      <td className="p-3 text-slate-500">{inst.bpm_process_definitions?.nome} <span className="text-slate-300">v{inst.bpm_process_definitions?.versao}</span></td>
                      <td className="p-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span></td>
                      <td className="p-3 text-slate-500">{fmtData(inst.iniciado_em)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-3">
                          <Link to={`/bpm/instancias/${inst.id}`} className="text-indigo-600 hover:underline text-[11px] font-bold">Abrir</Link>
                          <button onClick={() => setInstanciaExcluir(inst)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir instância">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {instanciaExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Excluir instância</h3>
                <p className="text-xs text-slate-500">
                  Confirma a exclusão de <strong>{instanciaExcluir.titulo || instanciaExcluir.id.slice(0, 8)}</strong>?
                  As tarefas, o histórico de auditoria e os comentários dessa instância serão apagados junto. Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setInstanciaExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={confirmarExclusaoInstancia} disabled={excluindo} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50">
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {definicaoExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[440px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Excluir processo</h3>
                <p className="text-xs text-slate-500">
                  Confirma a exclusão de <strong>{definicaoExcluir.nome}</strong> (versão {definicaoExcluir.versao}, {definicaoExcluir.status})?
                  Se houver instâncias criadas a partir dele, exclua-as primeiro na aba Instâncias. Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setDefinicaoExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={confirmarExclusaoDefinicao} disabled={excluindo} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50">
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
