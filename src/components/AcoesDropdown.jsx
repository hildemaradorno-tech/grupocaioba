import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings, Eye, Edit2, Copy, Trash2, Loader2 } from 'lucide-react'

// Menu de Ações da linha, atrás de um botão de engrenagem — evita vários ícones soltos na
// tabela. O painel abre via portal (position:fixed na posição real do botão) porque a tabela
// rola na horizontal (overflow-x-auto) — pela regra do CSS, isso faz o overflow-y virar "auto"
// também, cortando um menu "absolute" comum assim que ele passa da altura do container.
// Ação sem handler (null) não aparece no menu.
export default function AcoesDropdown({ onVer, onEditar, onExcluir, onDuplicar, duplicando }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (painelRef.current?.contains(e.target)) return
      if (btnRef.current?.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  if (!onVer && !onEditar && !onExcluir && !onDuplicar) return null

  const abrir = () => {
    const r = btnRef.current.getBoundingClientRect()
    setPos({ left: r.left, top: r.bottom + 4 })
    setAberto(true)
  }

  const item = (onClick, Icon, texto, extraClass = '', disabled = false) => (
    <button type="button" disabled={disabled} onClick={() => { setAberto(false); onClick() }}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${extraClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" /> {texto}
    </button>
  )

  return (
    <>
      <button ref={btnRef} type="button" onClick={() => (aberto ? setAberto(false) : abrir())}
        className={`p-1.5 rounded transition-colors ${aberto ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
        title="Ações">
        <Settings className="h-4 w-4" />
      </button>
      {aberto && pos && createPortal(
        <div ref={painelRef} className="fixed z-50 w-44 bg-white border border-slate-200 rounded-md shadow-xl py-1"
          style={{ left: pos.left, top: pos.top }}>
          {onVer && item(onVer, Eye, 'Visualizar', 'text-slate-700')}
          {onEditar && item(onEditar, Edit2, 'Editar', 'text-blue-700')}
          {onDuplicar && item(onDuplicar, duplicando ? Loader2 : Copy, duplicando ? 'Duplicando...' : 'Duplicar', `text-indigo-700 ${duplicando ? '[&_svg]:animate-spin' : ''}`, duplicando)}
          {onExcluir && item(onExcluir, Trash2, 'Excluir', 'text-red-600')}
        </div>,
        document.body
      )}
    </>
  )
}
