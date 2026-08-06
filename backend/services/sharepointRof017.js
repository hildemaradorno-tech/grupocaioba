/**
 * sharepointRof017.js
 *
 * Lê todos os arquivos ROF017_FATURAMENTOPOROS*.xlsx do SharePoint (um por ano).
 * Colunas utilizadas: OS_Numero, TipoOS_Sigla, NotaFiscal_Numero, OSData_Faturamento
 */

import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const FOLDER_PATH = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const FILE_PREFIX = 'ROF017_FATURAMENTOPOROS'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

export function clearRof017Cache() {
  _cache = null
  _cacheTs = 0
}

function isCacheValid() {
  return _cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS
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

async function loadAllRows() {
  if (isCacheValid()) return _cache

  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  const folderData = await graphGet(`/drives/${driveId}/root:${FOLDER_PATH}:/children`)
  const files = (folderData.value || []).filter(f => f.name && f.name.startsWith(FILE_PREFIX))

  if (files.length === 0) {
    throw new Error(`Nenhum arquivo "${FILE_PREFIX}*.xlsx" encontrado em: ${FOLDER_PATH}`)
  }

  console.log(`[ROF017] ${files.length} arquivo(s): ${files.map(f => f.name).join(', ')}`)

  const allRows = []
  for (const file of files) {
    const downloadUrl = file['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      console.warn(`[ROF017] Sem URL de download para ${file.name}, pulando.`)
      continue
    }
    const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
    const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
    console.log(`[ROF017] ${rows.length} linhas de ${file.name}`)
    allRows.push(...rows)
  }

  _cache = allRows
  _cacheTs = Date.now()

  if (allRows.length > 0) {
    console.log('[ROF017] Colunas:', Object.keys(allRows[0]).join(' | '))
    console.log('[ROF017] Amostra:', JSON.stringify(allRows[0]))
  }

  return allRows
}

/**
 * Retorna uma linha por OS+TipoOS_Sigla com valores somados de todos os itens.
 * Usado pelo modal "Importar OS Faturadas".
 */
export async function getAllFaturamentosRof017(dataInicio, dataFim, numeroOS = null) {
  const rows = await loadAllRows()

  const p = rows[0] || {}
  const keys = Object.keys(p)
  const norm = k => k.replace(/[_\s-]/g, '').toUpperCase()
  const findCol = (...cands) => keys.find(k => cands.some(c => norm(k) === norm(c))) || cands[0]

  const colOS      = findCol('OS_Numero',          'OSNumero')
  const colSigla   = findCol('TipoOS_Sigla',        'TipoOSSigla')
  const colDtCri   = findCol('OS_DataCriacao',      'OSDataCriacao',   'Data_Criacao')
  const colDtEnc   = findCol('DataEncerramento',    'OS_DataFechamento')
  const colDtFat   = findCol('OSData_Faturamento',  'OSDataFaturamento')
  const colChassi  = findCol('Veiculo_Chassi',      'VeiculoChassi')
  const colModelo  = findCol('Veiculo_ModeloVeiculoDes', 'ModeloVeiculo')
  const colCliente = findCol('NomPessoa',           'Proprietario_Veiculo')
  const colProd    = findCol('ProdValor')
  const colServ    = findCol('ServValor')

  const osAlvo = numeroOS ? String(numeroOS).trim() : null

  const osMap = new Map()
  for (const r of rows) {
    const osNum = String(r[colOS] ?? '').trim()
    if (!osNum) continue

    if (osAlvo) {
      if (osNum !== osAlvo) continue
    } else if (dataInicio || dataFim) {
      const dc = toIsoDate(r[colDtCri])
      if (!dc) continue
      if (dataInicio && dc < dataInicio) continue
      if (dataFim   && dc > dataFim)    continue
    }

    const sigla = String(r[colSigla] ?? '').trim()
    const key   = `${osNum}||${sigla}`

    if (!osMap.has(key)) {
      osMap.set(key, {
        os_numero:            osNum,
        empresa_nome:         '',
        data_criacao:         toIsoDate(r[colDtCri]),
        nf_data_emissao:      toIsoDate(r[colDtFat]),
        data_liberacao:       toIsoDate(r[colDtEnc]),
        tipo_os_sigla:        sigla,
        tipo_os_descricao:    sigla,
        consultor_nome:       '',
        proprietario_veiculo: String(r[colCliente] ?? '').trim(),
        chassi:               String(r[colChassi]  ?? '').trim(),
        modelo_veiculo:       String(r[colModelo]  ?? '').trim(),
        nf_valor_produto:     0,
        nf_valor_servico:     0,
      })
    }

    const e = osMap.get(key)
    e.nf_valor_produto += Number(r[colProd] ?? 0)
    e.nf_valor_servico += Number(r[colServ] ?? 0)
  }

  console.log(`[ROF017-faturados] ${osMap.size} OS/tipo(s) retornados (osAlvo=${osAlvo ?? 'todos'})`)
  return Array.from(osMap.values())
}

/** Retorna colunas e amostra para diagnóstico */
export async function getRof017Colunas() {
  const rows = await loadAllRows()
  if (rows.length === 0) return { colunas: [], amostra: null, total_linhas: 0 }
  return {
    colunas: Object.keys(rows[0]),
    amostra: rows[0],
    total_linhas: rows.length,
  }
}

/**
 * Busca faturamento de uma OS no ROF017.
 * Filtra por OS_Numero + TipoOS_Sigla (ambos obrigatórios para evitar duplicatas).
 * Deduplica por NotaFiscal_Numero e retorna lista de NFs com data de faturamento.
 */
export async function getFaturamentoPorOSRof017(numeroOS, tipoOS, tipoSigla) {
  const rows = await loadAllRows()
  const osStr    = String(numeroOS   ?? '').trim()
  const siglaStr = String(tipoSigla  ?? '').trim().toUpperCase()

  if (!osStr) return null

  // Detecta nome real das colunas (tenta múltiplas variações do nome)
  const primeiraLinha = rows[0] || {}
  const keys = Object.keys(primeiraLinha)
  const norm = k => k.replace(/[_\s-]/g, '').toUpperCase()

  const findCol = (...candidates) => {
    for (const c of candidates) {
      const hit = keys.find(k => norm(k) === norm(c))
      if (hit) return hit
    }
    return candidates[0]
  }

  const colOS         = findCol('OS_Numero', 'OSNumero', 'Numero_OS', 'NumeroOS')
  const colSigla      = findCol('TipoOS_Sigla', 'TipoOSSigla', 'Tipo_OS_Sigla', 'OS_TipoSigla', 'TipoSigla')
  const colNF         = findCol('NotaFiscal_Numero', 'NotaFiscalNumero', 'NF_Numero', 'NFNumero')
  const colData       = findCol('OSData_Faturamento', 'OSDataFaturamento', 'Data_Faturamento', 'DataFaturamento')
  const colProdValor  = findCol('ProdValor')
  const colProdMarg   = findCol('ProdMargem')
  const colServValor  = findCol('ServValor')
  const colServMarg   = findCol('ServMargem')

  // Filtra por OS_Numero
  const candidatos = rows.filter(r => String(r[colOS] ?? '').trim() === osStr)

  if (candidatos.length === 0) {
    console.log(`[ROF017] OS ${osStr} não encontrada`)
    return { _notFound: true, siglas_disponiveis: [] }
  }

  // Log das siglas disponíveis para esta OS (diagnóstico)
  const siglasDisponiveis = [...new Set(candidatos.map(r => String(r[colSigla] ?? '').trim()))].filter(Boolean)
  console.log(`[ROF017] OS ${osStr} — siglas: [${siglasDisponiveis.join(', ')}] | buscando: "${siglaStr}"`)

  // Filtra por TipoOS_Sigla — obrigatório para evitar mistura de tipos
  let filtrados = candidatos
  if (siglaStr) {
    filtrados = candidatos.filter(r =>
      String(r[colSigla] ?? '').trim().toUpperCase() === siglaStr
    )
    if (filtrados.length === 0) {
      console.log(`[ROF017] Sigla "${siglaStr}" não encontrada. Disponíveis: [${siglasDisponiveis.join(', ')}]`)
      return { _notFound: true, siglas_disponiveis: siglasDisponiveis }
    }
  }

  // Agrupa por NotaFiscal_Numero — soma valores financeiros (relatório analítico)
  const nfMap = new Map()
  for (const r of filtrados) {
    const nfNum = String(r[colNF] ?? '').trim()
    if (!nfNum) continue
    if (!nfMap.has(nfNum)) {
      nfMap.set(nfNum, {
        numero:          nfNum,
        data_faturamento: toIsoDate(r[colData]),
        prod_valor:  0,
        prod_margem: 0,
        serv_valor:  0,
        serv_margem: 0,
      })
    }
    const entry = nfMap.get(nfNum)
    entry.prod_valor  += Number(r[colProdValor] ?? 0)
    entry.prod_margem += Number(r[colProdMarg]  ?? 0)
    entry.serv_valor  += Number(r[colServValor] ?? 0)
    entry.serv_margem += Number(r[colServMarg]  ?? 0)
  }

  if (nfMap.size === 0) return null

  // Calcula percentuais de margem por NF
  const notas_fiscais = Array.from(nfMap.values()).map(nf => ({
    ...nf,
    prod_marg_perc: nf.prod_valor > 0 ? (nf.prod_margem / nf.prod_valor) * 100 : null,
    serv_marg_perc: nf.serv_valor > 0 ? (nf.serv_margem / nf.serv_valor) * 100 : null,
  }))

  const nf_numeros      = notas_fiscais.map(n => n.numero).join('/')
  const nf_data_emissao = notas_fiscais[0]?.data_faturamento || null

  // Totais consolidados (soma de todas as NFs)
  const total_prod_valor  = notas_fiscais.reduce((s, n) => s + n.prod_valor, 0)
  const total_prod_margem = notas_fiscais.reduce((s, n) => s + n.prod_margem, 0)
  const total_serv_valor  = notas_fiscais.reduce((s, n) => s + n.serv_valor, 0)
  const total_serv_margem = notas_fiscais.reduce((s, n) => s + n.serv_margem, 0)

  console.log(`[ROF017] OS ${osStr}/${siglaStr} → ${notas_fiscais.length} NF(s): [${notas_fiscais.map(n => n.numero).join(', ')}]`)

  return {
    os_numero:      osStr,
    tipo_os_sigla:  siglaStr,
    notas_fiscais,
    nf_numeros,
    nf_data_emissao,
    nf_valor_produto:   total_prod_valor  || null,
    nf_valor_servico:   total_serv_valor  || null,
    nf_margem_contabil: total_prod_margem + total_serv_margem || null,
    _diag: {
      colunas: { OS: colOS, Sigla: colSigla, NF: colNF, Data: colData },
      total_linhas_os:    candidatos.length,
      siglas_disponiveis: siglasDisponiveis,
      total_filtrados:    filtrados.length,
    },
  }
}
