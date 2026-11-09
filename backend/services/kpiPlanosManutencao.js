/**
 * Indicadores do quadro CONSULTOR DE PLANO DE MANUTENÇÃO (Matriz KPIs › Bloco 3 - Serviços), com a
 * mesma regra dos velocímetros do BI Planos de Manutenção (aba Resultado — BiPlanosManutencao.jsx):
 *
 * Em QUANTIDADE de contratos (o BI mostra em %):
 *   Contratos novos     = contratos do CRM DAF com Situação Novo criados no mês; meta = meta % do BI
 *                         × veículos DAF vendidos (por chassi) no mês ANTERIOR
 *   Contratos renovados = contratos do CRM DAF com Situação Renovação criados no mês; meta = meta % do
 *                         BI × contratos Expirados com fim no mês ANTERIOR
 *
 * Situação Renovação = o chassi já tinha um contrato que começou antes deste (qualquer status); senão Novo.
 * Todos os status entram (inclusive Cancelado). Mês atual vai até ontem.
 * Meta % = bi_planos_metas (gaugeNovos / gaugeRenovados), a mesma digitada no BI.
 * O CRM DAF não traz a empresa, então é o total do grupo (o BI sem empresa selecionada).
 * Ao mudar a regra no BI (ou no manual planosManutencaoTextos.js), mudar aqui também.
 *
 * Semanas (acompanhamento; o bônus da Campanha segue mensal): realizado = contratos criados na semana
 * (mesma regra Novo/Renovação); meta = meta do mês × dias úteis da semana ÷ dias úteis do mês (seg–sex).
 */
import { getVeiculosVendidos } from './sharepointVeiculosVendidos.js'
import { numeroSemanaDoDia, semanasDoAno } from './kpiSemanas.js'
import { getPotencialRenovacao } from './sharepointPotencialRenovacao.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

