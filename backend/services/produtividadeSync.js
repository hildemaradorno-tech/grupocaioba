/**
 * Pós-Vendas › Indicadores de Produtividade e Eficiência — grava pv_prod_os (1 mês por vez).
 *
 * Reproduz as tabelas de fatos do Power BI "Indicadores de Produtividade e Eficiência - Pós-Vendas -
 * Caiobá" (PBIP do Lima Contabilidade). Conferido em out/2026: Hr. Disp. 5.532,00 · Hr. Disp. Reais
 * 5.022,90 · Hr. Vendidas (encerradas) 2.744,54 · Hr. Gastas (encerradas) 2.723,89 — iguais ao Power BI.
 *
 * TRUCKS (Dealer.net — SharePoint /Banco de Dados - DAF - Pós-Vendas):
 *   Fechamento Cartão Produção/{ano}/ROF096…  → Hr. Disp. (normais) e Hr. Disp. Reais (disponiveis), por Data
 *   Cartão Tarefa/ROF036_CartaoTarefa…       → Hr. Vendidas/Gastas (encerrado mecânico): Tempo Vendido, Gasto, por Data
 *   Relatório Geral OS/RELATORIOGERALOS_{ano} → Hr. Aplicadas (abertura de O.S.): Tempo Vendido por Data Criação da OS,
 *                                               sem repetir Empresa + O.S. + TMO Referência (1 vez por O.S., mesmo com 2 tipos — o Power BI repetia por tipo)
 *   Vendas Mecânicos/ROF042…                 → Hr. Vendidas/Gastas (NF emitida): Hr. Vend., Hr. Total, Vl Líquido, por NF Data;
 *                                               a coluna Consultor dá as Hr. Faturadas dos consultores
 * MOTOS (MicroWork — API, filtros em produtividadeFiltrosMicrowork.js):
 *   Apontamentos        → disponível (tempodisponivel), real (temporeal), vendido e gasto do apontamento
 *   Relatório Geral OS  → Hr. Aplicadas (tmoservico, por data de emissão da O.S.)
 *   Vendas Serviços TMO → NF emitida (tmoservico, tempogasto, totalservico + totalrevisao, por data de baixa);
 *                         cortesia só entra se for REV GRATUIT MECÂNICA (igual ao Power BI)
 */
import XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'
import { buscarRelatorioMicrowork } from './microworkIntegracao.js'
import { MW_EMPRESAS, MW_RELATORIOS } from './produtividadeFiltrosMicrowork.js'

const BASE = '/Banco de Dados - DAF - Pós-Vendas/'
// Nomes que não são pessoas e não entram no BI (pedidos do usuário, 12/11/2026):
// "Produtivo Não Associado" (Dealer.net) e "Sem Técnico" (MicroWork).
const NAO_ASSOCIADO = /produtivo\s+n[aã]o\s+associado|^\s*sem\s+t[eé]cnico\s*$/i
const LOTE = 1000

