import React from 'react'
import {
  T_PERIODS, T_LABELS,
  M_PERIODS, M_LABELS,
  MONTH_WEEK_RANGES, S_LABELS, 
} from '../../utils/kpiPeriods'

const VIEW_MODES = ['mensal', 'trimestral']
export const MODES_COM_SEMANAL = ['mensal', 'trimestral', 'semanal']
const VIEW_LABELS_MAP = { trimestral: 'Trimestral', mensal: 'Mensal', semanal: 'Semanal', anual: 'Anual' }
const ORDEM_VISAO = ['semanal', 'mensal', 'trimestral', 'anual'] // ordem dos botões de Visão

// ── helpers de data atual ────────────────────────────────────────────────────

function currentMonthKey() {
  return `m${String(new Date().getMonth() + 1).padStart(2, '0')}`
}

function currentQuarterKey() {
  const m = new Date().getMonth() + 1
  return m <= 3 ? 'q1' : m <= 6 ? 'q2' : m <= 9 ? 'q3' : 'q4'
}

function quarterDefault() {
  const q = currentQuarterKey()
  return Object.fromEntries(T_PERIODS.map(p => [p, p === q]))
}

function monthDefault() {
  const m = currentMonthKey()
  return Object.fromEntries(M_PERIODS.map(p => [p, p === m]))
}

// Visão Semanal: abre com todas as semanas do mês E o "Total do mês" marcados (pedido do usuário, 14/11/2026).
function weekDefaultForMonth(mKey) {
  const weeks = MONTH_WEEK_RANGES[mKey] || []
  const allKeys = Object.values(MONTH_WEEK_RANGES).flat()
  return { ...Object.fromEntries(allKeys.map(s => [s, weeks.includes(s)])), mtd: true }
}

// ── persistência de estado ────────────────────────────────────────────────────

function ssLoad(pageKey, field, fallback) {
  if (!pageKey) return typeof fallback === 'function' ? fallback() : fallback
  try {
    const raw = localStorage.getItem(`period_${pageKey}_${field}`)
    return raw !== null ? JSON.parse(raw) : (typeof fallback === 'function' ? fallback() : fallback)
  } catch { return typeof fallback === 'function' ? fallback() : fallback }
}

