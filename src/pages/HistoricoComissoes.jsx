import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Search, Loader2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Eye, X, RotateCcw, Truck, ShieldCheck, CheckCircle2, Circle, Download, Trash2, ClipboardCheck, Calculator, History } from 'lucide-react'
import { apiService } from '../services/api'
import { passaEscopoComissao, setorSoVisualizacao } from '../utils/permissoesComissao'
import { useAuth } from '../context/AuthContext'
import { fmtBRL, fmtPct, fmtDiaMes, TIPOS_META_LABEL, CAMPO_META_LABEL, faixasDaRegra, ROTULO_ACAO_HISTORICO } from '../utils/comissoesFormat'
import { gerarPdfComissoes, paraNomeArquivo } from '../utils/comissoesPdf'
import { AGRUPAMENTOS_COMISSAO, funcionarioAtivoComissao, resolvePoliticas, politicaConfigurada } from '../utils/comissoesElegibilidade'


const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtData = (v) => v ? String(v).split('-').reverse().join('/') : ''


const juntaUnicos = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
// O arquivo do RH traz o CNPJ só com dígitos; no cadastro de Empresas ele pode estar formatado —
// compara sempre pelos dígitos, mesmo padrão já usado em Férias/Cálculo de Comissões.
const soDigitos = (v) => String(v || '').replace(/\D/g, '')

