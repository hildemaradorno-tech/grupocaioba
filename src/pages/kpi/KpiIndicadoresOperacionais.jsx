import React, { useMemo, useState, useEffect } from 'react'
import PeriodSelector, { usePeriodSelector, PeriodLegend } from '../../components/kpi/PeriodSelector'

import { getPeriodData, getPeriodLabel } from '../../utils/kpiPeriods'
import { useKpiData } from '../../hooks/useKpiData'
import { fetchBloco2, fetchBloco2PosVenda, fetchMetasOperacional, fetchPesos, salvarPeso } from '../../services/kpiService'
import { useEmpresasDaf } from '../../components/kpi/EmpresasDafSelector'
import OrigemIndicador, { QUADRO_BLOCO2_PV } from '../../components/kpi/OrigemIndicador'
import { useAuth } from '../../context/AuthContext'
import PesoInput, { TotalPeso } from '../../components/kpi/PesoInput'

// Pesos digitados na tela (24/11/2026), gravados no Supabase (kpi_pesos) como no Bloco 3 - Serviços.
// Chave estável pelo nome: titulo_gerente = "Área-aba › Área › Indicador", kpi_id = 0. Sub-indicadores
// (DMS, Garantia, Clientes, Programa Frota) também têm peso e levam o indicador-pai na chave
// ("… › Margem Serviços › DMS"). A soma dos pesos de cada aba (Vendas, Pós-Vendas, Peças) vai até 100%.
const BLOCO_PESOS = 'bloco2-departamental'
const tituloPeso = (r) => `${r.area} › ${r.responsabilidade} › ${r.nivel && r.pai ? `${r.pai} › ` : ''}${r.indicador}`
import { useKpiYear } from '../../context/KpiYearContext'
import { useExpandirQuadro } from '../../components/kpi/useExpandirQuadro'

const np = { meta: null, realizado: null }

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
      // Faturamento Total Oficina em primeiro (24/11/2026).
      ['Faturamento Total Oficina (Peças + Serviços)', 'R$', '>', { antigos: ['Faturamento Total Oficina (Peças + Serviços)'] }],
      // Margens logo depois do Faturamento, Balcão primeiro (24/11/2026).
      ['Margem Peças Balcão', '%', '>'],
      // Sub-indicadores das margens (DMS, Garantia, Clientes, Programa Frota) retirados a pedido (24/11/2026).
      ['Margem Serviços', '%', '>', { antigos: ['Margem Bruta Serviços (total)'] }],
      ['Margem Peças Oficina', '%', '>', { antigos: ['Margem Bruta Peças Oficina'] }],
      // Passagem Total e Ticket médio logo abaixo das margens (24/11/2026).
      ['Passagem Total', 'Unid.', '>', { antigos: ['Passagens na Oficina'] }],
      ['Ticket Médio Total Oficina', 'R$', '>', { antigos: ['Ticket Médio Oficina', 'Ticketmédio OFICINA'] }],
      // Eficiência / Eficácia / Produtividade logo depois do Ticket, com % no nome (24/11/2026).
      ['Eficiência %', '%', '>', { antigos: ['EFICIÊNCIA'] }], ['Eficácia %', '%', '>', { antigos: ['EFICÁCIA'] }], ['Produtividade %', '%', '>', { antigos: ['PRODUTIVIDADE'] }],
      // Agendamentos ativos logo depois da Produtividade, em % (Taxa de Agendamento Ativo do BI Agendamento, 24/11/2026).
      ['Total agendamento', '%', '>'], // Taxa de Agendamento da aba Por Data Agendamento (24/11/2026)
      ['Agendamentos ativos', '%', '>'],
      // Penetração Plano de Manutenção trocado por Contratos novos e renovados (% do BI Planos), abaixo dos agendamentos (24/11/2026).
      ['Contratos novos', '%', '>'], ['Contratos renovados', '%', '>'],
      ['NPS Fábrica', 'Pts', '>'], ['NPS interna', 'Pts', '>'],
    ]],
    ['Auditoria', [
      // O.S. sem veículo e O.S. >= 30 dias antes das Auditorias padrão (24/11/2026).
      ['O.S. aberta sem veículo na oficina', '%', '<'], ['O.S. >= 30 dias', '%', '<', { antigos: ['O.S. >= 30 dias (% do Valor)'] }],
      // Tempo veículo oficina / funilaria logo abaixo: Média de dias na oficina (aba Tempo na Oficina), por setor (24/11/2026).
      ['Tempo veículo oficina', 'Dias', '<'], ['Tempo veículo funilaria', 'Dias', '<'],
      ['Tempo de garantia em aberto', 'Dias', '<', { antigos: ['Garantia em aberto (tempo médio) ou tempo de total OS'] }], // Tempo de garantia em aberto (Garantias DAF)
      ['Recusa de Garantia', '%', '<'], // card Recusas de garantia (Garantias DAF › Com Garantista), 25/11/2026
      ['Auditoria padrão DOURADOS', '%', '>'], ['Auditoria padrão TRÊS LAGOAS', '%', '>'],
      ['Auditoria padrão CAMPO GRANDE', '%', '>'], ['Auditoria padrão CHAPADÃO', '%', '>'],
    ]],
    ['Dealer Development', [
      ['Absorção de PV', '%', '>'],
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
      let pai = null
      for (const [indicador, metrica, orientacao, extra = {}] of inds) {
        if (!extra.nivel) pai = indicador
        const base = extra.nivel ? null : [indicador, ...(extra.antigos || [])].map(normTxt).map(n => porNome.get(n)).find(Boolean)
        out.push({
          metaAnual: null, pesoObj: null, pesoArea: null, q1: np, q2: np, q3: np, q4: np, fy: np,
          ...(base || {}),
          area, responsabilidade, indicador, metrica, orientacao, nivel: extra.nivel || 0, pai: extra.nivel ? pai : null,
        })
      }
    }
  }
  return out
}

