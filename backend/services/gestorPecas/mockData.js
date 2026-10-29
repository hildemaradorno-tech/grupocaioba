// Gestor de Peças 2.0 — gerador de dados SIMULADOS. Desde 28/10/2026 só o Gestor de MOTOS usa
// (o de Trucks foi para dados reais do Dealer.net — ver dataProvider.js).
// Determinístico (semente fixa): os números não mudam a cada refresh, só as datas acompanham o dia.
// Perfis "plantados" (sazonal, intermitente, em declínio, obsoleto, excesso numa loja e falta em
// outra, compra fora do padrão, salto de custo, preço abaixo do custo...) garantem que toda tela
// tenha o que mostrar. Na fase 2 este arquivo deixa de ser usado — ver dataProvider.js.

// ── Caioba Motos (MicroWork) — catálogo Honda simulado ──────────────────────
export const LOJAS_MOTOS = [
  { nome: 'CAIOBÁ MOTOS - CAMPO GRANDE', sigla: 'CG',  peso: 1.0 },
  { nome: 'CAIOBÁ MOTOS - BARRETOS',     sigla: 'BAR', peso: 0.7 },
]
const FORNECEDORES_MOTOS = {
  'HONDA':     { nome: 'MOTO HONDA DA AMAZÔNIA', lead: 10, moq: 1 },
  'PRO HONDA': { nome: 'PRO HONDA LUBRIFICANTES', lead: 7, moq: 12 },
  'PIRELLI':   { nome: 'PIRELLI PNEUS',          lead: 12, moq: 2 },
  'COBREQ':    { nome: 'COBREQ FREIOS',          lead: 8,  moq: 5 },
  'NGK':       { nome: 'NGK DO BRASIL',          lead: 6,  moq: 10 },
  'RIFFEL':    { nome: 'RIFFEL TRANSMISSÕES',    lead: 9,  moq: 2 },
}
const GRUPOS_MOTOS = {
  'Lubrificantes':     { marcas: ['PRO HONDA'], custo: [18, 95], itens: ['Óleo 10W30 1L', 'Óleo 20W50 1L', 'Fluido de freio DOT4', 'Graxa para corrente', 'Óleo de suspensão'] },
  'Freios':            { marcas: ['HONDA', 'COBREQ'], custo: [25, 420], itens: ['Pastilha dianteira', 'Lona traseira', 'Disco de freio', 'Cabo de freio', 'Manete de freio', 'Cilindro mestre'] },
  'Transmissão':       { marcas: ['HONDA', 'RIFFEL'], custo: [30, 520], itens: ['Kit relação', 'Corrente', 'Coroa', 'Pinhão', 'Cabo de embreagem', 'Disco de embreagem'] },
  'Filtros':           { marcas: ['HONDA'], custo: [15, 120], itens: ['Filtro de ar', 'Filtro de óleo', 'Filtro de combustível'] },
  'Elétrica':          { marcas: ['HONDA', 'NGK'], custo: [12, 680], itens: ['Vela de ignição', 'Bateria', 'Lâmpada do farol', 'Regulador retificador', 'Bobina de ignição', 'Chicote'] },
  'Pneus e câmaras':   { marcas: ['PIRELLI'], custo: [35, 780], itens: ['Pneu dianteiro', 'Pneu traseiro', 'Câmara de ar dianteira', 'Câmara de ar traseira'] },
  'Motor':             { marcas: ['HONDA'], custo: [20, 1500], itens: ['Junta do cabeçote', 'Kit pistão', 'Jogo de anéis', 'Válvula de admissão', 'Tensor da corrente de comando'] },
  'Carenagem':         { marcas: ['HONDA'], custo: [40, 950], itens: ['Retrovisor', 'Para-lama dianteiro', 'Tampa lateral', 'Carenagem do farol', 'Pedaleira'] },
  'Suspensão':         { marcas: ['HONDA'], custo: [25, 900], itens: ['Retentor da bengala', 'Amortecedor traseiro', 'Rolamento da caixa de direção', 'Bucha da balança'] },
}

const SEGMENTOS = {
  motos:  { lojas: LOJAS_MOTOS, fornecedores: FORNECEDORES_MOTOS, grupos: GRUPOS_MOTOS, semente: 20261029, nItens: 600, volume: 2.5,
    modelo: (rng) => rng.escolher(['CG 160', 'Biz 125', 'Pop 110i', 'XRE 300', 'CB 500', 'NXR 160 Bros', 'PCX 160', 'CB 250F Twister']) },
}

