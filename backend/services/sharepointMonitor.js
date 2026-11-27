// Governança › Monitor SharePoint (19/11/2026).
// Confere as planilhas do SharePoint que alimentam o portal: se existem, quando foram atualizadas pela última vez
// (atraso = tela com dado velho), quanto o SharePoint demora para responder, o espaço da biblioteca e a validade da
// senha do aplicativo no Azure (quando vence, TODAS as leituras do SharePoint param).
// Usa o mesmo acesso do backend (graphClient: AZURE_TENANT_ID/CLIENT_ID/CLIENT_SECRET + SHAREPOINT_DRIVE_ID).
// Testado em 19/11/2026: drive, pastas e passwordCredentials do app funcionam; saúde do serviço Microsoft (403) não.
import { graphGet, isConfigured } from './graphClient.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

const TTL_MS = 5 * 60 * 1000
const DAF = '/Banco de Dados - DAF - Pós-Vendas'

// Atraso em horas ÚTEIS (sáb/dom não contam — o RPA não roda no fim de semana)
export const LIMITES = { atencaoHorasUteis: 30, criticoHorasUteis: 78, senhaAtencaoDias: 90, senhaCriticoDias: 30, respostaLentaMs: 3000, pctAtencao: 60, pctCritico: 85 }

// Planilhas lidas pelo código do backend (constantes de cada services/sharepoint*.js, conferidas em 19/11/2026).
// padrao: começo do nome (sem diferenciar maiúsculas) ou nome exato (exato: true). subpastas: também olha as
// subpastas de ano (2025, 2026...). frequencia: 'diaria' (gerada pelo RPA) ou 'manual' (só informa a data).
export const FONTES = [
  { id: 'rof001-aberta', nome: 'O.S. Abertas (ROF001)', telas: 'Garantias DAF, Auditoria O.S. Aberta', pasta: `${DAF}/Relatório Geral OS`, padrao: 'ROF001_OSABERTA.xlsx', exato: true, frequencia: 'diaria' },
  { id: 'rof001-encerrada', nome: 'O.S. Encerradas (ROF001)', telas: 'Nenhuma (Garantias DAF passou a usar o ROF001 Excel)', pasta: `${DAF}/Relatório Geral OS`, padrao: 'ROF001_OSABERTA_ENCERRADA.xlsx', exato: true, frequencia: 'diaria' },
  { id: 'rof001-excel', nome: 'O.S. Abertas — todas (ROF001 Excel)', telas: 'Garantias DAF (Com Garantista), BI Agendamento de Serviços, BI Planos de Manutenção', pasta: `${DAF}/Relatório Geral OS`, padrao: 'ROF001_OSAberta_Excel', frequencia: 'diaria' },
  { id: 'rof017', nome: 'Faturamento por O.S. (ROF017)', telas: 'BI Planos de Manutenção, BI Agendamento', pasta: `${DAF}/Relatório Geral OS`, padrao: 'ROF017_FATURAMENTOPOROS', frequencia: 'diaria' },
  { id: 'relgeralos', nome: 'Relatório Geral de O.S.', telas: 'Indicadores de Produtividade (Hr. Aplicadas)', pasta: `${DAF}/Relatório Geral OS`, padrao: 'RELATORIOGERALOS', frequencia: 'diaria' },
  { id: 'rof096', nome: 'Fechamento Cartão Produção (ROF096)', telas: 'Indicadores de Produtividade (Hr. Disponíveis)', pasta: `${DAF}/Fechamento Cartão Produção`, padrao: 'ROF096', subpastas: true, frequencia: 'diaria' },
  { id: 'rof036', nome: 'Cartão Tarefa (ROF036)', telas: 'Indicadores de Produtividade (Hr. Encerradas)', pasta: `${DAF}/Cartão Tarefa`, padrao: 'ROF036', frequencia: 'diaria' },
  { id: 'rof042', nome: 'Vendas Mecânicos (ROF042)', telas: 'Indicadores de Produtividade, BI Dashboard', pasta: `${DAF}/Vendas Mecânicos`, padrao: 'ROF042', frequencia: 'diaria' },
  { id: 'rof101', nome: 'Serviços Não Cobrados (ROF101)', telas: 'Indicadores de Produtividade (Não Cobrado)', pasta: `${DAF}/Serviços executados Não Cobrados`, padrao: 'ROF101', frequencia: 'diaria' },
  { id: 'rpr001', nome: 'Venda de Produtos (RPR001)', telas: 'Comissões, Gestor de Peças, BI', pasta: `${DAF}/Vendas de Produtos`, padrao: 'RPR001_VENDAPRODUTO', frequencia: 'diaria' },
  { id: 'rpr073', nome: 'Itens em Estoque (RPR073)', telas: 'Gestor de Peças', pasta: `${DAF}/Outros Relatórios Peças`, padrao: 'RPR073_ANALISEITENSEMESTOQUE', frequencia: 'diaria' },
  { id: 'rcr038', nome: 'Campanha CRM (RCR038)', telas: 'BI Agendamento de Serviços (Campanhas)', pasta: `${DAF}/Agendamentos - CRM/CAMPANHA CRM`, padrao: 'RCR038_CampanhaCRM_Clientes_Excel', subpastas: true, frequencia: 'diaria' },
  { id: 'rof037', nome: 'Agendamentos de Serviço (ROF037)', telas: 'BI Agendamento de Serviços', pasta: `${DAF}/Agendamentos - CRM/AGENDAMENTO DE SERVICOS E PRODUTOS`, padrao: 'ROF037_AGENDAMENTOSERVICO', subpastas: true, frequencia: 'diaria' },
  { id: 'rcr017', nome: 'Contatos de Encerramento (RCR017)', telas: 'BI Agendamento de Serviços', pasta: `${DAF}/Agendamentos - CRM/LISTA POR DATA CONTATO_ENCERRAMENTO`, padrao: 'RCR017_LISTAPORDATACONTATOENCERRAMENTO', subpastas: true, frequencia: 'diaria' },
  { id: 'rfn003', nome: 'Contas a Receber (RFN003)', telas: 'TruckPag, Extrato de Pagamento DAF', pasta: `/Banco de Dados - DAF - Financeiro`, padrao: 'RFN003_PosicaoAnaliticoReceber_Excel', frequencia: 'diaria' },
  { id: 'rfn024', nome: 'Créditos Não Identificados (RFN024)', telas: 'TruckPag', pasta: `/Banco de Dados - DAF - Financeiro`, padrao: 'RFN024_SALDOCREDITOSNAOIDENTIFICADOS.xlsx', exato: true, frequencia: 'diaria' },
  { id: 'repasses', nome: 'Repasses TruckPag (contas-receber-daf)', telas: 'TruckPag', pasta: `/Banco de Dados - DAF - Financeiro`, padrao: 'contas-receber-daf', frequencia: 'manual' },
  { id: 'veiculos', nome: 'Veículos Vendidos', telas: 'BI Planos de Manutenção (vendas)', pasta: '/Banco de Dados - DAF - Veículos', padrao: 'REL_VEICULOSVENDIDOSPORPERIODO_REPORT', frequencia: 'diaria' },
  { id: 'potencial', nome: 'Plano de Manutenção CRM - RPA (CRM DAF)', telas: 'BI Planos de Manutenção', pasta: `${DAF}/CRM DMS DAF`, padrao: 'PLANO DE MANUTENÇÃO CRM - RPA', contem: true, frequencia: 'manual' },
  { id: 'rpa-log', nome: 'Log de Execuções do RPA', telas: 'Monitor Robert Automation (Dashboard)', pasta: '/Banco de Dados - Log RPA', padrao: 'Historico_Geral_Execucoes_RPA.csv', exato: true, frequencia: 'diaria' },
  // Extrato de Pagamento DAF não tem mais planilha no SharePoint (23/11/2026): o extrato é lido só pela importação
  // na tela, e a pasta "Banco de Dados - DAF - Extrato de Pagamentos" foi excluída. A tela usa o RFN003 acima.
]