const QUARTERS = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] }
const mk = (m) => `m${String(m).padStart(2, '0')}`
const anoMes = (a, m) => `${a}-${String(m).padStart(2, '0')}`
const anoMesAnterior = (a, m) => (m === 1 ? anoMes(a - 1, 12) : anoMes(a, m - 1))
// Dias de segunda a sexta entre dois dias do mês (rateio da meta do mês nas semanas).
const diasUteis = (ano, mes, ini, fim) => {
  let n = 0
  for (let d = ini; d <= fim; d++) { const w = new Date(ano, mes - 1, d).getDay(); if (w >= 1 && w <= 5) n++ }
  return n
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Parte pesada (lê os arquivos do SharePoint): contagens por mês — a rota guarda em cache.
export async function contarPlanosPorMes(ano) {
  const [vendas, contratos] = await Promise.all([getVeiculosVendidos(), getPotencialRenovacao()])
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  const dataMax = iso(ontem)
  const noMes = (am) => (d) => !!d && d <= dataMax && d.slice(0, 7) === am

  // Veículos DAF vendidos no mês, por chassi (saldo de vendas − devoluções > 0), notas canceladas fora.
  const vendidosNoMes = (am) => {
    const dentro = noMes(am)
    const saldo = {}, marca = {}
    for (const r of vendas.rows) {
      if (r.cancelada || !dentro(r.data)) continue
      const s = r.movimento === 'VEN' ? 1 : r.movimento === 'DVE' ? -1 : 0
      if (!s) continue
      saldo[r.chassi] = (saldo[r.chassi] || 0) + s
      if (s === 1) marca[r.chassi] = r.marca
    }
    return Object.keys(saldo).filter(c => saldo[c] > 0 && String(marca[c] || '').toUpperCase() === 'DAF').length
  }

  const porChassi = {}
  for (const c of contratos.rows) (porChassi[c.chassi.toUpperCase()] ||= []).push(c)
  const ehRenovacao = (c) => (porChassi[c.chassi.toUpperCase()] || [])
    .some(n => n !== c && n.contrato !== c.contrato && n.inicio && c.inicio && n.inicio < c.inicio)
  const ehExpirado = (c) => (c.status || '').toLowerCase().startsWith('expirado')

  const atual = anoMes(ontem.getFullYear(), ontem.getMonth() + 1)
  const meses = {}
  for (let m = 1; m <= 12; m++) {
    const am = anoMes(ano, m)
    if (am > atual) continue
    const anterior = anoMesAnterior(ano, m)
    const criados = contratos.rows.filter(c => noMes(am)(c.criacao))
    const novos = criados.filter(c => !ehRenovacao(c)).length
    // Contratos por semana do mês (pela data de criação); semana já começada sem contrato = 0.
    const semanas = {}
    for (const [k, s] of Object.entries(semanasDoAno(ano))) {
      if (s.mes === m && `${am}-${String(s.inicio).padStart(2, '0')}` <= dataMax) semanas[k] = { novos: 0, renovados: 0 }
    }
    for (const c of criados) {
      const k = `s${String(numeroSemanaDoDia(ano, m, Number(c.criacao.slice(8, 10)))).padStart(2, '0')}`
      if (!semanas[k]) semanas[k] = { novos: 0, renovados: 0 }
      semanas[k][ehRenovacao(c) ? 'renovados' : 'novos']++
    }
    meses[m] = {
      novos, vendidos: vendidosNoMes(anterior),
      renovados: criados.length - novos,
      aRenovar: contratos.rows.filter(c => noMes(anterior)(c.fim) && ehExpirado(c)).length,
      semanas,
    }
  }
  return meses
}

// Parte leve: metas lidas na hora (bi_planos_metas) sobre as contagens já guardadas.
export async function getIndicadoresPlanos(ano, meses = null) {
  meses ??= await contarPlanosPorMes(ano)
  const admin = getSupabaseAdmin()
  const { data: metasLinhas } = admin
    ? await admin.from('bi_planos_metas').select('indicador, ano, mes, meta').eq('ano', ano)
    : { data: [] }

  const meta = (ind, m) => {
    const l = (metasLinhas || []).find(x => x.indicador === ind && Number(x.mes) === m)
    return l ? Number(l.meta) : null
  }

  // Em quantidade de contratos: realizado = contratos do mês; meta = meta % do BI × base do mês
  // (vendidos ou a renovar do mês anterior) — o % de atingimento fica igual ao do velocímetro do BI.
  // Trimestre/ano somam os meses (meta só se todos os meses tiverem meta).
  const montar = (num, den, ind) => {
    const out = {}, metas = {}
    const metaQtd = (m) => { const p = meta(ind, m); return p == null ? null : p / 100 * meses[m][den] }
    const somar = (lista, f) => {
      const vals = lista.map(f)
      return vals.length && vals.every(v => v != null) ? vals.reduce((s, v) => s + v, 0) : null
    }
    for (let m = 1; m <= 12; m++) {
      out[mk(m)] = meses[m] ? meses[m][num] : null
      metas[mk(m)] = meses[m] ? metaQtd(m) : null
    }
    for (const [q, ms] of Object.entries(QUARTERS)) {
      const comDado = ms.filter(m => meses[m])
      out[q] = comDado.length ? somar(comDado, m => meses[m][num]) : null
      metas[q] = comDado.length ? somar(comDado, metaQtd) : null
    }
    const todos = Object.keys(meses).map(Number)
    out.fy = todos.length ? somar(todos, m => meses[m][num]) : null
    metas.fy = todos.length ? somar(todos, metaQtd) : null
    // Semanas: contratos criados na semana; meta do mês rateada pelos dias úteis (seg–sex).
    for (const [k, s] of Object.entries(semanasDoAno(ano))) {
      const sem = meses[s.mes]?.semanas?.[k]
      out[k] = sem ? sem[num] : null
      const mm = sem ? metaQtd(s.mes) : null // mês futuro: sem contagem nem meta
      const uteisMes = diasUteis(ano, s.mes, 1, new Date(ano, s.mes, 0).getDate())
      metas[k] = sem && mm != null && uteisMes ? mm * diasUteis(ano, s.mes, s.inicio, s.fim) / uteisMes : null
    }
    return { realizado: out, meta: metas }
  }

  return {
    novos: montar('novos', 'vendidos', 'gaugeNovos'),
    renovados: montar('renovados', 'aRenovar', 'gaugeRenovados'),
  }
}
