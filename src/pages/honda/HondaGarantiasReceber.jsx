import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Bike, RefreshCw, AlertTriangle, ShieldCheck, Wrench, Building2, X, Info, Wallet, CalendarClock, CalendarCheck2, Settings, Plus, Trash2 } from 'lucide-react'
import { supabase, apiService } from '../../services/supabaseClient'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const CACHE_KEY = 'honda_garantias_a_receber_cache'

// A resposta da API ainda não tem um formato mapeado — tenta achar a lista de
// registros dentro do JSON (array na raiz, ou primeira propriedade que seja um array).
function extrairLista(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v
    }
  }
  return null
}

function lerCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Colunas de data (emissão, vencimento) vêm da API em formatos variados — converte para dd/mm/aaaa.
const COLUNA_DATA_RE = /emiss|vencim/i

function formatarData(valor) {
  const s = String(valor).trim()
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return s.slice(0, 10)
  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }
  return null
}

// Só a coluna de vencimento (não emissão) recebe o destaque de vencido/vence hoje.
const COLUNA_VENCIMENTO_RE = /vencim/i

// Retorna 'vencido' (antes de hoje) | 'hoje' | 'a_vencer' (depois de hoje) | null.
function statusPrazo(valor) {
  const formatada = formatarData(valor)
  if (!formatada) return null
  const [dia, mes, ano] = formatada.split('/').map(Number)
  const dataVenc = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const diffDias = Math.round((dataVenc.getTime() - hojeSemHora.getTime()) / 86400000)
  if (diffDias < 0) return 'vencido'
  if (diffDias === 0) return 'hoje'
  return 'a_vencer'
}

// Colunas de valor monetário (ex: ValorParcela, Aberto) — formata como R$ 0,00.
const COLUNA_MOEDA_RE = /valor|aberto/i

// Converte "1.234,56" (BR) ou "1234.56" (US) ou number em número puro. Retorna null se não for parseável.
function parseValor(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') return valor
  const s = String(valor).trim()
  // BR: vírgula decimal ("1.234,56") ou só milhares com ponto ("1.234", "1.234.567").
  const ehBR = /,\d{1,2}$/.test(s) || /^-?\d{1,3}(\.\d{3})+$/.test(s)
  const normalizado = ehBR ? s.replace(/\./g, '').replace(',', '.') : s
  const n = parseFloat(normalizado)
  return isNaN(n) ? null : n
}

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarMoeda(valor) {
  const numero = parseValor(valor)
  return numero === null ? null : fmtMoeda(numero)
}

function formatarCelula(coluna, valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (COLUNA_DATA_RE.test(coluna)) {
    const formatada = formatarData(valor)
    if (formatada) return formatada
  }
  if (COLUNA_MOEDA_RE.test(coluna)) {
    const formatada = formatarMoeda(valor)
    if (formatada) return formatada
  }
  return String(valor)
}

// Busca uma coluna pelo nome, ignorando maiúsculas/minúsculas.
function acharColuna(row, nomeAlvo) {
  const chave = Object.keys(row).find(k => k.toLowerCase() === nomeAlvo.toLowerCase())
  return chave ? row[chave] : undefined
}

// Categoriza o registro pelo texto da coluna "Portador" (ex: "A RECEBER GARANTIA",
// "A RECEBER REVISÃO GRATUÍTA", "A RECEBER SEGURADORA").
function categoriaDoRegistro(row) {
  const portador = String(acharColuna(row, 'Portador') ?? '').toUpperCase()
  if (portador.includes('REVIS')) return 'revisoes'
  if (portador.includes('SEGUR')) return 'seguradoras'
  if (portador.includes('GARANT')) return 'garantias'
  return null // fora das 3 categorias — descartado da tela
}

// Valor de uma coluna do registro: tenta o nome exato primeiro, depois o padrão mais solto
// (ignorando colunas que casem com `excluir`, ex: "ValorParcela" não é a Parcela).
function valorColuna(row, exato, solto, excluir) {
  const chaves = Object.keys(row)
  const k = chaves.find(c => exato.test(c)) || chaves.find(c => solto.test(c) && !(excluir && excluir.test(c)))
  return k ? String(row[k] ?? '').trim() : ''
}

// Chave do título nas anotações: Empresa|Documento|Parcela|NotaFiscal.
function dadosChave(row) {
  return {
    empresa: valorColuna(row, /^empresa$/i, /fantasia|empresa/i, /cod|c[oó]digo|id/i),
    documento: valorColuna(row, /^documento$/i, /documento/i, /origem|fiscal|tipo/i),
    parcela: valorColuna(row, /^parcela$/i, /parcela/i, /valor|total|qtd|quant/i),
    nota_fiscal: valorColuna(row, /^nota.?fiscal$/i, /nota.?fiscal/i),
  }
}

// Nº da OS vem na coluna OrigemDocumento (ex: "O.S: 383465"); null se o título não é de OS.
function osDoRegistro(row) {
  const origem = valorColuna(row, /^origem.?documento$/i, /origem.?documento/i)
  const m = origem.match(/O\.?\s?S\.?\s*:?\s*(\d+)/i)
  return m ? m[1] : null
}

