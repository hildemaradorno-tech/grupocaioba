/**
 * Serviço de dados da Matriz KPIs.
 * Tenta buscar do backend (SharePoint via Graph API).
 * Se o backend não estiver configurado ou indisponível, usa dados mock automaticamente.
 */

import {
  MOCK_RESULTADOS,
  MOCK_BLOCO1,
  MOCK_BLOCO2,
  MOCK_BLOCO3_POS_VENDA,
  MOCK_BLOCO3_PECAS,
  MOCK_BLOCO3_SERVICOS,
  MOCK_ORCAMENTO_BACKLOG,
} from '../data/kpiMockData'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const BASE = `${BACKEND_URL}/api/kpi`

// Timeout único para todas as chamadas — SharePoint pode demorar até 3 min na primeira leitura (sem cache).
const TIMEOUT_MS = 180_000

// Cache em memória — persiste enquanto a aba estiver aberta; limpo no F5/refresh (morte do módulo).
const _cache = new Map()

function cacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`
}

function cacheGet(key)         { return _cache.get(key) ?? null }
function cacheSet(key, result) { _cache.set(key, result) }

async function fetchWithTimeout(url, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      // 503 = backend configurado mas sem credenciais → usa mock silenciosamente
      const body = await res.json().catch(() => ({}))
      throw Object.assign(new Error(body.message || `HTTP ${res.status}`), { status: res.status })
    }
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

function buildUrl(endpoint, params = {}) {
  const qs = new URLSearchParams()
  if (params.empresa && params.empresa !== 'todas') qs.set('empresa', params.empresa)
  if (params.mecanico && params.mecanico !== 'todos') qs.set('mecanico', params.mecanico)
  if (params.year) qs.set('year', params.year)
  const q = qs.toString()
  return `${BASE}/${endpoint}${q ? `?${q}` : ''}`
}

async function tryFetch(endpoint, mockData, params = {}) {
  const { _forceReload, ...cleanParams } = params
  const key = cacheKey(endpoint, cleanParams)

  // Retorna cache do dia se disponível e não for recarga forçada
  if (!_forceReload) {
    const hit = cacheGet(key)
    if (hit) return hit
  }

  try {
    const result = { data: await fetchWithTimeout(buildUrl(endpoint, cleanParams), TIMEOUT_MS), source: 'sharepoint' }
    cacheSet(key, result)
    return result
  } catch (err) {
    const silent = err.status === 503 || err.name === 'AbortError'
    if (!silent) console.warn(`[KPI] Usando mock para "${endpoint}":`, err.message)
    // Não armazena mock em cache — tenta de novo na próxima abertura
    return { data: mockData, source: 'mock' }
  }
}

// ── API pública ──────────────────────────────────────────────────────────────

export async function fetchAuditoria(p)     { return tryFetch('auditoria',         null,                   p) }
export async function fetchResultados(p)    { return tryFetch('resultados',       MOCK_RESULTADOS,        p) }
export async function fetchBloco1(p)        { return tryFetch('bloco1',           MOCK_BLOCO1,            p) }
export async function fetchBloco2(p)        { return tryFetch('bloco2',           MOCK_BLOCO2,            p) }
export async function fetchBloco3PosVenda(p){ return tryFetch('bloco3-pos-venda', MOCK_BLOCO3_POS_VENDA,  p) }
export async function fetchBloco3Pecas(p)   { return tryFetch('bloco3-pecas',     MOCK_BLOCO3_PECAS,      p) }
export async function fetchBloco3Servicos(p){ return tryFetch('bloco3-servicos',  MOCK_BLOCO3_SERVICOS,   p) }
export async function fetchBacklog(p)       { return tryFetch('backlog',          MOCK_ORCAMENTO_BACKLOG, p) }

export async function getStatus() {
  try {
    return await fetchWithTimeout(`${BASE}/status`)
  } catch {
    return { configured: false, source: 'offline' }
  }
}

// ── Sincronização agendada ────────────────────────────────────────────────────

export async function getStatusSincronizacao() {
  try {
    return await fetchWithTimeout(`${BASE}/sync/status`, 15_000)
  } catch {
    return { configurado: false, ativo: false, ultimaExecucao: null, executandoAgora: false }
  }
}

export async function executarSincronizacaoAgora(usuarioEmail) {
  const res = await fetch(`${BASE}/sync/executar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario_email: usuarioEmail || null }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`)
  return body
}
