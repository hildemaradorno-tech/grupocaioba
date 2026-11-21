// Governança › Monitor Railway (19/11/2026).
// Mostra os serviços do Railway (status do último deploy, saúde do domínio, consumo, deploys e logs).
// Os dados vêm do backend (/api/railway), que guarda o token da API do Railway — nada sai do navegador para o Railway.
import React, { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, LayoutDashboard, Rocket, ScrollText,
  Cpu, Globe, GitCommit, Clock, Loader2, Search, BadgeCheck, CreditCard,
} from 'lucide-react'
import { PainelControles, Relogio, BarraUso, useAbaNaUrl, useRolarParaAlvo, idAlvo } from '../../components/monitor/MonitorUI'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Logo do Railway (Railway_Logo.svg enviado pelo usuário em 19/11/2026); cor via currentColor
const LogoRailway = ({ className }) => (
  <svg viewBox="0 0 1024 1024" fill="currentColor" className={className} aria-label="Railway" role="img">
    <path d="M4.756 438.175A520.713 520.713 0 0 0 0 489.735h777.799c-2.716-5.306-6.365-10.09-10.045-14.772-132.97-171.791-204.498-156.896-306.819-161.26-34.114-1.403-57.249-1.967-193.037-1.967-72.677 0-151.688.185-228.628.39-9.96 26.884-19.566 52.942-24.243 74.14h398.571v51.909H4.756ZM783.93 541.696H.399c.82 13.851 2.112 27.517 3.978 40.999h723.39c32.248 0 50.299-18.297 56.162-40.999ZM45.017 724.306S164.941 1018.77 511.46 1024c207.112 0 385.071-123.006 465.907-299.694H45.017Z" />
    <path d="M511.454 0C319.953 0 153.311 105.16 65.31 260.612c68.771-.144 202.704-.226 202.704-.226h.031v-.051c158.309 0 164.193.707 195.118 1.998l19.149.706c66.7 2.224 148.683 9.384 213.19 58.19 35.015 26.471 85.571 84.896 115.708 126.52 27.861 38.499 35.876 82.756 16.933 125.158-17.436 38.97-54.952 62.215-100.383 62.215H16.69s4.233 17.944 10.58 37.751h970.632A510.385 510.385 0 0 0 1024 512.218C1024.01 229.355 794.532 0 511.454 0Z" />
  </svg>
)

const ABAS = [
  ['visao', 'Visão Geral', LayoutDashboard],
  ['plano', 'Plano e Capacidade', BadgeCheck],
  ['consumo', 'Consumo', Cpu],
  ['deploys', 'Deploys', Rocket],
  ['logs', 'Logs', ScrollText],
]

