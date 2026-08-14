import React, { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, Send, Loader2, ShieldCheck, FileDown, Lock, Unlock, Users, Pencil, Check, X as XIcon, ExternalLink, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import ManifestacaoRichEditor from './ManifestacaoRichEditor'
import ResponderManifestacaoModal, { RESULTADO_COR } from './ResponderManifestacaoModal'

const TIPOS = ['Sugestão', 'Correção', 'Inclusão', 'Dúvida']

const TIPO_COR = {
  'Sugestão':  'bg-blue-100 text-blue-700',
  'Correção':  'bg-red-100 text-red-700',
  'Inclusão':  'bg-emerald-100 text-emerald-700',
  'Dúvida':    'bg-amber-100 text-amber-700',
  'De Acordo': 'bg-teal-100 text-teal-700',
}

const STATUS_COR = {
  'Pendente':    'bg-slate-100 text-slate-600',
  'Em Análise':  'bg-amber-100 text-amber-700',
  'Respondido':  'bg-teal-100 text-teal-700',
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—'

export default function ManifestacoesTab({ projeto, onReload, convidados = [] }) {
  const { user, userNome, hasActionOrDefault, isAdmin, usuarioId } = useAuth()
  const canEnviar    = hasActionOrDefault('projetos', 'enviar_manifestacao')
  const canResponder = hasActionOrDefault('projetos/manifestacoes', 'responder_manifestacao')
  const canEncerrar  = hasActionOrDefault('projetos/manifestacoes', 'encerrar_periodo')
  const isConvidado  = convidados.some(c => c.usuario_id === usuarioId)
  const podeGerenciar = isAdmin || canEncerrar

  const [manifestacoes, setManifestacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [tipo, setTipo] = useState('Sugestão')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [modalResponder, setModalResponder] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)   // manifestação sendo editada
  const [editTipo, setEditTipo] = useState('Sugestão')
  const [editTexto, setEditTexto] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')
  const [encerrando, setEncerrando] = useState(false)
  const [reabrindo, setReabrindo] = useState(false)
  const [erro, setErro] = useState('')

  // Gerenciar participantes
  const [modalParticipantes, setModalParticipantes] = useState(false)
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [novoConvIds, setNovoConvIds] = useState(new Set())
  const [salvandoPartic, setSalvandoPartic] = useState(false)
  const [erroPartic, setErroPartic] = useState('')

  // Alterar prazo
  const [editandoPrazo, setEditandoPrazo] = useState(false)
  const [novoPrazo, setNovoPrazo] = useState('')
  const [salvandoPrazo, setSalvandoPrazo] = useState(false)

  const status = projeto.manifestacao_status || 'nao_iniciado'
  const aberto = status === 'aberto'
  const encerrado = status === 'encerrado'

  const carregar = useCallback(() => {
    setLoading(true)
    apiService.getManifestacoes(projeto.id)
      .then(setManifestacoes)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [projeto.id])

  useEffect(() => { carregar() }, [carregar])

  const enviarManifestacao = async (tipoEnvio) => {
    if (tipoEnvio !== 'De Acordo' && !texto.trim()) return
    setEnviando(true)
    setErro('')
    try {
      await apiService.createManifestacao({
        projeto_id: projeto.id,
        usuario_email: user?.email || null,
        usuario_nome: userNome || null,
        tipo_manifestacao: tipoEnvio,
        texto_manifestacao: tipoEnvio === 'De Acordo' ? null : texto,
      })
      setTexto('')
      setTipo('Sugestão')
      await carregar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setEnviando(false)
    }
  }

  const abrirEditar = (m) => {
    setEditTipo(m.tipo_manifestacao || 'Sugestão')
    setEditTexto(m.texto_manifestacao || '')
    setErroEdit('')
    setModalEditar(m)
  }

  const salvarEdicao = async () => {
    if (!editTexto.trim()) { setErroEdit('O texto da manifestação é obrigatório.'); return }
    setSalvandoEdit(true)
    setErroEdit('')
    try {
      await apiService.updateManifestacao(modalEditar.id, { tipo_manifestacao: editTipo, texto_manifestacao: editTexto })
      setModalEditar(null)
      await carregar()
    } catch (err) {
      setErroEdit(err.message || String(err))
    } finally {
      setSalvandoEdit(false)
    }
  }

  const excluirManifestacao = async (m) => {
    if (!window.confirm(`Excluir a manifestação de "${m.usuario_nome || m.usuario_email}"? Esta ação não pode ser desfeita.`)) return
    try {
      await apiService.deleteManifestacao(m.id)
      await carregar()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  const marcarEmAnalise = async (m) => {
    await apiService.updateManifestacaoStatus(m.id, 'Em Análise')
    await carregar()
  }

  const reabrirPeriodo = async () => {
    if (!window.confirm('Reabrir o Período de Manifestação? O projeto voltará à fase de Manifestação.')) return
    setReabrindo(true)
    try {
      await apiService.reabrirPeriodoManifestacao(projeto.id)
      await onReload()
    } catch (err) {
      alert('Erro ao reabrir período: ' + (err.message || String(err)))
    } finally {
      setReabrindo(false)
    }
  }

  const encerrarPeriodo = async () => {
    if (!window.confirm('Encerrar o Período de Manifestação? O projeto avançará para a fase de Consolidado e Encerramento.')) return
    setEncerrando(true)
    try {
      await apiService.encerrarPeriodoManifestacao(projeto.id)
      await onReload()
    } catch (err) {
      alert('Erro ao encerrar período: ' + (err.message || String(err)))
    } finally {
      setEncerrando(false)
    }
  }

  const handleSalvarResumoPDF = async () => {
    const el = document.getElementById('manifestacoes-resumo-consolidado')
    if (!el) return
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const MARGIN = 20
    const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN
    const h = (canvas.height / canvas.width) * CW
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, MARGIN, CW, h)
    pdf.save(`Resumo Consolidado - ${projeto.nome}.pdf`)
  }

  const contagemPorTipo = manifestacoes.reduce((acc, m) => { acc[m.tipo_manifestacao] = (acc[m.tipo_manifestacao] || 0) + 1; return acc }, {})

  const jaDeAcordo = manifestacoes.some(m => m.tipo_manifestacao === 'De Acordo' && (m.usuario_email === user?.email))

  const abrirGerenciarParticipantes = async () => {
    setErroPartic('')
    const ids = new Set(convidados.map(c => c.usuario_id))
    setNovoConvIds(ids)
    if (todosUsuarios.length === 0) {
      const rows = await apiService.getUsuarios().catch(() => [])
      setTodosUsuarios(rows.filter(u => u.ativo !== false))
    }
    setModalParticipantes(true)
  }

  const salvarParticipantes = async () => {
    setSalvandoPartic(true)
    setErroPartic('')
    try {
      const idsAntigos = new Set(convidados.map(c => c.usuario_id))
      const novos = [...novoConvIds].filter(id => !idsAntigos.has(id))
      await apiService.setConvidadosManifestacao(projeto.id, [...novoConvIds])
      if (novos.length > 0) {
        apiService.enviarConvitesManifestacao(projeto.id, novos).catch(() => {})
      }
      setModalParticipantes(false)
      await onReload()
    } catch (err) {
      setErroPartic(err.message || String(err))
    } finally {
      setSalvandoPartic(false)
    }
  }

  const salvarPrazo = async () => {
    if (!novoPrazo) return
    setSalvandoPrazo(true)
    try {
      await apiService.updateProjeto(projeto.id, { manifestacao_prazo: novoPrazo })
      setEditandoPrazo(false)
      await onReload()
    } catch (err) {
      alert('Erro ao salvar prazo: ' + (err.message || String(err)))
    } finally {
      setSalvandoPrazo(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Card de status + orientações */}
      <div className={`rounded-lg border overflow-hidden shadow-sm ${
        aberto    ? 'border-blue-200' :
        encerrado ? 'border-slate-200' :
        'border-amber-200'
      }`}>
        {/* Header com status e ações */}
        <div className={`flex flex-wrap items-center gap-3 px-4 py-2.5 ${
          aberto    ? 'bg-slate-700' :
          encerrado ? 'bg-slate-500' :
          'bg-amber-500'
        }`}>
          <div className="flex items-center gap-2 text-white text-xs font-semibold flex-1 min-w-0 flex-wrap gap-y-1.5">
            {aberto && (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
                  Período de Manifestação Aberto
                </span>
                <span className="text-slate-400 select-none">·</span>
                {!editandoPrazo ? (
                  <span className="flex items-center gap-1 text-slate-300">
                    Prazo: <strong className="text-white ml-0.5">{fmtData(projeto.manifestacao_prazo)}</strong>
                    {isAdmin && (
                      <button
                        onClick={() => { setNovoPrazo(projeto.manifestacao_prazo || ''); setEditandoPrazo(true) }}
                        className="ml-1 p-0.5 rounded hover:bg-slate-600 transition-colors"
                        title="Alterar prazo"
                      >
                        <Pencil className="h-3 w-3 text-slate-300" />
                      </button>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-300">
                    Novo prazo:
                    <input
                      type="date"
                      value={novoPrazo}
                      onChange={e => setNovoPrazo(e.target.value)}
                      className="text-xs px-1.5 py-0.5 rounded bg-slate-600 border border-slate-400 text-white focus:outline-none focus:border-slate-200"
                    />
                    <button onClick={salvarPrazo} disabled={salvandoPrazo || !novoPrazo} className="p-0.5 rounded hover:bg-slate-600 disabled:opacity-50" title="Confirmar">
                      {salvandoPrazo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-400" />}
                    </button>
                    <button onClick={() => setEditandoPrazo(false)} className="p-0.5 rounded hover:bg-slate-600" title="Cancelar">
                      <XIcon className="h-3.5 w-3.5 text-red-400" />
                    </button>
                  </span>
                )}
              </>
            )}
            {encerrado && (
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Período de Manifestação encerrado em {fmtDataHora(projeto.manifestacao_encerrada_em)}
              </span>
            )}
            {encerrado && podeGerenciar && (
              <button
                onClick={reabrirPeriodo}
                disabled={reabrindo}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md border border-slate-200 transition-colors shadow-sm disabled:opacity-50 ml-auto"
              >
                {reabrindo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
                Reabrir Período
              </button>
            )}
            {!aberto && !encerrado && (
              <span>Período de Manifestação ainda não iniciado. Use "Iniciar Fase" no cabeçalho do projeto.</span>
            )}
          </div>

          {aberto && (
            <div className="flex items-center gap-2 shrink-0">
              {canEnviar && isConvidado && (
                jaDeAcordo ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-700 text-[11px] font-bold rounded-md">
                    <ShieldCheck className="h-3 w-3" /> Ciente registrado
                  </span>
                ) : (
                  <button
                    onClick={() => enviarManifestacao('De Acordo')}
                    disabled={enviando}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-[11px] font-bold rounded-md transition-colors shadow-sm"
                  >
                    {enviando ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                    Ciente / De Acordo
                  </button>
                )
              )}
              {podeGerenciar && (
                <button
                  onClick={abrirGerenciarParticipantes}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md border border-slate-200 transition-colors shadow-sm"
                >
                  <Users className="h-3 w-3" /> Participantes ({convidados.length})
                </button>
              )}
              {canEncerrar && (
                <button
                  onClick={encerrarPeriodo}
                  disabled={encerrando}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md border border-slate-200 transition-colors shadow-sm disabled:opacity-50"
                >
                  {encerrando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Lock className="h-3 w-3" />}
                  Encerrar Período
                </button>
              )}
            </div>
          )}
        </div>

        {/* Orientações — só quando aberto */}
        {aberto && (
          <div className="px-4 py-3 bg-blue-50 text-xs text-blue-800 space-y-2">
            <p className="font-semibold">Orientações para Manifestação</p>
            <p className="text-blue-700 leading-relaxed">
              Analise as informações do projeto e registre sua manifestação: uma <strong>Sugestão</strong>, <strong>Correção</strong>, <strong>Inclusão</strong> ou <strong>Dúvida</strong>. Se estiver de acordo sem observações, clique em <strong>"Ciente / De Acordo"</strong>.
            </p>
            {projeto.manifestacao_orientacao && (
              <div className="text-blue-700 leading-relaxed border-t border-blue-200 pt-2" dangerouslySetInnerHTML={{ __html: projeto.manifestacao_orientacao }} />
            )}
            {projeto.manifestacao_link_docs && (
              <a
                href={projeto.manifestacao_link_docs}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Acessar documentos de referência
              </a>
            )}
          </div>
        )}
      </div>

      {/* Formulário de envio */}
      {aberto && canEnviar && isConvidado && !jaDeAcordo && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Enviar Manifestação</h3>
          <div className="flex items-center gap-2">
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20">
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <ManifestacaoRichEditor value={texto} onChange={setTexto} placeholder="Descreva sua sugestão, correção, inclusão ou dúvida..." disabled={enviando} />
          {erro && <p className="text-[11px] text-red-600 font-medium">{erro}</p>}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => enviarManifestacao(tipo)}
              disabled={enviando || !texto.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors"
            >
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar Manifestação
            </button>
          </div>
        </div>
      )}

      {/* Lista de manifestações */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-3 w-32">Data/Hora</th>
              <th className="p-3 w-40">Autor</th>
              <th className="p-3 w-24">Tipo</th>
              <th className="p-3 min-w-[260px]">Manifestação</th>
              <th className="p-3 w-36">Resultado</th>
              <th className="p-3 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {loading ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando...</td></tr>
            ) : manifestacoes.length === 0 ? (
              <tr><td colSpan="6" className="p-8 text-center text-slate-400">Nenhuma manifestação registrada.</td></tr>
            ) : manifestacoes.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/70 transition-colors align-top">
                <td className="p-3 text-slate-500 whitespace-nowrap">{fmtDataHora(m.data_hora_envio)}</td>
                <td className="p-3 font-medium">{m.usuario_nome || m.usuario_email}</td>
                <td className="p-3">
                  {m.tipo_manifestacao !== 'De Acordo' && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${TIPO_COR[m.tipo_manifestacao] || 'bg-slate-100 text-slate-600'}`}>
                      {m.tipo_manifestacao}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  {m.texto_manifestacao && (
                    <div className="line-clamp-3 text-slate-600" dangerouslySetInnerHTML={{ __html: m.texto_manifestacao }} />
                  )}
                  {m.resposta_responsavel && (
                    <div className="mt-1.5 bg-slate-50 rounded px-2 py-1.5 text-[11px] text-slate-500">
                      <span className="font-bold text-slate-400">Resposta ({m.responsavel_nome || m.responsavel_email}):</span> {m.resposta_responsavel}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {(() => {
                    const res = m.resultado_manifestacao || (m.tipo_manifestacao === 'De Acordo' ? 'De Acordo' : null)
                    return res ? (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${RESULTADO_COR[res] || 'bg-slate-100 text-slate-600'}`}>
                        {res}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">Pendente</span>
                    )
                  })()}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {canResponder && m.status !== 'Respondido' && (
                      <button onClick={() => setModalResponder(m)} title="Responder" className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {podeGerenciar && m.tipo_manifestacao !== 'De Acordo' && (
                      <button onClick={() => abrirEditar(m)} title="Editar" className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {podeGerenciar && (
                      <button onClick={() => excluirManifestacao(m)} title="Excluir" className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo consolidado — visível após encerramento */}
      {encerrado && !loading && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Resumo Consolidado</h3>
            <button onClick={handleSalvarResumoPDF} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold rounded transition-colors">
              <FileDown className="h-3 w-3" /> Salvar PDF
            </button>
          </div>
          <div id="manifestacoes-resumo-consolidado" className="p-3 space-y-3">
            <p className="text-xs text-slate-600"><strong>{projeto.nome}</strong> — {manifestacoes.length} manifestação(ões) registrada(s), encerrado em {fmtDataHora(projeto.manifestacao_encerrada_em)}.</p>
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(contagemPorTipo).map(([t, n]) => (
                <span key={t} className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${TIPO_COR[t] || 'bg-slate-100 text-slate-600'}`}>{t}: {n}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalEditar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[560px] shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Editar Manifestação</h3>
                <p className="text-[11px] text-slate-500 truncate max-w-[460px]">{modalEditar.usuario_nome || modalEditar.usuario_email}</p>
              </div>
              <button onClick={() => setModalEditar(null)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo</label>
                <select value={editTipo} onChange={e => setEditTipo(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20">
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Texto da Manifestação</label>
                <ManifestacaoRichEditor value={editTexto} onChange={setEditTexto} placeholder="Texto da manifestação..." disabled={salvandoEdit} />
              </div>
              {erroEdit && <p className="text-[11px] text-red-600 font-medium">{erroEdit}</p>}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalEditar(null)} disabled={salvandoEdit} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
              <button onClick={salvarEdicao} disabled={salvandoEdit} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 shadow-sm transition-colors">
                {salvandoEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalResponder && (
        <ResponderManifestacaoModal
          manifestacao={modalResponder}
          onClose={() => setModalResponder(null)}
          onSaved={() => { setModalResponder(null); carregar() }}
        />
      )}

      {modalParticipantes && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] max-h-[80vh] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gerenciar Participantes</h3>
                <p className="text-[11px] text-slate-500 truncate max-w-[340px]">{projeto.nome}</p>
              </div>
              <button onClick={() => setModalParticipantes(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <p className="text-[11px] text-slate-500 mb-2">Selecione quem pode ver e enviar manifestações neste projeto. Novos convidados receberão e-mail de convite.</p>
              <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto divide-y divide-slate-50">
                {todosUsuarios.length === 0 ? (
                  <p className="px-3 py-2 text-[11px] text-slate-400 italic">Carregando...</p>
                ) : todosUsuarios.map(u => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novoConvIds.has(u.id)}
                      onChange={() => setNovoConvIds(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s })}
                      className="w-3.5 h-3.5 accent-blue-600"
                    />
                    <span className="flex-1 truncate font-medium">{u.nome}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{u.email}</span>
                  </label>
                ))}
              </div>
              {erroPartic && <p className="mt-2 text-[11px] text-red-600 font-medium">{erroPartic}</p>}
            </div>
            <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">{novoConvIds.size} participante(s) selecionado(s)</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalParticipantes(false)} disabled={salvandoPartic} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button onClick={salvarParticipantes} disabled={salvandoPartic} className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors">
                  {salvandoPartic ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
                  {salvandoPartic ? 'Salvando...' : 'Salvar Participantes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
