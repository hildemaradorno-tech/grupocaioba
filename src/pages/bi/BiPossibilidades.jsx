import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CalendarDays, Clock, Hourglass, CheckCircle2, AlertTriangle, XCircle,
  Building2, Info, Loader2, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react'
import { apiService } from '../../services/api'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import logoCaioba from '../../assets/logo-grupo.png'
import { resolverPorDepartamento, resolverPorFuncionario, normalizaBusca } from '../../utils/biDimensoes'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const primeiroDiaMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
// Data local (não toISOString, que é UTC e no MS já vira o dia seguinte a partir das 20h).
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Padrão ao abrir a tela: do 1º dia do mês de ontem até ontem (o dia de hoje ainda não fechou).
const ontem = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d }

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
      <p className="text-sm font-bold -mt-1" style={{ color: cor }}>{v.toFixed(2)}%</p>
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
      <p className="text-sm font-bold -mt-3" style={{ color: cor }}>{v.toFixed(2)}%</p>
    </div>
  )
}

// Indicador compacto de dias (cabeçalho): ícone + rótulo + valor numa pílula discreta. Altura fixa
// de 30px = mesma dos campos de empresa/data ao lado, pra ficarem alinhados na mesma linha.
function DiaInfo({ icon: Icon, cor, label, valor }) {
  return (
    <div className="flex items-center gap-1.5 h-[30px] rounded-full bg-white/80 border border-slate-200 pl-1 pr-3 shadow-sm">
      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center" style={{ backgroundColor: `${cor}1a` }}>
        <Icon className="h-3.5 w-3.5" style={{ color: cor }} />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-900 tabular-nums">{Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
    </div>
  )
}

