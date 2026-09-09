import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Loader2, CheckCircle2, MessageSquare, Hand, Send, Clock, Trash2, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  obterInstancia, listarTarefasDaInstancia, listarAuditoria, listarComentarios,
  completarTarefa, assumirTarefa, adicionarComentario, excluirInstancia,
} from '../../services/bpm/bpmService'
import BpmFormRenderer from './BpmFormRenderer'

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

function TarefaAberta({ tarefa, formSchema, userId, onAssumir, onConcluir }) {
  const [dados, setDados] = useState({})
  const [decisao, setDecisao] = useState('')
  const [enviando, setEnviando] = useState(false)

  const minhaTarefa = tarefa.responsavel_user_id === userId
  const semDono = !tarefa.responsavel_user_id

  const faltamObrigatorios = (formSchema || []).some(c => c.obrigatorio && (dados[c.key] === undefined || dados[c.key] === '' || dados[c.key] === null))

  return (
    <div className="bg-white rounded-lg border border-indigo-200 shadow-sm overflow-hidden">
      <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-800">Tarefa em aberto — {tarefa.elemento_nome || tarefa.elemento_id}</span>
        {tarefa.responsavel_papel && <span className="text-[10px] font-bold uppercase text-indigo-500">papel: {tarefa.responsavel_papel}</span>}
      </div>
      <div className="p-4 space-y-4">
        {semDono ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Nenhum responsável definido ainda.</p>
            <button onClick={onAssumir} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
              <Hand className="h-3.5 w-3.5" /> Assumir tarefa
            </button>
          </div>
        ) : !minhaTarefa ? (
          <p className="text-xs text-slate-500">Atribuída a outro usuário. Só quem está com a tarefa pode concluí-la.</p>
        ) : (
          <>
            <BpmFormRenderer schema={formSchema} valores={dados} onChange={setDados} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Observação da decisão (opcional)</label>
              <input value={decisao} onChange={e => setDecisao(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md" />
            </div>
            <div className="flex justify-end">
              <button
                disabled={enviando || faltamObrigatorios}
                onClick={async () => { setEnviando(true); try { await onConcluir({ dadosTarefa: dados, decisao }) } finally { setEnviando(false) } }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> {enviando ? 'Concluindo...' : 'Concluir tarefa'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function BpmInstancia() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [instancia, setInstancia] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [auditoria, setAuditoria] = useState([])
  const [comentarios, setComentarios] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const [inst, tar, aud, com] = await Promise.all([
        obterInstancia(id), listarTarefasDaInstancia(id), listarAuditoria(id), listarComentarios(id),
      ])
      setInstancia(inst); setTarefas(tar); setAuditoria(aud); setComentarios(com)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const tarefaAberta = tarefas.find(t => t.status === 'aberta')

  const assumir = async () => {
    try { await assumirTarefa({ taskId: tarefaAberta.id, userId: user.id }); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
  }

  const concluir = async ({ dadosTarefa, decisao }) => {
    try {
      await completarTarefa({ taskId: tarefaAberta.id, decisao, dadosTarefa, userId: user.id })
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
  }

  const excluir = async () => {
    setExcluindo(true)
    try { await excluirInstancia(id); navigate('/bpm/processos') }
    catch (e) { setErro(e.message || String(e)); setExcluindo(false) }
  }

  const enviarComentario = async () => {
    if (!novoComentario.trim()) return
    try {
      await adicionarComentario({ instanceId: id, userId: user.id, texto: novoComentario })
      setNovoComentario('')
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
  }

  if (loading) return <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
  if (!instancia) return null

  const st = STATUS_INSTANCIA[instancia.status] || { label: instancia.status, cls: 'bg-slate-100 text-slate-500' }
  const def = instancia.bpm_process_definitions
  const formSchemaTarefaAberta = tarefaAberta ? (def?.form_schemas || {})[tarefaAberta.elemento_id] : null

  const linhaDoTempo = [
    ...auditoria.map(a => ({ tipo: 'auditoria', data: a.criado_em, item: a })),
    ...comentarios.map(c => ({ tipo: 'comentario', data: c.criado_em, item: c })),
  ].sort((a, b) => new Date(a.data) - new Date(b.data))

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/bpm/processos" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{instancia.titulo}</h1>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-xs text-slate-500">{def?.nome} <span className="text-slate-300">v{def?.versao}</span> · iniciado em {fmtData(instancia.iniciado_em)}</p>
        </div>
        <button onClick={() => setConfirmarExclusao(true)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir instância">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {tarefaAberta && (
        <TarefaAberta tarefa={tarefaAberta} formSchema={formSchemaTarefaAberta} userId={user?.id} onAssumir={assumir} onConcluir={concluir} />
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Dados da instância</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(instancia.dados || {}).map(([k, v]) => (
            <div key={k} className="text-xs">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">{k}</span>
              <span className="text-slate-700 font-medium">{String(v)}</span>
            </div>
          ))}
          {Object.keys(instancia.dados || {}).length === 0 && <p className="text-xs text-slate-400">Sem dados registrados ainda.</p>}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Linha do tempo</h2>
        <div className="space-y-3 border-l-2 border-slate-100 pl-4">
          {linhaDoTempo.map((entrada, i) => (
            <div key={i} className="text-xs">
              <span className="text-[10px] text-slate-400">{fmtData(entrada.data)}</span>
              {entrada.tipo === 'auditoria' ? (
                <p className="text-slate-700"><strong className="text-slate-800">{entrada.item.acao}</strong></p>
              ) : (
                <p className="text-slate-700 flex items-start gap-1.5"><MessageSquare className="h-3 w-3 mt-0.5 text-slate-300 shrink-0" /> {entrada.item.texto}</p>
              )}
            </div>
          ))}
          {linhaDoTempo.length === 0 && <p className="text-xs text-slate-400">Sem eventos registrados.</p>}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
          <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)} placeholder="Adicionar comentário..."
            onKeyDown={e => e.key === 'Enter' && enviarComentario()}
            className="flex-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          <button onClick={enviarComentario} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-md"><Send className="h-4 w-4" /></button>
        </div>
      </div>

      {confirmarExclusao && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><ShieldAlert className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Excluir instância</h3>
                <p className="text-xs text-slate-500">
                  Confirma a exclusão de <strong>{instancia.titulo}</strong>? As tarefas, o histórico de auditoria e os
                  comentários dessa instância serão apagados junto. Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setConfirmarExclusao(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={excluir} disabled={excluindo} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50">
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
