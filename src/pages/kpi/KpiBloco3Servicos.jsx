import React, { useMemo, useEffect, useState } from 'react'
import { Wrench } from 'lucide-react'
import { MOCK_BLOCO3_SERVICOS } from '../../data/kpiMockData'
import PeriodSelector, { usePeriodSelector } from '../../components/kpi/PeriodSelector'
import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco3Servicos } from '../../services/kpiService'
import { apiService } from '../../services/api'
import DataSourceBadge from '../../components/kpi/DataSourceBadge'
import { useKpiYear } from '../../context/KpiYearContext'

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

const SETORES_TIPO_MECANICA = 'manutencao_reparo'

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
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function QuadroTable({ quadro, activePeriods, year }) {
  const headerCls  = COR_HEADER[quadro.cor]    ?? COR_HEADER.blue
  const subheadCls = COR_SUBHEADER[quadro.cor] ?? COR_SUBHEADER.blue

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-5 py-3 flex items-center gap-2 ${headerCls}`}>
        <Wrench className="h-4 w-4 opacity-80" />
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
              <th colSpan={4} />
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
                <td className="px-3 py-2.5 text-center text-slate-500">{row.pesoObj !== null ? `${(row.pesoObj * 100).toFixed(0)}%` : '–'}</td>
                {activePeriods.map(p => {
                  const d       = getPeriodData(row, p)
                  const ating   = calcAtingimento(row.orientacao, d.meta, d.realizado)
                  const contrib = ating !== null && row.pesoObj !== null ? ating * row.pesoObj : null
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

export default function KpiBloco3Servicos() {
  const periodState = usePeriodSelector('bloco3-servicos')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const [activeTab, setActiveTabRaw] = useState(() => { try { return sessionStorage.getItem('b3s_tab') || 'mecanicos' } catch { return 'mecanicos' } })
  const [empresa, setEmpresaRaw] = useState(() => { try { return sessionStorage.getItem('b3s_empresa') || '' } catch { return '' } })
  const [mecanico, setMecanicoRaw] = useState(() => { try { return sessionStorage.getItem('b3s_mecanico') || '' } catch { return '' } })

  const setActiveTab = (v) => { try { sessionStorage.setItem('b3s_tab', v) } catch {}; setActiveTabRaw(v) }
  const setEmpresa   = (v) => { try { sessionStorage.setItem('b3s_empresa', v) } catch {}; setEmpresaRaw(v) }
  const setMecanico  = (v) => { try { sessionStorage.setItem('b3s_mecanico', v) } catch {}; setMecanicoRaw(v) }
  const [empresas, setEmpresas] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [setores, setSetores] = useState([])

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [empresasData, funcionariosData, setoresData] = await Promise.all([
          apiService.getEmpresas(),
          apiService.getFuncionarios(),
          apiService.getSetores(),
        ])
        setEmpresas(empresasData.sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
        setFuncionarios(funcionariosData.sort((a, b) => (a.nome_funcionario || '').localeCompare(b.nome_funcionario || '', 'pt-BR')))
        setSetores(setoresData)
      } catch (err) {
        console.error('Erro ao carregar opções do Bloco 3 — Serviços', err)
      }
    }
    loadOptions()
  }, [])

  const setoresMecanicaIds = useMemo(() => {
    return new Set(setores.filter(s => s.tipo_setor === SETORES_TIPO_MECANICA).map(s => s.id))
  }, [setores])

  const mecanicosDisponiveis = useMemo(() => {
    return funcionarios.filter(func => {
      if (func.ativo === false) return false
      if (empresa && String(func.empresa_id) !== String(empresa)) return false
      const ids = Array.isArray(func.setor_ids) ? func.setor_ids : func.setor_id ? [func.setor_id] : []
      return ids.some(id => setoresMecanicaIds.has(String(id)))
    })
  }, [funcionarios, empresa, setoresMecanicaIds])

  useEffect(() => {
    if (mecanico && !mecanicosDisponiveis.some(item => String(item.id) === String(mecanico))) {
      setMecanico('')
    }
  }, [mecanico, mecanicosDisponiveis])

  const { data: quadros, loading, source } = useKpiData(
    fetchBloco3Servicos,
    MOCK_BLOCO3_SERVICOS,
    { year, empresa, mecanico: activeTab === 'mecanicos' ? mecanico : '' }
  )

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Bloco 3 — Serviços</h1>
          <p className="text-sm text-slate-500 mt-0.5">Indicadores de desempenho de serviços da oficina — Matriz KPIs</p>
        </div>
        <DataSourceBadge source={source} loading={loading} />
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-sm">
        {['mecanicos', 'consultores'].map(key => {
          const label = key === 'mecanicos' ? 'Mecânicos' : 'Consultores'
          const active = activeTab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:bg-white hover:text-slate-900'}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <label className="block text-sm font-semibold text-slate-600 mb-2">Empresa</label>
          <select
            value={empresa}
            onChange={e => setEmpresa(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas as Empresas</option>
            {empresas.map(option => (
              <option key={String(option.id)} value={String(option.id)}>
                {option.empresa_fantasia || option.nome_empresa || String(option.id)}
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'mecanicos' ? (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <label className="block text-sm font-semibold text-slate-600 mb-2">Mecânico</label>
            <select
              value={mecanico}
              onChange={e => setMecanico(e.target.value)}
              disabled={mecanicosDisponiveis.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Todos os Mecânicos</option>
              {mecanicosDisponiveis.map(item => (
                <option key={String(item.id)} value={String(item.id)}>{item.nome_funcionario || item.nome || String(item.id)}</option>
              ))}
            </select>
            {empresa && mecanicosDisponiveis.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">Nenhum mecânico disponível para esta empresa.</p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <label className="block text-sm font-semibold text-slate-600 mb-2">Modo Consultores</label>
            <p className="text-sm text-slate-500">Nesta aba, o filtro de mecânico não é aplicado. Os dados refletem a visão de consultores para o mesmo conjunto de KPIs.</p>
          </div>
        )}
      </div>

      <PeriodSelector state={periodState} />

      <div className="space-y-6">
        {quadros.map((quadro, idx) => (
          <QuadroTable key={idx} quadro={quadro} activePeriods={activePeriods} year={year} />
        ))}
      </div>
    </div>
  )
}
