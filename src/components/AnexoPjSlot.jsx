import React, { useRef, useState } from 'react'
import { Paperclip, Upload, X, Loader2, CheckCircle2, AlertTriangle, FileText, Eye } from 'lucide-react'
import { apiService } from '../services/api'

// Um documento a anexar do prestador PJ (documento exigido por Regra PJ ou Nota Fiscal de um CNPJ):
// mostra se já foi anexado, abre/remove os arquivos e envia um novo (PDF/PNG/JPG até 5 MB).
// `anexos` = anexos já enviados para este documento; `dados` = campos gravados em pj_anexos
// ({ funcionarioId, periodo, tipo, regraId, documento, cnpj, empresaNome }).
// onVisualizar (opcional): botão Visualizar (recebe os anexos e { titulo, subtitulo } pro cabeçalho da tela).
// opcional: documento não obrigatório — sem anexo fica neutro (sem o alerta amarelo).
export default function AnexoPjSlot({ rotulo, detalhe, anexos = [], dados, podeEditar = true, onAlterado, onVisualizar, opcional = false }) {
  const inputRef = useRef(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const ok = anexos.length > 0

  const enviar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setEnviando(true)
    setErro(null)
    try {
      await apiService.uploadPjAnexo({ ...dados, file })
      await onAlterado?.()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setEnviando(false)
    }
  }

  const remover = async (a) => {
    if (!window.confirm(`Remover o anexo "${a.nome_arquivo}"?`)) return
    setErro(null)
    try {
      await apiService.removerPjAnexo(a)
      await onAlterado?.()
    } catch (err) {
      setErro(err.message || String(err))
    }
  }

  const abrir = (a) => apiService.abrirPjAnexo(a).catch(err => setErro(err.message || String(err)))

  return (
    <div className={`rounded-md border px-3 py-2 ${ok ? 'border-emerald-200 bg-emerald-50/40' : opcional ? 'border-slate-200 bg-slate-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : opcional ? <Paperclip className="h-4 w-4 text-slate-400 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-800 truncate">{rotulo}</div>
            {detalhe && <div className="text-[10px] text-slate-500">{detalhe}</div>}
          </div>
        </div>
        {onVisualizar && ok && (
          <button type="button" onClick={() => onVisualizar(anexos, { titulo: rotulo, subtitulo: detalhe })}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-md shrink-0">
            <Eye className="h-3.5 w-3.5" /> Visualizar
          </button>
        )}
        {podeEditar && (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={enviar} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={enviando}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 disabled:opacity-50 px-2.5 py-1 rounded-md shrink-0">
              {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {ok ? 'Anexar outro' : 'Anexar'}
            </button>
          </>
        )}
      </div>
      {anexos.length > 0 && (
        <ul className="mt-1.5 space-y-1 pl-6">
          {anexos.map(a => (
            <li key={a.id} className="flex items-center gap-2 text-[11px]">
              {a.content_type === 'application/pdf' ? <FileText className="h-3.5 w-3.5 text-slate-400" /> : <Paperclip className="h-3.5 w-3.5 text-slate-400" />}
              <button type="button" onClick={() => abrir(a)} className="text-blue-700 hover:underline truncate" title="Abrir o arquivo">{a.nome_arquivo}</button>
              <span className="text-slate-400 whitespace-nowrap">{new Date(a.enviado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              {podeEditar && (
                <button type="button" onClick={() => remover(a)} title="Remover" className="text-slate-400 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
              )}
            </li>
          ))}
        </ul>
      )}
      {erro && <div className="mt-1 text-[11px] text-rose-700">Erro: {erro}</div>}
    </div>
  )
}
