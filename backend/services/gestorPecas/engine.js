// Gestor de Peças 2.0 — motor de cálculo (funções puras sobre o dataset do dataProvider).
// Toda regra aqui tem o texto correspondente em src/pages/pecas/gestorPecasTextos.js — ao mudar um
// cálculo, atualizar o texto do ⓘ na mesma alteração (e vice-versa).

// Modelo unificado de classificação (Dealer.net — Caioba Trucks; MicroWork — Caioba Motos).
// Cada classificação responde a UMA pergunta; o de-para com as letras de cada sistema fica em `de_para`.
export const PARAMETROS_PADRAO = {
  // Curva de Venda (ABC): quanto o item vende? — % acumulado da base no período
  // Base de classificação (mesmas opções do MicroWork) — ver BASES_CURVA_VENDA
  abc_base: 'quantidade',
  abc_periodo_meses: 6,
  abc_corte_a: 70,
  abc_corte_b: 90,
  // Curva XYZ: onde está o dinheiro? — % acumulado do valor em estoque (custo médio × saldo atual)
  xyz_base: 'valor_estoque',    // 'valor_estoque' (custo médio × saldo) | 'custo_medio' (custo médio unitário)
  xyz_corte_x: 70,
  xyz_corte_y: 90,
  // Popularidade: em quantos meses vende (de 12)
  freq_alta_meses: 9,
  freq_media_meses: 4,
  // Regularidade: coeficiente de variação da venda mensal (12m) — usada na previsão/segurança
  reg_cv_estavel: 0.5,
  reg_cv_variavel: 1.0,
  // Mobilidade: meses desde a última saída (Rápido / Lento / Parado) e Curva D (obsoleto)
  mob_rapido_meses: 3,
  mob_lento_meses: 6,
  obsoleto_meses: 12,
  // Política de compra
  metodo_compra: 'dias',        // 'dias' (dias de estoque por célula ABC×XYZ) | 'estatistico'
  dias_estoque: { AX: 45, AY: 45, AZ: 45, BX: 40, BY: 40, BZ: 40, CX: 0, CY: 0, CZ: 0, CX_POP: 0, CY_POP: 0, CZ_POP: 0 },
  // Curva C "popular": itens C cuja Popularidade está nesta lista usam os dias CX_POP/CY_POP/CZ_POP
  // (0 = segue a regra da célula C normal). Valores definidos por Gestor na Configuração.
  c_popular_freq: ['F', 'M'],
  tempo_reposicao_dias: 15,     // lead time padrão quando nem o fornecedor nem o item têm um
  nivel_servico: { A: 0.98, B: 0.95, C: 0.90 },
  ciclo_revisao_dias: 15,       // método estatístico: intervalo entre compras
  cobertura_alvo_dias: 90,      // acima disto (e do estoque máximo) é excesso
  tendencia_queda: -0.5,        // -50% ao ano na tendência dos últimos 12m
  margem_minima: 0.15,
  variacao_custo_alerta: 0.15,
  dias_preco_desatualizado: 180,
  anomalia_compra_z: 3,
  lead_time_fornecedor: {},     // { [fornecedor]: dias } sobrepõe o lead time do cadastro
  // De-para das classificações dos sistemas de origem → classificação do Gestor (só conferência)
  de_para: [
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Venda', letra: 'A', descricao: 'Vende 70%', dimensao: 'Curva de Venda', classe: 'A' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Venda', letra: 'B', descricao: 'Vende entre 70% e 90%', dimensao: 'Curva de Venda', classe: 'B' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Venda', letra: 'C', descricao: 'Venda restante', dimensao: 'Curva de Venda', classe: 'C' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Estoque', letra: 'A', descricao: 'Itens que abrangem 70% do total', dimensao: 'XYZ', classe: 'X' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Estoque', letra: 'B', descricao: 'Itens que abrangem 70% a 90% do total', dimensao: 'XYZ', classe: 'Y' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Estoque', letra: 'C', descricao: 'Itens restantes', dimensao: 'XYZ', classe: 'Z' },
    { sistema: 'Dealer.net', empresa: 'Caioba Trucks', origem: 'Popularidade', letra: 'A1', descricao: '6 vendas / 6 meses - até 50,00 (conferir demais faixas)', dimensao: 'Popularidade', classe: 'F' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva ABC', letra: 'A', descricao: 'Quantidade de saída 6 meses — 70%', dimensao: 'Curva de Venda', classe: 'A' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva ABC', letra: 'B', descricao: 'Quantidade de saída 6 meses — 20%', dimensao: 'Curva de Venda', classe: 'B' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva ABC', letra: 'C', descricao: 'Quantidade de saída 6 meses — 10%', dimensao: 'Curva de Venda', classe: 'C' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva XYZ', letra: 'X', descricao: 'Custo médio contábil × saldo atual — 70%', dimensao: 'XYZ', classe: 'X' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva XYZ', letra: 'Y', descricao: 'Custo médio contábil × saldo atual — 20%', dimensao: 'XYZ', classe: 'Y' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva XYZ', letra: 'Z', descricao: 'Custo médio contábil × saldo atual — 10%', dimensao: 'XYZ', classe: 'Z' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Curva D', letra: 'D', descricao: 'Sem saída nos últimos 12 meses', dimensao: 'Mobilidade', classe: 'Obsoleto (D)' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Mobilidade', letra: 'A', descricao: 'Rápido: última saída até 3 meses', dimensao: 'Mobilidade', classe: 'Rápido' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Mobilidade', letra: 'B', descricao: 'Lento: 4 até 6 meses', dimensao: 'Mobilidade', classe: 'Lento' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Mobilidade', letra: 'C', descricao: 'Parado: mais de 6 meses', dimensao: 'Mobilidade', classe: 'Parado' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Frequência de vendas', letra: 'A', descricao: 'Frequência de vendas — curva A', dimensao: 'Popularidade', classe: 'F' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Frequência de vendas', letra: 'B', descricao: 'Frequência de vendas — curva B', dimensao: 'Popularidade', classe: 'M' },
    { sistema: 'MicroWork', empresa: 'Caioba Motos', origem: 'Frequência de vendas', letra: 'C', descricao: 'Frequência de vendas — curva C', dimensao: 'Popularidade', classe: 'R' },
  ],
}

// Cada Gestor (trucks = Dealer.net, motos = MicroWork) tem os próprios parâmetros; o de-para padrão
// traz só as classificações do sistema daquele segmento.
const EMPRESA_SEGMENTO = { trucks: 'Caioba Trucks', motos: 'Caioba Motos' }
// Trucks: Curva de Venda por VALOR (com dados reais, a quantidade fica distorcida por lubrificantes
// vendidos em litros e fixadores; é também a lógica do "Venda" do Dealer.net). Motos segue o MicroWork (quantidade).
const PADRAO_SEGMENTO = { trucks: { abc_base: 'qtd_valor_base_venda' }, motos: {} }
export function parametrosPadrao(segmento = 'trucks') {
  return { ...PARAMETROS_PADRAO, ...(PADRAO_SEGMENTO[segmento] || {}), de_para: PARAMETROS_PADRAO.de_para.filter(d => d.empresa === EMPRESA_SEGMENTO[segmento]) }
}

export function mesclarParametros(salvos, segmento = 'trucks') {
  const padrao = parametrosPadrao(segmento)
  const p = { ...padrao, ...(salvos || {}) }
  p.nivel_servico = { ...PARAMETROS_PADRAO.nivel_servico, ...(salvos?.nivel_servico || {}) }
  p.dias_estoque = { ...PARAMETROS_PADRAO.dias_estoque, ...(salvos?.dias_estoque || {}) }
  p.lead_time_fornecedor = { ...(salvos?.lead_time_fornecedor || {}) }
  p.de_para = Array.isArray(salvos?.de_para) ? salvos.de_para : padrao.de_para
  if (p.abc_base === 'valor') p.abc_base = 'qtd_valor_base_venda'
  if (!BASES_CURVA_VENDA.includes(p.abc_base)) p.abc_base = padrao.abc_base
  return p
}

// Base de classificação da Curva de Venda — mesmas opções do MicroWork. Cada uma soma, nos últimos
// N meses (abc_periodo_meses) das lojas filtradas:
//   quantidade                → qtd vendida
//   qtd_custo_aquisicao       → qtd × custo de aquisição atual (Dealer.net: ValorReposicao; sem ele, custo médio)
//   qtd_custo_medio           → qtd × custo médio atual do estoque
//   qtd_custo_medio_contabil  → custo registrado em cada venda (CMV: custo do mês × qtd do mês)
//   qtd_valor_base_venda      → qtd × preço público (valor base de venda)
//   meses_com_saida           → nº de meses do período com venda
export const BASES_CURVA_VENDA = ['quantidade', 'qtd_custo_aquisicao', 'qtd_custo_medio', 'qtd_custo_medio_contabil', 'qtd_valor_base_venda', 'meses_com_saida']

const DIAS_MES = 30.4
export const NOME_FREQ = { F: 'Alta', M: 'Média', R: 'Baixa' }
export const NOME_REG = { E: 'Estável', V: 'Variável', I: 'Irregular' }

export function mobilidade(diasSemVenda, p) {
  if (diasSemVenda == null || diasSemVenda >= p.obsoleto_meses * DIAS_MES) return 'Obsoleto (D)'
  if (diasSemVenda <= p.mob_rapido_meses * DIAS_MES) return 'Rápido'
  if (diasSemVenda <= p.mob_lento_meses * DIAS_MES) return 'Lento'
  return 'Parado'
}

