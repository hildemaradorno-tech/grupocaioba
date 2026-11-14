// Pós-Vendas › Indicadores de Produtividade — regras de cálculo (mesmas medidas DAX do Power BI
// "Indicadores de Produtividade e Eficiência - Pós-Vendas - Caiobá").

export const CAMPOS = ['hr_disp', 'hr_disp_reais', 'hr_aplic', 'hr_vend_enc', 'hr_gasto_enc', 'hr_vend_fat', 'hr_gasto_fat', 'vl_servicos']

// Tipo de Visualização: qual hora vendida / gasta entra nos indicadores.
export const VISUALIZACOES = [
  { id: 'aplic', label: 'Horas Aplicadas (Abertura de O.S.)' },
  { id: 'enc', label: 'Horas Vendidas (Tempo Encerrado Mecânico)' },
  { id: 'fat', label: 'Horas Vendidas (Nota Fiscal Emitida)' },
]
const VEND = { aplic: 'hr_aplic', enc: 'hr_vend_enc', fat: 'hr_vend_fat' }
const GASTO = { aplic: null, enc: 'hr_gasto_enc', fat: 'hr_gasto_fat' }

// Faixas (Range2/Range3 do Power BI).
export const FAIXAS = {
  eficiencia: [0.8, 1.2],
  eficacia: [0.8, 1.0],
  produtividade: [0.8, 1.2],
}

export const INDICADORES = [
  { id: 'eficiencia', label: 'Eficiência %' },
  { id: 'eficacia', label: 'Eficácia %' },
  { id: 'produtividade', label: 'Produtividade %' },
]

export function somar(linhas) {
  const s = Object.fromEntries(CAMPOS.map(c => [c, 0]))
  for (const l of linhas) for (const c of CAMPOS) s[c] += Number(l[c]) || 0
  return s
}

const div = (a, b) => (a && b ? a / b : null)
const nz = (v) => (v ? v : null) // Power BI: resultado 0 vira em branco

/** Indicadores de um conjunto de somas, para o Tipo de Visualização escolhido. */
export function indicadores(s, vis) {
  const vend = nz(s[VEND[vis]])
  const gasto = GASTO[vis] ? nz(s[GASTO[vis]]) : null
  const reais = nz(s.hr_disp_reais)
  const disp = nz(s.hr_disp)
  return {
    disp, reais,
    ausentes: disp != null || reais != null ? (disp || 0) - (reais || 0) : null,
    vend, gasto,
    eficiencia: div(vend, gasto),      // Horas Vendidas ÷ Horas Gastas
    eficacia: div(vend, reais),        // Horas Vendidas ÷ Horas Disp. Reais
    produtividade: div(gasto, reais),  // Horas Gastas ÷ Horas Disp. Reais
    vl: nz(s.vl_servicos),
    moHr: div(s.vl_servicos, vend),    // Vlr. Serviços ÷ Horas Vendidas
  }
}

// ── Regras de cores (engrenagem da tela, tabela pv_prod_regras_cor) ──────────
// Regra de um indicador: { inf, sup, abaixo, meio, acima } — abaixo de inf / de inf até sup / acima de sup.
// Sem regra cadastrada no mês, valem as faixas padrão do Power BI (as duas funções abaixo, sem regra).
export const CORES = [
  { id: 'verde', label: 'Verde', hex: '#16a34a' },
  { id: 'amarelo', label: 'Amarelo', hex: '#eab308' },
  { id: 'vermelho', label: 'Vermelho', hex: '#dc2626' },
]
export const HEX_COR = Object.fromEntries(CORES.map(c => [c.id, c.hex]))
// Sugestão ao cadastrar um mês novo: as faixas do Power BI com as cores dos gráficos.
export const REGRA_PADRAO = Object.fromEntries(Object.entries(FAIXAS).map(([id, [inf, sup]]) => [id, { inf, sup, abaixo: 'vermelho', meio: 'verde', acima: 'amarelo' }]))
const corPelaRegra = (valor, r) => (valor < r.inf ? r.abaixo : valor <= r.sup ? r.meio : r.acima)
// Limites usados nos gráficos (linhas de referência / velocímetro).
export const limitesDe = (id, r) => (r ? [r.inf, r.sup] : FAIXAS[id])

// Bolinha da tabela. Sem regra (medidas KPI … do Power BI): ≥ faixa de cima verde, entre as faixas amarelo, abaixo vermelho.
export function corKpi(valor, id, r) {
  if (valor == null) return null
  if (r) return corPelaRegra(valor, r)
  const [r2, r3] = FAIXAS[id]
  return valor >= r3 ? 'verde' : valor >= r2 ? 'amarelo' : 'vermelho'
}

// Cor das barras e do velocímetro. Sem regra (como os visuais do Power BI): abaixo da faixa de baixo vermelho,
// entre as faixas verde, acima da faixa de cima amarelo.
export function corFaixa(valor, id, r) {
  if (valor == null) return '#cbd5e1'
  if (r) return HEX_COR[corPelaRegra(valor, r)]
  const [r2, r3] = FAIXAS[id]
  return valor < r2 ? '#dc2626' : valor <= r3 ? '#16a34a' : '#eab308'
}
// Cores das 3 partes do velocímetro (abaixo / meio / acima).
export const coresArcos = (r) => (r ? [HEX_COR[r.abaixo], HEX_COR[r.meio], HEX_COR[r.acima]] : ['#dc2626', '#16a34a', '#eab308'])

export const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

export const fmtH = (v) => (v == null ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
export const fmtPct = (v) => (v == null ? '' : (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%')
export const fmtR$ = (v) => (v == null ? '' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
