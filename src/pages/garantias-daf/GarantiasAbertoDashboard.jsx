import React, { useEffect, useState, useMemo, Fragment } from 'react'
import { Loader2, ChevronRight, ChevronDown, FileText, Clock, CheckCircle2, XCircle, AlertTriangle, BarChart2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData  = (s) => { if (!s) return ''; try { return new Date(String(s).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s } }
const diffDias = (a, b) => {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

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
export default function GarantiasAbertoDashboard({ onAnalise, onLastModified }) {
  const { isAdmin, empresasPermitidas } = useAuth()
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [encerradaLastModified, setEncerradaLastModified] = useState(null)

  const [filtroGrupo, setFiltroGrupo] = useState(null) // null | 'digitar' | 'atrasada' | 'digitada' | 'aprovada' | 'recusada' — card selecionado
  const toggleFiltroGrupo = (key) => setFiltroGrupo(prev => prev === key ? null : key)
  const [filtroStatusShc, setFiltroStatusShc] = useState(null) // texto do Status SHC clicado na tabela de detalhamento
  const toggleFiltroStatusShc = (texto) => setFiltroStatusShc(prev => prev === texto ? null : texto)

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

  // Meses (ano+mês) presentes nos dados, com base na Data de Criação da OS
  const meses = useMemo(() => {
    const map = new Map()
    for (const g of dadosBaseShc) {
      if (!g.data_abertura_os) continue
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const ano = d.getFullYear(), mes = d.getMonth()
      map.set(`${ano}-${mes}`, { ano, mes })
    }
    return [...map.values()].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  }, [dadosBaseShc])

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
    for (const g of dadosBaseShc) {
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
  }, [dadosBaseShc])

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

  // ── Pré-análise dinâmica — lida a partir dos totais por status (mesmos números dos cards) ──
  const analiseAberto = useMemo(() => {
    const pontos = []
    const totalGeral = Object.values(pivot).reduce((s, g) => s + g.total.qtd, 0)
    if (totalGeral === 0) return { resumo: null, pontos }

    const qtdADigitar = pivot.digitar.total.qtd + pivot.atrasada.total.qtd
    const pctADigitar = Math.round((qtdADigitar / totalGeral) * 100)
    if (pctADigitar >= 20) {
      pontos.push({ tipo: 'critico', texto: `${qtdADigitar} garantias (${pctADigitar}%) ainda a digitar — priorize a digitação para não perder prazo de reivindicação.` })
    } else if (qtdADigitar === 0) {
      pontos.push({ tipo: 'elogio', texto: 'Nenhuma garantia pendente de digitação — backlog inicial zerado.' })
    }

    const qtdFinalizadas = pivot.aprovada.total.qtd + pivot.recusada.total.qtd
    let taxaRecusa = 0
    if (qtdFinalizadas > 0) {
      taxaRecusa = Math.round((pivot.recusada.total.qtd / qtdFinalizadas) * 100)
      if (taxaRecusa >= 30) {
        pontos.push({ tipo: 'critico', texto: `Taxa de recusa de ${taxaRecusa}% entre os processos finalizados (${fmtMoeda(pivot.recusada.total.valor)}) — revisar critérios de abertura e documentação das garantias.` })
      } else if (taxaRecusa < 15) {
        pontos.push({ tipo: 'elogio', texto: `Taxa de recusa baixa (${taxaRecusa}%) entre os processos finalizados — garantias bem fundamentadas.` })
      }
    }

    const qtdDigitada = pivot.digitada.total.qtd
    const pctDigitada = Math.round((qtdDigitada / totalGeral) * 100)
    if (pctDigitada >= 40) {
      pontos.push({ tipo: 'melhoria', texto: `${qtdDigitada} garantias (${pctDigitada}%) aguardando aprovação da DAF, somando ${fmtMoeda(pivot.digitada.total.valor)} — considere reforçar a equipe de análise para acelerar o funil.` })
    }

    if (taxaRecusa >= 15) {
      pontos.push({ tipo: 'melhoria', texto: 'Revisar os critérios de abertura e a documentação anexada pode reduzir a taxa de recusa nos próximos ciclos.' })
    }
    if (pctADigitar > 0) {
      pontos.push({ tipo: 'melhoria', texto: 'Digitar as garantias assim que a OS é encerrada evita acúmulo e reduz o risco de perda de prazo.' })
    }

    const critico = pctADigitar >= 20 || taxaRecusa >= 30
    const atencao = !critico && (pctADigitar > 0 || taxaRecusa >= 15 || pctDigitada >= 40)
    const resumo = critico
      ? { tipo: 'critico', texto: `Situação crítica: ${pctADigitar}% das garantias ainda por digitar e taxa de recusa de ${taxaRecusa}% entre os processos finalizados.` }
      : atencao
        ? { tipo: 'atencao', texto: `Situação sob controle, mas com pontos a monitorar: ${pctADigitar}% a digitar e taxa de recusa de ${taxaRecusa}%.` }
        : { tipo: 'positivo', texto: `Processo saudável: backlog de digitação baixo e taxa de recusa de ${taxaRecusa}% entre os processos finalizados.` }

    return { resumo, pontos }
  }, [pivot])

  useEffect(() => { onAnalise?.(analiseAberto) }, [analiseAberto, onAnalise])

  // Card selecionado filtra as linhas exibidas na tabela (e futuros gráficos) abaixo dos cards.
  const gruposExibidos = filtroGrupo ? GRUPOS_STATUS.filter(g => g.key === filtroGrupo) : GRUPOS_STATUS
  const dadosExibidos = filtroGrupo ? dadosBaseShc.filter(g => classificarStatus(g) === filtroGrupo) : dadosBaseShc

  const somaGrupos = (fn) => gruposExibidos.reduce((acc, g) => {
    const r = fn(g.key)
    acc.qtd += r.qtd; acc.valor += r.valor
    return acc
  }, { qtd: 0, valor: 0 })

  // Gráfico por Tipo de OS — barras por valor, tooltip mostra a quantidade de OS.
  const porTipoValorAberto = useMemo(() => {
    const map = new Map()
    for (const g of dadosExibidos) {
      const tipo = g.tipo_garantia_descricao?.trim() || 'Não informado'
      if (!map.has(tipo)) map.set(tipo, { label: tipo, qtd: 0, valor: 0 })
      const e = map.get(tipo)
      e.qtd += 1
      e.valor += Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
    }
    return [...map.values()].sort((a, b) => b.valor - a.valor)
  }, [dadosExibidos])

  // ── Tabela de detalhamento (uma linha por OS) ──────────────────────────
  const [sortCol, setSortCol] = useState('data_abertura_os')
  const [sortDir, setSortDir] = useState('asc')
  const handleSortDetalhe = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const linhasDetalhe = useMemo(() => {
    const hojeISO = new Date().toISOString().slice(0, 10)
    return dadosExibidos.map(g => ({
      id: g.id,
      empresa_nome: g.empresa_nome || '',
      numero_os: g.numero_os || '',
      chassi: g.chassi || '',
      cliente: g.cliente || '',
      tipo_garantia_descricao: g.tipo_garantia_descricao || '',
      data_abertura_os: g.data_abertura_os || '',
      data_fechamento_os: g.data_fechamento_os || '',
      vlr_total: Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0),
      data_sg: g.data_sg || '',
      dias: g.data_sg ? diffDias(g.data_sg, g.data_fechamento_os || hojeISO) : null,
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
    { key: 'chassi',                 label: 'Nº Chassi' },
    { key: 'cliente',                label: 'Proprietário Veículo' },
    { key: 'tipo_garantia_descricao', label: 'Tipo de OS' },
    { key: 'data_abertura_os',       label: 'Data Criação', tipo: 'data' },
    { key: 'data_fechamento_os',     label: 'Fechado', tipo: 'data' },
    { key: 'vlr_total',              label: 'Vlr Total', tipo: 'moeda' },
    { key: 'data_sg',                label: 'Data SG', tipo: 'data' },
    { key: 'dias',                   label: 'Dias', tipo: 'numero' },
    { key: 'numero_sg',              label: 'Nº SG' },
    { key: 'status_geral',           label: 'Status Geral' },
    { key: 'status_shc',             label: 'Status SHC' },
    { key: 'resposta_shc',           label: 'Resposta SHC', tipo: 'texto_longo' },
  ]

  // pivotTipo[grupoKey][tipoOS][`ano-mes`] = { qtd, valor } · pivotTipo[grupoKey][tipoOS].total
  const pivotTipo = useMemo(() => {
    const p = {}
    for (const grp of GRUPOS_STATUS) p[grp.key] = {}
    for (const g of dadosBaseShc) {
      if (!g.data_abertura_os) continue
      const grpKey = classificarStatus(g)
      const tipo = g.tipo_garantia_descricao?.trim() || 'Não informado'
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
      if (!p[grpKey][tipo]) p[grpKey][tipo] = { total: { qtd: 0, valor: 0 } }
      if (!p[grpKey][tipo][chave]) p[grpKey][tipo][chave] = { qtd: 0, valor: 0 }
      p[grpKey][tipo][chave].qtd += 1
      p[grpKey][tipo][chave].valor += valor
      p[grpKey][tipo].total.qtd += 1
      p[grpKey][tipo].total.valor += valor
    }
    return p
  }, [dadosBaseShc])

  const totalAnoTipo = (grpKey, tipo, ano) =>
    (mesesPorAno[ano] || []).reduce((acc, m) => {
      const cel = pivotTipo[grpKey][tipo]?.[`${m.ano}-${m.mes}`]
      if (cel) { acc.qtd += cel.qtd; acc.valor += cel.valor }
      return acc
    }, { qtd: 0, valor: 0 })

  // pivotStatus[grupoKey][tipoOS][statusCodigo][`ano-mes`] = { qtd, valor } · .total
  const pivotStatus = useMemo(() => {
    const p = {}
    for (const grp of GRUPOS_STATUS) p[grp.key] = {}
    for (const g of dadosBaseShc) {
      if (!g.data_abertura_os) continue
      const grpKey = classificarStatus(g)
      const tipo = g.tipo_garantia_descricao?.trim() || 'Não informado'
      const statusCod = g.status_codigo || '—'
      const d = new Date(g.data_abertura_os + 'T12:00:00')
      const chave = `${d.getFullYear()}-${d.getMonth()}`
      const valor = Number(g.valor_pecas || 0) + Number(g.valor_servicos || 0)
      if (!p[grpKey][tipo]) p[grpKey][tipo] = {}
      if (!p[grpKey][tipo][statusCod]) p[grpKey][tipo][statusCod] = { total: { qtd: 0, valor: 0 } }
      if (!p[grpKey][tipo][statusCod][chave]) p[grpKey][tipo][statusCod][chave] = { qtd: 0, valor: 0 }
      p[grpKey][tipo][statusCod][chave].qtd += 1
      p[grpKey][tipo][statusCod][chave].valor += valor
      p[grpKey][tipo][statusCod].total.qtd += 1
      p[grpKey][tipo][statusCod].total.valor += valor
    }
    return p
  }, [dadosBaseShc])

  const totalAnoStatus = (grpKey, tipo, statusCod, ano) =>
    (mesesPorAno[ano] || []).reduce((acc, m) => {
      const cel = pivotStatus[grpKey][tipo]?.[statusCod]?.[`${m.ano}-${m.mes}`]
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

      {/* GRÁFICO: POR TIPO DE OS — barras por valor, tooltip mostra a quantidade de OS */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm p-5">
        <p className="text-xs font-bold text-white mb-1">Garantias por Tipo de OS — por Valor</p>
        <p className="text-[11px] text-[#898781] mb-5">Onde o valor das garantias em aberto se concentra hoje.</p>
        <div className="flex items-end gap-4 h-40 px-2 overflow-x-auto">
          {porTipoValorAberto.map(item => {
            const maxValor = porTipoValorAberto[0]?.valor || 1
            const pct = Math.max((item.valor / maxValor) * 100, item.valor > 0 ? 6 : 0)
            return (
              <div key={item.label} className="relative group flex-1 min-w-[64px] flex flex-col items-center gap-2 h-full justify-end">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full hidden group-hover:flex flex-col items-center z-20 pointer-events-none">
                  <span className="bg-[#1a1a19] text-white text-[10px] rounded px-2 py-1 whitespace-nowrap shadow-lg border border-white/10">
                    {item.qtd} OS · {fmtMoeda(item.valor)}
                  </span>
                </div>
                <span className="text-xs font-bold text-white">{fmtMoeda(item.valor)}</span>
                <div className="w-full flex items-end justify-center flex-1">
                  <div className="w-8 rounded-t-md" style={{ height: `${pct}%`, backgroundColor: '#199e70', minHeight: item.valor > 0 ? '6px' : '0' }} />
                </div>
                <span className="text-[10px] text-[#898781] text-center leading-tight truncate max-w-[90px]" title={item.label}>{item.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {(filtroGrupo || filtroStatusShc) && (
        <p className="text-[11px] text-[#898781]">
          Filtrado por{' '}
          {filtroGrupo && <strong className="text-white">{GRUPOS_STATUS.find(g => g.key === filtroGrupo)?.card}</strong>}
          {filtroGrupo && filtroStatusShc && ' + '}
          {filtroStatusShc && <strong className="text-[#9085e9]">Status SHC: {filtroStatusShc}</strong>}
          {' '}·{' '}
          <button type="button" onClick={() => { setFiltroGrupo(null); setFiltroStatusShc(null) }} className="underline hover:text-white">limpar filtros</button>
        </p>
      )}

      {/* TABELA PIVOT — Status x Mês/Ano (nível categoria) */}
      <div className="bg-[#0f172a] rounded-lg border border-white/10 shadow-sm overflow-x-auto custom-scrollbar-light">
        {meses.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro com Data de Criação da OS para montar a tabela.</div>
        ) : (
          <table className="min-w-full text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 w-44 border-b border-white/10">Ano</th>
                {anos.map(ano => (
                  <th key={ano} colSpan={mesesPorAno[ano].length * 2 + 2} className="p-2 text-center border-b border-l border-white/10">{ano}</th>
                ))}
                <th rowSpan={3} className="p-2 text-center align-middle border-b border-l-2 border-white/20 bg-white/10">Total</th>
              </tr>
              <tr className="bg-white/5 text-[#c3c2b7] font-bold">
                <th className="p-2 text-left sticky left-0 bg-[#141d33] z-10 border-b border-white/10">Mês</th>
                {anos.map(ano => (
                  <Fragment key={ano}>
                    {mesesPorAno[ano].map(m => (
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
                    {mesesPorAno[ano].map(m => (
                      <Fragment key={`${m.ano}-${m.mes}`}>
                        <th className="p-2 text-right border-l border-white/10">OS</th>
                        <th className="p-2 text-right">Total</th>
                      </Fragment>
                    ))}
                    <th className="p-2 text-right border-l border-white/10 bg-white/10">OS</th>
                    <th className="p-2 text-right bg-white/10">Total</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {gruposExibidos.map(grp => {
                const expandido = gruposExpandidos.has(grp.key)
                const tipos = Object.keys(pivotTipo[grp.key]).sort((a, b) => a.localeCompare(b, 'pt-BR'))
                return (
                  <Fragment key={grp.key}>
                    <tr className="border-b border-white/10 hover:bg-white/5">
                      <td className="p-2 font-semibold text-white sticky left-0 bg-[#0f172a] whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleGrupo(grp.key)}
                          disabled={tipos.length === 0}
                          className="flex items-center gap-1 hover:text-[#9085e9] transition-colors disabled:cursor-default disabled:hover:text-white"
                        >
                          {tipos.length > 0 ? (
                            expandido ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                          ) : <span className="w-3.5 shrink-0" />}
                          {grp.label}
                        </button>
                      </td>
                      {anos.map(ano => (
                        <Fragment key={ano}>
                          {mesesPorAno[ano].map(m => {
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

                    {expandido && tipos.map(tipo => {
                      const tipoKey = `${grp.key}::${tipo}`
                      const tipoExpandido = tiposExpandidos.has(tipoKey)
                      const statusCods = Object.keys(pivotStatus[grp.key][tipo] || {}).sort((a, b) => statusLabel(a).localeCompare(statusLabel(b), 'pt-BR'))
                      return (
                        <Fragment key={tipoKey}>
                          <tr className="border-b border-white/5 bg-white/[0.03] hover:bg-white/[0.06]">
                            <td className="p-2 pl-6 text-[#c3c2b7] sticky left-0 bg-[#111a2e] whitespace-nowrap truncate max-w-[220px]" title={tipo}>
                              <button
                                type="button"
                                onClick={() => toggleTipo(tipoKey)}
                                disabled={statusCods.length === 0}
                                className="flex items-center gap-1 hover:text-[#9085e9] transition-colors disabled:cursor-default disabled:hover:text-[#c3c2b7]"
                              >
                                {statusCods.length > 0 ? (
                                  tipoExpandido ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />
                                ) : <span className="w-3 shrink-0" />}
                                {tipo}
                              </button>
                            </td>
                            {anos.map(ano => (
                              <Fragment key={ano}>
                                {mesesPorAno[ano].map(m => {
                                  const cel = pivotTipo[grp.key][tipo][`${m.ano}-${m.mes}`]
                                  return (
                                    <Fragment key={`${m.ano}-${m.mes}`}>
                                      <td className="p-2 text-right text-[#898781] border-l border-white/10">{cel?.qtd || ''}</td>
                                      <td className="p-2 text-right text-[#898781] whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                                    </Fragment>
                                  )
                                })}
                                {(() => {
                                  const t = totalAnoTipo(grp.key, tipo, ano)
                                  return (
                                    <Fragment>
                                      <td className="p-2 text-right font-semibold text-[#c3c2b7] border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                                      <td className="p-2 text-right font-semibold text-[#c3c2b7] bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                                    </Fragment>
                                  )
                                })()}
                              </Fragment>
                            ))}
                            <td className="p-2 text-right font-semibold text-[#9085e9] border-l-2 border-white/20 bg-white/5">{pivotTipo[grp.key][tipo].total.qtd || ''}</td>
                            <td className="p-2 text-right font-semibold text-[#9085e9] bg-white/5 whitespace-nowrap">{pivotTipo[grp.key][tipo].total.qtd ? fmtMoeda(pivotTipo[grp.key][tipo].total.valor) : ''}</td>
                          </tr>

                          {tipoExpandido && statusCods.map(statusCod => (
                            <tr key={`${tipoKey}::${statusCod}`} className="border-b border-white/5 bg-white/[0.015] hover:bg-white/[0.04]">
                              <td className="p-2 pl-12 text-[#898781] sticky left-0 bg-[#0e1626] whitespace-nowrap truncate max-w-[220px]" title={statusLabel(statusCod)}>{statusLabel(statusCod)}</td>
                              {anos.map(ano => (
                                <Fragment key={ano}>
                                  {mesesPorAno[ano].map(m => {
                                    const cel = pivotStatus[grp.key][tipo][statusCod][`${m.ano}-${m.mes}`]
                                    return (
                                      <Fragment key={`${m.ano}-${m.mes}`}>
                                        <td className="p-2 text-right text-[#898781] border-l border-white/10">{cel?.qtd || ''}</td>
                                        <td className="p-2 text-right text-[#898781] whitespace-nowrap">{cel ? fmtMoeda(cel.valor) : ''}</td>
                                      </Fragment>
                                    )
                                  })}
                                  {(() => {
                                    const t = totalAnoStatus(grp.key, tipo, statusCod, ano)
                                    return (
                                      <Fragment>
                                        <td className="p-2 text-right font-medium text-[#c3c2b7] border-l border-white/10 bg-white/5">{t.qtd || ''}</td>
                                        <td className="p-2 text-right font-medium text-[#c3c2b7] bg-white/5 whitespace-nowrap">{t.qtd ? fmtMoeda(t.valor) : ''}</td>
                                      </Fragment>
                                    )
                                  })()}
                                </Fragment>
                              ))}
                              <td className="p-2 text-right font-medium text-[#9085e9]/80 border-l-2 border-white/20 bg-white/5">{pivotStatus[grp.key][tipo][statusCod].total.qtd || ''}</td>
                              <td className="p-2 text-right font-medium text-[#9085e9]/80 bg-white/5 whitespace-nowrap">{pivotStatus[grp.key][tipo][statusCod].total.qtd ? fmtMoeda(pivotStatus[grp.key][tipo][statusCod].total.valor) : ''}</td>
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
                    {mesesPorAno[ano].map(m => {
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
        {linhasOrdenadas.length === 0 ? (
          <div className="p-10 text-center text-[#898781] text-sm">Nenhum registro para exibir.</div>
        ) : (
          <table className="w-full text-left border-collapse" style={{ minWidth: '1800px' }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#141d33] border-b border-white/10 text-[#898781] text-[10px] font-bold uppercase tracking-wider">
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
                  {COLUNAS_DETALHE.map(c => {
                    const valor = row[c.key]
                    const texto = c.tipo === 'data' ? fmtData(valor) : c.tipo === 'moeda' ? (valor ? fmtMoeda(valor) : '') : (valor ?? '')
                    if (c.key === 'status_shc') {
                      return (
                        <td key={c.key} className="p-0 whitespace-nowrap">
                          {texto ? (
                            <button
                              type="button"
                              onClick={() => toggleFiltroStatusShc(texto)}
                              title="Filtrar por este Status SHC"
                              className={`w-full h-full text-left p-3 transition-colors hover:bg-[#9085e9]/10 hover:text-[#9085e9] ${filtroStatusShc === texto ? 'bg-[#9085e9]/15 text-[#9085e9] font-semibold' : 'text-[#c3c2b7]'}`}
                            >
                              {texto}
                            </button>
                          ) : <span className="block p-3 text-white/20">—</span>}
                        </td>
                      )
                    }
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
    </div>
  )
}
