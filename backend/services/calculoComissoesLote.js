/**
 * calculoComissoesLote.js
 *
 * Calcula o valor de comissão de VÁRIOS funcionários de uma vez, agrupando por
 * arquivo do SharePoint. Sem isso, calcular comissão de 20+ funcionários faria
 * o backend baixar e reprocessar o MESMO arquivo de 230 mil linhas 20+ vezes
 * (minutos de espera). Aqui, cada arquivo é lido e percorrido UMA ÚNICA VEZ —
 * durante essa passada, cada linha é conferida contra todos os itens do grupo
 * (via mapas de empresa/funcionário, não um loop linear) e acumulada no
 * "balde" certo. Reaproveita os mesmos helpers e a mesma disciplina de memória
 * (dense mode, array de arrays, sem objeto por linha) de sharepointFonteCalculo.js.
 */

import {
  listarArquivos, lerArquivoComoAoA, toIsoDate, parseMoney, normalizaTexto,
  avaliaCondicoes, aplicarRegras, anosDoIntervalo,
} from './sharepointFonteCalculo.js'

// Chave de agrupamento: itens que compartilham arquivo+colunas+regras podem
// ser calculados numa única leitura do arquivo.
function chaveGrupo(item) {
  return [
    item.pastaSharepoint, item.prefixoArquivo, item.usaSubpastaAno, item.linhaCabecalho || 0,
    item.colunaEmpresa, item.colunaData, item.colunaValor, item.colunaFuncionario || '',
    item.tipoAgregacao, JSON.stringify(item.regras || []),
  ].join('|')
}

// Processa UM arquivo, acumulando em paralelo para todos os itens do grupo que passam
// pelo arquivo (via mapas de lookup por empresa e por empresa+funcionário — O(1) por linha,
// não um loop sobre os itens a cada linha).
function agregarArquivoParaGrupo(aoa, linha0, itensDoGrupo, colunaEmpresa, colunaData, colunaValor, colunaFuncionario, regrasCru, tipoAgregacao, contadorGrupo) {
  if (aoa.length === 0) return

  const cabecalho = aoa[0]
  const idxEmpresa = cabecalho.indexOf(colunaEmpresa)
  const idxData = cabecalho.indexOf(colunaData)
  const idxValor = cabecalho.indexOf(colunaValor)
  const idxFuncionario = colunaFuncionario ? cabecalho.indexOf(colunaFuncionario) : -1

  const regrasResolvidas = (regrasCru || []).map(regra => ({
    tipoAcao: regra.tipo_acao,
    idxColunaAlvo: regra.coluna_alvo ? cabecalho.indexOf(regra.coluna_alvo) : -1,
    logica: regra.condicao_logica || 'E',
    condicoes: (regra.condicoes || []).map(c => ({
      idxColuna: cabecalho.indexOf(c.coluna),
      operador: c.operador,
      valor: c.valor,
    })),
  }))

  // Mapas de lookup O(1) por linha:
  //  - porEmpresa: itens de nível EMPRESA (sem funcionário) — casam pela empresa da linha. Um
  //    item pode ter VÁRIAS empresas válidas (nível EMPRESA soma o Agrupamento inteiro, não só
  //    a empresa onde o funcionário está registrado) — por isso é registrado sob cada uma.
  //  - porEmpresaFuncionario: itens de nível INDIVIDUAL — casam por empresa + funcionário da linha.
  //    Normalmente uma única empresa (a do próprio funcionário), mas quando a política tem
  //    "Comissão sobre todas as empresas" marcada, empresaNomes traz todas as empresas cadastradas
  //    e o item é registrado sob cada uma (senão só bateria com a primeira empresa da lista).
  const porEmpresa = new Map()
  const porEmpresaFuncionario = new Map()
  for (const item of itensDoGrupo) {
    const empresaNomes = item.empresaNomes && item.empresaNomes.length > 0 ? item.empresaNomes : ['']
    if (item.funcionarioNome) {
      const funcNorm = normalizaTexto(item.funcionarioNome)
      for (const nome of empresaNomes) {
        const chave = `${normalizaTexto(nome)}|${funcNorm}`
        if (!porEmpresaFuncionario.has(chave)) porEmpresaFuncionario.set(chave, [])
        porEmpresaFuncionario.get(chave).push(item)
      }
    } else {
      for (const nome of empresaNomes) {
        const empresaNorm = normalizaTexto(nome)
        if (!porEmpresa.has(empresaNorm)) porEmpresa.set(empresaNorm, [])
        porEmpresa.get(empresaNorm).push(item)
      }
    }
  }

  // IMPORTANTE: nada de função criada dentro do loop de linhas (closure por linha já causou
  // OOM em produção — 230 mil alocações de função extras empurraram a memória do limite). Tudo
  // abaixo usa apenas variáveis já declaradas fora do loop e for-loops simples.
  for (let i = 1; i < aoa.length; i++) {
    const r = aoa[i]
    contadorGrupo.totalLinhas++ // conta TODA linha do arquivo, independente de casar com algum item

    const empresaVal = idxEmpresa >= 0 ? r[idxEmpresa] : undefined
    const empresaNorm = normalizaTexto(empresaVal)

    const candidatosEmpresa = porEmpresa.get(empresaNorm)
    const funcVal = idxFuncionario >= 0 ? r[idxFuncionario] : undefined
    const funcNorm = idxFuncionario >= 0 ? normalizaTexto(funcVal) : ''
    const candidatosIndividual = idxFuncionario >= 0 ? porEmpresaFuncionario.get(`${empresaNorm}|${funcNorm}`) : null

    if (!candidatosEmpresa && !candidatosIndividual) continue // linha não interessa a ninguém do grupo

    // Coluna de valor e regras são as mesmas pro grupo inteiro (é a chave de agrupamento) —
    // calcula uma vez por LINHA, não uma vez por item, evitando trabalho repetido.
    let valorTrabalho = idxValor >= 0 ? parseMoney(r[idxValor]) : 0
    if (regrasResolvidas.length > 0) {
      const resultado = aplicarRegras(r, valorTrabalho, regrasResolvidas)
      if (resultado.filtrada) continue
      valorTrabalho = resultado.valor
    }

    const dataVal = idxData >= 0 ? r[idxData] : undefined
    const dataIso = toIsoDate(dataVal)

    if (candidatosEmpresa) {
      for (let k = 0; k < candidatosEmpresa.length; k++) {
        const item = candidatosEmpresa[k]
        if (item.dataInicio || item.dataFim) {
          if (!dataIso) continue
          if (item.dataInicio && dataIso < item.dataInicio) continue
          if (item.dataFim && dataIso > item.dataFim) continue
        }
        item._acc.totalFiltradas++
        if (tipoAgregacao !== 'CONTAGEM') item._acc.soma += valorTrabalho
      }
    }
    if (candidatosIndividual) {
      for (let k = 0; k < candidatosIndividual.length; k++) {
        const item = candidatosIndividual[k]
        if (item.dataInicio || item.dataFim) {
          if (!dataIso) continue
          if (item.dataInicio && dataIso < item.dataInicio) continue
          if (item.dataFim && dataIso > item.dataFim) continue
        }
        item._acc.totalFiltradas++
        if (tipoAgregacao !== 'CONTAGEM') item._acc.soma += valorTrabalho
      }
    }
  }
}

