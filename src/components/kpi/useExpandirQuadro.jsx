import React, { useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

// Expandir um quadro da Matriz KPIs (bloco de um gerente/função) para ocupar a tela toda e voltar.
// Botão no canto direito da linha do título; Esc ou clique fora também voltam.
// Uso: const ex = useExpandirQuadro(titulo)
//   <>{ex.fundo}<div className={`... ${ex.classeCaixa}`}> … título … {ex.botao} … <div className={ex.classeRolagem}>tabela</div></div></>
// Área de conteúdo da página (à direita do menu lateral): o quadro expandido fica dentro dela, sem
// passar por baixo da barra de menus. Sem <main>, usa a janela inteira.
function areaConteudo() {
  const main = document.querySelector('main')
  const r = main ? main.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
  return { left: Math.max(0, r.left), top: Math.max(0, r.top), right: Math.min(window.innerWidth, r.right), bottom: Math.min(window.innerHeight, r.bottom) }
}

export function useExpandirQuadro(titulo = 'quadro') {
  const [expandido, setExpandido] = useState(false)
  const [area, setArea] = useState(null)

  useEffect(() => {
    if (!expandido) return undefined
    const medir = () => setArea(areaConteudo())
    medir()
    const esc = (e) => { if (e.key === 'Escape') setExpandido(false) }
    document.addEventListener('keydown', esc)
    window.addEventListener('resize', medir)
    const overflowAntes = document.body.style.overflow
    document.body.style.overflow = 'hidden' // a página de trás não rola com o quadro aberto
    return () => {
      document.removeEventListener('keydown', esc)
      window.removeEventListener('resize', medir)
      document.body.style.overflow = overflowAntes
    }
  }, [expandido])

  const M = 12 // margem dentro da área de conteúdo
  const lim = area || { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }

  const botao = (
    <button
      type="button"
      onClick={() => { if (!expandido) setArea(areaConteudo()); setExpandido((v) => !v) }}
      aria-pressed={expandido}
      aria-label={expandido ? `Voltar à tela normal — ${titulo}` : `Expandir ${titulo}`}
      title={expandido ? 'Voltar à tela normal (Esc)' : 'Expandir este quadro'}
      className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold bg-white/15 hover:bg-white/25 transition-colors"
    >
      {expandido ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      {expandido ? 'Voltar' : 'Expandir'}
    </button>
  )

  return {
    expandido,
    botao,
    // Caixa do quadro: expandido ocupa a área de conteúdo (com margem), sem cobrir o menu lateral.
    classeCaixa: expandido ? 'fixed z-50 flex flex-col shadow-2xl' : '',
    estiloCaixa: expandido
      ? { left: lim.left + M, top: lim.top + M, width: Math.max(0, lim.right - lim.left - 2 * M), height: Math.max(0, lim.bottom - lim.top - 2 * M) }
      : undefined,
    // Área da tabela: expandido rola por dentro (horizontal e vertical).
    classeRolagem: expandido ? 'flex-1 overflow-auto' : 'overflow-x-auto',
    // Cabeçalho da tabela (thead): expandido fica travado no topo; só as linhas dos indicadores rolam.
    classeCabecalho: expandido ? 'sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgb(226,232,240)]' : undefined,
    fundo: expandido
      ? <div className="fixed z-40 bg-slate-900/50" onClick={() => setExpandido(false)} aria-hidden="true"
          style={{ left: lim.left, top: lim.top, width: lim.right - lim.left, height: lim.bottom - lim.top }} />
      : null,
  }
}
