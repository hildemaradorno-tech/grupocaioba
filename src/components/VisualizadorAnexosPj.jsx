import React, { useEffect, useState } from 'react'
import { X, Download, Loader2, FileText, Paperclip } from 'lucide-react'
import { apiService } from '../services/api'
import { fmtCnpj } from '../utils/notaFiscalPj'

// Tela de visualização dos anexos do prestador PJ (Notas Fiscais e documentos das regras):
// lista à esquerda, o arquivo (PDF ou imagem) à direita e o botão para baixar.
// titulo / subtitulo (opcional): do que são os anexos (ex: empresa, valor e CNPJ da Nota Fiscal).
// cabecalhos (opcional): { [anexo.id]: { titulo, subtitulo } } — o cabeçalho acompanha o anexo aberto.
const rotuloAnexo = (a) => a.tipo === 'NF'
  ? `Nota Fiscal — ${a.empresa_nome || ''}${a.cnpj && /^\d+$/.test(a.cnpj) ? ` (${fmtCnpj(a.cnpj)})` : ''}`
  : a.documento || 'Documento'

export default function VisualizadorAnexosPj({ anexos, onFechar, titulo, subtitulo, cabecalhos }) {
  const [selecionado, setSelecionado] = useState(anexos[0] || null)
  const [url, setUrl] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!selecionado) { setUrl(null); return }
    let ativo = true
    setCarregando(true)
    setErro(null)
    apiService.urlPjAnexo(selecionado)
      .then(u => { if (ativo) setUrl(u) })
      .catch(err => { if (ativo) setErro(err.message || String(err)) })
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [selecionado])

  const baixar = async () => {
    if (!selecionado) return
    setBaixando(true)
    try {
      window.location.assign(await apiService.urlPjAnexo(selecionado, { download: true }))
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setBaixando(false)
    }
  }

  const ehPdf = selecionado?.content_type === 'application/pdf'
  const cab = (selecionado && cabecalhos?.[selecionado.id]) || { titulo, subtitulo }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onFechar}>
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Paperclip className="h-4 w-4 text-blue-600 shrink-0" /> <span className="truncate">{cab.titulo || 'Anexos'}</span></h3>
            {cab.subtitulo && <p className="text-[11px] text-slate-500 mt-0.5 pl-6 truncate">{cab.subtitulo}</p>}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={baixar} disabled={!selecionado || baixando}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-1.5 rounded-md">
              {baixando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Baixar
            </button>
            <button onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0">
          <ul className="w-72 shrink-0 border-r border-slate-100 overflow-auto p-2 space-y-1">
            {anexos.map(a => (
              <li key={a.id}>
                <button type="button" onClick={() => setSelecionado(a)}
                  className={`w-full text-left rounded-md px-2.5 py-2 ${selecionado?.id === a.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{rotuloAnexo(a)}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate pl-5">{a.nome_arquivo}</div>
                  <div className="text-[10px] text-slate-400 pl-5">{new Date(a.enviado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex-1 min-w-0 bg-slate-100 flex items-center justify-center">
            {erro ? <p className="text-xs text-rose-700">Erro: {erro}</p>
              : carregando || !url ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              // Parâmetros do visualizador de PDF do navegador: sem a barra de miniaturas e largura ajustada.
              : ehPdf ? <iframe key={selecionado.id} title={selecionado.nome_arquivo} src={`${url}#navpanes=0&pagemode=none&view=FitH&zoom=page-width`} className="w-full h-full border-0" />
              // Imagem: largura ajustada à área, com rolagem vertical quando for mais alta.
              : <div className="w-full h-full overflow-auto py-4"><img src={url} alt={selecionado.nome_arquivo} className="w-[70%] h-auto block mx-auto shadow" /></div>}
          </div>
        </div>
      </div>
    </div>
  )
}
