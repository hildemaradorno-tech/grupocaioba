import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Search, Users, ClipboardList, Grid3x3, Check, SlidersHorizontal, ChevronDown, ChevronUp, FileDown, Pencil, Trash2, ArrowUp, ArrowDown, ArrowUpDown, Tags, Network } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import OrganogramaTreinamentos from './OrganogramaTreinamentos'

const cmpTexto = (a, b) => (a || '').localeCompare(b || '')

// Cargos de uma linha da Matriz (curso), com nome resolvido e ordenados:
// obrigatórios primeiro, depois sugeridos, cada grupo em ordem alfabética.
const cargosDoCursoPDF = (row, colNome) =>
  Object.entries(row.flags)
    .map(([cargoId, obrigatorio]) => ({ id: cargoId, nome: colNome[cargoId] || '—', obrigatorio }))
    .sort((a, b) => (b.obrigatorio - a.obrigatorio) || cmpTexto(a.nome, b.nome))

// Traduz erros do Postgres/Supabase para mensagens amigáveis
const msgErro = (err, entidade = 'registro') => {
  const m = err?.message || String(err)
  if (err?.code === '23505' || m.includes('duplicate key')) return `Este ${entidade} já se encontra cadastrado.`
  return m
}

function ErroForm({ children }) {
  if (!children) return null
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-2.5 py-2 text-[11px] font-semibold">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </div>
  )
}

function ThSort({ label, col, sort, onSort, center, className = '' }) {
  const ativo = sort.col === col
  const Icon = ativo ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`px-3 py-2 whitespace-nowrap ${center ? 'text-center' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        title="Ordenar"
        className={`inline-flex items-center gap-1 uppercase tracking-wider text-[11px] font-semibold transition-colors ${ativo ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {label} <Icon className={`h-3 w-3 shrink-0 ${ativo ? '' : 'opacity-50'}`} />
      </button>
    </th>
  )
}

const _cache = { cursos: null, categorias: null, sistemas: null, cargos: null }

