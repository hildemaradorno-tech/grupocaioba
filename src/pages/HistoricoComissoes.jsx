import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ArrowLeft, Search, Loader2, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Eye, X, RotateCcw, Truck } from 'lucide-react'
import { apiService } from '../services/api'
import { buscaComCoringa } from '../utils/buscaTexto'
import { passaEscopoComissao } from '../utils/permissoesComissao'
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

// Mesma lógica da tela de Cálculo de Comissões: a coluna de valor respeita a natureza da Base
// (bases de horas aparecem como HR, as demais como moeda).
const baseEmHoras = (base) => /hora/.test((base?.nome || '').toLowerCase())
const fmtValorBase = (base, v) => {
  if (v == null) return '-'
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

export default function HistoricoComissoes() {
  const navigate = useNavigate()
  const { user, hasAction, comissaoEscopoEfetivo } = useAuth()
  const podeProcessar = hasAction('calculo-comissoes', 'processar')
  const usuarioLabel = user?.email || 'desconhecido'
  const anoAtual = new Date().getFullYear()
  const ANOS = useMemo(() => Array.from({ length: 6 }, (_, i) => String(anoAtual - i)), [anoAtual])

  const [ano, setAno] = useState(String(anoAtual))
  const [mes, setMes] = useState(String(new Date().getMonth() + 1).padStart(2, '0'))

  const [carregandoBase, setCarregandoBase] = useState(true)
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState(null)

  const [buscando, setBuscando] = useState(false)
  const [jaBuscou, setJaBuscou] = useState(false)
  const [resultados, setResultados] = useState([])
  const [detalheAberto, setDetalheAberto] = useState(null)
  const [lotesMap, setLotesMap] = useState({})
  const [selecionados, setSelecionados] = useState(new Set())
  const [loteSelecionadoId, setLoteSelecionadoId] = useState('')
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
        const [funcionarios, empresas, cargos, departamentos, setores, politicas] = await Promise.all([
          apiService.getFuncionarios(),
          apiService.getEmpresas(),
          apiService.getCargos(),
          apiService.getDepartamentos(),
          apiService.getSetores(),
          apiService.getPoliticaComissao(),
        ])
        setDados({ funcionarios, empresas, cargos, departamentos, setores, politicas })
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoBase(false)
      }
    })()
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
    }
  }, [dados])

  // Opções dos filtros vêm dos cadastros completos (não dependem de já ter buscado um período),
  // pra dar pra pré-filtrar antes de clicar em Visualizar.
  const empresasUnicas = useMemo(() => juntaUnicos((dados?.empresas || []).map(e => e.empresa_fantasia || e.nome_empresa)), [dados])
  const departamentosUnicos = useMemo(() => juntaUnicos((dados?.departamentos || []).map(d => d.nome_departamento)), [dados])
  const setoresUnicos = useMemo(() => juntaUnicos((dados?.setores || []).map(s => s.nome_setor)), [dados])
  const areasUnicas = useMemo(() => juntaUnicos((dados?.departamentos || []).map(d => d.area)), [dados])
  const cargosUnicos = useMemo(() => juntaUnicos((dados?.cargos || []).map(c => c.nome_cargo)), [dados])
  const agrupamentosCargoUnicos = useMemo(() => juntaUnicos((dados?.cargos || []).map(c => c.nome_agrupamento_cargo)), [dados])
  const comissoesUnicas = useMemo(() => juntaUnicos((dados?.politicas || []).map(p => p.descricao_comissao)), [dados])

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
      setLoteSelecionadoId('')
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setBuscando(false)
    }
  }

  // Lotes distintos dos resultados visíveis — usados pra saber o status (Rascunho/Conferido/
  // Processado) e habilitar a seleção/os botões de Autorizar Reprocessamento e Processar.
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
    // Filtro do seletor de lote — independente dos Filtros Avançados de propósito (não usa
    // filtroEmpresa/filtroDepartamento, pra não acender o badge "ativo" nem exigir abrir aquele
    // painel só pra limpar; tem seu próprio X ao lado do seletor).
    if (loteSelecionadoId && r.lote_id !== loteSelecionadoId) return false
    if (filtroFuncionario && !buscaComCoringa(r.funcionarioNome, filtroFuncionario)) return false
    if (filtroEmpresa && r.empresaNome !== filtroEmpresa) return false
    if (filtroDepartamento && !r.departamentoNomes.includes(filtroDepartamento)) return false
    if (filtroSetor && !r.setorNomes.includes(filtroSetor)) return false
    if (filtroArea && !r.areaNomes.includes(filtroArea)) return false
    if (filtroCargo && r.cargoNome !== filtroCargo) return false
    if (filtroAgrupamentoCargo && r.agrupamentoCargoNome !== filtroAgrupamentoCargo) return false
    if (filtroComissoes.length > 0 && !filtroComissoes.includes(r.comissaoDescricao)) return false
    return true
  }), [resultados, loteSelecionadoId, filtroFuncionario, filtroEmpresa, filtroDepartamento, filtroSetor, filtroArea, filtroCargo, filtroAgrupamentoCargo, filtroComissoes])

  const temFiltroAtivo = !!(filtroFuncionario || filtroEmpresa || filtroDepartamento || filtroSetor || filtroArea || filtroCargo || filtroAgrupamentoCargo || filtroComissoes.length > 0)
  const limparFiltros = () => { setFiltroFuncionario(''); setFiltroEmpresa(''); setFiltroDepartamento(''); setFiltroSetor(''); setFiltroArea(''); setFiltroCargo(''); setFiltroAgrupamentoCargo(''); setFiltroComissoes([]) }

  // Uma linha por funcionário — Valor Comissão somado entre as políticas dele; "Visualizar"
  // mostra o detalhamento (Comissão, Base, % etc.) de cada linha que compõe o total.
  const resultadosAgrupados = useMemo(() => {
    const porFuncionario = new Map()
    for (const r of resultadosFiltrados) {
      if (!porFuncionario.has(r.funcionario_id)) porFuncionario.set(r.funcionario_id, [])
      porFuncionario.get(r.funcionario_id).push(r)
    }
    return [...porFuncionario.values()].map(registros => {
      const base = registros[0]
      const valorComissaoTotal = registros.reduce((acc, r) => acc + (r.valor_comissao || 0), 0)
      const calculadoEmMax = registros.reduce((max, r) => (!max || r.calculado_em > max) ? r.calculado_em : max, null)
      return {
        funcionario_id: base.funcionario_id,
        funcionarioNome: base.funcionarioNome,
        empresaNome: base.empresaNome,
        cargoNome: base.cargoNome,
        lote_id: base.lote_id,
        registros,
        valorComissaoTotal,
        calculadoEmMax,
      }
    }).sort((a, b) => a.funcionarioNome.localeCompare(b.funcionarioNome, 'pt-BR'))
  }, [resultadosFiltrados])


  const totalComissao = useMemo(() => resultadosAgrupados.reduce((s, g) => s + g.valorComissaoTotal, 0), [resultadosAgrupados])
  const mesLabel = MESES.find(m => m.v === mes)?.label || mes

  // ── Seleção pra Autorizar Reprocessamento / Processar p/ Pagamento ──────────────────────
  const toggleSelecionado = (funcionarioId) => {
    setSelecionados(prev => {
      const novo = new Set(prev)
      if (novo.has(funcionarioId)) novo.delete(funcionarioId)
      else novo.add(funcionarioId)
      return novo
    })
  }
  // Só entra na seleção quem realmente tem um lote resolvido e fora de Rascunho — sem isso,
  // "selecionar todos" marcava linhas sem lote_id (órfãs) que nunca habilitavam os botões.
  const podeSelecionarLinha = (g) => {
    const loteDoGrupo = g.lote_id ? lotesMap[g.lote_id] : null
    return !!(loteDoGrupo && loteDoGrupo.status !== 'RASCUNHO')
  }
  const gruposSelecionaveis = resultadosAgrupados.filter(podeSelecionarLinha)
  const todosSelecionados = gruposSelecionaveis.length > 0 && gruposSelecionaveis.every(g => selecionados.has(g.funcionario_id))
  const toggleSelecionarTodos = () => {
    setSelecionados(todosSelecionados ? new Set() : new Set(gruposSelecionaveis.map(g => g.funcionario_id)))
  }

  // Base do seletor de lote: os resultados filtrados por TUDO menos o próprio seletor de lote
  // (funcionário/empresa/departamento/etc. dos Filtros Avançados continuam valendo) — assim,
  // depois de escolher um lote (o que filtra a tabela pra mostrar só ele), os outros lotes
  // continuam aparecendo como opção no seletor, em vez de sumirem da lista.
  const resultadosParaSeletorLote = useMemo(() => resultados.filter(r => {
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

  // Atalho pra não precisar marcar funcionário por funcionário: lista os lotes (período+empresa+
  // departamento) distintos presentes nesses resultados — escolher um já seleciona todos os
  // funcionários dele de uma vez, pronto pro Autorizar Reprocessamento (Lote Inteiro).
  const lotesDisponiveisParaSelecao = useMemo(() => {
    const ids = [...new Set(resultadosParaSeletorLote.map(r => r.lote_id).filter(Boolean))]
    return ids
      .map(id => lotesMap[id])
      .filter(lote => lote && lote.status !== 'RASCUNHO')
      .map(lote => ({
        lote,
        label: `${lote.empresa_nome || 'Empresa'} — ${lote.departamento_nome || 'Sem departamento'} — ${fmtData(lote.periodo_inicio)} a ${fmtData(lote.periodo_fim)} (${lote.status === 'PROCESSADO' ? 'Processado' : 'Conferido'})`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
  }, [resultadosParaSeletorLote, lotesMap])
  const selecionarLote = (loteId) => {
    setLoteSelecionadoId(loteId)
    if (!loteId) return
    // A própria mudança de loteSelecionadoId já filtra resultadosFiltrados (ver useMemo acima)
    // pra mostrar só esse lote — não usa filtroEmpresa/filtroDepartamento de propósito, pra não
    // acender o badge "ativo" dos Filtros Avançados nem depender de abrir aquele painel.
    setSelecionados(new Set(resultadosAgrupados.filter(g => g.lote_id === loteId).map(g => g.funcionario_id)))
  }

  const loteIdsSelecionados = useMemo(() => {
    const ids = new Set()
    resultadosAgrupados.forEach(g => { if (selecionados.has(g.funcionario_id) && g.lote_id) ids.add(g.lote_id) })
    return [...ids]
  }, [resultadosAgrupados, selecionados])
  const loteUnicoSelecionado = loteIdsSelecionados.length === 1 ? lotesMap[loteIdsSelecionados[0]] : null
  const funcionariosDoLoteSelecionado = loteUnicoSelecionado
    ? resultadosAgrupados.filter(g => g.lote_id === loteUnicoSelecionado.id)
    : []
  const ehLoteInteiroSelecionado = loteUnicoSelecionado && selecionados.size === funcionariosDoLoteSelecionado.length
  const podeAutorizarReprocessamento = podeProcessar && loteUnicoSelecionado && loteUnicoSelecionado.status !== 'RASCUNHO'

  // "Processar p/ Pagamento" não depende de seleção — é sempre o lote inteiro, igual já
  // funciona em Cálculo de Comissões. Só habilita quando os resultados visíveis são de UM lote só.
  const loteIdsVisiveis = useMemo(() => [...new Set(resultadosAgrupados.map(g => g.lote_id).filter(Boolean))], [resultadosAgrupados])
  const loteUnicoVisivel = loteIdsVisiveis.length === 1 ? lotesMap[loteIdsVisiveis[0]] : null

  const handleAutorizarReprocessamento = async () => {
    if (!loteUnicoSelecionado) return
    setProcessandoAcao('reprocessar')
    setErro(null)
    try {
      if (ehLoteInteiroSelecionado) {
        if (!window.confirm(`Autorizar reprocessamento do LOTE INTEIRO (${loteUnicoSelecionado.empresa_nome || 'este período'} — todos os ${funcionariosDoLoteSelecionado.length} funcionário(s))? O lote volta pra Rascunho e vai precisar ser conferido e processado de novo.`)) return
        await apiService.autorizarReprocessamentoLote(loteUnicoSelecionado.id, usuarioLabel)
      } else {
        if (!window.confirm(`Liberar reprocessamento só de ${selecionados.size} funcionário(s) selecionado(s)? O restante do lote continua ${loteUnicoSelecionado.status === 'PROCESSADO' ? 'Processado' : 'Conferido'}.`)) return
        await apiService.liberarReprocessamentoLote(loteUnicoSelecionado.id, [...selecionados], usuarioLabel)
      }
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  // Monta o TXT no leiaute de "Importação de Arquivo Texto de Lançamentos" (RM/TOTVS) — um
  // bloco de 6 linhas (rótulo + TAB + valor) por lançamento, separado por linha em branco.
  // Sempre a partir de `resultados` (não resultadosFiltrados/Agrupados) pra garantir que o
  // arquivo saia com o LOTE INTEIRO, mesmo que algum filtro secundário esteja escondendo
  // linhas na tela — um TXT de pagamento incompleto por causa de um filtro seria grave.
  const TIPO_PROCESSO_MENSAL = '11'
  const montarTxtPagamento = (loteId) => {
    const registros = resultados.filter(r => r.lote_id === loteId)
    const blocos = []
    let semRubrica = 0
    for (const r of registros) {
      if (!r.politica?.codigo_rubrica) { semRubrica++; continue }
      const [ano, mes] = (r.periodo_inicio || '').split('-')
      const competencia = ano && mes ? `${mes}/${ano}` : ''
      const valor = (r.valor_comissao ?? 0).toFixed(2).replace('.', ',')
      blocos.push([
        `Código do empregado\t${r.func?.codigo_funcionario || ''}`,
        `Competência\t${competencia}`,
        `Código da rubrica\t${r.politica.codigo_rubrica}`,
        `Tipo do processo\t${TIPO_PROCESSO_MENSAL}`,
        `Valor\t${valor}`,
        `Empresa\t${r.empresa?.codigo_empresa ?? ''}`,
      ].join('\n'))
    }
    return { conteudo: blocos.join('\n\n'), totalLancamentos: blocos.length, semRubrica }
  }

  const handleProcessarPagamento = async () => {
    if (!loteUnicoVisivel || loteUnicoVisivel.status !== 'CONFERIDO') return
    if (!window.confirm(`Processar p/ pagamento o lote de ${loteUnicoVisivel.empresa_nome || 'este período'}?`)) return
    setProcessandoAcao('processar')
    setErro(null)
    try {
      await apiService.processarLote(loteUnicoVisivel.id, usuarioLabel)
      const { conteudo, totalLancamentos, semRubrica } = montarTxtPagamento(loteUnicoVisivel.id)
      if (totalLancamentos > 0) {
        const paraNomeArquivo = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
        const nomeArquivo = ['Lancamentos', periodoInicio, periodoFim, loteUnicoVisivel.empresa_nome, loteUnicoVisivel.departamento_nome]
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
      if (semRubrica > 0) {
        window.alert(`${semRubrica} comissão(ões) ficaram de fora do TXT por a Política de Comissão não ter Código da Rubrica cadastrado (Política de Comissão → Código da Rubrica).`)
      }
      await handleVisualizar()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setProcessandoAcao(null)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Histórico de Comissões
          </h1>
          <p className="text-xs text-slate-500">Escolha o ano/mês e os filtros, depois clique em Visualizar para ver os cálculos já salvos.</p>
        </div>
        <button onClick={() => navigate('/calculo-comissoes')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
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
              <div className="col-span-2 flex justify-end">
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

          {/* FILTROS AVANÇADOS — retrátil, começa fechado */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => setFiltrosAbertos(v => !v)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              {filtrosAbertos ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              <span className={LBL}>Filtros Avançados</span>
              {temFiltroAtivo && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ativo</span>}
            </button>
            {filtrosAbertos && (
              <div className="border-t border-slate-100 px-4 pt-4 pb-4 space-y-3">
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
                      {setoresUnicos.map(s => <option key={s} value={s}>{s}</option>)}
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
            )}
          </div>

          {/* RESULTADOS */}
          {jaBuscou && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-sm font-bold text-slate-900">Resultado — {mesLabel}/{ano}</span>
                {!buscando && (
                  <span className="text-xs font-bold text-emerald-700">{resultadosAgrupados.length} funcionário(s) · Total {fmtBRL(totalComissao)}</span>
                )}
              </div>
              {podeProcessar && !buscando && resultadosAgrupados.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
                  {lotesDisponiveisParaSelecao.length > 0 && (
                    <select
                      value={loteSelecionadoId}
                      onChange={e => selecionarLote(e.target.value)}
                      className="text-[11px] font-medium text-slate-600 border border-slate-200 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      title="Seleciona de uma vez todos os funcionários do período+empresa+departamento escolhido, sem marcar um por um"
                    >
                      <option value="">Selecionar por período/empresa/departamento...</option>
                      {lotesDisponiveisParaSelecao.map(({ lote, label }) => (
                        <option key={lote.id} value={lote.id}>{label}</option>
                      ))}
                    </select>
                  )}
                  {loteSelecionadoId && (
                    <button
                      type="button"
                      onClick={() => selecionarLote('')}
                      title="Limpar seleção de lote — volta a mostrar todos os resultados"
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" /> Limpar lote
                    </button>
                  )}
                  {selecionados.size > 0 && (
                    <span className="text-[11px] font-semibold text-slate-500">{selecionados.size} selecionado(s)</span>
                  )}
                  <button
                    onClick={handleAutorizarReprocessamento}
                    disabled={!podeAutorizarReprocessamento || processandoAcao === 'reprocessar'}
                    title={loteIdsSelecionados.length > 1 ? 'Selecione funcionários de um único período+empresa por vez' : ''}
                    className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
                  >
                    {processandoAcao === 'reprocessar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                    {ehLoteInteiroSelecionado ? 'Autorizar Reprocessamento (Lote Inteiro)' : selecionados.size > 0 ? `Autorizar Reprocessamento (${selecionados.size})` : 'Autorizar Reprocessamento'}
                  </button>
                  <button
                    onClick={handleProcessarPagamento}
                    disabled={!loteUnicoVisivel || loteUnicoVisivel.status !== 'CONFERIDO' || processandoAcao === 'processar'}
                    title={loteIdsVisiveis.length > 1 ? 'Só disponível quando os resultados são de um único período+empresa' : ''}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-sm transition-colors"
                  >
                    {processandoAcao === 'processar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                    Processar p/ Pagamento
                  </button>
                  {loteIdsSelecionados.length > 1 && (
                    <span className="text-[11px] text-amber-600">Selecione funcionários de um único período+empresa por vez.</span>
                  )}
                </div>
              )}
              {buscando ? (
                <div className="p-4 text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</div>
              ) : resultadosAgrupados.length === 0 ? (
                <div className="p-4 text-xs text-slate-400">Nenhum cálculo salvo encontrado para este período/filtros.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                        {podeProcessar && (
                          <th className="p-3">
                            <input type="checkbox" checked={todosSelecionados} onChange={toggleSelecionarTodos} className="w-3.5 h-3.5 rounded accent-blue-600" />
                          </th>
                        )}
                        <th className="p-3"></th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Funcionário</th>
                        <th className="p-3">Empresa</th>
                        <th className="p-3">Cargo</th>
                        <th className="p-3 text-right">Valor Comissão</th>
                        <th className="p-3">Calculado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                      {resultadosAgrupados.map(g => {
                        return (
                          <tr key={g.funcionario_id}>
                            {podeProcessar && (
                              <td className="p-3">
                                {podeSelecionarLinha(g) && (
                                  <input
                                    type="checkbox"
                                    checked={selecionados.has(g.funcionario_id)}
                                    onChange={() => toggleSelecionado(g.funcionario_id)}
                                    className="w-3.5 h-3.5 rounded accent-blue-600"
                                  />
                                )}
                              </td>
                            )}
                            <td className="p-3">
                              <button onClick={() => setDetalheAberto(g)} title="Visualizar cálculo"
                                className="p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                            </td>
                            <td className="p-3">
                              {(() => {
                                const status = lotesMap[g.lote_id]?.status
                                if (!status) return null
                                return (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
                                    status === 'PROCESSADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : status === 'CONFERIDO' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {status === 'PROCESSADO' ? 'Processado' : status === 'CONFERIDO' ? 'Conferido' : 'Rascunho'}
                                  </span>
                                )
                              })()}
                            </td>
                            <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{g.funcionarioNome}</td>
                            <td className="p-3 whitespace-nowrap">{g.empresaNome}</td>
                            <td className="p-3 whitespace-nowrap">{g.cargoNome}</td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-700">{fmtBRL(g.valorComissaoTotal)}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{new Date(g.calculadoEmMax).toLocaleString('pt-BR')}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* DETALHE DO CÁLCULO — mesma visualização de linha usada na tabela de Cálculo de Comissões */}
      {detalheAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDetalheAberto(null)}>
          <div className="bg-white rounded-xl border border-slate-200 w-[900px] max-w-[95vw] max-h-[85vh] shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Detalhe do Cálculo</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{detalheAberto.empresaNome} — {fmtData(detalheAberto.registros[0]?.periodo_inicio)} a {fmtData(detalheAberto.registros[detalheAberto.registros.length - 1]?.periodo_fim)}</p>
              </div>
              <button onClick={() => setDetalheAberto(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse min-w-[860px]">
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
                        {tipoComissaoPorBase(r.politica?.base_calculo) && (
                          <span className="italic text-slate-400"> ({tipoComissaoPorBase(r.politica?.base_calculo)})</span>
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
    </div>
  )
}
