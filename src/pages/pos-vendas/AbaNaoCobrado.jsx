/**
 * Pós-Vendas › Indicadores de Produtividade › Análise de Horas › botão "Não cobrado" (18/11/2026, pedido do usuário).
 *
 * Serviços executados e NÃO cobrados do cliente — ROF101_SERVICOEXECUTADO (Dealer.net, só Trucks), tabela
 * pv_prod_nao_cobrado (lida na atualização do BI). Período pela data da O.S. (DataCriacao do relatório).
 * Mostra: cards, gráficos por tipo de O.S. interno, por mecânico e por serviço (TMO), tabela por serviço e tabela
 * por mecânico → O.S. → serviços. Todo clique (barra/linha) filtra a tela inteira; clicar de novo tira.
 */
import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../services/supabaseClient'
import { semAcento, fmtH, fmtPct, fmtR$ } from './produtividadeCalculos'

const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '')
const rotH = (v) => `${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
function rotVl(v) {
  v = v || 0
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}
// ROF101 repete o código do TMO ("4014402 4014402 1 gaxeta…") — tira a repetição para mostrar e agrupar.
function nomeServico(s) {
  const p = String(s || '').trim().split(/\s+/)
  if (p.length > 1 && p[0].toUpperCase() === p[1].toUpperCase()) p.shift()
  return p.join(' ') || '(sem serviço)'
}
const COR = '#f59e0b' // amarelo do Não cobrado (mesmo do card no modo Encerrado)

async function lerTudo(consulta) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await consulta().range(de, de + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// Rótulo em cima/ao lado da barra (Recharts 3 entrega a posição em viewBox).
const rotulo = (horizontal) => (pr) => {
  const vb = pr.viewBox || {}
  const x = pr.x ?? vb.x, y = pr.y ?? vb.y, w = pr.width ?? vb.width, h = pr.height ?? vb.height
  if (!pr.value || x == null || y == null) return null
  if (horizontal) return <text x={Number(x) + Number(w || 0) + 4} y={Number(y) + Number(h || 0) / 2 + 3} fontSize={10} fontWeight={700} fill="#334155">{pr.value}</text>
  return <text x={Number(x) + Number(w || 0) / 2} y={Number(y) - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="#334155">{pr.value}</text>
}

export default function AbaNaoCobrado({ periodo, noEscopo, excluidos, tipoDe, buscaOs, recarga }) {
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [medida, setMedida] = useState('vl') // h | vl (gráficos)
  const [fTipo, setFTipo] = useState('')
  const [fMec, setFMec] = useState('')
  const [fServ, setFServ] = useState('')
  const [aberto, setAberto] = useState(() => new Set())
  const [osAbertas, setOsAbertas] = useState(() => new Set())

  useEffect(() => {
    let vivo = true
    if (!periodo.ini || !periodo.fim || periodo.ini > periodo.fim) return
    setCarregando(true); setErro('')
    lerTudo(() => supabase.from('pv_prod_nao_cobrado').select('data, ano, mes, marca, empresa, consultor, pessoa, os, tipo_os, servico, horas, valor_total')
      .gte('data', periodo.ini).lte('data', periodo.fim).order('data').order('os').order('id'))
      .then(d => { if (vivo) setLinhas(d) })
      .catch(e => { if (vivo) setErro(e.message || String(e)) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [periodo.ini, periodo.fim, recarga])

  // Linhas no escopo (empresa, mecânico permitido, busca) com tipo interno e serviço tratados.
  const base = useMemo(() => linhas
    .filter(r => noEscopo(r.empresa, r.marca) && !excluidos.has(semAcento(r.pessoa)) && (!buscaOs || String(r.os).includes(buscaOs)))
    .map(r => {
      const t = tipoDe({ marca: r.marca, tipo: r.tipo_os })
      return { ...r, h: Number(r.horas) || 0, vl: Number(r.valor_total) || 0, interno: t.interno, tipoNome: t.nome, serv: nomeServico(r.servico), mec: r.pessoa || '(sem mecânico)' }
    }), [linhas, noEscopo, excluidos, buscaOs, tipoDe])
  // Filtros de clique valem para tudo.
  const dados = useMemo(() => base.filter(r => (!fTipo || r.interno === fTipo) && (!fMec || r.mec === fMec) && (!fServ || r.serv === fServ)), [base, fTipo, fMec, fServ])

  const agrupar = (chave) => {
    const m = new Map()
    for (const r of dados) {
      const k = r[chave]
      const g = m.get(k) || { nome: k, h: 0, vl: 0, n: 0, os: new Set() }
      g.h += r.h; g.vl += r.vl; g.n++; g.os.add(`${r.empresa}|${r.os}`)
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => b[medida] - a[medida] || b.vl - a.vl)
  }
  const porTipo = useMemo(() => agrupar('interno'), [dados, medida]) // eslint-disable-line react-hooks/exhaustive-deps
  const porMec = useMemo(() => agrupar('mec'), [dados, medida]) // eslint-disable-line react-hooks/exhaustive-deps
  const porServ = useMemo(() => agrupar('serv'), [dados, medida]) // eslint-disable-line react-hooks/exhaustive-deps
  const tot = useMemo(() => dados.reduce((a, r) => ({ h: a.h + r.h, vl: a.vl + r.vl }), { h: 0, vl: 0 }), [dados])
  const qtdOs = useMemo(() => new Set(dados.map(r => `${r.empresa}|${r.os}`)).size, [dados])

  // Mecânico → O.S. → serviços (tabela de baixo).
  const arvore = useMemo(() => {
    const m = new Map()
    for (const r of dados) {
      const p = m.get(r.mec) || { nome: r.mec, h: 0, vl: 0, os: new Map() }
      p.h += r.h; p.vl += r.vl
      const ko = `${r.empresa}|${r.os}`
      const o = p.os.get(ko) || { os: r.os, empresa: r.empresa, data: r.data, tipoNome: r.tipoNome, interno: r.interno, consultor: r.consultor, h: 0, vl: 0, servs: [] }
      o.h += r.h; o.vl += r.vl; o.servs.push(r)
      p.os.set(ko, o)
      m.set(r.mec, p)
    }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [dados])

  const altLado = Math.max(160, Math.max(porMec.length, Math.min(porServ.length, 15)) * 26 + 30)
  const alternar = (set, k) => set(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const pctDe = (v) => (tot.vl ? v / tot.vl : null)
  const chips = [['Tipo', fTipo, setFTipo], ['Mecânico', fMec, setFMec], ['Serviço', fServ, setFServ]].filter(c => c[1])

  const grafico = (titulo, lista, filtroAtual, setF, { horizontal = false, max = 0, larguraNome = 260, altura = 0 } = {}) => {
    const itens = (max ? lista.slice(0, max) : lista).map(g => ({ ...g, y: g[medida], rot: medida === 'h' ? rotH(g.h) : rotVl(g.vl) }))
    const alt = altura || (horizontal ? Math.max(160, itens.length * 26 + 30) : 240)
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 min-w-0 h-full">
        <p className="text-[11px] font-bold text-slate-600 mb-1">{titulo}{max && lista.length > max ? ` (${max} maiores)` : ''}</p>
        {!itens.length ? <p className="text-[11px] text-slate-400 py-6 text-center">Sem dados.</p> : (
          <ResponsiveContainer width="100%" height={alt}>
            <BarChart data={itens} layout={horizontal ? 'vertical' : 'horizontal'} margin={horizontal ? { top: 0, right: 70, left: 10, bottom: 0 } : { top: 20, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} stroke="#e2e8f0" />
              {horizontal ? <>
                <XAxis type="number" hide />
                {/* nome numa linha só (sem quebra — pedido do usuário 18/11/2026); muito comprido é cortado com "…" e aparece inteiro no balão */}
                <YAxis type="category" dataKey="nome" width={larguraNome} interval={0}
                  tick={({ x, y, payload }) => {
                    const t = String(payload?.value ?? '')
                    const max = Math.floor((larguraNome - 8) / 5.6)
                    return <text x={x} y={y} dy={3} textAnchor="end" fontSize={10} fill="#475569">{t.length > max ? t.slice(0, max - 1) + '…' : t}</text>
                  }} />
              </> : <>
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} />
                <YAxis hide />
              </>}
              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 11 }}
                labelFormatter={(l) => l}
                formatter={(v, n, item) => { const d = item?.payload || {}; return [`${fmtH(d.h)} h · ${fmtR$(d.vl)} · ${d.n} serviço(s) · ${d.os?.size || 0} O.S.`, 'Não cobrado'] }} />
              <Bar dataKey="y" radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={horizontal ? 18 : 60} cursor="pointer"
                onClick={(d) => { const nome = d?.payload?.nome ?? d?.nome; if (nome) setF(f => (f === nome ? '' : nome)) }}>
                {itens.map(g => <Cell key={g.nome} fill={COR} fillOpacity={filtroAtual && filtroAtual !== g.nome ? 0.35 : 1} />)}
                <LabelList dataKey="rot" content={rotulo(horizontal)} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {erro && <p className="text-[11px] text-red-600 font-semibold">{erro}</p>}
      {carregando && <p className="text-[11px] text-slate-500">Carregando…</p>}

      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          ['Não cobrado no período', `${fmtH(tot.h)} h`, fmtR$(tot.vl)],
          ['O.S. com serviço não cobrado', qtdOs.toLocaleString('pt-BR'), `${dados.length.toLocaleString('pt-BR')} serviço(s)`],
          ['Mecânicos', porMec.length.toLocaleString('pt-BR'), porMec[0] ? `maior: ${porMec[0].nome.split(' ')[0]} (${fmtR$(porMec[0].vl)})` : ''],
          ['Tipos de O.S. interno', porTipo.length.toLocaleString('pt-BR'), porTipo[0] ? `maior: ${porTipo[0].nome} (${fmtR$(porTipo[0].vl)})` : ''],
        ].map(([t, v, s]) => (
          <div key={t} className="border rounded-xl shadow-sm p-3 bg-slate-50 border-slate-200">
            <p className="text-[11px] font-semibold text-slate-600">{t}</p>
            <p className="text-base font-bold text-slate-800 tabular-nums">{v}</p>
            <p className="text-[11px] text-slate-500 tabular-nums truncate">{s}</p>
          </div>
        ))}
      </div>

      {/* Filtros ativos + Horas | Valor */}
      <div className="flex flex-wrap items-center gap-2">
        {chips.map(([r, v, set]) => (
          <button key={r} type="button" onClick={() => set('')} title="Tirar o filtro"
            className="px-2 py-0.5 rounded-full bg-slate-600 text-white text-[10px] font-semibold hover:bg-slate-700">{r}: {v} ✕</button>
        ))}
        <span className="text-[10px] text-slate-400">{chips.length ? '' : 'Clique numa barra ou linha para filtrar a tela.'} Só Trucks (o MicroWork não tem relatório de não cobrado).</span>
        <div className="ml-auto flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
          {[['h', 'Horas'], ['vl', 'Valor']].map(([v, r]) => (
            <button key={v} type="button" onClick={() => setMedida(v)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${medida === v ? 'bg-slate-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{r}</button>
          ))}
        </div>
      </div>

      {/* Gráficos */}
      {grafico('Por tipo de O.S. interno', porTipo, fTipo, setFTipo)}
      {/* Por mecânico e Por serviço lado a lado (pedido do usuário 18/11/2026) */}
      {/* mesma altura nos dois (a do que tiver mais barras) — pedido do usuário 18/11/2026 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 items-stretch">
        {grafico('Por mecânico', porMec, fMec, setFMec, { horizontal: true, larguraNome: 230, altura: altLado })}
        {grafico('Por serviço (TMO)', porServ, fServ, setFServ, { horizontal: true, max: 15, larguraNome: 290, altura: altLado })}
      </div>

      {/* Tabela por serviço */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <p className="text-[11px] font-bold text-slate-600 px-3 pt-3">Serviços não cobrados</p>
        <table className="w-full text-[11px]">
          <thead><tr className="text-slate-500 border-b border-sky-300">
            <th className="text-left py-1 pl-3">Serviço (TMO)</th><th className="px-2 text-right">Qtd.</th><th className="px-2 text-right">O.S.</th>
            <th className="px-2 text-right">Horas</th><th className="px-2 text-right">Valor</th><th className="px-2 text-right pr-3">% valor</th>
          </tr></thead>
          <tbody>
            {porServ.map(g => (
              <tr key={g.nome} onClick={() => setFServ(f => (f === g.nome ? '' : g.nome))}
                className={`border-b border-slate-100 cursor-pointer hover:bg-amber-50/60 ${fServ === g.nome ? 'bg-amber-50' : ''}`}>
                <td className="py-1 pl-3">{g.nome}</td><td className="px-2 text-right tabular-nums">{g.n}</td><td className="px-2 text-right tabular-nums">{g.os.size}</td>
                <td className="px-2 text-right tabular-nums">{fmtH(g.h)}</td><td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(g.vl)}</td>
                <td className="px-2 text-right tabular-nums pr-3 text-slate-500">{fmtPct(pctDe(g.vl))}</td>
              </tr>
            ))}
            {porServ.length > 0 && (
              <tr className="font-bold bg-slate-50"><td className="py-1 pl-3">Total</td><td className="px-2 text-right tabular-nums">{dados.length}</td>
                <td className="px-2 text-right tabular-nums">{qtdOs}</td><td className="px-2 text-right tabular-nums">{fmtH(tot.h)}</td>
                <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(tot.vl)}</td><td className="px-2 text-right tabular-nums pr-3">{tot.vl ? '100,00%' : ''}</td></tr>
            )}
            {!carregando && !porServ.length && <tr><td colSpan={6} className="py-3 text-center text-slate-500">Nenhum serviço não cobrado no período/empresas.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Tabela por mecânico → O.S. → serviços */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <p className="text-[11px] font-bold text-slate-600 px-3 pt-3">Por mecânico</p>
        <table className="w-full text-[11px]">
          <thead><tr className="text-slate-500 border-b border-sky-300">
            <th className="text-left py-1 pl-3">Mecânico / O.S.</th><th className="text-left px-2">Tipo O.S.</th><th className="text-left px-2">Tipo interno</th>
            <th className="text-left px-2">Data O.S.</th><th className="text-left px-2">Consultor</th>
            <th className="px-2 text-right">Horas</th><th className="px-2 text-right pr-3">Valor</th>
          </tr></thead>
          <tbody>
            {arvore.map(p => (
              <Fragment key={p.nome}>
                <tr className="border-b border-slate-100 hover:bg-sky-50/40 cursor-pointer" onClick={() => alternar(setAberto, p.nome)}>
                  <td className="py-1 pl-3 font-semibold whitespace-nowrap" colSpan={5}>
                    <span className="inline-flex items-center gap-1">
                      {aberto.has(p.nome) ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}{p.nome}
                      <span className="font-normal text-slate-400">· {p.os.size} O.S.</span>
                    </span>
                  </td>
                  <td className="px-2 text-right tabular-nums font-semibold">{fmtH(p.h)}</td><td className="px-2 text-right tabular-nums pr-3 font-semibold whitespace-nowrap">{fmtR$(p.vl)}</td>
                </tr>
                {aberto.has(p.nome) && [...p.os.values()].sort((a, b) => (a.data || '').localeCompare(b.data || '')).map(o => {
                  const ko = `${p.nome}|${o.empresa}|${o.os}`
                  return (
                    <Fragment key={ko}>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <td className="py-0.5 pl-8 whitespace-nowrap">
                          <button type="button" onClick={() => alternar(setOsAbertas, ko)} className="inline-flex items-center gap-0.5 font-semibold hover:text-sky-700" title="Ver os serviços">
                            {osAbertas.has(ko) ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}{o.os}
                          </button>
                        </td>
                        <td className="px-2">{o.tipoNome}</td><td className="px-2">{o.interno}</td><td className="px-2">{fmtData(o.data)}</td><td className="px-2">{o.consultor}</td>
                        <td className="px-2 text-right tabular-nums">{fmtH(o.h)}</td><td className="px-2 text-right tabular-nums pr-3 whitespace-nowrap">{fmtR$(o.vl)}</td>
                      </tr>
                      {osAbertas.has(ko) && o.servs.map((r, i) => (
                        <tr key={i} className="border-b border-slate-100 text-slate-600">
                          <td className="py-0.5 pl-14" colSpan={5}>{r.serv}</td>
                          <td className="px-2 text-right tabular-nums">{fmtH(r.h)}</td><td className="px-2 text-right tabular-nums pr-3 whitespace-nowrap">{fmtR$(r.vl)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })}
              </Fragment>
            ))}
            {arvore.length > 0 && (
              <tr className="font-bold bg-slate-50"><td className="py-1 pl-3" colSpan={5}>Total</td>
                <td className="px-2 text-right tabular-nums">{fmtH(tot.h)}</td><td className="px-2 text-right tabular-nums pr-3 whitespace-nowrap">{fmtR$(tot.vl)}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
