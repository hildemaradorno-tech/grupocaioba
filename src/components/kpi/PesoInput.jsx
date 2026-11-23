import React, { useEffect, useState } from 'react'

// Campo editável do "Peso" de um indicador da Matriz KPIs (Bloco 3 - Serviços, Gerentes e Peças) — grava no
// Supabase ao sair do campo (Enter/Tab/clique fora), igual para qualquer usuário.
// maxPermitido (23/11/2026): quanto este indicador ainda pode ter sem a soma do quadro passar de 100%
// (100 − pesos dos outros indicadores). Valor acima disso não é gravado: o campo volta ao anterior e mostra o
// máximo. Campo apagado = sem peso (grava 0).
export default function PesoInput({ value, onSave, maxPermitido = 100 }) {
  const [draft, setDraft]   = useState(value ? Math.round(value * 100) : '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro]     = useState(null) // texto do aviso (acima do máximo / falha ao gravar)

  useEffect(() => {
    setDraft(value ? Math.round(value * 100) : '')
  }, [value])

  const limite = Math.max(0, Math.min(100, Math.round(maxPermitido)))

  const commit = async () => {
    const atual = value ? Math.round(value * 100) : ''
    if (draft === atual || draft === String(atual)) { setErro(null); return }
    const num = draft === '' ? 0 : Math.round(Number(draft))
    if (isNaN(num) || num < 0) { setDraft(atual); return }
    if (num > limite) {
      setErro(`Máx. ${limite}% — a soma do quadro passaria de 100%`)
      setDraft(atual)
      return
    }
    setSaving(true)
    setErro(null)
    try {
      await onSave(num / 100)
    } catch (err) {
      console.warn('[KPI] Falha ao salvar peso:', err.message)
      setErro('Não foi possível gravar o peso')
      setDraft(atual)
    } finally {
      setSaving(false)
    }
  }

  return (
    <span className="relative inline-flex items-center justify-center gap-0.5" title={erro || `Máximo ${limite}% (a soma do quadro não pode passar de 100%)`}>
      <input
        type="number" min={0} max={limite} step={1}
        value={draft}
        disabled={saving}
        onChange={e => { setDraft(e.target.value); setErro(null) }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`w-12 text-center border rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 disabled:opacity-50 ${
          erro ? 'border-red-400 bg-red-50' : 'border-slate-200'
        }`}
      />
      <span className="text-slate-400">%</span>
      {erro && (
        <span className="absolute left-1/2 top-full z-20 mt-0.5 -translate-x-1/2 whitespace-nowrap rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
          {erro}
        </span>
      )}
    </span>
  )
}

// Célula "Total" da coluna Peso: 100% normal; menor (ou maior, dado antigo) em vermelho, destacado.
export function TotalPeso({ total }) {
  const ok = total === 100
  return (
    <span
      title={ok ? 'Pesos completos (100%)' : total < 100 ? `Faltam ${100 - total}% para completar 100%` : `Passou ${total - 100}% de 100% — ajuste os pesos`}
      className={ok ? '' : 'inline-block rounded px-1.5 py-0.5 bg-red-100 text-red-700 font-bold ring-1 ring-red-300'}
    >
      {total}%
    </span>
  )
}
