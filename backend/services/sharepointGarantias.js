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
import { getSupabaseAdmin } from './supabaseAdmin.js'

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

// Só metadados do ROF001_OSABERTA (sem baixar o Excel) — data de atualização para a Auditoria
export async function getOsAbertasInfo() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itemMeta = await graphGet(`/drives/${driveId}/root:${FILE_PATH}`)
  return { nome: itemMeta.name || null, lastModified: itemMeta.lastModifiedDateTime || null }
}

// Retorna { rows, lastModified } do ROF001_OSABERTA sem filtro de fechamento
export async function getOsAbertasGeral() {
  const { rows, lastModified } = await downloadExcel(FILE_PATH)
  return {
    rows: rows.map(mapOsRow).filter(r => r.os_numero !== ''),
    lastModified,
  }
}

// ── Com Garantista (Em Aberto): O.S. de garantia dos arquivos "ROF001_OSAberta_Excel <ano>" ──────────────
// Um arquivo por ano com TODAS as O.S. e a coluna "Situacao Tipo OS" (Faturada, Encerrada, Pendente de
// Autorização de Encerramento, Cancelada...). Devolve só os tipos classificados como Garantia (dim_tipos_os),
// em todas as situações: a tela importa só as Encerradas e usa as
// demais (ex.: Faturada) para avisar as garantias cadastradas que saíram de Encerrada.
// A mesma O.S. em mais de um arquivo vale a do arquivo modificado por último.
const PASTA_OS = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIX_OS_EXCEL = 'ROF001_OSABERTA_EXCEL'
// Só as Encerradas entram na aba (Pendente de Autorização de Encerramento não é importada)
export const SITUACOES_COM_GARANTISTA = new Set(['Encerrada'])

let _cacheEncerrada = null
let _cacheTsEncerrada = 0
const _encPorArquivo = new Map() // id → { lastModified, rows } — só baixa de novo o arquivo que mudou

export function clearEncerradasCache() {
  _cacheEncerrada = null
  _cacheTsEncerrada = 0
}

async function listarPastaOs() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itens = []
  let url = `/drives/${driveId}/root:${PASTA_OS}:/children?$top=200`
  while (url) {
    const r = await graphGet(url)
    itens.push(...(r.value || []))
    url = r['@odata.nextLink'] ? r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null
  }
  return itens
}

// Tipos de O.S. de garantia (sigla → descrição) do Cadastro de Tipos de OS
async function tiposGarantia() {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const { data, error } = await admin.from('dim_tipos_os').select('sigla, tipo_os, classificacao')
  if (error) return null
  const m = new Map()
  for (const t of data || []) {
    if (t.classificacao !== 'Garantia' || !t.sigla) continue
    const s = String(t.sigla).trim().toUpperCase()
    if (!m.has(s)) m.set(s, String(t.tipo_os || s).trim())
  }
  return m
}

function mapOsRowExcel(row) {
  return {
    os_numero:            String(row['OS Numero']               ?? '').trim(),
    tipo_os_sigla:        String(row['Tipo OS Sigla']           ?? '').trim().toUpperCase(),
    tipo_os_descricao:    '',
    consultor_nome:       String(row['Consultor Nome']          ?? '').trim(),
    produtivo_nome:       String(row['Produtivo Nome']          ?? '').trim(),
    proprietario_veiculo: String(row['Proprietario Veiculo']    ?? '').trim(),
    empresa_nome:         String(row['Empresa']                 ?? '').trim(),
    veiculo_chassi:       String(row['Veiculo Chassi']          ?? '').trim(),
    veiculo_placa:        String(row['Veiculo Placa']           ?? '').trim(),
    modelo_veiculo:       String(row['Modelo Veiculo Descricao']?? '').trim(),
    servico:              parseMoney(row['Servico']),
    produto:              parseMoney(row['Produto']),
    total:                parseMoney(row['Total']),
    data_criacao:         toIsoDate(row['Data Criacao']),
    fechado_data:         toIsoDate(row['Fechado']),
    situacao:             String(row['Situacao Tipo OS']        ?? '').trim(),
  }
}

