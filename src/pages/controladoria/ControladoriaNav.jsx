import React from 'react'
import { NavLink } from 'react-router-dom'
import { FileBarChart, ListTree, Target, PiggyBank, X, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Abas do menu Controladoria (Configurações → Departamentos → Controladoria) — cada aba é uma
// rota/permissão própria (menuTree _config.departamentos.controladoria).
const LINKS = [
  { to: '/controladoria/dre', label: 'DRE', icon: FileBarChart },
  { to: '/controladoria/plano-contas', label: 'Plano de Contas', icon: ListTree },
  { to: '/controladoria/centro-resultado', label: 'Centro de Resultado', icon: Target },
  { to: '/controladoria/orcamento', label: 'Orçamento', icon: PiggyBank },
]

export default function ControladoriaNav() {
  const { hasPermission } = useAuth()
  return (
    <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-lg p-0.5 w-fit">
      {LINKS.filter(l => hasPermission(l.to)).map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
            }`
          }
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </NavLink>
      ))}
    </div>
  )
}

// Cabeçalho comum das 3 abas: título do módulo + abas + botão de ação à direita.
export function CabecalhoControladoria({ descricao, acao }) {
  return (
    <div className="border-b border-slate-200 pb-4 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Controladoria</h1>
          <p className="text-xs text-slate-500">{descricao}</p>
        </div>
        {acao}
      </div>
      <ControladoriaNav />
    </div>
  )
}

export const INPUT = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
export const LABEL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

export function ModalForm({ titulo, icon: Icon, erro, salvando, onFechar, onSalvar, largura = 'w-[460px]', children }) {
  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg border border-slate-200 ${largura} max-h-[90vh] flex flex-col shadow-xl overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-indigo-600" />}
            {titulo}
          </h3>
          <button type="button" onClick={onFechar} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSalvar() }} className="flex flex-col min-h-0">
          <div className="p-5 space-y-4 overflow-y-auto">{children}</div>
          {erro && (
            <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erro}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
            <button type="button" onClick={onFechar} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
            <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
              {salvando ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ConfirmarExclusao({ texto, onVoltar, onConfirmar }) {
  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
        <div className="p-4 flex items-start gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{texto}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onVoltar} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
          <button onClick={onConfirmar} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
        </div>
      </div>
    </div>
  )
}

export function BadgeAtivo({ ativo }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// Mensagem padrão de erro do Supabase pra códigos duplicados.
export function mensagemErro(err, oQue) {
  const msg = err?.message || String(err)
  if (msg.includes('duplicate key') || msg.includes('unique')) return `Já existe ${oQue} com esse código.`
  return 'Erro ao salvar: ' + msg
}
