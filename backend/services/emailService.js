const FROM_NAME  = 'Portal de Gestão - Grupo Caiobá'
const FROM_EMAIL = process.env.GMAIL_USER || 'desenvolvimentogrupocaioba@gmail.com'

async function getGmailAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OAuth token error: ${err.error_description || err.error || res.status}`)
  }
  const data = await res.json()
  return data.access_token
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
  const hasGmail = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
  console.log(`[email] Provedor: ${hasGmail ? 'Gmail API' : process.env.BREVO_API_KEY ? 'Brevo' : 'nenhum'} → ${to}`)

  if (hasGmail) {
    const token = await getGmailAccessToken()
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: buildRawEmail(to, subject, html) }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error?.message || `Gmail API error ${res.status}`)
    }
    console.log(`[email] Enviado via Gmail API → ${to}`)
    return
  }

  // Fallback: Brevo HTTP API
  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json' },
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

  console.warn('[email] Nenhum provedor configurado — ignorado:', subject, '→', to)
}
