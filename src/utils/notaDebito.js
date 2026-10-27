// Nota de Débito de Garantia: campos automáticos, montagem dos dados e renderização do modelo.
// Campo sem informação no sistema sai em branco.

export const CAMPOS_NOTA_DEBITO = [
  { grupo: 'Nota', campos: [
    ['nota.numero', 'Número da nota (sequencial do sistema)'],
    ['nota.numero_nf', 'Número da NFS-e (sem NFS-e: DANFE de peças)'],
    ['nota.data_emissao', 'Data de emissão'],
  ] },
  { grupo: 'Concessionária (Empresas)', campos: [
    ['empresa.razao_social', 'Razão social'],
    ['empresa.fantasia', 'Nome fantasia'],
    ['empresa.cnpj', 'CNPJ'],
    ['empresa.ie', 'Inscrição Estadual'],
    ['empresa.endereco_completo', 'Endereço completo (endereço, nº – bairro)'],
    ['empresa.endereco', 'Endereço'],
    ['empresa.numero', 'Nº'],
    ['empresa.bairro', 'Bairro'],
    ['empresa.cep', 'CEP'],
    ['empresa.cidade', 'Cidade'],
    ['empresa.uf', 'UF'],
    ['empresa.telefone', 'Telefone'],
    ['empresa.banco', 'Banco'],
    ['empresa.agencia', 'Agência'],
    ['empresa.conta', 'Conta'],
  ] },
  { grupo: 'Processo de Garantia', campos: [
    ['garantia.processo', 'Processo (nº da SG)'],
    ['garantia.numero_sg', 'Número da SG'],
    ['garantia.status', 'Status'],
    ['garantia.tipo', 'Tipo de garantia'],
    ['garantia.numero_os', 'Ordem de Serviço'],
    ['garantia.chassi', 'Chassi'],
    ['garantia.chassi_final', 'Chassi — 8 últimos caracteres'],
    ['garantia.placa', 'Placa'],
    ['garantia.cliente', 'Cliente'],
    ['garantia.valor_total', 'Valor total'],
  ] },
  { grupo: 'Nota Fiscal de Peças ao Cliente', campos: [
    ['nf.numero', 'Número da NF'],
    ['nf.valor', 'Valor da NF'],
    ['nf.data', 'Data de emissão da NF'],
  ] },
  { grupo: 'Itens', campos: [
    ['itens_tabela', 'Tabela de itens (com título e Valor Total)'],
    ['itens_total', 'Total dos itens'],
  ] },
  { grupo: 'Responsável (usuário logado)', campos: [
    ['usuario.assinatura', 'Nome – cargo – empresa (assinatura)'],
    ['usuario.nome', 'Nome do usuário'],
    ['usuario.cargo', 'Cargo do usuário'],
  ] },
  { grupo: 'Modelo', campos: [
    ['logo', 'Logo do modelo (imagem)'],
  ] },
]

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export const fmtMoeda = (v) => {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return ''
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const fmtDataBR = (v) => {
  if (!v) return ''
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR')
}

export const fmtCnpjNota = (v) => {
  const s = String(v || '').replace(/\D/g, '')
  return s.length === 14 ? `${s.slice(0, 2)}.${s.slice(2, 5)}.${s.slice(5, 8)}/${s.slice(8, 12)}-${s.slice(12)}` : (v || '')
}

export const fmtCep = (v) => {
  const s = String(v || '').replace(/\D/g, '')
  return s.length === 8 ? `${s.slice(0, 5)}-${s.slice(5)}` : (v || '')
}

export const totalItens = (itens) =>
  (itens || []).reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0), 0)

// Monta o mapa campo -> texto a partir de empresa (dim_empresas), garantia (form/gar_garantias),
// dados da nota e itens.
// Valor de peças das Notas Fiscais Emitidas (soma das DANFEs); sem NFs, valor de peças da garantia.
export function valorPecasNotas(g) {
  const nfs = Array.isArray(g?.notas_fiscais) ? g.notas_fiscais : []
  const danfes = nfs.filter(nf => Number(nf.prod_valor) > 0)
  if (danfes.length) return danfes.reduce((acc, nf) => acc + Number(nf.prod_valor), 0)
  return parseFloat(g?.valor_pecas) || 0
}

