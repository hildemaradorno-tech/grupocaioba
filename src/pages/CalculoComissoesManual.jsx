import React from 'react'
import {
  BookOpen, CheckCircle2, RefreshCw, CalendarDays, Building2, PlayCircle, Calculator, Save, ShieldCheck,
  FileDown, UserCheck, Trash2, History, Workflow, Lock, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react'

// Manual de operação das telas Comissões - DAF e Comissões - HONDA (mesma tela, muda só o grupo de
// empresas). Mesmo modelo do manual de Garantias DAF. Manter os nomes de botões e as regras iguais
// ao que a tela faz.
const SECOES = [
  { id: 'visao-geral',   label: 'Visão geral',                 icon: BookOpen },
  { id: 'antes',         label: 'Antes de começar',            icon: CheckCircle2 },
  { id: 'periodo',       label: 'Período',                     icon: CalendarDays },
  { id: 'empresa-setor', label: 'Empresa e Setor',             icon: Building2 },
  { id: 'calcular',      label: 'Calcular',                    icon: PlayCircle },
  { id: 'salvar',        label: 'Salvar',                      icon: Save },
  { id: 'conferir',      label: 'Conferir',                    icon: ShieldCheck },
  { id: 'exportar',      label: 'Exportar PDF',                icon: FileDown },
  { id: 'individual',    label: 'Um funcionário (rescisão)',   icon: UserCheck },
  { id: 'excluir',       label: 'Excluir histórico',           icon: Trash2 },
  { id: 'status',        label: 'Status do setor',             icon: History },
  { id: 'proximas',      label: 'Próximas etapas',             icon: Workflow },
]

function Secao({ id, icon: Icon, titulo, children }) {
  return (
    <section id={id} className="scroll-mt-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800 mb-3">
        <span className="p-1.5 bg-indigo-50 rounded"><Icon className="h-4 w-4 text-indigo-600" /></span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[13px] text-slate-600 leading-relaxed">{children}</div>
    </section>
  )
}

function Passos({ itens }) {
  return (
    <ol className="space-y-2">
      {itens.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Itens({ itens }) {
  return (
    <ul className="space-y-1.5">
      {itens.map(([nome, desc]) => (
        <li key={nome} className="flex gap-2">
          <span className="text-indigo-400 mt-0.5">•</span>
          <span><strong className="text-slate-700">{nome}</strong> — {desc}</span>
        </li>
      ))}
    </ul>
  )
}

function Btn({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-semibold align-middle">
      {Icon && <Icon className="h-3 w-3" />}{children}
    </span>
  )
}

function Aviso({ children }) {
  return (
    <p className="flex items-start gap-1.5 text-[12px] text-slate-500">
      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export default function CalculoComissoesManual() {
  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" /> Manual de Operação — Comissões DAF e HONDA
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Passo a passo para calcular, salvar, conferir e exportar as comissões do período. As telas Comissões - DAF e
          Comissões - HONDA funcionam do mesmo jeito — muda só o grupo de empresas.
        </p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="hidden lg:block w-52 shrink-0 sticky top-4 bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
          {SECOES.map(({ id, label, icon: Icon }) => (
            <a key={id} href={`#${id}`}
              onClick={e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
              <Icon className="h-3.5 w-3.5" /> {label}
            </a>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-5">

          <Secao id="visao-geral" icon={BookOpen} titulo="Visão geral">
            <p>A comissão de cada setor passa por estas etapas, nesta ordem:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong className="text-slate-700">Calcular</strong> — o sistema lê as vendas/serviços do período e aplica as Políticas de Comissão de cada cargo.</li>
              <li><strong className="text-slate-700">Salvar</strong> — grava os valores; o setor fica <strong>Aguardando Gerente</strong>.</li>
              <li><strong className="text-slate-700">Conferir</strong> — o gerente confirma os valores; o setor vai para <strong>Aguardando DP</strong> e trava.</li>
              <li><strong className="text-slate-700">Processamento de Comissões</strong> — o DP confere e processa, gerando o TXT de pagamento.</li>
            </ol>
            <Itens itens={[
              ['Comissões - DAF', 'empresas da Caiobá Trucks.'],
              ['Comissões - HONDA', 'empresas da Caiobá Motos.'],
            ]} />
            <p>
              No cabeçalho ficam o botão de férias (<Btn icon={CheckCircle2}>Férias Atualizadas</Btn> ou <Btn icon={RefreshCw}>Atualizar Férias</Btn>) e
              o <Btn icon={BookOpen}>Manual</Btn>, que abre este manual numa nova aba. As ações do fluxo ficam no card <strong>Etapas do Processamento</strong>.
              Botões que alteram dados só aparecem para quem tem a permissão liberada em Grupos de Acessos.
            </p>
          </Secao>

          <Secao id="antes" icon={CheckCircle2} titulo="Antes de começar">
            <Itens itens={[
              ['Férias', 'o botão verde Férias Atualizadas indica que o arquivo de férias é do mês do período. Se aparecer o amarelo Atualizar Férias, clique nele e atualize — enquanto isso o Calcular Comissões fica bloqueado.'],
              ['Quem aparece', 'só funcionários ativos com Política de Comissão configurada para o cargo (Regras de Comissões → Política de Comissões).'],
              ['Metas', 'comissões e prêmios por % de meta precisam da meta do mês publicada no Planejamento de Metas.'],
            ]} />
          </Secao>

          <Secao id="periodo" icon={CalendarDays} titulo="Período">
            <Passos itens={[
              <>Preencha <strong>Data Início</strong> e <strong>Data Fim</strong>. As duas datas precisam estar <strong>no mesmo mês</strong>.</>,
              <>Use <Btn icon={ChevronLeft} /> e <Btn icon={ChevronRight} /> para ir ao mês anterior ou seguinte — o período já vem do dia 1 ao último dia.</>,
            ]} />
            <p>Cada tela (DAF e HONDA) guarda o seu próprio período.</p>
          </Secao>

          <Secao id="empresa-setor" icon={Building2} titulo="Empresa e Setor">
            <Passos itens={[
              <>Escolha a <strong>Empresa</strong>.</>,
              <>Clique na aba do <strong>Setor</strong>. As ações (Calcular, Salvar, Conferir, Excluir) só liberam com <strong>um setor marcado</strong> — cada setor tem o seu próprio lote. Clicar de novo no setor marcado desmarca.</>,
            ]} />
            <Itens itens={[
              ['Bolinha amarela', 'setor ainda não fechado (Aguardando Gerente ou nunca calculado).'],
              ['Cadeado verde', 'setor já conferido ou processado.'],
            ]} />
            <p>Sem setor marcado, a tabela mostra todos os setores juntos, só para consulta.</p>
          </Secao>

          <Secao id="calcular" icon={PlayCircle} titulo="Calcular">
            <Passos itens={[
              <>Com empresa, setor e período escolhidos, clique em <Btn icon={PlayCircle}>Calcular Comissões (N)</Btn> — N é a quantidade de comissões que serão calculadas.</>,
              <>Confira cada linha: Base Comissão, percentuais (% Serviços, % Peças, % Total), R$ Valor e Valor Comissão. O total de cada funcionário aparece no fim do bloco dele.</>,
              <>Clique no ícone <Btn icon={Calculator} /> ao lado da comissão para ver o detalhe: período apurado, valor da base, percentual ou faixa da regra aplicada e o valor final.</>,
            ]} />
            <Itens itens={[
              ['Sem Meta', 'a regra é por % de meta e não há meta publicada para o funcionário no mês — publique a meta e calcule de novo.'],
              ['Férias o mês inteiro', 'entra com valor zerado, só para ficar registrado.'],
              ['Férias no meio do mês', 'quem não recebe comissão nas férias tem esses dias tirados do período apurado.'],
            ]} />
          </Secao>

          <Secao id="salvar" icon={Save} titulo="Salvar">
            <Passos itens={[
              <>Clique em <Btn icon={Save}>Salvar Comissões</Btn>. Os valores ficam gravados e o setor passa para <strong>Aguardando Gerente</strong>.</>,
            ]} />
            <p>Enquanto estiver em Aguardando Gerente, dá para calcular e salvar de novo quantas vezes precisar — o valor anterior é substituído.</p>
          </Secao>

          <Secao id="conferir" icon={ShieldCheck} titulo="Conferir (Gerente)">
            <Passos itens={[
              <>Revise os valores do setor.</>,
              <>Clique em <Btn icon={ShieldCheck}>Conferir Comissões</Btn>. O setor passa para <strong>Aguardando DP</strong> e fica travado (<Btn icon={Lock}>cadeado</Btn>).</>,
            ]} />
            <p><strong>Ver histórico</strong> (no card Etapas do Processamento) mostra quem calculou, salvou, conferiu e processou, e quando.</p>
            <Aviso>
              Depois de conferido não dá mais para recalcular. Para corrigir, peça ao DP/RH para liberar o reprocessamento em
              Processamento de Comissões — os funcionários liberados voltam a ficar recalculáveis aqui.
            </Aviso>
          </Secao>

          <Secao id="exportar" icon={FileDown} titulo="Exportar PDF (opcional)">
            <Passos itens={[
              <>Clique em <Btn icon={FileDown}>Exportar</Btn>. Abre a lista dos setores já <strong>conferidos</strong> (fechados).</>,
              <>Marque os setores desejados, ou use <strong>Selecionar todos</strong>.</>,
              <>Clique em <strong>Salvar PDF</strong>.</>,
            ]} />
            <p>O PDF sai por setor, agrupado por cargo, com a regra de cada comissão, o total de cada funcionário e o total do setor.</p>
            <Itens itens={[
              ['Só setores conferidos', 'setores em Aguardando Gerente não aparecem para exportar.'],
              ['Sem empresa marcada', 'a lista traz os setores fechados de todas as empresas da tela.'],
            ]} />
          </Secao>

          <Secao id="individual" icon={UserCheck} titulo="Um funcionário só (ex: rescisão)">
            <p>Use quando precisar fechar a comissão de uma pessoa separada do setor — por exemplo, quem foi desligado no meio do mês.</p>
            <Passos itens={[
              <>Ajuste <strong>Data Início</strong> e <strong>Data Fim</strong> para o período dele.</>,
              <>No seletor <strong>Funcionário</strong> (abaixo das abas de Setor), escolha a pessoa. A lista vem em ordem alfabética e mostra quem esteve ativo no período, inclusive desligados (<em>desligado em dd/mm/aaaa</em>). O setor dele é marcado sozinho.</>,
              <>A caixa <strong>Rescisão</strong> já vem marcada quando ele tem data de demissão.</>,
              <>Clique em <Btn icon={PlayCircle}>Calcular Comissões</Btn>, depois <Btn icon={Save}>Salvar Comissões</Btn> e <Btn icon={ShieldCheck}>Conferir Comissões</Btn>. Se a caixa Rescisão estiver desmarcada, ao conferir a tela pergunta se é rescisão.</>,
              <>Para o PDF só dele, clique em <Btn icon={FileDown}>Exportar</Btn> — libera assim que estiver calculado.</>,
            ]} />
            <Itens itens={[
              ['Lote próprio', 'tudo fica num lote só dele, separado do setor — o setor continua livre para ser calculado depois.'],
              ['Volta para o setor', 'escolha "Todos — cálculo do setor". Quem já tem lote próprio fica de fora do cálculo do setor e aparece como "Rescisão · …" com a etapa em que está.'],
            ]} />
            <Aviso>Se ele já estiver num setor conferido ou processado, o cálculo individual é bloqueado — libere o reprocessamento dele antes.</Aviso>
          </Secao>

          <Secao id="excluir" icon={Trash2} titulo="Excluir histórico">
            <p>
              <Btn icon={Trash2}>Excluir Histórico</Btn> apaga os valores salvos do setor no período e o lote, para começar do zero.
              Só funciona enquanto o setor estiver em <strong>Aguardando Gerente</strong>.
            </p>
          </Secao>

          <Secao id="status" icon={History} titulo="Status do setor">
            <Itens itens={[
              ['Pendente', 'ainda não calculado.'],
              ['Aguardando Gerente', 'calculado e salvo; falta o gerente conferir.'],
              ['Aguardando DP', 'conferido pelo gerente; falta o DP conferir em Processamento de Comissões.'],
              ['Aguardando Processamento', 'conferido pelo DP; falta processar o pagamento.'],
              ['Processado', 'pagamento processado (TXT gerado).'],
              ['Aguardando Reprocessamento', 'liberado pelo DP/RH para corrigir; recalcule e salve de novo.'],
            ]} />
          </Secao>

          <Secao id="proximas" icon={Workflow} titulo="Próximas etapas (Processamento de Comissões)">
            <Passos itens={[
              <>O DP revisa os funcionários e marca <strong>Conferido DP</strong>.</>,
              <><strong>Processar</strong> muda o status para Processado e baixa o TXT de pagamento.</>,
              <>O TXT e o PDF podem ser baixados de novo em <strong>Exportar</strong>.</>,
            ]} />
          </Secao>

        </div>
      </div>
    </div>
  )
}
