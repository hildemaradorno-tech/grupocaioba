import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, Calendar, ChevronDown, RefreshCw } from 'lucide-react'
import { apiService } from '../../services/supabaseClient'
import { empresaSelecionavel } from '../../utils/comissoesElegibilidade'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Sigla no nome do arquivo RCR038 (pasta DAF Pós-Vendas) → sigla_empresa no cadastro de Empresas.
const SIGLA_ARQUIVO_EMPRESA = { CGR: 'DAF CGR', CPD: 'DAF CPD', DOU: 'DAF DOU', TLG: 'DAF TRES' }

// Sem mockup: "valor: null" = ainda sem fonte de dados (mostra —); "chave" = vem das Campanhas CRM (RCR038).
const TIPOS = ['AGENDAMENTO ATIVO', 'AGENDAMENTO RECEPTIVO']

const KPIS = [
  { label: 'Campanhas geradas', chave: 'campanhas' }, // ID_Campanha_Execucao distintos
  { label: 'Contatos gerados', chave: 'contatos' }, // contagem da coluna ID_Cliente
  { label: 'Contatos realizados', valor: null },
  { label: 'Agendamentos realizados', valor: null },
  { label: 'Contatos encerrados sem agendamento', valor: null },
]

// Velocímetros. valor/meta em %; valor null = ainda sem fonte de dados.
// junto: true = fica abaixo dos cards de situação dos agendamentos.
const GAUGES = [
  { label: 'Taxa de Contato Realizado', valor: null, meta: 80, ajuda: 'Contatos realizados ÷ contatos gerados' },
  { label: 'Taxa de Agendamento', valor: null, meta: 80, ajuda: 'Agendamentos realizados ÷ contatos realizados' },
  { label: 'Taxa de Conversão', junto: true, valor: null, meta: 80, ajuda: 'O.S abertas com agendamento ÷ agendamentos realizados' },
  { label: 'Taxa sem Agendamento', valor: null, meta: 80, ajuda: 'Contatos encerrados sem agendamento ÷ contatos realizados (quanto menor, melhor)', menorMelhor: true },
  { label: 'Taxa de No-show', junto: true, valor: null, meta: 15, ajuda: 'No-show (agendou e não compareceu) ÷ agendamentos realizados (quanto menor, melhor)', menorMelhor: true },
]

// Meia-lua: arco cinza de fundo, arco preenchido até o valor e um corte branco na meta.
// Faturamento das O.S abertas com agendamento (sem fonte ainda).
const CONVERSAO = [
  { label: 'Faturamento Peças', valor: null, cor: '#34d399' },
  { label: 'Faturamento Serviços', valor: null, cor: '#10b981' },
  { label: 'Faturamento Total', valor: null, cor: '#047857' },
]
const maxConversao = Math.max(...CONVERSAO.map(c => c.valor || 0), 1)
const fmtBRL = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

// Situação dos agendamentos (sem fonte ainda).
const SITUACAO = [
  { label: 'Agendamento com O.S aberta', valor: null, cor: '#059669' },
  { label: 'Agendamentos programados', valor: null, cor: '#3b82f6' },
  { label: 'No-show', valor: null, cor: '#dc2626' },
]
const totalSituacao = SITUACAO.some(d => d.valor === null) ? null : SITUACAO.reduce((a, d) => a + d.valor, 0)

// Evolução mensal para a aba Visão Período (sem fonte ainda: taxa/faturamento null).
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const HOJE = new Date()
const MES_ATUAL = HOJE.getMonth()
const ANO_CURTO = String(HOJE.getFullYear()).slice(2)
// Só os meses já ocorridos (jan até o mês atual) têm dado.
const EVOLUCAO = MESES.slice(0, MES_ATUAL + 1).map((m, i) => ({ idx: i, mes: `${m}/${ANO_CURTO}`, taxa: null, faturamento: null }))
const fmtMil = (v) => (v === null || v === undefined ? '' : `R$ ${(v / 1000).toLocaleString('pt-BR')} mil`)
const eixo = { fontSize: 11, fill: '#64748b' }

