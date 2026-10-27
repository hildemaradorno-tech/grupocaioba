import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// Campanhas CRM de agendamento (Dealer.net RCR038). Cada ano tem sua subpasta (ex: ".../CAMPANHA CRM/2026")
// e cada arquivo é uma execução de campanha de uma unidade: "RCR038_CampanhaCRM_Clientes_Excel CGR 20261019.xls"
// — a sigla da unidade e a data vêm do NOME do arquivo (a planilha não traz nenhuma das duas).
const PASTA = '/Banco de Dados - DAF - Pós-Vendas/Agendamentos - CRM/CAMPANHA CRM'
const PREFIX = 'RCR038_CampanhaCRM_Clientes_Excel'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

export function clearCampanhasCrmCache() { _cache = null; _cacheTs = 0 }

// "RCR038_CampanhaCRM_Clientes_Excel CGR 20261019.xls" → { sigla: 'CGR', data: '2026-10-19' }
function infoDoNome(nome) {
  const m = nome.slice(PREFIX.length).match(/^\s*([A-Za-z]+)\s+(\d{4})(\d{2})(\d{2})/)
  if (!m) return { sigla: null, data: null }
  return { sigla: m[1].toUpperCase(), data: `${m[2]}-${m[3]}-${m[4]}` }
}

const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n }

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

export async function getCampanhasCrm() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return _cache

  const anos = (await listar(PASTA)).filter(i => i.folder)
  const rows = []
  const arquivosLidos = []
  let lastModified = null

  for (const ano of anos) {
    const arquivos = (await listar(`${PASTA}/${ano.name}`))
      .filter(i => i.file && i.name?.toLowerCase().startsWith(PREFIX.toLowerCase()))
    for (const item of arquivos) {
      const downloadUrl = item['@microsoft.graph.downloadUrl']
      if (!downloadUrl) continue
      const { sigla, data } = infoDoNome(item.name)
      const resp = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
      const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' })
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      let n = 0
      for (const r of linhas) {
        const campanha = num(r.ID_Campanha_Execucao)
        if (campanha === null) continue // linha em branco no fim do arquivo
        rows.push({
          arquivo: item.name,
          sigla,
          data,
          id_campanha_execucao: campanha,
          id_cliente: num(r.ID_Cliente),
          id_prospect: num(r.ID_Prospect),
          id_veiculo: num(r.id_veiculo),
          id_atendimento: num(r.id_atendimento),
          usuario: txt(r.nome_guerra),
          cancelado: txt(r.Cancelado).toUpperCase() === 'S',
          cliente: txt(r.nome),
          cidade: txt(r.descricao),
          uf: txt(r.id_uf),
          chassi: txt(r.Chassi),
          cpf_cnpj: txt(r['CPF/CPNJ']),
        })
        n++
      }
      arquivosLidos.push({ nome: item.name, sigla, data, linhas: n })
      if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
      console.log(`[AgendamentoCRM] ${item.name}: ${n} contato(s)`)
    }
  }

  _cache = { rows, arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}
