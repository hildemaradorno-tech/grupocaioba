// Gestor de Peças 2.0 — componentes compartilhados pelas telas do módulo.
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, FlaskConical, Info, PieChart, RefreshCw, Save, Search, Sparkles, X } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { analisarComIA, getOpcoes, getTela, salvarAnaliseIA } from '../gestorPecasApi'
import { OBJETIVO_TELAS } from '../gestorPecasTextos'
import { useSegmento } from '../segmento'

// ── formatação ───────────────────────────────────────────────────────────────
export const fmtMoeda = (v) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }))
export const fmtMoeda2 = (v) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }))
export const fmtMil = (v) => (v == null ? '' : Math.abs(v) >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`)
export const fmtNum = (v, casas = 0) => (v == null || !isFinite(v) ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas }))
export const fmtPct = (v, casas = 1) => (v == null || !isFinite(v) ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`)
export const fmtDias = (v) => (v == null ? '∞' : `${fmtNum(v)} d`)
export const fmtData = (iso) => (iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00').toLocaleDateString('pt-BR') : '—')
export const nomeLoja = (n) => String(n || '').replace(/^CAIOB[AÁ] (TRUCKS|MOTOS) - /i, '')
export const eixo = { fontSize: 11, fill: '#64748b' }
export const CORES = ['#ea580c', '#0ea5e9', '#16a34a', '#a855f7', '#eab308', '#ef4444', '#14b8a6', '#64748b', '#f472b6', '#84cc16']
export const COR_SITUACAO = { 'Normal': '#16a34a', 'Risco de ruptura': '#f59e0b', 'Ruptura': '#dc2626', 'Excesso': '#0ea5e9', 'Pré-obsoleto': '#a855f7', 'Obsoleto': '#475569', 'Sem estoque': '#cbd5e1' }
export const COR_ABC = { A: '#ea580c', B: '#f59e0b', C: '#94a3b8' }
export const inputCls = 'text-[11px] px-1.5 py-1 rounded-md bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40'
export const btnCls = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
export const btnPri = `${btnCls} bg-orange-600 hover:bg-orange-700 text-white`
export const btnSec = `${btnCls} bg-white border border-slate-300 text-slate-700 hover:bg-slate-50`

// ── filtros (lembrados entre as telas do módulo) ─────────────────────────────
// Filtros lembrados por Gestor (as lojas de Trucks e Motos são diferentes)
const chaveFiltros = (seg) => `gp2.filtros.${seg}`
const lerFiltrosSalvos = (seg) => { try { return JSON.parse(localStorage.getItem(chaveFiltros(seg)) || '{}') } catch { return {} } }

export const CAMPOS_FILTRO_PADRAO = ['loja', 'marca', 'grupo', 'fornecedor', 'abc', 'xyz', 'freq']

// Devolve só os filtros que a tela exibe (campos) — um filtro salvo em outra tela e que esta não
// mostra (ex.: Loja na Realocação) não pode ser aplicado escondido.
export function useFiltrosPecas(campos = CAMPOS_FILTRO_PADRAO) {
  const { seg } = useSegmento()
  const [todos, setTodos] = useState(() => lerFiltrosSalvos(seg))
  const setFiltros = useCallback((novo) => {
    setTodos(prev => {
      const v = typeof novo === 'function' ? novo(prev) : novo
      // situação é específica de cada tela: não fica salva
      const { situacao, ...persist } = v
      try { localStorage.setItem(chaveFiltros(seg), JSON.stringify(persist)) } catch { /* sem storage */ }
      return v
    })
  }, [seg])
  const chaveCampos = campos.join(',')
  const filtros = useMemo(() => Object.fromEntries(Object.entries(todos).filter(([k, v]) => v && chaveCampos.split(',').includes(k))), [todos, chaveCampos])
  return [filtros, setFiltros]
}

const _opcoesCache = {}
export function useOpcoes() {
  const { seg } = useSegmento()
  const [opcoes, setOpcoes] = useState(_opcoesCache[seg] || null)
  const [erro, setErro] = useState(null)
  const recarregar = useCallback(() => getOpcoes().then(o => { _opcoesCache[seg] = o; setOpcoes(o) }).catch(e => setErro(e.message)), [seg])
  useEffect(() => { if (_opcoesCache[seg]) setOpcoes(_opcoesCache[seg]); else recarregar() }, [recarregar, seg])
  return { opcoes, erro, recarregar }
}

export function useTela(tela, filtros) {
  const { seg } = useSegmento()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const chave = JSON.stringify(filtros || {})
  const carregar = useCallback(() => {
    setCarregando(true); setErro(null)
    getTela(tela, JSON.parse(chave))
      .then(setDados)
      .catch(e => setErro(e.message))
      .finally(() => setCarregando(false))
  }, [tela, chave, seg]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { carregar() }, [carregar])
  return { dados, carregando, erro, recarregar: carregar }
}

// ── ⓘ ─────────────────────────────────────────────────────────────────────────
export function BotaoInfo({ titulo, info, className = 'absolute top-2 right-2' }) {
  const [aberto, setAberto] = useState(false)
  if (!info) return null
  const secoes = [['Objetivo', info.objetivo], ['Cálculo', info.calculo], ['Fonte', info.fonte]]
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={`Informações: ${titulo}`} title="Como é calculado"
        className={`${className} p-0.5 rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50`}>
        <Info className="h-3.5 w-3.5" />
      </button>
      {aberto && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl text-[11px] text-slate-700 w-full max-w-md max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200">
              <p className="text-sm font-bold text-slate-900">{titulo}</p>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              {secoes.filter(([, t]) => t).map(([nome, texto]) => (
                <div key={nome}>
                  <p className="text-[10px] font-bold uppercase text-orange-700">{nome}</p>
                  <p className="leading-snug mt-0.5 whitespace-pre-line">{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

export function CardKpi({ label, valor, sub, info, cor = '#ea580c', onClick }) {
  return (
    <div className={`relative bg-white border border-slate-200 rounded-lg p-3 flex gap-2.5 ${onClick ? 'cursor-pointer hover:border-orange-300 hover:shadow-sm' : ''}`} onClick={onClick}>
      <BotaoInfo titulo={label} info={info} />
      <div className="w-1 rounded shrink-0" style={{ backgroundColor: cor }} />
      <div className="flex-1 pr-4 min-w-0">
        <p className="text-[11px] font-semibold text-slate-600 leading-tight">{label}</p>
        <p className="text-base font-bold text-slate-900 mt-1 truncate">{valor}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  )
}

export function CardGrafico({ titulo, info, altura = 'h-60', acoes, children }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo={titulo} info={info} />
      <div className="flex items-center justify-between gap-2 mb-2 pr-6">
        <p className="text-[11px] font-semibold text-slate-700 leading-tight">{titulo}</p>
        {acoes}
      </div>
      <div className={altura}>{children}</div>
    </div>
  )
}

export function Abas({ abas, aba, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
      {abas.map(a => {
        const [valor, rotulo] = Array.isArray(a) ? a : [a, a]
        return (
          <button key={valor} type="button" onClick={() => onChange(valor)}
            className={`px-3.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${aba === valor ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
            {rotulo}
          </button>
        )
      })}
    </div>
  )
}

const CORES_BADGE = {
  'Normal': 'bg-green-100 text-green-700', 'Risco de ruptura': 'bg-amber-100 text-amber-800', 'Ruptura': 'bg-red-100 text-red-700',
  'Excesso': 'bg-sky-100 text-sky-700', 'Pré-obsoleto': 'bg-purple-100 text-purple-700', 'Obsoleto': 'bg-slate-200 text-slate-700', 'Sem estoque': 'bg-slate-100 text-slate-500',
  'Crítica': 'bg-red-600 text-white', 'Alta': 'bg-red-100 text-red-700', 'Média': 'bg-amber-100 text-amber-800', 'Baixa': 'bg-slate-100 text-slate-600',
  'Atrasado': 'bg-red-100 text-red-700', 'No prazo': 'bg-green-100 text-green-700', 'Sem data': 'bg-slate-100 text-slate-600', 'Recebido parcial': 'bg-amber-100 text-amber-800',
  'Pendente': 'bg-slate-100 text-slate-600', 'Aprovada': 'bg-green-100 text-green-700', 'Rejeitada': 'bg-red-100 text-red-700', 'Pedido emitido': 'bg-sky-100 text-sky-700',
  'Sugerida': 'bg-slate-100 text-slate-600', 'Enviada': 'bg-sky-100 text-sky-700', 'Recebida': 'bg-green-100 text-green-700', 'Cancelada': 'bg-slate-200 text-slate-500',
  'Planejada': 'bg-slate-100 text-slate-600', 'Ativa': 'bg-green-100 text-green-700', 'Encerrada': 'bg-sky-100 text-sky-700',
  A: 'bg-orange-100 text-orange-700', B: 'bg-amber-100 text-amber-700', C: 'bg-slate-100 text-slate-600',
}
export function Badge({ texto, className = '' }) {
  if (texto == null || texto === '') return null
  return <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${CORES_BADGE[texto] || 'bg-slate-100 text-slate-600'} ${className}`}>{texto}</span>
}
// Curva de Venda (ABC) · Curva XYZ (valor em estoque) · Popularidade — sempre com o nome, nunca a letra solta
export const NOME_FREQ = { F: 'Alta', M: 'Média', R: 'Baixa' }
export const NOME_REG = { E: 'Estável', V: 'Variável', I: 'Irregular' }
export const BadgeClasse = ({ r }) => (
  <span className="inline-flex gap-0.5 whitespace-nowrap" title={`Curva de Venda ${r.abc} · XYZ (estoque) ${r.xyz} · Popularidade ${NOME_FREQ[r.freq] || r.freq}${r.mobilidade ? ` · Mobilidade ${r.mobilidade}` : ''}`}>
    <span className={`px-1 py-0.5 rounded text-[10px] font-semibold ${CORES_BADGE[r.abc]}`}>V-{r.abc}</span>
    <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">{r.xyz}</span>
    <span className="px-1 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-700">{NOME_FREQ[r.freq] || r.freq}</span>
  </span>
)
const COR_MOB = { 'Rápido': 'bg-green-100 text-green-700', 'Lento': 'bg-amber-100 text-amber-800', 'Parado': 'bg-purple-100 text-purple-700', 'Obsoleto (D)': 'bg-slate-200 text-slate-700' }
export const BadgeMobilidade = ({ m }) => (m ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${COR_MOB[m] || ''}`}>{m}</span> : null)

// ── barra de filtros ─────────────────────────────────────────────────────────
const SITUACOES = ['Normal', 'Risco de ruptura', 'Ruptura', 'Excesso', 'Pré-obsoleto', 'Obsoleto', 'Sem estoque']
export function BarraFiltros({ filtros, setFiltros, mostrar = CAMPOS_FILTRO_PADRAO }) {
  const { opcoes } = useOpcoes()
  const set = (campo) => (e) => setFiltros(f => ({ ...f, [campo]: e.target.value || undefined }))
  const sel = (campo, rotulo, lista, rot = (x) => x) => mostrar.includes(campo) && (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase">{rotulo}</label>
      <select className={`${inputCls} max-w-[190px]`} value={filtros[campo] || ''} onChange={set(campo)}>
        <option value="">Todos</option>
        {(lista || []).map(v => <option key={v} value={v}>{rot(v)}</option>)}
      </select>
    </div>
  )
  const ativos = Object.keys(filtros).filter(k => filtros[k] && mostrar.includes(k)).length
  return (
    <div className="flex flex-wrap items-end gap-3">
      {sel('loja', 'Loja', opcoes?.lojas, nomeLoja)}
      {sel('marca', 'Marca', opcoes?.marcas)}
      {sel('grupo', 'Tipo de produto', opcoes?.grupos)}
      {sel('fornecedor', 'Fornecedor', opcoes?.fornecedores)}
      {sel('abc', 'Curva de Venda', ['A', 'B', 'C'])}
      {sel('xyz', 'XYZ (estoque)', ['X', 'Y', 'Z'])}
      {sel('freq', 'Popularidade', ['F', 'M', 'R'], v => NOME_FREQ[v])}
      {sel('situacao', 'Situação', SITUACOES)}
      {ativos > 0 && (
        <button type="button" className="text-[11px] text-orange-700 hover:underline pb-1" onClick={() => setFiltros(f => Object.fromEntries(Object.entries(f).filter(([k]) => !mostrar.includes(k))))}>
          Limpar filtros ({ativos})
        </button>
      )}
    </div>
  )
}

// ── tabela com ordenação, busca, paginação e exportação xlsx ─────────────────
const FORMATOS = { moeda: fmtMoeda, moeda2: fmtMoeda2, num: (v) => fmtNum(v), num1: (v) => fmtNum(v, 1), num2: (v) => fmtNum(v, 2), pct: (v) => fmtPct(v), dias: fmtDias, data: fmtData, loja: nomeLoja }
const NUMERICOS = new Set(['moeda', 'moeda2', 'num', 'num1', 'num2', 'pct', 'dias'])

/**
 * cols: [{ k, t, fmt?: 'moeda'|'num'|..., render?: (row) => node, exportar?: (row) => valor, w?: classe }]
 * selecao: { selecionados: Set, setSelecionados, chave: (row) => string } — habilita checkboxes
 */
export function TabelaPecas({ rows, cols, nomeArquivo = 'gestor-pecas', tamanhoPagina = 25, vazio = 'Nenhum registro para os filtros atuais.', selecao, ordemInicial, acoesTopo, linhaClasse }) {
  const sg = useSegmento()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState(ordemInicial || null) // { k, dir }
  const [pagina, setPagina] = useState(0)
  useEffect(() => { setPagina(0) }, [rows, busca])

  const filtradas = useMemo(() => {
    const t = busca.toLowerCase().trim()
    let lista = rows || []
    if (t) lista = lista.filter(r => cols.some(c => String(r[c.k] ?? '').toLowerCase().includes(t)))
    if (ordem) {
      lista = [...lista].sort((a, b) => {
        const va = a[ordem.k], vb = b[ordem.k]
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
        return ordem.dir === 'asc' ? r : -r
      })
    }
    return lista
  }, [rows, busca, ordem, cols])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / tamanhoPagina))
  const visiveis = filtradas.slice(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina)

  const exportar = () => {
    const dados = filtradas.map(r => Object.fromEntries(cols.filter(c => c.k !== '_acoes').map(c => {
      let v = c.exportar ? c.exportar(r) : r[c.k]
      if (Array.isArray(v)) v = v.join('; ')
      if (c.fmt === 'loja') v = nomeLoja(v)
      return [c.t, v]
    })))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dados')
    XLSX.writeFile(wb, `${nomeArquivo}-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const todasSel = selecao && filtradas.length > 0 && filtradas.every(r => selecao.selecionados.has(selecao.chave(r)))
  const alternarTodas = () => {
    const novo = new Set(selecao.selecionados)
    if (todasSel) filtradas.forEach(r => novo.delete(selecao.chave(r)))
    else filtradas.forEach(r => novo.add(selecao.chave(r)))
    selecao.setSelecionados(novo)
  }
  const alternar = (r) => {
    const novo = new Set(selecao.selecionados)
    const k = selecao.chave(r)
    novo.has(k) ? novo.delete(k) : novo.add(k)
    selecao.setSelecionados(novo)
  }

  const celula = (c, r) => {
    if (c.render) return c.render(r)
    const v = r[c.k]
    if (c.k === 'codigo' && v) return <Link to={`${sg.rota('produto')}?codigo=${v}`} className="text-orange-700 font-semibold hover:underline">{v}</Link>
    if (c.fmt && FORMATOS[c.fmt]) return FORMATOS[c.fmt](v)
    if (typeof v === 'boolean') return v ? 'Sim' : '—'
    if (Array.isArray(v)) return v.join('; ')
    return v ?? '—'
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-1.5 top-1/2 -translate-y-1/2" />
            <input className={`${inputCls} pl-6 w-56`} placeholder="Buscar na tabela..." value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <span className="text-[11px] text-slate-500">{fmtNum(filtradas.length)} registros{selecao?.selecionados.size ? ` · ${selecao.selecionados.size} selecionados` : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {acoesTopo}
          <button type="button" className={btnSec} onClick={exportar} disabled={!filtradas.length}><Download className="h-3.5 w-3.5" /> Excel</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {selecao && <th className="px-2 py-1.5 w-6"><input type="checkbox" checked={!!todasSel} onChange={alternarTodas} aria-label="Selecionar todos" /></th>}
              {cols.map(c => {
                const num = NUMERICOS.has(c.fmt)
                const ativo = ordem?.k === c.k
                return (
                  <th key={c.k} className={`px-2 py-1.5 font-semibold whitespace-nowrap select-none ${num ? 'text-right' : 'text-left'} ${c.k !== '_acoes' ? 'cursor-pointer hover:text-slate-900' : ''} ${c.w || ''}`}
                    title={c.dica}
                    onClick={() => c.k !== '_acoes' && setOrdem(o => (o?.k === c.k ? { k: c.k, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { k: c.k, dir: num ? 'desc' : 'asc' }))}>
                    <span className="inline-flex items-center gap-0.5">{c.t}{ativo && (ordem.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && <tr><td colSpan={cols.length + (selecao ? 1 : 0)} className="px-2 py-6 text-center text-slate-400">{vazio}</td></tr>}
            {visiveis.map((r, i) => (
              <tr key={selecao ? selecao.chave(r) : i} className={`border-t border-slate-100 hover:bg-orange-50/40 ${linhaClasse ? linhaClasse(r) : ''}`}>
                {selecao && <td className="px-2 py-1"><input type="checkbox" checked={selecao.selecionados.has(selecao.chave(r))} onChange={() => alternar(r)} aria-label="Selecionar" /></td>}
                {cols.map(c => <td key={c.k} className={`px-2 py-1 ${NUMERICOS.has(c.fmt) ? 'text-right tabular-nums whitespace-nowrap' : ''} ${c.w || ''}`}>{celula(c, r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-end gap-2 p-2 border-t border-slate-100 text-[11px] text-slate-600">
          <button type="button" className="p-1 rounded border border-slate-300 disabled:opacity-40" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior"><ChevronLeft className="h-3.5 w-3.5" /></button>
          <span>Página {pagina + 1} de {totalPaginas}</span>
          <button type="button" className="p-1 rounded border border-slate-300 disabled:opacity-40" disabled={pagina >= totalPaginas - 1} onClick={() => setPagina(p => p + 1)} aria-label="Próxima página"><ChevronRight className="h-3.5 w-3.5" /></button>
        </div>
      )}
    </div>
  )
}

// ── Painel de análise com IA ─────────────────────────────────────────────────
const COR_PRIORIDADE = { Alta: 'bg-red-100 text-red-700', 'Média': 'bg-amber-100 text-amber-800', Baixa: 'bg-slate-100 text-slate-600', Alto: 'bg-red-100 text-red-700', 'Médio': 'bg-amber-100 text-amber-800', Baixo: 'bg-slate-100 text-slate-600' }

export function ResultadoIA({ r }) {
  const sg = useSegmento()
  if (!r) return null
  return (
    <div className="space-y-4 text-[11px] text-slate-700">
      {r.aviso && <div className="flex gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /><p>{r.aviso}</p></div>}
      {r.resumo && <p className="text-[12px] leading-relaxed text-slate-800">{r.resumo}</p>}
      {!!r.achados?.length && (
        <div><p className="text-[10px] font-bold uppercase text-orange-700 mb-1">Achados</p>
          <ul className="space-y-1.5">{r.achados.map((a, i) => <li key={i}><strong>{a.titulo}:</strong> {a.detalhe}</li>)}</ul></div>
      )}
      {!!r.riscos?.length && (
        <div><p className="text-[10px] font-bold uppercase text-orange-700 mb-1">Riscos</p>
          <ul className="space-y-1.5">{r.riscos.map((a, i) => <li key={i}>{a.impacto && <span className={`mr-1 px-1 rounded text-[10px] font-semibold ${COR_PRIORIDADE[a.impacto] || ''}`}>{a.impacto}</span>}<strong>{a.titulo}:</strong> {a.detalhe}</li>)}</ul></div>
      )}
      {!!r.acoes?.length && (
        <div><p className="text-[10px] font-bold uppercase text-orange-700 mb-1">Ações recomendadas</p>
          <ul className="space-y-2">{r.acoes.map((a, i) => (
            <li key={i} className="p-2 rounded-md border border-slate-200">
              <div className="flex items-start gap-1.5"><span className={`px-1 rounded text-[10px] font-semibold shrink-0 ${COR_PRIORIDADE[a.prioridade] || 'bg-slate-100'}`}>{a.prioridade}</span><span>{a.acao}</span></div>
              {a.ganho_estimado && <p className="text-[10px] text-green-700 mt-1">Ganho estimado: {a.ganho_estimado}</p>}
              {!!a.itens?.length && <div className="flex flex-wrap gap-1 mt-1">{a.itens.slice(0, 12).map(c => <Link key={c} to={`${sg.rota('produto')}?codigo=${c}`} className="px-1 rounded bg-orange-50 text-orange-700 text-[10px] hover:underline">{c}</Link>)}</div>}
            </li>
          ))}</ul></div>
      )}
    </div>
  )
}

export function BotaoAnaliseIA({ tela, titulo, filtros, codigo, rotulo = 'Analisar com IA' }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvo, setSalvo] = useState(false)
  const analisar = async () => {
    setAberto(true); setCarregando(true); setErro(null); setSalvo(false)
    try { setResultado(await analisarComIA({ tela, titulo, filtros, codigo })) }
    catch (e) { setErro(e.message) }
    finally { setCarregando(false) }
  }
  const salvar = async () => {
    try { await salvarAnaliseIA({ tela, filtros: { ...filtros, codigo }, motor: resultado.motor, resultado }); setSalvo(true) }
    catch (e) { setErro(e.message) }
  }
  return (
    <>
      <button type="button" onClick={analisar} className={`${btnCls} bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white`}>
        <Sparkles className="h-3.5 w-3.5" /> {rotulo}
      </button>
      {aberto && createPortal(
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" onMouseDown={(e) => { if (e.target === e.currentTarget) setAberto(false) }}>
          <div className="h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">Análise — {titulo}</p>
                  {resultado && <p className="text-[10px] text-slate-500">{resultado.motor === 'ia' ? 'Gerada por IA sobre os dados filtrados' : 'Análise por regras (IA indisponível)'}</p>}
                </div>
              </div>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {carregando && <div className="flex items-center gap-2 text-[11px] text-slate-500"><RefreshCw className="h-4 w-4 animate-spin" /> Analisando os dados...</div>}
              {erro && <p className="text-[11px] text-red-600">{erro}</p>}
              {!carregando && <ResultadoIA r={resultado} />}
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">
              {salvo && <span className="text-[11px] text-green-700">Análise salva no histórico.</span>}
              <button type="button" className={btnSec} onClick={analisar} disabled={carregando}><RefreshCw className="h-3.5 w-3.5" /> Refazer</button>
              <button type="button" className={btnPri} onClick={salvar} disabled={carregando || !resultado || salvo}><Save className="h-3.5 w-3.5" /> Salvar análise</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

// ── Página padrão do módulo ──────────────────────────────────────────────────
export function PaginaPecas({ icone: Icone, titulo, tela, fonte, carregando, erro, onRecarregar, filtros, setFiltros, mostrarFiltros, iaTela, acoes, children }) {
  const sg = useSegmento()
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center shrink-0">
              {Icone && <Icone className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{titulo}</h1>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Gestor de Peças 2.0 — {sg.nome} <span className="normal-case">({sg.sistema})</span></p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {acoes}
            {iaTela && <BotaoAnaliseIA tela={iaTela} titulo={titulo} filtros={filtros} />}
            {onRecarregar && <button type="button" className={btnSec} onClick={onRecarregar} disabled={carregando} title="Recalcular"><RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar</button>}
            {hasPermission(sg.bi) && <button type="button" className={btnSec} onClick={() => navigate('/' + sg.bi)}><PieChart className="h-3.5 w-3.5" /> Ir para Dashboard</button>}
          </div>
        </div>
        {OBJETIVO_TELAS[tela] && <p className="text-[11px] text-slate-500 leading-snug max-w-5xl">{OBJETIVO_TELAS[tela]}</p>}
        {fonte === 'mock' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800 w-fit">
            <FlaskConical className="h-3.5 w-3.5" /> <strong>Dados simulados</strong> — fase 1 para validar telas e regras; os números não são reais.
          </div>
        )}
        {fonte && fonte !== 'mock' && <AvisoIntegracao fonte={fonte} />}
        {setFiltros && <BarraFiltros filtros={filtros} setFiltros={setFiltros} mostrar={mostrarFiltros} />}
      </div>
      {erro && <div className="p-3 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-700">{erro}</div>}
      {carregando && !erro && <div className="flex items-center gap-2 text-[11px] text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Calculando...</div>}
      {children}
    </div>
  )
}

// Gestor sem dados de origem ainda: mostra o que falta integrar (lista vem do backend — dataProvider.js)
export function AvisoIntegracao({ fonte = 'aguardando_integracao' }) {
  const sg = useSegmento()
  const { opcoes } = useOpcoes()
  const [aberto, setAberto] = useState(fonte === 'aguardando_integracao')
  const pend = opcoes?.pendencias || []
  if (fonte !== 'aguardando_integracao' && !pend.length) return null
  return (
    <div className="px-3 py-2 rounded-md bg-sky-50 border border-sky-200 text-[11px] text-sky-900 max-w-5xl">
      <button type="button" className="flex items-center gap-1.5 font-semibold text-left" onClick={() => setAberto(a => !a)}>
        <Info className="h-3.5 w-3.5 shrink-0" />
        {fonte === 'aguardando_integracao'
          ? `Aguardando integração dos dados do ${sg.sistema} — as telas ficam vazias até cada fonte ser conectada.`
          : `Dados reais do ${sg.sistema} — integração parcial (${pend.length} pendência${pend.length > 1 ? 's' : ''}). ${aberto ? 'Ocultar' : 'Ver o que falta'}`}
      </button>
      {aberto && !!pend.length && <ul className="list-disc pl-6 mt-1 space-y-0.5">{pend.map(p => <li key={p}>{p}</li>)}</ul>}
    </div>
  )
}

export function Secao({ titulo, children, acoes }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[12px] font-bold text-slate-700 uppercase tracking-wide">{titulo}</h2>
        {acoes}
      </div>
      {children}
    </div>
  )
}

export function Modal({ titulo, onFechar, children, rodape, largura = 'max-w-lg' }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onFechar() }}>
      <div className={`bg-white rounded-lg shadow-xl w-full ${largura} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-200">
          <p className="text-sm font-bold text-slate-900">{titulo}</p>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 overflow-y-auto text-[11px] text-slate-700">{children}</div>
        {rodape && <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200">{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}
