import React, { useEffect, useState } from 'react'
import { X, Copy, Check, Loader2, RefreshCw, AlertTriangle, CalendarPlus } from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

/** Ícone simples do Outlook (sem marca registrada: só um "O" em azul) */
export const IconeOutlook = ({ className = 'h-3.5 w-3.5' }) => (
  <span className={`${className} inline-flex items-center justify-center rounded-sm bg-[#0F6CBD] text-white text-[9px] font-black leading-none shrink-0`}>O</span>
)

export default function AgendaOutlookModal({ onClose }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [dados, setDados] = useState(null) // { token, responsaveis }
  const [copiado, setCopiado] = useState(false)
  const [gerandoNovo, setGerandoNovo] = useState(false)
  const [confirmarNovo, setConfirmarNovo] = useState(false)

  const carregar = async (novo = false) => {
    setErro(null)
    try {
      const r = await fetch(`${BACKEND_URL}/api/projetos-agenda/link${novo ? '/novo' : ''}`, { method: novo ? 'POST' : 'GET' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(j.error || `Erro ${r.status}`)
      setDados(j)
    } catch (e) {
      setErro(e.message || String(e))
    }
  }

  useEffect(() => { carregar().finally(() => setCarregando(false)) }, [])

  const link = dados ? `${BACKEND_URL}/api/agenda-ics/${dados.token}.ics` : ''
  const ehLocal = /localhost|127\.0\.0\.1/.test(BACKEND_URL)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      const el = document.getElementById('link-agenda-outlook')
      el?.select(); document.execCommand('copy')
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const gerarNovo = async () => {
    setGerandoNovo(true)
    await carregar(true)
    setGerandoNovo(false)
    setConfirmarNovo(false)
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg border border-slate-200 w-[620px] max-h-[92vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><IconeOutlook className="h-4 w-4" /> Minhas tarefas no Outlook</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-700">
          {carregando ? (
            <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Gerando seu link...</p>
          ) : erro ? (
            <div className="bg-red-50 border border-red-200 rounded-md p-2 text-red-700">{erro}</div>
          ) : (
            <>
              <p>
                Este link mostra no Outlook as <strong>tarefas em que você é o responsável</strong>, com as datas da Agenda.
                Tarefas com horário aparecem com hora marcada; sem horário, como dia inteiro. As concluídas continuam aparecendo com <strong>✓ Concluída</strong>.
              </p>

              {dados.responsaveis?.length === 0 && (
                <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Seu usuário ainda não está vinculado a nenhum responsável em <strong>Cadastros → Responsáveis</strong>. O calendário vai aparecer vazio até esse vínculo ser feito.</span>
                </div>
              )}
              {dados.responsaveis?.length > 0 && (
                <p className="text-[11px] text-slate-500">Responsável vinculado ao seu usuário: <strong className="text-slate-700">{dados.responsaveis.join(', ')}</strong></p>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Seu link (pessoal — não compartilhe)</label>
                <div className="flex gap-2">
                  <input id="link-agenda-outlook" readOnly value={link} onFocus={e => e.target.select()}
                    className="flex-1 min-w-0 text-[11px] font-mono p-2 border border-slate-200 rounded-md bg-slate-50 text-slate-600" />
                  <button onClick={copiar}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0">
                    {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                {ehLocal && (
                  <p className="text-[11px] text-amber-700">Ambiente de teste (localhost): este link só funciona neste computador, com o backend local rodando.</p>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-2">
                <p className="font-bold text-slate-800 flex items-center gap-1.5"><CalendarPlus className="h-3.5 w-3.5" /> Como adicionar no Outlook (uma vez só)</p>
                <div>
                  <p className="font-semibold text-slate-700">Outlook clássico (desktop)</p>
                  <ol className="list-decimal ml-5 space-y-0.5 text-slate-600">
                    <li>Copie o link acima.</li>
                    <li>No Outlook, vá em <strong>Calendário</strong>.</li>
                    <li>Na guia <strong>Página Inicial</strong>, clique em <strong>Adicionar Calendário → Da Internet...</strong></li>
                    <li>Cole o link, clique em <strong>OK</strong> e depois em <strong>Sim</strong>.</li>
                  </ol>
                  <p className="text-[11px] text-slate-500 mt-1">Atualiza sozinho (cerca de 1 hora). Para ver na hora: <strong>Enviar/Receber → Atualizar Pasta</strong>.</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Novo Outlook / Outlook na web</p>
                  <ol className="list-decimal ml-5 space-y-0.5 text-slate-600">
                    <li>Em <strong>Calendário</strong>, clique em <strong>Adicionar calendário</strong>.</li>
                    <li>Escolha <strong>Assinar da Web</strong>, cole o link e dê um nome (ex.: Minhas Tarefas).</li>
                  </ol>
                  <p className="text-[11px] text-slate-500 mt-1">Aqui a atualização é feita pela Microsoft e pode levar algumas horas.</p>
                </div>
                <p className="text-[11px] text-slate-500">O calendário no Outlook é só para consulta: para mudar datas, altere a tarefa aqui no sistema.</p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-slate-400">Se o link foi compartilhado por engano, gere um novo — o antigo para de funcionar.</span>
                {confirmarNovo ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-red-600 font-semibold">Gerar novo link?</span>
                    <button onClick={gerarNovo} disabled={gerandoNovo}
                      className="px-2 py-1 rounded text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
                      {gerandoNovo ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sim'}
                    </button>
                    <button onClick={() => setConfirmarNovo(false)} className="px-2 py-1 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-100">Não</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmarNovo(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-100 shrink-0">
                    <RefreshCw className="h-3 w-3" /> Gerar novo link
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
