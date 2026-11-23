/**
 * Indicadores de Produtividade › Evolução › modo Consultores (23/11/2026, pedido do usuário).
 * Mesmos cálculos da aba Consultores (linhasConsultores, recebido por prop): Hr. Faturadas (NF emitida, só na
 * empresa da meta do consultor), Hr. Disp. Reais da empresa rateadas pela meta, Produtividade = Faturadas ÷ Reais,
 * Vlr. Serviços e Vlr. Hora Vendida. Dia = calendário do topo; Mês = 01/01 do ano da data final até a data final.
 * Seleção de vários consultores (vazio = todos).
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChevronDown } from 'lucide-react'
import { semAcento, fmtH, fmtPct, fmtR$ } from './produtividadeCalculos'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '')
const IND_CONS = [
  { id: 'prod', label: 'Produtividade %', fmt: fmtPct },
  { id: 'fat', label: 'Hr. Faturadas', fmt: (v) => `${fmtH(v)} h` },
  { id: 'vl', label: 'Vlr. Serviços', fmt: fmtR$ },
  { id: 'vlHora', label: 'Vlr. Hora Vendida', fmt: fmtR$ },
]

// Soma os consultores escolhidos (vazio = todos) de um conjunto de linhas + metas.
function somaConsultores(linhasConsultores, diario, metas, escolhidos) {
  const ls = linhasConsultores(diario, metas).filter(p => !escolhidos.size || escolhidos.has(semAcento(p.nome)))
  const t = ls.reduce((a, p) => ({ meta: a.meta + (p.meta || 0), reais: a.reais + (p.reais || 0), fat: a.fat + (p.fat || 0), vl: a.vl + (p.vl || 0) }), { meta: 0, reais: 0, fat: 0, vl: 0 })
  return { ...t, prod: t.reais && t.fat ? t.fat / t.reais : null, vlHora: t.fat && t.vl ? t.vl / t.fat : null }
}

function SeletorConsultores({ nomes, escolhidos, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fora = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])
  const resumo = !escolhidos.size ? 'Todos' : escolhidos.size === 1 ? nomes.find(n => escolhidos.has(semAcento(n))) || '1 consultor' : `${escolhidos.size} consultores`
  const alternar = (n) => { const k = semAcento(n); const s = new Set(escolhidos); s.has(k) ? s.delete(k) : s.add(k); onChange(s) }
  return (
    <div className="flex flex-col gap-1 relative" ref={ref}>
      <label className="text-[10px] font-bold text-slate-500 uppercase">Consultores</label>
      <button type="button" onClick={() => setAberto(v => !v)}
        className="w-72 h-[30px] flex items-center justify-between border border-slate-300 rounded-md px-2 text-[11px] bg-white">
        <span className="truncate">{resumo}</span><ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {aberto && (
        <div className="absolute top-full mt-1 z-30 w-72 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg p-1 text-[11px]">
          <label className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer font-semibold border-b border-slate-100">
            <input type="checkbox" checked={!escolhidos.size} onChange={() => onChange(new Set())} /> Todos
          </label>
          {nomes.map(n => (
            <label key={n} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
              <input type="checkbox" checked={escolhidos.has(semAcento(n))} onChange={() => alternar(n)} /> {n}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function TooltipCons({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const t = payload[0].payload.t || {}
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow p-2 text-[11px]">
      <p className="font-bold mb-1">{label}</p>
      <p>Produtividade: <b>{fmtPct(t.prod)}</b></p>
      <p>Hr. Faturadas: {fmtH(t.fat)} · Hr. Disp. Reais: {fmtH(t.reais)}</p>
      <p>Vlr. Serviços: {fmtR$(t.vl)} · Vlr. Hora Vendida: {fmtR$(t.vlHora)}</p>
    </div>
  )
}

export default function EvolucaoConsultores({ modo, diarioEsc, mensalEsc, metasAno, periodo, slot, linhasConsultores }) {
  const [ind, setInd] = useState('prod')
  const [escolhidos, setEscolhidos] = useState(() => new Set())
  const indDef = IND_CONS.find(i => i.id === ind)

  // Consultores que aparecem no período (meta ou NF).
  const nomes = useMemo(() => {
    const base = modo === 'dia' ? diarioEsc : mensalEsc
    const s = new Map()
    for (const l of base) if (l.papel === 'consultor' && l.pessoa) s.set(semAcento(l.pessoa), l.pessoa)
    for (const m of metasAno) if (m.papel === 'consultor' && m.pessoa) s.set(semAcento(m.pessoa), m.pessoa)
    return [...s.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [modo, diarioEsc, mensalEsc, metasAno])

  const metasDoMes = (a, m) => metasAno.filter(x => x.ano === a && x.mes === m)

  // Dia: cada dia com as metas do mês dele.
  const porDia = useMemo(() => {
    if (modo !== 'dia') return []
    const dias = new Map()
    for (const l of diarioEsc) { if (!dias.has(l.data)) dias.set(l.data, []); dias.get(l.data).push(l) }
    return [...dias.entries()].sort().map(([data, ls]) => {
      const t = somaConsultores(linhasConsultores, ls, metasDoMes(Number(data.slice(0, 4)), Number(data.slice(5, 7))), escolhidos)
      return { rotulo: fmtData(data), valor: t[ind], t }
    }).filter(d => d.valor != null && (d.t.fat > 0 || ind === 'prod'))
  }, [modo, diarioEsc, metasAno, escolhidos, ind, linhasConsultores]) // eslint-disable-line react-hooks/exhaustive-deps

  // Mês: de 01/01 do ano da data final até a data final.
  const porMes = useMemo(() => {
    if (modo !== 'mes') return []
    const meses = new Map()
    for (const l of mensalEsc) { if (!meses.has(l.mes)) meses.set(l.mes, []); meses.get(l.mes).push(l) }
    return [...meses.entries()].sort().map(([mes, ls]) => {
      const a = Number(mes.slice(0, 4)), m = Number(mes.slice(5, 7))
      const t = somaConsultores(linhasConsultores, ls, metasDoMes(a, m), escolhidos)
      return { mes, rotulo: `${MESES[m - 1]}/${a}`, valor: t[ind], t }
    })
  }, [modo, mensalEsc, metasAno, escolhidos, ind, linhasConsultores]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalMes = useMemo(() => {
    const t = porMes.reduce((a, c) => ({ meta: a.meta + c.t.meta, reais: a.reais + c.t.reais, fat: a.fat + c.t.fat, vl: a.vl + c.t.vl }), { meta: 0, reais: 0, fat: 0, vl: 0 })
    return { ...t, prod: t.reais && t.fat ? t.fat / t.reais : null, vlHora: t.fat && t.vl ? t.vl / t.fat : null }
  }, [porMes])

  const filtros = (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">Indicadores</label>
        <select value={ind} onChange={e => setInd(e.target.value)} className="w-44 h-[30px] border border-slate-300 rounded-md px-2 text-[11px] bg-white">
          {IND_CONS.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
      </div>
      <SeletorConsultores nomes={nomes} escolhidos={escolhidos} onChange={setEscolhidos} />
    </div>
  )

  const LINHAS = [
    ['Meta Horas', t => fmtH(t.meta || null)],
    ['Hr. Disp. Reais', t => fmtH(t.reais || null)],
    ['Hr. Faturadas', t => fmtH(t.fat || null)],
    ['Produtividade %', t => fmtPct(t.prod)],
    ['Vlr. Serviços', t => fmtR$(t.vl || null)],
    ['Vlr. Hora Vendida', t => fmtR$(t.vlHora)],
  ]

  return (
    <div className="flex flex-col gap-3">
      {slot ? createPortal(filtros, slot) : filtros}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
        <ResponsiveContainer width="100%" height={modo === 'dia' ? 380 : 300}>
          {modo === 'dia' ? (
            <AreaChart data={porDia} margin={{ top: 24, right: 16, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => (ind === 'prod' ? `${Math.round(v * 100)}%` : v.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))} />
              <Tooltip content={<TooltipCons />} />
              <Area type="linear" dataKey="valor" stroke="#0284c7" fill="#7dd3fc" fillOpacity={0.5}>
                <LabelList dataKey="valor" position="top" formatter={(v) => indDef.fmt(v)} style={{ fontSize: 9 }} />
              </Area>
            </AreaChart>
          ) : (
            <BarChart data={porMes} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <XAxis dataKey="rotulo" tick={{ fontSize: 10 }} interval={0} />
              <YAxis hide />
              <Tooltip content={<TooltipCons />} />
              <Bar dataKey="valor" fill="#0ea5e9">
                <LabelList dataKey="valor" position="top" formatter={(v) => indDef.fmt(v)} style={{ fontSize: 10 }} />
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {modo === 'mes' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="text-[11px] min-w-full">
            <thead><tr className="text-slate-600 border-b border-sky-300">
              <th className="text-left py-2 pl-2 sticky left-0 bg-white"></th>
              {porMes.map(c => <th key={c.mes} className="px-3 text-right whitespace-nowrap">{c.rotulo}</th>)}
              <th className="px-3 text-right">Total</th></tr></thead>
            <tbody>
              {LINHAS.map(([rot, f]) => (
                <tr key={rot} className="border-b border-slate-100">
                  <td className="py-1 pl-2 pr-3 whitespace-nowrap sticky left-0 bg-white font-medium">{rot}</td>
                  {porMes.map(c => <td key={c.mes} className="px-3 text-right tabular-nums whitespace-nowrap">{f(c.t)}</td>)}
                  <td className="px-3 text-right tabular-nums font-bold whitespace-nowrap">{f(totalMes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] text-slate-400">
        Consultores: horas da nota fiscal emitida, só na empresa da meta do consultor; Hr. Disp. Reais = as dos mecânicos da empresa rateadas pela meta do consultor (mesma conta da aba Consultores).
      </p>
    </div>
  )
}
