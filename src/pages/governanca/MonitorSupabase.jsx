// Governança › Monitor Supabase (19/11/2026).
// Banco (tamanho, tabelas, conexões, cache, consultas lentas), Storage, saúde dos serviços, requisições e logs.
// Dados do backend (/api/supabase-monitor): estatísticas do banco via função mon_supabase_stats (service role) e,
// quando SUPABASE_ACCESS_TOKEN estiver no backend, a Management API do Supabase. Nada sai do navegador para o Supabase.
import React, { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  DatabaseZap, RefreshCw, CheckCircle2, XCircle, AlertTriangle, LayoutDashboard, BadgeCheck, Database, BarChart3,
  ScrollText, Loader2, Search, KeyRound, HardDrive, Users, Plug, Clock,
} from 'lucide-react'
import { PainelControles, Relogio, BarraUso } from '../../components/monitor/MonitorUI'
import logoSupabase from '../../assets/logo-supabase.webp' // logo enviado pelo usuário em 19/11/2026

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['visao', 'Visão Geral', LayoutDashboard],
  ['plano', 'Plano e Capacidade', BadgeCheck],
  ['banco', 'Banco de Dados', Database],
  ['requisicoes', 'Requisições', BarChart3],
  ['logs', 'Logs', ScrollText],
]

// Unidades decimais (1 MB = 10^6), iguais às do painel do Supabase
const tam = (b) => {
  const n = Number(b) || 0
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB`
  return `${n} B`
}
const dbTotal = (b) => b ? (b.db_bytes_total ?? b.db_bytes) : 0
const LINK_USO = 'https://supabase.com/dashboard/org/_/usage'
const num = (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR')
const dataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const STATUS_PROJETO = {
  ACTIVE_HEALTHY: { txt: 'No ar', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  ACTIVE_UNHEALTHY: { txt: 'Com problema', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  COMING_UP: { txt: 'Iniciando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  RESTORING: { txt: 'Restaurando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  UPGRADING: { txt: 'Atualizando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  PAUSING: { txt: 'Pausando', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  INACTIVE: { txt: 'Pausado', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}
function BadgeProjeto({ status, bancoOk }) {
  // Sem token: se o banco respondeu, está no ar
  const s = status ? STATUS_PROJETO[status] || { txt: status, cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock }
    : bancoOk ? STATUS_PROJETO.ACTIVE_HEALTHY : { txt: 'Sem resposta', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${s.cls}`}>
      <Icon className={`h-3 w-3 ${Icon === Loader2 ? 'animate-spin' : ''}`} /> {s.txt}
    </span>
  )
}

async function api(caminho) {
  const r = await fetch(`${BACKEND_URL}/api/supabase-monitor${caminho}`)
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) {
    if (j?.error === 'supabase_token_not_configured') throw Object.assign(new Error('token'), { semToken: true })
    throw new Error(j?.error || `HTTP ${r.status}`)
  }
  return j
}

function AvisoToken() {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-[11px] text-sky-900 space-y-1.5">
      <p className="flex items-center gap-1.5 font-bold"><KeyRound className="h-4 w-4" /> Esta parte precisa do token da API do Supabase</p>
      <ol className="list-decimal pl-5 space-y-0.5">
        <li>No Supabase, abra <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noreferrer" className="underline font-semibold">Account › Access Tokens</a> e clique em <strong>Generate new token</strong> (nome sugerido: <em>portal-monitor</em>).</li>
        <li>Copie o token e cole no arquivo <code className="bg-white px-1 rounded">backend/.env</code> como <code className="bg-white px-1 rounded">SUPABASE_ACCESS_TOKEN=...</code> e reinicie o backend.</li>
        <li>Para produção, cadastre a mesma variável no serviço do backend no Railway (Variables).</li>
      </ol>
      <p className="opacity-80">Não cole o token aqui no chat — ele dá acesso à conta do Supabase e fica só no backend.</p>
    </div>
  )
}

