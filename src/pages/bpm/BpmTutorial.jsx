import React, { useEffect, useState, useCallback } from 'react'
import { X, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react'

// Tour guiado, passo a passo: destaca um elemento da tela (via seletor CSS) com um "spotlight"
// e mostra uma caixinha de explicação ao lado. Cada passo só avança quando a pessoa clica em
// "Próximo" — não tenta adivinhar se ela realmente fez a ação (mais simples e não trava se ela
// fizer algo um pouco diferente do esperado).
export default function BpmTutorial({ steps, aberto, onFechar }) {
  const [passo, setPasso] = useState(0)
  const [rect, setRect] = useState(null)

  const atual = steps[passo]

  const medir = useCallback(() => {
    if (!atual?.seletor) { setRect(null); return }
    const el = document.querySelector(atual.seletor)
    if (!el) { setRect(null); return }
    setRect(el.getBoundingClientRect())
  }, [atual])

  useEffect(() => {
    if (!aberto) return
    medir()
    window.addEventListener('resize', medir)
    const intervalo = setInterval(medir, 300) // paleta/canvas podem mudar de posição com scroll/zoom
    return () => { window.removeEventListener('resize', medir); clearInterval(intervalo) }
  }, [aberto, medir])

  useEffect(() => { if (aberto) setPasso(0) }, [aberto])

  if (!aberto || !atual) return null

  const ultimo = passo === steps.length - 1
  const pad = 6

  // Posição da caixa de texto: perto do elemento destacado (embaixo, ou em cima se não couber),
  // ou centralizada na tela quando o passo não aponta pra nada específico (boas-vindas/fechamento).
  let caixaEstilo = { position: 'fixed', zIndex: 10000, maxWidth: 300 }
  if (rect) {
    const espacoAbaixo = window.innerHeight - rect.bottom
    if (espacoAbaixo > 180) {
      caixaEstilo.top = rect.bottom + 12
    } else {
      caixaEstilo.bottom = window.innerHeight - rect.top + 12
    }
    caixaEstilo.left = Math.min(Math.max(rect.left, 16), window.innerWidth - 316)
  } else {
    caixaEstilo.top = '50%'; caixaEstilo.left = '50%'; caixaEstilo.transform = 'translate(-50%, -50%)'
  }

  return (
    <>
      {rect ? (
        <div
          style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none',
            top: rect.top - pad, left: rect.left - pad,
            width: rect.width + pad * 2, height: rect.height + pad * 2,
            borderRadius: 8,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.6)',
            border: '2px solid #6366f1',
            transition: 'top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease',
          }}
        />
      ) : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,0.6)' }} />
      )}

      <div style={caixaEstilo} className="bg-white rounded-xl shadow-2xl border border-slate-200 p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Passo {passo + 1} de {steps.length}</span>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="h-3.5 w-3.5" /></button>
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">{atual.titulo}</h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{atual.texto}</p>
        <div className="flex items-center justify-between gap-2">
          <button onClick={onFechar} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">Pular tutorial</button>
          <div className="flex items-center gap-1.5">
            {passo > 0 && (
              <button onClick={() => setPasso(p => p - 1)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100">
                <ArrowLeftIcon className="h-3 w-3" /> Voltar
              </button>
            )}
            <button
              onClick={() => ultimo ? onFechar() : setPasso(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {ultimo ? 'Concluir' : 'Próximo'} {!ultimo && <ArrowRight className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Passos do tour do Modelador BPMN — seletores batem com os data-action da paleta do bpmn-js
// (estáveis, vêm do próprio bpmn-js) e com os data-tour que eu adicionei nos botões da toolbar
// e no painel de propriedades do BpmModelador.jsx.
export const BPM_TOUR_STEPS = [
  {
    titulo: 'Bem-vindo ao Modelador BPMN',
    texto: 'Aqui você desenha o passo a passo de um processo (tipo um fluxograma). Vou te mostrar rapidinho os elementos principais — leva menos de 2 minutos.',
  },
  {
    seletor: '.bpm-modelador-canvas .djs-palette [data-action="create.start-event"]',
    titulo: 'Evento de Início',
    texto: 'Clique aqui e depois em um ponto do canvas para criar o início do processo. Todo processo precisa começar com um evento desses — só pode ter um.',
  },
  {
    seletor: '.bpm-modelador-canvas .djs-palette [data-action="create.task"]',
    titulo: 'Tarefa',
    texto: 'Clique aqui pra criar uma tarefa — um passo do processo. Depois de criada, selecione ela e use o menu que aparece do lado (ícone de lista) pra escolher o tipo: "Tarefa de Usuário" (alguém precisa preencher/decidir) ou "Tarefa de Serviço" (automática, o sistema faz sozinho).',
  },
  {
    seletor: '.bpm-modelador-canvas .djs-palette [data-action="create.exclusive-gateway"]',
    titulo: 'Gateway (ponto de decisão)',
    texto: 'Use um gateway quando o processo precisar seguir por caminhos diferentes dependendo de uma condição — por exemplo, "foi aprovado?" sim ou não.',
  },
  {
    seletor: '.bpm-modelador-canvas .djs-palette [data-action="create.end-event"]',
    titulo: 'Evento de Fim',
    texto: 'Marca onde o processo termina. Um processo pode ter mais de um fim — por exemplo, um para "aprovado" e outro para "reprovado".',
  },
  {
    seletor: '.bpm-modelador-canvas .djs-palette [data-action="global-connect-tool"]',
    titulo: 'Conectar elementos',
    texto: 'Clique aqui e depois arraste de um elemento até outro para ligá-los na ordem certa. Sem essa ligação, o motor não sabe qual é o próximo passo.',
  },
  {
    seletor: '[data-tour="painel-propriedades"]',
    titulo: 'Painel de propriedades',
    texto: 'Ao selecionar um elemento no diagrama, esse painel muda: aqui você define o responsável e o prazo de uma tarefa, os campos do formulário que a pessoa vai preencher, ou a condição de um gateway.',
  },
  {
    seletor: '[data-tour="btn-salvar"]',
    titulo: 'Salvar',
    texto: 'Salva o que você montou como rascunho. Pode fechar e continuar depois — nada se perde.',
  },
  {
    seletor: '[data-tour="btn-publicar"]',
    titulo: 'Publicar',
    texto: 'Quando estiver pronto, publique. Só processos publicados podem ser usados pra criar solicitações de verdade.',
  },
  {
    seletor: '[data-tour="btn-exemplo"]',
    titulo: 'Dica: carregue um exemplo pronto',
    texto: 'Se quiser começar mais rápido (ou só ver um processo completo funcionando), clique aqui pra carregar um exemplo pronto e editar a partir dele.',
  },
  {
    titulo: 'Pronto!',
    texto: 'Isso é o básico pra montar um processo. Se precisar rever qualquer coisa, clique no "?" no topo da tela pra abrir esse tutorial de novo.',
  },
]
