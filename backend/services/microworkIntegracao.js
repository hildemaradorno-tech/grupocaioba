/**
 * microworkIntegracao.js
 *
 * Integração com a API de terceiros do MicroWork Cloud (relatórios).
 * Requer a variável de ambiente MICROWORK_API_TOKEN (Bearer token).
 */

import axios from 'axios'

const API_URL = 'https://microworkcloud.com.br/api/integracao/terceiro'

export function isMicroworkConfigured() {
  return !!process.env.MICROWORK_API_TOKEN
}

function hojeISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

// Filtros do relatório "Garantias a Receber" (Honda). Data inicial é fixa (2020-01-01);
// data final é sempre a data atual no momento da chamada (1º acesso da tela e clique em "Atualizar").
function montarFiltrosGarantiasReceber() {
  return [
    'DocumentoCancelado=False',
    'AVista=False',
    'Especie=null',
    'Vendedor=null',
    'Origem=null',
    'QuantidadeParcelas=0',
    'Portador=199,148,599,449,499,649,549,399,299,249,150,349,149,1137,1217,1777,937,938,939,940,941,942,943,944,945,946,947,948,949,1135,1215,1778,597,497,1187,647,547,397,247,143,297,144,347,447,197,1107,142,1708',
    'Pessoa=null',
    'SomenteSemProvisao=True',
    'ComDocumentoFiscal=True',
    'Receita=null',
    'Modalidadedecobranca=null',
    'Municipio=null',
    'DataVencimento=',
    'Datademovimentacaoinicial=2020-01-01',
    'SituacaoCobrancaBancaria=False',
    `Datademovimentacaofinal=${hojeISO()}`,
    'Situacao=1',
    'Departamento=null',
    'SomenteComProvisao=True',
    'RelacaoComercial=null',
  ].join(';')
}

// Primeiro e último dia do mês/ano informado, no formato AAAA-MM-DD exigido pela API.
function primeiroUltimoDiaMes(ano, mes) {
  const primeiro = new Date(ano, mes - 1, 1)
  const ultimo = new Date(ano, mes, 0)
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { inicio: fmt(primeiro), fim: fmt(ultimo) }
}

// Consulta genérica, usada pelos relatórios cadastrados em dim_fontes_microwork (tela
// Fonte MicroWork, dentro de Regras de Comissões). O período (Periododeconclusaoinicial/
// Periododeconclusaofinal) é sempre o mês/ano escolhido na tela — dia 1 até o último dia do
// mês — e é concatenado aqui no backend, nunca guardado no cadastro.
export async function buscarRelatorioMicrowork({
  idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute, idrelatoriousuarioleiaute,
  ididioma, listaempresas, filtrosFixos, ano, mes,
}) {
  const token = process.env.MICROWORK_API_TOKEN
  if (!token) throw new Error('MICROWORK_API_TOKEN não configurado no ambiente')

  const { inicio, fim } = primeiroUltimoDiaMes(Number(ano), Number(mes))
  const filtrosBase = (filtrosFixos || '').trim().replace(/;+$/, '')
  const filtros = `${filtrosBase}${filtrosBase ? ';' : ''}Periododeconclusaoinicial=${inicio};Periododeconclusaofinal=${fim}`

  const payload = {
    idrelatorioconfiguracao,
    idrelatorioconsulta,
    idrelatorioconfiguracaoleiaute,
    idrelatoriousuarioleiaute,
    ididioma: ididioma ?? 1,
    listaempresas: listaempresas || [],
    filtros,
  }

  const response = await axios.post(API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 60_000,
  })
  return response.data
}

export async function buscarGarantiasReceberHonda() {
  const token = process.env.MICROWORK_API_TOKEN
  if (!token) throw new Error('MICROWORK_API_TOKEN não configurado no ambiente')

  const payload = {
    idrelatorioconfiguracao: 223,
    idrelatorioconsulta: 111,
    idrelatorioconfiguracaoleiaute: 223,
    idrelatoriousuarioleiaute: 926,
    ididioma: 1,
    listaempresas: [1, 2, 13, 4, 5, 6, 8, 9, 10, 11, 12, 16, 14, 15],
    filtros: montarFiltrosGarantiasReceber(),
  }

  const response = await axios.post(API_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 60_000,
  })
  return response.data
}
