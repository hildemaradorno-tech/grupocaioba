import React, { useEffect, useState } from 'react'
import {
  BookOpen, Settings, ClipboardCheck, FileText, Download, Pencil, ArrowUp, RotateCcw, CalendarClock, Tag, FileDown,
  Trash2, ListChecks, Database, Loader2, ShieldCheck, History, Search, List, Save, ThumbsUp, AlertTriangle,
} from 'lucide-react'
import { apiService } from '../../services/api'

// Manual de operação da Auditoria O.S. Aberta — visão CONTROLE. Abre numa aba nova pelo botão
// "Manual de operação" do cabeçalho do BI (só na visão Controle). Mesmo modelo do manual do Garantias DAF.
const SECOES = [
  { id: 'visao-geral',  label: 'Visão geral',              icon: BookOpen },
  { id: 'etapas',       label: 'Etapas da auditoria',      icon: ListChecks },
  { id: 'inserir',      label: 'Inserir auditoria',        icon: Download },
  { id: 'conferencia',  label: 'Modo Conferência',         icon: ClipboardCheck },
  { id: 'relatorio',    label: 'Modo Relatório',           icon: FileText },
  { id: 'responder',    label: 'Responder as O.S.',        icon: Save },
  { id: 'reincidencia', label: 'O.S. na Auditoria',        icon: History },
  { id: 'engrenagem',   label: 'Engrenagem (opções)',      icon: Settings },
  { id: 'reabertura',   label: 'Regra de reabertura',      icon: RotateCcw },
  { id: 'fontes',       label: 'Fontes de dados',          icon: Database },
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

function Sub({ titulo, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">{titulo}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

// "Na Oficina" sempre em negrito nas descrições do manual
const negritoNaOficina = (texto) => typeof texto !== 'string' ? texto
  : texto.split(/(Na Oficina)/).map((parte, i) => (parte === 'Na Oficina' ? <strong key={i} className="text-slate-700">Na Oficina</strong> : parte))

function Itens({ itens }) {
  return (
    <ul className="space-y-1.5">
      {itens.map(([nome, desc]) => (
        <li key={nome} className="flex gap-2">
          <span className="text-indigo-400 mt-0.5">•</span>
          <span><strong className="text-slate-700">{nome}</strong> — {negritoNaOficina(desc)}</span>
        </li>
      ))}
    </ul>
  )
}

function Valor({ children }) {
  return <strong className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold whitespace-nowrap">{children}</strong>
}

function Btn({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-semibold align-middle">
      {Icon && <Icon className="h-3 w-3" />}{children}
    </span>
  )
}

function Selo({ cls, children }) {
  return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap align-middle ${cls}`}>{children}</span>
}

export default function AuditoriaOsAbertoManual() {
  const [cfg, setCfg] = useState(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    apiService.getAuditoriaConfig().then(setCfg).catch(() => setCfg(null)).finally(() => setCarregando(false))
  }, [])

  // Regra de reabertura em vigor (engrenagem → Programar auditorias → Regra de reabertura)
  const janelaDias = Number(cfg?.reabertura_janela_dias ?? 1)
  const horas = Number(cfg?.reabertura_horas ?? 8)
  const iniExp = cfg?.expediente_inicio || '08:00'
  const fimExp = cfg?.expediente_fim || '18:00'
  const pularFds = cfg?.reabertura_pular_fds ?? true

  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" /> Manual de Operação — Auditoria O.S. Aberta - Visão Controle
        </h1>
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
            <p>
              A Auditoria O.S. Aberta confere, a cada auditoria, as ordens de serviço que estão abertas em uma empresa: se o
              veículo está mesmo na oficina e quais O.S. estão com mais de 30 dias paradas na oficina.
            </p>
          </Secao>

          <Secao id="etapas" icon={ListChecks} titulo="Etapas da auditoria">
            <p>Toda auditoria passa pelas etapas abaixo, nesta ordem. A etapa define qual tabela aparece na tela.</p>
            <ol className="list-decimal pl-5 space-y-1.5">
              <li><strong className="text-slate-700">Modo Conferência</strong> — logo depois de inserida. Confere-se, O.S. por O.S., se o veículo está na oficina (<strong>Na Oficina</strong> = Sim ou Não).</li>
              <li><strong className="text-slate-700">A Responder</strong> — depois do <Btn icon={ShieldCheck}>Conferido</Btn>. As O.S. pendentes devem ser respondidas até o <strong>prazo</strong> mostrado no cartão (com contagem regressiva).</li>
              <li><strong className="text-slate-700">Auditoria encerrada</strong> — por <Btn>Concluir respostas →</Btn> ou automaticamente quando o prazo vence:
                <Itens itens={[
                  ['Respondido Total', 'todas as O.S. pendentes com Situação, Observação e Dt. Previsão.'],
                  ['Respondido Parcial', 'só algumas pendentes respondidas quando o prazo venceu.'],
                  ['Sem Resposta', 'nenhuma pendente respondida quando o prazo venceu.'],
                ]} />
              </li>
            </ol>
            <p>
              Numa auditoria encerrada as respostas ficam <strong>só para leitura para todos, inclusive o Admin</strong>.
            </p>
            <p>
              O ícone de <Btn icon={History}>Histórico</Btn> ao lado do status abre a linha do tempo de fechamentos e reaberturas da
              auditoria (quem, quando, status anterior e novo prazo).
            </p>
          </Secao>

          <Secao id="inserir" icon={Download} titulo="Inserir auditoria">
            <p>
              Pela engrenagem → <Btn icon={Download}>Inserir auditoria</Btn>, com a empresa já escolhida. A janela mostra de onde as
              O.S. serão lidas e pede o <strong>Responsável pela auditoria</strong> (funcionários ativos da empresa com cargo nos
              agrupamentos Gerentes ou Gerente Geral). Ao confirmar, todas as O.S. abertas daquele momento são gravadas como uma
              auditoria nova, com a data de hoje, já no Modo Conferência.
            </p>
            <Itens itens={[
              ['Caiobá Trucks', 'lê o arquivo ROF001_OSABERTA do SharePoint (a janela mostra a data/hora em que o arquivo foi atualizado). Entram todas as O.S. do arquivo, qualquer que seja o status delas.'],
              ['Caiobá Motos', 'lê o relatório de O.S. em aberto direto da API do MicroWork.'],
            ]} />
            <p>
              Auditorias também podem ser geradas sozinhas, em dias e horários fixos, pela engrenagem →{' '}
              <Btn icon={CalendarClock}>Programar auditorias</Btn>. A programação <strong>não gera</strong> uma auditoria nova se a
              empresa ainda tiver uma auditoria em Conferência ou A Responder.
            </p>
          </Secao>

          <Secao id="conferencia" icon={ClipboardCheck} titulo="Modo Conferência">
            <p>
              Mostra <strong>todas</strong> as O.S. da auditoria. A coluna <strong>Na Oficina</strong> começa em branco (—, não conferida); marque <strong>Sim</strong> ou{' '}
              <strong>Não</strong> em cada O.S.
            </p>
            <Itens itens={[
              ['Pendenciar', 'marque as O.S. na caixinha de seleção (ou todas as visíveis) e clique no botão vermelho Pendenciar: todas as marcadas ficam com Na Oficina = Não de uma vez.'],
              ['Conferido', 'só libera quando TODAS as O.S. estão com Na Oficina = Sim ou Não (o balão mostra quantas faltam). Ao clicar, abre a janela do prazo de resposta (padrão: amanhã às 15:00, pode alterar) e a auditoria passa para A Responder.'],
            ]} />
          </Secao>

          <Secao id="relatorio" icon={FileText} titulo="Modo Relatório (A Responder e encerradas)">
            <p>
              Mostra só as O.S. <strong>pendentes</strong>: com <Valor>30 dias ou mais</Valor> desde a criação ou com{' '}
              <strong>Na Oficina = Não</strong>. O botão <Btn icon={List}>Ver todas</Btn> inclui as que não são pendentes. <strong>Na
              Oficina</strong> fica travado (só se altera no Modo Conferência ou em Editar auditoria).
            </p>
            <Sub titulo="Primeira coluna (Situação)">
              <Itens itens={[
                ['Responder', 'pendente ainda sem resposta (auditoria em andamento).'],
                ['Respondido', 'pendente com Situação, Observação e Dt. Previsão preenchidas.'],
                ['Sem resposta', 'pendente sem resposta numa auditoria já encerrada.'],
                ['👍', 'O.S. que não é pendente (aparece com Ver todas).'],
              ]} />
              <p className="flex flex-wrap gap-2">
                <Selo cls="bg-red-100 text-red-700 border border-red-200">Responder</Selo>
                <Selo cls="bg-green-100 text-green-700 border border-green-200">Respondido</Selo>
                <Selo cls="bg-slate-900 text-white">Sem resposta</Selo>
                <span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700"><ThumbsUp className="h-3 w-3" /></span>
              </p>
            </Sub>
          </Secao>

          <Secao id="responder" icon={Save} titulo="Responder as O.S.">
            <p>
              Com a auditoria em <strong>A Responder</strong>, as colunas <strong>Situação</strong> (lista do cadastro de situações),{' '}
              <strong>Observação</strong> e <strong>Dt. Previsão</strong> viram campos na própria tabela. Preencha os três e clique no
              ícone <Btn icon={Save}>gravar</Btn> da coluna Resposta:
            </p>
            <Itens itens={[
              ['Roxo', 'há alteração para gravar.'],
              ['Verde (apagado)', 'O.S. já respondida e sem alteração.'],
              ['Resposta incompleta', 'se faltar algum dos três campos, abre uma janela dizendo o que falta; nada é gravado até completar.'],
            ]} />
            <p>
              <Btn>Concluir respostas →</Btn> (na linha da busca, à direita) encerra a auditoria como <strong>Respondido Total</strong>. Só
              libera quando nenhuma pendente está sem resposta (o balão mostra quantas faltam).
            </p>
          </Secao>

          <Secao id="reincidencia" icon={History} titulo="O.S. na Auditoria (Nova × Reincidência)">
            <p>Coluna logo depois de Dt. Previsão no Modo Relatório:</p>
            <Itens itens={[
              ['Nova', 'a O.S. não apareceu em nenhuma auditoria anterior da mesma empresa.'],
              ['Reincidência', 'a mesma O.S. (pelo número) já apareceu numa auditoria anterior da empresa.'],
            ]} />
            <p className="flex flex-wrap gap-2">
              <Selo cls="bg-sky-100 text-sky-700 border border-sky-200">Nova</Selo>
              <Selo cls="bg-orange-100 text-orange-700 border border-orange-200">Reincidência</Selo>
            </p>
            <p>
              Ao lado de Reincidência, o ícone <Btn icon={History}>histórico</Btn> abre em quais auditorias anteriores a O.S. apareceu, da
              mais recente para a mais antiga, com <strong>Na Oficina</strong>, Situação, Observação e Dt. Previsão de cada uma. Só contam as auditorias{' '}
              <strong>anteriores</strong> à que está aberta — a primeira auditoria de cada empresa tem todas as O.S. como Nova.
            </p>
          </Secao>

          <Secao id="engrenagem" icon={Settings} titulo="Engrenagem (opções da auditoria)">
            <p>
              Só aparecem as opções liberadas para o seu grupo; sem nenhuma, a engrenagem some. Uma opção liberada mas indisponível no
              momento fica apagada, com o motivo escrito embaixo (ex.: "Selecione uma auditoria").
            </p>
            <Itens itens={[
              ['Inserir auditoria', 'importa as O.S. abertas da empresa (ver Inserir auditoria).'],
              ['Editar auditoria', 'fora do Modo Conferência: altera Na Oficina das O.S., o Responsável pelas respostas e, em A Responder, a data/hora de fechamento (prazo). As alterações ficam em rascunho até Salvar. Auditoria encerrada: só o Admin.'],
              ['Voltar etapa', 'só em A Responder: volta para o Modo Conferência. Nada do que foi preenchido é apagado.'],
              ['Reabrir auditoria', 'só em auditoria encerrada: volta para A Responder com um novo prazo (ver Regra de reabertura).'],
              ['Programar auditorias', 'geração automática por dia da semana e horário, por empresa, e a Regra de reabertura.'],
              ['Situações de auditoria', 'cadastro das situações usadas nas respostas (nome, cor e ativo).'],
              ['Exportar', 'abre PDF ou Excel com a tabela exatamente como está na tela.'],
              ['Excluir auditoria', 'apaga a auditoria escolhida e todas as O.S. dela.'],
            ]} />
            <p className="flex items-start gap-1.5 text-[12px] text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              Cada O.S. guarda o nome da situação no momento da resposta: renomear uma situação no cadastro não muda as auditorias já
              gravadas, e excluir uma situação que está em uso deixa essas O.S. sem resposta.
            </p>
          </Secao>

          <Secao id="reabertura" icon={RotateCcw} titulo="Regra de reabertura">
            <p>
              Configurada na engrenagem → <Btn icon={CalendarClock}>Programar auditorias</Btn> → Regra de reabertura. Vale para quem tem
              a ação <strong>Reabrir</strong> no grupo.
            </p>
            {carregando ? (
              <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando regra...</p>
            ) : (
              <>
                <Itens itens={[
                  ['Pode reabrir até', <>o fim do expediente do <Valor>{janelaDias} {janelaDias === 1 ? 'dia' : 'dias'}{pularFds ? (janelaDias === 1 ? ' útil' : ' úteis') : ''}</Valor> depois do fechamento{janelaDias === 0 ? ' (0 = só no mesmo dia)' : ''}.</>],
                  ['Prazo máximo da nova resposta', <><Valor>{horas} {horas === 1 ? 'hora' : 'horas'}</Valor> de expediente contadas a partir da reabertura — o usuário escolhe qualquer data/hora até esse limite.</>],
                  ['Expediente', <><Valor>{iniExp} às {fimExp}</Valor>{pularFds ? ', sem contar sábado e domingo' : ', contando também o fim de semana'}.</>],
                  ['Quantas vezes', 'só a última auditoria da empresa e só uma vez (por usuário que não é Admin).'],
                ]} />
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Exemplo</p>
                  <p>
                    Auditoria fechada numa quinta-feira: pode ser reaberta até {janelaDias === 0 ? <strong>a própria quinta-feira</strong> : janelaDias === 1 ? <strong>sexta-feira</strong> : <strong>{janelaDias} {pularFds ? 'dias úteis' : 'dias'} depois</strong>} às{' '}
                    <strong>{fimExp}</strong>. Na reabertura, as {horas} horas do prazo máximo contam só de {iniExp} às {fimExp}: o que
                    passar do fim do expediente continua no {pularFds ? 'próximo dia útil (de sexta pula para segunda)' : 'dia seguinte'}.
                  </p>
                </div>
              </>
            )}
          </Secao>

          <Secao id="fontes" icon={Database} titulo="Fontes de dados">
            <Itens itens={[
              ['ROF001_OSABERTA.xlsx (SharePoint)', 'O.S. abertas das empresas Caiobá Trucks, extraídas do Dealer.net pelo RPA.'],
              ['API MicroWork', 'relatório de O.S. em aberto das empresas Caiobá Motos.'],
            ]} />
            <p className="flex items-start gap-1.5 text-[12px] text-slate-500">
              <Search className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
              Cada auditoria é uma fotografia das O.S. abertas no momento em que foi inserida; auditorias anteriores não mudam quando o
              arquivo ou a API são atualizados.
            </p>
          </Secao>

        </div>
      </div>
    </div>
  )
}
