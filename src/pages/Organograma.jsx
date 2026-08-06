import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../services/supabaseClient'
import {
  Building2, Tag, LayoutGrid, Layers, FolderTree, Briefcase,
  ChevronDown, ChevronRight, Search, X, Network, Edit2,
} from 'lucide-react'

const EDIT_ROUTE = {
  agrupamento:      '/agrup-empresas',
  area:             '/areas',
  agrupamento_depto:'/agrup-departamentos',
  departamento:     '/departamentos',
  setor:            '/setores',
  cargo:            '/cargos',
}

const TIPO = {
  agrupamento: {
    Icon: Building2,
    card: 'bg-blue-600 text-white border-blue-700',
    badge: 'bg-blue-500 text-white',
    label: 'Agrup. Empresas',
  },
  area: {
    Icon: Tag,
    card: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    badge: 'bg-indigo-200 text-indigo-700',
    label: 'Área',
  },
  agrupamento_depto: {
    Icon: LayoutGrid,
    card: 'bg-amber-50 text-amber-800 border-amber-300',
    badge: 'bg-amber-200 text-amber-700',
    label: 'Agrup. Departamento',
  },
  departamento: {
    Icon: Layers,
    card: 'bg-violet-50 text-violet-800 border-violet-300',
    badge: 'bg-violet-200 text-violet-700',
    label: 'Departamento',
  },
  setor: {
    Icon: FolderTree,
    card: 'bg-teal-50 text-teal-800 border-teal-300',
    badge: 'bg-teal-200 text-teal-700',
    label: 'Setor',
  },
  cargo: {
    Icon: Briefcase,
    card: 'bg-slate-50 text-slate-700 border-slate-300',
    badge: null,
    label: 'Cargo',
  },
}

// ── Linhas conectoras ─────────────────────────────────────────────────────────
function Connector({ isFirst, isLast, isOnly }) {
  return (
    <div className="relative flex justify-center" style={{ height: 20, width: '100%' }}>
      {!isOnly && !isFirst && (
        <div className="absolute top-0 left-0 right-1/2 border-t-2 border-slate-300" />
      )}
      {!isOnly && !isLast && (
        <div className="absolute top-0 left-1/2 right-0 border-t-2 border-slate-300" />
      )}
      <div className="absolute top-0 bottom-0 border-l-2 border-slate-300" style={{ left: '50%' }} />
    </div>
  )
}

