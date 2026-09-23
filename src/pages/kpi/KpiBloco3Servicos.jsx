import React, { useState, useEffect, useMemo } from 'react'
import { Wrench, X } from 'lucide-react'
import { MOCK_BLOCO3_SERVICOS } from '../../data/kpiMockData'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3Servicos, salvarPeso, fetchConsultoresServicos, fetchMecanicos } from '../../services/kpiService'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useKpiYear } from '../../context/KpiYearContext'

const BLOCO_PESOS = 'bloco3-servicos'
const QUADRO_CONSULTOR = 'CONSULTOR DE SERVIÇOS'
const QUADRO_MECANICO  = 'MECÂNICO'
const DATALIST_CONSULTOR = 'kpi-servicos-consultores'
const DATALIST_MECANICO  = 'kpi-servicos-mecanicos'

const COR_HEADER = {
  blue:   'bg-blue-700   text-white',
  indigo: 'bg-indigo-700 text-white',
}

const COR_SUBHEADER = {
  blue:   'bg-blue-50   border-blue-200',
  indigo: 'bg-indigo-50 border-indigo-200',
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

  useEffect(() => {
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

// Campo de busca por nome (datalist nativo = digita e já filtra as opções).
// Só aplica o filtro quando o texto bate exatamente com um nome da lista
// (evita disparar fetch a cada letra digitada); texto vazio = todos.
function PessoaSelector({ datalistId, busca, onBuscaChange, onLimpar, aplicado, placeholder }) {
  return (
    <div className="flex items-center gap-1">
      <input
        list={datalistId}
        type="text"
        value={busca}
        onChange={e => onBuscaChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-w-0 text-[11px] font-normal normal-case border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 focus:outline-none focus:border-blue-400"
      />
      {busca && (
        <button onClick={onLimpar} className="text-slate-400 hover:text-red-500 shrink-0" title="Limpar seleção">
          <X size={13} />
        </button>
      )}
      {busca && !aplicado && (
        <span className="text-amber-500 shrink-0" title="Nenhum nome encontrado exatamente igual ao digitado">?</span>
      )}
    </div>
  )
}

function QuadroTable({ quadro, activePeriods, year, onSalvarPeso, pessoaSelector, icon: Icon }) {
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
                  {getPeriodLabel(p, year)}
                </th>
              ))}
            </tr>
            <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
              <th />
              <th className="px-4 py-1 sticky left-0 bg-inherit">
                {pessoaSelector}
              </th>
              <th />
              <th className="px-2 py-1 text-center" title="Soma dos pesos dos indicadores desse bloco — deve fechar em 100%">
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

// Hook interno: busca a lista de nomes (consultor/mecânico) e mantém o estado
// de busca + o nome que efetivamente bateu (exato, case-insensitive).
function usePessoaFiltro(fetchLista, year) {
  const [lista, setLista] = useState([])
  useEffect(() => {
    let ativo = true
    fetchLista(year).then(l => { if (ativo) setLista(l) })
    return () => { ativo = false }
  }, [year])

  const [busca, setBusca] = useState('')
  const aplicado = useMemo(() => {
    const alvo = busca.trim()
    if (!alvo) return null
    return lista.find(v => v.localeCompare(alvo, 'pt-BR', { sensitivity: 'base' }) === 0) || null
  }, [busca, lista])

  return { lista, busca, setBusca, aplicado }
}

export default function KpiBloco3Servicos() {
  const periodState = usePeriodSelector('bloco3-servicos')
  const { activePeriods } = periodState
  const { year } = useKpiYear()

  const consultorFiltro = usePessoaFiltro(fetchConsultoresServicos, year)
  const mecanicoFiltro  = usePessoaFiltro(fetchMecanicos, year)

  const { data: quadros, loading, source } = useKpiData(fetchBloco3Servicos, MOCK_BLOCO3_SERVICOS, {
    year,
    consultor: consultorFiltro.aplicado || undefined,
    mecanico: mecanicoFiltro.aplicado || undefined,
  })

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Indicadores de Serviços</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de performance de consultores e mecânicos da oficina</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <PeriodSelector state={periodState} />

      <datalist id={DATALIST_CONSULTOR}>
        {consultorFiltro.lista.map(v => <option key={v} value={v} />)}
      </datalist>
      <datalist id={DATALIST_MECANICO}>
        {mecanicoFiltro.lista.map(v => <option key={v} value={v} />)}
      </datalist>

      <div className="space-y-6">
        {quadrosComPeso.map((quadro, idx) => {
          const ehConsultor = quadro.tituloGerente === QUADRO_CONSULTOR
          const ehMecanico  = quadro.tituloGerente === QUADRO_MECANICO
          const filtro      = ehConsultor ? consultorFiltro : ehMecanico ? mecanicoFiltro : null
          return (
            <QuadroTable
              key={idx}
              quadro={quadro}
              activePeriods={activePeriods}
              year={year}
              onSalvarPeso={handleSalvarPeso}
              icon={Wrench}
              pessoaSelector={filtro && (
                <PessoaSelector
                  datalistId={ehConsultor ? DATALIST_CONSULTOR : DATALIST_MECANICO}
                  busca={filtro.busca}
                  onBuscaChange={filtro.setBusca}
                  onLimpar={() => filtro.setBusca('')}
                  aplicado={filtro.aplicado}
                  placeholder={ehConsultor ? 'Todos os consultores' : 'Todos os mecânicos'}
                />
              )}
            />
          )
        })}
      </div>
    </div>
  )
}