export function montarContextoNota({ empresa, garantia, nota, itens, statusLabel, logo, responsavel }) {
  const e = empresa || {}
  const g = garantia || {}
  const n = nota || {}
  const r = responsavel || {}
  const total = (Number(g.valor_pecas) || 0) + (Number(g.valor_servicos) || 0)
  // Dados da NF ao cliente = todas as Notas Fiscais Emitidas (DANFE e NFSe): números da coluna NFSe
  // e valor total (produto + serviço). Sem lista de NFs, cai nos campos gravados na garantia.
  // Notas Fiscais Emitidas: DANFE = linha com valor de produto (peças); NFS-e = linha com valor de serviço.
  const nfs = Array.isArray(g.notas_fiscais) ? g.notas_fiscais : []
  const danfes = nfs.filter(nf => Number(nf.prod_valor) > 0)
  const nfses = nfs.filter(nf => Number(nf.serv_valor) > 0 && !(Number(nf.prod_valor) > 0))
  const numeroNf = (numero) => String(numero || '').split('/').map(x => x.trim()).filter(Boolean).pop() || ''
  const juntarNumeros = (lista) => lista.map(nf => numeroNf(nf.numero)).filter(Boolean).join(', ')
  // "Nota Fiscal de Peças ao Cliente": só DANFE; sem DANFE, campos gravados na garantia.
  const nfNumero = danfes.length ? juntarNumeros(danfes) : (g.nf_peca_numero || '')
  const nfValor = danfes.length ? valorPecasNotas(g) : Number(g.nf_valor_produto) || 0
  const nfData = danfes.length ? danfes.find(nf => nf.data_faturamento)?.data_faturamento : g.nf_peca_data
  // Número da Nota de Débito: NFS-e; sem NFS-e, a DANFE de peças.
  const numeroNotaNf = nfses.length ? juntarNumeros(nfses) : juntarNumeros(danfes)
  return {
    'nota.numero': n.numero || '',
    'nota.numero_nf': numeroNotaNf,
    'nota.data_emissao': fmtDataBR(n.data_emissao),
    'empresa.razao_social': e.nome_empresa || '',
    'empresa.fantasia': e.empresa_fantasia || '',
    'empresa.cnpj': fmtCnpjNota(e.cnpj),
    'empresa.ie': e.inscricao_estadual || '',
    'empresa.endereco_completo': [
      [e.endereco, e.numero ? `nº ${e.numero}` : ''].filter(Boolean).join(', '),
      e.bairro || '',
    ].filter(Boolean).join(' – '),
    'empresa.endereco': e.endereco || '',
    'empresa.numero': e.numero || '',
    'empresa.bairro': e.bairro || '',
    'empresa.cep': fmtCep(e.cep),
    'empresa.cidade': e.cidade || '',
    'empresa.uf': e.uf || '',
    'empresa.telefone': e.telefone || '',
    'empresa.banco': e.banco || '',
    'empresa.agencia': e.agencia || '',
    'empresa.conta': e.conta || '',
    'garantia.processo': g.numero_sg || '',
    'garantia.numero_sg': g.numero_sg || '',
    'garantia.status': statusLabel || '',
    'garantia.tipo': g.tipo_garantia_descricao || '',
    'garantia.numero_os': g.numero_os || '',
    'garantia.chassi': g.chassi || '',
    'garantia.chassi_final': String(g.chassi || '').trim().slice(-8),
    'garantia.placa': n.placa ?? g.placa ?? '',
    'garantia.cliente': g.cliente || '',
    'garantia.valor_total': total ? fmtMoeda(total) : '',
    'nf.numero': nfNumero,
    'nf.valor': nfValor ? fmtMoeda(nfValor) : '',
    'nf.data': fmtDataBR(nfData),
    'usuario.nome': (r.nome || '').toUpperCase(),
    'usuario.cargo': (r.cargo || '').toUpperCase(),
    'usuario.assinatura': [r.nome, r.cargo, e.agrupamento_nome || e.empresa_fantasia]
      .filter(Boolean).join(' – ').toUpperCase(),
    '__itens': itens || [],
    '__logo': logo || '',
  }
}

const TD = 'border:1px solid #444;padding:4px 6px;font-size:12px;line-height:1.5;'

// Tabela de itens no formato do Word: título "Itens da Nota de Débito:", cabeçalho das colunas,
// corpo alto só com linhas verticais (itens no topo) e rodapé com "Valor Total".
const ITENS_ALTURA_CORPO = 205
const ITENS_ALTURA_LINHA = 22
const B = '1px solid #444'

