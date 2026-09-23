import React, { useMemo, useState, useEffect } from 'react'
import PeriodSelector, { usePeriodSelector, PeriodLegend } from '../../components/kpi/PeriodSelector'

import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco2, fetchMetasOperacional } from '../../services/kpiService'
import { useKpiYear } from '../../context/KpiYearContext'

const np = { meta: null, realizado: null }
// Fallback sem valores — dados reais vêm do SharePoint
const MOCK = [
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Market Share TOTAL',         orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Retail Novos',               orientacao: '>', metrica: 'Unid.',    metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Novos',     indicador: 'Margem Bruta Novos',         orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Renan',   q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'Vendas Seminovos', indicador: 'Volume de Vendas Seminovos', orientacao: '>', metrica: 'Unid.',    metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Vendas',     responsabilidade: 'F&I',              indicador: 'Penetração de Seguros %',    orientacao: '>', metrica: '%',        metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Passagens na Oficina',       orientacao: '>', metrica: 'OS/mês',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Score Card', responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Oficina',          indicador: 'Clientes Ativos',            orientacao: '>', metrica: 'Clientes', metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'Eliomar', q1: np, q2: np, q3: np, q4: np, fy: np },
  { area: 'Pós-Vendas', responsabilidade: 'Peças',            indicador: 'Faturamento Peças (R$)',     orientacao: '>', metrica: 'R$',   metaAnual: null, pesoObj: null, pesoArea: null, origem: 'Dealernet',  responsavel: 'João',    q1: np, q2: np, q3: np, q4: np, fy: np },
]

// Estrutura oficial da Matriz Operacional (Área → Responsabilidade → Indicador).
// [responsabilidade, indicador, métrica, orientação, { nivel: 1 = sub-indicador, antigos: [nomes antigos equivalentes] }]
const ESTRUTURA = [
  ['Vendas', [
    ['Vendas Novos', [
      ['Market Share TOTAL', '%', '>'], ['Market Share PESADOS', '%', '>'], ['Market Share MÉDIOS', '%', '>'],
      ['Market Share VOC', '%', '>'], ['Margem Bruta novos', '%', '>'], ['Retail Novos', 'Unid.', '>'],
      ['Stock age novos', 'Dias', '<'],
    ]],
    ['Vendas Usados', [
      ['Margem Bruta usados', '%', '>'], ['Volume de vendas usados', 'Unid.', '>', { antigos: ['Volume de Vendas Seminovos'] }],
      ['Stock Age usados', 'Dias', '<'],
    ]],
    ['CRM', [
      ['Contatos de relacionamento', 'Unid.', '>'], ['Leads recebidos', 'Unid.', '>'], ['Prospecção', 'Unid.', '>'],
      ['Conversão (Novos + Seminovos)', '%', '>'],
    ]],
    ['Consórcios', [['Cotas novas', 'Unid.', '>'], ['Retenção', '%', '>']]],
    ['Paccar Financial', [['Past Due', '%', '<'], ['Paccar market share', '%', '>']]],
  ]],
  ['Pós Venda', [
    ['Oficina', [
      ['NPS Fábrica', 'Pts', '>'], ['NPS interna', 'Pts', '>'], ['Penetração Plano de Manutenção', '%', '>'],
      ['Faturamento Total Oficina (Peças + Serviços)', 'R$', '>', { antigos: ['Faturamento Total Oficina (Peças + Serviços)'] }],
      ['Margem Bruta Serviços (total)', '%', '>'],
      ['DMS', '%', '>', { nivel: 1 }], ['Garantia', '%', '>', { nivel: 1 }], ['Clientes', '%', '>', { nivel: 1 }], ['Programa Frota', '%', '>', { nivel: 1 }],
      ['Margem Bruta Peças Oficina', '%', '>'],
      ['DMS', '%', '>', { nivel: 1 }], ['Garantia', '%', '>', { nivel: 1 }], ['Clientes', '%', '>', { nivel: 1 }], ['Programa Frota', '%', '>', { nivel: 1 }],
      ['Agendamentos ativos', 'Unid.', '>'], ['Total agendamento', 'Unid.', '>'],
      ['Passagem Total', 'Unid.', '>', { antigos: ['Passagens na Oficina'] }],
      ['Ticketmédio OFICINA', 'R$', '>'], ['EFICIÊNCIA', '%', '>'], ['EFICÁCIA', '%', '>'], ['PRODUTIVIDADE', '%', '>'],
    ]],
    ['Auditoria', [
      ['Auditoria padrão DOURADOS', '%', '>'], ['Auditoria padrão TRÊS LAGOAS', '%', '>'],
      ['Auditoria padrão CAMPO GRANDE', '%', '>'], ['Auditoria padrão CHAPADÃO', '%', '>'],
      ['Garantia em aberto (tempo médio) ou tempo de total OS', 'Dias', '<'],
      ['O.S. aberta sem veículo na oficina', '%', '<'], ['O.S. >= 30 dias (% do Valor)', '%', '<'],
      ['Tempo veículo oficina', 'Dias', '<'], ['Tempo veículo funilaria', 'Dias', '<'],
    ]],
    ['Dealer Development', [
      ['Absorção de PV', '%', '>'], ['Recusa de Garantia', '%', '<'],
      ['Treinamentos Técnicos (on-line)', 'Unid.', '>'], ['Treinamentos Técnicos (presencial)', 'Unid.', '>'],
      ['Turnover geral', '%', '<'], ['Turnover técnicos', '%', '<'],
    ]],
  ]],
  ['Peças', [
    ['Paccar Parts', [
      ['MDI service level', '%', '>'], ['Parts Whole Sales', 'R$', '>'], ['TRP Whole Sales', 'R$', '>'],
      ['Giro de estoque', 'x', '>'], ['Obsoletos (1 ano)', '%', '<'], ['MB peças geral', '%', '>'],
      ['MB peças atacado (balcão)', '%', '>'], ['Venda média por produtivo', 'R$', '>'], ['Devolução / Scrap', '%', '<'],
      ['Disponibilidade', '%', '>'], ['Número de clientes ativos', 'Unid.', '>'], ['Ticket médio', 'R$', '>'],
      ['Fluxo de caixa (Compra vs. Venda)', 'R$', '>'], ['Volume finan. Realizado', 'R$', '>'],
    ]],
    ['Auditoria', [['Conformidade Peças', '%', '>'], ['Conformidade Special Tools', '%', '>']]],
  ]],
]