const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const normEmp = (s) => semAcento(s).toUpperCase().replace(/\s+/g, ' ').trim()
export const normPessoa = (s) => String(s ?? '').toUpperCase().replace(/\s+/g, ' ').trim()
const txt = (v) => (v == null ? '' : String(v).trim())
const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v == null || v === '') return 0
  const s = String(v).trim()
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : 0
}
const pad = (n) => String(n).padStart(2, '0')
// TMO "código descrição" (sem repetir o código quando a descrição já começa com ele, como no ROF036).
const tmoTxt = (ref, desc) => {
  const r = txt(ref).replace(/\s+/g, ' '), d = txt(desc).replace(/\s+/g, ' ')
  if (!d) return r
  if (!r || d.toUpperCase().startsWith(r.toUpperCase())) return d
  return `${r} ${d}`
}
// Data → 'AAAA-MM-DD'. Aceita serial do Excel, 'dd/mm/aaaa[ hh:mm]' e ISO 'aaaa-mm-ddT…'.
function dataIso(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    const d = new Date(Math.round((Math.floor(v) - 25569) * 86400000))
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`
  return null
}

// ── SharePoint ──────────────────────────────────────────────────────────────
async function listar(pasta) {
  const drive = process.env.SHAREPOINT_DRIVE_ID
  if (!drive) throw new Error('SHAREPOINT_DRIVE_ID não configurado')
  let r = await graphGet(`/drives/${drive}/root:${encodeURI(BASE + pasta)}:/children?$top=999`)
  const itens = [...(r.value || [])]
  while (r['@odata.nextLink']) {
    r = await graphGet(r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', ''))
    itens.push(...(r.value || []))
  }
  return itens.filter(i => i.file)
}

// Arquivos de um relatório para o mês: o mensal ("… AAAA.MM.xlsx") ou, se não houver, o anual
// ("… AAAA.xlsx" / "…_AAAA.xlsx"). As linhas ainda são filtradas pela data do mês depois.
function arquivosDoMes(itens, prefixo, ano, mes) {
  const doRel = itens.filter(i => i.name.toUpperCase().startsWith(prefixo.toUpperCase()))
  const mensal = doRel.filter(i => i.name.includes(`${ano}.${pad(mes)}`))
  if (mensal.length) return mensal
  return doRel.filter(i => new RegExp(`[ _]${ano}\\.xlsx?$`, 'i').test(i.name))
}

// Leitura isolada numa função (disciplina de memória do módulo: buffer/workbook saem de escopo ao retornar).
async function lerAoA(item) {
  const buf = (await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 180_000 })).data
  const wb = XLSX.read(buf, { type: 'buffer', dense: true })
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true })
}

// Acha a linha de cabeçalho (a que contém todas as colunas pedidas) e devolve { dados, col }.
function cabecalho(aoa, colunas, arquivo) {
  for (let i = 0; i < Math.min(aoa.length, 10); i++) {
    const linha = (aoa[i] || []).map(c => txt(c).toUpperCase())
    if (colunas.every(c => linha.includes(c.toUpperCase()))) {
      const col = {}
      for (const c of colunas) col[c] = linha.indexOf(c.toUpperCase())
      return { dados: aoa.slice(i + 1), col }
    }
  }
  throw new Error(`${arquivo}: colunas não encontradas (${colunas.join(', ')})`)
}

// ── Acumulador ──────────────────────────────────────────────────────────────
function novoAcumulador() {
  const mapa = new Map()
  const add = (data, marca, empresa, papel, pessoa, os, tipoOs, campos, tmo = '') => {
    // Mecânico sem nome continua somando nos totais (como no Power BI); consultor sem nome não entra.
    if (!data || (!pessoa && papel === 'consultor')) return
    // "Produtivo Não Associado" / "Sem Técnico" não são mecânicos: fora do BI, em qualquer relatório.
    if (papel === 'mecanico' && NAO_ASSOCIADO.test(pessoa)) return
    const chave = `${data}|${empresa}|${papel}|${pessoa}|${os}|${tipoOs}|${tmo}`
    let l = mapa.get(chave)
    if (!l) {
      l = { data, marca, empresa, papel, pessoa, os, tipo_os: tipoOs, tmo, hr_disp: 0, hr_disp_reais: 0, hr_aplic: 0, hr_vend_enc: 0, hr_gasto_enc: 0, hr_vend_fat: 0, hr_gasto_fat: 0, vl_servicos: 0 }
      mapa.set(chave, l)
    }
    for (const k in campos) l[k] += campos[k] || 0
  }
  return { mapa, add }
}

async function mapaEmpresas(admin) {
  const { data, error } = await admin.from('dim_empresas').select('empresa_fantasia, nome_empresa_sistema')
  if (error) throw error
  const m = new Map()
  for (const e of data || []) if (e.nome_empresa_sistema) m.set(normEmp(e.nome_empresa_sistema), e.empresa_fantasia)
  return (nome) => m.get(normEmp(nome)) || txt(nome).replace(/\s+/g, ' ')
}

// ── TRUCKS ──────────────────────────────────────────────────────────────────
async function lerTrucks(ano, mes, empresa, acc) {
  const doMes = (d) => d && d.startsWith(`${ano}-${pad(mes)}`)
  const det = {}
  const M = 'TRUCKS'

  // ROF096 — Fechamento Cartão Produção (subpasta do ano)
  const f096 = arquivosDoMes(await listar(`Fechamento Cartão Produção/${ano}`), 'ROF096', ano, mes)
  det.rof096 = f096.map(f => f.name)
  for (const f of f096) {
    const { dados, col } = cabecalho(await lerAoA(f), ['Empresa_Nome', 'Data', 'Usuario_Nome', 'normais', 'disponiveis'], f.name)
    for (const r of dados) {
      const d = dataIso(r[col.Data])
      if (!r[col.Empresa_Nome] || !doMes(d)) continue
      acc.add(d, M, empresa(r[col.Empresa_Nome]), 'mecanico', normPessoa(r[col.Usuario_Nome]), '', '',
        { hr_disp: num(r[col.normais]), hr_disp_reais: num(r[col.disponiveis]) })
    }
  }

  // ROF036 — Cartão Tarefa
  const f036 = arquivosDoMes(await listar('Cartão Tarefa'), 'ROF036', ano, mes)
  det.rof036 = f036.map(f => f.name)
  for (const f of f036) {
    const { dados, col } = cabecalho(await lerAoA(f), ['Empresa', 'OS Número', 'Tipo', 'Data', 'Gasto', 'Produtivo', 'Tempo Vendido', 'TMO'], f.name)
    for (const r of dados) {
      const d = dataIso(r[col.Data])
      if (!r[col.Empresa] || !doMes(d)) continue
      acc.add(d, M, empresa(r[col.Empresa]), 'mecanico', normPessoa(r[col.Produtivo]), txt(r[col['OS Número']]), txt(r[col.Tipo]),
        { hr_vend_enc: num(r[col['Tempo Vendido']]), hr_gasto_enc: num(r[col.Gasto]) }, tmoTxt(r[col.TMO]))
    }
  }

  // RELATORIOGERALOS — Relatório Geral OS (anual)
  const itensOs = await listar('Relatório Geral OS')
  const fOs = itensOs.filter(i => new RegExp(`^RELATORIOGERALOS.*${ano}`, 'i').test(i.name))
  det.relatorioGeralOs = fOs.map(f => f.name)
  for (const f of fOs) {
    const { dados, col } = cabecalho(await lerAoA(f),
      ['Empresa', 'Data Criacao da OS', 'OS Numero', 'Tipo OS Sigla', 'TMO Referencia', 'TMO Descricao', 'Produtivo Nome', 'Tempo Vendido'], f.name)
    const vistos = new Set()
    for (const r of dados) {
      const emp = txt(r[col.Empresa])
      if (!emp || emp === 'Empresa') continue
      const d = dataIso(r[col['Data Criacao da OS']])
      if (!doMes(d)) continue
      const os = txt(r[col['OS Numero']]), sigla = txt(r[col['Tipo OS Sigla']])
      // Cada TMO conta 1 vez por O.S., mesmo com a O.S. em mais de um tipo (ex.: V02 e V04) — fica no 1º tipo em
      // que aparece. O Power BI repetia por tipo (Empresa + O.S. + Tipo + TMO) e contava em dobro; mudado a pedido do usuário, 12/11/2026.
      const chave = `${emp}|${os}|${txt(r[col['TMO Referencia']])}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      acc.add(d, M, empresa(emp), 'mecanico', normPessoa(r[col['Produtivo Nome']]), os, sigla, { hr_aplic: num(r[col['Tempo Vendido']]) },
        tmoTxt(r[col['TMO Referencia']], r[col['TMO Descricao']]))
    }
  }

  // ROF042 — Vendas Mecânicos (NF emitida)
  const f042 = arquivosDoMes(await listar('Vendas Mecânicos'), 'ROF042', ano, mes)
  det.rof042 = f042.map(f => f.name)
  for (const f of f042) {
    const { dados, col } = cabecalho(await lerAoA(f),
      ['Empresa', 'Produtivo', 'Consultor', 'Tipo O.S.', 'O.S.', 'TMO Referência', 'TMO Descrição', 'Hr. Total', 'Hr. Vend.', 'Vl Líquido', 'NF Data'], f.name)
    for (const r of dados) {
      const emp = txt(r[col.Empresa])
      if (!emp || emp === 'Empresa') continue
      const d = dataIso(r[col['NF Data']])
      if (!doMes(d)) continue
      const os = txt(r[col['O.S.']]), tipo = txt(r[col['Tipo O.S.']]).split(' - ')[0]
      const vend = num(r[col['Hr. Vend.']]), vl = num(r[col['Vl Líquido']])
      const tmo = tmoTxt(r[col['TMO Referência']], r[col['TMO Descrição']])
      // "Produtivo Não Associado" (serviço de terceiro, sem mecânico) não entra no BI — nem no mecânico nem no
      // consultor da O.S. (pedido do usuário, 12/11/2026; é o que o Power BI faz nas Hr. Faturadas do consultor).
      if (NAO_ASSOCIADO.test(txt(r[col.Produtivo]))) continue
      acc.add(d, M, empresa(emp), 'mecanico', normPessoa(r[col.Produtivo]), os, tipo, { hr_vend_fat: vend, hr_gasto_fat: num(r[col['Hr. Total']]), vl_servicos: vl }, tmo)
      acc.add(d, M, empresa(emp), 'consultor', normPessoa(r[col.Consultor]), os, tipo, { hr_vend_fat: vend, vl_servicos: vl }, tmo)
    }
  }
  return det
}

