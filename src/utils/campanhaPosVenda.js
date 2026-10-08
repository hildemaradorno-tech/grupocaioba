// Motor de apuração da Campanha de Bônus do Pós-Venda.
// Regulamento: documentosregrascampanhas/DAF Caiobá Trucks Regulamento Campanha 2026.07.docx
// Modelo de apuração recriado a partir das planilhas de agosto/2026 da mesma pasta
// (CampoGrande, Douradosagosto, TrêsLagoasAgosto, ChapadaodoSulAgosto, GerenteGeral).
//
// Separação: CAMPANHA (regras/parâmetros) × lançamentos (dados digitados por semana) ×
// apurar() (cálculo puro, sem estado). Os dados ainda ficam só em memória na tela;
// quando virar tabela no Supabase, só a origem de CAMPANHA/lançamentos muda.


import { computeWeekSchema } from './kpiPeriods'

// Regras valem para qualquer mês/ano selecionado na tela (mês e pagamento vêm do seletor).
export const CAMPANHA = {
  // Semanas NÃO são fixas: montarSemanas() gera a partir do mês selecionado e do Calendário
  // de cada empresa (fato_calendario). A página injeta o resultado em cfg.semanas.
  semanas: [],
  faixas: [
    { min: 0.8, paga: 0.5, label: '80% a 89%' },
    { min: 0.9, paga: 0.75, label: '90% a 99%' },
    { min: 1.0, paga: 1.0, label: '100% a 109%' },
    { min: 1.1, paga: 1.2, label: '110% ou mais' },
  ],
  unidades: [
    { id: 'CG', nome: 'Campo Grande', empresaErp: 'CAMPO GRANDE', quadroMatriz: 'Gerente de Serviço - Campo Grande', pagaAbaixo100: true, empresaId: '6e140292-fb21-4ade-8d23-c66aa00890b6',
      metas: { serv: 0, pecas: 0, ticket: 0, mb: 0, prod: 0 },
      metasGG: { serv: 0, pecas: 0 } },
    { id: 'DOU', nome: 'Dourados', empresaErp: 'DOURADOS', quadroMatriz: 'Gerente Filial - Dourados', pagaAbaixo100: false, empresaId: '68c7177b-7023-42c4-9312-c632a6e977ef',
      metas: { serv: 0, pecas: 0, ticket: 0, mb: 0, prod: 0 },
      metasGG: { serv: 0, pecas: 0 } },
    { id: 'TL', nome: 'Três Lagoas', empresaErp: 'TRÊS LAGOAS', quadroMatriz: 'Gerente Filial - Três Lagoas', pagaAbaixo100: false, empresaId: '55c54058-758f-4c52-8ce4-a04e004423f8',
      metas: { serv: 0, pecas: 0, ticket: 0, mb: 0, prod: 0 },
      metasGG: { serv: 0, pecas: 0 } },
    { id: 'CS', nome: 'Chapadão do Sul', empresaErp: 'CHAPADÃO DO SUL', quadroMatriz: 'Gerente Filial - Chapadão do Sul', pagaAbaixo100: false, empresaId: '2f5bce5c-9039-4d0c-99f1-32f5f7d702a5',
      metas: { serv: 0, pecas: 0, ticket: 0, mb: 0, prod: 0 },
      metasGG: { serv: 0, pecas: 0 } },
  ],
  funcoes: {
    consultor: {
      nome: 'Consultor Técnico', ordem: 1, agrupamentoCargo: 'Consultores de Serviços', departamento: 'OFICINA (SERVIÇOS)',
      composicao: [['Faturamento (serv. + peças)', 0.5], ['Ticket médio', 0.1], ['Margem de peças', 0.4]],
      fonte: 'Por consultor: serviços, peças, ticket e Margem de peças da semana',
      alvo: { CG: 1500, DOU: 1350, TL: 1275, CS: 900 },
    },
    mecanico: {
      nome: 'Mecânico', ordem: 2,
      composicao: [['Produtividade individual', 1]],
      fonte: 'Por mecânico: produtividade e eficiência da semana',
      agrupamentoCargo: 'Mecânicos', departamento: 'OFICINA (SERVIÇOS)',
      alvo: { CG: 1300, DOU: 1170, TL: 1105, CS: 780 },
      travas: 'Mês zera com 1 retorno procedente, 2 atrasos ou eficiência do mês ≥ 120%',
    },
    box: {
      nome: 'Mecânico Box Express', ordem: 3,
      composicao: [['Valor fixo', 1]],
      fonte: 'Sem medição',
      alvo: { CG: 600 },
      travas: 'Mês zera com 1 retorno procedente ou 2 atrasos',
    },
    chefe: {
      nome: 'Chefe de Oficina', ordem: 4,
      composicao: [['Produtividade geral', 0.6], ['Faturamento de serviços', 0.4]],
      agrupamentoCargo: 'Gerentes', departamento: null,
      fonte: 'Produtividade geral da unidade + soma dos serviços dos consultores',
      valores: { 0.5: 1000, 0.75: 1000, 1: 1200, 1.2: 1500 },
      travas: 'Mês zera com índice de retorno da unidade > 2%',
    },
    prog: {
      nome: 'Programação / Apontamento', ordem: 5,
      composicao: [['Conformidade de apontamento (mín. 95%)', 0.7], ['Suporte à produtividade', 0.3]],
      fonte: 'Conformidade e falhas críticas da semana + produtividade geral',
      alvo: { CG: 800, DOU: 600 },
      travas: 'Falhas na semana: 1 bloqueia supermeta · 2 descem uma faixa · 3+ zeram a semana',
    },
    gerente: {
      nome: 'Gerente de Pós-Venda', ordem: 6,
      composicao: [['Faturamento total', 0.5], ['Produtividade geral', 0.3], ['Margem de peças da unidade', 0.2]],
      agrupamentoCargo: ['Gerentes', 'Gerente Geral'], departamento: null,
      fonte: 'Soma dos consultores + produtividade geral + Margem de peças da unidade',
      alvo: { CG: 2000, DOU: 2000, TL: 2000, CS: 1500 },
      travas: 'Mês zera com índice de retorno da unidade > 2%',
    },
  },
  gerenteGeral: {
    nome: 'Gerente Geral de Pós-Venda',
    valores: { CG: { 0.5: 1500, 0.75: 1500, 1: 2000, 1.2: 2500 }, outras: { 0.5: 500, 0.75: 500, 1: 1000, 1.2: 1000 } },
  },
  participantes: [
    { id: 'cg-juliana', nome: 'Juliana Nunes de Almeida', unidade: 'CG', funcao: 'consultor', share: 0.5 },
    { id: 'cg-miguel', nome: 'Miguel Angelo dos Santos', unidade: 'CG', funcao: 'consultor', share: 0.5 },
    { id: 'cg-ana', nome: 'Ana Carla Quinot Stapazzoli', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-cesar', nome: 'César Oliveira Neres', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-jean', nome: 'Jean Marcos Paes Pereira', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-matheus', nome: 'Matheus Henrique Pardo Costa', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-roberto', nome: 'Roberto Larson da Silva', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-talyson', nome: 'Talyson de Almeida Rosa', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-wesley', nome: 'Wesley Silvestre da Silva', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-luiz', nome: 'Luiz Carlos Felippsen da Silva', unidade: 'CG', funcao: 'mecanico' },
    { id: 'cg-paulo', nome: 'Paulo', unidade: 'CG', funcao: 'box' },
    { id: 'cg-idmar', nome: 'Idmar dos Santos Rocha', unidade: 'CG', funcao: 'chefe' },
    { id: 'cg-gerente', nome: 'Gerente Campo Grande', unidade: 'CG', funcao: 'gerente' },

    { id: 'dou-william', nome: 'Willian Chaves Anibal', unidade: 'DOU', funcao: 'consultor', share: 0.6 },
    { id: 'dou-kaique', nome: 'Kaique Lins Batista', unidade: 'DOU', funcao: 'consultor', share: 0.4 },
    { id: 'dou-pedro', nome: 'Pedro Tiago Figueiredo da Cunha', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-nathan', nome: 'Nathan Henrique Vilhalva', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-yan', nome: 'Yan Ferreira Braga', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-evandro', nome: 'Evandro da Silva Dias Pinheiro', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-fernando', nome: 'Fernando Henrique Guimaraes Silva', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-thiago', nome: 'Thiago Neres Ramires', unidade: 'DOU', funcao: 'mecanico' },
    { id: 'dou-danilo', nome: 'Danilo', unidade: 'DOU', funcao: 'chefe' },
    { id: 'dou-geovana', nome: 'Geovana', unidade: 'DOU', funcao: 'prog' },
    { id: 'dou-joao', nome: 'Joao Francisco de Freitas', unidade: 'DOU', funcao: 'gerente' },

    { id: 'tl-consultor', nome: 'Consultor Três Lagoas', unidade: 'TL', funcao: 'consultor', share: 1 },
    { id: 'tl-geovam', nome: 'Geovam Augusto da Silva', unidade: 'TL', funcao: 'mecanico' },
    { id: 'tl-willian-mec', nome: 'Willian de Souza Plaza', unidade: 'TL', funcao: 'mecanico' },
    { id: 'tl-willian', nome: 'Willian Plaza', unidade: 'TL', funcao: 'chefe' },
    { id: 'tl-elias', nome: 'Elias Vaz Aguero', unidade: 'TL', funcao: 'gerente' },

    { id: 'cs-lucas', nome: 'Lucas Rezende de Oliveira', unidade: 'CS', funcao: 'consultor', share: 1 },
    { id: 'cs-lucas-mec', nome: 'Lucas', unidade: 'CS', funcao: 'mecanico' },
    { id: 'cs-fabiano', nome: 'Fabiano Nascimento', unidade: 'CS', funcao: 'gerente' },
  ],
}

// Dias úteis da semana/mês POR UNIDADE (cada empresa tem seu calendário e feriados).
export const pesoSemana = (s, uid) => s.pesos?.[uid] ?? 0
export const pesoTotal = (cfg, uid) => cfg.semanas.reduce((acc, s) => acc + pesoSemana(s, uid), 0)
export const unidadeById = (id, cfg = CAMPANHA) => cfg.unidades.find((u) => u.id === id)

export function faixa(at, cfg = CAMPANHA) {
  let paga = 0
  for (const f of cfg.faixas) if (at >= f.min) paga = f.paga
  return paga
}
const TIERS = [0, 0.5, 0.75, 1, 1.2]
// Meta zerada/ausente = atingimento 0 (nunca Infinity/NaN pagando faixa).
const div = (a, b) => (b ? a / b : 0)
const n = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0)

function fatConsultores(cfg, lanc, uid, semId) {
  let serv = 0, pecas = 0
  for (const p of cfg.participantes) {
    if (p.unidade !== uid || p.funcao !== 'consultor') continue
    const l = lanc.pessoas[p.id]?.[semId] || {}
    serv += n(l.serv); pecas += n(l.pecas)
  }
  return { serv, pecas, total: serv + pecas }
}

// Resultado de UMA pessoa: semanas[] com { at, tier, valor, nota, detalhe }, travas[], total.
function apurarPessoa(cfg, lanc, p) {
  const u = unidadeById(p.unidade, cfg)
  const fn = cfg.funcoes[p.funcao]
  const nSem = cfg.semanas.length
  const pt = pesoTotal(cfg, p.unidade)
  const L = lanc.pessoas[p.id] || {}
  const LU = lanc.unidades[p.unidade] || {}
  const mes = L.MES || {}
  const indice = n(LU.MES?.indice)
  const elig = (tier) => (!u.pagaAbaixo100 && tier < 1 ? 0 : tier)
  const alvo = fn.alvo?.[p.unidade] || 0
  const travas = [], alertas = []

  const semanas = cfg.semanas.map((s) => {
    const l = L[s.id] || {}
    const lu = LU[s.id] || {}
    const fr = div(pesoSemana(s, p.unidade), pt)
    const r = (at, detalhe, nota = '') => {
      const raw = faixa(at, cfg), tier = elig(raw)
      return { at, tier, valor: alvo / nSem * tier, detalhe, nota: raw !== tier ? 'Faixa não paga nesta unidade' : nota }
    }

    switch (p.funcao) {
      case 'consultor': {
        const metaFat = (u.metas.serv + u.metas.pecas) * (p.share ?? 1) * fr
        const aF = div(n(l.serv) + n(l.pecas), metaFat)
        const aT = div(n(l.ticket), u.metas.ticket)
        const aM = div(n(l.mb), u.metas.mb)
        return r(0.5 * aF + 0.1 * aT + 0.4 * aM, `Fat ${pctTxt(aF)} · Ticket ${pctTxt(aT)} · Margem ${pctTxt(aM)}`)
      }
      case 'mecanico': {
        if (l.ferias) return { at: null, tier: 0, valor: 0, ferias: true, nota: 'Férias', detalhe: '' }
        if (n(l.efic) >= 1.2) alertas.push(`${s.id}: eficiência ${pctTxt(l.efic)}`)
        return r(div(n(l.prod), u.metas.prod), `Prod ${pctTxt(n(l.prod))} · Efic ${l.efic == null ? '—' : pctTxt(l.efic)}`)
      }
      case 'box':
        return { at: null, tier: 1, valor: alvo / nSem, nota: 'Valor fixo', detalhe: '' }
      case 'chefe': {
        const serv = fatConsultores(cfg, lanc, p.unidade, s.id).serv
        const aP = div(n(lu.prod), u.metas.prod)
        const aS = div(serv, u.metas.serv * fr)
        const at = 0.6 * aP + 0.4 * aS
        const raw = faixa(at, cfg), tier = elig(raw)
        return { at, tier, valor: tier ? fn.valores[tier] / nSem : 0, detalhe: `Prod ${pctTxt(aP)} · Serv ${pctTxt(aS)}`,
          nota: raw !== tier ? 'Faixa 80 não paga nesta unidade' : '' }
      }
      case 'prog': {
        const conf = lu.conf ?? 1, falhas = n(lu.falhas)
        const aP = div(n(lu.prod), u.metas.prod)
        const at = 0.7 * conf + 0.3 * aP
        const detalhe = `Conf ${pctTxt(conf)} · Prod ${pctTxt(aP)}`
        if (conf < 0.95) return { at, tier: 0, valor: 0, detalhe, nota: 'Conformidade < 95%' }
        let tier = faixa(at, cfg), nota = ''
        if (falhas === 1 && tier > 1) { tier = 1; nota = '1 falha: sem supermeta' }
        else if (falhas === 2) { tier = TIERS[Math.max(0, TIERS.indexOf(tier) - 1)]; nota = '2 falhas: −1 faixa' }
        else if (falhas >= 3) { tier = 0; nota = `${falhas} falhas: semana zerada` }
        const t2 = elig(tier)
        return { at, tier: t2, valor: alvo / nSem * t2, detalhe, nota: t2 !== tier ? 'Faixa não paga nesta unidade' : nota }
      }
      case 'gerente': {
        const fat = fatConsultores(cfg, lanc, p.unidade, s.id).total
        const aF = div(fat, (u.metas.serv + u.metas.pecas) * fr)
        const aP = div(n(lu.prod), u.metas.prod)
        const aM = div(n(lu.mb), u.metas.mb)
        return r(0.5 * aF + 0.3 * aP + 0.2 * aM, `Fat ${pctTxt(aF)} · Prod ${pctTxt(aP)} · Margem ${pctTxt(aM)}`)
      }
      default:
        return { at: null, tier: 0, valor: 0, detalhe: '' }
    }
  })

  if (p.funcao === 'mecanico') {
    if (n(mes.retornos) >= 1) travas.push(`${mes.retornos} retorno procedente`)
    if (n(mes.atrasos) >= 2) travas.push(`${mes.atrasos} atrasos`)
    if (n(mes.efic) >= 1.2) travas.push(`eficiência do mês ${pctTxt(mes.efic)}`)
  }
  if (p.funcao === 'box') {
    if (n(mes.retornos) >= 1) travas.push(`${mes.retornos} retorno procedente`)
    if (n(mes.atrasos) >= 2) travas.push(`${mes.atrasos} atrasos`)
  }
  if ((p.funcao === 'chefe' || p.funcao === 'gerente') && indice > 0.02) travas.push(`índice de retorno ${pctTxt(indice)}`)

  const soma = semanas.reduce((s, w) => s + w.valor, 0)
  return { ...p, funcaoNome: fn.nome, ordem: fn.ordem, alvo, alvoTxt: fn.valores ? 'R$ 1.000 / 1.200 / 1.500' : null,
    semanas, travas, alertas, soma, total: travas.length ? 0 : soma }
}

export function apurarGerenteGeral(cfg, lanc) {
  const nSem = cfg.semanas.length
  return cfg.unidades.map((u) => {
    const tabela = u.id === 'CG' ? cfg.gerenteGeral.valores.CG : cfg.gerenteGeral.valores.outras
    const semanas = cfg.semanas.map((s) => {
      const ajuste = lanc.unidades[u.id]?.[s.id]?.ggFat
      const realizado = typeof ajuste === 'number' ? ajuste : fatConsultores(cfg, lanc, u.id, s.id).total
      const meta = (u.metasGG.serv + u.metasGG.pecas) * div(pesoSemana(s, u.id), pesoTotal(cfg, u.id))
      const at = div(realizado, meta), tier = faixa(at, cfg)
      return { at, tier, realizado, meta, ajustado: typeof ajuste === 'number', valor: tier ? tabela[tier] / nSem : 0 }
    })
    return { unidade: u, semanas, total: semanas.reduce((s, w) => s + w.valor, 0) }
  })
}

export function apurar(cfg, lanc) {
  const pessoas = cfg.participantes.map((p) => apurarPessoa(cfg, lanc, p))
    .sort((a, b) => a.ordem - b.ordem)
  return { pessoas, gg: apurarGerenteGeral(cfg, lanc) }
}

export function pctTxt(v) {
  return (n(v) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

// ======================================================================================
// Semanas do mês a partir do calendário
// ======================================================================================
const isoDia = (d) => d.getUTCDay() || 7 // 1 = segunda … 7 = domingo
function numeroSemanaISO(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  t.setUTCDate(t.getUTCDate() + 4 - isoDia(t)) // quinta-feira da mesma semana define o ano ISO
  const inicioAno = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t - inicioAno) / 86400000 + 1) / 7)
}
const iso = (d) => d.toISOString().slice(0, 10)
const ddmm = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
// Regra padrão só quando a empresa não tem calendário gerado: seg–sex 1, sábado 0,5, domingo 0.
const diaUtilPadrao = (d) => (isoDia(d) <= 5 ? 1 : isoDia(d) === 6 ? 0.5 : 0)

