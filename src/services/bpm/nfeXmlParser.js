// Extrai os campos usados pela tela de Cancelamento/Devolução de NF-e a partir do XML da nota
// (schema padrão da NF-e — <nfeProc>/<NFe>/<infNFe>). Só lê os campos que a tela precisa; não
// valida assinatura nem faz nenhuma chamada à SEFAZ, é só leitura do arquivo local.
export function parseNfeXml(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('Não foi possível ler este arquivo como XML.')
  }

  const texto = (el, tag) => el?.getElementsByTagName(tag)[0]?.textContent?.trim() || ''

  const infNFe = doc.getElementsByTagName('infNFe')[0]
  if (!infNFe) throw new Error('XML não parece ser de uma NF-e (não encontrei <infNFe>).')

  const ide = infNFe.getElementsByTagName('ide')[0]
  const dest = infNFe.getElementsByTagName('dest')[0]
  const total = infNFe.getElementsByTagName('total')[0]
  const icmsTot = total?.getElementsByTagName('ICMSTot')[0]

  const numero_nf = texto(ide, 'nNF')
  const cliente = texto(dest, 'xNome')
  const valorTexto = texto(icmsTot, 'vNF')
  const valor_nf = valorTexto ? Number(valorTexto) : ''

  // dhEmi (com hora, versões novas) ou dEmi (só data, versões antigas) — os dois vêm como
  // AAAA-MM-DD no início, então um corte de 10 caracteres funciona para ambos.
  const dataBruta = texto(ide, 'dhEmi') || texto(ide, 'dEmi')
  const data_nf = dataBruta ? dataBruta.slice(0, 10) : ''

  if (!numero_nf && !cliente && !valor_nf) {
    throw new Error('Não encontrei os dados esperados no XML (número, destinatário, valor).')
  }

  return { numero_nf, cliente, valor_nf, data_nf }
}

export function lerArquivoComoTexto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'))
    reader.readAsText(file, 'utf-8')
  })
}
