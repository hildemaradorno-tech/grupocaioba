import React, { useState, useEffect } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Trash2, Plus, Edit2, Eye, EyeOff, X, UserCheck, Search, Copy, Check, UserPlus, Send } from 'lucide-react'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Link de definição/redefinição de senha enviado por e-mail sempre precisa apontar pro
// sistema em produção — nunca pro localhost de quem está logado criando/reenviando o
// convite (window.location.origin varia conforme onde o admin está rodando o sistema).
const URL_PRODUCAO = 'https://portalgestaocaioba.pages.dev'

function traduzirErroSenha(msg = '') {
  if (msg.toLowerCase().includes('different from the old password')) return 'A nova senha deve ser diferente da senha atual.'
  if (msg.toLowerCase().includes('password should be at least')) return 'A senha deve ter no mínimo 6 caracteres.'
  if (msg.toLowerCase().includes('user not found')) return 'Usuário não encontrado no sistema de autenticação.'
  if (msg.toLowerCase().includes('invalid login credentials')) return 'Credenciais inválidas.'
  return null
}

export default function Usuarios() {
  const { isAdmin, iniciarVisualizacao, user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [showForm, setShowForm] = useSessionState('usr_showform', false)
  const [editingId, setEditingId] = useSessionState('usr_editid', null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedOk, setSavedOk] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '' })
  const [alterarSenha, setAlterarSenha] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showSenhaConfirm, setShowSenhaConfirm] = useState(false)
  const [authServiceConfigured, setAuthServiceConfigured] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [busca, setBusca] = useState('')
  const [conviteEnviado, setConviteEnviado] = useState(null) // { nome, email }
  const [reenviandoId, setReenviandoId] = useState(null)
  const [reenviadoId, setReenviadoId] = useState(null)
  const [senhaParaCopia, setSenhaParaCopia] = useState('')
  const [copiadoModal, setCopiadoModal] = useState(null) // 'whats' | 'email' | null
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true); setSenhaParaCopia(''); setCopiadoModal(null) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usuariosData, gruposData, authStatus] = await Promise.all([
        apiService.getUsuarios(),
        apiService.getGrupos(),
        apiService.getAuthStatus(),
      ])
      setUsuarios(usuariosData)
      setGrupos(gruposData)
      setAuthServiceConfigured(Boolean(authStatus.serviceRoleConfigured))
    } catch (err) {
      console.error('Erro ao carregar dados', err)
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (alterarSenha && editingId) {
      if (!authServiceConfigured) return alert('A alteração de senha exige SUPABASE_SERVICE_KEY configurada no backend.')
      if (form.senha.length < 6) return alert('A senha deve ter no mínimo 6 caracteres.')
      if (form.senha !== form.senhaConfirm) return alert('As senhas não coincidem.')
    }

    setSaving(true)
    try {
      if (editingId) {
        await apiService.updateUsuario(editingId, form.nome, form.email, form.grupo_id || null)
        if (alterarSenha && form.senha) {
          if (form.email === user?.email) {
            // Próprio usuário logado: usa a sessão atual, sem precisar do service key
            const { error } = await supabase.auth.updateUser({ password: form.senha })
            if (error) throw error
            await supabase.from('usuarios').update({ senha_atualizada_em: new Date().toISOString() }).eq('id', editingId)
          } else {
            await apiService.updateSenhaUsuario(editingId, form.senha)
          }
        }
        loadData()
        setSavedOk(true)
        setTimeout(() => setSavedOk(false), 2500)
      } else {
        if (!authServiceConfigured) {
          throw new Error('Criação de usuário exige SUPABASE_SERVICE_KEY configurada no backend.')
        }
        const redirectTo = `${URL_PRODUCAO}/redefinir-senha`
        await apiService.createUsuario(form.nome, form.email, form.grupo_id || null, redirectTo)
        setConviteEnviado({ nome: form.nome, email: form.email })
        resetForm()
        loadData()
      }
    } catch (err) {
      console.error('Erro ao salvar usuário', err)
      alert(traduzirErroSenha(err.message) || ('Erro ao salvar usuário: ' + (err.message || String(err))))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (usuario) => {
    setForm({ nome: usuario.nome, email: usuario.email, senha: '', senhaConfirm: '', grupo_id: usuario.grupo_id || '' })
    setEditingId(usuario.id)
    setAlterarSenha(false)
    setShowSenha(false)
    setShowSenhaConfirm(false)
    setSenhaParaCopia('')
    setCopiadoModal(null)
    setShowForm(true)
  }

  const handleReenviarConvite = async (usuario) => {
    setReenviandoId(usuario.id)
    setReenviadoId(null)
    try {
      await apiService.sendResetPasswordEmail(usuario.email, `${URL_PRODUCAO}/redefinir-senha`)
      setReenviadoId(usuario.id)
      setTimeout(() => setReenviadoId(null), 3000)
    } catch (err) {
      alert('Erro ao enviar e-mail: ' + (err.message || String(err)))
    } finally {
      setReenviandoId(null)
    }
  }

  const handleDelete = async (id) => {
    if (!authServiceConfigured) {
      return alert('Excluir usuário exige SUPABASE_SERVICE_KEY configurada no backend.')
    }
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await apiService.deleteUsuario(id)
        loadData()
      } catch (err) {
        alert('Erro ao deletar: ' + (err.message || String(err)))
      }
    }
  }

  const resetForm = () => {
    setForm({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '' })
    setEditingId(null)
    setAlterarSenha(false)
    setShowSenha(false)
    setShowSenhaConfirm(false)
    setShowForm(false)
  }

  if (loading) return <div className="p-6 max-w-screen-xl">Carregando...</div>

  if (error) return (
    <div className="p-6 max-w-screen-xl">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  const showSenhaSection = editingId && alterarSenha

  return (
    <div className="p-6 max-w-screen-xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Usuários</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar em todas as colunas..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-8 pr-8 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => { if (showForm && !editingId) { resetForm() } else { resetForm(); setShowForm(true) } }}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </button>
        </div>
      </div>

      {/* MODAL: CRIAR / EDITAR */}
      {showForm && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] max-w-full max-h-[90vh] shadow-xl overflow-y-auto my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              <input
                type="text"
                placeholder="Nome completo"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input
                type="email"
                placeholder="E-mail"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select
                value={form.grupo_id}
                onChange={(e) => setForm({ ...form, grupo_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
              >
                <option value="">— Sem grupo de acesso —</option>
                {grupos.map(g => (
                  <option key={g.id} value={g.id}>{g.nome_grupo}{g.is_admin ? ' (Admin)' : ''}</option>
                ))}
              </select>

              {!editingId && (
                <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  Um e-mail de boas-vindas será enviado para o usuário definir a própria senha de acesso.
                </p>
              )}

              {editingId && (
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={alterarSenha}
                    onChange={(e) => setAlterarSenha(e.target.checked)}
                    disabled={!authServiceConfigured}
                    className="rounded"
                  />
                  Alterar senha
                </label>
              )}

              {showSenhaSection && (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Nova senha</p>
                  <div className="relative">
                    <input
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Senha (mínimo 6 caracteres)"
                      value={form.senha}
                      onChange={(e) => setForm({ ...form, senha: e.target.value })}
                      required={alterarSenha}
                      minLength={6}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                    <button type="button" onClick={() => setShowSenha(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showSenhaConfirm ? 'text' : 'password'}
                      placeholder="Confirmar senha"
                      value={form.senhaConfirm}
                      onChange={(e) => setForm({ ...form, senhaConfirm: e.target.value })}
                      required={alterarSenha}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    />
                    <button type="button" onClick={() => setShowSenhaConfirm(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                      {showSenhaConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {form.senha && form.senhaConfirm && form.senha !== form.senhaConfirm && (
                    <p className="text-xs text-red-600">As senhas não coincidem.</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1 flex-wrap">
                <button type="submit" disabled={saving} className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 ${savedOk ? 'bg-emerald-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                  {saving ? 'Salvando...' : savedOk ? '✓ Salvo!' : 'Salvar'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    disabled={!form.senha.trim()}
                    onClick={() => {
                      const texto = `Olá, ${form.nome}!\n\nSeu acesso ao sistema 🌐 Portal de Gestão do Grupo Caiobá foi criado. Utilize as credenciais abaixo para entrar:\n\n📧 E-mail: ${form.email}\n🔑 Senha: ${form.senha}`
                      navigator.clipboard.writeText(texto)
                      setCopiadoModal('share')
                      setTimeout(() => setCopiadoModal(null), 2500)
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${copiadoModal === 'share' ? 'bg-green-600 text-white' : 'bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100'}`}
                  >
                    {copiadoModal === 'share' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copiadoModal === 'share' ? 'Copiado!' : 'Compartilhar acesso'}
                  </button>
                )}
                <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 text-sm font-semibold">
                  {editingId ? 'Fechar' : 'Cancelar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {conviteEnviado && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-green-100 border-b border-green-200">
            <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
              <UserPlus className="h-4 w-4" />
              Usuário criado — e-mail de boas-vindas enviado
            </div>
            <button onClick={() => setConviteEnviado(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4 text-sm text-slate-700">
            Um e-mail de boas-vindas foi enviado para <span className="font-semibold">{conviteEnviado.nome}</span> em{' '}
            <span className="font-mono text-slate-800">{conviteEnviado.email}</span> com um link para ele mesmo definir a senha de acesso.
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-100 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Nome</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">E-mail</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Grupo de Acesso</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-slate-700">Senha</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {(busca.trim()
              ? usuarios.filter(u =>
                  (u.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
                  (u.email || '').toLowerCase().includes(busca.toLowerCase()) ||
                  (grupos.find(g => g.id === u.grupo_id)?.nome_grupo || '').toLowerCase().includes(busca.toLowerCase())
                )
              : usuarios
            ).map(u => {
              const refDate = u.senha_atualizada_em || u.criado_em
              const diasDesdeReset = refDate ? Math.floor((Date.now() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24)) : null
              const senhaOk = diasDesdeReset !== null && diasDesdeReset <= 30
              const senhaVencida = diasDesdeReset !== null && diasDesdeReset > 30
              return (
              <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900 whitespace-nowrap">{u.nome}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{u.email}</td>
                <td className="px-6 py-3 text-sm text-slate-500 whitespace-nowrap">
                  {grupos.find(g => g.id === u.grupo_id)?.nome_grupo || <span className="text-slate-300">—</span>}
                </td>
                <td className="px-6 py-3 text-center">
                  {senhaOk && (
                    <span title={`Senha atualizada há ${diasDesdeReset} dia(s)`} className="inline-block w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                  )}
                  {senhaVencida && (
                    <span title={`Senha não renovada há ${diasDesdeReset} dia(s) — exige redefinição`} className="inline-block w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                  )}
                  {diasDesdeReset === null && (
                    <span title="Sem registro de data" className="inline-block w-3 h-3 rounded-full bg-slate-300" />
                  )}
                </td>
                <td className="px-6 py-3 text-sm flex gap-2 items-center">
                  <PermissionActionButtons
                    menuPath="usuarios"
                    onView={() => abrirVisualizar(u)}
                    onEdit={() => handleEdit(u)}
                    onDelete={() => handleDelete(u.id)}
                  />
                  <button
                    onClick={() => handleReenviarConvite(u)}
                    disabled={reenviandoId === u.id}
                    title="Reenviar e-mail com o link de definição/redefinição de senha (aponta para o sistema em produção)"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border transition-colors disabled:opacity-50 whitespace-nowrap ${
                      reenviadoId === u.id
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    {reenviadoId === u.id ? <Check size={13} /> : <Send size={13} />}
                    {reenviandoId === u.id ? 'Enviando...' : reenviadoId === u.id ? 'Enviado!' : 'Reenviar e-mail'}
                  </button>
                  {isAdmin && u.email !== user?.email && (
                    <button
                      onClick={() => iniciarVisualizacao(u)}
                      title={`Visualizar como ${u.nome}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors whitespace-nowrap"
                    >
                      <UserCheck size={13} /> Visualizar como
                    </button>
                  )}
                </td>
              </tr>
              )
            })}
            {(busca.trim() ? usuarios.filter(u =>
                (u.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(busca.toLowerCase()) ||
                (grupos.find(g => g.id === u.grupo_id)?.nome_grupo || '').toLowerCase().includes(busca.toLowerCase())
              ) : usuarios).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-6 text-center text-sm text-slate-400">
                  {busca.trim() ? `Nenhum usuário encontrado para "${busca}".` : 'Nenhum usuário cadastrado.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] max-w-full max-h-[90vh] shadow-xl overflow-y-auto my-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />Visualizar Usuário
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.nome || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">E-mail</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.email || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Grupo de Acesso</span>
                <span className="text-xs font-semibold text-slate-800">
                  {grupos.find(g => g.id === itemVisualizado.grupo_id)?.nome_grupo || '—'}
                </span>
              </div>

            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalVisualizarAberto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