/**
 * Semanas do mês iguais às da Matriz KPIs (src/utils/kpiPeriods.js → computeWeekSchema): a semana 1
 * vai do dia 1 até o primeiro sábado; as demais vão de domingo a sábado (a última termina no fim
 * do mês). Semanas curtas NÃO são juntadas.
 * @param {number} ano
 * @param {number} mes 1–12
 * @param {Record<string, Array>} calendarios unidadeId -> linhas de fato_calendario do ano
 * @returns {{ semanas: Array, semCalendario: string[] }}
 */
export function montarSemanas(ano, mes, calendarios, cfg = CAMPANHA) {
  const dias = []
  const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  for (let d = 1; d <= ultimo; d++) dias.push(new Date(Date.UTC(ano, mes - 1, d)))

  // Mesma regra da Matriz KPIs: dia 1 → 1º sábado; depois domingo → sábado (ou fim do mês).
  const grupos = []
  let inicio = 1
  while (inicio <= ultimo) {
    const dow = new Date(Date.UTC(ano, mes - 1, inicio)).getUTCDay() // 0 = domingo … 6 = sábado
    const fim = Math.min(inicio + (6 - dow), ultimo)
    grupos.push({ numero: numeroSemanaISO(dias[inicio - 1]), dias: dias.slice(inicio - 1, fim) })
    inicio = fim + 1
  }

  // dias úteis por data, por unidade (calendário da empresa; sem calendário -> regra padrão)
  const semCalendario = []
  const diaUtil = {}
  for (const u of cfg.unidades) {
    const linhas = (calendarios?.[u.id] || []).filter((r) => Number(r.mes) === mes)
    if (!linhas.length) { semCalendario.push(u.id); continue }
    diaUtil[u.id] = Object.fromEntries(linhas.map((r) => [String(r.data).slice(0, 10), Number(r.dias_uteis || 0)]))
  }

  const semanas = grupos.map((g, i) => {
    const ini = g.dias[0], fim = g.dias[g.dias.length - 1]
    const pesos = Object.fromEntries(cfg.unidades.map((u) => [u.id,
      g.dias.reduce((acc, d) => acc + (diaUtil[u.id] ? (diaUtil[u.id][iso(d)] ?? 0) : diaUtilPadrao(d)), 0)]))
    return {
      id: `S${i + 1}`, numero: g.numero, inicio: iso(g.dias[0]), fim: iso(g.dias[g.dias.length - 1]),
      label: `${ddmm(ini)} a ${ddmm(fim)}`, pesos,
    }
  })
  return { semanas, semCalendario }
}