// ── utilidades ───────────────────────────────────────────────────────────
const driveId = () => process.env.SHAREPOINT_DRIVE_ID
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Horas úteis (seg–sex) entre a data e agora, no horário de MS (UTC−4)
export function horasUteisDesde(iso) {
  const ini = new Date(iso).getTime()
  const fim = Date.now()
  if (!(fim > ini)) return 0
  const H = 3600 * 1000
  let total = 0
  // anda de hora em hora (limite de 120 dias; acima disso, conta corrida × 5/7)
  if (fim - ini > 120 * 24 * H) return ((fim - ini) / H) * 5 / 7
  for (let t = ini; t < fim; t += H) {
    const dia = new Date(t - 4 * H).getUTCDay()
    if (dia !== 0 && dia !== 6) total += Math.min(1, (fim - t) / H)
  }
  return total
}

async function listarPasta(caminho) {
  const itens = []
  let url = `/drives/${driveId()}/root:${encodeURI(caminho)}:/children?$top=999&$select=name,file,folder,size,lastModifiedDateTime,lastModifiedBy,webUrl`
  while (url) {
    const r = await graphGet(url)
    itens.push(...(r.value || []))
    url = r['@odata.nextLink'] ? r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null
  }
  return itens
}

function casa(fonte, nome) {
  const n = semAcento(nome)
  const p = semAcento(fonte.padrao)
  if (!p) return /\.(xlsx?|csv)$/i.test(nome)
  if (fonte.exato) return n === p
  if (fonte.contem) return n.includes(p)
  return n.startsWith(p)
}

