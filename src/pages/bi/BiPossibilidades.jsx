import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Gauge, CalendarDays, Clock, Hourglass, CheckCircle2, AlertTriangle, XCircle,
  Building2, Info, Loader2,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { calcularValoresPorDepartamento } from '../../utils/biDimensoes'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const primeiroDiaMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
const hojeISO = () => new Date().toISOString().slice(0, 10)

// ── Tacômetro (SVG puro) — zonas de status fixas + marcações de escala + ponteiro afilado. ──
function Gauge2({ label, value }) {
  const v = Math.max(0, Math.min(100, value))
  const cx = 90, cy = 92, r = 60
  const ang = (t) => (180 - t * 180) * (Math.PI / 180)
  const ponto = (t, raio = r) => [cx + raio * Math.cos(ang(t)), cy - raio * Math.sin(ang(t))]
  const arco = (tIni, tFim, raio = r) => {
    const [x1, y1] = ponto(tIni, raio)
    const [x2, y2] = ponto(tFim, raio)
    return `M ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2}`
  }
  const cor = v >= 100 ? '#0ca30c' : v >= 80 ? '#fab219' : '#d03b3b'

  // Marcações de escala — maior a cada 20%, menor a cada 10%.
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10)
  // Ponteiro afilado (triângulo fino) + cubo central, como um tacômetro de painel.
  const tAgulha = v / 100
  const [px, py] = ponto(tAgulha, r - 14)
  const perpAng = ang(tAgulha) + Math.PI / 2
  const baseW = 3.2
  const [bx1, by1] = [cx + baseW * Math.cos(perpAng), cy - baseW * Math.sin(perpAng)]
  const [bx2, by2] = [cx - baseW * Math.cos(perpAng), cy + baseW * Math.sin(perpAng)]

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 flex flex-col items-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 text-center leading-tight mb-1 min-h-[20px]">{label}</p>
      <svg viewBox="0 0 180 116" className="w-full max-w-[130px]">
        <path d={arco(0, 0.4)} stroke="#d03b3b" strokeWidth="11" fill="none" />
        <path d={arco(0.4, 0.7)} stroke="#fab219" strokeWidth="11" fill="none" />
        <path d={arco(0.7, 1)} stroke="#0ca30c" strokeWidth="11" fill="none" />

        {/* Marcações de escala */}
        {ticks.map((t, i) => {
          const major = i % 2 === 0
          const [x1, y1] = ponto(t, r + 7)
          const [x2, y2] = ponto(t, r + (major ? 15 : 11))
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#898781" strokeWidth={major ? 1.5 : 1} />
        })}
        {[0, 0.5, 1].map((t, i) => {
          const [lx, ly] = ponto(t, r + 24)
          return (
            <text key={i} x={lx} y={ly + 3} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '8px' }}>
              {Math.round(t * 100)}
            </text>
          )
        })}

        {/* Ponteiro afilado + cubo */}
        <polygon points={`${bx1},${by1} ${bx2},${by2} ${px},${py}`} fill="#334155" />
        <circle cx={cx} cy={cy} r="7" fill="#1e293b" stroke={cor} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
      </svg>
      <p className="text-base font-bold -mt-1" style={{ color: cor }}>{v.toFixed(2)}%</p>
    </div>
  )
}

