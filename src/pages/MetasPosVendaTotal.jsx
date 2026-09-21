import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { TrendingUp, ChevronRight, ChevronDown, Loader2, Calculator, CheckCircle2, Ban, AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import BotaoIconeTooltip from '../components/BotaoIconeTooltip'
import { apiService } from '../services/api'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, empresasDasMetas } from '../components/EmpresaMultiFilter'
import { valoresMetaMecanico, resolverPosicaoMecanico } from '../utils/metasMecanico'
import { agruparPorSegmento } from '../utils/segmentoMarca'
import { referenciasConsultor } from '../utils/referenciasConsultor'
import { aggColabs, aggBox, aggSetor, aggDept, aggEmp, aggDeptDedup, aggEmpDedup, montarArvoreTotal } from '../utils/totalPosVendas'
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

// Situação do Setor: pendente se qualquer mês com valor de qualquer colaborador dele não estiver aprovado.
const statusSetor = (setor) => {
  let tem = false, pend = false
  Object.values(setor.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
    if (co.tem) tem = true
    if (co.pend) pend = true
  }))
  return { tem, label: pend ? 'AGUARDANDO APROVACAO' : 'APROVADO' }
}

// Aprovação por setor. Peças aprova por setor. O Mecânico está vinculado ao consultor e segue a aprovação dele;
// só quando a empresa não tem consultor (ex.: unidades de Motos) o Mecânico é aprovado por conta própria.
// kind: 'pecas' | 'consultor' | 'mecanico' | null (sem aprovação própria).
const infoAprovacaoSetor = (setor, empNode) => {
  const tipos = new Set()
  Object.values(setor.boxes).forEach(b => Object.values(b.colabs).forEach(co => co.linhas.forEach(l => tipos.add(l._tipo))))
  const empresaTemConsultor = Object.values(empNode.depts).some(d => Object.values(d.setores).some(s2 =>
    Object.values(s2.boxes).some(b => Object.values(b.colabs).some(co => co.linhas.some(l => l._tipo === 'CONSULTOR')))))
  const kind = tipos.has('PECAS') ? 'pecas'
    : tipos.has('CONSULTOR') ? 'consultor'
    : (tipos.has('MECANICO') && !empresaTemConsultor) ? 'mecanico'
    : null
  if (!kind) return { kind: null }
  const st = statusSetor(setor)
  let pend = st.label === 'AGUARDANDO APROVACAO'
  let tem = st.tem
  if (kind === 'consultor' || kind === 'mecanico') {
    // A situação considera todos os mecânicos da empresa (a aprovação vale para todos juntos).
    if (kind === 'mecanico') { pend = false; tem = false }
    Object.values(empNode.depts).forEach(d => Object.values(d.setores).forEach(s2 => Object.values(s2.boxes).forEach(b => Object.values(b.colabs).forEach(co => {
      if (co.linhas.some(l => l._tipo === 'MECANICO')) { if (co.tem) tem = true; if (co.pend) pend = true }
    }))))
  }
  return { kind, pend, tem }
}

const SEM_FILTRO = []

// Selo de status do Setor / Departamento na Gestão de Aprovação: "Pendente" ou "Aprovado".
const SeloStatus = ({ pend }) => (
  <span className={`px-2 py-0.5 rounded-full text-[10px] font-normal whitespace-nowrap ${pend ? STATUS_CLS['AGUARDANDO APROVACAO'] : STATUS_CLS['APROVADO']}`}>
    {pend ? STATUS_DISPLAY['AGUARDANDO APROVACAO'] : STATUS_DISPLAY['APROVADO']}
  </span>
)

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