function tabelaItens(itens) {
  const linhas = (itens || []).filter(i => i && (i.descricao || i.quantidade || i.valor_unitario))
  const cel = (alin, extra = '') => `border-left:${B};border-right:${B};padding:2px 6px;font-size:13px;line-height:1.4;height:${ITENS_ALTURA_LINHA - 4}px;text-align:${alin};vertical-align:top;${extra}`
  const corpo = linhas.map(i => {
    const q = i.quantidade, vu = i.valor_unitario
    const valor = (q !== undefined && q !== '' && vu !== undefined && vu !== '') ? (Number(q) || 0) * (Number(vu) || 0) : ''
    return `<tr><td style="${cel('left')}">${esc(i.descricao)}</td><td style="${cel('center')}">${esc(q ?? '')}</td>`
      + `<td style="${cel('right')}">${esc(fmtMoeda(vu))}</td><td style="${cel('right')}">${esc(fmtMoeda(valor))}</td></tr>`
  }).join('')
  const sobra = Math.max(ITENS_ALTURA_LINHA, ITENS_ALTURA_CORPO - linhas.length * ITENS_ALTURA_LINHA)
  const preenche = `<tr><td style="${cel('left', `height:${sobra}px;padding:0;`)}"></td><td style="${cel('left', `height:${sobra}px;padding:0;`)}"></td>`
    + `<td style="${cel('left', `height:${sobra}px;padding:0;`)}"></td><td style="${cel('left', `height:${sobra}px;padding:0;`)}"></td></tr>`
  const th = (alin) => `border:${B};padding:4px 6px;font-size:13px;line-height:1.4;font-weight:bold;background:#d0cece;text-align:${alin};`
  const total = totalItens(linhas)
  return `<table style="width:100%;border-collapse:collapse;margin-top:12px;font-family:inherit;">`
    + `<colgroup><col style="width:48.7%"><col style="width:14.6%"><col style="width:16.9%"><col style="width:19.8%"></colgroup>`
    + `<tr><td colspan="4" style="border:${B};padding:4px 6px;font-size:13px;line-height:1.4;font-weight:bold;background:#bfbfbf;">Itens da Nota de Débito:</td></tr>`
    + `<tr><td style="${th('left')}">Descrição</td><td style="${th('center')}">Quantidade</td><td style="${th('center')}">Valor Unitário</td><td style="${th('center')}">Valor</td></tr>`
    + corpo + preenche
    + `<tr><td colspan="2" style="border:${B};height:70px;"></td>`
    + `<td style="border:${B};background:#d0cece;text-align:center;vertical-align:middle;font-size:14px;line-height:1.4;">Valor Total</td>`
    + `<td style="border:${B};text-align:center;vertical-align:middle;font-size:14px;line-height:1.4;">${esc(total ? fmtMoeda(total) : '')}</td></tr>`
    + `</table>`
}

// Nome do arquivo PDF a partir do padrão do modelo (texto puro, sem HTML). Tira caracteres que o
// Windows não aceita em nome de arquivo; modelo sem padrão usa NOME_ARQUIVO_PADRAO.
export const NOME_ARQUIVO_PADRAO = '{{garantia.numero_sg}} - {{garantia.chassi_final}} - ND'
export function nomeArquivoNota(padrao, ctx) {
  const modelo = String(padrao || '').trim() || NOME_ARQUIVO_PADRAO
  const base = modelo.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, chave) => String(ctx[chave] ?? ''))
  const limpo = base.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()
  return `${limpo || 'Nota de Debito'}.pdf`
}

export function renderizarModelo(html, ctx) {
  return String(html || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, chave) => {
    if (chave === 'itens_tabela') return tabelaItens(ctx.__itens)
    if (chave === 'itens_total') return esc(fmtMoeda(totalItens(ctx.__itens)) || '')
    if (chave === 'logo') return ctx.__logo ? `<img src="${esc(ctx.__logo)}" style="max-height:78px;max-width:220px;" />` : ''
    return esc(ctx[chave] ?? '')
  })
}

async function montarPdf(el) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  // O Tailwind (preflight) põe img{display:block}; o html2canvas mede a linha de base do texto com
  // uma <img> inline e, com isso, desenha todo texto mais baixo (fora do centro das células).
  // Desfaz só durante a captura.
  const ajuste = document.createElement('style')
  ajuste.textContent = 'img{display:inline !important;vertical-align:baseline !important}'
  document.head.appendChild(ajuste)
  let canvas
  try {
    canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' })
  } finally { ajuste.remove() }
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
  const pw = pdf.internal.pageSize.getWidth()
  const ph = pdf.internal.pageSize.getHeight()
  const margem = 24
  const larg = pw - margem * 2
  const altTotal = (canvas.height * larg) / canvas.width
  const altPagina = ph - margem * 2
  // Fatia o canvas em páginas A4
  const pxPorPagina = Math.floor((altPagina * canvas.width) / larg)
  let y = 0
  let primeira = true
  while (y < canvas.height) {
    const h = Math.min(pxPorPagina, canvas.height - y)
    const parte = document.createElement('canvas')
    parte.width = canvas.width
    parte.height = h
    parte.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (!primeira) pdf.addPage()
    pdf.addImage(parte.toDataURL('image/png'), 'PNG', margem, margem, larg, (h * larg) / canvas.width)
    primeira = false
    y += h
  }
  void altTotal
  return pdf
}

export async function gerarPdfDeElemento(el, nomeArquivo) {
  (await montarPdf(el)).save(nomeArquivo)
}

// Devolve uma URL (blob) do PDF para abrir em outra aba, sem baixar
export async function gerarPdfUrlDeElemento(el) {
  return (await montarPdf(el)).output('bloburl')
}

// Renderiza o HTML fora da tela (largura de uma A4) e entrega o elemento à função
export async function comElementoOculto(html, fn) {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff;'
  el.innerHTML = html
  document.body.appendChild(el)
  try {
    await Promise.all([...el.querySelectorAll('img')].map(img => img.complete ? null : new Promise(r => { img.onload = r; img.onerror = r })))
    return await fn(el)
  } finally { document.body.removeChild(el) }
}
