import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Edit2, Trash2, CheckCircle2, RotateCcw, Clock, User, Eye, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import AuditoriaExternaNav from './AuditoriaExternaNav'
import PlanoAcaoFormModal from './PlanoAcaoFormModal'
import AchadoFormModal from './AchadoFormModal'
import AchadoDetalheDrawer from './AchadoDetalheDrawer'
import PlanoDetalheDrawer from './PlanoDetalheDrawer'
import { STATUS_PLANO_MAP, Badge, fmtData, fmtMoeda, PercentualBar, compararPorCodigo, calcularPercentualAtingidoAchado, calcularPercentualPlano, statusAgregadoAchado } from './auditExtConstants'

const PROXIMO_STATUS = { pendente: 'em_andamento', em_andamento: 'concluido', concluido: 'validado_auditoria' }
const ANTERIOR_STATUS = { em_andamento: 'pendente', concluido: 'em_andamento', validado_auditoria: 'concluido' }

export default function PlanoAcaoPainel() {
  const { user, hasPermission, hasActionOrDefault } = useAuth()
  const canEditar = hasActionOrDefault('auditoria-externa/plano-acao', 'editar_plano')
  const canValidar = hasActionOrDefault('auditoria-externa/plano-acao', 'validar_plano_acao')
  const canVerTiposAcao = hasPermission('auditoria-externa/tipos-acao')
  const canEditarAchado = hasActionOrDefault('auditoria-externa/divergencias', 'editar_achado')

  const [planos, setPlanos] = useState([])
  const [achados, setAchados] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)
  const [ciclosExpandidos, setCiclosExpandidos] = useState(new Set())
  const [expandidos, setExpandidos] = useState(new Set())
  const [modalPlano, setModalPlano] = useState(null) // null | { tipo: 'novo', achadoId } | { tipo: 'editar', plano }
  const [achadoDetalhe, setAchadoDetalhe] = useState(null)
  const [achadoEditar, setAchadoEditar] = useState(null)
  const [planoDetalhe, setPlanoDetalhe] = useState(null)

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a, c] = await Promise.all([apiService.getAuditExtPlanosAcao(), apiService.getAuditExtAchados(), apiService.getAuditExtCiclos()])
      setPlanos(p)
      setAchados(a)
      setCiclos(c)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDados() }, [loadDados])

  // Uma linha por Divergência cadastrada — com todas as Ações (planos de ação) dela, se já existirem.
  const linhas = useMemo(() => {
    const planosPorAchado = new Map()
    for (const p of planos) {
      if (!planosPorAchado.has(p.achado_id)) planosPorAchado.set(p.achado_id, [])
      planosPorAchado.get(p.achado_id).push(p)
    }
    return [...achados]
      .sort(compararPorCodigo)
      .map(a => ({ achado: a, planosDoAchado: planosPorAchado.get(a.id) || [] }))
  }, [achados, planos])

  // Divergências agrupadas por Ciclo de Auditoria.
  const gruposPorCiclo = useMemo(() => {
    const m = new Map()
    for (const linha of linhas) {
      const cicloId = linha.achado.ciclo_id
      if (!m.has(cicloId)) m.set(cicloId, { ciclo: linha.achado.audext_ciclos, linhas: [] })
      m.get(cicloId).linhas.push(linha)
    }
    return Array.from(m.values()).sort((a, b) => {
      const na = `${a.ciclo?.proj_empresas?.nome || ''} ${a.ciclo?.periodo_competencia || ''}`
      const nb = `${b.ciclo?.proj_empresas?.nome || ''} ${b.ciclo?.periodo_competencia || ''}`
      return na.localeCompare(nb, 'pt-BR')
    })
  }, [linhas])

  const toggleCiclo = (cicloId) => {
    setCiclosExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(cicloId)) next.delete(cicloId)
      else next.add(cicloId)
      return next
    })
  }

  const toggleExpandir = (achadoId) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(achadoId)) next.delete(achadoId)
      else next.add(achadoId)
      return next
    })
  }

  const handleAvancar = async (plano) => {
    const proximo = PROXIMO_STATUS[plano.status]
    if (!proximo) return
    try {
      await apiService.updateAuditExtPlanoAcao(plano.id, { status: proximo }, user?.email)
      await loadDados()
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err.message || String(err)))
    }
  }

  const handleVoltar = async (plano) => {
    const anterior = ANTERIOR_STATUS[plano.status]
    if (!anterior) return
    try {
      await apiService.updateAuditExtPlanoAcao(plano.id, { status: anterior }, user?.email)
      await loadDados()
    } catch (err) {
      alert('Erro ao atualizar status: ' + (err.message || String(err)))
    }
  }

  const handleExcluir = async (plano) => {
    if (!window.confirm('Excluir esta ação do plano de ação?')) return
    try {
      await apiService.deleteAuditExtPlanoAcao(plano.id)
      await loadDados()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Plano de Ação</h1>
            <p className="text-xs text-slate-500">Devolutiva da controladoria: causa raiz, ação corretiva, responsável e validação. Toda divergência cadastrada aparece aqui — cada divergência pode ter várias ações.</p>
          </div>
          {canVerTiposAcao && (
            <Link
              to="/auditoria-externa/tipos-acao"
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-sm border border-slate-200 transition-colors shrink-0"
            >
              <Plus className="h-4 w-4 text-indigo-500" /> Novo Tipo de Ação
            </Link>
          )}
        </div>
        <AuditoriaExternaNav />
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">Carregando...</div>
      ) : linhas.length === 0 ? (
        <div className="p-6 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">Nenhuma divergência cadastrada ainda.</div>
      ) : (
        <div className="space-y-3">
          {gruposPorCiclo.map(({ ciclo, linhas: linhasDoCiclo }) => {
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
                    {linhasDoCiclo.length} divergência{linhasDoCiclo.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {cicloExpandido && (
                  <div className="space-y-3 border border-t-0 border-slate-200 rounded-b-lg p-3 bg-slate-50/60">
                    {linhasDoCiclo.map(({ achado, planosDoAchado }) => {
                      const expandido = expandidos.has(achado.id)
                      const statusAchado = statusAgregadoAchado(planosDoAchado)
                      return (
              <div key={achado.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Cabeçalho da Divergência — mesmo padrão do cabeçalho de projeto em Planejamento */}
                <div
                  className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 flex-wrap cursor-pointer select-none"
                  onClick={() => toggleExpandir(achado.id)}
                >
                  <span className="text-slate-400 shrink-0">
                    {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-500 text-[11px] shrink-0">{achado.numero_codigo}</span>
                      <span className="font-bold text-slate-900 text-[13px]">{achado.titulo}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Total Apontado: <strong className="text-slate-700">{fmtMoeda(achado.total_apontado)}</strong>
                      {' · '}
                      <span className="text-emerald-700 font-bold">Corrigido: {fmtMoeda(achado.valor_corrigido)}</span>
                      {(() => {
                        const totalAcoes = planosDoAchado.reduce((s, p) => s + Number(p.total_apontado || 0), 0)
                        const totalDivergencia = Number(achado.total_apontado || 0)
                        if (totalDivergencia > totalAcoes) {
                          return <span className="text-rose-600 font-bold ml-2">🔴 Total Apontado da DIVERGÊNCIA é maior que o total apontado das AÇÕES.</span>
                        }
                        if (totalDivergencia < totalAcoes) {
                          return <span className="text-rose-600 font-bold ml-2">🔴 Valor total apontado da DIVERGÊNCIA é menor que o valor total apontado das AÇÕES.</span>
                        }
                        return null
                      })()}
                    </p>
                  </div>
                  {statusAchado ? <Badge map={STATUS_PLANO_MAP} value={statusAchado} /> : <span className="text-[10px] text-slate-400 shrink-0">Sem ação</span>}
                  <div className="w-28 shrink-0" onClick={e => e.stopPropagation()}>
                    <PercentualBar value={calcularPercentualAtingidoAchado(achado)} editable={false} onSave={() => {}} />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setAchadoDetalhe(achado) }}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors shrink-0"
                    title="Visualizar Divergência"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {canEditarAchado && (
                    <button
                      onClick={e => { e.stopPropagation(); setAchadoEditar(achado) }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors shrink-0"
                      title="Editar Divergência"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {canEditar && (
                    <button
                      onClick={e => { e.stopPropagation(); setModalPlano({ tipo: 'novo', achadoId: achado.id }) }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 shrink-0 whitespace-nowrap"
                      title="Adicionar Ação"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ação
                    </button>
                  )}
                </div>

                {/* Tabela de Ações da Divergência — só existe/aparece quando expandida */}
                {expandido && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-white border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-2 text-center w-8">#</th>
                          <th className="px-3 py-2 text-left min-w-[140px]">Tipo de Ação</th>
                          <th className="px-3 py-2 text-left w-28">Empresa</th>
                          <th className="px-3 py-2 text-left w-32">Departamento</th>
                          <th className="px-3 py-2 text-left w-32">Responsável</th>
                          <th className="px-3 py-2 text-left w-24">Prazo</th>
                          <th className="px-3 py-2 text-right w-28">Total Apontado</th>
                          <th className="px-3 py-2 text-right w-28">Valor Corrigido</th>
                          <th className="px-3 py-2 text-left w-36">Status / % Atingido</th>
                          <th className="px-2 py-2 w-28 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planosDoAchado.length === 0 ? (
                          <tr><td colSpan="10" className="p-4 text-center text-slate-400">Nenhuma ação cadastrada ainda.</td></tr>
                        ) : planosDoAchado.map((plano, i) => {
                          const proximo = PROXIMO_STATUS[plano.status]
                          const anterior = ANTERIOR_STATUS[plano.status]
                          const podeAvancar = proximo && (proximo !== 'validado_auditoria' ? canEditar : canValidar)
                          const podeVoltar = anterior && (plano.status === 'validado_auditoria' ? canValidar : canEditar)
                          return (
                            <tr key={plano.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2.5 text-center text-slate-400 font-bold">{i + 1}</td>
                              <td className="px-3 py-2.5">
                                {plano.audext_tipos_acao?.nome
                                  ? <span className="text-slate-700 font-medium">{plano.audext_tipos_acao.nome}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{(plano.dim_empresas?.empresa_fantasia || plano.dim_empresas?.nome_empresa) || <span className="text-slate-300">—</span>}</td>
                              <td className="px-3 py-2.5 text-slate-600">{plano.proj_departamentos?.nome || <span className="text-slate-300">—</span>}</td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {plano.proj_responsaveis?.nome ? (
                                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {plano.proj_responsaveis.nome}</span>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {plano.prazo_limite ? (
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtData(plano.prazo_limite)}</span>
                                ) : <span className="text-slate-300">—</span>}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-slate-800">{fmtMoeda(plano.total_apontado)}</td>
                              <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{fmtMoeda(plano.valor_corrigido)}</td>
                              <td className="px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Badge map={STATUS_PLANO_MAP} value={plano.status} />
                                  <span className="text-[11px] font-bold text-slate-500">{calcularPercentualPlano(plano)}%</span>
                                </div>
                              </td>
                              <td className="px-2 py-2.5">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => setPlanoDetalhe(plano)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors" title="Visualizar"><Eye className="h-3.5 w-3.5" /></button>
                                  {canEditar && (
                                    <button onClick={() => setModalPlano({ tipo: 'editar', plano })} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit2 className="h-3.5 w-3.5" /></button>
                                  )}
                                  {canEditar && (
                                    <button onClick={() => handleExcluir(plano)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                                  )}
                                  {podeVoltar && (
                                    <button onClick={() => handleVoltar(plano)} className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={`Voltar para ${STATUS_PLANO_MAP[anterior].label}`}>
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  {podeAvancar && (
                                    <button onClick={() => handleAvancar(plano)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title={`Avançar para ${STATUS_PLANO_MAP[proximo].label}`}>
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalPlano && (
        <PlanoAcaoFormModal
          achadosDisponiveis={achados}
          plano={modalPlano.tipo === 'editar' ? modalPlano.plano : null}
          achadoIdPadrao={modalPlano.tipo === 'novo' ? modalPlano.achadoId : undefined}
          onClose={() => setModalPlano(null)}
          onSaved={async () => { setModalPlano(null); await loadDados() }}
        />
      )}

      {achadoDetalhe && (
        <AchadoDetalheDrawer achado={achadoDetalhe} onClose={() => setAchadoDetalhe(null)} />
      )}

      {achadoEditar && (
        <AchadoFormModal
          ciclos={ciclos}
          achado={achadoEditar}
          userEmail={user?.email}
          onClose={() => setAchadoEditar(null)}
          onSaved={async () => { setAchadoEditar(null); await loadDados() }}
        />
      )}

      {planoDetalhe && (
        <PlanoDetalheDrawer
          plano={planoDetalhe}
          achado={achados.find(a => a.id === planoDetalhe.achado_id)}
          onClose={() => setPlanoDetalhe(null)}
        />
      )}
    </div>
  )
}
