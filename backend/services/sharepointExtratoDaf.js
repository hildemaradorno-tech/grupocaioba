// Extrato de Pagamento DAF — lê a planilha que a DAF envia (exportação do SAP, ex.: Account-303920.xlsx).
// Desde 23/11/2026 (pedido do usuário) o extrato é lido SÓ pela importação na tela: o arquivo vem no POST,
// é lido e conciliado na hora e devolvido para a tela. Nada é gravado (nem SharePoint, nem Supabase) —
// "sempre que importar, não teremos banco de dados". Só o RFN003 (títulos a receber) continua vindo do SharePoint.
// Planilha com 15 colunas em inglês (Document Type, Account, Reference...). Valores negativos = crédito
// pago à concessionária. A última linha é o total por Clearing Document (sem Document Type/Number): ignorada.
import XLSX from 'xlsx'
import { getTitulosAReceber, clearFinanceiroCache } from './sharepointFinanceiro.js'

// Cabeçalho do SAP → campo + rótulo em português (a ordem é a da planilha)
export const COLUNAS = [
  ['Document Type', 'tipo_documento', 'Tipo Doc.'],
  ['Account', 'conta', 'Conta'],
  ['Reference', 'referencia', 'Referência'],
  ['Document Number', 'numero_documento', 'Nº Documento'],
  ['Assignment', 'atribuicao', 'Atribuição'],
  ['Clearing Document', 'doc_compensacao', 'Doc. Compensação'],
  ['Posting Date', 'data_lancamento', 'Data Lançamento'],
  ['Document Date', 'data_documento', 'Data Documento'],
  ['Clearing date', 'data_compensacao', 'Data Compensação'],
  ['Document currency', 'moeda_documento', 'Moeda Doc.'],
  ['Amount in doc. curr.', 'valor_moeda_documento', 'Valor'],
  ['Local Currency', 'moeda_local', 'Moeda Local'],
  ['Withholding tax amnt', 'imposto_retido', 'Imposto Retido'],
  ['Amount in local currency', 'valor_moeda_local', 'Valor Líquido'],
  ['Text', 'texto', 'Texto'],
]
// Colunas lidas mas NÃO mostradas na tela/PDF (pedido do usuário em 22/11/2026: tirar "Moeda Doc." e "Moeda Local")
const COLUNAS_OCULTAS = new Set(['moeda_documento', 'moeda_local'])
const colunasTela = () => COLUNAS.filter(([, campo]) => !COLUNAS_OCULTAS.has(campo)).map(([, campo, rotulo]) => ({ campo, rotulo }))
const CAMPOS_DATA = new Set(['data_lancamento', 'data_documento', 'data_compensacao'])
const CAMPOS_VALOR = new Set(['valor_moeda_documento', 'imposto_retido', 'valor_moeda_local'])
const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

