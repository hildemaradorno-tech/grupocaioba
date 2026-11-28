import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Play, Layers } from 'lucide-react'
import { APRESENTACOES } from './catalogo'
import Palco, { useFonteApresentacao } from './Palco'

const CARD_W = 360
const ESCALA_CAPA = CARD_W / 1280

// Treinamentos › Apresentações: catálogo das apresentações feitas no próprio sistema.
// A capa do card é o slide 1 desenhado ao vivo (não é imagem). Ao clicar, abre o player.
export default function Apresentacoes() {
  useFonteApresentacao()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return APRESENTACOES
    return APRESENTACOES.filter(a => [a.titulo, a.descricao, a.categoria, a.empresa].some(t => (t || '').toLowerCase().includes(q)))
  }, [busca])

  const abrir = (a) => navigate(`/treinamentos/apresentacoes/${a.slug}`)

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1 basis-96">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Apresentações</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-3xl">Apresentações de treinamento. Clique em uma para abrir em tela cheia; use as setas do teclado para passar os slides.</p>
        </div>
        <div className="relative w-64 shrink-0 ml-auto">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar apresentação..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300"
          />
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="text-center text-sm text-slate-400 py-16">Nenhuma apresentação encontrada.</div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_W}px, ${CARD_W}px))` }}>
          {lista.map(a => {
            const Capa = a.slides[0].Componente
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => abrir(a)}
                className="group text-left bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md hover:border-violet-300 transition-all focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <div className="relative bg-slate-100">
                  <div className="pointer-events-none select-none">
                    <Palco Componente={Capa} escala={ESCALA_CAPA} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/35 transition-colors">
                    <span className="flex items-center gap-1.5 bg-white text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-3.5 w-3.5 fill-current" /> Apresentar
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {a.categoria && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{a.categoria}</span>}
                    {a.empresa && <span className="text-[11px] text-slate-500">{a.empresa}</span>}
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-slate-500"><Layers className="h-3 w-3" /> {a.slides.length} slides</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">{a.titulo}</div>
                  {a.descricao && <div className="text-xs text-slate-500 leading-snug">{a.descricao}</div>}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
