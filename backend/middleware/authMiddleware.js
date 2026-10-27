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

// Perfil do usuário logado em `usuarios` (casado por e-mail, como as policies RLS sec_*).
// Retorna { id, grupo_id, is_admin } ou null se não houver perfil ativo.
export async function getPerfilUsuario(email) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin || !email) return null
  const { data: perfil } = await supabaseAdmin
    .from('usuarios').select('id, grupo_id, ativo').ilike('email', email).limit(1).maybeSingle()
  if (!perfil || perfil.ativo === false) return null
  const { data: grupo } = perfil.grupo_id
    ? await supabaseAdmin.from('grupos_acesso').select('is_admin').eq('id', perfil.grupo_id).maybeSingle()
    : { data: null }
  return { id: perfil.id, grupo_id: perfil.grupo_id, is_admin: !!grupo?.is_admin }
}

// Exige que o grupo do usuário seja admin ou tenha algum dos menus (mesma regra do PermissionRoute
// e das policies RLS). Usar sempre depois de authMiddleware.
export function requireMenu(...menuPaths) {
  return async (req, res, next) => {
    try {
      const perfil = await getPerfilUsuario(req.user?.email)
      if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })
      if (perfil.is_admin) { req.perfil = perfil; return next() }
      const { data } = await getSupabaseAdmin()
        .from('permissoes_grupo').select('menu_path')
        .eq('grupo_id', perfil.grupo_id).in('menu_path', menuPaths).limit(1)
      if (!data?.length) return res.status(403).json({ error: 'Sem permissão para esta operação.' })
      req.perfil = perfil
      next()
    } catch (err) {
      next(err)
    }
  }
}
