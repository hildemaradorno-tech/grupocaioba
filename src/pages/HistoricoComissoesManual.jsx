import React from 'react'
import {
  BookOpen, Search, ListChecks, Table2, Eye, Circle, CheckCircle2, ShieldCheck, Truck, Download, RotateCcw, Trash2,
  UserCheck, History, ChevronLeft, ChevronRight, AlertTriangle,
} from 'lucide-react'

// Manual de operação da tela Processamento de Comissões — mesmo modelo dos manuais de Garantias DAF e
// de Comissões DAF/HONDA. Manter os nomes de botões e as regras iguais ao que a tela faz.
const SECOES = [
  { id: 'visao-geral', label: 'Visão geral',               icon: BookOpen },
  { id: 'filtros',     label: 'Período e filtros',         icon: Search },
  { id: 'abas',        label: 'Abas de status',            icon: ListChecks },
  { id: 'tabela',      label: 'Lotes e funcionários',      icon: Table2 },
  { id: 'revisar',     label: 'Revisar e Conferido DP',    icon: ShieldCheck },
  { id: 'processar',   label: 'Processar (TXT)',           icon: Truck },
  { id: 'exportar',    label: 'Exportar PDF / TXT',        icon: Download },
  { id: 'reprocessar', label: 'Reprocessar',               icon: RotateCcw },
  { id: 'voltar',      label: 'Voltar Processamento',      icon: RotateCcw },
  { id: 'excluir',     label: 'Excluir',                   icon: Trash2 },
  { id: 'rescisao',    label: 'Lote individual (rescisão)', icon: UserCheck },
  { id: 'regras',      label: 'Regras da seleção',         icon: AlertTriangle },
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

export default function HistoricoComissoesManual() {
  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" /> Manual de Operação — Processamento de Comissões
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Passo a passo para o DP conferir, processar e exportar as comissões calculadas em Comissões - DAF e Comissões - HONDA,
          e gerar o TXT de pagamento.
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
            <p>Cada setor (de cada empresa) tem um <strong>lote</strong> por período. O lote passa por estas etapas:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong className="text-slate-700">Aguardando Gerente</strong> — calculado e salvo em Comissões - DAF/HONDA; falta o gerente conferir.</li>
              <li><strong className="text-slate-700">Aguardando DP</strong> — o gerente conferiu; o DP revisa cada funcionário e marca Conferido DP.</li>
              <li><strong className="text-slate-700">Aguardando Processamento</strong> — conferido pelo DP; pronto para processar.</li>
              <li><strong className="text-slate-700">Processado</strong> — pagamento processado e TXT gerado.</li>
            </ol>
            <p>
              As ações ficam na barra acima da tabela e só aparecem quando há algo selecionado em que elas valem.
              Botões que alteram dados só aparecem para quem tem a permissão liberada em Grupos de Acessos. O ícone{' '}
              <Btn icon={BookOpen} /> no topo abre este manual numa nova aba.
            </p>
          </Secao>

          <Secao id="filtros" icon={Search} titulo="Período e filtros">
            <Passos itens={[
              <>No canto superior direito, escolha <strong>Ano</strong> e <strong>Mês</strong> (as setas <Btn icon={ChevronLeft} /> <Btn icon={ChevronRight} /> trocam de mês).</>,
              <>Se quiser, filtre por <strong>Empresa</strong>, <strong>Área</strong>, <strong>Setor</strong> e <strong>Responsável</strong>.</>,
              <>Clique em <Btn icon={Search}>Visualizar</Btn>.</>,
            ]} />
            <p>
              A lista traz todos os setores das telas Comissões - DAF e HONDA — inclusive os que ainda não foram calculados no
              período, que aparecem como <strong>Aguardando Gerente</strong> só para sinalizar a pendência.
            </p>
          </Secao>

          <Secao id="abas" icon={ListChecks} titulo="Abas de status">
            <p>Acima da tabela, as abas filtram os lotes pela etapa e mostram a quantidade de cada uma:</p>
            <Itens itens={[
              ['Todos', 'todos os lotes do período.'],
              ['Aguardando Gerente', 'falta o gerente calcular/salvar/conferir.'],
              ['Aguardando DP', 'falta o DP revisar e marcar Conferido DP.'],
              ['Aguardando Processamento', 'pronto para processar.'],
              ['Processamento Parcial', 'parte dos funcionários já processada.'],
              ['Processados', 'lote todo processado.'],
            ]} />
          </Secao>

          <Secao id="tabela" icon={Table2} titulo="Lotes e funcionários">
            <Itens itens={[
              ['Checkbox do lote', 'seleciona o lote e marca junto todos os funcionários dele (desmarcar desmarca todos). Depois dá para desmarcar um funcionário específico.'],
              ['Seta / nome do setor', 'abre e fecha a lista de funcionários do lote, com status, cargo e valor da comissão.'],
              ['Ícone de histórico', 'mostra quem calculou, conferiu, processou e quando.'],
              ['Olho (por funcionário)', 'abre o Detalhe do Cálculo: cada comissão com período, base, percentuais e valor; o ícone de calculadora mostra a conta completa da regra.'],
            ]} />
            <p>
              Status de cada funcionário: <strong>Aguardando Processamento</strong>, <strong>Processado</strong> ou{' '}
              <strong>Aguardando Reprocessamento</strong> (liberado para o gerente corrigir).
            </p>
          </Secao>

          <Secao id="revisar" icon={ShieldCheck} titulo="Revisar e Conferido DP">
            <Passos itens={[
              <>Abra o lote em <strong>Aguardando DP</strong> e revise cada funcionário (use o <Btn icon={Eye} /> para ver o detalhe).</>,
              <>Na coluna <strong>Revisado</strong>, clique no <Btn icon={Circle} /> de cada funcionário conferido — ele vira <Btn icon={CheckCircle2} />.</>,
              <>Com todos revisados, marque o lote e clique em <Btn icon={ShieldCheck}>Conferido DP</Btn>. O lote vai para <strong>Aguardando Processamento</strong>.</>,
            ]} />
            <Aviso>O Conferido DP só libera quando todos os funcionários do lote estão marcados como revisados.</Aviso>
          </Secao>

          <Secao id="processar" icon={Truck} titulo="Processar (TXT de pagamento)">
            <Passos itens={[
              <>Marque os lotes (ou só alguns funcionários) em <strong>Aguardando Processamento</strong>.</>,
              <>Clique em <Btn icon={Truck}>Processar</Btn> e confirme.</>,
            ]} />
            <p>
              O status muda para <strong>Processado</strong> e é baixado <strong>um único TXT</strong> com tudo o que foi processado
              (vários lotes ou funcionários juntos). Processando só parte do lote, ele fica como <strong>Processamento Parcial</strong>.
            </p>
            <Itens itens={[
              ['Rubrica e Tipo do Processo', 'vêm da Política de Comissão; comissão sem os dois fica de fora do TXT e a tela avisa quais foram.'],
              ['Mesmo CNPJ', 'o Processar só aparece quando tudo o que está selecionado é da mesma empresa (CNPJ).'],
            ]} />
          </Secao>

          <Secao id="exportar" icon={Download} titulo="Exportar PDF / TXT">
            <Passos itens={[
              <>Marque os lotes ou funcionários.</>,
              <>Clique em <Btn icon={Download}>Exportar</Btn> e escolha <strong>Salvar em PDF</strong> ou <strong>Salvar em TXT</strong>.</>,
            ]} />
            <Itens itens={[
              ['Salvar em PDF', 'mesmo layout das telas de Comissões — um setor por seção, agrupado por cargo, com total por funcionário e do setor. Disponível a partir de Aguardando Processamento.'],
              ['Salvar em TXT', 'baixa de novo o TXT de pagamento. Só aparece quando tudo o que está selecionado já foi processado.'],
            ]} />
          </Secao>

          <Secao id="reprocessar" icon={RotateCcw} titulo="Reprocessar">
            <p>Usado quando um valor precisa ser corrigido depois da conferência do gerente. Vale para todos os lotes/funcionários selecionados que ainda não foram processados.</p>
            <Itens itens={[
              ['Lote inteiro marcado', 'o lote volta uma etapa (Aguardando Processamento → Aguardando DP → Aguardando Gerente).'],
              ['Só alguns funcionários', 'ficam como Aguardando Reprocessamento — o gerente recalcula e salva só eles em Comissões - DAF/HONDA, e o resto do lote fica como está.'],
            ]} />
          </Secao>

          <Secao id="voltar" icon={RotateCcw} titulo="Voltar Processamento">
            <p>
              Desfaz o processamento dos lotes/funcionários selecionados que já estão <strong>Processados</strong> — eles voltam para
              <strong> Aguardando Processamento</strong>. Use quando o pagamento precisa ser refeito.
            </p>
          </Secao>

          <Secao id="excluir" icon={Trash2} titulo="Excluir">
            <p>
              <Btn icon={Trash2}>Excluir</Btn> apaga os valores calculados dos lotes marcados que ainda estão em{' '}
              <strong>Aguardando Gerente</strong>, para o período ser calculado do zero. A confirmação lista os lotes que serão apagados.
            </p>
          </Secao>

          <Secao id="rescisao" icon={UserCheck} titulo="Lote individual (rescisão)">
            <p>
              Comissões calculadas para um funcionário só em Comissões - DAF/HONDA (ex: desligado no meio do mês) aparecem numa linha
              própria, com o nome dele embaixo do setor (<em>— lote individual</em>) e o selo <strong>Rescisão</strong> quando for o caso.
            </p>
            <p>Passa pelo mesmo fluxo (Conferido DP → Processar) e o TXT/PDF sai só dele, com o nome do funcionário no arquivo.</p>
          </Secao>

          <Secao id="regras" icon={AlertTriangle} titulo="Regras da seleção">
            <Itens itens={[
              ['Empresas diferentes', 'se a seleção misturar empresas de CNPJs diferentes, nenhuma ação aparece — selecione uma empresa por vez.'],
              ['Somente Visualização', 'setores liberados só para consulta (Grupos de Acessos) não têm checkbox nem ações.'],
              ['Pendentes sem cálculo', 'setores que ainda não foram calculados aparecem só como aviso, sem ações.'],
            ]} />
            <p className="flex items-center gap-1.5 text-[12px] text-slate-500"><History className="h-3.5 w-3.5" /> Tudo o que é feito no lote fica registrado no histórico dele.</p>
          </Secao>

        </div>
      </div>
    </div>
  )
}
