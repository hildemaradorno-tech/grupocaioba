import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Trash2, Plus, Edit2, Eye, EyeOff, X, UserCheck, Search, Check, UserPlus, Send, ChevronDown } from 'lucide-react'
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

// Combobox de seleção única com busca — o <select> nativo fica difícil de navegar com muitos
// cargos (um por empresa), então digitar filtra a lista em vez de rolar tudo procurando.
function CargoCombobox({ value, onChange, opcoes, placeholder }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-cargo-combobox-panel]')) { setAberto(false); setBusca('') }
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  // O modal de Editar Usuário tem overflow-y-auto (rola o formulário) — um painel "absolute"
  // aqui dentro ficava cortado/deslocado por esse scroll. Renderiza via portal em document.body,
  // "fixed" na posição real do botão, pra flutuar por cima sem ser cortado (mesmo padrão já
  // usado nos filtros de coluna de Cargos/Funcionários).
  const abrir = () => {
    if (!aberto && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setAberto(v => !v)
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (e.target?.closest?.('[data-cargo-combobox-panel]')) return
      setAberto(false)
    }
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const selecionado = opcoes.find(o => o.id === value)
  const q = busca.trim().toLowerCase()
  const filtradas = q
    ? opcoes.filter(o => `${o.nome_cargo} ${o.nome_empresa || ''}`.toLowerCase().includes(q))
    : opcoes

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrir}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={`truncate ${selecionado ? 'text-slate-800' : 'text-slate-400'}`}>
          {selecionado ? `${selecionado.nome_cargo}${selecionado.nome_empresa ? ` — ${selecionado.nome_empresa}` : ''}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <div
          data-cargo-combobox-panel
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
          className="z-50 bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden"
        >
          <div className="relative border-b border-slate-100">
            <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              autoFocus
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar cargo ou empresa..."
              className="w-full text-sm pl-8 pr-2 py-2 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(''); setAberto(false); setBusca('') }}
              className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              — Sem cargo —
            </button>
            {filtradas.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">Nenhum cargo encontrado.</p>
            ) : filtradas.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setAberto(false); setBusca('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${o.id === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}
              >
                {o.nome_cargo}{o.nome_empresa ? <span className="text-slate-400"> — {o.nome_empresa}</span> : ''}
              </button>
            ))}
          </div>
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
  const [showForm, setShowForm] = useSessionState('usr_showform', false)
  const [editingId, setEditingId] = useSessionState('usr_editid', null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '', cargo_id: '' })
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
  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usuariosData, gruposData, cargosData, authStatus] = await Promise.all([
        apiService.getUsuarios(),
        apiService.getGrupos(),
        apiService.getCargos(),
        apiService.getAuthStatus(),
      ])
      setUsuarios(usuariosData)
      setGrupos(gruposData)
      setCargos(cargosData.filter(c => c.ativo !== false))
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
        await apiService.updateUsuario(editingId, form.nome, form.email, form.grupo_id || null, form.cargo_id || null)
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
        await apiService.createUsuario(form.nome, form.email, form.grupo_id || null, redirectTo, form.cargo_id || null)
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
    setForm({ nome: usuario.nome, email: usuario.email, senha: '', senhaConfirm: '', grupo_id: usuario.grupo_id || '', cargo_id: usuario.cargo_id || '' })
    setEditingId(usuario.id)
    setAlterarSenha(false)
    setShowSenha(false)
    setShowSenhaConfirm(false)
    setShowForm(true)
  }

  const handleReenviarConvite = async (usuario) => {
    setReenviandoId(usuario.id)
    setReenviadoId(null)
    try {
      await apiService.sendResetPasswordEmail(usuario.email, `${URL_PRODUCAO}/redefinir-senha`)
      setReenviadoId(usuario.id)
      setConviteEnviado({ nome: usuario.nome, email: usuario.email, tipo: 'reenvio' })
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
    setForm({ nome: '', email: '', senha: '', senhaConfirm: '', grupo_id: '', cargo_id: '' })
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
              <CargoCombobox
                value={form.cargo_id}
                onChange={(id) => setForm({ ...form, cargo_id: id })}
                placeholder="— Sem cargo —"
                opcoes={[...cargos].sort((a, b) => a.nome_cargo.localeCompare(b.nome_cargo, 'pt-BR') || (a.nome_empresa || '').localeCompare(b.nome_empresa || '', 'pt-BR'))}
              />
              <p className="text-[11px] text-slate-400 -mt-1">
                O cargo define quais tarefas de fluxos (BPM) esse usuário pode assumir.
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
                  {cargos.find(a => a.id === u.cargo_id)?.nome_cargo || <span className="text-slate-300">—</span>}
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
                    title={reenviandoId === u.id ? 'Enviando...' : reenviadoId === u.id ? 'E-mail enviado!' : 'Reenviar e-mail com o link de definição/redefinição de senha (aponta para o sistema em produção)'}
                    className={`inline-flex items-center justify-center p-1.5 rounded border transition-colors disabled:opacity-50 ${
                      reenviadoId === u.id
                        ? 'border-green-300 text-green-700 bg-green-50'
                        : 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                    }`}
                  >
                    {reenviadoId === u.id ? <Check size={13} /> : <Send size={13} />}
                  </button>
                  {isAdmin && u.email !== user?.email && (
                    <button
                      onClick={() => iniciarVisualizacao(u)}
                      title={`Visualizar como ${u.nome}`}
                      className="inline-flex items-center justify-center p-1.5 rounded border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                    >
                      <UserCheck size={13} />
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
                <span className="text-xs font-semibold text-slate-800">
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
