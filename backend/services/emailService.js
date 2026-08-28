import { OAuth2Client } from 'google-auth-library'

const FROM_NAME  = 'Portal de Gestão - Grupo Caiobá'
const FROM_EMAIL = process.env.GMAIL_USER || 'desenvolvimentogrupocaioba@gmail.com'

let _oAuth2Client
function getOAuth2Client() {
  if (_oAuth2Client) return _oAuth2Client
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    _oAuth2Client = new OAuth2Client(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET)
    _oAuth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
  }
  return _oAuth2Client
}

function buildRawEmail(to, subject, htmlContent) {
  const boundary = 'bnd_' + Date.now()
  const mime = [
    `To: ${to}`,
    `From: ${FROM_NAME} <${FROM_EMAIL}>`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlContent).toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n')
  return Buffer.from(mime).toString('base64url')
}

export async function enviarEmail({ to, subject, html }) {
  const client = getOAuth2Client()
  console.log(`[email] Provedor: ${client ? 'Gmail API' : process.env.BREVO_API_KEY ? 'Brevo' : 'nenhum'} → ${to}`)

  if (client) {
    const tokenRes = await client.getAccessToken()
    const token = tokenRes.token
    console.log(`[email] Access token obtido: ${token ? 'sim' : 'não'}`)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: buildRawEmail(to, subject, html) }),
        signal: controller.signal,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Gmail API error ${res.status}`)
      }
      console.log(`[email] Enviado via Gmail API → ${to}`)
      return
    } finally {
      clearTimeout(timer)
    }
  }

  // Fallback: Brevo HTTP API
  const BREVO_API_KEY = process.env.BREVO_API_KEY
  if (BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Brevo error ${res.status}`)
    }
    console.log(`[email] Enviado via Brevo → ${to}`)
    return
  }

  console.warn('[email] Nenhum provedor configurado — envio ignorado:', subject, '→', to)
}
