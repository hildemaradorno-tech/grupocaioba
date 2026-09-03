import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Search, Loader2, ChevronLeft, ChevronRight, ChevronDown, Users, Clock3, Layers, ExternalLink, X } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ComposedChart, Line, Legend } from 'recharts'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { passaEscopoComissao } from '../../utils/permissoesComissao'

const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const MESES = [
  { v: '01', label: 'Janeiro' }, { v: '02', label: 'Fevereiro' }, { v: '03', label: 'Março' },
  { v: '04', label: 'Abril' }, { v: '05', label: 'Maio' }, { v: '06', label: 'Junho' },
  { v: '07', label: 'Julho' }, { v: '08', label: 'Agosto' }, { v: '09', label: 'Setembro' },
  { v: '10', label: 'Outubro' }, { v: '11', label: 'Novembro' }, { v: '12', label: 'Dezembro' },
]
const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const fmtDuracao = (horas) => {
  if (horas == null) return '—'
  if (horas < 1) {
    const min = horas * 60
    return min < 1 ? '<1 min' : `${Math.round(min)} min`
  }
  if (horas < 48) {
    let h = Math.floor(horas)
    let min = Math.round((horas - h) * 60)
    if (min === 60) { h += 1; min = 0 }
    return min > 0 ? `${h}h ${min}min` : `${h}h`
  }
  return `${(horas / 24).toFixed(1)}d`
}
const media = (arr) => {
  const v = arr.filter(x => x != null)
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null
}
const fmtDataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const paraMin = (horas) => horas == null ? null : horas * 60
// Primeira ocorrência (mais antiga) de cada ação no histórico do lote — REPROCESSAMENTO_* é
// ruído de correção, ignorado no cálculo de tempo das etapas do fluxo principal.
const ACAO_LABEL = {
  CRIADO: 'Criado (Calcular)',
  CONFERIDO: 'Conferido (Gerente)',
  CONFERIDO_DP: 'Conferido (DP)',
  PROCESSADO: 'Processado (Seletiva)',
}

const calcularDuracoesLote = (eventos) => {
  const dataDe = (acao) => eventos.find(e => e.acao === acao)?.data_hora || null
  const criado = dataDe('CRIADO')
  const conferido = dataDe('CONFERIDO')
  const confDp = dataDe('CONFERIDO_DP')
  const processado = dataDe('PROCESSADO')
  const diffH = (a, b) => (a && b) ? (new Date(b) - new Date(a)) / 3600000 : null
  return {
    gerente: diffH(criado, conferido),
    dp: diffH(conferido, confDp),
    processamento: diffH(confDp, processado),
    total: diffH(criado, processado),
  }
}

function TooltipTendencia({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0]?.payload
  if (!d) return null
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-xs space-y-0.5">
      <p className="font-bold text-slate-800">{label}</p>
      <p className="text-slate-500">Lotes: <span className="font-semibold text-slate-700">{d.totalLotes}</span></p>
      <p className="text-slate-500">Funcionários Processados: <span className="font-semibold text-slate-700">{d.funcionarios}</span></p>
      <p style={{ color: '#f97316' }}>Tempo Médio Total: <span className="font-semibold">{fmtDuracao(d.tempoMedioHoras)}</span></p>
    </div>
  )
}

