import React, { useEffect, useState, useMemo, Fragment } from 'react'
import { Loader2, DollarSign, XCircle, ChevronRight, ChevronDown, ChevronsUpDown, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { apiService } from '../../services/api'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Paleta categórica (passos escuros, validados contra a superfície #0f172a — skill de dataviz), ordem fixa, nunca ciclada.
const PALETA_CATEGORICA = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
const COR_OUTROS = '#898781'

function paraDonut(itens) {
  const top = itens.slice(0, 6).map((d, i) => ({ ...d, chave: d.label, cor: PALETA_CATEGORICA[i] }))
  const outros = itens.slice(6)
  if (outros.length > 0) {
    top.push({ label: `Outros (${outros.length})`, valor: outros.reduce((s, o) => s + o.valor, 0), cor: COR_OUTROS })
  }
  return top
}

function inkParaFundo(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum > 175 ? '#0b0b0b' : '#ffffff'
}

function DonutChart({ data, onSlice, filtroAtivo, encurtar }) {
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
                <title>{d.label}: {fmtMoeda(d.valor)}</title>
              </circle>
            )
          })}
        </g>
        {labels.map((l, i) => (
          <text key={i} x={l.x} y={l.y + 3} textAnchor="middle" fill={l.ink} className="pointer-events-none" style={{ fontSize: '9px', fontWeight: 700 }}>
            {l.pct}%
          </text>
        ))}
        <text x="80" y="76" textAnchor="middle" className="fill-white" style={{ fontSize: '12px', fontWeight: 700 }}>{fmtMoeda(total)}</text>
        <text x="80" y="92" textAnchor="middle" className="fill-[#898781]" style={{ fontSize: '9px' }}>Total</text>
      </svg>
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
              title={`${d.label} · ${pct}% · ${fmtMoeda(d.valor)}`}
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

// Cartão KPI em degradê — nível "empresa/total" da narrativa (o primeiro que o gestor vê).
function StatTileGradient({ icon: Icon, label, value, sub, gradiente, onClick, disabled, ativo, esmaecido }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-left relative overflow-hidden rounded-2xl p-4 shadow-lg transition-all bg-gradient-to-br ${gradiente} ${disabled ? 'cursor-default' : 'hover:shadow-xl cursor-pointer'} ${ativo ? 'ring-2 ring-white/70' : ''} ${esmaecido ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">{label}</p>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mt-1 leading-none">{value}</p>
      <p className="text-xs text-white/70 mt-1">{sub}</p>
    </button>
  )
}

