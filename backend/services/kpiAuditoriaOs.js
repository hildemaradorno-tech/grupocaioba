/**
 * Indicadores da Auditoria O.S. Aberta para a Matriz KPIs (Bloco 3 › Gerentes), com as mesmas regras do
 * Dashboard da Auditoria (src/pages/garantias-daf/AuditoriaOsAbertoDashboard.jsx):
 *
 *   O.S. aberta sem veículo na oficina — valor das O.S. com Na Oficina = Não ÷ valor total em aberto × 100
 *                                        (card "Total O.S. pendentes")
 *   O.S. >= 30 dias (% do Valor)       — valor das O.S. com Na Oficina = Sim e 30+ dias entre a criação da O.S.
 *                                        e a data da auditoria ÷ valor total em aberto × 100 (card "Total O.S. > 30 dias")
 *
 * Fonte: auditorias gravadas no sistema (aud_auditorias / aud_auditoria_os), só empresas Caiobá Trucks.
 * Cada período (mês, semana, trimestre, ano) usa a ÚLTIMA auditoria da empresa dentro dele; sem auditoria
 * no período = sem valor. Grupo (todas as empresas) = soma da última auditoria de cada empresa no período.
 * Meta (%, menor é melhor) = "Metas dos indicadores" da Auditoria: a do mês (aud_metas_indicadores) ou, sem
 * ela, a meta geral (aud_configuracoes) — a do mês da auditoria usada.
 *
 * Por consultor (quadro CONSULTOR DE SERVIÇOS): só as O.S. do consultor (consultor_nome) nas mesmas auditorias
 * do grupo; % sobre o valor total em aberto DELE. Chave = nome normalizado (sem acento, maiúsculo).
 */
import { getSupabaseAdmin } from './supabaseAdmin.js'
import { numeroSemanaDoDia } from './kpiSemanas.js'

const QUARTERS = { q1: [1, 2, 3], q2: [4, 5, 6], q3: [7, 8, 9], q4: [10, 11, 12] }
const CASAS = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()
// "CAIOBA TRUCKS - CAMPO GRANDE" → "CAMPO GRANDE" (só Trucks; Motos/Temm ficam fora)
function casaDaEmpresa(nome) {
  const n = norm(nome)
  if (!n.includes('TRUCKS')) return null
  if (n.includes('CAMPO GRANDE')) return 'CAMPO GRANDE'
  if (n.includes('DOURADOS')) return 'DOURADOS'
  if (n.includes('TRES LAGOAS')) return 'TRÊS LAGOAS'
  if (n.includes('CHAPADAO')) return 'CHAPADÃO DO SUL'
  return null
}

async function fetchTudo(montarQuery) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await montarQuery().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

const diasEntre = (ini, fim) => (ini && fim ? Math.floor((new Date(fim + 'T12:00:00') - new Date(ini + 'T12:00:00')) / 86400000) : null)

// Períodos em que cai uma data 'AAAA-MM-DD' do ano.
function periodosDaData(iso, ano) {
  if (!iso || Number(iso.slice(0, 4)) !== ano) return []
  const mes = Number(iso.slice(5, 7)), dia = Number(iso.slice(8, 10))
  const m = `m${String(mes).padStart(2, '0')}`
  return [m, `s${String(numeroSemanaDoDia(ano, mes, dia)).padStart(2, '0')}`, Object.keys(QUARTERS).find(q => QUARTERS[q].includes(mes)), 'fy']
}

export const normConsultor = (s) => norm(s).replace(/\s+/g, ' ')

// Resultado guardado por 60 s: a Campanha pede o quadro de cada consultor quase ao mesmo tempo.
const _memo = new Map() // ano → { ts, promessa }
// incluirHoje: considera também as auditorias de HOJE; padrão só até ontem (Matriz › Considerar o dia atual).
export function getIndicadoresAuditoriaOs(ano, { incluirHoje = false } = {}) {
  const chave = `${ano}|${incluirHoje ? 1 : 0}`
  const hit = _memo.get(chave)
  if (hit && Date.now() - hit.ts < 60_000) return hit.promessa
  const promessa = calcular(ano, incluirHoje).catch(err => { _memo.delete(chave); throw err })
  _memo.set(chave, { ts: Date.now(), promessa })
  return promessa
}

