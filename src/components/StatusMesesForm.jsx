import React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// Avalia cada mês do formulário. Um mês só "está em uso" quando algum campo-gatilho (digitado pelo usuário,
// não pré-preenchido pelo calendário) tem valor; aí todos os campos obrigatórios dele precisam estar preenchidos.
// Meses totalmente vazios são ignorados — não é preciso preencher todos os meses.
//   gatilhos:     [(m) => boolean]           algum true => mês em uso
//   obrigatorios: [{ label, ok: (m) => boolean }]
export function avaliarMeses(mesesForm, { gatilhos, obrigatorios }, isLocked = () => false) {
  return mesesForm.map((m, i) => {
    if (isLocked(i)) return { mes: m.mes, emUso: false, faltando: [] }
    const emUso = gatilhos.some(g => g(m))
    const faltando = emUso ? obrigatorios.filter(o => !o.ok(m)).map(o => o.label) : []
    return { mes: m.mes, emUso, faltando }
  })
}

export const mesesIncompletos = (avaliacao) => avaliacao.filter(a => a.faltando.length > 0)

export function mensagemMesesIncompletos(avaliacao) {
  const inc = mesesIncompletos(avaliacao)
  if (!inc.length) return null
  return 'Há meses com informações incompletas — preencha todos os campos do mês ou deixe-o totalmente vazio: '
    + inc.map(a => `${MESES_ABR[a.mes - 1]} (falta ${a.faltando.join(', ')})`).join('; ') + '.'
}

// Linha da grade: um selo por mês (Completo / Incompleto / vazio)
export function LinhaStatusMes({ avaliacao, label = 'Situação do mês' }) {
  return (
    <tr>
      <td className="text-xs font-semibold text-slate-500 px-1 whitespace-nowrap">{label}</td>
      {avaliacao.map(a => (
        <td key={a.mes} className="p-1 text-center">
          {!a.emUso ? <span className="text-slate-300 text-xs">—</span>
            : a.faltando.length > 0
              ? <span title={`Falta: ${a.faltando.join(', ')}`} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold whitespace-nowrap"><AlertTriangle size={10} />Incompleto</span>
              : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold whitespace-nowrap"><CheckCircle2 size={10} />Completo</span>}
        </td>
      ))}
      <td />
    </tr>
  )
}

// Alerta sob a grade enquanto houver mês incompleto
export function AlertaMesesIncompletos({ avaliacao }) {
  const inc = mesesIncompletos(avaliacao)
  if (!inc.length) return null
  return (
    <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3 text-amber-800 text-xs">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">Meses com informações incompletas — não é possível salvar até completar (ou esvaziar) o mês:</div>
        <ul className="mt-1 list-disc pl-4">
          {inc.map(a => <li key={a.mes}><strong>{MESES_ABR[a.mes - 1]}</strong>: falta {a.faltando.join(', ')}</li>)}
        </ul>
      </div>
    </div>
  )
}