// ── RNG determinístico ───────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function criarRng(seed) {
  const r = mulberry32(seed)
  const normal = () => {
    const u = Math.max(r(), 1e-9), v = r()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const poisson = (lambda) => {
    if (lambda <= 0) return 0
    if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * normal()))
    const L = Math.exp(-lambda)
    let k = 0, p = 1
    do { k++; p *= r() } while (p > L)
    return k - 1
  }
  return {
    r,
    normal,
    poisson,
    entre: (a, b) => a + (b - a) * r(),
    inteiro: (a, b) => Math.floor(a + (b - a + 1) * r()),
    escolher: (arr) => arr[Math.floor(r() * arr.length)],
    chance: (p) => r() < p,
  }
}

const DIA_MS = 86_400_000
const isoDia = (d) => d.toISOString().slice(0, 10)
const chaveMes = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const arred = (v, c = 2) => Math.round(v * 10 ** c) / 10 ** c

// Distribuição dos perfis de demanda (soma 1)
const PERFIS = [
  ['estavel', 0.34], ['sazonal', 0.10], ['intermitente', 0.20], ['crescente', 0.08],
  ['declinio', 0.08], ['obsoleto', 0.07], ['novo', 0.04], ['lento', 0.09],
]

function sortearPerfil(rng) {
  let x = rng.r(), acc = 0
  for (const [p, w] of PERFIS) { acc += w; if (x < acc) return p }
  return 'estavel'
}

// Fator multiplicador da demanda no mês m (0 = mais antigo, 23 = último fechado)
function fatorPerfil(perfil, m, mesCalendario, fase) {
  switch (perfil) {
    case 'sazonal':      return 1 + 0.75 * Math.sin(((mesCalendario + fase) / 12) * 2 * Math.PI)
    case 'intermitente': return 1
    case 'crescente':    return 0.35 + (m / 23) * 1.4
    case 'declinio':     return Math.max(0, 1.4 - (m / 23) * 1.6) * (m > 19 ? 0.15 : 1)
    case 'obsoleto':     return m < 6 ? 0.6 : 0
    case 'novo':         return m < 17 ? 0 : 1.2
    case 'lento':        return 0.25
    default:             return 1
  }
}

const _cache = {}
const _cacheDia = {}

