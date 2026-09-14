// Converte entre uma lista simples de etapas ({ nome, agrupamento_cargo_id, prazo_horas }) e um
// diagrama BPMN linear (Início → Tarefa 1 → Tarefa 2 → ... → Fim, sem gateways nem raias) —
// usado pela tela de Regras (src/pages/bpm/BpmRegras.jsx), que edita o processo como uma lista
// em vez de desenhar no canvas. O motor de execução (bpmEngine.js) não muda nada: continua lendo
// qualquer BPMN válido, desenhado à mão ou gerado aqui.
import { parseBpmnXml } from './bpmEngine'

const LARGURA_TAREFA = 100
const ALTURA_TAREFA = 80
const LARGURA_EVENTO = 36
const ESPACAMENTO = 150
const X_INICIAL = 60
const CENTRO_Y = 70

function escaparXml(texto) {
  return String(texto ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Gera um id estável e legível a partir do nome da etapa + posição (evita colisão entre etapas
// homônimas) — mantém o mesmo id entre salvamentos se nome e posição não mudarem, o que ajuda a
// não perder a referência em form_schemas/elementos_meta de uma etapa que só teve o cargo trocado.
function idDaEtapa(nome, indice) {
  const slug = String(nome || 'etapa').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '') || 'etapa'
  return `UserTask_${indice}_${slug}`
}

export function gerarBpmnLinear({ nome, etapas }) {
  const passos = etapas.filter(e => e.nome && e.nome.trim())
  const ids = passos.map((e, i) => idDaEtapa(e.nome, i + 1))

  const startId = 'StartEvent_1'
  const endId = 'EndEvent_1'

  const elementosXml = []
  const flowsXml = []
  const shapesXml = []
  const edgesXml = []

  const posX = (slot) => X_INICIAL + slot * ESPACAMENTO

  // Evento de início
  const flowInicioId = passos.length ? 'Flow_0' : null
  elementosXml.push(
    `<bpmn:startEvent id="${startId}" name="Solicitação recebida">${flowInicioId ? `<bpmn:outgoing>${flowInicioId}</bpmn:outgoing>` : ''}</bpmn:startEvent>`
  )
  shapesXml.push(`<bpmndi:BPMNShape id="${startId}_di" bpmnElement="${startId}"><dc:Bounds x="${posX(0)}" y="${CENTRO_Y - LARGURA_EVENTO / 2}" width="${LARGURA_EVENTO}" height="${LARGURA_EVENTO}" /></bpmndi:BPMNShape>`)

  passos.forEach((etapa, i) => {
    const taskId = ids[i]
    const incoming = i === 0 ? flowInicioId : `Flow_${i}`
    const outgoing = i === passos.length - 1 ? `Flow_${i + 1}` : `Flow_${i + 1}`
    elementosXml.push(
      `<bpmn:userTask id="${taskId}" name="${escaparXml(etapa.nome)}"><bpmn:incoming>${incoming}</bpmn:incoming><bpmn:outgoing>${outgoing}</bpmn:outgoing></bpmn:userTask>`
    )
    const slot = i + 1
    shapesXml.push(`<bpmndi:BPMNShape id="${taskId}_di" bpmnElement="${taskId}"><dc:Bounds x="${posX(slot)}" y="${CENTRO_Y - ALTURA_TAREFA / 2}" width="${LARGURA_TAREFA}" height="${ALTURA_TAREFA}" /></bpmndi:BPMNShape>`)
  })

  const flowFinalId = passos.length ? `Flow_${passos.length}` : null
  elementosXml.push(
    `<bpmn:endEvent id="${endId}" name="Concluído">${flowFinalId ? `<bpmn:incoming>${flowFinalId}</bpmn:incoming>` : ''}</bpmn:endEvent>`
  )
  const slotFim = passos.length + 1
  shapesXml.push(`<bpmndi:BPMNShape id="${endId}_di" bpmnElement="${endId}"><dc:Bounds x="${posX(slotFim)}" y="${CENTRO_Y - LARGURA_EVENTO / 2}" width="${LARGURA_EVENTO}" height="${LARGURA_EVENTO}" /></bpmndi:BPMNShape>`)

  // Sequence flows + edges, ligando: início -> tarefa 1 -> tarefa 2 -> ... -> fim
  const nos = [
    { id: startId, x: posX(0), w: LARGURA_EVENTO },
    ...passos.map((_, i) => ({ id: ids[i], x: posX(i + 1), w: LARGURA_TAREFA })),
    { id: endId, x: posX(slotFim), w: LARGURA_EVENTO },
  ]
  for (let i = 0; i < nos.length - 1; i++) {
    const origem = nos[i]
    const destino = nos[i + 1]
    const flowId = `Flow_${i}`
    flowsXml.push(`<bpmn:sequenceFlow id="${flowId}" sourceRef="${origem.id}" targetRef="${destino.id}" />`)
    edgesXml.push(`<bpmndi:BPMNEdge id="${flowId}_di" bpmnElement="${flowId}"><di:waypoint x="${origem.x + origem.w}" y="${CENTRO_Y}" /><di:waypoint x="${destino.x}" y="${CENTRO_Y}" /></bpmndi:BPMNEdge>`)
  }

  const bpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Regras" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Regras" name="${escaparXml(nome)}" isExecutable="true">
    ${elementosXml.join('\n    ')}
    ${flowsXml.join('\n    ')}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_Regras">
    <bpmndi:BPMNPlane id="BPMNPlane_Regras" bpmnElement="Process_Regras">
      ${shapesXml.join('\n      ')}
      ${edgesXml.join('\n      ')}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`

  const elementosMeta = {}
  passos.forEach((etapa, i) => {
    elementosMeta[ids[i]] = {
      responsavel_agrupamento_cargo_id: etapa.agrupamento_cargo_id || null,
      prazo_horas: etapa.prazo_horas || null,
    }
  })

  return { bpmnXml, elementosMeta }
}

// Tenta ler um BPMN existente de volta como lista de etapas — só funciona pra diagramas
// "simples" (uma tarefa de usuário atrás da outra, sem gateway/raia/tarefa de serviço). Se o
// diagrama tiver algo mais elaborado (foi editado no Modelador visual), devolve ok:false — a
// tela de Regras não tenta adivinhar, só avisa que precisa editar no modo avançado.
export async function tentarExtrairEtapas({ bpmnXml, elementosMeta }) {
  try {
    const { process } = await parseBpmnXml(bpmnXml)
    const inicio = (process.flowElements || []).find(el => el.$type === 'bpmn:StartEvent')
    if (!inicio) return { ok: false, motivo: 'Diagrama sem evento de início.' }

    const etapas = []
    let atual = inicio
    let guarda = 0
    while (atual && guarda < 200) {
      guarda++
      const saidas = atual.outgoing || []
      if (saidas.length > 1) return { ok: false, motivo: 'Este processo tem um ponto de decisão (gateway) — abra no Modelador visual pra editar.' }
      const proximo = saidas[0]?.targetRef
      if (!proximo) break
      if (proximo.$type === 'bpmn:EndEvent') { atual = null; break }
      if (proximo.$type !== 'bpmn:UserTask') {
        return { ok: false, motivo: `Este processo tem um elemento (${proximo.$type?.replace('bpmn:', '')}) que a tela de Regras não edita — abra no Modelador visual.` }
      }
      const meta = (elementosMeta || {})[proximo.id] || {}
      etapas.push({
        nome: proximo.name || '',
        agrupamento_cargo_id: meta.responsavel_agrupamento_cargo_id || null,
        prazo_horas: meta.prazo_horas || null,
      })
      atual = proximo
    }
    return { ok: true, etapas }
  } catch (e) {
    return { ok: false, motivo: e.message || String(e) }
  }
}
