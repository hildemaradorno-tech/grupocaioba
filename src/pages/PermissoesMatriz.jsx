import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, ShieldCheck, Zap,
  RefreshCw, AlertTriangle, LayoutDashboard, Check, CircleDot,
} from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { apiService } from '../services/api'
import { MENU_TREE, getLeafKeys } from '../config/menuTree'
import { ACOES_POR_PATH } from '../config/acoesMenu'
import { MultiSearchCombobox } from '../components/SearchCombobox'

// ── Flatten MENU_TREE into display rows ──────────────────────────────────────

function buildRows() {
  const rows = []

  function walk(nodes, sectionAncestors, depth) {
    for (const node of nodes) {
      const isLeaf = !node.children
      rows.push({
        type: isLeaf ? 'menu' : 'section',
        key: node.key,
        label: node.label,
        depth,
        sectionAncestors: [...sectionAncestors],
      })
      if (!isLeaf) {
        // Visão inicial (Dashboard | Controle) de Garantias DAF e Auditoria O.S. Aberta
        if (node.key === '_garantias-daf' || node.key === '_auditoria-os-aberto') {
          rows.push({ type: 'visao', modulo: node.key === '_garantias-daf' ? 'garantias' : 'auditoria', key: `${node.key}#visao`, label: 'Visão inicial (abre primeiro)', depth: depth + 1, sectionAncestors: [...sectionAncestors, node.key] })
        }
        walk(node.children, [...sectionAncestors, node.key], depth + 1)
      } else {
        const acoes = ACOES_POR_PATH[node.key] || []
        for (const a of acoes) {
          rows.push({
            type: 'action',
            key: `${node.key}|${a.value}`,
            menuKey: node.key,
            actionValue: a.value,
            label: a.label,
            depth: depth + 1,
            sectionAncestors: [...sectionAncestors],
          })
        }
      }
    }
  }

  walk(MENU_TREE, [], 0)
  return rows
}

const ALL_ROWS = buildRows()

// ── Initial open sections (all open by default) ───────────────────────────────
const ALL_SECTION_KEYS = (() => {
  const s = new Set()
  ALL_ROWS.forEach(r => { if (r.type === 'section') s.add(r.key) })
  return s
})()


// ── Menus com ações (usado pra "Expandir todos" também abrir as ações) ────────
const ALL_MENU_KEYS_COM_ACOES = (() => {
  const s = new Set()
  ALL_ROWS.forEach(r => { if (r.type === 'menu' && (ACOES_POR_PATH[r.key] || []).length > 0) s.add(r.key) })
  return s
})()

// ── Opções do filtro de permissão: todos os menus e submenus (seções e telas), em árvore ──
const ROTULO_POR_KEY = new Map(ALL_ROWS.filter(r => r.type === 'section' || r.type === 'menu').map(r => [r.key, r.label]))
const OPCOES_PERMISSAO = ALL_ROWS
  .filter(r => r.type === 'section' || r.type === 'menu')
  .map(r => ({
    id: r.key,
    label: r.label,
    depth: r.depth,
    secao: r.type === 'section',
    caminho: [...r.sectionAncestors.map(k => ROTULO_POR_KEY.get(k)), r.label].join(' › '),
  }))

// Seção "Liberação por Acesso" (Acesso por Empresa / Departamento) — linhas montadas com os cadastros
const LIB_SECOES = [
  { id: '_lib', label: 'Liberação por Acesso', depth: 0, secao: true, caminho: 'Liberação por Acesso' },
  { id: '_lib.emp', label: 'Acesso por Empresa', depth: 1, secao: true, caminho: 'Liberação por Acesso › Acesso por Empresa' },
  { id: '_lib.dep', label: 'Acesso por Departamento', depth: 1, secao: true, caminho: 'Liberação por Acesso › Acesso por Departamento' },
  { id: '_lib.set', label: 'Acesso por Setor', depth: 1, secao: true, caminho: 'Liberação por Acesso › Acesso por Setor' },
]
OPCOES_PERMISSAO.push(...LIB_SECOES)
LIB_SECOES.forEach(l => ALL_SECTION_KEYS.add(l.id))

