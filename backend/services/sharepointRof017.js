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
// Cache por arquivo (por ano) — permite carregar só o(s) ano(s) pedido(s) em vez de sempre
// baixar e parsear todos os arquivos (um por ano, ~30-50 mil linhas cada).
const _fileRowsCache = new Map() // nome do arquivo -> { rows, ts }
let _fileListCache = null
let _fileListTs = 0

export function clearRof017Cache() {
  _fileRowsCache.clear()
  _fileListCache = null
  _fileListTs = 0
}

function extrairAno(nomeArquivo) {
  const m = nomeArquivo.match(/(\d{4})/)
  return m ? Number(m[1]) : null
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

async function listarArquivos() {
  if (_fileListCache && (Date.now() - _fileListTs) < CACHE_TTL_MS) return _fileListCache

  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  const folderData = await graphGet(`/drives/${driveId}/root:${FOLDER_PATH}:/children`)
  const files = (folderData.value || []).filter(f => f.name && f.name.startsWith(FILE_PREFIX))

  if (files.length === 0) {
    throw new Error(`Nenhum arquivo "${FILE_PREFIX}*.xlsx" encontrado em: ${FOLDER_PATH}`)
  }

  _fileListCache = files
  _fileListTs = Date.now()
  return files
}

async function carregarArquivo(file) {
  const cached = _fileRowsCache.get(file.name)
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.rows

  const downloadUrl = file['@microsoft.graph.downloadUrl']
  if (!downloadUrl) {
    console.warn(`[ROF017] Sem URL de download para ${file.name}, pulando.`)
    return []
  }
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  console.log(`[ROF017] ${rows.length} linhas de ${file.name}`)
  _fileRowsCache.set(file.name, { rows, ts: Date.now() })
  return rows
}

// anos: array opcional de anos (ex: [2026]) para carregar só os arquivos correspondentes —
// usado quando a busca já tem um período definido (ambos dataInicio/dataFim), evitando baixar e
// parsear todos os arquivos (um por ano, dezenas de milhares de linhas cada) à toa. Sem o filtro
// (busca por Nº OS, que pode estar em qualquer ano), carrega todos como antes.
async function loadAllRows(anos = null) {
  const files = await listarArquivos()
  const alvo = anos ? files.filter(f => anos.includes(extrairAno(f.name))) : files
  const useFiles = alvo.length > 0 ? alvo : files

  console.log(`[ROF017] ${useFiles.length}/${files.length} arquivo(s)${anos ? ` (anos: ${anos.join(', ')})` : ''}: ${useFiles.map(f => f.name).join(', ')}`)

  // Baixa/parseia os arquivos em paralelo — sequencial custava a soma do tempo de cada arquivo,
  // em paralelo custa só o tempo do mais lento.
  const porArquivo = await Promise.all(useFiles.map(carregarArquivo))
  const allRows = porArquivo.flat()

  if (allRows.length > 0 && !anos) {
    console.log('[ROF017] Colunas:', Object.keys(allRows[0]).join(' | '))
  }

  return allRows
}

/**
 * Retorna uma linha por OS+TipoOS_Sigla+Chassi com valores somados de todos os itens.
 * Usado pelo modal "Importar OS Faturadas".
 *
 * O chassi entra na chave de deduplicação porque o Dealer.net reaproveita números de OS entre
 * unidades/anos diferentes (o arquivo ROF017 é um arquivo por ano, concatenados) — sem o chassi,
 * duas OS de veículos/clientes totalmente distintos que coincidem em número+sigla (ex: OS 1627/G03
 * em 2024 na unidade Dourados e de novo em 2026 na unidade Três Lagoas) caíam na mesma linha: os
 * valores financeiros de ambos os trabalhos eram somados juntos, e só a empresa/cliente/chassi do
 * primeiro arquivo processado ficava visível — escondendo a OS mais recente da busca.
 */
export async function getAllFaturamentosRof017(dataInicio, dataFim, numeroOS = null) {
  // Restringe aos arquivos (anos) do período quando AMBAS as datas (início e fim) são informadas —
  // vale tanto pra busca geral quanto pra busca por Nº OS: se o usuário já informou o período, é
  // ele quem está escolhendo em quais anos procurar (mesmo contrato de um filtro combinado). Sem
  // período, a busca por Nº OS continua olhando todos os anos, pois o Dealer.net reaproveita
  // números de OS entre anos/unidades diferentes (ver OS 1627/1457 nas notas desta função).
  let anos = null
  if (dataInicio && dataFim) {
    const anoIni = Number(String(dataInicio).slice(0, 4))
    const anoFim = Number(String(dataFim).slice(0, 4))
    if (Number.isFinite(anoIni) && Number.isFinite(anoFim) && anoIni <= anoFim) {
      anos = []
      for (let a = anoIni; a <= anoFim; a++) anos.push(a)
    }
  }
  const rows = await loadAllRows(anos)

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
  const colEmpresa = findCol('Empresa_Nome',        'EmpresaNome')
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

    const sigla  = String(r[colSigla] ?? '').trim()
    const chassi = String(r[colChassi] ?? '').trim()
    const key    = `${osNum}||${sigla}||${chassi}`

    if (!osMap.has(key)) {
      osMap.set(key, {
        os_numero:            osNum,
        empresa_nome:         String(r[colEmpresa] ?? '').trim(),
        data_criacao:         toIsoDate(r[colDtCri]),
        nf_data_emissao:      toIsoDate(r[colDtFat]),
        data_liberacao:       toIsoDate(r[colDtEnc]),
        tipo_os_sigla:        sigla,
        tipo_os_descricao:    sigla,
        consultor_nome:       '',
        proprietario_veiculo: String(r[colCliente] ?? '').trim(),
        chassi,
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
 * O arquivo ROF017 é composto por um arquivo por ano (2022 a 2026) concatenados — como o
 * Dealer.net reaproveita a numeração de OS entre anos/ciclos distintos, um mesmo OS_Numero
 * pode identificar OSs completamente diferentes (veículo/cliente/data diferentes) em anos
 * diferentes. Quando o chassi da garantia é informado, ele é usado para desambiguar e
 * garantir que só entrem NFs do OS/ano correto; sem chassi, cai no filtro antigo (OS+sigla).
 * Deduplica por NotaFiscal_Numero e retorna lista de NFs com data de faturamento.
 */
export async function getFaturamentoPorOSRof017(numeroOS, tipoOS, tipoSigla, chassi) {
  const rows = await loadAllRows()
  const osStr     = String(numeroOS ?? '').trim()
  const siglaStr  = String(tipoSigla ?? '').trim().toUpperCase()
  const chassiStr = String(chassi ?? '').trim().toUpperCase()

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
  const colChassi     = findCol('Veiculo_Chassi', 'VeiculoChassi')
  const colProdValor  = findCol('ProdValor')
  const colProdMarg   = findCol('ProdMargem')
  const colServValor  = findCol('ServValor')
  const colServMarg   = findCol('ServMargem')

  // Filtra por OS_Numero
  let candidatos = rows.filter(r => String(r[colOS] ?? '').trim() === osStr)

  if (candidatos.length === 0) {
    console.log(`[ROF017] OS ${osStr} não encontrada`)
    return { _notFound: true, siglas_disponiveis: [] }
  }

  // Desambigua reaproveitamento de número de OS entre anos/ciclos distintos do Dealer.net:
  // se o chassi da garantia foi informado e existe pelo menos uma linha com esse chassi para
  // este OS_Numero, restringe aos registros desse chassi antes de seguir — evita misturar NFs
  // de uma OS de anos diferentes que reaproveitou o mesmo número.
  if (chassiStr) {
    const candidatosChassi = candidatos.filter(r => String(r[colChassi] ?? '').trim().toUpperCase() === chassiStr)
    if (candidatosChassi.length > 0) {
      candidatos = candidatosChassi
    } else {
      console.log(`[ROF017] OS ${osStr} — chassi "${chassiStr}" não encontrado entre as linhas da OS, mantendo todas (possível divergência de cadastro)`)
    }
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
      colunas: { OS: colOS, Sigla: colSigla, NF: colNF, Data: colData, Chassi: colChassi },
      total_linhas_os:    candidatos.length,
      siglas_disponiveis: siglasDisponiveis,
      total_filtrados:    filtrados.length,
      chassi_usado:       chassiStr || null,
    },
  }
}