function CardGrafico({ titulo, vazio, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3">
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight mb-2">{titulo}</p>
      <div className="h-56">
        {vazio ? <div className="h-full flex items-center justify-center text-[11px] text-slate-400">Sem fonte de dados ainda.</div> : children}
      </div>
    </div>
  )
}

// Cor pelo atingimento da meta: < 80% vermelho, 80–99% amarelo, >= 100% verde.
// Em indicadores "quanto menor, melhor" o atingimento é meta ÷ valor.
const corAtingimento = (valor, meta, menorMelhor) => {
  const ating = menorMelhor ? (valor > 0 ? meta / valor : 1) : (meta > 0 ? valor / meta : 1)
  return ating >= 1 ? '#059669' : ating >= 0.8 ? '#eab308' : '#dc2626'
}

function GaugeMeta({ label, valor, meta, ajuda, menorMelhor }) {
  const cx = 100, cy = 100, r = 70, esp = 36
  const ponto = (pct, raio = r) => {
    const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100)
    return [cx + raio * Math.cos(a), cy - raio * Math.sin(a)]
  }
  const arco = (pct) => { const [x, y] = ponto(pct); return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}` }
  const [mx1, my1] = ponto(meta, r - esp / 2 - 1)
  const [mx2, my2] = ponto(meta, r + esp / 2 + 1)
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3" title={ajuda}>
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{label}</p>
      <svg viewBox="0 0 200 118" className="w-full max-h-40 mt-1">
        <path d={arco(100)} fill="none" stroke="#e2e8f0" strokeWidth={esp} />
        {valor !== null && valor > 0 && <path d={arco(valor)} fill="none" stroke={corAtingimento(valor, meta, menorMelhor)} strokeWidth={esp} />}
        <line x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="#fff" strokeWidth="3" />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 20, fontWeight: 700 }}>{valor === null ? '—' : `${valor}%`}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>Meta: {meta}%</text>
        <text x={cx - r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>0%</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>100%</text>
      </svg>
    </div>
  )
}

// Abas fictícias (só navegação interna do BI; conteúdo a definir).
const ABAS = ['Visão Geral', 'Visão Período']

// Multisseleção de empresas: marcar o agrupamento marca/desmarca todas as empresas dele.
function SeletorEmpresas({ grupos, selecionadas, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  const todas = grupos.flatMap(([, l]) => l)
  const nomeDe = (e) => e.empresa_fantasia || e.nome_empresa
  const alternar = (ids, marcar) => {
    const set = new Set(selecionadas)
    ids.forEach(id => (marcar ? set.add(id) : set.delete(id)))
    onChange([...set])
  }
  const resumo = selecionadas.length === 0 ? 'Todos'
    : selecionadas.length === 1 ? nomeDe(todas.find(e => e.id === selecionadas[0]) || {}) || '1 empresa'
    : `${selecionadas.length} empresas`

  const abrir = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
    }
    setAberto(a => !a)
  }

  // Mesmo visual do seletor do BI Possibilidades (lista em portal, acima de tudo), em verde.
  return (
    <>
      <button ref={ref} type="button" onClick={abrir}
        className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[180px] flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[360px] overflow-y-auto whitespace-nowrap">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionadas.length === 0 ? 'text-emerald-700' : ''}`}>
              Todos
            </button>
            {grupos.map(([nome, lista]) => {
              const ids = lista.map(e => e.id)
              const qtd = ids.filter(id => selecionadas.includes(id)).length
              return (
                <div key={nome} className="border-t border-slate-100 mt-1 pt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-bold uppercase text-[11px] text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600"
                      checked={qtd === ids.length}
                      ref={el => { if (el) el.indeterminate = qtd > 0 && qtd < ids.length }}
                      onChange={ev => alternar(ids, ev.target.checked)} />
                    {nome}
                  </label>
                  {lista.map(e => (
                    <label key={e.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600" checked={selecionadas.includes(e.id)} onChange={ev => alternar([e.id], ev.target.checked)} />
                      {nomeDe(e)}
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

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Período permitido: do dia 1 do mês até ontem (se hoje é dia 1, o mês de ontem).
const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
const DATA_MAX = iso(ontem)
const DATA_MIN = iso(new Date(ontem.getFullYear(), ontem.getMonth(), 1))
// Visão Período: do começo do ano até ontem.
const INICIO_ANO = iso(new Date(ontem.getFullYear(), 0, 1))

const inputCls = 'w-full text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40'
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function BiAgendamentoServicos() {
  const [empresas, setEmpresas] = useState([])
  const [empresasSel, setEmpresasSel] = useState([]) // vazio = todas
  const [crm, setCrm] = useState(null) // { rows, lidoEm } das Campanhas CRM
  const [carregando, setCarregando] = useState(false)
  const [erroCrm, setErroCrm] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  const [aba, setAba] = useState(ABAS[0])

  // Empresas do cadastro (sem as "visuais"), agrupadas por Agrupamento (Motos, Trucks...); só os agrupamentos Motos e Trucks (ex.: "Outras Caiobá" fica de fora).
  useEffect(() => {
    apiService.getEmpresas().then(r => setEmpresas((r || []).filter(empresaSelecionavel))).catch(() => setEmpresas([]))
  }, [])
  const grupos = useMemo(() => {
    const m = {}
    empresas.forEach(e => { if (/moto|truck/i.test(e.agrupamento_nome || '')) (m[e.agrupamento_nome] ||= []).push(e) })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [empresas])

  const carregarCrm = async (refresh = false) => {
    setCarregando(true)
    setErroCrm('')
    try {
      const r = await fetch(`${BACKEND_URL}/api/agendamento-crm/campanhas${refresh ? '/refresh' : ''}`, { method: refresh ? 'POST' : 'GET' })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`)
      setCrm(await r.json())
    } catch (e) {
      setErroCrm(`Não foi possível ler as Campanhas CRM: ${e.message}`)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregarCrm() }, [])

  const [dataIni, setDataIni] = useState(DATA_MIN)
  const [dataFim, setDataFim] = useState(DATA_MAX)
  const minIni = aba === ABAS[0] ? DATA_MIN : INICIO_ANO
  // Ao trocar de aba o período volta ao padrão dela (Visão Geral: mês atual; Visão Período: ano até ontem).
  // Contatos das campanhas dentro do período (data do arquivo) e das empresas selecionadas.
  const contatosFiltrados = useMemo(() => {
    if (!crm) return []
    const siglasSel = empresasSel.length
      ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => e.sigla_empresa))
      : null
    return crm.rows.filter(r => r.data && r.data >= dataIni && r.data <= dataFim
      && (!siglasSel || siglasSel.has(SIGLA_ARQUIVO_EMPRESA[r.sigla])))
  }, [crm, empresas, empresasSel, dataIni, dataFim])
  const numeros = {
    campanhas: new Set(contatosFiltrados.map(r => r.id_campanha_execucao)).size,
    contatos: contatosFiltrados.filter(r => r.id_cliente !== null).length,
  }

  const trocarAba = (a) => {
    setAba(a)
    setDataIni(a === ABAS[0] ? DATA_MIN : INICIO_ANO)
    setDataFim(DATA_MAX)
  }

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS (mesmo modelo de Possibilidades, em verde) */}
      {/* Sem overflow-hidden: cortava a lista do seletor de empresas. O degradê leva o próprio arredondamento. */}
      <div className="relative z-10 rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-100 via-green-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-stretch justify-between gap-4 p-5">
          {/* self-start: título no topo, na linha da "Última atualização" (como no Possibilidades) */}
          <div className="flex items-center gap-3 self-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Mesa de Agendamento</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Agendamento de Serviços — Pós-Venda</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 leading-tight">
                Última atualização: <strong className="text-slate-700">{carregando ? '...' : crm?.lidoEm ? fmtDataHora(new Date(crm.lidoEm)) : '—'}</strong>
              </p>
              <button
                type="button"
                onClick={() => carregarCrm(true)}
                disabled={carregando}
                title="Atualizar dados"
                aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {erroCrm && <p className="text-[10px] text-red-600 max-w-[420px] text-right leading-tight">{erroCrm}</p>}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas</label>
                <SeletorEmpresas grupos={grupos} selecionadas={empresasSel} onChange={setEmpresasSel} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Data</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" className={inputCls.replace("w-full ", "")} min={minIni} max={dataFim || DATA_MAX} value={dataIni} onChange={e => e.target.value && setDataIni(e.target.value)} />
                  <span className="text-slate-400 text-xs">até</span>
                  <input type="date" className={inputCls.replace("w-full ", "")} min={dataIni || minIni} max={DATA_MAX} value={dataFim} onChange={e => e.target.value && setDataFim(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
        {ABAS.map(a => (
          <button
            key={a}
            type="button"
            onClick={() => trocarAba(a)}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === a ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Tipo de Agendamentos fica fora das abas: o mesmo estado vale para Visão Geral e Visão Período. */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1 w-fit">
          <label className="text-[10px] font-bold text-slate-300 uppercase">Tipo de Agendamentos</label>
          <select className={inputCls.replace('w-full ', '')} value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {aba !== ABAS[0] ? (
        <div className="space-y-3">
          <CardGrafico titulo="Evolução da Taxa de Agendamento" vazio={EVOLUCAO.every(e => e.taxa === null)}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EVOLUCAO} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={v => [`${v}%`, 'Taxa de Agendamento']} contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="taxa" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5, fill: '#059669' }}>
                  <LabelList dataKey="taxa" position="top" offset={10} style={{ fontSize: 11, fill: '#475569' }} formatter={v => `${v}%`} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardGrafico>
          <CardGrafico titulo="Evolução do Faturamento Convertido" vazio={EVOLUCAO.every(e => e.faturamento === null)}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EVOLUCAO} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000} mil`} />
                <Tooltip formatter={v => [fmtBRL(v), 'Faturamento convertido']} contentStyle={{ fontSize: 11 }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="faturamento" fill="#059669" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="faturamento" position="top" style={{ fontSize: 10, fill: '#475569' }} formatter={fmtMil} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardGrafico>
        </div>
      ) : (
      <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPIS.map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-lg p-3 flex gap-2.5">
            <div className="w-1 rounded bg-red-400 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{k.label}</p>
              <p className="text-base font-bold text-slate-900 mt-1">{k.chave ? (carregando && !crm ? '...' : numeros[k.chave].toLocaleString('pt-BR')) : (k.valor ?? '—')}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {GAUGES.filter(g => !g.junto).map(g => <GaugeMeta key={g.label} {...g} />)}
      </div>

      {/* Situação dos agendamentos em cards; abaixo, Taxa de Conversão, No-show e Conversão — Resultado. */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ label: 'Agendamentos realizados', valor: totalSituacao, cor: '#1e1b4b' }, ...SITUACAO].map(d => (
            <div key={d.label} className="bg-white border border-slate-200 rounded-lg p-3 flex gap-2.5">
              <div className="w-1 rounded shrink-0" style={{ backgroundColor: d.cor }} />
              <div>
                <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{d.label}</p>
                <p className="text-base font-bold text-slate-900 mt-1">{d.valor ?? '—'}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Abaixo da Taxa de Conversão: cards de passagens por chassi e O.S aberta com agendamento (sem fonte ainda). */}
          {GAUGES.filter(g => g.junto).map(g => g.label === 'Taxa de Conversão' ? (
            <div key={g.label} className="space-y-3">
              <GaugeMeta {...g} />
              {['Quantidade de passagem por chassi', 'Quantidade de O.S aberta com agendamento'].map(t => (
                <div key={t} className="bg-white border border-slate-200 rounded-lg p-3 flex gap-2.5">
                  <div className="w-1 rounded bg-red-400 shrink-0" />
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{t}</p>
                    <p className="text-base font-bold text-slate-900 mt-1">—</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <GaugeMeta key={g.label} {...g} />)}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-indigo-950 leading-tight">Conversão — Resultado</p>
            {/* Barras horizontais proporcionais ao maior valor (Total). */}
            <div className="space-y-3 mt-3">
              {CONVERSAO.map(c => (
                <div key={c.label}>
                  <div className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-slate-600">{c.label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{fmtBRL(c.valor)}</span>
                  </div>
                  <div className="h-4 bg-slate-100 rounded mt-1 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${((c.valor || 0) / maxConversao) * 100}%`, backgroundColor: c.cor }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      <p className="text-xs text-slate-400">— = indicador ainda sem fonte de dados.</p>
    </div>
  )
}
