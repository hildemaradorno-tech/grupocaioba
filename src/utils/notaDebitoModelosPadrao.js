// Modelos padrão criados a partir dos documentos de exemplo (Word) da Caiobá Trucks.
const SEC = 'background:#e5e7eb;border:1px solid #444;padding:5px 6px;font-weight:bold;font-size:12px;line-height:1.5;'
const LBL = 'font-size:12px;line-height:1.5;padding:4px 6px;border:1px solid #444;'

export const MODELOS_PADRAO = [
  {
    nome: 'Nota de Débito — G03 e G16',
    descricao: 'Modelo simples emitido pela concessionária (Campanha e G16).',
    tipos_codigos: 'G03,G16',
    conteudo_html: `<div style="font-family:Calibri,Arial,sans-serif;color:#111;padding:20px;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
    <div>{{logo}}</div>
    <div style="font-size:22px;font-weight:bold;">NOTA DE DÉBITO</div>
    <div style="font-size:12px;text-align:right;">Nº {{nota.numero}}<br/>{{nota.data_emissao}}</div>
  </div>
  <div style="border:1px solid #444;padding:8px 10px;font-size:13px;line-height:1.6;">
    <b>Concessionária:</b> {{empresa.razao_social}}<br/>
    <b>CNPJ:</b> {{empresa.cnpj}} &nbsp;&nbsp;&nbsp;&nbsp; <b>I.E:</b> {{empresa.ie}}<br/>
    <b>Endereço:</b> {{empresa.endereco}}, nº {{empresa.numero}} – {{empresa.bairro}} – CEP: {{empresa.cep}}<br/>
    <b>Cidade:</b> {{empresa.cidade}} – {{empresa.uf}}<br/>
    <b>Tel:</b> {{empresa.telefone}}
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;">
    <tr><td style="${LBL}width:35%;"><b>Processo:</b> {{garantia.processo}}</td><td style="${LBL}"><b>Status:</b> {{garantia.status}}</td></tr>
    <tr><td style="${LBL}"><b>Ordem de Serviço:</b> {{garantia.numero_os}}</td><td style="${LBL}"><b>Valor Total:</b> {{garantia.valor_total}}</td></tr>
    <tr><td style="${LBL}" colspan="2"><b>Cliente:</b> {{garantia.cliente}}</td></tr>
    <tr><td style="${LBL}" colspan="2"><b>Chassi:</b> {{garantia.chassi}}</td></tr>
  </table>
  <div style="margin-top:14px;border:1px solid #444;padding:8px 10px;font-size:13px;line-height:1.6;">
    <b>Dados Bancários:</b><br/>
    Banco: {{empresa.banco}}<br/>
    Agência: {{empresa.agencia}}<br/>
    Conta: {{empresa.conta}}
  </div>
</div>`,
  },
  {
    nome: 'Nota de Débito — G01, G02 e G04',
    descricao: 'Modelo formal endereçado à DAF Caminhões Brasil (Garantia normal, contrato e revisão gratuita).',
    tipos_codigos: 'G01,G02,G04',
    conteudo_html: `<div style="font-family:Calibri,Arial,sans-serif;color:#111;padding:20px;">
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="vertical-align:middle;">
        <div style="font-size:30px;line-height:1.2;font-weight:bold;">NOTA DE DÉBITO</div>
        <div style="font-size:15px;line-height:1.2;font-weight:bold;font-style:italic;margin-top:12px;">DEBIT NOTE</div>
      </td>
      <td style="width:200px;vertical-align:middle;text-align:right;">{{logo}}</td>
    </tr>
  </table>
  <div style="margin-top:14px;font-size:14px;font-weight:bold;line-height:1.75;">
    DAF CAMINHÕES BRASIL INDUSTRIA LTDA<br/>
    CNPJ: 13.114.506/0001-73 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; IE: 90.586.174-39<br/>
    Endereço: &nbsp;&nbsp;&nbsp; Rodovia PR 151 S/N Km 318 Leste, Bairro Boa Vista.<br/>
    Caixa Postal: 2033 &nbsp;&nbsp;&nbsp;&nbsp; CEP: &nbsp;&nbsp; 84062-980 &nbsp;&nbsp;&nbsp;&nbsp; Ponta Grossa - <span style="font-size:11px;">PR</span>
  </div>
  <div style="border-top:1px solid #111;margin-top:8px;"></div>

  <div style="${SEC}margin-top:12px;">Dados da Nota de Débito:</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="${LBL}width:50%;"><b>Número:</b></td><td style="${LBL}"><b>Data de emissão:</b> {{nota.data_emissao}}</td></tr>
  </table>

  <div style="${SEC}margin-top:14px;">Nome do Concessionário: <span style="font-weight:normal;">{{empresa.razao_social}}</span></div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="${LBL}width:50%;"><b>CNPJ:</b> {{empresa.cnpj}}</td><td style="${LBL}"><b>IE:</b> {{empresa.ie}}</td></tr>
    <tr><td style="${LBL}" colspan="2"><b>Endereço:</b> {{empresa.endereco_completo}}</td></tr>
    <tr><td style="${LBL}"><b>CEP:</b> {{empresa.cep}}</td><td style="${LBL}"><b>Cidade/UF:</b> {{empresa.cidade}} / {{empresa.uf}}</td></tr>
  </table>

  <div style="${SEC}margin-top:10px;">Dados do Processo de Garantia:</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="${LBL}"><b>Chassi:</b> {{garantia.chassi}}</td><td style="${LBL}"><b>Ordem de Serviço:</b> {{garantia.numero_os}}</td><td style="${LBL}"><b>Número da SG:</b> {{garantia.numero_sg}}</td></tr>
  </table>

  <div style="${SEC}margin-top:10px;">Dados da Nota Fiscal de Peças ao Cliente:</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="${LBL}"><b>Número:</b> {{nf.numero}}</td><td style="${LBL}"><b>Valor:</b> {{nf.valor}}</td><td style="${LBL}"><b>Data emissão:</b> {{nf.data}}</td></tr>
  </table>

  {{itens_tabela}}

  <div style="${SEC}margin-top:10px;">Dados do Cliente</div>
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="${LBL}"><b>Nome:</b> {{garantia.cliente}}</td><td style="${LBL}width:30%;"><b>Placa:</b> {{garantia.placa}}</td></tr>
  </table>

  <table style="width:100%;border-collapse:collapse;margin-top:14px;">
    <tr><td style="border:1px solid #444;padding:4px 6px;font-size:13px;line-height:1.4;font-weight:bold;background:#bfbfbf;">Assinatura do responsável da Concessionária:</td></tr>
    <tr><td style="border:1px solid #444;height:118px;vertical-align:bottom;padding:0 22px 26px 22px;">
      <div style="width:76%;margin:0 auto;border-top:1px solid #111;padding-top:2px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.3;font-weight:bold;">{{usuario.assinatura}}</div>
    </td></tr>
  </table>
</div>`,
  },
]
