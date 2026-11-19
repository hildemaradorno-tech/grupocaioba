/**
 * Resumo › Horas Aplicadas: gráfico das horas aplicadas (abertura de O.S.) por tipo de O.S. interno (19/11/2026).
 * Fonte: pv_prod_os.hr_aplic (Trucks: Relatório Geral OS · Motos: Relatório Geral OS TMO do MicroWork), por data de
 * criação da O.S. Tipo interno: Trucks pelo cadastro dim_tipos_os (sigla → tipo_interno); Motos pelo nome do tipo.
 * Mesmos filtros da tela: empresas e mecânicos (só OFICINA/Mecânica).
 */
import React, { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../services/supabaseClient'
import { semAcento, fmtH, fmtPct } from './produtividadeCalculos'
import { tipoInternoMotos } from './AbaEncerradoFaturado'

async function lerTudo(consulta) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta().range(de, de + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

export default function AplicadasPorTipo({ periodo, noEscopo, excluidos }) {
  const [linhas, setLinhas] = useState([])
  const [tipos, setTipos] = useState(() => new Map())
  const [erro, setErro] = useState('')

  useEffect(() => {
    supabase.from('dim_tipos_os').select('sigla, tipo_interno, agrupamento_nome').then(({ data }) => {
      const m = new Map()
      for (const t of data || []) if (t.sigla && /truck/i.test(t.agrupamento_nome || '')) m.set(t.sigla.trim().toUpperCase(), t.tipo_interno)
      setTipos(m)
    })
  }, [])
  useEffect(() => {
    let vivo = true
    if (!periodo.ini || !periodo.fim || periodo.ini > periodo.fim) return
    setErro('')
    lerTudo(() => supabase.from('pv_prod_os').select('marca, empresa, pessoa, os, tipo_os, hr_aplic')
      .eq('papel', 'mecanico').neq('hr_aplic', 0).gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('os'))
      .then(d => { if (vivo) setLinhas(d) })
      .catch(e => { if (vivo) setErro(e.message || String(e)) })
    return () => { vivo = false }
  }, [periodo.ini, periodo.fim])

  const dados = useMemo(() => {
    const g = new Map()
    let tot = 0
    for (const r of linhas) {
      if (!noEscopo(r.empresa, r.marca) || excluidos.has(semAcento(r.pessoa))) continue
      const interno = r.marca === 'TRUCKS' ? (tipos.get(String(r.tipo_os || '').trim().toUpperCase()) || 'Sem cadastro') : tipoInternoMotos(r.tipo_os)
      const x = g.get(interno) || { nome: interno, h: 0, os: new Set() }
      const h = Number(r.hr_aplic) || 0
      x.h += h; x.os.add(`${r.empresa}|${r.os}`); tot += h
      g.set(interno, x)
    }
    return [...g.values()].sort((a, b) => b.h - a.h)
      .map(x => ({ ...x, qtdOs: x.os.size, pct: tot ? x.h / tot : 0, rot: `${fmtH(x.h)} h|${fmtPct(tot ? x.h / tot : 0)}` }))
  }, [linhas, tipos, noEscopo, excluidos])

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
      <p className="text-[11px] font-bold text-slate-600 mb-1">Horas aplicadas por tipo de O.S. interno</p>
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
      {!dados.length ? <p className="text-[11px] text-slate-400 py-6 text-center">Sem horas aplicadas no período.</p> : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 28, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} />
            <YAxis hide />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 11 }}
              formatter={(v, n, item) => { const d = item?.payload || {}; return [`${fmtH(d.h)} h · ${fmtPct(d.pct)} · ${d.qtdOs} O.S.`, 'Horas aplicadas'] }} />
            <Bar dataKey="h" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={70}>
              <LabelList dataKey="rot" content={(pr) => {
                const vb = pr.viewBox || {}, x = pr.x ?? vb.x, y = pr.y ?? vb.y, w = pr.width ?? vb.width
                if (!pr.value || x == null || y == null) return null
                const [l1, l2] = String(pr.value).split('|'), cx = Number(x) + Number(w || 0) / 2
                return (
                  <text x={cx} y={Number(y) - 16} textAnchor="middle" fontSize={10} fill="#334155">
                    <tspan x={cx} dy={0} fontWeight={700}>{l1}</tspan>
                    <tspan x={cx} dy={11} fill="#64748b">{l2}</tspan>
                  </text>
                )
              }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
