import React, { useEffect, useState } from 'react'

const ORIENTACAO_PADRAO = '<p>Analise as informações do projeto e registre sua manifestação: uma <strong>Sugestão</strong>, <strong>Correção</strong>, <strong>Inclusão</strong> ou <strong>Dúvida</strong>. Se estiver de acordo sem observações, clique em <strong>"Ciente / De Acordo"</strong>.</p>'
import { X, Loader2, PlayCircle } from 'lucide-react'
import { apiService } from '../../services/api'
import ManifestacaoRichEditor from './ManifestacaoRichEditor'

export default function IniciarFaseModal({ projeto, fases, onClose, onSaved }) {
  const [faseId, setFaseId] = useState(projeto.fase_id || '')
  const [prazo, setPrazo] = useState(projeto.manifestacao_prazo || '')
  const [linkDocs, setLinkDocs] = useState(projeto.manifestacao_link_docs || '')
  const [orientacao, setOrientacao] = useState(projeto.manifestacao_orientacao || '')
  const [usuarios, setUsuarios] = useState([])
  const [convidadosIds, setConvidadosIds] = useState(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const faseSelecionada = fases.find(f => f.id === faseId)
  const abreManifestacao = !!faseSelecionada?.aciona_manifestacao

  useEffect(() => {
    if (!abreManifestacao) return
    apiService.getUsuarios().then(rows => setUsuarios(rows.filter(u => u.ativo !== false))).catch(() => {})
    apiService.getConvidadosManifestacao(projeto.id)
      .then(rows => setConvidadosIds(new Set(rows.map(r => r.usuario_id))))
      .catch(() => {})
  }, [abreManifestacao, projeto.id])

  const toggleConvidado = (id) => {
    setConvidadosIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const salvar = async () => {
    if (!faseId) return
    if (abreManifestacao && !prazo) { setErro('Defina o prazo do Período de Manifestação.'); return }
    setErro('')
    setSalvando(true)
    try {
      await apiService.updateProjeto(projeto.id, {
        fase_id: faseId,
        fase_nome: faseSelecionada?.nome || null,
        ...(abreManifestacao ? {
          manifestacao_status: 'aberto',
          manifestacao_prazo: prazo,
          manifestacao_link_docs: linkDocs.trim() || null,
          manifestacao_orientacao: orientacao.trim() || null,
          manifestacao_encerrada_em: null,
          manifestacao_encerrada_por: null,
        } : {}),
      })
      if (abreManifestacao) {
        await apiService.setConvidadosManifestacao(projeto.id, [...convidadosIds])
        apiService.enviarConvitesManifestacao(projeto.id, [...convidadosIds]).catch(() => {})
      }
      onSaved()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[440px] max-h-[80vh] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Iniciar Fase</h3>
            <p className="text-[11px] text-slate-500 truncate max-w-[360px]">{projeto.nome}</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fase</label>
            <select
              value={faseId}
              onChange={e => setFaseId(e.target.value)}
              className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">— Selecione —</option>
              {fases.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </select>
          </div>

          {abreManifestacao && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[11px] text-amber-700">
                Esta fase abre o <strong>Período de Manifestação</strong>: gerentes e participantes convidados poderão enviar sugestões, correções, inclusões, dúvidas ou o "De Acordo" até o prazo abaixo.
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Prazo para Manifestação</label>
                <input
                  type="date"
                  value={prazo}
                  onChange={e => setPrazo(e.target.value)}
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Orientações para os Participantes (opcional)</label>
                <div className="mt-1">
                  <ManifestacaoRichEditor
                    value={orientacao}
                    onChange={setOrientacao}
                    placeholder="Descreva o contexto, o que deve ser analisado, pontos de atenção..."
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Link dos Documentos de Referência (opcional)</label>
                <input
                  type="url"
                  value={linkDocs}
                  onChange={e => setLinkDocs(e.target.value)}
                  placeholder="https://... (pasta SharePoint ou OneDrive com os documentos)"
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Será exibido na aba Manifestações para que os participantes saibam onde encontrar os arquivos.</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Convidar Participantes</label>
                <div className="mt-1 border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-50">
                  {usuarios.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-slate-400 italic">Nenhum usuário disponível.</p>
                  ) : usuarios.map(u => (
                    <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={convidadosIds.has(u.id)}
                        onChange={() => toggleConvidado(u.id)}
                        className="w-3.5 h-3.5 accent-blue-600"
                      />
                      <span className="flex-1 truncate">{u.nome}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{u.email}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {erro && <p className="text-[11px] text-red-600 font-medium">{erro}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          <button
            onClick={salvar}
            disabled={!faseId || salvando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
            {salvando ? 'Salvando...' : 'Iniciar Fase'}
          </button>
        </div>
      </div>
    </div>
  )
}
