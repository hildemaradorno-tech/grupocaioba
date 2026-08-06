// Configuração e helpers de períodos para os componentes de KPI

// ── Trimestral ───────────────────────────────────────────────────────────────
export const T_PERIODS = ['q1', 'q2', 'q3', 'q4', 'fy']
export const T_LABELS  = { q1:'Q1', q2:'Q2', q3:'Q3', q4:'Q4', fy:'FY' }
export const T_DEFAULT = { q1:true, q2:true, q3:true, q4:true, fy:true }

// ── Mensal ───────────────────────────────────────────────────────────────────
export const M_PERIODS = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12']
export const M_LABELS  = {
  m01:'Jan', m02:'Fev', m03:'Mar', m04:'Abr', m05:'Mai', m06:'Jun',
  m07:'Jul', m08:'Ago', m09:'Set', m10:'Out', m11:'Nov', m12:'Dez',
}
// Jan-Mai 2026 visíveis por padrão (meses já transcorridos)
export const M_DEFAULT = {
  m01:true, m02:true, m03:true, m04:true, m05:true,
  m06:false, m07:false, m08:false, m09:false, m10:false, m11:false, m12:false,
}

// ── Semanal ──────────────────────────────────────────────────────────────────
// Regra: o dia 1 do mês abre a semana → termina no primeiro sábado daquele mês.
// Semanas seguintes: domingo → sábado (7 dias) ou último dia do mês, o que vier primeiro.
// O número total de semanas varia por ano (≈ 58-65).

export function computeWeekSchema(year) {
  const allWeeks     = []
  const labels       = {}
  const dateRanges   = {}
  const mwRanges     = {}
  const w2m          = {}
  const wpm          = {}
  let n = 1

  for (let m = 1; m <= 12; m++) {
    const mKey     = `m${String(m).padStart(2, '0')}`
    const dim      = new Date(Date.UTC(year, m, 0)).getUTCDate()    // dias no mês
    const dow1     = new Date(Date.UTC(year, m - 1, 1)).getUTCDay() // 0=Dom..6=Sab
    const firstSat = dow1 === 6 ? 1 : 1 + (6 - dow1)               // dia do 1º sábado

    const mWeeks = []
    let start = 1
    while (start <= dim) {
      const end = start === 1
        ? Math.min(firstSat, dim)      // semana 1: dia 1 → primeiro sábado
        : Math.min(start + 6, dim)     // demais: dom → sab (ou fim do mês)
      const key = `s${String(n).padStart(2, '0')}`
      allWeeks.push(key)
      labels[key] = `S${String(n).padStart(2, '0')}`
      dateRanges[key] = { startDay: start, startMonth: m, endDay: end, endMonth: m }
      mWeeks.push(key)
      w2m[key] = mKey
      n++
      start = end + 1
    }
    mwRanges[mKey] = mWeeks
    wpm[mKey]      = mWeeks.length
  }

  const qwr = {
    q1: ['m01','m02','m03'].flatMap(m => mwRanges[m] || []),
    q2: ['m04','m05','m06'].flatMap(m => mwRanges[m] || []),
    q3: ['m07','m08','m09'].flatMap(m => mwRanges[m] || []),
    q4: ['m10','m11','m12'].flatMap(m => mwRanges[m] || []),
  }

  const curMKey  = `m${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const curSet   = new Set(mwRanges[curMKey] || [])
  const sDefault = Object.fromEntries(allWeeks.map(s => [s, curSet.has(s)]))

  return {
    S_ALL: allWeeks, S_LABELS: labels, WEEK_DATE_RANGES: dateRanges,
    MONTH_WEEK_RANGES: mwRanges, WEEK_TO_MONTH: w2m,
    WEEKS_PER_MONTH: wpm, QUARTER_WEEK_RANGES: qwr, S_DEFAULT: sDefault,
  }
}

// Exporta o esquema do ano corrente (usado pelos imports estáticos em todo o app)
const _currentYear = new Date().getFullYear()
const _ws = computeWeekSchema(_currentYear)
export const S_ALL               = _ws.S_ALL
export const S_LABELS            = _ws.S_LABELS
export const WEEK_DATE_RANGES    = _ws.WEEK_DATE_RANGES
export const MONTH_WEEK_RANGES   = _ws.MONTH_WEEK_RANGES
export const WEEK_TO_MONTH       = _ws.WEEK_TO_MONTH
export const WEEKS_PER_MONTH     = _ws.WEEKS_PER_MONTH
export const QUARTER_WEEK_RANGES = _ws.QUARTER_WEEK_RANGES
export const S_DEFAULT           = _ws.S_DEFAULT

// Cache de schemas por ano — evita recomputar ao alternar anos no seletor
const _schemaCache = new Map([[_currentYear, _ws]])
function getSchema(year) {
  const y = year || _currentYear
  if (!_schemaCache.has(y)) _schemaCache.set(y, computeWeekSchema(y))
  return _schemaCache.get(y)
}

// Mês → trimestre
const MONTH_TO_QUARTER = {
  m01:'q1',m02:'q1',m03:'q1', m04:'q2',m05:'q2',m06:'q2',
  m07:'q3',m08:'q3',m09:'q3', m10:'q4',m11:'q4',m12:'q4',
}

// ── Helpers de derivação de dados ────────────────────────────────────────────

function isRateMetric(row) {
  // Considera taxa/percentual quando a métrica contém '%' ou é sem unidade de volume
  return row.metrica && row.metrica.includes('%')
}

export function getMonthData(row, mKey) {
  // Usa dado mensal explícito se existir
  if (row[mKey]) return row[mKey]
  const qKey = MONTH_TO_QUARTER[mKey]
  const qData = row[qKey]
  if (!qData) return { meta: null, realizado: null }
  const div = isRateMetric(row) ? 1 : 3
  return {
    meta:      qData.meta      !== null ? qData.meta      / div : null,
    realizado: qData.realizado !== null ? qData.realizado / div : null,
  }
}

export function getWeekData(row, sKey) {
  // Usa dado semanal real se disponível (injetado pelo backend)
  if (row[sKey] !== undefined) return row[sKey]
  // Fallback: pro-rata do mês (KPIs sem granularidade semanal)
  const mKey = WEEK_TO_MONTH[sKey]
  const mData = getMonthData(row, mKey)
  const div = isRateMetric(row) ? 1 : (WEEKS_PER_MONTH[mKey] || 4)
  return {
    meta:      mData.meta      !== null ? mData.meta      / div : null,
    realizado: mData.realizado !== null ? mData.realizado / div : null,
  }
}

export function getPeriodData(row, period) {
  if (period === 'fy' || period.startsWith('q')) return row[period]
  if (period.startsWith('m')) return getMonthData(row, period)
  return getWeekData(row, period)
}

export function getPeriodLabel(period, year) {
  if (T_LABELS[period]) return T_LABELS[period]
  if (M_LABELS[period]) return M_LABELS[period]
  if (period.startsWith('s')) {
    const schema = getSchema(year)
    const base   = schema.S_LABELS[period] || period
    const r      = schema.WEEK_DATE_RANGES?.[period]
    if (r) {
      const fmt = (d, m) => `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`
      return `${base} (${fmt(r.startDay, r.startMonth)}–${fmt(r.endDay, r.endMonth)})`
    }
    return base
  }
  return period
}
