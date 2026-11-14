/**
 * Valores da Matriz KPIs › Bloco 3 - Serviços tirados do BI "Possibilidades - Sintonia do Dia"
 * (src/pages/bi/BiPossibilidades.jsx) — pedido do usuário, 13/11/2026 (antes vinham de Matriz › Fontes):
 *
 *   CONSULTOR DE SERVIÇOS (aba Serviços › modo Consultor, linha do consultor; sem consultor = linha OFICINA)
 *     Faturamento Total Oficina (Peças + Serviços) = Real Peças + Real Serviços
 *     Margem Bruta Serviços (%)                    = Margem Serv ÷ Real Serviços × 100
 *     Margem Bruta Peças Oficina (%)               = Margem Peças ÷ Real Peças × 100
 *     Ticket Médio da Oficina                      = Real Total ÷ Pass
 *   MECÂNICO (aba Serviços › modo Oficina, linha do mecânico — ROF042; sem mecânico = Oficina toda)
 *     Faturamento Total Oficina (Serviços)         = Real Serviços (Medida "Produtivo - Serviços")
 *   SETOR FUNILARIA/PINTURA (linha do setor Funilaria/Pintura, na empresa escolhida; TODAS = todas)
 *     Faturamento Total Funilaria/Pintura (Departamento) = Real Peças + Real Serviços
 *
 * Fonte: fato_bi_medidas_diario (Medidas BI com "Slot no Faturamento", gravadas pelo "Atualizar agora" da
 * tela ou pelo Atualizar da Matriz) — a mesma da tela. Tipo de OS → Departamento/Setor com as MESMAS regras
 * de src/utils/biDimensoes.js (resolverPorDepartamento): sigla (ou 1º trecho "V01 - ..."), ou código;
 * Tipo de OS em branco = Balcão Peças / Atacado-Varejo. Linha OFICINA = departamento do Tipo de OS;
 * linhas de consultor/setor = setor do Tipo de OS (setor_servico → dim_setores) dentro da Oficina.
 *
 * Períodos da Matriz: mês, semana, trimestre e ano; o período em andamento vai até ONTEM (ou até hoje com
 * "Considerar o dia atual"). Lê o ano inteiro uma vez e guarda por 10 min (limparCachePossibilidades()
 * depois de uma atualização).
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { semanasDoAno } from './kpiSemanas.js'

const DEPTO_BALCAO_PECAS = 'af05c274-d017-4618-bb5f-87d46b589c36'
const SETOR_ATACADO_VAREJO = 'cd487957-658d-4ca9-87fa-11fa294b3a53'
const DEPTO_OFICINA = 'd549c5fc-79dd-4346-bfd9-cbef8e902a3f'
const SLOTS = ['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass', 'prodServicos']
const QUARTERS = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] }

export const normalizaBusca = (v) => String(v ?? '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const diaMS = (desloc) => new Date(Date.now() - 4 * 3600 * 1000 + desloc * 86400000).toISOString().slice(0, 10)

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

// ── Leitura do ano (cache 10 min) ─────────────────────────────────────────────
const _cache = new Map() // ano → { ts, promessa }
export function limparCachePossibilidades() { _cache.clear() }

// Guardado há mais de 10 min: devolve o guardado na hora e relê por trás (a tela não espera os ~4 s).
// limparCachePossibilidades() (depois de uma Atualização) força ler de novo na próxima consulta.
function carregarAno(ano) {
  const hit = _cache.get(ano)
  if (hit && (hit.relendo || Date.now() - hit.ts < 10 * 60_000)) return hit.promessa
  if (hit) {
    hit.relendo = true
    const promessa = lerAno(ano)
    promessa.then(() => _cache.set(ano, { ts: Date.now(), promessa }))
      .catch(err => { hit.relendo = false; console.error('[possibilidades] releitura:', err.message) })
    return hit.promessa
  }
  const nova = lerAno(ano).catch(err => { _cache.delete(ano); throw err })
  _cache.set(ano, { ts: Date.now(), promessa: nova })
  return nova
}

async function lerAno(ano) {
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const [medidas, tiposOS, setores] = await Promise.all([
    admin.from('dim_medidas_bi').select('id, slot_faturamento, tipo_agregacao, ativo').not('slot_faturamento', 'is', null)
      .then(r => { if (r.error) throw r.error; return r.data || [] }),
    admin.from('dim_tipos_os').select('*').then(r => { if (r.error) throw r.error; return r.data || [] }),
    admin.from('dim_setores').select('id, nome_setor, departamento_id').then(r => { if (r.error) throw r.error; return r.data || [] }),
  ])
  const slotDaMedida = new Map(medidas.filter(m => m.ativo && SLOTS.includes(m.slot_faturamento)).map(m => [m.id, m.slot_faturamento]))
  if (!slotDaMedida.size) return null
  const linhas = await fetchTudo(() => admin.from('fato_bi_medidas_diario')
    .select('medida_id, data, empresa_norm, tipo_os, funcionario, soma, linhas, distintos')
    .in('medida_id', [...slotDaMedida.keys()])
    .gte('data', iso(ano, 1, 1)).lte('data', iso(ano, 12, 31))
    .order('data').order('medida_id').order('empresa_norm').order('tipo_os').order('funcionario'))

  // Tipo de OS → { deptId, setorId } (regras de resolverPorDepartamento).
  const tipoPorSigla = new Map()
  for (const t of tiposOS) { const k = normalizaBusca(t.sigla); if (k) tipoPorSigla.set(k, t) }
  const setorPorNome = new Map(setores.map(s => [normalizaBusca(s.nome_setor), s]))
  const deptDoSetor = new Map(setores.map(s => [s.id, s.departamento_id]))
  const resolvido = new Map()
  const resolver = (bruto) => {
    const tb = String(bruto ?? '').trim()
    if (resolvido.has(tb)) return resolvido.get(tb)
    let r
    if (tb === '') r = { deptId: DEPTO_BALCAO_PECAS, setorId: SETOR_ATACADO_VAREJO }
    else {
      const alvo = normalizaBusca(tb)
      const t = tipoPorSigla.get(alvo) || tipoPorSigla.get(normalizaBusca(tb.split(' - ')[0]))
        || tiposOS.find(x => String(x.codigo ?? '').trim() === tb) || null
      r = { deptId: t?.departamento_id || null, setorId: setorPorNome.get(normalizaBusca(t?.setor_servico))?.id || null }
    }
    resolvido.set(tb, r)
    return r
  }
  const setorFunilaria = setores.find(s => normalizaBusca(s.nome_setor) === 'FUNILARIA/PINTURA')?.id || null

  // Uma linha enxuta por registro, já com o que cada indicador precisa saber.
  const regs = linhas.map(l => {
    const { deptId, setorId } = resolver(l.tipo_os)
    return {
      slot: slotDaMedida.get(l.medida_id), data: String(l.data).slice(0, 10), empresa: l.empresa_norm || '',
      func: normalizaBusca(l.funcionario), soma: Number(l.soma) || 0, distintos: l.distintos || null,
      oficina: deptId === DEPTO_OFICINA, // linha OFICINA (departamento do Tipo de OS)
      setorOficina: !!setorId && deptDoSetor.get(setorId) === DEPTO_OFICINA, // linhas de setor/consultor da Oficina
      funilaria: !!setorId && setorId === setorFunilaria,
    }
  })
  return { regs }
}

// ── Períodos da Matriz (até o corte) ─────────────────────────────────────────
function periodosDoAno(ano, corte) {
  const ult = (m) => new Date(ano, m, 0).getDate()
  const p = {}
  for (let m = 1; m <= 12; m++) p[`m${String(m).padStart(2, '0')}`] = [iso(ano, m, 1), iso(ano, m, ult(m))]
  for (const [k, s] of Object.entries(semanasDoAno(ano))) p[k] = [iso(ano, s.mes, s.inicio), iso(ano, s.mes, s.fim)]
  for (const [q, ms] of Object.entries(QUARTERS)) p[q] = [iso(ano, ms[0], 1), iso(ano, ms[2], ult(ms[2]))]
  p.fy = [iso(ano, 1, 1), iso(ano, 12, 31)]
  const out = {}
  for (const [k, [ini, fim]] of Object.entries(p)) if (ini <= corte) out[k] = [ini, fim < corte ? fim : corte]
  return out
}

// Soma por slot de um conjunto de registros (Pass = O.S. distintas).
function somar(regs) {
  const v = { realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, prodServicos: 0 }
  const pass = new Set()
  for (const r of regs) {
    if (r.slot === 'pass') { for (const x of r.distintos || []) pass.add(x) }
    else v[r.slot] += r.soma
  }
  return { ...v, pass: pass.size }
}

const pct = (a, b) => (b ? (a / b) * 100 : null)
const indicadoresConsultor = (s) => ({
  fatTotal: s.realPecas + s.realServicos || null,
  margemServicos: pct(s.margemServicos, s.realServicos),
  margemPecas: pct(s.margemPecas, s.realPecas),
  ticket: s.pass ? (s.realPecas + s.realServicos) / s.pass : null,
})

/**
 * @param ano
 * @param opts { incluirHoje, consultor, mecanico, empresaFunilaria ('CAMPO GRANDE'… | 'TODAS' | null) }
 * @returns { consultor: {indicador: {p: v}}, mecanico: {fatServicos: {p: v}}, funilaria: {fatTotal: {p: v}} | null }
 */
