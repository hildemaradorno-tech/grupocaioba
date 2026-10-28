import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Building2, Calendar, CalendarClock, CalendarX2, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, FilePlus2, FileSearch, FileX2, Info, Play, RefreshCw, RotateCcw, Repeat, Search, Truck, Wrench, X } from 'lucide-react'
import { apiService } from '../../services/supabaseClient'
import { empresaSelecionavel } from '../../utils/comissoesElegibilidade'
import { INFO_RESUMO } from './planosManutencaoTextos'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

// Abas do BI (as próximas entram aqui).
const ABAS = ['Resumo', 'Veículos Vendidos', 'Ordens de Serviço', 'Planos de Manutenção']
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

// Multisseleção de Status do contrato (aba Planos de Manutenção): nenhum marcado = todos.
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
// Período padrão: do dia 1 do mês até ontem (se hoje é dia 1, o mês de ontem).
const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
const DATA_MAX = iso(ontem)
// Título da tabela de contratos conforme o seletor Tipo de data.
const TEXTO_TIPO_DATA = { ambos: 'início ou fim do contrato no período', inicio: 'início do contrato no período', fim: 'fim do contrato no período' }
// Coluna Origem (aba Planos de Manutenção): rótulo e cor de cada situação ('na' = em branco).
// 'sim' = contrato expirado que foi renovado; 'renovacao' = o contrato que veio da renovação (os dois aparecem
// como "Renovado"; o seletor filtra pelo nome, juntando os dois).
const SITUACOES_CONTRATO = {
  sim: { label: 'Renovado', cor: 'bg-blue-100 text-blue-700' },
  renovacao: { label: 'Renovado', cor: 'bg-blue-100 text-blue-700' },
  nao: { label: 'Não renovado', cor: 'bg-red-100 text-red-700' },
  substituido: { label: 'Substituição', cor: 'bg-amber-100 text-amber-700' },
  substituto: { label: 'Substituição', cor: 'bg-amber-100 text-amber-700' },
  novo: { label: 'Novo', cor: 'bg-emerald-100 text-emerald-700' },
  validacao: { label: 'Em validação', cor: 'bg-violet-100 text-violet-700' },
}
// Status do CRM DAF de contrato ainda não efetivado (mesmo grupo roxo de corStatusContrato).
const ehEmValidacao = (c) => /^(validar|minuta|aguardando|pendente)/.test((c.status || '').toLowerCase())
// Status do contrato que entra na avaliação de renovação (coluna Origem e cards do Resumo).
const ehExpirado = (c) => (c.status || '').toLowerCase().startsWith('expirado')
const DATA_MIN = iso(new Date(ontem.getFullYear(), ontem.getMonth(), 1))

const inputCls = 'text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/40'
const fmtDataHora = (d) => d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Card com ícone (caminhão por padrão; cada indicador passa o seu).
// `cor` = degradê do quadrado do ícone (azul por padrão).

// Botão ⓘ dos cards/indicadores: abre um quadro com objetivo, fonte (arquivo), cálculo e filtros do número.
// O quadro abre centralizado na tela (portal, acima de tudo), para nunca sair da área visível — mesmo com o
// card no fim da página; fecha clicando fora ou no X.
function BotaoInfo({ titulo, info }) {
  const [aberto, setAberto] = useState(false)
  // Só objetivo e cálculo; fonte, filtros/regras e colunas ficam no Manual operacional (página /bi/planos-manutencao/manual).
  const secoes = [['Objetivo', info.objetivo], ['Cálculo', info.calculo]]
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={`Informações: ${titulo}`} title="Informações"
        className="absolute top-2 right-2 p-0.5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50">
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
                  <p className="text-[10px] font-bold uppercase text-blue-700">{nome}</p>
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

function CardTruck({ label, valor, ajuda, info, icone: Icone = Truck, cor = 'from-blue-400 to-blue-600' }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3" title={info ? undefined : ajuda}>
      {info && <BotaoInfo titulo={label} info={info} />}
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

// Velocímetro (meia-lua), no modelo do BI Agendamento de Serviços: arco cinza de fundo e arco azul até o valor (%).
function Gauge({ label, valor, detalhe, ajuda, info }) {
  const cx = 100, cy = 100, r = 70, esp = 36
  const ponto = (pct) => {
    const a = Math.PI * (1 - Math.min(Math.max(pct, 0), 100) / 100)
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)]
  }
  const arco = (pct) => { const [x, y] = ponto(pct); return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x} ${y}` }
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3" title={info ? undefined : ajuda}>
      {info && <BotaoInfo titulo={label} info={info} />}
      <p className="text-[11px] font-semibold text-indigo-950 leading-tight">{label}</p>
      <svg viewBox="0 0 200 118" className="w-full max-h-40 mt-1">
        <path d={arco(100)} fill="none" stroke="#e2e8f0" strokeWidth={esp} />
        {valor !== null && valor > 0 && <path d={arco(valor)} fill="none" stroke="#2563eb" strokeWidth={esp} />}
        <text x={cx} y={cy - 8} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 20, fontWeight: 700 }}>
          {valor === null ? '—' : `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
        </text>
        {detalhe && <text x={cx} y={cy + 8} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 9 }}>{detalhe}</text>}
        <text x={cx - r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>0%</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>100%</text>
      </svg>
    </div>
  )
}

