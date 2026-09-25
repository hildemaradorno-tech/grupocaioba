/**
 * Metas aprovadas (fato_metas_publicadas — gravadas na Gestão de Aprovação de
 * Metas / Total Grupo) convertidas para os períodos da Matriz KPIs
 * (q1..q4, fy, m01..m12, s01..s70), prontas para injetar na coluna "Meta".
 *
 * Na Matriz KPIs a meta é sempre lida de fato_metas_publicadas — é o único
 * lugar de verdade daqui; nunca ler as tabelas de rascunho/planejamento
 * (fato_rascunho_metas_*) diretamente.
 *
 * As metas são mensais. Trimestre/FY somam os meses; as semanas rateiam a meta
 * do mês pelos dias úteis de cada semana (fato_calendario da própria empresa;
 * sem calendário cadastrado cai em segunda a sexta).
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => `m${String(i + 1).padStart(2, '0')}`)
const ALL_WEEKS  = Array.from({ length: 70 }, (_, i) => `s${String(i + 1).padStart(2, '0')}`)
const QUARTERS   = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] }

const TTL_MS = 60_000
const _cache = new Map()

function normNome(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
}

async function fetchTudo(montarQuery) {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await montarQuery().range(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < PAGE) break
  }
  return out
}

// Mesma regra de semanas do frontend (src/utils/kpiPeriods.js → computeWeekSchema):
// o dia 1 abre a semana e ela fecha no 1º sábado; as demais vão de domingo a sábado
// (ou até o fim do mês) — toda semana pertence a um único mês.
function computeWeekRanges(year) {
  const ranges = {}
  let n = 1
  for (let m = 1; m <= 12; m++) {
    const dim      = new Date(Date.UTC(year, m, 0)).getUTCDate()
    const dow1     = new Date(Date.UTC(year, m - 1, 1)).getUTCDay()
    const firstSat = dow1 === 6 ? 1 : 1 + (6 - dow1)
    let start = 1
    while (start <= dim) {
      const end = start === 1 ? Math.min(firstSat, dim) : Math.min(start + 6, dim)
      ranges[`s${String(n).padStart(2, '0')}`] = { mes: m, inicio: start, fim: end }
      n++
      start = end + 1
    }
  }
  return ranges
}

// Todas as metas publicadas do ano, de qualquer tipo, mais o calendário —
// cacheado por ano só, reaproveitado por qualquer indicador que precise
// localizar uma meta (Peças, Total Oficina, futuros).
async function carregarBase(ano) {
  const key = `base-${ano}`
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return null

  const [metas, calendario] = await Promise.all([
    fetchTudo(() => supabaseAdmin.from('fato_metas_publicadas')
      .select('empresa_id, empresa_nome, mes, tipo, colaborador_nome, meta_faturamento, meta_servicos')
      .eq('ano', ano).order('id')),
    fetchTudo(() => supabaseAdmin.from('fato_calendario')
      .select('empresa_id, data, dias_uteis')
      .eq('ano', ano).order('data')),
  ])

  const data = { metas, calendario }
  _cache.set(key, { data, ts: Date.now() })
  return data
}

// dias úteis por empresa → mês → dia
function indexarCalendario(calendario) {
  const idx = {}
  for (const r of calendario) {
    const [, mm, dd] = String(r.data).split('-').map(Number)
    if (!idx[r.empresa_id]) idx[r.empresa_id] = {}
    if (!idx[r.empresa_id][mm]) idx[r.empresa_id][mm] = {}
    idx[r.empresa_id][mm][dd] = Number(r.dias_uteis) || 0
  }
  return idx
}

function diasUteisIntervalo(calEmpresaMes, ano, mes, inicio, fim) {
  let total = 0
  for (let d = inicio; d <= fim; d++) {
    if (calEmpresaMes) {
      total += calEmpresaMes[d] ?? 0
    } else {
      const dow = new Date(Date.UTC(ano, mes - 1, d)).getUTCDay()
      total += dow >= 1 && dow <= 5 ? 1 : 0
    }
  }
  return total
}

// Recebe linhas já filtradas de fato_metas_publicadas (mesmo tipo/recorte) e
// devolve nos períodos da Matriz KPIs: mês direto, trimestre/FY somando os
// meses, semana rateando pelos dias úteis (fato_calendario da empresa da
// linha; sem calendário cadastrado cai em segunda a sexta).
function periodizarMetas(linhas, ano, calendario) {
  if (!linhas.length) return null

  const calIdx = indexarCalendario(calendario)
  const semanas = computeWeekRanges(ano)

  // mês por empresa (soma de todas as linhas daquele recorte)
  const porEmpresaMes = {}
  for (const r of linhas) {
    const v = Number(r.meta_faturamento) || 0
    if (!v) continue
    if (!porEmpresaMes[r.empresa_id]) porEmpresaMes[r.empresa_id] = {}
    porEmpresaMes[r.empresa_id][r.mes] = (porEmpresaMes[r.empresa_id][r.mes] || 0) + v
  }

  const mes = Array(13).fill(null) // índices 1..12
  const sem = {}
  for (const [empresaId, meses] of Object.entries(porEmpresaMes)) {
    for (const [mStr, valor] of Object.entries(meses)) {
      const m = Number(mStr)
      mes[m] = (mes[m] || 0) + valor
    }
    for (const [key, w] of Object.entries(semanas)) {
      const valorMes = meses[w.mes]
      if (!valorMes) continue
      const cal = calIdx[empresaId]?.[w.mes] || null
      const uteisMes    = diasUteisIntervalo(cal, ano, w.mes, 1, new Date(Date.UTC(ano, w.mes, 0)).getUTCDate())
      const uteisSemana = diasUteisIntervalo(cal, ano, w.mes, w.inicio, w.fim)
      if (uteisMes > 0) sem[key] = (sem[key] || 0) + valorMes * (uteisSemana / uteisMes)
    }
  }

  const out = {}
  ALL_MONTHS.forEach((k, i) => { out[k] = mes[i + 1] })
  for (const [q, ms] of Object.entries(QUARTERS)) {
    const vals = ms.map(m => mes[m]).filter(v => v != null)
    out[q] = vals.length ? vals.reduce((s, v) => s + v, 0) : null
  }
  const anoVals = mes.slice(1).filter(v => v != null)
  out.fy = anoVals.length ? anoVals.reduce((s, v) => s + v, 0) : null
  ALL_WEEKS.forEach(k => { out[k] = sem[k] ?? null })
  return out
}

/**
 * Metas de faturamento de Peças (vendedores de mercadoria) por período.
 * vendedorNome = null → soma de todos os vendedores/empresas publicados.
 * Retorna null quando não há meta aprovada/publicada para o recorte.
 */
