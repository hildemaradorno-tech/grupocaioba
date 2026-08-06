import { Router } from 'express'
import { isConfigured } from '../services/graphClient.js'
import { listarArquivos, lerArquivoComoAoA, toIsoDate } from '../services/sharepointFonteCalculo.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

const PASTA_FERIAS = '/Banco de Dados - DAF - Pós-Vendas/RH/Férias'
const PREFIXO_FERIAS = 'Relacao de Ferias Calculadas'

// Colunas do arquivo -> campos da tabela rh_ferias (definidas com o usuário; o arquivo tem
// ~40 colunas mas só estas interessam).
const COLUNAS = [
  { arquivo: 'i_empregados', campo: 'codigo_empregado', tipo: 'int' },
  { arquivo: 'nome', campo: 'nome', tipo: 'texto' },
  { arquivo: 'inicio_gozo', campo: 'inicio_gozo', tipo: 'data' },
  { arquivo: 'fim_gozo', campo: 'fim_gozo', tipo: 'data' },
  { arquivo: 'i_cargos', campo: 'codigo_cargo', tipo: 'int' },
  { arquivo: 'sq_nome_cargo', campo: 'nome_cargo', tipo: 'texto' },
  { arquivo: 'sq_nome_ccustos', campo: 'nome_ccustos', tipo: 'texto' },
  { arquivo: 'cgce_emp', campo: 'cnpj_empresa', tipo: 'texto' },
]

// GET /api/rh-ferias/info
// Só lista metadados da pasta do SharePoint (sem baixar/ler o arquivo) — leve o bastante pra
// checar a data de modificação toda vez que a tela de Cálculo de Comissões abre, sem custo de
// baixar a planilha inteira. Usado pra avisar quando o arquivo de férias pode estar desatualizado
// em relação ao período sendo calculado.
router.get('/info', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })

  const files = await listarArquivos({
    pastaSharepoint: PASTA_FERIAS,
    prefixoArquivo: PREFIXO_FERIAS,
    usaSubpastaAno: false,
  })

  const dataModificacao = files.reduce((maisRecente, f) => {
    if (!f.lastModifiedDateTime) return maisRecente
    return !maisRecente || f.lastModifiedDateTime > maisRecente ? f.lastModifiedDateTime : maisRecente
  }, null)

  res.json({ dataModificacao, arquivos: files.map(f => f.name) })
}))

// GET /api/rh-ferias/linhas
// Lê o arquivo de férias do SharePoint e devolve só as colunas escolhidas, já tipadas
// (datas em ISO). O merge com o que existe no Supabase é feito no frontend.
router.get('/linhas', wrap(async (req, res) => {
  if (!isConfigured()) return res.status(503).json({ error: 'sharepoint_not_configured' })

  const files = await listarArquivos({
    pastaSharepoint: PASTA_FERIAS,
    prefixoArquivo: PREFIXO_FERIAS,
    usaSubpastaAno: false,
  })
  if (files.length === 0) {
    return res.status(404).json({ error: `Nenhum arquivo "${PREFIXO_FERIAS}*" encontrado em ${PASTA_FERIAS}.` })
  }

  const linhas = []
  for (const file of files) {
    const downloadUrl = file['@microsoft.graph.downloadUrl']
    if (!downloadUrl) continue
    const aoa = await lerArquivoComoAoA(downloadUrl, 0)
    if (aoa.length === 0) continue

    const cabecalho = aoa[0]
    const indices = COLUNAS.map(c => ({ ...c, idx: cabecalho.indexOf(c.arquivo) }))
    const faltando = indices.filter(c => c.idx < 0).map(c => c.arquivo)
    if (faltando.length > 0) {
      return res.status(422).json({ error: `Colunas não encontradas no arquivo "${file.name}": ${faltando.join(', ')}` })
    }

    for (let i = 1; i < aoa.length; i++) {
      const r = aoa[i]
      const linha = {}
      let temAlgo = false
      for (const c of indices) {
        let v = r[c.idx]
        if (v === undefined || v === null || v === '') { linha[c.campo] = null; continue }
        if (c.tipo === 'data') v = toIsoDate(v)
        else if (c.tipo === 'int') { const n = parseInt(v, 10); v = Number.isNaN(n) ? null : n }
        else v = String(v).trim() || null
        linha[c.campo] = v
        if (v !== null) temAlgo = true
      }
      if (temAlgo && linha.nome) linhas.push(linha)
    }
  }

  res.json({ linhas, total: linhas.length, arquivos: files.map(f => f.name) })
}))

export default router
