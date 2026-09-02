import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionState } from '../hooks/useSessionState'
import { Wallet, PlayCircle, Loader2, AlertTriangle, Save, X, ShieldCheck, Lock, ArrowUp, ArrowDown, ArrowUpDown, Trash2, ChevronDown, ChevronRight, ChevronLeft, FileDown, RefreshCw, CheckCircle2 } from 'lucide-react'
import { apiService } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { buscaComCoringa } from '../utils/buscaTexto'
import { passaEscopoComissao, departamentoSoVisualizacao } from '../utils/permissoesComissao'

// Sentinela pra funcionário sem departamento algum (departamento_ids vazio) — sem isso não tem
// como selecionar essa "aba" na tela pra conferir/excluir o histórico desse grupo.
const SEM_DEPARTAMENTO = 'Sem departamento'

const ROTULO_ACAO_HISTORICO = {
  CRIADO: 'Cálculo realizado',
  CONFERIDO: 'Conferido',
  CONFERIDO_DP: 'Conferido pelo DP',
  PROCESSADO: 'Processado p/ pagamento',
  REPROCESSAMENTO_AUTORIZADO: 'Reprocessamento autorizado',
  REPROCESSAMENTO_SALVO: 'Correção salva — conferência do DP reaberta',
}

function FiltroMultiSelect({ placeholder, opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])
  const toggle = (v) => onChange(selecionados.includes(v) ? selecionados.filter(x => x !== v) : [...selecionados, v])
  const texto = selecionados.length === 0 ? placeholder : selecionados.length === 1 ? selecionados[0] : `${selecionados.length} selecionados`
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between gap-1 px-2 py-2 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors">
        <span className={`truncate ${selecionados.length === 0 ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>{texto}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-sm max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-xl py-1">
          {opcoes.length === 0
            ? <p className="px-3 py-2 text-xs text-slate-400">Nenhuma opção.</p>
            : opcoes.map(op => (
              <label key={op} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer select-none">
                <input type="checkbox" checked={selecionados.includes(op)} onChange={() => toggle(op)} className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0" />
                <span className="whitespace-nowrap">{op}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  )
}

const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-auto min-w-[160px]'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtBRL = (v) => v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (v) => v ? String(v).split('-').reverse().join('/') : ''
const soDigitos = (v) => String(v || '').replace(/\D/g, '')
const fmtPct = (v) => v == null ? '-' : `${parseFloat(v).toFixed(2)}%`
const mesmoMes = (a, b) => a && b && a.slice(0, 7) === b.slice(0, 7)
const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

// Mesma lógica de match funcionário -> política já usada em Funcionarios.jsx: cargo +
// agrupamento de empresa, com fallback só pro cargo se não achar por agrupamento. Retorna
// TODAS as políticas que baterem (não só a primeira) — um cargo pode ter uma política pra
// Peças e outra pra Serviços, cada uma com sua própria Fonte/Base, e os valores se somam.
function resolvePoliticas(funcionario, politicas, empresasMap) {
  if (!funcionario.cargo_id) return []
  // Política Plano DMS não passa por aqui — ela não tem Fonte/Base (calcularComissaoSobre
  // quebraria) e é calculada à parte, em Folha de Pagamento - DAF → aba Plano DMS, atribuída ao
  // cargo (não ao funcionário individualmente) — ver CalculoPlanoDms.jsx.
  const politicasPadrao = politicas.filter(p => p.tipo_calculo !== 'PLANO_DMS')
  const agrupId = empresasMap[funcionario.empresa_id]?.agrupamento_empresa_id || null
  const porAgrupamento = agrupId
    ? politicasPadrao.filter(p => p.cargo_id === funcionario.cargo_id && p.agrupamento_empresa_id === agrupId && p.ativo !== false)
    : []
  if (porAgrupamento.length > 0) return porAgrupamento
  return politicasPadrao.filter(p => p.cargo_id === funcionario.cargo_id && p.ativo !== false)
}

// Chave única de uma linha (funcionário + política + segmento de apuração) — um funcionário
// pode ter várias linhas: uma por Política do cargo dele E uma por segmento de datas quando as
// férias quebram o período em pedaços (quem não recebe comissão de férias).
const chaveLinha = (c) => `${c.func.id}::${c.politica.id}::${c.segInicio || ''}::${c.segFim || ''}`

const fmtDiaMes = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : ''

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

// Aplica o percentual/valor fixo da política sobre um valor base já apurado — usado tanto pro
// total da linha quanto pro detalhamento por empresa (mesma regra, valor base diferente).
function calcularComissaoSobre(c, valorBase) {
  const tipo = tipoComissaoPorBase(c)
  const percentualPorNome = tipo === '% Peças' ? c.politica.comissao_pecas
    : tipo === '% Serviços' ? c.politica.comissao_servicos
    : null
  const percentual = percentualPorNome != null ? percentualPorNome : c.politica.comissao_total
  const valorFixo = c.politica.comissao_valor
  // R$ Valor é um multiplicador por unidade apurada (ex: R$ 0,60 por hora vendida):
  // comissão = Valor × R$ Valor. Os percentuais continuam sendo Valor × %.
  const valorComissao = valorFixo != null
    ? valorBase * parseFloat(valorFixo)
    : percentual != null ? valorBase * (parseFloat(percentual) / 100) : 0
  return { percentual, valorFixo, valorComissao }
}

// Se o Nome da Base indicar Peças/Serviços, devolve o rótulo correspondente — usado tanto pra
// escolher o percentual certo da política quanto pra mostrar o tipo na coluna "Comissão".
const tipoComissaoPorBase = (c) => {
  const nomeBaseNorm = (c.base?.nome || '').trim().toLowerCase()
  if (/pe(ç|c)a/.test(nomeBaseNorm)) return '% Peças'
  if (/servi(ç|c)o/.test(nomeBaseNorm)) return '% Serviços'
  return null
}

export default function CalculoComissoes() {
  const navigate = useNavigate()
  const { user, hasAction, hasPermission, comissaoEscopoEfetivo, comissaoNivelDepartamentoEfetivo } = useAuth()
  const podeCalcular = hasAction('calculo-comissoes', 'calcular')
  const podeSalvar = hasAction('calculo-comissoes', 'salvar')
  const podeConferir = hasAction('calculo-comissoes', 'conferir')
  const podeSalvarPDF = hasAction('calculo-comissoes', 'salvar_pdf')
  const podeExcluir = hasAction('calculo-comissoes', 'excluir')
  const usuarioLabel = user?.email || 'desconhecido'

  const [periodoInicio, setPeriodoInicio] = useSessionState('calccom_ini', '')
  const [periodoFim, setPeriodoFim] = useSessionState('calccom_fim', '')

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
  const [valoresPorFuncionario, setValoresPorFuncionario] = useState({})
  // Detalhamento por empresa (política Nível EMPRESA com "Detalhar por empresa" marcado) —
  // chaveLinha(c) -> [{ empresa, valorBase, valorComissao }]. Só existe em memória depois de
  // Calcular nesta sessão; não é salvo no banco (é um detalhe de auditoria do total já salvo).
  const [detalhePorEmpresa, setDetalhePorEmpresa] = useState({})

  // Filtros aplicados ANTES de calcular — servem pra escolher quem entra na conta,
  // e também são a base pra quando os acessos por setor/gerente forem liberados depois.
  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  // Departamento é multi-select pra VISUALIZAR (a tabela combina os departamentos marcados),
  // mas as ações do fluxo de aprovação (Calcular/Salvar/Conferir/Processar/Excluir) só liberam
  // com exatamente 1 marcado — cada departamento tem seu próprio lote, então mais de um por vez
  // não tem um lote único pra apontar (ver departamentoUnicoSelecionado).
  const [filtrosDepartamento, setFiltrosDepartamento] = useState([])
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroAgrupamentoCargo, setFiltroAgrupamentoCargo] = useState('')
  const [filtroComissoes, setFiltroComissoes] = useState([])
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [gerandoPDF, setGerandoPDF] = useState(false)

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

  // Só existe "o" departamento selecionado quando exatamente 1 estiver marcado — com 0 ou 2+,
  // não há um lote único pra apontar, então as ações do fluxo de aprovação ficam bloqueadas
  // (a tabela continua mostrando a visão combinada normalmente).
  const departamentoUnicoSelecionado = filtrosDepartamento.length === 1 ? filtrosDepartamento[0] : null

  // Departamento selecionado (2ª aba, dentro da empresa) — mesmo padrão, um nível mais fundo:
  // vários gerentes na mesma loja, cada um responsável por um departamento, cada um com seu
  // próprio lote no mesmo período+empresa (ver salvarLoteRascunho/getLoteComissoes).
  const departamentoSelecionadoId = useMemo(() => {
    if (!departamentoUnicoSelecionado || !dados) return null
    const achado = dados.departamentos.find(d => d.nome_departamento === departamentoUnicoSelecionado)
    return achado?.id || null
  }, [departamentoUnicoSelecionado, dados])

  // Nível de acesso extra por Departamento (Grupos de Acesso → Acesso à Cálculo de Comissões):
  // "Visualizar" desliga Calcular/Salvar/Conferir/Salvar PDF/Excluir só neste departamento,
  // mesmo com a Ação correspondente marcada pro grupo — soma-se às Ações, não as substitui.
  const departamentoSomenteVisualizacao = departamentoSoVisualizacao(departamentoSelecionadoId, comissaoNivelDepartamentoEfetivo)

  // Busca o lote de aprovação (da empresa+departamento selecionados) sempre que Data Início/
  // Fim/Empresa/Departamento mudam. Só existe um lote pra apontar quando exatamente 1
  // departamento está marcado — com 0 ou 2+ marcados fica null (não tem workflow único pra
  // exibir, mas a tabela e os valores salvos continuam aparecendo normalmente).
  useEffect(() => {
    setLote(null)
    setHistoricoLote([])
    setMostrarHistoricoLote(false)
    // Sem isso, sair do "if" abaixo (empresa/departamento desmarcados no meio de uma busca em
    // andamento) deixava carregandoLoteObj travado em true pra sempre — a busca cancelada não
    // reseta o próprio flag (o cancelamento existe só pra não sobrescrever o estado com uma
    // resposta atrasada), e o "return" antecipado também não passava por ali.
    setCarregandoLoteObj(false)
    if (!periodoValido || !filtroEmpresa || !departamentoUnicoSelecionado) return
    let cancelado = false
    ;(async () => {
      setCarregandoLoteObj(true)
      try {
        // Alguns lotes antigos foram salvos com departamento_id nulo mesmo tendo um
        // departamento_nome válido (dado legado) — a busca por id não acha esses. E o
        // pseudo-departamento "Sem Departamento" nunca tem id de verdade pra buscar por id
        // (buscar por id nulo pegaria TODOS os lotes-sem-id da empresa de uma vez, o que
        // já causou "JSON object requested, multiple (or no) rows returned" aqui). Então:
        // busca por id só quando há um id real; senão (ou se não achar), cai pro fallback
        // que traz todos os lotes da empresa+período e casa pelo nome do departamento.
        let loteAtual = departamentoSelecionadoId
          ? await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaSelecionadaId, departamentoSelecionadoId)
          : null
        if (!loteAtual) {
          const todos = await apiService.getLotesPorEmpresaPeriodo(periodoInicio, periodoFim, empresaSelecionadaId)
          loteAtual = todos.find(l => (l.departamento_nome || SEM_DEPARTAMENTO) === departamentoUnicoSelecionado) || null
        }
        if (!cancelado) setLote(loteAtual)
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLoteObj(false)
      }
    })()
    return () => { cancelado = true }
  }, [periodoInicio, periodoFim, periodoValido, filtroEmpresa, empresaSelecionadaId, departamentoUnicoSelecionado, departamentoSelecionadoId])

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
    if (!filtroEmpresa || !departamentoUnicoSelecionado) return
    if (lote ? lote.status !== 'RASCUNHO' : !salvo) return
    if (!window.confirm(`Excluir o histórico salvo de ${filtroEmpresa} / ${departamentoUnicoSelecionado} neste período? Os valores calculados e o rascunho serão apagados — essa ação não pode ser desfeita.`)) return
    setProcessandoAcao('excluir')
    setErro(null)
    try {
      // Só os funcionários desta empresa+departamento — pra não apagar o que outro gerente já
      // salvou de outra empresa/departamento no mesmo período (o lote é por período+empresa+
      // departamento, mas os valores calculados em fato_comissoes_calculadas não têm essas
      // colunas direto, só via funcionario_id). "Sem departamento" é departamento_ids vazio, não
      // um id de verdade — não dá pra comparar com .includes(departamentoSelecionadoId) (que
      // aqui é null e nunca bateria com nada).
      const funcionarioIds = (dados?.funcionarios || [])
        .filter(f => {
          if (f.empresa_id !== empresaSelecionadaId) return false
          if (departamentoUnicoSelecionado === SEM_DEPARTAMENTO) return (f.departamento_ids || []).length === 0
          return (f.departamento_ids || []).includes(departamentoSelecionadoId)
        })
        .map(f => f.id)
      await apiService.excluirHistoricoLote(lote?.id || null, periodoInicio, periodoFim, funcionarioIds)
      setLote(null)
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
        const [funcionarios, empresas, cargos, departamentos, setores, politicas, ferias] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getSetores(),
          apiService.getPoliticaComissao(),
          // Férias são só informativas ao lado do nome — se a tabela ainda não existir/estiver
          // vazia, não pode derrubar o cálculo de comissões inteiro.
          apiService.getFerias().catch(() => []),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, setores, politicas, ferias })
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

  // Departamentos marcados como "Responsável" em Grupos de Acesso — { [departamento_id]: [nomes] }.
  const [responsaveisPorDepartamento, setResponsaveisPorDepartamento] = useState({})
  useEffect(() => {
    apiService.getResponsaveisComissaoDepartamentos().then(setResponsaveisPorDepartamento).catch(() => setResponsaveisPorDepartamento({}))
  }, [])
  const mesArquivoFerias = infoArquivoFerias?.dataModificacao?.slice(0, 7) || null
  const mesAtualReal = useMemo(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  }, [])
  const feriasDesatualizada = !!(mesArquivoFerias && mesArquivoFerias < mesAtualReal)
  const feriasAtualizada = !!(mesArquivoFerias && mesArquivoFerias >= mesAtualReal)

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


  // Monta a lista de candidatos (funcionário + política/fonte/base resolvidas, ou motivo de exclusão)
  const candidatos = useMemo(() => {
    if (!dados) return []
    const { funcionarios, empresas, cargos, departamentos, setores, politicas } = dados
    // Mesmo critério de "Situação (Ativo) = Sim" usado em Funcionarios.jsx: sem data de demissão
    // e situação vazia, "1 - Trabalhando" ou "9 - Férias" (exclui Demitido e qualquer outro
    // Afastado — doença etc). Quem está de férias sempre aparece na tabela — `recebe_comissao_ferias`
    // só decide se os dias de férias são descontados do período calculado, não se ele some da lista.
    const SITUACAO_FERIAS = '9'
    const funcionariosAtivos = funcionarios.filter(f => {
      if (f.data_demissao) return false
      if (!f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === SITUACAO_FERIAS) return true
      return false
    })
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
    // Política com "Comissão sobre todas as empresas" marcada ignora o filtro de empresa por
    // completo (mesmo em nível INDIVIDUAL) — soma o faturamento de TODAS as empresas cadastradas.
    const todasEmpresasNomes = [...new Set(empresas.map(nomeSistema).filter(Boolean))]

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
            const fonte = politica.fonte_calculo || null
            const baseCalc = politica.base_calculo || null
            if (!fonte || !baseCalc) return null
            if (!fonte.pasta_sharepoint || !fonte.prefixo_arquivo || !baseCalc.coluna_valor) return null
            if (politica.nivel_calculo === 'INDIVIDUAL' && !fonte.coluna_funcionario) return null

            // "Comissão sobre todas as empresas" sobrepõe o Nível de Cálculo: soma TODAS as
            // empresas cadastradas, não só o Agrupamento do funcionário. Senão, nível EMPRESA
            // junta os nomes de todas as empresas do mesmo Agrupamento, e INDIVIDUAL/EQUIPE
            // mantém só a própria empresa (comportamento de sempre).
            const empresaNomes = politica.comissao_todas_empresas
              ? todasEmpresasNomes
              : politica.nivel_calculo === 'EMPRESA' && empresa?.agrupamento_empresa_id
              ? [...new Set((empresasPorAgrupamento.get(empresa.agrupamento_empresa_id) || []).map(nomeSistema).filter(Boolean))]
              : [empresaNome]

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
            return subtraiFerias(periodoInicio, periodoFim, feriasFunc)
              .map(seg => ({ ...linha, segInicio: seg.inicio, segFim: seg.fim }))
          })
      })
  }, [dados, periodoInicio, periodoFim, periodoValido, feriasPorCodigo, comissaoEscopoEfetivo])

  // Filtros dinâmicos (facetados): as opções de cada seletor são calculadas aplicando todos os
  // OUTROS filtros ativos, menos o dele mesmo — ao filtrar Setor "Mecânica", o seletor de Cargos
  // só lista cargos de quem está na Mecânica, e assim por diante entre todos os seletores.
  const filtrarCandidatos = useMemo(() => (ignorar) => candidatos.filter(c => {
    if (ignorar !== 'funcionario' && filtroFuncionario && !buscaComCoringa(c.func.nome_funcionario, filtroFuncionario)) return false
    if (ignorar !== 'empresa' && filtroEmpresa && (c.empresa?.empresa_fantasia || c.empresa?.nome_empresa) !== filtroEmpresa) return false
    // Departamento é subordinado à Empresa nesta tela (não um facet do mesmo nível) — nunca
    // deve estreitar de volta a lista de Empresas. Sem essa exceção, marcar um departamento
    // "órfão" (só com lote salvo, sem candidato elegível hoje — ver departamentosComLote)
    // zerava empresasUnicas e a Empresa selecionada era limpa sozinha pelo efeito de
    // auto-limpeza de filtro inválido logo abaixo.
    if (ignorar !== 'departamento' && ignorar !== 'empresa' && filtrosDepartamento.length > 0) {
      const nomesOuSemDepto = c.departamentoNomes.length > 0 ? c.departamentoNomes : [SEM_DEPARTAMENTO]
      if (!nomesOuSemDepto.some(n => filtrosDepartamento.includes(n))) return false
    }
    if (ignorar !== 'setor' && filtroSetor && !c.setorNomes.includes(filtroSetor)) return false
    if (ignorar !== 'area' && filtroArea && !c.areaNomes.includes(filtroArea)) return false
    if (ignorar !== 'cargo' && filtroCargo && c.cargo?.nome_cargo !== filtroCargo) return false
    if (ignorar !== 'agrupCargo' && filtroAgrupamentoCargo && c.cargo?.nome_agrupamento_cargo !== filtroAgrupamentoCargo) return false
    if (ignorar !== 'comissoes' && filtroComissoes.length > 0 && !filtroComissoes.includes(c.politica?.descricao_comissao)) return false
    return true
  }), [candidatos, filtroFuncionario, filtroEmpresa, filtrosDepartamento, filtroSetor, filtroArea, filtroCargo, filtroAgrupamentoCargo, filtroComissoes])

  // Só empresas do agrupamento Caiobá Trucks — Comissões DAF não se aplica a Caiobá Motos nem
  // Outras Caiobá (Serviços ADM, Locações).
  const empresasUnicas = useMemo(() => juntaUnicos(
    filtrarCandidatos('empresa').filter(c => c.empresa?.agrupamento_nome === 'Caiobá Trucks').map(c => c.empresa?.empresa_fantasia || c.empresa?.nome_empresa)
  ), [filtrarCandidatos])
  // Departamentos "órfãos": já têm lote salvo pra empresa+período, mas nenhum funcionário
  // elegível neles HOJE (ex: o cargo foi remanejado pra outro departamento depois do cálculo).
  // Sem isso, o lote fica preso — nunca vira aba selecionável, então nunca dá pra excluir.
  const [departamentosComLote, setDepartamentosComLote] = useState([])
  useEffect(() => {
    if (!periodoValido || !filtroEmpresa || !empresaSelecionadaId) { setDepartamentosComLote([]); return }
    let cancelado = false
    ;(async () => {
      try {
        const lotes = await apiService.getLotesPorEmpresaPeriodo(periodoInicio, periodoFim, empresaSelecionadaId)
        // Nome salvo no lote é um retrato do momento em que foi criado — se o departamento foi
        // renomeado depois, resolve pelo id (cadastro atual) primeiro, senão duplica aba com o
        // nome antigo ao lado do nome novo pro mesmo departamento.
        if (!cancelado) setDepartamentosComLote(lotes.map(l => {
          const nomeAtual = l.departamento_id ? dados?.departamentos.find(d => d.id === l.departamento_id)?.nome_departamento : null
          return nomeAtual || l.departamento_nome || SEM_DEPARTAMENTO
        }))
      } catch {
        if (!cancelado) setDepartamentosComLote([])
      }
    })()
    return () => { cancelado = true }
  }, [filtroEmpresa, empresaSelecionadaId, periodoInicio, periodoFim, periodoValido, dados])

  // Cobre o caso mais órfão de todos: valor calculado e salvo, mas nem lote foi criado (aparece
  // em Processamento de Comissões como "Sem lote"). Nesse caso nem departamentosComLote enxerga
  // — cruza direto os funcionários com valor salvo neste período contra o cadastro de
  // funcionários (sem exigir política/elegibilidade viva), pra sempre existir uma aba pra
  // selecionar e excluir.
  const departamentosComValorSalvo = useMemo(() => {
    if (!filtroEmpresa || !empresaSelecionadaId || !dados) return []
    const funcionarioIdsComValor = new Set(Object.keys(valoresPorFuncionario).map(chave => chave.split('::')[0]))
    if (funcionarioIdsComValor.size === 0) return []
    const nomes = new Set()
    for (const f of dados.funcionarios || []) {
      if (f.empresa_id !== empresaSelecionadaId || !funcionarioIdsComValor.has(f.id)) continue
      const deptNomes = (f.departamento_ids || []).map(id => dados.departamentos.find(d => d.id === id)?.nome_departamento).filter(Boolean)
      if (deptNomes.length === 0) nomes.add(SEM_DEPARTAMENTO)
      else deptNomes.forEach(n => nomes.add(n))
    }
    return [...nomes]
  }, [filtroEmpresa, empresaSelecionadaId, dados, valoresPorFuncionario])

  const departamentosUnicos = useMemo(() => juntaUnicos([
    ...filtrarCandidatos('departamento').flatMap(c => c.departamentoNomes.length > 0 ? c.departamentoNomes : [SEM_DEPARTAMENTO]),
    ...departamentosComLote,
    ...departamentosComValorSalvo,
  ]), [filtrarCandidatos, departamentosComLote, departamentosComValorSalvo])

  const setoresUnicos = useMemo(() => juntaUnicos(filtrarCandidatos('setor').flatMap(c => c.setorNomes)), [filtrarCandidatos])
  const areasUnicas = useMemo(() => juntaUnicos(filtrarCandidatos('area').flatMap(c => c.areaNomes)), [filtrarCandidatos])
  const cargosUnicos = useMemo(() => juntaUnicos(filtrarCandidatos('cargo').map(c => c.cargo?.nome_cargo)), [filtrarCandidatos])
  const agrupamentosCargoUnicos = useMemo(() => juntaUnicos(filtrarCandidatos('agrupCargo').map(c => c.cargo?.nome_agrupamento_cargo)), [filtrarCandidatos])
  const comissoesUnicas = useMemo(() => juntaUnicos(filtrarCandidatos('comissoes').map(c => c.politica?.descricao_comissao)), [filtrarCandidatos])

  // Lote de CADA departamento da empresa selecionada, no período atual — busca todos de uma vez
  // (não só os marcados) porque serve pra duas coisas: sinalizar nas próprias abas quais
  // departamentos ainda não fecharam (bolinha antes do nome) e liberar o Salvar PDF em modo
  // "vários" (quando os marcados, ou todos se nenhum estiver marcado, já estão Conferidos).
  const [lotesPorDepartamento, setLotesPorDepartamento] = useState({}) // nome_departamento -> lote | null
  const [carregandoLotesDepartamentos, setCarregandoLotesDepartamentos] = useState(false)
  useEffect(() => {
    if (!periodoValido || !filtroEmpresa || departamentosUnicos.length === 0 || !dados) {
      setLotesPorDepartamento({})
      return
    }
    let cancelado = false
    ;(async () => {
      setCarregandoLotesDepartamentos(true)
      try {
        const entradas = await Promise.all(departamentosUnicos.map(async (nome) => {
          const deptId = dados.departamentos.find(d => d.nome_departamento === nome)?.id || null
          const lote = deptId ? await apiService.getLoteComissoes(periodoInicio, periodoFim, empresaSelecionadaId, deptId) : null
          return [nome, lote]
        }))
        if (!cancelado) setLotesPorDepartamento(Object.fromEntries(entradas))
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLotesDepartamentos(false)
      }
    })()
    return () => { cancelado = true }
  }, [departamentosUnicos, periodoInicio, periodoFim, periodoValido, filtroEmpresa, empresaSelecionadaId, dados])

  // Departamentos considerados pelo modo "vários" do Salvar PDF: os marcados nas abas, ou — se
  // nenhum estiver marcado — TODOS os departamentos disponíveis pra empresa selecionada (sem
  // aba marcada a tabela já mostra a visão combinada de todo mundo, então o PDF acompanha).
  const departamentosParaPDF = filtrosDepartamento.length > 0 ? filtrosDepartamento : departamentosUnicos
  // Fora do caso "exatamente 1 departamento marcado" (que já usa o `lote` único), o Salvar PDF
  // só libera quando TODOS os departamentos considerados já estiverem com Comissões Conferidas
  // (mesma garantia de nunca mandar rascunho pro RH que já vale pro modo de 1 departamento só).
  const todosDepartamentosConferidos = filtrosDepartamento.length !== 1
    && departamentosParaPDF.length > 0
    && departamentosParaPDF.every(nome => lotesPorDepartamento[nome] && lotesPorDepartamento[nome].status !== 'RASCUNHO')

  // Modo "todas as empresas" do Salvar PDF — só existe quando NENHUMA empresa está marcada (o
  // que já implica nenhum departamento marcado, já que as abas de Departamento só aparecem
  // depois de escolher uma empresa). Todas as combinações empresa+departamento que têm algum
  // candidato com política resolvida, usadas pra checar se TODAS já estão Conferidas antes de
  // liberar o PDF combinado.
  const combinacoesEmpresaDepartamento = useMemo(() => {
    if (filtroEmpresa) return []
    const vistos = new Map() // `${empresaId}::${deptNome}` -> { empresaId, empresaNome, deptNome }
    for (const c of candidatos) {
      const empresaId = c.func.empresa_id
      const empresaNome = c.empresa?.empresa_fantasia || c.empresa?.nome_empresa
      if (!empresaId || !empresaNome) continue
      for (const deptNome of c.departamentoNomes || []) {
        const chave = `${empresaId}::${deptNome}`
        if (!vistos.has(chave)) vistos.set(chave, { empresaId, empresaNome, deptNome })
      }
    }
    return [...vistos.values()]
  }, [filtroEmpresa, candidatos])

  const [lotesTodasEmpresas, setLotesTodasEmpresas] = useState([])
  const [carregandoLotesTodasEmpresas, setCarregandoLotesTodasEmpresas] = useState(false)
  useEffect(() => {
    if (filtroEmpresa || !periodoValido || combinacoesEmpresaDepartamento.length === 0 || !dados) {
      setLotesTodasEmpresas([])
      return
    }
    let cancelado = false
    ;(async () => {
      setCarregandoLotesTodasEmpresas(true)
      try {
        const lotes = await Promise.all(combinacoesEmpresaDepartamento.map(async ({ empresaId, deptNome }) => {
          const deptId = dados.departamentos.find(d => d.nome_departamento === deptNome)?.id || null
          return deptId ? apiService.getLoteComissoes(periodoInicio, periodoFim, empresaId, deptId) : null
        }))
        if (!cancelado) setLotesTodasEmpresas(lotes)
      } catch (err) {
        if (!cancelado) setErro(err.message || String(err))
      } finally {
        if (!cancelado) setCarregandoLotesTodasEmpresas(false)
      }
    })()
    return () => { cancelado = true }
  }, [filtroEmpresa, combinacoesEmpresaDepartamento, periodoInicio, periodoFim, periodoValido, dados])
  const todasEmpresasConferidas = !filtroEmpresa
    && combinacoesEmpresaDepartamento.length > 0
    && lotesTodasEmpresas.length === combinacoesEmpresaDepartamento.length
    && lotesTodasEmpresas.every(l => l && l.status !== 'RASCUNHO')
  // Mesmo lookup de combinacoesEmpresaDepartamento/lotesTodasEmpresas, só que indexado por
  // empresa+departamento — usado em statusLinha pra resolver o status de cada funcionário na
  // visão "Todas as Empresas" (sem isso, todo mundo aparecia preso em "Aguardando Gerente"
  // mesmo já Conferido/Processado, porque lotesPorDepartamento só é buscado com empresa marcada).
  const lotesTodasEmpresasPorChave = useMemo(
    () => Object.fromEntries(combinacoesEmpresaDepartamento.map((combo, i) => [`${combo.empresaId}::${combo.deptNome}`, lotesTodasEmpresas[i]])),
    [combinacoesEmpresaDepartamento, lotesTodasEmpresas]
  )

  const candidatosFiltrados = useMemo(() => filtrarCandidatos(null), [filtrarCandidatos])

  // Se uma seleção ficar sem opção depois de mudar outro filtro (ex: Cargo "Mecânico" e o Setor
  // muda pra Vendas), limpa o filtro incompatível em vez de deixar a lista zerada sem explicação.
  useEffect(() => {
    if (filtroEmpresa && !empresasUnicas.includes(filtroEmpresa)) setFiltroEmpresa('')
    if (filtrosDepartamento.some(d => !departamentosUnicos.includes(d))) setFiltrosDepartamento(prev => prev.filter(d => departamentosUnicos.includes(d)))
    if (filtroSetor && !setoresUnicos.includes(filtroSetor)) setFiltroSetor('')
    if (filtroArea && !areasUnicas.includes(filtroArea)) setFiltroArea('')
    if (filtroCargo && !cargosUnicos.includes(filtroCargo)) setFiltroCargo('')
    if (filtroAgrupamentoCargo && !agrupamentosCargoUnicos.includes(filtroAgrupamentoCargo)) setFiltroAgrupamentoCargo('')
    if (filtroComissoes.length > 0) setFiltroComissoes(prev => prev.filter(v => comissoesUnicas.includes(v)))
  }, [empresasUnicas, departamentosUnicos, setoresUnicos, areasUnicas, cargosUnicos, agrupamentosCargoUnicos, comissoesUnicas])

  // Empresa e Departamento ficam de fora daqui de propósito — agora são as abas obrigatórias
  // do card de Período, não filtros secundários; "Limpar filtros" do painel Avançados não deve
  // derrubar nenhuma das duas abas.
  const temFiltroAtivo = !!(filtroFuncionario || filtroSetor || filtroArea || filtroCargo || filtroAgrupamentoCargo || filtroComissoes.length > 0)
  const limparFiltros = () => { setFiltroFuncionario(''); setFiltroSetor(''); setFiltroArea(''); setFiltroCargo(''); setFiltroAgrupamentoCargo(''); setFiltroComissoes([]) }

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

  // Status da linha (badge antes do código): Reprocessar (liberado parcialmente em Histórico
  // de Comissões), Pendente (nunca calculado), ou o status do lote pra quem já foi calculado.
  const statusLinha = (c) => {
    const liberado = !!lote?.funcionarios_liberados_reprocessamento?.includes(c.func.id)
    const calculado = !!valoresPorFuncionario[chaveLinha(c)]
    if (liberado) return { label: 'Aguardando Reprocessamento', className: 'bg-amber-100 text-amber-700' }
    if (!calculado) return { label: 'Pendente', className: 'bg-slate-100 text-slate-500' }
    // Com exatamente 1 departamento marcado usa o `lote` único já carregado; em modo combinado
    // (0 ou 2+ marcados) não tem um lote só pra apontar, então olha o lote do(s) departamento(s)
    // do próprio candidato — de lotesPorDepartamento (empresa marcada) ou, sem empresa nenhuma
    // selecionada, de lotesTodasEmpresasPorChave (empresa+departamento do próprio candidato).
    // Sem isso, todo mundo aparecia preso em "Aguardando Gerente" na visão sem empresa, mesmo já
    // Conferido/Processado.
    const statusEfetivo = departamentoUnicoSelecionado
      ? lote?.status
      : filtroEmpresa
        ? (c.departamentoNomes || []).map(n => lotesPorDepartamento[n]?.status).find(Boolean)
        : (c.departamentoNomes || []).map(n => lotesTodasEmpresasPorChave[`${c.func.empresa_id}::${n}`]?.status).find(Boolean)
    // Mesmos rótulos usados em Processamento de Comissões (STATUS_LOTE_INFO), pra identificar de
    // cara em que etapa do fluxo aquele funcionário está sem precisar trocar de aba.
    if (statusEfetivo === 'PROCESSADO') return { label: 'Processado', className: 'bg-emerald-100 text-emerald-700' }
    if (statusEfetivo === 'CONFERIDO_DP') return { label: 'Aguardando Processamento', className: 'bg-indigo-100 text-indigo-700' }
    if (statusEfetivo === 'CONFERIDO') return { label: 'Aguardando DP', className: 'bg-blue-100 text-blue-700' }
    return { label: 'Aguardando Gerente', className: 'bg-slate-200 text-slate-700' }
  }

  const handleCalcular = async () => {
    if (!periodoValido || elegiveisFiltrados.length === 0) return
    setCalculando(true)
    setErro(null)
    setSalvo(false)
    try {
      const baseIdsUnicos = [...new Set(elegiveisFiltrados.map(c => c.base.id))]
      const regrasPorBase = {}
      await Promise.all(baseIdsUnicos.map(async (baseId) => {
        regrasPorBase[baseId] = await apiService.getRegrasParaCalculo(baseId)
      }))

      const itemBase = (c) => ({
        pasta: c.fonte.pasta_sharepoint,
        prefixo: c.fonte.prefixo_arquivo,
        usaSubpastaAno: c.fonte.usa_subpasta_ano,
        subpastaPadrao: c.fonte.subpasta_padrao || null,
        linhaCabecalho: c.fonte.linha_cabecalho,
        colunaEmpresa: c.fonte.coluna_empresa,
        colunaData: c.fonte.coluna_data,
        colunaFuncionario: c.fonte.coluna_funcionario || null,
        colunaValor: c.base.coluna_valor,
        tipoAgregacao: c.base.tipo_agregacao,
        regras: regrasPorBase[c.base.id] || [],
        funcionarioNome: c.politica.nivel_calculo === 'INDIVIDUAL' ? c.func.nome_funcionario : null,
        // Cada linha calcula o próprio segmento de apuração — o período cheio, ou os pedaços
        // sem os dias de férias de quem não recebe comissão durante as férias.
        dataInicio: c.segInicio || periodoInicio,
        dataFim: c.segFim || periodoFim,
      })

      const itens = elegiveisFiltrados.map(c => ({ id: chaveLinha(c), ...itemBase(c), empresaNomes: c.empresaNomes }))

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

      setValoresPorFuncionario(prev => {
        const novo = { ...prev }
        itens.forEach(item => {
          const r = resultadosPorId.get(item.id)
          const c = elegiveisFiltrados.find(e => chaveLinha(e) === item.id)
          if (!r || !c) return
          const valorBase = r.valor ?? 0
          const { percentual, valorFixo, valorComissao } = calcularComissaoSobre(c, valorBase)
          novo[r.id] = {
            valorBase, valorComissao, percentual, valorFixo,
            totalLinhasFonte: r.total_linhas_fonte, totalLinhasFiltradas: r.total_linhas_filtradas,
            periodoInicio: c.segInicio || periodoInicio,
            periodoFim: c.segFim || periodoFim,
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
            const { valorComissao } = calcularComissaoSobre(c, valorBase)
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
    candidatosFiltrados.filter(c => c.status === 'OK' && valoresPorFuncionario[chaveLinha(c)]).length,
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

  const [ordenacao, setOrdenacao] = useState({ coluna: null, direcao: 'asc' })
  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  // Agrupa por Departamento e, dentro dele, por Cargo — sempre expandido, sem botão de
  // abrir/fechar. Ordenação escolhida no cabeçalho da coluna se aplica DENTRO de cada
  // grupo de cargo, preservando o agrupamento.
  const gruposPorCargo = useMemo(() => {
    const dir = ordenacao.direcao === 'desc' ? -1 : 1
    const comparadorNumerico = (fn) => (a, b) => {
      const va = fn(a); const vb = fn(b)
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return dir * (va - vb)
    }
    const comparadores = {
      nome: (a, b) => dir * textoNome(a).localeCompare(textoNome(b), 'pt-BR'),
      comissao: (a, b) => dir * textoComissao(a).localeCompare(textoComissao(b), 'pt-BR'),
      valor: comparadorNumerico(numeroValor),
      servicos: comparadorNumerico(numeroServicos),
      pecas: comparadorNumerico(numeroPecas),
      total: comparadorNumerico(numeroTotal),
      valorFixo: comparadorNumerico(numeroValorFixo),
      valorComissao: comparadorNumerico(numeroValorComissao),
    }
    const comparador = comparadores[ordenacao.coluna] || comparadores.nome

    const gruposDepto = new Map()
    for (const c of candidatosFiltrados) {
      const nomeDepartamento = c.departamentoNomes?.join(', ') || 'Sem Departamento'
      if (!gruposDepto.has(nomeDepartamento)) gruposDepto.set(nomeDepartamento, new Map())
      const gruposCargo = gruposDepto.get(nomeDepartamento)
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
      return [...porEmpresa.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
        .map(([nomeEmpresa, itensEmpresa]) => ({ nomeEmpresa, itens: itensEmpresa.sort(comparador) }))
    }

    return [...gruposDepto.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([nomeDepartamento, gruposCargo]) => ({
        nomeDepartamento,
        cargos: [...gruposCargo.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
          .map(([nomeCargo, itens]) => ({ nomeCargo, itens, empresas: agruparPorEmpresa(itens) })),
      }))
  }, [candidatosFiltrados, ordenacao, valoresPorFuncionario])

  // Agrupamento alternativo, só pro modo "todas as empresas" do Salvar PDF (nenhuma empresa
  // marcada): agrupa por Departamento + Empresa juntos (não só Departamento) — sem isso, duas
  // lojas com um departamento de mesmo nome (ex: "OFICINA" em Campo Grande E em Chapadão)
  // cairiam na mesma página/Total, misturando os valores das duas lojas. Mesmo formato de item
  // que gruposPorCargo (nomeDepartamento + cargos com empresas), pra reaproveitar o mesmo
  // gerador de HTML do PDF sem duplicar código.
  const gruposPorEmpresaDepartamento = useMemo(() => {
    if (filtroEmpresa) return []
    const porChave = new Map() // `${nomeEmpresa}::${nomeDepartamento}` -> { nomeEmpresa, nomeDepartamento, cargosMap }
    for (const c of candidatosFiltrados) {
      const nomeEmpresa = c.empresa?.empresa_fantasia || c.empresa?.nome_empresa || 'Sem Empresa'
      const nomeDepartamento = c.departamentoNomes?.join(', ') || 'Sem Departamento'
      const chave = `${nomeEmpresa}::${nomeDepartamento}`
      if (!porChave.has(chave)) porChave.set(chave, { nomeEmpresa, nomeDepartamento, cargosMap: new Map() })
      const grupo = porChave.get(chave)
      const nomeCargo = c.cargo?.nome_cargo || 'Sem Cargo'
      if (!grupo.cargosMap.has(nomeCargo)) grupo.cargosMap.set(nomeCargo, [])
      grupo.cargosMap.get(nomeCargo).push(c)
    }
    return [...porChave.values()]
      .sort((a, b) => a.nomeEmpresa.localeCompare(b.nomeEmpresa, 'pt-BR') || a.nomeDepartamento.localeCompare(b.nomeDepartamento, 'pt-BR'))
      .map(({ nomeEmpresa, nomeDepartamento, cargosMap }) => ({
        nomeDepartamento: `${nomeDepartamento} — ${nomeEmpresa}`,
        cargos: [...cargosMap.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
          .map(([nomeCargo, itens]) => ({ nomeCargo, itens, empresas: [{ nomeEmpresa, itens }] })),
      }))
  }, [filtroEmpresa, candidatosFiltrados])

  const handleSalvar = async () => {
    if (!filtroEmpresa || !departamentoUnicoSelecionado) return
    // Com o lote bloqueado, só salva quem estiver liberado pra reprocessamento parcial
    // (elegiveisFiltrados já filtra isso) — o resto continua intocado.
    const candidatosParaSalvar = loteBloqueado
      ? elegiveisFiltrados
      : candidatosFiltrados
    const registrosSemLote = candidatosParaSalvar
      .filter(c => c.status === 'OK' && valoresPorFuncionario[chaveLinha(c)])
      .map(c => {
        const r = valoresPorFuncionario[chaveLinha(c)]
        return {
          funcionario_id: c.func.id,
          politica_id: c.politica.id,
          fonte_calculo_id: c.fonte.id,
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
          departamentoId: departamentoSelecionadoId, departamentoNome: departamentoUnicoSelecionado,
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

  // Documento pra mandar pro RH computar o pagamento — uma página por Departamento, cada uma
  // com os Cargos/funcionários e o total do departamento no rodapé.
  const handleSalvarPDF = async () => {
    // Sem empresa marcada, cada página combina Departamento+Empresa (gruposPorEmpresaDepartamento)
    // pra não somar o Total de departamentos de mesmo nome em lojas diferentes; com empresa
    // marcada, continua uma página por Departamento (gruposPorCargo), como já era.
    const gruposParaPDF = filtroEmpresa ? gruposPorCargo : gruposPorEmpresaDepartamento
    if (gruposParaPDF.length === 0) {
      setErro('Sem dados pra exportar — calcule as comissões primeiro.')
      return
    }
    setGerandoPDF(true)
    setErro(null)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const MARGIN = 24
      const WRAP_W = 1600
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN

      const periodoLabel = periodoInicio && periodoFim
        ? `${periodoInicio.split('-').reverse().join('/')} a ${periodoFim.split('-').reverse().join('/')}`
        : '—'

      // Cabeçalho de tabela repetido em cada bloco de cargo — cada cargo vira um bloco
      // independente (própria tabela com seu próprio thead), pra poder ser paginado sozinho
      // sem depender do resto do departamento.
      const THEAD_HTML = `
        <thead>
          <tr style="background:#1e293b;color:#fff;text-transform:uppercase;font-size:11px;">
            <th style="padding:7px 8px;text-align:left;">Funcionário</th>
            <th style="padding:7px 8px;text-align:left;">Comissão</th>
            <th style="padding:7px 8px;text-align:right;">Base Comissão</th>
            <th style="padding:7px 8px;text-align:right;">% Serviços</th>
            <th style="padding:7px 8px;text-align:right;">% Peças</th>
            <th style="padding:7px 8px;text-align:right;">% Total</th>
            <th style="padding:7px 8px;text-align:right;">R$ Valor</th>
            <th style="padding:7px 8px;text-align:right;">Valor Comissão</th>
          </tr>
        </thead>`

      // Empresa(s) do departamento — quase sempre uma só; se houver mais de uma no mesmo
      // departamento, mostra todas separadas por vírgula.
      const nomesEmpresaDoDepto = (grupoDepto) => [...new Set(
        grupoDepto.cargos.flatMap(g => g.itens)
          .map(c => c.empresa?.empresa_fantasia || c.empresa?.nome_empresa || c.empresaNome)
          .filter(Boolean)
      )].join(', ')

      // Bloco de cabeçalho (empresa/departamento/período) — repetido no topo de cada página
      // nova que o departamento precisar abrir, com um aviso de "continuação" pra deixar claro
      // que é o mesmo departamento continuando, não um novo.
      const montarHtmlCabecalho = (grupoDepto, continuacao) => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px 20px 0 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Cálculo de Comissões</div>
              <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:2px;">${nomesEmpresaDoDepto(grupoDepto)}</div>
            </div>
            <div style="text-align:right;font-size:13px;color:#475569;">
              <div>Período: ${periodoLabel}</div>
              <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div style="font-size:14px;font-weight:700;color:#334155;margin-bottom:8px;">${grupoDepto.nomeDepartamento}${continuacao ? ' <span style="font-weight:400;font-style:italic;color:#94a3b8;">(continuação)</span>' : ''}</div>
        </div>`

      // Um bloco por Cargo — tabela própria e independente, pra poder cair numa página nova
      // sem quebrar uma linha de funcionário ao meio (a quebra sempre acontece ENTRE cargos).
      const montarHtmlBlocoCargo = (grupo) => {
        const linhasEmpresas = grupo.empresas.map((empresaGrupo, idxEmpresa) => {
          const linhasFunc = empresaGrupo.itens.map(c => {
            const res = valoresPorFuncionario[chaveLinha(c)]
            const linhasMesmoFunc = empresaGrupo.itens.filter(x => x.func.id === c.func.id)
            const ehPrimeiraLinhaDoFunc = linhasMesmoFunc[0] === c
            const ehUltimaLinhaDoFunc = linhasMesmoFunc[linhasMesmoFunc.length - 1] === c
            // Subtotal em TODO funcionário, mesmo com uma linha só — facilita a conferência do RH.
            const mostrarSubtotal = ehUltimaLinhaDoFunc
            const totalFunc = mostrarSubtotal
              ? linhasMesmoFunc.reduce((acc, x) => acc + (valoresPorFuncionario[chaveLinha(x)]?.valorComissao || 0), 0)
              : null
            const nomeComCodigo = c.func.codigo_funcionario ? `${c.func.codigo_funcionario} — ${c.func.nome_funcionario}` : c.func.nome_funcionario
            const detalheEmpresasHtml = c.politica.detalhar_por_empresa && detalhePorEmpresa[chaveLinha(c)]
              ? detalhePorEmpresa[chaveLinha(c)].map(d => `
                  <div style="font-size:10px;font-weight:400;color:#94a3b8;margin-top:2px;">
                    ${d.empresa}: Base <span style="color:#64748b;">${fmtValorBase(c, d.valorBase)}</span>
                    <span style="color:#cbd5e1;"> &rarr; </span>
                    Comissão <span style="color:#059669;font-weight:600;">${fmtBRL(d.valorComissao)}</span>
                  </div>`).join('')
              : ''
            return `
              <tr>
                <td style="padding:6px 8px;font-weight:700;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${ehPrimeiraLinhaDoFunc ? nomeComCodigo : ''}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${c.politica.descricao_comissao || c.politica.nivel_calculo || ''}${tipoComissaoPorBase(c) ? ` <span style="font-style:italic;color:#94a3b8;">(${tipoComissaoPorBase(c)})</span>` : ''}${c.segInicio && c.segFim ? ` <span style="font-size:11px;font-weight:700;color:#2563eb;">${fmtDiaMes(c.segInicio)} a ${fmtDiaMes(c.segFim)}</span>` : ''}${detalheEmpresasHtml}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${res ? fmtValorBase(c, res.valorBase) : '—'}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(c.politica.comissao_servicos)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(c.politica.comissao_pecas)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(c.politica.comissao_total)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtBRL(c.politica.comissao_valor != null ? parseFloat(c.politica.comissao_valor) : null)}</td>
                <td style="padding:6px 8px;text-align:right;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${res ? fmtBRL(res.valorComissao) : '—'}</td>
              </tr>${mostrarSubtotal ? `
              <tr style="background:#ecfdf5;">
                <td colspan="7" style="padding:5px 8px;text-align:right;font-weight:700;color:#334155;">Total ${c.func.nome_funcionario}</td>
                <td style="padding:5px 8px;text-align:right;font-weight:700;color:#047857;">${fmtBRL(totalFunc)}</td>
              </tr>` : ''}`
          }).join('')
          return `
            <tr><td colspan="8" style="padding:8px 8px 4px 20px;background:#f8fafc;font-weight:600;font-size:10px;text-transform:uppercase;color:#64748b;${idxEmpresa > 0 ? 'border-top:2px dashed #94a3b8;' : ''}">${empresaGrupo.nomeEmpresa}</td></tr>
            ${linhasFunc}`
        }).join('')
        const codigoCargo = grupo.itens[0]?.cargo?.codigo_cargo
        const nomeCargoComCodigo = codigoCargo ? `${grupo.nomeCargo} (${codigoCargo})` : grupo.nomeCargo
        return `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              ${THEAD_HTML}
              <tbody>
                <tr><td colspan="8" style="padding:5px 8px;background:#f1f5f9;font-weight:700;font-size:12px;text-transform:uppercase;color:#334155;">${nomeCargoComCodigo}</td></tr>
                ${linhasEmpresas}
              </tbody>
            </table>
          </div>`
      }

      const montarHtmlRodape = (grupoDepto, totalDepto) => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px 20px 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tfoot>
              <tr style="border-top:2px solid #1e293b;">
                <td colspan="7" style="padding:10px 8px;text-align:right;font-weight:800;color:#0f172a;">Total ${grupoDepto.nomeDepartamento}</td>
                <td style="padding:10px 8px;text-align:right;font-weight:800;color:#047857;">${fmtBRL(totalDepto)}</td>
              </tr>
            </tfoot>
          </table>
        </div>`

      const renderBloco = async (html) => {
        const wrap = document.createElement('div')
        wrap.style.cssText = `position:fixed;top:0;left:-9999px;width:${WRAP_W}px;background:#fff;z-index:-1;`
        wrap.innerHTML = html
        document.body.appendChild(wrap)
        try {
          return await html2canvas(wrap, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: WRAP_W })
        } finally {
          document.body.removeChild(wrap)
        }
      }

      // Empacota os blocos (cabeçalho / cada cargo / rodapé) nas páginas — quando um cargo não
      // cabe mais no espaço restante da página atual, abre página nova (repetindo o cabeçalho
      // do departamento com "(continuação)") em vez de espremer tudo numa imagem só. A quebra
      // sempre acontece ENTRE cargos, nunca no meio de um.
      const GAP = 6
      const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
      let primeiraPaginaGeral = true
      const iniciarPagina = () => {
        if (!primeiraPaginaGeral) pdf.addPage()
        primeiraPaginaGeral = false
        return MARGIN
      }
      const colocarCanvas = (canvas, y) => {
        const h = (canvas.height / canvas.width) * CW
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
        return h
      }

      for (const grupoDepto of gruposParaPDF) {
        const totalDepto = grupoDepto.cargos.flatMap(g => g.itens)
          .reduce((acc, c) => acc + (valoresPorFuncionario[chaveLinha(c)]?.valorComissao || 0), 0)

        let y = iniciarPagina()
        y += colocarCanvas(await renderBloco(montarHtmlCabecalho(grupoDepto, false)), y) + GAP

        for (const grupo of grupoDepto.cargos) {
          const cargoCanvas = await renderBloco(montarHtmlBlocoCargo(grupo))
          const cargoH = (cargoCanvas.height / cargoCanvas.width) * CW
          if (y + cargoH > pageBottom) {
            y = iniciarPagina()
            y += colocarCanvas(await renderBloco(montarHtmlCabecalho(grupoDepto, true)), y) + GAP
          }
          y += colocarCanvas(cargoCanvas, y) + GAP
        }

        const footerCanvas = await renderBloco(montarHtmlRodape(grupoDepto, totalDepto))
        const footerH = (footerCanvas.height / footerCanvas.width) * CW
        if (y + footerH > pageBottom) y = iniciarPagina()
        colocarCanvas(footerCanvas, y)
      }

      // Nome do arquivo sem acento/espaço/caractere especial (evita problema de download em
      // alguns navegadores/SOs) — inclui empresa e departamento(s) pra identificar o PDF sem
      // precisar abrir, já que agora dá pra gerar um por vez ou vários juntos.
      const paraNomeArquivo = (s) => (s || '')
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      const nomeDepartamentoArquivo = departamentoUnicoSelecionado
        ? departamentoUnicoSelecionado
        : (filtrosDepartamento.length > 0 ? filtrosDepartamento.join('-') : 'Todos_Departamentos')
      const nomeArquivo = filtroEmpresa
        ? ['Comissoes', periodoInicio, periodoFim, filtroEmpresa, nomeDepartamentoArquivo].filter(Boolean).map(paraNomeArquivo).join('_')
        : ['Comissoes', periodoInicio, periodoFim, 'Todas_Empresas'].filter(Boolean).map(paraNomeArquivo).join('_')
      pdf.save(`${nomeArquivo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Cálculo de Comissões
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {feriasDesatualizada && (
            <button
              onClick={() => navigate('/ferias')}
              title="A data de modificação do arquivo de férias não é do mês do período selecionado — atualize antes de calcular (Calcular Comissões fica bloqueado até lá)"
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-md transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Atualizar Férias
            </button>
          )}
          {feriasAtualizada && (
            <button
              onClick={() => navigate('/ferias')}
              title="O arquivo de férias já está atualizado com o mês do período selecionado"
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-md transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" /> Férias Atualizadas
            </button>
          )}
        </div>
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
              {/* Filtros Avançados — fica nesta mesma linha, empurrado pra direita. */}
              <button
                type="button"
                onClick={() => setFiltrosAbertos(v => !v)}
                className="ml-auto flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                Filtros Avançados
                {temFiltroAtivo && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>}
              </button>
            </div>
            {periodoMesesDiferentes && (
              <p className="text-[11px] text-amber-600 mb-3">Data Início e Data Fim precisam estar dentro do mesmo mês.</p>
            )}
            {/* Abas de Departamento — multi-select pra VISUALIZAR (a tabela combina os
                departamentos marcados); cada botão marcado mostra um X pra desmarcar só ele.
                As ações do fluxo de aprovação (Calcular/Salvar/Conferir/Processar/Excluir) só
                liberam com exatamente 1 marcado — cada departamento tem seu próprio lote, então
                mais de um por vez não tem um lote único pra apontar. */}
            {filtroEmpresa && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3 pb-3 border-b border-slate-100">
                <label className={`${LBL} mr-1`}>Departamento</label>
                {departamentosUnicos.map(nome => {
                  const selecionado = filtrosDepartamento.includes(nome)
                  const loteDept = lotesPorDepartamento[nome]
                  const fechado = !!(loteDept && loteDept.status !== 'RASCUNHO')
                  const tituloBolinha = carregandoLotesDepartamentos
                    ? 'Verificando status...'
                    : fechado
                      ? `Fechado (${loteDept.status === 'PROCESSADO' ? 'Processado' : loteDept.status === 'CONFERIDO_DP' ? 'Conferido pelo DP' : 'Conferido'})`
                      : 'Ainda não fechado (Rascunho ou nunca calculado)'
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setFiltrosDepartamento(prev => prev.includes(nome) ? prev.filter(d => d !== nome) : [...prev, nome])}
                      title={tituloBolinha}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        selecionado
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {carregandoLotesDepartamentos
                        ? <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-slate-300" />
                        : fechado
                          ? <Lock className="h-3 w-3 shrink-0 text-emerald-500" />
                          : <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0 bg-amber-400" />}
                      {nome}
                      {selecionado && <X className="h-3 w-3" />}
                    </button>
                  )
                })}
                {departamentoSomenteVisualizacao && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-slate-100 text-slate-500 border-slate-200" title="Este departamento está liberado só pra visualização (Grupos de Acesso) — sem botões de ação.">
                    Somente Visualização
                  </span>
                )}
                {departamentoSelecionadoId && empresaSelecionadaId && responsaveisPorDepartamento[departamentoSelecionadoId]?.[empresaSelecionadaId]?.length > 0 && (
                  <span className="text-[11px] text-slate-400 ml-1">
                    Responsável: <strong className="text-slate-600 font-semibold">{responsaveisPorDepartamento[departamentoSelecionadoId][empresaSelecionadaId].join(', ')}</strong>
                  </span>
                )}
                {filtrosDepartamento.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFiltrosDepartamento([])}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors ml-1"
                  >
                    <X className="h-3 w-3" /> Limpar seleção
                  </button>
                )}
                <span className="flex items-center gap-1 text-[10px] text-slate-400 ml-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" /> aberto
                  <Lock className="h-3 w-3 text-emerald-500 ml-1.5" /> fechado
                </span>
              </div>
            )}
            {filtroEmpresa && filtrosDepartamento.length > 1 && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mb-3">
                <Lock className="h-3 w-3" /> Vários departamentos selecionados — mostrando a visão combinada. Selecione só um pra liberar Calcular/Salvar/Conferir (o Salvar PDF libera com vários, desde que todos já estejam Conferidos).
              </p>
            )}
            {loteBloqueado && (
              <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-2">
                <Lock className="h-3 w-3" />
                {elegiveisFiltrados.length > 0
                  ? `Este período já foi ${lote.status === 'PROCESSADO' ? 'processado' : lote.status === 'CONFERIDO_DP' ? 'conferido pelo DP' : 'conferido'} — só ${elegiveisFiltrados.length} funcionário(s) liberado(s) pra reprocessamento em Processamento de Comissões ficam recalculáveis agora.`
                  : `Este período já foi ${lote.status === 'PROCESSADO' ? 'processado' : lote.status === 'CONFERIDO_DP' ? 'conferido pelo DP' : 'conferido'} — peça ao RH/DP pra liberar o reprocessamento em Processamento de Comissões antes de recalcular.`}
              </p>
            )}
            {filtrosAbertos && (
              <div className="border-t border-slate-100 mt-3 pt-4 space-y-3">
                {/* Linha 1 */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Área</label>
                    <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option value="">Todas</option>
                      {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Setor</label>
                    <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option value="">Todos</option>
                      {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Agrupamento de Cargos</label>
                    <select value={filtroAgrupamentoCargo} onChange={e => setFiltroAgrupamentoCargo(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option value="">Todos</option>
                      {agrupamentosCargoUnicos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                </div>

                {/* Linha 2 */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Cargo</label>
                    <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                      <option value="">Todos</option>
                      {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Linha 3 */}
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Funcionário</label>
                    <input
                      type="text"
                      value={filtroFuncionario}
                      onChange={e => setFiltroFuncionario(e.target.value)}
                      placeholder="Buscar pelo nome..."
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Comissão</label>
                    <FiltroMultiSelect
                      placeholder="Todas as Comissões"
                      opcoes={comissoesUnicas}
                      selecionados={filtroComissoes}
                      onChange={setFiltroComissoes}
                    />
                  </div>
                </div>

                {temFiltroAtivo && (
                  <div className="flex items-center justify-end pt-1 border-t border-slate-100">
                    <button onClick={limparFiltros} className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors">
                      <X className="h-3 w-3" /> Limpar filtros
                    </button>
                  </div>
                )}
              </div>
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
                          disabled={!filtroEmpresa || !departamentoUnicoSelecionado || !periodoValido || calculando || elegiveisFiltrados.length === 0 || feriasDesatualizada || departamentoSomenteVisualizacao}
                          title={departamentoSomenteVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : feriasDesatualizada ? 'O arquivo de férias está desatualizado pro mês do período selecionado — atualize em Férias antes de calcular.' : undefined}
                          className={
                            feriasDesatualizada
                              ? 'flex items-center gap-1.5 bg-amber-100 border border-amber-300 text-amber-700 cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors'
                              : 'flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors'
                          }
                        >
                          {calculando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : feriasDesatualizada ? <AlertTriangle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                          {feriasDesatualizada ? 'Férias Desatualizadas' : `Calcular Comissões (${elegiveisFiltrados.length})`}
                        </button>
                      )}
                      {podeSalvar && (
                        <button
                          onClick={handleSalvar}
                          disabled={!filtroEmpresa || !departamentoUnicoSelecionado || elegiveisFiltrados.length === 0 || qtdCalculados === 0 || salvando || (salvo && lote?.status === 'RASCUNHO') || departamentoSomenteVisualizacao}
                          title={departamentoSomenteVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : undefined}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                        >
                          {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Salvar Comissões
                        </button>
                      )}
                      {podeConferir && (
                        <button
                          onClick={handleConferir}
                          disabled={!filtroEmpresa || !departamentoUnicoSelecionado || !(lote?.status === 'RASCUNHO' && salvo) || processandoAcao === 'conferir' || departamentoSomenteVisualizacao}
                          title={departamentoSomenteVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : undefined}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                        >
                          {processandoAcao === 'conferir' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          Conferir Comissões
                        </button>
                      )}
                      {podeSalvarPDF && (
                        <button
                          onClick={handleSalvarPDF}
                          disabled={
                            (!filtroEmpresa
                              ? (carregandoLotesTodasEmpresas || !todasEmpresasConferidas)
                              : (departamentoUnicoSelecionado
                                  ? (!lote || lote.status === 'RASCUNHO' || departamentoSomenteVisualizacao)
                                  : (carregandoLotesDepartamentos || !todosDepartamentosConferidos))) ||
                            gerandoPDF || (filtroEmpresa ? gruposPorCargo.length === 0 : gruposPorEmpresaDepartamento.length === 0)
                          }
                          title={departamentoUnicoSelecionado && departamentoSomenteVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : "Baixa o PDF com uma página por Departamento, pra enviar ao RH — disponível depois de Comissões Conferidas. Pode marcar vários departamentos (ou nenhum, pra todos os da empresa; ou nenhuma empresa, pra todas as lojas juntas) pra baixar tudo num PDF só, desde que já estejam Conferidos."}
                          className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                        >
                          {gerandoPDF ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                          Salvar PDF
                        </button>
                      )}
                      {podeExcluir && (lote ? lote.status === 'RASCUNHO' : salvo) && (
                        <button
                          onClick={handleExcluirHistorico}
                          disabled={!filtroEmpresa || !departamentoUnicoSelecionado || processandoAcao === 'excluir' || departamentoSomenteVisualizacao}
                          title={departamentoSomenteVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : "Só pode excluir enquanto o período estiver em Rascunho"}
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
                      <td colSpan="8" className="p-6 text-center text-slate-400">Nenhum funcionário para os filtros aplicados.</td>
                    </tr>
                  ) : gruposPorCargo.map(grupoDepto => (
                    <React.Fragment key={grupoDepto.nomeDepartamento}>
                      <tr className="bg-indigo-100">
                        <td colSpan="8" className="px-3 py-2 font-bold text-indigo-900 text-[11px] uppercase tracking-wide">
                          {grupoDepto.nomeDepartamento}
                        </td>
                      </tr>
                      {grupoDepto.cargos.map(grupo => (
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
                                    {tipoComissaoPorBase(c) && <span className="italic text-slate-400"> ({tipoComissaoPorBase(c)})</span>}
                                    {c.segInicio && c.segFim && (
                                      <span className="ml-1.5 text-[10px] font-semibold text-blue-600 whitespace-nowrap">
                                        {fmtDiaMes(c.segInicio)} a {fmtDiaMes(c.segFim)}
                                      </span>
                                    )}
                                    {(c.politica?.codigo_rubrica || c.politica?.tipo_processo) && (
                                      <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                                        {c.politica?.codigo_rubrica && <>Rubrica <span className="font-mono text-slate-500">{c.politica.codigo_rubrica}</span></>}
                                        {c.politica?.codigo_rubrica && c.politica?.tipo_processo && <span className="mx-1">·</span>}
                                        {c.politica?.tipo_processo && <>Tipo <span className="font-mono text-slate-500">{c.politica.tipo_processo}</span></>}
                                      </div>
                                    )}
                                    {/* Detalhamento por empresa (Nível EMPRESA + checkbox marcado na Política) —
                                        uma linha por empresa, abaixo da descrição, pra auditar de onde veio o total. */}
                                    {c.politica.detalhar_por_empresa && detalhePorEmpresa[chaveLinha(c)] && (
                                      <div className="mt-1 space-y-0.5">
                                        {detalhePorEmpresa[chaveLinha(c)].map(d => (
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
                                  <td className="px-3 py-1.5 text-right font-mono">{fmtPct(c.politica.comissao_total)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{fmtBRL(c.politica.comissao_valor != null ? parseFloat(c.politica.comissao_valor) : null)}</td>
                                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{res ? fmtBRL(res.valorComissao) : '—'}</td>
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

    </div>
  )
}
