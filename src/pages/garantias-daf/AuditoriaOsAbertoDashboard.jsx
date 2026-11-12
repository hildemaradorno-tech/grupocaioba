import React, { useEffect, useMemo, useState, useCallback, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
  Loader2, Building2, Calendar, ChevronDown, ChevronRight, Gauge, ClipboardList, CalendarClock,
  User, Banknote, Hash, ArrowUpDown, ArrowUp, ArrowDown, History, X, Info,
} from 'lucide-react'
import { ResponsiveContainer, BarChart, PieChart, Pie, Cell, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  fmt, fmtDate, primeiroUltimoNome, diasOficina, nomeSeletorEmpresa, empresaDaAuditoria,
  isPendente, isRespondida, STATUS_ENCERRADOS,
} from './auditoriaOsRegras'

// Dashboard da Auditoria O.S. Aberta — recria o painel do Power BI ("Indicadores principais") com os dados
// das auditorias do sistema (aud_auditorias / aud_auditoria_os). Mesmas regras da visão Controle.

const semVeiculo = (r) => r.na_oficina === false
// Mesma regra do card "Veículos com mais de 30 dias na oficina" do Controle: 30+ dias E Na Oficina = Sim
const mais30 = (r) => { const d = diasOficina(r.data_criacao, r.data_auditoria); return d !== null && d >= 30 && r.na_oficina === true }
const tipoOs = (r) => r.tipo_os_descricao || r.tipo_os_sigla || '(Sem tipo)'

// Status da resposta de cada OS — o mesmo da 1ª coluna do relatório na visão Controle
const statusResposta = (r) => !isPendente(r) ? 'OK' : isRespondida(r) ? 'Respondido' : r._encerrada ? 'Sem resposta' : 'Responder'
const COR_STATUS = {
  Responder: 'bg-red-100 text-red-700 border border-red-200',
  Respondido: 'bg-green-100 text-green-700 border border-green-200',
  'Sem resposta': 'bg-slate-900 text-white',
  OK: 'bg-green-100 text-green-700',
}

const somar = (lista) => ({ qtd: lista.length, valor: lista.reduce((s, r) => s + (Number(r.total) || 0), 0) })
const agrupar = (lista, chave) => {
  const m = new Map()
  lista.forEach(r => { const k = chave(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r) })
  return [...m.entries()].map(([k, itens]) => ({ chave: k, itens, ...somar(itens) })).sort((a, b) => b.valor - a.valor)
}

const ABAS = [
  { key: 'indicadores', label: 'Indicadores', icon: Gauge },
  // O.S. Pendentes = OS em aberto sem veículo na oficina (Na Oficina = Não) — mesmo número do card do Controle
  { key: 'pendentes', label: 'O.S. Pendentes', icon: ClipboardList, filtro: semVeiculo, vazio: 'Nenhuma OS pendente.' },
  { key: 'mais30', label: 'O.S. ≥ 30 Dias', icon: CalendarClock, filtro: mais30, vazio: 'Nenhum veículo com 30 dias ou mais na oficina.' },
]

// Meio-círculo com o % (o "velocímetro" do card de pendentes)
function Medidor({ pct }) {
  const p = Math.max(0, Math.min(1, pct || 0))
  const r = 34, c = Math.PI * r
  return (
    <svg viewBox="0 0 84 48" className="w-24 h-14 shrink-0">
      <path d="M8 42 A34 34 0 0 1 76 42" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="11" />
      <path d="M8 42 A34 34 0 0 1 76 42" fill="none" stroke="#6b7280" strokeWidth="11" strokeDasharray={`${p * c} ${c}`} />
      <text x="42" y="44" textAnchor="middle" fill="#fff" style={{ fontSize: '9px', fontWeight: 700 }}>{(p * 100).toFixed(2).replace('.', ',')}%</text>
    </svg>
  )
}

function CardIndicador({ titulo, rotulo, valor, qtdTxt, cor, medidor }) {
  return (
    // sem h-full: o card fica do tamanho dele e a tabela vem logo abaixo (com h-full ele esticava até o fim da coluna)
    <div className="flex flex-col gap-2">
      <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-center text-[11px] font-bold uppercase text-slate-700 leading-tight min-h-[44px] flex items-center justify-center">
        {titulo}
      </div>
      <div className={`rounded-md p-4 text-white flex items-center justify-between gap-2 min-h-[104px] ${cor}`}>
        <div>
          <p className="text-[11px] font-bold uppercase">{rotulo}</p>
          <p className="text-base font-bold mt-1">{valor}</p>
          <p className="text-[11px] mt-1 text-white/90">{qtdTxt}</p>
        </div>
        {medidor !== undefined && <Medidor pct={medidor} />}
      </div>
    </div>
  )
}

