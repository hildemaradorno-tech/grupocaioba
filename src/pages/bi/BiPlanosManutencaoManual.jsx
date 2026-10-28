import React from 'react'
import { BookOpen, Database, LayoutDashboard, SlidersHorizontal, Truck, Wrench, FileText, ArrowUpDown, Gauge, CreditCard } from 'lucide-react'
import { INFO_RESUMO, MANUAL_GERAL, MANUAL_RESUMO, MANUAL_ABAS } from './planosManutencaoTextos'

// Manual operacional do BI Planos de Manutenção (aberto em nova aba pelo ícone de livro do cabeçalho do BI).
// Mesmo modelo do manual de Garantias DAF: menu de acesso rápido fixo na lateral e uma seção por assunto.
// O conteúdo vem de planosManutencaoTextos.js (o mesmo usado no botão ⓘ dos cards).

const ICONES_GERAL = { 'Visão geral': BookOpen, 'Fontes (relatórios)': Database, 'Cabeçalho': SlidersHorizontal }
const ICONES_ABAS = {
  'Aba Veículos Vendidos': Truck, 'Aba Ordens de Serviço': Wrench,
  'Aba Planos de Manutenção': FileText, 'Ordenação e busca': ArrowUpDown,
}
const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Resumo: uma seção por indicador/card, com tudo o que entra no número.
const secoesResumo = MANUAL_RESUMO.map(([titulo, chave]) => {
  const i = INFO_RESUMO[chave]
  return {
    id: `resumo-${chave}`,
    titulo,
    icone: titulo.startsWith('Indicador') ? Gauge : CreditCard,
    itens: [
      ['Objetivo', i.objetivo], ['Cálculo', i.calculo], ['Fonte (arquivo)', i.fonte],
      ['Filtros e regras', i.filtros], ['Colunas utilizadas de cada relatório', i.colunas],
    ],
  }
})
const SECOES = [
  ...MANUAL_GERAL.map(b => ({ id: slug(b.titulo), titulo: b.titulo, icone: ICONES_GERAL[b.titulo] || BookOpen, itens: b.itens })),
  ...secoesResumo,
  ...MANUAL_ABAS.map(b => ({ id: slug(b.titulo), titulo: b.titulo, icone: ICONES_ABAS[b.titulo] || BookOpen, itens: b.itens })),
]

function Secao({ id, icone: Icone, titulo, itens }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
        <span className="p-1.5 bg-blue-50 rounded"><Icone className="h-4 w-4 text-blue-600" /></span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
        {itens.filter(([, t]) => t).map(([nome, texto]) => (
          <div key={nome}>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">{nome}</h3>
            <p className="whitespace-pre-line">{texto}</p>
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
      className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors">
      <Icone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{titulo}</span>
    </a>
  )
}

export default function BiPlanosManutencaoManual() {
  const grupos = [
    ['Geral', SECOES.slice(0, MANUAL_GERAL.length)],
    ['Aba Resumo', secoesResumo],
    ['Demais abas', SECOES.slice(MANUAL_GERAL.length + secoesResumo.length)],
  ]
  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" /> Manual de Operação — BI Planos de Manutenção
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Fontes, filtros, regras, cálculos e colunas de cada indicador, card e aba do BI.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="hidden lg:block w-60 shrink-0 sticky top-4 bg-white border border-slate-200 rounded-lg p-2 shadow-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
          {grupos.map(([nome, secoes]) => (
            <div key={nome} className="mb-1">
              <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {nome === 'Aba Resumo' && <LayoutDashboard className="h-3 w-3" />}{nome}
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