// Retorna { rows, lastModified, arquivos } — O.S. de garantia de todos os arquivos ROF001_OSAberta_Excel
export async function getOsEncerradas() {
  if (_cacheEncerrada !== null && (Date.now() - _cacheTsEncerrada) < CACHE_TTL_MS) return _cacheEncerrada
  const [itens, tipos] = await Promise.all([listarPastaOs(), tiposGarantia()])
  const arquivos = itens.filter(i => i.file && String(i.name || '').toUpperCase().startsWith(PREFIX_OS_EXCEL))
  if (arquivos.length === 0) throw new Error('Nenhum arquivo ROF001_OSAberta_Excel encontrado no SharePoint')

  // Um arquivo por vez (são grandes); arquivo sem alteração vem da memória
  for (const item of arquivos) {
    if (_encPorArquivo.get(item.id)?.lastModified === item.lastModifiedDateTime) continue
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 120_000 })
    const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer', cellDates: true })
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
    const rows = linhas.map(mapOsRowExcel)
      .filter(r => r.os_numero !== '' && (tipos ? tipos.has(r.tipo_os_sigla) : /^G\d/.test(r.tipo_os_sigla)))
    _encPorArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows })
    console.log(`[GarantiasDaf] ${item.name}: ${rows.length} O.S. de garantia`)
    await new Promise(r => setImmediate(r))
  }

  // Do mais antigo para o mais recente: a O.S. repetida fica com os dados do arquivo mais novo
  const porOs = new Map()
  let lastModified = null
  for (const item of [...arquivos].sort((a, b) => a.lastModifiedDateTime.localeCompare(b.lastModifiedDateTime))) {
    const lido = _encPorArquivo.get(item.id)
    if (!lido) continue
    for (const r of lido.rows) porOs.set(`${r.empresa_nome.toUpperCase()}|${r.os_numero}|${r.tipo_os_sigla}`, r)
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
  }
  // rows: O.S. que ficam na aba (Encerrada), completas.
  // outras: só O.S., tipo, empresa e situação das demais (Faturada, Cancelada, Pendente...) — para os avisos.
  const rows = [], outras = []
  for (const r of porOs.values()) {
    // Encerrada sem valor (sem serviço e sem peça) não entra — o antigo ROF001_OSABERTA_ENCERRADA já não trazia
    if (SITUACOES_COM_GARANTISTA.has(r.situacao) && !(Number(r.total) > 0)) {
      outras.push({ os_numero: r.os_numero, tipo_os_sigla: r.tipo_os_sigla, empresa_nome: r.empresa_nome, situacao: `${r.situacao} sem valor` })
      continue
    }
    if (SITUACOES_COM_GARANTISTA.has(r.situacao)) rows.push({ ...r, tipo_os_descricao: tipos?.get(r.tipo_os_sigla) || r.tipo_os_sigla })
    else outras.push({ os_numero: r.os_numero, tipo_os_sigla: r.tipo_os_sigla, empresa_nome: r.empresa_nome, situacao: r.situacao })
  }

  _cacheEncerrada = { rows, outras, lastModified, arquivos: arquivos.map(a => a.name).sort() }
  _cacheTsEncerrada = Date.now()
  return _cacheEncerrada
}

// ── Tempo na Oficina (Auditoria O.S. Aberta › Controle): O.S. FECHADAS dos arquivos "ROF001_OSAberta_Excel <ano>",
// todos os tipos, com Data Criação (entrada) e Fechado (saída). Canceladas ficam de fora. Mesmo critério de
// repetição do getOsEncerradas: a mesma O.S./tipo em mais de um arquivo vale a do arquivo modificado por último.
// Guarda por arquivo só os campos usados (arquivos grandes) e só baixa de novo o arquivo que mudou.
const _fechadasPorArquivo = new Map() // id → { lastModified, rows }

function linhaTempoOficina(row) {
  const r = mapOsRowExcel(row)
  if (!r.os_numero || !r.fechado_data || !r.data_criacao) return null
  if (/cancel/i.test(r.situacao)) return null
  return {
    os_numero: r.os_numero, tipo_os_sigla: r.tipo_os_sigla, consultor_nome: r.consultor_nome,
    proprietario_veiculo: r.proprietario_veiculo, empresa_nome: r.empresa_nome, veiculo_placa: r.veiculo_placa,
    veiculo_chassi: r.veiculo_chassi, total: r.total, data_criacao: r.data_criacao, fechado_data: r.fechado_data,
    situacao: r.situacao,
  }
}

// de/ate (YYYY-MM-DD) filtram pela data de saída (Fechado); empresa = Empresa_Nome (opcional, sem diferenciar maiúsculas)
export async function getOsTempoOficina({ de, ate, empresa } = {}) {
  const itens = await listarPastaOs()
  const arquivos = itens.filter(i => i.file && String(i.name || '').toUpperCase().startsWith(PREFIX_OS_EXCEL))
  if (arquivos.length === 0) throw new Error('Nenhum arquivo ROF001_OSAberta_Excel encontrado no SharePoint')

  for (const item of arquivos) {
    if (_fechadasPorArquivo.get(item.id)?.lastModified === item.lastModifiedDateTime) continue
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 120_000 })
    const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer', cellDates: true })
    const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
    const rows = []
    for (const l of linhas) { const r = linhaTempoOficina(l); if (r) rows.push(r) }
    _fechadasPorArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows })
    console.log(`[TempoOficina] ${item.name}: ${rows.length} linhas de O.S. fechadas`)
    await new Promise(r => setImmediate(r))
  }

  const emp = (empresa || '').trim().toUpperCase()
  const porOs = new Map()
  let lastModified = null
  for (const item of [...arquivos].sort((a, b) => a.lastModifiedDateTime.localeCompare(b.lastModifiedDateTime))) {
    const lido = _fechadasPorArquivo.get(item.id)
    if (!lido) continue
    for (const r of lido.rows) {
      if (emp && r.empresa_nome.toUpperCase() !== emp) continue
      porOs.set(`${r.empresa_nome.toUpperCase()}|${r.os_numero}|${r.tipo_os_sigla}`, r)
    }
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
  }
  const rows = [...porOs.values()].filter(r => (!de || r.fechado_data >= de) && (!ate || r.fechado_data <= ate))
  return { rows, lastModified, arquivos: arquivos.map(a => a.name).sort() }
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
