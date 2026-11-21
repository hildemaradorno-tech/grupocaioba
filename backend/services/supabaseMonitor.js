// Governança › Monitor Supabase (19/11/2026).
// Duas fontes:
//   1) O próprio banco, pela função public.mon_supabase_stats() (migration mon_supabase_stats.sql), chamada com a
//      service role do backend — tamanho, tabelas, conexões, Storage, usuários, cache e consultas lentas.
//      Funciona sem nenhuma configuração nova.
//   2) A Management API do Supabase (https://api.supabase.com/v1), só quando SUPABASE_ACCESS_TOKEN estiver no
//      backend (token pessoal: supabase.com/dashboard/account/tokens) — situação do projeto, saúde de cada serviço,
//      disco, requisições e logs de erro. Sem o token, a tela mostra essas partes como "não configurado".
//
// Variáveis: SUPABASE_URL (já existe; dela sai o ref do projeto), SUPABASE_ACCESS_TOKEN (opcional),
//            SUPABASE_PLANO (opcional: free | pro | team — quando a API não informar o plano).
import { readFileSync } from 'fs'
import { getSupabaseAdmin } from './supabaseAdmin.js'

// Mapa "objeto do banco → arquivos do portal que o usam" (gerado do código em 21/11/2026 procurando
// .from('x') e .rpc('x') em src/ e backend/). Serve para dizer de qual tela vem cada consulta lenta.
let MAPA_OBJETOS = {}
try { MAPA_OBJETOS = JSON.parse(readFileSync(new URL('./mapaObjetosTelas.json', import.meta.url), 'utf8')) } catch { /* sem mapa: só mostra o objeto */ }

const ORIGEM_PAPEL = {
  authenticated: 'Telas do portal (usuário logado)',
  anon: 'Acesso sem login',
  service_role: 'Backend (rotinas e cálculos do servidor)',
  postgres: 'Manutenção (scripts e migrations)',
}
// "src/pages/pos-vendas/IndicadoresProdutividade.jsx" → "Tela pos-vendas › IndicadoresProdutividade"
function nomeArquivo(rel) {
  const semExt = rel.replace(/\.(jsx?|mjs)$/, '')
  if (semExt.startsWith('src/pages/')) return `Tela ${semExt.slice(10).split('/').join(' › ')}`
  if (semExt.startsWith('src/')) return `Frontend ${semExt.slice(4)}`
  if (semExt.startsWith('backend/')) return `Backend ${semExt.slice(8)}`
  return semExt
}
export function enriquecerConsulta(q) {
  const objetos = Array.isArray(q.objetos) && q.objetos.length
    ? q.objetos
    : [...new Set([...String(q.consulta || '').matchAll(/"?public"?\."?([a-z0-9_]+)"?/gi)].map(m => m[1]))]
  const usadoEm = [...new Set(objetos.flatMap(o => (MAPA_OBJETOS[o] || []).map(nomeArquivo)))]
  return {
    ...q,
    objetos,
    usado_em: usadoEm,
    origem: ORIGEM_PAPEL[q.papel] || q.papel || '—',
    tipo: /pgrst_call|json_to_record/.test(q.consulta || '') ? 'Função (RPC)' : objetos.length ? 'Leitura de tabela/view' : 'Consulta',
  }
}

const API = 'https://api.supabase.com'
const TTL_MS = 60 * 1000

// Limites dos planos (supabase.com/pricing, conferido em 19/11/2026). Unidades DECIMAIS (1 MB = 10^6), como o
// painel do Supabase ("Free plan usage": Database size 205 / 500 MB = soma de pg_database_size de todos os bancos).
export const LIMITES_PLANO = {
  free: { nome: 'Free (gratuito)', banco_bytes: 500e6, storage_bytes: 1e9, mau: 50000, egress_gb: 5, log_ingestao_gb: 1, log_consulta_gb: 100, compute: 'Nano', pausa: true },
  pro: { nome: 'Pro', banco_bytes: 8e9, storage_bytes: 100e9, mau: 100000, egress_gb: 250, log_ingestao_gb: null, log_consulta_gb: null, compute: 'Micro', pausa: false },
  team: { nome: 'Team', banco_bytes: 8e9, storage_bytes: 100e9, mau: 100000, egress_gb: 250, log_ingestao_gb: null, log_consulta_gb: null, compute: 'Micro', pausa: false },
}

