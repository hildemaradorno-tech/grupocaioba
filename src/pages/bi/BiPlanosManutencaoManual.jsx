import React from 'react'
import { BookOpen, Database, LayoutDashboard, Truck, Wrench, FileText, Gauge, CreditCard, FileSearch, Check, Settings, Upload, Goal, Table2, BarChart3, Pencil, ListChecks, RefreshCw, Building2 } from 'lucide-react'
import { INFO_RESUMO, MANUAL_GERAL, MANUAL_RESUMO, MANUAL_ABAS } from './planosManutencaoTextos'

// Manual operacional do BI Planos de Manutenção (aberto em nova aba pelo ícone de livro do cabeçalho do BI).
// Mesmo modelo do manual de Garantias DAF: menu de acesso rápido fixo na lateral e uma seção por assunto.
// O conteúdo vem de planosManutencaoTextos.js (o mesmo usado no botão ⓘ dos cards).

const ICONES_GERAL = { 'Visão geral': BookOpen, 'Fontes (relatórios)': Database, 'Importar arquivo': Upload, 'Como informar as metas': Goal, 'Cadastro de ações': ListChecks, 'Acessos (grupo de acesso)': Building2 }
const ICONES_ABAS = {
  'Veículos Vendidos': Truck, 'Ordens de Serviço': Wrench,
  'Contratos': FileText, 'Oportunidades': Gauge, 'Resultado': LayoutDashboard,
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
      ['Regras', i.filtros], ['Colunas utilizadas de cada relatório', i.colunas],
    ],
  }
})
const secoesGeral = MANUAL_GERAL.map(b => ({ id: slug(b.titulo), titulo: b.titulo, icone: ICONES_GERAL[b.titulo] || BookOpen, itens: b.itens }))
// Abas disponíveis: a aba Resultado leva, logo abaixo, os indicadores e cards do Resumo (subtítulos no menu lateral).
const secoesAbas = MANUAL_ABAS.map(b => ({
  id: slug(b.titulo), titulo: b.titulo, icone: ICONES_ABAS[b.titulo] || BookOpen, itens: b.itens,
  filhos: b.titulo === 'Resultado' ? secoesResumo : [],
}))

// Desenho dos botões da tela dentro do texto do manual: [[nome]] no texto vira o botão igual ao do BI.
const BOTOES = {
  tabela: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><Table2 className="h-3.5 w-3.5" /></span>,
  resumo: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><LayoutDashboard className="h-3.5 w-3.5" /></span>,
  grafico: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><BarChart3 className="h-3.5 w-3.5" /></span>,
  editar: () => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle"><Pencil className="h-3 w-3" /> Editar metas</span>,
  aplicar: () => <span className="inline-flex px-2 py-0.5 rounded-md border border-blue-600 text-blue-700 text-[11px] font-semibold align-middle">Aplicar aos marcados</span>,
  salvar: () => <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle">Salvar metas</span>,
  cancelar: () => <span className="inline-flex px-2 py-0.5 rounded-md border border-slate-300 text-slate-700 text-[11px] align-middle">Cancelar</span>,
  caixa: () => <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm bg-blue-600 align-middle"><Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /></span>,
  engrenagem: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><Settings className="h-3.5 w-3.5" /></span>,
  acoes: () => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-800 text-[11px] font-semibold align-middle"><ListChecks className="h-3 w-3 text-blue-600" /> Cadastro de ações</span>,
  incluir: () => <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle">Incluir</span>,
  atualizar: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><RefreshCw className="h-3.5 w-3.5" /></span>,
  manual: () => <span className="inline-flex p-1 rounded-md bg-blue-600 text-white align-middle"><BookOpen className="h-3.5 w-3.5" /></span>,
  lapis: () => <span className="inline-flex p-0.5 rounded text-blue-600 border border-blue-200 align-middle"><Pencil className="h-3.5 w-3.5" /></span>,
  lupa: () => <span className="inline-flex p-0.5 rounded text-blue-600 border border-blue-200 align-middle"><FileSearch className="h-3.5 w-3.5" /></span>,
  ativa: () => <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 align-middle">Ativa</span>,
  salvarSimples: () => <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle">Salvar</span>,
  importar: () => <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-800 text-[11px] font-semibold align-middle"><Upload className="h-3 w-3 text-blue-600" /> Importar arquivo</span>,
}
// Nome de aba do BI depois da palavra "aba" (ex.: "aba Resultado") aparece destacado, como a aba na tela.
const ABAS_BI = ['Oportunidades', 'Veículos Vendidos', 'Ordens de Serviço', 'Resultado', 'Contratos']
const RE_ABA = new RegExp('([Aa]bas? (?:' + ABAS_BI.join('|') + '))')
function ComAbas({ texto }) {
  return texto.split(RE_ABA).map((p, i) => {
    const m = p.match(/^([Aa]bas?) (.+)$/)
    if (!m || !ABAS_BI.includes(m[2])) return <React.Fragment key={i}>{p}</React.Fragment>
    return (
      <React.Fragment key={i}>
        {m[1]} <span className="inline-flex px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle">{m[2]}</span>
      </React.Fragment>
    )
  })
}
function ComBotoes({ texto }) {
  const partes = String(texto).split(/(\[\[\w+\]\])/)
  return partes.map((p, i) => {
    const m = p.match(/^\[\[(\w+)\]\]$/)
    const B = m && BOTOES[m[1]]
    return B ? <B key={i} /> : <ComAbas key={i} texto={p} />
  })
}

