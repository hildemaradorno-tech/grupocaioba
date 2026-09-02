import React, { useEffect, useState } from 'react'
import { X, Loader2, PlayCircle, BookmarkPlus, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'
import ManifestacaoRichEditor from './ManifestacaoRichEditor'

const LS_KEY = 'orientacao_partes_rapidas'

function carregarPartes() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
function salvarPartes(lista) {
  localStorage.setItem(LS_KEY, JSON.stringify(lista))
}

export default function IniciarFaseModal({ projeto, fases, onClose, onSaved }) {
  const [faseId, setFaseId] = useState(() => {
    if (projeto.fase_id) return projeto.fase_id
    const nomeUp = (projeto.nome || '').toUpperCase()
    if (nomeUp.includes('DEVOLUÇÃO') && nomeUp.includes('NOTAS FISCAIS')) {
      const faseManif = fases.find(f => (f.nome || '').toUpperCase().includes('MANIFEST'))
        ?? fases.find(f => f.aciona_manifestacao)
      if (faseManif) return faseManif.id
    }
    return ''
  })
  const [prazo, setPrazo] = useState(projeto.manifestacao_prazo || '')
  const [linkDocs, setLinkDocs] = useState(projeto.manifestacao_link_docs || '')
  const [orientacao, setOrientacao] = useState(projeto.manifestacao_orientacao || '')
  const [usuarios, setUsuarios] = useState([])
  const [convidadosIds, setConvidadosIds] = useState(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [partesRapidas, setPartesRapidas] = useState(carregarPartes)
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [nomeNovaParte, setNomeNovaParte] = useState('')
  const [buscaConvidados, setBuscaConvidados] = useState('')

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

  const abrirSalvarParte = () => {
    const html = orientacao?.trim()
    if (!html || html === '<p></p>') return
    setNomeNovaParte('')
    setSalvandoNome(true)
  }

  const confirmarSalvarParte = () => {
    if (!nomeNovaParte.trim()) return
    const nova = { id: Date.now(), nome: nomeNovaParte.trim(), conteudo: orientacao.trim() }
    const lista = [...partesRapidas, nova]
    setPartesRapidas(lista)
    salvarPartes(lista)
    setSalvandoNome(false)
    setNomeNovaParte('')
  }

  const excluirParteRapida = (id) => {
    const lista = partesRapidas.filter(p => p.id !== id)
    setPartesRapidas(lista)
    salvarPartes(lista)
  }

  const aplicarParteRapida = (conteudo) => {
    setOrientacao(conteudo)
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
      <div className="bg-white rounded-lg border border-slate-200 w-[780px] max-h-[92vh] shadow-xl flex flex-col">
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
                {/* Cabeçalho com botão Salvar Parte Rápida */}
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Orientações para os Participantes (opcional)
                  </label>
                  {!salvandoNome && (
                    <button
                      type="button"
                      onClick={abrirSalvarParte}
                      className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                      title="Salvar o texto atual como Parte Rápida"
                    >
                      <BookmarkPlus className="h-3 w-3" />
                      Salvar Parte Rápida
                    </button>
                  )}
                </div>

                {/* Formulário inline de nome */}
                {salvandoNome && (
                  <div className="mb-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2.5 py-1.5">
                    <BookmarkPlus className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <input
                      type="text"
                      autoFocus
                      value={nomeNovaParte}
                      onChange={e => setNomeNovaParte(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmarSalvarParte(); if (e.key === 'Escape') setSalvandoNome(false) }}
                      placeholder="Nome da Parte Rápida..."
                      className="flex-1 text-xs bg-transparent border-none outline-none text-slate-700 placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={confirmarSalvarParte}
                      disabled={!nomeNovaParte.trim()}
                      className="text-[10px] font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 px-2 py-0.5 rounded transition-colors"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSalvandoNome(false)}
                      className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 px-1.5 py-0.5 rounded transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {/* Partes Rápidas salvas */}
                {partesRapidas.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {partesRapidas.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full pl-2.5 pr-1 py-0.5 text-[11px] text-blue-700 group"
                      >
                        <button
                          type="button"
                          onClick={() => aplicarParteRapida(p.conteudo)}
                          className="hover:text-blue-900 font-medium truncate max-w-[180px]"
                          title={`Aplicar: ${p.nome}`}
                        >
                          {p.nome}
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirParteRapida(p.id)}
                          className="ml-0.5 p-0.5 text-blue-300 hover:text-red-500 rounded-full transition-colors"
                          title="Excluir esta Parte Rápida"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <ManifestacaoRichEditor
                  value={orientacao}
                  onChange={setOrientacao}
                  placeholder="Descreva o contexto, o que deve ser analisado, pontos de atenção..."
                />
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
                <input
                  type="text"
                  value={buscaConvidados}
                  onChange={e => setBuscaConvidados(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full mt-1 mb-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                />
                <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-50">
                  {usuarios.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-slate-400 italic">Nenhum usuário disponível.</p>
                  ) : (() => {
                    const q = buscaConvidados.toLowerCase().trim()
                    const lista = q
                      ? usuarios.filter(u => u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
                      : usuarios
                    if (lista.length === 0) return (
                      <p className="px-3 py-2 text-[11px] text-slate-400 italic">Nenhum usuário encontrado.</p>
                    )
                    return lista.map(u => (
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
                    ))
                  })()}
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
