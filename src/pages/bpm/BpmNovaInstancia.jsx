import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, PlayCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { obterDefinicao, iniciarInstancia } from '../../services/bpm/bpmService'
import { parseBpmnXml, findStartEvent } from '../../services/bpm/bpmEngine'
import BpmFormRenderer from './BpmFormRenderer'

export default function BpmNovaInstancia() {
  const { definitionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [def, setDef] = useState(null)
  const [startEventId, setStartEventId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [dados, setDados] = useState({})
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    (async () => {
      setLoading(true); setErro(null)
      try {
        const d = await obterDefinicao(definitionId)
        setDef(d)
        setTitulo(d.nome)
        const { process } = await parseBpmnXml(d.bpmn_xml)
        const start = findStartEvent(process)
        setStartEventId(start?.id || null)
      } catch (e) {
        setErro(e.message || String(e))
      } finally { setLoading(false) }
    })()
  }, [definitionId])

  const schema = def && startEventId ? (def.form_schemas || {})[startEventId] : []

  const camposObrigatoriosFaltando = () => (schema || []).some(c => c.obrigatorio && (dados[c.key] === undefined || dados[c.key] === '' || dados[c.key] === null))

  const iniciar = async () => {
    setEnviando(true); setErro(null)
    try {
      const r = await iniciarInstancia({ definitionId, titulo, dadosIniciais: dados, userId: user?.id })
      navigate(`/bpm/instancias/${r.instanciaId}`)
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setEnviando(false) }
  }

  if (loading) return <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/bpm/processos" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Iniciar processo</h1>
          <p className="text-xs text-slate-500">{def?.nome} <span className="text-slate-300">v{def?.versao}</span></p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Título da instância</label>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
        <BpmFormRenderer schema={schema} valores={dados} onChange={setDados} />
      </div>

      <div className="flex justify-end">
        <button onClick={iniciar} disabled={enviando || camposObrigatoriosFaltando()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
          <PlayCircle className="h-3.5 w-3.5" /> {enviando ? 'Iniciando...' : 'Iniciar processo'}
        </button>
      </div>
    </div>
  )
}