// Relógio em % (0–100): Folga até 60%, Atenção até 85%, Crítico acima — mesma regra do painel
const FAIXAS_PCT = [
  { ate: 60, txt: 'Folga', cor: '#10b981' },
  { ate: 85, txt: 'Atenção', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 100, txt: 'Crítico', cor: '#f87171', corTexto: '#dc2626' },
]
function IndicadorPct({ pct, rotulo }) {
  return <Relogio valor={Math.min(100, pct || 0)} faixas={FAIXAS_PCT} marcas={[0, 25, 50, 75, 100]} fmtMarca={v => `${v}%`}
    rotuloAria={`${rotulo} ${Math.round(pct || 0)}%`} />
}

export default function MonitorSupabase() {
  const [aba, setAba] = useState('visao')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [controles, setControles] = useState(null)
  const [erroControles, setErroControles] = useState(null)
  const [recarregandoControles, setRecarregandoControles] = useState(false)

  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    setRecarregandoControles(true)
    api(`/controles${refresh ? '?refresh=1' : ''}`)
      .then(c => { setControles(c); setErroControles(null) })
      .catch(e => setErroControles(e.message))
      .finally(() => setRecarregandoControles(false))
    try {
      setDados(await api(`/visao${refresh ? '?refresh=1' : ''}`))
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  const temToken = !!dados?.api?.configurado

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img src={logoSupabase} alt="Supabase" className="h-10 w-10 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Monitor Supabase</h1>
            <p className="text-[10px] text-slate-500">Banco de dados do portal — é onde ficam guardados os cadastros, metas, apurações e arquivos, e onde é feito o login dos usuários</p>
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
      {dados?.erro_banco && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Estatísticas do banco: {dados.erro_banco}
        </div>
      )}

      {!dados && carregando && <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Lendo o Supabase...</p>}

      {dados && aba === 'visao' && <AbaVisao dados={dados} controles={controles} erroControles={erroControles} recarregandoControles={recarregandoControles} />}
      {dados && aba === 'plano' && <AbaPlano dados={dados} />}
      {dados && aba === 'banco' && <AbaBanco dados={dados} />}
      {dados && aba === 'requisicoes' && (temToken ? <AbaRequisicoes /> : <AvisoToken />)}
      {dados && aba === 'logs' && (temToken ? <AbaLogs /> : <AvisoToken />)}
    </div>
  )
}