// Matriz em vários níveis que abrem (como no Power BI): ex. Situação → Tipo de OS (grupo) → Tipo de OS → O.S.
// niveis: funções que dão a chave de cada nível; o último nível é a folha (sem seta).
// onInfo(os): ícone ⓘ na folha (1 O.S.) para abrir os dados dela; reincidentes + onHistorico: selo "R" que abre o histórico
function TabelaNiveis({ cabecalho, itens, niveis, onInfo, reincidentes, onHistorico }) {
  const [abertos, setAbertos] = useState(() => new Set())
  const alternar = (k) => setAbertos(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  if (!itens.length) return <p className="text-[11px] text-slate-400 p-3">Sem dados.</p>
  const total = somar(itens)
  const linhas = []
  const montar = (lista, nivel, caminho) => {
    agrupar(lista, niveis[nivel]).forEach(g => {
      const chave = `${caminho}|${g.chave}`
      const folha = nivel === niveis.length - 1
      const aberto = abertos.has(chave)
      linhas.push(
        <tr key={chave} className={`border-b border-slate-100 ${folha ? '' : 'cursor-pointer hover:bg-slate-50'}`}
          onClick={() => !folha && alternar(chave)}>
          <td className={`p-1.5 ${nivel === 0 ? 'font-bold text-slate-800' : nivel === 1 ? 'font-semibold text-slate-700' : 'text-slate-600'}`}
            style={{ paddingLeft: `${6 + nivel * 14}px` }}>
            <span className="inline-flex items-start gap-1">
              {!folha && (aberto ? <ChevronDown className="h-3 w-3 mt-0.5 shrink-0" /> : <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />)}
              {g.chave}
              {folha && onInfo && g.itens.length === 1 && (
                <button type="button" onClick={e => { e.stopPropagation(); onInfo(g.itens[0]) }} title="Ver os dados da O.S."
                  className="ml-1 inline-flex items-center justify-center h-4 w-4 rounded-full text-indigo-600 hover:bg-indigo-100 shrink-0">
                  <Info className="h-3.5 w-3.5" />
                </button>
              )}
              {folha && onHistorico && g.itens.length === 1 && reincidentes?.has(g.itens[0].os_numero) && (
                <button type="button" onClick={e => { e.stopPropagation(); onHistorico(g.itens[0]) }}
                  title="Reincidência — clique para ver em quais auditorias anteriores a O.S. apareceu"
                  className="inline-flex items-center justify-center h-4 w-4 rounded text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200 shrink-0">
                  R
                </button>
              )}
            </span>
          </td>
          <td className={`p-1.5 text-right ${folha ? 'text-slate-700' : 'font-semibold'}`}>{g.qtd}</td>
          <td className={`p-1.5 text-right whitespace-nowrap ${folha ? 'text-slate-700' : 'font-semibold'}`}>{fmt(g.valor)}</td>
        </tr>
      )
      if (!folha && aberto) montar(g.itens, nivel + 1, chave)
    })
  }
  montar(itens, 0, '')
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="border-b border-slate-200 text-slate-500">
          <th className="text-left font-semibold p-1.5">{cabecalho}</th>
          <th className="text-right font-semibold p-1.5 w-16">Qtde OS</th>
          <th className="text-right font-semibold p-1.5 w-24">Vlr Total</th>
        </tr>
      </thead>
      <tbody>
        {linhas}
        <tr className="font-bold text-slate-900 bg-slate-50">
          <td className="p-1.5">Total</td>
          <td className="p-1.5 text-right">{total.qtd}</td>
          <td className="p-1.5 text-right whitespace-nowrap">{fmt(total.valor)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// Agrupamento do Tipo de OS (gráfico "por Tipo de OS"): o Tipo Interno do cadastro Tipos de OS (dim_tipos_os) —
// Trucks liga pela sigla (V01, G03...). Tipo que não está no cadastro (ex.: Motos/MicroWork) cai na regra pelo nome.
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
const classificacaoPorNome = (nome) => {
  const n = semAcento(nome)
  if (n.includes('GARANTIA')) return 'Garantia'
  if (n.includes('SEGURADORA')) return 'Seguradora'
  if (n.includes('INTERNA')) return 'Interna'
  if (n.includes('REVISAO DE ENTREGA')) return 'Revisão de Entrega'
  if (n.includes('GRATUIT')) return 'Revisão Gratuita'
  if (n) return 'Cliente'
  return '(Sem tipo)'
}
const montarClassificador = (tipos) => {
  const porSigla = new Map(), porNome = new Map()
  ;(tipos || []).forEach(t => {
    const grupo = t.tipo_interno
    if (!grupo) return
    if (t.sigla) porSigla.set(semAcento(t.sigla), grupo)
    if (t.tipo_os) porNome.set(semAcento(t.tipo_os), grupo)
    if (t.sigla && t.tipo_os) porNome.set(semAcento(`${t.sigla} - ${t.tipo_os}`), grupo)
  })
  return (r) => porSigla.get(semAcento(r.tipo_os_sigla)) || porNome.get(semAcento(r.tipo_os_descricao))
    || classificacaoPorNome(r.tipo_os_descricao || r.tipo_os_sigla)
}

const AZUL_PBI = '#118dff'
const PALETA = ['#118dff', '#12239e', '#e66c37', '#6b007b', '#e044a7', '#744ec2', '#d9b300', '#d64550']
const fmtK = (v) => `R$ ${Math.round(Number(v) || 0).toLocaleString('pt-BR')}`
const nomeConsultor = (r) => r.consultor_nome || '(Sem consultor)'

function CaixaPbi({ titulo, children, className = '' }) {
  return (
    <div className={`rounded-md border border-slate-200 bg-white p-3 ${className}`}>
      {titulo && <p className="text-[11px] font-bold text-slate-700 uppercase mb-2">{titulo}</p>}
      {children}
    </div>
  )
}

// Filtro cruzado da aba O.S. Pendentes (igual ao Power BI): clicar num consultor, fatia, barra ou na reincidência
// filtra a aba inteira; clicar de novo no mesmo item limpa. Cada gráfico mostra as próprias categorias (com os
// OUTROS filtros aplicados) e destaca a escolhida — por isso `casa(r, exceto)` ignora a dimensão do próprio gráfico.
const FILTROS_PEND_VAZIO = { consultor: null, tipo: null, situacao: null, reinc: null }
const ROTULO_FILTRO = { consultor: 'Consultor', tipo: 'Tipo de OS', situacao: 'Situação', reinc: 'O.S. na Auditoria' }

// rows: todas as OS da auditoria · base: as pendentes (sem veículo na oficina), sem filtro
// reincidentes: Set das OS que já apareceram em auditorias anteriores da empresa (null = carregando)
// txt: textos do painel — O.S. Pendentes ({ grupo: 'Pendências', indicador: 'O.S. Pendentes', pct: 'Pendência' }) ou O.S. ≥ 30 Dias
function PainelPendentes({ rows, base, reincidentes, fx, setFx, casa, txt }) {
  const alternarFx = (dim, valor) => setFx(f => ({ ...f, [dim]: f[dim] === valor ? null : valor }))
  const limparFx = () => setFx(FILTROS_PEND_VAZIO)
  // Reincidência de um consultor: liga consultor + reincidência juntos; clicar de novo desliga os dois
  const alternarReincConsultor = (nome) => setFx(f => (f.reinc && f.consultor === nome ? { ...f, consultor: null, reinc: null } : { ...f, consultor: nome, reinc: true }))
  const total = somar(rows.filter(r => casa(r)))
  const pendentes = base.filter(r => casa(r))
  const tot = somar(pendentes)
  const pct = total.valor ? tot.valor / total.valor : 0
  const esmaecer = (dim, nome) => fx[dim] !== null && fx[dim] !== nome

  // Por consultor (tabela e rosca): com todos os filtros, menos o de consultor
  const porConsultor = useMemo(() => {
    const m = new Map()
    base.filter(r => casa(r, 'consultor')).forEach(r => {
      const k = nomeConsultor(r)
      if (!m.has(k)) m.set(k, { nome: k, pendQtd: 0, pendValor: 0, reincQtd: 0, reincValor: 0 })
      const c = m.get(k)
      c.pendQtd++; c.pendValor += Number(r.total) || 0
      if (reincidentes?.has(r.os_numero)) { c.reincQtd++; c.reincValor += Number(r.total) || 0 }
    })
    return [...m.values()].sort((a, b) => b.pendValor - a.pendValor)
  }, [base, casa, reincidentes])
  const totReinc = somar(pendentes.filter(r => reincidentes?.has(r.os_numero)))
  const donut = porConsultor.filter(c => c.pendValor > 0)
    .map((c, i) => ({ nome: c.nome, valor: c.pendValor, cor: PALETA[i % PALETA.length] }))
  const totDonut = donut.reduce((s, d) => s + d.valor, 0)
  // Barras pelo Tipo Interno do Tipo de OS (Cliente, TruckPag, Garantia, Interna...) — no balão, os tipos que entraram
  const porTipo = agrupar(base.filter(r => casa(r, 'tipo')), r => r._grupoTipo).map(g => ({
    nome: g.chave, valor: g.valor, qtd: g.qtd, tipos: [...new Set(g.itens.map(tipoOs))].join(', '),
  }))
  const porSituacao = agrupar(base.filter(r => casa(r, 'situacao')), r => r.situacao_nome || '(Em branco)')
    .map(g => ({ nome: g.chave, valor: g.valor, qtd: g.qtd }))

  const tooltipValor = (v, _n, p) => [`${fmt(v)} · ${p?.payload?.qtd ?? ''} OS`, `Total O.S. ${txt.indicador.replace('O.S. ', '')}`]
  const ativos = Object.entries(fx).filter(([, v]) => v !== null)
  const celReinc = (ativo) => `p-1 text-right whitespace-nowrap text-orange-700 cursor-pointer hover:underline ${ativo ? 'bg-orange-100 font-bold' : ''}`

  return (
    <div className="space-y-3">
      {/* Filtros ativos (clicados nos gráficos/tabelas) */}
      {ativos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
          <span className="text-[11px] font-bold text-indigo-700">Filtrando:</span>
          {ativos.map(([dim, v]) => (
            <button key={dim} type="button" onClick={() => alternarFx(dim, v)} title="Clique para tirar este filtro"
              className="inline-flex items-center gap-1 rounded-full bg-white border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700 hover:bg-indigo-100">
              {ROTULO_FILTRO[dim]}: <strong>{dim === 'reinc' ? 'Reincidência' : v}</strong> <X className="h-3 w-3" />
            </button>
          ))}
          <button type="button" onClick={limparFx} className="ml-auto text-[11px] font-semibold text-indigo-700 hover:underline">Limpar filtros</button>
        </div>
      )}

      {/* Indicadores lado a lado: total em aberto · total pendentes · % do valor em pendência */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] text-slate-500">Total O.S. em Aberto</p>
          <p className="text-base font-bold text-slate-900 mt-1">{fmtK(total.valor)}</p>
          <p className="text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200">Qtde O.S. em Aberto {total.qtd}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] text-slate-500">Total {txt.indicador}</p>
          <p className="text-base font-bold text-slate-900 mt-1">{fmtK(tot.valor)}</p>
          <p className="text-[11px] text-slate-600 mt-3 pt-2 border-t border-slate-200">Qtde {txt.indicador} {tot.qtd}</p>
        </div>
        {/* % Vlr Pendência — só o indicador (meia-lua), sem card */}
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 120 70" className="w-40 h-24">
            <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="#e2e8f0" strokeWidth="14" />
            <path d="M12 62 A48 48 0 0 1 108 62" fill="none" stroke="#dc2626" strokeWidth="14"
              strokeDasharray={`${Math.max(0, Math.min(1, pct)) * Math.PI * 48} ${Math.PI * 48}`} />
            <text x="60" y="60" textAnchor="middle" fill="#0f172a" style={{ fontSize: '15px', fontWeight: 700 }}>
              {(pct * 100).toFixed(2).replace('.', ',')}%
            </text>
          </svg>
          <p className="text-[11px] text-slate-500 -mt-1">% Vlr {txt.pct}</p>
        </div>
      </div>

      {/* Tabela por consultor e, ao lado, a rosca por consultor (lado a lado desde telas médias) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Tabela por consultor — clicar na linha filtra pelo consultor; na reincidência, só as reincidentes */}
        <CaixaPbi titulo={`Total de ${txt.grupo} por Consultor`} className="md:col-span-7 overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="text-left font-semibold p-1">Consultor</th>
                <th className="text-right font-semibold p-1">O.S. Pendentes</th>
                <th className="text-right font-semibold p-1">Qtde</th>
                <th className="text-right font-semibold p-1 text-orange-700" title="Pendentes que já apareceram em auditorias anteriores da empresa">Reincidência</th>
                <th className="text-right font-semibold p-1 text-orange-700">Qtde</th>
              </tr>
            </thead>
            <tbody>
              {porConsultor.map(c => (
                <tr key={c.nome}
                  className={`border-b border-slate-100 cursor-pointer ${fx.consultor === c.nome ? 'bg-indigo-100 font-semibold' : 'odd:bg-slate-50/60 hover:bg-indigo-50'} ${esmaecer('consultor', c.nome) ? 'opacity-40' : ''}`}
                  onClick={() => alternarFx('consultor', c.nome)} title="Clique para filtrar a aba por este consultor">
                  <td className="p-1 whitespace-nowrap">{c.nome}</td>
                  <td className="p-1 text-right whitespace-nowrap">{fmt(c.pendValor)}</td>
                  <td className="p-1 text-right">{c.pendQtd}</td>
                  <td className={celReinc(fx.reinc && fx.consultor === c.nome)}
                    onClick={e => { e.stopPropagation(); if (reincidentes) alternarReincConsultor(c.nome) }}
                    title="Clique para ver só as reincidências deste consultor">{reincidentes ? fmt(c.reincValor) : '…'}</td>
                  <td className={celReinc(fx.reinc && fx.consultor === c.nome)}
                    onClick={e => { e.stopPropagation(); if (reincidentes) alternarReincConsultor(c.nome) }}>
                    {reincidentes ? c.reincQtd : '…'}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="p-1">Total</td>
                <td className="p-1 text-right whitespace-nowrap">{fmt(tot.valor)}</td>
                <td className="p-1 text-right">{tot.qtd}</td>
                <td className={celReinc(fx.reinc && !fx.consultor)} onClick={() => reincidentes && alternarFx('reinc', true)}
                  title="Clique para ver só as reincidências">{reincidentes ? fmt(totReinc.valor) : '…'}</td>
                <td className={celReinc(fx.reinc && !fx.consultor)} onClick={() => reincidentes && alternarFx('reinc', true)}>
                  {reincidentes ? totReinc.qtd : '…'}</td>
              </tr>
            </tbody>
          </table>
        </CaixaPbi>

        {/* Rosca por consultor — clicar na fatia ou na legenda filtra */}
        <CaixaPbi titulo={`Total de ${txt.grupo} por Consultor`} className="md:col-span-5">
          {donut.length === 0 ? <p className="text-[11px] text-slate-400">Sem pendências.</p> : (
            <div className="flex items-center gap-2">
              <div className="w-40 h-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="90%" paddingAngle={1} stroke="none"
                      onClick={(d) => { const n = d?.payload?.nome || d?.nome || d?.name; if (n) alternarFx('consultor', n) }} className="cursor-pointer"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        // % só nas 4 maiores fatias (já vêm em ordem) e quando a fatia comporta o texto
                        if (index > 3 || percent < 0.05) return null
                        const r = innerRadius + (outerRadius - innerRadius) / 2
                        const x = cx + r * Math.cos(-midAngle * Math.PI / 180)
                        const y = cy + r * Math.sin(-midAngle * Math.PI / 180)
                        return (
                          <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" className="pointer-events-none" style={{ fontSize: 9, fontWeight: 700 }}>
                            {`${Math.round(percent * 100)}%`}
                          </text>
                        )
                      }}>
                      {donut.map(d => <Cell key={d.nome} fill={d.cor} fillOpacity={esmaecer('consultor', d.nome) ? 0.3 : 1} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v, n) => [`${fmt(v)} (${totDonut ? ((v / totDonut) * 100).toFixed(2).replace('.', ',') : 0}%)`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[10px] font-bold text-slate-600">Consultor</p>
                {donut.map(d => (
                  <button key={d.nome} type="button" onClick={() => alternarFx('consultor', d.nome)}
                    className={`w-full flex items-center gap-1.5 text-[10px] text-left text-slate-700 truncate hover:underline ${esmaecer('consultor', d.nome) ? 'opacity-40' : ''} ${fx.consultor === d.nome ? 'font-bold' : ''}`}
                    title={`${d.nome} · ${fmt(d.valor)}`}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.cor }} />{d.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CaixaPbi>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <CaixaPbi titulo={`Total de ${txt.grupo} por Tipo de OS`}>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porTipo} margin={{ top: 18, right: 8, left: 8, bottom: 4 }}>
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, maxWidth: 360, whiteSpace: 'normal' }}
                  formatter={tooltipValor}
                  labelFormatter={(nome, itens) => {
                    const tipos = itens?.[0]?.payload?.tipos
                    return tipos ? `${nome} — ${tipos}` : nome
                  }} />
                <Bar dataKey="valor" fill={AZUL_PBI} label={{ position: 'top', fontSize: 9, formatter: fmtK }}
                  className="cursor-pointer" onClick={(d) => { const n = d?.payload?.nome || d?.nome; if (n) alternarFx('tipo', n) }}>
                  {porTipo.map(d => <Cell key={d.nome} fill={AZUL_PBI} fillOpacity={esmaecer('tipo', d.nome) ? 0.3 : 1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CaixaPbi>
        <CaixaPbi titulo={`Total de ${txt.grupo} por Situação`}>
          <div style={{ height: Math.max(180, porSituacao.length * 34 + 20) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porSituacao} layout="vertical" margin={{ top: 4, right: 70, left: 8, bottom: 4 }}>
                <XAxis type="number" hide />
                {/* Situação numa linha só: largura do eixo pelo maior nome e texto desenhado sem quebra */}
                <YAxis type="category" dataKey="nome" interval={0}
                  width={Math.min(360, Math.max(80, ...porSituacao.map(s => String(s.nome).length * 5.2 + 12)))}
                  tick={({ x, y, payload }) => (
                    <text x={x - 4} y={y} textAnchor="end" dominantBaseline="central" fill="#475569"
                      style={{ fontSize: 9, whiteSpace: 'nowrap', cursor: 'pointer', fontWeight: fx.situacao === payload.value ? 700 : 400 }}
                      onClick={() => alternarFx('situacao', payload.value)}>
                      {payload.value}
                    </text>
                  )} />
                <Tooltip contentStyle={{ fontSize: 11 }} formatter={tooltipValor} />
                <Bar dataKey="valor" fill={AZUL_PBI} label={{ position: 'right', fontSize: 9, formatter: fmtK }}
                  className="cursor-pointer" onClick={(d) => { const n = d?.payload?.nome || d?.nome; if (n) alternarFx('situacao', n) }}>
                  {porSituacao.map(d => <Cell key={d.nome} fill={AZUL_PBI} fillOpacity={esmaecer('situacao', d.nome) ? 0.3 : 1} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CaixaPbi>
      </div>
    </div>
  )
}

// Lista de OS das abas (Pendentes, Sem veículo, ≥ 30 dias)
// reincidentes: Set das OS que já apareceram em auditorias anteriores (null = carregando) → coluna O.S. na Auditoria
function TabelaOs({ linhas, mostrarEmpresa, vazio, reincidentes, onVerHistorico }) {
  // Ordenação ao clicar no cabeçalho: crescente → decrescente → ordem original (vazios sempre no fim)
  const [ord, setOrd] = useState({ col: null, dir: 'asc' })
  if (!linhas.length) return <p className="text-[11px] text-slate-400 p-4">{vazio}</p>
  const tot = somar(linhas)
  const valorCol = {
    situacao: r => statusResposta(r),
    empresa: r => r._empresa,
    dt_os: r => r.data_criacao,
    dias: r => diasOficina(r.data_criacao, r.data_auditoria),
    os: r => Number(r.os_numero) || r.os_numero,
    consultor: r => r.consultor_nome,
    proprietario: r => r.proprietario_veiculo,
    placa: r => r.veiculo_placa,
    tipo: r => tipoOs(r),
    total: r => Number(r.total) || 0,
    na_oficina: r => (r.na_oficina === true ? 2 : r.na_oficina === false ? 1 : null),
    situacao_os: r => r.situacao_nome,
    observacao: r => r.observacao,
    previsao: r => r.data_previsao,
    na_auditoria: r => (!reincidentes ? null : reincidentes.has(r.os_numero) ? 'Reincidência' : 'Nova'),
  }
  const vazioV = (v) => v === null || v === undefined || v === ''
  const ordenadas = !ord.col ? linhas : [...linhas].sort((a, b) => {
    const va = valorCol[ord.col](a), vb = valorCol[ord.col](b)
    if (vazioV(va) || vazioV(vb)) return vazioV(va) === vazioV(vb) ? 0 : vazioV(va) ? 1 : -1
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb
      : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' })
    return ord.dir === 'asc' ? r : -r
  })
  const th = (col, label, cls = '') => {
    const Icone = ord.col !== col ? ArrowUpDown : ord.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={`p-2 ${cls}`}>
        <button type="button"
          onClick={() => setOrd(o => o.col !== col ? { col, dir: 'asc' } : o.dir === 'asc' ? { col, dir: 'desc' } : { col: null, dir: 'asc' })}
          className={`inline-flex items-center gap-1 uppercase whitespace-nowrap hover:text-slate-800 ${ord.col === col ? 'text-indigo-600' : ''}`}>
          {label} <Icone className="h-3 w-3" />
        </button>
      </th>
    )
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
            {th('situacao', 'Situação')}
            {mostrarEmpresa && th('empresa', 'Empresa')}
            {th('dt_os', 'Dt. OS')}
            {th('dias', 'Dias', 'text-center')}
            {th('os', 'Nº OS')}
            {th('consultor', 'Consultor')}
            {th('proprietario', 'Proprietário')}
            {th('placa', 'Placa')}
            {th('tipo', 'Tipo OS')}
            {th('total', 'Total', 'text-right')}
            {th('na_oficina', 'Na Oficina', 'text-center')}
            {th('situacao_os', 'Situação OS')}
            {th('observacao', 'Observação')}
            {th('previsao', 'Dt. Previsão')}
            {th('na_auditoria', 'O.S. na Auditoria')}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {ordenadas.map(r => {
            const st = statusResposta(r)
            const d = diasOficina(r.data_criacao, r.data_auditoria)
            return (
              <tr key={r.id} className="hover:bg-slate-50/70">
                <td className="p-2"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${COR_STATUS[st]}`}>{st}</span></td>
                {mostrarEmpresa && <td className="p-2 whitespace-nowrap">{r._empresa}</td>}
                <td className="p-2 whitespace-nowrap">{fmtDate(r.data_criacao)}</td>
                <td className="p-2 text-center">
                  {d === null ? '—' : <span className={`inline-flex px-1.5 rounded font-bold ${d >= 30 ? 'bg-red-100 text-red-700' : d >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{d}d</span>}
                </td>
                <td className="p-2 font-mono font-bold text-slate-900">{r.os_numero || '—'}</td>
                <td className="p-2 whitespace-nowrap">{primeiroUltimoNome(r.consultor_nome)}</td>
                <td className="p-2 min-w-[200px]">{r.proprietario_veiculo || '—'}</td>
                <td className="p-2 font-mono whitespace-nowrap">{r.veiculo_placa || '—'}</td>
                <td className="p-2 whitespace-nowrap">{tipoOs(r)}</td>
                <td className="p-2 text-right whitespace-nowrap font-semibold">{r.total > 0 ? fmt(r.total) : '—'}</td>
                <td className="p-2 text-center">{r.na_oficina === true ? 'Sim' : r.na_oficina === false ? 'Não' : '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.situacao_nome || '—'}</td>
                <td className="p-2 min-w-[220px]">{r.observacao || '—'}</td>
                <td className="p-2 whitespace-nowrap">{r.data_previsao ? fmtDate(r.data_previsao) : '—'}</td>
                <td className="p-2 whitespace-nowrap">
                  {!reincidentes ? <span className="text-slate-300">…</span>
                    : reincidentes.has(r.os_numero)
                      ? <span className="inline-flex items-center gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">Reincidência</span>
                          {onVerHistorico && (
                            <button type="button" onClick={() => onVerHistorico(r)} title="Ver em quais auditorias anteriores a OS apareceu"
                              className="inline-flex items-center justify-center h-6 w-6 rounded-md text-orange-600 hover:bg-orange-50 border border-orange-200">
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </span>
                      : <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Nova</span>}
                </td>
              </tr>
            )
          })}
          <tr className="bg-slate-50 font-bold text-slate-900">
            <td className="p-2" colSpan={mostrarEmpresa ? 9 : 8}>Total — {tot.qtd} OS</td>
            <td className="p-2 text-right whitespace-nowrap">{fmt(tot.valor)}</td>
            <td colSpan={5} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// selecao/onSelecao: empresa e auditoria compartilhadas com a visão Controle ({ empresa, auditoria, data })
// slotFiltros: elemento do cabeçalho do BI para os seletores; onSlotVisao: ref p/ os ícones Dashboard | Controle
// versao: muda quando a engrenagem altera alguma auditoria → recarrega auditorias e OS
export default function AuditoriaOsAbertoDashboard({ selecao = null, onSelecao = null, slotFiltros = null, onSlotVisao = null, versao = 0 }) {
  const { isAdminEfetivo, empresasPermitidasEfetivas } = useAuth()
  const [empresas, setEmpresas] = useState([])
  const [auditorias, setAuditorias] = useState([])
  const [empresaId, setEmpresaId] = useState(selecao?.empresa || '') // '' = todas
  // empresa: id da auditoria; todas: data ('' = última de cada empresa)
  const [dataSel, setDataSel] = useState(selecao?.empresa ? (selecao.auditoria || '') : (selecao?.data || ''))
  useEffect(() => {
    onSelecao?.(empresaId ? { empresa: empresaId, auditoria: dataSel, data: '' } : { empresa: '', auditoria: '', data: dataSel })
  }, [empresaId, dataSel]) // eslint-disable-line react-hooks/exhaustive-deps
  const [aba, setAba] = useState('indicadores')
  const [rows, setRows] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [carregandoOs, setCarregandoOs] = useState(false)
  const [erro, setErro] = useState('')

  // Empresas e auditorias (mesma regra de empresas da visão Controle)
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        await apiService.encerrarPrazosAuditoria().catch(() => {})
        const [emps, auds] = await Promise.all([apiService.getEmpresas(), apiService.getAuditorias()])
        if (!vivo) return
        const permitidas = (isAdminEfetivo ? emps : emps.filter(e => empresasPermitidasEfetivas.has(e.id)))
          .filter(empresaDaAuditoria)
          .sort((a, b) => nomeSeletorEmpresa(a).localeCompare(nomeSeletorEmpresa(b), 'pt-BR'))
        const ids = new Set(permitidas.map(e => e.id))
        const nomes = new Set(permitidas.map(e => e.nome_empresa))
        setEmpresas(permitidas)
        setAuditorias(auds.filter(a => (a.empresa_id ? ids.has(a.empresa_id) : nomes.has(a.empresa_nome))))
      } catch (e) { if (vivo) setErro(e.message || String(e)) }
      finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
  }, [isAdminEfetivo, empresasPermitidasEfetivas, versao])

  const nomeEmpresaAud = useMemo(() => {
    const porId = new Map(empresas.map(e => [e.id, nomeSeletorEmpresa(e)]))
    return (a) => porId.get(a.empresa_id) || a.empresa_nome || '—'
  }, [empresas])
  const ordemAud = (a, b) => `${b.data_auditoria}|${b.criado_em || ''}`.localeCompare(`${a.data_auditoria}|${a.criado_em || ''}`)

  // Auditorias da empresa escolhida (mais recente primeiro) e datas disponíveis quando "Todas"
  const audsEmpresa = useMemo(
    () => (empresaId ? auditorias.filter(a => a.empresa_id === empresaId) : auditorias).slice().sort(ordemAud),
    [auditorias, empresaId],
  )

  // Ao trocar a empresa: já seleciona a última auditoria dela (ou "última de cada empresa" em Todas).
  // Se a escolha atual (ex.: vinda da visão Controle) continua válida, mantém.
  useEffect(() => {
    if (carregando) return
    setDataSel(atual => empresaId
      ? (audsEmpresa.some(a => a.id === atual) ? atual : (audsEmpresa[0]?.id || ''))
      : '')
  }, [empresaId, audsEmpresa, carregando])

  // Auditorias consideradas no painel
  const audsSelecionadas = useMemo(() => {
    // Sem empresa e data escolhidas, o painel fica vazio (nenhum valor)
    if (!empresaId || !dataSel) return []
    return audsEmpresa.filter(a => a.id === dataSel)
  }, [empresaId, dataSel, audsEmpresa])

  // Reincidência: OS da auditoria escolhida que já apareceram em auditorias ANTERIORES da mesma empresa
  // (mesma regra da coluna "O.S. na Auditoria" do Controle). null = carregando.
  // historicoOs: Map os_numero → aparições anteriores (mais recente primeiro); reincidentes = as chaves
  const [historicoOs, setHistoricoOs] = useState(null)
  const reincidentes = useMemo(() => (historicoOs ? new Set(historicoOs.keys()) : null), [historicoOs])
  const [modalHistoricoOs, setModalHistoricoOs] = useState(null) // OS (linha) cujo histórico está aberto
  const [modalInfoOs, setModalInfoOs] = useState(null) // OS (linha) cujos dados estão abertos (ícone ⓘ)

  // Cadastro Tipos de OS → agrupamento (Tipo Interno) usado no gráfico "por Tipo de OS"
  const [tiposOs, setTiposOs] = useState([])
  useEffect(() => { apiService.getTiposOS().then(setTiposOs).catch(() => setTiposOs([])) }, [])
  const classificarTipo = useMemo(() => montarClassificador(tiposOs), [tiposOs])

  // Filtro cruzado da aba O.S. Pendentes (clique em consultor, fatia, barra ou reincidência); zera ao trocar a auditoria
  const [fxPend, setFxPend] = useState(FILTROS_PEND_VAZIO)
  useEffect(() => { setFxPend(FILTROS_PEND_VAZIO) }, [dataSel, empresaId, aba])
  // OS com o grupo do Tipo de OS já calculado (usado no gráfico e no filtro)
  const rowsPend = useMemo(() => rows.map(r => ({ ...r, _grupoTipo: classificarTipo(r) })), [rows, classificarTipo])
  // casa(r, exceto): a OS passa em todos os filtros ativos, menos o da dimensão "exceto" (a do próprio gráfico)
  const casaPend = useCallback((r, exceto) =>
    (exceto === 'consultor' || !fxPend.consultor || nomeConsultor(r) === fxPend.consultor) &&
    (exceto === 'tipo' || !fxPend.tipo || r._grupoTipo === fxPend.tipo) &&
    (exceto === 'situacao' || !fxPend.situacao || (r.situacao_nome || '(Em branco)') === fxPend.situacao) &&
    (exceto === 'reinc' || !fxPend.reinc || !!reincidentes?.has(r.os_numero)),
  [fxPend, reincidentes])
  useEffect(() => {
    let vivo = true
    setHistoricoOs(null)
    const atual = audsSelecionadas[0]
    if (!atual || !rows.length) return
    const anteriores = audsEmpresa.filter(a => a.id !== atual.id && ordemAud(atual, a) < 0)
    if (!anteriores.length) { setHistoricoOs(new Map()); return }
    const dataPorAud = new Map(anteriores.map(a => [a.id, a.data_auditoria]))
    const numeros = [...new Set(rows.map(r => r.os_numero).filter(Boolean))]
    apiService.getAuditoriaOsHistorico(anteriores.map(a => a.id), numeros)
      .then(lista => {
        if (!vivo) return
        const m = new Map()
        lista.forEach(h => {
          if (!m.has(h.os_numero)) m.set(h.os_numero, [])
          m.get(h.os_numero).push({ ...h, data_auditoria: dataPorAud.get(h.auditoria_id) || h.data_auditoria })
        })
        m.forEach(v => v.sort((a, b) => String(b.data_auditoria).localeCompare(String(a.data_auditoria))))
        setHistoricoOs(m)
      })
      .catch(() => { if (vivo) setHistoricoOs(new Map()) })
    return () => { vivo = false }
  }, [audsSelecionadas, rows]) // eslint-disable-line react-hooks/exhaustive-deps

  // OS das auditorias selecionadas, marcadas com empresa e se a auditoria está encerrada
  const marcar = (lista, auds) => {
    const porId = new Map(auds.map(a => [a.id, a]))
    return lista.map(r => {
      const a = porId.get(r.auditoria_id)
      return { ...r, _empresa: a ? nomeEmpresaAud(a) : '—', _encerrada: STATUS_ENCERRADOS.includes(a?.status) }
    })
  }
  useEffect(() => {
    let vivo = true
    if (!audsSelecionadas.length) { setRows([]); return }
    setCarregandoOs(true)
    apiService.getAuditoriaOsDeVarias(audsSelecionadas.map(a => a.id))
      .then(lista => { if (vivo) setRows(marcar(lista, audsSelecionadas)) })
      .catch(e => { if (vivo) setErro(e.message || String(e)) })
      .finally(() => { if (vivo) setCarregandoOs(false) })
    return () => { vivo = false }
  }, [audsSelecionadas])


  // ── Números do painel ──
  const total = somar(rows)
  const totSemVeic = somar(rows.filter(semVeiculo))
  const tot30 = somar(rows.filter(mais30))
  const responsaveis = [...new Set(rows.map(r => r.responsavel_nome).filter(Boolean))]
  // Aba O.S. Pendentes: só as OS sem veículo na oficina
  // Abas com painel (O.S. Pendentes e O.S. ≥ 30 Dias): base de OS e textos de cada uma
  const PAINEIS = {
    pendentes: { filtro: semVeiculo, txt: { grupo: 'Pendências', indicador: 'O.S. Pendentes', pct: 'Pendência' } },
    mais30: { filtro: mais30, txt: { grupo: 'O.S. com 30+ Dias', indicador: 'O.S. > 30 Dias', pct: '> 30 Dias' } },
  }
  const painelAba = PAINEIS[aba]
  const baseAba = painelAba ? rowsPend.filter(painelAba.filtro) : []


  if (carregando) return <div className="flex items-center gap-2 text-[11px] text-slate-500 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando auditorias...</div>
  const abaAtual = ABAS.find(a => a.key === aba)
  const mostrarEmpresa = !empresaId
  // Sem empresa e data escolhidas não mostra nenhum valor
  const semSelecao = !empresaId || !dataSel

  // Seletores Empresa / Data — dentro do BI vão para o cabeçalho (slotFiltros), com rótulo branco
  const corRotulo = slotFiltros ? 'text-white' : 'text-slate-500'
  const filtros = (
    <div className="flex items-end gap-3">
      <div className="flex flex-col gap-1 w-[240px]">
        <label className={`text-[10px] font-bold ${corRotulo} uppercase flex items-center gap-1`}><Building2 className="h-3 w-3" /> Empresa</label>
        <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
          className="h-9 text-[11px] px-2 border border-slate-300 rounded-md bg-white">
          <option value="">— Selecione uma empresa —</option>
          {empresas.map(e => <option key={e.id} value={e.id}>{nomeSeletorEmpresa(e)}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1 w-[235px]">
        <label className={`text-[10px] font-bold ${corRotulo} uppercase flex items-center gap-1`}><Calendar className="h-3 w-3" /> Data da Auditoria</label>
        <select value={dataSel} onChange={e => setDataSel(e.target.value)} disabled={!empresaId}
          className="h-9 text-[11px] px-2 border border-slate-300 rounded-md bg-white disabled:opacity-50 disabled:cursor-not-allowed">
          <option value="">— Selecione uma auditoria —</option>
          {empresaId && audsEmpresa.map(a => <option key={a.id} value={a.id}>{fmtDate(a.data_auditoria)} — {STATUS_ENCERRADOS.includes(a.status) ? 'Finalizada' : 'Em andamento'}</option>)}
        </select>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* FILTROS — no cabeçalho do BI quando embutido; senão acima das abas, à direita */}
      {slotFiltros ? createPortal(filtros, slotFiltros) : <div className="flex justify-end">{filtros}</div>}

      {/* ABAS à esquerda · ícones Dashboard | Controle à direita (desenhados pela página do BI) */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit flex-wrap">
          {ABAS.map(a => (
            <button key={a.key} onClick={() => setAba(a.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                aba === a.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
              <a.icon className="h-3.5 w-3.5" /> {a.label}
            </button>
          ))}
        </div>
        {onSlotVisao && <div ref={onSlotVisao} />}
      </div>

      {erro &&<p className="text-[11px] text-red-600 font-semibold">{erro}</p>}
      {carregandoOs && <div className="flex items-center gap-2 text-[11px] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando OS...</div>}

      {semSelecao && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-[11px] text-slate-500">
          {!empresaId ? 'Selecione a empresa' : 'Selecione a data da auditoria'} para ver os indicadores.
        </div>
      )}

      {!semSelecao && aba === 'indicadores' && (
        <>
          {/* Linha 1: Responsável · Total em aberto · Qtde em aberto */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-100 p-4 text-center">
              <p className="text-base font-bold text-slate-900 truncate" title={responsaveis.join(', ')}>
                {responsaveis.length ? responsaveis.map(primeiroUltimoNome).join(', ') : '(Em branco)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1"><User className="h-3 w-3" /> Responsável</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 text-center">
              <p className="text-base font-bold text-slate-900">{fmt(total.valor)}</p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1"><Banknote className="h-3 w-3" /> Total O.S. em Aberto</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4 text-center">
              <p className="text-base font-bold text-slate-900">{total.qtd}</p>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-center gap-1"><Hash className="h-3 w-3" /> Qtde O.S. em Aberto</p>
            </div>
          </div>

          {/* Linha 2: indicadores, cada um com sua tabela embaixo. O 1º é o das O.S. Pendentes = sem veículo na
              oficina (os mesmos números da aba O.S. Pendentes e do card do Controle) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <CardIndicador titulo="Total de O.S. em aberto sem que o veículo esteja na oficina" rotulo="Total O.S. pendentes"
                valor={totSemVeic.qtd ? fmt(totSemVeic.valor) : '- -'} qtdTxt={`Qtde O.S. pendentes ${totSemVeic.qtd || '--'}`}
                cor={totSemVeic.qtd ? 'bg-red-600' : 'bg-emerald-600'}
                medidor={total.valor ? totSemVeic.valor / total.valor : 0} />
              <div className="rounded-md border border-slate-200 bg-white">
                {/* Situação → Tipo de OS (grupo do Tipo Interno) → Tipo de OS → O.S. */}
                <TabelaNiveis cabecalho="Situação" itens={rowsPend.filter(semVeiculo)} onInfo={setModalInfoOs} reincidentes={reincidentes} onHistorico={setModalHistoricoOs}
                  niveis={[
                    r => r.situacao_nome || '(Em branco)',
                    r => r._grupoTipo,
                    tipoOs,
                    r => `O.S. ${r.os_numero || '—'} - ${r.proprietario_veiculo || '—'}`,
                  ]} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardIndicador titulo="Total de veículos na oficina com O.S. aberta há mais de 30 dias" rotulo="Total O.S. > 30 dias"
                valor={tot30.qtd ? fmt(tot30.valor) : '- -'} qtdTxt={`Qtde O.S. > 30 dias ${tot30.qtd || '--'}`}
                cor={tot30.qtd ? 'bg-red-600' : 'bg-emerald-600'}
                medidor={total.valor ? tot30.valor / total.valor : 0} />
              <div className="rounded-md border border-slate-200 bg-white">
                {/* Mesma tabela do 1º card: Situação → Tipo de OS (grupo) → Tipo de OS → O.S. */}
                <TabelaNiveis cabecalho="Situação" itens={rowsPend.filter(mais30)} onInfo={setModalInfoOs} reincidentes={reincidentes} onHistorico={setModalHistoricoOs}
                  niveis={[
                    r => r.situacao_nome || '(Em branco)',
                    r => r._grupoTipo,
                    tipoOs,
                    r => `O.S. ${r.os_numero || '—'} - ${r.proprietario_veiculo || '—'}`,
                  ]} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* O.S. Pendentes: painel de gráficos acima da tabela */}
      {!semSelecao && painelAba && (
        <PainelPendentes key={aba} rows={rowsPend} base={baseAba} reincidentes={reincidentes} fx={fxPend} setFx={setFxPend} casa={casaPend} txt={painelAba.txt} />
      )}

      {!semSelecao && abaAtual?.filtro && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <TabelaOs reincidentes={reincidentes} onVerHistorico={setModalHistoricoOs} linhas={(painelAba ? baseAba.filter(r => casaPend(r)) : rows.filter(abaAtual.filtro)).slice().sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))}
            mostrarEmpresa={mostrarEmpresa} vazio={abaAtual.vazio} />
        </div>
      )}

      {/* Dados da O.S. (ícone ⓘ nas tabelas em níveis) */}
      {modalInfoOs && (() => {
        const o = modalInfoOs
        const d = diasOficina(o.data_criacao, o.data_auditoria)
        const reinc = historicoOs?.get(o.os_numero) || []
        const campo = (rotulo, valor) => (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{rotulo}</p>
            <p className="text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">{valor || <span className="text-slate-300">—</span>}</p>
          </div>
        )
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setModalInfoOs(null)}>
            <div className="bg-white rounded-lg border border-slate-200 w-full max-w-2xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-600" /> O.S. {o.os_numero || '—'}
                </h3>
                <button onClick={() => setModalInfoOs(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-4 overflow-auto grid grid-cols-2 md:grid-cols-3 gap-4">
                {campo('Proprietário', o.proprietario_veiculo)}
                {campo('Consultor', o.consultor_nome)}
                {campo('Dt. OS', fmtDate(o.data_criacao))}
                {campo('Dias na oficina', d === null ? null : `${d} dias`)}
                {campo('Placa', o.veiculo_placa)}
                {campo('Chassi', o.veiculo_chassi)}
                {campo('Modelo', o.veiculo_modelo)}
                {campo('Tipo de OS', tipoOs(o))}
                {campo('Total', o.total > 0 ? fmt(o.total) : null)}
                {campo('Na Oficina', o.na_oficina === true ? 'Sim' : o.na_oficina === false ? 'Não' : null)}
                {campo('Situação', o.situacao_nome)}
                {campo('Dt. Previsão', o.data_previsao ? fmtDate(o.data_previsao) : null)}
                <div className="col-span-2 md:col-span-3">{campo('Observação', o.observacao)}</div>
                <div className="col-span-2 md:col-span-3 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">O.S. na Auditoria</span>
                  {!historicoOs ? <span className="text-slate-300 text-xs">…</span> : reinc.length
                    ? <>
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">Reincidência</span>
                        <button type="button" onClick={() => { setModalInfoOs(null); setModalHistoricoOs(o) }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-700 hover:underline">
                          <History className="h-3.5 w-3.5" /> ver {reinc.length} auditoria(s) anterior(es)
                        </button>
                      </>
                    : <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">Nova</span>}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Histórico da OS reincidente — mesma janela da visão Controle */}
      {modalHistoricoOs && (() => {
        const lista = historicoOs?.get(modalHistoricoOs.os_numero) || []
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setModalHistoricoOs(null)}>
            <div className="bg-white rounded-lg border border-slate-200 w-full max-w-4xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="h-4 w-4 text-orange-600" /> OS {modalHistoricoOs.os_numero} — auditorias anteriores
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {modalHistoricoOs.proprietario_veiculo || '—'}{modalHistoricoOs.veiculo_placa ? ` · ${modalHistoricoOs.veiculo_placa}` : ''} · apareceu em {lista.length} auditoria(s) anterior(es)
                  </p>
                </div>
                <button onClick={() => setModalHistoricoOs(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3">Auditoria</th>
                      <th className="p-3 text-center">Na Oficina</th>
                      <th className="p-3">Situação</th>
                      <th className="p-3">Observação</th>
                      <th className="p-3">Dt. Previsão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {lista.map(h => (
                      <tr key={h.id} className="align-top">
                        <td className="p-3 whitespace-nowrap font-semibold">{fmtDate(h.data_auditoria)}</td>
                        <td className="p-3 text-center">{h.na_oficina === true ? 'Sim' : h.na_oficina === false ? 'Não' : '—'}</td>
                        <td className="p-3">{h.situacao_nome || <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 whitespace-pre-wrap">{h.observacao || <span className="text-slate-300">—</span>}</td>
                        <td className="p-3 whitespace-nowrap">{h.data_previsao ? fmtDate(h.data_previsao) : <span className="text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
