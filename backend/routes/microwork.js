import { Router } from 'express'
import { isMicroworkConfigured, buscarRelatorioMicrowork } from '../services/microworkIntegracao.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// POST /api/microwork/testar — chama um relatório cadastrado (tela Fonte MicroWork) pro
// mês/ano informado e devolve a resposta crua, pra visualizar antes de mapear o armazenamento.
router.post('/testar', wrap(async (req, res) => {
  if (!isMicroworkConfigured()) {
    return res.status(503).json({ error: 'microwork_not_configured', message: 'MICROWORK_API_TOKEN não configurado no ambiente.' })
  }
  const {
    idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute, idrelatoriousuarioleiaute,
    ididioma, listaempresas, filtros_fixos, ano, mes,
  } = req.body

  if (!idrelatorioconfiguracao || !idrelatorioconsulta || !idrelatorioconfiguracaoleiaute || !idrelatoriousuarioleiaute) {
    return res.status(400).json({ error: 'campos_obrigatorios', message: 'Informe idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute e idrelatoriousuarioleiaute.' })
  }
  if (!ano || !mes) {
    return res.status(400).json({ error: 'periodo_obrigatorio', message: 'Informe ano e mês.' })
  }

  const data = await buscarRelatorioMicrowork({
    idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute, idrelatoriousuarioleiaute,
    ididioma, listaempresas, filtrosFixos: filtros_fixos, ano, mes,
  })
  res.json(data)
}))

export default router
