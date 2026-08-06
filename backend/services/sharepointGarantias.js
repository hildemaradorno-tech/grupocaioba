/**
 * sharepointGarantias.js
 *
 * Lê o arquivo ROF001_OSABERTA.xlsx do SharePoint e retorna apenas
 * as OS com TipoOS_Classificacao === 'GAR' (Garantia).
 *
 * Pasta SharePoint:
 *   /Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS/ROF001_OSABERTA.xlsx
 */

import * as XLSX from 'xlsx'
import axios    from 'axios'
import { graphGet } from './graphClient.js'

const FILE_PATH = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS/ROF001_OSABERTA.xlsx'

// Cache simples — 5 minutos (arquivo pesado, evita downloads repetidos)
const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

function isCacheValid() {
  return _cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS
}

export function clearGarantiasCache() {
  _cache = null
  _cacheTs = 0
}

// Converte qualquer valor de data do Excel para 'YYYY-MM-DD'
// Suporta: JS Date, número serial Excel, ISO string, DD/MM/YYYY
function toIsoDate(val) {
  if (val === null || val === undefined || val === '') return null
  try {
    // JS Date object (cellDates: true)
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      // Usar UTC para evitar deslocamento de fuso
      const y = val.getUTCFullYear()
      const m = String(val.getUTCMonth() + 1).padStart(2, '0')
      const d = String(val.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    // Número serial Excel (ex: 45678)
    if (typeof val === 'number') {
      if (val < 1) return null
      // Fórmula padrão: epoch Excel = 1900-01-01, ajuste para UTC
      const ms = (val - 25569) * 86400 * 1000
      const d  = new Date(ms)
      if (isNaN(d.getTime())) return null
      const y = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dy = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${mo}-${dy}`
    }
    const s = String(val).trim()
    if (!s) return null
    // Formato brasileiro: DD/MM/YYYY
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2].padStart(2,'0')}-${br[1].padStart(2,'0')}`
    // ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    // Fallback
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

// Converte valor monetário (pode vir como string "1.234,56" ou number)
function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

const FILE_PATH_ENCERRADA = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS/ROF001_OSABERTA_ENCERRADA.xlsx'

// Helper para baixar e parsear qualquer arquivo Excel do SharePoint
// Retorna { rows, lastModified } onde lastModified é ISO string da última modificação
async function downloadExcel(filePath) {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itemMeta = await graphGet(`/drives/${driveId}/root:${filePath}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error('Não foi possível obter URL de download do arquivo SharePoint')
  const lastModified = itemMeta.lastModifiedDateTime || null
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return { rows: XLSX.utils.sheet_to_json(sheet, { defval: '' }), lastModified }
}

function pickFechadoData(row) {
  // Tenta múltiplos nomes de coluna que o arquivo ENCERRADA pode usar
  const candidates = ['Fechado', 'DataEncerramento', 'Data_Encerramento', 'DataFechamento', 'Data_Fechamento', 'Encerramento', 'Fechamento', 'Data_Fechado', 'DataFechado']
  for (const c of candidates) {
    const v = toIsoDate(row[c])
    if (v) return v
  }
  return null
}

function mapOsRow(row) {
  return {
    os_numero:            String(row['OS_Numero']              ?? '').trim(),
    tipo_os_sigla:        String(row['TipoOS_Sigla']           ?? '').trim(),
    tipo_os_descricao:    String(row['TipoOS_Descricao']       ?? '').trim(),
    consultor_nome:       String(row['Consultor_Nome']         ?? '').trim(),
    produtivo_nome:       String(row['Produtivo_Nome']         ?? '').trim(),
    proprietario_veiculo: String(row['Proprietario_Veiculo']   ?? '').trim(),
    empresa_nome:         String(row['Empresa_Nome']           ?? '').trim(),
    veiculo_chassi:       String(row['Veiculo_Chassi']         ?? '').trim(),
    veiculo_placa:        String(row['Veiculo_Placa']          ?? '').trim(),
    modelo_veiculo:       String(row['ModeloVeiculo_Descricao']?? '').trim(),
    servico:              parseMoney(row['Servico']),
    produto:              parseMoney(row['Produto']),
    total:                parseMoney(row['Total']),
    data_criacao:         toIsoDate(row['Data_Criacao']),
    fechado_data:         pickFechadoData(row),
  }
}

// Retorna { rows, lastModified } do ROF001_OSABERTA sem filtro de fechamento
export async function getOsAbertasGeral() {
  const { rows, lastModified } = await downloadExcel(FILE_PATH)
  return {
    rows: rows.map(mapOsRow).filter(r => r.os_numero !== ''),
    lastModified,
  }
}

// Cache para o arquivo de encerradas
let _cacheEncerrada = null
let _cacheTsEncerrada = 0

export function clearEncerradasCache() {
  _cacheEncerrada = null
  _cacheTsEncerrada = 0
}

// Retorna { rows, lastModified } do arquivo de encerradas — ROF001_OSABERTA_ENCERRADA
export async function getOsEncerradas() {
  if (_cacheEncerrada !== null && (Date.now() - _cacheTsEncerrada) < CACHE_TTL_MS) return _cacheEncerrada
  const { rows, lastModified } = await downloadExcel(FILE_PATH_ENCERRADA)
  _cacheEncerrada = {
    rows: rows.map(mapOsRow).filter(r => r.os_numero !== ''),
    lastModified,
  }
  _cacheTsEncerrada = Date.now()
  return _cacheEncerrada
}

export async function getRof001Colunas() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  const itemMeta = await graphGet(`/drives/${driveId}/root:${FILE_PATH}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return { colunas: rows.length > 0 ? Object.keys(rows[0]) : [], total_linhas: rows.length }
}

export async function getRof001EncerradaColunas() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  const itemMeta = await graphGet(`/drives/${driveId}/root:${FILE_PATH_ENCERRADA}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  const amostra = rows[0] || {}
  return {
    colunas: Object.keys(amostra),
    amostra,
    total_linhas: rows.length,
  }
}

export async function getOsAbertasGarantia() {
  if (isCacheValid()) return _cache

  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  // 1. Obtém metadados do arquivo (inclui @microsoft.graph.downloadUrl)
  const itemMeta = await graphGet(`/drives/${driveId}/root:${FILE_PATH}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error('Não foi possível obter URL de download do arquivo SharePoint')

  // 2. Baixa o buffer do arquivo Excel
  const response = await axios.get(downloadUrl, {
    responseType: 'arraybuffer',
    timeout: 60_000,
  })
  const buffer = Buffer.from(response.data)

  // 3. Parseia o Excel com datas nativas
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  // 4. Filtra somente classificação GAR e mapeia campos
  // A coluna 'Fechado' contém um Date quando a OS está fechada, ou "" quando está aberta
  const result = rows
    .filter(row => String(row['TipoOS_Classificacao'] ?? '').trim().toUpperCase() === 'GAR')
    .map(row => {
      const fechadoData = toIsoDate(row['Fechado']) || null

      return {
        os_numero:            String(row['OS_Numero']              ?? '').trim(),
        tipo_os_sigla:        String(row['TipoOS_Sigla']           ?? '').trim(),
        tipo_os_descricao:    String(row['TipoOS_Descricao']       ?? '').trim(),
        consultor_nome:       String(row['Consultor_Nome']         ?? '').trim(),
        produtivo_nome:       String(row['Produtivo_Nome']         ?? '').trim(),
        proprietario_veiculo: String(row['Proprietario_Veiculo']   ?? '').trim(),
        empresa_nome:         String(row['Empresa_Nome']           ?? '').trim(),
        veiculo_chassi:       String(row['Veiculo_Chassi']         ?? '').trim(),
        veiculo_placa:        String(row['Veiculo_Placa']          ?? '').trim(),
        modelo_veiculo:       String(row['ModeloVeiculo_Descricao']?? '').trim(),
        servico:              parseMoney(row['Servico']),
        produto:              parseMoney(row['Produto']),
        total:                parseMoney(row['Total']),
        data_criacao:         toIsoDate(row['Data_Criacao']),
        fechado_data:         fechadoData,
        fechado:              !!fechadoData,
      }
    })
    .filter(r => r.os_numero !== '')  // descarta linhas sem número de OS

  _cache = result
  _cacheTs = Date.now()
  return result
}
