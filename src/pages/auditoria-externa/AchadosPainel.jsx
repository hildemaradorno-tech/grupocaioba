import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, Filter, RotateCcw, Edit2, Trash2, Sparkles, ShieldAlert, Eye, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import AuditoriaExternaNav from './AuditoriaExternaNav'
import AchadoFormModal from './AchadoFormModal'
import AchadoDetalheDrawer from './AchadoDetalheDrawer'
import AuditAiChatDrawer from './AuditAiChatDrawer'
import { fmtMoeda, compararPorCodigo } from './auditExtConstants'

const FILTROS_VAZIOS = { empresa: '', norma: '' }

export default function AchadosPainel() {
  const { user, hasPermission, hasActionOrDefault } = useAuth()
  const canEditar = hasActionOrDefault('auditoria-externa/divergencias', 'editar_achado')
  const canExcluir = hasActionOrDefault('auditoria-externa/divergencias', 'excluir_achado')
  const canChatIA = hasActionOrDefault('auditoria-externa/divergencias', 'usar_chat_ia')
  const canVerImpactos = hasPermission('auditoria-externa/impactos')

  const [achados, setAchados] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useSessionState('audext_achados_filtros', FILTROS_VAZIOS)
  const [filtrosAbertos, setFiltrosAbertos] = useSessionState('audext_achados_filtros_abertos', false)
  const [modalAchado, setModalAchado] = useState(null) // null | 'novo' | item
  const [achadoDetalhe, setAchadoDetalhe] = useState(null)
  const [chatAberto, setChatAberto] = useState(false)
  const [ciclosExpandidos, setCiclosExpandidos] = useState(new Set())

  const loadDados = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [a, c, e] = await Promise.all([apiService.getAuditExtAchados(), apiService.getAuditExtCiclos(), apiService.getProjEmpresas()])
      setAchados(a)
      setCiclos(c)
      setEmpresas(e.filter(x => x.ativo !== false))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadDados() }, [loadDados])

  const normasDisponiveis = useMemo(() =>
    Array.from(new Set(achados.map(a => a.fundamentacao_tecnica).filter(Boolean))).sort(),
    [achados]
  )

  const achadosFiltrados = useMemo(() => {
    let base = achados
    if (filtros.empresa) base = base.filter(a => a.audext_ciclos?.empresa_id === filtros.empresa)
    if (filtros.norma) base = base.filter(a => a.fundamentacao_tecnica === filtros.norma)
    return [...base].sort(compararPorCodigo)
  }, [achados, filtros])

  // Divergências agrupadas por Ciclo de Auditoria.
  const gruposPorCiclo = useMemo(() => {
    const m = new Map()
    for (const a of achadosFiltrados) {
      const cicloId = a.ciclo_id
      if (!m.has(cicloId)) m.set(cicloId, { ciclo: a.audext_ciclos, achados: [] })
      m.get(cicloId).achados.push(a)
    }
    return Array.from(m.values()).sort((a, b) => {
      const na = `${a.ciclo?.proj_empresas?.nome || ''} ${a.ciclo?.periodo_competencia || ''}`
      const nb = `${b.ciclo?.proj_empresas?.nome || ''} ${b.ciclo?.periodo_competencia || ''}`
      return na.localeCompare(nb, 'pt-BR')
    })
  }, [achadosFiltrados])

  const toggleCiclo = (cicloId) => {
    setCiclosExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(cicloId)) next.delete(cicloId)
      else next.add(cicloId)
      return next
    })
  }

  const handleLimparFiltros = () => setFiltros(FILTROS_VAZIOS)

  const handleExcluir = async (item) => {
    if (!window.confirm(`Excluir o achado "${item.numero_codigo} — ${item.titulo}"? Todas as divergências vinculadas também serão excluídas.`)) return
    try {
      await apiService.deleteAuditExtAchado(item.id)
      await loadDados()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  const hasFiltroAtivo = Object.values(filtros).some(Boolean)

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm">{error}
        <button onClick={loadDados} className="ml-4 bg-blue-600 text-white px-3 py-1 rounded text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Divergências</h1>
            <p className="text-xs text-slate-500">Gestão de achados de auditoria externa e itens de divergência contábil x financeira.</p>
          </div>
          <div className="flex items-center gap-2">
            {canVerImpactos && (
              <Link
                to="/auditoria-externa/impactos"
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors shrink-0"
              >
                <Plus className="h-4 w-4 text-indigo-500" /> Novo Impacto
              </Link>
            )}
            {canChatIA && (
              <button onClick={() => setChatAberto(true)} className="flex items-center gap-1.5 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-indigo-200 transition-colors">
                <Sparkles className="h-3.5 w-3.5" /> Copiloto de Auditoria
              </button>
            )}
            {canEditar && (
              <button onClick={() => setModalAchado('novo')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
                <Plus className="h-4 w-4" /> Nova Divergência
              </button>
            )}
          </div>
        </div>
        <AuditoriaExternaNav />
      </div>

      <div>
        <button
          onClick={() => setFiltrosAbertos(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${filtrosAbertos ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          <Filter className="h-3.5 w-3.5" /> Filtros avançados
        </button>
        {filtrosAbertos && (
          <div className="mt-2 bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresa</label>
              <select value={filtros.empresa} onChange={e => setFiltros(p => ({ ...p, empresa: e.target.value }))} className="text-xs p-2 border border-slate-200 rounded-md min-w-[160px]">
                <option value="">Todas</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Norma Contábil</label>
              <select value={filtros.norma} onChange={e => setFiltros(p => ({ ...p, norma: e.target.value }))} className="text-xs p-2 border border-slate-200 rounded-md min-w-[180px]">
                <option value="">Todas</option>
                {normasDisponiveis.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {hasFiltroAtivo && (
              <button onClick={handleLimparFiltros} className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5">
                <RotateCcw className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">Carregando...</div>
      ) : achadosFiltrados.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">Nenhum achado encontrado.</div>
      ) : (
        <div className="space-y-3">
          {gruposPorCiclo.map(({ ciclo, achados: achadosDoCiclo }) => {
            const cicloId = ciclo?.id
            const cicloExpandido = ciclosExpandidos.has(cicloId)
            return (
              <div key={cicloId || 'sem-ciclo'}>
                {/* Cabeçalho do Ciclo — mesmo padrão do cabeçalho de departamento em Planejamento */}
                <div
                  className="px-5 py-3 flex items-center justify-between bg-slate-700 text-white gap-4 cursor-pointer select-none rounded-t-lg"
                  onClick={() => toggleCiclo(cicloId)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="opacity-60 shrink-0">
                      {cicloExpandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <span className="text-sm font-bold uppercase tracking-widest truncate">
                      {ciclo?.proj_empresas?.nome || '—'} · {ciclo?.periodo_competencia || '—'}
                    </span>
                  </div>
                  <span className="text-xs opacity-80 font-medium shrink-0">
                    {achadosDoCiclo.length} divergência{achadosDoCiclo.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {cicloExpandido && (
                  <div className="bg-white rounded-b-lg border border-t-0 border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full table-auto text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <th className="p-3">Código</th>
                          <th className="p-3">Título</th>
                          <th className="p-3 text-right">Total Apontado</th>
                          <th className="p-3 w-24 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {achadosDoCiclo.map(a => (
                          <tr key={a.id} className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={() => setAchadoDetalhe(a)}>
                            <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5 text-indigo-500" /> {a.numero_codigo}</td>
                            <td className="p-3">{a.titulo}</td>
                            <td className="p-3 text-right font-bold">{fmtMoeda(a.total_apontado)}</td>
                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => setAchadoDetalhe(a)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Visualizar"><Eye className="h-3.5 w-3.5" /></button>
                                {canEditar && (
                                  <button onClick={() => setModalAchado(a)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit2 className="h-3.5 w-3.5" /></button>
                                )}
                                {canExcluir && (
                                  <button onClick={() => handleExcluir(a)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalAchado && (
        <AchadoFormModal
          ciclos={ciclos}
          achado={modalAchado === 'novo' ? null : modalAchado}
          userEmail={user?.email}
          onClose={() => setModalAchado(null)}
          onSaved={async () => { setModalAchado(null); await loadDados() }}
        />
      )}

      {achadoDetalhe && (
        <AchadoDetalheDrawer
          achado={achadoDetalhe}
          onClose={() => setAchadoDetalhe(null)}
          onChanged={loadDados}
        />
      )}

      <AuditAiChatDrawer
        open={chatAberto}
        onClose={() => setChatAberto(false)}
        achadosRelacionados={achados}
      />
    </div>
  )
}
