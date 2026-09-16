import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Package, X, ChevronDown } from 'lucide-react'
import { MOCK_BLOCO3_PECAS } from '../../data/kpiMockData'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3Pecas, salvarPeso, fetchVendedoresBalcao } from '../../services/kpiService'
import { useKpiYear } from '../../context/KpiYearContext'

const BLOCO_PESOS = 'bloco3-pecas'
const QUADRO_VENDEDOR = 'VENDEDOR DE PEÇAS'

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

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toFixed(1)}%`
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
  const [draft, setDraft]   = useState(value != null ? Math.round(value * 100) : '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState(false)

  React.useEffect(() => {
    setDraft(value != null ? Math.round(value * 100) : '')
  }, [value])

  const commit = async () => {
    const atual = value != null ? Math.round(value * 100) : ''
    if (draft === atual || draft === String(atual)) return
    const num = draft === '' ? null : Math.max(0, Math.min(100, Number(draft)))
    if (num === null || isNaN(num)) { setDraft(atual); return }
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
function VendedorSelector({ vendedores, selecionado, onSelecionar, onLimpar }) {
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
    if (!alvo) return vendedores
    return vendedores.filter(v => v.toUpperCase().includes(alvo))
  }, [busca, vendedores])

  return (
    <div className="flex items-center gap-1">
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrirNaPosicao())}
        className="w-full min-w-0 flex items-center justify-between gap-1 text-[11px] font-normal normal-case border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors"
      >
        <span className={`truncate ${selecionado ? 'text-slate-700' : 'text-slate-400'}`}>{selecionado || 'Todos os vendedores'}</span>
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
          data-dropdown-vendedor-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 max-h-56 flex flex-col bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden normal-case"
        >
          <input
            type="text"
            autoFocus
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar vendedor..."
            className="w-full text-[11px] font-normal px-2 py-1.5 border-b border-slate-100 focus:outline-none"
          />
          <div className="overflow-y-auto py-1">
            {filtrados.length === 0 ? (
              <p className="px-2 py-1.5 text-[11px] text-slate-400">Nenhum vendedor encontrado.</p>
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

function QuadroTable({ quadro, activePeriods, year, onSalvarPeso, vendedorSelector }) {
  const headerCls  = COR_HEADER[quadro.cor]    ?? COR_HEADER.blue
  const subheadCls = COR_SUBHEADER[quadro.cor] ?? COR_SUBHEADER.blue

  // Peso de cada indicador deve somar 100% dentro do quadro do gerente.
  const totalPeso = Math.round(quadro.kpis.reduce((s, k) => s + (k.pesoObj ?? 0), 0) * 100)
  const totalOk   = totalPeso === 100

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${headerCls}`}>
        <Package className="h-4 w-4 opacity-80" />
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
                  {getPeriodLabel(p, year)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
              <th />
              <th className="px-4 py-1 sticky left-0 bg-inherit">
                {vendedorSelector}
              </th>
              <th />
              <th className="px-2 py-1 text-center" title="Soma dos pesos dos indicadores desse gerente — deve fechar em 100%">
                <span className={`font-semibold ${totalOk ? 'text-slate-400' : 'text-red-600'}`}>
                  {totalPeso}%{!totalOk && ' ⚠'}
                </span>
              </th>
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
                <td className="px-4 py-2.5 font-medium text-slate-700 sticky left-0 bg-white">{row.indicador}</td>
                <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                <td className="px-3 py-2.5 text-center text-slate-500">
                  <PesoInput value={row.pesoObj} onSave={peso => onSalvarPeso(quadro.tituloGerente, row.id, peso)} />
                </td>
                {activePeriods.map(p => {
                  const d       = getPeriodData(row, p)
                  const ating   = calcAtingimento(row.orientacao, d.meta, d.realizado)
                  const contrib = (ating !== null && row.pesoObj != null) ? ating * row.pesoObj : null
                  return (
                    <React.Fragment key={p}>
                      <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">{fmtNum(d.meta, row.metrica)}</td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(d.realizado, row.metrica)}</td>
                      <td className="px-2 py-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass(ating)}`}>
                          {pct(ating)}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{pct(contrib)}</td>
                    </React.Fragment>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function KpiBloco3Pecas() {
  const periodState = usePeriodSelector('bloco3-pecas')
  const { activePeriods } = periodState
  const { year } = useKpiYear()

  // Lista de vendedores do Balcão pro seletor do quadro VENDEDOR DE PEÇAS.
  const [vendedores, setVendedores] = useState([])
  useEffect(() => {
    let ativo = true
    fetchVendedoresBalcao(year).then(lista => { if (ativo) setVendedores(lista) })
    return () => { ativo = false }
  }, [year])

  // Seleção via dropdown (não texto livre) — sempre um nome exato da lista ou nenhum.
  const [vendedorSelecionado, setVendedorSelecionado] = useState(null)

  const { data: quadros } = useKpiData(fetchBloco3Pecas, MOCK_BLOCO3_PECAS, { year, vendedor: vendedorSelecionado || undefined })

  // Overlay otimista: aplicado por cima do que veio do backend assim que o usuário
  // salva um peso, sem precisar esperar o próximo fetch pra refletir na tela.
  const [pesosOverride, setPesosOverride] = useState({})

  const handleSalvarPeso = async (tituloGerente, kpiId, peso) => {
    const key = `${tituloGerente}|${kpiId}`
    await salvarPeso({ bloco: BLOCO_PESOS, tituloGerente, kpiId, peso })
    setPesosOverride(prev => ({ ...prev, [key]: peso }))
  }

  const quadrosComPeso = quadros.map(quadro => ({
    ...quadro,
    kpis: quadro.kpis.map(kpi => {
      const key = `${quadro.tituloGerente}|${kpi.id}`
      return key in pesosOverride ? { ...kpi, pesoObj: pesosOverride[key] } : kpi
    }),
  }))

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Indicadores de Peças</h1>
        <p className="text-sm text-slate-500 mt-0.5">Indicadores de performance de peças</p>
      </div>

      <PeriodSelector state={periodState} />

      <div className="space-y-6">
        {quadrosComPeso.map((quadro, idx) => (
          <QuadroTable
            key={idx}
            quadro={quadro}
            activePeriods={activePeriods}
            year={year}
            onSalvarPeso={handleSalvarPeso}
            vendedorSelector={quadro.tituloGerente === QUADRO_VENDEDOR && (
              <VendedorSelector
                vendedores={vendedores}
                selecionado={vendedorSelecionado}
                onSelecionar={setVendedorSelecionado}
                onLimpar={() => setVendedorSelecionado(null)}
              />
            )}
          />
        ))}
      </div>
    </div>
  )
}

