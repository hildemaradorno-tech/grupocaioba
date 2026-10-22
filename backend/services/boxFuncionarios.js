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

// ── Filtro por Departamento + Setor (dim_funcionarios.departamento_ids/setor_ids, via
// dim_departamentos/dim_setores) — mais preciso que o Box acima: usado no indicador "Faturamento
// Total Oficina (Equipe)" da tela Fontes, que exige departamento Oficina E setor Mecânica (não
// Box Express, que o filtro de Box acima inclui).
const _cacheDepSet = new Map() // "DEPARTAMENTO|SETOR" → { ts, permitidos }
const TTL_DEP_SET_MS = 60_000

async function carregarPermitidosPorDepSetor(departamentoNome, setorNome) {
  const chave = `${departamentoNome}|${setorNome}`
  const hit = _cacheDepSet.get(chave)
  if (hit && Date.now() - hit.ts < TTL_DEP_SET_MS) return hit.permitidos

  const admin = getSupabaseAdmin()
  if (!admin) return null

  const [{ data: deps, error: eD }, { data: sets, error: eS }] = await Promise.all([
    admin.from('dim_departamentos').select('id, nome_departamento'),
    admin.from('dim_setores').select('id, nome_setor'),
  ])
  if (eD || eS) throw (eD || eS)
  const depAlvo = normPessoa(departamentoNome)
  const setAlvo = normPessoa(setorNome)
  const idsDep = new Set((deps || []).filter(d => normPessoa(d.nome_departamento) === depAlvo).map(d => String(d.id)))
  const idsSet = new Set((sets || []).filter(s => normPessoa(s.nome_setor) === setAlvo).map(s => String(s.id)))

  const permitidos = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('dim_funcionarios')
      .select('nome_funcionario, departamento_ids, setor_ids').order('id').range(from, from + 999)
    if (error) throw error
    for (const f of data || []) {
      const temDep = (f.departamento_ids || []).some(id => idsDep.has(String(id)))
      const temSet = (f.setor_ids || []).some(id => idsSet.has(String(id)))
      if (temDep && temSet) permitidos.add(normPessoa(f.nome_funcionario))
    }
    if (!data || data.length < 1000) break
  }
  _cacheDepSet.set(chave, { ts: Date.now(), permitidos })
  return permitidos
}

/** Retorna fn(nome) → true se o produtivo está no departamento E setor informados; sem Supabase, não filtra. */
export async function getFiltroDepartamentoSetor(departamentoNome, setorNome) {
  const permitidos = await carregarPermitidosPorDepSetor(departamentoNome, setorNome)
  return permitidos ? (nome => permitidos.has(normPessoa(nome))) : (() => true)
}
