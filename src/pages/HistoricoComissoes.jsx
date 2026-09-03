import React, { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { History, Search, Loader2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Eye, X, RotateCcw, Truck, ShieldCheck, CheckCircle2, Circle, Download, Trash2, FileDown, LayoutGrid, UserPlus } from 'lucide-react'
import { apiService } from '../services/api'
import { buscaComCoringa } from '../utils/buscaTexto'
import { passaEscopoComissao, departamentoSoVisualizacao } from '../utils/permissoesComissao'
import { useAuth } from '../context/AuthContext'

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

const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtBRL = (v) => v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (v) => v ? String(v).split('-').reverse().join('/') : ''
const fmtPct = (v) => v == null ? '-' : `${parseFloat(v).toFixed(2)}%`
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
  PROCESSADO: { label: 'Processado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}
const STATUS_CHIPS = [
  { value: '', label: 'Todos' },
  { value: 'RASCUNHO', label: 'Aguardando Gerente' },
  { value: 'CONFERIDO', label: 'Aguardando DP' },
  { value: 'CONFERIDO_DP', label: 'Aguardando Processamento' },
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

// Um card por lote (Empresa + Departamento + Período) — clicar expande e mostra os funcionários
// dele. Os botões de ação (Confirmar Conferência / Processar / Autorizar Reprocessamento) já
// sabem exatamente qual lote é o seu, direto pelo card — sem precisar resolver "qual lote está
// selecionado/visível" como antes.
function LoteCard({ grupo, expandido, onToggleExpand, selecionados, onToggleSelecionado, onToggleSelecionarTodos, podeProcessar, podeConfirmarConferenciaDp, podeExcluirLote, processandoAcao, onConfirmarConferencia, onProcessar, onAutorizarReprocessamento, onExcluir, onVisualizar, onToggleConferidoDp, onBaixarNovamente, onSalvarPdf, onBaixarSelecionados, onSalvarPdfSelecionados, onIncluirFuncionario }) {
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
  const podeMarcarRevisado = (podeConfirmarConferenciaDp || podeProcessar) && !!lote && !grupo.soVisualizacao
  const todosRevisados = grupo.funcionarios.length > 0 && grupo.funcionarios.every(f => lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id))
  const podeBaixarIndividual = podeProcessar && (status === 'CONFERIDO_DP' || status === 'PROCESSADO') && !grupo.soVisualizacao
  // Ações por funcionário (baixar TXT / Salvar PDF individual) só liberam pra quem já foi
  // marcado como revisado E não está aguardando reprocessamento — enquanto isso, só quem já
  // está pronto pode ser baixado/gerado, sem precisar esperar o lote inteiro ficar em dia.
  const funcionarioLiberadoParaAcao = (f) =>
    podeBaixarIndividual &&
    !!lote?.funcionarios_conferidos_dp?.includes(f.funcionario_id) &&
    !lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id)
  // Selecionou alguém (mesmo checkbox usado pra Autorizar Reprocessamento) e todo mundo
  // selecionado já está liberado (revisado + sem reprocessamento pendente) — libera baixar/
  // gerar PDF só desse grupo, sem depender do lote inteiro estar em dia.
  const podeAgirNaSelecao = podeBaixarIndividual && selecionadosDoLote.length > 0 && selecionadosDoLote.every(funcionarioLiberadoParaAcao)
  // Só dá pra excluir enquanto ninguém confirmou nada ainda (Rascunho) ou nem chegou a virar
  // lote (status null, "Sem lote") — igual à regra de Excluir Histórico em Cálculo de Comissões.
  const podeExcluirEsteLote = podeExcluirLote && (!status || status === 'RASCUNHO') && !grupo.soVisualizacao
  const processandoExcluir = processandoAcao === `excluir-${grupo.loteId}`
  const processandoConfirmar = processandoAcao === `confirmar-${grupo.loteId}`
  const processandoProcessar = processandoAcao === `processar-${grupo.loteId}`
  const processandoReprocessar = processandoAcao === `reprocessar-${grupo.loteId}`
  const processandoPdf = processandoAcao === `pdf-${grupo.loteId}`
  const processandoPdfSelecionados = processandoAcao === `pdf-sel-${grupo.loteId}`

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="w-full flex flex-nowrap items-start justify-between gap-3 px-4 py-3">
        <button type="button" onClick={onToggleExpand} className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
          {expandido ? <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-900">{grupo.empresaNome}</span>
              <span className="text-xs text-slate-400">—</span>
              <span className="text-xs font-semibold text-slate-600">{grupo.departamentoNome}</span>
            </div>
            {/* Status sempre na linha de baixo, nunca disputando espaço com Empresa/Departamento
                — antes ficava no mesmo flex-wrap, então às vezes colava do lado (nome curto) e
                às vezes quebrava linha (nome longo), inconsistente entre os cards. */}
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${statusInfo.className}`}>{statusInfo.label}</span>
              {grupo.soVisualizacao && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 bg-slate-100 text-slate-500 border-slate-200" title="Este departamento está liberado só pra visualização (Grupos de Acesso) — sem botões de ação.">
                  Somente Visualização
                </span>
              )}
              {grupo.responsavelNomes.length > 0 && (
                <span className="text-[11px] text-slate-400">Responsável: <strong className="text-slate-500 font-semibold">{grupo.responsavelNomes.join(', ')}</strong></span>
              )}
            </div>
            {podeConfirmarConferenciaDp && status === 'CONFERIDO' && (
              <div className="text-[11px] text-slate-400 mt-0.5">
                <strong className={todosRevisados ? 'text-emerald-600' : 'text-amber-600'}>
                  {(lote?.funcionarios_conferidos_dp || []).filter(id => grupo.funcionarios.some(f => f.funcionario_id === id)).length}/{grupo.funcionarios.length} revisados
                </strong>
              </div>
            )}
            {(lote?.conferido_por || lote?.conferido_dp_por || lote?.processado_por) && (
              <div className="text-[11px] text-slate-400 mt-3 whitespace-nowrap">
                {lote?.conferido_por && <>Conferido por <strong className="text-slate-500">{lote.conferido_por}</strong></>}
                {lote?.conferido_dp_por && <>{lote?.conferido_por && <> · </>}DP: <strong className="text-slate-500">{lote.conferido_dp_por}</strong></>}
                {lote?.processado_por && <>{(lote?.conferido_por || lote?.conferido_dp_por) && <> · </>}Processado por <strong className="text-slate-500">{lote.processado_por}</strong></>}
              </div>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {/* Nas etapas Aguardando Processamento/Processado, o Salvar PDF já mora dentro do
              menu "Pagamento Processado" — só aparece solto aqui antes disso (Rascunho/
              Aguardando DP), onde aquele botão ainda não existe. */}
          {(podeProcessar || podeConfirmarConferenciaDp) && grupo.funcionarios.length > 0 && status !== 'CONFERIDO_DP' && status !== 'PROCESSADO' && (
            <button
              onClick={() => onSalvarPdf(grupo)}
              disabled={processandoPdf || !todosRevisados || grupo.soVisualizacao}
              title={grupo.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : !todosRevisados ? 'Marque todos os funcionários como revisados (expanda o lote) pra liberar — ou baixe individualmente quem já estiver pronto' : 'Baixa um PDF com o detalhamento deste lote (Empresa/Departamento/Cargo/Funcionário)'}
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              {processandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Salvar PDF
            </button>
          )}
          {podeConfirmarConferenciaDp && status === 'CONFERIDO' && (
            <button
              onClick={() => onConfirmarConferencia(lote)}
              disabled={processandoConfirmar || !todosRevisados || grupo.soVisualizacao}
              title={grupo.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : !todosRevisados ? 'Marque todos os funcionários como revisados (expanda o lote) pra liberar' : ''}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
            >
              {processandoConfirmar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Conferido DP
            </button>
          )}
          {podeProcessar && (status === 'CONFERIDO_DP' || status === 'PROCESSADO') && (
            <DropdownAcao
              label={status === 'CONFERIDO_DP' ? 'Processar Comissões' : 'Pagamento Processado'}
              icon={processandoProcessar ? Loader2 : Truck}
              carregando={processandoProcessar}
              disabled={processandoProcessar || !todosRevisados || grupo.soVisualizacao}
              title={grupo.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : !todosRevisados ? 'Tem funcionário pendente de revisão ou aguardando reprocessamento — resolva ou baixe individualmente quem já estiver pronto' : status === 'CONFERIDO_DP' ? 'Processa o pagamento e libera Salvar em TXT/PDF' : 'Pagamento já processado — baixar de novo'}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              onAntesDeAbrir={status === 'CONFERIDO_DP' ? async () => (await onProcessar(lote)) ? 'open' : false : undefined}
              opcoes={[
                { icon: Download, label: 'Salvar em TXT', onClick: () => onBaixarNovamente(lote) },
                { icon: FileDown, label: 'Salvar em PDF', onClick: () => onSalvarPdf(grupo) },
              ]}
            />
          )}
          {podeAgirNaSelecao && (
            <DropdownAcao
              label={`Baixar Selecionados (${selecionadosDoLote.length})`}
              icon={processandoPdfSelecionados ? Loader2 : Download}
              carregando={processandoPdfSelecionados}
              disabled={processandoPdfSelecionados}
              title="Baixar TXT ou gerar PDF só dos funcionários marcados no checkbox"
              className="border border-slate-300 text-slate-700 hover:bg-slate-100"
              opcoes={[
                { icon: Download, label: 'Salvar em TXT', onClick: () => onBaixarSelecionados(grupo) },
                { icon: FileDown, label: 'Salvar em PDF', onClick: () => onSalvarPdfSelecionados(grupo) },
              ]}
            />
          )}
          {podeProcessar && !!status && status !== 'RASCUNHO' && (
            <button
              onClick={() => onIncluirFuncionario(grupo)}
              disabled={grupo.soVisualizacao}
              title={grupo.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : 'Inclui um funcionário que faltou no lote (novo, transferido pro departamento, ou esquecido), sem reabrir o lote inteiro'}
              className="flex items-center gap-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" /> Incluir Funcionário
            </button>
          )}
          {podeProcessar && !!status && status !== 'RASCUNHO' && (
            <button
              onClick={() => onAutorizarReprocessamento(grupo)}
              disabled={processandoReprocessar || selecionadosDoLote.length === 0 || grupo.soVisualizacao}
              title={grupo.soVisualizacao ? 'Este departamento está liberado só pra visualização — peça pra alguém com edição fazer isso.' : selecionadosDoLote.length === 0 ? 'Selecione ao menos 1 funcionário (na lista expandida) pra reprocessar' : ''}
              className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              {processandoReprocessar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              {selecionadosDoLote.length === 0 ? 'Autorizar Reprocessamento' : todosSelecionados ? 'Reprocessar (Lote Inteiro)' : `Reprocessar (${selecionadosDoLote.length})`}
            </button>
          )}
          {podeExcluirEsteLote && (
            <button
              onClick={() => onExcluir(grupo)}
              disabled={processandoExcluir}
              title="Apaga os valores calculados e reabre o período pra recalcular do zero"
              className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
            >
              {processandoExcluir ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Excluir
            </button>
          )}
        </div>
      </div>
      {expandido && (
        <div className="border-t border-slate-100 overflow-x-auto">
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
                <th className="p-3">Calculado em</th>
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
                    {lote?.funcionarios_liberados_reprocessamento?.includes(f.funcionario_id) ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap bg-amber-100 text-amber-700 border-amber-200">
                        Aguardando Reprocessamento
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{f.funcionarioNome}</td>
                  <td className="p-3 whitespace-nowrap">
                    {f.cargoCodigo && <span className="font-mono text-[10px] text-slate-400 mr-1">{f.cargoCodigo}</span>}
                    {f.cargoNome}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtBRL(f.valorComissaoTotal)}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{new Date(f.calculadoEmMax).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function HistoricoComissoes() {
  const { user, hasAction, comissaoEscopoEfetivo, comissaoNivelDepartamentoEfetivo } = useAuth()
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
  // Linhas (registro.id) com o detalhamento de Plano DMS (categoria/prazo/quantidade) expandido,
  // dentro do modal "Detalhe do Cálculo" — fica fechado por padrão, só o total aparece na linha.
  const [planoDmsExpandido, setPlanoDmsExpandido] = useState(new Set())
  const togglePlanoDmsExpandido = (registroId) => setPlanoDmsExpandido(prev => {
    const novo = new Set(prev)
    novo.has(registroId) ? novo.delete(registroId) : novo.add(registroId)
    return novo
  })
  // Modal "Incluir Funcionário" — grupo (lote) sendo editado, texto de busca e seleção.
  const [incluirFuncionarioGrupo, setIncluirFuncionarioGrupo] = useState(null)
  const [incluirFuncionarioBusca, setIncluirFuncionarioBusca] = useState('')
  const [incluirFuncionarioSelecionados, setIncluirFuncionarioSelecionados] = useState(new Set())
  const [incluindoFuncionario, setIncluindoFuncionario] = useState(false)
  const [lotesMap, setLotesMap] = useState({})
  const [selecionados, setSelecionados] = useState(new Set())
  const [lotesExpandidos, setLotesExpandidos] = useState(new Set())
  const [filtroStatusLote, setFiltroStatusLote] = useState('')
  const [processandoAcao, setProcessandoAcao] = useState(null)

  const [filtroFuncionario, setFiltroFuncionario] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroDepartamento, setFiltroDepartamento] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [filtroArea, setFiltroArea] = useState('')
  const [filtroCargo, setFiltroCargo] = useState('')
  const [filtroAgrupamentoCargo, setFiltroAgrupamentoCargo] = useState('')
  const [filtroComissoes, setFiltroComissoes] = useState([])
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  useEffect(() => {
    (async () => {
      setCarregandoBase(true)
      setErro(null)
      try {
        const [funcionarios, empresas, cargos, departamentos, setores, politicas, ferias] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getSetores(),
          apiService.getPoliticaComissao(),
          apiService.getFerias(),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, setores, politicas, ferias })
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoBase(false)
      }
    })()
  }, [])

  // Departamentos marcados como "Responsável" em Grupos de Acesso — { [departamento_id]: [nomes] }.
  const [responsaveisPorDepartamento, setResponsaveisPorDepartamento] = useState({})
  useEffect(() => {
    apiService.getResponsaveisComissaoDepartamentos().then(setResponsaveisPorDepartamento).catch(() => setResponsaveisPorDepartamento({}))
  }, [])

  // Painel "Visão Geral" — todas as Empresas/Departamentos do período (calculado ou não), com
  // Responsável e sinalizador de conferido/pendente, independente do que já está carregado
  // pelos filtros da tela (que só trazem o que já foi calculado).
  const [painelAberto, setPainelAberto] = useState(false)
  const [painelLotes, setPainelLotes] = useState([])
  const [carregandoPainel, setCarregandoPainel] = useState(false)
  const [painelFiltroStatus, setPainelFiltroStatus] = useState('') // '' | 'pendente' | 'conferido'

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
    }
  }, [dados])

  // Opções dos filtros vêm dos cadastros completos (não dependem de já ter buscado um período),
  // pra dar pra pré-filtrar antes de clicar em Visualizar.
  const empresasUnicas = useMemo(() => juntaUnicos((dados?.empresas || []).map(e => e.empresa_fantasia || e.nome_empresa)), [dados])
  const departamentosUnicos = useMemo(() => juntaUnicos((dados?.departamentos || []).map(d => d.nome_departamento)), [dados])
  const setoresUnicas = useMemo(() => juntaUnicos((dados?.setores || []).map(s => s.nome_setor)), [dados])
  const areasUnicas = useMemo(() => juntaUnicos((dados?.departamentos || []).map(d => d.area)), [dados])
  const cargosUnicos = useMemo(() => juntaUnicos((dados?.cargos || []).map(c => c.nome_cargo)), [dados])
  const agrupamentosCargoUnicos = useMemo(() => juntaUnicos((dados?.cargos || []).map(c => c.nome_agrupamento_cargo)), [dados])
  const comissoesUnicas = useMemo(() => juntaUnicos((dados?.politicas || []).map(p => p.descricao_comissao)), [dados])

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

  const handleAbrirPainel = async () => {
    setPainelAberto(true)
    setPainelFiltroStatus('')
    setCarregandoPainel(true)
    try {
      const lotes = await apiService.getLotesPorPeriodo(periodoInicio, periodoFim)
      setPainelLotes(lotes)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCarregandoPainel(false)
    }
  }

  // Combos Empresa × Departamento (todo departamento vinculado à empresa em dim_departamentos.
  // empresa_ids, com pelo menos 1 funcionário ativo nele) pro painel "Visão Geral" — mostra
  // mesmo quem nunca teve cálculo salvo neste período (não tem lote = Pendente), e respeita o
  // escopo de acesso do usuário (mesmo critério de Cálculo de Comissões).
  const painelCombos = useMemo(() => {
    if (!dados) return []
    const { funcionarios, empresas, departamentos } = dados
    const empresasMap = Object.fromEntries(empresas.map(e => [e.id, e]))
    const departamentosMap = Object.fromEntries(departamentos.map(d => [d.id, d]))
    const SITUACAO_FERIAS = '9'
    const funcionariosAtivos = funcionarios.filter(f => {
      if (f.data_demissao) return false
      return !f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === SITUACAO_FERIAS
    })
    // Combos (Empresa, Departamento) direto de quem está alocado — mais confiável que
    // dim_departamentos.empresa_ids, que pode estar desatualizado (o departamento existe pra
    // uma empresa na prática, mas o cadastro do departamento não lista essa empresa no array).
    const combosMap = new Map()
    for (const f of funcionariosAtivos) {
      const empresa = empresasMap[f.empresa_id]
      if (!empresa || empresa.ativo === false || empresa.agrupamento_nome !== 'Caiobá Trucks') continue
      for (const depId of f.departamento_ids || []) {
        const depto = departamentosMap[depId]
        if (!depto || depto.ativo === false || depto.area !== 'Pós-Vendas') continue
        combosMap.set(`${empresa.id}|${depId}`, { empresa, depto })
      }
    }
    const combos = []
    for (const { empresa, depto } of combosMap.values()) {
      // Visão é por Departamento, sem um cargo específico pra checar — um grupo restrito por
      // Agrupamento de Cargos (Individual) não vê nada aqui (fail-closed, mesma lógica de
      // passaEscopoComissao: sem cargo não dá pra provar que pertence ao liberado).
      if (!passaEscopoComissao({
        empresaId: empresa.id,
        areaNomes: depto.area ? [depto.area] : [],
        departamentoIds: [depto.id],
        setorIds: [],
        agrupamentoCargoId: null,
      }, comissaoEscopoEfetivo)) continue
      const lote = painelLotes.find(l => l.empresa_id === empresa.id && l.departamento_id === depto.id)
      combos.push({
        chave: `${empresa.id}|${depto.id}`,
        empresaNome: empresa.empresa_fantasia || empresa.nome_empresa,
        departamentoNome: depto.nome_departamento,
        responsavelNomes: responsaveisPorDepartamento[depto.id]?.[empresa.id] || [],
        conferido: !!lote && lote.status !== 'RASCUNHO',
        statusLabel: !lote ? 'Nunca calculado' : STATUS_LOTE_INFO[lote.status]?.label || lote.status,
      })
    }
    return combos.sort((a, b) => (a.empresaNome + a.departamentoNome).localeCompare(b.empresaNome + b.departamentoNome, 'pt-BR'))
  }, [dados, painelLotes, responsaveisPorDepartamento, comissaoEscopoEfetivo])

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

  const resultadosFiltrados = useMemo(() => resultados.filter(r => {
    if (filtroFuncionario && !buscaComCoringa(r.funcionarioNome, filtroFuncionario)) return false
    if (filtroEmpresa && r.empresaNome !== filtroEmpresa) return false
    if (filtroDepartamento && !r.departamentoNomes.includes(filtroDepartamento)) return false
    if (filtroSetor && !r.setorNomes.includes(filtroSetor)) return false
    if (filtroArea && !r.areaNomes.includes(filtroArea)) return false
    if (filtroCargo && r.cargoNome !== filtroCargo) return false
    if (filtroAgrupamentoCargo && r.agrupamentoCargoNome !== filtroAgrupamentoCargo) return false
    if (filtroComissoes.length > 0 && !filtroComissoes.includes(r.comissaoDescricao)) return false
    return true
  }), [resultados, filtroFuncionario, filtroEmpresa, filtroDepartamento, filtroSetor, filtroArea, filtroCargo, filtroAgrupamentoCargo, filtroComissoes])

  const temFiltroAtivo = !!(filtroFuncionario || filtroEmpresa || filtroDepartamento || filtroSetor || filtroArea || filtroCargo || filtroAgrupamentoCargo || filtroComissoes.length > 0)
  const limparFiltros = () => { setFiltroFuncionario(''); setFiltroEmpresa(''); setFiltroDepartamento(''); setFiltroSetor(''); setFiltroArea(''); setFiltroCargo(''); setFiltroAgrupamentoCargo(''); setFiltroComissoes([]) }

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
    return [...porLote.values()].map(g => {
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
      const valorTotalLote = funcionarios.reduce((s, f) => s + f.valorComissaoTotal, 0)
      // Nome de Empresa/Departamento salvo no lote é um retrato do momento em que ele foi criado
      // — se o cadastro for renomeado depois (ex: Departamentos), o lote antigo continuaria com o
      // nome velho. Resolve pelo id (cadastro atual) primeiro, e só cai pro nome salvo no lote
      // como fallback (lote legado sem id, ou cadastro excluído desde então).
      const empresaCadastro = g.lote?.empresa_id ? mapas?.empresasMap[g.lote.empresa_id] : null
      const departamentoCadastro = g.lote?.departamento_id ? mapas?.departamentosMap[g.lote.departamento_id] : null
      return {
        loteId: g.loteId,
        lote: g.lote,
        status: g.lote?.status || null,
        empresaNome: (empresaCadastro?.empresa_fantasia || empresaCadastro?.nome_empresa) || g.lote?.empresa_nome || funcionarios[0]?.empresaNome || 'Empresa',
        departamentoNome: departamentoCadastro?.nome_departamento || g.lote?.departamento_nome || 'Sem departamento',
        // Nível de acesso extra por Departamento (Grupos de Acesso) — "Visualizar" desliga os
        // botões de ação deste lote, mesmo com a Ação marcada pro grupo (soma-se às Ações).
        soVisualizacao: departamentoSoVisualizacao(g.lote?.departamento_id, comissaoNivelDepartamentoEfetivo),
        responsavelNomes: (g.lote?.departamento_id && g.lote?.empresa_id && responsaveisPorDepartamento[g.lote.departamento_id]?.[g.lote.empresa_id]) || [],
        funcionarios,
        qtdFuncionarios: funcionarios.length,
        valorTotalLote,
      }
    }).sort((a, b) => (a.empresaNome + a.departamentoNome).localeCompare(b.empresaNome + b.departamentoNome, 'pt-BR'))
  }, [resultadosFiltrados, lotesMap, mapas, comissaoNivelDepartamentoEfetivo, responsaveisPorDepartamento])

  const lotesVisiveis = useMemo(() => (
    filtroStatusLote ? lotesAgrupados.filter(l => l.status === filtroStatusLote) : lotesAgrupados
  ), [lotesAgrupados, filtroStatusLote])

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
    if (!window.confirm(`Confirmar a conferência do DP pro lote de ${lote.empresa_nome || 'este período'} — ${lote.departamento_nome || ''}? Depois disso ele fica liberado pro RH/Seletiva processar o pagamento.`)) return
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
    const selecionadosDoLote = grupo.funcionarios.filter(f => selecionados.has(f.funcionario_id))
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

  // "Incluir Funcionário" — inclui no lote (via a mesma liberação de reprocessamento) quem
  // faltou completamente: nunca teve linha calculada nesse lote (contratado depois, transferido
  // pro departamento depois do fechamento, ou esquecido). O picker lista os ativos do
  // empresa+departamento do lote que ainda NÃO estão nele — a elegibilidade de política de
  // verdade continua sendo checada normalmente quando o gerente calcular em Cálculo de
  // Comissões (aqui é só "quem pode entrar na fila", não "quem realmente tem comissão").
  const abrirIncluirFuncionario = (grupo) => {
    setIncluirFuncionarioGrupo(grupo)
    setIncluirFuncionarioBusca('')
    setIncluirFuncionarioSelecionados(new Set())
  }
  const toggleIncluirFuncionarioSelecionado = (id) => {
    setIncluirFuncionarioSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }
  const candidatosParaIncluir = useMemo(() => {
    if (!incluirFuncionarioGrupo || !dados) return []
    const lote = incluirFuncionarioGrupo.lote
    if (!lote?.empresa_id || !lote?.departamento_id) return []
    const jaNoLote = new Set(incluirFuncionarioGrupo.funcionarios.map(f => f.funcionario_id))
    const SITUACAO_FERIAS = '9'
    return dados.funcionarios
      .filter(f => {
        if (jaNoLote.has(f.id)) return false
        if (f.data_demissao) return false
        if (f.empresa_id !== lote.empresa_id) return false
        if (!(f.departamento_ids || []).includes(lote.departamento_id)) return false
        if (!(!f.situacao_funcionario || f.situacao_funcionario === '1' || f.situacao_funcionario === SITUACAO_FERIAS)) return false
        if (incluirFuncionarioBusca && !buscaComCoringa(f.nome_funcionario, incluirFuncionarioBusca)) return false
        return true
      })
      .map(f => ({ id: f.id, nome: f.nome_funcionario, codigo: f.codigo_funcionario, cargoNome: dados.cargos.find(c => c.id === f.cargo_id)?.nome_cargo || null }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [incluirFuncionarioGrupo, dados, incluirFuncionarioBusca])
  const handleConfirmarIncluirFuncionario = async () => {
    const lote = incluirFuncionarioGrupo?.lote
    if (!lote || incluirFuncionarioSelecionados.size === 0) return
    setIncluindoFuncionario(true)
    setErro(null)
    try {
      await apiService.liberarReprocessamentoLote(lote.id, [...incluirFuncionarioSelecionados], usuarioLabel)
      await handleVisualizar()
      setIncluirFuncionarioGrupo(null)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setIncluindoFuncionario(false)
    }
  }

  // Apaga os valores calculados (e o lote, se existir) do grupo — reabre o período pra
  // Cálculo de Comissões poder recalcular do zero. Mesma regra de segurança de lá: com lote,
  // exclui só as linhas DESSE lote (via lote_id); sem lote ("Sem lote" — valor calculado mas
  // nunca virou lote), exclui pelos funcionário(s) do grupo no período.
  const handleExcluirLote = async (grupo) => {
    if (!window.confirm(`Excluir o lote de ${grupo.empresaNome} — ${grupo.departamentoNome} (${mesLabel}/${ano})? Os valores calculados serão apagados e o período volta a poder ser calculado do zero. Essa ação não pode ser desfeita.`)) return
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
  const montarTxtPagamento = (loteId, funcionarioIds = null) => {
    const registros = resultados.filter(r => r.lote_id === loteId && (!funcionarioIds || funcionarioIds.includes(r.funcionario_id)))
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

  const baixarTxtPagamento = (lote, funcionarioIds = null, sufixoArquivo = null) => {
    const { conteudo, totalLancamentos, problemas } = montarTxtPagamento(lote.id, funcionarioIds)
    if (totalLancamentos > 0) {
      const paraNomeArquivo = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      const nomeArquivo = ['Lancamentos', periodoInicio, periodoFim, lote.empresa_nome, lote.departamento_nome, sufixoArquivo]
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

  // Só muda o status pra Processado — não baixa nada sozinho. Quem chama (o botão "Pagamento
  // Processado" do card) abre o menu de Salvar em TXT/PDF logo em seguida, só quando retorna
  // true (confirmado e sem erro).
  const handleProcessarPagamento = async (lote) => {
    if (!lote || lote.status !== 'CONFERIDO_DP') return false
    if (!window.confirm(`Processar p/ pagamento o lote de ${lote.empresa_nome || 'este período'} — ${lote.departamento_nome || ''}?`)) return false
    setProcessandoAcao(`processar-${lote.id}`)
    setErro(null)
    try {
      await apiService.processarLote(lote.id, usuarioLabel)
      await handleVisualizar()
      return true
    } catch (err) {
      setErro(err.message || String(err))
      return false
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Baixa o TXT do lote — usado tanto na primeira vez (logo depois de processar) quanto pra
  // baixar de novo depois (ex: o arquivo se perdeu ou precisa reenviar pro banco).
  const handleBaixarNovamente = (lote) => {
    if (!lote) return
    baixarTxtPagamento(lote)
  }

  // Baixa/gera PDF só dos funcionários marcados no checkbox (mesma seleção usada pra Autorizar
  // Reprocessamento) — pensado pra quando parte do lote já está pronta (revisada) mas não todo
  // mundo, sem precisar clicar um por um nos ícones individuais.
  const handleBaixarSelecionados = (grupo) => {
    const selecionadosDoLote = grupo.funcionarios.filter(f => selecionados.has(f.funcionario_id))
    if (!grupo.lote || selecionadosDoLote.length === 0) return
    baixarTxtPagamento(grupo.lote, selecionadosDoLote.map(f => f.funcionario_id), 'selecionados')
  }
  const handleSalvarPdfSelecionados = (grupo) => {
    const selecionadosDoLote = grupo.funcionarios.filter(f => selecionados.has(f.funcionario_id))
    if (selecionadosDoLote.length === 0) return
    gerarESalvarPdf(grupo, selecionadosDoLote, `pdf-sel-${grupo.loteId}`, 'selecionados')
  }

  // Mesmo relatório do "Salvar PDF" de Cálculo de Comissões, mas escopado a UM lote já salvo
  // (um lote = uma Empresa + um Departamento, então não precisa da lógica de agrupar vários
  // departamentos/empresas que aquele botão tem). Não muda status nem depende dele.
  // Gera o PDF pro conjunto de funcionários informado — usado tanto pro lote inteiro (Salvar
  // PDF do card) quanto pra um funcionário só (botão individual, escape hatch pra quem não
  // pode esperar o lote inteiro ficar revisado, ex: alguém precisou de reprocessamento).
  const gerarESalvarPdf = async (grupo, funcionariosParaPdf, chaveProcessando, sufixoArquivo) => {
    if (funcionariosParaPdf.length === 0) return
    setProcessandoAcao(chaveProcessando)
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
      const periodoLabel = `${periodoInicio.split('-').reverse().join('/')} a ${periodoFim.split('-').reverse().join('/')}`

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

      const montarHtmlCabecalho = (continuacao) => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px 20px 0 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:#0f172a;">Processamento de Comissões</div>
              <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:2px;">${grupo.empresaNome}</div>
            </div>
            <div style="text-align:right;font-size:13px;color:#475569;">
              <div>Período: ${periodoLabel}</div>
              <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div style="font-size:14px;font-weight:700;color:#334155;margin-bottom:8px;">${grupo.departamentoNome}${continuacao ? ' <span style="font-weight:400;font-style:italic;color:#94a3b8;">(continuação)</span>' : ''}</div>
        </div>`

      // Um lote já é uma Empresa+Departamento só — só falta agrupar os funcionários por Cargo
      // (mesmo recorte visual do PDF de Cálculo de Comissões).
      const porCargo = new Map()
      for (const f of funcionariosParaPdf) {
        const chave = f.cargoNome || '-'
        if (!porCargo.has(chave)) porCargo.set(chave, { nomeCargo: chave, codigoCargo: f.cargoCodigo, funcionarios: [] })
        porCargo.get(chave).funcionarios.push(f)
      }
      const gruposCargo = [...porCargo.values()].sort((a, b) => a.nomeCargo.localeCompare(b.nomeCargo, 'pt-BR'))

      const montarHtmlBlocoCargo = (grupoCargo) => {
        const linhasFunc = grupoCargo.funcionarios.map(f => {
          const linhas = f.registros.map((r, i) => {
            const nomeComCodigo = r.func?.codigo_funcionario ? `${r.func.codigo_funcionario} — ${f.funcionarioNome}` : f.funcionarioNome
            const ehPlanoDmsPdf = r.politica?.tipo_calculo === 'PLANO_DMS'
            // Detalhamento por empresa (Nível EMPRESA + "detalhar por empresa" marcado na
            // Política) — mesmo bloco que já existe no PDF de Cálculo de Comissões, pra
            // auditar de onde veio o total quando a comissão soma mais de uma empresa.
            const detalheEmpresasHtml = !ehPlanoDmsPdf && Array.isArray(r.detalhe_empresas) && r.detalhe_empresas.length > 0
              ? r.detalhe_empresas.map(d => `
                  <div style="font-size:10px;font-weight:400;color:#94a3b8;margin-top:2px;">
                    ${d.empresa}: Base <span style="color:#64748b;">${fmtValorBase(r.politica?.base_calculo, d.valorBase)}</span>
                    <span style="color:#cbd5e1;"> &rarr; </span>
                    Comissão <span style="color:#059669;font-weight:600;">${fmtBRL(d.valorComissao)}</span>
                  </div>`).join('')
              // Detalhamento por categoria+prazo de Comissão Plano DMS (fica sempre visível
              // no PDF, sem botão — o clique-pra-expandir só existe na tela).
              : (ehPlanoDmsPdf && Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas.filter(d => d.tipo === 'plano_dms').map(d => `
                  <div style="font-size:10px;font-weight:400;color:#94a3b8;margin-top:2px;">
                    ${d.categoria} / ${d.tempoMeses} meses: <span style="color:#64748b;">${d.quantidade} × ${fmtBRL(d.valorUnitario)}</span>
                    <span style="color:#cbd5e1;"> &rarr; </span>
                    <span style="color:#059669;font-weight:600;">${fmtBRL(d.subtotal)}</span>
                  </div>`).join('') : '')
            return `
              <tr>
                <td style="padding:6px 8px;font-weight:700;border-bottom:1px solid #e2e8f0;white-space:nowrap;">${i === 0 ? nomeComCodigo : ''}</td>
                <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;">${r.comissaoDescricao || '-'}${tipoComissaoPorBase(r.politica?.base_calculo) ? ` <span style="font-style:italic;color:#94a3b8;">(${tipoComissaoPorBase(r.politica?.base_calculo)})</span>` : ''}${detalheEmpresasHtml}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${ehPlanoDmsPdf ? `${r.valor_base ?? 0} O.S.` : fmtValorBase(r.politica?.base_calculo, r.valor_base)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(r.politica?.comissao_servicos)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(r.politica?.comissao_pecas)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtPct(r.politica?.comissao_total)}</td>
                <td style="padding:6px 8px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmtBRL(r.politica?.comissao_valor != null ? parseFloat(r.politica.comissao_valor) : null)}</td>
                <td style="padding:6px 8px;text-align:right;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">${fmtBRL(r.valor_comissao)}</td>
              </tr>`
          }).join('')
          const subtotal = f.registros.length > 1 ? `
            <tr style="background:#ecfdf5;">
              <td colspan="7" style="padding:5px 8px;text-align:right;font-weight:700;color:#334155;">Total ${f.funcionarioNome}</td>
              <td style="padding:5px 8px;text-align:right;font-weight:700;color:#047857;">${fmtBRL(f.valorComissaoTotal)}</td>
            </tr>` : ''
          return linhas + subtotal
        }).join('')
        const nomeCargoComCodigo = grupoCargo.codigoCargo ? `${grupoCargo.nomeCargo} (${grupoCargo.codigoCargo})` : grupoCargo.nomeCargo
        return `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px;width:${WRAP_W}px;box-sizing:border-box;">
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              ${THEAD_HTML}
              <tbody>
                <tr><td colspan="8" style="padding:5px 8px;background:#f1f5f9;font-weight:700;font-size:12px;text-transform:uppercase;color:#334155;">${nomeCargoComCodigo}</td></tr>
                ${linhasFunc}
              </tbody>
            </table>
          </div>`
      }

      const montarHtmlRodape = (total) => `
        <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:0 20px 20px 20px;width:${WRAP_W}px;box-sizing:border-box;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <tfoot>
              <tr style="border-top:2px solid #1e293b;">
                <td colspan="7" style="padding:10px 8px;text-align:right;font-weight:800;color:#0f172a;">Total ${grupo.departamentoNome}</td>
                <td style="padding:10px 8px;text-align:right;font-weight:800;color:#047857;">${fmtBRL(total)}</td>
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

      const GAP = 6
      const pageBottom = pdf.internal.pageSize.getHeight() - MARGIN
      let primeiraPagina = true
      const iniciarPagina = () => {
        if (!primeiraPagina) pdf.addPage()
        primeiraPagina = false
        return MARGIN
      }
      const colocarCanvas = (canvas, y) => {
        const h = (canvas.height / canvas.width) * CW
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', MARGIN, y, CW, h)
        return h
      }

      let y = iniciarPagina()
      y += colocarCanvas(await renderBloco(montarHtmlCabecalho(false)), y) + GAP

      for (const grupoCargo of gruposCargo) {
        const cargoCanvas = await renderBloco(montarHtmlBlocoCargo(grupoCargo))
        const cargoH = (cargoCanvas.height / cargoCanvas.width) * CW
        if (y + cargoH > pageBottom) {
          y = iniciarPagina()
          y += colocarCanvas(await renderBloco(montarHtmlCabecalho(true)), y) + GAP
        }
        y += colocarCanvas(cargoCanvas, y) + GAP
      }

      const totalPdf = funcionariosParaPdf.reduce((s, f) => s + f.valorComissaoTotal, 0)
      const footerCanvas = await renderBloco(montarHtmlRodape(totalPdf))
      const footerH = (footerCanvas.height / footerCanvas.width) * CW
      if (y + footerH > pageBottom) y = iniciarPagina()
      colocarCanvas(footerCanvas, y)

      const paraNomeArquivo = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
      const nomeArquivo = ['Comissoes', periodoInicio, periodoFim, grupo.empresaNome, grupo.departamentoNome, sufixoArquivo].filter(Boolean).map(paraNomeArquivo).join('_')
      pdf.save(`${nomeArquivo}.pdf`)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      setErro('Erro ao gerar PDF: ' + (err.message || String(err)))
    } finally {
      setProcessandoAcao(null)
    }
  }

  const handleSalvarPdfLote = (grupo) => gerarESalvarPdf(grupo, grupo.funcionarios, `pdf-${grupo.loteId}`, null)

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
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="h-5 w-5 text-blue-600" />
          Processamento de Comissões
        </h1>
        <p className="text-xs text-slate-500">Escolha o ano/mês e os filtros, depois clique em Visualizar para ver os lotes já calculados.</p>
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
            <div className="grid grid-cols-5 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Ano</label>
                <select value={ano} onChange={e => setAno(e.target.value)} className={`${SEL} w-full`}>
                  {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className={LBL}>Mês</label>
                <div className="flex items-center gap-1">
                  <select value={mes} onChange={e => setMes(e.target.value)} className={`${SEL} w-full`}>
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
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFiltrosAbertos(v => !v)}
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-3 py-2 rounded-md transition-colors"
                >
                  {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Filtros Avançados
                  {temFiltroAtivo && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>}
                </button>
                <button
                  onClick={handleVisualizar}
                  disabled={buscando || !mapas}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors"
                >
                  {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Visualizar
                </button>
              </div>
            </div>
          </div>

          {/* FILTROS AVANÇADOS — retrátil, alternado pelo botão no card de Período acima */}
          {filtrosAbertos && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
              <div className="px-4 pt-4 pb-4 space-y-3">
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Empresa</label>
                    <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todas</option>
                      {empresasUnicas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Área</label>
                    <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todas</option>
                      {areasUnicas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Departamento</label>
                    <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todos</option>
                      {departamentosUnicos.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Setor</label>
                    <select value={filtroSetor} onChange={e => setFiltroSetor(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todos</option>
                      {setoresUnicas.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Agrupamento de Cargos</label>
                    <select value={filtroAgrupamentoCargo} onChange={e => setFiltroAgrupamentoCargo(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todos</option>
                      {agrupamentosCargoUnicos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Cargo</label>
                    <select value={filtroCargo} onChange={e => setFiltroCargo(e.target.value)} className={`${SEL} w-full`}>
                      <option value="">Todos</option>
                      {cargosUnicos.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                  <div className="flex flex-col gap-1">
                    <label className={LBL}>Funcionário</label>
                    <input
                      type="text"
                      value={filtroFuncionario}
                      onChange={e => setFiltroFuncionario(e.target.value)}
                      placeholder="Buscar pelo nome..."
                      className={`${INP} w-full bg-white`}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className={LBL}>Comissão</label>
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
                    <button onClick={limparFiltros} className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors">Limpar filtros</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RESULTADOS — um card por lote (Empresa + Departamento + Período) */}
          {jaBuscou && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-900">Processamento — {mesLabel}/{ano}</span>
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
                  <button
                    type="button"
                    onClick={handleAbrirPainel}
                    title="Todas as lojas e departamentos do período, com Responsável e sinalizador de conferido/pendente"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors ml-auto"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Visão Geral
                  </button>
                </div>
              )}

              {buscando ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
              ) : lotesVisiveis.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 text-xs text-slate-400">Nenhum lote encontrado para este período/filtros.</div>
              ) : (
                lotesVisiveis.map(grupo => (
                  <LoteCard
                    key={grupo.loteId}
                    grupo={grupo}
                    expandido={lotesExpandidos.has(grupo.loteId)}
                    onToggleExpand={() => toggleExpandirLote(grupo.loteId)}
                    selecionados={selecionados}
                    onToggleSelecionado={toggleSelecionado}
                    onToggleSelecionarTodos={() => toggleSelecionarTodosDoLote(grupo)}
                    podeProcessar={podeProcessar}
                    podeConfirmarConferenciaDp={podeConfirmarConferenciaDp}
                    podeExcluirLote={podeExcluirLote}
                    processandoAcao={processandoAcao}
                    onConfirmarConferencia={handleConfirmarConferenciaDp}
                    onProcessar={handleProcessarPagamento}
                    onAutorizarReprocessamento={handleAutorizarReprocessamento}
                    onExcluir={handleExcluirLote}
                    onVisualizar={setDetalheAberto}
                    onToggleConferidoDp={handleToggleConferidoDp}
                    onBaixarNovamente={handleBaixarNovamente}
                    onSalvarPdf={handleSalvarPdfLote}
                    onBaixarSelecionados={handleBaixarSelecionados}
                    onSalvarPdfSelecionados={handleSalvarPdfSelecionados}
                    onIncluirFuncionario={abrirIncluirFuncionario}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* DETALHE DO CÁLCULO — mesma visualização de linha usada na tabela de Cálculo de Comissões */}
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
                  {detalheAberto.registros.map((r, i) => {
                    const ehPlanoDms = r.politica?.tipo_calculo === 'PLANO_DMS'
                    const planoDetalhes = ehPlanoDms && Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas.filter(d => d.tipo === 'plano_dms') : []
                    const empresaDetalhes = !ehPlanoDms && Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas : []
                    return (
                    <React.Fragment key={r.id}>
                    <tr>
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
                        {tipoComissaoPorBase(r.politica?.base_calculo) && (
                          <span className="italic text-slate-400"> ({tipoComissaoPorBase(r.politica?.base_calculo)})</span>
                        )}
                        {(r.politica?.codigo_rubrica || r.politica?.tipo_processo) && (
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {r.politica?.codigo_rubrica && <>Rubrica <span className="font-mono text-slate-500">{r.politica.codigo_rubrica}</span></>}
                            {r.politica?.codigo_rubrica && r.politica?.tipo_processo && <span className="mx-1">·</span>}
                            {r.politica?.tipo_processo && <>Tipo <span className="font-mono text-slate-500">{r.politica.tipo_processo}</span></>}
                          </div>
                        )}
                        {planoDetalhes.length > 0 && (
                          <button
                            type="button"
                            onClick={() => togglePlanoDmsExpandido(r.id)}
                            className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700"
                          >
                            {planoDmsExpandido.has(r.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Ver valores de planos ({planoDetalhes.length})
                          </button>
                        )}
                        {empresaDetalhes.length > 0 && (
                          <div className="mt-1 space-y-0.5">
                            {empresaDetalhes.map(d => (
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
                      <td className="px-3 py-1.5 text-right font-mono">{ehPlanoDms ? `${r.valor_base ?? 0} O.S.` : fmtValorBase(r.politica?.base_calculo, r.valor_base)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_servicos)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_pecas)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtPct(r.politica?.comissao_total)}</td>
                      <td className="px-3 py-1.5 text-right font-mono">{fmtBRL(r.politica?.comissao_valor != null ? parseFloat(r.politica.comissao_valor) : null)}</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-slate-800">{fmtBRL(r.valor_comissao)}</td>
                    </tr>
                    {planoDetalhes.length > 0 && planoDmsExpandido.has(r.id) && (
                      <tr>
                        <td colSpan={9} className="p-0 bg-slate-50/60">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="text-[10px] font-semibold uppercase text-slate-400">
                                <th className="pl-12 py-1.5">Categoria</th>
                                <th className="py-1.5">Prazo</th>
                                <th className="py-1.5 text-right">Qtd.</th>
                                <th className="py-1.5 text-right">Valor Unit.</th>
                                <th className="py-1.5 pr-4 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="text-[11px] text-slate-600">
                              {planoDetalhes.map((d, di) => (
                                <tr key={di}>
                                  <td className="pl-12 py-1">{d.categoria}</td>
                                  <td className="py-1">{d.tempoMeses} meses</td>
                                  <td className="py-1 text-right font-mono">{d.quantidade}</td>
                                  <td className="py-1 text-right font-mono">{fmtBRL(d.valorUnitario)}</td>
                                  <td className="py-1 pr-4 text-right font-mono">{fmtBRL(d.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    )
                  })}
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

      {/* PAINEL "VISÃO GERAL" — todas as Empresas/Departamentos do período, com Responsável e
          sinalizador de conferido (verde) / pendente (vermelho), independente de filtro. */}
      {painelAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setPainelAberto(false)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><LayoutGrid className="h-4 w-4 text-blue-600" /> Visão Geral — {mesLabel}/{ano}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Todas as lojas e departamentos do período, com o responsável e se já foi conferido.</p>
              </div>
              <button onClick={() => setPainelAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            {!carregandoPainel && painelCombos.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 shrink-0">
                {[
                  { value: '', label: 'Todos', qtd: painelCombos.length },
                  { value: 'pendente', label: 'Pendentes', qtd: painelCombos.filter(c => !c.conferido).length },
                  { value: 'conferido', label: 'Conferidos', qtd: painelCombos.filter(c => c.conferido).length },
                ].map(chip => (
                  <button
                    key={chip.value || 'todos'}
                    type="button"
                    onClick={() => setPainelFiltroStatus(chip.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                      painelFiltroStatus === chip.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {chip.label} ({chip.qtd})
                  </button>
                ))}
              </div>
            )}
            <div className="overflow-y-auto">
              {carregandoPainel ? (
                <div className="p-6 text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</div>
              ) : painelCombos.length === 0 ? (
                <p className="p-6 text-xs text-slate-400 text-center">Nenhum departamento com funcionário elegível pra este período, dentro do seu acesso.</p>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                      <th className="px-4 py-2">Empresa</th>
                      <th className="px-4 py-2">Departamento</th>
                      <th className="px-4 py-2">Responsável</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {painelCombos
                      .filter(c => !painelFiltroStatus || (painelFiltroStatus === 'conferido' ? c.conferido : !c.conferido))
                      .map(c => (
                      <tr key={c.chave} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-semibold text-slate-800 whitespace-nowrap">{c.empresaNome}</td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{c.departamentoNome}</td>
                        <td className="px-4 py-2 text-slate-500">{c.responsavelNomes.length > 0 ? c.responsavelNomes.join(', ') : '—'}</td>
                        <td className="px-4 py-2 text-center" title={c.statusLabel}>
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.conferido ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL "INCLUIR FUNCIONÁRIO" — adiciona alguém que faltou num lote já fechado, sem
          precisar reabrir o lote inteiro (mesma liberação de reprocessamento por baixo). */}
      {incluirFuncionarioGrupo && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIncluirFuncionarioGrupo(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg max-h-[80vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-600" /> Incluir Funcionário</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{incluirFuncionarioGrupo.empresaNome} — {incluirFuncionarioGrupo.departamentoNome}</p>
              </div>
              <button onClick={() => setIncluirFuncionarioGrupo(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text" autoFocus placeholder="Buscar por nome..."
                  value={incluirFuncionarioBusca} onChange={e => setIncluirFuncionarioBusca(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {candidatosParaIncluir.length === 0 ? (
                <p className="p-6 text-xs text-slate-400 text-center">Nenhum funcionário ativo desse departamento fora do lote{incluirFuncionarioBusca ? ' pra essa busca' : ''}.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {candidatosParaIncluir.map(f => (
                    <label key={f.id} className="flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-slate-50 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={incluirFuncionarioSelecionados.has(f.id)}
                        onChange={() => toggleIncluirFuncionarioSelecionado(f.id)}
                        className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0"
                      />
                      <span className="font-mono text-slate-400 w-12 shrink-0">{f.codigo || ''}</span>
                      <span className="font-semibold text-slate-800">{f.nome}</span>
                      {f.cargoNome && <span className="text-slate-400">— {f.cargoNome}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-400">
                {incluirFuncionarioSelecionados.size > 0
                  ? `${incluirFuncionarioSelecionados.size} selecionado(s) — depois é só calcular e salvar em Cálculo de Comissões.`
                  : 'Selecione quem faltou no lote.'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => setIncluirFuncionarioGrupo(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button
                  type="button" onClick={handleConfirmarIncluirFuncionario}
                  disabled={incluindoFuncionario || incluirFuncionarioSelecionados.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
                >
                  {incluindoFuncionario && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Incluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
