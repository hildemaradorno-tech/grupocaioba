import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Loader2, Save } from 'lucide-react'
import { apiService } from '../../services/api'

// Engrenagem do BI Possibilidades › "Cores dos indicadores": a partir de quantos % cada indicador fica
// verde / amarelo / vermelho (26/11/2026). Uma configuração só (tabela bi_possib_regras_cores, id = 1).

export const CORES_PADRAO = {
  realizado_verde: 100, realizado_amarelo: 80,
  possib_verde: 100, possib_amarelo: 80,
  mrg_pecas_verde: 70, mrg_pecas_amarelo: 40,
  mrg_serv_verde: 70, mrg_serv_amarelo: 40,
}

const GRUPOS = [
  { chave: 'realizado', titulo: 'Realizado %', ajuda: 'Indicadores "Realizado ... Acum %" e colunas % Peças, % Serv. e % Real.' },
  { chave: 'possib', titulo: 'Possibilidades %', ajuda: 'Indicador "Possibilidades %" e coluna % Possib.' },
  { chave: 'mrg_pecas', titulo: '% Margem Peças', ajuda: 'Indicadores de margem de peças e colunas % Mrg Peças.' },
  { chave: 'mrg_serv', titulo: '% Margem Serviços', ajuda: 'Indicador de margem de serviços e colunas % Mrg Serv.' },
]

export default function CoresIndicadoresModal({ aberto, onFechar, onSalvo }) {
  const [form, setForm] = useState(CORES_PADRAO)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!aberto) return
    setErro(null); setCarregando(true)
    apiService.getBiPossibRegrasCores()
      .then(r => setForm({ ...CORES_PADRAO, ...(r || {}) }))
      .catch(e => setErro(e.message || String(e)))
      .finally(() => setCarregando(false))
  }, [aberto])

  if (!aberto) return null

  const salvar = async () => {
    for (const g of GRUPOS) {
      const v = Number(form[`${g.chave}_verde`]), a = Number(form[`${g.chave}_amarelo`])
      if (Number.isNaN(v) || Number.isNaN(a) || v < 0 || a < 0) return setErro(`${g.titulo}: informe os percentuais.`)
      if (a > v) return setErro(`${g.titulo}: o amarelo não pode começar acima do verde.`)
    }
    setSalvando(true); setErro(null)
    try {
      await apiService.salvarBiPossibRegrasCores(form)
      onSalvo?.()
      onFechar()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvando(false) }
  }

  const campo = 'h-8 w-full rounded-md border border-slate-300 px-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d8f]/30'

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4" onClick={onFechar}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 bg-[#1a4d8f] rounded-t-lg">
          <div>
            <p className="text-sm font-bold text-white">Regras dos indicadores</p>
            <p className="text-[11px] text-white/80">A partir de quantos % cada indicador fica verde, amarelo ou vermelho</p>
          </div>
          <button type="button" onClick={onFechar} className="text-white/80 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-3">
          {erro && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">{erro}</div>}
          {carregando ? (
            <div className="p-6 text-center text-slate-400"><Loader2 className="inline h-4 w-4 animate-spin" /></div>
          ) : GRUPOS.map(g => {
            const v = form[`${g.chave}_verde`], a = form[`${g.chave}_amarelo`]
            return (
              <div key={g.chave} className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] font-bold uppercase text-slate-700">{g.titulo}</p>
                <p className="text-[11px] text-slate-500 mb-2">{g.ajuda}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600"><span className="inline-block h-2 w-2 rounded-full bg-[#0ca30c] mr-1" />Verde a partir de (%)</label>
                    <input type="number" min="0" step="0.5" value={v} onChange={e => setForm(f => ({ ...f, [`${g.chave}_verde`]: e.target.value }))} className={campo} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600"><span className="inline-block h-2 w-2 rounded-full bg-[#fab219] mr-1" />Amarelo a partir de (%)</label>
                    <input type="number" min="0" step="0.5" value={a} onChange={e => setForm(f => ({ ...f, [`${g.chave}_amarelo`]: e.target.value }))} className={campo} />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Abaixo de {a || 0}% <strong className="text-[#d03b3b]">vermelho</strong> · de {a || 0}% até {v || 0}% <strong className="text-[#c98a00]">amarelo</strong> · a partir de {v || 0}% <strong className="text-[#0ca30c]">verde</strong>
                </p>
              </div>
            )
          })}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onFechar} className="h-8 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando || carregando}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-[#1a4d8f] text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
