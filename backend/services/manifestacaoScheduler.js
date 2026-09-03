/**
 * Agendador do Período de Manifestação (Etapa 2): uma vez por dia (08:00),
 * para cada projeto com manifestacao_status='aberto':
 *   - se o prazo já passou, encerra o período automaticamente;
 *   - se faltam 1 ou 2 dias, envia lembrete por e-mail aos convidados que
 *     ainda não manifestaram, evitando reenvio no mesmo dia via
 *     proj_manifestacao_lembretes (UNIQUE projeto_id+usuario_id+dias_antes).
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { encerrarPeriodoManifestacao } from './manifestacaoService.js'
import { enviarEmail } from './emailService.js'

function dataAtualIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diasEntre(hojeIso, prazoIso) {
  const hoje = new Date(hojeIso + 'T00:00:00')
  const prazo = new Date(prazoIso + 'T00:00:00')
  return Math.round((prazo - hoje) / 86400000)
}

async function enviarLembretes(supabaseAdmin, projeto, diasAntes) {
  const { data: convidados } = await supabaseAdmin
    .from('proj_manifestacao_convidados')
    .select('usuario_id, usuarios(id, nome, email)')
    .eq('projeto_id', projeto.id)
  if (!convidados?.length) return

  const { data: jaManifestaram } = await supabaseAdmin
    .from('proj_manifestacoes')
    .select('usuario_email')
    .eq('projeto_id', projeto.id)
  const emailsQueJaManifestaram = new Set((jaManifestaram || []).map(m => m.usuario_email))

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'

  for (const c of convidados) {
    const usuario = c.usuarios
    if (!usuario?.email || emailsQueJaManifestaram.has(usuario.email)) continue

    const { error: dedupError } = await supabaseAdmin
      .from('proj_manifestacao_lembretes')
      .insert([{ projeto_id: projeto.id, usuario_id: usuario.id, dias_antes: diasAntes }])
    if (dedupError) continue // já foi enviado hoje (conflito de UNIQUE) ou outro erro — não tenta de novo

    await enviarEmail({
      to: usuario.email,
      subject: `Lembrete: Período de Manifestação do projeto "${projeto.nome}" encerra em ${diasAntes} dia(s)`,
      html: `<p>Olá, ${usuario.nome || ''}.</p>
        <p>O Período de Manifestação do projeto <strong>${projeto.nome}</strong> encerra em <strong>${diasAntes} dia(s)</strong> (prazo: ${projeto.manifestacao_prazo}).</p>
        <p>Acesse o projeto para registrar sua manifestação ou dar seu "De Acordo":<br/>
        <a href="${frontendUrl}/projetos/${projeto.id}">${frontendUrl}/projetos/${projeto.id}</a></p>`,
    }).catch(err => console.error('[Manifestação] Erro ao enviar lembrete:', err.message))
  }
}

async function verificarProjetos() {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return

  const { data: projetos, error } = await supabaseAdmin
    .from('proj_projetos')
    .select('id, nome, manifestacao_prazo, manifestacao_status')
    .eq('manifestacao_status', 'aberto')
    .not('manifestacao_prazo', 'is', null)
  if (error || !projetos?.length) return

  const hojeIso = dataAtualIso(new Date())

  for (const projeto of projetos) {
    const dias = diasEntre(hojeIso, projeto.manifestacao_prazo)
    if (dias < 0) {
      try {
        await encerrarPeriodoManifestacao(projeto.id, { manual: false })
        console.log(`[Manifestação] Período encerrado automaticamente por prazo — projeto "${projeto.nome}"`)
      } catch (err) {
        console.error(`[Manifestação] Erro ao encerrar automaticamente o projeto "${projeto.nome}":`, err.message)
      }
    } else if (dias === 1 || dias === 2) {
      await enviarLembretes(supabaseAdmin, projeto, dias)
    }
  }
}

export function iniciarSchedulerManifestacao() {
  if (!getSupabaseAdmin()) {
    console.warn('[Manifestação] SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados — agendamento desativado.')
    return
  }
  cron.schedule('0 8 * * *', () => {
    verificarProjetos().catch(err => console.error('[Manifestação] Erro no tick do scheduler:', err.message))
  })
  console.log('[Manifestação] Scheduler iniciado (verificação diária às 08:00).')
}