// ── Nó do organograma ─────────────────────────────────────────────────────────
function OrgNode({ node, expandedIds, onToggle }) {
  const navigate = useNavigate()
  const isOpen = expandedIds.has(node.id)
  const hasKids = !!node.children?.length
  const { Icon, card, badge } = TIPO[node.type]
  const editRoute = EDIT_ROUTE[node.type]

  return (
    <div className="flex flex-col items-center">
      <div className="group flex items-center gap-1">
        <button
          onClick={() => hasKids && onToggle(node.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-semibold shadow-sm whitespace-nowrap transition-all ${card} ${
            hasKids ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{node.label}</span>
          {node.codigo && (
            <span className="font-mono font-normal text-[10px] opacity-60">{node.codigo}</span>
          )}
          {hasKids && badge && (
            <span className={`text-[10px] font-bold px-1.5 py-px rounded-full ${badge}`}>
              {node.children.length}
            </span>
          )}
          {hasKids && (
            isOpen
              ? <ChevronDown className="h-3.5 w-3.5 opacity-70 ml-0.5" />
              : <ChevronRight className="h-3.5 w-3.5 opacity-70 ml-0.5" />
          )}
        </button>
        {editRoute && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(editRoute) }}
            title={`Editar ${TIPO[node.type].label}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && hasKids && (
        <>
          <div className="border-l-2 border-slate-300" style={{ height: 16 }} />
          <div className="flex flex-row flex-nowrap">
            {node.children.map((child, i) => (
              <div key={child.id} className="flex flex-col items-center">
                <Connector
                  isFirst={i === 0}
                  isLast={i === node.children.length - 1}
                  isOnly={node.children.length === 1}
                />
                <div className="px-3 pb-3">
                  <OrgNode node={child} expandedIds={expandedIds} onToggle={onToggle} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function getAllExpandableIds(node) {
  if (!node.children?.length) return []
  return [node.id, ...node.children.flatMap(getAllExpandableIds)]
}

function nodeMatches(node, term) {
  const t = term.toLowerCase()
  if (node.label.toLowerCase().includes(t)) return true
  if (node.codigo?.toLowerCase().includes(t)) return true
  return false
}

function filterTree(node, term) {
  const kids = (node.children || []).map(c => filterTree(c, term)).filter(Boolean)
  if (kids.length) return { ...node, children: kids }
  if (nodeMatches(node, term)) return { ...node, children: [] }
  return null
}

function stripCargos(node) {
  const kids = (node.children || []).filter(c => c.type !== 'cargo').map(stripCargos)
  return { ...node, children: kids }
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Organograma() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rawData, setRawData] = useState({
    agrupamentos: [], empresas: [], areas: [], agrupamentosDepto: [],
    departamentos: [], setores: [], cargos: [],
  })
  const [expandedIds, setExpandedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [filtroAg, setFiltroAg] = useState('todos')
  const [view, setView] = useState('estrutura')

  useEffect(() => {
    Promise.all([
      apiService.getAgrupamentoEmpresas(),
      apiService.getEmpresas(),
      apiService.getAreas(),
      apiService.getAgrupamentoDepartamentos(),
      apiService.getDepartamentos(),
      apiService.getSetores(),
      apiService.getCargos(),
    ]).then(([agrupamentos, empresas, areas, agrupamentosDepto, departamentos, setores, cargos]) => {
      setRawData({ agrupamentos, empresas, areas, agrupamentosDepto, departamentos, setores, cargos })
      setLoading(false)
    }).catch(err => {
      setError(err.message)
      setLoading(false)
    })
  }, [])

  const tree = useMemo(() => {
    const { agrupamentos, empresas, areas, agrupamentosDepto, departamentos, setores, cargos } = rawData
    const ags = filtroAg === 'todos'
      ? agrupamentos
      : agrupamentos.filter(a => a.id === filtroAg)

    return ags.map(ag => {
      // IDs de empresas deste agrupamento
      const agEmpresaIds = new Set(
        empresas.filter(e => e.agrupamento_empresa_id === ag.id).map(e => e.id)
      )

      // Departamentos vinculados a este agrupamento (via empresa_ids)
      const agDepts = departamentos.filter(d =>
        Array.isArray(d.empresa_ids) && d.empresa_ids.some(eid => agEmpresaIds.has(eid))
      )

      // Áreas distintas desses departamentos, ordenadas
      const areaNamesSet = new Set(agDepts.map(d => d.area || '').filter(Boolean))
      const temSemArea = agDepts.some(d => !d.area)

      const areaNodes = [
        // Áreas com nome, ordenadas
        ...[...areaNamesSet].sort().map(areaName => {
          const areaObj = areas.find(a => a.nome_area === areaName)
          const areaDepts = agDepts.filter(d => d.area === areaName)
          return buildAreaNode(areaName, areaObj?.id || `name-${areaName}`, ag.id, areaDepts, agrupamentosDepto, setores, cargos)
        }),
        // Departamentos sem área
        ...(temSemArea ? [
          buildAreaNode('Sem Área', `__sem_area__`, ag.id, agDepts.filter(d => !d.area), agrupamentosDepto, setores, cargos)
        ] : []),
      ]

      return {
        id: `ag-${ag.id}`,
        label: ag.nome_agrupamento,
        type: 'agrupamento',
        children: areaNodes,
      }
    })
  }, [rawData, filtroAg])

  const displayTree = useMemo(() => {
    const filtered = !search ? tree : tree.map(n => filterTree(n, search)).filter(Boolean)
    return view === 'estrutura' ? filtered.map(stripCargos) : filtered
  }, [tree, search, view])

  const allExpandableIds = useMemo(() =>
    displayTree.flatMap(getAllExpandableIds), [displayTree]
  )

  useEffect(() => {
    if (search) setExpandedIds(new Set(allExpandableIds))
    else setExpandedIds(new Set())
  }, [search])

  const toggleNode = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const { agrupamentos, departamentos, setores, cargos } = rawData

  // ── Pan por arrastar ─────────────────────────────────────────────────────────
  const panRef = useRef(null)
  const startPos = useRef(null)
  const moved = useRef(false)

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    moved.current = false
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: panRef.current.scrollLeft,
      scrollTop: panRef.current.scrollTop,
    }
    panRef.current.style.cursor = 'grabbing'
    panRef.current.style.userSelect = 'none'

    const onMove = (ev) => {
      if (!startPos.current) return
      const dx = ev.clientX - startPos.current.x
      const dy = ev.clientY - startPos.current.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
      panRef.current.scrollLeft = startPos.current.scrollLeft - dx
      panRef.current.scrollTop  = startPos.current.scrollTop  - dy
    }

    const onUp = () => {
      startPos.current = null
      if (panRef.current) {
        panRef.current.style.cursor = 'grab'
        panRef.current.style.userSelect = ''
      }
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  // Cancela o click nas caixas quando houve arrasto
  const onClickCapture = useCallback((e) => {
    if (moved.current) { e.stopPropagation(); moved.current = false }
  }, [])

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando organograma...</div>
  if (error) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
              <Network className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Organograma</h1>
              <p className="text-xs text-slate-500">
                {view === 'estrutura'
                  ? 'Agrupamento → Área → Agrup. Depto → Departamento → Setor'
                  : 'Agrupamento → Área → Agrup. Depto → Departamento → Setor → Cargo'}
              </p>
            </div>
          </div>

          {/* Abas de visualização */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden shrink-0">
            {[
              { key: 'estrutura', label: 'Até Setor' },
              { key: 'cargos',    label: 'Com Cargos' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => { setView(tab.key); setExpandedIds(new Set()) }}
                className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                  view === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Estatísticas */}
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: 'Departamentos', value: departamentos.length, color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
            { label: 'Setores',       value: setores.length,       color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-100' },
            { label: 'Cargos',        value: cargos.length,        color: 'text-slate-600',  bg: 'bg-slate-100 border-slate-200' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${s.bg}`}>
              <span className={`text-base font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por agrupamento */}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFiltroAg('todos')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                filtroAg === 'todos'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
              }`}
            >
              Todos
            </button>
            {agrupamentos.map(ag => (
              <button
                key={ag.id}
                onClick={() => setFiltroAg(ag.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  filtroAg === ag.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {ag.nome_agrupamento}
              </button>
            ))}
          </div>

          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setExpandedIds(new Set(allExpandableIds))}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <ChevronDown className="h-3 w-3" /> Expandir tudo
            </button>
            <button
              onClick={() => setExpandedIds(new Set())}
              className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <ChevronRight className="h-3 w-3" /> Recolher
            </button>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(TIPO)
            .filter(([type]) => view === 'cargos' || type !== 'cargo')
            .map(([type, { Icon, card, label }]) => (
              <span key={type} className={`flex items-center gap-1 px-2 py-0.5 rounded border-2 text-[11px] font-semibold ${card}`}>
                <Icon className="h-3 w-3" /> {label}
              </span>
            ))}
        </div>
      </div>

      {/* ── Organograma ── */}
      <div
        ref={panRef}
        className="flex-1 overflow-auto bg-slate-50"
        style={{ cursor: 'grab' }}
        onMouseDown={onMouseDown}
        onClickCapture={onClickCapture}
      >
        {displayTree.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-16">
            {search ? `Nenhum resultado para "${search}"` : 'Nenhum dado encontrado.'}
          </p>
        ) : (
          <div className="inline-flex flex-row flex-nowrap items-start gap-8 p-6 pb-10" style={{ minWidth: 'max-content' }}>
            {displayTree.map(node => (
              <OrgNode
                key={node.id}
                node={node}
                expandedIds={expandedIds}
                onToggle={toggleNode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Monta nó de departamento com setores e cargos ────────────────────────────
function buildDeptNode(dept, areaId, agId, setores, cargos) {
  const deptSetores = setores.filter(s => s.departamento_id === dept.id)
  const setorIds = new Set(deptSetores.map(s => s.id))
  const cargosEmSetor = new Set(
    cargos.filter(c => (c.setor_ids || []).some(sid => setorIds.has(sid))).map(c => c.id)
  )
  const cargosDiretos = cargos.filter(c =>
    (c.departamento_ids || []).includes(dept.id) && !cargosEmSetor.has(c.id)
  )
  return {
    id: `dept-${dept.id}-area-${areaId}-ag-${agId}`,
    label: dept.nome_departamento,
    type: 'departamento',
    children: [
      ...deptSetores.map(set => ({
        id: `set-${set.id}-dept-${dept.id}`,
        label: set.nome_setor,
        type: 'setor',
        children: cargos
          .filter(c => (c.setor_ids || []).includes(set.id))
          .map(c => ({
            id: `cargo-${c.id}-set-${set.id}`,
            label: c.nome_cargo,
            codigo: c.codigo_cargo,
            type: 'cargo',
            children: [],
          })),
      })),
      ...cargosDiretos.map(c => ({
        id: `cargo-${c.id}-dept-${dept.id}`,
        label: c.nome_cargo,
        codigo: c.codigo_cargo,
        type: 'cargo',
        children: [],
      })),
    ],
  }
}

// ── Monta o nó de área com agrupamentos de departamento ──────────────────────
function buildAreaNode(areaName, areaId, agId, depts, agrupamentosDepto, setores, cargos) {
  // IDs de agrupamentos de departamento usados nesta área
  const agDeptIdsUsados = [...new Set(depts.map(d => d.agrupamento_departamento_id).filter(Boolean))]
  const deptosSemAgrupamento = depts.filter(d => !d.agrupamento_departamento_id)

  const children = [
    ...agDeptIdsUsados.map(agDeptId => {
      const agDept = agrupamentosDepto.find(a => a.id === agDeptId)
      const agDeptDepts = depts.filter(d => d.agrupamento_departamento_id === agDeptId)
      return {
        id: `agdepto-${agDeptId}-area-${areaId}-ag-${agId}`,
        label: agDept?.nome_agrupamento || 'Agrupamento',
        type: 'agrupamento_depto',
        children: agDeptDepts.map(dept => buildDeptNode(dept, areaId, agId, setores, cargos)),
      }
    }),
    ...deptosSemAgrupamento.map(dept => buildDeptNode(dept, areaId, agId, setores, cargos)),
  ]

  return {
    id: `area-${areaId}-ag-${agId}`,
    label: areaName,
    type: 'area',
    children,
  }
}