// ── utilitários ──────────────────────────────────────────────────────────────
const DIA_MS = 86_400_000
const soma = (arr) => arr.reduce((a, b) => a + b, 0)
const media = (arr) => (arr.length ? soma(arr) / arr.length : 0)
const desvio = (arr) => {
  if (arr.length < 2) return 0
  const m = media(arr)
  return Math.sqrt(media(arr.map(x => (x - m) ** 2)))
}
const r2 = (v) => (v == null || !isFinite(v) ? v : Math.round(v * 100) / 100)
const r1 = (v) => (v == null || !isFinite(v) ? v : Math.round(v * 10) / 10)
const diasEntre = (isoA, dataB) => Math.floor((dataB - new Date(isoA + 'T00:00:00Z')) / DIA_MS)

// Inversa da normal padrão (Acklam) — z do nível de serviço
function invNormal(p) {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const pl = 0.02425
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  }
  if (p > 1 - pl) return -invNormal(1 - p)
  const q = p - 0.5, r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

// Tendência: inclinação da reta (mínimos quadrados) sobre a média, anualizada. -0,5 = queda de 50%/ano.
function tendenciaAnual(serie) {
  const n = serie.length, m = media(serie)
  if (n < 3 || m <= 0) return 0
  const xm = (n - 1) / 2
  let num = 0, den = 0
  serie.forEach((y, x) => { num += (x - xm) * (y - m); den += (x - xm) ** 2 })
  return (num / den) * 12 / m
}

// Croston (SES α=0,2) para demanda intermitente — devolve demanda média por mês
function croston(serie, alfa = 0.2) {
  let z = null, p = null, intervalo = 1
  for (const y of serie) {
    if (y > 0) {
      if (z == null) { z = y; p = intervalo }
      else { z = z + alfa * (y - z); p = p + alfa * (intervalo - p) }
      intervalo = 1
    } else intervalo++
  }
  return z == null ? 0 : z / p
}

// Média móvel ponderada (pesos 1..n) dos últimos n meses
function mediaPonderada(serie, n = 6) {
  const ult = serie.slice(-n)
  let num = 0, den = 0
  ult.forEach((y, i) => { num += y * (i + 1); den += i + 1 })
  return den ? num / den : 0
}

function arredondarLote(qtd, loteMinimo, multiplo) {
  if (qtd <= 0) return 0
  const mult = Math.max(1, multiplo || 1)
  return Math.max(loteMinimo || 1, Math.ceil(qtd / mult) * mult)
}

// ── Política de estoque: Curva de Venda × XYZ (dias de estoque por célula, como no MicroWork) ─
const FREQ_NOME = NOME_FREQ
export function politica(abc, xyz, freq, reg, p) {
  let nome, estocar, dias = null
  if (p.metodo_compra === 'estatistico') {
    estocar = !(freq === 'R' && reg === 'I' && abc !== 'A')
    if (!estocar) nome = 'Sob encomenda'
    else if (abc === 'A' && freq === 'F') nome = 'Reposição contínua'
    else if (freq === 'F' || (freq === 'M' && reg !== 'I')) nome = 'Reposição periódica'
    else nome = 'Estoque mínimo'
  } else {
    dias = Number(p.dias_estoque?.[abc + xyz]) || 0
    const cPopular = abc === 'C' && (p.c_popular_freq || []).includes(freq) && (Number(p.dias_estoque?.[`C${xyz}_POP`]) || 0) > 0
    if (cPopular) dias = Number(p.dias_estoque[`C${xyz}_POP`])
    estocar = dias > 0
    nome = estocar ? `${dias} dias de estoque${cPopular ? ' (C popular)' : ''}` : 'Sob encomenda'
  }
  const txtAbc = { A: 'Curva A de venda — prioridade máxima de disponibilidade', B: 'Curva B de venda — disponibilidade alta com controle de capital', C: 'Curva C de venda — minimizar capital parado' }[abc]
  const txtXyz = { X: 'X: concentra o capital em estoque — revisar quantidades com atenção', Y: 'Y: capital intermediário em estoque', Z: 'Z: pouco capital em estoque' }[xyz]
  const txtFreq = { F: 'vende quase todo mês', M: 'vende em parte dos meses', R: 'vende raramente — avaliar compra sob demanda' }[freq]
  return { politica: nome, estocar, dias_politica: dias, orientacao: `${txtAbc}; ${txtXyz}; ${txtFreq}.` }
}

// Classificação por % acumulado (Pareto): o item entra na faixa pela posição em que COMEÇA
function curvaAcumulada(itens, valorDe, corte1, corte2, letras) {
  const total = soma(itens.map(valorDe)) || 1
  const ordenados = [...itens].sort((a, b) => valorDe(b) - valorDe(a))
  let acum = 0
  for (const it of ordenados) {
    const v = valorDe(it)
    const antes = acum / total * 100
    acum += v
    it[`_part_${letras}`] = v / total * 100
    it[`_acum_${letras}`] = acum / total * 100
    it[`_classe_${letras}`] = v <= 0 ? letras[2] : antes < corte1 ? letras[0] : antes < corte2 ? letras[1] : letras[2]
  }
}

// ── Base: todas as métricas por item × loja (com cache) ──────────────────────
const _cacheBase = new Map()

/**
 * filtros: { lojas: [nomes permitidos] | null, loja, marca, grupo, fornecedor, abc, xyz, freq, situacao, busca }
 * A classificação (ABC/XYZ/Freq) é feita sobre o universo das lojas selecionadas (todas as marcas);
 * os demais filtros só recortam as linhas exibidas.
 */
