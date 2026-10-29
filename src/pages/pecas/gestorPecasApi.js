// Gestor de Peças 2.0 — acesso ao backend (cálculos) e ao Supabase (decisões do usuário: parâmetros,
// sugestões revisadas, transferências, promoções, snapshot e análises de IA salvas).
import { supabase } from '../../services/supabaseClient'
import { segmentoAtual } from './segmento'

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const API = `${BACKEND_URL}/api/gestor-pecas`

// Todo pedido leva o Gestor da tela atual (?segmento=trucks|motos)
async function req(caminho, opts = {}) {
  const sep = caminho.includes('?') ? '&' : '?'
  const r = await fetch(`${API}${caminho}${sep}segmento=${segmentoAtual().seg}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const corpo = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(corpo.error || `Erro ${r.status} ao consultar o Gestor de Peças.`)
  return corpo
}

const qs = (obj = {}) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ── Backend ──────────────────────────────────────────────────────────────────
export const getOpcoes = () => req('/opcoes')
export const getTela = (tela, filtros) => req(`/tela/${tela}${qs(filtros)}`)
export const getProduto = (codigo, filtros) => req(`/produto/${encodeURIComponent(codigo)}${qs(filtros)}`)
export const buscarProdutos = (busca) => req(`/produtos${qs({ busca })}`)
export const analisarComIA = (body) => req('/ia/analisar', { method: 'POST', body: JSON.stringify(body) })
export const chatIA = (body) => req('/ia/chat', { method: 'POST', body: JSON.stringify(body) })
export const gerarSnapshot = () => req('/snapshot', { method: 'POST' })
export const recarregarParametros = () => req('/parametros/recarregar', { method: 'POST' })
export const simularClassificacao = (parametros) => req('/simular', { method: 'POST', body: JSON.stringify({ parametros }) })

// ── Supabase ─────────────────────────────────────────────────────────────────
const seg = () => segmentoAtual().seg

async function emailAtual() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.email || null
}

function checar({ data, error }) {
  if (error) {
    if (/relation .* does not exist|Could not find the table/i.test(error.message)) throw new Error('Tabelas do Gestor de Peças ainda não criadas no Supabase (migration gestor_pecas.sql).')
    throw new Error(error.message)
  }
  return data
}

export async function salvarParametros(valores) {
  checar(await supabase.from('pec_parametros').upsert({ id: seg() === 'motos' ? 2 : 1, valores, atualizado_em: new Date().toISOString(), atualizado_por: await emailAtual() }))
  return recarregarParametros()
}

// Sugestões de compra revisadas (uma por dia de referência × item × loja)
export async function listarSugestoes(dataReferencia) {
  return checar(await supabase.from('pec_sugestao_compra').select('*').eq('segmento', seg()).eq('data_referencia', dataReferencia)) || []
}
export async function listarSugestoesRecentes(limite = 500) {
  return checar(await supabase.from('pec_sugestao_compra').select('*').eq('segmento', seg()).order('atualizado_em', { ascending: false }).limit(limite)) || []
}
export async function salvarSugestoes(linhas) {
  const usuario = await emailAtual()
  const agora = new Date().toISOString()
  return checar(await supabase.from('pec_sugestao_compra')
    .upsert(linhas.map(l => ({ ...l, segmento: seg(), usuario, atualizado_em: agora })), { onConflict: 'data_referencia,codigo,empresa_nome' })
    .select())
}

// Transferências
export async function listarTransferencias() {
  return checar(await supabase.from('pec_transferencia').select('*').eq('segmento', seg()).order('criado_em', { ascending: false }).limit(1000)) || []
}
export async function criarTransferencias(linhas) {
  const usuario = await emailAtual()
  return checar(await supabase.from('pec_transferencia').insert(linhas.map(l => ({ ...l, segmento: seg(), usuario }))).select())
}
export async function atualizarTransferencia(id, campos) {
  return checar(await supabase.from('pec_transferencia').update({ ...campos, atualizado_em: new Date().toISOString() }).eq('id', id).select())
}

// Promoções
export async function listarPromocoes() {
  return checar(await supabase.from('pec_promocao').select('*, itens:pec_promocao_itens(*)').eq('segmento', seg()).order('criado_em', { ascending: false })) || []
}
export async function criarPromocao({ nome, data_inicio, data_fim, observacao, itens }) {
  const usuario = await emailAtual()
  const [promo] = checar(await supabase.from('pec_promocao').insert({ nome, data_inicio, data_fim, observacao, usuario, segmento: seg() }).select())
  if (itens?.length) checar(await supabase.from('pec_promocao_itens').insert(itens.map(i => ({ ...i, promocao_id: promo.id }))))
  return promo
}
export async function atualizarPromocao(id, campos) {
  return checar(await supabase.from('pec_promocao').update(campos).eq('id', id).select())
}
export async function excluirPromocao(id) {
  return checar(await supabase.from('pec_promocao').delete().eq('id', id))
}

// Snapshot (Evolução do Produto)
export async function listarSnapshotsItem(codigo) {
  return checar(await supabase.from('pec_snapshot_item').select('*').eq('segmento', seg()).eq('codigo', codigo).order('data', { ascending: true }).limit(2000)) || []
}

// Análises de IA salvas
export async function salvarAnaliseIA({ tela, filtros, motor, resultado }) {
  return checar(await supabase.from('pec_ia_analise').insert({ tela, filtros, motor, resultado, segmento: seg(), usuario: await emailAtual() }).select())
}
export async function listarAnalisesIA(limite = 30) {
  return checar(await supabase.from('pec_ia_analise').select('*').eq('segmento', seg()).order('criado_em', { ascending: false }).limit(limite)) || []
}