// ── MOTOS ───────────────────────────────────────────────────────────────────
async function relatorioMw(rel, ano, mes) {
  const data = await buscarRelatorioMicrowork({
    ...rel.ids, ididioma: 1, listaempresas: MW_EMPRESAS, filtrosFixos: rel.filtros,
    campoPeriodoInicio: rel.campoInicio, campoPeriodoFim: rel.campoFim, ano, mes,
  })
  if (Array.isArray(data)) return data
  return data?.value || data?.data || []
}

const SIGLA_MOTOS = { CGR: 'CAIOBÁ - CAMPO GRANDE', TEM: 'TEMM MOTOS - BARRETOS' }

async function lerMotos(ano, mes, empresa, acc) {
  const doMes = (d) => d && d.startsWith(`${ano}-${pad(mes)}`)
  const M = 'MOTOS'
  const osTxt = (n) => (n == null || n === 0 || n === '0' ? '' : txt(n))

  const apont = await relatorioMw(MW_RELATORIOS.apontamentos, ano, mes)
  for (const a of apont) {
    const d = dataIso(a.datainicialapontamento)
    if (!doMes(d)) continue
    const sigla = txt(a.descricaoreduzida).toUpperCase()
    acc.add(d, M, empresa(SIGLA_MOTOS[sigla] || sigla), 'mecanico', normPessoa(a.pessoatecnico), osTxt(a.numero), txt(a.ostipo), {
      hr_disp: num(a.tempodisponivelcentesimal), hr_disp_reais: num(a.temporealcentesimal),
      hr_vend_enc: num(a.tempo_vendido_centesimal), hr_gasto_enc: num(a.tempogastocentesimal),
    }, osTxt(a.numero) ? tmoTxt(a.servico) : '')
  }

  const relOs = await relatorioMw(MW_RELATORIOS.relatorioGeralOs, ano, mes)
  for (const r of relOs) {
    const d = dataIso(r.datahoraemissao)
    if (!doMes(d)) continue
    acc.add(d, M, empresa(r.fantasiaempresa), 'mecanico', normPessoa(r.tecniconome), osTxt(r.numero), txt(r.ostipo), { hr_aplic: num(r.tmoservicocentesimal) }, tmoTxt(r.servicomercadoria))
  }

  const vendas = await relatorioMw(MW_RELATORIOS.vendasServicos, ano, mes)
  for (const v of vendas) {
    const d = dataIso(v.datahorabaixa)
    if (!doMes(d)) continue
    const tipoItem = txt(v.tipoitem).toUpperCase(), tipoServ = txt(v.tiposervico).toUpperCase()
    if (tipoItem === 'CORTESIA' && tipoServ !== 'REV GRATUIT MECÂNICA') continue
    const emp = empresa(v.fantasiaempresa), os = osTxt(v.numero), tipo = txt(v.ostipo)
    const vend = num(v.tmoservicocentesimal), vl = num(v.totalservico) + num(v.totalrevisao)
    const tmo = tmoTxt(v.servicomercadoria)
    acc.add(d, M, emp, 'mecanico', normPessoa(v.tecniconome), os, tipo, { hr_vend_fat: vend, hr_gasto_fat: num(v.tempogastocentesimal), vl_servicos: vl }, tmo)
    acc.add(d, M, emp, 'consultor', normPessoa(v.pessoaconsultor), os, tipo, { hr_vend_fat: vend, vl_servicos: vl }, tmo)
  }
  return { apontamentos: apont.length, relatorioGeralOs: relOs.length, vendasServicos: vendas.length }
}

