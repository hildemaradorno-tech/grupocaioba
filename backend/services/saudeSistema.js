// Governança › Saúde do Sistema (19/11/2026).
// Junta num só lugar o resumo de todos os monitores (Railway, Supabase, SharePoint, Cloudflare) e dois blocos
// próprios: Rotinas automáticas (schedulers do backend e sincronizações) e Integrações (e-mail, MicroWork, IA,
// Power BI, planilha da Matriz de KPIs). Cada bloco devolve "controles" no mesmo formato do painel "Precisa de atenção".
import nodemailer from 'nodemailer'
import { gmailConfigurado, tokenAcessoGmail } from './emailService.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { lerEstado, INICIADO_EM } from './monitorRotinas.js'
import { agoraLocal } from './projetosEmailConfig.js'
import { railwayConfigurado } from './railwayMonitor.js'
import { calcularControles as controlesRailway } from './railwayAlertas.js'
import { calcularControles as controlesSupabase } from './supabaseMonitor.js'
import { getVisao as visaoSharepoint, calcularControles as controlesSharepoint } from './sharepointMonitor.js'
import { getVisao as visaoCloudflare, calcularControles as controlesCloudflare } from './cloudflareMonitor.js'
import { getRpaLog } from './sharepointRpaLog.js'

const ORDEM = { critico: 0, atencao: 1, info: 2, ok: 3 }
// Destino de cada alerta das abas Rotinas e Integrações: aba e linha/card da tela (21/11/2026)
const DESTINO_INT = { 'int-email': 'email', 'int-mw': 'microwork', 'int-ia': 'ia', 'int-pbi': 'powerbi', 'int-kpi-planilha': 'kpi' }
function destinoSaude(id) {
  if (DESTINO_INT[id]) return { aba: 'integracoes', alvo: `integ-${DESTINO_INT[id]}` }
  if (id.startsWith('rot-aud')) return { aba: 'rotinas', alvo: 'rotina-auditoria' }
  if (id.startsWith('rot-kpi')) return { aba: 'rotinas', alvo: 'rotina-kpi-sync' }
  const mapa = { 'rot-prod': 'produtividade', 'rot-aquec': 'aquecimento-kpi', 'rot-manifestacao': 'manifestacao', 'rot-projetos-tarefas': 'projetos-tarefas' }
  if (mapa[id]) return { aba: 'rotinas', alvo: `rotina-${mapa[id]}` }
  return { aba: id.startsWith('int-') ? 'integracoes' : 'rotinas', alvo: null }
}
const ordenar = (c) => {
  for (const x of c) if (!x.destino) x.destino = destinoSaude(x.id)
  return c.sort((a, b) => ORDEM[a.nivel] - ORDEM[b.nivel])
}
const resumir = (c) => Object.fromEntries(['critico', 'atencao', 'info', 'ok'].map(n => [n, c.filter(x => x.nivel === n).length]))
const emProducao = () => !!(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID)
const minDesde = (iso) => iso ? (Date.now() - Date.parse(iso)) / 60000 : Infinity
const dataHoraBR = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Campo_Grande', dateStyle: 'short', timeStyle: 'short' }) : '—'

