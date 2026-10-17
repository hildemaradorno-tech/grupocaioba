/**
 * auditoriaAgendamento.js
 *
 * Geração automática de auditorias (Auditoria O.S. Aberta) a partir de aud_agendamentos.
 * Roda a cada 5 minutos (node-cron). Para cada agendamento ativo cujo dia da semana e
 * horário (fuso America/Campo_Grande) já chegaram e que ainda não rodou hoje:
 *   1. "reserva" a execução do dia (update condicional → evita duplicar se houver
 *      mais de um backend rodando, ex.: localhost + Railway);
 *   2. NÃO gera se a empresa já tiver auditoria em Conferência ou A Responder;
 *   3. importa as OS — Trucks: SharePoint ROF001_OSABERTA; Motos: API MicroWork;
 *   4. grava a auditoria (Modo Conferência) com o responsável do agendamento.
 * Desligar (ex.: só no localhost): AUD_AGENDAMENTO_DESATIVADO=true
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { getOsAbertasGeral } from './sharepointGarantias.js'
import { buscarOsAbertasMicrowork } from './microworkIntegracao.js'

const FUSO = process.env.AUD_AGENDAMENTO_TZ || 'America/Campo_Grande'
const POR_SISTEMA = 'Sistema (agendamento)'
const DIAS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

// Data (AAAA-MM-DD), hora (HH:MM) e dia da semana no fuso local configurado
function agoraLocal() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short',
    }).formatToParts(new Date()).map(p => [p.type, p.value])
  )
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}`, dia: DIAS[partes.weekday] }
}

const ehMotos = (emp) => (emp?.agrupamento_nome || '').trim().toLowerCase() === 'caiobá motos'

async function importarOs(emp) {
  if (ehMotos(emp)) return buscarOsAbertasMicrowork(emp.codigo_empresa)
  const { rows } = await getOsAbertasGeral()
  const n1 = (emp.nome_empresa || '').toLowerCase(), n2 = (emp.nome_empresa_sistema || '').toLowerCase()
  return rows.filter(r => { const n = (r.empresa_nome || '').toLowerCase(); return n === n1 || n === n2 })
}

async function registrar(sb, ag, resultado, mensagem) {
  await sb.from('aud_agendamentos')
    .update({ ultimo_resultado: resultado, ultima_mensagem: mensagem, ultima_execucao_em: new Date().toISOString() })
    .eq('id', ag.id)
}

async function executarUm(sb, ag, hoje) {
  // 1. Reserva a execução de hoje (só um backend consegue)
  const { data: reservado } = await sb.from('aud_agendamentos')
    .update({ ultima_execucao_data: hoje, ultima_execucao_em: new Date().toISOString() })
    .eq('id', ag.id)
    .or(`ultima_execucao_data.is.null,ultima_execucao_data.neq.${hoje}`)
    .select('id')
  if (!reservado?.length) return

  try {
    const { data: emp } = await sb.from('dim_empresas').select('*').eq('id', ag.empresa_id).maybeSingle()
    if (!emp) { await registrar(sb, ag, 'erro', 'Empresa não encontrada.'); return }
    const nomeEmpresa = emp.nome_empresa_sistema || emp.nome_empresa

    // 2. Não gera se já houver auditoria em aberto da empresa
    const { data: abertas } = await sb.from('aud_auditorias').select('id, data_auditoria, status')
      .eq('empresa_id', emp.id).in('status', ['conferencia', 'a_responder'])
    if (abertas?.length) {
      await registrar(sb, ag, 'pulada', `Não gerada: auditoria de ${abertas[0].data_auditoria} ainda em ${abertas[0].status === 'conferencia' ? 'Conferência' : 'A Responder'}.`)
      return
    }

    // 3. Importa as OS da fonte do agrupamento
    const linhasFonte = await importarOs(emp)
    if (!linhasFonte.length) { await registrar(sb, ag, 'erro', `Nenhuma OS em aberto encontrada (${ehMotos(emp) ? 'MicroWork' : 'SharePoint'}).`); return }

    // 4. Grava a auditoria + OS (Modo Conferência)
    const { data: aud, error: e1 } = await sb.from('aud_auditorias').insert([{
      data_auditoria: hoje, importado_por: POR_SISTEMA, total_os: linhasFonte.length,
      empresa_id: emp.id, empresa_nome: nomeEmpresa,
    }]).select().single()
    if (e1) throw e1

    const linhas = linhasFonte.map(sp => ({
      auditoria_id: aud.id, data_auditoria: hoje,
      os_numero: sp.os_numero || '', empresa_nome: sp.empresa_nome || '',
      tipo_os_descricao: sp.tipo_os_descricao || sp.tipo_os_sigla || '', tipo_os_sigla: sp.tipo_os_sigla || '',
      consultor_nome: sp.consultor_nome || '', proprietario_veiculo: sp.proprietario_veiculo || '',
      veiculo_modelo: sp.modelo_veiculo || '', veiculo_placa: sp.veiculo_placa || '', veiculo_chassi: sp.veiculo_chassi || '',
      data_criacao: sp.data_criacao || null, total: sp.total || 0, produto: sp.produto || 0, servico: sp.servico || 0,
      responsavel_id: ag.responsavel_id || null, responsavel_nome: ag.responsavel_nome || null,
      na_oficina: null,
    }))
    const { error: e2 } = await sb.from('aud_auditoria_os').insert(linhas)
    if (e2) { await sb.from('aud_auditorias').delete().eq('id', aud.id); throw e2 } // não deixa auditoria vazia

    await registrar(sb, ag, 'gerada', `Auditoria gerada com ${linhas.length} OS.`)
    console.log(`[Auditoria Agendada] ${nomeEmpresa}: auditoria gerada com ${linhas.length} OS.`)
  } catch (err) {
    await registrar(sb, ag, 'erro', err.message || String(err))
    console.error('[Auditoria Agendada] Erro:', err.message)
  }
}

export async function executarAgendamentosAuditoria() {
  const sb = getSupabaseAdmin()
  if (!sb) return
  const { data: hoje, hora, dia } = agoraLocal()
  const { data: ags, error } = await sb.from('aud_agendamentos').select('*').eq('ativo', true)
  if (error) { console.error('[Auditoria Agendada] Erro ao ler agendamentos:', error.message); return }
  for (const ag of ags || []) {
    const horaAg = String(ag.hora || '').slice(0, 5)
    if (!(ag.dias_semana || []).includes(dia)) continue
    if (horaAg > hora) continue
    if (ag.ultima_execucao_data === hoje) continue
    await executarUm(sb, ag, hoje)
  }
}

export function iniciarSchedulerAuditoria() {
  if (process.env.AUD_AGENDAMENTO_DESATIVADO === 'true') {
    console.log('[Auditoria Agendada] Desativado por AUD_AGENDAMENTO_DESATIVADO=true.')
    return
  }
  if (!getSupabaseAdmin()) {
    console.warn('[Auditoria Agendada] SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados — agendamento desativado.')
    return
  }
  cron.schedule('*/5 * * * *', () => {
    executarAgendamentosAuditoria().catch(err => console.error('[Auditoria Agendada] Erro no tick:', err.message))
  })
  console.log(`[Auditoria Agendada] Scheduler iniciado (a cada 5 min, fuso ${FUSO}).`)
}
