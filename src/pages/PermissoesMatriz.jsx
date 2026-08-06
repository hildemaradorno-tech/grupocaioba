import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  ChevronDown, ChevronRight, Search, X, ShieldCheck, Zap,
  RefreshCw, AlertTriangle, LayoutDashboard,
} from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { apiService } from '../services/api'
import { MENU_TREE } from '../config/menuTree'
import { ACOES_POR_MENU, ACOES_POR_PATH } from '../config/acoesMenu'

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
  const [busca, setBusca] = useState('')
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [openSections, setOpenSections] = useState(new Set())
  const busRef = useRef(null)
  const buscaGrupoRef = useRef(null)

  // ── Load all data ───────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [grps, { data: perms, error: e1 }, { data: acoes, error: e2 }] = await Promise.all([
        apiService.getGrupos(),
        supabase.from('permissoes_grupo').select('grupo_id, menu_path'),
        supabase.from('permissoes_grupo_acoes').select('grupo_id, menu_path, acao'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setGrupos(grps)
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

  // ── Section toggle ──────────────────────────────────────────────────────────
  const toggleSection = useCallback((key) => {
    setOpenSections(s => {
      const n = new Set(s)
      if (n.has(key)) n.delete(key); else n.add(key)
      return n
    })
  }, [])

  const expandAll  = () => setOpenSections(new Set(ALL_SECTION_KEYS))
  const collapseAll = () => setOpenSections(new Set())

  // ── Visible rows (filtered by open sections + search) ──────────────────────
  const visibleRows = useMemo(() => {
    let rows = ALL_ROWS.filter(row => row.sectionAncestors.every(k => openSections.has(k)))
    if (busca.trim()) {
      const term = busca.toLowerCase()
      rows = rows.filter(r => r.label.toLowerCase().includes(term) || r.type === 'section')
    }
    return rows
  }, [openSections, busca])

  // ── Section summary: count of leaves with at least one group checked ─────────
  const getSectionLeafKeys = useMemo(() => {
    const map = {}
    function walk(nodes, sKey) {
      for (const node of nodes) {
        if (!node.children) {
          if (!map[sKey]) map[sKey] = []
          map[sKey].push(node.key)
        } else {
          walk(node.children, sKey)
          if (!map[sKey]) map[sKey] = []
          if (map[node.key]) map[sKey].push(...map[node.key])
        }
      }
    }
    MENU_TREE.forEach(n => walk([n], n.key))
    return map
  }, [])

  // ── Grupos filtrados por busca de nome ─────────────────────────────────────
  const gruposVisiveis = useMemo(() => {
    if (!buscaGrupo.trim()) return grupos
    const term = buscaGrupo.toLowerCase()
    return grupos.filter(g => g.nome_grupo.toLowerCase().includes(term))
  }, [grupos, buscaGrupo])

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
            <button onClick={expandAll}  className="text-xs px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
              Expandir todos
            </button>
            <button onClick={collapseAll} className="text-xs px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors">
              Recolher todos
            </button>
            <button onClick={loadAll} disabled={loading} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}
      </div>

      {/* Filtros: grupo (colunas) + permissão (linhas) */}
      <div className="shrink-0 px-6 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center gap-4 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 shrink-0">Filtrar grupos:</span>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={buscaGrupoRef}
            value={buscaGrupo}
            onChange={e => setBuscaGrupo(e.target.value)}
            placeholder="Ex: Gerente, Vendas…"
            className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {buscaGrupo && (
            <button onClick={() => { setBuscaGrupo(''); buscaGrupoRef.current?.focus() }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {buscaGrupo.trim() && (
          <span className="text-xs text-slate-400 shrink-0">
            {gruposVisiveis.length} de {grupos.length} grupos
          </span>
        )}

        <div className="w-px h-4 bg-slate-300 shrink-0" />

        <span className="text-xs font-semibold text-slate-500 shrink-0">Filtrar permissão:</span>
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            ref={busRef}
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Ex: Projetos, PDCA…"
            className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          {busca && (
            <button onClick={() => { setBusca(''); busRef.current?.focus() }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Matrix table */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse min-w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-20">
              {/* First sticky column header */}
              <th className="sticky left-0 z-30 bg-slate-800 text-white text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide border-r border-slate-600 min-w-[300px] w-[300px]">
                Menu / Recurso
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
                    const isOpen = openSections.has(row.key)
                    return (
                      <tr key={row.key} className="bg-slate-100 hover:bg-slate-200/70 transition-colors">
                        <td className="sticky left-0 z-10 bg-slate-100 hover:bg-slate-200/70 border-r border-b border-slate-200 px-4 py-2">
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
                        {gruposVisiveis.map(g => (
                          <td key={g.id} className="border-r border-b border-slate-200 px-3 py-2 text-center text-slate-300 text-xs">
                            —
                          </td>
                        ))}
                      </tr>
                    )
                  }

                  if (row.type === 'menu') {
                    return (
                      <tr key={row.key} className="bg-white hover:bg-blue-50/30 transition-colors group">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-blue-50/30 border-r border-b border-slate-100 px-4 py-2">
                          <span
                            className="text-sm text-slate-700"
                            style={{ paddingLeft: `${row.depth * 16}px`, display: 'block' }}
                          >
                            {row.label}
                          </span>
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

                  // type === 'action'
                  return (
                    <tr key={row.key} className="bg-blue-50/40 hover:bg-blue-50/70 transition-colors group">
                      <td className="sticky left-0 z-10 bg-blue-50/40 group-hover:bg-blue-50/70 border-r border-b border-blue-100 px-4 py-1.5">
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
          </tbody>
        </table>

        {!loading && visibleRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-sm">Nenhuma permissão encontrada para "{busca}".</p>
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
        <span className="ml-auto text-slate-400">Clique em qualquer checkbox para salvar imediatamente.</span>
      </div>
    </div>
  )
}
