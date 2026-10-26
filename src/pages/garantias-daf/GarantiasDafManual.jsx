import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Settings, Activity, FileText, DollarSign, Receipt, Edit2, ListChecks, Database, Loader2,
  RefreshCw, Eye, BarChart2, Search, AlertTriangle, ShieldCheck, FileSignature,
} from 'lucide-react'
import { apiService } from '../../services/api'

const SECOES = [
  { id: 'visao-geral',  label: 'Visão geral',               icon: BookOpen },
  { id: 'regras',       label: 'Regras do Sistema',         icon: Settings },
  { id: 'na-oficina',   label: 'Na Oficina',                icon: Activity },
  { id: 'garantista',   label: 'com Garantista',            icon: FileText },
  { id: 'editar',       label: 'Editar Garantia',           icon: Edit2 },
  { id: 'historico',    label: 'Histórico de O.S.',         icon: Receipt },
  { id: 'receber',      label: 'Garantias DAF a Receber',   icon: DollarSign },
  { id: 'nota-debito',  label: 'Nota de Débito',            icon: FileSignature },
  { id: 'status',       label: 'Status da garantia',        icon: ListChecks },
  { id: 'permissoes',   label: 'Permissões',                icon: ShieldCheck },
  { id: 'fontes',       label: 'Fontes de dados',           icon: Database },
]