// ── Rotinas automáticas ───────────────────────────────────────────────────
export async function getRotinas() {
  const sb = getSupabaseAdmin()
  const mem = lerEstado()
  const { data: hoje, hora } = agoraLocal()
  const minutosNoAr = minDesde(INICIADO_EM)
  const rotinas = []
  const c = []

  // Batida dos schedulers (rodam a cada 5 min): sem batida há mais de 15 min = scheduler parado
  const batida = (id, nome) => {
    const b = mem[id]?.ultima_batida
    if (minutosNoAr < 10) return { nivel: 'info', txt: 'backend acabou de reiniciar' }
    if (!b) return { nivel: 'critico', txt: 'scheduler não está rodando' }
    return minDesde(b) > 15 ? { nivel: 'critico', txt: `parado desde ${dataHoraBR(b)}` } : { nivel: 'ok', txt: `ativo (última verificação ${dataHoraBR(b)})` }
  }

  // 1) Auditoria O.S. agendada (aud_agendamentos)
  {
    const desligada = process.env.AUD_AGENDAMENTO_DESATIVADO === 'true'
    const bt = desligada ? { nivel: 'info', txt: 'desligada neste servidor (AUD_AGENDAMENTO_DESATIVADO)' } : batida('auditoria')
    let ags = []
    if (sb) {
      const { data } = await sb.from('aud_agendamentos').select('id, dias_semana, hora, responsavel_nome, ativo, ultima_execucao_data, ultima_execucao_em, ultimo_resultado, ultima_mensagem').eq('ativo', true)
      ags = data || []
    }
    const diaSemana = new Date(`${hoje}T12:00:00`).getDay()
    const itens = ags.map(a => {
      const devia = (a.dias_semana || []).includes(diaSemana) && String(a.hora || '').slice(0, 5) <= hora
      const atrasada = devia && a.ultima_execucao_data !== hoje && !desligada
      const nivel = a.ultimo_resultado === 'erro' ? 'atencao' : atrasada ? 'atencao' : 'ok'
      return { responsavel: a.responsavel_nome, hora: String(a.hora || '').slice(0, 5), ultima: a.ultima_execucao_em, resultado: a.ultimo_resultado, mensagem: a.ultima_mensagem, atrasada, nivel }
    })
    const ruins = itens.filter(i => i.nivel !== 'ok')
    rotinas.push({ id: 'auditoria', nome: 'Auditoria O.S. agendada', onde: 'Auditoria O.S. Aberta › Agendamentos', frequencia: 'a cada 5 min verifica os agendamentos do dia',
      scheduler: bt, itens, ultima_execucao: itens.map(i => i.ultima).filter(Boolean).sort().pop() || null,
      nivel: bt.nivel === 'critico' ? 'critico' : ruins.length ? 'atencao' : bt.nivel === 'info' ? 'info' : 'ok' })
    if (bt.nivel === 'critico') c.push({ id: 'rot-auditoria', grupo: 'Rotinas', nivel: 'critico', titulo: `Auditoria agendada: ${bt.txt}`, detalhe: 'As auditorias automáticas não estão sendo geradas.' })
    for (const r of ruins) c.push({ id: `rot-aud-${r.responsavel}-${r.hora}`, grupo: 'Rotinas', nivel: 'atencao',
      titulo: `Auditoria agendada (${r.responsavel || '—'}, ${r.hora}): ${r.atrasada ? 'não rodou hoje' : 'última execução com erro'}`, detalhe: r.mensagem || null })
  }

  // 2) e 3) E-mails da Gestão de Projetos (proj_email_config)
  let cfg = null
  if (sb) { const { data } = await sb.from('proj_email_config').select('*').eq('id', 1).maybeSingle(); cfg = data }
  const horario = String(cfg?.horario_envio || '08:00').slice(0, 5)
  for (const [id, nome, campo, ativo, onde] of [
    ['manifestacao', 'Avisos do Período de Manifestação', 'ultima_exec_manif', !!(cfg?.manif_lembrete_ativo || cfg?.manif_encerrar_auto), 'Gestão de Projetos › Configurar E-mails'],
    ['projetos-tarefas', 'Avisos de tarefas de Projetos', 'ultima_exec_tarefas', !!(cfg?.tarefa_antes_ativo || cfg?.tarefa_no_dia_ativo || cfg?.tarefa_atraso_ativo), 'Gestão de Projetos › Configurar E-mails'],
  ]) {
    const bt = batida(id)
    const m = mem[id]
    const ultimaData = cfg?.[campo] || null
    const atrasada = ativo && hora >= horario && ultimaData !== hoje
    let nivel = !ativo ? 'info' : bt.nivel === 'critico' ? 'critico' : (m?.ultimo_ok === false) ? 'atencao' : atrasada ? 'atencao' : bt.nivel
    rotinas.push({ id, nome, onde, frequencia: `1 vez por dia às ${horario}`, scheduler: bt, ativo,
      ultima_execucao: m?.ultima_execucao || (ultimaData ? `${ultimaData}T${horario}:00-04:00` : null), ultimo_ok: m?.ultimo_ok ?? null, mensagem: m?.ultima_mensagem || null, nivel })
    if (!ativo) continue
    if (bt.nivel === 'critico') c.push({ id: `rot-${id}`, grupo: 'Rotinas', nivel: 'critico', titulo: `${nome}: ${bt.txt}` })
    else if (m?.ultimo_ok === false) c.push({ id: `rot-${id}`, grupo: 'Rotinas', nivel: 'atencao', titulo: `${nome}: última execução com erro`, detalhe: m.ultima_mensagem })
    else if (atrasada) c.push({ id: `rot-${id}`, grupo: 'Rotinas', nivel: 'atencao', titulo: `${nome}: não rodou hoje (horário ${horario})` })
  }

  // 4) Atualização da Matriz de KPIs (kpi_sync_execucoes)
  if (sb) {
    const { data } = await sb.from('kpi_sync_execucoes').select('iniciado_em, finalizado_em, status, disparado_por, detalhes').order('iniciado_em', { ascending: false }).limit(10)
    const ult = (data || [])[0]
    const travadas = (data || []).filter(x => x.status === 'EXECUTANDO' && minDesde(x.iniciado_em) > 120)
    const falhas = []
    if (ult?.detalhes) {
      const d = typeof ult.detalhes === 'string' ? JSON.parse(ult.detalhes) : ult.detalhes
      for (const [parte, v] of Object.entries(d || {})) {
        const lista = Array.isArray(v) ? v : [v]
        const erros = [...new Set(lista.filter(x => x && x.ok === false).map(x => x.erro).filter(Boolean))]
        if (erros.length) falhas.push({ parte, qtd: lista.filter(x => x && x.ok === false).length, erros })
      }
    }
    const nivel = !ult ? 'info' : ult.status === 'ERRO' ? 'critico' : ult.status === 'EXECUTANDO' && minDesde(ult.iniciado_em) > 120 ? 'critico' : ult.status === 'PARCIAL' ? 'atencao' : 'ok'
    rotinas.push({ id: 'kpi-sync', nome: 'Atualização da Matriz de KPIs', onde: 'Matriz de KPIs › botão Atualizar', frequencia: 'quando alguém clica em Atualizar',
      ultima_execucao: ult?.finalizado_em || ult?.iniciado_em || null, status: ult?.status || null, falhas, travadas: travadas.length,
      historico: (data || []).map(x => ({ inicio: x.iniciado_em, fim: x.finalizado_em, status: x.status, por: x.disparado_por })), nivel })
    if (ult?.status === 'PARCIAL' || ult?.status === 'ERRO') c.push({ id: 'rot-kpi', grupo: 'Rotinas', nivel: ult.status === 'ERRO' ? 'critico' : 'atencao',
      titulo: `Última atualização da Matriz de KPIs: ${ult.status === 'ERRO' ? 'ERRO' : 'parcial'} (${dataHoraBR(ult.iniciado_em)})`,
      detalhe: falhas.map(f => `${f.parte}: ${f.qtd} falha(s) — ${f.erros.join('; ')}`).join(' · ') || null })
    if (travadas.length) c.push({ id: 'rot-kpi-travada', grupo: 'Rotinas', nivel: 'info', titulo: `${travadas.length} atualização(ões) antiga(s) ficaram "executando" sem terminar`,
      detalhe: 'Normalmente um reinício do backend no meio da atualização. Não atrapalha as próximas.' })
  }

  // 5) Produtividade (pv_prod_sync — atualizada no 1º acesso do dia ou pelo botão)
  if (sb) {
    const [a, mm] = hoje.split('-').map(Number)
    const { data } = await sb.from('pv_prod_sync').select('marca, atualizado_em').eq('ano', a).eq('mes', mm)
    const ultima = (data || []).map(x => x.atualizado_em).sort().pop() || null
    const dias = ultima ? Math.floor(minDesde(ultima) / 1440) : null
    const nivel = ultima == null ? 'info' : dias >= 3 ? 'atencao' : 'ok'
    rotinas.push({ id: 'produtividade', nome: 'Atualização da Produtividade (mês atual)', onde: 'Pós-Vendas › Indicadores de Produtividade', frequencia: 'no 1º acesso do dia',
      ultima_execucao: ultima, marcas: (data || []).map(x => ({ marca: x.marca, em: x.atualizado_em })), nivel })
    if (nivel === 'atencao') c.push({ id: 'rot-prod', grupo: 'Rotinas', nivel: 'atencao', titulo: `Produtividade do mês sem atualizar há ${dias} dias`, detalhe: 'Ninguém abriu a tela de Produtividade, ou a atualização falhou.' })
  }

  // 6) Aquecimento dos quadros ao iniciar o backend
  {
    const m = mem['aquecimento-kpi']
    const desligado = process.env.KPI_AQUECER_AO_INICIAR === '0'
    const nivel = desligado ? 'info' : !m ? (minutosNoAr > 30 ? 'atencao' : 'info') : m.ultimo_ok ? 'ok' : 'atencao'
    rotinas.push({ id: 'aquecimento-kpi', nome: 'Pré-cálculo da Matriz de KPIs ao iniciar', onde: 'automático, 1 min após o backend subir', frequencia: 'a cada reinício/deploy do backend',
      ultima_execucao: m?.ultima_execucao || null, ultimo_ok: m?.ultimo_ok ?? null, mensagem: desligado ? 'desligado (KPI_AQUECER_AO_INICIAR=0)' : m?.ultima_mensagem || null, duracao_ms: m?.duracao_ms ?? null, nivel })
    if (m && !m.ultimo_ok) c.push({ id: 'rot-aquec', grupo: 'Rotinas', nivel: 'atencao', titulo: `Pré-cálculo da Matriz de KPIs com falhas: ${m.ultima_mensagem}`, detalhe: 'O primeiro usuário da Matriz pode esperar mais.' })
  }

  if (!c.some(x => x.nivel !== 'info')) c.push({ id: 'rot-ok', grupo: 'Rotinas', nivel: 'ok', titulo: 'Rotinas automáticas rodando normalmente' })
  ordenar(c)
  return { rotinas, controles: c, resumo: resumir(c), backend_iniciado_em: INICIADO_EM, em_producao: emProducao() }
}

