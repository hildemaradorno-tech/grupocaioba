import React, { useState, useCallback, useMemo } from 'react'
import { Bike, RefreshCw, AlertTriangle, ShieldCheck, Wrench, Building2, Filter, ChevronDown, ChevronUp, X, Info } from 'lucide-react'

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

// Só a coluna de vencimento (não emissão) recebe o destaque de vencida/vence hoje.
const COLUNA_VENCIMENTO_RE = /vencim/i

// Retorna 'vencidaMuito' (mais de 30 dias atrás) | 'vencida' (hoje ou atrasada) | 'amanha' | null.
function statusVencimento(valor) {
  const formatada = formatarData(valor)
  if (!formatada) return null
  const [dia, mes, ano] = formatada.split('/').map(Number)
  const dataVenc = new Date(ano, mes - 1, dia)
  const hoje = new Date()
  const hojeSemHora = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const diffDias = Math.round((dataVenc.getTime() - hojeSemHora.getTime()) / 86400000)
  if (diffDias < -30) return 'vencidaMuito'
  if (diffDias <= 0) return 'vencida'
  if (diffDias === 1) return 'amanha'
  return null
}

// Colunas de valor monetário (ex: ValorParcela, Aberto) — formata como R$ 0,00.
const COLUNA_MOEDA_RE = /valor|aberto/i

// Converte "1.234,56" (BR) ou "1234.56" (US) ou number em número puro. Retorna null se não for parseável.
function parseValor(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') return valor
  const s = String(valor).trim()
  const normalizado = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s
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
  return null
}

