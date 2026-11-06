import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet, graphPutArquivo } from './graphClient.js'

// Contratos de Plano de Manutenção DAF com potencial de renovação (exportação do CRM DAF,
// "CRM DAF - Plano de Manutenção - Potencial Renovação 2026.xlsx"). Uma linha por chassi do contrato; o mesmo
// contrato pode ter vários chassis. O arquivo é achado pelo trecho "Potencial Renovação" em qualquer parte do nome
// (o nome já mudou uma vez: era "Potencial Renovação 2026.xlsx").
const PASTA = '/Banco de Dados - DAF - Pós-Vendas/CRM DMS DAF'
const TRECHO_NOME = 'potencial renovação'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0
// Linhas já lidas de cada arquivo: só baixa de novo o arquivo que mudou no SharePoint.
const _porArquivo = new Map() // id → { lastModified, rows }

// O refresh só invalida a lista; os arquivos sem alteração continuam vindo da memória.
export function clearPotencialRenovacaoCache() { _cache = null; _cacheTs = 0 }

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
// Data serial do Excel → 'AAAA-MM-DD' (só o dia).
const dataSerial = (v) => {
  if (v === '' || v === null || v === undefined || isNaN(Number(v))) return null
  return new Date(Math.round((Math.floor(Number(v)) - 25569) * 86400000)).toISOString().slice(0, 10)
}

async function listar(caminho) {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itens = []
  let url = `/drives/${driveId}/root:${caminho}:/children?$top=200`
  while (url) {
    const r = await graphGet(url)
    itens.push(...(r.value || []))
    url = r['@odata.nextLink'] ? r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null
  }
  return itens
}

// Importação manual (engrenagem do BI → "Importar arquivo"): quando o arquivo da pasta do SharePoint não está
// atualizado, o usuário envia o .xlsx exportado do CRM DAF e ele SUBSTITUI o arquivo da pasta (mesmo nome) —
// assim o BI, o manual e quem conferir os relatórios continuam olhando um arquivo só.
// Antes de gravar, confere se é mesmo a exportação do Potencial Renovação (colunas obrigatórias e ao menos 1 contrato).
const COLUNAS_OBRIGATORIAS = ['Chassi', 'Contrato', 'Razão do Status', 'Início Contrato (Contrato) (Contrato DMS)', 'Fim Contrato (Contrato) (Contrato DMS)']
export async function importarPotencialRenovacao(nomeEnviado, buffer) {
  let cabecalho
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    cabecalho = (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0] || []).map(txt)
  } catch {
    throw Object.assign(new Error('O arquivo enviado não é uma planilha Excel válida.'), { status: 400 })
  }
  const faltando = COLUNAS_OBRIGATORIAS.filter(c => !cabecalho.includes(c))
  if (faltando.length) {
    throw Object.assign(new Error(`O arquivo não parece ser a exportação do Potencial Renovação do CRM DAF. Colunas que faltam: ${faltando.join(', ')}.`), { status: 400 })
  }
  const contratos = lerArquivo(buffer)
  if (!contratos.length) throw Object.assign(new Error('O arquivo não tem nenhum contrato.'), { status: 400 })

  // Substitui o arquivo atual da pasta (o mais recente com "Potencial Renovação" no nome); se não houver, grava
  // com o nome enviado — garantindo que o nome tenha o trecho que o BI procura.
  const atuais = (await listar(PASTA))
    .filter(i => i.file && /\.xlsx?$/i.test(i.name || '') && i.name.normalize('NFC').toLowerCase().includes(TRECHO_NOME.normalize('NFC')))
    .sort((a, b) => (b.lastModifiedDateTime || '').localeCompare(a.lastModifiedDateTime || ''))
  const nomeEnviadoOk = nomeEnviado && nomeEnviado.normalize('NFC').toLowerCase().includes(TRECHO_NOME.normalize('NFC'))
  const nomeFinal = atuais[0]?.name
    || (nomeEnviadoOk ? nomeEnviado : `CRM DAF - Plano de Manutenção - Potencial Renovação ${new Date().getFullYear()}.xlsx`)
  try {
    await graphPutArquivo(`${PASTA}/${nomeFinal}`, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  } catch (e) {
    if (e.response?.status === 403 || e.response?.status === 401) {
      throw Object.assign(new Error('O sistema não tem permissão para gravar no SharePoint. O administrador do Azure precisa liberar ao aplicativo a permissão Files.ReadWrite.All (ou Sites.ReadWrite.All).'), { status: 403 })
    }
    throw e
  }
  console.log(`[PotencialRenovacao] importado pelo BI: ${nomeEnviado} → ${PASTA}/${nomeFinal} (${contratos.length} chassi(s))`)
  clearPotencialRenovacaoCache()
  return { arquivo: nomeFinal, contratos: contratos.length, dados: await getPotencialRenovacao() }
}

// Duas telas abrindo juntas aguardam a mesma leitura em vez de baixar tudo duas vezes.
let _emAndamento = null
export function getPotencialRenovacao() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return Promise.resolve(_cache)
  if (!_emAndamento) _emAndamento = carregar().finally(() => { _emAndamento = null })
  return _emAndamento
}

async function carregar() {
  const arquivos = (await listar(PASTA))
    .filter(i => i.file && /\.xlsx?$/i.test(i.name || '') && i.name.normalize('NFC').toLowerCase().includes(TRECHO_NOME.normalize('NFC')))
  const rows = []
  const arquivosLidos = []
  let lastModified = null

  const pendentes = arquivos.filter(i => i['@microsoft.graph.downloadUrl'] && _porArquivo.get(i.id)?.lastModified !== i.lastModifiedDateTime)
  await Promise.all(pendentes.map(async item => {
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 60_000 })
    const contratos = lerArquivo(Buffer.from(resp.data))
    _porArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows: contratos })
    console.log(`[PotencialRenovacao] ${item.name}: ${contratos.length} chassi(s)`)
  }))

  for (const item of arquivos) {
    const lido = _porArquivo.get(item.id)
    if (!lido) continue
    rows.push(...lido.rows)
    arquivosLidos.push({ nome: item.name, linhas: lido.rows.length })
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
  }

  _cache = { rows, arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}

function lerArquivo(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  // A primeira aba traz os dados; a "hiddenSheet" é controle da exportação do CRM.
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const rows = []
  for (const r of linhas) {
    const chassi = txt(r.Chassi)
    if (!chassi) continue
    rows.push({
      grupo: txt(r['Grupo (Contrato) (Contrato DMS)']),
      contrato: txt(r.Contrato),
      criacao: dataSerial(r['Data de Criação']), // data em que o contrato foi cadastrado no CRM DAF
      cliente: txt(r['Cliente (Contrato) (Contrato DMS)']),
      chassi,
      inicio: dataSerial(r['Início Contrato (Contrato) (Contrato DMS)']),
      fim: dataSerial(r['Fim Contrato (Contrato) (Contrato DMS)']),
      status: txt(r['Razão do Status']),
      tipo: txt(r['Tipo (Contrato) (Contrato DMS)']),
    })
  }
  return rows
}
