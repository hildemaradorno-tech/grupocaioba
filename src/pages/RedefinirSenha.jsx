import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react'
import { supabase } from '../services/supabaseClient'

export default function RedefinirSenha() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking') // 'checking' | 'ready' | 'invalid'
  const [tipoLink, setTipoLink] = useState(null) // 'recovery' | 'invite' — muda o texto da tela
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [verNova, setVerNova] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const resolvidoRef = useRef(false)

  useEffect(() => {
    const marcarInvalido = () => {
      if (resolvidoRef.current) return
      resolvidoRef.current = true
      setStatus('invalid')
    }
    const marcarPronto = () => {
      if (resolvidoRef.current) return
      resolvidoRef.current = true
      setStatus('ready')
    }

    const hash = window.location.hash || ''
    if (hash.includes('error=') || hash.includes('error_code=')) {
      marcarInvalido()
      return
    }
    // Só prossegue se a URL realmente carrega um token do Supabase de redefinição
    // (#type=recovery, link de "esqueci minha senha") ou de convite de novo usuário
    // (#type=invite, e-mail de boas-vindas). Sem isso, uma sessão normal já ativa no
    // navegador não deve liberar a troca de senha por essa tela pública.
    if (hash.includes('type=invite')) setTipoLink('invite')
    else if (hash.includes('type=recovery')) setTipoLink('recovery')
    else { marcarInvalido(); return }

    // Convite (novo usuário) estabelece uma sessão normal (SIGNED_IN); redefinição de
    // senha estabelece uma sessão especial de recuperação (PASSWORD_RECOVERY).
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') marcarPronto()
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) marcarPronto()
    })

    const timeout = setTimeout(marcarInvalido, 3000)

    return () => {
      clearTimeout(timeout)
      subscription?.subscription?.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    try {
      const { error: errAuth } = await supabase.auth.updateUser({ password: novaSenha })
      if (errAuth) throw errAuth

      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        await supabase.from('usuarios')
          .update({ trocar_senha: false, senha_atualizada_em: new Date().toISOString() })
          .eq('email', user.email)
      }

      await supabase.auth.signOut()
      navigate('/login?reset=ok', { replace: true })
    } catch (err) {
      setErro(err.message || 'Erro ao atualizar a senha. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Sistema de Gestão</h1>
          <p className="text-slate-400 text-sm mt-1">
            {tipoLink === 'invite' ? 'Bem-vindo(a)! Defina sua senha de acesso.' : 'Redefinição de senha'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              {tipoLink === 'invite' ? 'Definir senha' : 'Nova senha'}
            </h2>
          </div>

          <div className="px-8 py-6">
            {status === 'checking' && (
              <div className="flex flex-col items-center gap-3 py-6 text-slate-500">
                <span className="inline-block h-6 w-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">Verificando link...</p>
              </div>
            )}

            {status === 'invalid' && (
              <div className="space-y-5">
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs font-semibold text-red-700 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Este link expirou ou já foi utilizado. Solicite um novo na tela de login.</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  Voltar para login
                </button>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} className="space-y-5">

                {erro && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs font-semibold text-red-700">
                    {erro}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={verNova ? 'text' : 'password'}
                      required
                      autoFocus
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full text-sm px-3 py-2.5 pr-10 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setVerNova(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {verNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <input
                      type={verConfirmar ? 'text' : 'password'}
                      required
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full text-sm px-3 py-2.5 pr-10 border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setVerConfirmar(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {verConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvando}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors mt-2"
                >
                  {salvando && (
                    <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {salvando ? 'Salvando...' : (tipoLink === 'invite' ? 'Criar senha e continuar' : 'Salvar nova senha')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
