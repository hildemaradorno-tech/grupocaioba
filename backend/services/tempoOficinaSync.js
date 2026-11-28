/**
 * BI Possibilidades › aba Tempo na Oficina (27/11/2026): grava em fato_tempo_oficina_os as O.S. FECHADAS dos arquivos
 * ROF001_OSAberta_Excel <ano> (mesma leitura do getOsTempoOficina) para a tela abrir na hora, sem ler o SharePoint.
 *
 * Roda junto do "Atualizar" do BI (biMedidasDiarioSync) — manual, como o resto do BI. Janela: fechamentos desde 1º de
 * janeiro do ano anterior (a O.S. faturada no período pode ter aberto meses antes). Upsert + remoção, na janela, do que
 * não veio nesta leitura (ex.: O.S. cancelada depois).
 */
import { getOsTempoOficina } from './sharepointGarantias.js'

const LOTE = 500
const dataIso = (v) => (v ? String(v).slice(0, 10) : null)

export async function sincronizarTempoOficina(supabaseAdmin) {
  if (!supabaseAdmin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  const inicio = new Date().toISOString()
  const de = `${new Date().getFullYear() - 1}-01-01`
  const { rows } = await getOsTempoOficina({ de })

  // Chave única (empresa, O.S., tipo) — o getOsTempoOficina já deixa só a versão do arquivo mais recente.
  const porChave = new Map()
  for (const r of rows || []) {
    const empresa = String(r.empresa_nome || '').trim()
    const os = String(r.os_numero || '').trim()
    if (!empresa || !os) continue
    const tipo = String(r.tipo_os_sigla || '').trim()
    porChave.set(`${empresa}|${os}|${tipo}`, {
      empresa_nome: empresa, os_numero: os, tipo_os_sigla: tipo,
      consultor_nome: r.consultor_nome || null, proprietario_veiculo: r.proprietario_veiculo || null,
      veiculo_placa: r.veiculo_placa || null, veiculo_chassi: r.veiculo_chassi || null,
      total: Number(r.total) || 0, data_criacao: dataIso(r.data_criacao), fechado_data: dataIso(r.fechado_data),
      situacao: r.situacao || null, atualizado_em: inicio,
    })
  }
  const registros = [...porChave.values()]
  for (let i = 0; i < registros.length; i += LOTE) {
    const { error } = await supabaseAdmin
      .from('fato_tempo_oficina_os')
      .upsert(registros.slice(i, i + LOTE), { onConflict: 'empresa_nome,os_numero,tipo_os_sigla' })
    if (error) throw error
  }
  const { error: delErr } = await supabaseAdmin
    .from('fato_tempo_oficina_os')
    .delete()
    .gte('fechado_data', de)
    .lt('atualizado_em', inicio)
  if (delErr) throw delErr
  return { de, linhas: registros.length }
}