export async function getMetaPecasPeriodos(ano, vendedorNome = null) {
  const base = await carregarBase(ano)
  if (!base) return null

  const alvo = vendedorNome ? normNome(vendedorNome) : null
  const linhas = base.metas.filter(r => r.tipo === 'pecas' && (!alvo || normNome(r.colaborador_nome) === alvo))
  return periodizarMetas(linhas, ano, base.calendario)
}

/**
 * Meta de Faturamento Total Oficina (Peças + Serviços) por período.
 *
 * Sem consultorNome: usa o tipo 'mecanico' — é o único total de Oficina que
 * aparece na tela de Gestão de Aprovação de Metas (TIPOS ali só tem pecas,
 * consultor, mecanico; funilaria/terceiros não têm aba e não entram em
 * nenhum total exibido lá, mesmo sendo aprovados junto em cascata). Não soma
 * 'consultor' (é a MESMA meta redistribuída entre os consultores pra tela de
 * Distribuição de Consultores — 1:1 com mecanico; somar os dois contaria em
 * dobro) nem 'funilaria'/'terceiros' (aprovados em cascata mas fora do total
 * de Oficina que o usuário vê/aprova nessa tela).
 *
 * Com consultorNome: usa direto o tipo 'consultor' filtrado por esse
 * colaborador — é a mesma meta de Oficina, só que já quebrada por consultor.
 *
 * empresaNome: restringe à empresa (casa) informada — usado nos quadros por
 * casa do Pós-Venda; null = todas as empresas (Gerente Geral).
 */
export async function getMetaOficinaPeriodos(ano, { consultorNome = null, empresaNome = null } = {}) {
  const base = await carregarBase(ano)
  if (!base) return null

  let linhas
  if (consultorNome) {
    const alvo = normNome(consultorNome)
    linhas = base.metas.filter(r => r.tipo === 'consultor' && normNome(r.colaborador_nome) === alvo)
  } else {
    linhas = base.metas.filter(r => r.tipo === 'mecanico')
  }
  if (empresaNome) {
    const alvoEmp = normNome(empresaNome)
    linhas = linhas.filter(r => normNome(r.empresa_nome) === alvoEmp)
  }
  return periodizarMetas(linhas, ano, base.calendario)
}

