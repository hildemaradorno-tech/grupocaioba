import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LayoutGrid, ListTree, Maximize, Minimize, X } from 'lucide-react'
import { getApresentacao, PALCO_W } from './catalogo'
import Palco, { useFonteApresentacao } from './Palco'

const VOLTAR = '/treinamentos/apresentacoes'
const OCULTAR_CONTROLES_MS = 2500

// Player de apresentação: cobre a área de conteúdo (ao lado do menu lateral) e
// escala o palco 1280 × 720 para caber. O slide atual fica na URL (?slide=N),
// então dá pra recarregar ou mandar o link de um slide específico.
//
// Teclado: → ↓ PageDown Espaço Enter = próximo · ← ↑ PageUp Backspace = anterior
//          Home/End = primeiro/último · F = tela cheia · G = grade · I = índice · Esc = sair
//
// Índice (botão no canto superior esquerdo): seções (slide.secao) como títulos
// e os slides de cada seção como subtítulos; clicar vai direto para o slide.

// Agrupa slides seguidos da mesma seção: [{ secao, itens: [{ i, titulo }] }]
function montarIndice(slides) {
  const grupos = []
  slides.forEach((s, i) => {
    const secao = s.secao || 'Slides'
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.secao === secao) ultimo.itens.push({ i, titulo: s.titulo })
    else grupos.push({ secao, itens: [{ i, titulo: s.titulo }] })
  })
  return grupos
}
export default function ApresentacaoPlayer() {
  useFonteApresentacao()
  const { slug } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const apresentacao = getApresentacao(slug)
  const total = apresentacao?.slides.length || 0

  const limitar = useCallback((i) => Math.min(Math.max(i, 0), Math.max(total - 1, 0)), [total])
  const atual = limitar((parseInt(searchParams.get('slide'), 10) || 1) - 1)
  const ir = useCallback((i) => setSearchParams({ slide: String(limitar(i) + 1) }, { replace: true }), [limitar, setSearchParams])

  const raizRef = useRef(null)
  const areaRef = useRef(null)
  const [area, setArea] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [telaCheia, setTelaCheia] = useState(false)
  const [grade, setGrade] = useState(false)
  const [indice, setIndice] = useState(false)
  const [controles, setControles] = useState(true)
  const gruposIndice = React.useMemo(() => montarIndice(apresentacao?.slides || []), [apresentacao])
  const timerRef = useRef(null)

  // O player ocupa só a área de conteúdo (o <main> do layout), sem passar por
  // baixo do menu lateral. Na tela cheia do navegador o próprio navegador
  // estica o elemento para o monitor inteiro.
  const [caixa, setCaixa] = useState(null)
  useLayoutEffect(() => {
    const main = raizRef.current?.closest('main')
    if (!main) return
    const medir = () => {
      const r = main.getBoundingClientRect()
      setCaixa({ left: r.left, top: r.top, width: r.width, height: r.height })
    }
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(main)
    window.addEventListener('resize', medir)
    return () => { ro.disconnect(); window.removeEventListener('resize', medir) }
  }, [])

  // Tamanho disponível → escala do palco
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setArea({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Barra de controles some com o mouse parado
  const mostrarControles = useCallback(() => {
    setControles(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setControles(false), OCULTAR_CONTROLES_MS)
  }, [])
  useEffect(() => { mostrarControles(); return () => clearTimeout(timerRef.current) }, [mostrarControles])

  // Tela cheia do navegador
  useEffect(() => {
    const onChange = () => setTelaCheia(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const alternarTelaCheia = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else raizRef.current?.requestFullscreen?.().catch(() => {})
  }, [])
  // Ao sair do player, sai também da tela cheia
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }, [])

  const sair = useCallback(() => navigate(VOLTAR), [navigate])

  // Teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (grade) {
        if (k === 'Escape' || k === 'g' || k === 'G') { e.preventDefault(); setGrade(false) }
        return
      }
      if (k === 'i' || k === 'I') { e.preventDefault(); setIndice(v => !v); return }
      if (indice && k === 'Escape') { e.preventDefault(); setIndice(false); return }
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); ir(atual + 1) }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); ir(atual - 1) }
      else if (k === 'Home') { e.preventDefault(); ir(0) }
      else if (k === 'End') { e.preventDefault(); ir(total - 1) }
      else if (k === 'f' || k === 'F') { e.preventDefault(); alternarTelaCheia() }
      else if (k === 'g' || k === 'G') { e.preventDefault(); setGrade(true) }
      else if (k === 'Escape' && !document.fullscreenElement) { e.preventDefault(); sair() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [atual, total, grade, indice, ir, alternarTelaCheia, sair])

  if (!apresentacao) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-600">Apresentação não encontrada.</p>
        <Link to={VOLTAR} className="text-sm text-violet-600 hover:underline">Voltar para Apresentações</Link>
      </div>
    )
  }

  const Slide = apresentacao.slides[atual].Componente
  const Proximo = atual + 1 < total ? apresentacao.slides[atual + 1].Componente : null

  // Clique no slide: terço esquerdo volta, o resto avança
  const onClickPalco = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (e.clientX - r.left < r.width / 3) ir(atual - 1)
    else ir(atual + 1)
  }

  const btn = 'p-2 rounded-md text-white/85 hover:text-white hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-colors'

  return (
    <div
      ref={raizRef}
      className="fixed z-[1000] bg-black select-none"
      style={{ cursor: controles ? 'default' : 'none', ...(caixa || { inset: 0, visibility: 'hidden' }) }}
      onMouseMove={mostrarControles}
    >
      <style>{'@keyframes aprSlideEntrada{from{opacity:0}to{opacity:1}}'}</style>

      {/* Palco */}
      <div ref={areaRef} className="absolute inset-0">
        <div key={atual} onClick={onClickPalco} style={{ animation: 'aprSlideEntrada .35s ease-out' }}>
          <Palco Componente={Slide} largura={area.w} altura={area.h} />
        </div>
      </div>

      {/* Próximo slide renderizado fora da tela, só pra já carregar as fotos */}
      {Proximo && (
        <div aria-hidden style={{ position: 'absolute', left: -10000, top: 0, visibility: 'hidden' }}>
          <Palco Componente={Proximo} escala={0.1} />
        </div>
      )}

      {/* Barra de progresso */}
      <div className="absolute left-0 bottom-0 h-1 bg-white/10 w-full">
        <div className="h-full bg-violet-400 transition-all duration-300" style={{ width: `${((atual + 1) / total) * 100}%` }} />
      </div>

      {/* Controles */}
      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/80 backdrop-blur rounded-full px-2 py-1 shadow-lg transition-opacity duration-300 ${controles || grade ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onMouseMove={e => e.stopPropagation()}
        onMouseEnter={() => { clearTimeout(timerRef.current); setControles(true) }}
        onMouseLeave={mostrarControles}
      >
        <button type="button" className={btn} onClick={sair} title="Sair (Esc)"><X className="h-4 w-4" /></button>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button type="button" className={btn} onClick={() => ir(atual - 1)} disabled={atual === 0} title="Anterior (←)"><ChevronLeft className="h-5 w-5" /></button>
        <span className="text-white/90 text-xs font-semibold tabular-nums px-2 min-w-[64px] text-center">{atual + 1} / {total}</span>
        <button type="button" className={btn} onClick={() => ir(atual + 1)} disabled={atual === total - 1} title="Próximo (→)"><ChevronRight className="h-5 w-5" /></button>
        <div className="w-px h-5 bg-white/20 mx-1" />
        <button type="button" className={btn} onClick={() => setGrade(g => !g)} title="Todos os slides (G)"><LayoutGrid className="h-4 w-4" /></button>
        <button type="button" className={btn} onClick={alternarTelaCheia} title={telaCheia ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}>
          {telaCheia ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>

      {/* Índice: fundo escuro que fecha ao clicar fora + painel à esquerda */}
      {indice && <div className="absolute inset-0 bg-black/30" onClick={() => setIndice(false)} />}
      <div
        className={`absolute top-0 left-0 bottom-0 w-80 bg-slate-950/95 backdrop-blur border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ${indice ? 'translate-x-0' : '-translate-x-full'}`}
        onMouseMove={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-14 pb-3 border-b border-white/10">
          <ListTree className="h-4 w-4 text-violet-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-white text-sm font-bold truncate">{apresentacao.titulo}</div>
            <div className="text-white/50 text-[11px]">{gruposIndice.length} seções · {total} slides</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {gruposIndice.map((g, gi) => {
            const ativa = g.itens.some(it => it.i === atual)
            return (
              <div key={gi} className="mb-1">
                <button
                  type="button"
                  onClick={() => { ir(g.itens[0].i); setIndice(false) }}
                  className={`w-full text-left px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${ativa ? 'text-violet-300' : 'text-white/60 hover:text-white'}`}
                >
                  {g.secao}
                </button>
                {g.itens.map(it => (
                  <button
                    key={it.i}
                    type="button"
                    onClick={() => { ir(it.i); setIndice(false) }}
                    className={`w-full flex items-start gap-2.5 text-left pl-6 pr-4 py-1.5 text-xs transition-colors ${it.i === atual ? 'bg-violet-500/20 text-white font-semibold border-l-2 border-violet-400' : 'text-white/75 hover:bg-white/5 hover:text-white border-l-2 border-transparent'}`}
                  >
                    <span className="text-white/40 tabular-nums w-5 shrink-0 text-right">{it.i + 1}</span>
                    <span className="leading-snug">{it.titulo}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </nav>
      </div>

      {/* Canto superior esquerdo: botão do índice (aparece junto com os controles) */}
      <div
        className={`absolute top-2.5 left-3 flex items-center gap-2.5 transition-opacity duration-300 ${(controles || indice) && !grade ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onMouseMove={e => e.stopPropagation()}
        onMouseEnter={() => { clearTimeout(timerRef.current); setControles(true) }}
        onMouseLeave={mostrarControles}
      >
        <button
          type="button"
          onClick={() => setIndice(v => !v)}
          title={indice ? 'Fechar índice (I)' : 'Índice da apresentação (I)'}
          className={`p-1.5 rounded-md bg-slate-900/70 backdrop-blur text-white/85 hover:text-white hover:bg-slate-800 transition-colors ${indice ? 'ring-1 ring-violet-400 text-white' : ''}`}
        >
          {indice ? <X className="h-4 w-4" /> : <ListTree className="h-4 w-4" />}
        </button>
      </div>

      {/* Grade com todos os slides */}
      {grade && (
        <div className="absolute inset-0 bg-slate-950/95 overflow-auto p-8 pb-20" onMouseMove={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <div className="text-white text-sm font-bold">{apresentacao.titulo} <span className="text-white/50 font-normal">· {total} slides</span></div>
            <button type="button" className={btn} onClick={() => setGrade(false)} title="Fechar (Esc)"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(256px, 256px))' }}>
            {apresentacao.slides.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { ir(i); setGrade(false) }}
                className={`text-left rounded-md overflow-hidden ring-2 transition-all ${i === atual ? 'ring-violet-400' : 'ring-transparent hover:ring-white/40'}`}
              >
                <div className="pointer-events-none"><Palco Componente={s.Componente} escala={256 / PALCO_W} /></div>
                <div className="bg-slate-800 px-2 py-1.5 text-[11px] text-white/85 truncate"><span className="text-white/50 mr-1.5">{i + 1}</span>{s.titulo}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
