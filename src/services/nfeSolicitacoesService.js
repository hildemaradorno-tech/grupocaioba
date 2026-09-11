// Motor de etapas sequenciais do Cancelamento/Devolução de NF-e — lista fixa de etapas, sempre
// na mesma ordem, cada uma com um setor responsável e um prazo. Sem gateway condicional: toda
// solicitação passa pelas mesmas etapas, na mesma sequência (configurável em nfe_etapas).
import { supabase } from './supabaseClient'

async function registrarHistorico({ solicitacaoId, etapaNome, atorUserId, acao, observacao }) {
  const { error } = await supabase.from('nfe_solicitacao_historico').insert({
    solicitacao_id: solicitacaoId, etapa_nome: etapaNome || null, ator_user_id: atorUserId || null, acao, observacao: observacao || null,
  })
  if (error) throw error
}

// ── Etapas (configuração) ──────────────────────────────────────────────────

export async function listarEtapas({ apenasAtivas } = {}) {
  let query = supabase.from('nfe_etapas').select('*').order('ordem', { ascending: true })
  if (apenasAtivas) query = query.eq('ativo', true)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function salvarEtapa({ id, ordem, nome, papel, prazo_horas, ativo }) {
  const payload = { ordem, nome, papel, prazo_horas: prazo_horas || null, ativo: ativo !== false }
  if (id) {
    const { data, error } = await supabase.from('nfe_etapas').update(payload).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase.from('nfe_etapas').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function excluirEtapa(id) {
  const { error } = await supabase.from('nfe_etapas').delete().eq('id', id)
  if (error) throw error
}

function prazoEm(prazoHoras) {
  return prazoHoras ? new Date(Date.now() + Number(prazoHoras) * 3600 * 1000).toISOString() : null
}

// ── Solicitações ──────────────────────────────────────────────────────────

export async function listarSolicitacoes() {
  const { data, error } = await supabase.from('nfe_solicitacoes').select('*').order('criado_em', { ascending: false })
  if (error) throw error
  return data || []
}

export async function obterSolicitacao(id) {
  const { data, error } = await supabase.from('nfe_solicitacoes').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function listarHistorico(solicitacaoId) {
  const { data, error } = await supabase.from('nfe_solicitacao_historico').select('*').eq('solicitacao_id', solicitacaoId).order('criado_em', { ascending: true })
  if (error) throw error
  return data || []
}

export async function iniciarSolicitacao(dados, userId) {
  const etapas = await listarEtapas({ apenasAtivas: true })
  if (!etapas.length) throw new Error('Nenhuma etapa está configurada. Cadastre as etapas antes de criar uma solicitação.')
  const primeira = etapas[0]

  const { data: solicitacao, error } = await supabase
    .from('nfe_solicitacoes')
    .insert({
      ...dados,
      status: 'em_andamento',
      etapa_atual_id: primeira.id,
      etapa_atual_nome: primeira.nome,
      etapa_atual_papel: primeira.papel,
      etapa_atual_prazo_em: prazoEm(primeira.prazo_horas),
      criado_por: userId || null,
    })
    .select().single()
  if (error) throw error

  await registrarHistorico({ solicitacaoId: solicitacao.id, atorUserId: userId, acao: 'iniciada' })
  return solicitacao
}

export async function assumirEtapa({ solicitacaoId, userId }) {
  const { error } = await supabase
    .from('nfe_solicitacoes')
    .update({ etapa_atual_responsavel_user_id: userId })
    .eq('id', solicitacaoId).is('etapa_atual_responsavel_user_id', null)
  if (error) throw error
  await registrarHistorico({ solicitacaoId, atorUserId: userId, acao: 'assumida' })
}

// decisao: 'aprovado' | 'reprovado'
export async function avancarEtapa({ solicitacaoId, decisao, observacao, userId }) {
  const solicitacao = await obterSolicitacao(solicitacaoId)
  if (solicitacao.status !== 'em_andamento') throw new Error('Esta solicitação já foi encerrada.')

  await registrarHistorico({
    solicitacaoId, etapaNome: solicitacao.etapa_atual_nome, atorUserId: userId,
    acao: decisao === 'aprovado' ? 'aprovada' : 'reprovada', observacao,
  })

  if (decisao !== 'aprovado') {
    const { error } = await supabase.from('nfe_solicitacoes').update({
      status: 'reprovado', concluido_em: new Date().toISOString(),
      etapa_atual_id: null, etapa_atual_nome: null, etapa_atual_papel: null,
      etapa_atual_responsavel_user_id: null, etapa_atual_prazo_em: null,
    }).eq('id', solicitacaoId)
    if (error) throw error
    return { status: 'reprovado' }
  }

  const etapas = await listarEtapas({ apenasAtivas: true })
  const atual = etapas.find(e => e.id === solicitacao.etapa_atual_id)
  const proxima = etapas.find(e => e.ordem > (atual?.ordem ?? 0))

  if (proxima) {
    const { error } = await supabase.from('nfe_solicitacoes').update({
      etapa_atual_id: proxima.id, etapa_atual_nome: proxima.nome, etapa_atual_papel: proxima.papel,
      etapa_atual_responsavel_user_id: null, etapa_atual_prazo_em: prazoEm(proxima.prazo_horas),
    }).eq('id', solicitacaoId)
    if (error) throw error
    return { status: 'em_andamento', proximaEtapa: proxima.nome }
  }

  const { error } = await supabase.from('nfe_solicitacoes').update({
    status: 'aprovado', concluido_em: new Date().toISOString(),
    etapa_atual_id: null, etapa_atual_nome: null, etapa_atual_papel: null,
    etapa_atual_responsavel_user_id: null, etapa_atual_prazo_em: null,
  }).eq('id', solicitacaoId)
  if (error) throw error
  return { status: 'aprovado' }
}

export async function adicionarComentario({ solicitacaoId, userId, texto }) {
  await registrarHistorico({ solicitacaoId, atorUserId: userId, acao: 'comentario', observacao: texto })
}

export async function excluirSolicitacao(id) {
  const { error } = await supabase.from('nfe_solicitacoes').delete().eq('id', id)
  if (error) throw error
}
