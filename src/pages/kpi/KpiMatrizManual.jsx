import React from 'react'
import {
  BookOpen, Scale, LayoutDashboard, Wrench, Goal, ExternalLink, Settings, Pencil,
  RefreshCw, Building2, Calendar, Target, Info,
} from 'lucide-react'

// Manual de operação da Matriz de KPIs - DAF (23/11/2026) — aberto em outra aba pelo ícone de livro do cabeçalho.
// Mesmo modelo dos manuais dos BIs (Planos de Manutenção, Agendamento): menu lateral fixo e uma seção por assunto.
// Manual livre para todos os usuários (não entra no grupo de acesso). Os botões "Abrir" levam à tela onde cada meta
// é ajustada — lá vale o acesso de cada usuário.

// Botões desenhados dentro do texto, iguais aos das telas.
const Botao = {
  atualizar: <span className="inline-flex p-1 rounded-md border border-slate-300 bg-white text-slate-600 align-middle"><RefreshCw className="h-3.5 w-3.5" /></span>,
  engrenagem: <span className="inline-flex p-1 rounded-md bg-emerald-600 text-white align-middle"><Settings className="h-3.5 w-3.5" /></span>,
  editarMetas: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-semibold align-middle"><Pencil className="h-3 w-3" /> Editar metas</span>,
  calendario: <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-slate-300 bg-white text-slate-700 text-[11px] font-medium align-middle"><Calendar className="h-3 w-3" /> Nov/2026</span>,
  peso: <span className="inline-flex items-center gap-0.5 align-middle"><span className="w-10 text-center border border-slate-300 rounded px-1 text-[11px] bg-white">25</span><span className="text-slate-400 text-[11px]">%</span></span>,
  totalErrado: <span className="inline-block rounded px-1.5 py-0.5 bg-red-100 text-red-700 font-bold ring-1 ring-red-300 text-[11px] align-middle">90%</span>,
  origem: <span className="inline-flex items-center justify-center h-5 w-5 rounded border border-slate-300 bg-slate-50 text-slate-500 align-middle"><Target className="h-3 w-3" /></span>,
}

function AbrirTela({ url, nome }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title={`Abrir ${nome} em outra aba`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">
      <ExternalLink className="h-3 w-3" /> Abrir
    </a>
  )
}

