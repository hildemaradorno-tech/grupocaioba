import React, { useState } from 'react'
import { X, Eye, Pencil, Trash2, Plus, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { BadgeAtivo, INPUT, LABEL, mensagemErro } from './ControladoriaNav'

// Cadastro dos CR Visuais (ctb_cr_visuais): nomenclatura dos centros de resultado usada em Orçamento
// e nos dashboards. Cada Centro de Resultado escolhe o seu CR Visual no próprio formulário.
const FORM_VAZIO = { codigo: '', descricao: '', ativo: true }

export default function CrVisuaisModal({ crVisuais, centros, onClose, onChanged }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const [editingId, setEditingId] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const qtdCentros = (id) => centros.filter(c => c.cr_visual_id === id).length

  const limpar = () => { setEditingId(null); setForm(FORM_VAZIO); setErro(null) }
  const editar = (v) => { setEditingId(v.id); setForm({ codigo: v.codigo, descricao: v.descricao, ativo: v.ativo ?? true }); setErro(null) }

  const salvar = async (e) => {
    e.preventDefault()
    if (!form.codigo.trim() || !form.descricao.trim()) return
    setSalvando(true)
    setErro(null)
    try {
      await apiService.salvarCtbCrVisual(editingId, form)
      await onChanged()
      limpar()
    } catch (err) {
      setErro(mensagemErro(err, 'um Centro de Resultado (Visual)'))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (v) => {
    const qtd = qtdCentros(v.id)
    if (!window.confirm(`Excluir o Centro de Resultado (Visual) "${v.descricao}"?${qtd > 0 ? `\n\n${qtd} centro(s) de resultado ficarão sem Centro de Resultado (Visual).` : ''}`)) return
    try {
      await apiService.deleteCtbCrVisual(v.id)
      if (editingId === v.id) limpar()
      await onChanged()
    } catch (err) {
      setErro('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[640px] max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg"><Eye className="h-5 w-5 text-violet-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Centro de Resultado (Visual)</h2>
              <p className="text-[11px] text-slate-500">Nomenclaturas dos centros de resultado usadas em Orçamento e nos dashboards.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <form onSubmit={salvar} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-6 gap-3 items-end">
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Código *</label>
                <input autoFocus value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))} placeholder="Ex: 01" className={`${INPUT} font-mono`} />
              </div>
              <div className="flex flex-col gap-1.5 col-span-4">
                <label className={LABEL}>{editingId ? 'Editar descrição visual' : 'Nova descrição visual'} *</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value.toUpperCase() }))} placeholder="Ex: PÓS-VENDA" className={INPUT} />
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pb-2">
                <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                Ativo
              </label>
            </div>
            {erro && <p className="text-xs text-red-600">{erro}</p>}
            <div className="flex justify-end gap-2">
              {editingId && <button type="button" onClick={limpar} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60">Cancelar edição</button>}
              <button type="submit" disabled={salvando || !form.codigo.trim() || !form.descricao.trim()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
                {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {editingId ? 'Salvar' : 'Incluir'}
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                  <th className="p-2 w-20">Código</th>
                  <th className="p-2">Descrição Visual</th>
                  <th className="p-2 w-24 text-center">Centros</th>
                  <th className="p-2 w-20 text-center">Situação</th>
                  <th className="p-2 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {crVisuais.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-400">Nenhum Centro de Resultado (Visual) cadastrado.</td></tr>
                ) : crVisuais.map(v => (
                  <tr key={v.id} className={editingId === v.id ? 'bg-violet-50/60' : 'hover:bg-slate-50/70'}>
                    <td className="p-2 font-mono text-slate-600">{v.codigo}</td>
                    <td className="p-2 font-bold text-slate-900">{v.descricao}</td>
                    <td className="p-2 text-center text-slate-500">{qtdCentros(v.id)}</td>
                    <td className="p-2 text-center"><BadgeAtivo ativo={v.ativo} /></td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => editar(v)} title="Editar" className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                        <button onClick={() => excluir(v)} title="Excluir" className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