// ── Integrações ───────────────────────────────────────────────────────────
async function testar(fn, timeoutMs = 12000) {
  const t0 = Date.now()
  try {
    const r = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('sem resposta (tempo esgotado)')), timeoutMs))])
    return { ok: true, ms: Date.now() - t0, ...r }
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, erro: e.message }
  }
}

async function testarEmail() {
  // Gmail pela API (26/11/2026): testa só a autorização (renova o acesso), sem enviar e-mail
  if (gmailConfigurado()) {
    const r = await testar(async () => { await tokenAcessoGmail(); return {} }, 15000)
    return { configurado: true, meio: 'gmail', servidor: `Gmail (${process.env.GMAIL_FROM || 'conta autorizada'})`, ...r }
  }
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return { configurado: false }
  const port = Number(SMTP_PORT) || 587
  const t = nodemailer.createTransport({ host: SMTP_HOST, port, secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000 })
  const r = await testar(async () => { await t.verify(); return {} }, 10000)
  t.close()
  return { configurado: true, servidor: `${SMTP_HOST}:${port}`, ...r }
}

async function testarMicrowork() {
  const token = process.env.MICROWORK_API_TOKEN
  if (!token) return { configurado: false }
  // POST vazio: a API responde rápido; 401/403 = token recusado; qualquer outra resposta = no ar e token aceito
  return { configurado: true, ...await testar(async () => {
    const r = await fetch('https://microworkcloud.com.br/api/integracao/terceiro', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: '{}', signal: AbortSignal.timeout(12000),
    })
    if (r.status === 401 || r.status === 403) throw new Error(`token recusado (HTTP ${r.status})`)
    if (r.status >= 500 && r.status !== 500) throw new Error(`MicroWork com problema (HTTP ${r.status})`)
    return { status: r.status }
  }) }
}

