/**
 * sharepointPlanoDms.js
 *
 * Motor bespoke do cálculo de comissão de Plano DMS: cruza as Ordens de Serviço tipo P04
 * (abertura de plano de manutenção) com o arquivo que relaciona Chassi -> Plano vendido, pra
 * saber qual categoria+prazo cada O.S. representa. A contagem por (consultor, categoria, prazo)
 * é feita no front (CalculoPlanoDms.jsx), que também resolve funcionário/política/valor — este
 * serviço só entrega os dois lados já casados.
 *
 * Fontes SharePoint:
 *  - O.S.: pasta /Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS, arquivo com prefixo
 *    "ROF001_OSABERTA POR DATA" (nome completo muda por ano, ex: "...2026.xlsx").
 *  - Chassi -> Plano: pasta /Banco de Dados - DAF - Pós-Vendas/CRM DMS DAF, arquivo com prefixo
 *    "Chassi do Contrato" (nome/sufixo mudam a cada export) — é um SNAPSHOT de todos os
 *    contratos, não escopado por período, então sempre usa o mais recente (lastModifiedDateTime),
 *    sem filtrar por ano/data.
 *
 * O join Chassi é por SUFIXO: o arquivo de plano guarda um código curto (6-8 caracteres) que é
 * o final do VIN completo (17 caracteres) usado no arquivo de O.S. — confirmado empiricamente
 * (ver plano em C:\Users\hilde\.claude\plans, seção "Comissão Plano DMS").
 */

import * as XLSX from 'xlsx'
import { graphGet } from './graphClient.js'
import { listarArquivos, baixarBuffer, toIsoDate } from './sharepointFonteCalculo.js'

const PASTA_OS = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIXO_OS = 'ROF001_OSABERTA POR DATA'
const PASTA_PLANO = '/Banco de Dados - DAF - Pós-Vendas/CRM DMS DAF'
const PREFIXO_PLANO = 'Chassi do Contrato'

const CACHE_TTL_MS = 5 * 60 * 1000
const _cache = new Map() // chave `${ano}|${periodoInicio}|${periodoFim}` -> { resultado, ts }

export function clearPlanoDmsCache() {
  _cache.clear()
}

