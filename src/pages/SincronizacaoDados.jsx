import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, X, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle, Power, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import { getStatusSincronizacao, executarSincronizacaoAgora } from '../services/kpiService'

const LABELS_PLANILHA = {
  resultados: 'Resultados',
  bloco1: 'Bloco 1 — Corporativo',
  bloco2: 'Bloco 2 — Operacional',
  backlog: 'Orçamento & Backlog',
}

const LABELS_FONTE = {
  CONSOLIDADO: 'Vendas de Produtos (RPR001)',
  SERVICOS_OFICINA: 'Serviços da Oficina (Recepcionista)',
  ROF042: 'Horas Aplicadas (ROF042)',
  ROF096: 'Horas Disponíveis (ROF096)',
  BALCAO: 'Peças Balcão',
}

const labelEmpresa = (empresa) => (empresa === 'todas' ? 'Todas as empresas' : empresa)

const DIAS_SEMANA = [
  { n: 1, curto: 'Seg', label: 'Segunda-feira' },
  { n: 2, curto: 'Ter', label: 'Terça-feira' },
  { n: 3, curto: 'Qua', label: 'Quarta-feira' },
  { n: 4, curto: 'Qui', label: 'Quinta-feira' },
  { n: 5, curto: 'Sex', label: 'Sexta-feira' },
  { n: 6, curto: 'Sáb', label: 'Sábado' },
  { n: 7, curto: 'Dom', label: 'Domingo' },
]

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const INP = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors'

const diasVazios = () => Object.fromEntries(DIAS_SEMANA.map(d => [d.n, []]))

function formatDataHora(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function duracao(inicio, fim) {
  if (!inicio || !fim) return null
  const ms = new Date(fim) - new Date(inicio)
  if (ms < 0) return null
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${s % 60}s`
}

// Agrupa os itens do extrator por fonte (5 empresas cada) para não listar
// 25 linhas soltas — mostra "N/5 empresas atualizadas" e detalha só as que falharam.
function agruparExtrator(extrator) {
  const porFonte = {}
  ;(extrator || []).forEach(e => {
    if (!porFonte[e.fonte]) porFonte[e.fonte] = { total: 0, ok: 0, falhas: [] }
    porFonte[e.fonte].total++
    if (e.ok) porFonte[e.fonte].ok++
    else porFonte[e.fonte].falhas.push({ empresa: e.empresa, erro: e.erro })
  })
  return porFonte
}

function DetalhesSincronizacao({ detalhes }) {
  const planilhas = detalhes?.planilhas || []
  const porFonte = agruparExtrator(detalhes?.extrator)

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
      {Object.entries(porFonte).map(([fonte, info]) => (
        <div key={fonte} className="text-xs">
          <div className="flex items-center gap-2">
            {info.falhas.length === 0
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              : <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
            <span className="font-medium text-slate-700">{LABELS_FONTE[fonte] || fonte}</span>
            <span className="text-slate-400">— {info.ok}/{info.total} empresas atualizadas</span>
          </div>
          {info.falhas.length > 0 && (
            <ul className="mt-1 ml-5 space-y-0.5">
              {info.falhas.map((f, i) => (
                <li key={i} className="text-slate-500">
                  <span className="font-medium text-slate-600">{labelEmpresa(f.empresa)}:</span> não atualizado — {f.erro}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {planilhas.map(p => (
        <div key={p.chave} className="text-xs flex items-start gap-2">
          {p.ok
            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
          <span>
            <span className="font-medium text-slate-700">{LABELS_PLANILHA[p.chave] || p.chave}</span>
            {p.ok ? <span className="text-slate-400"> — atualizado</span> : <span className="text-slate-500"> — não atualizado: {p.erro}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    SUCESSO:    { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2, label: 'Sucesso' },
    ERRO:       { cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle, label: 'Erro' },
    PARCIAL:    { cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle, label: 'Parcial' },
    EXECUTANDO: { cls: 'bg-sky-50 text-sky-700 border-sky-200', Icon: Loader2, label: 'Executando...' },
  }
  const cfg = map[status] || { cls: 'bg-slate-50 text-slate-600 border-slate-200', Icon: AlertTriangle, label: status || '—' }
  const { cls, Icon, label } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'EXECUTANDO' ? 'animate-spin' : ''}`} /> {label}
    </span>
  )
}