const IA_CHAVE = { gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' }
async function testarIA() {
  const provedor = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  const varChave = IA_CHAVE[provedor]
  const chave = varChave ? process.env[varChave] : null
  const outras = Object.entries(IA_CHAVE).filter(([p, v]) => p !== provedor && process.env[v]).map(([p]) => p)
  if (!chave) return { provedor, variavel: varChave, configurado: false, outras }
  // Listar modelos: não gasta crédito e confirma que a chave vale
  const req = {
    gemini: () => fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', { headers: { 'x-goog-api-key': chave }, signal: AbortSignal.timeout(10000) }),
    openai: () => fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${chave}` }, signal: AbortSignal.timeout(10000) }),
    anthropic: () => fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(10000) }),
  }[provedor]
  return { provedor, variavel: varChave, configurado: true, outras, ...await testar(async () => {
    const r = await req()
    if (r.status === 401 || r.status === 403) throw new Error(`chave recusada (HTTP ${r.status})`)
    if (r.status === 429) throw new Error('limite de uso/crédito atingido (HTTP 429)')
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return {}
  }) }
}

async function testarPowerBi() {
  const token = process.env.POWERBI_TOKEN
  if (!token) return { configurado: false }
  const port = process.env.PORT || 3001
  return { configurado: true, ...await testar(async () => {
    const r = await fetch(`http://127.0.0.1:${port}/api/powerbi`, { headers: { 'x-api-key': token }, signal: AbortSignal.timeout(8000) })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const views = await r.json()
    return { views: Array.isArray(views) ? views.length : null }
  }) }
}