// ── Visão Geral ───────────────────────────────────────────────────────────
function AbaVisao({ dados, controles, erroControles, recarregandoControles }) {
  const b = dados.banco
  const p = dados.plano
  const a = dados.api
  const storageBytes = (b?.storage || []).reduce((s, x) => s + Number(x.bytes || 0), 0)
  const pctBanco = b ? (dbTotal(b) / p.banco_bytes) * 100 : 0
  const pctCon = b ? (b.conexoes_todas / b.max_conexoes) * 100 : 0
  const pctSt = (storageBytes / p.storage_bytes) * 100
  return (
    <div className="space-y-3">
      <PainelControles controles={controles} erro={erroControles} recarregando={recarregandoControles} />
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-6 items-center">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[11px] text-slate-400">Projeto</p>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{a?.projeto?.nome || dados.ref}</p>
                <span className="shrink-0"><BadgeProjeto status={a?.projeto?.status} bancoOk={!!b} /></span>
              </div>
              <a href={`https://supabase.com/dashboard/project/${dados.ref}`} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline break-all">
                Abrir no painel do Supabase
              </a>
            </div>
            <div className="text-[11px] grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
              <span>Plano: <strong className="text-slate-800">{p.nome}</strong></span>
              <span>Postgres: <strong className="text-slate-800">{a?.projeto?.versao_pg || b?.versao || '—'}</strong></span>
              {a?.projeto?.regiao && <span>Região: <strong className="text-slate-800">{a.projeto.regiao}</strong></span>}
              {b && <span>Usuários de login: <strong className="text-slate-800">{num(b.usuarios_auth)}</strong></span>}
            </div>
            {a?.saude && (
              <div className="flex flex-wrap gap-1.5">
                {a.saude.map(s => (
                  <span key={s.servico} title={s.erro || s.status}
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${s.saudavel ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {s.saudavel ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {NOME_SERVICO[s.servico] || s.servico}
                  </span>
                ))}
              </div>
            )}
          </div>
          {b && (
            <>
              <div className="w-56 text-center">
                <p className="text-[11px] font-semibold text-slate-600">Banco</p>
                <IndicadorPct pct={pctBanco} rotulo="Banco" />
                <p className="text-[11px] text-slate-500"><strong className="text-slate-800">{tam(dbTotal(b))}</strong> de {tam(p.banco_bytes)}</p>
              </div>
              <div className="w-56 text-center">
                <p className="text-[11px] font-semibold text-slate-600">Conexões</p>
                <IndicadorPct pct={pctCon} rotulo="Conexões" />
                <p className="text-[11px] text-slate-500"><strong className="text-slate-800">{b.conexoes_todas}</strong> de {b.max_conexoes} abertas</p>
              </div>
              <div className="w-56 text-center">
                <p className="text-[11px] font-semibold text-slate-600">Arquivos (Storage)</p>
                <IndicadorPct pct={pctSt} rotulo="Storage" />
                <p className="text-[11px] text-slate-500"><strong className="text-slate-800">{tam(storageBytes)}</strong> de {tam(p.storage_bytes)}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
const NOME_SERVICO = { db: 'Banco', rest: 'API', auth: 'Login', storage: 'Storage', realtime: 'Realtime' }

// ── Plano e Capacidade (mesmas linhas do quadro "Free plan usage" do painel do Supabase) ──
// Anel de uso: verde até 60%, âmbar até 85%, vermelho acima; cinza tracejado = valor só no painel do Supabase
function AnelUso({ pct }) {
  const r = 7, c = 2 * Math.PI * r
  if (pct == null) return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0"><circle cx="10" cy="10" r={r} fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeDasharray="2 2" /></svg>
  )
  const p = Math.min(100, Math.max(0, pct))
  const cor = p >= 85 ? '#ef4444' : p >= 60 ? '#f59e0b' : '#10b981'
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 -rotate-90">
      <circle cx="10" cy="10" r={r} fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
      <circle cx="10" cy="10" r={r} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={`${Math.max(p > 0 ? 3 : 0, (p / 100) * c)} ${c}`} />
    </svg>
  )
}

function AbaPlano({ dados }) {
  const b = dados.banco
  const p = dados.plano
  const d = dados.api?.disco
  const storageBytes = (b?.storage || []).reduce((s, x) => s + Number(x.bytes || 0), 0)
  const mau = b?.usuarios_auth_mes ?? 0
  const gb = (v) => `${v} GB`
  // [rótulo, usado (texto), limite (texto), % ou null (só no painel), observação]
  const itens = [
    ['Egress (tráfego de saída)', null, p.egress_gb != null ? gb(p.egress_gb) : '—', null,
      'Dados enviados do Supabase para as telas e o backend. É o item que mais cresce no plano gratuito.'],
    ['Database size (banco)', tam(dbTotal(b)), tam(p.banco_bytes), (dbTotal(b) / p.banco_bytes) * 100,
      p.chave === 'free' ? 'Passou do limite, o banco fica só leitura — o portal deixa de gravar.' : 'Acima do incluído é cobrado à parte.'],
    ['Monthly active users (usuários ativos)', num(mau), num(p.mau), (mau / p.mau) * 100,
      'Calculado pelos logins do mês; o painel do Supabase conta pelo ciclo de cobrança e pode diferir em 1 ou 2.'],
    ['File storage (arquivos)', tam(storageBytes), tam(p.storage_bytes), (storageBytes / p.storage_bytes) * 100, ''],
    ['Log Ingestion (logs gravados)', null, p.log_ingestao_gb != null ? gb(p.log_ingestao_gb) : '—', null, ''],
    ['Log Query (consultas aos logs)', null, p.log_consulta_gb != null ? gb(p.log_consulta_gb) : '—', null, ''],
  ]
  const outros = [
    ['Servidor do banco (compute)', p.compute + (p.chave === 'free' ? ' — o menor, incluído no plano gratuito' : '')],
    ['Região', dados.api?.projeto?.regiao || 'sa-east-1 (São Paulo)'],
    ['Conexões simultâneas', b ? `${num(b.conexoes_todas)} de ${num(b.max_conexoes)}` : '—'],
    ['Pausa por inatividade', p.pausa ? 'Após 7 dias sem uso (o uso diário do portal evita)' : 'Não pausa'],
  ]
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="mr-auto">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Uso do plano {p.nome}</p>
            <p className="text-[10px] text-slate-400">Ciclo de cobrança atual · mesmas linhas do painel do Supabase</p>
          </div>
          <a href={LINK_USO} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700">Ver uso no Supabase</a>
          <a href="https://supabase.com/pricing" target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700">Ver planos</a>
        </div>
        <div className="divide-y divide-slate-100">
          {itens.map(([rot, usado, lim, pct, obs]) => (
            <div key={rot} className="px-4 py-2.5 flex items-center gap-3">
              <AnelUso pct={b ? pct : null} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-700">{rot}</p>
                {obs && <p className="text-[10px] text-slate-400">{obs}</p>}
              </div>
              {usado != null && b
                ? <p className="text-[11px] text-slate-500 whitespace-nowrap"><strong className="text-sm text-slate-900">{usado}</strong> / {lim}
                    {pct != null && <span className={`ml-2 font-bold ${pct >= 85 ? 'text-red-600' : pct >= 60 ? 'text-amber-600' : 'text-emerald-600'}`}>{pct < 1 && pct > 0 ? '<1' : Math.round(pct)}%</span>}
                  </p>
                : <p className="text-[11px] text-slate-500 whitespace-nowrap">
                    <a href={LINK_USO} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline">Ver no Supabase</a> / {lim}
                  </p>}
            </div>
          ))}
        </div>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          Egress e Logs só o Supabase mede — a API dele não entrega esses números, por isso o link abre a página de uso. No plano gratuito, passar de qualquer limite pode restringir o projeto.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Projeto</p>
        <table className="w-full text-[11px]">
          <tbody>
            {outros.map(([r, v]) => (
              <tr key={r} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-600 w-64">{r}</td>
                <td className="px-4 py-2 font-semibold text-slate-800">{v}</td>
              </tr>
            ))}
            {d?.total_bytes && (
              <tr><td className="px-4 py-2 text-slate-600">Disco do servidor</td><td className="px-4 py-2 font-semibold text-slate-800">{tam(d.usado_bytes)} de {tam(d.total_bytes)}</td></tr>
            )}
          </tbody>
        </table>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          {p.origem === 'api' ? 'Plano informado pela API do Supabase.'
            : p.origem === 'variavel' ? 'Plano definido na variável SUPABASE_PLANO do backend.'
            : 'Plano informado no cadastro do monitor. Se mudar de plano, defina SUPABASE_PLANO (free, pro ou team) no backend.'}
        </p>
      </div>
    </div>
  )
}

// ── Banco de Dados ────────────────────────────────────────────────────────
function AbaBanco({ dados }) {
  const b = dados.banco
  if (!b) return null
  const lim = dados.limites
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          [HardDrive, 'Tamanho do banco', tam(dbTotal(b))],
          [Database, 'Tabelas (public)', num(b.qtd_tabelas_public)],
          [Plug, 'Conexões', `${b.conexoes?.ativas ?? 0} ativas · ${b.conexoes?.ociosas ?? 0} ociosas`],
          [Users, 'Cache em memória', b.cache_hit != null ? `${b.cache_hit}%` : '—'],
        ].map(([Icon, r, v]) => (
          <div key={r} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[11px] text-slate-500 flex items-center gap-1"><Icon className="h-3.5 w-3.5" /> {r}</p>
            <p className="text-base font-bold text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Maiores tabelas</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2 font-semibold">Tabela</th>
                <th className="text-right px-4 py-2 font-semibold">Tamanho total</th>
                <th className="text-right px-4 py-2 font-semibold">% do banco</th>
                <th className="text-right px-4 py-2 font-semibold">Linhas (aprox.)</th>
                <th className="text-right px-4 py-2 font-semibold">Linhas descartadas</th>
              </tr>
            </thead>
            <tbody>
              {(b.tabelas || []).map(t => (
                <tr key={`${t.schema}.${t.tabela}`} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-1.5 text-slate-800">{t.schema !== 'public' && <span className="text-slate-400">{t.schema}.</span>}{t.tabela}</td>
                  <td className="px-4 py-1.5 text-right font-semibold text-slate-800">{tam(t.bytes)}</td>
                  <td className="px-4 py-1.5 text-right text-slate-500">{((t.bytes / dbTotal(b)) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</td>
                  <td className="px-4 py-1.5 text-right text-slate-600">{num(t.linhas)}</td>
                  <td className={`px-4 py-1.5 text-right ${t.linhas_mortas > 10000 && t.linhas_mortas > t.linhas * 0.2 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>{num(t.linhas_mortas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">Linhas descartadas são registros apagados ou alterados que o banco ainda não limpou; o Postgres limpa sozinho com o tempo.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Consultas mais lentas (média por execução)</p>
        {(b.consultas_lentas || []).length === 0
          ? <p className="px-4 py-3 text-[11px] text-slate-400">Sem dados de consultas.</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 font-semibold">Consulta</th>
                    <th className="text-right px-4 py-2 font-semibold">Média</th>
                    <th className="text-right px-4 py-2 font-semibold">Execuções</th>
                    <th className="text-right px-4 py-2 font-semibold">Tempo total</th>
                  </tr>
                </thead>
                <tbody>
                  {b.consultas_lentas.map((q, i) => (
                    <tr key={i} className="border-b border-slate-50 align-top">
                      <td className="px-4 py-1.5 text-slate-700 font-mono text-[10px] break-all">{q.consulta}</td>
                      <td className={`px-4 py-1.5 text-right font-semibold whitespace-nowrap ${q.media_ms >= lim.consultaLentaMs ? 'text-amber-600' : 'text-slate-800'}`}>{num(q.media_ms)} ms</td>
                      <td className="px-4 py-1.5 text-right text-slate-600">{num(q.chamadas)}</td>
                      <td className="px-4 py-1.5 text-right text-slate-600 whitespace-nowrap">{num(q.total_s)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">Acumulado desde o último reinício das estatísticas do banco. Em laranja: média acima de {lim.consultaLentaMs / 1000} s.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Arquivos (Storage) por bucket</p>
        <table className="w-full text-[11px]">
          <tbody>
            {(b.storage || []).map(s => (
              <tr key={s.bucket} className="border-b border-slate-50 last:border-0">
                <td className="px-4 py-1.5 text-slate-800">{s.bucket} <span className="text-slate-400">· {s.publico ? 'público' : 'privado'}</span></td>
                <td className="px-4 py-1.5 text-right text-slate-600">{num(s.arquivos)} arquivo(s)</td>
                <td className="px-4 py-1.5 text-right font-semibold text-slate-800">{tam(s.bytes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Requisições (Management API) ──────────────────────────────────────────
const INTERVALOS = [['1hr', '1 h'], ['1day', '24 h'], ['3day', '3 dias'], ['7day', '7 dias']]
function AbaRequisicoes() {
  const [iv, setIv] = useState('1day')
  const [pontos, setPontos] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => {
    setPontos(null); setErro(null)
    api(`/requisicoes?intervalo=${iv}`).then(j => setPontos(j.pontos)).catch(e => setErro(e.message))
  }, [iv])
  const dadosGraf = (pontos || []).map(p => ({ ...p, hora: new Date(p.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }))
  const tot = (k) => (pontos || []).reduce((s, p) => s + p[k], 0)
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mr-auto">Requisições ao Supabase</p>
        {INTERVALOS.map(([k, n]) => (
          <button key={k} onClick={() => setIv(k)} className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${iv === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{n}</button>
        ))}
      </div>
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
      {!pontos && !erro && <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</p>}
      {pontos && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[['rest', 'API (dados)'], ['auth', 'Login'], ['storage', 'Storage'], ['realtime', 'Realtime']].map(([k, n]) => (
              <div key={k} className="border border-slate-200 rounded-lg p-2.5">
                <p className="text-[11px] text-slate-500">{n}</p>
                <p className="text-base font-bold text-slate-900">{num(tot(k))}</p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dadosGraf}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hora" tick={{ fontSize: 10 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="rest" name="API (dados)" stackId="1" stroke="#6366f1" fill="#c7d2fe" />
                <Area type="monotone" dataKey="auth" name="Login" stackId="1" stroke="#10b981" fill="#a7f3d0" />
                <Area type="monotone" dataKey="storage" name="Storage" stackId="1" stroke="#f59e0b" fill="#fde68a" />
                <Area type="monotone" dataKey="realtime" name="Realtime" stackId="1" stroke="#ec4899" fill="#fbcfe8" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}

// ── Logs de erro (Management API, até 24 h) ───────────────────────────────
function AbaLogs() {
  const [tipo, setTipo] = useState('banco')
  const [horas, setHoras] = useState(24)
  const [logs, setLogs] = useState(null)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')
  const carregar = () => {
    setLogs(null); setErro(null)
    api(`/logs?tipo=${tipo}&horas=${horas}`).then(j => setLogs(j.logs)).catch(e => setErro(e.message))
  }
  useEffect(carregar, [tipo, horas])
  const filtrados = (logs || []).filter(l => !busca || `${l.mensagem} ${l.caminho || ''}`.toLowerCase().includes(busca.toLowerCase()))
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        {[['banco', 'Erros do banco'], ['api', 'Erros da API (5xx)']].map(([k, n]) => (
          <button key={k} onClick={() => setTipo(k)} className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${tipo === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{n}</button>
        ))}
        <select value={horas} onChange={e => setHoras(Number(e.target.value))} className="border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white text-slate-700">
          {[1, 6, 24].map(h => <option key={h} value={h}>Últimas {h} h</option>)}
        </select>
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="pl-7 pr-2 py-1 border border-slate-200 rounded-md text-[11px] w-56" />
        </div>
        <button type="button" onClick={carregar} title="Recarregar" className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50"><RefreshCw className="h-3.5 w-3.5 text-slate-500" /></button>
      </div>
      {erro && <p className="px-4 py-3 text-[11px] text-red-600">{erro}</p>}
      {!logs && !erro && <p className="px-4 py-3 text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</p>}
      {logs && filtrados.length === 0 && <p className="px-4 py-3 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" /> Nenhum erro no período.</p>}
      {filtrados.length > 0 && (
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
          {filtrados.map((l, i) => (
            <div key={i} className="px-4 py-1.5 text-[11px] flex gap-3">
              <span className="text-slate-400 whitespace-nowrap">{dataHora(l.ts)}</span>
              {l.severidade && <span className="font-bold text-red-600 whitespace-nowrap">{l.severidade}</span>}
              {l.status && <span className="font-bold text-red-600 whitespace-nowrap">{l.status}</span>}
              {l.metodo && <span className="text-slate-500 whitespace-nowrap">{l.metodo} {l.caminho}</span>}
              <span className="text-slate-700 font-mono text-[10px] break-all">{l.mensagem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
