import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Target, CheckCircle2, XCircle, Goal, Pencil, ListChecks, Table2, BarChart3, LayoutDashboard, BookOpen, Building2, Calendar, CalendarClock, CalendarX2, ChevronDown, ChevronsUpDown, ChevronUp, FilePlus2, FileSearch, FileX2, Info, Play, RefreshCw, Repeat, Search, Settings, Upload, Truck, Wrench, X } from 'lucide-react'
import { apiService } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { empresaSelecionavel } from '../../utils/comissoesElegibilidade'
import { INFO_RESUMO, FONTE_TABELAS } from './planosManutencaoTextos'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Abas do BI (as próximas entram aqui).
const ABAS = ['Resultado', 'Oportunidades', 'Contratos', 'Veículos Vendidos', 'Ordens de Serviço']
// Permissão de cada aba no grupo de acesso (menuTree: BI — Planos de Manutenção › Aba ...).
const PERM_ABA = {
  Resultado: 'bi/planos-manutencao/resultado',
  Oportunidades: 'bi/planos-manutencao/oportunidades',
  Contratos: 'bi/planos-manutencao/contratos',
  'Veículos Vendidos': 'bi/planos-manutencao/veiculos-vendidos',
  'Ordens de Serviço': 'bi/planos-manutencao/ordens-servico',
}
// Visualizações da aba Resultado: Resumo (indicadores e cards), Tabela (metas e resultados por mês) e Gráfico
// (por mês; escolhe o indicador — novos, renovados ou potencial — e se mostra quantidade ou %).
const VISOES_RESULTADO = [
  ['resumo', 'LayoutDashboard', 'Resumo: indicadores e cards'],
  ['tabela', 'Table2', 'Tabela de metas e resultados por mês'],
  ['grafico', 'BarChart3', 'Gráfico por mês'],
]
const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '')
const nomeEmpresa = (s) => s.replace(/^CAIOBA TRUCKS - /i, '')
// Cor do status do contrato (Razão do Status do CRM DAF), por grupo de status. A lista completa do CRM vem
// na aba oculta do arquivo: Ativo com/sem Gobrax, Ativo(a), Renovado..., Suspenso..., Bloqueado, Cancelado,
// Reprovado, Expirado - KM/Prazo, Minuta Solicitada, Aguardando Assinatura, Pendente de Contrato, Validar Serviço, Inativo(a).
const corStatusContrato = (status) => {
  const s = (status || '').toLowerCase()
  if (s.startsWith('ativo')) return 'bg-emerald-100 text-emerald-700'
  if (s.startsWith('renovado')) return 'bg-blue-100 text-blue-700'
  if (s.startsWith('expirado')) return 'bg-orange-100 text-orange-700'
  if (s.startsWith('cancelado') || s.startsWith('reprovado')) return 'bg-red-100 text-red-700'
  if (s.startsWith('suspenso') || s.startsWith('bloqueado')) return 'bg-amber-100 text-amber-700'
  if (s.startsWith('minuta') || s.startsWith('aguardando') || s.startsWith('pendente') || s.startsWith('validar')) return 'bg-violet-100 text-violet-700'
  return 'bg-slate-100 text-slate-600' // Inativo(a) e status novos
}
// TMO das O.S. P04 que identificam o contrato: PLAN01 "NOVO CONTRATO PLANO MANUTENCAO DAF MULTISUPORTE"
// e PLAN02 "RENOVACAO CONTRATO PLANO MANUTENCAO DAF MULTISUPORTE". Os demais TMOs (ex.: "Plano Manutenção OF") não contam.
const tipoContratoTmo = (tmo) => {
  const t = (tmo || '').toUpperCase()
  return t === 'PLAN01' ? 'novo' : t === 'PLAN02' ? 'renovado' : null
}
// Tipo de estoque da venda: VN = veículo novo, VU = usado.
const tipoVeiculo = (t) => (t === 'VN' ? 'Novo' : t === 'VU' ? 'Usado' : t)
const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const CORES_SITUACAO = {
  'Novo contrato': 'bg-emerald-100 text-emerald-700',
  'Renovação de contrato': 'bg-blue-100 text-blue-700',
  'Sem contrato': 'bg-red-100 text-red-700',
}

