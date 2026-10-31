import React from 'react'
import { AlertTriangle, BookOpen, Table2, Target, CreditCard, Database, Gauge, LayoutDashboard, LineChart } from 'lucide-react'
import { INFO, MANUAL_ABAS_CARDS, MANUAL_GERAL, OBJETIVO_ABAS } from './agendamentoServicosTextos'

// Manual operacional do BI Agendamento de Serviços (aberto em nova aba pelo ícone de livro do cabeçalho do BI).
// Mesmo modelo do manual do BI Planos de Manutenção (em verde): menu de acesso rápido fixo na lateral e uma
// seção por assunto. O conteúdo vem de agendamentoServicosTextos.js (o mesmo usado no botão ⓘ dos cards).

const ICONES_GERAL = { 'Visão geral': BookOpen, 'Fontes (relatórios)': Database }
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const secoesGeral = MANUAL_GERAL.map(b => ({ id: slug(b.titulo), titulo: b.titulo, icone: ICONES_GERAL[b.titulo] || BookOpen, itens: b.itens }))
// Uma seção por indicador/card/gráfico de cada aba, com tudo o que entra no número.
// 1ª seção de cada aba: o objetivo dela (o mesmo texto que aparece abaixo das abas no BI).
const secaoObjetivo = (aba) => {
  const nome = aba.replace(/^Aba /, '')
  return OBJETIVO_ABAS[nome] ? [{ id: `${slug(aba)}-objetivo`, titulo: `Objetivo — ${nome}`, icone: Target, itens: [['O que a aba mostra', OBJETIVO_ABAS[nome]]] }] : []
}
const gruposAbas = MANUAL_ABAS_CARDS.map(([aba, cards]) => [aba, [...secaoObjetivo(aba), ...cards.map(([titulo, chave]) => {
  // Seção sem número próprio (ex: alerta de O.S. pendentes): vem pronta, com os itens.
  if (typeof chave !== 'string') return { id: `${slug(aba)}-${slug(titulo)}`, titulo, icone: titulo.startsWith('Tabela') ? Table2 : AlertTriangle, itens: chave.itens }
  const i = INFO[chave]
  return {
    id: `${slug(aba)}-${chave}`,
    titulo,
    icone: titulo.startsWith('Indicador') ? Gauge : titulo.startsWith('Gráfico') ? LineChart : CreditCard,
    itens: [
      ['Objetivo', i.objetivo], ['Cálculo', i.calculo], ['Origem do cálculo', i.origem], ['Fonte (arquivo)', i.fonte],
      ['Regras', i.filtros], ['Colunas utilizadas de cada relatório', i.colunas],
    ],
  }
})]])

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
        if (b.tipo === 'p') return <p key={i}>{b.texto}</p>
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
  const grupos = [['Geral', secoesGeral], ...gruposAbas]
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
          {grupos.map(([nome, secoes]) => (
            <div key={nome} className="mb-1">
              <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {nome !== 'Geral' && <LayoutDashboard className="h-3 w-3" />}{nome}
              </p>
              {secoes.map(s => <LinkMenu key={s.id} {...s} />)}
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-5">
          {grupos.map(([nome, secoes]) => (
            <div key={nome} className="space-y-5">
              {nome !== 'Geral' && <p className="text-sm font-bold text-slate-900 pt-2">{nome}</p>}
              {secoes.map(s => <Secao key={s.id} {...s} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