let cacheInteg = null
export async function getIntegracoes({ refresh = false } = {}) {
  if (!refresh && cacheInteg && Date.now() - cacheInteg.t < 5 * 60 * 1000) return cacheInteg.dados
  const [email, microwork, ia, powerbi] = await Promise.all([testarEmail(), testarMicrowork(), testarIA(), testarPowerBi()])
  const kpiPlanilha = { configurado: !!(process.env.SHAREPOINT_SITE_ID && process.env.SHAREPOINT_FILE_ID), faltando: ['SHAREPOINT_SITE_ID', 'SHAREPOINT_FILE_ID'].filter(v => !process.env[v]) }
  const c = []
  const prod = emProducao()

  // E-mail
  if (!email.configurado) c.push({ id: 'int-email', grupo: 'E-mail', nivel: 'atencao', titulo: 'E-mail não configurado neste servidor (SMTP_HOST/USER/PASS)', detalhe: 'Avisos da Manifestação e das tarefas de Projetos não são enviados.' })
  else if (!email.ok && email.meio === 'gmail') c.push({ id: 'int-email', grupo: 'E-mail', nivel: 'critico', titulo: `Envio de e-mail pelo Gmail não funciona: ${email.erro}`,
    detalhe: 'Os avisos da Manifestação e das tarefas de Projetos não saem. Se a autorização expirou, rode de novo node scripts/gmailAutorizar.js.' })
  else if (email.ok && email.meio === 'gmail') c.push({ id: 'int-email', grupo: 'E-mail', nivel: 'ok', titulo: `E-mail pelo Gmail funcionando (${process.env.GMAIL_FROM || 'conta autorizada'}, ${email.ms} ms)` })
  else if (!email.ok) c.push({ id: 'int-email', grupo: 'E-mail', nivel: 'atencao', titulo: `Envio de e-mail não funciona neste servidor: ${email.erro}`,
    detalhe: prod ? `A conta (${process.env.SMTP_USER || 'SMTP'}) está certa; o plano Hobby do Railway é que bloqueia a saída de e-mail (SMTP). Os avisos automáticos da Manifestação e das tarefas de Projetos não saem da produção.` : `Servidor ${email.servidor} não respondeu.` })
  else c.push({ id: 'int-email', grupo: 'E-mail', nivel: 'ok', titulo: `Servidor de e-mail respondendo (${email.ms} ms)` })

  // MicroWork
  if (!microwork.configurado) c.push({ id: 'int-mw', grupo: 'MicroWork', nivel: 'atencao', titulo: 'MicroWork sem token neste servidor (MICROWORK_API_TOKEN)', detalhe: 'Produtividade das Motos, Auditoria das Motos e Garantias Honda ficam sem dados.' })
  else if (!microwork.ok) c.push({ id: 'int-mw', grupo: 'MicroWork', nivel: 'critico', titulo: `MicroWork não respondeu: ${microwork.erro}`, detalhe: 'Produtividade das Motos, Auditoria das Motos e Garantias Honda ficam sem dados.' })
  else c.push({ id: 'int-mw', grupo: 'MicroWork', nivel: microwork.ms > 5000 ? 'atencao' : 'ok', titulo: `MicroWork respondendo (${microwork.ms} ms)` })

  // IA
  // Sem chave = IA não usada neste servidor (usuário confirmou em 19/11/2026 que não usa) → só informação
  if (!ia.configurado) c.push({ id: 'int-ia', grupo: 'IA', nivel: 'info', titulo: `IA não configurada neste servidor (${ia.variavel || ia.provedor})`,
    detalhe: `As funções de IA (Gestor de Peças, Auditoria Externa) ficam desligadas aqui.${ia.outras?.length ? ` Há chave para: ${ia.outras.join(', ')} — basta ajustar AI_PROVIDER.` : ''}` })
  else if (!ia.ok) c.push({ id: 'int-ia', grupo: 'IA', nivel: 'critico', titulo: `IA (${ia.provedor}) com problema: ${ia.erro}` })
  else c.push({ id: 'int-ia', grupo: 'IA', nivel: 'ok', titulo: `IA (${ia.provedor}) com chave válida (${ia.ms} ms)` })

  // Power BI
  if (!powerbi.configurado) c.push({ id: 'int-pbi', grupo: 'Power BI', nivel: 'info', titulo: 'Integração com o Power BI não configurada (POWERBI_TOKEN)' })
  else if (!powerbi.ok) c.push({ id: 'int-pbi', grupo: 'Power BI', nivel: 'critico', titulo: `Endereço do Power BI não respondeu: ${powerbi.erro}`, detalhe: 'Os relatórios do Power BI não conseguem atualizar os dados da Controladoria.' })
  else c.push({ id: 'int-pbi', grupo: 'Power BI', nivel: 'ok', titulo: `Endereço do Power BI respondendo (${powerbi.views} views liberadas)` })

  // Planilha da Matriz de KPIs
  if (!kpiPlanilha.configurado) c.push({ id: 'int-kpi-planilha', grupo: 'Matriz de KPIs', nivel: 'info', titulo: 'Planilha antiga da Matriz de KPIs não configurada — etapa pulada na Atualização',
    detalhe: `Faltam ${kpiPlanilha.faltando.join(', ')}. A aba "Bloco 1 - Corporativo" da Matriz depende dessa planilha.` })

  ordenar(c)
  const dados = { email, microwork, ia, powerbi, kpi_planilha: kpiPlanilha, controles: c, resumo: resumir(c), em_producao: prod, lido_em: new Date().toISOString() }
  cacheInteg = { t: Date.now(), dados }
  return dados
}