const STATUS_LEGENDA = [
  ['A', 'Em Análise no Setor de Garantia', 'A Digitar / Digitação Atrasada'],
  ['B', 'Em processo de consideração', 'Aguardando Aprovação DAF'],
  ['C', 'Processo Fora de Garantia (aceita)', 'Aguardando Aprovação DAF'],
  ['G', 'Reivindicação apresentada', 'Aguardando Aprovação DAF'],
  ['M', 'Reivindicação para aprovação por matriz', 'Aguardando Aprovação DAF'],
  ['N', 'Para análise da Subsidiária da DAF', 'Aguardando Aprovação DAF'],
  ['P', 'Enviada para ASI', 'Aguardando Aprovação DAF'],
  ['Q', 'Processo avaliado, aguardando material (peças)', 'Aguardando Aprovação DAF'],
  ['R', 'Para avaliação da subsidiária da DAF', 'Aguardando Aprovação DAF'],
  ['S', 'Processo selecionado', 'Aguardando Aprovação DAF'],
  ['T', 'Para análise do escritório da DAF', 'Aguardando Aprovação DAF'],
  ['U', 'Processo em fase de crédito para a concessionária', 'Aguardando Aprovação DAF'],
  ['V', 'Valor de reembolso calculado', 'Aguardando Aprovação DAF'],
  ['W', 'Processo aguardando material ou informação', 'Aguardando Aprovação DAF'],
  ['X', 'Pronta para análise do escritório da DAF', 'Aguardando Aprovação DAF'],
  ['Y', 'Processo em fase de crédito para a concessionária', 'Aguardando Aprovação DAF'],
  ['FA', 'Liberado para o Financeiro — APROVADO', 'Aprovada'],
  ['FR', 'Liberado para o Financeiro — RECUSADO', 'Recusas'],
  ['Z', 'Processo recusado (automático)', 'Recusas'],
  ['E', 'Nota Fiscal Emitida', 'Histórico de O.S.'],
  ['F', 'Enviado para Fábrica', 'Histórico de O.S.'],
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

export default function GarantiasDafManual() {
  const [cfg, setCfg] = useState(null)
  const [tiposOS, setTiposOS] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      apiService.getConfiguracoesGarantias().catch(() => null),
      apiService.getTiposOS().catch(() => []),
    ]).then(([c, t]) => {
      setCfg(c)
      setTiposOS(t)
    }).finally(() => setCarregando(false))
  }, [])

  const diasDigitacao = cfg?.dias_digitacao ?? 14
  const diasOficina = cfg?.dias_oficina ?? 14
  const diasSolucaoPadrao = cfg?.dias_solucao ?? 14
  const porTipo = cfg?.dias_solucao_por_tipo ?? {}

  // Datas do exemplo de Dias para Digitação: OS fechada no dia 10 do mês atual.
  const fmtData = (d) => d.toLocaleDateString('pt-BR')
  const exBase = new Date(new Date().getFullYear(), new Date().getMonth(), 10)
  const somaDias = (n) => new Date(exBase.getFullYear(), exBase.getMonth(), exBase.getDate() + n)
  const exFechamento = fmtData(exBase)
  const exLimite = fmtData(somaDias(diasDigitacao))
  const exAtraso = fmtData(somaDias(diasDigitacao + 1))
  const exOficina = fmtData(somaDias(diasOficina + 1))

  // Tipos de OS de garantia (dim_tipos_os) + qualquer sigla configurada que não esteja lá.
  const linhasSolucao = useMemo(() => {
    const map = new Map()
    for (const t of tiposOS) {
      const sigla = String(t.sigla ?? '').trim().toUpperCase()
      if (!sigla || t.classificacao !== 'Garantia' || map.has(sigla)) continue
      map.set(sigla, t.tipo_os || sigla)
    }
    for (const sigla of Object.keys(porTipo)) {
      if (!map.has(sigla.toUpperCase())) map.set(sigla.toUpperCase(), sigla)
    }
    return Array.from(map, ([sigla, descricao]) => {
      const valor = porTipo[sigla] ?? porTipo[sigla.toLowerCase()]
      return { sigla, descricao, dias: valor ?? diasSolucaoPadrao }
    }).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'))
  }, [tiposOS, porTipo, diasSolucaoPadrao])


  return (
    <div className="p-6 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4 mb-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" /> Manual de Operação — Garantias DAF
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Como funciona cada aba, cada card e cada ação do módulo. Os prazos destacados em
          <span className="mx-1"><Valor>amarelo</Valor></span>
          são lidos das Regras do Sistema no momento em que esta página é aberta — ao alterar uma regra, o manual já mostra o novo valor.
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
            <p>
              O módulo acompanha a garantia DAF de ponta a ponta: da OS ainda aberta na oficina até o recebimento do título.
              O caminho natural de uma OS pelas abas é:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong className="text-slate-700">Na Oficina</strong> — OS de garantia ainda abertas (leitura direta do Dealer.net via SharePoint).</li>
              <li><strong className="text-slate-700">com Garantista</strong> — OS fechadas, importadas automaticamente para digitação e acompanhamento da análise DAF.</li>
              <li><strong className="text-slate-700">Histórico de O.S.</strong> — garantias com Nota Fiscal emitida (status E) ou enviadas à fábrica (status F).</li>
              <li><strong className="text-slate-700">Garantias DAF a Receber</strong> — títulos a receber da DAF, cruzados com as OS do Histórico.</li>
            </ol>
            <p>
              No cabeçalho das telas Na Oficina e com Garantista ficam os botões <Btn icon={RefreshCw}>Atualizar arquivo</Btn>,{' '}
              <Btn icon={Settings}>Regras do sistema</Btn>, <Btn icon={BookOpen}>Manual de operação</Btn> e, para quem tem acesso ao BI,{' '}
              <Btn icon={BarChart2}>Ir para Dashboard</Btn>. O ícone <strong>ⓘ</strong> ao lado do título mostra a origem dos dados, e o texto "Modificado em" indica quando o arquivo foi atualizado pela última vez.
            </p>
            <p>
              Em todas as abas o painel <Btn icon={Search}>Filtros</Btn> fica sempre aberto, com o botão <strong>Limpar filtros</strong> quando
              há algum filtro preenchido. Nas tabelas, as ações de cada linha ficam dentro da engrenagem <Btn icon={Settings}>Ações</Btn>.
              Botões que alteram dados só aparecem para quem tem a permissão liberada (veja <strong>Permissões</strong>).
            </p>
          </Secao>

          <Secao id="regras" icon={Settings} titulo="Regras do Sistema">
            <p>
              Abertas pela engrenagem <Btn icon={Settings}>Regras do sistema</Btn>. Valem para todos os usuários e todas as empresas.            </p>
            {carregando ? (
              <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando regras...</p>
            ) : (
              <>
                <Sub titulo="Dias na Oficina">
                  <p>Valor atual: <Valor>{diasOficina} dia{diasOficina === 1 ? '' : 's'}</Valor></p>
                  <p>
                    Contado a partir da <strong>data de criação da OS</strong>. Controla o card Mais de {diasOficina} Dias na Oficina da aba Na Oficina.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Exemplo</p>
                    <p>
                      Uma OS criada em <strong>{exFechamento}</strong> que continue aberta entra no card{' '}
                      <strong>Mais de {diasOficina} Dias na Oficina</strong> a partir de <Valor>{exOficina}</Valor>.
                    </p>
                  </div>
                </Sub>
                <Sub titulo="Dias para Digitação">
                  <p>Valor atual: <Valor>{diasDigitacao} dia{diasDigitacao === 1 ? '' : 's'}</Valor></p>
                  <p><strong>D</strong> = dia em que a OS foi fechada.</p>
                  <ul className="space-y-1 pl-1">
                    <li>• <strong>A Digitar</strong>: de D até <Valor>D+{diasDigitacao}</Valor></li>
                    <li>• <strong>Digitação Atrasada</strong>: a partir de <Valor>D+{diasDigitacao + 1}</Valor></li>
                  </ul>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Exemplo</p>
                    <p>
                      Uma OS fechada em <strong>{exFechamento}</strong> fica no card <strong>A Digitar</strong> até{' '}
                      <Valor>{exLimite}</Valor>. Se não for digitada, a partir de <strong>{exAtraso}</strong> passa para{' '}
                      <strong>Digitação Atrasada</strong>.
                    </p>
                  </div>
                </Sub>
                <Sub titulo="Dias para Solucionar (por Tipo de OS)">
                  <p>
                    Contado a partir da <strong>data em que a garantia foi digitada</strong> no sistema. Define, dentro do card{' '}
                    <strong>Aguardando Aprovação DAF</strong>, quais garantias estão <strong>Dentro do prazo</strong> e quais estão{' '}
                    <strong>Fora do prazo</strong>. Cada tipo de OS tem o seu prazo:
                  </p>
                  <div className="border border-slate-200 rounded-md overflow-hidden max-w-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                        <tr><th className="text-left p-2">Tipo de OS</th><th className="text-right p-2 w-32">Prazo</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {linhasSolucao.map(l => (
                          <tr key={l.sigla}>
                            <td className="p-2 text-slate-700"><span className="font-mono font-bold text-slate-500 mr-2">{l.sigla}</span>{l.descricao}</td>
                            <td className="p-2 text-right">
                              <Valor>{l.dias} dia{l.dias === 1 ? '' : 's'}</Valor>
                            </td>
                          </tr>
                        ))}
                        {linhasSolucao.length === 0 && (
                          <tr><td colSpan={2} className="p-2 text-slate-400">Nenhum tipo de OS de garantia cadastrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    Na tela de regras, marque um ou vários tipos, informe os dias e use <Btn>Aplicar aos selecionados</Btn> para
                    gravar o mesmo prazo em todos de uma vez; depois clique em <Btn>Salvar</Btn>.
                  </p>
                </Sub>
              </>
            )}
          </Secao>

          <Secao id="na-oficina" icon={Activity} titulo="Garantias DAF Na Oficina">
            <p>Mostra as OS de garantia que ainda estão <strong>abertas</strong> na oficina, lidas ao vivo do arquivo do Dealer.net. Nada aqui é gravado no sistema — é uma visão de acompanhamento.</p>
            <Sub titulo="Cards">
              <Itens itens={[
                ['Tipos de OS', 'quantidade de OS e valores de peças, serviços e total por tipo de OS, com linha de Total. Como indica o aviso ao lado do título, clique em um tipo para filtrar a tabela; clique de novo para limpar.'],
                [`Mais de ${diasOficina} Dias na Oficina`, `OS abertas há mais de ${diasOficina} dias (contados da criação da OS), com peças, serviços e total. O botão "Ver na tabela" filtra só essas OS.`],
              ]} />
            </Sub>
            <Sub titulo="Filtros">
              <p>Empresa, Período (Abertura), Nº OS e Chassi / Placa, todos na mesma linha. Use <Btn>Buscar</Btn> para aplicar e <Btn>Limpar</Btn> para voltar ao padrão.</p>
            </Sub>
            <Sub titulo="Tabela">
              <p>Nº OS, Empresa, Data Criação, Dias (em aberto), Tipo OS, Consultor, Proprietário do Veículo, Nº Chassi, Placa e Total. Clique no título de uma coluna para ordenar.</p>
            </Sub>
          </Secao>

          <Secao id="garantista" icon={FileText} titulo="Garantias DAF com Garantista">
            <p>Concentra as OS <strong>fechadas</strong> que estão em digitação ou em análise pela DAF.</p>
            <Sub titulo="Importação automática">
              <p>
                Ao abrir a tela e sempre que clicar em <Btn icon={RefreshCw}>Atualizar arquivo</Btn>, o sistema lê o arquivo de OS encerradas
                e inclui sozinho as OS que ainda não estão cadastradas, com status <strong>A</strong>. Só entram OS <strong>encerradas</strong> de
                tipos classificados como <strong>Garantia</strong> no Cadastro de Tipos de OS, já com proprietário, chassi e placa. Elas entram em{' '}
                <strong>A Digitar</strong> ou <strong>Digitação Atrasada</strong> conforme a regra de <Valor>{diasDigitacao} dias</Valor>.
                Durante a importação aparece o aviso "Importando X/Y OS do SharePoint..."; se alguma falhar, um aviso vermelho mostra o erro e o botão <Btn>Tentar novamente</Btn>.
              </p>
            </Sub>
            <Sub titulo="Cards (clique para filtrar a tabela; clique de novo para limpar)">
              <p>Abaixo do título de cada card aparece, em letra pequena, a regra que ele segue.</p>
              <Itens itens={[
                ['Total Aberto', 'OS distintas e valores de peças, serviços e total de tudo que está na tela.'],
                ['A Digitar', `status A — "OS fechada <= ${diasDigitacao} dias sem digitar".`],
                ['Digitação Atrasada', `status A — "OS fechada > de ${diasDigitacao} dias sem digitar".`],
                ['Aguardando Aprovação DAF', 'status B, C, G, M, N, P, Q, R, S, T, U, V, W, X ou Y — "Prazo máximo de solução N dias" (o prazo do tipo de OS; se o card tiver tipos com prazos diferentes, mostra a faixa, ex.: 14 a 20 dias). Abaixo da quantidade aparecem "Dentro do prazo" e "Fora do prazo", cada um clicável para filtrar a tabela.'],
                ['Aprovada', 'status FA — "Realizar Faturamento".'],
                ['Recusas', 'status FR ou Z — "Recusada pela DAF".'],
              ]} />
            </Sub>
            <Sub titulo="Alertas">
              <Itens itens={[
                ['OS não encontrada(s) no arquivo SharePoint', 'garantias cadastradas que não estão mais no arquivo de OS encerradas — podem ter sido faturadas ou canceladas. O botão com o olho filtra essas OS; "Buscar NF" consulta o faturamento (ROF017) e, quando acha NF emitida, grava os dados e muda o status para E, levando a OS para o Histórico de O.S. (botão disponível conforme permissão).'],
              ]} />
            </Sub>
            <Sub titulo="Filtros">
              <p>
                <Btn icon={Search}>Filtros</Btn>: Empresa, Tipo de OS, Período (Abertura), Período (Fechamento), Nº OS e Chassi.
                A linha <strong>Status</strong> abaixo dos filtros separa a tabela por código de status, com a quantidade de cada um.
                A etiqueta de status A mostra <strong>"Em fase de digitação (D+{diasDigitacao})"</strong> ou{' '}
                <strong>"Digitação Atrasada (&gt;D+{diasDigitacao})"</strong>, pela mesma regra dos cards.
              </p>
            </Sub>
            <Sub titulo="Tabela e ações">
              <p>Colunas: Nº OS, Empresa, Data Criação, Fechado em, Tipo OS, Consultor, Proprietário Veículo, Nº Chassi, Total, Nº SG, Data SG e Status. Na engrenagem de Ações:</p>
              <Itens itens={[
                ['Visualizar', 'abre os dados da garantia somente para leitura.'],
                ['Editar', 'abre a tela Editar Garantia (conforme permissão).'],
                ['Excluir', 'remove a garantia (conforme permissão). Marcando várias linhas aparece o botão "Excluir N selecionado(s)" no cabeçalho.'],
              ]} />
            </Sub>
          </Secao>

          <Secao id="editar" icon={Edit2} titulo="Editar Garantia">
            <p>
              No topo ficam OS, empresa e tipo de OS. A edição é dividida em etapas — clique na etapa ou use os botões de avançar/voltar.
              A tela já abre na etapa que corresponde ao status atual.
            </p>
            <Itens itens={[
              ['Abertura', 'empresa, consultor, tipo de OS, Nº OS, proprietário, chassi, datas de abertura/fechamento e valores de peças e serviços.'],
              ['Análise', 'Solicitação de Garantia (Nº SG e Data SG — obrigatórios para salvar), Nova Garantia ou Garantia Reapresentada (com Nº SG e data da reapresentação), status, Data Final Avaliação (liberada só para FA, FR e Z), NF de envio de peça, informações de material aguardado (status W), Motivo da Recusa e Resposta SHC (status FR) e as respostas da concessionária.'],
              ['Faturamento', 'no topo ficam os botões "Nota de Débito" (só quando a garantia é aberta por Editar Faturamento, em A Receber), "Limpar NFs" e "Buscar Faturamento" (traz NFs, emissão e valores do ROF017). Abaixo, a tabela Notas Fiscais Emitidas (Tipo Doc., RPS, NFSe, Faturamento, valores de produto e serviço e Total) com o quadro Envio para Fábrica (Data de Envio) ao lado; depois Título a Receber (Nº título, lançamento e vencimento) e Observações do Título.'],
              ['Recusado', 'aparece somente com status FR: resumo do processamento/análise e do faturamento e o Plano de Ação — Direção (Ação Tomada: Débito Interno - Serviços, Débito Interno - Comercial ou Recurso junto à DAF; data e descrição do plano).'],
            ]} />
            <Sub titulo="Mudança automática de status ao salvar">
              <Itens itens={[
                ['Ainda em A', 'ao salvar com SG preenchida passa para G — Reivindicação apresentada.'],
                ['NF + data de emissão', 'passa para E — Nota Fiscal Emitida (vai para o Histórico de O.S.).'],
                ['NF + data de envio à fábrica', 'passa para F — Enviado para Fábrica.'],
                ['FR e Z', 'nunca são alterados automaticamente.'],
              ]} />
            </Sub>
            <Sub titulo="Obrigatórios para status FR (Recusado)">
              <p>Motivo da Recusa, Data Final Avaliação, Resposta SHC, Ação Tomada, Data da Ação Tomada e Plano de Ação.</p>
            </Sub>
            <p>Todas as alterações ficam registradas no painel <strong>Histórico de Alterações</strong> (data/hora, campo, alteração e usuário).</p>
            <p>
              Para salvar é preciso a permissão <strong>Editar OS</strong> (com Garantista) ou, quando aberta por A Receber,{' '}
              <strong>Editar Faturamento</strong>. Sem permissão a tela abre só para consulta.
            </p>
          </Secao>

          <Secao id="historico" icon={Receipt} titulo="Histórico de O.S.">
            <p>Lista as garantias com status <strong>E</strong> (Nota Fiscal Emitida) ou <strong>F</strong> (Enviado para Fábrica).</p>
            <Sub titulo="Filtros">
              <p>Empresa, Tipo OS, Período (Data Abertura OS), Nº OS e Chassi / Proprietário. Dentro do painel ficam <Btn>Buscar</Btn>, <Btn>Limpar</Btn> e <Btn>Importar</Btn> (conforme permissão).</p>
            </Sub>
            <Sub titulo="Importar OS Faturadas">
              <p>
                Busca no arquivo de faturamento (ROF017) pelo período de criação e/ou Nº da OS — com período informado, só os arquivos dos anos
                daquele período são lidos, o que deixa a busca mais rápida. Selecione as OS, preencha Empresa, Tipo de O.S. e Consultor para o lote
                e confirme: as OS entram com status E, já com chassi e placa.
              </p>
            </Sub>
            <Sub titulo="Tabela">
              <p>Nº OS, Nº NF, Empresa, Tipo OS, Proprietário Veículo, Nº Chassi e Total. Na engrenagem de Ações, <Btn icon={Eye}>Visualizar</Btn> abre os dados da OS e da garantia.
              Marcando linhas aparece "Excluir N selecionado(s)" (conforme permissão).</p>
            </Sub>
          </Secao>

          <Secao id="receber" icon={DollarSign} titulo="Garantias DAF a Receber">
            <p>Títulos a receber da DAF lidos do arquivo financeiro (RFN003, um arquivo por unidade) e cruzados com as OS do Histórico de O.S.</p>
            <Sub titulo="Cards">
              <Itens itens={[
                ['Pendências', '"Sem OS vinculada" (título cuja OS não está no Histórico de O.S.) e "NF sem envio" (NF não enviada à fábrica e emitida há 4 dias ou mais).'],
                ['Vencidos / Vence Hoje / A Vencer', 'pela data de vencimento comparada com a data de hoje. Clicar em um card ativa só ele e desativa os outros.'],
                ['Resumo Geral', 'quantidade de títulos, valor e saldo.'],
              ]} />
            </Sub>
            <Sub titulo="Situação de cada título">
              <Itens itens={[
                ['OS não vinculado', 'a OS do título ainda não está no Histórico de O.S.'],
                ['NF não enviado', 'OS vinculada, mas a NF ainda não foi enviada à fábrica.'],
                ['Aguard. Pagto', 'OS vinculada e NF enviada — falta só o pagamento.'],
              ]} />
            </Sub>
            <Sub titulo="Filtros e ações">
              <p>Empresa, período de emissão, Nº OS e busca livre (título, cliente, nota fiscal), além dos botões de situação. Na engrenagem de Ações, nesta ordem:</p>
              <Itens itens={[
                ['Editar Faturamento', 'abre a garantia para vincular a OS, informar o envio à fábrica e emitir a Nota de Débito.'],
                ['Visualizar título', 'dados completos do título, observação do arquivo e observações (só com OS vinculada). Fica destacado em azul quando o título já tem observações.'],
                ['Visualizar OS e Garantia', 'janela com Abertura, Análise e Faturamento da OS vinculada.'],
              ]} />
            </Sub>
          </Secao>

          <Secao id="nota-debito" icon={FileSignature} titulo="Nota de Débito">
            <p>
              Emitida em <strong>Garantias DAF a Receber → Ações → Editar Faturamento</strong>, pelo botão <Btn icon={FileText}>Nota de Débito</Btn>{' '}
              no topo da etapa Faturamento (conforme permissão).
            </p>
            <Itens itens={[
              ['Modelo', 'é escolhido automaticamente: o modelo vinculado ao tipo de OS da garantia. Se não houver, a tela avisa e indica onde cadastrar: Configurações → Cadastro de Tabelas → Tabelas de Garantia → Modelos de Nota de Débito.'],
              ['Data de emissão', 'sempre a data do dia — sai direto no PDF.'],
              ['Item da nota', '"Peças substituídas em Garantia" (descrição e quantidade editáveis). O valor total é sempre o total das Notas Fiscais Emitidas e não é digitado; a quantidade só divide o valor unitário.'],
              ['Dados do Cliente', 'Nome = Proprietário do Veículo da garantia; Placa = placa gravada na garantia (vem dos arquivos do Dealer.net).'],
              ['Dados da Nota Fiscal', 'vêm de Notas Fiscais Emitidas: Número = números de todas as NFs (coluna NFSe), Valor = Total geral (produto + serviço), Data = data de faturamento.'],
              ['Emitir e baixar PDF', 'gera o número da nota, grava a emissão e baixa o PDF. O nome do arquivo segue o padrão cadastrado no modelo (campo "Nome do arquivo PDF"), ex.: "O067692 - SB160956 - ND.pdf" = Nº SG + 8 últimos caracteres do chassi + ND. As notas já emitidas ficam listadas na mesma tela e podem ser baixadas de novo ou excluídas (Excluir → Sim, conforme permissão).'],
            ]} />
          </Secao>

          <Secao id="status" icon={ListChecks} titulo="Status da garantia">
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                  <tr><th className="text-left p-2 w-14">Código</th><th className="text-left p-2">Descrição</th><th className="text-left p-2">Onde aparece</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STATUS_LEGENDA.map(([cod, desc, onde]) => (
                    <tr key={cod}>
                      <td className="p-2 font-mono font-bold text-slate-700">{cod}</td>
                      <td className="p-2 text-slate-600">{desc}</td>
                      <td className="p-2 text-slate-500">{onde}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <Secao id="permissoes" icon={ShieldCheck} titulo="Permissões">
            <p>
              Liberadas em <strong>Configurações → Grupos de Acessos</strong> (ou Matriz de Permissões). O acesso a cada aba é dado pelo
              próprio menu; as ações abaixo só aparecem para quem as tiver marcadas. Consultas (Visualizar, Atualizar arquivo, Manual,
              filtros e cards) ficam abertas para quem acessa a tela.
            </p>
            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                  <tr><th className="text-left p-2 w-56">Menu</th><th className="text-left p-2">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Garantias DAF na Oficina', 'Regras do Sistema'],
                    ['Garantias DAF Aberto (com Garantista)', 'Editar OS · Excluir OS · Buscar NF · Regras do Sistema'],
                    ['Histórico de O.S.', 'Importar OS Faturadas · Excluir OS'],
                    ['Garantias DAF a Receber', 'Editar Título (observação) · Editar Faturamento · Emitir Nota de Débito · Excluir Nota de Débito'],
                    ['Modelos de Nota de Débito', 'Criar Modelo · Editar Modelo · Excluir Modelo'],
                  ].map(([menu, acoes]) => (
                    <tr key={menu}>
                      <td className="p-2 font-semibold text-slate-700">{menu}</td>
                      <td className="p-2 text-slate-600">{acoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          <Secao id="fontes" icon={Database} titulo="Fontes de dados">
            <p>Arquivos extraídos do Dealer.net pelo RPA e gravados no SharePoint (pasta "Banco de Dados - DAF - Pós-Vendas").</p>
            <Itens itens={[
              ['ROF001_OSABERTA.xlsx', 'OS abertas — aba Na Oficina.'],
              ['ROF001_OSABERTA_ENCERRADA.xlsx', 'OS encerradas — importação automática da aba com Garantista (inclusive a placa, coluna Veiculo_Placa).'],
              ['ROF017_FATURAMENTOPOROS <ano>.xlsx', 'faturamento por OS (um arquivo por ano) — Buscar NF, Buscar Faturamento e Importar OS Faturadas (placa na coluna OS_VeiculoPlaca).'],
              ['RFN003_PosicaoAnaliticoReceber_Excel_<unidade>.xls', 'títulos a receber (um arquivo por unidade) — aba Garantias DAF a Receber.'],
            ]} />
            <p className="flex items-start gap-1.5 text-[12px] text-slate-500">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
              O Dealer.net reaproveita números de OS entre anos e unidades; por isso o sistema também usa o chassi para identificar a OS certa no faturamento.
            </p>
          </Secao>

        </div>
      </div>
    </div>
  )
}
