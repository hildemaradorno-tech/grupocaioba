import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Clock, Send, Eye, Lock, ChevronDown, ChevronUp } from 'lucide-react'
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
  const { hasActionOrDefault, isAdmin } = useAuth()
  const canResponder = hasActionOrDefault('projetos/manifestacoes', 'responder_manifestacao')
  const canEncerrar  = hasActionOrDefault('projetos/manifestacoes', 'encerrar_periodo')
  const podeVerTodos = isAdmin || canResponder || canEncerrar

  const [projetos, setProjetos] = useState([])
  const [convidadoIds, setConvidadoIds] = useState(new Set())
  const [sistemaCorMap, setSistemaCorMap] = useState({})
  const [sistemaCorTextoMap, setSistemaCorTextoMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [verTodos, setVerTodos] = useState(false)
  const [encerradasAberta, setEncerradasAberta] = useState(false)

  const carregarTudo = useCallback(async () => {
    setLoading(true)
    try {
      const [lista, convIds, sistemas] = await Promise.all([
        apiService.getProjetosLista(),
        apiService.getProjetosConvidadoIds(),
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
  }, [])

  useEffect(() => { carregarTudo() }, [carregarTudo])

  const projetosVisiveis = (verTodos
    ? projetos
    : projetos.filter(p => convidadoIds.has(p.id))
  ).sort((a, b) => {
    if (a.manifestacao_status === b.manifestacao_status) return 0
    return a.manifestacao_status === 'aberto' ? -1 : 1
  })

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
        {podeVerTodos && (
          <button
            onClick={() => setVerTodos(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors shrink-0 ${
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

              <button
                onClick={() => navigate(`/projetos/detalhe/${p.id}`, { state: { aba: 'manifestacoes' } })}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-md transition-colors shadow-sm shrink-0 ${
                  aberto
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {aberto ? <><Send className="h-3.5 w-3.5" /> Manifestar</> : <><Eye className="h-3.5 w-3.5" /> Visualizar</>}
              </button>
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
    </div>
  )
}
