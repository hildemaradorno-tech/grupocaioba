import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// Contratos de Plano de Manutenção DAF com potencial de renovação (exportação do CRM DAF,
// "Potencial Renovação 2026.xlsx"). Uma linha por chassi do contrato; o mesmo contrato pode ter vários chassis.
const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Planos de Manutenção'
const PREFIX = 'Potencial Renovação'

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

// Duas telas abrindo juntas aguardam a mesma leitura em vez de baixar tudo duas vezes.
let _emAndamento = null
export function getPotencialRenovacao() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return Promise.resolve(_cache)
  if (!_emAndamento) _emAndamento = carregar().finally(() => { _emAndamento = null })
  return _emAndamento
}

async function carregar() {
  const arquivos = (await listar(PASTA))
    .filter(i => i.file && i.name?.toLowerCase().startsWith(PREFIX.toLowerCase()))
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