/** Gera (ou devolve do cache do dia) o dataset simulado completo. */
export function gerarDatasetMock(segmento = 'motos') {
  const cfg = SEGMENTOS[segmento]
  if (!cfg) throw new Error(`Sem dados simulados para o segmento "${segmento}".`)
  const LOJAS = cfg.lojas, FORNECEDORES = cfg.fornecedores, GRUPOS = cfg.grupos
  const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0)
  const dia = isoDia(hoje)
  if (_cache[segmento] && _cacheDia[segmento] === dia) return _cache[segmento]

  const rng = criarRng(cfg.semente)
  const N_MESES = 24

  // Meses fechados: o último é o mês anterior ao atual
  const meses = []
  for (let i = N_MESES; i >= 1; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1))
    meses.push(chaveMes(d))
  }
  const inicioMes = (m) => new Date(Date.UTC(Number(meses[m].slice(0, 4)), Number(meses[m].slice(5, 7)) - 1, 1))

  const itens = []
  const posicoes = []      // item × loja
  const compras = []       // entradas (NF de compra) — últimos 18 meses
  const pedidos = []       // pedidos de compra em aberto
  const precoCusto = {}    // codigo -> [{ mes, custo, preco }]

  const nomesGrupos = Object.keys(GRUPOS)
  let seqCodigo = 1000000
  let seqPedido = 50000
  const N_ITENS = cfg.nItens

  for (let i = 0; i < N_ITENS; i++) {
    const grupo = nomesGrupos[i % nomesGrupos.length]
    const g = GRUPOS[grupo]
    const marca = rng.escolher(g.marcas)
    const forn = FORNECEDORES[marca]
    seqCodigo += rng.inteiro(7, 97)
    const codigo = String(seqCodigo)
    const base = rng.escolher(g.itens)
    const descricao = `${base} ${cfg.modelo(rng, marca)} ${rng.inteiro(100, 999)}`
    const perfil = sortearPerfil(rng)

    // Custo log-uniforme dentro da faixa do grupo
    const [cMin, cMax] = g.custo
    const custoAtual = arred(Math.exp(rng.entre(Math.log(cMin), Math.log(cMax))))
    const markup = rng.entre(1.42, 2.05)

    // Demanda base mensal (loja de peso 1): itens baratos giram mais
    const demandaBase = Math.max(0.25, cfg.volume * Math.exp(Math.log(9) - 0.42 * Math.log(custoAtual / 80) + 0.7 * rng.normal()))
    const probMesIntermitente = rng.entre(0.12, 0.35)
    const faseSazonal = rng.inteiro(0, 11)
    const lead = Math.max(3, Math.round(forn.lead * rng.entre(0.8, 1.3)))
    const multiplo = forn.moq > 1 ? forn.moq : (custoAtual < 60 ? rng.escolher([1, 2, 5, 10]) : 1)

    // ── Histórico de custo/preço (24 meses): inflação ~0,45% a.m., preço reajustado em degraus ──
    const historico = []
    let custo = custoAtual / Math.pow(1.0045, N_MESES)
    let preco = custo * markup
    let ultimoReajuste = 0
    const saltoCusto = rng.chance(0.03)              // anomalia: custo sobe >25% no último mês
    const precoTravado = rng.chance(0.04)            // anomalia: preço sem reajuste há 12+ meses
    const precoAbaixo = rng.chance(0.012)            // anomalia: preço abaixo do custo
    for (let m = 0; m < N_MESES; m++) {
      custo *= 1.0045 * (1 + rng.normal() * 0.008)
      if (saltoCusto && m === N_MESES - 1) custo *= rng.entre(1.26, 1.45)
      const podeReajustar = !(precoTravado && m >= N_MESES - 13)
      if (podeReajustar && m - ultimoReajuste >= rng.inteiro(3, 6)) { preco = custo * markup; ultimoReajuste = m }
      let precoMes = preco
      if (precoAbaixo && m >= N_MESES - 2) precoMes = custo * rng.entre(0.85, 0.97)
      historico.push({ mes: meses[m], custo: arred(custo), preco: arred(precoMes) })
    }
    precoCusto[codigo] = historico
    const ultimo = historico[N_MESES - 1]

    itens.push({
      codigo, descricao, grupo, marca,
      fornecedor: forn.nome,
      lead_time_dias: lead,
      lote_minimo: forn.moq,
      multiplo,
      custo: ultimo.custo,
      preco: ultimo.preco,
      perfil_simulado: perfil,
    })

    // ── Excesso/falta plantados entre lojas (para Realocação) ──
    const desbalanceado = perfil !== 'obsoleto' && rng.chance(0.07)
    const lojaExcesso = rng.inteiro(0, LOJAS.length - 1)
    let lojaFalta = rng.inteiro(0, LOJAS.length - 1)
    if (lojaFalta === lojaExcesso) lojaFalta = (lojaFalta + 1) % LOJAS.length
    const compraAnomala = rng.chance(0.04)

    LOJAS.forEach((loja, li) => {
      // Item não trabalhado em algumas lojas menores (largura de mix diferente por loja)
      if (li > 0 && rng.chance(0.12 + li * 0.06) && !(desbalanceado && (li === lojaExcesso || li === lojaFalta))) return

      const vendas = []
      for (let m = 0; m < N_MESES; m++) {
        const mesCal = Number(meses[m].slice(5, 7)) - 1
        let lambda = demandaBase * loja.peso * Math.max(0, fatorPerfil(perfil, m, mesCal, faseSazonal))
        if (perfil === 'intermitente') lambda = rng.chance(probMesIntermitente) ? Math.max(1, lambda * 2.2) : 0
        vendas.push(rng.poisson(lambda))
      }

      // Última venda: dia aleatório no último mês com venda; obsoletos ficam com venda antiga
      let ultimaVenda = null
      for (let m = N_MESES - 1; m >= 0; m--) {
        if (vendas[m] > 0) { ultimaVenda = new Date(inicioMes(m).getTime() + rng.inteiro(0, 27) * DIA_MS); break }
      }
      if (!ultimaVenda && perfil === 'obsoleto') ultimaVenda = new Date(hoje.getTime() - rng.inteiro(560, 1100) * DIA_MS)

      const media12 = vendas.slice(-12).reduce((a, b) => a + b, 0) / 12
      const mediaRef = Math.max(media12, demandaBase * loja.peso * 0.3)

      // Saldo atual = demanda × cobertura (meses) — com excesso, ruptura e parado plantados
      let coberturaMeses = rng.entre(0.4, 3.2)
      if (rng.chance(0.09)) coberturaMeses = rng.entre(7, 18)          // excesso
      if (rng.chance(0.07) && media12 > 0.3) coberturaMeses = 0        // ruptura
      if (perfil === 'obsoleto' || perfil === 'declinio') coberturaMeses = rng.entre(4, 14)
      if (desbalanceado && li === lojaExcesso) coberturaMeses = rng.entre(8, 16)
      if (desbalanceado && li === lojaFalta) coberturaMeses = 0
      let saldo = Math.round(mediaRef * coberturaMeses)
      if (perfil === 'obsoleto' && saldo === 0) saldo = rng.inteiro(1, 6)

      const custoMedio = arred(ultimo.custo * rng.entre(0.94, 1.02))

      // ── Compras (entradas) dos últimos 18 meses ──
      let ultimaEntrada = null
      const mediaPorCompra = Math.max(multiplo, Math.ceil(mediaRef * rng.entre(1, 2.2)))
      const comprasLoja = []
      for (let m = N_MESES - 18; m < N_MESES; m++) {
        const compraNoMes = perfil === 'obsoleto' ? (m < 8 && rng.chance(0.25)) : rng.chance(perfil === 'intermitente' || perfil === 'lento' ? 0.25 : 0.55)
        if (!compraNoMes) continue
        const dataPedido = new Date(inicioMes(m).getTime() + rng.inteiro(0, 20) * DIA_MS)
        const atrasoReal = rng.chance(0.25) ? rng.inteiro(1, 15) : rng.inteiro(-3, 1)
        const dataReceb = new Date(dataPedido.getTime() + (lead + atrasoReal) * DIA_MS)
        if (dataReceb > hoje) continue
        let qtd = Math.max(multiplo, Math.round(mediaPorCompra * rng.entre(0.7, 1.3) / multiplo) * multiplo)
        const qtdRecebida = rng.chance(0.08) ? Math.max(0, Math.floor(qtd * rng.entre(0.5, 0.9))) : qtd
        comprasLoja.push({
          codigo, empresa_nome: loja.nome, fornecedor: forn.nome,
          data_pedido: isoDia(dataPedido),
          data_prevista: isoDia(new Date(dataPedido.getTime() + lead * DIA_MS)),
          data_recebimento: isoDia(dataReceb),
          qtd_pedida: qtd, qtd_recebida: qtdRecebida,
          custo_unitario: arred(historico[m].custo * rng.entre(0.98, 1.03)),
          nf: String(rng.inteiro(100000, 999999)),
        })
        if (!ultimaEntrada || dataReceb > ultimaEntrada) ultimaEntrada = dataReceb
      }
      // Anomalia: compra recente muito acima do padrão (às vezes em item com excesso)
      if (compraAnomala && li === 0) {
        const dataPedido = new Date(hoje.getTime() - rng.inteiro(20, 70) * DIA_MS)
        const dataReceb = new Date(dataPedido.getTime() + lead * DIA_MS)
        if (dataReceb <= hoje) {
          const qtd = Math.max(multiplo * 4, mediaPorCompra * rng.inteiro(5, 9))
          comprasLoja.push({
            codigo, empresa_nome: loja.nome, fornecedor: forn.nome,
            data_pedido: isoDia(dataPedido), data_prevista: isoDia(dataReceb), data_recebimento: isoDia(dataReceb),
            qtd_pedida: qtd, qtd_recebida: qtd,
            custo_unitario: arred(ultimo.custo * rng.entre(1.0, 1.22)),
            nf: String(rng.inteiro(100000, 999999)),
          })
          saldo += qtd
          if (!ultimaEntrada || dataReceb > ultimaEntrada) ultimaEntrada = dataReceb
        }
      }
      compras.push(...comprasLoja)
      if (!ultimaEntrada) ultimaEntrada = new Date(hoje.getTime() - rng.inteiro(380, 900) * DIA_MS)

      // ── Pedidos em aberto ──
      const chancePedido = saldo < mediaRef ? 0.45 : 0.06
      if (perfil !== 'obsoleto' && rng.chance(chancePedido)) {
        const diasAtras = rng.chance(0.3) ? rng.inteiro(lead + 1, lead + 25) : rng.inteiro(1, lead)
        const dataPedido = new Date(hoje.getTime() - diasAtras * DIA_MS)
        const qtd = Math.max(multiplo, Math.round(mediaPorCompra / multiplo) * multiplo)
        pedidos.push({
          pedido: String(++seqPedido), codigo, empresa_nome: loja.nome, fornecedor: forn.nome,
          data_pedido: isoDia(dataPedido),
          data_prevista: isoDia(new Date(dataPedido.getTime() + lead * DIA_MS)),
          qtd_pedida: qtd, qtd_recebida: rng.chance(0.15) ? Math.floor(qtd / 2) : 0,
          custo_unitario: arred(ultimo.custo * rng.entre(0.98, 1.04)),
        })
      }

      posicoes.push({
        codigo,
        empresa_nome: loja.nome,
        vendas,                                 // qtd vendida por mês (alinhado a `meses`)
        saldo,
        custo_medio: custoMedio,
        ultima_venda: ultimaVenda ? isoDia(ultimaVenda) : null,
        ultima_entrada: isoDia(ultimaEntrada),
      })
    })
  }

  _cache[segmento] = {
    fonte: 'mock',
    segmento,
    gerado_em: new Date().toISOString(),
    data_base: dia,
    meses,
    lojas: LOJAS.map(l => l.nome),
    itens,
    posicoes,
    compras,
    pedidos,
    precoCusto,
  }
  _cacheDia[segmento] = dia
  return _cache[segmento]
}
