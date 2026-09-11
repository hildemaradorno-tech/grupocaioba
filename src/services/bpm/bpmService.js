// Camada de acesso a dados + orquestração do motor de BPM (tabelas bpm_*).
// Segue o mesmo padrão do restante do projeto: as telas chamam essas funções, que falam
// diretamente com o Supabase (sem passar pelo backend Railway).
import { supabase } from '../supabaseClient'
import { parseBpmnXml, iniciarFluxo, continuarAposTarefa, encontrarLaneDoElemento, BPM_TERMINAL } from './bpmEngine'

async function registrarAuditoria({ instanceId, taskId, atorUserId, acao, antes, depois }) {
  const { error } = await supabase.from('bpm_audit_log').insert({
    instance_id: instanceId,
    task_id: taskId || null,
    ator_user_id: atorUserId || null,
    acao,
    antes: antes ?? null,
    depois: depois ?? null,
  })
  if (error) throw error
}

// ── Definições de processo ───────────────────────────────────────────────────

export async function listarDefinicoes() {
  const { data, error } = await supabase
    .from('bpm_process_definitions')
    .select('id, chave, nome, descricao, versao, status, criado_em, atualizado_em, publicado_em')
    .order('nome', { ascending: true })
    .order('versao', { ascending: false })
  if (error) throw error
  return data || []
}

