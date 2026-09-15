/**
 * Pesos definidos manualmente por indicador da Matriz KPIs (coluna "Peso"),
 * gravados no Supabase para ficarem os mesmos pra qualquer usuário que abrir
 * a tela — ver migration kpi_pesos.sql.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'

// { 'tituloGerente|kpiId': peso }
export async function getPesos(bloco) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return {}
  const { data } = await supabaseAdmin
    .from('kpi_pesos')
    .select('titulo_gerente, kpi_id, peso')
    .eq('bloco', bloco)
  const map = {}
  for (const row of data || []) map[`${row.titulo_gerente}|${row.kpi_id}`] = Number(row.peso)
  return map
}

export async function setPeso(bloco, tituloGerente, kpiId, peso) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  const { error } = await supabaseAdmin
    .from('kpi_pesos')
    .upsert(
      { bloco, titulo_gerente: tituloGerente, kpi_id: kpiId, peso, atualizado_em: new Date().toISOString() },
      { onConflict: 'bloco,titulo_gerente,kpi_id' }
    )
  if (error) throw error
}

export function aplicarPesos(quadros, pesos) {
  return quadros.map(quadro => ({
    ...quadro,
    kpis: quadro.kpis.map(kpi => {
      const key = `${quadro.tituloGerente}|${kpi.id}`
      return key in pesos ? { ...kpi, pesoObj: pesos[key] } : kpi
    }),
  }))
}