// Mesma lógica da tela de Cálculo de Comissões: a coluna de valor respeita a natureza da Base —
// CONTAGEM (ex: Agendamentos) é quantidade, não dinheiro, então mostra número puro em vez de
// "R$"; bases de horas aparecem como HR; as demais (SOMA em R$, ex: faturamento) como moeda.
const baseEmContagem = (base) => base?.tipo_agregacao === 'CONTAGEM'
const baseEmHoras = (base) => /hora/.test((base?.nome || '').toLowerCase())
const fmtValorBase = (base, v) => {
  if (v == null) return '-'
  if (baseEmContagem(base)) return v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  if (baseEmHoras(base)) return `HR ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return fmtBRL(v)
}
const tipoComissaoPorBase = (base) => {
  const nomeBaseNorm = (base?.nome || '').trim().toLowerCase()
  if (/pe(ç|c)a/.test(nomeBaseNorm)) return '% Peças'
  if (/servi(ç|c)o/.test(nomeBaseNorm)) return '% Serviços'
  return null
}

const MESES = [
  { v: '01', label: 'Janeiro' }, { v: '02', label: 'Fevereiro' }, { v: '03', label: 'Março' },
  { v: '04', label: 'Abril' }, { v: '05', label: 'Maio' }, { v: '06', label: 'Junho' },
  { v: '07', label: 'Julho' }, { v: '08', label: 'Agosto' }, { v: '09', label: 'Setembro' },
  { v: '10', label: 'Outubro' }, { v: '11', label: 'Novembro' }, { v: '12', label: 'Dezembro' },
]

// Fluxo de aprovação do lote: Rascunho (Gerente ainda calculando) -> Conferido (Gerente) ->
// Conferido pelo DP -> Processado (RH/Seletiva). Um badge/cor por fase.
const STATUS_LOTE_INFO = {
  RASCUNHO: { label: 'Aguardando Gerente', className: 'bg-slate-100 text-slate-500 border-slate-200' },
  CONFERIDO: { label: 'Aguardando DP', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  CONFERIDO_DP: { label: 'Aguardando Processamento', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  PROCESSAMENTO_PARCIAL: { label: 'Processamento Parcial', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  PROCESSADO: { label: 'Processado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}
const STATUS_CHIPS = [
  { value: '', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Aguardando Gerente' },
  { value: 'CONFERIDO', label: 'Aguardando DP' },
  { value: 'CONFERIDO_DP', label: 'Aguardando Processamento' },
  { value: 'PROCESSAMENTO_PARCIAL', label: 'Processamento Parcial' },
  { value: 'PROCESSADO', label: 'Processados' },
]

// Botão com menu suspenso (Salvar em TXT / Salvar em PDF etc.) — os cards de lote rodam dentro
// de um container com overflow-hidden, então um menu "absolute" comum fica cortado quando o
// card é baixo (ex: colapsado). Renderiza o painel via portal em document.body, "fixed" na
// posição real do botão, igual o mesmo problema já resolvido em Cargos.jsx (FiltroMultiSelect).
// `onAntesDeAbrir` (opcional) roda antes de abrir — retorna `false` pra cancelar (ex: confirm
// recusado), `'open'` pra abrir mesmo sem alternar, ou nada pra cair no toggle padrão.
function DropdownAcao({ label, icon: Icon, carregando, disabled, title, className, onAntesDeAbrir, opcoes }) {
  const [aberto, setAberto] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  const abrirNaPosicao = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setAberto(true)
  }

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => {
      if (e.target?.closest?.('[data-dropdown-acao-panel]')) return
      if (btnRef.current && btnRef.current.contains(e.target)) return
      setAberto(false)
    }
    document.addEventListener('mousedown', fechar)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      document.removeEventListener('mousedown', fechar)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [aberto])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={async () => {
          if (onAntesDeAbrir) {
            const resultado = await onAntesDeAbrir()
            if (resultado === false) return
            if (resultado === 'open') { abrirNaPosicao(); return }
          }
          if (aberto) setAberto(false)
          else abrirNaPosicao()
        }}
        disabled={disabled}
        title={title}
        className={`flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${className}`}
      >
        <Icon className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {aberto && pos && createPortal(
        <div data-dropdown-acao-panel style={{ position: 'fixed', top: pos.top, right: pos.right }} className="z-50 w-44 bg-white border border-slate-200 rounded-md shadow-lg py-1">
          {opcoes.map((op, i) => (
            <button
              key={i}
              onClick={() => { setAberto(false); op.onClick() }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <op.icon className="h-3.5 w-3.5 text-slate-500" />
              {op.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

// Colunas da tabela de lotes (seleção, expandir, Status, Empresa, Área, Setor, Responsável) —
// a linha expandida ocupa todas. Ações do lote ficam na barra acima da tabela.
const COLUNAS_LOTE = 8

// Uma linha por lote (Empresa + Setor + Período) — o botão de expandir abre logo abaixo as
// comissões individuais dos funcionários dele. Os botões de ação (Conferido DP / Reprocessar /
// Excluir) já sabem exatamente qual lote é o seu, direto pela linha.
function LoteLinha({ grupo, expandido, onToggleExpand, selecionados, onToggleSelecionado, onToggleSelecionarTodos, loteSelecionadoProcessamento, onToggleLoteProcessamento, podeProcessar, podeConfirmarConferenciaDp, podeExcluirLote, processandoAcao, onVisualizar, onToggleConferidoDp, onVerHistorico }) {
  const { lote, status } = grupo
  // Enquanto tiver alguém "Aguardando Reprocessamento" dentro de um lote já Processado, o badge
  // não pode dizer "Processado" liso — dá a entender que está tudo certo. Mostra "Processado
  // Parcialmente" até o último pendente ser recalculado/salvo (some da lista automaticamente).
  const temReprocessamentoPendente = (lote?.funcionarios_liberados_reprocessamento || []).length > 0
  const statusInfo = (status === 'PROCESSADO' && temReprocessamentoPendente)
    ? { label: 'Processado Parcialmente', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    : STATUS_LOTE_INFO[status] || { label: status || 'Sem lote', className: 'bg-slate-100 text-slate-500 border-slate-200' }
  const selecionadosDoLote = grupo.funcionarios.filter(f => selecionados.has(f.funcionario_id))
  const todosSelecionados = grupo.funcionarios.length > 0 && selecionadosDoLote.length === grupo.funcionarios.length
  // grupo.soVisualizacao: departamento liberado só pra visualização (Grupos de Acesso) — soma-se
  // às Ações já marcadas pro grupo, desligando toda ação neste lote específico.
  const podeSelecionar = podeProcessar && !!status && status !== 'RASCUNHO' && !grupo.soVisualizacao
  // Lote selecionável pra qualquer ação da barra de cima (Conferido DP, Pagamento Processado,
  // Processar Selecionados) — cada uma valida o status do lote escolhido antes de agir.
  const podeSelecionarLote = !grupo.soVisualizacao && !grupo.semCalculo && (
    ((podeProcessar || podeConfirmarConferenciaDp) && ['CONFERIDO', 'CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO'].includes(status)) ||
    (podeExcluirLote && (!status || status === 'RASCUNHO'))
  )
  const podeMarcarRevisado = (podeConfirmarConferenciaDp || podeProcessar) && !!lote && !grupo.soVisualizacao

  return (
    <>
      <tr className={`border-b border-slate-100 align-top transition-colors ${expandido ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}>
        <td className="pl-4 pr-1 py-2.5 w-8">
          {podeSelecionarLote && (
            <input
              type="checkbox"
              aria-label={`Selecionar lote ${grupo.empresaNome} — ${grupo.setorNome} para processamento`}
              checked={loteSelecionadoProcessamento}
              onChange={onToggleLoteProcessamento}
              className="mt-1 h-3.5 w-3.5 rounded accent-blue-600"
            />
          )}
        </td>
        <td className="px-1 py-2.5 w-8">
          <button
            type="button"
            onClick={onToggleExpand}
            title={expandido ? 'Recolher comissões individuais' : 'Ver comissões individuais deste lote'}
            className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="px-3 py-2.5">
          <div className="flex flex-col items-start gap-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusInfo.className}`}>{statusInfo.label}</span>
            {grupo.soVisualizacao && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-slate-100 text-slate-500 border-slate-200" title="Este departamento está liberado só pra visualização (Grupos de Acesso) — sem botões de ação.">
                Somente Visualização
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 font-semibold text-slate-900 whitespace-nowrap">{grupo.empresaNome}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">{grupo.areaNome || '—'}</td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <button type="button" onClick={onToggleExpand} className="font-semibold text-slate-900 hover:text-blue-600 text-left transition-colors">
            {grupo.setorNome}
          </button>
        </td>
        <td className="px-3 py-2.5">{grupo.responsavelNomes.length > 0 ? grupo.responsavelNomes.join(', ') : '—'}</td>
        <td className="px-3 py-2.5">
          <button
            type="button"
            onClick={() => onVerHistorico(grupo)}
            disabled={!lote}
            title={lote ? 'Histórico do lote' : 'Lote ainda não foi criado — sem histórico'}
            className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <History className="h-4 w-4" />
          </button>
        </td>
      </tr>
      {expandido && grupo.semCalculo && (
        <tr className="border-b border-slate-200 bg-slate-50/70">
          <td colSpan={COLUNAS_LOTE} className="px-4 py-3 text-xs text-slate-500">
            Ainda sem cálculo salvo neste período — o gerente precisa calcular e salvar em Comissões.
          </td>
        </tr>
      )}
      {expandido && !grupo.semCalculo && (
        <tr className="border-b border-slate-200 bg-slate-50/70">
          <td colSpan={COLUNAS_LOTE} className="px-4 py-3">
            <div className="bg-white rounded-md border border-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    {podeSelecionar && (
                      <th className="p-3">
                        <input type="checkbox" checked={todosSelecionados} onChange={onToggleSelecionarTodos} className="w-3.5 h-3.5 rounded accent-blue-600" />
                      </th>
                    )}
                    <th className="p-3"></th>
                    {podeMarcarRevisado && <th className="p-3">Revisado</th>}
                    <th className="p-3">Status</th>
                    <th className="p-3">Funcionário</th>
                    <th className="p-3">Cargo</th>
                    <th className="p-3 text-right">Valor Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {grupo.funcionarios.map(f => (
                    <tr key={f.funcionario_id}>
                      {podeSelecionar && (
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selecionados.has(f.funcionario_id)}
                            onChange={() => onToggleSelecionado(f.funcionario_id)}
                            className="w-3.5 h-3.5 rounded accent-blue-600"
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <button onClick={() => onVisualizar(f)} title="Visualizar cálculo"
                          className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                      {podeMarcarRevisado && (() => {
                        const aguardandoReprocessamento = !!lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id)
                        const revisado = !!lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id)
                        return (
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => !aguardandoReprocessamento && onToggleConferidoDp(grupo.loteId, f.funcionario_id)}
                              disabled={aguardandoReprocessamento}
                              title={aguardandoReprocessamento ? 'Aguardando Reprocessamento — recalcule e salve em Cálculo de Comissões DAF antes de revisar' : revisado ? 'Revisado — clique pra desmarcar' : 'Marcar como revisado'}
                              className="p-1 rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
                            >
                              {revisado
                                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                : <Circle className="h-4 w-4 text-slate-300" />}
                            </button>
                          </td>
                        )
                      })()}
                      <td className="p-3">
                        {(() => {
                          // Status de cada funcionário: o do lote só vale pra quem ainda não foi
                          // processado — num processamento parcial, quem já saiu fica "Processado"
                          // e o restante "Aguardando Processamento".
                          const info = lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id)
                            ? { label: 'Aguardando Reprocessamento', className: 'bg-amber-100 text-amber-700 border-amber-200' }
                            : lote?.funcionarios_processados?.includes(f.funcionario_id)
                              ? { label: 'Processado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
                              : (status === 'PROCESSAMENTO_PARCIAL' || status === 'CONFERIDO_DP')
                                ? { label: 'Aguardando Processamento', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
                                : statusInfo
                          return (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${info.className}`}>
                              {info.label}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{f.funcionarioNome}</td>
                      <td className="p-3 whitespace-nowrap">
                        {f.cargoCodigo && <span className="font-mono text-[10px] text-slate-400 mr-1">{f.cargoCodigo}</span>}
                        {f.cargoNome}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtBRL(f.valorComissaoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function HistoricoComissoes() {
  const { user, hasAction, comissaoEscopoEfetivo, comissaoNivelSetorEfetivo } = useAuth()
  const podeConfirmarConferenciaDp = hasAction('processamento-comissoes', 'confirmar_conferencia')
  const podeProcessar = hasAction('processamento-comissoes', 'processar')
  const podeExcluirLote = hasAction('processamento-comissoes', 'excluir')
  const usuarioLabel = user?.email || 'desconhecido'
  const anoAtual = new Date().getFullYear()
  const ANOS = useMemo(() => Array.from({ length: 6 }, (_, i) => String(anoAtual - i)), [anoAtual])

  // Vem pré-selecionado com o mês anterior — é o mês recém-fechado que o DP/RH normalmente está
  // processando, mesmo padrão já usado como período padrão em Cálculo de Comissões.
  const mesAnterior = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)
  const [ano, setAno] = useState(String(mesAnterior.getFullYear()))
  const [mes, setMes] = useState(String(mesAnterior.getMonth() + 1).padStart(2, '0'))

  const [carregandoBase, setCarregandoBase] = useState(true)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  const [buscando, setBuscando] = useState(false)
  const [jaBuscou, setJaBuscou] = useState(false)
  const [resultados, setResultados] = useState([])
  const [detalheAberto, setDetalheAberto] = useState(null)
  const [historicoAberto, setHistoricoAberto] = useState(null) // { grupo, itens: null | [] }
  const abrirHistoricoLote = async (grupo) => {
    if (!grupo.lote) return
    setHistoricoAberto({ grupo, itens: null })
    try {
      const itens = await apiService.getHistoricoLote(grupo.lote.id)
      setHistoricoAberto({ grupo, itens })
    } catch (err) {
      setErro(err.message || String(err))
      setHistoricoAberto(null)
    }
  }
  // Mesma calculadora de Cálculo de Comissões, lendo o detalhe_calculo já salvo (não recalcula
  // nada aqui) — regraModal = "Regra da Comissão" (políticas com faixa), colunaModal = Venda/
  // Devolução (políticas sem faixa, quando a Base tem Coluna Tipo de Movimento ou soma 2+ colunas).
  const [regraModal, setRegraModal] = useState(null)
  const [colunaModal, setColunaModal] = useState(null)
  const [lotesMap, setLotesMap] = useState({})
  const [selecionados, setSelecionados] = useState(new Set())
  const [lotesSelecionadosProcessamento, setLotesSelecionadosProcessamento] = useState(new Set())
  const [lotesExpandidos, setLotesExpandidos] = useState(new Set())
  const [filtroStatusLote, setFiltroStatusLote] = useState('')
  const [processandoAcao, setProcessandoAcao] = useState(null)

  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroResponsavel, setFiltroResponsavel] = useState('')

  useEffect(() => {
    (async () => {
      setCarregandoBase(true)
      setErro(null)
      try {
        const [funcionarios, empresas, cargos, departamentos, setores, politicas, ferias, rubricas, tiposProcesso] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getSetores(),
          apiService.getPoliticaComissao(),
          apiService.getFerias(),
          apiService.getRubricas(),
          apiService.getTiposProcesso(),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, setores, politicas, ferias, rubricas, tiposProcesso })
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoBase(false)
      }
    })()
  }, [])

  // Setores marcados como "Responsável" em Grupos de Acesso — { [setor_id]: { [empresa_id]: [nomes] } }.
  const [responsaveisPorSetor, setResponsaveisPorSetor] = useState({})
  useEffect(() => {
    apiService.getResponsaveisComissaoSetores().then(setResponsaveisPorSetor).catch(() => setResponsaveisPorSetor({}))
  }, [])

  const mapas = useMemo(() => {
    if (!dados) return null
    const { funcionarios, empresas, cargos, departamentos, setores, politicas } = dados
    return {
      funcionariosMap: Object.fromEntries(funcionarios.map(f => [f.id, f])),
      empresasMap: Object.fromEntries(empresas.map(e => [e.id, e])),
      cargosMap: Object.fromEntries(cargos.map(c => [c.id, c])),
      departamentosMap: Object.fromEntries(departamentos.map(d => [d.id, d])),
      setoresMap: Object.fromEntries(setores.map(s => [s.id, s])),
      politicasMap: Object.fromEntries(politicas.map(p => [p.id, p])),
      rubricasPorCodigo: Object.fromEntries((dados.rubricas || []).map(r => [r.codigo, r])),
      tiposProcessoPorCodigo: Object.fromEntries((dados.tiposProcesso || []).map(t => [t.codigo, t])),
    }
  }, [dados])

  // Opções dos filtros vêm dos cadastros completos (não dependem de já ter buscado um período),
  // pra dar pra pré-filtrar antes de clicar em Visualizar.
  const empresasUnicas = useMemo(() => juntaUnicos((dados?.empresas || []).map(e => e.empresa_fantasia || e.nome_empresa)), [dados])
  const setoresUnicas = useMemo(() => juntaUnicos((dados?.setores || []).map(s => s.nome_setor)), [dados])
  const areasUnicas = useMemo(() => juntaUnicos((dados?.departamentos || []).map(d => d.area)), [dados])
  const responsaveisUnicos = useMemo(() => juntaUnicos(
    Object.values(responsaveisPorSetor || {}).flatMap(porEmpresa => Object.values(porEmpresa || {}).flat())
  ), [responsaveisPorSetor])

  // Férias importadas, indexadas por código do empregado + CNPJ da empresa — mesmo padrão de
  // Cálculo de Comissões, usado no Detalhe do Cálculo pra mostrar o período de férias de quem
  // esteve de férias durante o cálculo (já não fica mais escondido/excluído da tabela).
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
  const feriasNoPeriodo = (func, empresa, ini, fim) => {
    if (!func?.codigo_funcionario) return []
    const cnpj = soDigitos(empresa?.cnpj)
    if (!cnpj) return []
    const chave = `${parseInt(func.codigo_funcionario, 10)}|${cnpj}`
    const lista = feriasPorCodigo.get(chave) || []
    return lista.filter(f => f.inicio_gozo && f.fim_gozo && f.inicio_gozo <= fim && f.fim_gozo >= ini)
  }

  const periodoFim = useMemo(() => {
    const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate()
    return `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`
  }, [ano, mes])
  const periodoInicio = `${ano}-${mes}-01`

  const mudarMes = (delta) => {
    const data = new Date(Number(ano), Number(mes) - 1 + delta, 1)
    setAno(String(data.getFullYear()))
    setMes(String(data.getMonth() + 1).padStart(2, '0'))
  }

  const handleVisualizar = async () => {
    if (!mapas) return
    setBuscando(true)
    setErro(null)
    setJaBuscou(true)
    try {
      const salvos = await apiService.getComissoesCalculadas(periodoInicio, periodoFim)
      const { funcionariosMap, empresasMap, cargosMap, departamentosMap, setoresMap, politicasMap } = mapas
      const enriquecidos = salvos.map(s => {
        const func = funcionariosMap[s.funcionario_id] || null
        const empresa = func ? empresasMap[func.empresa_id] : null
        const cargo = func ? cargosMap[func.cargo_id] : null
        const politica = politicasMap[s.politica_id] || null
        return {
          ...s,
          func,
          empresa,
          cargo,
          politica,
          funcionarioNome: func?.nome_funcionario || s.funcionario?.nome_funcionario || '-',
          empresaNome: empresa?.empresa_fantasia || empresa?.nome_empresa || '-',
          cargoNome: cargo?.nome_cargo || '-',
          cargoCodigo: cargo?.codigo_cargo || null,
          agrupamentoCargoNome: cargo?.nome_agrupamento_cargo || null,
          empresaId: func?.empresa_id || null,
          departamentoIds: func?.departamento_ids || [],
          setorIds: func?.setor_ids || [],
          agrupamentoCargoId: cargo?.agrupamento_id || null,
          departamentoNomes: (func?.departamento_ids || []).map(id => departamentosMap[id]?.nome_departamento).filter(Boolean),
          setorNomes: (func?.setor_ids || []).map(id => setoresMap[id]?.nome_setor).filter(Boolean),
          areaNomes: [...new Set((func?.departamento_ids || []).map(id => departamentosMap[id]?.area).filter(Boolean))],
          comissaoDescricao: politica?.descricao_comissao || '-',
        }
      })
      // Restrição de acesso do grupo (mesma regra de CalculoComissoes.jsx) — registros
      // salvos fora do escopo do usuário não aparecem no histórico.
      setResultados(enriquecidos.filter(r => passaEscopoComissao(r, comissaoEscopoEfetivo)))
      setSelecionados(new Set())
      setLotesSelecionadosProcessamento(new Set())
      setLotesExpandidos(new Set())
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setBuscando(false)
    }
  }

  // Lotes distintos dos resultados visíveis — usados pra saber o status (Rascunho/Conferido/
  // Conferido DP/Processado) de cada card e habilitar os botões de ação certos.
  const loteIdsResultados = useMemo(() => [...new Set(resultados.map(r => r.lote_id).filter(Boolean))], [resultados])
  useEffect(() => {
    if (loteIdsResultados.length === 0) { setLotesMap({}); return }
    let cancelado = false
    apiService.getLotesPorIds(loteIdsResultados)
      .then(lotes => { if (!cancelado) setLotesMap(Object.fromEntries(lotes.map(l => [l.id, l]))) })
      .catch(() => { if (!cancelado) setLotesMap({}) })
    return () => { cancelado = true }
  }, [loteIdsResultados])

  const resultadosFiltrados = useMemo(() => resultados.filter(r => !filtroEmpresa || r.empresaNome === filtroEmpresa), [resultados, filtroEmpresa])

  // Agrupa os resultados por LOTE e, dentro de cada lote, por funcionário — a tela é organizada
  // por lote (card expansível), então essa é a estrutura principal de renderização. Valor Base e
  // Valor Comissão continuam somados por funcionário (múltiplas políticas viram uma linha só);
  // "Visualizar" mostra o detalhamento de cada linha que compõe o total.
  const lotesAgrupados = useMemo(() => {
    const porLote = new Map() // loteId (ou 'sem-lote') -> { loteId, lote, funcionariosMap }
    for (const r of resultadosFiltrados) {
      const loteId = r.lote_id || 'sem-lote'
      if (!porLote.has(loteId)) porLote.set(loteId, { loteId, lote: r.lote_id ? lotesMap[r.lote_id] : null, funcionariosMap: new Map() })
      const grupo = porLote.get(loteId)
      if (!grupo.funcionariosMap.has(r.funcionario_id)) grupo.funcionariosMap.set(r.funcionario_id, [])
      grupo.funcionariosMap.get(r.funcionario_id).push(r)
    }
    // O registro já passou pelo escopo pelo setor do funcionário, mas o lote pode ser de outro
    // setor dele (funcionário em 2 setores) — lote de setor fora do escopo não aparece.
    const escopoSetor = comissaoEscopoEfetivo?.setor
    const lotePermitido = (g) => !escopoSetor || escopoSetor.modo !== 'INDIVIDUAL' || !g.lote?.setor_id || escopoSetor.valores.has(g.lote.setor_id)
    const comLote = [...porLote.values()].filter(lotePermitido).map(g => {
      const funcionarios = [...g.funcionariosMap.entries()].map(([funcionario_id, registros]) => {
        const base = registros[0]
        return {
          funcionario_id,
          funcionarioNome: base.funcionarioNome,
          empresaNome: base.empresaNome,
          cargoNome: base.cargoNome,
          cargoCodigo: base.cargoCodigo,
          lote_id: base.lote_id,
          registros,
          valorComissaoTotal: registros.reduce((acc, r) => acc + (r.valor_comissao || 0), 0),
          calculadoEmMax: registros.reduce((max, r) => (!max || r.calculado_em > max) ? r.calculado_em : max, null),
        }
      }).sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome, 'pt-BR'))
      // Nome de Empresa/Setor salvo no lote é um retrato do momento em que ele foi criado — se o
      // cadastro for renomeado depois (ex: Setores), o lote antigo continuaria com o nome velho.
      // Resolve pelo id (cadastro atual) primeiro, e só cai pro nome salvo no lote como fallback
      // (lote legado sem id, ou cadastro excluído desde então).
      const empresaCadastro = g.lote?.empresa_id ? mapas?.empresasMap[g.lote.empresa_id] : null
      const setorCadastro = g.lote?.setor_id ? mapas?.setoresMap[g.lote.setor_id] : null
      return {
        loteId: g.loteId,
        lote: g.lote,
        status: g.lote?.status || null,
        empresaNome: (empresaCadastro?.empresa_fantasia || empresaCadastro?.nome_empresa) || g.lote?.empresa_nome || funcionarios[0]?.empresaNome || 'Empresa',
        setorNome: setorCadastro?.nome_setor || g.lote?.setor_nome || 'Sem setor',
        // Área = área do departamento "pai" do setor (cadastro atual); lote legado sem setor cai
        // no departamento salvo no próprio lote.
        areaNome: mapas?.departamentosMap[setorCadastro?.departamento_id || g.lote?.departamento_id]?.area || null,
        // Nível de acesso extra por Setor (Grupos de Acesso) — "Visualizar" desliga os
        // botões de ação deste lote, mesmo com a Ação marcada pro grupo (soma-se às Ações).
        soVisualizacao: setorSoVisualizacao(g.lote?.setor_id, comissaoNivelSetorEfetivo),
        responsavelNomes: (g.lote?.setor_id && g.lote?.empresa_id && responsaveisPorSetor[g.lote.setor_id]?.[g.lote.empresa_id]) || [],
        funcionarios,
      }
    })

    // Empresa × Setor que aparecem nas telas Comissões - DAF / HONDA (funcionário ativo com
    // política configurada, dentro do escopo do usuário) mas ainda sem cálculo salvo no período —
    // entram como "Aguardando Gerente", sem lote e sem ação, só pra mostrar a pendência.
    const pendentes = []
    if (jaBuscou && dados && mapas) {
      // Comparado por empresa + NOME do setor, igual às abas da tela de Cálculo: setores de mesmo
      // nome em departamentos diferentes (ex: "Geral" de GERAL e de PÓS-VENDAS) viram uma aba e um
      // lote só lá.
      const jaTem = new Set(comLote.filter(g => g.lote?.empresa_id).map(g => `${g.lote.empresa_id}|${g.setorNome}`))
      const vistos = new Set()
      for (const func of dados.funcionarios) {
        if (!funcionarioAtivoComissao(func)) continue
        const empresa = mapas.empresasMap[func.empresa_id]
        if (!empresa || empresa.ativo === false || !AGRUPAMENTOS_COMISSAO.includes(empresa.agrupamento_nome)) continue
        const cargo = mapas.cargosMap[func.cargo_id]
        const areaNomes = [...new Set((func.departamento_ids || []).map(id => mapas.departamentosMap[id]?.area).filter(Boolean))]
        if (!passaEscopoComissao({ empresaId: func.empresa_id, areaNomes, departamentoIds: func.departamento_ids, setorIds: func.setor_ids, agrupamentoCargoId: cargo?.agrupamento_id }, comissaoEscopoEfetivo)) continue
        if (!resolvePoliticas(func, dados.politicas, mapas.empresasMap).some(politicaConfigurada)) continue
        const empresaNome = empresa.empresa_fantasia || empresa.nome_empresa
        if (filtroEmpresa && empresaNome !== filtroEmpresa) continue
        for (const setorId of func.setor_ids || []) {
          const setor = mapas.setoresMap[setorId]
          if (!setor || setor.ativo === false) continue
          const chave = `${empresa.id}|${setor.nome_setor}`
          if (jaTem.has(chave) || vistos.has(chave)) continue
          const depto = mapas.departamentosMap[setor.departamento_id]
          if (escopoSetor?.modo === 'INDIVIDUAL' && !escopoSetor.valores.has(setorId)) continue
          vistos.add(chave)
          pendentes.push({
            loteId: `pendente-${chave}`,
            lote: null,
            status: 'RASCUNHO',
            semCalculo: true,
            empresaNome,
            setorNome: setor.nome_setor,
            areaNome: depto?.area || null,
            soVisualizacao: setorSoVisualizacao(setorId, comissaoNivelSetorEfetivo),
            responsavelNomes: responsaveisPorSetor[setorId]?.[empresa.id] || [],
            funcionarios: [],
          })
        }
      }
    }

    // Área, Setor e Responsável filtram pelo próprio lote (as colunas da tabela).
    return [...comLote, ...pendentes]
      .filter(g => (!filtroArea || g.areaNome === filtroArea)
        && (!filtroSetor || g.setorNome === filtroSetor)
        && (!filtroResponsavel || g.responsavelNomes.includes(filtroResponsavel)))
      .sort((a, b) => (a.empresaNome + a.setorNome).localeCompare(b.empresaNome + b.setorNome, 'pt-BR'))
  }, [resultadosFiltrados, lotesMap, mapas, dados, jaBuscou, comissaoNivelSetorEfetivo, responsaveisPorSetor, comissaoEscopoEfetivo,
    filtroEmpresa, filtroArea, filtroSetor, filtroResponsavel])

  const lotesVisiveis = useMemo(() => (
    filtroStatusLote ? lotesAgrupados.filter(l => l.status === filtroStatusLote) : lotesAgrupados
  ), [lotesAgrupados, filtroStatusLote])

  // Lote único marcado (checkbox) — alimenta Conferido DP e Pagamento Processado da barra.
  const lotesMarcados = useMemo(() => lotesAgrupados.filter(g => lotesSelecionadosProcessamento.has(g.loteId)), [lotesAgrupados, lotesSelecionadosProcessamento])
  const loteUnicoSelecionado = lotesMarcados.length === 1 ? lotesMarcados[0] : null
  const temLoteElegivelProcessamento = lotesMarcados.some(g => ['CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL'].includes(g.status) && !g.soVisualizacao)
  // Mesmo critério de handleProcessarSelecionados: funcionário marcado precisa estar revisado, sem
  // reprocessamento pendente e ainda não processado.
  const temFuncionarioElegivelProcessamento = lotesAgrupados.some(g => ['CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL'].includes(g.status) && !g.soVisualizacao
    && g.funcionarios.some(f => selecionados.has(f.funcionario_id)
      && !!g.lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id)
      && !g.lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id)
      && !g.lote?.funcionarios_processados?.includes(f.funcionario_id)))
  const temAlgoElegivelProcessamento = temLoteElegivelProcessamento || temFuncionarioElegivelProcessamento
  // Ações por funcionário (Baixar Selecionados / Reprocessar): o lote é o dos funcionários marcados,
  // mesmo sem marcar o checkbox do lote — só vale quando todos os marcados estão no mesmo lote.
  const lotesComFuncionarioMarcado = lotesAgrupados.filter(g => g.funcionarios.some(f => selecionados.has(f.funcionario_id)))
  const grupoFuncionarios = lotesComFuncionarioMarcado.length === 1 ? lotesComFuncionarioMarcado[0] : null
  const selecionadosDoLoteUnico = grupoFuncionarios ? grupoFuncionarios.funcionarios.filter(f => selecionados.has(f.funcionario_id)) : []
  // Lote dos botões de lote (Conferido DP / Pagamento Processado): o marcado no checkbox, ou o dos
  // funcionários marcados quando todos eles estão no mesmo lote.
  const grupoAcaoLote = loteUnicoSelecionado ?? grupoFuncionarios
  // Alvos de Exportar e Voltar Processamento (aceitam vários lotes): em cada lote, os funcionários
  // marcados; sem nenhum marcado nele, o lote inteiro quando o checkbox do lote está marcado.
  const alvos = lotesAgrupados.map(g => {
    const marcados = g.funcionarios.filter(f => selecionados.has(f.funcionario_id))
    if (marcados.length > 0) return { grupo: g, funcionarios: marcados, loteInteiro: false }
    if (lotesSelecionadosProcessamento.has(g.loteId)) return { grupo: g, funcionarios: g.funcionarios, loteInteiro: true }
    return null
  }).filter(Boolean)
  // Seleção com lotes de CNPJs diferentes não libera nenhuma ação da barra.
  const cnpjDoLote = (g) => soDigitos(mapas?.empresasMap[g.lote?.empresa_id]?.cnpj) || g.lote?.empresa_id || g.empresaNome
  const selecaoMesmoCnpj = new Set(alvos.map(a => cnpjDoLote(a.grupo))).size <= 1
  const processadoNoLote = (g, f) => !!g.lote?.funcionarios_processados?.includes(f.funcionario_id)
  const alvosVoltar = alvos
    .map(a => ({ ...a, ids: a.funcionarios.filter(f => processadoNoLote(a.grupo, f)).map(f => f.funcionario_id) }))
    .filter(a => a.ids.length > 0 && !a.grupo.soVisualizacao)
  const podeVoltarProcessamento = podeProcessar && alvosVoltar.length > 0
  const handleVoltarProcessamento = async () => {
    const quantidade = alvosVoltar.reduce((soma, a) => soma + a.ids.length, 0)
    if (!window.confirm(`Desfazer o pagamento processado de ${quantidade} funcionário(s)${alvosVoltar.length > 1 ? ` em ${alvosVoltar.length} lotes` : ''}? Eles voltam a Aguardando Processamento.`)) return
    setProcessandoAcao('desprocessar')
    setErro(null)
    try {
      for (const a of alvosVoltar) {
        await apiService.desprocessarLote(a.grupo.lote.id, a.ids, usuarioLabel)
      }
      setSelecionados(new Set())
      setLotesSelecionadosProcessamento(new Set())
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }
  const grupoAcaoRevisado = !!grupoAcaoLote && grupoAcaoLote.funcionarios.length > 0
    && grupoAcaoLote.funcionarios.every(f => grupoAcaoLote.lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id))
  // Exportar: todos os alvos revisados e sem reprocessamento pendente. TXT só quando já processados.
  const podeExportar = podeProcessar && alvos.length > 0 && alvos.every(({ grupo, funcionarios }) =>
    ['CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO'].includes(grupo.status) && !grupo.soVisualizacao && funcionarios.length > 0
    && funcionarios.every(f => !!grupo.lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id)
      && !grupo.lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id)))
  const podeExportarTxt = podeExportar && alvos.every(({ grupo, funcionarios }) => funcionarios.every(f => processadoNoLote(grupo, f)))
  // Reprocessar age num lote só: os funcionários marcados dele, ou o lote marcado inteiro.
  const grupoAlvo = grupoFuncionarios ?? loteUnicoSelecionado
  const statusAlvo = grupoAlvo?.status
  const funcionariosAlvo = selecionadosDoLoteUnico.length > 0 ? selecionadosDoLoteUnico : (grupoAlvo?.funcionarios || [])
  // Já processado não reprocessa por aqui — usa o Voltar Processamento.
  const alvoJaProcessado = funcionariosAlvo.length > 0 && funcionariosAlvo.every(f => processadoNoLote(grupoAlvo, f))
  const podeReprocessarLoteUnico = !!grupoAlvo && podeProcessar && !!statusAlvo && statusAlvo !== 'RASCUNHO' && funcionariosAlvo.length > 0 && !grupoAlvo.soVisualizacao && !alvoJaProcessado
  // Lote único marcado (checkbox) — Conferido DP, Pagamento Processado e Excluir.
  const statusLoteUnico = loteUnicoSelecionado?.status
  const podeExcluirLoteUnico = !!loteUnicoSelecionado && podeExcluirLote && (!statusLoteUnico || statusLoteUnico === 'RASCUNHO') && !loteUnicoSelecionado.soVisualizacao
  const processandoExcluirLoteUnico = !!loteUnicoSelecionado && processandoAcao === `excluir-${loteUnicoSelecionado.loteId}`
  const processandoReprocessarLoteUnico = !!grupoAlvo && processandoAcao === `reprocessar-${grupoAlvo.loteId}`


  const mesLabel = MESES.find(m => m.v === mes)?.label || mes

  const toggleExpandirLote = (loteId) => {
    setLotesExpandidos(prev => {
      const novo = new Set(prev)
      if (novo.has(loteId)) novo.delete(loteId)
      else novo.add(loteId)
      return novo
    })
  }

  // ── Seleção (por lote) pra Autorizar Reprocessamento ────────────────────────────────────
  const toggleSelecionado = (funcionarioId) => {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(funcionarioId)) novo.delete(funcionarioId)
      else novo.add(funcionarioId)
      return novo
    })
  }
  const toggleSelecionarTodosDoLote = (grupo) => {
    setSelecionados(prev => {
      const novo = new Set(prev)
      const todos = grupo.funcionarios.length > 0 && grupo.funcionarios.every(f => novo.has(f.funcionario_id))
      grupo.funcionarios.forEach(f => { if (todos) novo.delete(f.funcionario_id); else novo.add(f.funcionario_id) })
      return novo
    })
  }
  const toggleSelecionarLoteProcessamento = (loteId) => {
    setLotesSelecionadosProcessamento(prev => {
      const proximo = new Set(prev)
      if (proximo.has(loteId)) proximo.delete(loteId)
      else proximo.add(loteId)
      return proximo
    })
  }

  // Checklist visual (revisado/pendente) — não trava nada por si só, mas alimenta o gate de
  // "Confirmar Conferência" (só libera com todo mundo marcado). Refresca só o lote afetado.
  const handleToggleConferidoDp = async (loteId, funcionarioId) => {
    try {
      const loteAtualizado = await apiService.toggleFuncionarioConferidoDp(loteId, funcionarioId)
      if (loteAtualizado) setLotesMap(prev => ({ ...prev, [loteId]: loteAtualizado }))
    } catch (err) {
      setErro(err.message || String(err))
    }
  }

  const handleConfirmarConferenciaDp = async (lote) => {
    if (!lote || lote.status !== 'CONFERIDO') return
    if (!window.confirm(`Confirmar a conferência do DP pro lote de ${lote.empresa_nome || 'este período'} — ${lote.setor_nome || ''}? Depois disso ele fica liberado pro RH/Seletiva processar o pagamento.`)) return
    setProcessandoAcao(`confirmar-${lote.id}`)
    setErro(null)
    try {
      await apiService.confirmarConferenciaDpLote(lote.id, usuarioLabel)
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  const handleAutorizarReprocessamento = async (grupo) => {
    const lote = grupo.lote
    if (!lote) return
    const marcados = grupo.funcionarios.filter(f => selecionados.has(f.funcionario_id))
    // Lote marcado no checkbox sem funcionário marcado vale pro lote inteiro.
    const selecionadosDoLote = marcados.length > 0 ? marcados : grupo.funcionarios
    if (selecionadosDoLote.length === 0) return
    const ehLoteInteiro = selecionadosDoLote.length === grupo.funcionarios.length
    setProcessandoAcao(`reprocessar-${lote.id}`)
    setErro(null)
    try {
      if (ehLoteInteiro) {
        // Desfaz só a ÚLTIMA etapa concluída (um passo por vez) — não pula direto pra Rascunho.
        const proximoStatusTexto = lote.status === 'PROCESSADO'
          ? 'Conferido pelo DP — o RH/Seletiva vai precisar processar de novo'
          : lote.status === 'CONFERIDO_DP'
            ? 'Conferido — o DP vai precisar conferir de novo'
            : 'Rascunho — o Gerente vai precisar recalcular e salvar de novo'
        if (!window.confirm(`Autorizar reprocessamento do LOTE INTEIRO (${lote.empresa_nome || 'este período'} — todos os ${grupo.funcionarios.length} funcionário(s))? O lote volta pra ${proximoStatusTexto}.`)) return
        await apiService.autorizarReprocessamentoLote(lote.id, usuarioLabel)
      } else {
        const statusAtualTexto = lote.status === 'PROCESSADO' ? 'Processado' : lote.status === 'CONFERIDO_DP' ? 'Conferido pelo DP' : 'Conferido'
        if (!window.confirm(`Liberar reprocessamento só de ${selecionadosDoLote.length} funcionário(s) selecionado(s)? O restante do lote continua ${statusAtualTexto}.`)) return
        await apiService.liberarReprocessamentoLote(lote.id, selecionadosDoLote.map(f => f.funcionario_id), usuarioLabel)
      }
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Apaga os valores calculados (e o lote, se existir) do grupo — reabre o período pra
  // Cálculo de Comissões poder recalcular do zero. Mesma regra de segurança de lá: com lote,
  // exclui só as linhas DESSE lote (via lote_id); sem lote ("Sem lote" — valor calculado mas
  // nunca virou lote), exclui pelos funcionário(s) do grupo no período.
  const handleExcluirLote = async (grupo) => {
    if (!window.confirm(`Excluir o lote de ${grupo.empresaNome} — ${grupo.setorNome} (${mesLabel}/${ano})? Os valores calculados serão apagados e o período volta a poder ser calculado do zero. Essa ação não pode ser desfeita.`)) return
    setProcessandoAcao(`excluir-${grupo.loteId}`)
    setErro(null)
    try {
      const funcionarioIds = grupo.funcionarios.map(f => f.funcionario_id)
      await apiService.excluirHistoricoLote(grupo.lote?.id || null, periodoInicio, periodoFim, funcionarioIds)
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Domínio Sistemas — Leiaute de Importação de Arquivo Texto | Registro de Lançamentos
  // (tipo "10"): linha de largura FIXA (48 posições), sem separador, um lançamento por linha.
  //   001-002 (02) Fixo "10"
  //   003-012 (10) Código do empregado
  //   013-018 (06) Competência — AAAAMM
  //   019-027 (09) Código da rubrica
  //   028-029 (02) Tipo do processo (ex: "11" = Mensal)
  //   030-038 (09) Valor — 2 casas decimais IMPLÍCITAS, sem vírgula (R$ 200,00 = "000020000")
  //   039-048 (10) Empresa
  // Código da rubrica e Tipo do processo vêm da Política de Comissão (por comissão, não fixo no
  // código) — sem os dois cadastrados, a comissão fica de fora do TXT.
  // Sempre a partir de `resultados` (não resultadosFiltrados/lotesAgrupados) pra garantir que o
  // arquivo saia com o LOTE INTEIRO, mesmo que algum filtro secundário esteja escondendo
  // linhas na tela — um arquivo de pagamento incompleto por causa de um filtro seria grave.
  const padNumerico = (valor, tamanho) => {
    const digitos = String(valor ?? '').replace(/\D/g, '')
    if (!digitos || digitos.length > tamanho) return null
    return digitos.padStart(tamanho, '0')
  }
  // itens: [{ loteId, funcionarioIds }] — funcionarioIds null = lote inteiro. Vários lotes saem no
  // mesmo arquivo.
  const montarTxtPagamento = (itens) => {
    const registros = resultados.filter(r => itens.some(i => r.lote_id === i.loteId && (!i.funcionarioIds || i.funcionarioIds.includes(r.funcionario_id))))
    const problemas = []
    // O Domínio espera 1 lançamento por rubrica — um funcionário pode ter várias políticas
    // (comissões) diferentes caindo na MESMA rubrica (ex: duas comissões com Rubrica 318), então
    // agrupa por funcionário+rubrica+tipo do processo+competência+empresa e soma os valores antes
    // de gerar a linha, em vez de gerar uma linha por política.
    const grupos = new Map()
    for (const r of registros) {
      const nomeRegistro = `${r.funcionarioNome} — ${r.comissaoDescricao}`
      if (!r.politica?.codigo_rubrica) { problemas.push(`${nomeRegistro}: falta Código da Rubrica (Política de Comissão)`); continue }
      if (!r.politica?.tipo_processo) { problemas.push(`${nomeRegistro}: falta Tipo do Processo (Política de Comissão)`); continue }
      const [anoComp, mesComp] = (r.periodo_inicio || '').split('-')
      const competencia = anoComp && mesComp ? `${anoComp}${mesComp}` : ''
      const chave = `${r.funcionario_id}|${r.politica.codigo_rubrica}|${r.politica.tipo_processo}|${competencia}|${r.empresaId || ''}`
      if (!grupos.has(chave)) {
        grupos.set(chave, { nomeRegistro, competencia, func: r.func, politica: r.politica, empresa: r.empresa, valorTotal: 0 })
      }
      grupos.get(chave).valorTotal += (r.valor_comissao ?? 0)
    }
    const linhas = []
    for (const g of grupos.values()) {
      const empregado = padNumerico(g.func?.codigo_funcionario, 10)
      const rubrica = padNumerico(g.politica.codigo_rubrica, 9)
      const tipoProcesso = padNumerico(g.politica.tipo_processo, 2)
      const empresa = padNumerico(g.empresa?.codigo_empresa_dominio, 10)
      const valorCentavos = Math.round(g.valorTotal * 100)
      const valor = valorCentavos >= 0 ? String(valorCentavos).padStart(9, '0') : null
      if (!empregado || g.competencia.length !== 6 || !rubrica || !tipoProcesso || !valor || valor.length > 9 || !empresa) {
        const motivos = []
        if (!empregado) motivos.push('Código do Empregado (Funcionários)')
        if (g.competencia.length !== 6) motivos.push('Competência')
        if (!rubrica) motivos.push('Código da Rubrica (Política de Comissão)')
        if (!tipoProcesso) motivos.push('Tipo do Processo (Política de Comissão)')
        if (!valor || valor.length > 9) motivos.push('Valor')
        if (!empresa) motivos.push('Código Empresa no Domínio (Empresas)')
        problemas.push(`${g.nomeRegistro}: ${motivos.join(', ')} inválido/não cadastrado`)
        continue
      }
      linhas.push(`10${empregado}${g.competencia}${rubrica}${tipoProcesso}${valor}${empresa}`)
    }
    return { conteudo: linhas.join('\n'), totalLancamentos: linhas.length, problemas }
  }

  // Um TXT só pra tudo que foi pedido (um ou vários lotes, ou funcionários avulsos). itens: [{ lote,
  // funcionarioIds }] — funcionarioIds null = lote inteiro.
  const baixarTxtPagamento = (itens) => {
    const { conteudo, totalLancamentos, problemas } = montarTxtPagamento(itens.map(i => ({ loteId: i.lote.id, funcionarioIds: i.funcionarioIds })))
    if (totalLancamentos > 0) {
      const empresas = [...new Set(itens.map(i => i.lote.empresa_nome).filter(Boolean))]
      const parcial = itens.some(i => i.funcionarioIds)
      const partesNome = itens.length === 1
        ? [itens[0].lote.empresa_nome, itens[0].lote.setor_nome, parcial ? 'selecionados' : null]
        : [empresas.join('_'), `Setores_${itens.length}`, parcial ? 'selecionados' : null]
      const nomeArquivo = ['Lancamentos', periodoInicio, periodoFim, ...partesNome]
        .filter(Boolean).map(paraNomeArquivo).join('_')
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${nomeArquivo}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    if (problemas.length > 0) {
      window.alert(`${problemas.length} lançamento(s) ficaram de fora do TXT — corrija e baixe de novo:\n\n${problemas.join('\n')}`)
    }
  }

  // Muda o status pra Processado e já baixa UM TXT de pagamento com tudo o que foi processado
  // agora (todos os lotes/funcionários marcados juntos).
  const handleProcessarSelecionados = async () => {
    const lotesEscolhidos = new Set(lotesSelecionadosProcessamento)
    const funcionariosEscolhidos = new Set(selecionados)
    const gruposElegiveis = lotesVisiveis.filter(grupo =>
      ['CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL'].includes(grupo.status) && !grupo.soVisualizacao &&
      (lotesEscolhidos.has(grupo.loteId) || grupo.funcionarios.some(f => funcionariosEscolhidos.has(f.funcionario_id)))
    )
    const trabalhos = gruposElegiveis.map(grupo => {
      const lote = grupo.lote
      const todosIds = [...new Set(resultados.filter(r => r.lote_id === grupo.loteId).map(r => r.funcionario_id))]
      const processados = new Set(lote?.funcionarios_processados || [])
      const revisados = new Set(lote?.funcionarios_conferidos_dp || [])
      const aguardandoReprocessamento = new Set(lote?.funcionarios_liberados_reprocessamento || [])
      const pendentes = todosIds.filter(id => !processados.has(id) && revisados.has(id) && !aguardandoReprocessamento.has(id))
      const ids = lotesEscolhidos.has(grupo.loteId)
        ? pendentes
        : pendentes.filter(id => funcionariosEscolhidos.has(id))
      return { grupo, todosIds, ids }
    }).filter(item => item.ids.length > 0)

    const totalFuncionarios = trabalhos.reduce((soma, item) => soma + item.ids.length, 0)
    if (totalFuncionarios === 0) {
      setErro('Selecione setores ou funcionários revisados e sem reprocessamento pendente.')
      return
    }
    if (!window.confirm(`Processar ${totalFuncionarios} funcionário(s) em ${trabalhos.length} lote(s)? Lotes incompletos ficarão como Processamento Parcial.`)) return

    setProcessandoAcao('processar-selecionados')
    setErro(null)
    const processados = []
    try {
      for (const item of trabalhos) {
        await apiService.processarLote(item.grupo.loteId, usuarioLabel, item.ids, item.todosIds)
        processados.push({ lote: item.grupo.lote, funcionarioIds: item.ids.length === item.todosIds.length ? null : item.ids })
      }
    } catch (err) {
      setErro(err.message || String(err))
    }
    try {
      // TXT sai dos registros já carregados, antes de recarregar a tela.
      if (processados.length > 0) baixarTxtPagamento(processados)
      setSelecionados(new Set())
      setLotesSelecionadosProcessamento(new Set())
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Baixa de novo o TXT de pagamento (ex: o arquivo se perdeu ou precisa reenviar pro banco) — dos
  // funcionários marcados, ou do lote marcado inteiro.
  const handleExportarTxt = (alvosExport) => {
    baixarTxtPagamento(alvosExport.map(a => ({ lote: a.grupo.lote, funcionarioIds: a.loteInteiro ? null : a.funcionarios.map(f => f.funcionario_id) })))
  }

  // Exporta em PDF os funcionários marcados (ou o lote marcado inteiro) no mesmo layout padrão do
  // Cálculo de Comissões (utils/comissoesPdf.js).
  const handleExportarPdf = async (alvosExport) => {
    const blocos = alvosExport.map(({ grupo, funcionarios }) => {
      const ids = new Set(funcionarios.map(f => f.funcionario_id))
      const registros = resultados
        .filter(r => r.lote_id === grupo.loteId && ids.has(r.funcionario_id))
        .sort((a, b) => (a.funcionarioNome || '').localeCompare(b.funcionarioNome || '', 'pt-BR')
          || (a.periodo_inicio || '').localeCompare(b.periodo_inicio || ''))
      return { grupo, registros }
    }).filter(b => b.registros.length > 0)
    if (blocos.length === 0) {
      setErro('Sem valores calculados pra exportar.')
      return
    }
    setProcessandoAcao('exportar-pdf')
    setErro(null)
    try {
      const montarSetor = ({ grupo, registros }) => {
      const porCargo = new Map()
      for (const r of registros) {
        const titulo = r.cargoCodigo ? `${r.cargoNome} (${r.cargoCodigo})` : r.cargoNome
        if (!porCargo.has(titulo)) porCargo.set(titulo, [])
        porCargo.get(titulo).push(r)
      }
      const cargos = [...porCargo.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
        .map(([titulo, itens]) => {
          const regras = new Map()
          for (const r of itens) {
            const regra = r.politica?.usa_faixa === 'SIM' ? r.politica.regra_comissao : null
            if (regra?.id && !regras.has(regra.id)) regras.set(regra.id, { nome: regra.nome, faixas: faixasDaRegra(r.politica, null) })
          }
          const porFuncionario = new Map()
          for (const r of itens) {
            if (!porFuncionario.has(r.funcionario_id)) porFuncionario.set(r.funcionario_id, [])
            porFuncionario.get(r.funcionario_id).push(r)
          }
          return {
            titulo,
            regras: [...regras.values()],
            empresas: [{
              nomeEmpresa: grupo.empresaNome,
              funcionarios: [...porFuncionario.values()].map(linhas => {
                const f = linhas[0].func
                return {
                  nome: f?.codigo_funcionario ? `${f.codigo_funcionario} — ${linhas[0].funcionarioNome}` : linhas[0].funcionarioNome,
                  nomeCurto: linhas[0].funcionarioNome,
                  total: linhas.reduce((acc, r) => acc + (r.valor_comissao || 0), 0),
                  linhas: linhas.map(r => {
                    const baseCalculo = r.politica?.base_calculo
                    return {
                      comissao: r.comissaoDescricao,
                      tipo: tipoComissaoPorBase(baseCalculo),
                      periodo: r.periodo_inicio && r.periodo_fim ? `${fmtDiaMes(r.periodo_inicio)} a ${fmtDiaMes(r.periodo_fim)}` : '',
                      detalhes: (Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas : [])
                        .filter(d => Math.round(Math.abs(Number(d.valorBase) || 0) * 100) !== 0 || Math.round(Math.abs(Number(d.valorComissao) || 0) * 100) !== 0)
                        .map(d => ({ empresa: d.empresa, base: fmtValorBase(baseCalculo, d.valorBase), comissao: fmtBRL(d.valorComissao) })),
                      base: fmtValorBase(baseCalculo, r.valor_base),
                      pctServicos: fmtPct(r.politica?.comissao_servicos),
                      pctPecas: fmtPct(r.politica?.comissao_pecas),
                      pctTotal: fmtPct(r.politica?.comissao_total),
                      valorFixo: fmtBRL(r.politica?.comissao_valor != null ? parseFloat(r.politica.comissao_valor) : null),
                      valorComissao: fmtBRL(r.valor_comissao),
                      // Regra por % de meta sem meta cadastrada é salva sem valor de comissão.
                      semMeta: r.valor_comissao == null && r.politica?.usa_faixa === 'SIM' && !!r.politica.regra_comissao && r.politica.regra_comissao.tipo_faixa !== 'VALOR',
                    }
                  }),
                }
              }),
            }],
          }
        })
        return {
          empresasLabel: grupo.empresaNome,
          nomeSetor: grupo.setorNome,
          total: registros.reduce((acc, r) => acc + (r.valor_comissao || 0), 0),
          cargos,
        }
      }
      const setores = blocos.map(montarSetor)
      const partesNome = blocos.length === 1
        ? [blocos[0].grupo.empresaNome, blocos[0].grupo.setorNome]
        : [[...new Set(blocos.map(b => b.grupo.empresaNome))].join('_'), `Setores_${blocos.length}`]
      const nomeArquivo = ['Comissoes', periodoInicio, periodoFim, ...partesNome].filter(Boolean).map(paraNomeArquivo).join('_')
      await gerarPdfComissoes({ setores, periodoInicio, periodoFim, nomeArquivo })
    } catch (err) {
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Período de férias do funcionário aberto no Detalhe do Cálculo, se ele esteve de férias
  // durante o período selecionado na tela — desde que quem está de férias passou a aparecer
  // normal na tabela (não fica mais escondido num card separado), isso mostra aqui pra não
  // perder a informação de quando ele esteve fora. Usa o período do Ano/Mês selecionado (não o
  // periodo_inicio/periodo_fim do registro salvo, que pode ser um segmento mais curto — a
  // apuração já exclui os dias de férias de quem não recebe comissão nas férias, então o
  // registro salvo às vezes nem cobre a data da própria férias).
  const feriasDoDetalhe = useMemo(() => {
    if (!detalheAberto) return []
    const primeiro = detalheAberto.registros[0]
    if (!primeiro?.func || !primeiro?.empresa) return []
    return feriasNoPeriodo(primeiro.func, primeiro.empresa, periodoInicio, periodoFim)
  }, [detalheAberto, feriasPorCodigo, periodoInicio, periodoFim])

  return (
    <div className="min-h-full w-full p-6 space-y-4">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-blue-600" />
            Processamento de Comissões
          </h1>
          <p className="text-xs text-slate-500">Confira, aprove e processe os lotes de comissão calculados — gera o TXT de pagamento no final do fluxo.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Ano</label>
            <select value={ano} onChange={e => setAno(e.target.value)} className={SEL}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LBL}>Mês</label>
            <div className="flex items-center gap-1">
              <select value={mes} onChange={e => setMes(e.target.value)} className={`${SEL} w-32`}>
                {MESES.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
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
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {carregandoBase ? (
        <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <>
          {/* PERÍODO */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
            <div className="grid grid-cols-9 gap-3 items-end">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LBL}>Empresa</label>
                <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={`${SEL} w-full`}>
                  <option value="">Todas</option>
                  {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LBL}>Área</label>
                <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={`${SEL} w-full`}>
                  <option value="">Todas</option>
                  {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LBL}>Setor</label>
                <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className={`${SEL} w-full`}>
                  <option value="">Todos</option>
                  {setoresUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LBL}>Responsável</label>
                <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className={`${SEL} w-full`}>
                  <option value="">Todos</option>
                  {responsaveisUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={handleVisualizar}
                  disabled={buscando || !mapas}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
                >
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Visualizar
                </button>
              </div>
            </div>
          </div>

          {/* RESULTADOS — um card por lote (Empresa + Setor + Período) */}
          {jaBuscou && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">Processamento — {mesLabel}/{ano}</span>
                {/* Ações de lote: marque o checkbox de UM lote pra liberar Conferido DP (status
                    Conferido) ou Pagamento Processado (status Processado). Processar Selecionados
                    usa os lotes/funcionários marcados (ver handleProcessarSelecionados). */}
                <div className="flex flex-wrap items-center gap-2">
                  {selecaoMesmoCnpj && podeConfirmarConferenciaDp && grupoAcaoLote?.status === 'CONFERIDO' && (
                    <button
                      type="button"
                      onClick={() => handleConfirmarConferenciaDp(grupoAcaoLote.lote)}
                      disabled={processandoAcao === `confirmar-${grupoAcaoLote.lote?.id}` || !grupoAcaoRevisado || grupoAcaoLote.soVisualizacao}
                      title={grupoAcaoLote.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : !grupoAcaoRevisado ? 'Marque todos os funcionários como revisados (expanda o lote) pra liberar' : ''}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    >
                      {processandoAcao === `confirmar-${grupoAcaoLote.lote?.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      Conferido DP
                    </button>
                  )}
                  {selecaoMesmoCnpj && podeExcluirLoteUnico && (
                    <button
                      type="button"
                      onClick={() => handleExcluirLote(loteUnicoSelecionado)}
                      disabled={processandoExcluirLoteUnico}
                      title="Apaga os valores calculados e reabre o período pra recalcular do zero"
                      className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      {processandoExcluirLoteUnico ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Excluir
                    </button>
                  )}
                  {selecaoMesmoCnpj && podeReprocessarLoteUnico && (
                    <button
                      type="button"
                      onClick={() => handleAutorizarReprocessamento(grupoAlvo)}
                      disabled={processandoReprocessarLoteUnico}
                      title="Libera o reprocessamento dos funcionários marcados (ou do lote inteiro, se todos estiverem marcados)"
                      className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      {processandoReprocessarLoteUnico ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Reprocessar
                    </button>
                  )}
                  {selecaoMesmoCnpj && podeProcessar && temAlgoElegivelProcessamento && (
                    <button
                      type="button"
                      onClick={handleProcessarSelecionados}
                      disabled={processandoAcao === 'processar-selecionados'}
                      title="Processa o pagamento dos lotes/funcionários marcados — lotes incompletos ficam como Processamento Parcial"
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                    >
                      {processandoAcao === 'processar-selecionados' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                      Processar
                    </button>
                  )}
                  {selecaoMesmoCnpj && podeVoltarProcessamento && (
                    <button
                      type="button"
                      onClick={handleVoltarProcessamento}
                      disabled={processandoAcao === 'desprocessar'}
                      title="Desfaz o pagamento processado dos funcionários marcados (ou do lote marcado) — voltam a Aguardando Processamento"
                      className="flex items-center gap-1.5 border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                    >
                      {processandoAcao === 'desprocessar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      Voltar Processamento
                    </button>
                  )}
                  {selecaoMesmoCnpj && podeExportar && (
                    <DropdownAcao
                      label="Exportar"
                      icon={Download}
                      title="Exporta os funcionários marcados (ou o lote marcado inteiro)"
                      className="border border-slate-300 text-slate-700 hover:bg-slate-100"
                      opcoes={[
                        { icon: Download, label: 'Salvar em PDF', onClick: () => handleExportarPdf(alvos) },
                        ...(podeExportarTxt ? [{ icon: Download, label: 'Salvar em TXT', onClick: () => handleExportarTxt(alvos) }] : []),
                      ]}
                    />
                  )}
                </div>
              </div>

              {!buscando && lotesAgrupados.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUS_CHIPS.map(chip => {
                    const qtd = chip.value ? lotesAgrupados.filter(l => l.status === chip.value).length : lotesAgrupados.length
                    return (
                      <button
                        key={chip.value || 'todos'}
                        type="button"
                        onClick={() => setFiltroStatusLote(chip.value)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                          filtroStatusLote === chip.value
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {chip.label} ({qtd})
                      </button>
                    )
                  })}
                </div>
              )}

              {buscando ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
              ) : lotesVisiveis.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-xs text-slate-400">Nenhum lote encontrado para este período/filtros.</div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                        <th className="pl-4 pr-1 py-2.5 w-8"></th>
                        <th className="px-1 py-2.5 w-8"></th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Empresa</th>
                        <th className="px-3 py-2.5">Área</th>
                        <th className="px-3 py-2.5">Setor</th>
                        <th className="px-3 py-2.5">Responsável</th>
                        <th className="px-3 py-2.5 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-medium text-slate-700">
                      {lotesVisiveis.map(grupo => (
                        <LoteLinha
                          key={grupo.loteId}
                          grupo={grupo}
                          expandido={lotesExpandidos.has(grupo.loteId)}
                          onToggleExpand={() => toggleExpandirLote(grupo.loteId)}
                          selecionados={selecionados}
                          onToggleSelecionado={toggleSelecionado}
                          onToggleSelecionarTodos={() => toggleSelecionarTodosDoLote(grupo)}
                          loteSelecionadoProcessamento={lotesSelecionadosProcessamento.has(grupo.loteId)}
                          onToggleLoteProcessamento={() => toggleSelecionarLoteProcessamento(grupo.loteId)}
                          podeProcessar={podeProcessar}
                          podeConfirmarConferenciaDp={podeConfirmarConferenciaDp}
                          podeExcluirLote={podeExcluirLote}
                          processandoAcao={processandoAcao}
                          onVisualizar={setDetalheAberto}
                          onToggleConferidoDp={handleToggleConferidoDp}
                          onVerHistorico={abrirHistoricoLote}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* DETALHE DO CÁLCULO — mesma visualização de linha usada na tabela de Cálculo de Comissões */}
      {historicoAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setHistoricoAberto(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[80vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Histórico do lote</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{historicoAberto.grupo.empresaNome} — {historicoAberto.grupo.setorNome}</p>
              </div>
              <button onClick={() => setHistoricoAberto(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              {historicoAberto.itens === null ? (
                <div className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
              ) : historicoAberto.itens.length === 0 ? (
                <p className="text-[11px] text-slate-400">Nenhum evento registrado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {historicoAberto.itens.map(h => (
                    <div key={h.id} className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-800">{ROTULO_ACAO_HISTORICO[h.acao] || h.acao}</span>
                      <span>{h.usuario}</span>
                      <span className="text-slate-400">{new Date(h.data_hora).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detalheAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDetalheAberto(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-fit min-w-0 max-w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Detalhe do Cálculo</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{detalheAberto.empresaNome} — {fmtData(detalheAberto.registros[0]?.periodo_inicio)} a {fmtData(detalheAberto.registros[detalheAberto.registros.length - 1]?.periodo_fim)}</p>
                {feriasDoDetalhe.length > 0 && (
                  <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
                    Férias: {feriasDoDetalhe.map((f, i) => (
                      <span key={i}>{i > 0 && ' · '}{fmtData(f.inicio_gozo)} a {fmtData(f.fim_gozo)}</span>
                    ))}
                  </p>
                )}
              </div>
              <button onClick={() => setDetalheAberto(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto">
              <table className="text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                    <th className="p-3">Nome / Cargo</th>
                    <th className="p-3">Comissão</th>
                    <th className="p-3">Período</th>
                    <th className="p-3 text-right">Base Comissão</th>
                    <th className="p-3 text-right">% Serviços</th>
                    <th className="p-3 text-right">% Peças</th>
                    <th className="p-3 text-right">% Total</th>
                    <th className="p-3 text-right">R$ Valor</th>
                    <th className="p-3 text-right">Valor Comissão</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {detalheAberto.registros.map((r, i) => (
                    <tr key={r.id}>
                      <td className="px-3 py-1.5 font-bold text-slate-900 whitespace-nowrap">
                        {i === 0 && (
                          <>
                            <span className="inline-block w-14 font-mono font-normal text-slate-400">{r.func?.codigo_funcionario || ''}</span>
                            {detalheAberto.funcionarioNome}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        {r.comissaoDescricao}
                        {r.politica?.usa_faixa === 'SIM' && r.politica.regra_comissao?.id && (
                          <button type="button"
                            onClick={() => {
                              const dc = r.detalhe_calculo || {}
                              setRegraModal({
                                nome: r.politica.regra_comissao.nome, baseNome: r.politica.base_calculo?.nome,
                                faixas: faixasDaRegra(r.politica, r.politica.regra_comissao.tipo_faixa === 'VALOR_FIXO_META' ? dc.valorFixo : r.percentual_aplicado),
                                porMeta: r.politica.regra_comissao.tipo_faixa !== 'VALOR',
                                tipoFaixa: r.politica.regra_comissao.tipo_faixa,
                                metaTipoLabel: (TIPOS_META_LABEL[r.politica.regra_comissao.meta_tipo] || r.politica.regra_comissao.meta_tipo) + (CAMPO_META_LABEL[r.politica.regra_comissao.meta_campo] || '') + (r.politica.regra_comissao.meta_equipe_agrupamento_ids?.length > 0 ? ' (soma da equipe)' : ''),
                                semMeta: dc.meta == null, meta: dc.meta, percentualAtingido: dc.percentualAtingido,
                                valorApurado: dc.valorApurado ?? r.valor_base, baseComissao: dc.valorApurado != null ? r.valor_base : null,
                                valorBruto: dc.valorBruto, descontoPct: dc.descontoPct,
                                segmentos: dc.segmentos, valorPorColuna: dc.valorPorColuna,
                              })
                            }}
                            title="Ver a regra desta comissão"
                            className="ml-1.5 align-middle inline-flex items-center justify-center w-5 h-5 rounded border border-indigo-200 bg-white text-indigo-600 hover:bg-indigo-50 transition-colors">
                            <Calculator className="h-3 w-3" />
                          </button>
                        )}
                        {!(r.politica?.usa_faixa === 'SIM' && r.politica.regra_comissao?.id) && r.detalhe_calculo?.valorPorColuna?.length > 0 && (
                          <button type="button"
                            onClick={() => setColunaModal({
                              baseNome: r.politica?.base_calculo?.nome,
                              colunas: r.detalhe_calculo.valorPorColuna,
                              total: r.valor_base,
                            })}
                            title="Ver Venda/Devolução separadas desta Base"
                            className="ml-1.5 align-middle inline-flex items-center justify-center w-5 h-5 rounded border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors">
                            <Calculator className="h-3 w-3" />
                          </button>
                        )}
                        {tipoComissaoPorBase(r.politica?.base_calculo) && (
                          <span className="italic text-slate-400"> ({tipoComissaoPorBase(r.politica?.base_calculo)})</span>
                        )}
                        {(r.politica?.codigo_rubrica || r.politica?.tipo_processo) && (
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {r.politica?.codigo_rubrica && (
                              <>Rubrica <span className="font-mono text-slate-500">{r.politica.codigo_rubrica}</span>
                                {mapas?.rubricasPorCodigo[r.politica.codigo_rubrica]?.descricao && <> — {mapas.rubricasPorCodigo[r.politica.codigo_rubrica].descricao}</>}
                              </>
                            )}
                            {r.politica?.codigo_rubrica && r.politica?.tipo_processo && <span className="mx-1">·</span>}
                            {r.politica?.tipo_processo && (
                              <>Tipo <span className="font-mono text-slate-500">{r.politica.tipo_processo}</span>
                                {mapas?.tiposProcessoPorCodigo[r.politica.tipo_processo]?.descricao && <> — {mapas.tiposProcessoPorCodigo[r.politica.tipo_processo].descricao}</>}
                              </>
                            )}
                          </div>
                        )}
                        {Array.isArray(r.detalhe_empresas) && r.detalhe_empresas.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {r.detalhe_empresas.map(d => (
                              <div key={d.empresa} className="text-[10px] font-normal text-slate-400">
                                {d.empresa}: Base <span className="text-slate-500">{fmtValorBase(r.politica?.base_calculo, d.valorBase)}</span>
                                <span className="text-slate-300"> → </span>
                                Comissão <span className="text-emerald-600 font-semibold">{fmtBRL(d.valorComissao)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono whitespace-nowrap">{fmtData(r.periodo_inicio)} – {fmtData(r.periodo_fim)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtValorBase(r.politica?.base_calculo, r.valor_base)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_servicos)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_pecas)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_total)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtBRL(r.politica?.comissao_valor != null ? parseFloat(r.politica.comissao_valor) : null)}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{fmtBRL(r.valor_comissao)}</td>
                    </tr>
                  ))}
                  {detalheAberto.registros.length > 1 && (
                    <tr className="bg-emerald-50/50">
                      <td colSpan="8" className="px-3 py-1.5 text-right text-[11px] font-bold text-slate-600">Total {detalheAberto.funcionarioNome}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">{fmtBRL(detalheAberto.valorComissaoTotal)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-t border-slate-100 text-[11px] text-slate-400">
                <span>Calculado em <strong className="text-slate-600">{new Date(detalheAberto.calculadoEmMax).toLocaleString('pt-BR')}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CALCULADORA "Regra da Comissão" — mesma telinha de Cálculo de Comissões, lendo
          detalhe_calculo já salvo (sem recalcular nada aqui). */}
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
              {!regraModal.porMeta && !!regraModal.descontoPct && (
                <div className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-[11px] text-slate-600 space-y-1">
                  <div className="flex items-center justify-between"><span>Valor bruto apurado</span><span className="font-mono font-semibold text-slate-700">{fmtBRL(regraModal.valorBruto)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-amber-600">Desconto ({fmtPct(regraModal.descontoPct)})</span><span className="font-mono font-semibold text-amber-600">− {fmtBRL(regraModal.valorBruto - regraModal.valorApurado)}</span></div>
                  <div className="flex items-center justify-between"><span className="font-semibold text-slate-700">Valor líquido (usado na faixa)</span><span className="font-mono font-bold text-slate-800">{fmtBRL(regraModal.valorApurado)}</span></div>
                </div>
              )}
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
                <Calculator className="h-4 w-4 text-blue-600" /> Venda / Devolução
              </h3>
              <button onClick={() => setColunaModal(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              {colunaModal.baseNome && (
                <div className="text-[11px] text-slate-500">Base de Cálculo: <span className="font-semibold text-slate-700">{colunaModal.baseNome}</span></div>
              )}
              <div className="rounded-md border border-slate-200 divide-y divide-slate-100">
                {colunaModal.colunas.map((col, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="font-mono text-slate-600">{col.coluna}</span>
                    <span className="font-mono font-semibold text-slate-700">{fmtBRL(col.valor)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-md bg-blue-50 border border-blue-200 text-xs font-bold">
                <span className="text-slate-700">Total (Base de Cálculo)</span>
                <span className="font-mono text-blue-700">{fmtBRL(colunaModal.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
