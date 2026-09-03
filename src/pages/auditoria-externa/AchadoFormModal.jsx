import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { apiService } from '../../services/api'
import ManifestacaoRichEditor from '../projetos/ManifestacaoRichEditor'
import EvidenciaUploader from './EvidenciaUploader'
import { MoedaInput, fmtMoeda } from './auditExtConstants'

const FORM_VAZIO = {
  ciclo_id: '', titulo: '', motivo: '', total_apontado: '',
  fundamentacao_tecnica: '', impacto_id: '', fatos_apontados: '', recomendacoes: '', evidencias: '',
}

export default function AchadoFormModal({ ciclos, achado, cicloIdPadrao, onClose, onSaved, userEmail }) {
  const [form, setForm] = useState(achado ? {
    ciclo_id: achado.ciclo_id || '',
    titulo: achado.titulo || '',
    motivo: achado.motivo || '',
    total_apontado: achado.total_apontado ?? '',
    fundamentacao_tecnica: achado.fundamentacao_tecnica || '',
    impacto_id: achado.impacto_id || '',
    fatos_apontados: achado.fatos_apontados || '',
    recomendacoes: achado.recomendacoes || '',
    evidencias: achado.evidencias || '',
  } : { ...FORM_VAZIO, ciclo_id: cicloIdPadrao || '' })
  const [imagensUrls, setImagensUrls] = useState(achado?.evidencias_imagens_urls || [])
  // ID estável gerado antes de salvar — permite anexar imagens já na criação
  // (sem isso, não haveria achado.id pra montar a pasta de upload antes do
  // primeiro "Salvar"). No update, usa o id real do achado.
  const [novoAchadoId] = useState(() => achado?.id || crypto.randomUUID())
  const [salvando, setSalvando] = useState(false)
  const [impactos, setImpactos] = useState([])

  useEffect(() => {
    apiService.getAuditExtImpactos().then(d => setImpactos(d.filter(i => i.ativo !== false))).catch(() => {})
  }, [])

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (!form.ciclo_id) { alert('Selecione o ciclo de auditoria.'); return }
    setSalvando(true)
    const payload = { ...form, total_apontado: Number(form.total_apontado || 0), impacto_id: form.impacto_id || null, evidencias_imagens_urls: imagensUrls }
    try {
      if (achado) await apiService.updateAuditExtAchado(achado.id, payload)
      else await apiService.createAuditExtAchado({ ...payload, id: novoAchadoId }, userEmail)
      onSaved()
    } catch (err) {
      alert('Erro ao salvar achado: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[640px] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-900">{achado ? 'Editar Divergência' : 'Nova Divergência'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSalvar}>
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ciclo de Auditoria *</label>
              <select required value={form.ciclo_id} onChange={e => setForm(p => ({ ...p, ciclo_id: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">— Selecione —</option>
                {ciclos.map(c => (
                  <option key={c.id} value={c.id}>{c.proj_empresas?.nome || '—'} · {c.periodo_competencia}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Título *</label>
              <input type="text" required value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
                placeholder="Ex: Inconsistências em Contas a Receber" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Motivo</label>
              <input type="text" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
                placeholder="Motivo da divergência" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fundamentação Técnica (normas)</label>
              <input type="text" value={form.fundamentacao_tecnica} onChange={e => setForm(p => ({ ...p, fundamentacao_tecnica: e.target.value }))}
                placeholder="Ex: NBC TG 26, NBC TA 300/315" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Impacto</label>
              <select value={form.impacto_id} onChange={e => setForm(p => ({ ...p, impacto_id: e.target.value }))}
                className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                <option value="">— Selecione —</option>
                {impactos.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Apontado (R$)</label>
                <MoedaInput value={form.total_apontado} onChange={v => setForm(p => ({ ...p, total_apontado: v }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Valor Corrigido (R$)</label>
                <div className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-500 bg-slate-50">
                  {fmtMoeda(achado?.valor_corrigido)}
                </div>
                <p className="text-[10px] text-slate-400">Somatório automático do Valor Corrigido de cada Ação cadastrada.</p>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Fatos Apontados pela Auditoria</label>
              <ManifestacaoRichEditor
                value={form.fatos_apontados}
                onChange={html => setForm(p => ({ ...p, fatos_apontados: html }))}
                placeholder="Fatos apontados pela auditoria..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Recomendações da Auditoria</label>
              <ManifestacaoRichEditor
                value={form.recomendacoes}
                onChange={html => setForm(p => ({ ...p, recomendacoes: html }))}
                placeholder="Recomendações da auditoria..."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Evidências</label>
              <textarea rows={3} value={form.evidencias} onChange={e => setForm(p => ({ ...p, evidencias: e.target.value }))}
                placeholder="Documentos e evidências que sustentam a divergência" className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
              <EvidenciaUploader pastaId={novoAchadoId} urls={imagensUrls} onChange={setImagensUrls} />
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
