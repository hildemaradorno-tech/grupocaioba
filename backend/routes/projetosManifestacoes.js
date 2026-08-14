import { Router } from 'express'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { encerrarPeriodoManifestacao } from '../services/manifestacaoService.js'
import { enviarEmail } from '../services/emailService.js'

const router = Router()

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next)

// POST /api/projetos/:id/encerrar-manifestacao — encerramento manual do Período
// de Manifestação (Etapa 2), disparado pelo responsável via tela. O encerramento
// automático por prazo é feito pelo manifestacaoScheduler chamando a mesma
// função de serviço diretamente (sem passar por HTTP).
router.post('/:id/encerrar-manifestacao', authMiddleware, wrap(async (req, res) => {
  await encerrarPeriodoManifestacao(req.params.id, { manual: true, usuarioEmail: req.user.email })
  res.json({ success: true })
}))

// POST /api/projetos/:id/enviar-convites — dispara e-mail de convite.
// O frontend já busca nome/email dos usuários no Supabase e envia aqui prontos,
// eliminando a dependência de SUPABASE_SERVICE_KEY nesta rota.
router.post('/:id/enviar-convites', wrap(async (req, res) => {
  const { projeto, destinatarios } = req.body
  if (!Array.isArray(destinatarios) || destinatarios.length === 0) return res.json({ enviados: 0 })

  const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

  let enviados = 0
  for (const u of destinatarios) {
    if (!u.email) continue
    try {
      await enviarEmail({
        to: u.email,
        subject: `Período de Manifestação aberto — ${projeto?.nome || ''}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
            <h2 style="color:#1e40af;margin-bottom:4px">Manifestação de Projeto</h2>
            <p>Olá, <strong>${u.nome || u.email}</strong>.</p>
            <p>Você foi convidado(a) a participar do <strong>Período de Manifestação</strong> do projeto:</p>
            <p style="font-size:17px;font-weight:bold;background:#f1f5f9;padding:10px 14px;border-radius:6px;border-left:4px solid #3b82f6">${projeto?.nome || ''}</p>
            <p><strong>Prazo para manifestação:</strong> ${fmtData(projeto?.manifestacao_prazo)}</p>
            <p>Acesse o Portal de Gestão, abra o projeto e clique na aba <strong>Manifestações</strong> para enviar sua sugestão, correção, inclusão, dúvida ou "De Acordo".</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
            <p style="font-size:11px;color:#94a3b8">Portal de Gestão — notificação automática. Não responda este e-mail.</p>
          </div>
        `,
      })
      enviados++
    } catch (err) {
      console.warn(`[manifestacao] Falha ao enviar e-mail para ${u.email}:`, err.message)
    }
  }

  res.json({ enviados })
}))

export default router
