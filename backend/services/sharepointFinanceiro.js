import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const FILE_PATH_TITULOS = '/Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF/RFN003_PosicaoAnaliticoReceber_Excel.xls'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

export function clearFinanceiroCache() {
  _cache = null
  _cacheTs = 0
}

function toIsoDate(val) {
  if (val === null || val === undefined || val === '') return null
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      const y = val.getUTCFullYear()
      const m = String(val.getUTCMonth() + 1).padStart(2, '0')
      const d = String(val.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (typeof val === 'number') {
      if (val < 1) return null
      const ms = (val - 25569) * 86400 * 1000
      const d = new Date(ms)
      if (isNaN(d.getTime())) return null
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`
    }
    const s = String(val).trim()
    if (!s) return null
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (br) {
      const year = br[3].length === 2 ? `20${br[3]}` : br[3]
      return `${year}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

async function downloadFile() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itemMeta = await graphGet(`/drives/${driveId}/root:${FILE_PATH_TITULOS}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error('Não foi possível obter URL de download do arquivo SharePoint')
  const lastModified = itemMeta.lastModifiedDateTime || null
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return { rows: XLSX.utils.sheet_to_json(sheet, { defval: '' }), lastModified }
}

// Retorna { rows, lastModified } com títulos a receber
export async function getTitulosAReceber() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return _cache

  const { rows, lastModified } = await downloadFile()

  const mapped = rows
    .map(r => ({
      empresa:              String(r['Empresa']                        ?? '').trim(),
      nro_titulo:           String(r['Nro Titulo']                     ?? '').trim(),
      codigo_cliente:       String(r['Código Cliente']                 ?? '').trim(),
      cliente_fornecedor:   String(r['Cliente/Fornecedor']             ?? '').trim(),
      agente_cobrador:      String(r['Agente Cobrador']                ?? '').trim(),
      tipo_titulo:          String(r['Tipo de Título']                 ?? '').trim(),
      nro_lancamento:       String(r['Lanc.'] ?? '').trim(),
      data_emissao:         toIsoDate(r['Emiss.']),
      data_vencimento:      toIsoDate(r['Vencto.']),
      atraso:               parseNum(r['Atr.']),
      os_numero:            String(r['O.S']                            ?? '').trim(),
      conta_gerencial:      String(r['Conta Gerencial']                ?? '').trim(),
      nota_fiscal_servico:  String(r['Nota Fiscal / Nota de Serviço']  ?? '').trim(),
      nota_fiscal:          String(r['Nota Fiscal']                    ?? '').trim(),
      valor:                parseMoney(r['Valor']),
      saldo:                parseMoney(r['Saldo']),
      observacao:           String(r['Observ.']                        ?? '').trim(),
    }))
    .filter(r => r.nro_titulo !== '')

  _cache = { rows: mapped, lastModified }
  _cacheTs = Date.now()
  return _cache
}

// Diagnóstico: colunas e amostra do arquivo
export async function getRfn003Colunas() {
  const { rows } = await downloadFile()
  return {
    colunas: rows.length > 0 ? Object.keys(rows[0]) : [],
    total_linhas: rows.length,
    amostra: rows.slice(0, 3),
  }
}
