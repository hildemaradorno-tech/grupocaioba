// Regras do Sistema de Garantias DAF por mês (gar_regras_mes), cadastradas ano a ano na engrenagem.
// Cada O.S./título usa a regra do MÊS EM QUE A CONTAGEM COMEÇA:
//   dias_oficina   → criação da OS            dias_digitacao → fechamento da OS
//   dias_solucao   → digitação (criado_em)    dias_recusa    → Data Final Avaliação (sem ela, Data SG)
//   dias_nf_envio  → emissão da NF
// Mês sem valor = regra geral (gar_configuracoes).
import { apiService } from '../../services/api'

// Data ('aaaa-mm-dd', timestamp ISO ou Date) → 'aaaa-mm' no horário local
export function anoMesDe(data) {
  if (!data) return null
  if (data instanceof Date) return isNaN(data) ? null : `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
  const s = String(data)
  if (s.length > 10 && s.includes('T')) return anoMesDe(new Date(s)) // timestamp: mês local (UTC pode cair no mês seguinte)
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null
}

// Lista do banco → { 'aaaa-mm': linha }
export const indexarRegrasMes = (lista) =>
  Object.fromEntries((lista || []).map(r => [`${r.ano}-${String(r.mes).padStart(2, '0')}`, r]))

// Todas as regras mensais (tabela pequena: no máximo 12 linhas por ano). Erro → sem regras mensais.
export async function carregarRegrasMes() {
  try { return indexarRegrasMes(await apiService.getRegrasGarantiasMes()) } catch { return {} }
}

// Valor da regra no mês da data; mês sem valor (ou sem data) = regra geral
export function regraDoMes(meses, campo, data, geral) {
  const v = meses?.[anoMesDe(data)]?.[campo]
  return v != null && v !== '' ? Number(v) : geral
}

// Prazo de solução: tipo no mês → geral do mês → tipo geral → geral
export function prazoSolucaoDoMes(meses, sigla, data, porTipoGeral, solucaoGeral) {
  const s = String(sigla || '').trim()
  const m = meses?.[anoMesDe(data)]
  const v = m?.dias_solucao_por_tipo?.[s] ?? m?.dias_solucao ?? porTipoGeral?.[s] ?? solucaoGeral
  return Number(v)
}

// Texto dos cards: "14 dias" quando todos têm o mesmo prazo; "10 a 14 dias" quando variam
export function textoFaixaDias(valores, padrao) {
  const u = [...new Set((valores || []).filter(v => Number.isFinite(v)))].sort((a, b) => a - b)
  if (u.length === 0) return `${padrao} dia${padrao === 1 ? '' : 's'}`
  if (u.length === 1) return `${u[0]} dia${u[0] === 1 ? '' : 's'}`
  return `${u[0]} a ${u[u.length - 1]} dias`
}

// Existe alguma regra mensal cadastrada para o campo?
export const temRegraMensal = (meses, campo) => Object.values(meses || {}).some(r => r?.[campo] != null)
