import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeftRight, Download, RefreshCw, AlertTriangle, Filter, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, HelpCircle, Settings } from 'lucide-react'
import { apiService } from '../../services/api'
import TruckPagNav from './TruckPagNav'
import TruckPagRegrasModal from './TruckPagRegrasModal'
import TruckPagConfigModal from './TruckPagConfigModal'
import {
  fmtMoeda, fmtData, sincronizarTudoTruckPag, splitEstabelecimento,
  conciliarTitulosRepasses, tituloConciliadoPorRepasse,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo,
} from './truckpagUtils'

// Colunas da mini-tabela de detalhe do título, exibida abaixo do repasse quando expandido.
const COLUNAS_TITULO_DETALHE = [
  { key: 'codigo', label: 'Código', derivar: (t) => codigoEmpresaPorNome(t.titulo_empresa_nome) || '—', colunaRepasse: 'codigoEmpresa', campoInfo: 'codigo' },
  { key: 'titulo_empresa_nome', label: 'Empresa', colunaRepasse: 'empresa' },
  { key: 'titulo_data_venc', label: 'Vencimento', formatar: fmtData, colunaRepasse: 'data_pagamento' },
  // Nota Fiscal (peças) e Nota Fiscal/Nota de Serviço (serviço, RPS/NFS-e) vêm com preenchimento
  // inconsistente na planilha de títulos — número de serviço às vezes cai na coluna de peças e
  // vice-versa — então mostra tudo junto numa coluna só, em vez de separar por campo de origem.
  // Largura soma as duas colunas de nota do repasse (Nº NF-e + Nº NFS-e), já que aqui virou 1 só.
  { key: 'notas_fiscais', label: 'Notas Fiscais', derivar: (t) => notasFiscaisDoTitulo(t).join(' / ') || '—', colunaRepasse: ['nf_e', 'nfs_e'], campoInfo: ['notaFiscal', 'nfse'] },
  { key: 'parcela', label: 'Parcela', derivar: (t) => parcelaDoTitulo(t.titulo_numero) || '—', campoInfo: 'parcela', colunaRepasse: 'parcelas' },
  { key: 'titulo_pessoa_doc_ident', label: 'CPF/CNPJ', colunaRepasse: 'cnpj_cliente', campoInfo: 'documento' },
  { key: 'titulo_pessoa_nome', label: 'Cliente', colunaRepasse: 'nome_cliente' },
  { key: 'titulo_numero', label: 'Título' },
  { key: 'titulo_codigo', label: 'Lançamento' },
  { key: 'titulo_data_emissao', label: 'Emissão', formatar: fmtData },
  { key: 'titulo_dias_atraso', label: 'Dias', numerico: true },
  { key: 'tipo_titulo_descr', label: 'Tipo' },
  { key: 'titulo_valor', label: 'Valor', numerico: true, formatar: fmtMoeda, campoGraduacao: 'valor' },
  { key: 'titulo_saldo', label: 'Saldo', numerico: true, formatar: fmtMoeda, campoGraduacao: 'saldo' },
]