// itens: [{ id (identificador do chamador, ex: funcionarioId), pastaSharepoint, prefixoArquivo,
//   usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData, colunaValor, colunaFuncionario,
//   tipoAgregacao, regras, empresaNomes (array — nível EMPRESA soma todas as empresas do
//   Agrupamento; nível INDIVIDUAL tem só a própria empresa), funcionarioNome (null p/ nível
//   empresa), dataInicio, dataFim }]
// Retorna: [{ id, valor, total_linhas_fonte, total_linhas_filtradas }] na mesma ordem de entrada.
export async function calcularLote(itens) {
  for (const item of itens) item._acc = { totalLinhas: 0, totalFiltradas: 0, soma: 0 }

  const grupos = new Map()
  for (const item of itens) {
    const chave = chaveGrupo(item)
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(item)
  }

  for (const [, itensDoGrupo] of grupos) {
    const base = itensDoGrupo[0]
    const anos = base.usaSubpastaAno
      ? [...new Set(itensDoGrupo.flatMap(it => anosDoIntervalo(it.dataInicio, it.dataFim)))]
      : [null]
    const contadorGrupo = { totalLinhas: 0 } // total de linhas do(s) arquivo(s) do grupo — igual pra todos os itens

    // Menor dataInicio / maior dataFim entre os itens do grupo — quando a pasta não usa
    // subpasta por ano mas o nome do arquivo tem ano/mês (ver arquivoCobreIntervalo em
    // sharepointFonteCalculo.js), isso evita baixar arquivos de anos que nenhum item precisa
    // (sem isso, uma pasta com 1 arquivo por ano/mês era lida por inteiro em toda chamada).
    const dataInicioGrupo = itensDoGrupo.reduce((min, it) => (!min || (it.dataInicio && it.dataInicio < min)) ? it.dataInicio : min, null)
    const dataFimGrupo = itensDoGrupo.reduce((max, it) => (!max || (it.dataFim && it.dataFim > max)) ? it.dataFim : max, null)

    for (const ano of anos) {
      const files = await listarArquivos({
        pastaSharepoint: base.pastaSharepoint, prefixoArquivo: base.prefixoArquivo,
        usaSubpastaAno: base.usaSubpastaAno, ano,
        dataInicio: dataInicioGrupo, dataFim: dataFimGrupo,
      })
      for (const file of files) {
        const downloadUrl = file['@microsoft.graph.downloadUrl']
        if (!downloadUrl) continue
        const linha0 = base.linhaCabecalho || 0
        const aoa = await lerArquivoComoAoA(downloadUrl, linha0)
        agregarArquivoParaGrupo(
          aoa, linha0, itensDoGrupo,
          base.colunaEmpresa, base.colunaData, base.colunaValor, base.colunaFuncionario,
          base.regras, base.tipoAgregacao, contadorGrupo
        )
      }
    }

    for (const item of itensDoGrupo) item._acc.totalLinhas = contadorGrupo.totalLinhas
  }

  return itens.map(item => {
    const acc = item._acc
    const valor = item.tipoAgregacao === 'CONTAGEM'
      ? acc.totalFiltradas
      : item.tipoAgregacao === 'MEDIA'
        ? (acc.totalFiltradas > 0 ? acc.soma / acc.totalFiltradas : 0)
        : acc.soma
    return {
      id: item.id,
      valor,
      total_linhas_fonte: acc.totalLinhas,
      total_linhas_filtradas: acc.totalFiltradas,
    }
  })
}
