import React, { useState } from 'react'
import { X, Loader2, CheckCircle2, AlertCircle, MessageSquare } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import ManifestacaoRichEditor from './ManifestacaoRichEditor'

const TIPO_COR = {
  'Sugestão':  'bg-blue-100 text-blue-700',
  'Correção':  'bg-red-100 text-red-700',
  'Inclusão':  'bg-emerald-100 text-emerald-700',
  'Dúvida':    'bg-amber-100 text-amber-700',
  'De Acordo': 'bg-teal-100 text-teal-700',
}

const RESULTADOS = [
  {
    value: 'Aprovado',
    label: 'Aprovado',
    icon: CheckCircle2,
    active: 'bg-emerald-600 text-white border-emerald-600',
    inactive: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50',
  },
  {
    value: 'Aprovado com Ressalvas',
    label: 'Aprovado com Ressalvas',
    icon: AlertCircle,
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50',
  },
  {
    value: 'Respondido',
    label: 'Respondido',
    icon: MessageSquare,
    active: 'bg-slate-600 text-white border-slate-600',
    inactive: 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50',
  },
]

export const RESULTADO_COR = {
  'Aprovado':               'bg-emerald-200 text-emerald-800',
  'Aprovado com Ressalvas': 'bg-blue-100 text-blue-700',
  'Respondido':             'bg-green-100 text-green-700',
  'De Acordo':              'bg-teal-100 text-teal-700',
}

const fmtDataHora = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—'

export default function ResponderManifestacaoModal({ manifestacao, onClose, onSaved }) {
  const { user, userNome } = useAuth()
  const [resultado, setResultado] = useState(manifestacao.resultado_manifestacao || '')
  const [resposta, setResposta] = useState(manifestacao.resposta_responsavel || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const responder = async () => {
    if (!resultado) { setErro('Selecione um resultado antes de salvar.'); return }
    setErro('')
    setSalvando(true)
    try {
      await apiService.responderManifestacao(manifestacao.id, {
        resposta_responsavel: resposta.trim(),
        responsavel_email: user?.email || null,
        responsavel_nome: userNome || null,
        resultado_manifestacao: resultado,
        usuario_email: manifestacao.usuario_email,
        usuario_nome: manifestacao.usuario_nome,
        projeto_id: manifestacao.projeto_id,
      })
      onSaved()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[600px] max-h-[80vh] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {manifestacao.resultado_manifestacao ? 'Editar Resposta' : 'Responder Manifestação'}
            </h3>
            <p className="text-[11px] text-slate-500">{manifestacao.usuario_nome || manifestacao.usuario_email} · {fmtDataHora(manifestacao.data_hora_envio)}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Tipo + texto original */}
          <div className="space-y-2">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${TIPO_COR[manifestacao.tipo_manifestacao] || 'bg-slate-100 text-slate-600'}`}>
              {manifestacao.tipo_manifestacao}
            </span>
            {manifestacao.texto_manifestacao && (
              <div
                className="rich-html text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-md p-3 border border-slate-100"
                dangerouslySetInnerHTML={{ __html: manifestacao.texto_manifestacao }}
              />
            )}
          </div>

          {/* Resultado */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-2">Resultado</label>
            <div className="grid grid-cols-3 gap-2">
              {RESULTADOS.map(r => {
                const Icon = r.icon
                const ativo = resultado === r.value
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setResultado(r.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold transition-colors ${ativo ? r.active : r.inactive}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Resposta */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Resposta / Consideração</label>
            <div className="mt-1">
              <ManifestacaoRichEditor
                value={resposta}
                onChange={setResposta}
                placeholder="Descreva a decisão tomada, justificativa ou esclarecimento..."
              />
            </div>
          </div>

          {erro && <p className="text-[11px] text-red-600 font-medium">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          <button
            onClick={responder}
            disabled={salvando || !resultado}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {salvando ? 'Salvando...' : 'Salvar Resposta'}
          </button>
        </div>
      </div>
    </div>
  )
}
