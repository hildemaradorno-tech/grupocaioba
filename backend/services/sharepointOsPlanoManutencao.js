import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// O.S. de Plano de Manutenção (tipo P04) do Dealer.net ROF017_FATURAMENTOPOROS (Relatório Geral OS).
// É a fonte de O.S. dos indicadores do Resumo (antes eram ROF042 + ROF017): assim cada indicador
// confere com dois relatórios — vendas + ROF017, ou contratos (CRM DAF) + ROF017.
// Um arquivo por ano ("ROF017_FATURAMENTOPOROS 2026.xlsx"); cada linha é um item (TMO/produto) da NF de uma O.S.
// O tipo P04 só existe a partir de 2024, então os arquivos anteriores nem são baixados.
const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIX = 'ROF017_FATURAMENTOPOROS'
// ROF001 (O.S. aberta): base das abas Ordens de Serviço e Contratos — todas as O.S. com chassi e situação
// (Faturada, Encerrada, Em Andamento, Cancelada...). O faturamento (NF) é localizado no ROF017.
// Arquivo: "ROF001_OSAberta_Excel TODAS" (todas as O.S. do ano). As fotos do dia (ROF001_OSABERTA e
// ROF001_OSABERTA_ENCERRADA) não entram. A mesma O.S. em mais de um arquivo vale a do arquivo mais recente.
const PREFIX_ABERTA = 'ROF001_OSABERTA_EXCEL'
const ANO_INICIAL = 2024
const TIPO_OS = 'P04'
// Código do TMO (NotaFiscalItem_TMOCod) → referência usada nas regras do BI.
const TMO_REFERENCIA = { 3216: 'PLAN01', 3218: 'PLAN02' }

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0
// Linhas P04 já lidas de cada arquivo: só baixa de novo o arquivo que mudou no SharePoint (na prática, o do
// ano atual). Os arquivos do ROF017 são grandes (~5–7 MB, ~40 mil linhas): guarda só as linhas P04.
const _porArquivo = new Map() // id → { lastModified, rows }

// O refresh só invalida a lista; os arquivos sem alteração continuam vindo da memória.
export function clearOsPlanoManutencaoCache() { _cache = null; _cacheTs = 0 }

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => { if (v === '' || v === null || v === undefined) return 0; const n = Number(v); return isNaN(n) ? 0 : n }
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
export function getOsPlanoManutencao() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return Promise.resolve(_cache)
  if (!_emAndamento) _emAndamento = carregar().finally(() => { _emAndamento = null })
  return _emAndamento
}

async function carregar() {
  const ano = (nome) => Number((nome.match(/\d{4}/) || [])[0])
  const arquivos = (await listar(PASTA))
    .filter(i => i.file && ((i.name?.startsWith(PREFIX) && ano(i.name) >= ANO_INICIAL) || i.name?.toUpperCase().startsWith(PREFIX_ABERTA)))
  const rows = []
  const abertas = new Map() // empresa|O.S. → O.S. do ROF001 (do arquivo mais recente)
  const arquivosLidos = []
  let lastModified = null

  // Um arquivo por vez (são grandes), liberando o servidor entre eles para as outras telas não esperarem.
  const pendentes = arquivos.filter(i => i['@microsoft.graph.downloadUrl'] && _porArquivo.get(i.id)?.lastModified !== i.lastModifiedDateTime)
  for (const item of pendentes) {
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 120_000 })
    const ehAberta = item.name.toUpperCase().startsWith(PREFIX_ABERTA)
    const linhasP04 = (ehAberta ? lerArquivoAberta : lerArquivo)(Buffer.from(resp.data), item.name)
    _porArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows: linhasP04, aberta: ehAberta })
    console.log(`[OsPlanoManutencao] ${item.name}: ${linhasP04.length} linha(s) P04`)
    await new Promise(r => setImmediate(r))
  }

  // Do mais antigo para o mais recente: a O.S. que aparece de novo num arquivo mais novo fica com os dados dele.
  for (const item of [...arquivos].sort((a, b) => a.lastModifiedDateTime.localeCompare(b.lastModifiedDateTime))) {
    const lido = _porArquivo.get(item.id)
    if (!lido) continue
    if (lido.aberta) lido.rows.forEach(o => abertas.set(`${o.empresa_nome.toUpperCase()}|${o.os}`, o))
    else rows.push(...lido.rows)
    arquivosLidos.push({ nome: item.name, linhas: lido.rows.length })
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
  }

  _cache = { rows, abertas: [...abertas.values()], arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}