// Bloco 2 da planilha antiga (SharePoint): sem a planilha, linhas vazias em vez dos dados de demonstração —
// a etiqueta do cabeçalho deixa de mostrar "Dados demonstrativos (mock)" (24/11/2026).
async function fetchBloco2SemMock(p) {
  const r = await fetchBloco2(p)
  return r?.source === 'mock' ? { data: [], source: 'sharepoint' } : r
}

function calcAtingimento(orientacao, meta, realizado) {
  if (realizado === null || meta === null || meta === 0) return null
  return orientacao === '<' ? meta / realizado : realizado / meta
}

function pct(val) {
  if (val === null || val === undefined) return ''
  return `${(val * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function badgeClass(val) {
  if (val === null) return 'bg-slate-100 text-slate-400'
  if (val >= 1.0)   return 'bg-emerald-100 text-emerald-700'
  if (val >= 0.8)   return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

function fmtPeso(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return ''
  return `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}

// Peso da área = soma dos pesos dos indicadores da área; sem nenhum peso = null.
function pesoDaArea(linhasArea) {
  const pesos = linhasArea.map(l => l.row.pesoObj).filter(p => typeof p === 'number')
  return pesos.length ? pesos.reduce((s, p) => s + p, 0) : null
}

function fmtNum(v, metrica) {
  if (v === null || v === undefined) return ''
  if (typeof v !== 'number') return v
  if (metrica === 'R$') return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (metrica === '%') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
}