// ── Robert Automation (robôs RPA) ─────────────────────────────────────────
// Mesma ligação log × cadastro do Monitor Robert Automation: nome igual (sem acento/caixa) ou, se único, sem o
// "PROCESSO <nº> -/:" do começo e sem pontuação. Horários do log e da agenda são de MS.
const normRpa = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const chaveRpa = (s) => normRpa(s).replace(/^PROCESSO\s*\d*\s*[-:–.]?\s*/, '').replace(/[^A-Z0-9]/g, '')
const minutosDe = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + m }
const diaSemanaIso = (iso) => ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1 // 1=Seg ... 7=Dom (igual à agenda)

export async function getRobert({ refresh = false } = {}) {
  const d = await getRpaLog({ refresh })
  const { data: hoje, hora } = agoraLocal()
  const agoraMin = minutosDe(hora)
  const porNome = new Map(d.agenda.map(a => [normRpa(a.nome), a]))
  const porChave = new Map()
  d.agenda.forEach(a => { const k = chaveRpa(a.nome); porChave.set(k, porChave.has(k) ? null : a) })
  const processoDe = (robo) => porNome.get(normRpa(robo)) || porChave.get(chaveRpa(robo)) || null
  const nomeDe = (robo) => processoDe(robo)?.nome || robo

  const execHoje = d.execucoes.filter(e => e.inicio.slice(0, 10) === hoje).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const c = []

  // 1) Erros de hoje — por processo: se a última execução de hoje deu erro = crítico; se depois rodou com sucesso = atenção
  const porProc = new Map()
  for (const e of execHoje) {
    const k = normRpa(nomeDe(e.robo))
    if (!porProc.has(k)) porProc.set(k, { nome: nomeDe(e.robo), execs: [] })
    porProc.get(k).execs.push(e)
  }
  let qtdErros = 0
  for (const p of porProc.values()) {
    const erros = p.execs.filter(e => e.status === 'Erro')
    if (!erros.length) continue
    const ultimo = p.execs[p.execs.length - 1]
    const ultErro = erros[erros.length - 1]
    const resolvido = ultimo.status !== 'Erro'
    // 23/11/2026: rodou com sucesso depois do erro (ex.: execução manual) = resolvido, não fica como alerta
    if (resolvido) continue
    qtdErros += erros.length
    c.push({
      id: `rpa-erro-${normRpa(p.nome)}`, grupo: 'Erros de hoje', nivel: resolvido ? 'atencao' : 'critico',
      titulo: `${p.nome}: ${erros.length} erro(s) hoje — último às ${ultErro.inicio.slice(11, 16)}${resolvido ? ' (rodou com sucesso depois)' : ''}`,
      detalhe: ultErro.acao_erro ? `Ação que falhou: ${ultErro.acao_erro}` : (ultErro.erro || null),
      destino: { aba: 'erros', alvo: null, processo: p.nome, de: hoje, ate: hoje },
    })
  }
  if (!qtdErros) c.push({ id: 'rpa-erros-ok', grupo: 'Erros de hoje', nivel: 'ok', titulo: `Nenhum erro dos robôs hoje (${execHoje.length} execuções)`, destino: { aba: 'execucoes', alvo: null } })

  // 2) Horários de hoje que já passaram há mais de 1 h sem execução (mesma tolerância do monitor: 10 min antes a 3 h depois)
  const ds = diaSemanaIso(hoje)
  const naoRodou = new Map() // processo -> horários de hoje sem execução
  for (const a of d.agenda.filter(x => x.ativo !== false)) {
    for (const h of [...new Set(a.horarios.filter(x => x.dia_semana === ds).map(x => x.hora))]) {
      const hm = minutosDe(h)
      if (agoraMin - hm < 60) continue // ainda aguardando
      // 23/11/2026: execução mais tarde no mesmo dia (ex.: manual) também conta — não só até 3 h depois
      const proxH = [...new Set(a.horarios.filter(x => x.dia_semana === ds).map(x => x.hora))].map(minutosDe).filter(m => m > hm).sort((x, y) => x - y)[0] ?? Infinity
      const rodou = execHoje.some(e => processoDe(e.robo) === a && e.status === 'Sucesso' && (() => { const m = minutosDe(e.inicio.slice(11, 16)); return m >= hm - 10 && m < proxH - 10 })())
      if (!rodou) { if (!naoRodou.has(a.nome)) naoRodou.set(a.nome, []); naoRodou.get(a.nome).push(h) }
    }
  }
  for (const [nome, horas] of naoRodou) {
    c.push({ id: `rpa-nao-exec-${normRpa(nome)}`, grupo: 'Agenda de hoje', nivel: 'atencao',
      titulo: `${nome}: não rodou hoje às ${horas.join(', ')}`,
      detalhe: 'Horário agendado que passou há mais de 1 h sem execução no log do robô.',
      destino: { aba: 'execucoes', alvo: null, processo: nome, de: hoje, ate: hoje, status: 'Não executado' } })
  }
  if (!naoRodou.size) c.push({ id: 'rpa-nao-exec', grupo: 'Agenda de hoje', nivel: 'ok', titulo: 'Todos os horários de hoje já vencidos rodaram', destino: { aba: 'execucoes', alvo: null, de: hoje, ate: hoje } })

  // 3) Log do SharePoint parado (o robô grava o histórico a cada execução)
  const horasLog = d.arquivo_atualizado_em ? (Date.now() - Date.parse(d.arquivo_atualizado_em)) / 3600000 : null
  if (horasLog != null && horasLog > 26) c.push({ id: 'rpa-log', grupo: 'Log', nivel: 'atencao', titulo: `Log de execuções sem atualizar há ${Math.round(horasLog)} h`, detalhe: 'O Robert Automation pode ter parado, ou deixou de gravar o histórico no SharePoint.', destino: { aba: 'resumo', alvo: null } })

  ordenar(c)
  return { controles: c, resumo: resumir(c), erros_hoje: qtdErros, execucoes_hoje: execHoje.length, lido_em: new Date().toISOString() }
}

