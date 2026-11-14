import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BookOpen, Building2, Calendar, ChevronDown, ChevronLeft, ChevronRight, Download, Info, ListChecks, RefreshCw, Settings, Table2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/supabaseClient'
import { empresaSelecionavel } from '../../utils/comissoesElegibilidade'
import { INFO, OBJETIVO_ABAS } from './agendamentoServicosTextos'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Sem mockup: "valor: null" = ainda sem fonte de dados (mostra —); "chave" = vem das Campanhas CRM (RCR038).
const TIPOS = ['AGENDAMENTO ATIVO', 'AGENDAMENTO RECEPTIVO']

const KPIS = [
  { label: 'Campanhas geradas', chave: 'campanhas' }, // ID_Campanha_Execucao distintos
  { label: 'Contatos gerados', chave: 'contatos' }, // atendimentos (campanha + atendimento) do RCR038 — veículo repetido conta de novo
  { label: 'Contatos agendados', chave: 'agendados' }, // chassi + cliente com agendamento Ativo no ROF037 até 30 dias após a campanha
  { label: 'Contatos encerrados', chave: 'encerrados' }, // não agendados com motivo de encerramento no RCR017
  { label: 'Contatos a realizar', chave: 'faltaContatar' }, // não agendados sem motivo no RCR017 (sem contato ou sem resultado)
]

// Velocímetros (os três lado a lado no topo da aba). valor/meta em %; valor null = ainda sem fonte de dados.
const GAUGES = [
  { label: 'Taxa de Agendamento', chave: 'taxaAgendamento', valor: null, meta: 80, info: INFO.taxaAgendamento },
  { label: 'Taxa de Conversão', chave: 'taxaConversao', valor: null, meta: 80, info: INFO.taxaConversao },
  { label: 'Taxa de No-show', chave: 'taxaNoShow', valor: null, meta: 15, info: INFO.taxaNoShow, menorMelhor: true },
]

// Metas dos indicadores: editadas na engrenagem (tabela bi_agendamento_metas); estes valores valem até carregar
// ou se o indicador não estiver na tabela.
const METAS_PADRAO = {
  taxaAgendamento: 80, taxaConversao: 80, taxaNoShow: 15,
  agTaxaConversao: 80, agTaxaConversaoAtivo: 80, agTaxaConversaoPassivo: 80, agTaxaNoShow: 15,
  gaugeAgendamentoOs: 80, gaugeAtivo: 80, gaugePassivo: 80, gaugeAgNaoLigado: 10,
}
// Indicadores na janela de metas, por aba (na mesma ordem da tela).
const METAS_POR_ABA = [
  ['Por Campanhas', [['taxaAgendamento', 'Taxa de Agendamento'], ['taxaConversao', 'Taxa de Conversão'], ['taxaNoShow', 'Taxa de No-show', true]]],
  ['Por Data Agendamento', [['agTaxaConversao', 'Taxa de Agendamento'], ['agTaxaConversaoAtivo', 'Taxa de Agendamento Ativo'], ['agTaxaConversaoPassivo', 'Taxa de Agendamento Passivo'], ['agTaxaNoShow', 'Taxa de No-show', true]]],
  ['Por Data da O.S.', [['gaugeAgendamentoOs', 'Taxa de Agendamento'], ['gaugeAtivo', 'Taxa de Agendamento Ativo'], ['gaugePassivo', 'Taxa de Agendamento Passivo'], ['gaugeAgNaoLigado', 'Taxa de O.S. fora do Agendamento', true]]],
]

