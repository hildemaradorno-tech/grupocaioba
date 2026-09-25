// Helpers de exibição e sincronização compartilhados pelas telas do módulo TruckPag
// (parsing das planilhas acontece no backend, em backend/services/sharepointTruckPag.js).
import { apiService } from '../../services/api'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

export const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtData = (iso) => {
  if (!iso) return '—'
  try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return iso }
}

const FONTES_TRUCKPAG = [
  { chave: 'titulos', importar: (rows) => apiService.importarTruckPagTitulos(rows) },
  { chave: 'creditos', importar: (rows) => apiService.importarTruckPagCreditos(rows) },
  { chave: 'repasses', importar: (rows) => apiService.importarTruckPagRepasses(rows) },
]

// Data de modificação do arquivo de cada fonte (vem do SharePoint junto com as linhas), guardada
// no navegador pra continuar aparecendo depois de recarregar a tela.
const chaveDataArquivo = (chave) => `truckpag_arquivo_modificado_${chave}`
export function lerDataArquivoTruckPag(chave) {
  try { return localStorage.getItem(chaveDataArquivo(chave)) } catch { return null }
}
function salvarDataArquivoTruckPag(chave, iso) {
  try { if (iso) localStorage.setItem(chaveDataArquivo(chave), iso) } catch { /* sem storage: só não persiste */ }
}

// Atualiza as 3 fontes do SharePoint (títulos, créditos, repasses) de uma vez e grava no
// Supabase — usado pelo botão "Atualizar do SharePoint" em qualquer uma das 3 telas, pra
// nunca deixar uma fonte desatualizada em relação às outras. Cada fonte é tratada de forma
// independente: uma falhar não impede as outras de atualizar.
export async function sincronizarTudoTruckPag() {
  return Promise.all(FONTES_TRUCKPAG.map(async (f) => {
    try {
      const r = await fetch(`${BACKEND_URL}/api/truckpag/${f.chave}/refresh`, { method: 'POST' })
      if (!r.ok) {
        const body = await r.json().catch(() => ({}))
        throw new Error(body.message || `Erro ${r.status} ao consultar o SharePoint (${f.chave}).`)
      }
      const { rows, lastModified } = await r.json()
      await f.importar(rows)
      salvarDataArquivoTruckPag(f.chave, lastModified)
      return { chave: f.chave, ok: true, lastModified }
    } catch (e) {
      return { chave: f.chave, ok: false, erro: e.message || String(e) }
    }
  }))
}

const TOLERANCIA_VINCULO = 0.02

// "DAF CAIOBA TRUCKS - DOURADOS | 60596" → { empresa: "DAF CAIOBA TRUCKS - DOURADOS", codigoEmpresa: "60596" }
export function splitEstabelecimento(estabelecimento) {
  const s = String(estabelecimento ?? '')
  const i = s.lastIndexOf('|')
  if (i === -1) return { empresa: s.trim(), codigoEmpresa: '' }
  return { empresa: s.slice(0, i).trim(), codigoEmpresa: s.slice(i + 1).trim() }
}

// Concilia repasses × créditos não identificados: agrupa os repasses por estabelecimento+data
// de pagamento (cada bloco do arquivo contas-receber-daf.xlsx vira um depósito bancário só) e
// tenta casar o total líquido de cada grupo com o valor de um crédito não identificado (mesmo
// valor, dentro de uma tolerância configurável pelo usuário — Configurações → Tolerância de
// Valor — pra mais ou pra menos). Cada crédito só pode ser usado uma vez. Retorna os grupos de
// repasse (cada um já com totalBruto/totalTaxa/total líquido e `creditoVinculado` ou null) e um
// Map crédito.id → grupo, pra consulta do lado dos créditos.
export function conciliarRepassesCreditos(repasses, creditos, tolerancia = TOLERANCIA_VINCULO) {
  const gruposMap = new Map()
  for (const r of repasses) {
    const chave = `${r.estabelecimento}|${r.data_pagamento}`
    if (!gruposMap.has(chave)) {
      const { empresa, codigoEmpresa } = splitEstabelecimento(r.estabelecimento)
      gruposMap.set(chave, {
        chave, estabelecimento: r.estabelecimento, empresa, codigoEmpresa, data_pagamento: r.data_pagamento,
        linhas: [], totalBruto: 0, totalTaxa: 0, total: 0,
      })
    }
    const g = gruposMap.get(chave)
    g.linhas.push(r)
    g.totalBruto += r.valor_parcela_total || 0
    g.totalTaxa += r.valor_taxa || 0
    g.total += r.valor_recebido || 0
  }
  const grupos = Array.from(gruposMap.values())

  const creditosDisponiveis = creditos.map(c => ({ ...c, usado: false }))
  for (const g of grupos) {
    const match = creditosDisponiveis.find(c => !c.usado && Math.abs((c.valor || 0) - g.total) <= tolerancia)
    g.creditoVinculado = match || null
    if (match) match.usado = true
  }

  const creditoParaGrupo = new Map()
  for (const g of grupos) {
    if (g.creditoVinculado) creditoParaGrupo.set(g.creditoVinculado.id, g)
  }

  return { grupos, creditoParaGrupo }
}