// ── Gravação ────────────────────────────────────────────────────────────────
// 6 casas: o MicroWork manda tempos com muitas casas (ex.: 0,4472); arredondar cada linha a 4 casas já
// desviava 0,01 h no total do mês em relação ao Power BI.
const r4 = (v) => Math.round(v * 1e6) / 1e6

async function gravar(admin, ano, mes, marca, linhas, detalhes) {
  const ini = `${ano}-${pad(mes)}-01`
  const fim = new Date(Date.UTC(ano, mes, 0)).toISOString().slice(0, 10)
  const agora = new Date().toISOString()
  const { error: delErr } = await admin.from('pv_prod_os').delete().eq('marca', marca).gte('data', ini).lte('data', fim)
  if (delErr) throw delErr
  const regs = linhas.map(l => ({
    ...l,
    hr_disp: r4(l.hr_disp), hr_disp_reais: r4(l.hr_disp_reais), hr_aplic: r4(l.hr_aplic),
    hr_vend_enc: r4(l.hr_vend_enc), hr_gasto_enc: r4(l.hr_gasto_enc), hr_vend_fat: r4(l.hr_vend_fat),
    hr_gasto_fat: r4(l.hr_gasto_fat), vl_servicos: r4(l.vl_servicos), atualizado_em: agora,
  }))
  for (let i = 0; i < regs.length; i += LOTE) {
    const { error } = await admin.from('pv_prod_os').insert(regs.slice(i, i + LOTE))
    if (error) throw error
  }
  const { error } = await admin.from('pv_prod_sync').upsert(
    { ano, mes, marca, linhas: regs.length, detalhes, atualizado_em: agora }, { onConflict: 'ano,mes,marca' })
  if (error) throw error
  return regs.length
}

