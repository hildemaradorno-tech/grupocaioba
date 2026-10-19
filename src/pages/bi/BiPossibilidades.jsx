import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Gauge, CalendarDays, Clock, Hourglass, CheckCircle2, AlertTriangle, XCircle,
  Building2, Info, Loader2, RefreshCw, ChevronDown, ChevronRight,
} from 'lucide-react'
import { apiService } from '../../services/api'
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
        className="text-xs px-2 py-1.5 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-w-[230px] flex items-center justify-between gap-2">
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
function LinhaDepto({ label, indent, negrito, dept, carregandoRealPecas, carregandoRealServicos, carregandoMargemPecas, carregandoMargemServicos, carregandoPass, nomesSemDepartamento, soBalcao = false, dias, semMeta = false }) {
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
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemPecas ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemPecas)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgPecas.toFixed(2)}%</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoMargemServicos ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : fmtMoeda(dept.margemServicos)}</td>
      <td className="p-2 text-right whitespace-nowrap">{pctMrgServ.toFixed(2)}%</td>
      <td className="p-2 text-right whitespace-nowrap">{carregandoPass ? <Loader2 className="h-3 w-3 animate-spin inline-block text-slate-300" /> : (dept.pass || '—')}</td>
      <td className="p-2 text-right whitespace-nowrap">{ticket !== null ? fmtMoeda(ticket) : '—'}</td>
      </>)}
    </tr>
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
  const [visao, setVisao] = useState('total') // 'total' | 'balcao' | 'oficina' | 'margem' | 'evolucao'
  // Aba Oficina: sub-abas e, na sub-aba Total, o modo de visualização.
  const [modoOficina, setModoOficina] = useState('tipoOs') // 'tipoOs' | 'produtivo'
  // Modo Consultor: o que abre abaixo do setor na tabela — consultores ou Tipos de OS.
  const [aberturaConsultor, setAberturaConsultor] = useState('consultor') // 'consultor' | 'tipoOs'
  // Setores da Oficina expandidos (mostrando os Tipos de OS) — começam recolhidos.
  const [setoresExpandidos, setSetoresExpandidos] = useState(() => new Set())
  const toggleSetor = (setorId) => setSetoresExpandidos(prev => {
    const novo = new Set(prev)
    if (novo.has(setorId)) novo.delete(setorId); else novo.add(setorId)
    return novo
  })

  const anoRef = useMemo(() => new Date(dataFim + 'T12:00:00').getFullYear(), [dataFim])
  const mesRef = useMemo(() => new Date(dataFim + 'T12:00:00').getMonth() + 1, [dataFim])

  // Período efetivo da tela: "Metas e Real entre Datas" = Data Início → Data Fim; "Metas e Real no
  // Mês" = mês inteiro da Data Fim (a Data Início é ignorada). Meta e Real seguem este período.
  const noMes = aba === 'noMes'
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
  // Modo Produtivo (Oficina): os mesmos valores atribuídos pelo departamento/setor do FUNCIONÁRIO.
  const [valoresProdutivo, setValoresProdutivo] = useState(() => ({ depto: new Map(), setor: new Map(), setorFunc: new Map(), nomesSem: new Set() }))
  const [carregandoValores, setCarregandoValores] = useState(true)
  // Tipos de OS (como vêm do arquivo) que caíram em "Sem Departamento" em qualquer Medida com
  // Slot — mostrados no ícone de info da linha, pra não precisar investigar por fora.
  const [nomesSemDepartamento, setNomesSemDepartamento] = useState(() => new Set())
  // Gravação mais antiga entre os dados do período mostrado ("Última atualização").
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
      const total = new Map(), porDepto = new Map(), porSetor = new Map(), porSetorFunc = new Map(), porSetorTipo = new Map(), nomes = new Set()
      const prod = { depto: new Map(), setor: new Map(), setorFunc: new Map(), nomesSem: new Set() }
      for (const m of medidas.filter(m => m.slot_faturamento && m.ativo)) {
        const r = resolverPorDepartamento(gruposPorMedida.get(m.id) || [], m, { tiposOS, setores })
        total.set(m.slot_faturamento, r.valorTotal)
        porDepto.set(m.slot_faturamento, r.valoresPorDepartamento)
        porSetor.set(m.slot_faturamento, r.valoresPorSetor)
        porSetorFunc.set(m.slot_faturamento, r.valoresPorSetorFuncionario)
        porSetorTipo.set(m.slot_faturamento, r.valoresPorSetorTipoOs)
        for (const n of r.nomesSemDepartamento) nomes.add(n)
        const colunaProd = SLOT_PRODUTIVO[m.slot_faturamento]
        if (colunaProd) {
          const p = resolverPorFuncionario(gruposPorMedida.get(m.id) || [], m, { funcionarios, setores, deptSemCadastro: DEPTO_OFICINA })
          prod.depto.set(colunaProd, p.valoresPorDepartamento)
          prod.setor.set(colunaProd, p.valoresPorSetor)
          prod.setorFunc.set(colunaProd, p.valoresPorSetorFuncionario)
          for (const n of p.nomesSemDepartamento) prod.nomesSem.add(n)
        }
      }
      setValoresProdutivo(prod)
      setValoresSlot(total); setValoresSlotDepto(porDepto); setValoresSlotSetor(porSetor); setValoresSlotSetorFunc(porSetorFunc); setValoresSlotSetorTipo(porSetorTipo)
      setNomesSemDepartamento(nomes)
      setUltimaAtualizacao(maisAntiga)
    }).catch(() => {
      if (cancelado) return
      setValoresSlot(new Map()); setValoresSlotDepto(new Map()); setValoresSlotSetor(new Map()); setValoresSlotSetorFunc(new Map()); setValoresSlotSetorTipo(new Map()); setNomesSemDepartamento(new Set()); setUltimaAtualizacao(null)
    }).finally(() => { if (!cancelado) setCarregandoValores(false) })
    return () => { cancelado = true }
  // chaveEmpresas (texto) no lugar do array — o array muda de referência a cada render.
  }, [chaveEmpresas, periodo, tiposOS, setores, funcionarios, recarga])

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
    if (noMes) {
      const ate = isoLocal(ontem())
      const trabalhados = soma(linhasMes.filter(r => r.data <= ate))
      return { uteis, trabalhados, restantes: Math.max(uteis - trabalhados, 0) }
    }
    const trabalhados = soma(calendario.filter(r => r.data >= dataInicio && r.data <= dataFim))
    const restantes = soma(linhasMes.filter(r => r.data > dataFim))
    return { uteis, trabalhados, restantes }
  }, [calendario, anoRef, mesRef, dataInicio, dataFim, noMes])

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
          colaborador_nome: r.colaborador_nome || '', tipo: r.tipo,
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
  })).filter(s => s.realTotal || s.margemPecas || s.margemServicos || s.pass)

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
  const oficinaComTabela = ehOficina

  // Funcionários abaixo do setor (Oficina, modo Produtivo): valores pelo setor do cadastro dele e a
  // meta publicada dele (casada por nome). Sem meta, Meta e % aparecem como "—".
  // Funcionários abaixo do setor na aba Serviços: modo Oficina = mecânicos (ROF042, setor do
  // cadastro); modo Consultor = consultores (venda do recepcionista, setor pelo Tipo de OS).
  const linhasProdutivo = (setorId) => {
    const porNome = new Map()
    const pegar = (chave, nome) => {
      if (!porNome.has(chave)) porNome.set(chave, { funcKey: chave, label: nome, metaPecas: 0, metaServicos: 0, metaTotal: 0, metaMesPecas: 0, metaMesTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
      return porNome.get(chave)
    }
    for (const [slot, campo] of [['realPecas', 'realPecas'], ['realServicos', 'realServicos'], ['margemPecas', 'margemPecas'], ['margemServicos', 'margemServicos'], ['pass', 'pass']]) {
      for (const v of ((usarProdutivo ? valoresProdutivo.setorFunc : valoresSlotSetorFunc).get(slot)?.values() || [])) {
        if (v.setorId !== setorId) continue
        pegar(normalizaBusca(v.nome), v.nome)[campo] += v.valor
      }
    }
    for (const m of metasConsideradas) {
      if (m.setor_id !== setorId || !m.colaborador_nome) continue
      const l = pegar(normalizaBusca(m.colaborador_nome), m.colaborador_nome)
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
        if (!porTipo.has(chave)) porTipo.set(chave, { tipoKey: chave, label: v.nome, metaPecas: 0, metaServicos: 0, metaTotal: 0, realPecas: 0, realServicos: 0, margemPecas: 0, margemServicos: 0, pass: 0 })
        porTipo.get(chave)[slot] += v.valor
      }
    }
    return [...porTipo.values()]
      .map(l => ({ ...l, realTotal: l.realPecas + l.realServicos }))
      .filter(l => l.realTotal || l.margemPecas || l.margemServicos || l.pass)
      .sort((a, b) => b.realTotal - a.realTotal || a.label.localeCompare(b.label, 'pt-BR'))
  }
  const abrirPorTipo = ehOficina && !usarProdutivo && aberturaConsultor === 'tipoOs'

  const linhasTabela = ehBalcao ? linhasDepartamento.filter(d => d.deptId === DEPTO_BALCAO_PECAS)
    : ehOficina ? linhasDepartamento.filter(d => d.deptId === DEPTO_OFICINA)
    : linhasDepartamento
  const totalTabela = ehBalcao ? totalBalcao : ehOficina ? totalOficina : totalGeral
  const colunasTabela = ehBalcao ? COLUNAS_BALCAO : COLUNAS_FATURAMENTO
  const tituloVisao = VISOES.find(v => v.key === visao)?.label || 'Total'

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS */}
      <div className="relative overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-100 via-orange-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-stretch justify-between gap-4 p-5">
          <div className="flex flex-col justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Faturamento — {tituloVisao}</h1>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">Relatório de Possibilidades — Sintonia do Dia</p>
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
            {/* Última atualização + botão Atualizar, acima dos filtros */}
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 leading-tight">
                Última atualização: <strong className="text-slate-700">{sincronizando ? '...' : fmtDataHora(ultimaAtualizacao)}</strong>
              </p>
              <button
                type="button"
                onClick={atualizarAgora}
                disabled={atualizando}
                title={sincronizando ? 'Atualizando...' : 'Atualizar dados'}
                aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${atualizando ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {erroAtualizacao && <p className="text-[10px] text-red-600 max-w-[420px] text-right leading-tight">{erroAtualizacao}</p>}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas Fantasia</label>
                <SeletorEmpresas empresas={empresas} selecionadas={empresaIds} onChange={setEmpresaIds} />
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
      </div>

      {/* VISÕES + (na Total) Metas e Real entre Datas / no Mês, na mesma linha */}
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
        {VISOES.map(v => (
          <button
            key={v.key}
            onClick={() => setVisao(v.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${visao === v.key ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {(visao === 'total' || ehBalcao || ehOficina) && (
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

      {visao !== 'total' && !ehBalcao && !ehOficina ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">
          Visão <strong className="text-slate-600">{VISOES.find(v => v.key === visao)?.label}</strong> — conteúdo ainda não definido.
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Carregando...</div>
      ) : (
        <>
          {/* GAUGES — Acumulado/Possibilidades (barra de progresso) + Margem (tacômetro), todos na mesma linha */}
          {ehOficina ? (
          <LinhaGauges esquerda={
            <div className="h-full flex flex-col justify-start gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Modo</span>
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
                {MODOS_OFICINA.map(t => (
                  <button key={t.key} onClick={() => setModoOficina(t.key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${modoOficina === t.key ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          }>
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
                    <LinhaDepto dias={diasInfo} label={dept.label} indent={0} dept={dept}
                      carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                      carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                      carregandoPass={carregandoSlot('pass')}
                      nomesSemDepartamento={dept.deptId === '__sem_departamento__' ? [...(usarProdutivo ? valoresProdutivo.nomesSem : nomesSemDepartamento)] : null} soBalcao={ehBalcao} />
                    {linhasSetor(dept.deptId).map(setor => (
                      <React.Fragment key={setor.setorId}>
                        <LinhaDepto dias={diasInfo} indent={1} dept={setor}
                          label={oficinaComTabela ? (
                            <button type="button" onClick={() => toggleSetor(setor.setorId)}
                              title={setoresExpandidos.has(setor.setorId) ? 'Recolher' : (usarProdutivo ? 'Ver mecânicos' : abrirPorTipo ? 'Ver Tipos de OS' : 'Ver consultores')}
                              className="inline-flex items-center gap-1 -ml-1 hover:text-blue-600 transition-colors">
                              {setoresExpandidos.has(setor.setorId) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              {setor.label}
                            </button>
                          ) : setor.label}
                          carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                          carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                          carregandoPass={carregandoSlot('pass')} soBalcao={ehBalcao} />
                        {oficinaComTabela && setoresExpandidos.has(setor.setorId) && abrirPorTipo && linhasTipoOs(setor.setorId).map(tipo => (
                          <LinhaDepto dias={diasInfo} key={tipo.tipoKey} label={tipo.label} indent={2} dept={tipo} semMeta
                            carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                            carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                            carregandoPass={carregandoSlot('pass')} />
                        ))}
                        {oficinaComTabela && setoresExpandidos.has(setor.setorId) && !abrirPorTipo && linhasProdutivo(setor.setorId).map(func => (
                          <LinhaDepto dias={diasInfo} key={func.funcKey} label={func.label} indent={2} dept={func} semMeta={!func.metaTotal}
                            carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                            carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                            carregandoPass={carregandoSlot('pass')} />
                        ))}
                        {ehBalcao && linhasVendedor(setor.setorId).map(vend => (
                          <LinhaDepto dias={diasInfo} key={vend.vendedorKey} label={vend.label} indent={2} dept={vend}
                            carregandoRealPecas={carregandoSlot('realPecas')} carregandoRealServicos={carregandoSlot('realServicos')}
                            carregandoMargemPecas={carregandoSlot('margemPecas')} carregandoMargemServicos={carregandoSlot('margemServicos')}
                            carregandoPass={carregandoSlot('pass')} soBalcao />
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
                <LinhaDepto dias={diasInfo} label="Total" indent={0} negrito dept={totalTabela} soBalcao={ehBalcao}
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