export default function GradeTreinamentos() {
  const [cursos, setCursos] = useState(() => _cache.cursos ?? [])
  const [categorias, setCategorias] = useState(() => _cache.categorias ?? [])
  const [sistemas, setSistemas] = useState(() => _cache.sistemas ?? [])
  // cargos = árvore importada do Organograma (trein_organograma), não mais
  // dim_cargos — ver Organograma de Treinamentos. Campos: id, nome, pai_id,
  // headcount (supervisor_nome existe mas não é usado aqui).
  const [cargos, setCargos] = useState(() => _cache.cargos ?? [])
  const [loading, setLoading] = useState(() => _cache.cursos === null)
  const [error, setError] = useState(null)

  const [visualizacao, setVisualizacao] = useSessionState('trein_grade_visualizacao', 'cargo')
  const [filtroCategoria, setFiltroCategoria] = useSessionState('trein_grade_filtro_categoria', '')
  const [filtroSistema, setFiltroSistema] = useSessionState('trein_grade_filtro_sistema', '')
  // Filtro por Empresa = raiz da árvore do cargo (Holding/Caiobá Trucks/Caiobá
  // Honda), substitui o antigo Agrupamento de Cargos (que dependia de dim_cargos).
  const [filtroEmpresaCargo, setFiltroEmpresaCargo] = useSessionState('trein_grade_filtro_empresa_cargo', '')
  const [filtrosAvancados, setFiltrosAvancados] = useState(false)
  const [filtroCurso, setFiltroCurso] = useSessionState('trein_grade_filtro_curso', '')
  const [filtroCargoMatriz, setFiltroCargoMatriz] = useSessionState('trein_grade_filtro_cargo_matriz', '')
  const [busca, setBusca] = useSessionState('trein_grade_busca', '')
  const [sortCargo, setSortCargo] = useSessionState('trein_grade_sort_cargo', { col: 'cargo', dir: 'asc' })
  const [sortCurso, setSortCurso] = useSessionState('trein_grade_sort_curso', { col: 'nome', dir: 'asc' })

  const toggleSort = (setter) => (col) =>
    setter(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  const toggleSortCargo = toggleSort(setSortCargo)
  const toggleSortCurso = toggleSort(setSortCurso)

  // Modal curso
  const [modalAberto, setModalAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  // cargoSel: { cargoId: 'OBR' | 'SUG' } — obrigatório ou sugerido (exclusivos)
  const [form, setForm] = useState({ nome: '', categoria_id: '', sistema_id: '', ativo: true, cargoSel: {} })
  const [buscaCargoModal, setBuscaCargoModal] = useState('')
  const [filtroEmpresaCargoModal, setFiltroEmpresaCargoModal] = useState('')
  const [filtroTipoCargoModal, setFiltroTipoCargoModal] = useState('') // '' | 'OBR' | 'SUG'
  const [salvando, setSalvando] = useState(false)
  const [erroCurso, setErroCurso] = useState(null)

  // Quick-add de categoria dentro do modal de curso
  const [novaCategoriaAberta, setNovaCategoriaAberta] = useState(false)
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [criandoCategoria, setCriandoCategoria] = useState(false)
  const [erroCategoria, setErroCategoria] = useState(null)

  // Quick-add de sistema dentro do modal de curso (mesmo padrão de categoria)
  const [novoSistemaAberto, setNovoSistemaAberto] = useState(false)
  const [novoSistemaNome, setNovoSistemaNome] = useState('')
  const [criandoSistema, setCriandoSistema] = useState(false)
  const [erroSistema, setErroSistema] = useState(null)

  // Modal "Gerenciar Categorias" (lista com editar/excluir + nova categoria)
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)
  const [categoriaEditId, setCategoriaEditId] = useState(null)
  const [categoriaEditNome, setCategoriaEditNome] = useState('')
  const [salvandoCategoriaEdit, setSalvandoCategoriaEdit] = useState(false)
  const [erroCategoriaEdit, setErroCategoriaEdit] = useState(null)
  const [novaCategoriaGerenciarNome, setNovaCategoriaGerenciarNome] = useState('')
  const [criandoCategoriaGerenciar, setCriandoCategoriaGerenciar] = useState(false)
  const [erroCategoriaGerenciar, setErroCategoriaGerenciar] = useState(null)
  const [categoriaExcluir, setCategoriaExcluir] = useState(null)
  const [modalExcluirCategoriaAberto, setModalExcluirCategoriaAberto] = useState(false)

  // Exclusão de curso
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [cursoExcluir, setCursoExcluir] = useState(null)

  // Expandir curso (aba Cursos): mostra empresas/departamentos/cargos
  const [cursosExpandidos, setCursosExpandidos] = useState(() => new Set())
  const toggleCursoExpandido = (id) => setCursosExpandidos(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [pdfMenuAberto, setPdfMenuAberto] = useState(false)

  // Modal "Cursos do Cargo" (checkboxes, aberto ao clicar no cargo em Por Cargo)
  const [modalCargoAberto, setModalCargoAberto] = useState(false)
  const [cargoModal, setCargoModal] = useState(null)
  const [cursoIdsCargo, setCursoIdsCargo] = useState(() => new Set())
  const [buscaCursoDoCargo, setBuscaCursoDoCargo] = useState('')
  const [salvandoCargoCursos, setSalvandoCargoCursos] = useState(false)
  const [erroCargoCursos, setErroCargoCursos] = useState(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('treinamentos/grade')

  useEffect(() => { loadDados(_cache.cursos !== null) }, [])
  useEffect(() => { _cache.cursos = cursos }, [cursos])
  useEffect(() => { _cache.categorias = categorias }, [categorias])
  useEffect(() => { _cache.sistemas = sistemas }, [sistemas])
  useEffect(() => { _cache.cargos = cargos }, [cargos])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const [cur, cat, sis, carg] = await Promise.all([
        apiService.getTreinCursos(),
        apiService.getTreinCategorias(),
        apiService.getTreinSistemas(),
        apiService.getTreinOrganograma(),
      ])
      setCursos(cur)
      setCategorias(cat.filter(c => c.ativo))
      setSistemas(sis.filter(s => s.ativo))
      setCargos(carg.filter(c => c.ativo !== false).sort((a, b) => cmpTexto(a.nome, b.nome)))
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // ── Cadastro de curso ───────────────────────────────────────────────────────
  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ nome: '', categoria_id: '', sistema_id: '', ativo: true, cargoSel: {} })
    setBuscaCargoModal('')
    setFiltroEmpresaCargoModal('')
    setFiltroTipoCargoModal('')
    setNovaCategoriaAberta(false)
    setNovaCategoriaNome('')
    setNovoSistemaAberto(false)
    setNovoSistemaNome('')
    setErroCurso(null)
    setErroCategoria(null)
    setErroSistema(null)
    setModalAberto(true)
  }

  const abrirEditar = (curso) => {
    setEditingId(curso.id)
    setForm({
      nome: curso.nome || '',
      categoria_id: curso.categoria_id || '',
      sistema_id: curso.sistema_id || '',
      ativo: curso.ativo,
      cargoSel: Object.fromEntries((curso.cargos || []).map(c => [c.cargo_id, c.obrigatorio === false ? 'SUG' : 'OBR'])),
    })
    setBuscaCargoModal('')
    setFiltroEmpresaCargoModal('')
    setFiltroTipoCargoModal('')
    setNovaCategoriaAberta(false)
    setNovaCategoriaNome('')
    setNovoSistemaAberto(false)
    setNovoSistemaNome('')
    setErroCurso(null)
    setErroCategoria(null)
    setErroSistema(null)
    setModalAberto(true)
  }

  // Marca o cargo como Obrigatório ('OBR') ou Sugerido ('SUG') — exclusivos;
  // clicar no mesmo tipo de novo remove o cargo da seleção
  const toggleCargoSel = (id, tipo) => {
    setForm(prev => {
      const next = { ...prev.cargoSel }
      if (next[id] === tipo) delete next[id]
      else next[id] = tipo
      return { ...prev, cargoSel: next }
    })
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErroCurso(null)
    try {
      const categoria = categorias.find(c => c.id === form.categoria_id)
      const sistema = sistemas.find(s => s.id === form.sistema_id)
      const payload = {
        nome: form.nome,
        categoria_id: form.categoria_id,
        categoria_nome: categoria?.nome,
        sistema_id: form.sistema_id,
        sistema_nome: sistema?.nome,
        ativo: form.ativo,
        cargos: cargos.filter(c => form.cargoSel[c.id]).map(c => ({ id: c.id, nome: c.nome, obrigatorio: form.cargoSel[c.id] === 'OBR' })),
      }
      if (editingId) await apiService.updateTreinCurso(editingId, payload)
      else await apiService.createTreinCurso(payload)
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      setErroCurso(msgErro(err, 'curso'))
    } finally {
      setSalvando(false)
    }
  }

  // Baixa a matriz cursos × cargos em PDF desenhado nativamente com jsPDF
  // (texto vetorial — o html2canvas renderizava mal os cabeçalhos rotacionados
  // e os ícones de check em SVG)
  const handleBaixarPDF = async () => {
    if (!matriz.rows.length) return
    setGerandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 24
      const FIRST_W = 250
      const HEADER_H = 130
      const availW = PW - 2 * M - FIRST_W
      const MIN_COL = 16
      const maxColsPorPagina = Math.max(1, Math.floor(availW / MIN_COL))

      // Divide os cargos em blocos horizontais (se não couberem numa página)
      const blocos = []
      for (let i = 0; i < matriz.cols.length; i += maxColsPorPagina) {
        blocos.push(matriz.cols.slice(i, i + maxColsPorPagina))
      }

      const truncar = (texto, largura, fonte) => {
        pdf.setFontSize(fonte)
        const original = texto || ''
        let t = original
        while (t.length > 1 && pdf.getTextWidth(t) > largura) t = t.slice(0, -1)
        return t.length < original.length ? `${t.slice(0, -1)}…` : t
      }

      let primeiraPagina = true
      blocos.forEach(colsBloco => {
        const colW = Math.min(26, availW / colsBloco.length)
        let y = 0
        let topoTabela = 0

        const linhasVerticais = () => {
          pdf.setDrawColor(226, 232, 240)
          for (let i = 0; i <= colsBloco.length; i++) {
            const x = M + FIRST_W + i * colW
            pdf.line(x, topoTabela, x, y)
          }
        }

        const novaPagina = () => {
          if (!primeiraPagina) pdf.addPage()
          primeiraPagina = false
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(13)
          pdf.setTextColor(30, 41, 59)
          pdf.text('Matriz de Treinamentos — Cursos × Cargos', M, M + 8)
          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(7)
          pdf.setTextColor(130, 130, 130)
          pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')} — círculo verde: obrigatório · cinza: sugerido`, M, M + 20)

          const topo = M + 30
          const GRUPO_H = 12
          // Faixa com o agrupamento (Nível) dos cargos
          const gruposBloco = []
          colsBloco.forEach(c => {
            const g = gruposBloco[gruposBloco.length - 1]
            if (g && g.nome === c.agrup) g.span++
            else gruposBloco.push({ nome: c.agrup, span: 1 })
          })
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(6.5)
          pdf.setTextColor(100, 116, 139)
          let gx = M + FIRST_W
          gruposBloco.forEach(g => {
            const larg = g.span * colW
            pdf.text(truncar(g.nome, larg - 4, 6.5), gx + larg / 2, topo + 8, { align: 'center' })
            gx += larg
          })
          pdf.setFont(undefined, 'normal')
          // Cabeçalhos dos cargos rotacionados (texto vetorial, nítido)
          pdf.setFontSize(7)
          pdf.setTextColor(51, 65, 85)
          colsBloco.forEach((c, i) => {
            const x = M + FIRST_W + i * colW + colW / 2 + 2.5
            pdf.text(truncar(c.nome, HEADER_H - 10, 7), x, topo + GRUPO_H + HEADER_H - 6, { angle: 90 })
          })
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(7.5)
          pdf.setTextColor(100, 116, 139)
          pdf.text('CURSO', M, topo + GRUPO_H + HEADER_H - 6)
          pdf.setFont(undefined, 'normal')
          pdf.setDrawColor(148, 163, 184)
          pdf.line(M, topo + GRUPO_H + HEADER_H, PW - M, topo + GRUPO_H + HEADER_H)
          y = topo + GRUPO_H + HEADER_H
          topoTabela = y
        }

        novaPagina()
        matriz.rows.forEach(r => {
          pdf.setFontSize(7.5)
          const nomeLinhas = pdf.splitTextToSize(r.curso.nome || '', FIRST_W - 10).slice(0, 2)
          const rowH = 10 + nomeLinhas.length * 9 + 8
          if (y + rowH > PH - M) {
            linhasVerticais()
            novaPagina()
          }
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(7.5)
          pdf.setTextColor(30, 41, 59)
          pdf.text(nomeLinhas, M, y + 12)
          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(6)
          pdf.setTextColor(148, 163, 184)
          pdf.text(
            `Base de Conhecimento Bizneo: ${r.curso.categoria_nome || '—'}${r.curso.sistema_nome ? ` · Sistema: ${r.curso.sistema_nome}` : ''}`,
            M, y + 12 + nomeLinhas.length * 9
          )

          colsBloco.forEach((c, i) => {
            const cx = M + FIRST_W + i * colW + colW / 2
            const cy = y + rowH / 2
            if (r.flags[c.id] !== undefined) {
              if (r.flags[c.id]) pdf.setFillColor(5, 150, 105) // verde = obrigatório
              else pdf.setFillColor(100, 116, 139) // cinza = sugerido
              pdf.circle(cx, cy, 3.6, 'F')
            } else {
              pdf.setFillColor(226, 232, 240)
              pdf.circle(cx, cy, 1, 'F')
            }
          })
          pdf.setDrawColor(241, 245, 249)
          pdf.line(M, y + rowH, PW - M, y + rowH)
          y += rowH
        })
        linhasVerticais()
      })

      pdf.save('matriz-treinamentos.pdf')
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  // PDF "Por Curso": uma página por curso, só com o nome, a Base de Conhecimento
  // e a lista de cargos vinculados (obrigatórios e sugeridos, marcados).
  const handleBaixarPDFPorCurso = async () => {
    if (!matriz.rows.length) return
    setGerandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 40

      const colNome = {}
      matriz.cols.forEach(c => { colNome[c.id] = c.nome })

      let primeiraPagina = true
      let y = M

      const cabecalho = (curso, continuacao) => {
        if (!primeiraPagina) pdf.addPage()
        primeiraPagina = false
        y = M
        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(16)
        pdf.setTextColor(30, 41, 59)
        const tituloLinhas = pdf.splitTextToSize(curso.nome || '', PW - 2 * M)
        pdf.text(tituloLinhas, M, y)
        y += tituloLinhas.length * 19 + (continuacao ? 4 : 6)

        if (continuacao) {
          pdf.setFont(undefined, 'italic')
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text('(continuação)', M, y)
          y += 14
        } else {
          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(9)
          pdf.setTextColor(100, 116, 139)
          pdf.text(
            `Base de Conhecimento Bizneo: ${curso.categoria_nome || '—'}${curso.sistema_nome ? ` · Sistema: ${curso.sistema_nome}` : ''}`,
            M, y
          )
          y += 20
        }

        pdf.setDrawColor(203, 213, 225)
        pdf.line(M, y, PW - M, y)
        y += 22

        pdf.setFont(undefined, 'bold')
        pdf.setFontSize(10.5)
        pdf.setTextColor(51, 65, 85)
        pdf.text('Cargos que devem realizar este treinamento:', M, y)
        y += 20
      }

      matriz.rows.forEach(r => {
        cabecalho(r.curso, false)
        const cargosDoCurso = cargosDoCursoPDF(r, colNome)

        if (cargosDoCurso.length === 0) {
          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(9.5)
          pdf.setTextColor(148, 163, 184)
          pdf.text('Nenhum cargo vinculado a este curso.', M, y)
          y += 18
        }

        cargosDoCurso.forEach(c => {
          if (y > PH - M) cabecalho(r.curso, true)
          if (c.obrigatorio) pdf.setFillColor(5, 150, 105) // verde = obrigatório
          else pdf.setFillColor(100, 116, 139) // cinza = sugerido
          pdf.circle(M + 4, y - 3, 3.2, 'F')
          pdf.setFont(undefined, 'normal')
          pdf.setFontSize(9.5)
          pdf.setTextColor(30, 41, 59)
          pdf.text(c.nome, M + 14, y)
          pdf.setFontSize(8)
          pdf.setTextColor(148, 163, 184)
          pdf.text(c.obrigatorio ? 'Obrigatório' : 'Sugerido', PW - M, y, { align: 'right' })
          y += 17
        })

        pdf.setFont(undefined, 'normal')
        pdf.setFontSize(7)
        pdf.setTextColor(180, 180, 180)
        pdf.text(`Gerado em ${new Date().toLocaleString('pt-BR')} — círculo verde: obrigatório · cinza: sugerido`, M, PH - 20)
      })

      pdf.save('treinamentos-por-curso.pdf')
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  // PDF "Por Base de Conhecimento": agrupa os cursos pela Base de Conhecimento
  // Bizneo (categoria) — uma Base por página (ou mais, se não couber) — listando
  // cada curso do grupo com os cargos vinculados (obrigatórios e sugeridos).
  const handleBaixarPDFPorBase = async () => {
    if (!matriz.rows.length) return
    setGerandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const PW = pdf.internal.pageSize.getWidth()
      const PH = pdf.internal.pageSize.getHeight()
      const M = 40

      const colNome = {}
      matriz.cols.forEach(c => { colNome[c.id] = c.nome })

      // Agrupa mantendo a ordem alfabética de curso já aplicada em matriz.rows
      const gruposMap = {}
      const ordemBases = []
      matriz.rows.forEach(r => {
        const base = r.curso.categoria_nome || '—'
        if (!gruposMap[base]) { gruposMap[base] = []; ordemBases.push(base) }
        gruposMap[base].push(r)
      })
      const grupos = ordemBases.sort(cmpTexto).map(base => ({ base, rows: gruposMap[base] }))

      let primeiraPagina = true

      grupos.forEach(g => {
        let y = M

        const cabecalhoBase = (continuacao) => {
          if (!primeiraPagina) pdf.addPage()
          primeiraPagina = false
          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(14)
          pdf.setTextColor(30, 41, 59)
          pdf.text(`Base de Conhecimento Bizneo: ${g.base}${continuacao ? ' (continuação)' : ''}`, M, M)
          pdf.setDrawColor(148, 163, 184)
          pdf.line(M, M + 10, PW - M, M + 10)
          y = M + 32
        }
        cabecalhoBase(false)

        g.rows.forEach(r => {
          const cargosDoCurso = cargosDoCursoPDF(r, colNome)
          const alturaEstim = 20 + Math.max(1, cargosDoCurso.length) * 15 + 18
          if (y + alturaEstim > PH - M) cabecalhoBase(true)

          pdf.setFont(undefined, 'bold')
          pdf.setFontSize(10.5)
          pdf.setTextColor(30, 41, 59)
          const nomeLinhas = pdf.splitTextToSize(r.curso.nome || '', PW - 2 * M)
          pdf.text(nomeLinhas, M, y)
          y += nomeLinhas.length * 13 + 4

          if (r.curso.sistema_nome) {
            pdf.setFont(undefined, 'normal')
            pdf.setFontSize(7.5)
            pdf.setTextColor(148, 163, 184)
            pdf.text(`Sistema: ${r.curso.sistema_nome}`, M, y)
            y += 12
          }

          if (cargosDoCurso.length === 0) {
            pdf.setFont(undefined, 'normal')
            pdf.setFontSize(8.5)
            pdf.setTextColor(148, 163, 184)
            pdf.text('Nenhum cargo vinculado.', M + 12, y)
            y += 14
          } else {
            cargosDoCurso.forEach(c => {
              if (y > PH - M) cabecalhoBase(true)
              if (c.obrigatorio) pdf.setFillColor(5, 150, 105) // verde = obrigatório
              else pdf.setFillColor(100, 116, 139) // cinza = sugerido
              pdf.circle(M + 16, y - 3, 2.8, 'F')
              pdf.setFont(undefined, 'normal')
              pdf.setFontSize(8.5)
              pdf.setTextColor(51, 65, 85)
              pdf.text(c.nome, M + 26, y)
              pdf.setFontSize(7.5)
              pdf.setTextColor(148, 163, 184)
              pdf.text(c.obrigatorio ? 'Obrigatório' : 'Sugerido', PW - M, y, { align: 'right' })
              y += 14
            })
          }
          y += 10
          pdf.setDrawColor(241, 245, 249)
          pdf.line(M, y - 6, PW - M, y - 6)
        })
      })

      pdf.save('treinamentos-por-base.pdf')
    } catch (err) {
      alert('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  const abrirCursosDoCargo = (cargoId, cargoNome) => {
    const set = new Set()
    cursos.forEach(c => { if ((c.cargos || []).some(cc => cc.cargo_id === cargoId)) set.add(c.id) })
    setCargoModal({ id: cargoId, nome: cargoNome })
    setCursoIdsCargo(set)
    setBuscaCursoDoCargo('')
    setErroCargoCursos(null)
    setModalCargoAberto(true)
  }

  const toggleCursoDoCargo = (id) => {
    setCursoIdsCargo(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSalvarCursosDoCargo = async (e) => {
    e.preventDefault()
    setSalvandoCargoCursos(true)
    setErroCargoCursos(null)
    try {
      // Preserva o flag obrigatório/sugerido dos vínculos existentes; novos entram como obrigatórios
      const flagsAtuais = {}
      cursos.forEach(c => {
        const cc = (c.cargos || []).find(x => x.cargo_id === cargoModal.id)
        if (cc) flagsAtuais[c.id] = cc.obrigatorio !== false
      })
      await apiService.salvarTreinCargoCursos(cargoModal.id, cargoModal.nome, [...cursoIdsCargo].map(cid => ({ id: cid, obrigatorio: flagsAtuais[cid] ?? true })))
      await loadDados(true)
      setModalCargoAberto(false)
    } catch (err) {
      setErroCargoCursos(msgErro(err, 'vínculo'))
    } finally {
      setSalvandoCargoCursos(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteTreinCurso(cursoExcluir.id)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir curso: ' + msgErro(err, 'curso'))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const handleCriarCategoria = async () => {
    const nome = novaCategoriaNome.trim()
    if (!nome) return
    setCriandoCategoria(true)
    setErroCategoria(null)
    try {
      const criada = await apiService.createTreinCategoria({ nome })
      setCategorias(prev => [...prev, criada].sort((a, b) => cmpTexto(a.nome, b.nome)))
      setForm(prev => ({ ...prev, categoria_id: criada.id }))
      setNovaCategoriaNome('')
      setNovaCategoriaAberta(false)
    } catch (err) {
      setErroCategoria(msgErro(err, 'categoria'))
    } finally {
      setCriandoCategoria(false)
    }
  }

  const handleCriarSistema = async () => {
    const nome = novoSistemaNome.trim()
    if (!nome) return
    setCriandoSistema(true)
    setErroSistema(null)
    try {
      const criado = await apiService.createTreinSistema({ nome })
      setSistemas(prev => [...prev, criado].sort((a, b) => cmpTexto(a.nome, b.nome)))
      setForm(prev => ({ ...prev, sistema_id: criado.id }))
      setNovoSistemaNome('')
      setNovoSistemaAberto(false)
    } catch (err) {
      setErroSistema(msgErro(err, 'sistema'))
    } finally {
      setCriandoSistema(false)
    }
  }

  const abrirGerenciarCategorias = () => {
    setCategoriaEditId(null)
    setCategoriaEditNome('')
    setErroCategoriaEdit(null)
    setNovaCategoriaGerenciarNome('')
    setErroCategoriaGerenciar(null)
    setModalCategoriasAberto(true)
  }

  const handleCriarCategoriaGerenciar = async (e) => {
    e.preventDefault()
    const nome = novaCategoriaGerenciarNome.trim()
    if (!nome) return
    setCriandoCategoriaGerenciar(true)
    setErroCategoriaGerenciar(null)
    try {
      const criada = await apiService.createTreinCategoria({ nome })
      setCategorias(prev => [...prev, criada].sort((a, b) => cmpTexto(a.nome, b.nome)))
      setNovaCategoriaGerenciarNome('')
    } catch (err) {
      setErroCategoriaGerenciar(msgErro(err, 'categoria'))
    } finally {
      setCriandoCategoriaGerenciar(false)
    }
  }

  const abrirEditarCategoria = (cat) => {
    setCategoriaEditId(cat.id)
    setCategoriaEditNome(cat.nome || '')
    setErroCategoriaEdit(null)
  }

  const handleSalvarCategoriaEdit = async (e) => {
    e.preventDefault()
    const nome = categoriaEditNome.trim()
    if (!nome) return
    setSalvandoCategoriaEdit(true)
    setErroCategoriaEdit(null)
    try {
      const atualizada = await apiService.updateTreinCategoria(categoriaEditId, { nome })
      setCategorias(prev => prev.map(c => c.id === categoriaEditId ? atualizada : c).sort((a, b) => cmpTexto(a.nome, b.nome)))
      await loadDados(true)
      setCategoriaEditId(null)
      setCategoriaEditNome('')
    } catch (err) {
      setErroCategoriaEdit(msgErro(err, 'categoria'))
    } finally {
      setSalvandoCategoriaEdit(false)
    }
  }

  const handleConfirmarExclusaoCategoria = async () => {
    try {
      await apiService.deleteTreinCategoria(categoriaExcluir.id)
      setCategorias(prev => prev.filter(c => c.id !== categoriaExcluir.id))
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir categoria: ' + msgErro(err, 'categoria'))
    } finally {
      setModalExcluirCategoriaAberto(false)
    }
  }

  // ── Derivações ──────────────────────────────────────────────────────────────
  const buscaUp = busca.trim().toUpperCase()

  // Helpers de árvore: cargos agora vêm do Organograma de Treinamentos
  // (trein_organograma, pai_id em vez dos agrupamentos de dim_cargos).
  const cargoPorId = Object.fromEntries(cargos.map(c => [c.id, c]))
  const raizDoCargo = (cargoId) => {
    let atual = cargoPorId[cargoId]
    let guarda = 0
    while (atual?.pai_id && cargoPorId[atual.pai_id] && guarda++ < 20) atual = cargoPorId[atual.pai_id]
    return atual
  }
  const caminhoCargo = (cargoId) => {
    const partes = []
    let atual = cargoPorId[cargoId]
    let guarda = 0
    while (atual && guarda++ < 20) { partes.unshift(atual.nome); atual = atual.pai_id ? cargoPorId[atual.pai_id] : null }
    return partes.join(' › ')
  }

  // Filtro avançado: Empresa (raiz da árvore) — restringe quais cargos aparecem.
  // Precisa vir ANTES de cursoPassaFiltros/cursosFiltrados: os dois já a usam
  // logo abaixo (se ficasse depois, um `const` lido antes de ser declarado
  // no mesmo escopo estoura "Cannot access before initialization" assim que
  // o filtro fosse usado — bug real que existia aqui antes, corrigido agora).
  const cargosDaEmpresa = filtroEmpresaCargo
    ? new Set(cargos.filter(c => raizDoCargo(c.id)?.id === filtroEmpresaCargo).map(c => c.id))
    : null
  const cargoPermitido = (cargoId) => !cargosDaEmpresa || cargosDaEmpresa.has(cargoId)

  // Cursos que passam nos filtros de categoria/empresa (busca é aplicada
  // por visão, sobre o campo principal de cada uma)
  const cursoPassaFiltros = (curso) => {
    if (filtroCurso && curso.id !== filtroCurso) return false
    if (filtroCategoria && curso.categoria_id !== filtroCategoria) return false
    if (filtroSistema && curso.sistema_id !== filtroSistema) return false
    if (filtroEmpresaCargo && !(curso.cargos || []).some(cc => cargosDaEmpresa.has(cc.cargo_id))) return false
    return true
  }

  const cursosFiltrados = cursos.filter(c => c.ativo && cursoPassaFiltros(c))

  // Curso "qualifica" para um filtro quando atende a TODOS os demais filtros
  // avançados ativos (o filtro indicado em `ignorar` fica de fora da checagem).
  // Usado só para calcular dinamicamente as opções de Curso/Categoria/Sistema
  // a partir do que já está selecionado nos OUTROS filtros (Empresa é uma
  // lista de valores próprios e não entra nessa cascata).
  const cursoQualifica = (curso, ignorar = {}) => {
    if (!ignorar.curso && filtroCurso && curso.id !== filtroCurso) return false
    if (!ignorar.categoria && filtroCategoria && curso.categoria_id !== filtroCategoria) return false
    if (!ignorar.sistema && filtroSistema && curso.sistema_id !== filtroSistema) return false
    if (!ignorar.empresaCargo && filtroEmpresaCargo) {
      if (!(curso.cargos || []).some(cc => cargosDaEmpresa.has(cc.cargo_id))) return false
    }
    return true
  }

  const cursosAtivos = cursos.filter(c => c.ativo)

  // Opções dinâmicas de Curso/Categoria/Sistema: cada uma reflete só os
  // valores que ainda fazem sentido dado o que já foi escolhido nos OUTROS
  // filtros (o próprio filtro do seletor não se autolimita, senão só a opção
  // já marcada apareceria).
  const opcoesCurso = cursosAtivos
    .filter(c => cursoQualifica(c, { curso: true }))
    .sort((a, b) => cmpTexto(a.nome, b.nome))

  const opcoesCategoria = categorias.filter(cat =>
    cursosAtivos.some(c => c.categoria_id === cat.id && cursoQualifica(c, { categoria: true }))
  )

  const opcoesSistema = sistemas.filter(s =>
    cursosAtivos.some(c => c.sistema_id === s.id && cursoQualifica(c, { sistema: true }))
  )

  // Opções do filtro Empresa: as raízes da árvore (Holding/Trucks/Honda) que
  // têm algum cargo usado nos cursos que já passam nos OUTROS filtros
  const opcoesEmpresaCargo = (() => {
    const cargoIds = new Set()
    cursosAtivos.filter(c => cursoQualifica(c, { empresaCargo: true })).forEach(c => {
      ;(c.cargos || []).forEach(cc => cargoIds.add(cc.cargo_id))
    })
    const raizIds = new Set([...cargoIds].map(id => raizDoCargo(id)?.id).filter(Boolean))
    return cargos.filter(c => !c.pai_id && raizIds.has(c.id)).sort((a, b) => cmpTexto(a.nome, b.nome))
  })()

  // Se a combinação de filtros mudar e a seleção atual de Curso/Categoria/
  // Sistema/Empresa deixar de fazer sentido, limpa esse filtro em vez de
  // deixá-lo "travado" num valor que não aparece mais na lista.
  useEffect(() => {
    if (filtroCurso && !cursosAtivos.some(c => c.id === filtroCurso && cursoQualifica(c, { curso: true }))) setFiltroCurso('')
  }, [filtroCategoria, filtroSistema, filtroEmpresaCargo, cursos])

  useEffect(() => {
    if (filtroCategoria && !cursosAtivos.some(c => c.categoria_id === filtroCategoria && cursoQualifica(c, { categoria: true }))) setFiltroCategoria('')
  }, [filtroCurso, filtroSistema, filtroEmpresaCargo, cursos])

  useEffect(() => {
    if (filtroSistema && !cursosAtivos.some(c => c.sistema_id === filtroSistema && cursoQualifica(c, { sistema: true }))) setFiltroSistema('')
  }, [filtroCurso, filtroCategoria, filtroEmpresaCargo, cursos])

  useEffect(() => {
    if (filtroEmpresaCargo) {
      const cargoIdsQualificados = new Set()
      cursosAtivos.filter(c => cursoQualifica(c, { empresaCargo: true })).forEach(c => (c.cargos || []).forEach(cc => cargoIdsQualificados.add(cc.cargo_id)))
      const aindaValido = [...cargoIdsQualificados].some(id => raizDoCargo(id)?.id === filtroEmpresaCargo)
      if (!aindaValido) setFiltroEmpresaCargo('')
    }
  }, [filtroCurso, filtroCategoria, filtroSistema, cursos, cargos])

  // Base: um item por cargo com seus cursos + flag obrigatório/sugerido, sem
  // filtro de busca nem ordenação
  const baseCargos = (() => {
    const porCargo = {}
    cursosFiltrados.forEach(curso => {
      ;(curso.cargos || []).forEach(cc => {
        if (!cargoPermitido(cc.cargo_id)) return
        if (!porCargo[cc.cargo_id]) {
          const cargo = cargoPorId[cc.cargo_id]
          porCargo[cc.cargo_id] = {
            cargoId: cc.cargo_id,
            cargo: caminhoCargo(cc.cargo_id) || cargo?.nome || cc.cargo_nome || '—',
            empresa: raizDoCargo(cc.cargo_id)?.nome || 'Sem empresa',
            cursos: [],
            flags: {},
          }
        }
        porCargo[cc.cargo_id].cursos.push(curso)
        porCargo[cc.cargo_id].flags[curso.id] = cc.obrigatorio !== false
      })
    })
    return Object.values(porCargo).map(l => ({
      ...l,
      cursos: l.cursos.sort((a, b) => cmpTexto(a.nome, b.nome)),
    }))
  })()

  // Visão "Por Cargo": uma linha por cargo com pelo menos um curso obrigatório
  const linhasPorCargo = baseCargos
    .filter(l => !buscaUp || l.cargo.toUpperCase().includes(buscaUp) || l.cursos.some(c => (c.nome || '').toUpperCase().includes(buscaUp)))
    .sort((a, b) => {
      const dir = sortCargo.dir === 'asc' ? 1 : -1
      let v
      if (sortCargo.col === 'qtd') v = a.cursos.length - b.cursos.length
      else if (sortCargo.col === 'empresa') v = cmpTexto(a.empresa, b.empresa)
      else v = cmpTexto(a.cargo, b.cargo)
      return v !== 0 ? v * dir : cmpTexto(a.cargo, b.cargo)
    })

  // Colunas da visão Por Cargo: cursos distintos presentes nas linhas, no
  // mesmo estilo da Matriz (cabeçalho vertical), ordenados por categoria+nome
  const cursosColsPorCargo = (() => {
    const map = {}
    linhasPorCargo.forEach(l => l.cursos.forEach(c => { if (!map[c.id]) map[c.id] = c }))
    return Object.values(map).sort((a, b) => cmpTexto(a.categoria_nome, b.categoria_nome) || cmpTexto(a.nome, b.nome))
  })()

  // Visão "Cursos" (cadastro): inclui inativos
  const linhasCursos = cursos
    .filter(c => cursoPassaFiltros(c))
    .filter(c => !cargosDaEmpresa || (c.cargos || []).some(cc => cargosDaEmpresa.has(cc.cargo_id)))
    .filter(c => !buscaUp || (c.nome || '').toUpperCase().includes(buscaUp) || (c.categoria_nome || '').toUpperCase().includes(buscaUp))
    .sort((a, b) => {
      const dir = sortCurso.dir === 'asc' ? 1 : -1
      let v
      if (sortCurso.col === 'categoria') v = cmpTexto(a.categoria_nome, b.categoria_nome)
      else if (sortCurso.col === 'sistema') v = cmpTexto(a.sistema_nome, b.sistema_nome)
      else if (sortCurso.col === 'cargos') v = (a.cargos || []).length - (b.cargos || []).length
      else if (sortCurso.col === 'status') v = (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0)
      else v = cmpTexto(a.nome, b.nome)
      return v !== 0 ? v * dir : cmpTexto(a.nome, b.nome)
    })

  // Visão "Matriz": cursos nas linhas × cargos nas colunas; ✓ onde o cargo
  // precisa realizar o curso. Colunas = só cargos presentes nos cursos filtrados.
  const matriz = (() => {
    const rows = cursosFiltrados
      .filter(c => !filtroCargoMatriz || (c.cargos || []).some(cc => cc.cargo_id === filtroCargoMatriz))
      .filter(c => !cargosDaEmpresa || (c.cargos || []).some(cc => cargosDaEmpresa.has(cc.cargo_id)))
      .filter(c => !buscaUp
        || (c.nome || '').toUpperCase().includes(buscaUp)
        || (c.categoria_nome || '').toUpperCase().includes(buscaUp)
        || (c.cargos || []).some(x => (x.cargo_nome || '').toUpperCase().includes(buscaUp)))
      .map(c => ({
        curso: c,
        // flags[cargo_id] = true (obrigatório) | false (sugerido)
        flags: Object.fromEntries((c.cargos || []).filter(x => cargoPermitido(x.cargo_id)).map(x => [x.cargo_id, x.obrigatorio !== false])),
      }))
      .sort((a, b) => cmpTexto(a.curso.nome, b.curso.nome))
    // Colunas agrupadas pela Empresa (raiz da árvore do cargo)
    const colsMap = {}
    rows.forEach(r => {
      ;(r.curso.cargos || []).forEach(cc => {
        if (!cargoPermitido(cc.cargo_id)) return
        if (!colsMap[cc.cargo_id]) {
          const cad = cargoPorId[cc.cargo_id]
          colsMap[cc.cargo_id] = {
            id: cc.cargo_id,
            nome: cad?.nome || cc.cargo_nome || '—',
            agrup: raizDoCargo(cc.cargo_id)?.nome || 'Sem empresa',
          }
        }
      })
    })
    // Colunas agrupadas pela Empresa
    const cols = Object.values(colsMap).sort((a, b) =>
      cmpTexto(a.agrup, b.agrup) || cmpTexto(a.nome, b.nome))
    cols.forEach((c, i) => { c.inicioGrupo = i === 0 || cols[i - 1].agrup !== c.agrup })
    const grupos = []
    cols.forEach(c => {
      const g = grupos[grupos.length - 1]
      if (g && g.nome === c.agrup) g.span++
      else grupos.push({ nome: c.agrup, span: 1 })
    })
    return { rows, cols, grupos }
  })()

  // Lista de cargos do modal de curso: filtrada pela busca interna, pelo
  // seletor de Empresa (raiz da árvore) e por Obrigatório/Sugerido (clicando
  // no cabeçalho da respectiva coluna) — agrupada por Empresa pra separar
  // visualmente os cargos
  const cargosModalFiltrados = cargos
    .filter(c => {
      if (buscaCargoModal.trim() && !(c.nome || '').toUpperCase().includes(buscaCargoModal.trim().toUpperCase())) return false
      if (filtroEmpresaCargoModal && raizDoCargo(c.id)?.id !== filtroEmpresaCargoModal) return false
      if (filtroTipoCargoModal && form.cargoSel[c.id] !== filtroTipoCargoModal) return false
      return true
    })
    .map(c => ({ ...c, empresaNome: raizDoCargo(c.id)?.nome || 'Sem empresa', caminho: caminhoCargo(c.id) }))
    .sort((a, b) => cmpTexto(a.empresaNome, b.empresaNome) || cmpTexto(a.caminho, b.caminho))

  // Detalhe de um treinamento ao expandir na aba Cursos: para cada cargo
  // vinculado, a Empresa (raiz) e o Departamento (caminho intermediário na
  // árvore) do cargo. Não há mais vínculo com dim_funcionarios — cargos vêm
  // do Organograma de Treinamentos (Bizneo), sem ligação com Funcionários.
  const detalheCargosCurso = (curso) =>
    (curso.cargos || [])
      .map(cc => {
        const cargo = cargoPorId[cc.cargo_id]
        const raiz = raizDoCargo(cc.cargo_id)
        const caminho = caminhoCargo(cc.cargo_id).split(' › ')
        const departamento = caminho.length > 2 ? caminho.slice(1, -1).join(' › ') : null
        return {
          cargoId: cc.cargo_id,
          cargoNome: cargo?.nome || cc.cargo_nome || '—',
          obrigatorio: cc.obrigatorio !== false,
          empresa: raiz?.nome || '—',
          departamento,
          headcount: cargo?.headcount || 0,
        }
      })
      .sort((a, b) => (b.obrigatorio - a.obrigatorio) || cmpTexto(a.cargoNome, b.cargoNome))

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar grade de treinamentos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={() => loadDados()} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1 basis-96">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Grade de Treinamentos</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">Cursos por categoria, com cargos obrigatórios. Cargos vêm do Organograma de Treinamentos (importado do Bizneo).</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {visualizacao === 'matriz' && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setPdfMenuAberto(o => !o)}
                disabled={gerandoPDF}
                className="flex items-center gap-2 whitespace-nowrap bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
              >
                <FileDown className="h-4 w-4 shrink-0" /> {gerandoPDF ? 'Gerando PDF...' : 'Baixar PDF'}
                <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${pdfMenuAberto ? 'rotate-180' : ''}`} />
              </button>
              {pdfMenuAberto && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPdfMenuAberto(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setPdfMenuAberto(false); handleBaixarPDF() }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <span className="block text-xs font-semibold text-slate-800">Matriz completa</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Cursos × Cargos em uma grande tabela (formato atual)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPdfMenuAberto(false); handleBaixarPDFPorCurso() }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100"
                    >
                      <span className="block text-xs font-semibold text-slate-800">Por Curso</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Uma página por curso, só com os cargos que devem realizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPdfMenuAberto(false); handleBaixarPDFPorBase() }}
                      className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <span className="block text-xs font-semibold text-slate-800">Por Base de Conhecimento</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Cursos agrupados por Base de Conhecimento Bizneo</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {canEdit && (
            <button onClick={abrirGerenciarCategorias} className="flex items-center gap-2 whitespace-nowrap bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
              <Tags className="h-4 w-4 shrink-0" /> Categorias
            </button>
          )}
          {canEdit && (
            <button onClick={abrirIncluir} className="flex items-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
              <Plus className="h-4 w-4 shrink-0" /> Novo Curso
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          <button
            type="button"
            onClick={() => setVisualizacao('cursos')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'cursos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Por Cursos
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('cargo')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'cargo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Por Cargo
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('matriz')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'matriz' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Grid3x3 className="h-3.5 w-3.5" /> Cursos x Cargos
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('organograma')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'organograma' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Network className="h-3.5 w-3.5" /> Organograma
          </button>
        </div>
        {visualizacao !== 'organograma' && (
          <button
            type="button"
            onClick={() => setFiltrosAvancados(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold border transition-colors ${
              filtrosAvancados || filtroEmpresaCargo || filtroSistema || filtroCategoria || filtroCurso || busca
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros Avançados
            {filtrosAvancados ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Painel retrátil de filtros avançados */}
      {filtrosAvancados && visualizacao !== 'organograma' && (
        <div className="flex flex-wrap items-end gap-4 bg-slate-50 border border-slate-200 rounded-md p-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Curso</label>
            <select
              value={filtroCurso}
              onChange={e => setFiltroCurso(e.target.value)}
              className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white min-w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todos os cursos</option>
              {opcoesCurso.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Categoria</label>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white min-w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todas as categorias</option>
              {opcoesCategoria.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Buscar</label>
            <div className="relative min-w-56">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="text-xs pl-8 pr-7 py-2 border border-slate-200 rounded-md font-medium text-slate-700 w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  title="Limpar busca"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sistema</label>
            <select
              value={filtroSistema}
              onChange={e => setFiltroSistema(e.target.value)}
              className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white min-w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todos os sistemas</option>
              {opcoesSistema.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
            <select
              value={filtroEmpresaCargo}
              onChange={e => setFiltroEmpresaCargo(e.target.value)}
              className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white min-w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            >
              <option value="">Todas as empresas</option>
              {opcoesEmpresaCargo.map(a => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
          </div>
          {(filtroEmpresaCargo || filtroSistema || filtroCategoria || filtroCurso || busca) && (
            <button
              type="button"
              onClick={() => { setFiltroEmpresaCargo(''); setFiltroSistema(''); setFiltroCategoria(''); setFiltroCurso(''); setBusca('') }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-md text-[11px] font-semibold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Grade por Cargo */}
      {(visualizacao === 'cargo' || visualizacao === 'matriz') && (
        <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 border border-emerald-700">
              <Check className="h-3 w-3 text-white" />
            </span>
            Obrigatório
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 border border-slate-400">
              <Check className="h-3 w-3 text-slate-700" />
            </span>
            Sugerido
          </span>
        </div>
      )}

      {visualizacao === 'cargo' && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="Empresa" col="empresa" sort={sortCargo} onSort={toggleSortCargo} className="w-[170px] min-w-[170px] sticky left-0 bg-slate-50 z-10 align-bottom" />
              <ThSort label="Cargo" col="cargo" sort={sortCargo} onSort={toggleSortCargo} className="min-w-[260px] sticky left-[170px] bg-slate-50 z-10 align-bottom" />
              <ThSort label="Cursos" col="qtd" sort={sortCargo} onSort={toggleSortCargo} center className="align-bottom" />
              {cursosColsPorCargo.map(c => (
                <th key={c.id} title={`${c.nome} — Categoria: ${c.categoria_nome || '—'}`} className="p-0 relative" style={{ width: 42, minWidth: 42, height: 170, verticalAlign: 'bottom' }}>
                  <div
                    className="text-[10px] font-semibold normal-case leading-tight text-slate-500"
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: '50%',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'left bottom',
                      whiteSpace: 'nowrap',
                      maxWidth: 150,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.nome}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {linhasPorCargo.length === 0 ? (
              <tr><td colSpan={cursosColsPorCargo.length + 3} className="p-6 text-center text-slate-400">Nenhum cargo com treinamento obrigatório cadastrado.</td></tr>
            ) : linhasPorCargo.map(l => (
              <tr key={l.cargoId} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-1.5 align-top sticky left-0 bg-white z-10 w-[170px] min-w-[170px]">
                  <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold border bg-sky-50 text-sky-700 border-sky-100">
                    {l.empresa}
                  </span>
                </td>
                <td className="px-3 py-1.5 align-top font-bold text-slate-800 sticky left-[170px] bg-white z-10">
                  <button
                    type="button"
                    onClick={() => canEdit
                      ? abrirCursosDoCargo(l.cargoId, l.cargo)
                      : (setFiltroCargoMatriz(l.cargoId), setVisualizacao('matriz'))}
                    title={canEdit ? 'Selecionar os cursos deste cargo' : 'Ver em Cursos x Cargos os cursos deste cargo'}
                    className="text-left hover:text-blue-600 hover:underline transition-colors"
                  >
                    {l.cargo}
                  </button>
                </td>
                <td className="px-3 py-1.5 align-top text-center tabular-nums">{l.cursos.length}</td>
                {cursosColsPorCargo.map(c => (
                  <td key={c.id} className="p-1 text-center align-middle">
                    {l.flags[c.id] !== undefined ? (
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                          l.flags[c.id] ? 'bg-emerald-600 border-emerald-700' : 'bg-slate-300 border-slate-400'
                        }`}
                      >
                        <Check className={`h-3 w-3 ${l.flags[c.id] ? 'text-white' : 'text-slate-700'}`} />
                      </span>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Matriz cursos × cargos */}
      {visualizacao === 'matriz' && filtroCargoMatriz && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs font-semibold text-blue-800">
          Filtrado pelo cargo:
          <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 bg-white border border-blue-200">
            {cargoPorId[filtroCargoMatriz]?.nome || '—'}
            <button type="button" onClick={() => setFiltroCargoMatriz('')} title="Remover filtro de cargo" className="text-blue-500 hover:text-blue-800 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
      )}
      {visualizacao === 'matriz' && (
      <div id="trein-matriz-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th rowSpan={2} className="px-3 py-2 min-w-[260px] sticky left-0 bg-slate-50 z-10 align-bottom border-b border-slate-200">Curso</th>
              {matriz.grupos.map((g, i) => (
                <th key={i} colSpan={g.span} title={g.nome} className="p-1.5 text-center border-l border-b border-slate-200">
                  <span className="block leading-tight normal-case text-[10px] font-bold text-slate-500 truncate" style={{ maxWidth: g.span * 42 - 8 }}>
                    {g.nome}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              {matriz.cols.map(c => (
                <th key={c.id} title={`${c.nome} — ${c.agrup}`} className={`p-0 relative ${c.id === filtroCargoMatriz ? 'bg-blue-50' : ''} ${c.inicioGrupo ? 'border-l border-slate-200' : ''}`} style={{ width: 42, minWidth: 42, height: 170, verticalAlign: 'bottom' }}>
                  <div
                    className="text-[10px] font-semibold normal-case leading-tight text-slate-500"
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: '50%',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'left bottom',
                      whiteSpace: 'nowrap',
                      maxWidth: 150,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {c.nome}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {matriz.rows.length === 0 ? (
              <tr><td colSpan={matriz.cols.length + 1} className="p-6 text-center text-slate-400">Nenhum curso cadastrado para os filtros atuais.</td></tr>
            ) : matriz.rows.map(r => (
              <tr key={r.curso.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-1.5 align-top font-bold text-slate-800 sticky left-0 bg-white z-10 whitespace-nowrap">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => abrirEditar(r.curso)}
                      title="Editar curso"
                      className="text-left whitespace-nowrap hover:text-blue-600 hover:underline transition-colors"
                    >
                      {r.curso.nome}
                    </button>
                  ) : r.curso.nome}
                  <span className="block text-[10px] font-semibold text-slate-400">
                    Base de Conhecimento Bizneo: {r.curso.categoria_nome || '—'}{r.curso.sistema_nome ? ` · Sistema: ${r.curso.sistema_nome}` : ''}
                  </span>
                </td>
                {matriz.cols.map(c => (
                  <td key={c.id} className={`p-1 text-center align-middle ${c.id === filtroCargoMatriz ? 'bg-blue-50/50' : ''} ${c.inicioGrupo ? 'border-l border-slate-200' : ''}`}>
                    {r.flags[c.id] !== undefined ? (
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${
                          r.flags[c.id] ? 'bg-emerald-600 border-emerald-700' : 'bg-slate-300 border-slate-400'
                        }`}
                      >
                        <Check className={`h-3 w-3 ${r.flags[c.id] ? 'text-white' : 'text-slate-700'}`} />
                      </span>
                    ) : (
                      <span className="text-slate-200">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Organograma de Treinamentos — mesma tela do menu, embutida como aba */}
      {visualizacao === 'organograma' && <OrganogramaTreinamentos onAlterado={() => loadDados(true)} />}

      {/* Cadastro de cursos */}
      {visualizacao === 'cursos' && (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="w-8 px-1 py-2"></th>
              <ThSort label="Curso" col="nome" sort={sortCurso} onSort={toggleSortCurso} className="min-w-[260px]" />
              <ThSort label="Categoria" col="categoria" sort={sortCurso} onSort={toggleSortCurso} />
              <ThSort label="Sistema" col="sistema" sort={sortCurso} onSort={toggleSortCurso} />
              <ThSort label="Cargos" col="cargos" sort={sortCurso} onSort={toggleSortCurso} center />
              <th className="px-3 py-2">Empresas</th>
              <ThSort label="Status" col="status" sort={sortCurso} onSort={toggleSortCurso} />
              <th className="px-3 py-2 w-20 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {linhasCursos.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-slate-400">Nenhum curso cadastrado.</td></tr>
            ) : linhasCursos.map(c => { const expandido = cursosExpandidos.has(c.id); return (
              <React.Fragment key={c.id}>
              <tr className={`hover:bg-slate-50/70 transition-colors ${!c.ativo ? 'opacity-50' : ''}`}>
                <td className="px-1 py-1.5 align-top text-center">
                  {(c.cargos || []).length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleCursoExpandido(c.id)}
                      title={expandido ? 'Recolher' : 'Ver empresas, departamentos e cargos'}
                      className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      {expandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </td>
                <td className="px-3 py-1.5 align-top font-bold text-slate-800">
                  {canEdit ? (
                    <button type="button" onClick={() => abrirEditar(c)} title="Editar curso" className="text-left hover:text-blue-600 hover:underline transition-colors">
                      {c.nome}
                    </button>
                  ) : c.nome}
                </td>
                <td className="px-3 py-1.5 align-top whitespace-nowrap">{c.categoria_nome || '—'}</td>
                <td className="px-3 py-1.5 align-top whitespace-nowrap">{c.sistema_nome || '—'}</td>
                <td className="px-3 py-1.5 align-top text-center">
                  <span title={(c.cargos || []).map(x => x.cargo_nome).sort().join(', ') || 'Nenhum cargo'} className="tabular-nums cursor-help">
                    {(c.cargos || []).length}
                  </span>
                </td>
                <td className="px-3 py-1.5 align-top">
                  {(() => {
                    const empresasDoCurso = [...new Set((c.cargos || [])
                      .map(cc => raizDoCargo(cc.cargo_id)?.nome)
                      .filter(Boolean))].sort(cmpTexto)
                    return empresasDoCurso.length ? (
                      <div className="flex flex-wrap gap-1">
                        {empresasDoCurso.map(n => (
                          <span key={n} className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold border bg-sky-50 text-sky-700 border-sky-100">
                            {n}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400">—</span>
                    )
                  })()}
                </td>
                <td className="px-3 py-1.5 align-top">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                    c.ativo ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-3 py-1.5 align-top">
                  <PermissionActionButtons menuPath="treinamentos/grade" onEdit={canEdit ? () => abrirEditar(c) : undefined} onDelete={canEdit ? () => { setCursoExcluir(c); setModalExcluirAberto(true) } : undefined} />
                </td>
              </tr>
              {expandido && (
                <tr className="bg-slate-50/60">
                  <td colSpan={8} className="px-4 py-3">
                    {(() => {
                      const detalhe = detalheCargosCurso(c)
                      return detalhe.length === 0 ? (
                        <p className="text-slate-400 italic">Nenhum cargo vinculado a este curso.</p>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                <th className="px-3 py-1.5">Tipo</th>
                                <th className="px-3 py-1.5">Empresa</th>
                                <th className="px-3 py-1.5">Departamento</th>
                                <th className="px-3 py-1.5">Cargo</th>
                                <th className="px-3 py-1.5 text-center">Headcount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detalhe.map(d => (
                                <tr key={d.cargoId} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-3 py-1.5 align-top whitespace-nowrap">
                                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${d.obrigatorio ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.obrigatorio ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                                      {d.obrigatorio ? 'Obrigatório' : 'Sugerido'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 align-top whitespace-nowrap text-slate-700">{d.empresa}</td>
                                  <td className="px-3 py-1.5 align-top text-slate-500">
                                    {d.departamento || <span className="text-[9px] font-semibold text-slate-400">—</span>}
                                  </td>
                                  <td className="px-3 py-1.5 align-top font-bold text-slate-800 whitespace-nowrap">{d.cargoNome}</td>
                                  <td className="px-3 py-1.5 align-top text-center tabular-nums text-slate-500">{d.headcount || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    })()}
                  </td>
                </tr>
              )}
              </React.Fragment>
            )})}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal criar/editar curso */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[760px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Curso' : 'Incluir Novo Curso'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Curso *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={form.nome}
                    onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="NOME DO CURSO"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Categoria *</label>
                  <div className="flex items-center gap-2">
                    <select
                      required
                      value={form.categoria_id}
                      onChange={e => setForm(prev => ({ ...prev, categoria_id: e.target.value }))}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNovaCategoriaAberta(v => !v)}
                      title="Cadastrar nova categoria"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={abrirGerenciarCategorias}
                      title="Categorias cadastradas"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  {novaCategoriaAberta && (
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={novaCategoriaNome}
                          onChange={e => setNovaCategoriaNome(e.target.value)}
                          placeholder="NOME DA NOVA CATEGORIA"
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button type="button" onClick={() => { setNovaCategoriaAberta(false); setNovaCategoriaNome(''); setErroCategoria(null) }} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={criandoCategoria || !novaCategoriaNome.trim()} onClick={handleCriarCategoria}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {criandoCategoria ? 'Salvando...' : 'Adicionar'}
                        </button>
                      </div>
                      <ErroForm>{erroCategoria}</ErroForm>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistema</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={form.sistema_id}
                      onChange={e => setForm(prev => ({ ...prev, sistema_id: e.target.value }))}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {sistemas.map(s => (
                        <option key={s.id} value={s.id}>{s.nome}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNovoSistemaAberto(v => !v)}
                      title="Cadastrar novo sistema"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {novoSistemaAberto && (
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={novoSistemaNome}
                          onChange={e => setNovoSistemaNome(e.target.value)}
                          placeholder="NOME DO NOVO SISTEMA"
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button type="button" onClick={() => { setNovoSistemaAberto(false); setNovoSistemaNome(''); setErroSistema(null) }} className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={criandoSistema || !novoSistemaNome.trim()} onClick={handleCriarSistema}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {criandoSistema ? 'Salvando...' : 'Adicionar'}
                        </button>
                      </div>
                      <ErroForm>{erroSistema}</ErroForm>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Cargos {Object.keys(form.cargoSel).length > 0 ? `(${Object.keys(form.cargoSel).length} selecionado${Object.keys(form.cargoSel).length > 1 ? 's' : ''})` : ''}
                    </label>
                    {Object.keys(form.cargoSel).length > 0 && (
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, cargoSel: {} }))} className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors">
                        Limpar seleção
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={buscaCargoModal}
                        onChange={e => setBuscaCargoModal(e.target.value)}
                        placeholder="Filtrar cargos..."
                        className="w-full text-xs p-1.5 pr-7 border border-slate-200 rounded-md font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                      {buscaCargoModal && (
                        <button
                          type="button"
                          onClick={() => setBuscaCargoModal('')}
                          title="Limpar filtro"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <select
                      value={filtroEmpresaCargoModal}
                      onChange={e => setFiltroEmpresaCargoModal(e.target.value)}
                      className="text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-700 bg-white shrink-0 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Todas as empresas</option>
                      {cargos.filter(c => !c.pai_id).sort((a, b) => cmpTexto(a.nome, b.nome)).map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                    </select>
                  </div>
                  <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto">
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Cargo</span>
                      <span className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFiltroTipoCargoModal(v => v === 'OBR' ? '' : 'OBR')}
                          title="Filtrar só os cargos marcados como Obrigatório"
                          className={`w-20 text-center text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                            filtroTipoCargoModal === 'OBR' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          Obrigatório
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroTipoCargoModal(v => v === 'SUG' ? '' : 'SUG')}
                          title="Filtrar só os cargos marcados como Sugerido"
                          className={`w-20 text-center text-[10px] font-bold uppercase tracking-wide rounded transition-colors ${
                            filtroTipoCargoModal === 'SUG' ? 'bg-slate-500 text-white' : 'text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          Sugerido
                        </button>
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {cargosModalFiltrados.length === 0 ? (
                        <div className="p-3 text-center text-[11px] text-slate-400">Nenhum cargo encontrado.</div>
                      ) : cargosModalFiltrados.map((c, i) => (
                        <React.Fragment key={c.id}>
                          {(i === 0 || cargosModalFiltrados[i - 1].empresaNome !== c.empresaNome) && (
                            <div className="px-3 py-1 bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-wide sticky top-[26px] z-[5]">
                              {c.empresaNome}
                            </div>
                          )}
                          <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                            <span className="flex-1" title={c.caminho}>{c.nome}</span>
                            <span className="flex gap-2 shrink-0">
                              <span className="w-20 text-center">
                                <input
                                  type="checkbox"
                                  checked={form.cargoSel[c.id] === 'OBR'}
                                  onChange={() => toggleCargoSel(c.id, 'OBR')}
                                  title="Obrigatório"
                                  className="w-3.5 h-3.5 accent-emerald-600"
                                />
                              </span>
                              <span className="w-20 text-center">
                                <input
                                  type="checkbox"
                                  checked={form.cargoSel[c.id] === 'SUG'}
                                  onChange={() => toggleCargoSel(c.id, 'SUG')}
                                  title="Sugerido"
                                  className="w-3.5 h-3.5 accent-slate-500"
                                />
                              </span>
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">Marque apenas uma opção por cargo: Obrigatório ou Sugerido.</span>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
                <ErroForm>{erroCurso}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {salvando ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Gerenciar Categorias: lista + nova/editar/excluir */}
      {modalCategoriasAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Categorias Cadastradas</h3>
              <button onClick={() => setModalCategoriasAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <form onSubmit={handleCriarCategoriaGerenciar} className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novaCategoriaGerenciarNome}
                    onChange={e => setNovaCategoriaGerenciarNome(e.target.value)}
                    placeholder="NOME DA NOVA CATEGORIA"
                    className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button type="submit" disabled={criandoCategoriaGerenciar || !novaCategoriaGerenciarNome.trim()}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0">
                    <Plus className="h-3.5 w-3.5" /> {criandoCategoriaGerenciar ? 'Salvando...' : 'Nova Categoria'}
                  </button>
                </div>
                <ErroForm>{erroCategoriaGerenciar}</ErroForm>
              </form>

              <div className="border border-slate-200 rounded-md divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {categorias.length === 0 ? (
                  <div className="p-3 text-center text-[11px] text-slate-400">Nenhuma categoria cadastrada.</div>
                ) : categorias.map(cat => (
                  <div key={cat.id} className="p-2">
                    {categoriaEditId === cat.id ? (
                      <form onSubmit={handleSalvarCategoriaEdit} className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={categoriaEditNome}
                            onChange={e => setCategoriaEditNome(e.target.value)}
                            className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          />
                          <button type="button" onClick={() => setCategoriaEditId(null)} className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                          <button type="submit" disabled={salvandoCategoriaEdit || !categoriaEditNome.trim()}
                            className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0">
                            {salvandoCategoriaEdit ? 'Salvando...' : 'Salvar'}
                          </button>
                        </div>
                        <ErroForm>{erroCategoriaEdit}</ErroForm>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">{cat.nome}</span>
                        <span className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => abrirEditarCategoria(cat)} title="Editar categoria" className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => { setCategoriaExcluir(cat); setModalExcluirCategoriaAberto(true) }} title="Excluir categoria" className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
              <button type="button" onClick={() => setModalCategoriasAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusão de categoria */}
      {modalExcluirCategoriaAberto && categoriaExcluir && (() => {
        const emUso = cursos.filter(c => c.categoria_id === categoriaExcluir.id).length
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                  {emUso > 0 ? (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      A categoria <strong className="text-slate-800">"{categoriaExcluir.nome}"</strong> está em uso por <strong className="text-slate-800">{emUso} curso{emUso > 1 ? 's' : ''}</strong>. Exclua ou altere a categoria desses cursos antes.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir a categoria <strong className="text-slate-800">"{categoriaExcluir.nome}"</strong>?</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setModalExcluirCategoriaAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
                {emUso === 0 && (
                  <button onClick={handleConfirmarExclusaoCategoria} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal cursos do cargo (checkboxes) */}
      {modalCargoAberto && cargoModal && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[560px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">Cursos do Cargo — {cargoModal.nome}</h3>
              <button onClick={() => setModalCargoAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvarCursosDoCargo} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-3 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Cursos Obrigatórios {cursoIdsCargo.size > 0 ? `(${cursoIdsCargo.size} selecionado${cursoIdsCargo.size > 1 ? 's' : ''})` : ''}
                  </span>
                  {cursoIdsCargo.size > 0 && (
                    <button type="button" onClick={() => setCursoIdsCargo(new Set())} className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors">
                      Limpar seleção
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={buscaCursoDoCargo}
                  onChange={e => setBuscaCursoDoCargo(e.target.value)}
                  placeholder="Filtrar cursos..."
                  className="w-full text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <div className="border border-slate-200 rounded-md max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {(() => {
                    const lista = cursos
                      .filter(c => c.ativo)
                      .filter(c => !buscaCursoDoCargo.trim()
                        || (c.nome || '').toUpperCase().includes(buscaCursoDoCargo.trim().toUpperCase())
                        || (c.categoria_nome || '').toUpperCase().includes(buscaCursoDoCargo.trim().toUpperCase()))
                      .sort((a, b) => cmpTexto(a.categoria_nome, b.categoria_nome) || cmpTexto(a.nome, b.nome))
                    return lista.length === 0 ? (
                      <div className="p-3 text-center text-[11px] text-slate-400">Nenhum curso encontrado.</div>
                    ) : lista.map(c => (
                      <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={cursoIdsCargo.has(c.id)} onChange={() => toggleCursoDoCargo(c.id)} className="w-3.5 h-3.5 shrink-0" />
                        <span className="flex-1">
                          {c.nome}
                          <span className="block text-[10px] font-semibold text-slate-400">{c.categoria_nome || '—'}</span>
                        </span>
                      </label>
                    ))
                  })()}
                </div>
                <ErroForm>{erroCargoCursos}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalCargoAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoCargoCursos} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {salvandoCargoCursos ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal exclusão de curso */}
      {modalExcluirAberto && cursoExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o curso <strong className="text-slate-800">"{cursoExcluir.nome}"</strong>? Os vínculos com cargos também serão removidos.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
