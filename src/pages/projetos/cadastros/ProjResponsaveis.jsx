import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Eye, UserCheck, Link, Copy, Check } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import PermissionActionButtons from '../../../components/PermissionActionButtons'
import { apiService } from '../../../services/api'
import { clearProjLookups } from '../../../services/projLookups'

const _cache = { dados: null }

const FORM_INICIAL = { nome: '', ativo: true, usuario_id: '' }

export default function ProjResponsaveis() {
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useSessionState('proj_resp_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('proj_resp_editid', null)
  const [nomeOriginal, setNomeOriginal] = useState('')
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useSessionState('proj_resp_form', FORM_INICIAL)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [modalAlertaNome, setModalAlertaNome] = useState(null) // { nomeAntigo, nomeNovo }
  const [copiado, setCopiado] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('proj-responsaveis', 'editar')
  const canDelete = hasPermission('proj-responsaveis', 'excluir')

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => {
    loadDados(_cache.dados !== null)
    apiService.getUsuarios().then(setUsuarios).catch(() => {})
  }, [])
  useEffect(() => { _cache.dados = dados }, [dados])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      setDados(await apiService.getProjResponsaveis())
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(FORM_INICIAL)
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setNomeOriginal(item.nome)
    setForm({ nome: item.nome, ativo: item.ativo, usuario_id: item.usuario_id || '' })
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm({ nome: item.nome })
    setModalExcluirAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    // Se estiver editando e o nome mudou, exige confirmação com SQL
    if (editingId && form.nome.trim() !== nomeOriginal) {
      setModalAlertaNome({ nomeAntigo: nomeOriginal, nomeNovo: form.nome.trim() })
      return
    }
    await salvarConfirmado()
  }

  const salvarConfirmado = async () => {
    try {
      if (editingId) await apiService.updateProjResponsavel(editingId, form)
      else await apiService.createProjResponsavel(form)
      clearProjLookups('responsaveis')
      await loadDados(true)
      setModalAberto(false)
      setModalAlertaNome(null)
    } catch (err) {
      alert('Erro ao salvar responsável: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteProjResponsavel(idExcluir)
      clearProjLookups('responsaveis')
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir responsável: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const nomeUsuario = (uid) => usuarios.find(u => u.id === uid)?.nome || null

  const copiarSQL = (sql) => {
    navigator.clipboard.writeText(sql).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar responsáveis</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadDados} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-md">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Responsáveis</h1>
          <p className="text-xs text-slate-500">Cadastre os responsáveis e vincule ao usuário do sistema para filtros automáticos.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Responsável
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Responsável</th>
              <th className="p-3">Usuário do Sistema</th>
              <th className="p-3 w-24">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr><td colSpan="4" className="p-6 text-center text-slate-400">Nenhum responsável cadastrado.</td></tr>
            ) : dados.map(item => {
              const vinculado = nomeUsuario(item.usuario_id)
              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3 text-slate-900 font-bold">
                    <span className="flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 text-blue-500" /> {item.nome}</span>
                  </td>
                  <td className="p-3">
                    {vinculado
                      ? <span className="flex items-center gap-1.5 text-blue-700 font-semibold"><Link className="h-3 w-3" />{vinculado}</span>
                      : <span className="text-slate-300 italic text-[11px]">Não vinculado</span>
                    }
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{item.ativo ? 'Ativo' : 'Inativo'}</span>
                  </td>
                  <td className="p-3">
                    <PermissionActionButtons menuPath="proj-responsaveis" onView={() => abrirVisualizar(item)} onEdit={() => abrirEditar(item)} onDelete={() => abrirExcluir(item)} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Responsável' : 'Incluir Novo Responsável'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Responsável *</label>
                  <input type="text" required value={form.nome} onChange={(e) => setForm(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: João Silva" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Usuário do Sistema (opcional)</label>
                  <p className="text-[10px] text-slate-400 -mt-1">Vincule ao usuário para que os projetos apareçam automaticamente ao logar.</p>
                  <select
                    value={form.usuario_id || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, usuario_id: e.target.value || '' }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                  >
                    <option value="">— Não vinculado —</option>
                    {usuarios.filter(u => u.ativo !== false).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR')).map(u => (
                      <option key={u.id} value={u.id}>{u.nome} {u.email ? `(${u.email})` : ''}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Salvar Dados</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Visualizar Responsável</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome do Responsável</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usuário do Sistema</span>
                <span className="text-xs font-semibold text-slate-800">
                  {nomeUsuario(itemVisualizado.usuario_id) || <span className="text-slate-300 italic font-normal">Não vinculado</span>}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{itemVisualizado.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {modalAlertaNome && (() => {
        const sql = `UPDATE proj_projetos SET responsavel_nome = '${modalAlertaNome.nomeNovo}' WHERE responsavel_nome = '${modalAlertaNome.nomeAntigo}';\nUPDATE proj_tarefas  SET responsavel_nome = '${modalAlertaNome.nomeNovo}' WHERE responsavel_nome = '${modalAlertaNome.nomeAntigo}';`
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[560px] shadow-xl overflow-hidden">
              <div className="p-4 flex items-start gap-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Atenção: Nome alterado</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    O nome <strong className="text-slate-700">"{modalAlertaNome.nomeAntigo}"</strong> será alterado para <strong className="text-slate-700">"{modalAlertaNome.nomeNovo}"</strong>.<br />
                    Projetos e tarefas com o nome antigo <strong>não são atualizados automaticamente</strong>.<br />
                    Execute o SQL abaixo no Supabase para manter a consistência:
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="relative">
                  <pre className="text-[11px] font-mono bg-slate-900 text-green-400 rounded-md p-3 pr-10 overflow-x-auto leading-relaxed">{sql}</pre>
                  <button
                    onClick={() => copiarSQL(sql)}
                    title="Copiar SQL"
                    className="absolute top-2 right-2 p-1.5 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
                  >
                    {copiado ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-amber-600 font-medium">Copie o SQL, execute no Supabase → SQL Editor e depois confirme abaixo.</p>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setModalAlertaNome(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button onClick={salvarConfirmado} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 shadow-sm transition-colors">Já executei o SQL — Salvar</button>
              </div>
            </div>
          </div>
        )
      })()}

      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o responsável <strong className="text-slate-800">"{form.nome}"</strong>?</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
