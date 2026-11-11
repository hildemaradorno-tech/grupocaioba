import React, { useEffect, useMemo, useState, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
  Loader2, Building2, Calendar, ChevronDown, ChevronRight, Gauge, ClipboardList, Truck, CalendarClock,
  LineChart, User, Banknote, Hash,
} from 'lucide-react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import {
  fmt, fmtDate, primeiroUltimoNome, diasOficina, nomeSeletorEmpresa, empresaDaAuditoria,
  isPendente, isRespondida, STATUS_ENCERRADOS,
} from './auditoriaOsRegras'

// Dashboard da Auditoria O.S. Aberta — recria o painel do Power BI ("Indicadores principais") com os dados
// das auditorias do sistema (aud_auditorias / aud_auditoria_os). Mesmas regras da visão Controle.

const semVeiculo = (r) => r.na_oficina === false
const mais30 = (r) => { const d = diasOficina(r.data_criacao, r.data_auditoria); return d !== null && d >= 30 && r.na_oficina !== false }
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
  { key: 'pendentes', label: 'O.S. Pendentes', icon: ClipboardList, filtro: isPendente, vazio: 'Nenhuma OS pendente.' },
  { key: 'sem_veiculo', label: 'Sem Veículo na Oficina', icon: Truck, filtro: semVeiculo, vazio: 'Nenhuma OS sem veículo na oficina.' },
  { key: 'mais30', label: 'O.S. ≥ 30 Dias', icon: CalendarClock, filtro: mais30, vazio: 'Nenhum veículo com 30 dias ou mais na oficina.' },
  { key: 'diario', label: 'Controle Diário', icon: LineChart },
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
    <div className="flex flex-col gap-2 h-full">
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

// Tabela "Classificação | Qtde OS | Vlr Total" com grupos que abrem (como a matriz do Power BI)
function TabelaAgrupada({ cabecalho, grupos, subChave, vermelho }) {
  const [abertos, setAbertos] = useState(() => new Set())
  const total = grupos.reduce((a, g) => ({ qtd: a.qtd + g.qtd, valor: a.valor + g.valor }), { qtd: 0, valor: 0 })
  const alternar = (k) => setAbertos(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })
  if (!grupos.length) return <p className="text-[11px] text-slate-400 p-3">Sem dados.</p>
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
        {grupos.map(g => (
          <Fragment key={g.chave}>
            <tr className="border-b border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => subChave && alternar(g.chave)}>
              <td className="p-1.5 font-bold text-slate-800">
                <span className="inline-flex items-center gap-1">
                  {subChave && (abertos.has(g.chave) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                  {g.chave}
                </span>
              </td>
              <td className="p-1.5 text-right font-semibold">{g.qtd}</td>
              <td className="p-1.5 text-right font-semibold whitespace-nowrap">{fmt(g.valor)}</td>
            </tr>
            {subChave && abertos.has(g.chave) && agrupar(g.itens, subChave).map(s => (
              <tr key={s.chave} className="border-b border-slate-100">
                <td className="p-1.5 pl-6 text-slate-600">{s.chave}</td>
                <td className={`p-1.5 text-right ${vermelho?.(g.chave) ? 'bg-red-600 text-white font-semibold' : ''}`}>{s.qtd}</td>
                <td className={`p-1.5 text-right whitespace-nowrap ${vermelho?.(g.chave) ? 'bg-red-600 text-white font-semibold' : ''}`}>{fmt(s.valor)}</td>
              </tr>
            ))}
          </Fragment>
        ))}
        <tr className="font-bold text-slate-900 bg-slate-50">
          <td className="p-1.5">Total</td>
          <td className="p-1.5 text-right">{total.qtd}</td>
          <td className="p-1.5 text-right whitespace-nowrap">{fmt(total.valor)}</td>
        </tr>
      </tbody>
    </table>
  )
}

