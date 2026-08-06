/**
 * Agendador da sincronização de KPI: a cada minuto verifica se o horário
 * configurado em kpi_sync_horarios_semana (recorrente por dia da semana) ou
 * kpi_sync_datas_especificas (datas avulsas) bate com "agora" e, se sim,
 * dispara executarSincronizacao('AGENDADO'). O horário é lido do Supabase a
 * cada tick — mudar a configuração pela tela tem efeito imediato, sem
 * precisar reiniciar o backend.
 */
import cron from 'node-cron'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { executarSincronizacao, sincronizacaoEmAndamento } from './kpiSyncService.js'

// Evita disparar duas vezes no mesmo minuto (ex.: tick demorar e o cron
// reentrar) — guarda a última chave "AAAA-MM-DD HH:MM" já processada.
let ultimoMinutoProcessado = null

function horaAgoraStr(d) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
}

function diaSemanaAtual(d) {
  // JS: 0=Domingo..6=Sábado → convenção do módulo: 1=Segunda..7=Domingo
  const js = d.getDay()
  return js === 0 ? 7 : js
}

function dataAtualIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
