import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF'
const FILE_TITULOS = `${PASTA}/RFN003_POSICAOTITULOARECEBER.xlsx`
const FILE_CREDITOS = `${PASTA}/RFN024_SALDOCREDITOSNAOIDENTIFICADOS.xlsx`
const FILE_REPASSES = `${PASTA}/contas-receber-daf.xlsx`

const CACHE_TTL_MS = 5 * 60 * 1000
const _cache = { titulos: null, creditos: null, repasses: null }
const _cacheTs = { titulos: 0, creditos: 0, repasses: 0 }

export function clearTruckPagTitulosCache() { _cache.titulos = null; _cacheTs.titulos = 0 }
export function clearTruckPagCreditosCache() { _cache.creditos = null; _cacheTs.creditos = 0 }
export function clearTruckPagRepassesCache() { _cache.repasses = null; _cacheTs.repasses = 0 }

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
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    }
    const s = String(val).trim()
    if (!s) return null
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (br) {
      const year = br[3].length === 2 ? `20${br[3]}` : br[3]
      return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

function parseMoney(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : n
}

function parsePercent(val) {
  if (val === null || val === undefined || val === '') return null
  const s = String(val).replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return isNaN(n) ? null : n
}

async function downloadWorkbook(filePath) {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itemMeta = await graphGet(`/drives/${driveId}/root:${filePath}`)
  const downloadUrl = itemMeta['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error('Não foi possível obter URL de download do arquivo SharePoint')
  const lastModified = itemMeta.lastModifiedDateTime || null
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  const workbook = XLSX.read(Buffer.from(response.data), { type: 'buffer', cellDates: true })
  return { workbook, lastModified }
}

// Posição de títulos a receber TruckPag (RFN003) — substitui a tabela inteira a cada atualização.
// O arquivo do SharePoint traz TODOS os agrupamentos financeiros da concessionária (carteira,
// bancos, garantia, comissão etc.), não só TruckPag — precisa filtrar por Agrupamento='TRUCKPAG'.
export async function getTruckPagTitulos() {
  if (_cache.titulos !== null && (Date.now() - _cacheTs.titulos) < CACHE_TTL_MS) return _cache.titulos

  const { workbook, lastModified } = await downloadWorkbook(FILE_TITULOS)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const rows = raw
    .filter(r => String(r.Agrupamento ?? '').trim().toUpperCase() === 'TRUCKPAG')
    .map(r => ({
      titulo_codigo: parseNum(r.TituloCodigo),
      titulo_numero: String(r.TituloNumero ?? '').trim(),
      titulo_parcela: parseNum(r.TituloParcela),
      titulo_empresa_cod: parseNum(r.TituloEmpresaCod),
      titulo_empresa_nome: String(r.TituloEmpresaNome ?? '').trim(),
      titulo_os_numero: String(r.TituloOSnumero ?? '').trim(),
      titulo_nota_fiscal_numero: String(r.TituloNotaFiscalNumero ?? '').trim(),
      titulo_nota_fiscal_elet_serv_numero: String(r.TituloNotaFiscalEletServNumero ?? '').trim(),
      titulo_pessoa_nome: String(r.TituloPessoaNome ?? '').trim(),
      titulo_pessoa_doc_ident: String(r.TituloPessoaDocIdent ?? '').trim(),
      titulo_data_emissao: toIsoDate(r.TituloDataEmissao),
      titulo_data_venc: toIsoDate(r.TituloDataVenc),
      titulo_dias_atraso: parseNum(r.TituloDiasAtraso),
      titulo_saldo: parseMoney(r.TituloSaldo),
      titulo_valor: parseMoney(r.TituloValor),
      tipo_titulo_descr: String(r.TipoTituloDescr ?? '').trim(),
      departamento_sigla: String(r.DepartamentoSigla ?? '').trim(),
      titulo_vendedor_nome: String(r.TituloVendedorNome ?? '').trim(),
      is_vencido: Number(r.IsVencido) === 1,
    }))
    .filter(l => l.titulo_codigo)

  _cache.titulos = { rows, lastModified }
  _cacheTs.titulos = Date.now()
  return _cache.titulos
}

// Créditos na tesouraria ainda não identificados/baixados (RFN024) — substitui a tabela inteira.
export async function getTruckPagCreditos() {
  if (_cache.creditos !== null && (Date.now() - _cacheTs.creditos) < CACHE_TTL_MS) return _cache.creditos

  const { workbook, lastModified } = await downloadWorkbook(FILE_CREDITOS)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const rows = raw
    .map(r => ({
      tesouraria_codigo: parseNum(r.Tesouraria_Codigo),
      empresa_desc: String(r.Tesouraria_EmpresaDes ?? '').trim(),
      conta_gerencial_desc: String(r.Tesouraria_ContaGerencialDes ?? '').trim(),
      data_caixa: toIsoDate(r.Tesouraria_DataCaixa),
      observacao: String(r.Tesouraria_Observacao ?? '').trim(),
      nro_documento: String(r.Tesouraria_NroDocumento ?? '').trim(),
      valor: parseMoney(r.Tesouraria_Valor),
    }))
    .filter(l => l.tesouraria_codigo)

  _cache.creditos = { rows, lastModified }
  _cacheTs.creditos = Date.now()
  return _cache.creditos
}

// Repasses recebidos da TruckPag (contas-receber-daf.xlsx) — o arquivo real tem UM BLOCO POR
// ESTABELECIMENTO (Dourados, Três Lagoas, Campo Grande...), cada bloco repetindo o mesmo layout:
// "Estabelecimento" (label + valor), "Data pagamento" (label + valor), cabeçalho de colunas,
// linhas de dados, depois linha(s) em branco até o próximo bloco. Precisa varrer o arquivo
// inteiro reconhecendo cada bloco, não só o primeiro. Histórico cumulativo (upsert no Supabase).
function linhaEmBranco(row) {
  return !row || row.every(c => String(c ?? '').trim() === '')
}

export async function getTruckPagRepasses() {
  if (_cache.repasses !== null && (Date.now() - _cacheTs.repasses) < CACHE_TTL_MS) return _cache.repasses

  const { workbook, lastModified } = await downloadWorkbook(FILE_REPASSES)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const rows = []
  let i = 0
  let blocosEncontrados = 0
  while (i < linhas.length) {
    const primeiraCelula = String(linhas[i]?.[0] ?? '').trim()
    if (primeiraCelula !== 'Estabelecimento') { i++; continue }

    blocosEncontrados++
    const estabelecimento = String(linhas[i + 1]?.[0] ?? '').trim()
    const dataPagamento = toIsoDate(linhas[i + 3]?.[0])
    const cabecalho = (linhas[i + 4] || []).map(c => String(c ?? '').trim())
    const colIdx = (nome) => cabecalho.indexOf(nome)
    const idx = {
      nfE: colIdx('Nº NF-e'),
      nfsE: colIdx('Nº NFS-e'),
      os: colIdx('Nº OS'),
      lote: colIdx('Nº lote'),
      parcelas: colIdx('Parcelas'),
      cnpj: colIdx('CNPJ do cliente'),
      nome: colIdx('Nome do cliente'),
      valorOS: colIdx('Valor OS'),
      valorNfE: colIdx('Valor NF-e'),
      valorTotalParcela: colIdx('Valor total parcela'),
      taxaPct: colIdx('Taxa adm (%)'),
      valorTaxa: colIdx('Valor taxa'),
      valorRecebido: colIdx('Valor recebido'),
    }

    let j = i + 5
    if (dataPagamento && idx.lote !== -1 && idx.valorRecebido !== -1) {
      for (; j < linhas.length; j++) {
        const r = linhas[j]
        if (linhaEmBranco(r)) break
        if (String(r[0] ?? '').trim() === 'Estabelecimento') break
        const lote = String(r[idx.lote] ?? '').trim()
        if (!lote) continue
        rows.push({
          estabelecimento,
          data_pagamento: dataPagamento,
          nf_e: String(r[idx.nfE] ?? '').trim(),
          nfs_e: String(r[idx.nfsE] ?? '').trim(),
          numero_os: String(r[idx.os] ?? '').trim(),
          numero_lote: lote,
          parcelas: String(r[idx.parcelas] ?? '').trim(),
          cnpj_cliente: String(r[idx.cnpj] ?? '').trim(),
          nome_cliente: String(r[idx.nome] ?? '').trim(),
          valor_os: parseMoney(r[idx.valorOS]),
          valor_nf_e: parseMoney(r[idx.valorNfE]),
          valor_parcela_total: parseMoney(r[idx.valorTotalParcela]),
          taxa_adm_pct: parsePercent(r[idx.taxaPct]),
          valor_taxa: parseMoney(r[idx.valorTaxa]),
          valor_recebido: parseMoney(r[idx.valorRecebido]),
        })
      }
    }
    i = j
  }

  if (blocosEncontrados === 0) throw new Error('Formato do arquivo de repasse não reconhecido — nenhum bloco "Estabelecimento" encontrado.')
  if (rows.length === 0) throw new Error('Nenhuma linha de repasse encontrada no arquivo.')

  _cache.repasses = { rows, lastModified }
  _cacheTs.repasses = Date.now()
  return _cache.repasses
}