let _emExecucao = false

/**
 * Relê e grava 1 mês, Trucks e Motos separados: se a leitura de uma marca falhar, os dados que já
 * estavam gravados dela ficam como estavam (nada é apagado antes de ler tudo).
 */
export async function sincronizarProdutividadeMes(admin, ano, mes) {
  if (!admin) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  if (_emExecucao) throw new Error('Já existe uma atualização do BI de Produtividade em andamento.')
  _emExecucao = true
  try {
    const empresa = await mapaEmpresas(admin)
    const resultado = {}
    for (const [marca, ler] of [['TRUCKS', lerTrucks], ['MOTOS', lerMotos]]) {
      try {
        const acc = novoAcumulador()
        const detalhes = await ler(ano, mes, empresa, acc)
        const linhas = await gravar(admin, ano, mes, marca, [...acc.mapa.values()], detalhes)
        resultado[marca] = { ok: true, linhas, detalhes }
      } catch (err) {
        console.error(`[Produtividade] ${marca} ${ano}-${mes}:`, err.message)
        resultado[marca] = { ok: false, erro: err.message }
      }
    }
    return resultado
  } finally {
    _emExecucao = false
  }
}

// ── Metas (Planejamento de Metas — só as aprovadas) ─────────────────────────
// Aprovada = meta_aprovada igual à meta_faturamento (mesma regra da Matriz KPIs, kpiMetas.js).
const aprovada = (r) => r.meta_aprovada != null && Math.abs((Number(r.meta_faturamento) || 0) - Number(r.meta_aprovada)) <= 0.001

