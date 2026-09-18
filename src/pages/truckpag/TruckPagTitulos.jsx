import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Truck, Download, RefreshCw, AlertTriangle, Filter, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, HelpCircle, Settings, Info, Wallet, Clock, CalendarClock } from 'lucide-react'
import { apiService } from '../../services/api'
import TruckPagNav from './TruckPagNav'
import TruckPagRegrasModal from './TruckPagRegrasModal'
import TruckPagConfigModal from './TruckPagConfigModal'
import {
  fmtMoeda, fmtData, sincronizarTudoTruckPag, conciliarTitulosRepasses, splitEstabelecimento,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo,
} from './truckpagUtils'

const CONCILIACAO_INFO = {
  exato: { label: 'Identificado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  divergente: { label: 'Divergente', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  nao_encontrado: { label: 'Não encontrado', cls: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}

// Colunas da mini-tabela de detalhe do repasse, exibida abaixo do título quando expandido.
const COLUNAS_REPASSE_DETALHE = [
  { key: 'codigo', label: 'Código', derivar: (r) => splitEstabelecimento(r.estabelecimento).codigoEmpresa || '—', campoInfo: 'codigo' },
  { key: 'empresa', label: 'Empresa', derivar: (r) => splitEstabelecimento(r.estabelecimento).empresa },
  { key: 'data_pagamento', label: 'Data Pagto', formatar: fmtData },
  { key: 'numero_os', label: 'Nº OS' },
  { key: 'nf_e', label: 'Nº NF-e', campoInfo: 'notaFiscal' },
  { key: 'nfs_e', label: 'Nº NFS-e', campoInfo: 'nfse' },
  { key: 'numero_lote', label: 'Nº Lote' },
  { key: 'parcelas', label: 'Parcelas', campoInfo: 'parcela' },
  { key: 'cnpj_cliente', label: 'CNPJ do Cliente', campoInfo: 'documento' },
  { key: 'nome_cliente', label: 'Nome do Cliente' },
  { key: 'valor_parcela_total', label: 'Valor Total Parcela', numerico: true, formatar: fmtMoeda, campoGraduacao: 'valor' },
  { key: 'taxa_adm_pct', label: 'Taxa Adm.', numerico: true, formatar: (v) => v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` },
  { key: 'valor_taxa', label: 'Valor Taxa', numerico: true, formatar: fmtMoeda },
  { key: 'valor_recebido', label: 'Valor Recebido', numerico: true, formatar: fmtMoeda },
]

// Wrappers de exibição — os helpers compartilhados retornam '' quando não há valor, aqui vira '—'.
const codigoEmpresa = (nome) => codigoEmpresaPorNome(nome) || '—'
const parcelaExibicao = (numero) => parcelaDoTitulo(numero) || '—'

function situacaoVencimento(diasAtraso) {
  if (diasAtraso === null || diasAtraso === undefined) return null
  if (diasAtraso > 30) return 'vencidaMuito'
  if (diasAtraso > 0) return 'vencida'
  if (diasAtraso === 0) return 'hoje'
  return 'aVencer'
}

// Versão resumida de situacaoVencimento pros 4 cards do topo (Valor Total/Vencido/A Vencer/Vence
// Hoje) — junta vencidaMuito+vencida num "Vencido" só, já que o detalhe de mais/menos 30 dias
// continua aparecendo na cor da linha da tabela (ver situacaoVencimento), não precisa de card
// separado pra isso.
function situacaoResumida(diasAtraso) {
  if (diasAtraso === null || diasAtraso === undefined) return null
  if (diasAtraso > 0) return 'vencido'
  if (diasAtraso === 0) return 'hoje'
  return 'aVencer'
}

export default function TruckPagTitulos() {
  const [linhas, setLinhas] = useState([])
  const [repasses, setRepasses] = useState([])
  const [tolerancia, setTolerancia] = useState(0.02)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtroSituacao, setFiltroSituacao] = useState(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [sortCol, setSortCol] = useState('titulo_data_venc')
  const [sortDir, setSortDir] = useState('asc')
  const [expandidas, setExpandidas] = useState(() => new Set())
  const [regrasAberto, setRegrasAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)

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
      const [t, r, tol] = await Promise.all([
        apiService.getTruckPagTitulos(),
        apiService.getTruckPagRepasses(),
        apiService.getTruckPagToleranciaConciliacao(),
      ])
      setLinhas(t)
      setRepasses(r)
      setTolerancia(tol)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Sincroniza as 3 fontes TruckPag (títulos, créditos, repasses) de uma vez, não só esta aba.
  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    setErro(null)
    try {
      const resultados = await sincronizarTudoTruckPag()
      const falhas = resultados.filter(r => !r.ok)
      if (falhas.length > 0) setErro(falhas.map(f => f.erro).join(' | '))
      const minha = resultados.find(r => r.chave === 'titulos')
      if (minha?.lastModified) setUltimaAtualizacao(minha.lastModified)
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSincronizando(false)
    }
  }, [carregar])

  // Concilia cada título com os repasses — ver conciliarTitulosRepasses em truckpagUtils.js.
  const titulosConciliados = useMemo(() => conciliarTitulosRepasses(linhas, repasses, tolerancia), [linhas, repasses, tolerancia])

  // 4 cards do topo: Valor Total (todos os títulos) + os 3 baldes de vencimento resumido.
  const resumoVencimento = useMemo(() => {
    const c = {
      total: { qtd: 0, valor: 0 },
      vencido: { qtd: 0, valor: 0 },
      aVencer: { qtd: 0, valor: 0 },
      hoje: { qtd: 0, valor: 0 },
    }
    for (const l of titulosConciliados) {
      c.total.qtd += 1
      c.total.valor += l.titulo_saldo || 0
      const st = situacaoResumida(l.titulo_dias_atraso)
      if (st && c[st]) { c[st].qtd += 1; c[st].valor += l.titulo_saldo || 0 }
    }
    return c
  }, [titulosConciliados])

  const filtradas = useMemo(() => {
    let f = titulosConciliados
    if (filtroSituacao) f = f.filter(l => situacaoResumida(l.titulo_dias_atraso) === filtroSituacao)
    if (filtroEmpresa.trim()) {
      const alvo = filtroEmpresa.trim().toLowerCase()
      f = f.filter(l => l.titulo_empresa_nome?.toLowerCase().includes(alvo))
    }
    if (filtroBusca.trim()) {
      const alvo = filtroBusca.trim().toLowerCase()
      f = f.filter(l =>
        String(l.titulo_codigo ?? '').toLowerCase().includes(alvo) ||
        l.titulo_numero?.toLowerCase().includes(alvo) ||
        notasFiscaisDoTitulo(l).some(nf => nf.toLowerCase().includes(alvo))
      )
    }
    return f
  }, [titulosConciliados, filtroSituacao, filtroEmpresa, filtroBusca])

  const ordenadas = useMemo(() => {
    const arr = [...filtradas]
    arr.sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      if (typeof va === 'number' || typeof vb === 'number') {
        const na = va ?? -Infinity
        const nb = vb ?? -Infinity
        return sortDir === 'asc' ? na - nb : nb - na
      }
      const sa = String(va ?? '').toLowerCase()
      const sb = String(vb ?? '').toLowerCase()
      const cmp = sa.localeCompare(sb, 'pt-BR', { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtradas, sortCol, sortDir])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  // Só títulos com repasse encontrado têm o que expandir.
  const idsExpansiveis = useMemo(() => ordenadas.filter(l => l.repasseMatch).map(l => l.id), [ordenadas])
  const todosExpandidos = idsExpansiveis.length > 0 && idsExpansiveis.every(id => expandidas.has(id))
  const alternarTodasExpandidas = () => {
    setExpandidas(todosExpandidos ? new Set() : new Set(idsExpansiveis))
  }

  const totalSaldo = filtradas.reduce((s, l) => s + (l.titulo_saldo || 0), 0)
  const totalValor = filtradas.reduce((s, l) => s + (l.titulo_valor || 0), 0)
  const filtroAvancadoAtivo = !!(filtroEmpresa.trim() || filtroBusca.trim())

  const colunas = [
    { key: 'codigo_empresa_daf', label: 'Código', naoOrdenavel: true, derivar: (row) => codigoEmpresa(row.titulo_empresa_nome), campoInfo: 'codigo' },
    { key: 'titulo_empresa_nome', label: 'Empresa' },
    { key: 'titulo_data_venc', label: 'Vencimento', numerico: false, formatar: fmtData },
    // Nota Fiscal / Nota de Serviço (peças) e Nota Fiscal/Nota de Serviço (serviço) vêm com
    // preenchimento inconsistente na planilha (número de um às vezes cai na coluna do outro) —
    // por isso mostra tudo junto numa coluna só, em vez de separar por campo de origem.
    { key: 'notas_fiscais', label: 'Notas Fiscais', naoOrdenavel: true, derivar: (row) => notasFiscaisDoTitulo(row).join(' / ') || '—', campoInfo: ['notaFiscal', 'nfse'] },
    { key: 'parcela_titulo', label: 'Parcela', naoOrdenavel: true, derivar: (row) => parcelaExibicao(row.titulo_numero), campoInfo: 'parcela' },
    { key: 'titulo_pessoa_doc_ident', label: 'CPF/CNPJ', campoGraduacao: 'documento' },
    { key: 'titulo_pessoa_nome', label: 'Cliente' },
    { key: 'titulo_numero', label: 'Título' },
    { key: 'titulo_codigo', label: 'Lançamento' },
    { key: 'titulo_data_emissao', label: 'Emissão', formatar: fmtData },
    { key: 'titulo_dias_atraso', label: 'Dias', numerico: true },
    { key: 'tipo_titulo_descr', label: 'Tipo' },
    { key: 'agente_cobrador', label: 'Agente', campoExtra: 'Agente Cobrador', naoOrdenavel: true },
    { key: 'conta_gerencial', label: 'Conta Gerencial', campoExtra: 'Conta Gerencial', naoOrdenavel: true },
    { key: 'titulo_valor', label: 'Valor', numerico: true, formatar: fmtMoeda, campoGraduacao: 'valor' },
    { key: 'titulo_saldo', label: 'Saldo', numerico: true, formatar: fmtMoeda, campoGraduacao: 'saldo' },
  ]

  // Colunas extras: tudo que veio no arquivo (dados_extra) e ainda não tem coluna própria
  // acima — mostradas do jeito que vêm do relatório, sem tratamento. Campos já mapeados em
  // colunas fixas + campos que o usuário pediu pra ocultar ficam de fora dessa lista.
  const CAMPOS_JA_MAPEADOS = new Set([
    'Empresa', 'Nro Titulo', 'Cliente/Fornecedor', 'Tipo de Título', 'Lanc.', 'Emiss.', 'Vencto.',
    'Atr.', 'O.S', 'Vendedor', 'Nota Fiscal / Nota de Serviço', 'Nota Fiscal', 'Valor', 'Saldo', 'CNPJ/CPF', 'Depart.',
    'Código Cliente', 'Veiculo Fam. Usados', 'Nr. Ped.', 'Previsão', 'Título Data', 'Placa', 'Chassi',
    'Ocorr.', 'Endoss.', 'Observ.', 'Fone', 'Grupo', 'Agente Cobrador', 'Conta Gerencial',
  ])
  const colunasExtras = useMemo(() => {
    const primeira = linhas.find(l => l.dados_extra)?.dados_extra
    if (!primeira) return []
    return Object.keys(primeira)
      .filter(campo => !CAMPOS_JA_MAPEADOS.has(campo))
      .map(campo => ({ key: `extra:${campo}`, label: campo, extra: true, campoOriginal: campo }))
  }, [linhas])

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Contas a Receber TruckPag
              <span className="relative group cursor-help">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="absolute top-full left-0 mt-2 w-96 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal space-y-1">
                  <div>Fonte de dados: Posição analítica de títulos a receber (filtrado por Agente Cobrador = TRUCKPAG)</div>
                  <div>Nome do Arquivo: RFN003_PosicaoAnaliticoReceber_Excel (4 arquivos, um por unidade — busca por início do nome)</div>
                  <div>Pasta SharePoint: /Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF</div>
                </span>
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Posição de títulos em aberto (RFN003) — sincronizado do SharePoint.</p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaAtualizacao && (
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                Atualizado em: <strong className="text-slate-500">{new Date(ultimaAtualizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
              </span>
            )}
            <button
              onClick={() => setConfigAberto(true)}
              title="Configurações"
              className="flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={sincronizar}
              disabled={sincronizando}
              title={sincronizando ? 'Atualizando...' : 'Atualizar do SharePoint'}
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className={`h-4 w-4 ${sincronizando ? 'animate-pulse' : ''}`} />
            </button>
            <button
              onClick={() => setRegrasAberto(true)}
              title="Regras de conciliação"
              className="flex items-center justify-center p-2 rounded-md text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
            >
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button type="button" onClick={() => setFiltroSituacao(p => p === 'aVencer' ? null : 'aVencer')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-blue-50 border-blue-200 ${filtroSituacao === 'aVencer' ? 'ring-2 ring-offset-1 ring-blue-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-blue-100"><Clock className="h-3.5 w-3.5 text-blue-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-blue-500">A Vencer</p>
          </div>
          <p className="text-2xl font-bold text-blue-700 leading-none">{fmtMoeda(resumoVencimento.aVencer.valor)}</p>
          <p className="text-[10px] text-blue-500 mt-0.5">{resumoVencimento.aVencer.qtd} título(s)</p>
        </button>
        <button type="button" onClick={() => setFiltroSituacao(p => p === 'hoje' ? null : 'hoje')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-amber-50 border-amber-200 ${filtroSituacao === 'hoje' ? 'ring-2 ring-offset-1 ring-amber-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-amber-100"><CalendarClock className="h-3.5 w-3.5 text-amber-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Vence Hoje</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 leading-none">{fmtMoeda(resumoVencimento.hoje.valor)}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">{resumoVencimento.hoje.qtd} título(s)</p>
        </button>
        <button type="button" onClick={() => setFiltroSituacao(p => p === 'vencido' ? null : 'vencido')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-red-50 border-red-200 ${filtroSituacao === 'vencido' ? 'ring-2 ring-offset-1 ring-red-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-red-100"><AlertTriangle className="h-3.5 w-3.5 text-red-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Vencido</p>
          </div>
          <p className="text-2xl font-bold text-red-700 leading-none">{fmtMoeda(resumoVencimento.vencido.valor)}</p>
          <p className="text-[10px] text-red-500 mt-0.5">{resumoVencimento.vencido.qtd} título(s)</p>
        </button>
        <button type="button" onClick={() => setFiltroSituacao(null)}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-slate-50 border-slate-200 ${filtroSituacao === null ? 'ring-2 ring-offset-1 ring-slate-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-slate-200"><Wallet className="h-3.5 w-3.5 text-slate-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Valor Total</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 leading-none">{fmtMoeda(resumoVencimento.total.valor)}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{resumoVencimento.total.qtd} título(s)</p>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <button type="button" onClick={() => setFiltrosAbertos(v => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            Filtros
            {filtroAvancadoAtivo && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">ativo</span>}
          </span>
          {filtrosAbertos ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
        {filtrosAbertos && (
          <div className="px-4 pb-4 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 max-w-xl">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Empresa</label>
                <input type="text" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block whitespace-nowrap">Lançamento/Nº Título/Notas Fiscais</label>
                <input type="text" value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
            </div>

            {filtroAvancadoAtivo && (
              <button type="button" onClick={() => { setFiltroEmpresa(''); setFiltroBusca('') }} className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600">
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
          <Truck className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-500">{linhas.length === 0 ? 'Nenhum título sincronizado ainda' : 'Nenhum título encontrado'}</p>
          {linhas.length === 0 && <p className="text-xs text-slate-400">Clique em "Atualizar do SharePoint" para carregar a posição de títulos (RFN003).</p>}
        </div>
      ) : (
        <>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {idsExpansiveis.length > 0 && (
              <button type="button" onClick={alternarTodasExpandidas} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1">
                {todosExpandidos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {todosExpandidos ? 'Recolher' : 'Expandir'}
              </button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                {colunas.map(c => (
                  <th
                    key={c.key}
                    onClick={c.naoOrdenavel ? undefined : () => handleSort(c.key)}
                    className={`p-3 whitespace-nowrap ${c.naoOrdenavel ? '' : 'cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors'} ${c.numerico ? 'text-right' : ''}`}
                  >
                    <span className={`flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                      {c.label}
                      {!c.naoOrdenavel && (
                        <span className={sortCol === c.key ? 'text-blue-500' : 'text-slate-300'}>{sortCol === c.key ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}</span>
                      )}
                    </span>
                  </th>
                ))}
                {colunasExtras.map(c => (
                  <th key={c.key} className="p-3 whitespace-nowrap text-slate-400">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {ordenadas.map(row => {
                const st = situacaoVencimento(row.titulo_dias_atraso)
                const cor = st === 'vencidaMuito' ? 'bg-slate-900 text-white font-semibold' : st === 'vencida' ? 'bg-red-100 text-red-700 font-semibold' : st === 'hoje' ? 'bg-amber-100 text-amber-700 font-semibold' : ''
                const conciliacaoInfo = CONCILIACAO_INFO[row.statusConciliacao]
                const camposDivergentes = row.camposDivergentes || null
                const expandida = expandidas.has(row.id)
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={row.repasseMatch ? () => alternarExpandida(row.id) : undefined}
                      title={row.repasseMatch ? conciliacaoInfo.label : undefined}
                      className={`hover:bg-slate-50/70 transition-colors ${row.repasseMatch ? 'cursor-pointer' : ''}`}
                    >
                      {colunas.map(c => {
                        const valor = c.derivar ? c.derivar(row) : c.campoExtra ? row.dados_extra?.[c.campoExtra] : row[c.key]
                        const diverge = c.campoGraduacao && camposDivergentes && camposDivergentes[c.campoGraduacao] === false
                        const chavesBate = c.campoGraduacao ? [c.campoGraduacao] : Array.isArray(c.campoInfo) ? c.campoInfo : c.campoInfo ? [c.campoInfo] : []
                        const bate = camposDivergentes && chavesBate.some(k => camposDivergentes[k] === true)
                        return (
                          <td key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right font-semibold text-slate-900' : ''} ${c.key === 'titulo_dias_atraso' ? cor : ''} ${diverge ? 'bg-amber-50 text-amber-700' : ''}`}>
                            <span className={`inline-flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                              {diverge && <AlertTriangle className="h-3 w-3 shrink-0" />}
                              {bate && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Confere com o repasse" />}
                              {c.formatar ? c.formatar(valor) : (valor ?? '—')}
                            </span>
                          </td>
                        )
                      })}
                      {colunasExtras.map(c => (
                        <td key={c.key} className="p-3 whitespace-nowrap text-slate-500">
                          {row.dados_extra?.[c.campoOriginal] ?? '—'}
                        </td>
                      ))}
                    </tr>
                    {expandida && row.repasseMatch && (
                      <tr>
                        <td colSpan={colunas.length + colunasExtras.length} className="p-0 bg-slate-50/70 border-b border-slate-100">
                          <div className="py-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 px-3">Repasse encontrado — {fmtData(row.repasseMatch.data_pagamento)}</p>
                            <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                                    {COLUNAS_REPASSE_DETALHE.map(c => (
                                      <th key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right' : ''}`}>{c.label}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="text-xs font-medium text-slate-700">
                                    {COLUNAS_REPASSE_DETALHE.map(c => {
                                      const valor = c.derivar ? c.derivar(row.repasseMatch) : row.repasseMatch[c.key]
                                      const diverge = c.campoGraduacao && camposDivergentes && camposDivergentes[c.campoGraduacao] === false
                                      const chavesBate = c.campoGraduacao ? [c.campoGraduacao] : Array.isArray(c.campoInfo) ? c.campoInfo : c.campoInfo ? [c.campoInfo] : []
                                      const bate = camposDivergentes && chavesBate.some(k => camposDivergentes[k] === true)
                                      return (
                                        <td key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right font-semibold text-slate-900' : ''} ${diverge ? 'bg-amber-50 text-amber-700' : ''}`}>
                                          <span className={`inline-flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                                            {diverge && <AlertTriangle className="h-3 w-3 shrink-0" />}
                                            {bate && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" title="Confere com o título" />}
                                            {c.formatar ? c.formatar(valor) : (valor ?? '—')}
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
                <td className="p-3" colSpan={colunas.length}>Total ({ordenadas.length} título(s))</td>
                <td className="p-3 text-right">{fmtMoeda(totalValor)}</td>
                <td className="p-3 text-right">{fmtMoeda(totalSaldo)}</td>
                {colunasExtras.length > 0 && <td colSpan={colunasExtras.length}></td>}
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
