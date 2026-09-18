import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { ArrowLeftRight, RefreshCw, AlertTriangle, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, HelpCircle, Settings, Info, Link2, Link2Off, FileDown, FileText, Loader2, Archive, Lock, Unlock, ClipboardList } from 'lucide-react'
import { apiService } from '../../services/api'
import TruckPagNav from './TruckPagNav'
import TruckPagRegrasModal from './TruckPagRegrasModal'
import TruckPagConfigModal from './TruckPagConfigModal'
import TruckPagRepasseDetalheModal from './TruckPagRepasseDetalheModal'
import TruckPagBaixadosModal from './TruckPagBaixadosModal'
import {
  fmtMoeda, fmtData, sincronizarTudoTruckPag, splitEstabelecimento,
  conciliarTitulosRepasses, tituloConciliadoPorRepasse,
  conciliarRepassesCreditos, filtrarCreditosPorTipoSaldo,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo,
  gerarArquivoBaixaTitulos, siglaEmpresaPorNome, LABEL_CAMPO_CONCILIACAO,
} from './truckpagUtils'

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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
  { key: 'titulo_pessoa_doc_ident', label: 'CPF/CNPJ', colunaRepasse: 'cnpj_cliente', campoGraduacao: 'documento' },
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
// Saldo Concessionária já mostra os depósitos agrupados x créditos; aqui é o extrato completo, cru.
export default function TruckPagRepasses() {
  const [linhas, setLinhas] = useState([])
  const [titulos, setTitulos] = useState([])
  const [creditos, setCreditos] = useState([])
  const [tiposSaldo, setTiposSaldo] = useState([])
  const [baixas, setBaixas] = useState([])
  const [tolerancia, setTolerancia] = useState(0.02)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtroGrupoRepasse, setFiltroGrupoRepasse] = useState(null)
  const [filtroNaoIdentificado, setFiltroNaoIdentificado] = useState(false)
  const [filtroDivergente, setFiltroDivergente] = useState(false)
  const [sortCol, setSortCol] = useState('data_pagamento')
  const [sortDir, setSortDir] = useState('desc')
  const [expandidas, setExpandidas] = useState(() => new Set())
  const [regrasAberto, setRegrasAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [dataExport, setDataExport] = useState(hojeIso)
  const [processandoPdf, setProcessandoPdf] = useState(false)
  const [mostrarLinhasForaGrupo, setMostrarLinhasForaGrupo] = useState(false)
  const [mostrarBaixados, setMostrarBaixados] = useState(false)

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
      const [r, t, tol, cred, tipos, baix] = await Promise.all([
        apiService.getTruckPagRepasses(),
        apiService.getTruckPagTitulos(),
        apiService.getTruckPagToleranciaConciliacao(),
        apiService.getTruckPagCreditos(),
        apiService.getTruckPagTiposSaldo(),
        apiService.getTruckPagBaixasTitulos(),
      ])
      setLinhas(r)
      setTitulos(t)
      setTolerancia(tol)
      setCreditos(cred)
      setTiposSaldo(tipos)
      setBaixas(baix)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

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
  // em algo. Repasses sem título encontrado (vermelho) não entram nessa tela — pedido do usuário
  // pra não misturar repasse não vinculado no extrato (ver linhasVinculadas abaixo).
  const titulosConciliados = useMemo(() => conciliarTitulosRepasses(titulos, linhas, tolerancia), [titulos, linhas, tolerancia])
  const tituloPorRepasse = useMemo(() => tituloConciliadoPorRepasse(titulosConciliados), [titulosConciliados])

  // Vínculo Repasse × Crédito — a MESMA conciliação da tela Saldo Concessionária (não é a mesma
  // coisa que Título × Repasse acima): agrupa por estabelecimento+data (1 depósito) e casa o total
  // do grupo com um crédito não identificado (RFN024, filtrado por Tipo de Saldo). Usado só pra
  // rotular "Conciliado/Não conciliado" nos cards de Valor Bruto/Taxa/Líquido — pedido do usuário
  // pra esses cards responderem "isso já foi identificado na tesouraria?", não "achou título?".
  const creditosFiltrados = useMemo(() => filtrarCreditosPorTipoSaldo(creditos, tiposSaldo), [creditos, tiposSaldo])
  const { grupos: gruposSaldo } = useMemo(() => conciliarRepassesCreditos(linhas, creditosFiltrados, tolerancia), [linhas, creditosFiltrados, tolerancia])
  const vinculoSaldoPorChave = useMemo(() => {
    const m = new Map()
    for (const g of gruposSaldo) m.set(g.chave, !!g.creditoVinculado)
    return m
  }, [gruposSaldo])

  const linhasComConciliacao = useMemo(() => linhas.map(l => {
    const titulo = tituloPorRepasse.get(l.id)
    return {
      ...l,
      statusConciliacao: titulo ? titulo.statusConciliacao : 'nao_encontrado',
      tituloEncontrado: titulo || null,
      conciliadoSaldo: vinculoSaldoPorChave.get(`${l.estabelecimento}|${l.data_pagamento}`) || false,
    }
  }), [linhas, tituloPorRepasse, vinculoSaldoPorChave])

  // Títulos que já foram exportados em "Exportar Baixa" (truckpag_baixas_titulos, ver botão
  // "Baixados") — ficam escondidos da tela até o usuário trazer o grupo de volta.
  const titulosCodigosBaixados = useMemo(() => new Set(baixas.map(b => b.titulo_codigo)), [baixas])

  // Base de toda a tela: só repasses com título vinculado (exato ou divergente) e cujo título
  // ainda não foi baixado. Repasses sem título (nao_encontrado) e títulos já baixados ficam de
  // fora daqui pra frente — não aparecem em cards, filtros, agrupamento "Repasse por dia" nem na
  // tabela.
  const linhasVinculadas = useMemo(() => linhasComConciliacao.filter(l =>
    l.statusConciliacao !== 'nao_encontrado' && !(l.tituloEncontrado && titulosCodigosBaixados.has(l.tituloEncontrado.titulo_codigo))
  ), [linhasComConciliacao, titulosCodigosBaixados])

  // Chips do filtro "Repasse por dia" agora representam o SALDO CONCESSIONÁRIA (crédito da
  // tesouraria, RFN024) que já bateu com um depósito de repasse — não mais o total do repasse
  // fabricante somado. `dataCredito`/`valorCredito` (exibidos no chip) são os do próprio crédito,
  // exatamente como aparecem no RFN024 — sem empresa no texto (pedido do usuário). O crédito casa
  // só por VALOR (ver conciliarRepassesCreditos), então a data dele pode ser diferente da data do
  // depósito de repasse — por isso mantém `data_pagamento`/`total` do repasse separados, usados só
  // no nome do arquivo de baixa/PDF (não mudam de comportamento). Só entram grupos com crédito
  // vinculado; `chave` continua sendo estabelecimento+data pra filtrar a tabela.
  const gruposPorDia = useMemo(() => {
    return gruposSaldo
      .filter(g => g.creditoVinculado)
      .map(g => {
        // Status de baixa do lote: olha só as linhas do grupo que TÊM título vinculado (as sem
        // título nunca entram em "Exportar Baixa", não contam pra essa conta). 'nenhum' = nada
        // baixado ainda (sem cadeado), 'parcial' = uma parte (cadeado aberto), 'total' = todos os
        // títulos do lote já foram baixados (cadeado fechado).
        const titulosDoGrupo = g.linhas.map(l => tituloPorRepasse.get(l.id)).filter(Boolean)
        const baixados = titulosDoGrupo.filter(t => titulosCodigosBaixados.has(t.titulo_codigo)).length
        const statusBaixa = titulosDoGrupo.length === 0 || baixados === 0
          ? 'nenhum'
          : baixados === titulosDoGrupo.length ? 'total' : 'parcial'
        return {
          chave: g.chave,
          empresa: g.empresa,
          codigoEmpresa: g.codigoEmpresa,
          data_pagamento: g.data_pagamento,
          total: g.total,
          dataCredito: g.creditoVinculado.data_caixa,
          valorCredito: g.creditoVinculado.saldo_docto_controlado ?? g.creditoVinculado.valor,
          qtd: g.linhas.length,
          statusBaixa,
        }
      })
      .sort((a, b) => String(a.dataCredito ?? '').localeCompare(String(b.dataCredito ?? '')))
  }, [gruposSaldo, tituloPorRepasse, titulosCodigosBaixados])

  // "Valor não identificado" — linhas com título vinculado mas que ainda não bateram com nenhum
  // crédito da tesouraria (mesmo ícone vermelho Link2Off da coluna Saldo).
  const naoIdentificadoInfo = useMemo(() => {
    const arr = linhasVinculadas.filter(l => !l.conciliadoSaldo)
    return { qtd: arr.length, valor: arr.reduce((s, l) => s + (l.valor_recebido || 0), 0) }
  }, [linhasVinculadas])

  const qtdDivergentes = useMemo(() => linhasVinculadas.filter(l => l.statusConciliacao === 'divergente').length, [linhasVinculadas])

  const filtradas = useMemo(() => {
    let f = linhasVinculadas
    if (filtroGrupoRepasse) f = f.filter(l => `${l.estabelecimento}|${l.data_pagamento}` === filtroGrupoRepasse)
    if (filtroNaoIdentificado) f = f.filter(l => !l.conciliadoSaldo)
    if (filtroDivergente) f = f.filter(l => l.statusConciliacao === 'divergente')
    return f
  }, [linhasVinculadas, filtroGrupoRepasse, filtroNaoIdentificado, filtroDivergente])

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

  // Total mostrado ao lado de "Expandir" — soma só as linhas REALMENTE visíveis na tabela
  // (ordenadas/filtradas, só título-vinculados). Diferente de `totais` (mais abaixo), que soma
  // TODAS as linhas do grupo/período pros cards Valor Bruto/Taxa/Líquido Recebido, inclusive as
  // sem título — por isso os dois podem legitimamente divergir quando o grupo tem linha sem título.
  const totaisTabela = useMemo(() => ordenadas.reduce((acc, l) => {
    acc.bruto += l.valor_parcela_total || 0
    acc.taxa += l.valor_taxa || 0
    acc.liquido += l.valor_recebido || 0
    return acc
  }, { bruto: 0, taxa: 0, liquido: 0 }), [ordenadas])

  // Linhas do depósito filtrado (chip "Saldo Concessionária" ativo) que NÃO entraram na tabela por
  // não terem título vinculado — usadas pro alerta "faltam X linha(s) deste depósito" quando o
  // Total exibido (só vinculados) não bate com o valor total do repasse (que inclui todas as
  // linhas do depósito, com ou sem título).
  const linhasForaDoGrupo = useMemo(() => {
    if (!filtroGrupoRepasse) return []
    return linhasComConciliacao.filter(l =>
      `${l.estabelecimento}|${l.data_pagamento}` === filtroGrupoRepasse && l.statusConciliacao === 'nao_encontrado'
    )
  }, [linhasComConciliacao, filtroGrupoRepasse])

  // Só repasses com título encontrado têm o que expandir (o badge de "Sem título" não é clicável).
  const idsExpansiveis = useMemo(() => ordenadas.filter(l => l.tituloEncontrado).map(l => l.id), [ordenadas])
  const todosExpandidos = idsExpansiveis.length > 0 && idsExpansiveis.every(id => expandidas.has(id))
  const alternarTodasExpandidas = () => {
    setExpandidas(todosExpandidos ? new Set() : new Set(idsExpansiveis))
  }

  // Seleção + Exportar Baixa — mesma funcionalidade da tela Títulos, só que aqui a seleção é por
  // repasse; toda linha visível já tem título vinculado (linhasVinculadas filtra os sem título),
  // então dá pra gerar a baixa direto do título casado com cada repasse marcado.
  const alternarSelecao = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const idsVisiveis = useMemo(() => ordenadas.map(l => l.id), [ordenadas])
  const todosSelecionados = idsVisiveis.length > 0 && idsVisiveis.every(id => selecionados.has(id))
  const alternarTodasSelecoes = () => {
    setSelecionados(todosSelecionados ? new Set() : new Set(idsVisiveis))
  }
  // Baixa usa o Valor Recebido do REPASSE (o que efetivamente caiu na conta, já líquido de taxa),
  // não o titulo_saldo (saldo em aberto do título) — pedido do usuário: o arquivo de baixa deve
  // dar baixa pelo valor que realmente entrou, não pelo valor que o título tinha em aberto.
  const titulosSelecionados = useMemo(() => {
    const porCodigo = new Map()
    for (const l of ordenadas) {
      if (!selecionados.has(l.id) || !l.tituloEncontrado) continue
      porCodigo.set(l.tituloEncontrado.titulo_codigo, { ...l.tituloEncontrado, titulo_saldo: l.valor_recebido })
    }
    return [...porCodigo.values()]
  }, [ordenadas, selecionados])
  const valorSelecionado = titulosSelecionados.reduce((s, t) => s + (t.titulo_saldo || 0), 0)

  // Registro que vai pra truckpag_baixas_titulos ao exportar — guarda estabelecimento/data do
  // REPASSE (não do título), é o que o botão "Baixados" usa pra agrupar e "trazer de volta".
  const baixaRecordsSelecionados = useMemo(() => {
    const porCodigo = new Map()
    for (const l of ordenadas) {
      if (!selecionados.has(l.id) || !l.tituloEncontrado) continue
      porCodigo.set(l.tituloEncontrado.titulo_codigo, {
        titulo_codigo: l.tituloEncontrado.titulo_codigo,
        titulo_numero: l.tituloEncontrado.titulo_numero,
        estabelecimento: l.estabelecimento,
        data_pagamento: l.data_pagamento,
        valor: l.valor_recebido,
      })
    }
    return [...porCodigo.values()]
  }, [ordenadas, selecionados])

  // Nome do arquivo segue o padrão já usado em Títulos: "DDMMAAAA SIGLA Total Recebido R$
  // X.XXX,XX.txt" quando o filtro "Repasse por dia" está ativo (usa o total do depósito); senão
  // um nome genérico com a data escolhida.
  const grupoRepasseAtivo = gruposPorDia.find(g => g.chave === filtroGrupoRepasse) || null

  // Gera o arquivo, marca os títulos exportados em truckpag_baixas_titulos (pra sumirem da tela)
  // e recarrega os dados — as linhas exportadas somem sozinhas e a seleção esvazia.
  const exportarBaixa = async () => {
    const conteudo = gerarArquivoBaixaTitulos(titulosSelecionados, dataExport)
    const nomeArquivo = grupoRepasseAtivo
      ? `${grupoRepasseAtivo.data_pagamento.split('-').reverse().join('')} ${siglaEmpresaPorNome(grupoRepasseAtivo.empresa) || grupoRepasseAtivo.codigoEmpresa} Total Recebido ${fmtMoeda(grupoRepasseAtivo.total)}.txt`
      : `baixa_repasses_${dataExport.split('-').reverse().join('')}.txt`
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    try {
      await apiService.registrarTruckPagBaixas(baixaRecordsSelecionados)
      setSelecionados(new Set())
      const novasBaixas = await apiService.getTruckPagBaixasTitulos()
      setBaixas(novasBaixas)
    } catch (e) {
      setErro('Baixa exportada, mas falhou ao marcar como baixada: ' + (e.message || String(e)))
    }
  }

  // PDF — mesmo pipeline (html2canvas + jsPDF) da tela Títulos: monta blocos HTML fora da tela,
  // tira print de cada bloco e cola num A4 paisagem, quebrando página quando não cabe mais. Cada
  // repasse selecionado vira um bloco com os campos da linha + (se achou) a mini-tabela "Título
  // encontrado" logo abaixo, igual aparece quando expande na tela.
  const gerarPdfRepasses = async (repassesParaPdf, sufixoArquivo) => {
    if (repassesParaPdf.length === 0) return
    setProcessandoPdf(true)
    setErro(null)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const MARGIN = 24
      const WRAP_W = 1500
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN

      const montarHtmlCabecalho = () => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px 20px 0 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Contas a Receber TruckPag — Repasses</div>
            </div>
            <div style="text-align:right;font-size:13px;color:#475569;">
              <div>${repassesParaPdf.length} repasse(s)</div>
              <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>`

      const CORES_STATUS = {
        exato: { bg: '#ecfdf5', border: '#a7f3d0', texto: '#047857' },
        divergente: { bg: '#fffbeb', border: '#fde68a', texto: '#b45309' },
        nao_encontrado: { bg: '#fef2f2', border: '#fecaca', texto: '#b91c1c' },
      }

      const montarHtmlRepasse = (l) => {
        const cor = CORES_STATUS[l.statusConciliacao] || CORES_STATUS.nao_encontrado
        const label = CONCILIACAO_INFO[l.statusConciliacao]?.label || l.statusConciliacao
        const saldoLabel = l.conciliadoSaldo ? 'Conciliado com o saldo' : 'Sem saldo conciliado'
        const { empresa, codigoEmpresa } = splitEstabelecimento(l.estabelecimento)
        const tituloHtml = l.tituloEncontrado ? `
          <div style="margin:4px 0 10px 16px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:2px;">Título encontrado</div>
            <table style="width:calc(100% - 16px);border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;">
              <thead>
                <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">
                  ${COLUNAS_TITULO_DETALHE.map(c => `<th style="padding:5px 6px;text-align:${c.numerico ? 'right' : 'left'};border-bottom:1px solid #e2e8f0;">${c.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${COLUNAS_TITULO_DETALHE.map(c => {
                    const v = c.derivar ? c.derivar(l.tituloEncontrado) : l.tituloEncontrado[c.key]
                    return `<td style="padding:5px 6px;text-align:${c.numerico ? 'right' : 'left'};color:#334155;">${c.formatar ? c.formatar(v) : (v ?? '—')}</td>`
                  }).join('')}
                </tr>
              </tbody>
            </table>
          </div>` : ''
        return `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;margin-bottom:6px;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;border:1px solid ${cor.border};">
              <thead>
                <tr style="background:${cor.bg};color:${cor.texto};">
                  <th colspan="9" style="padding:6px 8px;text-align:left;font-size:11px;font-weight:800;">
                    ${label} · ${saldoLabel} — ${codigoEmpresa || '—'} ${empresa} · Lote ${l.numero_lote}
                  </th>
                </tr>
                <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">
                  <th style="padding:5px 6px;text-align:left;">Data Pagto</th>
                  <th style="padding:5px 6px;text-align:left;">Nº NF-e</th>
                  <th style="padding:5px 6px;text-align:left;">Nº NFS-e</th>
                  <th style="padding:5px 6px;text-align:left;">Parcela</th>
                  <th style="padding:5px 6px;text-align:left;">CNPJ Cliente</th>
                  <th style="padding:5px 6px;text-align:left;">Cliente</th>
                  <th style="padding:5px 6px;text-align:right;">Valor Bruto</th>
                  <th style="padding:5px 6px;text-align:right;">Taxa</th>
                  <th style="padding:5px 6px;text-align:right;">Valor Recebido</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:5px 6px;color:#334155;">${fmtData(l.data_pagamento)}</td>
                  <td style="padding:5px 6px;color:#334155;">${l.nf_e || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${l.nfs_e || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${l.parcelas || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${l.cnpj_cliente || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${l.nome_cliente || '—'}</td>
                  <td style="padding:5px 6px;text-align:right;color:#334155;">${fmtMoeda(l.valor_parcela_total)}</td>
                  <td style="padding:5px 6px;text-align:right;color:#b91c1c;">${fmtMoeda(l.valor_taxa)}</td>
                  <td style="padding:5px 6px;text-align:right;font-weight:700;color:#0f172a;">${fmtMoeda(l.valor_recebido)}</td>
                </tr>
              </tbody>
            </table>
            ${tituloHtml}
          </div>`
      }

      const renderBloco = async (html) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:#fff;z-index:-1;`
        wrap.innerHTML = html
        document.body.appendChild(wrap)
        try {
          return await html2canvas(wrap, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: WRAP_W })
        } finally {
          document.body.removeChild(wrap)
        }
      }

      const GAP = 4
      const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
      let primeiraPagina = true
      const iniciarPagina = () => {
        if (!primeiraPagina) pdf.addPage()
        primeiraPagina = false
        return MARGIN
      }
      const colocarCanvas = (canvas, y) => {
        const h = (canvas.height / canvas.width) * CW
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
        return h
      }

      let y = iniciarPagina()
      y += colocarCanvas(await renderBloco(montarHtmlCabecalho()), y) + GAP

      for (const l of repassesParaPdf) {
        const canvas = await renderBloco(montarHtmlRepasse(l))
        const h = (canvas.height / canvas.width) * CW
        if (y + h > pageBottom) y = iniciarPagina()
        y += colocarCanvas(canvas, y) + GAP
      }

      const nomeArquivo = `repasses_truckpag_${sufixoArquivo}_${hojeIso()}.pdf`
      pdf.save(nomeArquivo)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setProcessandoPdf(false)
    }
  }

  const [gerandoRelatorio, setGerandoRelatorio] = useState(false)

  const exportarRelatorioDivergencias = async () => {
    const divergentes = linhasComConciliacao.filter(l => l.statusConciliacao === 'divergente')
    if (!divergentes.length) return
    setGerandoRelatorio(true)
    try {
      // Monta motivo detalhado comparando repasse × título campo a campo
      const buildMotivo = (l) => {
        const t = l.tituloEncontrado
        if (!t || !t.camposDivergentes) return ''
        const parts = []
        if (t.camposDivergentes.valor === false)
          parts.push(`Valor: repasse ${fmtMoeda(l.valor_parcela_total)} × título ${fmtMoeda(t.titulo_valor)}`)
        if (t.camposDivergentes.saldo === false)
          parts.push(`Saldo: recebido ${fmtMoeda(l.valor_recebido)} × título saldo ${fmtMoeda(t.titulo_saldo)}`)
        if (t.camposDivergentes.documento === false)
          parts.push(`CPF/CNPJ: repasse ${l.cnpj_cliente || '—'} × título ${t.titulo_pessoa_doc_ident || '—'}`)
        if (t.camposDivergentes.parcela === false)
          parts.push(`Parcela: repasse ${l.parcelas || '—'} × título ${parcelaDoTitulo(t.titulo_numero) || '—'}`)
        return parts.join(' | ')
      }

      const buildCamposDivStr = (t) => {
        if (!t?.camposDivergentes) return ''
        return Object.entries(t.camposDivergentes)
          .filter(([, v]) => v === false)
          .map(([k]) => LABEL_CAMPO_CONCILIACAO[k] || k)
          .join(', ')
      }

      // Grava no Supabase para análise histórica
      const registros = divergentes.map(l => {
        const { empresa, codigoEmpresa } = splitEstabelecimento(l.estabelecimento)
        const t = l.tituloEncontrado
        return {
          empresa,
          codigo_empresa: codigoEmpresa,
          data_pagamento: l.data_pagamento || null,
          nf_e: l.nf_e || null,
          nfs_e: l.nfs_e || null,
          parcelas: l.parcelas || null,
          cnpj_cliente: l.cnpj_cliente || null,
          nome_cliente: l.nome_cliente || null,
          valor_parcela_total: l.valor_parcela_total ?? null,
          valor_taxa: l.valor_taxa ?? null,
          valor_recebido: l.valor_recebido ?? null,
          campos_divergentes: buildCamposDivStr(t),
          motivo: buildMotivo(l),
          titulo_codigo: t?.titulo_codigo || null,
          titulo_empresa: t?.titulo_empresa_nome || null,
          titulo_valor: t?.titulo_valor ?? null,
          titulo_saldo: t?.titulo_saldo ?? null,
          titulo_doc: t?.titulo_pessoa_doc_ident || null,
        }
      })
      await apiService.gravarTruckPagDivergencias(registros)

      // Gera Excel
      const { default: ExcelJS } = await import('exceljs')
      const wb = new ExcelJS.Workbook()
      wb.creator = 'Portal de Gestão'
      const ws = wb.addWorksheet('Divergências')

      const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }
      const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
      const BORDER = { style: 'thin', color: { argb: 'FFE2E8F0' } }
      const BORDERS = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER }

      ws.columns = [
        { header: 'Data Registro', width: 18 },
        { header: 'Empresa', width: 35 },
        { header: 'Cód. Empresa', width: 14 },
        { header: 'Data Pagto', width: 12 },
        { header: 'Nº NF-e', width: 10 },
        { header: 'Nº NFS-e', width: 10 },
        { header: 'Parcelas', width: 10 },
        { header: 'CNPJ do Cliente', width: 22 },
        { header: 'Nome do Cliente', width: 30 },
        { header: 'Valor Total Parcela', width: 20 },
        { header: 'Valor Taxa', width: 14 },
        { header: 'Valor Recebido', width: 16 },
        { header: 'Motivo Divergência', width: 25 },
        { header: 'Motivo Detalhado', width: 60 },
        { header: 'Título (Lançamento)', width: 18 },
        { header: 'Empresa Título', width: 30 },
        { header: 'Valor Título', width: 14 },
        { header: 'Saldo Título', width: 14 },
        { header: 'CPF/CNPJ Título', width: 22 },
      ]

      const hr = ws.getRow(1)
      hr.height = 20
      hr.eachCell(cell => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = BORDERS
      })

      const agora = new Date().toLocaleString('pt-BR')
      divergentes.forEach((l, idx) => {
        const { empresa, codigoEmpresa } = splitEstabelecimento(l.estabelecimento)
        const t = l.tituloEncontrado
        const row = ws.addRow([
          agora,
          empresa,
          codigoEmpresa,
          l.data_pagamento ? fmtData(l.data_pagamento) : '',
          l.nf_e || '',
          l.nfs_e || '',
          l.parcelas || '',
          l.cnpj_cliente || '',
          l.nome_cliente || '',
          l.valor_parcela_total ?? '',
          l.valor_taxa ?? '',
          l.valor_recebido ?? '',
          buildCamposDivStr(t),
          buildMotivo(l),
          t?.titulo_codigo || '',
          t?.titulo_empresa_nome || '',
          t?.titulo_valor ?? '',
          t?.titulo_saldo ?? '',
          t?.titulo_pessoa_doc_ident || '',
        ])
        row.height = 16
        const bg = idx % 2 === 0 ? 'FFFFF8E1' : 'FFFFFFFF'
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }
          cell.font = { size: 10 }
          cell.alignment = { vertical: 'middle', wrapText: false }
          cell.border = BORDERS
        })
        ;[10, 11, 12, 17, 18].forEach(col => {
          row.getCell(col).numFmt = '"R$"#,##0.00'
        })
      })

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `divergencias_truckpag_${hojeIso()}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      setErro('Erro ao gerar relatório: ' + (err.message || String(err)))
    } finally {
      setGerandoRelatorio(false)
    }
  }

  const filtroAtivo = !!filtroGrupoRepasse

  const colunas = [
    { key: 'codigoEmpresa', label: 'Código Empresa', derivar: (l) => splitEstabelecimento(l.estabelecimento).codigoEmpresa, naoOrdenavel: true, campoInfo: 'codigo' },
    { key: 'empresa', label: 'Empresa', derivar: (l) => splitEstabelecimento(l.estabelecimento).empresa, naoOrdenavel: true },
    { key: 'data_pagamento', label: 'Data Pagto', formatar: fmtData },
    { key: 'nf_e', label: 'Nº NF-e', campoInfo: 'notaFiscal' },
    { key: 'nfs_e', label: 'Nº NFS-e', campoInfo: 'nfse' },
    { key: 'parcelas', label: 'Parcelas', campoInfo: 'parcela' },
    { key: 'cnpj_cliente', label: 'CNPJ do Cliente', campoGraduacao: 'documento' },
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
              <span className="relative group cursor-help">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="absolute top-full left-0 mt-2 w-96 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 normal-case font-normal tracking-normal space-y-1">
                  <div>Fonte de dados: Relatório de repasses recebidos da TruckPag</div>
                  <div>Nome do Arquivo: contas-receber-daf.xlsx</div>
                  <div>Pasta SharePoint: /Banco de Dados - DAF - Pós-Vendas/Financeiro - DAF</div>
                </span>
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Extrato linha a linha dos repasses recebidos com título vinculado — sincronizado do SharePoint.</p>
          </div>
          <div className="flex items-center gap-3">
            {ultimaAtualizacao && (
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                Atualizado em: <strong className="text-slate-500">{new Date(ultimaAtualizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
              </span>
            )}
            {qtdDivergentes > 0 && (
              <button onClick={exportarRelatorioDivergencias} disabled={gerandoRelatorio} title={`Exportar relatório de divergências (${qtdDivergentes})`} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50">
                {gerandoRelatorio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                Relatório de Divergências
              </button>
            )}
            <button onClick={() => setMostrarBaixados(true)} title="Depósitos já baixados" className="relative flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors">
              <Archive className="h-3.5 w-3.5" />
              {baixas.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-slate-700 text-white text-[9px] font-bold leading-none rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                  {baixas.length}
                </span>
              )}
            </button>
            <button onClick={() => setConfigAberto(true)} title="Configurações" className="flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors">
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button onClick={sincronizar} disabled={sincronizando} title={sincronizando ? 'Atualizando...' : 'Atualizar todas as abas do SharePoint'} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-sm transition-colors disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
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
      {mostrarBaixados && (
        <TruckPagBaixadosModal
          baixas={baixas}
          onClose={() => setMostrarBaixados(false)}
          onAlterado={async () => setBaixas(await apiService.getTruckPagBaixasTitulos())}
        />
      )}
      {mostrarLinhasForaGrupo && linhasForaDoGrupo.length > 0 && (
        <TruckPagRepasseDetalheModal
          empresa={splitEstabelecimento(linhasForaDoGrupo[0].estabelecimento).empresa}
          codigoEmpresa={splitEstabelecimento(linhasForaDoGrupo[0].estabelecimento).codigoEmpresa}
          data={linhasForaDoGrupo[0].data_pagamento}
          linhas={linhasForaDoGrupo}
          onClose={() => setMostrarLinhasForaGrupo(false)}
        />
      )}

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {(gruposPorDia.length > 0 || naoIdentificadoInfo.qtd > 0) && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Saldo Concessionária (Data · Valor) — selecione o lote de pagamento
            </label>
            {(filtroAtivo || filtroNaoIdentificado || filtroDivergente) && (
              <button type="button" onClick={() => { setFiltroGrupoRepasse(null); setFiltroNaoIdentificado(false); setFiltroDivergente(false) }} className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600">
                <X className="h-3 w-3" /> Limpar filtro
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar-light pr-1">
            {naoIdentificadoInfo.qtd > 0 && (
              <button
                type="button"
                onClick={() => setFiltroNaoIdentificado(v => !v)}
                title={`${naoIdentificadoInfo.qtd} linha(s) sem crédito vinculado`}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                  filtroNaoIdentificado
                    ? 'bg-red-600 border-red-600 text-white'
                    : 'bg-red-50 border-red-200 text-red-600 hover:border-red-300'
                }`}
              >
                <Link2Off className="h-3 w-3" />
                Valor não identificado · {fmtMoeda(naoIdentificadoInfo.valor)}
              </button>
            )}
            {gruposPorDia.map(g => (
              <button
                key={g.chave}
                type="button"
                onClick={() => setFiltroGrupoRepasse(p => p === g.chave ? null : g.chave)}
                title={`${g.qtd} linha(s) de repasse`}
                className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                  filtroGrupoRepasse === g.chave
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                }`}
              >
                {g.statusBaixa === 'total' && <Lock className="h-3 w-3 shrink-0" title="Lote totalmente baixado" />}
                {g.statusBaixa === 'parcial' && <Unlock className="h-3 w-3 shrink-0" title="Lote parcialmente baixado" />}
                {fmtData(g.dataCredito)} · {fmtMoeda(g.valorCredito)}
              </button>
            ))}
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {idsExpansiveis.length > 0 && (
              <button type="button" onClick={alternarTodasExpandidas} className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1">
                {todosExpandidos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {todosExpandidos ? 'Recolher' : 'Expandir'}
              </button>
            )}
            {qtdDivergentes > 0 && (
              <button type="button" onClick={() => setFiltroDivergente(v => !v)} title="Filtrar Divergências" className={`flex items-center justify-center p-1.5 rounded-md border transition-colors ${filtroDivergente ? 'bg-amber-500 border-amber-500 text-white' : 'bg-amber-50 border-amber-200 text-amber-600 hover:border-amber-300'}`}>
                <AlertTriangle className="h-3.5 w-3.5" />
              </button>
            )}
            <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded px-2 py-1">
              <span>Total ({ordenadas.length})</span>
              <span className="text-slate-800">{fmtMoeda(totaisTabela.bruto)}</span>
              <span className="text-red-600">{fmtMoeda(totaisTabela.taxa)}</span>
              <span className="text-emerald-700">{fmtMoeda(totaisTabela.liquido)}</span>
            </span>
          </div>
          {selecionados.size > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-600">{selecionados.size} selecionado(s) · {fmtMoeda(valorSelecionado)}</span>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data Pagto</label>
              <input type="date" value={dataExport} onChange={e => setDataExport(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              <button
                type="button"
                onClick={() => gerarPdfRepasses(ordenadas.filter(l => selecionados.has(l.id)), 'selecionados')}
                disabled={processandoPdf}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {processandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
              </button>
              <button type="button" onClick={exportarBaixa} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors">
                <FileDown className="h-3.5 w-3.5" /> Exportar Baixa
              </button>
            </div>
          )}
        </div>
        {linhasForaDoGrupo.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-semibold flex-1">
              Este depósito tem {linhasForaDoGrupo.length} linha(s) sem título vinculado (
              {fmtMoeda(linhasForaDoGrupo.reduce((s, l) => s + (l.valor_recebido || 0), 0))}) que não entram no Total acima.
            </p>
            <button
              type="button"
              onClick={() => setMostrarLinhasForaGrupo(true)}
              className="shrink-0 flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
            >
              Ver linha(s)
            </button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 whitespace-nowrap">
                  <input type="checkbox" checked={todosSelecionados} onChange={alternarTodasSelecoes} className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer" />
                </th>
                <th className="p-3 whitespace-nowrap" title="Situação da conciliação com título">ST</th>
                <th className="p-3 whitespace-nowrap" title="Já bateu com algum crédito no saldo bancário (Saldo Concessionária)?">Saldo</th>
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
                        <input type="checkbox" checked={selecionados.has(l.id)} onChange={() => alternarSelecao(l.id)} className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer" />
                      </td>
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
                      <td className="p-3 whitespace-nowrap">
                        {l.conciliadoSaldo ? (
                          <span title="Conciliado com o saldo bancário" className="inline-flex items-center justify-center p-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                            <Link2 className="h-3 w-3" />
                          </span>
                        ) : (
                          <span title="Ainda não bateu com nenhum crédito do saldo bancário" className="inline-flex items-center justify-center p-1 rounded-full border bg-red-50 text-red-500 border-red-200">
                            <Link2Off className="h-3 w-3" />
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
                        <td className="p-0 bg-slate-50/70 border-b border-slate-100"></td>
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
          </table>
        </div>
        </>
      )}
    </div>
  )
}
