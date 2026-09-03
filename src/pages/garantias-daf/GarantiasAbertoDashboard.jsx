import React, { useEffect, useState, useMemo, Fragment } from 'react'
import { Loader2, ChevronRight, ChevronDown, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart2, Eye, X } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (s) => { if (!s) return ''; try { return new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }
const diffDias = (a, b) => {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Paleta categórica (passos escuros, validados contra a superfície #0f172a — skill de dataviz), ordem fixa, nunca ciclada.
const PALETA_CATEGORICA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const COR_OUTROS = '#898781'

// Agrupa em até 6 fatias + "Outros", atribuindo cor categórica fixa por posição.
function paraDonut(itens) {
  const top = itens.slice(0, 6).map((d, i) => ({ ...d, chave: d.label, cor: PALETA_CATEGORICA[i] }))
  const outros = itens.slice(6)
  if (outros.length > 0) {
    top.push({ label: `Outros (${outros.length})`, valor: outros.reduce((s, o) => s + o.valor, 0), cor: COR_OUTROS })
  }
  return top
}

// Texto branco ou escuro conforme a luminância da cor da fatia (legibilidade do rótulo %).
function inkParaFundo(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum > 175 ? '#0b0b0b' : '#ffffff'
}

// Donut chart em SVG puro — sem biblioteca de gráficos. Fatias clicáveis filtram (exceto "Outros").
function DonutChart({ data, onSlice, filtroAtivo, encurtar, formatarValor = fmtMoeda }) {
  const total = data.reduce((s, d) => s + d.valor, 0)
  const radius = 60
  const circumference = 2 * Math.PI * radius
  let cumulative = 0
  let cumulativeFrac = 0
  const labels = []
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0">
        <g transform="translate(80,80) rotate(-90)">
          <circle r={radius} fill="none" stroke="#2c2c2a" strokeWidth="24" />
          {total > 0 && data.map((d, i) => {
            const frac = d.valor / total
            const gap = data.length > 1 ? 2 : 0
            const dash = Math.max(frac * circumference - gap, 0)
            const dashOffset = -cumulative
            cumulative += frac * circumference
            const midAngle = (cumulativeFrac + frac / 2) * 2 * Math.PI - Math.PI / 2
            cumulativeFrac += frac
            if (frac >= 0.06) {
              labels.push({ x: 80 + radius * Math.cos(midAngle), y: 80 + radius * Math.sin(midAngle), pct: Math.round(frac * 100), ink: inkParaFundo(d.cor) })
            }
            const clicavel = !!(onSlice && d.chave)
            const ativa = filtroAtivo && d.chave === filtroAtivo
            const esmaecida = filtroAtivo && d.chave !== filtroAtivo
            return (
              <circle
                key={i}
                r={radius}
                fill="none"
                stroke={d.cor}
                strokeWidth={ativa ? 28 : 24}
                strokeOpacity={esmaecida ? 0.35 : 1}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                onClick={clicavel ? () => onSlice(d.chave) : undefined}
                className={clicavel ? 'cursor-pointer transition-all' : 'transition-all'}
              >
                <title>{d.label} · {formatarValor(d.valor)}{d.qtd != null ? ` · ${d.qtd} OS` : d.valorMonetario != null ? ` · ${fmtMoeda(d.valorMonetario)}` : ''}</title>
              </circle>
            )
          })}
        </g>
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y + 3} textAnchor="middle" fill={l.ink} className="pointer-events-none" style={{ fontSize: '9px', fontWeight: 700 }}>
            {l.pct}%
          </text>
        ))}
        <text x="80" y="76" textAnchor="middle" className="fill-white" style={{ fontSize: '12px', fontWeight: 700 }}>{formatarValor(total)}</text>
        <text x="80" y="92" textAnchor="middle" className="fill-[#898781]" style={{ fontSize: '9px' }}>Total</text>
      </svg>

      {/* Legenda abaixo do gráfico — rótulo curto; descrição completa e valor no tooltip. */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {data.map((d, i) => {
          const clicavel = !!(onSlice && d.chave)
          const ativa = filtroAtivo && d.chave === filtroAtivo
          const esmaecida = filtroAtivo && d.chave !== filtroAtivo
          const rotulo = encurtar ? encurtar(d.label) : d.label
          const pct = total ? Math.round((d.valor / total) * 100) : 0
          return (
            <button
              type="button"
              key={i}
              onClick={clicavel ? () => onSlice(d.chave) : undefined}
              title={`${d.label} · ${pct}% · ${formatarValor(d.valor)}${d.qtd != null ? ` · ${d.qtd} OS` : d.valorMonetario != null ? ` · ${fmtMoeda(d.valorMonetario)}` : ''}`}
              className={`flex items-center gap-1.5 text-[10px] transition-opacity ${clicavel ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${esmaecida ? 'opacity-40' : ''}`}
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: d.cor }} />
              <span className={`truncate max-w-[140px] ${ativa ? 'font-bold text-white' : 'font-medium text-[#c3c2b7]'}`}>{rotulo}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Faixas do cluster map — eixo X (dias) e eixo Y (valor da OS). Mesmas faixas/cores da aba Em Andamento.
const BUCKETS_DIAS_CLUSTER = [
  { label: '0–7d', min: 0, max: 7 },
  { label: '7–14d', min: 7, max: 14 },
  { label: '14–21d', min: 14, max: 21 },
  { label: '21–30d', min: 21, max: 30 },
  { label: '30d+', min: 30, max: Infinity },
]
const BUCKETS_VALOR_CLUSTER = [
  { label: 'até 10k', min: 0, max: 10000 },
  { label: '10k–30k', min: 10000, max: 30000 },
  { label: '30k–50k', min: 30000, max: 50000 },
  { label: '50k–100k', min: 50000, max: 100000 },
  { label: '100k+', min: 100000, max: Infinity },
]

// Buckets são contíguos de 0 a Infinity — só não bate com nenhum quando v é negativo.
// Nesse caso cai na PRIMEIRA faixa, não na última (mesmo critério da aba Em Andamento).
function indiceFaixa(v, buckets) {
  const i = buckets.findIndex(b => v >= b.min && v < b.max)
  if (i !== -1) return i
  return v < buckets[0].min ? 0 : buckets.length - 1
}

// Cor de status por cruzamento (dias × valor) — paleta de status fixa, nunca usada como categórica.
function corPorCruzamento(ixDias, iyValor) {
  if (ixDias <= 1 && iyValor <= 1) return '#0ca30c'
  if (ixDias <= 3 && iyValor <= 2) return '#fab219'
  return '#d03b3b'
}

// Cluster map: cada bolha é o cruzamento de uma faixa de dias com uma faixa de valor — o tamanho
// mostra quantas OS caem naquele cruzamento. Clicável: filtra o restante do dashboard.
function ClusterAberto({ dados, filtroAtivo, onSlice }) {
  const pontos = useMemo(() => dados.filter(d => d.dias !== null && d.valor != null), [dados])

  const matriz = useMemo(() => {
    const m = BUCKETS_VALOR_CLUSTER.map(() => BUCKETS_DIAS_CLUSTER.map(() => ({ qtd: 0, valor: 0 })))
    for (const p of pontos) {
      const ix = indiceFaixa(p.dias, BUCKETS_DIAS_CLUSTER)
      const iy = indiceFaixa(p.valor, BUCKETS_VALOR_CLUSTER)
      m[iy][ix].qtd += 1
      m[iy][ix].valor += p.valor
    }
    return m
  }, [pontos])

  if (pontos.length === 0) {
    return <p className="text-xs text-[#898781] text-center py-14">Sem dados suficientes para o gráfico.</p>
  }

  const maxQtd = Math.max(...matriz.flat().map(c => c.qtd), 1)
  const raio = (qtd) => qtd === 0 ? 0 : 7 + Math.sqrt(qtd / maxQtd) * 24

  const W = 620, H = 300, padL = 74, padR = 16, padT = 12, padB = 32
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const nCols = BUCKETS_DIAS_CLUSTER.length
  const nRows = BUCKETS_VALOR_CLUSTER.length
  const colW = plotW / nCols
  const rowH = plotH / nRows

  const xCentro = (i) => padL + colW * (i + 0.5)
  const yCentro = (i) => padT + plotH - rowH * (i + 0.5) // faixa de menor valor fica embaixo

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 420 }}>
      {Array.from({ length: nCols + 1 }, (_, i) => (
        <line key={`vx-${i}`} x1={padL + colW * i} x2={padL + colW * i} y1={padT} y2={H - padB} stroke="#2c2c2a" strokeWidth="1" />
      ))}
      {Array.from({ length: nRows + 1 }, (_, i) => (
        <line key={`hy-${i}`} x1={padL} x2={padL + plotW} y1={padT + rowH * i} y2={padT + rowH * i} stroke="#2c2c2a" strokeWidth="1" />
      ))}

      {BUCKETS_DIAS_CLUSTER.map((b, i) => (
        <text key={`xl-${i}`} x={xCentro(i)} y={H - padB + 16} textAnchor="middle" className="fill-[#898781]" style={{ fontSize: '10px' }}>{b.label}</text>
      ))}
      {BUCKETS_VALOR_CLUSTER.map((b, i) => (
        <text key={`yl-${i}`} x={padL - 8} y={yCentro(i) + 3} textAnchor="end" className="fill-[#898781]" style={{ fontSize: '10px' }}>{b.label}</text>
      ))}

      {matriz.map((linha, iy) => linha.map((cel, ix) => {
        if (cel.qtd === 0) return null
        const ativa = filtroAtivo && filtroAtivo.ix === ix && filtroAtivo.iy === iy
        const esmaecida = filtroAtivo && !ativa
        const cor = corPorCruzamento(ix, iy)
        return (
          <g
            key={`${ix}-${iy}`}
            onClick={onSlice ? () => onSlice(ix, iy) : undefined}
            className={onSlice ? 'cursor-pointer' : undefined}
            style={{ opacity: esmaecida ? 0.35 : 1, transition: 'opacity .15s' }}
          >
            <circle
              cx={xCentro(ix)} cy={yCentro(iy)} r={raio(cel.qtd)}
              fill={cor} fillOpacity="0.55"
              stroke={ativa ? '#ffffff' : cor}
              strokeWidth={ativa ? 2.5 : 1.5}
            >
              <title>{`${BUCKETS_DIAS_CLUSTER[ix].label} · R$ ${BUCKETS_VALOR_CLUSTER[iy].label} · Quant OS: ${cel.qtd} · Valor total das OS: ${fmtMoeda(cel.valor)}`}</title>
            </circle>
            <text x={xCentro(ix)} y={yCentro(iy) + 3} textAnchor="middle" className="fill-white font-bold pointer-events-none" style={{ fontSize: '10px' }}>{cel.qtd}</text>
          </g>
        )
      }))}
    </svg>
  )
}

