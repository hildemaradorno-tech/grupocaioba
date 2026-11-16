/**
 * Agenda de Projetos → Outlook (assinatura de calendário .ics)
 *
 *  - linkRouter (logado, menu projetos): GET /link e POST /link/novo
 *      devolve/gera o token secreto do usuário logado.
 *  - feedRouter (público, protegido pelo token): GET /:token.ics
 *      o Outlook busca este endereço de tempos em tempos e mostra as tarefas
 *      em que o usuário é responsável (vínculo em Responsáveis → usuário).
 *
 * Tarefa sem horário = evento de dia inteiro (início → fim).
 * Tarefa com horário = evento com data e hora (horário de Brasília).
 * Concluídas continuam aparecendo com "✓ Concluída" no título.
 */
import { Router } from 'express'
import crypto from 'crypto'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'
import { getPerfilUsuario } from '../middleware/authMiddleware.js'

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)
const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3000'

// ── Link do usuário logado ──────────────────────────────────────────────────
export const linkRouter = Router()

const novoToken = () => crypto.randomBytes(24).toString('hex')

async function responsaveisDoUsuario(sb, usuarioId) {
  const { data } = await sb.from('proj_responsaveis').select('nome, ativo').eq('usuario_id', usuarioId)
  return (data || []).map(r => r.nome).filter(Boolean)
}

linkRouter.get('/link', wrap(async (req, res) => {
  const sb = getSupabaseAdmin()
  const perfil = await getPerfilUsuario(req.user?.email)
  if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })

  let { data: row } = await sb.from('proj_agenda_tokens').select('token').eq('usuario_id', perfil.id).maybeSingle()
  if (!row) {
    const token = novoToken()
    const { error } = await sb.from('proj_agenda_tokens').insert({ usuario_id: perfil.id, token })
    if (error) throw error
    row = { token }
  }
  const responsaveis = await responsaveisDoUsuario(sb, perfil.id)
  res.json({ token: row.token, responsaveis })
}))

// Gera um link novo (o antigo para de funcionar) — usar se o link vazou.
linkRouter.post('/link/novo', wrap(async (req, res) => {
  const sb = getSupabaseAdmin()
  const perfil = await getPerfilUsuario(req.user?.email)
  if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })
  const token = novoToken()
  const { error } = await sb.from('proj_agenda_tokens')
    .upsert({ usuario_id: perfil.id, token, criado_em: new Date().toISOString(), ultimo_acesso_em: null }, { onConflict: 'usuario_id' })
  if (error) throw error
  const responsaveis = await responsaveisDoUsuario(sb, perfil.id)
  res.json({ token, responsaveis })
}))

// ── Feed .ics (público, pelo token) ─────────────────────────────────────────
export const feedRouter = Router()

const STATUS_LABEL = {
  mapeado: 'Mapeado', programado: 'Programado', em_andamento: 'Em Andamento',
  pausado: 'Pausado', concluido: 'Concluída', cancelado: 'Cancelada',
}

const textoPlano = (s) => String(s || '').replace(/\*\*?|__|~~/g, '')
const normalizar = (s) => String(s || '').trim().toLowerCase()

// Escape de TEXT do iCalendar (RFC 5545 §3.3.11)
const esc = (s) => String(s ?? '')
  .replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n')

// Dobra linhas em 75 octetos (RFC 5545 §3.1), sem quebrar caracteres UTF-8
function dobrar(linha) {
  const buf = Buffer.from(linha, 'utf8')
  if (buf.length <= 75) return linha
  const partes = []
  let atual = ''
  let tam = 0
  let limite = 75
  for (const ch of linha) {
    const n = Buffer.byteLength(ch, 'utf8')
    if (tam + n > limite) {
      partes.push(atual)
      atual = ''
      tam = 0
      limite = 74 // linhas de continuação começam com 1 espaço
    }
    atual += ch
    tam += n
  }
  if (atual) partes.push(atual)
  return partes.join('\r\n ')
}

