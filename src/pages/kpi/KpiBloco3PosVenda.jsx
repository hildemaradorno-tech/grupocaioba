import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Wrench, Pencil } from 'lucide-react'
import OrigemIndicador from '../../components/kpi/OrigemIndicador'
import { useKpiYear } from '../../context/KpiYearContext'
import { MOCK_BLOCO3_POS_VENDA } from '../../data/kpiMockData'
import { getPeriodData, getPeriodLabel, M_PERIODS, M_LABELS } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3PosVenda, salvarPeso, salvarMetaManual } from '../../services/kpiService'
import { useExpandirQuadro } from '../../components/kpi/useExpandirQuadro'

const BLOCO_PESOS = 'bloco3-pos-venda'

// Paleta de cores por gerente (cabeçalho da seção)
const COR_HEADER = {
  blue:   'bg-blue-700   text-white',
  indigo: 'bg-indigo-700 text-white',
  violet: 'bg-violet-700 text-white',
  purple: 'bg-purple-700 text-white',
  fuchsia:'bg-fuchsia-700 text-white',
  teal:   'bg-teal-700   text-white',
}

const COR_SUBHEADER = {
  blue:   'bg-blue-50   border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200',
  violet: 'bg-violet-50 border-violet-200',
  purple: 'bg-purple-50 border-purple-200',
  fuchsia:'bg-fuchsia-50 border-fuchsia-200',
  teal:   'bg-teal-50   border-teal-200',
}