export default function BiPlanosManutencao() {
  const [empresas, setEmpresas] = useState([])
  const [empresasSel, setEmpresasSel] = useState([]) // vazio = todas
  const [aba, setAba] = useState(ABAS[0])
  const [dataIni, setDataIni] = useState(DATA_MIN)
  const [dataFim, setDataFim] = useState(DATA_MAX)

  // Setas do calendário: pulam para o mês anterior/seguinte ao da data inicial (dia 1 ao último dia, limitado a ontem).
  const trocarMes = (passo) => {
    const [a, m] = dataIni.split('-').map(Number)
    const ini = new Date(a, m - 1 + passo, 1)
    const fim = iso(new Date(a, m + passo, 0))
    setDataIni(iso(ini))
    setDataFim(fim > DATA_MAX ? DATA_MAX : fim)
  }
  const podeAvancar = (() => {
    const [a, m] = dataIni.split('-').map(Number)
    return iso(new Date(a, m, 1)) <= DATA_MAX
  })()

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
  // O.S. tipo P04 (ROF042, pasta DAF - Pós-Vendas/Vendas Mecânicos), lidos juntos.
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
  const carregarDados = (refresh = false) => {
    buscar('veiculos-vendidos', refresh, setVendas, setCarregandoVendas, setErroVendas, 'os Veículos Vendidos')
    buscar('ordens-servico', refresh, setOrdens, setCarregandoOrdens, setErroOrdens, 'as Ordens de Serviço')
    buscar('contratos', refresh, setContratos, setCarregandoContratos, setErroContratos, 'os Planos de Manutenção')
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
  const [filtroStatus, setFiltroStatus] = useState([]) // aba Planos de Manutenção: Razão do Status do contrato (vários; vazio = todos)
  const [contratosTodos, setContratosTodos] = useState(false) // aba Planos de Manutenção: ignora o período (só seletores)
  // aba Planos de Manutenção: qual data do contrato o calendário filtra — 'ambos' (início OU fim no período), 'inicio' ou 'fim'.
  const [tipoDataContrato, setTipoDataContrato] = useState('ambos')
  const [excluirCancelados, setExcluirCancelados] = useState(true) // aba Planos de Manutenção: esconde status Cancelado (já vem marcado)
  const [filtroRenovacao, setFiltroRenovacao] = useState('') // aba Planos de Manutenção: '' todos | 'sim' renovados | 'nao' não renovados
  const [tabIni, tabFim] = termo ? ['0000-00-00', '9999-99-99'] : [dataIni, dataFim]

  // Contratos (um por chassi) com fim do contrato dentro do período. O arquivo não traz a empresa
  // do cadastro (só o "Grupo" do CRM DAF), então o seletor de Empresas não filtra esta lista.
  const listaContratos = useMemo(() => {
    if (!contratos) return []
    return contratos.rows
      .filter(r => {
        if (contratosTodos) return true
        const noPeriodo = (d) => d && d >= tabIni && d <= tabFim
        if (tipoDataContrato === 'inicio') return noPeriodo(r.inicio)
        if (tipoDataContrato === 'ambos') return noPeriodo(r.inicio) || noPeriodo(r.fim)
        return noPeriodo(r.fim)
      })
      .sort((a, b) => (a.fim || '').localeCompare(b.fim || '') || a.contrato.localeCompare(b.contrato, 'pt-BR', { numeric: true }))
  }, [contratos, tabIni, tabFim, contratosTodos, tipoDataContrato])

  // Linhas (TMOs) das O.S. P04 com NF no período, nas empresas selecionadas.
  const listaOs = useMemo(() => {
    if (!ordens) return []
    return ordens.rows
      .filter(r => r.data && r.data >= tabIni && r.data <= tabFim && (!nomesEmpresasSel || nomesEmpresasSel.has(r.empresa_nome.toUpperCase())))
      .sort((a, b) => b.data.localeCompare(a.data) || a.os.localeCompare(b.os, 'pt-BR', { numeric: true }))
  }, [ordens, nomesEmpresasSel, tabIni, tabFim])

  // Chassis vendidos entre as datas e nas empresas selecionadas: venda (VEN) soma, devolução (DVE) desconta;
  // conta o chassi com saldo > 0 (vendido e devolvido some; devolvido e revendido conta uma vez).
  // A empresa do relatório casa com o cadastro pelo "Nome no sistema" (nome_empresa_sistema).
  // Cada chassi vem com os dados da venda mais recente.
  const montarChassis = (ini, fim) => {
    if (!vendas) return []
    const saldo = {}
    const ultimaVenda = {}
    vendas.rows.forEach(r => {
      if (r.cancelada || !r.data || r.data < ini || r.data > fim) return
      if (nomesEmpresasSel && !nomesEmpresasSel.has(r.empresa_nome.toUpperCase())) return
      const s = r.movimento === 'VEN' ? 1 : r.movimento === 'DVE' ? -1 : 0
      if (s) saldo[r.chassi] = (saldo[r.chassi] || 0) + s
      if (s === 1 && (!ultimaVenda[r.chassi] || r.data >= ultimaVenda[r.chassi].data)) ultimaVenda[r.chassi] = r
    })
    return Object.keys(saldo).filter(c => saldo[c] > 0).map(c => ultimaVenda[c])
      .sort((a, b) => b.data.localeCompare(a.data) || a.chassi.localeCompare(b.chassi))
  }
  // Período do calendário (card do Resumo) e período da tabela (sem datas quando há busca).
  const listaChassis = useMemo(() => montarChassis(dataIni, dataFim), [vendas, nomesEmpresasSel, dataIni, dataFim])
  const listaChassisTabela = useMemo(() => (termo ? montarChassis(tabIni, tabFim) : listaChassis), [listaChassis, vendas, nomesEmpresasSel, termo, tabIni, tabFim])
  // Todas as O.S. P04 por chassi (sem filtro de período: a O.S. pode ser de qualquer data após a venda).
  // Data da O.S. = abertura (OS_DataCriacao do ROF017, completada no backend); sem ela, encerramento ou NF.
  const osPorChassi = useMemo(() => {
    const m = {}
    ordens?.rows.forEach(r => { (m[r.chassi.toUpperCase()] ||= []).push({ ...r, dataOs: r.data_abertura || r.data_encerramento || r.data }) })
    return m
  }, [ordens])

  // Situação do contrato de cada venda:
  // - Sem contrato: nenhuma O.S. P04 do chassi com data igual ou posterior à venda.
  // - Renovação de contrato: há O.S. P04 após a venda e o chassi já tinha contrato antes dela
  //   (O.S. P04 anterior à venda, ou contrato do Potencial Renovação iniciado antes da venda).
  // - Novo contrato: há O.S. P04 após a venda e nenhum contrato anterior.
  // O Potencial Renovação traz só o final do chassi (ex.: "RB147102"), por isso compara pelo fim.
  // Junto vão os contratos do chassi na aba Planos de Manutenção (todos, sem filtro de período), para o pop-up.
  const situacaoContrato = (venda) => {
    const chassi = venda.chassi.toUpperCase()
    const contratosChassi = (contratos?.rows || []).filter(c => c.chassi && chassi.endsWith(c.chassi.toUpperCase()))
      .sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''))
    const todas = osPorChassi[chassi] || []
    const apos = todas.filter(o => o.dataOs && o.dataOs >= venda.data)
    if (!apos.length) return { situacao: 'Sem contrato', os: [], contratos: contratosChassi }
    // O TMO da O.S. já diz o tipo (PLAN01 novo, PLAN02 renovação); sem um deles, vale o histórico do chassi.
    const tipos = apos.map(o => tipoContratoTmo(o.tmo)).filter(Boolean)
    if (tipos.length) {
      return { situacao: tipos.includes('renovado') ? 'Renovação de contrato' : 'Novo contrato', os: apos, contratos: contratosChassi }
    }
    const anterior = todas.some(o => o.dataOs && o.dataOs < venda.data)
      || contratosChassi.some(c => c.inicio && c.inicio < venda.data)
    return { situacao: anterior ? 'Renovação de contrato' : 'Novo contrato', os: apos, contratos: contratosChassi }
  }

  // Só os chassis da marca DAF: o card do Resumo conta os do período; a aba Veículos Vendidos lista os da tabela.
  const ehDaf = (r) => r.marca.toUpperCase() === 'DAF'
  // Resumo: parte dos veículos DAF vendidos no período (e do tipo escolhido no seletor). Os cards de contrato
  // contam, entre esses chassis, a Situação contrato da aba Veículos Vendidos (O.S. P04 após a venda).
  const resumoVendidos = useMemo(() => listaChassis
    .filter(r => ehDaf(r) && (!filtroTipo || r.estoque_tipo === filtroTipo))
    .map(r => situacaoContrato(r).situacao), [listaChassis, filtroTipo, osPorChassi, contratos])
  const chassisVendidos = resumoVendidos.length
  // Oportunidade de renovação: contratos do Potencial Renovação com Fim do contrato dentro do período.
  // Renovado = depois do fim, o chassi tem uma O.S. P04 (ROF042) ou um novo contrato no Potencial Renovação
  // (início a partir de 90 dias antes do fim e fim depois do fim deste). O Potencial Renovação guarda só o final do chassi (8 caracteres),
  // então a O.S. é comparada pelo final do chassi.
  // Também alimenta a coluna "Renovado" e o seletor de Renovação da aba Planos de Manutenção.
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

  // Coluna Origem da aba Planos de Manutenção:
  // - Expirado → Renovado ('sim') ou Não renovado ('nao'), pela regra acima;
  // - Cancelado trocado por outro contrato do mesmo chassi que começou depois do início e antes do fim dele
  //   → Substituído (ex.: DMS-37097 cancelado, trocado pelo DMS-51501); cancelado sem troca fica em branco;
  // - os demais olham o contrato anterior do chassi (o último que começou antes dele):
  //   sem anterior (1º contrato) → Novo; anterior Cancelado → Substituído ('substituto': entrou no lugar dele,
  //   ex.: DMS-51501 depois do DMS-37097); anterior Expirado, ou status "Renovado..." no CRM → Renovado
  //   ('renovacao': é o contrato da renovação); anterior ainda vigente (ex.: DMS-48038 Ativo → DMS-50711) → Novo.
  const contratosPorChassi = useMemo(() => {
    const m = {}
    ;(contratos?.rows || []).forEach(c => { (m[c.chassi.toUpperCase()] ||= []).push(c) })
    return m
  }, [contratos])
  const outrosDoChassi = (c) => (contratosPorChassi[c.chassi.toUpperCase()] || []).filter(n => n !== c && n.contrato !== c.contrato)
  const substitutos = (c) => outrosDoChassi(c).filter(n => n.inicio && c.inicio && c.fim && n.inicio > c.inicio && n.inicio < c.fim)
  const situacaoRenovacao = (c) => {
    if (ehExpirado(c)) return contratosRenovados.has(c) ? 'sim' : 'nao'
    if ((c.status || '').toLowerCase() === 'cancelado') return substitutos(c).length ? 'substituido' : 'na'
    // Contrato ainda não validado no CRM (Validar Serviço, Minuta Solicitada, Aguardando Assinatura, Pendente de
    // Contrato): não dá para dizer se é novo, renovação ou substituição até ser validado (ex.: DMS-50711).
    if (ehEmValidacao(c)) return 'validacao'
    if (!c.inicio) return 'na'
    const anterior = outrosDoChassi(c).filter(n => n.inicio && n.inicio < c.inicio)
      .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]
    if (!anterior) return 'novo'
    if ((anterior.status || '').toLowerCase() === 'cancelado') return 'substituto'
    if (ehExpirado(anterior) || (c.status || '').toLowerCase().startsWith('renovado')) return 'renovacao'
    return 'novo'
  }
  // Contrato anterior do chassi (pop-up de quem está como Renovado por ser o contrato da renovação).
  const contratoAnterior = (c) => outrosDoChassi(c).filter(n => n.inicio && c.inicio && n.inicio < c.inicio)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))[0]
  const renovacoesPeriodo = useMemo(() => {
    // Só contrato Expirado é oportunidade de renovação (mesma regra da coluna Origem); Cancelado e os demais ficam fora.
    const aRenovar = (contratos?.rows || []).filter(c => c.fim && c.fim >= dataIni && c.fim <= dataFim && ehExpirado(c))
    return { aRenovar: aRenovar.length, renovados: aRenovar.filter(c => contratosRenovados.has(c)).length }
  }, [contratos, contratosRenovados, dataIni, dataFim])

  const contratosPeriodo = {
    novos: resumoVendidos.filter(s => s === 'Novo contrato').length,
    renovados: resumoVendidos.filter(s => s === 'Renovação de contrato').length,
  }
  const listaDaf = useMemo(() => listaChassisTabela.filter(ehDaf)
    .map(r => ({ ...r, ...situacaoContrato(r) })), [listaChassisTabela, osPorChassi, contratos])
  const [osModal, setOsModal] = useState(null) // venda com as O.S. P04 encontradas, para o pop-up

  // O Potencial Renovação guarda só o final do chassi, então lá também casa quando a busca termina com ele.
  const casaChassi = (chassi) => !termo || chassi.toUpperCase().includes(termo)
  const tabelaVendas = useMemo(() => listaDaf.filter(r => casaChassi(r.chassi)
    && (!filtroTipo || r.estoque_tipo === filtroTipo)
    && (!filtroSituacao || r.situacao === filtroSituacao)), [listaDaf, termo, filtroTipo, filtroSituacao])
  const tabelaOs = useMemo(() => listaOs.filter(r => casaChassi(r.chassi)), [listaOs, termo])
  const tabelaContratos = useMemo(() => listaContratos.filter(r => (casaChassi(r.chassi)
    || (termo.length > r.chassi.length && r.chassi && termo.endsWith(r.chassi.toUpperCase())))
    && (!filtroStatus.length || filtroStatus.includes(r.status))
    && (!filtroRenovacao || (filtroRenovacao === 'na'
      ? situacaoRenovacao(r) === 'na'
      : SITUACOES_CONTRATO[situacaoRenovacao(r)]?.label === filtroRenovacao))
    && (!excluirCancelados || (r.status || '').toLowerCase() !== 'cancelado')), [listaContratos, termo, filtroStatus, filtroRenovacao, contratosRenovados, excluirCancelados])
  // Opções do seletor de Status: os que existem no arquivo (Cancelado, Expirado - Prazo, Ativo com Gobrax...).
  const statusContratos = useMemo(() => [...new Set((contratos?.rows || []).map(r => r.status).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR')), [contratos])

  // Colunas ordenáveis de cada tabela (título → valor usado na ordenação). Datas vêm em AAAA-MM-DD, então ordenam como texto.
  const ordContratos = useOrdenacao(tabelaContratos, {
    Contrato: r => r.contrato, Cliente: r => r.cliente, Chassi: r => r.chassi, Tipo: r => r.tipo,
    Início: r => r.inicio, Fim: r => r.fim, Status: r => r.status, Origem: r => SITUACOES_CONTRATO[situacaoRenovacao(r)]?.label || '', Grupo: r => r.grupo,
  })
  const ordOs = useOrdenacao(tabelaOs, {
    'Data NF': r => r.data, NF: r => r.nf, 'O.S.': r => r.os, Chassi: r => r.chassi, TMO: r => r.tmo,
    Descrição: r => r.tmo_descricao, 'Valor Total': r => r.vl_total,
  })
  const ordVendas = useOrdenacao(tabelaVendas, {
    'Data venda': r => r.data, Empresa: r => nomeEmpresa(r.empresa_nome), Chassi: r => r.chassi, Marca: r => r.marca,
    Modelo: r => r.modelo, Tipo: r => tipoVeiculo(r.estoque_tipo), Cliente: r => r.cliente, 'Situação contrato': r => r.situacao,
  })
  const campoBusca = (
    <div className="relative">
      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar chassi"
        className={`${inputCls} pl-8 pr-7 py-2 w-60`} />
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
              <button
                type="button"
                onClick={() => carregarDados(true)}
                disabled={carregando}
                title="Atualizar dados"
                aria-label="Atualizar dados"
                className="flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
              </button>
              {/* Manual operacional: página própria, sempre em outra aba. Link com target="_blank" em vez de
                  window.open, que alguns navegadores bloqueiam como pop-up ou abrem na mesma aba. */}
              <a href="/bi/planos-manutencao/manual" target="_blank" rel="noopener noreferrer"
                title="Manual operacional do BI (abre em outra aba)" aria-label="Manual operacional do BI"
                className="flex items-center justify-center p-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                <BookOpen className="h-3.5 w-3.5" />
              </a>
            </div>
            {erro && <p className="text-[10px] text-red-600 max-w-[420px] text-right leading-tight">{erro}</p>}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Building2 className="h-3 w-3" /> Empresas</label>
                <SeletorEmpresas grupos={grupos} selecionadas={empresasSel} onChange={setEmpresasSel} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Calendar className="h-3 w-3" /> Data</label>
                <div className="flex items-center gap-1.5">
                  <input type="date" className={inputCls} max={dataFim || DATA_MAX} value={dataIni} onChange={e => e.target.value && setDataIni(e.target.value)} />
                  <span className="text-slate-400 text-xs">até</span>
                  <input type="date" className={inputCls} min={dataIni} max={DATA_MAX} value={dataFim} onChange={e => e.target.value && setDataFim(e.target.value)} />
                  <button type="button" onClick={() => trocarMes(-1)} title="Mês anterior" aria-label="Mês anterior"
                    className="p-1 rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => trocarMes(1)} disabled={!podeAvancar} title="Próximo mês" aria-label="Próximo mês"
                    className="p-1 rounded-md bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  {/* Volta direto ao mês atual (dia 1 até ontem). */}
                  <button type="button" onClick={() => { setDataIni(DATA_MIN); setDataFim(DATA_MAX) }}
                    disabled={dataIni === DATA_MIN && dataFim === DATA_MAX} title="Voltar ao mês atual"
                    aria-label="Voltar ao mês atual" className="p-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-3">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {ABAS.map(a => (
            <button
              key={a}
              type="button"
              onClick={() => setAba(a)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${aba === a ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {a}
            </button>
          ))}
        </div>
        {aba === 'Resumo' && (
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={`${inputCls} py-2`} aria-label="Tipo de veículo vendido">
            <option value="">Tipo de veículo vendido: Todos</option>
            <option value="VN">Novo</option>
            <option value="VU">Usado</option>
          </select>
        )}
        {/* Busca de chassi fora das tabelas, abaixo das abas; só nas abas com tabela. */}
        {aba !== 'Resumo' && (
          <div className="flex flex-wrap items-center gap-3 w-full">
            {aba === 'Planos de Manutenção' && (
              <>
                <select value={tipoDataContrato} onChange={e => setTipoDataContrato(e.target.value)} disabled={contratosTodos}
                  className={`${inputCls} py-2 disabled:opacity-50`} aria-label="Tipo de data" title={contratosTodos ? 'Sem efeito com "Ver todos" marcado' : undefined}>
                  <option value="ambos">Data: Início e Fim</option>
                  <option value="inicio">Data: Início</option>
                  <option value="fim">Data: Fim</option>
                </select>
                <SeletorStatus opcoes={statusContratos} selecionados={filtroStatus} onChange={setFiltroStatus} />
                <select value={filtroRenovacao} onChange={e => setFiltroRenovacao(e.target.value)} className={`${inputCls} py-2`} aria-label="Origem">
                  <option value="">Contrato: Todos</option>
                  {/* Uma opção por nome: "Renovado" e "Substituído" juntam os dois lados (o contrato antigo e o novo). */}
                  {[...new Set(Object.values(SITUACOES_CONTRATO).map(s => s.label))].map(l => <option key={l} value={l}>{l}</option>)}
                  <option value="na">Sem situação (em branco)</option>
                </select>
              </>
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
            {campoBusca}
            {/* Na mesma linha, encostado à direita da página. */}
            {aba === 'Planos de Manutenção' && (
              <div className="ml-auto flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={excluirCancelados} onChange={e => setExcluirCancelados(e.target.checked)} />
                  Excluir cancelados
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-white cursor-pointer select-none">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={contratosTodos} onChange={e => setContratosTodos(e.target.checked)} />
                  Ver todos (sem filtro de data)
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Indicadores lado a lado, acima dos cards. */}
      {aba === 'Resumo' && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <Gauge
            label="Contratos novos"
            info={INFO_RESUMO.gaugeNovos}
            valor={(carregandoOrdens && !ordens) || !chassisVendidos ? null : contratosPeriodo.novos / chassisVendidos * 100}
            detalhe={chassisVendidos ? `${contratosPeriodo.novos} de ${chassisVendidos} vendidos` : ''}
            ajuda="Contratos novos ÷ veículos vendidos no período (mesmos filtros dos cards)"
          />
          <Gauge
            label="Contratos renovados"
            info={INFO_RESUMO.gaugeRenovados}
            valor={(carregandoContratos && !contratos) || (carregandoOrdens && !ordens) || !renovacoesPeriodo.aRenovar
              ? null : renovacoesPeriodo.renovados / renovacoesPeriodo.aRenovar * 100}
            detalhe={renovacoesPeriodo.aRenovar ? `${renovacoesPeriodo.renovados} de ${renovacoesPeriodo.aRenovar} a renovar` : ''}
            ajuda="Contratos renovados ÷ contratos a serem renovados (Expirados com fim no período do filtro Data)"
          />
          {/* Potencial: as duas oportunidades juntas — vendas (contrato novo) e contratos vencendo (renovação). */}
          <Gauge
            label="Potencial"
            info={INFO_RESUMO.gaugePotencial}
            valor={(carregandoContratos && !contratos) || (carregandoOrdens && !ordens) || !(chassisVendidos + renovacoesPeriodo.aRenovar)
              ? null : (contratosPeriodo.novos + renovacoesPeriodo.renovados) / (chassisVendidos + renovacoesPeriodo.aRenovar) * 100}
            detalhe={chassisVendidos + renovacoesPeriodo.aRenovar
              ? `${contratosPeriodo.novos + renovacoesPeriodo.renovados} de ${chassisVendidos + renovacoesPeriodo.aRenovar} oportunidades` : ''}
            ajuda="(Contratos novos + contratos renovados) ÷ (veículos vendidos + contratos a serem renovados) no período"
          />
        </div>
      )}

      {/* Cada grupo de cards fica separado por uma linha, com subtítulo. */}
      {aba === 'Resumo' && (
        <div className="border-t border-slate-700 pt-4 space-y-3">
        <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Contratos Novos</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <CardTruck
            label="Veículos vendidos (por chassi)"
            info={INFO_RESUMO.vendidos}
            valor={carregandoVendas && !vendas ? '...' : vendas ? chassisVendidos.toLocaleString('pt-BR') : '—'}
            ajuda="Chassis DAF distintos vendidos no período (vendas menos devoluções) — mesma lista da aba Veículos Vendidos"
          />
          <CardTruck
            label="Contratos novos"
            icone={FilePlus2}
            info={INFO_RESUMO.novos}
            cor="from-emerald-400 to-emerald-600"
            valor={carregandoOrdens && !ordens ? '...' : ordens ? contratosPeriodo.novos.toLocaleString('pt-BR') : '—'}
            ajuda="Veículos vendidos no período com Situação contrato = Novo contrato (O.S. P04 após a venda)"
          />
          <CardTruck
            label="Sem contrato"
            info={INFO_RESUMO.semContrato}
            icone={FileX2}
            cor="from-red-400 to-red-600"
            valor={carregandoOrdens && !ordens ? '...' : ordens ? (chassisVendidos - contratosPeriodo.novos - contratosPeriodo.renovados).toLocaleString('pt-BR') : '—'}
            ajuda="Veículos vendidos no período sem O.S. P04 após a venda"
          />
        </div>
        </div>
      )}

      {/* Oportunidade de renovação: contratos da aba Planos de Manutenção com fim no período do filtro Data. */}
      {aba === 'Resumo' && (
        <div className="border-t border-slate-700 pt-4 space-y-3">
        <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Renovação de Contratos</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <CardTruck
            label="Contratos a serem renovados"
            info={INFO_RESUMO.aRenovar}
            icone={CalendarClock}
            cor="from-amber-400 to-amber-600"
            valor={carregandoContratos && !contratos ? '...' : contratos ? renovacoesPeriodo.aRenovar.toLocaleString('pt-BR') : '—'}
            ajuda="Contratos (por chassi) do Potencial Renovação com Fim do contrato dentro do período do filtro Data, só com status Expirado (Prazo ou KM)"
          />
          <CardTruck
            label="Contratos renovados"
            icone={Repeat}
            info={INFO_RESUMO.renovados}
            cor="from-violet-400 to-violet-600"
            valor={(carregandoContratos && !contratos) || (carregandoOrdens && !ordens) ? '...' : contratos ? renovacoesPeriodo.renovados.toLocaleString('pt-BR') : '—'}
            ajuda="Dos contratos a renovar, quantos têm O.S. P04 do chassi após o fim do contrato ou um novo contrato do chassi que vai além desse fim"
          />
          <CardTruck
            label="Sem contrato renovado"
            info={INFO_RESUMO.semRenovacao}
            icone={CalendarX2}
            cor="from-red-400 to-red-600"
            valor={(carregandoContratos && !contratos) || (carregandoOrdens && !ordens) ? '...' : contratos ? (renovacoesPeriodo.aRenovar - renovacoesPeriodo.renovados).toLocaleString('pt-BR') : '—'}
            ajuda="Dos contratos a renovar (Expirados com fim no período), quantos não foram renovados — os mesmos que aparecem como Não renovado na aba Planos de Manutenção"
          />
        </div>
        </div>
      )}

      {aba === 'Planos de Manutenção' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">Planos de Manutenção — Potencial de Renovação ({contratosTodos ? 'todas as datas' : TEXTO_TIPO_DATA[tipoDataContrato]})</p>
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {/* A coluna de origem se chama "Contrato" na tela, como a do número; por dentro segue a chave "Origem". */}
                  {['Contrato', 'Cliente', 'Chassi', 'Tipo', 'Início', 'Fim', 'Status', 'Origem', 'Grupo'].map(h => (
                    <ThOrdena key={h} chave={h} titulo={h === 'Origem' ? 'Contrato' : h} ordenacao={ordContratos} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordContratos.ordenada.map((r, i) => (
                  <tr key={`${r.contrato}-${r.chassi}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.contrato}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.cliente}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{r.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tipo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.inicio)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.fim)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {(() => {
                        const s = situacaoRenovacao(r)
                        if (s === 'na') return null
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${SITUACOES_CONTRATO[s].cor}`}>{SITUACOES_CONTRATO[s].label}</span>
                            {/* Pop-up: onde foi renovado (Renovado) ou por qual contrato foi trocado (Substituído). */}
                            {(s === 'sim' || s === 'substituido' || s === 'renovacao' || s === 'substituto'
                              || (s === 'validacao' && contratoAnterior(r))) && (
                              <button type="button" onClick={() => setRenovacaoModal(r)} title="Ver detalhes" aria-label="Ver detalhes"
                                className="p-0.5 rounded text-blue-600 hover:bg-blue-50">
                                <FileSearch className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.grupo}</td>
                  </tr>
                ))}
                {tabelaContratos.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-400">{carregandoContratos ? 'Carregando...' : 'Nenhum contrato no período.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'Ordens de Serviço' && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200">
            <Truck className="h-4 w-4 text-blue-600" />
            <p className="text-[11px] font-semibold text-indigo-950">Ordens de Serviço — P04 Plano de Manutenção DAF MultiSuporte</p>
          </div>
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0">
                <tr>
                  {['Data NF', 'NF', 'O.S.', 'Chassi', 'TMO', 'Descrição', 'Valor Total'].map(h => (
                    <ThOrdena key={h} titulo={h} ordenacao={ordOs} direita={h === 'Valor Total'} />
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {ordOs.ordenada.map((r, i) => (
                  <tr key={`${r.empresa_nome}-${r.os}-${r.tmo}-${i}`} className="hover:bg-slate-50">
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{fmtData(r.data)}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.nf}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{r.os}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap font-mono">{r.chassi}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tmo}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{r.tmo_descricao}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap text-right tabular-nums font-semibold">{fmtBRL(r.vl_total)}</td>
                  </tr>
                ))}
                {tabelaOs.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-400">{carregandoOrdens ? 'Carregando...' : 'Nenhuma O.S. P04 no período.'}</td></tr>
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
            <p className="text-[11px] font-semibold text-indigo-950">Veículos Vendidos da Marca DAF</p>
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
                    <td className="px-3 py-1.5 whitespace-nowrap">{nomeEmpresa(r.empresa_nome)}</td>
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
      {renovacaoModal && (
        <ModalRenovacao contrato={renovacaoModal}
          renovacao={situacaoRenovacao(renovacaoModal) === 'validacao'
            // Em validação: de qual contrato está sendo a transição + as O.S. P04 do chassi desde o início dele.
            ? (() => {
                const anterior = contratoAnterior(renovacaoModal)
                const chassi = renovacaoModal.chassi.toUpperCase()
                const os = Object.entries(osPorChassi).filter(([ch]) => ch.endsWith(chassi)).flatMap(([, l]) => l)
                  .filter(o => o.dataOs && anterior?.inicio && o.dataOs >= anterior.inicio)
                return { os, novos: [anterior].filter(Boolean), modo: 'transicao' }
              })()
            : situacaoRenovacao(renovacaoModal) === 'substituido'
            ? { os: [], novos: substitutos(renovacaoModal), modo: 'substituicao' }
            : situacaoRenovacao(renovacaoModal) === 'renovacao' || situacaoRenovacao(renovacaoModal) === 'substituto'
              ? { os: [], novos: [contratoAnterior(renovacaoModal)].filter(Boolean), modo: situacaoRenovacao(renovacaoModal) === 'substituto' ? 'substituto' : 'anterior' }
              : contratosRenovados.get(renovacaoModal)}
          onFechar={() => setRenovacaoModal(null)} />
      )}
    </div>
  )
}

// Pop-up da coluna Situação (aba Planos de Manutenção). Renovado: onde o contrato foi renovado — O.S. P04 do
// chassi e/ou novo contrato no Potencial Renovação. Substituído (renovacao.substituicao): o contrato que
// entrou no lugar do cancelado. Contrato da renovação (modo 'anterior'): o contrato que ele renovou.
// Nesses dois modos não há a parte de O.S.
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-900">{modo === 'transicao' ? 'Transição' : modo === 'substituicao' || modo === 'substituto' ? 'Substituição' : 'Renovação'} do Contrato — Plano de Manutenção</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Contrato {contrato.contrato} · Chassi <span className="font-mono">{contrato.chassi}</span> · {contrato.tipo} · Início em {fmtData(contrato.inicio)} · Fim em {fmtData(contrato.fim)}
            </p>
            <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${corStatusContrato(contrato.status)}`}>{contrato.status}</span>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4">
          {!substituicao && <div>
            <p className="text-[11px] font-semibold text-indigo-950 mb-2">
              {modo === 'transicao' ? 'Ordens de Serviço P04 do chassi desde o início do contrato anterior' : 'Ordens de Serviço P04 após o fim do contrato'}
            </p>
            {Object.keys(porOs).length === 0 ? (
              <p className="text-[11px] text-slate-400">{modo === 'transicao' ? 'Nenhuma O.S. P04 do chassi nesse período.' : 'Nenhuma O.S. P04 após o fim do contrato.'}</p>
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
              {modo === 'substituicao' ? 'Contrato que substituiu este (Potencial Renovação)'
                : modo === 'anterior' ? 'Contrato anterior, que este renovou (Potencial Renovação)'
                : modo === 'substituto' ? 'Contrato cancelado, que este substituiu (Potencial Renovação)'
                : modo === 'transicao' ? 'Contrato anterior do chassi, de onde vem a transição (Potencial Renovação)'
                : 'Novo contrato do chassi (Potencial Renovação)'}
            </p>
            {!renovacao?.novos.length ? (
              <p className="text-[11px] text-slate-400">Nenhum novo contrato do chassi que vá além do fim deste contrato.</p>
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

// Pop-up com as O.S. P04 do chassi após a venda (uma O.S. pode ter vários TMOs).
function ModalOs({ venda, onFechar }) {
  const porOs = {}
  venda.os.forEach(o => { (porOs[o.os] ||= []).push(o) })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
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
                {/* O ROF042 não tem placa: vem da venda do veículo ou, sem ela, da O.S. no ROF017. */}
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

          {/* Contratos do chassi na aba Planos de Manutenção (Potencial Renovação). */}
          <div>
            <p className="text-[11px] font-semibold text-indigo-950 mb-2">Contrato — Planos de Manutenção</p>
            {venda.contratos.length === 0 ? (
              <p className="text-[11px] text-slate-400">Nenhum contrato encontrado para este chassi no Potencial Renovação.</p>
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