// Lista de OS das abas (Pendentes, Sem veículo, ≥ 30 dias)
function TabelaOs({ linhas, mostrarEmpresa, vazio }) {
  if (!linhas.length) return <p className="text-[11px] text-slate-400 p-4">{vazio}</p>
  const tot = somar(linhas)
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[11px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
            <th className="p-2">Situação</th>
            {mostrarEmpresa && <th className="p-2">Empresa</th>}
            <th className="p-2">Dt. OS</th>
            <th className="p-2 text-center">Dias</th>
            <th className="p-2">Nº OS</th>
            <th className="p-2">Consultor</th>
            <th className="p-2">Proprietário</th>
            <th className="p-2">Placa</th>
            <th className="p-2">Tipo OS</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2 text-center">Na Oficina</th>
            <th className="p-2">Situação OS</th>
            <th className="p-2">Observação</th>
            <th className="p-2">Dt. Previsão</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-slate-700">
          {linhas.map(r => {
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
              </tr>
            )
          })}
          <tr className="bg-slate-50 font-bold text-slate-900">
            <td className="p-2" colSpan={mostrarEmpresa ? 9 : 8}>Total — {tot.qtd} OS</td>
            <td className="p-2 text-right whitespace-nowrap">{fmt(tot.valor)}</td>
            <td colSpan={4} />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// selecao/onSelecao: empresa e auditoria compartilhadas com a visão Controle ({ empresa, auditoria, data })
// slotFiltros: elemento do cabeçalho do BI para os seletores; onSlotVisao: ref p/ os ícones Dashboard | Controle
export default function AuditoriaOsAbertoDashboard({ selecao = null, onSelecao = null, slotFiltros = null, onSlotVisao = null }) {
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
  const [rowsDiario, setRowsDiario] = useState([])
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
  }, [isAdminEfetivo, empresasPermitidasEfetivas])

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

  // Controle Diário: últimas 30 auditorias da empresa (ou de todas), só quando a aba é aberta
  const audsDiario = useMemo(() => (empresaId ? audsEmpresa.slice(0, 30) : []), [empresaId, audsEmpresa])
  useEffect(() => {
    if (aba !== 'diario' || !audsDiario.length) return
    let vivo = true
    setCarregandoOs(true)
    apiService.getAuditoriaOsDeVarias(audsDiario.map(a => a.id))
      .then(lista => { if (vivo) setRowsDiario(marcar(lista, audsDiario)) })
      .catch(e => { if (vivo) setErro(e.message || String(e)) })
      .finally(() => { if (vivo) setCarregandoOs(false) })
    return () => { vivo = false }
  }, [aba, audsDiario])

  // ── Números do painel ──
  const total = somar(rows)
  const pend = rows.filter(isPendente)
  const totPend = somar(pend)
  const totSemVeic = somar(rows.filter(semVeiculo))
  const tot30 = somar(rows.filter(mais30))
  const responsaveis = [...new Set(rows.map(r => r.responsavel_nome).filter(Boolean))]

  const diario = useMemo(() => {
    const porAud = new Map(audsDiario.map(a => [a.id, []]))
    rowsDiario.forEach(r => porAud.get(r.auditoria_id)?.push(r))
    return audsDiario.map(a => {
      const linhas = porAud.get(a.id) || []
      const p = linhas.filter(isPendente)
      const resp = p.filter(isRespondida)
      return {
        id: a.id, data: fmtDate(a.data_auditoria), empresa: nomeEmpresaAud(a), status: a.status,
        ...somar(linhas), pendQtd: p.length, pendValor: somar(p).valor, respondidas: resp.length,
        pctResp: p.length ? resp.length / p.length : null,
      }
    })
  }, [audsDiario, rowsDiario, nomeEmpresaAud])

  if (carregando) return <div className="flex items-center gap-2 text-[11px] text-slate-500 p-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando auditorias...</div>
  const abaAtual = ABAS.find(a => a.key === aba)
  const mostrarEmpresa = !empresaId
  // Sem empresa (ou sem data, fora do Controle Diário) não mostra nenhum valor
  const semSelecao = !empresaId || (aba !== 'diario' && !dataSel)

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

          {/* Linha 2: os 4 indicadores, cada um com sua tabela embaixo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <CardIndicador titulo="Total de O.S. pendentes (sem veículo na oficina ou 30+ dias)" rotulo="Total O.S. pendentes"
                valor={fmt(totPend.valor)} qtdTxt={`Qtde O.S. pendentes ${totPend.qtd}`} cor="bg-red-600"
                medidor={total.valor ? totPend.valor / total.valor : 0} />
              <div className="rounded-md border border-slate-200 bg-white">
                <TabelaAgrupada cabecalho="Classificação" grupos={agrupar(pend, statusResposta)} subChave={tipoOs}
                  vermelho={(k) => k !== 'Respondido'} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardIndicador titulo="Total de O.S. em aberto sem que o veículo esteja na oficina" rotulo="Qtde O.S. sem veículo"
                valor={totSemVeic.qtd ? fmt(totSemVeic.valor) : '- -'} qtdTxt={`Qtde O.S. ${totSemVeic.qtd || '--'}`}
                cor={totSemVeic.qtd ? 'bg-red-600' : 'bg-emerald-600'} />
              <div className="rounded-md border border-slate-200 bg-white">
                <TabelaAgrupada cabecalho="Tipo OS" grupos={agrupar(rows.filter(semVeiculo), tipoOs)} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <CardIndicador titulo="Total de veículos na oficina com O.S. aberta há mais de 30 dias" rotulo="Total O.S. > 30 dias"
                valor={tot30.qtd ? fmt(tot30.valor) : '- -'} qtdTxt={`Qtde O.S. > 30 dias ${tot30.qtd || '--'}`}
                cor={tot30.qtd ? 'bg-red-600' : 'bg-emerald-600'} />
              <div className="rounded-md border border-slate-200 bg-white">
                <TabelaAgrupada cabecalho="Tipo OS" grupos={agrupar(rows.filter(mais30), tipoOs)} />
              </div>
            </div>
          </div>
        </>
      )}

      {!semSelecao && abaAtual?.filtro && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <TabelaOs linhas={rows.filter(abaAtual.filtro).sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0))}
            mostrarEmpresa={mostrarEmpresa} vazio={abaAtual.vazio} />
        </div>
      )}

      {!semSelecao && aba === 'diario' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500">
            Últimas {audsDiario.length} auditorias {empresaId ? 'da empresa' : 'de todas as empresas'} — quantidade de O.S. pendentes e % respondido em cada uma.
          </p>
          {diario.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={diario.slice().reverse().map(d => ({ nome: empresaId ? d.data : `${d.data} ${d.empresa}`, pendentes: d.pendQtd, respondidas: d.respondidas, total: d.qtd }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="pendentes" name="Pendentes" fill="#dc2626" />
                  <Bar dataKey="respondidas" name="Respondidas" fill="#16a34a" />
                  <Line type="monotone" dataKey="total" name="Total de O.S." stroke="#4f46e5" strokeWidth={2} dot={{ r: 2 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <th className="p-2 text-left">Data</th>
                  {mostrarEmpresa && <th className="p-2 text-left">Empresa</th>}
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-right">Qtde O.S.</th>
                  <th className="p-2 text-right">Vlr Total</th>
                  <th className="p-2 text-right">Pendentes</th>
                  <th className="p-2 text-right">Vlr Pendente</th>
                  <th className="p-2 text-right">Respondidas</th>
                  <th className="p-2 text-right">% Respondido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {diario.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="p-2 whitespace-nowrap">{d.data}</td>
                    {mostrarEmpresa && <td className="p-2 whitespace-nowrap">{d.empresa}</td>}
                    <td className="p-2 whitespace-nowrap">{STATUS_ENCERRADOS.includes(d.status) ? 'Finalizada' : 'Em andamento'}</td>
                    <td className="p-2 text-right">{d.qtd}</td>
                    <td className="p-2 text-right whitespace-nowrap">{fmt(d.valor)}</td>
                    <td className="p-2 text-right font-semibold text-red-700">{d.pendQtd}</td>
                    <td className="p-2 text-right whitespace-nowrap">{fmt(d.pendValor)}</td>
                    <td className="p-2 text-right text-green-700 font-semibold">{d.respondidas}</td>
                    <td className="p-2 text-right font-semibold">{d.pctResp === null ? '—' : `${Math.round(d.pctResp * 100)}%`}</td>
                  </tr>
                ))}
                {!diario.length && <tr><td colSpan={9} className="p-4 text-slate-400">Nenhuma auditoria.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
