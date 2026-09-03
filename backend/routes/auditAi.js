import { Router } from 'express'
import { chamarIA } from '../services/auditAiService.js'
import { buscarNormasRelevantes, formatarNormasParaPrompt } from '../services/normasContabeisKB.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Remove tags HTML dos campos de rich text (Fatos Apontados/Recomendações)
// antes de mandar pro prompt — texto puro é suficiente pro diagnóstico.
const textoSimples = (html) => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

// POST /api/audit-ai/diagnostico — recebe os dados já gravados no Supabase de
// uma divergência (sem upload de arquivo) e devolve causa raiz provável,
// minuta do lançamento contábil de regularização e rascunho da devolutiva.
router.post('/diagnostico', wrap(async (req, res) => {
  const { achado } = req.body
  if (!achado) return res.status(400).json({ error: 'Campo "achado" é obrigatório.' })

  const systemPrompt = `Você é um especialista em contabilidade e auditoria externa (NBC TG/NBC TA/CPC), atuando como copiloto da controladoria de um grupo empresarial. Responda SEMPRE em português do Brasil e SEMPRE em JSON válido, sem nenhum texto fora do JSON, no formato exato:
{
  "causa_raiz": "string — hipótese mais provável da causa raiz",
  "lancamento_contabil": { "debito": "string — conta e valor", "credito": "string — conta e valor", "historico": "string — histórico padrão do lançamento" },
  "rascunho_devolutiva": "string — rascunho formal de resposta da controladoria para a auditoria externa"
}`

  const userPrompt = `Divergência: ${achado.titulo || '—'} (${achado.numero_codigo || ''})
Motivo: ${achado.motivo || '—'}
Fundamentação técnica: ${achado.fundamentacao_tecnica || '—'}
Total apontado: ${fmtMoeda(achado.total_apontado)}
Impacto: ${achado.audext_impactos?.nome || achado.impactos || '—'}
Fatos apontados pela auditoria: ${textoSimples(achado.fatos_apontados) || '—'}
Recomendações da auditoria: ${textoSimples(achado.recomendacoes) || '—'}
Evidências: ${achado.evidencias || '—'}`

  const texto = await chamarIA({ systemPrompt, userPrompt, jsonMode: true })
  let resultado
  try { resultado = JSON.parse(texto) }
  catch { throw new Error('IA retornou um formato inesperado. Tente novamente.') }

  res.json(resultado)
}))

// POST /api/audit-ai/chat — chat contextual: cruza a pergunta com normas
// contábeis (base estática) e com achados relacionados que o FRONTEND já
// buscou no Supabase (evita depender de SUPABASE_SERVICE_KEY nesta rota,
// mesmo padrão usado em routes/projetosManifestacoes.js).
router.post('/chat', wrap(async (req, res) => {
  const { mensagem, achadosRelacionados = [], historico = [] } = req.body
  if (!mensagem?.trim()) return res.status(400).json({ error: 'Campo "mensagem" é obrigatório.' })

  const normas = buscarNormasRelevantes(mensagem)
  const contextoNormas = formatarNormasParaPrompt(normas)

  const contextoAchados = achadosRelacionados.length
    ? achadosRelacionados.map(a =>
        `- ${a.numero_codigo || ''} ${a.titulo || ''} (risco: ${a.classificacao_risco || '—'}, total apontado: ${fmtMoeda(a.total_apontado)})`
      ).join('\n')
    : '(nenhum achado relacionado encontrado na base)'

  const systemPrompt = `Você é o Copiloto de Auditoria Externa de um grupo empresarial, especialista em normas contábeis brasileiras (NBC TG, NBC TA, CPC). Responda em português do Brasil, de forma direta e técnica. Use o contexto de normas e achados abaixo quando relevante, mas também pode responder com seu conhecimento geral de contabilidade quando o contexto não cobrir a pergunta.

Normas contábeis relevantes:
${contextoNormas}

Achados relacionados já registrados no sistema:
${contextoAchados}`

  const historicoTexto = historico.slice(-6).map(h => `${h.role === 'user' ? 'Usuário' : 'Copiloto'}: ${h.text}`).join('\n')
  const userPrompt = historicoTexto ? `${historicoTexto}\nUsuário: ${mensagem}` : mensagem

  const resposta = await chamarIA({ systemPrompt, userPrompt, jsonMode: false })
  res.json({ resposta })
}))

export default router
