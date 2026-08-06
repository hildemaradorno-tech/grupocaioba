import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, CheckCircle2, Circle,
  ChevronLeft, ChevronRight, Edit2, X, DollarSign, Loader2, ClipboardCheck, Eye,
} from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const MESES     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const anoAtual  = new Date().getFullYear()
const mesAtual  = new Date().getMonth() + 1
const hojeISO   = new Date().toISOString().slice(0, 10)

const fmtBRL = (v) =>
  typeof v === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '—'

function ativoNoMes(custo, ano, mes) {
  if (!custo.data_inicio) return false
  const d  = new Date(custo.data_inicio + 'T12:00:00')
  const ai = d.getFullYear()
  const mi = d.getMonth() + 1
  const dur = Math.max(1, parseInt(custo.meses) || 1)
  let af = ai, mf = mi + dur - 1
  while (mf > 12) { mf -= 12; af++ }
  const c = ano * 100 + mes
  return c >= ai * 100 + mi && c <= af * 100 + mf
}

const TIPOS_DOCUMENTO = ['Proposta Comercial', 'Orçamento', 'Contrato', 'Nota Fiscal', 'Outro']

const FORM_VAZIO = {
  nome: '', fornecedor_id: '', tipo: '', numero_documento: '',
  valor_mensal: '', meses: 12,
  data_inicio: hojeISO.slice(0, 7) + '-01', projeto_id: '', tarefa_id: '',
}