/**
 * Meta de Faturamento Total Oficina (Serviços) do bloco MECÂNICO: só a parcela de
 * Serviços (meta_servicos, sem Peças) do tipo 'mecanico'
 * filtrado pelo mecânico selecionado; sem seleção = soma de todos.
 */
export async function getMetaMecanicoPeriodos(ano, mecanicoNome = null, filtroNome = null) {
  const base = await carregarBase(ano)
  if (!base) return null
  const alvo = mecanicoNome ? normNome(mecanicoNome) : null
  const linhas = base.metas
    .filter(r => r.tipo === 'mecanico' && (!alvo || normNome(r.colaborador_nome) === alvo) && (!filtroNome || filtroNome(r.colaborador_nome)))
    .map(r => ({ ...r, meta_faturamento: r.meta_servicos }))
  return periodizarMetas(linhas, ano, base.calendario)
}

// ── Margem Bruta (Serviços / Peças Oficina) — Indicadores do departamento Oficina ─────────────────
// Mesma conta da linha "Indicadores" do departamento Oficina na tela Total Pós-Vendas: margem
// ponderada = soma dos Lucros ÷ soma das Metas de cada consultor, onde
//   Meta do consultor = referência do setor de origem × % do consultor
//   Lucro             = Meta × margem % informada no planejamento do consultor.
// Peças usa ref.pecas; Serviços usa ref.servicos + ref.terceiros. A margem % só existe nas tabelas de
// planejamento (não é publicada), então entram apenas linhas de consultor hoje APROVADAS
// (meta_aprovada = meta_faturamento), respeitando a regra de só mostrar meta aprovada.
const PROD_NAO_ASSOCIADA_ID = '00000000-0000-0000-0000-000000000001'

function valoresMetaMecanico(row) {
  if (row.colaborador_id === PROD_NAO_ASSOCIADA_ID) {
    return { meta_servicos: Number(row.meta_servicos) || 0, meta_pecas: Number(row.meta_pecas) || 0 }
  }
  const hm = (Number(row.horas_disponiveis) || 0) * ((Number(row.produtividade) || 0) / 100)
  const vh = Number(row.valor_hora) || 0
  const cp = Number(row.coef_pecas) || 0
  const meta_servicos = Math.round(hm * vh)
  return { meta_servicos, meta_pecas: meta_servicos * cp }
}

async function carregarBaseMargem(ano) {
  const key = `margem-${ano}`
  const hit = _cache.get(key)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.data
  const admin = getSupabaseAdmin()
  if (!admin) return null

  const rasc = (tabela, cols) => fetchTudo(() => admin.from(tabela).select(cols).eq('ano', ano).order('id'))
  const [consultor, mecanico, terceiros, funilaria, funcionarios, boxes, setores] = await Promise.all([
    rasc('fato_rascunho_metas_servicos_consultor', 'id, empresa_id, empresa_nome, colaborador_nome, setor_id, setor_nome, box_id, mes, percentual, meta_faturamento, meta_aprovada, margem_pecas_pct, margem_servicos_pct'),
    rasc('fato_rascunho_metas_servicos_mecanico', 'id, empresa_id, colaborador_id, box_id, mes, horas_disponiveis, produtividade, valor_hora, coef_pecas, meta_servicos, meta_pecas'),
    rasc('fato_rascunho_metas_terceiros', 'id, empresa_id, mes, meta_servicos'),
    rasc('fato_rascunho_metas_funilaria_pintura', 'id, empresa_id, mes, meta_pecas, meta_servicos'),
    fetchTudo(() => admin.from('dim_funcionarios').select('id, box_id').order('id')),
    fetchTudo(() => admin.from('dim_box').select('*').order('id')),
    fetchTudo(() => admin.from('dim_setores').select('id, nome_setor').order('id')),
  ])
  const data = { consultor, mecanico, terceiros, funilaria, funcionarios, boxes, setores }
  _cache.set(key, { data, ts: Date.now() })
  return data
}

function razaoPeriodos(lucro, meta, ano) {
  const pct = (l, m) => (m > 0 ? (l / m) * 100 : null)
  const out = {}
  ALL_MONTHS.forEach((k, i) => { out[k] = pct(lucro[i], meta[i]) })
  for (const [q, ms] of Object.entries(QUARTERS)) {
    out[q] = pct(ms.reduce((s, m) => s + lucro[m - 1], 0), ms.reduce((s, m) => s + meta[m - 1], 0))
  }
  out.fy = pct(lucro.reduce((s, v) => s + v, 0), meta.reduce((s, v) => s + v, 0))
  const semanas = computeWeekRanges(ano)
  ALL_WEEKS.forEach(k => { out[k] = semanas[k] ? out[ALL_MONTHS[semanas[k].mes - 1]] : null })
  return out
}