// Status de deployment documentados pelo Railway
const STATUS = {
  SUCCESS: { txt: 'No ar', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  BUILDING: { txt: 'Compilando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  DEPLOYING: { txt: 'Publicando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  QUEUED: { txt: 'Na fila', cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
  WAITING: { txt: 'Aguardando', cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
  FAILED: { txt: 'Falhou', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  CRASHED: { txt: 'Travou', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  SLEEPING: { txt: 'Dormindo', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  REMOVED: { txt: 'Substituído', cls: 'bg-slate-50 text-slate-400 border-slate-200', icon: Clock },
  SKIPPED: { txt: 'Ignorado', cls: 'bg-slate-50 text-slate-400 border-slate-200', icon: Clock },
}
const BadgeStatus = ({ status }) => {
  const s = STATUS[status] || { txt: status || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === 'BUILDING' || status === 'DEPLOYING' ? 'animate-spin' : ''}`} /> {s.txt}
    </span>
  )
}

// Situação da assinatura (enum SubscriptionState do Railway)
const SITUACAO = {
  ACTIVE: { txt: 'Ativa', cls: 'text-emerald-600' },
  PAST_DUE: { txt: 'Pagamento em atraso', cls: 'text-red-600' },
  UNPAID: { txt: 'Não paga', cls: 'text-red-600' },
  INACTIVE: { txt: 'Inativa', cls: 'text-red-600' },
  CANCELLED: { txt: 'Cancelada', cls: 'text-red-600' },
}
// Links do painel do Railway citados na documentação (docs.railway.com/pricing/faqs)
const LINK_BILLING = 'https://railway.com/workspace/billing'
const LINK_PLANOS = 'https://railway.com/workspace/plans'
// Regra do plano Hobby (docs.railway.com/reference/pricing/plans, conferida em 19/11/2026): US$ 5/mês com
// US$ 5 de consumo incluídos; só o que passar disso é cobrado a mais. A API não traz esses valores.
const MENSALIDADE = { HOBBY: 5 }
const USO_INCLUIDO = { HOBBY: 5 }
const PLANO_NOME = { FREE: 'Free (gratuito)', HOBBY: 'Hobby', PRO: 'Pro' }
const usd = (v) => v == null ? '—' : `US$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const soData = (iso) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

const dataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const tempoAtras = (iso) => {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}

async function api(caminho) {
  const r = await fetch(`${BACKEND_URL}/api/railway${caminho}`)
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) {
    if (j?.error === 'railway_not_configured') throw new Error('O token da API do Railway ainda não foi configurado no backend (variável RAILWAY_API_TOKEN).')
    throw new Error(j?.error || `HTTP ${r.status}`)
  }
  return j
}

export default function MonitorRailway() {
  // Aba na URL + rolagem até o alvo do alerta clicado (21/11/2026)
  const [aba, setAba, irPara] = useAbaNaUrl(ABAS.map(a => a[0]), 'visao')
  useRolarParaAlvo()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [pings, setPings] = useState({}) // dominio -> resultado
  const [servicoSel, setServicoSel] = useState('') // chave projeto|serviço|ambiente
  const [plano, setPlano] = useState(null)
  const [erroPlano, setErroPlano] = useState(null)
  const [controles, setControles] = useState(null)
  const [erroControles, setErroControles] = useState(null)
  const [recarregandoControles, setRecarregandoControles] = useState(false)

  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try {
      setRecarregandoControles(true)
      api(`/controles${refresh ? '?refresh=1' : ''}`)
        .then(c => { setControles(c); setErroControles(null) })
        .catch(e => setErroControles(e.message))
        .finally(() => setRecarregandoControles(false))
      api(`/plano${refresh ? '?refresh=1' : ''}`)
        .then(p => { setPlano(p); setErroPlano(null) })
        .catch(e => setErroPlano(e.message))
      const j = await api(`/visao${refresh ? '?refresh=1' : ''}`)
      setDados(j)
      // testa a saúde de cada domínio público
      const doms = [...new Set(j.servicos.map(s => s.dominio).filter(Boolean))]
      doms.forEach(d => api(`/ping?dominio=${encodeURIComponent(d)}`)
        .then(p => setPings(prev => ({ ...prev, [d]: p })))
        .catch(e => setPings(prev => ({ ...prev, [d]: { no_ar: false, erro: e.message } }))))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  const servicos = dados?.servicos || []
  useEffect(() => {
    if (!servicoSel && servicos.length) {
      // padrão: primeiro serviço em produção
      const prod = servicos.find(s => /prod/i.test(s.ambiente)) || servicos[0]
      setServicoSel(prod.chave)
    }
  }, [servicos, servicoSel])
  const servico = servicos.find(s => s.chave === servicoSel) || null
  const mostrarProjeto = new Set(servicos.map(s => s.projeto_id)).size > 1
  const nomeServico = (s) => `${mostrarProjeto ? `${s.projeto} › ` : ''}${s.servico} (${s.ambiente})`

  const seletorServico = (
    <select value={servicoSel} onChange={e => setServicoSel(e.target.value)}
      className="border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white text-slate-700 max-w-md">
      {servicos.map(s => <option key={s.chave} value={s.chave}>{nomeServico(s)}</option>)}
    </select>
  )

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <LogoRailway className="h-10 w-10 text-[#100F13] shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Monitor Railway</h1>
            <p className="text-[10px] text-slate-500">Hospedagem do backend — é onde o servidor Node/Express fica no ar, disponível 24 horas por dia num endereço fixo que o frontend chama sempre que precisa de algo que vem do SharePoint</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 leading-tight text-right whitespace-nowrap">
            Lido em: <strong className="text-slate-700">{carregando ? '...' : dataHora(dados?.lido_em)}</strong>
          </p>
          <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Atualizar dados" aria-label="Atualizar dados"
            className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map(([k, n, Icon]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px ${aba === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="h-3.5 w-3.5" /> {n}
          </button>
        ))}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
        </div>
      )}

      {/* Alerta da assinatura em todas as abas: pagamento em atraso/inativa pode tirar o backend do ar */}
      {(plano?.workspaces || []).filter(w => w.assinatura.situacao && w.assinatura.situacao !== 'ACTIVE').map(w => (
        <div key={w.id} className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-start gap-2">
          <CreditCard className="h-4 w-4 shrink-0 mt-px" />
          <span className="flex-1">
            <strong>Assinatura do Railway: {SITUACAO[w.assinatura.situacao]?.txt || w.assinatura.situacao}.</strong>{' '}
            Se a cobrança não for paga, o Railway para os serviços até quitar as faturas em aberto — e o backend do sistema sai do ar.
            {(plano?.workspaces || []).length > 1 && <> Confira no canto superior esquerdo do Railway se o workspace selecionado é <strong>{w.nome}</strong>.</>}
          </span>
          {/* Página de Billing do workspace (link da documentação do Railway: faturas em aberto e forma de pagamento) */}
          <a href={LINK_BILLING} target="_blank" rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold shadow-sm transition-colors">
            <CreditCard className="h-3.5 w-3.5" /> Pagar no Railway
          </a>
        </div>
      ))}

      {carregando && !dados ? <p className="text-[11px] text-slate-400">Consultando o Railway...</p> : dados && (
        <>
          {aba === 'visao' && <AbaVisao servicos={servicos} pings={pings} nomeServico={nomeServico}
            capacidade={plano?.workspaces?.[0]?.capacidade}
            controles={controles} erroControles={erroControles} recarregandoControles={recarregandoControles} onIr={irPara} />}
          {aba === 'plano' && <AbaPlano plano={plano} erro={erroPlano} servicos={servicos} nomeServico={nomeServico} />}
          {aba === 'consumo' && servico && <AbaConsumo servico={servico} seletor={seletorServico} capacidade={plano?.workspaces?.[0]?.capacidade} />}
          {aba === 'deploys' && <AbaDeploys servicos={servicos} nomeServico={nomeServico} />}
          {aba === 'logs' && servico && <AbaLogs servico={servico} seletor={seletorServico} />}
          {!servicos.length && <p className="text-[11px] text-slate-400">Nenhum serviço com deploy encontrado para este token.</p>}
        </>
      )}
    </div>
  )
}

// Tempo de resposta: 0–4 s — Ótimo / Bom / Lento / Ruim
const FAIXAS_RESP = [
  { ate: 500, txt: 'Ótimo', cor: '#10b981' },
  { ate: 1500, txt: 'Bom', cor: '#6ee7b7', corTexto: '#059669' },
  { ate: 3000, txt: 'Lento', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 4000, txt: 'Ruim', cor: '#f87171', corTexto: '#dc2626' },
]
function IndicadorResposta({ ms }) {
  return <Relogio valor={ms} faixas={FAIXAS_RESP} marcas={[0, 1000, 2000, 3000, 4000]} fmtMarca={v => `${v / 1000}s`}
    rotuloAria={`Tempo de resposta ${ms} ms`} />
}

// Memória: 0 até o limite do plano (8 GB) — Folga até 60%, Atenção até 85%, Crítico acima (mesma regra do painel)
function IndicadorMemoria({ atualGb, picoGb, limiteGb }) {
  const faixas = [
    { ate: limiteGb * 0.6, txt: 'Folga', cor: '#10b981' },
    { ate: limiteGb * 0.85, txt: 'Atenção', cor: '#fbbf24', corTexto: '#d97706' },
    { ate: limiteGb, txt: 'Crítico', cor: '#f87171', corTexto: '#dc2626' },
  ]
  const passo = limiteGb <= 8 ? 2 : Math.ceil(limiteGb / 4)
  const marcas = []
  for (let v = 0; v <= limiteGb + 1e-9; v += passo) marcas.push(v)
  return <Relogio valor={atualGb} faixas={faixas} marcas={marcas} fmtMarca={v => `${v}GB`} marcador={picoGb}
    rotuloAria={`Memória ${atualGb} GB de ${limiteGb} GB`} />
}

// ── Visão Geral: pontos de controle + um card por serviço/ambiente ──────────
function AbaVisao({ servicos, pings, nomeServico, capacidade, controles, erroControles, recarregandoControles, onIr }) {
  // Memória de cada serviço (agora e pico de 7 dias) para o relógio de memória
  const [mem, setMem] = useState({})
  useEffect(() => {
    servicos.forEach(s => {
      api(`/metricas?projectId=${s.projeto_id}&serviceId=${s.servico_id}&environmentId=${s.ambiente_id}&horas=168`)
        .then(j => {
          const v = (j.series.MEMORY_USAGE_GB || []).map(x => x.valor)
          setMem(prev => ({ ...prev, [s.chave]: v.length ? { atual: v[v.length - 1], pico: Math.max(...v), media: v.reduce((a, b) => a + b, 0) / v.length } : { vazio: true } }))
        })
        .catch(e => setMem(prev => ({ ...prev, [s.chave]: { erro: e.message } })))
    })
  }, [servicos.map(s => s.chave).join(',')])
  const limiteGb = capacidade?.memoria_bytes ? capacidade.memoria_bytes / 1e9 : null
  const fmtGb = (gb) => gb == null ? '—' : gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
  return (
    <div className="space-y-4">
      <PainelControles controles={controles} erro={erroControles} recarregando={recarregandoControles} onIr={onIr} />
      {/* Cards Serviços / No ar / Com falha / Resposta média saíram (19/11/2026): a falha aparece dentro do card
          do serviço só quando acontece, e o relógio de resposta fica na "Saúde do domínio" do serviço. */}
      {/* Um card por serviço, ocupando a largura da página: identificação | saúde e deploy | relógio */}
      <div className="space-y-3">
        {servicos.map(s => {
          const p = s.dominio ? pings[s.dominio] : null
          const u = s.ultimo
          return (
            <div key={s.chave} id={idAlvo(`servico-${s.chave}`)} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-6 items-center">
                {/* Identificação e, abaixo, o último deploy */}
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-[11px] text-slate-400">Serviço</p>
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{nomeServico(s)}</p>
                      <span className="shrink-0"><BadgeStatus status={u?.status} /></span>
                    </div>
                    {s.dominio && (
                      <a href={`https://${s.dominio}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline break-all">
                        <Globe className="h-3 w-3 shrink-0" /> {s.dominio}
                      </a>
                    )}
                  </div>
                  <div className="text-[11px]">
                    <p className="text-slate-400">Último deploy</p>
                    <p className="text-sm font-bold text-slate-800">{dataHora(u?.criado_em)} <span className="text-[11px] font-normal text-slate-500">{tempoAtras(u?.criado_em)}</span></p>
                  </div>
                </div>
                {/* Relógio de memória (agora × limite do plano; traço tracejado = pico de 7 dias) */}
                <div className="w-56 justify-self-center md:border-l md:border-slate-100 md:pl-6 text-center"
                  title={limiteGb ? `Memória em uso agora sobre os ${capacidade?.memoria} do plano. Traço tracejado = maior uso nos últimos 7 dias. Folga até 60% · atenção até 85% · crítico acima.` : undefined}>
                  {(() => {
                    const m = mem[s.chave]
                    if (!limiteGb || !m) return <p className="text-[11px] text-slate-400 py-6">medindo memória...</p>
                    if (m.erro || m.vazio) return <p className="text-[11px] text-slate-400 py-6">memória indisponível</p>
                    return (
                      <>
                        <IndicadorMemoria atualGb={m.atual} picoGb={m.pico} limiteGb={limiteGb} />
                        <div className="text-[11px] mt-1">
                          <p className="text-slate-400">Memória</p>
                          <p className="font-semibold text-slate-700">{fmtGb(m.atual)} de {capacidade.memoria} · pico 7 dias {fmtGb(m.pico)}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
                {/* Relógio do tempo de resposta e, abaixo dele, a saúde do domínio */}
                <div className="w-56 justify-self-center md:justify-self-end md:border-l md:border-slate-100 md:pl-6 text-center"
                  title={p?.ms != null ? `Tempo de resposta: ${p.ms} ms. Até 0,5 s ótimo · até 1,5 s bom · até 3 s lento · acima disso ruim (vira alerta).` : undefined}>
                  {p?.no_ar && p.ms != null && <IndicadorResposta ms={p.ms} />}
                  <div className="text-[11px] mt-1">
                    <p className="text-slate-400">Saúde do domínio</p>
                    {!s.dominio ? <p className="text-slate-400">sem domínio público</p>
                      : !p ? <p className="text-slate-400">testando...</p>
                      : p.no_ar
                        ? <p className="font-semibold text-emerald-600 inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Respondendo · {p.ms} ms</p>
                        : <p className="font-semibold text-red-600 inline-flex items-center gap-1"><XCircle className="h-3 w-3" /> Fora do ar{p.http ? ` · HTTP ${p.http}` : ''}{p.erro ? ` · ${p.erro}` : ''}</p>}
                  </div>
                </div>
              </div>
              {s.erro && <p className="text-[11px] text-red-600">{s.erro}</p>}
              {/* Com falha / travado — só aparece quando acontece */}
              {['FAILED', 'CRASHED'].includes(u?.status) && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[11px] text-red-700">
                  <XCircle className="h-4 w-4 shrink-0 mt-px" />
                  <span>
                    <strong>{u.status === 'CRASHED' ? 'Serviço travado' : 'Último deploy com falha'}</strong> em {dataHora(u.criado_em)}.{' '}
                    {s.ativo
                      ? <>Continua rodando o deploy anterior, de {dataHora(s.ativo.criado_em)}.</>
                      : <>Nenhum deploy anterior em uso — o sistema pode estar fora do ar.</>}
                    {' '}Veja o motivo na aba <strong>Logs</strong>.
                  </span>
                </div>
              )}
              {u && u.status !== 'SUCCESS' && !['FAILED', 'CRASHED'].includes(u.status) && s.ativo && (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  O último deploy não está no ar; o que está rodando é o de {dataHora(s.ativo.criado_em)}{s.ativo.commit ? ` (${s.ativo.commit})` : ''}.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Consumo: CPU, memória e rede ───────────────────────────────────────────
const PERIODOS = [[1, '1 h'], [6, '6 h'], [24, '24 h'], [168, '7 dias']]
function AbaConsumo({ servico, seletor, capacidade }) {
  const [horas, setHoras] = useState(6)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)
  useEffect(() => {
    let vivo = true
    setCarregando(true); setErro(null)
    api(`/metricas?projectId=${servico.projeto_id}&serviceId=${servico.servico_id}&environmentId=${servico.ambiente_id}&horas=${horas}`)
      .then(j => { if (vivo) setDados(j) })
      .catch(e => { if (vivo) { setErro(e.message); setDados(null) } })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [servico.chave, horas])

  const fmtHora = (ts) => {
    const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts)
    return horas > 24 ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit' }) : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }
  const serie = (k) => dados?.series?.[k] || []
  const juntar = (a, b, ka, kb) => {
    const m = new Map()
    serie(a).forEach(p => m.set(p.ts, { ts: p.ts, [ka]: p.valor }))
    serie(b).forEach(p => m.set(p.ts, { ...(m.get(p.ts) || { ts: p.ts }), [kb]: p.valor }))
    return [...m.values()].sort((x, y) => (x.ts > y.ts ? 1 : -1))
  }
  const cpu = serie('CPU_USAGE').map(p => ({ ts: p.ts, cpu: +p.valor.toFixed(3) }))
  const mem = serie('MEMORY_USAGE_GB').map(p => ({ ts: p.ts, mem: +(p.valor * 1024).toFixed(0) }))
  const rede = juntar('NETWORK_RX_GB', 'NETWORK_TX_GB', 'rx', 'tx').map(p => ({ ts: p.ts, rx: +((p.rx || 0) * 1024).toFixed(2), tx: +((p.tx || 0) * 1024).toFixed(2) }))
  const ultimo = (arr, k) => arr.length ? arr[arr.length - 1][k] : null
  const max = (arr, k) => arr.length ? Math.max(...arr.map(x => x[k] || 0)) : null

  const grafico = (titulo, dadosG, linhas, unidade) => (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <p className="text-[11px] font-semibold text-slate-600 mb-2">{titulo}</p>
      {dadosG.length === 0 ? <p className="text-[11px] text-slate-400 py-8 text-center">Sem dados no período.</p> : (
        <ResponsiveContainer width="100%" height={200}>
          {linhas.length === 1 ? (
            <AreaChart data={dadosG}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ts" tickFormatter={fmtHora} tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip labelFormatter={fmtHora} formatter={(v) => [`${v} ${unidade}`, linhas[0].nome]} contentStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey={linhas[0].k} stroke={linhas[0].cor} fill={linhas[0].cor} fillOpacity={0.15} strokeWidth={1.5} dot={false} />
            </AreaChart>
          ) : (
            <LineChart data={dadosG}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="ts" tickFormatter={fmtHora} tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis tick={{ fontSize: 10 }} width={45} />
              <Tooltip labelFormatter={fmtHora} formatter={(v, n) => [`${v} ${unidade}`, n]} contentStyle={{ fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {linhas.map(l => <Line key={l.k} type="monotone" dataKey={l.k} name={l.nome} stroke={l.cor} strokeWidth={1.5} dot={false} />)}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )

  return (
    <div id={idAlvo('consumo')} className="space-y-3 rounded-xl">
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
        {seletor}
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          {PERIODOS.map(([h, n]) => (
            <button key={h} type="button" onClick={() => setHoras(h)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${horas === h ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{n}</button>
          ))}
        </div>
        {carregando && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
      </div>
      {erro ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Consumo indisponível na API do Railway para este token: {erro}
        </div>
      ) : dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['CPU agora (vCPU)', ultimo(cpu, 'cpu'), capacidade?.cpu], ['Pico de CPU (vCPU)', max(cpu, 'cpu'), capacidade?.cpu],
              ['Memória agora (MB)', ultimo(mem, 'mem'), capacidade?.memoria], ['Pico de memória (MB)', max(mem, 'mem'), capacidade?.memoria],
            ].map(([rot, val, lim]) => (
              <div key={rot} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-[11px] text-slate-500">{rot}</p>
                <p className="text-base font-bold text-slate-800">{val ?? '—'}{lim && <span className="ml-1 text-[11px] font-normal text-slate-400">de {lim} do plano</span>}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            {grafico('CPU (vCPU)', cpu, [{ k: 'cpu', nome: 'CPU', cor: '#6366f1' }], 'vCPU')}
            {grafico('Memória (MB)', mem, [{ k: 'mem', nome: 'Memória', cor: '#0ea5e9' }], 'MB')}
            {grafico('Rede (MB acumulado)', rede, [{ k: 'rx', nome: 'Recebido', cor: '#10b981' }, { k: 'tx', nome: 'Enviado', cor: '#f59e0b' }], 'MB')}
          </div>
        </>
      )}
    </div>
  )
}

// ── Deploys: histórico de todos os serviços ────────────────────────────────
function AbaDeploys({ servicos, nomeServico }) {
  const linhas = useMemo(() => servicos
    .flatMap(s => s.deploys.map(d => ({ ...d, servicoNome: nomeServico(s), emUso: s.ativo?.id === d.id })))
    .sort((a, b) => (a.criado_em < b.criado_em ? 1 : -1)), [servicos])
  return (
    <div id={idAlvo('deploys')} className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
            <th className="p-3">Data</th><th className="p-3">Serviço</th><th className="p-3">Status</th>
            <th className="p-3">Commit</th><th className="p-3">Autor / Branch</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
          {linhas.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-400">Nenhum deploy.</td></tr> : linhas.map(d => (
            <tr key={d.id} className="hover:bg-slate-50/70">
              <td className="p-3 whitespace-nowrap">{dataHora(d.criado_em)} <span className="text-[10px] text-slate-400">{tempoAtras(d.criado_em)}</span></td>
              <td className="p-3 whitespace-nowrap font-semibold">{d.servicoNome}</td>
              <td className="p-3 whitespace-nowrap">
                <BadgeStatus status={d.status} />
                {d.emUso && <span className="ml-1.5 text-[10px] font-bold text-emerald-600">em uso</span>}
              </td>
              <td className="p-3">
                {d.commit && <span className="font-mono text-slate-500 mr-1.5">{d.commit}</span>}
                <span className="text-slate-600">{d.mensagem || '—'}</span>
              </td>
              <td className="p-3 whitespace-nowrap text-slate-500">{[d.autor, d.branch].filter(Boolean).join(' · ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Logs do deploy em uso (ou o último) ────────────────────────────────────
function AbaLogs({ servico, seletor }) {
  const deployLog = servico.ativo || servico.ultimo
  const [logs, setLogs] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [soErros, setSoErros] = useState(false)
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(300)
  const carregarLogs = () => {
    if (!deployLog) return
    setCarregando(true); setErro(null)
    api(`/logs?deploymentId=${deployLog.id}&limit=${limite}`)
      .then(j => setLogs(j.logs))
      .catch(e => { setErro(e.message); setLogs(null) })
      .finally(() => setCarregando(false))
  }
  useEffect(() => { carregarLogs() }, [servico.chave, limite])

  const ehErro = (l) => /err|fatal|crit/i.test(l.severidade || '') || /\berror\b|erro|exception|unhandled|ECONN|failed/i.test(l.mensagem || '')
  const q = busca.trim().toLowerCase()
  const filtrados = (logs || []).filter(l => (!soErros || ehErro(l)) && (!q || (l.mensagem || '').toLowerCase().includes(q)))
  const qtdErros = (logs || []).filter(ehErro).length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
        {seletor}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2 top-1/2 -translate-y-1/2" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no log..."
            className="border border-slate-200 rounded-md pl-7 pr-2 py-1 text-[11px] bg-white text-slate-700 w-56" />
        </div>
        <button type="button" onClick={() => setSoErros(v => !v)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${soErros ? 'bg-red-50 text-red-700 border-red-200' : 'text-slate-500 border-slate-200 hover:text-slate-700'}`}>
          Só erros ({qtdErros})
        </button>
        <select value={limite} onChange={e => setLimite(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white text-slate-700">
          {[100, 300, 500, 1000].map(n => <option key={n} value={n}>Últimas {n} linhas</option>)}
        </select>
        <button type="button" onClick={carregarLogs} disabled={carregando} title="Recarregar logs"
          className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:text-slate-700 disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
        </button>
        {deployLog && <span className="text-[10px] text-slate-400 ml-auto">Deploy de {dataHora(deployLog.criado_em)}{deployLog.commit ? ` · ${deployLog.commit}` : ''}</span>}
      </div>
      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
        </div>
      )}
      {!deployLog ? <p className="text-[11px] text-slate-400">Este serviço não tem deploy.</p> : logs && (
        <div className="bg-slate-900 rounded-xl p-3 max-h-[60vh] overflow-auto font-mono text-[11px] leading-relaxed">
          {filtrados.length === 0 ? <p className="text-slate-500">Nenhuma linha.</p> : filtrados.map((l, i) => (
            <div key={i} className={`whitespace-pre-wrap break-words ${ehErro(l) ? 'text-red-300' : 'text-slate-200'}`}>
              <span className="text-slate-500 mr-2">{l.ts ? new Date(l.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}</span>
              {l.mensagem}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Plano e Capacidade: plano, assinatura, uso do ciclo e limites do plano ─
// Uso × Capacidade do plano: memória/CPU de cada serviço (agora e pico de 7 dias) contra o limite do plano,
// gasto do ciclo contra o limite de gasto e a projeção até o fim do ciclo.
function UsoCapacidade({ w, servicos, nomeServico }) {
  const c = w.capacidade
  const a = w.assinatura
  const [met, setMet] = useState({}) // chave -> { memAtual, memPico, cpuAtual, cpuPico } | { erro }
  useEffect(() => {
    servicos.forEach(s => {
      api(`/metricas?projectId=${s.projeto_id}&serviceId=${s.servico_id}&environmentId=${s.ambiente_id}&horas=168`)
        .then(j => {
          const mem = (j.series.MEMORY_USAGE_GB || []).map(p => p.valor)
          const cpu = (j.series.CPU_USAGE || []).map(p => p.valor)
          setMet(prev => ({ ...prev, [s.chave]: {
            memAtual: mem.at(-1) ?? null, memPico: mem.length ? Math.max(...mem) : null,
            cpuAtual: cpu.at(-1) ?? null, cpuPico: cpu.length ? Math.max(...cpu) : null,
          } }))
        })
        .catch(e => setMet(prev => ({ ...prev, [s.chave]: { erro: e.message } })))
    })
  }, [servicos.map(s => s.chave).join(',')])

  const memLimGb = c.memoria_bytes ? c.memoria_bytes / 1e9 : null
  const fmtGb = (gb) => gb == null ? '—' : gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`

  // Gasto do ciclo e projeção (uso até agora ÷ dias corridos × dias do ciclo)
  const ini = a.ciclo_inicio ? new Date(a.ciclo_inicio).getTime() : null
  const fim = a.ciclo_fim ? new Date(a.ciclo_fim).getTime() : null
  const diasTot = ini && fim ? (fim - ini) / 864e5 : null
  const diasPass = ini ? Math.max(0.5, (Date.now() - ini) / 864e5) : null
  const projecao = a.uso_atual_usd != null && diasTot && diasPass ? (a.uso_atual_usd / diasPass) * diasTot : null
  const lim = a.limite_gasto
  const limGasto = lim?.rigido != null ? lim.rigido : lim?.aviso != null ? lim.aviso : null
  const incluido = USO_INCLUIDO[w.plano] ?? null

  return (
    <div id={idAlvo('plano-uso')} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <p className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Uso × Capacidade do plano</p>
      <div className="p-4 space-y-4">
        {servicos.map(s => {
          const m = met[s.chave]
          return (
            <div key={s.chave} className="space-y-2.5">
              <p className="text-[11px] font-bold text-slate-700">{nomeServico(s)}</p>
              {!m ? <p className="text-[11px] text-slate-400">Calculando...</p> : m.erro ? <p className="text-[11px] text-amber-700">Consumo indisponível: {m.erro}</p> : (
                <>
                  <BarraUso rotulo="Memória (RAM) — uso agora" usado={m.memAtual || 0} total={memLimGb}
                    txtUsado={fmtGb(m.memAtual)} txtTotal={c.memoria || '—'}
                    pctMarcador={memLimGb && m.memPico != null ? (m.memPico / memLimGb) * 100 : null}
                    txtMarcador={`Pico de 7 dias: ${fmtGb(m.memPico)}`}
                    obs={`Maior uso nos últimos 7 dias: ${fmtGb(m.memPico)} (traço cinza na barra). Barra verde = folga; amarela acima de 60% e vermelha acima de 85% do plano.`} />
                  <BarraUso rotulo="Processador (CPU) — uso agora" usado={m.cpuAtual || 0} total={c.cpu_vcpu}
                    txtUsado={`${(m.cpuAtual ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} vCPU`} txtTotal={c.cpu || '—'}
                    pctMarcador={c.cpu_vcpu && m.cpuPico != null ? (m.cpuPico / c.cpu_vcpu) * 100 : null}
                    txtMarcador={`Pico de 7 dias: ${m.cpuPico} vCPU`}
                    obs={`Maior uso nos últimos 7 dias: ${(m.cpuPico ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} vCPU (traço cinza na barra). 1 vCPU = 1 núcleo de processador; o plano libera até ${c.cpu || '—'} para o backend.`} />
                </>
              )}
            </div>
          )
        })}
        <div className="border-t border-slate-100 pt-3 space-y-2.5">
          <BarraUso rotulo="Projetos" usado={w.projetos} total={c.projetos_max} txtUsado={w.projetos} txtTotal={c.projetos_max ?? '—'} />
          {limGasto ? (
            <BarraUso rotulo="Gasto do ciclo × limite de gasto" usado={a.uso_atual_usd || 0} total={limGasto}
              txtUsado={usd(a.uso_atual_usd)} txtTotal={usd(limGasto)}
              pctMarcador={projecao != null ? (projecao / limGasto) * 100 : null} txtMarcador={`Projeção até o fim do ciclo: ${usd(projecao)}`}
              obs={projecao != null ? `Projeção até ${soData(a.ciclo_fim)}: ${usd(projecao)} (traço na barra)` : null} />
          ) : incluido ? (
            // Sem limite de gasto: compara com o uso incluído na mensalidade (Hobby = US$ 5 de uso incluso)
            <BarraUso rotulo="Consumo do ciclo × uso incluído na mensalidade" usado={a.uso_atual_usd || 0} total={incluido}
              txtUsado={usd(a.uso_atual_usd)} txtTotal={usd(incluido)}
              pctMarcador={projecao != null ? (projecao / incluido) * 100 : null} txtMarcador={`Projeção até o fim do ciclo: ${usd(projecao)}`}
              obs={projecao != null ? `Projeção até ${soData(a.ciclo_fim)}: ${usd(projecao)} (traço na barra)` : null} />
          ) : (
            <div className="text-[11px] flex items-baseline justify-between gap-2">
              <span className="text-slate-600 font-semibold">Consumo do ciclo</span>
              <span className="text-slate-500"><strong className="text-slate-800">{usd(a.uso_atual_usd)}</strong>{projecao != null && <> · projeção até {soData(a.ciclo_fim)}: <strong className="text-slate-800">{usd(projecao)}</strong></>}</span>
            </div>
          )}
          {/* O que de fato será cobrado (regra do plano Hobby na documentação do Railway) */}
          {incluido != null && (
            <div className={`rounded-lg border px-3 py-2 text-[11px] ${projecao != null && projecao > incluido ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
              <strong>Quanto você vai pagar neste ciclo: </strong>
              {projecao != null && projecao > incluido
                ? <>cerca de {usd(projecao)} — a mensalidade de {usd(MENSALIDADE[w.plano])} já cobre {usd(incluido)} de consumo, e o que passar disso (≈ {usd(projecao - incluido)}) é cobrado a mais.</>
                : <>só a mensalidade de {usd(MENSALIDADE[w.plano])}. O consumo projetado ({usd(projecao)}) está dentro dos {usd(incluido)} que já vêm incluídos no plano — não há cobrança extra.</>}
              <span className="block text-[10px] opacity-80 mt-0.5">
                O consumo é a soma de memória, CPU, rede e disco usados pelo backend. Só é cobrado o que passar de {usd(incluido)} no ciclo; o que sobra não acumula para o mês seguinte.
                {!lim && <> Para receber aviso por e-mail antes de passar do valor, defina um limite em{' '}
                  <a href="https://railway.com/workspace/usage" target="_blank" rel="noreferrer" className="underline font-semibold">Railway › Usage</a>.</>}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AbaPlano({ plano, erro, servicos = [], nomeServico = (s) => s.servico }) {
  if (erro) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" /> Plano indisponível na API do Railway para este token: {erro}
    </div>
  )
  if (!plano) return <p className="text-[11px] text-slate-400">Consultando o plano...</p>
  if (!plano.workspaces.length) return <p className="text-[11px] text-slate-400">Nenhum workspace encontrado para este token.</p>
  return (
    <div className="space-y-4">
      {plano.workspaces.map(w => {
        const a = w.assinatura
        const c = w.capacidade
        const sit = SITUACAO[a.situacao] || { txt: a.situacao || '—', cls: 'text-slate-800' }
        const lim = a.limite_gasto
        const cards = [
          ['Plano', PLANO_NOME[w.plano] || w.plano, 'text-indigo-700'],
          ['Assinatura', sit.txt + (a.em_teste ? ` (teste: ${a.dias_teste} dias)` : ''), sit.cls],
          ['Uso no ciclo atual', usd(a.uso_atual_usd), 'text-slate-800'],
          ['Ciclo de cobrança', `${soData(a.ciclo_inicio)} a ${soData(a.ciclo_fim)}`, 'text-slate-800'],
        ]
        const linhas = [
          ['CPU por serviço', c.cpu, c.cpu_max ? `até ${c.cpu_max} somando réplicas` : null],
          ['Memória por serviço', c.memoria, c.memoria_max ? `até ${c.memoria_max} somando réplicas` : null],
          ['Disco por serviço', c.disco],
          ['Réplicas por serviço', c.replicas],
          ['Projetos', c.projetos_max != null ? `${w.projetos} de ${c.projetos_max}` : w.projetos],
          ['Serviços por projeto', c.servicos_por_projeto],
          ['Membros por projeto', c.membros_por_projeto],
          ['Volume (disco persistente)', c.volume_max_mb != null ? `${(c.volume_max_mb / 1000).toLocaleString('pt-BR')} GB` : null],
          ['Domínios *.up.railway.app por serviço', c.dominios_servico],
          ['Domínios próprios por serviço', c.dominios_proprios],
          ['Builds simultâneos', c.builds_simultaneos],
          ['Retenção de logs', c.retencao_logs_dias != null ? `${c.retencao_logs_dias} dias` : null],
          ['Limite de gasto', lim ? [lim.aviso != null && `aviso em ${usd(lim.aviso)}`, lim.rigido != null && `bloqueio em ${usd(lim.rigido)}`].filter(Boolean).join(' · ') + (lim.estourado ? ' — ESTOURADO' : '') : 'Não definido'],
          ['Créditos', a.creditos_usd ? usd(a.creditos_usd) : 'Nenhum'],
        ].filter(([, v]) => v != null && v !== '')
        return (
          <div key={w.id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-slate-500">Workspace: <strong className="text-slate-700">{w.nome}</strong></p>
              <div className="ml-auto flex items-center gap-2">
                <a href={LINK_BILLING} target="_blank" rel="noreferrer"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${a.situacao && a.situacao !== 'ACTIVE' ? 'bg-red-600 border-red-600 text-white hover:bg-red-700' : 'border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}>
                  <CreditCard className="h-3.5 w-3.5" /> {a.situacao && a.situacao !== 'ACTIVE' ? 'Pagar no Railway' : 'Cobrança (Billing)'}
                </a>
                <a href={LINK_PLANOS} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                  <BadgeCheck className="h-3.5 w-3.5" /> Ver planos
                </a>
              </div>
            </div>
            <div id={idAlvo('plano-assinatura')} className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl">
              {cards.map(([rot, val, cls]) => (
                <div key={rot} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-slate-500">{rot}</p>
                  <p className={`text-base font-bold ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
            {plano.workspaces.length === 1 && servicos.length > 0 && <UsoCapacidade w={w} servicos={servicos} nomeServico={nomeServico} />}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <p className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Capacidade do plano</p>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-slate-100">
                  {linhas.map(([rot, val, obs]) => (
                    <tr key={rot}>
                      <td className="px-4 py-2 text-slate-500 w-1/2">{rot}</td>
                      <td className="px-4 py-2 font-semibold text-slate-800">{val}{obs && <span className="ml-1.5 font-normal text-[11px] text-slate-400">({obs})</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400">
              O valor de uso é o consumo medido pelo Railway no ciclo atual (CPU, memória, rede e disco), em dólares; a mensalidade do plano é cobrada à parte.
            </p>
          </div>
        )
      })}
    </div>
  )
}
