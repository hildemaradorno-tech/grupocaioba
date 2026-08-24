import nodemailer from 'nodemailer'

const BREVO_API_KEY  = process.env.BREVO_API_KEY
const FROM_EMAIL     = process.env.FROM_EMAIL || process.env.GMAIL_USER || 'desenvolvimentogrupocaioba@gmail.com'
const FROM_NAME      = 'Portal de Gestão - Grupo Caiobá'

// Fallback: Gmail SMTP via nodemailer
let _transporter
function getTransporter() {
  if (_transporter !== undefined) return _transporter
  _transporter = (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        connectionTimeout: 60000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
      })
    : null
  return _transporter
}

export async function enviarEmail({ to, subject, html }) {
  // Preferência: Brevo HTTP API (sem SMTP, confiável em cloud)
  if (BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
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
    return
  }

  // Fallback: Gmail SMTP
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[email] Nenhum provedor configurado (BREVO_API_KEY ou GMAIL_USER/GMAIL_APP_PASSWORD) — envio ignorado:', subject, '→', to)
    return
  }
  await transporter.sendMail({ from: `${FROM_NAME} <${process.env.GMAIL_USER || FROM_EMAIL}>`, to, subject, html })
}
