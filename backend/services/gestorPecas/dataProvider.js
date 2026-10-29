// Gestor de Peças 2.0 — ponto único de acesso aos dados brutos. engine.js e as rotas só conhecem
// o formato abaixo; trocar a fonte de um segmento é mexer só aqui.
//
// Formato:
// {
//   fonte: 'mock' | 'dealernet' | 'aguardando_integracao', segmento: 'trucks' | 'motos',
//   data_base: 'YYYY-MM-DD', meses: ['YYYY-MM' x24], lojas: [nome], pendencias: [texto],
//   itens:     [{ codigo, descricao, grupo (= TIPO DE PRODUTO nas telas), marca, fornecedor, lead_time_dias, lote_minimo, multiplo, custo, preco }],
//   posicoes:  [{ codigo, empresa_nome, vendas:[qtd x24], saldo, custo_medio, ultima_venda, ultima_entrada }],
//   compras:   [{ codigo, empresa_nome, fornecedor, data_pedido, data_prevista, data_recebimento, qtd_pedida, qtd_recebida, custo_unitario, nf }],
//   pedidos:   [{ pedido, codigo, empresa_nome, fornecedor, data_pedido, data_prevista, qtd_pedida, qtd_recebida, custo_unitario }],
//   precoCusto:{ [codigo]: [{ mes, custo, preco }] },
// }
//
// Trucks (Dealer.net): dados simulados REMOVIDOS em 28/10/2026. Etapa 1 = RPR073 (estoque) + RPR001
// (vendas) — dealernetTrucks.js. Próximas: pedidos de compra em aberto; entradas por NF.
// Motos (MicroWork): ainda simulado (mockData.js) até a integração do MicroWork.
import { gerarDatasetMock } from './mockData.js'
import { datasetTrucks } from './dealernetTrucks.js'

const LOJAS_TRUCKS = ['CAIOBA TRUCKS - CAMPO GRANDE', 'CAIOBA TRUCKS - DOURADOS', 'CAIOBA TRUCKS - TRES LAGOAS', 'CAIOBA TRUCKS - CHAPADAO']

// Etapa 1 integrada (RPR073 + RPR001). O que ainda falta aparece como aviso nas telas.
const PENDENCIAS_TRUCKS = [
  'Pedidos de compra em aberto com nº, data, previsão e fornecedor — relatório a definir (hoje só a quantidade em pedido do RPR073)',
  'Entradas de compra por NF (data, fornecedor, qtd, custo) — relatório a definir (Anomalias de compra e Fornecedores ficam vazias)',
  'Fornecedor por item — sem cadastro; usando a marca como fornecedor',
  'RPR073 só traz itens com saldo > 0: itens zerados vêm das vendas (RPR001), sem custo médio atual nem pedido',
]

function mesesFechados(hoje, n = 24) {
  const meses = []
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - i, 1))
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return meses
}

function datasetVazio(segmento, lojas, pendencias) {
  const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0)
  const data_base = hoje.toISOString().slice(0, 10)
  return {
    fonte: 'aguardando_integracao', segmento, gerado_em: `vazio-${data_base}`, data_base,
    meses: mesesFechados(hoje), lojas, pendencias,
    itens: [], posicoes: [], compras: [], pedidos: [], precoCusto: {},
  }
}

// segmento: 'trucks' (Caioba Trucks — Dealer.net) | 'motos' (Caioba Motos — MicroWork)
export async function getDataset(segmento = 'trucks') {
  if (segmento === 'motos') return { ...gerarDatasetMock('motos'), pendencias: ['Dados simulados — integração do MicroWork ainda não iniciada'] }
  const base = datasetVazio('trucks', LOJAS_TRUCKS, PENDENCIAS_TRUCKS)
  return datasetTrucks({ meses: base.meses, data_base: base.data_base, lojas: LOJAS_TRUCKS, pendencias: PENDENCIAS_TRUCKS })
}
