import React, { useEffect, useMemo, useState } from 'react'
import { Plus, X, AlertTriangle, Eye, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'

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

const FORM_VAZIO = { data: hoje(), descricao: '', categoria: '', valor: '', projeto_id: '' }

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
  const [filtros, setFiltros] = useState({ projeto_id: '', categoria: '', de: '', ate: '', busca: '' })
  const { hasActionOrDefault, userNomeCompleto, userNome } = useAuth()
  const canEdit = hasActionOrDefault('projetos/custos', 'editar')

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
      valor: valorParaInput(item.valor),
      projeto_id: item.projeto_id || '',
    })
    setModalAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    const valor = parseValor(form.valor)
    if (!Number.isFinite(valor)) { alert('Informe um valor válido (ex: 1.250,00).'); return }
    setSalvando(true)
    try {
      const payload = {
        projeto_id: form.projeto_id,
        data: form.data,
        descricao: form.descricao.trim(),
        categoria: form.categoria,
        valor: Math.round(valor * 100) / 100,
      }
      if (editingId) await apiService.updateProjCusto(editingId, payload)
      else await apiService.createProjCusto({ ...payload, criado_por: userNomeCompleto || userNome || null })
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar custo: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
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
  const filtroCls = 'text-xs p-1.5 border border-slate-200 rounded-md text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
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
          <button onClick={() => setFiltros({ projeto_id: '', categoria: '', de: '', ate: '', busca: '' })} className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2 py-1.5">
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
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {filtrados.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400">{dados.length === 0 ? 'Nenhum custo lançado.' : 'Nenhum custo encontrado com esses filtros.'}</td></tr>
            ) : filtrados.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 whitespace-nowrap">{fmtData(item.data)}</td>
                <td className="p-3">{item.descricao}</td>
                <td className="p-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200">{item.categoria}</span>
                </td>
                <td className="p-3 font-semibold text-slate-800">{item.proj_projetos?.nome || '—'}</td>
                <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmtValor(item.valor)}</td>
                <td className="p-3">
                  <PermissionActionButtons menuPath="projetos/custos" onView={() => setItemVisualizado(item)} onEdit={() => abrirEditar(item)} onDelete={() => setItemExcluir(item)} />
                </td>
              </tr>
            ))}
          </tbody>
          {filtrados.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 text-xs">
                <td colSpan="4" className="p-3 text-right font-bold text-slate-500 uppercase text-[11px]">Total</td>
                <td className="p-3 text-right font-bold text-slate-900 whitespace-nowrap">{fmtValor(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[480px] shadow-xl overflow-hidden">
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
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelCls}>Descrição *</label>
                  <input type="text" required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                    placeholder="Ex: Desenvolvimento do módulo de integração" className={inputCls} />
                </div>
                <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 w-40">
                    <label className={labelCls}>Valor (R$) *</label>
                    <input type="text" inputMode="decimal" required value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                      onBlur={() => { const v = parseValor(form.valor); if (Number.isFinite(v)) setForm(f => ({ ...f, valor: valorParaInput(v) })) }}
                      placeholder="0,00" className={`${inputCls} text-right`} />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <label className={labelCls}>Projeto *</label>
                    <select required value={form.projeto_id} onChange={e => setForm(f => ({ ...f, projeto_id: e.target.value }))} className={inputCls}>
                      <option value="">Selecione o projeto...</option>
                      {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                  </div>
                </div>
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
                ['Descrição', itemVisualizado.descricao, true],
                ['Projeto', itemVisualizado.proj_projetos?.nome || '—', true],
                ['Valor', fmtValor(itemVisualizado.valor)],
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
