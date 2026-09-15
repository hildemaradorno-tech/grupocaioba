// Diagrama inicial totalmente em branco (nenhum elemento, nem evento de início) e o rascunho
// pronto do processo piloto — Cancelamento e Devolução de NF-e — para carregar no Modelador BPMN
// e validar o motor de ponta a ponta sem precisar desenhar tudo do zero primeiro.

export const BPM_XML_VAZIO = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true" />
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`

// Condição de sequence flow neste motor: JSON simples {campo, operador, valor} no
// conditionExpression — ver src/services/bpm/bpmEngine.js.
const cond = (campo, operador, valor) => `<bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${JSON.stringify({ campo, operador, valor }).replace(/</g, '&lt;')}</bpmn:conditionExpression>`

export const BPM_PILOTO_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_Piloto" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Piloto" name="Cancelamento e Devolução de NF-e" isExecutable="true">
    <bpmn:startEvent id="StartEvent_Solicitacao" name="Solicitação de Cancelamento/Devolução">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>

    <bpmn:serviceTask id="ServiceTask_ValidarPrazo" name="Validação automática (prazo SEFAZ)">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:exclusiveGateway id="Gateway_Prazo" name="Dentro do prazo SEFAZ?">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3_sim</bpmn:outgoing>
      <bpmn:outgoing>Flow_3_nao</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:exclusiveGateway id="Gateway_PrazoJoin">
      <bpmn:incoming>Flow_3_sim</bpmn:incoming>
      <bpmn:incoming>Flow_3_nao</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:userTask id="UserTask_AnaliseFiscal" name="Análise Fiscal">
      <bpmn:incoming>Flow_4</bpmn:incoming>
      <bpmn:outgoing>Flow_5</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="UserTask_AprovacaoFinanceira" name="Aprovação Financeira (por alçada)">
      <bpmn:incoming>Flow_5</bpmn:incoming>
      <bpmn:outgoing>Flow_6</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:exclusiveGateway id="Gateway_Aprovado" name="Aprovado?">
      <bpmn:incoming>Flow_6</bpmn:incoming>
      <bpmn:outgoing>Flow_7_sim</bpmn:outgoing>
      <bpmn:outgoing>Flow_7_nao</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:userTask id="UserTask_ConferenciaEstoque" name="Conferência de Estoque">
      <bpmn:incoming>Flow_7_sim</bpmn:incoming>
      <bpmn:outgoing>Flow_8</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:userTask id="UserTask_ValidacaoGerencial" name="Validação Gerencial">
      <bpmn:incoming>Flow_8</bpmn:incoming>
      <bpmn:outgoing>Flow_9</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:exclusiveGateway id="Gateway_Integracao" name="Cancelamento ou devolução?">
      <bpmn:incoming>Flow_9</bpmn:incoming>
      <bpmn:outgoing>Flow_10_cancela</bpmn:outgoing>
      <bpmn:outgoing>Flow_10_devolve</bpmn:outgoing>
    </bpmn:exclusiveGateway>

    <bpmn:serviceTask id="ServiceTask_CancelamentoSefaz" name="Emitir Cancelamento na SEFAZ">
      <bpmn:incoming>Flow_10_cancela</bpmn:incoming>
      <bpmn:outgoing>Flow_11a</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:serviceTask id="ServiceTask_NfDevolucao" name="Emitir NF-e de Devolução">
      <bpmn:incoming>Flow_10_devolve</bpmn:incoming>
      <bpmn:outgoing>Flow_11b</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:serviceTask id="ServiceTask_AtualizarEstoque" name="Atualizar Estoque">
      <bpmn:incoming>Flow_11a</bpmn:incoming>
      <bpmn:incoming>Flow_11b</bpmn:incoming>
      <bpmn:outgoing>Flow_12</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:serviceTask id="ServiceTask_AtualizarFinanceiro" name="Atualizar Financeiro">
      <bpmn:incoming>Flow_12</bpmn:incoming>
      <bpmn:outgoing>Flow_13</bpmn:outgoing>
    </bpmn:serviceTask>

    <bpmn:endEvent id="EndEvent_Concluido" name="Concluído">
      <bpmn:incoming>Flow_13</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:endEvent id="EndEvent_Reprovado" name="Encerrado — Reprovado">
      <bpmn:incoming>Flow_7_nao</bpmn:incoming>
    </bpmn:endEvent>

    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_Solicitacao" targetRef="ServiceTask_ValidarPrazo" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="ServiceTask_ValidarPrazo" targetRef="Gateway_Prazo" />
    <bpmn:sequenceFlow id="Flow_3_sim" name="Sim" sourceRef="Gateway_Prazo" targetRef="Gateway_PrazoJoin">${cond('dentro_prazo_sefaz', 'true')}</bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_3_nao" name="Não" sourceRef="Gateway_Prazo" targetRef="Gateway_PrazoJoin" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_PrazoJoin" targetRef="UserTask_AnaliseFiscal" />
    <bpmn:sequenceFlow id="Flow_5" sourceRef="UserTask_AnaliseFiscal" targetRef="UserTask_AprovacaoFinanceira" />
    <bpmn:sequenceFlow id="Flow_6" sourceRef="UserTask_AprovacaoFinanceira" targetRef="Gateway_Aprovado" />
    <bpmn:sequenceFlow id="Flow_7_sim" name="Sim" sourceRef="Gateway_Aprovado" targetRef="UserTask_ConferenciaEstoque">${cond('aprovado_financeiro', 'true')}</bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_7_nao" name="Não" sourceRef="Gateway_Aprovado" targetRef="EndEvent_Reprovado" />
    <bpmn:sequenceFlow id="Flow_8" sourceRef="UserTask_ConferenciaEstoque" targetRef="UserTask_ValidacaoGerencial" />
    <bpmn:sequenceFlow id="Flow_9" sourceRef="UserTask_ValidacaoGerencial" targetRef="Gateway_Integracao" />
    <bpmn:sequenceFlow id="Flow_10_cancela" name="Dentro do prazo" sourceRef="Gateway_Integracao" targetRef="ServiceTask_CancelamentoSefaz">${cond('dentro_prazo_sefaz', 'true')}</bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_10_devolve" name="Fora do prazo" sourceRef="Gateway_Integracao" targetRef="ServiceTask_NfDevolucao" />
    <bpmn:sequenceFlow id="Flow_11a" sourceRef="ServiceTask_CancelamentoSefaz" targetRef="ServiceTask_AtualizarEstoque" />
    <bpmn:sequenceFlow id="Flow_11b" sourceRef="ServiceTask_NfDevolucao" targetRef="ServiceTask_AtualizarEstoque" />
    <bpmn:sequenceFlow id="Flow_12" sourceRef="ServiceTask_AtualizarEstoque" targetRef="ServiceTask_AtualizarFinanceiro" />
    <bpmn:sequenceFlow id="Flow_13" sourceRef="ServiceTask_AtualizarFinanceiro" targetRef="EndEvent_Concluido" />
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_Piloto">
    <bpmndi:BPMNPlane id="BPMNPlane_Piloto" bpmnElement="Process_Piloto">
      <bpmndi:BPMNShape id="StartEvent_Solicitacao_di" bpmnElement="StartEvent_Solicitacao"><dc:Bounds x="57" y="52" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_ValidarPrazo_di" bpmnElement="ServiceTask_ValidarPrazo"><dc:Bounds x="175" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Prazo_di" bpmnElement="Gateway_Prazo" isMarkerVisible="true"><dc:Bounds x="350" y="45" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_PrazoJoin_di" bpmnElement="Gateway_PrazoJoin" isMarkerVisible="true"><dc:Bounds x="500" y="45" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_AnaliseFiscal_di" bpmnElement="UserTask_AnaliseFiscal"><dc:Bounds x="625" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_AprovacaoFinanceira_di" bpmnElement="UserTask_AprovacaoFinanceira"><dc:Bounds x="775" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Aprovado_di" bpmnElement="Gateway_Aprovado" isMarkerVisible="true"><dc:Bounds x="950" y="45" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_ConferenciaEstoque_di" bpmnElement="UserTask_ConferenciaEstoque"><dc:Bounds x="1075" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_ValidacaoGerencial_di" bpmnElement="UserTask_ValidacaoGerencial"><dc:Bounds x="1225" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_Integracao_di" bpmnElement="Gateway_Integracao" isMarkerVisible="true"><dc:Bounds x="1400" y="45" width="50" height="50" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_CancelamentoSefaz_di" bpmnElement="ServiceTask_CancelamentoSefaz"><dc:Bounds x="1525" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_AtualizarEstoque_di" bpmnElement="ServiceTask_AtualizarEstoque"><dc:Bounds x="1675" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_AtualizarFinanceiro_di" bpmnElement="ServiceTask_AtualizarFinanceiro"><dc:Bounds x="1825" y="30" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Concluido_di" bpmnElement="EndEvent_Concluido"><dc:Bounds x="2007" y="52" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_Reprovado_di" bpmnElement="EndEvent_Reprovado"><dc:Bounds x="1107" y="192" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="ServiceTask_NfDevolucao_di" bpmnElement="ServiceTask_NfDevolucao"><dc:Bounds x="1525" y="170" width="100" height="80" /></bpmndi:BPMNShape>

      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="93" y="70" /><di:waypoint x="175" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="275" y="70" /><di:waypoint x="350" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_sim_di" bpmnElement="Flow_3_sim"><di:waypoint x="400" y="70" /><di:waypoint x="500" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_3_nao_di" bpmnElement="Flow_3_nao"><di:waypoint x="400" y="70" /><di:waypoint x="500" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_4_di" bpmnElement="Flow_4"><di:waypoint x="550" y="70" /><di:waypoint x="625" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_5_di" bpmnElement="Flow_5"><di:waypoint x="725" y="70" /><di:waypoint x="775" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_6_di" bpmnElement="Flow_6"><di:waypoint x="875" y="70" /><di:waypoint x="950" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_7_sim_di" bpmnElement="Flow_7_sim"><di:waypoint x="1000" y="70" /><di:waypoint x="1075" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_7_nao_di" bpmnElement="Flow_7_nao"><di:waypoint x="975" y="95" /><di:waypoint x="975" y="210" /><di:waypoint x="1107" y="210" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_8_di" bpmnElement="Flow_8"><di:waypoint x="1175" y="70" /><di:waypoint x="1225" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_9_di" bpmnElement="Flow_9"><di:waypoint x="1325" y="70" /><di:waypoint x="1400" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_10_cancela_di" bpmnElement="Flow_10_cancela"><di:waypoint x="1450" y="70" /><di:waypoint x="1525" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_10_devolve_di" bpmnElement="Flow_10_devolve"><di:waypoint x="1425" y="95" /><di:waypoint x="1425" y="210" /><di:waypoint x="1525" y="210" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_11a_di" bpmnElement="Flow_11a"><di:waypoint x="1625" y="70" /><di:waypoint x="1675" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_12_di" bpmnElement="Flow_12"><di:waypoint x="1775" y="70" /><di:waypoint x="1825" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_13_di" bpmnElement="Flow_13"><di:waypoint x="1925" y="70" /><di:waypoint x="2007" y="70" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_11b_di" bpmnElement="Flow_11b"><di:waypoint x="1625" y="210" /><di:waypoint x="1725" y="210" /><di:waypoint x="1725" y="110" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`

