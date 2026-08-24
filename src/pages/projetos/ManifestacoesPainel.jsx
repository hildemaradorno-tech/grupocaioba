import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Clock, Send, Eye, Lock, ChevronDown, ChevronUp, Plus, X, Trash2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import ProjetosNav from './ProjetosNav'

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

const RESULTADO_BADGE = {
  'Aprovado':               'bg-emerald-200 text-emerald-800',
  'Aprovado com Ressalvas': 'bg-blue-100 text-blue-700',
  'Respondido':             'bg-green-100 text-green-700',
  'De Acordo':              'bg-teal-100 text-teal-700',
  'Pendente':               'bg-amber-100 text-amber-700',
}

function contarResultados(manifestacoes) {
  const counts = {}
  for (const m of (manifestacoes || [])) {
    const res = m.resultado_manifestacao || (m.tipo_manifestacao === 'De Acordo' ? 'De Acordo' : 'Pendente')
    counts[res] = (counts[res] || 0) + 1
  }
  return counts
}

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

export default function ManifestacoesPainel() {
  const navigate = useNavigate()
  const { hasActionOrDefault, isAdmin, impersonando } = useAuth()
  const canResponder = hasActionOrDefault('projetos/manifestacoes', 'responder_manifestacao')
  const canEncerrar  = hasActionOrDefault('projetos/manifestacoes', 'encerrar_periodo')
  const podeVerTodos = isAdmin || canResponder || canEncerrar

  const [projetos, setProjetos] = useState([])
  const [convidadoIds, setConvidadoIds] = useState(new Set())
  const [sistemaCorMap, setSistemaCorMap] = useState({})
  const [sistemaCorTextoMap, setSistemaCorTextoMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [verTodos, setVerTodos] = useState(isAdmin)
  const [encerradasAberta, setEncerradasAberta] = useState(false)

  // ── Manifestação Avulsa ───────────────────────────────────────────────────
  const [modalAvulsa, setModalAvulsa] = useState(false)
  const [avulsaCarregando, setAvulsaCarregando] = useState(false)
  const [avulsaSalvando, setAvulsaSalvando] = useState(false)
  const [avulsaErro, setAvulsaErro] = useState('')
  const [avulsaProjetos, setAvulsaProjetos] = useState([])
  const [avulsaUsuarios, setAvulsaUsuarios] = useState([])
  const [avulsaProjId, setAvulsaProjId] = useState('')
  const [avulsaPrazo, setAvulsaPrazo] = useState('')
  const [avulsaLinkDocs, setAvulsaLinkDocs] = useState('')
  const [avulsaBusca, setAvulsaBusca] = useState('')
  const [avulsaConvIds, setAvulsaConvIds] = useState(new Set())

  const carregarTudo = useCallback(async () => {
    setLoading(true)
    try {
      const [lista, convIds, sistemas] = await Promise.all([
        apiService.getProjetosLista(),
        apiService.getProjetosConvidadoIds(impersonando?.id || null),
        apiService.getProjSistemas(),
      ])
      setSistemaCorMap(Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b'])))
      setSistemaCorTextoMap(Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null])))
      setConvidadoIds(new Set(convIds))
      const detalhados = await Promise.all(lista.map(p => apiService.getProjetoById(p.id).catch(() => null)))
      const comPeriodo = detalhados.filter(p => p && (p.manifestacao_status === 'aberto' || p.manifestacao_status === 'encerrado'))
      const ids = comPeriodo.map(p => p.id)
      const [manifestacoes, convidadosRaw] = await Promise.all([
        apiService.getManifestacoesByProjetoIds(ids),
        apiService.getConvidadosByProjetoIds(ids),
      ])
      const manifestacoesPorProjeto = {}
      for (const m of manifestacoes) {
        if (!manifestacoesPorProjeto[m.projeto_id]) manifestacoesPorProjeto[m.projeto_id] = []
        manifestacoesPorProjeto[m.projeto_id].push(m)
      }
      const convidadosPorProjeto = {}
      for (const c of convidadosRaw) {
        if (!convidadosPorProjeto[c.projeto_id]) convidadosPorProjeto[c.projeto_id] = []
        if (c.usuarios?.nome) convidadosPorProjeto[c.projeto_id].push(c.usuarios.nome)
      }
      setProjetos(comPeriodo.map(p => ({
        ...p,
        proj_manifestacoes: manifestacoesPorProjeto[p.id] || [],
        participantes_nomes: convidadosPorProjeto[p.id] || [],
      })))
    } catch { /* silencioso */ }
    finally { setLoading(false) }
  }, [impersonando?.id])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  const projetosVisiveis = (verTodos
    ? projetos
    : projetos.filter(p => convidadoIds.has(p.id))
  ).sort((a, b) => {
    if (a.manifestacao_status === b.manifestacao_status) return 0
    return a.manifestacao_status === 'aberto' ? -1 : 1
  })

  const abrirModalAvulsa = async () => {
    setAvulsaProjId('')
    setAvulsaPrazo('')
    setAvulsaLinkDocs('')
    setAvulsaConvIds(new Set())
    setAvulsaBusca('')
    setAvulsaErro('')
    setAvulsaCarregando(true)
    setModalAvulsa(true)
    try {
      const [lista, users] = await Promise.all([
        apiService.getProjetosLista(),
        apiService.getUsuarios(),
      ])
      const abertosIds = new Set(projetos.filter(p => p.manifestacao_status === 'aberto').map(p => p.id))
      setAvulsaProjetos(
        lista
          .filter(p => p.status === 'concluido' && !abertosIds.has(p.id))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )
      setAvulsaUsuarios(users.filter(u => u.ativo !== false))
    } catch (err) {
      setAvulsaErro(err.message || String(err))
    } finally {
      setAvulsaCarregando(false)
    }
  }

  const salvarAvulsa = async () => {
    if (!avulsaProjId) { setAvulsaErro('Selecione um projeto.'); return }
    if (!avulsaPrazo)  { setAvulsaErro('Defina o prazo.'); return }
    setAvulsaErro('')
    setAvulsaSalvando(true)
    try {
      await apiService.updateProjeto(avulsaProjId, {
        manifestacao_status: 'aberto',
        manifestacao_prazo: avulsaPrazo,
        manifestacao_link_docs: avulsaLinkDocs.trim() || null,
        manifestacao_orientacao: null,
        manifestacao_encerrada_em: null,
        manifestacao_encerrada_por: null,
      })
      await apiService.setConvidadosManifestacao(avulsaProjId, [...avulsaConvIds])
      if (avulsaConvIds.size > 0) {
        apiService.enviarConvitesManifestacao(avulsaProjId, [...avulsaConvIds]).catch(() => {})
      }
      setModalAvulsa(false)
      carregarTudo()
    } catch (err) {
      setAvulsaErro(err.message || String(err))
    } finally {
      setAvulsaSalvando(false)
    }
  }

  const excluirPeriodo = async (p) => {
    if (!window.confirm(`Excluir o Período de Manifestação de "${p.nome}"?\nEsta ação remove o período mas não afeta o projeto.`)) return
    try {
      await apiService.updateProjeto(p.id, {
        manifestacao_status: 'nao_iniciado',
        manifestacao_prazo: null,
        manifestacao_link_docs: null,
        manifestacao_orientacao: null,
        manifestacao_encerrada_em: null,
        manifestacao_encerrada_por: null,
      })
      await apiService.setConvidadosManifestacao(p.id, [])
      carregarTudo()
    } catch (err) {
      alert('Erro ao excluir período: ' + (err.message || String(err)))
    }
  }

  const toggleAvulsaConv = (id) => {
    setAvulsaConvIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Manifestações</h1>
          <p className="text-xs text-slate-500 mt-1">
            {verTodos
              ? 'Exibindo todos os projetos com Período de Manifestação aberto.'
              : 'Exibindo apenas projetos nos quais você é participante convidado.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canEncerrar && (
            <button
              onClick={abrirModalAvulsa}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Manifestação Avulsa
            </button>
          )}
          {podeVerTodos && (
            <button
              onClick={() => setVerTodos(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                verTodos
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {verTodos ? 'Meus Projetos' : 'Ver Todos os Projetos'}
            </button>
          )}
        </div>
      </div>

      <ProjetosNav />

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-10 text-center text-slate-400 text-xs">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" />Carregando...
        </div>
      ) : (() => {
        const abertos    = projetosVisiveis.filter(p => p.manifestacao_status === 'aberto')
        const encerrados = projetosVisiveis.filter(p => p.manifestacao_status === 'encerrado')

        const renderLinha = (p) => {
          const aberto = p.manifestacao_status === 'aberto'
          const souParticipante = convidadoIds.has(p.id)
          const podeManifestar = aberto && souParticipante
          const sistNomes = Array.isArray(p.sistemas_nomes) ? p.sistemas_nomes : []
          const contagens = contarResultados(p.proj_manifestacoes)
          const temManifestacoes = Object.keys(contagens).length > 0
          const ORDEM = ['Pendente', 'Aprovado', 'Aprovado com Ressalvas', 'Respondido', 'De Acordo']
          return (
            <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{p.nome}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  {sistNomes.map(nome => {
                    const cor = sistemaCorMap[nome] || '#1e293b'
                    const corTexto = sistemaCorTextoMap[nome] || getTextColor(cor)
                    return (
                      <span key={nome}
                        style={{ backgroundColor: cor, color: corTexto }}
                        className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                        {nome}
                      </span>
                    )
                  })}
                  {(p.departamento_nome || p.area_nome) && (
                    <span className="text-[11px] text-slate-500">
                      {p.departamento_nome}{p.area_nome ? ` / ${p.area_nome}` : ''}
                    </span>
                  )}
                  {p.responsavel_nome && (
                    <span className="text-[11px] text-slate-400">Resp: {p.responsavel_nome}</span>
                  )}
                </div>
                {p.participantes_nomes?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Participantes:</span>
                    {p.participantes_nomes.map(nome => (
                      <span key={nome} className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600 whitespace-nowrap">
                        {nome}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {aberto ? `Prazo: ${fmtData(p.manifestacao_prazo)}` : `Encerrado em ${fmtData(p.manifestacao_encerrada_em)}`}
                </p>
              </div>

              {/* Badges de resultado — coluna central */}
              <div className="flex flex-wrap justify-center items-center gap-1.5 min-w-[180px]">
                {temManifestacoes
                  ? ORDEM.filter(r => contagens[r]).map(r => (
                      <span key={r} className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${RESULTADO_BADGE[r]}`}>
                        {contagens[r]} {r}
                      </span>
                    ))
                  : null
                }
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {canEncerrar && p.proj_manifestacoes?.length === 0 && (
                  <button
                    onClick={() => excluirPeriodo(p)}
                    title="Excluir período de manifestação"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => navigate(`/projetos/detalhe/${p.id}`, { state: { aba: 'manifestacoes' } })}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-colors shadow-sm ${
                    podeManifestar
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {podeManifestar ? <><Send className="h-3.5 w-3.5" /> Manifestar</> : <><Eye className="h-3.5 w-3.5" /> Visualizar</>}
                </button>
              </div>
            </div>
          )
        }

        return (
          <div className="space-y-4">
            {/* Em Andamento */}
            <div className="bg-white rounded-lg border border-blue-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 bg-blue-50 border-b border-blue-100">
                <span className="text-lg">🔄</span>
                <h2 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Manifestações em Andamento</h2>
                <span className="ml-auto text-xs font-semibold text-blue-500">{abertos.length} projeto(s)</span>
              </div>
              {abertos.length === 0 ? (
                <p className="px-5 py-6 text-center text-slate-400 text-sm">Nenhum período de manifestação em andamento.</p>
              ) : (
                <div className="divide-y divide-slate-100">{abertos.map(renderLinha)}</div>
              )}
            </div>

            {/* Encerradas — colapsável */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setEncerradasAberta(v => !v)}
                className="w-full flex items-center gap-2 px-5 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
              >
                <span className="text-lg">✅</span>
                <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Manifestações Encerradas</h2>
                <span className="text-xs font-semibold text-slate-400">{encerrados.length} projeto(s)</span>
                <span className="ml-auto text-slate-400">
                  {encerradasAberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {encerradasAberta && (
                encerrados.length === 0 ? (
                  <p className="px-5 py-6 text-center text-slate-400 text-sm">Nenhum período de manifestação encerrado.</p>
                ) : (
                  <div className="divide-y divide-slate-100">{encerrados.map(renderLinha)}</div>
                )
              )}
            </div>
          </div>
        )
      })()}

      {/* ── Modal Manifestação Avulsa ─────────────────────────────────────── */}
      {modalAvulsa && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-200 w-[560px] max-h-[85vh] shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Nova Manifestação Avulsa</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Abrir período de manifestação para projeto concluído</p>
              </div>
              <button onClick={() => setModalAvulsa(false)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {avulsaCarregando ? (
                <div className="flex items-center justify-center py-8 text-slate-400 text-xs gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando projetos...
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-[11px] text-amber-700">
                    Selecione um <strong>projeto concluído</strong> para abrir um período de manifestação sem alterar a fase atual do projeto.
                  </div>

                  {/* Projeto */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Projeto Concluído *</label>
                    <select
                      value={avulsaProjId}
                      onChange={e => setAvulsaProjId(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    >
                      <option value="">— Selecione —</option>
                      {avulsaProjetos.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    {avulsaProjetos.length === 0 && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">Nenhum projeto concluído disponível (sem manifestação ativa).</p>
                    )}
                  </div>

                  {/* Prazo */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Prazo para Manifestação *</label>
                    <input
                      type="date"
                      value={avulsaPrazo}
                      onChange={e => setAvulsaPrazo(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  {/* Link Docs */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">Link de Documentos (opcional)</label>
                    <input
                      type="url"
                      value={avulsaLinkDocs}
                      onChange={e => setAvulsaLinkDocs(e.target.value)}
                      placeholder="https://... (pasta SharePoint ou OneDrive)"
                      className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                  </div>

                  {/* Participantes */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                      Convidar Participantes
                      {avulsaConvIds.size > 0 && <span className="ml-1.5 text-blue-600">({avulsaConvIds.size} selecionado{avulsaConvIds.size > 1 ? 's' : ''})</span>}
                    </label>
                    <input
                      type="text"
                      value={avulsaBusca}
                      onChange={e => setAvulsaBusca(e.target.value)}
                      placeholder="Buscar por nome ou e-mail..."
                      className="w-full mb-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                    />
                    <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-50">
                      {avulsaUsuarios.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-400 italic">Nenhum usuário disponível.</p>
                      ) : (() => {
                        const q = avulsaBusca.toLowerCase().trim()
                        const lista = q
                          ? avulsaUsuarios.filter(u => u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
                          : avulsaUsuarios
                        if (lista.length === 0) return (
                          <p className="px-3 py-2 text-[11px] text-slate-400 italic">Nenhum usuário encontrado.</p>
                        )
                        return lista.map(u => (
                          <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={avulsaConvIds.has(u.id)}
                              onChange={() => toggleAvulsaConv(u.id)}
                              className="w-3.5 h-3.5 accent-blue-600"
                            />
                            <span className="flex-1 truncate">{u.nome}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">{u.email}</span>
                          </label>
                        ))
                      })()}
                    </div>
                  </div>
                </>
              )}

              {avulsaErro && (
                <p className="text-[11px] text-red-600 font-medium bg-red-50 border border-red-200 rounded px-3 py-2">{avulsaErro}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalAvulsa(false)}
                disabled={avulsaSalvando}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAvulsa}
                disabled={avulsaCarregando || avulsaSalvando || !avulsaProjId || !avulsaPrazo}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors"
              >
                {avulsaSalvando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Abrindo...</> : <><Plus className="h-3.5 w-3.5" /> Abrir Manifestação</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