export default function HondaGarantiasReceber() {
  const cacheInicial = lerCache()
  const [dados, setDados] = useState(cacheInicial?.dados ?? null)
  const [ultimaConsulta, setUltimaConsulta] = useState(cacheInicial?.consultadoEm ?? null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState(null) // null | 'garantias' | 'revisoes' | 'seguradoras'
  const [filtroVencimento, setFiltroVencimento] = useState(null) // null | 'vencidaMuito' | 'vencida' | 'amanha'
  const [sortCol, setSortCol] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [mostrarFiltroAvancado, setMostrarFiltroAvancado] = useState(false)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroDocumento, setFiltroDocumento] = useState('')
  const [filtroParcela, setFiltroParcela] = useState('')
  const [filtroOrigemDocumento, setFiltroOrigemDocumento] = useState('')
  const [filtroNotaFiscal, setFiltroNotaFiscal] = useState('')

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
      const r = await fetch(`${BACKEND_URL}/api/honda/garantias-a-receber`)
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.message || `Erro ${r.status} ao consultar a API.`)
      }
      const data = await r.json()
      const agora = new Date().toISOString()
      setDados(data)
      setUltimaConsulta(agora)
      localStorage.setItem(CACHE_KEY, JSON.stringify({ dados: data, consultadoEm: agora }))
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const listaCompleta = extrairLista(dados)
  const colunas = listaCompleta && listaCompleta.length > 0 ? Object.keys(listaCompleta[0]) : []

  // Soma pela coluna "Aberto" (saldo em aberto) — cai para qualquer coluna de valor se não existir.
  const colunaValor = colunas.find(c => /aberto/i.test(c)) || colunas.find(c => /valor/i.test(c)) || null
  const colunaVencimento = colunas.find(c => COLUNA_VENCIMENTO_RE.test(c)) || null

  // Colunas do filtro avançado.
  const colunaEmpresa = colunas.find(c => /empresa/i.test(c)) || null
  const colunaDocumento = colunas.find(c => /^documento$/i.test(c)) || null
  const colunaParcela = colunas.find(c => /parcela/i.test(c)) || null
  const colunaOrigemDocumento = colunas.find(c => /origem/i.test(c)) || null
  const colunaNotaFiscal = colunas.find(c => /nota.?fiscal/i.test(c)) || null
  const filtroAvancadoAtivo = !!(filtroEmpresa.trim() || filtroDocumento.trim() || filtroParcela.trim() || filtroOrigemDocumento.trim() || filtroNotaFiscal.trim())
  const limparFiltroAvancado = () => {
    setFiltroEmpresa('')
    setFiltroDocumento('')
    setFiltroParcela('')
    setFiltroOrigemDocumento('')
    setFiltroNotaFiscal('')
  }

  // Base para os alertas: reflete o filtro de categoria ativo (cards), para que os alertas
  // mostrem os valores apenas da categoria selecionada.
  const baseParaAlertas = useMemo(() => {
    if (!listaCompleta) return listaCompleta
    if (!filtroCategoria) return listaCompleta
    return listaCompleta.filter(row => categoriaDoRegistro(row) === filtroCategoria)
  }, [listaCompleta, filtroCategoria])

  // Base para os cards: reflete o filtro de vencimento ativo (alertas), para que os cards
  // mostrem os valores apenas da situação de vencimento selecionada.
  const baseParaCategorias = useMemo(() => {
    if (!listaCompleta) return listaCompleta
    if (!filtroVencimento || !colunaVencimento) return listaCompleta
    return listaCompleta.filter(row => statusVencimento(row[colunaVencimento]) === filtroVencimento)
  }, [listaCompleta, filtroVencimento, colunaVencimento])

  const alertasVencimento = useMemo(() => {
    const c = {
      vencidaMuito: { qtd: 0, valor: 0 },
      vencida: { qtd: 0, valor: 0 },
      amanha: { qtd: 0, valor: 0 },
    }
    if (!baseParaAlertas || !colunaVencimento) return c
    for (const row of baseParaAlertas) {
      const st = statusVencimento(row[colunaVencimento])
      if (st && c[st]) {
        c[st].qtd += 1
        c[st].valor += colunaValor ? (parseValor(row[colunaValor]) || 0) : 0
      }
    }
    return c
  }, [baseParaAlertas, colunaVencimento, colunaValor])

  const categorias = useMemo(() => {
    const grupos = {
      garantias: { qtd: 0, valor: 0 },
      revisoes: { qtd: 0, valor: 0 },
      seguradoras: { qtd: 0, valor: 0 },
    }
    if (!baseParaCategorias) return grupos
    for (const row of baseParaCategorias) {
      const cat = categoriaDoRegistro(row)
      if (!cat) continue
      grupos[cat].qtd += 1
      grupos[cat].valor += colunaValor ? (parseValor(row[colunaValor]) || 0) : 0
    }
    return grupos
  }, [baseParaCategorias, colunaValor])

  const total = {
    qtd: categorias.garantias.qtd + categorias.revisoes.qtd + categorias.seguradoras.qtd,
    valor: categorias.garantias.valor + categorias.revisoes.valor + categorias.seguradoras.valor,
  }

  // Filtro por card (categoria), por alerta (situação de vencimento) e pelo filtro avançado — combinam entre si.
  const lista = useMemo(() => {
    if (!listaCompleta) return listaCompleta
    let filtrada = listaCompleta
    if (filtroCategoria) filtrada = filtrada.filter(row => categoriaDoRegistro(row) === filtroCategoria)
    if (filtroVencimento && colunaVencimento) {
      filtrada = filtrada.filter(row => statusVencimento(row[colunaVencimento]) === filtroVencimento)
    }
    if (filtroEmpresa.trim() && colunaEmpresa) {
      const alvo = filtroEmpresa.trim().toLowerCase()
      filtrada = filtrada.filter(row => String(row[colunaEmpresa] ?? '').toLowerCase().includes(alvo))
    }
    if (filtroDocumento.trim() && colunaDocumento) {
      const alvo = filtroDocumento.trim().toLowerCase()
      filtrada = filtrada.filter(row => String(row[colunaDocumento] ?? '').toLowerCase().includes(alvo))
    }
    if (filtroParcela.trim() && colunaParcela) {
      const alvo = filtroParcela.trim().toLowerCase()
      filtrada = filtrada.filter(row => String(row[colunaParcela] ?? '').toLowerCase().includes(alvo))
    }
    if (filtroOrigemDocumento.trim() && colunaOrigemDocumento) {
      const alvo = filtroOrigemDocumento.trim().toLowerCase()
      filtrada = filtrada.filter(row => String(row[colunaOrigemDocumento] ?? '').toLowerCase().includes(alvo))
    }
    if (filtroNotaFiscal.trim() && colunaNotaFiscal) {
      const alvo = filtroNotaFiscal.trim().toLowerCase()
      filtrada = filtrada.filter(row => String(row[colunaNotaFiscal] ?? '').toLowerCase().includes(alvo))
    }
    return filtrada
  }, [listaCompleta, filtroCategoria, filtroVencimento, colunaVencimento, filtroEmpresa, colunaEmpresa, filtroDocumento, colunaDocumento, filtroParcela, colunaParcela, filtroOrigemDocumento, colunaOrigemDocumento, filtroNotaFiscal, colunaNotaFiscal])

  const alternarFiltro = (cat) => setFiltroCategoria(prev => prev === cat ? null : cat)
  const alternarFiltroVencimento = (st) => setFiltroVencimento(prev => prev === st ? null : st)

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
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="h-5 w-5 text-red-600" />
            Controle de Processos HONDA
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
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {listaCompleta && listaCompleta.length > 0 && (alertasVencimento.vencidaMuito.qtd > 0 || alertasVencimento.vencida.qtd > 0 || alertasVencimento.amanha.qtd > 0) && (
        <div className="flex flex-col md:flex-row gap-2">
          {alertasVencimento.vencidaMuito.qtd > 0 && (
            <button
              type="button"
              onClick={() => alternarFiltroVencimento('vencidaMuito')}
              className={`flex-1 flex items-center gap-3 bg-slate-900 border rounded-lg px-4 py-3 text-left transition-all hover:bg-slate-800 ${filtroVencimento === 'vencidaMuito' ? 'border-white ring-2 ring-offset-1 ring-slate-400' : 'border-slate-700'}`}
            >
              <AlertTriangle className="h-4 w-4 text-white shrink-0" />
              <p className="text-xs text-white font-semibold flex-1">
                {alertasVencimento.vencidaMuito.qtd} título(s) vencido(s) há mais de 30 dias
                <span className="text-slate-300 font-normal"> — {fmtMoeda(alertasVencimento.vencidaMuito.valor)}</span>
              </p>
            </button>
          )}
          {alertasVencimento.vencida.qtd > 0 && (
            <button
              type="button"
              onClick={() => alternarFiltroVencimento('vencida')}
              className={`flex-1 flex items-center gap-3 bg-red-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-red-100 ${filtroVencimento === 'vencida' ? 'border-red-500 ring-2 ring-offset-1 ring-red-300' : 'border-red-300'}`}
            >
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 font-semibold flex-1">
                {alertasVencimento.vencida.qtd} título(s) vencido(s) (hoje ou até 30 dias)
                <span className="text-red-500 font-normal"> — {fmtMoeda(alertasVencimento.vencida.valor)}</span>
              </p>
            </button>
          )}
          {alertasVencimento.amanha.qtd > 0 && (
            <button
              type="button"
              onClick={() => alternarFiltroVencimento('amanha')}
              className={`flex-1 flex items-center gap-3 bg-amber-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-amber-100 ${filtroVencimento === 'amanha' ? 'border-amber-500 ring-2 ring-offset-1 ring-amber-300' : 'border-amber-300'}`}
            >
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold flex-1">
                {alertasVencimento.amanha.qtd} título(s) vencendo amanhã
                <span className="text-amber-500 font-normal"> — {fmtMoeda(alertasVencimento.amanha.valor)}</span>
              </p>
            </button>
          )}
        </div>
      )}

      {listaCompleta && listaCompleta.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => alternarFiltro('garantias')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-sky-50 border-sky-200 ${filtroCategoria === 'garantias' ? 'ring-2 ring-offset-1 ring-sky-300 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-sky-100"><ShieldCheck className="h-3.5 w-3.5 text-sky-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-sky-500">Garantias</p>
            </div>
            <p className="text-2xl font-bold text-sky-700 leading-none">{categorias.garantias.qtd}</p>
            <p className="text-[10px] text-sky-500 mt-0.5 mb-2">registro(s)</p>
            <p className="text-sm font-bold text-sky-800 pt-2 border-t border-sky-200">{fmtMoeda(categorias.garantias.valor)}</p>
          </button>
          <button
            type="button"
            onClick={() => alternarFiltro('revisoes')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-amber-50 border-amber-200 ${filtroCategoria === 'revisoes' ? 'ring-2 ring-offset-1 ring-amber-300 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-amber-100"><Wrench className="h-3.5 w-3.5 text-amber-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Revisões Gratuitas</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 leading-none">{categorias.revisoes.qtd}</p>
            <p className="text-[10px] text-amber-500 mt-0.5 mb-2">registro(s)</p>
            <p className="text-sm font-bold text-amber-800 pt-2 border-t border-amber-200">{fmtMoeda(categorias.revisoes.valor)}</p>
          </button>
          <button
            type="button"
            onClick={() => alternarFiltro('seguradoras')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroCategoria === 'seguradoras' ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-emerald-100"><Building2 className="h-3.5 w-3.5 text-emerald-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Seguradoras</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 leading-none">{categorias.seguradoras.qtd}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5 mb-2">registro(s)</p>
            <p className="text-sm font-bold text-emerald-800 pt-2 border-t border-emerald-200">{fmtMoeda(categorias.seguradoras.valor)}</p>
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria(null)}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-slate-100 border-slate-300 ${!filtroCategoria ? 'ring-2 ring-offset-1 ring-slate-400 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-slate-200"><Bike className="h-3.5 w-3.5 text-slate-700" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total</p>
            </div>
            <p className="text-2xl font-bold text-slate-800 leading-none">{total.qtd}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 mb-2">registro(s)</p>
            <p className="text-sm font-bold text-slate-900 pt-2 border-t border-slate-300">{fmtMoeda(total.valor)}</p>
          </button>
        </div>
      )}

      {listaCompleta && listaCompleta.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setMostrarFiltroAvancado(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              Filtro Avançado
              {filtroAvancadoAtivo && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">ativo</span>
              )}
            </span>
            {mostrarFiltroAvancado ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {mostrarFiltroAvancado && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Empresa</label>
                  <input
                    type="text"
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Documento</label>
                  <input
                    type="text"
                    value={filtroDocumento}
                    onChange={(e) => setFiltroDocumento(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Parcela</label>
                  <input
                    type="text"
                    value={filtroParcela}
                    onChange={(e) => setFiltroParcela(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Origem Documento</label>
                  <input
                    type="text"
                    value={filtroOrigemDocumento}
                    onChange={(e) => setFiltroOrigemDocumento(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Nota Fiscal</label>
                  <input
                    type="text"
                    value={filtroNotaFiscal}
                    onChange={(e) => setFiltroNotaFiscal(e.target.value)}
                    placeholder="Filtrar..."
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
                  <X className="h-3 w-3" /> Limpar filtro avançado
                </button>
              )}
            </div>
          )}
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
                  {colunas.map(c => (
                    <th
                      key={c}
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
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {listaOrdenada.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                    {colunas.map(c => {
                      const status = COLUNA_VENCIMENTO_RE.test(c) ? statusVencimento(row[c]) : null
                      const corVencimento = status === 'vencidaMuito' ? 'bg-slate-900 text-white font-semibold'
                        : status === 'vencida' ? 'bg-red-100 text-red-700 font-semibold'
                        : status === 'amanha' ? 'bg-amber-100 text-amber-700 font-semibold'
                        : ''
                      return (
                        <td key={c} className={`p-3 whitespace-nowrap ${COLUNA_MOEDA_RE.test(c) ? 'text-right font-semibold text-slate-900' : ''} ${corVencimento}`}>
                          {formatarCelula(c, row[c])}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
          {(filtroCategoria || filtroVencimento || filtroAvancadoAtivo) && listaCompleta && (
            <>
              {' '}de {listaCompleta.length} · filtrado por{' '}
              {filtroCategoria && <strong>{filtroCategoria === 'garantias' ? 'Garantias' : filtroCategoria === 'revisoes' ? 'Revisões Gratuitas' : 'Seguradoras'}</strong>}
              {filtroCategoria && (filtroVencimento || filtroAvancadoAtivo) && ' + '}
              {filtroVencimento && <strong>{filtroVencimento === 'vencidaMuito' ? 'Vencida há +30 dias' : filtroVencimento === 'vencida' ? 'Vencida' : 'Vence amanhã'}</strong>}
              {filtroVencimento && filtroAvancadoAtivo && ' + '}
              {filtroAvancadoAtivo && <strong>Filtro Avançado</strong>}
            </>
          )}
          {' '}— período de 01/01/2020 até a data da última consulta.
        </p>
      )}
    </div>
  )
}
