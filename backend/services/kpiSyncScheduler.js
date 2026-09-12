/**
 * Agendador da sincronização de KPI: a cada minuto verifica se o horário
 * configurado em kpi_sync_horarios_semana (recorrente por dia da semana) ou
 * kpi_sync_datas_especificas (datas avulsas) bate com "agora" e, se sim,
 * dispara executarSincronizacao('AGENDADO'). O horário é lido do Supabase a
 * cada tick — mudar a configuração pela tela tem efeito imediato, sem
 * precisar reiniciar o backend.
 *
 * Os horários configurados na tela são sempre horário de Brasília — por isso
 * "agora" é calculado explicitamente no fuso America/Sao_Paulo via Intl,
 * independente do fuso do servidor (Railway roda em UTC por padrão; sem essa
 * conversão, "12:00" configurado disparava às 12:00 UTC = 09:00 em Brasília).
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { executarSincronizacao, sincronizacaoEmAndamento } from './kpiSyncService.js'

const FUSO_BRASILIA = 'America/Sao_Paulo'

// Evita disparar duas vezes no mesmo minuto (ex.: tick demorar e o cron
// reentrar) — guarda a última chave "AAAA-MM-DD HH:MM" já processada.
let ultimoMinutoProcessado = null

function partesBrasilia(d) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_BRASILIA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(d)
  return Object.fromEntries(partes.map(p => [p.type, p.value]))
}

function horaAgoraStr(d) {
  const p = partesBrasilia(d)
  return `${p.hour}:${p.minute}:00`
}

function diaSemanaAtual(d) {
  // Convenção do módulo: 1=Segunda..7=Domingo
  const mapa = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return mapa[partesBrasilia(d).weekday]
}

function dataAtualIso(d) {
  const p = partesBrasilia(d)
  return `${p.year}-${p.month}-${p.day}`
}

async function verificarEDisparar() {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return
  const agora = new Date()
  const minutoChave = `${dataAtualIso(agora)} ${horaAgoraStr(agora).slice(0, 5)}`
  if (minutoChave === ultimoMinutoProcessado) return
  if (sincronizacaoEmAndamento()) return

  const { data: config } = await supabaseAdmin.from('kpi_sync_config').select('ativo').eq('id', 1).maybeSingle()
  if (!config?.ativo) return

  const horaAtual = horaAgoraStr(agora)

  const { data: horarioSemana } = await supabaseAdmin
    .from('kpi_sync_horarios_semana')
    .select('id')
    .eq('ativo', true)
    .eq('dia_semana', diaSemanaAtual(agora))
    .eq('hora', horaAtual)
    .maybeSingle()

  const { data: dataEspecifica } = await supabaseAdmin
    .from('kpi_sync_datas_especificas')
    .select('id')
    .eq('ativo', true)
    .eq('data', dataAtualIso(agora))
    .eq('hora', horaAtual)
    .maybeSingle()

  if (!horarioSemana && !dataEspecifica) return

  ultimoMinutoProcessado = minutoChave
  console.log(`[KPI Sync] Disparando sincronização agendada (${minutoChave})`)
  try {
    const resultado = await executarSincronizacao('AGENDADO')
    console.log(`[KPI Sync] Sincronização agendada concluída: ${resultado.status}`)
  } catch (err) {
    console.error('[KPI Sync] Erro na sincronização agendada:', err.message)
  }
}

export function iniciarSchedulerKpi() {
  if (!getSupabaseAdmin()) {
    console.warn('[KPI Sync] SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados — agendamento desativado.')
    return
  }
  cron.schedule('* * * * *', () => { verificarEDisparar().catch(err => console.error('[KPI Sync] Erro no tick do scheduler:', err.message)) })
  console.log('[KPI Sync] Scheduler iniciado (verificação a cada minuto).')
}
