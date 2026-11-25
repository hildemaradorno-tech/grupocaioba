/**
 * Valores da Matriz de KPIs › Bloco 3 - Serviços tirados do BI "Possibilidades - Sintonia do Dia"
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
import { cacheSwr } from './cacheSwr.js'
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

// ── Leitura do ano: guardada para todos até a próxima Atualização (cacheSwr, 17/11/2026) ─────────────
const _cache = new Map() // ano → { ts, promessa }
export function limparCachePossibilidades() { _cache.clear() }

// limparCachePossibilidades() (depois de uma Atualização das Medidas BI) e limparCachesSwr() (fim da
// Atualização da Matriz) fazem ler de novo na próxima consulta.
function carregarAno(ano) {
  return cacheSwr(_cache, ano, () => lerAno(ano), { rotulo: 'possibilidades' })
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
  // Setor Mecânica da Oficina (linha "Mecânica" abaixo de OFICINA) — CHEFE DE OFICINA › Faturamento (Equipe).
  const setorMecanica = setores.find(s => normalizaBusca(s.nome_setor) === 'MECANICA' && s.departamento_id === DEPTO_OFICINA)?.id || null

  // Uma linha enxuta por registro, já com o que cada indicador precisa saber.
  const regs = linhas.map(l => {
    const { deptId, setorId } = resolver(l.tipo_os)
    return {
      slot: slotDaMedida.get(l.medida_id), data: String(l.data).slice(0, 10), empresa: l.empresa_norm || '',
      func: normalizaBusca(l.funcionario), soma: Number(l.soma) || 0, distintos: l.distintos || null,
      oficina: deptId === DEPTO_OFICINA, // linha OFICINA (departamento do Tipo de OS)
      balcao: deptId === DEPTO_BALCAO_PECAS, // linha BALCÃO PEÇAS (Tipo de OS em branco = venda de balcão)
      setorOficina: !!setorId && deptDoSetor.get(setorId) === DEPTO_OFICINA, // linhas de setor/consultor da Oficina
      funilaria: !!setorId && setorId === setorFunilaria,
      mecanica: !!setorId && setorId === setorMecanica,
      ...(slotDaMedida.get(l.medida_id) === 'pass' ? { tipoOs: l.tipo_os || '' } : {}), // Tempo na Oficina (Bloco 2)
    }
  })
  // Setor do Tipo de OS (cadastro, pela sigla e pelo nome) — usado no Tempo na Oficina.
  const setorDoTipo = new Map()
  for (const t of tiposOS) {
    if (t.sigla) setorDoTipo.set(normalizaBusca(t.sigla), t.setor_servico || null)
    if (t.tipo_os) setorDoTipo.set(normalizaBusca(t.tipo_os), t.setor_servico || null)
  }
  return { regs, setorDoTipo }
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
 * Linha OFICINA (departamento do Tipo de OS) da Possibilidades por casa — quadros dos Gerentes (Bloco 3 ›
 * Gerentes, 14/11/2026): Faturamento Total Oficina (Peças + Serviços), Margem Bruta Serviços e Peças Oficina.
 * @returns { TODAS: {fatTotal, margemServicos, margemPecas}, 'CAMPO GRANDE': {...}, … } — cada um { período: valor }
 */
export const CASAS_POSSIBILIDADES = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']
// casas (opcional, 23/11/2026 — seletor de empresas DAF da Matriz): também a soma dessas casas, na chave
// casas.join(',') (ex.: 'DOURADOS,TRÊS LAGOAS'); margens sobre os valores somados.
export async function getOficinaPorCasa(ano, { incluirHoje = false, casas = null } = {}) {
  const base = await carregarAno(ano)
  if (!base) return null
  const periodos = periodosDoAno(ano, incluirHoje ? diaMS(0) : diaMS(-1))
  const regsOficina = base.regs.filter(r => r.oficina && r.slot !== 'prodServicos')
  // Linha BALCÃO PEÇAS (Faturamento Balcão = Real Total; Margem Bruta Peças Balcão = Margem Peças ÷ Real Peças).
  const regsBalcao = base.regs.filter(r => r.balcao && r.slot !== 'prodServicos')
  const out = {}
  const chaveSel = casas?.length ? casas.join(',') : null
  for (const casa of ['TODAS', ...CASAS_POSSIBILIDADES, ...(chaveSel ? [chaveSel] : [])]) {
    const alvos = casa === 'TODAS' ? null : casa.split(',').map(c => normalizaBusca(c).replace(/ DO SUL$/, ''))
    const daCasa = (lista) => (alvos ? lista.filter(r => alvos.some(a => r.empresa.includes(a))) : lista)
    const regs = daCasa(regsOficina)
    const regsBal = daCasa(regsBalcao)
    // ticket / passagens (24/11/2026): Bloco 2 › Pós-Vendas › Ticket médio OFICINA e Passagem Total (O.S. distintas).
    const o = { fatTotal: {}, margemServicos: {}, margemPecas: {}, ticket: {}, passagens: {}, balcaoFat: {}, balcaoMargemPecas: {} }
    for (const [p, [ini, fim]] of Object.entries(periodos)) {
      const dentro = (r) => r.data >= ini && r.data <= fim
      const s = somar(regs.filter(dentro))
      const c = indicadoresConsultor(s)
      o.fatTotal[p] = c.fatTotal; o.margemServicos[p] = c.margemServicos; o.margemPecas[p] = c.margemPecas
      o.ticket[p] = c.ticket; o.passagens[p] = s.pass || null
      const b = indicadoresConsultor(somar(regsBal.filter(dentro)))
      o.balcaoFat[p] = b.fatTotal; o.balcaoMargemPecas[p] = b.margemPecas
    }
    out[casa] = o
  }
  return out
}

