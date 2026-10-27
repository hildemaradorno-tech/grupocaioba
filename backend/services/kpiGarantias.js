/**
 * Indicadores do quadro SETOR GARANTIA (Matriz KPIs › Bloco 3 - Serviços), a partir das garantias
 * cadastradas (gar_garantias) com as mesmas regras dos cards da tela Garantias DAF Aberto
 * (gar_configuracoes: dias_digitacao, dias_solucao, dias_solucao_por_tipo):
 *
 *   Digitação Atrasada        — status A com OS fechada há mais de dias_digitacao dias.
 *   Aguardando Aprovação DAF  — status B..Y (grupo "Aguardando Aprovação DAF") há dias_solucao
 *   fora do prazo               (ou o prazo do tipo de OS) dias ou mais desde a digitação (criado_em).
 *
 * É a fotografia de HOJE (mesmo número dos cards da tela de garantias), lançada no período atual —
 * mês, semana, trimestre e ano correntes. Não há histórico dessa situação, então meses passados
 * ficam sem valor.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { numeroSemanaDoDia } from './kpiSemanas.js'

const STATUS_ANDAMENTO = new Set(['B', 'C', 'E', 'G', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'])
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

// Coloca a quantidade de hoje no mês, semana, trimestre e ano correntes; o resto fica sem valor.
function noPeriodoAtual(qtd, ano) {
  const out = {}
  for (const k of [...ALL_MONTHS, ...ALL_WEEKS, ...Object.keys(QUARTERS), 'fy']) out[k] = null
  const hoje = new Date()
  if (hoje.getFullYear() !== ano) return out
  const mes = hoje.getMonth() + 1
  const m = `m${String(mes).padStart(2, '0')}`
  out[m] = qtd
  out[`s${String(numeroSemanaDoDia(ano, mes, hoje.getDate())).padStart(2, '0')}`] = qtd
  out[Object.keys(QUARTERS).find(q => QUARTERS[q].includes(m))] = qtd
  out.fy = qtd
  return out
}

export async function getIndicadoresGarantia(ano, empresaKey) {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  const [cfgRes, empresas, garantias] = await Promise.all([
    admin.from('gar_configuracoes').select('dias_digitacao, dias_solucao, dias_solucao_por_tipo').limit(1).maybeSingle(),
    fetchTudo(() => admin.from('dim_empresas').select('id, empresa_fantasia, nome_empresa_sistema').order('id')),
    fetchTudo(() => admin.from('gar_garantias')
      .select('id, empresa_id, empresa_nome, status_codigo, data_fechamento_os, criado_em, tipo_os_sigla')
      .not('status_codigo', 'in', '("E","F")').order('id')),
  ])
  const cfg = cfgRes.data || {}
  const diasDigitacao = cfg.dias_digitacao ?? 14
  const diasSolucao = cfg.dias_solucao ?? 14
  const porTipo = cfg.dias_solucao_por_tipo ?? {}

  const casaPorId = new Map(empresas.map(e => [e.id, casaDaEmpresa(e.nome_empresa_sistema) || casaDaEmpresa(e.empresa_fantasia)]))
  const alvo = empresaKey ? norm(empresaKey) : null
  const hoje = new Date()

  let digitacaoAtrasada = 0
  let aguardandoForaPrazo = 0
  for (const g of garantias) {
    const casa = casaPorId.get(g.empresa_id) || casaDaEmpresa(g.empresa_nome)
    if (alvo && norm(casa) !== alvo) continue

    if (g.status_codigo === 'A' && g.data_fechamento_os) {
      if (diasDesde(new Date(g.data_fechamento_os + 'T12:00:00'), hoje) > diasDigitacao) digitacaoAtrasada++
    } else if (STATUS_ANDAMENTO.has(g.status_codigo) && g.criado_em) {
      const prazo = porTipo[String(g.tipo_os_sigla || '').trim()] ?? diasSolucao
      if (diasDesde(new Date(g.criado_em), hoje) >= prazo) aguardandoForaPrazo++
    }
  }

  return {
    digitacaoAtrasada: noPeriodoAtual(digitacaoAtrasada, ano),
    aguardandoForaPrazo: noPeriodoAtual(aguardandoForaPrazo, ano),
  }
}