// Código do estabelecimento a partir do NOME da empresa nos títulos (esse relatório não traz o
// código, só o repasse traz via "estabelecimento" — ex: "DAF CAIOBA TRUCKS - DOURADOS | 60596").
// Casa pela cidade/unidade no nome.
const CODIGOS_EMPRESA = [
  { padrao: /DOURADOS/i, codigo: '60596' },
  { padrao: /TR[ÊE]S LAGOAS/i, codigo: '60962' },
  { padrao: /CAMPO GRANDE/i, codigo: '60515' },
  { padrao: /CHAPAD[ÃA]O/i, codigo: '60965' },
]
export function codigoEmpresaPorNome(nomeEmpresa) {
  const alvo = CODIGOS_EMPRESA.find(c => c.padrao.test(String(nomeEmpresa ?? '')))
  return alvo ? alvo.codigo : ''
}

// Sigla de 3 letras por unidade — usada no nome do arquivo de baixa exportado (mesmo padrão do
// arquivo que o sistema de destino já aceita, ex: "04022026 CGR Total Recebido R$ 26.288,24.txt").
const SIGLAS_EMPRESA = [
  { padrao: /CAMPO GRANDE/i, sigla: 'CGR' },
  { padrao: /DOURADOS/i, sigla: 'DOU' },
  { padrao: /TR[ÊE]S LAGOAS/i, sigla: 'TLG' },
  { padrao: /CHAPAD[ÃA]O/i, sigla: 'CPD' },
]
export function siglaEmpresaPorNome(nomeEmpresa) {
  const alvo = SIGLAS_EMPRESA.find(c => c.padrao.test(String(nomeEmpresa ?? '')))
  return alvo ? alvo.sigla : ''
}

// "18878 / 18879" → { rps: "18878", nfse: "18879" }; sem barra, repete o mesmo número nas duas.
export function splitNfeServico(v) {
  const s = String(v ?? '').trim()
  const i = s.indexOf('/')
  if (i === -1) return { rps: s, nfse: s }
  return { rps: s.slice(0, i).trim(), nfse: s.slice(i + 1).trim() }
}

// "18878/1 " → "1" (o que vem depois da barra em Título)
export function parcelaDoTitulo(v) {
  const s = String(v ?? '').trim()
  const i = s.indexOf('/')
  return i === -1 ? '' : s.slice(i + 1).trim()
}

// "18878/1 " → "18878" (o número em si, antes da barra) — em títulos de venda oficina, esse
// número às vezes é o mesmo usado como Nº NF-e no repasse (validado contra dados reais).
function numeroDoTitulo(v) {
  const s = String(v ?? '').trim()
  const i = s.indexOf('/')
  return i === -1 ? s : s.slice(0, i).trim()
}

// "3/3" → "3" (número da parcela atual, antes da barra, no formato do repasse)
function primeiraParteParcelas(v) {
  const s = String(v ?? '').trim()
  const i = s.indexOf('/')
  return i === -1 ? s : s.slice(0, i).trim()
}

function normalizarDoc(v) {
  return String(v ?? '').replace(/\D/g, '')
}

// Para CNPJ (14 dígitos), compara só a raiz (primeiros 8 dígitos) para não divergir por filial.
// Para CPF (11 dígitos) ou qualquer outro doc, compara tudo.
function docsBatem(a, b) {
  if (!a || !b) return false
  if (a.length === 14 && b.length === 14) return a.slice(0, 8) === b.slice(0, 8)
  return a === b
}

