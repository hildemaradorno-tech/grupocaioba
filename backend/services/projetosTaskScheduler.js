/**
 * Notificações de vencimento de tarefas de projetos.
 * Regras configuráveis em Projetos › engrenagem › Configurar E-mails (proj_email_config):
 *   - N dias antes do vencimento (data_fim)      — padrão 1, pode desligar
 *   - No dia do vencimento                        — pode desligar
 *   - N dias após o vencimento (atraso)           — padrão 1, pode desligar
 *   - cópia para responsável(is) do projeto e/ou e-mails fixos
 * Roda uma vez por dia no horário configurado (fuso Campo Grande) — ver projetosEmailConfig.js.
 *
 * Dedup via proj_tarefa_notificacoes (UNIQUE tarefa_id+tipo+data_ref):
 * se a linha já existe, o INSERT conflita e o e-mail não é reenviado.
 * tipo: '1_dia_antes' | 'N_dias_antes' | 'no_dia' | '1_dia_apos' | 'N_dias_apos'
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { enviarEmail } from './emailService.js'
import { reservarExecucaoDoDia, listaEmails, lerConfigEmails, agoraLocal } from './projetosEmailConfig.js'

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

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

// tipo (chave de dedup), título do e-mail, assunto e cor
function descreverAviso(tipo, dias, tarefa) {
  if (tipo === 'antes') return {
    chave: dias === 1 ? '1_dia_antes' : `${dias}_dias_antes`,
    titulo: dias === 1 ? `⚠️ Tarefa vence amanhã (${fmtData(tarefa.data_fim)})` : `⚠️ Tarefa vence em ${dias} dias (${fmtData(tarefa.data_fim)})`,
    assunto: dias === 1 ? `[Projetos] Tarefa vence amanhã: ${tarefa.nome}` : `[Projetos] Tarefa vence em ${dias} dias: ${tarefa.nome}`,
    cor: '#f59e0b',
  }
  if (tipo === 'no_dia') return {
    chave: 'no_dia',
    titulo: `🔔 Tarefa vence hoje (${fmtData(tarefa.data_fim)})`,
    assunto: `[Projetos] Tarefa vence hoje: ${tarefa.nome}`,
    cor: '#3b82f6',
  }
  return {
    chave: dias === 1 ? '1_dia_apos' : `${dias}_dias_apos`,
    titulo: `🔴 Tarefa em atraso — venceu em ${fmtData(tarefa.data_fim)}`,
    assunto: `[Projetos] Tarefa em atraso: ${tarefa.nome}`,
    cor: '#ef4444',
  }
}

function htmlNotificacao({ aviso, tarefa, projeto }) {
  const link = `${FRONTEND_URL}/projetos/detalhe/${tarefa.projeto_id}`
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${aviso.cor};color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">${aviso.titulo}</h2>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="margin:0 0 8px"><strong>Projeto:</strong> ${projeto?.nome || '—'}</p>
        <p style="margin:0 0 8px"><strong>Tarefa:</strong> ${tarefa.nome}</p>
        <p style="margin:0 0 8px"><strong>Responsável:</strong> ${tarefa.responsavel_nome || '—'}</p>
        <p style="margin:0 0 8px"><strong>Data de término:</strong> ${fmtData(tarefa.data_fim)}</p>
        <p style="margin:0 0 8px"><strong>Status atual:</strong> ${tarefa.status_kanban || '—'}</p>
        ${tarefa.etapa ? `<p style="margin:0 0 16px"><strong>Etapa:</strong> ${tarefa.etapa}ª</p>` : ''}
        <a href="${link}" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">
          Acessar o Projeto
        </a>
      </div>
    </div>`
}

// e-mail de usuário pelo nome (correspondência exata), com cache por execução
async function emailPorNome(supabase, nome, cache) {
  if (!nome) return null
  if (cache.has(nome)) return cache.get(nome)
  const { data } = await supabase.from('usuarios').select('email').eq('nome', nome).limit(1)
  const email = data?.[0]?.email || null
  cache.set(nome, email)
  return email
}

export async function verificarTarefas(config, hoje) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  if (!config.tarefa_antes_ativo && !config.tarefa_no_dia_ativo && !config.tarefa_atraso_ativo) return

  // Tarefas não concluídas com data_fim definida
  const { data: tarefas, error } = await supabase
    .from('proj_tarefas')
    .select('id, nome, data_fim, status_kanban, etapa, projeto_id, responsavel_nome, proj_projetos(id, nome, responsavel_nome, responsavel2_nome)')
    .not('status_kanban', 'in', '("concluido","cancelado")')
    .not('data_fim', 'is', null)

  if (error || !tarefas?.length) return

  const copiaFixa = listaEmails(config.tarefa_copia_emails)
  const cacheEmails = new Map()

  for (const t of tarefas) {
    const dias = diasAte(hoje, t.data_fim)
    let aviso = null
    if (config.tarefa_antes_ativo  && dias === Number(config.tarefa_antes_dias))   aviso = descreverAviso('antes', dias, t)
    if (config.tarefa_no_dia_ativo && dias === 0)                                    aviso = descreverAviso('no_dia', 0, t)
    if (config.tarefa_atraso_ativo && dias === -Number(config.tarefa_atraso_dias)) aviso = descreverAviso('apos', -dias, t)
    if (!aviso) continue

    // Dedup: tenta inserir — se conflitar (UNIQUE), já foi enviado
    const { error: dedupError } = await supabase
      .from('proj_tarefa_notificacoes')
      .insert([{ tarefa_id: t.id, tipo: aviso.chave, data_ref: t.data_fim }])
    if (dedupError) continue // conflito = já enviado; outro erro = pula silenciosamente

    const projeto = t.proj_projetos
    const emailResp = await emailPorNome(supabase, t.responsavel_nome, cacheEmails)
    if (!emailResp && t.responsavel_nome) {
      console.warn(`[Projetos] Responsável "${t.responsavel_nome}" não encontrado ou sem e-mail — tarefa "${t.nome}"`)
    }

    const copias = [...copiaFixa]
    if (config.tarefa_copiar_resp_projeto && projeto) {
      for (const nome of [projeto.responsavel_nome, projeto.responsavel2_nome]) {
        const e = await emailPorNome(supabase, nome, cacheEmails)
        if (e) copias.push(e)
      }
    }
    // sem repetir e sem copiar quem já é o destinatário
    const cc = [...new Set(copias.map(e => e.toLowerCase()))].filter(e => e !== (emailResp || '').toLowerCase())

    const to = emailResp || cc.shift()
    if (!to) continue

    await enviarEmail({
      to, cc,
      subject: aviso.assunto,
      html: htmlNotificacao({ aviso, tarefa: t, projeto }),
    }).catch(err =>
      console.error(`[Projetos] Erro ao enviar e-mail para "${to}" (tarefa "${t.nome}"):`, err.message)
    )

    console.log(`[Projetos] Notificação "${aviso.chave}" enviada → ${to}${cc.length ? ` (cc ${cc.length})` : ''} (tarefa: ${t.nome})`)
  }
}

/**
 * Envio manual (engrenagem › Enviar avisos agora): a qualquer momento, um e-mail por responsável
 * com as tarefas EM ATRASO e as que VENCEM HOJE (não concluídas/canceladas). Não usa a trava de
 * "já enviado" dos avisos automáticos — cada clique envia de novo. Cópias seguem Configurar E-mails.
 * simular=true só devolve o resumo (quem vai receber), sem enviar.
 */
