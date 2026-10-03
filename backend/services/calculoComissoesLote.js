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
  aplicarRegras, anosDoIntervalo, resolverRegrasSetorFuncionario,
  fusoHorarioFonteCalculo,
} from './sharepointFonteCalculo.js'
import { lerAoAMicrowork, mesesDoIntervalo } from './microworkFonteCalculo.js'

// Chave de agrupamento: itens que compartilham arquivo+colunas+regras podem
// ser calculados numa única leitura do arquivo.
function chaveGrupo(item) {
  return [
    item.microwork ? `mw:${item.microwork.id}` : '', item.pastaSharepoint, item.prefixoArquivo, item.usaSubpastaAno, item.subpastaPadrao || '', item.linhaCabecalho || 0,
    item.colunaEmpresa, item.colunaData, item.colunaValor, item.colunaTipoMovimento || '', item.colunaFuncionario || '',
    item.tipoAgregacao, JSON.stringify(item.regras || []),
  ].join('|')
}

// Processa UM arquivo, acumulando em paralelo para todos os itens do grupo que passam
// pelo arquivo (via mapas de lookup por empresa e por empresa+funcionário — O(1) por linha,
// não um loop sobre os itens a cada linha).
function agregarArquivoParaGrupo(aoa, linha0, itensDoGrupo, colunaEmpresa, colunaData, colunaValor, colunaTipoMovimento, colunaFuncionario, regrasCru, tipoAgregacao, contadorGrupo, fusoHorario) {
  if (aoa.length === 0) return

  const cabecalho = aoa[0]
  const idxEmpresa = cabecalho.indexOf(colunaEmpresa)
  const idxData = cabecalho.indexOf(colunaData)
  // Coluna do Valor aceita somar mais de uma coluna, separadas por "+" (ex: "totalservico+totalrevisao").
  const idxsValor = colunaValor.split('+').map(c => cabecalho.indexOf(c.trim())).filter(i => i >= 0)
  const idxFuncionario = colunaFuncionario ? cabecalho.indexOf(colunaFuncionario) : -1
  // Sem Regras de Cálculo (filtros de linha) e com mais de uma coluna somada (ex:
  // "totalvenda+totaldevolucao"), dá pra rastrear o total de CADA coluna separada — usado pela
  // telinha de calculadora em Cálculo de Comissões pra mostrar Venda x Devolução, não só o líquido.
  const rastrearColunas = (!regrasCru || regrasCru.length === 0) && idxsValor.length > 1
  // Coluna Tipo de Movimento (opcional, independe de Regras de Cálculo e de quantas colunas a
  // Coluna do Valor soma): agrupa o total por CADA valor distinto dessa coluna (ex: "SAÍDA"/
  // "ENTRADA", ou "VENDA"/"DEVOLUÇÃO"...) — sem lista fixa de categorias, o que aparecer na
  // coluna vira um balde, além do total combinado de sempre.
  const idxTipoMovimento = colunaTipoMovimento ? cabecalho.indexOf(colunaTipoMovimento) : -1

  const regrasResolvidas = (regrasCru || []).map(regra => ({
    tipoAcao: regra.tipo_acao,
    idxColunaAlvo: regra.coluna_alvo ? cabecalho.indexOf(regra.coluna_alvo) : -1,
    logica: regra.condicao_logica || 'E',
    condicoes: (regra.condicoes || []).map(c => ({
      idxColuna: cabecalho.indexOf(c.coluna),
      operador: c.operador,
      valor: c.valor,
      funcionariosSetor: c.funcionariosSetor,
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
    let valsColuna = null
    let valorTrabalho
    if (rastrearColunas) {
      valsColuna = idxsValor.map(idx => parseMoney(r[idx]))
      valorTrabalho = valsColuna[0] + valsColuna[1]
      for (let vi = 2; vi < valsColuna.length; vi++) valorTrabalho += valsColuna[vi]
    } else {
      valorTrabalho = idxsValor.reduce((soma, idx) => soma + parseMoney(r[idx]), 0)
    }
    if (regrasResolvidas.length > 0) {
      const resultado = aplicarRegras(r, valorTrabalho, regrasResolvidas)
      if (resultado.filtrada) continue
      valorTrabalho = resultado.valor
    }
    // Categoria da linha (já filtrada/transformada pelas Regras de Cálculo, se houver) pelo texto
    // da Coluna Tipo de Movimento — o mesmo valorTrabalho que compõe o total combinado vai pro
    // balde certo, então a soma de todas as categorias sempre bate com o total.
    const categoriaMovimento = idxTipoMovimento >= 0 ? (String(r[idxTipoMovimento] ?? '').trim() || '(vazio)') : null

    const dataVal = idxData >= 0 ? r[idxData] : undefined
    const dataIso = toIsoDate(dataVal, fusoHorario)

    if (candidatosEmpresa) {
      for (let k = 0; k < candidatosEmpresa.length; k++) {
        const item = candidatosEmpresa[k]
        if (item.dataInicio || item.dataFim) {
          if (!dataIso) continue
          if (item.dataInicio && dataIso < item.dataInicio) continue
          if (item.dataFim && dataIso > item.dataFim) continue
        }
        item._acc.totalFiltradas++
        if (tipoAgregacao !== 'CONTAGEM') {
          item._acc.soma += valorTrabalho
          if (valsColuna && item._acc.somaPorColuna) {
            for (let ci = 0; ci < valsColuna.length; ci++) item._acc.somaPorColuna[ci] += valsColuna[ci]
          }
          if (categoriaMovimento && item._acc.somaPorMovimento) {
            item._acc.somaPorMovimento.set(categoriaMovimento, (item._acc.somaPorMovimento.get(categoriaMovimento) || 0) + valorTrabalho)
          }
        }
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
        if (tipoAgregacao !== 'CONTAGEM') {
          item._acc.soma += valorTrabalho
          if (valsColuna && item._acc.somaPorColuna) {
            for (let ci = 0; ci < valsColuna.length; ci++) item._acc.somaPorColuna[ci] += valsColuna[ci]
          }
          if (categoriaMovimento && item._acc.somaPorMovimento) {
            item._acc.somaPorMovimento.set(categoriaMovimento, (item._acc.somaPorMovimento.get(categoriaMovimento) || 0) + valorTrabalho)
          }
        }
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
  await Promise.all(itens.map(async item => {
    item.regras = await resolverRegrasSetorFuncionario(item.regras || [])
  }))

  for (const item of itens) {
    // Sem Regras de Cálculo e com mais de uma coluna somada (ex: "totalvenda+totaldevolucao"),
    // guarda o total de cada coluna separado — usado pela calculadora de Venda x Devolução no front.
    const partesColuna = (item.regras || []).length === 0 ? (item.colunaValor || '').split('+').map(s => s.trim()).filter(Boolean) : []
    item._acc = {
      totalLinhas: 0, totalFiltradas: 0, soma: 0,
      somaPorColuna: partesColuna.length > 1 ? new Array(partesColuna.length).fill(0) : null, partesColuna,
      somaPorMovimento: item.colunaTipoMovimento ? new Map() : null,
    }
  }

  const grupos = new Map()
  for (const item of itens) {
    const chave = chaveGrupo(item)
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(item)
  }

  for (const [, itensDoGrupo] of grupos) {
    const base = itensDoGrupo[0]
    const fusoHorario = fusoHorarioFonteCalculo(base.pastaSharepoint, base.prefixoArquivo)
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

    if (base.microwork) {
      // Fonte MicroWork: a API consulta mês a mês — lê cada mês do intervalo do grupo uma vez.
      for (const { ano, mes } of mesesDoIntervalo(dataInicioGrupo, dataFimGrupo)) {
        const aoa = await lerAoAMicrowork(base.microwork, ano, mes)
        agregarArquivoParaGrupo(
          aoa, 0, itensDoGrupo,
          base.colunaEmpresa, base.colunaData, base.colunaValor, base.colunaTipoMovimento, base.colunaFuncionario,
          base.regras, base.tipoAgregacao, contadorGrupo, fusoHorario
        )
      }
      for (const item of itensDoGrupo) item._acc.totalLinhas = contadorGrupo.totalLinhas
      continue
    }

    for (const ano of anos) {
      const files = await listarArquivos({
        pastaSharepoint: base.pastaSharepoint, prefixoArquivo: base.prefixoArquivo,
        usaSubpastaAno: base.usaSubpastaAno, subpastaPadrao: base.subpastaPadrao, ano,
        dataInicio: dataInicioGrupo, dataFim: dataFimGrupo,
      })
      for (const file of files) {
        const downloadUrl = file['@microsoft.graph.downloadUrl']
        if (!downloadUrl) continue
        const linha0 = base.linhaCabecalho || 0
        const aoa = await lerArquivoComoAoA(downloadUrl, linha0)
        agregarArquivoParaGrupo(
          aoa, linha0, itensDoGrupo,
          base.colunaEmpresa, base.colunaData, base.colunaValor, base.colunaTipoMovimento, base.colunaFuncionario,
          base.regras, base.tipoAgregacao, contadorGrupo, fusoHorario
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
    const valorPorColuna = acc.somaPorColuna
      ? acc.partesColuna.map((coluna, i) => ({
          coluna,
          valor: item.tipoAgregacao === 'MEDIA' ? (acc.totalFiltradas > 0 ? acc.somaPorColuna[i] / acc.totalFiltradas : 0) : acc.somaPorColuna[i],
        }))
      : null
    // Ordem alfabética pelo nome da categoria, pra ficar estável entre chamadas (Map preserva
    // ordem de inserção, que varia conforme a ordem das linhas no arquivo).
    const valorPorMovimento = acc.somaPorMovimento
      ? [...acc.somaPorMovimento.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([coluna, valor]) => ({ coluna, valor }))
      : null
    return {
      id: item.id,
      valor,
      total_linhas_fonte: acc.totalLinhas,
      total_linhas_filtradas: acc.totalFiltradas,
      valor_por_coluna: valorPorColuna,
      valor_por_movimento: valorPorMovimento,
    }
  })
}
