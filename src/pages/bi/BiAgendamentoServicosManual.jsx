import React from 'react'
import { AlertTriangle, BookOpen, Table2, CreditCard, Gauge, LayoutDashboard, RefreshCw, Settings } from 'lucide-react'
import { CALCULO_INDICADOR, INFO, MANUAL_ABAS_CARDS, MANUAL_GERAL, OBJETIVO_ABAS } from './agendamentoServicosTextos'

// Manual operacional do BI Agendamento de Serviços (aberto em nova aba pelo ícone de livro do cabeçalho do BI).
// Mesmo modelo do manual do BI Planos de Manutenção (em verde): menu de acesso rápido fixo na lateral e uma
// seção por assunto. O conteúdo vem de agendamentoServicosTextos.js (o mesmo usado no botão ⓘ dos cards).

const ICONES_GERAL = { 'Visão geral': BookOpen }
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const secoesGeral = MANUAL_GERAL.map(b => ({ id: slug(b.titulo), titulo: b.titulo, icone: ICONES_GERAL[b.titulo] || BookOpen, itens: b.itens }))
// Uma seção por aba (título), com o objetivo da aba e um subtítulo por indicador, card, quadro e tabela.
// Indicador: só o cálculo (de quais cards vem o valor). Card/quadro: de onde vem o valor, fonte, regras e colunas.
// Tabela/alerta: os itens prontos do bloco.
const abas = MANUAL_ABAS_CARDS.map(([aba, cards]) => ({
  id: slug(aba),
  titulo: aba,
  objetivo: OBJETIVO_ABAS[aba.replace(/^Aba /, '')] || '',
  subs: cards.map(([titulo, chave]) => {
    const id = `${slug(aba)}-${typeof chave === 'string' ? chave : slug(titulo)}`
    if (typeof chave !== 'string') return { id, titulo, icone: titulo.startsWith('Tabela') ? Table2 : AlertTriangle, itens: chave.itens }
    if (titulo.startsWith('Indicador')) return { id, titulo, icone: Gauge, itens: [['Cálculo', CALCULO_INDICADOR[chave] || INFO[chave].calculo]] }
    const i = INFO[chave]
    return {
      id, titulo, icone: CreditCard,
      itens: [
        ['De onde vem o valor', i.calculo], ['Origem do cálculo', i.origem], ['Fonte (arquivo)', i.fonte],
        ['Regras e filtros', i.filtros], ['Colunas utilizadas de cada relatório', i.colunas],
      ],
    }
  }),
}))

// Botões do cabeçalho do BI desenhados no meio do texto: [[atualizar]] e [[metas]] viram o botão igual ao do BI.
const BOTOES_TEXTO = { atualizar: [RefreshCw, 'Atualizar'], metas: [Settings, 'Configurações'] }
function ComBotoes({ texto }) {
  return texto.split(/(\[\[\w+\]\])/).map((parte, i) => {
    const b = BOTOES_TEXTO[parte.match(/^\[\[(\w+)\]\]$/)?.[1]]
    if (!b) return parte
    const [Icone, nome] = b
    return (
      <span key={i} title={nome} className="inline-flex items-center justify-center h-7 w-7 mx-1 align-middle rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm">
        <Icone className="h-3.5 w-3.5" />
      </span>
    )
  })
}

