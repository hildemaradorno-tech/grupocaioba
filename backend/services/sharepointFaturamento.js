/**
 * sharepointFaturamento.js
 *
 * Lê o arquivo ROF003_OSEMISSAONFNTI*.xlsx do SharePoint e
 * retorna os dados de faturamento de uma OS específica.
 *
 * Pasta SharePoint:
 *   /Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS/
 */

import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const FOLDER_PATH = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const FILE_PREFIX = 'ROF003_OSEMISSAONFNTI'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

function isCacheValid() {
  return _cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS
}

export function clearFaturamentoCache() {
  _cache = null
  _cacheTs = 0
}

function toIsoDate(val) {
  if (val === null || val === undefined || val === '') return null
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      const y  = val.getUTCFullYear()
      const m  = String(val.getUTCMonth() + 1).padStart(2, '0')
      const d  = String(val.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (typeof val === 'number') {
      if (val < 1) return null
      const ms = (val - 25569) * 86400 * 1000
      const dt = new Date(ms)
      if (isNaN(dt.getTime())) return null
      const y  = dt.getUTCFullYear()
      const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
      const dy = String(dt.getUTCDate()).padStart(2, '0')
      return `${y}-${mo}-${dy}`
    }
    const s = String(val).trim()
    if (!s) return null
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
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

async function loadAllRows() {
  if (isCacheValid()) return _cache

  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  // Lista os arquivos da pasta e coleta TODOS que começam com ROF003_OSEMISSAONFNTI
  const folderData = await graphGet(`/drives/${driveId}/root:${FOLDER_PATH}:/children`)
  const files = (folderData.value || []).filter(f => f.name && f.name.startsWith(FILE_PREFIX))

  if (files.length === 0) {
    throw new Error(`Nenhum arquivo "${FILE_PREFIX}*.xlsx" encontrado na pasta SharePoint: ${FOLDER_PATH}`)
  }

  console.log(`[Faturamento] ${files.length} arquivo(s) encontrado(s): ${files.map(f => f.name).join(', ')}`)

  // Lê todos os arquivos e concatena as linhas
  const allRows = []
  for (const file of files) {
    const downloadUrl = file['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      console.warn(`[Faturamento] Sem URL de download para ${file.name}, pulando.`)
      continue
    }
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      timeout: 60_000,
    })
    const buffer = Buffer.from(response.data)
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    console.log(`[Faturamento] ${rows.length} linhas carregadas de ${file.name}`)
    allRows.push(...rows)
  }

  _cache = allRows
  _cacheTs = Date.now()

  // Log das colunas reais do arquivo para diagnóstico
  if (allRows.length > 0) {
    const cols = Object.keys(allRows[0])
    console.log('[Faturamento] Colunas encontradas no arquivo:', cols.join(' | '))
    const amostra = allRows[0]
    console.log('[Faturamento] Amostra Data_Criacao:', JSON.stringify(amostra['Data_Criacao']))
  }

  return allRows
}

