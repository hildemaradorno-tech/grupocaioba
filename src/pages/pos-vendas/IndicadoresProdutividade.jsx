import React, { Fragment, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, Calendar, CalendarDays, ChevronDown, ChevronRight, Download, ExternalLink, Gauge, History, Info, RefreshCw, Search, Settings, Target, User, Wrench, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import logoCaioba from '../../assets/logo-grupo.png'
import {
  INDICADORES, VISUALIZACOES, somar, indicadores, corKpi, corFaixa, limitesDe, coresArcos, semAcento, fmtH, fmtPct, fmtR$,
} from './produtividadeCalculos'
import RegrasCoresModal from './RegrasCoresModal'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const PERM = 'pos-vendas/produtividade'
const ABAS = [
  { id: 'principais', label: 'Resumo', icon: Gauge },
  { id: 'mecanicos', label: 'Mecânicos', icon: Wrench },
  { id: 'consultores', label: 'Consultores', icon: User },
  // Dia e Mensal unificados (pedido do usuário): botões Dia | Mês dentro da aba.
  { id: 'diames', label: 'Período', icon: CalendarDays },
]
const SEM_BOX = '(Em branco)'
// Nomes que não são pessoas (mesma regra do backend): "Produtivo Não Associado" (Dealer.net) e "Sem Técnico" (MicroWork).
const NAO_PESSOA = /produtivo\s+n[aã]o\s+associado|^\s*sem\s+t[eé]cnico\s*$/i
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '')
// 'AAAA-MM-DD' → 'segunda-feira' (data local, sem fuso).
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
const diaSemana = (s) => (s ? DIAS_SEMANA[new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))).getDay()] : '')
// Período padrão: do dia 1 do mês atual até ontem (no dia 1, o mês anterior inteiro).
function periodoPadrao() {
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
  return { ini: iso(new Date(ontem.getFullYear(), ontem.getMonth(), 1)), fim: iso(ontem) }
}
function mesesEntre(ini, fim) {
  const out = []
  let a = Number(ini.slice(0, 4)), m = Number(ini.slice(5, 7))
  const af = Number(fim.slice(0, 4)), mf = Number(fim.slice(5, 7))
  while (a < af || (a === af && m <= mf)) { out.push({ ano: a, mes: m }); m++; if (m > 12) { m = 1; a++ } }
  return out
}
const marcaDaEmpresa = (nome) => (/MOTOS/i.test(nome) ? 'MOTOS' : /TRUCKS/i.test(nome) ? 'TRUCKS' : '')

