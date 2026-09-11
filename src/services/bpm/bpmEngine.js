// Motor de execução do BPM — interpreta o BPMN 2.0 publicado e avança a instância.
//
// Escopo desta primeira versão (documentado para quem for evoluir depois):
//  - Suporta: evento de início, evento de fim, tarefa humana (user task), tarefa de serviço
//    (service task, via conector registrado) e gateway exclusivo (XOR).
//  - Gateway paralelo/inclusivo, subprocessos e eventos intermediários (timer/mensagem/erro)
//    ainda não são interpretados — um elemento desses interrompe o fluxo como "não suportado"
//    (a instância cai em pendência manual) em vez de travar silenciosamente.
//  - A condição de um sequence flow saindo de um gateway é um JSON simples no
//    conditionExpression do BPMN: {"campo":"valor_nf","operador":">","valor":50000}. Não é FEEL
//    nem JS livre — é avaliado por um comparador fixo, para não precisar de um interpretador de
//    expressões nem correr risco de executar código arbitrário.
import { BpmnModdle } from 'bpmn-moddle'
import { BPM_CONNECTORS } from './bpmConnectors'

const moddle = new BpmnModdle()

export const BPM_TERMINAL = {
  PAUSA_TAREFA: 'pausa_tarefa',
  FIM: 'fim',
  PENDENCIA: 'pendencia_manual',
}

export async function parseBpmnXml(bpmnXml) {
  const { rootElement } = await moddle.fromXML(bpmnXml)
  const process = (rootElement.rootElements || []).find(el => el.$type === 'bpmn:Process')
  if (!process) throw new Error('Diagrama sem elemento <bpmn:Process>.')
  const byId = new Map()
  ;(process.flowElements || []).forEach(el => byId.set(el.id, el))
  return { process, byId }
}

export function findStartEvent(process) {
  return (process.flowElements || []).find(el => el.$type === 'bpmn:StartEvent')
}

// Acha o id da raia (bpmn:Lane) que contém um elemento, se houver — usado pra herdar o
// agrupamento de cargo responsável da raia quando a tarefa não define o dela por conta própria.
export function encontrarLaneDoElemento(elementoId, process) {
  for (const laneSet of process.laneSets || []) {
    for (const lane of laneSet.lanes || []) {
      const refs = (lane.flowNodeRef || []).map(r => (typeof r === 'string' ? r : r.id))
      if (refs.includes(elementoId)) return lane.id
    }
  }
  return null
}

function avaliarCondicao(condBody, dados) {
  if (!condBody) return true
  let cond
  try { cond = JSON.parse(condBody) } catch { return false }
  const v = dados ? dados[cond.campo] : undefined
  switch (cond.operador) {
    case '>': return Number(v) > Number(cond.valor)
    case '>=': return Number(v) >= Number(cond.valor)
    case '<': return Number(v) < Number(cond.valor)
    case '<=': return Number(v) <= Number(cond.valor)
    case '==': return String(v) === String(cond.valor)
    case '!=': return String(v) !== String(cond.valor)
    case 'true': return v === true
    case 'false': return v === false || v === undefined || v === null
    default: return false
  }
}

function proximoFluxo(element, dados) {
  const flows = element.outgoing || []
  if (flows.length <= 1) return flows[0] || null
  const comCondicao = flows.filter(f => f.conditionExpression && f.conditionExpression.body)
  const semCondicao = flows.filter(f => !(f.conditionExpression && f.conditionExpression.body))
  for (const f of comCondicao) {
    if (avaliarCondicao(f.conditionExpression.body, dados)) return f
  }
  return semCondicao[0] || null
}

const TIPOS_SUPORTADOS_AUTOMATICOS = new Set(['bpmn:StartEvent', 'bpmn:ServiceTask', 'bpmn:ExclusiveGateway'])

async function caminhar(elementoInicial, dadosIniciais, elementosMeta) {
  let current = elementoInicial
  let dados = { ...dadosIniciais }
  const log = []

  while (current) {
    if (current.$type === 'bpmn:UserTask') {
      return { tipo: BPM_TERMINAL.PAUSA_TAREFA, elemento: current, log, dados }
    }
    if (current.$type === 'bpmn:EndEvent') {
      log.push({ elementId: current.id, nome: current.name || null, tipo: 'fim' })
      return { tipo: BPM_TERMINAL.FIM, elemento: current, log, dados }
    }
    if (!TIPOS_SUPORTADOS_AUTOMATICOS.has(current.$type)) {
      return {
        tipo: BPM_TERMINAL.PENDENCIA,
        elemento: current,
        log,
        dados,
        motivo: `Elemento "${current.$type.replace('bpmn:', '')}" ainda não é interpretado pelo motor nesta versão.`,
      }
    }

    if (current.$type === 'bpmn:ServiceTask') {
      const meta = (elementosMeta || {})[current.id] || {}
      const conector = BPM_CONNECTORS[meta.conector]
      const resultado = conector ? await conector({ dados }) : {}
      dados = { ...dados, ...resultado }
      log.push({ elementId: current.id, nome: current.name || null, tipo: 'servico', conector: meta.conector || null, resultado })
    } else if (current.$type === 'bpmn:StartEvent') {
      log.push({ elementId: current.id, nome: current.name || null, tipo: 'inicio' })
    }
    // bpmn:ExclusiveGateway: nada a executar, só decidir a próxima ligação abaixo

    const next = proximoFluxo(current, dados)
    if (!next) {
      return {
        tipo: BPM_TERMINAL.PENDENCIA,
        elemento: current,
        log,
        dados,
        motivo: 'Sem fluxo de saída válido a partir deste ponto (confira as condições dos gateways).',
      }
    }
    current = next.targetRef
  }
  return { tipo: BPM_TERMINAL.PENDENCIA, log, dados, motivo: 'Fluxo interrompido sem elemento seguinte.' }
}

export async function iniciarFluxo({ process, dados, elementosMeta }) {
  const start = findStartEvent(process)
  if (!start) return { tipo: BPM_TERMINAL.PENDENCIA, log: [], dados, motivo: 'O diagrama não tem um evento de início.' }
  return caminhar(start, dados, elementosMeta)
}

export async function continuarAposTarefa({ byId, elementoTarefaId, dados, elementosMeta }) {
  const tarefaEl = byId.get(elementoTarefaId)
  if (!tarefaEl) return { tipo: BPM_TERMINAL.PENDENCIA, log: [], dados, motivo: 'Elemento da tarefa não encontrado no diagrama publicado.' }
  const next = proximoFluxo(tarefaEl, dados)
  if (!next) return { tipo: BPM_TERMINAL.PENDENCIA, log: [], dados, motivo: 'Sem fluxo de saída definido após esta tarefa.' }
  return caminhar(next.targetRef, dados, elementosMeta)
}
