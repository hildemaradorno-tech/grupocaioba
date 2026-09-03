/**
 * Valida o access_token do Supabase Auth (o que o frontend realmente tem via
 * AuthContext/supabase.auth) — não é o JWT local emitido por /api/login, que é
 * um fluxo legado não usado pelo frontend atual.
 */
import { getSupabaseAdmin } from '../services/supabaseAdmin.js'

export async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Token de autenticação ausente.' })

  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin) return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY não configurada no backend.' })

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return res.status(401).json({ error: 'Token inválido ou expirado.' })

  req.user = { id: data.user.id, email: data.user.email }
  next()
}