export async function enviarAvisosAgora({ simular = false, usuarioEmail = null } = {}) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase não configurado no backend.')
  const config = await lerConfigEmails(supabase)
  const { data: hoje } = agoraLocal()

  const { data: tarefas, error } = await supabase
    .from('proj_tarefas')
    .select('id, nome, data_fim, status_kanban, projeto_id, responsavel_nome, proj_projetos(id, nome, responsavel_nome, responsavel2_nome, ativo)')
    .not('status_kanban', 'in', '("concluido","cancelado")')
    .not('data_fim', 'is', null)
    .lte('data_fim', hoje)
  if (error) throw error

  const lista = (tarefas || []).filter(t => t.proj_projetos && t.proj_projetos.ativo !== false)
  const cache = new Map()
  const copiaFixa = listaEmails(config.tarefa_copia_emails)

  // agrupa por responsável
  const porResp = new Map()
  const semEmail = new Map() // nome → qtd de tarefas
  for (const t of lista) {
    const nome = t.responsavel_nome || '(sem responsável)'
    const email = await emailPorNome(supabase, t.responsavel_nome, cache)
    if (!email) { semEmail.set(nome, (semEmail.get(nome) || 0) + 1); continue }
    if (!porResp.has(email)) porResp.set(email, { email, nome, atrasadas: [], hoje: [], copias: new Set(copiaFixa.map(e => e.toLowerCase())) })
    const g = porResp.get(email)
    ;(t.data_fim < hoje ? g.atrasadas : g.hoje).push(t)
    if (config.tarefa_copiar_resp_projeto) {
      for (const n of [t.proj_projetos.responsavel_nome, t.proj_projetos.responsavel2_nome]) {
        const e = await emailPorNome(supabase, n, cache)
        if (e) g.copias.add(e.toLowerCase())
      }
    }
  }

  const grupos = [...porResp.values()].sort((a, b) => a.nome.localeCompare(b.nome))
  const resumo = {
    data: hoje,
    total_atrasadas: grupos.reduce((s, g) => s + g.atrasadas.length, 0),
    total_hoje: grupos.reduce((s, g) => s + g.hoje.length, 0),
    destinatarios: grupos.map(g => ({ nome: g.nome, email: g.email, atrasadas: g.atrasadas.length, hoje: g.hoje.length })),
    sem_email: [...semEmail.entries()].map(([nome, qtd]) => ({ nome, tarefas: qtd })),
  }
  if (simular) return resumo

  const linhaTarefa = (t, cor) => {
    const atraso = diasAte(t.data_fim, hoje)
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">${t.proj_projetos?.nome || '—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0"><a href="${FRONTEND_URL}/projetos/detalhe/${t.projeto_id}" style="color:#1e293b">${t.nome}</a></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap">${fmtData(t.data_fim)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;white-space:nowrap;color:${cor};font-weight:600">${atraso > 0 ? `${atraso} dia(s) de atraso` : 'vence hoje'}</td>
    </tr>`
  }
  const tabela = (titulo, cor, itens) => !itens.length ? '' : `
    <h3 style="margin:20px 0 8px;font-size:15px;color:${cor}">${titulo} (${itens.length})</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <tr style="background:#f1f5f9;text-align:left"><th style="padding:6px 8px">Projeto</th><th style="padding:6px 8px">Tarefa</th><th style="padding:6px 8px">Término</th><th style="padding:6px 8px">Situação</th></tr>
      ${itens.sort((a, b) => a.data_fim.localeCompare(b.data_fim)).map(t => linhaTarefa(t, cor)).join('')}
    </table>`

  let enviados = 0
  const erros = []
  for (const g of grupos) {
    const cc = [...g.copias].filter(e => e !== g.email.toLowerCase())
    const partes = []
    if (g.atrasadas.length) partes.push(`${g.atrasadas.length} em atraso`)
    if (g.hoje.length) partes.push(`${g.hoje.length} vence(m) hoje`)
    try {
      await enviarEmail({
        to: g.email, cc,
        subject: `[Projetos] Suas tarefas: ${partes.join(' e ')}`,
        html: `
          <div style="font-family:sans-serif;max-width:700px;margin:0 auto;color:#1e293b">
            <div style="background:#1e293b;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
              <h2 style="margin:0;font-size:18px">Tarefas em atraso e vencendo hoje (${fmtData(hoje)})</h2>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px 24px;border-radius:0 0 8px 8px">
              <p style="margin:0">Olá, <strong>${g.nome}</strong>. Estas são as suas tarefas que precisam de atenção:</p>
              ${tabela('🔴 Em atraso', '#dc2626', g.atrasadas)}
              ${tabela('🔔 Vencem hoje', '#2563eb', g.hoje)}
              <p style="margin:20px 0 0"><a href="${FRONTEND_URL}/projetos/lista-tarefas" style="display:inline-block;background:#1e293b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Abrir a Lista de Tarefas</a></p>
            </div>
          </div>`,
      })
      enviados++
    } catch (err) {
      erros.push({ email: g.email, erro: err.message })
      console.error(`[Projetos] Envio manual: erro para "${g.email}":`, err.message)
    }
  }
  console.log(`[Projetos] Envio manual de avisos por ${usuarioEmail || '?'}: ${enviados} e-mail(s), ${erros.length} erro(s).`)
  return { ...resumo, enviados, erros }
}

export function iniciarSchedulerProjetosTarefas() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.warn('[Projetos] SUPABASE não configurado — scheduler de tarefas desativado.')
    return
  }
  // a cada 5 min verifica se chegou o horário configurado (uma execução por dia)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const r = await reservarExecucaoDoDia(supabase, 'ultima_exec_tarefas')
      if (r) await verificarTarefas(r.config, r.hoje)
    } catch (err) {
      console.error('[Projetos] Erro no scheduler de tarefas:', err.message)
    }
  })
  console.log('[Projetos] Scheduler de notificações de tarefas iniciado (horário em Configurar E-mails, fuso Campo Grande).')
}
