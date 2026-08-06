/**
 * sharepointFonteCalculo.js
 *
 * Leitor genérico e config-driven de arquivos Excel do SharePoint, usado pelo
 * cadastro de Fonte de Cálculo / Base de Cálculo (menu Funcionários → Regras
 * de Comissões). Ao contrário dos outros serviços (sharepointGarantias.js,
 * sharepointFaturamento.js, sharepointRof017.js), que têm pasta/arquivo/colunas
 * fixos no código, este recebe tudo por parâmetro — cada Fonte de Cálculo
 * cadastrada define sua própria pasta, prefixo de arquivo e colunas.
 *
 * Cuidado com memória: alguns arquivos têm 200k+ linhas e 50+ colunas. Já causou
 * OOM em produção duas vezes:
 *  1) Ler com sheet_to_json em modo objeto (nomeado) para todas as colunas —
 *     o modo padrão do SheetJS cria uma célula-objeto por endereço (ex: "A1",
 *     "B2"...), o que é caro para planilhas largas.
 *  2) Testamos `exceljs` em modo streaming para evitar isso, mas o parser dele
 *     não conseguiu ler os arquivos exportados pelo ERP (retornava 0 linhas) —
 *     abandonado.
 * Solução atual, só com `xlsx` (SheetJS):
 *  - getColunas() lê só uma amostra (sheetRows) — nunca precisa do arquivo inteiro.
 *  - a agregação (preview) lê com `dense: true` (representação em array, não
 *    dicionário de endereços) e itera linha a linha somando/contando em
 *    variáveis locais, sem nunca criar um objeto por linha.
 */

import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

const CACHE_TTL_MS = 5 * 60 * 1000
const _cache = new Map() // chave composta -> { resultado, ts } — cacheia só o resultado agregado, nunca as linhas

export function clearFonteCalculoCache() {
  _cache.clear()
}