export function calcularBase(ds, params, filtros = {}) {
  const lojasUniverso = (filtros.lojas || ds.lojas).filter(l => !filtros.loja || l === filtros.loja)
  const chave = JSON.stringify([ds.segmento, ds.gerado_em, lojasUniverso, params])
  if (_cacheBase.has(chave)) return _cacheBase.get(chave)

  const hoje = new Date(ds.data_base + 'T00:00:00Z')
  const lojaSet = new Set(lojasUniverso)
  const itemPorCodigo = new Map(ds.itens.map(i => [i.codigo, i]))
  const posicoes = ds.posicoes.filter(p => lojaSet.has(p.empresa_nome))
  const proximoMesCal = (Number(ds.meses[ds.meses.length - 1].slice(5, 7))) % 12 // 0..11 do próximo mês

  // Pendente por item×loja
  const pendente = new Map()
  for (const pd of ds.pedidos) {
    if (!lojaSet.has(pd.empresa_nome)) continue
    const k = pd.codigo + '|' + pd.empresa_nome
    pendente.set(k, (pendente.get(k) || 0) + Math.max(0, pd.qtd_pedida - pd.qtd_recebida))
  }

  // ── Nível item (classificação) ──
  const porItem = new Map()
  for (const p of posicoes) {
    let it = porItem.get(p.codigo)
    if (!it) { it = { codigo: p.codigo, vendas: new Array(ds.meses.length).fill(0), saldo: 0, valor_estoque: 0, lojas: 0, ultima_venda: null, ultima_entrada: null }; porItem.set(p.codigo, it) }
    p.vendas.forEach((q, i) => { it.vendas[i] += q })
    it.saldo += p.saldo
    it.valor_estoque += (p.saldo_fisico ?? p.saldo) * p.custo_medio
    it.lojas++
    if (p.ultima_venda && (!it.ultima_venda || p.ultima_venda > it.ultima_venda)) it.ultima_venda = p.ultima_venda
    if (p.ultima_entrada && (!it.ultima_entrada || p.ultima_entrada > it.ultima_entrada)) it.ultima_entrada = p.ultima_entrada
  }
  const itensAgg = [...porItem.values()].map(it => {
    const cad = itemPorCodigo.get(it.codigo)
    const ult12 = it.vendas.slice(-12)
    const qtd12 = soma(ult12)
    const m12 = qtd12 / 12
    const cv = m12 > 0 ? desvio(ult12) / m12 : null
    const mesesComVenda = ult12.filter(q => q > 0).length
    // Índice sazonal do próximo mês: média do mesmo mês nos 2 anos ÷ média geral, amortecido 50%
    const media24 = media(it.vendas)
    let sazonal = 1
    if (media24 > 0 && mesesComVenda >= params.freq_alta_meses) {
      const mesmos = it.vendas.filter((_, i) => (Number(ds.meses[i].slice(5, 7)) - 1) === proximoMesCal)
      const idx = media(mesmos) / media24
      sazonal = Math.min(1.8, Math.max(0.5, 1 + 0.5 * (idx - 1)))
    }
    const nP = params.abc_periodo_meses
    const qtdPeriodo = soma(it.vendas.slice(-nP))
    const hist = ds.precoCusto[it.codigo] || []
    const cmvPeriodo = it.vendas.slice(-nP).reduce((a, q, i) => a + q * (hist[it.vendas.length - nP + i]?.custo ?? cad.custo), 0)
    const mesesSaida = it.vendas.slice(-nP).filter(q => q > 0).length
    const baseVenda = {
      quantidade: qtdPeriodo,
      qtd_custo_aquisicao: qtdPeriodo * (cad.custo_aquisicao || cad.custo),
      qtd_custo_medio: qtdPeriodo * cad.custo,
      qtd_custo_medio_contabil: cmvPeriodo,
      qtd_valor_base_venda: qtdPeriodo * cad.preco,
      meses_com_saida: mesesSaida,
    }[params.abc_base] ?? qtdPeriodo
    // Nunca vendeu: conta a partir da última entrada (mesma regra da linha item × loja)
    const diasSemVendaItem = it.ultima_venda ? diasEntre(it.ultima_venda, hoje) : it.ultima_entrada ? diasEntre(it.ultima_entrada, hoje) : null
    return {
      ...cad,
      vendas: it.vendas,
      qtd12,
      fat12: qtd12 * cad.preco,
      qtd_periodo: qtdPeriodo,
      fat_periodo: qtdPeriodo * cad.preco,
      meses_saida_periodo: mesesSaida,
      base_venda: baseVenda,
      base_xyz: params.xyz_base === 'custo_medio' ? (it.saldo > 0 ? it.valor_estoque / it.saldo : cad.custo) : it.valor_estoque,
      mobilidade: mobilidade(diasSemVendaItem, params),
      cv,
      meses_com_venda: mesesComVenda,
      tendencia: tendenciaAnual(ult12),
      sazonal,
      saldo: it.saldo,
      valor_estoque: it.valor_estoque,
      lojas: it.lojas,
    }
  })

  // Curva de Venda (ABC): % acumulado da quantidade (ou valor) vendida no período
  curvaAcumulada(itensAgg, i => i.base_venda, params.abc_corte_a, params.abc_corte_b, 'ABC')
  // Curva XYZ: % acumulado do valor em estoque (custo médio × saldo) — ou do custo médio unitário
  curvaAcumulada(itensAgg, i => (i.saldo > 0 ? i.base_xyz : 0), params.xyz_corte_x, params.xyz_corte_y, 'XYZ')
  itensAgg.sort((a, b) => b.base_venda - a.base_venda)
  for (const it of itensAgg) {
    it.abc = it._classe_ABC
    it.part_fat = it._part_ABC          // % da base da Curva de Venda
    it.part_acum = it._acum_ABC
    it.xyz = it._classe_XYZ
    it.part_xyz = it._part_XYZ
    it.reg = it.cv == null ? 'I' : it.cv <= params.reg_cv_estavel ? 'E' : it.cv <= params.reg_cv_variavel ? 'V' : 'I'
    it.freq = it.meses_com_venda >= params.freq_alta_meses ? 'F' : it.meses_com_venda >= params.freq_media_meses ? 'M' : 'R'
    it.classe = `${it.abc}${it.xyz}${it.freq}`
    // Célula da matriz de compra: C com Popularidade na lista "C popular" vai para a linha própria (CX+ …)
    it.celula = it.abc === 'C' && (params.c_popular_freq || []).includes(it.freq) ? `C${it.xyz}+` : `${it.abc}${it.xyz}`
    for (const k of ['_classe_ABC', '_part_ABC', '_acum_ABC', '_classe_XYZ', '_part_XYZ', '_acum_XYZ']) delete it[k]
    Object.assign(it, politica(it.abc, it.xyz, it.freq, it.reg, params))
  }
  const classePorCodigo = new Map(itensAgg.map(i => [i.codigo, i]))

  // ── Nível item × loja ──
  const linhas = posicoes.map(p => {
    const it = classePorCodigo.get(p.codigo)
    const ult12 = p.vendas.slice(-12)
    const m12 = media(ult12)
    const sigma = desvio(ult12)
    const mesesComVenda = ult12.filter(q => q > 0).length
    const previsao = mesesComVenda <= 3 ? croston(p.vendas) : mediaPonderada(p.vendas) * it.sazonal
    const d = previsao / 30
    const lt = Number(params.lead_time_fornecedor[it.fornecedor]) || it.lead_time_dias || params.tempo_reposicao_dias
    let nivel = params.nivel_servico[it.abc] ?? 0.9
    if (it.freq === 'R') nivel = Math.max(0.8, nivel - 0.05)
    const z = invNormal(nivel)
    let es = z * sigma * Math.sqrt(lt / 30)
    let pp = d * lt + es
    // Dias por célula: compra para cobrir o lead time + os dias de estoque da célula ABC×XYZ
    let max = params.metodo_compra === 'estatistico' ? es + d * (lt + params.ciclo_revisao_dias) : Math.max(pp, d * (lt + (it.dias_politica || 0)))
    if (!it.estocar) { es = 0; pp = 0; max = 0 }
    const pend = pendente.get(p.codigo + '|' + p.empresa_nome) || 0
    const posicao = p.saldo + pend
    const precisa = it.estocar && d > 0 && posicao <= pp
    const necessidade = precisa ? arredondarLote(max - posicao, it.lote_minimo, it.multiplo) : 0
    const cobertura = d > 0 ? p.saldo / d : null
    const coberturaPedido = d > 0 ? posicao / d : null
    const comGiro = m12 > 0
    // Ruptura só para itens que a política manda estocar (zerado "sob encomenda" não é ruptura)
    const ruptura = p.saldo <= 0 && comGiro && it.estocar
    const rupturaProj = !ruptura && d > 0 && it.estocar && posicao / d < lt
    const diasSemVenda = p.ultima_venda ? diasEntre(p.ultima_venda, hoje) : 9999
    const diasDesdeEntrada = p.ultima_entrada ? diasEntre(p.ultima_entrada, hoje) : 9999
    const limiteExcesso = Math.max(max, d * params.cobertura_alvo_dias)
    const excessoQtd = p.saldo > 0 ? Math.max(0, Math.floor(p.saldo - limiteExcesso)) : 0
    const tend = tendenciaAnual(ult12)

    let situacao
    // Nunca vendeu: conta a partir da última entrada (item novo não nasce obsoleto)
    const mob = mobilidade(diasSemVenda < 9999 ? diasSemVenda : diasDesdeEntrada < 9999 ? diasDesdeEntrada : null, params)
    if (p.saldo > 0 && mob === 'Obsoleto (D)') situacao = 'Obsoleto'
    else if (p.saldo > 0 && (mob === 'Parado' || (tend <= params.tendencia_queda && comGiro && excessoQtd > 0))) situacao = 'Pré-obsoleto'
    else if (ruptura) situacao = 'Ruptura'
    else if (excessoQtd > 0) situacao = 'Excesso'
    else if (rupturaProj) situacao = 'Risco de ruptura'
    else if (p.saldo <= 0) situacao = 'Sem estoque'
    else situacao = 'Normal'

    // Valor usa o estoque físico (Dealer.net: Qtde); cobertura/compra usam o disponível (saldo)
    const valorEstoque = (p.saldo_fisico ?? p.saldo) * p.custo_medio
    return {
      codigo: p.codigo,
      descricao: it.descricao,
      grupo: it.grupo,
      marca: it.marca,
      fornecedor: it.fornecedor,
      empresa_nome: p.empresa_nome,
      abc: it.abc, xyz: it.xyz, freq: it.freq, reg: it.reg, mobilidade: mob, classe: it.classe, politica: it.politica, estocar: it.estocar,
      custo: it.custo, preco: it.preco, custo_medio: p.custo_medio,
      saldo: p.saldo,
      saldo_fisico: p.saldo_fisico ?? p.saldo,
      bloqueado: p.bloqueado || 0,
      localizacao: p.localizacao || '',
      dealer: p.dealer || null,
      valor_estoque: r2(valorEstoque),
      pendente: pend,
      vendas12: soma(ult12),
      media_mensal: r2(m12),
      desvio_mensal: r2(sigma),
      meses_com_venda: mesesComVenda,
      previsao_mes: r2(previsao),
      tendencia: r2(tend),
      lead_time: lt,
      nivel_servico: nivel,
      estoque_seguranca: r1(es),
      ponto_pedido: r1(pp),
      estoque_maximo: r1(max),
      necessidade,
      cobertura_dias: cobertura == null ? null : Math.round(cobertura),
      cobertura_com_pedido: coberturaPedido == null ? null : Math.round(coberturaPedido),
      ruptura,
      ruptura_projetada: rupturaProj,
      venda_perdida_mes: ruptura ? r2(previsao * it.preco) : 0,
      excesso_qtd: situacao === 'Obsoleto' ? 0 : excessoQtd,
      excesso_valor: situacao === 'Obsoleto' ? 0 : r2(excessoQtd * p.custo_medio),
      dias_sem_venda: diasSemVenda >= 9999 ? null : diasSemVenda,
      ultima_venda: p.ultima_venda,
      ultima_entrada: p.ultima_entrada,
      dias_desde_entrada: diasDesdeEntrada >= 9999 ? null : diasDesdeEntrada,
      faixa_aging: diasDesdeEntrada <= 90 ? '0-90' : diasDesdeEntrada <= 180 ? '91-180' : diasDesdeEntrada <= 365 ? '181-365' : '>365',
      giro_anual: valorEstoque > 0 ? r2(soma(ult12) * p.custo_medio / valorEstoque) : null,
      situacao,
      vendas_serie: p.vendas,
    }
  })

  // ── Realocação entre lojas: excesso/parado de uma loja cobre necessidade de outra ──
  const transferencias = []
  const porCodigo = new Map()
  for (const l of linhas) {
    if (!porCodigo.has(l.codigo)) porCodigo.set(l.codigo, [])
    porCodigo.get(l.codigo).push(l)
  }
  for (const grupoLinhas of porCodigo.values()) {
    if (grupoLinhas.length < 2) continue
    const receptoras = grupoLinhas.filter(l => l.necessidade > 0).sort((a, b) => (b.ruptura - a.ruptura) || (b.necessidade - a.necessidade))
    if (!receptoras.length) continue
    const doadoras = grupoLinhas
      .map(l => ({ l, disp: ['Excesso', 'Pré-obsoleto', 'Obsoleto'].includes(l.situacao) ? Math.floor(l.saldo - Math.max(0, l.estoque_maximo)) : 0 }))
      .filter(x => x.disp > 0)
      .sort((a, b) => b.disp - a.disp)
    for (const rec of receptoras) {
      let falta = rec.necessidade
      for (const doa of doadoras) {
        if (falta <= 0) break
        if (doa.disp <= 0 || doa.l.empresa_nome === rec.empresa_nome) continue
        const qtd = Math.min(doa.disp, falta)
        doa.disp -= qtd; falta -= qtd
        rec.transferencia_entrada = (rec.transferencia_entrada || 0) + qtd
        doa.l.transferencia_saida = (doa.l.transferencia_saida || 0) + qtd
        transferencias.push({
          codigo: rec.codigo, descricao: rec.descricao, grupo: rec.grupo, marca: rec.marca, abc: rec.abc,
          loja_origem: doa.l.empresa_nome, loja_destino: rec.empresa_nome,
          empresa_nome: rec.empresa_nome,
          qtd,
          custo_unitario: doa.l.custo_medio,
          valor: r2(qtd * doa.l.custo_medio),
          situacao_origem: doa.l.situacao,
          situacao_destino: rec.situacao,
          cobertura_destino: rec.cobertura_dias,
          motivo: rec.ruptura ? 'Destino em ruptura' : rec.ruptura_projetada ? 'Destino com risco de ruptura' : 'Destino abaixo do ponto de pedido',
        })
      }
    }
  }
  for (const l of linhas) {
    l.transferencia_entrada = l.transferencia_entrada || 0
    l.transferencia_saida = l.transferencia_saida || 0
    const resto = l.necessidade - l.transferencia_entrada
    l.sugestao_compra = resto > 0 ? arredondarLote(resto, classePorCodigo.get(l.codigo).lote_minimo, classePorCodigo.get(l.codigo).multiplo) : 0
    l.valor_sugestao = r2(l.sugestao_compra * l.custo)
  }

  const base = { ds, params, hoje, lojas: lojasUniverso, itens: itensAgg, classePorCodigo, linhas, transferencias }
  if (_cacheBase.size > 30) _cacheBase.clear()
  _cacheBase.set(chave, base)
  return base
}

