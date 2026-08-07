import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, LogIn, MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/supabaseClient'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetOk = searchParams.get('reset') === 'ok'

  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const [recuperarEmail, setRecuperarEmail] = useState('')
  const [recuperarLoading, setRecuperarLoading] = useState(false)
  const [recuperarEnviado, setRecuperarEnviado] = useState(false)
  const [recuperarErro, setRecuperarErro] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/')
    } catch (err) {
      setErro(err.message || 'E-mail ou senha inválidos. Verifique suas credenciais.')
    } finally {
      setLoading(false)
    }
  }

  const voltarParaLogin = () => {
    setModo('login')
    setRecuperarEmail('')
    setRecuperarEnviado(false)
    setRecuperarErro('')
  }

  const handleRecuperar = async (e) => {
    e.preventDefault()
    setRecuperarErro('')
    setRecuperarLoading(true)
    try {
      await apiService.sendResetPasswordEmail(recuperarEmail, `${window.location.origin}/redefinir-senha`)
    } catch (err) {
      // Não expõe se o e-mail existe ou não — mesma mensagem genérica.
    } finally {
      setRecuperarLoading(false)
      setRecuperarEnviado(true)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <LogIn className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sistema de Gestão</h1>
          <p className="text-slate-400 text-sm mt-1">Acesse com seu e-mail e senha</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              {modo === 'login' ? 'Login' : 'Recuperar senha'}
            </h2>
          </div>

          {modo === 'login' ? (
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

              {/* Sucesso da redefinição de senha */}
              {resetOk && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs font-semibold text-emerald-700">
                  Senha redefinida com sucesso. Faça login com sua nova senha.
                </div>
              )}

              {/* Erro */}
              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs font-semibold text-red-700">
                  {erro}
                </div>
              )}

              {/* E-mail */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                />
              </div>

              {/* Senha */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setModo('recuperar')}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm px-3 py-2.5 pr-10 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Botão */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors mt-2"
              >
                {loading ? (
                  <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>

            </form>
          ) : (
            <div className="px-8 py-6 space-y-5">

              {recuperarEnviado ? (
                <>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs font-semibold text-emerald-700 flex items-start gap-2">
                    <MailCheck className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Se o e-mail informado estiver cadastrado, você receberá um link para redefinir sua senha em instantes.</span>
                  </div>
                  <button
                    type="button"
                    onClick={voltarParaLogin}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    Voltar para login
                  </button>
                </>
              ) : (
                <form onSubmit={handleRecuperar} className="space-y-5">
                  <p className="text-xs text-slate-500">
                    Informe seu e-mail cadastrado. Vamos enviar um link para você definir uma nova senha.
                  </p>

                  {recuperarErro && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs font-semibold text-red-700">
                      {recuperarErro}
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      E-mail
                    </label>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={recuperarEmail}
                      onChange={(e) => setRecuperarEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={recuperarLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                  >
                    {recuperarLoading && (
                      <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {recuperarLoading ? 'Enviando...' : 'Enviar link de redefinição'}
                  </button>

                  <button
                    type="button"
                    onClick={voltarParaLogin}
                    className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
                  >
                    Voltar para login
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Problemas de acesso? Contate o administrador.
        </p>
      </div>
    </div>
  )
}
