import React, { useState, useCallback, useMemo } from 'react'
import { Bike, RefreshCw, AlertTriangle, ShieldCheck, Wrench, Building2, Filter, ChevronDown, ChevronUp, X, Info, Wallet, CalendarClock, CalendarCheck2 } from 'lucide-react'

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

// Uma aba por portador — mesma categorização usada em categoriaDoRegistro().
const ABAS_PORTADOR = [
  { key: 'garantias', label: 'Garantias', icon: ShieldCheck, activeBorder: 'border-sky-600', activeText: 'text-sky-700', activeBadge: 'bg-sky-50 text-sky-600' },
  { key: 'revisoes', label: 'Revisões Gratuitas', icon: Wrench, activeBorder: 'border-amber-600', activeText: 'text-amber-700', activeBadge: 'bg-amber-50 text-amber-600' },
  { key: 'seguradoras', label: 'Seguradoras', icon: Building2, activeBorder: 'border-emerald-600', activeText: 'text-emerald-700', activeBadge: 'bg-emerald-50 text-emerald-600' },
]

// Cards de resumo exibidos dentro da aba ativa — clicáveis, funcionam como filtro da tabela.
// key: null = "Total" (limpa o filtro de prazo); os demais casam com a chave usada em statusPrazo().
const CARDS_RESUMO = [
  { key: null, label: 'Total', icon: Wallet, bg: 'bg-slate-50', border: 'border-slate-200', ring: 'ring-slate-400', labelColor: 'text-slate-500', qtdColor: 'text-slate-800', valorColor: 'text-slate-900', iconColor: 'text-slate-500' },
  { key: 'vencido', label: 'Vencido', icon: AlertTriangle, bg: 'bg-red-50', border: 'border-red-200', ring: 'ring-red-400', labelColor: 'text-red-500', qtdColor: 'text-red-700', valorColor: 'text-red-800', iconColor: 'text-red-500' },
  { key: 'hoje', label: 'Vence Hoje', icon: CalendarClock, bg: 'bg-amber-50', border: 'border-amber-200', ring: 'ring-amber-400', labelColor: 'text-amber-500', qtdColor: 'text-amber-700', valorColor: 'text-amber-800', iconColor: 'text-amber-500' },
  { key: 'aVencer', label: 'A Vencer', icon: CalendarCheck2, bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-400', labelColor: 'text-emerald-500', qtdColor: 'text-emerald-700', valorColor: 'text-emerald-800', iconColor: 'text-emerald-500' },
]

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
      const r = await fetch(`${BACKEND_URL}/api/honda/contas-a-receber`)
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

  const colunaVencimento = colunas.find(c => COLUNA_VENCIMENTO_RE.test(c)) || null
  // Soma pela coluna "Aberto" (saldo em aberto) — cai para qualquer coluna de valor se não existir.
  const colunaValor = colunas.find(c => /aberto/i.test(c)) || colunas.find(c => /valor/i.test(c)) || null

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

  const categorias = useMemo(() => {
    const grupos = { garantias: { qtd: 0 }, revisoes: { qtd: 0 }, seguradoras: { qtd: 0 } }
    if (!listaCompleta) return grupos
    for (const row of listaCompleta) {
      const cat = categoriaDoRegistro(row)
      if (cat) grupos[cat].qtd += 1
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
    if (filtroPrazo && colunaVencimento) {
      filtrada = filtrada.filter(row => {
        const st = statusPrazo(row[colunaVencimento])
        const chave = st === 'vencido' ? 'vencido' : st === 'hoje' ? 'hoje' : st === 'a_vencer' ? 'aVencer' : null
        return chave === filtroPrazo
      })
    }
    return filtrada
  }, [listaCompleta, filtroCategoria, filtroEmpresa, colunaEmpresa, filtroDocumento, colunaDocumento, filtroParcela, colunaParcela, filtroOrigemDocumento, colunaOrigemDocumento, filtroNotaFiscal, colunaNotaFiscal, filtroPrazo, colunaVencimento])

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
                      const status = COLUNA_VENCIMENTO_RE.test(c) ? statusPrazo(row[c]) : null
                      const corVencimento = status === 'vencido' ? 'bg-red-100 text-red-700 font-semibold'
                        : status === 'hoje' ? 'bg-amber-100 text-amber-700 font-semibold'
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
          {listaCompleta && (
            <>
              {' '}de {listaCompleta.length} · filtrado por{' '}
              <strong>{filtroCategoria === 'garantias' ? 'Garantias' : filtroCategoria === 'revisoes' ? 'Revisões Gratuitas' : 'Seguradoras'}</strong>
              {filtroPrazo && ' + '}
              {filtroPrazo && <strong>{filtroPrazo === 'vencido' ? 'Vencido' : filtroPrazo === 'hoje' ? 'Vence Hoje' : 'A Vencer'}</strong>}
              {filtroAvancadoAtivo && ' + '}
              {filtroAvancadoAtivo && <strong>Filtro Avançado</strong>}
            </>
          )}
          {' '}— período de 01/01/2020 até a data da última consulta.
        </p>
      )}
    </div>
  )
}
