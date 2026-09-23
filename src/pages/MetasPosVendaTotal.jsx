import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { TrendingUp, ChevronRight, ChevronDown, Loader2, Calculator, CheckCircle2, Ban, AlertTriangle, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BotaoIconeTooltip from '../components/BotaoIconeTooltip'
import TooltipTexto from '../components/TooltipTexto'
import { apiService } from '../services/api'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, empresasDasMetas } from '../components/EmpresaMultiFilter'
import { valoresMetaMecanico, resolverPosicaoMecanico } from '../utils/metasMecanico'
import { agruparPorSegmento } from '../utils/segmentoMarca'
import { referenciasConsultor } from '../utils/referenciasConsultor'
import { aggColabs, aggBox, aggSetor, aggDept, aggEmp, aggDeptDedup, aggEmpDedup, montarArvoreTotal, linhaPendente } from '../utils/totalPosVendas'
import { LogoGrupo, LogoSegmento } from '../components/LogosMarca'
import CalculoFuncionarioModal from '../components/CalculoFuncionarioModal'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Moeda contábil: R$ na frente, negativo entre parênteses, 2 casas (mesmo padrão das demais abas).
const fmtBRL = (v) => {
  const n = Number(v)
  if (!n && n !== 0) return '—'
  const s = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}
const sumArr = (a) => a.reduce((s, v) => s + v, 0)

const STATUS_CLS = { 'AGUARDANDO APROVACAO': 'bg-amber-100 text-amber-700', 'APROVADO': 'bg-green-100 text-green-700' }
const STATUS_DISPLAY = { 'AGUARDANDO APROVACAO': 'Pendente', 'APROVADO': 'Aprovado' }

// Situação do Departamento (a aprovação é por departamento, não por setor): pendente se qualquer mês com
// valor de qualquer colaborador de qualquer setor dele não estiver aprovado.
const statusDept = (dept) => {
  let tem = false, pend = false
  Object.values(dept.setores).forEach(setor => Object.values(setor.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
    if (co.tem) tem = true
    if (co.pend) pend = true
  })))
  return { tem, label: pend ? 'AGUARDANDO APROVACAO' : 'APROVADO' }
}

// Aprovação por departamento. O departamento Oficina aprova Consultores + Mecânica + Funilaria/Pintura juntos
// (o Mecânico está vinculado ao Consultor; só quando a empresa não tem consultor — ex.: unidades de Motos —
// o Mecânico é aprovado por conta própria). Peças aprova pelo(s) setor(es) do departamento Balcão Peças.
// kind: 'pecas' | 'consultor' | 'mecanico' | null (sem aprovação própria).
const infoAprovacaoDept = (dept, empNode) => {
  const setorEntries = Object.entries(dept.setores)
  const tipos = new Set()
  setorEntries.forEach(([, s]) => Object.values(s.boxes).forEach(b => Object.values(b.colabs).forEach(co => co.linhas.forEach(l => tipos.add(l._tipo)))))
  const empresaTemConsultor = Object.values(empNode.depts).some(d => Object.values(d.setores).some(s2 =>
    Object.values(s2.boxes).some(b => Object.values(b.colabs).some(co => co.linhas.some(l => l._tipo === 'CONSULTOR')))))
  const kind = tipos.has('PECAS') ? 'pecas'
    : tipos.has('CONSULTOR') ? 'consultor'
    : (tipos.has('MECANICO') && !empresaTemConsultor) ? 'mecanico'
    : null
  if (!kind) return { kind: null }
  let pend = false, tem = false
  const linhasAprov = []
  const setorIdsPecas = []
  if (kind !== 'mecanico') {
    // Peças: soma cada setor do departamento (normalmente só um). Consultor: os setores de origem
    // (Mecânica / Funilaria) onde a distribuição do consultor está lançada.
    const alvo = kind === 'pecas' ? 'PECAS' : 'CONSULTOR'
    setorEntries.forEach(([sId, s]) => {
      let sTem = false, sPend = false
      Object.values(s.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
        if (co.linhas.some(l => l._tipo === alvo)) {
          if (co.tem) sTem = true
          if (co.pend) sPend = true
          co.linhas.forEach(l => { if (l._tipo === alvo) linhasAprov.push(l) })
        }
      }))
      if (sTem) { tem = true; if (kind === 'pecas') setorIdsPecas.push(sId) }
      if (sPend) pend = true
    })
  }
  if (kind === 'consultor' || kind === 'mecanico') {
    // A situação considera todos os mecânicos da empresa (a aprovação vale para todos juntos).
    Object.values(empNode.depts).forEach(d => Object.values(d.setores).forEach(s2 => Object.values(s2.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
      if (co.linhas.some(l => l._tipo === 'MECANICO')) {
        if (co.tem) tem = true
        if (co.pend) pend = true
        co.linhas.forEach(l => { if (l._tipo === 'MECANICO') linhasAprov.push(l) })
      }
    }))))
  }
  return { kind, pend, tem, ultimo: ultimaAprovacao(linhasAprov), setorIdsPecas }
}

const SEM_FILTRO = []