export const BPM_PILOTO_FORM_SCHEMAS = {
  StartEvent_Solicitacao: [
    { key: 'numero_nf', label: 'Número da NF-e', tipo: 'texto', obrigatorio: true },
    { key: 'tipo_nota', label: 'Tipo de Nota', tipo: 'selecao', opcoes: ['venda', 'compra'], obrigatorio: true },
    { key: 'tipo_devolucao', label: 'Devolução', tipo: 'selecao', opcoes: ['total', 'parcial'], obrigatorio: true },
    { key: 'valor_nf', label: 'Valor da NF-e (R$)', tipo: 'numero', obrigatorio: true },
    { key: 'motivo', label: 'Motivo do cancelamento/devolução', tipo: 'texto_longo', obrigatorio: true },
    { key: 'dentro_prazo_sefaz', label: 'Dentro do prazo de cancelamento SEFAZ?', tipo: 'booleano', obrigatorio: true },
  ],
  UserTask_AnaliseFiscal: [
    { key: 'parecer_fiscal', label: 'Parecer fiscal', tipo: 'texto_longo' },
  ],
  UserTask_AprovacaoFinanceira: [
    { key: 'aprovado_financeiro', label: 'Aprovado financeiramente?', tipo: 'booleano', obrigatorio: true },
    { key: 'observacao_financeiro', label: 'Observação', tipo: 'texto_longo' },
  ],
  UserTask_ConferenciaEstoque: [
    { key: 'estoque_conferido', label: 'Entrada/saída física conferida?', tipo: 'booleano' },
  ],
  UserTask_ValidacaoGerencial: [
    { key: 'parecer_gerencial', label: 'Parecer da gerência', tipo: 'texto_longo' },
  ],
}

