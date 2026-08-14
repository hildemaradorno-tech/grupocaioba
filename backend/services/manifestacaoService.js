import { getSupabaseAdmin } from './supabaseAdmin.js'

/**
 * Encerra o Período de Manifestação (Etapa 2) de um projeto: move a fase do
 * projeto para a fase marcada como `aciona_consolidacao` (Etapa 3) e fecha o
 * status. Compartilhado entre a rota HTTP (encerramento manual) e o scheduler
 * (encerramento automático por prazo).
 */
export async function encerrarPeriodoManifestacao(projetoId, { manual = false, usuarioEmail = null } = {}) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_KEY não configurada no backend.')

  const { data: faseFinal } = await supabaseAdmin
    .from('proj_fases')
    .select('id, nome')
    .eq('aciona_consolidacao', true)
    .limit(1)
    .maybeSingle()

  const { error } = await supabaseAdmin
    .from('proj_projetos')
    .update({
      fase_id: faseFinal?.id ?? null,
      fase_nome: faseFinal?.nome ?? null,
      manifestacao_status: 'encerrado',
      manifestacao_encerrada_em: new Date().toISOString(),
      manifestacao_encerrada_por: manual ? usuarioEmail : 'sistema (prazo)',
    })
    .eq('id', projetoId)

  if (error) throw error
}