const STATUS_LABEL = {
  A:  'A — Em Análise',
  B:  'B — Em processo de consideração',
  C:  'C — Fora de Garantia (aceita)',
  G:  'G — Reivindicação apresentada',
  M:  'M — Aprovação por matriz',
  N:  'N — Análise Subsidiária DAF',
  P:  'P — Enviada para ASI',
  Q:  'Q — Ag. material (peças)',
  R:  'R — Avaliação Subsidiária DAF',
  S:  'S — Processo selecionado',
  T:  'T — Análise escritório DAF',
  U:  'U — Fase de crédito',
  V:  'V — Reembolso calculado',
  W:  'W — Ag. material/informação',
  X:  'X — Pronta análise DAF',
  Y:  'Y — Fase de crédito (conc.)',
  FA: 'F — Financeiro APROVADO',
  FR: 'F — Financeiro RECUSADO',
  Z:  'Z — Processo recusado',
}
const statusLabel = (codigo) => STATUS_LABEL[codigo] || codigo || 'Não informado'

// Status 'A' com mais de D+1 sem digitação vira "digitação atrasada" — mesmo critério do Controle.
function isDigAtrasada(g) {
  if (g.status_codigo !== 'A' || !g.data_abertura_os) return false
  const hoje = new Date()
  const abertura = new Date(g.data_abertura_os + 'T12:00:00')
  return Math.floor((hoje - abertura) / 86400000) > 1
}

// Classifica cada garantia num dos 5 grupos gerais de status (visão simplificada do dashboard)
function classificarStatus(g) {
  if (g.status_codigo === 'A') return isDigAtrasada(g) ? 'atrasada' : 'digitar'
  if (g.status_codigo === 'FA') return 'aprovada'
  if (['FR', 'Z'].includes(g.status_codigo)) return 'recusada'
  return 'digitada'
}

