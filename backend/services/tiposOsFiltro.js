/**
 * Classificação de Departamento/Setor por Tipo de O.S. (cadastro dim_tipos_os, tela "Tipos de
 * O.S."), usada pra separar faturamento por departamento/setor a partir da sigla do Tipo de O.S.
 * que vem nas linhas do relatório (ex.: TipoOS_Sigla no REL_VENDARECEPCIONISTA_REPORT) — diferente
 * do filtro por Box/Departamento do Funcionário (boxFuncionarios.js), que classifica pela pessoa.
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'

const TTL_MS = 60_000
const _cache = new Map() // "DEPARTAMENTO|SETOR" → { ts, permitidos: Set<sigla normalizada> }

function normSigla(s) {
  return String(s || '').trim().toUpperCase()
}
function normTexto(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ')
}

async function carregarSiglasPermitidas(departamentoNome, setorNome) {
  const chave = `${departamentoNome}|${setorNome}`
  const hit = _cache.get(chave)
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.permitidos

  const admin = getSupabaseAdmin()
  if (!admin) return null

  const depAlvo = normTexto(departamentoNome)
  const setAlvo = normTexto(setorNome)
  const permitidos = new Set()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from('dim_tipos_os')
      .select('sigla, departamento_nome, setor_servico, ativo').order('id').range(from, from + 999)
    if (error) throw error
    for (const t of data || []) {
      if (t.ativo === false) continue
      if (normTexto(t.departamento_nome) === depAlvo && normTexto(t.setor_servico) === setAlvo) {
        permitidos.add(normSigla(t.sigla))
      }
    }
    if (!data || data.length < 1000) break
  }
  _cache.set(chave, { ts: Date.now(), permitidos })
  return permitidos
}

/** Retorna fn(sigla) → true se o Tipo de O.S. é do departamento/setor informados; sem Supabase, não filtra. */
export async function getFiltroTipoOs(departamentoNome, setorNome) {
  const permitidos = await carregarSiglasPermitidas(departamentoNome, setorNome)
  return permitidos ? (sigla => permitidos.has(normSigla(sigla))) : (() => true)
}
