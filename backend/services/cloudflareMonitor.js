// Governança › Monitor Cloudflare (19/11/2026).
// O frontend (as telas do portal) é publicado no Cloudflare Pages, projeto "portalgestaocaioba"
// (package.json → npm run deploy: wrangler pages deploy dist --project-name=portalgestaocaioba).
//
// Duas fontes:
//   1) Teste do site (sem token): abre o endereço público do portal e mede o tempo de resposta.
//   2) API do Cloudflare (https://api.cloudflare.com/client/v4), só com CLOUDFLARE_API_TOKEN no backend
//      (token de LEITURA: Account › Cloudflare Pages › Read): projeto, domínios, publicações (deploys),
//      publicações no mês × limite do plano gratuito e a validade do próprio token.
//
// Variáveis: CLOUDFLARE_API_TOKEN (opcional), CLOUDFLARE_ACCOUNT_ID (opcional — sem ela, usa a 1ª conta do token),
//            CLOUDFLARE_PAGES_PROJECT (opcional, padrão portalgestaocaioba).

const API = 'https://api.cloudflare.com/client/v4'
const TTL_MS = 60 * 1000
const PROJETO_PADRAO = 'portalgestaocaioba'
// Plano gratuito do Cloudflare Pages (developers.cloudflare.com/pages/platform/limits, conferido em 19/11/2026)
export const LIMITES = { buildsMes: 500, pctAtencao: 60, pctCritico: 85, respostaLentaMs: 3000, tokenAtencaoDias: 30 }

export const tokenConfigurado = () => !!process.env.CLOUDFLARE_API_TOKEN
const projetoNome = () => process.env.CLOUDFLARE_PAGES_PROJECT || PROJETO_PADRAO

async function cf(caminho) {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) { const e = new Error('cloudflare_token_not_configured'); e.status = 503; throw e }
  const r = await fetch(`${API}${caminho}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) })
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (r.status === 429) { const e = new Error('Limite de requisições da API do Cloudflare — tente de novo em instantes.'); e.status = 429; throw e }
  if (!r.ok || j?.success === false) {
    const msg = j?.errors?.map(x => `${x.message}${x.code ? ` (${x.code})` : ''}`).join('; ') || `HTTP ${r.status}`
    const e = new Error(`Cloudflare: ${msg}`); e.status = r.status === 403 || r.status === 401 ? 403 : 502; throw e
  }
  return j
}
const tentar = async (fn) => { try { return { dados: await fn() } } catch (e) { return { erro: e.message } } }

let contaCache = null
async function contaId() {
  if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID
  if (contaCache) return contaCache
  const j = await cf('/accounts?per_page=5')
  contaCache = j.result?.[0]?.id || null
  if (!contaCache) throw Object.assign(new Error('O token não tem acesso a nenhuma conta do Cloudflare.'), { status: 403 })
  return contaCache
}

// Teste do site: só domínios do próprio projeto (anti-SSRF), GET da página inicial
async function testarSite(dominio) {
  const t0 = Date.now()
  try {
    const r = await fetch(`https://${dominio}/`, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10000) })
    return { dominio, no_ar: r.status < 500, status: r.status, ms: Date.now() - t0 }
  } catch (e) {
    return { dominio, no_ar: false, status: null, ms: Date.now() - t0, erro: e.name === 'TimeoutError' ? 'sem resposta em 10 s' : e.message }
  }
}

const resumoDeploy = (d) => ({
  id: d.id, curto: d.short_id, url: d.url, ambiente: d.environment, criado_em: d.created_on,
  etapa: d.latest_stage?.name || null, status: d.latest_stage?.status || null,
  branch: d.deployment_trigger?.metadata?.branch || null,
  commit: d.deployment_trigger?.metadata?.commit_hash ? String(d.deployment_trigger.metadata.commit_hash).slice(0, 7) : null,
  mensagem: d.deployment_trigger?.metadata?.commit_message || null,
  origem: d.deployment_trigger?.type || null, // ad_hoc = wrangler (npm run deploy) · github:push = Git
})

let cache = null
export async function getVisao({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.t < TTL_MS) return cache.dados

  const nome = projetoNome()
  let api = { configurado: tokenConfigurado() }
  let dominios = [`${nome}.pages.dev`]

  if (api.configurado) {
    const [token, conta] = await Promise.all([tentar(() => cf('/user/tokens/verify')), tentar(() => contaId())])
    api.token = token.dados ? { status: token.dados.result?.status, expira_em: token.dados.result?.expires_on || null } : null
    api.erro_token = token.erro || null
    if (conta.erro) api.erro_projeto = conta.erro
    else {
      const proj = await tentar(() => cf(`/accounts/${conta.dados}/pages/projects/${encodeURIComponent(nome)}`))
      if (proj.erro) api.erro_projeto = proj.erro
      else {
        const p = proj.dados.result
        api.projeto = {
          nome: p.name, subdominio: p.subdomain, dominios: p.domains || [], branch_producao: p.production_branch,
          criado_em: p.created_on, ultimo: p.latest_deployment ? resumoDeploy(p.latest_deployment) : null,
          em_producao: p.canonical_deployment ? resumoDeploy(p.canonical_deployment) : null,
        }
        dominios = [...new Set([p.subdomain, ...(p.domains || [])].filter(Boolean))]
        // Publicações: lê páginas até sair do mês atual (limite 500 builds/mês conta por mês)
        const inicioMes = new Date(); inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0)
        const deploys = []
        for (let pagina = 1; pagina <= 20; pagina++) {
          const r = await tentar(() => cf(`/accounts/${conta.dados}/pages/projects/${encodeURIComponent(nome)}/deployments?per_page=25&page=${pagina}`))
          if (r.erro) { api.erro_deploys = r.erro; break }
          const lote = r.dados.result || []
          deploys.push(...lote.map(resumoDeploy))
          if (lote.length < 25 || Date.parse(lote[lote.length - 1].created_on) < inicioMes.getTime()) break
        }
        api.deploys = deploys.slice(0, 50)
        api.deploys_mes = deploys.filter(d => Date.parse(d.criado_em) >= inicioMes.getTime()).length
        api.deploys_mes_falhos = deploys.filter(d => Date.parse(d.criado_em) >= inicioMes.getTime() && d.status === 'failure').length
      }
    }
  }

  const sites = await Promise.all(dominios.map(testarSite))
  const dados = { projeto_nome: nome, sites, api, limites: LIMITES, lido_em: new Date().toISOString() }
  cache = { t: Date.now(), dados }
  return dados
}

