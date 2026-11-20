// Componentes compartilhados dos monitores de Governança (Monitor Railway, Monitor Supabase) — 19/11/2026.
import React, { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Activity, Loader2 } from 'lucide-react'

// ── Pontos de controle ("Precisa de atenção") ──
export const NIVEL = {
  critico: { txt: 'Crítico', cls: 'bg-red-50 border-red-200 text-red-800', dot: 'bg-red-500', icon: XCircle, iconCls: 'text-red-600' },
  atencao: { txt: 'Atenção', cls: 'bg-amber-50 border-amber-200 text-amber-800', dot: 'bg-amber-500', icon: AlertTriangle, iconCls: 'text-amber-600' },
  info: { txt: 'Recomendação', cls: 'bg-sky-50 border-sky-200 text-sky-800', dot: 'bg-sky-500', icon: Activity, iconCls: 'text-sky-600' },
  ok: { txt: 'OK', cls: 'bg-white border-slate-200 text-slate-700', dot: 'bg-emerald-500', icon: CheckCircle2, iconCls: 'text-emerald-600' },
}
export function PainelControles({ controles, erro, recarregando }) {
  const [verOk, setVerOk] = useState(false)
  if (erro) return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" /> Não foi possível calcular os pontos de controle: {erro}
    </div>
  )
  if (!controles) return <p className="text-[11px] text-slate-400">Verificando os pontos de controle...</p>
  const lista = controles.controles
  const problemas = lista.filter(c => c.nivel !== 'ok')
  const oks = lista.filter(c => c.nivel === 'ok')
  const r = controles.resumo
  const linha = (c) => {
    const n = NIVEL[c.nivel]
    const Icon = n.icon
    return (
      <div key={c.id} className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 ${n.cls}`}>
        <Icon className={`h-4 w-4 shrink-0 mt-px ${n.iconCls}`} />
        <div className="flex-1 min-w-0 text-[11px]">
          <p><span className="font-bold">{c.titulo}</span> <span className="opacity-70">· {c.grupo}</span></p>
          {c.detalhe && <p className="opacity-90">{c.detalhe}</p>}
        </div>
        {c.link && (
          <a href={c.link} target="_blank" rel="noreferrer"
            className="shrink-0 px-2 py-1 rounded-md bg-white/80 border border-current text-[10px] font-semibold hover:bg-white">{c.linkTxt || 'Abrir'}</a>
        )}
      </div>
    )
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Precisa de atenção</p>
        <div className="flex items-center gap-3 text-[11px]">
          {[['critico', r.critico], ['atencao', r.atencao], ['info', r.info], ['ok', r.ok]].map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1 text-slate-600"><span className={`h-2 w-2 rounded-full ${NIVEL[k].dot}`} /> {v} {NIVEL[k].txt.toLowerCase()}</span>
          ))}
          {recarregando && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {problemas.length === 0
          ? <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Tudo dentro do controle — nada passou dos limites.</p>
          : problemas.map(linha)}
        <button type="button" onClick={() => setVerOk(v => !v)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">
          {verOk ? '▾' : '▸'} {oks.length} ponto(s) de controle OK
        </button>
        {verOk && <div className="space-y-2">{oks.map(linha)}</div>}
      </div>
    </div>
  )
}

// Relógio (velocímetro de meia-volta) genérico: faixas coloridas, marcas, ponteiro no valor e, opcional,
// um traço marcando outro valor (ex.: pico). Usado no tempo de resposta e na memória.
export function Relogio({ valor, faixas, marcas, fmtMarca, marcador = null, rotuloAria }) {
  const max = faixas[faixas.length - 1].ate
  const cx = 70, cy = 66, r = 52
  const ponto = (v, raio = r) => {
    const ang = Math.PI * (1 - Math.max(0, Math.min(v, max)) / max)
    return [cx + raio * Math.cos(ang), cy - raio * Math.sin(ang)]
  }
  const arco = (de, ate) => {
    const [x1, y1] = ponto(de)
    const [x2, y2] = ponto(ate)
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`
  }
  let ini = 0
  const [px, py] = ponto(valor, r - 12)
  const faixa = faixas.find(f => valor <= f.ate) || faixas[faixas.length - 1]
  const corTexto = faixa.corTexto || faixa.cor
  return (
    <div className="mt-1 flex justify-center">
      <svg viewBox="-8 -8 156 90" className="w-full max-w-[220px]" role="img" aria-label={rotuloAria}>
        {faixas.map(f => {
          const d = arco(ini, f.ate)
          ini = f.ate
          return <path key={f.txt} d={d} fill="none" stroke={f.cor} strokeWidth="10" />
        })}
        {marcas.map(v => {
          const [x1, y1] = ponto(v, r + 6)
          const [x2, y2] = ponto(v, r + 10)
          const [tx, ty] = ponto(v, r + 17)
          return (
            <g key={v}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1" />
              <text x={tx} y={ty + 3} fontSize="7" textAnchor="middle" fill="#94a3b8">{fmtMarca(v)}</text>
            </g>
          )
        })}
        {marcador != null && (() => {
          const [x1, y1] = ponto(marcador, r - 7)
          const [x2, y2] = ponto(marcador, r + 7)
          return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#334155" strokeWidth="2" strokeDasharray="2 1.5" />
        })()}
        <line x1={cx} y1={cy} x2={px} y2={py} stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4.5" fill="#1e293b" />
        <text x={cx} y={cy + 11} fontSize="8" textAnchor="middle" fontWeight="700" fill={corTexto}>{faixa.txt}</text>
      </svg>
    </div>
  )
}


// Barra de uso × capacidade: verde até 60%, âmbar até 85%, vermelho acima
export function BarraUso({ rotulo, usado, total, txtUsado, txtTotal, obs, pctMarcador, txtMarcador }) {
  const pct = total ? Math.min(100, (usado / total) * 100) : 0
  const cor = pct >= 85 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span className="text-slate-600 font-semibold">{rotulo}</span>
        <span className="text-slate-500"><strong className="text-slate-800">{txtUsado}</strong> de {txtTotal} · <strong className={pct >= 85 ? 'text-red-600' : pct >= 60 ? 'text-amber-600' : 'text-emerald-600'}>{pct < 1 && pct > 0 ? '<1' : Math.round(pct)}%</strong></span>
      </div>
      <div className="relative h-2 mt-1 rounded-full bg-slate-100 overflow-visible">
        <div className={`h-2 rounded-full ${cor}`} style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }} />
        {pctMarcador != null && (
          <div title={txtMarcador} className="absolute -top-0.5 h-3 w-0.5 bg-slate-500" style={{ left: `${Math.min(100, pctMarcador)}%` }} />
        )}
      </div>
      {obs && <p className="text-[10px] text-slate-400 mt-0.5">{obs}</p>}
    </div>
  )
}

