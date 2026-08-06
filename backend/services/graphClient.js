import { ConfidentialClientApplication } from '@azure/msal-node'
import axios from 'axios'

export function isConfigured() {
  return !!(
    process.env.AZURE_TENANT_ID &&
    process.env.AZURE_CLIENT_ID &&
    process.env.AZURE_CLIENT_SECRET
  )
}

let _cca = null
function getCca() {
  if (!_cca) {
    _cca = new ConfidentialClientApplication({
      auth: {
        clientId:     process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      },
    })
  }
  return _cca
}

async function getAccessToken() {
  const result = await getCca().acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })
  if (!result?.accessToken) throw new Error('Falha ao obter token do Azure AD')
  return result.accessToken
}

export async function graphGet(path) {
  const token = await getAccessToken()
  const res = await axios.get(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data
}
