// Governança › Monitor Cloudflare (19/11/2026).
// O frontend (as telas do portal) fica no Cloudflare Pages. Mostra se o site está no ar, o tempo de resposta, as
// publicações (deploys) e o uso do limite do plano gratuito. Dados do backend (/api/cloudflare-monitor), que guarda
// o token da API do Cloudflare — nada sai do navegador para o Cloudflare.
import React, { useEffect, useState } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, LayoutDashboard, Rocket, Loader2, KeyRound, ExternalLink, Clock, Globe,
} from 'lucide-react'
import { LogoCloudflare } from '../../components/monitor/Logos'
import { PainelControles, Relogio, BarraUso, useAbaNaUrl, useRolarParaAlvo, idAlvo, EngrenagemPlanos } from '../../components/monitor/MonitorUI'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['visao', 'Visão Geral', LayoutDashboard],
  ['deploys', 'Publicações', Rocket],
]
const dataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const tempoAtras = (iso) => {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `há ${Math.max(min, 1)} min`
  const h = Math.round(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}

async function api(caminho) {
  const r = await fetch(`${BACKEND_URL}/api/cloudflare-monitor${caminho}`)
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`)
  return j
}

const STATUS_DEPLOY = {
  success: { txt: 'No ar', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  failure: { txt: 'Falhou', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
  active: { txt: 'Publicando', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: Loader2 },
  idle: { txt: 'Na fila', cls: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock },
  canceled: { txt: 'Cancelado', cls: 'bg-slate-50 text-slate-400 border-slate-200', icon: Clock },
  skipped: { txt: 'Ignorado', cls: 'bg-slate-50 text-slate-400 border-slate-200', icon: Clock },
}
function BadgeDeploy({ status }) {
  const s = STATUS_DEPLOY[status] || { txt: status || '—', cls: 'bg-slate-50 text-slate-500 border-slate-200', icon: Clock }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === 'active' ? 'animate-spin' : ''}`} /> {s.txt}
    </span>
  )
}
const ORIGEM = { ad_hoc: 'Wrangler (npm run deploy)', 'github:push': 'GitHub' }

function AvisoToken() {
  return (
    <div id={idAlvo('aviso-token')} className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-[11px] text-sky-900 space-y-1.5">
      <p className="flex items-center gap-1.5 font-bold"><KeyRound className="h-4 w-4" /> As publicações precisam do token da API do Cloudflare</p>
      <ol className="list-decimal pl-5 space-y-0.5">
        <li>No Cloudflare, abra <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer" className="underline font-semibold">My Profile › API Tokens</a> e clique em <strong>Create Token</strong> › <strong>Create Custom Token</strong>.</li>
        <li>Nome: <em>portal-monitor</em>. Em Permissions: <strong>Account</strong> › <strong>Cloudflare Pages</strong> › <strong>Read</strong>. Nada de Edit.</li>
        <li>Copie o token e coloque no <code className="bg-white px-1 rounded">backend/.env</code> como <code className="bg-white px-1 rounded">CLOUDFLARE_API_TOKEN=...</code>, reinicie o backend e cadastre a mesma variável no Railway.</li>
      </ol>
      <p className="opacity-80">Não cole o token aqui no chat — ele fica só no backend.</p>
    </div>
  )
}

const FAIXAS_RESP = [
  { ate: 500, txt: 'Ótimo', cor: '#10b981' },
  { ate: 1500, txt: 'Bom', cor: '#6ee7b7', corTexto: '#059669' },
  { ate: 3000, txt: 'Lento', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 4000, txt: 'Ruim', cor: '#f87171', corTexto: '#dc2626' },
]
const FAIXAS_PCT = [
  { ate: 60, txt: 'Folga', cor: '#10b981' },
  { ate: 85, txt: 'Atenção', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 100, txt: 'Crítico', cor: '#f87171', corTexto: '#dc2626' },
]

export default function MonitorCloudflare() {
  // Aba na URL + rolagem até o alvo do alerta clicado (21/11/2026)
  const [aba, setAba, irPara] = useAbaNaUrl(ABAS.map(a => a[0]), 'visao')
  useRolarParaAlvo()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try { setDados(await api(`/visao${refresh ? '?refresh=1' : ''}`)) } catch (e) { setErro(e.message) } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <LogoCloudflare className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Monitor Cloudflare</h1>
            <p className="text-[10px] text-slate-500">Hospedagem do frontend — é onde ficam as telas do portal que o usuário abre no navegador; cada publicação (deploy) troca a versão das telas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 leading-tight text-right whitespace-nowrap">
            Atualizado em: <strong className="text-slate-700">{carregando ? '...' : dataHora(dados?.lido_em)}</strong>
          </p>
          <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Atualizar dados" aria-label="Atualizar dados"
            className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
          {/* Planos do serviço (contratar) — 21/11/2026 */}
          <EngrenagemPlanos chave="cloudflare" />
        </div>
      </div>

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
      {!dados && carregando && <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Lendo o Cloudflare...</p>}

      {dados && aba === 'visao' && <AbaVisao dados={dados} recarregando={carregando} onIr={irPara} />}
      {dados && aba === 'deploys' && (dados.api?.configurado ? <AbaDeploys dados={dados} /> : <AvisoToken />)}
    </div>
  )
}

