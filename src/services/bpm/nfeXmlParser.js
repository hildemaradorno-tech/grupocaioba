// Extrai os campos usados pela tela de Cancelamento/Devolução de NF-e a partir do XML da nota.
// Reconhece dois formatos, já que a concessionária emite os dois:
//  - NF-e (nota de peça/produto, modelo 55): <nfeProc>/<NFe>/<infNFe>
//  - NFS-e/RPS (nota de serviço, padrão ABRASF): <GerarNfseEnvio>/<Rps>/<InfDeclaracaoPrestacaoServico>
// Só lê os campos que a tela precisa; não valida assinatura nem faz nenhuma chamada à
// SEFAZ/prefeitura, é só leitura do arquivo local.

function texto(el, tag) {
  return el?.getElementsByTagName(tag)[0]?.textContent?.trim() || ''
}

function parseNFe(infNFe) {
  const ide = infNFe.getElementsByTagName('ide')[0]
  const dest = infNFe.getElementsByTagName('dest')[0]
  const total = infNFe.getElementsByTagName('total')[0]
  const icmsTot = total?.getElementsByTagName('ICMSTot')[0]

  const numero_nf = texto(ide, 'nNF')
  const cliente = texto(dest, 'xNome')
  const cnpj_cliente = texto(dest, 'CNPJ') || texto(dest, 'CPF')
  const valorTexto = texto(icmsTot, 'vNF')
  const valor_nf = valorTexto ? Number(valorTexto) : ''
  const serie = texto(ide, 'serie')
  const natureza_operacao = texto(ide, 'natOp')
  // A chave de acesso (44 dígitos) vem no atributo Id do próprio <infNFe> ("NFe" + 44 dígitos) —
  // mais confiável que ler de <protNFe>, que só existe se o XML exportado incluir o protocolo de
  // autorização.
  const chave_acesso = (infNFe.getAttribute('Id') || '').replace(/^NFe/, '')
  const nota_referenciada = texto(ide, 'refNFe')

  // dhEmi (com hora, versões novas) ou dEmi (só data, versões antigas) — os dois vêm como
  // AAAA-MM-DD no início, então um corte de 10 caracteres funciona para ambos.
  const dataBruta = texto(ide, 'dhEmi') || texto(ide, 'dEmi')
  const data_nf = dataBruta ? dataBruta.slice(0, 10) : ''

  if (!numero_nf && !cliente && !valor_nf) {
    throw new Error('Não encontrei os dados esperados na NF-e (número, destinatário, valor).')
  }

  const itens = Array.from(infNFe.getElementsByTagName('det')).map(det => {
    const prod = det.getElementsByTagName('prod')[0]
    return {
      codigo: texto(prod, 'cProd'),
      descricao: texto(prod, 'xProd'),
      quantidade: Number(texto(prod, 'qCom') || 0),
      valorUnitario: Number(texto(prod, 'vUnCom') || 0),
      valorTotal: Number(texto(prod, 'vProd') || 0),
    }
  })

  // Uma NF-e de "venda por O.S." pode misturar linha de peça e de mão de obra na mesma nota —
  // não dá pra supor o tipo (peça/serviço/veículo) só pelo documento ser uma NF-e.
  return {
    numero_nf, cliente, cnpj_cliente, valor_nf, data_nf, serie, natureza_operacao, chave_acesso, nota_referenciada,
    itens, tipoDocumento: 'NF-e', tipoItemSugerido: null,
  }
}

function parseNfseRps(infDeclaracao) {
  const rps = infDeclaracao.getElementsByTagName('Rps')[0]
  const idRps = rps?.getElementsByTagName('IdentificacaoRps')[0]
  const tomador = infDeclaracao.getElementsByTagName('Tomador')[0]
  const idTomador = tomador?.getElementsByTagName('IdentificacaoTomador')[0]
  const servico = infDeclaracao.getElementsByTagName('Servico')[0]
  const valores = servico?.getElementsByTagName('Valores')[0]

  const numero_nf = texto(idRps, 'Numero')
  const cliente = texto(tomador, 'RazaoSocial')
  const cnpj_cliente = texto(idTomador, 'Cnpj') || texto(idTomador, 'Cpf')
  const valorTexto = texto(valores, 'ValorServicos')
  const valor_nf = valorTexto ? Number(valorTexto) : ''
  const dataBruta = texto(rps, 'DataEmissao')
  const data_nf = dataBruta ? dataBruta.slice(0, 10) : ''
  const discriminacao = texto(servico, 'Discriminacao')

  if (!numero_nf && !cliente && !valor_nf) {
    throw new Error('Não encontrei os dados esperados na NFS-e/RPS (número, tomador, valor).')
  }

  // NFS-e/RPS nesse padrão não discrimina item por item como a NF-e — é um único serviço por
  // nota — então vira um "item" só, usando a discriminação (texto livre) como descrição.
  const itens = valor_nf ? [{
    codigo: numero_nf, descricao: discriminacao || 'Serviço prestado', quantidade: 1, valorUnitario: valor_nf, valorTotal: valor_nf,
  }] : []

  return {
    numero_nf, cliente, cnpj_cliente, valor_nf, data_nf, serie: '', natureza_operacao: '', chave_acesso: '', nota_referenciada: '',
    itens, tipoDocumento: 'NFS-e', tipoItemSugerido: 'Serviço',
  }
}

export function parseNfeXml(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('Não foi possível ler este arquivo como XML.')
  }

  const infNFe = doc.getElementsByTagName('infNFe')[0]
  if (infNFe) return parseNFe(infNFe)

  const infDeclaracao = doc.getElementsByTagName('InfDeclaracaoPrestacaoServico')[0]
  if (infDeclaracao) return parseNfseRps(infDeclaracao)

  throw new Error('XML não reconhecido: esperava uma NF-e (<infNFe>) ou uma NFS-e/RPS (<InfDeclaracaoPrestacaoServico>).')
}

export function lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file, 'utf-8')
  })
}