// O relatório de títulos tem 2 colunas de nota fiscal (Nota Fiscal = peças, Nota Fiscal/Nota de
// Serviço = serviço, dividida em RPS/NFS-e) mas o preenchimento vem inconsistente — número de
// serviço aparece na coluna de peças e vice-versa. Pra não depender de qual coluna é qual, junta
// tudo num conjunto único; a conciliação com o repasse verifica se o número dele aparece em
// QUALQUER uma dessas notas do título, não numa coluna específica.
export function notasFiscaisDoTitulo(t) {
  const { rps, nfse } = splitNfeServico(t.titulo_nota_fiscal_elet_serv_numero)
  const tituloNF = String(t.titulo_nota_fiscal_numero ?? '').trim()
  const tituloNumero = numeroDoTitulo(t.titulo_numero)
  return [...new Set([tituloNF, tituloNumero, rps, nfse].filter(Boolean))]
}

// Campos que decidem verde/amarelo, depois que o candidato já passou pela obrigatoriedade abaixo.
// Pedido do usuário: "obrigatórios CNPJ do cliente, Nº NF-e ou Nº NFS-e para entrar na validação;
// aí para ser verde: todos devem ser iguais; amarelo: alguma divergência nesses campos Nº OS,
// Parcelas, Valor total parcela". Depois, o usuário pediu pra tirar Nº OS da regra (o campo nem
// sempre está preenchido e não é confiável como critério), pediu pra checar também se o Saldo do
// título bate com o Valor Recebido do repasse (o que efetivamente cai na conta pra zerar o saldo)
// e por fim pediu pra Parcela virar obrigatória também (se não bater, é "não encontrado", não
// "divergente" — ver identidadeBate abaixo). Depois disso, o CNPJ do Cliente deixou de ser
// obrigatório pra virar candidato — passou pra CAMPOS_GRADUACAO junto com Valor/Saldo; depois o
// usuário pediu de volta como obrigatório (ver conciliarTitulosRepasses abaixo), então aqui ficam
// só Valor e Saldo.
const CAMPOS_GRADUACAO = ['documento', 'valor', 'saldo']

