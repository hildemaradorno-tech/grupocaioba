/**
 * BI Possibilidades ("Faturamento — Total") — grava fato_bi_medidas_diario: o resultado de cada
 * Medida BI com Slot por dia × empresa × Tipo de OS × Funcionário, lido do SharePoint. A tela lê só o Supabase
 * (função bi_medidas_agregado), sem esperar a leitura dos arquivos.
 *
 * Só manual (decisão do usuário em 17/10/2026 — sem agendamento automático):
 *  - botão "Atualizar agora" da tela (POST /api/bi-medidas/sincronizar) — período filtrado;
 *  - botão "Atualizar Agora" da Matriz KPIs (kpiSyncService) — mês anterior + mês atual.
 *
 * Mesmo motor da leitura ao vivo (agregarPorDimensoes) e mesmas regras da Medida, inclusive a
 * tradução SETOR_OS → siglas de Tipos de O.S. que o frontend fazia (getRegrasParaCalculoMedidaBi).
 * Medidas são lidas uma por vez, nunca em paralelo (disciplina de memória do leitor de Excel).
 */
import { agregarPorDimensoes, normalizaTexto } from './sharepointFonteBi.js'

const LOTE = 500
const r2 = (v) => Math.round((v || 0) * 100) / 100
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Período padrão quando roda junto com a Matriz KPIs: 1º dia do mês anterior até hoje (pega correções
// lançadas no mês que já fechou).
export function periodoPadraoBi() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  return { dataInicio: isoLocal(inicio), dataFim: isoLocal(hoje) }
}

async function carregarMedidasComSlot(supabaseAdmin) {
  const { data: medidas, error } = await supabaseAdmin
    .from('dim_medidas_bi')
    .select('id, nome, slot_faturamento, ativo, coluna_valor, tipo_agregacao, fonte_bi:dim_fontes_calculo(pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho, coluna_empresa, coluna_data, coluna_tipo_os, coluna_funcionario)')
    .not('slot_faturamento', 'is', null)
    .eq('ativo', true)
  if (error) throw error
  return (medidas || []).filter(m => m.fonte_bi?.pasta_sharepoint && m.fonte_bi?.prefixo_arquivo && m.coluna_valor && m.fonte_bi?.coluna_tipo_os)
}

async function carregarRegras(supabaseAdmin, medidaId, siglasPorSetor) {
  const { data, error } = await supabaseAdmin
    .from('dim_medidas_bi_regras')
    .select('*, condicoes:dim_medidas_bi_regra_condicoes(*)')
    .eq('medida_bi_id', medidaId)
    .order('ordem', { ascending: true })
  if (error) throw error
  return (data || []).map(r => ({
    ...r,
    condicoes: [...(r.condicoes || [])]
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
      .map(c => (c.operador || '').startsWith('SETOR_OS')
        ? { ...c, valor: [...(siglasPorSetor[(c.valor || '').trim().toLowerCase()] || [])].join('|') }
        : c),
  }))
}

async function carregarSiglasPorSetor(supabaseAdmin) {
  const { data, error } = await supabaseAdmin.from('dim_tipos_os').select('sigla, setor_servico')
  if (error) throw error
  const mapa = {}
  for (const t of data || []) {
    const setor = (t.setor_servico || '').trim().toLowerCase()
    const sigla = (t.sigla || '').trim()
    if (!setor || !sigla) continue
    if (!mapa[setor]) mapa[setor] = new Set()
    mapa[setor].add(sigla)
  }
  return mapa
}