// ── Loading skeleton ──────────────────────────────────────────────────────────
function Skeleton({ w = 'w-24', h = 'h-4' }) {
  return <div className={`${w} ${h} bg-slate-200 rounded animate-pulse`} />
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PermissoesMatriz() {
  const [grupos, setGrupos] = useState([])
  const [permsSet, setPermsSet] = useState(new Set())   // "grupoId:menuPath"
  const [acoesSet, setAcoesSet] = useState(new Set())   // "grupoId:menuPath:acao"
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(new Set())       // cell keys being saved
  const [err, setErr] = useState(null)
  const [filtroPerms, setFiltroPerms] = useState([]) // keys de seções/menus escolhidos no filtro
  // Liberação por Acesso: empresas/departamentos do cadastro e o que cada grupo tem
  const [empresasCad, setEmpresasCad] = useState([])
  const [empSet, setEmpSet] = useState(new Set())   // "grupoId:empresaId"
  const [depSet, setDepSet] = useState(new Set())   // "grupoId:departamento_nome"
  const [setSet, setSetSet] = useState(new Set())   // "grupoId:setor_id"
  const [setoresCad, setSetoresCad] = useState([])
  const [gruposSelecionados, setGruposSelecionados] = useState([])
  const [tiposGrupo, setTiposGrupo] = useState([])
  const [filtroTipo, setFiltroTipo] = useState([]) // ids: '__admin' | '__sem' | tipo_id — vazio = todos
  // Mesmos seletores da tela Grupos de Acessos ('__sem' = sem valor)
  const [agrupamentos, setAgrupamentos] = useState([])
  const [departamentosCad, setDepartamentosCad] = useState([])
  const [filtroAgrupamento, setFiltroAgrupamento] = useState([]) // vazio = todos
  const [filtroDepartamento, setFiltroDepartamento] = useState([])
  const [openSections, setOpenSections] = useState(new Set())
  const [openAcoesMenu, setOpenAcoesMenu] = useState(new Set())

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [grps, { data: perms, error: e1 }, { data: acoes, error: e2 }, { data: emps, error: e3 }, { data: deps, error: e4 }, empresas] = await Promise.all([
        apiService.getGrupos(),
        supabase.from('permissoes_grupo').select('grupo_id, menu_path'),
        supabase.from('permissoes_grupo_acoes').select('grupo_id, menu_path, acao'),
        supabase.from('permissoes_empresa_grupo').select('grupo_id, empresa_id'),
        supabase.from('permissoes_depto_grupo').select('grupo_id, departamento_nome'),
        apiService.getEmpresas(),
      ])
      supabase.from('permissoes_setor_grupo').select('grupo_id, setor_id')
        .then(({ data }) => setSetSet(new Set((data || []).map(r => `${r.grupo_id}:${r.setor_id}`))))
      Promise.all([apiService.getSetores(), apiService.getDepartamentos()]).then(([sts, dps]) => {
        const nomeDep = new Map((dps || []).map(d => [d.id, d.nome_departamento]))
        setSetoresCad((sts || []).filter(x => x.ativo !== false)
          .map(x => ({ id: x.id, nome: x.nome_setor, departamento: nomeDep.get(x.departamento_id) || '' }))
          .sort((a, b) => a.departamento.localeCompare(b.departamento, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')))
      }).catch(() => setSetoresCad([]))
      if (e1) throw e1
      if (e2) throw e2
      if (e3) throw e3
      if (e4) throw e4
      setEmpSet(new Set((emps || []).map(r => `${r.grupo_id}:${r.empresa_id}`)))
      setDepSet(new Set((deps || []).map(r => `${r.grupo_id}:${r.departamento_nome}`)))
      setEmpresasCad((empresas || []).filter(e => e.ativo !== false).sort((a, b) =>
        (a.agrupamento_nome || '').localeCompare(b.agrupamento_nome || '', 'pt-BR') || (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
      setGrupos(grps)
      apiService.getTiposGrupoAcesso().then(setTiposGrupo).catch(() => setTiposGrupo([]))
      apiService.getAgrupamentoEmpresas().then(a => setAgrupamentos(a || [])).catch(() => setAgrupamentos([]))
      apiService.getDepartamentos().then(d => setDepartamentosCad([...new Set((d || []).filter(x => x.ativo !== false).map(x => x.nome_departamento).filter(Boolean))])).catch(() => setDepartamentosCad([]))
      setPermsSet(new Set((perms || []).map(p => `${p.grupo_id}:${p.menu_path}`)))
      setAcoesSet(new Set((acoes || []).map(a => `${a.grupo_id}:${a.menu_path}:${a.acao}`)))
    } catch (e) {
      setErr(e.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Toggle menu permission ──────────────────────────────────────────────────
  const togglePerm = useCallback(async (grupoId, menuPath) => {
    const cellKey = `${grupoId}:${menuPath}`
    const has = permsSet.has(cellKey)
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      if (has) {
        const { error } = await supabase.from('permissoes_grupo').delete()
          .eq('grupo_id', grupoId).eq('menu_path', menuPath)
        if (error) throw error
        setPermsSet(s => { const n = new Set(s); n.delete(cellKey); return n })
      } else {
        const { error } = await supabase.from('permissoes_grupo')
          .insert([{ grupo_id: grupoId, menu_path: menuPath }])
        if (error) throw error
        setPermsSet(s => new Set([...s, cellKey]))
      }
    } catch (e) {
      setErr(e.message || 'Erro ao salvar permissão.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [permsSet])

  // ── Toggle action permission ────────────────────────────────────────────────
  const toggleAcao = useCallback(async (grupoId, menuPath, acao) => {
    const cellKey = `${grupoId}:${menuPath}:${acao}`
    const has = acoesSet.has(cellKey)
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      if (has) {
        const { error } = await supabase.from('permissoes_grupo_acoes').delete()
          .eq('grupo_id', grupoId).eq('menu_path', menuPath).eq('acao', acao)
        if (error) throw error
        setAcoesSet(s => { const n = new Set(s); n.delete(cellKey); return n })
      } else {
        const { error } = await supabase.from('permissoes_grupo_acoes')
          .insert([{ grupo_id: grupoId, menu_path: menuPath, acao }])
        if (error) throw error
        setAcoesSet(s => new Set([...s, cellKey]))
      }
    } catch (e) {
      setErr(e.message || 'Erro ao salvar ação.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [acoesSet])

  // ── Visão inicial de Garantias DAF (grupos_acesso.garantias_daf_default_view) ─
  const salvarVisaoGarantias = useCallback(async (grupoId, visao) => {
    const cellKey = `${grupoId}:visao-garantias`
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      await apiService.setVisaoGarantiasGrupo(grupoId, visao)
      setGrupos(gs => gs.map(g => g.id === grupoId ? { ...g, garantias_daf_default_view: visao } : g))
    } catch (e) {
      setErr(e.message || 'Erro ao salvar a visão inicial.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [])

  // ── Visão inicial da Auditoria O.S. Aberta (grupos_acesso.auditoria_os_default_view) ─
  const salvarVisaoAuditoria = useCallback(async (grupoId, visao) => {
    const cellKey = `${grupoId}:visao-auditoria`
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      await apiService.setVisaoAuditoriaGrupo(grupoId, visao)
      setGrupos(gs => gs.map(g => g.id === grupoId ? { ...g, auditoria_os_default_view: visao } : g))
    } catch (e) {
      setErr(e.message || 'Erro ao salvar a visão inicial.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [])

  // ── Liberação por Acesso: empresa (permissoes_empresa_grupo) ──────────────
  const toggleEmpresa = useCallback(async (grupoId, empresaId) => {
    const cellKey = `${grupoId}:${empresaId}`
    const has = empSet.has(cellKey)
    setSaving(s => new Set([...s, `emp:${cellKey}`]))
    setErr(null)
    try {
      const q = has
        ? supabase.from('permissoes_empresa_grupo').delete().eq('grupo_id', grupoId).eq('empresa_id', empresaId)
        : supabase.from('permissoes_empresa_grupo').insert([{ grupo_id: grupoId, empresa_id: empresaId }])
      const { error } = await q
      if (error) throw error
      setEmpSet(s => { const n = new Set(s); if (has) n.delete(cellKey); else n.add(cellKey); return n })
    } catch (e) {
      setErr(e.message || 'Erro ao salvar acesso por empresa.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(`emp:${cellKey}`); return n })
    }
  }, [empSet])

  // ── Liberação por Acesso: departamento (modo Todos/Individual + permissoes_depto_grupo) ──
  const salvarModoDepto = useCallback(async (grupoId, modo) => {
    const cellKey = `depmodo:${grupoId}`
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      const { error } = await supabase.from('grupos_acesso').update({ projetos_depto_modo: modo }).eq('id', grupoId)
      if (error) throw error
      setGrupos(gs => gs.map(g => g.id === grupoId ? { ...g, projetos_depto_modo: modo } : g))
    } catch (e) {
      setErr(e.message || 'Erro ao salvar o modo do acesso por departamento.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [])
  const toggleDepto = useCallback(async (grupoId, nome) => {
    const cellKey = `${grupoId}:${nome}`
    const has = depSet.has(cellKey)
    setSaving(s => new Set([...s, `dep:${cellKey}`]))
    setErr(null)
    try {
      const q = has
        ? supabase.from('permissoes_depto_grupo').delete().eq('grupo_id', grupoId).eq('departamento_nome', nome)
        : supabase.from('permissoes_depto_grupo').insert([{ grupo_id: grupoId, departamento_nome: nome }])
      const { error } = await q
      if (error) throw error
      setDepSet(s => { const n = new Set(s); if (has) n.delete(cellKey); else n.add(cellKey); return n })
    } catch (e) {
      setErr(e.message || 'Erro ao salvar acesso por departamento.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(`dep:${cellKey}`); return n })
    }
  }, [depSet])

  // ── Liberação por Acesso: setor (modo Todos/Individual + permissoes_setor_grupo) ──
  const salvarModoSetor = useCallback(async (grupoId, modo) => {
    const cellKey = `setmodo:${grupoId}`
    setSaving(s => new Set([...s, cellKey]))
    setErr(null)
    try {
      const { error } = await supabase.from('grupos_acesso').update({ setor_modo: modo }).eq('id', grupoId)
      if (error) throw error
      setGrupos(gs => gs.map(g => g.id === grupoId ? { ...g, setor_modo: modo } : g))
    } catch (e) {
      setErr(e.message || 'Erro ao salvar o modo do acesso por setor.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(cellKey); return n })
    }
  }, [])
  const toggleSetor = useCallback(async (grupoId, setorId) => {
    const cellKey = `${grupoId}:${setorId}`
    const has = setSet.has(cellKey)
    setSaving(s => new Set([...s, `set:${cellKey}`]))
    setErr(null)
    try {
      const q = has
        ? supabase.from('permissoes_setor_grupo').delete().eq('grupo_id', grupoId).eq('setor_id', setorId)
        : supabase.from('permissoes_setor_grupo').insert([{ grupo_id: grupoId, setor_id: setorId }])
      const { error } = await q
      if (error) throw error
      setSetSet(s => { const n = new Set(s); if (has) n.delete(cellKey); else n.add(cellKey); return n })
    } catch (e) {
      setErr(e.message || 'Erro ao salvar acesso por setor.')
    } finally {
      setSaving(s => { const n = new Set(s); n.delete(`set:${cellKey}`); return n })
    }
  }, [setSet])

  // ── Section toggle ──────────────────────────────────────────────────────────
  const toggleSection = useCallback((key) => {
    setOpenSections(s => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }, [])

  // ── Ações por menu — fechadas por padrão, cada menu abre as suas sob demanda ──
  const toggleAcoesMenu = useCallback((key) => {
    setOpenAcoesMenu(s => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }, [])

  const expandAll  = () => { setOpenSections(new Set(ALL_SECTION_KEYS)); setOpenAcoesMenu(new Set(ALL_MENU_KEYS_COM_ACOES)) }
  const collapseAll = () => { setOpenSections(new Set()); setOpenAcoesMenu(new Set()) }
  const todasExpandidas = openSections.size >= ALL_SECTION_KEYS.size && openAcoesMenu.size >= ALL_MENU_KEYS_COM_ACOES.size
  const toggleExpandirTudo = () => (todasExpandidas ? collapseAll() : expandAll())

  // ── Visible rows (filtered by open sections + filtro de permissão) ──────────
  // Com filtro: mostra os menus/seções escolhidos (seção = tudo o que está dentro dela), com as seções
  // ancestrais sempre abertas. Ações aparecem direto quando o próprio menu foi escolhido; dentro de uma
  // seção escolhida, seguem o botão "Ações" do menu.
  const filtroAtivo = filtroPerms.length > 0
  const visibleRows = useMemo(() => {
    if (filtroAtivo) {
      const sel = new Set(filtroPerms)
      const escolhido = (r) => sel.has(r.key) || r.sectionAncestors.some(k => sel.has(k))
      const encontrados = ALL_ROWS.filter(r => {
        if (r.type === 'action') return sel.has(r.menuKey) || (r.sectionAncestors.some(k => sel.has(k)) && openAcoesMenu.has(r.menuKey))
        return escolhido(r)
      })
      const chaves = new Set(encontrados.map(r => r.key))
      encontrados.forEach(r => r.sectionAncestors.forEach(k => chaves.add(k)))
      return ALL_ROWS.filter(r => chaves.has(r.key))
    }
    return ALL_ROWS.filter(row => {
      if (!row.sectionAncestors.every(k => openSections.has(k))) return false
      if (row.type === 'action' && !openAcoesMenu.has(row.menuKey)) return false
      return true
    })
  }, [openSections, openAcoesMenu, filtroPerms, filtroAtivo])

  // ── Linhas da seção "Liberação por Acesso" (mesmas regras de abrir/fechar e do filtro de menus) ──
  const libVisiveis = useMemo(() => {
    const deps = [...new Set(departamentosCad)].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    const linhas = [
      { type: 'lib-section', key: '_lib', label: 'Liberação por Acesso', depth: 0, pais: [] },
      { type: 'lib-section', key: '_lib.emp', label: 'Acesso por Empresa', depth: 1, pais: ['_lib'] },
      ...empresasCad.map(e => ({ type: 'lib-emp', key: `_lib.emp|${e.id}`, empresa: e, depth: 2, pais: ['_lib', '_lib.emp'] })),
      { type: 'lib-section', key: '_lib.dep', label: 'Acesso por Departamento', depth: 1, pais: ['_lib'] },
      { type: 'lib-dep-modo', key: '_lib.dep|modo', label: 'Modo (Todos / Individual)', depth: 2, pais: ['_lib', '_lib.dep'] },
      ...deps.map(d => ({ type: 'lib-dep', key: `_lib.dep|${d}`, nome: d, depth: 2, pais: ['_lib', '_lib.dep'] })),
      { type: 'lib-section', key: '_lib.set', label: 'Acesso por Setor', depth: 1, pais: ['_lib'] },
      { type: 'lib-set-modo', key: '_lib.set|modo', label: 'Modo (Todos / Individual)', depth: 2, pais: ['_lib', '_lib.set'] },
      ...setoresCad.map(st => ({ type: 'lib-set', key: `_lib.set|${st.id}`, setor: st, depth: 2, pais: ['_lib', '_lib.set'] })),
    ]
    if (filtroAtivo) {
      const sel = new Set(filtroPerms)
      if (![...sel].some(k => k.startsWith('_lib'))) return []
      return linhas.filter(r => sel.has(r.key) || r.pais.some(k => sel.has(k)) || (r.type === 'lib-section' && [...sel].some(k => k.startsWith(r.key))))
    }
    return linhas.filter(r => r.pais.every(k => openSections.has(k)))
  }, [empresasCad, departamentosCad, setoresCad, filtroAtivo, filtroPerms, openSections])

  // ── Section summary: leaf keys de cada seção (em qualquer profundidade), pra
  // resumir o acesso do grupo naquela seção sem precisar expandir. Reaproveita
  // getLeafKeys (mesma função usada em SidebarLayout/Grupos) — a versão anterior
  // aqui duplicava contagens por reusar a mesma chave de seção em toda a recursão.
  const getSectionLeafKeys = useMemo(() => {
    const map = {}
    function walk(nodes) {
      for (const node of nodes) {
        if (node.children) {
          map[node.key] = getLeafKeys(node)
          walk(node.children)
        }
      }
    }
    walk(MENU_TREE)
    return map
  }, [])

  // ── Grupos filtrados pela seleção de grupos (colunas) ───────────────────────
  const gruposVisiveis = useMemo(() => {
    const idsSelecionados = new Set(gruposSelecionados)
    return grupos
      .filter(g => idsSelecionados.size === 0 || idsSelecionados.has(g.id))
      .filter(g => !filtroAgrupamento.length || filtroAgrupamento.includes(g.agrupamento_empresa_id || '__sem'))
      .filter(g => !filtroDepartamento.length || filtroDepartamento.includes(g.departamento || '__sem'))
      .filter(g => !filtroTipo.length || filtroTipo.includes(g.is_admin ? '__admin' : (g.tipo_id || '__sem')))
  }, [grupos, gruposSelecionados, filtroAgrupamento, filtroDepartamento, filtroTipo])
  // Opções dos seletores (várias escolhas); '__sem' = sem valor, '__admin' = Administrador
  const opcoesAgrupamento = useMemo(() => [...agrupamentos.map(a => ({ id: a.id, nome: a.nome_agrupamento })), { id: '__sem', nome: 'Sem grupo de empresa' }], [agrupamentos])
  const opcoesTipo = useMemo(() => [{ id: '__admin', nome: 'Administrador' }, ...tiposGrupo.map(t => ({ id: t.id, nome: t.nome })), { id: '__sem', nome: 'Personalizado (sem tipo)' }], [tiposGrupo])
  const departamentosOpcoes = useMemo(
    () => [...new Set([...departamentosCad, ...grupos.map(g => g.departamento).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [departamentosCad, grupos])
  const opcoesDepartamento = useMemo(() => [...departamentosOpcoes.map(d => ({ id: d, nome: d })), { id: '__sem', nome: 'Sem departamento' }], [departamentosOpcoes])

  // ── Cell helpers ────────────────────────────────────────────────────────────
  const hasPerm  = (gId, path) => permsSet.has(`${gId}:${path}`)
  const hasAcao  = (gId, path, acao) => acoesSet.has(`${gId}:${path}:${acao}`)
  const isSaving = (key) => saving.has(key)

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Matriz de Permissões</h1>
              <p className="text-xs text-slate-500">Veja e edite quais grupos têm acesso a cada menu e ação — alterações salvas imediatamente.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadAll} disabled={loading} title="Atualizar" className="p-2 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}
      </div>

      {/* Filtros: 1ª linha = grupos de acesso (colunas); 2ª linha = menus (linhas) */}
      <div className="shrink-0 px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 shrink-0 w-28">Grupos de acesso:</span>
        <div className="w-56">
          <MultiSearchCombobox
            compacto
            value={filtroAgrupamento}
            onChange={setFiltroAgrupamento}
            placeholder="Todos os grupos de empresa"
            searchPlaceholder="Buscar grupo de empresa..."
            notFoundLabel="Nada encontrado."
            opcoes={opcoesAgrupamento}
            getLabel={(o) => o.nome}
            getSearchText={(o) => o.nome}
            resumo={(sel) => sel.length === 1 ? sel[0].nome : `${sel.length} grupos de empresa`}
          />
        </div>
        <div className="w-56">
          <MultiSearchCombobox
            compacto
            value={filtroDepartamento}
            onChange={setFiltroDepartamento}
            placeholder="Todos os departamentos"
            searchPlaceholder="Buscar departamento..."
            notFoundLabel="Nada encontrado."
            opcoes={opcoesDepartamento}
            getLabel={(o) => o.nome}
            getSearchText={(o) => o.nome}
            resumo={(sel) => sel.length === 1 ? sel[0].nome : `${sel.length} departamentos`}
          />
        </div>
        <div className="w-56">
          <MultiSearchCombobox
            compacto
            value={filtroTipo}
            onChange={setFiltroTipo}
            placeholder="Todos os tipos"
            searchPlaceholder="Buscar tipo..."
            notFoundLabel="Nada encontrado."
            opcoes={opcoesTipo}
            getLabel={(o) => o.nome}
            getSearchText={(o) => o.nome}
            resumo={(sel) => sel.length === 1 ? sel[0].nome : `${sel.length} tipos`}
          />
        </div>
        <div className="w-56">
          <MultiSearchCombobox
            compacto
            value={gruposSelecionados}
            onChange={setGruposSelecionados}
            placeholder="Todos os grupos"
            searchPlaceholder="Buscar grupo pelo nome..."
            notFoundLabel="Nenhum grupo encontrado."
            opcoes={grupos}
            getLabel={(g) => g.nome_grupo}
            getSearchText={(g) => g.nome_grupo}
            resumo={(sel) => sel.length === 1 ? sel[0].nome_grupo : `${sel.length} grupos`}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 shrink-0 w-28">Menus:</span>
        <div className="w-56">
          <MultiSearchCombobox
            compacto
            value={filtroPerms}
            onChange={setFiltroPerms}
            placeholder="Todos os menus"
            searchPlaceholder="Buscar menu ou submenu..."
            notFoundLabel="Nenhum menu encontrado."
            opcoes={OPCOES_PERMISSAO}
            getLabel={(o) => (
              <span style={{ paddingLeft: `${o.depth * 12}px` }} className={o.secao ? 'font-semibold' : ''}>{o.label}</span>
            )}
            getSearchText={(o) => o.caminho}
            resumo={(sel) => sel.length === 1 ? sel[0].caminho : `${sel.length} menus`}
          />
        </div>
      </div>
      </div>

      {/* Matrix table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse min-w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-20">
              {/* First sticky column header */}
              <th className="sticky left-0 z-30 bg-slate-800 text-white text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide border-r border-slate-600 min-w-[300px] w-[300px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleExpandirTudo}
                    title={todasExpandidas ? 'Recolher todos' : 'Expandir todos'}
                    className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors normal-case"
                  >
                    {todasExpandidas ? <ChevronsDownUp className="h-3.5 w-3.5" /> : <ChevronsUpDown className="h-3.5 w-3.5" />}
                  </button>
                  Menu / Recurso
                </div>
              </th>
              {loading
                ? [1, 2, 3].map(i => (
                    <th key={i} className="bg-slate-800 border-r border-slate-600 px-4 py-3 min-w-[130px]">
                      <Skeleton w="w-20" h="h-4" />
                    </th>
                  ))
                : gruposVisiveis.map(g => (
                    <th key={g.id} className="bg-slate-800 text-white px-3 py-3 text-center min-w-[130px] border-r border-slate-600">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold leading-tight">{g.nome_grupo}</span>
                        {g.is_admin && (
                          <span className="flex items-center gap-0.5 text-[10px] text-amber-300 font-medium">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                    </th>
                  ))
              }
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 12 }).map((_, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="sticky left-0 bg-inherit border-r border-b border-slate-100 px-4 py-2.5">
                      <Skeleton w={`w-${30 + (i % 4) * 10}`} />
                    </td>
                    {[1, 2, 3].map(j => (
                      <td key={j} className="border-r border-b border-slate-100 px-4 py-2.5 text-center">
                        <Skeleton w="w-5" h="h-4" />
                      </td>
                    ))}
                  </tr>
                ))
              : visibleRows.map(row => {
                  if (row.type === 'section') {
                    // Com filtro de permissão, a seção aparece forçadamente expandida (ela ou algo dentro foi escolhido),
                    // então o ícone deve refletir isso mesmo que não esteja em openSections de verdade.
                    const isOpen = filtroAtivo ? true : openSections.has(row.key)
                    return (
                      <tr key={row.key} className="bg-slate-100 hover:bg-slate-200/70 transition-colors">
                        <td className="sticky left-0 z-10 bg-slate-100 hover:bg-slate-200 border-r border-b border-slate-200 px-4 py-2">
                          <button
                            onClick={() => toggleSection(row.key)}
                            className="flex items-center gap-2 w-full text-left"
                            style={{ paddingLeft: `${row.depth * 16}px` }}
                          >
                            {isOpen
                              ? <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                              : <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            }
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">{row.label}</span>
                          </button>
                        </td>
                        {gruposVisiveis.map(g => {
                          const leaves = getSectionLeafKeys[row.key] || []
                          const permitidas = g.is_admin ? leaves : leaves.filter(k => hasPerm(g.id, k))
                          const total = leaves.length
                          const qtd = permitidas.length
                          return (
                            <td key={g.id} className="border-r border-b border-slate-200 px-3 py-2 text-center text-xs">
                              {total === 0 ? (
                                <span className="text-slate-300">—</span>
                              ) : qtd === total ? (
                                <span title={`Acesso completo (${qtd}/${total})`} className="inline-flex items-center justify-center">
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                </span>
                              ) : qtd > 0 ? (
                                <span title={`Acesso parcial (${qtd}/${total})`} className="inline-flex items-center justify-center">
                                  <CircleDot className="h-3.5 w-3.5 text-amber-500" />
                                </span>
                              ) : (
                                <span title="Sem acesso" className="text-slate-300">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  }

                  if (row.type === 'menu') {
                    const minhasAcoes = ACOES_POR_PATH[row.key] || []
                    const acoesAbertas = openAcoesMenu.has(row.key)
                    return (
                      <tr key={row.key} className="bg-white hover:bg-blue-50/30 transition-colors group">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50 border-r border-b border-slate-100 px-4 py-2">
                          <div className="flex items-center gap-2" style={{ paddingLeft: `${row.depth * 16}px` }}>
                            <span className="text-sm text-slate-700 truncate">{row.label}</span>
                            {minhasAcoes.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleAcoesMenu(row.key)}
                                className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                                  acoesAbertas
                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                }`}
                              >
                                {acoesAbertas ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                Ações ({minhasAcoes.length})
                              </button>
                            )}
                          </div>
                        </td>
                        {gruposVisiveis.map(g => {
                          const cellKey = `${g.id}:${row.key}`
                          const checked = g.is_admin || hasPerm(g.id, row.key)
                          const spinning = isSaving(cellKey)
                          return (
                            <td key={g.id} className="border-r border-b border-slate-100 px-3 py-2 text-center">
                              {spinning
                                ? <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin mx-auto" />
                                : (
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={g.is_admin}
                                    onChange={() => togglePerm(g.id, row.key)}
                                    className={`w-4 h-4 rounded accent-indigo-600 cursor-pointer ${g.is_admin ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  />
                                )
                              }
                            </td>
                          )
                        })}
                      </tr>
                    )
                  }

                  if (row.type === 'visao') {
                    const auditoria = row.modulo === 'auditoria'
                    const nomeModulo = auditoria ? 'Auditoria O.S. Aberta' : 'Garantias DAF'
                    return (
                      <tr key={row.key} className="bg-violet-50/50 hover:bg-violet-50 transition-colors group">
                        <td className="sticky left-0 z-10 bg-violet-50 group-hover:bg-violet-100 border-r border-b border-violet-100 px-4 py-1.5">
                          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${row.depth * 16}px` }}
                            title={`Qual visão aparece primeiro quando o usuário abre ${nomeModulo}. Sem permissão para a escolhida, abre na outra.`}>
                            <span className="text-xs font-semibold text-violet-700">{row.label}</span>
                          </div>
                        </td>
                        {gruposVisiveis.map(g => {
                          const cellKey = `${g.id}:visao-${row.modulo}`
                          const controle = auditoria ? 'controle' : 'tabela'
                          const valor = auditoria
                            ? (g.auditoria_os_default_view === 'controle' ? 'controle' : 'dashboard')
                            : (g.garantias_daf_default_view === 'dashboard' ? 'dashboard' : 'tabela')
                          const salvar = auditoria ? salvarVisaoAuditoria : salvarVisaoGarantias
                          return (
                            <td key={g.id} className="border-r border-b border-violet-100 px-2 py-1.5 text-center">
                              {isSaving(cellKey)
                                ? <RefreshCw className="h-3.5 w-3.5 text-violet-400 animate-spin mx-auto" />
                                : (
                                  <select value={valor} onChange={e => salvar(g.id, e.target.value)}
                                    className="text-[11px] border border-violet-200 rounded px-1 py-0.5 bg-white text-slate-700 focus:ring-1 focus:ring-violet-300">
                                    <option value="dashboard">Dashboard</option>
                                    <option value={controle}>Controle</option>
                                  </select>
                                )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  }

                  // type === 'action'
                  return (
                    <tr key={row.key} className="bg-blue-50/40 hover:bg-blue-50/70 transition-colors group">
                      <td className="sticky left-0 z-10 bg-blue-50 group-hover:bg-blue-100 border-r border-b border-blue-100 px-4 py-1.5">
                        <div
                          className="flex items-center gap-1.5"
                          style={{ paddingLeft: `${row.depth * 16}px` }}
                        >
                          <Zap className="h-3 w-3 text-blue-400 shrink-0" />
                          <span className="text-xs text-slate-600">{row.label}</span>
                        </div>
                      </td>
                      {gruposVisiveis.map(g => {
                        const cellKey = `${g.id}:${row.menuKey}:${row.actionValue}`
                        const checked = g.is_admin || hasAcao(g.id, row.menuKey, row.actionValue)
                        const spinning = isSaving(cellKey)
                        return (
                          <td key={g.id} className="border-r border-b border-blue-100 px-3 py-1.5 text-center">
                            {spinning
                              ? <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin mx-auto" />
                              : (
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={g.is_admin}
                                  onChange={() => toggleAcao(g.id, row.menuKey, row.actionValue)}
                                  className={`w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer ${g.is_admin ? 'opacity-40 cursor-not-allowed' : ''}`}
                                />
                              )
                            }
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
            }
            {!loading && libVisiveis.map(row => {
              const pad = { paddingLeft: `${row.depth * 16}px` }
              if (row.type === 'lib-section') {
                const isOpen = filtroAtivo ? true : openSections.has(row.key)
                return (
                  <tr key={row.key} className="bg-emerald-50 hover:bg-emerald-100/70 transition-colors">
                    <td className="sticky left-0 z-10 bg-emerald-50 border-r border-b border-emerald-200 px-4 py-2">
                      <button onClick={() => toggleSection(row.key)} className="flex items-center gap-2 w-full text-left" style={pad}>
                        {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{row.label}</span>
                      </button>
                    </td>
                    {gruposVisiveis.map(g => <td key={g.id} className="border-r border-b border-emerald-200" />)}
                  </tr>
                )
              }
              if (row.type === 'lib-dep-modo' || row.type === 'lib-set-modo') {
                const ehSetor = row.type === 'lib-set-modo'
                return (
                  <tr key={row.key} className="bg-violet-50/50">
                    <td className="sticky left-0 z-10 bg-violet-50 border-r border-b border-violet-100 px-4 py-1.5">
                      <div style={pad} title="Todos = sem restrição (inclusive departamentos futuros); Individual = só os marcados abaixo">
                        <span className="text-xs font-semibold text-violet-700">{row.label}</span>
                      </div>
                    </td>
                    {gruposVisiveis.map(g => (
                      <td key={g.id} className="border-r border-b border-violet-100 px-2 py-1.5 text-center">
                        {g.is_admin ? <span className="text-[11px] text-slate-400">Todos</span>
                          : isSaving(`${ehSetor ? 'setmodo' : 'depmodo'}:${g.id}`) ? <RefreshCw className="h-3.5 w-3.5 text-violet-400 animate-spin mx-auto" />
                          : (
                            <select value={(ehSetor ? g.setor_modo : g.projetos_depto_modo) === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TODOS'} onChange={e => (ehSetor ? salvarModoSetor : salvarModoDepto)(g.id, e.target.value)}
                              className="text-[11px] border border-violet-200 rounded px-1 py-0.5 bg-white text-slate-700 focus:ring-1 focus:ring-violet-300">
                              <option value="TODOS">Todos</option>
                              <option value="INDIVIDUAL">Individual</option>
                            </select>
                          )}
                      </td>
                    ))}
                  </tr>
                )
              }
              const ehEmp = row.type === 'lib-emp'
              const ehSet = row.type === 'lib-set'
              const rotulo = ehEmp ? (row.empresa.empresa_fantasia || row.empresa.nome_empresa) : ehSet ? row.setor.nome : row.nome
              return (
                <tr key={row.key} className="bg-white hover:bg-emerald-50/40 transition-colors group">
                  <td className="sticky left-0 z-10 bg-white group-hover:bg-emerald-50 border-r border-b border-slate-100 px-4 py-2">
                    <div className="flex items-center gap-2" style={pad}>
                      <span className="text-sm text-slate-700 truncate">{rotulo}</span>
                      {ehEmp && row.empresa.agrupamento_nome && <span className="text-[10px] text-slate-400 shrink-0">{row.empresa.agrupamento_nome}</span>}
                      {ehSet && row.setor.departamento && <span className="text-[10px] text-slate-400 shrink-0">{row.setor.departamento}</span>}
                    </div>
                  </td>
                  {gruposVisiveis.map(g => {
                    const chave = ehEmp ? `${g.id}:${row.empresa.id}` : ehSet ? `${g.id}:${row.setor.id}` : `${g.id}:${row.nome}`
                    const todosDepto = ehSet ? g.setor_modo !== 'INDIVIDUAL' : (!ehEmp && g.projetos_depto_modo !== 'INDIVIDUAL')
                    const checked = g.is_admin || todosDepto || (ehEmp ? empSet.has(chave) : ehSet ? setSet.has(chave) : depSet.has(chave))
                    const bloqueado = g.is_admin || todosDepto
                    const spinning = isSaving(ehEmp ? `emp:${chave}` : ehSet ? `set:${chave}` : `dep:${chave}`)
                    return (
                      <td key={g.id} className="border-r border-b border-slate-100 px-3 py-2 text-center">
                        {spinning
                          ? <RefreshCw className="h-3.5 w-3.5 text-emerald-500 animate-spin mx-auto" />
                          : (
                            <input type="checkbox" checked={checked} disabled={bloqueado}
                              title={g.is_admin ? 'Administrador vê tudo' : todosDepto ? 'Modo Todos: sem restrição — mude para Individual para escolher' : undefined}
                              onChange={() => (ehEmp ? toggleEmpresa(g.id, row.empresa.id) : ehSet ? toggleSetor(g.id, row.setor.id) : toggleDepto(g.id, row.nome))}
                              className={`w-4 h-4 rounded accent-emerald-600 cursor-pointer ${bloqueado ? 'opacity-40 cursor-not-allowed' : ''}`} />
                          )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>

        {!loading && visibleRows.length === 0 && libVisiveis.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-sm">Nenhuma permissão encontrada para o filtro.</p>
          </div>
        )}
      </div>

      {/* Footer legend */}
      <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-6 py-2 flex items-center gap-6 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-slate-300 bg-white inline-block" /> Menu / Página
        </span>
        <span className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-blue-400" /> Ação dentro da tela
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> Admin — acesso total automático
        </span>
        <span className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-emerald-600" /> Seção — grupo tem acesso a tudo
        </span>
        <span className="flex items-center gap-1.5">
          <CircleDot className="h-3.5 w-3.5 text-amber-500" /> Seção — acesso parcial
        </span>
        <span className="ml-auto text-slate-400">Clique em qualquer checkbox para salvar imediatamente.</span>
      </div>
    </div>
  )
}
