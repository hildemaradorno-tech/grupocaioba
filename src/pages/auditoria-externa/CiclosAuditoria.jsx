import React, { useEffect, useState, useMemo } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, CalendarClock, Eye, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import AuditoriaExternaNav from './AuditoriaExternaNav'
import ManifestacaoRichEditor from '../projetos/ManifestacaoRichEditor'
import { CICLO_STATUS_MAP, Badge, fmtData, PercentualBar, calcularPercentualAtingidoAchado } from './auditExtConstants'

const FORM_VAZIO = { empresa_id: '', periodo_competencia: '', firma_auditoria: '', data_apresentacao: '', status: 'em_andamento', observacoes: '' }

export default function CiclosAuditoria() {
  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [achados, setAchados] = useState([])
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [nomeExcluir, setNomeExcluir] = useState('')
  const [form, setForm] = useSessionState('audext_ciclos_form', FORM_VAZIO)
  const { user, hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('auditoria-externa/ciclos', 'editar')
  const canExcluir = hasActionOrDefault('auditoria-externa/ciclos', 'excluir')

  const loadDados = async () => {
    setLoading(true); setError(null)
    try {
      const [ciclos, emp, ach, pl] = await Promise.all([
        apiService.getAuditExtCiclos(),
        apiService.getProjEmpresas(),
        apiService.getAuditExtAchados(),
        apiService.getAuditExtPlanosAcao(),
      ])
      setDados(ciclos)
      setEmpresas(emp.filter(e => e.ativo !== false))
      setAchados(ach)
      setPlanos(pl)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDados() }, [])

  // Data de Conclusão do ciclo = prazo limite mais distante entre todas as
  // ações (planos de ação) das divergências do ciclo — data prevista de
  // quando o ciclo estará todo resolvido, independente do status atual de cada ação.
  const dataConclusaoPorCiclo = useMemo(() => {
    const achadoIdsPorCiclo = new Map()
    for (const a of achados) {
      if (!achadoIdsPorCiclo.has(a.ciclo_id)) achadoIdsPorCiclo.set(a.ciclo_id, [])
      achadoIdsPorCiclo.get(a.ciclo_id).push(a.id)
    }
    const planosPorAchado = new Map()
    for (const p of planos) {
      if (!planosPorAchado.has(p.achado_id)) planosPorAchado.set(p.achado_id, [])
      planosPorAchado.get(p.achado_id).push(p)
    }
    const resultado = new Map()
    for (const [cicloId, achadoIds] of achadoIdsPorCiclo) {
      const planosComPrazo = achadoIds
        .flatMap(id => planosPorAchado.get(id) || [])
        .filter(p => p?.prazo_limite)
      const maxData = planosComPrazo.reduce((max, p) => {
        const d = new Date(p.prazo_limite + 'T12:00:00')
        return !max || d > max ? d : max
      }, null)
      if (maxData) resultado.set(cicloId, maxData)
    }
    return resultado
  }, [achados, planos])

  // % Atingido do ciclo = média do % atingido (Valor Corrigido ÷ Total
  // Apontado) das divergências do ciclo — 100% automático.
  const percentualPorCiclo = useMemo(() => {
    const achadoIdsPorCiclo = new Map()
    const achadoPorId = new Map(achados.map(a => [a.id, a]))
    for (const a of achados) {
      if (!achadoIdsPorCiclo.has(a.ciclo_id)) achadoIdsPorCiclo.set(a.ciclo_id, [])
      achadoIdsPorCiclo.get(a.ciclo_id).push(a.id)
    }
    const resultado = new Map()
    for (const [cicloId, achadoIds] of achadoIdsPorCiclo) {
      if (achadoIds.length === 0) continue
      const soma = achadoIds.reduce((s, id) => s + calcularPercentualAtingidoAchado(achadoPorId.get(id)), 0)
      resultado.set(cicloId, Math.round(soma / achadoIds.length))
    }
    return resultado
  }, [achados, planos])

  // Excluir só é permitido quando o ciclo não tem nenhum achado/divergência
  // vinculado — evita apagar sem querer um ciclo com dados já cadastrados.
  const achadosPorCiclo = useMemo(() => {
    const m = new Map()
    for (const a of achados) m.set(a.ciclo_id, (m.get(a.ciclo_id) || 0) + 1)
    return m
  }, [achados])

  const abrirIncluir = () => { setEditingId(null); setForm(FORM_VAZIO); setModalAberto(true) }
  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({
      empresa_id: item.empresa_id || '',
      periodo_competencia: item.periodo_competencia || '',
      firma_auditoria: item.firma_auditoria || '',
      data_apresentacao: item.data_apresentacao || '',
      status: item.status || 'em_andamento',
      observacoes: item.observacoes || '',
    })
    setModalAberto(true)
  }
  const abrirExcluir = (item) => { setIdExcluir(item.id); setNomeExcluir(item.periodo_competencia); setModalExcluirAberto(true) }
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const handleSalvar = async (e) => {
    e.preventDefault()
    // status não é editável neste formulário — é automático (ver verificarFechamentoCiclo
    // em supabaseClient.js), então nunca é reenviado aqui pra não sobrescrever o valor atual.
    const { status: _status, ...formSemStatus } = form
    const payload = { ...formSemStatus, empresa_id: form.empresa_id || null, data_apresentacao: form.data_apresentacao || null }
    try {
      if (editingId) await apiService.updateAuditExtCiclo(editingId, payload)
      else await apiService.createAuditExtCiclo(payload, user?.email)
      await loadDados()
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar ciclo: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteAuditExtCiclo(idExcluir)
      await loadDados()
    } catch (err) {
      alert('Erro ao excluir ciclo: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar ciclos de auditoria</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadDados} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ciclos de Auditoria</h1>
            <p className="text-xs text-slate-500">Períodos de auditoria externa por empresa (ex: 1º Tri 2026, firma responsável).</p>
          </div>
          {canEdit && (
            <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
              <Plus className="h-4 w-4" /> Novo Ciclo
            </button>
          )}
        </div>
        <AuditoriaExternaNav />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Empresa</th>
              <th className="p-3">Período</th>
              <th className="p-3">Firma de Auditoria</th>
              <th className="p-3">Data da Apresentação</th>
              <th className="p-3">Data de Conclusão</th>
              <th className="p-3 w-32">Status</th>
              <th className="p-3 w-32">% Atingido</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-slate-400">Nenhum ciclo de auditoria cadastrado.</td></tr>
            ) : dados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold flex items-center gap-2"><CalendarClock className="h-3.5 w-3.5 text-indigo-500" /> {item.proj_empresas?.nome || '—'}</td>
                <td className="p-3">{item.periodo_competencia}</td>
                <td className="p-3">{item.firma_auditoria || '—'}</td>
                <td className="p-3">{fmtData(item.data_apresentacao)}</td>
                <td className="p-3">{dataConclusaoPorCiclo.has(item.id) ? dataConclusaoPorCiclo.get(item.id).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="p-3"><Badge map={CICLO_STATUS_MAP} value={item.status} /></td>
                <td className="p-3">
                  <PercentualBar value={percentualPorCiclo.get(item.id) || 0} editable={false} onSave={() => {}} />
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <PermissionActionButtons
                      onView={() => abrirVisualizar(item)}
                      onEdit={canEdit ? () => abrirEditar(item) : undefined}
                      onDelete={canExcluir && !achadosPorCiclo.get(item.id) ? () => abrirExcluir(item) : undefined}
                    />
                    {canExcluir && !!achadosPorCiclo.get(item.id) && (
                      <span
                        title={`Não é possível excluir: há ${achadosPorCiclo.get(item.id)} divergência(s) vinculada(s) a este ciclo`}
                        className="p-1.5 text-slate-300 cursor-not-allowed"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Ciclo de Auditoria' : 'Novo Ciclo de Auditoria'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
                  <select value={form.empresa_id} onChange={e => setForm(prev => ({ ...prev, empresa_id: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                    <option value="">— Selecione —</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Período de Competência *</label>
                  <input type="text" required value={form.periodo_competencia} onChange={e => setForm(prev => ({ ...prev, periodo_competencia: e.target.value }))}
                    placeholder="Ex: 1º Trimestre 2026" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Firma de Auditoria</label>
                    <input type="text" value={form.firma_auditoria} onChange={e => setForm(prev => ({ ...prev, firma_auditoria: e.target.value }))}
                      placeholder="Ex: Martinelli Auditores" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Data da Apresentação</label>
                    <input type="date" value={form.data_apresentacao} onChange={e => setForm(prev => ({ ...prev, data_apresentacao: e.target.value }))}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                  </div>
                </div>
                {editingId && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status</label>
                    <div className="flex items-center h-[30px]"><Badge map={CICLO_STATUS_MAP} value={form.status} /></div>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 -mt-2">
                  {editingId
                    ? 'Status automático: fecha sozinho quando todas as divergências forem resolvidas (sem impacto ou plano de ação concluído/validado), e reabre se alguma voltar a ficar pendente.'
                    : 'O ciclo é criado automaticamente com status "Em Andamento".'}
                </p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Escopo dos Trabalhos</label>
                  <ManifestacaoRichEditor
                    value={form.observacoes}
                    onChange={html => setForm(prev => ({ ...prev, observacoes: html }))}
                    placeholder="Escopo dos trabalhos de auditoria..."
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o ciclo <strong className="text-slate-800">"{nomeExcluir}"</strong>?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Visualizar Ciclo de Auditoria</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresa</span>
                <span className="font-semibold text-slate-800">{itemVisualizado.proj_empresas?.nome || '—'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Período de Competência</span>
                <span className="font-semibold text-slate-800">{itemVisualizado.periodo_competencia}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Firma de Auditoria</span>
                  <span className="font-semibold text-slate-800">{itemVisualizado.firma_auditoria || '—'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data da Apresentação</span>
                  <span className="font-semibold text-slate-800">{fmtData(itemVisualizado.data_apresentacao)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Data de Conclusão</span>
                <span className="font-semibold text-slate-800">
                  {dataConclusaoPorCiclo.has(itemVisualizado.id) ? dataConclusaoPorCiclo.get(itemVisualizado.id).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Status</span>
                  <Badge map={CICLO_STATUS_MAP} value={itemVisualizado.status} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">% Atingido</span>
                  <PercentualBar value={percentualPorCiclo.get(itemVisualizado.id) || 0} editable={false} onSave={() => {}} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Escopo dos Trabalhos</span>
                {itemVisualizado.observacoes
                  ? <div className="rich-html text-slate-700" dangerouslySetInnerHTML={{ __html: itemVisualizado.observacoes }} />
                  : <span className="text-slate-400">—</span>}
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
