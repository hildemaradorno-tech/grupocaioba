import * as XLSX from 'xlsx'
import axios from 'axios'
import { graphGet } from './graphClient.js'

// Campanhas CRM de agendamento (Dealer.net RCR038). Cada ano tem sua subpasta (ex: ".../CAMPANHA CRM/2026")
// e cada arquivo é uma execução de campanha de uma unidade: "RCR038_CampanhaCRM_Clientes_Excel CGR 20261019.xls"
// — a sigla da unidade e a data vêm do NOME do arquivo (a planilha não traz nenhuma das duas).
const RAIZ = '/Banco de Dados - DAF - Pós-Vendas/Agendamentos - CRM'
const PASTA = `${RAIZ}/CAMPANHA CRM`
const PREFIX = 'RCR038_CampanhaCRM_Clientes_Excel'
// Contatos de cada atendimento (RCR017), ligados à campanha por Atendimento_Codigo = id_atendimento do RCR038.
// A pasta tem duas versões do mesmo relatório, por ano: "RCR017_LISTAPORDATACONTATO 2026" (filtrado pela data
// do contato — inclui contatos ainda sem encerramento) e "RCR017_LISTAPORDATAENCERRAMENTO 2026" (pela data de
// encerramento). Lê as duas e conta cada contato (AtendimentoContato_Codigo) uma vez só.
const PASTA_CONTATOS = `${RAIZ}/LISTA POR DATA CONTATO_ENCERRAMENTO`
const PREFIX_CONTATOS = 'RCR017_LISTAPORDATA'
// Agendamentos de serviço (ROF037). Liga com o contato da campanha pelo CHASSI, considerando só os
// agendamentos criados a partir da data da campanha (o relatório não traz o atendimento do CRM).
const PASTA_AGENDAMENTOS = `${RAIZ}/AGENDAMENTO SERVICOS`
const PREFIX_AGENDAMENTOS = 'ROF037_AGENDAMENTOSERVICO'
// Encerramentos que significam que NÃO houve contato com o cliente.
const MOTIVOS_SEM_CONTATO = ['S00', 'S01'] // finalizado sem contato / telefones incorretos

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

