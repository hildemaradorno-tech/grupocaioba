import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// O.S. de Plano de Manutenção (tipo P04) do Dealer.net ROF042_FaturamentoServicosProdutivos_Excel.
// Um arquivo por ano (até 2024) ou por mês ("... 2026.10.xlsx"). Linha 1 em branco, cabeçalho na
// linha 2; cada linha é um TMO (serviço) de uma O.S. — a mesma O.S. aparece em várias linhas.
const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Vendas Mecânicos'
const PREFIX = 'ROF042_FaturamentoServicosProdutivos_Excel'
const TIPO_OS = /^P04\b/i

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0
// Linhas já lidas de cada arquivo: só baixa de novo o arquivo que mudou no SharePoint
// (os arquivos antigos, 2020–2025, quase nunca mudam).
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

// O ROF042 não tem a data de abertura da O.S.: ela vem do ROF017 (OS_DataCriacao), junto com a placa da O.S.
// Fica guardada por "O.S.|chassi" e só se consulta o ROF017 para O.S. ainda não vistas. Os arquivos do ROF017
// são grandes (~5–7 MB e ~40 mil linhas por ano), então:
// - a leitura roda em SEGUNDO PLANO: a tela recebe as O.S. na hora e a abertura entra na próxima leitura;
// - um arquivo por vez, guardando só as O.S. procuradas (não mantém as linhas do ROF017 em memória).
// Lê o ano da NF e o anterior (a O.S. pode abrir num ano e faturar no outro).
const PASTA_ROF017 = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIX_ROF017 = 'ROF017_FATURAMENTOPOROS'
const _abertura = new Map() // "os|chassi" → { data_abertura, placa_os } | {} (não achada)
const chaveOs = (r) => `${r.os}|${r.chassi.toUpperCase()}`
let _aberturaEmAndamento = null

function completarAberturaEmSegundoPlano(rows) {
  if (_aberturaEmAndamento) return
  const faltando = rows.filter(r => !_abertura.has(chaveOs(r)))
  if (!faltando.length) return
  _aberturaEmAndamento = completarAbertura(faltando)
    .catch(e => console.warn('[OsPlanoManutencao] não foi possível ler a abertura no ROF017:', e.message))
    .finally(() => { _aberturaEmAndamento = null })
}

async function completarAbertura(faltando) {
  const anos = new Set()
  faltando.forEach(r => { const a = Number((r.data || '').slice(0, 4)); if (a) { anos.add(a); anos.add(a - 1) } })
  const procuradas = new Set(faltando.map(chaveOs))
  const achadas = new Map()
  const arquivos = (await listar(PASTA_ROF017))
    .filter(i => i.file && i.name?.startsWith(PREFIX_ROF017) && anos.has(Number((i.name.match(/\d{4}/) || [])[0])))
  for (const item of arquivos) {
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 120_000 })
    const ws = XLSX.read(Buffer.from(resp.data), { type: 'buffer', cellHTML: false, cellText: false }).Sheets
    const linhas = XLSX.utils.sheet_to_json(ws[Object.keys(ws)[0]], { header: 1, defval: '' })
    const cab = (linhas[0] || []).map(txt)
    const col = (nome) => cab.indexOf(nome)
    const [cOs, cChassi, cData, cPlaca] = [col('OS_Numero'), col('Veiculo_Chassi'), col('OS_DataCriacao'), col('OS_VeiculoPlaca')]
    for (let i = 1; i < linhas.length; i++) {
      const l = linhas[i]
      const chave = `${txt(l[cOs])}|${txt(l[cChassi]).toUpperCase()}`
      if (procuradas.has(chave) && !achadas.has(chave)) achadas.set(chave, { data_abertura: dataSerial(l[cData]), placa_os: txt(l[cPlaca]) })
    }
    console.log(`[OsPlanoManutencao] abertura: ${item.name} lido (${achadas.size}/${procuradas.size} O.S. achadas)`)
    // Libera o servidor entre um arquivo e outro, para as outras telas não ficarem esperando.
    await new Promise(r => setImmediate(r))
  }
  procuradas.forEach(k => _abertura.set(k, achadas.get(k) || {}))
}

// Linhas devolvidas à tela: as O.S. P04 com a abertura/placa que já tiver sido achada no ROF017.
const comAbertura = (c) => c && { ...c, rows: c.rows.map(r => ({ ...r, ..._abertura.get(chaveOs(r)) })) }

// Duas telas abrindo juntas aguardam a mesma leitura em vez de baixar tudo duas vezes.
let _emAndamento = null
export async function getOsPlanoManutencao() {
  if (!(_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS)) {
    if (!_emAndamento) _emAndamento = carregar().finally(() => { _emAndamento = null })
    await _emAndamento
  }
  completarAberturaEmSegundoPlano(_cache.rows)
  return comAbertura(_cache)
}

async function carregar() {
  const arquivos = (await listar(PASTA))
    .filter(i => i.file && i.name?.toLowerCase().startsWith(PREFIX.toLowerCase()))
  const rows = []
  const arquivosLidos = []
  let lastModified = null

  // Baixa em lotes de 4 só os arquivos novos ou alterados.
  const pendentes = arquivos.filter(i => i['@microsoft.graph.downloadUrl'] && _porArquivo.get(i.id)?.lastModified !== i.lastModifiedDateTime)
  for (let i = 0; i < pendentes.length; i += 4) {
    await Promise.all(pendentes.slice(i, i + 4).map(async item => {
      const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 60_000 })
      const linhasP04 = lerArquivo(Buffer.from(resp.data))
      _porArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows: linhasP04 })
      console.log(`[OsPlanoManutencao] ${item.name}: ${linhasP04.length} linha(s) P04`)
    }))
    // Libera o servidor entre os lotes, para as outras telas (ex.: Veículos Vendidos) não ficarem esperando.
    await new Promise(r => setImmediate(r))
  }

  for (const item of arquivos) {
    const lido = _porArquivo.get(item.id)
    if (!lido) continue
    rows.push(...lido.rows)
    arquivosLidos.push({ nome: item.name, linhas: lido.rows.length })
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
  }

  _cache = { rows, arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}

function lerArquivo(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' })
  const rows = []
  for (const r of linhas.slice(2)) {
    const tipo = txt(r[5])
    if (!TIPO_OS.test(tipo)) continue
    rows.push({
      empresa_nome: txt(r[0]),             // A — Empresa
      produtivo: txt(r[1]),                // B
      consultor: txt(r[2]),                // C
      chassi: txt(r[3]),                   // D
      tipo_os: tipo,                       // F — Tipo O.S.
      os: txt(r[7]),                       // H — O.S.
      data_encerramento: dataSerial(r[8]), // I
      tmo: txt(r[9]),                      // J — TMO Referência
      tmo_descricao: txt(r[10]),           // K
      hr_vend: num(r[16]),                 // Q — Hr. Vend.
      vl_liquido: num(r[21]),              // V — Vl Líquido (serviços)
      vl_produto: num(r[25]),              // Z — Vl Produto (peças)
      vl_total: num(r[26]),                // AA — Serviços+Produtos
      data: dataSerial(r[27]),             // AB — NF Data
      nf: txt(r[28]),                      // AC — NF Número
    })
  }
  return rows
}