// ── Resumo geral (todos os monitores) ─────────────────────────────────────
// link = página do monitor; abaPadrao = aba que o "Ver detalhes" abre. Cada problema leva o destino (aba + alvo)
// para a tela abrir direto onde está a informação (21/11/2026).
async function bloco(id, nome, link, fn, timeoutMs = 30000, abaPadrao = null) {
  const t0 = Date.now()
  const base = { id, nome, link, aba_padrao: abaPadrao }
  try {
    const r = await Promise.race([fn(), new Promise((_, rej) => setTimeout(() => rej(new Error('demorou demais para responder')), timeoutMs))])
    if (r?.naoConfigurado) return { ...base, nivel: 'info', resumo: null, problemas: [], aviso: r.naoConfigurado, ms: Date.now() - t0 }
    const ctrl = r.controles || []
    const pior = ctrl.reduce((p, x) => (ORDEM[x.nivel] < ORDEM[p] ? x.nivel : p), 'ok')
    return { ...base, nivel: ctrl.length ? (pior === 'info' ? 'ok' : pior) : 'ok', resumo: resumir(ctrl),
      problemas: ctrl.filter(x => x.nivel === 'critico' || x.nivel === 'atencao').slice(0, 6)
        .map(x => ({ id: x.id, nivel: x.nivel, titulo: x.titulo, destino: x.destino || null })), ms: Date.now() - t0 }
  } catch (e) {
    return { ...base, nivel: 'critico', resumo: null, problemas: [{ id: 'erro', nivel: 'critico', titulo: `Não foi possível verificar: ${e.message}` }], ms: Date.now() - t0 }
  }
}