/**
 * Metas de Margem Bruta Serviços e Margem Bruta Peças Oficina (%) por período.
 * empresaNome: só consultores dessa empresa; consultorNome: só esse consultor; ambos null = todos.
 * Retorna { servicos, pecas } ou null quando não há nenhuma margem aprovada no recorte.
 */
export async function getMetaMargemOficinaPeriodos(ano, { empresaNome = null, consultorNome = null } = {}) {
  const base = await carregarBaseMargem(ano)
  if (!base) return null

  const alvoEmp = empresaNome ? normNome(empresaNome) : null
  const alvoCon = consultorNome ? normNome(consultorNome) : null

  const boxParaSetor = {}
  for (const b of base.boxes) {
    const ids = Array.isArray(b.setor_ids) ? b.setor_ids : (b.setor_id ? [b.setor_id] : [])
    const valido = ids.find(id => base.setores.some(s => s.id === id))
    if (valido) boxParaSetor[b.id] = valido
  }
  const boxDoFuncionario = new Map(base.funcionarios.map(f => [f.id, f.box_id]))
  const nomeSetor = new Map(base.setores.map(s => [s.id, s.nome_setor]))

  const refCache = {}
  const referencias = (empresaId, setorId, setorNome) => {
    const ck = `${empresaId}|${setorId}`
    if (refCache[ck]) return refCache[ck]
    const refs = Array.from({ length: 12 }, () => ({ pecas: 0, servicos: 0, terceiros: 0 }))
    if (/funilaria|pintura/i.test(setorNome || '')) {
      base.funilaria.filter(r => r.empresa_id === empresaId).forEach(r => {
        refs[r.mes - 1].pecas += Number(r.meta_pecas) || 0
        refs[r.mes - 1].servicos += Number(r.meta_servicos) || 0
      })
    } else {
      base.mecanico.filter(r => r.empresa_id === empresaId).forEach(r => {
        const bId = boxDoFuncionario.get(r.colaborador_id) || r.box_id
        if (!bId || boxParaSetor[bId] !== setorId) return
        const v = valoresMetaMecanico(r)
        refs[r.mes - 1].servicos += v.meta_servicos
        refs[r.mes - 1].pecas += v.meta_pecas
      })
      base.terceiros.filter(r => r.empresa_id === empresaId).forEach(r => { refs[r.mes - 1].terceiros += Number(r.meta_servicos) || 0 })
    }
    return (refCache[ck] = refs)
  }

  const lucroP = Array(12).fill(0), metaP = Array(12).fill(0), lucroS = Array(12).fill(0), metaS = Array(12).fill(0)
  for (const r of base.consultor) {
    if (alvoEmp && normNome(r.empresa_nome) !== alvoEmp) continue
    if (alvoCon && normNome(r.colaborador_nome) !== alvoCon) continue
    const aprovado = r.meta_aprovada != null && Math.abs((Number(r.meta_faturamento) || 0) - Number(r.meta_aprovada)) <= 0.001
    if (!aprovado) continue
    const setorId = (r.box_id && boxParaSetor[r.box_id]) || r.setor_id
    const i = (Number(r.mes) || 1) - 1
    const ref = referencias(r.empresa_id, setorId, nomeSetor.get(setorId) || r.setor_nome)[i]
    const pct = (Number(r.percentual) || 0) / 100
    if (r.margem_pecas_pct != null && r.margem_pecas_pct !== '') {
      lucroP[i] += ref.pecas * pct * (Number(r.margem_pecas_pct) / 100)
      metaP[i] += ref.pecas * pct
    }
    if (r.margem_servicos_pct != null && r.margem_servicos_pct !== '') {
      lucroS[i] += (ref.servicos + ref.terceiros) * pct * (Number(r.margem_servicos_pct) / 100)
      metaS[i] += (ref.servicos + ref.terceiros) * pct
    }
  }

  const temP = metaP.some(v => v > 0), temS = metaS.some(v => v > 0)
  if (!temP && !temS) return null
  return {
    pecas: temP ? razaoPeriodos(lucroP, metaP, ano) : null,
    servicos: temS ? razaoPeriodos(lucroS, metaS, ano) : null,
  }
}
