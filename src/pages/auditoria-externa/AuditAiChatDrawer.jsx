import React, { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'

// Painel de chat lateral do Copiloto de Auditoria — reutilizável em qualquer
// tela do módulo. `achadosRelacionados` é opcional: quando informado (ex: a
// partir da tela de Achados), é enviado como contexto extra para a IA.
export default function AuditAiChatDrawer({ open, onClose, achadosRelacionados = [] }) {
  const [mensagem, setMensagem] = useState('')
  const [historico, setHistorico] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [historico, enviando])

  const handleEnviar = async (e) => {
    e.preventDefault()
    const texto = mensagem.trim()
    if (!texto || enviando) return
    setMensagem('')
    setErro(null)
    const novoHistorico = [...historico, { role: 'user', text: texto }]
    setHistorico(novoHistorico)
    setEnviando(true)
    try {
      const resposta = await apiService.chatAuditIA({ mensagem: texto, achadosRelacionados, historico: novoHistorico })
      setHistorico(h => [...h, { role: 'assistant', text: resposta }])
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setEnviando(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-100 rounded-md">
              <Sparkles className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Copiloto de Auditoria</p>
              <p className="text-[10px] text-slate-500">Normas contábeis e achados registrados</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-md">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {historico.length === 0 && (
            <p className="text-xs text-slate-400 text-center mt-8">
              Pergunte sobre normas contábeis (NBC TG 26, NBC TA 300/315, NBC TG 08, CPCs) ou sobre os achados registrados no sistema.
            </p>
          )}
          {historico.map((h, i) => (
            <div key={i} className={`flex ${h.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs whitespace-pre-wrap ${
                h.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {h.text}
              </div>
            </div>
          ))}
          {enviando && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-lg px-3 py-2 text-xs text-slate-500 flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando...
              </div>
            </div>
          )}
          {erro && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 text-[11px] text-rose-700">{erro}</div>
          )}
        </div>

        <form onSubmit={handleEnviar} className="border-t border-slate-200 p-3 flex items-center gap-2">
          <input
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            placeholder="Pergunte ao copiloto..."
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            disabled={enviando || !mensagem.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  )
}
