import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { PlayCircle, Loader2, AlertTriangle, Save, X, ShieldCheck, Lock, ArrowUp, ArrowDown, ArrowUpDown, Trash2, ChevronRight, ChevronLeft, FileDown, Calculator, Wallet, RefreshCw, CheckCircle2 } from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { passaEscopoComissao, setorSoVisualizacao } from '../utils/permissoesComissao'
import { FeriasStatusProvider, useFeriasStatus } from '../context/FeriasStatusContext'
import { fmtBRL, fmtPct, fmtDiaMes, TIPOS_META_LABEL, CAMPO_META_LABEL, faixasDaRegra, ROTULO_ACAO_HISTORICO } from '../utils/comissoesFormat'
import { gerarPdfComissoes, paraNomeArquivo } from '../utils/comissoesPdf'
import { funcionarioAtivoComissao, resolvePoliticas, fonteDaPolitica, politicaConfigurada } from '../utils/comissoesElegibilidade'

// Sentinela pra funcionário sem setor algum (setor_ids vazio) — sem isso não tem como
// selecionar essa "aba" na tela pra conferir/excluir o histórico desse grupo.
const SEM_SETOR = 'Sem setor'


// Botão "Atualizar Férias"/"Férias Atualizadas" no cabeçalho — esta tela publica o status em
// FeriasStatusContext (mesmo padrão de KpiSourceStatusContext) e mostra aqui, já que virou
// página própria.
function BotaoStatusFerias() {
  const navigate = useNavigate()
  const { status } = useFeriasStatus()
  if (status.desatualizada) {
    return (
      <button
        onClick={() => navigate('/ferias')}
        title="A data de modificação do arquivo de férias não é do mês do período selecionado — atualize antes de calcular (Calcular Comissões fica bloqueado até lá)"
        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-md transition-colors"
      >
        <RefreshCw className="h-4 w-4" /> Atualizar Férias
      </button>
    )
  }
  if (status.atualizada) {
    return (
      <button
        onClick={() => navigate('/ferias')}
        title="O arquivo de férias já está atualizado com o mês do período selecionado"
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-md transition-colors"
      >
        <CheckCircle2 className="h-4 w-4" /> Férias Atualizadas
      </button>
    )
  }
  return null
}

const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtData = (v) => v ? String(v).split('-').reverse().join('/') : ''
const soDigitos = (v) => String(v || '').replace(/\D/g, '')
const mesmoMes = (a, b) => a && b && a.slice(0, 7) === b.slice(0, 7)
const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Chave única de uma linha (funcionário + política + segmento de apuração) — um funcionário
// pode ter várias linhas: uma por Política do cargo dele E uma por segmento de datas quando as
// férias quebram o período em pedaços (quem não recebe comissão de férias).
const chaveLinha = (c) => `${c.func.id}::${c.politica.id}::${c.segInicio || ''}::${c.segFim || ''}`


const addDias = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const pad = (x) => String(x).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

// Subtrai os intervalos de férias do período selecionado, devolvendo os segmentos que sobram.
// Ex: período 01/06–30/06 com férias 08/06–22/06 vira [01/06–07/06, 23/06–30/06].
function subtraiFerias(inicio, fim, feriasList) {
  let segmentos = [{ inicio, fim }]
  for (const f of feriasList) {
    const proximos = []
    for (const seg of segmentos) {
      if (f.fim_gozo < seg.inicio || f.inicio_gozo > seg.fim) { proximos.push(seg); continue }
      if (f.inicio_gozo > seg.inicio) proximos.push({ inicio: seg.inicio, fim: addDias(f.inicio_gozo, -1) })
      if (f.fim_gozo < seg.fim) proximos.push({ inicio: addDias(f.fim_gozo, 1), fim: seg.fim })
    }
    segmentos = proximos
  }
  return segmentos
}

// A coluna "Valor" respeita a natureza da Base: bases de horas (nome contém "hora") aparecem
// como HR 442,53; as demais (faturamento, margem etc.) como moeda R$.
// Base CONTAGEM (ex: Agendamentos) é quantidade, não dinheiro — mostra número puro em vez de
// "R$"; bases de horas aparecem como HR; as demais (SOMA em R$, ex: faturamento) como moeda.
const baseEmContagem = (c) => c.base?.tipo_agregacao === 'CONTAGEM'
const baseEmHoras = (c) => /hora/.test((c.base?.nome || '').toLowerCase())