// Multisseleção de empresas: marcar o agrupamento marca/desmarca todas as empresas dele.
// Mesmo seletor do BI Agendamento de Serviços, em azul.
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

  return (
    <>
      <button ref={ref} type="button" onClick={abrir}
        className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-w-[180px] flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[360px] overflow-y-auto whitespace-nowrap">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionadas.length === 0 ? 'text-blue-700' : ''}`}>
              Todos
            </button>
            {grupos.map(([nome, lista]) => {
              const ids = lista.map(e => e.id)
              const qtd = ids.filter(id => selecionadas.includes(id)).length
              return (
                <div key={nome} className="border-t border-slate-100 mt-1 pt-1">
                  <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer font-bold uppercase text-[11px] text-slate-600">
                    <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600"
                      checked={qtd === ids.length}
                      ref={el => { if (el) el.indeterminate = qtd > 0 && qtd < ids.length }}
                      onChange={ev => alternar(ids, ev.target.checked)} />
                    {nome}
                  </label>
                  {lista.map(e => (
                    <label key={e.id} className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={selecionadas.includes(e.id)} onChange={ev => alternar([e.id], ev.target.checked)} />
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

// Multisseleção de Status do contrato (aba Contratos): nenhum marcado = todos.
// Mesmo visual do seletor de empresas (lista em portal, acima de tudo); cada status com a sua cor.
function SeletorStatus({ opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const alternar = (s, marcar) => onChange(marcar ? [...selecionados, s] : selecionados.filter(x => x !== s))
  const resumo = selecionados.length === 0 ? 'Status: Todos'
    : selecionados.length === 1 ? `Status: ${selecionados[0]}`
    : `Status: ${selecionados.length} selecionados`
  const abrir = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 240) })
    }
    setAberto(a => !a)
  }
  return (
    <>
      <button ref={ref} type="button" onClick={abrir}
        className="text-[11px] px-2 py-2 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-w-[180px] flex items-center justify-between gap-2">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[360px] overflow-y-auto whitespace-nowrap">
            <button type="button" onClick={() => onChange([])}
              className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${selecionados.length === 0 ? 'text-blue-700' : ''}`}>
              Todos
            </button>
            <div className="border-t border-slate-100 mt-1 pt-1">
              {opcoes.map(s => (
                <label key={s} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={selecionados.includes(s)} onChange={ev => alternar(s, ev.target.checked)} />
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(s)}`}>{s}</span>
                </label>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

// 'AAAA-MM-DD' menos n dias, no mesmo formato.
const menosDias = (s, n) => { const [a, m, d] = s.split('-').map(Number); return iso(new Date(a, m - 1, d - n)) }
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
// Mês atual: do dia 1 até ontem (se hoje é dia 1, o mês de ontem).
const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
const DATA_MAX = iso(ontem)
// Título da tabela de contratos conforme o seletor Tipo de data.
const TEXTO_TIPO_DATA = { criacao: 'data de criação', ambos: 'data de início ou fim', inicio: 'data de início', fim: 'data de fim' }
// Status da O.S. (abas Ordens de Serviço e Contratos): Emitida = NF no ROF017; Em aberto = sem NF; Cancelada (ROF001).
const COR_STATUS_OS = { Emitida: 'bg-emerald-100 text-emerald-700', 'Em aberto': 'bg-amber-100 text-amber-700', Cancelada: 'bg-slate-200 text-slate-600' }
// Coluna Situação (aba Contratos, chave interna "Origem"): só duas situações —
// Novo = 1º contrato do chassi; Renovação = o chassi já teve contrato antes (qualquer status).
const SITUACOES_CONTRATO = {
  novo: { label: 'Novo', cor: 'bg-emerald-100 text-emerald-700' },
  renovacao: { label: 'Renovação', cor: 'bg-blue-100 text-blue-700' },
}
// Status do contrato que entra na avaliação de renovação (coluna Origem e cards do Resumo).
const ehExpirado = (c) => (c.status || '').toLowerCase().startsWith('expirado')
const DATA_MIN = iso(new Date(ontem.getFullYear(), ontem.getMonth(), 1))
// Filtro Mês/Ano: um Ano e um ou mais Meses dele (cada mês inteiro; o mês atual vai até ontem).
// Ao abrir (e no ↺): o mês atual (decisão de 07/11/2026). O Resumo mostra o mês ANTERIOR de cada mês escolhido.
const ANO_ATUAL = DATA_MIN.slice(0, 4)
const MES_ATUAL = Number(DATA_MIN.slice(5, 7))
// Primeiro ano do seletor de Ano (os relatórios de O.S. P04 começam em 2024).
const ANO_INICIAL_FILTRO = 2024
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const anoMes = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}`
// 'AAAA-MM' do mês anterior (janeiro → dezembro do ano anterior).
const anoMesAnterior = (am) => { const [a, m] = am.split('-').map(Number); return m === 1 ? anoMes(a - 1, 12) : anoMes(a, m - 1) }
// Data 'AAAA-MM-DD' dentro de um dos meses (e não depois de ontem).
const dentroDosMeses = (lista) => { const set = new Set(lista); return (d) => !!d && d <= DATA_MAX && set.has(d.slice(0, 7)) }
const todasAsDatas = (d) => !!d

// Multisseleção dos meses do Ano escolhido (mesmo visual do seletor de Status). Pelo menos um mês fica marcado.
function SeletorMeses({ ano, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const futuro = (m) => anoMes(ano, m) > anoMes(ANO_ATUAL, MES_ATUAL)
  const alternar = (m, marcar) => {
    const novo = marcar ? [...selecionados, m] : selecionados.filter(x => x !== m)
    if (novo.length) onChange(novo.sort((a, b) => a - b))
  }
  const ordenados = [...selecionados].sort((a, b) => a - b)
  const resumo = ordenados.length === 1 ? MESES[ordenados[0] - 1]
    : ordenados.length === 12 ? 'Todos os meses' : `${ordenados.length} meses`
  const abrir = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 200) })
    }
    setAberto(a => !a)
  }
  const disponiveis = MESES.map((_, i) => i + 1).filter(m => !futuro(m))
  const todosMarcados = disponiveis.every(m => selecionados.includes(m))
  return (
    <>
      <button ref={ref} type="button" onClick={abrir} aria-label="Meses"
        className="text-[11px] px-2 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-w-[130px] flex items-center justify-between gap-2 capitalize">
        <span className="truncate">{resumo}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width }}
            className="z-50 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800 max-h-[400px] overflow-y-auto whitespace-nowrap">
            {/* Clique = só aquele mês; Ctrl (ou Cmd) + clique = marca/desmarca mais de um. */}
            <p className="px-3 pt-1 pb-1.5 text-[9px] text-slate-500 whitespace-normal leading-snug border-b border-slate-100 mb-1">
              Para marcar mais de um, segure <kbd className="px-0.5 rounded border border-slate-300 bg-slate-50 font-semibold text-slate-700 text-[9px]">Ctrl</kbd> e clique nos meses.
            </p>
            {/* Flag Todos os meses: marcado = ano inteiro (até o mês atual); desmarcar volta só para o último mês disponível. */}
            <button type="button" onClick={() => onChange(todosMarcados ? [disponiveis[disponiveis.length - 1]] : disponiveis)}
              className={`w-full flex items-center gap-2 text-left px-3 py-1.5 hover:bg-slate-50 font-semibold ${todosMarcados ? 'text-blue-700' : ''}`}>
              <input type="checkbox" readOnly tabIndex={-1} className="h-3.5 w-3.5 accent-blue-600 pointer-events-none" checked={todosMarcados} />
              Todos os meses
            </button>
            <div className="border-t border-slate-100 mt-1 pt-1">
              {MESES.map((nome, i) => (
                <button key={nome} type="button" disabled={futuro(i + 1)}
                  onClick={ev => {
                    const m = i + 1
                    if (ev.ctrlKey || ev.metaKey) alternar(m, !selecionados.includes(m))
                    else { onChange([m]); setAberto(false) }
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 capitalize text-left ${futuro(i + 1) ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer'}`}>
                  <input type="checkbox" readOnly tabIndex={-1} className="h-3.5 w-3.5 accent-blue-600 pointer-events-none" disabled={futuro(i + 1)}
                    checked={selecionados.includes(i + 1)} />
                  {nome}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

const inputCls = 'text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Card com ícone (caminhão por padrão; cada indicador passa o seu).
// `cor` = degradê do quadrado do ícone (azul por padrão).

// Botão ⓘ: abre um quadro centralizado na tela (portal, acima de tudo), para nunca sair da área visível;
// fecha clicando fora ou no X. Nos cards/indicadores mostra objetivo e cálculo (`info`; fonte, regras e colunas
// ficam no Manual operacional). Nas tabelas mostra a fonte (`secoes` próprias) e fica ao lado do título (`noTitulo`).
// Tabela opcional do ⓘ (cards do Resumo): { colunas: [...], linhas: [[...]], total: [...] }.
function TabelaInfo({ tabela }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-blue-700">{tabela.titulo}</p>
      <table className="w-full mt-1 border border-slate-200 rounded text-[11px]">
        <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
          <tr>{tabela.colunas.map((c, i) => <th key={c} className={`px-2 py-1 font-bold ${i ? 'text-right' : 'text-left'}`}>{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tabela.linhas.map((l, j) => (
            <tr key={j}>{l.map((v, i) => <td key={i} className={`px-2 py-1 ${i ? 'text-right tabular-nums' : 'capitalize'}`}>{v}</td>)}</tr>
          ))}
          {!tabela.linhas.length && <tr><td colSpan={tabela.colunas.length} className="px-2 py-2 text-center text-slate-400">Nenhum no período.</td></tr>}
        </tbody>
        {tabela.total && (
          <tfoot className="border-t border-slate-200 font-bold">
            <tr>{tabela.total.map((v, i) => <td key={i} className={`px-2 py-1 ${i ? 'text-right tabular-nums' : ''}`}>{v}</td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function BotaoInfo({ titulo, info, secoes: secoesProprias, noTitulo, tabela }) {
  const [aberto, setAberto] = useState(false)
  const secoes = secoesProprias || [['Objetivo', info.objetivo], ['Cálculo', info.calculo]]
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={`Informações: ${titulo}`} title="Informações"
        className={`${noTitulo ? '' : 'absolute top-2 right-2 '}p-0.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50`}>
        <Info className="h-3.5 w-3.5" />
      </button>
      {aberto && createPortal(
        <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4"
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
                  <p className="text-[10px] font-bold uppercase text-blue-700">{nome}</p>
                  <p className="leading-snug mt-0.5 whitespace-pre-line">{texto}</p>
                </div>
              ))}
              {tabela && <TabelaInfo tabela={tabela} />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

// Janela da engrenagem › Cadastro de ações: incluir, renomear e ativar/desativar. Ação não é apagada (desativada some
// da lista de escolha, mas continua nas oportunidades que já a usaram).
function ModalCadastroAcoes({ acoes, onSalvar, onClose }) {
  const [nova, setNova] = useState('')
  const [editando, setEditando] = useState(null) // { id, nome }
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const salvar = async (acao) => {
    if (!acao.nome?.trim()) return
    setSalvando(true); setErro('')
    try { await onSalvar(acao); setNova(''); setEditando(null) }
    catch (e) { setErro(/duplicate|unique/i.test(e.message || '') ? 'Já existe uma ação com esse nome.' : `Não foi possível salvar: ${e.message || e}`) }
    finally { setSalvando(false) }
  }
  return createPortal(
    <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-lg shadow-xl w-full min-w-0 max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><ListChecks className="h-4 w-4 text-blue-600" /> Cadastro de ações</p>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-auto">
          <div className="flex items-center gap-2">
            <input value={nova} onChange={e => setNova(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') salvar({ nome: nova }) }}
              placeholder="Nova ação (ex.: Ligar para o cliente)" className={`${inputCls} flex-1 py-1.5`} />
            <button type="button" onClick={() => salvar({ nome: nova })} disabled={salvando || !nova.trim()}
              className="text-[11px] px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Incluir</button>
          </div>
          {erro && <p className="text-[11px] text-red-600">{erro}</p>}
          <table className="w-full text-[11px]">
            <thead className="text-slate-500 uppercase text-[10px]"><tr><th className="text-left py-1">Ação</th><th className="text-left py-1 w-20">Situação</th><th className="w-24" /></tr></thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {acoes.map(a => (
                <tr key={a.id}>
                  <td className="py-1.5 pr-2">
                    {editando?.id === a.id
                      ? <input autoFocus value={editando.nome} onChange={e => setEditando({ ...editando, nome: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') salvar({ ...a, nome: editando.nome }) }} className={`${inputCls} w-full`} />
                      : <span className={a.ativo ? '' : 'text-slate-400 line-through'}>{a.nome}</span>}
                  </td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => salvar({ ...a, ativo: !a.ativo })} disabled={salvando}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${a.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                      title={a.ativo ? 'Clique para desativar' : 'Clique para ativar'}>{a.ativo ? 'Ativa' : 'Inativa'}</button>
                  </td>
                  <td className="py-1.5 text-right">
                    {editando?.id === a.id
                      ? <>
                          <button type="button" onClick={() => salvar({ ...a, nome: editando.nome })} className="text-[11px] text-blue-700 font-semibold mr-2">Salvar</button>
                          <button type="button" onClick={() => setEditando(null)} className="text-[11px] text-slate-500">Cancelar</button>
                        </>
                      : <button type="button" onClick={() => setEditando({ id: a.id, nome: a.nome })} title="Renomear" aria-label="Renomear" className="p-1 rounded text-slate-500 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" /></button>}
                  </td>
                </tr>
              ))}
              {!acoes.length && <tr><td colSpan={3} className="py-3 text-center text-slate-400">Nenhuma ação cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    document.body
  )
}

// Janela da coluna Ação (aba Oportunidades): escolher a ação e escrever a descrição; grava a oportunidade no Supabase.
function ModalAcaoOportunidade({ linha, gravada, acoes, podeEditar, onSalvar, onClose }) {
  const [acaoId, setAcaoId] = useState(gravada?.acao_id ? String(gravada.acao_id) : '')
  const [descricao, setDescricao] = useState(gravada?.descricao || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const opcoes = acoes.filter(a => a.ativo || String(a.id) === acaoId)
  const salvar = async () => {
    setSalvando(true); setErro('')
    try { await onSalvar({ acao_id: acaoId ? Number(acaoId) : null, descricao: descricao.trim() || null }); onClose() }
    catch (e) { setErro(`Não foi possível salvar: ${e.message || e}`) }
    finally { setSalvando(false) }
  }
  return createPortal(
    <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-lg shadow-xl w-full min-w-0 max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">Ação da oportunidade</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {linha.tipoOp} · {linha.contrato ? `Contrato ${linha.contrato} · ` : ''}Chassi <span className="font-mono">{linha.chassi}</span> · {linha.cliente}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3 overflow-auto text-[11px]">
          <label className="block">
            <span className="font-bold text-slate-600 uppercase text-[10px]">Ação</span>
            <select value={acaoId} onChange={e => setAcaoId(e.target.value)} disabled={!podeEditar} className={`${inputCls} w-full mt-1 py-1.5`}>
              <option value="">— Sem ação —</option>
              {opcoes.map(a => <option key={a.id} value={a.id}>{a.nome}{a.ativo ? '' : ' (inativa)'}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="font-bold text-slate-600 uppercase text-[10px]">Descrição da ação</span>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} disabled={!podeEditar} rows={5}
              placeholder="O que foi feito / combinado com o cliente"
              className="w-full mt-1 text-[11px] px-2 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:bg-slate-50" />
          </label>
          {gravada?.atualizado_por && (
            <p className="text-[10px] text-slate-400">Última alteração: {new Date(gravada.atualizado_em).toLocaleString('pt-BR')} por {gravada.atualizado_por}</p>
          )}
          {!podeEditar && <p className="text-[10px] text-slate-500">Somente consulta: o seu grupo de acesso não pode informar ações.</p>}
          {erro && <p className="text-red-600">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-slate-200">
          <button type="button" onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50">{podeEditar ? 'Cancelar' : 'Fechar'}</button>
          {podeEditar && (
            <button type="button" onClick={salvar} disabled={salvando}
              className="text-[11px] px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">{salvando ? 'Salvando...' : 'Salvar'}</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Engrenagem do cabeçalho (ao lado de Atualizar): menu com "Importar arquivo" do CRM DAF - Potencial Renovação.
// Lista em portal (acima de tudo); o arquivo escolhido vai para `onImportar`.
function MenuEngrenagem({ importando, onImportar, podeImportar, onAcoes }) {
  const [pos, setPos] = useState(null)
  const ref = useRef(null)
  const arquivoRef = useRef(null)
  const abrir = () => {
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }
  return (
    <>
      <button ref={ref} type="button" onClick={abrir} disabled={importando}
        title="Configurações" aria-label="Configurações"
        className="flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors">
        <Settings className={`h-3.5 w-3.5 ${importando ? 'animate-spin' : ''}`} />
      </button>
      <input ref={arquivoRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={e => { onImportar(e.target.files?.[0]); e.target.value = '' }} />
      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div style={{ position: 'fixed', top: pos.top, right: pos.right }}
            className="z-50 w-72 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs text-slate-800">
            {podeImportar && <button type="button" onClick={() => { setPos(null); arquivoRef.current?.click() }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2">
              <Upload className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
              <span>
                <span className="font-semibold block">Importar arquivo</span>
                <span className="text-[11px] text-slate-500">CRM DAF - Plano de Manutenção - Potencial Renovação — atualiza a aba Contratos</span>
              </span>
            </button>}
            {onAcoes && (
              <button type="button" onClick={() => { setPos(null); onAcoes() }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-start gap-2 border-t border-slate-100">
                <ListChecks className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                <span>
                  <span className="font-semibold block">Cadastro de ações</span>
                  <span className="text-[11px] text-slate-500">Ações usadas na coluna Ação da aba Oportunidades</span>
                </span>
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}

function CardTruck({ label, valor, ajuda, info, tabela, icone: Icone = Truck, cor = 'from-blue-400 to-blue-600' }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3" title={info ? undefined : ajuda}>
      {info && <BotaoInfo titulo={label} info={info} tabela={tabela} />}
      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${cor} flex items-center justify-center shrink-0`}>
        <Icone className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{label}</p>
        <p className="text-base font-bold text-slate-900 mt-1">{valor}</p>
      </div>
    </div>
  )
}

// Ordenação das tabelas: clicar no título ordena crescente, de novo decrescente, e o terceiro clique volta à
// ordem original. `colunas` = { título: (linha) => valor }; texto compara em pt-BR (números dentro do texto
// em ordem numérica), número compara direto, vazio vai sempre para o fim.
function useOrdenacao(lista, colunas) {
  const [ord, setOrd] = useState(null) // { col, dir: 1 | -1 }
  const ordenada = useMemo(() => {
    const valor = ord && colunas[ord.col]
    if (!valor) return lista
    return [...lista].sort((a, b) => {
      const va = valor(a), vb = valor(b)
      const vaVazio = va === null || va === undefined || va === '', vbVazio = vb === null || vb === undefined || vb === ''
      if (vaVazio || vbVazio) return vaVazio === vbVazio ? 0 : vaVazio ? 1 : -1
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
      return c * ord.dir
    })
  }, [lista, ord])
  const alternar = (col) => setOrd(o => (o?.col !== col ? { col, dir: 1 } : o.dir === 1 ? { col, dir: -1 } : null))
  return { ordenada, ord, alternar }
}

// `chave` = coluna na ordenação, quando o título repete o de outra coluna (padrão: o próprio título).
function ThOrdena({ titulo, chave = titulo, ordenacao, direita }) {
  const ativo = ordenacao.ord?.col === chave
  const Icone = !ativo ? ChevronsUpDown : ordenacao.ord.dir === 1 ? ChevronUp : ChevronDown
  return (
    <th className={`font-bold px-3 py-2 whitespace-nowrap ${direita ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => ordenacao.alternar(chave)}
        className={`inline-flex items-center gap-1 uppercase hover:text-slate-800 ${ativo ? 'text-blue-700' : ''}`}>
        {titulo}
        <Icone className={`h-3 w-3 ${ativo ? '' : 'opacity-40'}`} />
      </button>
    </th>
  )
}

// Metas dos velocímetros: digitadas na aba Evolução (tabela bi_planos_metas), uma por mês. Mês sem meta = sem meta
// (sem % na Evolução e sem marca/cor no velocímetro). A do Potencial de contratos não é gravada: vem das duas.
// Cor pelo atingimento da meta (igual ao BI Agendamento): < 80% vermelho, 80–99% amarelo, >= 100% verde.
const corAtingimento = (valor, meta) => {
  const ating = meta > 0 ? valor / meta : 1
  return ating >= 1 ? '#059669' : ating >= 0.8 ? '#eab308' : '#dc2626'
}
const fmtPct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`

// Meta de um indicador num mês ('AAAA-MM'): só a cadastrada para o próprio mês; sem ela, null (sem meta).
const metaDoMes = (linhas, indicador, am) => {
  const l = linhas.find(x => x.indicador === indicador && `${x.ano}-${String(x.mes).padStart(2, '0')}` === am)
  return l ? Number(l.meta) : null
}
// Meta do Potencial de contratos: média das duas metas pesada pelas oportunidades; sem uma das duas, sem meta.
const metaPotencial = (metaN, metaR, vendidos, aRenovar) => {
  if (metaN == null || metaR == null) return null
  return vendidos + aRenovar ? (metaN * vendidos + metaR * aRenovar) / (vendidos + aRenovar) : (metaN + metaR) / 2
}
const INDICADORES_META = [['gaugeNovos', 'Contratos novos'], ['gaugeRenovados', 'Contratos renovados']]

// Tooltip do Gráfico em Quantidade: base e resultado do mês e o % atingido (resultado ÷ base), na cor do
// atingimento da meta quando o mês tem meta.
function TooltipQtd({ active, payload, label, g }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const [[cBase, nBase, corBase], [cRes, nRes, corRes]] = g.qtd
  const base = d[cBase], res = d[cRes], meta = d[g.meta]
  const pct = base ? res / base * 100 : null
  const linha = (cor, nome, valor) => (
    <p className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: cor }} />{nome}</span>
      <span className="font-semibold tabular-nums">{valor == null ? '—' : valor.toLocaleString('pt-BR')}</span>
    </p>
  )
  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-md px-3 py-2 text-[11px] text-slate-700 space-y-1">
      <p className="font-bold text-slate-900 capitalize">{label}</p>
      {linha(corBase, nBase, base)}
      {linha(corRes, nRes, res)}
      <p className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
        <span>% atingido</span>
        <span className="font-bold tabular-nums" style={{ color: pct != null && meta != null ? corAtingimento(pct, meta) : undefined }}>
          {pct == null ? '—' : fmtPct(pct)}
        </span>
      </p>
      {meta != null && <p className="flex items-center justify-between gap-4 text-slate-500"><span>Meta</span><span className="tabular-nums">{fmtPct(meta)}</span></p>}
    </div>
  )
}

// Aba Evolução: no ano escolhido, as metas (%) de Contratos novos e Contratos renovados de cada mês (digitar e
// Salvar; vale para todos os usuários) e, abaixo, o resultado de cada mês com o % e a cor do atingimento.
// Campo de meta vazio = o mês usa a última meta cadastrada antes dele (aparece em cinza no campo).
function AbaEvolucao({ visao, podeEditar, linhas, ano, resultados, info, onSalvar }) {
  const chave = (ind, a, m) => `${ind}|${a}|${m}`
  const original = useMemo(() => Object.fromEntries(linhas.map(l => [chave(l.indicador, l.ano, l.mes), String(Number(l.meta))])), [linhas])
  const [valores, setValores] = useState(original)
  useEffect(() => { setValores(original) }, [original])
  const [salvando, setSalvando] = useState(false)
  const [aviso, setAviso] = useState(null)
  // Visualização: tabela (metas e resultados), gráfico de % (com as metas tracejadas) ou gráfico de quantidade.
  // Botão Editar: só em edição as metas viram campos (individual ou marcando meses); Cancelar desfaz.
  const [editando, setEditando] = useState(false)
  useEffect(() => { if (visao !== 'tabela' && editando) { setValores(original); setMarcados([]); setEditando(false) } }, [visao])
  const cancelar = () => { setValores(original); setMarcados([]); setLote({ gaugeNovos: '', gaugeRenovados: '' }); setAviso(null); setEditando(false) }
  // Marcar meses e aplicar a mesma meta a todos (depois, Salvar metas grava).
  const [marcados, setMarcados] = useState([])
  const [lote, setLote] = useState({ gaugeNovos: '', gaugeRenovados: '' })
  useEffect(() => { setMarcados([]) }, [ano])
  const loteInvalido = Object.values(lote).some(v => v !== '' && (isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100))
  const aplicar = () => {
    setValores(v => {
      const novo = { ...v }
      marcados.forEach(m => Object.entries(lote).forEach(([ind, val]) => { if (val !== '') novo[chave(ind, ano, m)] = val }))
      return novo
    })
    setAviso({ ok: true, texto: 'Metas aplicadas. Clique em Salvar metas para gravar.' })
  }
  const invalido = Object.values(valores).some(v => v !== '' && (isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100))
  const alterado = Object.keys({ ...valores, ...original }).some(k => (valores[k] ?? '') !== (original[k] ?? ''))
  const linhasAtuais = Object.entries(valores).filter(([, v]) => v !== '').map(([k, v]) => {
    const [indicador, a, m] = k.split('|'); return { indicador, ano: Number(a), mes: Number(m), meta: Number(v) }
  })
  const metaDigitada = (ind, m) => metaDoMes(linhasAtuais, ind, `${ano}-${String(m).padStart(2, '0')}`)
  const salvar = async () => {
    setSalvando(true); setAviso(null)
    try {
      const gravar = [], apagar = []
      Object.keys({ ...valores, ...original }).forEach(k => {
        const v = valores[k] ?? ''
        const [indicador, a, m] = k.split('|')
        const linha = { indicador, ano: Number(a), mes: Number(m) }
        if (v !== '' && v !== original[k]) gravar.push({ ...linha, meta: Number(v) })
        if (v === '' && original[k] != null) apagar.push(linha)
      })
      await onSalvar(gravar, apagar)
      setAviso({ ok: true, texto: 'Metas salvas.' })
      setEditando(false); setMarcados([])
    } catch (e) {
      setAviso({ ok: false, texto: `Não foi possível salvar: ${e.message || e}` })
    } finally {
      setSalvando(false)
    }
  }
  const n = (v) => (v == null ? '—' : v.toLocaleString('pt-BR'))
  // Sem meta no mês (ou sem resultado), o % não é calculado.
  const pct = (v, meta) => (v == null || meta == null ? <span className="text-slate-300">—</span>
    : <span className="font-semibold tabular-nums" style={{ color: corAtingimento(v, meta) }}>{fmtPct(v)}</span>)
  const th = 'px-2 py-1.5 font-bold whitespace-nowrap'
  const p1 = (v) => (v == null ? null : Math.round(v * 10) / 10)
  const dadosGrafico = MESES.map((nome, i) => {
    const m = i + 1
    const r = resultados[m]
    const metaN = metaDigitada('gaugeNovos', m), metaR = metaDigitada('gaugeRenovados', m)
    const op = r ? r.vendidos + r.aRenovar : 0
    return {
      mes: nome.slice(0, 3),
      pNovos: r && r.vendidos ? p1(r.novos / r.vendidos * 100) : null,
      pRenovados: r && r.aRenovar ? p1(r.renovados / r.aRenovar * 100) : null,
      pPotencial: r && op ? p1((r.novos + r.renovados) / op * 100) : null,
      mNovos: metaN, mRenovados: metaR, mPotencial: p1(metaPotencial(metaN, metaR, r?.vendidos || 0, r?.aRenovar || 0)),
      vendidos: r?.vendidos ?? null, novos: r?.novos ?? null, aRenovar: r?.aRenovar ?? null, renovados: r?.renovados ?? null,
      oportunidades: r ? op : null, realizados: r ? r.novos + r.renovados : null,
    }
  })
  // Gráfico: um indicador por vez (novos, renovados ou potencial), em quantidade ou em %.
  const [grafInd, setGrafInd] = useState('novos')
  const [grafModo, setGrafModo] = useState('qtd')
  const GRAF = {
    novos: { label: 'Contratos novos', cor: '#10b981', corMeta: '#047857', pct: 'pNovos', meta: 'mNovos',
      qtd: [['vendidos', 'Vendidos mês anterior', '#3b82f6'], ['novos', 'Contratos novos', '#10b981']] },
    renovados: { label: 'Contratos renovados', cor: '#8b5cf6', corMeta: '#6d28d9', pct: 'pRenovados', meta: 'mRenovados',
      qtd: [['aRenovar', 'A renovar mês anterior', '#f59e0b'], ['renovados', 'Contratos renovados', '#8b5cf6']] },
    potencial: { label: 'Potencial de contratos', cor: '#0ea5e9', corMeta: '#0369a1', pct: 'pPotencial', meta: 'mPotencial',
      qtd: [['oportunidades', 'Oportunidades', '#3b82f6'], ['realizados', 'Realizados', '#0ea5e9']] },
  }
  const g = GRAF[grafInd]
  // Ordem da legenda e do tooltip = ordem das barras (a biblioteca ordena por nome se não for informada).
  const ordemSerie = grafModo === 'qtd' ? g.qtd.map(([chave]) => chave) : [g.pct, g.meta]
  const ordenar = (item) => ordemSerie.indexOf(item.dataKey)
  const fmtTooltip = (v, nome) => [v == null ? '—' : (grafModo === 'pct' ? fmtPct(v) : v.toLocaleString('pt-BR')), nome]
  const botaoSeg = (ativo) => `px-2.5 py-1 rounded text-[11px] font-semibold ${ativo ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-white'}`
  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-slate-200">
          <Goal className="h-4 w-4 text-blue-600" />
          <p className="text-[11px] font-semibold text-indigo-950">Metas e resultados por mês</p>
          {/* Aplicar a mesma meta aos meses marcados na tabela (só em edição). */}
          {editando && <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 border-l border-slate-200 pl-3">
            <span>{marcados.length ? `${marcados.length} mês(es) marcado(s):` : 'Marque os meses e aplique:'}</span>
            {INDICADORES_META.map(([ind, label]) => (
              <label key={ind} className="flex items-center gap-1">
                {label}
                <input type="number" min="0" max="100" step="0.1" value={lote[ind]} onChange={e => setLote(l => ({ ...l, [ind]: e.target.value }))}
                  className="w-16 text-right text-[11px] px-1.5 py-1 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />%
              </label>
            ))}
            <button type="button" onClick={aplicar}
              disabled={!marcados.length || loteInvalido || Object.values(lote).every(v => v === '')}
              className="text-[11px] px-3 py-1.5 rounded-md border border-blue-600 text-blue-700 hover:bg-blue-50 disabled:opacity-40">
              Aplicar aos marcados
            </button>
          </div>}
          {visao === 'tabela' && <div className="ml-auto flex items-center gap-2">
            {aviso && <span className={`text-[11px] ${aviso.ok ? 'text-emerald-700' : 'text-red-600'}`}>{aviso.texto}</span>}
            {!editando ? (podeEditar &&
              <button type="button" onClick={() => { setAviso(null); setEditando(true) }}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                <Pencil className="h-3.5 w-3.5" /> Editar metas
              </button>
            ) : (
              <>
                <button type="button" onClick={cancelar} disabled={salvando}
                  className="text-[11px] px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" onClick={salvar} disabled={salvando || invalido || !alterado}
                  className="text-[11px] px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar metas'}
                </button>
              </>
            )}
          </div>}
        </div>
        {visao === 'grafico' && (
          <div className="p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                {Object.entries(GRAF).map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setGrafInd(k)} className={botaoSeg(grafInd === k)}>{v.label}</button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                <button type="button" onClick={() => setGrafModo('qtd')} className={botaoSeg(grafModo === 'qtd')}>Quantidade</button>
                <button type="button" onClick={() => setGrafModo('pct')} className={botaoSeg(grafModo === 'pct')}>%</button>
              </div>
            </div>
            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dadosGrafico} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={grafModo === 'pct'} tickFormatter={v => (grafModo === 'pct' ? `${v}%` : v)} tick={{ fontSize: 11 }} />
                  {grafModo === 'qtd'
                    ? <Tooltip content={<TooltipQtd g={g} />} />
                    : <Tooltip formatter={fmtTooltip} itemSorter={ordenar} />}
                  <Legend wrapperStyle={{ fontSize: 11 }} itemSorter={ordenar} />
                  {grafModo === 'qtd'
                    // A base (vendidos / a renovar / oportunidades do mês anterior) em linha; o resultado em barra.
                    ? g.qtd.map(([chave, nome, cor], i) => (i === 0
                      ? <Line key={chave} type="monotone" dataKey={chave} name={nome} stroke={cor} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                      : (
                        <Bar key={chave} dataKey={chave} name={nome} fill={cor}>
                          <LabelList dataKey={chave} position="top" style={{ fontSize: 10, fill: '#334155' }} formatter={v => (v == null ? '' : v.toLocaleString('pt-BR'))} />
                        </Bar>
                      )))
                    : [
                      <Bar key="p" dataKey={g.pct} name={`${g.label} %`} fill={g.cor}>
                        <LabelList dataKey={g.pct} position="top" style={{ fontSize: 10, fill: '#334155' }} formatter={v => (v == null ? '' : fmtPct(v))} />
                      </Bar>,
                      <Line key="m" dataKey={g.meta} name="Meta" stroke={g.corMeta} strokeDasharray="5 4" dot={false} connectNulls={false} />,
                    ]}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        {visao === 'tabela' && <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className={`${th} text-left`} rowSpan={2}>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    {editando && <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" aria-label="Marcar todos os meses"
                      checked={marcados.length === 12} onChange={e => setMarcados(e.target.checked ? MESES.map((_, i) => i + 1) : [])} />}
                    Mês
                  </label>
                </th>
                <th className={`${th} text-center border-l border-slate-200`} colSpan={4}>Contratos novos</th>
                <th className={`${th} text-center border-l border-slate-200`} colSpan={4}>Contratos renovados</th>
                <th className={`${th} text-center border-l border-slate-200`} colSpan={4}>Potencial de contratos</th>
              </tr>
              <tr>
                {['Meta (%)', 'Vendidos mês anterior', 'Novos', '%', 'Meta (%)', 'A renovar mês anterior', 'Renovados', '%', 'Meta (%)', 'Oportunidades', 'Realizados', '%'].map((h, i) => (
                  <th key={i} className={`${th} text-right ${i % 4 === 0 ? 'border-l border-slate-200' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {MESES.map((nome, i) => {
                const m = i + 1
                const r = resultados[m]
                const metaN = metaDigitada('gaugeNovos', m), metaR = metaDigitada('gaugeRenovados', m)
                const metaP = metaPotencial(metaN, metaR, r?.vendidos || 0, r?.aRenovar || 0)
                const campo = (ind) => {
                  const k = chave(ind, ano, m)
                  if (!editando) return valores[k] ? <span className="font-semibold">{fmtPct(Number(valores[k]))}</span> : <span className="text-slate-300">—</span>
                  return (
                    <input type="number" min="0" max="100" step="0.1" value={valores[k] ?? ''}
                      onChange={e => { setAviso(null); setValores(v => ({ ...v, [k]: e.target.value })) }}
                      className="w-16 text-right text-[11px] px-1.5 py-1 rounded-md border border-slate-300 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
                  )
                }
                const td = 'px-2 py-1 text-right tabular-nums whitespace-nowrap'
                return (
                  <tr key={nome} className="hover:bg-slate-50">
                    <td className="px-2 py-1 capitalize whitespace-nowrap">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        {editando && <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={marcados.includes(m)}
                          onChange={e => setMarcados(ms => (e.target.checked ? [...ms, m] : ms.filter(x => x !== m)))} />}
                        {nome}
                      </label>
                    </td>
                    <td className={`${td} border-l border-slate-100`}>{campo('gaugeNovos')}</td>
                    <td className={td}>{n(r?.vendidos)}</td>
                    <td className={td}>{n(r?.novos)}</td>
                    <td className={td}>{pct(r && r.vendidos ? r.novos / r.vendidos * 100 : null, metaN)}</td>
                    <td className={`${td} border-l border-slate-100`}>{campo('gaugeRenovados')}</td>
                    <td className={td}>{n(r?.aRenovar)}</td>
                    <td className={td}>{n(r?.renovados)}</td>
                    <td className={td}>{pct(r && r.aRenovar ? r.renovados / r.aRenovar * 100 : null, metaR)}</td>
                    <td className={`${td} border-l border-slate-100 text-slate-500`}>{metaP == null ? <span className="text-slate-300">—</span> : fmtPct(metaP)}</td>
                    <td className={td}>{n(r ? r.vendidos + r.aRenovar : null)}</td>
                    <td className={td}>{n(r ? r.novos + r.renovados : null)}</td>
                    <td className={td}>{pct(r && r.vendidos + r.aRenovar ? (r.novos + r.renovados) / (r.vendidos + r.aRenovar) * 100 : null, metaP)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>}
      </div>
    </div>
  )
}

// Velocímetro (meia-lua), no modelo do BI Agendamento de Serviços: arco cinza de fundo, arco até o valor (%)
// na cor do atingimento da meta e um corte branco na posição da meta.
function Gauge({ label, valor, detalhe, ajuda, info, meta }) {
  const cx = 100, cy = 100, r = 70, esp = 36
  const ponto = (pct, raio = r) => {
    const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100)
    return [cx + raio * Math.cos(a), cy - raio * Math.sin(a)]
  }
  const temMeta = meta != null && !isNaN(meta)
  const [mx1, my1] = temMeta ? ponto(meta, r - esp / 2 - 1) : [0, 0]
  const [mx2, my2] = temMeta ? ponto(meta, r + esp / 2 + 1) : [0, 0]
  const arco = (pct) => { const [x, y] = ponto(pct); return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}` }
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3" title={info ? undefined : ajuda}>
      {info && <BotaoInfo titulo={label} info={info} />}
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{label}</p>
      <svg viewBox="0 0 200 118" className="w-full max-h-40 mt-1">
        <path d={arco(100)} fill="none" stroke="#e2e8f0" strokeWidth={esp} />
        {valor !== null && valor > 0 && <path d={arco(valor)} fill="none" stroke={temMeta ? corAtingimento(valor, meta) : '#2563eb'} strokeWidth={esp} />}
        {temMeta && <line x1={mx1} y1={my1} x2={mx2} y2={my2} stroke="#fff" strokeWidth="3" />}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 20, fontWeight: 700 }}>
          {valor === null ? '—' : fmtPct(valor)}
        </text>
        {detalhe && <text x={cx} y={cy + 6} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>{detalhe}</text>}
        {temMeta && <text x={cx} y={cy + 17} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9, fontWeight: 600 }}>Meta: {fmtPct(meta)}</text>}
        <text x={cx - r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>0%</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>100%</text>
      </svg>
    </div>
  )
}

export default function BiPlanosManutencao() {
  const { user, hasAction, hasPermission } = useAuth()
  // Abas liberadas no grupo de acesso (admin vê todas).
  const abasVisiveis = ABAS.filter(a => hasPermission(PERM_ABA[a]))
  const podeAtualizar = hasAction('bi/planos-manutencao', 'atualizar')
  // Ações do grupo de acesso (Grupos › BI — Planos de Manutenção). Quem só tem o menu vê, mas não edita nem importa.
  const podeEditarMetas = hasAction('bi/planos-manutencao/resultado', 'editar_metas')
  const podeImportar = hasAction('bi/planos-manutencao', 'importar_arquivo')
  const podeCadastrarAcoes = hasAction('bi/planos-manutencao', 'cadastrar_acoes')
  const podeDefinirAcao = hasAction('bi/planos-manutencao/oportunidades', 'definir_acao')
  // Ações (cadastro da engrenagem) e oportunidades gravadas no Supabase (ação + descrição), para todos os usuários.
  const [acoesCad, setAcoesCad] = useState([])
  const [opGravadas, setOpGravadas] = useState(new Map()) // chave → linha de bi_planos_oportunidades
  const [acoesAberto, setAcoesAberto] = useState(false)
  const [acaoModal, setAcaoModal] = useState(null) // linha da aba Oportunidades
  const lerAcoes = () => apiService.getBiPlanosAcoes().then(setAcoesCad).catch(() => {})
  const lerOportunidades = () => apiService.getBiPlanosOportunidades()
    .then(linhas => setOpGravadas(new Map(linhas.map(l => [l.chave, l])))).catch(() => {})
  useEffect(() => { lerAcoes(); lerOportunidades() }, [])
  const salvarAcaoCad = async (acao) => { await apiService.saveBiPlanosAcao(acao, user?.email); await lerAcoes() }
  const salvarOportunidade = async (linha, dados) => {
    await apiService.saveBiPlanosOportunidade({
      chave: linha.chave, tipo_oportunidade: linha.tipoOp, contrato: linha.contrato || null, cliente: linha.cliente || null,
      chassi: linha.chassi || null, data_venda: linha.dataVenda || null, inicio: linha.inicio || null, fim: linha.fim || null,
      empresa: linha.grupo || null, ...dados,
    }, user?.email)
    await lerOportunidades()
  }
  const nomeAcao = (id) => acoesCad.find(a => a.id === id)?.nome || ''
  // Metas dos velocímetros (engrenagem). Sem a tabela ou com erro, ficam as padrão.
  const [visaoResultado, setVisaoResultado] = useState('resumo') // aba Resultado
  const [metasLinhas, setMetasLinhas] = useState([]) // [{ indicador, ano, mes, meta }]
  const [metasInfo, setMetasInfo] = useState('')
  const lerMetas = () => apiService.getBiPlanosMetas()
    .then(linhas => {
      setMetasLinhas(linhas)
      const ultima = [...linhas].sort((a, b) => (b.atualizado_em || '').localeCompare(a.atualizado_em || ''))[0]
      setMetasInfo(ultima?.atualizado_por ? `Última alteração: ${new Date(ultima.atualizado_em).toLocaleString('pt-BR')} por ${ultima.atualizado_por}` : '')
    })
    .catch(() => {})
  useEffect(() => { lerMetas() }, [])
  const salvarMetas = async (gravar, apagar) => {
    await apiService.saveBiPlanosMetas(gravar, apagar, user?.email)
    await lerMetas()
  }
  const [empresas, setEmpresas] = useState([])
  const [empresasSel, setEmpresasSel] = useState([]) // vazio = todas
  // ?aba=<nome da aba> (ex.: atalho da Matriz KPIs) abre direto nela, se estiver liberada.
  const [paramsUrl] = useSearchParams()
  const [aba, setAba] = useState(() => (abasVisiveis.includes(paramsUrl.get('aba')) ? paramsUrl.get('aba') : abasVisiveis[0] || '')) // '' = nenhuma aba liberada (não mostra conteúdo)
  // Se a aba aberta não estiver liberada (permissões carregadas depois), vai para a primeira liberada.
  useEffect(() => { if (!abasVisiveis.includes(aba)) setAba(abasVisiveis[0] || '') }, [abasVisiveis.join(','), aba])
  const [anoSel, setAnoSel] = useState(ANO_ATUAL)
  const [mesesSel, setMesesSel] = useState([MES_ATUAL]) // 1 a 12, um ou mais
  // Trocar o ano tira os meses que ainda não chegaram (no ano atual); se nada sobrar, fica o mês atual.
  const escolherAno = (ano) => {
    const validos = mesesSel.filter(m => anoMes(ano, m) <= anoMes(ANO_ATUAL, MES_ATUAL))
    setAnoSel(ano)
    setMesesSel(validos.length ? validos : [MES_ATUAL])
  }
  const mesesFiltro = mesesSel.map(m => anoMes(anoSel, m))
  const mesesAnteriores = mesesFiltro.map(anoMesAnterior)
  const chaveMeses = mesesFiltro.join(',')

  // Empresas do cadastro (sem as "visuais"), agrupadas por Agrupamento; só Trucks.
  useEffect(() => {
    apiService.getEmpresas().then(r => setEmpresas((r || []).filter(empresaSelecionavel))).catch(() => setEmpresas([]))
  }, [])
  const grupos = useMemo(() => {
    const m = {}
    empresas.forEach(e => { if (/truck/i.test(e.agrupamento_nome || '')) (m[e.agrupamento_nome] ||= []).push(e) })
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
  }, [empresas])

  // Veículos vendidos (Dealer.net REL_VEICULOSVENDIDOSPORPERIODO_REPORT, pasta DAF - Veículos) e
  // O.S. tipo P04 (ROF017_FATURAMENTOPOROS, pasta DAF - Pós-Vendas/Relatório Geral OS), lidos juntos.
  const [vendas, setVendas] = useState(null) // { rows, lidoEm }
  const [ordens, setOrdens] = useState(null) // { rows, lidoEm }
  // Cada relatório entra na tela assim que chega (o card não espera a leitura das O.S.).
  const [carregandoVendas, setCarregandoVendas] = useState(false)
  const [carregandoOrdens, setCarregandoOrdens] = useState(false)
  const [contratos, setContratos] = useState(null) // { rows, lidoEm } — Potencial Renovação
  const [carregandoContratos, setCarregandoContratos] = useState(false)
  const carregando = carregandoVendas || carregandoOrdens || carregandoContratos
  const [erroVendas, setErroVendas] = useState('')
  const [erroOrdens, setErroOrdens] = useState('')
  const [erroContratos, setErroContratos] = useState('')
  const erro = [erroVendas, erroOrdens, erroContratos].filter(Boolean).join(' · ')
  const buscar = async (rota, refresh, setDados, setCarregandoRota, setErroRota, nome) => {
    setCarregandoRota(true)
    setErroRota('')
    // Tempo limite de 3 min: se o backend não responder, o botão de atualizar para de girar e mostra o erro.
    const controle = new AbortController()
    const limite = setTimeout(() => controle.abort(), 180_000)
    try {
      const r = await fetch(`${BACKEND_URL}/api/planos-manutencao/${rota}${refresh ? '/refresh' : ''}`, { method: refresh ? 'POST' : 'GET', signal: controle.signal })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`)
      setDados(await r.json())
    } catch (e) {
      setErroRota(`Não foi possível ler ${nome}: ${e.name === 'AbortError' ? 'o servidor demorou mais de 3 minutos para responder' : e.message}`)
    } finally {
      clearTimeout(limite)
      setCarregandoRota(false)
    }
  }
  // Engrenagem → "Importar arquivo": envia o .xlsx do CRM DAF (Potencial Renovação), que substitui o arquivo da
  // pasta do SharePoint; a aba Contratos é atualizada com os contratos já relidos.
  const [importando, setImportando] = useState(false)
  const [avisoImportacao, setAvisoImportacao] = useState(null) // { ok, texto }
  const importarContratos = async (arquivo) => {
    if (!arquivo) return
    setImportando(true)
    setAvisoImportacao(null)
    try {
      const conteudoBase64 = await new Promise((resolve, reject) => {
        const leitor = new FileReader()
        leitor.onload = () => resolve(String(leitor.result).split(',')[1] || '')
        leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
        leitor.readAsDataURL(arquivo)
      })
      const r = await fetch(`${BACKEND_URL}/api/planos-manutencao/contratos/importar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: arquivo.name, conteudoBase64 }),
      })
      const corpo = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(corpo.error || `HTTP ${r.status}`)
      setContratos(corpo.dados)
      setErroContratos('')
      setAvisoImportacao({ ok: true, texto: `Arquivo importado: ${corpo.contratos.toLocaleString('pt-BR')} contrato(s) gravados em "${corpo.arquivo}" no SharePoint.` })
    } catch (e) {
      setAvisoImportacao({ ok: false, texto: `Não foi possível importar: ${e.message}` })
    } finally {
      setImportando(false)
    }
  }

  const carregarDados = (refresh = false) => {
    buscar('veiculos-vendidos', refresh, setVendas, setCarregandoVendas, setErroVendas, 'os Veículos Vendidos')
    buscar('ordens-servico', refresh, setOrdens, setCarregandoOrdens, setErroOrdens, 'as Ordens de Serviço')
    buscar('contratos', refresh, setContratos, setCarregandoContratos, setErroContratos, 'os Contratos')
  }
  useEffect(() => { carregarDados() }, [])

  const nomesEmpresasSel = useMemo(() => (empresasSel.length
    ? new Set(empresas.filter(e => empresasSel.includes(e.id)).map(e => (e.nome_empresa_sistema || '').toUpperCase()))
    : null), [empresas, empresasSel])

  // Busca de chassi: um só campo, aplicado às tabelas das três abas (o card do Resumo não muda).
  // Com algo digitado, as tabelas ignoram o filtro de data (procura em todo o histórico dos arquivos);
  // o seletor de Empresas continua valendo.
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toUpperCase()
  // Seletores de tipo do veículo (VN/VU: Resumo e Veículos Vendidos) e situação do contrato ('' = todos).
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroSituacao, setFiltroSituacao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState([]) // aba Contratos: Razão do Status do contrato (vários; vazio = todos)
  const [contratosTodos, setContratosTodos] = useState(false) // aba Contratos: ignora o período (só seletores)
  // aba Contratos: qual data do contrato o calendário filtra — 'criacao' (Data de Criação no CRM, padrão),
  // 'ambos' (início OU fim no período), 'inicio' ou 'fim'.
  const [tipoDataContrato, setTipoDataContrato] = useState('criacao')
  const [excluirCancelados, setExcluirCancelados] = useState(true) // aba Contratos: esconde status Cancelado (já vem marcado)
  const [visaoContratos, setVisaoContratos] = useState('') // aba Contratos: '' todos | 'novos' | 'renovacao' (botões)
  const [filtroRenovacao, setFiltroRenovacao] = useState('') // aba Contratos: '' todos | 'sim' renovados | 'nao' não renovados
  // Meses do filtro (abas Contratos e Ordens de Serviço); com busca de chassi, sem datas.
  const naTabela = useMemo(() => (termo ? todasAsDatas : dentroDosMeses(mesesFiltro)), [termo, chaveMeses])
  // Mês anterior de cada mês do filtro: Resumo e aba Veículos Vendidos (filtro em novembro → outubro).
  const noResumo = useMemo(() => dentroDosMeses(mesesAnteriores), [chaveMeses])
  // Meses do filtro, sem depender da busca: Contratos novos e renovados do Resumo.
  const noFiltro = useMemo(() => dentroDosMeses(mesesFiltro), [chaveMeses])
  // Metas dos velocímetros nos meses do filtro (com vários meses, a média das metas de cada mês).
  // Com algum mês do filtro sem meta, o indicador fica sem meta.
  const metas = useMemo(() => Object.fromEntries(INDICADORES_META.map(([ind]) => {
    const vals = mesesFiltro.map(am => metaDoMes(metasLinhas, ind, am))
    return [ind, vals.length && vals.every(v => v != null) ? vals.reduce((t, v) => t + v, 0) / vals.length : null]
  })), [metasLinhas, chaveMeses])

  // Contratos (um por chassi) com a data escolhida no mês do filtro Mês/Ano. O arquivo não traz a empresa
  // do cadastro (só o "Grupo" do CRM DAF), então o seletor de Empresas não filtra esta lista.
  const listaContratos = useMemo(() => {
    if (!contratos) return []
    return contratos.rows
      .filter(r => {
        if (contratosTodos) return true
        const noPeriodo = naTabela
        if (tipoDataContrato === 'criacao') return noPeriodo(r.criacao)
        if (tipoDataContrato === 'inicio') return noPeriodo(r.inicio)
        if (tipoDataContrato === 'ambos') return noPeriodo(r.inicio) || noPeriodo(r.fim)
        return noPeriodo(r.fim)
      })
      .sort((a, b) => (a.fim || '').localeCompare(b.fim || '') || a.contrato.localeCompare(b.contrato, 'pt-BR', { numeric: true }))
  }, [contratos, naTabela, contratosTodos, tipoDataContrato])

  // Abas Ordens de Serviço e Contratos: uma linha por O.S. P04, conciliando pela empresa + número da O.S.:
  // - ROF001 (O.S. aberta, base): todas as O.S. com abertura, chassi, situação e valor da O.S.;
  // - ROF017 (faturamento): onde se localiza a NF — número, data, TMO e valor faturado.
  // Status: Emitida = O.S. localizada no ROF017; Cancelada = situação Cancelada no ROF001; Em aberto = sem NF.
  // O ROF001 só cobre o ano atual: O.S. que só estão no ROF017 (2024, 2025) também entram, para nada sumir.
  // "Ver todos (sem filtro de data)" das abas Oportunidade, Veículos Vendidos e Ordens de Serviço.
  const [verTodosOport, setVerTodosOport] = useState(false)
  const [filtroTipoOp, setFiltroTipoOp] = useState('') // aba Oportunidades: '' todos | 'Novo' | 'Renovação'
  const [filtroRealizado, setFiltroRealizado] = useState('') // aba Oportunidades: '' todos | 'sim' | 'nao'
  const [verTodosVendas, setVerTodosVendas] = useState(false)
  const [verTodosOs, setVerTodosOs] = useState(false)
  const [tipoDataOs, setTipoDataOs] = useState('abertura') // seletor de data: 'abertura' (padrão) ou 'nf'
  const [filtroStatusOs, setFiltroStatusOs] = useState('') // '' todas | 'Emitida' | 'Em aberto' | 'Cancelada'
  const osConciliadas = useMemo(() => {
    if (!ordens) return []
    const porOs = new Map()
    const pegar = (empresa, os) => {
      const k = `${empresa.toUpperCase()}|${os}`
      if (!porOs.has(k)) porOs.set(k, { empresa_nome: empresa, os, aberta: null, fat: [] })
      return porOs.get(k)
    }
    ;(ordens.abertas || []).forEach(r => { pegar(r.empresa_nome, r.os).aberta = r })
    ordens.rows.forEach(r => pegar(r.empresa_nome, r.os).fat.push(r))
    const unicos = (lista) => [...new Set(lista.filter(Boolean))].join(', ')
    return [...porOs.values()].map(o => {
      const a = o.aberta
      const f = o.fat[0]
      const status = o.fat.length ? 'Emitida' : (a?.situacao || '').toLowerCase() === 'cancelada' ? 'Cancelada' : 'Em aberto'
      return {
        empresa_nome: o.empresa_nome,
        os: o.os,
        data_abertura: a?.data_abertura || f?.data_abertura || null,
        chassi: a?.chassi || f?.chassi || '',
        cliente: a?.cliente || '',
        tmo: unicos(o.fat.map(x => x.tmo)),
        tmo_codigo: unicos(o.fat.map(x => x.tmo_codigo)),
        tmo_descricao: unicos(o.fat.map(x => x.tmo_descricao)),
        status,
        andamento: a?.situacao || '',
        nf: unicos(o.fat.map(x => x.nf)),
        data_nf: f?.data || null,
        vl_os: a ? a.vl_os : null,                                              // ROF001
        vl_nf: o.fat.length ? o.fat.reduce((s, x) => s + x.vl_total, 0) : null, // ROF017
        noRof001: !!a,
        fontes: [a && 'ROF001', o.fat.length && 'ROF017'].filter(Boolean).join(' + '),
      }
    })
  }, [ordens])
  const dataOs = r => (tipoDataOs === 'nf' ? r.data_nf : r.data_abertura || r.data_nf)
  // Aba Ordens de Serviço: só as O.S. do ROF001 TODAS (o ROF017 entra só para localizar a NF).
  const listaOs = useMemo(() => osConciliadas.filter(r => r.noRof001)
    .filter(r => { const d = dataOs(r); return (verTodosOs ? !!d : naTabela(d)) && (!nomesEmpresasSel || nomesEmpresasSel.has(r.empresa_nome.toUpperCase())) })
    .sort((a, b) => (dataOs(b) || '').localeCompare(dataOs(a) || '') || a.os.localeCompare(b.os, 'pt-BR', { numeric: true })),
  [osConciliadas, nomesEmpresasSel, naTabela, tipoDataOs, verTodosOs])

  // Chassis vendidos entre as datas e nas empresas selecionadas: venda (VEN) soma, devolução (DVE) desconta;
  // conta o chassi com saldo > 0 (vendido e devolvido some; devolvido e revendido conta uma vez).
  // A empresa do relatório casa com o cadastro pelo "Nome no sistema" (nome_empresa_sistema).
  // Cada chassi vem com os dados da venda mais recente.
  const montarChassis = (noPeriodo) => {
    if (!vendas) return []
    const saldo = {}
    const ultimaVenda = {}
    vendas.rows.forEach(r => {
      if (r.cancelada || !noPeriodo(r.data)) return
      if (nomesEmpresasSel && !nomesEmpresasSel.has(r.empresa_nome.toUpperCase())) return
      const s = r.movimento === 'VEN' ? 1 : r.movimento === 'DVE' ? -1 : 0
      if (s) saldo[r.chassi] = (saldo[r.chassi] || 0) + s
      if (s === 1 && (!ultimaVenda[r.chassi] || r.data >= ultimaVenda[r.chassi].data)) ultimaVenda[r.chassi] = r
    })
    return Object.keys(saldo).filter(c => saldo[c] > 0).map(c => ultimaVenda[c])
      .sort((a, b) => b.data.localeCompare(a.data) || a.chassi.localeCompare(b.chassi))
  }
  // Resumo e aba Veículos Vendidos: mês anterior ao do filtro Mês/Ano (filtro em novembro → outubro).
  const listaChassis = useMemo(() => montarChassis(noResumo), [vendas, nomesEmpresasSel, noResumo])
  // Aba Veículos Vendidos: também o mês anterior ao do filtro (como o Resumo); com busca, sem datas.
  const listaChassisTabela = useMemo(() => (termo || verTodosVendas ? montarChassis(todasAsDatas) : listaChassis), [listaChassis, vendas, nomesEmpresasSel, termo, verTodosVendas])
  // Todas as O.S. P04 por chassi (sem filtro de período: a O.S. pode ser de qualquer data após a venda).
  // Data da O.S. = abertura (OS_DataCriacao do ROF017); sem ela, encerramento ou NF.
  const osPorChassi = useMemo(() => {
    const m = {}
    ordens?.rows.forEach(r => { (m[r.chassi.toUpperCase()] ||= []).push({ ...r, dataOs: r.data_abertura || r.data_encerramento || r.data }) })
    return m
  }, [ordens])

  // Situação do contrato de cada venda — só dois relatórios (vendas + ROF017), para conferir direto no Dealer.net:
  // olha as O.S. P04 do chassi abertas na data da venda ou depois e o TMO delas:
  // - Novo contrato: tem TMO PLAN01 (código 3216);
  // - Renovação de contrato: tem TMO PLAN02 (código 3218);
  // - Sem contrato: nenhuma O.S. P04 com PLAN01/PLAN02 depois da venda (O.S. só de "Plano Manutenção OF" não conta).
  // Os contratos do chassi no CRM DAF (Potencial Renovação) vão junto só para mostrar no pop-up, não entram na regra.
  // O Potencial Renovação traz só o final do chassi (ex.: "RB147102"), por isso compara pelo fim.
  const situacaoContrato = (venda) => {
    const chassi = venda.chassi.toUpperCase()
    const contratosChassi = (contratos?.rows || []).filter(c => c.chassi && chassi.endsWith(c.chassi.toUpperCase()))
      .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''))
    const apos = (osPorChassi[chassi] || []).filter(o => o.dataOs && o.dataOs >= venda.data)
    const tipos = apos.map(o => tipoContratoTmo(o.tmo)).filter(Boolean)
    const situacao = tipos.includes('renovado') ? 'Renovação de contrato' : tipos.includes('novo') ? 'Novo contrato' : 'Sem contrato'
    return { situacao, os: situacao === 'Sem contrato' ? [] : apos, contratos: contratosChassi }
  }

  // Só os chassis da marca DAF: o card do Resumo conta os do período; a aba Veículos Vendidos lista os da tabela.
  const ehDaf = (r) => r.marca.toUpperCase() === 'DAF'
  // Resumo: parte dos veículos DAF vendidos no período (e do tipo escolhido no seletor). Os cards de contrato
  // contam, entre esses chassis, a Situação contrato da aba Veículos Vendidos (O.S. P04 após a venda).
  const resumoVendidos = useMemo(() => listaChassis
    .filter(ehDaf) // novos e usados juntos (o Resumo não tem seletor de tipo)
    .map(r => situacaoContrato(r).situacao), [listaChassis, osPorChassi, contratos])
  const chassisVendidos = resumoVendidos.length
  // Oportunidade de renovação: contratos do Potencial Renovação com Fim do contrato dentro do período.
  // Renovado = depois do fim, o chassi tem uma O.S. P04 (ROF017) ou um novo contrato no Potencial Renovação
  // (início a partir de 90 dias antes do fim e fim depois do fim deste). O Potencial Renovação guarda só o final do chassi (8 caracteres),
  // então a O.S. é comparada pelo final do chassi.
  // Também alimenta a coluna "Renovado" e o seletor de Renovação da aba Contratos.
  const contratosRenovados = useMemo(() => {
    const osPorFinal = {}
    Object.entries(osPorChassi).forEach(([chassi, lista]) => { (osPorFinal[chassi.slice(-8)] ||= []).push(...lista) })
    const contratosPorChassi = {}
    ;(contratos?.rows || []).forEach(c => { (contratosPorChassi[c.chassi.toUpperCase()] ||= []).push(c) })
    // contrato → { os, novos }: as O.S. P04 e os novos contratos do chassi após o fim (mostrados no pop-up da coluna Origem).
    const m = new Map()
    ;(contratos?.rows || []).forEach(c => {
      if (!c.fim) return
      const chassi = c.chassi.toUpperCase()
      const os = (osPorFinal[chassi.slice(-8)] || []).filter(o => o.dataOs && o.dataOs >= c.fim)
      // Novo contrato = outro contrato do chassi que começa no máximo 90 dias antes do fim deste (ou depois) e termina
      // depois dele. A renovação costuma começar dias ANTES do fim do antigo (ex.: fim 06/08/2026, novo de 31/07/2026
      // a 31/07/2028); a janela de 90 dias evita contar contratos duplicados no CRM com 1 dia de diferença.
      const janela = menosDias(c.fim, 90)
      const novos = (contratosPorChassi[chassi] || []).filter(n => n !== c && n.contrato !== c.contrato
        && n.inicio && n.inicio >= janela && n.fim && n.fim > c.fim)
      // Se o chassi tem novo(s) contrato(s) e todos estão Cancelados, a renovação não se manteve: não conta como
      // renovado, mesmo com O.S. P04 depois do fim.
      const ehCancelado = (x) => (x.status || '').toLowerCase() === 'cancelado'
      if (novos.length && novos.every(ehCancelado)) return
      if (os.length || novos.length) m.set(c, { os, novos })
    })
    return m
  }, [contratos, osPorChassi])
  const [renovacaoModal, setRenovacaoModal] = useState(null) // contrato aberto no pop-up da coluna Origem
  const [oportunidadeModal, setOportunidadeModal] = useState(null) // aba Oportunidades: onde o contrato foi renovado
  const [vendaModal, setVendaModal] = useState(null) // aba Contratos: detalhe da venda do veículo do contrato
  // Notas de venda/devolução do chassi (o CRM traz só o final do chassi: compara pelos 8 últimos caracteres).
  const vendasPorFinal = useMemo(() => {
    const m = {}
    ;(vendas?.rows || []).forEach(v => { if (v.chassi) (m[v.chassi.toUpperCase().slice(-8)] ||= []).push(v) })
    return m
  }, [vendas])
  // Data da venda mais recente do chassi (só notas de venda).
  const ultimaVendaChassi = (chassi) => vendasDoChassi(chassi).find(x => x.movimento === 'VEN')
  const dataVendaChassi = (chassi) => ultimaVendaChassi(chassi)?.data || ''
  const vendasDoChassi = (chassi) => (vendasPorFinal[(chassi || '').toUpperCase().slice(-8)] || [])
    .slice().sort((a, b) => (b.data || '').localeCompare(a.data || ''))

  const contratosPorChassi = useMemo(() => {
    const m = {}
    ;(contratos?.rows || []).forEach(c => { (m[c.chassi.toUpperCase()] ||= []).push(c) })
    return m
  }, [contratos])
  const outrosDoChassi = (c) => (contratosPorChassi[c.chassi.toUpperCase()] || []).filter(n => n !== c && n.contrato !== c.contrato)
  // Situação do contrato (decisão de 07/11/2026): Renovação se o chassi tem contrato que começou antes deste
  // (de qualquer status); senão Novo. O pop-up da Renovação mostra o contrato anterior.
  const situacaoRenovacao = (c) => (contratoAnterior(c) ? 'renovacao' : 'novo')
  // Coluna O.S. da aba Contratos: o Potencial Renovação não traz a O.S. e as O.S. não trazem o contrato, então liga
  // pelo final do chassi (8 caracteres) + data: O.S. P04 conciliada (ROF001 + ROF017) aberta de 30 dias antes a 90
  // dias depois do Início do contrato; a mais próxima do início primeiro (na prática fica de 0 a 30 dias depois).
  // Faturada: só TMO de contrato (PLAN01 ou PLAN02). Ainda sem NF (sem TMO): entra, menos as Canceladas.
  const osDeContratoPorFinal = useMemo(() => {
    const m = {}
    osConciliadas.forEach(o => {
      if (!o.chassi || o.status === 'Cancelada') return
      if (o.tmo && !/PLAN0[12]/.test(o.tmo)) return
      ;(m[o.chassi.toUpperCase().slice(-8)] ||= []).push({ ...o, dataOs: o.data_abertura || o.data_nf })
    })
    return m
  }, [osConciliadas])
  const osDoContrato = (c) => {
    if (!c.inicio || !c.chassi) return []
    const ini = menosDias(c.inicio, 30), fim = menosDias(c.inicio, -90)
    const vistas = new Set()
    return (osDeContratoPorFinal[c.chassi.toUpperCase().slice(-8)] || [])
      .filter(o => o.dataOs && o.dataOs >= ini && o.dataOs <= fim)
      .sort((a, b) => Math.abs(new Date(a.dataOs) - new Date(c.inicio)) - Math.abs(new Date(b.dataOs) - new Date(c.inicio)))
      .filter(o => { const k = `${o.empresa_nome}#${o.os}`; if (vistas.has(k)) return false; vistas.add(k); return true })
  }
  // As O.S. do contrato já vêm conciliadas: abertura, status, NF, data e valor da NF.
  const dadosOsContrato = osDoContrato
  // Contrato anterior do chassi (pop-up de quem está como Renovado por ser o contrato da renovação).
  const contratoAnterior = (c) => outrosDoChassi(c).filter(n => n.inicio && c.inicio && n.inicio < c.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]
  // Contratos a serem renovados: Expirado com fim no mês ANTERIOR a cada mês do filtro, como os veículos vendidos
  // (filtro em novembro → vencidos em outubro). Cancelado e os demais status ficam fora.
  const listaARenovar = useMemo(() => (contratos?.rows || []).filter(c => noResumo(c.fim) && ehExpirado(c)), [contratos, noResumo])
  const renovacoesPeriodo = useMemo(() => ({
    aRenovar: listaARenovar.length, renovados: listaARenovar.filter(c => contratosRenovados.has(c)).length,
  }), [listaARenovar, contratosRenovados])

  // Resumo — Contratos novos e Contratos renovados (decisão de 07/11/2026): vêm da aba Contratos (CRM DAF), pela
  // coluna Situação (Novo / Renovação), contratos com Data de Criação nos meses do filtro (mês atual, não o anterior),
  // de qualquer status (inclusive Cancelado). Uma linha do arquivo (chassi do contrato) conta uma vez.
  const listaNovosCrm = useMemo(() => (contratos?.rows || []).filter(c => noFiltro(c.criacao) && situacaoRenovacao(c) === 'novo'),
    [contratos, noFiltro, contratosPorChassi])
  const listaRenovadosCrm = useMemo(() => (contratos?.rows || []).filter(c => noFiltro(c.criacao) && situacaoRenovacao(c) === 'renovacao'),
    [contratos, noFiltro, contratosPorChassi])
  const contratosCrm = { novos: listaNovosCrm.length, renovados: listaRenovadosCrm.length }

  // ⓘ dos cards do Resumo: de qual mês é cada número.
  // Contratos novos → mês da VENDA do veículo (última venda do chassi até a criação do contrato; sem venda = "Sem venda nossa").
  // Contratos renovados → mês do FIM do contrato anterior do chassi (o que foi renovado).
  // Sem contrato / Sem contrato renovado → a mesma conta do card, separada por esses meses.
  // Aba Evolução: resultado de cada mês do ano escolhido, com as mesmas regras do Resumo (vendidos e a renovar do
  // mês anterior; novos e renovados criados no próprio mês). Meses que ainda não chegaram ficam sem resultado.
  const resultadosEvolucao = useMemo(() => {
    if (aba !== 'Resultado' || visaoResultado === 'resumo' || !contratos) return {}
    const out = {}
    for (let m = 1; m <= 12; m++) {
      const am = anoMes(anoSel, m)
      if (am > anoMes(ANO_ATUAL, MES_ATUAL)) continue
      const noMes = dentroDosMeses([am])
      const noAnterior = dentroDosMeses([anoMesAnterior(am)])
      const criados = contratos.rows.filter(c => noMes(c.criacao))
      out[m] = {
        vendidos: vendas ? montarChassis(noAnterior).filter(ehDaf).length : null,
        novos: criados.filter(c => situacaoRenovacao(c) === 'novo').length,
        renovados: criados.filter(c => situacaoRenovacao(c) === 'renovacao').length,
        aRenovar: contratos.rows.filter(c => noAnterior(c.fim) && ehExpirado(c)).length,
      }
    }
    return out
  }, [aba, visaoResultado, anoSel, contratos, vendas, nomesEmpresasSel, contratosPorChassi])
  const tabelasPorMes = useMemo(() => {
    const SEM = 'zzzz'
    const rotulo = (m) => (m === SEM ? null : `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`)
    const vendasPorFinal = {}
    ;(vendas?.rows || []).forEach(v => { if (v.movimento === 'VEN' && !v.cancelada && v.data) (vendasPorFinal[v.chassi.toUpperCase().slice(-8)] ||= []).push(v) })
    const mesVenda = (c) => {
      const v = (vendasPorFinal[(c.chassi || '').toUpperCase().slice(-8)] || []).filter(x => !c.criacao || x.data <= c.criacao)
        .sort((a, b) => b.data.localeCompare(a.data))[0]
      return v ? v.data.slice(0, 7) : SEM
    }
    const mesFimAnterior = (c) => contratoAnterior(c)?.fim?.slice(0, 7) || SEM
    const contar = (lista, chave) => { const m = {}; lista.forEach(x => { const k = chave(x); m[k] = (m[k] || 0) + 1 }); return m }
    const meses = (...objs) => [...new Set(objs.flatMap(o => Object.keys(o)))].sort((a, b) => b.localeCompare(a))
    const n = (v) => (v || 0).toLocaleString('pt-BR')
    const novos = contar(listaNovosCrm, mesVenda)
    const renov = contar(listaRenovadosCrm, mesFimAnterior)
    const vend = contar(listaChassis.filter(ehDaf), r => r.data.slice(0, 7))
    const aRen = contar(listaARenovar, c => c.fim.slice(0, 7))
    const soma = (o) => Object.values(o).reduce((t, v) => t + v, 0)
    return {
      novos: {
        titulo: 'Contratos novos por mês da venda do veículo', colunas: ['Mês da venda', 'Contratos novos'],
        linhas: meses(novos).map(m => [rotulo(m) || 'Sem venda nossa', n(novos[m])]), total: ['Total', n(soma(novos))],
      },
      renovados: {
        titulo: 'Contratos renovados por mês do vencimento do contrato anterior', colunas: ['Mês do vencimento', 'Contratos renovados'],
        linhas: meses(renov).map(m => [rotulo(m) || 'Sem data', n(renov[m])]), total: ['Total', n(soma(renov))],
      },
      semContrato: {
        titulo: 'Conta por mês da venda', colunas: ['Mês da venda', 'Vendidos', 'Contratos novos', 'Sem contrato'],
        linhas: meses(vend, novos).map(m => [rotulo(m) || 'Sem venda nossa', n(vend[m]), n(novos[m]), n((vend[m] || 0) - (novos[m] || 0))]),
        total: ['Total', n(soma(vend)), n(soma(novos)), n(soma(vend) - soma(novos))],
      },
      semRenovacao: {
        titulo: 'Conta por mês do vencimento', colunas: ['Mês do vencimento', 'A serem renovados', 'Renovados', 'Sem renovação'],
        linhas: meses(aRen, renov).map(m => [rotulo(m) || 'Sem data', n(aRen[m]), n(renov[m]), n((aRen[m] || 0) - (renov[m] || 0))]),
        total: ['Total', n(soma(aRen)), n(soma(renov)), n(soma(aRen) - soma(renov))],
      },
    }
  }, [vendas, listaNovosCrm, listaRenovadosCrm, listaChassis, listaARenovar, contratosPorChassi])

  const contratosPeriodo = {
    novos: resumoVendidos.filter(s => s === 'Novo contrato').length,
    renovados: resumoVendidos.filter(s => s === 'Renovação de contrato').length,
  }
  const listaDaf = useMemo(() => listaChassisTabela.filter(ehDaf)
    .map(r => ({ ...r, ...situacaoContrato(r) })), [listaChassisTabela, osPorChassi, contratos])
  const [osModal, setOsModal] = useState(null) // venda com as O.S. P04 encontradas, para o pop-up

  // O Potencial Renovação guarda só o final do chassi, então lá também casa quando a busca termina com ele.
  const casaChassi = (chassi) => !termo || (chassi || '').toUpperCase().includes(termo)
  // Busca também por contrato e cliente (qualquer parte do texto, sem diferenciar maiúsculas).
  const casaTexto = (...valores) => !termo || valores.some(v => v && String(v).toUpperCase().includes(termo))
  const tabelaVendas = useMemo(() => listaDaf.filter(r => (casaChassi(r.chassi) || casaTexto(r.cliente))
    && (!filtroTipo || r.estoque_tipo === filtroTipo)
    && (!filtroSituacao || r.situacao === filtroSituacao)), [listaDaf, termo, filtroTipo, filtroSituacao])
  // Busca: chassi (das O.S. faturadas) ou número da O.S. (as em aberto ainda não têm chassi).
  const tabelaOs = useMemo(() => listaOs.filter(r => (casaChassi(r.chassi) || (termo && r.os.includes(termo)) || casaTexto(r.cliente))
    && (!filtroStatusOs || r.status === filtroStatusOs)), [listaOs, termo, filtroStatusOs])
  // Botões da aba Contratos: Novos = os do card Contratos novos do Resumo; Renovação = os contratos de renovação
  // vendidos (card Contratos renovados). Nesses dois a lista é a mesma do Resumo: tipo de data, "Ver todos" e
  // "Excluir cancelados" não valem. Os contratos a serem renovados ficam na aba Oportunidades.
  const baseContratos = visaoContratos === 'novos' ? listaNovosCrm : visaoContratos === 'renovacao' ? listaRenovadosCrm : listaContratos
  const tabelaContratos = useMemo(() => baseContratos.filter(r => (casaChassi(r.chassi) || casaTexto(r.contrato, r.cliente)
    || (termo.length > r.chassi.length && r.chassi && termo.endsWith(r.chassi.toUpperCase())))
    && (!filtroStatus.length || filtroStatus.includes(r.status))
    && (!filtroRenovacao || SITUACOES_CONTRATO[situacaoRenovacao(r)]?.label === filtroRenovacao)
    && (visaoContratos || !excluirCancelados || (r.status || '').toLowerCase() !== 'cancelado')), [baseContratos, visaoContratos, termo, filtroStatus, filtroRenovacao, contratosRenovados, excluirCancelados])
  // Opções do seletor de Status: os que existem no arquivo (Cancelado, Expirado - Prazo, Ativo com Gobrax...).
  const statusContratos = useMemo(() => [...new Set((contratos?.rows || []).map(r => r.status).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR')), [contratos])

  // Colunas ordenáveis de cada tabela (título → valor usado na ordenação). Datas vêm em AAAA-MM-DD, então ordenam como texto.
  // Aba Oportunidade: os mesmos contratos do card Contratos a serem renovados do mês anterior
  // (Expirado com fim no mês anterior a cada mês do filtro); a busca de chassi procura dentro dessa lista.
  // Aba Oportunidade — dois tipos de oportunidade:
  // - Novo: veículos DAF vendidos no mês anterior ao filtro (os mesmos do card Veículos vendidos). Realizado = o chassi
  //   tem contrato no CRM criado na data da venda ou depois (o CRM traz só o final do chassi: compara pelos 8 últimos).
  // - Renovação: contratos a serem renovados (Expirado com fim no mês anterior). Realizado = renovado (O.S. P04 ou novo
  //   contrato do chassi depois do fim — regra da coluna Renovado de antes).
  const contratosDoFinal = useMemo(() => {
    const m = {}
    ;(contratos?.rows || []).forEach(c => { if (c.chassi) (m[c.chassi.toUpperCase().slice(-8)] ||= []).push(c) })
    return m
  }, [contratos])
  const linhasOportunidade = useMemo(() => {
    const vendidos = (verTodosOport ? montarChassis(todasAsDatas) : listaChassis).filter(ehDaf)
    const novos = vendidos.map(v => {
      const final = v.chassi.toUpperCase().slice(-8)
      const fechados = (contratosDoFinal[final] || []).filter(c => !c.criacao || c.criacao >= v.data)
        .sort((a, b) => (a.criacao || '').localeCompare(b.criacao || ''))
      const os = Object.entries(osPorChassi).filter(([ch]) => ch.endsWith(final)).flatMap(([, l]) => l)
        .filter(o => o.dataOs && o.dataOs >= v.data)
      return {
        chave: `novo|${v.chassi}|${v.data}`, tipoOp: 'Novo', contrato: fechados[0]?.contrato || '', cliente: v.cliente, chassi: v.chassi, dataVenda: v.data,
        tipo: fechados[0]?.tipo || '', inicio: fechados[0]?.inicio || null, fim: fechados[0]?.fim || null, status: fechados[0]?.status || '',
        grupo: v.empresa_nome || '', realizado: fechados.length > 0, // empresa = NotaFiscal_EmpresaNom (relatório de vendas)
        detalhe: fechados.length ? { contrato: { contrato: '—', chassi: v.chassi, tipo: tipoVeiculo(v.estoque_tipo), inicio: v.data, fim: null, status: 'Veículo vendido' }, renovacao: { os, novos: fechados, modo: 'venda' } } : null,
      }
    })
    const renov = (verTodosOport ? (contratos?.rows || []).filter(ehExpirado) : listaARenovar).map(c => ({
      chave: `renovacao|${c.contrato}|${c.chassi}`, tipoOp: 'Renovação', contrato: c.contrato, cliente: c.cliente, chassi: c.chassi, dataVenda: null, tipo: c.tipo,
      inicio: c.inicio, fim: c.fim, status: c.status, grupo: c.grupo, realizado: contratosRenovados.has(c),
      detalhe: contratosRenovados.has(c) ? { contrato: c, renovacao: contratosRenovados.get(c) } : null,
    }))
    return [...novos, ...renov]
  }, [verTodosOport, listaChassis, vendas, nomesEmpresasSel, contratos, contratosDoFinal, osPorChassi, listaARenovar, contratosRenovados])
  const tabelaOportunidade = useMemo(() => linhasOportunidade.filter(r => (casaChassi(r.chassi) || casaTexto(r.contrato, r.cliente)
    || (termo.length > (r.chassi || '').length && r.chassi && termo.endsWith(r.chassi.toUpperCase())))
    && (!filtroTipoOp || r.tipoOp === filtroTipoOp)
    && (!filtroRealizado || (filtroRealizado === 'sim') === r.realizado))
    .sort((a, b) => a.tipoOp.localeCompare(b.tipoOp) || (a.dataVenda || a.fim || '').localeCompare(b.dataVenda || b.fim || '')),
  [linhasOportunidade, termo, filtroTipoOp, filtroRealizado])
  const ordOportunidade = useOrdenacao(tabelaOportunidade, {
    'Tipo oportunidade': r => r.tipoOp, Contrato: r => r.contrato, Cliente: r => r.cliente, Chassi: r => r.chassi,
    'Data venda': r => r.dataVenda || '', Tipo: r => r.tipo, Início: r => r.inicio || '', Fim: r => r.fim || '', Status: r => r.status,
    Realizado: r => (r.realizado ? 'Sim' : 'Não'), Ação: r => nomeAcao(opGravadas.get(r.chave)?.acao_id), Descrição: r => opGravadas.get(r.chave)?.descricao || '', Grupo: r => r.grupo,
  })
  const ordContratos = useOrdenacao(tabelaContratos, {
    Contrato: r => r.contrato, 'O.S.': r => Number(osDoContrato(r)[0]?.os) || 0, 'Abertura O.S.': r => dadosOsContrato(r)[0]?.data_abertura || '',
    'Status O.S.': r => dadosOsContrato(r)[0]?.status || '', Código: r => dadosOsContrato(r)[0]?.tmo || '', Descrição: r => dadosOsContrato(r)[0]?.tmo_descricao || '', NF: r => Number(dadosOsContrato(r)[0]?.nf) || 0, 'Data NF': r => dadosOsContrato(r)[0]?.data_nf || '',
    'Valor NF': r => dadosOsContrato(r).reduce((t, o) => t + (o.vl_nf || 0), 0), Criação: r => r.criacao, Cliente: r => r.cliente, Chassi: r => r.chassi, Tipo: r => r.tipo,
    Início: r => r.inicio, Fim: r => r.fim, Status: r => r.status, 'Data venda': r => dataVendaChassi(r.chassi) || '', 'NF venda': r => Number(ultimaVendaChassi(r.chassi)?.nf) || 0, Origem: r => SITUACOES_CONTRATO[situacaoRenovacao(r)]?.label || '', Grupo: r => r.grupo,
  })
  const ordOs = useOrdenacao(tabelaOs, {
    'O.S.': r => Number(r.os) || 0, Abertura: r => r.data_abertura, Chassi: r => r.chassi, Código: r => r.tmo, Descrição: r => r.tmo_descricao, 'Status NF': r => r.status,
    'Data NF': r => r.data_nf || '', 'Valor O.S.': r => r.vl_os ?? -1,
  })
  const ordVendas = useOrdenacao(tabelaVendas, {
    'Data venda': r => r.data, Empresa: r => r.empresa_nome, Chassi: r => r.chassi, Marca: r => r.marca,
    Modelo: r => r.modelo, Tipo: r => tipoVeiculo(r.estoque_tipo), Cliente: r => r.cliente, 'Situação contrato': r => r.situacao,
  })
  const campoBusca = (
    <div className="relative">
      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar chassi, contrato ou cliente"
        className={`${inputCls} pl-8 pr-7 py-2 w-80 max-w-full`} />
      {busca && (
        <button type="button" onClick={() => setBusca('')} aria-label="Limpar busca"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    // min-h-screen: com pouco conteúdo o min-h-full não cobria a área e aparecia o cinza claro do layout.
    <div className="min-h-screen bg-[#020617] p-6 space-y-5">
      {/* CABEÇALHO + FILTROS (mesmo modelo do Agendamento de Serviços, em azul) */}
      {/* Sem overflow-hidden: cortava a lista do seletor de empresas. O degradê leva o próprio arredondamento. */}
      <div className="relative z-10 rounded-lg border border-slate-200 shadow-sm bg-white">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-100 via-sky-50 to-transparent pointer-events-none" />
        <div className="relative flex flex-wrap items-stretch justify-between gap-4 p-5">
          <div className="flex items-center gap-3 self-start">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">Planos de Manutenção</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Planos de Manutenção — Pós-Venda</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 leading-tight">
                Última atualização: <strong className="text-slate-700">{carregandoVendas ? '...' : vendas?.lidoEm ? fmtDataHora(new Date(vendas.lidoEm)) : '—'}</strong>
              </p>
              {podeAtualizar && <button
                type="button"
                onClick={() => carregarDados(true)}
                disabled={carregando}
                title="Atualizar dados"
                aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>}
              {(podeImportar || podeCadastrarAcoes) && (
                <MenuEngrenagem importando={importando} onImportar={importarContratos} podeImportar={podeImportar}
                  onAcoes={podeCadastrarAcoes ? () => setAcoesAberto(true) : null} />
              )}
              {acoesAberto && <ModalCadastroAcoes acoes={acoesCad} onSalvar={salvarAcaoCad} onClose={() => setAcoesAberto(false)} />}
              {/* Manual operacional: página própria, sempre em outra aba. Link com target="_blank" em vez de
                  window.open, que alguns navegadores bloqueiam como pop-up ou abrem na mesma aba. */}
              <a href="/bi/planos-manutencao/manual" target="_blank" rel="noopener noreferrer"
                title="Manual operacional do BI (abre em outra aba)" aria-label="Manual operacional do BI"
                className="flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
              </a>
            </div>
            {erro && <p className="text-[10px] text-red-600 max-w-[420px] text-right leading-tight">{erro}</p>}
            {importando && <p className="text-[10px] text-slate-600 max-w-[420px] text-right leading-tight">Importando o arquivo do CRM DAF…</p>}
            {avisoImportacao && (
              <p className={`text-[10px] max-w-[420px] text-right leading-tight ${avisoImportacao.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {avisoImportacao.texto}
                <button type="button" onClick={() => setAvisoImportacao(null)} className="ml-1 text-slate-400 hover:text-slate-700" aria-label="Fechar aviso">✕</button>
              </p>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas</label>
                <SeletorEmpresas grupos={grupos} selecionadas={empresasSel} onChange={setEmpresasSel} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Mês/Ano</label>
                <div className="flex items-center gap-1.5">
                  {/* Ano + um ou mais meses dele (cada mês inteiro; o mês atual vai até ontem). */}
                  <select className={inputCls} aria-label="Ano" value={anoSel} onChange={e => escolherAno(e.target.value)}>
                    {Array.from({ length: Number(ANO_ATUAL) - ANO_INICIAL_FILTRO + 1 }, (_, i) => String(ANO_INICIAL_FILTRO + i)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  <SeletorMeses ano={anoSel} selecionados={mesesSel} onChange={setMesesSel} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {abasVisiveis.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-[12px] text-slate-500">
          Nenhuma aba deste BI está liberada para o seu grupo de acesso. Peça ao administrador para liberar em Grupos › BI — Planos de Manutenção.
        </div>
      )}
      <div className={`flex flex-col items-start gap-3 ${abasVisiveis.length ? '' : 'hidden'}`}>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {abasVisiveis.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => { setAba(a); if (a === 'Resultado') setVisaoResultado('resumo') }}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === a ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
        {/* Busca de chassi fora das tabelas, abaixo das abas; só nas abas com tabela. */}
        {/* Aba Resultado: botões de visualização (ícones), à direita da página e sem fundo. */}
        {aba === 'Resultado' && (
          <div className="self-end flex items-center gap-1">
            {VISOES_RESULTADO.map(([v, icone, titulo]) => {
              const Icone = { LayoutDashboard, Table2, BarChart3 }[icone]
              return (
                <button key={v} type="button" onClick={() => setVisaoResultado(v)} title={titulo} aria-label={titulo}
                  className={`p-2 rounded-md ${visaoResultado === v ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                  <Icone className="h-4 w-4" />
                </button>
              )
            })}
          </div>
        )}
        {aba !== 'Resultado' && (
          <div className="flex flex-wrap items-center gap-3 w-full">
            {aba === 'Contratos' && (
              <>
                {/* Novos / Renovação: os mesmos contratos dos cards do Resumo (Contratos novos / Contratos a serem renovados). */}
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                  {[['', 'Todos', null], ['novos', 'Novos', listaNovosCrm.length], ['renovacao', 'Renovação', listaRenovadosCrm.length]].map(([v, rot, qtd]) => (
                    <button key={v || 'todos'} type="button" onClick={() => setVisaoContratos(v)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${visaoContratos === v ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                      {rot}{qtd != null && <span className="ml-1 tabular-nums opacity-80">({qtd})</span>}
                    </button>
                  ))}
                </div>
                <select value={tipoDataContrato} onChange={e => setTipoDataContrato(e.target.value)} disabled={contratosTodos || !!visaoContratos}
                  className={`${inputCls} py-2 disabled:opacity-50`} aria-label="Tipo de data" title={visaoContratos ? 'Sem efeito nos botões Novos / Renovação' : contratosTodos ? 'Sem efeito com "Ver todos" marcado' : undefined}>
                  <option value="criacao">Data: Criação</option>
                  <option value="ambos">Data: Início e Fim</option>
                  <option value="inicio">Data: Início</option>
                  <option value="fim">Data: Fim</option>
                </select>
                <SeletorStatus opcoes={statusContratos} selecionados={filtroStatus} onChange={setFiltroStatus} />
                <select value={filtroRenovacao} onChange={e => setFiltroRenovacao(e.target.value)} className={`${inputCls} py-2`} aria-label="Origem">
                  <option value="">Contrato: Todos</option>
                  {/* Uma opção por nome: "Renovado" e "Substituído" juntam os dois lados (o contrato antigo e o novo). */}
                  {[...new Set(Object.values(SITUACOES_CONTRATO).map(s => s.label))].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </>
            )}
            {aba === 'Ordens de Serviço' && (
              <select value={tipoDataOs} onChange={e => setTipoDataOs(e.target.value)} className={`${inputCls} py-2`} aria-label="Tipo de data">
                <option value="abertura">Data: Abertura O.S.</option>
                <option value="nf">Data: Nota Fiscal</option>
              </select>
            )}
            {aba === 'Ordens de Serviço' && (
              <select value={filtroStatusOs} onChange={e => setFiltroStatusOs(e.target.value)} className={`${inputCls} py-2`} aria-label="Status da NF">
                <option value="">Status: Todos</option>
                <option value="Emitida">Emitida</option>
                <option value="Em aberto">Em aberto</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            )}
            {aba === 'Veículos Vendidos' && (
              <>
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={`${inputCls} py-2`} aria-label="Tipo">
                  <option value="">Tipo: Todos</option>
                  <option value="VN">Novo</option>
                  <option value="VU">Usado</option>
                </select>
                <select value={filtroSituacao} onChange={e => setFiltroSituacao(e.target.value)} className={`${inputCls} py-2`} aria-label="Situação contrato">
                  <option value="">Situação contrato: Todas</option>
                  {Object.keys(CORES_SITUACAO).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
            {aba === 'Oportunidades' && (
              <select value={filtroTipoOp} onChange={e => setFiltroTipoOp(e.target.value)} className={`${inputCls} py-2`} aria-label="Tipo oportunidade">
                <option value="">Tipo oportunidade: Todos</option>
                <option value="Novo">Novo</option>
                <option value="Renovação">Renovação</option>
              </select>
            )}
            {aba === 'Oportunidades' && (
              <select value={filtroRealizado} onChange={e => setFiltroRealizado(e.target.value)} className={`${inputCls} py-2`} aria-label="Realizado">
                <option value="">Realizado: Todos</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            )}
            {campoBusca}
            {/* Na mesma linha, encostado à direita da página. */}
            {aba === 'Contratos' && (
              <div className="ml-auto flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600 disabled:opacity-50" checked={excluirCancelados} disabled={!!visaoContratos} onChange={e => setExcluirCancelados(e.target.checked)} />
                  Excluir cancelados
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600 disabled:opacity-50" checked={contratosTodos} disabled={!!visaoContratos} onChange={e => setContratosTodos(e.target.checked)} />
                  Ver todos (sem filtro de data)
                </label>
              </div>
            )}
            {aba === 'Oportunidades' && (
              <label className="ml-auto flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={verTodosOport} onChange={e => setVerTodosOport(e.target.checked)} />
                Ver todos (sem filtro de data)
              </label>
            )}
            {aba === 'Veículos Vendidos' && (
              <label className="ml-auto flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={verTodosVendas} onChange={e => setVerTodosVendas(e.target.checked)} />
                Ver todos (sem filtro de data)
              </label>
            )}
            {aba === 'Ordens de Serviço' && (
              <label className="ml-auto flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={verTodosOs} onChange={e => setVerTodosOs(e.target.checked)} />
                Ver todos (sem filtro de data)
              </label>
            )}
          </div>
        )}
      </div>

      {/* Indicadores lado a lado, acima dos cards. */}
      {aba === 'Resultado' && visaoResultado === 'resumo' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Gauge
            label="Contratos novos"
            info={INFO_RESUMO.gaugeNovos}
            valor={(carregandoContratos && !contratos) || !chassisVendidos ? null : contratosCrm.novos / chassisVendidos * 100}
            detalhe={chassisVendidos ? `${contratosCrm.novos} de ${chassisVendidos} vendidos` : ''}
            ajuda="Contratos novos ÷ Veículos vendidos (por chassi) mês anterior"
            meta={metas.gaugeNovos}
          />
          <Gauge
            label="Contratos renovados"
            info={INFO_RESUMO.gaugeRenovados}
            valor={(carregandoContratos && !contratos) || !renovacoesPeriodo.aRenovar
              ? null : contratosCrm.renovados / renovacoesPeriodo.aRenovar * 100}
            detalhe={renovacoesPeriodo.aRenovar ? `${contratosCrm.renovados} de ${renovacoesPeriodo.aRenovar} a renovar` : ''}
            ajuda="Contratos renovados ÷ Contratos a serem renovados do mês anterior"
            meta={metas.gaugeRenovados}
          />
          {/* Potencial de contratos: as duas oportunidades juntas — vendas (contrato novo) e contratos vencendo (renovação).
              Meta automática: média das duas metas pesada pelas oportunidades (sem oportunidades, a média simples). */}
          <Gauge
            label="Potencial de contratos"
            meta={metaPotencial(metas.gaugeNovos, metas.gaugeRenovados, chassisVendidos, renovacoesPeriodo.aRenovar)}
            info={INFO_RESUMO.gaugePotencial}
            valor={(carregandoContratos && !contratos) || !(chassisVendidos + renovacoesPeriodo.aRenovar)
              ? null : (contratosCrm.novos + contratosCrm.renovados) / (chassisVendidos + renovacoesPeriodo.aRenovar) * 100}
            detalhe={chassisVendidos + renovacoesPeriodo.aRenovar
              ? `${contratosCrm.novos + contratosCrm.renovados} de ${chassisVendidos + renovacoesPeriodo.aRenovar} oportunidades` : ''}
            ajuda="(Contratos novos + Contratos renovados) ÷ (Veículos vendidos (por chassi) mês anterior + Contratos a serem renovados do mês anterior)"
          />
        </div>
      )}

      {/* Cards de contratos novos (sem subtítulo). */}
      {aba === 'Resultado' && visaoResultado === 'resumo' && (
        <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CardTruck
            label="Veículos vendidos (por chassi) mês anterior"
            info={INFO_RESUMO.vendidos}
            valor={carregandoVendas && !vendas ? '...' : vendas ? chassisVendidos.toLocaleString('pt-BR') : '—'}
            ajuda="Chassis DAF distintos vendidos no mês anterior ao filtro (vendas menos devoluções) — mesma lista da aba Veículos Vendidos"
          />
          <CardTruck
            label="Contratos novos"
            icone={FilePlus2}
            info={INFO_RESUMO.novos}
            tabela={tabelasPorMes.novos}
            cor="from-emerald-400 to-emerald-600"
            valor={carregandoContratos && !contratos ? '...' : contratos ? contratosCrm.novos.toLocaleString('pt-BR') : '—'}
            ajuda="Contratos da aba Contratos com Situação Novo e Data de Criação nos meses do filtro (todos os status)"
          />
          <CardTruck
            label="Sem contrato"
            info={INFO_RESUMO.semContrato}
            tabela={tabelasPorMes.semContrato}
            icone={FileX2}
            cor="from-red-400 to-red-600"
            // Veículos vendidos (por chassi) mês anterior − Contratos novos (CRM, criados nos meses do filtro).
            valor={(carregandoVendas && !vendas) || (carregandoContratos && !contratos) ? '...' : vendas && contratos ? (chassisVendidos - contratosCrm.novos).toLocaleString('pt-BR') : '—'}
            ajuda="Veículos vendidos (por chassi) mês anterior − Contratos novos"
          />
        </div>
        </div>
      )}

      {/* Oportunidade de renovação: contratos da aba Contratos com fim no período do filtro Mês/Ano. */}
      {aba === 'Resultado' && visaoResultado === 'resumo' && (
        <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <CardTruck
            label="Contratos a serem renovados do mês anterior"
            info={INFO_RESUMO.aRenovar}
            icone={CalendarClock}
            cor="from-amber-400 to-amber-600"
            valor={carregandoContratos && !contratos ? '...' : contratos ? renovacoesPeriodo.aRenovar.toLocaleString('pt-BR') : '—'}
            ajuda="Contratos (por chassi) com Fim do contrato no mês anterior ao filtro, só com status Expirado (Prazo ou KM)"
          />
          <CardTruck
            label="Contratos renovados"
            icone={Repeat}
            info={INFO_RESUMO.renovados}
            tabela={tabelasPorMes.renovados}
            cor="from-violet-400 to-violet-600"
            valor={carregandoContratos && !contratos ? '...' : contratos ? contratosCrm.renovados.toLocaleString('pt-BR') : '—'}
            ajuda="Contratos da aba Contratos com Situação Renovação e Data de Criação nos meses do filtro (todos os status)"
          />
          <CardTruck
            label="Sem contrato renovado"
            info={INFO_RESUMO.semRenovacao}
            tabela={tabelasPorMes.semRenovacao}
            icone={CalendarX2}
            cor="from-red-400 to-red-600"
            // Contratos a serem renovados do mês anterior − Contratos renovados (CRM, criados nos meses do filtro).
            valor={carregandoContratos && !contratos ? '...' : contratos ? (renovacoesPeriodo.aRenovar - contratosCrm.renovados).toLocaleString('pt-BR') : '—'}
            ajuda="Contratos a serem renovados do mês anterior − Contratos renovados"
          />
        </div>
        </div>
      )}

      {/* Totais: soma das duas linhas de cima (contrato novo + renovação). */}
      {aba === 'Resultado' && visaoResultado === 'resumo' && (() => {
        const carregandoTotais = (carregandoVendas && !vendas) || (carregandoContratos && !contratos)
        const prontos = vendas && contratos
        const oportunidades = chassisVendidos + renovacoesPeriodo.aRenovar
        const realizados = contratosCrm.novos + contratosCrm.renovados
        const fmt = (n) => (carregandoTotais ? '...' : prontos ? n.toLocaleString('pt-BR') : '—')
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CardTruck label="Oportunidades" icone={Target} info={INFO_RESUMO.totalOportunidades} cor="from-sky-400 to-sky-600"
              valor={fmt(oportunidades)} ajuda="Veículos vendidos (por chassi) mês anterior + Contratos a serem renovados do mês anterior" />
            <CardTruck label="Contratos realizados" icone={CheckCircle2} info={INFO_RESUMO.totalRealizados} cor="from-emerald-400 to-emerald-600"
              valor={fmt(realizados)} ajuda="Contratos novos + Contratos renovados" />
            <CardTruck label="Contratos não realizados" icone={XCircle} info={INFO_RESUMO.totalNaoRealizados} cor="from-red-400 to-red-600"
              valor={fmt(oportunidades - realizados)} ajuda="Sem contrato + Sem contrato renovado" />
          </div>
        )
      })()}

      {aba === 'Contratos' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">{visaoContratos === 'novos' ? 'Contratos novos (criados no mês, como no Resumo)'
              : visaoContratos === 'renovacao' ? 'Contratos de renovação (criados no mês, como no Resumo)'
              : contratosTodos ? 'Contratos — todas as datas' : `Contratos por ${TEXTO_TIPO_DATA[tipoDataContrato]}`}</p>
            {/* Quantidade de contratos da tabela, já com os filtros e a busca aplicados. */}
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold tabular-nums">
              {carregandoContratos && !contratos ? '...' : `${tabelaContratos.length.toLocaleString('pt-BR')} contrato${tabelaContratos.length === 1 ? '' : 's'}`}
            </span>
            <BotaoInfo noTitulo titulo="Contratos" secoes={[['Fonte (arquivo)', FONTE_TABELAS.contratos]]} />
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {/* A coluna de origem se chama "Situação" na tela; por dentro segue a chave "Origem". */}
                  {['Contrato', 'Criação', 'Cliente', 'Chassi', 'Tipo', 'Início', 'Fim', 'Origem', 'Status', 'Data venda', 'NF venda', 'O.S.', 'Abertura O.S.', 'Código', 'Descrição', 'Status O.S.', 'NF', 'Data NF', 'Valor NF', 'Grupo'].map(h => (
                    <ThOrdena key={h} chave={h} titulo={h === 'Origem' ? 'Situação' : h} ordenacao={ordContratos} direita={h === 'Valor NF'} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordContratos.ordenada.map((r, i) => (
                  <tr key={`${r.contrato}-${r.chassi}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.contrato}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.criacao)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.cliente}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-1.5">
                        {r.chassi}
                        {/* Detalhe da venda do veículo (relatório de vendas), quando o chassi foi vendido por nós. */}
                        {vendasDoChassi(r.chassi).some(v => v.movimento === 'VEN') && (
                          <button type="button" onClick={() => setVendaModal(r)} title="Ver detalhe da venda do veículo" aria-label="Ver detalhe da venda do veículo"
                            className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                            <FileSearch className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tipo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.inicio)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.fim)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {(() => {
                        const s = situacaoRenovacao(r)
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SITUACOES_CONTRATO[s].cor}`}>{SITUACOES_CONTRATO[s].label}</span>
                            {/* Pop-up da Renovação: o contrato anterior do chassi. */}
                            {s === 'renovacao' && (
                              <button type="button" onClick={() => setRenovacaoModal(r)} title="Ver detalhes" aria-label="Ver detalhes"
                                className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                                <FileSearch className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(r.status)}`}>{r.status}</span>
                    </td>
                    {/* Data venda: última venda do chassi no relatório de vendas (— quando a venda não está no arquivo). */}
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{dataVendaChassi(r.chassi) ? fmtData(dataVendaChassi(r.chassi)) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{ultimaVendaChassi(r.chassi)?.nf || <span className="text-slate-300">—</span>}</td>
                    {/* O.S. do contrato (uma por linha quando há mais de uma) e o faturamento dela. */}
                    {(() => {
                      const lista = dadosOsContrato(r)
                      const vazio = <span className="text-slate-300">—</span>
                      const col = (fn, cls = '') => (
                        <td className={`px-3 py-1.5 whitespace-nowrap tabular-nums ${cls}`}>
                          {lista.length ? lista.map((o, k) => <div key={k}>{fn(o) || vazio}</div>) : vazio}
                        </td>
                      )
                      return (
                        <>
                          {col(o => o.os)}
                          {col(o => fmtData(o.data_abertura))}
                          {col(o => o.tmo)}
                          {col(o => o.tmo_descricao, 'font-sans')}
                          {col(o => (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${COR_STATUS_OS[o.status]}`}>{o.status}</span>
                          ))}
                          {col(o => o.nf)}
                          {col(o => (o.data_nf ? fmtData(o.data_nf) : ''))}
                          {col(o => (o.vl_nf == null ? '' : fmtBRL(o.vl_nf)), 'text-right font-semibold')}
                        </>
                      )
                    })()}
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.grupo}</td>
                  </tr>
                ))}
                {tabelaContratos.length === 0 && (
                  <tr><td colSpan={20} className="px-3 py-6 text-center text-slate-400">{carregandoContratos ? 'Carregando...' : 'Nenhum contrato no período.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'Oportunidades' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">{verTodosOport ? 'Oportunidades — todas as datas' : 'Oportunidades do mês anterior'}</p>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold tabular-nums">
              {carregandoContratos && !contratos ? '...' : `${tabelaOportunidade.length.toLocaleString('pt-BR')} oportunidade${tabelaOportunidade.length === 1 ? '' : 's'}`}
            </span>
            <BotaoInfo noTitulo titulo="Oportunidades" secoes={[['Fonte (arquivo)', FONTE_TABELAS.oportunidade]]} />
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {['Tipo oportunidade', 'Contrato', 'Cliente', 'Chassi', 'Data venda', 'Tipo', 'Início', 'Fim', 'Status', 'Realizado', 'Ação', 'Descrição', 'Grupo'].map(h => (
                    <ThOrdena key={h} titulo={h} ordenacao={ordOportunidade} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordOportunidade.ordenada.map((r, i) => (
                  <tr key={`${r.tipoOp}-${r.contrato}-${r.chassi}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.tipoOp === 'Novo' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{r.tipoOp}</span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.contrato || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.cliente}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{r.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.dataVenda ? fmtData(r.dataVenda) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tipo || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.inicio ? fmtData(r.inicio) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.fim ? fmtData(r.fim) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {r.status ? <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(r.status)}`}>{r.status}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {/* Novo: o chassi fechou contrato no CRM depois da venda. Renovação: O.S. P04 ou novo contrato depois do fim. */}
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.realizado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{r.realizado ? 'Sim' : 'Não'}</span>
                        {r.detalhe && (
                          <button type="button" onClick={() => setOportunidadeModal(r.detalhe)} title="Ver detalhes" aria-label="Ver detalhes"
                            className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                            <FileSearch className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Ação e descrição gravadas no Supabase (bi_planos_oportunidades); o lápis abre a janela para informar. */}
                    {(() => {
                      const g = opGravadas.get(r.chave)
                      const nome = nomeAcao(g?.acao_id)
                      return (
                        <>
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              {nome ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">{nome}</span> : <span className="text-slate-300">—</span>}
                              {(podeDefinirAcao || g) && (
                                <button type="button" onClick={() => setAcaoModal(r)} title={podeDefinirAcao ? 'Informar ação' : 'Ver ação'} aria-label="Informar ação"
                                  className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                                  {podeDefinirAcao ? <Pencil className="h-3.5 w-3.5" /> : <FileSearch className="h-3.5 w-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-1.5 max-w-[260px] truncate" title={g?.descricao || undefined}>{g?.descricao || <span className="text-slate-300">—</span>}</td>
                        </>
                      )
                    })()}
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.grupo}</td>
                  </tr>
                ))}
                {tabelaOportunidade.length === 0 && (
                  <tr><td colSpan={13} className="px-3 py-6 text-center text-slate-400">{carregandoContratos ? 'Carregando...' : 'Nenhuma oportunidade no mês anterior.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'Resultado' && visaoResultado !== 'resumo' && (
        <AbaEvolucao visao={visaoResultado} podeEditar={podeEditarMetas} linhas={metasLinhas} ano={anoSel} resultados={resultadosEvolucao}
          info={metasInfo} onSalvar={salvarMetas} />
      )}

      {aba === 'Ordens de Serviço' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">{verTodosOs ? 'Ordens de Serviço — todas as datas' : tipoDataOs === 'nf' ? 'Ordens de Serviço por data da nota fiscal' : 'Ordens de Serviço por data de abertura'}</p>
            <BotaoInfo noTitulo titulo="Ordens de Serviço" secoes={[['Fonte (arquivo)', FONTE_TABELAS.os]]} />
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {/* ROF001 TODAS: O.S., abertura, chassi e valor; ROF017 (conciliação): descrição do serviço, Status NF e Data NF. */}
                  {['O.S.', 'Abertura', 'Chassi', 'Código', 'Descrição', 'Status NF', 'Data NF', 'Valor O.S.'].map(h => (
                    <ThOrdena key={h} titulo={h} ordenacao={ordOs} direita={h === 'Valor O.S.'} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordOs.ordenada.map((r, i) => (
                  <tr key={`${r.empresa_nome}-${r.os}-${i}`} className="hover:bg-slate-50" title={r.andamento ? `Situação no ROF001: ${r.andamento}` : undefined}>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.os}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.data_abertura)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{r.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={r.tmo_codigo ? `Código do TMO no ROF017: ${r.tmo_codigo}` : undefined}>{r.tmo || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tmo_descricao || <span className="text-slate-300">—</span>}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${COR_STATUS_OS[r.status]}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.data_nf)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right tabular-nums font-semibold">{r.vl_os == null ? '—' : fmtBRL(r.vl_os)}</td>
                  </tr>
                ))}
                {tabelaOs.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">{carregandoOrdens ? 'Carregando...' : 'Nenhuma O.S. P04 no período.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'Veículos Vendidos' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">{verTodosVendas ? 'Veículos Vendidos — todas as datas' : 'Veículos Vendidos por data de venda do mês anterior'}</p>
            {/* Quantidade de veículos da tabela, já com os filtros e a busca aplicados. */}
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold tabular-nums">
              {carregandoVendas && !vendas ? '...' : `${tabelaVendas.length.toLocaleString('pt-BR')} veículo${tabelaVendas.length === 1 ? '' : 's'}`}
            </span>
            <BotaoInfo noTitulo titulo="Veículos Vendidos por data de venda do mês anterior" secoes={[['Fonte (arquivo)', FONTE_TABELAS.vendidos]]} />
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {['Data venda', 'Empresa', 'Chassi', 'Marca', 'Modelo', 'Tipo', 'Cliente', 'Situação contrato'].map(h => (
                    <ThOrdena key={h} titulo={h} ordenacao={ordVendas} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordVendas.ordenada.map(r => (
                  <tr key={r.chassi} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.data)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.empresa_nome}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{r.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.marca}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.modelo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{tipoVeiculo(r.estoque_tipo)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.cliente}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {carregandoOrdens && !ordens ? <span className="text-slate-400">...</span> : (
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${CORES_SITUACAO[r.situacao]}`}>{r.situacao}</span>
                          {(r.os.length > 0 || r.contratos.length > 0) && (
                            <button type="button" onClick={() => setOsModal(r)} title="Ver ordem de serviço e contrato" aria-label="Ver ordem de serviço e contrato"
                              className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                              <FileSearch className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {tabelaVendas.length === 0 && (
                  <tr><td colSpan={8}className="px-3 py-6 text-center text-slate-400">{carregandoVendas ? 'Carregando...' : 'Nenhum chassi DAF vendido no período.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {osModal && <ModalOs venda={osModal} onFechar={() => setOsModal(null)} />}
      {acaoModal && (
        <ModalAcaoOportunidade linha={acaoModal} gravada={opGravadas.get(acaoModal.chave)} acoes={acoesCad} podeEditar={podeDefinirAcao}
          onSalvar={(dados) => salvarOportunidade(acaoModal, dados)} onClose={() => setAcaoModal(null)} />
      )}
      {vendaModal && <ModalVenda contrato={vendaModal} vendas={vendasDoChassi(vendaModal.chassi)} onFechar={() => setVendaModal(null)} />}
      {oportunidadeModal && (
        <ModalRenovacao contrato={oportunidadeModal.contrato} renovacao={oportunidadeModal.renovacao}
          onFechar={() => setOportunidadeModal(null)} />
      )}
      {renovacaoModal && (
        <ModalRenovacao contrato={renovacaoModal}
          renovacao={{ os: [], novos: [contratoAnterior(renovacaoModal)].filter(Boolean), modo: 'anterior', osContrato: dadosOsContrato(renovacaoModal) }}
          onFechar={() => setRenovacaoModal(null)} />
      )}
    </div>
  )
}

// Pop-up da coluna Situação (aba Contratos). Renovado: onde o contrato foi renovado — O.S. P04 do
// chassi e/ou novo contrato no Potencial Renovação. Substituído (renovacao.substituicao): o contrato que
// entrou no lugar do cancelado. Contrato da renovação (modo 'anterior'): o contrato que ele renovou.
// Nesses dois modos não há a parte de O.S.
// Pop-up da coluna Chassi (aba Contratos): as notas de venda/devolução do veículo no relatório de vendas.
function ModalVenda({ contrato, vendas, onFechar }) {
  return (
    <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white rounded-lg shadow-xl w-full min-w-0 max-w-6xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">Venda do Veículo</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Contrato {contrato.contrato} · Chassi <span className="font-mono">{contrato.chassi}</span> · {contrato.cliente}
            </p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                <tr>
                  {['Data', 'NF', 'Empresa', 'Chassi', 'Placa', 'Marca', 'Modelo', 'Tipo', 'Cliente'].map(h => (
                    <th key={h} className="text-left font-bold px-3 py-1.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {vendas.filter(v => v.movimento === 'VEN').map((v, i) => (
                  <tr key={i} className={v.cancelada ? 'text-slate-400 line-through' : ''}>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(v.data)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{v.nf}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{v.empresa_nome}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{v.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{v.placa}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{v.marca}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{v.modelo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{tipoVeiculo(v.estoque_tipo)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{v.cliente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function ModalRenovacao({ contrato, renovacao, onFechar }) {
  const modo = renovacao?.modo
  const substituicao = modo === 'substituicao' || modo === 'anterior' || modo === 'substituto'
  // Contrato que realmente deu início (marcado com o play verde): o primeiro, pela data de início, que não foi
  // Cancelado (ex.: entre DMS-16393 cancelado, DMS-28980 expirado e DMS-41821 cancelado → DMS-28980).
  const efetivo = [...(renovacao?.novos || [])]
    .filter(c => (c.status || '').toLowerCase() !== 'cancelado')
    .sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''))[0]
  const porOs = {}
  ;(renovacao?.os || []).forEach(o => { (porOs[`${o.empresa_nome}|${o.os}`] ||= []).push(o) })
  return (
    <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white rounded-lg shadow-xl w-full min-w-0 max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">{modo === 'venda' ? 'Contrato Novo — Plano de Manutenção' : `${modo === 'transicao' ? 'Transição' : modo === 'substituicao' || modo === 'substituto' ? 'Substituição' : 'Renovação'} do Contrato — Plano de Manutenção`}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {modo === 'venda'
                ? <>Chassi <span className="font-mono">{contrato.chassi}</span> · Veículo {contrato.tipo} · Venda em {fmtData(contrato.inicio)}</>
                : <>Contrato {contrato.contrato} · Chassi <span className="font-mono">{contrato.chassi}</span> · {contrato.tipo} · Início em {fmtData(contrato.inicio)} · Fim em {fmtData(contrato.fim)}</>}
            </p>
            {modo !== 'venda' && <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(contrato.status)}`}>{contrato.status}</span>}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* O novo contrato do chassi vem antes das O.S. (order-last). */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4">
          {!substituicao && <div className="order-last">
            <p className="text-[11px] font-semibold text-indigo-950 mb-2">
              {modo === 'transicao' ? 'Ordens de Serviço P04 do chassi desde o início do contrato anterior' : 'Ordens de Serviço'}
            </p>
            {Object.keys(porOs).length === 0 ? (
              <p className="text-[11px] text-slate-400">{modo === 'transicao' ? 'Nenhuma O.S. P04 do chassi nesse período.' : modo === 'venda' ? 'Nenhuma O.S. P04 do chassi depois da venda.' : 'Nenhuma O.S. P04 após o fim do contrato.'}</p>
            ) : (
              <div className="space-y-3">
                {Object.values(porOs).map(linhas => (
                  <div key={`${linhas[0].empresa_nome}|${linhas[0].os}`} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 bg-slate-50 text-[11px] text-slate-600">
                      <span>O.S. <strong className="text-slate-900">{linhas[0].os}</strong></span>
                      {linhas[0].data_abertura && <span>Abertura <strong className="text-slate-900">{fmtData(linhas[0].data_abertura)}</strong></span>}
                      <span>Chassi <strong className="text-slate-900 font-mono">{linhas[0].chassi}</strong></span>
                      {linhas[0].placa_os && <span>Placa <strong className="text-slate-900 font-mono">{linhas[0].placa_os}</strong></span>}
                      <span>NF <strong className="text-slate-900">{linhas[0].nf}</strong> em <strong className="text-slate-900">{fmtData(linhas[0].data)}</strong></span>
                      <span>{nomeEmpresa(linhas[0].empresa_nome)}</span>
                      <span className="w-full">{linhas[0].tipo_os}</span>
                    </div>
                    <table className="w-full text-[11px]">
                      <thead className="text-slate-500 uppercase text-[10px]">
                        <tr>
                          <th className="text-left font-bold px-3 py-1.5">TMO</th>
                          <th className="text-left font-bold px-3 py-1.5">Descrição</th>
                          <th className="text-right font-bold px-3 py-1.5">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {linhas.map((l, i) => (
                          <tr key={i}>
                            <td className="px-3 py-1.5 whitespace-nowrap">{l.tmo}</td>
                            <td className="px-3 py-1.5">{l.tmo_descricao}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{fmtBRL(l.vl_total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>}

          <div>
            <p className="text-[11px] font-semibold text-indigo-950 mb-2">
              {modo === 'substituicao' ? 'Contrato que substituiu este'
                : modo === 'anterior' ? 'Contrato anterior, que este renovou'
                : modo === 'substituto' ? 'Contrato cancelado, que este substituiu'
                : modo === 'transicao' ? 'Contrato anterior do chassi, de onde vem a transição'
                : modo === 'venda' ? 'Contrato fechado depois da venda' : 'Novo contrato do chassi'}
            </p>
            {!renovacao?.novos.length ? (
              <p className="text-[11px] text-slate-400">Nenhum novo contrato do chassi que vá além do fim deste contrato.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      {['Contrato', 'Criação', 'Tipo', 'Início', 'Fim', 'Status'].map(h => (
                        <th key={h} className="text-left font-bold px-3 py-1.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {renovacao.novos.map((c, i) => (
                      <tr key={`${c.contrato}-${i}`}>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            {/* Play no modelo de botão: círculo verde com triângulo branco. */}
                            {c === efetivo
                              ? (
                                <span className="w-4 h-4 rounded-full bg-[#34b89f] flex items-center justify-center shrink-0" title="Contrato que deu início" aria-label="Contrato que deu início">
                                  <Play className="h-2 w-2 text-white fill-white translate-x-[0.5px]" strokeWidth={3} />
                                </span>
                              )
                              : <span className="w-4 shrink-0" />}
                            {c.contrato}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(c.criacao)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{c.tipo}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(c.inicio)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(c.fim)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(c.status)}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Aba Contratos (lupa da Renovação): as O.S. P04 do próprio contrato — as mesmas das colunas da linha. */}
          {renovacao?.osContrato && (
            <div>
              <p className="text-[11px] font-semibold text-indigo-950 mb-2">Ordens de Serviço</p>
              {!renovacao.osContrato.length ? (
                <p className="text-[11px] text-slate-400">Nenhuma O.S. P04 do chassi perto do início deste contrato.</p>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <tr>
                        {['O.S.', 'Abertura', 'Código', 'Serviço', 'Status NF', 'NF', 'Data NF', 'Valor'].map(h => (
                          <th key={h} className={`font-bold px-3 py-1.5 whitespace-nowrap ${h === 'Valor' ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {renovacao.osContrato.map((o, i) => {
                        const valor = o.vl_nf ?? o.vl_os
                        return (
                          <tr key={`${o.os}-${i}`}>
                            <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{o.os}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(o.data_abertura)}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">{o.tmo || '—'}</td>
                            <td className="px-3 py-1.5">{o.tmo_descricao || '—'}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${COR_STATUS_OS[o.status] || ''}`}>{o.status}</span>
                            </td>
                            <td className="px-3 py-1.5 whitespace-nowrap">{o.nf || '—'}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{o.data_nf ? fmtData(o.data_nf) : '—'}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-right tabular-nums font-semibold">{valor == null ? '—' : fmtBRL(valor)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Pop-up com as O.S. P04 do chassi após a venda (uma O.S. pode ter vários TMOs).
function ModalOs({ venda, onFechar }) {
  const porOs = {}
  venda.os.forEach(o => { (porOs[o.os] ||= []).push(o) })
  return (
    <div className="fixed inset-y-0 right-0 left-16 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white rounded-lg shadow-xl w-full min-w-0 max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">Ordem de Serviço e Contrato — Plano de Manutenção</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Chassi <span className="font-mono">{venda.chassi}</span> · {tipoVeiculo(venda.estoque_tipo)} · Venda em {fmtData(venda.data)}
            </p>
            <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${CORES_SITUACAO[venda.situacao]}`}>{venda.situacao}</span>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {Object.entries(porOs).map(([os, linhas]) => (
            <div key={os} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 bg-slate-50 text-[11px] text-slate-600">
                <span>O.S. <strong className="text-slate-900">{os}</strong></span>
                {linhas[0].data_abertura && <span>Abertura <strong className="text-slate-900">{fmtData(linhas[0].data_abertura)}</strong></span>}
                <span>Chassi <strong className="text-slate-900 font-mono">{linhas[0].chassi}</strong></span>
                {/* Placa: da venda do veículo ou, sem ela, da O.S. no ROF017. */}
                {(venda.placa || linhas[0].placa_os) && <span>Placa <strong className="text-slate-900 font-mono">{venda.placa || linhas[0].placa_os}</strong></span>}
                <span>NF <strong className="text-slate-900">{linhas[0].nf}</strong> em <strong className="text-slate-900">{fmtData(linhas[0].data)}</strong></span>
                <span>{nomeEmpresa(linhas[0].empresa_nome)}</span>
                <span className="w-full">{linhas[0].tipo_os}</span>
              </div>
              <table className="w-full text-[11px]">
                <thead className="text-slate-500 uppercase text-[10px]">
                  <tr>
                    <th className="text-left font-bold px-3 py-1.5">TMO</th>
                    <th className="text-left font-bold px-3 py-1.5">Descrição</th>
                    <th className="text-right font-bold px-3 py-1.5">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {linhas.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5 whitespace-nowrap">{l.tmo}</td>
                      <td className="px-3 py-1.5">{l.tmo_descricao}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{fmtBRL(l.vl_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {venda.os.length === 0 && (
            <p className="text-[11px] text-slate-400">Nenhuma O.S. P04 após a venda.</p>
          )}

          {/* Contratos do chassi na aba Contratos (Potencial Renovação). */}
          <div>
            <p className="text-[11px] font-semibold text-indigo-950 mb-2">Contratos</p>
            {venda.contratos.length === 0 ? (
              <p className="text-[11px] text-slate-400">Nenhum contrato encontrado para este chassi.</p>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      {['Contrato', 'Tipo', 'Início', 'Fim', 'Status'].map(h => (
                        <th key={h} className="text-left font-bold px-3 py-1.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {venda.contratos.map((c, i) => (
                      <tr key={`${c.contrato}-${i}`}>
                        <td className="px-3 py-1.5 whitespace-nowrap">{c.contrato}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{c.tipo}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(c.inicio)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(c.fim)}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(c.status)}`}>{c.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