// Lê e grava uma Medida no período. Upsert + remoção do que não veio nesta leitura (ex.: nota
// cancelada) — sem janela em que o período fique vazio pra quem estiver olhando a tela.
async function sincronizarMedida(supabaseAdmin, medida, regras, { dataInicio, dataFim }) {
  const inicio = new Date().toISOString()
  const f = medida.fonte_bi
  const res = await agregarPorDimensoes({
    pastaSharepoint: f.pasta_sharepoint,
    prefixoArquivo: f.prefixo_arquivo,
    usaSubpastaAno: !!f.usa_subpasta_ano,
    linhaCabecalho: f.linha_cabecalho ? Number(f.linha_cabecalho) : 0,
    colunaEmpresa: f.coluna_empresa,
    colunaData: f.coluna_data,
    colunaValor: medida.coluna_valor,
    tipoAgregacao: medida.tipo_agregacao || 'SOMA',
    colunasDimensao: { tipo_os: f.coluna_tipo_os, empresa: f.coluna_empresa, ...(f.coluna_funcionario ? { funcionario: f.coluna_funcionario } : {}) },
    regras,
    empresaNome: null,
    dataInicio,
    dataFim,
    forcarAtualizacao: true,
    agruparPorDia: true,
  })

  // Empresa normalizada pode juntar dois grupos ("CAIOBA" e "CAIOBÁ") — consolida antes de gravar.
  const porChave = new Map()
  for (const g of res.grupos || []) {
    const empresaNorm = normalizaTexto(g.dims?.empresa)
    const tipoOs = String(g.dims?.tipo_os ?? '').trim()
    const funcionario = String(g.dims?.funcionario ?? '').trim()
    const chave = `${g.dims.data}|${empresaNorm}|${tipoOs}|${funcionario}`
    let l = porChave.get(chave)
    if (!l) {
      l = { medida_id: medida.id, data: g.dims.data, empresa_norm: empresaNorm, tipo_os: tipoOs, funcionario, soma: 0, linhas: 0, distintos: g.distintos ? new Set() : null }
      porChave.set(chave, l)
    }
    l.soma += g.soma || 0
    l.linhas += g.linhas || 0
    if (g.distintos) for (const v of g.distintos) l.distintos.add(v)
  }
  const registros = [...porChave.values()].map(l => ({
    ...l,
    soma: r2(l.soma),
    distintos: l.distintos ? [...l.distintos] : null,
    atualizado_em: inicio,
  }))

  for (let i = 0; i < registros.length; i += LOTE) {
    const { error } = await supabaseAdmin
      .from('fato_bi_medidas_diario')
      .upsert(registros.slice(i, i + LOTE), { onConflict: 'medida_id,data,empresa_norm,tipo_os,funcionario' })
    if (error) throw error
  }
  const { error: delErr } = await supabaseAdmin
    .from('fato_bi_medidas_diario')
    .delete()
    .eq('medida_id', medida.id)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .lt('atualizado_em', inicio)
  if (delErr) throw delErr

  return registros.length
}

// Trava simples em memória — evita duas sincronizações do BI ao mesmo tempo (clique duplo em
// "Atualizar agora" ou o agendamento coincidindo com um clique).
let emExecucao = false
export function sincronizacaoBiEmAndamento() { return emExecucao }

export async function sincronizarBiMedidasDiario(supabaseAdmin, periodo = periodoPadraoBi()) {
  if (!supabaseAdmin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  if (emExecucao) throw new Error('Já existe uma atualização do BI em andamento.')
  const { dataInicio, dataFim } = periodo
  if (!dataInicio || !dataFim || dataInicio > dataFim) throw new Error('Período inválido para sincronizar o BI.')
  emExecucao = true
  try {
    const medidas = await carregarMedidasComSlot(supabaseAdmin)
    const siglasPorSetor = await carregarSiglasPorSetor(supabaseAdmin)
    const detalhes = []
    for (const medida of medidas) {
      try {
        const regras = await carregarRegras(supabaseAdmin, medida.id, siglasPorSetor)
        const linhas = await sincronizarMedida(supabaseAdmin, medida, regras, { dataInicio, dataFim })
        detalhes.push({ medida: medida.nome, ok: true, linhas })
      } catch (err) {
        detalhes.push({ medida: medida.nome, ok: false, erro: err.message })
      }
    }
    return { dataInicio, dataFim, ok: detalhes.every(d => d.ok), detalhes }
  } finally {
    emExecucao = false
  }
}