// Concilia títulos × repasses. Nº NF-e e Nº NFS-e do repasse são checados contra TODAS as notas
// do título (notasFiscaisDoTitulo) juntas, não campo a campo — a planilha de títulos vem com
// número de serviço às vezes na coluna de peças e vice-versa, então tentar casar campo específico
// contra campo específico perdia conciliações válidas.
//
// Obrigatório pra virar candidato (a identidade do título, todos precisam bater — testado com
// "basta 1 dos 3" e dava falso positivo: título achava repasse do mesmo CLIENTE mas sem nenhuma
// nota fiscal em comum, só porque o CNPJ do cliente se repete em vários títulos dele): Código da
// Empresa, Parcela, CNPJ do Cliente (raiz do CNPJ, ver docsBatem) E (Nº NF-e OU Nº NFS-e, pelo
// menos uma nota bate). Depois, CAMPOS_GRADUACAO (CNPJ completo, Valor, Saldo) decide o status
// verde/amarelo. 'exato' = todos os campos de graduação comparáveis bateram (ou não houve nenhum
// comparável); 'divergente' = identidade bate mas CNPJ completo, Valor ou Saldo diverge; 'nao_encontrado' = nenhum repasse
// bate a identidade completa (código + parcela + CNPJ + nota fiscal).
//
// `camposDivergentes` no retorno junta TUDO que foi comparado (código, NF-e, NFS-e, parcela — só
// informativo pra tela, não entram na graduação — mais documento/valor/saldo, que são os que
// decidem o status), pra tela poder mostrar uma bolinha verde em qualquer campo que bateu.
//
// `tolerancia` é a mesma configurável em Configurações → Tolerância de Valor (compartilhada com
// conciliarRepassesCreditos) — usa TOLERANCIA_VINCULO como padrão só se o chamador não passar nada.
export function conciliarTitulosRepasses(titulos, repasses, tolerancia = TOLERANCIA_VINCULO) {
  return titulos.map(t => {
    const tituloParcela = parcelaDoTitulo(t.titulo_numero)
    const tituloDoc = normalizarDoc(t.titulo_pessoa_doc_ident)
    const tituloValor = t.titulo_valor
    const tituloSaldo = t.titulo_saldo
    const tituloCodigo = codigoEmpresaPorNome(t.titulo_empresa_nome)
    const notasTitulo = notasFiscaisDoTitulo(t)

    let melhor = null
    const candidatos = []
    for (const r of repasses) {
      const repasseDoc = normalizarDoc(r.cnpj_cliente)
      const repasseNF = String(r.nf_e ?? '').trim()
      const repasseNFSe = String(r.nfs_e ?? '').trim()
      const repasseParcela = primeiraParteParcelas(r.parcelas)
      const repasseCodigo = splitEstabelecimento(r.estabelecimento).codigoEmpresa

      const obrigatorios = {}
      if (tituloCodigo && repasseCodigo) obrigatorios.codigo = tituloCodigo === repasseCodigo
      if (repasseNF && notasTitulo.length) obrigatorios.notaFiscal = notasTitulo.includes(repasseNF)
      if (repasseNFSe && notasTitulo.length) obrigatorios.nfse = notasTitulo.includes(repasseNFSe)
      if (tituloParcela && repasseParcela) obrigatorios.parcela = tituloParcela === repasseParcela
      // Identidade: só a RAIZ do CNPJ precisa bater (filial diferente não impede o par).
      if (tituloDoc && repasseDoc) obrigatorios.documentoRaiz = docsBatem(tituloDoc, repasseDoc)

      const notaBate = obrigatorios.notaFiscal === true || obrigatorios.nfse === true
      const identidadeBate = obrigatorios.codigo === true && obrigatorios.parcela === true && obrigatorios.documentoRaiz === true && notaBate
      if (!identidadeBate) continue // identidade incompleta — não é candidato

      const graduacao = {}
      // CNPJ/CPF completo (com filial e dígito) idêntico decide verde/amarelo, junto com Valor e Saldo.
      graduacao.documento = tituloDoc === repasseDoc
      if (tituloValor !== null && tituloValor !== undefined) {
        graduacao.valor = Math.abs(tituloValor - (r.valor_parcela_total || 0)) <= tolerancia
      }
      if (tituloSaldo !== null && tituloSaldo !== undefined) {
        // Compara com o valor BRUTO (valor_parcela_total), não com valor_recebido (líquido, já
        // descontada a taxa administrativa) — saldo do título também é bruto, comparar com o
        // líquido faria praticamente todo título aberto divergir só pela taxa.
        graduacao.saldo = Math.abs(tituloSaldo - (r.valor_parcela_total || 0)) <= tolerancia
      }

      const valores = Object.values(graduacao)
      const score = valores.filter(Boolean).length
      const total = valores.length
      candidatos.push({ r, obrigatorios, graduacao })
      if (!melhor || score > melhor.score || (score === melhor.score && total < melhor.total)) {
        melhor = { r, obrigatorios, graduacao, score, total }
      }
    }

    if (!melhor) return { ...t, statusConciliacao: 'nao_encontrado', repasseMatch: null, camposDivergentes: null }

    // Um título pode ser pago por MAIS DE UM repasse com a mesma identidade (ex.: uma parcela com
    // NF-e de peças + NFS-e de serviço, cada uma num repasse). Se a soma dos valores desses
    // repasses fecha com o Valor (e o Saldo) do título, todos eles ficam ligados ao título — em vez
    // de só o primeiro achado ficar com ele e os outros aparecerem como "sem título". O status é
    // 'divergente' (amarelo), porque o valor de cada repasse, isolado, difere do título (pedido do
    // usuário: o pagamento veio dividido e isso precisa continuar chamando atenção).
    if (candidatos.length > 1) {
      const soma = candidatos.reduce((acc, c) => acc + (c.r.valor_parcela_total || 0), 0)
      const valorBate = tituloValor !== null && tituloValor !== undefined && Math.abs(tituloValor - soma) <= tolerancia
      const saldoBate = tituloSaldo === null || tituloSaldo === undefined || Math.abs(tituloSaldo - soma) <= tolerancia
      if (valorBate && saldoBate) {
        const graduacao = { valor: false }
        if (tituloSaldo !== null && tituloSaldo !== undefined) graduacao.saldo = false
        return {
          ...t,
          statusConciliacao: 'divergente',
          repasseMatch: candidatos[0].r,
          repassesMatch: candidatos.map(c => c.r),
          camposDivergentes: { ...candidatos[0].obrigatorios, ...candidatos[0].graduacao, ...graduacao },
          // Campos que bateram de cada repasse (as bolinhas verdes são por repasse: um tem só NF-e, o outro só NFS-e).
          camposPorRepasse: Object.fromEntries(candidatos.map(c => [c.r.id, { ...c.obrigatorios, ...c.graduacao, ...graduacao }])),
        }
      }
    }
    const status = melhor.score === melhor.total ? 'exato' : 'divergente'
    return { ...t, statusConciliacao: status, repasseMatch: melhor.r, camposDivergentes: { ...melhor.obrigatorios, ...melhor.graduacao } }
  })
}