function ssSave(pageKey, field, value) {
  if (!pageKey) return
  try { localStorage.setItem(`period_${pageKey}_${field}`, JSON.stringify(value)) } catch {}
  queueMicrotask(() => window.dispatchEvent(new CustomEvent('kpi-period-sync', { detail: { pageKey, field } })))
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function usePeriodSelector(pageKey, defaultViewMode = 'mensal') {
  // Visão sempre abre em Mensal (não lê do localStorage) — só os meses/semanas/trimestres
  // marcados ficam guardados entre sessões.
  const [viewMode,  setViewModeRaw]  = React.useState(defaultViewMode)
  const [visibleT,  setVisibleTRaw]  = React.useState(() => ssLoad(pageKey, 'visibleT', quarterDefault))
  const [visibleM,  setVisibleMRaw]  = React.useState(() => ssLoad(pageKey, 'visibleM', monthDefault))
  const [weekMonth, setWeekMonthRaw] = React.useState(() => ssLoad(pageKey, 'weekMonth', currentMonthKey))
  const [visibleS,  setVisibleSRaw]  = React.useState(() => ssLoad(pageKey, 'visibleS', () => weekDefaultForMonth(currentMonthKey())))

  // Abas que usam o mesmo pageKey compartilham a seleção: quando uma altera, as outras (montadas
  // ao mesmo tempo ou abertas depois) refletem na hora.
  React.useEffect(() => {
    if (!pageKey) return
    const setters = { viewMode: setViewModeRaw, visibleT: setVisibleTRaw, visibleM: setVisibleMRaw, weekMonth: setWeekMonthRaw, visibleS: setVisibleSRaw }
    const onSync = (e) => {
      if (e.detail?.pageKey !== pageKey) return
      const set = setters[e.detail.field]
      if (!set) return
      try {
        const raw = localStorage.getItem(`period_${pageKey}_${e.detail.field}`)
        if (raw === null) return
        const val = JSON.parse(raw)
        set(prev => (JSON.stringify(prev) === raw ? prev : val))
      } catch {}
    }
    window.addEventListener('kpi-period-sync', onSync)
    return () => window.removeEventListener('kpi-period-sync', onSync)
  }, [pageKey])

  const setViewMode = (v) => { ssSave(pageKey, 'viewMode', v); setViewModeRaw(v) }

  const setVisibleT = (fn) => setVisibleTRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleT', next)
    return next
  })
  const setVisibleM = (fn) => setVisibleMRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleM', next)
    return next
  })
  const setVisibleS = (fn) => setVisibleSRaw(prev => {
    const next = typeof fn === 'function' ? fn(prev) : fn
    ssSave(pageKey, 'visibleS', next)
    return next
  })

  // Ao trocar de mês na visão semanal, pré-seleciona as semanas daquele mês.
  // Só um mês por vez — sem multi-seleção aqui.
  const setWeekMonth = React.useCallback((mKey) => {
    ssSave(pageKey, 'weekMonth', mKey)
    setWeekMonthRaw(mKey)
    setVisibleS(weekDefaultForMonth(mKey))
  }, [pageKey])

  const activePeriods = React.useMemo(() => {
    if (viewMode === 'anual')      return ['fy'] // visão Anual: a coluna do ano inteiro
    if (viewMode === 'trimestral') return T_PERIODS.filter(p => visibleT[p])
    if (viewMode === 'mensal')     return [...M_PERIODS.filter(p => visibleM[p]), ...(visibleM.fy ? ['fy'] : [])]
    // Visão semanal: semanas selecionadas + (se o pill Total estiver ligado) a coluna do total do mês.
    return [...(MONTH_WEEK_RANGES[weekMonth] || []).filter(p => visibleS[p]), ...(visibleS.mtd ? [weekMonth] : [])]
  }, [viewMode, visibleT, visibleM, weekMonth, visibleS])

  const toggleT = (p) => setVisibleT(prev => ({ ...prev, [p]: !prev[p] }))
  // Clique normal seleciona só esse mês; Ctrl/Cmd+clique acrescenta ou remove
  // esse mês da seleção atual (multi-seleção).
  const toggleM = (p, multi) => setVisibleM(prev => multi
    ? { ...prev, [p]: !prev[p] }
    : Object.fromEntries([...M_PERIODS, 'fy'].map(m => [m, m === p])))
  const toggleS = (p) => setVisibleS(prev => ({ ...prev, [p]: !prev[p] }))
  // Listas da Visão: clique = só esse item; Ctrl/Cmd+clique (multi) = soma/tira da seleção.
  const escolherT = (p, multi) => (multi ? toggleT(p)
    : setVisibleT(Object.fromEntries(T_PERIODS.map(t => [t, t === p]))))
  const escolherS = (p, multi) => (multi ? toggleS(p)
    : setVisibleS(prev => ({ ...prev, ...Object.fromEntries([...(MONTH_WEEK_RANGES[weekMonth] || []), 'mtd'].map(s => [s, s === p])) })))

  const selectAllT = () => setVisibleT(Object.fromEntries(T_PERIODS.map(p => [p, true])))
  const clearAllT  = () => setVisibleT(quarterDefault())
  const selectAllM = () => setVisibleM(Object.fromEntries([...M_PERIODS, 'fy'].map(p => [p, true])))
  const clearAllM  = () => setVisibleM(Object.fromEntries([...M_PERIODS, 'fy'].map(p => [p, p === currentMonthKey()])))
  // "Todos"/"Limpar" da lista de semanas valem também para o "Total do mês" (mtd).
  const selectAllS = () => setVisibleS(prev => ({ ...prev, ...Object.fromEntries([...(MONTH_WEEK_RANGES[weekMonth] || []), 'mtd'].map(p => [p, true])) }))
  const clearAllS  = () => setVisibleS(prev => ({ ...prev, ...Object.fromEntries([...(MONTH_WEEK_RANGES[weekMonth] || []), 'mtd'].map(p => [p, false])) }))

  return {
    viewMode, setViewMode,
    visibleT, visibleM, visibleS,
    weekMonth, setWeekMonth,
    activePeriods,
    mesTotalKey: viewMode === 'semanal' && visibleS.mtd ? weekMonth : null,
    toggleT, toggleM, toggleS, escolherT, escolherS,
    selectAllT, clearAllT, selectAllM, clearAllM, selectAllS, clearAllS,
  }
}

