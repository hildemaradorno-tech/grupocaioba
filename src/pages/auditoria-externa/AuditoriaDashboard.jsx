import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, LabelList } from 'recharts'
import { AlertTriangle, CheckCircle2, ShieldAlert, Layers, CalendarClock, Users, ChevronDown, Check } from 'lucide-react'
import { useSessionState } from '../../hooks/useSessionState'
import { apiService } from '../../services/api'
import AuditoriaExternaNav from './AuditoriaExternaNav'
import { useAuth } from '../../context/AuthContext'
import { calcularPercentualAtingidoAchado, statusAgregadoAchado, achadoResolvido, empresaNoEscopo, departamentoNoEscopo, fmtMoeda } from './auditExtConstants'

function KpiCard({ icon: Icon, label, valor, sub, cor, aoClicar, ativo }) {
  return (
    <div
      onClick={aoClicar}
      className={`rounded-lg border p-4 shadow-sm ${cor.bg} ${cor.border} ${aoClicar ? 'cursor-pointer transition-shadow hover:shadow-md' : ''} ${ativo ? 'ring-2 ring-indigo-500' : ''}`}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`p-1 rounded ${cor.icoBg}`}><Icon className={`h-3.5 w-3.5 ${cor.icoTxt}`} /></div>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${cor.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${cor.numTxt}`}>{valor}</p>
      {sub && <p className={`text-[10px] mt-1 ${cor.labelTxt}`}>{sub}</p>}
    </div>
  )
}

const PIE_CORES_DEPARTAMENTO = ['#2563eb', '#0ea5e9', '#14b8a6', '#0d9488', '#6366f1', '#3b82f6', '#22d3ee', '#0891b2']
const PIE_CORES_TIPO_ACAO = ['#7c3aed', '#c026d3', '#db2777', '#f97316', '#ea580c', '#a855f7', '#e11d48', '#d946ef']
const PIE_CORES_IMPACTO = ['#b91c1c', '#ea580c', '#ca8a04', '#65a30d', '#0f766e', '#1d4ed8', '#7c3aed', '#be185d']
const STATUS_COR_CHART = { sem_plano: '#94a3b8', pendente: '#94a3b8', em_andamento: '#3b82f6', concluido: '#10b981', validado_auditoria: '#4f46e5' }
const STATUS_LABEL = { sem_plano: 'Sem Plano', pendente: 'Pendente', em_andamento: 'Em Andamento', concluido: 'Concluído' }
const LABEL_DIM = { status: 'Status', departamento: 'Departamento', tipoAcao: 'Tipo de Ação', tipoDivergencia: 'Tipo de Divergência', impacto: 'Impacto', ciclo: 'Ciclo de Auditoria', resolucao: 'Situação' }
const LABEL_RESOLUCAO = { resolvida: 'Resolvidas', naoResolvida: 'Não Resolvidas' }

// Gráfico de pizza por contagem, usado em "por Departamento" / "por Tipo de Ação".
// Por fora de cada fatia mostra o % do total; passando o mouse (tooltip) mostra
// só a quantidade. Clicar numa fatia filtra o painel inteiro.
function RankingPie({ dados, cores, aoClicar, destaque }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={dados} dataKey="qtd" nameKey="label" cx="50%" cy="48%" outerRadius={70}
          label={({ percent }) => `${Math.round(percent * 100)}%`}
          onClick={(e) => aoClicar && aoClicar(e?.payload ?? e)}
        >
          {dados.map((d, i) => <Cell key={i} fill={cores[i % cores.length]} fillOpacity={destaque && !destaque(d) ? 0.35 : 1} style={{ cursor: aoClicar ? 'pointer' : 'default' }} />)}
        </Pie>
        <Tooltip formatter={(v, n, p) => [v, p.payload.label]} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Gráfico de colunas (barras verticais) por contagem — ou, quando `formatarValor`
// é passado, por valor monetário (ex: "Impacto" em R$ por texto de impacto).
function RankingColunas({ dados, cores, formatarValor, aoClicar, destaque }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  const fmt = formatarValor || (v => v)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v, n, p) => [fmt(v), p.payload.label]} />
        <Bar dataKey="qtd" radius={[4, 4, 0, 0]} onClick={(e) => aoClicar && aoClicar(e?.payload ?? e)}>
          <LabelList dataKey="qtd" position="top" fontSize={11} fontWeight="bold" fill="#334155" formatter={fmt} />
          {dados.map((d, i) => <Cell key={i} fill={cores[i % cores.length]} fillOpacity={destaque && !destaque(d) ? 0.35 : 1} style={{ cursor: aoClicar ? 'pointer' : 'default' }} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Selo com o % Atingido (Valor Corrigido ÷ Total Apontado) do ciclo — oval
// centralizada entre as duas colunas, acima da mais alta das duas.
function VariacaoBadge({ x, y, width, height, value, index, dados }) {
  const item = dados[index]
  if (!item || !item.totalApontado) return null

  const pct = Math.round((item.valorCorrigido / item.totalApontado) * 100)
  const baseline = y + height
  const escala = height / (value || 1)
  const yEsquerdaTopo = baseline - item.totalApontado * escala
  const topoMaisAlto = Math.min(y, yEsquerdaTopo)

  const cor = '#4f46e5'
  const texto = `${pct}%`
  const pillW = Math.max(36, 16 + texto.length * 7)
  const pillH = 18
  const cx = x
  const pillY = topoMaisAlto - 26

  return (
    <g>
      <rect x={cx - pillW / 2} y={pillY} width={pillW} height={pillH} rx={pillH / 2} fill={cor} />
      <text x={cx} y={pillY + pillH / 2 + 3.5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#fff">
        {texto}
      </text>
    </g>
  )
}

// Tooltip customizado do ComparativoColunas — além de Apontado/Corrigido,
// mostra a Diferença entre os dois valores do ciclo.
function ComparativoTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const item = payload[0]?.payload
  if (!item) return null
  const diferenca = Number(item.totalApontado || 0) - Number(item.valorCorrigido || 0)
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      <p className="text-rose-600">Total Apontado: <strong>{fmtMoeda(item.totalApontado)}</strong></p>
      <p className="text-emerald-600">Valor Corrigido: <strong>{fmtMoeda(item.valorCorrigido)}</strong></p>
      <p className="text-slate-500 border-t border-slate-100 mt-1 pt-1">Diferença: <strong className="text-slate-700">{fmtMoeda(diferenca)}</strong></p>
    </div>
  )
}

// Gráfico de colunas agrupadas — duas barras (Apontado x Corrigido) lado a lado
// por categoria (ex: por Ciclo de Auditoria), em valor monetário, com selo de
// variação % entre as duas colunas de cada ciclo.
function ComparativoColunas({ dados, aoClicar }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} margin={{ top: 50, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickFormatter={fmtMoeda} />
        <Tooltip content={<ComparativoTooltip />} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="totalApontado" name="Total Apontado" fill="#e11d48" radius={[4, 4, 0, 0]} onClick={(e) => aoClicar && aoClicar(e?.payload ?? e)} cursor="pointer">
          <LabelList dataKey="totalApontado" position="top" fontSize={10} fontWeight="bold" fill="#334155" formatter={fmtMoeda} />
        </Bar>
        <Bar dataKey="valorCorrigido" name="Valor Corrigido" fill="#059669" radius={[4, 4, 0, 0]} onClick={(e) => aoClicar && aoClicar(e?.payload ?? e)} cursor="pointer">
          <LabelList dataKey="valorCorrigido" position="top" fontSize={10} fontWeight="bold" fill="#334155" formatter={fmtMoeda} />
          <LabelList content={(props) => <VariacaoBadge {...props} dados={dados} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Rótulo combinado — quantidade + valor apontado, os dois na mesma barra.
function QuantidadeValorLabel({ x, y, width, value, index, dados }) {
  const item = dados[index]
  if (!item) return null
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#334155">
      {item.quantidade} un. · {fmtMoeda(item.valor)}
    </text>
  )
}

// Uma barra por Tipo de Divergência — altura = Valor Apontado (R$), com a
// quantidade de ocorrências junto no mesmo rótulo, acima da barra.
function QuantidadeValorColunas({ dados, aoClicar, destaque }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={dados} margin={{ top: 24, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={70} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickFormatter={fmtMoeda} />
        <Tooltip formatter={(v, n, p) => [`${p.payload.quantidade} un. · ${fmtMoeda(v)}`, 'Valor Apontado']} />
        <Bar dataKey="valor" radius={[4, 4, 0, 0]} onClick={(e) => aoClicar && aoClicar(e?.payload ?? e)}>
          {dados.map((d, i) => <Cell key={i} fill="#6366f1" fillOpacity={destaque && !destaque(d) ? 0.35 : 1} style={{ cursor: aoClicar ? 'pointer' : 'default' }} />)}
          <LabelList content={(props) => <QuantidadeValorLabel {...props} dados={dados} />} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Seletor de Ciclo de Auditoria com múltipla seleção — botão com resumo do que
// está selecionado, abre um painel com checkboxes (fecha ao clicar fora).
function CicloMultiSelect({ ciclos, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClickFora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const toggle = (id) => {
    onChange(selecionados.includes(id) ? selecionados.filter(x => x !== id) : [...selecionados, id])
  }

  const resumo = selecionados.length === 0
    ? 'Todos os ciclos (visão consolidada)'
    : selecionados.length === 1
      ? (() => { const c = ciclos.find(c => c.id === selecionados[0]); return c ? `${c.proj_empresas?.nome || '—'} · ${c.periodo_competencia}` : '1 ciclo selecionado' })()
      : `${selecionados.length} ciclos selecionados`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(v => !v)}
        className="flex items-center gap-1.5 text-xs p-2 border border-slate-200 rounded-md min-w-[220px] max-w-[280px] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span className="flex-1 text-left truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5">
          <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100">
            <button onClick={() => onChange(ciclos.map(c => c.id))} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Selecionar todos</button>
            <button onClick={() => onChange([])} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">Limpar</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {ciclos.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhum ciclo cadastrado.</p>
            ) : ciclos.map(c => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                <span className={`h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center ${selecionados.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {selecionados.includes(c.id) && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <input type="checkbox" className="hidden" checked={selecionados.includes(c.id)} onChange={() => toggle(c.id)} />
                <span className="truncate">{c.proj_empresas?.nome || '—'} · {c.periodo_competencia}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Seletor de Empresa com múltipla seleção — mesmo padrão do CicloMultiSelect.
function EmpresaMultiSelect({ empresas, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClickFora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', onClickFora)
    return () => document.removeEventListener('mousedown', onClickFora)
  }, [])

  const toggle = (id) => {
    onChange(selecionados.includes(id) ? selecionados.filter(x => x !== id) : [...selecionados, id])
  }

  const resumo = selecionados.length === 0
    ? 'Todas as empresas'
    : selecionados.length === 1
      ? (empresas.find(e => e.id === selecionados[0])?.nome || '1 empresa selecionada')
      : `${selecionados.length} empresas selecionadas`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto(v => !v)}
        className="flex items-center gap-1.5 text-xs p-2 border border-slate-200 rounded-md min-w-[220px] max-w-[280px] font-medium text-slate-700 bg-white hover:bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      >
        <span className="flex-1 text-left truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div className="absolute left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1.5">
          <div className="flex items-center justify-between px-3 py-1 border-b border-slate-100">
            <button onClick={() => onChange(empresas.map(e => e.id))} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700">Selecionar todas</button>
            <button onClick={() => onChange([])} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">Limpar</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {empresas.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhuma empresa cadastrada.</p>
            ) : empresas.map(e => (
              <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                <span className={`h-3.5 w-3.5 rounded border shrink-0 flex items-center justify-center ${selecionados.includes(e.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                  {selecionados.includes(e.id) && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <input type="checkbox" className="hidden" checked={selecionados.includes(e.id)} onChange={() => toggle(e.id)} />
                <span className="truncate">{e.nome}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


export default function AuditoriaDashboard() {
  const { isAdminEfetivo, empresasPermitidasAuditoriaEfetivas, departamentosPermitidosAuditoriaEfetivos, hasActionOrDefault } = useAuth()
  const canVerTodos = hasActionOrDefault('auditoria-externa/dashboard', 'ver_todos') &&
    (empresasPermitidasAuditoriaEfetivas.size > 0 || departamentosPermitidosAuditoriaEfetivos.size > 0)
  const [verTodos, setVerTodos] = useSessionState('audext_ver_todos', false)
  const [achados, setAchados] = useState([])
  const [planos, setPlanos] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)
  const [cicloIds, setCicloIds] = useSessionState('audext_dashboard_ciclos', [])
  const [empresaIds, setEmpresaIds] = useSessionState('audext_dashboard_empresas', [])

  const empresasEfetivas = verTodos ? new Set() : empresasPermitidasAuditoriaEfetivas
  const departamentosEfetivos = verTodos ? new Set() : departamentosPermitidosAuditoriaEfetivos

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, c] = await Promise.all([
        apiService.getAuditExtAchados(),
        apiService.getAuditExtPlanosAcao(),
        apiService.getAuditExtCiclos(),
      ])
      setAchados(a)
      setPlanos(p)
      setCiclos(c)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDados() }, [loadDados])

  // Escopo por Empresa/Departamento (Grupo de Acesso) — vazio = sem restrição.
  const achadoIdsNoEscopoDeEmpresa = useMemo(() => {
    const set = new Set()
    for (const a of achados) {
      if (empresaNoEscopo(a.audext_ciclos?.empresa_id, empresasEfetivas, isAdminEfetivo)) set.add(a.id)
    }
    return set
  }, [achados, empresasEfetivas, isAdminEfetivo])

  const planosVisiveis = useMemo(() =>
    planos.filter(p =>
      achadoIdsNoEscopoDeEmpresa.has(p.achado_id) &&
      departamentoNoEscopo(p.proj_departamentos?.nome, departamentosEfetivos, isAdminEfetivo)
    ),
    [planos, achadoIdsNoEscopoDeEmpresa, departamentosEfetivos, isAdminEfetivo])

  // Com restrição de Departamento ativa, uma divergência só aparece se tiver pelo menos
  // uma ação no departamento liberado — sem restrição (modo TODOS/admin/Ver Todos),
  // divergências sem nenhuma ação cadastrada continuam visíveis normalmente.
  const isDeptoRestrito = !isAdminEfetivo && departamentosEfetivos.size > 0

  const planosVisiveisPorAchado = useMemo(() => {
    const m = new Map()
    for (const p of planosVisiveis) {
      if (!m.has(p.achado_id)) m.set(p.achado_id, 0)
      m.set(p.achado_id, m.get(p.achado_id) + 1)
    }
    return m
  }, [planosVisiveis])

  const achadosVisiveis = useMemo(() =>
    achados.filter(a =>
      achadoIdsNoEscopoDeEmpresa.has(a.id) &&
      (!isDeptoRestrito || planosVisiveisPorAchado.has(a.id))
    ),
    [achados, achadoIdsNoEscopoDeEmpresa, isDeptoRestrito, planosVisiveisPorAchado])

  const ciclosVisiveis = useMemo(() =>
    ciclos.filter(c => empresaNoEscopo(c.empresa_id, empresasEfetivas, isAdminEfetivo)),
    [ciclos, empresasEfetivas, isAdminEfetivo])

  // Lista de empresas pro seletor — vem do campo "Empresa" da própria Ação (Plano
  // de Ação), igual ao filtro avançado de lá (dim_empresas, não proj_empresas do Ciclo).
  const empresasDisponiveis = useMemo(() => {
    const m = new Map()
    for (const p of planosVisiveis) {
      if (p.dim_empresas?.id) m.set(p.dim_empresas.id, p.dim_empresas.empresa_fantasia || p.dim_empresas.nome_empresa)
    }
    return Array.from(m, ([id, nome]) => ({ id, nome })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  }, [planosVisiveis])

  // Achados com pelo menos uma Ação na Empresa selecionada.
  const achadoIdsComEmpresaSelecionada = useMemo(() => {
    const set = new Set()
    for (const p of planosVisiveis) {
      if (p.empresa_id && empresaIds.includes(p.empresa_id)) set.add(p.achado_id)
    }
    return set
  }, [planosVisiveis, empresaIds])

  // Clique num gráfico vira filtro do painel inteiro (gráficos e cards). Clicar de
  // novo no mesmo item limpa o filtro.
  const [filtroGrafico, setFiltroGrafico] = useState(null) // null | { dim, valor }
  const alternarFiltroGrafico = (dim, valor) =>
    setFiltroGrafico(prev => (prev && prev.dim === dim && prev.valor === valor ? null : { dim, valor }))
  const destaque = (dim, chave) => (item) =>
    !filtroGrafico || filtroGrafico.dim !== dim || filtroGrafico.valor === chave(item)

  const planosVisiveisDoAchado = useMemo(() => {
    const m = new Map()
    for (const p of planosVisiveis) {
      if (!m.has(p.achado_id)) m.set(p.achado_id, [])
      m.get(p.achado_id).push(p)
    }
    return m
  }, [planosVisiveis])

  const statusLabelDoAchado = (achadoId) => {
    const st = statusAgregadoAchado(planosVisiveisDoAchado.get(achadoId))
    const chave = st === 'validado_auditoria' ? 'concluido' : (st || 'sem_plano')
    return STATUS_LABEL[chave]
  }

  // Filtro por Ciclo de Auditoria, Empresa (da Ação) e clique em gráfico.
  const achadosFiltrados = useMemo(() => {
    let base = achadosVisiveis
    if (cicloIds.length > 0) base = base.filter(a => cicloIds.includes(a.ciclo_id))
    if (empresaIds.length > 0) base = base.filter(a => achadoIdsComEmpresaSelecionada.has(a.id))
    if (filtroGrafico) {
      const { dim, valor } = filtroGrafico
      base = base.filter(a => {
        if (dim === 'status') return statusLabelDoAchado(a.id) === valor
        if (dim === 'impacto') return ((a.impactos || '').trim() || 'Não informado') === valor
        if (dim === 'tipoDivergencia') return (a.audext_tipos_divergencia?.nome || 'Não definido') === valor
        if (dim === 'ciclo') return a.ciclo_id === valor
        if (dim === 'resolucao') return achadoResolvido(planosVisiveisDoAchado.get(a.id)) === (valor === 'resolvida')
        if (dim === 'departamento') return (planosVisiveisDoAchado.get(a.id) || []).some(p => (p.proj_departamentos?.nome || 'Não atribuído') === valor)
        if (dim === 'tipoAcao') return (planosVisiveisDoAchado.get(a.id) || []).some(p => (p.audext_tipos_acao?.nome || 'Não definido') === valor)
        return true
      })
    }
    return base
  }, [achadosVisiveis, cicloIds, empresaIds, achadoIdsComEmpresaSelecionada, filtroGrafico, planosVisiveisDoAchado])

  const achadoIdsFiltrados = useMemo(() => new Set(achadosFiltrados.map(a => a.id)), [achadosFiltrados])

  const planosFiltrados = useMemo(() => {
    let base = planosVisiveis
    if (cicloIds.length > 0 || empresaIds.length > 0 || filtroGrafico) base = base.filter(p => achadoIdsFiltrados.has(p.achado_id))
    if (empresaIds.length > 0) base = base.filter(p => empresaIds.includes(p.empresa_id))
    if (filtroGrafico?.dim === 'departamento') base = base.filter(p => (p.proj_departamentos?.nome || 'Não atribuído') === filtroGrafico.valor)
    if (filtroGrafico?.dim === 'tipoAcao') base = base.filter(p => (p.audext_tipos_acao?.nome || 'Não definido') === filtroGrafico.valor)
    return base
  }, [planosVisiveis, cicloIds, empresaIds, achadoIdsFiltrados, filtroGrafico])

  const ciclosSelecionados = useMemo(() =>
    ciclosVisiveis.filter(c => cicloIds.includes(c.id)),
    [ciclosVisiveis, cicloIds])

  // Uma divergência pode ter várias ações (planos de ação).
  const planosPorAchado = useMemo(() => {
    const m = new Map()
    for (const p of planosFiltrados) {
      if (!m.has(p.achado_id)) m.set(p.achado_id, [])
      m.get(p.achado_id).push(p)
    }
    return m
  }, [planosFiltrados])

  const totalDivergencias = achadosFiltrados.length

  const resolvidas = useMemo(() =>
    achadosFiltrados.filter(a => achadoResolvido(planosPorAchado.get(a.id))).length,
    [achadosFiltrados, planosPorAchado])

  const naoResolvidas = totalDivergencias - resolvidas

  // Total Apontado x Valor Corrigido, agrupado por Ciclo de Auditoria (Valor
  // Corrigido é um campo da própria divergência, não soma de ações).
  const apontadoXCorrigidoPorCiclo = useMemo(() => {
    const m = new Map()
    for (const a of achadosFiltrados) {
      const c = a.audext_ciclos
      const chave = a.ciclo_id
      if (!m.has(chave)) {
        m.set(chave, {
          label: c ? `${c.proj_empresas?.nome || '—'} · ${c.periodo_competencia}` : 'Sem ciclo',
          cicloId: chave,
          totalApontado: 0,
          valorCorrigido: 0,
        })
      }
      const g = m.get(chave)
      g.totalApontado += Number(a.total_apontado || 0)
      g.valorCorrigido += Number(a.valor_corrigido || 0)
    }
    return Array.from(m.values()).sort((a, b) => b.totalApontado - a.totalApontado)
  }, [achadosFiltrados])

  // % de conclusão geral = média do % atingido (Valor Corrigido ÷ Total
  // Apontado) de cada divergência — automático.
  const percentualGeral = useMemo(() => {
    if (achadosFiltrados.length === 0) return 0
    const soma = achadosFiltrados.reduce((s, a) => s + calcularPercentualAtingidoAchado(a), 0)
    return Math.round(soma / achadosFiltrados.length)
  }, [achadosFiltrados])

  // Quantidade de divergências em cada estágio (o estágio da divergência é o
  // mais atrasado entre as ações dela). "Validado pela Auditoria" entra junto
  // com "Concluído" aqui.
  const statusData = useMemo(() => {
    const m = { sem_plano: 0, pendente: 0, em_andamento: 0, concluido: 0 }
    for (const a of achadosFiltrados) {
      const st = statusAgregadoAchado(planosPorAchado.get(a.id))
      const chave = st === 'validado_auditoria' ? 'concluido' : (st || 'sem_plano')
      m[chave]++
    }
    return Object.entries(m).map(([k, qtd]) => ({ status: STATUS_LABEL[k], qtd, cor: STATUS_COR_CHART[k] }))
  }, [achadosFiltrados, planosPorAchado])

  // Em quais departamentos tiveram mais ações (cada ação conta pro seu departamento).
  const porDepartamento = useMemo(() => {
    const m = new Map()
    for (const p of planosFiltrados) {
      const nome = p.proj_departamentos?.nome || 'Não atribuído'
      m.set(nome, (m.get(nome) || 0) + 1)
    }
    return Array.from(m.entries()).map(([label, qtd]) => ({ label, qtd })).sort((a, b) => b.qtd - a.qtd)
  }, [planosFiltrados])

  // Que tipo de ação foi realizada (cada ação conta pro seu tipo).
  const porTipoAcao = useMemo(() => {
    const m = new Map()
    for (const p of planosFiltrados) {
      const nome = p.audext_tipos_acao?.nome || 'Não definido'
      m.set(nome, (m.get(nome) || 0) + 1)
    }
    return Array.from(m.entries()).map(([label, qtd]) => ({ label, qtd })).sort((a, b) => b.qtd - a.qtd)
  }, [planosFiltrados])

  // Quantidade de divergências e soma do Total Apontado (R$) por Tipo de Divergência.
  const porTipoDivergencia = useMemo(() => {
    const m = new Map()
    for (const a of achadosFiltrados) {
      const nome = a.audext_tipos_divergencia?.nome || 'Não definido'
      if (!m.has(nome)) m.set(nome, { label: nome, quantidade: 0, valor: 0 })
      const g = m.get(nome)
      g.quantidade += 1
      g.valor += Number(a.total_apontado || 0)
    }
    return Array.from(m.values()).sort((a, b) => b.valor - a.valor)
  }, [achadosFiltrados])

  // Total Apontado (R$) somado por texto de Impacto — cada divergência entra no
  // grupo do texto exato preenchido no campo "Impactos" (texto livre).
  const porImpacto = useMemo(() => {
    const m = new Map()
    for (const a of achadosFiltrados) {
      const texto = (a.impactos || '').trim() || 'Não informado'
      m.set(texto, (m.get(texto) || 0) + Number(a.total_apontado || 0))
    }
    return Array.from(m.entries()).map(([label, qtd]) => ({ label, qtd })).sort((a, b) => b.qtd - a.qtd)
  }, [achadosFiltrados])

  if (loading) return <div className="p-6">Carregando...</div>

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard — Auditoria Externa</h1>
            <p className="text-xs text-slate-500">Visão consolidada por quantidade de divergências, andamento das soluções e conclusão dos ciclos de auditoria.</p>
          </div>
          <div className="flex items-end gap-2 shrink-0">
            {canVerTodos && (
              <button
                onClick={() => setVerTodos(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap ${verTodos ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                title={verTodos ? 'Voltar para minha visão (Empresa/Departamento do meu grupo)' : 'Ver todas as Empresas e Departamentos'}
              >
                <Users className="h-3.5 w-3.5" /> {verTodos ? '← Minha Visão' : 'Ver Todos'}
              </button>
            )}
          </div>
        </div>
        {verTodos && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700 font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            Modo "Ver Todos" — mostrando todas as Empresas e Departamentos, ignorando a restrição do seu grupo de acesso
          </div>
        )}
        <AuditoriaExternaNav />
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Ciclo de Auditoria</label>
            <CicloMultiSelect ciclos={ciclosVisiveis} selecionados={cicloIds} onChange={setCicloIds} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">Empresa</label>
            <EmpresaMultiSelect empresas={empresasDisponiveis} selecionados={empresaIds} onChange={setEmpresaIds} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          icon={ShieldAlert} label="Total de Divergências" valor={totalDivergencias}
          sub={
            ciclosSelecionados.length === 1
              ? `${ciclosSelecionados[0].proj_empresas?.nome || '—'} · ${ciclosSelecionados[0].periodo_competencia}`
              : ciclosSelecionados.length > 1
                ? `${ciclosSelecionados.length} ciclos selecionados`
                : `${ciclosVisiveis.length} ciclo(s) de auditoria`
          }
          cor={{ bg: 'bg-indigo-50', border: 'border-indigo-200', icoBg: 'bg-indigo-100', icoTxt: 'text-indigo-600', numTxt: 'text-indigo-700', labelTxt: 'text-indigo-500' }}
          aoClicar={() => setFiltroGrafico(null)}
          ativo={!filtroGrafico}
        />
        <KpiCard
          icon={AlertTriangle} label="Não Resolvidas" valor={naoResolvidas}
          sub={`de ${totalDivergencias} divergência(s) no total`}
          cor={{ bg: 'bg-rose-50', border: 'border-rose-200', icoBg: 'bg-rose-100', icoTxt: 'text-rose-600', numTxt: 'text-rose-700', labelTxt: 'text-rose-500' }}
          aoClicar={() => alternarFiltroGrafico('resolucao', 'naoResolvida')}
          ativo={filtroGrafico?.dim === 'resolucao' && filtroGrafico.valor === 'naoResolvida'}
        />
        <KpiCard
          icon={CheckCircle2} label="Divergências Resolvidas" valor={resolvidas}
          sub={`Concluídas ou validadas de ${totalDivergencias}`}
          cor={{ bg: 'bg-emerald-50', border: 'border-emerald-200', icoBg: 'bg-emerald-100', icoTxt: 'text-emerald-600', numTxt: 'text-emerald-700', labelTxt: 'text-emerald-500' }}
          aoClicar={() => alternarFiltroGrafico('resolucao', 'resolvida')}
          ativo={filtroGrafico?.dim === 'resolucao' && filtroGrafico.valor === 'resolvida'}
        />
        <KpiCard
          icon={Layers} label="% de Conclusão Geral" valor={`${percentualGeral}%`}
          sub="Média do % atingido de todas as divergências"
          cor={{ bg: 'bg-amber-50', border: 'border-amber-200', icoBg: 'bg-amber-100', icoTxt: 'text-amber-600', numTxt: 'text-amber-700', labelTxt: 'text-amber-500' }}
        />
      </div>

      {filtroGrafico && (
        <div className="flex items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 text-xs text-indigo-700 font-semibold">
          <span>
            Filtrado por {LABEL_DIM[filtroGrafico.dim]}: <strong>{filtroGrafico.dim === 'ciclo'
              ? (apontadoXCorrigidoPorCiclo.find(x => x.cicloId === filtroGrafico.valor)?.label || filtroGrafico.valor)
              : filtroGrafico.dim === 'resolucao' ? LABEL_RESOLUCAO[filtroGrafico.valor] : filtroGrafico.valor}</strong>
          </span>
          <button onClick={() => setFiltroGrafico(null)} className="px-2 py-1 rounded bg-white border border-indigo-200 hover:bg-indigo-100 transition-colors">Limpar filtro</button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-700 mb-3">Total Apontado x Valor Corrigido — por Ciclo de Auditoria</h3>
        <ComparativoColunas dados={apontadoXCorrigidoPorCiclo} aoClicar={(item) => alternarFiltroGrafico('ciclo', item.cicloId)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={v => [`${v} divergência(s) (${totalDivergencias ? Math.round((v / totalDivergencias) * 100) : 0}% do total)`, '']} />
              <Bar dataKey="qtd" radius={[0, 4, 4, 0]} onClick={(e) => alternarFiltroGrafico('status', (e?.payload ?? e).status)}>
                <LabelList dataKey="qtd" position="right" fontSize={11} fontWeight="bold" fill="#334155" />
                {statusData.map((d, i) => <Cell key={i} fill={d.cor} fillOpacity={filtroGrafico && !(filtroGrafico.dim === 'status' && filtroGrafico.valor === d.status) ? 0.35 : 1} style={{ cursor: 'pointer' }} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Tipo de Ação Tomada</h3>
          <RankingColunas dados={porTipoAcao} cores={PIE_CORES_TIPO_ACAO} aoClicar={(item) => alternarFiltroGrafico('tipoAcao', item.label)} destaque={destaque('tipoAcao', i => i.label)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Departamento</h3>
          <RankingPie dados={porDepartamento} cores={PIE_CORES_DEPARTAMENTO} aoClicar={(item) => alternarFiltroGrafico('departamento', item.label)} destaque={destaque('departamento', i => i.label)} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Impactos das Divergências</h3>
          <RankingColunas dados={porImpacto} cores={PIE_CORES_IMPACTO} formatarValor={fmtMoeda} aoClicar={(item) => alternarFiltroGrafico('impacto', item.label)} destaque={destaque('impacto', i => i.label)} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Tipo de Divergência — Quantidade x Valor Apontado</h3>
        <QuantidadeValorColunas dados={porTipoDivergencia} aoClicar={(item) => alternarFiltroGrafico('tipoDivergencia', item.label)} destaque={destaque('tipoDivergencia', i => i.label)} />
      </div>
    </div>
  )
}