// Uma OS de garantia pode ter duas notas (peças e serviços): a anotação é por Empresa + OS, então
// as duas notas compartilham Status/Situação. Sem OS, cai para Empresa|Documento|Parcela|NotaFiscal.
function chaveDoRegistro(row) {
  const d = dadosChave(row)
  const os = osDoRegistro(row)
  if (os) return ['OS', d.empresa, os].join('|')
  return [d.empresa, d.documento, d.parcela, d.nota_fiscal].join('|')
}

// Cores disponíveis no cadastro de Status (chave gravada em honda_contas_receber_status.cor).
const CORES_STATUS = {
  slate: { label: 'Cinza', badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  sky: { label: 'Azul', badge: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  amber: { label: 'Amarelo', badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  emerald: { label: 'Verde', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  red: { label: 'Vermelho', badge: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  violet: { label: 'Roxo', badge: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-slate-300">—</span>
  const cor = CORES_STATUS[status.cor] || CORES_STATUS.slate
  return <span className={`inline-block whitespace-nowrap shrink-0 text-[10px] font-bold border rounded-full px-2 py-0.5 ${cor.badge}`}>{status.nome}</span>
}

const INPUT_CLS = 'text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300'

// Seletor de Status (cadastrados na engrenagem). Só lista ativos, mais o status já escolhido mesmo se inativo.
function SeletorStatus({ valor, statusLista, onChange, className = '' }) {
  const opcoes = statusLista.filter(s => s.ativo || s.id === valor)
  return (
    <select value={valor || ''} onChange={(e) => onChange(e.target.value || null)} className={`${INPUT_CLS} bg-white ${className}`}>
      <option value="">— Sem status —</option>
      {opcoes.map(s => <option key={s.id} value={s.id}>{s.nome}{s.ativo ? '' : ' (inativo)'}</option>)}
    </select>
  )
}

// Uma aba por portador — mesma categorização usada em categoriaDoRegistro().
const ABAS_PORTADOR = [
  { key: 'garantias', label: 'Garantias', icon: ShieldCheck, activeBorder: 'border-sky-600', activeText: 'text-sky-700', activeBadge: 'bg-sky-50 text-sky-600' },
  { key: 'revisoes', label: 'Revisões Gratuitas', icon: Wrench, activeBorder: 'border-amber-600', activeText: 'text-amber-700', activeBadge: 'bg-amber-50 text-amber-600' },
  { key: 'seguradoras', label: 'Seguradoras', icon: Building2, activeBorder: 'border-emerald-600', activeText: 'text-emerald-700', activeBadge: 'bg-emerald-50 text-emerald-600' },
]

const LABEL_CATEGORIA = Object.fromEntries(ABAS_PORTADOR.map(a => [a.key, a.label]))
const LABEL_CATEGORIA_SINGULAR = { garantias: 'Garantia', revisoes: 'Revisão Gratuita', seguradoras: 'Seguradora' }
const LINHAS_POR_PAGINA = 200
const SEM_STATUS = '__sem_status__'

// Cards de resumo exibidos dentro da aba ativa — clicáveis, funcionam como filtro da tabela.
// key: null = "Total" (limpa o filtro de prazo); os demais casam com a chave usada em statusPrazo().
const CARDS_RESUMO = [
  { key: null, label: 'Total', icon: Wallet, bg: 'bg-slate-50', border: 'border-slate-200', ring: 'ring-slate-400', labelColor: 'text-slate-500', qtdColor: 'text-slate-800', valorColor: 'text-slate-900', iconColor: 'text-slate-500' },
  { key: 'vencido', label: 'Vencido', icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-400', labelColor: 'text-red-500', qtdColor: 'text-red-700', valorColor: 'text-red-800', iconColor: 'text-red-500' },
  { key: 'hoje', label: 'Vence Hoje', icon: CalendarClock, bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400', labelColor: 'text-amber-500', qtdColor: 'text-amber-700', valorColor: 'text-amber-800', iconColor: 'text-amber-500' },
  { key: 'aVencer', label: 'A Vencer', icon: CalendarCheck2, bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400', labelColor: 'text-emerald-500', qtdColor: 'text-emerald-700', valorColor: 'text-emerald-800', iconColor: 'text-emerald-500' },
]

function ModalBase({ titulo, onClose, children, largura = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${largura} max-h-[85vh] flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-800">{titulo}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// Engrenagem ao lado de "Atualizar": cadastro dos Status usados no seletor das abas.
function ModalCadastroStatus({ statusLista, onClose, onChanged, onErro }) {
  const [novoNome, setNovoNome] = useState('')
  const [novaCor, setNovaCor] = useState('sky')
  const [ocupado, setOcupado] = useState(false)

  const executar = async (fn) => {
    setOcupado(true)
    try { await fn(); await onChanged() } catch (e) {
      onErro(e.code === '23505' ? 'Já existe um status com esse nome.' : `Erro ao salvar status: ${e.message || e}`)
    } finally { setOcupado(false) }
  }

  const adicionar = () => {
    const nome = novoNome.trim()
    if (!nome) return
    executar(async () => {
      await apiService.salvarHondaStatus({ nome, cor: novaCor, ordem: statusLista.length, ativo: true })
      setNovoNome('')
    })
  }

  return (
    <ModalBase titulo="Status — Contas a Receber HONDA" onClose={onClose}>
      <p className="text-[11px] text-slate-500 mb-3">Os status cadastrados aqui aparecem no seletor de cada título, nas abas.</p>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') adicionar() }}
          placeholder="Novo status..."
          className={`${INPUT_CLS} flex-1`}
        />
        <select value={novaCor} onChange={(e) => setNovaCor(e.target.value)} className={`${INPUT_CLS} bg-white`}>
          {Object.entries(CORES_STATUS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
        </select>
        <button type="button" onClick={adicionar} disabled={ocupado || !novoNome.trim()} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 rounded-md disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>
      {statusLista.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">Nenhum status cadastrado.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-md">
          {statusLista.map(s => (
            <li key={s.id} className="flex items-center gap-2 px-3 py-2">
              <StatusBadge status={s} />
              <input
                type="text"
                defaultValue={s.nome}
                key={s.nome}
                onBlur={(e) => { const nome = e.target.value.trim(); if (nome && nome !== s.nome) executar(() => apiService.salvarHondaStatus({ id: s.id, nome })) }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                className={`${INPUT_CLS} flex-1 min-w-0`}
              />
              <select value={s.cor} onChange={(e) => executar(() => apiService.salvarHondaStatus({ id: s.id, cor: e.target.value }))} className={`${INPUT_CLS} bg-white`}>
                {Object.entries(CORES_STATUS).map(([k, c]) => <option key={k} value={k}>{c.label}</option>)}
              </select>
              <label className="flex items-center gap-1 text-[10px] text-slate-500 cursor-pointer">
                <input type="checkbox" checked={s.ativo} onChange={(e) => executar(() => apiService.salvarHondaStatus({ id: s.id, ativo: e.target.checked }))} />
                Ativo
              </label>
              <button
                type="button"
                title="Excluir status"
                onClick={() => { if (window.confirm(`Excluir o status "${s.nome}"? Os títulos que o usam ficarão sem status.`)) executar(() => apiService.excluirHondaStatus(s.id)) }}
                className="text-slate-300 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ModalBase>
  )
}

// Engrenagem da linha: Status (seletor) + Situação do título.
// `titulos`: todas as linhas da API que compartilham a anotação (mesma OS), incluindo a clicada.
function ModalEditarTitulo({ row, titulos, categoria, anotacao, statusLista, onSalvar, onClose }) {
  const os = osDoRegistro(row)
  const [statusId, setStatusId] = useState(anotacao?.status_id ?? null)
  const [situacao, setSituacao] = useState(anotacao?.situacao ?? '')
  const [sinistro, setSinistro] = useState(anotacao?.numero_sinistro ?? '')
  const [sg, setSg] = useState(anotacao?.numero_sg ?? '')
  const [salvando, setSalvando] = useState(false)
  const d = dadosChave(row)
  const temSinistro = categoria === 'seguradoras'
  const temSg = categoria === 'garantias'

  const salvar = async () => {
    setSalvando(true)
    const campos = { status_id: statusId, situacao: situacao.trim() }
    if (temSinistro) campos.numero_sinistro = sinistro.trim()
    if (temSg) campos.numero_sg = sg.trim()
    const ok = await onSalvar(row, categoria, campos)
    setSalvando(false)
    if (ok) onClose()
  }

  return (
    <ModalBase titulo={`Editar ${LABEL_CATEGORIA_SINGULAR[categoria] || 'título'}`} onClose={onClose} largura="max-w-4xl">
      <div className="text-[11px] bg-slate-50 border border-slate-200 rounded-md p-3 mb-4">
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <div><span className="font-bold text-slate-400 uppercase text-[10px]">Empresa: </span><span className="text-slate-700">{d.empresa || '—'}</span></div>
          {os && <div><span className="font-bold text-slate-400 uppercase text-[10px]">O.S.: </span><span className="text-slate-700">{os}</span></div>}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-1">
          <div><span className="font-bold text-slate-400 uppercase text-[10px]">Origem: </span><span className="text-slate-700">{valorColuna(row, /^origem$/i, /^origem$/i) || '—'}</span></div>
          <div><span className="font-bold text-slate-400 uppercase text-[10px]">Portador: </span><span className="text-slate-700">{valorColuna(row, /^portador$/i, /^portador$/i) || '—'}</span></div>
        </div>
        <table className="w-full mt-2 text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase text-slate-400 whitespace-nowrap">
              <th className="pl-2 pr-3 py-1">Documento / Parcela</th>
              <th className="py-1">Nota Fiscal</th>
              <th className="py-1 pl-3">Emissão</th>
              <th className="py-1 text-right">Valor Parcela</th>
              <th className="py-1 pl-3 text-right">Aberto</th>
              <th />
            </tr>
          </thead>
          <tbody className="text-slate-700">
            {titulos.map((t, i) => {
              const atual = t === row // linha cuja engrenagem foi clicada
              return (
                <tr key={i} className={`border-t border-slate-200 ${atual ? 'bg-blue-100/70 font-semibold text-blue-900' : ''}`}>
                  <td className="pl-2 pr-3 py-1">{valorColuna(t, /^documento.?parcela$/i, /documento.?parcela/i) || dadosChave(t).documento || '—'}</td>
                  <td className="py-1">{dadosChave(t).nota_fiscal || '—'}</td>
                  <td className="py-1 pl-3 whitespace-nowrap">{formatarData(valorColuna(t, /^emiss[aã]o$/i, /emiss/i)) || '—'}</td>
                  <td className="py-1 pl-3 text-right whitespace-nowrap">{formatarMoeda(valorColuna(t, /^valor.?parcela$/i, /valor.?parcela/i)) || '—'}</td>
                  <td className="py-1 pl-3 text-right whitespace-nowrap">{formatarMoeda(valorColuna(t, /^aberto$/i, /aberto/i)) || '—'}</td>
                  <td className="py-1 pr-2 text-right">
                    {atual && <span className="text-[10px] font-bold text-blue-600 bg-white border border-blue-200 rounded-full px-2 py-0.5">◀ selecionada</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {os && titulos.length > 1 && (
        <p className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mb-4">
          O Status e a Situação valem para todas as notas fiscais desta OS (peças e serviços).
        </p>
      )}
      {temSg && (
        <>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Nº da SG</label>
          <input type="text" value={sg} onChange={(e) => setSg(e.target.value)} className={`${INPUT_CLS} w-full mb-4 !py-1.5`} placeholder="Número da SG..." />
        </>
      )}
      {temSinistro && (
        <>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Nº do Sinistro</label>
          <input type="text" value={sinistro} onChange={(e) => setSinistro(e.target.value)} className={`${INPUT_CLS} w-full mb-4 !py-1.5`} placeholder="Número do sinistro..." />
        </>
      )}
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Status</label>
      <SeletorStatus valor={statusId} statusLista={statusLista} onChange={setStatusId} className="w-full mb-4 !py-1.5" />
      <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Situação</label>
      <textarea value={situacao} onChange={(e) => setSituacao(e.target.value)} rows={4} className={`${INPUT_CLS} w-full mb-4`} placeholder="Descreva a situação..." />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancelar</button>
        <button type="button" onClick={salvar} disabled={salvando} className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-1.5 rounded-md disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </ModalBase>
  )
}

export default function HondaGarantiasReceber() {
  const cacheInicial = lerCache()
  const [dados, setDados] = useState(cacheInicial?.dados ?? null)
  const [ultimaConsulta, setUltimaConsulta] = useState(cacheInicial?.consultadoEm ?? null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState('garantias') // 'garantias' | 'revisoes' | 'seguradoras' — aba ativa (sempre uma selecionada)
  const [filtroPrazo, setFiltroPrazo] = useState(null) // null (Total) | 'vencido' | 'hoje' | 'aVencer' — card clicado
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('') // '' (todos) | SEM_STATUS | id do status
  const [paginasVisiveis, setPaginasVisiveis] = useState(1)
  const [anotacoes, setAnotacoes] = useState({}) // chave do título -> linha de honda_contas_receber_anotacoes
  const [statusLista, setStatusLista] = useState([])
  const [mostrarCadastroStatus, setMostrarCadastroStatus] = useState(false)
  const [tituloEditando, setTituloEditando] = useState(null) // linha da API aberta no editor (engrenagem da linha)

  const carregarAnotacoes = useCallback(async () => {
    try {
      const linhas = await apiService.getHondaAnotacoes()
      setAnotacoes(Object.fromEntries(linhas.map(l => [l.chave, l])))
    } catch (e) {
      setErro(`Não foi possível carregar as anotações: ${e.message || e}`)
    }
  }, [])

  // Ao entrar na tela, as anotações já vêm do Supabase (sem precisar clicar em Atualizar).
  useEffect(() => { carregarAnotacoes() }, [carregarAnotacoes])

  const carregarStatus = useCallback(async () => {
    try {
      setStatusLista(await apiService.getHondaStatus())
    } catch (e) {
      setErro(`Não foi possível carregar os status: ${e.message || e}`)
    }
  }, [])
  useEffect(() => { carregarStatus() }, [carregarStatus])

  const statusPorId = useMemo(() => Object.fromEntries(statusLista.map(s => [s.id, s])), [statusLista])

  // campos: { numero_sinistro?, status_id?, situacao? } — só os informados mudam; o resto da anotação é preservado.
  const salvarAnotacao = async (row, categoria, campos) => {
    const chave = chaveDoRegistro(row)
    const atual = anotacoes[chave] || {}
    const normalizados = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, v || null]))
    const registro = {
      chave,
      categoria,
      ...dadosChave(row),
      numero_sinistro: atual.numero_sinistro ?? null,
      numero_sg: atual.numero_sg ?? null,
      status_id: atual.status_id ?? null,
      situacao: atual.situacao ?? null,
      ...normalizados,
    }
    try {
      await apiService.salvarHondaAnotacao(registro)
      setAnotacoes(prev => ({ ...prev, [chave]: { ...prev[chave], ...registro } }))
      return true
    } catch (e) {
      setErro(`Não foi possível salvar a anotação: ${e.message || e}`)
      return false
    }
  }

  const handleSort = (col) => {
    if (sortColEfetivo === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  // Só busca na API quando o usuário clica em "Atualizar" — nunca ao abrir a tela.
  // Enquanto isso, mostra os dados da última consulta salvos localmente.
  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const { data: sessao } = await supabase.auth.getSession()
      const token = sessao.session?.access_token
      const r = await fetch(`${BACKEND_URL}/api/honda/contas-a-receber`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.message || body.error || `Erro ${r.status} ao consultar a API.`)
      }
      const data = await r.json()
      const agora = new Date().toISOString()
      setDados(data)
      setUltimaConsulta(agora)
      setPaginasVisiveis(1)
      // Títulos que saíram da API (pagos/baixados) perdem a anotação; os que seguem em aberto mantêm.
      // Só limpa se a API trouxe títulos — resposta vazia/estranha nunca apaga nada.
      const emAberto = (extrairLista(data) || []).filter(row => categoriaDoRegistro(row) !== null)
      if (emAberto.length > 0) {
        try {
          await apiService.limparHondaAnotacoesBaixadas(emAberto.map(chaveDoRegistro))
          await carregarAnotacoes()
        } catch (e) {
          setErro(`Consulta atualizada, mas a limpeza das anotações falhou: ${e.message || e}`)
        }
      }
      // Cache é só conveniência: se estourar a cota do localStorage, a consulta continua válida.
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ dados: data, consultadoEm: agora }))
      } catch {
        try { localStorage.removeItem(CACHE_KEY) } catch { /* ignora */ }
      }
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [carregarAnotacoes])

  // Só Garantias, Revisões Gratuitas e Seguradoras — o restante é descartado.
  const listaCompleta = useMemo(() => {
    const bruta = extrairLista(dados)
    return bruta ? bruta.filter(row => categoriaDoRegistro(row) !== null) : null
  }, [dados])
  const colunas = listaCompleta && listaCompleta.length > 0 ? Object.keys(listaCompleta[0]) : []

  const colunaVencimento = colunas.find(c => COLUNA_VENCIMENTO_RE.test(c)) || null
  // Soma pela coluna "Aberto" (saldo em aberto) — cai para qualquer coluna de valor se não existir.
  const colunaValor = colunas.find(c => /aberto/i.test(c)) || colunas.find(c => /valor/i.test(c)) || null

  // Colunas do filtro avançado.
  // A API devolve a empresa em "NomeFantasia" (não há coluna "Empresa").
  const colunaEmpresa = colunas.find(c => /^empresa$/i.test(c)) || colunas.find(c => /fantasia|empresa/i.test(c) && !/cod|c[oó]digo|id/i.test(c)) || null
  // Colunas varridas pelo campo Buscar: nota fiscal, origem do documento, documento e parcela (sem as de valor).
  const colunasBusca = colunas.filter(c => /nota.?fiscal|origem|documento|parcela/i.test(c) && !/valor/i.test(c))
  const chaveColunasBusca = colunasBusca.join('|') // dependência estável para o useMemo da lista
  // Origem, Portador, ValorParcela, DocumentoParcela e Emissão só aparecem dentro da janela de edição (engrenagem).
  const colunasTabela = colunas.filter(c => !/^(origem|portador|valor.?parcela|documento.?parcela|emiss[aã]o)$/i.test(c))

  // A engrenagem da linha (aba Garantias) fica antes de "Nome Fantasia"; sem essa coluna, vai para o início.
  const colunaAntesEngrenagem = colunas.find(c => /fantasia/i.test(c)) || colunas[0] || null
  const filtroAvancadoAtivo = !!(filtroEmpresa.trim() || filtroStatus || filtroBusca.trim())
  const limparFiltroAvancado = () => {
    setFiltroEmpresa('')
    setFiltroStatus('')
    setFiltroBusca('')
  }

  // Empresas presentes na aba ativa — alimentam o seletor do filtro Empresa.
  const opcoesEmpresa = useMemo(() => {
    if (!listaCompleta || !colunaEmpresa) return []
    const set = new Set()
    for (const row of listaCompleta) {
      if (categoriaDoRegistro(row) !== filtroCategoria) continue
      const v = String(row[colunaEmpresa] ?? '').trim()
      if (v) set.add(v)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }))
  }, [listaCompleta, colunaEmpresa, filtroCategoria])

  // Status presentes nos títulos da aba ativa.
  const opcoesStatus = useMemo(() => {
    if (!listaCompleta) return { ids: [], temSem: false }
    const ids = new Set()
    let temSem = false
    for (const row of listaCompleta) {
      if (categoriaDoRegistro(row) !== filtroCategoria) continue
      const id = anotacoes[chaveDoRegistro(row)]?.status_id
      if (id && statusPorId[id]) ids.add(id)
      else temSem = true
    }
    const ordenados = [...ids].sort((a, b) => statusPorId[a].nome.localeCompare(statusPorId[b].nome, 'pt-BR'))
    return { ids: ordenados, temSem }
  }, [listaCompleta, filtroCategoria, anotacoes, statusPorId])

  // Ao trocar de aba, a empresa/status escolhidos podem não existir nela.
  useEffect(() => { setFiltroEmpresa(''); setFiltroStatus('') }, [filtroCategoria])

  const categorias = useMemo(() => {
    const grupos = { garantias: { qtd: 0 }, revisoes: { qtd: 0 }, seguradoras: { qtd: 0 } }
    if (!listaCompleta) return grupos
    for (const row of listaCompleta) {
      grupos[categoriaDoRegistro(row)].qtd += 1
    }
    return grupos
  }, [listaCompleta])

  // Resumo (Total/Vencido/Vence Hoje/A Vencer) da aba ativa — não é afetado pelo filtro avançado,
  // reflete só a categoria/portador selecionada.
  const resumoAbaAtiva = useMemo(() => {
    const grupos = {
      total: { qtd: 0, valor: 0 },
      vencido: { qtd: 0, valor: 0 },
      hoje: { qtd: 0, valor: 0 },
      aVencer: { qtd: 0, valor: 0 },
    }
    if (!listaCompleta) return grupos
    for (const row of listaCompleta) {
      if (categoriaDoRegistro(row) !== filtroCategoria) continue
      const valor = colunaValor ? (parseValor(row[colunaValor]) || 0) : 0
      grupos.total.qtd += 1
      grupos.total.valor += valor
      const st = colunaVencimento ? statusPrazo(row[colunaVencimento]) : null
      const chave = st === 'vencido' ? 'vencido' : st === 'hoje' ? 'hoje' : st === 'a_vencer' ? 'aVencer' : null
      if (chave) {
        grupos[chave].qtd += 1
        grupos[chave].valor += valor
      }
    }
    return grupos
  }, [listaCompleta, filtroCategoria, colunaValor, colunaVencimento])

  // Filtro pela aba (categoria/portador) e pelo filtro avançado — combinam entre si.
  const lista = useMemo(() => {
    if (!listaCompleta) return listaCompleta
    let filtrada = listaCompleta.filter(row => categoriaDoRegistro(row) === filtroCategoria)
    if (filtroEmpresa.trim() && colunaEmpresa) {
      filtrada = filtrada.filter(row => String(row[colunaEmpresa] ?? '').trim() === filtroEmpresa)
    }
    if (filtroStatus) {
      filtrada = filtrada.filter(row => {
        const id = anotacoes[chaveDoRegistro(row)]?.status_id
        return filtroStatus === SEM_STATUS ? !(id && statusPorId[id]) : id === filtroStatus
      })
    }
    if (filtroBusca.trim() && colunasBusca.length > 0) {
      const alvo = filtroBusca.trim().toLowerCase()
      filtrada = filtrada.filter(row => colunasBusca.some(c => String(row[c] ?? '').toLowerCase().includes(alvo)))
    }
    if (filtroPrazo && colunaVencimento) {
      filtrada = filtrada.filter(row => {
        const st = statusPrazo(row[colunaVencimento])
        const chave = st === 'vencido' ? 'vencido' : st === 'hoje' ? 'hoje' : st === 'a_vencer' ? 'aVencer' : null
        return chave === filtroPrazo
      })
    }
    return filtrada
  }, [listaCompleta, filtroCategoria, filtroEmpresa, colunaEmpresa, filtroStatus, anotacoes, statusPorId, filtroBusca, chaveColunasBusca, filtroPrazo, colunaVencimento])

  // Qualquer mudança de filtro/aba/ordenação volta para a primeira página.
  useEffect(() => { setPaginasVisiveis(1) }, [lista, sortCol, sortDir])

  // Sem ordenação manual escolhida, a tabela já vem ordenada pela coluna de vencimento (mais antigo/vencido primeiro).
  const sortColEfetivo = sortCol || colunaVencimento

  const listaOrdenada = useMemo(() => {
    if (!lista || !sortColEfetivo) return lista
    const arr = [...lista]
    arr.sort((a, b) => {
      const va = a[sortColEfetivo]
      const vb = b[sortColEfetivo]
      if (COLUNA_MOEDA_RE.test(sortColEfetivo)) {
        const na = parseValor(va) ?? -Infinity
        const nb = parseValor(vb) ?? -Infinity
        return sortDir === 'asc' ? na - nb : nb - na
      }
      if (COLUNA_DATA_RE.test(sortColEfetivo)) {
        const da = formatarData(va)
        const db = formatarData(vb)
        const ta = da ? new Date(da.split('/').reverse().join('-')).getTime() : -Infinity
        const tb = db ? new Date(db.split('/').reverse().join('-')).getTime() : -Infinity
        return sortDir === 'asc' ? ta - tb : tb - ta
      }
      const sa = String(va ?? '').toLowerCase()
      const sb = String(vb ?? '').toLowerCase()
      const cmp = sa.localeCompare(sb, 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [lista, sortColEfetivo, sortDir])

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="h-5 w-5 text-red-600" />
            Contas a Receber HONDA
            <span className="relative group cursor-help">
              <Info className="h-3.5 w-3.5 text-slate-400" />
              <span className="absolute top-full left-0 mt-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal">
                Fonte de dados: MicroWork Cloud
              </span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulta ao relatório de garantias a receber.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ultimaConsulta && (
            <span className="text-[10px] text-slate-400">
              Última consulta: <strong className="text-slate-500">{new Date(ultimaConsulta).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
            </span>
          )}
          <button
            type="button"
            onClick={() => setMostrarCadastroStatus(true)}
            title="Cadastro de Status"
            className="p-2 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {mostrarCadastroStatus && (
        <ModalCadastroStatus
          statusLista={statusLista}
          onClose={() => setMostrarCadastroStatus(false)}
          onChanged={carregarStatus}
          onErro={setErro}
        />
      )}
      {tituloEditando && (
        <ModalEditarTitulo
          row={tituloEditando}
          titulos={(listaCompleta || []).filter(r => chaveDoRegistro(r) === chaveDoRegistro(tituloEditando))}
          categoria={filtroCategoria}
          anotacao={anotacoes[chaveDoRegistro(tituloEditando)]}
          statusLista={statusLista}
          onSalvar={salvarAnotacao}
          onClose={() => setTituloEditando(null)}
        />
      )}

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {listaCompleta && listaCompleta.length > 0 && (
        <div className="!mt-2">
          <div className="flex gap-1 border-b border-slate-200">
            {ABAS_PORTADOR.map(aba => {
              const info = categorias[aba.key]
              const Icon = aba.icon
              const ativo = filtroCategoria === aba.key
              return (
                <button
                  key={aba.key}
                  type="button"
                  onClick={() => setFiltroCategoria(aba.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${ativo ? `${aba.activeBorder} ${aba.activeText}` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {aba.label}
                  <span className={`text-[10px] font-bold rounded-full px-1.5 leading-4 ${ativo ? aba.activeBadge : 'bg-slate-100 text-slate-400'}`}>{info.qtd}</span>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {CARDS_RESUMO.map(cardCfg => {
              const info = resumoAbaAtiva[cardCfg.key ?? 'total']
              const CardIcon = cardCfg.icon
              const ativo = filtroPrazo === cardCfg.key
              return (
                <button
                  key={cardCfg.label}
                  type="button"
                  onClick={() => setFiltroPrazo(cardCfg.key)}
                  className={`text-left rounded-lg border p-3 shadow-sm transition-all hover:shadow-md ${cardCfg.bg} ${cardCfg.border} ${ativo ? `ring-2 ring-offset-1 ${cardCfg.ring} shadow-md` : ''}`}
                >
                  <p className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${cardCfg.labelColor}`}>
                    <CardIcon className={`h-3.5 w-3.5 ${cardCfg.iconColor}`} />
                    {cardCfg.label}
                  </p>
                  <p className={`text-xl font-bold leading-tight mt-1 ${cardCfg.qtdColor}`}>
                    {info.qtd} <span className="text-[10px] font-normal">registro(s)</span>
                  </p>
                  <p className={`text-xs font-bold mt-1 ${cardCfg.valorColor}`}>{fmtMoeda(info.valor)}</p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {listaCompleta && listaCompleta.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Empresa</label>
                  <select
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="">Todas</option>
                    {opcoesEmpresa.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Status</label>
                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  >
                    <option value="">Todos</option>
                    {opcoesStatus.ids.map(id => <option key={id} value={id}>{statusPorId[id].nome}</option>)}
                    {opcoesStatus.temSem && <option value={SEM_STATUS}>— Sem status —</option>}
                  </select>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Buscar</label>
                  <input
                    type="text"
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                    placeholder="Nota fiscal, origem do documento, documento ou parcela..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
              </div>
              {filtroAvancadoAtivo && (
                <button
                  type="button"
                  onClick={limparFiltroAvancado}
                  className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" /> Limpar filtros
                </button>
              )}
          </div>
        </div>
      )}

      {dados === null ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-full">
            <Bike className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Nenhuma consulta feita ainda</p>
          <p className="text-xs text-slate-400">Clique em "Atualizar" para buscar os dados.</p>
        </div>
      ) : lista ? (
        lista.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
            <div className="p-3 bg-slate-100 rounded-full">
              <Bike className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {colunasTabela.map(c => (
                    <React.Fragment key={c}>
                      {c === colunaAntesEngrenagem && <th className="p-3 bg-blue-50/50" />}
                      <th
                        onClick={() => handleSort(c)}
                        className={`p-3 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors ${COLUNA_MOEDA_RE.test(c) ? 'text-right' : ''}`}
                      >
                        <span className={`flex items-center gap-1 ${COLUNA_MOEDA_RE.test(c) ? 'justify-end' : ''}`}>
                          {c}
                          <span className={sortColEfetivo === c ? 'text-blue-500' : 'text-slate-300'}>
                            {sortColEfetivo === c ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                          </span>
                        </span>
                      </th>
                    </React.Fragment>
                  ))}
                  {(filtroCategoria === 'seguradoras' ? ['Nº Sinistro', 'Status', 'Situação'] : filtroCategoria === 'garantias' ? ['Nº SG', 'Status', 'Situação'] : ['Status', 'Situação']).map(l => (
                    <th key={l} className="p-3 whitespace-nowrap text-blue-500 bg-blue-50/50">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {listaOrdenada.slice(0, paginasVisiveis * LINHAS_POR_PAGINA).map((row, i) => (
                  <tr key={`${chaveDoRegistro(row)}#${i}`} className="hover:bg-slate-50/70 transition-colors">
                    {colunasTabela.map(c => {
                      const status = COLUNA_VENCIMENTO_RE.test(c) ? statusPrazo(row[c]) : null
                      const corVencimento = status === 'vencido' ? 'bg-red-100 text-red-700 font-semibold'
                        : status === 'hoje' ? 'bg-amber-100 text-amber-700 font-semibold'
                        : ''
                      return (
                        <React.Fragment key={c}>
                          {c === colunaAntesEngrenagem && (
                            <td className="p-2 bg-blue-50/30">
                              <button type="button" title="Editar status e situação" onClick={() => setTituloEditando(row)} className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-white">
                                <Settings className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                          <td className={`p-3 whitespace-nowrap ${COLUNA_MOEDA_RE.test(c) ? 'text-right font-semibold text-slate-900' : ''} ${corVencimento}`}>
                            {formatarCelula(c, row[c])}
                          </td>
                        </React.Fragment>
                      )
                    })}
                    {(() => {
                      const an = anotacoes[chaveDoRegistro(row)]
                      return (
                        <>
                          {filtroCategoria === 'seguradoras' && (
                            <td className="p-3 whitespace-nowrap bg-blue-50/30">{an?.numero_sinistro || '—'}</td>
                          )}
                          {filtroCategoria === 'garantias' && (
                            <td className="p-3 whitespace-nowrap bg-blue-50/30">{an?.numero_sg || '—'}</td>
                          )}
                          <td className="p-3 whitespace-nowrap bg-blue-50/30"><StatusBadge status={statusPorId[an?.status_id]} /></td>
                          <td className="p-3 bg-blue-50/30 min-w-[14rem] max-w-[20rem] whitespace-pre-wrap break-words">{an?.situacao || '—'}</td>
                        </>
                      )
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
            {listaOrdenada.length > paginasVisiveis * LINHAS_POR_PAGINA && (
              <div className="flex items-center justify-center gap-3 p-3 border-t border-slate-100 text-xs text-slate-500">
                Exibindo {paginasVisiveis * LINHAS_POR_PAGINA} de {listaOrdenada.length}
                <button
                  type="button"
                  onClick={() => setPaginasVisiveis(p => p + 1)}
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  Mostrar mais {LINHAS_POR_PAGINA}
                </button>
                <button
                  type="button"
                  onClick={() => setPaginasVisiveis(Math.ceil(listaOrdenada.length / LINHAS_POR_PAGINA))}
                  className="font-semibold text-slate-400 hover:text-slate-600"
                >
                  Mostrar todos
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Resposta bruta da API (formato ainda não mapeado)</p>
          <pre className="text-xs text-slate-600 overflow-auto max-h-[60vh] whitespace-pre-wrap break-all">{JSON.stringify(dados, null, 2)}</pre>
        </div>
      )}

      {lista && (
        <p className="text-[10px] text-slate-400">
          {lista.length} registro(s)
          {listaCompleta && (
            <>
              {' '}de {listaCompleta.length} · filtrado por{' '}
              <strong>{LABEL_CATEGORIA[filtroCategoria]}</strong>
              {filtroPrazo && ' + '}
              {filtroPrazo && <strong>{filtroPrazo === 'vencido' ? 'Vencido' : filtroPrazo === 'hoje' ? 'Vence Hoje' : 'A Vencer'}</strong>}
              {filtroAvancadoAtivo && ' + '}
              {filtroAvancadoAtivo && <strong>Filtros</strong>}
            </>
          )}
          {' '}— período de 01/01/2020 até a data da última consulta.
        </p>
      )}
    </div>
  )
}