export async function getValoresPossibilidades(ano, { incluirHoje = false, consultor = null, mecanico = null, empresaFunilaria = null } = {}) {
  const base = await carregarAno(ano)
  if (!base) return null
  const periodos = periodosDoAno(ano, incluirHoje ? diaMS(0) : diaMS(-1))
  const nomeCons = consultor ? normalizaBusca(consultor) : null
  const nomeMec = mecanico ? normalizaBusca(mecanico) : null
  const empFun = empresaFunilaria && empresaFunilaria !== 'TODAS' ? normalizaBusca(empresaFunilaria).replace(/ DO SUL$/, '') : null

  // Registros de cada quadro (filtro fixo), depois cortados por período.
  const regsCons = base.regs.filter(r => r.slot !== 'prodServicos' && (nomeCons ? r.setorOficina && r.func === nomeCons : r.oficina))
  const regsMec = base.regs.filter(r => r.slot === 'prodServicos' && (!nomeMec || r.func === nomeMec))
  const regsFun = empresaFunilaria ? base.regs.filter(r => r.funilaria && ['realPecas', 'realServicos'].includes(r.slot) && (!empFun || r.empresa.includes(empFun))) : []

  const out = { consultor: { fatTotal: {}, margemServicos: {}, margemPecas: {}, ticket: {} }, mecanico: { fatServicos: {} }, funilaria: empresaFunilaria ? { fatTotal: {} } : null }
  for (const [p, [ini, fim]] of Object.entries(periodos)) {
    const dentro = (r) => r.data >= ini && r.data <= fim
    const c = indicadoresConsultor(somar(regsCons.filter(dentro)))
    for (const k of Object.keys(c)) out.consultor[k][p] = c[k]
    out.mecanico.fatServicos[p] = somar(regsMec.filter(dentro)).prodServicos || null
    if (out.funilaria) { const f = somar(regsFun.filter(dentro)); out.funilaria.fatTotal[p] = f.realPecas + f.realServicos || null }
  }
  return out
}