// Linha de indicadores (gauges): 8 posições de mesmo tamanho, sempre preenchidas a partir da
// DIREITA — abas com menos indicadores (ex.: Balcão) ficam encostadas à direita da página.
const POSICOES_GAUGES = 8
// esquerda: conteúdo opcional ocupando as posições livres à esquerda (ex.: seletor de Modo na aba Serviços).
function LinhaGauges({ children, esquerda = null }) {
  const itens = React.Children.toArray(children)
  const vazios = Math.max(POSICOES_GAUGES - itens.length, 0)
  return (
    <div className="grid grid-cols-8 gap-3">
      {esquerda && vazios > 0
        ? <div style={{ gridColumn: `span ${vazios}` }}>{esquerda}</div>
        : Array.from({ length: vazios }, (_, i) => <div key={`vazio-${i}`} />)}
      {itens}
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

// Seletor de empresas com várias seleções, agrupado por Agrupamento (Caiobá Trucks / Caiobá Motos):
// marcar o agrupamento marca todas as empresas dele. Nenhuma marcada = Todos. Lista em portal
// (o cabeçalho tem overflow-hidden e cortaria um dropdown posicionado "absolute").
function SeletorEmpresas({ empresas, selecionadas, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const nome = (e) => e.empresa_fantasia || e.nome_empresa

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const e of empresas) {
      const g = e.agrupamento_nome || 'Outras'
      if (!mapa.has(g)) mapa.set(g, [])
      mapa.get(g).push(e)
    }
    for (const lista of mapa.values()) lista.sort((a, b) => nome(a).localeCompare(nome(b), 'pt-BR'))
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [empresas])

  const sel = new Set(selecionadas)
  const toggleEmpresa = (id) => onChange(sel.has(id) ? selecionadas.filter(x => x !== id) : [...selecionadas, id])
  const toggleGrupo = (lista) => {
    const ids = lista.map(e => e.id)
    const todas = ids.every(id => sel.has(id))
    onChange(todas ? selecionadas.filter(id => !ids.includes(id)) : [...new Set([...selecionadas, ...ids])])
  }

  const resumo = (() => {
    if (selecionadas.length === 0) return 'Todos'
    const gruposCheios = grupos.filter(([, lista]) => lista.every(e => sel.has(e.id)))
    const idsCheios = new Set(gruposCheios.flatMap(([, lista]) => lista.map(e => e.id)))
    if (gruposCheios.length && selecionadas.every(id => idsCheios.has(id))) return gruposCheios.map(([g]) => g).join(' + ')
    if (selecionadas.length === 1) return nome(empresas.find(e => e.id === selecionadas[0]) || {}) || '1 empresa'
    return `${selecionadas.length} empresas`
  })()

  const abrir = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
    }
    setAberto(a => !a)
  }

  return (
    <>
      <button ref={ref} type="button" onClick={abrir}
        className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-w-[180px] flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[360px] overflow-y-auto">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionadas.length === 0 ? 'text-amber-700' : ''}`}>
              Todos
            </button>
            {grupos.map(([grupo, lista]) => {
              const marcadas = lista.filter(e => sel.has(e.id)).length
              return (
                <div key={grupo} className="border-t border-slate-100 mt-1 pt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-bold uppercase text-[11px] text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-amber-600"
                      checked={marcadas === lista.length}
                      ref={el => { if (el) el.indeterminate = marcadas > 0 && marcadas < lista.length }}
                      onChange={() => toggleGrupo(lista)} />
                    {grupo}
                  </label>
                  {lista.map(e => (
                    <label key={e.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-amber-600" checked={sel.has(e.id)} onChange={() => toggleEmpresa(e.id)} />
                      {nome(e)}
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// Linha da tabela de faturamento — nível departamento, com meta/real/margem/pass/ticket médio.
// soBalcao: aba Balcão — só as colunas de venda de peças (sem Serviços, Total, Passagens e Ticket).
function LinhaDepto({ label, indent, negrito, dept, carregandoRealPecas, carregandoRealServicos, carregandoMargemPecas, carregandoMargemServicos, carregandoPass, nomesSemDepartamento, soBalcao = false, dias, semMeta = false, semMargem = false }) {
  // Sem arredondar (Math.round) — todas as % da tabela mostram com 2 casas decimais.
  const pctPecas = dept.metaPecas > 0 ? (dept.realPecas / dept.metaPecas) * 100 : 0
  const pctServicos = dept.metaServicos > 0 ? (dept.realServicos / dept.metaServicos) * 100 : 0
  const pctTotal = dept.metaTotal > 0 ? (dept.realTotal / dept.metaTotal) * 100 : 0
  // % Margem = margem em relação ao Real (lucro / faturamento realizado), não tem Meta própria.
  const pctMrgPecas = dept.realPecas > 0 ? (dept.margemPecas / dept.realPecas) * 100 : 0
  const pctMrgServ = dept.realServicos > 0 ? (dept.margemServicos / dept.realServicos) * 100 : 0
  // Ticket = Real ÷ Passagens. realTicket (quando vier) exclui o Real sem passagem (Balcão = venda
  // direta, sem OS) — senão o Total dividia o Balcão pelas passagens da Oficina e inflava o ticket.
  const ticket = dept.pass > 0 ? (dept.realTicket ?? dept.realTotal) / dept.pass : null
  const carregando = carregandoRealPecas || carregandoRealServicos
  const ehDepto = !negrito && indent === 0
  // Possibilidade = Real projetado até o fim do mês (Real ÷ Dias Trabalhados × Dias Úteis); % contra
  // a meta CHEIA do mês da linha (mesma conta do gauge Possibilidades). No Balcão, só Peças.
  const realBase = soBalcao ? dept.realPecas : dept.realTotal
  const metaMesBase = soBalcao ? dept.metaMesPecas : dept.metaMesTotal
  const possibilidade = dias?.trabalhados > 0 ? (realBase / dias.trabalhados) * dias.uteis : 0
  const pctPossib = metaMesBase > 0 ? (possibilidade / metaMesBase) * 100 : 0
  const celulasPossib = (
    <>
      <td className="p-2 text-right whitespace-nowrap">{carregando ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(possibilidade)}</td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : <span className="inline-flex items-center gap-1 justify-end w-full">{pctPossib.toFixed(2)}% <StatusIcon pct={pctPossib} /></span>}</td>
    </>
  )

  return (
    // Total = cinza/negrito; linha de Departamento (indent 0) = verde claro/semi-negrito; Setor = branco.
    <tr className={`border-b border-slate-200 ${negrito ? 'bg-slate-100 font-bold text-slate-900' : ehDepto ? 'bg-emerald-50 font-semibold text-slate-900 hover:bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'}`}>
      <td className={`p-2 whitespace-nowrap sticky left-0 ${negrito ? 'bg-slate-100 text-slate-900' : ehDepto ? 'bg-emerald-50' : 'bg-white'}`} style={{ paddingLeft: `${8 + indent * 20}px` }}>
        <span className="inline-flex items-center gap-1.5">
          {label}
          {nomesSemDepartamento && nomesSemDepartamento.length > 0 && (
            <InfoTooltip texto={`Tipo de OS em branco ou não cadastrado com Departamento (corrigir em Tipos de O.S.) — funcionário/tipo de OS da linha: ${nomesSemDepartamento.join(', ')}`} />
          )}
        </span>
      </td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : fmtMoeda(dept.metaPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoRealPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : <span className="inline-flex items-center gap-1 justify-end w-full">{pctPecas.toFixed(2)}% <StatusIcon pct={pctPecas} /></span>}</td>
      {soBalcao ? (
        <>
          {celulasPossib}
          <td className="p-2 text-right whitespace-nowrap">{carregandoMargemPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemPecas)}</td>
          <td className="p-2 text-right whitespace-nowrap">{pctMrgPecas.toFixed(2)}%</td>
        </>
      ) : (<>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : fmtMoeda(dept.metaServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoRealServicos ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : <span className="inline-flex items-center gap-1 justify-end w-full">{pctServicos.toFixed(2)}% <StatusIcon pct={pctServicos} /></span>}</td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : fmtMoeda(dept.metaTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap">{carregando ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.realTotal)}</td>
      <td className="p-2 text-right whitespace-nowrap">{semMeta ? '—' : <span className="inline-flex items-center gap-1 justify-end w-full">{pctTotal.toFixed(2)}% <StatusIcon pct={pctTotal} /></span>}</td>
      {celulasPossib}
      {/* semMargem: aba Serviços › modo Oficina não mostra as colunas de margem */}
      {!semMargem && (<>
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgPecas.toFixed(2)}%</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemServicos ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgServ.toFixed(2)}%</td>
      </>)}
      <td className="p-2 text-right whitespace-nowrap">{carregandoPass ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : (dept.pass || '—')}</td>
      <td className="p-2 text-right whitespace-nowrap">{ticket !== null ? fmtMoeda(ticket) : '—'}</td>
      </>)}
    </tr>
  )
}

// Linha da tabela "Margem de Venda" (aba Margem): Margem Peças/Serviços em R$ e % sobre o Real, e a
// Margem Total (peças + serviços). Mesmas cores da Tabela de Faturamentos.
function LinhaMargem({ label, indent = 0, negrito = false, dept, carregando, onToggle, aberto }) {
  const pctPecas = dept.realPecas > 0 ? (dept.margemPecas / dept.realPecas) * 100 : null
  const pctServ = dept.realServicos > 0 ? (dept.margemServicos / dept.realServicos) * 100 : null
  const ehDepto = !negrito && indent === 0
  const moeda = (v) => (carregando ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : (v ? fmtMoeda(v) : ''))
  return (
    <tr className={`border-b border-slate-200 ${negrito ? 'bg-slate-100 font-bold text-slate-900' : ehDepto ? 'bg-emerald-50 font-semibold text-slate-900 hover:bg-emerald-100' : 'text-slate-700 hover:bg-slate-50'}`}>
      <td className={`p-2 whitespace-nowrap ${negrito ? 'bg-slate-100' : ehDepto ? 'bg-emerald-50' : 'bg-white'}`} style={{ paddingLeft: `${8 + indent * 20}px` }}>
        {onToggle ? (
          <button type="button" onClick={onToggle} title={aberto ? 'Recolher' : 'Ver setores'}
            className="inline-flex items-center gap-1 -ml-1 hover:text-blue-600 transition-colors">
            {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {label}
          </button>
        ) : label}
      </td>
      <td className="p-2 text-right whitespace-nowrap">{moeda(dept.margemPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctPecas != null ? `${pctPecas.toFixed(2)}%` : ''}</td>
      <td className="p-2 text-right whitespace-nowrap">{moeda(dept.margemServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctServ != null ? `${pctServ.toFixed(2)}%` : ''}</td>
      <td className="p-2 text-right whitespace-nowrap">{moeda((dept.margemPecas || 0) + (dept.margemServicos || 0))}</td>
    </tr>
  )
}
const COLUNAS_MARGEM = ['Departamentos', 'Margem Peças', '% Mrg Peças', 'Margem Serv', '% Mrg Serv', 'Margem Total']

// Aba Evolução: indicadores do "Tipo de Venda" (mesma lista do Power BI). Margem = % sobre o Real;
// Lucro = margem em R$; Ticket = Real ÷ Passagens (no "Todos", sem o Balcão, que não tem passagem);
// Coef. Peças = Peças ÷ Serviços; Coef. Serviços = Real Serviços ÷ Horas Vendidas (ROF042).
const INDICADORES_EVOLUCAO = [
  { key: 'realTotal', label: 'Real Total', fmt: 'moeda', calc: v => v.realPecas + v.realServicos },
  { key: 'realPecas', label: 'Real Peças', fmt: 'moeda', calc: v => v.realPecas },
  { key: 'realServicos', label: 'Real Serviços', fmt: 'moeda', calc: v => v.realServicos },
  { key: 'margemServicos', label: 'Margem Serviços', fmt: 'pct', calc: v => (v.realServicos > 0 ? (v.margemServicos / v.realServicos) * 100 : 0), detalhe: v => [['Margem Serviços', 'moeda', v.margemServicos], ['Real Serviços', 'moeda', v.realServicos]] },
  { key: 'margemPecas', label: 'Margem Peças', fmt: 'pct', calc: v => (v.realPecas > 0 ? (v.margemPecas / v.realPecas) * 100 : 0), detalhe: v => [['Margem Peças', 'moeda', v.margemPecas], ['Real Peças', 'moeda', v.realPecas]] },
  { key: 'lucroPecas', label: 'Lucro Peças', fmt: 'moeda', calc: v => v.margemPecas },
  { key: 'lucroServicos', label: 'Lucro Serviços', fmt: 'moeda', calc: v => v.margemServicos },
  { key: 'passagens', label: 'Passagens', fmt: 'int', calc: v => v.pass },
  { key: 'ticketPecas', label: 'Ticket Peças', fmt: 'moeda', calc: v => (v.pass > 0 ? v.ticketPecasBase / v.pass : 0), detalhe: v => [['Real Peças (com OS)', 'moeda', v.ticketPecasBase], ['Passagens', 'int', v.pass]] },
  { key: 'ticketServicos', label: 'Ticket Serviços', fmt: 'moeda', calc: v => (v.pass > 0 ? v.ticketServicosBase / v.pass : 0), detalhe: v => [['Real Serviços (com OS)', 'moeda', v.ticketServicosBase], ['Passagens', 'int', v.pass]] },
  { key: 'ticketTotal', label: 'Ticket Total', fmt: 'moeda', calc: v => (v.pass > 0 ? (v.ticketPecasBase + v.ticketServicosBase) / v.pass : 0), detalhe: v => [['Real Total (com OS)', 'moeda', v.ticketPecasBase + v.ticketServicosBase], ['Passagens', 'int', v.pass]] },
  { key: 'coefServicos', label: 'Coef.Serviços', fmt: 'moeda', calc: v => (v.horas > 0 ? v.realServicos / v.horas : 0), detalhe: v => [['Real Serviços', 'moeda', v.realServicos], ['Horas Vendidas', 'dec', v.horas]] },
  { key: 'coefPecas', label: 'Coef.Peças', fmt: 'dec', calc: v => (v.realServicos > 0 ? v.realPecas / v.realServicos : 0), detalhe: v => [['Real Peças', 'moeda', v.realPecas], ['Real Serviços', 'moeda', v.realServicos]] },
]
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const fmtIndicador = (fmt, v) => {
  const n = Number(v || 0)
  if (fmt === 'moeda') return fmtMoeda(n)
  if (fmt === 'pct') return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  if (fmt === 'int') return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EvolucaoVendas({ meses, indicador, depto, departamentosOpcoes, carregando }) {
  const ind = INDICADORES_EVOLUCAO.find(i => i.key === indicador) || INDICADORES_EVOLUCAO[0]
  const dados = meses.map(m => ({ rotulo: `${m.ano}-${m.mes}`, mesNome: NOMES_MES[m.mes - 1], ano: m.ano, valor: ind.calc(m), base: m }))
  // Eixo: mês em cima; ano embaixo, uma vez por ano, no meio dos meses daquele ano. Mais de um ano no
  // período: linha vertical separando os anos.
  const meioDoAno = new Set()
  const inicioDoAno = new Set()
  for (const ano of [...new Set(dados.map(d => d.ano))]) {
    const idx = dados.map((d, i) => (d.ano === ano ? i : -1)).filter(i => i >= 0)
    meioDoAno.add(idx[Math.floor((idx.length - 1) / 2)])
    inicioDoAno.add(idx[0])
  }
  const variosAnos = new Set(dados.map(d => d.ano)).size > 1
  const DicaEvolucao = ({ active, payload }) => {
    if (!active || !payload?.length) return null
    const d = payload[0].payload
    const partes = ind.detalhe ? ind.detalhe(d.base) : null
    return (
      <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-[11px] text-slate-700">
        <p className="font-semibold text-slate-900 mb-1">{d.mesNome} {d.ano}</p>
        <p><span className="text-slate-500">{ind.label}:</span> <strong>{fmtIndicador(ind.fmt, d.valor)}</strong></p>
        {partes && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cálculo</p>
            <p>{partes[0][0]}: <strong>{fmtIndicador(partes[0][1], partes[0][2])}</strong></p>
            <p>÷ {partes[1][0]}: <strong>{fmtIndicador(partes[1][1], partes[1][2])}</strong></p>
          </div>
        )}
      </div>
    )
  }

  const TickMesAno = ({ x, y, index, width }) => {
    const d = dados[index]
    if (!d) return null
    const meiaFaixa = width && dados.length ? width / dados.length / 2 : 0 // separador fica entre as barras
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} dy={12} textAnchor="middle" fontSize={11} fill="#475569">{d.mesNome}</text>
        {meioDoAno.has(index) && (
          <text x={0} y={0} dy={30} textAnchor="middle" fontSize={12} fontWeight={700} fill="#1e293b">{d.ano}</text>
        )}
        {variosAnos && inicioDoAno.has(index) && index > 0 && (
          <line x1={-meiaFaixa} y1={-2} x2={-meiaFaixa} y2={34} stroke="#94a3b8" strokeDasharray="3 3" />
        )}
      </g>
    )
  }

  return (
    <div className="flex gap-4 items-stretch">
      {/* Gráfico (o "Tipo de Venda" é o seletor de visualização na linha das abas) */}
      <div className="flex-1 min-w-0 bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-slate-800">{ind.label}{depto ? ` — ${departamentosOpcoes.find(d => d.id === depto)?.nome || ''}` : ''}</p>
        {carregando ? (
          <div className="h-[380px] flex items-center justify-center text-xs text-slate-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...</div>
        ) : dados.length === 0 ? (
          <div className="h-[380px] flex items-center justify-center text-xs text-slate-400">Sem dados no período.</div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={dados} margin={{ top: 28, right: 12, left: 12, bottom: 22 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="rotulo" tick={<TickMesAno />} interval={0} height={40} />
              <YAxis hide />
              <Tooltip content={<DicaEvolucao />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="valor" fill="#1a8cff" radius={[3, 3, 0, 0]} maxBarSize={90}>
                <LabelList dataKey="valor" position="top" formatter={(v) => fmtIndicador(ind.fmt, v)} style={{ fontSize: 11, fill: '#475569' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

const VISOES = [
  { key: 'total', label: 'Total' },
  { key: 'balcao', label: 'Peças' },
  { key: 'oficina', label: 'Serviços' },
  { key: 'margem', label: 'Margem' },
  { key: 'evolucao', label: 'Evolução' },
]

// Modo Produtivo (Oficina): Medidas do ROF042 (mecânico que executou) -> coluna da tabela. Margem
// de Peças não existe por produtivo no ROF042 (fica 0).
const SLOT_PRODUTIVO = { prodPecas: 'realPecas', prodServicos: 'realServicos', prodMargemServicos: 'margemServicos', prodPass: 'pass' }

// Aba Serviços: modo Consultor = venda do consultor (relatório do recepcionista), por Tipo de OS;
// modo Oficina = mecânicos que executaram (ROF042), pelo cadastro do mecânico.
const MODOS_OFICINA = [
  { key: 'tipoOs', label: 'Consultor' },
  { key: 'produtivo', label: 'Oficina' },
]

// Departamentos dos gauges de margem (cadastro em /departamentos).
const DEPTO_BALCAO_PECAS = 'af05c274-d017-4618-bb5f-87d46b589c36'
const DEPTO_OFICINA = 'd549c5fc-79dd-4346-bfd9-cbef8e902a3f'

// Tipos de meta publicada que NÃO entram na meta da Oficina (só consultor vale — ver metasConsideradas).
const TIPOS_FORA_DA_META = ['mecanico', 'funilaria', 'terceiros']

const COLUNAS_BALCAO = ['Departamentos', 'Meta Peças', 'Real Peças', '% Peças', 'Possibilidade', '% Possib.', 'Margem Peças', '% Mrg Peças']

const COLUNAS_FATURAMENTO = [
  'Departamentos', 'Meta Peças', 'Real Peças', '% Peças', 'Meta Serviços', 'Real Serviços', '% Serv.',
  'Meta Total', 'Real Total', '% Real', 'Possibilidade', '% Possib.', 'Margem Peças', '% Mrg Peças', 'Margem Serv', '% Mrg Serv', 'Pass', 'Ticket Médio',
]

// BI "Possibilidades - Sintonia do Dia" — reaproveita as metas publicadas (fato_metas_publicadas)
// e o calendário de dias úteis (fato_calendario); Real e Margem ainda não têm fonte conectada
// no sistema (não existe tabela de faturamento realizado), então aparecem zerados por enquanto.
export default function BiPossibilidades() {
  const [empresas, setEmpresas] = useState([])
  // Empresas marcadas no seletor (vazio = Todos).
  const [empresaIds, setEmpresaIds] = useState([])
  const [dataInicio, setDataInicio] = useState(() => primeiroDiaMes(ontem()))
  const [dataFim, setDataFim] = useState(() => isoLocal(ontem()))
  const [aba, setAba] = useState('entreDatas') // 'entreDatas' | 'noMes'
  // Visões do BI (abas acima dos dias úteis). 'total' = visão geral de sempre.
  // ?visao=oficina (ex.: botão de origem da Matriz KPIs) abre direto nessa aba (Evolução não: muda as datas).
  const [visao, setVisao] = useState(() => {
    const pedida = new URLSearchParams(window.location.search).get('visao')
    return ['total', 'balcao', 'oficina', 'margem'].includes(pedida) ? pedida : 'total'
  }) // 'total' | 'balcao' | 'oficina' | 'margem' | 'evolucao'
  // Aba Evolução abre sempre de 01/01 do ano até ontem (muda o filtro de datas); ao sair dela, volta
  // o filtro que estava antes nas outras abas.
  const datasAntesEvolucao = useRef(null)
  const trocarVisao = (nova) => {
    if (nova === 'evolucao' && visao !== 'evolucao') {
      datasAntesEvolucao.current = { dataInicio, dataFim }
      setEvoIndicador('realTotal')
      const d = ontem()
      setDataInicio(`${d.getFullYear()}-01-01`)
      setDataFim(isoLocal(d))
    } else if (nova !== 'evolucao' && visao === 'evolucao') {
      const ant = datasAntesEvolucao.current || { dataInicio: primeiroDiaMes(ontem()), dataFim: isoLocal(ontem()) }
      setDataInicio(ant.dataInicio)
      setDataFim(ant.dataFim)
    }
    setVisao(nova)
  }
  // Aba Oficina: sub-abas e, na sub-aba Total, o modo de visualização.
  const [modoOficina, setModoOficina] = useState('tipoOs') // 'tipoOs' | 'produtivo'
  // Modo Consultor: o que abre abaixo do setor na tabela — consultores ou Tipos de OS.
  const [aberturaConsultor, setAberturaConsultor] = useState('consultor') // 'consultor' | 'tipoOs'
  // Aba Evolução: indicador ("Tipo de Venda"), departamento e linhas por mês do período.
  const [evoIndicador, setEvoIndicador] = useState('realTotal') // abre sempre em Real Total
  const [evoDepto, setEvoDepto] = useState('')
  const [evoLinhas, setEvoLinhas] = useState([])
  const [carregandoEvo, setCarregandoEvo] = useState(false)
  // Aba Serviços: setores começam EXPANDIDOS (nomes visíveis ao abrir) — guarda os que o usuário recolheu.
  const [setoresRecolhidos, setSetoresRecolhidos] = useState(() => new Set())
  // Funcionários expandidos na aba Serviços — chave 'setorId|NOME', começam fechados.
  const [funcsExpandidos, setFuncsExpandidos] = useState(() => new Set())
  const toggleFunc = (chave) => setFuncsExpandidos(prev => {
    const novo = new Set(prev)
    if (novo.has(chave)) novo.delete(chave); else novo.add(chave)
    return novo
  })
  // Agrupamentos de Tipo de OS (Tipo Interno) expandidos — chave 'setorId|GRUPO', começam fechados.
  const [gruposExpandidos, setGruposExpandidos] = useState(() => new Set())
  const toggleGrupo = (chave) => setGruposExpandidos(prev => {
    const novo = new Set(prev)
    if (novo.has(chave)) novo.delete(chave); else novo.add(chave)
    return novo
  })
  const toggleSetor = (setorId) => setSetoresRecolhidos(prev => {
    const novo = new Set(prev)
    if (novo.has(setorId)) novo.delete(setorId); else novo.add(setorId)
    return novo
  })

  const anoRef = useMemo(() => new Date(dataFim + 'T12:00:00').getFullYear(), [dataFim])
  const mesRef = useMemo(() => new Date(dataFim + 'T12:00:00').getMonth() + 1, [dataFim])

  // Período efetivo da tela: "Metas e Real entre Datas" = Data Início → Data Fim; "Metas e Real no
  // Mês" = mês inteiro da Data Fim (a Data Início é ignorada). Meta e Real seguem este período.
  // Evolução usa sempre o período inteiro do filtro (não o "no Mês").
  const noMes = aba === 'noMes' && visao !== 'evolucao'
  const periodo = useMemo(() => {
    if (!noMes) return { inicio: dataInicio, fim: dataFim }
    const ultimoDia = new Date(anoRef, mesRef, 0).getDate()
    const mm = String(mesRef).padStart(2, '0')
    return { inicio: `${anoRef}-${mm}-01`, fim: `${anoRef}-${mm}-${String(ultimoDia).padStart(2, '0')}` }
  }, [noMes, dataInicio, dataFim, anoRef, mesRef])
  const [calendario, setCalendario] = useState([])
  const [metasPublicadas, setMetasPublicadas] = useState([])
  const [loading, setLoading] = useState(true)

  const [departamentos, setDepartamentos] = useState([])
  const [setores, setSetores] = useState([])
  const [tiposOS, setTiposOS] = useState([])
  const [funcionarios, setFuncionarios] = useState([])

  useEffect(() => {
    // Só empresas dos agrupamentos Caiobá Motos e Caiobá Trucks — "Outras Caiobá" são empresas
    // administrativas/holding (não têm faturamento de peças/serviços pra fazer sentido aqui).
    const AGRUPAMENTOS_FATURAMENTO = ['3d942f69-7f0e-4f1c-bbc0-45a00ca0de85', '219e9965-1808-407e-8459-91e8c6a8a400']
    apiService.getEmpresas().then(lista => setEmpresas((lista || []).filter(e => e.ativo !== false && AGRUPAMENTOS_FATURAMENTO.includes(e.agrupamento_empresa_id)))).catch(() => setEmpresas([]))
    apiService.getDepartamentos().then(lista => setDepartamentos(lista || [])).catch(() => setDepartamentos([]))
    apiService.getSetores().then(lista => setSetores(lista || [])).catch(() => setSetores([]))
    apiService.getTiposOS().then(lista => setTiposOS(lista || [])).catch(() => setTiposOS([]))
    apiService.getFuncionarios().then(lista => setFuncionarios(lista || [])).catch(() => setFuncionarios([]))
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

  // Nome de cada empresa marcada como aparece nos arquivos (normalizado, igual ao gravado em
  // fato_bi_medidas_diario) — null = todas.
  const empresasNormSelecionadas = useMemo(() => {
    if (empresaIds.length === 0) return null
    return empresas.filter(e => empresaIds.includes(e.id)).map(e => normalizaBusca(e.nome_empresa_sistema || e.empresa_fantasia || e.nome_empresa))
  }, [empresas, empresaIds])
  const chaveEmpresas = (empresasNormSelecionadas || []).join('|')

  // Medidas de BI com "Slot no Faturamento" (BI — Medidas) alimentam direto uma célula da
  // tabela (Departamentos x Meta/Real/...). Os valores vêm já gravados por dia no Supabase
  // (fato_bi_medidas_diario, somados no banco pela função bi_medidas_agregado) — a tela não lê o
  // SharePoint. Quem grava é o backend, só manualmente: botão "Atualizar agora" daqui ou o
  // "Atualizar Agora" da Matriz KPIs. Tipo de OS → Departamento/Setor é resolvido aqui (resolverPorDepartamento).
  const [valoresSlot, setValoresSlot] = useState(() => new Map())
  const [valoresSlotDepto, setValoresSlotDepto] = useState(() => new Map())
  const [valoresSlotSetor, setValoresSlotSetor] = useState(() => new Map())
  const [valoresSlotSetorFunc, setValoresSlotSetorFunc] = useState(() => new Map())
  const [valoresSlotSetorTipo, setValoresSlotSetorTipo] = useState(() => new Map())
  const [valoresSlotSetorGrupo, setValoresSlotSetorGrupo] = useState(() => new Map())
  // Abertura do funcionário na aba Serviços (Setor › Funcionário › Tipo Interno › Tipo de OS), por
  // coluna da tabela: { consultor: { grupo, tipo }, oficina: { grupo, tipo } } — cada um Map<slot, Map>.
  const [aberturaFunc, setAberturaFunc] = useState(() => ({ consultor: { grupo: new Map(), tipo: new Map() }, oficina: { grupo: new Map(), tipo: new Map() } }))
  // Modo Produtivo (Oficina): os mesmos valores atribuídos pelo departamento/setor do FUNCIONÁRIO.
  const [valoresProdutivo, setValoresProdutivo] = useState(() => ({ depto: new Map(), setor: new Map(), setorFunc: new Map(), setorBox: new Map(), nomesSem: new Set() }))
  const [carregandoValores, setCarregandoValores] = useState(true)
  // Tipos de OS (como vêm do arquivo) que caíram em "Sem Departamento" em qualquer Medida com
  // Slot — mostrados no ícone de info da linha, pra não precisar investigar por fora.
  const [nomesSemDepartamento, setNomesSemDepartamento] = useState(() => new Set())
  // Gravação mais antiga entre os dados do período mostrado ("Atualizado em").
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [recarga, setRecarga] = useState(0)
  const [sincronizando, setSincronizando] = useState(false)
  const [erroAtualizacao, setErroAtualizacao] = useState(null)

  useEffect(() => {
    let cancelado = false
    setCarregandoValores(true)
    Promise.all([
      apiService.getMedidasBiComFonte(),
      apiService.getBiMedidasAgregado({ dataInicio: periodo.inicio, dataFim: periodo.fim, empresasNorm: empresasNormSelecionadas }),
    ]).then(([medidas, linhas]) => {
      if (cancelado) return
      const gruposPorMedida = new Map()
      let maisAntiga = null
      for (const l of linhas) {
        if (!gruposPorMedida.has(l.medida_id)) gruposPorMedida.set(l.medida_id, [])
        gruposPorMedida.get(l.medida_id).push({ dims: { tipo_os: l.tipo_os, funcionario: l.funcionario }, soma: Number(l.soma || 0), linhas: Number(l.linhas || 0), distintos: l.distintos || undefined })
        if (l.atualizado_em && (!maisAntiga || l.atualizado_em < maisAntiga)) maisAntiga = l.atualizado_em
      }
      const total = new Map(), porDepto = new Map(), porSetor = new Map(), porSetorFunc = new Map(), porSetorTipo = new Map(), porSetorGrupo = new Map(), nomes = new Set()
      const abertura = { consultor: { grupo: new Map(), tipo: new Map() }, oficina: { grupo: new Map(), tipo: new Map() } }
      const prod = { depto: new Map(), setor: new Map(), setorFunc: new Map(), setorBox: new Map(), nomesSem: new Set() }
      for (const m of medidas.filter(m => m.slot_faturamento && m.ativo)) {
        const r = resolverPorDepartamento(gruposPorMedida.get(m.id) || [], m, { tiposOS, setores })
        total.set(m.slot_faturamento, r.valorTotal)
        porDepto.set(m.slot_faturamento, r.valoresPorDepartamento)
        porSetor.set(m.slot_faturamento, r.valoresPorSetor)
        porSetorFunc.set(m.slot_faturamento, r.valoresPorSetorFuncionario)
        porSetorTipo.set(m.slot_faturamento, r.valoresPorSetorTipoOs)
        porSetorGrupo.set(m.slot_faturamento, r.valoresPorSetorGrupoTipo)
        abertura.consultor.grupo.set(m.slot_faturamento, r.aberturaFuncionario.grupo)
        abertura.consultor.tipo.set(m.slot_faturamento, r.aberturaFuncionario.tipo)
        for (const n of r.nomesSemDepartamento) nomes.add(n)
        const colunaProd = SLOT_PRODUTIVO[m.slot_faturamento]
        if (colunaProd) {
          const p = resolverPorFuncionario(gruposPorMedida.get(m.id) || [], m, { funcionarios, setores, deptSemCadastro: DEPTO_OFICINA, tiposOS })
          prod.depto.set(colunaProd, p.valoresPorDepartamento)
          prod.setor.set(colunaProd, p.valoresPorSetor)
          prod.setorFunc.set(colunaProd, p.valoresPorSetorFuncionario)
          prod.setorBox.set(colunaProd, p.valoresPorSetorBox)
          abertura.oficina.grupo.set(colunaProd, p.aberturaFuncionario.grupo)
          abertura.oficina.tipo.set(colunaProd, p.aberturaFuncionario.tipo)
          for (const n of p.nomesSemDepartamento) prod.nomesSem.add(n)
        }
      }
      setValoresProdutivo(prod)
      setAberturaFunc(abertura)
      setValoresSlot(total); setValoresSlotDepto(porDepto); setValoresSlotSetor(porSetor); setValoresSlotSetorFunc(porSetorFunc); setValoresSlotSetorTipo(porSetorTipo); setValoresSlotSetorGrupo(porSetorGrupo)
      setNomesSemDepartamento(nomes)
      setUltimaAtualizacao(maisAntiga)
    }).catch(() => {
      if (cancelado) return
      setValoresSlot(new Map()); setValoresSlotDepto(new Map()); setValoresSlotSetor(new Map()); setValoresSlotSetorFunc(new Map()); setValoresSlotSetorTipo(new Map()); setValoresSlotSetorGrupo(new Map()); setNomesSemDepartamento(new Set()); setUltimaAtualizacao(null)
    }).finally(() => { if (!cancelado) setCarregandoValores(false) })
    return () => { cancelado = true }
  // chaveEmpresas (texto) no lugar do array — o array muda de referência a cada render.
  }, [chaveEmpresas, periodo, tiposOS, setores, funcionarios, recarga])

  // Aba Evolução: soma por mês do período (bi_medidas_agregado_mensal), só quando a aba está aberta.
  const ehEvolucao = visao === 'evolucao'
  useEffect(() => {
    if (!ehEvolucao) return
    let cancelado = false
    setCarregandoEvo(true)
    apiService.getBiMedidasAgregadoMensal({ dataInicio: periodo.inicio, dataFim: periodo.fim, empresasNorm: empresasNormSelecionadas })
      .then(linhas => { if (!cancelado) setEvoLinhas(linhas || []) })
      .catch(() => { if (!cancelado) setEvoLinhas([]) })
      .finally(() => { if (!cancelado) setCarregandoEvo(false) })
    return () => { cancelado = true }
  // chaveEmpresas (texto) no lugar do array — o array muda de referência a cada render.
  }, [ehEvolucao, periodo, chaveEmpresas, recarga])

  const [medidasBi, setMedidasBi] = useState([])
  useEffect(() => { apiService.getMedidasBiComFonte().then(m => setMedidasBi(m || [])).catch(() => setMedidasBi([])) }, [])

  // Por mês: valores do departamento escolhido (ou Total), resolvidos pelo Tipo de OS como no resto da tela.
  const evoMeses = useMemo(() => {
    const SLOTS = ['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass', 'horasVendidas']
    const medidaPorSlot = new Map(medidasBi.filter(m => m.ativo && SLOTS.includes(m.slot_faturamento)).map(m => [m.slot_faturamento, m]))
    const porMes = new Map()
    for (const l of evoLinhas) {
      const chave = `${l.ano}-${String(l.mes).padStart(2, '0')}`
      if (!porMes.has(chave)) porMes.set(chave, { ano: Number(l.ano), mes: Number(l.mes), grupos: new Map() })
      const g = porMes.get(chave).grupos
      if (!g.has(l.medida_id)) g.set(l.medida_id, [])
      g.get(l.medida_id).push({ dims: { tipo_os: l.tipo_os }, soma: Number(l.soma || 0), linhas: Number(l.linhas || 0), distintos: l.distintos || undefined })
    }
    const deptos = new Set()
    const meses = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, m]) => {
      const v = { ano: m.ano, mes: m.mes }
      let balcaoPecas = 0, balcaoServicos = 0
      for (const slot of SLOTS) {
        const medida = medidaPorSlot.get(slot)
        const r = medida ? resolverPorDepartamento(m.grupos.get(medida.id) || [], medida, { tiposOS, setores }) : null
        for (const id of (r?.valoresPorDepartamento.keys() || [])) if (id !== '__sem_departamento__') deptos.add(id)
        v[slot === 'horasVendidas' ? 'horas' : slot] = r ? (evoDepto ? (r.valoresPorDepartamento.get(evoDepto) || 0) : r.valorTotal) : 0
        if (slot === 'realPecas') balcaoPecas = r?.valoresPorDepartamento.get(DEPTO_BALCAO_PECAS) || 0
        if (slot === 'realServicos') balcaoServicos = r?.valoresPorDepartamento.get(DEPTO_BALCAO_PECAS) || 0
      }
      // Ticket: no "Todos" tira o Balcão (venda sem OS, sem passagem).
      v.ticketPecasBase = evoDepto ? v.realPecas : v.realPecas - balcaoPecas
      v.ticketServicosBase = evoDepto ? v.realServicos : v.realServicos - balcaoServicos
      return v
    })
    return { meses, deptos }
  }, [evoLinhas, medidasBi, tiposOS, setores, evoDepto])
  // Balcão Peças e Oficina sempre na lista (mesmo antes de os dados do período chegarem), mais
  // qualquer outro departamento que tenha valor no período.
  const evoDeptosOpcoes = [...new Set([DEPTO_BALCAO_PECAS, DEPTO_OFICINA, ...evoMeses.deptos])]
    .map(id => ({ id, nome: departamentos.find(d => d.id === id)?.nome_departamento || (id === DEPTO_BALCAO_PECAS ? 'BALCÃO PEÇAS' : id === DEPTO_OFICINA ? 'OFICINA' : '') }))
    .filter(d => d.nome)

  const valorSlot = (chave) => valoresSlot.get(chave) || 0
  // Aba Oficina › Total › Produtivo: departamento/setor pelo cadastro do funcionário, não pelo Tipo de OS.
  const usarProdutivo = visao === 'oficina' && modoOficina === 'produtivo'
  const valorSlotDepto = (chave, deptId) => (usarProdutivo ? valoresProdutivo.depto : valoresSlotDepto).get(chave)?.get(deptId) || 0
  const valorSlotSetor = (chave, setorId) => (usarProdutivo ? valoresProdutivo.setor : valoresSlotSetor).get(chave)?.get(setorId) || 0
  const carregandoSlot = () => carregandoValores

  // "Atualizar agora": backend relê o SharePoint do período filtrado (todas as empresas) e regrava
  // o Supabase; depois a tela recarrega de lá.
  const atualizarAgora = async () => {
    setSincronizando(true)
    setErroAtualizacao(null)
    try {
      const r = await apiService.sincronizarBiMedidas({ dataInicio: periodo.inicio, dataFim: periodo.fim })
      const falhas = (r.detalhes || []).filter(d => !d.ok)
      if (falhas.length) setErroAtualizacao(`Não atualizou: ${falhas.map(f => `${f.medida} (${f.erro})`).join('; ')}`)
    } catch (err) {
      setErroAtualizacao(err.message || String(err))
    } finally {
      setSincronizando(false)
      setRecarga(n => n + 1)
    }
  }
  const atualizando = sincronizando || carregandoValores
  const fmtDataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  // Meses cobertos pelo período, inteiros (do dia 1 ao último dia) — base da proporção da meta.
  const mesesPeriodo = useMemo(() => {
    const ini = periodo.inicio.slice(0, 7), fim = periodo.fim.slice(0, 7)
    const ultimo = new Date(Number(fim.slice(0, 4)), Number(fim.slice(5, 7)), 0).getDate()
    return { inicio: `${ini}-01`, fim: `${fim}-${String(ultimo).padStart(2, '0')}` }
  }, [periodo])
  const anosPeriodo = useMemo(() => {
    const anos = []
    for (let a = Number(periodo.inicio.slice(0, 4)); a <= Number(periodo.fim.slice(0, 4)); a++) anos.push(a)
    return anos
  }, [periodo])

  // Com "Todos", vale o calendário de Campo Grande (Trucks e Motos CG têm o mesmo calendário).
  const EMPRESA_CALENDARIO_PADRAO = '6e140292-fb21-4ade-8d23-c66aa00890b6' // CAIOBÁ TRUCKS - CAMPO GRANDE
  // Cards de dias: uma empresa só marcada usa o calendário dela; Todos ou várias = Campo Grande.
  const empresaCalendario = empresaIds.length === 1 ? empresaIds[0] : EMPRESA_CALENDARIO_PADRAO

  // Buscas independentes de propósito — uma falhar (ex: calendário sem dados sincronizados
  // pra essa empresa) não pode zerar a outra (Metas, que já tem dado real publicado).
  // Calendário de TODAS as empresas nos meses do período: os cards usam o da empresaCalendario e a
  // proporção da meta usa o de cada empresa.
  const [calendarioEmpresas, setCalendarioEmpresas] = useState([])
  useEffect(() => {
    setLoading(true)
    apiService.getCalendarioPeriodo({ dataInicio: mesesPeriodo.inicio, dataFim: mesesPeriodo.fim })
      .then(lista => setCalendarioEmpresas(lista || []))
      .catch(() => setCalendarioEmpresas([]))
      .finally(() => setLoading(false))
  }, [mesesPeriodo])
  useEffect(() => {
    setCalendario(calendarioEmpresas.filter(r => r.empresa_id === empresaCalendario))
  }, [calendarioEmpresas, empresaCalendario])

  useEffect(() => {
    Promise.all(anosPeriodo.map(a => apiService.getTotalGrupoPublicado(a)))
      .then(listas => setMetasPublicadas(listas.flat()))
      .catch(() => setMetasPublicadas([]))
  }, [anosPeriodo])

  // ── Dias Úteis / Trabalhados / Restantes — a partir do calendário (fato_calendario) ──
  // Peso de cada dia = dias_uteis (1, sábado 0,5, domingo/feriado 0). Úteis = total do mês da Data
  // Fim. Entre Datas: Trabalhados = Data Início → Data Fim; Restantes = depois da Data Fim no mês.
  // No Mês: Trabalhados = dia 1 → ontem; Restantes = Úteis − Trabalhados.
  const diasInfo = useMemo(() => {
    const linhasMes = calendario.filter(r => Number(r.ano) === anoRef && Number(r.mes) === mesRef)
    if (linhasMes.length === 0) return { uteis: 0, trabalhados: 0, restantes: 0 }
    const soma = (linhas) => linhas.reduce((acc, r) => acc + Number(r.dias_uteis || 0), 0)
    const uteis = soma(linhasMes)
    // Evolução: o cabeçalho mostra os dias do mês da Data Fim (dia 1 até ontem), como no "no Mês".
    if (noMes || visao === 'evolucao') {
      const ate = isoLocal(ontem())
      const trabalhados = soma(linhasMes.filter(r => r.data <= ate))
      return { uteis, trabalhados, restantes: Math.max(uteis - trabalhados, 0) }
    }
    const trabalhados = soma(calendario.filter(r => r.data >= dataInicio && r.data <= dataFim))
    const restantes = soma(linhasMes.filter(r => r.data > dataFim))
    return { uteis, trabalhados, restantes }
  }, [calendario, anoRef, mesRef, dataInicio, dataFim, noMes, visao])

  // Fração da meta mensal que cabe no período, por empresa e mês: dias úteis da empresa dentro do
  // período ÷ dias úteis da empresa no mês inteiro — SEMPRE o calendário de cada empresa, inclusive
  // com "Todos" (decisão do usuário, 17/10/2026). Empresa sem calendário cadastrado usa o de Campo
  // Grande. Ex.: 1 dia útil de um mês com 23,5 = 1/23,5 da meta.
  const fracaoMetaPeriodo = useMemo(() => {
    const porEmpresaMes = new Map() // 'empresa|ano|mes' -> { mes, periodo }
    for (const r of calendarioEmpresas) {
      const chave = `${r.empresa_id}|${Number(r.ano)}|${Number(r.mes)}`
      const acc = porEmpresaMes.get(chave) || { mes: 0, periodo: 0 }
      const peso = Number(r.dias_uteis || 0)
      acc.mes += peso
      if (r.data >= periodo.inicio && r.data <= periodo.fim) acc.periodo += peso
      porEmpresaMes.set(chave, acc)
    }
    return (empresaId, ano, mes) => {
      const acc = porEmpresaMes.get(`${empresaId}|${ano}|${mes}`) || porEmpresaMes.get(`${EMPRESA_CALENDARIO_PADRAO}|${ano}|${mes}`)
      return acc?.mes ? acc.periodo / acc.mes : 0
    }
  }, [calendarioEmpresas, periodo])

  // ── Meta por departamento — a partir das metas publicadas (fato_metas_publicadas) ──
  // Number() nos dois lados: mes/ano podem vir do Supabase como string (ex: coluna numeric),
  // e os números do período são sempre number — comparação estrita "8" === 8 falha silenciosamente.
  const metasDoPeriodo = useMemo(() => {
    const ini = Number(periodo.inicio.slice(0, 4)) * 100 + Number(periodo.inicio.slice(5, 7))
    const fim = Number(periodo.fim.slice(0, 4)) * 100 + Number(periodo.fim.slice(5, 7))
    return metasPublicadas.filter(m => { const am = Number(m.ano) * 100 + Number(m.mes); return am >= ini && am <= fim })
  }, [metasPublicadas, periodo])

  // Meta considerada por linha publicada, já separada em Peças/Serviços. Na Oficina vale SÓ a meta
  // dos consultores (decisão do usuário, 17/10/2026): mecânico/funilaria/terceiros publicam a mesma
  // meta da oficina por outro ângulo e somar tudo duplicava. Consultor sem Peças/Serviços
  // separados (só meta_faturamento) reparte pela proporção de Serviços das metas dos mecânicos da
  // mesma empresa, mês e setor (senão da empresa toda no mês) — mesma regra da Campanha Pós-Venda.
  // Balcão (tipo 'pecas') é todo Peças. Cada linha traz a meta CHEIA do mês (metaMes*, usada no
  // gauge Possibilidades) e a meta PROPORCIONAL ao período (meta*, usada na tabela e no Realizado).
  const metasTodas = useMemo(() => {
    const proporcao = new Map() // 'empresa|ano|mes|setor' e 'empresa|ano|mes|' -> { fat, serv }
    const acumular = (chave, fat, serv) => {
      const p = proporcao.get(chave) || { fat: 0, serv: 0 }
      p.fat += fat; p.serv += serv
      proporcao.set(chave, p)
    }
    for (const r of metasDoPeriodo) {
      if (r.tipo !== 'mecanico') continue
      const fat = Number(r.meta_faturamento || 0)
      const serv = Number(r.meta_servicos || 0)
      const base = `${r.empresa_id}|${Number(r.ano)}|${Number(r.mes)}|`
      acumular(`${base}${r.setor_id || ''}`, fat, serv)
      acumular(base, fat, serv)
    }
    const fracaoServ = (r) => {
      const base = `${r.empresa_id}|${Number(r.ano)}|${Number(r.mes)}|`
      const ref = proporcao.get(`${base}${r.setor_id || ''}`)
      const p = ref?.fat ? ref : proporcao.get(base)
      return p?.fat ? p.serv / p.fat : 0
    }
    return metasDoPeriodo
      .filter(r => empresaIds.length === 0 || empresaIds.includes(r.empresa_id))
      .map(r => {
        const metaMesTotal = Number(r.meta_faturamento || 0)
        let metaMesServicos = 0
        if (r.tipo !== 'pecas') {
          metaMesServicos = r.meta_servicos != null ? Number(r.meta_servicos || 0) : metaMesTotal * fracaoServ(r)
        }
        const fator = fracaoMetaPeriodo(r.empresa_id, Number(r.ano), Number(r.mes))
        return {
          departamento_id: r.departamento_id, setor_id: r.setor_id,
          colaborador_nome: r.colaborador_nome || '', tipo: r.tipo, box_nome: r.box_nome || '',
          ehMesRef: Number(r.ano) === anoRef && Number(r.mes) === mesRef,
          metaMesTotal, metaMesServicos, metaMesPecas: metaMesTotal - metaMesServicos,
          metaTotal: metaMesTotal * fator, metaServicos: metaMesServicos * fator, metaPecas: (metaMesTotal - metaMesServicos) * fator,
        }
      })
  }, [metasDoPeriodo, empresaIds, fracaoMetaPeriodo, anoRef, mesRef])
  // Visão normal: Oficina pela meta dos consultores (TIPOS_FORA_DA_META fora). Modo Produtivo: meta
  // dos MECÂNICOS (já separada em Peças/Serviços), coerente com os valores pelo mecânico do ROF042.
  const metasConsideradas = usarProdutivo
    ? metasTodas.filter(r => r.tipo === 'mecanico')
    : metasTodas.filter(r => !TIPOS_FORA_DA_META.includes(r.tipo))

  const somarMetas = (rows) => rows.reduce((acc, r) => {
    acc.metaPecas += r.metaPecas; acc.metaServicos += r.metaServicos; acc.metaTotal += r.metaTotal
    if (r.ehMesRef) { acc.metaMesPecas += r.metaMesPecas; acc.metaMesTotal += r.metaMesTotal }
    return acc
  }, { metaPecas: 0, metaServicos: 0, metaTotal: 0, metaMesPecas: 0, metaMesTotal: 0 })
  const somaPorDepartamento = (deptId) => somarMetas(metasConsideradas.filter(m => (m.departamento_id || '__sem_departamento__') === deptId))
  const somaPorSetor = (setorId) => somarMetas(metasConsideradas.filter(m => m.setor_id === setorId))

  const comReal = (realPecas, realServicos) => ({ realPecas, realServicos, realTotal: realPecas + realServicos })

  // Linhas de departamento — sempre todos os departamentos cadastrados em /departamentos (na
  // ordem em que já vêm, por nome), mesmo os que ainda não têm Meta/Real nesse período. Sem
  // correspondência de departamento (funcionário não cadastrado, ou Meta antiga sem
  // departamento) cai em "(Sem Departamento)", só quando existir algum valor lá — pra não
  // esconder o dado.
  const idsDepartamento = useMemo(() => {
    const ids = departamentos.map(d => d.id)
    const temSemDepartamento = metasConsideradas.some(m => !m.departamento_id)
      || [...valoresSlotDepto.values()].some(mapa => mapa.has('__sem_departamento__'))
    return temSemDepartamento ? [...ids, '__sem_departamento__'] : ids
  }, [departamentos, metasConsideradas, valoresSlotDepto])

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
  // Na aba Serviços também aparecem os setores da Oficina que só têm meta (ex.: Funilaria sem venda no período).
  })).filter(s => s.realTotal || s.margemPecas || s.margemServicos || s.pass || (visao === 'oficina' && s.metaTotal))

  // Total geral — somado direto de todas as Metas filtradas (não das linhas de departamento
  // acima) e do valor TOTAL de cada Medida (sem corte), que é exato mesmo pra Contagem Distinta
  // (soma dos departamentos poderia contar o mesmo valor 2x se ele aparecer em mais de um).
  const metaGeral = somarMetas(metasConsideradas)

  const realBalcaoTotal = valorSlotDepto('realPecas', DEPTO_BALCAO_PECAS) + valorSlotDepto('realServicos', DEPTO_BALCAO_PECAS)
  const totalGeral = {
    label: 'Total',
    ...metaGeral,
    ...comReal(valorSlot('realPecas'), valorSlot('realServicos')),
    margemPecas: valorSlot('margemPecas'),
    margemServicos: valorSlot('margemServicos'),
    pass: valorSlot('pass'),
  }
  totalGeral.realTicket = totalGeral.realTotal - realBalcaoTotal

  // ── Gauges — todos dependem de Real/Margem, então ficam em 0% até essa fonte existir ──
  // Mesma conta do "% Mrg Peças"/"% Mrg Serv" da tabela (margem sobre o Real, não tem Meta própria).
  const pctMrgPecas = totalGeral.realPecas > 0 ? (totalGeral.margemPecas / totalGeral.realPecas) * 100 : 0
  const pctMrgServ = totalGeral.realServicos > 0 ? (totalGeral.margemServicos / totalGeral.realServicos) * 100 : 0
  // Margem de peças por departamento (mesma conta da coluna % Mrg Peças da linha do departamento).
  const pctMrgPecasDepto = (deptId) => {
    const real = valorSlotDepto('realPecas', deptId)
    return real > 0 ? (valorSlotDepto('margemPecas', deptId) / real) * 100 : 0
  }
  const pctMrgPecasBalcao = pctMrgPecasDepto(DEPTO_BALCAO_PECAS)
  const pctMrgPecasOficina = pctMrgPecasDepto(DEPTO_OFICINA)
  const gaugePecas = totalGeral.metaPecas > 0 ? (totalGeral.realPecas / totalGeral.metaPecas) * 100 : 0
  const gaugeServicos = totalGeral.metaServicos > 0 ? (totalGeral.realServicos / totalGeral.metaServicos) * 100 : 0
  const gaugeTotal = totalGeral.metaTotal > 0 ? (totalGeral.realTotal / totalGeral.metaTotal) * 100 : 0
  const projecao = diasInfo.trabalhados > 0 ? (totalGeral.realTotal / diasInfo.trabalhados) * diasInfo.uteis : 0
  // Possibilidades = projeção do mês inteiro contra a meta CHEIA do mês da Data Fim (não a proporcional).
  const metaMesCheia = (rows) => rows.filter(r => r.ehMesRef).reduce((acc, r) => { acc.total += r.metaMesTotal; acc.pecas += r.metaMesPecas; return acc }, { total: 0, pecas: 0 })
  const metaMesGeral = metaMesCheia(metasConsideradas)
  const gaugePossibilidades = metaMesGeral.total > 0 ? (projecao / metaMesGeral.total) * 100 : 0

  // ── Aba Balcão: mesma tela, só o departamento Balcão Peças (venda de peças no balcão) ──
  const ehBalcao = visao === 'balcao'
  // Vendedores abaixo do setor (aba Balcão): Real/Margem por Funcionário do relatório no setor,
  // casado por nome normalizado com a meta de Peças publicada do vendedor (proporcional ao período).
  // Aparece quem tem Real ou Meta no setor; ordenado pelo Real (maior primeiro).
  const linhasVendedor = (setorId) => {
    const porNome = new Map()
    const pegar = (chave, nome) => {
      if (!porNome.has(chave)) porNome.set(chave, { vendedorKey: chave, label: nome, metaPecas: 0, metaServicos: 0, metaTotal: 0, realPecas: 0, realServicos: 0, realTotal: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
      return porNome.get(chave)
    }
    for (const [slot, campo] of [['realPecas', 'realPecas'], ['margemPecas', 'margemPecas']]) {
      for (const v of (valoresSlotSetorFunc.get(slot)?.values() || [])) {
        if (v.setorId !== setorId) continue
        const linha = pegar(normalizaBusca(v.nome), v.nome)
        linha[campo] += v.valor
      }
    }
    for (const m of metasConsideradas) {
      if (m.tipo !== 'pecas' || m.setor_id !== setorId || !m.colaborador_nome) continue
      const linha = pegar(normalizaBusca(m.colaborador_nome), m.colaborador_nome)
      linha.metaPecas += m.metaPecas; linha.metaTotal += m.metaTotal
      if (m.ehMesRef) { linha.metaMesPecas = (linha.metaMesPecas || 0) + m.metaMesPecas; linha.metaMesTotal = (linha.metaMesTotal || 0) + m.metaMesTotal }
    }
    return [...porNome.values()]
      .map(l => ({ ...l, realTotal: l.realPecas }))
      .filter(l => l.realPecas || l.margemPecas || l.metaPecas)
      .sort((a, b) => b.realPecas - a.realPecas || a.label.localeCompare(b.label, 'pt-BR'))
  }

  const totalBalcao = {
    label: 'Total',
    ...somaPorDepartamento(DEPTO_BALCAO_PECAS),
    ...comReal(valorSlotDepto('realPecas', DEPTO_BALCAO_PECAS), 0),
    margemPecas: valorSlotDepto('margemPecas', DEPTO_BALCAO_PECAS),
    margemServicos: 0,
    pass: 0,
  }
  const gaugeBalcao = totalBalcao.metaPecas > 0 ? (totalBalcao.realPecas / totalBalcao.metaPecas) * 100 : 0
  const projecaoBalcao = diasInfo.trabalhados > 0 ? (totalBalcao.realPecas / diasInfo.trabalhados) * diasInfo.uteis : 0
  const metaMesBalcao = metaMesCheia(metasConsideradas.filter(r => r.departamento_id === DEPTO_BALCAO_PECAS))
  const gaugePossibilidadesBalcao = metaMesBalcao.pecas > 0 ? (projecaoBalcao / metaMesBalcao.pecas) * 100 : 0
  // ── Aba Oficina (sub-aba Total): mesma tela da Total, só o departamento Oficina ──
  const ehOficina = visao === 'oficina'
  const ehMargem = visao === 'margem'
  const oficinaComTabela = ehOficina

  // Funcionários abaixo do setor (Oficina, modo Produtivo): valores pelo setor do cadastro dele e a
  // meta publicada dele (casada por nome). Sem meta, Meta e % aparecem como "—".
  // Funcionários abaixo do setor na aba Serviços: modo Oficina = mecânicos (ROF042, setor do
  // cadastro); modo Consultor = consultores (venda do recepcionista, setor pelo Tipo de OS).
  const linhasProdutivo = (setorId) => {
    const porNome = new Map()
    const pegar = (chave, nome) => {
      if (!porNome.has(chave)) porNome.set(chave, { funcKey: chave, label: nome, box: '', metaPecas: 0, metaServicos: 0, metaTotal: 0, metaMesPecas: 0, metaMesTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
      return porNome.get(chave)
    }
    for (const [slot, campo] of [['realPecas', 'realPecas'], ['realServicos', 'realServicos'], ['margemPecas', 'margemPecas'], ['margemServicos', 'margemServicos'], ['pass', 'pass']]) {
      for (const v of ((usarProdutivo ? valoresProdutivo.setorFunc : valoresSlotSetorFunc).get(slot)?.values() || [])) {
        if (v.setorId !== setorId) continue
        const l = pegar(normalizaBusca(v.nome), v.nome)
        l[campo] += v.valor
        if (v.box && !l.box) l.box = v.box
      }
    }
    for (const m of metasConsideradas) {
      if (m.setor_id !== setorId || !m.colaborador_nome) continue
      const l = pegar(normalizaBusca(m.colaborador_nome), m.colaborador_nome)
      if (!l.box && m.box_nome) l.box = m.box_nome
      l.metaPecas += m.metaPecas; l.metaServicos += m.metaServicos; l.metaTotal += m.metaTotal
      if (m.ehMesRef) { l.metaMesPecas += m.metaMesPecas; l.metaMesTotal += m.metaMesTotal }
    }
    return [...porNome.values()]
      .map(l => ({ ...l, realTotal: l.realPecas + l.realServicos }))
      .filter(l => l.realTotal || l.margemPecas || l.margemServicos || l.pass || l.metaTotal)
      .sort((a, b) => b.realTotal - a.realTotal || a.label.localeCompare(b.label, 'pt-BR'))
  }
  const totalOficina = {
    label: 'Total',
    ...somaPorDepartamento(DEPTO_OFICINA),
    ...comReal(valorSlotDepto('realPecas', DEPTO_OFICINA), valorSlotDepto('realServicos', DEPTO_OFICINA)),
    margemPecas: valorSlotDepto('margemPecas', DEPTO_OFICINA),
    margemServicos: valorSlotDepto('margemServicos', DEPTO_OFICINA),
    pass: valorSlotDepto('pass', DEPTO_OFICINA),
  }
  const pctOf = (real, meta) => (meta > 0 ? (real / meta) * 100 : 0)
  const projecaoOficina = diasInfo.trabalhados > 0 ? (totalOficina.realTotal / diasInfo.trabalhados) * diasInfo.uteis : 0
  const pctMrgServOficina = totalOficina.realServicos > 0 ? (totalOficina.margemServicos / totalOficina.realServicos) * 100 : 0

  // Linhas por Tipo de OS abaixo do setor (modo Consultor › Por Tipo de OS): Real/Margem/Pass de cada
  // Tipo de OS do setor (não há meta por Tipo de OS — Meta e % aparecem como "—").
  const linhasTipoOs = (setorId) => {
    const porTipo = new Map()
    for (const slot of ['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass']) {
      for (const [chave, v] of (valoresSlotSetorTipo.get(slot) || new Map())) {
        if (v.setorId !== setorId) continue
        if (!porTipo.has(chave)) porTipo.set(chave, { tipoKey: chave, label: v.nome, grupo: v.grupo || '(Sem tipo interno)', metaPecas: 0, metaServicos: 0, metaTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
        porTipo.get(chave)[slot] += v.valor
      }
    }
    return [...porTipo.values()]
      .map(l => ({ ...l, realTotal: l.realPecas + l.realServicos }))
      .filter(l => l.realTotal || l.margemPecas || l.margemServicos || l.pass)
      .sort((a, b) => b.realTotal - a.realTotal || a.label.localeCompare(b.label, 'pt-BR'))
  }
  // Agrupamentos (Tipo Interno do cadastro de Tipos de O.S.) abaixo do setor — valores exatos do grupo.
  const linhasGrupoTipo = (setorId) => {
    const porGrupo = new Map()
    for (const slot of ['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass']) {
      for (const [chave, v] of (valoresSlotSetorGrupo.get(slot) || new Map())) {
        if (v.setorId !== setorId) continue
        if (!porGrupo.has(chave)) porGrupo.set(chave, { grupoKey: chave, label: v.nome, metaPecas: 0, metaServicos: 0, metaTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
        porGrupo.get(chave)[slot] += v.valor
      }
    }
    return [...porGrupo.values()]
      .map(l => ({ ...l, realTotal: l.realPecas + l.realServicos }))
      .filter(l => l.realTotal || l.margemPecas || l.margemServicos || l.pass)
      .sort((a, b) => b.realTotal - a.realTotal || a.label.localeCompare(b.label, 'pt-BR'))
  }
  // Abertura do funcionário: prefixo 'setorId|NOME' -> agrupamentos (Tipo Interno); prefixo
  // 'setorId|NOME|GRUPO' -> Tipos de OS. Mesmas 5 colunas de valor; sem meta (Meta e % = "—").
  const linhasAbertura = (nivel, prefixo, chaveKey) => {
    const fonte = aberturaFunc[usarProdutivo ? 'oficina' : 'consultor'][nivel]
    const porChave = new Map()
    for (const slot of ['realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass']) {
      for (const [chave, v] of (fonte.get(slot) || new Map())) {
        if (!chave.startsWith(prefixo + '|') || chave.slice(prefixo.length + 1).includes('|')) continue
        if (!porChave.has(chave)) porChave.set(chave, { [chaveKey]: chave, label: v.nome, metaPecas: 0, metaServicos: 0, metaTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
        porChave.get(chave)[slot] += v.valor
      }
    }
    return [...porChave.values()]
      .map(l => ({ ...l, realTotal: l.realPecas + l.realServicos }))
      .filter(l => l.realTotal || l.margemPecas || l.margemServicos || l.pass)
      .sort((a, b) => b.realTotal - a.realTotal || a.label.localeCompare(b.label, 'pt-BR'))
  }
  const abrirPorTipo = ehOficina && !usarProdutivo && aberturaConsultor === 'tipoOs'

  const linhasTabela = ehBalcao ? linhasDepartamento.filter(d => d.deptId === DEPTO_BALCAO_PECAS)
    : ehOficina ? linhasDepartamento.filter(d => d.deptId === DEPTO_OFICINA)
    : linhasDepartamento
  const totalTabela = ehBalcao ? totalBalcao : ehOficina ? totalOficina : totalGeral
  const colunasTabela = ehBalcao ? COLUNAS_BALCAO
    : usarProdutivo ? COLUNAS_FATURAMENTO.filter(c => !['Margem Peças', '% Mrg Peças', 'Margem Serv', '% Mrg Serv'].includes(c))
    : COLUNAS_FATURAMENTO

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS */}
      {/* Cores e logo do painel Power BI da Caiobá — mesmo modelo de Pós-Vendas › Indicadores de Produtividade */}
      <div className="relative rounded-lg shadow-sm"
        style={{ background: 'linear-gradient(90deg, #fdf8ec 0%, #f8d78c 28%, #f0a30a 50%, #a08a35 68%, #4f6a6a 84%, #1a4d8f 100%)' }}>
        <div className="relative flex flex-wrap items-stretch justify-between gap-4 px-5 py-3">
          <div className="flex flex-col justify-between gap-3">
            <div className="flex items-center gap-4">
              <img src={logoCaioba} alt="Caiobá" className="h-11 w-auto shrink-0" />
              <div className="w-0.5 self-stretch bg-[#1a4d8f]" />
              <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
                <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Possibilidades - Sintonia do Dia</h1>
                <p className="text-[15px] italic text-slate-900 uppercase leading-tight mt-0.5">Pós-Vendas</p>
              </div>
            </div>
            {/* Dias Úteis / Trabalhados / Restantes — compactos, na altura do seletor de empresa e datas */}
            <div className="flex flex-wrap items-center gap-2">
              <DiaInfo icon={CalendarDays} cor="#3987e5" label="Dias úteis" valor={diasInfo.uteis} />
              <DiaInfo icon={Clock} cor="#0ca30c" label="Trabalhados" valor={diasInfo.trabalhados} />
              <DiaInfo icon={Hourglass} cor="#d97706" label="Restantes" valor={diasInfo.restantes} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Atualizado em + botão Atualizar, acima dos filtros */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-white leading-tight text-right">
                Atualizado em:<br /><strong>{sincronizando ? '...' : fmtDataHora(ultimaAtualizacao)}</strong>
              </p>
              <button
                type="button"
                onClick={atualizarAgora}
                disabled={atualizando}
                title={sincronizando ? 'Atualizando...' : 'Atualizar dados'}
                aria-label="Atualizar dados"
                className="flex items-center justify-center h-9 w-9 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {erroAtualizacao && <p className="text-[10px] text-red-600 bg-white/90 rounded px-2 py-1 max-w-[420px] text-right leading-tight">{erroAtualizacao}</p>}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas Fantasia</label>
                <SeletorEmpresas empresas={empresas} selecionadas={empresaIds} onChange={setEmpresaIds} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white uppercase flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Data</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                  <span className="text-white text-xs">até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VISÕES + (na Total) Metas e Real entre Datas / no Mês, na mesma linha */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
        {VISOES.map(v => (
          <button
            key={v.key}
            onClick={() => trocarVisao(v.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${visao === v.key ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {/* Aba Evolução: "Tipo de Venda" como seletor de visualização, na mesma linha das abas */}
      {ehEvolucao && (
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Modo Visualização</span>
          <select value={evoIndicador} onChange={e => setEvoIndicador(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-w-[180px]">
            {INDICADORES_EVOLUCAO.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
          </select>
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300 ml-2">Departamentos</span>
          <select value={evoDepto} onChange={e => setEvoDepto(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-w-[180px]">
            <option value="">Todos</option>
            {evoDeptosOpcoes.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </div>
      )}
      {/* Aba Serviços: modelo de visualização na mesma linha das abas */}
      {ehOficina && (
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Modelo de visualização</span>
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
            {MODOS_OFICINA.map(t => (
              <button key={t.key} onClick={() => setModoOficina(t.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${modoOficina === t.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(visao === 'total' || ehBalcao || ehOficina || ehMargem) && (
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {[{ key: 'entreDatas', label: 'Metas e Real entre Datas' }, { key: 'noMes', label: 'Metas e Real no Mês' }].map(t => (
            <button
              key={t.key}
              onClick={() => setAba(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === t.key ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      </div>

      {ehEvolucao ? (
        <EvolucaoVendas meses={evoMeses.meses} departamentosOpcoes={evoDeptosOpcoes}
          indicador={evoIndicador} depto={evoDepto} carregando={carregandoEvo} />
      ) : ehMargem ? (
        loading ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Carregando...</div>
        ) : (
          <>
            {/* Indicadores de margem (mesma conta do % Mrg da tabela: margem ÷ Real) */}
            <LinhaGauges>
              <Gauge2 label="% Margem Venda Peças - Balcão" value={pctMrgPecasBalcao} />
              <Gauge2 label="% Margem Venda Peças - Oficina" value={pctMrgPecasOficina} />
              <Gauge2 label="% Margem Venda Peças - Pós Vendas" value={pctMrgPecas} />
              <Gauge2 label="% Margem Venda Serviços" value={pctMrgServ} />
            </LinhaGauges>

            {/* MARGEM DE VENDA — departamentos (expansíveis) › setores, e o Total */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
              <p className="text-xs font-bold text-slate-900 p-4 pb-0">Margem de Venda</p>
              <table className="w-full text-left border-collapse mt-3" style={{ minWidth: '760px' }}>
                <thead>
                  <tr className="bg-slate-800 border-b border-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                    {COLUNAS_MARGEM.map((c, i) => (
                      <th key={c} className={`p-2 whitespace-nowrap ${i === 0 ? 'bg-slate-800' : 'text-right'}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {linhasDepartamento.filter(d => d.margemPecas || d.margemServicos).map(dept => {
                    const setoresDept = linhasSetor(dept.deptId).filter(st => st.margemPecas || st.margemServicos)
                    return (
                      <React.Fragment key={dept.deptId}>
                        {/* Aba Margem: sempre expandida (setores sempre visíveis) */}
                        <LinhaMargem label={dept.label} dept={dept} carregando={carregandoValores} />
                        {setoresDept.map(st => (
                          <LinhaMargem key={st.setorId} label={st.label} indent={1} dept={st} carregando={carregandoValores} />
                        ))}
                      </React.Fragment>
                    )
                  })}
                  <LinhaMargem label="Total" negrito dept={totalGeral} carregando={carregandoValores} />
                </tbody>
              </table>
            </div>
          </>
        )
      ) : visao !== 'total' && !ehBalcao && !ehOficina ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">
          Visão <strong className="text-slate-600">{VISOES.find(v => v.key === visao)?.label}</strong> — conteúdo ainda não definido.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Carregando...</div>
      ) : (
        <>
          {/* GAUGES — Acumulado/Possibilidades (barra de progresso) + Margem (tacômetro), todos na mesma linha */}
          {ehOficina ? (
          <LinhaGauges>
            <GaugeProgresso label="Realizado Peças Acum %" value={pctOf(totalOficina.realPecas, totalOficina.metaPecas)} />
            <GaugeProgresso label="Realizado Serv. Acum %" value={pctOf(totalOficina.realServicos, totalOficina.metaServicos)} />
            <GaugeProgresso label="Realizado Total Acum %" value={pctOf(totalOficina.realTotal, totalOficina.metaTotal)} />
            <GaugeProgresso label="Possibilidades %" value={pctOf(projecaoOficina, totalOficina.metaMesTotal)} />
            <Gauge2 label="% Margem Venda Peças - Oficina" value={pctMrgPecasOficina} />
            <Gauge2 label="% Margem Venda Serviços - Oficina" value={pctMrgServOficina} />
          </LinhaGauges>
          ) : ehBalcao ? (
          <LinhaGauges>
            <GaugeProgresso label="Realizado Balcão Acum %" value={gaugeBalcao} />
            <GaugeProgresso label="Possibilidades %" value={gaugePossibilidadesBalcao} />
            <Gauge2 label="% Margem Venda Peças - Balcão" value={pctMrgPecasBalcao} />
          </LinhaGauges>
          ) : (
          <LinhaGauges>
            <GaugeProgresso label="Realizado Peças Acum %" value={gaugePecas} />
            <GaugeProgresso label="Realizado Serv. Acum %" value={gaugeServicos} />
            <GaugeProgresso label="Realizado Total Acum %" value={gaugeTotal} />
            <GaugeProgresso label="Possibilidades %" value={gaugePossibilidades} />
            <Gauge2 label="% Margem Venda Peças - Balcão" value={pctMrgPecasBalcao} />
            <Gauge2 label="% Margem Venda Peças - Oficina" value={pctMrgPecasOficina} />
            <Gauge2 label="% Margem Venda Peças - Pós Vendas" value={pctMrgPecas} />
            <Gauge2 label="% Margem Venda Serviços" value={pctMrgServ} />
          </LinhaGauges>
          )}

          {/* TABELA DE FATURAMENTO */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
            <div className="flex items-center justify-between gap-3 p-4 pb-0">
              <p className="text-xs font-bold text-slate-900">Tabela de Faturamentos</p>
              {ehOficina && !usarProdutivo && (
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-md p-px w-fit">
                  {[{ key: 'consultor', label: 'Por Consultor' }, { key: 'tipoOs', label: 'Por Tipo de OS' }].map(t => (
                    <button key={t.key} onClick={() => setAberturaConsultor(t.key)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold leading-4 transition-colors ${aberturaConsultor === t.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <table className="w-full text-left border-collapse mt-3" style={{ minWidth: ehBalcao ? '1000px' : '1600px' }}>
              <thead>
                <tr className="bg-slate-800 border-b border-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
                  {colunasTabela.map((c, i) => (
                    <th key={c} className={`p-2 whitespace-nowrap ${i === 0 ? 'sticky left-0 bg-slate-800' : 'text-right'}`}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                {linhasTabela.map(dept => (
                  <React.Fragment key={dept.deptId}>
                    <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} label={dept.label} indent={0} dept={dept}
                      carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                      carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                      carregandoPass={carregandoSlot('pass')}
                      nomesSemDepartamento={dept.deptId === '__sem_departamento__' ? [...(usarProdutivo ? valoresProdutivo.nomesSem : nomesSemDepartamento)] : null} soBalcao={ehBalcao} />
                    {linhasSetor(dept.deptId).map(setor => (
                      <React.Fragment key={setor.setorId}>
                        <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} indent={1} dept={setor}
                          label={oficinaComTabela ? (
                            <button type="button" onClick={() => toggleSetor(setor.setorId)}
                              title={!setoresRecolhidos.has(setor.setorId) ? 'Recolher' : (usarProdutivo ? 'Ver mecânicos' : abrirPorTipo ? 'Ver agrupamentos de Tipo de OS' : 'Ver consultores')}
                              className="inline-flex items-center gap-1 -ml-1 hover:text-blue-600 transition-colors">
                              {!setoresRecolhidos.has(setor.setorId) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {setor.label}
                            </button>
                          ) : setor.label}
                          carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                          carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                          carregandoPass={carregandoSlot('pass')} soBalcao={ehBalcao} />
                        {oficinaComTabela && !setoresRecolhidos.has(setor.setorId) && abrirPorTipo && (() => {
                          const tipos = linhasTipoOs(setor.setorId)
                          return linhasGrupoTipo(setor.setorId).map(grupo => {
                            const aberto = gruposExpandidos.has(grupo.grupoKey)
                            return (
                              <React.Fragment key={grupo.grupoKey}>
                                <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} indent={2} dept={grupo} semMeta
                                  label={
                                    <button type="button" onClick={() => toggleGrupo(grupo.grupoKey)}
                                      title={aberto ? 'Recolher' : 'Ver Tipos de OS'}
                                      className="inline-flex items-center gap-1 -ml-1 font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                                      {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      {grupo.label}
                                    </button>
                                  }
                                  carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                                  carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                                  carregandoPass={carregandoSlot('pass')} />
                                {aberto && tipos.filter(t => `${setor.setorId}|${normalizaBusca(t.grupo)}` === grupo.grupoKey).map(tipo => (
                                  <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} key={tipo.tipoKey} label={tipo.label} indent={3} dept={tipo} semMeta
                                    carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                                    carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                                    carregandoPass={carregandoSlot('pass')} />
                                ))}
                              </React.Fragment>
                            )
                          })
                        })()}
                        {oficinaComTabela && !setoresRecolhidos.has(setor.setorId) && !abrirPorTipo && linhasProdutivo(setor.setorId).map(func => {
                          // Setor › Funcionário (consultor ou mecânico) › Tipo Interno › Tipos de OS
                          const chaveFunc = `${setor.setorId}|${func.funcKey}`
                          const funcAberto = funcsExpandidos.has(chaveFunc)
                          return (
                            <React.Fragment key={func.funcKey}>
                              <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} indent={2} dept={func} semMeta={!func.metaTotal}
                                label={
                                  <button type="button" onClick={() => toggleFunc(chaveFunc)}
                                      title={funcAberto ? 'Recolher' : 'Ver Tipos de OS'}
                                      className="inline-flex items-center gap-1 -ml-1 hover:text-blue-600 transition-colors">
                                      {funcAberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      {func.label}
                                      {usarProdutivo && func.box && <span className="ml-1 px-1.5 py-px rounded bg-slate-100 text-[9px] font-semibold text-slate-500">{func.box}</span>}
                                    </button>
                                }
                                carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                                carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                                carregandoPass={carregandoSlot('pass')} />
                              {funcAberto && linhasAbertura('grupo', chaveFunc, 'grupoKey').map(grupo => {
                                const grupoAberto = gruposExpandidos.has(grupo.grupoKey)
                                return (
                                  <React.Fragment key={grupo.grupoKey}>
                                    <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} indent={3} dept={grupo} semMeta
                                      label={
                                        <button type="button" onClick={() => toggleGrupo(grupo.grupoKey)}
                                      title={grupoAberto ? 'Recolher' : 'Ver Tipos de OS'}
                                      className="inline-flex items-center gap-1 -ml-1 font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                                      {grupoAberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                      {grupo.label}
                                    </button>
                                      }
                                      carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                                carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                                carregandoPass={carregandoSlot('pass')} />
                                    {grupoAberto && linhasAbertura('tipo', grupo.grupoKey, 'tipoKey').map(tipo => (
                                      <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} key={tipo.tipoKey} label={tipo.label} indent={4} dept={tipo} semMeta
                                        carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                                carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                                carregandoPass={carregandoSlot('pass')} />
                                    ))}
                                  </React.Fragment>
                                )
                              })}
                            </React.Fragment>
                          )
                        })}
                        {ehBalcao && linhasVendedor(setor.setorId).map(vend => (
                          <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} key={vend.vendedorKey} label={vend.label} indent={2} dept={vend}
                            carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                            carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                            carregandoPass={carregandoSlot('pass')} soBalcao />
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                <LinhaDepto dias={diasInfo} semMargem={usarProdutivo} label="Total" indent={0} negrito dept={totalTabela} soBalcao={ehBalcao}
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
