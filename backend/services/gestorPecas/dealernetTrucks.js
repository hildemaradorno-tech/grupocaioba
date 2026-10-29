// Gestor de Peças 2.0 — Caioba Trucks: leitura dos relatórios do Dealer.net no SharePoint.
//
// Etapa 1 (28/10/2026):
//  - RPR073_ANALISEITENSEMESTOQUE - <LOJA>.xlsx  (pasta "Outros Relatórios Peças", 1 arquivo por loja,
//    gerado todo dia): posição de estoque. ATENÇÃO: só traz itens com saldo > 0.
//  - RPR001_VENDAPRODUTO YYYY.MM.xlsx / YYYY.xlsx (pasta "Vendas de Produtos"): vendas por item.
//    Itens que venderam e não estão no RPR073 = saldo zero (ruptura).
//
// Semântica conferida nos arquivos (não deduzida por nome):
//  - RPR001 NF_ProdCusto = custo TOTAL da linha (÷ NFItem_Qtde ≈ custo médio do RPR073, mediana 0,99).
//  - RPR001 preço praticado = NFItem_VlTotal ÷ NFItem_Qtde (NFItem_VlUnit ≈ preço público, antes do desconto).
//  - RPR001 NaturezaOperacao: VEN soma, DVE (devolução) subtrai. ProdTipoCod 5 (mão de obra) é ignorado.
//  - RPR073 Qtde = estoque físico (EstoqueFinanceiro = Qtde × custo médio); QtdeSaldo = disponível
//    (Qtde − bloqueadas para oficina/balcão). Valor usa o físico; cobertura/compra usam o disponível.
//  - RPR073 ProdutoCod = RPR001 NFItem_ProdutoCod (código interno do Dealer.net).
//  - RPR073 ProdutoMarca_QME = múltiplo de embalagem.
import * as XLSX from 'xlsx'
import axios from 'axios'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { graphGet, isConfigured } from '../graphClient.js'

const PASTA_ESTOQUE = '/Banco de Dados - DAF - Pós-Vendas/Outros Relatórios Peças'
const PASTA_VENDAS = '/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos'
const RE_RPR073 = /^RPR073_ANALISEITENSEMESTOQUE/i
const RE_RPR001 = /^RPR001_VENDAPRODUTO\s+(\d{4})(?:\.(\d{2}))?\.xlsx$/i

const TTL_ESTOQUE_MS = 15 * 60_000
const DIA_MS = 86_400_000

const num = (v) => {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
// Serial do Excel → 'YYYY-MM-DD'
const serialParaIso = (v) => {
  const n = num(v)
  if (n < 20000) return null
  return new Date(Math.round((n - 25569) * DIA_MS)).toISOString().slice(0, 10)
}
const isoMax = (a, b) => (!a ? b : !b ? a : (a > b ? a : b))

async function listar(pasta) {
  const drive = process.env.SHAREPOINT_DRIVE_ID
  if (!drive) throw new Error('SHAREPOINT_DRIVE_ID não configurado no backend.')
  let resp = await graphGet(`/drives/${drive}/root:${encodeURI(pasta)}:/children?$top=999`)
  const itens = [...(resp.value || [])]
  while (resp['@odata.nextLink']) {
    resp = await graphGet(resp['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', ''))
    itens.push(...(resp.value || []))
  }
  return itens.filter(i => i.file)
}

async function baixar(item) {
  const { data } = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 120_000 })
  return Buffer.from(data)
}

// ── RPR073: posição de estoque (todas as lojas) ──────────────────────────────
let _estoque = null, _estoqueEm = 0, _estoqueProm = null