// ── Gauge de margem — arco de progresso (sem ponteiro), preenche conforme o valor. ──
function GaugeProgresso({ label, value }) {
  const v = Math.max(0, Math.min(100, value))
  const cx = 90, cy = 82, r = 58
  const ang = (t) => (180 - t * 180) * (Math.PI / 180)
  const ponto = (t, raio = r) => [cx + raio * Math.cos(ang(t)), cy - raio * Math.sin(ang(t))]
  // Esse arco nunca passa de 180° (t vai de 0 a 1 = 0°-180°), então a volta "maior" do SVG
  // nunca é a certa — sempre teria que desenhar por baixo do gauge, saindo da área visível.
  // large-arc-flag sempre 0 aqui (bug antigo: calculava `> 0.5` e invertia o arco pra valores
  // acima de 50%).
  const arco = (tIni, tFim, raio = r) => {
    const [x1, y1] = ponto(tIni, raio)
    const [x2, y2] = ponto(tFim, raio)
    return `M ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2}`
  }
  const cor = v >= 100 ? '#0ca30c' : v >= 80 ? '#fab219' : '#d03b3b'

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 flex flex-col items-center">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500 text-center leading-tight mb-1 min-h-[20px]">{label}</p>
      <svg viewBox="0 0 180 100" className="w-full max-w-[130px]">
        <path d={arco(0, 1)} stroke="#e2e8f0" strokeWidth="14" fill="none" strokeLinecap="round" />
        {v > 0 && <path d={arco(0, v / 100)} stroke={cor} strokeWidth="14" fill="none" strokeLinecap="round" />}
      </svg>
      <p className="text-base font-bold -mt-3" style={{ color: cor }}>{v.toFixed(2)}%</p>
    </div>
  )
}

function StatusIcon({ pct }) {
  if (pct >= 100) return <CheckCircle2 className="h-3.5 w-3.5 text-[#0ca30c] shrink-0" />
  if (pct >= 80) return <AlertTriangle className="h-3.5 w-3.5 text-[#fab219] shrink-0" />
  return <XCircle className="h-3.5 w-3.5 text-[#d03b3b] shrink-0" />
}

// Tooltip de info que renderiza via portal em document.body — a tabela usa overflow-x-auto, que
// corta (em vez de só rolar) qualquer tooltip posicionado "absolute" dentro dela.
function InfoTooltip({ texto }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  const mostrar = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left })
    }
    setAberto(true)
  }

  return (
    <span ref={ref} className="cursor-help" onMouseEnter={mostrar} onMouseLeave={() => setAberto(false)}>
      <Info className="h-3.5 w-3.5 text-amber-500" />
      {aberto && pos && createPortal(
        <div
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed normal-case font-normal tracking-normal whitespace-normal shadow-lg"
        >
          {texto}
        </div>,
        document.body
      )}
    </span>
  )
}

// Linha da tabela de faturamento — nível departamento, com meta/real/margem/pass/ticket médio.
function LinhaDepto({ label, indent, negrito, dept, carregandoRealPecas, carregandoRealServicos, carregandoMargemPecas, carregandoMargemServicos, carregandoPass, nomesSemDepartamento }) {
  // Sem arredondar (Math.round) — todas as % da tabela mostram com 2 casas decimais.
  const pctPecas = dept.metaPecas > 0 ? (dept.realPecas / dept.metaPecas) * 100 : 0
  const pctServicos = dept.metaServicos > 0 ? (dept.realServicos / dept.metaServicos) * 100 : 0
  const pctTotal = dept.metaTotal > 0 ? (dept.realTotal / dept.metaTotal) * 100 : 0
  // % Margem = margem em relação ao Real (lucro / faturamento realizado), não tem Meta própria.
  const pctMrgPecas = dept.realPecas > 0 ? (dept.margemPecas / dept.realPecas) * 100 : 0
  const pctMrgServ = dept.realServicos > 0 ? (dept.margemServicos / dept.realServicos) * 100 : 0
  const ticket = dept.pass > 0 ? dept.realTotal / dept.pass : null
  const carregando = carregandoRealPecas || carregandoRealServicos

  return (
    <tr className={`border-b border-slate-200 hover:bg-slate-50 ${negrito ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'}`}>
      <td className={`p-2 whitespace-nowrap sticky left-0 ${negrito ? 'bg-slate-50 text-slate-900' : 'bg-white'}`} style={{ paddingLeft: `${8 + indent * 20}px` }}>
        <span className="inline-flex items-center gap-1.5">
          {label}
          {nomesSemDepartamento && nomesSemDepartamento.length > 0 && (
            <InfoTooltip texto={`Tipo de OS em branco ou não cadastrado com Departamento (corrigir em Tipos de O.S.) — funcionário/tipo de OS da linha: ${nomesSemDepartamento.join(', ')}`} />
          )}
        </span>
      </td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoRealPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctPecas.toFixed(2)}% <StatusIcon pct={pctPecas} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoRealServicos ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctServicos.toFixed(2)}% <StatusIcon pct={pctServicos} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregando ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctTotal.toFixed(2)}% <StatusIcon pct={pctTotal} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgPecas.toFixed(2)}%</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemServicos ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgServ.toFixed(2)}%</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoPass ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : (dept.pass || '—')}</td>
      <td className="p-2 text-right whitespace-nowrap">{ticket !== null ? fmtMoeda(ticket) : '—'}</td>
    </tr>
  )
}

