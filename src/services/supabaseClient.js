import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Política de Comissão se vincula à Fonte/Base de Cálculo por ID (fonte_calculo_id/base_calculo_id),
// não mais por um "código" texto — evita quebrar o vínculo quando a Fonte/Base é renomeada.
const SELECT_POLITICA_COM_FONTE_BASE = `
  *,
  fonte_calculo:dim_fontes_calculo(id, nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho, coluna_empresa, coluna_data, coluna_funcionario),
  base_calculo:dim_bases_calculo(id, nome, codigo, coluna_valor, tipo_agregacao)
`
const enriquecePoliticaFonteBase = (p) => ({
  ...p,
  tipo_evento_nome: p.fonte_calculo?.nome || null,
  base_tipo_nome: p.base_calculo?.nome || null,
})

// Mesma lógica de gerarCodigo() usada em BasesCalculo.jsx — usada aqui só pra gerar um código
// único ao copiar uma Medida de BI pra uma nova Base de Cálculo.
const gerarCodigoUnico = (nome, codigosExistentes) => {
  const base = (nome || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  let codigo = base
  let i = 2
  while (codigosExistentes.has(codigo)) {
    codigo = `${base}_${i}`
    i += 1
  }
  return codigo
}

export const apiService = {
  // USUÁRIOS
  getUsuarios: async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, ativo, criado_em, grupo_id, senha_atualizada_em')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  getUsuarioById: async (id) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, grupo_id')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  // GRUPOS DE ACESSO
  getGrupos: async () => {
    const { data, error } = await supabase
      .from('grupos_acesso')
      .select('*')
      .order('nome_grupo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createGrupo: async (nome_grupo, is_admin = false, departamento = null) => {
    const { data, error } = await supabase
      .from('grupos_acesso')
      .insert([{ nome_grupo, is_admin, departamento }])
      .select()
      .single()
    if (error) throw error
    return data
  },

  updateGrupo: async (id, nome_grupo, is_admin = false, departamento = null) => {
    const { data, error } = await supabase
      .from('grupos_acesso')
      .update({ nome_grupo, is_admin, departamento })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  deleteGrupo: async (id) => {
    const { error } = await supabase.from('grupos_acesso').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getPermissoesGrupo: async (grupoId) => {
    const { data, error } = await supabase
      .from('permissoes_grupo')
      .select('menu_path')
      .eq('grupo_id', grupoId)
    if (error) throw error
    return (data || []).map(p => p.menu_path)
  },

  setPermissoesGrupo: async (grupoId, { is_admin, paths }) => {
    const { error: e1 } = await supabase
      .from('grupos_acesso')
      .update({ is_admin })
      .eq('id', grupoId)
    if (e1) throw e1

    const { error: e2 } = await supabase
      .from('permissoes_grupo')
      .delete()
      .eq('grupo_id', grupoId)
    if (e2) throw e2

    if (paths.length > 0) {
      const { error: e3 } = await supabase
        .from('permissoes_grupo')
        .insert(paths.map(menu_path => ({ grupo_id: grupoId, menu_path })))
      if (e3) throw e3
    }
  },

  // Ações especiais por menu (além do acesso binário de permissoes_grupo) — usado hoje
  // só por 'calculo-comissoes': 'conferir' (Gerente) e 'processar' (RH).
  getPermissoesGrupoAcoes: async (grupoId) => {
    const { data, error } = await supabase
      .from('permissoes_grupo_acoes')
      .select('menu_path, acao')
      .eq('grupo_id', grupoId)
    if (error) throw error
    return data || []
  },

  setPermissoesGrupoAcoes: async (grupoId, acoes) => {
    const { error: eDel } = await supabase
      .from('permissoes_grupo_acoes')
      .delete()
      .eq('grupo_id', grupoId)
    if (eDel) throw eDel

    if (acoes.length > 0) {
      const { error: eIns } = await supabase
        .from('permissoes_grupo_acoes')
        .insert(acoes.map(({ menu_path, acao }) => ({ grupo_id: grupoId, menu_path, acao })))
      if (eIns) throw eIns
    }
  },

  getPermissoesEmpresasGrupo: async (grupoId) => {
    const { data, error } = await supabase
      .from('permissoes_empresa_grupo')
      .select('empresa_id')
      .eq('grupo_id', grupoId)
    if (error) throw error
    return (data || []).map(p => p.empresa_id)
  },

  getAllPermissoesEmpresasGrupos: async () => {
    const { data, error } = await supabase
      .from('permissoes_empresa_grupo')
      .select('grupo_id, empresa_id')
    if (error) throw error
    return data || []
  },

  setPermissoesEmpresasGrupo: async (grupoId, empresaIds) => {
    const { error: e1 } = await supabase
      .from('permissoes_empresa_grupo')
      .delete()
      .eq('grupo_id', grupoId)
    if (e1) throw e1
    if (empresaIds.length > 0) {
      const { error: e2 } = await supabase
        .from('permissoes_empresa_grupo')
        .insert(empresaIds.map(empresa_id => ({ grupo_id: grupoId, empresa_id })))
      if (e2) throw e2
    }
  },

  getAgrupamentoEmpresas: async () => {
    const { data, error } = await supabase
      .from('dim_agrupamento_empresas')
      .select('*')
      .order('nome_agrupamento', { ascending: true })
    if (error) throw error
    return data || []
  },

  getSegmentos: async () => {
    const { data, error } = await supabase
      .from('dim_segmentos')
      .select('*')
      .order('nome_segmento', { ascending: true })
    if (error) throw error
    return data || []
  },

  createSegmento: async ({ nome_segmento, ativo }) => {
    const { data, error } = await supabase
      .from('dim_segmentos')
      .insert([{
        nome_segmento,
        ativo: ativo ?? true
      }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateSegmento: async (id, { nome_segmento, ativo }) => {
    const { data, error } = await supabase
      .from('dim_segmentos')
      .update({ nome_segmento, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteSegmento: async (id) => {
    const { error } = await supabase
      .from('dim_segmentos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // AGRUPAMENTO DE DEPARTAMENTOS
  getAgrupamentoDepartamentos: async () => {
    const { data, error } = await supabase
      .from('dim_agrupamento_departamentos')
      .select('*')
      .order('nome_agrupamento', { ascending: true })
    if (error) throw error
    return data || []
  },

  createAgrupamentoDepartamento: async ({ nome_agrupamento, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_departamentos')
      .insert([{ nome_agrupamento, area: area || null, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateAgrupamentoDepartamento: async (id, { nome_agrupamento, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_departamentos')
      .update({ nome_agrupamento, area: area || null, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteAgrupamentoDepartamento: async (id) => {
    const { error } = await supabase
      .from('dim_agrupamento_departamentos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getDepartamentos: async () => {
    const { data, error } = await supabase
      .from('dim_departamentos')
      .select('*')
      .order('nome_departamento', { ascending: true })
    if (error) throw error
    return data || []
  },

  createDepartamento: async ({ nome_departamento, empresa_ids, agrupamento_departamento_id, agrupamento_departamento_nome, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_departamentos')
      .insert([{
        nome_departamento,
        empresa_ids,
        agrupamento_departamento_id: agrupamento_departamento_id || null,
        agrupamento_departamento_nome: agrupamento_departamento_nome || null,
        area: area || null,
        ativo: ativo ?? true
      }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateDepartamento: async (id, { nome_departamento, empresa_ids, agrupamento_departamento_id, agrupamento_departamento_nome, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_departamentos')
      .update({
        nome_departamento,
        empresa_ids,
        agrupamento_departamento_id: agrupamento_departamento_id || null,
        agrupamento_departamento_nome: agrupamento_departamento_nome || null,
        area: area || null,
        ativo: ativo ?? true,
        atualizado_em: new Date().toISOString()
      })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteDepartamento: async (id) => {
    const { error } = await supabase
      .from('dim_departamentos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // SETORES
  getSetores: async () => {
    const { data, error } = await supabase
      .from('dim_setores')
      .select('*')
      .order('nome_setor', { ascending: true })
    if (error) throw error
    return data || []
  },

  createSetor: async ({ nome_setor, departamento_id, tipo_setor, ativo }) => {
    const { data, error } = await supabase
      .from('dim_setores')
      .insert([{ nome_setor, departamento_id, tipo_setor: tipo_setor ?? null, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateSetor: async (id, { nome_setor, departamento_id, tipo_setor, ativo }) => {
    const { data, error } = await supabase
      .from('dim_setores')
      .update({ nome_setor, departamento_id, tipo_setor: tipo_setor ?? null, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteSetor: async (id) => {
    const { error } = await supabase
      .from('dim_setores')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // TIPOS OS
  getTiposOS: async () => {
    const { data, error } = await supabase
      .from('dim_tipos_os')
      .select('*')
      .order('codigo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTipoOS: async (payload) => {
    const { data, error } = await supabase
      .from('dim_tipos_os')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTipoOS: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_tipos_os')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteTipoOS: async (id) => {
    const { error } = await supabase
      .from('dim_tipos_os')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // NATUREZA DE OPERAÇÕES
  getNaturezaOperacoes: async () => {
    const { data, error } = await supabase
      .from('dim_natureza_operacoes')
      .select('*')
      .order('codigo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createNaturezaOperacao: async (payload) => {
    const { data, error } = await supabase
      .from('dim_natureza_operacoes')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateNaturezaOperacao: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_natureza_operacoes')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteNaturezaOperacao: async (id) => {
    const { error } = await supabase
      .from('dim_natureza_operacoes')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // CARGOS
  getCargos: async () => {
    const { data, error } = await supabase
      .from('dim_cargos')
      .select(`
        *,
        agrupamento:dim_agrupamento_cargos(nome_agrupamento_cargo),
        departamentos:rel_cargos_departamentos(departamento_id),
        setores_rel:rel_cargos_setores(setor_id),
        agrupamento_empresa:dim_agrupamento_empresas(nome_agrupamento)
      `)
      .order('nome_cargo', { ascending: true })
    if (error) throw error
    return (data || []).map(c => ({
      ...c,
      nome_agrupamento_cargo: c.agrupamento?.nome_agrupamento_cargo || '',
      departamento_ids: (c.departamentos || []).map(r => r.departamento_id),
      setor_ids: (c.setores_rel || []).map(r => r.setor_id),
      nome_agrupamento_empresa: c.agrupamento_empresa?.nome_agrupamento || '',
    }))
  },

  createCargo: async ({ nome_cargo, agrupamento_id, codigo_cargo, agrupamento_empresa_id, departamento_ids, setor_ids, ativo, nivel_cargo }) => {
    const { data, error } = await supabase
      .from('dim_cargos')
      .insert([{ nome_cargo, agrupamento_id, codigo_cargo: codigo_cargo || null, agrupamento_empresa_id: agrupamento_empresa_id || null, ativo: ativo ?? true, nivel_cargo: nivel_cargo || null }])
      .select()
    if (error) throw error
    const cargo = data?.[0]

    if (departamento_ids?.length > 0) {
      const { error: dErr } = await supabase
        .from('rel_cargos_departamentos')
        .insert(departamento_ids.map(departamento_id => ({ cargo_id: cargo.id, departamento_id })))
      if (dErr) throw dErr
    }

    if (setor_ids?.length > 0) {
      const { error: sErr } = await supabase
        .from('rel_cargos_setores')
        .insert(setor_ids.map(setor_id => ({ cargo_id: cargo.id, setor_id })))
      if (sErr) throw sErr
    }

    return cargo
  },

  updateCargo: async (id, { nome_cargo, agrupamento_id, codigo_cargo, agrupamento_empresa_id, departamento_ids, setor_ids, ativo, nivel_cargo }) => {
    const { data, error } = await supabase
      .from('dim_cargos')
      .update({ nome_cargo, agrupamento_id, codigo_cargo: codigo_cargo || null, agrupamento_empresa_id: agrupamento_empresa_id || null, ativo: ativo ?? true, nivel_cargo: nivel_cargo || null })
      .eq('id', id)
      .select()
    if (error) throw error

    await supabase.from('rel_cargos_departamentos').delete().eq('cargo_id', id)
    if (departamento_ids?.length > 0) {
      const { error: dErr } = await supabase
        .from('rel_cargos_departamentos')
        .insert(departamento_ids.map(departamento_id => ({ cargo_id: id, departamento_id })))
      if (dErr) throw dErr
    }

    await supabase.from('rel_cargos_setores').delete().eq('cargo_id', id)
    if (setor_ids?.length > 0) {
      const { error: sErr } = await supabase
        .from('rel_cargos_setores')
        .insert(setor_ids.map(setor_id => ({ cargo_id: id, setor_id })))
      if (sErr) throw sErr
    }

    return data?.[0]
  },

  deleteCargo: async (id) => {
    const { error } = await supabase
      .from('dim_cargos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ÁREAS
  getAreas: async () => {
    const { data, error } = await supabase
      .from('dim_areas')
      .select('*')
      .order('nome_area', { ascending: true })
    if (error) throw error
    return data || []
  },

  createArea: async ({ nome_area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_areas')
      .insert([{ nome_area, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateArea: async (id, { nome_area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_areas')
      .update({ nome_area, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteArea: async (id) => {
    const { error } = await supabase.from('dim_areas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // AGRUPAMENTO CARGOS
  getAgrupamentoCargos: async () => {
    const { data, error } = await supabase
      .from('dim_agrupamento_cargos')
      .select('*')
      .order('nome_agrupamento_cargo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createAgrupamentoCargo: async ({ nome_agrupamento_cargo, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_cargos')
      .insert([{ nome_agrupamento_cargo, area: area || null, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateAgrupamentoCargo: async (id, { nome_agrupamento_cargo, area, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_cargos')
      .update({ nome_agrupamento_cargo, area: area || null, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteAgrupamentoCargo: async (id) => {
    const { error } = await supabase
      .from('dim_agrupamento_cargos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // BOX
  getBox: async () => {
    const { data, error } = await supabase
      .from('dim_box')
      .select('*')
      .order('nome_box', { ascending: true })
    if (error) throw error
    return data || []
  },

  createBox: async ({ nome_box, setor_ids, ativo }) => {
    const { data, error } = await supabase
      .from('dim_box')
      .insert([{ nome_box, setor_ids, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateBox: async (id, { nome_box, setor_ids, ativo }) => {
    const { data, error } = await supabase
      .from('dim_box')
      .update({ nome_box, setor_ids, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteBox: async (id) => {
    const { error } = await supabase
      .from('dim_box')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getEmpresas: async () => {
    const { data, error } = await supabase
      .from('dim_empresas')
      .select('*')
      .order('codigo_empresa', { ascending: true })
    if (error) throw error
    return data || []
  },

  createEmpresa: async ({ agrupamento_empresa_id, agrupamento_nome, segmento_id, segmento_nome, codigo_empresa, sigla_empresa, nome_empresa, empresa_fantasia, marca, cnpj, codigo_concessionaria, nome_empresa_sistema, ativo }) => {
    const { data, error } = await supabase
      .from('dim_empresas')
      .insert([{
        agrupamento_empresa_id,
        agrupamento_nome,
        segmento_id,
        segmento_nome,
        codigo_empresa,
        sigla_empresa,
        nome_empresa,
        empresa_fantasia,
        marca,
        cnpj,
        codigo_concessionaria,
        nome_empresa_sistema: nome_empresa_sistema || null,
        ativo: ativo ?? true
      }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateEmpresa: async (id, { agrupamento_empresa_id, agrupamento_nome, segmento_id, segmento_nome, codigo_empresa, sigla_empresa, nome_empresa, empresa_fantasia, marca, cnpj, codigo_concessionaria, nome_empresa_sistema, ativo }) => {
    const { data, error } = await supabase
      .from('dim_empresas')
      .update({
        agrupamento_empresa_id,
        agrupamento_nome,
        segmento_id,
        segmento_nome,
        codigo_empresa,
        sigla_empresa,
        nome_empresa,
        empresa_fantasia,
        marca,
        cnpj,
        codigo_concessionaria,
        nome_empresa_sistema: nome_empresa_sistema || null,
        ativo: ativo ?? true
      })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteEmpresa: async (id) => {
    const { error } = await supabase
      .from('dim_empresas')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  createAgrupamentoEmpresa: async ({ nome_agrupamento, segmento_id, segmento_nome, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_empresas')
      .insert([{
        nome_agrupamento,
        segmento_id,
        segmento_nome,
        ativo: ativo ?? true
      }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateAgrupamentoEmpresa: async (id, { nome_agrupamento, segmento_id, segmento_nome, ativo }) => {
    const { data, error } = await supabase
      .from('dim_agrupamento_empresas')
      .update({ nome_agrupamento, segmento_id, segmento_nome, ativo: ativo ?? true, data_alteracao: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteAgrupamentoEmpresa: async (id) => {
    const { error } = await supabase
      .from('dim_agrupamento_empresas')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  createUsuario: async (nome, email, grupo_id = null, redirectTo) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/auth/create-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, grupo_id, redirectTo }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao criar usuário')
    return body
  },

  updateSenhaUsuario: async (id, senha) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/auth/update-password/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao atualizar senha')
    return body
  },

  deleteUsuarioAuth: async (id) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/auth/delete-user/${id}`, { method: 'DELETE' })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao deletar usuário')
    return body
  },

  updateUsuario: async (id, nome, email, grupo_id = undefined) => {
    const payload = { nome, email, atualizado_em: new Date().toISOString() }
    if (grupo_id !== undefined) payload.grupo_id = grupo_id || null
    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteUsuario: async (id) => {
    return apiService.deleteUsuarioAuth(id)
  },


  getAuthStatus: async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    try {
      const res = await fetch(`${backendUrl}/api/auth/status`)
      const body = await res.json()
      if (!res.ok) return { serviceRoleConfigured: false }
      return body
    } catch {
      return { serviceRoleConfigured: false }
    }
  },

  // PERMISSÕES
  // AUTH
  login: async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) throw error
    return { token: data.session?.access_token }
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  ,

  // MOVIMENTO DE VENDA
  getMovimentoVenda: async () => {
    const { data, error } = await supabase
      .from('dim_movimento_venda')
      .select('*')
      .order('codigo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createMovimentoVenda: async ({ agrupamento_empresa_id, agrupamento_nome, codigo, tipo_movimento, sigla, ativo }) => {
    const { data, error } = await supabase
      .from('dim_movimento_venda')
      .insert([{ agrupamento_empresa_id, agrupamento_nome, codigo, tipo_movimento, sigla, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateMovimentoVenda: async (id, { agrupamento_empresa_id, agrupamento_nome, codigo, tipo_movimento, sigla, ativo }) => {
    const { data, error } = await supabase
      .from('dim_movimento_venda')
      .update({ agrupamento_empresa_id, agrupamento_nome, codigo, tipo_movimento, sigla, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteMovimentoVenda: async (id) => {
    const { error } = await supabase
      .from('dim_movimento_venda')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // CLASSIFICAÇÃO COMPRA
  getClassificacaoCompras: async () => {
    const { data, error } = await supabase
      .from('dim_classificacao_compras')
      .select('*')
      .order('codigo', { ascending: true })
    if (error) throw error
    return data || []
  },

  createClassificacaoCompra: async ({ agrupamento_empresa_id, agrupamento_nome, codigo, descricao, sigla, ativo }) => {
    const { data, error } = await supabase
      .from('dim_classificacao_compras')
      .insert([{ agrupamento_empresa_id, agrupamento_nome, codigo, descricao, sigla, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateClassificacaoCompra: async (id, { agrupamento_empresa_id, agrupamento_nome, codigo, descricao, sigla, ativo }) => {
    const { data, error } = await supabase
      .from('dim_classificacao_compras')
      .update({ agrupamento_empresa_id, agrupamento_nome, codigo, descricao, sigla, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteClassificacaoCompra: async (id) => {
    const { error } = await supabase
      .from('dim_classificacao_compras')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // TIPOS DE PRODUTOS
  getTiposProdutos: async () => {
    const { data, error } = await supabase
      .from('dim_tipos_produtos')
      .select('*')
      .order('nome_tipo_produto', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTipoProduto: async ({ agrupamento_empresa_id, agrupamento_nome, codigo, nome_tipo_produto, grupo, grupo_contabil, agrupamento_produto, ativo }) => {
    const { data, error } = await supabase
      .from('dim_tipos_produtos')
      .insert([{ agrupamento_empresa_id, agrupamento_nome, codigo, nome_tipo_produto, grupo, grupo_contabil, agrupamento_produto, ativo: ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTipoProduto: async (id, { agrupamento_empresa_id, agrupamento_nome, codigo, nome_tipo_produto, grupo, grupo_contabil, agrupamento_produto, ativo }) => {
    const { data, error } = await supabase
      .from('dim_tipos_produtos')
      .update({ agrupamento_empresa_id, agrupamento_nome, codigo, nome_tipo_produto, grupo, grupo_contabil, agrupamento_produto, ativo: ativo ?? true, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteTipoProduto: async (id) => {
    const { error } = await supabase
      .from('dim_tipos_produtos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // CARGOS E REMUNERAÇÕES — Descrições de Ganho cadastradas manualmente por cargo (Salário
  // Fixo, Bonificação etc.), complementando as Políticas de Comissão na tela de relatório.
  getCargoGanhos: async () => {
    const { data, error } = await supabase
      .from('dim_cargo_ganhos')
      .select('*')
      .order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  createCargoGanho: async (payload) => {
    const { data, error } = await supabase
      .from('dim_cargo_ganhos')
      .insert([payload])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateCargoGanho: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_cargo_ganhos')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteCargoGanho: async (id) => {
    const { error } = await supabase
      .from('dim_cargo_ganhos')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // SOBREAVISO/PLANTÃO — controle mensal por colaborador (substitui a planilha enviada ao RH).
  getSobreavisoConfig: async () => {
    const { data, error } = await supabase
      .from('config_sobreaviso')
      .select('*')
      .limit(1)
      .single()
    if (error) throw error
    return data
  },

  updateSobreavisoConfig: async (id, payload) => {
    const { data, error } = await supabase
      .from('config_sobreaviso')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  getSobreavisoLancamentos: async (mesReferencia) => {
    const { data, error } = await supabase
      .from('rh_sobreaviso_plantao')
      .select('*')
      .eq('mes_referencia', mesReferencia)
      .order('funcionario_nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createSobreavisoLancamento: async (payload) => {
    const { data, error } = await supabase
      .from('rh_sobreaviso_plantao')
      .insert([payload])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateSobreavisoLancamento: async (id, payload) => {
    const { data, error } = await supabase
      .from('rh_sobreaviso_plantao')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteSobreavisoLancamento: async (id) => {
    const { error } = await supabase
      .from('rh_sobreaviso_plantao')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // POLÍTICA DE COMISSÃO
  getPoliticaComissao: async () => {
    const { data, error } = await supabase
      .from('fato_politica_comissao')
      .select(SELECT_POLITICA_COM_FONTE_BASE)
      .order('empresa_nome', { ascending: true })
    if (error) throw error
    return (data || []).map(enriquecePoliticaFonteBase)
  },

  createPoliticaComissao: async (payload) => {
    const { data, error } = await supabase
      .from('fato_politica_comissao')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updatePoliticaComissao: async (id, payload) => {
    const { data, error } = await supabase
      .from('fato_politica_comissao')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deletePoliticaComissao: async (id) => {
    const { error } = await supabase
      .from('fato_politica_comissao')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // FONTES DE CÁLCULO (comissões — origem de dados no SharePoint)
  getFontesCalculo: async () => {
    const { data, error } = await supabase
      .from('dim_fontes_calculo')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createFonteCalculo: async (payload) => {
    const { data, error } = await supabase
      .from('dim_fontes_calculo')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateFonteCalculo: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_fontes_calculo')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteFonteCalculo: async (id) => {
    const { error } = await supabase
      .from('dim_fontes_calculo')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // BASES DE CÁLCULO (comissões — coluna + agregação extraída da Fonte)
  getBasesCalculo: async () => {
    const { data, error } = await supabase
      .from('dim_bases_calculo')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Variante com a Fonte de Cálculo vinculada já embutida — evita N+1 na tela
  // de cadastro e no painel de conferência (que precisa da pasta/colunas da Fonte).
  getBasesCalculoComFonte: async () => {
    const { data, error } = await supabase
      .from('dim_bases_calculo')
      .select('*, fonte_calculo:dim_fontes_calculo(id, nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho, coluna_empresa, coluna_data, coluna_funcionario)')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createBaseCalculo: async (payload) => {
    const { data, error } = await supabase
      .from('dim_bases_calculo')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateBaseCalculo: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_bases_calculo')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteBaseCalculo: async (id) => {
    const { error } = await supabase
      .from('dim_bases_calculo')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // Diagnóstico: lista as colunas reais de um arquivo do SharePoint (botão "Detectar Colunas")
  getColunasFonteCalculo: async ({ pasta, prefixo, usaSubpastaAno, ano, linhaCabecalho }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const qs = new URLSearchParams({
      pasta, prefixo,
      usaSubpastaAno: String(!!usaSubpastaAno),
      linhaCabecalho: String(linhaCabecalho || 0),
      ...(ano ? { ano: String(ano) } : {}),
    })
    const res = await fetch(`${backendUrl}/api/calculo-comissao/colunas?${qs}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao detectar colunas do arquivo SharePoint')
    return body
  },

  // Painel de conferência: calcula o valor agregado para uma empresa/período específicos,
  // aplicando as Regras de Cálculo da Base (se houver). POST porque `regras` é uma lista
  // aninhada de tamanho variável.
  previewCalculoComissao: async ({ pasta, prefixo, usaSubpastaAno, linhaCabecalho, colunaEmpresa, colunaData, colunaValor, tipoAgregacao, empresaNome, dataInicio, dataFim, regras }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/calculo-comissao/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pasta, prefixo,
        usaSubpastaAno: !!usaSubpastaAno,
        linhaCabecalho: linhaCabecalho || 0,
        colunaEmpresa: colunaEmpresa || '',
        colunaData: colunaData || '',
        colunaValor: colunaValor || '',
        tipoAgregacao: tipoAgregacao || 'SOMA',
        empresaNome: empresaNome || null,
        dataInicio: dataInicio || null,
        dataFim: dataFim || null,
        regras: regras || [],
      }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao calcular valor de conferência')
    return body
  },

  // REGRAS DE CÁLCULO (motor de regras por Base — filtros/transformações antes da agregação)
  getRegrasComCondicoes: async (baseCalculoId) => {
    const { data, error } = await supabase
      .from('dim_regras_calculo')
      .select('*, condicoes:dim_regra_condicoes(*)')
      .eq('base_calculo_id', baseCalculoId)
      .order('ordem', { ascending: true })
      .order('ordem', { referencedTable: 'dim_regra_condicoes', ascending: true })
    if (error) throw error
    return data || []
  },

  // Versão pra CÁLCULO: igual a getRegrasComCondicoes, mas traduz as condições "Setor da O.S."
  // (que guardam o NOME do setor) pra lista de siglas dos Tipos de O.S. daquele setor — o
  // backend compara a coluna do arquivo contra as siglas. A edição usa a versão crua, pra
  // continuar mostrando/gravando o nome do setor (se o cadastro mudar, o cálculo acompanha).
  getRegrasParaCalculo: async (baseCalculoId) => {
    const regras = await apiService.getRegrasComCondicoes(baseCalculoId)
    const temSetorOS = regras.some(r => (r.condicoes || []).some(c => (c.operador || '').startsWith('SETOR_OS')))
    if (!temSetorOS) return regras

    const tipos = await apiService.getTiposOS()
    const siglasPorSetor = {}
    for (const t of tipos) {
      const setor = (t.setor_servico || '').trim().toLowerCase()
      const sigla = (t.sigla || '').trim()
      if (!setor || !sigla) continue
      if (!siglasPorSetor[setor]) siglasPorSetor[setor] = new Set()
      siglasPorSetor[setor].add(sigla)
    }

    return regras.map(r => ({
      ...r,
      condicoes: (r.condicoes || []).map(c => (c.operador || '').startsWith('SETOR_OS')
        ? { ...c, valor: [...(siglasPorSetor[(c.valor || '').trim().toLowerCase()] || [])].join('|') }
        : c),
    }))
  },

  // ── MEDIDAS DE BI — cadastro próprio (dim_medidas_bi), espelhando o motor de Base de Cálculo
  // (Fonte + coluna/agregação + regras), mas dedicado a alimentar dashboards de BI. Cada Medida
  // pode indicar um "Destino BI" (destino_bi) e ser copiada pra uma Base de Cálculo de Comissões
  // via copiarMedidaParaBaseCalculo.
  getMedidasBiComFonte: async () => {
    const { data, error } = await supabase
      .from('dim_medidas_bi')
      .select('*, fonte_calculo:dim_fontes_calculo(id, nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho, coluna_empresa, coluna_data, coluna_funcionario)')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createMedidaBi: async (payload) => {
    const { data, error } = await supabase
      .from('dim_medidas_bi')
      .insert([{ ...payload, ativo: payload.ativo ?? true }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateMedidaBi: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_medidas_bi')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteMedidaBi: async (id) => {
    const { error } = await supabase
      .from('dim_medidas_bi')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getRegrasMedidaBiComCondicoes: async (medidaBiId) => {
    const { data, error } = await supabase
      .from('dim_medidas_bi_regras')
      .select('*, condicoes:dim_medidas_bi_regra_condicoes(*)')
      .eq('medida_bi_id', medidaBiId)
      .order('ordem', { ascending: true })
      .order('ordem', { referencedTable: 'dim_medidas_bi_regra_condicoes', ascending: true })
    if (error) throw error
    return data || []
  },

  // Versão pra CÁLCULO: mesma tradução SETOR_OS → siglas de Tipos de O.S. que
  // getRegrasParaCalculo faz pra Base de Cálculo (ver comentário lá).
  getRegrasParaCalculoMedidaBi: async (medidaBiId) => {
    const regras = await apiService.getRegrasMedidaBiComCondicoes(medidaBiId)
    const temSetorOS = regras.some(r => (r.condicoes || []).some(c => (c.operador || '').startsWith('SETOR_OS')))
    if (!temSetorOS) return regras

    const tipos = await apiService.getTiposOS()
    const siglasPorSetor = {}
    for (const t of tipos) {
      const setor = (t.setor_servico || '').trim().toLowerCase()
      const sigla = (t.sigla || '').trim()
      if (!setor || !sigla) continue
      if (!siglasPorSetor[setor]) siglasPorSetor[setor] = new Set()
      siglasPorSetor[setor].add(sigla)
    }

    return regras.map(r => ({
      ...r,
      condicoes: (r.condicoes || []).map(c => (c.operador || '').startsWith('SETOR_OS')
        ? { ...c, valor: [...(siglasPorSetor[(c.valor || '').trim().toLowerCase()] || [])].join('|') }
        : c),
    }))
  },

  setRegrasMedidaBi: async (medidaBiId, regras) => {
    const { error: eDel } = await supabase
      .from('dim_medidas_bi_regras')
      .delete()
      .eq('medida_bi_id', medidaBiId)
    if (eDel) throw eDel // condições somem via ON DELETE CASCADE

    if (!regras || regras.length === 0) return

    const { data: novasRegras, error: eIns } = await supabase
      .from('dim_medidas_bi_regras')
      .insert(regras.map((r, i) => ({
        medida_bi_id: medidaBiId,
        ordem: r.ordem ?? i,
        tipo_acao: r.tipo_acao,
        coluna_alvo: r.coluna_alvo || null,
        condicao_logica: r.condicao_logica || null,
        ativo: true,
      })))
      .select()
    if (eIns) throw eIns

    const todasCondicoes = novasRegras.flatMap((regraSalva, i) =>
      (regras[i].condicoes || []).map((c, j) => ({
        regra_id: regraSalva.id,
        ordem: c.ordem ?? j,
        coluna: c.coluna,
        operador: c.operador,
        valor: c.valor ?? null,
      }))
    )
    if (todasCondicoes.length > 0) {
      const { error: eCond } = await supabase.from('dim_medidas_bi_regra_condicoes').insert(todasCondicoes)
      if (eCond) throw eCond
    }
  },

  // Copia uma Medida de BI (+ regras) pra uma nova Base de Cálculo, pra reuso em Comissões.
  // A cópia é independente: alterar a Medida depois não afeta a Base já criada.
  copiarMedidaParaBaseCalculo: async (medidaBiId) => {
    const { data: medida, error: eMedida } = await supabase
      .from('dim_medidas_bi')
      .select('*')
      .eq('id', medidaBiId)
      .single()
    if (eMedida) throw eMedida

    const regras = await apiService.getRegrasMedidaBiComCondicoes(medidaBiId)
    const basesExistentes = await apiService.getBasesCalculoComFonte()
    const nomesExistentes = new Set(basesExistentes.map(b => b.nome))
    const codigosExistentes = new Set(basesExistentes.map(b => b.codigo))

    let nome = medida.nome
    let sufixo = 2
    while (nomesExistentes.has(nome)) {
      nome = `${medida.nome} (${sufixo})`
      sufixo += 1
    }
    const codigo = gerarCodigoUnico(nome, codigosExistentes)

    const novaBase = await apiService.createBaseCalculo({
      fonte_calculo_id: medida.fonte_calculo_id,
      nome,
      codigo,
      descricao: medida.descricao,
      coluna_valor: medida.coluna_valor,
      tipo_agregacao: medida.tipo_agregacao,
    })

    if (regras.length > 0) {
      await apiService.setRegrasCalculo(novaBase.id, regras)
    }

    return novaBase
  },

  // `medida` aceita o CÓDIGO da Medida de BI (visível na listagem) ou, se vier em formato
  // UUID, o id diretamente — o que for mais prático pra chamar.
  // Uso: const { valor } = await apiService.getValorMedida('REAL_PECAS_BALCAO', { empresaId, dataInicio, dataFim })
  getValorMedida: async (medida, { empresaId, dataInicio, dataFim } = {}) => {
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(medida)
    const { data: medidaBi, error: eMedida } = await supabase
      .from('dim_medidas_bi')
      .select('*, fonte_calculo:dim_fontes_calculo(id, nome, codigo, pasta_sharepoint, prefixo_arquivo, usa_subpasta_ano, linha_cabecalho, coluna_empresa, coluna_data)')
      .eq(ehUuid ? 'id' : 'codigo', medida)
      .single()
    if (eMedida) throw new Error(`Medida de BI "${medida}" não encontrada.`)
    const fonte = medidaBi?.fonte_calculo
    if (!fonte?.pasta_sharepoint || !fonte?.prefixo_arquivo || !medidaBi?.coluna_valor) {
      throw new Error(`Medida de BI "${medidaBi?.nome || medida}" (ou sua Fonte) ainda não tem arquivo/coluna do SharePoint configurados.`)
    }

    let empresaLabel = null
    if (empresaId) {
      const { data: empresa } = await supabase
        .from('dim_empresas')
        .select('nome_empresa_sistema, empresa_fantasia, nome_empresa')
        .eq('id', empresaId)
        .single()
      empresaLabel = empresa?.nome_empresa_sistema || empresa?.empresa_fantasia || empresa?.nome_empresa || null
    }

    const regras = await apiService.getRegrasParaCalculoMedidaBi(medidaBi.id)

    return apiService.previewCalculoComissao({
      pasta: fonte.pasta_sharepoint,
      prefixo: fonte.prefixo_arquivo,
      usaSubpastaAno: fonte.usa_subpasta_ano,
      linhaCabecalho: fonte.linha_cabecalho,
      colunaEmpresa: fonte.coluna_empresa,
      colunaData: fonte.coluna_data,
      colunaValor: medidaBi.coluna_valor,
      tipoAgregacao: medidaBi.tipo_agregacao,
      empresaNome: empresaLabel,
      dataInicio: dataInicio || null,
      dataFim: dataFim || null,
      regras,
    })
  },

  // Substitui TODAS as regras (e condições) de uma Base — delete-then-reinsert,
  // mesmo padrão de setPermissoesGrupo. regras: [{ ordem, tipo_acao, coluna_alvo,
  // condicao_logica, condicoes: [{ ordem, coluna, operador, valor }] }]
  setRegrasCalculo: async (baseCalculoId, regras) => {
    const { error: eDel } = await supabase
      .from('dim_regras_calculo')
      .delete()
      .eq('base_calculo_id', baseCalculoId)
    if (eDel) throw eDel // condições somem via ON DELETE CASCADE

    if (!regras || regras.length === 0) return

    const { data: novasRegras, error: eIns } = await supabase
      .from('dim_regras_calculo')
      .insert(regras.map((r, i) => ({
        base_calculo_id: baseCalculoId,
        ordem: r.ordem ?? i,
        tipo_acao: r.tipo_acao,
        coluna_alvo: r.coluna_alvo || null,
        condicao_logica: r.condicao_logica || null,
        ativo: true,
      })))
      .select()
    if (eIns) throw eIns

    const todasCondicoes = novasRegras.flatMap((regraSalva, i) =>
      (regras[i].condicoes || []).map((c, j) => ({
        regra_id: regraSalva.id,
        ordem: c.ordem ?? j,
        coluna: c.coluna,
        operador: c.operador,
        valor: c.valor ?? null,
      }))
    )
    if (todasCondicoes.length > 0) {
      const { error: eCond } = await supabase.from('dim_regra_condicoes').insert(todasCondicoes)
      if (eCond) throw eCond
    }
  },

  // CÁLCULO DE COMISSÕES (lote — vários funcionários de uma vez, agrupado por arquivo)
  calcularComissoesLote: async (itens) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/calculo-comissao/lote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao calcular comissões')
    return body.resultados
  },

  // ==================== RH FÉRIAS ====================

  // Só a data de modificação do arquivo de férias no SharePoint (metadado da pasta, sem baixar
  // o arquivo) — usado em Cálculo de Comissões pra avisar quando o arquivo pode estar
  // desatualizado em relação ao período sendo calculado.
  getInfoArquivoFerias: async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/rh-ferias/info`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao consultar o arquivo de férias no SharePoint')
    return body
  },

  // Lê o arquivo de férias do SharePoint (via backend) — só as colunas escolhidas, já tipadas.
  lerArquivoFerias: async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/rh-ferias/linhas`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao ler o arquivo de férias do SharePoint')
    return body
  },

  getFerias: async () => {
    const { data, error } = await supabase
      .from('rh_ferias')
      .select('*')
      .order('inicio_gozo', { ascending: false })
    if (error) throw error
    return data || []
  },

  getUltimaImportacaoFerias: async () => {
    const { data, error } = await supabase
      .from('rh_ferias_importacoes')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data || null
  },

  // Sincroniza a tabela rh_ferias com o arquivo: insere o que é novo, remove o que não existe
  // mais no arquivo. Chave natural: empregado + empresa + período de gozo. Usada tanto pelo
  // Importar (tabela vazia) quanto pelo Reprocessar.
  sincronizarFerias: async (linhasArquivo, usuario, acao) => {
    const chave = (r) => [r.codigo_empregado ?? '', r.cnpj_empresa ?? '', r.inicio_gozo ?? '', r.fim_gozo ?? ''].join('|')

    const { data: existentes, error: eSel } = await supabase.from('rh_ferias').select('id, codigo_empregado, cnpj_empresa, inicio_gozo, fim_gozo')
    if (eSel) throw eSel

    const chavesExistentes = new Set((existentes || []).map(chave))
    const chavesArquivo = new Set(linhasArquivo.map(chave))

    const novos = linhasArquivo.filter(r => !chavesExistentes.has(chave(r)))
    const removidos = (existentes || []).filter(r => !chavesArquivo.has(chave(r)))

    if (novos.length > 0) {
      const { error: eIns } = await supabase.from('rh_ferias')
        .insert(novos.map(r => ({ ...r, importado_por: usuario })))
      if (eIns) throw eIns
    }
    if (removidos.length > 0) {
      const { error: eDel } = await supabase.from('rh_ferias')
        .delete()
        .in('id', removidos.map(r => r.id))
      if (eDel) throw eDel
    }

    const { data: log, error: eLog } = await supabase.from('rh_ferias_importacoes')
      .insert([{ acao, usuario, qtd_arquivo: linhasArquivo.length, qtd_novos: novos.length, qtd_removidos: removidos.length }])
      .select()
    if (eLog) throw eLog

    return { novos: novos.length, removidos: removidos.length, log: log?.[0] || null }
  },

  // Antes de inserir, remove os registros antigos DENTRO do período do lote pros MESMOS
  // funcionários sendo salvos — re-salvar não acumula duplicatas, e registros de funcionários
  // fora do filtro atual (salvos numa leva anterior) ficam intactos. A limpeza é por intervalo
  // (não igualdade exata) porque cada registro pode cobrir um segmento menor do período — ex:
  // funcionário com férias no meio do mês gera dois registros com datas parciais.
  salvarComissoesCalculadas: async (registros, lotePeriodoInicio, lotePeriodoFim) => {
    const periodoInicio = lotePeriodoInicio || registros[0]?.periodo_inicio
    const periodoFim = lotePeriodoFim || registros[0]?.periodo_fim
    const funcionarioIds = [...new Set(registros.map(r => r.funcionario_id).filter(Boolean))]
    if (periodoInicio && periodoFim && funcionarioIds.length > 0) {
      const { error: eDel } = await supabase
        .from('fato_comissoes_calculadas')
        .delete()
        .gte('periodo_inicio', periodoInicio)
        .lte('periodo_fim', periodoFim)
        .in('funcionario_id', funcionarioIds)
      if (eDel) throw eDel
    }
    const { data, error } = await supabase
      .from('fato_comissoes_calculadas')
      .insert(registros)
      .select()
    if (error) throw error
    return data || []
  },

  getComissoesCalculadas: async (periodoInicio, periodoFim) => {
    let query = supabase
      .from('fato_comissoes_calculadas')
      .select('*, funcionario:dim_funcionarios(nome_funcionario)')
      .order('calculado_em', { ascending: false })
    if (periodoInicio) query = query.gte('periodo_inicio', periodoInicio)
    if (periodoFim) query = query.lte('periodo_fim', periodoFim)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  // WORKFLOW DE APROVAÇÃO DE COMISSÕES (lote por período + empresa — cada empresa tem seu
  // próprio lote no mesmo período, pra um gerente conferir/processar/excluir a própria loja
  // sem travar ou apagar o trabalho de outro gerente em outra empresa)
  // Rascunho (calculado/salvo) -> Conferido (Gerente) -> Processado (RH) -> RH pode
  // autorizar reprocessamento, o que reabre o lote como Rascunho de novo.
  getLoteComissoes: async (periodoInicio, periodoFim, empresaId, departamentoId) => {
    let query = supabase
      .from('fato_comissoes_lotes')
      .select('*')
      .eq('periodo_inicio', periodoInicio)
      .eq('periodo_fim', periodoFim)
    query = empresaId ? query.eq('empresa_id', empresaId) : query.is('empresa_id', null)
    query = departamentoId ? query.eq('departamento_id', departamentoId) : query.is('departamento_id', null)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data || null
  },

  // Cria o lote (Rascunho) se não existir, ou atualiza o snapshot enquanto ainda for Rascunho.
  // Se já estiver Conferido/Processado, não mexe no lote (precisa de Autorizar Reprocessamento antes).
  salvarLoteRascunho: async ({ periodoInicio, periodoFim, empresaId, empresaNome, departamentoId, departamentoNome, qtdFuncionarios, valorTotal, usuario }) => {
    const existente = await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaId, departamentoId)
    if (existente && existente.status !== 'RASCUNHO') return existente

    if (existente) {
      const { data, error } = await supabase
        .from('fato_comissoes_lotes')
        .update({ qtd_funcionarios: qtdFuncionarios, valor_total: valorTotal, atualizado_em: new Date().toISOString() })
        .eq('id', existente.id)
        .select()
      if (error) throw error
      return data?.[0]
    }

    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .insert([{ periodo_inicio: periodoInicio, periodo_fim: periodoFim, empresa_id: empresaId || null, empresa_nome: empresaNome || null, departamento_id: departamentoId || null, departamento_nome: departamentoNome || null, status: 'RASCUNHO', qtd_funcionarios: qtdFuncionarios, valor_total: valorTotal }])
      .select()
    if (error) throw error
    const lote = data?.[0]
    await supabase.from('fato_comissoes_lotes_historico').insert([{ lote_id: lote.id, acao: 'CRIADO', usuario, valor_no_momento: valorTotal }])
    return lote
  },

  conferirLote: async (loteId, usuario) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .update({ status: 'CONFERIDO', conferido_por: usuario, conferido_em: agora, atualizado_em: agora })
      .eq('id', loteId)
      .select()
    if (error) throw error
    const lote = data?.[0]
    await supabase.from('fato_comissoes_lotes_historico').insert([{ lote_id: loteId, acao: 'CONFERIDO', usuario, valor_no_momento: lote?.valor_total }])
    return lote
  },

  processarLote: async (loteId, usuario) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .update({ status: 'PROCESSADO', processado_por: usuario, processado_em: agora, atualizado_em: agora })
      .eq('id', loteId)
      .select()
    if (error) throw error
    const lote = data?.[0]
    await supabase.from('fato_comissoes_lotes_historico').insert([{ lote_id: loteId, acao: 'PROCESSADO', usuario, valor_no_momento: lote?.valor_total }])
    return lote
  },

  // Reabertura TOTAL — todo mundo do lote volta pra Rascunho, perde Conferido/Processado.
  autorizarReprocessamentoLote: async (loteId, usuario) => {
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .update({ status: 'RASCUNHO', conferido_por: null, conferido_em: null, processado_por: null, processado_em: null, funcionarios_liberados_reprocessamento: [], atualizado_em: new Date().toISOString() })
      .eq('id', loteId)
      .select()
    if (error) throw error
    const lote = data?.[0]
    await supabase.from('fato_comissoes_lotes_historico').insert([{ lote_id: loteId, acao: 'REPROCESSAMENTO_AUTORIZADO', usuario, valor_no_momento: lote?.valor_total }])
    return lote
  },

  // Reabertura PARCIAL — o lote continua Conferido/Processado pra quem não foi selecionado;
  // só os funcionarioIds informados voltam a ficar recalculáveis/salváveis em Cálculo de
  // Comissões (ver elegiveisFiltrados/handleSalvar lá). União com quem já estava liberado.
  liberarReprocessamentoLote: async (loteId, funcionarioIds, usuario) => {
    const { data: atual, error: eGet } = await supabase
      .from('fato_comissoes_lotes')
      .select('funcionarios_liberados_reprocessamento, valor_total')
      .eq('id', loteId)
      .single()
    if (eGet) throw eGet
    const uniao = [...new Set([...(atual?.funcionarios_liberados_reprocessamento || []), ...funcionarioIds])]
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .update({ funcionarios_liberados_reprocessamento: uniao, atualizado_em: new Date().toISOString() })
      .eq('id', loteId)
      .select()
    if (error) throw error
    const lote = data?.[0]
    await supabase.from('fato_comissoes_lotes_historico').insert([{ lote_id: loteId, acao: 'REPROCESSAMENTO_AUTORIZADO', usuario, valor_no_momento: atual?.valor_total }])
    return lote
  },

  // Chamado depois que Cálculo de Comissões salva de novo um funcionário liberado — ele trava
  // de novo sozinho (some da lista). Sem linha de histórico: é rotina, não uma autorização.
  destravarFuncionariosSalvosLote: async (loteId, funcionarioIdsSalvos) => {
    const { data: atual, error: eGet } = await supabase
      .from('fato_comissoes_lotes')
      .select('funcionarios_liberados_reprocessamento')
      .eq('id', loteId)
      .single()
    if (eGet) throw eGet
    const restantes = (atual?.funcionarios_liberados_reprocessamento || []).filter(id => !funcionarioIdsSalvos.includes(id))
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .update({ funcionarios_liberados_reprocessamento: restantes, atualizado_em: new Date().toISOString() })
      .eq('id', loteId)
      .select()
    if (error) throw error
    return data?.[0]
  },

  getLotesPorIds: async (loteIds) => {
    if (!loteIds || loteIds.length === 0) return []
    const { data, error } = await supabase
      .from('fato_comissoes_lotes')
      .select('*')
      .in('id', loteIds)
    if (error) throw error
    return data || []
  },

  getHistoricoLote: async (loteId) => {
    const { data, error } = await supabase
      .from('fato_comissoes_lotes_historico')
      .select('*')
      .eq('lote_id', loteId)
      .order('data_hora', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Só deve ser chamado com o lote em RASCUNHO (checagem de status é feita em quem chama) —
  // apaga os valores salvos do período (só dos funcionarioIds informados — a empresa
  // selecionada na tela, pra não apagar o que outro gerente já salvou de outra empresa no
  // mesmo período) e o próprio lote (histórico de eventos some junto, via ON DELETE CASCADE),
  // voltando o período pro estado "nunca calculado" NAQUELA empresa.
  // loteId pode vir null: se os valores foram salvos mas o lote não chegou a ser criado
  // (estado órfão), ainda dá pra excluir os valores calculados do período. Exclusão por
  // intervalo (não igualdade) pra alcançar também os segmentos parciais criados por férias.
  excluirHistoricoLote: async (loteId, periodoInicio, periodoFim, funcionarioIds) => {
    let queryDel = supabase
      .from('fato_comissoes_calculadas')
      .delete()
      .gte('periodo_inicio', periodoInicio)
      .lte('periodo_fim', periodoFim)
    if (funcionarioIds && funcionarioIds.length > 0) queryDel = queryDel.in('funcionario_id', funcionarioIds)
    const { error: e1 } = await queryDel
    if (e1) throw e1

    if (!loteId) return { success: true }
    const { error: e2 } = await supabase
      .from('fato_comissoes_lotes')
      .delete()
      .eq('id', loteId)
    if (e2) throw e2

    return { success: true }
  },

  // FUNCIONÁRIOS
  getFuncionarios: async () => {
    const { data, error } = await supabase
      .from('dim_funcionarios')
      .select('*')
      .order('nome_funcionario', { ascending: true })
    if (error) throw error
    return data || []
  },

  createFuncionario: async (payload) => {
    const { data, error } = await supabase
      .from('dim_funcionarios')
      .insert([{ ...payload }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateFuncionario: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_funcionarios')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteFuncionario: async (id) => {
    const { error } = await supabase
      .from('dim_funcionarios')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getPoliticaByCargoEmpresa: async (cargoId, agrupamentoId) => {
    // Tenta primeiro por cargo + agrupamento de empresa (modelo atual)
    if (agrupamentoId) {
      const { data, error } = await supabase
        .from('fato_politica_comissao')
        .select(SELECT_POLITICA_COM_FONTE_BASE)
        .eq('cargo_id', cargoId)
        .eq('agrupamento_empresa_id', agrupamentoId)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
      if (error) throw error
      if (data?.length > 0) return enriquecePoliticaFonteBase(data[0])
    }
    // Fallback: somente pelo cargo
    const { data: d2, error: e2 } = await supabase
      .from('fato_politica_comissao')
      .select(SELECT_POLITICA_COM_FONTE_BASE)
      .eq('cargo_id', cargoId)
      .eq('ativo', true)
      .order('criado_em', { ascending: false })
      .limit(1)
    if (e2) throw e2
    return d2?.[0] ? enriquecePoliticaFonteBase(d2[0]) : null
  },

  // FERIADOS E CALENDÁRIO
  getFeriados: async (empresaId, ano) => {
    let query = supabase
      .from('dim_calendario_feriados')
      .select('*')
      .order('data_feriado', { ascending: true })
    if (empresaId) query = query.eq('empresa_id', empresaId)
    if (ano)       query = query.eq('ano', ano)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  createFeriado: async (payload) => {
    const { data, error } = await supabase
      .from('dim_calendario_feriados')
      .insert([{ ...payload }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateFeriado: async (id, payload) => {
    const { data, error } = await supabase
      .from('dim_calendario_feriados')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteFeriado: async (id) => {
    const { error } = await supabase
      .from('dim_calendario_feriados')
      .delete()
      .eq('id', id)
    if (error) throw error
    return { success: true }
  },

  deleteFeriadosLote: async (ids) => {
    const { error } = await supabase
      .from('dim_calendario_feriados')
      .delete()
      .in('id', ids)
    if (error) throw error
    return { success: true }
  },

  duplicarAnoFeriados: async (registros, anoDestino) => {
    const novos = registros.map(({ id, criado_em, atualizado_em, ...r }) => {
      if (r.tipo_data === 'FIXA') {
        const novaData = r.data_feriado.replace(/^\d{4}/, String(anoDestino))
        return { ...r, data_feriado: novaData, ano: anoDestino }
      }
      return { ...r, ano: anoDestino }
    })
    const { data, error } = await supabase
      .from('dim_calendario_feriados')
      .insert(novos)
      .select()
    if (error) throw error
    return data || []
  },

  // METAS PEÇAS
  getMetasPecas: async (empresaId, ano) => {
    let q = supabase
      .from('fato_rascunho_metas_pecas')
      .select('*')
      .order('colaborador_nome', { ascending: true })
    if (empresaId) q = q.eq('empresa_id', empresaId)
    if (ano)       q = q.eq('ano', ano)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  upsertMetaPecas: async (payload) => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_pecas')
      .upsert([{ ...payload }], { onConflict: 'empresa_id,colaborador_id,ano,mes' })
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateMetaPecas: async (id, payload) => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_pecas')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteMetasPecasEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_pecas')
      .delete().eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  approveMetasPecasEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.rpc('approve_metas_pecas_empresa', {
      p_empresa_id: empresaId,
      p_ano: Number(ano),
    })
    if (error) throw error
    return { success: true }
  },

  getPendingApprovals: async () => {
    const { data, error } = await supabase.rpc('get_pending_metas_pecas')
    if (error) throw error
    return data || []
  },

  getPendingApprovalsMecanico: async () => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_servicos_mecanico')
      .select('id,empresa_id,empresa_nome,departamento_nome,setor_nome,colaborador_id,colaborador_nome,mes,ano,meta_faturamento,meta_aprovada,aprovado_em')
      .gt('meta_faturamento', 0)
      .order('empresa_nome').order('colaborador_nome').order('mes')
    if (error) throw error
    return (data || []).filter(r => {
      const cur = Number(r.meta_faturamento) || 0
      if (cur === 0) return false
      if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
      return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
    })
  },

  deleteMetasPecasColab: async (colaboradorId, empresaId, ano) => {
    const { error } = await supabase
      .from('fato_rascunho_metas_pecas')
      .delete()
      .eq('colaborador_id', colaboradorId)
      .eq('empresa_id', empresaId)
      .eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  // METAS SERVIÇOS — MECÂNICO
  getMetasMecanico: async (empresaId, ano) => {
    let q = supabase.from('fato_rascunho_metas_servicos_mecanico').select('*').eq('ano', ano).order('empresa_nome').order('colaborador_nome').order('mes')
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  upsertMetaMecanico: async (payload) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .upsert([{ ...payload }], { onConflict: 'empresa_id,colaborador_id,ano,mes' }).select()
    if (error) throw error
    return data?.[0]
  },
  updateMetaMecanico: async (id, payload) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .update({ ...payload, atualizado_em: new Date().toISOString() }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteMetasMecanicoColab: async (colaboradorId, empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .delete().eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  deleteMetasMecanicoEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .delete().eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  approveMetasMecanicoEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.rpc('approve_metas_mecanico_empresa', { p_empresa_id: empresaId, p_ano: Number(ano) })
    if (error) throw error
    return { success: true }
  },
  getMetasMecanicoTotaisPorMes: async (empresaId, ano) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .select('mes, meta_servicos, meta_pecas').eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    const totais = {}
    ;(data || []).forEach(r => {
      if (!totais[r.mes]) totais[r.mes] = { servicos: 0, pecas: 0 }
      totais[r.mes].servicos += Number(r.meta_servicos) || 0
      totais[r.mes].pecas    += Number(r.meta_pecas)    || 0
    })
    return totais
  },

  // METAS SERVIÇOS — CONSULTOR
  getMetasConsultor: async (empresaId, ano) => {
    let q = supabase.from('fato_rascunho_metas_servicos_consultor').select('*').eq('ano', ano).order('empresa_nome').order('colaborador_nome').order('mes')
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  upsertMetaConsultor: async (payload) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_servicos_consultor')
      .upsert([{ ...payload }], { onConflict: 'empresa_id,colaborador_id,ano,mes' }).select()
    if (error) throw error
    return data?.[0]
  },
  deleteMetasConsultorColab: async (colaboradorId, empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_consultor')
      .delete().eq('colaborador_id', colaboradorId).eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  deleteMetasConsultorEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_consultor')
      .delete().eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  approveMetasConsultorEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.rpc('approve_metas_consultor_empresa', { p_empresa_id: empresaId, p_ano: Number(ano) })
    if (error) throw error
    return { success: true }
  },
  getPendingApprovalsConsultor: async () => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_servicos_consultor')
      .select('*')
      .gt('meta_faturamento', 0)
      .order('empresa_nome').order('colaborador_nome').order('mes')
    if (error) throw error
    return (data || []).filter(r => {
      const cur = Number(r.meta_faturamento) || 0
      if (cur === 0) return false
      if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
      return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
    })
  },

  // METAS — FUNILARIA E PINTURA
  getMetasFunilaria: async (empresaId, ano) => {
    let q = supabase.from('fato_rascunho_metas_funilaria_pintura').select('*').eq('ano', ano).order('empresa_nome').order('mes')
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  upsertMetaFunilaria: async (payload) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_funilaria_pintura')
      .upsert([{ ...payload }], { onConflict: 'empresa_id,mes,ano' }).select()
    if (error) throw error
    return data?.[0]
  },
  // METAS — TERCEIROS
  getMetasTerceiros: async (empresaId, ano) => {
    let q = supabase.from('fato_rascunho_metas_terceiros').select('*').eq('ano', ano).order('empresa_nome').order('mes')
    if (empresaId) q = q.eq('empresa_id', empresaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },
  upsertMetaTerceiros: async (payload) => {
    const { data, error } = await supabase.from('fato_rascunho_metas_terceiros')
      .upsert([{ ...payload }], { onConflict: 'empresa_id,mes,ano' }).select()
    if (error) throw error
    return data?.[0]
  },
  deleteMetasTerceirosEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_terceiros')
      .delete().eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  approveMetasTerceirosEmpresa: async (empresaId, ano) => {
    const { data: rows, error: errFetch } = await supabase.from('fato_rascunho_metas_terceiros')
      .select('id,meta_faturamento').eq('empresa_id', empresaId).eq('ano', ano)
    if (errFetch) throw errFetch
    for (const r of (rows || [])) {
      const { error } = await supabase.from('fato_rascunho_metas_terceiros')
        .update({ meta_aprovada: r.meta_faturamento, aprovado_em: new Date().toISOString() }).eq('id', r.id)
      if (error) throw error
    }
    return { success: true }
  },
  getPendingApprovalsTerceiros: async () => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_terceiros')
      .select('*').gt('meta_faturamento', 0).order('empresa_nome').order('mes')
    if (error) throw error
    return (data || []).filter(r => {
      const cur = Number(r.meta_faturamento) || 0
      if (cur === 0) return false
      if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
      return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
    })
  },

  getPendingApprovalsFunilaria: async () => {
    const { data, error } = await supabase
      .from('fato_rascunho_metas_funilaria_pintura')
      .select('*')
      .gt('meta_faturamento', 0)
      .order('empresa_nome').order('mes')
    if (error) throw error
    return (data || []).filter(r => {
      const cur = Number(r.meta_faturamento) || 0
      if (cur === 0) return false
      if (r.meta_aprovada === null || r.meta_aprovada === undefined) return true
      return Math.abs(cur - Number(r.meta_aprovada)) > 0.001
    })
  },
  deleteMetasFunilariaEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_funilaria_pintura')
      .delete().eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  approveMetasFunilariaEmpresa: async (empresaId, ano) => {
    const { data: rows, error: errFetch } = await supabase.from('fato_rascunho_metas_funilaria_pintura')
      .select('id,meta_faturamento').eq('empresa_id', empresaId).eq('ano', ano)
    if (errFetch) throw errFetch
    for (const r of (rows || [])) {
      const { error } = await supabase.from('fato_rascunho_metas_funilaria_pintura')
        .update({ meta_aprovada: r.meta_faturamento, aprovado_em: new Date().toISOString() }).eq('id', r.id)
      if (error) throw error
    }
    return { success: true }
  },

  // NÃO APROVAR — reverte meta_aprovada para null em cada tabela rascunho
  unapproveMetasPecasEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_pecas')
      .update({ meta_aprovada: null, aprovado_em: null })
      .eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  unapproveMetasMecanicoEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_mecanico')
      .update({ meta_aprovada: null, aprovado_em: null })
      .eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  unapproveMetasConsultorEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_servicos_consultor')
      .update({ meta_aprovada: null, aprovado_em: null })
      .eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  unapproveMetasFunilariaEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_funilaria_pintura')
      .update({ meta_aprovada: null, aprovado_em: null })
      .eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },
  unapproveMetasTerceirosEmpresa: async (empresaId, ano) => {
    const { error } = await supabase.from('fato_rascunho_metas_terceiros')
      .update({ meta_aprovada: null, aprovado_em: null })
      .eq('empresa_id', empresaId).eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  // TOTAIS CONSOLIDADOS PARA VISÃO GERAL (aprovação)
  getResumoMetasAprovacao: async (ano) => {
    const [pecas, mecanico, consultor, funilaria, terceiros] = await Promise.all([
      supabase.from('fato_rascunho_metas_pecas').select('empresa_id,empresa_nome,mes,meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0),
      supabase.from('fato_rascunho_metas_servicos_mecanico').select('empresa_id,empresa_nome,mes,meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0),
      supabase.from('fato_rascunho_metas_servicos_consultor').select('empresa_id,empresa_nome,mes,meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0),
      supabase.from('fato_rascunho_metas_funilaria_pintura').select('empresa_id,empresa_nome,mes,meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0),
      supabase.from('fato_rascunho_metas_terceiros').select('empresa_id,empresa_nome,mes,meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0),
    ])
    return {
      pecas:     pecas.data     || [],
      mecanico:  mecanico.data  || [],
      consultor: consultor.data || [],
      funilaria: funilaria.data || [],
      terceiros: terceiros.data || [],
    }
  },

  // PUBLICAR METAS APROVADAS PARA POWER BI
  publishMetasAprovadas: async (ano) => {
    const ts = new Date().toISOString()
    const [{ data: pecas }, { data: mecanico }, { data: consultor }, { data: funilaria }, { data: terceiros }] = await Promise.all([
      supabase.from('fato_rascunho_metas_pecas').select('empresa_id,empresa_nome,ano,mes,colaborador_id,colaborador_nome,departamento_id,departamento_nome,setor_id,setor_nome,cargo_id,cargo_nome,meta_faturamento,meta_pecas,meta_servicos,meta_aprovada').eq('ano', ano).not('meta_aprovada', 'is', null),
      supabase.from('fato_rascunho_metas_servicos_mecanico').select('empresa_id,empresa_nome,ano,mes,colaborador_id,colaborador_nome,departamento_id,departamento_nome,setor_id,setor_nome,cargo_id,cargo_nome,meta_faturamento,meta_pecas,meta_servicos,meta_aprovada').eq('ano', ano).not('meta_aprovada', 'is', null),
      supabase.from('fato_rascunho_metas_servicos_consultor').select('empresa_id,empresa_nome,ano,mes,colaborador_id,colaborador_nome,departamento_id,departamento_nome,setor_id,setor_nome,cargo_id,cargo_nome,meta_faturamento,meta_aprovada').eq('ano', ano).not('meta_aprovada', 'is', null),
      supabase.from('fato_rascunho_metas_funilaria_pintura').select('empresa_id,empresa_nome,ano,mes,colaborador_id,colaborador_nome,departamento_id,departamento_nome,setor_id,setor_nome,cargo_id,cargo_nome,meta_faturamento,meta_pecas,meta_servicos,meta_aprovada').eq('ano', ano).not('meta_aprovada', 'is', null),
      supabase.from('fato_rascunho_metas_terceiros').select('empresa_id,empresa_nome,ano,mes,meta_faturamento,meta_servicos,meta_aprovada').eq('ano', ano).not('meta_aprovada', 'is', null),
    ])
    const toRow = (r, tipo) => ({
      empresa_id: r.empresa_id, empresa_nome: r.empresa_nome, ano: r.ano, mes: r.mes, tipo,
      colaborador_id: r.colaborador_id || null, colaborador_nome: r.colaborador_nome || null,
      departamento_id: r.departamento_id || null, departamento_nome: r.departamento_nome || null,
      setor_id: r.setor_id || null, setor_nome: r.setor_nome || null,
      cargo_id: r.cargo_id || null, cargo_nome: r.cargo_nome || null,
      meta_faturamento: r.meta_aprovada,
      meta_pecas: r.meta_pecas || null, meta_servicos: r.meta_servicos || null,
      publicado_em: ts,
    })
    const rows = [
      ...(pecas    || []).map(r => toRow(r, 'pecas')),
      ...(mecanico || []).map(r => toRow(r, 'mecanico')),
      ...(consultor|| []).map(r => toRow(r, 'consultor')),
      ...(funilaria|| []).map(r => toRow(r, 'funilaria')),
      ...(terceiros|| []).map(r => toRow(r, 'terceiros')),
    ]
    if (rows.length === 0) return { success: true, count: 0 }
    const { error } = await supabase.from('fato_metas_publicadas')
      .upsert(rows, { onConflict: 'empresa_id,ano,mes,tipo,colaborador_id' })
    if (error) throw error
    return { success: true, count: rows.length, publicado_em: ts }
  },

  getUltimaPublicacao: async (ano) => {
    const { data, error } = await supabase.from('fato_metas_publicadas')
      .select('publicado_em').eq('ano', ano).order('publicado_em', { ascending: false }).limit(1)
    if (error) return null
    return data?.[0]?.publicado_em || null
  },

  getTotalGrupoPublicado: async (ano) => {
    const { data, error } = await supabase.from('fato_metas_publicadas')
      .select('empresa_id,empresa_nome,mes,tipo,colaborador_id,colaborador_nome,departamento_id,departamento_nome,setor_id,setor_nome,cargo_id,cargo_nome,meta_faturamento,meta_pecas,meta_servicos,publicado_em')
      .eq('ano', ano)
      .order('empresa_nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  getPendingCountTotal: async (ano) => {
    const tables = [
      'fato_rascunho_metas_pecas',
      'fato_rascunho_metas_servicos_mecanico',
      'fato_rascunho_metas_servicos_consultor',
      'fato_rascunho_metas_funilaria_pintura',
      'fato_rascunho_metas_terceiros',
    ]
    const results = await Promise.all(tables.map(t =>
      supabase.from(t).select('meta_faturamento,meta_aprovada').eq('ano', ano).gt('meta_faturamento', 0)
    ))
    let pending = 0
    results.forEach(({ data }) => {
      ;(data || []).forEach(r => {
        const cur = Number(r.meta_faturamento) || 0
        const apr = r.meta_aprovada === null || r.meta_aprovada === undefined ? null : Number(r.meta_aprovada)
        if (cur > 0 && (apr === null || Math.abs(cur - apr) > 0.001)) pending++
      })
    })
    return pending
  },

  getDiasUteisPorMes: async (empresaId, ano) => {
    const { data, error } = await supabase
      .from('fato_calendario')
      .select('mes, dias_uteis')
      .eq('empresa_id', empresaId)
      .eq('ano', ano)
    if (error) throw error
    const result = {}
    for (let m = 1; m <= 12; m++) result[m] = 0
    ;(data || []).forEach(r => { result[r.mes] = (result[r.mes] || 0) + Number(r.dias_uteis || 0) })
    return result
  },

  // CALENDÁRIO OPERACIONAL
  getCalendario: async (empresaId, ano) => {
    let query = supabase
      .from('fato_calendario')
      .select('*')
      .order('data', { ascending: true })
    if (empresaId) query = query.eq('empresa_id', empresaId)
    if (ano)       query = query.eq('ano', ano)
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  gerarCalendarioAnual: async (empresaId, ano) => {
    const { data, error } = await supabase.rpc('gerar_calendario_anual', {
      p_empresa_id: empresaId,
      p_ano:        ano,
    })
    if (error) throw error
    return data
  },

  limparCalendarioAno: async (empresaId, ano) => {
    const { error } = await supabase
      .from('fato_calendario')
      .delete()
      .eq('empresa_id', empresaId)
      .eq('ano', ano)
    if (error) throw error
    return { success: true }
  },

  sendResetPasswordEmail: async (email, redirectTo) => {
    try {
      const opts = redirectTo ? { redirectTo } : undefined
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, opts)
      if (error) throw error
      return data
    } catch (err) {
      throw err
    }
  },

  // ══════════════════════════════════════════
  // ══════════════════════════════════════════
  // GARANTIAS DAF — TABELA PRINCIPAL
  // ══════════════════════════════════════════

  // Busca paginada — retorna TODOS os registros independente do max_rows do servidor
  getAllGarantiasParaImport: async (filtros = {}) => {
    if (filtros.empresa_ids !== undefined && filtros.empresa_ids.length === 0) return []
    const PAGE = 1000
    const all  = []
    let from   = 0
    while (true) {
      let q = supabase
        .from('gar_garantias')
        .select('id, numero_os, tipo_garantia_descricao, tipo_os_sigla, empresa_nome')
        .range(from, from + PAGE - 1)
      if (filtros.empresa_ids?.length) q = q.in('empresa_id', filtros.empresa_ids)
      const { data, error } = await q
      if (error) throw error
      all.push(...(data || []))
      if (!data || data.length < PAGE) break
      from += PAGE
    }
    return all
  },

  getGarantias: async (filtros = {}) => {
    // Non-admin with no empresa permissions → nothing to show (prevent full-table leak)
    if (filtros.empresa_ids !== undefined && filtros.empresa_ids.length === 0) return []
    let q = supabase
      .from('gar_garantias')
      .select('*')
      .order('data_abertura_os', { ascending: false })
    if (filtros.status_codigo)        q = q.eq('status_codigo', filtros.status_codigo)
    if (filtros.status_neq)           q = q.neq('status_codigo', filtros.status_neq)
    if (filtros.status_in)            q = q.in('status_codigo', filtros.status_in)
    if (filtros.status_not_in)        q = q.not('status_codigo', 'in', `(${filtros.status_not_in.join(',')})`)
    if (filtros.consultor_id)         q = q.eq('consultor_id', filtros.consultor_id)
    if (filtros.empresa_id)           q = q.eq('empresa_id', filtros.empresa_id)
    if (filtros.empresa_ids?.length)  q = q.in('empresa_id', filtros.empresa_ids)
    if (filtros.chassi)               q = q.ilike('chassi', `%${filtros.chassi}%`)
    if (filtros.numero_nf)            q = q.ilike('numero_nf', `%${filtros.numero_nf}%`)
    if (filtros.numero_os)            q = q.eq('numero_os', filtros.numero_os.trim())
    if (filtros.data_inicio)          q = q.gte('data_abertura_os', filtros.data_inicio)
    if (filtros.data_fim)             q = q.lte('data_abertura_os', filtros.data_fim)
    if (filtros.sem_fechamento)       q = q.is('data_fechamento_os', null)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  getGarantiaById: async (id) => {
    const { data, error } = await supabase
      .from('gar_garantias')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  createGarantia: async (payload, userEmail) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('gar_garantias')
      .insert([{ ...payload, criado_por: userEmail, atualizado_por: userEmail, criado_em: agora, atualizado_em: agora }])
      .select()
    if (error) throw error
    const nova = data?.[0]
    if (nova) {
      await supabase.from('gar_garantias_log').insert([{
        garantia_id: nova.id, campo: 'status_codigo',
        valor_antes: null, valor_depois: nova.status_codigo,
        alterado_por: userEmail, alterado_em: agora,
      }])
    }
    return nova
  },

  updateGarantia: async (id, payload, userEmail, statusAnterior, wAnteriores = null) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('gar_garantias')
      .update({ ...payload, atualizado_por: userEmail, atualizado_em: agora })
      .eq('id', id)
      .select()
    if (error) throw error
    const atualizado = data?.[0]

    const logs = []

    if (atualizado && payload.status_codigo && payload.status_codigo !== statusAnterior) {
      logs.push({
        garantia_id: id, campo: 'status_codigo',
        valor_antes: statusAnterior, valor_depois: payload.status_codigo,
        alterado_por: userEmail, alterado_em: agora,
      })
    }

    if (payload.status_codigo === 'W' && wAnteriores) {
      const CAMPOS_W = [
        { key: 'nf_peca_numero', label: 'Nº NF Envio Peça/Inf.' },
        { key: 'nf_peca_data',   label: 'Data NF Peça/Inf.' },
        { key: 'observacoes',    label: 'Informações (W)' },
      ]
      // Loga todos os campos W que possuem valor, mostrando antes→depois quando mudou
      for (const { key, label } of CAMPOS_W) {
        const antes = wAnteriores[key] || ''
        const depois = payload[key] || ''
        if (depois) {
          logs.push({
            garantia_id: id, campo: label,
            valor_antes: antes !== depois ? (antes || null) : null,
            valor_depois: depois,
            alterado_por: userEmail, alterado_em: agora,
          })
        }
      }
    }

    if (logs.length > 0) await supabase.from('gar_garantias_log').insert(logs)
    return atualizado
  },

  deleteGarantia: async (id) => {
    const { data, error } = await supabase.from('gar_garantias').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data || data.length === 0) throw new Error(`Registro ${id} não foi removido (0 linhas afetadas — verifique as políticas de RLS em gar_garantias no Supabase)`)
    return { success: true }
  },

  deleteAllGarantias: async () => {
    // Só apaga OS Faturadas (status E = NF Emitida, F = Enviado à Fábrica)
    // OS Abertas (status A) não são afetadas
    const { data: faturadas, error: errFetch } = await supabase
      .from('gar_garantias')
      .select('id')
      .in('status_codigo', ['E', 'F'])
    if (errFetch) throw errFetch
    const ids = (faturadas || []).map(r => r.id)
    if (ids.length === 0) return { success: true, deleted: 0 }
    const { error: errLog } = await supabase.from('gar_garantias_log').delete().in('garantia_id', ids)
    if (errLog) throw errLog
    const { error } = await supabase.from('gar_garantias').delete().in('status_codigo', ['E', 'F'])
    if (error) throw error
    return { success: true, deleted: ids.length }
  },

  getGarantiaLog: async (garantiaId) => {
    const { data, error } = await supabase
      .from('gar_garantias_log')
      .select('*')
      .eq('garantia_id', garantiaId)
      .order('alterado_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  // ══════════════════════════════════════════
  // TÍTULOS A RECEBER — OBSERVAÇÕES EDITÁVEIS (RFN003 não tem campo editável)
  // ══════════════════════════════════════════

  getTitulosObservacoes: async () => {
    const { data, error } = await supabase
      .from('gar_titulos_observacoes')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  createTituloObservacao: async (nroTitulo, observacao, userEmail) => {
    const { data, error } = await supabase
      .from('gar_titulos_observacoes')
      .insert([{ nro_titulo: nroTitulo, observacao, atualizado_por: userEmail, atualizado_em: new Date().toISOString() }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTituloObservacao: async (id, observacao, userEmail) => {
    const { data, error } = await supabase
      .from('gar_titulos_observacoes')
      .update({ observacao, atualizado_por: userEmail, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteTituloObservacao: async (id) => {
    const { error } = await supabase.from('gar_titulos_observacoes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  /**
   * Sincroniza tipo_os_sigla em TODOS os registros a partir da própria tipo_garantia_descricao
   * já salva ("G03 - PLANO..." → "G03") — garante que a sigla sempre bata com o tipo da OS.
   * Fallback (só quando a descrição não tem código extraível): usa o ROF001_OSABERTA, mas
   * somente se a OS aparecer uma única vez no arquivo (evita pegar a sigla de outro tipo/linha
   * da mesma OS quando ela tem múltiplas linhas no ROF001).
   * Retorna { atualizados, semSigla, erros, total }.
   */
  sincronizarTipoOsSigla: async (rof001Rows = []) => {
    // Mapa simples: os_numero → tipo_os_sigla (só usado quando a OS aparece 1x no arquivo — sem ambiguidade de tipo)
    const rof001MapSimples = new Map()
    const contagemPorOS = new Map()
    for (const r of rof001Rows) {
      const osNum = String(r.os_numero ?? '').trim()
      const sigla = String(r.tipo_os_sigla ?? '').trim()
      if (!osNum || !sigla) continue
      contagemPorOS.set(osNum, (contagemPorOS.get(osNum) || 0) + 1)
      if (!rof001MapSimples.has(osNum)) rof001MapSimples.set(osNum, sigla)
    }

    // Busca TODOS os registros (força re-sync, não só os vazios)
    const PAGE = 1000
    const todos = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('gar_garantias')
        .select('id, numero_os, tipo_os_sigla, tipo_garantia_descricao')
        .range(from, from + PAGE - 1)
      if (error) throw error
      todos.push(...(data || []))
      if (!data || data.length < PAGE) break
      from += PAGE
    }

    let atualizados = 0
    let semSigla = 0
    const erros = []

    for (const rec of todos) {
      const osNum = String(rec.numero_os ?? '').trim()

      // 1. Fonte primária: a sigla embutida na própria descrição já salva ("G03 - PLANO..." → "G03").
      //    Uma OS pode ter múltiplas linhas no ROF001 (uma por tipo de serviço/peça); usar a descrição
      //    do próprio registro garante que a sigla bata com o tipo realmente importado para essa OS,
      //    evitando pegar a sigla de outra linha/tipo da mesma OS.
      let sigla = ''
      const descTrim = rec.tipo_garantia_descricao?.trim() || ''
      if (descTrim) {
        const candidato = descTrim.split(' ')[0]
        if (/^[A-Z]\d{2,3}$/i.test(candidato)) sigla = candidato.toUpperCase()
      }

      // 2. Fallback: sem sigla na descrição e a OS aparece só 1x no ROF001 → sem ambiguidade, usa direto
      if (!sigla && contagemPorOS.get(osNum) === 1) sigla = rof001MapSimples.get(osNum) || ''

      if (!sigla) { semSigla++; continue }

      // Só atualiza se o valor for diferente do atual
      if (rec.tipo_os_sigla?.trim() === sigla) continue

      const { error } = await supabase
        .from('gar_garantias')
        .update({ tipo_os_sigla: sigla })
        .eq('id', rec.id)
      if (error) { erros.push({ id: rec.id, os: osNum, erro: error.message }); continue }
      atualizados++
    }

    return { atualizados, semSigla, erros, total: todos.length }
  },

  getGarantiasDashboard: async () => {
    const { data, error } = await supabase
      .from('gar_garantias')
      .select('status_codigo, valor_pecas, valor_servicos, data_abertura_os, data_lancamento, data_emissao_nf')
    if (error) throw error
    return data || []
  },

  // ══════════════════════════════════════════
  // AUDITORIA DE O.S.
  // ══════════════════════════════════════════

  // ── Responsáveis ──
  getAuditoriaResponsaveis: async () => {
    const { data, error } = await supabase.from('aud_responsaveis').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  createAuditoriaResponsavel: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('aud_responsaveis').insert([{ nome, ativo }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateAuditoriaResponsavel: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('aud_responsaveis')
      .update({ nome, ativo, atualizado_em: new Date().toISOString() }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteAuditoriaResponsavel: async (id) => {
    const { error } = await supabase.from('aud_responsaveis').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── Situações ──
  getAuditoriaSituacoes: async () => {
    const { data, error } = await supabase.from('aud_situacoes').select('*').order('nome')
    if (error) throw error
    return data || []
  },
  createAuditoriaSituacao: async ({ nome, cor, ativo }) => {
    const { data, error } = await supabase.from('aud_situacoes').insert([{ nome, cor, ativo }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateAuditoriaSituacao: async (id, { nome, cor, ativo }) => {
    const { data, error } = await supabase.from('aud_situacoes')
      .update({ nome, cor, ativo, atualizado_em: new Date().toISOString() }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteAuditoriaSituacao: async (id) => {
    const { error } = await supabase.from('aud_situacoes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── Tipo de Título Garantia ──
  getTipoTituloGarantia: async () => {
    const { data, error } = await supabase.from('dim_tipo_titulo_garantia').select('*').order('descricao')
    if (error) throw error
    return data || []
  },
  createTipoTituloGarantia: async (form) => {
    const { data, error } = await supabase.from('dim_tipo_titulo_garantia').insert([{ descricao: form.descricao, ativo: form.ativo }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateTipoTituloGarantia: async (id, form) => {
    const { data, error } = await supabase.from('dim_tipo_titulo_garantia').update({ descricao: form.descricao, ativo: form.ativo }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteTipoTituloGarantia: async (id) => {
    const { error } = await supabase.from('dim_tipo_titulo_garantia').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── Auditorias (cabeçalho) ──
  getAuditorias: async () => {
    const { data, error } = await supabase.from('aud_auditorias').select('*').order('data_auditoria', { ascending: false })
    if (error) throw error
    return data || []
  },
  createAuditoria: async ({ data_auditoria, importado_por, total_os, empresa_id, empresa_nome }) => {
    const { data, error } = await supabase.from('aud_auditorias')
      .insert([{ data_auditoria, importado_por, total_os, empresa_id: empresa_id || null, empresa_nome: empresa_nome || null }]).select()
    if (error) throw error
    return data?.[0]
  },
  deleteAuditoria: async (id) => {
    // Apaga as OS filhas primeiro (garante exclusão mesmo sem CASCADE)
    const { error: e1 } = await supabase.from('aud_auditoria_os').delete().eq('auditoria_id', id)
    if (e1) throw e1
    const { error } = await supabase.from('aud_auditorias').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── OS por auditoria ──
  getAuditoriaOs: async (auditoriaId) => {
    const { data, error } = await supabase.from('aud_auditoria_os')
      .select('*').eq('auditoria_id', auditoriaId).order('os_numero')
    if (error) throw error
    return data || []
  },
  createAuditoriaOsLote: async (rows) => {
    if (!rows.length) return []
    const { data, error } = await supabase.from('aud_auditoria_os').insert(rows).select()
    if (error) throw error
    return data || []
  },
  updateAuditoriaOsItem: async (id, payload, userEmail) => {
    const { data, error } = await supabase.from('aud_auditoria_os')
      .update({ ...payload, atualizado_em: new Date().toISOString(), atualizado_por: userEmail })
      .eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },

  // ══════════════════════════════════════════
  // ══════════════════════════════════════════
  // GESTÃO DE PROJETOS — CADASTROS DE APOIO (SISTEMA, RESPONSÁVEL, FASE, ÁREA)
  // ══════════════════════════════════════════

  getProjEmpresas: async () => {
    const { data, error } = await supabase.from('proj_empresas').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjEmpresa: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('proj_empresas').insert([{ nome, ativo: ativo ?? true }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjEmpresa: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('proj_empresas').update({ nome, ativo: ativo ?? true }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjEmpresa: async (id) => {
    const { error } = await supabase.from('proj_empresas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjStatus: async () => {
    const { data, error } = await supabase.from('proj_status').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjStatus: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('proj_status').insert([{ nome, ativo: ativo ?? true }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjStatus: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('proj_status').update({ nome, ativo: ativo ?? true }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjStatus: async (id) => {
    const { error } = await supabase.from('proj_status').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjAreas: async () => {
    const { data, error } = await supabase.from('proj_areas').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjArea: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('proj_areas').insert([{ nome, ativo: ativo ?? true }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjArea: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('proj_areas').update({ nome, ativo: ativo ?? true }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjArea: async (id) => {
    const { error } = await supabase.from('proj_areas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjSistemas: async () => {
    const { data, error } = await supabase.from('proj_sistemas').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjSistema: async ({ nome, ativo, cor, cor_texto }) => {
    const { data, error } = await supabase.from('proj_sistemas').insert([{ nome, ativo: ativo ?? true, cor: cor || '#1e293b', cor_texto: cor_texto || null }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjSistema: async (id, { nome, ativo, cor, cor_texto }) => {
    const { data, error } = await supabase.from('proj_sistemas').update({ nome, ativo: ativo ?? true, cor: cor || '#1e293b', cor_texto: cor_texto || null }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjSistema: async (id) => {
    const { error } = await supabase.from('proj_sistemas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjResponsaveis: async () => {
    const { data, error } = await supabase.from('proj_responsaveis').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjResponsavel: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('proj_responsaveis').insert([{ nome, ativo: ativo ?? true }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjResponsavel: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('proj_responsaveis').update({ nome, ativo: ativo ?? true }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjResponsavel: async (id) => {
    const { error } = await supabase.from('proj_responsaveis').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjFases: async () => {
    const { data, error } = await supabase.from('proj_fases').select('*').order('ordem', { ascending: true, nullsFirst: false }).order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjFase: async ({ nome, ativo, cor, ordem }) => {
    if (ordem != null) {
      const { data: existentes } = await supabase.from('proj_fases').select('id, ordem').gte('ordem', ordem)
      if (existentes?.length) await Promise.all(existentes.map(f => supabase.from('proj_fases').update({ ordem: f.ordem + 1 }).eq('id', f.id)))
    }
    const { data, error } = await supabase.from('proj_fases').insert([{ nome, ativo: ativo ?? true, cor: cor || '#1e293b', ordem: ordem ?? null }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjFase: async (id, { nome, ativo, cor, ordem }) => {
    if (ordem != null) {
      const { data: atual } = await supabase.from('proj_fases').select('ordem').eq('id', id).single()
      const oldOrdem = atual?.ordem
      if (oldOrdem != null && oldOrdem !== ordem) {
        if (ordem < oldOrdem) {
          // Movendo para cima: fases entre [novaOrdem, oldOrdem-1] descem 1
          const { data: afetadas } = await supabase.from('proj_fases').select('id, ordem').gte('ordem', ordem).lt('ordem', oldOrdem).neq('id', id)
          if (afetadas?.length) await Promise.all(afetadas.map(f => supabase.from('proj_fases').update({ ordem: f.ordem + 1 }).eq('id', f.id)))
        } else {
          // Movendo para baixo: fases entre [oldOrdem+1, novaOrdem] sobem 1
          const { data: afetadas } = await supabase.from('proj_fases').select('id, ordem').gt('ordem', oldOrdem).lte('ordem', ordem).neq('id', id)
          if (afetadas?.length) await Promise.all(afetadas.map(f => supabase.from('proj_fases').update({ ordem: f.ordem - 1 }).eq('id', f.id)))
        }
      } else if (oldOrdem == null) {
        // Fase sem ordem anterior: empurra as que já têm ordem >= novaOrdem
        const { data: afetadas } = await supabase.from('proj_fases').select('id, ordem').gte('ordem', ordem).neq('id', id)
        if (afetadas?.length) await Promise.all(afetadas.map(f => supabase.from('proj_fases').update({ ordem: f.ordem + 1 }).eq('id', f.id)))
      }
    }
    const { data, error } = await supabase.from('proj_fases').update({ nome, ativo: ativo ?? true, cor: cor || '#1e293b', ordem: ordem ?? null }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjFase: async (id) => {
    const { error } = await supabase.from('proj_fases').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getProjDepartamentos: async () => {
    const { data, error } = await supabase.from('proj_departamentos').select('*').order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },
  createProjDepartamento: async ({ nome, ativo }) => {
    const { data, error } = await supabase.from('proj_departamentos').insert([{ nome, ativo: ativo ?? true }]).select()
    if (error) throw error
    return data?.[0]
  },
  updateProjDepartamento: async (id, { nome, ativo }) => {
    const { data, error } = await supabase.from('proj_departamentos').update({ nome, ativo: ativo ?? true }).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },
  deleteProjDepartamento: async (id) => {
    const { error } = await supabase.from('proj_departamentos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getPermissoesDeptoPorGrupo: async (grupoId) => {
    const { data, error } = await supabase.from('permissoes_depto_grupo').select('departamento_nome').eq('grupo_id', grupoId)
    if (error) throw error
    return (data || []).map(r => r.departamento_nome)
  },
  setPermissoesDeptoPorGrupo: async (grupoId, nomes) => {
    const { error: delErr } = await supabase.from('permissoes_depto_grupo').delete().eq('grupo_id', grupoId)
    if (delErr) throw delErr
    if (nomes.length > 0) {
      const { error } = await supabase.from('permissoes_depto_grupo').insert(nomes.map(nome => ({ grupo_id: grupoId, departamento_nome: nome })))
      if (error) throw error
    }
  },

  // Escopo de acesso exclusivo do módulo Cálculo de Comissões (5 dimensões independentes,
  // cada uma TODOS ou INDIVIDUAL) — separado da restrição de Empresa usada em Garantias DAF.
  getPermissoesComissaoGrupo: async (grupoId) => {
    const dims = ['empresa', 'area', 'departamento', 'setor', 'agrupamento_cargo']
    const [{ data: modos, error: e1 }, { data: valores, error: e2 }, { data: grupoRow, error: e3 }] = await Promise.all([
      supabase.from('permissoes_comissao_modo').select('dimensao, modo').eq('grupo_id', grupoId),
      supabase.from('permissoes_comissao_valor').select('dimensao, valor').eq('grupo_id', grupoId),
      supabase.from('grupos_acesso').select('comissao_escopo_habilitado').eq('id', grupoId).maybeSingle(),
    ])
    if (e1) throw e1
    if (e2) throw e2
    if (e3) throw e3
    const escopo = { habilitado: !!grupoRow?.comissao_escopo_habilitado }
    for (const dim of dims) {
      const modoRow = (modos || []).find(m => m.dimensao === dim)
      escopo[dim] = {
        modo: modoRow?.modo === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TODOS',
        valores: (valores || []).filter(v => v.dimensao === dim).map(v => v.valor),
      }
    }
    return escopo
  },

  // `habilitado` é a trava mestre (grupos_acesso.comissao_escopo_habilitado): enquanto
  // false, o grupo não enxerga nenhum funcionário em Cálculo de Comissões, independente
  // de como as 5 dimensões estiverem configuradas.
  setPermissoesComissaoGrupo: async (grupoId, escopo, habilitado) => {
    // 'empresa' é controlada por permissoes_empresa_grupo (Acesso por Empresa), não aqui
    const dims = ['area', 'departamento', 'setor', 'agrupamento_cargo']
    const [{ error: delModo }, { error: delValor }, { error: errHab }] = await Promise.all([
      supabase.from('permissoes_comissao_modo').delete().eq('grupo_id', grupoId),
      supabase.from('permissoes_comissao_valor').delete().eq('grupo_id', grupoId),
      supabase.from('grupos_acesso').update({ comissao_escopo_habilitado: !!habilitado }).eq('id', grupoId),
    ])
    if (delModo) throw delModo
    if (delValor) throw delValor
    if (errHab) throw errHab

    const modoRows = dims.map(dim => ({ grupo_id: grupoId, dimensao: dim, modo: escopo[dim]?.modo === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TODOS' }))
    const valorRows = dims
      .filter(dim => escopo[dim]?.modo === 'INDIVIDUAL')
      .flatMap(dim => (escopo[dim]?.valores || []).map(valor => ({ grupo_id: grupoId, dimensao: dim, valor })))

    const { error: insModo } = await supabase.from('permissoes_comissao_modo').insert(modoRows)
    if (insModo) throw insModo
    if (valorRows.length > 0) {
      const { error: insValor } = await supabase.from('permissoes_comissao_valor').insert(valorRows)
      if (insValor) throw insValor
    }
  },

  // ══════════════════════════════════════════
  // ══════════════════════════════════════════
  // GESTÃO DE PROJETOS — PROJETOS, TAREFAS, DEPENDÊNCIAS
  // ══════════════════════════════════════════

  getProjetosLista: async () => {
    const { data, error } = await supabase
      .from('proj_projetos')
      .select('id, nome, status, sistema_nome, sistemas_nomes')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  getProjetos: async (filtros = {}) => {
    let q = supabase
      .from('proj_projetos')
      .select('*, proj_tarefas(id, progresso_pct, data_inicio, data_fim, status_kanban, responsavel_nome, fase_nome, sistema_nome, proj_deliberacoes(id))')
      .order('data_inicio', { ascending: false })
    if (filtros.status)              q = q.eq('status', filtros.status)
    if (filtros.responsavel_id)      q = q.eq('responsavel_id', filtros.responsavel_id)
    if (filtros.sistema_id)          q = q.eq('sistema_id', filtros.sistema_id)
    if (filtros.fase_id)             q = q.eq('fase_id', filtros.fase_id)
    if (filtros.nome)                q = q.ilike('nome', `%${filtros.nome}%`)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  getProjetosParaAta: async (filtros = {}) => {
    let q = supabase
      .from('proj_projetos')
      .select('id, nome, status, departamento_nome, area_nome, sistema_nome, sistemas_nomes, responsavel_nome, data_inicio, data_fim_prevista, proj_tarefas(id, nome, area_nome, progresso_pct, data_inicio, data_fim, status_kanban, fase_nome, sistema_nome, responsavel_nome, etapa, proj_deliberacoes(id, data, texto))')
      .order('departamento_nome', { ascending: true })
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  // Dados para o dashboard BI (visão executiva) — projetos com data de conclusão real e
  // tarefas aninhadas, para agregação de concluídos por mês/departamento no client.
  getProjetosParaBi: async () => {
    const { data, error } = await supabase
      .from('proj_projetos')
      .select('id, nome, status, departamento_nome, responsavel_nome, area_nome, sistema_nome, sistemas_nomes, data_inicio, data_fim_prevista, data_fim_real, proj_tarefas(id, nome, status_kanban, data_fim, progresso_pct)')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  getProjetoById: async (id) => {
    const { data, error } = await supabase
      .from('proj_projetos')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  createProjeto: async (payload, userEmail) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('proj_projetos')
      .insert([{ ...payload, criado_por: userEmail, criado_em: agora, atualizado_em: agora }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateProjeto: async (id, payload) => {
    const { data, error } = await supabase
      .from('proj_projetos')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteProjeto: async (id) => {
    const { error } = await supabase.from('proj_projetos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getTarefas: async (projetoId) => {
    const { data, error } = await supabase
      .from('proj_tarefas')
      .select('*, proj_deliberacoes(id, data, texto)')
      .eq('projeto_id', projetoId)
      .order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  getTarefaById: async (id) => {
    const { data, error } = await supabase
      .from('proj_tarefas')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  getTarefasByResponsavelNome: async (responsavelNome, excludeTarefaId = null) => {
    let q = supabase
      .from('proj_tarefas')
      .select('id, nome, data_inicio, data_fim, status_kanban')
      .eq('responsavel_nome', responsavelNome)
      .not('data_inicio', 'is', null)
      .neq('status_kanban', 'concluido')
      .order('data_inicio', { ascending: true })
    if (excludeTarefaId) q = q.neq('id', excludeTarefaId)
    const { data, error } = await q
    if (error) throw error
    return data || []
  },

  createTarefa: async (payload) => {
    const agora = new Date().toISOString()
    const { data, error } = await supabase
      .from('proj_tarefas')
      .insert([{ ...payload, criado_em: agora, atualizado_em: agora }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTarefa: async (id, payload) => {
    const { data, error } = await supabase
      .from('proj_tarefas')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTarefaStatusKanban: async (id, statusKanban, ordem) => {
    const { data, error } = await supabase
      .from('proj_tarefas')
      .update({ status_kanban: statusKanban, ordem, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteTarefa: async (id) => {
    await supabase.from('proj_deliberacoes').delete().eq('tarefa_id', id)
    const { error } = await supabase.from('proj_tarefas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getDependencias: async (projetoId) => {
    const { data: tarefas, error: errTarefas } = await supabase
      .from('proj_tarefas')
      .select('id')
      .eq('projeto_id', projetoId)
    if (errTarefas) throw errTarefas
    const ids = (tarefas || []).map(t => t.id)
    if (ids.length === 0) return []
    const { data, error } = await supabase
      .from('proj_tarefas_dependencias')
      .select('*')
      .in('tarefa_id', ids)
    if (error) throw error
    return data || []
  },

  createDependencia: async (tarefaId, dependeDeTarefaId) => {
    const { data, error } = await supabase
      .from('proj_tarefas_dependencias')
      .insert([{ tarefa_id: tarefaId, depende_de_tarefa_id: dependeDeTarefaId }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteDependencia: async (id) => {
    const { error } = await supabase.from('proj_tarefas_dependencias').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getDeliberacoes: async (tarefaId) => {
    const { data, error } = await supabase
      .from('proj_deliberacoes')
      .select('*')
      .eq('tarefa_id', tarefaId)
      .order('data', { ascending: false })
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  createDeliberacao: async (tarefaId, data, texto, criadoPor) => {
    const { data: row, error } = await supabase
      .from('proj_deliberacoes')
      .insert([{ tarefa_id: tarefaId, data, texto, criado_por: criadoPor || null }])
      .select()
    if (error) throw error
    return row?.[0]
  },

  updateDeliberacao: async (id, data, texto) => {
    const { data: row, error } = await supabase
      .from('proj_deliberacoes')
      .update({ data, texto })
      .eq('id', id)
      .select()
    if (error) throw error
    return row?.[0]
  },

  deleteDeliberacao: async (id) => {
    const { error } = await supabase.from('proj_deliberacoes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ══════════════════════════════════════════
  // GESTÃO DE PROJETOS — PERÍODO DE MANIFESTAÇÃO (ETAPA 2)
  // ══════════════════════════════════════════

  getManifestacoes: async (projetoId) => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .select('*')
      .eq('projeto_id', projetoId)
      .order('data_hora_envio', { ascending: false })
    if (error) throw error
    return data || []
  },

  // Sem filtro de projeto — usado no painel geral (visão do responsável)
  getManifestacoesPendentes: async () => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .select('*, proj_projetos(id, nome)')
      .in('status', ['Pendente', 'Em Análise'])
      .order('data_hora_envio', { ascending: true })
    if (error) throw error
    return data || []
  },

  getManifestoesRespondidas: async () => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .select('*, proj_projetos(id, nome)')
      .eq('status', 'Respondido')
      .order('data_hora_resposta', { ascending: false })
    if (error) throw error
    return data || []
  },

  deleteManifestacao: async (id) => {
    const { error } = await supabase.from('proj_manifestacoes').delete().eq('id', id)
    if (error) throw error
  },

  createManifestacao: async (payload) => {
    const deAcordo = payload.tipo_manifestacao === 'De Acordo'
    const status = deAcordo ? 'Respondido' : 'Pendente'
    const resultado_manifestacao = deAcordo ? 'De Acordo' : null
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .insert([{ ...payload, status, resultado_manifestacao, data_hora_envio: new Date().toISOString() }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateManifestacao: async (id, { tipo_manifestacao, texto_manifestacao }) => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .update({ tipo_manifestacao, texto_manifestacao })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateManifestacaoStatus: async (id, status) => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .update({ status })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  responderManifestacao: async (id, { resposta_responsavel, responsavel_email, responsavel_nome, resultado_manifestacao }) => {
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .update({
        resposta_responsavel,
        responsavel_email,
        responsavel_nome,
        resultado_manifestacao: resultado_manifestacao || null,
        status: 'Respondido',
        data_hora_resposta: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  getManifestacoesByProjetoIds: async (ids) => {
    if (!ids || ids.length === 0) return []
    const { data, error } = await supabase
      .from('proj_manifestacoes')
      .select('projeto_id, resultado_manifestacao, tipo_manifestacao')
      .in('projeto_id', ids)
    if (error) throw error
    return data || []
  },

  getProjetosConvidadoIds: async () => {
    // usuarios.id ≠ auth.users.id — precisa buscar pelo email
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data: perfil } = await supabase.from('usuarios').select('id').eq('email', user.email).maybeSingle()
    if (!perfil?.id) return []
    const { data, error } = await supabase
      .from('proj_manifestacao_convidados')
      .select('projeto_id')
      .eq('usuario_id', perfil.id)
    if (error) return []
    return (data || []).map(r => r.projeto_id)
  },

  getConvidadosByProjetoIds: async (ids) => {
    if (!ids || ids.length === 0) return []
    const { data, error } = await supabase
      .from('proj_manifestacao_convidados')
      .select('projeto_id, usuarios(id, nome, email)')
      .in('projeto_id', ids)
    if (error) throw error
    return data || []
  },

  getConvidadosManifestacao: async (projetoId) => {
    const { data, error } = await supabase
      .from('proj_manifestacao_convidados')
      .select('usuario_id, usuarios(id, nome, email)')
      .eq('projeto_id', projetoId)
    if (error) throw error
    return data || []
  },

  setConvidadosManifestacao: async (projetoId, usuarioIds) => {
    const { error: delErr } = await supabase.from('proj_manifestacao_convidados').delete().eq('projeto_id', projetoId)
    if (delErr) throw delErr
    if (usuarioIds.length > 0) {
      const { error } = await supabase
        .from('proj_manifestacao_convidados')
        .insert(usuarioIds.map(usuario_id => ({ projeto_id: projetoId, usuario_id })))
      if (error) throw error
    }
  },

  enviarConvitesManifestacao: async (projetoId, usuariosIds) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch(`${backendUrl}/api/projetos/${projetoId}/enviar-convites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionData?.session?.access_token || ''}` },
      body: JSON.stringify({ usuariosIds }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Erro ao enviar convites')
    return json
  },

  // Encerramento passa pelo backend (não Supabase direto) porque a mesma lógica
  // precisa rodar automaticamente pelo scheduler de prazo — ver manifestacaoService.js
  encerrarPeriodoManifestacao: async (projetoId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const { data: sessionData } = await supabase.auth.getSession()
    const res = await fetch(`${backendUrl}/api/projetos/${projetoId}/encerrar-manifestacao`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionData?.session?.access_token || ''}` },
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || 'Erro ao encerrar período de manifestação')
    return json
  },

  getProjTemplates: async () => {
    const { data, error } = await supabase.from('proj_templates').select('*').order('ordem', { ascending: true }).order('texto', { ascending: true })
    if (error) throw error
    return data || []
  },

  createProjTemplate: async (dados) => {
    const { data, error } = await supabase.from('proj_templates').insert([dados]).select()
    if (error) throw error
    return data?.[0]
  },

  updateProjTemplate: async (id, dados) => {
    const { data, error } = await supabase.from('proj_templates').update(dados).eq('id', id).select()
    if (error) throw error
    return data?.[0]
  },

  deleteProjTemplate: async (id) => {
    const { error } = await supabase.from('proj_templates').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── Custos de Projetos ────────────────────────────────────────────────────
  getCustosProjetos: async () => {
    const { data, error } = await supabase
      .from('proj_custos')
      .select('*, proj_projetos(nome), fornecedores(nome)')
      .order('data_inicio', { ascending: true })
    if (error) throw error
    return data || []
  },

  createCustoProjeto: async (payload, userEmail) => {
    const { data, error } = await supabase
      .from('proj_custos')
      .insert([{ ...payload, criado_por: userEmail, criado_em: new Date().toISOString() }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateCustoProjeto: async (id, payload) => {
    const { data, error } = await supabase
      .from('proj_custos')
      .update(payload)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteCustoProjeto: async (id) => {
    const { error } = await supabase.from('proj_custos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getConfirmacoesCusto: async (ano) => {
    const { data, error } = await supabase
      .from('proj_custos_pagamentos')
      .select('*')
      .eq('ano', ano)
    if (error) throw error
    return data || []
  },

  upsertConfirmacaoCusto: async (custo_id, ano, mes, confirmado, userEmail, valor_pago) => {
    const { data, error } = await supabase
      .from('proj_custos_pagamentos')
      .upsert({
        custo_id, ano, mes, confirmado,
        valor_pago:       confirmado && valor_pago != null ? valor_pago : null,
        data_confirmacao: confirmado ? new Date().toISOString() : null,
        confirmado_por:   confirmado ? userEmail : null,
      }, { onConflict: 'custo_id,ano,mes' })
      .select()
    if (error) throw error
    return data?.[0]
  },

  // ── Fornecedores ──────────────────────────────────────────────────────────
  getFornecedores: async () => {
    const { data, error } = await supabase
      .from('fornecedores')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createFornecedor: async (payload) => {
    const { data, error } = await supabase
      .from('fornecedores')
      .insert([payload])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateFornecedor: async (id, payload) => {
    const { data, error } = await supabase
      .from('fornecedores')
      .update(payload)
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteFornecedor: async (id) => {
    const { error } = await supabase.from('fornecedores').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── RPA / Power BI — Agendamento de Rotinas ─────────────────────────────────
  getRpaProcessos: async () => {
    const { data, error } = await supabase
      .from('rpa_processos')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createRpaProcesso: async ({ nome, departamento_id, departamento_nome, tipo, rpa_vinculado_id, rpa_vinculado_nome, tempo_atualizacao_min }) => {
    const { data, error } = await supabase
      .from('rpa_processos')
      .insert([{
        nome: nome.trim().toUpperCase(),
        departamento_id: departamento_id || null,
        departamento_nome: departamento_nome || null,
        tipo: tipo || 'RPA',
        rpa_vinculado_id: tipo === 'PBI' || tipo === 'FAB' ? (rpa_vinculado_id || null) : null,
        rpa_vinculado_nome: tipo === 'PBI' || tipo === 'FAB' ? (rpa_vinculado_nome || null) : null,
        tempo_atualizacao_min: Number.isFinite(Number(tempo_atualizacao_min)) && tempo_atualizacao_min !== '' && tempo_atualizacao_min !== null && tempo_atualizacao_min !== undefined ? Math.max(0, parseInt(tempo_atualizacao_min, 10)) : 15,
      }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  // Atualiza o cadastro e propaga nome/setor para os campos denormalizados
  // das rotinas que usam o processo, e o tipo para as execuções agendadas.
  updateRpaProcesso: async (id, { nome, departamento_id, departamento_nome, tipo, rpa_vinculado_id, rpa_vinculado_nome, tempo_atualizacao_min, ativo }) => {
    const { data, error } = await supabase
      .from('rpa_processos')
      .update({
        nome: nome.trim().toUpperCase(),
        departamento_id: departamento_id || null,
        departamento_nome: departamento_nome || null,
        tipo: tipo || 'RPA',
        rpa_vinculado_id: tipo === 'PBI' || tipo === 'FAB' ? (rpa_vinculado_id || null) : null,
        rpa_vinculado_nome: tipo === 'PBI' || tipo === 'FAB' ? (rpa_vinculado_nome || null) : null,
        tempo_atualizacao_min: Number.isFinite(Number(tempo_atualizacao_min)) && tempo_atualizacao_min !== '' && tempo_atualizacao_min !== null && tempo_atualizacao_min !== undefined ? Math.max(0, parseInt(tempo_atualizacao_min, 10)) : 15,
        ativo: ativo ?? true,
      })
      .eq('id', id)
      .select()
    if (error) throw error
    const proc = data?.[0]
    if (proc) {
      const { data: rotinas, error: rotError } = await supabase
        .from('rpa_rotinas')
        .update({
          processo: proc.nome,
          departamento_id: proc.departamento_id,
          departamento_nome: proc.departamento_nome,
        })
        .eq('processo_id', id)
        .select('id')
      if (rotError) throw rotError
      const rotinaIds = (rotinas || []).map(r => r.id)
      if (rotinaIds.length) {
        const { error: execError } = await supabase
          .from('rpa_rotina_execucoes')
          .update({ tipo: proc.tipo })
          .in('rotina_id', rotinaIds)
        if (execError) throw execError
      }
    }
    return proc
  },

  deleteRpaProcesso: async (id) => {
    const { error } = await supabase.from('rpa_processos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getRpaRotinas: async () => {
    const { data, error } = await supabase
      .from('rpa_rotinas')
      .select('*, execucoes:rpa_rotina_execucoes(*)')
      .order('criado_em', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Grade semanal: cada rotina ganha um mapa porDia[1..7] = [ { hora, tipo }, ... ]
  // (lista, pois um dia pode ter mais de uma execução).
  getRpaGradeSemanal: async () => {
    const rotinas = await apiService.getRpaRotinas()
    return rotinas.map(r => {
      const porDia = {}
      ;(r.execucoes || []).forEach(e => {
        if (!porDia[e.dia_semana]) porDia[e.dia_semana] = []
        porDia[e.dia_semana].push(e)
      })
      return { ...r, porDia }
    })
  },

  createRpaRotina: async ({ processo_id, processo, departamento_id, departamento_nome, ativo, execucoes }) => {
    const { data, error } = await supabase
      .from('rpa_rotinas')
      .insert([{
        processo_id: processo_id || null,
        processo: processo?.trim().toUpperCase() || null,
        departamento_id: departamento_id || null,
        departamento_nome: departamento_nome || null,
        ativo: ativo ?? true,
      }])
      .select()
    if (error) throw error
    const rotina = data?.[0]
    if (rotina) await apiService.salvarRpaRotinaExecucoes(rotina.id, execucoes)
    return rotina
  },

  updateRpaRotina: async (id, { processo_id, processo, departamento_id, departamento_nome, ativo, execucoes }) => {
    const { data, error } = await supabase
      .from('rpa_rotinas')
      .update({
        processo_id: processo_id || null,
        processo: processo?.trim().toUpperCase() || null,
        departamento_id: departamento_id || null,
        departamento_nome: departamento_nome || null,
        ativo: ativo ?? true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    if (error) throw error
    await apiService.salvarRpaRotinaExecucoes(id, execucoes)
    return data?.[0]
  },

  deleteRpaRotina: async (id) => {
    const { error } = await supabase.from('rpa_rotinas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // Substitui todas as execuções/dias de uma rotina (delete + insert em lote)
  salvarRpaRotinaExecucoes: async (rotinaId, execucoes) => {
    const { error: delError } = await supabase.from('rpa_rotina_execucoes').delete().eq('rotina_id', rotinaId)
    if (delError) throw delError
    const linhas = (execucoes || [])
      .filter(e => e.hora)
      .map(e => ({ rotina_id: rotinaId, dia_semana: e.dia_semana, hora: e.hora, tipo: e.tipo || null }))
    if (!linhas.length) return []
    const { data, error } = await supabase.from('rpa_rotina_execucoes').insert(linhas).select()
    if (error) throw error
    return data || []
  },

  // ── Sincronização de Dados (agendamento do KPI Dashboard / Matriz KPIs) ─────
  getKpiSyncConfig: async () => {
    const { data, error } = await supabase.from('kpi_sync_config').select('*').eq('id', 1).maybeSingle()
    if (error) throw error
    return data || { id: 1, ativo: true }
  },

  setKpiSyncAtivo: async (ativo) => {
    const { data, error } = await supabase.from('kpi_sync_config').update({ ativo }).eq('id', 1).select()
    if (error) throw error
    return data?.[0]
  },

  getKpiSyncHorariosSemana: async () => {
    const { data, error } = await supabase
      .from('kpi_sync_horarios_semana')
      .select('*')
      .order('dia_semana', { ascending: true })
      .order('hora', { ascending: true })
    if (error) throw error
    return data || []
  },

  // Substitui todos os horários semanais de uma vez (delete + insert em lote)
  salvarKpiSyncHorariosSemana: async (horarios) => {
    const { error: delError } = await supabase.from('kpi_sync_horarios_semana').delete().gte('dia_semana', 0)
    if (delError) throw delError
    const linhas = (horarios || []).filter(h => h.hora).map(h => ({ dia_semana: h.dia_semana, hora: h.hora, ativo: h.ativo ?? true }))
    if (!linhas.length) return []
    const { data, error } = await supabase.from('kpi_sync_horarios_semana').insert(linhas).select()
    if (error) throw error
    return data || []
  },

  getKpiSyncDatasEspecificas: async () => {
    const { data, error } = await supabase
      .from('kpi_sync_datas_especificas')
      .select('*')
      .order('data', { ascending: true })
      .order('hora', { ascending: true })
    if (error) throw error
    return data || []
  },

  createKpiSyncDataEspecifica: async ({ data: dataAgendamento, hora }) => {
    const { data, error } = await supabase
      .from('kpi_sync_datas_especificas')
      .insert([{ data: dataAgendamento, hora }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteKpiSyncDataEspecifica: async (id) => {
    const { error } = await supabase.from('kpi_sync_datas_especificas').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // ── Grade de Treinamentos ───────────────────────────────────────────────────
  getTreinCategorias: async () => {
    const { data, error } = await supabase
      .from('trein_categorias')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTreinCategoria: async ({ nome }) => {
    const { data, error } = await supabase
      .from('trein_categorias')
      .insert([{ nome: nome.trim().toUpperCase() }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  // Atualiza o nome e propaga para os cursos que já usam a categoria
  // (categoria_nome é denormalizado em trein_cursos)
  updateTreinCategoria: async (id, { nome }) => {
    const nomeUp = nome.trim().toUpperCase()
    const { data, error } = await supabase
      .from('trein_categorias')
      .update({ nome: nomeUp })
      .eq('id', id)
      .select()
    if (error) throw error
    const { error: cursosError } = await supabase
      .from('trein_cursos')
      .update({ categoria_nome: nomeUp })
      .eq('categoria_id', id)
    if (cursosError) throw cursosError
    return data?.[0]
  },

  deleteTreinCategoria: async (id) => {
    const { error } = await supabase.from('trein_categorias').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // Sistema (ex.: Bizneo, SAP, Portal de Gestão) — mesmo padrão de categoria
  getTreinSistemas: async () => {
    const { data, error } = await supabase
      .from('trein_sistemas')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTreinSistema: async ({ nome }) => {
    const { data, error } = await supabase
      .from('trein_sistemas')
      .insert([{ nome: nome.trim().toUpperCase() }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  // Cargos — cadastro próprio do módulo (substitui dim_cargos aqui dentro),
  // mesmo padrão simples de trein_categorias/trein_sistemas + campo Setor fixo
  getTreinCargos: async () => {
    const { data, error } = await supabase
      .from('trein_cargos')
      .select('*')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTreinCargo: async ({ nome, setor }) => {
    const { data, error } = await supabase
      .from('trein_cargos')
      .insert([{ nome: nome.trim().toUpperCase(), setor }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateTreinCargo: async (id, { nome, setor }) => {
    const { data, error } = await supabase
      .from('trein_cargos')
      .update({ nome: nome.trim().toUpperCase(), setor })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteTreinCargo: async (id) => {
    const { error } = await supabase.from('trein_cargos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  getTreinCursos: async () => {
    const { data, error } = await supabase
      .from('trein_cursos')
      .select('*, cargos:trein_curso_cargos(*)')
      .order('nome', { ascending: true })
    if (error) throw error
    return data || []
  },

  createTreinCurso: async ({ nome, categoria_id, categoria_nome, sistema_id, sistema_nome, ativo, cargos }) => {
    const { data, error } = await supabase
      .from('trein_cursos')
      .insert([{
        nome: nome.trim().toUpperCase(),
        categoria_id: categoria_id || null,
        categoria_nome: categoria_nome || null,
        sistema_id: sistema_id || null,
        sistema_nome: sistema_nome || null,
        ativo: ativo ?? true,
      }])
      .select()
    if (error) throw error
    const curso = data?.[0]
    if (curso) await apiService.salvarTreinCursoVinculos(curso.id, cargos)
    return curso
  },

  updateTreinCurso: async (id, { nome, categoria_id, categoria_nome, sistema_id, sistema_nome, ativo, cargos }) => {
    const { data, error } = await supabase
      .from('trein_cursos')
      .update({
        nome: nome.trim().toUpperCase(),
        categoria_id: categoria_id || null,
        categoria_nome: categoria_nome || null,
        sistema_id: sistema_id || null,
        sistema_nome: sistema_nome || null,
        ativo: ativo ?? true,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
    if (error) throw error
    await apiService.salvarTreinCursoVinculos(id, cargos)
    return data?.[0]
  },

  deleteTreinCurso: async (id) => {
    const { error } = await supabase.from('trein_cursos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // Substitui os cursos obrigatórios de um cargo (visão inversa: delete +
  // insert em lote de trein_curso_cargos filtrando por cargo_id)
  salvarTreinCargoCursos: async (cargoId, cargoNome, cursos) => {
    const { error: delErr } = await supabase.from('trein_curso_cargos').delete().eq('cargo_id', cargoId)
    if (delErr) throw delErr
    const linhas = (cursos || []).map(c => ({ curso_id: c.id, cargo_id: cargoId, cargo_nome: cargoNome || null, obrigatorio: c.obrigatorio ?? true }))
    if (linhas.length) {
      const { error } = await supabase.from('trein_curso_cargos').insert(linhas)
      if (error) throw error
    }
    return { success: true }
  },

  // Substitui os cargos vinculados a um curso — delete + insert em lote,
  // mesmo padrão do módulo RPA
  salvarTreinCursoVinculos: async (cursoId, cargos) => {
    const { error: delCargosErr } = await supabase.from('trein_curso_cargos').delete().eq('curso_id', cursoId)
    if (delCargosErr) throw delCargosErr
    const linhasCargos = (cargos || []).map(c => ({ curso_id: cursoId, cargo_id: c.id, cargo_nome: c.nome || null, obrigatorio: c.obrigatorio ?? true }))
    if (linhasCargos.length) {
      const { error } = await supabase.from('trein_curso_cargos').insert(linhasCargos)
      if (error) throw error
    }
    return { success: true }
  },

  // Ecossistema — "Minha Concessionária" (departamentos + sistemas de cada um,
  // todos ligados ao hub central fixo "Concessionária" no diagrama)
  getEcossistemaDepartamentos: async () => {
    const { data, error } = await supabase
      .from('ecossistema_departamentos')
      .select('*')
      .order('ordem', { ascending: true })
    if (error) throw error
    return data || []
  },

  createEcossistemaDepartamento: async ({ nome, sistemas, cor }) => {
    const { data, error } = await supabase
      .from('ecossistema_departamentos')
      .insert([{ nome: nome.trim(), sistemas: sistemas || [], cor: cor || null }])
      .select()
    if (error) throw error
    return data?.[0]
  },

  updateEcossistemaDepartamento: async (id, { nome, sistemas, cor }) => {
    const { data, error } = await supabase
      .from('ecossistema_departamentos')
      .update({ nome: nome.trim(), sistemas: sistemas || [], cor: cor || null })
      .eq('id', id)
      .select()
    if (error) throw error
    return data?.[0]
  },

  deleteEcossistemaDepartamento: async (id) => {
    const { error } = await supabase.from('ecossistema_departamentos').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  },

  // GOOGLE CALENDAR
  getGoogleCalendarStatus: async (usuarioId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/google-calendar/status?usuario_id=${usuarioId}`)
    const body = await res.json()
    return body // { connected: bool, google_email: string|null }
  },

  getGoogleCalendarAuthUrl: async (usuarioId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/google-calendar/auth-url?usuario_id=${usuarioId}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao obter URL de autorização')
    return body.url
  },

  getGoogleCalendarEvents: async (usuarioId, dataIni, dataFim) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const qs = new URLSearchParams({ usuario_id: usuarioId })
    if (dataIni) qs.set('data_ini', dataIni)
    if (dataFim) qs.set('data_fim', dataFim)
    const res = await fetch(`${backendUrl}/api/google-calendar/events?${qs}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao buscar eventos')
    return body // { connected, google_email, events: [] }
  },

  disconnectGoogleCalendar: async (usuarioId) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const res = await fetch(`${backendUrl}/api/google-calendar/disconnect?usuario_id=${usuarioId}`, { method: 'DELETE' })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || 'Erro ao desconectar')
    return body
  },
}