async function lerEstoque() {
  if (_estoque && Date.now() - _estoqueEm < TTL_ESTOQUE_MS) return _estoque
  if (_estoqueProm) return _estoqueProm
  _estoqueProm = (async () => {
    const arquivos = (await listar(PASTA_ESTOQUE)).filter(f => RE_RPR073.test(f.name))
    const linhas = []
    for (const f of arquivos) {
      const wb = XLSX.read(await baixar(f), { type: 'buffer', dense: true })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets.Dados || wb.Sheets[wb.SheetNames[0]], { defval: null })
      for (const r of rows) {
        const codigo = txt(r.ProdutoCod)
        if (!codigo) continue
        linhas.push({
          codigo,
          empresa_nome: txt(r.EmpresaNome),
          referencia: txt(r.CodigoReferenciaProduto),
          descricao: txt(r.Produto_Descricao),
          qtde: num(r.Qtde),
          qtde_saldo: num(r.QtdeSaldo),
          qtde_ped_compra: num(r.QtdePedCompra),
          qtde_transito: num(r.QtdeTransito),
          qtde_bloqueada: num(r.QtdeBloqueadaOficina) + num(r.QtdeBloqueada) + num(r.QtdeBloqueadaBalcao),
          custo_medio: num(r.ValorCustoMedio),
          preco_publico: num(r.ValorPublico),
          valor_reposicao: num(r.ValorReposicao),
          ultima_venda: serialParaIso(r.UltimaVenda),
          ultima_compra: serialParaIso(r.UltimaCompra),
          ultima_entrada: serialParaIso(r.UltimaEntrada),
          ultima_saida: serialParaIso(r.UltimaSaida),
          venda_media_mensal: num(r.VendaMediaMensal),
          estoque_ideal: num(r.EstoqueIdeal),
          multiplo: Math.max(1, num(r.ProdutoMarca_QME)),
          marca: txt(r.Marca_Descricao) || 'Sem marca',
          tipo_produto: txt(r.TipoProduto_Descricao),
          tipo_codigo: txt(r.TipoProduto_Codigo),
          grupo_produto: txt(r.GrupoProduto_Descricao),
          grupo_lucratividade: txt(r.GrupoLucratividade),
          localizacao: txt(r.LocalizacaoProdutoId),
          status: txt(r.ProdutoMarca_Status),
          dealer: { popularidade: txt(r.ClasABCLetraPopularidade), venda: txt(r.ClasABCLetraVenda), estoque: txt(r.ClasABCLetraEstoque) },
        })
      }
    }
    _estoque = { linhas, arquivos: arquivos.map(f => ({ nome: f.name, atualizado: f.lastModifiedDateTime })) }
    _estoqueEm = Date.now()
    return _estoque
  })().finally(() => { _estoqueProm = null })
  return _estoqueProm
}

// ── RPR001: vendas agregadas por item × loja × mês ───────────────────────────
// Cada arquivo vira um resumo pequeno (Map) guardado em memória pela chave nome + data de modificação:
// meses fechados não mudam, então só o arquivo do mês corrente é relido quando é regerado.
const _resumoArquivo = new Map()   // `${nome}|${modificado}` → resumo
const _resumoProm = new Map()

const COLUNAS_RPR001 = ['NaturezaOperacao', 'ProdTipoCod', 'NFItem_ProdutoCod', 'EmpNome', 'NF_DataMov', 'NF_Dataemis', 'NFItem_Qtde', 'NFItem_VlTotal', 'NF_ProdCusto', 'NFItem_ProdutoDes', 'ProdMarcaReferencia']

function resumirVendas(buffer) {
  let wb = XLSX.read(buffer, { type: 'buffer', dense: true, cellDates: false })
  // Linhas como arrays (header: 1) e só as colunas usadas: o arquivo anual tem ~11 MB
  const matriz = XLSX.utils.sheet_to_json(wb.Sheets.Dados || wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true })
  wb = null
  const cab = (matriz[0] || []).map(txt)
  const ix = Object.fromEntries(COLUNAS_RPR001.map(c => [c, cab.indexOf(c)]))
  const faltando = COLUNAS_RPR001.filter(c => ix[c] < 0)
  if (faltando.length) throw new Error(`RPR001 sem as colunas: ${faltando.join(', ')}`)
  const vendas = new Map()          // `${cod}|${loja}|${YYYY-MM}` → { qtd, valor, custo }
  const ultima = new Map()          // `${cod}|${loja}` → 'YYYY-MM-DD'
  const produtos = new Map()        // cod → { descricao, referencia }
  for (let li = 1; li < matriz.length; li++) {
    const a = matriz[li]
    if (!a) continue
    const r = Object.fromEntries(COLUNAS_RPR001.map(c => [c, a[ix[c]]]))
    const nat = txt(r.NaturezaOperacao).toUpperCase()
    const sinal = nat.startsWith('VEN') ? 1 : nat.startsWith('DVE') ? -1 : 0
    if (!sinal || num(r.ProdTipoCod) === 5) continue
    const cod = txt(r.NFItem_ProdutoCod)
    const loja = txt(r.EmpNome)
    const dia = serialParaIso(r.NF_DataMov) || serialParaIso(r.NF_Dataemis)
    const q = num(r.NFItem_Qtde)
    if (!cod || !loja || !dia || !q) continue
    const k = `${cod}|${loja}|${dia.slice(0, 7)}`
    const ag = vendas.get(k) || { qtd: 0, valor: 0, custo: 0 }
    ag.qtd += sinal * q
    ag.valor += sinal * num(r.NFItem_VlTotal)
    ag.custo += sinal * num(r.NF_ProdCusto)
    vendas.set(k, ag)
    if (sinal > 0) ultima.set(`${cod}|${loja}`, isoMax(ultima.get(`${cod}|${loja}`), dia))
    if (!produtos.has(cod)) produtos.set(cod, { descricao: txt(r.NFItem_ProdutoDes), referencia: txt(r.ProdMarcaReferencia), tipo_codigo: txt(r.ProdTipoCod) })
  }
  return { vendas, ultima, produtos }
}

