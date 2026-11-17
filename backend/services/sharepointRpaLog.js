// BI Controle de Execuções RPA — lê o log que o Robert Automation grava no SharePoint (biblioteca BD,
// pasta "Banco de Dados - Log RPA"):
//   • Historico_Geral_Execucoes_RPA.csv (raiz): uma linha por execução, separador ";", UTF-8 com BOM.
//     Colunas: Data de execução inicial; Data de execução final; Duração; Nome do Robo; Nome da Pasta;
//     Status; Erro; Arquivo de Log
//   • uma subpasta por setor (Contabilidade, Controladoria, Financeiro, Pos Vendas...) com um .txt por
//     execução ("RELATÓRIO DE EXECUÇÃO RPA"), aberto sob demanda no detalhe da execução.
// Os horários do robô são de MS (mesmo fuso dos horários RPA do Agendamento de Processos).
import axios from 'axios'
import { graphGet } from './graphClient.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

const PASTA = '/Banco de Dados - Log RPA'
const ARQUIVO_CSV = 'Historico_Geral_Execucoes_RPA.csv'
const TTL_MS = 5 * 60 * 1000

let cache = null // { em, dados }

const driveId = () => {
  const id = process.env.SHAREPOINT_DRIVE_ID
  if (!id) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  return id
}
const caminhoGraph = (caminho) => `/drives/${driveId()}/root:${encodeURI(caminho)}`

async function baixarTexto(caminho) {
  const meta = await graphGet(caminhoGraph(caminho))
  const url = meta['@microsoft.graph.downloadUrl']
  if (!url) throw new Error(`Não foi possível baixar ${caminho} do SharePoint`)
  const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 60_000 })
  return { texto: Buffer.from(r.data).toString('utf8').replace(/^﻿/, ''), modificadoEm: meta.lastModifiedDateTime || null }
}

// "16/11/2026 10:04:29" → "2026-11-16T10:04:29" (hora local de MS, sem fuso)
function parseDataHora(s) {
  const m = String(s || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}`
}

// "0h 8m 17s" → 497
function parseDuracao(s) {
  const t = String(s || '')
  const h = +(t.match(/(\d+)\s*h/)?.[1] || 0)
  const mi = +(t.match(/(\d+)\s*m/)?.[1] || 0)
  const se = +(t.match(/(\d+)\s*s/)?.[1] || 0)
  return h * 3600 + mi * 60 + se
}

// "Falha na ação [pegasusClicarNovo]: ..." → "pegasusClicarNovo"
const acaoDoErro = (erro) => (erro && erro.match(/\[([^\]]+)\]/)?.[1]) || null

export function parseCsvExecucoes(texto) {
  const linhas = texto.split(/\r?\n/).filter(l => l.trim())
  const out = []
  for (let i = 1; i < linhas.length; i++) {
    const c = linhas[i].split(';')
    if (c.length < 8) continue
    // A mensagem de erro pode conter ";": as 6 primeiras colunas e a última são fixas, o meio é o erro.
    const erroTxt = c.slice(6, c.length - 1).join(';').trim()
    const statusTxt = c[5].trim().toLowerCase()
    const inicio = parseDataHora(c[0])
    if (!inicio) continue
    out.push({
      inicio,
      fim: parseDataHora(c[1]),
      duracao_seg: parseDuracao(c[2]),
      robo: c[3].trim().replace(/\s+/g, ' '),
      pasta: c[4].trim(),
      status: statusTxt.startsWith('suc') ? 'Sucesso' : statusTxt.startsWith('erro') ? 'Erro' : c[5].trim(),
      erro: erroTxt && !/^sem erros?$/i.test(erroTxt) ? erroTxt : null,
      acao_erro: acaoDoErro(erroTxt),
      arquivo_log: c[c.length - 1].trim() || null,
    })
  }
  out.sort((a, b) => b.inicio.localeCompare(a.inicio))
  return out
}

// Agenda cadastrada em Documentações › Agendamento de Processos (rotinas ativas de processos RPA ativos)
// e os relatórios PBI/FAB que dependem de cada RPA (rpa_vinculado_id). Lida com a service role: quem só
// tem acesso ao BI não precisa de permissão no Agendamento de Processos.
async function lerAgenda() {
  const sb = getSupabaseAdmin()
  const [{ data: processos, error: e1 }, { data: rotinas, error: e2 }] = await Promise.all([
    sb.from('rpa_processos').select('id, nome, tipo, departamento_nome, ativo, rpa_vinculado_id'),
    sb.from('rpa_rotinas').select('id, processo_id, ativo, execucoes:rpa_rotina_execucoes(dia_semana, hora)'),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const relatoriosPorRpa = {}
  for (const p of processos || []) {
    if (p.rpa_vinculado_id && p.ativo) (relatoriosPorRpa[p.rpa_vinculado_id] ||= []).push(p.nome)
  }
  return (processos || [])
    .filter(p => (p.tipo || 'RPA') === 'RPA')
    .map(p => ({
      id: p.id,
      nome: p.nome,
      setor: p.departamento_nome,
      ativo: p.ativo,
      relatorios_dependentes: relatoriosPorRpa[p.id] || [],
      horarios: (rotinas || [])
        .filter(r => r.processo_id === p.id && r.ativo)
        .flatMap(r => (r.execucoes || []).filter(e => e.hora).map(e => ({ dia_semana: e.dia_semana, hora: String(e.hora).slice(0, 5) }))),
    }))
}

export async function getRpaLog({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.em < TTL_MS) return cache.dados
  const [{ texto, modificadoEm }, agenda] = await Promise.all([baixarTexto(`${PASTA}/${ARQUIVO_CSV}`), lerAgenda()])
  const dados = { execucoes: parseCsvExecucoes(texto), agenda, arquivo_atualizado_em: modificadoEm, lido_em: new Date().toISOString() }
  cache = { em: Date.now(), dados }
  return dados
}

// Conteúdo do .txt de uma execução. Pasta e arquivo precisam estar no CSV (nada de caminho livre vindo da tela).
export async function getRpaLogArquivo(pasta, arquivo) {
  const { execucoes } = await getRpaLog()
  const existe = execucoes.some(e => e.pasta === pasta && e.arquivo_log === arquivo)
  if (!existe || /[\\/]|\.\./.test(pasta + arquivo)) {
    const err = new Error('Arquivo de log não encontrado no histórico.')
    err.status = 404
    throw err
  }
  const { texto } = await baixarTexto(`${PASTA}/${pasta}/${arquivo}`)
  return texto
}