/**
 * Bloco 2 › Pós-Vendas › Tempo veículo oficina / funilaria (24/11/2026): "Média de dias na oficina" da aba Tempo na
 * Oficina do BI Possibilidades (src/pages/garantias-daf/TempoNaOficina.jsx), com a MESMA conta, separada por setor
 * (Mecânica / Funilaria/Pintura):
 *   - O.S. do Pass (faturadas) com nota emitida no período; dias = abertura (ROF001_OSAberta_Excel) → nota mais
 *     recente da O.S. no período;
 *   - linhas do ROF001 com o mesmo Tipo de OS faturado (se nenhum bater, todas as linhas da O.S.);
 *   - setor pelo cadastro Tipos de OS (sigla), reserva pelo nome; uma O.S. conta uma vez em cada setor que tiver;
 *   - média por O.S., arredondada em dias inteiros (como o relógio).
 * Meta = "verde até" (media_meta_dias) da regra da engrenagem (tempo_oficina_regras) do mês do fim do período:
 * mensal > anual; da empresa (só ela marcada) > todas.
 * @returns { mecanica: { realizado: {p}, meta: {p} }, funilaria: { … } }
 */
const _cacheTempo = new Map()
const diasEntre = (a, b) => (a && b ? Math.floor((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000) : null)
const setorPorNomeTempo = (nome) => {
  const n = normalizaBusca(nome)
  if (n.includes('FUNIL') || n.includes('PINTUR') || n.includes('(FUN')) return 'FUNILARIA/PINTURA'
  return n ? 'MECANICA' : null
}
export async function getTempoOficinaPorSetor(ano, { incluirHoje = false, casas = null } = {}) {
  const chave = `${ano}|${incluirHoje ? 1 : 0}|${casas?.length ? casas.join(',') : 'TODAS'}`
  const [realizado, regras, empresas] = await Promise.all([
    cacheSwr(_cacheTempo, chave, () => calcularTempoOficina(ano, { incluirHoje, casas }), { rotulo: 'tempo-oficina' }),
    getSupabaseAdmin()?.from('tempo_oficina_regras').select('ano, mes, empresa_id, media_meta_dias').eq('ano', ano)
      .then(r => r.data || []) ?? [],
    casas?.length === 1
      ? getSupabaseAdmin()?.from('dim_empresas').select('id, nome_empresa, nome_empresa_sistema').then(r => r.data || []) ?? []
      : [],
  ])
  if (!realizado) return null
  // Empresa única marcada → id em dim_empresas (Trucks da casa)
  let empresaUnica = null
  if (casas?.length === 1) {
    const alvo = normalizaBusca(casas[0]).replace(/ DO SUL$/, '')
    empresaUnica = empresas.find(e => [e.nome_empresa, e.nome_empresa_sistema].some(n => {
      const x = normalizaBusca(n); return x.includes('TRUCKS') && x.includes(alvo)
    }))?.id || null
  }
  const regraDoMes = (mes) => {
    const candidatas = [
      r => empresaUnica && r.empresa_id === empresaUnica && Number(r.mes) === mes,
      r => empresaUnica && r.empresa_id === empresaUnica && !r.mes,
      r => !r.empresa_id && Number(r.mes) === mes,
      r => !r.empresa_id && !r.mes,
    ]
    for (const c of candidatas) { const achou = regras.find(c); if (achou) return achou }
    return null
  }
  const meta = {}
  const corte = incluirHoje ? diaMS(0) : diaMS(-1)
  for (const [p, [ini, fim]] of Object.entries(periodosDoAno(ano, iso(ano, 12, 31)))) {
    const fimEf = corte >= ini && corte < fim ? corte : fim // período em andamento: mês de hoje
    const v = regraDoMes(Number(fimEf.slice(5, 7)))?.media_meta_dias
    meta[p] = v === null || v === undefined ? null : Number(v)
  }
  return {
    mecanica: { realizado: realizado.mecanica, meta },
    funilaria: { realizado: realizado.funilaria, meta },
  }
}

async function calcularTempoOficina(ano, { incluirHoje, casas }) {
  const base = await carregarAno(ano)
  if (!base) return null
  const { getOsTempoOficina } = await import('./sharepointGarantias.js')
  const { rows } = await getOsTempoOficina({ de: iso(ano - 1, 1, 1) })
  const alvos = casas?.length ? casas.map(c => normalizaBusca(c).replace(/ DO SUL$/, '')) : null
  const naCasa = (emp) => { const e = normalizaBusca(emp); return e.includes('TRUCKS') && (!alvos || alvos.some(a => e.includes(a))) }
  // ROF001 por O.S. (empresa|nº)
  const rofPorOs = new Map()
  for (const r of rows) {
    if (!naCasa(r.empresa_nome)) continue
    const k = `${normalizaBusca(r.empresa_nome)}|${String(r.os_numero).trim()}`
    if (!rofPorOs.has(k)) rofPorOs.set(k, [])
    rofPorOs.get(k).push(r)
  }
  const setorDe = (r) => {
    const s = base.setorDoTipo.get(normalizaBusca(r.tipo_os_sigla))
    return s ? normalizaBusca(s) : setorPorNomeTempo(r.tipo_os_sigla)
  }
  const pass = base.regs.filter(r => r.slot === 'pass' && naCasa(r.empresa))
  const mecanica = {}, funilaria = {}
  for (const [p, [ini, fim]] of Object.entries(periodosDoAno(ano, incluirHoje ? diaMS(0) : diaMS(-1)))) {
    const tiposDaOs = new Map() // empresa|os → Set(tipo)
    const dataNota = new Map()
    for (const r of pass) {
      if (r.data < ini || r.data > fim) continue
      for (const os of r.distintos || []) {
        const k = `${normalizaBusca(r.empresa)}|${String(os).trim()}`
        if (!tiposDaOs.has(k)) tiposDaOs.set(k, new Set())
        tiposDaOs.get(k).add(normalizaBusca(r.tipoOs))
        if (!dataNota.has(k) || r.data > dataNota.get(k)) dataNota.set(k, r.data)
      }
    }
    const dias = { MECANICA: [], 'FUNILARIA/PINTURA': [] }
    for (const [k, tipos] of tiposDaOs) {
      const linhas = rofPorOs.get(k)
      if (!linhas) continue
      const comTipo = linhas.filter(l => tipos.has(normalizaBusca(l.tipo_os_sigla)))
      const usadas = comTipo.length ? comTipo : linhas
      // Uma vez por O.S. em cada setor (dias da 1ª linha, como a aba)
      const porSetor = new Map()
      for (const l of usadas) {
        const s = setorDe(l)
        if (!porSetor.has(s)) porSetor.set(s, diasEntre(String(l.data_criacao).slice(0, 10), dataNota.get(k)))
      }
      for (const [s, d] of porSetor) if (d !== null && dias[s]) dias[s].push(d)
    }
    const media = (lista) => (lista.length ? Math.round(lista.reduce((a, b) => a + b, 0) / lista.length) : null)
    mecanica[p] = media(dias.MECANICA)
    funilaria[p] = media(dias['FUNILARIA/PINTURA'])
  }
  return { mecanica, funilaria }
}

// Filtro de casa sobre empresa_norm ('CAIOBA TRUCKS - CHAPADAO' etc.); 'TODAS'/null = todas.
const daCasaFn = (casa) => {
  if (!casa || casa === 'TODAS') return () => true
  const alvo = normalizaBusca(casa).replace(/ DO SUL$/, '')
  return (r) => r.empresa.includes(alvo)
}

/**
 * CHEFE DE OFICINA › Faturamento Total Oficina (Equipe) (14/11/2026): linha do setor Mecânica (abaixo de OFICINA)
 * da Possibilidades na empresa — Real Peças + Real Serviços. @returns { período: valor }
 */
export async function getFaturamentoSetorMecanica(ano, casa, { incluirHoje = false } = {}) {
  const base = await carregarAno(ano)
  if (!base) return null
  const naCasa = daCasaFn(casa)
  const regs = base.regs.filter(r => r.mecanica && (r.slot === 'realPecas' || r.slot === 'realServicos') && naCasa(r))
  const out = {}
  for (const [p, [ini, fim]] of Object.entries(periodosDoAno(ano, incluirHoje ? diaMS(0) : diaMS(-1)))) {
    const s = somar(regs.filter(r => r.data >= ini && r.data <= fim))
    out[p] = s.realPecas + s.realServicos || null
  }
  return out
}

/**
 * Bloco 3 - Peças (14/11/2026): linha BALCÃO PEÇAS da Possibilidades — todas as Trucks (Gerente/Coordenador
 * Atacado) ou só as vendas do vendedor (funcionário da venda, NF_UsuNomVendedor).
 * Faturamento = Real Peças + Real Serviços; Margem = Margem Peças ÷ Real Peças × 100.
 * @returns { fat: { período: R$ }, margem: { período: % } }
 */
// casas (opcional, 23/11/2026): só as empresas escolhidas no seletor DAF da Matriz (['DOURADOS', …]).
export async function getBalcaoPecas(ano, { vendedor = null, incluirHoje = false, casas = null } = {}) {
  const base = await carregarAno(ano)
  if (!base) return null
  const nome = vendedor ? normalizaBusca(vendedor) : null
  const filtrosCasa = casas?.length ? casas.map(daCasaFn) : null
  const regs = base.regs.filter(r => r.balcao && r.slot !== 'prodServicos' && (!nome || r.func === nome)
    && (!filtrosCasa || (r.empresa.includes('TRUCKS') && filtrosCasa.some(f => f(r))))) // casa da Trucks (não a Motos de mesmo nome)
  const out = { fat: {}, margem: {} }
  for (const [p, [ini, fim]] of Object.entries(periodosDoAno(ano, incluirHoje ? diaMS(0) : diaMS(-1)))) {
    const c = indicadoresConsultor(somar(regs.filter(r => r.data >= ini && r.data <= fim)))
    out.fat[p] = c.fatTotal
    out.margem[p] = c.margemPecas
  }
  return out
}

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

/**
 * Empresas de cada pessoa no ano (seletor de empresas DAF da Matriz, 23/11/2026): em quais casas da Caiobá Trucks
 * o consultor (setores da Oficina), o mecânico (produtivo) e o vendedor (Balcão) tiveram movimento na Possibilidades.
 * Os seletores de pessoa dos quadros mostram só quem é das empresas marcadas.
 * @returns { consultores: { NOME: ['DOURADOS', …] }, mecanicos: {…}, vendedores: {…} } — nomes em maiúsculas sem acento.
 */
const CASAS_PESSOA = ['CAMPO GRANDE', 'DOURADOS', 'TRES LAGOAS', 'CHAPADAO']
const CASA_NOME = { 'CAMPO GRANDE': 'CAMPO GRANDE', DOURADOS: 'DOURADOS', 'TRES LAGOAS': 'TRÊS LAGOAS', CHAPADAO: 'CHAPADÃO DO SUL' }
export async function getCasasPorPessoa(ano) {
  const base = await carregarAno(ano)
  if (!base) return null
  const grupos = { consultores: new Map(), mecanicos: new Map(), vendedores: new Map() }
  const add = (mapa, nome, casa) => { if (!mapa.has(nome)) mapa.set(nome, new Set()); mapa.get(nome).add(casa) }
  for (const r of base.regs) {
    if (!r.func || !r.empresa.includes('TRUCKS')) continue
    const chave = CASAS_PESSOA.find(c => r.empresa.includes(c))
    if (!chave) continue
    const nome = r.func.replace(/\s+/g, ' ')
    if (r.slot === 'prodServicos') add(grupos.mecanicos, nome, CASA_NOME[chave])
    else if (r.setorOficina) add(grupos.consultores, nome, CASA_NOME[chave])
    if (r.balcao && r.slot !== 'prodServicos') add(grupos.vendedores, nome, CASA_NOME[chave])
  }
  return Object.fromEntries(Object.entries(grupos).map(([g, m]) => [g, Object.fromEntries([...m].map(([n, s]) => [n, [...s]]))]))
}