export default function CustosProjetos() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const [ano, setAno]                 = useState(anoAtual)
  const [custos, setCustos]           = useState([])
  const [confirmacoes, setConfirmacoes] = useState({})
  const [loading, setLoading]         = useState(true)
  const [confirmando, setConfirmando] = useState(null)

  // Opções para dropdowns
  const [projetos, setProjetos]         = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [tarefasMapa, setTarefasMapa]   = useState({})

  // Modal form
  const [modalForm, setModalForm] = useState(null) // null | 'add' | 'edit' | 'pdf'
  const [form, setForm]           = useState(FORM_VAZIO)
  const [salvando, setSalvando]   = useState(false)

  // Modal excluir
  const [modalExcluir, setModalExcluir] = useState(null)

  // Modal pagamentos
  const [modalPagamentos, setModalPagamentos] = useState(false)

  // Modal detalhe do custo
  const [modalDetalhe, setModalDetalhe] = useState(null)

  // Filtro por projeto
  const [filtroProjeto, setFiltroProjeto] = useState('')

  // Valores editados no modal de pagamentos (key → string do valor)
  const [valoresEditados, setValoresEditados] = useState({})

  // Filtro de status no modal de pagamentos
  const [filtroPagamentos, setFiltroPagamentos] = useState('pendentes')

  // ── Carrega dados ──────────────────────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [cs, confs, projs, forns] = await Promise.all([
        apiService.getCustosProjetos(),
        apiService.getConfirmacoesCusto(ano),
        apiService.getProjetosLista(),
        apiService.getFornecedores(),
      ])
      setCustos(cs)
      const map = {}
      confs.forEach(c => { map[`${c.custo_id}_${c.ano}_${c.mes}`] = { confirmado: c.confirmado, valor_pago: c.valor_pago } })
      setConfirmacoes(map)
      setProjetos(projs)
      setFornecedores(forns)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [ano])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Carrega tarefas do projeto selecionado no form
  useEffect(() => {
    if (!form.projeto_id || tarefasMapa[form.projeto_id]) return
    apiService.getTarefas(form.projeto_id)
      .then(ts => setTarefasMapa(prev => ({ ...prev, [form.projeto_id]: ts })))
      .catch(() => {})
  }, [form.projeto_id, tarefasMapa])

  // ── Salvar custo ───────────────────────────────────────────────────────────
  const handleSalvar = async () => {
    if (!form.nome.trim() || !form.valor_mensal) return
    setSalvando(true)
    try {
      const payload = {
        nome:              form.nome.trim(),
        fornecedor_id:     form.fornecedor_id    || null,
        tipo:              form.tipo              || null,
        numero_documento:  (form.numero_documento || '').trim() || null,
        valor_mensal:      parseFloat(String(form.valor_mensal).replace(',', '.')),
        meses:             parseInt(form.meses) || 1,
        data_inicio:       form.data_inicio,
        projeto_id:        form.projeto_id || null,
        tarefa_id:         form.tarefa_id  || null,
      }
      if (modalForm === 'edit' && form.id) {
        await apiService.updateCustoProjeto(form.id, payload)
      } else {
        await apiService.createCustoProjeto(payload, user?.email)
      }
      setModalForm(null)
      await carregarDados()
    } catch (e) { alert('Erro ao salvar: ' + e.message) }
    finally { setSalvando(false) }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteCustoProjeto(modalExcluir.id)
      setModalExcluir(null)
      await carregarDados()
    } catch (e) { alert('Erro ao excluir: ' + e.message) }
  }

  // ── Confirmação de pagamento ───────────────────────────────────────────────
  const handleToggleConfirmacao = async (custo, mes, valorEditado) => {
    const key        = `${custo.id}_${ano}_${mes}`
    const atual      = !!confirmacoes[key]?.confirmado
    const novoStatus = !atual
    const valorFinal = novoStatus
      ? (parseFloat(String(valorEditado ?? '').replace(',', '.')) || parseFloat(custo.valor_mensal) || 0)
      : null
    setConfirmando(key)
    try {
      await apiService.upsertConfirmacaoCusto(custo.id, ano, mes, novoStatus, user?.email, valorFinal)
      setConfirmacoes(prev => ({ ...prev, [key]: { confirmado: novoStatus, valor_pago: valorFinal } }))
      if (novoStatus) setValoresEditados(prev => { const n = { ...prev }; delete n[key]; return n })
    } catch (e) { alert('Erro: ' + e.message) }
    finally { setConfirmando(null) }
  }

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const custosDoAno = useMemo(() =>
    custos.filter(c =>
      MESES.some((_, i) => ativoNoMes(c, ano, i + 1)) &&
      (!filtroProjeto || c.projeto_id === filtroProjeto)
    ),
    [custos, ano, filtroProjeto],
  )

  const projetosComCusto = useMemo(() => {
    const ids = new Set(
      custos
        .filter(c => c.projeto_id && MESES.some((_, i) => ativoNoMes(c, ano, i + 1)))
        .map(c => c.projeto_id)
    )
    return projetos.filter(p => ids.has(p.id))
  }, [custos, ano, projetos])

  const totalPorMes = useMemo(() =>
    MESES.map((_, i) => {
      const mes = i + 1
      return custosDoAno.reduce((sum, c) => {
        if (!ativoNoMes(c, ano, mes)) return sum
        const conf  = confirmacoes[`${c.id}_${ano}_${mes}`]
        const valor = conf?.confirmado ? (conf.valor_pago ?? parseFloat(c.valor_mensal) ?? 0) : (parseFloat(c.valor_mensal) || 0)
        return sum + valor
      }, 0)
    }),
    [custosDoAno, ano, confirmacoes],
  )

  const totalAno = useMemo(() => totalPorMes.reduce((a, b) => a + b, 0), [totalPorMes])

  const totalAnoPorCusto = (c) =>
    MESES.reduce((sum, _, i) => {
      const mes = i + 1
      if (!ativoNoMes(c, ano, mes)) return sum
      const conf  = confirmacoes[`${c.id}_${ano}_${mes}`]
      const valor = conf?.confirmado ? (conf.valor_pago ?? parseFloat(c.valor_mensal) ?? 0) : (parseFloat(c.valor_mensal) || 0)
      return sum + valor
    }, 0)

  const totalContratado = useMemo(() =>
    custosDoAno.reduce((sum, c) =>
      sum + MESES.reduce((s, _, i) =>
        ativoNoMes(c, ano, i + 1) ? s + (parseFloat(c.valor_mensal) || 0) : s, 0), 0),
    [custosDoAno, ano],
  )

  const totalConfirmadoAno = useMemo(() =>
    custosDoAno.reduce((sum, c) =>
      sum + MESES.reduce((s, _, i) => {
        const mes  = i + 1
        const conf = confirmacoes[`${c.id}_${ano}_${mes}`]
        if (!ativoNoMes(c, ano, mes) || !conf?.confirmado) return s
        return s + (conf.valor_pago ?? parseFloat(c.valor_mensal) ?? 0)
      }, 0), 0),
    [custosDoAno, ano, confirmacoes],
  )

  const totalPendente = useMemo(() =>
    custosDoAno.reduce((sum, c) =>
      sum + MESES.reduce((s, _, i) => {
        const mes    = i + 1
        const anoMes = ano * 100 + mes
        const key    = `${c.id}_${ano}_${mes}`
        if (ativoNoMes(c, ano, mes) && !confirmacoes[key]?.confirmado && anoMes <= anoAtual * 100 + mesAtual)
          return s + (parseFloat(c.valor_mensal) || 0)
        return s
      }, 0), 0),
    [custosDoAno, ano, confirmacoes],
  )

  const totalProjetado = useMemo(() =>
    custosDoAno.reduce((sum, c) =>
      sum + MESES.reduce((s, _, i) => {
        const mes    = i + 1
        const anoMes = ano * 100 + mes
        const key    = `${c.id}_${ano}_${mes}`
        if (ativoNoMes(c, ano, mes) && !confirmacoes[key]?.confirmado && anoMes > anoAtual * 100 + mesAtual)
          return s + (parseFloat(c.valor_mensal) || 0)
        return s
      }, 0), 0),
    [custosDoAno, ano, confirmacoes],
  )

  const pagamentosOrdenados = useMemo(() => {
    const list = []
    custosDoAno.forEach(c => {
      MESES.forEach((_, i) => {
        const mes = i + 1
        if (ativoNoMes(c, ano, mes)) {
          const key = `${c.id}_${ano}_${mes}`
          list.push({ custo: c, mes, key, confirmado: !!confirmacoes[key]?.confirmado, anoMes: ano * 100 + mes })
        }
      })
    })
    list.sort((a, b) => a.anoMes - b.anoMes || a.custo.nome.localeCompare(b.custo.nome))
    return list
  }, [custosDoAno, ano, confirmacoes])

  const valorForm = parseFloat(String(form.valor_mensal).replace(',', '.'))
  const mesesForm = parseInt(form.meses) || 1
  const totalForm = !isNaN(valorForm) && mesesForm ? valorForm * mesesForm : null

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projetos')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-2 bg-emerald-600 rounded-lg shrink-0">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Custo do Projeto</h1>
            <p className="text-xs text-slate-500">Mapeamento e controle de custos por projeto</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Navegação de ano */}
          <button onClick={() => setAno(a => a - 1)} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-slate-700 min-w-[52px] text-center">{ano}</span>
          <button onClick={() => setAno(a => a + 1)} className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 text-slate-500 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Confirmar Pagamentos */}
          <button
            onClick={() => setModalPagamentos(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Confirmar Pagamentos
          </button>

          {/* Novo custo */}
          <button
            onClick={() => { setForm(FORM_VAZIO); setModalForm('add') }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Custo
          </button>
        </div>
      </div>

      <ProjetosNav />

      {/* Filtro por projeto */}
      {!loading && projetosComCusto.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Projeto:</span>
          <select
            value={filtroProjeto}
            onChange={e => setFiltroProjeto(e.target.value)}
            className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white text-slate-700 min-w-[220px]"
          >
            <option value="">— Todos os projetos —</option>
            {projetosComCusto.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          {filtroProjeto && (
            <button
              onClick={() => setFiltroProjeto('')}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
              title="Limpar filtro"
            >
              <X className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
        </div>
      )}

      {/* Cards de resumo */}
      {!loading && custosDoAno.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Previsto {ano}</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{fmtBRL(totalContratado)}</p>
          </div>
          <div className="bg-white rounded-lg border border-emerald-200 shadow-sm px-4 py-3">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Total Confirmado {ano}</p>
            <p className="text-xl font-bold text-emerald-700 mt-1">{fmtBRL(totalConfirmadoAno)}</p>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 shadow-sm px-4 py-3">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Pendente de Confirmação</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{fmtBRL(totalPendente)}</p>
            <p className="text-[10px] text-amber-400 mt-0.5">Mês atual e anteriores</p>
          </div>
          <div className="bg-white rounded-lg border border-indigo-200 shadow-sm px-4 py-3">
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide">Projetado</p>
            <p className="text-xl font-bold text-indigo-700 mt-1">{fmtBRL(totalProjetado)}</p>
            <p className="text-[10px] text-indigo-300 mt-0.5">Meses futuros</p>
          </div>
        </div>
      )}

      {/* Tabela principal */}
      {loading ? (
        <div className="p-10 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="text-xs w-full border-collapse" style={{ minWidth: '1140px' }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] sticky left-0 bg-slate-50 z-10 min-w-[210px] border-r border-slate-100">
                  Serviço / Custo
                </th>
                {MESES.map((m, i) => {
                  const ehMesAtual = ano === anoAtual && i + 1 === mesAtual
                  return (
                    <th key={m} className={`px-1 py-2.5 font-semibold uppercase tracking-wide text-[10px] text-center w-[72px] ${ehMesAtual ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500'}`}>
                      {m}
                    </th>
                  )
                })}
                <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] text-right min-w-[110px] border-l border-slate-200">
                  Total Ano
                </th>
                <th className="px-3 py-2.5 w-16 text-center font-semibold text-slate-400 uppercase tracking-wide text-[10px]" />
              </tr>
            </thead>
            <tbody>
              {custosDoAno.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 text-xs">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 text-slate-200" />
                    Nenhum custo cadastrado para {ano}.<br />
                    Clique em <strong>Novo Custo</strong> para começar.
                  </td>
                </tr>
              ) : custosDoAno.map(c => {
                const totalC = totalAnoPorCusto(c)
                return (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group">
                    {/* Nome + projeto */}
                    <td className="px-4 py-2 sticky left-0 bg-white group-hover:bg-slate-50/60 z-10 border-r border-slate-100">
                      <div className="font-medium text-slate-800 truncate max-w-[195px]">{c.nome}</div>
                      {c.fornecedores?.nome && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[195px]">{c.fornecedores.nome}</div>
                      )}
                      {c.proj_projetos?.nome
                        ? <div className="text-[10px] text-indigo-500 truncate max-w-[195px] mt-0.5">{c.proj_projetos.nome}</div>
                        : <div className="text-[10px] text-slate-300 mt-0.5">Todos os projetos</div>
                      }
                    </td>

                    {/* Meses */}
                    {MESES.map((_, i) => {
                      const mes   = i + 1
                      const ativo = ativoNoMes(c, ano, mes)
                      if (!ativo) {
                        return (
                          <td key={mes} className="px-1 py-2 text-center text-slate-200 text-[11px]">—</td>
                        )
                      }
                      const key        = `${c.id}_${ano}_${mes}`
                      const confirmado  = !!confirmacoes[key]?.confirmado
                      const carregEste = confirmando === key
                      const anoMes     = ano * 100 + mes
                      const passado    = anoMes < anoAtual * 100 + mesAtual
                      const ehHoje     = anoMes === anoAtual * 100 + mesAtual
                      return (
                        <td key={mes} className={`px-1 py-2 text-center ${ehHoje ? 'bg-emerald-50/50' : ''}`}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[11px] font-semibold tabular-nums leading-tight ${
                              confirmado ? 'text-emerald-700' : passado ? 'text-amber-600' : 'text-slate-500'
                            }`}>
                              {fmtBRL(confirmado
                                ? (confirmacoes[key]?.valor_pago ?? parseFloat(c.valor_mensal))
                                : parseFloat(c.valor_mensal)
                              )}
                            </span>
                            {carregEste && (
                              <Loader2 className="h-3 w-3 text-slate-300 animate-spin mt-0.5" />
                            )}
                          </div>
                        </td>
                      )
                    })}

                    {/* Total ano */}
                    <td className="px-3 py-2 text-right font-bold text-slate-700 tabular-nums border-l border-slate-100">
                      {fmtBRL(totalC)}
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => setModalDetalhe(c)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Visualizar detalhes"
                        >
                          <Eye className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => { setForm({ ...c, fornecedor_id: c.fornecedor_id || '', meses: c.meses || 1 }); setModalForm('edit') }}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => setModalExcluir(c)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>

            {/* Rodapé com totais */}
            {custosDoAno.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-2.5 font-bold text-slate-700 text-[11px] uppercase tracking-wide sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                    Total por Mês
                  </td>
                  {totalPorMes.map((total, i) => {
                    const mes     = i + 1
                    const ehHoje  = ano === anoAtual && mes === mesAtual
                    return (
                      <td key={i} className={`px-1 py-2.5 text-center font-bold tabular-nums text-[11px] ${total > 0 ? 'text-slate-800' : 'text-slate-300'} ${ehHoje ? 'bg-emerald-50/60' : ''}`}>
                        {total > 0 ? fmtBRL(total) : '—'}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-right font-bold text-emerald-700 text-sm tabular-nums border-l-2 border-slate-200">
                    {fmtBRL(totalAno)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* Legenda */}
      {!loading && custosDoAno.length > 0 && (
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-emerald-600">R$</span> Pagamento confirmado</div>
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-amber-500">R$</span> Aguardando confirmação (mês passado)</div>
          <div className="flex items-center gap-1.5"><span className="text-[11px] font-bold text-slate-400">R$</span> Previsto (mês futuro)</div>
        </div>
      )}

      {/* ── Modal: Form Custo ─────────────────────────────────────────────── */}
      {modalForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50">
              <h3 className="text-sm font-bold text-slate-900">
                {modalForm === 'edit' ? 'Editar Custo' : 'Novo Custo'}
              </h3>
              <button onClick={() => setModalForm(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">

              {/* Nome */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Serviço / Custo *</label>
                <input
                  value={form.nome}
                  onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  autoFocus
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  placeholder="Ex: Licença Adobe, Servidor AWS, Aluguel equipamento…"
                />
              </div>

              {/* Fornecedor */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Fornecedor</label>
                <select
                  value={form.fornecedor_id || ''}
                  onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value }))}
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                >
                  <option value="">— Selecione o fornecedor —</option>
                  {fornecedores.filter(f => f.ativo).map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {/* Tipo + Número do Documento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Documento</label>
                  <select
                    value={form.tipo || ''}
                    onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                  >
                    <option value="">— Selecione —</option>
                    {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Número do Documento</label>
                  <input
                    value={form.numero_documento || ''}
                    onChange={e => setForm(p => ({ ...p, numero_documento: e.target.value }))}
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    placeholder="Ex: 2024/001, CT-123…"
                  />
                </div>
              </div>

              {/* Valor + Duração + Mês de Início */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Valor Mensal (R$) *</label>
                  <input
                    value={form.valor_mensal}
                    onChange={e => setForm(p => ({ ...p, valor_mensal: e.target.value }))}
                    type="number" step="0.01" min="0"
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Duração (meses)</label>
                  <input
                    value={form.meses}
                    onChange={e => setForm(p => ({ ...p, meses: e.target.value }))}
                    type="number" min="1" max="240"
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                  {totalForm != null && !isNaN(totalForm) && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                      Total: {fmtBRL(totalForm)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mês de Início</label>
                  <input
                    value={form.data_inicio?.slice(0, 7)}
                    onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value + '-01' }))}
                    type="month"
                    className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Projeto */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Projeto</label>
                <select
                  value={form.projeto_id}
                  onChange={e => setForm(p => ({ ...p, projeto_id: e.target.value, tarefa_id: '' }))}
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                >
                  <option value="">— Todos os projetos —</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>

              {/* Tarefa */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Tarefa</label>
                <select
                  value={form.tarefa_id}
                  onChange={e => setForm(p => ({ ...p, tarefa_id: e.target.value }))}
                  disabled={!form.projeto_id}
                  className="w-full mt-1 text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{form.projeto_id ? '— Selecione a tarefa —' : '— Selecione um projeto primeiro —'}</option>
                  {(tarefasMapa[form.projeto_id] || []).map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalForm(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando || !form.nome.trim() || !form.valor_mensal}
                className="px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detalhe do Custo ───────────────────────────────────────── */}
      {modalDetalhe && (() => {
        const c = modalDetalhe
        const valor = parseFloat(c.valor_mensal) || 0
        const mesesAtivos = MESES.map((_, i) => {
          const mes = i + 1
          if (!ativoNoMes(c, ano, mes)) return null
          const key        = `${c.id}_${ano}_${mes}`
          const conf       = confirmacoes[key]
          const confirmado = !!conf?.confirmado
          const valor_pago = conf?.valor_pago ?? null
          const anoMes     = ano * 100 + mes
          const passado    = anoMes < anoAtual * 100 + mesAtual
          const ehAtual    = anoMes === anoAtual * 100 + mesAtual
          return { mes, key, confirmado, valor_pago, passado, ehAtual }
        }).filter(Boolean)

        const totalPrevisto     = mesesAtivos.length * valor
        const totalPago         = mesesAtivos.filter(m => m.confirmado).reduce((s, m) => s + (m.valor_pago ?? valor), 0)
        const totalProvisionado = totalPrevisto - totalPago
        const tarefaNome = c.projeto_id && tarefasMapa[c.projeto_id]
          ? (tarefasMapa[c.projeto_id].find(t => t.id === c.tarefa_id)?.nome || null)
          : null

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50 shrink-0">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{c.nome}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {c.fornecedores?.nome && <span className="text-[10px] text-slate-500">{c.fornecedores.nome}</span>}
                    {c.tipo && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium">{c.tipo}</span>}
                    {c.numero_documento && <span className="text-[10px] text-slate-400">#{c.numero_documento}</span>}
                  </div>
                </div>
                <button onClick={() => setModalDetalhe(null)} className="p-1 text-slate-400 hover:text-slate-700 rounded ml-3">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Cards de valores */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Previsto</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{fmtBRL(totalPrevisto)}</p>
                    <p className="text-[10px] text-slate-400">{mesesAtivos.length} meses em {ano}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Total Pago</p>
                    <p className="text-sm font-bold text-emerald-700 mt-0.5">{fmtBRL(totalPago)}</p>
                    <p className="text-[10px] text-emerald-500">{mesesAtivos.filter(m => m.confirmado).length} confirmados</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Provisionado</p>
                    <p className="text-sm font-bold text-amber-700 mt-0.5">{fmtBRL(totalProvisionado)}</p>
                    <p className="text-[10px] text-amber-500">{mesesAtivos.filter(m => !m.confirmado).length} pendentes</p>
                  </div>
                </div>

                {/* Projeto e Tarefa */}
                {(c.proj_projetos?.nome || tarefaNome) && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 space-y-1.5">
                    {c.proj_projetos?.nome && (
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Projeto</span>
                        <p className="text-xs font-semibold text-indigo-800 mt-0.5">{c.proj_projetos.nome}</p>
                      </div>
                    )}
                    {tarefaNome && (
                      <div>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Tarefa</span>
                        <p className="text-xs text-indigo-700 mt-0.5">{tarefaNome}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Valor mensal + duração */}
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">{fmtBRL(valor)}<span className="font-normal text-slate-400">/mês</span></span>
                  <span className="text-slate-300">·</span>
                  <span>{c.meses} meses de contrato</span>
                  <span className="text-slate-300">·</span>
                  <span>Total contrato: <strong>{fmtBRL(valor * (parseInt(c.meses) || 1))}</strong></span>
                </div>

                {/* Meses do ano */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Situação por mês — {ano}</p>
                  <div className="grid grid-cols-6 gap-1.5">
                    {MESES.map((m, i) => {
                      const mes = i + 1
                      const info = mesesAtivos.find(x => x.mes === mes)
                      if (!info) return (
                        <div key={m} className="rounded-md p-1.5 text-center bg-slate-50 border border-slate-100">
                          <p className="text-[9px] font-bold text-slate-300 uppercase">{m}</p>
                          <p className="text-[10px] text-slate-200 mt-0.5">—</p>
                        </div>
                      )
                      return (
                        <div key={m} className={`rounded-md p-2 text-center border ${
                          info.confirmado ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                        }`}>
                          <p className={`text-[9px] font-bold uppercase ${
                            info.confirmado ? 'text-emerald-600' : 'text-red-500'
                          }`}>{m}</p>
                          <p className={`text-[10px] font-semibold tabular-nums mt-0.5 ${
                            info.confirmado ? 'text-emerald-700' : 'text-red-600'
                          }`}>{fmtBRL(info.confirmado ? (info.valor_pago ?? valor) : valor)}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0 flex justify-end">
                <button onClick={() => setModalDetalhe(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Modal: Confirmar Pagamentos ───────────────────────────────────── */}
      {modalPagamentos && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-emerald-50 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Confirmar Pagamentos — {ano}
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Pagamentos ordenados por vencimento. Confirme os que foram realizados.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-md border border-slate-200 overflow-hidden text-[11px] font-semibold">
                  <button
                    onClick={() => setFiltroPagamentos('pendentes')}
                    className={`px-3 py-1.5 transition-colors ${filtroPagamentos === 'pendentes' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >Pendentes</button>
                  <button
                    onClick={() => setFiltroPagamentos('pagos')}
                    className={`px-3 py-1.5 transition-colors ${filtroPagamentos === 'pagos' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >Pagos</button>
                  <button
                    onClick={() => setFiltroPagamentos('todos')}
                    className={`px-3 py-1.5 transition-colors ${filtroPagamentos === 'todos' ? 'bg-slate-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                  >Todos</button>
                </div>
                <button onClick={() => setModalPagamentos(false)} className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {(() => {
                const lista = pagamentosOrdenados.filter(p =>
                  filtroPagamentos === 'todos' ? true :
                  filtroPagamentos === 'pagos' ? p.confirmado : !p.confirmado
                )
                if (lista.length === 0) return (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    {filtroPagamentos === 'pendentes' ? 'Nenhum pagamento pendente.' :
                     filtroPagamentos === 'pagos'     ? 'Nenhum pagamento confirmado.' :
                     `Nenhum pagamento para ${ano}.`}
                  </div>
                )
                let mesAtualRender = null
                return lista.map(({ custo, mes, key, confirmado }) => {
                  const anoMesNum  = ano * 100 + mes
                  const passado    = anoMesNum < anoAtual * 100 + mesAtual
                  const ehMesAtual = anoMesNum === anoAtual * 100 + mesAtual
                  const carregEste = confirmando === key
                  const showHeader = mes !== mesAtualRender
                  if (showHeader) mesAtualRender = mes

                  const valorSalvo  = confirmacoes[key]?.valor_pago ?? null
                  const valorEdit   = valoresEditados[key]
                  const rawDefault  = parseFloat(String(valorSalvo ?? custo.valor_mensal).replace(',', '.'))
                  const valorInput  = valorEdit !== undefined ? valorEdit : (isNaN(rawDefault) ? '0,00' : rawDefault.toFixed(2).replace('.', ','))

                  return (
                    <React.Fragment key={key}>
                      {showHeader && (
                        <div className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide sticky top-0 z-10 ${
                          ehMesAtual ? 'bg-emerald-100 text-emerald-700' : passado ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {MESES[mes - 1]} {ano}
                          {ehMesAtual && <span className="ml-2 text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">Mês atual</span>}
                        </div>
                      )}
                      <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${confirmado ? 'opacity-80' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-slate-800 truncate">{custo.nome}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {custo.fornecedores?.nome && <span className="text-[10px] text-slate-400">{custo.fornecedores.nome}</span>}
                            {custo.tipo && <span className="text-[10px] text-indigo-400">{custo.tipo}</span>}
                            {custo.numero_documento && <span className="text-[10px] text-slate-400">#{custo.numero_documento}</span>}
                          </div>
                        </div>
                        {/* Valor editável */}
                        <div className="shrink-0">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={valorInput}
                            onChange={e => setValoresEditados(prev => ({ ...prev, [key]: e.target.value }))}
                            onBlur={e => {
                              const n = parseFloat(String(e.target.value).replace(',', '.'))
                              if (!isNaN(n)) setValoresEditados(prev => ({ ...prev, [key]: n.toFixed(2).replace('.', ',') }))
                            }}
                            disabled={confirmado}
                            className={`w-28 text-xs text-right p-1.5 border rounded-md tabular-nums font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 ${
                              confirmado
                                ? 'bg-slate-50 border-slate-100 text-emerald-700 cursor-default'
                                : passado
                                ? 'border-amber-200 bg-amber-50/50 text-amber-700'
                                : 'border-slate-200 bg-white text-slate-700'
                            }`}
                          />
                        </div>
                        <button
                          onClick={() => handleToggleConfirmacao(custo, mes, valorInput)}
                          disabled={!!confirmando}
                          title={confirmado ? 'Confirmado — clique para desfazer' : 'Confirmar pagamento'}
                          className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                            confirmado
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : passado
                              ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {carregEste ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : confirmado ? (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Pago</>
                          ) : (
                            <><Circle className="h-3.5 w-3.5" /> Confirmar</>
                          )}
                        </button>
                      </div>
                    </React.Fragment>
                  )
                })
              })()}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 shrink-0 flex items-center justify-between">
              <div className="text-[10px] text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Confirmado</span>
                <span className="flex items-center gap-1"><Circle className="h-3 w-3 text-amber-300" /> Pendente</span>
              </div>
              <button onClick={() => setModalPagamentos(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Excluir ────────────────────────────────────────────────── */}
      {modalExcluir && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Excluir Custo</h3>
              <p className="text-xs text-slate-500 mt-1">
                Deseja excluir <strong>{modalExcluir.nome}</strong>? Todas as confirmações de pagamento serão removidas.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50">
              <button onClick={() => setModalExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button onClick={handleExcluir} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