const COLUNAS_FATURAMENTO = [
  'Departamentos', 'Meta Peças', 'Real Peças', '% Peças', 'Meta Serviços', 'Real Serviços', '% Serv.',
  'Meta Total', 'Real Total', '% Real', 'Margem Peças', '% Mrg Peças', 'Margem Serv', '% Mrg Serv', 'Pass', 'Ticket Médio',
]

// BI "Possibilidades - Sintonia do Dia" — reaproveita as metas publicadas (fato_metas_publicadas)
// e o calendário de dias úteis (fato_calendario); Real e Margem ainda não têm fonte conectada
// no sistema (não existe tabela de faturamento realizado), então aparecem zerados por enquanto.
export default function BiPossibilidades() {
  const [empresas, setEmpresas] = useState([])
  const [empresaId, setEmpresaId] = useState('')
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes(new Date()))
  const [dataFim, setDataFim] = useState(hojeISO())
  const [aba, setAba] = useState('entreDatas') // 'entreDatas' | 'noMes'
  const [calendario, setCalendario] = useState([])
  const [metasPublicadas, setMetasPublicadas] = useState([])
  const [loading, setLoading] = useState(true)

  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [tiposOS, setTiposOS] = useState([])

  useEffect(() => {
    // Só empresas dos agrupamentos Caiobá Motos e Caiobá Trucks — "Outras Caiobá" são empresas
    // administrativas/holding (não têm faturamento de peças/serviços pra fazer sentido aqui).
    const AGRUPAMENTOS_FATURAMENTO = ['3d942f69-7f0e-4f1c-bbc0-45a00ca0de85', '219e9965-1808-407e-8459-91e8c6a8a400']
    apiService.getEmpresas().then(lista => setEmpresas((lista || []).filter(e => e.ativo !== false && AGRUPAMENTOS_FATURAMENTO.includes(e.agrupamento_empresa_id)))).catch(() => setEmpresas([]))
    apiService.getDepartamentos().then(lista => setDepartamentos(lista || [])).catch(() => setDepartamentos([]))
    apiService.getSetores().then(lista => setSetores(lista || [])).catch(() => setSetores([]))
    apiService.getTiposOS().then(lista => setTiposOS(lista || [])).catch(() => setTiposOS([]))
  }, [])

  const departamentoPorId = useMemo(() => new Map(departamentos.map(d => [d.id, d.nome_departamento])), [departamentos])
  const setoresPorDepartamento = useMemo(() => {
    const mapa = new Map()
    for (const s of setores) {
      if (!s.departamento_id) continue
      if (!mapa.has(s.departamento_id)) mapa.set(s.departamento_id, [])
      mapa.get(s.departamento_id).push(s)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => a.nome_setor.localeCompare(b.nome_setor, 'pt-BR'))
    return mapa
  }, [setores])

  const empresaLabelSelecionada = useMemo(() => {
    const e = empresas.find(e => e.id === empresaId)
    return e ? (e.nome_empresa_sistema || e.empresa_fantasia || e.nome_empresa) : null
  }, [empresas, empresaId])

  // Medidas de BI com "Slot no Faturamento" (BI — Medidas) alimentam direto uma célula da
  // tabela já existente (Departamentos x Meta/Real/...). Uma chamada só por Medida traz Total +
  // quebra por Departamento/Setor juntos (mesmo arquivo do SharePoint, lido uma vez só — ver
  // `calcularValoresPorDepartamento`). Cada slot atualiza a tela assim que FICA PRONTO (não
  // espera os outros) — com várias Medidas, uma mais lenta não trava as demais.
  const [valoresSlot, setValoresSlot] = useState(() => new Map())
  const [valoresSlotDepto, setValoresSlotDepto] = useState(() => new Map())
  const [valoresSlotSetor, setValoresSlotSetor] = useState(() => new Map())
  const [carregandoSlots, setCarregandoSlots] = useState(() => new Set())
  // Nomes crus (como vêm do arquivo) que caíram em "Sem Departamento" em qualquer Medida com
  // Slot — mostrados no ícone de info da linha, pra não precisar investigar por fora.
  const [nomesSemDepartamento, setNomesSemDepartamento] = useState(() => new Set())

  useEffect(() => {
    let cancelado = false
    apiService.getMedidasBiComFonte().then(medidas => {
      if (cancelado) return
      const comSlot = medidas.filter(m => m.slot_faturamento && m.ativo)
      setCarregandoSlots(new Set(comSlot.map(m => m.slot_faturamento)))
      setValoresSlot(new Map())
      setValoresSlotDepto(new Map())
      setValoresSlotSetor(new Map())
      setNomesSemDepartamento(new Set())
      for (const m of comSlot) {
        calcularValoresPorDepartamento(apiService, m, { empresaLabel: empresaLabelSelecionada, dataInicio, dataFim, tiposOS, setores })
          .catch(() => ({ valorTotal: 0, valoresPorDepartamento: new Map(), valoresPorSetor: new Map(), nomesSemDepartamento: new Set() }))
          .then(({ valorTotal, valoresPorDepartamento, valoresPorSetor, nomesSemDepartamento: nomes }) => {
            if (cancelado) return
            setValoresSlot(prev => new Map(prev).set(m.slot_faturamento, valorTotal))
            setValoresSlotDepto(prev => new Map(prev).set(m.slot_faturamento, valoresPorDepartamento))
            setValoresSlotSetor(prev => new Map(prev).set(m.slot_faturamento, valoresPorSetor))
            setNomesSemDepartamento(prev => new Set([...prev, ...nomes]))
            setCarregandoSlots(prev => { const novo = new Set(prev); novo.delete(m.slot_faturamento); return novo })
          })
      }
    }).catch(() => { if (!cancelado) { setValoresSlot(new Map()); setCarregandoSlots(new Set()); setValoresSlotDepto(new Map()); setValoresSlotSetor(new Map()); setNomesSemDepartamento(new Set()) } })
    return () => { cancelado = true }
  }, [empresaLabelSelecionada, dataInicio, dataFim, tiposOS, setores])

  const valorSlot = (chave) => valoresSlot.get(chave) || 0
  const valorSlotDepto = (chave, deptId) => valoresSlotDepto.get(chave)?.get(deptId) || 0
  const valorSlotSetor = (chave, setorId) => valoresSlotSetor.get(chave)?.get(setorId) || 0
  const carregandoSlot = (chave) => carregandoSlots.has(chave)

  const anoRef = useMemo(() => new Date(dataFim + 'T12:00:00').getFullYear(), [dataFim])
  const mesRef = useMemo(() => new Date(dataFim + 'T12:00:00').getMonth() + 1, [dataFim])
  const empresaCalendario = empresaId || empresas[0]?.id

  // Buscas independentes de propósito — uma falhar (ex: calendário sem dados sincronizados
  // pra essa empresa) não pode zerar a outra (Metas, que já tem dado real publicado).
  useEffect(() => {
    if (!empresaCalendario) return
    setLoading(true)
    apiService.getCalendario(empresaCalendario, anoRef)
      .then(cal => setCalendario(cal || []))
      .catch(() => setCalendario([]))
      .finally(() => setLoading(false))
  }, [empresaCalendario, anoRef])

  useEffect(() => {
    apiService.getTotalGrupoPublicado(anoRef)
      .then(metas => setMetasPublicadas(metas || []))
      .catch(() => setMetasPublicadas([]))
  }, [anoRef])

  // ── Dias Úteis / Trabalhados / Restantes — a partir do calendário (fato_calendario) ──
  const diasInfo = useMemo(() => {
    const linhasMes = calendario.filter(r => r.mes === mesRef)
    if (linhasMes.length === 0) return { uteis: 0, trabalhados: 0, restantes: 0 }
    const uteis = Math.max(...linhasMes.map(r => Number(r.dias_total_mes || 0)))
    const passados = linhasMes.filter(r => r.data <= hojeISO())
    const trabalhados = passados.length ? Math.max(...passados.map(r => Number(r.dias_total_mes || 0))) : 0
    return { uteis, trabalhados, restantes: Math.max(uteis - trabalhados, 0) }
  }, [calendario, mesRef])

  // ── Meta por departamento — a partir das metas publicadas (fato_metas_publicadas) ──
  // Number() nos dois lados: mes/ano podem vir do Supabase como string (ex: coluna numeric),
  // e mesRef/anoRef são sempre number — comparação estrita "8" === 8 falha silenciosamente.
  const metasFiltradas = useMemo(
    () => metasPublicadas.filter(m => Number(m.mes) === mesRef && Number(m.ano) === anoRef && (!empresaId || m.empresa_id === empresaId)),
    [metasPublicadas, mesRef, anoRef, empresaId]
  )

  // Meta por departamento — algumas linhas de fato_metas_publicadas (tipo 'pecas') guardam o
  // valor todo em meta_faturamento (sem meta_pecas/meta_servicos separados); as demais já vêm
  // com meta_pecas/meta_servicos próprios (mecânico/consultor/funilaria/terceiros).
  const somaPorDepartamento = (deptId) => {
    const rows = metasFiltradas.filter(m => (m.departamento_id || '__sem_departamento__') === deptId)
    let metaPecas = 0, metaServicos = 0, metaTotal = 0
    for (const r of rows) {
      metaTotal += Number(r.meta_faturamento || 0)
      if (r.tipo === 'pecas') metaPecas += Number(r.meta_faturamento || 0)
      else { metaPecas += Number(r.meta_pecas || 0); metaServicos += Number(r.meta_servicos || 0) }
    }
    return { metaPecas, metaServicos, metaTotal }
  }

  const somaPorSetor = (setorId) => {
    const rows = metasFiltradas.filter(m => m.setor_id === setorId)
    let metaPecas = 0, metaServicos = 0, metaTotal = 0
    for (const r of rows) {
      metaTotal += Number(r.meta_faturamento || 0)
      if (r.tipo === 'pecas') metaPecas += Number(r.meta_faturamento || 0)
      else { metaPecas += Number(r.meta_pecas || 0); metaServicos += Number(r.meta_servicos || 0) }
    }
    return { metaPecas, metaServicos, metaTotal }
  }

  const comReal = (realPecas, realServicos) => ({ realPecas, realServicos, realTotal: realPecas + realServicos })

  // Linhas de departamento — sempre todos os departamentos cadastrados em /departamentos (na
  // ordem em que já vêm, por nome), mesmo os que ainda não têm Meta/Real nesse período. Sem
  // correspondência de departamento (funcionário não cadastrado, ou Meta antiga sem
  // departamento) cai em "(Sem Departamento)", só quando existir algum valor lá — pra não
  // esconder o dado.
  const idsDepartamento = useMemo(() => {
    const ids = departamentos.map(d => d.id)
    const temSemDepartamento = metasFiltradas.some(m => !m.departamento_id)
      || [...valoresSlotDepto.values()].some(mapa => mapa.has('__sem_departamento__'))
    return temSemDepartamento ? [...ids, '__sem_departamento__'] : ids
  }, [departamentos, metasFiltradas, valoresSlotDepto])

  const linhasDepartamento = idsDepartamento.map(deptId => ({
    deptId,
    label: deptId === '__sem_departamento__' ? '(Sem Departamento)' : (departamentoPorId.get(deptId) || deptId),
    ...somaPorDepartamento(deptId),
    ...comReal(valorSlotDepto('realPecas', deptId), valorSlotDepto('realServicos', deptId)),
    margemPecas: valorSlotDepto('margemPecas', deptId),
    margemServicos: valorSlotDepto('margemServicos', deptId),
    pass: valorSlotDepto('pass', deptId),
  // Só aparece com Realizado de fato — ter Meta sozinha (sem Real/Margem/Pass) não é motivo pra
  // mostrar a linha aqui (Meta já tem tela própria, o Planejamento de Metas).
  })).filter(d => d.realTotal || d.margemPecas || d.margemServicos || d.pass)

  // Linhas de Setor — abaixo de cada Departamento, mesmos setores cadastrados em /departamentos
  // (Setor de Serviço) para aquele departamento. Real/Margem/Pass resolvidos pelo Setor de
  // Serviço do Tipo de OS (dim_tipos_os.setor_servico → dim_setores.nome_setor), igual ao
  // Departamento — não por Funcionário.
  const linhasSetor = (deptId) => (setoresPorDepartamento.get(deptId) || []).map(s => ({
    setorId: s.id,
    label: s.nome_setor,
    ...somaPorSetor(s.id),
    ...comReal(valorSlotSetor('realPecas', s.id), valorSlotSetor('realServicos', s.id)),
    margemPecas: valorSlotSetor('margemPecas', s.id),
    margemServicos: valorSlotSetor('margemServicos', s.id),
    pass: valorSlotSetor('pass', s.id),
  })).filter(s => s.realTotal || s.margemPecas || s.margemServicos || s.pass)

  // Total geral — somado direto de todas as Metas filtradas (não das linhas de departamento
  // acima) e do valor TOTAL de cada Medida (sem corte), que é exato mesmo pra Contagem Distinta
  // (soma dos departamentos poderia contar o mesmo valor 2x se ele aparecer em mais de um).
  const metaGeral = metasFiltradas.reduce((acc, r) => {
    acc.metaTotal += Number(r.meta_faturamento || 0)
    if (r.tipo === 'pecas') acc.metaPecas += Number(r.meta_faturamento || 0)
    else { acc.metaPecas += Number(r.meta_pecas || 0); acc.metaServicos += Number(r.meta_servicos || 0) }
    return acc
  }, { metaPecas: 0, metaServicos: 0, metaTotal: 0 })

  const totalGeral = {
    label: 'Total',
    ...metaGeral,
    ...comReal(valorSlot('realPecas'), valorSlot('realServicos')),
    margemPecas: valorSlot('margemPecas'),
    margemServicos: valorSlot('margemServicos'),
    pass: valorSlot('pass'),
  }

  // ── Gauges — todos dependem de Real/Margem, então ficam em 0% até essa fonte existir ──
  // Mesma conta do "% Mrg Peças"/"% Mrg Serv" da tabela (margem sobre o Real, não tem Meta própria).
  const pctMrgPecas = totalGeral.realPecas > 0 ? (totalGeral.margemPecas / totalGeral.realPecas) * 100 : 0
  const pctMrgServ = totalGeral.realServicos > 0 ? (totalGeral.margemServicos / totalGeral.realServicos) * 100 : 0
  const gaugePecas = totalGeral.metaPecas > 0 ? (totalGeral.realPecas / totalGeral.metaPecas) * 100 : 0
  const gaugeServicos = totalGeral.metaServicos > 0 ? (totalGeral.realServicos / totalGeral.metaServicos) * 100 : 0
  const gaugeTotal = totalGeral.metaTotal > 0 ? (totalGeral.realTotal / totalGeral.metaTotal) * 100 : 0
  const projecao = diasInfo.trabalhados > 0 ? (totalGeral.realTotal / diasInfo.trabalhados) * diasInfo.uteis : 0
  const gaugePossibilidades = totalGeral.metaTotal > 0 ? (projecao / totalGeral.metaTotal) * 100 : 0

  const empresaNome = (e) => e.empresa_fantasia || e.nome_empresa

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS */}
      <div className="relative overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100 via-orange-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
              <Gauge className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Faturamento — Total</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Relatório de Possibilidades — Sintonia do Dia</p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas Fantasia</label>
              <select
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              >
                <option value="">Todos</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{empresaNome(e)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Data</label>
              <div className="flex items-center gap-1.5">
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                <span className="text-slate-400 text-xs">até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AVISO — Real/Margem ainda não conectados */}
      <div className="flex items-start gap-2 rounded-lg border border-[#3987e5]/30 bg-[#3987e5]/10 px-4 py-2.5">
        <Info className="h-3.5 w-3.5 text-[#3987e5] mt-0.5 shrink-0" />
        <p className="text-[11px] text-[#c3c2b7]">
          Meta vem do Planejamento de Metas já publicado (<strong className="text-white">fato_metas_publicadas</strong>). Real, Margem e Passagens da tabela abaixo vêm de Medidas de BI com "Slot no BI" (menu <strong className="text-white">BI — Medidas</strong>) — sem Medida com Slot pra uma coluna, ela fica zerada. Ticket Médio é calculado (Real Total ÷ Passagens).
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Carregando...</div>
      ) : (
        <>
          {/* DIAS ÚTEIS / TRABALHADOS / RESTANTES */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#3987e5]/10 flex items-center justify-center shrink-0"><CalendarDays className="h-4 w-4 text-[#3987e5]" /></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Dias Úteis</p><p className="text-xl font-bold text-slate-900 leading-none mt-1">{diasInfo.uteis.toFixed(1)}</p></div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0ca30c]/10 flex items-center justify-center shrink-0"><Clock className="h-4 w-4 text-[#0ca30c]" /></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Dias Trabalhados</p><p className="text-xl font-bold text-slate-900 leading-none mt-1">{diasInfo.trabalhados.toFixed(1)}</p></div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#fab219]/10 flex items-center justify-center shrink-0"><Hourglass className="h-4 w-4 text-[#fab219]" /></div>
              <div><p className="text-[10px] font-bold uppercase text-slate-400">Dias Restantes</p><p className="text-xl font-bold text-slate-900 leading-none mt-1">{diasInfo.restantes.toFixed(1)}</p></div>
            </div>
          </div>

          {/* GAUGES — Acumulado/Possibilidades (barra de progresso) + Margem (tacômetro), todos na mesma linha */}
          <div className="grid grid-cols-8 gap-3">
            <GaugeProgresso label="Realizado Peças Acum %" value={gaugePecas} />
            <GaugeProgresso label="Realizado Serv. Acum %" value={gaugeServicos} />
            <GaugeProgresso label="Realizado Total Acum %" value={gaugeTotal} />
            <GaugeProgresso label="Possibilidades %" value={gaugePossibilidades} />
            <Gauge2 label="% Margem Venda Peças - Balcão" value={pctMrgPecas} />
            <Gauge2 label="% Margem Venda Peças - Oficina" value={pctMrgPecas} />
            <Gauge2 label="% Margem Venda Peças - Pós Vendas" value={pctMrgPecas} />
            <Gauge2 label="% Margem Venda Serviços" value={pctMrgServ} />
          </div>

          {/* ABAS */}
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
            {[{ key: 'entreDatas', label: 'Faturamento entre Datas' }, { key: 'noMes', label: 'Faturamento no Mês' }].map(t => (
              <button
                key={t.key}
                onClick={() => setAba(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === t.key ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TABELA DE FATURAMENTO */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
            <p className="text-xs font-bold text-slate-900 p-4 pb-0">Tabela de Faturamentos</p>
            <table className="w-full text-left border-collapse mt-3" style={{ minWidth: '1400px' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {COLUNAS_FATURAMENTO.map((c, i) => (
                    <th key={c} className={`p-2 whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-slate-50' : 'text-right'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {linhasDepartamento.map(dept => (
                  <React.Fragment key={dept.deptId}>
                    <LinhaDepto label={dept.label} indent={0} dept={dept}
                      carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                      carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                      carregandoPass={carregandoSlot('pass')}
                      nomesSemDepartamento={dept.deptId === '__sem_departamento__' ? [...nomesSemDepartamento] : null} />
                    {linhasSetor(dept.deptId).map(setor => (
                      <LinhaDepto key={setor.setorId} label={setor.label} indent={1} dept={setor}
                        carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                        carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                        carregandoPass={carregandoSlot('pass')} />
                    ))}
                  </React.Fragment>
                ))}
                <LinhaDepto label="Total" indent={0} negrito dept={totalGeral}
                  carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                  carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                  carregandoPass={carregandoSlot('pass')} />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
