import React, { useEffect, useMemo, useState } from 'react'
import {
  Gauge, CalendarDays, Clock, Hourglass, CheckCircle2, AlertTriangle, XCircle,
  Building2, Info,
} from 'lucide-react'
import { apiService } from '../../services/api'

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
  const arco = (tIni, tFim, raio = r) => {
    const [x1, y1] = ponto(tIni, raio)
    const [x2, y2] = ponto(tFim, raio)
    const largeArc = (tFim - tIni) > 0.5 ? 1 : 0
    return `M ${x1} ${y1} A ${raio} ${raio} 0 ${largeArc} 1 ${x2} ${y2}`
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

// Linha da tabela de faturamento — nível departamento, com meta/real/margem/pass/ticket médio.
function LinhaDepto({ label, indent, negrito, dept }) {
  const pctPecas = dept.metaPecas > 0 ? Math.round((dept.realPecas / dept.metaPecas) * 100) : 0
  const pctServicos = dept.metaServicos > 0 ? Math.round((dept.realServicos / dept.metaServicos) * 100) : 0
  const pctTotal = dept.metaTotal > 0 ? Math.round((dept.realTotal / dept.metaTotal) * 100) : 0
  const pctMrgPecas = 0
  const pctMrgServ = 0
  const ticket = dept.pass > 0 ? dept.realTotal / dept.pass : null

  return (
    <tr className={`border-b border-slate-200 hover:bg-slate-50 ${negrito ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'}`}>
      <td className={`p-2 whitespace-nowrap sticky left-0 ${negrito ? 'bg-slate-50 text-slate-900' : 'bg-white'}`} style={{ paddingLeft: `${8 + indent * 20}px` }}>{label}</td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.realPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctPecas}% <StatusIcon pct={pctPecas} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.realServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctServicos}% <StatusIcon pct={pctServicos} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.metaTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(dept.realTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end w-full">{pctTotal}% <StatusIcon pct={pctTotal} /></span></td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(0)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgPecas}%</td>
      <td className="p-2 text-right whitespace-nowrap">{fmtMoeda(0)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgServ}%</td>
      <td className="p-2 text-right whitespace-nowrap">{dept.pass || '—'}</td>
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

  useEffect(() => {
    apiService.getEmpresas().then(lista => setEmpresas((lista || []).filter(e => e.ativo !== false))).catch(() => setEmpresas([]))
  }, [])

  const anoRef = useMemo(() => new Date(dataFim + 'T12:00:00').getFullYear(), [dataFim])
  const mesRef = useMemo(() => new Date(dataFim + 'T12:00:00').getMonth() + 1, [dataFim])
  const empresaCalendario = empresaId || empresas[0]?.id

  useEffect(() => {
    if (!empresaCalendario) return
    setLoading(true)
    Promise.all([
      apiService.getCalendario(empresaCalendario, anoRef),
      apiService.getTotalGrupoPublicado(anoRef),
    ]).then(([cal, metas]) => {
      setCalendario(cal || [])
      setMetasPublicadas(metas || [])
    }).catch(() => { setCalendario([]); setMetasPublicadas([]) })
      .finally(() => setLoading(false))
  }, [empresaCalendario, anoRef])

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
  const metasFiltradas = useMemo(
    () => metasPublicadas.filter(m => m.mes === mesRef && m.ano === anoRef && (!empresaId || m.empresa_id === empresaId)),
    [metasPublicadas, mesRef, anoRef, empresaId]
  )

  const somaPorTipo = (tipo) => {
    const rows = metasFiltradas.filter(m => m.tipo === tipo)
    const total = rows.reduce((s, r) => s + Number(r.meta_faturamento || 0), 0)
    if (tipo === 'pecas') return { metaPecas: total, metaServicos: 0, metaTotal: total }
    const pecas = rows.reduce((s, r) => s + Number(r.meta_pecas || 0), 0)
    const servicos = rows.reduce((s, r) => s + Number(r.meta_servicos || 0), 0)
    return { metaPecas: pecas, metaServicos: servicos, metaTotal: total }
  }

  // Real/Margem/Pass ainda não têm fonte de dados — zerados até serem integrados (ver nota na tela).
  const semReal = { realPecas: 0, realServicos: 0, realTotal: 0, pass: 0 }

  const balcao = { label: 'Balcão Peças', ...somaPorTipo('pecas'), ...semReal }
  const mecanica = { label: 'Mecânica', ...somaPorTipo('mecanico'), ...semReal }
  const funilaria = { label: 'Funilaria/Pintura', ...somaPorTipo('funilaria'), ...semReal }
  const oficina = {
    label: 'Oficina',
    metaPecas: mecanica.metaPecas + funilaria.metaPecas,
    metaServicos: mecanica.metaServicos + funilaria.metaServicos,
    metaTotal: mecanica.metaTotal + funilaria.metaTotal,
    ...semReal,
  }
  const totalGeral = {
    label: 'Total',
    metaPecas: balcao.metaPecas + oficina.metaPecas,
    metaServicos: balcao.metaServicos + oficina.metaServicos,
    metaTotal: balcao.metaTotal + oficina.metaTotal,
    ...semReal,
  }

  // ── Gauges — todos dependem de Real/Margem, então ficam em 0% até essa fonte existir ──
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
          Meta vem do Planejamento de Metas já publicado (<strong className="text-white">fato_metas_publicadas</strong>). Real, Margem, Pass e Ticket Médio ainda não têm uma fonte de dados conectada no sistema — aparecem zerados até serem integrados.
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
            <Gauge2 label="% Margem Venda Peças - Balcão" value={0} />
            <Gauge2 label="% Margem Venda Peças - Oficina" value={0} />
            <Gauge2 label="% Margem Venda Peças - Pós Vendas" value={0} />
            <Gauge2 label="% Margem Venda Serviços" value={0} />
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
            <p className="text-xs font-bold text-slate-900 p-4 pb-0">{aba === 'entreDatas' ? 'Faturamento entre Datas' : 'Faturamento no Mês'}</p>
            <table className="w-full text-left border-collapse mt-3" style={{ minWidth: '1400px' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {COLUNAS_FATURAMENTO.map((c, i) => (
                    <th key={c} className={`p-2 whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-slate-50' : 'text-right'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                <LinhaDepto label="1. Balcão Peças" indent={0} negrito dept={balcao} />
                <LinhaDepto label="2. Oficina" indent={0} negrito dept={oficina} />
                <LinhaDepto label="Funilaria/Pintura" indent={1} dept={funilaria} />
                <LinhaDepto label="Mecânica" indent={1} dept={mecanica} />
                <LinhaDepto label="Total" indent={0} negrito dept={totalGeral} />
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