async function baixarPlanilha(file) {
  const downloadUrl = file['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error(`Sem URL de download para o arquivo "${file.name}"`)
  const buffer = await baixarBuffer(downloadUrl)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

// O.S. tipo P04 do ano informado, já dentro do período (por Data_Criacao).
async function getOsPlanoDms(ano, periodoInicio, periodoFim) {
  const files = await listarArquivos({ pastaSharepoint: PASTA_OS, prefixoArquivo: PREFIXO_OS, usaSubpastaAno: false, ano })
  const rows = await baixarPlanilha(files[0])
  return rows
    .filter(r => String(r['TipoOS_Sigla'] ?? '').trim() === 'P04')
    .map(r => ({
      os_numero: String(r['OS_Numero'] ?? '').trim(),
      consultor_nome: String(r['Consultor_Nome'] ?? '').trim(),
      empresa_nome: String(r['Empresa_Nome'] ?? '').trim(),
      veiculo_chassi: String(r['Veiculo_Chassi'] ?? '').trim(),
      proprietario_veiculo: String(r['Proprietario_Veiculo'] ?? '').trim(),
      data_criacao: toIsoDate(r['Data_Criacao']),
    }))
    .filter(r => r.os_numero !== '' && r.veiculo_chassi !== '')
    .filter(r => (!periodoInicio || r.data_criacao >= periodoInicio) && (!periodoFim || r.data_criacao <= periodoFim))
}

// Snapshot mais recente de Chassi -> Plano vendido. Chassi (curto) -> { categoria, prazo }.
// Quando um chassi tem mais de um contrato vinculado, prefere o(s) com status "Ativo ..."
// (Ativo com Gobrax / Ativo sem Gobrax); entre ativos, o de data de modificação mais recente.
async function getChassiPlanoMap() {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  const folderData = await graphGet(`/drives/${driveId}/root:${PASTA_PLANO}:/children`)
  const files = (folderData.value || []).filter(f => f.name && f.name.startsWith(PREFIXO_PLANO))
  if (files.length === 0) throw new Error(`Nenhum arquivo "${PREFIXO_PLANO}*.xlsx" encontrado na pasta SharePoint: ${PASTA_PLANO}`)
  files.sort((a, b) => new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime))

  const rows = await baixarPlanilha(files[0])
  const map = new Map() // chassiCurto -> { categoria, prazo, ativo, dataModificacao }

  for (const r of rows) {
    const chassi = String(r['Chassi'] ?? '').trim().toUpperCase()
    if (!chassi) continue
    const status = String(r['Razão do Status (Contrato) (Contrato DMS)'] ?? '').trim()
    const entrada = {
      categoria: String(r['Tipo (Contrato) (Contrato DMS)'] ?? '').trim(),
      prazo: parseInt(String(r['Prazo (Contrato) (Contrato DMS)'] ?? '').trim(), 10) || null,
      status,
      ativo: status.startsWith('Ativo'),
      dataModificacao: toIsoDate(r['(Não Modificar) Data de Modificação']) || '',
    }
    if (!entrada.categoria || !entrada.prazo) continue

    const atual = map.get(chassi)
    if (!atual) { map.set(chassi, entrada); continue }
    if (entrada.ativo && !atual.ativo) { map.set(chassi, entrada); continue }
    if (entrada.ativo === atual.ativo && entrada.dataModificacao > atual.dataModificacao) map.set(chassi, entrada)
  }

  return { map, lastModified: files[0].lastModifiedDateTime }
}

// Tenta casar o VIN completo da O.S. (17 posições) contra o mapa de chassi curto, testando
// sufixos de 8, 7 e 6 caracteres (nessa ordem) — o arquivo de plano guarda tamanhos variados.
function resolverPlanoPorChassi(veiculoChassi, chassiMap) {
  const vin = veiculoChassi.toUpperCase()
  for (const tam of [8, 7, 6]) {
    if (vin.length < tam) continue
    const sufixo = vin.slice(-tam)
    const achado = chassiMap.get(sufixo)
    if (achado) return achado
  }
  return null
}

// Junta O.S. P04 do período com o mapa de Chassi -> Plano. Retorna:
//  - matched: [{ os_numero, consultor_nome, empresa_nome, proprietario_veiculo, data_criacao, veiculo_chassi, categoria, prazo }]
//    (chassi achado E com status ativo — só esses contam pra comissão)
//  - semPlano: [{ ...os }] (chassi não encontrado em nenhum contrato do arquivo de plano)
//  - planoInativo: [{ ...os, categoria, prazo, status }] (chassi achado, mas o contrato não está
//    ativo — ex: "Pendente de Contrato", "Renovado - Remover Gobrax")
export async function calcularPlanoDms({ periodoInicio, periodoFim, ano }) {
  const chaveCache = `${ano}|${periodoInicio}|${periodoFim}`
  const cacheado = _cache.get(chaveCache)
  if (cacheado && (Date.now() - cacheado.ts) < CACHE_TTL_MS) return cacheado.resultado

  const [osRows, { map: chassiMap }] = await Promise.all([
    getOsPlanoDms(ano, periodoInicio, periodoFim),
    getChassiPlanoMap(),
  ])

  const matched = []
  const semPlano = []
  const planoInativo = []
  for (const os of osRows) {
    const plano = resolverPlanoPorChassi(os.veiculo_chassi, chassiMap)
    if (!plano) {
      semPlano.push(os)
    } else if (plano.ativo) {
      matched.push({ ...os, categoria: plano.categoria, prazo: plano.prazo })
    } else {
      planoInativo.push({ ...os, categoria: plano.categoria, prazo: plano.prazo, status: plano.status })
    }
  }

  const resultado = { matched, semPlano, planoInativo }
  _cache.set(chaveCache, { resultado, ts: Date.now() })
  return resultado
}
