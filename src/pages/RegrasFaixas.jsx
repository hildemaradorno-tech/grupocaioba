import React, { useEffect, useState } from 'react'
import { Plus, X, AlertTriangle, Percent, Trash2, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const OPERADORES = [
  { value: '>=', label: 'maior ou igual (>=)' },
  { value: '>', label: 'maior que (>)' },
  { value: '<=', label: 'menor ou igual (<=)' },
  { value: '<', label: 'menor que (<)' },
]

// Mesmos "tipo" gravados em fato_metas_publicadas pelas telas de Planejamento de Metas
// (ver approveMetas* em supabaseClient.js) — usados pela Regra por % de Meta Atingida pra achar
// a meta do funcionário no mês calculado.
const TIPOS_META = [
  { value: 'pecas', label: 'Peças' },
  { value: 'mecanico', label: 'Serviços — Mecânico' },
  { value: 'consultor', label: 'Serviços — Consultor' },
  { value: 'funilaria', label: 'Funilaria/Pintura' },
  { value: 'terceiros', label: 'Terceiros' },
]
const labelTipoMeta = (v) => TIPOS_META.find(t => t.value === v)?.label || v

const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500'

const fmtBRL = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtPct = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`
// Campos numéricos sempre com 2 casas após a vírgula (25000 -> 25000,00; 0,6 -> 0,60).
// Vírgula = decimal (pontos são milhar); sem vírgula, um único ponto com até 2 dígitos é decimal.
const lerNumero = (v) => {
  const t = String(v).trim()
  if (!t) return NaN
  if (t.includes(',')) return parseFloat(t.replace(/\./g, '').replace(',', '.'))
  return /^\d+\.\d{1,2}$/.test(t) ? parseFloat(t) : parseFloat(t.replace(/\./g, ''))
}
const duasCasas = (v) => {
  const n = lerNumero(v)
  return Number.isNaN(n) ? '' : n.toFixed(2).replace('.', ',')
}
const novaFaixa = () => ({ operador: '>=', valor: '', percentual: '' })
const FORM_VAZIO = {
  descricao: '', ativo: true, politicaId: '',
  tipo_faixa: 'VALOR', meta_tipo: '', basePoliticaIds: [],  // 'VALOR' | 'PERCENTUAL_META' | 'VALOR_FIXO_META'
  faixas: [novaFaixa(), { operador: '<', valor: '', percentual: '' }],
}

// Texto do limiar da faixa (coluna esquerda): R$ absoluto (Valor da Base) ou % de meta atingida
// (Regra por % ou por Valor Fixo — as duas comparam com a Meta).
const fmtFaixaLimiar = (tipoFaixa, valor) => tipoFaixa === 'VALOR' ? fmtBRL(valor) : fmtPct(valor)
// Texto do que é pago quando a faixa casa: % (Regra por %) ou R$ fixo (Regra por Valor Fixo).
const fmtFaixaPago = (tipoFaixa, valor) => tipoFaixa === 'VALOR_FIXO_META' ? fmtBRL(valor) : fmtPct(valor)

export default function RegrasFaixas() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [somenteLeitura, setSomenteLeitura] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [buscaPolitica, setBuscaPolitica] = useState('')
  const [filtroEmpresaPolitica, setFiltroEmpresaPolitica] = useState('')
  const [filtroCargoPolitica, setFiltroCargoPolitica] = useState('')
  const [listaPoliticaAberta, setListaPoliticaAberta] = useState(false)
  const [buscaBasePolitica, setBuscaBasePolitica] = useState('')
  const [politicas, setPoliticas] = useState([]) // [{ id (grupo), titulo, detalhe, regraId, regraNome }]

  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('regras-faixas', 'editar')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [regras, linhas] = await Promise.all([apiService.getRegrasComissao(), apiService.getPoliticaComissao()])
      setDados(regras)
      // Uma "Política" na tela = um grupo (grupo_politica_id) de linhas por cargo.
      const mapa = new Map()
      for (const p of linhas) {
        const gid = p.grupo_politica_id || p.id
        if (!mapa.has(gid)) mapa.set(gid, [])
        mapa.get(gid).push(p)
      }
      setPoliticas([...mapa.entries()].map(([id, itens]) => {
        const p = itens[0]
        const cargos = [...new Set(itens.map(i => i.cargo_nome).filter(Boolean))]
        const empresas = [...new Set(itens.map(i => i.empresa_nome).filter(Boolean))]
        return {
          id, regraId: p.regra_comissao_id || null, regraNome: p.regra_comissao?.nome || null,
          baseNome: p.base_calculo?.nome || null,
          titulo: p.descricao_comissao || 'Sem descrição',
          cargos, empresas,
          detalhe: [cargos.join(', '), empresas.join(', ')].filter(Boolean).join(' — '),
        }
      }).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setSomenteLeitura(false)
    setForm({ ...FORM_VAZIO, faixas: [novaFaixa(), { operador: '<', valor: '', percentual: '' }] })
    setErroModal(null)
    setBuscaPolitica('')
    setFiltroEmpresaPolitica('')
    setFiltroCargoPolitica('')
    setBuscaBasePolitica('')
    setListaPoliticaAberta(false)
    setModalAberto(true)
  }

  const abrirItem = (item, leitura) => {
    setEditingId(item.id)
    setSomenteLeitura(leitura)
    setForm({
      descricao: item.descricao || '', ativo: item.ativo ?? true,
      politicaId: politicas.find(p => p.regraId === item.id)?.id || '',
      tipo_faixa: item.tipo_faixa || 'VALOR',
      meta_tipo: item.meta_tipo || '',
      basePoliticaIds: item.base_politica_ids || [],
      faixas: (item.faixas || []).map(f => ({ operador: f.operador, valor: duasCasas(f.valor), percentual: duasCasas(f.percentual) })),
    })
    setErroModal(null)
    setBuscaPolitica('')
    setFiltroEmpresaPolitica('')
    setFiltroCargoPolitica('')
    setBuscaBasePolitica('')
    setListaPoliticaAberta(false)
    setModalAberto(true)
  }

  const setFaixa = (i, campo, valor) =>
    setForm(prev => ({ ...prev, faixas: prev.faixas.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f) }))

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    if (form.tipo_faixa !== 'VALOR' && !form.meta_tipo) return setErroModal('Selecione a Meta de Referência.')
    const faixas = form.faixas.map(f => ({ operador: f.operador, valor: lerNumero(f.valor), percentual: lerNumero(f.percentual) }))
    if (faixas.length === 0) return setErroModal('Informe ao menos uma faixa.')
    if (faixas.some(f => Number.isNaN(f.valor) || Number.isNaN(f.percentual))) return setErroModal('Preencha o valor e o percentual de todas as faixas.')
    setSalvando(true)
    try {
      const anteriores = editingId ? politicas.filter(p => p.regraId === editingId).map(p => p.id) : []
      // A regra é de UMA política: o nome da regra é a própria descrição da política escolhida.
      const politica = politicas.find(p => p.id === form.politicaId)
      const regraId = await apiService.salvarRegraComissao(editingId, {
        nome: politica?.titulo || 'Regra', descricao: form.descricao, ativo: form.ativo,
        tipo_faixa: form.tipo_faixa, meta_tipo: form.meta_tipo, base_politica_ids: form.basePoliticaIds,
      }, faixas)
      await apiService.vincularPoliticasRegra(regraId, form.politicaId ? [form.politicaId] : [], anteriores)
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (item) => {
    if (!window.confirm(`Excluir a regra "${item.nome}"? Políticas que a usam impedem a exclusão.`)) return
    try {
      await apiService.deleteRegraComissao(item.id)
      await loadData()
    } catch (err) {
      const msg = err.message || String(err)
      alert(msg.includes('foreign key') || msg.includes('violates') ? 'Esta regra está em uso em uma Política de Comissão — troque a regra da política antes de excluir.' : 'Erro ao excluir: ' + msg)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>
  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <div className="flex items-center justify-end border-b border-slate-200 pb-4">
        {canEdit && (
          <button onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Regra
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Política de Comissão</th>
              <th className="p-3">Base de Cálculo</th>
              <th className="p-3 w-28 text-center">Tipo</th>
              <th className="p-3">Faixas</th>
              <th className="p-3 w-24 text-center">Situação</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400">Nenhuma regra cadastrada.</td></tr>
            ) : dados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-top">
                <td className="p-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900"><Percent className="h-3.5 w-3.5 text-indigo-500 shrink-0" />{item.nome}</div>
                  {item.descricao && <div className="text-[11px] font-normal text-slate-400 mt-0.5">{item.descricao}</div>}
                </td>
                <td className="p-3 text-slate-700">{politicas.find(p => p.regraId === item.id)?.baseNome || <span className="text-slate-300">—</span>}</td>
                <td className="p-3 text-center">
                  {item.tipo_faixa === 'VALOR' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">R$ Valor</span>
                  ) : (
                    <span className={`relative group inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-help border ${item.tipo_faixa === 'VALOR_FIXO_META' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                      {item.tipo_faixa === 'VALOR_FIXO_META' ? 'R$ Fixo/Meta' : '% Meta'}
                      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block w-52 bg-slate-800 text-white text-[11px] font-normal font-sans rounded-md p-2 shadow-xl z-30 leading-relaxed whitespace-normal text-left">
                        {item.tipo_faixa === 'VALOR_FIXO_META'
                          ? `Paga um valor fixo em R$ conforme o % de meta atingida — Meta de Referência: ${labelTipoMeta(item.meta_tipo)}`
                          : `Compara o % atingido (valor da Base ÷ meta) — Meta de Referência: ${labelTipoMeta(item.meta_tipo)}`}
                      </span>
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {item.faixas.map((f, i) => (
                      <span key={f.id || i} className="text-[11px] font-mono text-slate-600">
                        {f.operador} {fmtFaixaLimiar(item.tipo_faixa, f.valor)} <span className="text-slate-400">→</span> <span className="font-bold text-slate-800">{fmtFaixaPago(item.tipo_faixa, f.percentual)}</span>
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons menuPath="regras-faixas"
                    onView={() => abrirItem(item, true)} onEdit={() => abrirItem(item, false)} onDelete={() => handleExcluir(item)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[640px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Percent className="h-4 w-4 text-indigo-600" />
                {somenteLeitura ? 'Visualizar Regra' : editingId ? 'Editar Regra' : 'Incluir Regra'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Política de Comissão *</label>
                  {/* Filtros de Empresa/Cargo + busca por texto — os três juntos, pra achar a política rápido */}
                  {(() => {
                    // Facetado: escolher uma Empresa estreita os Cargos pra só os dela, e vice-versa.
                    const empresasOpcoes = [...new Set(
                      politicas.filter(p => !filtroCargoPolitica || p.cargos.includes(filtroCargoPolitica)).flatMap(p => p.empresas)
                    )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
                    const cargosOpcoes = [...new Set(
                      politicas.filter(p => !filtroEmpresaPolitica || p.empresas.includes(filtroEmpresaPolitica)).flatMap(p => p.cargos)
                    )].sort((a, b) => a.localeCompare(b, 'pt-BR'))
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <select disabled={somenteLeitura} value={filtroEmpresaPolitica}
                          onChange={e => {
                            const valor = e.target.value
                            // Se o Cargo já escolhido não existir mais nessa Empresa, limpa — senão
                            // a lista de políticas ficaria vazia sem nenhuma explicação visível.
                            const cargosDaEmpresa = [...new Set(politicas.filter(p => !valor || p.empresas.includes(valor)).flatMap(p => p.cargos))]
                            setFiltroEmpresaPolitica(valor)
                            if (filtroCargoPolitica && !cargosDaEmpresa.includes(filtroCargoPolitica)) setFiltroCargoPolitica('')
                            setListaPoliticaAberta(true)
                          }}
                          className={INP}>
                          <option value="">Todas as empresas</option>
                          {empresasOpcoes.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <select disabled={somenteLeitura} value={filtroCargoPolitica}
                          onChange={e => {
                            const valor = e.target.value
                            const empresasDoCargo = [...new Set(politicas.filter(p => !valor || p.cargos.includes(valor)).flatMap(p => p.empresas))]
                            setFiltroCargoPolitica(valor)
                            if (filtroEmpresaPolitica && !empresasDoCargo.includes(filtroEmpresaPolitica)) setFiltroEmpresaPolitica('')
                            setListaPoliticaAberta(true)
                          }}
                          className={INP}>
                          <option value="">Todos os cargos</option>
                          {cargosOpcoes.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    )
                  })()}
                  {(() => {
                    const sel = politicas.find(p => p.id === form.politicaId)
                    const rotulo = (p) => `${p.titulo}${p.detalhe ? ` — ${p.detalhe}` : ''}`
                    const termo = buscaPolitica.trim().toLowerCase()
                    const filtradas = politicas.filter(p =>
                      (!termo || rotulo(p).toLowerCase().includes(termo)) &&
                      (!filtroEmpresaPolitica || p.empresas.includes(filtroEmpresaPolitica)) &&
                      (!filtroCargoPolitica || p.cargos.includes(filtroCargoPolitica))
                    )
                    return (
                      <>
                        <input
                          type="text" disabled={somenteLeitura}
                          value={listaPoliticaAberta ? buscaPolitica : (sel ? rotulo(sel) : '')}
                          onFocus={() => { setBuscaPolitica(''); setListaPoliticaAberta(true) }}
                          onChange={e => { setBuscaPolitica(e.target.value); setListaPoliticaAberta(true) }}
                          placeholder="Digite para filtrar e selecione a política..."
                          className={INP}
                        />
                        {/* required nativo: garante a escolha mesmo com o campo de texto */}
                        <input tabIndex={-1} required value={form.politicaId} onChange={() => {}} className="sr-only" aria-hidden="true" />
                        {listaPoliticaAberta && !somenteLeitura && (
                          <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white shadow-sm">
                            {filtradas.length === 0 && <div className="px-3 py-2 text-[11px] text-slate-400">Nenhuma política encontrada.</div>}
                            {filtradas.map(p => (
                              <button key={p.id} type="button"
                                onClick={() => { setForm(prev => ({ ...prev, politicaId: p.id })); setListaPoliticaAberta(false); setBuscaPolitica('') }}
                                className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 ${p.id === form.politicaId ? 'bg-blue-50' : ''}`}>
                                <span className="font-semibold text-slate-700">{p.titulo}</span>
                                {p.detalhe && <span className="block text-[10px] text-slate-400">{p.detalhe}</span>}
                                <span className="block text-[10px] text-indigo-500">Base: {p.baseNome || 'não definida'}</span>
                                {p.regraId && p.regraId !== editingId && <span className="block text-[10px] text-amber-600">já tem regra</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                  {politicas.find(p => p.id === form.politicaId) && (
                    <div className="rounded-md border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-slate-600">
                      <span className="font-bold text-indigo-700 uppercase tracking-wide text-[10px]">Base de Cálculo</span>
                      <div className="font-semibold text-slate-800">{politicas.find(p => p.id === form.politicaId).baseNome || 'Nenhuma base definida na política'}</div>
                      <div className="text-slate-400">
                        {form.tipo_faixa === 'VALOR'
                          ? 'As faixas abaixo são comparadas com o valor apurado dessa Base.'
                          : 'As faixas comparam o % atingido (valor apurado dessa Base ÷ Meta cadastrada em Planejamento de Metas), não o valor em R$.'}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const sel = politicas.find(p => p.id === form.politicaId)
                    return sel?.regraId && sel.regraId !== editingId
                      ? <span className="text-[10px] text-amber-600">Esta política já usa a regra "{sel.regraNome}" — ao salvar, passa a usar esta.</span>
                      : <span className="text-[10px] text-slate-400">A regra vale para uma única política: ela passa a usar Regra (Usa Regra = SIM) em vez de % Serviços/Peças/Total e R$ Valor.</span>
                  })()}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição</label>
                  <input type="text" disabled={somenteLeitura} value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} className={INP} />
                </div>

                <div className={`grid gap-4 ${form.tipo_faixa !== 'VALOR' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tipo de Faixa *</label>
                    <select disabled={somenteLeitura} value={form.tipo_faixa}
                      onChange={e => setForm(prev => ({ ...prev, tipo_faixa: e.target.value, meta_tipo: e.target.value === 'VALOR' ? '' : prev.meta_tipo }))}
                      className={INP}>
                      <option value="VALOR">Valor da Base (R$)</option>
                      <option value="PERCENTUAL_META">% da Meta Atingida (aplica um % sobre a comissão)</option>
                      <option value="VALOR_FIXO_META">Meta Atingida — Valor Fixo por Faixa</option>
                    </select>
                  </div>
                  {form.tipo_faixa !== 'VALOR' && (
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Meta de Referência *</label>
                      <select required disabled={somenteLeitura} value={form.meta_tipo} onChange={e => setForm(p => ({ ...p, meta_tipo: e.target.value }))} className={INP}>
                        <option value="">Selecione</option>
                        {TIPOS_META.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label className={LBL}>Faixas {form.tipo_faixa === 'VALOR' ? '— sobre o valor da Base de Cálculo' : '— sobre o % da Meta Atingida'} *</label>
                  <span className="text-[10px] text-slate-400 leading-relaxed">
                    {form.tipo_faixa === 'VALOR'
                      ? 'A primeira faixa (de cima para baixo) que casar com o valor apurado da Base define o percentual, aplicado sobre o valor todo da Base. Pode ter quantas faixas precisar.'
                      : form.tipo_faixa === 'VALOR_FIXO_META'
                      ? 'A primeira faixa (de cima para baixo) cujo percentual de meta atingida casar define o valor FIXO em R$ pago de bonificação — não depende de nenhuma outra política. Pode ter quantas faixas precisar.'
                      : 'A primeira faixa (de cima para baixo) cujo percentual de meta atingida casar define o percentual de comissão, aplicado sobre o valor todo da Base. Pode ter quantas faixas precisar.'}
                  </span>
                  {form.faixas.map((f, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                      <select disabled={somenteLeitura} value={f.operador} onChange={e => setFaixa(i, 'operador', e.target.value)} className={INP}>
                        {OPERADORES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <div className="relative">
                        {form.tipo_faixa === 'VALOR' ? (
                          <input type="text" inputMode="decimal" disabled={somenteLeitura} value={f.valor} onChange={e => setFaixa(i, 'valor', e.target.value)} onBlur={e => setFaixa(i, 'valor', duasCasas(e.target.value))} placeholder="25000,00" className={`${INP} pl-7 font-mono`} />
                        ) : (
                          <input type="text" inputMode="decimal" disabled={somenteLeitura} value={f.valor} onChange={e => setFaixa(i, 'valor', e.target.value)} onBlur={e => setFaixa(i, 'valor', duasCasas(e.target.value))} placeholder="100,00" className={`${INP} pr-6 font-mono`} />
                        )}
                        {form.tipo_faixa === 'VALOR'
                          ? <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
                          : <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">% meta</span>}
                      </div>
                      <div className="relative">
                        {form.tipo_faixa === 'VALOR_FIXO_META' ? (
                          <>
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R$</span>
                            <input type="text" inputMode="decimal" disabled={somenteLeitura} value={f.percentual} onChange={e => setFaixa(i, 'percentual', e.target.value)} onBlur={e => setFaixa(i, 'percentual', duasCasas(e.target.value))} placeholder="200,00" className={`${INP} pl-7 font-mono`} />
                          </>
                        ) : (
                          <>
                            <input type="text" inputMode="decimal" disabled={somenteLeitura} value={f.percentual} onChange={e => setFaixa(i, 'percentual', e.target.value)} onBlur={e => setFaixa(i, 'percentual', duasCasas(e.target.value))} placeholder="0,60" className={`${INP} pr-6 font-mono`} />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                          </>
                        )}
                      </div>
                      {!somenteLeitura && (
                        <button type="button" onClick={() => setForm(p => ({ ...p, faixas: p.faixas.filter((_, idx) => idx !== i) }))} className="text-slate-400 hover:text-red-600 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {!somenteLeitura && (
                    <button type="button" onClick={() => setForm(p => ({ ...p, faixas: [...p.faixas, novaFaixa()] }))}
                      className="self-start flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                      <Plus className="h-3 w-3" /> Adicionar faixa
                    </button>
                  )}
                </div>

                {form.tipo_faixa === 'PERCENTUAL_META' && (
                  <div className="flex flex-col gap-2">
                    {/* Só faz sentido pra % da Meta — Valor Fixo por Faixa paga um R$ direto, sem multiplicar nada. */}
                    <label className={LBL}>Políticas que formam a Base da Comissão ({form.basePoliticaIds.length})</label>
                    <span className="text-[10px] text-slate-400 leading-relaxed">
                      O valor apurado da Base de Cálculo desta Regra só serve pra achar a % (comparando com a Meta) — a comissão em R$ é essa % aplicada sobre a SOMA do valor de comissão já calculado das políticas marcadas abaixo (não o valor apurado bruto delas), do mesmo funcionário e período.
                    </span>
                    <input type="text" disabled={somenteLeitura} value={buscaBasePolitica} onChange={e => setBuscaBasePolitica(e.target.value)}
                      placeholder="Buscar política, cargo ou empresa..." className={INP} />
                    <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {(() => {
                        const termo = buscaBasePolitica.trim().toLowerCase()
                        const outras = politicas.filter(p => p.id !== form.politicaId)
                        const filtradas = outras
                          .filter(p => !termo || `${p.titulo} ${p.detalhe}`.toLowerCase().includes(termo))
                          // Marcadas primeiro, pra achar rápido o que já foi selecionado.
                          .sort((a, b) => Number(form.basePoliticaIds.includes(b.id)) - Number(form.basePoliticaIds.includes(a.id)))
                        if (outras.length === 0) return <div className="px-3 py-3 text-[11px] text-slate-400">Nenhuma outra política cadastrada.</div>
                        if (filtradas.length === 0) return <div className="px-3 py-3 text-[11px] text-slate-400">Nenhuma política encontrada.</div>
                        return filtradas.map(p => (
                          <label key={p.id} className={`flex items-start gap-2 px-3 py-2 text-xs ${form.basePoliticaIds.includes(p.id) ? 'bg-emerald-50/60' : ''} ${somenteLeitura ? '' : 'cursor-pointer hover:bg-slate-50'}`}>
                            <input type="checkbox" disabled={somenteLeitura} className="mt-0.5 w-3.5 h-3.5"
                              checked={form.basePoliticaIds.includes(p.id)}
                              onChange={() => setForm(prev => ({ ...prev, basePoliticaIds: prev.basePoliticaIds.includes(p.id) ? prev.basePoliticaIds.filter(x => x !== p.id) : [...prev.basePoliticaIds, p.id] }))} />
                            <span className="flex flex-col">
                              <span className="font-semibold text-slate-700">{p.titulo}</span>
                              {p.detalhe && <span className="text-[10px] text-slate-400">{p.detalhe}</span>}
                            </span>
                          </label>
                        ))
                      })()}
                    </div>
                    {form.basePoliticaIds.length === 0 && (
                      <span className="text-[10px] text-amber-600">Sem nenhuma política marcada, a comissão sempre sairá R$ 0,00.</span>
                    )}
                  </div>
                )}

                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" disabled={somenteLeitura} checked={form.ativo} onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))} className="w-4 h-4" /> Ativa
                </label>

                {erroModal && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setModalAberto(false)} className="text-xs font-semibold text-slate-600 px-3 py-2">{somenteLeitura ? 'Fechar' : 'Cancelar'}</button>
                {!somenteLeitura && (
                  <button type="submit" disabled={salvando}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-md">
                    {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar Dados
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
