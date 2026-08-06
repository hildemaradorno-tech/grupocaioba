/**
 * sharepointExtractor.js
 *
 * Pipeline completo de extração de dados KPI a partir dos arquivos:
 *   RPR001_VENDAPRODUTO YYYY.MM.xlsx
 * localizados na pasta SharePoint:
 *   /Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos
 *
 * Estrutura real das colunas (Dealernet RPR001):
 *   0  Tipo (cabeçalho)   | 1  NF_NatOperCod         | 2  NF_Status (não filtrado)
 *   3  NFItem_PercNF      | 4  NaturezaOperacao       | 5  NF_Origem
 *   6  NF_OsTipo          | 7  NF_OsTipoDes           | 8  NF_VendedorCod
 *   9  NFItem_EstoqueCod  | 10 NF_Serie               | 11 NF_Codigo
 *   12 NF_PessoaCod       | 13 NF_PessoaNom           | 14 NF_CondPagCod
 *   15 NF_CondPagDes      | 16 NF_OsCod               | 17 NF_OsNum
 *   18 NFItem_PercDesc    | 19 NFItem_QtdeEstoque      | 20 NFItem_VlMargemCont
 *   21 NFItem_VlMargemGer | 22 NFItem_ProdutoDes       | 23 NF_Numero
 *   24 NF_UsuNomVendedor  | 25 NFItem_VlDesc           | 26 NFItem_VlAcres
 *   27 NFItem_Qtde        | 28 NFItem_VlUnit           | 29 NF_EmpresaCod
 *   30 NFItem_ProdutoCod  | 31 NF_Dataemis             | 32 NF_DataMov
 *   33 NFItem_Cod         | 34 NF_ProdCusto            | 35 ProdPrecoValor
 *   36 ProdMarcaReferencia| 37 ProdTipoCod             | 38 ProdLucratLetra
 *   39 ProdEstoqueClasABC | 40 EmpNome                 | 41 NFMoedaCod
 *   42 ValorICMS          | 43 ValorICMSST             | 44 ValorICMSDIFAL
 *   45 ValorPisCofins     | 46 ValorLucroBruto         | 47 NFItem_VlTotal
 *   48 ValorPis           | 49 ValorCofins             | 50 ValorIss
 *   51 PedidoIntermediario| 52 ValorIPI                | 53 Os_Valor
 *   54 NFItem_VlBruto     | 55 NFItem_PercMargemCont   | 56 NFItem_PercMargemGer
 */

import { Client }                        from '@microsoft/microsoft-graph-client'
import { ClientSecretCredential }         from '@azure/identity'
import { TokenCredentialAuthenticationProvider }
  from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'
import * as XLSX from 'xlsx'
import axios     from 'axios'

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLIENTE GRAPH AUTENTICADO
// ─────────────────────────────────────────────────────────────────────────────

let _graphClient = null

function getGraphClient() {
  if (_graphClient) return _graphClient
  const { AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET } = process.env
  if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    throw new Error('Credenciais Azure AD ausentes no ambiente')
  }
  const credential   = new ClientSecretCredential(AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })
  _graphClient = Client.initWithMiddleware({ authProvider })
  return _graphClient
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CACHE EM MEMÓRIA
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS      = parseInt(process.env.KPI_CACHE_TTL_MIN || '15') * 60 * 1000
const _cache            = new Map()
const _inFlight         = new Map()
const _downloadInFlight = new Map()

function cached(key)         { const e = _cache.get(key); return (!e || Date.now() - e.ts > CACHE_TTL_MS) ? null : e.data }
function setCache(key, data) { _cache.set(key, { data, ts: Date.now() }) }
export function clearExtractorCache() { _cache.clear(); _inFlight.clear(); _downloadInFlight.clear(); _graphClient = null }

// Garante que apenas UMA execução por chave está em curso — chamadas concorrentes aguardam o mesmo resultado.
function dedupeAsync(key, fn) {
  if (_inFlight.has(key)) return _inFlight.get(key)
  const p = fn().finally(() => _inFlight.delete(key))
  _inFlight.set(key, p)
  return p
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LISTAGEM DE ARQUIVOS NO SHAREPOINT
// ─────────────────────────────────────────────────────────────────────────────

const VALID_YEARS  = new Set(['2026', '2027', '2028', '2029', '2030'])

const FOLDER_PATH  = '/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos'
const FILE_PATTERN = /^RPR001_VENDAPRODUTO\s+(\d{4})\.(\d{2})\.xlsx$/i

export async function listVendasProdutoFiles(year = new Date().getFullYear()) {
  if (!VALID_YEARS.has(String(year))) {
    console.warn(`[Extractor] Ano ${year} fora do intervalo permitido (2026-2030)`)
    return []
  }

  const cacheKey = `file-list-${year}`
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const driveId = process.env.SHAREPOINT_DRIVE_ID
    if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado')

    const client   = getGraphClient()
    const endpoint = `/drives/${driveId}/root:${FOLDER_PATH}:/children`

    let items = [], response = await client.api(endpoint).get()
    items = [...(response.value || [])]
    while (response['@odata.nextLink']) {
      response = await client.api(response['@odata.nextLink']).get()
      items    = [...items, ...(response.value || [])]
    }

    const files = items
      .filter(item => { const m = FILE_PATTERN.exec(item.name); return m && parseInt(m[1]) === year })
      .map(item  => {
        const [, y, mo] = FILE_PATTERN.exec(item.name)
        return {
          name:        item.name,
          year:        parseInt(y),
          month:       parseInt(mo),
          downloadUrl: item['@microsoft.graph.downloadUrl'],
          lastModified:item.lastModifiedDateTime,
          sizeBytes:   item.size,
        }
      })
      .sort((a, b) => a.month - b.month)

    setCache(cacheKey, files)
    return files
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DOWNLOAD DO BUFFER (com deduplicação por URL)
// ─────────────────────────────────────────────────────────────────────────────

async function downloadBuffer(downloadUrl) {
  if (_downloadInFlight.has(downloadUrl)) return _downloadInFlight.get(downloadUrl)
  const p = axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 30_000 })
    .then(res => Buffer.from(res.data))
    .finally(() => _downloadInFlight.delete(downloadUrl))
  _downloadInFlight.set(downloadUrl, p)
  return p
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PARSER DO RPR001 — MAPEAMENTO REAL DAS COLUNAS
// ─────────────────────────────────────────────────────────────────────────────

// Índices fixos das colunas do Dealernet RPR001_VENDAPRODUTO
const C = {
  tipo:           0,   // usado apenas para detectar linha de cabeçalho
  natOperacao:    4,   // "VEN" = venda normal, "DVE"/"DEVOLU" = devolução
  nfOrigem:       5,   // "OFI" = Oficina / "BAL" = Balcão etc.
  osTipo:         6,   // código numérico do tipo de OS
  osTipoDes:      7,   // "G03  ", "G06  " = descrição do tipo
  nfCodigo:       11,  // número da NF
  condPagDes:     15,  // "GARANTIA", "30/60/90 DIAS"
  osNum:          17,  // número da OS
  qtde:           27,  // quantidade
  vlUnit:         28,  // valor unitário
  empresaCod:     29,  // código da empresa (1=CG, 2=TL, 3=CH...)
  produtoCod:     30,  // código do produto
  dataEmis:       31,  // data de emissão (serial Excel)
  dataMov:        32,  // data de movimento (usada para filtro de período)
  prodCusto:      34,  // custo unitário do produto
  prodTipoCod:    37,  // tipo do produto (1=peça, 2=fluido, 5=MO, etc.)
  empNome:        40,  // "CAIOBA TRUCKS - CAMPO GRANDE"
  vlMargemCont:   20,  // valor da margem de contribuição (R$) — usado no Indicador 3
  vlMargemGer:    21,  // valor da margem gerencial (R$)
  vlTotal:        47,  // valor total do item na NF
  percMargemGer:  56,  // % margem gerencial (0-1)
  produtoDes:     22,  // "0916851 - DAF EXTREME ..."
}

// Mapa real de empresas (NF_EmpresaCod → nome canônico)
// Códigos confirmados pelo RPR001: 1=CG, 2=Dourados, 12=TL, 13=Chapadão
const EMPRESA_MAP = {
  1:  'CAMPO GRANDE',
  2:  'DOURADOS',
  12: 'TRÊS LAGOAS',
  13: 'CHAPADÃO DO SUL',
}

// Normaliza o empNome bruto do Excel → nome canônico do EMPRESA_MAP.
// Quando empresaCod não está no mapa, o fallback usa o texto do arquivo
// (ex: "CAIOBA TRUCKS - CHAPADAO") que precisa ser normalizado para
// bater com o filtro do EmpresaSelector.
function normalizeEmpresaNome(empNome) {
  const n = String(empNome ?? '').trim().toUpperCase()
  if (n.includes('CHAPADAO') || n.includes('CHAPADÃO')) return 'CHAPADÃO DO SUL'
  if (n.includes('TRES LAGOAS') || n.includes('TRÊS LAGOAS')) return 'TRÊS LAGOAS'
  if (n.includes('DOURADOS')) return 'DOURADOS'
  if (n.includes('CAMPO GRANDE')) return 'CAMPO GRANDE'
  return String(empNome ?? '').trim()
}

/**
 * Classifica o tipo KPI a partir do ProdTipoCod e descrição.
 *
 * Distribuição real confirmada no RPR001 Caiobá:
 *   Tipo  7 → Peças sobressalentes (categoria principal)
 *   Tipo  2 → Fluidos/óleos
 *   Tipo 24 → Acessórios / outras peças
 *   Tipo 25 → Outras peças
 *   Tipo  9 → Peças (categoria auxiliar)
 *   Tipo  4 → Pneus / peças especiais
 *   Tipo  3 → Peças diversas
 *   Tipo  8 → Peças diversas
 *   Tipo  5 → Serviços / MO (raro neste relatório)
 *   Tipo  6 → Subcontratados / TRP (baixo valor unitário)
 *
 * Retorna: 'PECAS' | 'SERVICOS' | 'TRP' | 'FLUIDOS'
 */
function classificarItem(row) {
  const prodTipo  = row[C.prodTipoCod]
  const descricao = String(row[C.produtoDes] ?? '').toUpperCase()

  // Serviço / Mão de obra
  if (prodTipo === 5 || /^MO[\s\-]|MAO.?DE.?OBRA|^SERV/.test(descricao)) return 'SERVICOS'

  // TRP / Subcontratados
  if (prodTipo === 6 || /TRP|TERCEIRO|SUBCONTRAT/.test(descricao))         return 'TRP'

  // Fluidos / óleos lubrificantes
  if (prodTipo === 2 || /\bOLEO\b|FLUIDO|LUBRIF|GRAXEIRA|ADITIV/.test(descricao)) return 'FLUIDOS'

  // Todo o restante (tipos 7, 24, 25, 9, 4, 3, 8...) = PECAS
  return 'PECAS'
}

/**
 * Retorna o número global da semana para uma data.
 * Regra: dia 1 do mês abre a semana → fecha no 1º sábado do mês.
 * Demais semanas: dom→sab (ou fim do mês).
 */
function weekOfYear(year, month, day) {
  let offset = 0
  for (let m = 1; m < month; m++) {
    const dow1 = new Date(Date.UTC(year, m - 1, 1)).getUTCDay()
    const dim  = new Date(Date.UTC(year, m, 0)).getUTCDate()
    const fs   = dow1 === 6 ? 1 : 1 + (6 - dow1)    // dia do 1º sábado
    offset    += 1 + (dim > fs ? Math.ceil((dim - fs) / 7) : 0)
  }
  const dow1 = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const fs   = dow1 === 6 ? 1 : 1 + (6 - dow1)
  return offset + (day <= fs ? 1 : 1 + Math.ceil((day - fs) / 7))
}

/**
 * Converte serial Excel para chave de semana (ex: 's27').
 * Esquema: dia 1 → 1º domingo; semanas seguintes: seg → dom; mês corta a última.
 */
function serialToWeekKey(v) {
  if (v === null || v === undefined || v === '') return null
  let date
  if (typeof v === 'number') {
    if (v <= 0) return null
    date = new Date(Math.floor(v - 25569) * 86_400_000)
  } else if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    date = v
  } else {
    const s = String(v).trim()
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (br) { date = new Date(Date.UTC(parseInt(br[3]), parseInt(br[2]) - 1, parseInt(br[1]))) }
    else {
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (iso) { date = new Date(Date.UTC(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))) }
      else {
        const num = parseFloat(s.replace(',', '.'))
        if (!isNaN(num) && num > 1000) date = new Date(Math.floor(num - 25569) * 86_400_000)
      }
    }
  }
  if (!date || isNaN(date.getTime())) return null
  const w = weekOfYear(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
  return `s${String(w).padStart(2, '0')}`
}

