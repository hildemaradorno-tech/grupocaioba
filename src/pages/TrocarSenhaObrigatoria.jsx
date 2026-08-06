import { useState } from 'react'
import { ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function TrocarSenhaObrigatoria({ onSuccess }) {
  const { user, logout } = useAuth()
  const [nova, setNova] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verNova, setVerNova] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (nova.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (nova !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }

    setSalvando(true)
    try {
      const { error: errAuth } = await supabase.auth.updateUser({ password: nova })
      if (errAuth) throw errAuth

      await supabase.from('usuarios')
        .update({ trocar_senha: false, senha: nova })
        .eq('email', user.email)

      onSuccess()
    } catch (err) {
      setErro(err.message || 'Erro ao atualizar a senha. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-amber-500 px-6 py-5 flex items-center gap-3">
          <ShieldAlert className="text-white shrink-0" size={28} />
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Troca de senha obrigatória</h2>
            <p className="text-amber-100 text-sm">Por segurança, você precisa definir uma nova senha antes de continuar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={verNova ? 'text' : 'password'}
                value={nova}
                onChange={e => setNova(e.target.value)}
                required
                autoFocus
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setVerNova(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {verNova ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirmar nova senha
            </label>
            <div className="relative">
              <input
                type={verConfirmar ? 'text' : 'password'}
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                required
                placeholder="Repita a nova senha"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="button"
                onClick={() => setVerConfirmar(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {verConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
