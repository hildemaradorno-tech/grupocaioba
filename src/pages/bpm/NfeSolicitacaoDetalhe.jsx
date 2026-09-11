import React, { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Loader2, CheckCircle2, Hand, Send, Clock, MessageSquare } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import {
  obterInstancia, listarTarefasDaInstancia, listarAuditoria, listarComentarios,
  completarTarefa, assumirTarefa, adicionarComentario,
} from '../../services/bpm/bpmService'
import BpmFormRenderer from './BpmFormRenderer'

const STATUS_INSTANCIA = {
  em_andamento: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-700' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700' },
  pendencia_manual: { label: 'Pendência manual', cls: 'bg-red-50 text-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
}

// Rótulos em português dos campos que essa nota de cancelamento/devolução costuma trazer em
// `dados` — se aparecer alguma chave nova (de um processo editado no Modelador), ela ainda é
// mostrada, só que com o nome cru da chave.
const CAMPO_LABELS = {
  numero_nf: 'Número da nota', serie: 'Série', chave_acesso: 'Chave de acesso',
  natureza_operacao: 'Natureza da operação', tipo_nota: 'Tipo de nota', cliente: 'Cliente',
  cnpj_cliente: 'CNPJ/CPF', data_nf: 'Data da nota', valor_nf: 'Valor',
  nota_referenciada: 'Nota referenciada', tipo_item: 'Tipo', tipo_solicitacao: 'Tipo de solicitação',
  motivo: 'Motivo',
}
const CAMPOS_OCULTOS = new Set(['itens', 'itens_devolvidos'])

function fmtDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