// ======================================================================================
// Contribuição semanal lida direto da Matriz KPIs (Bloco 3 - Serviços › quadro do consultor)
// — mesma linha "Total" da tabela: soma peso × atingimento dos indicadores com peso configurado
// (kpi_pesos), por semana. As semanas aqui são sempre as mesmas s01..s70 da Matriz (não as "Sem
// 1..5" locais do mês de montarSemanas) — use semanasMatrizDoMes para converter mês → lista de
// chaves, na mesma ordem (Sem 1 = primeira chave, Sem 2 = segunda, ...).
// ======================================================================================

// Chaves de semana da Matriz KPIs (s01..s70) do mês, na ordem (Sem 1, Sem 2, ...).
export function semanasMatrizDoMes(ano, mes) {
  const mKey = `m${String(mes).padStart(2, '0')}`
  return computeWeekSchema(Number(ano)).MONTH_WEEK_RANGES[mKey] || []
}

function calcAtingimentoMatriz(orientacao, meta, realizado) {
  if (realizado == null || meta == null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

// quadro = um item do array devolvido por fetchBloco3Servicos (ex.: tituloGerente === 'CONSULTOR
// DE SERVIÇOS'), já filtrado pela pessoa certa. sKey = uma chave 's42' etc. de semanasMatrizDoMes.
export function contribSemanaMatriz(quadro, sKey) {
  if (!quadro) return { contrib: null, itens: [] }
  const itens = []
  let soma = 0
  let temAlgum = false
  for (const kpi of quadro.kpis || []) {
    if (kpi.pesoObj == null) continue
    const d = kpi[sKey] || {}
    const atingimento = calcAtingimentoMatriz(kpi.orientacao, d.meta ?? null, d.realizado ?? null)
    itens.push({ indicador: kpi.indicador, peso: kpi.pesoObj, atingimento })
    if (atingimento != null) { soma += kpi.pesoObj * atingimento; temAlgum = true }
  }
  return { contrib: temAlgum ? soma : null, itens }
}

// ======================================================================================
// Metas aprovadas (Planejamento de Metas → fato_metas_publicadas)
// ======================================================================================
const normMeta = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const ehFunilaria = (setor) => /funilaria|pintura/i.test(setor || '')

/**
 * Metas aprovadas de UMA unidade no mês.
 * - Consultor: meta publicada é o faturamento total; peças × serviços saem da proporção da meta
 *   dos mecânicos do mesmo setor (Mecânica ou Funilaria/Pintura) — mesma referência que o
 *   planejamento usa pra calcular o % do consultor. Margem de peças e ticket médio (ticket_total =
 *   peças + serviços) = os aprovados no planejamento do consultor.
 * - Unidade: soma dos mecânicos publicados (Gerente Geral = todos; Oficina = sem Funilaria).
 * @returns {{ consultores: Array, unidade: object, aprovadoEm: string|null, aprovadoPor: string|null }}
 */
export function metasAprovadasDaUnidade(metasAprovadas, empresaId) {
  const pub = (metasAprovadas?.publicadas || []).filter((r) => r.empresa_id === empresaId)
  const rasc = (metasAprovadas?.rascunhoConsultor || []).filter((r) => r.empresa_id === empresaId)
  const mecs = pub.filter((r) => r.tipo === 'mecanico')

  const soma = (linhas) => linhas.reduce((a, r) => {
    const fat = Number(r.meta_faturamento) || 0
    const serv = r.meta_servicos != null ? Number(r.meta_servicos) || 0 : 0
    return { fat: a.fat + fat, serv: a.serv + serv, pecas: a.pecas + (fat - serv) }
  }, { fat: 0, serv: 0, pecas: 0 })
  const total = soma(mecs)
  const oficina = soma(mecs.filter((r) => !ehFunilaria(r.setor_nome) && !/funilaria/i.test(r.colaborador_nome || '')))
  const funilaria = soma(mecs.filter((r) => ehFunilaria(r.setor_nome) || /funilaria/i.test(r.colaborador_nome || '')))
  const proporcaoServ = (setor) => {
    const ref = ehFunilaria(setor) ? funilaria : oficina
    const base = ref.fat ? ref : total
    return base.fat ? base.serv / base.fat : 0
  }

  const consultores = pub.filter((r) => r.tipo === 'consultor').map((r) => {
    const planejamento = rasc.find((x) => normMeta(x.colaborador_nome) === normMeta(r.colaborador_nome))
    const aprovado = planejamento && planejamento.meta_aprovada != null
      && Math.abs((Number(planejamento.meta_faturamento) || 0) - Number(planejamento.meta_aprovada)) <= 0.001
    const setor = planejamento?.setor_nome || r.setor_nome
    const fat = Number(r.meta_faturamento) || 0
    const serv = r.meta_servicos != null ? Number(r.meta_servicos) : fat * proporcaoServ(setor)
    return {
      funcionarioId: r.colaborador_id,
      nome: r.colaborador_nome,
      nomeNorm: normMeta(r.colaborador_nome),
      setor,
      percentual: planejamento?.percentual != null ? Number(planejamento.percentual) / 100 : null,
      fat, serv, pecas: fat - serv,
      mb: aprovado && planejamento.margem_pecas_pct != null && planejamento.margem_pecas_pct !== '' ? Number(planejamento.margem_pecas_pct) / 100 : null,
      ticket: aprovado && planejamento.ticket_total != null ? Number(planejamento.ticket_total) : null,
    }
  }).sort((a, b) => a.nome.localeCompare(b.nome))

  const ultima = pub.reduce((m, r) => (r.aprovado_em && (!m || r.aprovado_em > m.aprovado_em) ? r : m), null)
  return {
    consultores,
    unidade: { gg: total, oficina, funilaria },
    aprovadoEm: ultima?.aprovado_em || null,
    aprovadoPor: ultima?.aprovado_por_nome || null,
  }
}

// Meta aprovada do consultor (por id do funcionário; senão pelo nome).
export function metaDoConsultor(metasUnidade, funcionario) {
  return metasUnidade.consultores.find((m) => m.funcionarioId && m.funcionarioId === funcionario.id)
    || metasUnidade.consultores.find((m) => m.nomeNorm === normMeta(funcionario.nomeErp || funcionario.nome))
    || null
}

// ======================================================================================
// Regras editáveis (aba Regras) — valores do regulamento como padrão
// ======================================================================================
// Salvas por mês em fato_campanha_regras; um mês sem regras salvas usa as do último mês salvo
// antes dele e, se não houver nenhum, este padrão. Tudo em fração (0.5 = 50%).
export const FAIXAS_IDS = ['f80', 'f90', 'f100', 'f110']
export const REGRAS_PADRAO = {
  // 'semanal' = Regulamento da Campanha (jul/2026): cada semana paga sua parcela.
  // 'trimestral' = Programa Rumo à Alta Performance (4º tri/2026): acompanha semana/mês e paga só no
  //   fechamento do trimestre, aplicando a faixa do trimestre sobre o bônus de cada mês.
  modelo: 'semanal',
  programa: 'Regulamento da Campanha de Bônus — Pós-Venda (julho/2026)',
  // Avaliação por blocos da Matriz KPIs (aba Resultados, vertical Pós-Vendas):
  // Bloco 1 = Companhia, Bloco 2 = Departamento (Pós-Vendas), Bloco 3 = Individual (a função).
  pesosBlocos: { companhia: 0.2, departamento: 0.3, individual: 0.5 },
  semanaMinSegSex: 3,
  faixas: [
    { id: 'f80', min: 0.8, paga: 0.5 },
    { id: 'f90', min: 0.9, paga: 0.75 },
    { id: 'f100', min: 1.0, paga: 1.0 },
    { id: 'f110', min: 1.1, paga: 1.2 },
  ],
  // Regulamento item 7: CG paga 80%, 100% e 120%; demais só 100% e 120%. A faixa 90–99% não
  // aparece para CG no item 7 — está marcada como paga (ver pontos a confirmar).
  faixasPorUnidade: {
    CG: { f80: true, f90: true, f100: true, f110: true },
    DOU: { f80: false, f90: false, f100: true, f110: true },
    TL: { f80: false, f90: false, f100: true, f110: true },
    CS: { f80: false, f90: false, f100: true, f110: true },
  },
  funcoes: {
    consultor: {
      pesos: { faturamento: 0.5, ticket: 0.1, margem: 0.4 },
      alvo: { CG: 1500, DOU: 1350, TL: 1275, CS: 900 },
      margemMinimaPecas: 0.3,
    },
    mecanico: {
      alvo: { CG: 1300, DOU: 1170, TL: 1105, CS: 780 },
      // Metas da aba Regras (regulamento item 8.2): produtividade por unidade; eficiência abaixo de 120%.
      metaProdutividade: { CG: 0.6, DOU: 0.58, TL: 0.55, CS: 0.4 },
      travas: { retornos: 1, atrasos: 2, eficienciaMax: 1.2 },
      // Cargos do agrupamento que entram como Mecânico. null = cargos que começam com MECÂNICO.
      cargos: null,
    },
    box: {
      alvo: { CG: 600, DOU: 0, TL: 0, CS: 0 },
      travas: { retornos: 1, atrasos: 2 },
    },
    chefe: {
      pesos: { produtividade: 0.6, servicos: 0.4 },
      participa: { CG: true, DOU: true, TL: true, CS: false },
      valores: { f80: 1000, f90: 1000, f100: 1200, f110: 1500 },
      // Meta de produtividade geral da oficina (regulamento item 8.4); a meta de serviços vem do planejamento.
      metaProdutividade: { CG: 0.6, DOU: 0.58, TL: 0.55, CS: 0.4 },
      // Produtividade geral = horas vendidas (ou aplicadas) ÷ horas disponíveis dos mecânicos da campanha.
      baseProdutividade: 'vendidas',
      // Cargos (do agrupamento Gerentes) que fazem o papel de Chefe em cada unidade.
      cargos: { CG: ['CHEFE DE OFICINA'], DOU: ['GERENTE TECNICO'], TL: ['CHEFE DE OFICINA'], CS: [] },
    },
    prog: {
      pesos: { conformidade: 0.7, produtividade: 0.3 },
      alvo: { CG: 800, DOU: 600, TL: 0, CS: 0 },
      conformidadeMinima: 0.95,
      falhas: { bloqueiaSupermeta: 1, desceFaixa: 2, zeraSemana: 3 },
    },
    gerente: {
      pesos: { faturamento: 0.5, produtividade: 0.3, margem: 0.2 },
      alvo: { CG: 2000, DOU: 2000, TL: 2000, CS: 1500 },
      // Metas da aba Regras (regulamento 8.6 + planilhas: produtividade da unidade e margem de peças 30%).
      // A meta de faturamento vem do Planejamento de Metas aprovado (Oficina).
      metaProdutividade: { CG: 0.6, DOU: 0.58, TL: 0.55, CS: 0.4 },
      metaMargem: { CG: 0.3, DOU: 0.3, TL: 0.3, CS: 0.3 },
      // Cargos que fazem o papel de Gerente de Pós-Venda em cada unidade.
      cargos: { CG: ['GERENTE DE POS VENDAS'], DOU: ['GERENTE DE FILIAL - TRUCKS DOURADOS'], TL: ['GERENTE DE FILIAL - TRUCKS TRES LAGOAS'], CS: ['GERENTE DE FILIAL'] },
    },
    gerenteGeral: {
      // Quem participa: ativos do agrupamento 'Gerente Geral' das empresas Trucks nestes cargos.
      agrupamento: 'Gerente Geral',
      cargos: ['GERENTE GERAL DE POS-VENDAS'],
      valores: {
        CG: { f80: 1500, f90: 1500, f100: 2000, f110: 2500 },
        DOU: { f80: 500, f90: 500, f100: 1000, f110: 1000 },
        TL: { f80: 500, f90: 500, f100: 1000, f110: 1000 },
        CS: { f80: 500, f90: 500, f100: 1000, f110: 1000 },
      },
    },
  },
  indiceRetornoMax: 0.02, // Chefe de Oficina e Gerente de Pós-Venda
}

// Mescla profunda: o que foi salvo sobrescreve o padrão; campos novos do padrão continuam valendo.
export function mesclarRegras(padrao, salvo) {
  if (Array.isArray(padrao)) return Array.isArray(salvo) ? salvo : padrao
  if (padrao && typeof padrao === 'object') {
    const out = { ...padrao }
    for (const k of Object.keys(salvo || {})) out[k] = mesclarRegras(padrao[k], salvo[k])
    return out
  }
  return salvo === undefined ? padrao : salvo
}

/**
 * Faixa atingida e % pago na unidade. Pega a maior faixa cujo mínimo foi alcançado; se essa
 * faixa não é paga na unidade, a semana não paga (regulamento item 7: "sem pagamento em 80%").
 * @returns {{ faixa: object|null, paga: number }}
 */
// Faixas de uma aba (empresa ou 'TRUCKS'): as próprias, salvas na aba Regras; senão as gerais.
export const faixasDe = (regras, chave) => regras.faixasUnidade?.[chave] || regras.faixas

export function faixaDaUnidade(at, regras, unidadeId) {
  if (at == null || isNaN(at)) return { faixa: null, paga: 0 }
  let faixa = null
  for (const f of [...faixasDe(regras, unidadeId)].sort((a, b) => a.min - b.min)) if (at >= f.min) faixa = f
  if (!faixa) return { faixa: null, paga: 0 }
  const pagaNaUnidade = regras.faixasPorUnidade?.[unidadeId]?.[faixa.id] !== false
  return { faixa, paga: pagaNaUnidade ? faixa.paga : 0 }
}

// Pontos em que o regulamento é ambíguo e a leitura adotada (ajustáveis na aba Regras).
export const PONTOS_A_CONFIRMAR = [
  ['Faixa 90–99% em Campo Grande', 'O item 7 lista para CG só 80%, 100% e 120%. A faixa de 90–99% (75%) está marcada como paga em CG. Para não pagar, desmarque em Faixas de pagamento.'],
  ['Gerente Geral fora de CG', 'O regulamento diz "50% (R$ 500,00) | 100% (R$ 1.000,00)". Foi lido como: a partir de 80% de atingimento paga R$ 500,00 e a partir de 100% paga R$ 1.000,00, sem supermeta.'],
  ['Margem de peças: mínimo × meta', 'O regulamento fala em "margem mínima de peças 30%"; o planejamento aprovou meta de margem de 40%. Aqui: a meta (40%) entra no cálculo do atingimento e os 30% são um piso — semana com margem abaixo do piso não paga.'],
  ['Eficiência ≥ 120% do mecânico', 'Usa a eficiência do MÊS (horas vendidas ÷ horas aplicadas). Semanas acima de 120% aparecem só como alerta.'],
  ['Produtividade do mecânico', 'Horas vendidas ÷ horas disponíveis (como nas planilhas de apuração). A Matriz KPIs usa horas aplicadas ÷ disponíveis.'],
  ['Produtividade geral (Chefe de Oficina)', 'A planilha de agosto mistura critérios: a semana 1 bate com horas vendidas ÷ disponíveis e as semanas 2 e 4 com horas aplicadas ÷ disponíveis. O padrão é vendidas ÷ disponíveis (igual ao Mecânico); dá para trocar na regra do Chefe.'],
  ['Valores fixos por faixa (Chefe e Gerente Geral)', 'São valores do mês inteiro; cada semana paga o valor da faixa ÷ nº de semanas.'],
  ['Supermeta', 'O atingimento composto não tem teto por indicador; a supermeta (110% ou mais) paga 120% do bônus da semana.'],
]


// ======================================================================================
// Programa Rumo à Alta Performance — 4º trimestre/2026 (documentosexemplos/REDE DE CONCESSIONÁRIAS…)
// ======================================================================================
// Mesmas funções, pesos, metas e bônus-alvo (cláusula 4ª: 'sem alteração'); muda a forma de pagar:
// bônus do mês (X) = valor-alvo integral, só registrado; no fechamento do trimestre a faixa do
// atingimento trimestral é aplicada sobre a soma dos X. Condições de pagamento (cláusula 5ª) valem
// para o trimestre inteiro — qualquer uma descumprida perde o prêmio do trimestre.
export const REGRAS_TRIMESTRAL_4T_2026 = mesclarRegras(REGRAS_PADRAO, {
  modelo: 'trimestral',
  programa: 'Programa Rumo à Alta Performance — 4º trimestre/2026',
  trimestre: { ano: 2026, meses: [10, 11, 12], pagamento: '2027-01-05' },
  // Régua do trimestre (cláusula 2ª): 80–90% → 50%; 90,01–99,99% → 75%; 100–105% → 100%; acima de 105% → 120%.
  faixas: [
    { id: 'f80', min: 0.8, paga: 0.5 },
    { id: 'f90', min: 0.9001, paga: 0.75 },
    { id: 'f100', min: 1.0, paga: 1.0 },
    { id: 'f110', min: 1.0501, paga: 1.2 },
  ],
  // O programa não restringe faixas por unidade.
  faixasPorUnidade: {
    CG: { f80: true, f90: true, f100: true, f110: true },
    DOU: { f80: true, f90: true, f100: true, f110: true },
    TL: { f80: true, f90: true, f100: true, f110: true },
    CS: { f80: true, f90: true, f100: true, f110: true },
  },
  // Atingimento do trimestre: do próprio colaborador ou consolidado da unidade (o exemplo da
  // cláusula 2ª fala na unidade; as metas são individuais — ver pontos a confirmar).
  baseTrimestre: 'colaborador',
  // Condições de pagamento do trimestre (cláusula 5ª).
  gates: {
    indiceRetornoMax: 0.02,
    margemMinimaPecas: 0.3,
    faltasMax: 1,
    atrasosMax: 3,
    semPenalidadeDisciplinar: true,
    satisfacaoAcimaDaMeta: true,
    semRetornoProcedente: true,
  },
})

// Pontos do programa trimestral em que o texto não é claro.
export const PONTOS_A_CONFIRMAR_TRIMESTRAL = [
  ['Atingimento do trimestre: colaborador ou unidade', 'A cláusula 2ª diz que vale o "percentual consolidado do trimestre" e o exemplo fala na unidade consolidar 100%, mas as metas são individuais. Padrão: atingimento do próprio colaborador. Dá para trocar para "unidade" na aba Regras.'],
  ['Limites das faixas', '"80,00% a 90,00%" inclui 90,00%; "90,01% a 99,99%" começa em 90,01%; "acima de 105,00%" começa em 105,01%. As faixas foram cadastradas assim.'],
  ['Bônus do mês (X)', 'É o bônus-alvo integral da função na unidade (ex.: R$ 1.500,00 do Consultor em CG). Não há pagamento semanal nem mensal; o mês só registra o X.'],
  ['Travas antigas do Mecânico', 'Retornos e atrasos passam a ser condições do trimestre (cláusula 5ª). A eficiência abaixo de 120% continua como meta do Mecânico (metas sem alteração).'],
  ['Satisfação e conduta', 'Nota da pesquisa acima da meta da filial e ausência de penalidade disciplinar não vêm de nenhum sistema: precisam ser informadas pela liderança no fechamento.'],
]

/**
 * Junta as metas aprovadas de vários meses (trimestre) de uma unidade, no mesmo formato de
 * metasAprovadasDaUnidade: valores em R$ somados; margem e ticket ponderados pelo faturamento.
 */
export function combinarMetasUnidade(lista) {
  const somaFat = (a, b) => ({ fat: a.fat + b.fat, serv: a.serv + b.serv, pecas: a.pecas + b.pecas })
  const zero = { fat: 0, serv: 0, pecas: 0 }
  const porPessoa = new Map()
  let gg = zero, oficina = zero, funilaria = zero, aprovadoEm = null, aprovadoPor = null
  for (const m of lista) {
    gg = somaFat(gg, m.unidade.gg)
    oficina = somaFat(oficina, m.unidade.oficina)
    funilaria = somaFat(funilaria, m.unidade.funilaria)
    if (m.aprovadoEm && (!aprovadoEm || m.aprovadoEm > aprovadoEm)) { aprovadoEm = m.aprovadoEm; aprovadoPor = m.aprovadoPor }
    for (const c of m.consultores) {
      const k = c.funcionarioId || c.nomeNorm
      const a = porPessoa.get(k) || { ...c, fat: 0, serv: 0, pecas: 0, _mb: 0, _mbFat: 0, _tk: 0, _tkFat: 0 }
      a.fat += c.fat; a.serv += c.serv; a.pecas += c.pecas
      if (c.mb != null) { a._mb += c.mb * c.fat; a._mbFat += c.fat }
      if (c.ticket != null) { a._tk += c.ticket * c.fat; a._tkFat += c.fat }
      a.percentual = c.percentual ?? a.percentual
      porPessoa.set(k, a)
    }
  }
  const consultores = [...porPessoa.values()].map(({ _mb, _mbFat, _tk, _tkFat, ...c }) => ({
    ...c,
    mb: _mbFat ? _mb / _mbFat : null,
    ticket: _tkFat ? _tk / _tkFat : null,
  })).sort((a, b) => a.nome.localeCompare(b.nome))
  return { consultores, unidade: { gg, oficina, funilaria }, aprovadoEm, aprovadoPor }
}


// ======================================================================================
// Blocos 1 e 2 da Matriz KPIs (planilha de KPIs do SharePoint → kpi_cache_planilhas)
// ======================================================================================
// Só existem por trimestre (Q1–Q4) e ano. Atingimento do bloco = média dos indicadores
// (realizado ÷ meta; orientação '<' inverte) ponderada pelo peso de cada indicador.
export const trimestreDoMes = (mes) => `q${Math.ceil(Number(mes) / 3)}`
export function atingimentoBlocoMatriz(linhas, q, filtro = () => true) {
  let soma = 0, pesos = 0
  for (const r of linhas || []) {
    if (!filtro(r)) continue
    const peso = Number(r.peso ?? r.pesoObj) || 0
    const meta = Number(r[q]?.meta), real = Number(r[q]?.realizado)
    if (!peso || !meta || !real || isNaN(meta) || isNaN(real)) continue
    soma += peso * (r.orientacao === '<' ? meta / real : real / meta)
    pesos += peso
  }
  return pesos ? soma / pesos : null
}