// Recorte das linhas pelos filtros de exibição
export function filtrarLinhas(linhas, f = {}) {
  const busca = (f.busca || '').toLowerCase().trim()
  return linhas.filter(l =>
    (!f.marca || l.marca === f.marca) &&
    (!f.grupo || l.grupo === f.grupo) &&
    (!f.fornecedor || l.fornecedor === f.fornecedor) &&
    (!f.abc || l.abc === f.abc) &&
    (!f.xyz || l.xyz === f.xyz) &&
    (!f.freq || l.freq === f.freq) &&
    (!f.situacao || l.situacao === f.situacao) &&
    (!busca || l.codigo.includes(busca) || l.descricao.toLowerCase().includes(busca))
  )
}

const semSerie = ({ vendas_serie, vendas, ...resto }) => resto

// Linha enxuta para as telas com listas grandes (Estoque, Cobertura): só as colunas exibidas
const CAMPOS_ENXUTOS = ['codigo', 'descricao', 'grupo', 'marca', 'empresa_nome', 'abc', 'xyz', 'freq', 'reg', 'mobilidade', 'classe', 'saldo', 'pendente', 'custo_medio', 'valor_estoque',
  'previsao_mes', 'cobertura_dias', 'cobertura_com_pedido', 'lead_time', 'ruptura', 'ruptura_projetada', 'venda_perdida_mes',
  'transferencia_entrada', 'giro_anual', 'faixa_aging', 'situacao']
const enxuta = (l) => Object.fromEntries(CAMPOS_ENXUTOS.map(c => [c, l[c]]))

function agruparPor(linhas, campo, extras = () => ({})) {
  const mapa = new Map()
  for (const l of linhas) {
    const k = l[campo]
    if (!mapa.has(k)) mapa.set(k, [])
    mapa.get(k).push(l)
  }
  return [...mapa.entries()].map(([k, ls]) => ({ chave: k, ...extras(ls) }))
}

function resumoEstoque(ls) {
  const ativos = ls.filter(l => l.saldo > 0)
  const valor = soma(ativos.map(l => l.valor_estoque))
  const qtd = soma(ativos.map(l => l.saldo))
  const cmv12 = soma(ls.map(l => l.vendas12 * l.custo_medio))
  return {
    skus_mix: new Set(ls.map(l => l.codigo)).size,
    skus_ativos: new Set(ativos.map(l => l.codigo)).size,
    qtd,
    valor: r2(valor),
    profundidade_un: ativos.length ? r1(qtd / ativos.length) : 0,
    profundidade_valor: ativos.length ? r2(valor / ativos.length) : 0,
    giro_anual: valor > 0 ? r2(cmv12 / valor) : null,
    cobertura_media_dias: cmv12 > 0 ? Math.round(valor / (cmv12 / 365)) : null,
  }
}

// ── Telas ────────────────────────────────────────────────────────────────────

export function telaEstoque(base, f) {
  const ls = filtrarLinhas(base.linhas, f)
  const aging = (grupo) => Object.fromEntries(['0-90', '91-180', '181-365', '>365'].map(fx => [fx, r2(soma(grupo.filter(l => l.faixa_aging === fx && l.saldo > 0).map(l => l.valor_estoque)))]))
  return {
    kpis: { ...resumoEstoque(ls), aging: aging(ls) },
    porLoja: agruparPor(ls, 'empresa_nome', g => ({ ...resumoEstoque(g), aging: aging(g) })),
    porGrupo: agruparPor(ls, 'grupo', resumoEstoque).sort((a, b) => b.valor - a.valor),
    porMarca: agruparPor(ls, 'marca', resumoEstoque).sort((a, b) => b.valor - a.valor),
    rows: ls.filter(l => l.saldo > 0).map(enxuta),
  }
}

export function telaClassificacao(base, f) {
  const codigos = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const itens = base.itens.filter(i => codigos.has(i.codigo))
  const resumo = (campo, valores) => valores.map(v => {
    const g = itens.filter(i => i[campo] === v)
    return {
      classe: v,
      itens: g.length,
      pct_itens: itens.length ? r1(g.length / itens.length * 100) : 0,
      faturamento: r2(soma(g.map(i => i.fat12))),
      pct_faturamento: r1(soma(g.map(i => i.part_fat))),
      valor_estoque: r2(soma(g.map(i => i.valor_estoque))),
      pct_estoque: r1(soma(g.map(i => i.part_xyz || 0))),
    }
  })
  const matriz = []
  for (const a of ['A', 'B', 'C']) for (const x of ['X', 'Y', 'Z']) for (const fr of ['F', 'M', 'R']) {
    const g = itens.filter(i => i.abc === a && i.xyz === x && i.freq === fr)
    matriz.push({ abc: a, xyz: x, freq: fr, classe: a + x + fr, itens: g.length, faturamento: r2(soma(g.map(i => i.fat12))), valor_estoque: r2(soma(g.map(i => i.valor_estoque))), ...politica(a, x, fr, null, base.params) })
  }
  // Matriz da política de compra: Curva de Venda × XYZ (dias de estoque por célula)
  const matrizCompra = []
  const freqPopular = base.params.c_popular_freq?.[0] || 'F'
  for (const [a, popular] of [['A', false], ['B', false], ['C', false], ['C', true]]) for (const x of ['X', 'Y', 'Z']) {
    const celula = popular ? `C${x}+` : a + x
    const g = itens.filter(i => i.celula === celula)
    // politica() decide pela Popularidade: a linha "C popular" usa uma Popularidade da lista; a C normal, uma fora dela
    const freqRef = a !== 'C' ? 'F' : popular ? freqPopular : (['F', 'M', 'R'].find(f => !(base.params.c_popular_freq || []).includes(f)) || 'R')
    matrizCompra.push({ abc: a, xyz: x, celula, c_popular: popular, itens: g.length, valor_estoque: r2(soma(g.map(i => i.valor_estoque))), ...politica(a, x, freqRef, 'E', base.params) })
  }
  return {
    abc: resumo('abc', ['A', 'B', 'C']),
    xyz: resumo('xyz', ['X', 'Y', 'Z']),
    freq: resumo('freq', ['F', 'M', 'R']).map(r => ({ ...r, nome: FREQ_NOME[r.classe] })),
    reg: resumo('reg', ['E', 'V', 'I']).map(r => ({ ...r, nome: NOME_REG[r.classe] })),
    mobilidade: resumo('mobilidade', ['Rápido', 'Lento', 'Parado', 'Obsoleto (D)']),
    matriz,
    matrizCompra,
    parametros: { c_popular_freq: base.params.c_popular_freq, abc_base: base.params.abc_base, abc_periodo_meses: base.params.abc_periodo_meses, abc_corte_a: base.params.abc_corte_a, abc_corte_b: base.params.abc_corte_b, xyz_base: base.params.xyz_base, metodo_compra: base.params.metodo_compra },
    pareto: itens.filter((_, i) => i % Math.max(1, Math.floor(itens.length / 100)) === 0).map((i, idx) => ({ idx, part_acum: r1(i.part_acum) })),
    rows: itens.map(i => ({
      codigo: i.codigo, descricao: i.descricao, grupo: i.grupo, marca: i.marca, fornecedor: i.fornecedor,
      abc: i.abc, xyz: i.xyz, freq: i.freq, reg: i.reg, mobilidade: i.mobilidade, classe: i.classe, celula: i.celula, politica: i.politica, orientacao: i.orientacao,
      qtd_periodo: i.qtd_periodo, fat_periodo: r2(i.fat_periodo), base_venda: r2(i.base_venda), fat12: r2(i.fat12), part_fat: r2(i.part_fat), part_acum: r2(i.part_acum), part_xyz: r2(i.part_xyz), qtd12: i.qtd12,
      cv: i.cv == null ? null : r2(i.cv), meses_com_venda: i.meses_com_venda,
      saldo: i.saldo, valor_estoque: r2(i.valor_estoque),
    })),
  }
}

