import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { CalendarDays, Play, Trash2, X, AlertTriangle, RefreshCw, ChevronDown, ChevronRight, Building2 } from 'lucide-react'
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
const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa

const FILTROS_VAZIOS = { mes: '', dia_semana: '', descricao_evento: '', tipo_pausa: '' }

// Detalhes do calendário de uma empresa — só é montado (e só busca dados) quando o card está aberto.
function CalendarioEmpresaDetalhe({ empresa, ano, canEdit, canDelete, versao, onLimpo }) {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processando, setProcessando] = useState(false)
  const [modalLimpar, setModalLimpar] = useState(false)
  const [colFiltros, setColFiltros] = useState(FILTROS_VAZIOS)

  const loadCalendario = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setDados(await apiService.getCalendario(empresa.id, ano))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [empresa.id, ano])

  useEffect(() => { loadCalendario() }, [loadCalendario, versao])

  const resumoMeses = useMemo(() => {
    const map = {}
    dados.forEach(row => {
      const k = row.mes
      if (!map[k]) map[k] = { mes: k, total: 0 }
      map[k].total = Math.max(map[k].total, row.dias_total_mes ?? 0)
    })
    return Object.values(map).sort((a, b) => a.mes - b.mes)
  }, [dados])
  const totalDiasUteis = resumoMeses.reduce((s, m) => s + m.total, 0)

  const gerar = async () => {
    setProcessando(true)
    setError(null)
    try {
      await apiService.gerarCalendarioAnual(empresa.id, ano)
      await loadCalendario()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setProcessando(false)
    }
  }

  const handleLimpar = async () => {
    try {
      await apiService.limparCalendarioAno(empresa.id, ano)
      setDados([])
      onLimpo()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setModalLimpar(false)
    }
  }

  const setColFiltro = (col, val) => setColFiltros(prev => ({ ...prev, [col]: val }))

  const opsDiaSemana = useMemo(() => [...new Set(dados.map(r => r.dia_semana).filter(Boolean))].sort(), [dados])
  const opsTipoPausa = useMemo(() => [...new Set(dados.map(r => r.tipo_pausa).filter(Boolean))].sort(), [dados])
  const opsDescricao = useMemo(() => [...new Set(dados.map(r => r.descricao_evento).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [dados])

  const dadosFiltrados = useMemo(() => dados.filter(row => {
    if (colFiltros.mes && row.mes !== Number(colFiltros.mes)) return false
    if (colFiltros.dia_semana && row.dia_semana !== colFiltros.dia_semana) return false
    if (colFiltros.descricao_evento && row.descricao_evento !== colFiltros.descricao_evento) return false
    if (colFiltros.tipo_pausa === '__COM_PAUSA__' && !row.tipo_pausa) return false
    if (colFiltros.tipo_pausa && colFiltros.tipo_pausa !== '__COM_PAUSA__' && row.tipo_pausa !== colFiltros.tipo_pausa) return false
    return true
  }), [dados, colFiltros])

  const temFiltroColuna = Object.values(colFiltros).some(v => v !== '')

  const selectFiltro = (col, todosLabel, opcoes) => (
    <div className="relative">
      <select
        value={colFiltros[col]}
        onChange={e => setColFiltro(col, e.target.value)}
        className="w-full text-xs border border-slate-300 rounded px-2 py-1 pr-6 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white appearance-none"
      >
        <option value="">{todosLabel}</option>
        {opcoes}
      </select>
      <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )

  return (
    <div className="border-t border-slate-200 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {temFiltroColuna && (
          <span className="text-sm text-slate-500">
            {dadosFiltrados.length} <span className="text-indigo-600">filtrado(s)</span> de {dados.length} dias
          </span>
        )}
        {dados.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={loadCalendario} className={BTN_SEC} title="Recarregar"><RefreshCw size={15} /></button>
            {canEdit && (
              <button onClick={gerar} className={BTN_AMB} disabled={processando} title="Reprocessa todos os dias do ano cruzando novamente com os feriados cadastrados">
                <RefreshCw size={16} className={processando ? 'animate-spin' : ''} /> Recalcular com Feriados
              </button>
            )}
            {canDelete && (
              <button onClick={() => setModalLimpar(true)} className={BTN_DNG}>
                <Trash2 size={16} /> Limpar Calendário do Ano
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {dados.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 overflow-x-auto">
          <table className="text-xs border-separate border-spacing-0">
            <tbody>
              <tr>
                <td className="pr-4 py-1 text-xs font-semibold text-slate-500 whitespace-nowrap">Mês</td>
                {resumoMeses.map(m => (
                  <td key={m.mes} className="px-3 py-1 text-center font-semibold text-slate-600 uppercase whitespace-nowrap">{MESES_ABR[m.mes - 1]}</td>
                ))}
                <td className="px-3 py-1 text-center font-semibold text-indigo-700 whitespace-nowrap">Total</td>
              </tr>
              <tr>
                <td className="pr-4 py-1 text-xs font-semibold text-slate-500 whitespace-nowrap">Dias Úteis</td>
                {resumoMeses.map(m => (
                  <td key={m.mes} className="px-3 py-1 text-center font-bold text-indigo-700 whitespace-nowrap">{m.total.toFixed(1)}</td>
                ))}
                <td className="px-3 py-1 text-center font-bold text-indigo-800 bg-indigo-50 rounded whitespace-nowrap">{totalDiasUteis.toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[520px]">
          <table className="w-full min-w-[720px] text-sm border-separate border-spacing-0">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Data</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Dia da Semana</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Descrição Evento</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Tipo Pausa</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Dias Úteis</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide border-b border-slate-200">Total Mês</th>
              </tr>
              <tr className="bg-indigo-50/60 border-b border-indigo-100">
                <th className="px-2 py-1.5">
                  {selectFiltro('mes', 'Todos os meses', MESES.map((nome, i) => <option key={i + 1} value={i + 1}>{nome}</option>))}
                </th>
                <th className="px-2 py-1.5">
                  {selectFiltro('dia_semana', 'Todos', opsDiaSemana.map(d => <option key={d} value={d}>{d}</option>))}
                </th>
                <th className="px-2 py-1.5">
                  {selectFiltro('descricao_evento', 'Todos', opsDescricao.map(d => <option key={d} value={d}>{d}</option>))}
                </th>
                <th className="px-2 py-1.5">
                  {selectFiltro('tipo_pausa', 'Todos', <>
                    <option value="__COM_PAUSA__">— Com pausa —</option>
                    {opsTipoPausa.map(t => <option key={t} value={t}>{t}</option>)}
                  </>)}
                </th>
                <th className="px-2 py-1.5">
                  {temFiltroColuna && (
                    <button onClick={() => setColFiltros(FILTROS_VAZIOS)} className="w-full text-xs text-red-500 hover:text-red-700 font-semibold" title="Limpar filtros de coluna">
                      Limpar
                    </button>
                  )}
                </th>
                <th className="px-2 py-1.5">
                  {temFiltroColuna && <span className="text-xs text-indigo-600 font-semibold">{dadosFiltrados.length}</span>}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400">Processando calendário...</td></tr>
              ) : dados.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12 text-slate-400 text-sm">Sem registros para este ano.</td></tr>
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
                    <td className={`px-3 py-1.5 text-center text-xs ${corDiaUtil(row.dias_uteis ?? 0)}`}>{(row.dias_uteis ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-center text-xs text-slate-600 font-mono">{(row.dias_total_mes ?? 0).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modalLimpar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Limpar Calendário</h2>
              <p className="text-sm text-slate-500">
                Todos os <strong>{dados.length} registros</strong> de <strong>{nomeEmpresa(empresa)}</strong> — <strong>{ano}</strong>{' '}
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

export default function Calendario() {
  const [empresas, setEmpresas] = useState([])
  const [idsComCalendario, setIdsComCalendario] = useState(null)
  const [error, setError]       = useState(null)

  const [filtroAno, setFiltroAno] = useSessionState('cal_ano', anoAtual)
  const [abertas, setAbertas]     = useSessionState('cal_abertas', [])
  // Incrementa após gerar pelo modal do cabeçalho, pra os cards abertos rebuscarem os dados.
  const [versao, setVersao]       = useState(0)

  const [modalGerar, setModalGerar]         = useState(false)
  const [gerandoEmpresa, setGerandoEmpresa] = useState('')
  const [gerandoAno, setGerandoAno]         = useState(anoAtual)
  const [processando, setProcessando]       = useState(false)
  const [erroModal, setErroModal]           = useState(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('calendario', 'editar')
  const canDelete = hasPermission('calendario', 'excluir')

  useEffect(() => {
    apiService.getEmpresas()
      .then(emps => setEmpresas([...emps].sort((a, b) => nomeEmpresa(a).localeCompare(nomeEmpresa(b), 'pt-BR'))))
      .catch(err => setError(err.message || String(err)))
  }, [])

  useEffect(() => {
    setIdsComCalendario(null)
    apiService.getEmpresaIdsComCalendario(filtroAno)
      .then(ids => setIdsComCalendario(new Set(ids)))
      .catch(err => { setError(err.message || String(err)); setIdsComCalendario(new Set()) })
  }, [filtroAno, versao])

  const empresasComCalendario = idsComCalendario ? empresas.filter(e => idsComCalendario.has(e.id)) : []

  const alternarAberta = (id) =>
    setAbertas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const abrirModalGerar = () => {
    setGerandoEmpresa(abertas[0] || empresas[0]?.id || '')
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
      setFiltroAno(gerandoAno)
      setAbertas(prev => prev.includes(gerandoEmpresa) ? prev : [...prev, gerandoEmpresa])
      setVersao(v => v + 1)
    } catch (err) {
      setErroModal(err.message || String(err))
    } finally {
      setProcessando(false)
    }
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Calendário</h1>
            <p className="text-xs text-slate-400">Motor de dias úteis para Power BI</p>
          </div>
        </div>
        {canEdit && (
          <button onClick={abrirModalGerar} className={BTN_PRI}>
            <Play size={16} /> Gerar Calendário Anual
          </button>
        )}
      </div>

      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="w-32">
          <label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {empresasComCalendario.map(emp => {
          const aberta = abertas.includes(emp.id)
          return (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 size={16} className="text-indigo-500 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800 truncate">{nomeEmpresa(emp)}</span>
                  {emp.sigla_empresa && <span className="text-xs text-slate-400">{emp.sigla_empresa}</span>}
                </div>
                <button onClick={() => alternarAberta(emp.id)} className={BTN_SEC}>
                  {aberta ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                  {aberta ? 'Fechar detalhes' : 'Abrir detalhes'}
                </button>
              </div>
              {aberta && (
                <CalendarioEmpresaDetalhe empresa={emp} ano={filtroAno} canEdit={canEdit} canDelete={canDelete} versao={versao} onLimpo={() => setVersao(v => v + 1)} />
              )}
            </div>
          )
        })}
        {idsComCalendario && empresasComCalendario.length === 0 && !error && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Nenhum calendário gerado para {filtroAno}. Use "Gerar Calendário Anual".
          </div>
        )}
      </div>

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
                  {empresas.map(e => <option key={e.id} value={e.id}>{nomeEmpresa(e)}</option>)}
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
                {processando ? <><RefreshCw size={15} className="animate-spin" /> Processando...</> : <><Play size={15} /> Gerar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
