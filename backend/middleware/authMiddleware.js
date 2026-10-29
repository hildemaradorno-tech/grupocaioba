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
// Retorna { id, grupo_id, is_admin, menus:Set } ou null se não houver perfil ativo.
// Cache curto: uma tela dispara várias requisições seguidas e as permissões mudam raramente.
const CACHE_MS = 30_000
const cachePerfil = new Map()

export async function getPerfilUsuario(email) {
  const supabaseAdmin = getSupabaseAdmin()
  if (!supabaseAdmin || !email) return null
  const chave = email.toLowerCase()
  const hit = cachePerfil.get(chave)
  if (hit && Date.now() - hit.em < CACHE_MS) return hit.perfil

  const { data: perfil } = await supabaseAdmin
    .from('usuarios').select('id, grupo_id, ativo').ilike('email', email).limit(1).maybeSingle()
  let resultado = null
  if (perfil && perfil.ativo !== false) {
    const [{ data: grupo }, { data: menus }] = perfil.grupo_id
      ? await Promise.all([
          supabaseAdmin.from('grupos_acesso').select('is_admin').eq('id', perfil.grupo_id).maybeSingle(),
          supabaseAdmin.from('permissoes_grupo').select('menu_path').eq('grupo_id', perfil.grupo_id),
        ])
      : [{ data: null }, { data: [] }]
    resultado = {
      id: perfil.id,
      grupo_id: perfil.grupo_id,
      is_admin: !!grupo?.is_admin,
      menus: new Set((menus || []).map(m => m.menu_path)),
    }
  }
  cachePerfil.set(chave, { perfil: resultado, em: Date.now() })
  return resultado
}

const middlewareMenu = (permite) => async (req, res, next) => {
  try {
    const perfil = await getPerfilUsuario(req.user?.email)
    if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })
    if (!perfil.is_admin && !permite(perfil.menus)) return res.status(403).json({ error: 'Sem permissão para esta operação.' })
    req.perfil = perfil
    next()
  } catch (err) {
    next(err)
  }
}

// Exige que o grupo do usuário seja admin ou tenha algum dos menus (mesma regra do PermissionRoute
// e das policies RLS). Usar sempre depois de authMiddleware.
export const requireMenu = (...menuPaths) =>
  middlewareMenu(menus => menuPaths.some(m => menus.has(m)))

// Igual ao requireMenu, mas por prefixo de menu (ex: 'garantia' cobre 'garantias-daf-titulos').
export const requireMenuLike = (...prefixos) =>
  middlewareMenu(menus => [...menus].some(m => prefixos.some(p => m.startsWith(p))))

// ── Escopo por empresa (Acesso por Empresa do grupo) ─────────────────────────
// Os arquivos do SharePoint só trazem o nome da empresa. Mesmo critério do frontend
// (useEmpresasGarantias): nome casado com fantasia, nome oficial e nome no sistema, sem acento/caixa.
export const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const CAMPOS_EMPRESA = ['empresa_nome', 'empresa', 'titulo_empresa_nome', 'empresa_desc']
const cacheEmpresas = new Map()

export async function nomesEmpresasPermitidas(grupoId) {
  const hit = cacheEmpresas.get(grupoId)
  if (hit && Date.now() - hit.em < CACHE_MS) return hit.nomes
  const supabaseAdmin = getSupabaseAdmin()
  const { data: perms } = await supabaseAdmin.from('permissoes_empresa_grupo').select('empresa_id').eq('grupo_id', grupoId)
  const ids = (perms || []).map(p => p.empresa_id)
  const nomes = new Set()
  if (ids.length) {
    const { data: emps } = await supabaseAdmin
      .from('dim_empresas').select('empresa_fantasia, nome_empresa, nome_empresa_sistema').in('id', ids)
    for (const e of emps || []) for (const n of [e.empresa_fantasia, e.nome_empresa, e.nome_empresa_sistema]) if (n) nomes.add(normalizar(n))
  }
  cacheEmpresas.set(grupoId, { nomes, em: Date.now() })
  return nomes
}

function filtrar(valor, nomes) {
  if (Array.isArray(valor)) {
    return valor
      .filter(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return true
        const campo = CAMPOS_EMPRESA.find(c => typeof item[c] === 'string')
        return campo ? nomes.has(normalizar(item[campo])) : true
      })
      .map(item => filtrar(item, nomes))
  }
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, filtrar(v, nomes)]))
  }
  return valor
}

// Para rotas que devolvem linhas do SharePoint de várias empresas: não-admin só recebe as linhas das
// empresas liberadas no grupo. Usar depois de authMiddleware. Admin recebe tudo.
export async function filtrarPorEmpresa(req, res, next) {
  try {
    const perfil = await getPerfilUsuario(req.user?.email)
    if (!perfil) return res.status(403).json({ error: 'Usuário sem perfil ativo.' })
    if (perfil.is_admin) return next()
    const nomes = await nomesEmpresasPermitidas(perfil.grupo_id)
    const jsonOriginal = res.json.bind(res)
    res.json = (corpo) => jsonOriginal(res.statusCode < 400 ? filtrar(corpo, nomes) : corpo)
    next()
  } catch (err) {
    next(err)
  }
}
