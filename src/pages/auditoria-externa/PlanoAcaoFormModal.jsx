import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiService } from '../../services/api'
import ManifestacaoRichEditor from '../projetos/ManifestacaoRichEditor'
import { MoedaInput } from './auditExtConstants'

const FORM_VAZIO = { achado_id: '', tipo_acao_id: '', causa_raiz: '', acao_proposta: '', total_apontado: '', valor_corrigido: '', empresa_id: '', responsavel_id: '', departamento_id: '', prazo_limite: '' }

export default function PlanoAcaoFormModal({ achadosDisponiveis, plano, achadoIdPadrao, onClose, onSaved }) {
  const [form, setForm] = useState(plano ? {
    achado_id: plano.achado_id || '',
    tipo_acao_id: plano.tipo_acao_id || '',
    causa_raiz: plano.causa_raiz || '',
    acao_proposta: plano.acao_proposta || '',
    total_apontado: plano.total_apontado ?? '',
    valor_corrigido: plano.valor_corrigido ?? '',
    empresa_id: plano.empresa_id || '',
    responsavel_id: plano.responsavel_id || '',
    departamento_id: plano.departamento_id || '',
    prazo_limite: plano.prazo_limite || '',
  } : { ...FORM_VAZIO, achado_id: achadoIdPadrao || '' })
  const [salvando, setSalvando] = useState(false)
  const [empresas, setEmpresas] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [tiposAcao, setTiposAcao] = useState([])

  useEffect(() => {
    apiService.getEmpresas().then(d => setEmpresas(d.filter(e => e.ativo !== false))).catch(() => {})
    apiService.getProjResponsaveis().then(d => setResponsaveis(d.filter(r => r.ativo !== false))).catch(() => {})
    apiService.getProjDepartamentos().then(d => setDepartamentos(d.filter(d => d.ativo !== false))).catch(() => {})
    apiService.getAuditExtTiposAcao().then(d => setTiposAcao(d.filter(t => t.ativo !== false))).catch(() => {})
  }, [])

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!form.achado_id) { alert('Selecione a divergência relacionada.'); return }
    setSalvando(true)
    const payload = {
      ...form,
      tipo_acao_id: form.tipo_acao_id || null,
      total_apontado: Number(form.total_apontado || 0),
      valor_corrigido: Number(form.valor_corrigido || 0),
      empresa_id: form.empresa_id || null,
      responsavel_id: form.responsavel_id || null,
      departamento_id: form.departamento_id || null,
      prazo_limite: form.prazo_limite || null,
    }
    try {
      if (plano) await apiService.updateAuditExtPlanoAcao(plano.id, payload)
      else await apiService.createAuditExtPlanoAcao(payload)
      onSaved()
    } catch (err) {
      alert('Erro ao salvar plano de ação: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[560px] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">{plano ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSalvar}>
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Divergência Relacionada *</label>
              <select required disabled={!!plano || !!achadoIdPadrao} value={form.achado_id} onChange={e => setForm(p => ({ ...p, achado_id: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50">
                <option value="">— Selecione —</option>
                {achadosDisponiveis.map(a => (
                  <option key={a.id} value={a.id}>{a.numero_codigo} · {a.titulo}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Causa Raiz Apurada</label>
              <ManifestacaoRichEditor
                value={form.causa_raiz}
                onChange={html => setForm(p => ({ ...p, causa_raiz: html }))}
                placeholder="Ex: Juros de mútuos apropriados por competência na contabilidade e não espelhados no financeiro"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tipo de Ação Tomada</label>
              <select value={form.tipo_acao_id} onChange={e => setForm(p => ({ ...p, tipo_acao_id: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">— Selecione —</option>
                {tiposAcao.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ação Corretiva / Preventiva</label>
              <ManifestacaoRichEditor
                value={form.acao_proposta}
                onChange={html => setForm(p => ({ ...p, acao_proposta: html }))}
                placeholder="Ação corretiva/preventiva proposta..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Apontado (R$)</label>
                <MoedaInput value={form.total_apontado} onChange={v => setForm(p => ({ ...p, total_apontado: v }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Valor Corrigido (R$)</label>
                <MoedaInput value={form.valor_corrigido} onChange={v => setForm(p => ({ ...p, valor_corrigido: v }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 -mt-2">O % Atingido desta ação é calculado automaticamente (Valor Corrigido ÷ Total Apontado da própria ação).</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
              <select value={form.empresa_id} onChange={e => setForm(p => ({ ...p, empresa_id: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">— Selecione —</option>
                {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Departamento</label>
                <select value={form.departamento_id} onChange={e => setForm(p => ({ ...p, departamento_id: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="">— Selecione —</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Responsável</label>
                <select value={form.responsavel_id} onChange={e => setForm(p => ({ ...p, responsavel_id: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                  <option value="">— Selecione —</option>
                  {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Prazo Limite</label>
                <input type="date" value={form.prazo_limite} onChange={e => setForm(p => ({ ...p, prazo_limite: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
            <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