// Frequência esperada (definida pelo usuário na aba Planilhas; padrão = do código):
//   diaria  → horas ÚTEIS: atenção > 30 h, crítico > 78 h
//   semanal → dias corridos: atenção > 8, crítico > 14
//   mensal  → dias corridos: atenção > 35, crítico > 45
//   manual  → sem alerta, só mostra a data
export const FREQUENCIAS = ['diaria', 'semanal', 'mensal', 'manual']
const LIMITE_DIAS = { semanal: [8, 14], mensal: [35, 45] }

function nivelDaIdade(fonte, horasUteis, iso) {
  if (fonte.frequencia === 'diaria') {
    if (horasUteis > LIMITES.criticoHorasUteis) return 'critico'
    if (horasUteis > LIMITES.atencaoHorasUteis) return 'atencao'
    return 'ok'
  }
  const lim = LIMITE_DIAS[fonte.frequencia]
  if (!lim) return 'ok'
  const dias = (Date.now() - Date.parse(iso)) / 86400000
  return dias > lim[1] ? 'critico' : dias > lim[0] ? 'atencao' : 'ok'
}
const motivoAtraso = (fonte, horasUteis, iso) => fonte.frequencia === 'diaria'
  ? `Sem atualização há ${Math.round(horasUteis)} h úteis — a tela mostra dados desatualizados.`
  : `Sem atualização há ${Math.floor((Date.now() - Date.parse(iso)) / 86400000)} dias (esperado: ${fonte.frequencia === 'semanal' ? 'toda semana' : 'todo mês'}).`

// Escolhas do usuário (tabela mon_sharepoint_frequencia)
async function frequenciasDefinidas() {
  const sb = getSupabaseAdmin()
  if (!sb) return {}
  const { data, error } = await sb.from('mon_sharepoint_frequencia').select('fonte_id, frequencia')
  if (error) return {}
  return Object.fromEntries((data || []).map(r => [r.fonte_id, r.frequencia]))
}