function KpiCard({ icon: Icon, label, valor, sub, cor }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${cor.bg} ${cor.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`p-1 rounded ${cor.icoBg}`}><Icon className={`h-3.5 w-3.5 ${cor.icoTxt}`} /></div>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${cor.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${cor.numTxt}`}>{valor}</p>
      {sub && <p className={`text-[10px] mt-1 ${cor.labelTxt}`}>{sub}</p>}
    </div>
  )
}

export default function BiComissoes() {
  const { hasPermission, comissaoEscopoEfetivo } = useAuth()
  const navigate = useNavigate()

  const hoje = new Date()
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const anoAtual = hoje.getFullYear()
  const ANOS = useMemo(() => Array.from({ length: 6 }, (_, i) => String(anoAtual - i)), [anoAtual])

  // Vem pré-selecionado com o mês anterior — mesmo padrão já usado em Cálculo/Processamento de Comissões.
  const [ano, setAno] = useState(String(mesAnterior.getFullYear()))
  const [mes, setMes] = useState(String(mesAnterior.getMonth() + 1).padStart(2, '0'))

  const [carregandoBase, setCarregandoBase] = useState(true)
  const [empresas, setEmpresas] = useState([])
  const [departamentos, setDepartamentos] = useState([])

  const [buscando, setBuscando] = useState(false)
  const [jaBuscou, setJaBuscou] = useState(false)
  const [erro, setErro] = useState(null)
  const [lotesPorMes, setLotesPorMes] = useState([]) // paralelo a mesesDoRange, já filtrado por escopo
  const [historicoPorLote, setHistoricoPorLote] = useState({}) // lote_id -> eventos[]

  // Cross-filtro entre os gráficos — clicar numa Loja (Tempo Médio por Loja), numa Etapa (Tempo
  // Médio por Etapa) ou num mês (Tendência) filtra os outros gráficos/cards, sem precisar buscar
  // de novo (os 6 meses já estão carregados). Clicar de novo no mesmo item desfaz o filtro. Um
  // gráfico nunca se autofiltra pela própria seleção (só filtra OS OUTROS) — só a Tendência não
  // é filtrável por mês (ela sempre mostra os 6 inteiros, é o que dá o comparativo).
  const [empresaFiltro, setEmpresaFiltro] = useState(null)
  const [etapaFiltro, setEtapaFiltro] = useState(null) // 'gerente' | 'dp' | 'processamento' | null
  const [mesSelecionadoIdx, setMesSelecionadoIdx] = useState(5)

  // Filtros Avançados — aplicados na busca (Visualizar), diferente do cross-filtro dos gráficos
  // acima (que só reagem a clique e nunca precisam buscar de novo).
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [departamentoFiltro, setDepartamentoFiltro] = useState('')
  const passaFiltros = (l, { ignorarEmpresa, ignorarEtapa } = {}) => {
    if (!ignorarEmpresa && empresaFiltro && l.empresa_id !== empresaFiltro) return false
    if (!ignorarEtapa && etapaFiltro && calcularDuracoesLote(historicoPorLote[l.id] || [])[etapaFiltro] == null) return false
    return true
  }

  useEffect(() => {
    (async () => {
      setCarregandoBase(true)
      try {
        const [emps, deptos] = await Promise.all([apiService.getEmpresas(), apiService.getDepartamentos()])
        setEmpresas(emps)
        setDepartamentos(deptos)
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoBase(false)
      }
    })()
  }, [])

  const empresasMap = useMemo(() => Object.fromEntries(empresas.map(e => [e.id, e])), [empresas])
  const departamentosMap = useMemo(() => Object.fromEntries(departamentos.map(d => [d.id, d])), [departamentos])

  const mudarMes = (delta) => {
    const data = new Date(Number(ano), Number(mes) - 1 + delta, 1)
    setAno(String(data.getFullYear()))
    setMes(String(data.getMonth() + 1).padStart(2, '0'))
  }

  // Últimos 6 meses terminando no mês selecionado — os cartões olham só o último (mês
  // selecionado); o gráfico de tendência usa os 6 inteiros, pra dar comparativo mês a mês.
  const mesesDoRange = useMemo(() => {
    const base = new Date(Number(ano), Number(mes) - 1, 1)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1)
      const anoD = d.getFullYear()
      const mesD = d.getMonth()
      const ultimoDia = new Date(anoD, mesD + 1, 0).getDate()
      const pad = (n) => String(n).padStart(2, '0')
      return {
        ano: anoD, mes: mesD,
        label: `${MESES_ABREV[mesD]}/${String(anoD).slice(2)}`,
        periodoInicio: `${anoD}-${pad(mesD + 1)}-01`,
        periodoFim: `${anoD}-${pad(mesD + 1)}-${pad(ultimoDia)}`,
      }
    })
  }, [ano, mes])

  const handleVisualizar = async () => {
    setBuscando(true)
    setJaBuscou(true)
    setErro(null)
    setEmpresaFiltro(null)
    setEtapaFiltro(null)
    setMesSelecionadoIdx(5)
    try {
      const listasPorMes = await Promise.all(
        mesesDoRange.map(m => apiService.getLotesPorPeriodo(m.periodoInicio, m.periodoFim))
      )
      // Escopo de acesso do usuário (mesmo critério já usado em Cálculo de Comissões/Visão
      // Geral) — admin vê tudo; grupo restrito só vê os lotes dentro do escopo dele. Departamento
      // (Filtros Avançados) é aplicado junto, antes de qualquer coisa entrar na tela.
      const filtrarEscopo = (lotes) => lotes.filter(l => {
        if (departamentoFiltro && l.departamento_id !== departamentoFiltro) return false
        const depto = l.departamento_id ? departamentosMap[l.departamento_id] : null
        return passaEscopoComissao({
          empresaId: l.empresa_id,
          areaNomes: depto?.area ? [depto.area] : [],
          departamentoIds: l.departamento_id ? [l.departamento_id] : [],
          setorIds: [],
          agrupamentoCargoId: null,
        }, comissaoEscopoEfetivo)
      })
      const listasFiltradas = listasPorMes.map(filtrarEscopo)
      setLotesPorMes(listasFiltradas)

      const todosLoteIds = listasFiltradas.flat().map(l => l.id)
      const eventos = todosLoteIds.length > 0 ? await apiService.getHistoricoLotesPorIds(todosLoteIds) : []
      const porLote = {}
      for (const ev of eventos) {
        if (!porLote[ev.lote_id]) porLote[ev.lote_id] = []
        porLote[ev.lote_id].push(ev)
      }
      setHistoricoPorLote(porLote)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setBuscando(false)
    }
  }

  // Mês "selecionado" pro cross-filtro é um índice dentro dos 6 já carregados (clicar num mês da
  // Tendência troca só esse índice, sem precisar buscar de novo). lotesMesSelecionadoBase ainda
  // sem o filtro de Loja — Loja/Etapas/KPIs usam a versão filtrada; a Tendência e a lista de
  // Lojas continuam mostrando tudo, só destacando o item ativo.
  const lotesMesSelecionadoBase = lotesPorMes[mesSelecionadoIdx] || []
  // Usada pelos KPIs — único lugar que aplica os dois filtros de uma vez (não é "clicável" ela
  // mesma, então não tem autofiltro pra evitar).
  const lotesMesSelecionado = lotesMesSelecionadoBase.filter(l => passaFiltros(l))

  const kpis = useMemo(() => {
    const processados = lotesMesSelecionado.filter(l => l.status === 'PROCESSADO')
    const funcionariosProcessados = processados.reduce((acc, l) => acc + (l.qtd_funcionarios || 0), 0)
    const tempoMedioTotal = media(lotesMesSelecionado.map(l => calcularDuracoesLote(historicoPorLote[l.id] || []).total))
    return { totalLotes: lotesMesSelecionado.length, funcionariosProcessados, tempoMedioTotal }
  }, [lotesMesSelecionado, historicoPorLote])

  // Aplica o filtro de Loja (se houver), mas ignora o de Etapa — senão clicar "Seletiva" faria
  // essa própria barra desaparecer das outras (autofiltro).
  const dadosEtapas = useMemo(() => {
    const lotes = lotesMesSelecionadoBase.filter(l => passaFiltros(l, { ignorarEtapa: true }))
    const duracoes = lotes.map(l => calcularDuracoesLote(historicoPorLote[l.id] || []))
    return [
      { chave: 'gerente', etapa: 'Conferir', minutos: paraMin(media(duracoes.map(d => d.gerente))), cor: '#3b82f6' },
      { chave: 'dp', etapa: 'Processamento DP', minutos: paraMin(media(duracoes.map(d => d.dp))), cor: '#6366f1' },
      { chave: 'processamento', etapa: 'Seletiva', minutos: paraMin(media(duracoes.map(d => d.processamento))), cor: '#10b981' },
    ]
  }, [lotesMesSelecionadoBase, historicoPorLote, empresaFiltro, etapaFiltro])

  // Tempo médio total (Calcular → última etapa da Seletiva) por Loja — só lotes já Processados
  // têm as duas pontas (CRIADO e PROCESSADO) pra calcular o total. Aplica o filtro de Etapa (se
  // houver) mas ignora o de Loja — senão clicar numa Loja faria as outras desaparecerem daqui.
  const dadosPorLoja = useMemo(() => {
    const porEmpresa = new Map()
    for (const l of lotesMesSelecionadoBase.filter(l => passaFiltros(l, { ignorarEmpresa: true }))) {
      if (l.status !== 'PROCESSADO') continue
      const total = calcularDuracoesLote(historicoPorLote[l.id] || []).total
      if (total == null) continue
      const empresa = l.empresa_id ? empresasMap[l.empresa_id] : null
      const nome = empresa?.empresa_fantasia || empresa?.nome_empresa || l.empresa_nome || 'Sem empresa'
      if (!porEmpresa.has(l.empresa_id)) porEmpresa.set(l.empresa_id, { empresaId: l.empresa_id, nome, horas: [] })
      porEmpresa.get(l.empresa_id).horas.push(total)
    }
    return [...porEmpresa.values()]
      .map(({ empresaId, nome, horas }) => ({ empresaId, empresa: nome, minutos: paraMin(media(horas)) }))
      .sort((a, b) => b.minutos - a.minutos)
  }, [lotesMesSelecionadoBase, historicoPorLote, empresasMap, etapaFiltro])

  // Tempo médio Criado → Conferido por Usuário — atribuído a quem CONFERIU (fecha esse
  // intervalo), não a quem criou o lote.
  const dadosConferirPorUsuario = useMemo(() => {
    const porUsuario = new Map()
    for (const l of lotesMesSelecionado) {
      const eventos = historicoPorLote[l.id] || []
      const conferido = eventos.find(e => e.acao === 'CONFERIDO')
      if (!conferido?.usuario) continue
      const tempo = calcularDuracoesLote(eventos).gerente
      if (tempo == null) continue
      if (!porUsuario.has(conferido.usuario)) porUsuario.set(conferido.usuario, [])
      porUsuario.get(conferido.usuario).push(tempo)
    }
    return [...porUsuario.entries()]
      .map(([usuario, horas]) => ({ usuario, minutos: paraMin(media(horas)) }))
      .sort((a, b) => b.minutos - a.minutos)
  }, [lotesMesSelecionado, historicoPorLote])

  // Tendência aplica os dois filtros (Loja e Etapa) em cada um dos 6 meses — ela não tem
  // dimensão própria clicável nesse sentido (só o mês, que não filtra os outros gráficos),
  // então não precisa ignorar nenhum dos dois.
  const dadosTendencia = useMemo(() => mesesDoRange.map((m, i) => {
    const lotesDoMes = (lotesPorMes[i] || []).filter(l => passaFiltros(l))
    const processados = lotesDoMes.filter(l => l.status === 'PROCESSADO')
    const funcionarios = processados.reduce((acc, l) => acc + (l.qtd_funcionarios || 0), 0)
    const tempoMedio = media(lotesDoMes.map(l => calcularDuracoesLote(historicoPorLote[l.id] || []).total))
    return { mesLabel: m.label, totalLotes: lotesDoMes.length, funcionarios, tempoMedioHoras: tempoMedio, minutosMedios: paraMin(tempoMedio) }
  }), [mesesDoRange, lotesPorMes, historicoPorLote, empresaFiltro, etapaFiltro])

  const mesInfoSelecionado = mesesDoRange[mesSelecionadoIdx] || mesesDoRange[5]
  const empresaFiltroNome = empresaFiltro ? (empresasMap[empresaFiltro]?.empresa_fantasia || empresasMap[empresaFiltro]?.nome_empresa || empresaFiltro) : null

  // Histórico de todas as etapas dos lotes do mês selecionado, já com os mesmos cross-filtros
  // (Loja/Etapa) dos gráficos — em ordem cronológica (mais antigo primeiro), acompanhando o
  // fluxo Criado → Conferido → Conferido DP → Processado.
  const linhasHistorico = useMemo(() => {
    const linhas = []
    for (const l of lotesMesSelecionado) {
      const empresa = l.empresa_id ? empresasMap[l.empresa_id] : null
      const empresaNome = empresa?.empresa_fantasia || empresa?.nome_empresa || l.empresa_nome || 'Sem empresa'
      const departamentoNome = l.departamento_id ? (departamentosMap[l.departamento_id]?.nome_departamento || null) : null
      for (const ev of (historicoPorLote[l.id] || [])) {
        linhas.push({ ...ev, empresaNome, departamentoNome })
      }
    }
    return linhas.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora))
  }, [lotesMesSelecionado, historicoPorLote, empresasMap, departamentosMap])

  if (carregandoBase) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" /> BI — Comissões
          </h1>
          <p className="text-xs text-slate-500">Tempo médio de cada etapa do fluxo, funcionários processados e status dos lotes de Cálculo de Comissões.</p>
        </div>
        {hasPermission('processamento-comissoes') && (
          <button
            onClick={() => navigate('/folha-pagamento-daf?aba=processamento-comissoes')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-500" /> Ir para Processamento de Comissões
          </button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs">{erro}</div>
      )}

      {/* PERÍODO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-5 gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Ano</label>
            <select value={ano} onChange={e => setAno(e.target.value)} className={`${SEL} w-full`}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className={LBL}>Mês</label>
            <div className="flex items-center gap-1">
              <select value={mes} onChange={e => setMes(e.target.value)} className={`${SEL} w-full`}>
                {MESES.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
              <button type="button" onClick={() => mudarMes(-1)} title="Mês anterior"
                className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => mudarMes(1)} title="Próximo mês"
                className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setFiltrosAbertos(v => !v)}
              className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
            >
              {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Filtros Avançados
            </button>
            <button
              onClick={handleVisualizar}
              disabled={buscando}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
            >
              {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Visualizar
            </button>
          </div>
        </div>
        {filtrosAbertos && (
          <div className="grid grid-cols-5 gap-3 items-end mt-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Departamento</label>
              <select value={departamentoFiltro} onChange={e => setDepartamentoFiltro(e.target.value)} className={`${SEL} w-full`}>
                <option value="">Todos</option>
                {departamentos.filter(d => d.ativo !== false).sort((a, b) => a.nome_departamento.localeCompare(b.nome_departamento, 'pt-BR')).map(d => (
                  <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {!jaBuscou ? null : buscando ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Carregando...</div>
      ) : kpis.totalLotes === 0 && dadosTendencia.every(m => m.funcionarios === 0) ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 text-center text-slate-400 text-xs">Nenhum lote calculado ainda pra este período (nem nos últimos 6 meses).</div>
      ) : (
        <>
          {(empresaFiltro || etapaFiltro || mesSelecionadoIdx !== 5) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Filtrado por (clique de novo no gráfico pra tirar):</span>
              {mesSelecionadoIdx !== 5 && (
                <button onClick={() => setMesSelecionadoIdx(5)} className="flex items-center gap-1 text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1 hover:bg-orange-100 transition-colors">
                  Mês: {mesInfoSelecionado.label} <X className="h-3 w-3" />
                </button>
              )}
              {empresaFiltro && (
                <button onClick={() => setEmpresaFiltro(null)} className="flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors">
                  Loja: {empresaFiltroNome} <X className="h-3 w-3" />
                </button>
              )}
              {etapaFiltro && (
                <button onClick={() => setEtapaFiltro(null)} className="flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1 hover:bg-emerald-100 transition-colors">
                  Etapa: {dadosEtapas.find(d => d.chave === etapaFiltro)?.etapa} <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* CARTÕES — mês selecionado */}
          <div className="grid grid-cols-3 gap-3">
            <KpiCard
              icon={Layers} label="Lotes no Mês" valor={kpis.totalLotes} sub={mesInfoSelecionado.label}
              cor={{ bg: 'bg-slate-50', border: 'border-slate-200', icoBg: 'bg-slate-200', icoTxt: 'text-slate-600', numTxt: 'text-slate-800', labelTxt: 'text-slate-500' }}
            />
            <KpiCard
              icon={Users} label="Funcionários Processados" valor={kpis.funcionariosProcessados} sub="lotes já Processados"
              cor={{ bg: 'bg-emerald-50', border: 'border-emerald-200', icoBg: 'bg-emerald-100', icoTxt: 'text-emerald-600', numTxt: 'text-emerald-700', labelTxt: 'text-emerald-500' }}
            />
            <KpiCard
              icon={Clock3} label="Tempo Médio Total" valor={fmtDuracao(kpis.tempoMedioTotal)} sub="Calculado → Processado"
              cor={{ bg: 'bg-indigo-50', border: 'border-indigo-200', icoBg: 'bg-indigo-100', icoTxt: 'text-indigo-600', numTxt: 'text-indigo-700', labelTxt: 'text-indigo-500' }}
            />
          </div>

          {/* GRÁFICOS — mês selecionado */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Tempo Médio por Etapa</h3>
              {dadosEtapas.every(d => d.minutos == null) ? (
                <p className="text-xs text-slate-400 py-8 text-center">Sem dados suficientes (nenhum lote completou todas as etapas).</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosEtapas} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtDuracao(v / 60)} />
                    <YAxis type="category" dataKey="etapa" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={v => [fmtDuracao(v / 60), 'Tempo médio']} />
                    <Bar
                      dataKey="minutos" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}
                      onClick={d => setEtapaFiltro(prev => prev === d.chave ? null : d.chave)}
                    >
                      {dadosEtapas.map((d, i) => (
                        <Cell key={i} fill={d.cor} opacity={!etapaFiltro || d.chave === etapaFiltro ? 1 : 0.35} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Tempo Médio por Loja</h3>
              {dadosPorLoja.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Nenhum lote Processado neste mês ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosPorLoja} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtDuracao(v / 60)} />
                    <YAxis type="category" dataKey="empresa" tick={{ fontSize: 10 }} width={150} />
                    <Tooltip formatter={v => [fmtDuracao(v / 60), 'Tempo médio (Calcular → Seletiva)']} />
                    <Bar
                      dataKey="minutos" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}
                      onClick={d => setEmpresaFiltro(prev => prev === d.empresaId ? null : d.empresaId)}
                    >
                      {dadosPorLoja.map((d, i) => (
                        <Cell key={i} fill={!empresaFiltro || d.empresaId === empresaFiltro ? '#2563eb' : '#cbd5e1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Tempo de Permanência no Sistema por Usuário</h3>
              {dadosConferirPorUsuario.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Sem dados suficientes nesse período/filtro.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dadosConferirPorUsuario} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => fmtDuracao(v / 60)} />
                    <YAxis type="category" dataKey="usuario" tick={{ fontSize: 10 }} width={150} />
                    <Tooltip formatter={v => [fmtDuracao(v / 60), 'Tempo médio (Criado → Conferido)']} />
                    <Bar dataKey="minutos" radius={[0, 4, 4, 0]} fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-bold text-slate-700 mb-3">Tendência — Últimos 6 Meses</h3>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={dadosTendencia} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="qtd" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis yAxisId="min" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => fmtDuracao(v / 60)} />
                  <Tooltip content={<TooltipTendencia />} cursor={{ fill: 'rgba(148,163,184,0.15)' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar
                    yAxisId="qtd" dataKey="funcionarios" name="Funcionários Processados" radius={[4, 4, 0, 0]}
                    style={{ cursor: 'pointer' }} onClick={(_, i) => setMesSelecionadoIdx(prev => prev === i ? 5 : i)}
                  >
                    {dadosTendencia.map((_, i) => <Cell key={i} fill={i === mesSelecionadoIdx ? '#f97316' : '#2563eb'} />)}
                  </Bar>
                  <Line yAxisId="min" dataKey="minutosMedios" name="Tempo Médio Total" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* HISTÓRICO — todas as etapas, respeitando os mesmos filtros dos gráficos acima */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-bold text-slate-700 mb-3">Histórico de Etapas</h3>
            {linhasHistorico.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Nenhum evento nesse período/filtro.</p>
            ) : (
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-2">Data/Hora</th>
                      <th className="p-2">Departamento</th>
                      <th className="p-2">Etapa</th>
                      <th className="p-2">Usuário</th>
                      <th className="p-2">Loja</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {linhasHistorico.map(ev => (
                      <tr key={ev.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 whitespace-nowrap text-slate-600">{fmtDataHora(ev.data_hora)}</td>
                        <td className="p-2 whitespace-nowrap text-slate-600">{ev.departamentoNome || '—'}</td>
                        <td className="p-2 whitespace-nowrap text-slate-700 font-semibold">{ACAO_LABEL[ev.acao] || ev.acao}</td>
                        <td className="p-2 whitespace-nowrap text-slate-600">{ev.usuario || '—'}</td>
                        <td className="p-2 whitespace-nowrap text-slate-600">{ev.empresaNome}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