export async function obterDefinicao(id) {
  const { data, error } = await supabase.from('bpm_process_definitions').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function listarDefinicoesPublicadas() {
  const { data, error } = await supabase
    .from('bpm_process_definitions')
    .select('id, chave, nome, descricao, versao, status')
    .eq('status', 'publicado')
    .order('nome', { ascending: true })
  if (error) throw error
  return data || []
}

// Salva uma definição: cria uma nova (versão 1, como rascunho) ou atualiza uma existente no
// lugar — inclusive uma já publicada. Editar uma publicada não mexe na versão nem no status;
// como o motor lê o bpmn_xml direto da definição a cada passo, isso também muda o comportamento
// de instâncias dessa definição que já estejam em andamento — é uma decisão consciente pedida
// pelo usuário (edição direta), não o padrão "seguro" de versionamento imutável do BPM.
export async function salvarDefinicao({ id, chave, nome, descricao, bpmnXml, formSchemas, elementosMeta, userId }) {
  if (id) {
    const { data, error } = await supabase
      .from('bpm_process_definitions')
      .update({
        nome, descricao, bpmn_xml: bpmnXml,
        form_schemas: formSchemas || {}, elementos_meta: elementosMeta || {},
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select().single()
    if (error) throw error
    return data
  }
  const { data: existentes, error: errBusca } = await supabase
    .from('bpm_process_definitions').select('versao').eq('chave', chave).order('versao', { ascending: false }).limit(1)
  if (errBusca) throw errBusca
  const proximaVersao = existentes && existentes.length ? existentes[0].versao + 1 : 1
  const { data, error } = await supabase
    .from('bpm_process_definitions')
    .insert({
      chave, nome, descricao, versao: proximaVersao, status: 'rascunho',
      bpmn_xml: bpmnXml, form_schemas: formSchemas || {}, elementos_meta: elementosMeta || {},
      criado_por: userId || null,
    })
    .select().single()
  if (error) throw error
  return data
}

// Exclui a definição do processo. Bloqueada pelo próprio banco (FK) se existirem instâncias
// vinculadas — a mensagem abaixo traduz esse erro para o usuário resolver antes.
export async function excluirDefinicao(id) {
  const { error } = await supabase.from('bpm_process_definitions').delete().eq('id', id)
  if (error) {
    if (error.code === '23503') {
      throw new Error('Existem instâncias vinculadas a este processo. Exclua as instâncias (aba Instâncias) antes de excluir a definição.')
    }
    throw error
  }
}

export async function publicarDefinicao(id) {
  const def = await obterDefinicao(id)
  // valida que o diagrama tem início e é interpretável antes de publicar
  const { process } = await parseBpmnXml(def.bpmn_xml)
  const inicio = (process.flowElements || []).find(el => el.$type === 'bpmn:StartEvent')
  if (!inicio) throw new Error('O diagrama precisa de um evento de início antes de ser publicado.')

  await supabase.from('bpm_process_definitions').update({ status: 'arquivado' })
    .eq('chave', def.chave).eq('status', 'publicado')

  const { data, error } = await supabase
    .from('bpm_process_definitions')
    .update({ status: 'publicado', publicado_em: new Date().toISOString() })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

// ── Instâncias ────────────────────────────────────────────────────────────────

export async function listarInstancias({ status } = {}) {
  let query = supabase
    .from('bpm_process_instances')
    .select('id, titulo, status, dados, iniciado_em, concluido_em, process_definition_id, bpm_process_definitions(nome, chave, versao)')
    .order('iniciado_em', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Dados da tarefa aberta de cada instância da lista (pra montar uma tela tipo "worklist" — etapa
// atual, setor/pessoa responsável, prazo — sem abrir cada instância uma por uma). Retorna um mapa
// { [instance_id]: { id, elemento_nome, responsavel_papel, responsavel_user_id, prazo_em } }.
export async function mapaTarefaAbertaPorInstancia(instanceIds) {
  if (!instanceIds || !instanceIds.length) return {}
  const { data, error } = await supabase
    .from('bpm_tasks')
    .select('id, instance_id, elemento_nome, responsavel_papel, responsavel_agrupamento_cargo_id, responsavel_user_id, prazo_em')
    .eq('status', 'aberta').in('instance_id', instanceIds)
  if (error) throw error
  return Object.fromEntries((data || []).map(t => [t.instance_id, t]))
}

// Exclui a instância e tudo que depende dela (tarefas, auditoria, comentários) via ON DELETE
// CASCADE das tabelas bpm_tasks/bpm_audit_log/bpm_comments — não mexe na definição do processo.
export async function excluirInstancia(id) {
  const { error } = await supabase.from('bpm_process_instances').delete().eq('id', id)
  if (error) throw error
}

export async function obterInstancia(id) {
  const { data, error } = await supabase
    .from('bpm_process_instances')
    .select('*, bpm_process_definitions(id, nome, chave, versao, bpmn_xml, form_schemas, elementos_meta)')
    .eq('id', id).single()
  if (error) throw error
  return data
}

export async function listarTarefasDaInstancia(instanceId) {
  const { data, error } = await supabase
    .from('bpm_tasks').select('*').eq('instance_id', instanceId).order('criada_em', { ascending: true })
  if (error) throw error
  return data || []
}

async function criarTarefaUsuario({ instanceId, elemento, elementosMeta, process }) {
  const meta = (elementosMeta || {})[elemento.id] || {}
  let prazoEm = null
  if (meta.prazo_horas) {
    prazoEm = new Date(Date.now() + Number(meta.prazo_horas) * 3600 * 1000).toISOString()
  }
  // A tarefa pode definir o próprio cargo responsável; se não definir, herda o da raia (Lane)
  // onde ela está desenhada no Pool — permite configurar o cargo uma vez por raia em vez de
  // repetir em cada tarefa.
  let agrupamentoCargoId = meta.responsavel_agrupamento_cargo_id || null
  if (!agrupamentoCargoId) {
    const laneId = encontrarLaneDoElemento(elemento.id, process)
    if (laneId) agrupamentoCargoId = (elementosMeta || {})[laneId]?.responsavel_agrupamento_cargo_id || null
  }
  const { data, error } = await supabase
    .from('bpm_tasks')
    .insert({
      instance_id: instanceId,
      elemento_id: elemento.id,
      elemento_nome: elemento.name || null,
      tipo: 'user',
      responsavel_papel: meta.responsavel_papel || null,
      responsavel_agrupamento_cargo_id: agrupamentoCargoId,
      prazo_em: prazoEm,
    })
    .select().single()
  if (error) throw error
  return data
}

// Aplica o resultado do motor (pausa/fim/pendência) numa instância: cria a próxima tarefa,
// encerra a instância ou marca pendência manual, e registra a auditoria.
async function aplicarResultadoMotor({ instanceId, resultado, atorUserId, elementosMeta, process }) {
  for (const entrada of resultado.log) {
    await registrarAuditoria({
      instanceId, atorUserId,
      acao: entrada.tipo === 'servico' ? `tarefa_servico:${entrada.nome || entrada.elementId}` : entrada.tipo,
      depois: entrada,
    })
  }

  if (resultado.tipo === BPM_TERMINAL.PAUSA_TAREFA) {
    const tarefa = await criarTarefaUsuario({ instanceId, elemento: resultado.elemento, elementosMeta, process })
    await supabase.from('bpm_process_instances').update({
      dados: resultado.dados, elemento_atual_ids: [resultado.elemento.id],
    }).eq('id', instanceId)
    return { status: 'em_andamento', tarefa }
  }
  if (resultado.tipo === BPM_TERMINAL.FIM) {
    await supabase.from('bpm_process_instances').update({
      dados: resultado.dados, status: 'concluido', concluido_em: new Date().toISOString(), elemento_atual_ids: [],
    }).eq('id', instanceId)
    await registrarAuditoria({ instanceId, atorUserId, acao: 'instancia_concluida', depois: resultado.dados })
    return { status: 'concluido' }
  }
  // pendência manual
  await supabase.from('bpm_process_instances').update({
    dados: resultado.dados, status: 'pendencia_manual', elemento_atual_ids: resultado.elemento ? [resultado.elemento.id] : [],
  }).eq('id', instanceId)
  await registrarAuditoria({ instanceId, atorUserId, acao: 'instancia_pendencia_manual', depois: { motivo: resultado.motivo } })
  return { status: 'pendencia_manual', motivo: resultado.motivo }
}

export async function iniciarInstancia({ definitionId, titulo, dadosIniciais, userId }) {
  const def = await obterDefinicao(definitionId)
  if (def.status !== 'publicado') throw new Error('Só é possível iniciar instâncias de um processo publicado.')
  const { process, byId } = await parseBpmnXml(def.bpmn_xml)
  void byId

  const { data: instancia, error } = await supabase
    .from('bpm_process_instances')
    .insert({ process_definition_id: definitionId, titulo: titulo || def.nome, dados: dadosIniciais || {}, iniciado_por: userId || null })
    .select().single()
  if (error) throw error

  await registrarAuditoria({ instanceId: instancia.id, atorUserId: userId, acao: 'instancia_iniciada', depois: dadosIniciais })

  const resultado = await iniciarFluxo({ process, dados: dadosIniciais || {}, elementosMeta: def.elementos_meta })
  const efeito = await aplicarResultadoMotor({ instanceId: instancia.id, resultado, atorUserId: userId, elementosMeta: def.elementos_meta, process })
  return { instanciaId: instancia.id, ...efeito }
}

export async function completarTarefa({ taskId, decisao, dadosTarefa, userId }) {
  const { data: tarefa, error: errTarefa } = await supabase.from('bpm_tasks').select('*').eq('id', taskId).single()
  if (errTarefa) throw errTarefa
  if (tarefa.status !== 'aberta') throw new Error('Esta tarefa já foi concluída.')

  const instancia = await obterInstancia(tarefa.instance_id)
  const def = instancia.bpm_process_definitions

  const { error: errUpdateTarefa } = await supabase
    .from('bpm_tasks')
    .update({ status: 'concluida', decisao: decisao || null, dados: dadosTarefa || {}, concluida_em: new Date().toISOString(), concluida_por: userId || null })
    .eq('id', taskId)
  if (errUpdateTarefa) throw errUpdateTarefa

  await registrarAuditoria({
    instanceId: instancia.id, taskId, atorUserId: userId,
    acao: `tarefa_concluida:${tarefa.elemento_nome || tarefa.elemento_id}`,
    antes: { decisao }, depois: dadosTarefa,
  })

  const dadosAtualizados = { ...(instancia.dados || {}), ...(dadosTarefa || {}) }
  const { process, byId } = await parseBpmnXml(def.bpmn_xml)
  const resultado = await continuarAposTarefa({ byId, elementoTarefaId: tarefa.elemento_id, dados: dadosAtualizados, elementosMeta: def.elementos_meta })
  const efeito = await aplicarResultadoMotor({ instanceId: instancia.id, resultado, atorUserId: userId, elementosMeta: def.elementos_meta, process })
  return { instanciaId: instancia.id, ...efeito }
}

// ── Minhas tarefas / comentários ──────────────────────────────────────────────

export async function listarMinhasTarefas({ userId }) {
  const { data, error } = await supabase
    .from('bpm_tasks')
    .select('*, bpm_process_instances(id, titulo, process_definition_id, bpm_process_definitions(nome))')
    .eq('status', 'aberta')
    .eq('responsavel_user_id', userId)
    .order('criada_em', { ascending: true })
  if (error) throw error
  return data || []
}

// Tarefas em aberto sem responsável definido por usuário (só por papel) — fila geral.
export async function listarTarefasPorPapeis({ papeis }) {
  if (!papeis || !papeis.length) return []
  const { data, error } = await supabase
    .from('bpm_tasks')
    .select('*, bpm_process_instances(id, titulo, process_definition_id, bpm_process_definitions(nome))')
    .eq('status', 'aberta')
    .is('responsavel_user_id', null)
    .in('responsavel_papel', papeis)
    .order('criada_em', { ascending: true })
  if (error) throw error
  return data || []
}

// Só permite assumir se a tarefa não exigir agrupamento de cargos nenhum, ou se o agrupamento
// de cargos do usuário bater com o exigido pela etapa (definido no Modelador) — reforça no
// servidor o mesmo filtro que a tela já aplica escondendo o botão, pra não depender só da UI.
export async function assumirTarefa({ taskId, userId }) {
  const { data: tarefa, error: errTarefa } = await supabase.from('bpm_tasks').select('responsavel_agrupamento_cargo_id').eq('id', taskId).single()
  if (errTarefa) throw errTarefa

  if (tarefa.responsavel_agrupamento_cargo_id) {
    const { data: usuario, error: errUsuario } = await supabase.from('usuarios').select('agrupamento_cargo_id').eq('id', userId).single()
    if (errUsuario) throw errUsuario
    if (usuario.agrupamento_cargo_id !== tarefa.responsavel_agrupamento_cargo_id) {
      throw new Error('Esta tarefa é exclusiva de quem está no agrupamento de cargos definido para essa etapa — você não pode assumi-la.')
    }
  }

  const { error } = await supabase.from('bpm_tasks').update({ responsavel_user_id: userId }).eq('id', taskId).is('responsavel_user_id', null)
  if (error) throw error
}

export async function listarComentarios(instanceId) {
  const { data, error } = await supabase.from('bpm_comments').select('*').eq('instance_id', instanceId).order('criado_em', { ascending: true })
  if (error) throw error
  return data || []
}

export async function adicionarComentario({ instanceId, userId, texto }) {
  const { error } = await supabase.from('bpm_comments').insert({ instance_id: instanceId, user_id: userId, texto })
  if (error) throw error
}

export async function listarAuditoria(instanceId) {
  const { data, error } = await supabase.from('bpm_audit_log').select('*').eq('instance_id', instanceId).order('criado_em', { ascending: true })
  if (error) throw error
  return data || []
}
