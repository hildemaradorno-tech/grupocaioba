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
