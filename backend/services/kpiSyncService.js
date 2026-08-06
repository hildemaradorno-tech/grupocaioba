/**
 * Sincronização agendada dos dados de KPI/Matriz KPIs: lê o SharePoint uma
 * vez (reaproveitando as mesmas funções de sharepointKpi.js/sharepointExtractor.js
 * que os endpoints ao vivo já usam) e grava o resultado no Supabase, para as
 * telas pararem de acessar o SharePoint a cada carregamento.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { getResultados, getBloco1, getBloco2, getBacklog } from './sharepointKpi.js'
import {
  getConsolidatedKpiData,
  extractServicosOficina,
  extractROF042,
  extractROF096,
  extractBalcao,
} from './sharepointExtractor.js'
import { EMPRESAS_SYNC } from './kpiEmpresas.js'

const FONTES_PLANILHA = [
  { chave: 'resultados', fn: getResultados },
  { chave: 'bloco1', fn: getBloco1 },
  { chave: 'bloco2', fn: getBloco2 },
  { chave: 'backlog', fn: getBacklog },
]

// Ordem importa: cada fonte é lida sequencialmente, nunca em paralelo — mesma
// disciplina de memória já validada no motor de Comissões (nunca paralelizar
// leituras pesadas de Excel do SharePoint).
const FONTES_EXTRATOR = [
  { fonte: 'CONSOLIDADO', fn: getConsolidatedKpiData },
  { fonte: 'SERVICOS_OFICINA', fn: extractServicosOficina },
  { fonte: 'ROF042', fn: extractROF042 },
  { fonte: 'ROF096', fn: extractROF096 },
  { fonte: 'BALCAO', fn: extractBalcao },
]

// Trava simples em memória — evita duas sincronizações rodando ao mesmo tempo
// no mesmo processo (ex.: clique duplo em "Atualizar Agora" ou o tick do
// scheduler disparando junto com uma execução manual em andamento). Rodar
// dois passes completos do Extractor em paralelo dobraria o uso de memória
// à toa no Railway.
let emExecucao = false
export function sincronizacaoEmAndamento() { return emExecucao }

export async function executarSincronizacao(origem, usuarioEmail = null) {
  if (!getSupabaseAdmin()) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados no backend.')
  if (emExecucao) throw new Error('Já existe uma sincronização em andamento.')
  emExecucao = true

  try {
    return await _executar(origem, usuarioEmail)
  } finally {
    emExecucao = false
  }
}

async function _executar(origem, usuarioEmail) {
  const supabaseAdmin = getSupabaseAdmin()
  const ano = new Date().getFullYear()
  const { data: execucao, error: insertErr } = await supabaseAdmin
    .from('kpi_sync_execucoes')
    .insert([{ status: 'EXECUTANDO', disparado_por: origem, usuario_email: usuarioEmail }])
    .select()
    .single()
  if (insertErr) throw insertErr

  const detalhes = { planilhas: [], extrator: [] }
  let sucessos = 0
  let falhas = 0

  for (const { chave, fn } of FONTES_PLANILHA) {
    try {
      const dados = await fn()
      const { error } = await supabaseAdmin
        .from('kpi_cache_planilhas')
        .upsert({ chave, dados, atualizado_em: new Date().toISOString() })
      if (error) throw error
      detalhes.planilhas.push({ chave, ok: true })
      sucessos++
    } catch (err) {
      detalhes.planilhas.push({ chave, ok: false, erro: err.message })
      falhas++
    }
  }

  for (const empresa of EMPRESAS_SYNC) {
    for (const { fonte, fn } of FONTES_EXTRATOR) {
      try {
        const dados = await fn(ano, empresa === 'todas' ? null : empresa)
        const { error } = await supabaseAdmin
          .from('kpi_cache_extrator')
          .upsert(
            { fonte, ano, empresa, dados: dados ?? null, atualizado_em: new Date().toISOString() },
            { onConflict: 'fonte,ano,empresa' }
          )
        if (error) throw error
        detalhes.extrator.push({ fonte, empresa, ok: true })
        sucessos++
      } catch (err) {
        detalhes.extrator.push({ fonte, empresa, ok: false, erro: err.message })
        falhas++
      }
    }
  }

  const status = falhas === 0 ? 'SUCESSO' : (sucessos === 0 ? 'ERRO' : 'PARCIAL')
  await supabaseAdmin
    .from('kpi_sync_execucoes')
    .update({ status, finalizado_em: new Date().toISOString(), detalhes })
    .eq('id', execucao.id)

  return { execucaoId: execucao.id, status, detalhes }
}

export async function getCachePlanilha(chave) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return null
  const { data } = await supabaseAdmin.from('kpi_cache_planilhas').select('dados').eq('chave', chave).maybeSingle()
  return data?.dados ?? null
}

export async function getCacheExtrator(fonte, ano, empresa) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return null
  const { data } = await supabaseAdmin
    .from('kpi_cache_extrator')
    .select('dados')
    .eq('fonte', fonte)
    .eq('ano', ano)
    .eq('empresa', empresa)
    .maybeSingle()
  return data?.dados ?? null
}

export async function getStatusSincronizacao() {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return { configurado: false }
  const { data: config } = await supabaseAdmin.from('kpi_sync_config').select('*').eq('id', 1).maybeSingle()
  const { data: ultimaExecucao } = await supabaseAdmin
    .from('kpi_sync_execucoes')
    .select('*')
    .order('iniciado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return { configurado: true, ativo: config?.ativo ?? true, ultimaExecucao: ultimaExecucao || null }
}
