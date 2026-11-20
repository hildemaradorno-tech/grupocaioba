// Monitor Railway (Governança › Monitor Railway, 19/11/2026).
// Lê a API pública GraphQL do Railway (https://backboard.railway.com/graphql/v2) com um token de conta ou
// workspace (Authorization: Bearer) guardado só no backend — o token nunca vai para o navegador.
//
// Variáveis de ambiente:
//   RAILWAY_API_TOKEN   (obrigatória) token de conta/workspace — railway.com/account/tokens
//   RAILWAY_PROJECT_ID  (opcional) limita a um projeto. Quando o backend roda NO Railway, o próprio Railway
//                       injeta RAILWAY_PROJECT_ID; localmente, sem ela, lista todos os projetos do token.
//
// Limite da API: 1000 req/h no plano Hobby — por isso tudo aqui tem cache curto.

const ENDPOINT = 'https://backboard.railway.com/graphql/v2'
const TTL_VISAO_MS = 60 * 1000
const TTL_METRICAS_MS = 60 * 1000

export const railwayConfigurado = () => !!process.env.RAILWAY_API_TOKEN

async function gql(query, variables = {}) {
  const token = process.env.RAILWAY_API_TOKEN
  if (!token) { const e = new Error('railway_not_configured'); e.status = 503; throw e }
  const r = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20000),
  })
  if (r.status === 429) {
    const e = new Error(`Limite de requisições da API do Railway atingido — tente de novo em ${r.headers.get('retry-after') || 'alguns'} segundos.`)
    e.status = 429; throw e
  }
  let j = null
  try { j = await r.json() } catch { /* corpo não-JSON */ }
  // A API responde 200 com `errors` (ex.: "Not Authorized") — sempre conferir
  if (!r.ok || j?.errors?.length) {
    const msg = j?.errors?.map(x => x.message).join('; ') || `HTTP ${r.status}`
    const e = new Error(`Railway: ${msg}`); e.status = r.ok ? 502 : r.status; throw e
  }
  return j.data
}

const edges = (c) => (c?.edges || []).map(e => e.node)

const Q_PROJETO = `query projeto($id: String!) {
  project(id: $id) {
    id name
    services { edges { node { id name icon } } }
    environments { edges { node { id name } } }
  }
}`
const Q_PROJETOS = `query {
  projects {
    edges { node {
      id name
      services { edges { node { id name icon } } }
      environments { edges { node { id name } } }
    } }
  }
}`
// Projetos ficam dentro de workspaces: `projects` sem workspaceId devolve só os pessoais (vazio em 19/11/2026)
const Q_WORKSPACES = `query { me { workspaces { id name } } }`
const Q_PROJETOS_WS = `query projetosWs($w: String!) {
  projects(workspaceId: $w) {
    edges { node {
      id name
      services { edges { node { id name icon } } }
      environments { edges { node { id name } } }
    } }
  }
}`
async function listarProjetos() {
  const porId = new Map()
  const add = (lista) => lista.forEach(p => porId.set(p.id, p))
  add(edges((await gql(Q_PROJETOS)).projects))
  // token de conta: percorre os workspaces do usuário; token de workspace não aceita `me` → usa RAILWAY_WORKSPACE_ID
  let wsIds = []
  try { wsIds = ((await gql(Q_WORKSPACES)).me?.workspaces || []).map(w => w.id) } catch { /* token de workspace */ }
  if (process.env.RAILWAY_WORKSPACE_ID) wsIds.push(process.env.RAILWAY_WORKSPACE_ID)
  for (const w of [...new Set(wsIds)]) add(edges((await gql(Q_PROJETOS_WS, { w })).projects))
  return [...porId.values()]
}
const Q_DEPLOYS =`query deploys($input: DeploymentListInput!, $first: Int) {
  deployments(input: $input, first: $first) {
    edges { node { id status createdAt url staticUrl meta } }
  }
}`
const Q_LOGS = `query logs($deploymentId: String!, $limit: Int) {
  deploymentLogs(deploymentId: $deploymentId, limit: $limit) { timestamp message severity }
}`
// Métricas: consulta não descrita nas páginas da documentação; se o Railway recusar, a tela mostra "indisponível".
const Q_METRICAS = `query metricas($projectId: String, $serviceId: String, $environmentId: String, $startDate: DateTime!, $sampleRateSeconds: Int, $measurements: [MetricMeasurement!]!) {
  metrics(projectId: $projectId, serviceId: $serviceId, environmentId: $environmentId, startDate: $startDate, sampleRateSeconds: $sampleRateSeconds, measurements: $measurements) {
    measurement
    values { ts value }
  }
}`

