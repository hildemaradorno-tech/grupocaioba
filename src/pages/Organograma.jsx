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
    label: 'Agrupamento de Empresas',
  },
  area: {
    Icon: Tag,
    card: 'bg-indigo-50 text-indigo-700 border-indigo-300',
    label: 'Área',
  },
  agrupamento_depto: {
    Icon: LayoutGrid,
    card: 'bg-amber-50 text-amber-700 border-amber-300',
    label: 'Agrupamento de Departamento',
  },
  departamento: {
    Icon: Layers,
    card: 'bg-violet-50 text-violet-700 border-violet-300',
    label: 'Departamento',
  },
  setor: {
    Icon: FolderTree,
    card: 'bg-teal-50 text-teal-700 border-teal-300',
    label: 'Setor',
  },
  cargo: {
    Icon: Briefcase,
    card: 'bg-slate-50 text-slate-600 border-slate-300',
    label: 'Cargo',
  },
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
    dbId: dept.id,
    label: dept.nome_departamento,
    type: 'departamento',
    children: [
      ...deptSetores.map(set => ({
        id: `set-${set.id}-dept-${dept.id}`,
        dbId: set.id,
        label: set.nome_setor,
        type: 'setor',
        children: cargos
          .filter(c => (c.setor_ids || []).includes(set.id))
          .map(c => ({
            id: `cargo-${c.id}-set-${set.id}`,
            dbId: c.id,
            label: c.nome_cargo,
            codigo: c.codigo_cargo,
            type: 'cargo',
            children: [],
          })),
      })),
      ...cargosDiretos.map(c => ({
        id: `cargo-${c.id}-dept-${dept.id}`,
        dbId: c.id,
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
  const agDeptIdsUsados = [...new Set(depts.map(d => d.agrupamento_departamento_id).filter(Boolean))]
  const deptosSemAgrupamento = depts.filter(d => !d.agrupamento_departamento_id)

  const children = [
    ...agDeptIdsUsados.map(agDeptId => {
      const agDept = agrupamentosDepto.find(a => a.id === agDeptId)
      const agDeptDepts = depts.filter(d => d.agrupamento_departamento_id === agDeptId)
      return {
        id: `agdepto-${agDeptId}-area-${areaId}-ag-${agId}`,
        dbId: agDeptId,
        label: agDept?.nome_agrupamento || 'Agrupamento',
        type: 'agrupamento_depto',
        children: agDeptDepts.map(dept => buildDeptNode(dept, areaId, agId, setores, cargos)),
      }
    }),
    ...deptosSemAgrupamento.map(dept => buildDeptNode(dept, areaId, agId, setores, cargos)),
  ]

  // areaId vem do id real de dim_areas quando existe; cai pra um id sintético ("name-..." ou
  // "__sem_area__") quando a área é só um texto solto sem cadastro — nesse caso não tem o que
  // editar, então dbId fica nulo e o lápis simplesmente não abre um registro específico.
  const dbId = typeof areaId === 'string' && (areaId.startsWith('name-') || areaId === '__sem_area__') ? null : areaId

  return {
    id: `area-${areaId}-ag-${agId}`,
    dbId,
    label: areaName,
    type: 'area',
    children,
  }
}

// ── Utilitários de busca/expansão na cascata ─────────────────────────────────
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

// ── Linha conectora do organograma ───────────────────────────────────────────
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

// ── Nó do organograma — clicar abre/fecha os filhos, em cascata ─────────────
function OrgNode({ node, expandedIds, onToggle }) {
  const navigate = useNavigate()
  const isOpen = expandedIds.has(node.id)
  const hasKids = !!node.children?.length
  const { Icon, card } = TIPO[node.type]
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
          {hasKids && (
            <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-white/70">
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
            onClick={(e) => {
              e.stopPropagation()
              navigate(editRoute, node.dbId ? { state: { editarId: node.dbId } } : undefined)
            }}
            title={`Editar ${TIPO[node.type].label}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 shadow-sm"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {isOpen && hasKids && (
        node.children.every(c => c.type === 'cargo') ? (
          // Cargos empilham na vertical em vez de abrir em leque — evita que o organograma
          // fique enorme na horizontal quando um setor/departamento tem muitos cargos.
          <>
            <div className="border-l-2 border-slate-300" style={{ height: 16 }} />
            <div className="flex flex-col items-start gap-1.5 border-l-2 border-slate-300 pl-3">
              {node.children.map(child => (
                <OrgNode key={child.id} node={child} expandedIds={expandedIds} onToggle={onToggle} />
              ))}
            </div>
          </>
        ) : (
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
        )
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function Organograma() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rawData, setRawData] = useState({
    agrupamentos: [], empresas: [], areas: [], agrupamentosDepto: [],
    departamentos: [], setores: [], cargos: [],
  })
  const [agrupamentoId, setAgrupamentoId] = useState('')
  const [search, setSearch] = useState('')
  const [expandedIds, setExpandedIds] = useState(new Set())

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

  const { agrupamentos } = rawData

  // Monta a árvore só do agrupamento selecionado (Agrupamento → Área → Agrup.Depto →
  // Departamento → Setor → Cargo) — o resto da tela só percorre essa estrutura clicando pra
  // abrir/fechar cada nível, como um organograma de verdade.
  const arvore = useMemo(() => {
    if (!agrupamentoId) return null
    const { empresas, areas, agrupamentosDepto, departamentos, setores, cargos } = rawData
    const ag = agrupamentos.find(a => a.id === agrupamentoId)
    if (!ag) return null

    const agEmpresaIds = new Set(
      empresas.filter(e => e.agrupamento_empresa_id === ag.id).map(e => e.id)
    )
    const agDepts = departamentos.filter(d =>
      Array.isArray(d.empresa_ids) && d.empresa_ids.some(eid => agEmpresaIds.has(eid))
    )
    const areaNamesSet = new Set(agDepts.map(d => d.area || '').filter(Boolean))
    const temSemArea = agDepts.some(d => !d.area)

    const areaNodes = [
      ...[...areaNamesSet].sort().map(areaName => {
        const areaObj = areas.find(a => a.nome_area === areaName)
        const areaDepts = agDepts.filter(d => d.area === areaName)
        return buildAreaNode(areaName, areaObj?.id || `name-${areaName}`, ag.id, areaDepts, agrupamentosDepto, setores, cargos)
      }),
      ...(temSemArea ? [
        buildAreaNode('Sem Área', '__sem_area__', ag.id, agDepts.filter(d => !d.area), agrupamentosDepto, setores, cargos)
      ] : []),
    ]

    return {
      id: `ag-${ag.id}`,
      dbId: ag.id,
      label: ag.nome_agrupamento,
      type: 'agrupamento',
      children: areaNodes,
    }
  }, [rawData, agrupamentoId, agrupamentos])

  const arvoreFiltrada = useMemo(() => {
    if (!arvore) return null
    return search ? filterTree(arvore, search) : arvore
  }, [arvore, search])

  // Ao trocar de agrupamento, abre só a raiz. Buscando, expande até os resultados.
  useEffect(() => {
    if (!arvore) return
    if (search) setExpandedIds(new Set(arvoreFiltrada ? getAllExpandableIds(arvoreFiltrada) : []))
    else setExpandedIds(new Set([arvore.id]))
  }, [arvore?.id, search])

  const toggleNode = useCallback((id) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  const onClickCapture = useCallback((e) => {
    if (moved.current) { e.stopPropagation(); moved.current = false }
  }, [])

  if (loading) return <div className="p-8 text-sm text-slate-400">Carregando organograma...</div>
  if (error) return <div className="p-8 text-sm text-red-500">Erro: {error}</div>

  return (
    <div className="flex flex-col h-full">
      {/* ── Cabeçalho ── */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
            <Network className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Organograma</h1>
            <p className="text-xs text-slate-500">Selecione um agrupamento de empresas e clique nas caixas para abrir cada nível.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Agrupamento */}
          <select
            value={agrupamentoId}
            onChange={e => setAgrupamentoId(e.target.value)}
            className="min-w-[240px] px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione o agrupamento de empresas...</option>
            {agrupamentos.map(ag => (
              <option key={ag.id} value={ag.id}>{ag.nome_agrupamento}</option>
            ))}
          </select>

          {arvore && (
            <>
              <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar área, departamento, setor ou cargo..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full min-w-[260px] pl-8 pr-8 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setExpandedIds(new Set(getAllExpandableIds(arvore)))}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                >
                  <ChevronDown className="h-3 w-3" /> Expandir tudo
                </button>
                <button
                  onClick={() => setExpandedIds(new Set([arvore.id]))}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                >
                  <ChevronRight className="h-3 w-3" /> Recolher
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Organograma ── */}
      <div
        ref={panRef}
        className="flex-1 overflow-auto bg-slate-50"
        style={{ cursor: arvore ? 'grab' : 'default' }}
        onMouseDown={arvore ? onMouseDown : undefined}
        onClickCapture={onClickCapture}
      >
        {!arvore ? (
          <p className="text-sm text-slate-400 text-center py-16">Selecione um agrupamento de empresas acima para ver o organograma.</p>
        ) : arvoreFiltrada === null ? (
          <p className="text-sm text-slate-400 text-center py-16">Nenhum resultado para "{search}"</p>
        ) : (
          <div className="inline-flex p-6 pb-10" style={{ minWidth: 'max-content' }}>
            <OrgNode node={arvoreFiltrada} expandedIds={expandedIds} onToggle={toggleNode} />
          </div>
        )}
      </div>
    </div>
  )
}