export const BPM_PILOTO_ELEMENTOS_META = {
  ServiceTask_ValidarPrazo: { conector: 'validar_prazo_sefaz' },
  UserTask_AnaliseFiscal: { responsavel_papel: 'fiscal', prazo_horas: 24 },
  UserTask_AprovacaoFinanceira: { responsavel_papel: 'financeiro', prazo_horas: 24 },
  UserTask_ConferenciaEstoque: { responsavel_papel: 'estoque', prazo_horas: 24 },
  UserTask_ValidacaoGerencial: { responsavel_papel: 'gerencia', prazo_horas: 48 },
  ServiceTask_CancelamentoSefaz: { conector: 'emitir_cancelamento_sefaz' },
  ServiceTask_NfDevolucao: { conector: 'emitir_nf_devolucao' },
  ServiceTask_AtualizarEstoque: { conector: 'atualizar_estoque' },
  ServiceTask_AtualizarFinanceiro: { conector: 'atualizar_financeiro' },
}

export const BPM_PILOTO_DEFINICAO = {
  chave: 'cancelamento-devolucao-nfe',
  nome: 'Cancelamento e Devolução de NF-e',
  descricao: 'Processo piloto: cancelamento/devolução de nota fiscal de venda ou compra, com validação de prazo SEFAZ, aprovações e atualização de estoque/financeiro.',
  bpmnXml: BPM_PILOTO_BPMN_XML,
  formSchemas: BPM_PILOTO_FORM_SCHEMAS,
  elementosMeta: BPM_PILOTO_ELEMENTOS_META,
}
