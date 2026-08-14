import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabaseClient'
import { normalizePath } from '../config/menuTree'
import { DIMENSOES_COMISSAO, escopoComissaoTudoLiberado, escopoComissaoTudoBloqueado } from '../utils/permissoesComissao'

const AuthContext = createContext(null)

// Monta o shape { [dimensao]: { modo, valores:Set } } a partir das linhas cruas das duas
// tabelas de escopo de Comissões — dimensão sem linha em `modos` vira TODOS (sem restrição).
function montarComissaoEscopo(modos, valores) {
  const escopo = {}
  for (const dim of DIMENSOES_COMISSAO) {
    const modoRow = (modos || []).find(m => m.dimensao === dim)
    escopo[dim] = {
      modo: modoRow?.modo === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TODOS',
      valores: new Set((valores || []).filter(v => v.dimensao === dim).map(v => v.valor)),
    }
  }
  return escopo
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissions, setPermissions] = useState(new Set())
  const [permissoesAcoes, setPermissoesAcoes] = useState(new Set()) // Set de "menu_path|acao"
  const [isAdmin, setIsAdmin] = useState(false)
  const [empresasPermitidas, setEmpresasPermitidas] = useState(new Set())
  const [departamentosPermitidos, setDepartamentosPermitidos] = useState(new Set())
  // Escopo de acesso exclusivo do módulo Cálculo de Comissões (5 dimensões, cada uma
  // TODOS ou INDIVIDUAL) — separado da restrição de Empresa usada em Garantias DAF.
  const [comissaoEscopo, setComissaoEscopo] = useState(escopoComissaoTudoLiberado())
  // Trava mestre: enquanto false, o grupo não enxerga nenhum funcionário em Cálculo de
  // Comissões — precisa ser habilitada manualmente em Grupos de Acesso (não vem ligada
  // por padrão, mesmo com as 5 dimensões todas em "Todos").
  const [comissaoEscopoHabilitado, setComissaoEscopoHabilitado] = useState(false)
  const [userNome, setUserNome] = useState('')
  const [usuarioId, setUsuarioId] = useState(null) // usuarios.id (≠ auth.users.id)
  const [trocarSenha, setTrocarSenha] = useState(false)

  // Simulação de visualização como outro usuário
  const [impersonando, setImpersonando] = useState(null) // { id, nome, email }
  const [impersonandoPermissions, setImpersonandoPermissions] = useState(new Set())
  const [impersonandoAcoes, setImpersonandoAcoes] = useState(new Set())
  const [impersonandoIsAdmin, setImpersonandoIsAdmin] = useState(false)
  const [impersonandoEmpresas, setImpersonandoEmpresas] = useState(new Set())
  const [impersonandoDeptos, setImpersonandoDeptos] = useState(new Set())
  const [impersonandoComissaoEscopo, setImpersonandoComissaoEscopo] = useState(escopoComissaoTudoLiberado())
  const [impersonandoComissaoEscopoHabilitado, setImpersonandoComissaoEscopoHabilitado] = useState(false)

  const loadPermissions = async (authUser) => {
    if (!authUser) {
      setPermissions(new Set())
      setIsAdmin(false)
      setEmpresasPermitidas(new Set())
      setDepartamentosPermitidos(new Set())
      setComissaoEscopo(escopoComissaoTudoLiberado())
      setComissaoEscopoHabilitado(false)
      setUserNome('')
      setUsuarioId(null)
      setPermissionsLoading(false)
      return
    }

    setPermissionsLoading(true)
    try {
      // Busca por email (mais robusto — evita mismatch entre auth.users.id e usuarios.id)
      const { data: perfil, error: e1 } = await supabase
        .from('usuarios')
        .select('id, grupo_id, nome')
        .eq('email', authUser.email)
        .maybeSingle()

      if (e1) {
        console.error('[Auth] Erro ao buscar perfil do usuário:', e1)
        setPermissions(new Set())
        setIsAdmin(false)
        setUserNome('')
        return
      }

      setUserNome(perfil?.nome || '')
      setUsuarioId(perfil?.id || null)

      if (!perfil?.grupo_id) {
        console.warn('[Auth] Usuário sem grupo_id — sem permissões atribuídas:', authUser.email)
        setPermissions(new Set())
        setIsAdmin(false)
        setComissaoEscopo(escopoComissaoTudoLiberado())
        setComissaoEscopoHabilitado(false)
        return
      }

      const [{ data: grupo, error: e2 },{ data: perms, error: e3 }, { data: empPerms, error: e4 }, { data: acoes }, { data: deptoPerms }] = await Promise.all([
        supabase.from('grupos_acesso').select('is_admin').eq('id', perfil.grupo_id).single(),
        supabase.from('permissoes_grupo').select('menu_path').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_empresa_grupo').select('empresa_id').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_grupo_acoes').select('menu_path, acao').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_depto_grupo').select('departamento_nome').eq('grupo_id', perfil.grupo_id),
      ])

      if (e2) {
        console.error('[Auth] Erro ao buscar grupo de acesso:', e2)
        setPermissions(new Set())
        setIsAdmin(false)
        setEmpresasPermitidas(new Set())
        setDepartamentosPermitidos(new Set())
        setComissaoEscopo(escopoComissaoTudoLiberado())
        setComissaoEscopoHabilitado(false)
        return
      }

      if (e3) {
        console.error('[Auth] Erro ao buscar permissões:', e3)
        setPermissions(new Set())
        setIsAdmin(false)
        setEmpresasPermitidas(new Set())
        setDepartamentosPermitidos(new Set())
        setComissaoEscopo(escopoComissaoTudoLiberado())
        setComissaoEscopoHabilitado(false)
        return
      }

      console.log('[Auth] Permissões carregadas — isAdmin:', !!grupo?.is_admin, '| paths:', perms?.length ?? 0, '| empresas:', empPerms?.length ?? 0, '| deptos:', deptoPerms?.length ?? 0)
      setIsAdmin(!!grupo?.is_admin)
      setPermissions(new Set((perms || []).map(p => p.menu_path)))
      setEmpresasPermitidas(new Set((empPerms || []).map(p => p.empresa_id)))
      setDepartamentosPermitidos(new Set((deptoPerms || []).map(p => p.departamento_nome)))
      setPermissoesAcoes(new Set((acoes || []).map(a => `${a.menu_path}|${a.acao}`)))

      // Busca isolada e best-effort: um problema aqui (coluna/tabela ainda não migrada, etc.)
      // nunca deve derrubar as permissões básicas já carregadas acima.
      try {
        const [{ data: modos }, { data: valores }, { data: grupoComissao }] = await Promise.all([
          supabase.from('permissoes_comissao_modo').select('dimensao, modo').eq('grupo_id', perfil.grupo_id),
          supabase.from('permissoes_comissao_valor').select('dimensao, valor').eq('grupo_id', perfil.grupo_id),
          supabase.from('grupos_acesso').select('comissao_escopo_habilitado').eq('id', perfil.grupo_id).maybeSingle(),
        ])
        setComissaoEscopo(montarComissaoEscopo(modos, valores))
        setComissaoEscopoHabilitado(!!grupoComissao?.comissao_escopo_habilitado)
      } catch {
        setComissaoEscopo(escopoComissaoTudoLiberado())
        setComissaoEscopoHabilitado(false)
      }

      try {
        const { data: flagSenha } = await supabase
          .from('usuarios').select('trocar_senha').eq('email', authUser.email).maybeSingle()
        setTrocarSenha(!!flagSenha?.trocar_senha)
      } catch { setTrocarSenha(false) }
    } catch (err) {
      console.error('[Auth] Exceção ao carregar permissões:', err)
      setPermissions(new Set())
      setIsAdmin(false)
      setEmpresasPermitidas(new Set())
      setDepartamentosPermitidos(new Set())
      setComissaoEscopo(escopoComissaoTudoLiberado())
      setComissaoEscopoHabilitado(false)
      setPermissoesAcoes(new Set())
    } finally {
      setPermissionsLoading(false)
    }
  }

  useEffect(() => {
    // Guarda o último userId para evitar recarregar permissões quando apenas o
    // token foi renovado (TOKEN_REFRESHED, SIGNED_IN no refoco de aba, etc.).
    // Só recarrega quando o usuário de fato muda (login/logout/troca de conta).
    let _lastUserId = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null
      _lastUserId = authUser?.id ?? null
      setUser(authUser)
      loadPermissions(authUser).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null
      const newId = authUser?.id ?? null
      setUser(authUser)
      if (newId !== _lastUserId) {
        _lastUserId = newId
        loadPermissions(authUser)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const iniciarVisualizacao = async (usuario) => {
    try {
      const { data: perfil } = await supabase
        .from('usuarios')
        .select('grupo_id')
        .eq('id', usuario.id)
        .maybeSingle()

      if (!perfil?.grupo_id) {
        setImpersonando({ ...usuario, semGrupo: true })
        setImpersonandoPermissions(new Set())
        setImpersonandoIsAdmin(false)
        setImpersonandoEmpresas(new Set())
        setImpersonandoDeptos(new Set())
        setImpersonandoAcoes(new Set())
        setImpersonandoComissaoEscopo(escopoComissaoTudoLiberado())
        setImpersonandoComissaoEscopoHabilitado(false)
        return
      }

      const [{ data: grupo }, { data: perms }, { data: empPerms }, { data: acoes }, { data: deptoPerms }] = await Promise.all([
        supabase.from('grupos_acesso').select('is_admin').eq('id', perfil.grupo_id).single(),
        supabase.from('permissoes_grupo').select('menu_path').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_empresa_grupo').select('empresa_id').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_grupo_acoes').select('menu_path, acao').eq('grupo_id', perfil.grupo_id),
        supabase.from('permissoes_depto_grupo').select('departamento_nome').eq('grupo_id', perfil.grupo_id),
      ])

      setImpersonandoIsAdmin(!!grupo?.is_admin)
      setImpersonandoPermissions(new Set((perms || []).map(p => p.menu_path)))
      setImpersonandoEmpresas(new Set((empPerms || []).map(p => p.empresa_id)))
      setImpersonandoDeptos(new Set((deptoPerms || []).map(p => p.departamento_nome)))
      setImpersonandoAcoes(new Set((acoes || []).map(a => `${a.menu_path}|${a.acao}`)))
      setImpersonando(usuario)

      // Best-effort — nunca deve impedir a visualização como o usuário mesmo se falhar.
      try {
        const [{ data: modos }, { data: valores }, { data: grupoComissao }] = await Promise.all([
          supabase.from('permissoes_comissao_modo').select('dimensao, modo').eq('grupo_id', perfil.grupo_id),
          supabase.from('permissoes_comissao_valor').select('dimensao, valor').eq('grupo_id', perfil.grupo_id),
          supabase.from('grupos_acesso').select('comissao_escopo_habilitado').eq('id', perfil.grupo_id).maybeSingle(),
        ])
        setImpersonandoComissaoEscopo(montarComissaoEscopo(modos, valores))
        setImpersonandoComissaoEscopoHabilitado(!!grupoComissao?.comissao_escopo_habilitado)
      } catch {
        setImpersonandoComissaoEscopo(escopoComissaoTudoLiberado())
        setImpersonandoComissaoEscopoHabilitado(false)
      }
    } catch (err) {
      console.error('[Auth] Erro ao iniciar visualização:', err)
    }
  }

  const encerrarVisualizacao = () => {
    setImpersonando(null)
    setImpersonandoPermissions(new Set())
    setImpersonandoIsAdmin(false)
    setImpersonandoEmpresas(new Set())
    setImpersonandoDeptos(new Set())
    setImpersonandoAcoes(new Set())
    setImpersonandoComissaoEscopo(escopoComissaoTudoLiberado())
    setImpersonandoComissaoEscopoHabilitado(false)
  }

  const login = async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    setUser(data.user)
    return data
  }

  const marcarSenhaTrocada = async () => {
    try {
      await supabase.from('usuarios')
        .update({ trocar_senha: false })
        .eq('email', user.email)
    } catch (err) {
      console.error('[Auth] Erro ao marcar senha trocada:', err)
    }
    setTrocarSenha(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPermissions(new Set())
    setIsAdmin(false)
    setEmpresasPermitidas(new Set())
    setDepartamentosPermitidos(new Set())
    setComissaoEscopo(escopoComissaoTudoLiberado())
    setComissaoEscopoHabilitado(false)
    setTrocarSenha(false)
    setPermissoesAcoes(new Set())
    setUserNome('')
  }

  const hasPermission = (path) => {
    if (impersonando) {
      if (impersonandoIsAdmin) return true
      return impersonandoPermissions.has(normalizePath(path))
    }
    if (isAdmin) return true
    return permissions.has(normalizePath(path))
  }

  const hasAction = (path, acao) => {
    if (impersonando) {
      if (impersonandoIsAdmin) return true
      return impersonandoAcoes.has(`${normalizePath(path)}|${acao}`)
    }
    if (isAdmin) return true
    return permissoesAcoes.has(`${normalizePath(path)}|${acao}`)
  }

  // Verifica ação específica — sem flag configurada = negado (deny by default).
  const hasActionOrDefault = (path, acao) => {
    if (impersonando) {
      if (impersonandoIsAdmin) return true
      return impersonandoAcoes.has(`${normalizePath(path)}|${acao}`)
    }
    if (isAdmin) return true
    return permissoesAcoes.has(`${normalizePath(path)}|${acao}`)
  }

  const hasEmpresaPermission = (empresaId) => {
    if (impersonando) {
      if (impersonandoIsAdmin) return true
      return impersonandoEmpresas.has(empresaId)
    }
    if (isAdmin) return true
    return empresasPermitidas.has(empresaId)
  }

  // Reflete o grupo de acesso "em vigor" — quando um admin está em modo de
  // visualização como outro usuário, o grupo admin do usuário real não deve
  // liberar telas/alertas exclusivos de admin.
  const isAdminEfetivo = impersonando ? impersonandoIsAdmin : isAdmin

  // Set de departamentos permitidos considerando impersonação. Empty = sem restrição.
  const departamentosPermitidosEfetivos = useMemo(
    () => isAdminEfetivo ? new Set() : (impersonando ? impersonandoDeptos : departamentosPermitidos),
    [isAdminEfetivo, impersonando, impersonandoDeptos, departamentosPermitidos]
  )

  // Escopo de Cálculo de Comissões "em vigor" — admin (real ou impersonando) sempre vê tudo.
  // A dimensão "empresa" é controlada por "Acesso por Empresa" (empresasPermitidas), unificando
  // a restrição de empresa entre todos os módulos (Garantias DAF, Projetos, Comissões, etc.).
  const comissaoEscopoEfetivo = useMemo(() => {
    if (isAdminEfetivo) return escopoComissaoTudoLiberado()
    const habilitado = impersonando ? impersonandoComissaoEscopoHabilitado : comissaoEscopoHabilitado
    if (!habilitado) return escopoComissaoTudoBloqueado()
    const escopo = impersonando ? impersonandoComissaoEscopo : comissaoEscopo
    const emps = impersonando ? impersonandoEmpresas : empresasPermitidas
    return { ...escopo, empresa: { modo: 'INDIVIDUAL', valores: emps } }
  }, [isAdminEfetivo, impersonando, impersonandoComissaoEscopoHabilitado, comissaoEscopoHabilitado, impersonandoComissaoEscopo, comissaoEscopo, empresasPermitidas, impersonandoEmpresas])

  return (
    <AuthContext.Provider value={{
      user, loading, permissionsLoading, userNome, usuarioId,
      login, logout,
      hasPermission, hasAction, hasActionOrDefault, hasEmpresaPermission,
      isAdmin, isAdminEfetivo, empresasPermitidas,
      departamentosPermitidos, departamentosPermitidosEfetivos,
      comissaoEscopoEfetivo,
      trocarSenha, marcarSenhaTrocada,
      impersonando, iniciarVisualizacao, encerrarVisualizacao,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