export async function definirFrequencia(fonteId, frequencia, usuario) {
  if (!FREQUENCIAS.includes(frequencia)) { const e = new Error('frequência inválida'); e.status = 400; throw e }
  if (!/^[a-z0-9-]{1,60}$/i.test(fonteId)) { const e = new Error('planilha inválida'); e.status = 400; throw e }
  const sb = getSupabaseAdmin()
  if (!sb) { const e = new Error('SUPABASE_SERVICE_KEY não configurada no backend.'); e.status = 503; throw e }
  const { error } = await sb.from('mon_sharepoint_frequencia')
    .upsert({ fonte_id: fonteId, frequencia, atualizado_em: new Date().toISOString(), atualizado_por: usuario || null })
  if (error) { const e = new Error(error.message); e.status = 502; throw e }
  cache = null // próxima leitura já usa a nova frequência
}

// Confere uma fonte: lista a pasta (e subpastas de ano), acha os arquivos que casam e pega o mais recente
export async function verificarFonte(fonte) {
  const t0 = Date.now()
  try {
    let itens = await listarPasta(fonte.pasta)
    if (fonte.subpastas) {
      const anos = itens.filter(i => i.folder && /^\d{4}$/.test(i.name.trim())).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 2)
      for (const a of anos) itens = itens.concat(await listarPasta(`${fonte.pasta}/${a.name}`))
    }
    const ms = Date.now() - t0
    const arquivos = itens.filter(i => i.file && casa(fonte, i.name))
    if (!arquivos.length) {
      return { ...fonte, encontrado: false, arquivos: 0, ms, nivel: 'critico',
        motivo: 'Nenhum arquivo com esse nome na pasta — a tela que usa esta planilha vai dar erro ou ficar sem dados.' }
    }
    const recente = arquivos.reduce((a, b) => (Date.parse(b.lastModifiedDateTime) > Date.parse(a.lastModifiedDateTime) ? b : a))
    const horasUteis = horasUteisDesde(recente.lastModifiedDateTime)
    const nivel = nivelDaIdade(fonte, horasUteis, recente.lastModifiedDateTime)
    return {
      ...fonte, encontrado: true, arquivos: arquivos.length, ms,
      recente: {
        nome: recente.name, modificado_em: recente.lastModifiedDateTime, tamanho: recente.size,
        por: recente.lastModifiedBy?.user?.displayName || recente.lastModifiedBy?.application?.displayName || null,
        link: recente.webUrl || null,
      },
      // todos os arquivos que casam (ex.: um por ano), do mais recente para o mais antigo
      todos: arquivos.map(i => ({ nome: i.name, modificado_em: i.lastModifiedDateTime, link: i.webUrl || null }))
        .sort((x, y) => Date.parse(y.modificado_em) - Date.parse(x.modificado_em)),
      horas_uteis: Math.round(horasUteis * 10) / 10,
      nivel,
      motivo: nivel === 'ok' ? null : motivoAtraso(fonte, horasUteis, recente.lastModifiedDateTime),
    }
  } catch (e) {
    const st = e.response?.status
    return { ...fonte, encontrado: false, arquivos: 0, ms: Date.now() - t0, nivel: 'critico',
      motivo: st === 404 ? 'A pasta não existe mais (renomeada ou movida).' : `Erro ao ler a pasta: ${e.response?.data?.error?.message || e.message}` }
  }
}

// Fontes cadastradas na tela Fontes de Cálculo (dim_fontes_calculo, ativas)
async function fontesCadastradas() {
  const sb = getSupabaseAdmin()
  if (!sb) return []
  const { data, error } = await sb.from('dim_fontes_calculo')
    .select('id, nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, subpasta_padrao, ativo').eq('ativo', true)
  if (error) return []
  const vistos = new Set(FONTES.map(f => `${semAcento(f.pasta)}|${semAcento(f.padrao)}`))
  const ano = new Date().getFullYear()
  return (data || [])
    .filter(f => f.pasta_sharepoint && f.prefixo_arquivo)
    .map(f => {
      // Mesmo caminho que o leitor (sharepointFonteCalculo.listarArquivos) monta: pasta + subpasta_padrao com {ano}
      const base = f.pasta_sharepoint.startsWith('/') ? f.pasta_sharepoint : `/${f.pasta_sharepoint}`
      const pasta = f.usa_subpasta_ano ? `${base}/${(f.subpasta_padrao || '{ano}').replace('{ano}', ano)}` : base
      return {
        id: `fc-${f.id}`, nome: f.nome || f.codigo, telas: 'Fontes de Cálculo (Comissões / BI)', cadastrada: true,
        pasta, padrao: f.prefixo_arquivo, frequencia: 'diaria',
      }
    })
    .filter(f => !vistos.has(`${semAcento(f.pasta)}|${semAcento(f.padrao)}`))
}

