import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, Check, X } from 'lucide-react'

// Combobox de seleção única com busca — o <select> nativo fica difícil de navegar com muitas
// opções (cargos, um por empresa; ou funcionários), então digitar filtra a lista em vez de
// rolar tudo procurando. Genérico: quem usa passa como formatar rótulo/busca de cada opção.
export function SearchCombobox({ value, onChange, opcoes, placeholder, emptyOptionLabel, searchPlaceholder, notFoundLabel, getLabel, getSearchText }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-search-combobox-panel]')) { setAberto(false); setBusca('') }
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

  // Alguns lugares que usam esse combobox têm overflow-y-auto no container (ex.: modal de
  // Editar Usuário) — um painel "absolute" aqui dentro ficava cortado/deslocado por esse
  // scroll. Renderiza via portal em document.body, "fixed" na posição real do botão.
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
      if (e.target?.closest?.('[data-search-combobox-panel]')) return
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
  const filtradas = q ? opcoes.filter(o => getSearchText(o).toLowerCase().includes(q)) : opcoes

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrir}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={`truncate ${selecionado ? 'text-slate-800' : 'text-slate-400'}`}>
          {selecionado ? getLabel(selecionado) : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <div
          data-search-combobox-panel
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
              placeholder={searchPlaceholder}
              className="w-full text-sm pl-8 pr-2 py-2 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(''); setAberto(false); setBusca('') }}
              className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
            >
              {emptyOptionLabel}
            </button>
            {filtradas.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{notFoundLabel}</p>
            ) : filtradas.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => { onChange(o.id); setAberto(false); setBusca('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${o.id === value ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700'}`}
              >
                {getLabel(o)}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Variante multi-seleção do combobox acima — cada opção marcada fica na lista (não fecha o
// painel ao marcar, pra permitir selecionar vários seguidos), com um resumo no botão.
export function MultiSearchCombobox({ value, onChange, opcoes, placeholder, searchPlaceholder, notFoundLabel, getLabel, getSearchText, resumo }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const selecionados = new Set(value)

  useEffect(() => {
    const fecharSeClicarFora = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-multi-combobox-panel]')) { setAberto(false); setBusca('') }
    }
    document.addEventListener('mousedown', fecharSeClicarFora)
    return () => document.removeEventListener('mousedown', fecharSeClicarFora)
  }, [])

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
      if (e.target?.closest?.('[data-multi-combobox-panel]')) return
      setAberto(false)
    }
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  const toggle = (id) => {
    const next = new Set(selecionados)
    if (next.has(id)) next.delete(id); else next.add(id)
    onChange([...next])
  }

  const q = busca.trim().toLowerCase()
  const filtradas = q ? opcoes.filter(o => getSearchText(o).toLowerCase().includes(q)) : opcoes
  const rotuloBotao = selecionados.size === 0
    ? placeholder
    : (resumo ? resumo(opcoes.filter(o => selecionados.has(o.id))) : `${selecionados.size} selecionado(s)`)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={abrir}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={`truncate ${selecionados.size ? 'text-slate-800' : 'text-slate-400'}`}>{rotuloBotao}</span>
        {selecionados.size > 0 ? (
          <X
            className="h-4 w-4 text-slate-400 hover:text-slate-600 shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange([]) }}
          />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {aberto && pos && createPortal(
        <div
          data-multi-combobox-panel
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
              placeholder={searchPlaceholder}
              className="w-full text-sm pl-8 pr-2 py-2 focus:outline-none"
            />
          </div>
          <div className="max-h-52 overflow-y-auto custom-scrollbar">
            {filtradas.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400">{notFoundLabel}</p>
            ) : filtradas.map(o => {
              const marcado = selecionados.has(o.id)
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o.id)}
                  className={`w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-blue-50 ${marcado ? 'bg-blue-50/60 text-blue-700' : 'text-slate-700'}`}
                >
                  <span className={`shrink-0 w-4 h-4 rounded border flex items-center justify-center ${marcado ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {marcado && <Check className="h-3 w-3 text-white" />}
                  </span>
                  <span className="truncate">{getLabel(o)}</span>
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