export default function KpiIndicadoresOperacionais({ periodState: periodoMatriz = null }) {
  // Na Matriz de KPIs o seletor de Visão/Meses fica no topo (acima das abas) e chega por prop.
  const periodoProprio = usePeriodSelector('kpi-matriz')
  const periodState = periodoMatriz || periodoProprio
  const { activePeriods } = periodState
  const { year, incluirHoje } = useKpiYear()
  // Pós-Vendas (24/11/2026): mesmas contas do Bloco 3 (backend /bloco2-pos-venda), com as empresas DAF marcadas na Matriz.
  const { efetivas: empresasMarcadas, todas: todasDaf } = useEmpresasDaf()
  const empresasParam = periodoMatriz && !todasDaf ? empresasMarcadas.join(',') : undefined
  const { data: dadosPv } = useKpiData(fetchBloco2PosVenda, null, { year, incluirHoje: incluirHoje || undefined, empresas: empresasParam })
  const { hasActionOrDefault } = useAuth()
  const podeEditarPeso = hasActionOrDefault('kpi/bloco2-operacional', 'editar')
  const [pesosGravados, setPesosGravados] = useState({})
  useEffect(() => {
    let ativo = true
    fetchPesos(BLOCO_PESOS).then(p => { if (ativo) setPesosGravados(p || {}) })
    return () => { ativo = false }
  }, [])
  const handleSalvarPeso = async (row, peso) => {
    const titulo = tituloPeso(row)
    await salvarPeso({ bloco: BLOCO_PESOS, tituloGerente: titulo, kpiId: 0, peso })
    setPesosGravados(prev => ({ ...prev, [`${titulo}|0`]: peso }))
  }
  const { data: rawRows } = useKpiData(fetchBloco2SemMock, [], { year })
  const [metasAprovadas, setMetasAprovadas] = useState(null)
  useEffect(() => {
    let ativo = true
    fetchMetasOperacional(year).then(m => { if (ativo) setMetasAprovadas(m) })
    return () => { ativo = false }
  }, [year])

  const allRows = useMemo(() => {
    const rows = aplicarEstrutura(rawRows).map(r => {
      const k = `${tituloPeso(r)}|0`
      return k in pesosGravados ? { ...r, pesoObj: pesosGravados[k] || null } : r
    })
    const metas = metasAprovadas?.faturamentoTotalOficina
    const indPv = dadosPv?.indicadores || null
    return rows.map(r => {
      // Pós-Vendas: meta e realizado calculados no sistema (substituem os da planilha).
      if (indPv && r.area === 'Pós Venda' && !r.nivel && indPv[r.indicador]) return { ...r, ...indPv[r.indicador] }
      if (!metas || normTxt(r.indicador) !== normTxt('Faturamento Total Oficina (Peças + Serviços)')) return r
      const out = { ...r, metaAnual: metas.fy ?? r.metaAnual }
      for (const key of Object.keys(metas)) out[key] = { ...(r[key] ?? { meta: null, realizado: null }), meta: metas[key] ?? null }
      return out
    })
  }, [rawRows, metasAprovadas, pesosGravados, dadosPv])

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

  // Sub-abas por área (17/11/2026): Vendas · Pós-Vendas · Peças — uma área por vez, abre em Vendas.
  const ROTULO_AREA = { 'Pós Venda': 'Pós-Vendas' }
  const [areaAba, setAreaAba] = useState(ESTRUTURA[0][0])
  const blocoAtual = blocos.find(b => b.area === areaAba) || blocos[0]
  // Botão Expandir do quadro (17/11/2026) — o mesmo do Bloco 3 - Serviços (useExpandirQuadro).
  // Soma dos pesos da aba (em %, inteiro) — limite de 100% do campo, como no Bloco 3.
  const pctPeso = (p) => Math.round((p ?? 0) * 100)
  const totalPesoAba = (blocoAtual?.linhas || []).reduce((s, l) => s + pctPeso(l.row.pesoObj), 0)
  const ex = useExpandirQuadro(ROTULO_AREA[blocoAtual?.area] || blocoAtual?.area || 'quadro')

  return (
    <div className="px-6 pb-6 pt-3 space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Indicadores Departamentais</h1>

      {!periodoMatriz && <PeriodSelector state={periodState} inlineTrimestral hideLegend />}

      {/* Sub-abas das áreas — mesmo visual das sub-abas do Bloco 3 - Serviços. */}
      {/* Legenda de cores na linha das sub-abas, à direita — padrão das abas da Matriz (25/11/2026) */}
      <div className="flex items-center gap-1.5 border-b-2 border-blue-600">
        {ESTRUTURA.map(([area]) => (
          <button
            key={area}
            type="button"
            aria-pressed={area === blocoAtual?.area}
            onClick={() => setAreaAba(area)}
            className={`px-5 py-2 text-[11px] font-semibold rounded-t-md transition-colors ${
              area === blocoAtual?.area ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            {ROTULO_AREA[area] || area}
          </button>
        ))}
        <span className="ml-auto"><PeriodLegend /></span>
      </div>

      {/* O bloco (card) da área escolhida, com Responsabilidade mesclada */}
      <div className="space-y-6">
        {(blocoAtual ? [blocoAtual] : []).map(({ area, linhas }) => (
          <React.Fragment key={area}>
          {ex.fundo}
          <div style={ex.estiloCaixa} className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${ex.classeCaixa}`}>
            <div className="flex items-center gap-3 px-5 py-3 bg-blue-700 text-white text-sm font-bold tracking-wide uppercase">
              <span>{ROTULO_AREA[area] || area}</span>
              {ex.botao}
            </div>
            <div className={ex.classeRolagem}>
              <table className="w-full text-xs whitespace-nowrap">
                <thead className={ex.classeCabecalho}>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-center px-3 py-2.5 font-medium text-slate-500 sticky left-0 z-10 bg-slate-50 min-w-[150px] w-[150px]">Área</th>
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500 sticky left-[150px] z-10 bg-slate-50 min-w-[220px]">Indicador</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500">Orientação</th>
                    <th className="text-center px-2 py-2.5 font-medium text-slate-500">Peso</th>
                    {activePeriods.map(p => (
                      <th key={p} colSpan={4} className="text-center px-2 py-2.5 font-semibold text-blue-700 border-l border-slate-200">
                        {getPeriodLabel(p, year)}
                      </th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-[10px]">
                    <th colSpan={4} />
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
                  {linhas.map(({ row, respSpan }, i) => {
                    // Início da área desta linha (para a linha de total no fim da área).
                    let ini = i
                    while (ini > 0 && !(linhas[ini].respSpan > 0)) ini--
                    const fimDaArea = i === linhas.length - 1 || linhas[i + 1].respSpan > 0
                    const linhasArea = linhas.slice(ini, i + 1)
                    return (
                    <React.Fragment key={i}>
                    <tr className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      {respSpan > 0 && (
                        <td rowSpan={respSpan + 1} className="px-3 py-2 text-center text-slate-600 uppercase align-middle sticky left-0 z-10 bg-slate-100 border-r border-slate-200 min-w-[150px] w-[150px]">
                          {row.responsabilidade}
                        </td>
                      )}
                      <td className={`py-2.5 sticky left-[150px] z-10 bg-white min-w-[220px] ${row.nivel ? 'pl-10 pr-4 text-slate-500' : 'px-4 font-medium text-slate-700'}`}>
                        {row.indicador}
                        {/* Ícone que abre a tela de origem do valor (como no Bloco 3) — só nos calculados do Pós-Vendas. */}
                        {row.area === 'Pós Venda' && !row.nivel && (
                          <OrigemIndicador indicador={row.indicador} quadro={QUADRO_BLOCO2_PV} empresa={empresasMarcadas.length === 1 && empresasParam ? empresasMarcadas[0] : null} />
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-600">{row.orientacao}</td>
                      <td className="px-2 py-2.5 text-center text-slate-500">
                        {podeEditarPeso
                          ? <PesoInput value={row.pesoObj} maxPermitido={100 - (totalPesoAba - pctPeso(row.pesoObj))} onSave={peso => handleSalvarPeso(row, peso)} />
                          : fmtPeso(row.pesoObj)}
                      </td>
                      {activePeriods.map(p => {
                        const d = getPeriodData(row, p)
                        const ating = calcAtingimento(row.orientacao, d.meta, d.realizado)
                        const contrib = ating !== null && typeof row.pesoObj === 'number' ? ating * row.pesoObj : null
                        return (
                          <React.Fragment key={p}>
                            <td className="px-2 py-2.5 text-center text-slate-600 border-l border-slate-100">{fmtNum(d.meta, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center text-slate-600">{fmtNum(d.realizado, row.metrica)}</td>
                            <td className="px-2 py-2.5 text-center">
                              {ating !== null && (
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] ${badgeClass(ating)}`}>
                                  {pct(ating)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-center text-slate-500">{pct(contrib)}</td>
                          </React.Fragment>
                        )
                      })}
                    </tr>
                    {/* Peso da área (24/11/2026): linha de total no fim de cada área, na mesma coluna Peso —
                        soma dos pesos dos indicadores; Contrib. = soma das contribuições da área no período. */}
                    {/* Cor mais evidente na linha de total da área (24/11/2026). */}
                    {fimDaArea && (
                      <tr className="border-y-2 border-blue-300 bg-blue-100 font-bold text-blue-900">
                        <td className="px-4 py-2 sticky left-[150px] z-10 bg-blue-100 min-w-[220px]">Total {row.responsabilidade}</td>
                        <td />
                        <td className="px-2 py-2 text-center">{fmtPeso(pesoDaArea(linhasArea))}</td>
                        {activePeriods.map(p => {
                          const contribs = linhasArea.map(({ row: r }) => {
                            const d = getPeriodData(r, p)
                            const a = calcAtingimento(r.orientacao, d.meta, d.realizado)
                            return a !== null && typeof r.pesoObj === 'number' ? a * r.pesoObj : null
                          }).filter(v => v !== null)
                          return (
                            <React.Fragment key={p}>
                              <td colSpan={3} className="border-l border-blue-200" />
                              <td className="px-2 py-2 text-center">{contribs.length ? pct(contribs.reduce((x, y) => x + y, 0)) : ''}</td>
                            </React.Fragment>
                          )
                        })}
                      </tr>
                    )}
                    </React.Fragment>
                    )
                  })}
                  {/* Total da aba: soma de todos os pesos (100% = completo; diferente em vermelho, como no Bloco 3). */}
                  <tr className="bg-blue-700 font-bold text-white border-t-2 border-blue-800">
                    <td className="px-3 py-2 sticky left-0 z-10 bg-blue-700" />
                    <td className="px-4 py-2 sticky left-[150px] z-10 bg-blue-700">Total {ROTULO_AREA[area] || area}</td>
                    <td />
                    <td className="px-2 py-2 text-center"><TotalPeso total={totalPesoAba} /></td>
                    {activePeriods.map(p => {
                      const contribs = linhas.map(({ row: r }) => {
                        const d = getPeriodData(r, p)
                        const a = calcAtingimento(r.orientacao, d.meta, d.realizado)
                        return a !== null && typeof r.pesoObj === 'number' ? a * r.pesoObj : null
                      }).filter(v => v !== null)
                      return (
                        <React.Fragment key={p}>
                          <td colSpan={3} className="border-l border-blue-600" />
                          <td className="px-2 py-2 text-center">{contribs.length ? pct(contribs.reduce((x, y) => x + y, 0)) : ''}</td>
                        </React.Fragment>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