export function telaDemanda(base, f) {
  const ls = filtrarLinhas(base.linhas, f)
  const { meses, precoCusto } = base.ds
  const serie = meses.map((mes, i) => {
    let qtd = 0, fat = 0
    for (const l of ls) { const q = l.vendas_serie[i]; qtd += q; fat += q * (precoCusto[l.codigo]?.[i]?.preco ?? l.preco) }
    return { mes, qtd, faturamento: r2(fat) }
  })
  const media24 = media(serie.map(s => s.qtd)) || 1
  const sazonalidade = Array.from({ length: 12 }, (_, m) => {
    const ms = serie.filter(s => Number(s.mes.slice(5, 7)) - 1 === m)
    return { mes: m + 1, indice: r2(media(ms.map(s => s.qtd)) / media24) }
  })
  const previsaoMes = soma(ls.map(l => l.previsao_mes))
  // Tendência por item (soma das lojas filtradas)
  const porItem = new Map()
  for (const l of ls) {
    if (!porItem.has(l.codigo)) porItem.set(l.codigo, { codigo: l.codigo, descricao: l.descricao, grupo: l.grupo, marca: l.marca, abc: l.abc, serie: new Array(meses.length).fill(0), saldo: 0, previsao_mes: 0 })
    const it = porItem.get(l.codigo)
    l.vendas_serie.forEach((q, i) => { it.serie[i] += q })
    it.saldo += l.saldo
    it.previsao_mes += l.previsao_mes
  }
  const tendencias = [...porItem.values()].map(it => {
    const ult12 = it.serie.slice(-12), ant12 = it.serie.slice(0, 12)
    return {
      codigo: it.codigo, descricao: it.descricao, grupo: it.grupo, marca: it.marca, abc: it.abc,
      qtd12: soma(ult12), qtd12_anterior: soma(ant12),
      variacao_ano: soma(ant12) > 0 ? r1((soma(ult12) / soma(ant12) - 1) * 100) : null,
      tendencia: r2(tendenciaAnual(ult12)),
      previsao_mes: r1(it.previsao_mes), saldo: it.saldo,
      serie12: ult12,
    }
  }).filter(t => t.qtd12 + t.qtd12_anterior >= 6)
  return {
    kpis: {
      qtd12: soma(serie.slice(-12).map(s => s.qtd)),
      qtd12_anterior: soma(serie.slice(0, 12).map(s => s.qtd)),
      faturamento12: r2(soma(serie.slice(-12).map(s => s.faturamento))),
      faturamento12_anterior: r2(soma(serie.slice(0, 12).map(s => s.faturamento))),
      previsao_mes: Math.round(previsaoMes),
    },
    serie,
    sazonalidade,
    porGrupo: agruparPor(ls, 'grupo', g => ({ qtd12: soma(g.map(l => l.vendas12)), previsao_mes: Math.round(soma(g.map(l => l.previsao_mes))) })).sort((a, b) => b.qtd12 - a.qtd12),
    crescentes: [...tendencias].filter(t => t.tendencia > 0.25).sort((a, b) => b.tendencia - a.tendencia).slice(0, 50),
    em_queda: [...tendencias].filter(t => t.tendencia < -0.25).sort((a, b) => a.tendencia - b.tendencia).slice(0, 50),
  }
}

export function telaReposicao(base, f) {
  const ls = filtrarLinhas(base.linhas, f)
  const rows = ls.filter(l => l.necessidade > 0).map(semSerie)
    .sort((a, b) => (b.ruptura - a.ruptura) || ('ABC'.indexOf(a.abc) - 'ABC'.indexOf(b.abc)) || (b.valor_sugestao - a.valor_sugestao))
  const porFornecedor = agruparPor(rows, 'fornecedor', g => ({
    itens: g.filter(l => l.sugestao_compra > 0).length,
    qtd: soma(g.map(l => l.sugestao_compra)),
    valor: r2(soma(g.map(l => l.valor_sugestao))),
    em_ruptura: g.filter(l => l.ruptura).length,
  })).sort((a, b) => b.valor - a.valor)
  return {
    kpis: {
      itens_abaixo_pp: rows.length,
      itens_comprar: rows.filter(l => l.sugestao_compra > 0).length,
      valor_sugestao: r2(soma(rows.map(l => l.valor_sugestao))),
      itens_cobertos_transferencia: rows.filter(l => l.transferencia_entrada > 0).length,
      valor_evitado_transferencia: r2(soma(rows.map(l => Math.min(l.transferencia_entrada, l.necessidade) * l.custo))),
      em_ruptura: rows.filter(l => l.ruptura).length,
    },
    porFornecedor,
    rows,
  }
}

export function telaCoberturaRuptura(base, f) {
  const ls = filtrarLinhas(base.linhas, f)
  const comGiro = ls.filter(l => l.media_mensal > 0)
  const faixas = [['0 (ruptura)', l => l.saldo <= 0], ['1-15', l => l.cobertura_dias > 0 && l.cobertura_dias <= 15], ['16-30', l => l.cobertura_dias > 15 && l.cobertura_dias <= 30], ['31-60', l => l.cobertura_dias > 30 && l.cobertura_dias <= 60], ['61-90', l => l.cobertura_dias > 60 && l.cobertura_dias <= 90], ['91-180', l => l.cobertura_dias > 90 && l.cobertura_dias <= 180], ['>180', l => l.cobertura_dias > 180]]
  const valorEst = soma(comGiro.map(l => l.valor_estoque))
  const cmvDia = soma(comGiro.map(l => l.vendas12 * l.custo_medio)) / 365
  const porClasse = ['A', 'B', 'C'].map(c => {
    const g = comGiro.filter(l => l.abc === c)
    return { classe: c, itens: g.length, em_ruptura: g.filter(l => l.ruptura).length, pct_ruptura: g.length ? r1(g.filter(l => l.ruptura).length / g.length * 100) : 0, risco: g.filter(l => l.ruptura_projetada).length, venda_perdida_mes: r2(soma(g.map(l => l.venda_perdida_mes))) }
  })
  return {
    kpis: {
      itens_com_giro: comGiro.length,
      em_ruptura: comGiro.filter(l => l.ruptura).length,
      pct_ruptura: comGiro.length ? r1(comGiro.filter(l => l.ruptura).length / comGiro.length * 100) : 0,
      risco_ruptura: comGiro.filter(l => l.ruptura_projetada).length,
      venda_perdida_mes: r2(soma(comGiro.map(l => l.venda_perdida_mes))),
      cobertura_media_dias: cmvDia > 0 ? Math.round(valorEst / cmvDia) : null,
      // Nível de atendimento: % dos itens com giro que têm saldo
      nivel_atendimento: comGiro.length ? r1((1 - comGiro.filter(l => l.ruptura).length / comGiro.length) * 100) : null,
    },
    faixas: faixas.map(([nome, fn]) => { const g = comGiro.filter(fn); return { faixa: nome, itens: g.length, valor: r2(soma(g.map(l => l.valor_estoque))) } }),
    porClasse,
    porLoja: agruparPor(comGiro, 'empresa_nome', g => ({ itens: g.length, em_ruptura: g.filter(l => l.ruptura).length, pct_ruptura: r1(g.filter(l => l.ruptura).length / g.length * 100), risco: g.filter(l => l.ruptura_projetada).length, venda_perdida_mes: r2(soma(g.map(l => l.venda_perdida_mes))) })),
    rows: comGiro.map(enxuta).sort((a, b) => (b.ruptura - a.ruptura) || (b.ruptura_projetada - a.ruptura_projetada) || ((a.cobertura_dias ?? 1e9) - (b.cobertura_dias ?? 1e9))),
  }
}

export function telaExcessoObsoletos(base, f) {
  const ls = filtrarLinhas(base.linhas, f).filter(l => l.saldo > 0)
  const excesso = ls.filter(l => l.situacao === 'Excesso').map(semSerie).sort((a, b) => b.excesso_valor - a.excesso_valor)
  const obsoletos = ls.filter(l => l.situacao === 'Obsoleto').map(semSerie).sort((a, b) => b.valor_estoque - a.valor_estoque)
  const pre = ls.filter(l => l.situacao === 'Pré-obsoleto').map(semSerie).sort((a, b) => b.valor_estoque - a.valor_estoque)
  const faixasSemVenda = [['181-270', 181, 270], ['271-365', 271, 365], ['366-540', 366, 540], ['541-730', 541, 730], ['>730', 731, 1e9]]
  return {
    kpis: {
      valor_estoque: r2(soma(ls.map(l => l.valor_estoque))),
      excesso_itens: excesso.length, excesso_valor: r2(soma(excesso.map(l => l.excesso_valor))),
      obsoleto_itens: obsoletos.length, obsoleto_valor: r2(soma(obsoletos.map(l => l.valor_estoque))),
      pre_obsoleto_itens: pre.length, pre_obsoleto_valor: r2(soma(pre.map(l => l.valor_estoque))),
    },
    faixasSemVenda: faixasSemVenda.map(([nome, a, b]) => { const g = ls.filter(l => l.dias_sem_venda == null ? b >= 1e9 : l.dias_sem_venda >= a && l.dias_sem_venda <= b); return { faixa: nome, itens: g.length, valor: r2(soma(g.map(l => l.valor_estoque))) } }),
    porLoja: agruparPor(ls, 'empresa_nome', g => ({
      excesso_valor: r2(soma(g.filter(l => l.situacao === 'Excesso').map(l => l.excesso_valor))),
      obsoleto_valor: r2(soma(g.filter(l => l.situacao === 'Obsoleto').map(l => l.valor_estoque))),
      pre_obsoleto_valor: r2(soma(g.filter(l => l.situacao === 'Pré-obsoleto').map(l => l.valor_estoque))),
    })),
    excesso, obsoletos, pre_obsoletos: pre,
  }
}