// ── Bloco 3 - Serviços: onde ajustar a meta de cada indicador ───────────────────────────────────
// Telas do Planejamento de Metas: a meta só vale na Matriz depois de APROVADA na Gestão de Aprovação.
const APROVACAO = 'Depois de lançar, a meta precisa ser aprovada em Metas › Gestão de Aprovação — só a aprovada aparece na Matriz.'
const METAS_SERVICOS = [
  {
    grupo: 'Faturamento, margem e ticket (Planejamento de Metas)',
    linhas: [
      { ind: 'Faturamento Total Oficina (Peças + Serviços)', quadros: 'Gerentes, Consultor de Serviços', onde: 'Metas › Pós-Vendas › Serviços & Peças › Consultor (meta de faturamento de cada consultor; gerente = soma da empresa, Gerente Geral = soma das empresas)', url: '/metas/pos-vendas/servicos_pecas/consultor', tela: 'Metas de Serviços — Consultor', obs: APROVACAO },
      { ind: 'Margem Bruta Serviços / Margem Bruta Peças Oficina', quadros: 'Gerentes, Consultor de Serviços', onde: 'Metas › Pós-Vendas › Serviços & Peças › Consultor (colunas de margem % de serviços e de peças)', url: '/metas/pos-vendas/servicos_pecas/consultor', tela: 'Metas de Serviços — Consultor', obs: APROVACAO },
      { ind: 'Ticket Médio da Oficina', quadros: 'Consultor de Serviços', onde: 'Metas › Pós-Vendas › Serviços & Peças › Consultor (ticket e passagens)', url: '/metas/pos-vendas/servicos_pecas/consultor', tela: 'Metas de Serviços — Consultor', obs: APROVACAO },
      { ind: 'Faturamento Total Oficina (Serviços)', quadros: 'Mecânico', onde: 'Metas › Pós-Vendas › Serviços & Peças › Mecânico (meta de serviços de cada mecânico)', url: '/metas/pos-vendas/servicos_pecas/mecanico', tela: 'Metas de Serviços — Mecânico', obs: APROVACAO },
      { ind: 'Faturamento Total Oficina (Equipe)', quadros: 'Chefe de Oficina', onde: 'Metas › Pós-Vendas › Serviços & Peças › Mecânico (soma dos boxes de Mecânica e Box Express da empresa)', url: '/metas/pos-vendas/servicos_pecas/mecanico', tela: 'Metas de Serviços — Mecânico', obs: APROVACAO },
      { ind: 'Faturamento Total Funilaria/Pintura (Departamento)', quadros: 'Setor Funilaria/Pintura', onde: 'Metas › Pós-Vendas › Serviços & Peças (setor Funilaria/Pintura)', url: '/metas/pos-vendas/servicos_pecas', tela: 'Metas de Serviços & Peças', obs: APROVACAO },
      { ind: 'Faturamento Balcão / Margem Bruta Peças Balcão', quadros: 'Gerentes de filial', onde: 'Metas › Pós-Vendas › Peças (departamento Balcão da empresa)', url: '/metas/pos-vendas/pecas', tela: 'Metas de Peças', obs: APROVACAO },
      { ind: 'Aprovação das metas acima', quadros: '—', onde: 'Metas › Gestão de Aprovação', url: '/metas/gestao-aprovacao', tela: 'Gestão de Aprovação', obs: 'Sem aprovação, a coluna Meta fica em branco na Matriz.' },
    ],
  },
  {
    grupo: 'Produtividade (Pós-Vendas › Indicadores de Produtividade)',
    linhas: [
      { ind: 'Eficácia da Oficina / Eficácia %', quadros: 'Gerentes de loja, Setor de Mecânica, Chefe de Oficina, Mecânico', onde: 'Indicadores de Produtividade › botão Regras de cores › Eficácia (a meta é o limite inferior da faixa verde de cada mês)', url: '/pos-vendas/produtividade', tela: 'Indicadores de Produtividade', obs: 'Mês sem regra cadastrada usa a faixa padrão (80%).' },
      { ind: 'Produtividade da Oficina', quadros: 'Gerentes de loja, Consultor de Serviços', onde: 'Indicadores de Produtividade › botão Regras de cores › Produtividade', url: '/pos-vendas/produtividade', tela: 'Indicadores de Produtividade', obs: 'Mês sem regra cadastrada usa a faixa padrão (80%).' },
      { ind: 'Eficiência %', quadros: 'Mecânico', onde: 'Indicadores de Produtividade › botão Regras de cores › Eficiência', url: '/pos-vendas/produtividade', tela: 'Indicadores de Produtividade', obs: 'Mês sem regra cadastrada usa a faixa padrão (80%).' },
    ],
  },
  {
    grupo: 'Auditoria O.S. Aberta',
    linhas: [
      { ind: 'O.S. aberta sem veículo na oficina', quadros: 'Gerentes, Consultor de Serviços', onde: 'BI Auditoria O.S. Aberta › visão Controle › engrenagem › Metas dos indicadores (meta % de O.S. pendentes)', url: '/bi/auditoria-os-aberto?modo=controle', tela: 'Auditoria O.S. Aberta', obs: 'Meta do mês ou, sem ela, a meta geral.' },
      { ind: 'O.S. abertas >= 30 dias / O.S. >= 30 dias (% do Valor)', quadros: 'Gerentes, Consultor de Serviços', onde: 'BI Auditoria O.S. Aberta › visão Controle › engrenagem › Metas dos indicadores (meta % > 30 dias)', url: '/bi/auditoria-os-aberto?modo=controle', tela: 'Auditoria O.S. Aberta', obs: 'Os dois nomes são o mesmo cálculo (só muda o recorte: grupo ou empresa).' },
    ],
  },
  {
    grupo: 'Garantias (BI Garantias DAF)',
    linhas: [
      { ind: 'Garantias com Digitação Atrasada, Aguardando Aprovação DAF (fora do prazo), Aprovada sem Faturamento, Recusadas (fora do prazo), a Receber Vencidas', quadros: 'Setor Garantia, Gerente de Processos e Qualidade, Gerente Geral', onde: 'BI Garantias DAF › visão Controle › engrenagem › Regras e Metas › Com Garantista / Títulos a Receber › Metas da Matriz de KPIs (quantidade máxima por empresa e mês)', url: '/bi/garantias-daf?aba=aberto&modo=controle', tela: 'Garantias DAF', obs: 'Hoje as metas estão zeradas — cadastre-as para aparecerem na Matriz.' },
    ],
  },
  {
    grupo: 'Agendamento e Planos de Manutenção',
    linhas: [
      { ind: 'Taxa de Agendamento (Por Campanhas), Taxa de Agendamento Ativo, Taxa de No-show', quadros: 'Setor de Agendamento, Gerente de Processos e Qualidade', onde: 'BI Agendamento de Serviços › engrenagem verde (Metas dos indicadores)', url: '/bi/agendamento-servicos', tela: 'BI Agendamento de Serviços', obs: '' },
      { ind: 'Contratos novos / Contratos renovados', quadros: 'Consultor de Plano, Gerente Geral, Gerente de Processos e Qualidade', onde: 'BI Planos de Manutenção › aba Resultado › visão Tabela › Editar metas', url: '/bi/planos-manutencao?aba=Resultado', tela: 'BI Planos de Manutenção', obs: '' },
    ],
  },
  {
    grupo: 'Ainda sem fonte (sem meta na Matriz)',
    linhas: [
      { ind: 'Absorção de Pós-Venda / PV, NPS / NPS Fábrica, Auditoria Padrão', quadros: 'Gerentes', onde: 'Esses indicadores ainda não têm fonte ligada — ficam em branco até serem vinculados.', url: null, tela: '', obs: '' },
    ],
  },
]

