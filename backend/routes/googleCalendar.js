import { Router } from 'express'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const router = Router()
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null

const isConfigured = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)

const getOAuth2Client = () =>
  new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

// GET /api/google-calendar/status?usuario_id=xxx
router.get('/status', wrap(async (req, res) => {
  if (!isConfigured() || !supabaseAdmin) return res.json({ connected: false })

  const { usuario_id } = req.query
  if (!usuario_id) return res.json({ connected: false })

  const { data } = await supabaseAdmin
    .from('user_google_tokens')
    .select('google_email')
    .eq('usuario_id', usuario_id)
    .maybeSingle()

  res.json({ connected: !!data, google_email: data?.google_email || null })
}))

// GET /api/google-calendar/auth-url?usuario_id=xxx
router.get('/auth-url', (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'Google Calendar não configurado no servidor.' })

  const { usuario_id } = req.query
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id obrigatório' })

  const url = getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    state: usuario_id,
    prompt: 'consent',
  })
  res.json({ url })
})

// GET /api/google-calendar/callback  — destino do OAuth do Google
router.get('/callback', wrap(async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
  const { code, state: usuario_id, error } = req.query

  if (error) {
    return res.redirect(`${frontendUrl}/projetos/calendario?google_error=${encodeURIComponent(error)}`)
  }

  if (!supabaseAdmin) {
    return res.redirect(`${frontendUrl}/projetos/calendario?google_error=backend_nao_configurado`)
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Busca e-mail Google do usuário autorizado
    const { data: userInfo } = await google.oauth2({ version: 'v2', auth: oauth2Client }).userinfo.get()

    await supabaseAdmin
      .from('user_google_tokens')
      .upsert({
        usuario_id,
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'usuario_id' })

    res.redirect(`${frontendUrl}/projetos/calendario?google_connected=1`)
  } catch (err) {
    console.error('[google-calendar/callback]', err)
    res.redirect(`${frontendUrl}/projetos/calendario?google_error=${encodeURIComponent(err.message)}`)
  }
}))

// GET /api/google-calendar/events?usuario_id=xxx&data_ini=YYYY-MM-DD&data_fim=YYYY-MM-DD
router.get('/events', wrap(async (req, res) => {
  if (!isConfigured() || !supabaseAdmin) return res.json({ connected: false, events: [] })

  const { usuario_id, data_ini, data_fim } = req.query
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id obrigatório' })

  const { data: tokenRow } = await supabaseAdmin
    .from('user_google_tokens')
    .select('*')
    .eq('usuario_id', usuario_id)
    .maybeSingle()

  if (!tokenRow) return res.json({ connected: false, events: [] })

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : null,
  })

  // Persiste o novo access_token quando o Google o renovar automaticamente
  oauth2Client.on('tokens', async (newTokens) => {
    const update = { atualizado_em: new Date().toISOString() }
    if (newTokens.access_token) update.access_token = newTokens.access_token
    if (newTokens.expiry_date) update.expires_at = new Date(newTokens.expiry_date).toISOString()
    await supabaseAdmin.from('user_google_tokens').update(update).eq('usuario_id', usuario_id)
  })

  const timeMin = data_ini
    ? new Date(data_ini + 'T00:00:00').toISOString()
    : new Date().toISOString()
  const timeMax = data_fim
    ? new Date(data_fim + 'T23:59:59').toISOString()
    : undefined

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
  const { data } = await calendar.events.list({
    calendarId: 'primary',
    timeMin,
    ...(timeMax ? { timeMax } : {}),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 500,
  })

  res.json({ connected: true, google_email: tokenRow.google_email, events: data.items || [] })
}))

// DELETE /api/google-calendar/disconnect?usuario_id=xxx
router.delete('/disconnect', wrap(async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Backend não configurado.' })

  const { usuario_id } = req.query
  if (!usuario_id) return res.status(400).json({ error: 'usuario_id obrigatório' })

  await supabaseAdmin.from('user_google_tokens').delete().eq('usuario_id', usuario_id)
  res.json({ success: true })
}))

export default router