export function telaPromocoes(base, f) {
  const p = base.params
  const ls = filtrarLinhas(base.linhas, f).filter(l => l.saldo > 0 && ['Excesso', 'Pré-obsoleto', 'Obsoleto'].includes(l.situacao))
  const rows = []
  for (const l of ls) {
    const qtdLiquidar = Math.max(0, (l.situacao === 'Excesso' ? l.excesso_qtd : l.saldo) - l.transferencia_saida)
    if (qtdLiquidar <= 0) continue
    const margemAtual = l.preco > 0 ? (l.preco - l.custo_medio) / l.preco : 0
    const precoMinMargem = l.custo_medio / (1 - p.margem_minima)
    const descMaxMargem = Math.max(0, 1 - precoMinMargem / l.preco)
    const descMaxCusto = Math.max(0, 1 - l.custo_medio / l.preco)
    let desc
    if (l.situacao === 'Obsoleto') desc = Math.min(0.35, descMaxCusto)
    else if (l.situacao === 'Pré-obsoleto') desc = Math.min(0.2, descMaxMargem)
    else desc = Math.min(0.12, descMaxMargem)
    if (desc < 0.03 && l.situacao !== 'Obsoleto') continue
    const precoPromo = l.preco * (1 - desc)
    const capital = qtdLiquidar * l.custo_medio
    const peso = l.situacao === 'Obsoleto' ? 1.5 : l.situacao === 'Pré-obsoleto' ? 1.2 : 1
    rows.push({
      ...semSerie(l),
      qtd_liquidar: qtdLiquidar,
      margem_atual: r2(margemAtual * 100),
      desconto_sugerido: r1(desc * 100),
      desconto_max_margem: r1(descMaxMargem * 100),
      preco_promocional: r2(precoPromo),
      margem_promocional: r2(precoPromo > 0 ? (precoPromo - l.custo_medio) / precoPromo * 100 : 0),
      capital_liberado: r2(capital),
      receita_potencial: r2(qtdLiquidar * precoPromo),
      score: Math.round(capital * peso),
      motivo: l.situacao === 'Obsoleto' ? `Sem venda há ${l.dias_sem_venda ?? '+730'} dias` : l.situacao === 'Pré-obsoleto' ? 'Giro em queda / sem venda recente' : `Excesso de ${l.excesso_qtd} un (cobertura ${l.cobertura_dias ?? '∞'} dias)`,
    })
  }
  rows.sort((a, b) => b.score - a.score)
  return {
    kpis: {
      candidatos: rows.length,
      capital_liberado: r2(soma(rows.map(r => r.capital_liberado))),
      receita_potencial: r2(soma(rows.map(r => r.receita_potencial))),
      desconto_medio: rows.length ? r1(media(rows.map(r => r.desconto_sugerido))) : 0,
    },
    porGrupo: agruparPor(rows, 'grupo', g => ({ itens: g.length, capital_liberado: r2(soma(g.map(r => r.capital_liberado))) })).sort((a, b) => b.capital_liberado - a.capital_liberado),
    rows,
  }
}

export function telaPedidosPendentes(base, f) {
  const lojaSet = new Set(base.lojas)
  const linhaPor = new Map(base.linhas.map(l => [l.codigo + '|' + l.empresa_nome, l]))
  const codigosFiltro = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const rows = base.ds.pedidos
    .filter(p => lojaSet.has(p.empresa_nome) && codigosFiltro.has(p.codigo) && p.qtd_pedida > p.qtd_recebida)
    .map(p => {
      const l = linhaPor.get(p.codigo + '|' + p.empresa_nome)
      const saldoPedido = p.qtd_pedida - p.qtd_recebida
      // Sem data prevista (Dealer.net RPR073 só traz a quantidade em pedido): não dá para medir atraso
      const atraso = p.data_prevista ? diasEntre(p.data_prevista, base.hoje) : null
      const status = atraso == null ? 'Sem data' : atraso > 0 ? 'Atrasado' : p.qtd_recebida > 0 ? 'Recebido parcial' : 'No prazo'
      return {
        ...p,
        descricao: l?.descricao, grupo: l?.grupo, marca: l?.marca, abc: l?.abc,
        saldo_pedido: saldoPedido,
        valor: r2(saldoPedido * p.custo_unitario),
        dias_atraso: atraso == null ? null : Math.max(0, atraso),
        dias_para_chegar: atraso == null ? null : atraso <= 0 ? -atraso : 0,
        status,
        saldo_estoque: l?.saldo ?? 0,
        cobertura_dias: l?.cobertura_dias ?? null,
        situacao_item: l?.situacao,
        criticidade: atraso > 0 && l?.ruptura ? 'Crítica' : atraso > 0 && (l?.ruptura_projetada || l?.abc === 'A') ? 'Alta' : atraso > 0 ? 'Média' : 'Baixa',
      }
    })
    .sort((a, b) => (b.dias_atraso ?? -1) - (a.dias_atraso ?? -1) || b.valor - a.valor)
  return {
    kpis: {
      pedidos: new Set(rows.map(r => r.pedido)).size,
      itens: rows.length,
      valor: r2(soma(rows.map(r => r.valor))),
      atrasados: rows.filter(r => r.status === 'Atrasado').length,
      valor_atrasado: r2(soma(rows.filter(r => r.status === 'Atrasado').map(r => r.valor))),
      criticos: rows.filter(r => r.criticidade === 'Crítica').length,
    },
    porFornecedor: agruparPor(rows, 'fornecedor', g => ({ itens: g.length, valor: r2(soma(g.map(r => r.valor))), atrasados: g.filter(r => r.status === 'Atrasado').length, atraso_medio: r1(media(g.filter(r => r.dias_atraso > 0).map(r => r.dias_atraso))) })).sort((a, b) => b.atrasados - a.atrasados),
    rows,
  }
}

export function telaTransferencias(base, f) {
  const codigos = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const rows = base.transferencias.filter(t => codigos.has(t.codigo)).sort((a, b) => b.valor - a.valor)
  const rotas = new Map()
  for (const t of rows) {
    const k = `${t.loja_origem} → ${t.loja_destino}`
    const r = rotas.get(k) || { rota: k, loja_origem: t.loja_origem, loja_destino: t.loja_destino, itens: 0, qtd: 0, valor: 0 }
    r.itens++; r.qtd += t.qtd; r.valor = r2(r.valor + t.valor)
    rotas.set(k, r)
  }
  return {
    kpis: {
      sugestoes: rows.length,
      qtd: soma(rows.map(t => t.qtd)),
      valor: r2(soma(rows.map(t => t.valor))),
      rupturas_resolvidas: rows.filter(t => t.motivo === 'Destino em ruptura').length,
    },
    rotas: [...rotas.values()].sort((a, b) => b.valor - a.valor),
    rows,
  }
}

export function telaAnomaliasCompra(base, f) {
  const p = base.params
  const lojaSet = new Set(base.lojas)
  const linhaPor = new Map(base.linhas.map(l => [l.codigo + '|' + l.empresa_nome, l]))
  const codigosFiltro = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const porChave = new Map()
  for (const c of base.ds.compras) {
    if (!lojaSet.has(c.empresa_nome) || !codigosFiltro.has(c.codigo)) continue
    const k = c.codigo + '|' + c.empresa_nome
    if (!porChave.has(k)) porChave.set(k, [])
    porChave.get(k).push(c)
  }
  const rows = []
  for (const [k, lista] of porChave) {
    lista.sort((a, b) => a.data_pedido.localeCompare(b.data_pedido))
    const l = linhaPor.get(k)
    lista.forEach((c, idx) => {
      if (diasEntre(c.data_pedido, base.hoje) > 120) return
      const anteriores = lista.slice(0, idx)
      const motivos = []
      let sev = 0
      if (anteriores.length >= 3) {
        const qs = anteriores.map(a => a.qtd_pedida)
        const m = media(qs), sd = Math.max(desvio(qs), m * 0.25)
        const z = (c.qtd_pedida - m) / sd
        if (z >= p.anomalia_compra_z) { motivos.push(`Quantidade ${r1(c.qtd_pedida / m)}x a média das compras anteriores (${r1(m)} un)`); sev = Math.max(sev, z >= p.anomalia_compra_z * 2 ? 3 : 2) }
        const cm = media(anteriores.map(a => a.custo_unitario))
        const varCusto = c.custo_unitario / cm - 1
        if (varCusto >= p.variacao_custo_alerta) { motivos.push(`Custo unitário ${r1(varCusto * 100)}% acima da média das compras anteriores`); sev = Math.max(sev, 2) }
      }
      // Compra dos últimos 60 dias que, sozinha, responde por boa parte do excesso atual da loja
      if (l && l.situacao === 'Excesso' && diasEntre(c.data_pedido, base.hoje) <= 60 && c.qtd_recebida >= l.excesso_qtd * 0.5) { motivos.push(`Compra gerou excesso: loja hoje com ${l.excesso_qtd} un acima do necessário (cobertura ${l.cobertura_dias ?? '∞'} dias)`); sev = Math.max(sev, 2) }
      if (l && l.situacao === 'Obsoleto') { motivos.push('Compra de item hoje obsoleto nesta loja'); sev = Math.max(sev, 3) }
      if (l && l.vendas12 === 0) { motivos.push('Item sem venda nos últimos 12 meses nesta loja'); sev = Math.max(sev, 3) }
      if (!motivos.length) return
      rows.push({
        ...c,
        descricao: l?.descricao, grupo: l?.grupo, marca: l?.marca, abc: l?.abc,
        valor: r2(c.qtd_pedida * c.custo_unitario),
        situacao_item: l?.situacao, cobertura_dias: l?.cobertura_dias, media_mensal: l?.media_mensal,
        severidade: ['Baixa', 'Média', 'Alta', 'Crítica'][sev],
        motivos,
      })
    })
  }
  rows.sort((a, b) => ['Crítica', 'Alta', 'Média', 'Baixa'].indexOf(a.severidade) - ['Crítica', 'Alta', 'Média', 'Baixa'].indexOf(b.severidade) || b.valor - a.valor)
  return {
    kpis: { compras: rows.length, valor: r2(soma(rows.map(r => r.valor))), criticas: rows.filter(r => r.severidade === 'Crítica').length },
    rows,
  }
}

