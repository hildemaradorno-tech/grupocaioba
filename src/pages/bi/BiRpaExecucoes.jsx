// BI — Controle de Execuções RPA (Robert Automation).
// Fonte: SharePoint › BD › "Banco de Dados - Log RPA" (CSV Historico_Geral_Execucoes_RPA + um .txt por execução),
// lido pelo backend (/api/rpa-log), cruzado com a agenda de Documentações › Agendamento de Processos
// (rotinas ativas dos processos RPA). Todos os horários em MS.
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  Bot, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Timer, Activity, FileText, X, CalendarClock,
  ListChecks, LayoutDashboard, Bug, ArrowRight, CalendarX2,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['resumo', 'Resumo', LayoutDashboard],
  ['execucoes', 'Execuções', ListChecks],
  ['agenda', 'Agenda × Execução', CalendarClock],
  ['erros', 'Erros', Bug],
]
// Tolerâncias do cruzamento agenda × execução
const ANTECIPACAO_MIN = 10   // execução até 10 min antes do horário agendado ainda conta para ele
const JANELA_MIN = 180       // execução até 3 h depois do horário agendado conta para ele
const ESPERA_MIN = 60        // horário agendado sem log há mais de 1 h = "Não executado"

// ── Helpers ─────────────────────────────────────────────────────────────────
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()
const chaveSetor = (s) => normalizar(s).replace(/[^A-Z0-9]/g, '')
const pad = (n) => String(n).padStart(2, '0')
const isoDia = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtDia = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
const fmtDataHora = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)} ${iso.slice(11, 16)}` : '—')
const fmtHora = (iso) => (iso ? iso.slice(11, 16) : '—')
const minutosDe = (iso) => Math.round(new Date(iso).getTime() / 60000)
const fmtDuracao = (seg) => {
  if (seg == null) return '—'
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = Math.round(seg % 60)
  return h ? `${h}h ${pad(m)}m` : m ? `${m}m ${pad(s)}s` : `${s}s`
}
const diaSemana = (iso) => ((new Date(`${iso}T12:00:00`).getDay() + 6) % 7) + 1 // 1=Seg ... 7=Dom
const NOME_DIA = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '—')

const COR_STATUS = {
  Sucesso: 'bg-emerald-100 text-emerald-700',
  Erro: 'bg-red-100 text-red-700',
  'Não executado': 'bg-orange-100 text-orange-700',
  Aguardando: 'bg-slate-100 text-slate-500',
  'Fora da agenda': 'bg-violet-100 text-violet-700',
}
function Badge({ status }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${COR_STATUS[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
}

function Card({ icon: Icon, titulo, valor, sub, cor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cor}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{titulo}</p>
        <p className="text-base font-bold text-slate-900 leading-tight">{valor}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

const Th = ({ children, className = '' }) => <th className={`px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide ${className}`}>{children}</th>
const Td = ({ children, className = '', ...p }) => <td className={`px-3 py-2 text-[11px] text-slate-700 ${className}`} {...p}>{children}</td>

// ── Modal do log .txt ───────────────────────────────────────────────────────
function ModalLog({ execucao, onClose }) {
  const [texto, setTexto] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => {
    const q = new URLSearchParams({ pasta: execucao.pasta, arquivo: execucao.arquivo_log })
    fetch(`${BACKEND_URL}/api/rpa-log/arquivo?${q}`)
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`); setTexto(j.texto) })
      .catch(e => setErro(e.message))
  }, [execucao])
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{execucao.robo}</p>
            <p className="text-[11px] text-slate-500">{execucao.pasta} · {fmtDataHora(execucao.inicio)} · {fmtDuracao(execucao.duracao_seg)} · <Badge status={execucao.status} /></p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4 text-slate-500" /></button>
        </div>
        <div className="p-4 overflow-auto">
          {erro ? <p className="text-[11px] text-red-600">Não foi possível abrir o log: {erro}</p>
            : texto == null ? <p className="text-[11px] text-slate-400">Carregando log...</p>
            : <pre className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words font-mono">{texto}</pre>}
          <p className="text-[10px] text-slate-400 mt-3">Arquivo: {execucao.pasta}/{execucao.arquivo_log}</p>
        </div>
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function BiRpaExecucoes() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const hoje = isoDia(new Date())
  const seteDiasAtras = isoDia(new Date(Date.now() - 6 * 86400000))

  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [aba, setAba] = useState('resumo')
  const [ini, setIni] = useState(seteDiasAtras)
  const [fim, setFim] = useState(hoje)
  const [setor, setSetor] = useState('')
  const [robo, setRobo] = useState('')
  const [status, setStatus] = useState('')
  const [logAberto, setLogAberto] = useState(null)
  const [agora, setAgora] = useState(() => new Date())

  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try {
      const r = await fetch(`${BACKEND_URL}/api/rpa-log${refresh ? '/refresh' : ''}`, { method: refresh ? 'POST' : 'GET' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      setDados(j); setAgora(new Date())
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  const agenda = dados?.agenda || []
  const agendaPorNome = useMemo(() => new Map(agenda.map(a => [normalizar(a.nome), a])), [agenda])

  // Execuções do período, com o processo do cadastro (quando o nome do robô bate com o Agendamento de Processos)
  const execucoesPeriodo = useMemo(() => (dados?.execucoes || [])
    .filter(e => e.inicio.slice(0, 10) >= ini && e.inicio.slice(0, 10) <= fim)
    .map(e => ({ ...e, processo: agendaPorNome.get(normalizar(e.robo)) || null })), [dados, ini, fim, agendaPorNome])

  const setores = useMemo(() => {
    const m = new Map()
    ;(dados?.execucoes || []).forEach(e => m.set(chaveSetor(e.pasta), e.pasta))
    agenda.filter(a => a.horarios.length).forEach(a => { const k = chaveSetor(a.setor); if (!m.has(k)) m.set(k, a.setor) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [dados, agenda])

  // Cruzamento agenda × execução: um "slot" por horário agendado em cada dia do período (a partir do 1º dia
  // com log no CSV — antes disso o robô ainda não gravava histórico). Cada execução vai para o último horário
  // agendado do mesmo processo até ANTECIPACAO_MIN depois do seu início, se tiver começado em até JANELA_MIN.
  const { slots, foraAgenda } = useMemo(() => {
    const todas = dados?.execucoes || []
    if (!todas.length) return { slots: [], foraAgenda: [] }
    const primeiroDia = todas.reduce((m, e) => (e.inicio < m ? e.inicio : m), todas[0].inicio).slice(0, 10)
    const inicioCalc = ini > primeiroDia ? ini : primeiroDia
    const agoraMin = Math.round(agora.getTime() / 60000)
    const slots = []
    const usadas = new Set()
    for (let d = new Date(`${inicioCalc}T12:00:00`); isoDia(d) <= fim; d = new Date(d.getTime() + 86400000)) {
      const dia = isoDia(d)
      const ds = diaSemana(dia)
      for (const p of agenda) {
        if (!p.ativo) continue
        const horas = [...new Set(p.horarios.filter(h => h.dia_semana === ds).map(h => h.hora))].sort()
        if (!horas.length) continue
        const nomeN = normalizar(p.nome)
        const execsDia = todas.filter(e => e.inicio.slice(0, 10) === dia && normalizar(e.robo) === nomeN).sort((a, b) => a.inicio.localeCompare(b.inicio))
        const meus = horas.map(h => ({ dia, hora: h, processo: p, execs: [] }))
        for (const e of execsDia) {
          const em = minutosDe(e.inicio)
          const alvo = [...meus].reverse().find(s => minutosDe(`${dia}T${s.hora}:00`) <= em + ANTECIPACAO_MIN)
          if (alvo && em - minutosDe(`${dia}T${alvo.hora}:00`) <= JANELA_MIN) { alvo.execs.push(e); usadas.add(e) }
        }
        for (const s of meus) {
          const slotMin = minutosDe(`${dia}T${s.hora}:00`)
          const ok = s.execs.find(e => e.status === 'Sucesso')
          const ultima = s.execs[s.execs.length - 1]
          s.status = ok ? 'Sucesso' : ultima ? 'Erro' : agoraMin > slotMin + ESPERA_MIN ? 'Não executado' : 'Aguardando'
          s.execucao = ok || ultima || null
          s.atrasoMin = s.execs[0] ? minutosDe(s.execs[0].inicio) - slotMin : null
          slots.push(s)
        }
      }
    }
    const foraAgenda = execucoesPeriodo.filter(e => !usadas.has(todas.find(t => t.inicio === e.inicio && t.robo === e.robo)))
    slots.sort((a, b) => (b.dia + b.hora).localeCompare(a.dia + a.hora))
    return { slots, foraAgenda }
  }, [dados, agenda, ini, fim, agora, execucoesPeriodo])

  // Filtros (setor / robô / status) aplicados a execuções, slots e erros
  const passaSetor = (pasta, setorCad) => !setor || chaveSetor(pasta || setorCad) === setor
  const passaRobo = (nome) => !robo || normalizar(nome) === robo
  const execs = execucoesPeriodo.filter(e => passaSetor(e.pasta, e.processo?.setor) && passaRobo(e.robo) && (!status || e.status === status || (status === 'Fora da agenda' && foraAgenda.includes(e))))
  const slotsF = slots.filter(s => passaSetor(s.execucao?.pasta, s.processo.setor) && passaRobo(s.processo.nome) && (!status || s.status === status))
  const foraF = foraAgenda.filter(e => passaSetor(e.pasta) && passaRobo(e.robo))

  const robos = useMemo(() => {
    const m = new Map()
    ;(dados?.execucoes || []).forEach(e => m.set(normalizar(e.robo), e.robo))
    agenda.filter(a => a.horarios.length).forEach(a => { const k = normalizar(a.nome); if (!m.has(k)) m.set(k, a.nome) })
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [dados, agenda])

  // Robôs do log que não existem no cadastro do Agendamento de Processos (nome diferente ou processo não cadastrado)
  const semCadastro = useMemo(() => [...new Set((dados?.execucoes || []).filter(e => !agendaPorNome.has(normalizar(e.robo))).map(e => e.robo))], [dados, agendaPorNome])

  // ── Indicadores ──
  const total = execs.length
  const nSucesso = execs.filter(e => e.status === 'Sucesso').length
  const nErro = execs.filter(e => e.status === 'Erro').length
  const nNaoExec = slotsF.filter(s => s.status === 'Não executado').length
  const nAgendados = slotsF.filter(s => s.status !== 'Aguardando').length
  const nCumpridos = slotsF.filter(s => s.status === 'Sucesso').length
  const tempoTotal = execs.reduce((s, e) => s + (e.duracao_seg || 0), 0)

  const porDia = useMemo(() => {
    const m = new Map()
    for (let d = new Date(`${ini}T12:00:00`); isoDia(d) <= fim; d = new Date(d.getTime() + 86400000)) m.set(isoDia(d), { dia: fmtDia(isoDia(d)), Sucesso: 0, Erro: 0, 'Não executado': 0 })
    execs.forEach(e => { const r = m.get(e.inicio.slice(0, 10)); if (r) r[e.status === 'Sucesso' ? 'Sucesso' : 'Erro']++ })
    slotsF.forEach(s => { if (s.status === 'Não executado') { const r = m.get(s.dia); if (r) r['Não executado']++ } })
    return [...m.values()]
  }, [execs, slotsF, ini, fim])

  const porRobo = useMemo(() => {
    const m = new Map()
    const linha = (nome, setorNome, processo) => {
      const k = normalizar(nome)
      if (!m.has(k)) m.set(k, { nome, setor: setorNome, processo, execs: [], naoExec: 0, slots: 0 })
      return m.get(k)
    }
    execs.forEach(e => linha(e.robo, e.pasta, e.processo).execs.push(e))
    slotsF.forEach(s => { if (s.status === 'Aguardando') return; const l = linha(s.processo.nome, s.processo.setor, s.processo); l.slots++; if (s.status === 'Não executado') l.naoExec++ })
    return [...m.values()].map(l => {
      const ord = [...l.execs].sort((a, b) => b.inicio.localeCompare(a.inicio))
      const suc = l.execs.filter(e => e.status === 'Sucesso').length
      return { ...l, ultima: ord[0] || null, suc, err: l.execs.length - suc, media: l.execs.length ? l.execs.reduce((s, e) => s + e.duracao_seg, 0) / l.execs.length : null }
    }).sort((a, b) => (b.ultima?.status === 'Erro') - (a.ultima?.status === 'Erro') || b.naoExec - a.naoExec || b.err - a.err || a.nome.localeCompare(b.nome))
  }, [execs, slotsF])

  const erros = useMemo(() => {
    const m = new Map()
    execs.filter(e => e.status === 'Erro').forEach(e => {
      const k = `${normalizar(e.robo)}|${e.acao_erro || e.erro || ''}`
      if (!m.has(k)) m.set(k, { robo: e.robo, pasta: e.pasta, acao: e.acao_erro, processo: e.processo, ocorrencias: [] })
      m.get(k).ocorrencias.push(e)
    })
    return [...m.values()].map(g => ({ ...g, ultima: g.ocorrencias.reduce((a, b) => (b.inicio > a.inicio ? b : a)) }))
      .sort((a, b) => b.ultima.inicio.localeCompare(a.ultima.inicio))
  }, [execs])

  const relatoriosAfetados = useMemo(() => {
    const s = new Set()
    porRobo.forEach(l => { if ((l.ultima?.status === 'Erro' || l.naoExec) && l.processo) l.processo.relatorios_dependentes.forEach(r => s.add(r)) })
    return [...s]
  }, [porRobo])

  const podeAgenda = hasPermission('rpa/agendamentos')
  const sel = 'border border-slate-200 rounded-md px-2 py-1 text-[11px] bg-white text-slate-700'

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Controle de Execuções RPA</h1>
            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Robert Automation — log de execuções (horário de MS)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[10px] text-slate-500 leading-tight text-right">
            Log no SharePoint: <strong className="text-slate-700">{dados?.arquivo_atualizado_em ? new Date(dados.arquivo_atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong><br />
            Lido em: <strong className="text-slate-700">{carregando ? '...' : dados?.lido_em ? new Date(dados.lido_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</strong>
          </p>
          <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Atualizar dados" aria-label="Atualizar dados"
            className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
          {podeAgenda && (
            <button type="button" onClick={() => navigate('/rpa/agendamentos')}
              className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50">
              Ir para Agendamento de Processos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
        <label className="text-[11px] text-slate-500">De</label>
        <input type="date" value={ini} max={fim} onChange={e => e.target.value && setIni(e.target.value)} className={sel} />
        <label className="text-[11px] text-slate-500">até</label>
        <input type="date" value={fim} min={ini} onChange={e => e.target.value && setFim(e.target.value)} className={sel} />
        <select value={setor} onChange={e => setSetor(e.target.value)} className={sel}>
          <option value="">Todos os setores</option>
          {setores.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <select value={robo} onChange={e => setRobo(e.target.value)} className={`${sel} max-w-xs`}>
          <option value="">Todos os robôs</option>
          {robos.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className={sel}>
          <option value="">Todos os status</option>
          {['Sucesso', 'Erro', 'Não executado', 'Aguardando', 'Fora da agenda'].map(s => <option key={s}>{s}</option>)}
        </select>
        {(setor || robo || status) && (
          <button onClick={() => { setSetor(''); setRobo(''); setStatus('') }} className="text-[11px] text-slate-500 hover:text-slate-700 underline">Limpar filtros</button>
        )}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Não foi possível ler o log do SharePoint: {erro}
        </div>
      )}

      {semCadastro.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-3.5 w-3.5" /> Robôs do log sem cadastro no Agendamento de Processos ({semCadastro.length})</p>
          <p className="mt-1">O nome do robô no log precisa ser igual ao nome do processo (maiúsculas e acentos não importam) para entrar na comparação com a agenda:</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {semCadastro.map(n => <span key={n} className="px-2 py-0.5 rounded-full bg-white border border-amber-200">{n}</span>)}
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map(([k, n, Icon]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px ${aba === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="h-3.5 w-3.5" /> {n}
            {k === 'erros' && erros.length > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-red-100 text-red-700 text-[10px]">{erros.length}</span>}
          </button>
        ))}
      </div>

      {carregando && !dados ? <p className="text-[11px] text-slate-400">Carregando log do SharePoint...</p> : (
        <>
          {aba === 'resumo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <Card icon={Activity} titulo="Execuções" valor={total} cor="bg-indigo-50 text-indigo-600" />
                <Card icon={CheckCircle2} titulo="Sucesso" valor={nSucesso} sub={pct(nSucesso, total)} cor="bg-emerald-50 text-emerald-600" />
                <Card icon={XCircle} titulo="Erro" valor={nErro} sub={pct(nErro, total)} cor="bg-red-50 text-red-600" />
                <Card icon={CalendarX2} titulo="Não executados" valor={nNaoExec} sub="agendados sem log" cor="bg-orange-50 text-orange-600" />
                <Card icon={CalendarClock} titulo="Agenda cumprida" valor={pct(nCumpridos, nAgendados)} sub={`${nCumpridos} de ${nAgendados} horários`} cor="bg-sky-50 text-sky-600" />
                <Card icon={Timer} titulo="Duração média" valor={fmtDuracao(total ? tempoTotal / total : null)} cor="bg-slate-100 text-slate-600" />
                <Card icon={Clock} titulo="Tempo total de robô" valor={fmtDuracao(tempoTotal)} cor="bg-slate-100 text-slate-600" />
              </div>

              {relatoriosAfetados.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-800">
                  <p className="font-semibold">Relatórios que podem estar desatualizados</p>
                  <p className="mt-0.5">O RPA que alimenta estes relatórios terminou com erro na última execução ou deixou de rodar no período: {relatoriosAfetados.join(' · ')}</p>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">Execuções por dia</p>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={porDia} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Sucesso" stackId="a" fill="#10b981" />
                      <Bar dataKey="Erro" stackId="a" fill="#ef4444" />
                      <Bar dataKey="Não executado" stackId="a" fill="#f97316" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide px-3 pt-3">Situação por robô</p>
                <table className="w-full mt-2">
                  <thead className="bg-slate-50 border-y border-slate-200"><tr>
                    <Th>Robô</Th><Th>Setor</Th><Th>Última execução</Th><Th className="text-right">Execuções</Th><Th className="text-right">Sucesso</Th>
                    <Th className="text-right">Erro</Th><Th className="text-right">Não executados</Th><Th className="text-right">Duração média</Th><Th>Relatórios dependentes</Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {porRobo.map(l => (
                      <tr key={l.nome} className="hover:bg-slate-50">
                        <Td className="font-semibold text-slate-800">{l.nome}{!l.processo && <span className="ml-1 text-[10px] text-amber-600" title="Sem cadastro no Agendamento de Processos">(sem cadastro)</span>}</Td>
                        <Td>{l.setor}</Td>
                        <Td>{l.ultima ? <span className="flex items-center gap-1.5"><Badge status={l.ultima.status} /> {fmtDataHora(l.ultima.inicio)}</span> : '—'}</Td>
                        <Td className="text-right">{l.execs.length}</Td>
                        <Td className="text-right text-emerald-700">{l.suc}</Td>
                        <Td className="text-right text-red-600">{l.err || ''}</Td>
                        <Td className="text-right text-orange-600">{l.naoExec || ''}</Td>
                        <Td className="text-right">{fmtDuracao(l.media)}</Td>
                        <Td className="max-w-xs truncate" title={l.processo?.relatorios_dependentes.join('\n')}>{l.processo?.relatorios_dependentes.join(' · ') || '—'}</Td>
                      </tr>
                    ))}
                    {!porRobo.length && <tr><Td colSpan={9} className="text-center text-slate-400">Nenhuma execução no período.</Td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {aba === 'execucoes' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr>
                  <Th>Início</Th><Th>Fim</Th><Th className="text-right">Duração</Th><Th>Robô</Th><Th>Setor</Th><Th>Status</Th><Th>Erro</Th><Th></Th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {execs.map(e => (
                    <tr key={e.inicio + e.robo} className="hover:bg-slate-50">
                      <Td className="whitespace-nowrap">{fmtDataHora(e.inicio)}</Td>
                      <Td className="whitespace-nowrap">{fmtHora(e.fim)}</Td>
                      <Td className="text-right whitespace-nowrap">{fmtDuracao(e.duracao_seg)}</Td>
                      <Td className="font-semibold text-slate-800">{e.robo}</Td>
                      <Td>{e.pasta}</Td>
                      <Td><span className="flex gap-1"><Badge status={e.status} />{foraAgenda.includes(e) && <Badge status="Fora da agenda" />}</span></Td>
                      <Td className="max-w-md truncate text-red-600" title={e.erro || ''}>{e.erro || ''}</Td>
                      <Td>{e.arquivo_log && (
                        <button onClick={() => setLogAberto(e)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>
                      )}</Td>
                    </tr>
                  ))}
                  {!execs.length && <tr><Td colSpan={8} className="text-center text-slate-400">Nenhuma execução no período.</Td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {aba === 'agenda' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Cada linha é um horário agendado em Agendamento de Processos. A execução conta para o horário quando começa entre {ANTECIPACAO_MIN} min antes e {JANELA_MIN / 60} h depois dele; sem log depois de {ESPERA_MIN} min, o horário fica como <strong>Não executado</strong>. O cruzamento começa no primeiro dia que existe no log.
              </p>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200"><tr>
                    <Th>Dia</Th><Th>Agendado</Th><Th>Processo</Th><Th>Setor</Th><Th>Status</Th><Th>Início real</Th><Th className="text-right">Atraso</Th><Th className="text-right">Tentativas</Th><Th></Th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {slotsF.map(s => (
                      <tr key={s.dia + s.hora + s.processo.id} className="hover:bg-slate-50">
                        <Td className="whitespace-nowrap">{fmtDia(s.dia)} {NOME_DIA[diaSemana(s.dia)]}</Td>
                        <Td>{s.hora}</Td>
                        <Td className="font-semibold text-slate-800">{s.processo.nome}</Td>
                        <Td>{s.processo.setor}</Td>
                        <Td><Badge status={s.status} /></Td>
                        <Td>{s.execs[0] ? fmtHora(s.execs[0].inicio) : '—'}</Td>
                        <Td className={`text-right ${s.atrasoMin > 15 ? 'text-orange-600 font-semibold' : ''}`}>{s.atrasoMin == null ? '' : `${s.atrasoMin} min`}</Td>
                        <Td className="text-right">{s.execs.length || ''}</Td>
                        <Td>{s.execucao?.arquivo_log && (
                          <button onClick={() => setLogAberto(s.execucao)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>
                        )}</Td>
                      </tr>
                    ))}
                    {!slotsF.length && <tr><Td colSpan={9} className="text-center text-slate-400">Nenhum horário agendado no período.</Td></tr>}
                  </tbody>
                </table>
              </div>
              {foraF.length > 0 && (!status || status === 'Fora da agenda') && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                  <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide px-3 pt-3">Execuções fora da agenda ({foraF.length})</p>
                  <p className="text-[11px] text-slate-400 px-3">Rodaram sem horário agendado correspondente: execução manual, reprocessamento ou robô sem cadastro.</p>
                  <table className="w-full mt-2">
                    <thead className="bg-slate-50 border-y border-slate-200"><tr><Th>Início</Th><Th>Robô</Th><Th>Setor</Th><Th>Status</Th><Th className="text-right">Duração</Th><Th></Th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {foraF.map(e => (
                        <tr key={e.inicio + e.robo}>
                          <Td className="whitespace-nowrap">{fmtDataHora(e.inicio)}</Td>
                          <Td className="font-semibold text-slate-800">{e.robo}</Td>
                          <Td>{e.pasta}</Td>
                          <Td><Badge status={e.status} /></Td>
                          <Td className="text-right">{fmtDuracao(e.duracao_seg)}</Td>
                          <Td>{e.arquivo_log && <button onClick={() => setLogAberto(e)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {aba === 'erros' && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200"><tr>
                  <Th>Robô</Th><Th>Setor</Th><Th>Ação que falhou</Th><Th className="text-right">Ocorrências</Th><Th>Última</Th><Th>Mensagem</Th><Th>Relatórios afetados</Th><Th></Th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {erros.map(g => (
                    <tr key={g.robo + g.acao} className="hover:bg-slate-50 align-top">
                      <Td className="font-semibold text-slate-800">{g.robo}</Td>
                      <Td>{g.pasta}</Td>
                      <Td><code className="bg-slate-100 px-1 py-0.5 rounded text-[10px]">{g.acao || '—'}</code></Td>
                      <Td className="text-right font-semibold text-red-600">{g.ocorrencias.length}</Td>
                      <Td className="whitespace-nowrap">{fmtDataHora(g.ultima.inicio)}</Td>
                      <Td className="max-w-md"><p className="line-clamp-3 break-words" title={g.ultima.erro}>{g.ultima.erro}</p></Td>
                      <Td className="max-w-xs">{g.processo?.relatorios_dependentes.join(' · ') || '—'}</Td>
                      <Td>{g.ultima.arquivo_log && <button onClick={() => setLogAberto(g.ultima)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"><FileText className="h-3.5 w-3.5" /> Ver log</button>}</Td>
                    </tr>
                  ))}
                  {!erros.length && <tr><Td colSpan={8} className="text-center text-slate-400">Nenhum erro no período.</Td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {logAberto && <ModalLog execucao={logAberto} onClose={() => setLogAberto(null)} />}
    </div>
  )
}
