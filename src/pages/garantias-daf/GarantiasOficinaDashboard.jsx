import React, { useEffect, useState, useMemo, Fragment } from 'react'
import { Loader2, Wrench, AlertTriangle, XCircle, Clock, CheckCircle2 } from 'lucide-react'
import { apiService } from '../../services/api'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (s) => { if (!s) return ''; try { return new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }

// Paleta categórica (passos escuros, validados contra a superfície #0f172a — skill de dataviz), ordem fixa, nunca ciclada.
const PALETA_CATEGORICA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const COR_OUTROS = '#898781'

// Cartão KPI em degradê — nível "empresa/total" da narrativa (o primeiro que o gestor vê).
function StatTileGradient({ icon: Icon, label, value, sub, rodape, gradiente }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 shadow-lg bg-gradient-to-br ${gradiente}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">{label}</p>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mt-1 leading-none">{value}</p>
      <p className="text-xs text-white/70 mt-1">{sub}</p>
      {rodape != null && <p className="text-sm font-bold text-white mt-2 pt-2 border-t border-white/20">{rodape}</p>}
    </div>
  )
}

// Agrupa em até 6 fatias + "Outros", atribuindo cor categórica fixa por posição.
// `chave` é o valor usado para filtrar (a fatia "Outros" não é clicável — não tem chave única).
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
// `encurtar` (opcional) reduz o rótulo da legenda (ex: "G01 - GARANTIA..." → "G01"); o texto completo fica no tooltip.
// `formatarValor` (opcional) troca a formatação de moeda por outra (ex: quantidade de OS).
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
            // Rótulo % no meio da fatia — só quando a fatia é larga o bastante para o texto caber.
            const midAngle = (cumulativeFrac + frac / 2) * 2 * Math.PI - Math.PI / 2
            cumulativeFrac += frac
            if (frac >= 0.06) {
              labels.push({
                x: 80 + radius * Math.cos(midAngle),
                y: 80 + radius * Math.sin(midAngle),
                pct: Math.round(frac * 100),
                ink: inkParaFundo(d.cor),
              })
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
          <text
            key={i}
            x={l.x}
            y={l.y + 3}
            textAnchor="middle"
            fill={l.ink}
            className="pointer-events-none"
            style={{ fontSize: '9px', fontWeight: 700 }}
          >
            {l.pct}%
          </text>
        ))}
        <text x="80" y="76" textAnchor="middle" className="fill-white" style={{ fontSize: '12px', fontWeight: 700 }}>
          {formatarValor(total)}
        </text>
        <text x="80" y="92" textAnchor="middle" className="fill-[#898781]" style={{ fontSize: '9px' }}>
          Total
        </text>
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

// Faixas do cluster map — eixo X (dias em aberto, a cada 7 dias) e eixo Y (valor da OS).
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

// Buckets são contíguos de 0 a Infinity — só não bate com nenhum quando v é negativo
// (data de criação futura, valor com estorno etc.). Nesse caso cai na PRIMEIRA faixa, não na
// última: sem isso, essas OS anômalas ficavam escondidas dentro da bolha "30d+ / 100k+".
function indiceFaixa(v, buckets) {
  const i = buckets.findIndex(b => v >= b.min && v < b.max)
  if (i !== -1) return i
  return v < buckets[0].min ? 0 : buckets.length - 1
}

// Cor de status por cruzamento (dias × valor) — paleta de status fixa, nunca usada como categórica.
// Verde: até 14 dias e até 30k. Amarelo: até 30 dias e até 50k. Vermelho: acima disso em qualquer eixo.
function corPorCruzamento(ixDias, iyValor) {
  if (ixDias <= 1 && iyValor <= 1) return '#0ca30c'
  if (ixDias <= 3 && iyValor <= 2) return '#fab219'
  return '#d03b3b'
}