async function baixarLinhas(item) {
  const resp = await axios.get(item['@microsoft.graph.downloadUrl'], { responseType: 'arraybuffer', timeout: 60_000 })
  const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' })
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
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

// RCR017: mapa Atendimento_Codigo → contatos (aba Por Campanhas).
async function lerContatos() {
  const porAtendimento = new Map()
  const vistos = new Set() // AtendimentoContato_Codigo já lido (o mesmo contato está nos dois arquivos)
  // Sem a pasta (ou sem arquivo RCR017) a aba Por Campanhas continua funcionando: devolve null e a tela
  // mostra "—" nos números que dependem do contato realizado.
  let itens
  try {
    itens = await arquivosDoRelatorio(PASTA_CONTATOS, PREFIX_CONTATOS)
  } catch (e) {
    console.warn(`[AgendamentoCRM] pasta de contatos (RCR017) indisponível: ${e.message}`)
    return null
  }
  if (itens.length === 0) return null
  for (const item of itens) {
    const linhas = await baixarLinhas(item)
    for (const r of linhas) {
      const at = num(r.Atendimento_Codigo)
      if (at === null) continue
      const codContato = txt(r.AtendimentoContato_Codigo)
      if (codContato) {
        if (vistos.has(codContato)) continue
        vistos.add(codContato)
      }
      const motivo = txt(r.MotivoEncerramento)
      const contato = {
        data: dataExcel(r.AtendimentoContato_Data),
        resultado: txt(r.AtendimentoContato_Resultado),
        motivo,
        meio: txt(r.MeioContato_Descricao),
        sem_contato: MOTIVOS_SEM_CONTATO.some(c => motivo.toUpperCase().startsWith(c)),
      }
      const lista = porAtendimento.get(at) || []
      lista.push(contato)
      porAtendimento.set(at, lista)
    }
    console.log(`[AgendamentoCRM] ${item.name}: ${linhas.length} contato(s) de atendimento`)
  }
  return porAtendimento
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
      }
      const chassi = txt(r.Chassi).toUpperCase()
      if (chassi) porChassi.set(chassi, [...(porChassi.get(chassi) || []), ag])
    }
    console.log(`[AgendamentoCRM] ${item.name}: ${linhas.length} agendamento(s)`)
  }
  return porChassi
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
    for (const item of arquivos) {
      const downloadUrl = item['@microsoft.graph.downloadUrl']
      if (!downloadUrl) continue
      const { sigla, data } = infoDoNome(item.name)
      const resp = await axios.get(downloadUrl, { responseType: 'arraybuffer', timeout: 60_000 })
      const wb = XLSX.read(Buffer.from(resp.data), { type: 'buffer' })
      const linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })
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

  // Contato realizado = o atendimento da campanha tem ao menos 1 contato no RCR017 que não seja
  // encerramento "sem contato" (S00/S01). Encerrado = último contato tem motivo de encerramento.
  const contatos = await lerContatos()
  const semContatos = contatos === null
  for (const r of rows) {
    const lista = (!semContatos && r.id_atendimento !== null && contatos.get(r.id_atendimento)) || []
    const validos = lista.filter(c => !c.sem_contato)
    const ultimo = [...lista].sort((a, b) => (a.data || '').localeCompare(b.data || '')).pop() || null
    r.qtd_contatos = lista.length
    r.contato_realizado = validos.length > 0
    r.data_contato = validos.map(c => c.data).filter(Boolean).sort()[0] || null
    r.motivo_encerramento = ultimo?.motivo || ''
  }

  // Contato agendado = contato realizado cujo chassi tem agendamento (ROF037) criado na data da
  // campanha ou depois, sem estar cancelado (CAN). Guarda o 1º agendamento p/ os cards de situação.
  const agendamentos = await lerAgendamentos()
  for (const r of rows) {
    const doChassi = (agendamentos.get(r.chassi.toUpperCase()) || [])
      .filter(a => a.criado && r.data && a.criado >= r.data && a.status !== 'CAN')
      .sort((a, b) => a.criado.localeCompare(b.criado))
    r.agendamento = r.contato_realizado ? (doChassi[0] || null) : null
    r.contato_agendado = !!r.agendamento
  }

  _cache = { rows, semContatos, arquivos: arquivosLidos, lastModified, lidoEm: new Date().toISOString() }
  _cacheTs = Date.now()
  return _cache
}

// ── Passagens (Visão Geral) ──────────────────────────────────────────────────
// ROF001 "TODAS" (Relatório Geral OS): todas as O.S. do ano, de todas as unidades, com a situação de cada
// uma (Faturada, Encerrada, Em Andamento, Cancelada...). Passagem = O.S. pela Data Criacao; a tela
// desconsidera só as "Cancelada". Não há código interno da O.S. no arquivo: chave = empresa + número.
const PASTA_OS = '/Banco de Dados - DAF - Pós-Vendas/Relatório Geral OS'
const PREFIX_OS = 'ROF001_OSAberta_Excel'

// Tipo do agendamento que gerou a O.S. (Ativo / Receptivo / Presencial / Internet), por empresa + nº da O.S.
// 1ª fonte: ROF037 (AgendamentoTipo). 2ª fonte: ROF026 Clientes Agendados — tem agendamentos que faltam
// no ROF037 (ex: os do SYONET); a empresa vem por código e o tipo por letra.
const PASTA_CLIENTES_AGENDADOS = `${RAIZ}/CLIENTES AGENDADOS`
const PREFIX_CLIENTES_AGENDADOS = 'ROF026_CLIENTEAGENDADO'
const EMPRESA_POR_CODIGO = { 1: 'CAIOBA TRUCKS - CAMPO GRANDE', 2: 'CAIOBA TRUCKS - DOURADOS', 12: 'CAIOBA TRUCKS - TRES LAGOAS', 13: 'CAIOBA TRUCKS - CHAPADAO' }
const TIPO_POR_LETRA = { A: 'Ativo', R: 'Receptivo', P: 'Presencial', I: 'Internet' }

