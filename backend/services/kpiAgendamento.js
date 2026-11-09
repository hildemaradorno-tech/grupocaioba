/**
 * Indicadores do quadro SETOR DE AGENDAMENTO DE SERVIÇOS (Matriz KPIs › Bloco 3 - Serviços › aba Setores), com as mesmas
 * regras e metas do BI Agendamento de Serviços (Mesa de Agendamento):
 *
 *   Taxa de Agendamento          — aba Por Campanhas: Contatos agendados ÷ Contatos gerados × 100, pela data da
 *                                  campanha (RCR038); cada agendamento do ROF037 conta uma vez (1ª campanha do veículo).
 *   Taxa de Agendamento Ativo    — aba Por Data Agendamento: agendamentos Ativos com O.S. ÷ agendamentos Ativos × 100,
 *                                  pela data do agendamento (DtAgendamento do ROF037), sem os cancelados (CAN).
 *   Taxa de No-show              — aba Por Data Agendamento: agendamentos sem O.S. com status NSW ÷ agendamentos × 100.
 *
 * Todas as empresas juntas (o relatório da campanha não identifica a empresa). As metas são as da engrenagem do BI
 * (tabela bi_agendamento_metas), iguais em todos os períodos.
 */
import { getCampanhasCrm, getPassagensOs } from './sharepointAgendamentoCrm.js'
import { numeroSemanaDoDia } from './kpiSemanas.js'
import { getSupabaseAdmin } from './supabaseAdmin.js'

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`)
const ALL_WEEKS  = Array.from({ length: 70 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`)
const TODAS_CHAVES = [...ALL_MONTHS, ...ALL_WEEKS, 'q1', 'q2', 'q3', 'q4', 'fy']
const METAS_PADRAO = { taxaAgendamento: 80, agTaxaConversaoAtivo: 80, agTaxaNoShow: 15 }

// Períodos (mês, semana, trimestre e ano) em que cai uma data 'AAAA-MM-DD' do ano pedido.
function periodosDaData(iso, ano) {
  if (!iso || Number(iso.slice(0, 4)) !== ano) return []
  const mes = Number(iso.slice(5, 7)), dia = Number(iso.slice(8, 10))
  return [`m${String(mes).padStart(2, '0')}`, `s${String(numeroSemanaDoDia(ano, mes, dia)).padStart(2, '0')}`, `q${Math.ceil(mes / 3)}`, 'fy']
}

function agrupar(lista, dataDe, ano) {
  const m = new Map()
  for (const x of lista) for (const k of periodosDaData(dataDe(x), ano)) (m.get(k) || m.set(k, []).get(k)).push(x)
  return m
}

// Taxa (%) de cada período; sem base no período = null.
function taxaPorPeriodo(grupos, calc) {
  const out = {}
  for (const k of TODAS_CHAVES) {
    const lista = grupos.get(k)
    if (!lista || !lista.length) { out[k] = null; continue }
    const [num, den] = calc(lista)
    out[k] = den > 0 ? (num / den) * 100 : null
  }
  return out
}

// Contatos agendados da campanha sem duplicar: o mesmo agendamento (veículo + criação + data agendada) conta uma vez.
function contatosAgendados(rows) {
  const vistos = new Set()
  let n = 0
  for (const r of [...rows].sort((a, b) => a.data.localeCompare(b.data) || a.id_campanha_execucao - b.id_campanha_execucao)) {
    if (!r.agendamento) continue
    const k = `${String(r.chassi).toUpperCase()}#${r.id_cliente}#${r.agendamento.criado}#${r.agendamento.data_agendamento}`
    if (vistos.has(k)) continue
    vistos.add(k)
    n++
  }
  return n
}

async function lerMetas() {
  const metas = { ...METAS_PADRAO }
  try {
    const { data, error } = await getSupabaseAdmin().from('bi_agendamento_metas').select('indicador, meta')
    if (!error) (data || []).forEach(l => { if (l.indicador in metas) metas[l.indicador] = Number(l.meta) })
  } catch { /* sem a tabela: metas padrão */ }
  return metas
}

const metaEmTodos = (v) => Object.fromEntries(TODAS_CHAVES.map(k => [k, v]))

// Realizados guardados em cache (Matriz / Campanha) + metas lidas na hora da engrenagem do BI: editar a meta
// no BI aparece na Matriz sem esperar o cache expirar.
export async function comMetasAtuaisAgendamento(dados) {
  if (!dados) return dados
  const metas = await lerMetas()
  return {
    taxaAgendamento: { ...dados.taxaAgendamento, meta: metaEmTodos(metas.taxaAgendamento) },
    taxaAtivo: { ...dados.taxaAtivo, meta: metaEmTodos(metas.agTaxaConversaoAtivo) },
    taxaNoShow: { ...dados.taxaNoShow, meta: metaEmTodos(metas.agTaxaNoShow) },
  }
}

export async function getIndicadoresAgendamento(ano) {
  const [campanhas, passagens, metas] = await Promise.all([getCampanhasCrm(), getPassagensOs(), lerMetas()])

  const porCampanha = agrupar(campanhas.rows.filter(r => r.data), r => r.data, ano)
  const taxaAgendamento = taxaPorPeriodo(porCampanha, rows => [contatosAgendados(rows), rows.length])

  const agendamentos = passagens.agendamentos.filter(a => a.fonte === 'ROF037' && a.data && a.status !== 'CAN')
  const porData = agrupar(agendamentos, a => a.data, ano)
  const taxaAtivo = taxaPorPeriodo(porData, lista => {
    const ativos = lista.filter(a => a.tipo === 'Ativo')
    return [ativos.filter(a => a.os).length, ativos.length]
  })
  const taxaNoShow = taxaPorPeriodo(porData, lista => [lista.filter(a => !a.os && a.status === 'NSW').length, lista.length])

  return {
    taxaAgendamento: { realizado: taxaAgendamento, meta: metaEmTodos(metas.taxaAgendamento) },
    taxaAtivo: { realizado: taxaAtivo, meta: metaEmTodos(metas.agTaxaConversaoAtivo) },
    taxaNoShow: { realizado: taxaNoShow, meta: metaEmTodos(metas.agTaxaNoShow) },
  }
}
