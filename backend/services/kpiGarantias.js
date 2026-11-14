/**
 * Indicadores do quadro SETOR GARANTIA (Matriz KPIs › Bloco 3 - Serviços), a partir das garantias
 * cadastradas (gar_garantias) com as mesmas regras dos cards da tela Garantias DAF Aberto
 * (gar_configuracoes: dias_digitacao, dias_solucao, dias_solucao_por_tipo):
 *
 *   Digitação Atrasada        — status A com OS fechada há mais de dias_digitacao dias.
 *   Aguardando Aprovação DAF  — status B..Y (grupo "Aguardando Aprovação DAF") há dias_solucao
 *   fora do prazo               (ou o prazo do tipo de OS) dias ou mais desde a digitação (criado_em).
 *   Aprovada sem Faturamento  — status FA (Financeiro APROVADO), ainda não faturada (card "Aprovada").
 *   Garantias Recusadas       — status FR ou Z há mais de dias_recusa dias, contados da Data Final da
 *   fora do Prazo               Avaliação (sem ela, da Data SG; sem nenhuma, conta como fora) —
 *                               card "Recusas › Fora do prazo" (prazoRecusa.js).
 *
 * Cada período (mês, semana, trimestre, ano) vale a FOTOGRAFIA DO ÚLTIMO DIA dele, reconstruída pelo
 * histórico de status (gar_garantias_log: status de cada garantia = último registro até aquele dia).
 * Período em andamento = foto de hoje (mesmo número dos cards da tela de garantias); período futuro ou
 * anterior ao primeiro registro do log (15/07/2026) fica sem valor. Prazos = configuração atual, com a
 * regra do mês (gar_regras_mes) do início da contagem de cada garantia quando houver.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { numeroSemanaDoDia } from './kpiSemanas.js'
import { getTitulosAReceber } from './sharepointFinanceiro.js'

// Garantias a Receber Vencidas — card "Vencidos" da aba Títulos a Receber (Garantias DAF): títulos do
// RFN003 dos tipos de título ativos (dim_tipo_titulo_garantia) com vencimento antes de hoje. O RFN003
// só traz o que está em aberto HOJE (pagos saem do arquivo), então não há histórico: a quantidade de
// hoje vale só no período atual (mês, semana, trimestre e ano correntes); os demais ficam sem valor.
// Data de referência AAAA-MM-DD (horário de MS): hoje, ou ontem quando o dia atual não é considerado.
const diaMS = (desloc = 0) => new Date(Date.now() - 4 * 3600 * 1000 + desloc * 86400000).toISOString().slice(0, 10)
// Fim do dia de ontem (23:59:59 em MS) — corte padrão da Matriz (período em andamento até ontem).
const fimDeOntem = () => new Date(new Date(`${diaMS(0)}T00:00:00-04:00`).getTime() - 1000)

async function titulosVencidosHoje(admin, empresaKey, refISO = diaMS(0)) {
  const [{ rows }, tipos] = await Promise.all([
    getTitulosAReceber(),
    admin.from('dim_tipo_titulo_garantia').select('descricao, ativo').then(r => r.data || []),
  ])
  const tiposAtivos = new Set(tipos.filter(t => t.ativo).map(t => String(t.descricao || '').trim()))
  const hoje = refISO // vencido = vencimento antes do dia de referência (hoje, ou ontem)
  const alvo = empresaKey ? norm(empresaKey) : null
  let qtd = 0, valor = 0
  for (const r of rows || []) {
    if (tiposAtivos.size && !tiposAtivos.has(String(r.tipo_titulo || '').trim())) continue
    if (alvo && norm(casaDaEmpresa(r.empresa)) !== alvo) continue
    if (!r.data_vencimento || r.data_vencimento >= hoje) continue
    qtd++
    valor += Number(r.saldo) || 0
  }
  return { qtd, valor }
}

// Valor de hoje só nos períodos correntes (mês, semana, trimestre, ano); o resto sem valor.
function soNoPeriodoAtual(qtd, ano, refISO = diaMS(0)) {
  const out = {}
  for (const k of [...ALL_MONTHS, ...ALL_WEEKS, ...Object.keys(QUARTERS), 'fy']) out[k] = null
  const [aRef, mRef, dRef] = refISO.split('-').map(Number)
  const hoje = { getFullYear: () => aRef, getMonth: () => mRef - 1, getDate: () => dRef }
  if (hoje.getFullYear() !== ano || qtd == null) return out
  const mes = hoje.getMonth() + 1
  const m = `m${String(mes).padStart(2, '0')}`
  out[m] = qtd
  out[`s${String(numeroSemanaDoDia(ano, mes, hoje.getDate())).padStart(2, '0')}`] = qtd
  out[Object.keys(QUARTERS).find(q => QUARTERS[q].includes(m))] = qtd
  out.fy = qtd
  return out
}

// Grupo "Aguardando Aprovação DAF" da tela de Garantias: tudo que não é A, FA, FR, Z — e sem E/F, que a
// tela descarta (fase encerrada). O 'E' estava aqui por engano e inflava o "fora do prazo".
const STATUS_ANDAMENTO = new Set(['B', 'C', 'G', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'])
const STATUS_RECUSADA = new Set(['FR', 'Z'])
const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`)
const ALL_WEEKS  = Array.from({ length: 70 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`)
const QUARTERS   = { q1: ['m01', 'm02', 'm03'], q2: ['m04', 'm05', 'm06'], q3: ['m07', 'm08', 'm09'], q4: ['m10', 'm11', 'm12'] }

function norm(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

// "CAMPO GRANDE" | "DOURADOS" | "TRÊS LAGOAS" | "CHAPADÃO DO SUL" — mesmas chaves do seletor da Matriz.
function casaDaEmpresa(nome) {
  const n = norm(nome)
  if (!n.includes('TRUCKS')) return null
  if (n.includes('CAMPO GRANDE')) return 'CAMPO GRANDE'
  if (n.includes('DOURADOS'))     return 'DOURADOS'
  if (n.includes('TRES LAGOAS'))  return 'TRÊS LAGOAS'
  if (n.includes('CHAPADAO'))     return 'CHAPADÃO DO SUL'
  return null
}

async function fetchTudo(montarQuery) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await montarQuery().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const DIA_MS = 86_400_000
const diasDesde = (d, hoje) => Math.floor((hoje - d) / DIA_MS)

// Primeiro e último dia (horário de MS) de cada período do ano: { m01: { ini, fim }, s01: …, q1: …, fy: … }.
function limitesDosPeriodos(ano) {
  const lim = {}
  const dia = (mes, d, hora) => new Date(`${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}T${hora}-04:00`)
  for (let mes = 1; mes <= 12; mes++) {
    const dias = new Date(ano, mes, 0).getDate()
    const m = `m${String(mes).padStart(2, '0')}`
    for (let d = 1; d <= dias; d++) {
      const ini = dia(mes, d, '00:00:00'), fim = dia(mes, d, '23:59:59')
      for (const k of [m, `s${String(numeroSemanaDoDia(ano, mes, d)).padStart(2, '0')}`, Object.keys(QUARTERS).find(q => QUARTERS[q].includes(m)), 'fy']) {
        if (!lim[k]) lim[k] = { ini, fim }
        else lim[k].fim = fim
      }
    }
  }
  return lim
}

// incluirHoje: foto do período em andamento AGORA; padrão = fim de ontem (Matriz › Considerar o dia atual).
export async function getIndicadoresGarantia(ano, empresaKey, { incluirHoje = false } = {}) {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  // Todas as garantias (inclusive as já encerradas hoje: em datas passadas podiam estar em aberto) + log de status.
  const [cfgRes, mesesRes, empresas, garantias, logs] = await Promise.all([
    admin.from('gar_configuracoes').select('dias_digitacao, dias_solucao, dias_solucao_por_tipo, dias_recusa').limit(1).maybeSingle(),
    admin.from('gar_regras_mes').select('ano, mes, dias_digitacao, dias_solucao, dias_solucao_por_tipo, dias_recusa'),
    fetchTudo(() => admin.from('dim_empresas').select('id, empresa_fantasia, nome_empresa_sistema').order('id')),
    fetchTudo(() => admin.from('gar_garantias')
      .select('id, empresa_id, empresa_nome, status_codigo, data_fechamento_os, criado_em, tipo_os_sigla, data_final_avaliacao, data_sg').order('id')),
    fetchTudo(() => admin.from('gar_garantias_log')
      .select('garantia_id, valor_depois, alterado_em').eq('campo', 'status_codigo').order('id')),
  ])
  const cfg = cfgRes.data || {}
  const diasDigitacao = cfg.dias_digitacao ?? 14
  const diasSolucao = cfg.dias_solucao ?? 14
  const porTipo = cfg.dias_solucao_por_tipo ?? {}
  const diasRecusa = cfg.dias_recusa ?? 15
  // Regras por mês (gar_regras_mes) — mesma regra das telas (regrasGarantiasMes.js): cada garantia usa a
  // do mês em que a contagem começa; mês sem valor = regra geral. Tabela ausente = só a geral.
  const meses = new Map((mesesRes.data || []).map(r => [`${r.ano}-${String(r.mes).padStart(2, '0')}`, r]))
  const anoMes = (data) => {
    if (!data) return null
    const s = String(data)
    if (s.length > 10 && s.includes('T')) {
      const d = new Date(s) // timestamp: mês no horário de MS
      const ms = new Date(d.getTime() - 4 * 3600 * 1000)
      return `${ms.getUTCFullYear()}-${String(ms.getUTCMonth() + 1).padStart(2, '0')}`
    }
    return s.slice(0, 7)
  }
  const doMes = (campo, data, geral) => { const v = meses.get(anoMes(data))?.[campo]; return v != null ? Number(v) : geral }
  const prazoSolucaoDe = (g) => {
    const s = String(g.tipo_os_sigla || '').trim()
    const m = meses.get(anoMes(g.criado_em))
    return Number(m?.dias_solucao_por_tipo?.[s] ?? m?.dias_solucao ?? porTipo[s] ?? diasSolucao)
  }

  const casaPorId = new Map(empresas.map(e => [e.id, casaDaEmpresa(e.nome_empresa_sistema) || casaDaEmpresa(e.empresa_fantasia)]))
  const alvo = empresaKey ? norm(empresaKey) : null
  const daCasa = garantias.filter(g => !alvo || norm(casaPorId.get(g.empresa_id) || casaDaEmpresa(g.empresa_nome)) === alvo)

  // Histórico de status por garantia, em ordem de data.
  const historico = new Map()
  let primeiroLog = null
  for (const l of logs) {
    const t = new Date(l.alterado_em)
    if (!historico.has(l.garantia_id)) historico.set(l.garantia_id, [])
    historico.get(l.garantia_id).push({ t, status: l.valor_depois })
    if (!primeiroLog || t < primeiroLog) primeiroLog = t
  }
  for (const h of historico.values()) h.sort((a, b) => a.t - b.t)
  // Status na data (último registro até ela); sem registro até lá = garantia ainda não existia.
  const statusEm = (g, data) => {
    const h = historico.get(g.id)
    if (!h) return new Date(g.criado_em) <= data ? g.status_codigo : null // sem log: usa o status atual
    let s = null
    for (const x of h) { if (x.t <= data) s = x.status; else break }
    return s
  }
  // Contagem dos indicadores na fotografia de uma data.
  const contarEm = (data) => {
    let digitacao = 0, foraPrazo = 0, aprovada = 0, recusadaFora = 0
    for (const g of daCasa) {
      const s = statusEm(g, data)
      if (s === 'A' && g.data_fechamento_os) {
        if (diasDesde(new Date(g.data_fechamento_os + 'T12:00:00'), data) > doMes('dias_digitacao', g.data_fechamento_os, diasDigitacao)) digitacao++
      } else if (STATUS_ANDAMENTO.has(s) && g.criado_em) {
        if (diasDesde(new Date(g.criado_em), data) >= prazoSolucaoDe(g)) foraPrazo++
      } else if (s === 'FA') {
        aprovada++
      } else if (STATUS_RECUSADA.has(s)) {
        // Dias desde a recusa (Data Final da Avaliação; sem ela, Data SG); sem data = fora do prazo.
        const inicio = String(g.data_final_avaliacao || g.data_sg || '').slice(0, 10)
        if (!inicio || diasDesde(new Date(inicio + 'T12:00:00'), data) > doMes('dias_recusa', inicio, diasRecusa)) recusadaFora++
      }
    }
    return { digitacao, foraPrazo, aprovada, recusadaFora }
  }

  const agora = incluirHoje ? new Date() : fimDeOntem()
  const digitacaoAtrasada = {}
  const aguardandoForaPrazo = {}
  const aprovadaSemFaturamento = {}
  const recusadaForaPrazo = {}
  const fotos = new Map() // data (ms) → contagem (vários períodos terminam no mesmo dia)
  const lim = limitesDosPeriodos(ano)
  for (const k of [...ALL_MONTHS, ...ALL_WEEKS, ...Object.keys(QUARTERS), 'fy']) {
    const p = lim[k]
    // Sem valor: período que não existe no ano, ainda não começou, ou terminou antes do histórico existir.
    if (!p || !primeiroLog || p.ini > agora || p.fim < primeiroLog) {
      digitacaoAtrasada[k] = null; aguardandoForaPrazo[k] = null; aprovadaSemFaturamento[k] = null; recusadaForaPrazo[k] = null
      continue
    }
    const corte = p.fim > agora ? agora : p.fim // em andamento = hoje
    if (!fotos.has(corte.getTime())) fotos.set(corte.getTime(), contarEm(corte))
    const c = fotos.get(corte.getTime())
    digitacaoAtrasada[k] = c.digitacao
    aguardandoForaPrazo[k] = c.foraPrazo
    aprovadaSemFaturamento[k] = c.aprovada
    recusadaForaPrazo[k] = c.recusadaFora
  }
  // Títulos vencidos (SharePoint RFN003); se o arquivo não puder ser lido, fica sem valor.
  let vencidos = null
  try { vencidos = await titulosVencidosHoje(admin, empresaKey, incluirHoje ? diaMS(0) : diaMS(-1)) } catch (err) { console.error('[kpiGarantias] títulos RFN003:', err.message) }
  const titulosVencidos = soNoPeriodoAtual(vencidos?.qtd ?? null, ano, incluirHoje ? diaMS(0) : diaMS(-1))

  const metas = await metasDoSetorGarantia(admin, ano, empresaKey, lim, agora)
  return { digitacaoAtrasada, aguardandoForaPrazo, aprovadaSemFaturamento, recusadaForaPrazo, titulosVencidos, metas }
}

// Metas do SETOR GARANTIA cadastradas em Garantias DAF (engrenagem → Metas — Setor Garantia; tabela
// gar_metas_indicadores): por empresa, meta do mês ou, sem ela, a geral (ano 0, mês 0). Cada período usa a
// meta do mês da sua foto (último dia do período; em andamento = hoje). "Todas as empresas" (empresaKey
// vazio) = soma das metas das lojas que têm meta. Sem nenhuma meta = sem meta (null).
// → { digitacaoAtrasada: { m01: n, s01: n, q1: n, fy: n, … }, aguardandoForaPrazo: …, … }
const INDICADORES_COM_META = ['digitacaoAtrasada', 'aguardandoForaPrazo', 'aprovadaSemFaturamento', 'recusadaForaPrazo', 'titulosVencidos']
const CASAS_METAS = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']
async function metasDoSetorGarantia(admin, ano, empresaKey, lim, agora) {
  let linhas = []
  try {
    const { data, error } = await admin.from('gar_metas_indicadores').select('empresa, ano, mes, indicador, meta').in('ano', [0, ano])
    if (!error) linhas = data || []
  } catch { /* sem a tabela: sem metas */ }
  const idx = new Map(linhas.map(l => [`${l.empresa}|${l.ano}|${l.mes}|${l.indicador}`, Number(l.meta)]))
  const metaEmpresa = (casa, mes, ind) => idx.get(`${casa}|${ano}|${mes}|${ind}`) ?? idx.get(`${casa}|0|0|${ind}`) ?? null
  const casas = empresaKey ? CASAS_METAS.filter(c => norm(c) === norm(empresaKey)) : CASAS_METAS
  const metaNoMes = (mes, ind) => {
    const vals = casas.map(c => metaEmpresa(c, mes, ind)).filter(v => v != null)
    return vals.length ? vals.reduce((s, v) => s + v, 0) : null
  }
  const out = Object.fromEntries(INDICADORES_COM_META.map(i => [i, {}]))
  for (const [k, p] of Object.entries(lim)) {
    const ref = p.ini <= agora && p.fim > agora ? agora : p.fim // mês da foto do período
    const mes = Number(new Date(ref.getTime() - 4 * 3600 * 1000).toISOString().slice(5, 7)) // horário de MS
    for (const ind of INDICADORES_COM_META) out[ind][k] = metaNoMes(mes, ind)
  }
  return out
}