// ── Pontos de controle ("Precisa de atenção") ─────────────────────────────
const LINK_DASH = 'https://dash.cloudflare.com/?to=/:account/pages'
export function calcularControles(v) {
  const c = []
  const nivelPct = (pct) => pct >= LIMITES.pctCritico ? 'critico' : pct >= LIMITES.pctAtencao ? 'atencao' : 'ok'

  // Site no ar
  for (const s of v.sites) {
    c.push(!s.no_ar
      ? { id: `site-${s.dominio}`, grupo: 'Site', nivel: 'critico', titulo: `${s.dominio} fora do ar`, detalhe: s.erro || `Respondeu HTTP ${s.status}. Os usuários não conseguem abrir o portal por este endereço.` }
      : s.ms > LIMITES.respostaLentaMs
        ? { id: `site-${s.dominio}`, grupo: 'Site', nivel: 'atencao', titulo: `${s.dominio} lento: ${s.ms} ms`, detalhe: 'A página inicial do portal está demorando para abrir.' }
        : { id: `site-${s.dominio}`, grupo: 'Site', nivel: 'ok', titulo: `${s.dominio} no ar (${s.ms} ms)` })
  }

  const a = v.api
  if (!a.configurado) {
    c.push({ id: 'token', grupo: 'Configuração', nivel: 'info', titulo: 'Token da API do Cloudflare não configurado',
      detalhe: 'Sem ele não dá para ver as publicações, o limite do plano e os domínios. O teste do site funciona assim mesmo.' })
  } else {
    if (a.erro_token) c.push({ id: 'token', grupo: 'Configuração', nivel: 'atencao', titulo: 'Não foi possível validar o token do Cloudflare', detalhe: a.erro_token })
    else if (a.token?.expira_em) {
      const dias = Math.floor((Date.parse(a.token.expira_em) - Date.now()) / 86400000)
      c.push(dias <= LIMITES.tokenAtencaoDias
        ? { id: 'token', grupo: 'Configuração', nivel: dias < 0 ? 'critico' : 'atencao', titulo: `Token do Cloudflare ${dias < 0 ? 'vencido' : `vence em ${dias} dia(s)`}`, detalhe: 'Gere um novo token de leitura e atualize CLOUDFLARE_API_TOKEN no backend e no Railway.' }
        : { id: 'token', grupo: 'Configuração', nivel: 'ok', titulo: `Token do Cloudflare válido até ${new Date(a.token.expira_em).toLocaleDateString('pt-BR')}` })
    }
    if (a.erro_projeto) c.push({ id: 'projeto', grupo: 'Projeto', nivel: 'atencao', titulo: 'Não foi possível ler o projeto no Cloudflare', detalhe: a.erro_projeto })
    if (a.projeto) {
      const u = a.projeto.ultimo
      if (u) c.push(u.status === 'failure'
        ? { id: 'deploy', grupo: 'Publicação', nivel: 'critico', titulo: `A última publicação FALHOU (${new Date(u.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})`, detalhe: 'O portal continua com a versão anterior. Verifique no chat de deploy.', link: LINK_DASH, linkTxt: 'Abrir Cloudflare' }
        : { id: 'deploy', grupo: 'Publicação', nivel: 'ok', titulo: `Última publicação ok (${new Date(u.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })})` })
      if (a.deploys_mes != null) {
        const pct = (a.deploys_mes / LIMITES.buildsMes) * 100
        c.push({ id: 'builds', grupo: 'Plano', nivel: nivelPct(pct), titulo: `Publicações no mês: ${a.deploys_mes} de ${LIMITES.buildsMes} (${Math.round(pct)}%)`,
          detalhe: pct >= LIMITES.pctAtencao ? 'Perto do limite do plano gratuito — acima de 500 no mês, novas publicações são bloqueadas até virar o mês.' : null })
      }
    }
  }

  // Destino de cada alerta: aba e tabela da tela onde está a informação (21/11/2026)
  const DESTINO = { token: { aba: 'deploys', alvo: 'aviso-token' }, projeto: { aba: 'visao', alvo: 'cf-projeto' },
    deploy: { aba: 'deploys', alvo: 'cf-deploys' }, builds: { aba: 'deploys', alvo: 'cf-builds' } }
  for (const x of c) x.destino = DESTINO[x.id] || (x.id.startsWith('site-') ? { aba: 'visao', alvo: 'cf-projeto' } : { aba: 'visao', alvo: null })
  const ordem = { critico: 0, atencao: 1, info: 2, ok: 3 }
  c.sort((x, y) => ordem[x.nivel] - ordem[y.nivel])
  return {
    controles: c,
    resumo: Object.fromEntries(['critico', 'atencao', 'info', 'ok'].map(n => [n, c.filter(x => x.nivel === n).length])),
    calculado_em: new Date().toISOString(),
  }
}
