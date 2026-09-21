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

// Escolhe quais arquivos de um relatório RFN003 usar, a partir da listagem da pasta. O relatório
// já saiu como UM arquivo único (nome = prefixo) e como VÁRIOS por unidade (prefixo + "_" +
// unidade); às vezes os dois coexistem na pasta, com o antigo desatualizado — usar os dois
// duplicaria títulos. Regra: só um dos formatos existe → usa ele; os dois existem → usa o que
// foi gerado mais recentemente.
export function selecionarArquivosRelatorio(items, prefix) {
  const alvo = prefix.toLowerCase()
  const doRelatorio = (items || []).filter(i => i.file && i.name?.toLowerCase().startsWith(alvo))
  const restoDoNome = (i) => i.name.toLowerCase().slice(alvo.length)
  const porUnidade = doRelatorio.filter(i => restoDoNome(i).startsWith('_'))
  const unico = doRelatorio.filter(i => !restoDoNome(i).startsWith('_'))
  if (unico.length === 0) return porUnidade
  if (porUnidade.length === 0) return unico
  const maisRecente = (lista) => Math.max(...lista.map(i => Date.parse(i.lastModifiedDateTime) || 0))
  return maisRecente(unico) > maisRecente(porUnidade) ? unico : porUnidade
}
