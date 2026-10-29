import React, { useEffect, useRef, useState } from 'react'
import { Bot, RefreshCw, Send, Sparkles } from 'lucide-react'
import { Abas, btnPri, fmtData, inputCls, PaginaPecas, ResultadoIA, useFiltrosPecas } from './components/ui'
import { analisarComIA, chatIA, listarAnalisesIA, salvarAnaliseIA } from './gestorPecasApi'

const CAMPOS = ['loja', 'marca', 'grupo', 'fornecedor']
const PERGUNTAS = [
  'Quais itens curva A estão em ruptura ou vão zerar antes da reposição chegar?',
  'Onde está o maior capital parado e o que você recomenda fazer?',
  'Quais transferências entre lojas devo fazer primeiro?',
  'Quais grupos de peças estão com tendência de queda?',
  'Monte um plano de ação de 30 dias para reduzir obsoletos.',
  'Quais fornecedores estão atrasando e afetando a disponibilidade?',
]

// Markdown simples: **negrito**, listas com "-" ou "1." e quebras de linha
function Markdown({ texto }) {
  const linhas = String(texto || '').split('\n')
  const neg = (t) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p))
  return <div className="space-y-1">{linhas.map((l, i) => {
    if (/^\s*[-*]\s+/.test(l)) return <p key={i} className="pl-3">• {neg(l.replace(/^\s*[-*]\s+/, ''))}</p>
    if (/^#{1,4}\s/.test(l)) return <p key={i} className="font-bold mt-2">{neg(l.replace(/^#+\s/, ''))}</p>
    return l.trim() ? <p key={i}>{neg(l)}</p> : <div key={i} className="h-1" />
  })}</div>
}

export default function PecasAssistenteIA() {
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const [aba, setAba] = useState('chat')
  const [mensagens, setMensagens] = useState([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resumo, setResumo] = useState(null)
  const [gerandoResumo, setGerandoResumo] = useState(false)
  const [historico, setHistorico] = useState([])
  const [erro, setErro] = useState(null)
  const fimRef = useRef(null)

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensagens])
  useEffect(() => { if (aba === 'historico') listarAnalisesIA().then(setHistorico).catch(e => setErro(e.message)) }, [aba])

  const enviar = async (pergunta) => {
    const msg = (pergunta ?? texto).trim()
    if (!msg || enviando) return
    const novas = [...mensagens, { role: 'user', text: msg }]
    setMensagens(novas); setTexto(''); setEnviando(true); setErro(null)
    try {
      const r = await chatIA({ mensagem: msg, historico: mensagens, filtros })
      setMensagens([...novas, { role: 'assistant', text: r.resposta, motor: r.motor }])
    } catch (e) { setErro(e.message) }
    finally { setEnviando(false) }
  }

  const gerarResumo = async () => {
    setGerandoResumo(true); setErro(null)
    try {
      const r = await analisarComIA({ tela: 'alertas', titulo: 'Resumo executivo do estoque', filtros })
      setResumo(r)
      salvarAnaliseIA({ tela: 'resumo-executivo', filtros, motor: r.motor, resultado: r }).catch(() => {})
    } catch (e) { setErro(e.message) }
    finally { setGerandoResumo(false) }
  }

  return (
    <PaginaPecas icone={Bot} titulo="Assistente IA de Peças" tela="assistente-ia" filtros={filtros} setFiltros={setFiltros} mostrarFiltros={CAMPOS} erro={erro}>
      <Abas abas={[['chat', 'Conversar'], ['resumo', 'Resumo executivo'], ['historico', 'Análises salvas']]} aba={aba} onChange={setAba} />

      {aba === 'chat' && (
        <div className="bg-white border border-slate-200 rounded-lg flex flex-col h-[calc(100vh-330px)] min-h-[420px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!mensagens.length && (
              <div className="space-y-2">
                <p className="text-[12px] text-slate-600">Pergunte sobre o estoque, compras, tendências ou um item específico (cite o código). Sugestões:</p>
                <div className="flex flex-wrap gap-2">
                  {PERGUNTAS.map(p => <button key={p} type="button" onClick={() => enviar(p)} className="text-left px-2.5 py-1.5 rounded-md border border-violet-200 bg-violet-50 text-[11px] text-violet-800 hover:bg-violet-100">{p}</button>)}
                </div>
              </div>
            )}
            {mensagens.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${m.role === 'user' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {m.role === 'user' ? m.text : <Markdown texto={m.text} />}
                </div>
              </div>
            ))}
            {enviando && <div className="flex items-center gap-2 text-[11px] text-slate-500"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Analisando...</div>}
            <div ref={fimRef} />
          </div>
          <form className="flex gap-2 p-3 border-t border-slate-200" onSubmit={e => { e.preventDefault(); enviar() }}>
            <input className={`${inputCls} flex-1 py-2 text-[12px]`} placeholder="Ex.: o que fazer com o excesso de filtros em Dourados?" value={texto} onChange={e => setTexto(e.target.value)} />
            <button type="submit" className={btnPri} disabled={enviando || !texto.trim()}><Send className="h-3.5 w-3.5" /> Enviar</button>
          </form>
        </div>
      )}

      {aba === 'resumo' && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 max-w-4xl">
          <div className="flex items-center gap-3">
            <button type="button" className={btnPri} onClick={gerarResumo} disabled={gerandoResumo}>
              {gerandoResumo ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Gerar resumo executivo
            </button>
            <p className="text-[11px] text-slate-500">Diagnóstico geral (estoque, ruptura, excesso, compras, alertas) com as ações prioritárias. Fica salvo em "Análises salvas".</p>
          </div>
          <ResultadoIA r={resumo} />
        </div>
      )}

      {aba === 'historico' && (
        <div className="space-y-2 max-w-4xl">
          {!historico.length && <p className="text-[11px] text-slate-500">Nenhuma análise salva ainda.</p>}
          {historico.map(h => (
            <details key={h.id} className="bg-white border border-slate-200 rounded-lg">
              <summary className="cursor-pointer px-3 py-2 text-[11px] text-slate-700">
                <strong>{h.tela}</strong> · {fmtData(h.criado_em)} · {h.usuario || '—'} · {h.motor === 'ia' ? 'IA' : 'regras'}
              </summary>
              <div className="p-3 border-t border-slate-100"><ResultadoIA r={h.resultado} /></div>
            </details>
          ))}
        </div>
      )}
    </PaginaPecas>
  )
}
