import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'

// Botão de engrenagem com painel de ações (ícone + título em negrito + descrição cinza).
// itens: [{ icon, cor, titulo, descricao, onClick, disabled }]
export default function MenuEngrenagem({ itens, compacto = false }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const painelRef = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (painelRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
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

  // Painel sempre dentro da janela: alinha à direita do botão se couber, senão à esquerda;
  // abre pra cima se não houver espaço embaixo.
  const LARGURA = 288
  const MARGEM = 8
  const abrirMenu = () => {
    const r = btnRef.current.getBoundingClientRect()
    const altura = visiveis.length * 56 + 8
    const left = r.right - LARGURA >= MARGEM ? r.right - LARGURA : Math.min(r.left, window.innerWidth - LARGURA - MARGEM)
    const abreParaCima = r.bottom + 6 + altura > window.innerHeight - MARGEM && r.top - 6 - altura >= MARGEM
    setPos({ left: Math.max(MARGEM, left), top: abreParaCima ? r.top - 6 - altura : r.bottom + 6 })
    setAberto(true)
  }

  const visiveis = itens.filter(Boolean)
  if (visiveis.length === 0) return null

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (aberto ? setAberto(false) : abrirMenu())}
        aria-label="Ações"
        title="Ações"
        className={`inline-flex items-center justify-center border text-sm rounded-lg transition-colors ${compacto ? 'p-1.5' : 'p-2'} ${aberto ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
      >
        <Settings size={compacto ? 14 : 16} />
      </button>

      {aberto && pos && createPortal(
        <div
          ref={painelRef}
          className="fixed z-50 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-1"
          style={{ left: pos.left, top: pos.top }}
        >
          {visiveis.map(({ icon: Icon, cor, titulo, descricao, onClick, disabled }) => (
            <button
              key={titulo}
              type="button"
              disabled={disabled}
              onClick={() => { setAberto(false); onClick() }}
              className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 disabled:hover:bg-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${cor}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{titulo}</span>
                <span className="block text-xs text-slate-400 mt-0.5">{descricao}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
