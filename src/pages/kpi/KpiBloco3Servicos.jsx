import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Wrench, X, ChevronDown, Pencil } from 'lucide-react'
import { MOCK_BLOCO3_SERVICOS } from '../../data/kpiMockData'
import PeriodSelector, { usePeriodSelector, PeriodLegend, MODES_COM_SEMANAL } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel, M_PERIODS, M_LABELS } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3Servicos, salvarPeso, salvarMetaManual, fetchConsultoresServicos, fetchMecanicos } from '../../services/kpiService'
import { useKpiYear } from '../../context/KpiYearContext'
import { useAuth } from '../../context/AuthContext'
import { PosVendaQuadros } from './KpiBloco3PosVenda'

const BLOCO_PESOS = 'bloco3-servicos'
const QUADRO_CONSULTOR = 'CONSULTOR DE SERVIÇOS'
const QUADRO_MECANICO  = 'MECÂNICO'
const QUADRO_OFICINA   = 'SETOR DE MECÂNICA'
const QUADRO_CHEFE_OFICINA = 'CHEFE DE OFICINA'
const QUADRO_FUNILARIA = 'SETOR FUNILARIA/PINTURA'
const EMPRESAS_OFICINA = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']

const COR_HEADER = {
  blue:   'bg-blue-700   text-white',
  indigo: 'bg-indigo-700 text-white',
  teal:   'bg-teal-700   text-white',
  purple: 'bg-purple-700 text-white',
  amber:  'bg-amber-700  text-white',
}

