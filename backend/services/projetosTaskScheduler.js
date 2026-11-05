/**
 * Notificações de vencimento de tarefas de projetos.
 * Roda diariamente às 08:00 e envia e-mail ao responsável em 3 momentos:
 *   - 1 dia antes do vencimento (data_fim)
 *   - No dia do vencimento
 *   - 1 dia após o vencimento (atraso)
 *
 * Dedup via proj_tarefa_notificacoes (UNIQUE tarefa_id+tipo+data_ref):
 * se a linha já existe, o INSERT conflita e o e-mail não é reenviado.
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { enviarEmail } from './emailService.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diasAte(hojeStr, dataFimStr) {
  const h = new Date(hojeStr + 'T00:00:00')
  const f = new Date(dataFimStr + 'T00:00:00')
  return Math.round((f - h) / 86400000)
}

function fmtData(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function htmlNotificacao({ tipo, tarefa, projeto }) {
  const titulosPorTipo = {
    '1_dia_antes': `⚠️ Tarefa vence amanhã (${fmtData(tarefa.data_fim)})`,
    'no_dia':      `🔔 Tarefa vence hoje (${fmtData(tarefa.data_fim)})`,
    '1_dia_apos':  `🔴 Tarefa em atraso — venceu em ${fmtData(tarefa.data_fim)}`,
  }
  const corPorTipo = {
    '1_dia_antes': '#f59e0b',
    'no_dia':      '#3b82f6',
    '1_dia_apos':  '#ef4444',
  }
  const titulo  = titulosPorTipo[tipo]
  const cor     = corPorTipo[tipo]
  const link    = `${FRONTEND_URL}/projetos/detalhe/${tarefa.projeto_id}`

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${cor};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">${titulo}</h2>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="margin:0 0 8px"><strong>Projeto:</strong> ${projeto?.nome || '—'}</p>
        <p style="margin:0 0 8px"><strong>Tarefa:</strong> ${tarefa.nome}</p>
        <p style="margin:0 0 8px"><strong>Data de término:</strong> ${fmtData(tarefa.data_fim)}</p>
        <p style="margin:0 0 8px"><strong>Status atual:</strong> ${tarefa.status_kanban || '—'}</p>
        ${tarefa.etapa ? `<p style="margin:0 0 16px"><strong>Etapa:</strong> ${tarefa.etapa}ª</p>` : ''}
        <a href="${link}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          Acessar o Projeto
        </a>
      </div>
    </div>`
}

async function verificarTarefas() {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const hoje = hojeIso()

  // Busca tarefas não concluídas com data_fim definida e próximas ao vencimento
  const { data: tarefas, error } = await supabase
    .from('proj_tarefas')
    .select('id, nome, data_fim, status_kanban, etapa, projeto_id, responsavel_nome, proj_projetos(id, nome)')
    .not('status_kanban', 'in', '("concluido","cancelado")')
    .not('data_fim', 'is', null)

  if (error || !tarefas?.length) return

  for (const t of tarefas) {
    const dias = diasAte(hoje, t.data_fim)
    let tipo = null
    if (dias === 1)  tipo = '1_dia_antes'
    if (dias === 0)  tipo = 'no_dia'
    if (dias === -1) tipo = '1_dia_apos'
    if (!tipo) continue

    // Dedup: tenta inserir — se conflitar (UNIQUE), já foi enviado
    const { error: dedupError } = await supabase
      .from('proj_tarefa_notificacoes')
      .insert([{ tarefa_id: t.id, tipo, data_ref: t.data_fim }])
    if (dedupError) continue // conflito = já enviado; outro erro = pula silenciosamente

    if (!t.responsavel_nome) continue

    // Busca e-mail do responsável pelo nome (correspondência exata)
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('email')
      .eq('nome', t.responsavel_nome)
      .limit(1)
    const email = usuarios?.[0]?.email
    if (!email) {
      console.warn(`[Projetos] Responsável "${t.responsavel_nome}" não encontrado ou sem e-mail — tarefa "${t.nome}"`)
      continue
    }

    const projeto = t.proj_projetos
    const subjectsPorTipo = {
      '1_dia_antes': `[Projetos] Tarefa vence amanhã: ${t.nome}`,
      'no_dia':      `[Projetos] Tarefa vence hoje: ${t.nome}`,
      '1_dia_apos':  `[Projetos] Tarefa em atraso: ${t.nome}`,
    }

    await enviarEmail({
      to: email,
      subject: subjectsPorTipo[tipo],
      html: htmlNotificacao({ tipo, tarefa: t, projeto }),
    }).catch(err =>
      console.error(`[Projetos] Erro ao enviar e-mail para "${email}" (tarefa "${t.nome}"):`, err.message)
    )

    console.log(`[Projetos] Notificação "${tipo}" enviada → ${email} (tarefa: ${t.nome})`)
  }
}

export function iniciarSchedulerProjetosTarefas() {
  if (!getSupabaseAdmin()) {
    console.warn('[Projetos] SUPABASE não configurado — scheduler de tarefas desativado.')
    return
  }
  cron.schedule('0 8 * * *', () => {
    verificarTarefas().catch(err =>
      console.error('[Projetos] Erro no scheduler de tarefas:', err.message)
    )
  })
  console.log('[Projetos] Scheduler de notificações de tarefas iniciado (diário às 08:00).')
}