let cacheResumo = null
export async function getResumo({ refresh = false } = {}) {
  if (!refresh && cacheResumo && Date.now() - cacheResumo.t < 2 * 60 * 1000) return cacheResumo.dados
  const blocos = await Promise.all([
    // "Ver detalhes" sempre abre a aba de resumo de cada sistema (Resumo / Visão Geral) — 21/11/2026
    bloco('robert', 'Robert Automation — robôs', '/governanca/processos/rpa', () => getRobert({ refresh }), 30000, 'resumo'),
    bloco('railway', 'Railway — backend', '/governanca/monitor-railway', async () => railwayConfigurado() ? controlesRailway({ refresh }) : { naoConfigurado: 'Token do Railway não configurado' }, 30000, 'visao'),
    bloco('supabase', 'Supabase — banco de dados', '/governanca/monitor-supabase', () => controlesSupabase({ refresh }), 30000, 'visao'),
    bloco('sharepoint', 'SharePoint — planilhas', '/governanca/monitor-sharepoint', async () => controlesSharepoint(await visaoSharepoint({ refresh })), 30000, 'visao'),
    bloco('cloudflare', 'Cloudflare — telas do portal', '/governanca/monitor-cloudflare', async () => controlesCloudflare(await visaoCloudflare({ refresh })), 30000, 'visao'),
    bloco('rotinas', 'Rotinas automáticas', '/governanca/saude-sistema', () => getRotinas(), 30000, 'rotinas'),
    bloco('integracoes', 'Integrações', '/governanca/saude-sistema', () => getIntegracoes({ refresh }), 30000, 'integracoes'),
  ])
  const geral = blocos.reduce((p, b) => (ORDEM[b.nivel] < ORDEM[p] ? b.nivel : p), 'ok')
  const dados = { geral, blocos, lido_em: new Date().toISOString() }
  cacheResumo = { t: Date.now(), dados }
  return dados
}