export default function MetasPosVendaTotal({ modoAprovacao = false, anoExterno = null, aoAlterarAprovacao = null } = {}) {
  const { hasPermission, isAdminEfetivo } = useAuth()
  const canEdit = hasPermission('/metas/gestao-aprovacao', 'editar')
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
  const [filtroVisuSalvo,    setFiltroVisu]    = useSessionState('mpvs_servicos_visu', 'total')
  // Na Gestão de Aprovação a tela usa o ano da própria página, sem filtro de empresa e sempre com o total.
  const filtroAno     = anoExterno ?? filtroAnoSalvo
  const filtroEmpresa = modoAprovacao ? SEM_FILTRO : filtroEmpresaSalvo
  const filtroVisu    = modoAprovacao ? 'total' : filtroVisuSalvo
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
      setRowsPecas(filtrarPorEmpresas(pecas, filtroEmpresa))
      setRowsMecanico(filtrarPorEmpresas(mecanico, filtroEmpresa))
      setRowsConsultor(filtrarPorEmpresas(consultor, filtroEmpresa))
      setRowsTerceiros(filtrarPorEmpresas(terceiros, filtroEmpresa))
      setRowsFunilaria(filtrarPorEmpresas(funilaria, filtroEmpresa))
    } catch (err) { setError(err.message || String(err)) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [filtroEmpresa, filtroAno])

  // Aprovar / Pendênciar um setor (Peças: só o setor; Serviços: consultores + mecânicos da empresa).
  const executarAcao = async () => {
    if (!confirmAcao) return
    const { acao, kind, empresaId, setorId } = confirmAcao
    setAcaoRodando(`${empresaId}|${setorId}`); setConfirmAcao(null)
    try {
      if (kind === 'pecas') {
        if (acao === 'aprovar') await apiService.approveMetasPecasSetor(empresaId, filtroAno, setorId)
        else await apiService.unapproveMetasPecasSetor(empresaId, filtroAno, setorId)
      } else if (kind === 'mecanico') {
        if (acao === 'aprovar') await apiService.approveMetasMecanicoEmpresa(empresaId, filtroAno)
        else await apiService.unapproveMetasMecanicoEmpresa(empresaId, filtroAno)
      } else if (acao === 'aprovar') {
        await apiService.approveMetasConsultorEmpresa(empresaId, filtroAno)
        await apiService.approveMetasMecanicoEmpresa(empresaId, filtroAno)
      } else {
        await apiService.unapproveMetasConsultorEmpresa(empresaId, filtroAno)
        await apiService.unapproveMetasMecanicoEmpresa(empresaId, filtroAno)
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

  const expandirTudo = () => {
    const keys = new Set()
    Object.entries(tree).forEach(([eId, emp]) => {
      const eKey = `emp-${eId}`; keys.add(eKey)
      Object.entries(emp.depts || {}).forEach(([dId, dept]) => {
        const dKey = `${eKey}-d-${dId}`; keys.add(dKey)
        Object.entries(dept.setores || {}).forEach(([sId, setor]) => {
          const sKey = `${dKey}-s-${sId}`; keys.add(sKey)
          Object.keys(setor.boxes || {}).forEach(bId => keys.add(`${sKey}-b-${bId}`))
        })
      })
    })
    setExpanded(keys)
    setGrupoAberto(true)
    setSegAbertos(new Set(agruparPorSegmento(Object.entries(tree), empresas).map(([l]) => l)))
  }

  const recolherTudo = () => { setExpanded(new Set()); setSegAbertos(new Set()); setGrupoAberto(false) }
  const tudoExpandido = expanded.size > 0 && Object.keys(tree).every(eId => expanded.has(`emp-${eId}`))

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

  const empBlocos = empList.map(emp => {
    const eId   = emp.id
    const eNome = emp.empresa_fantasia || emp.empresa_nome || eId
    const eKey  = `emp-${eId}`

    const empNode = tree[eId]
    const vTotal  = empNode ? aggEmpDedup(empNode) : Array(12).fill(0)

    const empOpen = isOpen(eKey)
    const childRows = []

    // Empresa com algum setor (Peças / Consultores) pendente de aprovação, e se tem algo aprovável.
    let temPend = false, temAprov = false
    if (modoAprovacao && empNode) {
      Object.values(empNode.depts).forEach(d => Object.values(d.setores).forEach(st => {
        const ap = infoAprovacaoSetor(st, empNode)
        if (ap.kind && ap.tem) { temAprov = true; if (ap.pend) temPend = true }
      }))
    }

    if (empOpen && empNode) {
      Object.entries(empNode.depts).forEach(([dId, dept]) => {
        const dVals = aggDeptDedup(dept)
        if (sumArr(dVals) === 0) return
        const dKey = `${eKey}-d-${dId}`
        let dPend = false, dTem = false
        if (modoAprovacao) {
          Object.values(dept.setores).forEach(st => {
            const ap = infoAprovacaoSetor(st, empNode)
            if (ap.kind && ap.tem) { dTem = true; if (ap.pend) dPend = true }
          })
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
                {modoAprovacao && dTem && <SeloStatus pend={dPend} />}
              </span>
            </td>
            {mCells(dVals, dKey)}
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
          const sSit = statusSetor(setor)
          let sSituacao = sSit.tem
            ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_CLS[sSit.label]}`}>{STATUS_DISPLAY[sSit.label]}</span>
            : null
          let statusNome = null
          if (modoAprovacao) {
            // Status logo depois do nome do setor; ícones de Aprovar / Pendênciar na última coluna.
            const ap = infoAprovacaoSetor(setor, empNode)
            statusNome = ap.kind && ap.tem
              ? <SeloStatus pend={ap.pend} />
              : null
            const chaveAcao = `${eId}|${sId}`
            const info = { kind: ap.kind, empresaId: eId, empresaNome: eNome, setorId: sId, setorNome: setor.nome }
            sSituacao = ap.kind ? (
              <span className="inline-flex items-center gap-1">
                <BotaoIconeTooltip Icone={CheckCircle2} tom="verde" dica="Aprovar este setor"
                  disabled={!canEdit || !ap.pend} carregando={acaoRodando === chaveAcao}
                  onClick={() => setConfirmAcao({ ...info, acao: 'aprovar' })} />
                <BotaoIconeTooltip Icone={Ban} tom="vermelho"
                  dica={isAdminEfetivo ? 'Pendenciar: limpar a aprovação (somente administrador)' : 'Somente o administrador pode pendenciar'}
                  disabled={!canEdit || !isAdminEfetivo} carregando={acaoRodando === chaveAcao}
                  onClick={() => setConfirmAcao({ ...info, acao: 'pendenciar' })} />
              </span>
            ) : null
          }
          childRows.push(
            <tr key={sKey} className="bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={e => { e.stopPropagation(); tog(sKey) }}>
              <td className={`pl-14 pr-2 py-1 text-xs text-slate-700 whitespace-nowrap sticky left-0 z-[5] bg-slate-50 ${W1}`}>
                <span className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 ${modoAprovacao ? 'w-[16.25rem] shrink-0' : ''}`}>
                    {isOpen(sKey) ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
                    <span className="text-slate-400 mr-0.5">Setor:</span>
                    <span className="font-semibold">{setor.nome}</span>
                  </span>
                  {statusNome}
                </span>
              </td>
              {mCells(sVals, sKey, false, sSituacao)}
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
        <td className={`pl-6 pr-2 py-2 text-sm font-bold text-emerald-950 whitespace-nowrap ${modoAprovacao ? 'sticky left-0 z-[5] bg-emerald-100' : ''} ${W1}`}>
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
        <td className={`pl-3 pr-2 py-2 text-sm font-bold text-sky-950 whitespace-nowrap ${modoAprovacao ? 'sticky left-0 z-[5] bg-sky-100' : ''} ${W1}`}>
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
      <td className={`pl-3 pr-2 py-2.5 text-sm font-bold text-slate-900 whitespace-nowrap ${modoAprovacao ? 'sticky left-0 z-[5] bg-slate-300' : ''} ${W1}`}>
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Total Pós-Vendas</h1>
            <p className="text-xs text-slate-400">Consolidado de Peças · Consultores · Mecânicos · Terceiros</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className={SEL}>
          {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="w-64"><EmpresaMultiFilter value={filtroEmpresa} onChange={setFiltroEmpresa} empresas={empresas} /></div>
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
        {loading && <Loader2 size={18} className="animate-spin text-indigo-500" />}
      </div>
      </>)}

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
              <th className={`px-3 py-2 text-left text-xs font-semibold text-slate-600 whitespace-nowrap ${modoAprovacao ? 'sticky left-0 z-20 bg-slate-100 ' + W1 : 'min-w-[260px]'}`}>
                <div className="flex items-center gap-2">
                  <span>Empresa</span>
                  {Object.keys(tree).length > 0 && (
                    <button
                      onClick={tudoExpandido ? recolherTudo : expandirTudo}
                      title={tudoExpandido ? 'Recolher tudo' : 'Expandir tudo'}
                      className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 text-slate-500 transition-colors whitespace-nowrap"
                    >
                      {tudoExpandido ? '− Recolher' : '+ Expandir'}
                    </button>
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
                {modoAprovacao ? 'Aprovação' : 'Situação'}
              </th>
            </tr>
          </thead>
          <tbody>
            {!loading && empRows.length === 0 && (
              <tr>
                <td colSpan={15} className="py-16 text-center text-slate-400 text-sm">
                  Nenhum dado encontrado para os filtros selecionados.
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
              <h2 className="text-lg font-bold text-slate-800 mb-2">{confirmAcao.acao === 'aprovar' ? 'Aprovar setor' : 'Pendenciar setor'}</h2>
              <p className="text-sm text-slate-600">
                {confirmAcao.acao === 'aprovar'
                  ? <>Aprovar os valores de <strong>{confirmAcao.setorNome}</strong> em <strong>{confirmAcao.empresaNome}</strong> ({filtroAno})? Ao aprovar, os valores são publicados e espelhados no Power BI.</>
                  : <>Os valores de <strong>{confirmAcao.setorNome}</strong> em <strong>{confirmAcao.empresaNome}</strong> ({filtroAno}) voltarão para <strong className="text-amber-700">pendente</strong>. O que já foi publicado no Power BI é mantido até um diretor aprovar de novo.</>}
              </p>
              {confirmAcao.kind === 'consultor' && (
                <p className="text-xs text-slate-500 mt-2">O serviço dos mecânicos está vinculado ao consultor: a ação vale para os consultores e mecânicos desta empresa.</p>
              )}
              {confirmAcao.kind === 'mecanico' && (
                <p className="text-xs text-slate-500 mt-2">Esta empresa não tem consultores: a ação vale para todos os setores de mecânico dela.</p>
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