// roda em lotes para não estourar o limite do Graph
async function emLotes(lista, fn, tam = 4) {
  const out = []
  for (let i = 0; i < lista.length; i += tam) out.push(...await Promise.all(lista.slice(i, i + tam).map(fn)))
  return out
}

// ── visão completa (cache 5 min) ─────────────────────────────────────────
let cache = null
export async function getVisao({ refresh = false } = {}) {
  if (!isConfigured() || !driveId()) { const e = new Error('sharepoint_not_configured'); e.status = 503; throw e }
  if (!refresh && cache && Date.now() - cache.t < TTL_MS) return cache.dados

  const t0 = Date.now()
  const [drive, app] = await Promise.all([
    graphGet(`/drives/${driveId()}?$select=name,quota,webUrl`).catch(e => ({ erro: e.response?.data?.error?.message || e.message })),
    graphGet(`/applications(appId='${process.env.AZURE_CLIENT_ID}')?$select=displayName,passwordCredentials`).catch(e => ({ erro: e.response?.status === 403 ? 'sem permissão para ler o aplicativo no Azure' : (e.response?.data?.error?.message || e.message) })),
  ])
  const msConexao = Date.now() - t0
  const [cadastradas, definidas] = await Promise.all([fontesCadastradas(), frequenciasDefinidas()])
  const todas = [...FONTES, ...cadastradas].map(f => ({
    ...f, frequencia_padrao: f.frequencia, frequencia: definidas[f.id] || f.frequencia, frequencia_definida: !!definidas[f.id],
  }))
  const fontes = await emLotes(todas, verificarFonte)

  const senhas = (app.passwordCredentials || []).map(p => ({ nome: p.displayName, vence_em: p.endDateTime }))
  const proxima = senhas.filter(s => s.vence_em).sort((a, b) => Date.parse(a.vence_em) - Date.parse(b.vence_em)).find(s => Date.parse(s.vence_em) > Date.now()) || senhas[0] || null

  const dados = {
    biblioteca: drive.erro ? null : { nome: drive.name, link: drive.webUrl, usado: drive.quota?.used, total: drive.quota?.total, lixeira: drive.quota?.deleted, estado: drive.quota?.state },
    erro_biblioteca: drive.erro || null,
    aplicativo: app.erro ? null : { nome: app.displayName, senhas, proxima },
    erro_aplicativo: app.erro || null,
    ms_conexao: msConexao,
    ms_medio: fontes.length ? Math.round(fontes.reduce((s, f) => s + f.ms, 0) / fontes.length) : null,
    fontes,
    limites: LIMITES,
    lido_em: new Date().toISOString(),
  }
  cache = { t: Date.now(), dados }
  return dados
}

