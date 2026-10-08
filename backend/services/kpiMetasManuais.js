/**
 * Metas digitadas manualmente na Matriz KPIs (ex.: Eficácia da Oficina, Produtividade da
 * Oficina — indicadores sem fonte automática de meta), gravadas no Supabase mês a mês pra
 * não se perderem — ver migration kpi_metas_manuais.sql. Mesmo padrão de kpiPesos.js.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'

const QUARTERS = { q1: ['m01', 'm02', 'm03'], q2: ['m04', 'm05', 'm06'], q3: ['m07', 'm08', 'm09'], q4: ['m10', 'm11', 'm12'] }

// { 'tituloGerente|kpiId': { m01: valor, ..., m12: valor } }
export async function getMetasManuais(bloco, ano) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return {}
  const { data } = await supabaseAdmin
    .from('kpi_metas_manuais')
    .select('titulo_gerente, kpi_id, mes, valor')
    .eq('bloco', bloco).eq('ano', ano)
  const map = {}
  for (const row of data || []) {
    const key = `${row.titulo_gerente}|${row.kpi_id}`
    if (!map[key]) map[key] = {}
    map[key][`m${String(row.mes).padStart(2, '0')}`] = Number(row.valor)
  }
  return map
}

export async function setMetaManual(bloco, tituloGerente, kpiId, ano, mes, valor) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  const { error } = await supabaseAdmin
    .from('kpi_metas_manuais')
    .upsert(
      { bloco, titulo_gerente: tituloGerente, kpi_id: kpiId, ano, mes, valor, atualizado_em: new Date().toISOString() },
      { onConflict: 'bloco,titulo_gerente,kpi_id,ano,mes' }
    )
  if (error) throw error
}

// Injeta a meta digitada no mês certo. Trimestre/Ano = média simples dos meses preenchidos
// (não dá pra ratear um alvo de % como se fosse um valor em R$). Semanas não recebem meta
// manual — ficam como estavam (sem meta), já que a entrada é só mês a mês.
export function aplicarMetasManuais(quadros, metas) {
  return quadros.map(quadro => ({
    ...quadro,
    kpis: quadro.kpis.map(kpi => {
      const key = `${quadro.tituloGerente}|${kpi.id}`
      const meses = metas[key]
      if (!meses) return kpi
      const out = { ...kpi }
      for (const mk of Object.keys(meses)) {
        out[mk] = { ...(out[mk] ?? { meta: null, realizado: null }), meta: meses[mk] }
      }
      for (const [qk, ms] of Object.entries(QUARTERS)) {
        const vals = ms.map(m => meses[m]).filter(v => v != null)
        if (vals.length) out[qk] = { ...(out[qk] ?? { meta: null, realizado: null }), meta: vals.reduce((s, v) => s + v, 0) / vals.length }
      }
      const anoVals = Object.values(meses)
      if (anoVals.length) out.fy = { ...(out.fy ?? { meta: null, realizado: null }), meta: anoVals.reduce((s, v) => s + v, 0) / anoVals.length }
      return out
    }),
  }))
}
