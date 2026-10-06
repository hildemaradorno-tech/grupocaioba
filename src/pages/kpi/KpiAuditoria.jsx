import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { M_PERIODS, M_LABELS } from '../../utils/kpiPeriods'
import { useKpiYear } from '../../context/KpiYearContext'
import { useSessionState } from '../../hooks/useSessionState'
import { useKpiSourceStatus } from '../../context/KpiSourceStatusContext'
import { fetchAuditoria } from '../../services/kpiService'


// Store module-level — persiste entre navegações; evita spinner ao voltar para a página
const _cache = new Map()

function fmtVal(v, tipo) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (tipo === 'un') return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  if (tipo === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  if (tipo === 'h')  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' h'
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

// Indicadores da auditoria (mesmos ids do backend). Só o escolhido é calculado.
const INDICADORES_AUDITORIA = [
  { id: 1,  nome: 'Faturamento Total Oficina' },
  { id: 2,  nome: 'Faturamento Total Peças Oficina' },
  { id: 3,  nome: 'Faturamento Total Serviços Oficina' },
  { id: 4,  nome: 'Margem Bruta Serviços' },
  { id: 5,  nome: 'Margem Bruta Peças Oficina' },
  { id: 6,  nome: 'Eficácia da Oficina' },
  { id: 7,  nome: 'Produtividade da Oficina' },
  { id: 8,  nome: 'Eficiência da Oficina' },
  { id: 9,  nome: 'Faturamento Total Peças Balcão' },
  { id: 10, nome: 'Margem Bruta Peças Balcão' },
  { id: 11, nome: 'Faturamento TRP' },
  { id: 12, nome: 'Ticket Médio da Oficina' },
]

// Botão "i" com painel (portal, position:fixed) mostrando de onde a linha vem: arquivo, coluna
// e filtros aplicados. Fecha ao clicar fora, rolar ou redimensionar.
function InfoFonte({ info }) {
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)
  const aberto = !!pos

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (painelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setPos(null)
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

  if (!info) return null
  const abrir = () => {
    const r = btnRef.current.getBoundingClientRect()
    const largura = 340
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)), largura })
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setPos(null) : abrir())}
        className="ml-1.5 inline-flex align-middle text-slate-400 hover:text-blue-600 transition-colors"
        title="De onde vem este valor"
      >
        <Info size={13} />
      </button>
      {aberto && createPortal(
        <div
          ref={painelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.largura }}
          className="z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-[11px] text-slate-600 whitespace-normal normal-case font-normal"
        >
          <p className="font-semibold text-slate-700">Arquivo</p>
          <p className="mb-1.5">{info.arquivo}</p>
          <p className="font-semibold text-slate-700">Coluna utilizada</p>
          <p className="mb-1.5">{info.coluna}</p>
          <p className="font-semibold text-slate-700">Filtros</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {info.filtros.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>,
        document.body
      )}
    </>
  )
}

const EMPRESAS_AUDITORIA = [
  { key: 'CAMPO GRANDE', nome: 'Campo Grande' },
  { key: 'DOURADOS', nome: 'Dourados' },
  { key: 'CHAPADÃO DO SUL', nome: 'Chapadão' },
  { key: 'TRÊS LAGOAS', nome: 'Três Lagoas' },
]