// Texto do manual, uma informação por linha (formato de planosManutencaoTextos.js):
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
              <li key={j} className="flex gap-2"><span className="text-blue-400">•</span><span><ComBotoes texto={t} /></span></li>
            ))}
          </ul>
        )
        return (
          <table key={i} className="w-full text-[12px] border border-slate-200 rounded">
            <tbody className="divide-y divide-slate-100">
              {b.itens.map(([coluna, uso], j) => (
                <tr key={j}>
                  <td className="px-2 py-1 font-mono text-slate-800 whitespace-nowrap align-top w-0">{coluna}</td>
                  <td className="px-2 py-1"><ComBotoes texto={uso} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}
    </div>
  )
}

// Desenho do botão ao lado do título do item, igual ao da tela, para o usuário se localizar.
function Caixa({ marcada }) {
  return (
    <span className={`inline-flex items-center justify-center h-3.5 w-3.5 rounded-sm border ${marcada ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-400'}`}>
      {marcada && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </span>
  )
}
function Desenho({ nome }) {
  if (nome.startsWith('Lupa')) return <FileSearch className="h-4 w-4 text-blue-600" />
  if (nome.startsWith('Importar arquivo')) return <span className="inline-flex p-0.5 rounded bg-blue-600"><Settings className="h-3 w-3 text-white" /></span>
  if (nome === 'Excluir cancelados') return <Caixa marcada />
  if (nome.startsWith('Ver todos')) return <Caixa />
  return null
}

function Secao({ id, icone: Icone, titulo, itens, aba }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      {aba ? (
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-white bg-blue-600 rounded-md px-3 py-1.5 mb-3">
          <Icone className="h-4 w-4" /> {titulo}
        </h2>
      ) : (
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
          <span className="p-1.5 bg-blue-50 rounded"><Icone className="h-4 w-4 text-blue-600" /></span>
          {titulo}
        </h2>
      )}
      <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">
        {itens.filter(([, t]) => t).map(([nome, texto]) => (
          <div key={nome}>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5"><Desenho nome={nome} />{nome}</h3>
            <Texto texto={texto} />
          </div>
        ))}
      </div>
    </section>
  )
}

function LinkMenu({ id, titulo, icone: Icone, pequeno, aba }) {
  return (
    <a href={`#${id}`}
      onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}
      className={`flex items-center gap-2 px-2 rounded transition-colors ${aba
        ? 'mt-1 py-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700'
        : `font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-700 ${pequeno ? 'py-1 text-[11px]' : 'py-1.5 text-xs'}`}`}>
      <Icone className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{titulo}</span>
    </a>
  )
}

export default function BiPlanosManutencaoManual() {
  const grupos = [
    ['Geral', secoesGeral],
    ['Abas disponíveis', secoesAbas],
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
                {nome}
              </p>
              {secoes.map(s => (
                <div key={s.id}>
                  <LinkMenu {...s} />
                  {/* Subtítulos da aba (Resultado: indicadores e cards). */}
                  {s.filhos?.length > 0 && (
                    <div className="ml-4 border-l border-slate-200 pl-1">
                      {s.filhos.map(fh => <LinkMenu key={fh.id} {...fh} pequeno />)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-5">
          {grupos.map(([nome, secoes]) => (
            <div key={nome} className="space-y-5">
              {/* Título do grupo das abas em destaque. */}
              {nome !== 'Geral' && (
                <p className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-bold uppercase tracking-wide">{nome}</p>
              )}
              {secoes.map(s => (
                <React.Fragment key={s.id}>
                  <Secao {...s} />
                  {/* Indicadores e cards da aba Resultado, logo abaixo dela. */}
                  {s.filhos?.map(fh => <Secao key={fh.id} {...fh} />)}
                </React.Fragment>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
