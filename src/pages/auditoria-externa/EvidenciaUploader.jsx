import React, { useRef, useState } from 'react'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'

// Anexo de evidências (imagens) — de uma Divergência ou de um Achado — aceita
// colar direto (Ctrl+V, ex: print da ferramenta de recorte) ou escolher
// arquivo PNG/JPG. Faz upload pro bucket público "auditoria-evidencias" (numa
// subpasta identificada por `pastaId`) e persiste a lista de URLs via
// onChange (quem chama decide como salvar — ver AchadoDetalheDrawer /
// AchadoFormModal).
export default function EvidenciaUploader({ pastaId, urls = [], onChange, readOnly = false }) {
  const [enviando, setEnviando] = useState(false)
  const fileInputRef = useRef(null)

  const handleFiles = async (fileList) => {
    const imgs = Array.from(fileList).filter(f => f.type === 'image/png' || f.type === 'image/jpeg')
    if (!imgs.length) return
    setEnviando(true)
    try {
      const novasUrls = []
      for (const f of imgs) {
        const url = await apiService.uploadAuditExtEvidencia(pastaId, f)
        novasUrls.push(url)
      }
      onChange([...urls, ...novasUrls])
    } catch (err) {
      alert('Erro ao enviar imagem: ' + (err.message || String(err)))
    } finally {
      setEnviando(false)
    }
  }

  const handlePaste = (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    const files = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length) { e.preventDefault(); handleFiles(files) }
  }

  const handleRemover = async (url) => {
    if (!window.confirm('Remover esta imagem?')) return
    onChange(urls.filter(u => u !== url))
    try { await apiService.removeAuditExtEvidencia(url) } catch {}
  }

  return (
    <div className="mt-2">
      {!readOnly && (
        <>
          <div
            tabIndex={0}
            onPaste={handlePaste}
            onClick={() => !enviando && fileInputRef.current?.click()}
            className="flex items-center gap-2 border border-dashed border-slate-300 rounded-md px-3 py-2 text-[11px] text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            {enviando ? 'Enviando imagem...' : 'Clique aqui e cole (Ctrl+V) ou escolha uma imagem PNG/JPG'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            hidden
            onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </>
      )}
      {urls.length > 0 && (
        <div className="flex flex-col gap-3 mt-2">
          {urls.map(url => (
            <div key={url} className="relative group w-fit max-w-full">
              <a href={url} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                <img src={url} alt="Evidência" className="max-w-full h-auto rounded-md border border-slate-200" />
              </a>
              {!readOnly && (
                <button
                  onClick={() => handleRemover(url)}
                  className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5 text-red-500" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
