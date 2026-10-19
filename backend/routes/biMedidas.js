import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { getColunas, agregarPorDimensoes } from '../services/sharepointFonteBi.js'
import { sincronizarBiMedidasDiario, sincronizacaoBiEmAndamento } from '../services/biMedidasDiarioSync.js'
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'
import { authMiddleware } from '../middleware/authMiddleware.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// GET /api/bi-medidas/colunas?pasta=...&prefixo=...&usaSubpastaAno=true|false&ano=2026
// Diagnóstico: lista as colunas reais do arquivo, para o cadastro de Fonte BI / Medida BI.
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

// POST /api/bi-medidas/agregar
// Body: { pasta, prefixo, usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData,
//         colunaValor, tipoAgregacao, empresaNome, dataInicio, dataFim,
//         colunasDimensao: { funcionario, tipo_os, natureza_operacao, movimento } (todas opcionais),
//         regras: [{ tipo_acao, coluna_alvo, condicao_logica, condicoes: [{ coluna, operador, valor }] }] }
// Painel de Conferência com corte por dimensão: agrega o valor da Medida agrupado pela
// combinação de dimensões pedida (valores BRUTOS do arquivo — a resolução contra os cadastros
// de Departamento/Setor/Box/Tipo de OS/Natureza/Movimento acontece no frontend).
router.post('/agregar', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  const {
    pasta, prefixo, usaSubpastaAno, linhaCabecalho,
    colunaEmpresa, colunaData, colunaValor, tipoAgregacao,
    colunasDimensao, regras, empresaNome, dataInicio, dataFim,
  } = req.body || {}

  if (!pasta || !prefixo || !colunaValor) {
    return res.status(400).json({ error: 'Fonte/Medida BI sem arquivo ou coluna de valor configurados.' })
  }

  const resultado = await agregarPorDimensoes({
    pastaSharepoint: pasta,
    prefixoArquivo: prefixo,
    usaSubpastaAno: !!usaSubpastaAno,
    linhaCabecalho: linhaCabecalho ? Number(linhaCabecalho) : 0,
    colunaEmpresa, colunaData, colunaValor,
    tipoAgregacao: tipoAgregacao || 'SOMA',
    colunasDimensao: colunasDimensao || {},
    regras: Array.isArray(regras) ? regras : [],
    empresaNome: empresaNome || null,
    dataInicio: dataInicio || null,
    dataFim: dataFim || null,
  })
  res.json(resultado)
}))

// POST /api/bi-medidas/sincronizar  body: { dataInicio, dataFim }
// Botão "Atualizar agora" do BI Possibilidades: relê o SharePoint para o período filtrado e grava
// fato_bi_medidas_diario (a tela lê de lá). Limite de 1 ano por chamada pra não estourar memória.
router.post('/sincronizar', authMiddleware, wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })
  if (sincronizacaoBiEmAndamento()) return res.status(409).json({ error: 'Já existe uma atualização do BI em andamento. Aguarde terminar.' })
  const { dataInicio, dataFim } = req.body || {}
  if (!dataInicio || !dataFim || dataInicio > dataFim) return res.status(400).json({ error: 'Informe Data Início e Data Fim válidas.' })
  const dias = (new Date(dataFim) - new Date(dataInicio)) / 86_400_000
  if (dias > 366) return res.status(400).json({ error: 'Período máximo para atualizar é de 1 ano.' })
  const resultado = await sincronizarBiMedidasDiario(getSupabaseAdmin(), { dataInicio, dataFim })
  res.json(resultado)
}))

export default router
