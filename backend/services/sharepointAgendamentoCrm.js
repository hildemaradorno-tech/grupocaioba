import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// Campanhas CRM de agendamento (Dealer.net RCR038). Cada ano tem sua subpasta (ex: ".../CAMPANHA CRM/2026")
// e cada arquivo é uma execução de campanha de uma unidade: "RCR038_CampanhaCRM_Clientes_Excel CGR 20261019.xls"
// — a sigla da unidade e a data vêm do NOME do arquivo (a planilha não traz nenhuma das duas).
const RAIZ = '/Banco de Dados - DAF - Pós-Vendas/Agendamentos - CRM'
const PASTA = `${RAIZ}/CAMPANHA CRM`
const PREFIX = 'RCR038_CampanhaCRM_Clientes_Excel'
// Agendamentos de serviço (ROF037). Liga com o contato da campanha pelo CHASSI, considerando só os
// agendamentos criados a partir da data da campanha (o relatório não traz o atendimento do CRM).
const PASTA_AGENDAMENTOS = `${RAIZ}/AGENDAMENTO DE SERVICOS E PRODUTOS`
const PREFIX_AGENDAMENTOS = 'ROF037_AGENDAMENTOSERVICO'
// Aba Por Campanhas: o agendamento Ativo do chassi conta se for criado até N dias depois da data da campanha.
const DIAS_CAMPANHA_AGENDAMENTO = 30
// Contatos do CRM (RCR017 Lista por Data de Contato e Encerramento). Liga com a campanha pelo ID do atendimento
// (id_atendimento do RCR038 = Atendimento_Codigo).
const PASTA_CONTATOS = `${RAIZ}/LISTA POR DATA CONTATO_ENCERRAMENTO`
const PREFIX_CONTATOS = 'RCR017_LISTAPORDATACONTATOENCERRAMENTO'

const CACHE_TTL_MS = 5 * 60 * 1000
let _cache = null
let _cacheTs = 0

export function clearCampanhasCrmCache() { _cache = null; _cacheTs = 0 }

// Sigla da unidade no nome do arquivo → sigla oficial (os arquivos usam variações).
const SIGLA_OFICIAL = { CGR: 'CGR', CRG: 'CGR', CPD: 'CPD', DOU: 'DOU', DOR: 'DOU', TLG: 'TLG', TRL: 'TLG' }

// "RCR038_CampanhaCRM_Clientes_Excel CGR 20261019.xls" → { sigla: 'CGR', data: '2026-10-19' }
function infoDoNome(nome) {
  // Sigla é opcional (arquivo salvo sem ela ainda vale pela data); a data são os 8 dígitos AAAAMMDD.
  const resto = nome.slice(PREFIX.length)
  const d = resto.match(/(20\d{2})(\d{2})(\d{2})/)
  const sg = resto.match(/^\s*([A-Za-z]{2,4})\s+20\d{6}/)
  const sigla = sg ? sg[1].toUpperCase() : null
  return { sigla: sigla ? (SIGLA_OFICIAL[sigla] || sigla) : null, data: d ? `${d[1]}-${d[2]}-${d[3]}` : null }
}

const numOuZero = (v) => { const n = Number(v); return isNaN(n) ? 0 : n }
const txt = (v) => (v === null || v === undefined ? '' : String(v).trim())
const num = (v) => { if (v === '' || v === null || v === undefined) return null; const n = Number(v); return isNaN(n) ? null : n }

const dataExcel = (v) => {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 0) return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10)
  return null
}

// Linhas já lidas de cada arquivo do SharePoint (id do item → versão + linhas). Na releitura só baixa de novo
// o arquivo que mudou (eTag/lastModifiedDateTime diferente); os demais vêm da memória.
const _arquivosLidos = new Map()
async function baixarLinhas(item) {
  const versao = item.eTag || item.lastModifiedDateTime || ''
  const ja = _arquivosLidos.get(item.id)
  if (ja && ja.versao === versao) return ja.linhas
  const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 60_000 })
  const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' })
  const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
  _arquivosLidos.set(item.id, { versao, linhas })
  return linhas
}