function fmtMoeda(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function NfeSolicitacaoDetalhe() {
  const { id } = useParams()
  const { user, agrupamentoCargoIdEfetivo } = useAuth()
  const [instancia, setInstancia] = useState(null)
  const [tarefaAberta, setTarefaAberta] = useState(null)
  const [linhaDoTempo, setLinhaDoTempo] = useState([])
  const [usuariosMap, setUsuariosMap] = useState({})
  const [agrupamentosCargo, setAgrupamentosCargo] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [dadosTarefa, setDadosTarefa] = useState({})
  const [decisao, setDecisao] = useState('')
  const [processando, setProcessando] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const [inst, tarefas, auditoria, comentarios, usuarios, agrupamentosLista] = await Promise.all([
        obterInstancia(id), listarTarefasDaInstancia(id), listarAuditoria(id), listarComentarios(id), apiService.getUsuarios(), apiService.getAgrupamentoCargos(),
      ])
      setInstancia(inst)
      setTarefaAberta(tarefas.find(t => t.status === 'aberta') || null)
      setUsuariosMap(Object.fromEntries(usuarios.map(u => [u.id, u.nome])))
      setAgrupamentosCargo(agrupamentosLista)
      setLinhaDoTempo([
        ...auditoria.map(a => ({ tipo: 'auditoria', data: a.criado_em, atorId: a.ator_user_id, acao: a.acao })),
        ...comentarios.map(c => ({ tipo: 'comentario', data: c.criado_em, atorId: c.user_id, texto: c.texto })),
      ].sort((a, b) => new Date(a.data) - new Date(b.data)))
    } catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const assumir = async () => {
    setProcessando(true); setErro(null)
    try { await assumirTarefa({ taskId: tarefaAberta.id, userId: user.id }); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
    finally { setProcessando(false) }
  }

  const concluirTarefa = async () => {
    setProcessando(true); setErro(null)
    try {
      await completarTarefa({ taskId: tarefaAberta.id, decisao, dadosTarefa, userId: user.id })
      setDadosTarefa({}); setDecisao('')
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setProcessando(false) }
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

  const dados = instancia.dados || {}
  const def = instancia.bpm_process_definitions
  const st = STATUS_INSTANCIA[instancia.status] || { label: instancia.status, cls: 'bg-slate-100 text-slate-500' }
  const minhaTarefa = tarefaAberta && tarefaAberta.responsavel_user_id === user?.id
  const semDono = tarefaAberta && !tarefaAberta.responsavel_user_id
  const cargoRequerido = tarefaAberta?.responsavel_agrupamento_cargo_id
    ? agrupamentosCargo.find(a => a.id === tarefaAberta.responsavel_agrupamento_cargo_id)
    : null
  const podeAssumir = !tarefaAberta?.responsavel_agrupamento_cargo_id || tarefaAberta.responsavel_agrupamento_cargo_id === agrupamentoCargoIdEfetivo
  const formSchemaTarefaAberta = tarefaAberta ? (def?.form_schemas || {})[tarefaAberta.elemento_id] : null
  const faltamObrigatorios = (formSchemaTarefaAberta || []).some(c => c.obrigatorio && (dadosTarefa[c.key] === undefined || dadosTarefa[c.key] === '' || dadosTarefa[c.key] === null))

  return (
    <div className="p-6 max-w-4xl space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/bpm/nfe-cancelamento-devolucao" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900">{instancia.titulo}</h1>
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
          </div>
          <p className="text-xs text-slate-500">{def?.nome} · criada em {fmtDataHora(instancia.iniciado_em)}</p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {tarefaAberta && (
        <div className="bg-white rounded-lg border border-indigo-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800">Etapa atual — {tarefaAberta.elemento_nome}</span>
            {cargoRequerido && (
              <span className="text-[10px] font-bold uppercase text-indigo-500">cargo: {cargoRequerido.nome_agrupamento_cargo}</span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {semDono ? (
              podeAssumir ? (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Nenhum responsável definido ainda.</p>
                  <button onClick={assumir} disabled={processando} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline disabled:opacity-50">
                    <Hand className="h-3.5 w-3.5" /> Assumir
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Esta tarefa é exclusiva de quem está no agrupamento de cargos <strong>{cargoRequerido?.nome_agrupamento_cargo}</strong>. Você pode acompanhar, mas não pode assumi-la.
                </p>
              )
            ) : !minhaTarefa ? (
              <p className="text-xs text-slate-500">Atribuída a <strong>{usuariosMap[tarefaAberta.responsavel_user_id] || 'outro usuário'}</strong>. Só quem está com a tarefa pode concluí-la.</p>
            ) : (
              <>
                <BpmFormRenderer schema={formSchemaTarefaAberta} valores={dadosTarefa} onChange={setDadosTarefa} />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Observação da decisão (opcional)</label>
                  <input value={decisao} onChange={e => setDecisao(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md" />
                </div>
                <div className="flex justify-end">
                  <button onClick={concluirTarefa} disabled={processando || faltamObrigatorios}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {processando ? 'Concluindo...' : 'Concluir tarefa'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Dados da solicitação</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {Object.entries(dados).filter(([k, v]) => !CAMPOS_OCULTOS.has(k) && v !== '' && v !== null && v !== undefined).map(([k, v]) => (
            <div key={k}>
              <span className="block text-slate-400 text-[10px] uppercase font-bold">{CAMPO_LABELS[k] || k}</span>
              <span className="text-slate-700 font-medium">
                {k === 'valor_nf' ? fmtMoeda(v) : v === true ? 'Sim' : v === false ? 'Não' : String(v)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(dados.itens || []).length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider px-4 pt-4 pb-2">Itens da nota</h2>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-2 pl-4">Devolvido?</th><th className="p-2">Código</th><th className="p-2">Descrição</th><th className="p-2 text-right pr-4">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {dados.itens.map(item => {
                const devolvido = (dados.itens_devolvidos || []).some(d => d.codigo === item.codigo)
                return (
                  <tr key={item.codigo}>
                    <td className="p-2 pl-4">{devolvido ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <span className="text-slate-300">—</span>}</td>
                    <td className="p-2 font-mono text-[11px] text-slate-500">{item.codigo}</td>
                    <td className="p-2">{item.descricao}</td>
                    <td className="p-2 text-right pr-4">{fmtMoeda(item.valorTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Linha do tempo</h2>
        <div className="space-y-3 border-l-2 border-slate-100 pl-4">
          {linhaDoTempo.map((h, i) => (
            <div key={i} className="text-xs">
              <span className="text-[10px] text-slate-400">{fmtDataHora(h.data)} {h.atorId && usuariosMap[h.atorId] ? `· ${usuariosMap[h.atorId]}` : ''}</span>
              {h.tipo === 'comentario' ? (
                <p className="text-slate-700 flex items-start gap-1.5"><MessageSquare className="h-3 w-3 mt-0.5 text-slate-300 shrink-0" /> {h.texto}</p>
              ) : (
                <p className="text-slate-700"><strong className="text-slate-800">{h.acao}</strong></p>
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
    </div>
  )
}
