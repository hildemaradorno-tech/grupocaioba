import nodemailer from 'nodemailer'

let _transporter

function getTransporter() {
  if (_transporter !== undefined) return _transporter
  _transporter = (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
    ? nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
    : null
  return _transporter
}

export async function enviarEmail({ to, subject, html }) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[email] GMAIL_USER/GMAIL_APP_PASSWORD não configurados — envio ignorado:', subject, '→', to)
    return
  }
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, html })
}
