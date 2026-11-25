import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react'
import { apiService } from '../../services/api'

// Engrenagem do BI Possibilidades (aba Tempo na Oficina): cadastro das regras do relógio
// "% dos veículos que saíram em até N dias" — por mês ou anual, para todas as empresas ou uma só (24/11/2026).

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const novaRegra = () => ({ id: null, ano: new Date().getFullYear(), mes: '', empresa_id: '', dias_limite: 7, meta_pct: 80, atencao_pct: 60, media_meta_dias: 7, media_atencao_dias: 10 })

export default function TempoOficinaRegrasModal({ aberto, onFechar, empresas = [], onSalvo }) {
  const [regras, setRegras] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const carregar = () => {
    setCarregando(true)
    apiService.getTempoOficinaRegras()
      .then(setRegras)
      .catch(e => setErro(e.message || String(e)))
      .finally(() => setCarregando(false))
  }
  useEffect(() => { if (aberto) { setErro(null); setForm(null); carregar() } }, [aberto])

  if (!aberto) return null

  const nomeEmpresa = (id) => {
    if (!id) return 'Todas as empresas'
    const e = empresas.find(x => x.id === id)
    return e ? (e.empresa_fantasia || e.nome_empresa_sistema || e.nome_empresa) : '(empresa)'
  }

  const salvar = async () => {
    const f = form
    const meta = Number(f.meta_pct), atencao = Number(f.atencao_pct), dias = Number(f.dias_limite)
    if (!f.ano || Number.isNaN(dias) || dias < 0) return setErro('Informe o ano e os dias.')
    if (Number.isNaN(meta) || Number.isNaN(atencao) || meta < 0 || meta > 100 || atencao < 0 || atencao > 100) return setErro('Os percentuais devem ficar entre 0 e 100.')
    if (atencao > meta) return setErro('O % de atenção (amarelo) não pode ser maior que a meta (verde).')
    const mMeta = Number(f.media_meta_dias), mAtencao = Number(f.media_atencao_dias)
    if (Number.isNaN(mMeta) || Number.isNaN(mAtencao) || mMeta < 0 || mAtencao < 0) return setErro('Informe os dias da Média (verde e amarelo).')
    if (mMeta > mAtencao) return setErro('Na Média, os dias do verde não podem ser maiores que os do amarelo.')
    setSalvando(true); setErro(null)
    try {
      await apiService.salvarTempoOficinaRegra(f)
      setForm(null)
      carregar()
      onSalvo?.()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvando(false) }
  }

  const excluir = async (r) => {
    if (!window.confirm(`Excluir a regra de ${r.mes ? `${MESES[r.mes - 1]}/` : 'Anual '}${r.ano} — ${nomeEmpresa(r.empresa_id)}?`)) return
    try { await apiService.excluirTempoOficinaRegra(r.id); carregar(); onSalvo?.() }
    catch (e) { setErro(e.message || String(e)) }
  }

  const campo = 'h-8 w-full rounded-md border border-slate-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d8f]/30'
  const rotulo = 'text-[11px] font-semibold text-slate-600'

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 bg-[#1a4d8f] rounded-t-lg">
          <div>
            <p className="text-sm font-bold text-white">Regras do Tempo na Oficina</p>
            <p className="text-[11px] text-white/80">Relógio: % dos veículos que saíram em até N dias (abertura → emissão da nota)</p>
          </div>
          <button type="button" onClick={onFechar} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-[11px] text-slate-500">
            A regra do mês tem prioridade sobre a anual. Regra de uma empresa vale quando só ela está selecionada; senão vale a de todas as empresas.
            O mês usado é o da data final do filtro.
          </p>

          {erro && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{erro}</div>}

          {form ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={rotulo}>Ano</label>
                  <input type="number" value={form.ano} onChange={e => setForm(f => ({ ...f, ano: e.target.value }))} className={campo} />
                </div>
                <div>
                  <label className={rotulo}>Período</label>
                  <select value={form.mes || ''} onChange={e => setForm(f => ({ ...f, mes: e.target.value }))} className={campo}>
                    <option value="">Anual (todos os meses)</option>
                    {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Empresa</label>
                  <select value={form.empresa_id || ''} onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value }))} className={campo}>
                    <option value="">Todas as empresas</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa_sistema || e.nome_empresa}</option>)}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Saída em até (dias)</label>
                  <input type="number" min="0" value={form.dias_limite} onChange={e => setForm(f => ({ ...f, dias_limite: e.target.value }))} className={campo} />
                </div>
                <div>
                  <label className={rotulo}><span className="inline-block h-2 w-2 rounded-full bg-[#0ca30c] mr-1" />Meta — verde a partir de (%)</label>
                  <input type="number" min="0" max="100" value={form.meta_pct} onChange={e => setForm(f => ({ ...f, meta_pct: e.target.value }))} className={campo} />
                </div>
                <div>
                  <label className={rotulo}><span className="inline-block h-2 w-2 rounded-full bg-[#fab219] mr-1" />Atenção — amarelo a partir de (%)</label>
                  <input type="number" min="0" max="100" value={form.atencao_pct} onChange={e => setForm(f => ({ ...f, atencao_pct: e.target.value }))} className={campo} />
                </div>
              </div>
              <p className="text-[11px] font-bold uppercase text-slate-600 pt-1">Relógio da Média de dias na oficina</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className={rotulo}><span className="inline-block h-2 w-2 rounded-full bg-[#0ca30c] mr-1" />Verde até (dias)</label>
                  <input type="number" min="0" step="0.5" value={form.media_meta_dias ?? ''} onChange={e => setForm(f => ({ ...f, media_meta_dias: e.target.value }))} className={campo} />
                </div>
                <div>
                  <label className={rotulo}><span className="inline-block h-2 w-2 rounded-full bg-[#fab219] mr-1" />Amarelo até (dias)</label>
                  <input type="number" min="0" step="0.5" value={form.media_atencao_dias ?? ''} onChange={e => setForm(f => ({ ...f, media_atencao_dias: e.target.value }))} className={campo} />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Média: até {form.media_meta_dias || 0} dias <strong className="text-[#0ca30c]">verde</strong>; até {form.media_atencao_dias || 0} dias <strong className="text-[#c98a00]">amarelo</strong>; acima, <strong className="text-[#d03b3b]">vermelho</strong>.
              </p>
              <p className="text-[11px] font-bold uppercase text-slate-600 pt-1">Relógio de saída no prazo</p>
              <p className="text-[11px] text-slate-500">
                Abaixo de {form.atencao_pct || 0}% fica <strong className="text-[#d03b3b]">vermelho</strong>; de {form.atencao_pct || 0}% até {form.meta_pct || 0}%, <strong className="text-[#c98a00]">amarelo</strong>; a partir de {form.meta_pct || 0}%, <strong className="text-[#0ca30c]">verde</strong>.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setForm(null); setErro(null) }} className="h-8 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="button" onClick={salvar} disabled={salvando}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#1a4d8f] text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60">
                  {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" onClick={() => { setErro(null); setForm(novaRegra()) }}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#1a4d8f] text-xs font-semibold text-white hover:brightness-110">
                <Plus className="h-3.5 w-3.5" /> Nova regra
              </button>
            </div>
          )}

          <div className="rounded-lg border border-slate-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="p-2 text-left font-semibold">Ano</th>
                  <th className="p-2 text-left font-semibold">Período</th>
                  <th className="p-2 text-left font-semibold">Empresa</th>
                  <th className="p-2 text-center font-semibold">Até (dias)</th>
                  <th className="p-2 text-center font-semibold">Verde ≥</th>
                  <th className="p-2 text-center font-semibold">Amarelo ≥</th>
                  <th className="p-2 text-center font-semibold">Média verde até</th>
                  <th className="p-2 text-center font-semibold">Média amarelo até</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {carregando ? (
                  <tr><td colSpan={9} className="p-4 text-center text-slate-400"><Loader2 className="inline h-4 w-4 animate-spin" /></td></tr>
                ) : regras.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-center text-slate-400">Nenhuma regra cadastrada.</td></tr>
                ) : regras.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2">{r.ano}</td>
                    <td className="p-2">{r.mes ? MESES[r.mes - 1] : 'Anual'}</td>
                    <td className="p-2">{nomeEmpresa(r.empresa_id)}</td>
                    <td className="p-2 text-center">{r.dias_limite}</td>
                    <td className="p-2 text-center text-[#0ca30c] font-semibold">{Number(r.meta_pct)}%</td>
                    <td className="p-2 text-center text-[#c98a00] font-semibold">{Number(r.atencao_pct)}%</td>
                    <td className="p-2 text-center text-[#0ca30c] font-semibold">{r.media_meta_dias != null ? `${Number(r.media_meta_dias)}d` : '—'}</td>
                    <td className="p-2 text-center text-[#c98a00] font-semibold">{r.media_atencao_dias != null ? `${Number(r.media_atencao_dias)}d` : '—'}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <button type="button" title="Editar" onClick={() => { setErro(null); setForm({ ...r, mes: r.mes || '', empresa_id: r.empresa_id || '' }) }}
                        className="p-1 text-slate-500 hover:text-[#1a4d8f]"><Pencil className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Excluir" onClick={() => excluir(r)}
                        className="p-1 text-slate-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
