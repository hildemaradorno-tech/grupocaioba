import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Truck, Download, RefreshCw, AlertTriangle, Filter, ChevronDown, ChevronUp, X, CheckCircle2, XCircle, HelpCircle, Settings, FileDown, FileText, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import TruckPagNav from './TruckPagNav'
import TruckPagRegrasModal from './TruckPagRegrasModal'
import TruckPagConfigModal from './TruckPagConfigModal'
import {
  fmtMoeda, fmtData, sincronizarTudoTruckPag, conciliarTitulosRepasses, splitEstabelecimento,
  codigoEmpresaPorNome, parcelaDoTitulo, notasFiscaisDoTitulo, gerarArquivoBaixaTitulos, siglaEmpresaPorNome,
} from './truckpagUtils'

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

export default function TruckPagTitulos() {
  const [linhas, setLinhas] = useState([])
  const [repasses, setRepasses] = useState([])
  const [tolerancia, setTolerancia] = useState(0.02)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)
  const [filtroSituacao, setFiltroSituacao] = useState(null)
  const [filtroConciliacao, setFiltroConciliacao] = useState(null) // null | 'exato' | 'divergente' | 'nao_encontrado'
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroGrupoRepasse, setFiltroGrupoRepasse] = useState(null)
  const [sortCol, setSortCol] = useState('titulo_data_venc')
  const [sortDir, setSortDir] = useState('asc')
  const [expandidas, setExpandidas] = useState(() => new Set())
  const [regrasAberto, setRegrasAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [dataExport, setDataExport] = useState(hojeIso)
  const [processandoPdf, setProcessandoPdf] = useState(null)

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

  const alertas = useMemo(() => {
    const c = { vencidaMuito: { qtd: 0, valor: 0 }, vencida: { qtd: 0, valor: 0 }, hoje: { qtd: 0, valor: 0 } }
    for (const l of titulosConciliados) {
      const st = situacaoVencimento(l.titulo_dias_atraso)
      if (st && c[st]) { c[st].qtd += 1; c[st].valor += l.titulo_saldo || 0 }
    }
    return c
  }, [titulosConciliados])

  // Identificados mostra o valor que realmente caiu na nossa conta (repasse líquido); divergentes
  // e não encontrados mostram o valor do próprio título, já que não há repasse confirmado pra eles.
  const resumoConciliacao = useMemo(() => {
    const c = {
      exato: { qtd: 0, valor: 0 },
      divergente: { qtd: 0, valor: 0 },
      nao_encontrado: { qtd: 0, valor: 0 },
    }
    for (const l of titulosConciliados) {
      const st = c[l.statusConciliacao]
      st.qtd += 1
      st.valor += l.statusConciliacao === 'exato'
        ? (l.repasseMatch?.valor_recebido || 0)
        : (l.titulo_valor || 0)
    }
    return c
  }, [titulosConciliados])

  // Agrupa por Estabelecimento + Data de Pagamento — mesmo agrupamento do depósito bancário usado
  // na tela de Conciliação (Saldo), pra bater um chip só por dia (não um por lote/NF). O total é a
  // soma de TODOS os repasses daquele dia (igual o extrato do saldo), mesmo que só parte deles
  // tenha título vinculado; só entram na lista os dias que têm pelo menos 1 título vinculado.
  const gruposPorRepasseDia = useMemo(() => {
    const totais = new Map()
    for (const r of repasses) {
      const chave = `${r.estabelecimento}|${r.data_pagamento}`
      if (!totais.has(chave)) {
        const { empresa, codigoEmpresa } = splitEstabelecimento(r.estabelecimento)
        totais.set(chave, { chave, empresa, codigoEmpresa, data_pagamento: r.data_pagamento, total: 0, qtd: 0 })
      }
      totais.get(chave).total += r.valor_recebido || 0
    }
    for (const l of titulosConciliados) {
      if (!l.repasseMatch) continue
      const chave = `${l.repasseMatch.estabelecimento}|${l.repasseMatch.data_pagamento}`
      const g = totais.get(chave)
      if (g) g.qtd += 1
    }
    return [...totais.values()]
      .filter(g => g.qtd > 0)
      .sort((a, b) => {
        const cmpEmpresa = a.empresa.localeCompare(b.empresa, 'pt-BR')
        if (cmpEmpresa !== 0) return cmpEmpresa
        return String(a.data_pagamento).localeCompare(String(b.data_pagamento))
      })
  }, [repasses, titulosConciliados])

  const filtradas = useMemo(() => {
    let f = titulosConciliados
    if (filtroSituacao) f = f.filter(l => situacaoVencimento(l.titulo_dias_atraso) === filtroSituacao)
    if (filtroConciliacao) f = f.filter(l => l.statusConciliacao === filtroConciliacao)
    if (filtroGrupoRepasse) f = f.filter(l => l.repasseMatch && `${l.repasseMatch.estabelecimento}|${l.repasseMatch.data_pagamento}` === filtroGrupoRepasse)
    if (filtroEmpresa.trim()) {
      const alvo = filtroEmpresa.trim().toLowerCase()
      f = f.filter(l => l.titulo_empresa_nome?.toLowerCase().includes(alvo))
    }
    if (filtroVendedor.trim()) {
      const alvo = filtroVendedor.trim().toLowerCase()
      f = f.filter(l => l.titulo_vendedor_nome?.toLowerCase().includes(alvo))
    }
    if (filtroTexto.trim()) {
      const alvo = filtroTexto.trim().toLowerCase()
      f = f.filter(l => l.titulo_numero?.toLowerCase().includes(alvo) || l.titulo_os_numero?.toLowerCase().includes(alvo) || l.titulo_pessoa_nome?.toLowerCase().includes(alvo))
    }
    return f
  }, [titulosConciliados, filtroSituacao, filtroConciliacao, filtroGrupoRepasse, filtroEmpresa, filtroVendedor, filtroTexto])

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
  const titulosSelecionados = useMemo(() => ordenadas.filter(l => selecionados.has(l.id)), [ordenadas, selecionados])
  const valorSelecionado = titulosSelecionados.reduce((s, l) => s + (l.titulo_saldo || 0), 0)

  // Nome do arquivo segue o padrão que o sistema de destino já aceita: "DDMMAAAA SIGLA Total
  // Recebido R$ X.XXX,XX.txt". Data, sigla da empresa e total vêm do grupo "Repasse por dia"
  // ativo no filtro (o mesmo depósito que o usuário clicou pra isolar os títulos) — não da soma
  // dos títulos selecionados, que pode divergir um pouco do total do depósito.
  const grupoRepasseAtivo = gruposPorRepasseDia.find(g => g.chave === filtroGrupoRepasse) || null

  const exportarBaixa = () => {
    const conteudo = gerarArquivoBaixaTitulos(titulosSelecionados, dataExport)
    const nomeArquivo = grupoRepasseAtivo
      ? `${grupoRepasseAtivo.data_pagamento.split('-').reverse().join('')} ${siglaEmpresaPorNome(grupoRepasseAtivo.empresa) || grupoRepasseAtivo.codigoEmpresa} Total Recebido ${fmtMoeda(grupoRepasseAtivo.total).replace(/ /g, ' ')}.txt`
      : `baixa_titulos_${dataExport.split('-').reverse().join('')}.txt`
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nomeArquivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // PDF — mesmo pipeline (html2canvas + jsPDF) já usado em Cálculo/Histórico de Comissões: monta
  // blocos HTML fora da tela, tira print de cada bloco e cola num A4 paisagem, quebrando página
  // quando não cabe mais. Cada título vira um bloco com os campos da linha da tela + (se achou
  // repasse) a mini-tabela "Repasse encontrado" logo abaixo, igual aparece quando expande na tela.
  const gerarPdfTitulos = async (titulosParaPdf, sufixoArquivo) => {
    if (titulosParaPdf.length === 0) return
    setProcessandoPdf(sufixoArquivo)
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
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Contas a Receber TruckPag — Títulos × Repasses</div>
            </div>
            <div style="text-align:right;font-size:13px;color:#475569;">
              <div>${titulosParaPdf.length} título(s)</div>
              <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>`

      const CORES_STATUS = {
        exato: { bg: '#ecfdf5', border: '#a7f3d0', texto: '#047857' },
        divergente: { bg: '#fffbeb', border: '#fde68a', texto: '#b45309' },
        nao_encontrado: { bg: '#fef2f2', border: '#fecaca', texto: '#b91c1c' },
      }

      const montarHtmlTitulo = (t) => {
        const cor = CORES_STATUS[t.statusConciliacao] || CORES_STATUS.nao_encontrado
        const label = CONCILIACAO_INFO[t.statusConciliacao]?.label || t.statusConciliacao
        const repasseHtml = t.repasseMatch ? `
          <div style="margin:4px 0 10px 16px;">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:2px;">Repasse encontrado</div>
            <table style="width:calc(100% - 16px);border-collapse:collapse;font-size:11px;border:1px solid #e2e8f0;">
              <thead>
                <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">
                  ${COLUNAS_REPASSE_DETALHE.map(c => `<th style="padding:5px 6px;text-align:${c.numerico ? 'right' : 'left'};border-bottom:1px solid #e2e8f0;">${c.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr>
                  ${COLUNAS_REPASSE_DETALHE.map(c => {
                    const v = c.derivar ? c.derivar(t.repasseMatch) : t.repasseMatch[c.key]
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
                  <th colspan="12" style="padding:6px 8px;text-align:left;font-size:11px;font-weight:800;">
                    ${label} — Título ${t.titulo_numero} · Lanç. ${t.titulo_codigo} · ${t.titulo_empresa_nome}
                  </th>
                </tr>
                <tr style="background:#f8fafc;color:#94a3b8;text-transform:uppercase;font-size:9px;">
                  <th style="padding:5px 6px;text-align:left;">Vencimento</th>
                  <th style="padding:5px 6px;text-align:left;">Notas Fiscais</th>
                  <th style="padding:5px 6px;text-align:left;">Parcela</th>
                  <th style="padding:5px 6px;text-align:left;">CPF/CNPJ</th>
                  <th style="padding:5px 6px;text-align:left;">Cliente</th>
                  <th style="padding:5px 6px;text-align:left;">Emissão</th>
                  <th style="padding:5px 6px;text-align:right;">Dias</th>
                  <th style="padding:5px 6px;text-align:left;">Tipo</th>
                  <th style="padding:5px 6px;text-align:right;">Valor</th>
                  <th style="padding:5px 6px;text-align:right;">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:5px 6px;color:#334155;">${fmtData(t.titulo_data_venc)}</td>
                  <td style="padding:5px 6px;color:#334155;">${notasFiscaisDoTitulo(t).join(' / ') || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${parcelaExibicao(t.titulo_numero)}</td>
                  <td style="padding:5px 6px;color:#334155;">${t.titulo_pessoa_doc_ident || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${t.titulo_pessoa_nome || '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${fmtData(t.titulo_data_emissao)}</td>
                  <td style="padding:5px 6px;text-align:right;color:#334155;">${t.titulo_dias_atraso ?? '—'}</td>
                  <td style="padding:5px 6px;color:#334155;">${t.tipo_titulo_descr || '—'}</td>
                  <td style="padding:5px 6px;text-align:right;font-weight:700;color:#0f172a;">${fmtMoeda(t.titulo_valor)}</td>
                  <td style="padding:5px 6px;text-align:right;font-weight:700;color:#0f172a;">${fmtMoeda(t.titulo_saldo)}</td>
                </tr>
              </tbody>
            </table>
            ${repasseHtml}
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

      for (const t of titulosParaPdf) {
        const canvas = await renderBloco(montarHtmlTitulo(t))
        const h = (canvas.height / canvas.width) * CW
        if (y + h > pageBottom) y = iniciarPagina()
        y += colocarCanvas(canvas, y) + GAP
      }

      const nomeArquivo = `titulos_truckpag_${sufixoArquivo}_${hojeIso()}.pdf`
      pdf.save(nomeArquivo)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setProcessandoPdf(null)
    }
  }

  const totalSaldo = filtradas.reduce((s, l) => s + (l.titulo_saldo || 0), 0)
  const totalValor = filtradas.reduce((s, l) => s + (l.titulo_valor || 0), 0)
  const filtroAvancadoAtivo = !!(filtroEmpresa.trim() || filtroVendedor.trim() || filtroGrupoRepasse)

  const colunas = [
    { key: 'codigo_empresa_daf', label: 'Código', naoOrdenavel: true, derivar: (row) => codigoEmpresa(row.titulo_empresa_nome), campoInfo: 'codigo' },
    { key: 'titulo_empresa_nome', label: 'Empresa' },
    { key: 'titulo_data_venc', label: 'Vencimento', numerico: false, formatar: fmtData },
    // Nota Fiscal / Nota de Serviço (peças) e Nota Fiscal/Nota de Serviço (serviço) vêm com
    // preenchimento inconsistente na planilha (número de um às vezes cai na coluna do outro) —
    // por isso mostra tudo junto numa coluna só, em vez de separar por campo de origem.
    { key: 'notas_fiscais', label: 'Notas Fiscais', naoOrdenavel: true, derivar: (row) => notasFiscaisDoTitulo(row).join(' / ') || '—', campoInfo: ['notaFiscal', 'nfse'] },
    { key: 'parcela_titulo', label: 'Parcela', naoOrdenavel: true, derivar: (row) => parcelaExibicao(row.titulo_numero), campoInfo: 'parcela' },
    { key: 'titulo_pessoa_doc_ident', label: 'CPF/CNPJ', campoInfo: 'documento' },
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

      {(alertas.vencidaMuito.qtd > 0 || alertas.vencida.qtd > 0 || alertas.hoje.qtd > 0) && (
        <div className="flex flex-col md:flex-row gap-2">
          {alertas.vencidaMuito.qtd > 0 && (
            <button type="button" onClick={() => setFiltroSituacao(p => p === 'vencidaMuito' ? null : 'vencidaMuito')}
              className={`flex-1 flex items-center gap-3 bg-slate-900 border rounded-lg px-4 py-3 text-left transition-all hover:bg-slate-800 ${filtroSituacao === 'vencidaMuito' ? 'border-white ring-2 ring-offset-1 ring-slate-400' : 'border-slate-700'}`}>
              <AlertTriangle className="h-4 w-4 text-white shrink-0" />
              <p className="text-xs text-white font-semibold flex-1">
                {alertas.vencidaMuito.qtd} título(s) vencido(s) há mais de 30 dias
                <span className="text-slate-300 font-normal"> — {fmtMoeda(alertas.vencidaMuito.valor)}</span>
              </p>
            </button>
          )}
          {alertas.vencida.qtd > 0 && (
            <button type="button" onClick={() => setFiltroSituacao(p => p === 'vencida' ? null : 'vencida')}
              className={`flex-1 flex items-center gap-3 bg-red-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-red-100 ${filtroSituacao === 'vencida' ? 'border-red-500 ring-2 ring-offset-1 ring-red-300' : 'border-red-300'}`}>
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-xs text-red-700 font-semibold flex-1">
                {alertas.vencida.qtd} título(s) vencido(s) (até 30 dias)
                <span className="text-red-500 font-normal"> — {fmtMoeda(alertas.vencida.valor)}</span>
              </p>
            </button>
          )}
          {alertas.hoje.qtd > 0 && (
            <button type="button" onClick={() => setFiltroSituacao(p => p === 'hoje' ? null : 'hoje')}
              className={`flex-1 flex items-center gap-3 bg-amber-50 border rounded-lg px-4 py-3 text-left transition-all hover:bg-amber-100 ${filtroSituacao === 'hoje' ? 'border-amber-500 ring-2 ring-offset-1 ring-amber-300' : 'border-amber-300'}`}>
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 font-semibold flex-1">
                {alertas.hoje.qtd} título(s) vencendo hoje
                <span className="text-amber-500 font-normal"> — {fmtMoeda(alertas.hoje.valor)}</span>
              </p>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button type="button" onClick={() => setFiltroConciliacao(p => p === 'exato' ? null : 'exato')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroConciliacao === 'exato' ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-emerald-100"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Identificados</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700 leading-none">{fmtMoeda(resumoConciliacao.exato.valor)}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{resumoConciliacao.exato.qtd} título(s) · saldo confirmado em nossa conta</p>
        </button>
        <button type="button" onClick={() => setFiltroConciliacao(p => p === 'divergente' ? null : 'divergente')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-amber-50 border-amber-200 ${filtroConciliacao === 'divergente' ? 'ring-2 ring-offset-1 ring-amber-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-amber-100"><AlertTriangle className="h-3.5 w-3.5 text-amber-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Divergentes</p>
          </div>
          <p className="text-2xl font-bold text-amber-700 leading-none">{fmtMoeda(resumoConciliacao.divergente.valor)}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">{resumoConciliacao.divergente.qtd} título(s) · achou repasse, algo diverge</p>
        </button>
        <button type="button" onClick={() => setFiltroConciliacao(p => p === 'nao_encontrado' ? null : 'nao_encontrado')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-red-50 border-red-200 ${filtroConciliacao === 'nao_encontrado' ? 'ring-2 ring-offset-1 ring-red-300 shadow-md' : ''}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-red-100"><XCircle className="h-3.5 w-3.5 text-red-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Não encontrados</p>
          </div>
          <p className="text-2xl font-bold text-red-700 leading-none">{fmtMoeda(resumoConciliacao.nao_encontrado.valor)}</p>
          <p className="text-[10px] text-red-500 mt-0.5">{resumoConciliacao.nao_encontrado.qtd} título(s) · sem repasse confirmado</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Buscar (título/OS/cliente)</label>
                <input type="text" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Empresa</label>
                <input type="text" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">Consultor/Vendedor</label>
                <input type="text" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)} placeholder="Filtrar..." className="w-full text-xs border border-slate-200 rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              </div>
            </div>

            {gruposPorRepasseDia.length > 0 && (
              <div className="mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 block">
                  Repasse por dia (Empresa · Data · Valor) — clique pra ver só os títulos daquele depósito
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto custom-scrollbar-light pr-1">
                  {gruposPorRepasseDia.map(g => (
                    <button
                      key={g.chave}
                      type="button"
                      onClick={() => setFiltroGrupoRepasse(p => p === g.chave ? null : g.chave)}
                      title={`${g.qtd} título(s) vinculado(s)`}
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

            {filtroAvancadoAtivo && (
              <button type="button" onClick={() => { setFiltroEmpresa(''); setFiltroVendedor(''); setFiltroGrupoRepasse(null) }} className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600">
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
            <button
              type="button"
              onClick={() => gerarPdfTitulos(ordenadas, 'todos')}
              disabled={processandoPdf !== null}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 disabled:opacity-50"
            >
              {processandoPdf === 'todos' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
              Baixar PDF ({ordenadas.length})
            </button>
          </div>
          {selecionados.size > 0 && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-2.5 py-1.5 shadow-sm">
              <span className="text-[11px] font-semibold text-slate-600">{selecionados.size} selecionado(s) · {fmtMoeda(valorSelecionado)}</span>
              <button
                type="button"
                onClick={() => gerarPdfTitulos(titulosSelecionados, 'selecionados')}
                disabled={processandoPdf !== null}
                className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {processandoPdf === 'selecionados' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
              </button>
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Data Pagto</label>
              <input type="date" value={dataExport} onChange={e => setDataExport(e.target.value)} className="text-xs border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300" />
              <button type="button" onClick={exportarBaixa} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors">
                <FileDown className="h-3.5 w-3.5" /> Exportar Baixa
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 whitespace-nowrap">
                  <input type="checkbox" checked={todosSelecionados} onChange={alternarTodasSelecoes} className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer" />
                </th>
                <th className="p-3 whitespace-nowrap" title="Situação da conciliação">ST</th>
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
                    <tr className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 whitespace-nowrap">
                        <input type="checkbox" checked={selecionados.has(row.id)} onChange={() => alternarSelecao(row.id)} className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer" />
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {row.repasseMatch ? (
                          <button type="button" onClick={() => alternarExpandida(row.id)} title={conciliacaoInfo.label}
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
                        <td className="p-0 bg-slate-50/70 border-b border-slate-100"></td>
                        <td className="p-0 bg-slate-50/70 border-b border-slate-100"></td>
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
                <td className="p-3" colSpan={colunas.length}>Total ({ordenadas.length} título(s)) · {selecionados.size > 0 ? `${selecionados.size} selecionado(s)` : ''}</td>
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
