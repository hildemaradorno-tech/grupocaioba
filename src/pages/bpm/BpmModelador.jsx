import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'
import './bpmModelador.css'
import { Save, UploadCloud, FilePlus2, Wand2, ArrowLeft, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import { obterDefinicao, salvarDefinicao, publicarDefinicao } from '../../services/bpm/bpmService'
import { BPM_CONNECTOR_OPCOES } from '../../services/bpm/bpmConnectors'
import { BPM_XML_VAZIO, BPM_PILOTO_DEFINICAO } from '../../services/bpm/bpmSeedPiloto'
import { bpmnTranslatePtBrModule, registrarDescricoesElementos } from './bpmnPtBr'
import { bpmnCorEventoInicioModule } from './bpmnCorEventoInicio'
import EditorFormulario from './BpmEditorFormulario'
import BpmTutorial, { BPM_TOUR_STEPS } from './BpmTutorial'

const TOUR_VISTO_KEY = 'bpm_tour_modelador_visto'

const OPERADORES = ['true', 'false', '>', '>=', '<', '<=', '==', '!=']

function slugify(nome) {
  return String(nome || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'processo'
}

// Painel de propriedades customizado — não usamos bpmn-js-properties-panel para não adicionar
// mais uma dependência pesada; guardamos os metadados (papel/prazo/conector/condição) à parte,
// em elementos_meta e form_schemas, indexados pelo id do elemento no diagrama.
function PainelPropriedades({ elemento, formSchemas, setFormSchemas, elementosMeta, setElementosMeta, modelerRef, agrupamentosCargo }) {
  if (!elemento) {
    return <p className="text-xs text-slate-400 p-4">Selecione um elemento no diagrama para editar seus detalhes.</p>
  }
  const tipo = elemento.businessObject?.$type
  const id = elemento.id
  const nome = elemento.businessObject?.name || ''

  const renomear = (novoNome) => {
    const modeling = modelerRef.current?.get('modeling')
    if (modeling) modeling.updateProperties(elemento, { name: novoNome })
  }

  const metaAtual = elementosMeta[id] || {}
  const atualizarMeta = (patch) => setElementosMeta(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  // Se a tarefa está dentro de uma raia (Lane), ela herda o cargo responsável da raia quando
  // não define o próprio — usado só pra mostrar essa dica no painel (a herança de verdade
  // acontece no motor, em bpmService.js).
  const lanePai = elemento.parent?.businessObject?.$type === 'bpmn:Lane' ? elemento.parent : null
  const cargoHerdadoDaLane = lanePai ? (elementosMeta[lanePai.id]?.responsavel_agrupamento_cargo_id || null) : null
  const nomeCargoHerdado = cargoHerdadoDaLane ? agrupamentosCargo.find(a => a.id === cargoHerdadoDaLane)?.nome_agrupamento_cargo : null

  if (tipo === 'bpmn:SequenceFlow') {
    const bo = elemento.businessObject
    const origemTipo = bo.sourceRef?.$type
    if (origemTipo !== 'bpmn:ExclusiveGateway') {
      return (
        <div className="p-4 text-xs text-slate-500">
          <p className="font-bold text-slate-700 mb-1">Ligação (sequence flow)</p>
          <p>Só ligações que saem de um <strong>gateway exclusivo</strong> podem ter condição nesta versão do motor.</p>
        </div>
      )
    }
    let condAtual = null
    try { condAtual = bo.conditionExpression ? JSON.parse(bo.conditionExpression.body) : null } catch { /* ignora corpo inválido */ }

    const aplicarCondicao = (cond) => {
      const modeling = modelerRef.current?.get('modeling')
      const moddle = modelerRef.current?.get('moddle')
      if (!modeling || !moddle) return
      if (!cond) {
        modeling.updateProperties(elemento, { conditionExpression: undefined })
        return
      }
      const expr = moddle.create('bpmn:FormalExpression', { body: JSON.stringify(cond) })
      modeling.updateProperties(elemento, { conditionExpression: expr })
    }

    return (
      <div className="p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-slate-700">Condição do fluxo (gateway exclusivo)</p>
        <p className="text-[11px] text-slate-400">Sem condição = fluxo padrão (usado quando nenhuma condição das outras ligações bate).</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Campo dos dados da instância</label>
          <input defaultValue={condAtual?.campo || ''} onBlur={e => aplicarCondicao(e.target.value ? { campo: e.target.value, operador: condAtual?.operador || 'true', valor: condAtual?.valor } : null)}
            placeholder="ex.: dentro_prazo_sefaz" className="text-xs p-2 border border-slate-200 rounded-md" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Operador</label>
          <select defaultValue={condAtual?.operador || 'true'} onChange={e => condAtual?.campo && aplicarCondicao({ ...condAtual, operador: e.target.value })} className="text-xs p-2 border border-slate-200 rounded-md bg-white">
            {OPERADORES.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
        </div>
        {!['true', 'false'].includes(condAtual?.operador) && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Valor de comparação</label>
            <input defaultValue={condAtual?.valor ?? ''} onBlur={e => condAtual?.campo && aplicarCondicao({ ...condAtual, valor: e.target.value })} className="text-xs p-2 border border-slate-200 rounded-md" />
          </div>
        )}
        {condAtual && (
          <button onClick={() => aplicarCondicao(null)} className="text-[11px] text-red-500 hover:text-red-700 text-left">Remover condição (virar fluxo padrão)</button>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{tipo?.replace('bpmn:', '')}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
        <input key={id + ':' + nome} defaultValue={nome} onBlur={e => renomear(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md" />
      </div>

      {tipo === 'bpmn:ServiceTask' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Conector</label>
          <select value={metaAtual.conector || ''} onChange={e => atualizarMeta({ conector: e.target.value })} className="text-xs p-2 border border-slate-200 rounded-md bg-white">
            <option value="">Nenhum (não faz nada)</option>
            {BPM_CONNECTOR_OPCOES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      {tipo === 'bpmn:Lane' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Agrupamento de cargos da raia</label>
          <select
            value={metaAtual.responsavel_agrupamento_cargo_id || ''}
            onChange={e => {
              const cargoId = e.target.value || null
              atualizarMeta({ responsavel_agrupamento_cargo_id: cargoId })
              // O nome da raia é o rótulo que aparece na lateral do diagrama — sincroniza com o
              // cargo escolhido pra não precisar digitar o mesmo nome duas vezes.
              if (cargoId) {
                const cargoEscolhido = agrupamentosCargo.find(a => a.id === cargoId)
                if (cargoEscolhido) renomear(cargoEscolhido.nome_agrupamento_cargo)
              }
            }}
            className="text-xs p-2 border border-slate-200 rounded-md bg-white"
          >
            <option value="">Sem restrição de cargo</option>
            {agrupamentosCargo.map(a => <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>)}
          </select>
          <p className="text-[10px] text-slate-400">Toda Tarefa de Usuário dentro desta raia herda esse cargo automaticamente — a menos que a tarefa defina o dela próprio. O nome da raia é atualizado junto.</p>
        </div>
      )}

      {tipo === 'bpmn:UserTask' && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Agrupamento de cargos responsável</label>
            <select
              value={metaAtual.responsavel_agrupamento_cargo_id || ''}
              onChange={e => atualizarMeta({ responsavel_agrupamento_cargo_id: e.target.value || null })}
              className="text-xs p-2 border border-slate-200 rounded-md bg-white"
            >
              <option value="">{nomeCargoHerdado ? `Herdar da raia (${nomeCargoHerdado})` : 'Qualquer pessoa (sem restrição de cargo)'}</option>
              {agrupamentosCargo.map(a => <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>)}
            </select>
            <p className="text-[10px] text-slate-400">
              {nomeCargoHerdado
                ? `Em branco, herda o cargo da raia (${nomeCargoHerdado}). Escolha um cargo aqui só se essa tarefa precisar de um diferente do resto da raia.`
                : 'Só quem estiver nesse agrupamento de cargos (em Usuários) vai poder assumir essa tarefa.'}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Prazo (horas)</label>
            <input type="number" value={metaAtual.prazo_horas || ''} onChange={e => atualizarMeta({ prazo_horas: e.target.value ? Number(e.target.value) : null })}
              className="text-xs p-2 border border-slate-200 rounded-md" />
          </div>
        </>
      )}

      {(tipo === 'bpmn:UserTask' || tipo === 'bpmn:StartEvent') && (
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">
            Campos do formulário {tipo === 'bpmn:StartEvent' && '(preenchidos ao iniciar a instância)'}
          </label>
          <EditorFormulario campos={formSchemas[id]} onChange={campos => setFormSchemas(prev => ({ ...prev, [id]: campos }))} />
        </div>
      )}
    </div>
  )
}

export default function BpmModelador() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const containerRef = useRef(null)
  const modelerRef = useRef(null)

  const [definicaoId, setDefinicaoId] = useState(id || null)
  const [status, setStatus] = useState('rascunho')
  // Quando chega aqui sem :id (processo novo) mas com ?chave=... na URL, usa essa chave em vez
  // de deixar em branco — senão salvarDefinicao gera a chave a partir do nome digitado, que quase
  // nunca bate com a chave fixa que a tela de origem (ex.: NF-e) está procurando.
  const [chave, setChave] = useState(!id ? (searchParams.get('chave') || '') : '')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [formSchemas, setFormSchemas] = useState({})
  const [elementosMeta, setElementosMeta] = useState({})
  const [selecionado, setSelecionado] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)
  const [pronto, setPronto] = useState(false)
  const [tourAberto, setTourAberto] = useState(false)
  const [agrupamentosCargo, setAgrupamentosCargo] = useState([])

  useEffect(() => {
    apiService.getAgrupamentoCargos().then(lista => setAgrupamentosCargo(lista.filter(a => a.ativo !== false))).catch(() => setAgrupamentosCargo([]))
  }, [])

  useEffect(() => {
    let cancelado = false
    const modeler = new BpmnModeler({
      container: containerRef.current,
      keyboard: { bindTo: window },
      additionalModules: [bpmnTranslatePtBrModule, bpmnCorEventoInicioModule],
    })
    modelerRef.current = modeler
    registrarDescricoesElementos(modeler)
    modeler.on('selection.changed', (e) => setSelecionado(e.newSelection[0] || null))
    modeler.on('element.changed', (e) => {
      setSelecionado(sel => (sel && sel.id === e.element.id) ? e.element : sel)
    })

    ;(async () => {
      try {
        if (id) {
          const def = await obterDefinicao(id)
          if (cancelado) return
          setDefinicaoId(def.id)
          setStatus(def.status)
          setChave(def.chave)
          setNome(def.nome)
          setDescricao(def.descricao || '')
          setFormSchemas(def.form_schemas || {})
          setElementosMeta(def.elementos_meta || {})
          await modeler.importXML(def.bpmn_xml)
        } else {
          await modeler.importXML(BPM_XML_VAZIO)
        }
        // O React.StrictMode remonta o efeito em dev (monta → limpa → monta de novo). Se este
        // importXML pertencer a uma instância já destruída pela limpeza, não mexe mais nela —
        // senão o canvas interno (já sem elemento raiz) explode ao tentar dar zoom.
        if (cancelado) return
        modeler.get('canvas').zoom('fit-viewport')
        setPronto(true)
        try {
          if (!localStorage.getItem(TOUR_VISTO_KEY)) {
            localStorage.setItem(TOUR_VISTO_KEY, '1')
            setTourAberto(true)
          }
        } catch { /* localStorage indisponível — sem tutorial automático, sem problema */ }
      } catch (e) {
        if (!cancelado) setMensagem({ tipo: 'erro', texto: 'Erro ao carregar o diagrama: ' + (e.message || String(e)) })
      }
    })()

    return () => {
      cancelado = true
      modeler.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const carregarPiloto = useCallback(async () => {
    const modeler = modelerRef.current
    if (!modeler) return
    await modeler.importXML(BPM_PILOTO_DEFINICAO.bpmnXml)
    modeler.get('canvas').zoom('fit-viewport')
    setChave(BPM_PILOTO_DEFINICAO.chave)
    setNome(BPM_PILOTO_DEFINICAO.nome)
    setDescricao(BPM_PILOTO_DEFINICAO.descricao)
    setFormSchemas(BPM_PILOTO_DEFINICAO.formSchemas)
    setElementosMeta(BPM_PILOTO_DEFINICAO.elementosMeta)
    setDefinicaoId(null)
    setStatus('rascunho')
    setMensagem({ tipo: 'ok', texto: 'Processo piloto carregado — ainda não salvo. Clique em "Salvar rascunho" para gravar.' })
  }, [])

  const novoEmBranco = useCallback(async () => {
    const modeler = modelerRef.current
    if (!modeler) return
    await modeler.importXML(BPM_XML_VAZIO)
    modeler.get('canvas').zoom('fit-viewport')
    // Mantém a chave que veio por ?chave= na URL (se veio) — "Novo em branco" é só pra recomeçar
    // o desenho, não pra desligar este editor do processo que a tela de origem está esperando.
    setChave(searchParams.get('chave') || ''); setNome(''); setDescricao('')
    setFormSchemas({}); setElementosMeta({})
    setDefinicaoId(null); setStatus('rascunho')
  }, [searchParams])

  const salvar = async () => {
    if (!nome.trim()) { setMensagem({ tipo: 'erro', texto: 'Informe o nome do processo antes de salvar.' }); return }
    setSalvando(true); setMensagem(null)
    try {
      const { xml } = await modelerRef.current.saveXML({ format: true })
      const chaveFinal = chave || slugify(nome)
      const salvo = await salvarDefinicao({
        id: definicaoId, chave: chaveFinal, nome, descricao,
        bpmnXml: xml, formSchemas, elementosMeta, userId: user?.id,
      })
      setDefinicaoId(salvo.id); setChave(salvo.chave); setStatus(salvo.status)
      // Reflete o id salvo na URL — senão um F5 (ou voltar depois) reabre em branco, como se o
      // rascunho tivesse sumido, mesmo já estando salvo no banco.
      if (!id) navigate(`/bpm/modelador/${salvo.id}`, { replace: true })
      setMensagem({ tipo: 'ok', texto: `Salvo (versão ${salvo.versao}, ${salvo.status}).` })
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + (e.message || String(e)) })
    } finally { setSalvando(false) }
  }

  const publicar = async () => {
    if (!definicaoId) { setMensagem({ tipo: 'erro', texto: 'Salve o rascunho antes de publicar.' }); return }
    setSalvando(true); setMensagem(null)
    try {
      await salvar()
      const publicado = await publicarDefinicao(definicaoId)
      setStatus(publicado.status)
      setMensagem({ tipo: 'ok', texto: `Processo publicado (versão ${publicado.versao}). Já pode ser iniciado no Catálogo.` })
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao publicar: ' + (e.message || String(e)) })
    } finally { setSalvando(false) }
  }

  return (
    <div className="h-[calc(100vh-0px)] flex flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-2.5 flex flex-wrap items-center gap-2">
        <button onClick={() => navigate('/bpm/nfe-cancelamento-devolucao')} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md" title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do processo"
          className="text-sm font-bold text-slate-900 border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded-md px-2 py-1 w-56" />
        <input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descrição (opcional)"
          className="text-xs text-slate-500 border border-transparent hover:border-slate-200 focus:border-indigo-300 rounded-md px-2 py-1 flex-1 min-w-[160px]" />
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${status === 'publicado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {status}{chave ? ` · v` : ''}
        </span>
        {chave && (
          <span title="Chave interna do processo — é ela (não o nome) que conecta este fluxo à tela que o usa." className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
            chave: {chave}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setTourAberto(true)} title="Rever o tutorial" className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
            <HelpCircle className="h-4 w-4" />
          </button>
          <button onClick={novoEmBranco} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <FilePlus2 className="h-3.5 w-3.5" /> Novo em branco
          </button>
          <button data-tour="btn-exemplo" onClick={carregarPiloto} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100">
            <Wand2 className="h-3.5 w-3.5" /> Carregar exemplo (piloto)
          </button>
          <button data-tour="btn-salvar" onClick={salvar} disabled={salvando || !pronto} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-50">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
          <button data-tour="btn-publicar" onClick={publicar} disabled={salvando || !pronto} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            <UploadCloud className="h-3.5 w-3.5" /> Publicar
          </button>
        </div>
      </div>

      {mensagem && (
        <div className={`px-4 py-2 text-xs font-semibold flex items-center gap-2 ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {mensagem.tipo === 'erro' ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {mensagem.texto}
          <button onClick={() => setMensagem(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div ref={containerRef} className="bpm-modelador-canvas flex-1 bg-slate-50" />
        <div data-tour="painel-propriedades" className="w-80 border-l border-slate-200 bg-white overflow-y-auto shrink-0">
          <PainelPropriedades
            elemento={selecionado}
            formSchemas={formSchemas} setFormSchemas={setFormSchemas}
            elementosMeta={elementosMeta} setElementosMeta={setElementosMeta}
            modelerRef={modelerRef}
            agrupamentosCargo={agrupamentosCargo}
          />
        </div>
      </div>

      <BpmTutorial steps={BPM_TOUR_STEPS} aberto={tourAberto} onFechar={() => setTourAberto(false)} />
    </div>
  )
}