const COR_SUBHEADER = {
  blue:   'bg-blue-50   border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  teal:   'bg-teal-50   border-teal-200',
  purple: 'bg-purple-50 border-purple-200',
  amber:  'bg-amber-50  border-amber-200',
}

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function pctAting(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function fmtNum(v, metrica) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (metrica === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

// Input editável do "Peso" — grava no Supabase ao sair do campo (onBlur/Enter),
// pra ficar igual pra qualquer usuário que abrir essa tela.
function PesoInput({ value, onSave }) {
  const [draft, setDraft]   = useState(value ? Math.round(value * 100) : '') // 0 / sem peso = campo vazio
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState(false)

  useEffect(() => {
    setDraft(value ? Math.round(value * 100) : '')
  }, [value])

  const commit = async () => {
    const atual = value ? Math.round(value * 100) : ''
    if (draft === atual || draft === String(atual)) return
    // Campo apagado = sem peso (grava 0) — não precisa digitar 0.
    const num = draft === '' ? 0 : Math.max(0, Math.min(100, Number(draft)))
    if (isNaN(num)) { setDraft(atual); return }
    setSaving(true)
    setErro(false)
    try {
      await onSave(num / 100)
    } catch (err) {
      console.warn('[KPI] Falha ao salvar peso:', err.message)
      setErro(true)
      setDraft(atual)
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex items-center justify-center gap-0.5">
      <input
        type="number" min={0} max={100} step={1}
        value={draft}
        disabled={saving}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`w-12 text-center border rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 disabled:opacity-50 ${
          erro ? 'border-red-400' : 'border-slate-200'
        }`}
      />
      <span className="text-slate-400">%</span>
    </span>
  )
}

// Dropdown de busca próprio (não usa <input list>/<datalist> nativo — o navegador desenha a
// lista de sugestões sem nenhum controle de estilo/posição, o que ficava estranho dentro da
// tabela). O painel é montado via portal com position:fixed (mesmo padrão de DropdownAcao em
// HistoricoComissoes.jsx) pra escapar do overflow-hidden/overflow-x-auto do card da tabela —
// um simples position:absolute ficaria cortado ali dentro.
function PessoaSelector({ lista, selecionado, onSelecionar, onLimpar, placeholderTodos, placeholderBusca, vazioMsg }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)

  const abrirNaPosicao = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 224) })
    }
    setAberto(true)
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (painelRef.current && painelRef.current.contains(e.target)) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  useEffect(() => { if (!aberto) setBusca('') }, [aberto])

  const filtrados = useMemo(() => {
    const alvo = busca.trim().toUpperCase()
    if (!alvo) return lista
    return lista.filter(v => v.toUpperCase().includes(alvo))
  }, [busca, lista])

  return (
    <div className="flex items-center gap-1">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrirNaPosicao())}
        className="w-full min-w-0 flex items-center justify-between gap-1 text-[11px] font-normal normal-case border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors"
      >
        <span className={`truncate ${selecionado ? 'text-slate-700' : 'text-slate-400'}`}>{selecionado || placeholderTodos}</span>
        <ChevronDown size={12} className="text-slate-400 shrink-0" />
      </button>
      {selecionado && (
        <button onClick={onLimpar} className="text-slate-400 hover:text-red-500 shrink-0" title="Limpar seleção">
          <X size={13} />
        </button>
      )}
      {aberto && pos && createPortal(
        <div
          ref={painelRef}
          data-dropdown-pessoa-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-56 flex flex-col bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden normal-case"
        >
          <input
            type="text"
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={placeholderBusca}
            className="w-full text-[11px] font-normal px-2 py-1.5 border-b border-slate-100 focus:outline-none"
          />
          <div className="overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-slate-400">{vazioMsg}</p>
            ) : filtrados.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => { onSelecionar(v); setAberto(false) }}
                className={`w-full text-left px-2 py-1.5 text-[11px] font-normal hover:bg-slate-50 transition-colors ${v === selecionado ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Indicadores sem meta automática: o usuário digita a meta, só na visão Mensal (Consultor de
// Serviços e Mecânico, que não têm fonte de meta pra Eficácia/Produtividade da Oficina).
const INDICADORES_META_MANUAL = new Set(['Eficácia da Oficina', 'Produtividade da Oficina'])

// Mesmo padrão de PosVendaQuadros/KpiBloco3PosVenda.jsx: a meta digitada mês a mês fica
// gravada no Supabase (kpi_metas_manuais) e não se perde.
function MetaInput({ value, onSave }) {
  const [draft, setDraft]   = useState(value != null ? value : '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState(false)

  useEffect(() => {
    setDraft(value != null ? value : '')
  }, [value])

  const commit = async () => {
    const atual = value != null ? value : ''
    if (draft === '' || draft === atual || draft === String(atual)) { setDraft(atual); return }
    const num = Number(draft)
    if (isNaN(num)) { setDraft(atual); return }
    setSaving(true)
    setErro(false)
    try {
      await onSave(num)
    } catch (err) {
      console.warn('[KPI] Falha ao salvar meta:', err.message)
      setErro(true)
      setDraft(atual)
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="inline-flex items-center justify-center gap-0.5">
      <input
        type="number" step="0.01"
        value={draft}
        disabled={saving}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`w-14 text-center border rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 disabled:opacity-50 ${
          erro ? 'border-red-400' : 'border-slate-200'
        }`}
      />
      <span className="text-slate-400">%</span>
    </span>
  )
}

// Botão ao lado do nome do indicador (fundo amarelo, pra deixar evidente que a meta pode ser
// digitada): abre um painel com um valor só, aplicado em vários meses de uma vez (ou todos).
function PreencherMesesButton({ onAplicar }) {
  const [aberto, setAberto]     = useState(false)
  const [valor, setValor]       = useState('')
  const [meses, setMeses]       = useState(() => new Set())
  const [salvando, setSalvando] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (painelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const abrir = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const alturaPainel = 260
      const larguraPainel = 256
      const cabeNoRodape = r.bottom + 6 + alturaPainel <= window.innerHeight
      const top = cabeNoRodape ? r.bottom + 6 : Math.max(8, r.top - alturaPainel - 6)
      const left = Math.min(r.left, window.innerWidth - larguraPainel - 8)
      setPos({ top, left: Math.max(8, left) })
    }
    setAberto(true)
  }

  const toggleMes = (m) => setMeses(prev => {
    const next = new Set(prev)
    next.has(m) ? next.delete(m) : next.add(m)
    return next
  })
  const todosMarcados = meses.size === M_PERIODS.length
  const marcarTodos = () => setMeses(todosMarcados ? new Set() : new Set(M_PERIODS))

  const aplicar = async () => {
    const num = Number(valor)
    if (valor === '' || isNaN(num) || meses.size === 0) return
    setSalvando(true)
    try {
      await onAplicar([...meses], num)
      setAberto(false)
      setValor('')
      setMeses(new Set())
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrir())}
        title="Meta editável — clique para digitar"
        className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded align-middle bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 transition-colors"
      >
        <Pencil size={10} />
      </button>
      {aberto && pos && createPortal(
        <div
          ref={painelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
          className="z-50 w-64 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs normal-case font-normal text-left"
        >
          <p className="font-semibold text-slate-700 mb-2">Preencher meses</p>
          <label className="block text-slate-500 mb-1">Valor (%)</label>
          <input
            type="number" step="0.01" autoFocus
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="w-full border border-slate-200 rounded px-2 py-1 mb-2 focus:outline-none focus:border-blue-400"
          />
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500">Meses</span>
            <button type="button" onClick={marcarTodos} className="text-blue-600 hover:underline">
              {todosMarcados ? 'Limpar' : 'Todos'}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 mb-3">
            {M_PERIODS.map(m => (
              <button
                key={m} type="button" onClick={() => toggleMes(m)}
                className={`px-1.5 py-1 rounded border text-[11px] ${
                  meses.has(m) ? 'bg-blue-950 text-white border-blue-950' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                }`}
              >
                {M_LABELS[m]}
              </button>
            ))}
          </div>
          <button
            type="button" onClick={aplicar}
            disabled={salvando || valor === '' || meses.size === 0}
            className="w-full py-1.5 rounded bg-blue-600 text-white font-semibold disabled:opacity-50 hover:bg-blue-700 transition-colors"
          >
            {salvando ? 'Salvando…' : 'Aplicar'}
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

// ocultarValores: quadro com seletor de funcionário (Consultor/Mecânico) sem ninguém selecionado —
// os valores só aparecem depois de escolher o nome.
function QuadroTable({ quadro, activePeriods, mesTotalKey, year, onSalvarPeso, onSalvarMetaManual, onSalvarMetasVarios, somenteLeitura = false, pessoaSelector, ocultarValores = false, icon: Icon }) {
  const headerCls  = COR_HEADER[quadro.cor]    ?? COR_HEADER.blue
  const subheadCls = COR_SUBHEADER[quadro.cor] ?? COR_SUBHEADER.blue

  // Peso de cada indicador deve somar 100% dentro do quadro.
  const totalPeso = Math.round(quadro.kpis.reduce((s, k) => s + (k.pesoObj ?? 0), 0) * 100)
  const totalOk   = totalPeso === 100

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${headerCls}`}>
        <Icon className="h-4 w-4 opacity-80" />
        <span className="text-sm font-bold tracking-wide">{quadro.tituloGerente}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead>
            <tr className={`border-b ${subheadCls}`}>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500 w-8">#</th>
              <th className="text-left px-4 py-2.5 font-medium text-slate-600 sticky left-0 bg-inherit min-w-[240px]">Indicador (KPI)</th>
              <th className="text-center px-2 py-2.5 font-medium text-slate-500">Or.</th>
              <th className="text-center px-3 py-2.5 font-medium text-slate-500">Peso</th>
              {activePeriods.map(p => (
                <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                  {p === mesTotalKey ? 'Total' : getPeriodLabel(p, year)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
              <th />
              <th className="px-4 py-1 sticky left-0 bg-inherit">
                {pessoaSelector}
                {ocultarValores && <span className="block mt-0.5 text-[10px] font-normal text-amber-600">Selecione um funcionário para ver os valores</span>}
              </th>
              <th />
              <th className="px-2 py-1" />
              {activePeriods.map(p => (
                <React.Fragment key={p}>
                  <th className="px-2 py-1.5 text-slate-400 font-medium border-l border-slate-200">Meta</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">Real.</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">% Ating.</th>
                  <th className="px-2 py-1.5 text-slate-400 font-medium">Contrib.</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {quadro.kpis.map(row => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{row.id}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">
                  {row.indicador}
                  {!somenteLeitura && INDICADORES_META_MANUAL.has(row.indicador) && (
                    <PreencherMesesButton onAplicar={(meses, valor) => onSalvarMetasVarios(quadro.tituloGerente, row.id, meses, valor)} />
                  )}
                  {INDICADORES_META_MANUAL.has(row.indicador) && (
                    <div className="text-[10px] font-normal italic text-slate-400">*Valores relacionados a faturamento</div>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">
                  {somenteLeitura ? (row.pesoObj ? `${Math.round(row.pesoObj * 100)}%` : '—') : <PesoInput value={row.pesoObj} onSave={peso => onSalvarPeso(quadro.tituloGerente, row.id, peso)} />}
                </td>
                {activePeriods.map(p => {
                  const d       = getPeriodData(row, p)
                  const ating   = calcAtingimento(row.orientacao, d.meta, d.realizado)
                  const contrib = (ating !== null && row.pesoObj != null) ? ating * row.pesoObj : null
                  const metaEditavel = !somenteLeitura && INDICADORES_META_MANUAL.has(row.indicador) && /^m\d{2}$/.test(p)
                  if (ocultarValores) {
                    // Meta digitada (Eficácia/Produtividade) é do quadro, não da pessoa: o campo continua.
                    return (
                      <React.Fragment key={p}>
                        <td className="px-2 py-2.5 text-center text-slate-300 border-l border-slate-100">
                          {metaEditavel
                            ? <MetaInput value={d.meta} onSave={valor => onSalvarMetaManual(quadro.tituloGerente, row.id, p, valor)} />
                            : '—'}
                        </td>
                        <td className="px-2 py-2.5 text-center text-slate-300">—</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">—</td>
                        <td className="px-2 py-2.5 text-center text-slate-300">—</td>
                      </React.Fragment>
                    )
                  }
                  return (
                    <React.Fragment key={p}>
                      <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">
                        {metaEditavel
                          ? <MetaInput value={d.meta} onSave={valor => onSalvarMetaManual(quadro.tituloGerente, row.id, p, valor)} />
                          : fmtNum(d.meta, row.metrica)}
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(d.realizado, row.metrica)}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass(ating)}`}>
                          {pctAting(ating)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{pct(contrib)}</td>
                    </React.Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-700">
              <td className="text-center px-3 py-2" />
              <td className="px-4 py-2 sticky left-0 bg-slate-50">Total</td>
              <td className="text-center px-2 py-2" />
              <td className="text-center px-3 py-2">{totalPeso}%</td>
              {activePeriods.map(p => {
                const contribs = quadro.kpis.map(row => {
                  const d = getPeriodData(row, p)
                  const a = calcAtingimento(row.orientacao, d.meta, d.realizado)
                  return (a !== null && row.pesoObj != null) ? a * row.pesoObj : null
                }).filter(v => v !== null)
                const total = contribs.length ? contribs.reduce((s, v) => s + v, 0) : null
                return (
                  <React.Fragment key={p}>
                    <td colSpan={3} className="border-l border-slate-200" />
                    <td className="px-2 py-2 text-center">{ocultarValores ? '—' : pct(total)}</td>
                  </React.Fragment>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function usePessoaFiltro(fetchLista, year, empresa) {
  const [lista, setLista] = useState([])
  const [aplicado, setAplicado] = useState(null)
  useEffect(() => {
    let ativo = true
    fetchLista(year, empresa).then(l => { if (ativo) setLista(l) })
    return () => { ativo = false }
  }, [year, empresa])
  // Troca de empresa: a pessoa selecionada pode não existir mais na lista nova.
  useEffect(() => { setAplicado(null) }, [empresa])
  return { lista, aplicado, setAplicado }
}

// Nome normalizado (sem acento, maiúsculo, espaços simples) para comparar listas de pessoas.
const normNomePessoa = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

// pessoasPermitidas (opcional): só esses nomes aparecem nos seletores de Consultor/Mecânico — usado no
// pop-up da Campanha Pós-Venda, para listar só as pessoas da empresa selecionada lá.
function ServicosQuadros({ year, activePeriods, mesTotalKey, somenteLeitura = false, apenas = null, pessoasPermitidas = null, empresaOficinaInicial = null }) {
  const permitidos = pessoasPermitidas ? new Set(pessoasPermitidas.map(normNomePessoa)) : null

  const consultorFiltro = usePessoaFiltro(fetchConsultoresServicos, year)
  const mecanicoFiltro  = usePessoaFiltro(fetchMecanicos, year)

  // SETOR DE MECÂNICA/CHEFE DE OFICINA/SETOR FUNILARIA-PINTURA não têm pessoa — exigem escolher a
  // empresa (mesma exigência do Consultor/Mecânico exigir pessoa) pra mostrar o valor; sem isso o
  // total somava as 4 casas juntas.
  const [empresaOficina, setEmpresaOficina] = useState(EMPRESAS_OFICINA.includes(empresaOficinaInicial) ? empresaOficinaInicial : null)
  const [empresaChefeOficina, setEmpresaChefeOficina] = useState(EMPRESAS_OFICINA.includes(empresaOficinaInicial) ? empresaOficinaInicial : null)
  const [empresaFunilaria, setEmpresaFunilaria] = useState(EMPRESAS_OFICINA.includes(empresaOficinaInicial) ? empresaOficinaInicial : null)

  const { data: quadros } = useKpiData(fetchBloco3Servicos, MOCK_BLOCO3_SERVICOS, {
    year,
    consultor: consultorFiltro.aplicado || undefined,
    mecanico: mecanicoFiltro.aplicado || undefined,
    empresaOficina: empresaOficina || undefined,
    empresaChefeOficina: empresaChefeOficina || undefined,
    empresaFunilaria: empresaFunilaria || undefined,
  })

  // Overlay otimista: aplicado por cima do que veio do backend assim que o usuário
  // salva um peso, sem precisar esperar o próximo fetch pra refletir na tela.
  const [pesosOverride, setPesosOverride] = useState({})

  const handleSalvarPeso = async (tituloGerente, kpiId, peso) => {
    const key = `${tituloGerente}|${kpiId}`
    await salvarPeso({ bloco: BLOCO_PESOS, tituloGerente, kpiId, peso })
    setPesosOverride(prev => ({ ...prev, [key]: peso }))
  }

  // Overlay otimista das metas digitadas manualmente (Eficácia/Produtividade da Oficina),
  // mesmo padrão do peso acima, mas a chave inclui o período (mês) gravado.
  const [metasOverride, setMetasOverride] = useState({})

  const handleSalvarMetaManual = async (tituloGerente, kpiId, periodKey, valor) => {
    const key = `${tituloGerente}|${kpiId}|${periodKey}`
    await salvarMetaManual({ bloco: BLOCO_PESOS, tituloGerente, kpiId, ano: year, mes: Number(periodKey.slice(1)), valor })
    setMetasOverride(prev => ({ ...prev, [key]: valor }))
  }

  // Preencher vários meses de uma vez com o mesmo valor (botão ao lado do indicador).
  const handleSalvarMetasVarios = async (tituloGerente, kpiId, meses, valor) => {
    await Promise.all(meses.map(periodKey =>
      salvarMetaManual({ bloco: BLOCO_PESOS, tituloGerente, kpiId, ano: year, mes: Number(periodKey.slice(1)), valor })
    ))
    setMetasOverride(prev => {
      const next = { ...prev }
      for (const periodKey of meses) next[`${tituloGerente}|${kpiId}|${periodKey}`] = valor
      return next
    })
  }

  const quadrosComPeso = quadros.map(quadro => ({
    ...quadro,
    kpis: quadro.kpis.map(kpi => {
      const key = `${quadro.tituloGerente}|${kpi.id}`
      let k = key in pesosOverride ? { ...kpi, pesoObj: pesosOverride[key] } : kpi
      const prefixo = `${quadro.tituloGerente}|${kpi.id}|`
      for (const [ovKey, valor] of Object.entries(metasOverride)) {
        if (!ovKey.startsWith(prefixo)) continue
        const periodKey = ovKey.slice(prefixo.length)
        k = { ...k, [periodKey]: { ...(k[periodKey] ?? { meta: null, realizado: null }), meta: valor } }
      }
      return k
    }),
  }))

  return (
      <div className="space-y-6">
        {quadrosComPeso.filter(q => !apenas || q.tituloGerente === apenas).map((quadro, idx) => {
          const ehConsultor     = quadro.tituloGerente === QUADRO_CONSULTOR
          const ehMecanico      = quadro.tituloGerente === QUADRO_MECANICO
          const ehOficina       = quadro.tituloGerente === QUADRO_OFICINA
          const ehChefeOficina  = quadro.tituloGerente === QUADRO_CHEFE_OFICINA
          const ehFunilaria     = quadro.tituloGerente === QUADRO_FUNILARIA
          const ehPorEmpresa    = ehOficina || ehChefeOficina || ehFunilaria
          const filtro      = ehConsultor ? consultorFiltro : ehMecanico ? mecanicoFiltro
            : ehOficina ? { lista: EMPRESAS_OFICINA, aplicado: empresaOficina, setAplicado: setEmpresaOficina }
            : ehChefeOficina ? { lista: EMPRESAS_OFICINA, aplicado: empresaChefeOficina, setAplicado: setEmpresaChefeOficina }
            : ehFunilaria ? { lista: EMPRESAS_OFICINA, aplicado: empresaFunilaria, setAplicado: setEmpresaFunilaria }
            : null
          return (
            <QuadroTable
              key={idx}
              quadro={quadro}
              activePeriods={activePeriods}
              mesTotalKey={mesTotalKey}
              year={year}
              onSalvarPeso={handleSalvarPeso}
              onSalvarMetaManual={handleSalvarMetaManual}
              onSalvarMetasVarios={handleSalvarMetasVarios}
              somenteLeitura={somenteLeitura}
              ocultarValores={!!filtro && !filtro.aplicado}
              icon={Wrench}
              pessoaSelector={filtro && (
                <PessoaSelector
                  lista={ehPorEmpresa ? filtro.lista : (permitidos ? filtro.lista.filter(n => permitidos.has(normNomePessoa(n))) : filtro.lista)}
                  selecionado={filtro.aplicado}
                  onSelecionar={filtro.setAplicado}
                  onLimpar={() => filtro.setAplicado(null)}
                  placeholderTodos={ehConsultor ? 'Todos os consultores' : ehMecanico ? 'Todos os mecânicos' : 'Selecione a empresa'}
                  placeholderBusca={ehConsultor ? 'Buscar consultor...' : ehMecanico ? 'Buscar mecânico...' : 'Buscar empresa...'}
                  vazioMsg={ehConsultor ? 'Nenhum consultor encontrado.' : ehMecanico ? 'Nenhum mecânico encontrado.' : 'Nenhuma empresa encontrada.'}
                />
              )}
            />
          )
        })}
      </div>
  )
}

// Aba única "Serviços": quadros de Pós-Venda (gerentes) primeiro; Consultor e Mecânico por último.
export default function KpiBloco3Servicos() {
  const periodState = usePeriodSelector('kpi-matriz')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('kpi/bloco3-servicos', 'editar')

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Indicadores de Serviços</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de performance da oficina, consultores e mecânicos</p>
        </div>
        <PeriodLegend />
      </div>

      <PeriodSelector state={periodState} inlineTrimestral hideLegend modes={MODES_COM_SEMANAL} />

      <PosVendaQuadros year={year} activePeriods={activePeriods} mesTotalKey={periodState.mesTotalKey} somenteLeitura={!canEdit} />
      <ServicosQuadros year={year} activePeriods={activePeriods} mesTotalKey={periodState.mesTotalKey} somenteLeitura={!canEdit} />
    </div>
  )
}

// Visualização do Bloco 3 - Serviços só para consulta (pop-up da Campanha Pós-Venda): sem edição de
// peso/meta, na visão Semanal do ano/mês recebidos. Seleção de período própria (não grava nem altera
// a seleção da Matriz KPIs).
// empresa (opcional): casa já escolhida nos quadros OFICINA / CHEFE DE OFICINA (a da Campanha).
export function Bloco3ServicosVisualizacao({ ano, mes, quadro = null, pessoas = null, empresa = null }) {
  const periodState = usePeriodSelector(null, 'semanal')
  const { activePeriods, setWeekMonth, toggleS } = periodState
  const doServicos = [QUADRO_CONSULTOR, QUADRO_MECANICO, QUADRO_OFICINA, QUADRO_CHEFE_OFICINA, QUADRO_FUNILARIA].includes(quadro)
  useEffect(() => {
    if (mes >= 1 && mes <= 12) {
      setWeekMonth(`m${String(mes).padStart(2, '0')}`) // marca as semanas do mês (e desmarca o Total)
      toggleS('mtd') // já abre com a coluna Total (do mês) marcada
    }
  }, [mes]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector state={periodState} inlineTrimestral hideLegend modes={MODES_COM_SEMANAL} />
        <PeriodLegend />
      </div>
      {/* quadro: só o quadro do bloco de onde o pop-up foi aberto (ex.: CONSULTOR DE SERVIÇOS). */}
      {(!quadro || !doServicos) && <PosVendaQuadros year={ano} activePeriods={activePeriods} mesTotalKey={periodState.mesTotalKey} somenteLeitura apenas={quadro} />}
      {(!quadro || doServicos) && <ServicosQuadros year={ano} activePeriods={activePeriods} mesTotalKey={periodState.mesTotalKey} somenteLeitura apenas={quadro} pessoasPermitidas={pessoas} empresaOficinaInicial={empresa} />}
    </div>
  )
}
