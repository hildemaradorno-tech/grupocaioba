import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF'
const FILE_TITULOS = `${PASTA}/RFN003_PosicaoAnaliticoReceber_Excel.xls`
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
// O arquivo do SharePoint (relatório Analítico) traz TODOS os agentes cobradores da
// concessionária (bancos, carteira, garantia etc.), não só TruckPag — precisa filtrar por
// Agente Cobrador='TRUCKPAG'. Guarda a linha crua inteira em dados_extra (todas as colunas do
// arquivo), além de mapear os campos já usados na conciliação título×repasse.
export async function getTruckPagTitulos() {
  if (_cache.titulos !== null && (Date.now() - _cacheTs.titulos) < CACHE_TTL_MS) return _cache.titulos

  const { workbook, lastModified } = await downloadWorkbook(FILE_TITULOS)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' })

  const rows = raw
    .filter(r => String(r['Agente Cobrador'] ?? '').trim().toUpperCase() === 'TRUCKPAG')
    .map(r => {
      const diasAtraso = parseNum(r['Atr.'])
      return {
        titulo_codigo: parseNum(r['Lanc.']),
        titulo_numero: String(r['Nro Titulo'] ?? '').trim(),
        titulo_parcela: null,
        titulo_empresa_cod: null,
        titulo_empresa_nome: String(r.Empresa ?? '').trim(),
        titulo_os_numero: String(r['O.S'] ?? '').trim(),
        titulo_nota_fiscal_numero: String(r['Nota Fiscal'] ?? '').trim(),
        titulo_nota_fiscal_elet_serv_numero: String(r['Nota Fiscal / Nota de Serviço'] ?? '').trim(),
        titulo_pessoa_nome: String(r['Cliente/Fornecedor'] ?? '').trim(),
        titulo_pessoa_doc_ident: String(r['CNPJ/CPF'] ?? '').trim(),
        titulo_data_emissao: toIsoDate(r['Emiss.']),
        titulo_data_venc: toIsoDate(r['Vencto.']),
        titulo_dias_atraso: diasAtraso,
        titulo_saldo: parseMoney(r.Saldo),
        titulo_valor: parseMoney(r.Valor),
        tipo_titulo_descr: String(r['Tipo de Título'] ?? '').trim(),
        departamento_sigla: String(r['Depart.'] ?? '').trim(),
        titulo_vendedor_nome: String(r.Vendedor ?? '').trim(),
        is_vencido: (diasAtraso ?? 0) > 0,
        dados_extra: r,
      }
    })
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
// ESTABELECIMENTO (Dourados, Três Lagoas, Campo Grande...) e, DENTRO de cada um, MUITOS
// sub-blocos "Data pagamento" (um por data de repasse recebido, histórico acumulado ao longo do
// tempo) — cada um com seu próprio cabeçalho de colunas + linhas de dados + linha em branco antes
// do próximo. Um "Estabelecimento" só reaparece quando muda de unidade; até lá, é tudo o mesmo
// estabelecimento com dezenas de sub-blocos de data em sequência. Testado contra o arquivo real:
// só ler o primeiro "Data pagamento" de cada estabelecimento (como a versão anterior fazia)
// perdia praticamente tudo — de ~7.900 linhas, só 12 eram capturadas. Histórico cumulativo
// (upsert no Supabase).
function linhaEmBranco(row) {
  return !row || row.every(c => String(c ?? '').trim() === '')
}

// Normaliza texto de cabeçalho pra comparar sem depender de acento, maiúscula/minúscula ou do
// caractere exato usado pro "Nº" (às vezes vem com º de ordinal, às vezes com ° de grau — cópia e
// cola entre blocos de estabelecimentos diferentes já trouxe as duas variantes no mesmo arquivo).
// Sem essa normalização, um bloco com cabeçalho ligeiramente diferente perde TODAS as linhas
// silenciosamente (colIdx não acha a coluna, o bloco inteiro vira 0 linhas sem erro nenhum).
function normalizarCabecalho(v) {
  return String(v ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[°ºª]/g, '') // °, º, ª
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export async function getTruckPagRepasses() {
  if (_cache.repasses !== null && (Date.now() - _cacheTs.repasses) < CACHE_TTL_MS) return _cache.repasses

  const { workbook, lastModified } = await downloadWorkbook(FILE_REPASSES)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const rows = []
  const blocosIgnorados = []
  let i = 0
  let estabelecimentosEncontrados = 0
  let subBlocosEncontrados = 0
  let estabelecimentoAtual = null

  while (i < linhas.length) {
    const primeiraCelula = normalizarCabecalho(linhas[i]?.[0])

    if (primeiraCelula === 'estabelecimento') {
      estabelecimentosEncontrados++
      estabelecimentoAtual = String(linhas[i + 1]?.[0] ?? '').trim()
      i += 2
      continue
    }

    if (primeiraCelula === 'data pagamento' && estabelecimentoAtual) {
      subBlocosEncontrados++
      const dataPagamento = toIsoDate(linhas[i + 1]?.[0])
      const cabecalho = (linhas[i + 2] || []).map(c => normalizarCabecalho(c))
      const colIdx = (nome) => cabecalho.indexOf(normalizarCabecalho(nome))
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
        valorParcelaNfE: colIdx('Valor parcela NF-e'),
        valorNfsE: colIdx('Valor NFS-e'),
        valorParcelaNfsE: colIdx('Valor parcela NFS-e'),
        valorTotalParcela: colIdx('Valor total parcela'),
        taxaPct: colIdx('Taxa adm (%)'),
        valorTaxa: colIdx('Valor taxa'),
        valorRecebido: colIdx('Valor recebido'),
      }

      let j = i + 3
      // Só exige data de pagamento e a coluna de lote (chave da linha) — as demais colunas são
      // opcionais (ficam null se a planilha não trouxer), pra um cabeçalho ligeiramente diferente
      // não descartar o sub-bloco inteiro silenciosamente.
      if (dataPagamento && idx.lote !== -1) {
        for (; j < linhas.length; j++) {
          const r = linhas[j]
          if (linhaEmBranco(r)) break
          const c0 = normalizarCabecalho(r[0])
          if (c0 === 'estabelecimento' || c0 === 'data pagamento') break
          const lote = String(r[idx.lote] ?? '').trim()
          if (!lote) continue
          rows.push({
            estabelecimento: estabelecimentoAtual,
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
            valor_parcela_nf_e: parseMoney(r[idx.valorParcelaNfE]),
            valor_nfs_e: parseMoney(r[idx.valorNfsE]),
            valor_parcela_nfs_e: parseMoney(r[idx.valorParcelaNfsE]),
            valor_parcela_total: parseMoney(r[idx.valorTotalParcela]),
            taxa_adm_pct: parsePercent(r[idx.taxaPct]),
            valor_taxa: parseMoney(r[idx.valorTaxa]),
            valor_recebido: parseMoney(r[idx.valorRecebido]),
          })
        }
      } else {
        blocosIgnorados.push({ linha: i + 1, estabelecimento: estabelecimentoAtual, dataPagamento, colunaLoteEncontrada: idx.lote !== -1 })
      }
      i = j
      continue
    }

    i++
  }

  if (estabelecimentosEncontrados === 0) throw new Error('Formato do arquivo de repasse não reconhecido — nenhum bloco "Estabelecimento" encontrado.')
  if (rows.length === 0) throw new Error('Nenhuma linha de repasse encontrada no arquivo.')
  if (blocosIgnorados.length > 0) {
    console.warn(`[TruckPag/repasses] ${blocosIgnorados.length} de ${subBlocosEncontrados} sub-bloco(s) "Data pagamento" ignorado(s) (data ou coluna de lote não reconhecida):`, JSON.stringify(blocosIgnorados))
  }

  _cache.repasses = { rows, lastModified, blocosIgnorados }
  _cacheTs.repasses = Date.now()
  return _cache.repasses
}
