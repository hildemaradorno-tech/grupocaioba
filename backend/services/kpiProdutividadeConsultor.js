/**
 * Produtividade % do CONSULTOR DE SERVIÇOS (Matriz KPIs › Bloco 3 - Serviços › "Produtividade da Oficina"),
 * com a MESMA conta da aba Consultores de Pós-Vendas › Indicadores de Produtividade
 * (src/pages/pos-vendas/IndicadoresProdutividade.jsx, AbaConsultores):
 *
 *   Produtividade % = Hr. Faturadas do consultor (NF emitida) ÷ Hr. Disp. Reais do consultor × 100
 *   Hr. Disp. Reais do consultor = Hr. Disp. Reais dos mecânicos DA EMPRESA DELE × (meta de horas do
 *                                  consultor na empresa ÷ soma das metas de horas dos consultores da empresa)
 *
 * Dados: vw_pv_prod_diario (sincronização da tela de Produtividade) e as metas de horas aprovadas do
 * Planejamento de Metas (metasProdutividade, a mesma função do /api/produtividade/metas). Fora: pessoas
 * excluídas pela tela (Funilaria/Pintura, Montagem/Revisão Entrega) e "Produtivo Não Associado"/"Sem Técnico".
 * Só empresas Caiobá Trucks (as do Bloco 3). Sem consultor escolhido = total (soma das Hr. Faturadas ÷ soma
 * das Hr. Disp. Reais dos consultores), como a linha Total da aba Consultores.
 * Períodos: mês, semana, trimestre e ano; as metas usadas são as dos meses do período (até o mês atual).
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { metasProdutividade } from './produtividadeSync.js'
import { semanasDoAno } from './kpiSemanas.js'

const NAO_PESSOA = /produtivo\s+n[aã]o\s+associado|^\s*sem\s+t[eé]cnico\s*$/i
export const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const ehTrucks = (empresa) => /TRUCKS/i.test(semAcento(empresa))
const QUARTERS = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] }
const iso = (ano, mes, dia) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

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

// Conta da aba Consultores para um conjunto de dias (linhas do diário) e de meses (metas).
function calcularConsultores(diario, metas) {
  const reaisEmp = new Map()
  for (const l of diario) if (l.papel === 'mecanico') reaisEmp.set(l.empresa, (reaisEmp.get(l.empresa) || 0) + (Number(l.hr_disp_reais) || 0))
  const metasCons = metas.filter(x => x.papel === 'consultor')
  const somaEmp = new Map()
  for (const m of metasCons) somaEmp.set(m.empresa, (somaEmp.get(m.empresa) || 0) + (m.meta_horas || 0))
  const pessoas = new Map()
  const empresasDaMeta = new Map() // consultor → empresas onde ele tem meta no período
  for (const m of metasCons) {
    const k = semAcento(m.pessoa)
    const p = pessoas.get(k) || { fat: 0, reais: 0 }
    const soma = somaEmp.get(m.empresa) || 0
    if (m.meta_horas > 0 && soma > 0) p.reais += (reaisEmp.get(m.empresa) || 0) * (m.meta_horas / soma)
    pessoas.set(k, p)
    if (!empresasDaMeta.has(k)) empresasDaMeta.set(k, new Set())
    empresasDaMeta.get(k).add(m.empresa)
  }
  for (const l of diario) {
    if (l.papel !== 'consultor') continue
    const k = semAcento(l.pessoa)
    // Só as horas faturadas na empresa da meta do consultor (igual à tela de Indicadores, linhasConsultores).
    const emps = empresasDaMeta.get(k)
    if (emps && !emps.has(l.empresa)) continue
    const p = pessoas.get(k) || { fat: 0, reais: 0 }
    p.fat += Number(l.hr_vend_fat) || 0
    pessoas.set(k, p)
  }
  return pessoas
}

// Meta da Produtividade % do consultor (pedido do usuário, 13/11/2026): limite inferior da faixa verde das
// Regras de Cores › Produtividade da tela de Indicadores (pv_prod_regras_cor, fração → %). Mês sem regra =
// faixa padrão do Power BI (0,80 → 80%, FAIXAS em src/pages/pos-vendas/produtividadeCalculos.js).
// Devolve { m01: 80, …, m12: 80 } — no formato das metas manuais (semana = a do mês; trimestre/ano = média).
const LIMITE_PADRAO_PRODUTIVIDADE = 0.8
export async function metaProdutividadeRegrasCor(ano) {
  const admin = getSupabaseAdmin()
  const meses = {}
  for (let m = 1; m <= 12; m++) meses[`m${String(m).padStart(2, '0')}`] = LIMITE_PADRAO_PRODUTIVIDADE * 100
  if (!admin) return meses
  const { data, error } = await admin.from('pv_prod_regras_cor').select('mes, limite_inf').eq('ano', ano).eq('indicador', 'produtividade')
  if (error) throw error
  for (const r of data || []) meses[`m${String(r.mes).padStart(2, '0')}`] = Number(r.limite_inf) * 100
  return meses
}

const _memo = new Map() // ano → { ts, promessa } — a Campanha pede o quadro de cada consultor quase junto
// incluirHoje: conta também o dia de HOJE; padrão só até ontem (Matriz › Considerar o dia atual).
export function getProdutividadeConsultores(ano, { incluirHoje = false } = {}) {
  const chave = `${ano}|${incluirHoje ? 1 : 0}`
  const hit = _memo.get(chave)
  if (hit && Date.now() - hit.ts < 60_000) return hit.promessa
  const promessa = calcular(ano, incluirHoje).catch(err => { _memo.delete(chave); throw err })
  _memo.set(chave, { ts: Date.now(), promessa })
  return promessa
}

async function calcular(ano, incluirHoje = false) {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const [mt, diarioTodo] = await Promise.all([
    metasProdutividade(admin, [ano]),
    fetchTudo(() => admin.from('vw_pv_prod_diario').select('data, empresa, papel, pessoa, hr_disp_reais, hr_vend_fat')
      .gte('data', iso(ano, 1, 1)).lte('data', iso(ano, 12, 31)).order('data')),
  ])
  const fora = new Set((mt?.excluidos || []).map(semAcento))
  const dentro = (r) => ehTrucks(r.empresa) && !fora.has(semAcento(r.pessoa)) && !NAO_PESSOA.test(r.pessoa || '')
  const hojeMS = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10)
  const diario = diarioTodo.filter(r => dentro(r) && (incluirHoje || String(r.data).slice(0, 10) < hojeMS)) // sem o dia atual: até ontem
  const metas = (mt?.metas || []).filter(dentro)

  // Períodos: { chave: { ini, fim, meses } } — meses até o atual (ano corrente), para as metas.
  const hoje = new Date()
  const mesLimite = hoje.getFullYear() === ano ? hoje.getMonth() + 1 : 12
  const ultimoDia = (mes) => new Date(ano, mes, 0).getDate()
  const periodos = {}
  for (let mes = 1; mes <= 12; mes++) periodos[`m${String(mes).padStart(2, '0')}`] = { ini: iso(ano, mes, 1), fim: iso(ano, mes, ultimoDia(mes)), meses: [mes] }
  for (const [k, s] of Object.entries(semanasDoAno(ano))) periodos[k] = { ini: iso(ano, s.mes, s.inicio), fim: iso(ano, s.mes, s.fim), meses: [s.mes] }
  for (const [q, ms] of Object.entries(QUARTERS)) periodos[q] = { ini: iso(ano, ms[0], 1), fim: iso(ano, ms[2], ultimoDia(ms[2])), meses: ms.filter(m => m <= mesLimite) }
  periodos.fy = { ini: iso(ano, 1, 1), fim: iso(ano, 12, 31), meses: Array.from({ length: mesLimite }, (_, i) => i + 1) }

  const porConsultor = {} // nome → { realizado: { p: % }, metaHoras: { p: h } }
  const grupo = { realizado: {}, metaHoras: {} }
  for (const [p, { ini, fim, meses }] of Object.entries(periodos)) {
    const mesesSet = new Set(meses)
    const metasPeriodo = metas.filter(m => Number(m.ano) === ano && mesesSet.has(Number(m.mes)))
    // Meta Horas do consultor (a da aba Consultores) — só informação ao lado da meta em %, pedido do usuário
    // (13/11/2026). Mês, trimestre e ano (meses até o atual); semana não, a meta é do mês inteiro.
    if (!p.startsWith('s')) {
      let tot = 0
      for (const m of metasPeriodo) {
        if (m.papel !== 'consultor' || !(m.meta_horas > 0)) continue
        const x = (porConsultor[semAcento(m.pessoa)] ||= { realizado: {}, metaHoras: {} })
        x.metaHoras[p] = (x.metaHoras[p] || 0) + m.meta_horas
        tot += m.meta_horas
      }
      if (tot) grupo.metaHoras[p] = tot
    }
    const dias = diario.filter(l => l.data >= ini && l.data <= fim)
    if (!dias.length) continue
    const pessoas = calcularConsultores(dias, metasPeriodo)
    let fatTot = 0, reaisTot = 0
    for (const [nome, x] of pessoas) {
      if (!x.fat && !x.reais) continue
      fatTot += x.fat; reaisTot += x.reais
      ;(porConsultor[nome] ||= { realizado: {}, metaHoras: {} }).realizado[p] = x.reais && x.fat ? (x.fat / x.reais) * 100 : null
    }
    grupo.realizado[p] = reaisTot && fatTot ? (fatTot / reaisTot) * 100 : null
  }
  return { porConsultor, grupo }
}