// Converte qualquer valor de data do Excel para 'YYYY-MM-DD'
export function toIsoDate(val) {
  if (val === null || val === undefined || val === '') return null
  try {
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      const y = val.getUTCFullYear()
      const m = String(val.getUTCMonth() + 1).padStart(2, '0')
      const d = String(val.getUTCDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
    if (typeof val === 'number') {
      if (val < 1) return null
      const ms = (val - 25569) * 86400 * 1000
      const d = new Date(ms)
      if (isNaN(d.getTime())) return null
      const y = d.getUTCFullYear()
      const mo = String(d.getUTCMonth() + 1).padStart(2, '0')
      const dy = String(d.getUTCDate()).padStart(2, '0')
      return `${y}-${mo}-${dy}`
    }
    const s = String(val).trim()
    if (!s) return null
    const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (br) return `${br[3]}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

// Converte valor monetário (pode vir como string "1.234,56" ou number)
export function parseMoney(val) {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const cleaned = String(val).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

export function normalizaTexto(v) {
  return String(v ?? '').trim().toUpperCase()
}

// A célula "casa" com uma sigla de Tipo de O.S. quando é igual a ela ou começa por ela seguida
// de um caractere não alfanumérico — "V01" casa com "V01" e "V01 - SERVIÇO CLIENTE", mas
// "V1" NÃO casa com "V10 ..." (fronteira de palavra).
function casaSiglaOS(cellNorm, siglaNorm) {
  if (!siglaNorm) return false
  if (cellNorm === siglaNorm) return true
  if (!cellNorm.startsWith(siglaNorm)) return false
  const prox = cellNorm.charAt(siglaNorm.length)
  return !((prox >= 'a' && prox <= 'z') || (prox >= '0' && prox <= '9'))
}

// Avalia uma cláusula de condição contra o valor bruto de uma célula (já resolvida por índice).
function avaliaClausula(valorBruto, operador, valorEsperado) {
  switch (operador) {
    case 'EM_BRANCO': return normalizaTexto(valorBruto) === ''
    case 'NAO_EM_BRANCO': return normalizaTexto(valorBruto) !== ''
    case 'IGUAL': return normalizaTexto(valorBruto) === normalizaTexto(valorEsperado)
    case 'DIFERENTE': return normalizaTexto(valorBruto) !== normalizaTexto(valorEsperado)
    case 'CONTEM': return normalizaTexto(valorBruto).includes(normalizaTexto(valorEsperado))
    case 'NAO_CONTEM': return !normalizaTexto(valorBruto).includes(normalizaTexto(valorEsperado))
    case 'COMECA_COM': return normalizaTexto(valorBruto).startsWith(normalizaTexto(valorEsperado))
    case 'NAO_COMECA_COM': return !normalizaTexto(valorBruto).startsWith(normalizaTexto(valorEsperado))
    // Setor da O.S.: o frontend traduz o nome do setor pra lista de siglas ("V01|V02|...")
    // usando o cadastro de Tipos de O.S. — aqui só conferimos se a célula casa com alguma sigla.
    case 'SETOR_OS_IGUAL': {
      const cell = normalizaTexto(valorBruto)
      return String(valorEsperado || '').split('|').some(s => casaSiglaOS(cell, normalizaTexto(s)))
    }
    case 'SETOR_OS_DIFERENTE': {
      const cell = normalizaTexto(valorBruto)
      return !String(valorEsperado || '').split('|').some(s => casaSiglaOS(cell, normalizaTexto(s)))
    }
    default: return false
  }
}

// condicoes: [{ idxColuna, operador, valor }] já resolvidas (índice numérico, calculado uma
// vez por arquivo, fora do loop de linhas). logica: 'E' | 'OU'. Sem condições => sempre true.
export function avaliaCondicoes(r, condicoes, logica) {
  if (!condicoes || condicoes.length === 0) return true
  if (logica === 'OU') {
    for (let i = 0; i < condicoes.length; i++) {
      const c = condicoes[i]
      if (avaliaClausula(c.idxColuna >= 0 ? r[c.idxColuna] : undefined, c.operador, c.valor)) return true
    }
    return false
  }
  for (let i = 0; i < condicoes.length; i++) {
    const c = condicoes[i]
    if (!avaliaClausula(c.idxColuna >= 0 ? r[c.idxColuna] : undefined, c.operador, c.valor)) return false
  }
  return true
}

// regras: [{ tipoAcao, idxColunaAlvo, condicoes, logica }] já resolvidas (índices calculados uma
// vez por arquivo). Aplica em ordem sobre o valor de trabalho da linha.
// Retorna { valor, filtrada } — filtrada=true significa "descartar a linha" (algum FILTRAR reprovou).
export function aplicarRegras(r, valorInicial, regras) {
  let valor = valorInicial
  for (let i = 0; i < regras.length; i++) {
    const regra = regras[i]
    const condicaoOk = avaliaCondicoes(r, regra.condicoes, regra.logica)
    if (regra.tipoAcao === 'FILTRAR') {
      if (!condicaoOk) return { valor, filtrada: true }
      continue
    }
    if (!condicaoOk) continue // demais ações só se aplicam quando a condição bate (ou não têm condição)
    const alvoVal = regra.idxColunaAlvo >= 0 ? r[regra.idxColunaAlvo] : undefined
    switch (regra.tipoAcao) {
      case 'DEFINIR_VALOR':
        valor = parseMoney(alvoVal)
        break
      // Coluna Alvo é opcional aqui: se informada, aplica o sinal sobre o valor DESSA coluna
      // (útil quando a regra precisa mexer numa coluna diferente da "Coluna do Valor" da Base);
      // se vazia, aplica sobre o valor de trabalho corrente (comportamento original).
      case 'INVERTER_SINAL':
        valor = -(regra.idxColunaAlvo >= 0 ? parseMoney(alvoVal) : valor)
        break
      case 'FORCAR_NEGATIVO':
        valor = -Math.abs(regra.idxColunaAlvo >= 0 ? parseMoney(alvoVal) : valor)
        break
      case 'FORCAR_POSITIVO':
        valor = Math.abs(regra.idxColunaAlvo >= 0 ? parseMoney(alvoVal) : valor)
        break
      case 'SOMAR_COLUNA':
        valor += parseMoney(alvoVal)
        break
      case 'SUBTRAIR_COLUNA':
        valor -= parseMoney(alvoVal)
        break
      case 'MULTIPLICAR_COLUNA':
        valor *= parseMoney(alvoVal)
        break
      case 'DIVIDIR_COLUNA': {
        const divisor = parseMoney(alvoVal)
        if (divisor !== 0) valor /= divisor
        // divisor === 0: no-op (mantém o valor atual) — evita NaN/Infinity corromper a soma
        break
      }
    }
  }
  return { valor, filtrada: false }
}

// Quando a pasta NÃO usa subpasta por ano, algumas Fontes ainda organizam os arquivos com o
// ano (e opcionalmente o mês) no final do nome — ex: "..._Excel 2026.xlsx" ou
// "..._Excel 2026.07.xlsx". Esse padrão deixa a pasta inteira com um arquivo por ano/mês (ex:
// 25 arquivos indo de 2020 até hoje) — sem filtrar por essa data, TODA conferência/cálculo
// baixava e processava os 25 arquivos, mesmo pra calcular um período de um mês só (é isso que
// deixava "Calcular Comissões" lento, lendo arquivo por arquivo à toa). Quando o nome não bate
// com esse padrão, o arquivo é mantido (não dá pra saber o período dele, então não arrisca
// excluir por engano).
const REGEX_ANO_MES_ARQUIVO = /(\d{4})(?:\.(\d{2}))?\.xlsx$/i
function arquivoCobreIntervalo(nomeArquivo, dataInicio, dataFim) {
  const m = nomeArquivo.match(REGEX_ANO_MES_ARQUIVO)
  if (!m) return true // sem ano reconhecível no nome — mantém, não arrisca excluir por engano
  const ano = m[1]
  const mes = m[2]
  const inicioArquivo = mes ? `${ano}-${mes}-01` : `${ano}-01-01`
  const fimArquivo = mes ? `${ano}-${mes}-31` : `${ano}-12-31`
  if (dataInicio && fimArquivo < dataInicio) return false
  if (dataFim && inicioArquivo > dataFim) return false
  return true
}

// Lista os arquivos de uma pasta (opcionalmente pasta/{ano}) que começam com prefixoArquivo.
// dataInicio/dataFim (opcionais, 'YYYY-MM-DD') restringem ainda mais quando o nome do arquivo
// tem ano/mês reconhecível (ver arquivoCobreIntervalo) — reduz drasticamente quantos arquivos
// precisam ser baixados quando a pasta tem um arquivo por ano/mês em vez de subpastas.
export async function listarArquivos({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, ano, dataInicio, dataFim }) {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')

  const pastaFinal = usaSubpastaAno ? `${pastaSharepoint}/${ano}` : pastaSharepoint

  let folderData
  try {
    folderData = await graphGet(`/drives/${driveId}/root:${pastaFinal}:/children`)
  } catch (err) {
    throw new Error(`Não foi possível acessar a pasta SharePoint "${pastaFinal}": ${err.response?.data?.error?.message || err.message}`)
  }

  let files = (folderData.value || []).filter(f => f.name && f.name.startsWith(prefixoArquivo))
  if (files.length === 0) {
    throw new Error(`Nenhum arquivo "${prefixoArquivo}*.xlsx" encontrado na pasta SharePoint: ${pastaFinal}`)
  }
  if (!usaSubpastaAno && (dataInicio || dataFim)) {
    files = files.filter(f => arquivoCobreIntervalo(f.name, dataInicio, dataFim))
  }
  return files
}

export async function baixarBuffer(downloadUrl) {
  const response = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
  return Buffer.from(response.data)
}

// Diagnóstico: retorna colunas disponíveis + amostra, SEM carregar o arquivo inteiro
// (usa sheetRows para limitar quantas linhas o XLSX efetivamente parseia).
export async function getColunas({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, ano, linhaCabecalho }) {
  const files = await listarArquivos({
    pastaSharepoint, prefixoArquivo, usaSubpastaAno,
    ano: ano || new Date().getFullYear(),
  })
  const file = files[0]
  const downloadUrl = file['@microsoft.graph.downloadUrl']
  if (!downloadUrl) throw new Error(`Sem URL de download para o arquivo "${file.name}"`)

  const buffer = await baixarBuffer(downloadUrl)
  const linha0 = linhaCabecalho || 0
  // sheetRows limita quantas linhas o parser lê do arquivo inteiro — evita carregar
  // centenas de milhares de linhas na memória só para listar nomes de coluna.
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true, sheetRows: linha0 + 5 })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', range: linha0 })

  // Tenta obter o total real de linhas pela dimensão declarada na planilha
  // (disponível mesmo com sheetRows, pois vem do cabeçalho do XML da aba).
  let totalLinhas = rows.length
  if (sheet['!ref']) {
    try {
      const range = XLSX.utils.decode_range(sheet['!ref'])
      totalLinhas = Math.max(0, range.e.r - range.s.r - linha0)
    } catch { /* mantém a contagem da amostra */ }
  }

  return {
    colunas: rows.length > 0 ? Object.keys(rows[0]) : [],
    amostra: rows[0] || null,
    total_linhas: totalLinhas,
  }
}

// Determina quais anos precisam ser lidos, dado um range de datas (ou o ano atual, se não houver range)
export function anosDoIntervalo(dataInicio, dataFim) {
  const anoAtual = new Date().getFullYear()
  if (!dataInicio && !dataFim) return [anoAtual]
  const anoIni = dataInicio ? parseInt(String(dataInicio).slice(0, 4), 10) : anoAtual
  const anoFim = dataFim ? parseInt(String(dataFim).slice(0, 4), 10) : anoIni
  const anos = []
  for (let a = anoIni; a <= anoFim; a++) anos.push(a)
  return anos
}

// Baixa e faz o parse de UM arquivo em modo dense (array, não dicionário de endereços) — função
// dedicada (não inline no chamador) de propósito: assim buffer/workbook/sheet ficam presos ao
// frame desta função e saem de escopo (elegíveis pro GC) assim que ela retorna, mesmo quando o
// chamador processa vários arquivos em sequência num loop. Compartilhada entre o cálculo simples
// (preview) e o cálculo em lote (calculoComissoesLote.js) — não duplicar essa leitura em outro lugar.
export async function lerArquivoComoAoA(downloadUrl, linhaCabecalho) {
  const buffer = await baixarBuffer(downloadUrl)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  // header:1 => array de arrays (índices numéricos, sem overhead de propriedades nomeadas)
  return XLSX.utils.sheet_to_json(sheet, { header: 1, range: linhaCabecalho || 0, defval: '', raw: true })
}

// Processa UM arquivo: parse em modo dense (array, não dicionário de endereços)
// + iteração linha a linha somando/contando em variáveis locais — nunca cria
// um objeto por linha nem mantém uma cópia "projetada" do arquivo em memória.
async function agregarArquivo(downloadUrl, { linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaAlvo, dataInicio, dataFim, regras }, acc) {
  const aoa = await lerArquivoComoAoA(downloadUrl, linhaCabecalho)
  if (aoa.length === 0) return

  const cabecalho = aoa[0]
  const idxEmpresa = cabecalho.indexOf(colunaEmpresa)
  const idxData = cabecalho.indexOf(colunaData)
  const idxValor = cabecalho.indexOf(colunaValor)

  // Resolve nomes de coluna das regras -> índice numérico UMA VEZ por arquivo (não por linha).
  const regrasResolvidas = (regras || []).map(regra => ({
    tipoAcao: regra.tipo_acao,
    idxColunaAlvo: regra.coluna_alvo ? cabecalho.indexOf(regra.coluna_alvo) : -1,
    logica: regra.condicao_logica || 'E',
    condicoes: (regra.condicoes || []).map(c => ({
      idxColuna: cabecalho.indexOf(c.coluna),
      operador: c.operador,
      valor: c.valor,
    })),
  }))

  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i]
    acc.totalLinhas++

    const empresaVal = idxEmpresa >= 0 ? r[idxEmpresa] : undefined
    if (empresaAlvo) {
      const empresaNorm = normalizaTexto(empresaVal)
      if (acc.empresasAmostra.size < 20 && empresaNorm) acc.empresasAmostra.add(String(empresaVal).trim())
      if (empresaNorm !== empresaAlvo) continue
    }
    if (dataInicio || dataFim) {
      const dataVal = idxData >= 0 ? r[idxData] : undefined
      const iso = toIsoDate(dataVal)
      if (!iso) continue
      if (dataInicio && iso < dataInicio) continue
      if (dataFim && iso > dataFim) continue
    }

    let valorTrabalho = idxValor >= 0 ? parseMoney(r[idxValor]) : 0
    if (regrasResolvidas.length > 0) {
      const { valor, filtrada } = aplicarRegras(r, valorTrabalho, regrasResolvidas)
      if (filtrada) continue
      valorTrabalho = valor
    }

    acc.totalFiltradas++
    if (tipoAgregacao !== 'CONTAGEM') {
      acc.soma += valorTrabalho
    }
  }
}

// Combina listagem de arquivos + leitura em streaming + agregação, usado pelo painel de conferência.
// Cacheia só o RESULTADO final (números), nunca as linhas do arquivo.
export async function preview({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaNome, dataInicio, dataFim, regras }) {
  const empresaAlvo = empresaNome ? normalizaTexto(empresaNome) : null
  const key = [pastaSharepoint, prefixoArquivo, usaSubpastaAno, linhaCabecalho || 0, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaAlvo, dataInicio, dataFim, JSON.stringify(regras || [])].join('|')
  const cached = _cache.get(key)
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.resultado

  const anos = usaSubpastaAno ? anosDoIntervalo(dataInicio, dataFim) : [null]
  const acc = { totalLinhas: 0, totalFiltradas: 0, soma: 0, empresasAmostra: new Set() }

  for (const ano of anos) {
    const files = await listarArquivos({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, ano, dataInicio, dataFim })
    for (const file of files) {
      const downloadUrl = file['@microsoft.graph.downloadUrl']
      if (!downloadUrl) continue
      await agregarArquivo(downloadUrl, { linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaAlvo, dataInicio, dataFim, regras }, acc)
    }
  }

  const valor = tipoAgregacao === 'CONTAGEM'
    ? acc.totalFiltradas
    : tipoAgregacao === 'MEDIA'
      ? (acc.totalFiltradas > 0 ? acc.soma / acc.totalFiltradas : 0)
      : acc.soma

  const resultado = {
    valor,
    total_linhas_fonte: acc.totalLinhas,
    total_linhas_filtradas: acc.totalFiltradas,
  }
  if (empresaAlvo && acc.totalFiltradas === 0 && acc.empresasAmostra.size > 0) {
    resultado.empresas_disponiveis_amostra = [...acc.empresasAmostra]
  }

  _cache.set(key, { resultado, ts: Date.now() })
  return resultado
}
