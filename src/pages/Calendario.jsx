import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { CalendarDays, Play, Trash2, X, AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 11 }, (_, i) => anoAtual - 2 + i)

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const SEL = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_DNG = 'inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'
const BTN_AMB = 'inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

const corDiaUtil = (du) => {
  if (du === 0)    return 'text-red-500 font-semibold'
  if (du === 0.5)  return 'text-amber-600 font-semibold'
  return 'text-emerald-700 font-semibold'
}

const BADGE_PAUSA = {
  'FERIADO':        'bg-red-100 text-red-700 border border-red-200',
  'PARADA PARCIAL': 'bg-orange-100 text-orange-700 border border-orange-200',
  'PARADA TOTAL':   'bg-rose-100 text-rose-700 border border-rose-200',
}

const formatData = (d) => d ? d.split('-').reverse().join('/') : '-'

export default function Calendario() {
  const [empresas, setEmpresas]   = useState([])
  const [dados, setDados]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)

  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('cal_empresa', '')
  const [filtroAno, setFiltroAno]         = useSessionState('cal_ano', anoAtual)

  // Modal Gerar
  const [modalGerar, setModalGerar]       = useState(false)
  const [gerandoEmpresa, setGerandoEmpresa] = useState('')
  const [gerandoAno, setGerandoAno]       = useState(anoAtual)
  const [processando, setProcessando]     = useState(false)
  const [erroModal, setErroModal]         = useState(null)

  // Modal Limpar
  const [modalLimpar, setModalLimpar]     = useState(false)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('calendario', 'editar')
  const canDelete = hasPermission('calendario', 'excluir')

  // Filtros de coluna
  const [colFiltros, setColFiltros] = useState({ mes: '', dia_semana: '', descricao_evento: '', tipo_pausa: '' })

  // Resumo meses para o rodapé
  const resumoMeses = useCallback(() => {
    const map = {}
    dados.forEach(row => {
      const k = row.mes
      if (!map[k]) map[k] = { mes: k, total: 0 }
      map[k].total = Math.max(map[k].total, row.dias_total_mes ?? 0)
    })
    return Object.values(map).sort((a, b) => a.mes - b.mes)
  }, [dados])

  useEffect(() => {
    loadEmpresas()
  }, [])

  useEffect(() => {
    if (filtroEmpresa && filtroAno) loadCalendario()
    else setDados([])
  }, [filtroEmpresa, filtroAno])

  const loadEmpresas = async () => {
    try {
      const emps = await apiService.getEmpresas()
      const sorted = [...emps].sort((a, b) =>
        (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '')
      )
      setEmpresas(sorted)
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const loadCalendario = async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await apiService.getCalendario(filtroEmpresa, filtroAno)
      setDados(rows)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRecalcular = async () => {
    if (!filtroEmpresa || !filtroAno) return
    setProcessando(true)
    setError(null)
    try {
      await apiService.gerarCalendarioAnual(filtroEmpresa, filtroAno)
      await loadCalendario()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setProcessando(false)
    }
  }

  const abrirModalGerar = () => {
    const empSel = filtroEmpresa || (empresas[0]?.id || '')
    setGerandoEmpresa(empSel)
    setGerandoAno(filtroAno || anoAtual)
    setErroModal(null)
    setModalGerar(true)
  }

  const handleGerar = async () => {
    if (!gerandoEmpresa) { setErroModal('Selecione a Empresa.'); return }
    if (!gerandoAno)     { setErroModal('Selecione o Ano.'); return }
    setProcessando(true)
    setErroModal(null)
    try {
      await apiService.gerarCalendarioAnual(gerandoEmpresa, gerandoAno)
      setModalGerar(false)
      // Sincroniza filtro com o que foi gerado
      setFiltroEmpresa(gerandoEmpresa)
      setFiltroAno(gerandoAno)
    } catch (err) {
      setErroModal(err.message || String(err))
    } finally {
      setProcessando(false)
    }
  }

  const handleLimpar = async () => {
    if (!filtroEmpresa || !filtroAno) return
    try {
      await apiService.limparCalendarioAno(filtroEmpresa, filtroAno)
      setModalLimpar(false)
      setDados([])
    } catch (err) {
      setError(err.message || String(err))
      setModalLimpar(false)
    }
  }

  const setColFiltro = (col, val) => setColFiltros(prev => ({ ...prev, [col]: val }))

  // Opções únicas para selects dos filtros de coluna
  const opsDiaSemana = useMemo(() => {
    const vals = [...new Set(dados.map(r => r.dia_semana).filter(Boolean))].sort()
    return vals
  }, [dados])

  const opsTipoPausa = useMemo(() => {
    const vals = [...new Set(dados.map(r => r.tipo_pausa).filter(Boolean))].sort()
    return vals
  }, [dados])

  const opsDescricao = useMemo(() => {
    const vals = [...new Set(dados.map(r => r.descricao_evento).filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return vals
  }, [dados])

  // Dados filtrados pelas colunas
  const dadosFiltrados = useMemo(() => {
    return dados.filter(row => {
      if (colFiltros.mes && row.mes !== Number(colFiltros.mes)) return false
      if (colFiltros.dia_semana && row.dia_semana !== colFiltros.dia_semana) return false
      if (colFiltros.descricao_evento && row.descricao_evento !== colFiltros.descricao_evento) return false
      if (colFiltros.tipo_pausa === '__COM_PAUSA__' && !row.tipo_pausa) return false
      if (colFiltros.tipo_pausa && colFiltros.tipo_pausa !== '__COM_PAUSA__' && row.tipo_pausa !== colFiltros.tipo_pausa) return false
      return true
    })
  }, [dados, colFiltros])

  const temFiltroColuna = Object.values(colFiltros).some(v => v !== '')

  const nomeEmpresaFiltro = empresas.find(e => e.id === filtroEmpresa)
  const totalDiasUteis = resumoMeses().reduce((s, m) => s + m.total, 0)

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Calendário</h1>
            <p className="text-xs text-slate-400">Motor de dias úteis para Power BI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dados.length > 0 && filtroEmpresa && filtroAno && (
            <>
              {canEdit && (
                <button onClick={handleRecalcular} className={BTN_AMB} disabled={processando} title="Reprocessa todos os dias do ano cruzando novamente com os feriados cadastrados">
                  <RefreshCw size={16} className={processando ? 'animate-spin' : ''} /> Recalcular com Feriados
                </button>
              )}
              {canDelete && (
                <button onClick={() => setModalLimpar(true)} className={BTN_DNG}>
                  <Trash2 size={16} /> Limpar Calendário do Ano
                </button>
              )}
            </>
          )}
          {canEdit && (
            <button onClick={abrirModalGerar} className={BTN_PRI}>
              <Play size={16} /> Gerar Calendário Anual
            </button>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex-1 max-w-xs">
          <label className={LBL}>Empresa</label>
          <select className={SEL} value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Selecione a empresa...</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {dados.length > 0 && (
          <button onClick={loadCalendario} className={BTN_SEC} title="Recarregar">
            <RefreshCw size={15} />
          </button>
        )}
        <div className="ml-auto flex items-center gap-6 self-end">
          <span className="text-sm text-slate-500">
            {temFiltroColuna
              ? <>{dadosFiltrados.length} <span className="text-indigo-600">filtrado(s)</span> de {dados.length} dias</>
              : <>{dados.length} dias gerados</>
            }
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* RESUMO MENSAL HORIZONTAL */}
      {dados.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 overflow-x-auto">
          <table className="text-xs border-separate border-spacing-0">
            <tbody>
              <tr>
                <td className="pr-4 py-1 text-xs font-semibold text-slate-500 whitespace-nowrap">Mês</td>
                {resumoMeses().map(m => (
                  <td key={m.mes} className="px-3 py-1 text-center font-semibold text-slate-600 uppercase whitespace-nowrap">
                    {MESES_ABR[m.mes - 1]}
                  </td>
                ))}
                <td className="px-3 py-1 text-center font-semibold text-indigo-700 whitespace-nowrap">Total</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 text-xs font-semibold text-slate-500 whitespace-nowrap">Dias Úteis</td>
                {resumoMeses().map(m => (
                  <td key={m.mes} className="px-3 py-1 text-center font-bold text-indigo-700 whitespace-nowrap">
                    {m.total.toFixed(1)}
                  </td>
                ))}
                <td className="px-3 py-1 text-center font-bold text-indigo-800 bg-indigo-50 rounded whitespace-nowrap">
                  {totalDiasUteis.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* PAINEL PRINCIPAL: tabela */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* TABELA 365 LINHAS */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full min-w-[720px] text-sm border-separate border-spacing-0">
              <thead className="bg-slate-50 sticky top-0 z-10">
                {/* Linha de títulos */}
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Data</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Dia da Semana</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Descrição Evento</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Tipo Pausa</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Dias Úteis</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Total Mês</th>
                </tr>
                {/* Linha de filtros de coluna */}
                <tr className="bg-indigo-50/60 border-b border-indigo-100">
                  {/* Data: select de mês */}
                  <th className="px-2 py-1.5">
                    <div className="relative">
                      <select
                        value={colFiltros.mes}
                        onChange={e => setColFiltro('mes', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white appearance-none"
                      >
                        <option value="">Todos os meses</option>
                        {MESES.map((nome, i) => (
                          <option key={i + 1} value={i + 1}>{nome}</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </th>
                  {/* Dia da semana: select com opções únicas */}
                  <th className="px-2 py-1.5">
                    <div className="relative">
                      <select
                        value={colFiltros.dia_semana}
                        onChange={e => setColFiltro('dia_semana', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white appearance-none"
                      >
                        <option value="">Todos</option>
                        {opsDiaSemana.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </th>
                  {/* Descrição: select com valores únicos da coluna */}
                  <th className="px-2 py-1.5">
                    <div className="relative">
                      <select
                        value={colFiltros.descricao_evento}
                        onChange={e => setColFiltro('descricao_evento', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white appearance-none"
                      >
                        <option value="">Todos</option>
                        {opsDescricao.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </th>
                  {/* Tipo Pausa: select com opções únicas */}
                  <th className="px-2 py-1.5">
                    <div className="relative">
                      <select
                        value={colFiltros.tipo_pausa}
                        onChange={e => setColFiltro('tipo_pausa', e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white appearance-none"
                      >
                        <option value="">Todos</option>
                        <option value="__COM_PAUSA__">— Com pausa —</option>
                        {opsTipoPausa.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </th>
                  {/* Dias Úteis e Total Mês: sem filtro */}
                  <th className="px-2 py-1.5">
                    {temFiltroColuna && (
                      <button
                        onClick={() => setColFiltros({ mes: '', dia_semana: '', descricao_evento: '', tipo_pausa: '' })}
                        className="w-full text-xs text-red-500 hover:text-red-700 font-semibold"
                        title="Limpar filtros de coluna"
                      >
                        Limpar
                      </button>
                    )}
                  </th>
                  <th className="px-2 py-1.5">
                    {temFiltroColuna && (
                      <span className="text-xs text-indigo-600 font-semibold">{dadosFiltrados.length}</span>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400">Processando calendário...</td></tr>
                ) : !filtroEmpresa ? (
                  <tr><td colSpan="6" className="text-center py-16 text-slate-400">Selecione uma empresa para visualizar o calendário.</td></tr>
                ) : dados.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <CalendarDays size={40} className="text-slate-300" />
                        <span>Calendário não gerado para este ano.</span>
                        <button onClick={abrirModalGerar} className={BTN_PRI}>
                          <Play size={15} /> Gerar Agora
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : dadosFiltrados.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-slate-400 text-sm">Nenhum registro corresponde aos filtros aplicados.</td></tr>
                ) : dadosFiltrados.map((row, idx) => {
                  const proxMes = dadosFiltrados[idx + 1]?.mes !== row.mes
                  const isWeekend = row.dia_semana === 'Sábado' || row.dia_semana === 'Domingo'
                  const hasPausa = !!row.tipo_pausa
                  return (
                    <tr
                      key={row.id}
                      className={[
                        proxMes ? 'border-b-2 border-indigo-200' : 'border-b border-slate-100',
                        hasPausa ? 'bg-red-50/40' : isWeekend ? 'bg-slate-100/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30',
                      ].join(' ')}
                    >
                      <td className="px-3 py-1.5 font-mono text-slate-700 text-xs">{formatData(row.data)}</td>
                      <td className="px-3 py-1.5 text-slate-600 text-xs">{row.dia_semana}</td>
                      <td className="px-3 py-1.5 text-slate-700 text-xs">{row.descricao_evento || <span className="text-slate-300">—</span>}</td>
                      <td className="px-3 py-1.5 text-center">
                        {row.tipo_pausa
                          ? <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${BADGE_PAUSA[row.tipo_pausa] || 'bg-slate-100 text-slate-600'}`}>{row.tipo_pausa}</span>
                          : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>
                      <td className={`px-3 py-1.5 text-center text-xs ${corDiaUtil(row.dias_uteis ?? 0)}`}>
                        {(row.dias_uteis ?? 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs text-slate-600 font-mono">
                        {(row.dias_total_mes ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* MODAL GERAR CALENDÁRIO */}
      {modalGerar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Play size={18} className="text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800">Gerar Calendário Anual</h2>
              </div>
              <button onClick={() => setModalGerar(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Serão gerados automaticamente os <strong>365 dias do ano</strong> com cálculo de dias úteis e cruzamento com os feriados cadastrados.
                Se já existir calendário para esta empresa/ano, ele será <strong>reprocessado</strong>.
              </p>
              <div>
                <label className={LBL}>Empresa *</label>
                <select className={SEL} value={gerandoEmpresa} onChange={e => setGerandoEmpresa(e.target.value)}>
                  <option value="">Selecione...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LBL}>Ano *</label>
                <select className={SEL} value={gerandoAno} onChange={e => setGerandoAno(Number(e.target.value))}>
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {erroModal && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  <AlertTriangle size={15} /> {erroModal}
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalGerar(false)} className={`${BTN_SEC} flex-1 justify-center`} disabled={processando}>Cancelar</button>
              <button onClick={handleGerar} className={`${BTN_PRI} flex-1 justify-center`} disabled={processando}>
                {processando
                  ? <><RefreshCw size={15} className="animate-spin" /> Processando...</>
                  : <><Play size={15} /> Gerar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIMPAR */}
      {modalLimpar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Limpar Calendário</h2>
              <p className="text-sm text-slate-500">
                Todos os <strong>{dados.length} registros</strong> de{' '}
                <strong>{nomeEmpresaFiltro?.empresa_fantasia || nomeEmpresaFiltro?.nome_empresa}</strong> — <strong>{filtroAno}</strong>{' '}
                serão excluídos. Para reprocessar, use "Gerar Calendário Anual".
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalLimpar(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleLimpar} className={`${BTN_DNG} flex-1 justify-center`}>
                <Trash2 size={15} /> Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