// meta do deployment (JSON livre): commit/branch quando o deploy vem do GitHub
function resumoMeta(meta) {
  const m = meta && typeof meta === 'object' ? meta : {}
  return {
    commit: m.commitHash ? String(m.commitHash).slice(0, 7) : null,
    mensagem: m.commitMessage || null,
    autor: m.commitAuthor || null,
    branch: m.branch || null,
    repo: m.repo || null,
  }
}

let cacheVisao = null
const dominiosConhecidos = new Set()

export async function getVisaoGeral({ refresh = false } = {}) {
  if (!refresh && cacheVisao && Date.now() - cacheVisao.t < TTL_VISAO_MS) return cacheVisao.dados

  const projectId = process.env.RAILWAY_PROJECT_ID
  const projetos = projectId
    ? [(await gql(Q_PROJETO, { id: projectId })).project].filter(Boolean)
    : await listarProjetos()

  const servicos = []
  for (const p of projetos) {
    const envs = edges(p.environments)
    for (const s of edges(p.services)) {
      for (const env of envs) {
        let deploys = []
        let erro = null
        try {
          const d = await gql(Q_DEPLOYS, { input: { projectId: p.id, serviceId: s.id, environmentId: env.id }, first: 10 })
          deploys = edges(d.deployments).map(x => ({
            id: x.id, status: x.status, criado_em: x.createdAt,
            url: x.url || null, dominio: x.staticUrl || null, ...resumoMeta(x.meta),
          }))
        } catch (e) { erro = e.message }
        // serviço sem nenhum deploy neste ambiente não aparece (ex.: ambiente de PR vazio)
        if (!deploys.length && !erro) continue
        const ativo = deploys.find(x => x.status === 'SUCCESS') || null
        const dominio = ativo?.dominio || deploys.find(x => x.dominio)?.dominio || null
        if (dominio) dominiosConhecidos.add(dominio)
        servicos.push({
          chave: `${p.id}|${s.id}|${env.id}`,
          projeto_id: p.id, projeto: p.name,
          servico_id: s.id, servico: s.name,
          ambiente_id: env.id, ambiente: env.name,
          dominio, ultimo: deploys[0] || null, ativo, deploys, erro,
        })
      }
    }
  }
  const dados = { servicos, projeto_fixo: !!projectId, lido_em: new Date().toISOString() }
  cacheVisao = { t: Date.now(), dados }
  return dados
}

const cacheMetricas = new Map()
export async function getMetricas({ projectId, serviceId, environmentId, horas = 6 }) {
  const h = Math.min(Math.max(Number(horas) || 6, 1), 24 * 7)
  const chave = `${projectId}|${serviceId}|${environmentId}|${h}`
  const c = cacheMetricas.get(chave)
  if (c && Date.now() - c.t < TTL_METRICAS_MS) return c.dados
  // ~120 pontos por gráfico, no mínimo 1 por minuto
  const sampleRateSeconds = Math.max(60, Math.round((h * 3600) / 120))
  const d = await gql(Q_METRICAS, {
    projectId, serviceId, environmentId,
    startDate: new Date(Date.now() - h * 3600 * 1000).toISOString(),
    sampleRateSeconds,
    measurements: ['CPU_USAGE', 'MEMORY_USAGE_GB', 'NETWORK_RX_GB', 'NETWORK_TX_GB'],
  })
  const series = {}
  for (const m of d.metrics || []) series[m.measurement] = (m.values || []).map(v => ({ ts: v.ts, valor: v.value }))
  const dados = { horas: h, series }
  cacheMetricas.set(chave, { t: Date.now(), dados })
  return dados
}

export async function getLogs({ deploymentId, limit = 300 }) {
  const n = Math.min(Math.max(Number(limit) || 300, 1), 1000)
  const d = await gql(Q_LOGS, { deploymentId, limit: n })
  return (d.deploymentLogs || []).map(l => ({ ts: l.timestamp, mensagem: l.message, severidade: l.severity || null }))
}

