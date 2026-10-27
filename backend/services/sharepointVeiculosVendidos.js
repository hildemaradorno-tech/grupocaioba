import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// Veículos vendidos por período (Dealer.net REL_VEICULOSVENDIDOSPORPERIODO_REPORT), um arquivo por ano
// (ex: "REL_VEICULOSVENDIDOSPORPERIODO_REPORT 2026.xlsx"). Cada linha é uma nota: VEN = venda, DVE = devolução.
const PASTA = '/Banco de Dados - DAF - Veículos'
const PREFIX = 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0
// Linhas já lidas de cada arquivo: só baixa de novo o arquivo que mudou no SharePoint.
const _porArquivo = new Map() // id → { lastModified, rows }

// O refresh só invalida a lista; os arquivos sem alteração continuam vindo da memória.
export function clearVeiculosVendidosCache() { _cache = null; _cacheTs = 0 }

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n }
// Data serial do Excel (46027.70...) → 'AAAA-MM-DD' (só o dia; a hora não interessa).
const dataSerial = (v) => {
  const n = num(v)
  if (n === null) return null
  return new Date(Math.round((Math.floor(n) - 25569) * 86400000)).toISOString().slice(0, 10)
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
export function getVeiculosVendidos() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return Promise.resolve(_cache)
  if (!_emAndamento) _emAndamento = carregar().finally(() => { _emAndamento = null })
  return _emAndamento
}

async function carregar() {
  const arquivos = (await listar(PASTA))
    .filter(i => i.file && i.name?.toLowerCase().startsWith(PREFIX.toLowerCase()))
  const rows = []
  const arquivosLidos = []
  let lastModified = null

  // Baixa só os arquivos novos ou alterados.
  const pendentes = arquivos.filter(i => i['@microsoft.graph.downloadUrl'] && _porArquivo.get(i.id)?.lastModified !== i.lastModifiedDateTime)
  await Promise.all(pendentes.map(async item => {
    const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 60_000 })
    const notas = lerArquivo(Buffer.from(resp.data))
    _porArquivo.set(item.id, { lastModified: item.lastModifiedDateTime, rows: notas })
    console.log(`[VeiculosVendidos] ${item.name}: ${notas.length} nota(s)`)
  }))

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
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  const rows = []
  for (const r of linhas) {
    const chassi = txt(r.Veiculo_Chassi)
    if (!chassi) continue // linha em branco / total no fim do arquivo
    rows.push({
      empresa_cod: num(r.NotaFiscal_EmpresaCod),
      empresa_nome: txt(r.NotaFiscal_EmpresaNom),
      movimento: txt(r.NotaFiscal_GrupoMovimento).toUpperCase(), // VEN | DVE
      data: dataSerial(r.NotaFiscal_DataEmissao),
      cancelada: txt(r.NotaFiscal_DataCancelamento) !== '',
      chassi,
      // "SML3D51-MS" ou "SML4H33-  " (sem UF) → tira o hífen solto do fim.
      placa: txt(r.Veiculo_PlacaUF).replace(/-\s*$/, ''),
      estoque_tipo: txt(r.NotaFiscal_EstoqueTipo), // VN novo | VU usado
      marca: txt(r.VeiculoMarca_Descricao),
      modelo: txt(r.VeiculoModeloVeiculo_Descricao),
      cliente: txt(r.NotaFiscal_PessoaNom),
      vendedor: txt(r.NotaFiscal_UsuNomVendedor),
    })
  }
  return rows
}
