import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, Edit2, Trash2, ShieldCheck, ShieldOff, ChevronDown, ChevronRight, Check, Save, ArrowLeft, Copy, Users, X, UserPlus, UserMinus, Search, Eye, Building2 } from 'lucide-react'
import { apiService } from '../services/api'
import { MENU_TREE, getLeafKeys, ALL_LEAF_KEYS } from '../config/menuTree'
import { ACOES_POR_MENU, ACOES_POR_PATH } from '../config/acoesMenu'
import { DIMENSOES_COMISSAO, escopoComissaoTudoLiberado } from '../utils/permissoesComissao'

// Departamento é só informativo — identifica na tabela a qual área do Grupo Caiobá
// cada grupo de acesso pertence. Não interfere em nenhuma permissão.
const DEPARTAMENTOS_GRUPO = ['Vendas', 'Serviços', 'Peças', 'Financeiro', 'RH', 'Contabilidade', 'Controladoria', 'Diretoria', 'Tecnologia', 'Marketing']

// ── Tree checkbox node ────────────────────────────────────────────────────────

function TreeNode({ node, selected, onToggle, disabled, defaultOpen = false, selectedAcoes, onToggleAcao }) {
  const isLeaf = !node.children
  const checkRef = useRef(null)
  const [open, setOpen] = useState(defaultOpen)
  const [acoesOpen, setAcoesOpen] = useState(false)

  const minhasAcoes = isLeaf ? (ACOES_POR_PATH[node.key] || []) : []

  if (isLeaf) {
    return (
      <div>
        <div className={`flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 ${disabled ? 'opacity-50' : ''}`}>
          <label className="flex items-center gap-2 cursor-pointer select-none flex-1 min-w-0">
            <input
              type="checkbox"
              disabled={disabled}
              checked={selected.has(node.key)}
              onChange={(e) => onToggle(node.key, e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0"
            />
            <span className="text-sm text-slate-700">{node.label}</span>
          </label>
          {minhasAcoes.length > 0 && (
            <button
              type="button"
              onClick={() => setAcoesOpen(o => !o)}
              className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                acoesOpen
                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'text-blue-600 border-blue-200 hover:bg-blue-50'
              }`}
            >
              {acoesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Ações ({minhasAcoes.length})
            </button>
          )}
        </div>
        {acoesOpen && minhasAcoes.length > 0 && (
          <div className="ml-8 mt-0.5 mb-1.5 px-3 py-2 bg-blue-50 border border-blue-100 rounded-md space-y-1">
            {minhasAcoes.map(a => (
              <label
                key={a.value}
                className={`flex items-center gap-2 py-0.5 cursor-pointer select-none ${disabled ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={disabled || (selectedAcoes?.has(`${node.key}|${a.value}`) ?? false)}
                  onChange={(e) => onToggleAcao?.(node.key, a.value, e.target.checked)}
                  className="w-3 h-3 rounded accent-blue-600"
                />
                <span className="text-xs text-slate-700">{a.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    )
  }

  const leaves = getLeafKeys(node)
  const checkedCount = leaves.filter(k => selected.has(k)).length
  const allChecked = checkedCount === leaves.length
  const someChecked = checkedCount > 0 && !allChecked

  useEffect(() => {
    if (checkRef.current) {
      checkRef.current.indeterminate = someChecked
    }
  }, [someChecked])

  const handleGroupToggle = () => {
    if (allChecked) {
      leaves.forEach(k => onToggle(k, false))
    } else {
      leaves.forEach(k => onToggle(k, true))
    }
  }

  return (
    <div className="mb-0.5">
      <div className={`flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-50 ${disabled ? 'opacity-50' : ''}`}>
        <input
          ref={checkRef}
          type="checkbox"
          disabled={disabled}
          checked={allChecked}
          onChange={handleGroupToggle}
          className="w-3.5 h-3.5 rounded accent-blue-600"
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex-1 flex items-center gap-1.5 text-left text-sm font-semibold text-slate-800 ml-1"
        >
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
          {node.label}
          <span className="ml-auto text-[11px] font-normal text-slate-400 mr-1">
            {checkedCount}/{leaves.length}
          </span>
        </button>
      </div>
      {open && (
        <div className="ml-6 pl-2 border-l border-slate-200 mt-0.5 mb-1">
          {node.children.map(child => (
            <TreeNode key={child.key} node={child} selected={selected} onToggle={onToggle} disabled={disabled} defaultOpen={defaultOpen} selectedAcoes={selectedAcoes} onToggleAcao={onToggleAcao} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Seletor de dimensão de escopo (Cálculo de Comissões) — Todos ou Individual ────────────

function SeletorDimensaoComissao({ label, escopo, opcoes, disabled, onModoChange, onToggleValor, onSelecionarTodos, onLimpar }) {
  const modo = escopo?.modo || 'TODOS'
  const valores = escopo?.valores || new Set()
  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <div className={`inline-flex rounded-md border border-slate-200 overflow-hidden text-xs font-semibold ${disabled ? 'opacity-50' : ''}`}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModoChange('TODOS')}
            className={`px-2.5 py-1 transition-colors ${modo === 'TODOS' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Todos
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onModoChange('INDIVIDUAL')}
            className={`px-2.5 py-1 border-l border-slate-200 transition-colors ${modo === 'INDIVIDUAL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Individual
          </button>
        </div>
      </div>
      {modo === 'INDIVIDUAL' && !disabled && (
        <>
          {opcoes.length > 0 && (
            <div className="flex items-center gap-2 mb-1.5">
              <button type="button" onClick={onSelecionarTodos} className="text-[11px] text-blue-600 hover:underline">Selecionar todos</button>
              <span className="text-slate-300">|</span>
              <button type="button" onClick={onLimpar} className="text-[11px] text-slate-500 hover:underline">Desmarcar todos</button>
              <span className="ml-auto text-[11px] text-slate-400">{valores.size}/{opcoes.length}</span>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {opcoes.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">Nenhuma opção cadastrada.</p>
            ) : opcoes.map(op => (
              <label key={op.valor} className="flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer hover:bg-slate-50 select-none">
                <input
                  type="checkbox"
                  checked={valores.has(op.valor)}
                  onChange={() => onToggleValor(op.valor)}
                  className="w-3 h-3 rounded accent-blue-600 shrink-0"
                />
                {op.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Grupos() {
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)

  // ─ list form (nome)
  const [showForm, setShowForm] = useSessionState('grp_showform', false)
  const [formData, setFormData] = useSessionState('grp_form', { id: null, nome_grupo: '', departamento: '' })
  const [saving, setSaving] = useState(false)

  // ─ permission editor
  const [editingId, setEditingId] = useSessionState('grp_editid', null)
  const [editingGrupo, setEditingGrupo] = useState(null)
  const [selectedPaths, setSelectedPaths] = useState(new Set())
  const [selectedAcoes, setSelectedAcoes] = useState(new Set()) // "menu_path|acao"
  const [selectedEmpresas, setSelectedEmpresas] = useState(new Set())
  const [empresas, setEmpresas] = useState([])
  const [selectedDeptos, setSelectedDeptos] = useState(new Set()) // Set de nome (string)
  const [deptoTodos, setDeptoTodos] = useState(true) // true = acesso a todos os departamentos
  const [deptosProjetos, setDeptosProjetos] = useState([])
  const [comissaoEscopo, setComissaoEscopo] = useState(escopoComissaoTudoLiberado())
  const [comissaoHabilitado, setComissaoHabilitado] = useState(false)
  const [departamentosComissao, setDepartamentosComissao] = useState([])
  const [setoresComissao, setSetoresComissao] = useState([])
  const [agrupamentosCargoComissao, setAgrupamentosCargoComissao] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [savingPerms, setSavingPerms] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [treeKey, setTreeKey] = useState(0)
  const [treeDefaultOpen, setTreeDefaultOpen] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => { loadGrupos() }, [])

  const loadGrupos = async () => {
    setLoading(true)
    try {
      const [grps, todasPerms, emps, usrs] = await Promise.all([
        apiService.getGrupos(),
        apiService.getAllPermissoesEmpresasGrupos(),
        apiService.getEmpresas(),
        apiService.getUsuarios(),
      ])
      const empsAtivas = emps.filter(e => e.ativo !== false)
      setTodasEmpresas(empsAtivas)
      setSiglasPorGrupo(buildSiglas(todasPerms, empsAtivas))
      setEmpresasPorGrupo(buildEmpresasPorGrupo(todasPerms, empsAtivas))
      setGrupos(grps.sort((a, b) => a.nome_grupo.localeCompare(b.nome_grupo, 'pt-BR')))
      setTodosUsuarios(usrs.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')))
    } catch (err) {
      alert('Erro ao carregar grupos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─ Create / edit group name ───────────────────────────────────────────────

  const openNewForm = () => {
    setFormData({ id: null, nome_grupo: '', departamento: '' })
    setShowForm(true)
  }

  const openEditForm = (grupo) => {
    setFormData({ id: grupo.id, nome_grupo: grupo.nome_grupo, departamento: grupo.departamento || '' })
    setShowForm(true)
  }

  const handleSaveNome = async (e) => {
    e.preventDefault()
    if (!formData.nome_grupo.trim()) return
    setSaving(true)
    try {
      const departamento = formData.departamento || null
      if (formData.id) {
        // Preserva o is_admin atual do grupo — updateGrupo grava esse campo junto, e um
        // default errado aqui reseta silenciosamente o grupo pra não-admin (já causou perda
        // total de acesso numa edição de departamento).
        const isAdminAtual = grupos.find(g => g.id === formData.id)?.is_admin ?? false
        const updated = await apiService.updateGrupo(formData.id, formData.nome_grupo.trim(), isAdminAtual, departamento)
        setGrupos(prev => prev.map(g => g.id === updated.id ? { ...g, nome_grupo: updated.nome_grupo, departamento: updated.departamento } : g).sort((a, b) => a.nome_grupo.localeCompare(b.nome_grupo, 'pt-BR')))
      } else {
        const created = await apiService.createGrupo(formData.nome_grupo.trim(), undefined, departamento)
        setGrupos(prev => [...prev, created].sort((a, b) => a.nome_grupo.localeCompare(b.nome_grupo, 'pt-BR')))
      }
      setShowForm(false)
      setFormData({ id: null, nome_grupo: '', departamento: '' })
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este grupo? Usuários neste grupo perderão seus acessos.')) return
    try {
      await apiService.deleteGrupo(id)
      setGrupos(prev => prev.filter(g => g.id !== id))
      if (editingId === id) setEditingId(null)
    } catch (err) {
      alert('Erro ao excluir: ' + err.message)
    }
  }

  const [duplicando, setDuplicando] = useState(null)
  const [siglasPorGrupo, setSiglasPorGrupo] = useState({})
  const [empresasPorGrupo, setEmpresasPorGrupo] = useState({}) // grupo_id -> [empresa completa]
  const [todasEmpresas, setTodasEmpresas] = useState([])
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [modalUsuarios, setModalUsuarios] = useState(null) // grupo sendo visualizado (membros)
  const [modalVisualizar, setModalVisualizar] = useState(null) // grupo sendo visualizado (resumo)
  const [verTodosUsuarios, setVerTodosUsuarios] = useState(false) // tela geral: todos usuários x grupo
  const [buscaTodosUsuarios, setBuscaTodosUsuarios] = useState('')
  const [salvandoUsuario, setSalvandoUsuario] = useState(null)

  const buildSiglas = (todasPerms, emps) => {
    const mapa = {}
    todasPerms.forEach(({ grupo_id, empresa_id }) => {
      if (!mapa[grupo_id]) mapa[grupo_id] = []
      const emp = emps.find(e => e.id === empresa_id)
      if (emp?.sigla_empresa) mapa[grupo_id].push(emp.sigla_empresa)
    })
    return mapa
  }

  const buildEmpresasPorGrupo = (todasPerms, emps) => {
    const mapa = {}
    todasPerms.forEach(({ grupo_id, empresa_id }) => {
      if (!mapa[grupo_id]) mapa[grupo_id] = []
      const emp = emps.find(e => e.id === empresa_id)
      if (emp) mapa[grupo_id].push(emp)
    })
    return mapa
  }

  const handleMoverUsuario = async (usuario, novoGrupoId) => {
    setSalvandoUsuario(usuario.id)
    try {
      await apiService.updateUsuario(usuario.id, usuario.nome, usuario.email, novoGrupoId)
      setTodosUsuarios(prev => prev.map(u => u.id === usuario.id ? { ...u, grupo_id: novoGrupoId } : u))
    } catch (err) {
      alert('Erro ao alterar grupo do usuário: ' + err.message)
    } finally {
      setSalvandoUsuario(null)
    }
  }

  const handleDuplicar = async (grupo) => {
    setDuplicando(grupo.id)
    try {
      const novoNome = `Cópia de ${grupo.nome_grupo}`
      const novoGrupo = await apiService.createGrupo(novoNome, undefined, grupo.departamento || null)

      const [paths, acoes, empIds, deptoNomes, comissaoEscopoRaw] = await Promise.all([
        apiService.getPermissoesGrupo(grupo.id),
        apiService.getPermissoesGrupoAcoes(grupo.id),
        apiService.getPermissoesEmpresasGrupo(grupo.id),
        apiService.getPermissoesDeptoPorGrupo(grupo.id),
        apiService.getPermissoesComissaoGrupo(grupo.id),
      ])

      await Promise.all([
        apiService.setPermissoesGrupo(novoGrupo.id, { is_admin: grupo.is_admin, paths }),
        apiService.setPermissoesGrupoAcoes(novoGrupo.id, acoes.map(a => ({ menu_path: a.menu_path, acao: a.acao }))),
        apiService.setPermissoesEmpresasGrupo(novoGrupo.id, empIds),
        apiService.setPermissoesDeptoPorGrupo(novoGrupo.id, deptoNomes),
        apiService.setPermissoesComissaoGrupo(novoGrupo.id, comissaoEscopoRaw, comissaoEscopoRaw.habilitado),
      ])

      setGrupos(prev => [...prev, { ...novoGrupo, is_admin: grupo.is_admin }].sort((a, b) => a.nome_grupo.localeCompare(b.nome_grupo, 'pt-BR')))
      setSiglasPorGrupo(prev => ({
        ...prev,
        [novoGrupo.id]: empIds.map(id => todasEmpresas.find(e => e.id === id)?.sigla_empresa).filter(Boolean),
      }))
    } catch (err) {
      alert('Erro ao duplicar grupo: ' + err.message)
    } finally {
      setDuplicando(null)
    }
  }

  // ─ Permission editor ───────────────────────────────────────────────────────

  const openPermissoes = async (grupo) => {
    setEditingId(grupo.id)
    setEditingGrupo(grupo)
    setIsAdmin(!!grupo.is_admin)
    setLoadingPerms(true)
    setSaveSuccess(false)
    setTreeDefaultOpen(false)
    setTreeKey(k => k + 1)
    try {
      const [paths, acoes, empIds, emps, deptoNomes, deptos, deptosDim, setoresDim, agrupCargos, comissaoEscopoRaw] = await Promise.all([
        apiService.getPermissoesGrupo(grupo.id),
        apiService.getPermissoesGrupoAcoes(grupo.id),
        apiService.getPermissoesEmpresasGrupo(grupo.id),
        apiService.getEmpresas(),
        apiService.getPermissoesDeptoPorGrupo(grupo.id),
        apiService.getProjDepartamentos(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getAgrupamentoCargos(),
        apiService.getPermissoesComissaoGrupo(grupo.id),
      ])
      setSelectedPaths(new Set(paths))
      setSelectedAcoes(new Set(acoes.map(a => `${a.menu_path}|${a.acao}`)))
      setSelectedEmpresas(new Set(empIds))
      setEmpresas(emps.filter(e => e.ativo !== false).sort((a, b) => (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR')))
      setSelectedDeptos(new Set(deptoNomes))
      setDeptoTodos(deptoNomes.length === 0)
      setDeptosProjetos(deptos.filter(d => d.ativo !== false))
      setDepartamentosComissao(deptosDim.filter(d => d.ativo !== false))
      setSetoresComissao(setoresDim.filter(s => s.ativo !== false))
      setAgrupamentosCargoComissao(agrupCargos.filter(a => a.ativo !== false))
      setComissaoEscopo(Object.fromEntries(DIMENSOES_COMISSAO.map(dim => [
        dim,
        { modo: comissaoEscopoRaw[dim]?.modo === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'TODOS', valores: new Set(comissaoEscopoRaw[dim]?.valores || []) },
      ])))
      setComissaoHabilitado(!!comissaoEscopoRaw.habilitado)
    } catch (err) {
      alert('Erro ao carregar permissões: ' + err.message)
      setSelectedPaths(new Set())
      setSelectedAcoes(new Set())
      setSelectedEmpresas(new Set())
      setSelectedDeptos(new Set())
      setComissaoEscopo(escopoComissaoTudoLiberado())
      setComissaoHabilitado(false)
    } finally {
      setLoadingPerms(false)
    }
  }

  const handleToggle = useCallback((path, value) => {
    setSelectedPaths(prev => {
      const next = new Set(prev)
      if (value) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  const handleSelectAll = () => setSelectedPaths(new Set(ALL_LEAF_KEYS))
  const handleClearAll = () => setSelectedPaths(new Set())

  const handleToggleAcao = (menuPath, acao, value) => {
    setSelectedAcoes(prev => {
      const next = new Set(prev)
      const chave = `${menuPath}|${acao}`
      if (value) next.add(chave)
      else next.delete(chave)
      return next
    })
  }

  const handleToggleEmpresa = (empresaId, value) => {
    setSelectedEmpresas(prev => {
      const next = new Set(prev)
      if (value) next.add(empresaId)
      else next.delete(empresaId)
      return next
    })
  }
  const handleSelectAllEmpresas = () => setSelectedEmpresas(new Set(empresas.map(e => e.id)))
  const handleClearAllEmpresas = () => setSelectedEmpresas(new Set())

  const handleToggleDepto = (nome, value) => {
    setSelectedDeptos(prev => {
      const next = new Set(prev)
      if (value) next.add(nome)
      else next.delete(nome)
      return next
    })
  }
  const handleSelectAllDeptos = () => setSelectedDeptos(new Set(deptosProjetos.map(d => d.nome)))
  const handleClearAllDeptos = () => setSelectedDeptos(new Set())

  const handleComissaoModoChange = (dim, modo) => {
    setComissaoEscopo(prev => ({ ...prev, [dim]: { ...prev[dim], modo } }))
  }
  const handleComissaoToggleValor = (dim, valor) => {
    setComissaoEscopo(prev => {
      const atual = new Set(prev[dim]?.valores)
      if (atual.has(valor)) atual.delete(valor)
      else atual.add(valor)
      return { ...prev, [dim]: { ...prev[dim], valores: atual } }
    })
  }
  const handleComissaoSelecionarTodos = (dim, opcoes) => {
    setComissaoEscopo(prev => ({ ...prev, [dim]: { ...prev[dim], valores: new Set(opcoes.map(o => o.valor)) } }))
  }
  const handleComissaoLimpar = (dim) => {
    setComissaoEscopo(prev => ({ ...prev, [dim]: { ...prev[dim], valores: new Set() } }))
  }

  const handleSavePerms = async () => {
    setSavingPerms(true)
    setSaveSuccess(false)
    try {
      await Promise.all([
        apiService.setPermissoesGrupo(editingId, {
          is_admin: isAdmin,
          paths: isAdmin ? [] : [...selectedPaths],
        }),
        apiService.setPermissoesGrupoAcoes(editingId, isAdmin ? [] : [...selectedAcoes].map(chave => {
          const [menu_path, acao] = chave.split('|')
          return { menu_path, acao }
        })),
        apiService.setPermissoesEmpresasGrupo(editingId, isAdmin ? [] : [...selectedEmpresas]),
        apiService.setPermissoesDeptoPorGrupo(editingId, isAdmin ? [] : [...selectedDeptos]),
        apiService.setPermissoesComissaoGrupo(editingId, Object.fromEntries(DIMENSOES_COMISSAO.map(dim => [
          dim,
          isAdmin
            ? { modo: 'TODOS', valores: [] }
            : { modo: comissaoEscopo[dim]?.modo || 'TODOS', valores: [...(comissaoEscopo[dim]?.valores || [])] },
        ])), comissaoHabilitado),
      ])
      setGrupos(prev => prev.map(g => g.id === editingId ? { ...g, is_admin: isAdmin } : g))
      setSiglasPorGrupo(prev => ({
        ...prev,
        [editingId]: isAdmin ? [] : [...selectedEmpresas].map(id => todasEmpresas.find(e => e.id === id)?.sigla_empresa).filter(Boolean),
      }))
      setEditingId(null)
    } catch (err) {
      alert('Erro ao salvar permissões: ' + err.message)
    } finally {
      setSavingPerms(false)
    }
  }

  // ─ Render: todos os usuários × grupo ────────────────────────────────────────

  if (verTodosUsuarios) {
    const q = buscaTodosUsuarios.trim().toLowerCase()
    const linhas = todosUsuarios
      .map(u => ({ ...u, grupoNome: grupos.find(g => g.id === u.grupo_id)?.nome_grupo || null }))
      .filter(u => !q ||
        (u.nome || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.grupoNome || '').toLowerCase().includes(q)
      )

    return (
      <div className="p-6 max-w-screen-xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => { setVerTodosUsuarios(false); setBuscaTodosUsuarios('') }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Grupos
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">Todos os Usuários</span>
        </div>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Todos os Usuários</h1>
            <p className="text-sm text-slate-500 mt-0.5">{todosUsuarios.length} usuário(s) cadastrado(s)</p>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou grupo..."
              value={buscaTodosUsuarios}
              onChange={e => setBuscaTodosUsuarios(e.target.value)}
              autoFocus
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-72"
            />
            {buscaTodosUsuarios && (
              <button onClick={() => setBuscaTodosUsuarios('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">E-mail</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Grupo de Acesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">
                    {q ? `Nenhum usuário encontrado para "${buscaTodosUsuarios}".` : 'Nenhum usuário cadastrado.'}
                  </td>
                </tr>
              )}
              {linhas.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{u.nome || '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{u.email}</td>
                  <td className="px-5 py-3">
                    {u.grupoNome ? (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                        {u.grupoNome}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Sem grupo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ─ Render: permission editor ───────────────────────────────────────────────

  if (editingId) {
    const totalChecked = isAdmin ? ALL_LEAF_KEYS.length : selectedPaths.size
    return (
      <div className="p-6 max-w-3xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            onClick={() => setEditingId(null)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Grupos
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800">{editingGrupo?.nome_grupo}</span>
        </div>

        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          {/* header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Permissões de Acesso</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalChecked} de {ALL_LEAF_KEYS.length} páginas habilitadas
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check className="h-3.5 w-3.5" /> Salvo
                </span>
              )}
              <button
                onClick={handleSavePerms}
                disabled={savingPerms || loadingPerms}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                {savingPerms ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* is_admin toggle */}
          <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800">Acesso Administrador</p>
              <p className="text-xs text-amber-600">Quando ativo, o grupo tem acesso total a todos os menus automaticamente.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdmin(v => !v)}
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                isAdmin ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                isAdmin ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* tree area */}
          {loadingPerms ? (
            <div className="p-8 text-center text-sm text-slate-400">Carregando permissões...</div>
          ) : (
            <>
              <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
                {!isAdmin && (
                  <>
                    <button type="button" onClick={handleSelectAll} className="text-xs text-blue-600 hover:underline">
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleClearAll} className="text-xs text-slate-500 hover:underline">
                      Desmarcar todos
                    </button>
                    <span className="text-slate-300">|</span>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => { setTreeDefaultOpen(true); setTreeKey(k => k + 1) }}
                  className="text-xs text-slate-600 hover:underline flex items-center gap-1"
                >
                  <ChevronDown className="h-3 w-3" /> Expandir todos
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => { setTreeDefaultOpen(false); setTreeKey(k => k + 1) }}
                  className="text-xs text-slate-600 hover:underline flex items-center gap-1"
                >
                  <ChevronRight className="h-3 w-3" /> Recolher todos
                </button>
              </div>
              <div className="p-4 space-y-1">
                {MENU_TREE.map(node => (
                  <TreeNode
                    key={`${node.key}-${treeKey}`}
                    node={node}
                    selected={isAdmin ? new Set(ALL_LEAF_KEYS) : selectedPaths}
                    onToggle={handleToggle}
                    disabled={isAdmin}
                    defaultOpen={treeDefaultOpen}
                    selectedAcoes={selectedAcoes}
                    onToggleAcao={handleToggleAcao}
                  />
                ))}
              </div>
            </>
          )}
        </div>

      {/* ── Acesso por Empresa ── */}
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Acesso por Empresa</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define quais empresas este grupo pode visualizar em todos os módulos do sistema (Garantias DAF, Projetos, Cálculo de Comissões DAF, etc.).
            {isAdmin && <span className="ml-1 text-amber-600 font-medium">Administrador tem acesso a todas as empresas automaticamente.</span>}
          </p>
        </div>
        {loadingPerms ? null : (
          <>
            {!isAdmin && empresas.length > 0 && (
              <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2">
                <button type="button" onClick={handleSelectAllEmpresas} className="text-xs text-blue-600 hover:underline">
                  Selecionar todas
                </button>
                <span className="text-slate-300">|</span>
                <button type="button" onClick={handleClearAllEmpresas} className="text-xs text-slate-500 hover:underline">
                  Desmarcar todas
                </button>
                <span className="ml-auto text-xs text-slate-400">
                  {selectedEmpresas.size}/{empresas.length} empresas
                </span>
              </div>
            )}
            <div className="p-4 flex flex-col gap-0.5">
              {empresas.map(empresa => (
                <label
                  key={empresa.id}
                  className={`flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-50 select-none ${isAdmin ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    disabled={isAdmin}
                    checked={isAdmin || selectedEmpresas.has(empresa.id)}
                    onChange={(e) => handleToggleEmpresa(empresa.id, e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-blue-600"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-800 font-medium leading-tight">{empresa.nome_empresa}</span>
                    {empresa.sigla_empresa && (
                      <span className="text-xs text-slate-400">{empresa.sigla_empresa}</span>
                    )}
                  </div>
                </label>
              ))}
              {empresas.length === 0 && (
                <p className="text-sm text-slate-400 col-span-3 py-2">
                  Nenhuma empresa cadastrada. Cadastre em Cadastro de Tabelas → Empresas.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Acesso por Departamento (Projetos) ── */}
      {!loadingPerms && (isAdmin || [...selectedPaths].some(p => p.startsWith('projetos'))) && (
      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mt-4">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Acesso por Departamento (Projetos)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define quais departamentos este grupo pode visualizar nos módulos de Projetos.
            Com "Todos os Departamentos" ativo, o botão de visão geral não é exibido na tela de Projetos.
          </p>
        </div>
        {loadingPerms ? null : (
          <>
            {/* Toggle "Todos os Departamentos" */}
            {!isAdmin && (
              <div className="px-5 py-3 border-b border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div
                    onClick={() => {
                      if (!deptoTodos) { setDeptoTodos(true); setSelectedDeptos(new Set()) }
                      else { setDeptoTodos(false) }
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${deptoTodos ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${deptoTodos ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className={`text-sm font-semibold ${deptoTodos ? 'text-blue-700' : 'text-slate-600'}`}>
                    Todos os Departamentos
                  </span>
                  {deptoTodos && (
                    <span className="text-[11px] text-blue-500 font-medium">— acesso irrestrito, sem necessidade de seleção individual</span>
                  )}
                </label>
              </div>
            )}

            {/* Lista individual — visível apenas quando não está em modo "todos" */}
            {!isAdmin && !deptoTodos && (
              <>
                {deptosProjetos.length > 0 && (
                  <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-2">
                    <button type="button" onClick={handleSelectAllDeptos} className="text-xs text-blue-600 hover:underline">
                      Selecionar todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={handleClearAllDeptos} className="text-xs text-slate-500 hover:underline">
                      Desmarcar todos
                    </button>
                    <span className="ml-auto text-xs text-slate-400">
                      {selectedDeptos.size === 0 ? 'Nenhum selecionado' : `${selectedDeptos.size}/${deptosProjetos.length} departamentos`}
                    </span>
                  </div>
                )}
                <div className="p-4 flex flex-col gap-0.5">
                  {deptosProjetos.map(depto => (
                    <label key={depto.id} className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer hover:bg-slate-50 select-none">
                      <input
                        type="checkbox"
                        checked={selectedDeptos.has(depto.nome)}
                        onChange={(e) => handleToggleDepto(depto.nome, e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-blue-600"
                      />
                      <span className="text-sm text-slate-800">{depto.nome}</span>
                    </label>
                  ))}
                  {deptosProjetos.length === 0 && (
                    <p className="text-sm text-slate-400 py-2">
                      Nenhum departamento cadastrado. Cadastre em Projetos → Departamentos.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Admin sempre vê tudo */}
            {isAdmin && (
              <div className="px-5 py-3 text-xs text-amber-600 font-medium">
                Administrador vê todos os departamentos automaticamente.
              </div>
            )}
          </>
        )}
      </div>
      )}

      {/* ── Acesso à Cálculo de Comissões ── */}
      {!loadingPerms && (isAdmin || [...selectedPaths].some(p => p.startsWith('calculo-comissoes'))) && (() => {
        const opcoesDepartamento = departamentosComissao.map(d => ({
          valor: d.id,
          label: d.area
            ? <>{d.nome_departamento} <em className="italic text-slate-400 font-normal">({d.area})</em></>
            : d.nome_departamento,
        }))
        const opcoesSetor = setoresComissao.map(s => ({ valor: s.id, label: s.nome_setor }))
        const opcoesAgrupamentoCargo = agrupamentosCargoComissao.map(a => ({ valor: a.id, label: a.nome_agrupamento_cargo }))
        const opcoesArea = [...new Set(departamentosComissao.map(d => d.area).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, 'pt-BR'))
          .map(a => ({ valor: a, label: a }))
        return (
          <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden mt-4">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Acesso à Cálculo de Comissões DAF</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Restringe quais funcionários este grupo pode ver/calcular em Cálculo de Comissões DAF e Histórico de Comissões,
                  por Área, Departamento, Setor e Agrupamento de Cargos. "Todos" não restringe; "Individual" libera
                  só os valores marcados. A restrição por Empresa é definida em <strong>Acesso por Empresa</strong> acima.
                  {isAdmin && <span className="block mt-1 text-amber-600 font-medium">Administrador vê tudo automaticamente.</span>}
                  {!isAdmin && !comissaoHabilitado && (
                    <span className="block mt-1 text-red-600 font-medium">Desabilitado: este grupo não enxerga nenhum funcionário — só acessa a tela.</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <button
                  type="button"
                  disabled={isAdmin}
                  onClick={() => setComissaoHabilitado(v => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                    comissaoHabilitado ? 'bg-blue-600' : 'bg-slate-300'
                  } ${isAdmin ? 'opacity-50' : ''}`}
                >
                  <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                    comissaoHabilitado ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
                <span className="text-[11px] font-semibold text-slate-500">{comissaoHabilitado ? 'Habilitado' : 'Desabilitado'}</span>
              </div>
            </div>
            {(isAdmin || comissaoHabilitado) && (
            <div className="px-5 py-1 divide-y divide-slate-100">
              <SeletorDimensaoComissao
                label="Área" escopo={comissaoEscopo.area} opcoes={opcoesArea} disabled={isAdmin}
                onModoChange={m => handleComissaoModoChange('area', m)}
                onToggleValor={v => handleComissaoToggleValor('area', v)}
                onSelecionarTodos={() => handleComissaoSelecionarTodos('area', opcoesArea)}
                onLimpar={() => handleComissaoLimpar('area')}
              />
              <SeletorDimensaoComissao
                label="Departamento" escopo={comissaoEscopo.departamento} opcoes={opcoesDepartamento} disabled={isAdmin}
                onModoChange={m => handleComissaoModoChange('departamento', m)}
                onToggleValor={v => handleComissaoToggleValor('departamento', v)}
                onSelecionarTodos={() => handleComissaoSelecionarTodos('departamento', opcoesDepartamento)}
                onLimpar={() => handleComissaoLimpar('departamento')}
              />
              <SeletorDimensaoComissao
                label="Setor" escopo={comissaoEscopo.setor} opcoes={opcoesSetor} disabled={isAdmin}
                onModoChange={m => handleComissaoModoChange('setor', m)}
                onToggleValor={v => handleComissaoToggleValor('setor', v)}
                onSelecionarTodos={() => handleComissaoSelecionarTodos('setor', opcoesSetor)}
                onLimpar={() => handleComissaoLimpar('setor')}
              />
              <SeletorDimensaoComissao
                label="Agrupamento de Cargos" escopo={comissaoEscopo.agrupamento_cargo} opcoes={opcoesAgrupamentoCargo} disabled={isAdmin}
                onModoChange={m => handleComissaoModoChange('agrupamento_cargo', m)}
                onToggleValor={v => handleComissaoToggleValor('agrupamento_cargo', v)}
                onSelecionarTodos={() => handleComissaoSelecionarTodos('agrupamento_cargo', opcoesAgrupamentoCargo)}
                onLimpar={() => handleComissaoLimpar('agrupamento_cargo')}
              />
            </div>
            )}
          </div>
        )
      })()}
    </div>
    )
  }

  // ─ Render: group list ──────────────────────────────────────────────────────

  const gruposFiltrados = busca.trim()
    ? grupos.filter(g => {
        const termo = busca.toLowerCase()
        const siglas = (siglasPorGrupo[g.id] || []).join(' ').toLowerCase()
        const tipo = g.is_admin ? 'administrador' : 'personalizado'
        const qtdUsuarios = String(todosUsuarios.filter(u => u.grupo_id === g.id).length)
        return (
          g.nome_grupo.toLowerCase().includes(termo) ||
          tipo.includes(termo) ||
          siglas.includes(termo) ||
          qtdUsuarios.includes(termo) ||
          (g.departamento || '').toLowerCase().includes(termo)
        )
      })
    : grupos

  return (
    <div className="p-6 max-w-screen-xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Grupos de Acessos</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar em todas as colunas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setVerTodosUsuarios(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 text-sm font-medium"
          >
            <Users className="h-4 w-4" />
            Ver Todos os Usuários
          </button>
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Novo Grupo
          </button>
        </div>
      </div>

      {/* form */}
      {showForm && (
        <div className="bg-white p-5 rounded-lg shadow mb-6 border border-slate-200">
          <h2 className="text-base font-semibold mb-4">{formData.id ? 'Renomear' : 'Novo'} Grupo</h2>
          <form onSubmit={handleSaveNome} className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do grupo (ex: Admin, Vendas, Pós-Vendas)"
              value={formData.nome_grupo}
              onChange={(e) => setFormData(d => ({ ...d, nome_grupo: e.target.value }))}
              required
              autoFocus
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <select
              value={formData.departamento}
              onChange={(e) => setFormData(d => ({ ...d, departamento: e.target.value }))}
              className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            >
              <option value="">— Departamento —</option>
              {DEPARTAMENTOS_GRUPO.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* list */}
      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : grupos.length === 0 ? (
        <div className="bg-white rounded-lg shadow border border-slate-200 p-10 text-center">
          <ShieldOff className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Nenhum grupo cadastrado.</p>
          <p className="text-xs text-slate-400 mt-1">Crie um grupo e configure as permissões de acesso.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome do Grupo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Departamento</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Usuários</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gruposFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">
                    Nenhum grupo encontrado para "{busca}".
                  </td>
                </tr>
              )}
              {gruposFiltrados.map(g => (
                <tr key={g.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 whitespace-nowrap">{g.nome_grupo}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {g.departamento || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    {g.is_admin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <ShieldCheck className="h-3 w-3" /> Administrador
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                        Personalizado
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {(() => {
                      const qtd = todosUsuarios.filter(u => u.grupo_id === g.id).length
                      return (
                        <button
                          onClick={() => setModalUsuarios(g)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                            qtd > 0 ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <Users className="h-3 w-3" />
                          {qtd}
                        </button>
                      )
                    })()}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setModalVisualizar(g)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Visualizar grupo"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openPermissoes(g)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Permissões
                      </button>
                      <button
                        onClick={() => handleDuplicar(g)}
                        disabled={duplicando === g.id}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-40"
                        title="Duplicar grupo (copia todas as permissões)"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => openEditForm(g)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Renomear grupo"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Excluir grupo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL VISUALIZAR GRUPO ── */}
      {modalVisualizar && (
        <ModalVisualizarGrupo
          g={modalVisualizar}
          qtdUsuarios={todosUsuarios.filter(u => u.grupo_id === modalVisualizar.id).length}
          empresas={empresasPorGrupo[modalVisualizar.id] || []}
          onVerUsuarios={() => { setModalVisualizar(null); setModalUsuarios(modalVisualizar) }}
          onEditarPermissoes={() => { setModalVisualizar(null); openPermissoes(modalVisualizar) }}
          onClose={() => setModalVisualizar(null)}
        />
      )}

      {/* ── MODAL USUÁRIOS DO GRUPO ── */}
      {modalUsuarios && (() => {
        const g = modalUsuarios
        const membros = todosUsuarios.filter(u => u.grupo_id === g.id)
        const outros = todosUsuarios.filter(u => u.grupo_id !== g.id)
        return (
          // eslint-disable-next-line react/display-name
          <ModalUsuarios
            g={g}
            membros={membros}
            outros={outros}
            grupos={grupos}
            salvandoUsuario={salvandoUsuario}
            onMover={handleMoverUsuario}
            onClose={() => setModalUsuarios(null)}
          />
        )
      })()}
    </div>
  )
}

function ModalVisualizarGrupo({ g, qtdUsuarios, empresas, onVerUsuarios, onEditarPermissoes, onClose }) {
  const empresasOrdenadas = [...empresas].sort((a, b) => (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR'))
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[480px] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-500" /> Visualizar Grupo
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Grupo</span>
            <span className="text-sm font-semibold text-slate-800">{g.nome_grupo}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Departamento</span>
            <span className="text-sm font-semibold text-slate-800">{g.departamento || '—'}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo</span>
            {g.is_admin ? (
              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <ShieldCheck className="h-3 w-3" /> Administrador
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                Personalizado
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usuários no Grupo</span>
            <button
              onClick={onVerUsuarios}
              className="inline-flex items-center gap-1.5 w-fit px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
            >
              <Users className="h-3 w-3" /> {qtdUsuarios} usuário(s) — ver lista
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Acesso por Empresa</span>
            {g.is_admin ? (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md w-fit">
                Todas as empresas (Administrador)
              </span>
            ) : empresasOrdenadas.length === 0 ? (
              <span className="text-xs text-slate-400">Nenhuma empresa liberada.</span>
            ) : (
              <div className="flex flex-col gap-1">
                {empresasOrdenadas.map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5">
                    <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="font-medium">{emp.nome_empresa}</span>
                    {emp.sigla_empresa && <span className="ml-auto text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">{emp.sigla_empresa}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
          <button
            onClick={onEditarPermissoes}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Editar Permissões
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalUsuarios({ g, membros, outros, grupos, salvandoUsuario, onMover, onClose }) {
  const [busca, setBusca] = useState('')
  const q = busca.trim().toLowerCase()
  const membrosVisiveis = q ? membros.filter(u => (u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) : membros
  const outrosVisiveis = q ? outros.filter(u => (u.nome || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)) : outros
  return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl border border-slate-200 w-[500px] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" /> Usuários — {g.nome_grupo}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{membros.length} usuário(s) neste grupo</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* busca */}
          <div className="px-5 py-3 border-b border-slate-100 shrink-0">
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              autoFocus
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-5 pt-4 pb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                No grupo {q && membrosVisiveis.length !== membros.length && <span className="normal-case font-normal">({membrosVisiveis.length} de {membros.length})</span>}
              </p>
              {membrosVisiveis.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">{q ? 'Nenhum membro encontrado.' : 'Nenhum usuário neste grupo.'}</p>
              ) : (
                <div className="space-y-1">
                  {membrosVisiveis.map(u => (
                    <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-bold text-white uppercase">{(u.nome || u.email || '?').charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{u.nome || '—'}</p>
                        <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => onMover(u, null)}
                        disabled={salvandoUsuario === u.id}
                        title="Remover do grupo"
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {outros.length > 0 && (
              <div className="px-5 pt-3 pb-4 border-t border-slate-100 mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                  Outros usuários {q && outrosVisiveis.length !== outros.length && <span className="normal-case font-normal">({outrosVisiveis.length} de {outros.length})</span>}
                </p>
                {outrosVisiveis.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">Nenhum usuário encontrado.</p>
                ) : (
                  <div className="space-y-1">
                    {outrosVisiveis.map(u => {
                      const grupoAtual = grupos.find(gr => gr.id === u.grupo_id)
                      return (
                        <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-bold text-white uppercase">{(u.nome || u.email || '?').charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate">{u.nome || '—'}</p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {u.email}
                              {grupoAtual && <span className="ml-1 text-slate-300">· {grupoAtual.nome_grupo}</span>}
                            </p>
                          </div>
                          <button
                            onClick={() => onMover(u, g.id)}
                            disabled={salvandoUsuario === u.id}
                            title="Adicionar a este grupo"
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-40"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end px-5 py-3 bg-slate-50 border-t border-slate-100 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
  )
}