const dataIcs = (iso) => iso.replace(/-/g, '') // 2026-11-16 → 20261116
const somarDias = (iso, dias) => {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
// Horário de Brasília (sem horário de verão desde 2019: UTC-3) → UTC "Z"
const dataHoraUtc = (iso, hora) => {
  const [h, m] = String(hora).split(':').map(Number)
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCHours(h + 3, m || 0, 0, 0)
  return d
}
const fmtUtc = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

function eventoDaTarefa(t, projeto, agoraUtc) {
  const ini = t.data_inicio || t.data_fim
  const fim = t.data_fim || t.data_inicio
  if (!ini) return null

  const concluida = t.status_kanban === 'concluido'
  const linhas = textoPlano(t.nome).split('\n').map(l => l.trim()).filter(Boolean)
  // corta nomes muito longos numa palavra inteira, com reticências
  const primeira = linhas[0] || 'Tarefa'
  const titulo = primeira.length <= 150 ? primeira : `${primeira.slice(0, 150).replace(/\s+\S*$/, '')}…`
  // No Outlook aparece só o nome da tarefa (+ data/horário do próprio evento).
  // Exceção pedida: concluídas continuam aparecendo, marcadas com "✓ Concluída".
  const resumo = `${concluida ? '✓ Concluída — ' : ''}${titulo}`

  const ev = [
    'BEGIN:VEVENT',
    `UID:tarefa-${t.id}@gestao-projetos`,
    `DTSTAMP:${fmtUtc(agoraUtc)}`,
  ]
  if (t.atualizado_em) ev.push(`LAST-MODIFIED:${fmtUtc(new Date(t.atualizado_em))}`)

  if (t.hora_inicio || t.hora_fim) {
    const hIni = t.hora_inicio || t.hora_fim
    const inicio = dataHoraUtc(ini, hIni)
    const UMA_HORA = 60 * 60 * 1000
    // sem hora de término: termina 1 hora depois do horário de início, no dia final
    let termino = t.hora_fim ? dataHoraUtc(fim, t.hora_fim) : new Date(dataHoraUtc(fim, hIni).getTime() + UMA_HORA)
    if (termino <= inicio) termino = new Date(inicio.getTime() + UMA_HORA)
    ev.push(`DTSTART:${fmtUtc(inicio)}`, `DTEND:${fmtUtc(termino)}`, 'TRANSP:OPAQUE')
  } else {
    // dia inteiro: DTEND é exclusivo (dia seguinte ao término)
    const fimReal = fim < ini ? ini : fim
    ev.push(`DTSTART;VALUE=DATE:${dataIcs(ini)}`, `DTEND;VALUE=DATE:${dataIcs(somarDias(fimReal, 1))}`, 'TRANSP:TRANSPARENT',
      'X-MICROSOFT-CDO-ALLDAYEVENT:TRUE')
  }

  ev.push(`SUMMARY:${esc(resumo)}`, 'STATUS:CONFIRMED', 'END:VEVENT')
  return ev
}

feedRouter.get('/:arquivo', wrap(async (req, res) => {
  const token = String(req.params.arquivo || '').replace(/\.ics$/i, '')
  if (!/^[a-f0-9]{48}$/.test(token)) return res.status(404).send('Calendário não encontrado.')

  const sb = getSupabaseAdmin()
  if (!sb) return res.status(503).send('Backend não configurado.')

  const { data: tk } = await sb.from('proj_agenda_tokens').select('usuario_id').eq('token', token).maybeSingle()
  if (!tk) return res.status(404).send('Calendário não encontrado.')

  // Usuário precisa continuar ativo e com acesso a Projetos
  const { data: usuario } = await sb.from('usuarios').select('id, email, ativo').eq('id', tk.usuario_id).maybeSingle()
  if (!usuario || usuario.ativo === false) return res.status(404).send('Calendário não encontrado.')
  const perfil = await getPerfilUsuario(usuario.email)
  const temAcesso = perfil && (perfil.is_admin || [...perfil.menus].some(m => m.startsWith('projetos') || m === 'bi/projetos'))
  if (!temAcesso) return res.status(404).send('Calendário não encontrado.')

  sb.from('proj_agenda_tokens').update({ ultimo_acesso_em: new Date().toISOString() }).eq('token', token).then(() => {}, () => {})

  const nomes = new Set((await responsaveisDoUsuario(sb, usuario.id)).map(normalizar))

  let tarefas = []
  if (nomes.size) {
    // Filtro por nome em memória (o vínculo da tarefa com o responsável é pelo nome, sem caixa/espaços)
    const PAGINA = 1000
    for (let de = 0; ; de += PAGINA) {
      const { data, error } = await sb.from('proj_tarefas')
        .select('id, projeto_id, nome, responsavel_nome, data_inicio, data_fim, hora_inicio, hora_fim, status_kanban, progresso_pct, etapa, sistema_nome, fase_nome, area_nome, ativo, atualizado_em')
        .or('data_inicio.not.is.null,data_fim.not.is.null')
        .order('id')
        .range(de, de + PAGINA - 1)
      if (error) throw error
      tarefas.push(...(data || []).filter(t =>
        t.ativo !== false && t.status_kanban !== 'cancelado' && nomes.has(normalizar(t.responsavel_nome))))
      if (!data || data.length < PAGINA) break
    }
  }

  const idsProjetos = [...new Set(tarefas.map(t => t.projeto_id))]
  const projetos = new Map()
  if (idsProjetos.length) {
    const { data } = await sb.from('proj_projetos').select('id, nome, ativo').in('id', idsProjetos)
    for (const p of data || []) projetos.set(p.id, p)
  }
  tarefas = tarefas.filter(t => projetos.get(t.projeto_id)?.ativo !== false)

  const agora = new Date()
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sistema//Gestao de Projetos//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${esc('Minhas Tarefas — Gestão de Projetos')}`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ]
  for (const t of tarefas) {
    const ev = eventoDaTarefa(t, projetos.get(t.projeto_id), agora)
    if (ev) linhas.push(...ev)
  }
  linhas.push('END:VCALENDAR')

  res.set('Content-Type', 'text/calendar; charset=utf-8')
  res.set('Content-Disposition', 'inline; filename="minhas-tarefas.ics"')
  res.set('Cache-Control', 'no-cache')
  res.send(linhas.map(dobrar).join('\r\n') + '\r\n')
}))
