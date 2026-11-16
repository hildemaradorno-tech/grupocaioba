import React, { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, Settings, Activity, FileText, DollarSign, Receipt, Edit2, ListChecks, Database, Loader2,
  RefreshCw, Eye, BarChart2, ClipboardList, Search, AlertTriangle, FileSignature,
} from 'lucide-react'
import { apiService } from '../../services/api'

const SECOES = [
  { id: 'visao-geral',  label: 'Visão geral',               icon: BookOpen },
  { id: 'regras',       label: 'Regras do Sistema',         icon: Settings },
  { id: 'editar',       label: 'Editar Garantia',           icon: Edit2 },
  { id: 'historico',    label: 'Histórico de O.S.',         icon: Receipt },
  { id: 'receber',      label: 'Títulos a Receber',         icon: DollarSign },
  { id: 'nota-debito',  label: 'Nota de Débito',            icon: FileSignature },
  { id: 'status',       label: 'Status da garantia',        icon: ListChecks },
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

// Bloco de uma aba (mesmo nome e ícone da linha de abas) com as regras dos cards dela
function AbaRegras({ icon: Icon, titulo, children }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <h3 className="flex items-center gap-2 px-3 py-2 bg-orange-50 border-b border-orange-100 text-sm font-bold text-orange-700">
        <Icon className="h-4 w-4" /> {titulo}
      </h3>
      <div className="p-3 space-y-4">{children}</div>
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
  const [modelosNota, setModelosNota] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([
      apiService.getConfiguracoesGarantias().catch(() => null),
      apiService.getTiposOS().catch(() => []),
      apiService.getModelosNotaDebito().catch(() => []),
    ]).then(([c, t, mn]) => {
      setCfg(c)
      setTiposOS(t)
      setModelosNota(mn)
    }).finally(() => setCarregando(false))
  }, [])

  // Tipo de OS de garantia → modelos de Nota de Débito vinculados (campo "Tipos de O.S." do modelo).
  // Na emissão vale o primeiro modelo ATIVO do tipo, na ordem alfabética do nome (mesma ordem da lista).
  const modelosPorTipo = useMemo(() => {
    const siglasDoModelo = (m) => String(m.tipos_codigos || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean)
    const tipos = new Map()
    for (const t of tiposOS) {
      const sigla = String(t.sigla ?? '').trim().toUpperCase()
      if (sigla && t.classificacao === 'Garantia' && !tipos.has(sigla)) tipos.set(sigla, t.tipo_os || sigla)
    }
    return Array.from(tipos, ([sigla, descricao]) => {
      const modelos = modelosNota.filter(m => siglasDoModelo(m).includes(sigla))
      const usado = modelos.find(m => m.ativo)
      return { sigla, descricao, modelos, usadoId: usado?.id }
    }).sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'))
  }, [tiposOS, modelosNota])

  const diasDigitacao = cfg?.dias_digitacao ?? 14
  const diasOficina = cfg?.dias_oficina ?? 14
  const diasRecusa = cfg?.dias_recusa ?? 15
  const diasNfEnvio = cfg?.dias_nf_envio ?? 4
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
          <BookOpen className="h-5 w-5 text-indigo-600" /> Manual de Operação — Garantias DAF - Visão Controle
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
              O módulo acompanha a garantia DAF de ponta a ponta: da O.S. ainda aberta na oficina até o recebimento do título.
              Tudo fica numa tela só, no menu <strong>BI → Garantias DAF</strong>. Na linha das abas, à direita, os ícones{' '}
              <Btn icon={BarChart2}>Dashboard</Btn> e <Btn icon={ClipboardList}>Controle</Btn> trocam entre os indicadores e as telas de
              trabalho da aba escolhida.
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li><strong className="text-slate-700">Na Oficina</strong> — O.S. de garantia ainda abertas (leitura direta do Dealer.net via SharePoint).</li>
              <li><strong className="text-slate-700">Com Garantista</strong> — O.S. fechadas, importadas automaticamente para digitação e acompanhamento da análise DAF.</li>
              <li><strong className="text-slate-700">Títulos a Receber</strong> — títulos a receber da DAF, cruzados com as O.S. do sistema.</li>
              <li><strong className="text-slate-700">Histórico de O.S.</strong> — garantias com Nota Fiscal emitida (status E) ou enviadas à fábrica (status F). Esta aba só tem Controle.</li>
            </ol>
          </Secao>

          <Secao id="regras" icon={Settings} titulo="Regras do Sistema">
            <p>
              Abertas pela engrenagem <Btn icon={Settings}>Regras do sistema</Btn>. Valem para todos os usuários e todas as empresas,
              no Controle e no Dashboard. Ao clicar na engrenagem abre uma lista com um item para cada aba —{' '}
              <Btn icon={Activity}>Regras — Na Oficina</Btn>, <Btn icon={FileText}>Regras — Com Garantista</Btn> e{' '}
              <Btn icon={DollarSign}>Regras — Títulos a Receber</Btn> —, cada um com a descrição do que controla. O item escolhido abre
              uma janela só com as regras daquela aba (regra geral + regra por mês); <Btn>Salvar</Btn> grava e a tela já passa a usar o valor novo.
            </p>
            {carregando ? (
              <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando regras...</p>
            ) : (
              <>
                <AbaRegras icon={Activity} titulo="Na Oficina (Em Aberto)">
                <Sub titulo={`Card - Mais de ${diasOficina} Dias na Oficina`}>
                  <p>Regra geral: <Valor>{diasOficina} dia{diasOficina === 1 ? '' : 's'}</Valor></p>
                  <p>
                    Contado a partir da <strong>data de criação da O.S.</strong>. Controla o card Mais de {diasOficina} Dias na Oficina da aba Na Oficina.
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Exemplo</p>
                    <p>
                      Uma O.S. criada em <strong>{exFechamento}</strong> que continue aberta entra no card{' '}
                      <strong>Mais de {diasOficina} Dias na Oficina</strong> a partir de <Valor>{exOficina}</Valor>.
                    </p>
                  </div>
                </Sub>
                </AbaRegras>
                <AbaRegras icon={FileText} titulo="Com Garantista (Em Aberto)">
                <Sub titulo="Card - Dias para Digitação (A Digitar / Digitação Atrasada)">
                  <p>Regra geral: <Valor>{diasDigitacao} dia{diasDigitacao === 1 ? '' : 's'}</Valor></p>
                  <p><strong>D</strong> = dia em que a O.S. foi fechada.</p>
                  <ul className="space-y-1 pl-1">
                    <li>• <strong>A Digitar</strong>: de D até <Valor>D+{diasDigitacao}</Valor></li>
                    <li>• <strong>Digitação Atrasada</strong>: a partir de <Valor>D+{diasDigitacao + 1}</Valor></li>
                  </ul>
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Exemplo</p>
                    <p>
                      Uma O.S. fechada em <strong>{exFechamento}</strong> fica no card <strong>A Digitar</strong> até{' '}
                      <Valor>{exLimite}</Valor>. Se não for digitada, a partir de <strong>{exAtraso}</strong> passa para{' '}
                      <strong>Digitação Atrasada</strong>.
                    </p>
                  </div>
                </Sub>
                <Sub titulo="Card - Aguardando Aprovação DAF">
                  <p>
                    Contado a partir da <strong>data em que a garantia foi digitada</strong> no sistema. Define, dentro do card{' '}
                    <strong>Aguardando Aprovação DAF</strong>, quais garantias estão <strong>Dentro do prazo</strong> e quais estão{' '}
                    <strong>Fora do prazo</strong>. Cada tipo de O.S. tem o seu prazo:
                  </p>
                  <div className="border border-slate-200 rounded-md overflow-hidden max-w-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                        <tr><th className="text-left p-2">Tipo de O.S.</th><th className="text-right p-2 w-32">Prazo</th></tr>
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
                          <tr><td colSpan={2} className="p-2 text-slate-400">Nenhum tipo de O.S. de garantia cadastrado.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Sub>
                <Sub titulo="Card - Recusas">
                  <p>Regra geral: <Valor>{diasRecusa} dia{diasRecusa === 1 ? '' : 's'}</Valor></p>
                  <p>
                    Contado a partir da <strong>Data Final Avaliação</strong> (dia em que a DAF recusou; sem essa data, como no status Z, conta da Data SG).
                    Controla as linhas do card Recusas, no Controle e no Dashboard:
                  </p>
                  <ul className="space-y-1 pl-1">
                    <li>• <strong>No prazo</strong>: até <Valor>{diasRecusa} dia{diasRecusa === 1 ? '' : 's'}</Valor></li>
                    <li>• <strong>Fora do prazo</strong>: a partir de <Valor>{diasRecusa + 1} dias</Valor></li>
                  </ul>
                </Sub>
                </AbaRegras>
                <AbaRegras icon={DollarSign} titulo="Títulos a Receber (Faturadas)">
                <Sub titulo="Card - Pendências (NF sem envio)">
                  <p>Regra geral: <Valor>{diasNfEnvio} dia{diasNfEnvio === 1 ? '' : 's'}</Valor></p>
                  <p>
                    Contado a partir da <strong>data de emissão da NF</strong>. Controla a linha <strong>NF sem envio</strong> do card
                    Pendências: NF não enviada à fábrica e emitida há <Valor>{diasNfEnvio} dia{diasNfEnvio === 1 ? '' : 's'}</Valor> ou mais.
                  </p>
                </Sub>
                <Sub titulo="Cards - Vencidos / Vence Hoje / A Vencer">
                  <p>Regra fixa: data de vencimento comparada com a data de hoje.</p>
                </Sub>
                </AbaRegras>
              </>
            )}
          </Secao>

          <Secao id="editar" icon={Edit2} titulo="Editar Garantia">
            <p>
              No topo ficam O.S., empresa e tipo de O.S.. A edição é dividida em etapas — clique na etapa ou use os botões de avançar/voltar.
              A tela já abre na etapa que corresponde ao status atual.
            </p>
            <Itens itens={[
              ['Abertura', 'empresa, consultor, tipo de O.S., Nº O.S., proprietário, chassi, datas de abertura/fechamento e valores de peças e serviços.'],
              ['Análise', 'Solicitação de Garantia (Nº SG e Data SG — obrigatórios para salvar), Nova Garantia ou Garantia Reapresentada (com Nº SG e data da reapresentação), status, Data Final Avaliação (liberada só para FA, FR e Z), NF de envio de peça, informações de material aguardado (status W), Motivo da Recusa e Resposta SHC (status FR) e as respostas da concessionária.'],
              ['Faturamento', 'no topo ficam os botões "Nota de Débito" (só quando a garantia é aberta por Editar Faturamento, em Títulos a Receber), "Limpar NFs" e "Buscar Faturamento" (traz NFs, emissão e valores do ROF017). Abaixo, a tabela Notas Fiscais Emitidas (Tipo Doc., RPS, NFSe, Faturamento, valores de produto e serviço e Total) com o quadro Envio para Fábrica (Data de Envio) ao lado; depois Título a Receber (Nº título, lançamento e vencimento) e Observações do Título.'],
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
              Para salvar é preciso a permissão <strong>Editar OS</strong> (Com Garantista) ou{' '}
              <strong>Editar Faturamento</strong> (aberta por Títulos a Receber). Sem permissão a tela abre só para consulta.
            </p>
          </Secao>

          <Secao id="historico" icon={Receipt} titulo="Histórico de O.S.">
            <p>Lista as garantias com status <strong>E</strong> (Nota Fiscal Emitida) ou <strong>F</strong> (Enviado para Fábrica).</p>
            <Sub titulo="Importar O.S. Faturadas">
              <p>
                Busca no arquivo de faturamento (ROF017) pelo período de criação e/ou Nº da O.S. — com período informado, só os arquivos dos anos
                daquele período são lidos, o que deixa a busca mais rápida. Selecione as O.S., preencha Empresa, Tipo de O.S. e Consultor para o lote
                e confirme: as O.S. entram com status E, já com chassi e placa.
              </p>
            </Sub>
          </Secao>

          <Secao id="receber" icon={DollarSign} titulo="Títulos a Receber">
            <p>Títulos a receber da DAF lidos do arquivo financeiro (RFN003, um arquivo por unidade) e cruzados com as O.S. do Histórico de O.S.</p>
            <Sub titulo="Cards">
              <p>Em todos os cards o <strong>valor</strong> fica em destaque e, logo abaixo, a quantidade (<strong>Qtde Títulos</strong>).</p>
              <Itens itens={[
                ['Pendências', `"Sem O.S. vinculada" (título cuja O.S. não está no Histórico de O.S.) e "NF sem envio" (NF não enviada à fábrica e emitida há ${diasNfEnvio} dia${diasNfEnvio === 1 ? '' : 's'} ou mais — regra Dias para Envio da NF). Cada linha é clicável para filtrar a tabela.`],
                ['Vencidos / Vence Hoje / A Vencer', 'pela data de vencimento comparada com a data de hoje. Clicar em um card ativa só ele e desativa os outros.'],
                ['Resumo Geral', 'saldo total em destaque e Qtde Títulos. Clicar nele limpa o filtro do card selecionado. Em todos os cards e gráficos (Controle e Dashboard) o valor mostrado é o Saldo — o que ainda falta receber.'],
              ]} />
            </Sub>
            <Sub titulo="Situação de cada título">
              <Itens itens={[
                ['O.S. não vinculado', 'a O.S. do título não está cadastrada no sistema (importe em Histórico de O.S. → Importar).'],
                ['Faturamento pendente', 'a O.S. está no sistema (ex.: Aprovada) mas ainda sem nota fiscal lançada. Use Ações → Editar Faturamento → Buscar Faturamento e salve: a O.S. vai para E — Nota Fiscal Emitida e passa ao Histórico de O.S.'],
                ['NF não enviado', 'O.S. com faturamento lançado, mas a NF ainda não foi enviada à fábrica.'],
                ['Aguard. Pagto', 'O.S. vinculada e NF enviada — falta só o pagamento.'],
              ]} />
            </Sub>
            <Sub titulo="Filtros e ações">
              <p>Empresa, período de emissão, Nº O.S. e busca livre (título, cliente, nota fiscal), além dos botões de situação. Na engrenagem de Ações, nesta ordem:</p>
              <Itens itens={[
                ['Editar Faturamento', 'abre a garantia para vincular a O.S., informar o envio à fábrica e emitir a Nota de Débito.'],
                ['Visualizar título', 'dados completos do título, observação do arquivo e observações (só com O.S. vinculada). Fica destacado em azul quando o título já tem observações.'],
                ['Visualizar O.S. e Garantia', 'janela com Abertura, Análise e Faturamento da O.S. vinculada.'],
              ]} />
            </Sub>
          </Secao>

          <Secao id="nota-debito" icon={FileSignature} titulo="Nota de Débito">
            <p>
              Emitida em <strong>Títulos a Receber → Ações → Editar Faturamento</strong>, pelo botão <Btn icon={FileText}>Nota de Débito</Btn>{' '}
              no topo da etapa Faturamento (conforme permissão).
            </p>
            <Itens itens={[
              ['Modelo', 'é escolhido automaticamente: o modelo vinculado ao tipo de O.S. da garantia. Se não houver, a tela avisa e indica onde cadastrar: Configurações → Cadastro de Tabelas → Tabelas de Garantia → Modelos de Nota de Débito.'],
              ['Data de emissão', 'sempre a data do dia — sai direto no PDF.'],
              ['Item da nota', '"Peças substituídas em Garantia" (descrição e quantidade editáveis). O valor total é sempre o valor de peças (DANFE) das Notas Fiscais Emitidas e não é digitado; a quantidade só divide o valor unitário.'],
              ['Dados do Cliente', 'Nome = Proprietário do Veículo da garantia; Placa = placa gravada na garantia (vem dos arquivos do Dealer.net).'],
              ['Assinatura', 'nome, cargo e imagem da assinatura são sempre do usuário logado, inclusive ao baixar de novo uma nota já emitida; no rodapé do PDF, em letra pequena, fica registrado quem emitiu a nota pela primeira vez, com data e horário. A imagem vem do funcionário vinculado ao usuário (cadastro de Funcionários); sem vínculo ou sem imagem, o espaço fica em branco.'],
              ['Dados da Nota de Débito', 'o Número é sempre o da Nota Fiscal de Serviços (NFS-e). Se a O.S. não possuir nota fiscal de serviços, o Número é o da DANFE (nota fiscal de peças).'],
              ['Dados da Nota Fiscal de Peças ao Cliente', 'somente a DANFE (nota fiscal de peças): número, valor de peças e data de faturamento.'],
              ['Emitir e baixar PDF', 'antes de baixar (nota nova ou PDF de nota já emitida) abre um alerta pedindo para ler todo o documento e conferir as informações antes de enviar ao fabricante; o download só acontece no OK. Gera o número da nota, grava a emissão e baixa o PDF. O nome do arquivo segue o padrão cadastrado no modelo (campo "Nome do arquivo PDF"), ex.: "O067692 - SB160956 - ND.pdf" = Nº SG + 8 últimos caracteres do chassi + ND. As notas já emitidas ficam listadas na mesma tela e podem ser baixadas de novo ou excluídas (Excluir → Sim, conforme permissão).'],
            ]} />
            <Sub titulo="Modelo aplicado a cada tipo de O.S.">
              <p>
                Lista atual do cadastro (Configurações → Cadastro de Tabelas → Tabelas de Garantia → Modelos de Nota de Débito).
                Quando um tipo tem mais de um modelo, a emissão usa o marcado como <strong>em uso</strong> (o primeiro ativo, por ordem de nome).
              </p>
              {carregando ? (
                <p className="flex items-center gap-2 text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Carregando modelos...</p>
              ) : (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold">
                      <tr><th className="text-left p-2">Tipo de O.S.</th><th className="text-left p-2">Modelo de Nota de Débito</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modelosPorTipo.map(t => (
                        <tr key={t.sigla}>
                          <td className="p-2 text-slate-700"><span className="font-mono font-bold text-slate-500 mr-2">{t.sigla}</span>{t.descricao}</td>
                          <td className="p-2">
                            {t.modelos.length === 0 ? (
                              <span className="text-amber-700 font-semibold">Sem modelo — a emissão fica bloqueada até cadastrar</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {t.modelos.map(m => (
                                  <span key={m.id} className={m.ativo ? 'text-slate-700' : 'text-slate-400 line-through'}>
                                    {m.nome}
                                    {m.id === t.usadoId && t.modelos.length > 1 && <span className="ml-1.5 px-1 py-0.5 rounded bg-green-100 text-green-700 text-[9px] font-bold no-underline">em uso</span>}
                                    {!m.ativo && <span className="ml-1.5 text-[10px]">(inativo)</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {modelosPorTipo.length === 0 && (
                        <tr><td colSpan={2} className="p-2 text-slate-400">Nenhum tipo de O.S. de garantia cadastrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Sub>
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

          <Secao id="fontes" icon={Database} titulo="Fontes de dados">
            <p>Arquivos extraídos do Dealer.net pelo RPA e gravados no SharePoint (pasta "Banco de Dados - DAF - Pós-Vendas").</p>
            <Itens itens={[
              ['ROF001_OSABERTA.xlsx', 'O.S. abertas — aba Na Oficina.'],
              ['ROF001_OSABERTA_ENCERRADA.xlsx', 'O.S. encerradas — importação automática da aba Com Garantista (inclusive a placa, coluna Veiculo_Placa).'],
              ['ROF017_FATURAMENTOPOROS <ano>.xlsx', 'faturamento por O.S. (um arquivo por ano) — Buscar NF, Buscar Faturamento e Importar O.S. Faturadas (placa na coluna OS_VeiculoPlaca).'],
              ['RFN003_PosicaoAnaliticoReceber_Excel_<unidade>.xls', 'títulos a receber (um arquivo por unidade) — aba Garantias DAF a Receber.'],
            ]} />
          </Secao>

        </div>
      </div>
    </div>
  )
}