// Status detalhado por registro — status 'A' se desdobra conforme os dias desde a abertura da OS.
function statusDetalhado(g) {
  if (g.status_codigo !== 'A') return statusLabel(g.status_codigo)
  if (!g.data_abertura_os) return 'A — Em fase de digitação (D+1)'
  const hoje = new Date()
  const abertura = new Date(g.data_abertura_os + 'T12:00:00')
  const d = Math.floor((hoje - abertura) / 86400000)
  return d > 1 ? 'A — Digitação Atrasada (>D+1)' : 'A — Em fase de digitação (D+1)'
}

// Cartão KPI em degradê — nível "empresa/total" (o primeiro contato do gestor com a tela).
function StatTileGradient({ icon: Icon, label, value, sub, gradiente }) {
  return (
    <div className={`h-full text-left relative overflow-hidden rounded-2xl p-4 shadow-lg transition-transform bg-gradient-to-br ${gradiente} flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">{label}</p>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs text-white/70 mt-2 pt-2 border-t border-white/20">{sub}</p>
      </div>
    </div>
  )
}

const GRUPOS_STATUS = [
  { key: 'digitar',  label: '1 — Garantia a Digitar',   card: 'A Digitar',                icone: FileText,      gradiente: 'from-amber-400 to-orange-600' },
  { key: 'atrasada', label: '2 — Digitação Atrasada',   card: 'Digitação Atrasada',       icone: AlertTriangle, gradiente: 'from-slate-500 to-slate-700' },
  { key: 'digitada', label: '3 — Garantia Digitada',    card: 'Aguardando Aprovação DAF', icone: Clock,         gradiente: 'from-blue-600 to-indigo-800' },
  { key: 'aprovada', label: '4 — Garantias Aprovadas',  card: 'Aprovada',                 icone: CheckCircle2,  gradiente: 'from-teal-500 to-emerald-700' },
  { key: 'recusada', label: '5 — Garantias Recusadas',  card: 'Recusas',                  icone: XCircle,       gradiente: 'from-red-600 to-rose-800' },
]

// Card de resumo — não é filtrável (mesmo padrão do Controle), só mostra o total consolidado.
function CardTotalAberto({ total, distintas, pecas, servicos, geral }) {
  return (
    <div className="h-full rounded-2xl p-4 shadow-lg bg-gradient-to-br from-violet-600 to-purple-800 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">Total Aberto</p>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <BarChart2 className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <div>
        <p className="text-xl font-bold text-white leading-none mb-2">{total} <span className="text-xs font-normal text-white/70">OS</span></p>
        <div className="pt-2 border-t border-white/20 space-y-1 text-[11px] text-white/80">
          <div className="flex items-center justify-between"><span>OS distintas</span><span className="font-semibold text-white">{distintas}</span></div>
          <div className="flex items-center justify-between"><span>Peças</span><span className="font-mono text-white">{fmtMoeda(pecas)}</span></div>
          <div className="flex items-center justify-between"><span>Serviços</span><span className="font-mono text-white">{fmtMoeda(servicos)}</span></div>
          <div className="flex items-center justify-between border-t border-white/20 pt-1 mt-1 font-bold text-white"><span>Total</span><span className="font-mono">{fmtMoeda(geral)}</span></div>
        </div>
      </div>
    </div>
  )
}

// Dashboard "Garantias em Aberto (Encerradas)" — cards por grupo de status, tabela pivot
// Status × Mês/Ano com drill-down (Tipo de OS → Status Atual) e tabela de detalhamento por OS.
export default function GarantiasAbertoDashboard({ onLastModified }) {
  const { isAdmin, empresasPermitidas } = useAuth()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [encerradaLastModified, setEncerradaLastModified] = useState(null)

  const [filtroGrupo, setFiltroGrupo] = useState(null) // null | 'digitar' | 'atrasada' | 'digitada' | 'aprovada' | 'recusada' — card selecionado
  const toggleFiltroGrupo = (key) => setFiltroGrupo(prev => prev === key ? null : key)
  const [filtroStatusShc, setFiltroStatusShc] = useState(null) // texto do Status SHC clicado na tabela de detalhamento
  const toggleFiltroStatusShc = (texto) => setFiltroStatusShc(prev => prev === texto ? null : texto)
  const [filtroEmpresa, setFiltroEmpresa] = useState(null) // fatia clicada no donut "por Empresa"
  const toggleFiltroEmpresa = (label) => setFiltroEmpresa(prev => prev === label ? null : label)
  const [filtroTipo, setFiltroTipo] = useState(null) // fatia clicada no donut "por Tipo de Garantia"
  const toggleFiltroTipo = (label) => setFiltroTipo(prev => prev === label ? null : label)
  const [filtroCluster, setFiltroCluster] = useState(null) // { ix, iy } — cruzamento dias × valor selecionado no cluster map
  const toggleFiltroCluster = (ix, iy) => setFiltroCluster(prev => (prev && prev.ix === ix && prev.iy === iy) ? null : { ix, iy })

  // Dias = desde a Data de Abertura da OS até hoje.
  const clusterOf = (g) => {
    if (!g.data_abertura_os) return null
    const hojeISO = new Date().toISOString().slice(0, 10)
    const dias = diffDias(g.data_abertura_os, hojeISO)
    const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
    return { ix: indiceFaixa(dias, BUCKETS_DIAS_CLUSTER), iy: indiceFaixa(valor, BUCKETS_VALOR_CLUSTER) }
  }

  // Cross-filtro: aplica grupo + empresa + tipo + cluster, com opção de pular um deles (usado
  // pelos próprios gráficos/tabelas, pra fatia/bolha/card clicado não desaparecer do que o originou).
  const aplicarFiltrosAberto = (rows, { pularGrupo, pularEmpresa, pularTipo, pularCluster } = {}) => {
    let out = (!pularGrupo && filtroGrupo) ? rows.filter(g => classificarStatus(g) === filtroGrupo) : rows
    if (!pularEmpresa && filtroEmpresa) out = out.filter(g => (g.empresa_nome || 'Não informado') === filtroEmpresa)
    if (!pularTipo && filtroTipo) out = out.filter(g => (g.tipo_garantia_descricao?.trim() || 'Não informado') === filtroTipo)
    if (!pularCluster && filtroCluster) out = out.filter(g => {
      const c = clusterOf(g)
      return c && c.ix === filtroCluster.ix && c.iy === filtroCluster.iy
    })
    return out
  }

  useEffect(() => {
    setLoading(true)
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getGarantias({ ...filtrosEmpresa, status_not_in: ['E', 'F'] })
      .then(setDados)
      .catch(() => setDados([]))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas])

  // Data de modificação do arquivo-fonte (ROF001_OSABERTA_ENCERRADA) — só para referência,
  // os dados exibidos aqui vêm do Supabase (importados previamente), não ao vivo do arquivo.
  useEffect(() => {
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    fetch(`${BACKEND_URL}/api/garantias/sharepoint/encerrada`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setEncerradaLastModified(data.lastModified ?? null))
      .catch(() => {})
  }, [])

  useEffect(() => { onLastModified?.(encerradaLastModified) }, [encerradaLastModified, onLastModified])

  // Clique num "Status SHC" da tabela de detalhamento filtra cards, tabela pivot e a própria tabela.
  const dadosBaseShc = useMemo(
    () => filtroStatusShc ? dados.filter(g => statusDetalhado(g) === filtroStatusShc) : dados,
    [dados, filtroStatusShc]
  )

  // Base da tabela "Status das Garantias" — reflete empresa/tipo/cluster, mas NÃO o próprio
  // grupo (os cards e a tabela pivot mostram o total de TODOS os grupos; o grupo só controla
  // quais linhas ficam visíveis, via gruposExibidos).
  const dadosSemGrupo = useMemo(
    () => aplicarFiltrosAberto(dadosBaseShc, { pularGrupo: true }),
    [dadosBaseShc, filtroEmpresa, filtroTipo, filtroCluster]
  )

  // Meses (ano+mês) presentes nos dados, com base na Data de Criação da OS
  const meses = useMemo(() => {
    const map = new Map()
    for (const g of dadosSemGrupo) {
      if (!g.data_abertura_os) continue
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const ano = d.getFullYear(), mes = d.getMonth()
      map.set(`${ano}-${mes}`, { ano, mes })
    }
    return [...map.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  }, [dadosSemGrupo])

  const anos = useMemo(() => [...new Set(meses.map(m => m.ano))].sort((a, b) => a - b), [meses])
  const mesesPorAno = useMemo(() => {
    const map = {}
    for (const ano of anos) map[ano] = meses.filter(m => m.ano === ano)
    return map
  }, [anos, meses])

  // pivot[grupoKey][`ano-mes`] = { qtd, valor } · pivot[grupoKey].total = { qtd, valor }
  const pivot = useMemo(() => {
    const p = {}
    for (const grp of GRUPOS_STATUS) p[grp.key] = { total: { qtd: 0, valor: 0 } }
    for (const g of dadosSemGrupo) {
      if (!g.data_abertura_os) continue
      const grpKey = classificarStatus(g)
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
      if (!p[grpKey][chave]) p[grpKey][chave] = { qtd: 0, valor: 0 }
      p[grpKey][chave].qtd += 1
      p[grpKey][chave].valor += valor
      p[grpKey].total.qtd += 1
      p[grpKey].total.valor += valor
    }
    return p
  }, [dadosSemGrupo])

  const totalAno = (grpKey, ano) =>
    (mesesPorAno[ano] || []).reduce((acc, m) => {
      const cel = pivot[grpKey][`${m.ano}-${m.mes}`]
      if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
      return acc
    }, { qtd: 0, valor: 0 })

  // Resumo consolidado (não filtrável) — total de OS em aberto, distintas e por peças/serviços.
  const totalAbertoStats = useMemo(() => {
    const distintas = new Set(dadosBaseShc.map(g => g.numero_os)).size
    const pecas = dadosBaseShc.reduce((s, g) => s + Number(g.valor_pecas || 0), 0)
    const servicos = dadosBaseShc.reduce((s, g) => s + Number(g.valor_servicos || 0), 0)
    return { total: dadosBaseShc.length, distintas, pecas, servicos, geral: pecas + servicos }
  }, [dadosBaseShc])


  // Card selecionado filtra as linhas exibidas na tabela (e gráficos) abaixo dos cards.
  const gruposExibidos = filtroGrupo ? GRUPOS_STATUS.filter(g => g.key === filtroGrupo) : GRUPOS_STATUS

  const dadosExibidos = useMemo(
    () => aplicarFiltrosAberto(dadosBaseShc),
    [dadosBaseShc, filtroGrupo, filtroEmpresa, filtroTipo, filtroCluster]
  )

  // Base do cluster map: reflete os OUTROS filtros ativos, mas não o próprio cruzamento
  // selecionado — assim todas as bolhas continuam visíveis (uma delas realçada).
  const dadosClusterAberto = useMemo(() => {
    const base = aplicarFiltrosAberto(dadosBaseShc, { pularCluster: true })
    const hojeISO = new Date().toISOString().slice(0, 10)
    return base.map(g => ({
      dias: g.data_abertura_os ? diffDias(g.data_abertura_os, hojeISO) : null,
      valor: Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0),
    }))
  }, [dadosBaseShc, filtroGrupo, filtroEmpresa, filtroTipo])

  const somaGrupos = (fn) => gruposExibidos.reduce((acc, g) => {
    const r = fn(g.key)
    acc.qtd += r.qtd; acc.valor += r.valor
    return acc
  }, { qtd: 0, valor: 0 })

  // Donut "OS por Empresa — por Valor" — base exclui o próprio filtro de empresa (cross-filtro).
  const porEmpresaValorDonut = useMemo(() => {
    const base = aplicarFiltrosAberto(dadosBaseShc, { pularEmpresa: true })
    const map = new Map()
    for (const g of base) {
      const emp = g.empresa_nome || 'Não informado'
      if (!map.has(emp)) map.set(emp, { label: emp, qtd: 0, valor: 0 })
      const e = map.get(emp)
      e.qtd += 1
      e.valor += Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
    }
    return paraDonut([...map.values()].sort((a, b) => b.valor - a.valor))
  }, [dadosBaseShc, filtroGrupo, filtroTipo, filtroCluster])

  // Donut "OS por Tipo de Garantia — por Quantidade" — base exclui o próprio filtro de tipo.
  const porTipoQtdDonut = useMemo(() => {
    const base = aplicarFiltrosAberto(dadosBaseShc, { pularTipo: true })
    const map = new Map()
    for (const g of base) {
      const tipo = g.tipo_garantia_descricao?.trim() || 'Não informado'
      if (!map.has(tipo)) map.set(tipo, { label: tipo, qtd: 0, valor: 0 })
      const e = map.get(tipo)
      e.qtd += 1
      e.valor += Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
    }
    return paraDonut([...map.values()].sort((a, b) => b.qtd - a.qtd).map(t => ({ label: t.label, valor: t.qtd, valorMonetario: t.valor })))
  }, [dadosBaseShc, filtroGrupo, filtroEmpresa, filtroCluster])

  // ── Tabela de detalhamento (uma linha por OS) ──────────────────────────
  const [sortCol, setSortCol] = useState('data_abertura_os')
  const [sortDir, setSortDir] = useState('asc')
  const handleSortDetalhe = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  // Modal "Visualizar" — Data SG, Nº SG, Status Geral, Status SHC e Resposta SHC saíram da
  // tabela (deixavam ela larga demais) e agora só aparecem aqui, sob demanda.
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const abrirVisualizar = (row) => { setItemVisualizado(row); setModalVisualizarAberto(true) }

  const linhasDetalhe = useMemo(() => {
    const hojeISO = new Date().toISOString().slice(0, 10)
    return dadosExibidos.map(g => ({
      id: g.id,
      empresa_nome: g.empresa_nome || '',
      numero_os: g.numero_os || '',
      cliente: g.cliente || '',
      tipo_garantia_descricao: g.tipo_garantia_descricao || '',
      data_abertura_os: g.data_abertura_os || '',
      data_fechamento_os: g.data_fechamento_os || '',
      vlr_total: Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0),
      data_sg: g.data_sg || '',
      dias: g.data_abertura_os ? diffDias(g.data_abertura_os, hojeISO) : null,
      numero_sg: g.numero_sg || '',
      status_geral: GRUPOS_STATUS.find(gr => gr.key === classificarStatus(g))?.label || '',
      status_shc: statusDetalhado(g),
      resposta_shc: g.resposta_shc || '',
    }))
  }, [dadosExibidos])

  const linhasOrdenadas = useMemo(() => {
    const arr = [...linhasDetalhe]
    arr.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'number' || typeof vb === 'number') {
        const na = va ?? -Infinity, nb = vb ?? -Infinity
        return sortDir === 'asc' ? na - nb : nb - na
      }
      const cmp = String(va || '').localeCompare(String(vb || ''), 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [linhasDetalhe, sortCol, sortDir])

  const COLUNAS_DETALHE = [
    { key: 'empresa_nome',           label: 'Empresas Fantasia' },
    { key: 'numero_os',              label: 'OS' },
    { key: 'cliente',                label: 'Proprietário Veículo' },
    { key: 'tipo_garantia_descricao', label: 'Tipo de OS' },
    { key: 'data_abertura_os',       label: 'Data Criação', tipo: 'data' },
    { key: 'data_fechamento_os',     label: 'Fechado', tipo: 'data' },
    { key: 'vlr_total',              label: 'Vlr Total', tipo: 'moeda' },
    { key: 'dias',                   label: 'Dias', tipo: 'numero' },
  ]

  // pivotShc[grupoKey][statusCodigo][`ano-mes`] = { qtd, valor } · pivotShc[grupoKey][statusCodigo].total
  const pivotShc = useMemo(() => {
    const p = {}
    for (const grp of GRUPOS_STATUS) p[grp.key] = {}
    for (const g of dadosSemGrupo) {
      if (!g.data_abertura_os) continue
      const grpKey = classificarStatus(g)
      const statusCod = g.status_codigo || '—'
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
      if (!p[grpKey][statusCod]) p[grpKey][statusCod] = { total: { qtd: 0, valor: 0 } }
      if (!p[grpKey][statusCod][chave]) p[grpKey][statusCod][chave] = { qtd: 0, valor: 0 }
      p[grpKey][statusCod][chave].qtd += 1
      p[grpKey][statusCod][chave].valor += valor
      p[grpKey][statusCod].total.qtd += 1
      p[grpKey][statusCod].total.valor += valor
    }
    return p
  }, [dadosSemGrupo])

  const totalAnoShc = (grpKey, statusCod, ano) =>
    (mesesPorAno[ano] || []).reduce((acc, m) => {
      const cel = pivotShc[grpKey][statusCod]?.[`${m.ano}-${m.mes}`]
      if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
      return acc
    }, { qtd: 0, valor: 0 })

  // pivotTipoDentro[grupoKey][statusCodigo][tipoOS][`ano-mes`] = { qtd, valor } · .total
  const pivotTipoDentro = useMemo(() => {
    const p = {}
    for (const grp of GRUPOS_STATUS) p[grp.key] = {}
    for (const g of dadosSemGrupo) {
      if (!g.data_abertura_os) continue
      const grpKey = classificarStatus(g)
      const statusCod = g.status_codigo || '—'
      const tipo = g.tipo_garantia_descricao?.trim() || 'Não informado'
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
      if (!p[grpKey][statusCod]) p[grpKey][statusCod] = {}
      if (!p[grpKey][statusCod][tipo]) p[grpKey][statusCod][tipo] = { total: { qtd: 0, valor: 0 } }
      if (!p[grpKey][statusCod][tipo][chave]) p[grpKey][statusCod][tipo][chave] = { qtd: 0, valor: 0 }
      p[grpKey][statusCod][tipo][chave].qtd += 1
      p[grpKey][statusCod][tipo][chave].valor += valor
      p[grpKey][statusCod][tipo].total.qtd += 1
      p[grpKey][statusCod][tipo].total.valor += valor
    }
    return p
  }, [dadosSemGrupo])

  const totalAnoTipoDentro = (grpKey, statusCod, tipo, ano) =>
    (mesesPorAno[ano] || []).reduce((acc, m) => {
      const cel = pivotTipoDentro[grpKey][statusCod]?.[tipo]?.[`${m.ano}-${m.mes}`]
      if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
      return acc
    }, { qtd: 0, valor: 0 })

  const [gruposExpandidos, setGruposExpandidos] = useState(new Set())
  const toggleGrupo = (key) => setGruposExpandidos(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  const [tiposExpandidos, setTiposExpandidos] = useState(new Set())
  const toggleTipo = (key) => setTiposExpandidos(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  // Colunas de mês por Ano — retraídas mostram só o total do ano. Fechados por padrão
  // (Set vazio = nenhum ano expandido) sempre que a aba é aberta.
  const [anosExpandidos, setAnosExpandidos] = useState(new Set())
  const toggleAno = (ano) => setAnosExpandidos(prev => {
    const next = new Set(prev)
    next.has(ano) ? next.delete(ano) : next.add(ano)
    return next
  })
  const mesesVisiveis = (ano) => anosExpandidos.has(ano) ? mesesPorAno[ano] : []

  if (loading) {
    return (
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-16 flex flex-col items-center gap-3 text-[#898781]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* CARDS — nível empresa/total, clicáveis, filtram a tabela abaixo */}
      <div className="grid grid-cols-6 gap-4">
        {GRUPOS_STATUS.map(grp => (
          <div key={grp.key} className={`h-full relative transition-all hover:shadow-xl ${filtroGrupo && filtroGrupo !== grp.key ? 'opacity-50' : ''} ${filtroGrupo === grp.key ? 'ring-2 ring-white/60 rounded-2xl' : ''}`}>
            <StatTileGradient
              icon={grp.icone}
              label={grp.card}
              value={fmtMoeda(pivot[grp.key].total.valor)}
              sub={`Qtde O.S. ${pivot[grp.key].total.qtd}`}
              gradiente={grp.gradiente}
            />
            <button type="button" onClick={() => toggleFiltroGrupo(grp.key)} className="absolute inset-0 rounded-2xl cursor-pointer" aria-label={`Filtrar por ${grp.card}`} />
          </div>
        ))}
        <CardTotalAberto {...totalAbertoStats} />
      </div>

      {/* GRÁFICOS DE PIZZA — POR VALOR / POR QUANTIDADE (nível categoria, participação no total) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Empresa — por Valor</p>
          <p className="text-[11px] text-[#898781] mb-4">Participação de cada empresa no valor total das garantias em aberto.</p>
          <DonutChart data={porEmpresaValorDonut} onSlice={toggleFiltroEmpresa} filtroAtivo={filtroEmpresa} />
        </div>

        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Tipo de Garantia — por Quantidade</p>
          <p className="text-[11px] text-[#898781] mb-4">Participação de cada tipo na quantidade total de OS.</p>
          <DonutChart
            data={porTipoQtdDonut}
            onSlice={toggleFiltroTipo}
            filtroAtivo={filtroTipo}
            encurtar={(label) => label.split(' ')[0]}
            formatarValor={(v) => `${v} OS`}
          />
        </div>
      </div>

      {/* CLUSTER MAP: OS EM ABERTO — dias × valor, antes das tabelas */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
        <p className="text-xs font-bold text-white mb-1">Ordens de Serviço em Aberto — Concentração por Dias e Valor</p>
        <p className="text-[11px] text-[#898781] mb-2">Cada bolha cruza uma faixa de dias desde a abertura da OS (eixo horizontal) com uma faixa de valor em R$ (eixo vertical) — o tamanho mostra quantas OS caem ali, revelando onde a concentração está.</p>
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#0ca30c' }} /> No prazo <em className="italic">(até 14d e até R$ 30k)</em></span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#fab219' }} /> Atenção <em className="italic">(até 30d e até R$ 50k)</em></span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#d03b3b' }} /> Crítico <em className="italic">(acima disso)</em></span>
        </div>
        <ClusterAberto dados={dadosClusterAberto} filtroAtivo={filtroCluster} onSlice={toggleFiltroCluster} />
      </div>

      {(filtroGrupo || filtroStatusShc || filtroEmpresa || filtroTipo || filtroCluster) && (
        <p className="text-[11px] text-[#898781]">
          Filtrado por{' '}
          {[
            filtroGrupo && <strong key="grupo" className="text-white">{GRUPOS_STATUS.find(g => g.key === filtroGrupo)?.card}</strong>,
            filtroEmpresa && <strong key="empresa" className="text-[#3987e5]">Empresa: {filtroEmpresa}</strong>,
            filtroTipo && <strong key="tipo" className="text-[#199e70]">Tipo: {filtroTipo}</strong>,
            filtroCluster && <strong key="cluster" className="text-[#d03b3b]">{BUCKETS_DIAS_CLUSTER[filtroCluster.ix].label} · {BUCKETS_VALOR_CLUSTER[filtroCluster.iy].label}</strong>,
            filtroStatusShc && <strong key="shc" className="text-[#9085e9]">Status SHC: {filtroStatusShc}</strong>,
          ].filter(Boolean).reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' + ', el], [])}
          {' '}·{' '}
          <button type="button" onClick={() => { setFiltroGrupo(null); setFiltroStatusShc(null); setFiltroEmpresa(null); setFiltroTipo(null); setFiltroCluster(null) }} className="underline hover:text-white">limpar filtros</button>
        </p>
      )}

      {/* TABELA PIVOT — Status x Mês/Ano (nível categoria) */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm overflow-x-auto custom-scrollbar-light">
        <div className="p-5 pb-0">
          <p className="text-xs font-bold text-white mb-1">Status das Garantias</p>
          <p className="text-[11px] text-[#898781] mb-1">Quantidade e valor de garantias por status geral, mês a mês.</p>
        </div>
        {meses.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro com Data de Criação da OS para montar a tabela.</div>
        ) : (
          <table className="min-w-full text-xs border-collapse mt-3">
            <thead>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 w-44 border-b border-white/10">Ano</th>
                {anos.map(ano => {
                  const colapsado = !anosExpandidos.has(ano)
                  return (
                    <th key={ano} colSpan={(colapsado ? 0 : mesesPorAno[ano].length) * 2 + 2} className="p-2 text-center border-b border-l border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleAno(ano)}
                        title={colapsado ? 'Expandir meses' : 'Retrair meses'}
                        className="flex items-center justify-center gap-1 mx-auto hover:text-[#9085e9] transition-colors"
                      >
                        {colapsado ? <ChevronRight className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
                        {ano}
                      </button>
                    </th>
                  )
                })}
                <th colSpan={2} rowSpan={2} className="p-2 text-center align-middle border-b border-l-2 border-white/20 bg-[#9085e9]/10">Total</th>
              </tr>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 border-b border-white/10">Mês</th>
                {anos.map(ano => (
                  <Fragment key={ano}>
                    {mesesVisiveis(ano).map(m => (
                      <th key={`${m.ano}-${m.mes}`} colSpan={2} className="p-2 text-center border-b border-l border-white/10 capitalize">{MESES[m.mes]}</th>
                    ))}
                    <th colSpan={2} className="p-2 text-center border-b border-l border-white/10 bg-white/10">Total</th>
                  </Fragment>
                ))}
              </tr>
              <tr className="bg-white/5 text-[#898781] text-[10px] font-bold uppercase border-b-2 border-white/20">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10">Status Geral</th>
                {anos.map(ano => (
                  <Fragment key={ano}>
                    {mesesVisiveis(ano).map(m => (
                      <Fragment key={`${m.ano}-${m.mes}`}>
                        <th className="p-2 text-right border-l border-white/10">OS</th>
                        <th className="p-2 text-right">Total</th>
                      </Fragment>
                    ))}
                    <th className="p-2 text-right border-l border-white/10 bg-white/10">OS</th>
                    <th className="p-2 text-right bg-white/10">Total</th>
                  </Fragment>
                ))}
                <th className="p-2 text-right border-l-2 border-white/20 bg-[#9085e9]/10">OS</th>
                <th className="p-2 text-right bg-[#9085e9]/10">Total</th>
              </tr>
            </thead>
            <tbody>
              {gruposExibidos.map(grp => {
                const expandido = gruposExpandidos.has(grp.key)
                const statusCods = Object.keys(pivotShc[grp.key]).sort((a, b) => statusLabel(a).localeCompare(statusLabel(b), 'pt-BR'))
                return (
                  <Fragment key={grp.key}>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-2 font-semibold text-white sticky left-0 bg-[#0f172a] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleGrupo(grp.key)}
                          disabled={statusCods.length === 0}
                          className="flex items-center gap-1 hover:text-[#9085e9] transition-colors disabled:cursor-default disabled:hover:text-white"
                        >
                          {statusCods.length > 0 ? (
                            expandido ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          ) : <span className="w-3.5 shrink-0" />}
                          {grp.label}
                        </button>
                      </td>
                      {anos.map(ano => (
                        <Fragment key={ano}>
                          {mesesVisiveis(ano).map(m => {
                            const cel = pivot[grp.key][`${m.ano}-${m.mes}`]
                            return (
                              <Fragment key={`${m.ano}-${m.mes}`}>
                                <td className="p-2 text-right text-[#c3c2b7] border-l border-white/10">{cel?.qtd || ''}</td>
                                <td className="p-2 text-right text-[#c3c2b7] font-medium whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                              </Fragment>
                            )
                          })}
                          {(() => {
                            const t = totalAno(grp.key, ano)
                            return (
                              <Fragment>
                                <td className="p-2 text-right font-bold text-white border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                                <td className="p-2 text-right font-bold text-white bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                              </Fragment>
                            )
                          })()}
                        </Fragment>
                      ))}
                      <td className="p-2 text-right font-bold text-[#9085e9] border-l-2 border-white/20 bg-white/5">{pivot[grp.key].total.qtd || ''}</td>
                      <td className="p-2 text-right font-bold text-[#9085e9] bg-white/5 whitespace-nowrap">{pivot[grp.key].total.qtd ? fmtMoeda(pivot[grp.key].total.valor) : ''}</td>
                    </tr>

                    {expandido && statusCods.map(statusCod => {
                      const shcKey = `${grp.key}::${statusCod}`
                      const shcExpandido = tiposExpandidos.has(shcKey)
                      const tipos = Object.keys(pivotTipoDentro[grp.key][statusCod] || {}).sort((a, b) => a.localeCompare(b, 'pt-BR'))
                      return (
                        <Fragment key={shcKey}>
                          <tr className="border-b border-white/5 bg-white/[0.03] hover:bg-white/[0.06]">
                            <td className="p-2 pl-6 text-[#c3c2b7] sticky left-0 bg-[#111a2e] whitespace-nowrap truncate max-w-[220px]" title={statusLabel(statusCod)}>
                              <button
                                type="button"
                                onClick={() => toggleTipo(shcKey)}
                                disabled={tipos.length === 0}
                                className="flex items-center gap-1 hover:text-[#9085e9] transition-colors disabled:cursor-default disabled:hover:text-[#c3c2b7]"
                              >
                                {tipos.length > 0 ? (
                                  shcExpandido ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
                                ) : <span className="w-3 shrink-0" />}
                                {statusLabel(statusCod)}
                              </button>
                            </td>
                            {anos.map(ano => (
                              <Fragment key={ano}>
                                {mesesVisiveis(ano).map(m => {
                                  const cel = pivotShc[grp.key][statusCod][`${m.ano}-${m.mes}`]
                                  return (
                                    <Fragment key={`${m.ano}-${m.mes}`}>
                                      <td className="p-2 text-right text-[#898781] border-l border-white/10">{cel?.qtd || ''}</td>
                                      <td className="p-2 text-right text-[#898781] whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                                    </Fragment>
                                  )
                                })}
                                {(() => {
                                  const t = totalAnoShc(grp.key, statusCod, ano)
                                  return (
                                    <Fragment>
                                      <td className="p-2 text-right font-semibold text-[#c3c2b7] border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                                      <td className="p-2 text-right font-semibold text-[#c3c2b7] bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                                    </Fragment>
                                  )
                                })()}
                              </Fragment>
                            ))}
                            <td className="p-2 text-right font-semibold text-[#9085e9] border-l-2 border-white/20 bg-white/5">{pivotShc[grp.key][statusCod].total.qtd || ''}</td>
                            <td className="p-2 text-right font-semibold text-[#9085e9] bg-white/5 whitespace-nowrap">{pivotShc[grp.key][statusCod].total.qtd ? fmtMoeda(pivotShc[grp.key][statusCod].total.valor) : ''}</td>
                          </tr>

                          {shcExpandido && tipos.map(tipo => (
                            <tr key={`${shcKey}::${tipo}`} className="border-b border-white/5 bg-white/[0.015] hover:bg-white/[0.04]">
                              <td className="p-2 pl-12 text-[#898781] sticky left-0 bg-[#0e1626] whitespace-nowrap truncate max-w-[220px]" title={tipo}>{tipo}</td>
                              {anos.map(ano => (
                                <Fragment key={ano}>
                                  {mesesVisiveis(ano).map(m => {
                                    const cel = pivotTipoDentro[grp.key][statusCod][tipo][`${m.ano}-${m.mes}`]
                                    return (
                                      <Fragment key={`${m.ano}-${m.mes}`}>
                                        <td className="p-2 text-right text-[#898781] border-l border-white/10">{cel?.qtd || ''}</td>
                                        <td className="p-2 text-right text-[#898781] whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                                      </Fragment>
                                    )
                                  })}
                                  {(() => {
                                    const t = totalAnoTipoDentro(grp.key, statusCod, tipo, ano)
                                    return (
                                      <Fragment>
                                        <td className="p-2 text-right font-medium text-[#c3c2b7] border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                                        <td className="p-2 text-right font-medium text-[#c3c2b7] bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                                      </Fragment>
                                    )
                                  })()}
                                </Fragment>
                              ))}
                              <td className="p-2 text-right font-medium text-[#9085e9]/80 border-l-2 border-white/20 bg-white/5">{pivotTipoDentro[grp.key][statusCod][tipo].total.qtd || ''}</td>
                              <td className="p-2 text-right font-medium text-[#9085e9]/80 bg-white/5 whitespace-nowrap">{pivotTipoDentro[grp.key][statusCod][tipo].total.qtd ? fmtMoeda(pivotTipoDentro[grp.key][statusCod][tipo].total.valor) : ''}</td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </Fragment>
                )
              })}
              <tr className="bg-white/5 font-bold text-white border-t-2 border-white/20">
                <td className="p-2 sticky left-0 bg-[#141d33]">Total</td>
                {anos.map(ano => (
                  <Fragment key={ano}>
                    {mesesVisiveis(ano).map(m => {
                      const t = somaGrupos(k => pivot[k][`${m.ano}-${m.mes}`] || { qtd: 0, valor: 0 })
                      return (
                        <Fragment key={`${m.ano}-${m.mes}`}>
                          <td className="p-2 text-right border-l border-white/10">{t.qtd || ''}</td>
                          <td className="p-2 text-right whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                        </Fragment>
                      )
                    })}
                    {(() => {
                      const t = somaGrupos(k => totalAno(k, ano))
                      return (
                        <Fragment>
                          <td className="p-2 text-right border-l border-white/10 bg-white/10">{t.qtd || ''}</td>
                          <td className="p-2 text-right bg-white/10 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                        </Fragment>
                      )
                    })()}
                  </Fragment>
                ))}
                {(() => {
                  const t = somaGrupos(k => pivot[k].total)
                  return (
                    <Fragment>
                      <td className="p-2 text-right border-l-2 border-white/20 bg-white/10">{t.qtd || ''}</td>
                      <td className="p-2 text-right bg-white/10 whitespace-nowrap">{fmtMoeda(t.valor)}</td>
                    </Fragment>
                  )
                })()}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* TABELA DE DETALHAMENTO — última ponta da narrativa, uma linha por OS */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm overflow-x-auto custom-scrollbar-light">
        <div className="p-5 pb-0">
          <p className="text-xs font-bold text-white mb-1">Ordens de Serviço</p>
          <p className="text-[11px] text-[#898781] mb-1">Detalhamento das garantias em aberto, conforme os filtros ativos acima.</p>
        </div>
        {linhasOrdenadas.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro para exibir.</div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '1800px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#141d33] border-b border-white/10 text-[#898781] text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 text-center whitespace-nowrap">Ações</th>
                {COLUNAS_DETALHE.map(c => (
                  <th
                    key={c.key}
                    onClick={() => handleSortDetalhe(c.key)}
                    className={`p-3 whitespace-nowrap cursor-pointer select-none hover:bg-white/10 hover:text-white transition-colors ${c.tipo === 'moeda' || c.tipo === 'numero' ? 'text-right' : ''}`}
                  >
                    <span className={`flex items-center gap-1 ${c.tipo === 'moeda' || c.tipo === 'numero' ? 'justify-end' : ''}`}>
                      {c.label}
                      <span className={sortCol === c.key ? 'text-[#3987e5]' : 'text-white/20'}>
                        {sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-xs text-[#c3c2b7]">
              {linhasOrdenadas.map(row => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => abrirVisualizar(row)}
                      title="Visualizar Data SG, Nº SG, Status Geral, Status SHC e Resposta SHC"
                      className="p-1.5 text-[#898781] hover:text-[#9085e9] hover:bg-[#9085e9]/10 rounded transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                  {COLUNAS_DETALHE.map(c => {
                    const valor = row[c.key]
                    const texto = c.tipo === 'data' ? fmtData(valor) : c.tipo === 'moeda' ? (valor ? fmtMoeda(valor) : '') : (valor ?? '')
                    if (c.tipo === 'texto_longo') {
                      return (
                        <td key={c.key} className="p-3 text-[#c3c2b7] whitespace-normal break-words align-top max-w-[260px] min-w-[200px]">
                          {texto || <span className="text-white/20">—</span>}
                        </td>
                      )
                    }
                    return (
                      <td key={c.key} className={`p-3 whitespace-nowrap ${c.tipo === 'moeda' || c.tipo === 'numero' ? 'text-right font-semibold text-white' : 'text-[#c3c2b7]'} ${c.key === 'empresa_nome' || c.key === 'cliente' || c.key === 'tipo_garantia_descricao' ? 'truncate max-w-[220px]' : ''}`}>
                        {texto || <span className="text-white/20">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: VISUALIZAR — Data SG, Nº SG, Status Geral, Status SHC, Resposta SHC */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] rounded-lg border border-white/10 w-full max-w-[560px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#9085e9]" />
                OS {itemVisualizado.numero_os}
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-[#898781] hover:text-white"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#898781] uppercase tracking-wide">Data SG</span>
                <span className="text-xs font-semibold text-white">{fmtData(itemVisualizado.data_sg) || '—'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#898781] uppercase tracking-wide">Nº SG</span>
                <span className="text-xs font-semibold text-white">{itemVisualizado.numero_sg || '—'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#898781] uppercase tracking-wide">Status Geral</span>
                <span className="text-xs font-semibold text-white">{itemVisualizado.status_geral || '—'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#898781] uppercase tracking-wide">Status SHC</span>
                <button
                  type="button"
                  onClick={() => { toggleFiltroStatusShc(itemVisualizado.status_shc); setModalVisualizarAberto(false) }}
                  title="Filtrar por este Status SHC"
                  className="text-xs font-semibold text-left text-[#9085e9] hover:underline"
                >
                  {itemVisualizado.status_shc || '—'}
                </button>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-[#898781] uppercase tracking-wide">Resposta SHC</span>
                <span className="text-xs font-semibold text-white whitespace-normal break-words">{itemVisualizado.resposta_shc || '—'}</span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-white/5 border-t border-white/10">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-[#c3c2b7] hover:bg-white/10 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