// Lê ROF037 e ROF026 uma vez e devolve:
//  - porOs: empresa#nºOS → tipo do agendamento (p/ classificar as passagens em ativo/passivo);
//  - agendamentos: lista de agendamentos (1 por agendamento) p/ a Conversão agendamento → O.S.
//    Base = ROF037 (tem todos os status: FIM, NSW, AGE, CAN...; várias linhas por agendamento quando há
//    mais de um serviço → dedup por empresa+cliente+data/hora+chassi), mais os do ROF026 que faltam no
//    ROF037 (casados por cliente + data/hora do agendamento).
async function lerAgendamentosServico() {
  const porOs = new Map()
  const agendamentos = []
  const vistos = new Set()
  const chaveClienteHora = (cliente, dataHora) => `${cliente}|${typeof dataHora === 'number' ? Math.round(dataHora * 1440) : txt(dataHora)}`
  const clienteHora37 = new Set()
  for (const item of await arquivosDoRelatorio(PASTA_AGENDAMENTOS, PREFIX_AGENDAMENTOS)) {
    for (const r of await baixarLinhas(item)) {
      const empresa = txt(r.EmpresaNome).toUpperCase()
      const os = txt(r.OSNumero)
      if (os && txt(r.AgendamentoTipo)) porOs.set(`${empresa}#${os}`, { tipo: txt(r.AgendamentoTipo), fonte: 'ROF037' })
      const ch = chaveClienteHora(txt(r.CodCliente), r.DtAgendamento)
      clienteHora37.add(ch)
      const chave = `${empresa}|${ch}|${txt(r.Chassi)}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      agendamentos.push({ empresa, data: dataExcel(r.DtAgendamento), status: txt(r.StatusAgendamento).toUpperCase(), tipo: txt(r.AgendamentoTipo), os: os || null, fonte: 'ROF037' })
    }
  }
  for (const item of await arquivosDoRelatorio(PASTA_CLIENTES_AGENDADOS, PREFIX_CLIENTES_AGENDADOS)) {
    for (const r of await baixarLinhas(item)) {
      const empresa = EMPRESA_POR_CODIGO[num(r.Agendamento_EmpresaCod)]
      const tipo = TIPO_POR_LETRA[txt(r.Agendamento_Tipo).toUpperCase()]
      const os = txt(r.OficinaServico_OSNumero)
      if (!empresa) continue
      if (os && tipo && !porOs.has(`${empresa}#${os}`)) porOs.set(`${empresa}#${os}`, { tipo, fonte: 'ROF026' })
      if (clienteHora37.has(chaveClienteHora(txt(r.Agendamento_PessoaCod), r.Agendamento_Data))) continue
      agendamentos.push({ empresa, data: dataExcel(r.Agendamento_Data), status: txt(r.Agendamento_Status).toUpperCase(), tipo: tipo || '', os: os || null, fonte: 'ROF026' })
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
        agendador: txt(r.Agendador), // preenchido = O.S. veio de agendamento (bate com o ROF037)
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
    // O.S. que veio de agendamento = está no ROF037 (ou ROF026) com esse nº de O.S.; o tipo vem de lá.
    // Agendador preenchido sem estar nos relatórios de agendamento = "sem tipo" (aviso na tela).
    const t = tipos.get(`${o.empresa.toUpperCase()}#${o.numero}`)
    o.tipo_agendamento = t?.tipo || ''
    o.fonte_tipo_agendamento = t?.fonte || ''
  }

  _cacheOs = { rows: [...porChave.values()], agendamentos, lastModified, lidoEm: new Date().toISOString() }
  _cacheOsTs = Date.now()
  return _cacheOs
}