function lerArquivo(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellHTML: false, cellText: false })
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const rows = []
  for (const r of linhas) {
    if (txt(r.TipoOS_Sigla) !== TIPO_OS) continue
    const codTmo = txt(r.NotaFiscalItem_TMOCod)
    const vlProduto = num(r.ProdValor)
    const vlServico = num(r.ServValor)
    rows.push({
      empresa_nome: txt(r.Empresa_Nome),
      chassi: txt(r.Veiculo_Chassi),
      placa_os: txt(r.OS_VeiculoPlaca),
      tipo_os: TIPO_OS,
      os: txt(r.OS_Numero),
      data_abertura: dataSerial(r.OS_DataCriacao),
      data_encerramento: dataSerial(r.DataEncerramento),
      tmo_codigo: codTmo,                              // NotaFiscalItem_TMOCod (3216, 3218, 3236...)
      tmo: TMO_REFERENCIA[codTmo] || codTmo,           // PLAN01 / PLAN02 / o próprio código
      tmo_descricao: txt(r.TMOProdDesc),
      vl_liquido: vlServico,                           // ServValor (serviços)
      vl_produto: vlProduto,                           // ProdValor (peças)
      vl_total: vlServico + vlProduto,
      data: dataSerial(r.OSData_Faturamento),          // data da NF (faturamento)
      nf: txt(r.NotaFiscal_Numero),
    })
  }
  return rows
}

// ROF001: uma ou mais linhas por O.S. (uma por NF/produtivo, cada uma com a sua parte dos valores) → uma por O.S.
// O "TODAS" tem cabeçalho com espaços ("OS Numero") e a situação da O.S.; as fotos do dia usam "_" ("OS_Numero")
// e não trazem a situação: lá vale "Encerrada" se tem data de fechamento, senão "Em Andamento".
function lerArquivoAberta(buffer, nome) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellHTML: false, cellText: false })
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const col = (r, nomeCol) => (r[nomeCol] !== undefined ? r[nomeCol] : r[nomeCol.replace(/ /g, '_')])
  const porOs = new Map()
  for (const r of linhas) {
    if (txt(col(r, 'Tipo OS Sigla') ?? r.TipoOS_Sigla) !== TIPO_OS && txt(r.TipoOS_Sigla) !== TIPO_OS) continue
    const empresa = txt(col(r, 'Empresa') ?? r.Empresa_Nome) || txt(r.Empresa_Nome)
    const os = txt(col(r, 'OS Numero'))
    if (!empresa || !os) continue
    const k = `${empresa}|${os}`
    const total = num(col(r, 'Total'))
    if (porOs.has(k)) { porOs.get(k).vl_os += total; continue }
    const fechado = col(r, 'Fechado')
    const situacao = txt(r['Situacao Tipo OS']) || (fechado !== '' && fechado != null ? 'Encerrada' : 'Em Andamento')
    porOs.set(k, {
      empresa_nome: empresa,
      os,
      chassi: txt(col(r, 'Veiculo Chassi')),
      placa: txt(col(r, 'Veiculo Placa')),
      cliente: txt(col(r, 'Proprietario Veiculo')),
      data_abertura: dataSerial(col(r, 'Data Criacao')),
      situacao,                                   // Faturada, Encerrada, Em Andamento, Cancelada...
      vl_os: total,                               // Total da O.S. (soma das linhas)
      arquivo: nome,
    })
  }
  return [...porOs.values()]
}