const fmtPct = (v) => v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`

const CONCILIACAO_INFO = {
  exato: { label: 'Identificado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  divergente: { label: 'Divergente', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  nao_encontrado: { label: 'Sem título', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}

// Tela detalhada, linha a linha, de todos os repasses TruckPag (sem agrupar por depósito) — a
// Conciliação já mostra os depósitos agrupados x créditos; aqui é o extrato completo, cru.
export default function TruckPagRepasses() {
  const [linhas, setLinhas] = useState([])
  const [titulos, setTitulos] = useState([])
  const [tolerancia, setTolerancia] = useState(0.02)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroConciliacao, setFiltroConciliacao] = useState(null) // null | 'exato' | 'divergente' | 'nao_encontrado'
  const [filtroGrupoRepasse, setFiltroGrupoRepasse] = useState(null)
  const [sortCol, setSortCol] = useState('data_pagamento')
  const [sortDir, setSortDir] = useState('desc')
  const [expandidas, setExpandidas] = useState(() => new Set())
  const [regrasAberto, setRegrasAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)

  // Larguras reais (medidas) das colunas da tabela de repasses que têm um par na mini-tabela
  // "Título encontrado" (marcado via `colunaRepasse` em COLUNAS_TITULO_DETALHE), pra essas colunas
  // ficarem alinhadas de verdade — largura fixa em px não funciona porque o conteúdo (nome da
  // empresa, números de NF etc.) varia de linha pra linha.
  const [largurasColunas, setLargurasColunas] = useState({})
  const colRefs = React.useRef({})
  // `colunaRepasse` pode ser uma chave só ou uma lista — quando a mini-tabela não tem coluna
  // própria pra algo que o repasse tem (ex.: Nº Lote), a coluna seguinte da mini-tabela "engole"
  // essa largura junto com a dela, somando as duas, pra não perder o alinhamento das colunas depois.
  const chavesAlinhadas = useMemo(
    () => [...new Set(COLUNAS_TITULO_DETALHE.flatMap(c => (Array.isArray(c.colunaRepasse) ? c.colunaRepasse : c.colunaRepasse ? [c.colunaRepasse] : [])))],
    []
  )
  const larguraDaColuna = (colunaRepasse) => {
    if (!colunaRepasse) return null
    if (Array.isArray(colunaRepasse)) {
      if (colunaRepasse.some(k => largurasColunas[k] == null)) return null
      return colunaRepasse.reduce((soma, k) => soma + largurasColunas[k], 0)
    }
    return largurasColunas[colunaRepasse] ?? null
  }

  useEffect(() => {
    const alvos = chavesAlinhadas.map(k => colRefs.current[k]).filter(Boolean)
    if (alvos.length === 0) return
    const medir = () => {
      const novo = {}
      for (const k of chavesAlinhadas) novo[k] = colRefs.current[k]?.offsetWidth
      setLargurasColunas(prev => (
        chavesAlinhadas.every(k => prev[k] === novo[k]) ? prev : novo
      ))
    }
    medir()
    const ro = new ResizeObserver(medir)
    alvos.forEach(el => ro.observe(el))
    return () => ro.disconnect()
  })

  const alternarExpandida = (id) => {
    setExpandidas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const [r, t, tol] = await Promise.all([
        apiService.getTruckPagRepasses({ dataInicio: dataInicio || undefined, dataFim: dataFim || undefined }),
        apiService.getTruckPagTitulos(),
        apiService.getTruckPagToleranciaConciliacao(),
      ])
      setLinhas(r)
      setTitulos(t)
      setTolerancia(tol)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => { carregar() }, [carregar])

  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    setErro(null)
    try {
      const resultados = await sincronizarTudoTruckPag()
      const falhas = resultados.filter(r => !r.ok)
      if (falhas.length > 0) setErro(falhas.map(f => f.erro).join(' | '))
      const minha = resultados.find(r => r.chave === 'repasses')
      if (minha?.lastModified) setUltimaAtualizacao(minha.lastModified)
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSincronizando(false)
    }
  }, [carregar])

  // Concilia títulos × repasses e inverte pro lado do repasse: pra cada linha aqui, qual título
  // (se algum) ficou casado com ela — verde = pode dar baixa, amarelo = achou título mas diverge
  // em algo, vermelho = nenhum título confirma esse repasse.
  const titulosConciliados = useMemo(() => conciliarTitulosRepasses(titulos, linhas, tolerancia), [titulos, linhas, tolerancia])
  const tituloPorRepasse = useMemo(() => tituloConciliadoPorRepasse(titulosConciliados), [titulosConciliados])

  const linhasComConciliacao = useMemo(() => linhas.map(l => {
    const titulo = tituloPorRepasse.get(l.id)
    return {
      ...l,
      statusConciliacao: titulo ? titulo.statusConciliacao : 'nao_encontrado',
      tituloEncontrado: titulo || null,
    }
  }), [linhas, tituloPorRepasse])

  const resumoConciliacao = useMemo(() => {
    const c = { exato: { qtd: 0, valor: 0 }, divergente: { qtd: 0, valor: 0 }, nao_encontrado: { qtd: 0, valor: 0 } }
    for (const l of linhasComConciliacao) {
      const st = c[l.statusConciliacao]
      st.qtd += 1
      st.valor += l.valor_recebido || 0
    }
    return c
  }, [linhasComConciliacao])

  // Agrupa por Estabelecimento + Data de Pagamento (o mesmo depósito bancário, igual a tela de
  // Conciliação/Saldo) — usado no filtro "Repasse por dia": clicar num chip mostra só as linhas
  // daquele depósito específico.
  const gruposPorDia = useMemo(() => {
    const totais = new Map()
    for (const l of linhas) {
      const chave = `${l.estabelecimento}|${l.data_pagamento}`
      if (!totais.has(chave)) {
        const { empresa, codigoEmpresa } = splitEstabelecimento(l.estabelecimento)
        totais.set(chave, { chave, empresa, codigoEmpresa, data_pagamento: l.data_pagamento, total: 0, qtd: 0 })
      }
      const g = totais.get(chave)
      g.total += l.valor_recebido || 0
      g.qtd += 1
    }
    return [...totais.values()].sort((a, b) => {
      const cmpEmpresa = a.empresa.localeCompare(b.empresa, 'pt-BR')
      if (cmpEmpresa !== 0) return cmpEmpresa
      return String(a.data_pagamento).localeCompare(String(b.data_pagamento))
    })
  }, [linhas])

  const filtradas = useMemo(() => {
    let f = linhasComConciliacao
    if (filtroConciliacao) f = f.filter(l => l.statusConciliacao === filtroConciliacao)
    if (filtroGrupoRepasse) f = f.filter(l => `${l.estabelecimento}|${l.data_pagamento}` === filtroGrupoRepasse)
    if (filtroTexto.trim()) {
      const alvo = filtroTexto.trim().toLowerCase()
      f = f.filter(l =>
        l.numero_os?.toLowerCase().includes(alvo) ||
        l.nf_e?.toLowerCase().includes(alvo) ||
        l.nfs_e?.toLowerCase().includes(alvo) ||
        l.numero_lote?.toLowerCase().includes(alvo) ||
        l.nome_cliente?.toLowerCase().includes(alvo) ||
        l.cnpj_cliente?.toLowerCase().includes(alvo)
      )
    }
    return f
  }, [linhasComConciliacao, filtroConciliacao, filtroGrupoRepasse, filtroTexto])

  const ordenadas = useMemo(() => {
    const arr = [...filtradas]
    arr.sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      if (typeof va === 'number' || typeof vb === 'number') {
        const cmp = (va ?? -Infinity) - (vb ?? -Infinity)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const cmp = String(va ?? '').toLowerCase().localeCompare(String(vb ?? '').toLowerCase(), 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtradas, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  // Só repasses com título encontrado têm o que expandir (o badge de "Sem título" não é clicável).
  const idsExpansiveis = useMemo(() => ordenadas.filter(l => l.tituloEncontrado).map(l => l.id), [ordenadas])
  const todosExpandidos = idsExpansiveis.length > 0 && idsExpansiveis.every(id => expandidas.has(id))
  const alternarTodasExpandidas = () => {
    setExpandidas(todosExpandidos ? new Set() : new Set(idsExpansiveis))
  }

  const totais = filtradas.reduce((acc, l) => {
    acc.bruto += l.valor_parcela_total || 0
    acc.taxa += l.valor_taxa || 0
    acc.liquido += l.valor_recebido || 0
    return acc
  }, { bruto: 0, taxa: 0, liquido: 0 })

  const filtroAtivo = !!(dataInicio || dataFim || filtroGrupoRepasse)

  const colunas = [
    { key: 'codigoEmpresa', label: 'Código Empresa', derivar: (l) => splitEstabelecimento(l.estabelecimento).codigoEmpresa, naoOrdenavel: true, campoInfo: 'codigo' },
    { key: 'empresa', label: 'Empresa', derivar: (l) => splitEstabelecimento(l.estabelecimento).empresa, naoOrdenavel: true },
    { key: 'data_pagamento', label: 'Data Pagto', formatar: fmtData },
    { key: 'nf_e', label: 'Nº NF-e', campoInfo: 'notaFiscal' },
    { key: 'nfs_e', label: 'Nº NFS-e', campoInfo: 'nfse' },
    { key: 'parcelas', label: 'Parcelas', campoInfo: 'parcela' },
    { key: 'cnpj_cliente', label: 'CNPJ do Cliente', campoInfo: 'documento' },
    { key: 'nome_cliente', label: 'Nome do Cliente' },
    { key: 'numero_os', label: 'Nº OS' },
    { key: 'numero_lote', label: 'Nº Lote' },
    { key: 'valor_os', label: 'Valor OS', numerico: true, formatar: fmtMoeda },
    { key: 'valor_nf_e', label: 'Valor NF-e', numerico: true, formatar: fmtMoeda },
    { key: 'valor_parcela_nf_e', label: 'Valor Parc. NF-e', numerico: true, formatar: fmtMoeda },
    { key: 'valor_nfs_e', label: 'Valor NFS-e', numerico: true, formatar: fmtMoeda },
    { key: 'valor_parcela_nfs_e', label: 'Valor Parc. NFS-e', numerico: true, formatar: fmtMoeda },
    { key: 'valor_parcela_total', label: 'Valor Total Parcela', numerico: true, formatar: fmtMoeda, campoGraduacao: 'valor' },
    { key: 'taxa_adm_pct', label: 'Taxa Adm.', numerico: true, formatar: fmtPct, naoOrdenavel: true },
    { key: 'valor_taxa', label: 'Valor Taxa', numerico: true, formatar: fmtMoeda },
    { key: 'valor_recebido', label: 'Valor Recebido', numerico: true, formatar: fmtMoeda },
  ]

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
              Repasses TruckPag
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Extrato completo, linha a linha, de todos os repasses recebidos — sincronizado do SharePoint.</p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaAtualizacao && (
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                Atualizado em: <strong className="text-slate-500">{new Date(ultimaAtualizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
              </span>
            )}
            <button onClick={() => setConfigAberto(true)} title="Configurações" className="flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors">
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button onClick={sincronizar} disabled={sincronizando} title={sincronizando ? 'Atualizando...' : 'Atualizar do SharePoint'} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-sm transition-colors disabled:opacity-50">
              <Download className={`h-4 w-4 ${sincronizando ? 'animate-pulse' : ''}`} />
            </button>
            <button onClick={() => setRegrasAberto(true)} title="Regras de conciliação" className="flex items-center justify-center p-2 rounded-md text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            </button>
          </div>
        </div>
        <TruckPagNav />
      </div>
      <TruckPagRegrasModal aberto={regrasAberto} onFechar={() => setRegrasAberto(false)} />
      {configAberto && <TruckPagConfigModal onClose={() => { setConfigAberto(false); carregar() }} />}

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {!loading && filtradas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Valor Bruto</p>
            <p className="text-lg font-bold text-slate-800">{fmtMoeda(totais.bruto)}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Taxa Administrativa</p>
            <p className="text-lg font-bold text-red-600">{fmtMoeda(totais.taxa)}</p>
          </div>
          <div className="bg-white rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Valor Líquido Recebido</p>
            <p className="text-lg font-bold text-emerald-800">{fmtMoeda(totais.liquido)}</p>
          </div>
        </div>
      )}

      {!loading && linhas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button type="button" onClick={() => setFiltroConciliacao(p => p === 'exato' ? null : 'exato')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroConciliacao === 'exato' ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Identificado</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700 leading-none">{fmtMoeda(resumoConciliacao.exato.valor)}</p>
            <p className="text-[10px] text-emerald-500 mt-0.5">{resumoConciliacao.exato.qtd} repasse(s) · título confere</p>
          </button>
          <button type="button" onClick={() => setFiltroConciliacao(p => p === 'divergente' ? null : 'divergente')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-amber-50 border-amber-200 ${filtroConciliacao === 'divergente' ? 'ring-2 ring-offset-1 ring-amber-300 shadow-md' : ''}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-amber-100"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Divergentes</p>
            </div>
            <p className="text-2xl font-bold text-amber-700 leading-none">{fmtMoeda(resumoConciliacao.divergente.valor)}</p>
            <p className="text-[10px] text-amber-500 mt-0.5">{resumoConciliacao.divergente.qtd} repasse(s) · achou título, algo diverge</p>
          </button>
          <button type="button" onClick={() => setFiltroConciliacao(p => p === 'nao_encontrado' ? null : 'nao_encontrado')}
            className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-red-50 border-red-200 ${filtroConciliacao === 'nao_encontrado' ? 'ring-2 ring-offset-1 ring-red-300 shadow-md' : ''}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="p-1 rounded bg-red-100"><XCircle className="h-3.5 w-3.5 text-red-600" /></div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Sem Título</p>
            </div>
            <p className="text-2xl font-bold text-red-700 leading-none">{fmtMoeda(resumoConciliacao.nao_encontrado.valor)}</p>
            <p className="text-[10px] text-red-500 mt-0.5">{resumoConciliacao.nao_encontrado.qtd} repasse(s) · nenhum título confirma</p>
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <button type="button" onClick={() => setFiltrosAbertos(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filtros
            {(filtroAtivo || filtroTexto.trim()) && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">ativo</span>}
          </span>
          {filtrosAbertos ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {filtrosAbertos && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 max-w-2xl">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Buscar (OS/NF/Lote/Cliente/CNPJ)</label>
                <input type="text" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Data de</label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Data até</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
            </div>

            {gruposPorDia.length > 0 && (
              <div className="mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">
                  Repasse por dia (Empresa · Data · Valor) — clique pra ver só as linhas daquele depósito
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar-light pr-1">
                  {gruposPorDia.map(g => (
                    <button
                      key={g.chave}
                      type="button"
                      onClick={() => setFiltroGrupoRepasse(p => p === g.chave ? null : g.chave)}
                      title={`${g.qtd} linha(s)`}
                      className={`text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                        filtroGrupoRepasse === g.chave
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                      }`}
                    >
                      {g.codigoEmpresa || '—'} · {g.empresa} · {fmtData(g.data_pagamento)} · {fmtMoeda(g.total)} <span className="opacity-70">({g.qtd})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(filtroAtivo || filtroTexto.trim()) && (
              <button type="button" onClick={() => { setDataInicio(''); setDataFim(''); setFiltroTexto(''); setFiltroGrupoRepasse(null) }} className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
          <RefreshCw className="h-6 w-6 text-slate-300 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Carregando...</p>
        </div>
      ) : ordenadas.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
          <ArrowLeftRight className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-500">{linhas.length === 0 ? 'Nenhum repasse sincronizado ainda' : 'Nenhum repasse encontrado'}</p>
          {linhas.length === 0 && <p className="text-xs text-slate-400">Clique em "Atualizar do SharePoint" para carregar os repasses.</p>}
        </div>
      ) : (
        <>
        {idsExpansiveis.length > 0 && (
          <div className="flex justify-start">
            <button type="button" onClick={alternarTodasExpandidas} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1">
              {todosExpandidos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {todosExpandidos ? 'Recolher' : 'Expandir'}
            </button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 whitespace-nowrap" title="Situação da conciliação">ST</th>
                {colunas.map(c => (
                  <th
                    key={c.key}
                    ref={chavesAlinhadas.includes(c.key) ? (el) => { colRefs.current[c.key] = el } : undefined}
                    onClick={c.naoOrdenavel ? undefined : () => handleSort(c.key)}
                    className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right' : ''} ${c.naoOrdenavel ? '' : 'cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors'}`}
                  >
                    <span className={`flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                      {c.label}
                      {!c.naoOrdenavel && (
                        <span className={sortCol === c.key ? 'text-blue-500' : 'text-slate-300'}>{sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {ordenadas.map(l => {
                const conciliacaoInfo = CONCILIACAO_INFO[l.statusConciliacao]
                const camposDivergentes = l.tituloEncontrado?.camposDivergentes || null
                const expandida = expandidas.has(l.id)
                return (
                  <React.Fragment key={l.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        {l.tituloEncontrado ? (
                          <button type="button" onClick={() => alternarExpandida(l.id)} title={conciliacaoInfo.label}
                            className={`inline-flex items-center justify-center p-1 rounded-full border transition-colors ${conciliacaoInfo.cls} hover:brightness-95`}>
                            {expandida ? <ChevronDown className="h-3 w-3" /> : <conciliacaoInfo.icon className="h-3 w-3" />}
                          </button>
                        ) : (
                          <span title={conciliacaoInfo.label} className={`inline-flex items-center justify-center p-1 rounded-full border ${conciliacaoInfo.cls}`}>
                            <conciliacaoInfo.icon className="h-3 w-3" />
                          </span>
                        )}
                      </td>
                      {colunas.map(c => {
                        const valor = c.derivar ? c.derivar(l) : l[c.key]
                        const diverge = c.campoGraduacao && camposDivergentes && camposDivergentes[c.campoGraduacao] === false
                        const bate = camposDivergentes && camposDivergentes[c.campoGraduacao ?? c.campoInfo] === true
                        return (
                          <td key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right font-semibold text-slate-900' : ''} ${diverge ? 'bg-amber-50 text-amber-700' : ''}`}>
                            <span className={`inline-flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                              {diverge && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {bate && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Confere com o título" />}
                              {c.formatar ? c.formatar(valor) : (valor || '—')}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                    {expandida && l.tituloEncontrado && (
                      <tr>
                        <td className="p-0 bg-slate-50/70 border-b border-slate-100"></td>
                        <td colSpan={colunas.length} className="p-0 bg-slate-50/70 border-b border-slate-100">
                          <div className="py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 px-3">Título encontrado — {l.tituloEncontrado.titulo_numero}</p>
                            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                              <table className="w-full text-left border-collapse" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    {COLUNAS_TITULO_DETALHE.map(c => {
                                      const largura = larguraDaColuna(c.colunaRepasse) ?? c.larguraFixa
                                      return (
                                        <th key={c.key} style={largura ? { width: largura } : undefined} className={`p-3 whitespace-nowrap overflow-hidden text-ellipsis ${c.numerico ? 'text-right' : ''}`}>{c.label}</th>
                                      )
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="text-xs font-medium text-slate-700">
                                    {COLUNAS_TITULO_DETALHE.map(c => {
                                      const valor = c.derivar ? c.derivar(l.tituloEncontrado) : l.tituloEncontrado[c.key]
                                      const diverge = c.campoGraduacao && camposDivergentes && camposDivergentes[c.campoGraduacao] === false
                                      const chavesBate = c.campoGraduacao ? [c.campoGraduacao] : Array.isArray(c.campoInfo) ? c.campoInfo : c.campoInfo ? [c.campoInfo] : []
                                      const bate = camposDivergentes && chavesBate.some(k => camposDivergentes[k] === true)
                                      const largura = larguraDaColuna(c.colunaRepasse) ?? c.larguraFixa
                                      return (
                                        <td key={c.key} style={largura ? { width: largura } : undefined} className={`p-3 whitespace-nowrap overflow-hidden text-ellipsis ${c.numerico ? 'text-right font-semibold text-slate-900' : ''} ${diverge ? 'bg-amber-50 text-amber-700' : ''}`}>
                                          <span className={`inline-flex items-center gap-1 max-w-full ${c.numerico ? 'justify-end' : ''}`}>
                                            {diverge && <AlertTriangle className="h-3 w-3 shrink-0" />}
                                            {bate && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Confere com o repasse" />}
                                            <span className="truncate">{c.formatar ? c.formatar(valor) : (valor ?? '—')}</span>
                                          </span>
                                        </td>
                                      )
                                    })}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 text-xs font-bold text-slate-700">
                <td className="p-3" colSpan={16}>Total ({ordenadas.length})</td>
                <td className="p-3 text-right">{fmtMoeda(totais.bruto)}</td>
                <td className="p-3"></td>
                <td className="p-3 text-right text-red-600">{fmtMoeda(totais.taxa)}</td>
                <td className="p-3 text-right text-emerald-700">{fmtMoeda(totais.liquido)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
