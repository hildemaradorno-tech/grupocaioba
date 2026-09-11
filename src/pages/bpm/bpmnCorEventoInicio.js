import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer'
import { attr as svgAttr } from 'tiny-svg'

const PRIORIDADE_ALTA = 1500
const PREENCHIMENTO = '#dcfce7'
const BORDA = '#15803d'

// Estiliza todo Evento de Início (bpmn:StartEvent) com um verde fixo — não mexe no XML nem cria
// entrada no undo, só troca a cor no desenho. Delega tudo o mais pro renderer padrão do bpmn-js.
class CorEventoInicioRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, PRIORIDADE_ALTA)
    this.bpmnRenderer = bpmnRenderer
  }

  canRender(element) {
    return !element.labelTarget && element.businessObject?.$type === 'bpmn:StartEvent'
  }

  drawShape(parentNode, element) {
    const circulo = this.bpmnRenderer.drawShape(parentNode, element)
    svgAttr(circulo, { fill: PREENCHIMENTO, stroke: BORDA })
    return circulo
  }

  getShapePath(element) {
    return this.bpmnRenderer.getShapePath(element)
  }
}

CorEventoInicioRenderer.$inject = ['eventBus', 'bpmnRenderer']

export const bpmnCorEventoInicioModule = {
  __init__: ['corEventoInicioRenderer'],
  corEventoInicioRenderer: ['type', CorEventoInicioRenderer],
}