export function telaAnomaliasPreco(base, f) {
  const p = base.params
  const codigos = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const rows = []
  for (const it of base.itens) {
    if (!codigos.has(it.codigo)) continue
    const h = base.ds.precoCusto[it.codigo]
    if (!h || h.length < 4) continue
    const u = h[h.length - 1], a1 = h[h.length - 2], a3 = h[h.length - 4]
    const margem = u.preco > 0 ? (u.preco - u.custo) / u.preco : 0
    let mesesSemReajuste = 0
    for (let i = h.length - 2; i >= 0 && Math.abs(h[i].preco - u.preco) < 0.01; i--) mesesSemReajuste++
    const custoNoReajuste = h[h.length - 1 - mesesSemReajuste].custo
    const custoDesdeReajuste = u.custo / custoNoReajuste - 1
    const varCusto1 = u.custo / a1.custo - 1
    const varCusto3 = u.custo / a3.custo - 1
    const varPreco1 = u.preco / a1.preco - 1
    const motivos = []
    let sev = 0
    if (u.preco < u.custo) { motivos.push('Preço de venda abaixo do custo'); sev = 3 }
    else if (margem < p.margem_minima) { motivos.push(`Margem ${r1(margem * 100)}% abaixo da mínima (${r1(p.margem_minima * 100)}%)`); sev = Math.max(sev, 2) }
    if (varCusto1 >= p.variacao_custo_alerta) { motivos.push(`Custo subiu ${r1(varCusto1 * 100)}% no último mês`); sev = Math.max(sev, 2) }
    if (mesesSemReajuste * 30 >= p.dias_preco_desatualizado && custoDesdeReajuste >= 0.08) { motivos.push(`Preço sem reajuste há ${mesesSemReajuste} meses; custo subiu ${r1(custoDesdeReajuste * 100)}% nesse período`); sev = Math.max(sev, 1) }
    if (Math.abs(varPreco1) >= 0.3) { motivos.push(`Preço variou ${r1(varPreco1 * 100)}% no último mês`); sev = Math.max(sev, 1) }
    if (!motivos.length) continue
    rows.push({
      codigo: it.codigo, descricao: it.descricao, grupo: it.grupo, marca: it.marca, fornecedor: it.fornecedor, abc: it.abc,
      custo: u.custo, preco: u.preco, margem: r1(margem * 100),
      var_custo_1m: r1(varCusto1 * 100), var_custo_3m: r1(varCusto3 * 100), var_preco_1m: r1(varPreco1 * 100),
      meses_sem_reajuste: mesesSemReajuste,
      preco_sugerido: r2(Math.max(u.preco, u.custo / (1 - Math.max(p.margem_minima, margemAlvo(it, h))))),
      qtd12: it.qtd12, saldo: it.saldo,
      severidade: ['Baixa', 'Média', 'Alta', 'Crítica'][sev],
      motivos,
      historico: h.slice(-12),
    })
  }
  rows.sort((a, b) => ['Crítica', 'Alta', 'Média', 'Baixa'].indexOf(a.severidade) - ['Crítica', 'Alta', 'Média', 'Baixa'].indexOf(b.severidade) || b.qtd12 - a.qtd12)
  return { kpis: { itens: rows.length, criticas: rows.filter(r => r.severidade === 'Crítica').length, abaixo_custo: rows.filter(r => r.preco < r.custo).length }, rows }
}

// Margem "histórica" do item (mediana dos 12 meses anteriores) — referência para preço sugerido
function margemAlvo(it, h) {
  const ms = h.slice(-13, -1).map(x => (x.preco - x.custo) / x.preco).sort((a, b) => a - b)
  return ms.length ? ms[Math.floor(ms.length / 2)] : 0
}

export function telaFornecedores(base, f) {
  const lojaSet = new Set(base.lojas)
  const codigos = new Set(filtrarLinhas(base.linhas, f).map(l => l.codigo))
  const limite = new Date(base.hoje.getTime() - 365 * DIA_MS).toISOString().slice(0, 10)
  const compras = base.ds.compras.filter(c => lojaSet.has(c.empresa_nome) && codigos.has(c.codigo) && c.data_pedido >= limite)
  const abertos = base.ds.pedidos.filter(p => lojaSet.has(p.empresa_nome) && codigos.has(p.codigo) && p.qtd_pedida > p.qtd_recebida)
  const leadCad = new Map()
  for (const it of base.itens) { if (!leadCad.has(it.fornecedor)) leadCad.set(it.fornecedor, []); leadCad.get(it.fornecedor).push(Number(base.params.lead_time_fornecedor[it.fornecedor]) || it.lead_time_dias) }
  const rows = agruparPor(compras, 'fornecedor', g => {
    const leads = g.map(c => diasEntre(c.data_pedido, new Date(c.data_recebimento + 'T00:00:00Z')))
    const noPrazo = g.filter(c => c.data_recebimento <= c.data_prevista).length
    const atrasos = g.filter(c => c.data_recebimento > c.data_prevista).map(c => diasEntre(c.data_prevista, new Date(c.data_recebimento + 'T00:00:00Z')))
    return {
      compras: g.length,
      valor_12m: r2(soma(g.map(c => c.qtd_recebida * c.custo_unitario))),
      lead_time_real: r1(media(leads)),
      lead_time_cadastro: 0,
      pct_no_prazo: r1(noPrazo / g.length * 100),
      atraso_medio: r1(media(atrasos)),
      fill_rate: r1(soma(g.map(c => c.qtd_recebida)) / Math.max(1, soma(g.map(c => c.qtd_pedida))) * 100),
    }
  }).map(r => {
    const ab = abertos.filter(p => p.fornecedor === r.chave)
    const atrasados = ab.filter(p => p.data_prevista < base.ds.data_base)
    const leadC = r1(media(leadCad.get(r.chave) || [0]))
    // Nota 0-100: 50% pontualidade, 30% fill rate, 20% aderência do lead time ao cadastro
    const aderencia = leadC > 0 ? Math.max(0, 100 - Math.abs(r.lead_time_real - leadC) / leadC * 100) : 0
    return {
      fornecedor: r.chave, ...r, lead_time_cadastro: leadC,
      pedidos_abertos: ab.length, abertos_atrasados: atrasados.length,
      valor_aberto: r2(soma(ab.map(p => (p.qtd_pedida - p.qtd_recebida) * p.custo_unitario))),
      nota: Math.round(0.5 * r.pct_no_prazo + 0.3 * r.fill_rate + 0.2 * aderencia),
    }
  }).sort((a, b) => b.valor_12m - a.valor_12m)
  return { rows }
}

export function telaProduto(base, codigo) {
  const it = base.classePorCodigo.get(codigo)
  const cad = base.ds.itens.find(i => i.codigo === codigo)
  if (!cad) return null
  const lojaSet = new Set(base.lojas)
  const linhas = base.linhas.filter(l => l.codigo === codigo)
  return {
    item: it ? { ...semSerie(it), cv: it.cv == null ? null : r2(it.cv), fat12: r2(it.fat12), valor_estoque: r2(it.valor_estoque), tendencia: r2(it.tendencia) } : cad,
    meses: base.ds.meses,
    lojas: linhas.map(semSerie),
    series: base.ds.meses.map((mes, i) => {
      const o = { mes }
      for (const l of linhas) o[l.empresa_nome] = l.vendas_serie[i]
      o.total = soma(linhas.map(l => l.vendas_serie[i]))
      const pc = base.ds.precoCusto[codigo]?.[i]
      o.custo = pc?.custo; o.preco = pc?.preco
      return o
    }),
    compras: base.ds.compras.filter(c => c.codigo === codigo && lojaSet.has(c.empresa_nome)).sort((a, b) => b.data_pedido.localeCompare(a.data_pedido)),
    pedidos: base.ds.pedidos.filter(p => p.codigo === codigo && lojaSet.has(p.empresa_nome)),
    transferencias: base.transferencias.filter(t => t.codigo === codigo),
  }
}

export function buscarProdutos(base, termo, limite = 30) {
  const t = String(termo || '').toLowerCase().trim()
  if (!t) return []
  return base.itens
    .filter(i => i.codigo.includes(t) || i.descricao.toLowerCase().includes(t))
    .slice(0, limite)
    .map(i => ({ codigo: i.codigo, descricao: i.descricao, marca: i.marca, grupo: i.grupo, abc: i.abc, saldo: i.saldo }))
}

// ── Painel / Central de Alertas ──────────────────────────────────────────────
export function telaPainel(base, f) {
  const ls = filtrarLinhas(base.linhas, f)
  const est = resumoEstoque(ls)
  const comGiro = ls.filter(l => l.media_mensal > 0)
  const sit = (s) => ls.filter(l => l.situacao === s)
  const pend = telaPedidosPendentes(base, f)
  const anC = telaAnomaliasCompra(base, f)
  const anP = telaAnomaliasPreco(base, f)
  const transf = telaTransferencias(base, f)
  const repo = telaReposicao(base, f)
  const porSituacao = ['Normal', 'Risco de ruptura', 'Ruptura', 'Excesso', 'Pré-obsoleto', 'Obsoleto', 'Sem estoque'].map(s => ({ situacao: s, itens: sit(s).length, valor: r2(soma(sit(s).map(l => l.valor_estoque))) }))
  const valorAbc = ['A', 'B', 'C'].map(c => ({ classe: c, valor: r2(soma(ls.filter(l => l.abc === c).map(l => l.valor_estoque))), itens: new Set(ls.filter(l => l.abc === c).map(l => l.codigo)).size }))
  return {
    kpis: {
      ...est,
      itens_com_giro: comGiro.length,
      ruptura_itens: comGiro.filter(l => l.ruptura).length,
      pct_ruptura: comGiro.length ? r1(comGiro.filter(l => l.ruptura).length / comGiro.length * 100) : 0,
      venda_perdida_mes: r2(soma(comGiro.map(l => l.venda_perdida_mes))),
      excesso_valor: r2(soma(sit('Excesso').map(l => l.excesso_valor))),
      obsoleto_valor: r2(soma(sit('Obsoleto').map(l => l.valor_estoque))),
      pct_obsoleto: est.valor > 0 ? r1(soma(sit('Obsoleto').map(l => l.valor_estoque)) / est.valor * 100) : 0,
      pre_obsoleto_valor: r2(soma(sit('Pré-obsoleto').map(l => l.valor_estoque))),
      sugestao_compra_valor: repo.kpis.valor_sugestao,
      transferencias_valor: transf.kpis.valor,
      pedidos_atrasados: pend.kpis.atrasados,
      anomalias_compra: anC.kpis.compras,
      anomalias_preco: anP.kpis.itens,
    },
    porSituacao,
    valorAbc,
    porLoja: agruparPor(ls, 'empresa_nome', g => {
      const cg = g.filter(l => l.media_mensal > 0)
      return {
        ...resumoEstoque(g),
        pct_ruptura: cg.length ? r1(cg.filter(l => l.ruptura).length / cg.length * 100) : 0,
        excesso_valor: r2(soma(g.filter(l => l.situacao === 'Excesso').map(l => l.excesso_valor))),
        obsoleto_valor: r2(soma(g.filter(l => l.situacao === 'Obsoleto').map(l => l.valor_estoque))),
      }
    }),
    _sub: { pend, anC, anP, transf, repo, ls },
  }
}

