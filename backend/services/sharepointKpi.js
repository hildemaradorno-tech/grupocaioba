/**
 * Busca e mapeia dados do Excel no SharePoint via Microsoft Graph API.
 *
 * Variáveis de ambiente necessárias:
 *   SHAREPOINT_SITE_ID  — ID do site SharePoint
 *   SHAREPOINT_FILE_ID  — ID do arquivo no Drive do SharePoint
 *
 * Nomes das abas (opcionais, com defaults abaixo):
 *   KPI_SHEET_RESULTADOS, KPI_SHEET_BLOCO1, KPI_SHEET_BLOCO2,
 *   KPI_SHEET_BLOCO3_PV, KPI_SHEET_BLOCO3_PECAS, KPI_SHEET_BACKLOG
 */

import { graphGet } from './graphClient.js'

// ── Cache em memória ─────────────────────────────────────────────────────────
const CACHE_TTL = parseInt(process.env.KPI_CACHE_TTL_MIN || '10') * 60 * 1000
const _cache = {}

function fromCache(key) {
  const e = _cache[key]
  if (!e) return null
  if (Date.now() - e.ts > CACHE_TTL) { delete _cache[key]; return null }
  return e.data
}
function toCache(key, data) { _cache[key] = { data, ts: Date.now() } }
export function invalidateCache() { Object.keys(_cache).forEach(k => delete _cache[k]) }

// ── Nomes das abas ───────────────────────────────────────────────────────────
export const SHEET_NAMES = {
  resultados:  process.env.KPI_SHEET_RESULTADOS   || 'RESULTADOS',
  bloco1:      process.env.KPI_SHEET_BLOCO1       || 'BLOCO 1',
  bloco2:      process.env.KPI_SHEET_BLOCO2       || 'BLOCO 2',
  bloco3PV:    process.env.KPI_SHEET_BLOCO3_PV    || 'BLOCO 3 - PÓS VENDA',
  bloco3Pecas: process.env.KPI_SHEET_BLOCO3_PECAS || 'BLOCO 3 - PEÇAS',
  backlog:     process.env.KPI_SHEET_BACKLOG       || 'ORÇAMENTO BACKLOG',
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function fetchSheet(sheetName) {
  const cached = fromCache(sheetName)
  if (cached) return cached

  const siteId = process.env.SHAREPOINT_SITE_ID
  const fileId = process.env.SHAREPOINT_FILE_ID
  if (!siteId || !fileId) throw new Error('SHAREPOINT_SITE_ID ou SHAREPOINT_FILE_ID não configurados')

  const path = `/sites/${siteId}/drive/items/${fileId}/workbook/worksheets/${encodeURIComponent(sheetName)}/usedRange`
  const data = await graphGet(path)
  toCache(sheetName, data.values)
  return data.values
}

function rowsToObjects(rows, headerRow = 0) {
  const headers = rows[headerRow].map(h => String(h ?? '').trim())
  return rows.slice(headerRow + 1)
    .filter(row => row.some(c => c !== null && c !== ''))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? null])))
}

function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = parseFloat(v); return isNaN(n) ? null : n
}

function pct(v) { return num(v) } // valores já vêm como decimal (0.85 = 85%)