function AbaVisao({ dados, recarregando, onIr }) {
  const a = dados.api || {}
  const p = a.projeto
  const site = dados.sites?.[0]
  const u = p?.ultimo
  const lim = dados.limites
  const pctBuilds = a.deploys_mes != null ? (a.deploys_mes / lim.buildsMes) * 100 : null
  return (
    <div className="space-y-3">
      <PainelControles controles={dados.controles} recarregando={recarregando} onIr={onIr} />
      <div id={idAlvo('cf-projeto')} className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-6 items-center">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[11px] text-slate-400">Projeto (Cloudflare Pages)</p>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{p?.nome || dados.projeto_nome}</p>
                {site && (site.no_ar
                  ? <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3" /> No ar</span>
                  : <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3" /> Fora do ar</span>)}
              </div>
              {(dados.sites || []).map(s => (
                <a key={s.dominio} href={`https://${s.dominio}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline break-all">
                  <Globe className="h-3 w-3 shrink-0" /> {s.dominio}
                </a>
              ))}
            </div>
            <div className="text-[11px]">
              <p className="text-slate-400">Última publicação</p>
              {u ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-800">{dataHora(u.criado_em)} <span className="text-[11px] font-normal text-slate-500">{tempoAtras(u.criado_em)}</span></p>
                  <BadgeDeploy status={u.status} />
                </div>
              ) : <p className="text-slate-500">{a.configurado ? (a.erro_projeto || '—') : 'Disponível com o token do Cloudflare (aba Publicações explica como criar).'}</p>}
            </div>
            {u?.status === 'failure' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 text-[11px] text-red-700 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" /> A última publicação falhou — o portal continua com a versão anterior.
              </div>
            )}
          </div>
          <div className="w-56 text-center">
            <p className="text-[11px] font-semibold text-slate-600">Publicações no mês</p>
            {pctBuilds != null ? (
              <>
                <Relogio valor={Math.min(100, pctBuilds)} faixas={FAIXAS_PCT} marcas={[0, 25, 50, 75, 100]} fmtMarca={v => `${v}%`} rotuloAria={`Publicações ${Math.round(pctBuilds)}%`} />
                <p className="text-[11px] text-slate-500"><strong className="text-slate-800">{a.deploys_mes}</strong> de {lim.buildsMes} do plano gratuito</p>
              </>
            ) : <p className="text-[11px] text-slate-400 py-8">Precisa do token</p>}
          </div>
          <div className="w-56 text-center">
            <p className="text-[11px] font-semibold text-slate-600">Tempo de resposta</p>
            <Relogio valor={site?.ms || 0} faixas={FAIXAS_RESP} marcas={[0, 1000, 2000, 3000, 4000]} fmtMarca={v => `${v / 1000}s`} rotuloAria={`Tempo de resposta ${site?.ms} ms`} />
            <p className="text-[11px] text-slate-500">Página inicial · <strong className="text-slate-800">{site?.ms ?? '—'} ms</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

function AbaDeploys({ dados }) {
  const a = dados.api
  const lim = dados.limites
  if (a.erro_projeto) return <p className="text-[11px] text-red-600">{a.erro_projeto}</p>
  return (
    <div className="space-y-3">
      {a.deploys_mes != null && (
        <div id={idAlvo('cf-builds')} className="bg-white border border-slate-200 rounded-xl p-4">
          <BarraUso rotulo="Publicações neste mês (plano gratuito)" usado={a.deploys_mes} total={lim.buildsMes} txtUsado={String(a.deploys_mes)} txtTotal={String(lim.buildsMes)}
            obs={`${a.deploys_mes_falhos || 0} com falha. O contador zera no dia 1º de cada mês.`} />
        </div>
      )}
      <div id={idAlvo('cf-deploys')} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <p className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Últimas publicações</p>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2 font-semibold">Quando</th>
                <th className="text-left px-4 py-2 font-semibold">Situação</th>
                <th className="text-left px-4 py-2 font-semibold">Ambiente</th>
                <th className="text-left px-4 py-2 font-semibold">Origem</th>
                <th className="text-left px-4 py-2 font-semibold">Versão</th>
              </tr>
            </thead>
            <tbody>
              {(a.deploys || []).map(d => (
                <tr key={d.id} className={`border-b border-slate-50 ${a.projeto?.em_producao?.id === d.id ? 'bg-emerald-50/40' : ''}`}>
                  <td className="px-4 py-1.5 whitespace-nowrap text-slate-800">{dataHora(d.criado_em)} <span className="text-slate-400">{tempoAtras(d.criado_em)}</span></td>
                  <td className="px-4 py-1.5"><BadgeDeploy status={d.status} />{a.projeto?.em_producao?.id === d.id && <span className="ml-1.5 text-[10px] font-bold text-emerald-700">em uso</span>}</td>
                  <td className="px-4 py-1.5 text-slate-600">{d.ambiente === 'production' ? 'Produção' : 'Prévia'}{d.branch ? ` · ${d.branch}` : ''}</td>
                  <td className="px-4 py-1.5 text-slate-600">{ORIGEM[d.origem] || d.origem || '—'}</td>
                  <td className="px-4 py-1.5">
                    {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">{d.curto} <ExternalLink className="h-3 w-3" /></a> : d.curto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">Cada linha é uma versão das telas publicada pelo chat de deploy. A marcada "em uso" é a que os usuários estão vendo.</p>
      </div>
    </div>
  )
}