export function telaAlertas(base, f) {
  const painel = telaPainel(base, f)
  const { pend, anC, anP, transf, ls } = painel._sub
  const alertas = []
  const add = (a) => alertas.push(a)
  for (const l of ls) {
    if (l.ruptura && l.abc !== 'C') add({ tipo: 'Ruptura', severidade: l.abc === 'A' ? 'Crítica' : 'Alta', tela: 'pecas/cobertura-ruptura', codigo: l.codigo, descricao: l.descricao, empresa_nome: l.empresa_nome, valor: l.venda_perdida_mes, mensagem: `Item ${l.abc} sem saldo — venda perdida estimada ${fmtR(l.venda_perdida_mes)}/mês${l.pendente ? ` (pedido pendente de ${l.pendente} un)` : ' (sem pedido)'}` })
    else if (l.ruptura_projetada && l.abc === 'A') add({ tipo: 'Risco de ruptura', severidade: 'Alta', tela: 'pecas/cobertura-ruptura', codigo: l.codigo, descricao: l.descricao, empresa_nome: l.empresa_nome, valor: l.previsao_mes * l.preco, mensagem: `Cobertura de ${l.cobertura_com_pedido ?? 0} dias (com pedidos) menor que o lead time de ${l.lead_time} dias` })
    if (l.situacao === 'Pré-obsoleto' && l.valor_estoque >= 1000) add({ tipo: 'Alerta pré-obsoleto', severidade: l.valor_estoque >= 10000 ? 'Alta' : 'Média', tela: 'pecas/excesso-obsoletos', codigo: l.codigo, descricao: l.descricao, empresa_nome: l.empresa_nome, valor: l.valor_estoque, mensagem: `${fmtR(l.valor_estoque)} em estoque, ${l.dias_sem_venda ?? '—'} dias sem venda, tendência ${Math.round(l.tendencia * 100)}%/ano` })
    if (l.situacao === 'Obsoleto' && l.valor_estoque >= 3000) add({ tipo: 'Obsoleto', severidade: l.valor_estoque >= 15000 ? 'Alta' : 'Média', tela: 'pecas/excesso-obsoletos', codigo: l.codigo, descricao: l.descricao, empresa_nome: l.empresa_nome, valor: l.valor_estoque, mensagem: `${fmtR(l.valor_estoque)} parados há ${l.dias_sem_venda ?? '+730'} dias` })
    if (l.situacao === 'Excesso' && l.excesso_valor >= 5000) add({ tipo: 'Excesso', severidade: l.excesso_valor >= 20000 ? 'Alta' : 'Média', tela: 'pecas/excesso-obsoletos', codigo: l.codigo, descricao: l.descricao, empresa_nome: l.empresa_nome, valor: l.excesso_valor, mensagem: `Excesso de ${l.excesso_qtd} un (${fmtR(l.excesso_valor)}), cobertura ${l.cobertura_dias ?? '∞'} dias` })
  }
  for (const p of pend.rows.filter(r => r.status === 'Atrasado' && r.criticidade !== 'Baixa')) add({ tipo: 'Pedido atrasado', severidade: p.criticidade, tela: 'pecas/pedidos-pendentes', codigo: p.codigo, descricao: p.descricao, empresa_nome: p.empresa_nome, valor: p.valor, mensagem: `Pedido ${p.pedido} (${p.fornecedor}) atrasado ${p.dias_atraso} dias — saldo atual ${p.saldo_estoque} un` })
  for (const a of anC.rows.filter(r => ['Crítica', 'Alta'].includes(r.severidade))) add({ tipo: 'Compra com anomalia', severidade: a.severidade, tela: 'pecas/anomalias', codigo: a.codigo, descricao: a.descricao, empresa_nome: a.empresa_nome, valor: a.valor, mensagem: a.motivos.join('; ') })
  for (const a of anP.rows.filter(r => ['Crítica', 'Alta'].includes(r.severidade))) add({ tipo: 'Preço/custo', severidade: a.severidade, tela: 'pecas/anomalias', codigo: a.codigo, descricao: a.descricao, empresa_nome: null, valor: a.qtd12 * a.preco, mensagem: a.motivos.join('; ') })
  for (const t of transf.rows.filter(r => r.motivo === 'Destino em ruptura')) add({ tipo: 'Transferência sugerida', severidade: 'Média', tela: 'pecas/transferencias', codigo: t.codigo, descricao: t.descricao, empresa_nome: t.loja_destino, valor: t.valor, mensagem: `Transferir ${t.qtd} un de ${nomeLojaCurto(t.loja_origem)} para ${nomeLojaCurto(t.loja_destino)} (destino em ruptura)` })
  const ordem = ['Crítica', 'Alta', 'Média', 'Baixa']
  alertas.sort((a, b) => ordem.indexOf(a.severidade) - ordem.indexOf(b.severidade) || (b.valor || 0) - (a.valor || 0))
  const porTipo = agruparPor(alertas, 'tipo', g => ({ total: g.length, criticas: g.filter(a => a.severidade === 'Crítica').length, altas: g.filter(a => a.severidade === 'Alta').length, tela: g[0].tela }))
  const { _sub, ...resto } = painel
  return { ...resto, porTipo, alertas: alertas.slice(0, 500), total_alertas: alertas.length }
}

const nomeLojaCurto = (n) => String(n || '').replace(/^CAIOB[AÁ] (TRUCKS|MOTOS) - /i, '')
const fmtR = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Snapshot diário (pec_snapshot_item) — uma linha por item × loja
export function linhasSnapshot(base) {
  return base.linhas.map(l => ({
    data: base.ds.data_base, fonte: base.ds.fonte,
    codigo: l.codigo, empresa_nome: l.empresa_nome,
    saldo: l.saldo, valor_estoque: l.valor_estoque, custo_medio: l.custo_medio, preco: l.preco,
    vendas12: l.vendas12, previsao_mes: l.previsao_mes,
    abc: l.abc, xyz: l.xyz, freq: l.freq, situacao: l.situacao,
    cobertura_dias: l.cobertura_dias, necessidade: l.necessidade, pendente: l.pendente,
  }))
}

/** Simulação para a tela de Configuração: o que muda se os parâmetros forem trocados. */
export function simular(ds, paramsAtuais, paramsNovos, lojas) {
  const a = calcularBase(ds, paramsAtuais, { lojas })
  const b = calcularBase(ds, paramsNovos, { lojas })
  const resumo = (base) => {
    const cont = (campo, vals) => Object.fromEntries(vals.map(v => [v, base.itens.filter(i => i[campo] === v).length]))
    return {
      abc: cont('abc', ['A', 'B', 'C']), xyz: cont('xyz', ['X', 'Y', 'Z']), freq: cont('freq', ['F', 'M', 'R']),
      reg: cont('reg', ['E', 'V', 'I']), mobilidade: cont('mobilidade', ['Rápido', 'Lento', 'Parado', 'Obsoleto (D)']),
      sob_encomenda: base.itens.filter(i => !i.estocar).length,
      compra_valor: r2(soma(base.linhas.map(l => l.valor_sugestao))),
      compra_itens: base.linhas.filter(l => l.sugestao_compra > 0).length,
      excesso_valor: r2(soma(base.linhas.filter(l => l.situacao === 'Excesso').map(l => l.excesso_valor))),
      obsoleto_valor: r2(soma(base.linhas.filter(l => l.situacao === 'Obsoleto').map(l => l.valor_estoque))),
      pre_obsoleto_valor: r2(soma(base.linhas.filter(l => l.situacao === 'Pré-obsoleto').map(l => l.valor_estoque))),
    }
  }
  const antes = new Map(a.itens.map(i => [i.codigo, i]))
  const mudancas = []
  for (const i of b.itens) {
    const x = antes.get(i.codigo)
    if (!x) continue
    const campos = ['abc', 'xyz', 'freq', 'mobilidade'].filter(c => x[c] !== i[c])
    if (campos.length) mudancas.push({ codigo: i.codigo, descricao: i.descricao, de: `${x.abc}·${x.xyz}·${NOME_FREQ[x.freq]}·${x.mobilidade}`, para: `${i.abc}·${i.xyz}·${NOME_FREQ[i.freq]}·${i.mobilidade}`, campos })
  }
  const conta = (c) => mudancas.filter(m => m.campos.includes(c)).length
  return { atual: resumo(a), simulado: resumo(b), mudam: { total: mudancas.length, abc: conta('abc'), xyz: conta('xyz'), freq: conta('freq'), mobilidade: conta('mobilidade') }, exemplos: mudancas.slice(0, 200) }
}