// Data do Excel (número serial) ou texto "MM/DD/YY" → "AAAA-MM-DD"
function paraIsoData(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v)
    return d ? `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` : null
  }
  const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/) // padrão do SAP em inglês: mês/dia/ano
  if (!m) return String(v)
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3]
  return `${ano}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
}
function paraNumero(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

export function parseExtrato(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const linhas = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null })
  const cab = (linhas[0] || []).map(norm)
  const idx = COLUNAS.map(([orig]) => cab.indexOf(norm(orig)))
  const registros = []
  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i]
    const reg = {}
    COLUNAS.forEach(([, campo], k) => {
      const v = idx[k] >= 0 ? l[idx[k]] : null
      reg[campo] = CAMPOS_DATA.has(campo) ? paraIsoData(v) : CAMPOS_VALOR.has(campo) ? paraNumero(v) : (v == null ? null : String(v).trim())
    })
    if (!reg.tipo_documento && !reg.numero_documento) continue // linha de total do SAP
    registros.push(reg)
  }
  return { registros, colunas_nao_encontradas: COLUNAS.filter((_, k) => idx[k] < 0).map(([orig]) => orig) }
}

// Importação (engrenagem da tela → "Importar arquivo Account-"): confere se é mesmo o extrato (colunas do SAP,
// ao menos 1 lançamento), lê e concilia na hora. Devolve { extrato, conciliacao } para a tela; nada é gravado.
const COLUNAS_OBRIGATORIAS_IMPORT = ['Document Type', 'Reference', 'Document Number', 'Amount in local currency', 'Text']
export async function importarExtratoDaf(nomeEnviado, buffer, { refresh = false } = {}) {
  const nome = String(nomeEnviado || '').split(/[\\/]/).pop().trim()
  if (!/\.xlsx?$/i.test(nome)) throw Object.assign(new Error('Envie a planilha do extrato em Excel (.xlsx ou .xls).'), { status: 400 })
  let cabecalho
  try {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    cabecalho = (XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 })[0] || []).map(norm)
  } catch {
    throw Object.assign(new Error('O arquivo enviado não é uma planilha Excel válida.'), { status: 400 })
  }
  const faltando = COLUNAS_OBRIGATORIAS_IMPORT.filter(c => !cabecalho.includes(norm(c)))
  if (faltando.length) {
    throw Object.assign(new Error(`O arquivo não parece ser o extrato de pagamento da DAF (SAP). Colunas que faltam: ${faltando.join(', ')}.`), { status: 400 })
  }
  const { registros, colunas_nao_encontradas } = parseExtrato(buffer)
  if (!registros.length) throw Object.assign(new Error('O arquivo não tem nenhum lançamento.'), { status: 400 })

  const extrato = {
    arquivo: { nome, importado_em: new Date().toISOString() },
    colunas: colunasTela(),
    colunas_nao_encontradas,
    registros,
    lido_em: new Date().toISOString(),
  }
  const conciliacao = await getConciliacaoDaf({ extrato, refresh })
  console.log(`[ExtratoDaf] importado pela tela: ${nome} (${registros.length} lançamento(s)) — só leitura, nada gravado`)
  return { extrato, conciliacao }
}

// ── Conciliação extrato × títulos a receber da DAF (RFN003 Analítico, mesma leitura do Garantias DAF) ─────
// Análise de 19/11/2026 (Account-303920 × RFN003): a DAF paga cada título em até duas linhas —
//   • serviço: Referência = nº da NFS-e  → RFN003 "Nota Fiscal / Nota de Serviço" (parte depois da "/")
//   • peças:   Referência = "NFP 53792"  → RFN003 "Nota Fiscal"
// e a soma bate com o Valor do título (diferença de arredondamento de até R$ 0,03). O Saldo do título já
// desconta a retenção de 4,65% sobre o serviço; quando a DAF não retém, o líquido pago passa do saldo.
// Sem a nota, tenta pelo Texto: chassi (completo ou final "TB171089"), O.S. ("60515-31459" → O.S. 31459) e
// o número "O069864", que o pós-venda anota na Observação do título — vira "Sugerido", para conferência.
// Nada é gravado: depois da baixa dos títulos a conciliação não é mais necessária.
const TOLERANCIA = 0.05
const CLIENTE_DAF = (t) => t.codigo_cliente === '12' || /DAF CAMINH/i.test(t.cliente_fornecedor)
const soDigitos = (s) => String(s || '').replace(/\D/g, '').replace(/^0+/, '')
const r2 = (n) => Math.round(n * 100) / 100
const ordemDaObs = (obs) => soDigitos(String(obs || '').match(/\bO0*(\d{4,7})\b/i)?.[1])

function pistasDoTexto(texto) {
  const t = String(texto || '').toUpperCase()
  const chassi = t.match(/\b[0-9A-Z]{9}[A-Z]{2}\d{6}\b/)?.[0] || null           // 98PTTH430TB174549
  const chassiFinal = chassi ? chassi.slice(-8) : (t.match(/\b[A-Z]{2}\d{6}\b/)?.[0] || null) // TB171089
  const os = t.match(/\b\d{5}-(\d{3,7})\b/)?.[1] || null                        // 60515-31459 → 31459
  const ordem = soDigitos(t.match(/\bO0*(\d{4,7})\b/)?.[1]) || null              // O069864 → 69864
  return { chassi, chassiFinal, os, ordem }
}

function indexar(lista, chaveFn) {
  const m = new Map()
  for (const t of lista) {
    const k = chaveFn(t)
    if (!k) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(t)
  }
  return m
}

function encontrarTitulo(linha, idx, titulos) {
  const nfp = linha.referencia?.match(/^NFP\s*(\d+)/i)?.[1]
  const ref = soDigitos(nfp || linha.referencia)
  // chaves: quais campos do título casaram com a linha (a tela marca essas colunas com ✔)
  const pelaNfs = !nfp && ref ? idx.nfs.get(ref) : null
  const porNota = ref ? (nfp ? idx.nfp.get(ref) : (pelaNfs || idx.nfp.get(ref))) : null
  if (porNota?.length === 1) {
    const chave = nfp || !pelaNfs ? 'nfp' : 'nfs'
    return { titulo: porNota[0], vinculo: 'Nota', chaves: [chave], motivo: chave === 'nfp' ? `NFP ${ref} = Nota Fiscal do título` : `NFS-e ${ref} = Nota de Serviço do título` }
  }

  // Sem nota única: pistas do Texto
  const p = pistasDoTexto(linha.texto)
  let cand = porNota?.length > 1 ? porNota : titulos
  const filtros = []
  const chaves = []
  if (p.chassiFinal) {
    const f = cand.filter(t => t.chassi.toUpperCase().endsWith(p.chassiFinal))
    cand = f
    if (f.length) { filtros.push(`chassi ${p.chassi || p.chassiFinal}`); chaves.push('chassi') }
  }
  if (cand.length > 1 && p.os) { const f = cand.filter(t => soDigitos(t.os_numero) === p.os); if (f.length) { cand = f; filtros.push(`O.S. ${p.os}`); chaves.push('os') } }
  if (cand.length > 1 && p.ordem) { const f = cand.filter(t => ordemDaObs(t.observacao) === p.ordem); if (f.length) { cand = f; filtros.push(`O${p.ordem} na observação`); chaves.push('observacao') } }
  if (cand.length === 1 && filtros.length) {
    // O.S. do texto que bate com a do título também conta como chave, mesmo sem ter sido preciso para desempatar
    if (p.os && soDigitos(cand[0].os_numero) === p.os && !chaves.includes('os')) chaves.push('os')
    return { titulo: cand[0], vinculo: 'Sugerido', chaves, motivo: `Pelo texto: ${filtros.join(' + ')}` }
  }
  if (cand.length > 1 && cand.length <= 10 && (filtros.length || porNota?.length > 1)) {
    return { titulo: null, vinculo: 'Ambíguo', motivo: `${cand.length} títulos possíveis (${filtros.join(' + ') || `nota ${ref}`})`, candidatos: cand.map(t => t.nro_lancamento) }
  }
  return { titulo: null, vinculo: null, motivo: 'Nenhum título da DAF com essa nota, chassi ou O.S. no RFN003' }
}

function situacao({ valor, saldo, pago_bruto, pago_liquido }) {
  if (saldo <= TOLERANCIA) return 'Já baixado'
  const difValor = r2(valor - pago_bruto)
  if (difValor > TOLERANCIA) return 'Pago a menor'
  if (difValor < -TOLERANCIA) return 'Pago a maior'
  return Math.abs(r2(saldo - pago_liquido)) > TOLERANCIA ? 'Retenção divergente' : 'Conciliado'
}

const linhaResumo = (l) => ({
  i: l.i, referencia: l.referencia, numero_documento: l.numero_documento, texto: l.texto, valor: l.valor_moeda_documento,
  retido: l.imposto_retido, liquido: l.valor_moeda_local, vinculo: l.vinculo, motivo: l.motivo, chaves: l.chaves || [], candidatos: l.candidatos || [],
})

// extrato = o que importarExtratoDaf acabou de ler do arquivo enviado ({ arquivo, registros, ... })
export async function getConciliacaoDaf({ extrato, refresh = false } = {}) {
  if (refresh) clearFinanceiroCache()
  const rfn = await getTitulosAReceber()
  const titulos = (rfn.rows || []).filter(CLIENTE_DAF)
  const idx = {
    nfs: indexar(titulos, t => soDigitos(String(t.nota_fiscal_servico).split('/')[1])),
    nfp: indexar(titulos, t => soDigitos(t.nota_fiscal)),
  }

  const linhas = extrato.registros.map((l, i) => ({ i, ...l, ...encontrarTitulo(l, idx, titulos) }))
  const grupos = new Map()
  for (const l of linhas) {
    if (!l.titulo) continue
    const k = l.titulo.nro_lancamento
    if (!grupos.has(k)) grupos.set(k, { titulo: l.titulo, linhas: [] })
    grupos.get(k).linhas.push(l)
  }

  const conciliacao = [...grupos.values()].map(({ titulo: t, linhas: ls }) => {
    // Valores do extrato vêm negativos (crédito da DAF): pago = −soma
    const pago_bruto = r2(-ls.reduce((s, l) => s + (l.valor_moeda_documento || 0), 0))
    const retido = r2(-ls.reduce((s, l) => s + (l.imposto_retido || 0), 0))
    const pago_liquido = r2(-ls.reduce((s, l) => s + (l.valor_moeda_local || 0), 0))
    return {
      lancamento: t.nro_lancamento, nro_titulo: t.nro_titulo, empresa: t.empresa, cliente_fornecedor: t.cliente_fornecedor, tipo_titulo: t.tipo_titulo,
      agente_cobrador: t.agente_cobrador, conta_gerencial: t.conta_gerencial,
      os: t.os_numero, chassi: t.chassi, placa: t.placa, nota_fiscal_servico: t.nota_fiscal_servico, nota_fiscal: t.nota_fiscal,
      emissao: t.data_emissao, vencimento: t.data_vencimento, atraso: t.atraso, observacao: t.observacao,
      valor: t.valor, saldo: t.saldo, pago_bruto, retido, pago_liquido,
      dif_valor: r2(t.valor - pago_bruto),
      dif_saldo: r2(t.saldo - pago_liquido),
      situacao: situacao({ valor: t.valor, saldo: t.saldo, pago_bruto, pago_liquido }),
      sugerido: ls.some(l => l.vinculo === 'Sugerido'),
      linhas: ls.map(linhaResumo),
    }
  }).sort((a, b) => a.empresa.localeCompare(b.empresa) || a.lancamento.localeCompare(b.lancamento, undefined, { numeric: true }))

  const noExtrato = new Set(grupos.keys())
  const emAberto = titulos
    .filter(t => t.saldo > TOLERANCIA && !noExtrato.has(t.nro_lancamento))
    .map(t => ({
      lancamento: t.nro_lancamento, nro_titulo: t.nro_titulo, empresa: t.empresa, cliente_fornecedor: t.cliente_fornecedor,
      tipo_titulo: t.tipo_titulo, agente_cobrador: t.agente_cobrador, conta_gerencial: t.conta_gerencial, os: t.os_numero,
      chassi: t.chassi, nota_fiscal_servico: t.nota_fiscal_servico, nota_fiscal: t.nota_fiscal, emissao: t.data_emissao,
      vencimento: t.data_vencimento, atraso: t.atraso, valor: t.valor, saldo: t.saldo, observacao: t.observacao,
    }))
    .sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  return {
    arquivo: extrato.arquivo,
    rfn003_atualizado_em: rfn.lastModified,
    tolerancia: TOLERANCIA,
    conciliacao,
    sem_titulo: linhas.filter(l => !l.titulo).map(linhaResumo),
    em_aberto: emAberto,
    empresas_no_extrato: [...new Set(conciliacao.map(c => c.empresa))],
  }
}