// Dropdown com várias opções marcadas (checkboxes), Todos e Limpar.
function SeletorMultiplo({ rotulo, opcoes, valores, onChange, textoVazio, unico = false, larguraCls = 'min-w-[11rem]' }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!aberto) return
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])
  const resumo = valores.length === 0 ? textoVazio
    : unico ? opcoes.find(o => o.value === valores[0])?.label ?? textoVazio
    : valores.length === opcoes.length ? 'Todos'
    : opcoes.filter(o => valores.includes(o.value)).map(o => o.label).join(', ')
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(a => !a)}
        className="flex items-center gap-2 whitespace-nowrap text-xs border border-slate-300 rounded-md px-2 py-1.5 bg-white text-slate-700 hover:border-blue-400 focus:outline-none focus:border-blue-400 ${larguraCls} justify-between">
        <span><span className="text-slate-400 mr-1">{rotulo}:</span>{resumo}</span>
        <span className="text-slate-400">▾</span>
      </button>
      {aberto && (
        <div className="absolute z-30 mt-1 left-0 min-w-full max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg p-2 text-xs">
          {unico ? opcoes.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange([o.value]); setAberto(false) }}
              className={`w-full text-left whitespace-nowrap py-1 px-1 rounded hover:bg-slate-50 ${valores.includes(o.value) ? 'font-semibold text-blue-700' : ''}`}>
              {o.label}
            </button>
          )) : (
            <>
              <div className="flex justify-between pb-1.5 mb-1.5 border-b border-slate-100">
                <button type="button" onClick={() => onChange(opcoes.map(o => o.value))} className="text-blue-600 hover:underline">Todos</button>
                <button type="button" onClick={() => onChange([])} className="text-red-500 hover:underline">Limpar</button>
              </div>
              {opcoes.map(o => (
                <label key={o.value} className="flex items-center gap-2 whitespace-nowrap py-1 px-1 rounded hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={valores.includes(o.value)}
                    onChange={() => onChange(valores.includes(o.value) ? valores.filter(v => v !== o.value) : [...valores, o.value])} />
                  {o.label}
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function KpiAuditoria() {
  const { year } = useKpiYear()
  // Meses escolhidos (um, alguns ou todos): viram as colunas da tabela, na ordem do ano.
  const [mesesSel, setMesesSel] = useSessionState('kpi_auditoria_meses_v2', [`m${String(new Date().getMonth() + 1).padStart(2, '0')}`])
  const activePeriods = M_PERIODS.filter(m => mesesSel.includes(m))
  const toggleMes = (m, multi) => setMesesSel(prev => multi
    ? (prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
    : [m])

  // Empresas escolhidas (uma, várias ou nenhuma = todas). Valor enviado: nomes separados por vírgula.
  const [empresas, setEmpresas] = useSessionState('kpi_auditoria_empresas', [])
  const empKey = empresas.length ? empresas.join(',') : 'todas'
  const toggleEmpresa = (k) => setEmpresas(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k])
  const [indicadorId, setIndicadorId] = useSessionState('kpi_auditoria_indicador_v2', null)

  // Inicializa do store para exibir dados imediatamente ao voltar à página
  const initKey    = `${year}:todas:${indicadorId}`
  const initCached = _cache.get(initKey)

  const [rows,       setRows]       = useState(initCached?.indicadores ?? [])
  const [loading,    setLoading]    = useState(!initCached)
  const [source,     setSource]     = useState(null)
  // O selo "Dados sincronizados" mora no cabeçalho da Matriz KPIs; aqui só publica o status.
  const { setStatus } = useKpiSourceStatus()
  useEffect(() => { setStatus({ source, loading }) }, [source, loading, setStatus])
  const [meta,       setMeta]       = useState(initCached?.metaData    ?? null)

  async function load(extra = {}) {
    if (!indicadorId || empresas.length === 0) { setRows([]); setMeta(null); setLoading(false); return }
    const isForce = !!extra._forceReload
    const key     = `${year}:${empKey}:${indicadorId}`
    if (!_cache.has(key) || isForce) setLoading(true)
    try {
      const result = await fetchAuditoria({ year, empresa: empKey, indicador: indicadorId, ...extra })
      if (result.data) {
        _cache.set(key, result.data)
        setRows(result.data.indicadores ?? [])
        setMeta(result.data.metaData)
      } else {
        setRows([])
      }
      setSource(result.source)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [year, empKey, indicadorId])

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.id]) acc[row.id] = { indicador: row.indicador, rows: [] }
    acc[row.id].rows.push(row)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Fontes</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <SeletorMultiplo
          rotulo="Indicador"
          unico
          larguraCls="w-[26rem]"
          opcoes={INDICADORES_AUDITORIA.map(i => ({ value: i.id, label: `${i.id} — ${i.nome}` }))}
          valores={indicadorId ? [indicadorId] : []}
          onChange={arr => setIndicadorId(arr[0] ?? null)}
          textoVazio="Selecione um indicador"
        />
        <SeletorMultiplo
          rotulo="Empresa"
          opcoes={EMPRESAS_AUDITORIA.map(e => ({ value: e.key, label: e.nome }))}
          valores={empresas}
          onChange={setEmpresas}
          textoVazio="Selecione uma empresa"
        />
        <SeletorMultiplo
          rotulo="Meses"
          opcoes={M_PERIODS.map(m => ({ value: m, label: M_LABELS[m] }))}
          valores={mesesSel}
          onChange={setMesesSel}
          textoVazio="Selecione os meses"
        />
      </div>

      {!indicadorId || empresas.length === 0 ? (
        <div className="text-sm text-slate-400 py-10 text-center">{!indicadorId ? 'Selecione um indicador para calcular.' : 'Selecione uma empresa para calcular.'}</div>
      ) : loading ? (
        <div className="text-sm text-slate-400 py-10 text-center">Carregando dados...</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-slate-400 py-10 text-center">Sem dados disponíveis para {year}.</div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([id, group]) => {
            return (
              <div key={id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-2 font-medium text-slate-500 sticky left-0 bg-slate-50 min-w-[180px]">Fonte</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-500 min-w-[240px]">Nome Coluna / Métrica</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-500">Tipo</th>
                          {activePeriods.map(p => (
                            <th key={p} className="text-right px-3 py-2 font-semibold text-blue-700 border-l border-slate-200 min-w-[110px]">
                              {M_LABELS[p]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row, i) => {
                          const isResult = row.fonte === 'RESULTADO'
                          const rowClass = isResult
                            ? 'bg-slate-100 font-semibold border-t-2 border-slate-300'
                            : 'border-b border-slate-100'
                          return (
                            <tr key={i} className={rowClass}>
                              <td className={`px-4 py-2 sticky left-0 bg-white ${isResult ? 'bg-slate-100 font-semibold' : ''}`}>
                                {isResult ? <span className="font-bold text-slate-800">RESULTADO</span> : row.fonte}
                                {!isResult && <InfoFonte info={row.info} />}
                              </td>
                              <td className="px-4 py-2 text-slate-600">{row.metrica}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  row.tipo === '%' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                                }`}>{row.tipo}</span>
                              </td>
                              {activePeriods.map(p => (
                                <td key={p} className={`px-3 py-2 text-right border-l border-slate-100 ${
                                  isResult ? 'text-slate-900 font-bold' : 'text-slate-600'
                                }`}>
                                  {fmtVal(row.valores?.[p], row.tipo)}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
