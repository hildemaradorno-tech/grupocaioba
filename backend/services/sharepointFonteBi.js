/**
 * sharepointFonteBi.js
 *
 * Leitor genérico e config-driven de arquivos Excel do SharePoint, usado pelo cadastro de
 * Fonte BI / Medida BI (menu BI - Dashboard). Motor próprio e independente do usado por
 * Cálculo de Comissões (sharepointFonteCalculo.js) — mesmas técnicas (comprovadas em produção),
 * cópia deliberada, não import, pra manter os dois ciclos de vida totalmente separados.
 *
 * Cuidado com memória: alguns arquivos têm 200k+ linhas e 50+ colunas. Já causou OOM em
 * produção no motor de Comissões duas vezes — mesma disciplina aplicada aqui:
 *  - getColunas() lê só uma amostra (sheetRows) — nunca precisa do arquivo inteiro.
 *  - a agregação lê com `dense: true` (array, não dicionário de endereços) e itera linha a
 *    linha somando/contando em variáveis locais/Map, sem nunca criar um objeto por linha.
 *  - lerArquivoComoAoA fica isolada na própria função pra buffer/workbook/sheet saírem de
 *    escopo (GC-elegíveis) assim que ela retorna, mesmo processando vários arquivos em loop.
 */

import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// BI Possibilidades chama isso toda vez que a tela carrega (uma por Medida com Slot) — TTL
// maior que o de Comissões (5 min) pra não reler/reparsear o mesmo arquivo grande do
// SharePoint a cada visita à tela dentro da mesma janela de trabalho.
const CACHE_TTL_MS = 15 * 60 * 1000
const _cache = new Map() // chave composta -> { resultado, ts } — cacheia só o resultado agregado, nunca as linhas

export function clearFonteBiCache() {
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
// ano (e opcionalmente o mês) no final do nome. Sem filtrar por essa data, toda agregação
// baixaria e processaria todos os arquivos da pasta à toa.
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

// Diagnóstico: retorna colunas disponíveis + amostra, SEM carregar o arquivo inteiro.
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
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true, sheetRows: linha0 + 5 })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', range: linha0 })

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

// Baixa e faz o parse de UM arquivo em modo dense — função dedicada de propósito (ver
// cabeçalho do arquivo): buffer/workbook/sheet saem de escopo assim que ela retorna.
export async function lerArquivoComoAoA(downloadUrl, linhaCabecalho) {
  const buffer = await baixarBuffer(downloadUrl)
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, range: linhaCabecalho || 0, defval: '', raw: true })
}

