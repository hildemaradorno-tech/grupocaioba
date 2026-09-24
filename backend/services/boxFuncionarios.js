/**
 * ROF042/ROF096 não trazem Box do produtivo: o vínculo vem do Cadastro de Funcionários
 * (dim_funcionarios.box_nome) pelo nome. Os valores de horas e faturamento dessas fontes
 * contam SOMENTE produtivos dos boxes de oficina abaixo; quem não está no cadastro ou não
 * tem box ("Produtivo Não Associado", etc.) fica de fora.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'

export const BOXES_OFICINA = ['Mecânica', 'Box Express']
const TTL_MS = 60_000
let _cache = { ts: 0, permitidos: null }

export function normPessoa(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')
}

async function carregarPermitidos() {
  if (_cache.permitidos && Date.now() - _cache.ts < TTL_MS) return _cache.permitidos
  const admin = getSupabaseAdmin()
  if (!admin) return null
  const permitidos = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('dim_funcionarios')
      .select('nome_funcionario, box_nome').order('id').range(from, from + 999)
    if (error) throw error
    for (const f of data || []) {
      if (BOXES_OFICINA.includes(f.box_nome)) permitidos.add(normPessoa(f.nome_funcionario))
    }
    if (!data || data.length < 1000) break
  }
  _cache = { ts: Date.now(), permitidos }
  return permitidos
}

/** Retorna fn(nome) → true se o produtivo é de um box de oficina; sem Supabase, não filtra. */
export async function getFiltroBoxOficina() {
  const permitidos = await carregarPermitidos()
  return permitidos ? (nome => permitidos.has(normPessoa(nome))) : (() => true)
}