const normTxt = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s+/g, ' ').trim().toLowerCase()

// Monta as linhas na ordem da estrutura acima, aproveitando meta/realizado/peso das linhas que
// já vieram (mesmo nome de indicador, ou nome antigo equivalente); o restante fica vazio.
function aplicarEstrutura(rows) {
  const porNome = new Map()
  for (const r of rows) if (!porNome.has(normTxt(r.indicador))) porNome.set(normTxt(r.indicador), r)
  const out = []
  for (const [area, resps] of ESTRUTURA) {
    for (const [responsabilidade, inds] of resps) {
      for (const [indicador, metrica, orientacao, extra = {}] of inds) {
        const base = extra.nivel ? null : [indicador, ...(extra.antigos || [])].map(normTxt).map(n => porNome.get(n)).find(Boolean)
        out.push({
          metaAnual: null, pesoObj: null, pesoArea: null, q1: np, q2: np, q3: np, q4: np, fy: np,
          ...(base || {}),
          area, responsabilidade, indicador, metrica, orientacao, nivel: extra.nivel || 0,
        })
      }
    }
  }
  return out
}

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return '–'
  return `${(val * 100).toFixed(1)}%`
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function fmtNum(v, metrica) {
  if (v === null || v === undefined) return '–'
  if (typeof v !== 'number') return v
  if (metrica === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export default function KpiIndicadoresOperacionais() {
  const periodState = usePeriodSelector('kpi-matriz')
  const { activePeriods } = periodState
  const { year } = useKpiYear()
  const { data: rawRows } = useKpiData(fetchBloco2, MOCK, { year })
  const [metasAprovadas, setMetasAprovadas] = useState(null)
  useEffect(() => {
    let ativo = true
    fetchMetasOperacional(year).then(m => { if (ativo) setMetasAprovadas(m) })
    return () => { ativo = false }
  }, [year])

  const allRows = useMemo(() => {
    const rows = aplicarEstrutura(rawRows)
    const metas = metasAprovadas?.faturamentoTotalOficina
    if (!metas) return rows
    return rows.map(r => {
      if (normTxt(r.indicador) !== normTxt('Faturamento Total Oficina (Peças + Serviços)')) return r
      const out = { ...r, metaAnual: metas.fy ?? r.metaAnual }
      for (const key of Object.keys(metas)) out[key] = { ...(r[key] ?? { meta: null, realizado: null }), meta: metas[key] ?? null }
      return out
    })
  }, [rawRows, metasAprovadas])

  // Linhas achatadas com rowspan de Área e Responsabilidade (células mescladas).
  const blocos = useMemo(() => {
    const out = allRows.map(r => ({ row: r, areaSpan: 0, respSpan: 0 }))
    let i = 0
    while (i < out.length) {
      let j = i
      while (j < out.length && out[j].row.area === out[i].row.area) j++
      out[i].areaSpan = j - i
      let k = i
      while (k < j) {
        let m = k
        while (m < j && out[m].row.responsabilidade === out[k].row.responsabilidade) m++
        out[k].respSpan = m - k
        k = m
      }
      i = j
    }
    const porArea = []
    for (const l of out) {
      const ult = porArea[porArea.length - 1]
      if (ult && ult.area === l.row.area) ult.linhas.push(l)
      else porArea.push({ area: l.row.area, linhas: [l] })
    }
    return porArea
  }, [allRows])

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Indicadores Operacionais</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detalhamento por área e responsabilidade</p>
        </div>
        <PeriodLegend />
      </div>

      <PeriodSelector state={periodState} inlineTrimestral hideLegend />

      {/* Um bloco (card) por área, com Responsabilidade mesclada */}
      <div className="space-y-6">
        {blocos.map(({ area, linhas }) => (
          <div key={area} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-700 text-white text-sm font-bold tracking-wide uppercase">{area}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-2.5 font-medium text-slate-500 sticky left-0 z-10 bg-slate-50 min-w-[150px] w-[150px]">Responsabilidade</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 sticky left-[150px] z-10 bg-slate-50 min-w-[220px]">Indicador</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500">Orientação</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500">Meta Anual</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 leading-tight">PESO /<br />OBJETIVO</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500 leading-tight">PESO /<br />ÁREA</th>
                    {activePeriods.map(p => (
                      <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                        {getPeriodLabel(p, year)}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
                    <th colSpan={6} />
                    {activePeriods.map(p => (
                      <React.Fragment key={p}>
                        <th className="px-2 py-1.5 text-slate-400 font-medium border-l border-slate-200">Meta</th>
                        <th className="px-2 py-1.5 text-slate-400 font-medium">Real.</th>
                        <th className="px-2 py-1.5 text-slate-400 font-medium">%Ating.</th>
                        <th className="px-2 py-1.5 text-slate-400 font-medium">Contrib.</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(({ row, respSpan }, i) => (
                    <tr key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      {respSpan > 0 && (
                        <td rowSpan={respSpan} className="px-3 py-2 text-center text-slate-600 uppercase align-middle sticky left-0 z-10 bg-slate-100 border-r border-slate-200 min-w-[150px] w-[150px]">
                          {row.responsabilidade}
                        </td>
                      )}
                      <td className={`py-2.5 sticky left-[150px] z-10 bg-white min-w-[220px] ${row.nivel ? 'pl-10 pr-4 text-slate-500' : 'px-4 font-medium text-slate-700'}`}>{row.indicador}</td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(row.metaAnual, row.metrica)}</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{(row.pesoObj * 100).toFixed(0)}%</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">{(row.pesoArea * 100).toFixed(0)}%</td>
                      {activePeriods.map(p => {
                        const d = getPeriodData(row, p)
                        const ating = calcAtingimento(row.orientacao, d.meta, d.realizado)
                        const contrib = ating !== null ? ating * row.pesoObj : null
                        return (
                          <React.Fragment key={p}>
                            <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">{fmtNum(d.meta, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(d.realizado, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass(ating)}`}>
                                {pct(ating)}
                              </span>
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-500">{pct(contrib)}</td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