// Mesma regra do Bloco 3 - Serviços (KpiBloco3Servicos) e da Campanha.
function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null) return null
  if (orientacao === '<') {
    // Menor é melhor: realizado 0 cumpre qualquer meta; meta 0 só é cumprida com realizado 0.
    if (realizado <= 0) return 1
    return meta === 0 ? 0 : meta / realizado
  }
  if (meta === 0) return null
  return realizado / meta
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

  React.useEffect(() => {
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


// Indicadores sem meta automática: o usuário digita a meta, só na visão Mensal.
const INDICADORES_META_MANUAL = new Set(['Eficácia da Oficina', 'Produtividade da Oficina', 'Garantias com Digitação Atrasada', 'Garantias Aguardando Aprovação DAF (fora do prazo)'])  // Garantias Recusadas (fora do prazo): meta vem de Garantias DAF (sem lápis)
// Os que levam a nota "*Valores relacionados a faturamento".
const INDICADORES_NOTA_FATURAMENTO = new Set(['Eficácia da Oficina', 'Produtividade da Oficina'])

// Botão ao lado do nome do indicador: abre um painel pra digitar um valor só e aplicar em
// vários meses de uma vez (ou em todos), em vez de editar mês a mês na tabela.
function PreencherMesesButton({ onAplicar, metrica = '%' }) {
  const [aberto, setAberto]   = useState(false)
  const [valor, setValor]     = useState('')
  const [meses, setMeses]     = useState(() => new Set())
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
        title="Meta editável — clique para preencher os meses (único jeito de digitar a meta)"
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
          <label className="block text-slate-500 mb-1">Valor{metrica === '%' ? ' (%)' : ' (quantidade)'}</label>
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

// seletor: elemento opcional na linha abaixo do título das colunas (ex.: empresa do GERENTE DE PROCESSOS E QUALIDADE).
function QuadroTable({ quadro, activePeriods, mesTotalKey, year, onSalvarPeso, onSalvarMetaManual, onSalvarMetasVarios, somenteLeitura = false, seletor = null }) {
  const headerCls   = COR_HEADER[quadro.cor]   ?? COR_HEADER.blue
  const subheadCls  = COR_SUBHEADER[quadro.cor] ?? COR_SUBHEADER.blue
  const colSpanBase = 4

  // Peso de cada indicador deve somar 100% dentro do quadro do gerente.
  const totalPeso = Math.round(quadro.kpis.reduce((s, k) => s + (k.pesoObj ?? 0), 0) * 100)
  const totalOk   = totalPeso === 100

  const ex = useExpandirQuadro(quadro.tituloGerente)

  return (
    <>
    {ex.fundo}
    <div style={ex.estiloCaixa} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${ex.classeCaixa}`}>
      {/* Cabeçalho do quadro — título do gerente */}
      <div className={`px-5 py-3 flex items-center gap-2 ${headerCls}`}>
        <Wrench className="h-4 w-4 opacity-80" />
        <span className="text-sm font-bold tracking-wide">{quadro.tituloGerente}</span>
        {ex.botao}
      </div>

      <div className={ex.classeRolagem}>
        <table className="w-full text-xs whitespace-nowrap">
          <thead className={ex.classeCabecalho}>
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
              {seletor ? (
                <>
                  <th />
                  <th className="px-4 py-1 sticky left-0 bg-inherit text-left font-normal">{seletor}</th>
                  <th />
                </>
              ) : <th colSpan={colSpanBase - 1} />}
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
            {quadro.kpis.map((row, pos) => (
              <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                {/* Posição na lista (o id fica interno: pesos e metas gravados por ele). */}
                <td className="px-3 py-2.5 text-center text-slate-400 font-mono">{pos + 1}</td>
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">
                  {row.indicador}
                  <OrigemIndicador indicador={row.indicador} />
                  {!somenteLeitura && INDICADORES_META_MANUAL.has(row.indicador) && (
                    <PreencherMesesButton metrica={row.metrica} onAplicar={(meses, valor) => onSalvarMetasVarios(quadro.tituloGerente, row.id, meses, valor)} />
                  )}
                  {INDICADORES_NOTA_FATURAMENTO.has(row.indicador) && (
                    <div className="text-[10px] font-normal italic text-slate-400">*Valores relacionados a faturamento</div>
                  )}
                </td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">
                  {somenteLeitura ? (row.pesoObj ? `${Math.round(row.pesoObj * 100)}%` : '—') : <PesoInput value={row.pesoObj} onSave={peso => onSalvarPeso(quadro.tituloGerente, row.id, peso)} />}
                </td>
                {activePeriods.map(p => {
                  const d      = getPeriodData(row, p)
                  const ating  = calcAtingimento(row.orientacao, d.meta, d.realizado)
                  const contrib = (ating !== null && row.pesoObj != null) ? ating * row.pesoObj : null
                  // Meta digitada: só leitura na tabela — preenche pelo lápis "Preencher meses" do indicador.
                  return (
                    <React.Fragment key={p}>
                      <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">
                        {fmtNum(d.meta, row.metrica)}
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
                    <td className="px-2 py-2 text-center">{pct(total)}</td>
                  </React.Fragment>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
    </>
  )
}

// Ordem de exibição dos quadros de gerente por casa; os demais mantêm a ordem de origem.
const ORDEM_CASAS = [
  'GERENTE DE SERVIÇO - CAMPO GRANDE',
  'GERENTE FILIAL - CHAPADÃO DO SUL',
  'GERENTE FILIAL - DOURADOS',
  'GERENTE FILIAL - TRÊS LAGOAS',
]

function ordenarCasas(quadros) {
  const ini = quadros.findIndex(q => ORDEM_CASAS.includes(q.tituloGerente))
  if (ini < 0) return quadros
  const casas = ORDEM_CASAS.map(t => quadros.find(q => q.tituloGerente === t)).filter(Boolean)
  const outros = quadros.filter(q => !ORDEM_CASAS.includes(q.tituloGerente))
  return [...outros.slice(0, ini), ...casas, ...outros.slice(ini)]
}

// GERENTE DE PROCESSOS E QUALIDADE: sem seletor de empresa (removido a pedido) — os indicadores de garantia vêm
// com todas as empresas somadas. O backend ainda aceita ?empresaQualidade=, se um dia voltar.
export function PosVendaQuadros({ year, activePeriods, mesTotalKey, somenteLeitura = false, apenas = null }) {
  const { incluirHoje } = useKpiYear() // Matriz: período em andamento até ontem, ou até agora
  const { data: quadros } = useKpiData(fetchBloco3PosVenda, MOCK_BLOCO3_POS_VENDA, { year, incluirHoje: incluirHoje || undefined })

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

  // Quadro renomeado: dado com o nome antigo (memória da tela / backend não atualizado) aparece no nome novo.
  const quadrosComPeso = ordenarCasas(quadros)
    .map(q => (q.tituloGerente === 'GERENTE DE QUALIDADE' ? { ...q, tituloGerente: 'GERENTE DE PROCESSOS E QUALIDADE' } : q))
    .map(quadro => ({
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
        {quadrosComPeso.filter(q => !apenas || q.tituloGerente === apenas).map((quadro, idx) => (
          <QuadroTable key={idx} quadro={quadro} activePeriods={activePeriods} mesTotalKey={mesTotalKey} year={year} onSalvarPeso={handleSalvarPeso} onSalvarMetaManual={handleSalvarMetaManual} onSalvarMetasVarios={handleSalvarMetasVarios} somenteLeitura={somenteLeitura}
 />
        ))}
      </div>
  )
}