// Dashboard "Títulos a Receber" — RFN003_PosicaoAnaliticoReceber, com filtros cruzados
// entre situação de vencimento, empresa e tipo de título.
export default function GarantiasTitulosDashboard({ onLastModified }) {
  const [titulosRows, setTitulosRows] = useState([])
  const [tiposCadastrados, setTiposCadastrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [titulosLastModified, setTitulosLastModified] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`${BACKEND_URL}/api/garantias/financeiro/titulos`).then(r => r.ok ? r.json() : {}),
      apiService.getTipoTituloGarantia().catch(() => []),
    ]).then(([data, tipos]) => {
      setTitulosRows(data.rows ?? [])
      setTitulosLastModified(data.lastModified ?? null)
      setTiposCadastrados(tipos.filter(t => t.ativo).map(t => t.descricao.trim()))
    }).finally(() => setLoading(false))
  }, [])

  // Mesma base que a tabela principal: só tipos de título cadastrados como garantia.
  const titulosBase = useMemo(() => {
    if (tiposCadastrados.length === 0) return titulosRows
    return titulosRows.filter(r => tiposCadastrados.includes(String(r.tipo_titulo ?? '').trim()))
  }, [titulosRows, tiposCadastrados])

  // ── Filtros cruzados: clicar em qualquer gráfico ou card filtra os demais ──
  const [filtroEmpresa, setFiltroEmpresa] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState(null)
  const [filtroSituacao, setFiltroSituacao] = useState(null) // null | 'vencido' | 'a_vencer'
  const toggleFiltroEmpresa = (label) => setFiltroEmpresa(prev => prev === label ? null : label)
  const toggleFiltroTipo = (label) => setFiltroTipo(prev => prev === label ? null : label)
  const toggleFiltroSituacao = (key) => setFiltroSituacao(prev => prev === key ? null : key)
  const algumFiltroAtivo = !!(filtroEmpresa || filtroTipo || filtroSituacao)
  const limparDashboard = () => { setFiltroEmpresa(null); setFiltroTipo(null); setFiltroSituacao(null) }

  const empresaOf = (r) => r.empresa?.trim() || 'Não informado'
  const tipoOf = (r) => r.tipo_titulo?.trim() || 'Não informado'
  const situacaoOf = (r) => (r.atraso === null || r.atraso === undefined) ? null : (r.atraso > 0 ? 'vencido' : 'a_vencer')

  const aplicarFiltros = (rows, { pularEmpresa, pularTipo, pularSituacao } = {}) => {
    let out = rows
    if (!pularEmpresa && filtroEmpresa) out = out.filter(r => empresaOf(r) === filtroEmpresa)
    if (!pularTipo && filtroTipo) out = out.filter(r => tipoOf(r) === filtroTipo)
    if (!pularSituacao && filtroSituacao) out = out.filter(r => situacaoOf(r) === filtroSituacao)
    return out
  }

  const baseEmpresa = useMemo(() => aplicarFiltros(titulosBase, { pularEmpresa: true }), [titulosBase, filtroTipo, filtroSituacao])
  const porEmpresa = useMemo(() => {
    const map = new Map()
    for (const r of baseEmpresa) {
      const e = empresaOf(r)
      if (!map.has(e)) map.set(e, { label: e, qtd: 0, valor: 0 })
      const x = map.get(e)
      x.qtd += 1; x.valor += Number(r.valor || 0)
    }
    return [...map.values()].sort((a, b) => b.valor - a.valor)
  }, [baseEmpresa])

  const baseTipo = useMemo(() => aplicarFiltros(titulosBase, { pularTipo: true }), [titulosBase, filtroEmpresa, filtroSituacao])
  const porTipo = useMemo(() => {
    const map = new Map()
    for (const r of baseTipo) {
      const t = tipoOf(r)
      if (!map.has(t)) map.set(t, { label: t, qtd: 0, valor: 0 })
      const x = map.get(t)
      x.qtd += 1; x.valor += Number(r.valor || 0)
    }
    return [...map.values()].sort((a, b) => b.valor - a.valor)
  }, [baseTipo])

  const porEmpresaDonut = useMemo(() => paraDonut(porEmpresa), [porEmpresa])
  const porTipoDonut = useMemo(() => paraDonut(porTipo), [porTipo])

  // Cards de Vencidos/A Vencer/Total: refletem empresa/tipo, mas não a própria situação
  // selecionada — assim os três números continuam visíveis e clicáveis mesmo com um deles ativo.
  const baseSituacao = useMemo(() => aplicarFiltros(titulosBase, { pularSituacao: true }), [titulosBase, filtroEmpresa, filtroTipo])

  // Demais elementos (gráficos, alertas, tabelas): refletem TODOS os filtros ativos.
  const titulosFiltrados = useMemo(() => aplicarFiltros(titulosBase), [titulosBase, filtroEmpresa, filtroTipo, filtroSituacao])

  const stats = useMemo(() => {
    const totalValor = baseSituacao.reduce((s, r) => s + (r.valor || 0), 0)
    const totalSaldo = baseSituacao.reduce((s, r) => s + (r.saldo || 0), 0)
    const vencidos = baseSituacao.filter(r => r.atraso > 0)
    const aVencer = baseSituacao.filter(r => r.atraso !== null && r.atraso !== undefined && r.atraso <= 0)
    return {
      total: baseSituacao.length,
      totalValor,
      totalSaldo,
      vencidosQtd: vencidos.length,
      vencidosValor: vencidos.reduce((s, r) => s + (r.valor || 0), 0),
      aVencerQtd: aVencer.length,
      aVencerValor: aVencer.reduce((s, r) => s + (r.valor || 0), 0),
    }
  }, [baseSituacao])

  useEffect(() => { onLastModified?.(titulosLastModified) }, [titulosLastModified, onLastModified])

  // ── TABELA PIVOT: Tipo de Título × Ano/Mês de Vencimento ────────────────
  const mesesVencimento = useMemo(() => {
    const map = new Map()
    for (const r of titulosFiltrados) {
      if (!r.data_vencimento) continue
      const d = new Date(r.data_vencimento + 'T12:00:00')
      map.set(`${d.getFullYear()}-${d.getMonth()}`, { ano: d.getFullYear(), mes: d.getMonth() })
    }
    return [...map.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  }, [titulosFiltrados])

  const anosVencimentoPivot = useMemo(() => [...new Set(mesesVencimento.map(m => m.ano))].sort((a, b) => a - b), [mesesVencimento])
  const mesesPorAnoVencimento = useMemo(() => {
    const map = {}
    for (const ano of anosVencimentoPivot) map[ano] = mesesVencimento.filter(m => m.ano === ano)
    return map
  }, [anosVencimentoPivot, mesesVencimento])

  // pivotTipoMes[tipo][`ano-mes`] = { qtd, valor } · pivotTipoMes[tipo].total
  const pivotTipoMes = useMemo(() => {
    const p = {}
    for (const r of titulosFiltrados) {
      if (!r.data_vencimento) continue
      const tipo = tipoOf(r)
      const d = new Date(r.data_vencimento + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      if (!p[tipo]) p[tipo] = { total: { qtd: 0, valor: 0 } }
      if (!p[tipo][chave]) p[tipo][chave] = { qtd: 0, valor: 0 }
      p[tipo][chave].qtd += 1
      p[tipo][chave].valor += Number(r.valor || 0)
      p[tipo].total.qtd += 1
      p[tipo].total.valor += Number(r.valor || 0)
    }
    return p
  }, [titulosFiltrados])

  const tiposPivot = useMemo(
    () => Object.keys(pivotTipoMes).sort((a, b) => pivotTipoMes[b].total.valor - pivotTipoMes[a].total.valor),
    [pivotTipoMes]
  )

  const totalAnoTipoMes = (tipo, ano) =>
    (mesesPorAnoVencimento[ano] || []).reduce((acc, m) => {
      const cel = pivotTipoMes[tipo]?.[`${m.ano}-${m.mes}`]
      if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
      return acc
    }, { qtd: 0, valor: 0 })

  const totalGeralPivot = tiposPivot.reduce((acc, tipo) => {
    acc.qtd += pivotTipoMes[tipo].total.qtd
    acc.valor += pivotTipoMes[tipo].total.valor
    return acc
  }, { qtd: 0, valor: 0 })

  // Anos expandidos na tabela pivot — começam todos recolhidos (só a coluna Total do ano) ao abrir a tela.
  const [anosExpandidos, setAnosExpandidos] = useState(new Set())
  const toggleAnoColapsado = (ano) => setAnosExpandidos(prev => {
    const next = new Set(prev)
    next.has(ano) ? next.delete(ano) : next.add(ano)
    return next
  })
  const todosAnosColapsados = anosExpandidos.size === 0
  const toggleTodosAnos = () => setAnosExpandidos(todosAnosColapsados ? new Set(anosVencimentoPivot) : new Set())

  if (loading) {
    return (
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-16 flex flex-col items-center gap-3 text-[#898781]">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-xs">Carregando dados do SharePoint...</p>
      </div>
    )
  }

  if (titulosBase.length === 0) {
    return (
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-16 flex flex-col items-center gap-3">
        <div className="p-3 bg-white/5 rounded-full"><DollarSign className="h-6 w-6 text-[#898781]" /></div>
        <p className="text-sm font-semibold text-[#c3c2b7]">Nenhum título a receber no momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {algumFiltroAtivo && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={limparDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border border-[#e66767]/30 bg-[#e66767]/10 text-[#e66767] hover:bg-[#e66767]/20 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Limpar dashboard
          </button>
          <p className="text-[11px] text-[#898781]">
            Filtrado por{' '}
            {[
              filtroSituacao && (filtroSituacao === 'vencido' ? 'Vencidos' : 'A Vencer'),
              filtroEmpresa,
              filtroTipo,
            ].filter(Boolean).map((f, i) => <Fragment key={i}>{i > 0 && ' + '}<strong className="text-white">{f}</strong></Fragment>)}
          </p>
        </div>
      )}

      {/* STAT TILES — nível empresa/total, clicáveis: filtram os gráficos e tabelas abaixo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatTileGradient
          icon={DollarSign}
          label="Total de Títulos"
          value={stats.total}
          sub={`${fmtMoeda(stats.totalValor)} · Saldo ${fmtMoeda(stats.totalSaldo)}`}
          gradiente="from-violet-600 to-purple-800"
          onClick={limparDashboard}
          disabled={!algumFiltroAtivo}
        />
        <StatTileGradient
          icon={stats.vencidosQtd > 0 ? AlertTriangle : CheckCircle2}
          label="Vencidos"
          value={stats.vencidosQtd}
          sub={fmtMoeda(stats.vencidosValor)}
          gradiente={stats.vencidosQtd > 0 ? 'from-orange-500 to-red-600' : 'from-slate-700 to-slate-900'}
          onClick={() => toggleFiltroSituacao('vencido')}
          disabled={stats.vencidosQtd === 0}
          ativo={filtroSituacao === 'vencido'}
          esmaecido={filtroSituacao === 'a_vencer'}
        />
        <StatTileGradient
          icon={CheckCircle2}
          label="A Vencer"
          value={stats.aVencerQtd}
          sub={fmtMoeda(stats.aVencerValor)}
          gradiente="from-teal-500 to-emerald-700"
          onClick={() => toggleFiltroSituacao('a_vencer')}
          disabled={stats.aVencerQtd === 0}
          ativo={filtroSituacao === 'a_vencer'}
          esmaecido={filtroSituacao === 'vencido'}
        />
      </div>


      {/* DONUTS: POR EMPRESA / POR TIPO DE TÍTULO — nível categoria, participação no total */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">Títulos por Empresa — por Valor</p>
          <p className="text-[11px] text-[#898781] mb-4">Onde a carteira de recebíveis está concentrada.</p>
          <DonutChart data={porEmpresaDonut} onSlice={toggleFiltroEmpresa} filtroAtivo={filtroEmpresa} />
        </div>
        <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
          <p className="text-xs font-bold text-white mb-1">Títulos por Tipo — por Valor</p>
          <p className="text-[11px] text-[#898781] mb-4">Participação de cada tipo de título no valor total.</p>
          <DonutChart data={porTipoDonut} onSlice={toggleFiltroTipo} filtroAtivo={filtroTipo} />
        </div>
      </div>

      {/* TABELA PIVOT: Tipo de Título × Ano/Mês de Vencimento — última ponta da narrativa */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm overflow-x-auto custom-scrollbar-light">
        <div className="p-5 pb-0 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-white mb-1">Títulos por Situação de Vencimento — por Tipo de Título</p>
            <p className="text-[11px] text-[#898781] mb-1">Quantidade e valor a vencer por tipo de título, mês a mês.</p>
          </div>
          {anosVencimentoPivot.length > 0 && (
            <button
              type="button"
              onClick={toggleTodosAnos}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full border border-white/10 bg-white/5 text-[#c3c2b7] hover:bg-white/10 transition-colors"
            >
              <ChevronsUpDown className="h-3 w-3" /> {todosAnosColapsados ? 'Expandir todos os anos' : 'Recolher todos os anos'}
            </button>
          )}
        </div>
        {mesesVencimento.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro com Data de Vencimento para montar a tabela.</div>
        ) : (
          <table className="min-w-full text-xs border-collapse mt-3">
            <thead>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 w-52 border-b border-white/10">Ano</th>
                {anosVencimentoPivot.map(ano => {
                  const colapsado = !anosExpandidos.has(ano)
                  return (
                    <th key={ano} colSpan={colapsado ? 2 : mesesPorAnoVencimento[ano].length * 2 + 2} className="p-1 text-center border-b border-l border-white/10">
                      <button
                        type="button"
                        onClick={() => toggleAnoColapsado(ano)}
                        className="flex items-center justify-center gap-1 w-full py-1 hover:text-[#9085e9] transition-colors"
                      >
                        {colapsado ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        {ano}
                      </button>
                    </th>
                  )
                })}
                <th colSpan={2} rowSpan={2} className="p-2 text-center align-middle border-b border-l-2 border-white/20 bg-white/10">Total</th>
              </tr>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 border-b border-white/10">Mês</th>
                {anosVencimentoPivot.map(ano => {
                  const colapsado = !anosExpandidos.has(ano)
                  return (
                    <Fragment key={ano}>
                      {!colapsado && mesesPorAnoVencimento[ano].map(m => (
                        <th key={`${m.ano}-${m.mes}`} colSpan={2} className="p-2 text-center border-b border-l border-white/10 capitalize">{MESES_LONGOS[m.mes]}</th>
                      ))}
                      <th colSpan={2} className="p-2 text-center border-b border-l border-white/10 bg-white/10">Total</th>
                    </Fragment>
                  )
                })}
              </tr>
              <tr className="bg-white/5 text-[#898781] text-[10px] font-bold uppercase border-b-2 border-white/20">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10">Tipo de Título</th>
                {anosVencimentoPivot.map(ano => {
                  const colapsado = !anosExpandidos.has(ano)
                  return (
                    <Fragment key={ano}>
                      {!colapsado && mesesPorAnoVencimento[ano].map(m => (
                        <Fragment key={`${m.ano}-${m.mes}`}>
                          <th className="p-2 text-right border-l border-white/10">Títulos</th>
                          <th className="p-2 text-right">Valor</th>
                        </Fragment>
                      ))}
                      <th className="p-2 text-right border-l border-white/10 bg-white/10">Títulos</th>
                      <th className="p-2 text-right bg-white/10">Valor</th>
                    </Fragment>
                  )
                })}
                <th className="p-2 text-right border-l-2 border-white/20 bg-white/10">Títulos</th>
                <th className="p-2 text-right bg-white/10">Valor</th>
              </tr>
            </thead>
            <tbody>
              {tiposPivot.map(tipo => (
                <tr key={tipo} className="border-b border-white/10 hover:bg-white/5">
                  <td className="p-2 font-semibold text-white sticky left-0 bg-[#0f172a] whitespace-nowrap truncate max-w-[220px]" title={tipo}>{tipo}</td>
                  {anosVencimentoPivot.map(ano => {
                    const colapsado = !anosExpandidos.has(ano)
                    return (
                      <Fragment key={ano}>
                        {!colapsado && mesesPorAnoVencimento[ano].map(m => {
                          const cel = pivotTipoMes[tipo][`${m.ano}-${m.mes}`]
                          return (
                            <Fragment key={`${m.ano}-${m.mes}`}>
                              <td className="p-2 text-right text-[#c3c2b7] border-l border-white/10">{cel?.qtd || ''}</td>
                              <td className="p-2 text-right text-[#c3c2b7] font-medium whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                            </Fragment>
                          )
                        })}
                        {(() => {
                          const t = totalAnoTipoMes(tipo, ano)
                          return (
                            <Fragment>
                              <td className="p-2 text-right font-bold text-white border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                              <td className="p-2 text-right font-bold text-white bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                            </Fragment>
                          )
                        })()}
                      </Fragment>
                    )
                  })}
                  <td className="p-2 text-right font-bold text-[#9085e9] border-l-2 border-white/20 bg-white/5">{pivotTipoMes[tipo].total.qtd || ''}</td>
                  <td className="p-2 text-right font-bold text-[#9085e9] bg-white/5 whitespace-nowrap">{pivotTipoMes[tipo].total.qtd ? fmtMoeda(pivotTipoMes[tipo].total.valor) : ''}</td>
                </tr>
              ))}
              <tr className="bg-white/5 font-bold text-white border-t-2 border-white/20">
                <td className="p-2 sticky left-0 bg-[#141d33]">Total</td>
                {anosVencimentoPivot.map(ano => {
                  const colapsado = !anosExpandidos.has(ano)
                  return (
                    <Fragment key={ano}>
                      {!colapsado && mesesPorAnoVencimento[ano].map(m => {
                        const t = tiposPivot.reduce((acc, tipo) => {
                          const cel = pivotTipoMes[tipo][`${m.ano}-${m.mes}`]
                          if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
                          return acc
                        }, { qtd: 0, valor: 0 })
                        return (
                          <Fragment key={`${m.ano}-${m.mes}`}>
                            <td className="p-2 text-right border-l border-white/10">{t.qtd || ''}</td>
                            <td className="p-2 text-right whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                          </Fragment>
                        )
                      })}
                      {(() => {
                        const t = tiposPivot.reduce((acc, tipo) => {
                          const r = totalAnoTipoMes(tipo, ano)
                          acc.qtd += r.qtd; acc.valor += r.valor
                          return acc
                        }, { qtd: 0, valor: 0 })
                        return (
                          <Fragment>
                            <td className="p-2 text-right border-l border-white/10 bg-white/10">{t.qtd || ''}</td>
                            <td className="p-2 text-right bg-white/10 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                          </Fragment>
                        )
                      })()}
                    </Fragment>
                  )
                })}
                <td className="p-2 text-right border-l-2 border-white/20 bg-white/10">{totalGeralPivot.qtd || ''}</td>
                <td className="p-2 text-right bg-white/10 whitespace-nowrap">{fmtMoeda(totalGeralPivot.valor)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