async function lerTudo(consulta) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta().range(de, de + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// Box de cada mecânico em todas as metas APROVADAS (anos pedidos + o ano anterior): a tela usa a do mês
// mais recente até o fim do período quando a pessoa não tem meta aprovada no próprio período (como o
// Power BI fazia). Pedido do usuário, 12/11/2026 — ex.: meta aprovada até out, período em nov.
async function boxMetasAprovadas(admin, anos, fora) {
  const todos = [...new Set([...anos, Math.min(...anos) - 1])]
  const linhas = await lerTudo(() => admin.from('fato_rascunho_metas_servicos_mecanico')
    .select('id, colaborador_nome, ano, mes, box_nome, meta_faturamento, meta_aprovada').in('ano', todos).order('id'))
  return linhas
    .filter(r => aprovada(r) && r.colaborador_nome && r.box_nome && !NAO_ASSOCIADO.test(r.colaborador_nome) && !fora(r.colaborador_nome))
    .map(r => ({ pessoa: normPessoa(r.colaborador_nome), ano: r.ano, mes: r.mes, box: r.box_nome }))
}

/**
 * Metas de horas do período (anos/meses). Mecânico: Horas Disp. × Produtividade % do planejamento
 * (Serviços — Mecânico). Consultor: % do consultor (Distribuição — Consultores) × soma das metas de
 * horas dos mecânicos da mesma empresa e setor. Também devolve Box, Setor e Cargo de cada pessoa.
 */
export async function metasProdutividade(admin, anos) {
  // Setores fora do BI (pedidos do usuário, 12/11/2026): Funilaria/Pintura e Montagem/Revisão Entrega.
  const FUNILARIA = /funilaria|montagem/i
  const [emps, mec, con, setores, funcs] = await Promise.all([
    admin.from('dim_empresas').select('id, empresa_fantasia').then(r => { if (r.error) throw r.error; return r.data }),
    lerTudo(() => admin.from('fato_rascunho_metas_servicos_mecanico')
      .select('id, empresa_id, setor_nome, box_nome, cargo_nome, colaborador_nome, ano, mes, dias_uteis_reais, horas_disponiveis, produtividade, meta_faturamento, meta_aprovada, aprovado_em, aprovado_por_nome')
      .in('ano', anos).order('id')),
    lerTudo(() => admin.from('fato_rascunho_metas_servicos_consultor')
      .select('id, empresa_id, setor_nome, box_nome, cargo_nome, colaborador_nome, ano, mes, percentual, meta_faturamento, meta_aprovada, aprovado_em, aprovado_por_nome')
      .in('ano', anos).order('id')),
    admin.from('dim_setores').select('id, nome_setor').then(r => { if (r.error) throw r.error; return r.data }),
    lerTudo(() => admin.from('dim_funcionarios').select('id, nome_funcionario, setor_ids, box_nome, ativo').order('id')),
  ])
  const nomeEmp = new Map(emps.map(e => [e.id, e.empresa_fantasia]))

  // Funcionários dos setores Funilaria/Pintura e Montagem/Revisão Entrega: não aparecem no BI.
  // Vale o setor do cadastro de Funcionários OU o setor da pessoa no Planejamento de Metas.
  const setoresFunilaria = new Set(setores.filter(s => FUNILARIA.test(s.nome_setor || '')).map(s => String(s.id)))
  const excluidos = new Set()
  for (const f of funcs) {
    const ids = Array.isArray(f.setor_ids) ? f.setor_ids : []
    if (f.nome_funcionario && ids.some(id => setoresFunilaria.has(String(id)))) excluidos.add(normPessoa(f.nome_funcionario))
  }
  for (const r of [...mec, ...con]) if (r.colaborador_nome && FUNILARIA.test(r.setor_nome || '')) excluidos.add(normPessoa(r.colaborador_nome))
  const fora = (nome) => excluidos.has(normPessoa(nome))

  const out = []
  // Meses do planejamento que NÃO entram (sem aprovação) — a tela mostra no quadro da meta (ícone de alvo).
  const pendentes = []
  const r2 = (v) => Math.round(v * 100) / 100
  const base = (r, papel) => ({
    ano: r.ano, mes: r.mes, papel, empresa: nomeEmp.get(r.empresa_id) || '', pessoa: normPessoa(r.colaborador_nome),
    box: r.box_nome || '', setor: r.setor_nome || '', cargo: r.cargo_nome || '',
  })
  const pool = new Map() // ano|mes|empresa_id|setor → soma meta horas dos mecânicos
  for (const r of mec) {
    // "Produtivo Não Associado" existe no planejamento, mas não é mecânico: fora do BI.
    if (!r.colaborador_nome || NAO_ASSOCIADO.test(r.colaborador_nome) || fora(r.colaborador_nome)) continue
    const meta = (Number(r.horas_disponiveis) || 0) * (Number(r.produtividade) || 0) / 100
    // Parcelas da conta (Planejamento de Metas › Serviços — Mecânico): Horas Meta = Horas Disponíveis × Produtividade %.
    const conta = { dias_trabalhar: Number(r.dias_uteis_reais) || null, horas_disp: Number(r.horas_disponiveis) || 0, produtividade: Number(r.produtividade) || 0 }
    if (!aprovada(r)) { pendentes.push({ ...base(r, 'mecanico'), ...conta, meta_horas: r2(meta) }); continue }
    const k = `${r.ano}|${r.mes}|${r.empresa_id}|${normEmp(r.setor_nome)}`
    // Soma das metas JÁ ARREDONDADAS (as mesmas que a tela soma no total dos mecânicos).
    pool.set(k, (pool.get(k) || 0) + r2(meta))
    out.push({ ...base(r, 'mecanico'), ...conta, meta_horas: r2(meta), aprovado_em: r.aprovado_em, aprovado_por: r.aprovado_por_nome || '' })
  }
  // Consultor: % da Distribuição — Consultores × soma das Horas Meta (aprovadas) dos mecânicos da mesma empresa e setor.
  // Os centavos são distribuídos (maior resto) para a soma dos consultores do grupo fechar exatamente com a soma
  // dos mecânicos — arredondar cada consultor sozinho deixava o total alguns centavos diferente.
  const metaCons = new Map() // id da linha → meta em horas
  const grupos = new Map()
  for (const r of con) {
    if (!r.colaborador_nome || fora(r.colaborador_nome)) continue
    const k = `${r.ano}|${r.mes}|${r.empresa_id}|${normEmp(r.setor_nome)}`
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(r)
  }
  for (const [k, rs] of grupos) {
    const somaCent = Math.round((pool.get(k) || 0) * 100)
    const brutos = rs.map(r => somaCent * (Number(r.percentual) || 0) / 100)
    const cents = brutos.map(Math.floor)
    const pctTotal = rs.reduce((s, r) => s + (Number(r.percentual) || 0), 0)
    // Só redistribui quando os percentuais fecham 100% (senão o total já não bate por definição).
    let sobra = Math.abs(pctTotal - 100) < 0.001 ? somaCent - cents.reduce((s, c) => s + c, 0) : 0
    if (sobra === 0 && Math.abs(pctTotal - 100) >= 0.001) brutos.forEach((b, i) => { cents[i] = Math.round(b) })
    const ordem = brutos.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0])
    for (let j = 0; sobra > 0 && j < ordem.length; j++, sobra--) cents[ordem[j][1]]++
    rs.forEach((r, i) => metaCons.set(r.id, cents[i] / 100))
  }
  for (const r of con) {
    if (!metaCons.has(r.id)) continue
    const soma = pool.get(`${r.ano}|${r.mes}|${r.empresa_id}|${normEmp(r.setor_nome)}`) || 0
    const conta = { percentual: Number(r.percentual) || 0, base_horas: r2(soma) }
    const meta = metaCons.get(r.id)
    if (!aprovada(r)) { pendentes.push({ ...base(r, 'consultor'), ...conta, meta_horas: meta }); continue }
    out.push({ ...base(r, 'consultor'), ...conta, meta_horas: meta, aprovado_em: r.aprovado_em, aprovado_por: r.aprovado_por_nome || '' })
  }
  // Box do cadastro de Funcionários — a tela usa quando a pessoa não tem meta aprovada no período
  // (pedido do usuário, 12/11/2026). Mesmo nome em mais de um cadastro: vale o ativo.
  const boxCadastro = new Map()
  for (const f of funcs) {
    if (!f.nome_funcionario || !f.box_nome) continue
    const k = normPessoa(f.nome_funcionario)
    if (!boxCadastro.has(k) || f.ativo) boxCadastro.set(k, f.box_nome)
  }
  return {
    metas: out,
    pendentes,
    excluidos: [...excluidos],
    boxCadastro: [...boxCadastro].map(([pessoa, box]) => ({ pessoa, box })),
    boxMetas: await boxMetasAprovadas(admin, anos, fora),
  }
}