// Cluster map: cada bolha é o cruzamento de uma faixa de dias em aberto (eixo X) com uma faixa
// de valor (eixo Y) — o tamanho da bolha mostra quantas OS caem naquele cruzamento, revelando
// onde a concentração de ordens de serviço está (ex: muitas OS de alto valor há mais de 30 dias).
// Clicável: cada bolha filtra o restante do dashboard pelo mesmo cruzamento (dias × valor).
function ClusterOficina({ dados, filtroAtivo, onSlice }) {
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
      {/* Grade */}
      {Array.from({ length: nCols + 1 }, (_, i) => (
        <line key={`vx-${i}`} x1={padL + colW * i} x2={padL + colW * i} y1={padT} y2={H - padB} stroke="#2c2c2a" strokeWidth="1" />
      ))}
      {Array.from({ length: nRows + 1 }, (_, i) => (
        <line key={`hy-${i}`} x1={padL} x2={padL + plotW} y1={padT + rowH * i} y2={padT + rowH * i} stroke="#2c2c2a" strokeWidth="1" />
      ))}

      {/* Rótulos eixo X — dias em aberto, a cada 7 dias */}
      {BUCKETS_DIAS_CLUSTER.map((b, i) => (
        <text key={`xl-${i}`} x={xCentro(i)} y={H - padB + 16} textAnchor="middle" className="fill-[#898781]" style={{ fontSize: '10px' }}>{b.label}</text>
      ))}
      {/* Rótulos eixo Y — faixas de valor */}
      {BUCKETS_VALOR_CLUSTER.map((b, i) => (
        <text key={`yl-${i}`} x={padL - 8} y={yCentro(i) + 3} textAnchor="end" className="fill-[#898781]" style={{ fontSize: '10px' }}>{b.label}</text>
      ))}

      {/* Bolhas — tamanho proporcional à quantidade de OS no cruzamento; clicáveis */}
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

// Faixas de tempo na oficina — cores de status (bom → crítico), fixas e nunca usadas como categórico.
const BUCKETS_OFICINA = [
  { key: 'b1', label: '0–3 dias',  min: 0,  max: 3,        cor: '#0ca30c' },
  { key: 'b2', label: '4–7 dias',  min: 4,  max: 7,        cor: '#fab219' },
  { key: 'b3', label: '8–14 dias', min: 8,  max: 14,       cor: '#ec835a' },
  { key: 'b4', label: '>14 dias',  min: 15, max: Infinity, cor: '#d03b3b' },
]
const diasNaOficina = (r) => r.data_criacao ? Math.floor((new Date() - new Date(r.data_criacao + 'T12:00:00')) / 86400000) : null

// Dashboard "Garantias na Oficina" — ROF001_OSABERTA.xlsx ao vivo do SharePoint,
// apenas OS do tipo Garantia, com filtros cruzados entre todos os gráficos.
export default function GarantiasOficinaDashboard({ onLastModified }) {
  const [oficinaRows, setOficinaRows] = useState([])
  const [oficinaLoading, setOficinaLoading] = useState(true)
  const [siglasGarantiaOficina, setSiglasGarantiaOficina] = useState(new Set())
  const [oficinaLastModified, setOficinaLastModified] = useState(null)

  useEffect(() => {
    setOficinaLoading(true)
    fetch(`${BACKEND_URL}/api/garantias/sharepoint/aberta`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setOficinaRows(Array.isArray(data) ? data : (data.rows ?? []))
        setOficinaLastModified(Array.isArray(data) ? null : (data.lastModified ?? null))
      })
      .catch(() => setOficinaRows([]))
      .finally(() => setOficinaLoading(false))
    apiService.getTiposOS().then(tipos => {
      const siglas = new Set(tipos.filter(t => t.classificacao === 'Garantia' && t.sigla).map(t => String(t.sigla).trim().toUpperCase()))
      setSiglasGarantiaOficina(siglas)
    }).catch(() => {})
  }, [])

  // Só ordens de serviço do tipo Garantia — a oficina também atende revisão, funilaria etc.
  const oficinaRowsGarantia = useMemo(() => {
    if (siglasGarantiaOficina.size === 0) return oficinaRows
    const tipoCode = (s) => String(s || '').trim().split(' ')[0].toUpperCase()
    return oficinaRows.filter(r => siglasGarantiaOficina.has(tipoCode(r.tipo_os_sigla)))
  }, [oficinaRows, siglasGarantiaOficina])

  // ── Filtros cruzados: clicar em qualquer gráfico filtra os demais e os cards ──
  const [filtroBucket, setFiltroBucket] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState(null)
  const [filtroEmpresaOficina, setFiltroEmpresaOficina] = useState(null)
  const [filtroCluster, setFiltroCluster] = useState(null) // { ix, iy } — cruzamento dias × valor selecionado no cluster map
  const toggleFiltroBucket = (key) => setFiltroBucket(prev => prev === key ? null : key)
  const toggleFiltroTipo = (label) => setFiltroTipo(prev => prev === label ? null : label)
  const toggleFiltroEmpresaOficina = (label) => setFiltroEmpresaOficina(prev => prev === label ? null : label)
  const toggleFiltroCluster = (ix, iy) => setFiltroCluster(prev => (prev && prev.ix === ix && prev.iy === iy) ? null : { ix, iy })
  const algumFiltroOficinaAtivo = !!(filtroBucket || filtroTipo || filtroEmpresaOficina || filtroCluster)
  const limparDashboardOficina = () => { setFiltroBucket(null); setFiltroTipo(null); setFiltroEmpresaOficina(null); setFiltroCluster(null) }

  const bucketOf = (r) => {
    const d = diasNaOficina(r)
    if (d === null) return null
    return BUCKETS_OFICINA.find(b => d >= b.min && d <= b.max)?.key || null
  }
  const tipoOf = (r) => r.tipo_os_descricao?.trim() || r.tipo_os_sigla?.trim() || 'Não informado'
  const empresaOf = (r) => r.empresa_nome?.trim() || 'Não informado'
  const clusterOf = (r) => {
    const d = diasNaOficina(r)
    if (d === null) return null
    return { ix: indiceFaixa(d, BUCKETS_DIAS_CLUSTER), iy: indiceFaixa(Number(r.total || 0), BUCKETS_VALOR_CLUSTER) }
  }

  // Aplica os filtros ativos, exceto o(s) indicado(s) — usado para que cada gráfico reflita
  // os OUTROS filtros ativos sem se auto-filtrar pela própria dimensão que ele representa.
  const aplicarFiltrosOficina = (rows, { pularBucket, pularTipo, pularEmpresa, pularCluster } = {}) => {
    let out = rows
    if (!pularBucket && filtroBucket) out = out.filter(r => bucketOf(r) === filtroBucket)
    if (!pularTipo && filtroTipo) out = out.filter(r => tipoOf(r) === filtroTipo)
    if (!pularEmpresa && filtroEmpresaOficina) out = out.filter(r => empresaOf(r) === filtroEmpresaOficina)
    if (!pularCluster && filtroCluster) out = out.filter(r => {
      const c = clusterOf(r)
      return c && c.ix === filtroCluster.ix && c.iy === filtroCluster.iy
    })
    return out
  }

  const baseBucketOficina = useMemo(
    () => aplicarFiltrosOficina(oficinaRowsGarantia, { pularBucket: true }),
    [oficinaRowsGarantia, filtroTipo, filtroEmpresaOficina, filtroCluster]
  )
  const bucketsOficina = useMemo(() => {
    const counts = BUCKETS_OFICINA.map(b => ({ ...b, qtd: 0, valor: 0 }))
    for (const r of baseBucketOficina) {
      const d = diasNaOficina(r)
      if (d === null) continue
      const bucket = counts.find(b => d >= b.min && d <= b.max)
      if (bucket) { bucket.qtd += 1; bucket.valor += Number(r.total || 0) }
    }
    return counts
  }, [baseBucketOficina])

  const baseTipoOficina = useMemo(
    () => aplicarFiltrosOficina(oficinaRowsGarantia, { pularTipo: true }),
    [oficinaRowsGarantia, filtroBucket, filtroEmpresaOficina, filtroCluster]
  )
  const oficinaPorTipo = useMemo(() => {
    const map = new Map()
    for (const r of baseTipoOficina) {
      const tipo = tipoOf(r)
      if (!map.has(tipo)) map.set(tipo, { label: tipo, qtd: 0, valor: 0 })
      const e = map.get(tipo)
      e.qtd += 1; e.valor += Number(r.total || 0)
    }
    return [...map.values()].sort((a, b) => b.qtd - a.qtd)
  }, [baseTipoOficina])

  const baseEmpresaOficina = useMemo(
    () => aplicarFiltrosOficina(oficinaRowsGarantia, { pularEmpresa: true }),
    [oficinaRowsGarantia, filtroBucket, filtroTipo, filtroCluster]
  )

  // Base do cluster map: reflete os OUTROS filtros ativos, mas não o próprio cruzamento
  // selecionado — assim todas as bolhas continuam visíveis (uma delas realçada).
  const baseClusterOficina = useMemo(
    () => aplicarFiltrosOficina(oficinaRowsGarantia, { pularCluster: true }),
    [oficinaRowsGarantia, filtroBucket, filtroTipo, filtroEmpresaOficina]
  )
  const dadosClusterOficina = useMemo(
    () => baseClusterOficina.map(r => ({ dias: diasNaOficina(r), valor: Number(r.total || 0) })),
    [baseClusterOficina]
  )
  const oficinaPorEmpresa = useMemo(() => {
    const map = new Map()
    for (const r of baseEmpresaOficina) {
      const emp = empresaOf(r)
      if (!map.has(emp)) map.set(emp, { label: emp, qtd: 0, valor: 0 })
      const e = map.get(emp)
      e.qtd += 1; e.valor += Number(r.total || 0)
    }
    return [...map.values()].sort((a, b) => b.qtd - a.qtd)
  }, [baseEmpresaOficina])

  // Mesmo agrupamento por tipo, ordenado por valor — ranking ao lado do ranking por quantidade.
  const oficinaPorTipoPorValor = useMemo(() => [...oficinaPorTipo].sort((a, b) => b.valor - a.valor), [oficinaPorTipo])

  // Mesmos agrupamentos, ordenados por valor — para os gráficos de pizza.
  const oficinaPorEmpresaValor = useMemo(() => paraDonut([...oficinaPorEmpresa].sort((a, b) => b.valor - a.valor)), [oficinaPorEmpresa])
  // "Por Tipo de Garantia" em quantidade de OS — fatia proporcional ao número de ordens, não ao valor.
  const oficinaPorTipoQtd = useMemo(
    () => paraDonut([...oficinaPorTipo].sort((a, b) => b.qtd - a.qtd).map(t => ({ label: t.label, valor: t.qtd, valorMonetario: t.valor }))),
    [oficinaPorTipo]
  )

  // Cards: refletem TODOS os filtros ativos.
  const oficinaRowsFiltradas = useMemo(
    () => aplicarFiltrosOficina(oficinaRowsGarantia),
    [oficinaRowsGarantia, filtroBucket, filtroTipo, filtroEmpresaOficina, filtroCluster]
  )
  const oficinaStats = useMemo(() => {
    const dias = oficinaRowsFiltradas.map(diasNaOficina).filter(d => d !== null)
    const tempoMedio = dias.length ? Math.round(dias.reduce((a, b) => a + b, 0) / dias.length) : 0
    const mais14Rows = oficinaRowsFiltradas.filter(r => bucketOf(r) === 'b4')
    const mais14 = mais14Rows.length
    const valorMais14 = mais14Rows.reduce((s, r) => s + Number(r.total || 0), 0)
    const valorTotal = oficinaRowsFiltradas.reduce((s, r) => s + Number(r.total || 0), 0)
    return { total: oficinaRowsFiltradas.length, valorTotal, tempoMedio, mais14, valorMais14 }
  }, [oficinaRowsFiltradas])

  useEffect(() => { onLastModified?.(oficinaLastModified) }, [oficinaLastModified, onLastModified])

  // ── Tabela de detalhamento — uma linha por OS, reflete os mesmos filtros dos gráficos ──
  const [sortCol, setSortCol] = useState('dias')
  const [sortDir, setSortDir] = useState('desc')
  const handleSortDetalhe = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const COLUNAS_DETALHE = [
    { key: 'os_numero',         label: 'Número OS' },
    { key: 'empresa_nome',      label: 'Empresa' },
    { key: 'data_criacao',      label: 'Data Criação', tipo: 'data' },
    { key: 'dias',              label: 'Dias',         tipo: 'numero' },
    { key: 'tipo_os',           label: 'Tipo OS' },
    { key: 'consultor_nome',    label: 'Consultor' },
    { key: 'valor',             label: 'Valor',        tipo: 'moeda' },
  ]

  const linhasDetalheOficina = useMemo(() => {
    // Uma OS pode ter mais de um item de garantia (linhas duplicadas com o mesmo os_numero) —
    // a chave do React precisa ser única por LINHA, não por OS, senão o React reconcilia errado
    // e "vaza" linhas de um render anterior (com outro filtro) pro render atual.
    const linhas = oficinaRowsFiltradas.map((r, i) => ({
      id: `${r.os_numero || 'sem-os'}-${i}`,
      os_numero: r.os_numero || '',
      empresa_nome: r.empresa_nome || '',
      data_criacao: r.data_criacao || '',
      dias: diasNaOficina(r),
      tipo_os: r.tipo_os_descricao?.trim() || r.tipo_os_sigla?.trim() || '',
      consultor_nome: r.consultor_nome || '',
      valor: Number(r.total || 0),
    }))
    linhas.sort((a, b) => {
      const va = a[sortCol], vb = b[sortCol]
      if (typeof va === 'number' || typeof vb === 'number') {
        const na = va ?? -Infinity, nb = vb ?? -Infinity
        return sortDir === 'asc' ? na - nb : nb - na
      }
      const cmp = String(va || '').localeCompare(String(vb || ''), 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return linhas
  }, [oficinaRowsFiltradas, sortCol, sortDir])

  if (oficinaLoading) {
    return (
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-16 flex flex-col items-center gap-3 text-[#898781]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Carregando dados do SharePoint...</p>
      </div>
    )
  }

  if (oficinaRowsGarantia.length === 0) {
    return (
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-16 flex flex-col items-center gap-3">
        <div className="p-3 bg-white/5 rounded-full"><Wrench className="h-6 w-6 text-[#898781]" /></div>
        <p className="text-sm font-semibold text-[#c3c2b7]">Nenhuma OS de garantia na oficina no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* BOTÃO LIMPAR DASHBOARD */}
      {algumFiltroOficinaAtivo && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={limparDashboardOficina}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border border-[#e66767]/30 bg-[#e66767]/10 text-[#e66767] hover:bg-[#e66767]/20 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Limpar dashboard
          </button>
          <p className="text-[11px] text-[#898781]">
            Filtrado por{' '}
            {[
              filtroBucket && BUCKETS_OFICINA.find(b => b.key === filtroBucket)?.label,
              filtroTipo,
              filtroEmpresaOficina,
              filtroCluster && `${BUCKETS_DIAS_CLUSTER[filtroCluster.ix].label} · ${BUCKETS_VALOR_CLUSTER[filtroCluster.iy].label}`,
            ].filter(Boolean).map((f, i) => <Fragment key={i}>{i > 0 && ' + '}<strong className="text-white">{f}</strong></Fragment>)}
          </p>
        </div>
      )}

      {/* STAT TILES — nível empresa/total: primeiro contato do gestor com a tela */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTileGradient
          icon={Wrench}
          label="Total na Oficina"
          value={oficinaStats.total}
          sub="OS em andamento"
          rodape={fmtMoeda(oficinaStats.valorTotal)}
          gradiente="from-violet-600 to-purple-800"
        />
        <StatTileGradient
          icon={Clock}
          label="Tempo Médio na Oficina"
          value={`${oficinaStats.tempoMedio}d`}
          sub="desde a criação da OS"
          rodape="—"
          gradiente="from-blue-600 to-indigo-800"
        />
        <StatTileGradient
          icon={oficinaStats.mais14 > 0 ? AlertTriangle : CheckCircle2}
          label="Mais de 14 dias"
          value={oficinaStats.mais14}
          sub={oficinaStats.total > 0 ? `${Math.round((oficinaStats.mais14 / oficinaStats.total) * 100)}% do total` : '—'}
          rodape={fmtMoeda(oficinaStats.valorMais14)}
          gradiente={oficinaStats.mais14 > 0 ? 'from-orange-500 to-red-600' : 'from-teal-500 to-emerald-700'}
        />
      </div>

      {/* GRÁFICOS DE PIZZA — POR VALOR (nível categoria, participação no total) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Empresa — por Valor</p>
          <p className="text-[11px] text-[#898781] mb-4">Participação de cada empresa no valor total em disputa.</p>
          <DonutChart data={oficinaPorEmpresaValor} onSlice={toggleFiltroEmpresaOficina} filtroAtivo={filtroEmpresaOficina} />
        </div>

        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Tipo de Garantia — por Quantidade</p>
          <p className="text-[11px] text-[#898781] mb-4">Participação de cada tipo na quantidade total de OS.</p>
          <DonutChart
            data={oficinaPorTipoQtd}
            onSlice={toggleFiltroTipo}
            filtroAtivo={filtroTipo}
            encurtar={(label) => label.split(' ')[0]}
            formatarValor={(v) => `${v} OS`}
          />
        </div>
      </div>

      {/* GRÁFICOS: POR TIPO DE OS — valor ao lado de quantidade — nível categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Tipo de Garantia — por Valor</p>
          <p className="text-[11px] text-[#898781] mb-4">Onde o valor em disputa na oficina se concentra hoje.</p>
          <div className="space-y-3">
            {oficinaPorTipoPorValor.map((item, i) => {
              const maxValor = oficinaPorTipoPorValor[0]?.valor || 1
              const pct = Math.max((item.valor / maxValor) * 100, 3)
              const ativo = filtroTipo === item.label
              const esmaecido = filtroTipo && !ativo
              return (
                <button type="button" key={i} onClick={() => toggleFiltroTipo(item.label)}
                  className={`relative group block w-full text-left cursor-pointer transition-opacity ${esmaecido ? 'opacity-40' : ''}`}>
                  <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <span className={`truncate ${ativo ? 'text-[#199e70] font-semibold' : 'text-[#c3c2b7]'}`} title={item.label}>{item.label}</span>
                    <span className="font-semibold text-white shrink-0">{fmtMoeda(item.valor)}</span>
                  </div>
                  <div className={`h-2.5 rounded-full bg-white/10 overflow-hidden ${ativo ? 'ring-2 ring-offset-1 ring-offset-[#0f172a] ring-[#199e70]/60' : ''}`}>
                    <div className="h-full rounded-full bg-[#199e70]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="absolute left-0 -top-7 hidden group-hover:block z-20 pointer-events-none">
                    <span className="bg-[#1a1a19] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg border border-white/10">
                      {item.qtd} OS · {fmtMoeda(item.valor)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">OS por Tipo de Garantia — por Quantidade</p>
          <p className="text-[11px] text-[#898781] mb-4">Onde a demanda da oficina se concentra hoje.</p>
          <div className="space-y-3">
            {oficinaPorTipo.map((item, i) => {
              const maxQtd = oficinaPorTipo[0]?.qtd || 1
              const pct = Math.max((item.qtd / maxQtd) * 100, 3)
              const ativo = filtroTipo === item.label
              const esmaecido = filtroTipo && !ativo
              return (
                <button type="button" key={i} onClick={() => toggleFiltroTipo(item.label)}
                  className={`relative group block w-full text-left cursor-pointer transition-opacity ${esmaecido ? 'opacity-40' : ''}`}>
                  <div className="flex items-center justify-between text-[11px] mb-1 gap-2">
                    <span className={`truncate ${ativo ? 'text-[#3987e5] font-semibold' : 'text-[#c3c2b7]'}`} title={item.label}>{item.label}</span>
                    <span className="font-semibold text-white shrink-0">{item.qtd}</span>
                  </div>
                  <div className={`h-2.5 rounded-full bg-white/10 overflow-hidden ${ativo ? 'ring-2 ring-offset-1 ring-offset-[#0f172a] ring-[#3987e5]/60' : ''}`}>
                    <div className="h-full rounded-full bg-[#3987e5]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="absolute left-0 -top-7 hidden group-hover:block z-20 pointer-events-none">
                    <span className="bg-[#1a1a19] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg border border-white/10">
                      {item.qtd} OS · {fmtMoeda(item.valor)}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* CLUSTER MAP: OS EM ABERTO — dias × valor, antes do detalhe por OS */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
        <p className="text-xs font-bold text-white mb-1">Ordens de Serviço em Aberto — Concentração por Dias e Valor</p>
        <p className="text-[11px] text-[#898781] mb-2">Cada bolha cruza uma faixa de dias em aberto (eixo horizontal) com uma faixa de valor em R$ (eixo vertical) — o tamanho mostra quantas OS caem ali, revelando onde a concentração está.</p>
        <div className="flex items-center gap-4 mb-4">
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#0ca30c' }} /> No prazo <em className="italic">(até 14d e até R$ 30k)</em></span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#fab219' }} /> Atenção <em className="italic">(até 30d e até R$ 50k)</em></span>
          <span className="flex items-center gap-1.5 text-[10px] text-[#898781]"><span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: '#d03b3b' }} /> Crítico <em className="italic">(acima disso)</em></span>
        </div>
        <ClusterOficina dados={dadosClusterOficina} filtroAtivo={filtroCluster} onSlice={toggleFiltroCluster} />
      </div>

      {/* TABELA: ORDENS DE SERVIÇO — última ponta da narrativa, uma linha por OS */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm overflow-x-auto custom-scrollbar-light">
        <div className="p-5 pb-0">
          <p className="text-xs font-bold text-white mb-1">Ordens de Serviço</p>
          <p className="text-[11px] text-[#898781] mb-1">Detalhamento das OS de garantia na oficina, conforme os filtros ativos acima.</p>
        </div>
        {linhasDetalheOficina.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro para exibir.</div>
        ) : (
          <table className="w-full text-left border-collapse mt-3">
            <thead>
              <tr className="bg-white/5 border-b border-white/10 text-[#898781] text-[10px] font-bold uppercase tracking-wider">
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
              {linhasDetalheOficina.map(row => (
                <tr key={row.id} className="hover:bg-white/5 transition-colors">
                  {COLUNAS_DETALHE.map(c => {
                    const valor = row[c.key]
                    if (c.key === 'dias') {
                      const diasCor = valor === null ? 'text-[#898781]'
                        : valor >= 30 ? 'text-[#e66767] font-bold'
                        : valor >= 15 ? 'text-[#fab219] font-semibold'
                        : 'text-[#0ca30c]'
                      return (
                        <td key={c.key} className={`p-3 text-right whitespace-nowrap ${diasCor}`}>
                          {valor !== null ? `${valor}d` : '—'}
                        </td>
                      )
                    }
                    const texto = c.tipo === 'data' ? fmtData(valor) : c.tipo === 'moeda' ? (valor ? fmtMoeda(valor) : '') : (valor ?? '')
                    return (
                      <td key={c.key} className={`p-3 whitespace-nowrap ${c.tipo === 'moeda' || c.tipo === 'numero' ? 'text-right font-semibold text-white' : 'text-[#c3c2b7]'} ${c.key === 'empresa_nome' || c.key === 'tipo_os' ? 'truncate max-w-[220px]' : ''}`}>
                        {texto || texto === 0 ? texto : <span className="text-white/20">—</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
