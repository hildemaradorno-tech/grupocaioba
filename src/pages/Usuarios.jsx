import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Trash2, Plus, Edit2, Eye, EyeOff, X, UserCheck, Search, UserPlus, Send, Link2, Settings } from 'lucide-react'
import { SearchCombobox } from '../components/SearchCombobox'
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

// Menu de ações por linha (engrenagem) — reúne Visualizar/Editar/Excluir/Reenviar e-mail/
// Visualizar como num só botão em vez de vários ícones lado a lado. Mesmo padrão de portal
// (document.body, position fixed) usado no SearchCombobox, pra não ficar cortado pelo
// overflow-x-auto da tabela; alinhado pela direita do botão pra não estourar a borda da tela.
function AcoesMenu({ acoes }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-acoes-menu-panel]')) setAberto(false)
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  const abrir = () => {
    if (!aberto && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setAberto(v => !v)
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (e.target?.closest?.('[data-acoes-menu-panel]')) return
      setAberto(false)
    }
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const visiveis = acoes.filter(Boolean)
  if (visiveis.length === 0) return null

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={abrir}
        title="Ações"
        className="inline-flex items-center justify-center p-1.5 rounded border border-slate-300 text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-700 transition-colors"
      >
        <Settings size={14} />
      </button>
      {aberto && pos && createPortal(
        <div
          data-acoes-menu-panel
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-50 w-56 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden py-1"
        >
          {visiveis.map((a, i) => (
            <button
              key={i}
              type="button"
              disabled={a.disabled}
              onClick={() => { setAberto(false); a.onClick() }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                a.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default function Usuarios() {
  const { isAdmin, iniciarVisualizacao, user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [grupos, setGrupos] = useState([])
  const [cargos, setCargos] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [showForm, setShowForm] = useSessionState('usr_showform', false)
  const [editingId, setEditingId] = useSessionState('usr_editid', null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '', cargo_id: '', funcionario_id: '' })
  const [alterarSenha, setAlterarSenha] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [showSenhaConfirm, setShowSenhaConfirm] = useState(false)
  const [authServiceConfigured, setAuthServiceConfigured] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [busca, setBusca] = useState('')
  const [conviteEnviado, setConviteEnviado] = useState(null) // { nome, email }
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usuariosData, gruposData, cargosData, funcionariosData, authStatus] = await Promise.all([
        apiService.getUsuarios(),
        apiService.getGrupos(),
        apiService.getCargos(),
        apiService.getFuncionarios(),
        apiService.getAuthStatus(),
      ])
      setUsuarios(usuariosData)
      setGrupos(gruposData)
      setCargos(cargosData.filter(c => c.ativo !== false))
      setFuncionarios(funcionariosData.filter(f => f.ativo !== false))
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
        await apiService.updateUsuario(editingId, form.nome, form.email, form.grupo_id || null, form.cargo_id || null, form.funcionario_id || null)
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
        resetForm()
      } else {
        if (!authServiceConfigured) {
          throw new Error('Criação de usuário exige SUPABASE_SERVICE_KEY configurada no backend.')
        }
        const redirectTo = `${URL_PRODUCAO}/redefinir-senha`
        await apiService.createUsuario(form.nome, form.email, form.grupo_id || null, redirectTo, form.cargo_id || null, form.funcionario_id || null)
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
    setForm({ nome: usuario.nome, email: usuario.email, senha: '', senhaConfirm: '', grupo_id: usuario.grupo_id || '', cargo_id: usuario.cargo_id || '', funcionario_id: usuario.funcionario_id || '' })
    setEditingId(usuario.id)
    setAlterarSenha(false)
    setShowSenha(false)
    setShowSenhaConfirm(false)
    setShowForm(true)
  }

  const handleReenviarConvite = async (usuario) => {
    try {
      await apiService.sendResetPasswordEmail(usuario.email, `${URL_PRODUCAO}/redefinir-senha`)
      setConviteEnviado({ nome: usuario.nome, email: usuario.email, tipo: 'reenvio' })
    } catch (err) {
      alert('Erro ao enviar e-mail: ' + (err.message || String(err)))
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
    setForm({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '', cargo_id: '', funcionario_id: '' })
    setEditingId(null)
    setAlterarSenha(false)
    setShowSenha(false)
    setShowSenhaConfirm(false)
    setShowForm(false)
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  const showSenhaSection = editingId && alterarSenha

  return (
    <div className="p-6">
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
              <SearchCombobox
                value={form.funcionario_id}
                onChange={(id) => {
                  const func = funcionarios.find(f => f.id === id)
                  setForm(prev => ({ ...prev, funcionario_id: id, cargo_id: func ? (func.cargo_id || '') : prev.cargo_id }))
                }}
                placeholder="— Nenhum funcionário vinculado —"
                emptyOptionLabel="— Nenhum funcionário vinculado —"
                searchPlaceholder="Buscar funcionário, empresa ou cargo..."
                notFoundLabel="Nenhum funcionário encontrado."
                opcoes={[...funcionarios].sort((a, b) => (a.nome_funcionario || '').localeCompare(b.nome_funcionario || '', 'pt-BR'))}
                getLabel={(f) => <>{f.nome_funcionario}{f.cargo_nome ? <span className="text-slate-400"> — {f.cargo_nome}</span> : ''}{f.empresa_nome ? <span className="text-slate-400"> — {f.empresa_nome}</span> : ''}</>}
                getSearchText={(f) => `${f.nome_funcionario || ''} ${f.empresa_nome || ''} ${f.cargo_nome || ''} ${f.codigo_funcionario || ''}`}
              />
              <p className="text-[11px] text-slate-400 -mt-1">
                Vincule o funcionário correspondente pra trazer o cargo dele automaticamente (busque por nome, empresa ou cargo).
              </p>

              {form.funcionario_id ? (
                <div className="w-full flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-md bg-slate-50 text-sm text-slate-600">
                  <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" title="Vinculado ao funcionário selecionado acima" />
                  {cargos.find(c => c.id === form.cargo_id)?.nome_cargo || <span className="text-slate-400">— Sem cargo —</span>}
                  {cargos.find(c => c.id === form.cargo_id)?.nome_empresa && (
                    <span className="text-slate-400"> — {cargos.find(c => c.id === form.cargo_id).nome_empresa}</span>
                  )}
                </div>
              ) : (
                <SearchCombobox
                  value={form.cargo_id}
                  onChange={(id) => setForm({ ...form, cargo_id: id })}
                  placeholder="— Sem cargo —"
                  emptyOptionLabel="— Sem cargo —"
                  searchPlaceholder="Buscar cargo ou empresa..."
                  notFoundLabel="Nenhum cargo encontrado."
                  opcoes={[...cargos].sort((a, b) => a.nome_cargo.localeCompare(b.nome_cargo, 'pt-BR') || (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR'))}
                  getLabel={(o) => <>{o.nome_cargo}{o.nome_empresa ? <span className="text-slate-400"> — {o.nome_empresa}</span> : ''}</>}
                  getSearchText={(o) => `${o.nome_cargo} ${o.nome_empresa || ''}`}
                />
              )}
              <p className="text-[11px] text-slate-400 -mt-1">
                {form.funcionario_id
                  ? 'Cargo definido pelo funcionário vinculado acima — pra trocar, vincule outro funcionário ou desvincule (Nenhum) pra escolher o cargo direto.'
                  : 'O cargo define quais tarefas de fluxos (BPM) esse usuário pode assumir.'}
              </p>

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
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 bg-green-600 hover:bg-green-700 text-white">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                {!editingId && (
                  <button type="button" onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 text-sm font-semibold">
                    Cancelar
                  </button>
                )}
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
              {conviteEnviado.tipo === 'reenvio' ? 'E-mail reenviado' : 'Usuário criado — e-mail de boas-vindas enviado'}
            </div>
            <button onClick={() => setConviteEnviado(null)} className="text-green-600 hover:text-green-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-5 py-4 text-sm text-slate-700">
            {conviteEnviado.tipo === 'reenvio'
              ? <>Um e-mail com o link de redefinição de senha foi reenviado para <span className="font-semibold">{conviteEnviado.nome}</span> em{' '}
                  <span className="font-mono text-slate-800">{conviteEnviado.email}</span>.</>
              : <>Um e-mail de boas-vindas foi enviado para <span className="font-semibold">{conviteEnviado.nome}</span> em{' '}
                  <span className="font-mono text-slate-800">{conviteEnviado.email}</span> com um link para ele mesmo definir a senha de acesso.</>}
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
              <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700">Cargo</th>
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
                <td className="px-6 py-3 text-sm text-slate-500 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    {u.funcionario_id && <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" title="Cargo vinculado a um funcionário" />}
                    {cargos.find(a => a.id === u.cargo_id)?.nome_cargo || <span className="text-slate-300">—</span>}
                  </span>
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
                <td className="px-6 py-3 text-sm">
                  <AcoesMenu acoes={[
                    { label: 'Visualizar', icon: <Eye size={14} />, onClick: () => abrirVisualizar(u) },
                    { label: 'Editar', icon: <Edit2 size={14} />, onClick: () => handleEdit(u) },
                    { label: 'Reenviar e-mail', icon: <Send size={14} />, onClick: () => handleReenviarConvite(u) },
                    (isAdmin && u.email !== user?.email) && { label: `Visualizar como ${u.nome}`, icon: <UserCheck size={14} />, onClick: () => iniciarVisualizacao(u) },
                    { label: 'Excluir', icon: <Trash2 size={14} />, onClick: () => handleDelete(u.id), danger: true },
                  ]} />
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
                <td colSpan={6} className="px-6 py-6 text-center text-sm text-slate-400">
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
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargo</span>
                <span className="text-xs font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  {itemVisualizado.funcionario_id && <Link2 className="h-3 w-3 text-blue-500 shrink-0" title="Cargo vinculado a um funcionário" />}
                  {cargos.find(a => a.id === itemVisualizado.cargo_id)?.nome_cargo || '—'}
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