// Corta a árvore pelos filtros de Departamento / Setor / Box / busca de Funcionário — os VALORES exibidos
// (totais de cada linha, inclusive Empresa/Segmento/Grupo) passam a refletir só o que sobrou do corte.
// A situação de aprovação (pend/aprovado, botões) nunca usa esta árvore podada — sempre a árvore cheia,
// porque aprovar/pendenciar vale pro departamento inteiro, não só pro que está filtrado no momento.
function arvorePorFiltro(tree, { depto, setor, box, busca }) {
  if (!depto && !setor && !box && !busca) return tree
  const termo = (busca || '').trim().toLowerCase()
  const out = {}
  Object.entries(tree).forEach(([eId, emp]) => {
    const depts = {}
    Object.entries(emp.depts || {}).forEach(([dId, dept]) => {
      if (depto && dId !== depto) return
      const setores = {}
      Object.entries(dept.setores || {}).forEach(([sId, st]) => {
        if (setor && sId !== setor) return
        const boxesOut = {}
        Object.entries(st.boxes || {}).forEach(([bId, bx]) => {
          if (box && bId !== box) return
          const colabs = {}
          Object.entries(bx.colabs || {}).forEach(([coId, co]) => {
            if (termo && !(co.nome || '').toLowerCase().includes(termo)) return
            colabs[coId] = co
          })
          if (Object.keys(colabs).length) boxesOut[bId] = { ...bx, colabs }
        })
        if (Object.keys(boxesOut).length) setores[sId] = { ...st, boxes: boxesOut }
      })
      if (Object.keys(setores).length) depts[dId] = { ...dept, setores }
    })
    if (Object.keys(depts).length) out[eId] = { ...emp, depts }
  })
  return out
}

// Selo de status do Setor / Departamento na Gestão de Aprovação: "Pendente" ou "Aprovado".
const textoAprovacao = (ap) => {
  if (!ap?.em) return null
  const quando = new Date(ap.em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  return ap.por ? `Aprovado por ${ap.por} em ${quando}` : `Aprovado em ${quando}`
}
const SeloStatus = ({ pend, aprovacao }) => {
  const selo = pend ? (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-normal whitespace-nowrap">
      <AlertTriangle size={10} /> Pendente
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300 text-[10px] font-normal whitespace-nowrap">
      <CheckCircle2 size={10} /> Aprovado
    </span>
  )
  return pend ? selo : <TooltipTexto texto={textoAprovacao(aprovacao)}>{selo}</TooltipTexto>
}
// Aprovação mais recente entre as linhas já aprovadas (quem e quando).
const ultimaAprovacao = (linhas) => {
  let ult = null
  linhas.forEach(l => {
    const grav = Number(l._grav ?? l.meta_faturamento) || 0
    if (!grav || linhaPendente(grav, l.meta_aprovada) || !l.aprovado_em) return
    if (!ult || new Date(l.aprovado_em) > new Date(ult.em)) ult = { em: l.aprovado_em, por: l.aprovado_por_nome || null }
  })
  return ult
}

// Situação pequena dos níveis de agrupamento (Gestão de Aprovação): alerta "Pendente" se houver algo
// pendente; "Aprovado" se houver valores e nada pendente; nada se o nível não tem aprovação própria.
const SituacaoNivel = ({ pend, tem }) => {
  if (pend) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-normal whitespace-nowrap">
      <AlertTriangle size={10} /> Pendente
    </span>
  )
  if (tem) return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 border border-green-300 text-[10px] font-normal whitespace-nowrap">
      <CheckCircle2 size={10} /> Aprovado
    </span>
  )
  return null
}

const SEL = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL2 = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