async function lerTudo(consulta) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta().range(de, de + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// Regras de cores do mês da data final do período ({ eficiencia, eficacia, produtividade } → regra ou null = padrão).
const RegrasCorCtx = createContext({})

// ── Componentes visuais ─────────────────────────────────────────────────────
function Bolinha({ cor }) {
  if (!cor) return null
  const c = { verde: 'bg-emerald-500', amarelo: 'bg-amber-400', vermelho: 'bg-red-600' }[cor]
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c}`} />
}

// Ícone ⓘ com balão ao passar o mouse: de onde vem o número e a fórmula.
function InfoFormula({ children, alinhar = 'left' }) {
  return (
    <span className="relative group inline-flex align-middle normal-case tracking-normal font-normal">
      <Info className="h-3.5 w-3.5 text-slate-400 hover:text-sky-600 cursor-help" aria-label="De onde vem" />
      <span className={`pointer-events-none absolute top-5 ${alinhar === 'right' ? 'right-0' : 'left-0'} z-30 w-80 hidden group-hover:block
        bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-[11px] text-slate-700 leading-snug`}>
        {children}
      </span>
    </span>
  )
}

function Card({ titulo, valor, info, alinhar }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">{titulo}{info && <InfoFormula alinhar={alinhar}>{info}</InfoFormula>}</p>
      <p className="text-base font-bold text-slate-900 tabular-nums mt-1">{valor || '—'}</p>
    </div>
  )
}

// Velocímetro 0–150% com as faixas do indicador (vermelho / verde / amarelo).
function Velocimetro({ titulo, valor, id, info, alinhar }) {
  const MAX = 1.5
  const rc = useContext(RegrasCorCtx)
  const [r2, r3] = limitesDe(id, rc[id])
  const [c1, c2, c3] = coresArcos(rc[id])
  const ang = (v) => Math.PI * (1 - Math.min(Math.max(v, 0), MAX) / MAX)
  const pt = (v, r) => [100 + r * Math.cos(ang(v)), 100 - r * Math.sin(ang(v))]
  const arco = (de, ate, cor) => {
    const [x1, y1] = pt(de, 80), [x2, y2] = pt(ate, 80)
    return <path d={`M ${x1} ${y1} A 80 80 0 0 1 ${x2} ${y2}`} stroke={cor} strokeWidth="22" fill="none" />
  }
  const [px, py] = pt(valor ?? 0, 62)
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex flex-col">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">{titulo}{info && <InfoFormula alinhar={alinhar}>{info}</InfoFormula>}</p>
      <svg viewBox="-16 -12 232 132" className="w-full max-w-[270px] mx-auto mt-3" role="img" aria-label={`${titulo}: ${fmtPct(valor)}`}>
        {arco(0, r2, c1)}{arco(r2, r3, c2)}{arco(r3, MAX, c3)}
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4].map(v => {
          const [tx, ty] = pt(v, 100)
          return <text key={v} x={tx} y={ty} fontSize="7" textAnchor="middle" fill="#64748b">{Math.round(v * 100)}%</text>
        })}
        {valor != null && <line x1="100" y1="100" x2={px} y2={py} stroke="#334155" strokeWidth="3" strokeLinecap="round" />}
        <circle cx="100" cy="100" r="6" fill="#334155" />
      </svg>
      <p className="text-base font-bold text-slate-900 tabular-nums text-center -mt-1">{valor == null ? '—' : fmtPct(valor)}</p>
    </div>
  )
}

// Balão dos gráficos: mostra o percentual e as horas usadas na conta (numerador ÷ denominador).
const PARTES = {
  eficiencia: ['vend', 'gasto', 'Hr. Gastas'],
  eficacia: ['vend', 'reais', 'Hr. Disp. Reais'],
  produtividade: ['gasto', 'reais', 'Hr. Disp. Reais'],
}
const NOME_IND = { eficiencia: 'Eficiência', eficacia: 'Eficácia', produtividade: 'Produtividade' }
function TooltipCalculo({ active, payload, label, id, vis, semConta }) {
  if (!active || !payload?.length) return null
  const i = payload[0].payload?.i
  if (!i) return null
  const [num, den, rotDen] = PARTES[id]
  const rotVend = vis === 'aplic' ? 'Hr. Aplicadas' : 'Hr. Vendidas'
  const rotNum = num === 'vend' ? rotVend : 'Hr. Gastas'
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-[11px] text-slate-700">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      <p><strong>{NOME_IND[id]}: {fmtPct(i[id]) || '—'}</strong></p>
      <p className="mt-1">{rotNum}: <strong>{fmtH(i[num]) || '—'}</strong></p>
      <p>{rotDen}: <strong>{fmtH(i[den]) || '—'}</strong></p>
      {!semConta && <p className="text-slate-500 mt-1">{fmtH(i[num]) || '0'} ÷ {fmtH(i[den]) || '0'}</p>}
    </div>
  )
}

function BarrasPorBox({ titulo, dados, id, vis, info, alinhar }) {
  const rc = useContext(RegrasCorCtx)
  const [r2, r3] = limitesDe(id, rc[id])
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">{titulo}{info && <InfoFormula alinhar={alinhar}>{info}</InfoFormula>}</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dados} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="box" tick={{ fontSize: 10 }} interval={0} />
          <YAxis hide domain={[0, (max) => Math.max(max, r3 * 1.1)]} />
          <ReferenceLine y={r2} stroke="#64748b" strokeDasharray="4 3" label={{ value: fmtPct(r2), position: 'insideTopLeft', fontSize: 9 }} />
          <ReferenceLine y={r3} stroke="#64748b" strokeDasharray="4 3" label={{ value: fmtPct(r3), position: 'insideTopLeft', fontSize: 9 }} />
          <Tooltip content={<TooltipCalculo id={id} vis={vis} />} />
          <Bar dataKey={id}>
            {dados.map((d) => <Cell key={d.box} fill={corFaixa(d[id], id, rc[id])} />)}
            <LabelList dataKey={id} position="top" formatter={(v) => fmtPct(v)} style={{ fontSize: 10 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function Seletor({ label, value, onChange, opcoes, largura = 'w-64', disabled = false, title }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} title={title}
        className={`${largura} border border-slate-300 rounded-md px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed`}>
        {opcoes.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// Multisseleção de empresas (mesmo modelo do BI Planos de Manutenção): marcar o agrupamento
// (Caiobá Trucks / Caiobá Motos) marca/desmarca todas as filiais dele; cada filial também pode ser
// marcada sozinha. Nada marcado = Todos.
function SeletorEmpresas({ grupos, selecionadas, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const alternar = (nomes, marcar) => {
    const set = new Set(selecionadas)
    nomes.forEach(n => (marcar ? set.add(n) : set.delete(n)))
    onChange([...set])
  }
  // Resumo: "Todos", o nome do agrupamento quando ele está inteiro e sozinho, a filial, ou "N empresas".
  const grupoInteiro = grupos.find(([, l]) => l.length === selecionadas.length && l.every(n => selecionadas.includes(n)))
  const resumo = selecionadas.length === 0 ? 'Todos'
    : grupoInteiro ? grupoInteiro[0]
    : selecionadas.length === 1 ? selecionadas[0]
    : `${selecionadas.length} empresas`
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
        className="h-9 w-full text-[11px] px-2 rounded-md bg-white border border-slate-300 text-slate-900 flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-[11px] text-slate-800 max-h-[360px] overflow-y-auto whitespace-nowrap">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionadas.length === 0 ? 'text-indigo-700' : ''}`}>
              Todos
            </button>
            {grupos.map(([nome, lista]) => {
              const qtd = lista.filter(n => selecionadas.includes(n)).length
              return (
                <div key={nome} className="border-t border-slate-100 mt-1 pt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-bold uppercase text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-indigo-600"
                      checked={qtd === lista.length}
                      ref={el => { if (el) el.indeterminate = qtd > 0 && qtd < lista.length }}
                      onChange={ev => alternar(lista, ev.target.checked)} />
                    {nome}
                  </label>
                  {lista.map(n => (
                    <label key={n} className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-indigo-600" checked={selecionadas.includes(n)} onChange={ev => alternar([n], ev.target.checked)} />
                      {n}
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

// ── Página ──────────────────────────────────────────────────────────────────
export default function IndicadoresProdutividade() {
  const { hasAction, user } = useAuth()
  const podeAtualizar = hasAction(PERM, 'atualizar')
  const podeRegras = hasAction(PERM, 'regras_cores')
  const [regrasCor, setRegrasCor] = useState([]) // pv_prod_regras_cor (todos os anos)
  const [abrirRegras, setAbrirRegras] = useState(false)

  // ?aba=consultores (ex.: botão de origem da Matriz KPIs) abre direto nessa aba.
  const [aba, setAba] = useState(() => {
    const pedida = new URLSearchParams(window.location.search).get('aba')
    return ['principais', 'mecanicos', 'consultores', 'diames'].includes(pedida) ? pedida : 'principais'
  })
  const [modoResumo, setModoResumo] = useState('mecanico') // Resumo: Mecânicos | Consultores
  const [slotBuscaOs, setSlotBuscaOs] = useState(null) // espaço ao lado do Tipo de Visualização (busca por O.S. da aba Mecânicos)
  const [periodo, setPeriodo] = useState(periodoPadrao)
  const [empresasSel, setEmpresasSel] = useState([]) // nomes das filiais; vazio = Todos
  const [vis, setVis] = useState('enc')

  const [diario, setDiario] = useState([])
  const [mensal, setMensal] = useState([])
  const [metas, setMetas] = useState([])
  const [pendentes, setPendentes] = useState([]) // metas do planejamento ainda não aprovadas (quadro da meta)
  // Pessoas fora do BI: setor Funilaria/Pintura (cadastro de Funcionários ou Planejamento de Metas) — vem do backend.
  const [excluidos, setExcluidos] = useState(() => new Set())
  // Box do cadastro de Funcionários (nome sem acento → Box), usado quando não há meta aprovada no período.
  const [boxCadastro, setBoxCadastro] = useState(() => new Map())
  // Box das metas aprovadas de todos os meses (nome sem acento → [{ ano, mes, box }]).
  const [boxMetas, setBoxMetas] = useState(() => new Map())
  const [syncs, setSyncs] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [atualizando, setAtualizando] = useState(null) // texto de progresso

  const periodoOk = periodo.ini && periodo.fim && periodo.ini <= periodo.fim
  const meses = useMemo(() => (periodoOk ? mesesEntre(periodo.ini, periodo.fim) : []), [periodo, periodoOk])

  const carregar = useCallback(async () => {
    if (!periodoOk) return
    setCarregando(true); setErro('')
    try {
      const anos = [...new Set([...meses.map(m => m.ano), Number(periodo.fim.slice(0, 4))])]
      const [d, m, mt, sy] = await Promise.all([
        lerTudo(() => supabase.from('vw_pv_prod_diario').select('*').gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('empresa').order('papel').order('pessoa')),
        lerTudo(() => supabase.from('vw_pv_prod_mensal').select('*').gte('mes', periodo.fim.slice(0, 4) + '-01-01').lte('mes', periodo.fim).order('mes').order('empresa').order('papel').order('pessoa')),
        fetch(`${BACKEND_URL}/api/produtividade/metas?anos=${anos.join(',')}`).then(async r => {
          if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Metas: erro ${r.status}`)
          return r.json()
        }),
        supabase.from('pv_prod_sync').select('*').then(r => { if (r.error) throw r.error; return r.data || [] }),
      ])
      const fora = new Set((mt.excluidos || []).map(semAcento))
      const dentro = (r) => !fora.has(semAcento(r.pessoa)) && !NAO_PESSOA.test(r.pessoa || '')
      setExcluidos(fora)
      setBoxCadastro(new Map((mt.boxCadastro || []).map(b => [semAcento(b.pessoa), b.box])))
      const bm = new Map()
      for (const b of mt.boxMetas || []) { const k = semAcento(b.pessoa); if (!bm.has(k)) bm.set(k, []); bm.get(k).push(b) }
      setBoxMetas(bm)
      setDiario(d.filter(dentro)); setMensal(m.filter(dentro)); setMetas((mt.metas || []).filter(dentro)); setPendentes((mt.pendentes || []).filter(dentro)); setSyncs(sy)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setCarregando(false)
    }
  }, [periodo, periodoOk, meses])

  useEffect(() => { carregar() }, [carregar])

  // Regras de cores: valem as do mês da data final do período (mês sem regra = faixas padrão).
  const carregarRegras = useCallback(async () => {
    const { data, error } = await supabase.from('pv_prod_regras_cor').select('*')
    if (!error) setRegrasCor(data || [])
  }, [])
  useEffect(() => { carregarRegras() }, [carregarRegras])
  const regraDoPeriodo = useMemo(() => {
    const a = Number(periodo.fim?.slice(0, 4)), m = Number(periodo.fim?.slice(5, 7))
    const out = {}
    for (const r of regrasCor) if (r.ano === a && r.mes === m) {
      out[r.indicador] = { inf: Number(r.limite_inf), sup: Number(r.limite_sup), abaixo: r.cor_abaixo, meio: r.cor_meio, acima: r.cor_acima }
    }
    return out
  }, [regrasCor, periodo.fim])

  // Relê os relatórios mês a mês (cada chamada lê Trucks e Motos de 1 mês).
  const atualizar = async () => {
    if (!periodoOk || atualizando) return
    setErro('')
    const falhas = []
    for (let i = 0; i < meses.length; i++) {
      const { ano, mes } = meses[i]
      setAtualizando(`Lendo ${MESES[mes - 1]}/${ano} (${i + 1} de ${meses.length})…`)
      try {
        const r = await fetch(`${BACKEND_URL}/api/produtividade/atualizar`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ano, mes }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.error || `erro ${r.status}`)
        for (const marca of ['TRUCKS', 'MOTOS']) if (j[marca] && !j[marca].ok) falhas.push(`${MESES[mes - 1]}/${ano} ${marca}: ${j[marca].erro}`)
      } catch (e) {
        falhas.push(`${MESES[mes - 1]}/${ano}: ${e.message}`)
      }
    }
    setAtualizando(null)
    if (falhas.length) setErro(`Não atualizou: ${falhas.join(' · ')}`)
    carregar()
  }

  // ── Escopo de empresa ─────────────────────────────────────────────────────
  // Filiais presentes nos dados e nas metas, agrupadas em Caiobá Trucks / Caiobá Motos.
  const gruposEmpresa = useMemo(() => {
    const marcaDe = new Map()
    for (const r of diario) if (r.empresa) marcaDe.set(r.empresa, r.marca)
    for (const m of metas) if (m.empresa && !marcaDe.has(m.empresa)) marcaDe.set(m.empresa, marcaDaEmpresa(m.empresa))
    const g = { 'Caiobá Trucks': [], 'Caiobá Motos': [], Outras: [] }
    for (const [e, marca] of marcaDe) g[marca === 'TRUCKS' ? 'Caiobá Trucks' : marca === 'MOTOS' ? 'Caiobá Motos' : 'Outras'].push(e)
    return Object.entries(g).filter(([, l]) => l.length).map(([n, l]) => [n, l.sort((a, b) => a.localeCompare(b, 'pt-BR'))])
  }, [diario, metas])
  // ?empresa=CAMPO GRANDE (ou TRUCKS = todas as Trucks) — link de origem da Matriz KPIs: abre com a empresa do
  // quadro marcada (uma vez, quando a lista de empresas chega).
  const empresaDoLink = useRef(new URLSearchParams(window.location.search).get('empresa'))
  useEffect(() => {
    const alvo = empresaDoLink.current
    if (!alvo || !gruposEmpresa.length) return
    const n = (s) => semAcento(s).replace(/ DO SUL$/, '')
    const todas = gruposEmpresa.flatMap(([, l]) => l)
    const sel = todas.filter(e => n(e).includes('TRUCKS') && (n(alvo) === 'TRUCKS' || n(e).includes(n(alvo))))
    if (sel.length) setEmpresasSel(sel)
    empresaDoLink.current = null
  }, [gruposEmpresa])
  const noEscopo = useCallback((empresa) => empresasSel.length === 0 || empresasSel.includes(empresa), [empresasSel])

  const diarioEsc = useMemo(() => diario.filter(r => noEscopo(r.empresa, r.marca)), [diario, noEscopo])
  const mensalEsc = useMemo(() => mensal.filter(r => noEscopo(r.empresa, r.marca)), [mensal, noEscopo])
  // Metas só dos meses do período.
  const metasEsc = useMemo(() => {
    const ok = new Set(meses.map(m => `${m.ano}-${m.mes}`))
    return metas.filter(m => ok.has(`${m.ano}-${m.mes}`) && noEscopo(m.empresa))
  }, [metas, meses, noEscopo])
  const pendentesEsc = useMemo(() => {
    const ok = new Set(meses.map(m => `${m.ano}-${m.mes}`))
    return pendentes.filter(m => ok.has(`${m.ano}-${m.mes}`) && noEscopo(m.empresa))
  }, [pendentes, meses, noEscopo])

  // Box/Setor/Cargo e meta de horas por mecânico (Planejamento de Metas; Box do mês mais recente).
  const infoMecanico = useMemo(() => {
    const mapa = new Map()
    for (const m of metasEsc.filter(x => x.papel === 'mecanico').sort((a, b) => a.ano - b.ano || a.mes - b.mes)) {
      const k = semAcento(m.pessoa)
      const atual = mapa.get(k) || { meta: 0, nome: m.pessoa }
      mapa.set(k, { ...atual, meta: atual.meta + (m.meta_horas || 0), box: m.box || SEM_BOX, cargo: m.cargo, setor: m.setor })
    }
    return mapa
  }, [metasEsc])
  // Box: 1º o da meta aprovada do período; 2º o da última meta aprovada até o fim do período (se não houver,
  // a primeira depois); 3º o do cadastro de Funcionários; senão (Em branco).
  const fimAnoMes = periodo.fim ? Number(periodo.fim.slice(0, 4)) * 100 + Number(periodo.fim.slice(5, 7)) : 0
  const boxDe = useCallback((pessoa) => {
    const k = semAcento(pessoa)
    const daMeta = infoMecanico.get(k)?.box
    if (daMeta && daMeta !== SEM_BOX) return daMeta
    const hist = (boxMetas.get(k) || []).map(b => ({ ...b, am: b.ano * 100 + b.mes }))
    const antes = hist.filter(b => b.am <= fimAnoMes).sort((a, b) => b.am - a.am)[0]
    const depois = hist.filter(b => b.am > fimAnoMes).sort((a, b) => a.am - b.am)[0]
    return (antes || depois)?.box || boxCadastro.get(k) || SEM_BOX
  }, [infoMecanico, boxMetas, boxCadastro, fimAnoMes])

  const mecDiario = useMemo(() => diarioEsc.filter(r => r.papel === 'mecanico'), [diarioEsc])
  const travaFat = aba === 'consultores' || (aba === 'principais' && modoResumo === 'consultor')
  const total = useMemo(() => indicadores(somar(mecDiario), vis), [mecDiario, vis])

  const ultimaAtualizacao = useMemo(() => {
    const ok = new Set(meses.map(m => `${m.ano}-${m.mes}`))
    const doPeriodo = syncs.filter(s => ok.has(`${s.ano}-${s.mes}`))
    if (!doPeriodo.length) return null
    return doPeriodo.map(s => s.atualizado_em).sort()[0] // a mais antiga do período (a que pode estar desatualizada)
  }, [syncs, meses])
  const mesesSemDados = useMemo(() => {
    const comDados = new Set(syncs.map(s => `${s.ano}-${s.mes}`))
    return meses.filter(m => !comDados.has(`${m.ano}-${m.mes}`))
  }, [syncs, meses])

  return (
    <RegrasCorCtx.Provider value={regraDoPeriodo}>
    <div className="min-h-full bg-white p-6">
     <div className="max-w-screen-2xl mx-auto flex flex-col gap-4 min-w-0">
      {/* CABEÇALHO — mesmo modelo da Auditoria O.S. Aberta (cores e logo do painel Power BI da Caiobá) */}
      <div className="relative z-10 rounded-lg shadow-sm"
        style={{ background: 'linear-gradient(90deg, #fdf8ec 0%, #f8d78c 28%, #f0a30a 50%, #a08a35 68%, #4f6a6a 84%, #1a4d8f 100%)' }}>
        {/* items-start: o título fica na mesma altura do "Atualizado em" e dos botões (canto direito) */}
        <div className="relative flex flex-wrap items-start justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <img src={logoCaioba} alt="Caiobá" className="h-11 w-auto" />
            </div>
            <div className="w-0.5 self-stretch bg-[#1a4d8f]" />
            <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
              <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Indicadores de produtividade</h1>
              <p className="text-[17px] italic text-slate-900 uppercase leading-tight mt-0.5">Pós-Vendas</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 ml-auto">
            {/* Data da última leitura + Atualizar — no canto direito, na linha do título */}
            <div className="flex items-center justify-end gap-2">
              <p className="text-[10px] text-white leading-tight text-right">
                Atualizado em:<br /><strong>{ultimaAtualizacao ? new Date(ultimaAtualizacao).toLocaleString('pt-BR') : '—'}</strong>
              </p>
              {podeAtualizar && (
                <button type="button" onClick={atualizar} disabled={!!atualizando || !periodoOk}
                  title="Atualizar dados do período (relê Dealer.net e MicroWork)" aria-label="Atualizar dados"
                  className="flex items-center justify-center h-9 w-9 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 transition-colors">
                  <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                </button>
              )}
              {podeRegras && (
                <button type="button" onClick={() => setAbrirRegras(true)}
                  title="Regras de cores dos indicadores (Eficiência, Eficácia e Produtividade, mês a mês)" aria-label="Regras de cores dos indicadores"
                  className="flex items-center justify-center h-9 w-9 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-end justify-end gap-3">
              <div className="flex flex-col gap-1 w-[240px]">
                <label className="text-[10px] font-bold text-white uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas</label>
                <SeletorEmpresas grupos={gruposEmpresa} selecionadas={empresasSel} onChange={setEmpresasSel} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-white uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</label>
                <div className="flex items-center gap-1">
                  <input type="date" value={periodo.ini} onChange={e => setPeriodo(p => ({ ...p, ini: e.target.value }))}
                    className="h-9 text-[11px] px-2 border border-slate-300 rounded-md bg-white" aria-label="Data inicial" />
                  <input type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
                    className="h-9 text-[11px] px-2 border border-slate-300 rounded-md bg-white" aria-label="Data final" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {atualizando && <p className="text-[11px] text-slate-600 flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> {atualizando}</p>}
      {erro && <p className="text-[11px] text-red-600 font-semibold">{erro}</p>}

      {/* ABAS — pílulas, como na Auditoria O.S. Aberta */}
      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit flex-wrap">
        {ABAS.map(a => (
          <button key={a.id} type="button" onClick={() => setAba(a.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
              aba === a.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </button>
        ))}
      </div>

      {!periodoOk && <p className="text-[11px] text-red-600">Informe um período válido (data inicial até a final).</p>}
      {periodoOk && mesesSemDados.length > 0 && !carregando && (
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Sem dados lidos para {mesesSemDados.map(m => `${MESES[m.mes - 1]}/${m.ano}`).join(', ')}.
          {podeAtualizar ? ' Use o botão azul de atualizar para ler o período.' : ' Peça a quem pode atualizar o BI para ler o período.'}
        </p>
      )}
      {carregando && <p className="text-[11px] text-slate-500">Carregando…</p>}

      {(
        <div className="flex flex-wrap items-end gap-3">
          {/* Consultores: só existe Horas Vendidas (Nota Fiscal Emitida) — seletor travado nela */}
          <Seletor label="Tipo de Visualização" value={travaFat ? 'fat' : vis} onChange={setVis} largura="w-72"
            disabled={travaFat} title={travaFat ? 'Para consultores as horas são sempre as da Nota Fiscal Emitida' : undefined}
            opcoes={VISUALIZACOES.map(v => ({ value: v.id, label: v.label }))} />
          {/* Resumo: modo Mecânicos (tela original) ou Consultores */}
          {aba === 'principais' && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Modo Visualização</label>
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
                {[['mecanico', 'Mecânicos', Wrench], ['consultor', 'Consultores', User]].map(([v, r, Ic]) => (
                  <button key={v} type="button" onClick={() => setModoResumo(v)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold ${modoResumo === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Ic className="h-3.5 w-3.5" /> {r}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Busca por O.S. das abas Mecânicos e Consultores (a aba desenha aqui) */}
          {(aba === 'mecanicos' || aba === 'consultores' || aba === 'diames') && <div key={aba} ref={setSlotBuscaOs} className="flex items-end" />}
        </div>
      )}

      {aba === 'principais' && modoResumo === 'mecanico' && <AbaPrincipais total={total} mecDiario={mecDiario} boxDe={boxDe} vis={vis} />}
      {aba === 'principais' && modoResumo === 'consultor' && <ResumoConsultores diarioEsc={diarioEsc} metasEsc={metasEsc} reaisTotal={total.reais} />}
      {aba === 'mecanicos' && (
        <AbaMecanicos mecDiario={mecDiario} infoMecanico={infoMecanico} boxDe={boxDe} vis={vis} periodo={periodo} noEscopo={noEscopo} excluidos={excluidos} slotBuscaOs={slotBuscaOs} metasEsc={metasEsc} pendentesEsc={pendentesEsc} />
      )}
      {aba === 'consultores' && <AbaConsultores diarioEsc={diarioEsc} metasEsc={metasEsc} pendentesEsc={pendentesEsc} reaisTotal={total.reais}
        periodo={periodo} noEscopo={noEscopo} excluidos={excluidos} slotBuscaOs={slotBuscaOs} />}
      {aba === 'diames' && (
        <AbaDiaMes mecDiario={mecDiario} mensalEsc={mensalEsc} boxDe={boxDe} vis={vis} periodo={periodo} slot={slotBuscaOs}
          metasAno={metas.filter(m => noEscopo(m.empresa))} />
      )}
      {abrirRegras && (
        <RegrasCoresModal regras={regrasCor} anoInicial={Number(periodo.fim?.slice(0, 4)) || new Date().getFullYear()}
          usuario={user?.email || null} onClose={() => setAbrirRegras(false)} onSalvo={carregarRegras} />
      )}
     </div>
    </div>
    </RegrasCorCtx.Provider>
  )
}

// ── Aba: Resumo ─────────────────────────────────────────────
function porBox(linhas, boxDe, vis) {
  const grupos = new Map()
  for (const l of linhas) {
    const b = boxDe(l.pessoa)
    if (!grupos.has(b)) grupos.set(b, [])
    grupos.get(b).push(l)
  }
  return [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([box, ls]) => { const i = indicadores(somar(ls), vis); return { box, ...i, i } })
}

// Textos do ⓘ da aba Resumo (fonte de cada hora e fórmula de cada indicador, conforme o Tipo de Visualização).
const FONTE_VEND = {
  aplic: 'Tempo (TMO) dos serviços lançados na abertura da O.S., contado uma vez por O.S. Trucks: Relatório Geral de O.S. (Dealer.net). Motos: Relatório Geral de O.S. (MicroWork).',
  enc: 'Tempo vendido dos serviços em que o tempo do mecânico foi encerrado. Trucks: ROF036 Cartão Tarefa (Dealer.net). Motos: apontamentos (MicroWork).',
  fat: 'Tempo vendido dos serviços com Nota Fiscal emitida. Trucks: ROF042 (Dealer.net). Motos: vendas de serviços (MicroWork).',
}
const FONTE_GASTO = {
  aplic: 'Não existe na visualização Horas Aplicadas — por isso Eficiência e Produtividade ficam em branco nela.',
  enc: 'Tempo que o mecânico apontou nos serviços encerrados. Trucks: ROF036 Cartão Tarefa (Dealer.net). Motos: apontamentos (MicroWork).',
  fat: 'Tempo apontado nos serviços com Nota Fiscal emitida. Trucks: ROF042, coluna Hr. Total (Dealer.net). Motos: vendas de serviços (MicroWork).',
}
function textosInfo(vis) {
  const hv = vis === 'aplic' ? 'Horas Aplicadas' : 'Horas Vendidas'
  const F = (formula, explica) => <><p className="font-bold text-slate-900">{formula}</p><p className="mt-1">{explica}</p></>
  return {
    reais: F('Horas Disponíveis Reais', 'Horas disponíveis dos mecânicos já descontadas as ausências. Trucks: ROF096 (Dealer.net). Motos: apontamentos (MicroWork).'),
    vend: F(hv, FONTE_VEND[vis]),
    gasto: F('Horas Gastas', FONTE_GASTO[vis]),
    eficiencia: F(`Eficiência = ${hv} ÷ Horas Gastas`, 'Quanto foi vendido para cada hora que o mecânico trabalhou nos serviços.'),
    eficacia: F(`Eficácia = ${hv} ÷ Horas Disponíveis Reais`, 'Quanto foi vendido para cada hora que o mecânico esteve disponível.'),
    produtividade: F('Produtividade = Horas Gastas ÷ Horas Disponíveis Reais', 'Quanto do tempo disponível o mecânico passou trabalhando em serviços.'),
  }
}
const porBoxInfo = (t) => <>{t}<p className="mt-1 text-slate-500">Por Box: mesma fórmula, somando as horas dos mecânicos de cada Box.</p></>

// Resumo › modo Consultores: mesmos números da aba Consultores (horas da Nota Fiscal Emitida).
function TooltipConsultor({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const c = payload[0].payload
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-[11px] text-slate-700">
      <p className="font-bold text-slate-900 mb-1">{label}</p>
      <p><strong>Produtividade: {fmtPct(c.prod) || '—'}</strong></p>
      <p className="mt-1">Hr. Faturadas: <strong>{fmtH(c.fat || null) || '—'}</strong></p>
      <p>Hr. Disp. Reais: <strong>{fmtH(c.reais) || '—'}</strong></p>
    </div>
  )
}

function ResumoConsultores({ diarioEsc, metasEsc, reaisTotal }) {
  const rc = useContext(RegrasCorCtx)
  const linhas = useMemo(() => linhasConsultores(diarioEsc, metasEsc), [diarioEsc, metasEsc])
  const fat = linhas.reduce((s, p) => s + p.fat, 0)
  const vl = linhas.reduce((s, p) => s + (p.vl || 0), 0)
  const meta = linhas.reduce((s, p) => s + p.meta, 0)
  const prod = reaisTotal && fat ? fat / reaisTotal : null
  const dados = linhas.filter(p => p.prod != null).map(p => ({ ...p, rotulo: p.nome.split(' ').slice(0, 2).join(' ') }))
  const F = (formula, explica) => <><p className="font-bold text-slate-900">{formula}</p><p className="mt-1">{explica}</p></>
  const [r2, r3] = limitesDe('produtividade', rc.produtividade)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card titulo="Meta Horas" valor={fmtH(meta || null)} info={F('Meta Horas dos consultores', 'Planejamento de Metas (só metas aprovadas): % do consultor × soma das metas dos mecânicos da mesma empresa e setor.')} />
        <Card titulo="Horas Disponíveis Reais" valor={fmtH(reaisTotal)} info={F('Horas Disponíveis Reais', 'Horas disponíveis reais dos mecânicos das empresas selecionadas. Por consultor: as da empresa dele, divididas pela participação da meta dele na empresa.')} />
        <Card titulo="Horas Faturadas" valor={fmtH(fat || null)} info={F('Horas Faturadas', 'Tempo vendido dos serviços com Nota Fiscal emitida nas O.S. do consultor. Trucks: ROF042 (Dealer.net). Motos: vendas de serviços (MicroWork).')} />
        <Card titulo="Vlr. Hora Vendida" valor={fmtR$(fat && vl ? vl / fat : null)} alinhar="right"
          info={F('Vlr. Hora Vendida = Vlr. Serviços ÷ Horas Faturadas', `Vlr. Serviços do período: ${fmtR$(vl || null) || '—'}.`)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Velocimetro titulo="% Produtividade dos consultores" valor={prod} id="produtividade"
          info={F('Produtividade = Horas Faturadas ÷ Horas Disponíveis Reais', 'Quanto foi faturado para cada hora disponível dos mecânicos. Cores: regra de Produtividade da engrenagem.')} />
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">Produtividade % por consultor
            <InfoFormula alinhar="right">{F('Horas Faturadas ÷ Horas Disponíveis Reais', 'Por consultor: Hr. Disp. Reais da empresa dele × (meta dele ÷ soma das metas dos consultores da empresa).')}</InfoFormula>
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dados} margin={{ top: 20, right: 8, left: 0, bottom: 40 }}>
              <XAxis dataKey="rotulo" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" />
              <YAxis hide domain={[0, (max) => Math.max(max, r3 * 1.1)]} />
              <ReferenceLine y={r2} stroke="#64748b" strokeDasharray="4 3" label={{ value: fmtPct(r2), position: 'insideTopLeft', fontSize: 9 }} />
              <ReferenceLine y={r3} stroke="#64748b" strokeDasharray="4 3" label={{ value: fmtPct(r3), position: 'insideTopLeft', fontSize: 9 }} />
              <Tooltip content={<TooltipConsultor />} />
              <Bar dataKey="prod">
                {dados.map((d) => <Cell key={d.nome} fill={corFaixa(d.prod, 'produtividade', rc.produtividade)} />)}
                <LabelList dataKey="prod" position="top" formatter={(v) => fmtPct(v)} style={{ fontSize: 9 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function AbaPrincipais({ total, mecDiario, boxDe, vis }) {
  const boxes = useMemo(() => porBox(mecDiario, boxDe, vis), [mecDiario, boxDe, vis])
  const t = textosInfo(vis)
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card titulo="Horas Disponíveis Reais" valor={fmtH(total.reais)} info={t.reais} />
        <Card titulo={vis === 'aplic' ? 'Horas Aplicadas' : 'Horas Vendidas'} valor={fmtH(total.vend)} info={t.vend} />
        <Card titulo="Horas Gastas" valor={fmtH(total.gasto)} info={t.gasto} alinhar="right" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Velocimetro titulo="% Eficiência" valor={total.eficiencia} id="eficiencia" info={t.eficiencia} />
        <Velocimetro titulo="Eficácia %" valor={total.eficacia} id="eficacia" info={t.eficacia} />
        <Velocimetro titulo="% Produtividade" valor={total.produtividade} id="produtividade" info={t.produtividade} alinhar="right" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BarrasPorBox titulo="Eficiência % por Box" dados={boxes} id="eficiencia" vis={vis} info={porBoxInfo(t.eficiencia)} />
        <BarrasPorBox titulo="Eficácia % por Box" dados={boxes} id="eficacia" vis={vis} info={porBoxInfo(t.eficacia)} />
        <BarrasPorBox titulo="Produtividade % por Box" dados={boxes} id="produtividade" vis={vis} info={porBoxInfo(t.produtividade)} alinhar="right" />
      </div>
    </div>
  )
}

// ── Quadro da Meta Horas (ícone de alvo): como o número sai do Planejamento de Metas ──
const mesAno = (m) => `${MESES[m.mes - 1]}/${m.ano}`
const fmtDataHora = (s) => (s ? new Date(s).toLocaleDateString('pt-BR') : '')

// Telas do Planejamento de Metas onde a meta é lançada/aprovada (mesma permissão das duas).
const PERM_PLANEJAMENTO = 'metas/pos-vendas/servicos_pecas'
const URL_PLANEJAMENTO = { mecanico: '/metas/pos-vendas/servicos_pecas/mecanico', consultor: '/metas/pos-vendas/servicos_pecas/consultor' }

function QuadroMeta({ titulo, papel, metas, pendentes, onClose }) {
  const { hasPermission } = useAuth()
  const podePlanejamento = hasPermission(PERM_PLANEJAMENTO)
  const urlPlanejamento = URL_PLANEJAMENTO[papel === 'consultor' ? 'consultor' : 'mecanico']
  const ordenar = (l) => [...l].sort((a, b) => a.ano - b.ano || a.mes - b.mes)
  const ms = ordenar(metas || []), ps = ordenar(pendentes || [])
  const th = 'px-2 py-1.5 text-right font-semibold'
  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5"><Target className="h-4 w-4 text-rose-600" /> Meta Horas — {titulo}</h2>
            <p className="text-[11px] text-slate-500">Planejamento de Metas · só metas aprovadas entram no BI</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Abre a tela do Planejamento de Metas em outra aba — só para quem tem acesso a ela */}
            {podePlanejamento ? (
              <a href={urlPlanejamento} target="_blank" rel="noopener noreferrer"
                title={papel === 'consultor' ? 'Abrir Planejamento de Metas › Serviços — Consultor (outra aba)' : 'Abrir Planejamento de Metas › Serviços — Mecânico (outra aba)'}
                className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                <ExternalLink className="h-3.5 w-3.5" /> Abrir no Planejamento de Metas
              </a>
            ) : (
              <span className="text-[10px] text-slate-400" title="Seu grupo de acesso não tem a tela do Planejamento de Metas">Sem acesso ao Planejamento de Metas</span>
            )}
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="overflow-auto px-5 py-3 flex flex-col gap-3 text-[11px]">
          {papel === 'mecanico' && (
            <>
              <p className="text-slate-600"><strong>Horas Meta = Horas Disponíveis × Produtividade %</strong> (Planejamento de Metas › Serviços — Mecânico).</p>
              {ms.length === 0 ? <p className="text-slate-500">Nenhuma meta aprovada no período.</p> : (
                <table className="w-full">
                  <thead><tr className="text-slate-600 border-b border-sky-300">
                    <th className="text-left py-1.5 pl-1">Mês</th><th className={th}>Dias a Trabalhar</th><th className={th}>Horas Disponíveis</th>
                    <th className={th}>Produtividade %</th><th className={th}>Horas Meta</th><th className="text-left px-2">Aprovação</th>
                  </tr></thead>
                  <tbody>
                    {ms.map(m => (
                      <tr key={`${m.ano}-${m.mes}-${m.empresa}`} className="border-b border-slate-100">
                        <td className="py-1 pl-1 whitespace-nowrap">{mesAno(m)}<span className="block text-[10px] text-slate-400">{m.empresa} · {m.box}</span></td>
                        <td className="px-2 text-right tabular-nums">{m.dias_trabalhar != null ? m.dias_trabalhar.toLocaleString('pt-BR', { minimumFractionDigits: 1 }) : '—'}</td>
                        <td className="px-2 text-right tabular-nums">{fmtH(m.horas_disp)}</td>
                        <td className="px-2 text-right tabular-nums">{fmtPct(m.produtividade / 100)}</td>
                        <td className="px-2 text-right tabular-nums font-bold">{fmtH(m.meta_horas)}</td>
                        <td className="px-2 text-slate-500 whitespace-nowrap">{fmtDataHora(m.aprovado_em)}{m.aprovado_por ? ` · ${m.aprovado_por}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {papel === 'consultor' && (
            <>
              <p className="text-slate-600"><strong>Horas Meta = % do consultor × soma das Horas Meta dos mecânicos</strong> da mesma empresa e setor (Planejamento de Metas › Distribuição — Consultores; só metas aprovadas).</p>
              {ms.length === 0 ? <p className="text-slate-500">Nenhuma meta aprovada no período.</p> : (
                <table className="w-full">
                  <thead><tr className="text-slate-600 border-b border-sky-300">
                    <th className="text-left py-1.5 pl-1">Mês</th><th className={th}>% do Consultor</th><th className={th}>Horas Meta dos Mecânicos</th>
                    <th className={th}>Horas Meta</th><th className="text-left px-2">Aprovação</th>
                  </tr></thead>
                  <tbody>
                    {ms.map(m => (
                      <tr key={`${m.ano}-${m.mes}-${m.empresa}`} className="border-b border-slate-100">
                        <td className="py-1 pl-1 whitespace-nowrap">{mesAno(m)}<span className="block text-[10px] text-slate-400">{m.empresa} · {m.setor}</span></td>
                        <td className="px-2 text-right tabular-nums">{fmtPct(m.percentual / 100)}</td>
                        <td className="px-2 text-right tabular-nums">{fmtH(m.base_horas)}</td>
                        <td className="px-2 text-right tabular-nums font-bold">{fmtH(m.meta_horas)}</td>
                        <td className="px-2 text-slate-500 whitespace-nowrap">{fmtDataHora(m.aprovado_em)}{m.aprovado_por ? ` · ${m.aprovado_por}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {ps.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
              <p className="font-semibold mb-1">Meses do período fora da Meta Horas (não aprovados no Planejamento de Metas):</p>
              {ps.map(m => (
                <p key={`${m.ano}-${m.mes}-${m.empresa}`}>{mesAno(m)} — {m.meta_horas ? `${fmtH(m.meta_horas)} h planejadas, ` : 'sem meta preenchida, '}aguardando aprovação</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Aba: Indicadores Mecânicos ──────────────────────────────────────────────
// comValor: coluna Vlr. Serviços — só na visualização Horas Vendidas (Nota Fiscal Emitida).
function LinhaValores({ nivel, rotulo, meta, ind, onToggle, aberto, destaque, sub, onHistorico, onMeta, comValor }) {
  const rc = useContext(RegrasCorCtx)
  const cls = destaque ? 'font-bold bg-slate-50' : ''
  return (
    <tr className={`border-b border-slate-100 hover:bg-sky-50/40 ${cls}`}>
      <td className="py-1 pr-2 whitespace-nowrap" style={{ paddingLeft: 8 + nivel * 16 }}>
        <span className="inline-flex items-center gap-1.5">
          {onToggle ? (
            <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 text-left">
              {aberto ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}{rotulo}
            </button>
          ) : rotulo}
          {onMeta && (
            <button type="button" onClick={onMeta} title="Como a Meta Horas é calculada (Planejamento de Metas)" aria-label={`Meta Horas de ${rotulo}`}
              className="p-0.5 rounded text-rose-600 hover:bg-rose-100">
              <Target className="h-3.5 w-3.5" />
            </button>
          )}
          {onHistorico && (
            <button type="button" onClick={onHistorico} title="Histórico por O.S. e por dia (até o TMO)" aria-label={`Histórico de ${rotulo}`}
              className="p-0.5 rounded text-sky-600 hover:bg-sky-100">
              <History className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(meta || null)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(ind.disp)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(ind.ausentes)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(ind.reais)}</td>
      <td className="px-2 text-right tabular-nums">{fmtH(ind.vend)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtPct(ind.eficacia)}</td>
      <td className="px-1 text-center">{sub ? null : <Bolinha cor={corKpi(ind.eficacia, 'eficacia', rc.eficacia)} />}</td>
      <td className="px-2 text-right tabular-nums">{fmtH(ind.gasto)}</td>
      <td className="px-2 text-right tabular-nums">{fmtPct(ind.eficiencia)}</td>
      <td className="px-1 text-center"><Bolinha cor={corKpi(ind.eficiencia, 'eficiencia', rc.eficiencia)} /></td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtPct(ind.produtividade)}</td>
      <td className="px-1 text-center">{sub ? null : <Bolinha cor={corKpi(ind.produtividade, 'produtividade', rc.produtividade)} />}</td>
      {comValor && <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(ind.vl)}</td>}
      {comValor && <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(ind.moHr)}</td>}
    </tr>
  )
}

function AbaMecanicos({ mecDiario, infoMecanico, boxDe, vis, periodo, noEscopo, excluidos, slotBuscaOs, metasEsc, pendentesEsc }) {
  const [abertos, setAbertos] = useState(() => new Set()) // Box recolhidos
  const [osBusca, setOsBusca] = useState('')
  const [historico, setHistorico] = useState(null) // { pessoa, nome } — janela de histórico aberta
  const [quadroMeta, setQuadroMeta] = useState(null) // { titulo, papel, metas, pendentes } — quadro da Meta Horas
  const metaDe = (nome) => ({
    titulo: nome, papel: 'mecanico',
    metas: metasEsc.filter(m => m.papel === 'mecanico' && semAcento(m.pessoa) === semAcento(nome)),
    pendentes: pendentesEsc.filter(m => m.papel === 'mecanico' && semAcento(m.pessoa) === semAcento(nome)),
  })
  const toggle = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  const [osEncontradas, setOsEncontradas] = useState(null)
  const buscarOs = async () => {
    const os = osBusca.trim()
    if (!os) { setOsEncontradas(null); return }
    const linhas = await lerTudo(() => supabase.from('pv_prod_os').select('*').eq('os', os).gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('pessoa').order('tmo'))
    setOsEncontradas(linhas.filter(l => l.papel === 'mecanico' && noEscopo(l.empresa, l.marca) && !excluidos.has(semAcento(l.pessoa)) && !NAO_PESSOA.test(l.pessoa || '')))
  }

  const arvore = useMemo(() => {
    // Mecânicos com horas no período + mecânicos só com meta (aparecem com a meta e o resto vazio).
    const pessoas = new Map()
    for (const l of mecDiario) {
      const k = semAcento(l.pessoa)
      if (!pessoas.has(k)) pessoas.set(k, { nome: l.pessoa || '(sem nome)', pessoa: l.pessoa, linhas: [] })
      pessoas.get(k).linhas.push(l)
    }
    for (const [k, info] of infoMecanico) if (!pessoas.has(k)) pessoas.set(k, { nome: info.nome, pessoa: info.nome, linhas: [] })
    const boxes = new Map()
    for (const [k, p] of pessoas) {
      const b = boxDe(p.nome)
      if (!boxes.has(b)) boxes.set(b, [])
      boxes.get(b).push({ ...p, meta: infoMecanico.get(k)?.meta || 0, ind: indicadores(somar(p.linhas), vis) })
    }
    return [...boxes.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')).map(([box, ps]) => ({
      box, pessoas: ps.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      meta: ps.reduce((s, p) => s + p.meta, 0),
      ind: indicadores(somar(ps.flatMap(p => p.linhas)), vis),
    }))
  }, [mecDiario, infoMecanico, boxDe, vis])
  const totalMeta = arvore.reduce((s, b) => s + b.meta, 0)
  const total = indicadores(somar(mecDiario), vis)

  // Busca por O.S. — desenhada ao lado do Tipo de Visualização (slotBuscaOs, na página); sem o slot, fica aqui.
  const buscaOs = (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">OS Número</label>
      <div className="flex items-center gap-1">
        <input value={osBusca} onChange={e => setOsBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarOs()}
          placeholder="Inserir OS Número" className="w-44 border border-slate-300 rounded-md px-2 py-1 text-[11px]" />
        <button type="button" onClick={buscarOs} className="p-1.5 rounded-md bg-sky-600 text-white" aria-label="Buscar O.S."><Search className="h-3.5 w-3.5" /></button>
        {osEncontradas && <button type="button" onClick={() => { setOsBusca(''); setOsEncontradas(null) }} className="p-1.5 rounded-md bg-slate-200" aria-label="Limpar busca"><X className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {slotBuscaOs ? createPortal(buscaOs, slotBuscaOs) : buscaOs}

      {osEncontradas && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
          <p className="text-[11px] font-bold text-slate-600 mb-2">O.S. {osBusca} — {osEncontradas.length ? `${osEncontradas.length} lançamento(s)` : 'nada encontrado no período/empresa'}</p>
          {osEncontradas.length > 0 && (
            <table className="w-full text-[11px]">
              <thead><tr className="text-slate-500 border-b"><th className="text-left py-1">Data</th><th className="text-left">Empresa</th><th className="text-left">Mecânico</th><th className="text-left">Tipo O.S.</th><th className="text-left">TMO</th>
                <th className="text-right">Hr. Aplicadas</th><th className="text-right">Hr. Vend. (Enc.)</th><th className="text-right">Hr. Gastas (Enc.)</th><th className="text-right">Hr. Vend. (NF)</th><th className="text-right">Hr. Gastas (NF)</th></tr></thead>
              <tbody>{osEncontradas.map((l, i) => (
                <tr key={i} className="border-b border-slate-100"><td className="py-1">{fmtData(l.data)}</td><td>{l.empresa}</td><td>{l.pessoa}</td><td>{l.tipo_os}</td><td>{l.tmo}</td>
                  <td className="text-right tabular-nums">{fmtH(Number(l.hr_aplic) || null)}</td><td className="text-right tabular-nums">{fmtH(Number(l.hr_vend_enc) || null)}</td>
                  <td className="text-right tabular-nums">{fmtH(Number(l.hr_gasto_enc) || null)}</td><td className="text-right tabular-nums">{fmtH(Number(l.hr_vend_fat) || null)}</td>
                  <td className="text-right tabular-nums">{fmtH(Number(l.hr_gasto_fat) || null)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 bg-white">
            <tr className="text-slate-600 border-b border-sky-300">
              <th className="text-left py-2 pl-2">Box</th>
              <th className="px-2 text-right">Meta Horas</th><th className="px-2 text-right">Hr. Disp.</th><th className="px-2 text-right">Hr. Ausentes</th>
              <th className="px-2 text-right">Hr. Reais</th><th className="px-2 text-right">{vis === 'aplic' ? 'Hr. Aplicadas' : 'Hr. Vendidas'}</th>
              <th className="px-2 text-right">Eficácia %</th><th className="px-1">KPI</th><th className="px-2 text-right">Hr. Gastas</th>
              <th className="px-2 text-right">Eficiência %</th><th className="px-1">KPI</th><th className="px-2 text-right">Produtividade %</th><th className="px-1">KPI</th>
              {vis === 'fat' && <th className="px-2 text-right" title="Valor de serviços das notas fiscais emitidas">Vlr. Serviços</th>}
              {vis === 'fat' && <th className="px-2 text-right" title="Vlr. Serviços ÷ Hr. Vendidas (nota fiscal emitida)">Vlr. Hora Vendida</th>}
            </tr>
          </thead>
          <tbody>
            {arvore.map(b => (
              <Fragment key={b.box}>
                <LinhaValores nivel={0} rotulo={b.box} meta={b.meta} ind={b.ind} destaque comValor={vis === 'fat'}
                  aberto={!abertos.has('box:' + b.box)} onToggle={() => toggle('box:' + b.box)} />
                {!abertos.has('box:' + b.box) && b.pessoas.map(p => (
                  <LinhaValores key={p.nome} nivel={1} rotulo={p.nome} meta={p.meta} ind={p.ind} comValor={vis === 'fat'}
                    onMeta={() => setQuadroMeta(metaDe(p.nome))}
                    onHistorico={p.linhas.length ? () => setHistorico({ pessoa: p.pessoa, nome: p.nome }) : null} />
                ))}
              </Fragment>
            ))}
            <LinhaValores nivel={0} rotulo="Total" meta={totalMeta} ind={total} destaque comValor={vis === 'fat'} />
          </tbody>
        </table>
      </div>
      {quadroMeta && <QuadroMeta {...quadroMeta} onClose={() => setQuadroMeta(null)} />}
      {historico && (
        <HistoricoMecanico pessoa={historico.pessoa} nome={historico.nome} periodo={periodo} noEscopo={noEscopo}
          visInicial={vis} onClose={() => setHistorico(null)} />
      )}
    </div>
  )
}

// ── Janela: histórico de um mecânico (Por O.S. | Por Dia, até o TMO) ─────────
// Lê pv_prod_os da pessoa no período. As horas mostradas seguem o Tipo de Visualização escolhido na janela.
const CAMPO_VEND = { aplic: 'hr_aplic', enc: 'hr_vend_enc', fat: 'hr_vend_fat' }
const CAMPO_GASTO = { aplic: null, enc: 'hr_gasto_enc', fat: 'hr_gasto_fat' }

function agrupar(linhas, chave) {
  const m = new Map()
  for (const l of linhas) {
    const k = chave(l)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(l)
  }
  return m
}

// papel 'consultor': mesma janela, com as horas da nota fiscal emitida (visualização travada) e só as colunas
// Hr. Faturadas e Vlr. Serviços — consultor não tem hora disponível nem gasta.
function HistoricoMecanico({ pessoa, nome, periodo, noEscopo, visInicial, onClose, papel = 'mecanico' }) {
  const ehConsultor = papel === 'consultor'
  const rc = useContext(RegrasCorCtx)
  const [linhas, setLinhas] = useState(null)
  const [tiposOs, setTiposOs] = useState(() => new Map()) // sigla (Trucks) → "G03 - PLANO … (MEC)"
  const [erro, setErro] = useState('')
  const [visao, setVisao] = useState('dia') // abre sempre em Por Dia
  const [vis, setVis] = useState(papel === 'consultor' ? 'fat' : visInicial)
  const [abertos, setAbertos] = useState(() => new Set())
  const toggle = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })

  useEffect(() => {
    let vivo = true
    Promise.all([
      lerTudo(() => supabase.from('pv_prod_os').select('*').eq('papel', papel).eq('pessoa', pessoa)
        .gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('os').order('tmo')),
      // Descrição do tipo de O.S. de Trucks (o Dealer.net manda só a sigla em alguns relatórios) — cadastro Tipos de O.S.
      supabase.from('dim_tipos_os').select('sigla, tipo_os, agrupamento_nome').then(r => r.data || []),
    ]).then(([ls, tipos]) => {
      if (!vivo) return
      const m = new Map()
      for (const t of tipos) if (t.sigla && t.tipo_os && /truck/i.test(t.agrupamento_nome || '')) m.set(t.sigla.trim().toUpperCase(), t.tipo_os)
      setTiposOs(m)
      setLinhas(ls.filter(l => noEscopo(l.empresa, l.marca)))
    }).catch(e => { if (vivo) setErro(e.message || String(e)) })
    return () => { vivo = false }
  }, [pessoa, periodo, noEscopo])
  useEffect(() => { setAbertos(new Set()) }, [visao, vis])

  const nomeTipo = (l) => {
    const t = (l.tipo_os || '').trim()
    if (!t) return '(sem tipo de O.S.)'
    return l.marca === 'TRUCKS' ? tiposOs.get(t.toUpperCase()) || t : t
  }
  const cv = CAMPO_VEND[vis], cg = CAMPO_GASTO[vis]
  const temValor = (l) => (Number(l[cv]) || 0) !== 0 || (cg && (Number(l[cg]) || 0) !== 0)
  // Mesmas medidas da tabela de mecânicos (indicadores do produtividadeCalculos.js).
  const soma = (ls) => indicadores(somar(ls), vis)
  const total = linhas ? indicadores(somar(linhas), vis) : null

  // Tipo de O.S. → Número da O.S. → TMO (só lançamentos com hora no Tipo de Visualização escolhido).
  const arvoreTipo = (ls, prefixo) => [...agrupar(ls.filter(l => l.os && temValor(l)), nomeTipo).entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([tipo, gt]) => ({
      chave: `${prefixo}|${tipo}`, tipo, t: soma(gt),
      oss: [...agrupar(gt, l => `${l.empresa}|${l.os}`).values()].map(go => {
        const datas = go.map(l => l.data).sort()
        return {
          chave: `${prefixo}|${tipo}|${go[0].empresa}|${go[0].os}`, os: go[0].os, de: datas[0], ate: datas[datas.length - 1], t: soma(go),
          tmos: [...agrupar(go, l => l.tmo || '(sem TMO)').entries()].map(([tmo, gl]) => ({ tmo, t: soma(gl) })),
        }
      }).sort((a, b) => a.de.localeCompare(b.de) || a.os.localeCompare(b.os, 'pt-BR', { numeric: true })),
    }))

  const porTipo = useMemo(() => (linhas ? arvoreTipo(linhas, 'T') : []), [linhas, vis, tiposOs])
  const porDia = useMemo(() => {
    if (!linhas) return []
    return [...agrupar(linhas, l => l.data).entries()].sort().map(([data, g]) => ({ data, t: soma(g), tipos: arvoreTipo(g, data) }))
  }, [linhas, vis, tiposOs])

  const exportar = () => {
    const rows = (linhas || []).map(l => ({
      Data: fmtData(l.data), Empresa: l.empresa, 'Tipo O.S.': l.os ? nomeTipo(l) : '', 'O.S.': l.os, TMO: l.tmo,
      'Hr. Disp.': Number(l.hr_disp) || 0, 'Hr. Disp. Reais': Number(l.hr_disp_reais) || 0, 'Hr. Aplicadas': Number(l.hr_aplic) || 0,
      'Hr. Vendidas (Encerrado)': Number(l.hr_vend_enc) || 0, 'Hr. Gastas (Encerrado)': Number(l.hr_gasto_enc) || 0,
      'Hr. Vendidas (NF)': Number(l.hr_vend_fat) || 0, 'Hr. Gastas (NF)': Number(l.hr_gasto_fat) || 0, 'Vlr. Serviços': Number(l.vl_servicos) || 0,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Histórico')
    XLSX.writeFile(wb, `Historico ${nome} ${periodo.ini} a ${periodo.fim}.xlsx`)
  }

  const rotVend = ehConsultor ? 'Hr. Faturadas' : vis === 'aplic' ? 'Hr. Aplicadas' : 'Hr. Vendidas'
  // Colunas iguais às da tabela de mecânicos. Nas linhas de Tipo de O.S. / O.S. / TMO não existe hora
  // disponível (ela é do dia, não da O.S.): ficam em branco Hr. Disp./Ausentes/Reais, Eficácia e Produtividade.
  const Celulas = ({ t, sub }) => ehConsultor ? (
    <>
      <td className="px-2 text-right tabular-nums">{fmtH(t.vend)}</td>
      <td className="px-2 text-right tabular-nums">{fmtR$(t.vl)}</td>
      <td className="px-2 text-right tabular-nums">{fmtR$(t.moHr)}</td>
    </>
  ) : (
    <>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(t.disp)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(t.ausentes)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtH(t.reais)}</td>
      <td className="px-2 text-right tabular-nums">{fmtH(t.vend)}</td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtPct(t.eficacia)}</td>
      <td className="px-1 text-center">{sub ? null : <Bolinha cor={corKpi(t.eficacia, 'eficacia', rc.eficacia)} />}</td>
      <td className="px-2 text-right tabular-nums">{fmtH(t.gasto)}</td>
      <td className="px-2 text-right tabular-nums">{fmtPct(t.eficiencia)}</td>
      <td className="px-1 text-center"><Bolinha cor={corKpi(t.eficiencia, 'eficiencia', rc.eficiencia)} /></td>
      <td className="px-2 text-right tabular-nums">{sub ? '' : fmtPct(t.produtividade)}</td>
      <td className="px-1 text-center">{sub ? null : <Bolinha cor={corKpi(t.produtividade, 'produtividade', rc.produtividade)} />}</td>
      {vis === 'fat' && <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(t.vl)}</td>}
      {vis === 'fat' && <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(t.moHr)}</td>}
    </>
  )
  const Seta = ({ aberto }) => (aberto ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />)
  const Rotulo = ({ nivel, chave, children, negrito }) => (
    <td className="py-1 pr-2 whitespace-nowrap" style={{ paddingLeft: 8 + nivel * 16 }}>
      {chave
        ? <button type="button" onClick={() => toggle(chave)} className={`inline-flex items-center gap-1 text-left ${negrito ? 'font-semibold' : ''}`}><Seta aberto={abertos.has(chave)} />{children}</button>
        : <span className={`inline-block ${negrito ? 'font-semibold' : ''}`} style={{ paddingLeft: 16 }}>{children}</span>}
    </td>
  )
  // Linhas Tipo de O.S. → O.S. → TMO a partir do nível informado.
  const linhasTipo = (tipos, nivel) => tipos.map(tp => (
    <Fragment key={tp.chave}>
      <tr className="border-b border-slate-100 hover:bg-sky-50/40">
        <Rotulo nivel={nivel} chave={tp.chave} negrito>{tp.tipo}</Rotulo>
        <Celulas t={tp.t} sub />
      </tr>
      {abertos.has(tp.chave) && tp.oss.map(o => (
        <Fragment key={o.chave}>
          <tr className="border-b border-slate-50 hover:bg-sky-50/40">
            <Rotulo nivel={nivel + 1} chave={o.chave}>
              O.S. {o.os}{visao === 'tipo' && <span className="text-slate-400 ml-2">{o.de === o.ate ? fmtData(o.de) : `${fmtData(o.de)} a ${fmtData(o.ate)}`}</span>}
            </Rotulo>
            <Celulas t={o.t} sub />
          </tr>
          {abertos.has(o.chave) && o.tmos.map(x => (
            <tr key={o.chave + x.tmo} className="border-b border-slate-50 text-slate-600">
              <Rotulo nivel={nivel + 2}>{x.tmo}</Rotulo>
              <Celulas t={x.t} sub />
            </tr>
          ))}
        </Fragment>
      ))}
    </Fragment>
  ))

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-200">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5"><History className="h-4 w-4 text-sky-600" /> Histórico — {nome}{ehConsultor && <span className="font-normal text-slate-500"> (consultor)</span>}</h2>
            <p className="text-[11px] text-slate-500">{fmtData(periodo.ini)} a {fmtData(periodo.fim)}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Por Dia | Por Tipo de O.S., Tipo de Visualização e Exportar Excel na mesma linha (pedido do usuário) */}
            <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
              {[['dia', 'Por Dia'], ['tipo', 'Por Tipo de O.S.']].map(([v, r]) => (
                <button key={v} type="button" onClick={() => setVisao(v)}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold ${visao === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{r}</button>
              ))}
            </div>
            <select value={vis} onChange={e => setVis(e.target.value)} aria-label="Tipo de Visualização" disabled={ehConsultor}
              title={ehConsultor ? 'Consultor: sempre as horas da Nota Fiscal Emitida' : 'Tipo de Visualização'}
              className="h-8 w-72 border border-slate-300 rounded-md px-2 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed">
              {VISUALIZACOES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
            <button type="button" onClick={exportar} disabled={!linhas?.length}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <Download className="h-3.5 w-3.5" /> Exportar Excel
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Fechar"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="overflow-auto px-5 pb-3">
          {erro && <p className="text-[11px] text-red-600 pt-3">{erro}</p>}
          {!linhas && !erro && <p className="text-[11px] text-slate-500 pt-3">Carregando…</p>}
          {linhas && (visao === 'tipo' ? porTipo.length === 0 : porDia.length === 0) && (
            <p className="text-[11px] text-slate-500 pt-3">Sem lançamentos de {rotVend.toLowerCase()} no período.</p>
          )}
          {linhas && (visao === 'tipo' ? porTipo.length > 0 : porDia.length > 0) && (
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_#7dd3fc]"><tr className="text-slate-600 border-b border-sky-300">
                <th className="text-left py-2 pl-2">{visao === 'tipo' ? 'Tipo de O.S. / O.S. / TMO' : 'Dia / Tipo de O.S. / O.S. / TMO'}</th>
                {ehConsultor ? (
                  <><th className="px-2 text-right">Hr. Faturadas</th><th className="px-2 text-right">Vlr. Serviços</th><th className="px-2 text-right" title="Vlr. Serviços ÷ Hr. Faturadas">Vlr. Hora Vendida</th></>
                ) : (
                  <>
                    <th className="px-2 text-right">Hr. Disp.</th><th className="px-2 text-right">Hr. Ausentes</th><th className="px-2 text-right">Hr. Reais</th>
                    <th className="px-2 text-right">{rotVend}</th><th className="px-2 text-right">Eficácia %</th><th className="px-1">KPI</th>
                    <th className="px-2 text-right">Hr. Gastas</th><th className="px-2 text-right">Eficiência %</th><th className="px-1">KPI</th>
                    <th className="px-2 text-right">Produtividade %</th><th className="px-1">KPI</th>
                    {vis === 'fat' && <th className="px-2 text-right" title="Valor de serviços das notas fiscais emitidas">Vlr. Serviços</th>}
                    {vis === 'fat' && <th className="px-2 text-right" title="Vlr. Serviços ÷ Hr. Vendidas (nota fiscal emitida)">Vlr. Hora Vendida</th>}
                  </>
                )}
              </tr></thead>
              <tbody>
                {visao === 'tipo' && linhasTipo(porTipo, 0)}
                {visao === 'dia' && porDia.map(d => (
                  <Fragment key={d.data}>
                    <tr className="border-b border-slate-100 hover:bg-sky-50/40 bg-slate-50/60">
                      <Rotulo nivel={0} chave={d.tipos.length ? d.data : null} negrito>{fmtData(d.data)}<span className="font-normal text-slate-500 ml-2">{diaSemana(d.data)}</span></Rotulo>
                      <Celulas t={d.t} />
                    </tr>
                    {abertos.has(d.data) && linhasTipo(d.tipos, 1)}
                  </Fragment>
                ))}
                {/* Total do mecânico no período */}
                <tr className="font-bold bg-slate-100 border-t-2 border-slate-300">
                  <td className="py-1.5 pl-2">Total</td>
                  <Celulas t={total} />
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Aba: Indicadores Consultores (Horas Vendidas — Nota Fiscal Emitida) ──────
// Hr. Disp. Reais do consultor, sempre DENTRO DA EMPRESA DELE (pedido do usuário, 12/11/2026 — o Power BI
// dividia o total das empresas filtradas): Hr. Disp. Reais dos mecânicos da empresa × (meta do consultor
// na empresa ÷ soma das metas dos consultores da empresa). Assim o número não muda com o filtro de empresas.
function linhasConsultores(diarioEsc, metasEsc) {
  const reaisEmp = new Map() // empresa → Hr. Disp. Reais dos mecânicos
  for (const l of diarioEsc) if (l.papel === 'mecanico') reaisEmp.set(l.empresa, (reaisEmp.get(l.empresa) || 0) + (Number(l.hr_disp_reais) || 0))
  const metasCons = metasEsc.filter(x => x.papel === 'consultor')
  const somaEmp = new Map() // empresa → soma das metas dos consultores
  for (const m of metasCons) somaEmp.set(m.empresa, (somaEmp.get(m.empresa) || 0) + (m.meta_horas || 0))
  const pessoas = new Map()
  const empresasDaMeta = new Map() // consultor → empresas onde ele tem meta no período
  for (const m of metasCons) {
    const k = semAcento(m.pessoa)
    const p = pessoas.get(k) || { nome: m.pessoa, meta: 0, fat: 0, vl: 0, reais: 0 }
    p.meta += m.meta_horas || 0
    const soma = somaEmp.get(m.empresa) || 0
    if (m.meta_horas > 0 && soma > 0) p.reais += (reaisEmp.get(m.empresa) || 0) * (m.meta_horas / soma)
    pessoas.set(k, p)
    if (!empresasDaMeta.has(k)) empresasDaMeta.set(k, new Set())
    empresasDaMeta.get(k).add(m.empresa)
  }
  for (const l of diarioEsc.filter(x => x.papel === 'consultor')) {
    const k = semAcento(l.pessoa)
    // Horas faturadas só da empresa do consultor (a da meta dele) — pedido do usuário, 13/11/2026: notas
    // dele em outra empresa (ex.: Juliana/CG com O.S. em Três Lagoas) entravam no faturado sem as Hr. Disp.
    // Reais daquela empresa, e a Produtividade mudava com o filtro de empresas. Sem meta no período: todas.
    const emps = empresasDaMeta.get(k)
    if (emps && !emps.has(l.empresa)) continue
    const p = pessoas.get(k) || { nome: l.pessoa, meta: 0, fat: 0, vl: 0, reais: 0 }
    p.pessoa = l.pessoa // nome como está nos relatórios (consulta do histórico)
    p.fat += Number(l.hr_vend_fat) || 0
    p.vl += Number(l.vl_servicos) || 0
    pessoas.set(k, p)
  }
  return [...pessoas.values()]
    .filter(p => p.meta > 0 || p.fat > 0)
    .map(p => {
      const reais = p.reais || null
      // Vlr. Hora Vendida = Vlr. Serviços ÷ Hr. Faturadas (nota fiscal emitida)
      return { ...p, reais, prod: reais && p.fat ? p.fat / reais : null, vlHora: p.fat && p.vl ? p.vl / p.fat : null }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

function AbaConsultores({ diarioEsc, metasEsc, pendentesEsc, reaisTotal, periodo, noEscopo, excluidos, slotBuscaOs }) {
  const rc = useContext(RegrasCorCtx)
  const [quadroMeta, setQuadroMeta] = useState(null)
  const [historico, setHistorico] = useState(null) // { pessoa, nome } — histórico do consultor
  // Busca por O.S. (lançamentos de consultor — horas da nota fiscal emitida), ao lado do Tipo de Visualização.
  const [osBusca, setOsBusca] = useState('')
  const [osEncontradas, setOsEncontradas] = useState(null)
  const buscarOs = async () => {
    const os = osBusca.trim()
    if (!os) { setOsEncontradas(null); return }
    const ls = await lerTudo(() => supabase.from('pv_prod_os').select('*').eq('os', os).eq('papel', 'consultor')
      .gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('pessoa').order('tmo'))
    setOsEncontradas(ls.filter(l => noEscopo(l.empresa, l.marca) && !excluidos.has(semAcento(l.pessoa))))
  }
  const buscaOs = (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 uppercase">OS Número</label>
      <div className="flex items-center gap-1">
        <input value={osBusca} onChange={e => setOsBusca(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarOs()}
          placeholder="Inserir OS Número" className="w-44 border border-slate-300 rounded-md px-2 py-1 text-[11px]" />
        <button type="button" onClick={buscarOs} className="p-1.5 rounded-md bg-sky-600 text-white" aria-label="Buscar O.S."><Search className="h-3.5 w-3.5" /></button>
        {osEncontradas && <button type="button" onClick={() => { setOsBusca(''); setOsEncontradas(null) }} className="p-1.5 rounded-md bg-slate-200" aria-label="Limpar busca"><X className="h-3.5 w-3.5" /></button>}
      </div>
    </div>
  )
  const linhas = useMemo(() => linhasConsultores(diarioEsc, metasEsc), [diarioEsc, metasEsc])
  const tot = linhas.reduce((s, p) => ({ meta: s.meta + p.meta, reais: s.reais + (p.reais || 0), fat: s.fat + p.fat, vl: s.vl + (p.vl || 0) }), { meta: 0, reais: 0, fat: 0, vl: 0 })

  return (
    <div className="flex flex-col gap-2">
      {slotBuscaOs ? createPortal(buscaOs, slotBuscaOs) : buscaOs}
      {osEncontradas && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 max-w-4xl">
          <p className="text-[11px] font-bold text-slate-600 mb-2">O.S. {osBusca} — {osEncontradas.length ? `${osEncontradas.length} lançamento(s)` : 'nada encontrado no período/empresa'}</p>
          {osEncontradas.length > 0 && (
            <table className="w-full text-[11px]">
              <thead><tr className="text-slate-500 border-b"><th className="text-left py-1">Data NF</th><th className="text-left">Empresa</th><th className="text-left">Consultor</th>
                <th className="text-left">Tipo O.S.</th><th className="text-left">TMO</th><th className="text-right">Hr. Faturadas</th><th className="text-right">Vlr. Serviços</th></tr></thead>
              <tbody>{osEncontradas.map((l, i) => (
                <tr key={i} className="border-b border-slate-100"><td className="py-1">{fmtData(l.data)}</td><td>{l.empresa}</td><td>{l.pessoa}</td><td>{l.tipo_os}</td><td>{l.tmo}</td>
                  <td className="text-right tabular-nums">{fmtH(Number(l.hr_vend_fat) || null)}</td><td className="text-right tabular-nums">{fmtR$(Number(l.vl_servicos) || null)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto max-w-5xl">
        <table className="w-full text-[11px]">
          <thead><tr className="text-slate-600 border-b border-sky-300">
            <th className="text-left py-2 pl-2">Consultor</th><th className="px-2 text-right">Meta Horas</th><th className="px-2 text-right">Hr. Disp. Reais</th>
            <th className="px-2 text-right">Hr. Faturadas</th><th className="px-2 text-right">Produtividade %</th><th className="px-1"></th>
            <th className="px-2 text-right" title="Valor de serviços das notas fiscais emitidas das O.S. do consultor">Vlr. Serviços</th>
            <th className="px-2 text-right" title="Vlr. Serviços ÷ Hr. Faturadas">Vlr. Hora Vendida</th></tr></thead>
          <tbody>
            {linhas.map(p => (
              <tr key={p.nome} className="border-b border-slate-100 hover:bg-sky-50/40">
                <td className="py-1 pl-2">
                  <span className="inline-flex items-center gap-1.5">{p.nome}
                    <button type="button" title="Como a Meta Horas é calculada (Planejamento de Metas)" aria-label={`Meta Horas de ${p.nome}`}
                      onClick={() => setQuadroMeta({
                        titulo: p.nome, papel: 'consultor',
                        metas: metasEsc.filter(m => m.papel === 'consultor' && semAcento(m.pessoa) === semAcento(p.nome)),
                        pendentes: pendentesEsc.filter(m => m.papel === 'consultor' && semAcento(m.pessoa) === semAcento(p.nome)),
                      })}
                      className="p-0.5 rounded text-rose-600 hover:bg-rose-100"><Target className="h-3.5 w-3.5" /></button>
                    {p.fat > 0 && (
                      <button type="button" onClick={() => setHistorico({ pessoa: p.pessoa, nome: p.nome })}
                        title="Histórico por dia e por tipo de O.S. (até o TMO)" aria-label={`Histórico de ${p.nome}`}
                        className="p-0.5 rounded text-sky-600 hover:bg-sky-100"><History className="h-3.5 w-3.5" /></button>
                    )}
                  </span>
                </td>
                <td className="px-2 text-right tabular-nums">{fmtH(p.meta || null)}</td>
                <td className="px-2 text-right tabular-nums">{fmtH(p.reais)}</td>
                <td className="px-2 text-right tabular-nums">{fmtH(p.fat || null)}</td>
                <td className="px-2 text-right tabular-nums">{fmtPct(p.prod)}</td>
                <td className="px-1 text-center"><Bolinha cor={corKpi(p.prod, 'produtividade', rc.produtividade)} /></td>
                <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(p.vl || null)}</td>
                <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(p.vlHora)}</td>
              </tr>
            ))}
            <tr className="font-bold bg-slate-50">
              <td className="py-1 pl-2">Total</td>
              <td className="px-2 text-right tabular-nums">{fmtH(tot.meta || null)}</td>
              <td className="px-2 text-right tabular-nums">{fmtH(reaisTotal)}</td>
              <td className="px-2 text-right tabular-nums">{fmtH(tot.fat || null)}</td>
              <td className="px-2 text-right tabular-nums">{fmtPct(reaisTotal && tot.fat ? tot.fat / reaisTotal : null)}</td>
              <td className="px-1 text-center"><Bolinha cor={corKpi(reaisTotal && tot.fat ? tot.fat / reaisTotal : null, 'produtividade', rc.produtividade)} /></td>
              <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(tot.vl || null)}</td>
              <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(tot.fat && tot.vl ? tot.vl / tot.fat : null)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {quadroMeta && <QuadroMeta {...quadroMeta} onClose={() => setQuadroMeta(null)} />}
      {historico && (
        <HistoricoMecanico papel="consultor" pessoa={historico.pessoa} nome={historico.nome} periodo={periodo} noEscopo={noEscopo}
          visInicial="fat" onClose={() => setHistorico(null)} />
      )}
    </div>
  )
}

// ── Aba: Indicadores - Dia ──────────────────────────────────────────────────
// Aba única Dia / Mês: Dia = período do calendário do cabeçalho; Mês = de 01/01 do ano da data final até a
// data final (com a tabela mensal, que só aparece em Mês).
function AbaDiaMes({ mecDiario, mensalEsc, boxDe, vis, periodo, metasAno, slot }) {
  const [modo, setModo] = useState('dia')
  const ano = periodo.fim ? periodo.fim.slice(0, 4) : ''
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {[['dia', 'Dia'], ['mes', 'Mês']].map(([v, r]) => (
            <button key={v} type="button" onClick={() => setModo(v)}
              className={`px-4 py-1.5 rounded-md text-[11px] font-semibold ${modo === v ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{r}</button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">
          {modo === 'dia'
            ? `Por dia, de ${fmtData(periodo.ini)} a ${fmtData(periodo.fim)} (calendário do topo).`
            : `Por mês, de 01/01/${ano} a ${fmtData(periodo.fim)} (data final do calendário do topo).`}
        </p>
      </div>
      {modo === 'dia'
        ? <AbaDia mecDiario={mecDiario} boxDe={boxDe} vis={vis} slot={slot} />
        : <AbaMensal mensalEsc={mensalEsc} metasEsc={metasAno} boxDe={boxDe} vis={vis} slot={slot} />}
    </div>
  )
}

function AbaDia({ mecDiario, boxDe, vis, slot }) {
  const [ind, setInd] = useState('eficacia')
  const [box, setBox] = useState('TODOS')
  const [pessoa, setPessoa] = useState('TODOS')
  const boxes = useMemo(() => [...new Set(mecDiario.map(l => boxDe(l.pessoa)))].sort(), [mecDiario, boxDe])
  const pessoas = useMemo(() => [...new Set(mecDiario.filter(l => box === 'TODOS' || boxDe(l.pessoa) === box).map(l => l.pessoa).filter(Boolean))].sort(), [mecDiario, box, boxDe])
  const dados = useMemo(() => {
    const dias = new Map()
    for (const l of mecDiario) {
      if (box !== 'TODOS' && boxDe(l.pessoa) !== box) continue
      if (pessoa !== 'TODOS' && l.pessoa !== pessoa) continue
      if (!dias.has(l.data)) dias.set(l.data, [])
      dias.get(l.data).push(l)
    }
    return [...dias.entries()].sort().map(([data, ls]) => { const i = indicadores(somar(ls), vis); return { data: fmtData(data), valor: i[ind], i } })
      .filter(d => d.valor != null)
  }, [mecDiario, box, pessoa, boxDe, vis, ind])

  return (
    <div className="flex flex-col gap-3">
      {/* Indicadores / Box / Produtivo — ao lado do Tipo de Visualização (slot da página) */}
      {(() => {
        const filtros = (
          <div className="flex flex-wrap items-end gap-3">
            <Seletor label="Indicadores" value={ind} onChange={setInd} largura="w-44" opcoes={INDICADORES.map(i => ({ value: i.id, label: i.label }))} />
            <Seletor label="Box" value={box} onChange={v => { setBox(v); setPessoa('TODOS') }} largura="w-44" opcoes={[{ value: 'TODOS', label: 'Todos' }, ...boxes.map(b => ({ value: b, label: b }))]} />
            <Seletor label="Produtivo" value={pessoa} onChange={setPessoa} largura="w-72" opcoes={[{ value: 'TODOS', label: 'Todos' }, ...pessoas.map(p => ({ value: p, label: p }))]} />
          </div>
        )
        return slot ? createPortal(filtros, slot) : filtros
      })()}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <ResponsiveContainer width="100%" height={380}>
          <AreaChart data={dados} margin={{ top: 24, right: 16, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="data" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
            <Tooltip content={<TooltipCalculo id={ind} vis={vis} semConta />} />
            <Area type="linear" dataKey="valor" stroke="#0284c7" fill="#7dd3fc" fillOpacity={0.5}>
              <LabelList dataKey="valor" position="top" formatter={(v) => fmtPct(v)} style={{ fontSize: 9 }} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Aba: Indicadores - Mensal ───────────────────────────────────────────────
function AbaMensal({ mensalEsc, metasEsc, boxDe, vis, slot }) {
  const [ind, setInd] = useState('eficacia')
  const [box, setBox] = useState('TODOS')
  const [pessoa, setPessoa] = useState('TODOS')
  const mec = useMemo(() => mensalEsc.filter(l => l.papel === 'mecanico'), [mensalEsc])
  const boxes = useMemo(() => [...new Set(mec.map(l => boxDe(l.pessoa)))].sort(), [mec, boxDe])
  const pessoas = useMemo(() => [...new Set(mec.filter(l => box === 'TODOS' || boxDe(l.pessoa) === box).map(l => l.pessoa).filter(Boolean))].sort(), [mec, box, boxDe])
  const filtra = useCallback((p) => (box === 'TODOS' || boxDe(p) === box) && (pessoa === 'TODOS' || semAcento(p) === semAcento(pessoa)), [box, pessoa, boxDe])

  const colunas = useMemo(() => {
    const meses = new Map()
    for (const l of mec) {
      if (!filtra(l.pessoa)) continue
      if (!meses.has(l.mes)) meses.set(l.mes, [])
      meses.get(l.mes).push(l)
    }
    return [...meses.entries()].sort().map(([mes, ls]) => {
      const a = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7))
      const meta = metasEsc.filter(x => x.papel === 'mecanico' && x.ano === a && x.mes === m && filtra(x.pessoa)).reduce((s, x) => s + (x.meta_horas || 0), 0)
      return { mes, rotulo: `${MESES[m - 1]}/${a}`, meta, ind: indicadores(somar(ls), vis) }
    })
  }, [mec, metasEsc, filtra, vis])
  const total = useMemo(() => indicadores(somar(mec.filter(l => filtra(l.pessoa))), vis), [mec, filtra, vis])
  const totalMeta = colunas.reduce((s, c) => s + c.meta, 0)

  const LINHAS = [
    ['Meta Horas', c => fmtH(c.meta || null)],
    ['Hr. Disp.', c => fmtH(c.ind.disp)],
    ['Hr. Ausentes', c => fmtH(c.ind.ausentes)],
    ['Hr. Disp. Reais', c => fmtH(c.ind.reais)],
    [vis === 'aplic' ? 'Hr. Aplicadas' : 'Hr. Vendidas', c => fmtH(c.ind.vend)],
    ['Hr. Gastas', c => fmtH(c.ind.gasto)],
    ['Eficiência %', c => fmtPct(c.ind.eficiencia)],
    ['Eficácia %', c => fmtPct(c.ind.eficacia)],
    ['Produtividade %', c => fmtPct(c.ind.produtividade)],
    ['Vlr. Serviços', c => fmtR$(c.ind.vl)],
    ['Vlr. MO/Hr', c => fmtR$(c.ind.moHr)],
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Indicadores / Box / Produtivo — ao lado do Tipo de Visualização (slot da página) */}
      {(() => {
        const filtros = (
          <div className="flex flex-wrap items-end gap-3">
            <Seletor label="Indicadores" value={ind} onChange={setInd} largura="w-44" opcoes={INDICADORES.map(i => ({ value: i.id, label: i.label }))} />
            <Seletor label="Box" value={box} onChange={v => { setBox(v); setPessoa('TODOS') }} largura="w-44" opcoes={[{ value: 'TODOS', label: 'Todos' }, ...boxes.map(b => ({ value: b, label: b }))]} />
            <Seletor label="Produtivo" value={pessoa} onChange={setPessoa} largura="w-72" opcoes={[{ value: 'TODOS', label: 'Todos' }, ...pessoas.map(p => ({ value: p, label: p }))]} />
          </div>
        )
        return slot ? createPortal(filtros, slot) : filtros
      })()}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={colunas.map(c => ({ rotulo: c.rotulo, valor: c.ind[ind], i: c.ind }))} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} interval={0} />
            <YAxis hide />
            <Tooltip content={<TooltipCalculo id={ind} vis={vis} semConta />} />
            <Bar dataKey="valor" fill="#0ea5e9">
              <LabelList dataKey="valor" position="top" formatter={(v) => fmtPct(v)} style={{ fontSize: 10 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="text-[11px] min-w-full">
          <thead><tr className="text-slate-600 border-b border-sky-300">
            <th className="text-left py-2 pl-2 sticky left-0 bg-white"></th>
            {colunas.map(c => <th key={c.mes} className="px-3 text-right whitespace-nowrap">{c.rotulo}</th>)}
            <th className="px-3 text-right">Total</th></tr></thead>
          <tbody>
            {LINHAS.map(([rot, f]) => (
              <tr key={rot} className="border-b border-slate-100">
                <td className="py-1 pl-2 pr-3 whitespace-nowrap sticky left-0 bg-white font-medium">{rot}</td>
                {colunas.map(c => <td key={c.mes} className="px-3 text-right tabular-nums whitespace-nowrap">{f(c)}</td>)}
                <td className="px-3 text-right tabular-nums font-bold whitespace-nowrap">{f({ meta: totalMeta, ind: total })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
