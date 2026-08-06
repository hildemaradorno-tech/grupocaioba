import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAY_NAMES = ['D','S','T','Q','Q','S','S']

function dateToIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function isoToLocal(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Aplica máscara dd/mm/aaaa progressivamente enquanto o usuário digita
function maskDate(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

// Converte texto dd/mm/aaaa em ISO, validando data real (rejeita 31/02 etc.)
function parseDisplayToIso(str) {
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10)
  if (mo < 1 || mo > 12) return null
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function dayClass(count, sel, tod) {
  if (sel) return 'bg-blue-600 text-white hover:bg-blue-700'
  if (count >= 3) return 'bg-slate-800 text-white hover:bg-slate-900 ring-1 ring-slate-700'
  if (count === 2) return 'bg-red-500 text-white hover:bg-red-600 ring-1 ring-red-600'
  if (count === 1) return 'bg-amber-200 text-amber-900 hover:bg-amber-300 ring-1 ring-amber-400'
  if (tod) return 'bg-blue-50 text-blue-700 font-bold hover:bg-blue-100'
  return 'text-slate-700 hover:bg-slate-100'
}

function dayTitle(count) {
  if (count === 1) return '1 tarefa agendada neste dia'
  if (count === 2) return '2 tarefas agendadas neste dia'
  if (count >= 3) return `${count} tarefas agendadas neste dia`
  return undefined
}

export default function CalendarioPicker({ name, value, onChange, ocupacao = [], className = '', initialViewDate = '' }) {
  const today = dateToIso(new Date())
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => isoToLocal(value) || isoToLocal(initialViewDate) || new Date())
  const [texto, setTexto] = useState(() => value ? isoToLocal(value).toLocaleDateString('pt-BR') : '')
  const containerRef = useRef(null)

  useEffect(() => {
    if (value) setView(isoToLocal(value))
  }, [value])

  // Sincroniza o texto exibido quando o valor muda externamente (seleção no calendário, limpar, navegação)
  useEffect(() => {
    setTexto(value ? isoToLocal(value).toLocaleDateString('pt-BR') : '')
  }, [value])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const year = view.getFullYear()
  const month = view.getMonth()
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const countOcupacao = (iso) =>
    ocupacao.filter(t => {
      if (!t.data_inicio) return false
      if (!t.data_fim) return iso === t.data_inicio
      return iso >= t.data_inicio && iso <= t.data_fim
    }).length

  const handleSelect = (day) => {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    onChange({ target: { name, value: iso } })
    setOpen(false)
  }

  // Confirma o texto digitado (blur ou Enter): converte para ISO se válido, senão reverte
  const commitTexto = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      if (value) onChange({ target: { name, value: '' } })
      return
    }
    const iso = parseDisplayToIso(trimmed)
    if (iso) {
      if (iso !== value) onChange({ target: { name, value: iso } })
      else setTexto(isoToLocal(iso).toLocaleDateString('pt-BR'))
    } else {
      setTexto(value ? isoToLocal(value).toLocaleDateString('pt-BR') : '')
    }
  }

  const prevMonth = () => setView(new Date(year, month - 1, 1))
  const nextMonth = () => setView(new Date(year, month + 1, 1))

  const hasAnyOcupacao = ocupacao.length > 0

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={texto}
          placeholder="dd/mm/aaaa"
          onFocus={() => {
            if (!value && initialViewDate) setView(isoToLocal(initialViewDate) || new Date())
            setOpen(true)
          }}
          onChange={(e) => setTexto(maskDate(e.target.value))}
          onBlur={(e) => commitTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { commitTexto(e.target.value); setOpen(false); e.currentTarget.blur() }
            if (e.key === 'Escape') { setTexto(value ? isoToLocal(value).toLocaleDateString('pt-BR') : ''); setOpen(false); e.currentTarget.blur() }
          }}
          className="w-full text-xs p-2 pr-6 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white"
        />
        {value && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange({ target: { name, value: '' } }) }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-[200] mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 w-60 left-0">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <span className="text-[11px] font-bold text-slate-700">
              {MONTH_NAMES[month]} {year}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded transition-colors">
              <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
            ))}
          </div>

          {/* Grade de dias */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const count = countOcupacao(iso)
              const sel = iso === value
              const tod = iso === today
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(day)}
                  title={dayTitle(count)}
                  className={`text-center text-[11px] py-1 rounded transition-colors font-medium leading-none ${dayClass(count, sel, tod)}`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Legenda */}
          {hasAnyOcupacao && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-amber-200 ring-1 ring-amber-400 shrink-0" />
                <span className="text-[10px] text-slate-500">1 tarefa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-red-500 ring-1 ring-red-600 shrink-0" />
                <span className="text-[10px] text-slate-500">2 tarefas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-slate-800 ring-1 ring-slate-700 shrink-0" />
                <span className="text-[10px] text-slate-500">3+ tarefas</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
