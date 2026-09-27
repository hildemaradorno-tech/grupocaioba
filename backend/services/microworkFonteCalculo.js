/**
 * microworkFonteCalculo.js
 *
 * Adapta os relatórios do MicroWork Cloud (dim_fontes_microwork) ao mesmo formato
 * array-de-arrays (linha 0 = cabeçalho) que o leitor de SharePoint produz, pra reaproveitar
 * o motor de Base de Cálculo (colunas, regras, agregação, cálculo em lote) sem duplicar lógica.
 * A API do MicroWork filtra por mês/ano, então um intervalo maior é consultado mês a mês.
 */

import { buscarRelatorioMicrowork } from './microworkIntegracao.js'
import { agregarAoA, normalizaTexto } from './sharepointFonteCalculo.js'

const CACHE_TTL_MS = 5 * 60 * 1000
const _cache = new Map() // fonte+ano+mes -> { aoa, ts }

function extrairLista(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const v of Object.values(data)) if (Array.isArray(v)) return v
  }
  return []
}

function chaveFonte(f) {
  return [f.idrelatorioconfiguracao, f.idrelatorioconsulta, f.idrelatorioconfiguracaoleiaute, f.idrelatoriousuarioleiaute,
    f.ididioma ?? 1, JSON.stringify(f.listaempresas || []), f.filtros_fixos || ''].join('|')
}

// Lê um mês do relatório e devolve [cabecalho, ...linhas]. Cabeçalho = união das chaves de
// todos os registros (relatórios podem omitir campos nulos em algumas linhas).
export async function lerAoAMicrowork(fonte, ano, mes) {
  const key = `${chaveFonte(fonte)}|${ano}|${mes}`
  const cached = _cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.aoa

  const data = await buscarRelatorioMicrowork({
    idrelatorioconfiguracao: fonte.idrelatorioconfiguracao,
    idrelatorioconsulta: fonte.idrelatorioconsulta,
    idrelatorioconfiguracaoleiaute: fonte.idrelatorioconfiguracaoleiaute,
    idrelatoriousuarioleiaute: fonte.idrelatoriousuarioleiaute,
    ididioma: fonte.ididioma,
    listaempresas: fonte.listaempresas,
    filtrosFixos: fonte.filtros_fixos,
    campoPeriodoInicio: fonte.campo_periodo_inicio || undefined,
    campoPeriodoFim: fonte.campo_periodo_fim || undefined,
    ano, mes,
  })
  const lista = extrairLista(data)
  const cabecalho = []
  const vistos = new Set()
  for (const reg of lista) {
    for (const k of Object.keys(reg || {})) {
      if (!vistos.has(k)) { vistos.add(k); cabecalho.push(k) }
    }
  }
  const aoa = [cabecalho]
  for (const reg of lista) aoa.push(cabecalho.map(k => reg?.[k] ?? ''))

  _cache.set(key, { aoa, ts: Date.now() })
  return aoa
}

// Meses [{ano, mes}] cobertos por um intervalo YYYY-MM-DD (sem intervalo = mês corrente).
export function mesesDoIntervalo(dataInicio, dataFim) {
  const hoje = new Date()
  const ini = dataInicio || dataFim || `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`
  const fim = dataFim || dataInicio || ini
  let a = Number(ini.slice(0, 4)), m = Number(ini.slice(5, 7))
  const af = Number(fim.slice(0, 4)), mf = Number(fim.slice(5, 7))
  const meses = []
  while (a < af || (a === af && m <= mf)) {
    meses.push({ ano: a, mes: m })
    m++
    if (m > 12) { m = 1; a++ }
  }
  return meses
}

// Colunas (a partir do mês de referência) — usado no "Detectar colunas" da Base.
export async function getColunasMicrowork(fonte, ano, mes) {
  const aoa = await lerAoAMicrowork(fonte, ano, mes)
  const colunas = aoa[0] || []
  const amostra = aoa.slice(1, 4).map(r => Object.fromEntries(colunas.map((c, i) => [c, r[i]])))
  return { colunas, total_linhas: Math.max(aoa.length - 1, 0), amostra }
}

// Conferência de valor de uma Base (mesmo retorno de preview() do SharePoint).
export async function previewMicrowork({ fonte, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaNome, dataInicio, dataFim, regras }) {
  const empresaAlvo = empresaNome ? normalizaTexto(empresaNome) : null
  const acc = { totalLinhas: 0, totalFiltradas: 0, soma: 0, empresasAmostra: new Set() }
  for (const { ano, mes } of mesesDoIntervalo(dataInicio, dataFim)) {
    const aoa = await lerAoAMicrowork(fonte, ano, mes)
    agregarAoA(aoa, { colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaAlvo, dataInicio, dataFim, regras }, acc)
  }
  const valor = tipoAgregacao === 'CONTAGEM'
    ? acc.totalFiltradas
    : tipoAgregacao === 'MEDIA' ? (acc.totalFiltradas > 0 ? acc.soma / acc.totalFiltradas : 0) : acc.soma
  const resultado = { valor, total_linhas_fonte: acc.totalLinhas, total_linhas_filtradas: acc.totalFiltradas }
  if (empresaAlvo && acc.totalFiltradas === 0 && acc.empresasAmostra.size > 0) {
    resultado.empresas_disponiveis_amostra = [...acc.empresasAmostra]
  }
  return resultado
}
