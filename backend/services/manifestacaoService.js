import { getSupabaseAdmin } from './supabaseAdmin.js'
import { enviarEmail } from './emailService.js'

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

  // Notifica participantes sobre encerramento
  try {
    const [{ data: projeto }, { data: convidados }] = await Promise.all([
      supabaseAdmin.from('proj_projetos').select('id, nome').eq('id', projetoId).single(),
      supabaseAdmin.from('proj_manifestacao_convidados').select('usuarios(nome, email)').eq('projeto_id', projetoId),
    ])
    const link = 'https://portalgestaocaioba.pages.dev/projetos/manifestacoes'
    for (const c of (convidados || [])) {
      const u = c.usuarios
      if (!u?.email) continue
      await enviarEmail({
        to: u.email,
        subject: `Período de Manifestação encerrado — ${projeto?.nome || ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
            <h2 style="color:#1e40af;margin-bottom:4px">Manifestação de Projeto</h2>
            <p>Olá, <strong>${u.nome || u.email}</strong>.</p>
            <p>O <strong>Período de Manifestação</strong> do projeto abaixo foi encerrado automaticamente por prazo:</p>
            <p style="font-size:17px;font-weight:bold;background:#f1f5f9;padding:10px 14px;border-radius:6px;border-left:4px solid #3b82f6">${projeto?.nome || ''}</p>
            <p>Acesse o painel para visualizar os resultados consolidados:</p>
            <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Acessar Manifestações</a></p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="font-size:11px;color:#94a3b8">Portal de Gestão — notificação automática. Não responda este e-mail.</p>
          </div>
        `,
      }).catch(err => console.warn(`[manifestacao] Falha ao notificar encerramento para ${u.email}:`, err.message))
    }
  } catch (err) {
    console.warn('[manifestacao] Falha ao enviar notificações de encerramento:', err.message)
  }
}
