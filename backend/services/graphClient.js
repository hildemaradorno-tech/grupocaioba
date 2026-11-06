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

// Grava (cria ou substitui) um arquivo no SharePoint: PUT .../root:{caminho}:/content. Upload simples, até 4 MB
// (acima disso o Graph exige sessão de upload). Precisa da permissão de aplicativo Files.ReadWrite.All (ou
// Sites.ReadWrite.All) no Azure — sem ela o Graph responde 403.
export async function graphPutArquivo(caminho, buffer, contentType = 'application/octet-stream') {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  if (buffer.length > 4 * 1024 * 1024) throw new Error('Arquivo maior que 4 MB: o upload simples do SharePoint não aceita.')
  const token = await getAccessToken()
  const url = `https://graph.microsoft.com/v1.0/drives/${driveId}/root:${encodeURI(caminho)}:/content`
  const res = await axios.put(url, buffer, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType }, maxBodyLength: Infinity })
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
