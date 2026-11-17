/**
 * Configuração dos e-mails automáticos da Gestão de Projetos (tabela proj_email_config, linha id=1),
 * editada na tela Projetos › engrenagem › Configurar E-mails.
 *
 * Os agendadores (projetosTaskScheduler / manifestacaoScheduler) rodam a cada 5 minutos e só
 * executam quando o horário configurado (fuso America/Campo_Grande) já chegou e ainda não rodou
 * hoje. A "reserva" do dia é um update condicional em ultima_exec_* — evita rodar duas vezes
 * quando há mais de um backend ligado (ex.: localhost + Railway).
 */
const FUSO = process.env.PROJ_EMAIL_TZ || 'America/Campo_Grande'

// Valores usados se a tabela ainda não existir (migration não aplicada) = regras antigas do código
export const CONFIG_PADRAO = {
  horario_envio: '08:00',
  tarefa_antes_ativo: true, tarefa_antes_dias: 1,
  tarefa_no_dia_ativo: true,
  tarefa_atraso_ativo: true, tarefa_atraso_dias: 1,
  tarefa_copiar_resp_projeto: false, tarefa_copia_emails: null,
  manif_lembrete_ativo: true, manif_lembrete_dias: [1, 2],
  manif_encerrar_auto: true,
}

// Data (AAAA-MM-DD) e hora (HH:MM) no fuso de Campo Grande
export function agoraLocal() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date()).map(x => [x.type, x.value])
  )
  return { data: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` }
}

export async function lerConfigEmails(supabase) {
  const { data, error } = await supabase.from('proj_email_config').select('*').eq('id', 1).maybeSingle()
  if (error || !data) return { ...CONFIG_PADRAO, _semTabela: true }
  return { ...CONFIG_PADRAO, ...data }
}

/**
 * Decide se a rotina (campo = 'ultima_exec_tarefas' | 'ultima_exec_manif') deve rodar agora.
 * Retorna { config, hoje } se reservou a execução de hoje, ou null.
 */
export async function reservarExecucaoDoDia(supabase, campo) {
  const config = await lerConfigEmails(supabase)
  const { data: hoje, hora } = agoraLocal()
  if (hora < (config.horario_envio || '08:00')) return null
  // sem tabela (migration não aplicada): segue as regras antigas; repetição evitada pelas tabelas de envio (UNIQUE)
  if (config._semTabela) return { config, hoje }
  if (config[campo] === hoje) return null

  // update condicional: só um backend consegue marcar o dia
  const { data: reservado } = await supabase
    .from('proj_email_config')
    .update({ [campo]: hoje })
    .eq('id', 1)
    .or(`${campo}.is.null,${campo}.lt.${hoje}`)
    .select('id')
  if (!reservado?.length) return null
  return { config, hoje }
}

// "a@x.com; b@y.com, c@z.com" → ['a@x.com', 'b@y.com', 'c@z.com']
export function listaEmails(texto) {
  return String(texto || '').split(/[;,\s]+/).map(s => s.trim()).filter(s => /.+@.+\..+/.test(s))
}