// ── pontos de controle ("Precisa de atenção") ────────────────────────────
export function calcularControles(v) {
  const c = []
  const nivelPct = (pct) => pct >= LIMITES.pctCritico ? 'critico' : pct >= LIMITES.pctAtencao ? 'atencao' : 'ok'

  // Senha do aplicativo
  if (v.erro_aplicativo) c.push({ id: 'senha', grupo: 'Acesso', nivel: 'info', titulo: 'Não foi possível ler a validade da senha do aplicativo', detalhe: v.erro_aplicativo })
  else if (v.aplicativo?.proxima) {
    const dias = Math.floor((Date.parse(v.aplicativo.proxima.vence_em) - Date.now()) / 86400000)
    const venc = new Date(v.aplicativo.proxima.vence_em).toLocaleDateString('pt-BR')
    c.push(dias < 0
      ? { id: 'senha', grupo: 'Acesso', nivel: 'critico', titulo: `A senha do aplicativo no Azure VENCEU em ${venc}`, detalhe: 'Nenhuma tela consegue ler o SharePoint. Gere uma nova senha (Client secret) no Azure e atualize AZURE_CLIENT_SECRET no backend e no Railway.' }
      : dias <= LIMITES.senhaCriticoDias
        ? { id: 'senha', grupo: 'Acesso', nivel: 'critico', titulo: `A senha do aplicativo no Azure vence em ${dias} dia(s) (${venc})`, detalhe: 'Quando vencer, todas as telas que leem o SharePoint param. Gere uma nova senha no Azure e atualize AZURE_CLIENT_SECRET no backend e no Railway.' }
        : dias <= LIMITES.senhaAtencaoDias
          ? { id: 'senha', grupo: 'Acesso', nivel: 'atencao', titulo: `A senha do aplicativo no Azure vence em ${dias} dias (${venc})`, detalhe: 'Programe a troca antes do vencimento.' }
          : { id: 'senha', grupo: 'Acesso', nivel: 'ok', titulo: `Senha do aplicativo no Azure válida até ${venc}` })
  }

  // Conexão / biblioteca
  if (v.erro_biblioteca) c.push({ id: 'conexao', grupo: 'Acesso', nivel: 'critico', titulo: 'Não foi possível acessar a biblioteca do SharePoint', detalhe: v.erro_biblioteca })
  else {
    c.push({ id: 'conexao', grupo: 'Acesso', nivel: 'ok', titulo: `Conexão com o SharePoint funcionando (biblioteca "${v.biblioteca?.nome}")` })
    if (v.biblioteca?.total) {
      const pct = (v.biblioteca.usado / v.biblioteca.total) * 100
      c.push({ id: 'espaco', grupo: 'Capacidade', nivel: nivelPct(pct), titulo: `Espaço da biblioteca: ${pct < 1 ? '<1' : Math.round(pct)}% usado` })
    }
  }

  // Tempo de resposta
  if (v.ms_medio != null) c.push(v.ms_medio > LIMITES.respostaLentaMs
    ? { id: 'resposta', grupo: 'Desempenho', nivel: 'atencao', titulo: `SharePoint lento: ${v.ms_medio} ms em média por pasta`, detalhe: 'As telas que leem planilhas ao vivo ficam mais lentas.' }
    : { id: 'resposta', grupo: 'Desempenho', nivel: 'ok', titulo: `SharePoint respondendo em ${v.ms_medio} ms em média por pasta` })

  // Planilhas
  const problemas = v.fontes.filter(f => f.nivel !== 'ok')
  for (const f of problemas) c.push({ id: `fonte-${f.id}`, grupo: 'Planilhas', nivel: f.nivel, titulo: `${f.nome}: ${f.encontrado ? 'desatualizada' : 'não encontrada'}`,
    detalhe: `${f.motivo} Usada em: ${f.telas}.` })
  const emDia = v.fontes.length - problemas.length
  c.push({ id: 'fontes-ok', grupo: 'Planilhas', nivel: 'ok', titulo: `${emDia} de ${v.fontes.length} planilhas encontradas e em dia` })

  // Destino de cada alerta: aba e tabela/linha da tela onde está a informação (21/11/2026)
  for (const x of c) {
    x.destino = x.id.startsWith('fonte-') ? { aba: 'planilhas', alvo: x.id } // linha da planilha na tabela
      : x.id === 'fontes-ok' ? { aba: 'planilhas', alvo: 'sp-planilhas' }
      : { aba: 'visao', alvo: 'sp-biblioteca' }
  }
  const ordem = { critico: 0, atencao: 1, info: 2, ok: 3 }
  c.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
  return {
    controles: c,
    resumo: Object.fromEntries(['critico', 'atencao', 'info', 'ok'].map(n => [n, c.filter(x => x.nivel === n).length])),
    calculado_em: new Date().toISOString(),
  }
}