// Janela da engrenagem: meta (%) de cada indicador, salva para todos os usuários.
function JanelaMetas({ metas, info, onSalvar, onClose }) {
  const [valores, setValores] = useState(() => Object.fromEntries(Object.entries(metas).map(([k, v]) => [k, String(v)])))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const invalido = Object.values(valores).some(v => v === '' || isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)
  const salvar = async () => {
    setSalvando(true); setErro('')
    try {
      await onSalvar(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, Number(v)])))
      onClose()
    } catch (e) {
      setErro(`Não foi possível salvar: ${e.message || e}`)
    } finally {
      setSalvando(false)
    }
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><Settings className="h-4 w-4 text-emerald-600" /> Metas dos indicadores</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto p-4 space-y-4">
          {METAS_POR_ABA.map(([aba, itens]) => (
            <div key={aba}>
              <p className="text-[11px] font-bold text-emerald-700 uppercase mb-1.5">{aba}</p>
              <div className="space-y-1.5">
                {itens.map(([chave, label, menorMelhor]) => (
                  <label key={chave} className="flex items-center justify-between gap-3 text-[11px] text-slate-700">
                    <span>{label}{menorMelhor && <span className="text-slate-400"> (quanto menor, melhor)</span>}</span>
                    <span className="flex items-center gap-1">
                      <input type="number" min="0" max="100" step="0.1" value={valores[chave] ?? ''}
                        onChange={e => setValores(v => ({ ...v, [chave]: e.target.value }))}
                        className="w-20 text-right text-[11px] px-1.5 py-1 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
                      %
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {info && <p className="text-[10px] text-slate-400">{info}</p>}
          {erro && <p className="text-[11px] text-red-600">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button type="button" onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">Cancelar</button>
          <button type="button" onClick={salvar} disabled={salvando || invalido}
            className="text-[11px] px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Meia-lua: arco cinza de fundo, arco preenchido até o valor e um corte branco na meta.
const fmtBRL = (v) => (v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))

// O que aconteceu com os agendados das campanhas, pelo status do agendamento no ROF037:
// Agendamentos comparecidos = tem número de O.S (ou status FIM); Agendamentos não comparecidos (No-show) = NSW; Agendamentos a comparecer = ainda vai acontecer (AGE/CON/RAG).
const SITUACAO = [
  { label: 'Agendamentos comparecidos', chave: 'osAberta', cor: '#059669' },
  { label: 'Agendamentos a comparecer', chave: 'programados', cor: '#3b82f6' },
  { label: 'Agendamentos não comparecidos (No-show)', chave: 'noShow', cor: '#dc2626' },
]
const situacaoDe = (ag) => (!ag ? null : ag.os !== null || ag.status === 'FIM' ? 'osAberta' : ag.status === 'NSW' ? 'noShow' : 'programados')

// Evolução mensal para a aba Visão Período (sem fonte ainda: taxa/faturamento null).
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const HOJE = new Date()
const MES_ATUAL = HOJE.getMonth()
const ANO_CURTO = String(HOJE.getFullYear()).slice(2)
// Só os meses já ocorridos (jan até o mês atual) têm dado.
const EVOLUCAO = MESES.slice(0, MES_ATUAL + 1).map((m, i) => ({ idx: i, mes: `${m}/${ANO_CURTO}`, taxa: null, faturamento: null }))
const fmtMil = (v) => (v === null || v === undefined ? '' : `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`)
const eixo = { fontSize: 11, fill: '#64748b' }

// Botão ⓘ dos cards/indicadores/gráficos (mesmo padrão do BI Planos de Manutenção, em verde): abre um quadro
// com objetivo, cálculo e fonte (arquivo) do número, centralizado na tela (portal, acima de tudo); fecha clicando fora ou no X.
// Regras e colunas ficam no Manual operacional (/bi/agendamento-servicos/manual).
function BotaoInfo({ titulo, info }) {
  const [aberto, setAberto] = useState(false)
  if (!info) return null
  const secoes = [['Objetivo', info.objetivo], ['Cálculo', info.calculo], ['Origem do cálculo', info.origem], ['Fonte (arquivo)', info.fonte]]
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={`Informações: ${titulo}`} title="Informações"
        className="absolute top-2 right-2 p-0.5 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
        <Info className="h-3.5 w-3.5" />
      </button>
      {aberto && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl text-[11px] text-slate-700 w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900">{titulo}</p>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              {secoes.filter(([, t]) => t).map(([nome, texto]) => (
                <div key={nome}>
                  <p className="text-[10px] font-bold uppercase text-emerald-700">{nome}</p>
                  <p className="leading-snug mt-0.5 whitespace-pre-line">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Card simples (barra lateral + rótulo + número) com o botão ⓘ.
function CardKpi({ label, valor, info, cor, children, extra }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3 flex gap-2.5">
      <BotaoInfo titulo={label} info={info} />
      <div className={`w-1 rounded shrink-0 ${cor ? '' : 'bg-red-400'}`} style={cor ? { backgroundColor: cor } : undefined} />
      <div className="flex-1 pr-4">
        <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{label}</p>
        <p className="text-base font-bold text-slate-900 mt-1">{valor}</p>
        {children}
      </div>
      {extra}
    </div>
  )
}

function CardGrafico({ titulo, vazio, info, children }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo={titulo} info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight mb-2 pr-5">{titulo}</p>
      <div className="h-56">
        {vazio ? <div className="h-full flex items-center justify-center text-[11px] text-slate-400">Sem fonte de dados ainda.</div> : children}
      </div>
    </div>
  )
}

// Card no modelo "Conversão — Resultado": Peças, Serviços e Total (barras proporcionais ao Total) de uma lista de O.S.
function CardConversao({ titulo, oses, carregando, info }) {
  const soma = (campo) => (oses ? oses.reduce((t, o) => t + (o[campo] || 0), 0) : null)
  const itens = [
    { label: 'Faturamento Peças', valor: soma('produto'), cor: '#34d399' },
    { label: 'Faturamento Serviços', valor: soma('servico'), cor: '#10b981' },
    { label: 'Faturamento Total', valor: soma('total'), cor: '#047857' }, // = peças + serviços − descontos
  ]
  const max = Math.max(...itens.map(c => c.valor || 0), 0)
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo={titulo} info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight pr-5">{titulo}</p>
      <div className="space-y-3 mt-3">
        {itens.map(c => (
          <div key={c.label}>
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
              <span className="text-slate-600">{c.label}</span>
              <span className="font-bold text-slate-900 tabular-nums">{carregando && c.valor === null ? '...' : fmtBRL(c.valor)}</span>
            </div>
            <div className="h-4 bg-slate-100 rounded mt-1 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${max ? ((c.valor || 0) / max) * 100 : 0}%`, backgroundColor: c.cor }} />
            </div>
          </div>
        ))}
        {/* Ticket médio = Faturamento Total ÷ nº de O.S. do card (as mesmas dos cards de quantidade). */}
        <div className="flex items-baseline justify-between gap-2 text-[11px] border-t border-slate-100 pt-2">
          <span className="text-slate-600">Ticket médio</span>
          <span className="font-bold text-slate-900 tabular-nums">{oses?.length ? fmtBRL(soma('total') / oses.length) : '—'}</span>
        </div>
      </div>
    </div>
  )
}

// Cor pelo atingimento da meta: < 80% vermelho, 80–99% amarelo, >= 100% verde.
// Em indicadores "quanto menor, melhor" o atingimento é meta ÷ valor.
const corAtingimento = (valor, meta, menorMelhor) => {
  const ating = menorMelhor ? (valor > 0 ? meta / valor : 1) : (meta > 0 ? valor / meta : 1)
  return ating >= 1 ? '#059669' : ating >= 0.8 ? '#eab308' : '#dc2626'
}

function GaugeMeta({ label, valor, meta, info, menorMelhor }) {
  const cx = 100, cy = 100, r = 70, esp = 36
  const ponto = (pct, raio = r) => {
    const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100)
    return [cx + raio * Math.cos(a), cy - raio * Math.sin(a)]
  }
  const arco = (pct) => { const [x, y] = ponto(pct); return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}` }
  const [mx1, my1] = ponto(meta, r - esp / 2 - 1)
  const [mx2, my2] = ponto(meta, r + esp / 2 + 1)
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo={label} info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight pr-5">{label}</p>
      <svg viewBox="0 0 200 118" className="w-full max-h-40 mt-1">
        <path d={arco(100)} fill="none" stroke="#e2e8f0" strokeWidth={esp} />
        {valor !== null && valor > 0 && <path d={arco(valor)} fill="none" stroke={corAtingimento(valor, meta, menorMelhor)} strokeWidth={esp} />}
        <line x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="#fff" strokeWidth="3" />
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 20, fontWeight: 700 }}>{valor === null ? '—' : `${valor}%`}</text>
        <text x={cx} y={cy + 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>Meta: {meta}%</text>
        <text x={cx - r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>0%</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>100%</text>
      </svg>
    </div>
  )
}

// Abas internas do BI.
// Visão Período fica fora por enquanto (gráficos ainda sem fonte); o código dela continua abaixo.
const ABAS = ['Por Campanhas', 'Por Data Agendamento', 'Por Data da O.S.']
// Passagens: O.S. abertas e agendamentos; Por Data Agendamento: agenda pela data do agendamento e o que aconteceu; Campanhas: painel de cards/velocímetros; Visão Período: gráficos mensais.
const ABA_PASSAGENS = 'Por Data da O.S.'
const ABA_AGENDAMENTOS = 'Por Data Agendamento'
const ABA_CAMPANHAS = 'Por Campanhas'
const VISAO_PERIODO = 'Visão Período'

// Multisseleção de empresas: marcar o agrupamento marca/desmarca todas as empresas dele.
function SeletorEmpresas({ grupos, selecionadas, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)

  const todas = grupos.flatMap(([, l]) => l)
  const nomeDe = (e) => e.empresa_fantasia || e.nome_empresa
  const alternar = (ids, marcar) => {
    const set = new Set(selecionadas)
    ids.forEach(id => (marcar ? set.add(id) : set.delete(id)))
    onChange([...set])
  }
  const resumo = selecionadas.length === 0 ? 'Todos'
    : selecionadas.length === 1 ? nomeDe(todas.find(e => e.id === selecionadas[0]) || {}) || '1 empresa'
    : `${selecionadas.length} empresas`

  const abrir = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) })
    }
    setAberto(a => !a)
  }

  // Mesmo visual do seletor do BI Possibilidades (lista em portal, acima de tudo), em verde.
  return (
    <>
      <button ref={ref} type="button" onClick={abrir}
        className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 min-w-[180px] flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[360px] overflow-y-auto whitespace-nowrap">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionadas.length === 0 ? 'text-emerald-700' : ''}`}>
              Todos
            </button>
            {grupos.map(([nome, lista]) => {
              const ids = lista.map(e => e.id)
              const qtd = ids.filter(id => selecionadas.includes(id)).length
              return (
                <div key={nome} className="border-t border-slate-100 mt-1 pt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-bold uppercase text-[11px] text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600"
                      checked={qtd === ids.length}
                      ref={el => { if (el) el.indeterminate = qtd > 0 && qtd < ids.length }}
                      onChange={ev => alternar(ids, ev.target.checked)} />
                    {nome}
                  </label>
                  {lista.map(e => (
                    <label key={e.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600" checked={selecionadas.includes(e.id)} onChange={ev => alternar([e.id], ev.target.checked)} />
                      {nomeDe(e)}
                    </label>
                  ))}
                </div>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// Ícones da aba, na linha das abas, à direita: conferência/consulta linha a linha e tabela por data.
function IconesAba({ onTabela, tituloTabela, onConferencia, tituloConferencia }) {
  return (
    <div className="flex justify-end">
      <div className="flex items-center gap-1">
        {onConferencia && (
          <button type="button" onClick={onConferencia} title={tituloConferencia} aria-label={tituloConferencia}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            <ListChecks className="h-4 w-4" />
          </button>
        )}
        {onTabela && (
          <button type="button" onClick={onTabela} title={`${tituloTabela} (tabela)`} aria-label={tituloTabela}
            className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
            <Table2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// Situação de cada contato gerado (mesma regra dos cards da aba Por Campanhas).
const situacaoCampanha = (r) => (r.agendamento ? 'Contato agendado' : r.contato_realizado ? 'Contato encerrado' : 'Contato a realizar')
const agDaLinha = (r) => r.agendamento // só o atendimento onde o agendamento contou
const contatoCampanha = (r) => (r.contato_realizado ? 'Encerrado / registrado' : r.contato_registrado ? 'Já contatado, sem resultado' : 'Sem contato')
const RESULTADO_AG = { osAberta: 'Compareceu', programados: 'A comparecer', noShow: 'Não compareceu (No-show)' }
const diasEntre = (de, ate) => (de && ate ? Math.round((new Date(`${ate}T12:00:00Z`) - new Date(`${de}T12:00:00Z`)) / 864e5) : null)
// Colunas da conferência: [título, valor da linha]. As mesmas vão para o Excel.
const COLUNAS_CONFERENCIA = [
  ['Data da campanha', r => fmtData(r.data)],
  ['Campanha', r => r.id_campanha_execucao],
  ['Atendimento', r => r.id_atendimento ?? ''],
  ['Cód. cliente', r => r.id_cliente ?? ''],
  ['Cliente', r => r.cliente],
  ['Chassi', r => r.chassi],
  ['Situação', r => situacaoCampanha(r)],
  ['Contato (RCR017)', r => contatoCampanha(r)],
  ['Motivo de encerramento', r => r.motivo_final || ''],
  ['1º contato', r => (r.contato_primeiro ? fmtData(r.contato_primeiro) : '')],
  ['Último contato', r => (r.contato_ultimo ? fmtData(r.contato_ultimo) : '')],
  ['Nº contatos', r => r.contato_qtde || ''],
  ['Operador', r => r.operador || ''],
  ['Agendamento criado em', r => (agDaLinha(r) ? fmtData(agDaLinha(r).criado) : '')],
  ['Dias após a campanha', r => (agDaLinha(r) ? diasEntre(r.data, agDaLinha(r).criado) : '')],
  ['Agendado para', r => (agDaLinha(r)?.data_agendamento ? fmtData(agDaLinha(r).data_agendamento) : '')],
  ['Tipo', r => agDaLinha(r)?.tipo || ''],
  ['Status', r => agDaLinha(r)?.status || ''],
  ['O.S.', r => agDaLinha(r)?.os ?? ''],
  ['Resultado', r => (agDaLinha(r) ? RESULTADO_AG[situacaoDe(agDaLinha(r))] : '')],
  ['Veículo agendado na', r => (r.repetido_de ? `campanha ${r.repetido_de.id_campanha_execucao} (atendimento ${r.repetido_de.id_atendimento ?? '—'})` : '')],
]
const FILTROS_CONFERENCIA = ['Todos', 'Contato agendado', 'Contato encerrado', 'Contato a realizar']

// Pop-up "Conferência linha a linha" (aba Por Campanhas): um contato gerado por linha com tudo o que liga
// os relatórios (atendimento → RCR017; chassi + cliente → ROF037), filtro pela situação e exportação para Excel.
function ConferenciaCampanhas({ rows, onClose }) {
  const [filtro, setFiltro] = useState('Todos')
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => {
    const t = busca.trim().toUpperCase()
    return rows
      .filter(r => filtro === 'Todos' || situacaoCampanha(r) === filtro)
      .filter(r => !t || [r.cliente, r.chassi, r.id_atendimento, r.id_campanha_execucao, r.operador].some(v => String(v ?? '').toUpperCase().includes(t)))
      .sort((a, b) => a.data.localeCompare(b.data) || a.id_campanha_execucao - b.id_campanha_execucao || (a.id_atendimento ?? 0) - (b.id_atendimento ?? 0))
  }, [rows, filtro, busca])
  const qtde = (f) => rows.filter(r => f === 'Todos' || situacaoCampanha(r) === f).length
  const exportar = async () => {
    const XLSX = await import('xlsx')
    const dados = lista.map(r => Object.fromEntries(COLUNAS_CONFERENCIA.map(([h, f]) => [h, f(r)])))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conferência')
    XLSX.writeFile(wb, `Conferencia Campanhas ${filtro} ${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-600" /> Conferência linha a linha — contatos gerados</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100">
          {FILTROS_CONFERENCIA.map(f => (
            <button key={f} type="button" onClick={() => setFiltro(f)}
              className={`text-[11px] px-2 py-1 rounded-md border ${filtro === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
              {f} ({qtde(f).toLocaleString('pt-BR')})
            </button>
          ))}
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, chassi, atendimento, campanha, operador"
            className="text-[11px] px-2 py-1 rounded-md border border-slate-300 w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <button type="button" onClick={exportar} disabled={!lista.length}
            className="ml-auto text-[11px] px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Exportar Excel ({lista.length.toLocaleString('pt-BR')})
          </button>
        </div>
        <div className="overflow-auto px-4 pb-4">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-white text-slate-500 uppercase text-[10px] shadow-[0_1px_0_0_#e2e8f0]">
              <tr>{COLUNAS_CONFERENCIA.map(([h]) => <th key={h} className="font-bold text-left py-1.5 px-2 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="text-slate-700">
              {!lista.length && <tr><td colSpan={COLUNAS_CONFERENCIA.length} className="py-6 text-center text-slate-400">Nenhum cliente nesse filtro.</td></tr>}
              {lista.map((r, i) => (
                <tr key={`${r.id_campanha_execucao}#${r.id_atendimento ?? r.id_cliente}#${i}`} className="border-b border-slate-100">
                  {COLUNAS_CONFERENCIA.map(([h, f]) => <td key={h} className="py-1 px-2 whitespace-nowrap">{f(r)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Pop-up com a tabela por data da aba: uma linha por data (mais recente primeiro) e o Total no fim.
// colunas = [[título, (linha) => valor]]; a 1ª coluna é a data (à esquerda), as demais números (à direita).
function TabelaPorData({ titulo, colunas, linhas, total, vazio, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><Table2 className="h-4 w-4 text-emerald-600" /> {titulo}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto px-4 pb-4">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-white text-slate-500 uppercase text-[10px] shadow-[0_1px_0_0_#e2e8f0]">
              <tr>{colunas.map(([h], i) => <th key={h} className={`font-bold py-1.5 px-2 border-b border-slate-200 ${i < 1 ? 'text-left' : 'text-right'}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="text-slate-700">
              {linhas.length === 0 && <tr><td colSpan={colunas.length} className="py-6 text-center text-slate-400">{vazio}</td></tr>}
              {[...linhas, ...(linhas.length ? [{ ...total, id: 'Total', data: '' }] : [])].map(l => (
                <tr key={l.id} className={l.id === 'Total' ? 'font-bold bg-slate-50 border-t-2 border-slate-200' : 'border-b border-slate-100'}>
                  {colunas.map(([h, f], i) => <td key={h} className={`py-1 px-2 whitespace-nowrap tabular-nums ${i < 1 ? 'text-left' : 'text-right'}`}>{f(l)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}
const fmtData = (d) => (d ? d.split('-').reverse().join('/') : 'Total')
const taxa = (a, b) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—')
const PASSIVOS_TIPOS = ['Receptivo', 'Presencial', 'Internet']
const somaTotal = (oses) => oses.reduce((t, o) => t + (o.total || 0), 0)

// O.S. veio de agendamento = a O.S. (empresa + número) está no ROF037 — o ROF037 é a fonte padrão dos
// agendamentos em todas as abas (a coluna Agendador do ROF001 não é mais usada).
const veioDeAgendamento = (o) => o.fonte_tipo_agendamento === 'ROF037'

// Contagens da aba Por Data da O.S. (cards e tabela por data de abertura).
function resumoPassagens(oses) {
  const agend = oses.filter(veioDeAgendamento)
  return {
    passagens: oses.length,
    agendadas: agend.length,
    ativos: oses.filter(o => o.tipo_agendamento === 'Ativo').length,
    passivos: oses.filter(o => PASSIVOS_TIPOS.includes(o.tipo_agendamento)).length,
    faturamento: somaTotal(agend),
  }
}

// Contagens da aba Por Data Agendamento (cards e tabela por data do agendamento). `lista` já traz o desfecho.
function resumoAgendamentos(lista) {
  const conta = (f) => lista.filter(f).length
  const ativo = (a) => a.tipo === 'Ativo'
  const passivo = (a) => PASSIVOS_TIPOS.includes(a.tipo)
  const oses = new Map()
  lista.filter(a => a.desfecho === 'virouOs' && a.osRow).forEach(a => oses.set(`${a.empresa}#${a.os}`, a.osRow))
  return {
    total: lista.length,
    ativos: conta(ativo),
    passivos: conta(passivo),
    virouOs: conta(a => a.desfecho === 'virouOs'),
    virouOsAtivo: conta(a => ativo(a) && a.desfecho === 'virouOs'),
    virouOsPassivo: conta(a => passivo(a) && a.desfecho === 'virouOs'),
    noShow: conta(a => a.desfecho === 'noShow'),
    aExecutar: conta(a => a.desfecho === 'aExecutar'),
    osGeradas: oses.size,
    faturamento: somaTotal([...oses.values()]),
  }
}

// Cada atendimento da campanha continua uma linha (o veículo aparece quantas vezes foi distribuído), mas cada
// agendamento do ROF037 conta UMA vez: fica na 1ª campanha do veículo (data mais antiga). As outras linhas do
// mesmo veículo com o mesmo agendamento ficam como NÃO agendadas (com o motivo do RCR017 delas);
// agendamento_repetido + repetido_de guardam o agendamento e a campanha onde ele contou, p/ a conferência.
function agendamentoUmaVez(rows) {
  const vistos = new Map() // veículo + agendamento → linha onde contou
  return [...rows]
    .sort((a, b) => a.data.localeCompare(b.data) || a.id_campanha_execucao - b.id_campanha_execucao)
    .map(r => {
      if (!r.agendamento) return r
      const k = `${r.chassi.toUpperCase()}#${r.id_cliente}#${r.agendamento.criado}#${r.agendamento.data_agendamento}`
      const primeira = vistos.get(k)
      if (!primeira) { vistos.set(k, r); return r }
      return { ...r, agendamento: null, agendamento_repetido: r.agendamento, repetido_de: primeira }
    })
}

// Contagens das campanhas (cards da aba Por Campanhas e tabela por campanha) — regras no manual.
// rows = atendimentos já passados por agendamentoUmaVez.
function resumoContatos(rows) {
  const n = {
    campanhas: new Set(rows.map(r => r.id_campanha_execucao)).size,
    contatos: rows.length,
    agendados: rows.filter(r => r.agendamento).length,
    osAberta: 0, programados: 0, noShow: 0,
    encerrados: 0, faltaContatar: 0, emAndamento: 0, // emAndamento = parte do Contatos a realizar que já teve contato sem resultado
    motivos: {}, // motivo de encerramento → não agendados
  }
  n.naoAgendados = n.contatos - n.agendados
  rows.forEach(r => {
    const k = situacaoDe(r.agendamento); if (k) n[k]++
    if (r.agendamento) return
    if (r.contato_realizado) {
      n.encerrados++
      // Um motivo por cliente: o do contato mais recente. Sem motivo = registrou agendamento ("Serviços:") no CRM,
      // mas não há agendamento Ativo no ROF037 dentro da regra.
      const m = r.motivo_final || 'Agendamento no CRM sem Ativo no ROF037'
      n.motivos[m] = (n.motivos[m] || 0) + 1
    } else {
      n.faltaContatar++
      if (r.contato_registrado) n.emAndamento++
    }
  })
  return n
}

// Lista dos não agendados que faltam contatar (abaixo do card Contatos a realizar), da campanha mais antiga para a mais recente.
function TabelaFaltaContatar({ rows, carregando, info }) {
  const lista = rows.filter(r => !r.agendamento && !r.contato_realizado)
    .sort((a, b) => a.data.localeCompare(b.data) || a.id_campanha_execucao - b.id_campanha_execucao || a.cliente.localeCompare(b.cliente, 'pt-BR'))
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo="Contatos a realizar" info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight mb-2 pr-5">Contatos a realizar ({lista.length.toLocaleString('pt-BR')})</p>
      {carregando ? <p className="text-[11px] text-slate-400">...</p> : !lista.length ? <p className="text-[11px] text-slate-400">Nenhum contato a realizar no período.</p> : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-slate-500 border-b border-slate-200">
                {['Data da campanha', 'Campanha', 'Atendimento', 'Cliente', 'Chassi', 'Contato', 'Próximo contato'].map(h => <th key={h} className="text-left font-semibold py-1 pr-3 whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {lista.map((r, i) => (
                <tr key={`${r.id_campanha_execucao}#${r.id_atendimento ?? r.id_cliente}#${i}`} className="border-b border-slate-100 text-slate-700">
                  <td className="py-1 pr-3 whitespace-nowrap">{fmtData(r.data)}</td>
                  <td className="py-1 pr-3">{r.id_campanha_execucao}</td>
                  <td className="py-1 pr-3">{r.id_atendimento ?? '—'}</td>
                  <td className="py-1 pr-3">{r.cliente}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{r.chassi}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{r.contato_registrado ? 'Já contatado, sem resultado' : 'Sem contato'}</td>
                  <td className="py-1 pr-3 whitespace-nowrap">{r.contato_ultimo ? fmtData(r.contato_ultimo) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Consulta de agendamentos (aba Por Data Agendamento): um agendamento do ROF037 por linha, com filtros e Excel.
const PASSIVOS_CONSULTA = ['Receptivo', 'Presencial', 'Internet']
const COLUNAS_CONSULTA = [
  ['Data agendada', a => fmtData(a.data)],
  ['Criado em', a => (a.criado ? fmtData(a.criado) : '')],
  ['Empresa', a => a.empresa],
  ['Cód. cliente', a => a.cod_cliente ?? ''],
  ['Cliente', a => a.cliente],
  ['Chassi', a => a.chassi],
  ['Placa', a => a.placa],
  ['Modelo', a => a.modelo],
  ['Tipo', a => a.tipo],
  ['Agendador', a => a.agendador],
  ['Status', a => a.status],
  ['Desfecho', a => a.desfecho],
  ['O.S.', a => a.os ?? ''],
  ['Abertura da O.S.', a => (a.data_abertura ? fmtData(a.data_abertura) : '')],
  ['Serviço (OficinaServico_TMODes)', a => (a.servicos || []).join(' / ')],
  ['Nº de serviços', a => (a.servicos || []).length || ''],
  ['Observação', a => a.obs],
  ['Cancelado em', a => (a.data_cancelamento ? fmtData(a.data_cancelamento) : '')],
  ['Motivo do cancelamento', a => a.motivo_cancelamento],
  ['Veio de campanha?', a => (a.tipo !== 'Ativo' ? '' : a.campanhas.length ? 'Sim' : 'Não')],
  // Um veículo pode estar em mais de uma campanha na janela: lista todas, cada uma com a sua data e os dias.
  ['Campanha(s) (data)', a => a.campanhas.map(c => `${c.id_campanha_execucao} (${fmtData(c.data)})`).join(', ')],
  ['Atendimento(s)', a => a.campanhas.map(c => c.id_atendimento).filter(Boolean).join(', ')],
  ['Dias após a campanha', a => a.campanhas.map(c => diasEntre(c.data, a.criado)).join(', ')],
  ['Nº de campanhas', a => (a.campanhas.length || '')],
]
const FILTROS_CONSULTA = {
  'Todos (sem cancelados)': a => a.status !== 'CAN',
  'Ativos': a => a.status !== 'CAN' && a.tipo === 'Ativo',
  'Ativos de campanha': a => a.status !== 'CAN' && a.tipo === 'Ativo' && a.campanhas.length > 0,
  'Ativos sem campanha': a => a.status !== 'CAN' && a.tipo === 'Ativo' && !a.campanhas.length,
  'Passivos': a => a.status !== 'CAN' && PASSIVOS_CONSULTA.includes(a.tipo),
  'Com mais de um serviço': a => a.status !== 'CAN' && (a.servicos || []).length > 1,
  'Cancelados': a => a.status === 'CAN',
}
// Janela de consulta linha a linha (um registro por linha), com filtros, busca e exportação para Excel.
// colunas = [[título, (linha) => valor]]; filtros = { nome: (linha) => bool } (o 1º é o padrão);
// busca = (linha) => [valores onde procurar]; largas = colunas de texto longo (quebram linha).
function JanelaConsulta({ titulo, lista: todos, carregando, onClose, colunas, filtros, busca: camposBusca, placeholder, aba, arquivo, vazio, largas = [] }) {
  const [filtro, setFiltro] = useState(Object.keys(filtros)[0])
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => {
    const t = busca.trim().toUpperCase()
    return todos.filter(filtros[filtro])
      .filter(a => !t || camposBusca(a).some(v => String(v ?? '').toUpperCase().includes(t)))
  }, [todos, filtros, filtro, busca, camposBusca])
  const exportar = async () => {
    const XLSX = await import('xlsx')
    const ws = XLSX.utils.json_to_sheet(lista.map(a => Object.fromEntries(colunas.map(([h, f]) => [h, f(a)]))))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, aba)
    XLSX.writeFile(wb, `${arquivo} ${filtro} ${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><ListChecks className="h-4 w-4 text-emerald-600" /> {titulo}</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100">
          {Object.entries(filtros).map(([f, fn]) => (
            <button key={f} type="button" onClick={() => setFiltro(f)}
              className={`text-[11px] px-2 py-1 rounded-md border ${filtro === f ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
              {f} ({todos.filter(fn).length.toLocaleString('pt-BR')})
            </button>
          ))}
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={placeholder}
            className="text-[11px] px-2 py-1 rounded-md border border-slate-300 w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
          <button type="button" onClick={exportar} disabled={!lista.length}
            className="ml-auto text-[11px] px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
            <Download className="h-3.5 w-3.5" /> Exportar Excel ({lista.length.toLocaleString('pt-BR')})
          </button>
        </div>
        <div className="overflow-auto px-4 pb-4">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10 bg-white text-slate-500 uppercase text-[10px] shadow-[0_1px_0_0_#e2e8f0]">
              <tr>{colunas.map(([h]) => <th key={h} className="font-bold text-left py-1.5 px-2 border-b border-slate-200 whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="text-slate-700">
              {carregando && <tr><td colSpan={colunas.length} className="py-6 text-center text-slate-400">...</td></tr>}
              {!carregando && !lista.length && <tr><td colSpan={colunas.length} className="py-6 text-center text-slate-400">{vazio}</td></tr>}
              {lista.map((a, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {colunas.map(([h, f]) => <td key={h} className={`py-1 px-2 ${largas.includes(h) ? 'min-w-[16rem]' : 'whitespace-nowrap'}`}>{f(a)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}

const buscaAgend = (a) => [a.cliente, a.chassi, a.placa, a.agendador, a.os, a.cod_cliente]
function ConsultaAgendamentos({ lista, carregando, onClose }) {
  return (
    <JanelaConsulta titulo="Consulta de agendamentos — ROF037" lista={lista} carregando={carregando} onClose={onClose}
      colunas={COLUNAS_CONSULTA} filtros={FILTROS_CONSULTA} busca={buscaAgend} placeholder="Buscar cliente, chassi, placa, agendador, O.S."
      aba="Agendamentos" arquivo="Consulta Agendamentos" vazio="Nenhum agendamento nesse filtro." largas={['Serviço (OficinaServico_TMODes)', 'Observação']} />
  )
}

// Consulta de O.S. (aba Por Data da O.S.): uma O.S. do ROF001 por linha (valores somados de todas as linhas dela),
// com o agendamento do ROF037 quando a O.S. está lá (Empresa + OS Numero = EmpresaNome + OSNumero).
const daRof037 = (o) => o.fonte_tipo_agendamento === 'ROF037'
const COLUNAS_CONSULTA_OS = [
  ['Data de abertura', o => fmtData(o.data)],
  ['Empresa', o => o.empresa],
  ['O.S.', o => o.numero],
  ['Situação', o => o.situacao],
  ['Tipo O.S.', o => o.tipo_os],
  ['Chassi', o => o.chassi],
  ['Consultor', o => o.consultor],
  ['Agendador (ROF001)', o => o.agendador],
  ['Veio de agendamento? (ROF037)', o => (daRof037(o) ? 'Sim' : 'Não')],
  ['Tipo do agendamento', o => (daRof037(o) ? o.tipo_agendamento : '')],
  ['Agendamento criado em', o => (o.agendamento37?.criado ? fmtData(o.agendamento37.criado) : '')],
  ['Estava no agendamento sem ser aberta por ele', o => o.ag_nao_ligado?.motivo || ''],
  ['Agendamento do veículo (não ligado)', o => { const a = o.ag_nao_ligado?.ag; return a ? `${fmtData(a.data)} · ${a.tipo} · ${a.status}${a.os ? ` · O.S. ${a.os}` : ''} · ${a.empresa}` : '' }],
  ['Veio de campanha?', o => (o.tipo_agendamento !== 'Ativo' || !daRof037(o) ? '' : o.campanhas.length ? 'Sim' : 'Não')],
  ['Campanha(s) (data)', o => o.campanhas.map(c => `${c.id_campanha_execucao} (${fmtData(c.data)})`).join(', ')],
  ['Atendimento(s)', o => o.campanhas.map(c => c.id_atendimento).filter(Boolean).join(', ')],
  ['Dias após a campanha', o => (o.agendamento37 ? o.campanhas.map(c => diasEntre(c.data, o.agendamento37.criado)).join(', ') : '')],
  ['Peças', o => fmtBRL(o.produto)],
  ['Serviços', o => fmtBRL(o.servico)],
  ['Desconto', o => fmtBRL(o.desconto)],
  ['Total', o => fmtBRL(o.total)],
]
const FILTROS_CONSULTA_OS = {
  'Todas (sem canceladas)': o => o.situacao !== 'Cancelada',
  'Com agendamento': o => o.situacao !== 'Cancelada' && daRof037(o),
  'Agendamento ativo': o => o.situacao !== 'Cancelada' && daRof037(o) && o.tipo_agendamento === 'Ativo',
  'Agendamento ativo de campanha': o => o.situacao !== 'Cancelada' && daRof037(o) && o.tipo_agendamento === 'Ativo' && o.campanhas.length > 0,
  'Agendamento passivo': o => o.situacao !== 'Cancelada' && daRof037(o) && PASSIVOS_CONSULTA.includes(o.tipo_agendamento),
  'Sem agendamento': o => o.situacao !== 'Cancelada' && !daRof037(o),
  'Estava no agendamento, não aberta por ele': o => !!o.ag_nao_ligado,
  'Pendentes de autorização': o => SITUACOES_PENDENTES.includes(o.situacao),
  'Canceladas': o => o.situacao === 'Cancelada',
}
const buscaOs = (o) => [o.numero, o.chassi, o.consultor, o.agendador, o.empresa, ...o.campanhas.map(c => c.id_campanha_execucao)]
function ConsultaOs({ lista, carregando, onClose }) {
  return (
    <JanelaConsulta titulo="Consulta de O.S. — ROF001 TODAS" lista={lista} carregando={carregando} onClose={onClose}
      colunas={COLUNAS_CONSULTA_OS} filtros={FILTROS_CONSULTA_OS} busca={buscaOs} placeholder="Buscar O.S., chassi, consultor, agendador, empresa, campanha"
      aba="O.S." arquivo="Consulta OS" vazio="Nenhuma O.S. nesse filtro." />
  )
}

// Quadro "Contatos agendados": o que aconteceu com os agendados (comparecidos, a comparecer, não comparecidos),
// no mesmo formato do quadro Motivo de Encerramento. O total é igual ao card Contatos agendados.
function CardContatosAgendados({ numeros, carregando, info }) {
  const total = SITUACAO.reduce((s, d) => s + (numeros[d.chave] || 0), 0)
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo="Contatos agendados" info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight mb-2 pr-5">Contatos agendados</p>
      {carregando ? <p className="text-[11px] text-slate-400">...</p> : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="text-left font-semibold py-1">Situação</th>
              <th className="text-right font-semibold py-1">Qtde</th>
              <th className="text-right font-semibold py-1 w-14">%</th>
            </tr>
          </thead>
          <tbody>
            {SITUACAO.map(d => (
              <tr key={d.chave} className="border-b border-slate-100 text-slate-700">
                <td className="py-1"><span className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle" style={{ backgroundColor: d.cor }} />{d.label}</td>
                <td className="py-1 text-right">{(numeros[d.chave] || 0).toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right">{total ? `${((numeros[d.chave] / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—'}</td>
              </tr>
            ))}
            <tr className="font-bold text-slate-900">
              <td className="py-1">Total</td>
              <td className="py-1 text-right">{total.toLocaleString('pt-BR')}</td>
              <td className="py-1 text-right">{total ? '100%' : '—'}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

// Resumo por motivo de encerramento (RCR017), maior quantidade primeiro.
function CardMotivos({ motivos, carregando, info }) {
  const lista = Object.entries(motivos || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const total = lista.reduce((s, [, q]) => s + q, 0)
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo="Motivo de Encerramento" info={info} />
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight mb-2 pr-5">Motivo de Encerramento</p>
      {carregando ? <p className="text-[11px] text-slate-400">...</p> : !lista.length ? <p className="text-[11px] text-slate-400">Nenhum não agendado com motivo no período.</p> : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-500 border-b border-slate-200">
              <th className="text-left font-semibold py-1">Motivo</th>
              <th className="text-right font-semibold py-1">Qtde</th>
              <th className="text-right font-semibold py-1 w-14">%</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(([m, q]) => (
              <tr key={m} className="border-b border-slate-100 text-slate-700">
                <td className="py-1">{m}</td>
                <td className="py-1 text-right">{q.toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right">{((q / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%</td>
              </tr>
            ))}
            <tr className="font-bold text-slate-900">
              <td className="py-1">Total</td>
              <td className="py-1 text-right">{total.toLocaleString('pt-BR')}</td>
              <td className="py-1 text-right">100%</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}

// Situações de O.S. que pedem atenção (contam como passagem, mas aguardam autorização).
const SITUACOES_PENDENTES = ['Pendente Autorização Cancelamento', 'Pendente de Autorização de Encerramento']

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Período padrão ao abrir: do dia 1 do mês até ontem (se hoje é dia 1, o mês de ontem). O calendário não trava:
// qualquer data (inclusive hoje e futuras) pode ser escolhida.
const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
const DATA_MAX = iso(ontem)
const DATA_MIN = iso(new Date(ontem.getFullYear(), ontem.getMonth(), 1))
// Período ao abrir a tela: o mês atual, do dia 1 até ontem.
const PADRAO_INI = DATA_MIN
const PADRAO_FIM = DATA_MAX
// Visão Período: do começo do ano até ontem.
const INICIO_ANO = iso(new Date(ontem.getFullYear(), 0, 1))

const inputCls = 'w-full text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/40'
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function BiAgendamentoServicos() {
  const { user } = useAuth()
  // Metas dos velocímetros (engrenagem). Sem a tabela ou com erro, ficam as padrão.
  const [metas, setMetas] = useState(METAS_PADRAO)
  const [metasInfo, setMetasInfo] = useState('')
  const [metasAberto, setMetasAberto] = useState(false)
  const lerMetas = () => apiService.getBiAgendamentoMetas()
    .then(linhas => {
      setMetas({ ...METAS_PADRAO, ...Object.fromEntries(linhas.map(l => [l.indicador, Number(l.meta)])) })
      const ultima = linhas.filter(l => l.atualizado_por).sort((a, b) => String(b.atualizado_em).localeCompare(String(a.atualizado_em)))[0]
      setMetasInfo(ultima ? `Última alteração: ${new Date(ultima.atualizado_em).toLocaleString('pt-BR')} por ${ultima.atualizado_por}` : '')
    })
    .catch(() => {})
  useEffect(() => { lerMetas() }, [])
  const salvarMetas = async (novas) => {
    await apiService.saveBiAgendamentoMetas(novas, user?.email)
    await lerMetas()
  }
  const [empresas, setEmpresas] = useState([])
  const [empresasSel, setEmpresasSel] = useState([]) // vazio = todas
  const [crm, setCrm] = useState(null) // { rows, lidoEm } das Campanhas CRM
  const [carregando, setCarregando] = useState(false)
  const [erroCrm, setErroCrm] = useState('')
  const [tipo, setTipo] = useState(TIPOS[0])
  // ?aba=<nome da aba> (ex.: atalho da Matriz KPIs) abre direto nela.
  const [paramsUrl] = useSearchParams()
  const [aba, setAba] = useState(() => (ABAS.includes(paramsUrl.get('aba')) ? paramsUrl.get('aba') : ABAS[0]))

  // Empresas do cadastro (sem as "visuais"), agrupadas por Agrupamento (Motos, Trucks...); só os agrupamentos Motos e Trucks (ex.: "Outras Caiobá" fica de fora).
  useEffect(() => {
    apiService.getEmpresas().then(r => setEmpresas((r || []).filter(empresaSelecionavel))).catch(() => setEmpresas([]))
  }, [])
  const grupos = useMemo(() => {
    const m = {}
    empresas.forEach(e => { if (/moto|truck/i.test(e.agrupamento_nome || '')) (m[e.agrupamento_nome] ||= []).push(e) })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [empresas])

  const [passagensOs, setPassagensOs] = useState(null) // { rows } das O.S. do ano (ROF001 TODAS)
  // Campanhas CRM e O.S. (passagens) são lidas juntas; uma falhar não impede a outra.
  const carregarCrm = async (refresh = false) => {
    setCarregando(true)
    setErroCrm('')
    const ler = async (rota) => {
      const r = await fetch(`${BACKEND_URL}/api/agendamento-crm/${rota}${refresh ? '/refresh' : ''}`, { method: refresh ? 'POST' : 'GET' })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`)
      return r.json()
    }
    try {
      const [camp, os] = await Promise.allSettled([ler('campanhas'), ler('passagens')])
      if (camp.status === 'fulfilled') setCrm(camp.value)
      if (os.status === 'fulfilled') setPassagensOs(os.value)
      const erros = [camp.status === 'rejected' && `Campanhas CRM: ${camp.reason.message}`, os.status === 'rejected' && `O.S.: ${os.reason.message}`].filter(Boolean)
      if (erros.length) setErroCrm(`Não foi possível ler ${erros.join(' · ')}`)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregarCrm() }, [])

  const [dataIni, setDataIni] = useState(PADRAO_INI)
  const [dataFim, setDataFim] = useState(PADRAO_FIM)
  // Setas ‹ ›: mês inteiro anterior/seguinte (no mês atual, até ontem, como ao abrir).
  const trocarMes = (passo) => {
    const [a, m] = dataIni.split('-').map(Number)
    const ini = iso(new Date(a, m - 1 + passo, 1))
    setDataIni(ini)
    setDataFim(ini === DATA_MIN ? DATA_MAX : iso(new Date(a, m + passo, 0)))
  }
  // Ao trocar de aba o período escolhido continua o mesmo (só a Visão Período, escondida, usa o ano até ontem).
  // Contatos das campanhas dentro do período (data do arquivo) e das empresas selecionadas.
  // Aba Por Campanhas sem filtro de Empresas: o relatório da campanha (RCR038) não identifica a empresa
  // (a sigla no nome do arquivo não é confiável — há campanhas exportadas com sigla de outra unidade).
  const contatosFiltrados = useMemo(() => {
    if (!crm) return []
    return agendamentoUmaVez(crm.rows.filter(r => r.data && r.data >= dataIni && r.data <= dataFim))
  }, [crm, dataIni, dataFim])
  const numeros = resumoContatos(contatosFiltrados)
  // Tabela "Campanhas por data de geração" (ícone na linha do subtítulo): mesmas regras dos cards, por campanha.
  const [tabela, setTabela] = useState(null) // 'campanhas' | 'agendamentos' | 'passagens' (pop-up da tabela por data)
  const linhasCampanhas = useMemo(() => {
    const m = new Map()
    // Uma linha por data de geração (todas as unidades e campanhas do dia juntas).
    contatosFiltrados.forEach(r => { const k = r.data; (m.get(k) || m.set(k, []).get(k)).push(r) })
    return [...m.entries()].map(([data, rows]) => ({ id: data, data, ...resumoContatos(rows) }))
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [contatosFiltrados])
  // Velocímetros com fonte: o valor sai de "numeros"; os demais seguem null (—).
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null)
  const valorGauge = {
    taxaAgendamento: crm ? pct(numeros.agendados, numeros.contatos) : null,
    taxaConversao: crm ? pct(numeros.osAberta, numeros.agendados) : null,
    taxaNoShow: crm ? pct(numeros.noShow, numeros.agendados) : null,
  }
  const gauge = (g) => ({ ...g, meta: metas[g.chave] ?? g.meta, valor: g.chave ? valorGauge[g.chave] ?? null : g.valor })

  // Passagens = O.S. abertas no período (Data Criacao), menos as "Cancelada"; empresa do arquivo casada
  // com o cadastro pelo nome fantasia sem acento (ex: "CAIOBA TRUCKS - CHAPADAO" = "CAIOBÁ TRUCKS - CHAPADÃO").
  const osDoPeriodo = useMemo(() => {
    if (!passagensOs) return null
    const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
    const nomesSel = empresasSel.length
      ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => norm(e.empresa_fantasia || e.nome_empresa)))
      : null
    return passagensOs.rows.filter(o => o.data >= dataIni && o.data <= dataFim && o.situacao !== 'Cancelada'
      && (!nomesSel || nomesSel.has(norm(o.empresa))))
      // Tipo (Ativo × Passivo) só do ROF037.
      .map(o => (o.fonte_tipo_agendamento === 'ROF037' ? o : { ...o, tipo_agendamento: '' }))
  }, [passagensOs, empresas, empresasSel, dataIni, dataFim])
  // Consulta de O.S.: as mesmas O.S. do período e empresas, inclusive as "Cancelada" (filtro próprio na janela).
  const consultaOs = useMemo(() => {
    if (!passagensOs) return []
    const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
    const nomesSel = empresasSel.length
      ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => norm(e.empresa_fantasia || e.nome_empresa)))
      : null
    return passagensOs.rows.filter(o => o.data >= dataIni && o.data <= dataFim && (!nomesSel || nomesSel.has(norm(o.empresa))))
      .sort((a, b) => a.data.localeCompare(b.data) || a.empresa.localeCompare(b.empresa) || String(a.numero).localeCompare(String(b.numero), undefined, { numeric: true }))
  }, [passagensOs, empresas, empresasSel, dataIni, dataFim])
  const passagens = osDoPeriodo ? osDoPeriodo.length : null
  const osAgendadas = osDoPeriodo ? osDoPeriodo.filter(veioDeAgendamento) : null
  const passagensAgendadas = osAgendadas ? osAgendadas.length : null
  // Conversão: Total × Ativos × Passivos.
  const PASSIVOS = ['Receptivo', 'Presencial', 'Internet']
  const osAtivas = osAgendadas ? osAgendadas.filter(o => o.tipo_agendamento === 'Ativo') : null
  const osPassivas = osAgendadas ? osAgendadas.filter(o => PASSIVOS.includes(o.tipo_agendamento)) : null
  // Tipo do agendamento (só ROF037): Ativo × Receptivo (Presencial e Internet contam como Receptivo).
  const agAtivos = osDoPeriodo ? osDoPeriodo.filter(o => o.tipo_agendamento === 'Ativo').length : null
  const agReceptivos = osDoPeriodo ? osDoPeriodo.filter(o => ['Receptivo', 'Presencial', 'Internet'].includes(o.tipo_agendamento)).length : null
  // Velocímetros da aba Passagens: tudo sobre as passagens (ativo + passivo = taxa de agendamento, fora os sem tipo).
  const pctPass = (n) => (passagens ? Math.round((n / passagens) * 100) : null)
  // O.S. que estava no agendamento mas não foi aberta por ele: a O.S. NÃO está no ROF037, mas o veículo (chassi) tinha
  // agendamento no ROF037 (sem CAN) perto da abertura: A) no mesmo dia o agendamento abriu outra O.S. (2ª O.S. da mesma
  // visita); B) agendamento no mesmo dia sem ligação com esta O.S.; C) agendamento sem O.S. (no-show/em aberto) nos 30 dias
  // antes e o veículo veio depois sem agendar. Card, velocímetro e filtro da Consulta de O.S. usam esta mesma regra.
  const agendamentoNaoLigadoDe = useMemo(() => {
    const agPorChassi = new Map()
    ;(passagensOs?.agendamentos || []).forEach(a => { if (a.fonte === 'ROF037' && a.chassi && a.status !== 'CAN') (agPorChassi.get(a.chassi) || agPorChassi.set(a.chassi, []).get(a.chassi)).push(a) })
    return (o) => {
      if (daRof037(o) || o.situacao === 'Cancelada') return null
      const lista = agPorChassi.get(String(o.chassi || '').toUpperCase()) || []
      const mesmoDia = lista.filter(a => a.data === o.data)
      const outraOs = mesmoDia.find(a => a.os && String(a.os) !== String(o.numero))
      if (outraOs) return { motivo: '2ª O.S. da mesma visita (o agendamento abriu outra O.S.)', ag: outraOs }
      if (mesmoDia.length) return { motivo: 'Agendamento no mesmo dia, sem ligação com esta O.S.', ag: mesmoDia[0] }
      const antes = lista.filter(a => !a.os && a.data < o.data && diasEntre(a.data, o.data) <= 30).sort((x, y) => y.data.localeCompare(x.data))
      if (antes.length) return { motivo: 'Agendamento sem O.S. nos 30 dias antes (no-show/em aberto); veio depois sem agendar', ag: antes[0] }
      return null
    }
  }, [passagensOs])
  const osAgNaoLigado = osDoPeriodo ? osDoPeriodo.filter(o => agendamentoNaoLigadoDe(o)).length : null
  const gaugesGeral = [
    { label: 'Taxa de Agendamento', valor: pctPass(passagensAgendadas), meta: metas.gaugeAgendamentoOs, info: INFO.gaugeAgendamentoOs },
    { label: 'Taxa de Agendamento Ativo', valor: pctPass(agAtivos), meta: metas.gaugeAtivo, info: INFO.gaugeAtivo },
    { label: 'Taxa de Agendamento Passivo', valor: pctPass(agReceptivos), meta: metas.gaugePassivo, info: INFO.gaugePassivo },
    { label: 'Taxa de O.S. fora do Agendamento', valor: osAgNaoLigado === null ? null : pctPass(osAgNaoLigado), meta: metas.gaugeAgNaoLigado, menorMelhor: true, info: INFO.gaugeAgNaoLigado },
  ]
  // O.S. pendentes de autorização (cancelamento/encerramento) entre as passagens: alerta no card.
  const osPendentes = (osDoPeriodo || []).filter(o => SITUACOES_PENDENTES.includes(o.situacao))
  // Aba Por Data Agendamento: agendamentos com DATA DO AGENDAMENTO no período — só do ROF037 (fonte única dos agendamentos;
  // nesta aba; segue usado só pra tipar as O.S. da aba Passagens), sem os cancelados (CAN)
  // e o desfecho de cada um, só pelo ROF037: comparecido (tem nº de O.S.), no-show (NSW) ou a comparecer.
  const osPorChave = useMemo(() => new Map((passagensOs?.rows || []).map(o => [`${o.empresa.toUpperCase()}#${o.numero}`, o])), [passagensOs])
  const agendDoPeriodo = useMemo(() => {
    if (!passagensOs?.agendamentos) return null
    const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
    const nomesSel = empresasSel.length
      ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => norm(e.empresa_fantasia || e.nome_empresa)))
      : null
    return passagensOs.agendamentos
      .filter(a => a.fonte === 'ROF037' && a.data && a.data >= dataIni && a.data <= dataFim && a.status !== 'CAN' && (!nomesSel || nomesSel.has(norm(a.empresa))))
      .map(a => {
        const os = a.os ? osPorChave.get(`${a.empresa}#${a.os}`) : null
        const desfecho = a.os ? 'virouOs' : a.status === 'NSW' ? 'noShow' : 'aExecutar'
        return { ...a, osRow: os || null, desfecho }
      })
  }, [passagensOs, osPorChave, empresas, empresasSel, dataIni, dataFim])
  // Consulta de agendamentos (ROF037): todos os agendamentos com data no período e nas empresas escolhidas,
  // inclusive cancelados, e se o Ativo veio de campanha (mesma regra da aba Por Campanhas, ao contrário:
  // chassi + cliente num RCR038 e agendamento criado da data da campanha até 30 dias depois).
  const campanhasPorVeiculo = useMemo(() => {
    const m = new Map()
    ;(crm?.rows || []).forEach(r => { if (!r.data) return; const k = `${r.chassi.toUpperCase()}#${r.id_cliente}`; (m.get(k) || m.set(k, []).get(k)).push(r) })
    return m
  }, [crm])
  // Consulta de O.S. com a campanha: O.S. → agendamento do ROF037 (EmpresaNome + OSNumero) → se Ativo, campanha
  // pelo Chassi + cliente do agendamento num RCR038, criado da data da campanha até 30 dias depois.
  const consultaOsCampanha = useMemo(() => {
    const agPorOs = new Map((passagensOs?.agendamentos || []).filter(a => a.fonte === 'ROF037' && a.os).map(a => [`${a.empresa}#${a.os}`, a]))
    return consultaOs.map(o => {
      const ag = agPorOs.get(`${o.empresa.toUpperCase()}#${o.numero}`)
      const campanhas = ag && ag.tipo === 'Ativo' && ag.criado
        ? (campanhasPorVeiculo.get(`${ag.chassi}#${ag.cod_cliente}`) || []).filter(c => ag.criado >= c.data && diasEntre(c.data, ag.criado) <= 30).sort((x, y) => x.data.localeCompare(y.data))
        : []
      return { ...o, agendamento37: ag || null, campanhas, ag_nao_ligado: agendamentoNaoLigadoDe(o) }
    })
  }, [consultaOs, passagensOs, campanhasPorVeiculo, agendamentoNaoLigadoDe])
  const consultaAgend = useMemo(() => {
    if (!passagensOs?.agendamentos) return []
    const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
    const nomesSel = empresasSel.length
      ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => norm(e.empresa_fantasia || e.nome_empresa)))
      : null
    return passagensOs.agendamentos
      .filter(a => a.fonte === 'ROF037' && a.data && a.data >= dataIni && a.data <= dataFim && (!nomesSel || nomesSel.has(norm(a.empresa))))
      .map(a => {
        const camps = a.tipo === 'Ativo' && a.criado
          ? (campanhasPorVeiculo.get(`${a.chassi}#${a.cod_cliente}`) || []).filter(c => a.criado >= c.data && diasEntre(c.data, a.criado) <= 30).sort((x, y) => x.data.localeCompare(y.data))
          : []
        return { ...a, campanhas: camps, desfecho: a.status === 'CAN' ? 'Cancelado' : a.os ? 'Comparecido' : a.status === 'NSW' ? 'No-show' : 'A comparecer' }
      })
      .sort((x, y) => x.data.localeCompare(y.data) || x.cliente.localeCompare(y.cliente, 'pt-BR'))
  }, [passagensOs, campanhasPorVeiculo, empresas, empresasSel, dataIni, dataFim])
  const ehAtivo = (a) => a.tipo === 'Ativo'
  const ehPassivo = (a) => PASSIVOS.includes(a.tipo)
  const contaAg = (f) => (agendDoPeriodo ? agendDoPeriodo.filter(f).length : null)
  const ag = {
    total: contaAg(() => true),
    ativos: contaAg(ehAtivo),
    passivos: contaAg(ehPassivo),
    virouOs: contaAg(a => a.desfecho === 'virouOs'),
    noShow: contaAg(a => a.desfecho === 'noShow'),
    aExecutar: contaAg(a => a.desfecho === 'aExecutar'),
  }
  const pctAg = (n, base) => (base ? Math.round((n / base) * 100) : null)
  const gaugesAgend = [
    { label: 'Taxa de Agendamento', valor: pctAg(ag.virouOs, ag.total), meta: metas.agTaxaConversao, info: INFO.agTaxaConversao },
    { label: 'Taxa de Agendamento Ativo', valor: pctAg(contaAg(a => ehAtivo(a) && a.desfecho === 'virouOs'), ag.ativos), meta: metas.agTaxaConversaoAtivo, info: INFO.agTaxaConversaoAtivo },
    { label: 'Taxa de Agendamento Passivo', valor: pctAg(contaAg(a => ehPassivo(a) && a.desfecho === 'virouOs'), ag.passivos), meta: metas.agTaxaConversaoPassivo, info: INFO.agTaxaConversaoPassivo },
    { label: 'Taxa de No-show', valor: pctAg(ag.noShow, ag.total), meta: metas.agTaxaNoShow, menorMelhor: true, info: INFO.agTaxaNoShow },
  ]
  // Valores da conversão: as O.S. (sem repetir) dos agendamentos que viraram O.S.
  // Linhas por data. crescente = da data mais antiga para a mais recente (padrão: mais recente primeiro).
  const porData = (lista, resumo, crescente = false) => {
    if (!lista) return []
    const m = new Map()
    lista.forEach(x => { (m.get(x.data) || m.set(x.data, []).get(x.data)).push(x) })
    return [...m.entries()].map(([data, l]) => ({ id: data, data, ...resumo(l) }))
      .sort((a, b) => (crescente ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data)))
  }
  const osDosAgend = (f) => {
    if (!agendDoPeriodo) return null
    const m = new Map()
    agendDoPeriodo.filter(a => a.desfecho === 'virouOs' && a.osRow && f(a)).forEach(a => m.set(`${a.empresa}#${a.os}`, a.osRow))
    return [...m.values()]
  }
  const [alertaPendentes, setAlertaPendentes] = useState(false)
  const [filtroPendente, setFiltroPendente] = useState(null) // situação clicada na janela (null = todas)

  const trocarAba = (a) => {
    setAba(a)
    if (a === VISAO_PERIODO) { setDataIni(INICIO_ANO); setDataFim(DATA_MAX) }
  }

  // Linha de cards de KPI e linha de velocímetros da aba Campanhas.
  const blocoCards = (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {KPIS.map(k => (
        <CardKpi key={k.label} label={k.label} info={INFO[k.chave]}
          valor={k.chave ? (carregando && !crm ? '...' : numeros[k.chave].toLocaleString('pt-BR')) : (k.valor ?? '—')} />
      ))}
    </div>
  )
  const blocoGauges = (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {GAUGES.map(g => <GaugeMeta key={g.label} {...gauge(g)} />)}
    </div>
  )

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS (mesmo modelo de Possibilidades, em verde) */}
      {/* Sem overflow-hidden: cortava a lista do seletor de empresas. O degradê leva o próprio arredondamento. */}
      <div className="relative z-10 rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-emerald-100 via-green-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-stretch justify-between gap-4 p-5">
          {/* self-start: título no topo, na linha da "Última atualização" (como no Possibilidades) */}
          <div className="flex items-center gap-3 self-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Mesa de Agendamento</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Agendamento de Serviços — Pós-Venda</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 leading-tight">
                Última atualização: <strong className="text-slate-700">{carregando ? '...' : crm?.lidoEm ? fmtDataHora(new Date(crm.lidoEm)) : '—'}</strong>
              </p>
              <button
                type="button"
                onClick={() => carregarCrm(true)}
                disabled={carregando}
                title="Atualizar dados"
                aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              {/* Engrenagem: metas dos indicadores (velocímetros). */}
              <button type="button" onClick={() => setMetasAberto(true)} title="Metas dos indicadores" aria-label="Metas dos indicadores"
                className="flex items-center justify-center p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors">
                <Settings className="h-3.5 w-3.5" />
              </button>
              {/* Manual operacional: página própria, sempre em outra aba (mesmo padrão do BI Planos de Manutenção). */}
              <a href="/bi/agendamento-servicos/manual" target="_blank" rel="noopener noreferrer"
                title="Manual operacional do BI (abre em outra aba)" aria-label="Manual operacional do BI"
                className="flex items-center justify-center p-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
              </a>
            </div>
            {erroCrm && <p className="text-[10px] text-red-600 max-w-[420px] text-right leading-tight">{erroCrm}</p>}
            <div className="flex flex-wrap items-end gap-4">
              {/* Na aba Por Campanhas não há seletor de Empresas (o RCR038 não identifica a empresa). */}
              {aba !== ABA_CAMPANHAS && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas</label>
                <SeletorEmpresas grupos={grupos} selecionadas={empresasSel} onChange={setEmpresasSel} />
              </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" className={inputCls.replace("w-full ", "")} max={dataFim} value={dataIni} onChange={e => e.target.value && setDataIni(e.target.value)} />
                  <span className="text-slate-400 text-xs">até</span>
                  <input type="date" className={inputCls.replace("w-full ", "")} min={dataIni} value={dataFim} onChange={e => e.target.value && setDataFim(e.target.value)} />
                  <button type="button" onClick={() => trocarMes(-1)} title="Mês anterior" aria-label="Mês anterior"
                    className="p-1 rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => trocarMes(1)} title="Próximo mês" aria-label="Próximo mês"
                    className="p-1 rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abas à esquerda; na mesma linha, à direita, os ícones da aba (conferência/consulta e tabela por data). */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {ABAS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => trocarAba(a)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === a ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
        {aba === ABA_CAMPANHAS && (
          <IconesAba onConferencia={crm ? () => setTabela('conferencia') : null} tituloConferencia="Conferência linha a linha"
            onTabela={() => setTabela('campanhas')} tituloTabela="Campanhas por data de geração" />
        )}
        {aba === ABA_AGENDAMENTOS && (
          <IconesAba onConferencia={() => setTabela('consultaAgend')} tituloConferencia="Consulta de agendamentos (ROF037)"
            onTabela={() => setTabela('agendamentos')} tituloTabela="Agendamentos por data do agendamento" />
        )}
        {aba === ABA_PASSAGENS && (
          <IconesAba onConferencia={() => setTabela('consultaOs')} tituloConferencia="Consulta de O.S. (ROF001 TODAS)"
            onTabela={() => setTabela('passagens')} tituloTabela="Passagens por data de abertura" />
        )}
      </div>
      {/* Objetivo da aba (mesmo texto do manual). */}
      {OBJETIVO_ABAS[aba] && <p className="text-[11px] text-slate-300 leading-snug max-w-4xl -mt-2">{OBJETIVO_ABAS[aba]}</p>}

      {/* Tipo de Agendamentos: só na Visão Período. */}
      {aba === VISAO_PERIODO && (
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1 w-fit">
          <label className="text-[10px] font-bold text-slate-300 uppercase">Tipo de Agendamentos</label>
          <select className={inputCls.replace('w-full ', '')} value={tipo} onChange={e => setTipo(e.target.value)}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      )}

      {/* Aba Passagens: O.S. abertas no período e quantas vieram de agendamento. */}
      {aba === ABA_AGENDAMENTOS ? (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gaugesAgend.map(g => <GaugeMeta key={g.label} {...g} />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            ['Agendamentos realizados', ag.total, INFO.agTotal],
            ['Agendamentos ativos', ag.ativos, INFO.agAtivosAgenda],
            ['Agendamentos passivos', ag.passivos, INFO.agPassivosAgenda],
          ].map(([label, v, info]) => (
            <CardKpi key={label} label={label} info={info} valor={carregando && v === null ? '...' : v === null ? '—' : v.toLocaleString('pt-BR')} />
          ))}
          <CardKpi label="Agendamentos comparecidos" info={INFO.agVirouOs} cor="#059669"
            valor={carregando && ag.virouOs === null ? '...' : ag.virouOs === null ? '—' : ag.virouOs.toLocaleString('pt-BR')} />
          <CardKpi label="Agendamentos a comparecer" info={INFO.agAExecutar} cor="#3b82f6"
            valor={carregando && ag.aExecutar === null ? '...' : ag.aExecutar === null ? '—' : ag.aExecutar.toLocaleString('pt-BR')} />
          <CardKpi label="Agendamentos Não comparecidos (No-Show)" info={INFO.agNoShow} cor="#dc2626"
            valor={carregando && ag.noShow === null ? '...' : ag.noShow === null ? '—' : ag.noShow.toLocaleString('pt-BR')} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CardConversao titulo="Conversão — Total" oses={osDosAgend(() => true)} carregando={carregando} info={INFO.agConversaoTotal} />
          <CardConversao titulo="Conversão — Ativos" oses={osDosAgend(ehAtivo)} carregando={carregando} info={INFO.agConversaoAtivos} />
          <CardConversao titulo="Conversão — Passivos" oses={osDosAgend(ehPassivo)} carregando={carregando} info={INFO.agConversaoPassivos} />
        </div>
        </>
      ) : aba === ABA_PASSAGENS ? (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gaugesGeral.map(g => <GaugeMeta key={g.label} {...g} />)}
        </div>
        {/* 5 cards ocupando a largura toda. */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <CardKpi label="Quant. O.S. por data de abertura" info={INFO.osAbertura}
            valor={carregando && passagens === null ? '...' : passagens === null ? '—' : passagens.toLocaleString('pt-BR')}
            extra={osPendentes.length > 0 && (
              <button type="button" onClick={() => { setFiltroPendente(null); setAlertaPendentes(true) }} title="O.S. pendentes de autorização"
                className="self-start mr-4 flex items-center gap-1 px-1.5 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 text-[11px] font-bold">
                <AlertTriangle className="h-3.5 w-3.5" /> {osPendentes.length}
              </button>
            )} />
          <CardKpi label="O.S. com agendamento" info={INFO.osAgendamento}
            valor={carregando && passagensAgendadas === null ? '...' : passagensAgendadas === null ? '—' : passagensAgendadas.toLocaleString('pt-BR')} />
          <CardKpi label="Agendamentos ativos" info={INFO.agAtivos}
            valor={carregando && agAtivos === null ? '...' : agAtivos === null ? '—' : agAtivos.toLocaleString('pt-BR')} />
          <CardKpi label="Agendamentos passivos" info={INFO.agPassivos}
            valor={carregando && agReceptivos === null ? '...' : agReceptivos === null ? '—' : agReceptivos.toLocaleString('pt-BR')} />
          <CardKpi label="O.S. estava no agendamento, não aberta por ele" info={INFO.osAgNaoLigado}
            valor={carregando && osAgNaoLigado === null ? '...' : osAgNaoLigado === null ? '—' : osAgNaoLigado.toLocaleString('pt-BR')} />
        </div>

        {/* Conversão total, depois só das ativas e só das passivas. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <CardConversao titulo="Conversão — Total" oses={osAgendadas} carregando={carregando} info={INFO.conversaoTotal} />
          <CardConversao titulo="Conversão — Ativos" oses={osAtivas} carregando={carregando} info={INFO.conversaoAtivos} />
          <CardConversao titulo="Conversão — Passivos" oses={osPassivas} carregando={carregando} info={INFO.conversaoPassivos} />
        </div>
        </>
      ) : (
      <>
      {/* Subtítulo de seção (Campanhas e Visão Período). */}

      {aba === VISAO_PERIODO ? (
        <div className="space-y-3">
          <CardGrafico titulo="Evolução da Taxa de Agendamento" info={INFO.evolucaoTaxa} vazio={EVOLUCAO.every(e => e.taxa === null)}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={EVOLUCAO} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} unit="%" />
                <Tooltip formatter={v => [`${v}%`, 'Taxa de Agendamento']} contentStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="taxa" stroke="#059669" strokeWidth={2.5} dot={{ r: 3.5, fill: '#059669' }}>
                  <LabelList dataKey="taxa" position="top" offset={10} style={{ fontSize: 11, fill: '#475569' }} formatter={v => `${v}%`} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </CardGrafico>
          <CardGrafico titulo="Evolução do Faturamento Convertido" info={INFO.evolucaoFaturamento} vazio={EVOLUCAO.every(e => e.faturamento === null)}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EVOLUCAO} margin={{ top: 20, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="mes" tick={eixo} axisLine={false} tickLine={false} />
                <YAxis tick={eixo} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000} mil`} />
                <Tooltip formatter={v => [fmtBRL(v), 'Faturamento convertido']} contentStyle={{ fontSize: 11 }} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="faturamento" fill="#059669" radius={[3, 3, 0, 0]}>
                  <LabelList dataKey="faturamento" position="top" style={{ fontSize: 10, fill: '#475569' }} formatter={fmtMil} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardGrafico>
        </div>
      ) : (
      <>
      {blocoGauges}
      {blocoCards}

      {/* À esquerda, o que aconteceu com os agendados (comparecidos, a comparecer, não comparecidos);
          à direita, Motivo de Encerramento (motivo dos Contatos encerrados, RCR017). */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <CardContatosAgendados numeros={numeros} carregando={carregando && !crm} info={INFO.quadroAgendados} />
        <CardMotivos motivos={numeros.motivos} carregando={carregando && !crm} info={INFO.motivos} />
      </div>
      <TabelaFaltaContatar rows={contatosFiltrados} carregando={carregando && !crm} info={INFO.listaFaltaContatar} />

      </>
      )}
      </>
      )}

      {metasAberto && <JanelaMetas metas={metas} info={metasInfo} onSalvar={salvarMetas} onClose={() => setMetasAberto(false)} />}
      {tabela === 'conferencia' &&<ConferenciaCampanhas rows={contatosFiltrados} onClose={() => setTabela(null)} />}
      {tabela === 'consultaOs' && <ConsultaOs lista={consultaOsCampanha} carregando={carregando && !passagensOs} onClose={() => setTabela(null)} />}
      {tabela === 'consultaAgend' && <ConsultaAgendamentos lista={consultaAgend} carregando={carregando && !passagensOs} onClose={() => setTabela(null)} />}
      {tabela === 'campanhas' && (
        <TabelaPorData titulo="Campanhas por data de geração" linhas={linhasCampanhas} total={numeros} vazio="Nenhuma campanha no período." onClose={() => setTabela(null)}
          colunas={[
            ['Data de geração', l => fmtData(l.data)],
            ['Campanhas geradas', l => l.campanhas],
            ['Contatos gerados', l => l.contatos],
            ['Contatos agendados', l => l.agendados],
            ['Contatos encerrados', l => l.encerrados],
            ['Contato a realizar', l => l.faltaContatar],
            ['Agendamentos comparecidos', l => l.osAberta],
            ['Agendamentos a comparecer', l => l.programados],
            ['Agendamentos não comparecidos (No-show)', l => l.noShow],
            ['Taxa de Agendamento', l => taxa(l.agendados, l.contatos)],
            ['Taxa de Conversão', l => taxa(l.osAberta, l.agendados)],
            ['Taxa de No-show', l => taxa(l.noShow, l.agendados)],
          ]} />
      )}
      {tabela === 'agendamentos' && (
        <TabelaPorData titulo="Agendamentos por data do agendamento" linhas={porData(agendDoPeriodo, resumoAgendamentos, true)}
          total={resumoAgendamentos(agendDoPeriodo || [])} vazio="Nenhum agendamento no período." onClose={() => setTabela(null)}
          colunas={[
            ['Data do agendamento', l => fmtData(l.data)],
            ['Agendamentos', l => l.total],
            ['Ativos', l => l.ativos],
            ['Passivos', l => l.passivos],
            ['Agendamentos comparecidos', l => l.virouOs],
            ['Agendamentos a comparecer', l => l.aExecutar],
            ['Agendamentos Não comparecidos (No-Show)', l => l.noShow],
            ['Taxa de Agendamento', l => taxa(l.virouOs, l.total)],
            ['Taxa de Agendamento Ativo', l => taxa(l.virouOsAtivo, l.ativos)],
            ['Taxa de Agendamento Passivo', l => taxa(l.virouOsPassivo, l.passivos)],
            ['Taxa de No-show', l => taxa(l.noShow, l.total)],
            ['Faturamento Total', l => fmtBRL(l.faturamento)],
            ['Ticket médio', l => (l.osGeradas ? fmtBRL(l.faturamento / l.osGeradas) : '—')],
          ]} />
      )}
      {tabela === 'passagens' && (
        <TabelaPorData titulo="Passagens por data de abertura" linhas={porData(osDoPeriodo, resumoPassagens, true)}
          total={resumoPassagens(osDoPeriodo || [])} vazio="Nenhuma O.S. no período." onClose={() => setTabela(null)}
          colunas={[
            ['Data de abertura', l => fmtData(l.data)],
            ['Quant. O.S.', l => l.passagens],
            ['O.S. com agendamento', l => l.agendadas],
            ['Agendamentos ativos', l => l.ativos],
            ['Agendamentos passivos', l => l.passivos],
            ['Taxa de Agendamento', l => taxa(l.agendadas, l.passagens)],
            ['Taxa de Agendamento Ativo', l => taxa(l.ativos, l.passagens)],
            ['Taxa de Agendamento Passivo', l => taxa(l.passivos, l.passagens)],
            ['Faturamento Total (com agendamento)', l => fmtBRL(l.faturamento)],
            ['Ticket médio (com agendamento)', l => (l.agendadas ? fmtBRL(l.faturamento / l.agendadas) : '—')],
          ]} />
      )}

      {alertaPendentes && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAlertaPendentes(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> O.S. pendentes de autorização</p>
              <button type="button" onClick={() => setAlertaPendentes(false)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 text-[11px]">
              {/* Clicar filtra a lista por essa situação; clicar de novo volta a mostrar todas. */}
              {SITUACOES_PENDENTES.map(sit => (
                <button key={sit} type="button" onClick={() => setFiltroPendente(f => (f === sit ? null : sit))}
                  className={`px-2 py-1 rounded-md border transition-colors ${filtroPendente === sit ? 'bg-amber-500 border-amber-600 text-white' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'} ${filtroPendente && filtroPendente !== sit ? 'opacity-50' : ''}`}>
                  {sit}: <strong>{osPendentes.filter(o => o.situacao === sit).length}</strong>
                </button>
              ))}
            </div>
            <div className="overflow-auto px-4 pb-4">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-white text-slate-500 uppercase text-[10px] shadow-[0_1px_0_0_#e2e8f0]">
                  <tr>{['Empresa', 'O.S.', 'Abertura', 'Tipo', 'Situação', 'Consultor'].map(h => <th key={h} className="text-left font-bold py-1.5 pr-3 border-b border-slate-200">{h}</th>)}</tr>
                </thead>
                <tbody className="text-slate-700">
                  {osPendentes.filter(o => !filtroPendente || o.situacao === filtroPendente).sort((a, b) => a.situacao.localeCompare(b.situacao) || a.data.localeCompare(b.data)).map(o => (
                    <tr key={`${o.empresa}#${o.numero}`} className="border-b border-slate-100">
                      <td className="py-1 pr-3 whitespace-nowrap">{o.empresa.replace('CAIOBA TRUCKS - ', '')}</td>
                      <td className="py-1 pr-3 tabular-nums">{o.numero}</td>
                      <td className="py-1 pr-3 tabular-nums whitespace-nowrap">{o.data.split('-').reverse().join('/')}</td>
                      <td className="py-1 pr-3">{o.tipo_os}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{o.situacao}</td>
                      <td className="py-1 pr-3 whitespace-nowrap">{o.consultor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
