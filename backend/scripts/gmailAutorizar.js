// Autorização única do Gmail para o portal enviar e-mails pela API do Gmail (26/11/2026).
//
// Antes: no backend/.env, GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET (do Google Cloud › Credenciais › ID do cliente OAuth,
// tipo "App para computador").
// Rodar (na pasta backend):  node scripts/gmailAutorizar.js
// O navegador abre o Google; entre com a conta Gmail do portal e autorize. O script grava GMAIL_REFRESH_TOKEN e
// GMAIL_FROM no backend/.env — sem mostrar a chave na tela. Depois, copie as 4 variáveis GMAIL_* para o Railway.
import 'dotenv/config'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET } = process.env
if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET) {
  console.error('Coloque GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no backend/.env antes de rodar este script.')
  process.exit(1)
}

const PORTA = 53682
const REDIRECT = `http://127.0.0.1:${PORTA}`
const ESCOPOS = 'https://www.googleapis.com/auth/gmail.send openid email'
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: GMAIL_CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: ESCOPOS,
  access_type: 'offline', prompt: 'consent',
})

const arqEnv = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env')
function gravarEnv(chave, valor) {
  let txt = fs.existsSync(arqEnv) ? fs.readFileSync(arqEnv, 'utf8') : ''
  const linha = `${chave}=${valor}`
  const re = new RegExp(`^${chave}=.*$`, 'm')
  txt = re.test(txt) ? txt.replace(re, linha) : `${txt.replace(/\s*$/, '')}\n${linha}\n`
  fs.writeFileSync(arqEnv, txt)
}

const servidor = http.createServer(async (req, res) => {
  const q = new URL(req.url, REDIRECT).searchParams
  if (!q.get('code')) { res.end(q.get('error') ? `Autorização cancelada: ${q.get('error')}` : 'Aguardando...'); return }
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: q.get('code'), client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }),
    })
    const j = await r.json()
    if (!j.refresh_token) throw new Error(j.error_description || j.error || 'o Google não devolveu a chave (refresh token)')
    const email = j.id_token ? JSON.parse(Buffer.from(j.id_token.split('.')[1], 'base64url').toString()).email : null
    gravarEnv('GMAIL_REFRESH_TOKEN', j.refresh_token)
    if (email) gravarEnv('GMAIL_FROM', email)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2>Pronto! Gmail autorizado para o Portal.</h2><p>Pode fechar esta aba e voltar ao terminal.</p>')
    console.log(`\n✅ Autorizado: ${email || '(conta Gmail)'}. GMAIL_REFRESH_TOKEN e GMAIL_FROM gravados no backend/.env.`)
    console.log('   Próximo passo: copie as 4 variáveis GMAIL_* do backend/.env para o Railway (Variables) e reinicie o backend.')
  } catch (e) {
    res.end(`Erro: ${e.message}`)
    console.error('❌', e.message)
  } finally {
    setTimeout(() => { servidor.close(); process.exit(0) }, 500)
  }
})

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log('Abrindo o Google para autorizar... Se o navegador não abrir, copie este endereço:\n')
  console.log(url + '\n')
  // sem shell no Windows (o "&" do endereço quebraria o cmd)
  if (process.platform === 'win32') spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref()
  else spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { detached: true, stdio: 'ignore' }).unref()
})