// ── Seções ──────────────────────────────────────────────────────────────────────────────────────
function Topicos({ itens }) {
  return (
    <ul className="space-y-1">
      {itens.map((t, i) => <li key={i} className="flex gap-2"><span className="text-blue-400">•</span><span>{t}</span></li>)}
    </ul>
  )
}

const SECOES = [
  {
    id: 'visao-geral', titulo: 'Visão geral', icone: BookOpen, grupo: 'Geral',
    conteudo: (
      <>
        <p>A Matriz de KPIs - DAF reúne os indicadores de desempenho em blocos: <b>Resultados</b> (nota final), <b>Bloco 1 - Corporativo</b>, <b>Bloco 2 - Departamental</b>, <b>Bloco 3 - Serviços</b>, <b>Bloco 3 - Peças</b> e <b>Orçamento &amp; Backlog</b>.</p>
        <p className="font-semibold text-slate-800 pt-1">Cabeçalho</p>
        <Topicos itens={[
          <>Linha de cima: etiqueta <b>Dados sincronizados</b> (data e hora da última Atualização) e o botão {Botao.atualizar} Atualizar — a Matriz se atualiza sozinha no 1º acesso do dia.</>,
          <><b>Empresa</b>: Todas, uma ou várias empresas DAF (nome fantasia). Vale para o Bloco 3 (Serviços e Peças); Resultados, Blocos 1 e 2 e Orçamento &amp; Backlog vêm da planilha da Matriz e mostram sempre o grupo todo.</>,
          <><b>Visão</b>: Semanal, Mensal, Trimestral ou Anual.</>,
          <><b>Mês / Período / Ano</b>: calendário {Botao.calendario} com o ano junto. Na Mensal e na Trimestral dá para marcar vários meses/trimestres do mesmo ano.</>,
          <><b>Considerar o dia atual</b> (Bloco 3 - Serviços): desmarcado, o período em andamento vai até ONTEM; marcado, inclui hoje.</>,
          <>Botão {Botao.origem} ao lado do indicador: abre em outra aba a tela de onde o número vem.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'pesos', titulo: 'Distribuição dos pesos', icone: Scale, grupo: 'Geral',
    conteudo: (
      <>
        <p>O peso diz quanto cada item vale na nota. Em cada nível a soma dos pesos deve dar <b>100%</b>. A contribuição de um indicador é o <b>atingimento × peso</b> (atingimento = realizado ÷ meta; nos indicadores "quanto menor, melhor", meta ÷ realizado).</p>

        <p className="font-semibold text-slate-800 pt-2">1. Resultados — peso de cada bloco na nota final</p>
        <Topicos itens={[
          <>Cada vertical soma <b>Companhia (Bloco 1)</b>, <b>Departamento (Bloco 2)</b> e <b>Individual (Bloco 3)</b>. Distribuição atual: <b>20% / 30% / 50%</b>.</>,
          <>A nota de cada bloco (atingimento ponderado) × peso do bloco = contribuição para o resultado final.</>,
          <>Os pesos vêm da planilha da Matriz (aba Resultados, coluna PESO) — ajuste lá; a tela só mostra.</>,
        ]} />

        <p className="font-semibold text-slate-800 pt-2">2. Bloco 1 - Corporativo — peso de cada indicador</p>
        <Topicos itens={[
          <>Coluna <b>Peso</b> de cada indicador (Receita Líquida, Margens, Despesas…). Soma dos indicadores = 100%.</>,
          <>Ajuste na planilha da Matriz (aba Bloco 1, coluna PESO).</>,
        ]} />

        <p className="font-semibold text-slate-800 pt-2">3. Bloco 2 - Departamental — dois pesos</p>
        <Topicos itens={[
          <><b>Peso</b>: quanto cada indicador vale. Digite direto no campo da coluna Peso (grava ao sair do campo, igual ao Bloco 3 - Serviços).</>,
          <><b>Peso da área</b>: a linha <b>Total</b> no fim de cada área (ex.: Total Oficina, Total Auditoria) soma o peso dos indicadores da área; o Contrib. dela soma a contribuição da área no período.</>,
          <>A soma dos pesos de cada aba (Vendas, Pós-Vendas, Peças) fecha em <b>100%</b> — o campo não aceita passar disso; a linha Total da aba fica em vermelho enquanto não chegar a 100%.</>,
          <>Quem pode editar: ação "Editar Peso" do Bloco 2 no Grupo de Acessos.</>,
        ]} />

        <p className="font-semibold text-slate-800 pt-2">4. Bloco 3 (Serviços e Peças) — peso de cada indicador do quadro</p>
        <Topicos itens={[
          <>Cada quadro (Gerente, Consultor, Mecânico, Setor…) tem a coluna <b>Peso</b> editável {Botao.peso} na própria Matriz — só para quem tem a permissão de editar a aba.</>,
          <>Digite o valor e saia do campo (Enter, Tab ou clique fora): grava na hora e vale para todos os usuários e para a Campanha Pós-Venda.</>,
          <>A soma do quadro <b>não pode passar de 100%</b>: valor acima do que falta é recusado com o aviso "Máx. X%".</>,
          <>O <b>Total</b> fica em vermelho {Botao.totalErrado} enquanto não fechar 100% — complete os pesos até ficar normal.</>,
          <>Indicador sem fonte ainda (em branco) pode ficar com peso 0 até ser vinculado.</>,
        ]} />

        <p className="font-semibold text-slate-800 pt-2">Como distribuir (passo a passo)</p>
        <Topicos itens={[
          <>Liste os indicadores do quadro e defina o mais importante para a função.</>,
          <>Dê os maiores pesos aos indicadores de resultado (faturamento, margem) e os menores aos de controle (O.S., garantias).</>,
          <>Exemplo — Consultor de Serviços: Faturamento 30%, Margem Serviços 15%, Margem Peças 15%, Ticket Médio 10%, Produtividade 10%, O.S. sem veículo 10%, O.S. ≥ 30 dias 10% = 100%.</>,
          <>Confira o Total = 100% em todos os quadros antes do fechamento do mês.</>,
        ]} />
      </>
    ),
  },
  {
    id: 'metas-servicos', titulo: 'Bloco 3 - Serviços: onde ajustar as metas', icone: Goal, grupo: 'Bloco 3 - Serviços',
    conteudo: (
      <>
        <p>A meta de cada indicador do Bloco 3 - Serviços <b>não é digitada na Matriz</b>: vem da tela de origem. Use o botão <b>Abrir</b> para ir direto à tela onde a meta é ajustada (abre em outra aba; vale o seu acesso àquela tela). Depois de ajustar, clique em {Botao.atualizar} Atualizar na Matriz para ver a meta nova.</p>
        {METAS_SERVICOS.map(g => (
          <div key={g.grupo} className="pt-2">
            <p className="font-semibold text-slate-800 mb-1">{g.grupo}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border border-slate-200 rounded">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold">Indicador</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Quadros</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Onde ajustar a meta</th>
                    <th className="px-2 py-1.5 w-0" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {g.linhas.map(l => (
                    <tr key={l.ind} className="align-top">
                      <td className="px-2 py-1.5 font-medium text-slate-800">{l.ind}</td>
                      <td className="px-2 py-1.5 text-slate-500">{l.quadros}</td>
                      <td className="px-2 py-1.5">
                        {l.onde}
                        {l.obs && <span className="mt-0.5 flex items-start gap-1 text-[11px] text-slate-400"><Info className="h-3 w-3 mt-0.5 shrink-0" />{l.obs}</span>}
                      </td>
                      <td className="px-2 py-1.5">{l.url && <AbrirTela url={l.url} nome={l.tela} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'empresas', titulo: 'Seletor de empresa', icone: Building2, grupo: 'Bloco 3 - Serviços',
    conteudo: (
      <Topicos itens={[
        <>Com uma ou mais empresas marcadas, aparecem só os quadros que existem nelas (ex.: Chefe de Oficina, Funilaria e Agendamento só em Campo Grande).</>,
        <>Quadros por empresa (Setor de Mecânica, Chefe de Oficina, Setor Garantia) e o Gerente Geral / Gerente de Processos somam as empresas marcadas; percentuais são recalculados sobre a soma.</>,
        <>Os seletores de Consultor, Mecânico e Vendedor listam só quem teve movimento (venda ou serviço) nas empresas marcadas.</>,
        <>Agendamento e Planos de Manutenção continuam do grupo todo (as fontes não trazem a empresa).</>,
      ]} />
    ),
  },
]

const ICONES_GRUPO = { Geral: LayoutDashboard, 'Bloco 3 - Serviços': Wrench }

function Secao({ id, icone: Icone, titulo, conteudo }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
        <span className="p-1.5 bg-blue-50 rounded"><Icone className="h-4 w-4 text-blue-600" /></span>
        {titulo}
      </h2>
      <div className="space-y-2 text-[13px] text-slate-600 leading-relaxed">{conteudo}</div>
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

export default function KpiMatrizManual() {
  const grupos = [...new Set(SECOES.map(s => s.grupo))]
  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" /> Manual de Operação — Matriz de KPIs - DAF
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Como distribuir os pesos de cada bloco e onde ajustar a meta de cada indicador do Bloco 3 - Serviços.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="hidden lg:block w-64 shrink-0 sticky top-4 bg-white border border-slate-200 rounded-lg p-2 shadow-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
          {grupos.map(g => {
            const IconeG = ICONES_GRUPO[g] || BookOpen
            return (
              <div key={g} className="mb-1">
                <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <IconeG className="h-3 w-3" /> {g}
                </p>
                {SECOES.filter(s => s.grupo === g).map(s => <LinkMenu key={s.id} {...s} />)}
              </div>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0 space-y-5">
          {grupos.map(g => (
            <div key={g} className="space-y-5">
              {g !== 'Geral' && (
                <p className="inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-bold uppercase tracking-wide">{g}</p>
              )}
              {SECOES.filter(s => s.grupo === g).map(s => <Secao key={s.id} {...s} />)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