export const LIMITES = { pctAtencao: 60, pctCritico: 85, cacheHitMin: 99, consultaLentaMs: 1000, ociosasTransacao: 5 }

export const tokenConfigurado = () => !!process.env.SUPABASE_ACCESS_TOKEN
export function projetoRef() {
  try { return new URL(process.env.SUPABASE_URL || '').hostname.split('.')[0] || null } catch { return null }
}

async function mgmt(caminho) {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  if (!token) { const e = new Error('supabase_token_not_configured'); e.status = 503; throw e }
  const r = await fetch(`${API}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000),
  })
  let j = null
  try { j = await r.json() } catch { /* corpo não-JSON */ }
  if (r.status === 429) { const e = new Error('Limite de requisições da API do Supabase atingido — tente de novo em instantes.'); e.status = 429; throw e }
  if (!r.ok) { const e = new Error(`Supabase API: ${j?.message || j?.error || `HTTP ${r.status}`}`); e.status = r.status >= 500 ? 502 : r.status; throw e }
  return j
}
const tentar = async (fn) => { try { return { dados: await fn() } } catch (e) { return { erro: e.message } } }

// ── Banco (função SQL) ────────────────────────────────────────────────────
let cacheBanco = null
export async function getBanco({ refresh = false } = {}) {
  if (!refresh && cacheBanco && Date.now() - cacheBanco.t < TTL_MS) return cacheBanco.dados
  const sb = getSupabaseAdmin()
  if (!sb) { const e = new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.'); e.status = 503; throw e }
  const { data, error } = await sb.rpc('mon_supabase_stats')
  if (error) {
    const e = new Error(/mon_supabase_stats/.test(error.message)
      ? 'A função mon_supabase_stats ainda não existe no banco (migration mon_supabase_stats.sql).'
      : error.message)
    e.status = 502; throw e
  }
  // Comandos de manutenção ficam fora (a função nova já filtra; isto cobre a versão antiga) + origem de cada consulta
  const MANUT = /^\s*(create|alter|drop|explain|begin|commit|rollback|analyze|vacuum|grant|revoke|comment|do|set|reset|truncate|refresh)\b/i
  const dados = { ...data, consultas_lentas: (data?.consultas_lentas || []).filter(q => !MANUT.test(q.consulta || '')).map(enriquecerConsulta) }
  cacheBanco = { t: Date.now(), dados }
  return dados
}

// ── Management API (com token) ────────────────────────────────────────────
let cacheApi = null
export async function getProjetoApi({ refresh = false } = {}) {
  if (!tokenConfigurado()) return { configurado: false }
  if (!refresh && cacheApi && Date.now() - cacheApi.t < TTL_MS) return cacheApi.dados
  const ref = projetoRef()
  const [projeto, saude, disco] = await Promise.all([
    tentar(() => mgmt(`/v1/projects/${ref}`)),
    // Realtime fora: o portal não usa (sem .channel) e a saúde dele oscila — gerava alerta falso (19/11/2026)
    tentar(() => mgmt(`/v1/projects/${ref}/health?services=auth,db,rest,storage`)),
    tentar(() => mgmt(`/v1/projects/${ref}/config/disk/util`)),
  ])
  // Plano: a API não traz o plano no projeto; tenta pela organização (campo `plan`, quando existir)
  let plano = null
  const orgSlug = projeto.dados?.organization_slug || projeto.dados?.organization_id
  if (orgSlug) {
    const org = await tentar(() => mgmt(`/v1/organizations/${orgSlug}`))
    plano = org.dados?.plan || null
  }
  const p = projeto.dados
  const dados = {
    configurado: true,
    ref,
    projeto: p ? { nome: p.name, status: p.status, regiao: p.region, criado_em: p.created_at, versao_pg: p.database?.version || null } : null,
    erro_projeto: projeto.erro || null,
    saude: Array.isArray(saude.dados) ? saude.dados.map(s => ({ servico: s.name, saudavel: !!s.healthy, status: s.status, erro: s.error || null })) : null,
    erro_saude: saude.erro || null,
    disco: disco.dados?.metrics ? {
      total_bytes: disco.dados.metrics.fs_size_bytes, usado_bytes: disco.dados.metrics.fs_used_bytes,
      livre_bytes: disco.dados.metrics.fs_avail_bytes, lido_em: disco.dados.timestamp,
    } : null,
    erro_disco: disco.erro || null,
    plano_api: plano,
  }
  cacheApi = { t: Date.now(), dados }
  return dados
}

// Requisições por serviço (REST, Auth, Storage, Realtime)
export async function getRequisicoes(intervalo = '7day') {
  const ok = ['1hr', '3hr', '1day', '3day', '7day']
  const iv = ok.includes(intervalo) ? intervalo : '7day'
  const j = await mgmt(`/v1/projects/${projetoRef()}/analytics/endpoints/usage.api-counts?interval=${iv}`)
  if (j?.error) throw Object.assign(new Error(`Supabase API: ${typeof j.error === 'string' ? j.error : j.error.message}`), { status: 502 })
  return (j?.result || []).map(x => ({
    ts: x.timestamp, rest: x.total_rest_requests || 0, auth: x.total_auth_requests || 0,
    storage: x.total_storage_requests || 0, realtime: x.total_realtime_requests || 0,
  }))
}

// Logs de erro (últimas N horas, máx. 24 h — limite da API)
// Tabela unificada `logs` (motor ClickHouse; sem unnest/select *): coluna `source` + mapa `log_attributes`
// (docs.supabase observability/advanced-log-filtering, testado em 19/11/2026)
const SQL_LOGS = {
  api: `select timestamp, event_message, log_attributes['response.status_code'] as status_code,
          log_attributes['request.method'] as method, log_attributes['request.path'] as path
        from logs where source = 'edge_logs' and toInt32OrZero(log_attributes['response.status_code']) between 500 and 599
        order by timestamp desc limit 200`,
  banco: `select timestamp, event_message, log_attributes['parsed.error_severity'] as error_severity
          from logs where source = 'postgres_logs' and log_attributes['parsed.error_severity'] in ('ERROR','FATAL','PANIC')
          order by timestamp desc limit 200`,
}
export async function getLogs({ tipo = 'banco', horas = 24 }) {
  const sql = SQL_LOGS[tipo]
  if (!sql) { const e = new Error('tipo de log inválido'); e.status = 400; throw e }
  const h = Math.min(24, Math.max(1, Number(horas) || 24))
  const fim = new Date()
  const ini = new Date(fim.getTime() - h * 3600 * 1000)
  const qs = new URLSearchParams({ sql, iso_timestamp_start: ini.toISOString(), iso_timestamp_end: fim.toISOString() })
  const j = await mgmt(`/v1/projects/${projetoRef()}/analytics/endpoints/logs?${qs}`)
  if (j?.error) throw Object.assign(new Error(`Supabase API: ${typeof j.error === 'string' ? j.error : j.error.message}`), { status: 502 })
  // timestamp vem como texto UTC sem fuso ("2026-11-19T23:44:10.922000") — ou microssegundos no formato antigo
  const iso = (t) => typeof t === 'string' && !/[zZ]$|[+-]\d\d:?\d\d$/.test(t) ? `${t}Z` : t
  return (j?.result || []).map(x => ({
    ts: typeof x.timestamp === 'number' ? new Date(x.timestamp / 1000).toISOString() : iso(x.timestamp),
    mensagem: x.event_message, status: x.status_code ?? null, metodo: x.method ?? null, caminho: x.path ?? null,
    severidade: x.error_severity ?? null,
  }))
}

// ── Plano efetivo ─────────────────────────────────────────────────────────
// Plano informado pelo usuário em 19/11/2026: Free. Se mudar, defina SUPABASE_PLANO no backend (ou a API informa).
const PLANO_INFORMADO = 'free'
export function planoEfetivo(api) {
  const bruto = String(api?.plano_api || process.env.SUPABASE_PLANO || PLANO_INFORMADO).toLowerCase()
  const chave = LIMITES_PLANO[bruto] ? bruto : PLANO_INFORMADO
  return {
    chave,
    origem: api?.plano_api ? 'api' : process.env.SUPABASE_PLANO ? 'variavel' : 'informado',
    ...LIMITES_PLANO[chave],
  }
}

// ── Pontos de controle ("Precisa de atenção") ─────────────────────────────
const LINK_DASH = (ref) => `https://supabase.com/dashboard/project/${ref}`
// decimal, igual ao painel do Supabase
const tam = (b) => b >= 1e9 ? `${(b / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} GB` : `${(b / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} MB`

export async function calcularControles({ refresh = false } = {}) {
  const ref = projetoRef()
  const [banco, api] = await Promise.all([
    tentar(() => getBanco({ refresh })),
    tentar(() => getProjetoApi({ refresh })),
  ])
  const plano = planoEfetivo(api.dados)
  const c = []
  const nivelPct = (pct) => pct >= LIMITES.pctCritico ? 'critico' : pct >= LIMITES.pctAtencao ? 'atencao' : 'ok'

  // Projeto e serviços (Management API)
  if (!api.dados?.configurado) {
    c.push({ id: 'token', grupo: 'Configuração', nivel: 'info', titulo: 'Token da API do Supabase não configurado',
      detalhe: 'Sem ele não dá para ver a saúde dos serviços, o disco, as requisições e os logs. Banco e Storage abaixo funcionam assim mesmo.' })
  } else {
    const st = api.dados.projeto?.status
    if (api.dados.erro_projeto) c.push({ id: 'projeto', grupo: 'Projeto', nivel: 'atencao', titulo: 'Não foi possível ler a situação do projeto', detalhe: api.dados.erro_projeto })
    else c.push(st === 'ACTIVE_HEALTHY'
      ? { id: 'projeto', grupo: 'Projeto', nivel: 'ok', titulo: 'Projeto ativo e saudável' }
      : { id: 'projeto', grupo: 'Projeto', nivel: 'critico', titulo: `Projeto em situação ${st || 'desconhecida'}`,
          detalhe: st === 'INACTIVE' || st === 'PAUSING' ? 'Projeto pausado — o portal não carrega dados. Restaure pelo painel do Supabase.' : 'Confira no painel do Supabase.',
          link: LINK_DASH(ref), linkTxt: 'Abrir painel' })
    if (api.dados.saude) {
      const ruins = api.dados.saude.filter(s => !s.saudavel)
      c.push(ruins.length
        ? { id: 'saude', grupo: 'Serviços', nivel: 'critico', titulo: `${ruins.length} serviço(s) com problema: ${ruins.map(s => s.servico).join(', ')}`,
            detalhe: ruins.map(s => `${s.servico}: ${s.erro || s.status}`).join(' · '), link: LINK_DASH(ref), linkTxt: 'Abrir painel' }
        : { id: 'saude', grupo: 'Serviços', nivel: 'ok', titulo: 'Banco, API, login e Storage respondendo' })
    }
    if (api.dados.disco?.total_bytes) {
      const d = api.dados.disco
      const pct = (d.usado_bytes / d.total_bytes) * 100
      c.push({ id: 'disco', grupo: 'Capacidade', nivel: nivelPct(pct), titulo: `Disco: ${tam(d.usado_bytes)} de ${tam(d.total_bytes)} (${Math.round(pct)}%)`,
        detalhe: pct >= LIMITES.pctAtencao ? 'O disco do banco está enchendo — limpe dados antigos ou aumente o disco.' : null })
    }
  }

  // Banco (função SQL)
  if (banco.erro) {
    c.push({ id: 'banco', grupo: 'Banco', nivel: 'critico', titulo: 'Não foi possível ler as estatísticas do banco', detalhe: banco.erro })
  } else {
    const b = banco.dados
    const dbTotal = b.db_bytes_total ?? b.db_bytes
    const pctBanco = (dbTotal / plano.banco_bytes) * 100
    c.push({ id: 'banco-tamanho', grupo: 'Capacidade', nivel: nivelPct(pctBanco),
      titulo: `Banco: ${tam(dbTotal)} de ${tam(plano.banco_bytes)} do plano ${plano.nome} (${Math.round(pctBanco)}%)`,
      detalhe: pctBanco >= LIMITES.pctAtencao ? (plano.chave === 'free'
        ? 'No plano gratuito, ao passar de 500 MB o banco fica só leitura — o portal deixa de gravar.'
        : 'Acima do incluído no plano é cobrado à parte.') : null })

    const stBytes = (b.storage || []).reduce((s, x) => s + Number(x.bytes || 0), 0)
    const pctSt = (stBytes / plano.storage_bytes) * 100
    c.push({ id: 'storage', grupo: 'Capacidade', nivel: nivelPct(pctSt),
      titulo: `Arquivos (Storage): ${tam(stBytes)} de ${tam(plano.storage_bytes)} (${pctSt < 1 && pctSt > 0 ? '<1' : Math.round(pctSt)}%)` })

    const mau = b.usuarios_auth_mes ?? 0
    const pctMau = (mau / plano.mau) * 100
    c.push({ id: 'mau', grupo: 'Capacidade', nivel: nivelPct(pctMau),
      titulo: `Usuários ativos no mês: ${mau.toLocaleString('pt-BR')} de ${plano.mau.toLocaleString('pt-BR')} (${pctMau < 1 && pctMau > 0 ? '<1' : Math.round(pctMau)}%)` })

    const pctCon = (b.conexoes_todas / b.max_conexoes) * 100
    c.push({ id: 'conexoes', grupo: 'Banco', nivel: nivelPct(pctCon),
      titulo: `Conexões: ${b.conexoes_todas} de ${b.max_conexoes} (${Math.round(pctCon)}%)`,
      detalhe: pctCon >= LIMITES.pctAtencao ? 'Perto do máximo, novas conexões são recusadas e telas dão erro.' : null })

    const presas = b.conexoes?.ociosas_em_transacao || 0
    if (presas > LIMITES.ociosasTransacao) c.push({ id: 'presas', grupo: 'Banco', nivel: 'atencao', titulo: `${presas} conexões paradas no meio de uma transação`,
      detalhe: 'Seguram recursos e podem travar tabelas. Normalmente um processo que não terminou direito.' })

    if (b.cache_hit != null) c.push(b.cache_hit >= LIMITES.cacheHitMin
      ? { id: 'cache', grupo: 'Desempenho', nivel: 'ok', titulo: `Cache do banco: ${b.cache_hit}% das leituras vêm da memória` }
      : { id: 'cache', grupo: 'Desempenho', nivel: 'atencao', titulo: `Cache do banco baixo: ${b.cache_hit}% (ideal ≥ ${LIMITES.cacheHitMin}%)`,
          detalhe: 'O banco está lendo muito do disco — as telas ficam mais lentas. Pode indicar que a memória do plano ficou pequena.' })

    const lentas = (b.consultas_lentas || []).filter(q => Number(q.media_ms) >= LIMITES.consultaLentaMs)
    c.push(lentas.length
      ? { id: 'lentas', grupo: 'Desempenho', nivel: 'atencao', titulo: `${lentas.length} consulta(s) demorando mais de ${LIMITES.consultaLentaMs / 1000} s em média`,
          detalhe: 'Veja a lista na aba Banco de Dados.' }
      : { id: 'lentas', grupo: 'Desempenho', nivel: 'ok', titulo: 'Nenhuma consulta com média acima de 1 s' })
  }

  if (plano.pausa) c.push({ id: 'pausa', grupo: 'Plano', nivel: 'info', titulo: 'Plano gratuito pausa o projeto após 7 dias sem uso',
    detalhe: 'Com o uso diário do portal isso não acontece.' })

  // Destino de cada alerta: aba e tabela da tela onde está a informação (21/11/2026)
  const DESTINO = {
    token: { aba: 'requisicoes', alvo: 'aviso-token' }, projeto: { aba: 'visao', alvo: 'projeto' }, saude: { aba: 'visao', alvo: 'projeto' },
    disco: { aba: 'plano', alvo: 'plano-projeto' }, 'banco-tamanho': { aba: 'plano', alvo: 'uso-banco' }, storage: { aba: 'plano', alvo: 'uso-storage' },
    mau: { aba: 'plano', alvo: 'uso-mau' }, pausa: { aba: 'plano', alvo: 'plano-projeto' }, banco: { aba: 'banco', alvo: 'banco-resumo' },
    conexoes: { aba: 'banco', alvo: 'banco-resumo' }, presas: { aba: 'banco', alvo: 'banco-resumo' }, cache: { aba: 'banco', alvo: 'banco-resumo' },
    lentas: { aba: 'banco', alvo: 'banco-lentas' },
  }
  for (const x of c) x.destino = DESTINO[x.id] || { aba: 'visao', alvo: null }
  const ordem = { critico: 0, atencao: 1, info: 2, ok: 3 }
  c.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
  return {
    controles: c,
    resumo: Object.fromEntries(['critico', 'atencao', 'info', 'ok'].map(n => [n, c.filter(x => x.nivel === n).length])),
    calculado_em: new Date().toISOString(),
  }
}
