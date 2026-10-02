import React from 'react'

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Botões de mês (1 a 12) para escolher quais colunas aparecem na tabela — um ou vários meses de uma vez.
// `selecionados`: array de números de mês (1-12); vazio = todos os meses aparecem.
// Só esconde colunas (CSS); os totais continuam somando o ano inteiro.
export default function SeletorMeses({ selecionados, onChange }) {
  const set = new Set(selecionados)
  const toggle = (mes) => {
    const n = new Set(set)
    n.has(mes) ? n.delete(mes) : n.add(mes)
    onChange([...n].sort((a, b) => a - b))
  }
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs font-semibold text-slate-500 mr-1">Meses:</span>
      <button type="button" onClick={() => onChange([])}
        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
          set.size === 0 ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
        }`}>
        Todos
      </button>
      {MESES_ABR.map((m, i) => {
        const mes = i + 1
        const ativo = set.size === 0 || set.has(mes)
        return (
          <button type="button" key={mes} onClick={() => toggle(mes)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
              ativo ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
            } ${set.has(mes) ? 'ring-2 ring-indigo-400' : ''}`}>
            {m}
          </button>
        )
      })}
    </div>
  )
}

// CSS que esconde as colunas de mês não selecionadas numa tabela — passe uma className única pra tabela
// (ex.: "tabela-metas-mecanico") e a mesma em `escopo` aqui. col 1 = rótulo, col 2-13 = Jan..Dez.
export function CssMesesOcultos({ escopo, selecionados }) {
  if (!selecionados || selecionados.length === 0) return null
  const ocultos = Array.from({ length: 12 }, (_, i) => i + 1).filter(m => !selecionados.includes(m))
  if (!ocultos.length) return null
  const seletor = ocultos.map(m => `.${escopo} td:nth-child(${m + 1}), .${escopo} th:nth-child(${m + 1})`).join(', ')
  return <style>{`${seletor} { display: none; }`}</style>
}