/**
 * Converte serial Excel para string 'YYYY-MM'.
 */
function serialToYearMonth(v) {
  if (v === null || v === undefined || v === '') return null
  // Número serial Excel — a parte fracionária é o horário; descarta com Math.floor
  if (typeof v === 'number') {
    if (v <= 0) return null
    const d = new Date(Math.floor(v - 25569) * 86_400_000)
    if (isNaN(d.getTime())) return null
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  // Objeto Date (quando XLSX parseia com cellDates:true)
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    return `${v.getUTCFullYear()}-${String(v.getUTCMonth() + 1).padStart(2, '0')}`
  }
  const s = String(v).trim()
  // "DD/MM/YYYY" ou "DD/MM/YYYY HH:MM:SS"
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (br) return `${br[3]}-${String(br[2]).padStart(2, '0')}`
  // "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS"
  const iso = s.match(/^(\d{4})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}`
  // Tenta parsear como número se vier como string numérica com decimal
  const num = parseFloat(s.replace(',', '.'))
  if (!isNaN(num) && num > 1000) {
    const d = new Date(Math.floor(num - 25569) * 86_400_000)
    if (!isNaN(d.getTime())) return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }
  return null
}

function safeNum(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

/**
 * Parseia um buffer .xlsx (RPR001) e retorna linhas normalizadas.
 * @param {Buffer} buffer
 * @param {{ year: number, month: number, name: string }} meta
 * @returns {Array<VendaRow>}
 */
export function parseVendaProdutoBuffer(buffer, meta) {
  const wb       = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const wsName   = wb.SheetNames[0]                  // aba "Dados"
  const rows     = XLSX.utils.sheet_to_json(wb.Sheets[wsName], {
    header:  1,
    defval:  null,
    raw:     true,
  })

  if (rows.length < 2) return []

  // Detecta e pula a linha de cabeçalho
  const headerIdx = rows[0][C.tipo] === 'Tipo' ? 1 : 0
  const dataRows  = rows.slice(headerIdx)

  const result = []
  const periodoFallback = `${meta.year}-${String(meta.month).padStart(2, '0')}`

  for (const row of dataRows) {
    if (!row || row.length < 40) continue


    // 2. Filtro de OS vinculada: NF_OsTipoDes preenchido
    const temOS = row[C.osTipoDes] !== undefined
               && row[C.osTipoDes] !== null
               && String(row[C.osTipoDes]).trim() !== ''
    if (!temOS) continue   // linhas sem OS (balcão) são tratadas separadamente

    // 3. Natureza de operação normalizada
    const natOp = row[C.natOperacao] ? String(row[C.natOperacao]).toUpperCase().trim() : ''
    const ehDevolucao = natOp.includes('DVE') || natOp.includes('DEVOLU')
    const ehVenda     = natOp.includes('VEN')
    // Ignora linhas que não são venda nem devolução
    if (!ehVenda && !ehDevolucao) continue

    // 4. Valor absoluto — sempre positivo; a separação venda/devolução fica nos campos
    const vlBruto = Number(row[C.vlTotal])
    if (!vlBruto) continue

    // Usa NF_DataMov como data de referência para filtro de período
    const periodo    = serialToYearMonth(row[C.dataMov]) || serialToYearMonth(row[C.dataEmis]) || periodoFallback
    const semanaKey  = serialToWeekKey(row[C.dataMov])   || serialToWeekKey(row[C.dataEmis])   || null

    const empresaCod = safeNum(row[C.empresaCod])
    const empresa    = EMPRESA_MAP[empresaCod] || normalizeEmpresaNome(row[C.empNome])
    const osTipoDes  = temOS ? String(row[C.osTipoDes]).trim() : ''

    // Métricas separadas: vlVendas e vlDevolucoes (ambos positivos)
    const vlVendas    = ehVenda     ? vlBruto : 0
    const vlDevolucoes = ehDevolucao ? vlBruto : 0

    // vlOficina = vendas brutas − devoluções (líquido)
    const vlOficina = vlVendas - vlDevolucoes
    // vlTotal com sinal para compatibilidade com outras métricas (margem, etc.)
    const vlTotal   = vlOficina

    const vlMargemGer  = safeNum(row[C.vlMargemGer])
    const vlMargem     = ehDevolucao ? -vlMargemGer : vlMargemGer

    // Separação explícita — valor sempre positivo no Excel, inclusive para DVE
    const vlMargemContRaw        = safeNum(row[C.vlMargemCont])
    const vlMargemContVendas     = ehVenda     ? vlMargemContRaw : 0
    const vlMargemContDevolucoes = ehDevolucao ? vlMargemContRaw : 0

    result.push({
      arquivo:      meta.name,
      periodo,
      semanaKey,
      empresa,
      empresaCod,
      natOperacao:  natOp,
      nfOrigem:     String(row[C.nfOrigem] ?? '').trim().toUpperCase(),
      nfCodigo:     safeNum(row[C.nfCodigo]),
      osNum:        safeNum(row[C.osNum]),
      osTipoDes,
      condPagDes:   String(row[C.condPagDes] ?? '').trim(),
      produtoCod:   safeNum(row[C.produtoCod]),
      produtoDes:   String(row[C.produtoDes] ?? '').trim(),
      prodTipoCod:  safeNum(row[C.prodTipoCod]),
      tipoKpi:      classificarItem(row),
      qtde:         safeNum(row[C.qtde]),
      vlUnit:       safeNum(row[C.vlUnit]),
      vlVendas,                 // vendas brutas (sempre positivo)
      vlDevolucoes,             // devoluções (sempre positivo)
      vlOficina,                // líquido = vlVendas − vlDevolucoes
      vlTotal,                  // alias de vlOficina para compatibilidade
      vlCusto:      safeNum(row[C.prodCusto]) * safeNum(row[C.qtde]),
      vlMargem,
      vlMargemContVendas,
      vlMargemContDevolucoes,
      pctMargem:    safeNum(row[C.percMargemGer]),
    })
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 5b. PARSER BALCÃO — RPR001 linhas com NF_OsTipoDes = branco (isolado do fluxo principal)
// ─────────────────────────────────────────────────────────────────────────────

function parseBalcaoBuffer(buffer, meta) {
  const wb   = XLSX.read(buffer, { type: 'buffer', raw: true })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })
  if (data.length < 2) return []

  const periodoFallback = meta.year && meta.month
    ? `${meta.year}-${String(meta.month).padStart(2, '0')}` : null

  const result = []
  for (const row of data.slice(1)) {
    if (!row || row.length < 48) continue

    // Somente linhas SEM OS vinculada (NF_OsTipoDes = branco)
    const osTipoDes = row[C.osTipoDes]
    const temOS = osTipoDes !== undefined && osTipoDes !== null && String(osTipoDes).trim() !== ''
    if (temOS) continue

    const natOp = row[C.natOperacao] ? String(row[C.natOperacao]).toUpperCase().trim() : ''
    const ehVenda     = natOp.includes('VEN')
    const ehDevolucao = natOp.includes('DVE') || natOp.includes('DEVOLU')
    if (!ehVenda && !ehDevolucao) continue

    const vlBruto = Number(row[C.vlTotal])
    if (!vlBruto) continue

    const periodo   = serialToYearMonth(row[C.dataMov]) || serialToYearMonth(row[C.dataEmis]) || periodoFallback
    if (!periodo) continue
    const semanaKey = serialToWeekKey(row[C.dataMov])   || serialToWeekKey(row[C.dataEmis])   || null

    const empresaCod = safeNum(row[C.empresaCod])
    const empresa    = EMPRESA_MAP[empresaCod] || normalizeEmpresaNome(row[C.empNome])

    const vlVendas     = ehVenda     ? vlBruto : 0
    const vlDevolucoes = ehDevolucao ? vlBruto : 0

    const vlMargemContRaw        = safeNum(row[C.vlMargemCont])
    const vlMargemContVendas     = ehVenda     ? vlMargemContRaw : 0
    const vlMargemContDevolucoes = ehDevolucao ? vlMargemContRaw : 0

    result.push({ empresa, periodo, semanaKey, vlVendas, vlDevolucoes, vlMargemContVendas, vlMargemContDevolucoes, arquivo: meta.name })
  }
  return result
}

function consolidarBalcao(rows) {
  const qv = {}, qd = {}, mv = {}, md = {}, sv = {}, sd = {}
  const qmv = {}, qmd = {}, mmv = {}, mmd = {}, smv = {}, smd = {}

  for (const r of rows) {
    const q = (() => {
      const mes = parseInt((r.periodo || '').split('-')[1] || '0')
      return mes <= 3 ? 'q1' : mes <= 6 ? 'q2' : mes <= 9 ? 'q3' : 'q4'
    })()
    const m = (() => {
      const mes = parseInt((r.periodo || '').split('-')[1] || '0')
      return mes >= 1 && mes <= 12 ? `m${String(mes).padStart(2, '0')}` : null
    })()
    const s = r.semanaKey
    qv[q]  = (qv[q]  || 0) + r.vlVendas
    qd[q]  = (qd[q]  || 0) + r.vlDevolucoes
    qmv[q] = (qmv[q] || 0) + (r.vlMargemContVendas     || 0)
    qmd[q] = (qmd[q] || 0) + (r.vlMargemContDevolucoes || 0)
    if (m) {
      mv[m]  = (mv[m]  || 0) + r.vlVendas
      md[m]  = (md[m]  || 0) + r.vlDevolucoes
      mmv[m] = (mmv[m] || 0) + (r.vlMargemContVendas     || 0)
      mmd[m] = (mmd[m] || 0) + (r.vlMargemContDevolucoes || 0)
    }
    if (s) {
      sv[s]  = (sv[s]  || 0) + r.vlVendas
      sd[s]  = (sd[s]  || 0) + r.vlDevolucoes
      smv[s] = (smv[s] || 0) + (r.vlMargemContVendas     || 0)
      smd[s] = (smd[s] || 0) + (r.vlMargemContDevolucoes || 0)
    }
  }

  const fyV  = Object.values(qv).reduce((s, v) => s + v, 0) || null
  const fyD  = Object.values(qd).reduce((s, v) => s + v, 0) || null
  const fyMV = Object.values(qmv).reduce((s, v) => s + v, 0) || null
  const fyMD = Object.values(qmd).reduce((s, v) => s + v, 0) || null

  const liq = (v, d) => ((v || 0) - (d || 0)) || null
  const pct = (ml, fl) => (fl != null && fl > 0) ? (ml / fl) * 100 : null

  const liqPer = (qmap, dmap, mmap, dmmap, smap, dsmap, fyA, fyB) => ({
    q1: liq(qmap.q1, dmap.q1), q2: liq(qmap.q2, dmap.q2),
    q3: liq(qmap.q3, dmap.q3), q4: liq(qmap.q4, dmap.q4),
    fy: liq(fyA, fyB),
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, liq(mmap[m], dmmap[m])])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  liq(smap[s], dsmap[s])])),
  })

  const pctPer = (qmv, qmd, qv, qd, mmv, mmd, mv, md, smv, smd, sv, sd, fyMV, fyMD, fyV, fyD) => ({
    q1: pct(liq(qmv.q1, qmd.q1), liq(qv.q1, qd.q1)),
    q2: pct(liq(qmv.q2, qmd.q2), liq(qv.q2, qd.q2)),
    q3: pct(liq(qmv.q3, qmd.q3), liq(qv.q3, qd.q3)),
    q4: pct(liq(qmv.q4, qmd.q4), liq(qv.q4, qd.q4)),
    fy: pct(liq(fyMV, fyMD), liq(fyV, fyD)),
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, pct(liq(mmv[m], mmd[m]), liq(mv[m], md[m]))])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  pct(liq(smv[s], smd[s]), liq(sv[s], sd[s]))])),
  })

  return {
    vendas:    { q1: qv.q1??null,  q2: qv.q2??null,  q3: qv.q3??null,  q4: qv.q4??null,  fy: fyV,  ...Object.fromEntries(ALL_MONTHS.map(m => [m, mv[m]??null])),  ...Object.fromEntries(ALL_WEEKS.map(s => [s, sv[s]??null])) },
    devolucoes:{ q1: qd.q1??null,  q2: qd.q2??null,  q3: qd.q3??null,  q4: qd.q4??null,  fy: fyD,  ...Object.fromEntries(ALL_MONTHS.map(m => [m, md[m]??null])),  ...Object.fromEntries(ALL_WEEKS.map(s => [s, sd[s]??null])) },
    liquido:   liqPer(qv, qd, mv, md, sv, sd, fyV, fyD),
    margemContVendas:    { q1: qmv.q1??null, q2: qmv.q2??null, q3: qmv.q3??null, q4: qmv.q4??null, fy: fyMV, ...Object.fromEntries(ALL_MONTHS.map(m => [m, mmv[m]??null])), ...Object.fromEntries(ALL_WEEKS.map(s => [s, smv[s]??null])) },
    margemContDevolucoes:{ q1: qmd.q1??null, q2: qmd.q2??null, q3: qmd.q3??null, q4: qmd.q4??null, fy: fyMD, ...Object.fromEntries(ALL_MONTHS.map(m => [m, mmd[m]??null])), ...Object.fromEntries(ALL_WEEKS.map(s => [s, smd[s]??null])) },
    margemContLiquido:   liqPer(qmv, qmd, mmv, mmd, smv, smd, fyMV, fyMD),
    margemPct:           pctPer(qmv, qmd, qv, qd, mmv, mmd, mv, md, smv, smd, sv, sd, fyMV, fyMD, fyV, fyD),
  }
}

export async function extractBalcao(year = new Date().getFullYear(), empresaNome = null) {
  const yearStr     = String(year)
  const empresaNorm = empresaNome ? normalizeEmpresaNome(empresaNome).toUpperCase() : null
  const cacheKey    = `balcao-${yearStr}-${empresaNorm || 'todas'}`
  const hit = cached(cacheKey)
  if (hit) return hit

  const allFiles = await listVendasProdutoFiles(year)
  if (!allFiles.length) return null

  const allRows = []
  const BATCH = 3
  for (let i = 0; i < allFiles.length; i += BATCH) {
    const results = await Promise.allSettled(
      allFiles.slice(i, i + BATCH).map(async f => {
        const buf  = await downloadBuffer(f.downloadUrl)
        return parseBalcaoBuffer(buf, f)
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') allRows.push(...r.value)
    }
  }

  const rowsDoAno = allRows.filter(r => r.periodo?.startsWith(yearStr))
  const rows = empresaNorm
    ? rowsDoAno.filter(r => r.empresa.toUpperCase() === empresaNorm)
    : rowsDoAno

  const result = consolidarBalcao(rows)
  setCache(cacheKey, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. CONSOLIDAÇÃO PARA OS KPIs
// ─────────────────────────────────────────────────────────────────────────────

function quarter(periodo) {
  const mes = parseInt((periodo || '').split('-')[1] || '0')
  return mes <= 3 ? 'q1' : mes <= 6 ? 'q2' : mes <= 9 ? 'q3' : 'q4'
}

function safePct(margem, bruto) {
  return bruto > 0 ? (margem / bruto) * 100 : null
}

/**
 * Agrega linhas brutas em buckets por (quarter, empresa, tipoKpi).
 */
function makeBucket() {
  return {
    vlVendas: 0, vlDevolucoes: 0, vlOficina: 0, vlTotal: 0, vlMargem: 0,
    vlMargemContVendas: 0, vlMargemContDevolucoes: 0,
    osSet: new Set(), nfSet: new Set(),
  }
}

function addToBucket(bucket, r) {
  bucket.vlVendas              += r.vlVendas
  bucket.vlDevolucoes          += r.vlDevolucoes
  bucket.vlOficina             += r.vlOficina
  bucket.vlTotal               += r.vlTotal
  bucket.vlMargem              += r.vlMargem
  bucket.vlMargemContVendas    += r.vlMargemContVendas
  bucket.vlMargemContDevolucoes += r.vlMargemContDevolucoes
  if (r.osNum)    bucket.osSet.add(r.osNum)
  if (r.nfCodigo) bucket.nfSet.add(r.nfCodigo)
}

function mesKey(periodo) {
  const mes = parseInt((periodo || '').split('-')[1] || '0')
  return mes >= 1 && mes <= 12 ? `m${String(mes).padStart(2, '0')}` : null
}

// ProdTipoCod que compõem o Faturamento TRP (Indicador 10 — Auditoria)
const TRP_TIPO_CODES = new Set([2, 24, 27, 28])

function makeAggResult() {
  return {
    PECAS: makeBucket(), SERVICOS: makeBucket(), TRP: makeBucket(), FLUIDOS: makeBucket(),
    OFI: makeBucket(), BLC: makeBucket(), TOTAL: makeBucket(),
    PECAS_OFI: makeBucket(),  // peças com OS de oficina — usado no Indicador 3
    TRP_TIPOS: makeBucket(),  // ProdTipoCod ∈ {2,24,27,28} — Faturamento TRP Auditoria
    porEmpresa: {},
  }
}

function agregarPorQuarter(rows) {
  const qs = { q1: null, q2: null, q3: null, q4: null }

  for (const r of rows) {
    const q = quarter(r.periodo)
    if (!qs[q]) qs[q] = makeAggResult()

    addToBucket(qs[q][r.tipoKpi], r)
    addToBucket(qs[q][r.nfOrigem] || qs[q].TOTAL, r)
    addToBucket(qs[q].TOTAL, r)
    if (r.tipoKpi === 'PECAS' && r.nfOrigem === 'OFI') addToBucket(qs[q].PECAS_OFI, r)
    if (TRP_TIPO_CODES.has(r.prodTipoCod)) addToBucket(qs[q].TRP_TIPOS, r)

    if (!qs[q].porEmpresa[r.empresa]) {
      qs[q].porEmpresa[r.empresa] = { vlTotal: 0, vlMargem: 0, osSet: new Set() }
    }
    qs[q].porEmpresa[r.empresa].vlTotal  += r.vlTotal
    qs[q].porEmpresa[r.empresa].vlMargem += r.vlMargem
    if (r.osNum) qs[q].porEmpresa[r.empresa].osSet.add(r.osNum)
  }

  return qs
}

function agregarPorMes(rows) {
  const ms = {}
  for (const r of rows) {
    const m = mesKey(r.periodo)
    if (!m) continue
    if (!ms[m]) ms[m] = makeAggResult()

    addToBucket(ms[m][r.tipoKpi], r)
    addToBucket(ms[m][r.nfOrigem] || ms[m].TOTAL, r)
    addToBucket(ms[m].TOTAL, r)
    if (r.tipoKpi === 'PECAS' && r.nfOrigem === 'OFI') addToBucket(ms[m].PECAS_OFI, r)
    if (TRP_TIPO_CODES.has(r.prodTipoCod)) addToBucket(ms[m].TRP_TIPOS, r)
  }
  return ms
}

/**
 * Soma de um campo em todos os quarters não-nulos.
 */
function fySum(qs, tipo, campo) {
  return Object.values(qs).filter(Boolean).reduce((s, q) => s + (q[tipo]?.[campo] || 0), 0)
}

/**
 * Consolida todas as linhas brutas para o formato esperado pelos submenus KPI.
 * Retorna: { bloco2Realizado, bloco3PvRealizado, bloco3PecasRealizado, porPeriodoMensal, metaData }
 */
const ALL_MONTHS = ['m01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12']
const ALL_WEEKS  = Array.from({length: 70}, (_, i) => `s${String(i + 1).padStart(2, '0')}`)

function agregarPorSemana(rows) {
  const ss = {}
  for (const r of rows) {
    const s = r.semanaKey
    if (!s) continue
    if (!ss[s]) ss[s] = makeAggResult()
    addToBucket(ss[s][r.tipoKpi], r)
    addToBucket(ss[s][r.nfOrigem] || ss[s].TOTAL, r)
    addToBucket(ss[s].TOTAL, r)
    if (r.tipoKpi === 'PECAS' && r.nfOrigem === 'OFI') addToBucket(ss[s].PECAS_OFI, r)
    if (TRP_TIPO_CODES.has(r.prodTipoCod)) addToBucket(ss[s].TRP_TIPOS, r)
  }
  return ss
}

export function consolidarParaKpi(rows) {
  const qs = agregarPorQuarter(rows)
  const ms = agregarPorMes(rows)
  const ss = agregarPorSemana(rows)

  // Helper: extrai { q1..fy } + { m01..m12 } + { s01..s52 } de um campo de um bucket
  const qv = (bucket, campo) => ({
    q1: qs.q1?.[bucket]?.[campo] ?? null,
    q2: qs.q2?.[bucket]?.[campo] ?? null,
    q3: qs.q3?.[bucket]?.[campo] ?? null,
    q4: qs.q4?.[bucket]?.[campo] ?? null,
    fy: fySum(qs, bucket, campo) || null,
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, ms[m]?.[bucket]?.[campo] ?? null])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  ss[s]?.[bucket]?.[campo] ?? null])),
  })

  const qOsCount = (bucket) => ({
    q1: qs.q1?.[bucket]?.osSet?.size ?? null,
    q2: qs.q2?.[bucket]?.osSet?.size ?? null,
    q3: qs.q3?.[bucket]?.osSet?.size ?? null,
    q4: qs.q4?.[bucket]?.osSet?.size ?? null,
    fy: null,
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, ms[m]?.[bucket]?.osSet?.size ?? null])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  ss[s]?.[bucket]?.osSet?.size ?? null])),
  })

  // % margem de um bucket em cada quarter, mês e semana
  const qPct = (bucket) => ({
    q1: safePct(qs.q1?.[bucket]?.vlMargem, qs.q1?.[bucket]?.vlTotal),
    q2: safePct(qs.q2?.[bucket]?.vlMargem, qs.q2?.[bucket]?.vlTotal),
    q3: safePct(qs.q3?.[bucket]?.vlMargem, qs.q3?.[bucket]?.vlTotal),
    q4: safePct(qs.q4?.[bucket]?.vlMargem, qs.q4?.[bucket]?.vlTotal),
    fy: safePct(fySum(qs, bucket, 'vlMargem'), fySum(qs, bucket, 'vlTotal')),
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, safePct(ms[m]?.[bucket]?.vlMargem, ms[m]?.[bucket]?.vlTotal)])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  safePct(ss[s]?.[bucket]?.vlMargem, ss[s]?.[bucket]?.vlTotal)])),
  })

  // % margem de contribuição líquida — Indicador 3
  const lucroLiquidoBucket = (b) =>
    b ? (b.vlMargemContVendas - b.vlMargemContDevolucoes) : null
  const fatLiquidoBucket = (b) =>
    b ? (b.vlVendas - b.vlDevolucoes) : null
  const pctCont = (b) => {
    const lucro = lucroLiquidoBucket(b)
    const fat   = fatLiquidoBucket(b)
    return fat > 0 ? (lucro / fat) * 100 : null
  }

  const qPctCont = (bucket) => ({
    q1: pctCont(qs.q1?.[bucket]),
    q2: pctCont(qs.q2?.[bucket]),
    q3: pctCont(qs.q3?.[bucket]),
    q4: pctCont(qs.q4?.[bucket]),
    fy: (() => {
      const lucro = ['q1','q2','q3','q4'].reduce((s, q) => s + (lucroLiquidoBucket(qs[q]?.[bucket]) ?? 0), 0)
      const fat   = ['q1','q2','q3','q4'].reduce((s, q) => s + (fatLiquidoBucket(qs[q]?.[bucket]) ?? 0), 0)
      return fat > 0 ? (lucro / fat) * 100 : null
    })(),
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, pctCont(ms[m]?.[bucket])])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  pctCont(ss[s]?.[bucket])])),
  })

  // Ind 3: numerador = vlMargemCont do lucroBucket, denominador = vlTotal do fatBucket
  const pctContCross = (lb, fb) => {
    const lucro = lucroLiquidoBucket(lb)
    const fat   = fatLiquidoBucket(fb)
    return fat > 0 ? (lucro / fat) * 100 : null
  }
  const qPctContCross = (lucroBucket, fatBucket) => ({
    q1: pctContCross(qs.q1?.[lucroBucket], qs.q1?.[fatBucket]),
    q2: pctContCross(qs.q2?.[lucroBucket], qs.q2?.[fatBucket]),
    q3: pctContCross(qs.q3?.[lucroBucket], qs.q3?.[fatBucket]),
    q4: pctContCross(qs.q4?.[lucroBucket], qs.q4?.[fatBucket]),
    fy: (() => {
      const lucro = ['q1','q2','q3','q4'].reduce((s, q) => s + (lucroLiquidoBucket(qs[q]?.[lucroBucket]) ?? 0), 0)
      const fat   = ['q1','q2','q3','q4'].reduce((s, q) => s + (fatLiquidoBucket(qs[q]?.[fatBucket]) ?? 0), 0)
      return fat > 0 ? (lucro / fat) * 100 : null
    })(),
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, pctContCross(ms[m]?.[lucroBucket], ms[m]?.[fatBucket])])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  pctContCross(ss[s]?.[lucroBucket], ss[s]?.[fatBucket])])),
  })

  // Agrupamento mensal para drill-down
  const porPeriodoMensal = {}
  for (const r of rows) {
    if (!porPeriodoMensal[r.periodo]) porPeriodoMensal[r.periodo] = {}
    const b = porPeriodoMensal[r.periodo]
    if (!b[r.tipoKpi]) b[r.tipoKpi] = { vlTotal: 0, vlMargem: 0, qtde: 0, osSet: new Set() }
    b[r.tipoKpi].vlTotal  += r.vlTotal
    b[r.tipoKpi].vlMargem += r.vlMargem
    b[r.tipoKpi].qtde     += r.qtde
    if (r.osNum) b[r.tipoKpi].osSet.add(r.osNum)
  }
  // Serializa os Sets para arrays (JSON-friendly)
  for (const p of Object.keys(porPeriodoMensal)) {
    for (const t of Object.keys(porPeriodoMensal[p])) {
      porPeriodoMensal[p][t].osCount = porPeriodoMensal[p][t].osSet.size
      delete porPeriodoMensal[p][t].osSet
    }
  }

  return {
    // ── Bloco 2 — Operacional ──────────────────────────────────────────────
    // Peças de Balcão (BLC) = vendas diretas sem OS de oficina
    bloco2Realizado: {
      faturamentoPecas: qv('TOTAL', 'vlTotal'),   // "Faturamento Peças (R$)" — total OFI+BLC
      passagensOficina: qOsCount('OFI'),           // OS únicas na oficina
    },

    // ── Bloco 3 — Pós-Venda ───────────────────────────────────────────────
    // faturamentoOficina = vlVendas − vlDevolucoes (subtração explícita por período)
    bloco3PvRealizado: {
      faturamentoOficina: (() => {
        const vendas = qv('TOTAL', 'vlVendas')
        const devol  = qv('TOTAL', 'vlDevolucoes')
        const liquido = {}
        for (const k of Object.keys(vendas)) {
          const v = vendas[k], d = devol[k]
          liquido[k] = (v != null || d != null) ? (v ?? 0) - (d ?? 0) : null
        }
        return liquido
      })(),
      margemBrutaOficina:       qPct('TOTAL'),
      margemBrutaServicos:      qPct('SERVICOS'),
      margemBrutaPecasOficina:  qPctCont('TOTAL'),
      passagensOficina:         qOsCount('OFI'),
    },

    // ── Bloco 3 — Peças ───────────────────────────────────────────────────
    // Total de peças vendidas (OFI + BLC)
    bloco3PecasRealizado: {
      faturamentoTotal: qv('TOTAL', 'vlTotal'),    // item 1: Fat. Total Peças
      margemBrutaPecas: qPct('TOTAL'),             // item 2: Margem Bruta Peças
      faturamentoTrp:   qv('TRP_TIPOS', 'vlTotal'),  // item 3: Fat. TRP (ProdTipoCod ∈ {2,24,27,28})
    },

    // ── Auditoria — valores brutos por fonte para conferência ────────────
    auditoria: {
      // Indicador 1 — Fonte A (RPR001)
      ind1_fatVendas:      qv('TOTAL', 'vlVendas'),
      ind1_fatDevolucoes:  qv('TOTAL', 'vlDevolucoes'),
      ind1_fatLiquido:     (() => {
        const v = qv('TOTAL', 'vlVendas'), d = qv('TOTAL', 'vlDevolucoes'), r = {}
        for (const k of Object.keys(v)) r[k] = (v[k] != null || d[k] != null) ? (v[k] ?? 0) - (d[k] ?? 0) : null
        return r
      })(),
      // Indicador 3 — Fonte A (TOTAL — todos os itens com NF_OsTipoDes <> branco)
      ind3_lucroVendas:     qv('TOTAL', 'vlMargemContVendas'),
      ind3_lucroDevolucoes: qv('TOTAL', 'vlMargemContDevolucoes'),
      ind3_lucroLiquido:    (() => {
        const v = qv('TOTAL', 'vlMargemContVendas'), d = qv('TOTAL', 'vlMargemContDevolucoes'), r = {}
        for (const k of Object.keys(v)) r[k] = (v[k] != null || d[k] != null) ? (v[k] ?? 0) - (d[k] ?? 0) : null
        return r
      })(),
      // Indicador 3 — Fonte B (TOTAL — mesmo faturamento do Ind 1 Fonte A)
      ind3_fatVendas:      qv('TOTAL', 'vlVendas'),
      ind3_fatDevolucoes:  qv('TOTAL', 'vlDevolucoes'),
      ind3_fatLiquido:     (() => {
        const v = qv('TOTAL', 'vlVendas'), d = qv('TOTAL', 'vlDevolucoes'), r = {}
        for (const k of Object.keys(v)) r[k] = (v[k] != null || d[k] != null) ? (v[k] ?? 0) - (d[k] ?? 0) : null
        return r
      })(),
      ind3_margem: qPctCont('TOTAL'),

      // Indicador 10 — Faturamento TRP (ProdTipoCod ∈ {2,24,27,28}, NF_OsTipoDes <> branco)
      ind10_trpVendas:     qv('TRP_TIPOS', 'vlVendas'),
      ind10_trpDevolucoes: qv('TRP_TIPOS', 'vlDevolucoes'),
      ind10_trpLiquido:    (() => {
        const v = qv('TRP_TIPOS', 'vlVendas'), d = qv('TRP_TIPOS', 'vlDevolucoes'), r = {}
        for (const k of Object.keys(v)) r[k] = (v[k] != null || d[k] != null) ? (v[k] ?? 0) - (d[k] ?? 0) : null
        return r
      })(),
    },

    // ── Dados mensais para drill-down ─────────────────────────────────────
    porPeriodoMensal,

    // ── Detalhe por empresa ───────────────────────────────────────────────
    porEmpresa: Object.fromEntries(
      ['q1','q2','q3','q4'].map(q => [
        q,
        qs[q] ? Object.fromEntries(
          Object.entries(qs[q].porEmpresa).map(([emp, d]) => [
            emp,
            { vlTotal: d.vlTotal, vlMargem: d.vlMargem, osCount: d.osSet.size },
          ])
        ) : null,
      ])
    ),

    metaData: {
      totalArquivos: [...new Set(rows.map(r => r.arquivo))].length,
      totalLinhas:   rows.length,
      periodos:      [...new Set(rows.map(r => r.periodo))].sort(),
      empresas:      [...new Set(rows.map(r => r.empresa))].sort(),
      geradoEm:      new Date().toISOString(),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. RECEPCIONISTA — REL_VENDARECEPCIONISTA_REPORT
// ─────────────────────────────────────────────────────────────────────────────

const RECEP_FOLDER_BASE  = '/Banco de Dados - DAF - Pós-Vendas/Vendas de Serviços'
const RECEP_FILE_PATTERN = /^REL_VENDARECEPCIONISTA_REPORT/i

export async function listRecepcionistaFiles() {
  const cacheKey = 'recep-file-list-all'
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const driveId = process.env.SHAREPOINT_DRIVE_ID
    if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado')

    const client = getGraphClient()

    const baseEndpoint = `/drives/${driveId}/root:${RECEP_FOLDER_BASE}:/children`
    let baseItems = [], res = await client.api(baseEndpoint).get()
    baseItems = [...(res.value || [])]
    while (res['@odata.nextLink']) {
      res = await client.api(res['@odata.nextLink']).get()
      baseItems = [...baseItems, ...(res.value || [])]
    }

    const subfolders = baseItems.filter(i => i.folder)

    const allFiles = []
    await Promise.allSettled(
      subfolders.map(async folder => {
        const endpoint = `/drives/${driveId}/items/${folder.id}/children`
        let items = [], r = await client.api(endpoint).get()
        items = [...(r.value || [])]
        while (r['@odata.nextLink']) {
          r = await client.api(r['@odata.nextLink']).get()
          items = [...items, ...(r.value || [])]
        }
        for (const item of items) {
          if (RECEP_FILE_PATTERN.test(item.name)) {
            allFiles.push({
              name:        item.name,
              downloadUrl: item['@microsoft.graph.downloadUrl'],
              lastModified:item.lastModifiedDateTime,
              sizeBytes:   item.size,
            })
          }
        }
      })
    )

    allFiles.sort((a, b) => a.name.localeCompare(b.name))
    setCache(cacheKey, allFiles)
    return allFiles
  })
}

/**
 * Parseia buffer do REL_VENDARECEPCIONISTA_REPORT.
 * Detecta colunas por nome no cabeçalho (linha 0).
 * Usa NotaFiscal_DataEmissao para agrupar e tot_serv como valor.
 */
function parseRecepcionistaBuffer(buffer, meta) {
  const wb     = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const wsName = wb.SheetNames[0]
  const rows   = XLSX.utils.sheet_to_json(wb.Sheets[wsName], {
    header: 1, defval: null, raw: true,
  })
  if (rows.length < 2) return []

  const header      = rows[0].map(h => String(h ?? '').trim())
  const colDate     = header.indexOf('NotaFiscal_DataEmissao')
  const colVal      = header.indexOf('tot_serv')
  const colMargem   = header.indexOf('margem_servico')
  const colEmpresa  = header.indexOf('Empresa_Nome')

  if (colDate === -1 || colVal === -1) {
    console.warn(`[Recep] Colunas não encontradas em ${meta.name}. Cabeçalho: ${header.slice(0, 20).join(', ')}`)
    return []
  }

  const result = []
  for (const row of rows.slice(1)) {
    if (!row || row.length <= Math.max(colDate, colVal)) continue
    const periodo   = serialToYearMonth(row[colDate])
    if (!periodo) continue
    const semanaKey = serialToWeekKey(row[colDate]) || null
    const totServ = Number(row[colVal])
    if (!totServ || isNaN(totServ)) continue
    const margemServico = colMargem   !== -1 ? (Number(row[colMargem])  || 0) : 0
    const empresaNome   = colEmpresa  !== -1 ? normalizeEmpresaNome(row[colEmpresa]) : ''
    result.push({ periodo, semanaKey, totServ, margemServico, empresaNome, arquivo: meta.name })
  }
  return result
}

function consolidarServicos(rows) {
  const qsTot = {}, qsMar = {}, msTot = {}, msMar = {}, ssTot = {}, ssMar = {}

  for (const r of rows) {
    const q = quarter(r.periodo)
    const m = mesKey(r.periodo)
    const s = r.semanaKey
    qsTot[q] = (qsTot[q] || 0) + r.totServ
    qsMar[q] = (qsMar[q] || 0) + r.margemServico
    if (m) { msTot[m] = (msTot[m] || 0) + r.totServ; msMar[m] = (msMar[m] || 0) + r.margemServico }
    if (s) { ssTot[s] = (ssTot[s] || 0) + r.totServ; ssMar[s] = (ssMar[s] || 0) + r.margemServico }
  }

  const fyTot = rows.reduce((s, r) => s + r.totServ, 0) || null
  const fyMar = rows.reduce((s, r) => s + r.margemServico, 0) || null

  const pct = (mar, tot) => (tot > 0 ? (mar / tot) * 100 : null)

  return {
    faturamentoBruto: {
      q1: qsTot.q1 ?? null, q2: qsTot.q2 ?? null, q3: qsTot.q3 ?? null, q4: qsTot.q4 ?? null, fy: fyTot,
      ...Object.fromEntries(ALL_MONTHS.map(m => [m, msTot[m] ?? null])),
      ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  ssTot[s] ?? null])),
    },
    margemBruta: {
      q1: pct(qsMar.q1, qsTot.q1), q2: pct(qsMar.q2, qsTot.q2),
      q3: pct(qsMar.q3, qsTot.q3), q4: pct(qsMar.q4, qsTot.q4),
      fy: pct(fyMar, fyTot),
      ...Object.fromEntries(ALL_MONTHS.map(m => [m, pct(msMar[m], msTot[m])])),
      ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  pct(ssMar[s], ssTot[s])])),
    },
    margemBrutaRs: {
      q1: qsMar.q1 ?? null, q2: qsMar.q2 ?? null, q3: qsMar.q3 ?? null, q4: qsMar.q4 ?? null, fy: fyMar,
      ...Object.fromEntries(ALL_MONTHS.map(m => [m, msMar[m] ?? null])),
      ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  ssMar[s] ?? null])),
    },
    metaData: {
      totalArquivos: [...new Set(rows.map(r => r.arquivo))].length,
      totalLinhas:   rows.length,
      periodos:      [...new Set(rows.map(r => r.periodo))].sort(),
    },
  }
}

/**
 * Extrai e consolida o faturamento bruto de serviços a partir dos arquivos
 * REL_VENDARECEPCIONISTA_REPORT, somando a coluna tot_serv por período.
 * @param {number} year
 * @returns {Promise<object|null>}
 */
async function _loadAllRecepRows(year) {
  const yearStr  = String(year)
  const cacheKey = `recep-raw-${yearStr}`
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const allFiles = await listRecepcionistaFiles()
    const files    = allFiles.filter(f => f.name.includes(yearStr))
    if (!files.length) { console.warn(`[Recep] Nenhum arquivo para ${yearStr}`); return [] }

    console.log(`[Recep] ${files.length} arquivo(s) para ${yearStr}: ${files.map(f => f.name).join(', ')}`)
    const allRows = []
    const BATCH   = 3
    for (let i = 0; i < files.length; i += BATCH) {
      const results = await Promise.allSettled(
        files.slice(i, i + BATCH).map(async f => {
          console.log(`[Recep] Baixando ${f.name} (${(f.sizeBytes / 1024).toFixed(0)} KB)...`)
          const buf  = await downloadBuffer(f.downloadUrl)
          const rows = parseRecepcionistaBuffer(buf, f)
          console.log(`[Recep] ${f.name}: ${rows.length} linhas válidas`)
          return rows
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allRows.push(...r.value)
        else console.error('[Recep] Erro no lote:', r.reason?.message)
      }
    }
    setCache(cacheKey, allRows)
    return allRows
  })
}

export async function extractServicosOficina(year = new Date().getFullYear(), empresaNome = null) {
  const yearStr    = String(year)
  const empresaNorm = empresaNome ? normalizeEmpresaNome(empresaNome).toUpperCase() : null
  if (!VALID_YEARS.has(yearStr)) {
    console.warn(`[Recep] Ano ${year} fora do intervalo permitido (2026-2030)`)
    return null
  }

  const cacheKey = `servicos-oficina-${year}-${empresaNorm || 'todas'}`
  const hit = cached(cacheKey)
  if (hit) { console.log(`[Recep] Cache hit ${cacheKey}`); return hit }

  const allRows = await _loadAllRecepRows(year)
  const rows    = empresaNorm
    ? allRows.filter(r => r.empresaNome.toUpperCase() === empresaNorm)
    : allRows

  console.log(`[Recep] Total linhas do ano ${year} (empresa: ${empresaNorm || 'todas'}): ${rows.length}`)
  const result = consolidarServicos(rows)
  setCache(cacheKey, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. PONTO DE ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

// Sempre busca e parseia todos os arquivos do ano (sem filtro) e armazena em cache.
// O filtro por empresa é aplicado após a leitura do cache.
async function _loadAllRows(year) {
  const cacheKey = `raw-rows-${year}`
  const hit = cached(cacheKey)
  if (hit) { console.log(`[Extractor] Cache raw hit para ${year}`); return hit }

  return dedupeAsync(cacheKey, async () => {
    console.log(`[Extractor] Iniciando extração — ${year}`)
    const files = await listVendasProdutoFiles(year)
    if (!files.length) { console.warn(`[Extractor] Nenhum arquivo para ${year}`); return [] }
    console.log(`[Extractor] ${files.length} arquivo(s): ${files.map(f => f.name).join(', ')}`)

    const allRows = []
    const BATCH   = 3
    for (let i = 0; i < files.length; i += BATCH) {
      const results = await Promise.allSettled(
        files.slice(i, i + BATCH).map(async f => {
          console.log(`[Extractor] Baixando ${f.name} (${(f.sizeBytes / 1024).toFixed(0)} KB)...`)
          const buf  = await downloadBuffer(f.downloadUrl)
          const rows = parseVendaProdutoBuffer(buf, f)
          console.log(`[Extractor] ${f.name}: ${rows.length} linhas válidas`)
          return rows
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allRows.push(...r.value)
        else console.error('[Extractor] Erro no lote:', r.reason?.message)
      }
    }

    console.log(`[Extractor] Total: ${allRows.length} linhas brutas`)
    setCache(cacheKey, allRows)
    return allRows
  })
}

/**
 * Retorna os KPIs consolidados para o ano, opcionalmente filtrados por empresa.
 * @param {number} year
 * @param {string|null} empresa - ex: 'CAMPO GRANDE' | 'DOURADOS' | null (todas)
 */
export async function getConsolidatedKpiData(year = new Date().getFullYear(), empresa = null) {
  const empresaNorm = empresa && empresa !== 'todas' ? normalizeEmpresaNome(empresa).toUpperCase() : null
  const cacheKey    = `consolidated-${year}-${empresaNorm || 'todas'}`
  const hit         = cached(cacheKey)
  if (hit) { console.log(`[Extractor] Cache hit ${cacheKey}`); return hit }

  const allRows = await _loadAllRows(year)
  if (!allRows.length) return null

  const rows = empresaNorm
    ? allRows.filter(r => r.empresa.toUpperCase() === empresaNorm)
    : allRows

  console.log(`[Extractor] Consolidando ${rows.length} linhas (empresa: ${empresaNorm || 'todas'})`)
  const result = consolidarParaKpi(rows)
  setCache(cacheKey, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. ROF096 — FechamentoCartaoProducao
//    Pasta:   /Banco de Dados - DAF - Pós-Vendas/Fechamento Cartão Produção/{ano}/
//    Colunas: B(1)=Empresa_Nome  M(12)=disponíveis
//    Obs:     Cabeçalho na linha 1 (índice 0), dados a partir do índice 1
// ─────────────────────────────────────────────────────────────────────────────

const ROF096_FOLDER_BASE = '/Banco de Dados - DAF - Pós-Vendas/Fechamento Cartão Produção'
const ROF096_PATTERN     = /^ROF096_FECHAMENTOCARTAOPRODUCAO/i

export async function listROF096Files() {
  const cacheKey = 'rof096-file-list-all'
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const driveId = process.env.SHAREPOINT_DRIVE_ID
    if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado')

    const client = getGraphClient()

    const baseEndpoint = `/drives/${driveId}/root:${ROF096_FOLDER_BASE}:/children`
    let res = await client.api(baseEndpoint).get()
    let baseItems = [...(res.value || [])]
    while (res['@odata.nextLink']) {
      res       = await client.api(res['@odata.nextLink']).get()
      baseItems = [...baseItems, ...(res.value || [])]
    }

    const subfolders = baseItems.filter(i => i.folder)

    const allFiles = []
    await Promise.allSettled(
      subfolders.map(async folder => {
        const endpoint = `/drives/${driveId}/items/${folder.id}/children`
        let items = [], r = await client.api(endpoint).get()
        items = [...(r.value || [])]
        while (r['@odata.nextLink']) {
          r     = await client.api(r['@odata.nextLink']).get()
          items = [...items, ...(r.value || [])]
        }
        for (const item of items) {
          if (ROF096_PATTERN.test(item.name)) {
            allFiles.push({
              name:         item.name,
              downloadUrl:  item['@microsoft.graph.downloadUrl'],
              lastModified: item.lastModifiedDateTime,
              sizeBytes:    item.size,
            })
          }
        }
      })
    )

    allFiles.sort((a, b) => a.name.localeCompare(b.name))
    setCache(cacheKey, allFiles)
    return allFiles
  })
}

export function parseROF096Buffer(buffer, meta) {
  const wb   = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const ws   = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

  // Linha 0 = cabeçalho, dados a partir da linha 1
  if (rows.length < 2) return []

  const periodoFallback = `${meta.year}-01`
  const result = []
  for (const row of rows.slice(1)) {
    if (!row || row.length < 13) continue

    const empresaNome = normalizeEmpresaNome(row[1])                          // coluna B
    const disponiveis = safeNum(row[12])                                       // coluna M
    const periodo     = serialToYearMonth(row[3]) || periodoFallback           // coluna D
    const semanaKey   = serialToWeekKey(row[3]) || null

    if (!disponiveis) continue

    result.push({ empresaNome, disponiveis, periodo, semanaKey, arquivo: meta.name })
  }
  return result
}

function consolidarROF096(rows) {
  const qd = {}, md = {}, sd = {}

  for (const r of rows) {
    const q = quarter(r.periodo)
    const m = mesKey(r.periodo)
    const s = r.semanaKey
    qd[q] = (qd[q] || 0) + r.disponiveis
    if (m) md[m] = (md[m] || 0) + r.disponiveis
    if (s) sd[s] = (sd[s] || 0) + r.disponiveis
  }

  const fyD = rows.reduce((s, r) => s + r.disponiveis, 0) || null

  return {
    disponiveis: {
      q1: qd.q1 ?? null, q2: qd.q2 ?? null, q3: qd.q3 ?? null, q4: qd.q4 ?? null, fy: fyD,
      ...Object.fromEntries(ALL_MONTHS.map(m => [m, md[m] ?? null])),
      ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  sd[s] ?? null])),
    },
    metaData: {
      totalArquivos: [...new Set(rows.map(r => r.arquivo))].length,
      totalLinhas:   rows.length,
      periodos:      [...new Set(rows.map(r => r.periodo))].sort(),
      empresas:      [...new Set(rows.map(r => r.empresaNome))].sort(),
    },
  }
}

async function _loadAllROF096Rows(year) {
  const yearStr  = String(year)
  const cacheKey = `rof096-raw-${yearStr}`
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const allFiles = await listROF096Files()
    const files    = allFiles.filter(f => f.name.includes(yearStr) || !VALID_YEARS.has(yearStr))
    if (!files.length) { console.warn(`[ROF096] Nenhum arquivo para ${yearStr}`); return [] }

    const allRows = []
    const BATCH   = 3
    for (let i = 0; i < files.length; i += BATCH) {
      const results = await Promise.allSettled(
        files.slice(i, i + BATCH).map(async f => {
          console.log(`[ROF096] Baixando ${f.name} (${(f.sizeBytes / 1024).toFixed(0)} KB)...`)
          const buf  = await downloadBuffer(f.downloadUrl)
          const rows = parseROF096Buffer(buf, { ...f, year })
          console.log(`[ROF096] ${f.name}: ${rows.length} linhas válidas`)
          return rows
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allRows.push(...r.value)
        else console.error('[ROF096] Erro no lote:', r.reason?.message)
      }
    }
    setCache(cacheKey, allRows)
    return allRows
  })
}

export async function extractROF096(year = new Date().getFullYear(), empresaNome = null) {
  const yearStr     = String(year)
  const empresaNorm = empresaNome ? normalizeEmpresaNome(empresaNome).toUpperCase() : null

  const cacheKey = `rof096-${yearStr}-${empresaNorm || 'todas'}`
  const hit = cached(cacheKey)
  if (hit) { console.log(`[ROF096] Cache hit ${cacheKey}`); return hit }

  const allRows   = await _loadAllROF096Rows(year)
  const rowsDoAno = allRows.filter(r => r.periodo?.startsWith(yearStr))
  const rows      = empresaNorm
    ? rowsDoAno.filter(r => r.empresaNome.toUpperCase() === empresaNorm)
    : rowsDoAno

  console.log(`[ROF096] Total linhas ${yearStr} (empresa: ${empresaNorm || 'todas'}): ${rows.length}`)
  const result = consolidarROF096(rows)
  setCache(cacheKey, result)
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. ROF042 — FaturamentoServicosProdutivos
//    Pasta:   /Banco de Dados - DAF - Pós-Vendas/Vendas Mecânicos
//    Colunas: A(0)=Empresa  O(14)=Hr.Aplic.  Q(16)=Hr.Vend.  AB(27)=NF Data
//    Obs:     Linha 1 em branco — cabeçalho na linha 2 (índice 1)
// ─────────────────────────────────────────────────────────────────────────────

const ROF042_FOLDER  = '/Banco de Dados - DAF - Pós-Vendas/Vendas Mecânicos'
const ROF042_PATTERN = /^ROF042_FaturamentoServicosProdutivos_Excel/i

export async function listROF042Files() {
  const cacheKey = 'rof042-file-list'
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const driveId = process.env.SHAREPOINT_DRIVE_ID
    if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado')

    const client   = getGraphClient()
    const endpoint = `/drives/${driveId}/root:${ROF042_FOLDER}:/children`
    const allFiles = []
    let res = await client.api(endpoint).get()
    let items = [...(res.value || [])]
    while (res['@odata.nextLink']) {
      res   = await client.api(res['@odata.nextLink']).get()
      items = [...items, ...(res.value || [])]
    }

    for (const item of items) {
      if (ROF042_PATTERN.test(item.name)) {
        allFiles.push({
          name:         item.name,
          downloadUrl:  item['@microsoft.graph.downloadUrl'],
          lastModified: item.lastModifiedDateTime,
          sizeBytes:    item.size,
        })
      }
    }

    allFiles.sort((a, b) => a.name.localeCompare(b.name))
    setCache(cacheKey, allFiles)
    return allFiles
  })
}

/**
 * Parseia um buffer ROF042.
 * Linha 1 em branco → cabeçalho na linha 2 (índice 1) → dados a partir do índice 2.
 */
export function parseROF042Buffer(buffer, meta) {
  const wb    = XLSX.read(buffer, { type: 'buffer', cellDates: false })
  const ws    = wb.Sheets[wb.SheetNames[0]]
  const rows  = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true })

  // Linha 0 = branco, linha 1 = cabeçalho, dados a partir da linha 2
  if (rows.length < 3) return []

  const result = []
  for (const row of rows.slice(2)) {
    if (!row || row.length < 28) continue

    const empresaNome = normalizeEmpresaNome(row[0])                                    // coluna A
    const hrAplic     = safeNum(row[15])                                                // coluna P — Hr. Total
    const hrVend      = safeNum(row[16])                                                // coluna Q
    // Coluna AB tem data+hora — converte para só data antes de extrair período
    const rawDate     = typeof row[27] === 'number' ? Math.floor(row[27]) : row[27]
    const periodo     = serialToYearMonth(rawDate)                                      // coluna AB — NF Data
    const semanaKey   = serialToWeekKey(rawDate) || null

    if (!periodo) continue
    if (!hrAplic && !hrVend) continue

    result.push({ empresaNome, hrAplic, hrVend, periodo, semanaKey, arquivo: meta.name })
  }
  return result
}

/**
 * Consolida linhas ROF042 em { hrAplic, hrVend } por período.
 */
function consolidarROF042(rows) {
  const qa = {}, qv = {}, ma = {}, mv = {}, sa = {}, sv = {}

  for (const r of rows) {
    const q = quarter(r.periodo)
    const m = mesKey(r.periodo)
    const s = r.semanaKey
    qa[q] = (qa[q] || 0) + r.hrAplic
    qv[q] = (qv[q] || 0) + r.hrVend
    if (m) { ma[m] = (ma[m] || 0) + r.hrAplic; mv[m] = (mv[m] || 0) + r.hrVend }
    if (s) { sa[s] = (sa[s] || 0) + r.hrAplic; sv[s] = (sv[s] || 0) + r.hrVend }
  }

  const fyA = rows.reduce((s, r) => s + r.hrAplic, 0) || null
  const fyV = rows.reduce((s, r) => s + r.hrVend,  0) || null

  const per = (monthly, weekly, fy) => ({
    q1: monthly.q1 ?? null, q2: monthly.q2 ?? null, q3: monthly.q3 ?? null, q4: monthly.q4 ?? null, fy,
    ...Object.fromEntries(ALL_MONTHS.map(m => [m, monthly[m] ?? null])),
    ...Object.fromEntries(ALL_WEEKS.map(s  => [s,  weekly[s]  ?? null])),
  })

  return {
    hrAplic: per(ma, sa, fyA),
    hrVend:  per(mv, sv, fyV),
    metaData: {
      totalArquivos: [...new Set(rows.map(r => r.arquivo))].length,
      totalLinhas:   rows.length,
      periodos:      [...new Set(rows.map(r => r.periodo))].sort(),
      empresas:      [...new Set(rows.map(r => r.empresaNome))].sort(),
    },
  }
}

/**
 * Extrai e consolida horas do ROF042, opcionalmente filtrado por empresa.
 * @param {number} year
 * @param {string|null} empresaNome — nome canônico (ex: 'CAMPO GRANDE')
 */
async function _loadAllROF042Rows(year) {
  const yearStr  = String(year)
  const cacheKey = `rof042-raw-${yearStr}`
  const hit = cached(cacheKey)
  if (hit) return hit

  return dedupeAsync(cacheKey, async () => {
    const allFiles = await listROF042Files()
    const files    = VALID_YEARS.has(yearStr)
      ? allFiles.filter(f => f.name.includes(yearStr))
      : allFiles
    if (!files.length) { console.warn(`[ROF042] Nenhum arquivo para ${yearStr}`); return [] }

    const allRows = []
    const BATCH   = 3
    for (let i = 0; i < files.length; i += BATCH) {
      const results = await Promise.allSettled(
        files.slice(i, i + BATCH).map(async f => {
          console.log(`[ROF042] Baixando ${f.name} (${(f.sizeBytes / 1024).toFixed(0)} KB)...`)
          const buf  = await downloadBuffer(f.downloadUrl)
          const rows = parseROF042Buffer(buf, f)
          console.log(`[ROF042] ${f.name}: ${rows.length} linhas válidas`)
          return rows
        })
      )
      for (const r of results) {
        if (r.status === 'fulfilled') allRows.push(...r.value)
        else console.error('[ROF042] Erro no lote:', r.reason?.message)
      }
    }
    setCache(cacheKey, allRows)
    return allRows
  })
}

export async function extractROF042(year = new Date().getFullYear(), empresaNome = null) {
  const yearStr     = String(year)
  const empresaNorm = empresaNome ? normalizeEmpresaNome(empresaNome).toUpperCase() : null

  const cacheKey = `rof042-${yearStr}-${empresaNorm || 'todas'}`
  const hit = cached(cacheKey)
  if (hit) { console.log(`[ROF042] Cache hit ${cacheKey}`); return hit }

  const allRows   = await _loadAllROF042Rows(year)
  const rowsDoAno = allRows.filter(r => r.periodo?.startsWith(yearStr))
  const rows      = empresaNorm
    ? rowsDoAno.filter(r => r.empresaNome.toUpperCase() === empresaNorm)
    : rowsDoAno

  console.log(`[ROF042] Total linhas ${yearStr} (empresa: ${empresaNorm || 'todas'}): ${rows.length}`)
  const result = consolidarROF042(rows)
  setCache(cacheKey, result)
  return result
}