export default function SincronizacaoDados() {
  const { hasPermission, user } = useAuth()
  const canEdit = hasPermission('sincronizacao-dados', 'editar')

  const [config, setConfig] = useState({ ativo: true })
  const [dias, setDias] = useState(diasVazios())
  const [datasEspecificas, setDatasEspecificas] = useState([])
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [novoHorarioTemplate, setNovoHorarioTemplate] = useState('08:00')
  const [novaData, setNovaData] = useState('')
  const [novaDataHora, setNovaDataHora] = useState('08:00')
  const [erro, setErro] = useState('')
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false)
  const pollingRef = useRef(null)

  const loadTudo = useCallback(async () => {
    setLoading(true)
    try {
      const [cfg, horarios, datas, st] = await Promise.all([
        apiService.getKpiSyncConfig(),
        apiService.getKpiSyncHorariosSemana(),
        apiService.getKpiSyncDatasEspecificas(),
        getStatusSincronizacao(),
      ])
      setConfig(cfg)
      const agrupado = diasVazios()
      horarios.forEach(h => { agrupado[h.dia_semana] = [...agrupado[h.dia_semana], h.hora.slice(0, 5)].sort() })
      setDias(agrupado)
      setDatasEspecificas(datas)
      setStatus(st)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTudo() }, [loadTudo])

  // Enquanto uma sincronização estiver rodando, faz polling do status a cada 5s
  useEffect(() => {
    const emAndamento = status?.executandoAgora || status?.ultimaExecucao?.status === 'EXECUTANDO'
    if (!emAndamento) {
      clearInterval(pollingRef.current)
      return
    }
    pollingRef.current = setInterval(async () => {
      const st = await getStatusSincronizacao()
      setStatus(st)
    }, 5000)
    return () => clearInterval(pollingRef.current)
  }, [status])

  // Abre os detalhes automaticamente quando a sincronização termina PARCIAL ou com ERRO
  useEffect(() => {
    const st = status?.ultimaExecucao?.status
    if (st === 'PARCIAL' || st === 'ERRO') setMostrarDetalhes(true)
  }, [status?.ultimaExecucao?.id, status?.ultimaExecucao?.status])

  const toggleAtivo = async () => {
    const novo = !config.ativo
    setConfig(c => ({ ...c, ativo: novo }))
    await apiService.setKpiSyncAtivo(novo)
  }

  const addHorarioDia = (dia, hora) => {
    if (!hora) return
    setDias(d => ({ ...d, [dia]: d[dia].includes(hora) ? d[dia] : [...d[dia], hora].sort() }))
  }

  const removeHorarioDia = (dia, hora) => {
    setDias(d => ({ ...d, [dia]: d[dia].filter(h => h !== hora) }))
  }

  const aplicarTemplateTodosDias = () => {
    if (!novoHorarioTemplate) return
    setDias(d => {
      const novo = { ...d }
      DIAS_SEMANA.forEach(({ n }) => {
        novo[n] = novo[n].includes(novoHorarioTemplate) ? novo[n] : [...novo[n], novoHorarioTemplate].sort()
      })
      return novo
    })
  }

  const salvarHorarios = async () => {
    setSalvando(true)
    setErro('')
    try {
      const linhas = DIAS_SEMANA.flatMap(({ n }) => dias[n].map(hora => ({ dia_semana: n, hora, ativo: true })))
      await apiService.salvarKpiSyncHorariosSemana(linhas)
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const adicionarDataEspecifica = async () => {
    if (!novaData || !novaDataHora) return
    try {
      const criada = await apiService.createKpiSyncDataEspecifica({ data: novaData, hora: novaDataHora })
      setDatasEspecificas(d => [...d, criada].sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora)))
      setNovaData('')
    } catch (err) {
      setErro(err.message)
    }
  }

  const removerDataEspecifica = async (id) => {
    await apiService.deleteKpiSyncDataEspecifica(id)
    setDatasEspecificas(d => d.filter(x => x.id !== id))
  }

  const atualizarAgora = async () => {
    setExecutando(true)
    setErro('')
    try {
      await executarSincronizacaoAgora(user?.email)
      const st = await getStatusSincronizacao()
      setStatus(st)
    } catch (err) {
      setErro(err.message)
    } finally {
      setExecutando(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando...</div>

  const ultima = status?.ultimaExecucao
  const rodandoAgora = status?.executandoAgora || ultima?.status === 'EXECUTANDO'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Sincronização de Dados</h1>
        <p className="text-sm text-slate-500 mt-1">
          Agenda a leitura periódica do SharePoint para o Dashboard de KPI e a Matriz KPIs — as telas passam a ler
          os dados já sincronizados em vez de acessar o SharePoint a cada carregamento.
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
        </div>
      )}

      {/* Status / Atualizar Agora */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Última sincronização</div>
            {ultima ? (
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={ultima.status} />
                <span className="text-sm text-slate-600">{formatDataHora(ultima.iniciado_em)}</span>
                {ultima.finalizado_em && <span className="text-xs text-slate-400">({duracao(ultima.iniciado_em, ultima.finalizado_em)})</span>}
                <span className="text-xs text-slate-400">
                  {ultima.disparado_por === 'MANUAL' ? `Manual${ultima.usuario_email ? ` — ${ultima.usuario_email}` : ''}` : 'Agendado'}
                </span>
                {ultima.detalhes && (
                  <button
                    type="button"
                    onClick={() => setMostrarDetalhes(v => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    {mostrarDetalhes ? 'Ocultar detalhes' : 'Ver detalhes'}
                    {mostrarDetalhes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            ) : (
              <span className="text-sm text-slate-400">Nenhuma sincronização registrada ainda.</span>
            )}
          </div>
          {canEdit && (
            <button type="button" onClick={atualizarAgora} disabled={executando || rodandoAgora} className={BTN_PRI}>
              <RefreshCw className={`h-4 w-4 ${executando || rodandoAgora ? 'animate-spin' : ''}`} />
              {rodandoAgora ? 'Sincronizando...' : 'Atualizar Agora'}
            </button>
          )}
        </div>
        {mostrarDetalhes && ultima?.detalhes && <DetalhesSincronizacao detalhes={ultima.detalhes} />}
      </div>

      {/* Toggle geral */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-800">Agendamento automático</div>
          <div className="text-xs text-slate-500 mt-0.5">Liga/desliga o cronograma abaixo sem apagar os horários configurados.</div>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={toggleAtivo}
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors ${
            config.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
          } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
        >
          <Power className="h-3.5 w-3.5" /> {config.ativo ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      {/* Cronograma semanal */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-sm font-semibold text-slate-800 mb-3">Cronograma Semanal</div>

        {canEdit && (
          <div className="flex items-end gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div>
              <label className={LBL}>Horário</label>
              <input type="time" value={novoHorarioTemplate} onChange={e => setNovoHorarioTemplate(e.target.value)} className={INP} />
            </div>
            <button type="button" onClick={aplicarTemplateTodosDias} className={BTN_SEC}>
              <Plus className="h-4 w-4" /> Aplicar a Todos os Dias
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DIAS_SEMANA.map(({ n, label }) => (
            <div key={n} className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-slate-600 mb-2">{label}</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {dias[n].length === 0 && <span className="text-xs text-slate-400">Sem horários</span>}
                {dias[n].map(hora => (
                  <span key={hora} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2 py-0.5 text-xs font-medium">
                    {hora}
                    {canEdit && (
                      <button type="button" onClick={() => removeHorarioDia(n, hora)} className="hover:text-indigo-900">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {canEdit && (
                <DiaHorarioInput onAdd={hora => addHorarioDia(n, hora)} />
              )}
            </div>
          ))}
        </div>

        {canEdit && (
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={salvarHorarios} disabled={salvando} className={BTN_PRI}>
              {salvando ? 'Salvando...' : 'Salvar Cronograma Semanal'}
            </button>
          </div>
        )}
      </div>

      {/* Datas específicas */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-sm font-semibold text-slate-800 mb-1">Datas Específicas</div>
        <div className="text-xs text-slate-500 mb-3">Rodadas avulsas, além do cronograma semanal (ex.: fechamento do mês).</div>

        {canEdit && (
          <div className="flex items-end gap-2 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div>
              <label className={LBL}>Data</label>
              <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)} className={INP} />
            </div>
            <div>
              <label className={LBL}>Horário</label>
              <input type="time" value={novaDataHora} onChange={e => setNovaDataHora(e.target.value)} className={INP} />
            </div>
            <button type="button" onClick={adicionarDataEspecifica} className={BTN_SEC}>
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
        )}

        {datasEspecificas.length === 0 ? (
          <div className="text-sm text-slate-400">Nenhuma data específica cadastrada.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {datasEspecificas.map(d => (
              <span key={d.id} className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-3 py-1 text-xs font-medium">
                {new Date(`${d.data}T00:00:00`).toLocaleDateString('pt-BR')} às {d.hora.slice(0, 5)}
                {canEdit && (
                  <button type="button" onClick={() => removerDataEspecifica(d.id)} className="hover:text-indigo-900">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DiaHorarioInput({ onAdd }) {
  const [valor, setValor] = useState('08:00')
  return (
    <div className="flex items-center gap-1.5">
      <input type="time" value={valor} onChange={e => setValor(e.target.value)} className="border border-slate-300 rounded-md px-2 py-1 text-xs w-full" />
      <button type="button" onClick={() => onAdd(valor)} className="shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md p-1.5">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
