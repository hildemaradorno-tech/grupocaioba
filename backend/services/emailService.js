import nodemailer from 'nodemailer'

const FROM_NAME  = 'Portal de Gestão - Grupo Caiobá'
const FROM_EMAIL = process.env.SMTP_USER || 'rpa@grupocaioba.com.br'

const AVISO_AUTOMATICO = `
  <div style="font-family:sans-serif;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:6px;padding:8px 14px;margin-bottom:20px;text-align:center;color:#475569;font-size:12px;letter-spacing:0.3px">
    --------------- NÃO RESPONDER ESTE E-MAIL. ENVIO AUTOMÁTICO ---------------------
  </div>`

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

export async function enviarEmail({ to, subject, html }) {
  const t = getTransporter()
  if (!t) {
    console.warn('[email] SMTP não configurado — ignorado:', subject, '→', to)
    return
  }
  await t.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to,
    subject,
    html: AVISO_AUTOMATICO + html,
  })
  console.log(`[email] Enviado via SMTP → ${to}`)
}
