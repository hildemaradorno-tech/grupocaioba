import React, { useEffect, useState } from 'react'
import { X, Send, Loader2, AlertTriangle, CheckCircle2, BellRing } from 'lucide-react'

// Engrenagem › Enviar avisos agora: prévia (quem recebe) → confirmar → envia.
// Backend: POST /api/projetos/avisos-agora (services/projetosTaskScheduler.js › enviarAvisosAgora).
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

async function chamar(simular) {
  const r = await fetch(`${BACKEND_URL}/api/projetos/avisos-agora`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simular }),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Erro ${r.status}`)
  return j
}

const fmt = (iso) => iso ? iso.split('-').reverse().join('/') : ''

export default function EnviarAvisosModal({ onClose }) {
  const [previa, setPrevia] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    chamar(true).then(setPrevia).catch(e => setErro(e.message)).finally(() => setCarregando(false))
  }, [])

  const enviar = async () => {
    setEnviando(true); setErro(null)
    try { setResultado(await chamar(false)) } catch (e) { setErro(e.message) } finally { setEnviando(false) }
  }

  const dados = resultado || previa
  const nada = dados && dados.destinatarios.length === 0

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[560px] max-w-[95vw] max-h-[88vh] shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><BellRing className="h-4 w-4 text-slate-500" /> Enviar avisos agora</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto text-xs text-slate-700">
          <p className="text-slate-500">
            Cada responsável recebe <strong>um e-mail</strong> com as suas tarefas <strong className="text-red-600">em atraso</strong> e
            as que <strong className="text-blue-600">vencem hoje</strong>{dados ? <> ({fmt(dados.data)})</> : null}. Tarefas concluídas ou canceladas não entram.
            As cópias seguem o que está em Configurar E-mails.
          </p>

          {carregando && <div className="flex items-center gap-2 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Verificando tarefas...</div>}
          {erro && <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200 text-red-700"><AlertTriangle className="h-4 w-4 shrink-0" /> {erro}</div>}

          {resultado && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-800 font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {resultado.enviados} e-mail(s) enviado(s){resultado.erros?.length ? ` · ${resultado.erros.length} com erro` : ''}.
            </div>
          )}
          {resultado?.erros?.length > 0 && (
            <ul className="text-[11px] text-red-600 list-disc pl-5">{resultado.erros.map(e => <li key={e.email}>{e.email}: {e.erro}</li>)}</ul>
          )}

          {dados && !nada && (
            <>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 rounded bg-red-50 border border-red-200 text-red-700 font-bold">{dados.total_atrasadas} em atraso</span>
                <span className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold">{dados.total_hoje} vencem hoje</span>
                <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 font-bold">{dados.destinatarios.length} responsável(is)</span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase">
                    <th className="p-2">Responsável</th><th className="p-2 text-center">Atraso</th><th className="p-2 text-center">Hoje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dados.destinatarios.map(d => (
                    <tr key={d.email}>
                      <td className="p-2"><div className="font-semibold">{d.nome}</div><div className="text-[11px] text-slate-400">{d.email}</div></td>
                      <td className="p-2 text-center font-bold text-red-600">{d.atrasadas || '—'}</td>
                      <td className="p-2 text-center font-bold text-blue-600">{d.hoje || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {nada && <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-slate-600">Nenhuma tarefa em atraso ou vencendo hoje com responsável que tenha e-mail.</div>}

          {dados?.sem_email?.length > 0 && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
              <div className="font-semibold mb-1">Não vão receber (responsável sem e-mail no cadastro de usuários):</div>
              <ul className="list-disc pl-5">{dados.sem_email.map(s => <li key={s.nome}>{s.nome} — {s.tarefas} tarefa(s)</li>)}</ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60">{resultado ? 'Fechar' : 'Cancelar'}</button>
          {!resultado && (
            <button onClick={enviar} disabled={enviando || carregando || !previa || nada}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm">
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {enviando ? 'Enviando...' : 'Enviar agora'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
