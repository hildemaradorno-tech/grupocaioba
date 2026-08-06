import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getColunas, preview } from '../services/sharepointFonteCalculo.js'
import { calcularLote } from '../services/calculoComissoesLote.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/calculo-comissao/colunas?pasta=...&prefixo=...&usaSubpastaAno=true|false&ano=2026
// Diagnóstico: lista as colunas reais do arquivo, para o cadastro de Fonte/Base de Cálculo.
router.get('/colunas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { pasta, prefixo, usaSubpastaAno, ano, linhaCabecalho } = req.query
  if (!pasta || !prefixo) {
    return res.status(400).json({ error: 'Parâmetros obrigatórios: pasta, prefixo' })
  }
  const info = await getColunas({
    pastaSharepoint: pasta,
    prefixoArquivo: prefixo,
    usaSubpastaAno: usaSubpastaAno === 'true',
    ano: ano ? Number(ano) : undefined,
    linhaCabecalho: linhaCabecalho ? Number(linhaCabecalho) : 0,
  })
  res.json(info)
}))

// POST /api/calculo-comissao/preview
// Body: { pasta, prefixo, usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData,
//         colunaValor, tipoAgregacao, empresaNome, dataInicio, dataFim,
//         regras: [{ tipo_acao, coluna_alvo, condicao_logica, condicoes: [{ coluna, operador, valor }] }] }
// Painel de conferência: calcula o valor agregado para a empresa/período informados,
// aplicando as Regras de Cálculo da Base (se houver). POST (não GET) porque `regras`
// é uma lista aninhada de tamanho variável — não cabe bem em querystring.
router.post('/preview', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const {
    pasta, prefixo, usaSubpastaAno, linhaCabecalho,
    colunaEmpresa, colunaData, colunaValor, tipoAgregacao,
    empresaNome, dataInicio, dataFim, regras,
  } = req.body || {}

  if (!pasta || !prefixo || !colunaValor) {
    return res.status(400).json({ error: 'Fonte/Base de Cálculo sem arquivo ou coluna de valor configurados.' })
  }

  const resultado = await preview({
    pastaSharepoint: pasta,
    prefixoArquivo: prefixo,
    usaSubpastaAno: !!usaSubpastaAno,
    linhaCabecalho: linhaCabecalho ? Number(linhaCabecalho) : 0,
    colunaEmpresa, colunaData, colunaValor,
    tipoAgregacao: tipoAgregacao || 'SOMA',
    empresaNome: empresaNome || null,
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
    regras: Array.isArray(regras) ? regras : [],
  })
  res.json(resultado)
}))

// POST /api/calculo-comissao/lote
// Body: { itens: [{ id, pasta, prefixo, usaSubpastaAno, linhaCabecalho, colunaEmpresa,
//   colunaData, colunaValor, colunaFuncionario, tipoAgregacao, regras, empresaNomes (array —
//   nível EMPRESA manda todas as empresas do Agrupamento, nível INDIVIDUAL manda só a própria),
//   funcionarioNome, dataInicio, dataFim }] }
// Calcula vários funcionários de uma vez, agrupando por arquivo pra ler cada um só uma vez
// (ver calculoComissoesLote.js) — usado pelo Cálculo de Comissões em lote.
router.post('/lote', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const { itens } = req.body || {}
  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: 'Parâmetro obrigatório: itens (array não vazio)' })
  }

  const itensNormalizados = itens.map(it => ({
    id: it.id,
    pastaSharepoint: it.pasta,
    prefixoArquivo: it.prefixo,
    usaSubpastaAno: !!it.usaSubpastaAno,
    linhaCabecalho: it.linhaCabecalho ? Number(it.linhaCabecalho) : 0,
    colunaEmpresa: it.colunaEmpresa,
    colunaData: it.colunaData,
    colunaValor: it.colunaValor,
    colunaFuncionario: it.colunaFuncionario || null,
    tipoAgregacao: it.tipoAgregacao || 'SOMA',
    regras: Array.isArray(it.regras) ? it.regras : [],
    empresaNomes: Array.isArray(it.empresaNomes) ? it.empresaNomes.filter(Boolean) : (it.empresaNome ? [it.empresaNome] : []),
    funcionarioNome: it.funcionarioNome || null,
    dataInicio: it.dataInicio || null,
    dataFim: it.dataFim || null,
  }))

  const faltando = itensNormalizados.find(it => !it.pastaSharepoint || !it.prefixoArquivo || !it.colunaValor)
  if (faltando) {
    return res.status(400).json({ error: `Item "${faltando.id}" sem arquivo ou coluna de valor configurados.` })
  }

  const resultados = await calcularLote(itensNormalizados)
  res.json({ resultados })
}))

export default router