// Baixa (ou pega da memória) as linhas de vários arquivos em paralelo, até `limite` por vez; devolve na mesma ordem.
async function baixarVarios(itens, limite = 8) {
  const res = new Array(itens.length)
  let prox = 0
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, async () => {
    while (prox < itens.length) {
      const i = prox++
      res[i] = await baixarLinhas(itens[i])
    }
  }))
  return res
}

// Arquivos com o prefixo na pasta e nas subpastas diretas (ex: subpasta de ano).
async function arquivosDoRelatorio(pasta, prefix) {
  const alvo = prefix.toLowerCase()
  const itens = await listar(pasta)
  const achados = itens.filter(i => i.file && i.name?.toLowerCase().startsWith(alvo))
  for (const sub of itens.filter(i => i.folder)) {
    achados.push(...(await listar(`${pasta}/${sub.name}`)).filter(i => i.file && i.name?.toLowerCase().startsWith(alvo)))
  }
  return achados.filter(i => i['@microsoft.graph.downloadUrl'])
}

// Map chassi → agendamentos (ROF037).
async function lerAgendamentos() {
  const porChassi = new Map()
  for (const item of await arquivosDoRelatorio(PASTA_AGENDAMENTOS, PREFIX_AGENDAMENTOS)) {
    const linhas = await baixarLinhas(item)
    for (const r of linhas) {
      const ag = {
        criado: dataExcel(r.AgendamentoHistorico_Data),
        data_agendamento: dataExcel(r.DtAgendamento),
        status: txt(r.StatusAgendamento).toUpperCase(), // AGE, CON, RAG, FIM, NSW, CAN...
        tipo: txt(r.AgendamentoTipo),
        os: num(r.OSNumero),
        empresa: txt(r.EmpresaNome),
        cliente: num(r.CodCliente),
      }
      const chassi = txt(r.Chassi).toUpperCase()
      if (chassi) porChassi.set(chassi, [...(porChassi.get(chassi) || []), ag])
    }
    console.log(`[AgendamentoCRM] ${item.name}: ${linhas.length} agendamento(s)`)
  }
  return porChassi
}

// Map Atendimento_Codigo → { motivos, agendouAtivo, datas, operador } (RCR017 LISTAPORDATACONTATOENCERRAMENTO).
// motivos = MotivoEncerramento distintos do atendimento; agendouAtivo = contato com o registro do agendamento
// ("Serviços:" na descrição) feito por meio ativo (não Receptivo); datas/operador só p/ a conferência linha a linha.
async function lerContatos() {
  const porAtendimento = new Map()
  for (const item of await arquivosDoRelatorio(PASTA_CONTATOS, PREFIX_CONTATOS)) {
    const linhas = await baixarLinhas(item)
    for (const r of linhas) {
      const at = num(r.Atendimento_Codigo)
      if (at === null) continue
      const c = porAtendimento.get(at) || { motivos: new Set(), agendouAtivo: false, datas: [], operador: '', motivoFinal: '', motivoFinalEm: -1 }
      const motivo = txt(r.MotivoEncerramento)
      if (motivo) c.motivos.add(motivo)
      // Motivo final = o do contato mais recente que tem motivo (um por atendimento, p/ o quadro "Por que não agendaram").
      const quando = typeof r.AtendimentoContato_Data === 'number' ? r.AtendimentoContato_Data : 0
      if (motivo && quando >= c.motivoFinalEm) { c.motivoFinal = motivo; c.motivoFinalEm = quando }
      if (/Servi[cç]os:/i.test(txt(r.AtendimentoContato_Descricao)) && !/RECEPTIVO/i.test(txt(r.MeioContato_Descricao))) c.agendouAtivo = true
      const data = dataExcel(r.AtendimentoContato_Data)
      if (data) c.datas.push(data)
      if (!c.operador) c.operador = txt(r.Atendimento_UsuarioNom)
      porAtendimento.set(at, c)
    }
    console.log(`[AgendamentoCRM] ${item.name}: ${linhas.length} contato(s) do CRM`)
  }
  return porAtendimento
}