// Plano, assinatura, uso do ciclo e capacidade (campos do schema GraphQL conferidos por introspecção em 19/11/2026;
// não estão nas páginas da documentação). Sem dados de pagamento/e-mail de cobrança.
const Q_PLANO = `query plano($id: String!) {
  workspace(workspaceId: $id) {
    id name plan projectCount subscriptionPlanLimit
    customer {
      state isTrialing trialDaysRemaining isUsageSubscriber
      currentUsage creditBalance remainingUsageCreditBalance appliedCredits
      billingPeriod { start end }
      usageLimit { hardLimit softLimit isOverLimit }
    }
  }
}`
let cachePlano = null
export async function getPlano({ refresh = false } = {}) {
  if (!refresh && cachePlano && Date.now() - cachePlano.t < 5 * 60 * 1000) return cachePlano.dados
  let wsIds = []
  try { wsIds = ((await gql(Q_WORKSPACES)).me?.workspaces || []).map(w => w.id) } catch { /* token de workspace */ }
  if (process.env.RAILWAY_WORKSPACE_ID) wsIds.push(process.env.RAILWAY_WORKSPACE_ID)
  const workspaces = []
  for (const id of [...new Set(wsIds)]) {
    const w = (await gql(Q_PLANO, { id })).workspace
    if (!w) continue
    const lim = w.subscriptionPlanLimit || {}
    const c = w.customer || {}
    workspaces.push({
      id: w.id, nome: w.name, plano: w.plan, projetos: w.projectCount,
      assinatura: {
        situacao: c.state, em_teste: c.isTrialing, dias_teste: c.trialDaysRemaining,
        uso_atual_usd: c.currentUsage, creditos_usd: c.creditBalance, creditos_aplicados_usd: c.appliedCredits,
        ciclo_inicio: c.billingPeriod?.start || null, ciclo_fim: c.billingPeriod?.end || null,
        // limites de gasto definidos pelo usuário, em DÓLARES (hardLimit/softLimit; só os campos agent* são em centavos)
        limite_gasto: c.usageLimit ? { rigido: c.usageLimit.hardLimit, aviso: c.usageLimit.softLimit, estourado: c.usageLimit.isOverLimit } : null,
      },
      capacidade: {
        cpu: lim.containers?.cpuDescription || null,
        cpu_max: lim.containers?.maxCpuDescription || null,
        memoria: lim.containers?.memoryDescription || null,
        memoria_max: lim.containers?.maxMemoryDescription || null,
        memoria_bytes: lim.containers?.memoryBytes || null,
        cpu_vcpu: lim.containers?.cpu || null,
        disco: lim.containers?.diskDescription || null,
        replicas: lim.deploys?.replicas ?? null,
        projetos_max: lim.projects ?? null,
        servicos_por_projeto: lim.project?.services ?? null,
        membros_por_projeto: lim.project?.members ?? null,
        volume_max_mb: lim.volumes?.maxSizeMB ?? null,
        dominios_servico: lim.networking?.serviceDomains ?? null,
        dominios_proprios: lim.networking?.customDomains ?? null,
        builds_simultaneos: lim.builds?.concurrent ?? null,
        retencao_logs_dias: lim.observability?.logRetentionDays ?? null,
      },
    })
  }
  const dados = { workspaces, lido_em: new Date().toISOString() }
  cachePlano = { t: Date.now(), dados }
  return dados
}

// Teste de saúde: chama o domínio público do serviço e mede o tempo. Só domínios vindos da própria API
// do Railway (evita usar o backend para acessar endereços arbitrários).
export async function ping(dominio) {
  const d = String(dominio || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  if (!d || !dominiosConhecidos.has(d)) { const e = new Error('Domínio desconhecido — atualize a visão geral.'); e.status = 400; throw e }
  const ini = Date.now()
  try {
    const r = await fetch(`https://${d}/`, { method: 'GET', signal: AbortSignal.timeout(10000), redirect: 'manual' })
    // qualquer resposta HTTP abaixo de 500 = serviço no ar (404 na raiz é normal para API)
    return { dominio: d, no_ar: r.status < 500, http: r.status, ms: Date.now() - ini, em: new Date().toISOString() }
  } catch (e) {
    return { dominio: d, no_ar: false, http: null, ms: Date.now() - ini, erro: e.name === 'TimeoutError' ? 'Sem resposta em 10 s' : e.message, em: new Date().toISOString() }
  }
}
