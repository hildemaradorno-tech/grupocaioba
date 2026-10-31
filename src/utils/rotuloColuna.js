// Nome amigável das colunas do arquivo-fonte que aparecem somadas na calculadora da Regra da Comissão
// (ex.: "totalservico" -> "Total Serviço"); coluna desconhecida aparece como veio do arquivo.
const ROTULOS = { totalservico: 'Total Serviço', totalrevisao: 'Total Revisão', totalvenda: 'Total Venda', totaldevolucao: 'Total Devolução' }
export const rotuloColuna = (c) => ROTULOS[String(c || '').toLowerCase().trim()] || c
