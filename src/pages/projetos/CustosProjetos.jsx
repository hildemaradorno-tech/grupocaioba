import React, { useEffect, useMemo, useState } from 'react'
import { Plus, X, AlertTriangle, Eye, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import ProjetosNav from './ProjetosNav'
import { textoPlano } from './textoFormatado'
import { SearchCombobox } from '../../components/SearchCombobox'

export const CATEGORIAS_CUSTO = [
  'Desenvolvimento',
  'Contratação',
  'Consultoria',
  'Licença / Software',
  'Infraestrutura',
  'Equipamentos',
  'Treinamento',
  'Viagem',
  'Outros',
]
// Tipo do custo (coluna tipo, separado da Categoria). Tipos por hora mostram Horas de trabalho +
// Valor total e calculam o custo por hora.
export const TIPOS_CUSTO = ['RPA', 'Sistema', 'Outros']
export const TIPOS_POR_HORA = ['RPA']
const parseHoras = (s) => { const t = String(s ?? '').trim().replace(',', '.'); return t === '' ? NaN : Number(t) }
const custoHora = (valor, horas) => (Number(horas) > 0 ? Number(valor || 0) / Number(horas) : null)
const fmtHoras = (h) => `${Number(h).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} h`

const _cache = { dados: null, projetos: null }

const hoje = () => new Date().toISOString().slice(0, 10)
const fmtData = (d) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—')
const fmtValor = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// "1.234,56" / "1234.56" / "1234,5" → 1234.56
const parseValor = (s) => {
  const t = String(s ?? '').trim().replace(/[R$\s]/g, '')
  if (!t) return NaN
  const n = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return Number(n)
}
const valorParaInput = (v) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

// Status do custo (coluna status em proj_custos_lancamentos, migration proj_custos_status.sql)
export const STATUS_CUSTO = {
  em_andamento: { label: 'Em andamento', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  concluido:    { label: 'Concluído',    cls: 'bg-green-50 text-green-700 border-green-200' },
}

const FORM_VAZIO = { data: hoje(), descricao: '', categoria: '', tipo: '', valor: '', horas: '', projeto_id: '', tarefa_id: '', status: 'em_andamento', data_entrega: '' }

// Custo Concluído + Data da Entrega + tarefa vinculada → conclui a tarefa
// (mesmo padrão do "Concluir tarefa": status concluído, 100%, término = data da entrega).
async function concluirTarefaVinculada(tarefaId, dataEntrega) {
  if (!tarefaId || !dataEntrega) return
  await apiService.updateTarefa(tarefaId, { status_kanban: 'concluido', progresso_pct: 100, data_fim: dataEntrega })
}

export default function CustosProjetos() {
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [projetos, setProjetos] = useState(() => _cache.projetos ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [itemExcluir, setItemExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [filtros, setFiltros] = useState({ projeto_id: '', categoria: '', status: '', de: '', ate: '', busca: '' })
  const { hasActionOrDefault, userNomeCompleto, userNome } = useAuth()
  const canEdit = hasActionOrDefault('projetos/custos', 'editar')
  // tarefas do projeto escolhido no formulário (seletor "Tarefa vinculada")
  const [tarefasProj, setTarefasProj] = useState([])
  const [carregandoTarefas, setCarregandoTarefas] = useState(false)
  useEffect(() => {
    if (!modalAberto || !form.projeto_id) { setTarefasProj([]); return }
    let vivo = true
    setCarregandoTarefas(true)
    apiService.getTarefas(form.projeto_id)
      .then(ts => { if (vivo) setTarefasProj(ts) })
      .catch(() => { if (vivo) setTarefasProj([]) })
      .finally(() => { if (vivo) setCarregandoTarefas(false) })
    return () => { vivo = false }
  }, [modalAberto, form.projeto_id])

  useEffect(() => { loadDados(_cache.dados !== null) }, [])
  useEffect(() => { _cache.dados = dados }, [dados])
  useEffect(() => { _cache.projetos = projetos }, [projetos])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const [cs, ps] = await Promise.all([apiService.getProjCustos(), apiService.getProjetosLista()])
      setDados(cs)
      setProjetos(ps)
    } catch (err) {
      if (!silent) setError(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const filtrados = useMemo(() => {
    const b = filtros.busca.trim().toLowerCase()
    return dados.filter(c =>
      (!filtros.projeto_id || c.projeto_id === filtros.projeto_id) &&
      (!filtros.categoria || c.categoria === filtros.categoria) &&
      (!filtros.status || (c.status || 'em_andamento') === filtros.status) &&
      (!filtros.de || c.data >= filtros.de) &&
      (!filtros.ate || c.data <= filtros.ate) &&
      (!b || (c.descricao || '').toLowerCase().includes(b) || (c.proj_projetos?.nome || '').toLowerCase().includes(b))
    )
  }, [dados, filtros])

  const total = useMemo(() => filtrados.reduce((s, c) => s + Number(c.valor || 0), 0), [filtrados])
  const porCategoria = useMemo(() => {
    const m = {}
    filtrados.forEach(c => { m[c.categoria] = (m[c.categoria] || 0) + Number(c.valor || 0) })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [filtrados])

  const temFiltro = Object.values(filtros).some(v => v)

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO, data: hoje(), projeto_id: filtros.projeto_id || '' })
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({
      data: item.data || hoje(),
      descricao: item.descricao || '',
      categoria: item.categoria || '',
      tipo: item.tipo || '',
      valor: valorParaInput(item.valor),
      horas: item.horas != null ? String(item.horas).replace('.', ',') : '',
      projeto_id: item.projeto_id || '',
      tarefa_id: item.tarefa_id || '',
      status: item.status || 'em_andamento',
      data_entrega: item.data_entrega || '',
    })
    setModalAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    // Projeto é obrigatório (o campo de busca não é um <select required>)
    if (!form.projeto_id) { alert('Selecione o projeto.'); return }
    // Valor é opcional (25/11/2026): em branco grava 0 (coluna NOT NULL default 0)
    const valor = String(form.valor ?? '').trim() === '' ? 0 : parseValor(form.valor)
    if (!Number.isFinite(valor)) { alert('Informe um valor válido (ex: 1.250,00) ou deixe em branco.'); return }
    const porHora = TIPOS_POR_HORA.includes(form.tipo)
    const horas = porHora && String(form.horas ?? '').trim() !== '' ? parseHoras(form.horas) : null
    if (horas !== null && !(Number.isFinite(horas) && horas >= 0)) { alert('Informe as horas como número (ex: 12,5).'); return }
    setSalvando(true)
    try {
      const payload = {
        projeto_id: form.projeto_id,
        data: form.data,
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        tipo: form.tipo || null,
        valor: Math.round(valor * 100) / 100,
        status: form.status || 'em_andamento',
        data_entrega: form.data_entrega || null,
        tarefa_id: form.tarefa_id || null,
        horas: horas !== null ? Math.round(horas * 100) / 100 : null,
      }
      if (editingId) await apiService.updateProjCusto(editingId, payload)
      else await apiService.createProjCusto({ ...payload, criado_por: userNomeCompleto || userNome || null })
      if (payload.status === 'concluido' && payload.tarefa_id && payload.data_entrega) {
        try { await concluirTarefaVinculada(payload.tarefa_id, payload.data_entrega) }
        catch (err) { alert('Custo salvo, mas não foi possível concluir a tarefa vinculada: ' + (err.message || String(err))) }
      }
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar custo: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  // clique no selo de status da tabela: alterna Em andamento ⇄ Concluído
  // Ao concluir sem Data da Entrega, usa a data de hoje; com tarefa vinculada, conclui a tarefa também.
  const alternarStatus = async (item) => {
    const novo = (item.status || 'em_andamento') === 'concluido' ? 'em_andamento' : 'concluido'
    const dataEntrega = novo === 'concluido' ? (item.data_entrega || hoje()) : item.data_entrega
    if (novo === 'concluido' && item.tarefa_id && item.proj_tarefas?.status_kanban !== 'concluido') {
      if (!window.confirm(`Concluir também a tarefa vinculada "${textoPlano(item.proj_tarefas?.nome || '')}" com término em ${fmtData(dataEntrega)}?`)) return
    }
    setDados(ds => ds.map(d => d.id === item.id ? { ...d, status: novo, data_entrega: dataEntrega } : d))
    try {
      await apiService.updateProjCustoStatus(item.id, novo, novo === 'concluido' ? dataEntrega : null)
      if (novo === 'concluido' && item.tarefa_id) {
        await concluirTarefaVinculada(item.tarefa_id, dataEntrega)
        await loadDados(true)
      }
    } catch (err) {
      await loadDados(true)
      alert('Erro ao alterar status: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteProjCusto(itemExcluir.id)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir custo: ' + (err.message || String(err)))
    } finally {
      setItemExcluir(null)
    }
  }

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar custos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={() => loadDados()} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  const inputCls = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
  const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'
  const comboCls = 'w-full flex items-center justify-between gap-2 text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
  const filtroCls = 'text-xs p-1.5 border border-slate-200 rounded-md text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'

  return (
    <div className="p-6 space-y-4 w-full">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Custos de Projetos</h1>
          <p className="text-xs text-slate-500">Lance os custos (desenvolvimento, contratação etc.) e vincule cada um ao projeto.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Custo
          </button>
        )}
      </div>

      <ProjetosNav />

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Projeto</span>
          <select value={filtros.projeto_id} onChange={e => setFiltros(f => ({ ...f, projeto_id: e.target.value }))} className={`${filtroCls} w-64`}>
            <option value="">Todos os projetos</option>
            {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Categoria</span>
          <select value={filtros.categoria} onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))} className={`${filtroCls} w-44`}>
            <option value="">Todas</option>
            {CATEGORIAS_CUSTO.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Status</span>
          <select value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))} className={`${filtroCls} w-36`}>
            <option value="">Todos</option>
            {Object.entries(STATUS_CUSTO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">De</span>
          <input type="date" value={filtros.de} onChange={e => setFiltros(f => ({ ...f, de: e.target.value }))} className={filtroCls} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Até</span>
          <input type="date" value={filtros.ate} onChange={e => setFiltros(f => ({ ...f, ate: e.target.value }))} className={filtroCls} />
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Buscar</span>
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input type="text" value={filtros.busca} onChange={e => setFiltros(f => ({ ...f, busca: e.target.value }))} placeholder="Descrição ou projeto" className={`${filtroCls} w-full pl-7`} />
          </div>
        </div>
        {temFiltro && (
          <button onClick={() => setFiltros({ projeto_id: '', categoria: '', status: '', de: '', ate: '', busca: '' })} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Totais */}
      <div className="flex flex-wrap gap-2">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total {temFiltro ? 'filtrado' : 'geral'}</div>
          <div className="text-base font-bold text-slate-900">{fmtValor(total)}</div>
          <div className="text-[11px] text-slate-400">{filtrados.length} lançamento(s)</div>
        </div>
        {porCategoria.map(([cat, v]) => (
          <div key={cat} className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="text-[11px] font-bold text-slate-400 uppercase">{cat}</div>
            <div className="text-base font-bold text-slate-700">{fmtValor(v)}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-24">Data</th>
              <th className="p-3">Descrição</th>
              <th className="p-3 w-40">Categoria</th>
              <th className="p-3 w-64">Projeto</th>
              <th className="p-3 w-32 text-right">Valor</th>
              <th className="p-3 w-28">Entrega</th>
              <th className="p-3 w-32 text-center">Status</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {filtrados.length === 0 ? (
              <tr><td colSpan="8" className="p-6 text-center text-slate-400">{dados.length === 0 ? 'Nenhum custo lançado.' : 'Nenhum custo encontrado com esses filtros.'}</td></tr>
            ) : filtrados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 whitespace-nowrap">{fmtData(item.data)}</td>
                <td className="p-3">
                  <span>{item.descricao}</span>
                  {item.proj_tarefas?.nome && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Tarefa: <span className="text-slate-500">{textoPlano(item.proj_tarefas.nome)}</span>
                      {item.proj_tarefas.status_kanban === 'concluido' && <span className="ml-1 text-green-600 font-semibold">✓ concluída</span>}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200">{item.categoria}</span>
                  {item.tipo && <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200">{item.tipo}</span>}
                </td>
                <td className="p-3 font-semibold text-slate-800">{item.proj_projetos?.nome || '—'}</td>
                <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">
                  {fmtValor(item.valor)}
                  {Number(item.horas) > 0 && (
                    <div className="text-[10px] font-medium text-indigo-600">{fmtHoras(item.horas)} · {fmtValor(custoHora(item.valor, item.horas))}/h</div>
                  )}
                </td>
                <td className="p-3 whitespace-nowrap">{item.data_entrega ? fmtData(item.data_entrega) : <span className="text-slate-300">—</span>}</td>
                <td className="p-3 text-center">
                  {(() => {
                    const s = STATUS_CUSTO[item.status] || STATUS_CUSTO.em_andamento
                    return canEdit ? (
                      <button onClick={() => alternarStatus(item)} title="Clique para alternar Em andamento / Concluído"
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap hover:opacity-80 ${s.cls}`}>{s.label}</button>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${s.cls}`}>{s.label}</span>
                    )
                  })()}
                </td>
                <td className="p-3">
                  <PermissionActionButtons engrenagem menuPath="projetos/custos" onView={() => setItemVisualizado(item)} onEdit={() => abrirEditar(item)} onDelete={canEdit ? () => setItemExcluir(item) : undefined} />
                </td>
              </tr>
            ))}
          </tbody>
          {filtrados.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 text-xs">
                <td colSpan="4" className="p-3 text-right font-bold text-slate-500 uppercase text-[11px]">Total</td>
                <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmtValor(total)}</td>
                <td colSpan="3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[860px] max-w-[95vw] max-h-[92vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Custo' : 'Incluir Custo'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 w-40">
                    <label className={labelCls}>Data *</label>
                    <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className={labelCls}>Categoria *</label>
                    <select required value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className={inputCls}>
                      <option value="">Selecione...</option>
                      {CATEGORIAS_CUSTO.map(c => <option key={c} value={c}>{c}</option>)}
                      {form.categoria && !CATEGORIAS_CUSTO.includes(form.categoria) && <option value={form.categoria}>{form.categoria}</option>}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 w-44">
                    <label className={labelCls}>Tipo</label>
                    <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={inputCls}>
                      <option value="">Selecione...</option>
                      {TIPOS_CUSTO.map(t => <option key={t} value={t}>{t}</option>)}
                      {form.tipo && !TIPOS_CUSTO.includes(form.tipo) && <option value={form.tipo}>{form.tipo}</option>}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Descrição *</label>
                  <input type="text" required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Desenvolvimento do módulo de integração" className={inputCls} />
                </div>
                {TIPOS_POR_HORA.includes(form.tipo) && (() => {
                  const ch = custoHora(parseValor(form.valor) || 0, parseHoras(form.horas))
                  return (
                    <div className="flex gap-3 items-end p-3 rounded-md bg-indigo-50/60 border border-indigo-100">
                      <div className="flex flex-col gap-1.5 w-32">
                        <label className={labelCls}>Horas de trabalho</label>
                        <input type="text" inputMode="decimal" value={form.horas} onChange={e => setForm(f => ({ ...f, horas: e.target.value }))}
                          placeholder="0" className={`${inputCls} text-right`} />
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className={labelCls}>Custo por hora</span>
                        <div className="text-sm font-bold text-indigo-700 py-1.5">
                          {ch != null && Number.isFinite(ch) ? `${fmtValor(ch)} / h` : <span className="text-xs font-medium text-slate-400">Informe horas e valor total</span>}
                        </div>
                      </div>
                    </div>
                  )
                })()}
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 w-40">
                    <label className={labelCls}>{TIPOS_POR_HORA.includes(form.tipo) ? 'Valor total (R$)' : 'Valor (R$)'}</label>
                    <input type="text" inputMode="decimal" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                      onBlur={() => { const v = parseValor(form.valor); if (Number.isFinite(v)) setForm(f => ({ ...f, valor: valorParaInput(v) })) }}
                      placeholder="0,00" className={`${inputCls} text-right`} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className={labelCls}>Projeto *</label>
                    <SearchCombobox
                      value={form.projeto_id}
                      onChange={id => setForm(f => ({ ...f, projeto_id: id, tarefa_id: '' }))}
                      opcoes={projetos}
                      placeholder="Selecione o projeto..."
                      emptyOptionLabel="Nenhum"
                      searchPlaceholder="Buscar projeto..."
                      notFoundLabel="Nenhum projeto encontrado"
                      getLabel={p => p.nome}
                      getSearchText={p => p.nome || ''}
                      buttonClassName={comboCls}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Tarefa vinculada</label>
                  <SearchCombobox
                    value={form.tarefa_id}
                    onChange={id => setForm(f => ({ ...f, tarefa_id: id }))}
                    opcoes={tarefasProj}
                    disabled={!form.projeto_id || carregandoTarefas}
                    placeholder={!form.projeto_id ? 'Escolha o projeto primeiro' : carregandoTarefas ? 'Carregando tarefas...' : 'Nenhuma (opcional)'}
                    emptyOptionLabel="Nenhuma"
                    searchPlaceholder="Buscar tarefa..."
                    notFoundLabel="Nenhuma tarefa encontrada"
                    getLabel={t => `${textoPlano(t.nome)}${t.status_kanban === 'concluido' ? ' ✓' : ''}`}
                    getSearchText={t => textoPlano(t.nome || '')}
                    buttonClassName={`${comboCls} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 w-40">
                    <label className={labelCls}>Data da Entrega</label>
                    <input type="date" value={form.data_entrega} onChange={e => setForm(f => ({ ...f, data_entrega: e.target.value }))} className={inputCls} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className={labelCls}>Status *</label>
                    <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputCls}>
                      {Object.entries(STATUS_CUSTO).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                {form.status === 'concluido' && form.tarefa_id && (
                  form.data_entrega ? (
                    <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md px-2.5 py-1.5">
                      Ao salvar, a tarefa vinculada será <strong>concluída</strong> com término em <strong>{fmtData(form.data_entrega)}</strong>.
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                      Informe a Data da Entrega para concluir a tarefa vinculada automaticamente.
                    </p>
                  )
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-sm transition-colors">{salvando ? 'Salvando...' : 'Salvar Dados'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" /> Visualizar Custo</h3>
              <button onClick={() => setItemVisualizado(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {[
                ['Data', fmtData(itemVisualizado.data)],
                ['Categoria', itemVisualizado.categoria],
                ['Tipo', itemVisualizado.tipo || '—'],
                ['Descrição', itemVisualizado.descricao, true],
                ['Projeto', itemVisualizado.proj_projetos?.nome || '—', true],
                ['Tarefa vinculada', itemVisualizado.proj_tarefas?.nome ? textoPlano(itemVisualizado.proj_tarefas.nome) : '—', true],
                ['Valor', fmtValor(itemVisualizado.valor)],
                ...(Number(itemVisualizado.horas) > 0 ? [
                  ['Horas', fmtHoras(itemVisualizado.horas)],
                  ['Custo por hora', `${fmtValor(custoHora(itemVisualizado.valor, itemVisualizado.horas))} / h`],
                ] : []),
                ['Status', (STATUS_CUSTO[itemVisualizado.status] || STATUS_CUSTO.em_andamento).label],
                ['Data da Entrega', itemVisualizado.data_entrega ? fmtData(itemVisualizado.data_entrega) : '—'],
                ['Lançado por', itemVisualizado.criado_por || '—'],
              ].map(([l, v, full]) => (
                <div key={l} className={`flex flex-col gap-0.5 ${full ? 'col-span-2' : ''}`}>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{l}</span>
                  <span className="text-xs font-semibold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setItemVisualizado(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {itemExcluir && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deseja excluir o custo <strong className="text-slate-800">"{itemExcluir.descricao}"</strong> de <strong className="text-slate-800">{fmtValor(itemExcluir.valor)}</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setItemExcluir(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