export function PeriodLegend() {
  return (
    <span className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ≥100%</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 80-99%</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;80%</span>
    </span>
  )
}

// ── componente ────────────────────────────────────────────────────────────────

// Lista (seletor): mostra o que está escolhido e abre a lista. Clique = só aquele item (fecha a lista);
// Ctrl/Cmd+clique = soma/tira da seleção (lista continua aberta). Todos / Limpar no rodapé.
// itens = [{ k, nome }]; marcados = { k: true }; onEscolher(k, multi).
function ListaMarcavel({ rotulo, itens, marcados, onEscolher, onTodos, onLimpar }) {
  const [aberto, setAberto] = React.useState(false)
  const caixa = React.useRef(null)
  React.useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  const escolhidos = itens.filter(i => marcados?.[i.k])
  const resumo = !escolhidos.length ? 'Nenhum'
    : escolhidos.length === itens.length ? 'Todos'
      : escolhidos.length <= 3 ? escolhidos.map(i => i.nome).join(', ')
        : `${escolhidos.length} selecionados`
  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto(a => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={`${rotulo}: ${resumo}`}
        className="inline-flex items-center gap-2 bg-white text-slate-700 text-xs font-medium rounded-md pl-2 pr-1.5 py-1 border border-slate-300 hover:border-blue-400 focus:outline-none focus:border-blue-400 min-w-[7rem] justify-between"
      >
        <span className="truncate max-w-[14rem]">{resumo}</span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true"><path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" /></svg>
      </button>
      {aberto && (
        <div role="listbox" aria-multiselectable="true" aria-label={rotulo}
          className="absolute left-0 top-full mt-1 z-40 w-52 rounded-lg border border-slate-200 bg-white shadow-lg py-1 text-xs">
          <div className="max-h-64 overflow-y-auto">
            {itens.map(i => {
              const marcado = !!marcados?.[i.k]
              return (
                <button key={i.k} type="button" role="option" aria-selected={marcado}
                  onClick={e => {
                    const multi = e.ctrlKey || e.metaKey
                    onEscolher(i.k, multi)
                    if (!multi) setAberto(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 ${marcado ? 'text-blue-800 font-semibold' : 'text-slate-700'}`}>
                  <input type="checkbox" tabIndex={-1} readOnly checked={marcado} className="h-3.5 w-3.5 pointer-events-none" aria-hidden="true" />
                  {i.nome}
                </button>
              )
            })}
          </div>
          <p className="px-3 pt-1 text-[10px] text-slate-400">Ctrl+clique para escolher mais de um</p>
          <div className="flex justify-between gap-2 border-t border-slate-100 px-3 pt-1.5 pb-1">
            <button type="button" onClick={onTodos} className="text-blue-600 hover:underline">Todos</button>
            <button type="button" onClick={onLimpar} className="text-slate-500 hover:text-red-600 hover:underline">Limpar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// Calendário de período (Matriz KPIs, 23/11/2026), com o ano junto — no lugar de "Meses"/"Períodos" + "Ano".
// Botão "Nov/2026"; abre uma grade com os meses (ou trimestres, ou só o ano) e setas para trocar o ano.
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
// tipo: 'mes' (m01…m12), 'trimestre' (q1…q4) ou 'ano' (só o ano — visão Anual).
// marcados: chaves escolhidas (['m10', 'm11']). onEscolher(k, ano): escolhe só esse (e troca o ano, se outro).
// onAlternar(k) (opcional, Mensal/Trimestral): vários do mesmo ano — cada clique marca/desmarca e a janela fica
// aberta; clicar num mês de outro ano começa a seleção de novo nele. onTodos/onLimpar: rodapé "Todos" / "Limpar".
function CalendarioMes({ marcados = [], ano, anos, onEscolher, onAlternar = null, onTodos = null, onLimpar = null, tipo = 'mes' }) {
  const trimestre = tipo === 'trimestre'
  const soAno = tipo === 'ano'
  const nomes = soAno ? [] : trimestre ? ['Q1', 'Q2', 'Q3', 'Q4'] : MESES_CURTOS
  const chave = (i) => (trimestre ? `q${i + 1}` : `m${String(i + 1).padStart(2, '0')}`)
  const [aberto, setAberto] = React.useState(false)
  const [anoVisto, setAnoVisto] = React.useState(ano)
  const caixa = React.useRef(null)
  React.useEffect(() => { if (aberto) setAnoVisto(ano) }, [aberto, ano])
  React.useEffect(() => {
    if (!aberto) return undefined
    const fora = (e) => { if (!caixa.current?.contains(e.target)) setAberto(false) }
    const esc = (e) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])
  const idxs = nomes.map((_, i) => i).filter(i => marcados.includes(chave(i)))
  const resumo = soAno ? null
    : !idxs.length ? '—'
      : idxs.length === nomes.length ? (trimestre ? 'Q1–Q4' : 'Jan–Dez')
        : idxs.length <= 3 ? idxs.map(i => nomes[i]).join(', ')
          : `${idxs.length} ${trimestre ? 'trimestres' : 'meses'}`
  const texto = soAno ? String(ano) : `${resumo}/${ano}`
  const hoje = new Date()
  const clicar = (i) => {
    if (onAlternar && anoVisto === ano) { onAlternar(chave(i)); return }
    onEscolher(chave(i), anoVisto)
    if (!onAlternar) setAberto(false)
  }
  return (
    <div ref={caixa} className="relative">
      <button type="button" onClick={() => setAberto(a => !a)} aria-haspopup="dialog" aria-expanded={aberto}
        aria-label={`${soAno ? 'Ano' : trimestre ? 'Período' : 'Mês'}: ${texto}`}
        className="inline-flex items-center gap-2 bg-white text-slate-700 text-xs font-medium rounded-md pl-2 pr-1.5 py-1 border border-slate-300 hover:border-blue-400 focus:outline-none focus:border-blue-400 min-w-[7rem] justify-between">
        <span className="inline-flex items-center gap-1.5 truncate max-w-[12rem]">
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true"><path fill="currentColor" d="M6 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V3a1 1 0 0 1 1-1zM4 9v7h12V9H4z" /></svg>
          {texto}
        </span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-500 shrink-0" aria-hidden="true"><path fill="currentColor" d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4z" /></svg>
      </button>
      {aberto && (
        <div role="dialog" aria-label={soAno ? 'Escolher ano' : trimestre ? 'Escolher trimestre' : 'Escolher mês'}
          className={`absolute left-0 top-full mt-1 z-40 rounded-lg border border-slate-200 bg-white shadow-lg p-2 text-xs ${soAno ? 'w-40' : 'w-56'}`}>
          {soAno ? (
            // Visão Anual: lista dos anos.
            <div className="grid grid-cols-2 gap-1">
              {anos.map(a => (
                <button key={a} type="button" aria-pressed={a === ano} onClick={() => { onEscolher('fy', a); setAberto(false) }}
                  className={`rounded-md py-1.5 font-medium transition-colors ${a === ano ? 'bg-blue-600 text-white'
                    : a === hoje.getFullYear() ? 'border border-blue-300 text-blue-700 hover:bg-blue-50' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {a}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <button type="button" disabled={!anos.includes(anoVisto - 1)} onClick={() => setAnoVisto(a => a - 1)} aria-label="Ano anterior"
                  className="h-6 w-6 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">‹</button>
                <span className="font-semibold text-slate-800">{anoVisto}</span>
                <button type="button" disabled={!anos.includes(anoVisto + 1)} onClick={() => setAnoVisto(a => a + 1)} aria-label="Próximo ano"
                  className="h-6 w-6 rounded hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed">›</button>
              </div>
              <div className={`grid gap-1 ${trimestre ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {nomes.map((nome, i) => {
                  const escolhido = anoVisto === ano && idxs.includes(i)
                  const atual = anoVisto === hoje.getFullYear() && i === (trimestre ? Math.floor(hoje.getMonth() / 3) : hoje.getMonth())
                  return (
                    <button key={nome} type="button" aria-pressed={escolhido} onClick={() => clicar(i)}
                      className={`rounded-md py-1.5 font-medium transition-colors ${escolhido ? 'bg-blue-600 text-white'
                        : atual ? 'border border-blue-300 text-blue-700 hover:bg-blue-50' : 'text-slate-700 hover:bg-slate-100'}`}>
                      {nome}
                    </button>
                  )
                })}
              </div>
              {onAlternar && (
                <>
                  <p className="pt-1.5 text-[10px] text-slate-400">Clique para marcar ou desmarcar (vários)</p>
                  <div className="mt-1 flex justify-between gap-2 border-t border-slate-100 pt-1.5">
                    {onTodos && <button type="button" onClick={() => { if (anoVisto !== ano) onEscolher(chave(0), anoVisto); onTodos() }} className="text-blue-600 hover:underline">Todos</button>}
                    {onLimpar && <button type="button" onClick={onLimpar} className="text-slate-500 hover:text-red-600 hover:underline">Limpar</button>}
                    <button type="button" onClick={() => setAberto(false)} className="text-slate-700 font-semibold hover:underline">OK</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// inlineTrimestral: mantido por compatibilidade (o trimestral agora sempre fica na mesma linha, como lista).
// eslint-disable-next-line no-unused-vars
// escuro: rótulos brancos em maiúsculas (cabeçalho com fundo degradê da Matriz KPIs, padrão Possibilidades).
// calendario = { ano, anos, onAno } (Matriz KPIs): Mensal e Semanal escolhem UM mês num calendário com o ano
// junto (no lugar da lista de Meses / do Mês e do seletor de Ano).
export default function PeriodSelector({ state, hideLegend = false, modes = VIEW_MODES, inlineTrimestral = false, escuro = false, calendario = null }) {
  const rotulo = escuro ? "text-[10px] font-bold text-white uppercase" : "text-xs text-slate-500"
  const {
    viewMode, setViewMode,
    visibleT, visibleM, visibleS,
    weekMonth, setWeekMonth,
    toggleM, escolherT, escolherS,
    selectAllT, clearAllT, selectAllM, clearAllM, selectAllS, clearAllS,
  } = state

  // Se o modo restaurado do storage não está mais disponível nessa tela (ex.: trimestral
  // desativado aqui), cai pro primeiro modo permitido.
  React.useEffect(() => {
    if (!modes.includes(viewMode)) setViewMode(modes[0])
  }, [modes, viewMode])

  const weekKeys = MONTH_WEEK_RANGES[weekMonth] || []

  // escuro (Matriz KPIs, 23/11/2026): nome de cada seletor ACIMA dele; fora da Matriz, ao lado (como antes).
  // Função (não componente) para não recriar o seletor a cada render — o calendário aberto não fecha sozinho.
  const campo = (titulo, controle, primeiro = false) => (escuro
    ? <div className="flex flex-col items-start gap-0.5"><span className={rotulo}>{titulo}</span>{controle}</div>
    : <><span className={`${rotulo} ${primeiro ? 'font-medium shrink-0' : 'ml-2'}`}>{titulo}:</span>{controle}</>)

  return (
    <div className="flex flex-col gap-2">
      {/* Linha 1: Visão + períodos, todos como listas (seletores). Meses/Períodos/Semanas abrem
          com caixas de marcar — dá para escolher vários. */}
      <div className={`flex flex-wrap gap-2 ${escuro ? 'items-end gap-3' : 'items-center'}`}>
        {campo('Visão', (
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            className="bg-white text-slate-700 text-xs font-medium rounded-md px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {ORDEM_VISAO.filter(m => modes.includes(m)).map(m => (
              <option key={m} value={m}>{VIEW_LABELS_MAP[m]}</option>
            ))}
          </select>
        ), true)}

        {viewMode === 'semanal' && (
          <>
            {campo('Mês', calendario ? (
              <CalendarioMes marcados={[weekMonth]} ano={calendario.ano} anos={calendario.anos}
                onEscolher={(m, a) => { setWeekMonth(m); if (a !== calendario.ano) calendario.onAno(a) }} />
            ) : (
              <select
                value={weekMonth}
                onChange={e => setWeekMonth(e.target.value)}
                className="bg-white text-slate-700 text-xs font-medium rounded-md px-2 py-1 border border-slate-300 focus:outline-none focus:border-blue-400 cursor-pointer"
              >
                {M_PERIODS.map(m => <option key={m} value={m}>{M_LABELS[m]}</option>)}
              </select>
            ))}
            {campo('Semanas', (
              <ListaMarcavel
                rotulo='Semanas'
                itens={[...weekKeys.map(p => ({ k: p, nome: S_LABELS[p] })), { k: 'mtd', nome: 'Total do mês' }]}
                marcados={visibleS}
                onEscolher={escolherS}
                onTodos={selectAllS}
                onLimpar={clearAllS}
              />
            ))}
          </>
        )}

        {viewMode === 'mensal' && calendario && campo('Mês', (
          <CalendarioMes marcados={M_PERIODS.filter(p => visibleM[p])} ano={calendario.ano} anos={calendario.anos}
            onEscolher={(m, a) => { toggleM(m, false); if (a !== calendario.ano) calendario.onAno(a) }}
            onAlternar={(m) => { if (!(visibleM[m] && M_PERIODS.filter(p => visibleM[p]).length === 1)) toggleM(m, true) }}
            onTodos={selectAllM} onLimpar={clearAllM} />
        ))}

        {viewMode === 'mensal' && !calendario && campo('Meses', (
          <ListaMarcavel
            rotulo='Meses'
            itens={[...M_PERIODS.map(p => ({ k: p, nome: M_LABELS[p] })), { k: 'fy', nome: 'Total do Ano' }]}
            marcados={visibleM}
            onEscolher={toggleM}
            onTodos={selectAllM}
            onLimpar={clearAllM}
          />
        ))}

        {viewMode === 'anual' && calendario && campo('Ano', (
          <CalendarioMes tipo='ano' ano={calendario.ano} anos={calendario.anos}
            onEscolher={(_, a) => { if (a !== calendario.ano) calendario.onAno(a) }} />
        ))}

        {viewMode === 'trimestral' && calendario && campo('Período', (
          <CalendarioMes tipo='trimestre' marcados={T_PERIODS.filter(p => visibleT[p])} ano={calendario.ano} anos={calendario.anos}
            onEscolher={(q, a) => { escolherT(q, false); if (a !== calendario.ano) calendario.onAno(a) }}
            onAlternar={(q) => { if (!(visibleT[q] && T_PERIODS.filter(p => visibleT[p]).length === 1)) escolherT(q, true) }}
            onTodos={selectAllT} onLimpar={clearAllT} />
        ))}

        {viewMode === 'trimestral' && !calendario && campo('Períodos', (
          <ListaMarcavel
            rotulo='Períodos'
            itens={T_PERIODS.map(p => ({ k: p, nome: T_LABELS[p] }))}
            marcados={visibleT}
            onEscolher={escolherT}
            onTodos={selectAllT}
            onLimpar={clearAllT}
          />
        ))}

        {!hideLegend && (
          <span className="ml-auto flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> ≥100%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 80-99%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> &lt;80%</span>
          </span>
        )}
      </div>

      {/* Trimestral: na mesma linha, como lista (ver acima). */}

    </div>
  )
}
