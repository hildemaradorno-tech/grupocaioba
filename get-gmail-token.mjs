import { createServer } from 'http'
import { OAuth2Client } from 'google-auth-library'
import { exec } from 'child_process'

const CLIENT_ID = process.argv[2]
const CLIENT_SECRET = process.argv[3]

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Uso: node get-gmail-token.mjs CLIENT_ID CLIENT_SECRET')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:3333/callback'
const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const url = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
  prompt: 'consent',
  login_hint: 'desenvolvimentogrupocaioba@gmail.com',
})

console.log('\nAbrindo navegador para autorização...\n')
exec(`start "" "${url}"`)

const server = createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) return
  const code = new URL(req.url, 'http://localhost:3333').searchParams.get('code')
  if (!code) { res.end('Sem código'); return }

  const { tokens } = await oAuth2Client.getToken(code)
  res.end('<h2>Autorizado! Pode fechar esta janela.</h2>')
  server.close()

  console.log('\n========== COPIE ESTES VALORES ==========')
  console.log('GMAIL_CLIENT_ID=' + CLIENT_ID)
  console.log('GMAIL_CLIENT_SECRET=' + CLIENT_SECRET)
  console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token)
  console.log('=========================================\n')
}).listen(3333, () => {
  console.log('Aguardando autorização em http://localhost:3333 ...')
})