// Cache em disco dos resumos (pasta temporária do SO): um mês fechado é lido do SharePoint uma vez
// só e sobrevive a reinícios do backend. A chave inclui a data de modificação — arquivo regerado = relido.
const PASTA_CACHE = path.join(os.tmpdir(), 'portal-gestor-pecas')
const arquivoCache = (chave) => path.join(PASTA_CACHE, 'v2_' + chave.replace(/[^\w.-]+/g, '_') + '.json')

async function lerCacheDisco(chave) {
  try {
    const j = JSON.parse(await fs.readFile(arquivoCache(chave), 'utf8'))
    return { vendas: new Map(j.vendas), ultima: new Map(j.ultima), produtos: new Map(j.produtos) }
  } catch { return null }
}
async function gravarCacheDisco(chave, r) {
  try {
    await fs.mkdir(PASTA_CACHE, { recursive: true })
    await fs.writeFile(arquivoCache(chave), JSON.stringify({ vendas: [...r.vendas], ultima: [...r.ultima], produtos: [...r.produtos] }))
  } catch (e) { console.warn('[GestorPecas] cache em disco indisponível:', e.message) }
}

async function resumoDoArquivo(f) {
  const chave = `${f.name}|${f.lastModifiedDateTime}`
  if (_resumoArquivo.has(chave)) return _resumoArquivo.get(chave)
  if (_resumoProm.has(chave)) return _resumoProm.get(chave)
  const p = lerCacheDisco(chave).then(async (doDisco) => {
    if (doDisco) return doDisco
    const r = resumirVendas(await baixar(f))
    await gravarCacheDisco(chave, r)
    return r
  }).then(r => {
    for (const k of _resumoArquivo.keys()) if (k.startsWith(f.name + '|')) _resumoArquivo.delete(k)
    _resumoArquivo.set(chave, r)
    return r
  }).finally(() => _resumoProm.delete(chave))
  _resumoProm.set(chave, p)
  return p
}

// Arquivos necessários para cobrir de `primeiroMes` até hoje: mensal quando existe, senão o anual
function escolherArquivosVendas(arquivos, primeiroMes) {
  const mensais = new Map(), anuais = new Map()
  for (const f of arquivos) {
    const m = RE_RPR001.exec(f.name)
    if (!m) continue
    if (m[2]) mensais.set(`${m[1]}-${m[2]}`, f)
    else anuais.set(m[1], f)
  }
  const escolhidos = new Set()
  const [ano0, mes0] = primeiroMes.split('-').map(Number)
  const hoje = new Date()
  for (let d = new Date(Date.UTC(ano0, mes0 - 1, 1)); d <= hoje; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const chave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const f = mensais.get(chave) || anuais.get(String(d.getUTCFullYear()))
    if (f) escolhidos.add(f)
  }
  return [...escolhidos]
}