// somenteAprovado: mesma árvore da Gestão de Aprovação, só leitura e apenas com o que já está aprovado (aba Geral do Total Grupo).
export default function MetasPosVendaTotal({ modoAprovacao: modoAprovacaoProp = false, somenteAprovado = false, anoExterno = null, empresasExterno = null, filtroVisuExterno = null, setFiltroVisuExterno = null, aoAlterarAprovacao = null } = {}) {
  const modoAprovacao = modoAprovacaoProp || somenteAprovado
  const podeAgir = modoAprovacaoProp
  const { hasPermission, hasAction, usuarioId, userNome } = useAuth()
  const canEdit = hasPermission('/metas/gestao-aprovacao', 'editar')
  const podePendenciar = hasAction('/metas/gestao-aprovacao', 'pendenciar')
  const [empresas,      setEmpresas]      = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [setores,       setSetores]       = useState([])
  const [boxes,         setBoxes]         = useState([])
  const [cargos,        setCargos]        = useState([])
  const [funcionarios,  setFuncionarios]  = useState([])
  const [rowsPecas,     setRowsPecas]     = useState([])
  const [rowsMecanico,  setRowsMecanico]  = useState([])
  const [rowsConsultor, setRowsConsultor] = useState([])
  const [rowsTerceiros, setRowsTerceiros] = useState([])
  const [rowsFunilaria, setRowsFunilaria] = useState([])
  const [filtroAnoSalvo,     setFiltroAno]     = useSessionState('mpvs_servicos_ano', anoAtual)
  const [filtroEmpresaSalvo, setFiltroEmpresa] = useSessionState('mpvs_servicos_empresas', [])
  const [filtroVisuSalvo,    setFiltroVisuAntigo] = useSessionState('mpvs_servicos_visu', 'total')
  // Na Gestão de Aprovação a tela usa o ano e as empresas da própria página e sempre o total.
  const filtroAno     = anoExterno ?? filtroAnoSalvo
  const filtroEmpresa = empresasExterno ?? (modoAprovacao ? SEM_FILTRO : filtroEmpresaSalvo)
  // Empresa/Ano vêm de fora (cabeçalho compartilhado das abas, ou da própria Gestão de Aprovação).
  const filtrosExternos = anoExterno != null || empresasExterno != null
  const filtroVisu    = modoAprovacao ? 'total' : (filtroVisuExterno ?? filtroVisuSalvo)
  const setFiltroVisu = setFiltroVisuExterno ?? setFiltroVisuAntigo
  const W1 = modoAprovacao ? 'w-[27rem] min-w-[27rem] max-w-[27rem]' : ''
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)
  const [expanded,      setExpanded]      = useState(new Set())
  const [segAbertos,   setSegAbertos]   = useState(new Set())
  const [grupoAberto,  setGrupoAberto]  = useState(true)
  const [calcAberto,    setCalcAberto]    = useState(null)
  const [confirmAcao,   setConfirmAcao]   = useState(null) // { acao, kind, empresaId, empresaNome, setorId, setorNome }
  const [acaoRodando,   setAcaoRodando]   = useState(null) // chave do setor em andamento

  // Referência do setor (Mecânica + Terceiros, ou Funilaria/Pintura) por mês — mesma regra da aba Consultor.
  const refsDoConsultor = (empresaId, setorId, setorNome) =>
    referenciasConsultor(empresaId, setorId, setorNome, { rowsMecanico, rowsTerceiros, rowsFunilaria, funcionarios, boxes, setores })

  const abrirCalculo = (colab, eNome) => {
    const primeira = colab.linhas[0]
    const cons = colab.linhas.find(l => l._tipo === 'CONSULTOR')
    setCalcAberto({
      nome: colab.nome, empresa: eNome, empresaId: primeira?.empresa_id, ano: filtroAno, linhas: colab.linhas,
      refs: cons ? refsDoConsultor(cons.empresa_id, cons._setorOrigemId ?? cons.setor_id, cons._setorOrigemNome ?? cons.setor_nome) : null,
    })
  }

  const tog    = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const isOpen = (key) => expanded.has(key)

  const loadAll = async () => {
    setLoading(true); setError(null)
    try {
      const empId = empresaParam(filtroEmpresa)
      const [emps, depts, sets, bxs, cargs, funcs, pecas, mecanico, consultor, terceiros, funilaria] = await Promise.all([
        apiService.getEmpresas(),
        apiService.getDepartamentos(),
        apiService.getSetores(),
        apiService.getBox(),
        apiService.getCargos(),
        apiService.getFuncionarios(),
        apiService.getMetasPecas(empId, filtroAno),
        apiService.getMetasMecanico(empId, filtroAno),
        apiService.getMetasConsultor(empId, filtroAno),
        apiService.getMetasTerceiros(empId, filtroAno),
        apiService.getMetasFunilaria(empId, filtroAno),
      ])
      const sortedEmps = [...empresasDasMetas(emps)].sort((a,b) => (a.empresa_fantasia||'').localeCompare(b.empresa_fantasia||''))
      setEmpresas(sortedEmps)
      setDepartamentos(depts)
      setSetores(sets)
      setBoxes(bxs)
      setCargos(cargs)
      setFuncionarios(funcs)
      // Só aprovado: descarta o mês que nunca foi aprovado ou que mudou depois da aprovação.
      const aprov = (rows, valor = r => Number(r.meta_faturamento) || 0) =>
        somenteAprovado ? rows.filter(r => { const v = valor(r); return v > 0 && !linhaPendente(v, r.meta_aprovada) }) : rows
      const valorMecanico = r => { const v = valoresMetaMecanico(r); return v.meta_servicos + v.meta_pecas }
      setRowsPecas(aprov(filtrarPorEmpresas(pecas, filtroEmpresa)))
      setRowsMecanico(aprov(filtrarPorEmpresas(mecanico, filtroEmpresa), valorMecanico))
      setRowsConsultor(aprov(filtrarPorEmpresas(consultor, filtroEmpresa)))
      setRowsTerceiros(aprov(filtrarPorEmpresas(terceiros, filtroEmpresa)))
      setRowsFunilaria(filtrarPorEmpresas(funilaria, filtroEmpresa))
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [filtroEmpresa, filtroAno])

  // Aprovar / Pendênciar um departamento (Peças: os setores dele; Oficina: consultores + mecânicos da empresa).
  const executarAcao = async () => {
    if (!confirmAcao) return
    const { acao, kind, empresaId, deptId, setorIds } = confirmAcao
    const usuario = { id: usuarioId, nome: userNome }
    setAcaoRodando(`${empresaId}|${deptId}`); setConfirmAcao(null)
    try {
      if (kind === 'pecas') {
        for (const sId of (setorIds || [])) {
          if (acao === 'aprovar') await apiService.approveMetasPecasSetor(empresaId, filtroAno, sId, usuario)
          else await apiService.unapproveMetasPecasSetor(empresaId, filtroAno, sId, usuario)
        }
      } else if (kind === 'mecanico') {
        if (acao === 'aprovar') await apiService.approveMetasMecanicoEmpresa(empresaId, filtroAno, usuario)
        else await apiService.unapproveMetasMecanicoEmpresa(empresaId, filtroAno, usuario)
      } else if (acao === 'aprovar') {
        await apiService.approveMetasConsultorEmpresa(empresaId, filtroAno, usuario)
        await apiService.approveMetasMecanicoEmpresa(empresaId, filtroAno, usuario)
      } else {
        await apiService.unapproveMetasConsultorEmpresa(empresaId, filtroAno, usuario)
        await apiService.unapproveMetasMecanicoEmpresa(empresaId, filtroAno, usuario)
      }
      await loadAll()
      aoAlterarAprovacao?.()
    } catch (err) { setError(err.message || String(err)) }
    finally { setAcaoRodando(null) }
  }

  // Árvore unificada: Peças + Consultor + Mecânico (inclui Produtivo Não Associado Funilaria) + Terceiros
  const tree = useMemo(
    () => montarArvoreTotal({ rowsPecas, rowsMecanico, rowsConsultor, rowsTerceiros, funcionarios, cargos, boxes, setores, departamentos, filtroVisu }),
    [rowsPecas, rowsMecanico, rowsConsultor, rowsTerceiros, funcionarios, cargos, boxes, setores, departamentos, filtroVisu]
  )

  // Filtros de Departamento / Setor / Box / Funcionário (busca) — só na aba Total (não em modo Aprovação).
  const [filtroDepto, setFiltroDepto] = useSessionState('mpvt_depto', '')
  const [filtroSetorT,setFiltroSetorT]= useSessionState('mpvt_setor', '')
  const [filtroBoxT,  setFiltroBoxT]  = useSessionState('mpvt_box', '')
  const [filtroColab, setFiltroColab] = useSessionState('mpvt_colab', '')

  const departamentosDisponiveis = useMemo(() => {
    const seen = new Map()
    Object.values(tree).forEach(emp => Object.entries(emp.depts || {}).forEach(([id, d]) => { if (!seen.has(id)) seen.set(id, d.nome) }))
    return [...seen.entries()].map(([id, nome]) => ({ id, nome })).sort((a,b) => (a.nome||'').localeCompare(b.nome||''))
  }, [tree])

  const setoresTDisponiveis = useMemo(() => {
    const seen = new Map()
    Object.values(tree).forEach(emp => Object.entries(emp.depts || {}).forEach(([dId, d]) => {
      if (filtroDepto && dId !== filtroDepto) return
      Object.entries(d.setores || {}).forEach(([id, s]) => { if (!seen.has(id)) seen.set(id, s.nome) })
    }))
    return [...seen.entries()].map(([id, nome]) => ({ id, nome })).sort((a,b) => (a.nome||'').localeCompare(b.nome||''))
  }, [tree, filtroDepto])

  const boxesTDisponiveis = useMemo(() => {
    const seen = new Map()
    Object.values(tree).forEach(emp => Object.entries(emp.depts || {}).forEach(([dId, d]) => {
      if (filtroDepto && dId !== filtroDepto) return
      Object.entries(d.setores || {}).forEach(([sId, s]) => {
        if (filtroSetorT && sId !== filtroSetorT) return
        Object.entries(s.boxes || {}).forEach(([id, b]) => { if (!seen.has(id)) seen.set(id, b.nome) })
      })
    }))
    return [...seen.entries()].map(([id, nome]) => ({ id, nome })).sort((a,b) => (a.nome||'').localeCompare(b.nome||''))
  }, [tree, filtroDepto, filtroSetorT])

  // Árvore filtrada por Departamento/Setor/Box/Funcionário — usada pra exibir (valores e navegação). A
  // situação de aprovação usa sempre a árvore cheia (`tree`), buscada por eId/dId conforme necessário.
  const treeFiltrada = useMemo(
    () => arvorePorFiltro(tree, { depto: filtroDepto, setor: filtroSetorT, box: filtroBoxT, busca: filtroColab }),
    [tree, filtroDepto, filtroSetorT, filtroBoxT, filtroColab]
  )

  // Chaves de cada nível da árvore: Grupo > Segmento > Empresa > Departamento > Setor > Box.
  const niveisChaves = () => {
    const emps = [], depts = [], sets = [], bxs = []
    Object.entries(treeFiltrada).forEach(([eId, emp]) => {
      const eKey = `emp-${eId}`; emps.push(eKey)
      Object.entries(emp.depts || {}).forEach(([dId, dept]) => {
        const dKey = `${eKey}-d-${dId}`; depts.push(dKey)
        Object.entries(dept.setores || {}).forEach(([sId, setor]) => {
          const sKey = `${dKey}-s-${sId}`; sets.push(sKey)
          Object.keys(setor.boxes || {}).forEach(bId => bxs.push(`${sKey}-b-${bId}`))
        })
      })
    })
    const segs = agruparPorSegmento(Object.entries(treeFiltrada), empresas).map(([l]) => l)
    return { segs, emps, depts, sets, bxs }
  }

  // Expandir abre um nível por clique (Segmento, Empresa, Departamento, Setor, Box); Recolher fecha tudo até o
  // agrupamento (Segmento - Marca), com o Grupo Caiobá aberto.
  const expandirNivel = () => {
    const n = niveisChaves()
    const abrir = (chaves) => setExpanded(prev => new Set([...prev, ...chaves]))
    if (!grupoAberto) { setGrupoAberto(true); return }
    if (n.segs.some(l => !segAbertos.has(l))) { setSegAbertos(new Set(n.segs)); return }
    if (n.emps.some(k => !expanded.has(k))) { abrir(n.emps); return }
    if (n.depts.some(k => !expanded.has(k))) { abrir(n.depts); return }
    if (n.sets.some(k => !expanded.has(k))) { abrir(n.sets); return }
    abrir(n.bxs)
  }

  const recolherTudo = () => { setExpanded(new Set()); setSegAbertos(new Set()); setGrupoAberto(true) }
  const tudoExpandido = (() => {
    if (!grupoAberto) return false
    const n = niveisChaves()
    return n.segs.every(l => segAbertos.has(l)) && [...n.emps, ...n.depts, ...n.sets, ...n.bxs].every(k => expanded.has(k))
  })()
  const algoAberto = expanded.size > 0 || segAbertos.size > 0

  useEffect(() => {
    if (filtroEmpresa.length) {
      setExpanded(prev => {
        const n = new Set(prev)
        filtroEmpresa.forEach(id => n.add(`emp-${id}`))
        return n
      })
    }
  }, [filtroEmpresa])

  const mCells = (vals, prefix, emphTotal = false, situacao = null) => [
    ...vals.map((v, i) => (
      <td key={`${prefix}-m${i}`} className="px-2 py-1 text-right text-xs whitespace-nowrap text-slate-700">
        {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
      </td>
    )),
    <td key={`${prefix}-tot`} className={`px-2 py-1 text-right text-xs font-semibold whitespace-nowrap ${emphTotal ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-700'}`}>
      {sumArr(vals) > 0 ? fmtBRL(sumArr(vals)) : <span className="text-slate-300">—</span>}
    </td>,
    <td key={`${prefix}-sit`} className="px-2 py-1 text-center whitespace-nowrap">{situacao}</td>,
  ]

  // Só entram empresas com algum valor lançado em Mecânico, Consultor ou Peças.
  const empresasComValor = useMemo(() => {
    const ids = new Set()
    rowsPecas.forEach(r => { if (Number(r.meta_faturamento) > 0) ids.add(r.empresa_id) })
    rowsConsultor.forEach(r => { if (Number(r.meta_faturamento) > 0 || Number(r.percentual) > 0) ids.add(r.empresa_id) })
    rowsMecanico.forEach(r => { const v = valoresMetaMecanico(r); if (v.meta_servicos + v.meta_pecas > 0) ids.add(r.empresa_id) })
    return ids
  }, [rowsPecas, rowsConsultor, rowsMecanico])

  const empList = empresas
    .filter(e => empresasComValor.has(e.id))
    .filter(e => !filtroEmpresa.length || filtroEmpresa.includes(e.id))
    .filter(e => !!treeFiltrada[e.id]) // some da lista quando os filtros de Departamento/Setor/Box/Funcionário não deixam nada

  const empBlocos = empList.map(emp => {
    const eId   = emp.id
    const eNome = emp.empresa_fantasia || emp.empresa_nome || eId
    const eKey  = `emp-${eId}`

    // empNode (podado): usado pros valores exibidos, que refletem só o que passou nos filtros.
    // empNodeFull (cheio): usado pra situação de aprovação, que é sempre do departamento inteiro.
    const empNode = treeFiltrada[eId]
    const empNodeFull = tree[eId]
    const vTotal  = empNode ? aggEmpDedup(empNode) : Array(12).fill(0)

    const empOpen = isOpen(eKey)
    const childRows = []

    // Empresa com algum setor (Peças / Consultores) pendente de aprovação, e se tem algo aprovável.
    let temPend = false, temAprov = false
    if (modoAprovacao && empNodeFull) {
      Object.values(empNodeFull.depts).forEach(d => {
        const ap = infoAprovacaoDept(d, empNodeFull)
        if (ap.kind && ap.tem) { temAprov = true; if (ap.pend) temPend = true }
      })
    }

    if (empOpen && empNode) {
      Object.entries(empNode.depts).forEach(([dId, dept]) => {
        const dVals = aggDeptDedup(dept)
        if (sumArr(dVals) === 0) return
        const dKey = `${eKey}-d-${dId}`
        // Situação de aprovação sempre pelo departamento cheio (não pelo filtrado).
        const deptFull = empNodeFull?.depts?.[dId]
        let apDept = { kind: null }
        if (modoAprovacao && deptFull) apDept = infoAprovacaoDept(deptFull, empNodeFull)
        const dTem = !!(apDept.kind && apDept.tem)
        const dPend = dTem && apDept.pend
        // Ícones de Aprovar / Pendênciar ficam na linha do Departamento (a aprovação é por departamento).
        // Fora do modo Aprovação, a mesma linha mostra o selo Pendente/Aprovado do departamento (situação
        // por departamento em todas as abas — não mais por setor).
        let dSituacao = null
        if (apDept.kind && podeAgir) {
          const chaveAcao = `${eId}|${dId}`
          const info = { kind: apDept.kind, empresaId: eId, empresaNome: eNome, deptId: dId, deptNome: dept.nome, setorIds: apDept.setorIdsPecas }
          dSituacao = (
            <span className="inline-flex items-center gap-1">
              <BotaoIconeTooltip Icone={CheckCircle2} tom="verde" dica="Aprovar este departamento"
                disabled={!canEdit || !apDept.pend} carregando={acaoRodando === chaveAcao}
                onClick={() => setConfirmAcao({ ...info, acao: 'aprovar' })} />
              <BotaoIconeTooltip Icone={Ban} tom="vermelho"
                dica={podePendenciar ? 'Pendenciar: limpar a aprovação' : 'Você não tem a ação Pendenciar liberada (Grupos de Acesso)'}
                disabled={!canEdit || !podePendenciar} carregando={acaoRodando === chaveAcao}
                onClick={() => setConfirmAcao({ ...info, acao: 'pendenciar' })} />
            </span>
          )
        } else if (!modoAprovacao) {
          const dSit = statusDept(dept)
          dSituacao = dSit.tem
            ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_CLS[dSit.label]}`}>{STATUS_DISPLAY[dSit.label]}</span>
            : null
        }
        childRows.push(
          <tr key={dKey} className="bg-emerald-50 hover:bg-emerald-100 cursor-pointer" onClick={e => { e.stopPropagation(); tog(dKey) }}>
            <td className={`pl-8 pr-2 py-1.5 text-xs font-bold text-slate-800 whitespace-nowrap sticky left-0 z-[5] bg-emerald-50 ${W1}`}>
              <span className="flex items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 ${modoAprovacao ? 'w-[17.75rem] shrink-0' : ''}`}>
                  {isOpen(dKey) ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  <span className="text-slate-500 font-normal mr-0.5">Departamento:</span>
                  {dept.nome}
                </span>
                {modoAprovacao && dTem && <SeloStatus pend={dPend} aprovacao={apDept.ultimo} />}
              </span>
            </td>
            {mCells(dVals, dKey, false, dSituacao)}
          </tr>
        )
        if (!isOpen(dKey)) return

        const setorEntries = Object.entries(dept.setores).sort(([,a],[,b]) => {
          const aFun = (a.nome || '').toLowerCase().includes('funilaria') ? 1 : 0
          const bFun = (b.nome || '').toLowerCase().includes('funilaria') ? 1 : 0
          if (aFun !== bFun) return aFun - bFun
          return (a.nome || '').localeCompare(b.nome || '')
        })
        setorEntries.forEach(([sId, setor]) => {
          const sVals = aggSetor(setor)
          if (sumArr(sVals) === 0) return
          const sKey = `${dKey}-s-${sId}`
          childRows.push(
            <tr key={sKey} className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={e => { e.stopPropagation(); tog(sKey) }}>
              <td className={`pl-14 pr-2 py-1 text-xs text-slate-700 whitespace-nowrap sticky left-0 z-[5] bg-slate-50 ${W1}`}>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 ${modoAprovacao ? 'w-[16.25rem] shrink-0' : ''}`}>
                    {isOpen(sKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                    <span className="text-slate-400 mr-0.5">Setor:</span>
                    <span className="font-semibold">{setor.nome}</span>
                  </span>
                </span>
              </td>
              {mCells(sVals, sKey)}
            </tr>
          )
          if (!isOpen(sKey)) return

          Object.entries(setor.boxes).forEach(([bId, box]) => {
            const bVals = aggBox(box)
            if (sumArr(bVals) === 0) return
            const bKey = `${sKey}-b-${bId}`
            childRows.push(
              <tr key={bKey} className="bg-white hover:bg-amber-50/30 cursor-pointer border-b border-slate-100" onClick={e => { e.stopPropagation(); tog(bKey) }}>
                <td className={`pl-[4.5rem] pr-2 py-1 text-xs text-slate-600 whitespace-nowrap sticky left-0 z-[5] bg-white ${W1}`}>
                  <span className="flex items-center gap-1">
                    {isOpen(bKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                    <span className="text-slate-400 mr-0.5">Box:</span>
                    <span className="font-semibold">{box.nome}</span>
                  </span>
                </td>
                {mCells(bVals, bKey)}
              </tr>
            )
            if (!isOpen(bKey)) return

            Object.entries(box.colabs).forEach(([coId, colab]) => {
              if (sumArr(colab.meses) === 0) return
              const coKey = `${bKey}-co-${coId}`
              childRows.push(
                <tr key={coKey} className="border-b border-slate-100 hover:bg-indigo-50/30">
                  <td className={`pl-20 pr-2 py-1 text-xs text-slate-800 whitespace-nowrap font-semibold sticky left-0 z-[5] bg-white ${W1}`}>
                    <span className="inline-flex items-center gap-1.5">
                      {colab.nome}
                      {!String(coId).startsWith('__ter__') && (
                        <button type="button" title="Ver cálculo" onClick={e => { e.stopPropagation(); abrirCalculo(colab, eNome) }}
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-0.5 transition-colors">
                          <Calculator size={13} />
                        </button>
                      )}
                    </span>
                  </td>
                  {mCells(colab.meses, coKey)}
                </tr>
              )
            })
          })
        })
      })
    }

    const linhas = [
      <tr key={eKey}
        className="cursor-pointer hover:bg-emerald-200 border-t border-emerald-200 bg-emerald-100"
        onClick={() => tog(eKey)}>
        <td className={`pl-6 pr-2 py-2 text-sm font-bold text-emerald-950 whitespace-nowrap sticky left-0 z-[5] bg-emerald-100 ${W1}`}>
          <span className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 ${modoAprovacao ? 'w-[18.25rem] shrink-0' : ''}`}>
              {empOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
              {eNome}
            </span>
            {modoAprovacao && <SituacaoNivel pend={temPend} tem={temAprov} />}
          </span>
        </td>
        {vTotal.map((v,i) => (
          <td key={i} className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap text-emerald-900">
            {v > 0 ? fmtBRL(v) : <span className="text-slate-300">—</span>}
          </td>
        ))}
        <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-emerald-900 bg-emerald-200">
          {fmtBRL(sumArr(vTotal))}
        </td>
        <td />
      </tr>,
      ...childRows,
    ]
    return { emp, vTotal, linhas, temPend, temAprov }
  })

  // Nível acima da Empresa: SEGMENTO - MARCA (ex.: MOTOS - HONDA).
  const segRows = agruparPorSegmento(empBlocos.map(b => [b.emp.id, b]), empresas).flatMap(([segLabel, blocos]) => {
    const segMeses = Array(12).fill(0)
    blocos.forEach(([, b]) => b.vTotal.forEach((v, i) => { segMeses[i] += v }))
    const segAberto = segAbertos.has(segLabel)
    return [
      <tr key={`seg-${segLabel}`} className="cursor-pointer bg-sky-100 hover:bg-sky-50 border-t-2 border-sky-300"
          onClick={() => setSegAbertos(prev => { const n = new Set(prev); n.has(segLabel) ? n.delete(segLabel) : n.add(segLabel); return n })}>
        <td className={`pl-3 pr-2 py-2 text-sm font-bold text-sky-950 whitespace-nowrap sticky left-0 z-[5] bg-sky-100 ${W1}`}>
          <span className="flex items-center gap-1.5"><span className={`inline-flex items-center gap-1.5 ${modoAprovacao ? 'w-[19rem] shrink-0' : ''}`}>{segAberto ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}{segLabel}<LogoSegmento rotulo={segLabel} /></span>{modoAprovacao && <SituacaoNivel pend={blocos.some(([, b]) => b.temPend)} tem={blocos.some(([, b]) => b.temAprov)} />}</span>
        </td>
        {segMeses.map((v, i) => (
          <td key={i} className="px-2 py-2 text-right text-xs font-semibold whitespace-nowrap text-sky-900">{v > 0 ? fmtBRL(v) : '—'}</td>
        ))}
        <td className="px-2 py-2 text-right text-xs font-bold whitespace-nowrap text-sky-900 bg-sky-200">{fmtBRL(sumArr(segMeses))}</td>
        <td />
      </tr>,
      ...(segAberto ? blocos.flatMap(([, b]) => b.linhas) : []),
    ]
  })

  // Primeiro nível: Grupo Caiobá (soma das empresas exibidas), igual às outras abas.
  const grupoMeses = Array(12).fill(0)
  empBlocos.forEach(b => b.vTotal.forEach((v, i) => { grupoMeses[i] += v }))
  const empRows = segRows.length === 0 ? [] : [
    <tr key="grupo" className="cursor-pointer bg-slate-300 hover:bg-slate-200 transition-colors" onClick={() => setGrupoAberto(v => !v)}>
      <td className={`pl-3 pr-2 py-2.5 text-sm font-bold text-slate-900 whitespace-nowrap sticky left-0 z-[5] bg-slate-300 ${W1}`}>
        <span className="flex items-center gap-1.5"><span className={`inline-flex items-center gap-2 ${modoAprovacao ? 'w-[19rem] shrink-0' : ''}`}>{grupoAberto ? <ChevronDown size={15}/> : <ChevronRight size={15}/>}Grupo Caiobá<LogoGrupo /></span>{modoAprovacao && <SituacaoNivel pend={empBlocos.some(b => b.temPend)} tem={empBlocos.some(b => b.temAprov)} />}</span>
      </td>
      {grupoMeses.map((v, i) => (
        <td key={i} className="px-2 py-2.5 text-right text-xs font-bold whitespace-nowrap text-slate-800">{v > 0 ? fmtBRL(v) : '—'}</td>
      ))}
      <td className="px-2 py-2.5 text-right text-xs font-bold whitespace-nowrap text-indigo-900 bg-slate-400">{fmtBRL(sumArr(grupoMeses))}</td>
      <td />
    </tr>,
    ...(grupoAberto ? segRows : []),
  ]

  return (
    <div className={modoAprovacao ? 'flex flex-col gap-4' : 'flex flex-col h-full p-6 gap-4'}>
      {modoAprovacao && loading && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Carregando...</div>}
      {!modoAprovacao && (<>
      {/* Cabeçalho e Empresa/Ano só aparecem quando a tela não está embutida numa página que já os tem
          (ex.: acima das abas de Planejamento de Metas - Pós-Vendas). */}
      {!filtrosExternos && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Total Pós-Vendas</h1>
              <p className="text-xs text-slate-400">Consolidado de Peças · Consultores · Mecânicos · Terceiros</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {!filtrosExternos && (
          <>
            <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className={SEL}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="w-64"><EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresas} /></div>
          </>
        )}
        {!filtrosExternos && (
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-semibold">
            {[
              { key: 'total',    label: 'Total' },
              { key: 'pecas',    label: 'Peças' },
              { key: 'servicos', label: 'Serviços' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFiltroVisu(key)}
                className={`px-3 py-2 transition-colors ${filtroVisu === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
        {loading && <Loader2 size={18} className="animate-spin text-indigo-500" />}
      </div>
      </>)}

      {/* Filtros de Departamento / Setor / Box e busca por Funcionário — em todas as abas, inclusive na
          Gestão de Aprovação (só decidem o que aparece; não mudam valores nem a situação de aprovação). */}
      <div className="flex flex-col gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Departamento</label>
            <select className={SEL2} value={filtroDepto} onChange={e => { setFiltroDepto(e.target.value); setFiltroSetorT(''); setFiltroBoxT('') }}>
              <option value="">Todos os departamentos</option>
              {departamentosDisponiveis.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Setor</label>
            <select className={SEL2} value={filtroSetorT} onChange={e => { setFiltroSetorT(e.target.value); setFiltroBoxT('') }}>
              <option value="">Todos os setores</option>
              {setoresTDisponiveis.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Box</label>
            <select className={SEL2} value={filtroBoxT} onChange={e => setFiltroBoxT(e.target.value)}>
              <option value="">Todos os boxes</option>
              {boxesTDisponiveis.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </div>
          <div className="flex-1 max-w-xs">
            <label className={LBL}>Funcionário</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" className={`${SEL2} pl-8`} placeholder="Buscar por nome..." value={filtroColab} onChange={e => setFiltroColab(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Table */}
      <div className={`${modoAprovacao ? '' : 'flex-1'} overflow-auto rounded-xl border border-slate-200 bg-white`}>
        <table className="w-full border-collapse min-w-[1400px]">
          <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200">
            <tr>
              <th className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap sticky left-0 z-20 bg-slate-100 ${modoAprovacao ? W1 : 'min-w-[260px]'}`}>
                <div className="flex items-center gap-2">
                  <span>Empresa</span>
                  {Object.keys(treeFiltrada).length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      {!tudoExpandido && (
                        <button onClick={expandirNivel} title="Expandir o próximo nível"
                          className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-500 transition-colors whitespace-nowrap">
                          + Expandir
                        </button>
                      )}
                      {algoAberto && (
                        <button onClick={recolherTudo} title="Recolher tudo"
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-500 transition-colors whitespace-nowrap">
                          − Recolher
                        </button>
                      )}
                    </span>
                  )}
                </div>
              </th>
              {MESES_ABR.map(m => (
                <th key={m} className="px-2 py-2 text-right text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {m}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold text-slate-600 whitespace-nowrap bg-slate-200">
                Total
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-slate-600 whitespace-nowrap">
                {podeAgir ? 'Ação' : somenteAprovado ? '' : 'Situação'}
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && empRows.length === 0 && (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400 text-sm">
                  {somenteAprovado ? 'Nenhuma meta aprovada para o ano selecionado.' : 'Nenhum dado encontrado para os filtros selecionados.'}
                </td>
              </tr>
            )}
            {empRows}
          </tbody>
        </table>
      </div>
      {calcAberto && <CalculoFuncionarioModal dados={calcAberto} onClose={() => setCalcAberto(null)} />}

      {confirmAcao && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmAcao(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-2">{confirmAcao.acao === 'aprovar' ? 'Aprovar departamento' : 'Pendenciar departamento'}</h2>
              <p className="text-sm text-slate-600">
                {confirmAcao.acao === 'aprovar'
                  ? <>Aprovar os valores do departamento <strong>{confirmAcao.deptNome}</strong> em <strong>{confirmAcao.empresaNome}</strong> ({filtroAno})? Ao aprovar, os valores são publicados e espelhados no Power BI.</>
                  : <>Os valores do departamento <strong>{confirmAcao.deptNome}</strong> em <strong>{confirmAcao.empresaNome}</strong> ({filtroAno}) voltarão para <strong className="text-amber-700">pendente</strong>. O que já foi publicado no Power BI é mantido até uma nova aprovação.</>}
              </p>
              {confirmAcao.kind === 'consultor' && (
                <p className="text-xs text-slate-500 mt-2">O serviço dos mecânicos está vinculado ao consultor: a ação vale para os consultores e mecânicos de todo o departamento Oficina desta empresa.</p>
              )}
              {confirmAcao.kind === 'mecanico' && (
                <p className="text-xs text-slate-500 mt-2">Esta empresa não tem consultores: a ação vale para todos os mecânicos do departamento Oficina dela.</p>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setConfirmAcao(null)} className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Cancelar</button>
              <button onClick={executarAcao}
                className={`flex-1 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors ${confirmAcao.acao === 'aprovar' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {confirmAcao.acao === 'aprovar' ? 'Aprovar' : 'Pendenciar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