// Gera o conteúdo do arquivo de baixa de títulos no layout que o Dealer.net aceita (tela Banco
// Retorno → Interface "Cobrança PIX", Segmento 03, Tipo "Aviso de Lançamento"): registro de 39
// posições fixas, uma linha por título, sem cabeçalho/rodapé:
//   posição 1      (1 dígito)  — tipo de registro, fixo '3'
//   posições 2-16  (15 dígitos) — Título/Documento = titulo_codigo (Lançamento), zero à esquerda
//   posições 17-24 (8 dígitos)  — Data de Pagamento, DDMMAAAA (uma data só pro lote inteiro)
//   posições 25-39 (15 dígitos) — Valor (saldo do título) em centavos, zero à esquerda — o
//                                 Dealer.net não lê esse campo nessa configuração, mas mantém a
//                                 mesma posição do arquivo de referência já aceito
export function gerarArquivoBaixaTitulos(titulos, dataPagamentoIso) {
  const [ano, mes, dia] = String(dataPagamentoIso).split('-')
  const ddmmaaaa = `${dia}${mes}${ano}`
  const linhas = titulos.map(t => {
    const titulo = String(t.titulo_codigo ?? '').padStart(15, '0')
    const valorCentavos = Math.round((t.titulo_saldo ?? 0) * 100)
    const valor = String(valorCentavos).padStart(15, '0')
    return `3${titulo}${ddmmaaaa}${valor}`
  })
  return linhas.join('\r\n') + '\r\n'
}

export const LABEL_CAMPO_CONCILIACAO = {
  codigo: 'Código',
  documento: 'CPF/CNPJ',
  notaFiscal: 'Nº NF-e',
  nfse: 'Nº NFS-e',
  parcela: 'Parcela',
  os: 'OS',
  valor: 'Valor',
  saldo: 'Saldo',
}

// Lê o resultado de conciliarTitulosRepasses (uma linha por título) e devolve o inverso: pra cada
// repasse (pela chave .id), qual título ficou casado com ele — usado na tela de Repasses, pra
// responder "quais títulos eu já posso dar baixa" a partir do lado do repasse. Se dois títulos
// disputarem o mesmo repasse (raro), fica o de status 'exato' (ou o primeiro achado, se nenhum for).
export function tituloConciliadoPorRepasse(titulosConciliados) {
  const mapa = new Map()
  for (const t of titulosConciliados) {
    if (!t.repasseMatch) continue
    for (const r of (t.repassesMatch || [t.repasseMatch])) {
      const atual = mapa.get(r.id)
      if (!atual || (t.statusConciliacao === 'exato' && atual.statusConciliacao !== 'exato')) {
        mapa.set(r.id, t.camposPorRepasse ? { ...t, repasseMatch: r, camposDivergentes: t.camposPorRepasse[r.id] } : t)
      }
    }
  }
  return mapa
}

// Filtra créditos pela lista configurável de "Tipo de Saldo" (truckpag_config_tipos_saldo):
// só entram créditos cuja Observação contenha (case-insensitive) algum dos textos cadastrados.
// Sem nenhum tipo cadastrado, não filtra nada — comportamento atual preservado até o usuário
// configurar a lista pela primeira vez.
export function filtrarCreditosPorTipoSaldo(creditos, tiposSaldo) {
  const ativos = (tiposSaldo || []).filter(t => t.ativo !== false).map(t => t.texto.toLowerCase())
  if (ativos.length === 0) return creditos
  return creditos.filter(c => {
    const obs = String(c.observacao ?? '').toLowerCase()
    return ativos.some(padrao => obs.includes(padrao))
  })
}