async function calcular(ano, incluirHoje = false) {
  const admin = getSupabaseAdmin()
  if (!admin) return null

  const [auds, metasMes, cfg] = await Promise.all([
    fetchTudo(() => admin.from('aud_auditorias').select('id, empresa_nome, data_auditoria, criado_em')
      .gte('data_auditoria', `${ano}-01-01`).lte('data_auditoria', `${ano}-12-31`).order('id')),
    admin.from('aud_metas_indicadores').select('mes, meta_pendentes_pct, meta_mais30_pct').eq('ano', ano).then(r => r.data || []),
    admin.from('aud_configuracoes').select('meta_pendentes_pct, meta_mais30_pct').limit(1).maybeSingle().then(r => r.data || {}),
  ])
  const hojeMS = new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 10)
  const audsTrucks = auds.map(a => ({ ...a, casa: casaDaEmpresa(a.empresa_nome) }))
    .filter(a => a.casa && (incluirHoje || String(a.data_auditoria) < hojeMS)) // sem o dia atual: auditorias até ontem
  if (!audsTrucks.length) return null

  // Totais de cada auditoria: valor total em aberto, sem veículo e 30+ dias na oficina.
  const linhas = await fetchTudo(() => admin.from('aud_auditoria_os')
    .select('auditoria_id, total, na_oficina, data_criacao, data_auditoria, consultor_nome')
    .in('auditoria_id', audsTrucks.map(a => a.id)).order('id'))
  const somaPorAud = new Map()
  const somaPorAudCons = new Map() // auditoria → Map(consultor normalizado → somas)
  const somar = (s, r) => {
    const v = Number(r.total) || 0
    s.total += v
    if (r.na_oficina === false) s.semVeiculo += v
    const d = diasEntre(r.data_criacao, r.data_auditoria)
    if (r.na_oficina === true && d !== null && d >= 30) s.mais30 += v
  }
  const novo = () => ({ total: 0, semVeiculo: 0, mais30: 0 })
  for (const r of linhas) {
    if (!somaPorAud.has(r.auditoria_id)) somaPorAud.set(r.auditoria_id, novo())
    somar(somaPorAud.get(r.auditoria_id), r)
    const c = normConsultor(r.consultor_nome)
    if (!c) continue
    if (!somaPorAudCons.has(r.auditoria_id)) somaPorAudCons.set(r.auditoria_id, new Map())
    const porCons = somaPorAudCons.get(r.auditoria_id)
    if (!porCons.has(c)) porCons.set(c, novo())
    somar(porCons.get(c), r)
  }

  // Última auditoria de cada empresa em cada período.
  const ultima = {} // casa → período → auditoria
  for (const a of audsTrucks) {
    for (const p of periodosDaData(a.data_auditoria, ano)) {
      ultima[a.casa] ||= {}
      const atual = ultima[a.casa][p]
      if (!atual || `${a.data_auditoria}|${a.criado_em || ''}` > `${atual.data_auditoria}|${atual.criado_em || ''}`) ultima[a.casa][p] = a
    }
  }

  const metaDoMes = (iso, campo) => {
    const mes = Number(String(iso).slice(5, 7))
    const linha = metasMes.find(m => Number(m.mes) === mes)
    const v = linha?.[campo] ?? cfg?.[campo]
    return v == null ? null : Number(v)
  }
  // Monta { realizado: {p: %}, meta: {p: %} } a partir das auditorias escolhidas de cada período.
  // somaDe(a) = somas da auditoria (padrão: a auditoria toda; por consultor: só as O.S. dele).
  const montar = (audsPorPeriodo, campoValor, campoMeta, somaDe = (a) => somaPorAud.get(a.id)) => {
    const realizado = {}, meta = {}
    for (const [p, lista] of Object.entries(audsPorPeriodo)) {
      const somas = lista.map(somaDe).filter(Boolean)
      const total = somas.reduce((s, x) => s + x.total, 0)
      if (!total) continue
      realizado[p] = (somas.reduce((s, x) => s + x[campoValor], 0) / total) * 100
      const maisRecente = lista.reduce((m, a) => (a.data_auditoria > m.data_auditoria ? a : m))
      meta[p] = metaDoMes(maisRecente.data_auditoria, campoMeta)
    }
    return { realizado, meta }
  }

  const porCasa = {}
  for (const casa of CASAS) {
    const porPeriodo = Object.fromEntries(Object.entries(ultima[casa] || {}).map(([p, a]) => [p, [a]]))
    porCasa[casa] = {
      semVeiculo: montar(porPeriodo, 'semVeiculo', 'meta_pendentes_pct'),
      mais30: montar(porPeriodo, 'mais30', 'meta_mais30_pct'),
    }
  }
  // Grupo: última auditoria de cada empresa no período, somadas.
  const grupoPorPeriodo = {}
  for (const casa of CASAS) {
    for (const [p, a] of Object.entries(ultima[casa] || {})) (grupoPorPeriodo[p] ||= []).push(a)
  }
  const grupo = {
    semVeiculo: montar(grupoPorPeriodo, 'semVeiculo', 'meta_pendentes_pct'),
    mais30: montar(grupoPorPeriodo, 'mais30', 'meta_mais30_pct'),
  }
  // Por consultor: as O.S. dele nas mesmas auditorias do grupo (última de cada empresa no período).
  const consultores = new Set()
  for (const m of somaPorAudCons.values()) for (const c of m.keys()) consultores.add(c)
  const porConsultor = {}
  for (const c of consultores) {
    const somaDe = (a) => somaPorAudCons.get(a.id)?.get(c)
    porConsultor[c] = {
      semVeiculo: montar(grupoPorPeriodo, 'semVeiculo', 'meta_pendentes_pct', somaDe),
      mais30: montar(grupoPorPeriodo, 'mais30', 'meta_mais30_pct', somaDe),
    }
  }
  return { porCasa, grupo, porConsultor }
}
