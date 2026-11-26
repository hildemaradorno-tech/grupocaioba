import nodemailer from 'nodemailer'

// Envio de e-mail do portal.
//
// 1) API do Gmail (HTTPS) — usada quando GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET e GMAIL_REFRESH_TOKEN estão no backend
//    (26/11/2026). Funciona no Railway: o plano Hobby bloqueia SMTP (portas 25/465/587/2525), mas não HTTPS.
//    Remetente = a conta Gmail autorizada (GMAIL_FROM). Autorização única: node scripts/gmailAutorizar.js
// 2) SMTP (SMTP_HOST/USER/PASS) — o de antes (rpa@grupocaioba.com.br). Continua valendo onde o Gmail não estiver
//    configurado (ex.: localhost), mas não sai do Railway.

const FROM_NAME = 'Portal de Gestão - Grupo Caiobá'

const AVISO_AUTOMATICO = `
  <div style="font-family:sans-serif;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:8px 14px;margin-bottom:20px;text-align:center;color:#475569;font-size:12px;letter-spacing:0.3px">
    --------------- NÃO RESPONDER ESTE E-MAIL. ENVIO AUTOMÁTICO ---------------------
  </div>`

// ── Gmail (API) ─────────────────────────────────────────────────────────────
export const gmailConfigurado = () => !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)

let tokenGmail = null // { valor, expiraEm }
export async function tokenAcessoGmail() {
  if (tokenGmail && Date.now() < tokenGmail.expiraEm - 60_000) return tokenGmail.valor
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(15000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) {
    throw new Error(j.error === 'invalid_grant'
      ? 'autorização do Gmail expirou ou foi revogada — rode de novo: node scripts/gmailAutorizar.js'
      : `Gmail: não foi possível obter acesso (${j.error || r.status})`)
  }
  tokenGmail = { valor: j.access_token, expiraEm: Date.now() + (j.expires_in || 3600) * 1000 }
  return tokenGmail.valor
}

// Monta a mensagem (MIME) com o próprio nodemailer, sem enviar, e entrega à API do Gmail
const montador = nodemailer.createTransport({ streamTransport: true, buffer: true })
async function enviarViaGmail({ from, to, cc, subject, html }) {
  const { message } = await montador.sendMail({ from, to, ...(cc && cc.length ? { cc } : {}), subject, html })
  const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const token = await tokenAcessoGmail()
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20000),
  })
  if (!r.ok) {
    const j = await r.json().catch(() => ({}))
    throw new Error(`Gmail: envio recusado (${j.error?.message || r.status})`)
  }
}

// ── SMTP (antigo) ───────────────────────────────────────────────────────────
let transporter = null
function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  if (!transporter) {
    const port = Number(SMTP_PORT) || 587
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  }
  return transporter
}

export function meioEnvio() {
  if (gmailConfigurado()) return { meio: 'gmail', remetente: process.env.GMAIL_FROM || '(conta Gmail autorizada)' }
  if (getTransporter()) return { meio: 'smtp', remetente: process.env.SMTP_USER || 'rpa@grupocaioba.com.br' }
  return { meio: null, remetente: null }
}

export async function enviarEmail({ to, cc, subject, html }) {
  const corpo = AVISO_AUTOMATICO + html
  if (gmailConfigurado()) {
    const remetente = process.env.GMAIL_FROM
    const from = remetente ? `"${FROM_NAME}" <${remetente}>` : FROM_NAME
    await enviarViaGmail({ from, to, cc, subject, html: corpo })
    console.log(`[email] Enviado via Gmail → ${to}`)
    return
  }
  const t = getTransporter()
  if (!t) {
    console.warn('[email] E-mail não configurado (nem Gmail nem SMTP) — ignorado:', subject, '→', to)
    return
  }
  await t.sendMail({
    from: `"${FROM_NAME}" <${process.env.SMTP_USER || 'rpa@grupocaioba.com.br'}>`,
    to,
    ...(cc && cc.length ? { cc } : {}),
    subject,
    html: corpo,
  })
  console.log(`[email] Enviado via SMTP → ${to}`)
}