// Processa UM arquivo, agregando por combinação de dimensões (Map<chave, grupo>) — chave
// composta pelos valores BRUTOS das colunas de dimensão pedidas (a resolução contra os
// cadastros de Departamento/Setor/Box/Tipo de OS/etc., ou contra um De-Para de código
// genérico, acontece depois, no frontend). colunasDimensao aceita qualquer chave — os 4
// nomes conhecidos (funcionario/tipo_os/natureza_operacao/movimento) e também uma chave por
// coluna vinculada a um De-Para (dim_fontes_bi_colunas_depara), sem distinção aqui: o backend
// só agrupa pelos valores crus, quem sabe o que cada chave significa é o frontend.
async function agregarArquivoPorDimensoes(downloadUrl, { linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, colunasDimensao, empresaAlvo, dataInicio, dataFim, regras }, acc) {
  const aoa = await lerArquivoComoAoA(downloadUrl, linhaCabecalho)
  if (aoa.length === 0) return

  const cabecalho = aoa[0]
  const idxEmpresa = cabecalho.indexOf(colunaEmpresa)
  const idxData = cabecalho.indexOf(colunaData)
  const idxValor = cabecalho.indexOf(colunaValor)

  // Resolve índice de cada dimensão pedida UMA VEZ por arquivo (não por linha).
  const idxDimensoes = Object.entries(colunasDimensao || {})
    .filter(([, coluna]) => !!coluna)
    .map(([chave, coluna]) => ({ chave, idx: cabecalho.indexOf(coluna) }))

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

    if (empresaAlvo) {
      const empresaVal = idxEmpresa >= 0 ? r[idxEmpresa] : undefined
      if (normalizaTexto(empresaVal) !== empresaAlvo) continue
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

    // Monta a chave composta + o objeto de dims (só criado quando a linha passa nos filtros
    // acima — não é por linha do arquivo inteiro, é só pelas que sobram depois do FILTRAR).
    const dims = {}
    const partesChave = []
    for (const { chave, idx } of idxDimensoes) {
      const bruto = idx >= 0 ? String(r[idx] ?? '').trim() : ''
      dims[chave] = bruto
      partesChave.push(bruto)
    }
    const chaveGrupo = partesChave.join('')

    let grupo = acc.grupos.get(chaveGrupo)
    if (!grupo) {
      grupo = { dims, soma: 0, linhas: 0, distintos: tipoAgregacao === 'CONTAGEM_DISTINTA' ? new Set() : null }
      acc.grupos.set(chaveGrupo, grupo)
    }
    grupo.linhas++
    if (tipoAgregacao === 'CONTAGEM_DISTINTA') {
      // Distinto sobre o valor CRU da coluna (não o parseMoney/regra) — a coluna escolhida pra
      // "contar distinto" costuma ser um código/nome (ex: nº da OS), não um valor monetário.
      const bruto = idxValor >= 0 ? String(r[idxValor] ?? '').trim() : ''
      if (bruto !== '') grupo.distintos.add(bruto)
    } else if (tipoAgregacao !== 'CONTAGEM') {
      grupo.soma += valorTrabalho
    }

    acc.totalFiltradas++
  }
}

// Combina listagem de arquivos + leitura + agregação COM corte por dimensão. Retorna um
// grupo por combinação distinta de valores de dimensão encontrada (tipicamente dezenas/
// centenas, não uma linha por nota fiscal).
export async function agregarPorDimensoes({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, colunasDimensao, regras, empresaNome, dataInicio, dataFim }) {
  const empresaAlvo = empresaNome ? normalizaTexto(empresaNome) : null
  const key = [pastaSharepoint, prefixoArquivo, usaSubpastaAno, linhaCabecalho || 0, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, JSON.stringify(colunasDimensao || {}), empresaAlvo, dataInicio, dataFim, JSON.stringify(regras || [])].join('|')
  const cached = _cache.get(key)
  if (cached && (Date.now() - cached.ts) < CACHE_TTL_MS) return cached.resultado

  const anos = usaSubpastaAno ? anosDoIntervalo(dataInicio, dataFim) : [null]
  const acc = { totalLinhas: 0, totalFiltradas: 0, grupos: new Map() }

  for (const ano of anos) {
    const files = await listarArquivos({ pastaSharepoint, prefixoArquivo, usaSubpastaAno, ano, dataInicio, dataFim })
    for (const file of files) {
      const downloadUrl = file['@microsoft.graph.downloadUrl']
      if (!downloadUrl) continue
      await agregarArquivoPorDimensoes(downloadUrl, { linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, colunasDimensao, empresaAlvo, dataInicio, dataFim, regras }, acc)
    }
  }

  // Retorna soma/linhas crus (não o valor já dividido) — o frontend pode precisar somar
  // vários grupos brutos entre si ao resolver uma dimensão pra um nível mais alto da
  // hierarquia (ex: vários Funcionários caindo no mesmo Departamento), e uma MEDIA só fica
  // correta recalculada depois desse merge (soma total / linhas totais), nunca pela média
  // das médias.
  const grupos = [...acc.grupos.values()].map(g => ({
    dims: g.dims,
    linhas: g.linhas,
    soma: g.soma,
    distintos: g.distintos ? [...g.distintos] : undefined,
  }))

  const resultado = {
    grupos,
    total_linhas_fonte: acc.totalLinhas,
    total_linhas_filtradas: acc.totalFiltradas,
  }
  _cache.set(key, { resultado, ts: Date.now() })
  return resultado
}