// Texto do manual, uma informação por linha (formato de agendamentoServicosTextos.js):
// "Título:" → subtítulo · "• Coluna — uso" → tabela de duas colunas · "• texto" → lista · outra linha → parágrafo.
function Texto({ texto }) {
  const blocos = []
  texto.split('\n').forEach(linha => {
    const l = linha.trim()
    if (!l) return
    if (l.endsWith(':') && !l.startsWith('•')) return blocos.push({ tipo: 'sub', texto: l.slice(0, -1) })
    if (l.startsWith('•')) {
      const conteudo = l.slice(1).trim()
      const partes = conteudo.split(' — ')
      const tipo = partes.length === 2 ? 'tabela' : 'lista'
      const ult = blocos[blocos.length - 1]
      const item = tipo === 'tabela' ? partes : conteudo
      if (ult?.tipo === tipo) ult.itens.push(item)
      else blocos.push({ tipo, itens: [item] })
      return
    }
    blocos.push({ tipo: 'p', texto: l })
  })
  return (
    <div className="space-y-1.5">
      {blocos.map((b, i) => {
        if (b.tipo === 'sub') return <p key={i} className="font-semibold text-slate-800 pt-1">{b.texto}</p>
        if (b.tipo === 'p') return <p key={i}><ComBotoes texto={b.texto} /></p>
        if (b.tipo === 'lista') return (
          <ul key={i} className="space-y-0.5">
            {b.itens.map((t, j) => (
              <li key={j} className="flex gap-2"><span className="text-emerald-500">•</span><span>{t}</span></li>
            ))}
          </ul>
        )
        return (
          <table key={i} className="w-full text-[12px] border border-slate-200 rounded">
            <tbody className="divide-y divide-slate-100">
              {b.itens.map(([coluna, uso], j) => (
                <tr key={j}>
                  <td className="px-2 py-1 font-mono text-slate-800 whitespace-nowrap align-top w-0">{coluna}</td>
                  <td className="px-2 py-1">{uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}
    </div>
  )
}

function Secao({ id, icone: Icone, titulo, itens }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
        <span className="p-1.5 bg-emerald-50 rounded"><Icone className="h-4 w-4 text-emerald-600" /></span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
        {itens.filter(([, t]) => t).map(([nome, texto]) => (
          <div key={nome}>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">{nome}</h3>
            <Texto texto={texto} />
          </div>
        ))}
      </div>
    </section>
  )
}

// Uma aba = um bloco: título da aba, objetivo e, dentro, um subtítulo por indicador, card, quadro e tabela.
function SecaoAba({ id, titulo, objetivo, subs }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-1">
        <span className="p-1.5 bg-emerald-50 rounded"><LayoutDashboard className="h-4 w-4 text-emerald-600" /></span>
        {titulo}
      </h2>
      {objetivo && <p className="text-[13px] text-slate-600 leading-relaxed mb-2">{objetivo}</p>}
      <div className="divide-y divide-slate-100">
        {subs.map(({ id: idSub, titulo: tSub, icone: Icone, itens }) => (
          <div key={idSub} id={idSub} className="scroll-mt-6 py-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-2">
              <Icone className="h-4 w-4 text-emerald-600 shrink-0" /> {tSub}
            </h3>
            <div className="space-y-2.5 pl-6 text-[13px] text-slate-600 leading-relaxed">
              {itens.filter(([, t]) => t).map(([nome, texto]) => (
                <div key={nome}>
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-0.5">{nome}</h4>
                  <Texto texto={texto} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function LinkMenu({ id, titulo, icone: Icone }) {
  return (
    <a href={`#${id}`}
      onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}
      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
      <Icone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{titulo}</span>
    </a>
  )
}

export default function BiAgendamentoServicosManual() {
  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" /> Manual de Operação — BI Agendamento de Serviços
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Fontes, filtros, regras, cálculos e colunas de cada indicador, card e gráfico da Mesa de Agendamento.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="hidden lg:block w-64 shrink-0 sticky top-4 bg-white border border-slate-200 rounded-lg p-2 shadow-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
          <div className="mb-1">
            <p className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Geral</p>
            {secoesGeral.map(s => <LinkMenu key={s.id} {...s} />)}
          </div>
          {abas.map(a => (
            <div key={a.id} className="mb-1">
              {/* Título da aba (leva ao bloco da aba) e, abaixo, os subtítulos. */}
              <a href={`#${a.id}`}
                onClick={e => { e.preventDefault(); document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth' }) }}
                className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-emerald-700">
                <LayoutDashboard className="h-3 w-3" />{a.titulo}
              </a>
              {a.subs.map(s => <LinkMenu key={s.id} {...s} />)}
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-5">
          {secoesGeral.map(s => <Secao key={s.id} {...s} />)}
          {abas.map(a => <SecaoAba key={a.id} {...a} />)}
        </div>
      </div>
    </div>
  )
}
