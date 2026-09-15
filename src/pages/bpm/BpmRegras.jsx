import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown, Save, UploadCloud, Loader2, AlertTriangle, Pencil } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import { listarDefinicoes, obterDefinicao, salvarDefinicao, publicarDefinicao } from '../../services/bpm/bpmService'
import { gerarBpmnLinear, tentarExtrairEtapas } from '../../services/bpm/bpmRegrasGerador'

const CHAVE_PROCESSO = 'cancelamento-devolucao-nfe'
const ETAPA_VAZIA = () => ({ nome: '', agrupamento_cargo_id: '', prazo_horas: '' })

export default function BpmRegras() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [definicaoId, setDefinicaoId] = useState(null)
  const [status, setStatus] = useState('rascunho')
  const [nome, setNome] = useState('Cancelamento e Devolução de NF-e')
  const [descricao, setDescricao] = useState('')
  const [etapas, setEtapas] = useState([ETAPA_VAZIA()])
  const [agrupamentosCargo, setAgrupamentosCargo] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [avisoComplexo, setAvisoComplexo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const [defs, cargos] = await Promise.all([listarDefinicoes(), apiService.getAgrupamentoCargos()])
        setAgrupamentosCargo(cargos.filter(c => c.ativo !== false))

        const doProcesso = defs.filter(d => d.chave === CHAVE_PROCESSO) // já vem ordenado por versão desc
        const ultima = doProcesso[0]
        if (!ultima) { setCarregando(false); return }

        const def = await obterDefinicao(ultima.id)
        setDefinicaoId(def.id); setStatus(def.status); setNome(def.nome); setDescricao(def.descricao || '')

        const extraido = await tentarExtrairEtapas({ bpmnXml: def.bpmn_xml, elementosMeta: def.elementos_meta })
        if (extraido.ok) {
          setEtapas(extraido.etapas.length ? extraido.etapas.map(e => ({ ...e, agrupamento_cargo_id: e.agrupamento_cargo_id || '', prazo_horas: e.prazo_horas || '' })) : [ETAPA_VAZIA()])
        } else {
          setAvisoComplexo(extraido.motivo)
        }
      } catch (e) {
        setMensagem({ tipo: 'erro', texto: e.message || String(e) })
      } finally {
        setCarregando(false)
      }
    })()
  }, [])

  const atualizarEtapa = (indice, patch) => setEtapas(prev => prev.map((e, i) => i === indice ? { ...e, ...patch } : e))
  const adicionarEtapa = () => setEtapas(prev => [...prev, ETAPA_VAZIA()])
  const removerEtapa = (indice) => setEtapas(prev => prev.filter((_, i) => i !== indice))
  const moverEtapa = (indice, direcao) => setEtapas(prev => {
    const alvo = indice + direcao
    if (alvo < 0 || alvo >= prev.length) return prev
    const nova = [...prev]
    ;[nova[indice], nova[alvo]] = [nova[alvo], nova[indice]]
    return nova
  })

  const salvar = useCallback(async () => {
    if (!nome.trim()) { setMensagem({ tipo: 'erro', texto: 'Informe o nome do processo.' }); return null }
    if (!etapas.some(e => e.nome.trim())) { setMensagem({ tipo: 'erro', texto: 'Adicione pelo menos uma etapa com nome.' }); return null }
    setSalvando(true); setMensagem(null)
    try {
      const { bpmnXml, elementosMeta } = gerarBpmnLinear({ nome, etapas })
      const salvo = await salvarDefinicao({
        id: definicaoId, chave: CHAVE_PROCESSO, nome, descricao,
        bpmnXml, formSchemas: {}, elementosMeta, userId: user?.id,
      })
      setDefinicaoId(salvo.id); setStatus(salvo.status)
      setAvisoComplexo(null) // a partir daqui o diagrama é o gerado por esta tela, não tem mais o que não conseguimos ler
      return salvo
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + (e.message || String(e)) })
      return null
    } finally { setSalvando(false) }
  }, [nome, descricao, etapas, definicaoId, user])

  const salvarRascunho = async () => {
    const salvo = await salvar()
    if (salvo) setMensagem({ tipo: 'ok', texto: `Salvo (versão ${salvo.versao}, rascunho).` })
  }

  const publicar = async () => {
    const salvo = await salvar()
    if (!salvo) return
    setSalvando(true)
    try {
      const publicado = await publicarDefinicao(salvo.id)
      setStatus(publicado.status)
      setMensagem({ tipo: 'ok', texto: `Publicado (versão ${publicado.versao}). Já pode ser usado em novas solicitações.` })
    } catch (e) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao publicar: ' + (e.message || String(e)) })
    } finally { setSalvando(false) }
  }

  if (carregando) return <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate('/bpm/nfe-cancelamento-devolucao')} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md" title="Voltar">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-900">Regras do processo</h1>
          <p className="text-xs text-slate-500">Cancelamento e Devolução de NF-e — defina as etapas, na ordem, sem precisar desenhar.</p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${status === 'publicado' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{status}</span>
        {definicaoId && (
          <button onClick={() => navigate(`/bpm/modelador/${definicaoId}`)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
            <Pencil className="h-3.5 w-3.5" /> Editar visualmente (avançado)
          </button>
        )}
      </div>

      {mensagem && (
        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${mensagem.tipo === 'erro' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {mensagem.tipo === 'erro' && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {avisoComplexo && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Este processo tem algo que essa tela simples não consegue mostrar: {avisoComplexo}</p>
            <p className="mt-1">Use "Editar visualmente (avançado)" pra ver/ajustar o fluxo completo. Se você salvar por aqui, o fluxo avançado (gateways, raias) será <strong>substituído</strong> pela lista de etapas abaixo.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do processo</label>
          <input value={nome} onChange={e => setNome(e.target.value)} className="text-sm p-2 border border-slate-200 rounded-md" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição (opcional)</label>
          <input value={descricao} onChange={e => setDescricao(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Etapas, na ordem</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {etapas.map((etapa, i) => (
            <div key={i} className="flex items-start gap-2 px-4 py-3">
              <div className="flex flex-col items-center gap-1 pt-1.5">
                <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                <button onClick={() => moverEtapa(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowUp className="h-3 w-3" /></button>
                <button onClick={() => moverEtapa(i, 1)} disabled={i === etapas.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-20"><ArrowDown className="h-3 w-3" /></button>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-[2fr_1.4fr_0.8fr] gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da etapa</label>
                  <input value={etapa.nome} onChange={e => atualizarEtapa(i, { nome: e.target.value })} placeholder="ex.: Revisar solicitação"
                    className="text-xs p-2 border border-slate-200 rounded-md" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo responsável</label>
                  <select value={etapa.agrupamento_cargo_id} onChange={e => atualizarEtapa(i, { agrupamento_cargo_id: e.target.value })}
                    className="text-xs p-2 border border-slate-200 rounded-md bg-white">
                    <option value="">Qualquer pessoa</option>
                    {agrupamentosCargo.map(a => <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Prazo (horas)</label>
                  <input type="number" value={etapa.prazo_horas} onChange={e => atualizarEtapa(i, { prazo_horas: e.target.value })}
                    className="text-xs p-2 border border-slate-200 rounded-md" />
                </div>
              </div>
              <button onClick={() => removerEtapa(i)} disabled={etapas.length === 1} className="p-1.5 mt-5 text-slate-400 hover:text-red-600 disabled:opacity-20" title="Remover etapa">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button onClick={adicionarEtapa} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline">
            <Plus className="h-3.5 w-3.5" /> Adicionar etapa
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={salvarRascunho} disabled={salvando} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50">
          <Save className="h-3.5 w-3.5" /> Salvar rascunho
        </button>
        <button onClick={publicar} disabled={salvando} className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
          <UploadCloud className="h-3.5 w-3.5" /> {salvando ? 'Salvando...' : 'Salvar e publicar'}
        </button>
      </div>
    </div>
  )
}