const fmtValorBase = (c, v) => {
  if (v == null) return '-'
  if (baseEmContagem(c)) return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (baseEmHoras(c)) return `HR ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return fmtBRL(v)
}
const detalheEmpresaSemValor = (d) =>
  Math.round(Math.abs(Number(d.valorBase) || 0) * 100) === 0 &&
  Math.round(Math.abs(Number(d.valorComissao) || 0) * 100) === 0


// Regras distintas (por id) usadas pelas políticas das linhas de um grupo — mostradas uma vez
// antes dos funcionários, em vez de repetir a regra inteira em cada consultor.
const regrasDoGrupo = (itens) => {
  const mapa = new Map()
  for (const c of itens) {
    const r = c.politica?.usa_faixa === 'SIM' ? c.politica.regra_comissao : null
    if (r?.id && !mapa.has(r.id)) mapa.set(r.id, { id: r.id, nome: r.nome, faixas: faixasDaRegra(c.politica, null) })
  }
  return [...mapa.values()]
}

// Aplica o percentual/valor fixo da política sobre um valor base já apurado — usado tanto pro
// total da linha quanto pro detalhamento por empresa (mesma regra, valor base diferente).
function calcularComissaoSobre(c, valorBase, metaMap, baseComissaoMetaMap) {
  // Desconto configurado na própria Base de Cálculo (ex: 14,25% de imposto de venda) — vale
  // SEMPRE que essa Base for usada (política com % fixo, R$ Valor, ou qualquer Regra por faixa),
  // tirando esse % do valor bruto lido antes de qualquer cálculo. A partir daqui trabalha com o
  // valor LÍQUIDO; 0/sem desconto = líquido igual ao bruto (comportamento de sempre).
  const descontoPct = parseFloat(c.base?.desconto_percentual) || 0
  const valorLiquido = descontoPct > 0 ? valorBase * (1 - descontoPct / 100) : valorBase

  // Política com Regra (faixas sobre o valor da Base): a primeira faixa, na ordem cadastrada,
  // que casa com o valor apurado (ou com o % de meta atingida) define o percentual, aplicado
  // sobre o valor todo da Base.
  if (c.politica.usa_faixa === 'SIM' && c.politica.regra_comissao?.faixas?.length) {
    const regra = c.politica.regra_comissao
    const casaComValor = (f, alvo) => {
      const v = parseFloat(f.valor)
      return f.operador === '>=' ? alvo >= v : f.operador === '>' ? alvo > v : f.operador === '<=' ? alvo <= v : alvo < v
    }
    if (regra.tipo_faixa === 'PERCENTUAL_META' || regra.tipo_faixa === 'VALOR_FIXO_META') {
      // Sem meta cadastrada (Planejamento de Metas) pro funcionário/mês/tipo: vira pendência —
      // nunca calcula como se a meta fosse 0, que pagaria a faixa mais baixa por engano.
      // "Meta de Equipe" (regra.meta_equipe_agrupamento_ids): a meta comparada é a soma das
      // metas publicadas (da MESMA empresa do funcionário) de todos os cargos desses
      // Agrupamentos de Cargos, guardada sob a chave "EQUIPE::<regraId>::<empresaId>" no mesmo
      // metaMap — não a meta do próprio funcionário (ex: coordenador sem meta própria cadastrada).
      // Cada entrada do metaMap guarda os 3 campos possíveis da meta publicada (total/pecas/
      // servicos) — regra.meta_campo escolhe qual comparar (ex: comissão só sobre Peças não deve
      // contar a parte de Serviços da meta do consultor).
      const metaObj = regra.meta_equipe_agrupamento_ids?.length > 0
        ? metaMap?.[`EQUIPE::${regra.id}::${c.func.empresa_id}`]
        : metaMap?.[`${c.func.id}|${regra.meta_tipo}`]
      const meta = metaObj?.[regra.meta_campo || 'total']
      if (!meta || meta <= 0) return { percentual: null, valorFixo: null, valorComissao: null, semMeta: true, valorApurado: valorLiquido, valorBruto: valorBase, descontoPct }
      const percentualAtingido = (valorLiquido / meta) * 100
      const faixa = [...regra.faixas].sort((a, b) => a.ordem - b.ordem).find(f => casaComValor(f, percentualAtingido))
      if (regra.tipo_faixa === 'VALOR_FIXO_META') {
        // Paga um valor FIXO em R$ conforme a faixa de % atingido — não multiplica nada, não
        // depende de nenhuma outra política.
        const valorFixoFaixa = faixa ? parseFloat(faixa.percentual) : 0
        return { percentual: null, valorFixo: valorFixoFaixa, valorComissao: valorFixoFaixa, percentualAtingido, meta, valorApurado: valorLiquido, valorBruto: valorBase, descontoPct }
      }
      const percentual = faixa ? parseFloat(faixa.percentual) : 0
      // Com "Políticas que formam a Base da Comissão" marcadas (cadastro da Regra): a % é
      // aplicada sobre a SOMA do valor de comissão já calculado dessas políticas (ex: Prêmio em
      // cima do que o time já ganhou de comissão individual), não sobre o valor apurado aqui.
      // Sem nenhuma marcada (caso mais comum): a % é aplicada direto sobre o valor apurado desta
      // própria Base de Cálculo (o mesmo valor comparado com a Meta acima) — não depende de
      // nenhuma outra política.
      const temBaseDeOutrasPoliticas = (regra.base_politica_ids || []).length > 0
      const baseComissao = temBaseDeOutrasPoliticas ? (baseComissaoMetaMap?.get(`${c.func.id}::${regra.id}`) ?? 0) : valorLiquido
      return { percentual, valorFixo: null, valorComissao: baseComissao * (percentual / 100), percentualAtingido, meta, valorApurado: valorLiquido, valorBruto: valorBase, descontoPct, baseComissao: temBaseDeOutrasPoliticas ? baseComissao : null }
    }
    const faixa = [...regra.faixas].sort((a, b) => a.ordem - b.ordem).find(f => casaComValor(f, valorLiquido))
    const percentual = faixa ? parseFloat(faixa.percentual) : 0
    return { percentual, valorFixo: null, valorComissao: valorLiquido * (percentual / 100), valorApurado: valorLiquido, valorBruto: valorBase, descontoPct }
  }
  const tipo = tipoComissaoPorBase(c)
  const percentualPorNome = tipo === '% Peças' ? c.politica.comissao_pecas
    : tipo === '% Serviços' ? c.politica.comissao_servicos
    : null
  const percentual = percentualPorNome != null ? percentualPorNome : c.politica.comissao_total
  const valorFixo = c.politica.comissao_valor
  // R$ Valor é um multiplicador por unidade apurada (ex: R$ 0,60 por hora vendida):
  // comissão = Valor × R$ Valor. Os percentuais continuam sendo Valor × %.
  const valorComissao = valorFixo != null
    ? valorLiquido * parseFloat(valorFixo)
    : percentual != null ? valorLiquido * (parseFloat(percentual) / 100) : 0
  return { percentual, valorFixo, valorComissao, valorApurado: valorLiquido, valorBruto: valorBase, descontoPct }
}

// Se o Nome da Base indicar Peças/Serviços, devolve o rótulo correspondente — usado tanto pra
// escolher o percentual certo da política quanto pra mostrar o tipo na coluna "Comissão".
const tipoComissaoPorBase = (c) => {
  const nomeBaseNorm = (c.base?.nome || '').trim().toLowerCase()
  if (/pe(ç|c)a/.test(nomeBaseNorm)) return '% Peças'
  if (/servi(ç|c)o/.test(nomeBaseNorm)) return '% Serviços'
  return null
}

// agrupamentoNome escolhe qual Agrupamento de Empresas alimenta a aba de Empresa — a mesma tela
// serve tanto "Cálculo de Comissões" (Caiobá Trucks) quanto sua duplicata pra Caiobá Motos, sem
// duplicar ~1900 linhas de lógica de lote/departamento/PDF (só essa 1 filtragem muda entre as
// duas). Chaves de sessão (período) ganham sufixo quando não é o padrão, pra cada aba guardar seu
// próprio período sem um sobrescrever o outro no localStorage.
function CalculoComissoesConteudo({ agrupamentoNome = 'Caiobá Trucks', titulo = 'Comissões - DAF' } = {}) {
  const { user, hasAction, comissaoEscopoEfetivo, comissaoNivelSetorEfetivo } = useAuth()
  const podeCalcular = hasAction('calculo-comissoes', 'calcular')
  const podeSalvar = hasAction('calculo-comissoes', 'salvar')
  const podeConferir = hasAction('calculo-comissoes', 'conferir')
  const podeSalvarPDF = hasAction('calculo-comissoes', 'salvar_pdf')
  const podeExcluir = hasAction('calculo-comissoes', 'excluir')
  const usuarioLabel = user?.email || 'desconhecido'

  const sufixoSessao = agrupamentoNome === 'Caiobá Trucks' ? '' : `_${agrupamentoNome.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`
  const [periodoInicio, setPeriodoInicio] = useSessionState(`calccom_ini${sufixoSessao}`, '')
  const [periodoFim, setPeriodoFim] = useSessionState(`calccom_fim${sufixoSessao}`, '')

  // Lote de aprovação do período (Rascunho -> Conferido -> Processado)
  const [lote, setLote] = useState(null)
  const [carregandoLoteObj, setCarregandoLoteObj] = useState(false)
  const [carregandoValoresSalvos, setCarregandoValoresSalvos] = useState(false)
  const carregandoLote = carregandoLoteObj || carregandoValoresSalvos
  const [processandoAcao, setProcessandoAcao] = useState(null)
  const [historicoLote, setHistoricoLote] = useState([])
  const [carregandoHistoricoLote, setCarregandoHistoricoLote] = useState(false)
  const [mostrarHistoricoLote, setMostrarHistoricoLote] = useState(false)

  const [carregandoLista, setCarregandoLista] = useState(true)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  const [calculando, setCalculando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [regraModal, setRegraModal] = useState(null) // { nome, baseNome, faixas } da regra aberta na telinha
  const [colunaModal, setColunaModal] = useState(null) // { baseNome, colunas: [{coluna,valor}], total } — Base sem Regra, com Venda/Devolução separadas
  const [valoresPorFuncionario, setValoresPorFuncionario] = useState({})
  // Detalhamento por empresa (política Nível EMPRESA com "Detalhar por empresa" marcado) —
  // chaveLinha(c) -> [{ empresa, valorBase, valorComissao }]. Só existe em memória depois de
  // Calcular nesta sessão; não é salvo no banco (é um detalhe de auditoria do total já salvo).
  const [detalhePorEmpresa, setDetalhePorEmpresa] = useState({})

  // Filtros aplicados ANTES de calcular — servem pra escolher quem entra na conta,
  // e também são a base pra quando os acessos por setor/gerente forem liberados depois.
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  // Setor é seleção única (array de 0 ou 1 elemento, igual Empresa) — sem nenhum marcado, a
  // tabela mostra a visão combinada de todos; com um marcado, libera as ações do fluxo de
  // aprovação (Calcular/Salvar/Conferir/Processar/Excluir) daquele setor (ver setorUnicoSelecionado).
  const [filtrosSetor, setFiltrosSetor] = useState([])
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [pdfModalAberto, setPdfModalAberto] = useState(false)
  const [pdfSetoresSelecionados, setPdfSetoresSelecionados] = useState([])

  const periodoValido = periodoInicio && periodoFim && periodoInicio <= periodoFim && mesmoMes(periodoInicio, periodoFim)
  const periodoMesesDiferentes = periodoInicio && periodoFim && !mesmoMes(periodoInicio, periodoFim)
  const loteBloqueado = lote && lote.status !== 'RASCUNHO'

  // Move o período inteiro pro mês anterior/seguinte, sempre preenchendo do dia 1 ao último dia.
  const mudarMes = (delta) => {
    const base = periodoInicio || periodoFim || new Date().toISOString().slice(0, 10)
    const [ano, mes] = base.split('-').map(Number)
    const data = new Date(ano, mes - 1 + delta, 1)
    const anoAlvo = data.getFullYear()
    const mesAlvo = data.getMonth()
    const ultimoDia = new Date(anoAlvo, mesAlvo + 1, 0).getDate()
    const pad = (n) => String(n).padStart(2, '0')
    setPeriodoInicio(`${anoAlvo}-${pad(mesAlvo + 1)}-01`)
    setPeriodoFim(`${anoAlvo}-${pad(mesAlvo + 1)}-${pad(ultimoDia)}`)
  }

  // Ao abrir a tela, o período sempre volta pro mês anterior (dia 1 ao último dia) — a comissão
  // é calculada sobre o mês fechado, não o corrente; se o usuário tinha deixado outro mês
  // selecionado na sessão anterior, não fica preso nele.
  useEffect(() => {
    const hoje = new Date()
    const anterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
    const ano = anterior.getFullYear()
    const mes = anterior.getMonth()
    const pad = (n) => String(n).padStart(2, '0')
    const mesAlvo = `${ano}-${pad(mes + 1)}`
    if (periodoInicio.slice(0, 7) === mesAlvo && periodoFim.slice(0, 7) === mesAlvo) return
    const ultimoDia = new Date(ano, mes + 1, 0).getDate()
    setPeriodoInicio(`${mesAlvo}-01`)
    setPeriodoFim(`${mesAlvo}-${pad(ultimoDia)}`)
  }, [])

  // Empresa selecionada (aba) — id resolvido a partir do nome pra passar pro backend. Cada
  // empresa tem seu próprio lote no mesmo período (ver salvarLoteRascunho/getLoteComissoes).
  const empresaSelecionadaId = useMemo(() => {
    if (!filtroEmpresa || !dados) return null
    const achada = dados.empresas.find(e => (e.empresa_fantasia || e.nome_empresa) === filtroEmpresa)
    return achada?.id || null
  }, [filtroEmpresa, dados])

  // Só existe "o" setor selecionado quando exatamente 1 estiver marcado — com 0 ou 2+,
  // não há um lote único pra apontar, então as ações do fluxo de aprovação ficam bloqueadas
  // (a tabela continua mostrando a visão combinada normalmente).
  const setorUnicoSelecionado = filtrosSetor.length === 1 ? filtrosSetor[0] : null

  // Setor selecionado (2ª aba, dentro da empresa) — mesmo padrão, um nível mais fundo: vários
  // gerentes na mesma loja, cada um responsável por um setor, cada um com seu próprio lote no
  // mesmo período+empresa (ver salvarLoteRascunho/getLoteComissoes).
  const setorSelecionadoObj = useMemo(() => {
    if (!setorUnicoSelecionado || !dados) return null
    return dados.setores.find(s => s.nome_setor === setorUnicoSelecionado) || null
  }, [setorUnicoSelecionado, dados])
  const setorSelecionadoId = setorSelecionadoObj?.id || null
  const departamentoDoSetorSelecionadoId = setorSelecionadoObj?.departamento_id || null

  // Nível de acesso extra por Setor (Grupos de Acesso → Acesso à Cálculo de Comissões).
  const setorSomenteVisualizacao = setorSoVisualizacao(setorSelecionadoId, comissaoNivelSetorEfetivo)

  // Busca o lote de aprovação (da empresa+setor selecionados) sempre que Data Início/Fim/
  // Empresa/Setor mudam. Só existe um lote pra apontar quando exatamente 1 setor está marcado —
  // com 0 ou 2+ marcados fica null (não tem workflow único pra exibir, mas a tabela e os
  // valores salvos continuam aparecendo normalmente).
  useEffect(() => {
    setLote(null)
    setHistoricoLote([])
    setMostrarHistoricoLote(false)
    // Sem isso, sair do "if" abaixo (empresa/setor desmarcados no meio de uma busca em
    // andamento) deixava carregandoLoteObj travado em true pra sempre — a busca cancelada não
    // reseta o próprio flag (o cancelamento existe só pra não sobrescrever o estado com uma
    // resposta atrasada), e o "return" antecipado também não passava por ali.
    setCarregandoLoteObj(false)
    if (!periodoValido || !filtroEmpresa || !setorUnicoSelecionado) return
    let cancelado = false
    ;(async () => {
      setCarregandoLoteObj(true)
      try {
        // Alguns lotes antigos foram salvos com setor_id nulo mesmo tendo um setor_nome válido
        // (dado legado) — a busca por id não acha esses. E o pseudo-setor "Sem Setor" nunca tem
        // id de verdade pra buscar por id (buscar por id nulo pegaria TODOS os lotes-sem-id da
        // empresa de uma vez, o que já causou "JSON object requested, multiple (or no) rows
        // returned" aqui). Então: busca por id só quando há um id real; senão (ou se não achar),
        // cai pro fallback que traz todos os lotes da empresa+período e casa pelo nome do setor.
        let loteAtual = setorSelecionadoId
          ? await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaSelecionadaId, setorSelecionadoId)
          : null
        if (!loteAtual) {
          const todos = await apiService.getLotesPorEmpresaPeriodo(periodoInicio, periodoFim, empresaSelecionadaId)
          loteAtual = todos.find(l => (l.setor_nome || SEM_SETOR) === setorUnicoSelecionado) || null
        }
        // Sem lote exato: usa o lote gerado com um período menor dentro do intervalo (mês visto
        // inteiro, cálculo feito só até uma data anterior).
        if (!loteAtual) loteAtual = await apiService.getLoteContidoNoPeriodo(periodoInicio, periodoFim, empresaSelecionadaId, setorSelecionadoId)
        if (!cancelado) setLote(loteAtual)
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLoteObj(false)
      }
    })()
    return () => { cancelado = true }
  }, [periodoInicio, periodoFim, periodoValido, filtroEmpresa, empresaSelecionadaId, setorUnicoSelecionado, setorSelecionadoId])

  // Busca os valores já salvos desse período — independente de quantas empresas/departamentos
  // estão marcados (0, 1 ou vários), já que getComissoesCalculadas não é escopado por
  // empresa/departamento; o que aparece na tela já é filtrado pelos candidatos visíveis. Sem
  // isso, reabrir um período já calculado com vários (ou nenhum) marcado mostrava tudo como
  // "Pendente" e sem valor, mesmo já tendo sido conferido — sem precisar recalcular à toa.
  useEffect(() => {
    setValoresPorFuncionario({})
    setDetalhePorEmpresa({})
    setSalvo(false)
    if (!periodoValido) return
    // Se o período mudar de novo antes desta busca terminar (ex: abrir a tela já reseta pro mês
    // atual e o usuário clica na seta logo em seguida), a resposta antiga é descartada — sem
    // isso, a resposta atrasada do período anterior sobrescrevia o estado do período novo.
    let cancelado = false
    ;(async () => {
      setCarregandoValoresSalvos(true)
      try {
        const salvos = await apiService.getComissoesCalculadas(periodoInicio, periodoFim)
        if (cancelado) return
        // getComissoesCalculadas vem ordenado por calculado_em desc — o primeiro registro de
        // cada (funcionário + política) encontrado já é o mais recente (ignora duplicatas mais
        // antigas). Um funcionário pode ter mais de uma linha salva (uma por política/base).
        const porLinha = {}
        const detalhePorLinha = {}
        for (const s of salvos) {
          const chave = `${s.funcionario_id}::${s.politica_id}::${s.periodo_inicio || ''}::${s.periodo_fim || ''}`
          if (porLinha[chave]) continue
          porLinha[chave] = {
            valorBase: s.valor_base,
            valorComissao: s.valor_comissao,
            percentual: s.percentual_aplicado,
            totalLinhasFonte: s.total_linhas_fonte,
            totalLinhasFiltradas: s.total_linhas_filtradas,
            periodoInicio: s.periodo_inicio,
            periodoFim: s.periodo_fim,
          }
          if (s.detalhe_empresas) detalhePorLinha[chave] = s.detalhe_empresas
        }
        // Valor gerado com um período menor que o filtro atual (ex: 01/09 a 25/09 visto em
        // 01/09 a 30/09): também vale pra linha do período cheio — o mais recente por
        // funcionário+política (salvos vem por calculado_em desc). A linha guarda o período
        // original (periodoInicio/periodoFim) pra tela mostrar de quando foi gerado.
        const cheia = {}
        for (const s of salvos) {
          const k = `${s.funcionario_id}::${s.politica_id}::${periodoInicio}::${periodoFim}`
          if (porLinha[k] || cheia[k]) continue
          const orig = `${s.funcionario_id}::${s.politica_id}::${s.periodo_inicio || ''}::${s.periodo_fim || ''}`
          cheia[k] = porLinha[orig]
          if (detalhePorLinha[orig]) detalhePorLinha[k] = detalhePorLinha[orig]
        }
        Object.assign(porLinha, cheia)
        setValoresPorFuncionario(porLinha)
        setDetalhePorEmpresa(detalhePorLinha)
        if (salvos.length > 0) setSalvo(true)
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoValoresSalvos(false)
      }
    })()
    return () => { cancelado = true }
  }, [periodoInicio, periodoFim, periodoValido])

  const carregarHistoricoLote = async (loteId) => {
    setCarregandoHistoricoLote(true)
    try {
      setHistoricoLote(await apiService.getHistoricoLote(loteId))
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCarregandoHistoricoLote(false)
    }
  }

  const toggleHistoricoLote = () => {
    setMostrarHistoricoLote(v => !v)
    if (!mostrarHistoricoLote && lote) carregarHistoricoLote(lote.id)
  }

  const handleConferir = async () => {
    if (!lote) return
    setProcessandoAcao('conferir')
    setErro(null)
    try {
      const atualizado = await apiService.conferirLote(lote.id, usuarioLabel)
      setLote(atualizado)
      if (mostrarHistoricoLote) await carregarHistoricoLote(lote.id)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Só pode excluir com o lote em Rascunho (inclui o Rascunho reaberto por Autorizar
  // Reprocessamento — os dois têm status 'RASCUNHO'). Conferido/Processado ficam travados.
  // Também funciona no estado órfão (valores salvos sem lote — ex: a criação do lote falhou).
  const handleExcluirHistorico = async () => {
    if (!filtroEmpresa || !setorUnicoSelecionado) return
    if (lote ? lote.status !== 'RASCUNHO' : !salvo) return
    if (!window.confirm(`Excluir o histórico salvo de ${filtroEmpresa} / ${setorUnicoSelecionado} neste período? Os valores calculados e o rascunho serão apagados — essa ação não pode ser desfeita.`)) return
    setProcessandoAcao('excluir')
    setErro(null)
    try {
      // Só os funcionários desta empresa+setor — pra não apagar o que outro gerente já salvou de
      // outra empresa/setor no mesmo período (o lote é por período+empresa+setor, mas os valores
      // calculados em fato_comissoes_calculadas não têm essas colunas direto, só via
      // funcionario_id). "Sem setor" é setor_ids vazio, não um id de verdade — não dá pra
      // comparar com .includes(setorSelecionadoId) (que aqui é null e nunca bateria com nada).
      const funcionarioIds = (dados?.funcionarios || [])
        .filter(f => {
          if (f.empresa_id !== empresaSelecionadaId) return false
          if (setorUnicoSelecionado === SEM_SETOR) return (f.setor_ids || []).length === 0
          return (f.setor_ids || []).includes(setorSelecionadoId)
        })
        .map(f => f.id)
      await apiService.excluirHistoricoLote(lote?.id || null, periodoInicio, periodoFim, funcionarioIds)
      setLote(null)
      setLotesPorSetor(prev => ({ ...prev, [setorUnicoSelecionado]: null }))
      setHistoricoLote([])
      setMostrarHistoricoLote(false)
      setValoresPorFuncionario({})
      setDetalhePorEmpresa({})
      setSalvo(false)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Carrega a lista de funcionários + política já ao abrir a tela, sem depender de período.
  useEffect(() => {
    (async () => {
      setCarregandoLista(true)
      setErro(null)
      try {
        const [funcionarios, empresas, cargos, departamentos, setores, politicas, ferias, rubricas, tiposProcesso] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getSetores(),
          apiService.getPoliticaComissao(),
          // Férias são só informativas ao lado do nome — se a tabela ainda não existir/estiver
          // vazia, não pode derrubar o cálculo de comissões inteiro.
          apiService.getFerias().catch(() => []),
          apiService.getRubricas(),
          apiService.getTiposProcesso(),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, setores, politicas, ferias, rubricas, tiposProcesso })
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoLista(false)
      }
    })()
  }, [])

  // Data de modificação do arquivo de férias no SharePoint (só metadado, não baixa o arquivo) —
  // compara contra o mês ATUAL de verdade (hoje), não contra o período selecionado: o período
  // calculado aqui é sempre o mês anterior (fechado), então o arquivo de férias só está em dia
  // se já tiver sido atualizado dentro do mês corrente, capturando os lançamentos feitos durante
  // o mês que acabou de fechar (best-effort: falha aqui não pode derrubar a tela).
  const [infoArquivoFerias, setInfoArquivoFerias] = useState(null)
  useEffect(() => {
    apiService.getInfoArquivoFerias().then(setInfoArquivoFerias).catch(() => setInfoArquivoFerias(null))
  }, [])

  // Setores marcados como "Responsável" em Grupos de Acesso — { [setor_id]: { [empresa_id]: [nomes] } }.
  const [responsaveisPorSetor, setResponsaveisPorSetor] = useState({})
  useEffect(() => {
    apiService.getResponsaveisComissaoSetores().then(setResponsaveisPorSetor).catch(() => setResponsaveisPorSetor({}))
  }, [])
  const mesArquivoFerias = infoArquivoFerias?.dataModificacao?.slice(0, 7) || null
  const mesAtualReal = useMemo(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const feriasDesatualizada = !!(mesArquivoFerias && mesArquivoFerias < mesAtualReal)
  const feriasAtualizada = !!(mesArquivoFerias && mesArquivoFerias >= mesAtualReal)
  // Publica pro BotaoStatusFerias (cabeçalho desta própria tela) mostrar "Atualizar Férias"/
  // "Férias Atualizadas".
  const { setStatus: setFeriasStatus } = useFeriasStatus()
  useEffect(() => {
    setFeriasStatus({ desatualizada: feriasDesatualizada, atualizada: feriasAtualizada })
  }, [feriasDesatualizada, feriasAtualizada, setFeriasStatus])

  // Férias importadas no menu Férias, indexadas por código do empregado + CNPJ da empresa.
  // O código NÃO basta sozinho: cada empresa numera seus funcionários do 1 em diante, então o
  // mesmo código existe em várias empresas (ex: código 10 é uma pessoa diferente em cada loja).
  const feriasPorCodigo = useMemo(() => {
    const mapa = new Map()
    for (const f of dados?.ferias || []) {
      if (f.codigo_empregado == null) continue
      const chave = `${f.codigo_empregado}|${soDigitos(f.cnpj_empresa)}`
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(f)
    }
    return mapa
  }, [dados])

  // Períodos de gozo que cruzam o período selecionado (Data Início/Fim), casando código do
  // funcionário + CNPJ da empresa dele (cadastro de Empresas) com o arquivo do RH.
  const feriasNoPeriodo = (func, empresa) => {
    if (!periodoValido || !func.codigo_funcionario) return []
    const cnpj = soDigitos(empresa?.cnpj)
    if (!cnpj) return []
    const chave = `${parseInt(func.codigo_funcionario, 10)}|${cnpj}`
    const lista = feriasPorCodigo.get(chave) || []
    return lista.filter(f => f.inicio_gozo && f.fim_gozo && f.inicio_gozo <= periodoFim && f.fim_gozo >= periodoInicio)
  }


  // Descrição da Rubrica/Tipo do Processo cadastrados em Regras de Comissões — mostrada junto do
  // código na coluna Comissão, mesmo padrão já usado em Visualizar Política de Comissão e em
  // Processamento de Comissões.
  const rubricasPorCodigo = useMemo(() => Object.fromEntries((dados?.rubricas || []).map(r => [r.codigo, r])), [dados])
  const tiposProcessoPorCodigo = useMemo(() => Object.fromEntries((dados?.tiposProcesso || []).map(t => [t.codigo, t])), [dados])

  // Monta a lista de candidatos (funcionário + política/fonte/base resolvidas, ou motivo de exclusão)
  const candidatos = useMemo(() => {
    if (!dados) return []
    const { funcionarios, empresas, cargos, departamentos, setores, politicas } = dados
    // Mesmo critério de "Situação (Ativo) = Sim" usado em Funcionarios.jsx: sem data de demissão
    // e situação vazia, "1 - Trabalhando" ou "9 - Férias" (exclui Demitido e qualquer outro
    // Afastado — doença etc). Quem está de férias sempre aparece na tabela — `recebe_comissao_ferias`
    // só decide se os dias de férias são descontados do período calculado, não se ele some da lista.
    const funcionariosAtivos = funcionarios.filter(funcionarioAtivoComissao)
    const empresasMap = Object.fromEntries(empresas.map(e => [e.id, e]))
    const cargosMap = Object.fromEntries(cargos.map(c => [c.id, c]))
    const departamentosMap = Object.fromEntries(departamentos.map(d => [d.id, d]))
    const setoresMap = Object.fromEntries(setores.map(s => [s.id, s]))

    // Nível EMPRESA soma TODAS as empresas do mesmo Agrupamento (não só a empresa onde o
    // funcionário está registrado) — ex: um Coordenador de Vendas Atacado deve somar a margem
    // de todas as unidades do grupo, não só da própria filial.
    const empresasPorAgrupamento = new Map()
    for (const e of empresas) {
      if (!e.agrupamento_empresa_id) continue
      if (!empresasPorAgrupamento.has(e.agrupamento_empresa_id)) empresasPorAgrupamento.set(e.agrupamento_empresa_id, [])
      empresasPorAgrupamento.get(e.agrupamento_empresa_id).push(e)
    }
    const nomeSistema = (e) => e ? (e.nome_empresa_sistema || e.empresa_fantasia || e.nome_empresa) : null
    // Nomes que servem pra achar a empresa dentro do arquivo/relatório de origem: o "Nome Empresa
    // no Sistema" de sempre, OU a Sigla — alguns relatórios do MicroWork trazem a empresa como
    // sigla curta (ex: "CGR"), não o nome completo. Qualquer um dos dois bate com a linha.
    const nomesParaFiltro = (e) => e ? [nomeSistema(e), e.sigla_empresa].filter(Boolean) : []
    // Política com "Comissão sobre todas as empresas" marcada ignora o filtro de empresa por
    // completo (mesmo em nível INDIVIDUAL) — soma o faturamento de TODAS as empresas cadastradas.
    const todasEmpresasNomes = [...new Set(empresas.flatMap(nomesParaFiltro))]

    const nomesDepartamentos = (ids) => (ids || []).map(id => departamentosMap[id]?.nome_departamento).filter(Boolean)
    const nomesSetores = (ids) => (ids || []).map(id => setoresMap[id]?.nome_setor).filter(Boolean)
    const nomesAreas = (deptoIds) => [...new Set((deptoIds || []).map(id => departamentosMap[id]?.area).filter(Boolean))]

    // Só entra na tela quem tem Comissão resolvida de ponta a ponta (política + fonte + base
    // configuradas). Quem não tem, simplesmente não aparece aqui. Fonte/Base vêm da política já
    // embutidas por ID (fonte_calculo/base_calculo) — não por um código texto que quebrava ao renomear.
    // Um funcionário pode gerar VÁRIAS linhas aqui, uma por Política de Comissão configurada
    // pro cargo dele (ex: uma política de Peças + outra de Serviços, cada uma com sua Base).
    return funcionariosAtivos
      .flatMap(func => {
        const empresa = empresasMap[func.empresa_id] || null
        // Cada aba (Trucks/Motos) só enxerga funcionários de empresas do próprio agrupamento —
        // sem isso, a contagem de "Calcular Comissões (N)" e tudo mais ficava misturando os dois
        // grupos sempre que nenhuma Empresa estivesse selecionada ainda.
        if (empresa?.agrupamento_nome !== agrupamentoNome) return []
        const cargo = cargosMap[func.cargo_id] || null
        const departamentoNomes = nomesDepartamentos(func.departamento_ids)
        const setorNomes = nomesSetores(func.setor_ids)
        const areaNomes = nomesAreas(func.departamento_ids)
        const base = { func, empresa, cargo, departamentoNomes, setorNomes, areaNomes }

        // Restrição de acesso do grupo (Empresa/Área/Departamento/Setor/Agrupamento de
        // Cargos, configurada em Grupos de Acesso) — funcionário fora do escopo do usuário
        // não aparece em nenhuma etapa da tela, nem pra cálculo nem pra visualização.
        if (!passaEscopoComissao({
          empresaId: func.empresa_id,
          areaNomes,
          departamentoIds: func.departamento_ids,
          setorIds: func.setor_ids,
          agrupamentoCargoId: cargo?.agrupamento_id,
        }, comissaoEscopoEfetivo)) return []

        const empresaNome = nomeSistema(empresa)
        if (!empresaNome) return []

        const politicasCandidatas = resolvePoliticas(func, politicas, empresasMap)
        if (politicasCandidatas.length === 0) return []

        return politicasCandidatas
          .map(politica => {
            if (!politicaConfigurada(politica)) return null
            const baseCalc = politica.base_calculo
            const fonte = fonteDaPolitica(politica)

            // "Comissão sobre todas as empresas" sobrepõe o Nível de Cálculo: soma TODAS as
            // empresas cadastradas, não só o Agrupamento do funcionário. Senão, nível EMPRESA
            // junta os nomes de todas as empresas do mesmo Agrupamento, e INDIVIDUAL/EQUIPE
            // mantém só a própria empresa (comportamento de sempre).
            const empresaNomes = politica.comissao_todas_empresas
              ? todasEmpresasNomes
              : politica.nivel_calculo === 'EMPRESA' && empresa?.agrupamento_empresa_id
              ? [...new Set((empresasPorAgrupamento.get(empresa.agrupamento_empresa_id) || []).flatMap(nomesParaFiltro))]
              : nomesParaFiltro(empresa)

            return { ...base, politica, fonte, base: baseCalc, empresaNome, empresaNomes, status: 'OK' }
          })
          .filter(Boolean)
          // Segmentos de apuração: se o funcionário tem férias dentro do período e NÃO está
          // marcado como "recebe comissão nas férias", o período é quebrado em pedaços SEM os
          // dias de férias — cada pedaço vira uma linha própria, calculada e salva separada.
          // Quem recebe nas férias (ou não tem férias no período) fica com o período cheio.
          .flatMap(linha => {
            if (!periodoValido) return [{ ...linha, segInicio: periodoInicio, segFim: periodoFim }]
            const feriasFunc = feriasNoPeriodo(func, empresa)
            if (feriasFunc.length === 0 || func.recebe_comissao_ferias) {
              return [{ ...linha, segInicio: periodoInicio, segFim: periodoFim }]
            }
            const segmentos = subtraiFerias(periodoInicio, periodoFim, feriasFunc)
            // Férias cobrindo o período inteiro: não sobra nenhum dia pra apurar. Em vez de sumir
            // da tela sem explicação (o que parece bug/cadastro errado), mostra 1 linha sinalizada
            // (status próprio, fora de elegiveisFiltrados — nunca calcula nem entra no lote), pra
            // ficar claro que é "sem comissão porque está de férias o mês inteiro".
            if (segmentos.length === 0) {
              return [{ ...linha, segInicio: periodoInicio, segFim: periodoFim, status: 'FERIAS_MES_INTEIRO' }]
            }
            // Regra por % de Meta Atingida: a meta é mensal — não vira 2+ "prêmios" separados
            // por causa de férias no meio do mês. Fica 1 linha só, mas a etiqueta de período
            // mostra o intervalo realmente lido (sem os dias de férias — mesmo critério das
            // demais linhas do funcionário), não o mês cheio; o cálculo por trás já lia cada
            // pedaço sem férias e soma os valores antes de comparar com a meta (segmentosLeitura).
            if (linha.politica.usa_faixa === 'SIM' && linha.politica.regra_comissao?.tipo_faixa !== 'VALOR' && linha.politica.regra_comissao) {
              const segInicio = segmentos[0]?.inicio || periodoInicio
              const segFim = segmentos[segmentos.length - 1]?.fim || periodoFim
              return [{ ...linha, segInicio, segFim, segmentosLeitura: segmentos }]
            }
            return segmentos.map(seg => ({ ...linha, segInicio: seg.inicio, segFim: seg.fim }))
          })
      })
  }, [dados, periodoInicio, periodoFim, periodoValido, feriasPorCodigo, comissaoEscopoEfetivo, agrupamentoNome])

  // Filtros dinâmicos (facetados): as opções de cada seletor são calculadas aplicando todos os
  // OUTROS filtros ativos, menos o dele mesmo.
  const filtrarCandidatos = useMemo(() => (ignorar) => candidatos.filter(c => {
    if (ignorar !== 'empresa' && filtroEmpresa && (c.empresa?.empresa_fantasia || c.empresa?.nome_empresa) !== filtroEmpresa) return false
    // Setor é subordinado à Empresa nesta tela (não um facet do mesmo nível) — nunca deve
    // estreitar de volta a lista de Empresas. Sem essa exceção, marcar um setor "órfão" (só com
    // lote salvo, sem candidato elegível hoje — ver setoresComLote) zerava empresasUnicas e a
    // Empresa selecionada era limpa sozinha pelo efeito de auto-limpeza de filtro inválido logo
    // abaixo.
    if (ignorar !== 'setor' && ignorar !== 'empresa' && filtrosSetor.length > 0) {
      const nomesOuSemSetor = c.setorNomes.length > 0 ? c.setorNomes : [SEM_SETOR]
      if (!nomesOuSemSetor.some(n => filtrosSetor.includes(n))) return false
    }
    return true
  }), [candidatos, filtroEmpresa, filtrosSetor])

  // Só empresas do agrupamento escolhido (prop agrupamentoNome) — cada aba (Trucks/Motos) só
  // mexe nas empresas do próprio grupo, nunca nas do outro. Vem direto do cadastro (dados.empresas),
  // não de candidatos — uma empresa sem nenhum funcionário com política configurada ainda (ex:
  // agrupamento recém-começando, como Motos) precisa aparecer no seletor do mesmo jeito, pra dar
  // pra escolher a empresa e ver a pendência, em vez de sumir da lista.
  const empresasUnicas = useMemo(() => juntaUnicos(
    (dados?.empresas || []).filter(e => e.agrupamento_nome === agrupamentoNome && e.ativo !== false).map(e => e.empresa_fantasia || e.nome_empresa)
  ), [dados, agrupamentoNome])
  // Setores "órfãos": já têm lote salvo pra empresa+período, mas nenhum funcionário elegível
  // neles HOJE (ex: o cargo foi remanejado pra outro setor depois do cálculo). Sem isso, o lote
  // fica preso — nunca vira aba selecionável, então nunca dá pra excluir.
  const [setoresComLote, setSetoresComLote] = useState([])
  useEffect(() => {
    if (!periodoValido || !filtroEmpresa || !empresaSelecionadaId) { setSetoresComLote([]); return }
    let cancelado = false
    ;(async () => {
      try {
        const lotes = await apiService.getLotesPorEmpresaPeriodo(periodoInicio, periodoFim, empresaSelecionadaId)
        // Nome salvo no lote é um retrato do momento em que foi criado — se o setor foi
        // renomeado depois, resolve pelo id (cadastro atual) primeiro, senão duplica aba com o
        // nome antigo ao lado do nome novo pro mesmo setor.
        if (!cancelado) setSetoresComLote(lotes.map(l => {
          const nomeAtual = l.setor_id ? dados?.setores.find(s => s.id === l.setor_id)?.nome_setor : null
          return nomeAtual || l.setor_nome || SEM_SETOR
        }))
      } catch {
        if (!cancelado) setSetoresComLote([])
      }
    })()
    return () => { cancelado = true }
  }, [filtroEmpresa, empresaSelecionadaId, periodoInicio, periodoFim, periodoValido, dados])

  // Cobre o caso mais órfão de todos: valor calculado e salvo, mas nem lote foi criado (aparece
  // em Processamento de Comissões como "Sem lote"). Nesse caso nem setoresComLote enxerga — cruza
  // direto os funcionários com valor salvo neste período contra o cadastro de funcionários (sem
  // exigir política/elegibilidade viva), pra sempre existir uma aba pra selecionar e excluir.
  const setoresComValorSalvo = useMemo(() => {
    if (!filtroEmpresa || !empresaSelecionadaId || !dados) return []
    const funcionarioIdsComValor = new Set(Object.keys(valoresPorFuncionario).map(chave => chave.split('::')[0]))
    if (funcionarioIdsComValor.size === 0) return []
    const nomes = new Set()
    for (const f of dados.funcionarios || []) {
      if (f.empresa_id !== empresaSelecionadaId || !funcionarioIdsComValor.has(f.id)) continue
      const setNomes = (f.setor_ids || []).map(id => dados.setores.find(s => s.id === id)?.nome_setor).filter(Boolean)
      if (setNomes.length === 0) nomes.add(SEM_SETOR)
      else setNomes.forEach(n => nomes.add(n))
    }
    return [...nomes]
  }, [filtroEmpresa, empresaSelecionadaId, dados, valoresPorFuncionario])

  // Abas de Setor respeitam o escopo de Setor do grupo (Grupos de Acesso) — sem isso, setores com
  // lote/valor salvo no período (ou o 2º setor de um funcionário liberado) viravam aba mesmo fora
  // do que foi liberado. Filtra por nome porque a aba é por nome (setores homônimos de
  // departamentos diferentes passam se qualquer um deles estiver liberado).
  const setorNomePermitido = useMemo(() => {
    const cfg = comissaoEscopoEfetivo?.setor
    if (!cfg || cfg.modo !== 'INDIVIDUAL') return () => true
    const nomes = new Set((dados?.setores || []).filter(s => cfg.valores.has(s.id)).map(s => s.nome_setor))
    return (nome) => nomes.has(nome)
  }, [comissaoEscopoEfetivo, dados])

  const setoresUnicos = useMemo(() => juntaUnicos([
    ...filtrarCandidatos('setor').flatMap(c => c.setorNomes.length > 0 ? c.setorNomes : [SEM_SETOR]),
    ...setoresComLote,
    ...setoresComValorSalvo,
  ]).filter(setorNomePermitido), [filtrarCandidatos, setoresComLote, setoresComValorSalvo, setorNomePermitido])


  // Lote de CADA setor da empresa selecionada, no período atual — busca todos de uma vez (não só
  // os marcados) porque serve pra duas coisas: sinalizar nas próprias abas quais setores ainda
  // não fecharam (bolinha antes do nome) e liberar o Salvar PDF em modo "vários" (quando os
  // marcados, ou todos se nenhum estiver marcado, já estão Conferidos).
  const [lotesPorSetor, setLotesPorSetor] = useState({}) // nome_setor -> lote | null
  const [carregandoLotesSetores, setCarregandoLotesSetores] = useState(false)
  useEffect(() => {
    if (!periodoValido || !filtroEmpresa || setoresUnicos.length === 0 || !dados) {
      setLotesPorSetor({})
      return
    }
    let cancelado = false
    ;(async () => {
      setCarregandoLotesSetores(true)
      try {
        const entradas = await Promise.all(setoresUnicos.map(async (nome) => {
          const setId = dados.setores.find(s => s.nome_setor === nome)?.id || null
          const lote = setId ? (await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaSelecionadaId, setId) || await apiService.getLoteContidoNoPeriodo(periodoInicio, periodoFim, empresaSelecionadaId, setId)) : null
          return [nome, lote]
        }))
        if (!cancelado) setLotesPorSetor(Object.fromEntries(entradas))
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLotesSetores(false)
      }
    })()
    return () => { cancelado = true }
  }, [setoresUnicos, periodoInicio, periodoFim, periodoValido, filtroEmpresa, empresaSelecionadaId, dados])

  // Modo "todas as empresas" do Salvar PDF — só existe quando NENHUMA empresa está marcada (o
  // que já implica nenhum setor marcado, já que as abas de Setor só aparecem depois de escolher
  // uma empresa). Todas as combinações empresa+setor que têm algum candidato com política
  // resolvida, usadas pra checar se TODAS já estão Conferidas antes de liberar o PDF combinado.
  const combinacoesEmpresaSetor = useMemo(() => {
    if (filtroEmpresa) return []
    const vistos = new Map() // `${empresaId}::${setNome}` -> { empresaId, empresaNome, setNome }
    for (const c of candidatos) {
      const empresaId = c.func.empresa_id
      const empresaNome = c.empresa?.empresa_fantasia || c.empresa?.nome_empresa
      if (!empresaId || !empresaNome) continue
      for (const setNome of c.setorNomes || []) {
        const chave = `${empresaId}::${setNome}`
        if (!vistos.has(chave)) vistos.set(chave, { empresaId, empresaNome, setNome })
      }
    }
    return [...vistos.values()]
  }, [filtroEmpresa, candidatos])

  const [lotesTodasEmpresas, setLotesTodasEmpresas] = useState([])
  const [carregandoLotesTodasEmpresas, setCarregandoLotesTodasEmpresas] = useState(false)
  useEffect(() => {
    if (filtroEmpresa || !periodoValido || combinacoesEmpresaSetor.length === 0 || !dados) {
      setLotesTodasEmpresas([])
      return
    }
    let cancelado = false
    ;(async () => {
      setCarregandoLotesTodasEmpresas(true)
      try {
        const lotes = await Promise.all(combinacoesEmpresaSetor.map(async ({ empresaId, setNome }) => {
          const setId = dados.setores.find(s => s.nome_setor === setNome)?.id || null
          return setId ? (await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaId, setId) || await apiService.getLoteContidoNoPeriodo(periodoInicio, periodoFim, empresaId, setId)) : null
        }))
        if (!cancelado) setLotesTodasEmpresas(lotes)
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLotesTodasEmpresas(false)
      }
    })()
    return () => { cancelado = true }
  }, [filtroEmpresa, combinacoesEmpresaSetor, periodoInicio, periodoFim, periodoValido, dados])
  // Mesmo lookup de combinacoesEmpresaSetor/lotesTodasEmpresas, só que indexado por
  // empresa+setor — usado em statusLinha pra resolver o status de cada funcionário na visão
  // "Todas as Empresas" (sem isso, todo mundo aparecia preso em "Aguardando Gerente" mesmo já
  // Conferido/Processado, porque lotesPorSetor só é buscado com empresa marcada).
  const lotesTodasEmpresasPorChave = useMemo(
    () => Object.fromEntries(combinacoesEmpresaSetor.map((combo, i) => [`${combo.empresaId}::${combo.setNome}`, lotesTodasEmpresas[i]])),
    [combinacoesEmpresaSetor, lotesTodasEmpresas]
  )

  // Ações no lote do setor aberto (Salvar, Conferir...) devolvem o lote atualizado em `lote`, mas
  // a bolinha das abas e o Exportar leem lotesPorSetor, buscado só ao trocar empresa/período.
  // Espelha o lote aberto ali na hora, sem precisar recarregar a página.
  useEffect(() => {
    if (!lote || !setorUnicoSelecionado || lote.empresa_id !== empresaSelecionadaId) return
    setLotesPorSetor(prev => (prev[setorUnicoSelecionado] === lote ? prev : { ...prev, [setorUnicoSelecionado]: lote }))
  }, [lote, setorUnicoSelecionado, empresaSelecionadaId])

  const chaveSetorPdf = (empresaId, nomeSetor) => {
    const setorId = dados?.setores.find(s => s.nome_setor === nomeSetor)?.id
    return `${empresaId}::${setorId || nomeSetor}`
  }

  const setoresFechadosParaPdf = useMemo(() => {
    if (!periodoValido || !dados) return []
    const opcoes = []
    const adicionarSeFechado = (empresaId, empresaNome, nomeSetor, loteFechado) => {
      const setor = dados.setores.find(s => s.nome_setor === nomeSetor)
      if (!loteFechado || loteFechado.status === 'RASCUNHO' || !setor?.id) return
      if (setorSoVisualizacao(setor.id, comissaoNivelSetorEfetivo)) return
      opcoes.push({ key: `${empresaId}::${setor.id}`, empresaId, empresaNome, nomeSetor })
    }

    if (filtroEmpresa) {
      for (const nomeSetor of setoresUnicos) {
        adicionarSeFechado(empresaSelecionadaId, filtroEmpresa, nomeSetor, lotesPorSetor[nomeSetor])
      }
    } else {
      combinacoesEmpresaSetor.forEach((combo, i) => {
        adicionarSeFechado(combo.empresaId, combo.empresaNome, combo.setNome, lotesTodasEmpresas[i])
      })
    }
    return opcoes.sort((a, b) => a.empresaNome.localeCompare(b.empresaNome, 'pt-BR') || a.nomeSetor.localeCompare(b.nomeSetor, 'pt-BR'))
  }, [periodoValido, dados, filtroEmpresa, empresaSelecionadaId, setoresUnicos, lotesPorSetor, combinacoesEmpresaSetor, lotesTodasEmpresas, comissaoNivelSetorEfetivo])

  const carregandoStatusPdf = filtroEmpresa ? carregandoLotesSetores : carregandoLotesTodasEmpresas
  const abrirModalExportar = () => {
    setPdfSetoresSelecionados([])
    setPdfModalAberto(true)
  }

  // Sem empresa selecionada não lista funcionários — a Empresa é obrigatória.
  const candidatosFiltrados = useMemo(() => filtroEmpresa ? filtrarCandidatos(null) : [], [filtrarCandidatos, filtroEmpresa])

  // Se a Empresa ou o Setor selecionados ficarem sem opção depois de recarregar os dados, limpa
  // o filtro incompatível em vez de deixar a lista zerada sem explicação.
  useEffect(() => {
    if (filtroEmpresa && !empresasUnicas.includes(filtroEmpresa)) setFiltroEmpresa('')
    if (filtrosSetor.some(s => !setoresUnicos.includes(s))) setFiltrosSetor(prev => prev.filter(s => setoresUnicos.includes(s)))
  }, [empresasUnicas, setoresUnicos])

  // Com o lote bloqueado (Conferido/Processado), só quem estiver liberado pra reprocessamento
  // parcial (autorizado em Histórico de Comissões) continua elegível — sem liberação nenhuma,
  // fica vazio, o que já bloqueia Calcular/Salvar naturalmente (sem precisar checar loteBloqueado
  // à parte nos handlers/botões).
  const elegiveisFiltrados = useMemo(() => {
    const base = candidatosFiltrados.filter(c => c.status === 'OK')
    if (!loteBloqueado) return base
    const liberados = new Set(lote?.funcionarios_liberados_reprocessamento || [])
    return base.filter(c => liberados.has(c.func.id))
  }, [candidatosFiltrados, loteBloqueado, lote])

  // Quem está de férias o período inteiro não entra no cálculo de verdade (não tem Base pra
  // apurar) — mas "Calcular" ainda grava uma linha zerada pra esses, só pra ficar registrado
  // que a pessoa estava de férias naquele mês (em vez de simplesmente não existir nenhum
  // registro salvo pra ela).
  const feriasParaZerar = useMemo(() => candidatosFiltrados.filter(c => c.status === 'FERIAS_MES_INTEIRO'), [candidatosFiltrados])

  // Status da linha (badge antes do código): Reprocessar (liberado parcialmente em Histórico
  // de Comissões), Pendente (nunca calculado), ou o status do lote pra quem já foi calculado.
  const statusLinha = (c) => {
    const liberado = !!lote?.funcionarios_liberados_reprocessamento?.includes(c.func.id)
    const res = valoresPorFuncionario[chaveLinha(c)]
    const calculado = !!res
    if (liberado) return { label: 'Aguardando Reprocessamento', className: 'bg-amber-100 text-amber-700' }
    if (!calculado) return { label: 'Pendente', className: 'bg-slate-100 text-slate-500' }
    // Regra por % de Meta sem meta cadastrada pro funcionário/mês: fica visivelmente diferente
    // de "Pendente" (nunca foi calculado) — aqui já foi calculado, só falta a Meta pra resolver.
    if (res.semMeta) return { label: 'Sem Meta', className: 'bg-amber-100 text-amber-700' }
    // Com exatamente 1 setor marcado usa o `lote` único já carregado; em modo combinado (0 ou 2+
    // marcados) não tem um lote só pra apontar, então olha o lote do(s) setor(es) do próprio
    // candidato — de lotesPorSetor (empresa marcada) ou, sem empresa nenhuma selecionada, de
    // lotesTodasEmpresasPorChave (empresa+setor do próprio candidato). Sem isso, todo mundo
    // aparecia preso em "Aguardando Gerente" na visão sem empresa, mesmo já Conferido/Processado.
    const statusEfetivo = setorUnicoSelecionado
      ? lote?.status
      : filtroEmpresa
        ? (c.setorNomes || []).map(n => lotesPorSetor[n]?.status).find(Boolean)
        : (c.setorNomes || []).map(n => lotesTodasEmpresasPorChave[`${c.func.empresa_id}::${n}`]?.status).find(Boolean)
    // Mesmos rótulos usados em Processamento de Comissões (STATUS_LOTE_INFO), pra identificar de
    // cara em que etapa do fluxo aquele funcionário está sem precisar trocar de aba.
    if (statusEfetivo === 'PROCESSADO') return { label: 'Processado', className: 'bg-emerald-100 text-emerald-700' }
    if (statusEfetivo === 'CONFERIDO_DP') return { label: 'Aguardando Processamento', className: 'bg-indigo-100 text-indigo-700' }
    if (statusEfetivo === 'CONFERIDO') return { label: 'Aguardando DP', className: 'bg-blue-100 text-blue-700' }
    return { label: 'Aguardando Gerente', className: 'bg-slate-200 text-slate-700' }
  }

  const handleCalcular = async () => {
    if (!periodoValido || (elegiveisFiltrados.length === 0 && feriasParaZerar.length === 0)) return
    setCalculando(true)
    setErro(null)
    setSalvo(false)
    try {
      // Quem está de férias o período inteiro: zera direto, sem chamar o motor de cálculo (não
      // tem Base nenhuma pra ler — 0 dias no período).
      if (feriasParaZerar.length > 0) {
        setValoresPorFuncionario(prev => {
          const novo = { ...prev }
          feriasParaZerar.forEach(c => {
            novo[chaveLinha(c)] = {
              valorBase: 0, valorComissao: 0, percentual: null, valorFixo: null, semMeta: false,
              percentualAtingido: null, meta: null, valorPorColuna: null,
              totalLinhasFonte: null, totalLinhasFiltradas: null,
              periodoInicio: c.segInicio || periodoInicio, periodoFim: c.segFim || periodoFim,
              segmentos: null,
            }
          })
          return novo
        })
      }
      if (elegiveisFiltrados.length === 0) return
      const baseIdsUnicos = [...new Set(elegiveisFiltrados.map(c => c.base.id))]
      const regrasPorBase = {}
      await Promise.all(baseIdsUnicos.map(async (baseId) => {
        regrasPorBase[baseId] = await apiService.getRegrasParaCalculo(baseId)
      }))

      const itemBase = (c) => ({
        microwork: c.fonte._microwork ? c.fonte : null,
        pasta: c.fonte.pasta_sharepoint,
        prefixo: c.fonte.prefixo_arquivo,
        usaSubpastaAno: c.fonte.usa_subpasta_ano,
        subpastaPadrao: c.fonte.subpasta_padrao || null,
        linhaCabecalho: c.fonte.linha_cabecalho,
        colunaEmpresa: c.fonte.coluna_empresa,
        colunaData: c.fonte.coluna_data,
        colunaFuncionario: c.fonte.coluna_funcionario || null,
        colunaValor: c.base.coluna_valor,
        colunaTipoMovimento: c.base.coluna_tipo_movimento || null,
        tipoAgregacao: c.base.tipo_agregacao,
        regras: regrasPorBase[c.base.id] || [],
        funcionarioNome: c.politica.nivel_calculo === 'INDIVIDUAL' ? c.func.nome_funcionario : null,
        // Cada linha calcula o próprio segmento de apuração — o período cheio, ou os pedaços
        // sem os dias de férias de quem não recebe comissão durante as férias.
        dataInicio: c.segInicio || periodoInicio,
        dataFim: c.segFim || periodoFim,
      })

      // Candidato com segmentosLeitura (Regra por % de Meta + férias no meio do mês): manda UM
      // item por pedaço sem férias, cada um com id próprio (senão o lote não saberia separar as
      // leituras) — os resultados são somados manualmente logo abaixo, numa única linha.
      const segmentosPorLinha = new Map() // chaveLinha(c) -> [{ tempId, inicio, fim }]
      const itens = elegiveisFiltrados.flatMap(c => {
        if (Array.isArray(c.segmentosLeitura) && c.segmentosLeitura.length > 0) {
          const chave = chaveLinha(c)
          const lista = c.segmentosLeitura.map((seg, i) => ({ tempId: `${chave}::SEG::${i}`, inicio: seg.inicio, fim: seg.fim }))
          segmentosPorLinha.set(chave, lista)
          return lista.map(({ tempId, inicio, fim }) => ({ id: tempId, ...itemBase(c), dataInicio: inicio, dataFim: fim, empresaNomes: c.empresaNomes }))
        }
        return [{ id: chaveLinha(c), ...itemBase(c), empresaNomes: c.empresaNomes }]
      })

      // "Detalhar por empresa": só faz sentido no Nível EMPRESA (soma várias empresas num total
      // só) — pra cada uma dessas linhas, manda UM item por empresa do Agrupamento, além do item
      // agregado acima. O batch agrupa por arquivo, então isso não relê nada a mais — é a MESMA
      // leitura, só com mais "baldes" acumulando em paralelo.
      const detalheInfo = []
      const itensDetalhe = []
      elegiveisFiltrados.forEach(c => {
        if (!c.politica.detalhar_por_empresa || c.politica.nivel_calculo !== 'EMPRESA') return
        if (!Array.isArray(c.empresaNomes) || c.empresaNomes.length < 2) return
        c.empresaNomes.forEach((empresaNome, i) => {
          const id = `${chaveLinha(c)}::EMP::${i}`
          detalheInfo.push({ id, c, empresaNome })
          itensDetalhe.push({ id, ...itemBase(c), empresaNomes: [empresaNome] })
        })
      })

      const resultados = await apiService.calcularComissoesLote([...itens, ...itensDetalhe])
      const resultadosPorId = new Map(resultados.map(r => [r.id, r]))

      // Junta os segmentos de leitura (por férias) de volta numa única linha: soma os valores,
      // guarda o detalhamento por período (mostrado na telinha da Regra) sob a chave real da
      // linha — dali em diante essa linha se comporta como qualquer outra (1 resultado só).
      const segmentosResolvidos = {}
      segmentosPorLinha.forEach((lista, chave) => {
        let soma = 0, totalFonte = 0, totalFiltradas = 0
        const detalhe = []
        lista.forEach(({ tempId, inicio, fim }) => {
          const r = resultadosPorId.get(tempId)
          if (!r) return
          soma += r.valor ?? 0
          totalFonte = Math.max(totalFonte, r.total_linhas_fonte ?? 0)
          totalFiltradas += r.total_linhas_filtradas ?? 0
          detalhe.push({ dataInicio: inicio, dataFim: fim, valorBase: r.valor ?? 0 })
        })
        resultadosPorId.set(chave, { id: chave, valor: soma, total_linhas_fonte: totalFonte, total_linhas_filtradas: totalFiltradas })
        segmentosResolvidos[chave] = detalhe
      })

      // Políticas com Regra por % de Meta Atingida: busca a meta publicada (Planejamento de
      // Metas) de cada funcionário envolvido, agrupando por mês/ano (normalmente 1 grupo só —
      // só varia se um funcionário tiver segmento de férias cruzando virada de mês) — sem meta
      // cadastrada vira pendência, nunca calcula como se a meta fosse 0.
      const precisamMeta = elegiveisFiltrados
        .filter(c => c?.politica?.usa_faixa === 'SIM' && c.politica.regra_comissao?.tipo_faixa !== 'VALOR' && c.politica.regra_comissao?.meta_tipo)
      let metaMap = {}
      if (precisamMeta.length > 0) {
        const grupos = new Map()
        const regrasEquipePorChave = new Map() // "regraId::empresaId" -> { regra, empresaId }
        precisamMeta.forEach(c => {
          const iso = c.segInicio || periodoInicio
          const chaveGrupo = iso.slice(0, 7)
          if (!grupos.has(chaveGrupo)) grupos.set(chaveGrupo, { ano: Number(iso.slice(0, 4)), mes: Number(iso.slice(5, 7)), colaboradorIds: new Set(), tipos: new Set(), regraEquipeChaves: new Set() })
          const g = grupos.get(chaveGrupo)
          const regra = c.politica.regra_comissao
          // "Meta de Equipe": não busca a meta do próprio funcionário — busca (uma vez por
          // Regra+Empresa) a soma das metas dos cargos DA MESMA EMPRESA nos Agrupamentos
          // marcados em RegrasFaixas.jsx (times de lojas diferentes não se misturam).
          if (regra.meta_equipe_agrupamento_ids?.length > 0) {
            const chaveEquipe = `${regra.id}::${c.func.empresa_id}`
            g.regraEquipeChaves.add(chaveEquipe)
            regrasEquipePorChave.set(chaveEquipe, { regra, empresaId: c.func.empresa_id })
          } else {
            g.colaboradorIds.add(c.func.id)
          }
          g.tipos.add(regra.meta_tipo)
        })
        const partesIndividuais = await Promise.all(
          [...grupos.values()].filter(g => g.colaboradorIds.size > 0).map(g =>
            apiService.getMetasFuncionariosPeriodo([...g.colaboradorIds], g.ano, g.mes, [...g.tipos])
          )
        )
        const partesEquipe = await Promise.all(
          [...grupos.values()].flatMap(g => [...g.regraEquipeChaves].map(async chaveEquipe => {
            const { regra, empresaId } = regrasEquipePorChave.get(chaveEquipe)
            const soma = await apiService.getMetaEquipePeriodo(regra.meta_equipe_agrupamento_ids, empresaId, g.ano, g.mes, regra.meta_tipo)
            return { [`EQUIPE::${chaveEquipe}`]: soma }
          }))
        )
        metaMap = Object.assign({}, ...partesIndividuais, ...partesEquipe)
      }

      // Base da comissão do Prêmio (Regra por % de Meta): soma do VALOR DE COMISSÃO já calculado
      // (não o valor apurado bruto) das políticas marcadas em "Políticas que formam a Base da
      // Comissão" (cadastro da Regra, aba Regras) — o valor apurado da própria Base do Prêmio
      // (ex: Faturamento Total) só serve pra achar a %.
      // Chave por funcionário+regra (não só funcionário) pra suportar 2+ Prêmios diferentes.
      const baseComissaoMetaMap = new Map()
      if (precisamMeta.length > 0) {
        precisamMeta.forEach(premio => {
          const ids = new Set(premio.politica.regra_comissao.base_politica_ids || [])
          if (ids.size === 0) return
          let soma = 0
          elegiveisFiltrados.forEach(c => {
            if (c.func.id !== premio.func.id) return
            const grupoId = c.politica.grupo_politica_id || c.politica.id
            if (!ids.has(grupoId)) return
            const r = resultadosPorId.get(chaveLinha(c))
            if (!r) return
            // Soma o VALOR DA COMISSÃO já calculada dessa política (% ou R$ Valor dela mesma
            // aplicado sobre o valor apurado), não o valor apurado bruto — o Prêmio é um bônus
            // em cima do que já foi ganho de comissão, não do faturamento/produção em si.
            soma += calcularComissaoSobre(c, r.valor ?? 0, metaMap, baseComissaoMetaMap).valorComissao ?? 0
          })
          baseComissaoMetaMap.set(`${premio.func.id}::${premio.politica.regra_comissao.id}`, soma)
        })
      }

      setValoresPorFuncionario(prev => {
        const novo = { ...prev }
        elegiveisFiltrados.forEach(c => {
          const chave = chaveLinha(c)
          const r = resultadosPorId.get(chave)
          if (!r) return
          const valorLido = r.valor ?? 0
          const { percentual, valorFixo, valorComissao, semMeta, percentualAtingido, meta, baseComissao, valorApurado, valorBruto, descontoPct } = calcularComissaoSobre(c, valorLido, metaMap, baseComissaoMetaMap)
          novo[chave] = {
            // Pro Prêmio (% Meta/Valor Fixo), "Base Comissão" na tabela é o que a % realmente
            // multiplicou (Individual+Equipe) — o valor apurado (já líquido, se a Regra tiver
            // Desconto) fica só no campo valorApurado, usado na telinha pra mostrar contra o que
            // a Meta foi comparada. Sem Prêmio, valorBase já É o valor apurado (líquido, se houver
            // desconto) — antes não tinha desconto nenhum, então isso não muda nada de antes.
            valorBase: baseComissao != null ? baseComissao : (valorApurado ?? valorLido),
            valorApurado: baseComissao != null ? valorApurado : undefined,
            valorBruto, descontoPct,
            valorComissao, percentual, valorFixo, semMeta, percentualAtingido, meta,
            valorPorColuna: r.valor_por_coluna || r.valor_por_movimento || null,
            totalLinhasFonte: r.total_linhas_fonte, totalLinhasFiltradas: r.total_linhas_filtradas,
            periodoInicio: c.segInicio || periodoInicio,
            periodoFim: c.segFim || periodoFim,
            segmentos: segmentosResolvidos[chave] || null,
          }
        })
        return novo
      })

      if (detalheInfo.length > 0) {
        setDetalhePorEmpresa(prev => {
          const novo = { ...prev }
          const porLinha = new Map()
          detalheInfo.forEach(({ id, c, empresaNome }) => {
            const r = resultadosPorId.get(id)
            if (!r) return
            const valorBase = r.valor ?? 0
            const { valorComissao } = calcularComissaoSobre(c, valorBase, metaMap, baseComissaoMetaMap)
            const chave = chaveLinha(c)
            if (!porLinha.has(chave)) porLinha.set(chave, [])
            porLinha.get(chave).push({ empresa: empresaNome, valorBase, valorComissao })
          })
          porLinha.forEach((lista, chave) => { novo[chave] = lista })
          return novo
        })
      }
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCalculando(false)
    }
  }

  const qtdCalculados = useMemo(() =>
    candidatosFiltrados.filter(c => (c.status === 'OK' || c.status === 'FERIAS_MES_INTEIRO') && valoresPorFuncionario[chaveLinha(c)] && !valoresPorFuncionario[chaveLinha(c)].semMeta).length,
    [candidatosFiltrados, valoresPorFuncionario])

  // Valores/textos de cada coluna da tabela — usados tanto pro filtro por coluna quanto pra ordenação.
  const textoNome = c => c.func.nome_funcionario || ''
  const textoComissao = c => c.politica.descricao_comissao || c.politica.nivel_calculo || ''
  const numeroValor = c => valoresPorFuncionario[chaveLinha(c)]?.valorBase ?? null
  const numeroServicos = c => c.politica.comissao_servicos != null ? parseFloat(c.politica.comissao_servicos) : null
  const numeroPecas = c => c.politica.comissao_pecas != null ? parseFloat(c.politica.comissao_pecas) : null
  const numeroTotal = c => c.politica.comissao_total != null ? parseFloat(c.politica.comissao_total) : null
  const numeroValorFixo = c => c.politica.comissao_valor != null ? parseFloat(c.politica.comissao_valor) : null
  const numeroValorComissao = c => valoresPorFuncionario[chaveLinha(c)]?.valorComissao ?? null

  const [ordenacao, setOrdenacao] = useState({ coluna: 'comissao', direcao: 'asc' })
  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  // Agrupa por Setor e, dentro dele, por Cargo — sempre expandido, sem botão de abrir/fechar.
  // Ordenação escolhida no cabeçalho da coluna se aplica DENTRO de cada grupo de cargo,
  // preservando o agrupamento.
  // Agrupa uma lista de candidatos por Setor e, dentro dele, por Cargo (e por Empresa dentro do
  // Cargo) — função separada da memorização pra poder reaproveitar com listas diferentes:
  // candidatosFiltrados (tela/PDF do setor atual) e "todos os setores da empresa" (PDF em lote).
  const agruparPorSetorECargo = (lista) => {
    const dir = ordenacao.direcao === 'desc' ? -1 : 1
    const comparadorNumerico = (fn) => (a, b) => {
      const va = fn(a); const vb = fn(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return dir * (va - vb)
    }
    // Ordem de exibição das comissões: Individual primeiro, Equipe depois, Empresa por último —
    // e Prêmios (Regra por % de Meta Atingida) sempre no final, mesmo quando o Nível de Cálculo
    // deles é INDIVIDUAL (ex: "Prêmio s/Meta Individual Atingida" vem depois das comissões
    // normais de Individual, não junto).
    const prioridadeComissao = (c) => {
      if (c.politica.usa_faixa === 'SIM' && c.politica.regra_comissao?.tipo_faixa !== 'VALOR' && c.politica.regra_comissao) return 3
      if (c.politica.nivel_calculo === 'INDIVIDUAL') return 0
      if (c.politica.nivel_calculo === 'EQUIPE') return 1
      return 2 // EMPRESA e qualquer outro nível
    }
    const comparadores = {
      nome: (a, b) => dir * textoNome(a).localeCompare(textoNome(b), 'pt-BR'),
      comissao: (a, b) => {
        const diff = prioridadeComissao(a) - prioridadeComissao(b)
        return diff !== 0 ? dir * diff : dir * textoComissao(a).localeCompare(textoComissao(b), 'pt-BR')
      },
      valor: comparadorNumerico(numeroValor),
      servicos: comparadorNumerico(numeroServicos),
      pecas: comparadorNumerico(numeroPecas),
      total: comparadorNumerico(numeroTotal),
      valorFixo: comparadorNumerico(numeroValorFixo),
      valorComissao: comparadorNumerico(numeroValorComissao),
    }
    const comparador = comparadores[ordenacao.coluna] || comparadores.nome

    const gruposSetor = new Map()
    for (const c of lista) {
      const nomeSetor = c.setorNomes?.join(', ') || SEM_SETOR
      if (!gruposSetor.has(nomeSetor)) gruposSetor.set(nomeSetor, new Map())
      const gruposCargo = gruposSetor.get(nomeSetor)
      const nomeCargo = c.cargo?.nome_cargo || 'Sem Cargo'
      if (!gruposCargo.has(nomeCargo)) gruposCargo.set(nomeCargo, [])
      gruposCargo.get(nomeCargo).push(c)
    }

    // Dentro de cada Cargo, agrupa também por Empresa — funcionários da mesma empresa ficam
    // juntos, com o nome dela aparecendo uma vez só (sub-cabeçalho), em vez de repetido em
    // cada linha. A ordenação escolhida no cabeçalho da coluna se aplica dentro de cada
    // subgrupo de empresa, preservando o agrupamento.
    const agruparPorEmpresa = (itens) => {
      const porEmpresa = new Map()
      for (const c of itens) {
        const nomeEmpresa = c.empresa?.empresa_fantasia || c.empresa?.nome_empresa || 'Sem Empresa'
        if (!porEmpresa.has(nomeEmpresa)) porEmpresa.set(nomeEmpresa, [])
        porEmpresa.get(nomeEmpresa).push(c)
      }
      // Nunca intercala linhas de funcionários diferentes: agrupa por funcionário primeiro
      // (sempre por nome, pra manter cada um num bloco só) e só usa a ordenação escolhida no
      // cabeçalho (ex: Individual/Equipe/Empresa/Prêmio) para ordenar as linhas DENTRO do
      // bloco de cada funcionário — senão, comissões com a mesma descrição (ex: "Comissão
      // s/Time Oficina") de técnicos diferentes ficavam juntas, misturando os dois.
      const comparadorSemMisturarFuncionarios = (a, b) =>
        a.func.id !== b.func.id ? textoNome(a).localeCompare(textoNome(b), 'pt-BR') : comparador(a, b)
      return [...porEmpresa.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
        .map(([nomeEmpresa, itensEmpresa]) => ({ nomeEmpresa, itens: itensEmpresa.sort(comparadorSemMisturarFuncionarios) }))
    }

    return [...gruposSetor.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([nomeSetor, gruposCargo]) => ({
        nomeSetor,
        cargos: [...gruposCargo.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
          .map(([nomeCargo, itens]) => ({ nomeCargo, itens, empresas: agruparPorEmpresa(itens) })),
      }))
  }

  const gruposPorCargo = useMemo(() => agruparPorSetorECargo(candidatosFiltrados), [candidatosFiltrados, ordenacao, valoresPorFuncionario])

  // Agrupa por Setor + Empresa para que setores de mesmo nome em lojas diferentes não se misturem.
  const agruparPorEmpresaSetor = (lista) => {
    const porChave = new Map() // `${nomeEmpresa}::${nomeSetor}` -> { nomeEmpresa, nomeSetor, cargosMap }
    for (const c of lista) {
      const nomeEmpresa = c.empresa?.empresa_fantasia || c.empresa?.nome_empresa || 'Sem Empresa'
      const nomeSetor = c.setorNomes?.join(', ') || SEM_SETOR
      const chave = `${nomeEmpresa}::${nomeSetor}`
      if (!porChave.has(chave)) porChave.set(chave, { nomeEmpresa, nomeSetor, cargosMap: new Map() })
      const grupo = porChave.get(chave)
      const nomeCargo = c.cargo?.nome_cargo || 'Sem Cargo'
      if (!grupo.cargosMap.has(nomeCargo)) grupo.cargosMap.set(nomeCargo, [])
      grupo.cargosMap.get(nomeCargo).push(c)
    }
    return [...porChave.values()]
      .sort((a, b) => a.nomeEmpresa.localeCompare(b.nomeEmpresa, 'pt-BR') || a.nomeSetor.localeCompare(b.nomeSetor, 'pt-BR'))
      .map(({ nomeEmpresa, nomeSetor, cargosMap }) => ({
        nomeSetor: `${nomeSetor} — ${nomeEmpresa}`,
        cargos: [...cargosMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
          .map(([nomeCargo, itens]) => ({ nomeCargo, itens, empresas: [{ nomeEmpresa, itens }] })),
      }))
  }

  const handleSalvar = async () => {
    if (!filtroEmpresa || !setorUnicoSelecionado) return
    // Com o lote bloqueado, só salva quem estiver liberado pra reprocessamento parcial
    // (elegiveisFiltrados já filtra isso) — o resto continua intocado.
    const candidatosParaSalvar = loteBloqueado
      ? elegiveisFiltrados
      : candidatosFiltrados
    const registrosSemLote = candidatosParaSalvar
      .filter(c => (c.status === 'OK' || c.status === 'FERIAS_MES_INTEIRO') && valoresPorFuncionario[chaveLinha(c)] && !valoresPorFuncionario[chaveLinha(c)].semMeta)
      .map(c => {
        const r = valoresPorFuncionario[chaveLinha(c)]
        return {
          funcionario_id: c.func.id,
          politica_id: c.politica.id,
          fonte_calculo_id: c.fonte._microwork ? null : c.fonte.id,
          base_calculo_id: c.base.id,
          periodo_inicio: r.periodoInicio,
          periodo_fim: r.periodoFim,
          nivel_calculo: c.politica.nivel_calculo,
          valor_base: r.valorBase,
          percentual_aplicado: r.percentual,
          valor_comissao: r.valorComissao,
          total_linhas_fonte: r.totalLinhasFonte ?? null,
          total_linhas_filtradas: r.totalLinhasFiltradas ?? null,
          detalhe_empresas: detalhePorEmpresa[chaveLinha(c)] || null,
          // Mesmo detalhamento usado pela calculadora aqui (ícone "Regra da Comissão" / Venda-
          // Devolução) — sem persistir isso, Processamento de Comissões não teria como mostrar
          // a mesma calculadora depois de já ter salvo o cálculo.
          detalhe_calculo: {
            valorApurado: r.valorApurado ?? null,
            valorBruto: r.valorBruto ?? null,
            descontoPct: r.descontoPct ?? null,
            valorFixo: r.valorFixo ?? null,
            percentualAtingido: r.percentualAtingido ?? null,
            meta: r.meta ?? null,
            valorPorColuna: r.valorPorColuna ?? null,
            segmentos: r.segmentos ?? null,
          },
        }
      })
    if (registrosSemLote.length === 0) return
    setSalvando(true)
    setErro(null)
    try {
      // Resolve/cria o lote ANTES de salvar os valores, pra já gravar o lote_id em cada
      // registro — sem isso, fato_comissoes_calculadas fica sem saber a qual lote pertence
      // (quebra a seleção/o reprocessamento em Histórico de Comissões).
      let loteAtualizado
      if (loteBloqueado) {
        loteAtualizado = lote
      } else {
        const valorTotalLote = registrosSemLote.reduce((acc, r) => acc + (r.valor_comissao || 0), 0)
        loteAtualizado = await apiService.salvarLoteRascunho({
          periodoInicio, periodoFim, empresaId: empresaSelecionadaId, empresaNome: filtroEmpresa,
          setorId: setorSelecionadoId, setorNome: setorUnicoSelecionado,
          departamentoId: departamentoDoSetorSelecionadoId, departamentoNome: departamentoDoSetorSelecionadoId ? dados?.departamentos.find(d => d.id === departamentoDoSetorSelecionadoId)?.nome_departamento : null,
          qtdFuncionarios: registrosSemLote.length, valorTotal: valorTotalLote, usuario: usuarioLabel,
        })
      }
      const registros = registrosSemLote.map(r => ({ ...r, lote_id: loteAtualizado.id }))
      // Passa o período do lote inteiro — os registros individuais podem ter segmentos menores
      // (férias), e a limpeza dos antigos precisa cobrir o intervalo todo.
      await apiService.salvarComissoesCalculadas(registros, periodoInicio, periodoFim)
      if (loteBloqueado) {
        // Reprocessamento parcial: destrava (some da lista de liberados) quem acabou de salvar.
        // Se o lote já tinha passado do DP (Conferido pelo DP ou Processado), o status volta
        // pra Conferido — o valor mudou depois que o DP olhou, precisa passar por ele de novo.
        loteAtualizado = await apiService.destravarFuncionariosSalvosLote(lote.id, registros.map(r => r.funcionario_id), usuarioLabel)
      }
      setLote(loteAtualizado)
      if (mostrarHistoricoLote) await carregarHistoricoLote(loteAtualizado.id)
      setSalvo(true)
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  // Documento pra mandar pro RH computar o pagamento — uma página por Setor, cada uma com os
  // Cargos/funcionários e o total do setor no rodapé. A seleção vem do modal de setores fechados.
  const handleSalvarPDF = async () => {
    const opcoesSelecionadas = setoresFechadosParaPdf.filter(opcao => pdfSetoresSelecionados.includes(opcao.key))
    const chavesSelecionadas = new Set(opcoesSelecionadas.map(opcao => opcao.key))
    const candidatosDaEmpresa = filtroEmpresa
      ? candidatos.filter(c => c.func.empresa_id === empresaSelecionadaId)
      : candidatos
    const candidatosParaPDF = candidatosDaEmpresa.map(c => {
      const setoresIncluidos = (c.setorNomes || [SEM_SETOR]).filter(nomeSetor =>
        chavesSelecionadas.has(chaveSetorPdf(c.func.empresa_id, nomeSetor)))
      return setoresIncluidos.length > 0 ? { ...c, setorNomes: setoresIncluidos } : null
    }).filter(Boolean)
    const gruposParaPDF = filtroEmpresa
      ? agruparPorSetorECargo(candidatosParaPDF)
      : agruparPorEmpresaSetor(candidatosParaPDF)
    if (gruposParaPDF.length === 0) {
      setErro('Sem dados pra exportar — calcule as comissões primeiro.')
      return
    }
    setGerandoPDF(true)
    setErro(null)
    try {
      const valorDe = (c) => valoresPorFuncionario[chaveLinha(c)]?.valorComissao || 0
      // Monta os dados já formatados pro PDF padrão de comissões (utils/comissoesPdf.js).
      const setores = gruposParaPDF.map(grupoSetor => {
        const itensSetor = grupoSetor.cargos.flatMap(g => g.itens)
        return {
          // Empresa(s) do setor — quase sempre uma só; se houver mais de uma no mesmo setor,
          // mostra todas separadas por vírgula.
          empresasLabel: [...new Set(itensSetor
            .map(c => c.empresa?.empresa_fantasia || c.empresa?.nome_empresa || c.empresaNome)
            .filter(Boolean))].join(', '),
          nomeSetor: grupoSetor.nomeSetor,
          total: itensSetor.reduce((acc, c) => acc + valorDe(c), 0),
          cargos: grupoSetor.cargos.map(grupo => {
            const codigoCargo = grupo.itens[0]?.cargo?.codigo_cargo
            return {
              titulo: codigoCargo ? `${grupo.nomeCargo} (${codigoCargo})` : grupo.nomeCargo,
              regras: regrasDoGrupo(grupo.itens),
              empresas: grupo.empresas.map(empresaGrupo => {
                const porFuncionario = new Map()
                for (const c of empresaGrupo.itens) {
                  if (!porFuncionario.has(c.func.id)) porFuncionario.set(c.func.id, [])
                  porFuncionario.get(c.func.id).push(c)
                }
                return {
                  nomeEmpresa: empresaGrupo.nomeEmpresa,
                  funcionarios: [...porFuncionario.values()].map(itens => {
                    const f = itens[0].func
                    return {
                      nome: f.codigo_funcionario ? `${f.codigo_funcionario} — ${f.nome_funcionario}` : f.nome_funcionario,
                      nomeCurto: f.nome_funcionario,
                      total: itens.reduce((acc, c) => acc + valorDe(c), 0),
                      linhas: itens.map(c => {
                        const res = valoresPorFuncionario[chaveLinha(c)]
                        return {
                          comissao: c.politica.descricao_comissao || c.politica.nivel_calculo || '',
                          tipo: tipoComissaoPorBase(c),
                          periodo: c.segInicio && c.segFim ? `${fmtDiaMes(res?.periodoInicio || c.segInicio)} a ${fmtDiaMes(res?.periodoFim || c.segFim)}` : '',
                          detalhes: c.politica.detalhar_por_empresa
                            ? (detalhePorEmpresa[chaveLinha(c)] || []).filter(d => !detalheEmpresaSemValor(d))
                              .map(d => ({ empresa: d.empresa, base: fmtValorBase(c, d.valorBase), comissao: fmtBRL(d.valorComissao) }))
                            : [],
                          base: res ? fmtValorBase(c, res.valorBase) : '—',
                          pctServicos: fmtPct(c.politica.comissao_servicos),
                          pctPecas: fmtPct(c.politica.comissao_pecas),
                          pctTotal: fmtPct(c.politica.comissao_total),
                          valorFixo: fmtBRL(c.politica.comissao_valor != null ? parseFloat(c.politica.comissao_valor) : null),
                          valorComissao: res ? fmtBRL(res.valorComissao) : '—',
                          semMeta: !!res?.semMeta,
                        }
                      }),
                    }
                  }),
                }
              }),
            }
          }),
        }
      })

      // Nome do arquivo inclui empresa e setor(es) pra identificar o PDF sem precisar abrir, já
      // que dá pra gerar um por vez ou vários juntos.
      const nomeSetorArquivo = opcoesSelecionadas.length === 1
        ? `${opcoesSelecionadas[0].empresaNome}_${opcoesSelecionadas[0].nomeSetor}`
        : `Setores_${opcoesSelecionadas.length}`
      const nomeArquivo = filtroEmpresa
        ? ['Comissoes', periodoInicio, periodoFim, filtroEmpresa, nomeSetorArquivo].filter(Boolean).map(paraNomeArquivo).join('_')
        : ['Comissoes', periodoInicio, periodoFim, 'Todas_Empresas', nomeSetorArquivo].filter(Boolean).map(paraNomeArquivo).join('_')
      await gerarPdfComissoes({ setores, periodoInicio, periodoFim, nomeArquivo })
      setPdfModalAberto(false)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  return (
    <div className="min-h-full w-full p-6 space-y-4">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            {titulo}
          </h1>
          <p className="text-xs text-slate-500">Calcule, confira e envie pra aprovação as comissões do período — por empresa e setor.</p>
        </div>
        <BotaoStatusFerias />
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {carregandoLista ? (
        <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando funcionários...
        </div>
      ) : (
        <>
          {/* PERÍODO — escolhe a data e calcula só o que está na tela */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            {/* Abas de Empresa — seleção obrigatória pra liberar as ações de workflow abaixo.
                Cada empresa tem seu próprio lote no mesmo período, pra um gerente conferir/
                processar/excluir a própria loja sem interferir no trabalho de outro gerente
                em outra empresa (mesmo padrão de escopo por Empresa já usado em Grupos de Acesso). */}
            <div className="flex flex-wrap items-end gap-4 mb-3 pb-3 border-b border-slate-100">
              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Empresa</label>
                <select
                  value={filtroEmpresa}
                  onChange={e => setFiltroEmpresa(e.target.value)}
                  className="w-96 text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {empresasUnicas.map(nome => (
                    <option key={nome} value={nome}>{nome}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Data Início</label>
                <input type="date" className="w-40 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Data Fim</label>
                <div className="flex items-center gap-1">
                  <input type="date" className="w-40 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
                  <button type="button" onClick={() => mudarMes(-1)} title="Mês anterior"
                    className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => mudarMes(1)} title="Próximo mês"
                    className="shrink-0 p-2 border border-slate-200 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            {periodoMesesDiferentes && (
              <p className="text-[11px] text-amber-600 mb-3">Data Início e Data Fim precisam estar dentro do mesmo mês.</p>
            )}
            {/* Abas de Setor — seleção única (clicar troca de setor; clicar no já marcado
                desmarca e volta pra visão combinada de todos). Cada setor tem seu próprio lote,
                então as ações do fluxo de aprovação (Calcular/Salvar/Conferir/Processar/Excluir)
                só liberam com um setor marcado. */}
            {filtroEmpresa && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <label className={`${LBL} mr-1`}>Setor</label>
                {setoresUnicos.map(nome => {
                  const selecionado = filtrosSetor.includes(nome)
                  const loteSetor = lotesPorSetor[nome]
                  const fechado = !!(loteSetor && loteSetor.status !== 'RASCUNHO')
                  const tituloBolinha = carregandoLotesSetores
                    ? 'Verificando status...'
                    : fechado
                      ? `Fechado (${loteSetor.status === 'PROCESSADO' ? 'Processado' : loteSetor.status === 'CONFERIDO_DP' ? 'Conferido pelo DP' : 'Conferido'})`
                      : 'Ainda não fechado (Rascunho ou nunca calculado)'
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setFiltrosSetor(prev => prev.includes(nome) ? [] : [nome])}
                      title={tituloBolinha}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        selecionado
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {carregandoLotesSetores
                        ? <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-slate-300" />
                        : fechado
                          ? <Lock className="h-3 w-3 shrink-0 text-emerald-500" />
                          : <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" />}
                      {nome}
                      {selecionado && <X className="h-3 w-3" />}
                    </button>
                  )
                })}
                {setorSomenteVisualizacao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-slate-100 text-slate-500 border-slate-200" title="Este setor está liberado só pra visualização (Grupos de Acesso) — sem botões de ação.">
                    Somente Visualização
                  </span>
                )}
                {filtrosSetor.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFiltrosSetor([])}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors ml-1"
                  >
                    <X className="h-3 w-3" /> Limpar seleção
                  </button>
                )}
              </div>
            )}
            {loteBloqueado && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-2">
                <Lock className="h-3 w-3" />
                {elegiveisFiltrados.length > 0
                  ? `Este período já foi ${lote.status === 'PROCESSADO' ? 'processado' : lote.status === 'CONFERIDO_DP' ? 'conferido pelo DP' : 'conferido'} — só ${elegiveisFiltrados.length} funcionário(s) liberado(s) pra reprocessamento em Processamento de Comissões ficam recalculáveis agora.`
                  : `Este período já foi ${lote.status === 'PROCESSADO' ? 'processado' : lote.status === 'CONFERIDO_DP' ? 'conferido pelo DP' : 'conferido'} — peça ao RH/DP pra liberar o reprocessamento antes de recalcular.`}
              </p>
            )}
          </div>

          {/* APROVAÇÃO — Gerente confere, RH processa p/ pagamento e autoriza reprocessamento */}
          {periodoValido && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-bold text-slate-900">Etapas do Processamento</span>
                  {lote && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      lote.status === 'PROCESSADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : lote.status === 'CONFERIDO_DP' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : lote.status === 'CONFERIDO' ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {lote.status === 'PROCESSADO' ? 'Processado' : lote.status === 'CONFERIDO_DP' ? 'Aguardando Processamento' : lote.status === 'CONFERIDO' ? 'Aguardando DP' : 'Aguardando Gerente'}
                    </span>
                  )}
                  {setorSelecionadoId && empresaSelecionadaId && responsaveisPorSetor[setorSelecionadoId]?.[empresaSelecionadaId]?.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Responsável: <strong className="text-slate-600 font-semibold">{responsaveisPorSetor[setorSelecionadoId][empresaSelecionadaId].join(', ')}</strong>
                    </span>
                  )}
                </div>
                {lote && (
                  <button onClick={toggleHistoricoLote} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    {mostrarHistoricoLote ? 'Ocultar histórico' : 'Ver histórico'}
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3">
                {carregandoLote ? (
                  <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando período...</p>
                ) : (
                  <>
                    {lote && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {lote.conferido_em && (
                          <span>Conferido por <strong className="text-slate-700">{lote.conferido_por}</strong> em {new Date(lote.conferido_em).toLocaleString('pt-BR')}</span>
                        )}
                        {lote.processado_em && (
                          <span>Processado por <strong className="text-slate-700">{lote.processado_por}</strong> em {new Date(lote.processado_em).toLocaleString('pt-BR')}</span>
                        )}
                      </div>
                    )}

                    {/* Sequência: Calcular Comissões -> Salvar Comissões -> Comissões Conferidas ->
                        Salvar PDF. Todos ficam sempre visíveis; cada um só ativa depois que a
                        etapa anterior for concluída. "Processar p/ Pagamento" e "Autorizar
                        Reprocessamento" moram só em Histórico de Comissões (Processar não
                        depende de seleção; Reprocessamento permite liberar só alguns
                        funcionários, não só o lote inteiro). */}
                    <div className="flex flex-wrap items-center gap-2">
                      {podeCalcular && (
                        <button
                          onClick={handleCalcular}
                          disabled={!filtroEmpresa || !setorUnicoSelecionado || !periodoValido || calculando || (elegiveisFiltrados.length === 0 && feriasParaZerar.length === 0) || feriasDesatualizada || setorSomenteVisualizacao}
                          title={setorSomenteVisualizacao ? 'Este setor está liberado só pra visualização — peça pra alguém com edição fazer isso.' : feriasDesatualizada ? 'O arquivo de férias está desatualizado pro mês do período selecionado — atualize em Férias antes de calcular.' : undefined}
                          className={
                            feriasDesatualizada
                              ? 'flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors'
                              : 'flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors'
                          }
                        >
                          {calculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : feriasDesatualizada ? <AlertTriangle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          {feriasDesatualizada ? 'Férias Desatualizadas' : `Calcular Comissões (${elegiveisFiltrados.length + feriasParaZerar.length})`}
                        </button>
                      )}
                      {podeSalvar && (
                        <button
                          onClick={handleSalvar}
                          disabled={!filtroEmpresa || !setorUnicoSelecionado || (elegiveisFiltrados.length === 0 && feriasParaZerar.length === 0) || qtdCalculados === 0 || salvando || (salvo && lote?.status === 'RASCUNHO') || setorSomenteVisualizacao}
                          title={setorSomenteVisualizacao ? 'Este setor está liberado só pra visualização — peça pra alguém com edição fazer isso.' : undefined}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                        >
                          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Salvar Comissões
                        </button>
                      )}
                      {podeConferir && (
                        <button
                          onClick={handleConferir}
                          disabled={!filtroEmpresa || !setorUnicoSelecionado || !(lote?.status === 'RASCUNHO' && salvo) || processandoAcao === 'conferir' || setorSomenteVisualizacao}
                          title={setorSomenteVisualizacao ? 'Este setor está liberado só pra visualização — peça pra alguém com edição fazer isso.' : undefined}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                        >
                          {processandoAcao === 'conferir' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          Conferir Comissões
                        </button>
                      )}
                      {podeSalvarPDF && (
                        <>
                          <button
                            type="button"
                            onClick={abrirModalExportar}
                            disabled={carregandoStatusPdf || setoresFechadosParaPdf.length === 0 || gerandoPDF}
                            title={setoresFechadosParaPdf.length === 0 && !carregandoStatusPdf ? 'Não há setores fechados disponíveis para exportação.' : undefined}
                            className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                            Exportar
                          </button>
                          {pdfModalAberto && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !gerandoPDF && setPdfModalAberto(false)}>
                              <div role="dialog" aria-modal="true" aria-labelledby="selecionar-setores-pdf" className="w-full max-w-lg overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                                  <h2 id="selecionar-setores-pdf" className="text-sm font-bold text-slate-900">Exportar comissões</h2>
                                  <button type="button" disabled={gerandoPDF} onClick={() => setPdfModalAberto(false)} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40" aria-label="Fechar">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="space-y-3 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-600">Setores fechados</span>
                                    <div className="flex items-center gap-3">
                                      <button type="button" disabled={gerandoPDF || setoresFechadosParaPdf.length === 0} onClick={() => setPdfSetoresSelecionados(setoresFechadosParaPdf.map(s => s.key))} className="text-[11px] font-semibold text-blue-600 hover:underline disabled:opacity-40">Selecionar todos</button>
                                      <button type="button" disabled={gerandoPDF || pdfSetoresSelecionados.length === 0} onClick={() => setPdfSetoresSelecionados([])} className="text-[11px] font-semibold text-slate-500 hover:text-red-600 disabled:opacity-40">Limpar</button>
                                    </div>
                                  </div>
                                  <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
                                    {carregandoStatusPdf ? (
                                      <p className="px-3 py-4 text-xs text-slate-400">Carregando setores fechados...</p>
                                    ) : setoresFechadosParaPdf.length === 0 ? (
                                      <p className="px-3 py-4 text-xs text-slate-400">Nenhum setor fechado disponível.</p>
                                    ) : setoresFechadosParaPdf.map(opcao => (
                                      <label key={opcao.key} className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5 text-xs text-slate-700 hover:bg-slate-50">
                                        <input
                                          type="checkbox"
                                          checked={pdfSetoresSelecionados.includes(opcao.key)}
                                          disabled={gerandoPDF}
                                          onChange={() => setPdfSetoresSelecionados(prev => prev.includes(opcao.key) ? prev.filter(k => k !== opcao.key) : [...prev, opcao.key])}
                                          className="h-3.5 w-3.5"
                                        />
                                        <span>{opcao.empresaNome} — {opcao.nomeSetor}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 p-3">
                                  <button type="button" disabled={gerandoPDF} onClick={() => setPdfModalAberto(false)} className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-40">Cancelar</button>
                                  <button type="button" onClick={handleSalvarPDF} disabled={gerandoPDF || pdfSetoresSelecionados.length === 0 || carregandoStatusPdf} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                                    {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                                    Salvar PDF
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {podeExcluir && (lote ? lote.status === 'RASCUNHO' : salvo) && (
                        <button
                          onClick={handleExcluirHistorico}
                          disabled={!filtroEmpresa || !setorUnicoSelecionado || processandoAcao === 'excluir' || setorSomenteVisualizacao}
                          title={setorSomenteVisualizacao ? 'Este setor está liberado só pra visualização — peça pra alguém com edição fazer isso.' : "Só pode excluir enquanto o período estiver em Rascunho"}
                          className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ml-auto"
                        >
                          {processandoAcao === 'excluir' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Excluir Histórico
                        </button>
                      )}
                    </div>
                  </>
                )}

                {mostrarHistoricoLote && lote && (
                  <div className="border-t border-slate-100 pt-3">
                    {carregandoHistoricoLote ? (
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</p>
                    ) : historicoLote.length === 0 ? (
                      <p className="text-[11px] text-slate-400">Nenhum evento registrado ainda.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {historicoLote.map(h => (
                          <div key={h.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                            <span className="font-bold text-slate-800">{ROTULO_ACAO_HISTORICO[h.acao] || h.acao}</span>
                            <span>{h.usuario}</span>
                            <span className="text-slate-400">{new Date(h.data_hora).toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}


          {/* LISTA — sempre visível, com a política resumida; valores aparecem depois de calcular.
              Calcular/Salvar/Conferir/Processar/Salvar PDF ficam no card Etapas do Processamento, acima. */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1400px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="p-3">
                      <button onClick={() => alternarOrdenacao('nome')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        Nome / Cargo {iconeOrdenacao('nome')}
                      </button>
                    </th>
                    <th className="p-3">
                      <button onClick={() => alternarOrdenacao('comissao')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                        Comissão {iconeOrdenacao('comissao')}
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('valor')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('valor')} Base Comissão
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('servicos')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('servicos')} % Serviços
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('pecas')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('pecas')} % Peças
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('total')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('total')} % Total
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('valorFixo')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('valorFixo')} R$ Valor
                      </button>
                    </th>
                    <th className="p-3 text-right">
                      <button onClick={() => alternarOrdenacao('valorComissao')} className="flex items-center gap-1 ml-auto hover:text-slate-700 transition-colors">
                        {iconeOrdenacao('valorComissao')} Valor Comissão
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {candidatosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-6 text-center text-slate-400">{filtroEmpresa ? 'Nenhum funcionário para os filtros aplicados.' : 'Selecione uma Empresa para listar os funcionários.'}</td>
                    </tr>
                  ) : gruposPorCargo.map(grupoSetor => (
                    <React.Fragment key={grupoSetor.nomeSetor}>
                      <tr className="bg-indigo-100">
                        <td colSpan="8" className="px-3 py-2 font-bold text-indigo-900 text-[11px] uppercase tracking-wide">
                          {grupoSetor.nomeSetor}
                        </td>
                      </tr>
                      {grupoSetor.cargos.map(grupo => (
                        <React.Fragment key={grupo.nomeCargo}>
                          <tr className="bg-slate-100">
                            <td colSpan="8" className="px-3 py-1.5 pl-6 font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                              {grupo.nomeCargo}
                              {grupo.itens[0]?.cargo?.codigo_cargo && (
                                <span className="ml-2 font-mono font-normal text-slate-400 normal-case">({grupo.itens[0].cargo.codigo_cargo})</span>
                              )}
                            </td>
                          </tr>
                          {grupo.empresas.map((empresaGrupo, idxEmpresa) => (
                            <React.Fragment key={empresaGrupo.nomeEmpresa}>
                              {/* Sub-cabeçalho de Empresa — só repete quando muda, agrupando
                                  quem for da mesma empresa dentro do cargo. Linha tracejada
                                  separando de outra empresa (não da primeira, logo após o cargo). */}
                              <tr className={`bg-slate-50 ${idxEmpresa > 0 ? 'border-t-2 border-dashed border-slate-400' : ''}`}>
                                <td colSpan="8" className="px-3 py-1 pl-10 font-semibold text-slate-500 text-[10px] uppercase tracking-wide">
                                  {empresaGrupo.nomeEmpresa}
                                </td>
                              </tr>
                              {empresaGrupo.itens.map(c => {
                            const res = valoresPorFuncionario[chaveLinha(c)]
                            // Funcionário com mais de uma Política (ex: Peças + Serviços) — mostra
                            // um subtotal logo depois da última linha dele nesse grupo de cargo.
                            const linhasMesmoFunc = empresaGrupo.itens.filter(x => x.func.id === c.func.id)
                            const ehPrimeiraLinhaDoFunc = linhasMesmoFunc[0] === c
                            const ehUltimaLinhaDoFunc = linhasMesmoFunc[linhasMesmoFunc.length - 1] === c
                            // Subtotal em TODO funcionário, mesmo com uma linha só de comissão.
                            const mostrarSubtotal = ehUltimaLinhaDoFunc
                            const totalFunc = mostrarSubtotal
                              ? linhasMesmoFunc.reduce((acc, x) => acc + (valoresPorFuncionario[chaveLinha(x)]?.valorComissao || 0), 0)
                              : null
                            const detalhesEmpresa = (detalhePorEmpresa[chaveLinha(c)] || []).filter(d => !detalheEmpresaSemValor(d))
                            return (
                              <React.Fragment key={chaveLinha(c)}>
                                <tr className="hover:bg-slate-50/70 transition-colors">
                                  {/* Nome só na primeira linha do funcionário — as demais ficam em
                                      branco, já que a linha de Total identifica o grupo. */}
                                  <td className="px-3 py-1.5 pl-8 font-bold text-slate-900 whitespace-nowrap">
                                    {ehPrimeiraLinhaDoFunc && (
                                      <>
                                        {(() => {
                                          const st = statusLinha(c)
                                          return (
                                            <span className={`inline-block mr-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${st.className}`}>
                                              {st.label}
                                            </span>
                                          )
                                        })()}
                                        <span className="inline-block w-14 font-mono font-normal text-slate-400">{c.func.codigo_funcionario || ''}</span>
                                        {c.func.nome_funcionario}
                                        {feriasNoPeriodo(c.func, c.empresa).map(f => (
                                          <span key={f.id} className="ml-2 italic font-normal text-[10px] text-amber-600 whitespace-nowrap">
                                            Férias: {fmtData(f.inicio_gozo)} a {fmtData(f.fim_gozo)}
                                          </span>
                                        ))}
                                      </>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 whitespace-nowrap">
                                    {c.politica.descricao_comissao || c.politica.nivel_calculo}
                                    {c.politica.usa_faixa === 'SIM' && c.politica.regra_comissao?.id ? (
                                      <button type="button"
                                        onClick={() => setRegraModal({
                                          nome: c.politica.regra_comissao.nome, baseNome: c.base?.nome,
                                          faixas: faixasDaRegra(c.politica, c.politica.regra_comissao.tipo_faixa === 'VALOR_FIXO_META' ? res?.valorFixo : res?.percentual),
                                          porMeta: c.politica.regra_comissao.tipo_faixa !== 'VALOR',
                                          tipoFaixa: c.politica.regra_comissao.tipo_faixa,
                                          metaTipoLabel: (TIPOS_META_LABEL[c.politica.regra_comissao.meta_tipo] || c.politica.regra_comissao.meta_tipo) + (CAMPO_META_LABEL[c.politica.regra_comissao.meta_campo] || '') + (c.politica.regra_comissao.meta_equipe_agrupamento_ids?.length > 0 ? ' (soma da equipe)' : ''),
                                          semMeta: res?.semMeta, meta: res?.meta, percentualAtingido: res?.percentualAtingido,
                                          valorApurado: res?.valorApurado ?? res?.valorBase, baseComissao: res?.valorApurado != null ? res?.valorBase : null,
                                          valorBruto: res?.valorBruto, descontoPct: res?.descontoPct,
                                          segmentos: res?.segmentos, valorPorColuna: res?.valorPorColuna,
                                        })}
                                        title="Ver a regra desta comissão"
                                        className="ml-1.5 align-middle inline-flex items-center justify-center w-5 h-5 rounded border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors">
                                        <Calculator className="h-3 w-3" />
                                      </button>
                                    ) : (
                                      <button type="button"
                                        onClick={() => setColunaModal({
                                          baseNome: c.base?.nome,
                                          colunas: res?.valorPorColuna || [],
                                          total: res?.valorBase,
                                          fmtTotal: (v) => fmtValorBase(c, v),
                                          percentual: res?.percentual,
                                          valorFixo: res?.valorFixo,
                                          valorComissao: res?.valorComissao,
                                          periodoInicio: res?.periodoInicio || c.segInicio,
                                          periodoFim: res?.periodoFim || c.segFim,
                                        })}
                                        title="Ver a base de cálculo desta comissão"
                                        className="ml-1.5 align-middle inline-flex items-center justify-center w-5 h-5 rounded border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors">
                                        <Calculator className="h-3 w-3" />
                                      </button>
                                    )}
                                    {tipoComissaoPorBase(c) && <span className="italic text-slate-400"> ({tipoComissaoPorBase(c)})</span>}
                                    {c.segInicio && c.segFim && (
                                      <span className="ml-1.5 text-[10px] font-semibold text-blue-600 whitespace-nowrap">
                                        {fmtDiaMes(res?.periodoInicio || c.segInicio)} a {fmtDiaMes(res?.periodoFim || c.segFim)}
                                      </span>
                                    )}
                                    {(c.politica?.codigo_rubrica || c.politica?.tipo_processo) && (
                                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                                        {c.politica?.codigo_rubrica && (
                                          <>Rubrica <span className="font-mono text-slate-500">{c.politica.codigo_rubrica}</span>
                                            {rubricasPorCodigo[c.politica.codigo_rubrica]?.descricao && <> — {rubricasPorCodigo[c.politica.codigo_rubrica].descricao}</>}
                                          </>
                                        )}
                                        {c.politica?.codigo_rubrica && c.politica?.tipo_processo && <span className="mx-1">·</span>}
                                        {c.politica?.tipo_processo && (
                                          <>Tipo <span className="font-mono text-slate-500">{c.politica.tipo_processo}</span>
                                            {tiposProcessoPorCodigo[c.politica.tipo_processo]?.descricao && <> — {tiposProcessoPorCodigo[c.politica.tipo_processo].descricao}</>}
                                          </>
                                        )}
                                      </div>
                                    )}
                                    {/* Detalhamento por empresa (Nível EMPRESA + checkbox marcado na Política) —
                                        uma linha por empresa, abaixo da descrição, pra auditar de onde veio o total. */}
                                    {c.politica.detalhar_por_empresa && detalhesEmpresa.length > 0 && (
                                      <div className="mt-1 space-y-0.5">
                                        {detalhesEmpresa.map(d => (
                                          <div key={d.empresa} className="text-[10px] font-normal text-slate-400">
                                            {d.empresa}: Base <span className="text-slate-500">{fmtValorBase(c, d.valorBase)}</span>
                                            <span className="text-slate-300"> → </span>
                                            Comissão <span className="text-emerald-600 font-semibold">{fmtBRL(d.valorComissao)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-mono">{res ? fmtValorBase(c, res.valorBase) : '—'}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{fmtPct(c.politica.comissao_servicos)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{fmtPct(c.politica.comissao_pecas)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{c.politica.usa_faixa === 'SIM' ? fmtPct(res?.percentual) : fmtPct(c.politica.comissao_total)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{fmtBRL(c.politica.comissao_valor != null ? parseFloat(c.politica.comissao_valor) : null)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{res ? (res.semMeta ? <span className="font-sans font-semibold text-amber-600 text-[11px]" title="Sem meta cadastrada em Planejamento de Metas pra este funcionário/mês">Sem meta</span> : fmtBRL(res.valorComissao)) : '—'}</td>
                                </tr>
                                {mostrarSubtotal && (
                                  <tr className="bg-emerald-50/50">
                                    <td colSpan="7" className="px-2 py-1 pl-8 text-right text-[11px] font-bold text-slate-600 whitespace-nowrap">
                                      Total {c.func.nome_funcionario}
                                    </td>
                                    <td className="px-2 py-1 text-right font-mono font-bold text-emerald-700">{fmtBRL(totalFunc)}</td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                              })}
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TELINHA DA REGRA (aberta pelo ícone de calculadora ao lado da comissão) */}
      {regraModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setRegraModal(null)}>
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[420px] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-indigo-600" /> Regra da Comissão
              </h3>
              <button onClick={() => setRegraModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm font-bold text-slate-800">{regraModal.nome}</div>
              {regraModal.baseNome && (
                <div className="text-[11px] text-slate-500">Base de Cálculo: <span className="font-semibold text-slate-700">{regraModal.baseNome}</span></div>
              )}
              {regraModal.porMeta && (
                <div className="text-[11px] text-slate-500">Meta de Referência: <span className="font-semibold text-slate-700">{regraModal.metaTipoLabel}</span></div>
              )}
              {regraModal.porMeta && regraModal.semMeta && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-700 text-[11px] leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Sem meta cadastrada em Planejamento de Metas pra este funcionário/mês — comissão pendente.
                </div>
              )}
              <div className="rounded-md border border-slate-200 divide-y divide-slate-100">
                {regraModal.faixas.map((f, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 text-xs ${f.aplicada ? 'bg-indigo-50' : ''}`}>
                    <span className={`font-mono ${f.aplicada ? 'font-bold text-indigo-700' : 'text-slate-600'}`}>{f.aplicada ? '▸ ' : ''}{f.texto}</span>
                    <span className={`font-mono font-bold ${f.aplicada ? 'text-indigo-700' : 'text-slate-500'}`}>{f.percentual}</span>
                  </div>
                ))}
              </div>
              {/* Entradas/Saídas (ou Venda/Devolução, Serviço/Revisão etc.) que compõem o valor
                  apurado dessa Base — mesmo detalhamento da calculadora das comissões sem Regra,
                  só que aqui embutido na telinha da Regra. */}
              {regraModal.valorPorColuna?.length > 0 && (
                <div className="rounded-md border border-slate-200 divide-y divide-slate-100">
                  {regraModal.valorPorColuna.map((col, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="font-mono text-slate-600">{col.coluna}</span>
                      <span className="font-mono font-semibold text-slate-700">{fmtBRL(col.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Valores apurados da Base do Prêmio e a Meta comparada — sempre que a Regra
                  envolver Meta, mesmo sem meta cadastrada (aí dá pra ver o que já foi realizado,
                  mesmo sem saber ainda em qual faixa/classificação vai cair). Um valor por
                  período quando há segmentos (ex: férias no meio do mês) — sempre em BRUTO (é o
                  que foi lido de cada arquivo); o Desconto (se a Regra tiver) e o valor líquido
                  aparecem depois, já no total. */}
              {regraModal.porMeta && (
                <div className="rounded-md border border-sky-200 overflow-hidden">
                  <div className="px-3 py-1.5 bg-sky-50 border-b border-sky-100 text-[10px] font-bold text-sky-700 uppercase tracking-wide">Valores apurados (comparados com a Meta)</div>
                  <div className="divide-y divide-slate-100">
                    {(regraModal.segmentos?.length > 0 ? regraModal.segmentos : [{ dataInicio: null, dataFim: null, valorBase: regraModal.valorBruto }]).map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                        <span className="font-mono text-slate-500">{s.dataInicio && s.dataFim ? `${fmtDiaMes(s.dataInicio)} a ${fmtDiaMes(s.dataFim)}` : 'Período apurado'}</span>
                        <span className="font-mono font-semibold text-slate-700">{fmtBRL(s.valorBase)}</span>
                      </div>
                    ))}
                    {!!regraModal.descontoPct && (
                      <>
                        <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                          <span className="text-slate-500">Total bruto</span>
                          <span className="font-mono font-semibold text-slate-700">{fmtBRL(regraModal.valorBruto)}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                          <span className="text-amber-600">Desconto ({fmtPct(regraModal.descontoPct)})</span>
                          <span className="font-mono font-semibold text-amber-600">− {fmtBRL(regraModal.valorBruto - regraModal.valorApurado)}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                          <span className="font-semibold text-slate-600">Valor líquido</span>
                          <span className="font-mono font-bold text-slate-800">{fmtBRL(regraModal.valorApurado)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 text-[11px]">
                      <span className="font-semibold text-slate-600">Meta</span>
                      <span className={`font-mono font-semibold ${regraModal.semMeta ? 'text-amber-600' : 'text-slate-700'}`}>
                        {regraModal.semMeta ? 'Não cadastrada' : fmtBRL(regraModal.meta)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 bg-sky-50 border-t border-sky-100 text-[11px] font-bold">
                    <span className="text-slate-700">{regraModal.descontoPct ? 'Comparado (líquido) · % Atingido' : 'Total apurado · % Atingido'}</span>
                    <span>
                      <span className="text-slate-800">{fmtBRL(regraModal.valorApurado)}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="text-sky-700">
                        {regraModal.semMeta ? '—' : `${regraModal.percentualAtingido?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}
                      </span>
                    </span>
                  </div>
                </div>
              )}
              {/* Valor bruto → Desconto → líquido pra Regra por Valor da Base (sem Meta) — a
                  faixa e a comissão foram calculadas sobre o líquido, não sobre o bruto lido. */}
              {!regraModal.porMeta && !!regraModal.descontoPct && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center justify-between"><span>Valor bruto apurado</span><span className="font-mono font-semibold text-slate-700">{fmtBRL(regraModal.valorBruto)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-amber-600">Desconto ({fmtPct(regraModal.descontoPct)})</span><span className="font-mono font-semibold text-amber-600">− {fmtBRL(regraModal.valorBruto - regraModal.valorApurado)}</span></div>
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-700">Valor líquido (usado na faixa)</span><span className="font-mono font-bold text-slate-800">{fmtBRL(regraModal.valorApurado)}</span></div>
                </div>
              )}
              {/* Base da Comissão em R$: soma das políticas marcadas no cadastro da Regra — é
                  isso, não o valor apurado acima, que multiplica pela % pra dar o valor pago. */}
              {regraModal.porMeta && !regraModal.semMeta && regraModal.baseComissao != null && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11px] text-slate-600 flex items-center justify-between">
    <span>Base da Comissão (soma das comissões das políticas selecionadas na Regra)</span>
                  <span className="font-mono font-bold text-emerald-700">{fmtBRL(regraModal.baseComissao)}</span>
                </div>
              )}
              <div className="text-[10px] text-slate-400">
                {regraModal.tipoFaixa === 'VALOR_FIXO_META'
                  ? 'A primeira faixa cujo % de meta atingida casar paga esse valor FIXO em R$ — não multiplica nem depende de nenhuma outra política.'
                  : regraModal.porMeta
                  ? 'O percentual da primeira faixa cujo % de meta atingida casar é aplicado sobre a Base da Comissão (não sobre o valor apurado acima).'
                  : 'O percentual da primeira faixa que casar com o valor da Base é aplicado sobre o valor todo.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {colunaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setColunaModal(null)}>
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[380px] shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-600" /> Base de Cálculo
              </h3>
              <button onClick={() => setColunaModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {colunaModal.baseNome && (
                <div className="text-[11px] text-slate-500">Base de Cálculo: <span className="font-semibold text-slate-700">{colunaModal.baseNome}</span></div>
              )}
              {colunaModal.periodoInicio && colunaModal.periodoFim && (
                <div className="text-[11px] text-slate-500">Período: <span className="font-semibold text-slate-700">{fmtDiaMes(colunaModal.periodoInicio)} a {fmtDiaMes(colunaModal.periodoFim)}</span></div>
              )}
              {colunaModal.total == null ? (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-700 text-[11px] leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> Ainda não foi calculado neste período.
                </div>
              ) : (
                <>
                  {colunaModal.colunas.length > 0 && (
                    <div className="rounded-md border border-slate-200 divide-y divide-slate-100">
                      {colunaModal.colunas.map((col, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                          <span className="font-mono text-slate-600">{col.coluna}</span>
                          <span className="font-mono font-semibold text-slate-700">{(colunaModal.fmtTotal || fmtBRL)(col.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-xs font-bold">
                    <span className="text-slate-700">Total (Base de Cálculo)</span>
                    <span className="font-mono text-blue-700">{(colunaModal.fmtTotal || fmtBRL)(colunaModal.total)}</span>
                  </div>
                  {colunaModal.percentual != null && (
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">% Aplicado</span>
                      <span className="font-mono font-semibold text-slate-700">{fmtPct(colunaModal.percentual)}</span>
                    </div>
                  )}
                  {colunaModal.valorFixo != null && (
                    <div className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-slate-500">R$ Valor</span>
                      <span className="font-mono font-semibold text-slate-700">{fmtBRL(colunaModal.valorFixo)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold">
                    <span className="text-slate-700">Valor da Comissão</span>
                    <span className="font-mono text-emerald-700">{fmtBRL(colunaModal.valorComissao)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default function CalculoComissoes(props) {
  return (
    <FeriasStatusProvider>
      <CalculoComissoesConteudo {...props} />
    </FeriasStatusProvider>
  )
}