export async function getAllFaturamentos(dataInicio, dataFim, numeroOS = null) {
  const rows = await loadAllRows()
  console.log(`[getAllFaturamentos] params: dataInicio=${dataInicio} dataFim=${dataFim} numeroOS=${numeroOS} | total linhas: ${rows.length}`)

  // Amostra dos primeiros valores de Data_Criacao para diagnóstico
  const amostrasDatas = rows.slice(0, 3).map(r => ({
    OS: r['OS_Numero'],
    Data_Criacao_raw: r['Data_Criacao'],
    Data_Criacao_iso: toIsoDate(r['Data_Criacao']),
  }))
  console.log('[getAllFaturamentos] amostra datas:', JSON.stringify(amostrasDatas))

  const osAlvo = numeroOS ? String(numeroOS).trim() : null

  const filtered = rows.filter(r => {
      const osNum = String(r['OS_Numero'] ?? '').trim()
      if (!osNum) return false
      // Quando um número de OS específico é informado, retorna TODOS os tipos
      // daquela OS sem aplicar filtro de data
      if (osAlvo) return osNum === osAlvo
      if (dataInicio || dataFim) {
        const dc = toIsoDate(r['Data_Criacao'])
        if (!dc) return false
        if (dataInicio && dc < dataInicio) return false
        if (dataFim   && dc > dataFim)    return false
      }
      return true
    })
  console.log(`[getAllFaturamentos] após filtro: ${filtered.length} linhas`)
  return filtered
    .map(row => {
      const dataLiberacao = toIsoDate(row['Data_Liberacao']) || null
      return {
        os_numero:            String(row['OS_Numero']               ?? '').trim(),
        empresa_nome:         String(row['Empresa_Nome']            ?? '').trim(),
        data_criacao:         toIsoDate(row['Data_Criacao']),
        nf_data_emissao:      toIsoDate(row['NotaFiscal_DataEmissao']),
        data_liberacao:       dataLiberacao,
        tipo_os_sigla:        String(row['TipoOS_Sigla']            ?? '').trim(),
        tipo_os_descricao:    String(row['TipoOS_Descricao']        ?? '').trim(),
        consultor_nome:       String(row['Consultor_Nome']          ?? '').trim(),
        proprietario_veiculo: String(row['Proprietario_Veiculo']    ?? '').trim(),
        chassi:               String(row['Veiculo_Chassi']          ?? '').trim(),
        modelo_veiculo:       String(row['ModeloVeiculo_Descricao'] ?? '').trim(),
        nf_valor_produto:     parseMoney(row['NotaFiscal_ValorProduto']),
        nf_valor_servico:     parseMoney(row['NotaFiscal_ValorServico']),
      }
    })
}

export async function getFaturamentoPorOS(numeroOS, tipoOS, tipoSigla) {
  const rows = await loadAllRows()
  const osStr      = String(numeroOS   ?? '').trim()
  const tipoStr    = String(tipoOS     ?? '').trim().toLowerCase()
  const siglaStr   = String(tipoSigla  ?? '').trim().toUpperCase()

  // Filtra todas as linhas com o mesmo número de OS
  const candidatos = rows.filter(r => String(r['OS_Numero'] ?? '').trim() === osStr)
  if (candidatos.length === 0) return null

  // 1. Match exato por TipoOS_Descricao
  let row = tipoStr ? candidatos.find(r =>
    String(r['TipoOS_Descricao'] ?? '').trim().toLowerCase() === tipoStr
  ) : null

  // 2. Match por TipoOS_Sigla (ex: "G07")
  if (!row && siglaStr) {
    row = candidatos.find(r =>
      String(r['TipoOS_Sigla'] ?? '').trim().toUpperCase() === siglaStr
    )
  }

  // 3. Match parcial por descrição
  if (!row && tipoStr) {
    row = candidatos.find(r =>
      String(r['TipoOS_Descricao'] ?? '').trim().toLowerCase().includes(tipoStr) ||
      tipoStr.includes(String(r['TipoOS_Descricao'] ?? '').trim().toLowerCase())
    )
  }

  // 4. Fallback: primeiro candidato com a mesma OS
  if (!row) row = candidatos[0]

  if (!row) return null

  return {
    os_numero:          osStr,
    tipo_servico:       String(row['TipoOS_Descricao']         ?? '').trim(),
    nf_data_emissao:    toIsoDate(row['NotaFiscal_DataEmissao']),
    nf_numeros:         String(row['NotaFiscal_Numeros']       ?? '').trim(),
    nf_valor_produto:   parseMoney(row['NotaFiscal_ValorProduto']),
    nf_valor_servico:   parseMoney(row['NotaFiscal_ValorServico']),
    nf_margem_contabil: parseMoney(row['NotaFiscal_MargemContabil']),
  }
}
