// Uso: node exchange-code.mjs CODE CLIENT_ID CLIENT_SECRET
const CODE          = process.argv[2]
const CLIENT_ID     = process.argv[3]
const CLIENT_SECRET = process.argv[4]

if (!CODE || !CLIENT_ID || !CLIENT_SECRET) {
  console.log('Uso: node exchange-code.mjs CODE CLIENT_ID CLIENT_SECRET')
  process.exit(1)
}

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code:          CODE,
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri:  'http://localhost:3333/callback',
    grant_type:    'authorization_code',
  }),
})
const data = await res.json()

if (data.refresh_token) {
  console.log('\n========== COPIE ESTES VALORES ==========')
  console.log('GMAIL_REFRESH_TOKEN=' + data.refresh_token)
  console.log('=========================================\n')
} else {
  console.log('Erro ou token não retornado:')
  console.log(JSON.stringify(data, null, 2))
  console.log('\nSe aparecer "invalid_grant", o código já expirou — rode get-gmail-token.mjs novamente.')
}