async function lerVendas(primeiroMes) {
  const arquivos = escolherArquivosVendas(await listar(PASTA_VENDAS), primeiroMes)
  const vendas = new Map(), ultima = new Map(), produtos = new Map()
  // Sequencial: evita picos de memória com o arquivo anual (≈11 MB)
  for (const f of arquivos) {
    const r = await resumoDoArquivo(f)
    for (const [k, v] of r.vendas) {
      const a = vendas.get(k) || { qtd: 0, valor: 0, custo: 0 }
      a.qtd += v.qtd; a.valor += v.valor; a.custo += v.custo
      vendas.set(k, a)
    }
    for (const [k, v] of r.ultima) ultima.set(k, isoMax(ultima.get(k), v))
    for (const [k, v] of r.produtos) if (!produtos.has(k)) produtos.set(k, v)
  }
  return { vendas, ultima, produtos, arquivos: arquivos.map(f => ({ nome: f.name, atualizado: f.lastModifiedDateTime })) }
}

// ── Dataset no formato do dataProvider ───────────────────────────────────────
let _dataset = null, _datasetEm = 0, _datasetProm = null

export function limparCacheTrucks() {
  _dataset = null; _datasetEm = 0; _estoque = null; _estoqueEm = 0
}

export async function datasetTrucks({ meses, data_base, lojas, pendencias }) {
  if (!isConfigured()) throw new Error('Integração com o SharePoint não configurada no backend (AZURE_*).')
  if (_dataset && Date.now() - _datasetEm < TTL_ESTOQUE_MS && _dataset.data_base === data_base) return _dataset
  if (_datasetProm) return _datasetProm
  _datasetProm = (async () => {
    const t0 = Date.now()
    const [estoque, vendas] = [await lerEstoque(), await lerVendas(meses[0])]
    const idxMes = new Map(meses.map((m, i) => [m, i]))

    // Cadastro do item: RPR073 (qualquer loja) completa; quem só aparece nas vendas fica com o básico
    const cad = new Map()
    for (const e of estoque.linhas) {
      const c = cad.get(e.codigo)
      if (!c) cad.set(e.codigo, { ...e })
      else c.preco_publico = Math.max(c.preco_publico, e.preco_publico)
    }

    const posicoes = new Map()      // `${cod}|${loja}`
    const lojasSet = new Set(lojas)
    for (const e of estoque.linhas) {
      if (!lojasSet.has(e.empresa_nome)) continue
      posicoes.set(`${e.codigo}|${e.empresa_nome}`, {
        codigo: e.codigo, empresa_nome: e.empresa_nome,
        vendas: new Array(meses.length).fill(0),
        saldo: e.qtde_saldo, saldo_fisico: e.qtde, bloqueado: e.qtde_bloqueada, transito: e.qtde_transito,
        custo_medio: e.custo_medio,
        ultima_venda: e.ultima_venda, ultima_entrada: e.ultima_entrada || e.ultima_compra,
        localizacao: e.localizacao, dealer: e.dealer, venda_media_dealer: e.venda_media_mensal, estoque_ideal_dealer: e.estoque_ideal,
      })
    }
    // Vendas: preenche a série; item × loja sem linha no RPR073 = vendeu e está zerado
    const precoMes = new Map()       // cod → [{ qtd, valor, custo } x meses]
    for (const [k, v] of vendas.vendas) {
      const [cod, loja, mes] = k.split('|')
      if (!lojasSet.has(loja)) continue
      const i = idxMes.get(mes)
      if (i === undefined) continue
      let p = posicoes.get(`${cod}|${loja}`)
      if (!p) {
        p = { codigo: cod, empresa_nome: loja, vendas: new Array(meses.length).fill(0), saldo: 0, saldo_fisico: 0, bloqueado: 0, transito: 0, custo_medio: 0, ultima_venda: null, ultima_entrada: null, localizacao: '', dealer: null, sem_estoque_rpr073: true }
        posicoes.set(`${cod}|${loja}`, p)
      }
      p.vendas[i] += Math.max(0, v.qtd)   // devolução maior que a venda no mês não gera demanda negativa
      if (!precoMes.has(cod)) precoMes.set(cod, meses.map(() => ({ qtd: 0, valor: 0, custo: 0 })))
      const pm = precoMes.get(cod)[i]
      pm.qtd += v.qtd; pm.valor += v.valor; pm.custo += v.custo
    }
    for (const p of posicoes.values()) p.ultima_venda = isoMax(p.ultima_venda, vendas.ultima.get(`${p.codigo}|${p.empresa_nome}`))

    // Histórico de preço praticado e custo por mês (mês sem venda repete o anterior)
    const precoCusto = {}
    for (const [cod, serie] of precoMes) {
      const c = cad.get(cod)
      let ultimo = null
      const h = serie.map((s, i) => {
        if (s.qtd > 0 && s.valor > 0) ultimo = { custo: s.custo / s.qtd, preco: s.valor / s.qtd }
        return { mes: meses[i], custo: ultimo ? Math.round(ultimo.custo * 100) / 100 : null, preco: ultimo ? Math.round(ultimo.preco * 100) / 100 : null }
      })
      const primeiro = h.find(x => x.custo != null)
      for (const x of h) if (x.custo == null) { x.custo = primeiro?.custo ?? c?.custo_medio ?? 0; x.preco = primeiro?.preco ?? c?.preco_publico ?? 0 }
      precoCusto[cod] = h
    }

    // Tipo de produto (código → descrição) a partir do RPR073, para os itens que só aparecem nas vendas
    const tipoPorCodigo = new Map()
    for (const e of estoque.linhas) if (e.tipo_codigo && e.tipo_produto) tipoPorCodigo.set(e.tipo_codigo, e.tipo_produto)

    // Itens — no Gestor a dimensão "grupo" é o TIPO DE PRODUTO do Dealer.net (decisão de 28/10/2026);
    // o grupo do Dealer.net (ex.: "9LD1-Fixadores") fica em grupo_produto, só informativo
    const itens = []
    const codigos = new Set([...posicoes.values()].map(p => p.codigo))
    for (const cod of codigos) {
      const c = cad.get(cod)
      const v = vendas.produtos.get(cod)
      const h = precoCusto[cod]
      const custo = c?.custo_medio || h?.[h.length - 1]?.custo || 0
      const preco = c?.preco_publico || h?.[h.length - 1]?.preco || 0
      itens.push({
        codigo: cod,
        referencia: c?.referencia || v?.referencia || '',
        descricao: c?.descricao || v?.descricao || cod,
        grupo: c?.tipo_produto || tipoPorCodigo.get(v?.tipo_codigo) || 'Sem tipo de produto',
        grupo_produto: c?.grupo_produto || '',
        marca: c?.marca || 'Sem estoque (só vendas)',
        fornecedor: c?.marca || 'Sem estoque (só vendas)',   // sem cadastro de fornecedor: usa a marca (etapa 3)
        tipo_produto: c?.tipo_produto || '',
        grupo_lucratividade: c?.grupo_lucratividade || '',
        lead_time_dias: null,                                // → tempo de reposição padrão da Configuração
        lote_minimo: 1,
        multiplo: c?.multiplo || 1,
        custo, preco,
        custo_aquisicao: c?.valor_reposicao || custo,   // ValorReposicao do RPR073
      })
      if (!precoCusto[cod]) precoCusto[cod] = meses.map(mes => ({ mes, custo, preco }))
    }
    // Zerados sem custo médio: usa o custo da última venda
    const itemPor = new Map(itens.map(i => [i.codigo, i]))
    for (const p of posicoes.values()) if (!p.custo_medio) p.custo_medio = itemPor.get(p.codigo)?.custo || 0

    // Pedido de compra: o RPR073 só traz a quantidade (sem nº, data ou fornecedor) — etapa 2 completa
    const pedidos = estoque.linhas
      .filter(e => e.qtde_ped_compra > 0 && lojasSet.has(e.empresa_nome))
      .map(e => ({ pedido: '—', codigo: e.codigo, empresa_nome: e.empresa_nome, fornecedor: e.marca, data_pedido: null, data_prevista: null, qtd_pedida: e.qtde_ped_compra, qtd_recebida: 0, custo_unitario: e.valor_reposicao || e.custo_medio }))

    _dataset = {
      fonte: 'dealernet', segmento: 'trucks', gerado_em: new Date().toISOString(), data_base,
      meses, lojas, pendencias,
      itens, posicoes: [...posicoes.values()], compras: [], pedidos, precoCusto,
      origem: { estoque: estoque.arquivos, vendas: vendas.arquivos, montado_em_ms: Date.now() - t0 },
    }
    _datasetEm = Date.now()
    return _dataset
  })().finally(() => { _datasetProm = null })
  return _datasetProm
}