async function listar(caminho) {
  const driveId = process.env.SHAREPOINT_DRIVE_ID
  if (!driveId) throw new Error('SHAREPOINT_DRIVE_ID não configurado no ambiente')
  const itens = []
  let url = `/drives/${driveId}/root:${caminho}:/children?$top=200`
  while (url) {
    const r = await graphGet(url)
    itens.push(...(r.value || []))
    url = r['@odata.nextLink'] ? r['@odata.nextLink'].replace('https://graph.microsoft.com/v1.0', '') : null
  }
  return itens
}

export async function getCampanhasCrm() {
  if (_cache !== null && (Date.now() - _cacheTs) < CACHE_TTL_MS) return _cache

  const anos = (await listar(PASTA)).filter(i => i.folder)
  const rows = []
  const contatosVistos = new Set()
  const arquivosLidos = []
  let lastModified = null

  for (const ano of anos) {
    // Em ordem de data do nome do arquivo (depois pelo nome): se a mesma campanha foi exportada duas vezes,
    // vale o 1º arquivo (o de data mais antiga) e os contatos repetidos do outro são ignorados.
    const arquivos = (await listar(`${PASTA}/${ano.name}`))
      .filter(i => i.file && i.name?.toLowerCase().startsWith(PREFIX.toLowerCase()))
      // Arquivo sem data no nome vai por último (não pode "roubar" os contatos de uma campanha com data).
      .sort((a, b) => (infoDoNome(a.name).data || '9999').localeCompare(infoDoNome(b.name).data || '9999') || a.name.localeCompare(b.name))
      .filter(i => i['@microsoft.graph.downloadUrl'])
    // Download em paralelo; o processamento continua na ordem acima (importa para os repetidos).
    const conteudos = await baixarVarios(arquivos)
    for (const [idx, item] of arquivos.entries()) {
      const { sigla, data } = infoDoNome(item.name)
      const linhas = conteudos[idx]
      let n = 0
      let repetidos = 0
      for (const r of linhas) {
        const campanha = num(r.ID_Campanha_Execucao)
        if (campanha === null) continue // linha em branco no fim do arquivo
        // Cada contato da campanha (campanha + atendimento, ou cliente) conta uma vez em toda a pasta.
        const chaveContato = `${campanha}#${txt(r.id_atendimento) || `c${txt(r.ID_Cliente)}`}`
        if (contatosVistos.has(chaveContato)) { repetidos++; continue }
        contatosVistos.add(chaveContato)
        rows.push({
          arquivo: item.name,
          sigla,
          data,
          id_campanha_execucao: campanha,
          id_cliente: num(r.ID_Cliente),
          id_prospect: num(r.ID_Prospect),
          id_veiculo: num(r.id_veiculo),
          id_atendimento: num(r.id_atendimento),
          usuario: txt(r.nome_guerra),
          cancelado: txt(r.Cancelado).toUpperCase() === 'S',
          cliente: txt(r.nome),
          cidade: txt(r.descricao),
          uf: txt(r.id_uf),
          chassi: txt(r.Chassi),
          cpf_cnpj: txt(r['CPF/CPNJ']),
        })
        n++
      }
      arquivosLidos.push({ nome: item.name, sigla, data, linhas: n, repetidos })
      if (repetidos) console.warn(`[AgendamentoCRM] ${item.name}: ${repetidos} contato(s) repetido(s) de campanha já lida em outro arquivo — ignorados`)
      if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
      console.log(`[AgendamentoCRM] ${item.name}: ${n} contato(s)`)
    }
  }

  // Agendado = o chassi do contato distribuído tem agendamento do tipo Ativo no ROF037, do mesmo cliente,
  // criado da data da campanha até 30 dias depois, sem estar cancelado (CAN). Guarda o 1º agendamento
  // p/ os cards Vieram/Vão vir/No-show. A janela começa na data da campanha (nome do arquivo RCR038) e usa a
  // data de CRIAÇÃO do agendamento (AgendamentoHistorico_Data); a data de contato do RCR017 não entra — o cliente
  // costuma recusar no contato e agendar dias depois por fora do atendimento, e a data do contato "Serviços:"
  // nem sempre é a da criação. Assim bate com o Agendamento Realizado do Sintético do Dealer.net.
  // Contato (RCR017, pelo ID do atendimento): registrado = o atendimento aparece no relatório;
  // realizado = tem motivo de encerramento ou o agendamento registrado num contato ativo
  // (mesma conta do "Contato Realizado" do Resultado de Campanha Sintético do Dealer.net).
  const [agendamentos, contatos] = await Promise.all([lerAgendamentos(), lerContatos()])
  const ate = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
  for (const r of rows) {
    const limite = r.data ? ate(r.data, DIAS_CAMPANHA_AGENDAMENTO) : null
    r.agendamento = (agendamentos.get(r.chassi.toUpperCase()) || [])
      .filter(a => a.tipo === 'Ativo' && a.cliente === r.id_cliente && a.criado && r.data && a.criado >= r.data && a.criado <= limite && a.status !== 'CAN')
      .sort((a, b) => a.criado.localeCompare(b.criado))[0] || null
    const c = r.id_atendimento !== null ? contatos.get(r.id_atendimento) : null
    r.contato_registrado = !!c
    r.motivos = c ? [...c.motivos] : []
    r.motivo_final = c ? c.motivoFinal : ''
    r.contato_realizado = !!c && (c.motivos.size > 0 || c.agendouAtivo)
    const datas = c ? [...c.datas].sort() : []
    r.contato_primeiro = datas[0] || null
    r.contato_ultimo = datas[datas.length - 1] || null
    r.contato_qtde = datas.length
    r.operador = c ? c.operador : ''
  }

  _cache = { rows, arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}

// ── Passagens (Visão Geral) ──────────────────────────────────────────────────
// ROF001 "TODAS" (Relatório Geral OS): todas as O.S. do ano, de todas as unidades, com a situação de cada
// uma (Faturada, Encerrada, Em Andamento, Cancelada...). Passagem = O.S. pela Data Criacao; a tela
// desconsidera só as "Cancelada". Não há código interno da O.S. no arquivo: chave = empresa + número.
const PASTA_OS = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIX_OS = 'ROF001_OSAberta_Excel'

// Lê o ROF037 (fonte única dos agendamentos em todas as abas) uma vez e devolve:
//  - porOs: empresa#nºOS → tipo do agendamento (p/ classificar as passagens em ativo/passivo);
//  - agendamentos: lista de agendamentos (1 por agendamento) p/ a aba Por Data Agendamento e as consultas.
//    O ROF037 tem todos os status (FIM, NSW, AGE, CAN...) e várias linhas por agendamento quando há mais
//    de um serviço → dedup por empresa+cliente+data/hora+chassi.
async function lerAgendamentosServico() {
  const porOs = new Map()
  const agendamentos = []
  const vistos = new Map() // chave do agendamento → agendamento
  const chaveClienteHora = (cliente, dataHora) => `${cliente}|${typeof dataHora === 'number' ? Math.round(dataHora * 1440) : txt(dataHora)}`
  for (const item of await arquivosDoRelatorio(PASTA_AGENDAMENTOS, PREFIX_AGENDAMENTOS)) {
    for (const r of await baixarLinhas(item)) {
      const empresa = txt(r.EmpresaNome).toUpperCase()
      const os = txt(r.OSNumero)
      if (os && txt(r.AgendamentoTipo)) porOs.set(`${empresa}#${os}`, { tipo: txt(r.AgendamentoTipo), fonte: 'ROF037' })
      const ch = chaveClienteHora(txt(r.CodCliente), r.DtAgendamento)
      const chave = `${empresa}|${ch}|${txt(r.Chassi)}`
      const servico = txt(r.OficinaServico_TMODes)
      if (vistos.has(chave)) {
        // Mesmo agendamento em outra linha (um serviço por linha): só junta o serviço p/ a consulta.
        const ja = vistos.get(chave)
        if (servico && !ja.servicos.includes(servico)) ja.servicos.push(servico)
        continue
      }
      const ag = {
        empresa, data: dataExcel(r.DtAgendamento), status: txt(r.StatusAgendamento).toUpperCase(), tipo: txt(r.AgendamentoTipo), os: os || null, fonte: 'ROF037',
        // Detalhes só p/ a Consulta de agendamentos (aba Por Data Agendamento).
        criado: dataExcel(r.AgendamentoHistorico_Data), cod_cliente: num(r.CodCliente), cliente: txt(r.Cliente), chassi: txt(r.Chassi).toUpperCase(),
        placa: txt(r.Placa), modelo: txt(r.ModeloVeiculo), agendador: txt(r.Agendador), funcionario: txt(r.Funcionario),
        servicos: servico ? [servico] : [], obs: txt(r.OBSAgendamento), data_abertura: dataExcel(r.DataAbertura),
        data_cancelamento: dataExcel(r.DataCancelamento), motivo_cancelamento: txt(r.MotivoCancelamento),
      }
      vistos.set(chave, ag)
      agendamentos.push(ag)
    }
  }
  return { porOs, agendamentos }
}

let _cacheOs = null
let _cacheOsTs = 0
export function clearPassagensOsCache() { _cacheOs = null; _cacheOsTs = 0 }

export async function getPassagensOs() {
  if (_cacheOs !== null && (Date.now() - _cacheOsTs) < CACHE_TTL_MS) return _cacheOs
  const porChave = new Map()
  let lastModified = null
  for (const item of await arquivosDoRelatorio(PASTA_OS, PREFIX_OS)) {
    const linhas = await baixarLinhas(item)
    for (const r of linhas) {
      const empresa = txt(r.Empresa)
      const numero = txt(r['OS Numero'])
      const data = dataExcel(r['Data Criacao'])
      if (!empresa || !numero || !data) continue
      const chave = `${empresa}#${numero}`
      // Várias linhas por O.S. (uma por NF/produtivo), cada uma com a SUA parte dos valores: soma tudo.
      const ja = porChave.get(chave)
      if (ja) {
        ja.servico += numOuZero(r.Servico); ja.produto += numOuZero(r.Produto)
        ja.desconto += numOuZero(r.Desconto); ja.total += numOuZero(r.Total)
        continue
      }
      porChave.set(chave, {
        empresa,
        numero,
        data,
        situacao: txt(r['Situacao Tipo OS']),
        tipo_os: txt(r['Tipo OS Sigla']),
        chassi: txt(r['Veiculo Chassi']).toUpperCase(),
        consultor: txt(r['Consultor Nome']),
        agendador: txt(r.Agendador), // só informativo (Consulta de O.S.); quem diz se veio de agendamento é o ROF037
        servico: numOuZero(r.Servico),
        produto: numOuZero(r.Produto),
        desconto: numOuZero(r.Desconto),
        total: numOuZero(r.Total), // = produto + serviço − desconto
      })
    }
    if (!lastModified || item.lastModifiedDateTime > lastModified) lastModified = item.lastModifiedDateTime
    console.log(`[AgendamentoCRM] ${item.name}: ${linhas.length} linha(s) de O.S.`)
  }
  const { porOs: tipos, agendamentos } = await lerAgendamentosServico()
  for (const o of porChave.values()) {
    // O.S. que veio de agendamento = está no ROF037 com esse nº de O.S. (EmpresaNome + OSNumero); o tipo vem de lá.
    const t = tipos.get(`${o.empresa.toUpperCase()}#${o.numero}`)
    o.tipo_agendamento = t?.tipo || ''
    o.fonte_tipo_agendamento = t?.fonte || ''
  }

  _cacheOs = { rows: [...porChave.values()], agendamentos, lastModified, lidoEm: new Date().toISOString() }
  _cacheOsTs = Date.now()
  return _cacheOs
}