function col(obj, ...keys) {
  for (const k of keys) {
    const v = obj[k] ?? obj[k.normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? null
    if (v !== null && v !== '') return String(v).trim()
  }
  return ''
}

function date(v) {
  if (!v) return null
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : s || null
}

function periodCols(obj, q) {
  return {
    meta:      num(obj[`META ${q}`]       || obj[`Meta ${q}`]),
    realizado: num(obj[`VALOR REAL ${q}`] || obj[`2026${q}`] || obj[`Real ${q}`]),
  }
}

// ── Exportações de dados ─────────────────────────────────────────────────────

export async function getResultados() {
  const rows = await fetchSheet(SHEET_NAMES.resultados)
  const objs = rowsToObjects(rows)
  const result = {}
  for (const o of objs) {
    const vertical = col(o, 'VERTICAL', 'Vertical')
    if (!vertical) continue
    if (!result[vertical]) result[vertical] = []
    result[vertical].push({
      bloco: col(o, 'BLOCO', 'Bloco'),
      peso:  num(o['PESO'] ?? o['Peso']),
      q1: pct(o['% ATING. Q1'] ?? o['%ATING.Q1'] ?? o['Q1']),
      q2: pct(o['% ATING. Q2'] ?? o['%ATING.Q2'] ?? o['Q2']),
      q3: pct(o['% ATING. Q3'] ?? o['%ATING.Q3'] ?? o['Q3']),
      q4: pct(o['% ATING. Q4'] ?? o['%ATING.Q4'] ?? o['Q4']),
      fy: pct(o['% ATING. FY'] ?? o['%ATING.FY'] ?? o['FY']),
    })
  }
  return result
}

export async function getBloco1() {
  const rows = await fetchSheet(SHEET_NAMES.bloco1)
  return rowsToObjects(rows).map(o => ({
    indicador:   col(o, 'INDICADOR'),
    orientacao:  col(o, 'ORIENTAÇÃO', 'ORIENTACAO') || '>',
    metaAnual:   num(o['META ANUAL']),
    metrica:     col(o, 'MÉTRICA', 'METRICA'),
    peso:        num(o['PESO']),
    origem:      col(o, 'ORIGEM'),
    responsavel: col(o, 'RESPONSÁVEL', 'RESPONSAVEL'),
    q1: periodCols(o, 'Q1'), q2: periodCols(o, 'Q2'),
    q3: periodCols(o, 'Q3'), q4: periodCols(o, 'Q4'),
    fy: periodCols(o, 'FY'),
  })).filter(r => r.indicador)
}

export async function getBloco2() {
  const rows = await fetchSheet(SHEET_NAMES.bloco2)
  return rowsToObjects(rows).map(o => ({
    area:             col(o, 'ÁREA', 'AREA'),
    responsabilidade: col(o, 'RESPONSABILIDADE'),
    indicador:        col(o, 'INDICADOR'),
    orientacao:       col(o, 'ORIENTAÇÃO', 'ORIENTACAO') || '>',
    metaAnual:        num(o['META ANUAL']),
    metrica:          col(o, 'MÉTRICA', 'METRICA'),
    pesoObj:          num(o['PESO / OBJETIVO'] ?? o['PESO/OBJETIVO']),
    pesoArea:         num(o['PESO / ÁREA']     ?? o['PESO/AREA']),
    origem:           col(o, 'ORIGEM'),
    responsavel:      col(o, 'RESPONSÁVEL', 'RESPONSAVEL'),
    q1: periodCols(o, 'Q1'), q2: periodCols(o, 'Q2'),
    q3: periodCols(o, 'Q3'), q4: periodCols(o, 'Q4'),
    fy: periodCols(o, 'FY'),
  })).filter(r => r.indicador)
}

export async function getBloco3PosVenda() {
  const rows = await fetchSheet(SHEET_NAMES.bloco3PV)
  return rowsToObjects(rows).map((o, i) => ({
    id:         parseInt(o['#'] ?? o['ID'] ?? i + 1),
    gerente:    col(o, 'GERENTE GERAL', 'GERENTE'),
    orientacao: col(o, 'ORIENTAÇÃO', 'ORIENTACAO') || '>',
    metrica:    col(o, 'MÉTRICA', 'METRICA') || '%',
    metaAnual:  num(o['META ANUAL']),
    pesoObj:    num(o['PESO / OBJETIVO'] ?? o['PESO/OBJETIVO'] ?? o['PESO']),
    q1: periodCols(o, 'Q1'), q2: periodCols(o, 'Q2'),
    q3: periodCols(o, 'Q3'), q4: periodCols(o, 'Q4'),
    fy: periodCols(o, 'FY'),
  })).filter(r => r.gerente)
}

export async function getBloco3Pecas() {
  const rows = await fetchSheet(SHEET_NAMES.bloco3Pecas)
  return rowsToObjects(rows).map((o, i) => ({
    id:         parseInt(o['#'] ?? o['ID'] ?? i + 1),
    gerente:    col(o, 'GERENTE', 'GERENTE GERAL'),
    orientacao: col(o, 'ORIENTAÇÃO', 'ORIENTACAO') || '>',
    metrica:    col(o, 'MÉTRICA', 'METRICA') || '%',
    metaAnual:  num(o['META ANUAL']),
    pesoObj:    num(o['PESO / OBJETIVO'] ?? o['PESO/OBJETIVO'] ?? o['PESO']),
    q1: periodCols(o, 'Q1'), q2: periodCols(o, 'Q2'),
    q3: periodCols(o, 'Q3'), q4: periodCols(o, 'Q4'),
    fy: periodCols(o, 'FY'),
  })).filter(r => r.gerente)
}

export async function getBacklog() {
  const rows = await fetchSheet(SHEET_NAMES.backlog)
  return rowsToObjects(rows).map(o => ({
    casa:      col(o, 'CASA'),
    area:      col(o, 'ÁREA', 'AREA'),
    item:      col(o, 'ÍTEM', 'ITEM'),
    atual:     col(o, 'ATUAL'),
    pleito:    col(o, 'PLEITO'),
    deadline:  date(o['DEAD LINE'] ?? o['DEADLINE']),
    atividade: col(o, 'ATIVIDADE'),
    status:    col(o, 'STATUS'),
    entrega:   date(o['ENTREGA']),
  })).filter(r => r.casa || r.item)
}
