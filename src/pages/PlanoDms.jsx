import React, { useEffect, useState } from 'react'
import { Wrench, Plus, X, AlertTriangle, Loader2, Edit2, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

const FORM_CATEGORIA_VAZIO = { nome: '', ativo: true }
const FORM_VALOR_VAZIO = { categoria_id: '', tempo_meses: '', valor: '' }

export default function PlanoDms() {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('plano-dms', 'editar')

  const [categorias, setCategorias] = useState([])
  const [valores, setValores] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [modalCategoriaAberto, setModalCategoriaAberto] = useState(false)
  const [editandoCategoriaId, setEditandoCategoriaId] = useState(null)
  const [formCategoria, setFormCategoria] = useState(FORM_CATEGORIA_VAZIO)
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  const [modalValorAberto, setModalValorAberto] = useState(false)
  const [editandoValorId, setEditandoValorId] = useState(null)
  const [formValor, setFormValor] = useState(FORM_VALOR_VAZIO)
  const [salvandoValor, setSalvandoValor] = useState(false)

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null) // { tipo: 'categoria'|'valor', item }
  const [excluindo, setExcluindo] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setErro(null)
    try {
      const [cats, vals] = await Promise.all([
        apiService.getCategoriasPlanoDms(),
        apiService.getPlanoDmsValores(),
      ])
      setCategorias(cats)
      setValores(vals)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const abrirIncluirCategoria = () => {
    setEditandoCategoriaId(null)
    setFormCategoria(FORM_CATEGORIA_VAZIO)
    setModalCategoriaAberto(true)
  }
  const abrirEditarCategoria = (cat) => {
    setEditandoCategoriaId(cat.id)
    setFormCategoria({ nome: cat.nome, ativo: cat.ativo })
    setModalCategoriaAberto(true)
  }
  const handleSalvarCategoria = async (e) => {
    e.preventDefault()
    setSalvandoCategoria(true)
    try {
      if (editandoCategoriaId) await apiService.updateCategoriaPlanoDms(editandoCategoriaId, formCategoria)
      else await apiService.createCategoriaPlanoDms(formCategoria)
      await loadData()
      setModalCategoriaAberto(false)
    } catch (err) {
      alert('Erro ao salvar categoria: ' + (err.message || String(err)))
    } finally {
      setSalvandoCategoria(false)
    }
  }

  const abrirIncluirValor = (categoriaId) => {
    setEditandoValorId(null)
    setFormValor({ ...FORM_VALOR_VAZIO, categoria_id: categoriaId })
    setModalValorAberto(true)
  }
  const abrirEditarValor = (v) => {
    setEditandoValorId(v.id)
    setFormValor({ categoria_id: v.categoria_id, tempo_meses: v.tempo_meses, valor: v.valor })
    setModalValorAberto(true)
  }
  const handleSalvarValor = async (e) => {
    e.preventDefault()
    setSalvandoValor(true)
    try {
      const payload = {
        categoria_id: formValor.categoria_id,
        tempo_meses: parseInt(formValor.tempo_meses, 10),
        valor: parseFloat(formValor.valor),
      }
      if (editandoValorId) await apiService.updatePlanoDmsValor(editandoValorId, payload)
      else await apiService.createPlanoDmsValor(payload)
      await loadData()
      setModalValorAberto(false)
    } catch (err) {
      const msg = /duplicate key|unique constraint/i.test(err.message || '')
        ? 'Essa categoria já tem um valor cadastrado pra esse prazo (meses). Edite o valor existente.'
        : 'Erro ao salvar valor: ' + (err.message || String(err))
      alert(msg)
    } finally {
      setSalvandoValor(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!confirmandoExclusao) return
    setExcluindo(true)
    try {
      if (confirmandoExclusao.tipo === 'categoria') await apiService.deleteCategoriaPlanoDms(confirmandoExclusao.item.id)
      else await apiService.deletePlanoDmsValor(confirmandoExclusao.item.id)
      await loadData()
      setConfirmandoExclusao(null)
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluindo(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="p-6 space-y-4 max-w-screen-lg">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Valor Plano DMS
          </h1>
          <p className="text-xs text-slate-500">Valores por categoria e prazo do Plano de Manutenção — base pro cálculo de comissões, que vai cruzar esses valores com a quantidade de planos vendidos.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluirCategoria} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Nova Categoria
          </button>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center text-xs text-slate-400">
          Nenhuma categoria de Valor Plano DMS cadastrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {categorias.map(cat => {
            const linhas = valores.filter(v => v.categoria_id === cat.id).sort((a, b) => a.tempo_meses - b.tempo_meses)
            return (
              <div key={cat.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {cat.nome}
                    {cat.ativo === false && <span className="px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500 text-[10px] font-bold">Inativo</span>}
                  </h3>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirIncluirValor(cat.id)} title="Cadastrar valor pra um prazo desta categoria"
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                        <Plus className="h-3 w-3" /> Valor
                      </button>
                      <button onClick={() => abrirEditarCategoria(cat)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmandoExclusao({ tipo: 'categoria', item: cat })} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  )}
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/60 text-slate-400 text-[10px] font-semibold uppercase tracking-wide">
                      <th className="px-3 py-1.5">Tempo (meses)</th>
                      <th className="px-3 py-1.5 text-right">Valor</th>
                      {canEdit && <th className="px-2 py-1.5 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {linhas.length === 0 ? (
                      <tr><td colSpan={canEdit ? 3 : 2} className="px-3 py-3 text-center text-slate-400">Nenhum valor cadastrado.</td></tr>
                    ) : linhas.map(v => (
                      <tr key={v.id}>
                        <td className="px-3 py-1.5 font-semibold text-slate-800">{v.tempo_meses} meses</td>
                        <td className="px-3 py-1.5 text-right font-mono font-bold">{fmtBRL(v.valor)}</td>
                        {canEdit && (
                          <td className="px-2 py-1.5">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => abrirEditarValor(v)} className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"><Edit2 className="h-3 w-3" /></button>
                              <button onClick={() => setConfirmandoExclusao({ tipo: 'valor', item: v })} className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: INCLUIR/EDITAR CATEGORIA */}
      {modalCategoriaAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editandoCategoriaId ? 'Editar Categoria' : 'Nova Categoria de Plano'}</h3>
              <button onClick={() => setModalCategoriaAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvarCategoria}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Nome da Categoria *</label>
                  <input required type="text" value={formCategoria.nome} onChange={e => setFormCategoria(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Óleos e Filtros, Dinâmico, Preventivo, Pleno" className={INP} />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={formCategoria.ativo} onChange={e => setFormCategoria(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalCategoriaAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoCategoria} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
                  {salvandoCategoria && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INCLUIR/EDITAR VALOR */}
      {modalValorAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">{editandoValorId ? 'Editar Valor' : 'Novo Valor'}</h3>
              <button onClick={() => setModalValorAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvarValor}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Categoria</label>
                  <select required value={formValor.categoria_id} onChange={e => setFormValor(prev => ({ ...prev, categoria_id: e.target.value }))} className={INP}>
                    <option value="">Selecione a categoria</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Tempo (meses) *</label>
                    <input required type="number" min="1" step="1" value={formValor.tempo_meses}
                      onChange={e => setFormValor(prev => ({ ...prev, tempo_meses: e.target.value }))}
                      placeholder="12" className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Valor (R$) *</label>
                    <input required type="number" min="0" step="0.01" value={formValor.valor}
                      onChange={e => setFormValor(prev => ({ ...prev, valor: e.target.value }))}
                      placeholder="0,00" className={INP} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalValorAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvandoValor} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
                  {salvandoValor && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {confirmandoExclusao && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {confirmandoExclusao.tipo === 'categoria'
                    ? <>Excluir a categoria <strong className="text-slate-800">"{confirmandoExclusao.item.nome}"</strong>? Todos os valores cadastrados nela também serão excluídos.</>
                    : <>Excluir o valor de <strong className="text-slate-800">{confirmandoExclusao.item.tempo_meses} meses</strong> desta categoria?</>}
                  {' '}Essa ação não pode ser desfeita.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setConfirmandoExclusao(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
              <button onClick={handleConfirmarExclusao} disabled={excluindo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 shadow-sm transition-colors">
                {excluindo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
