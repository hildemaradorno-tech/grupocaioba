import React, { useMemo, useState } from 'react'
import { INPUT, LABEL } from './ControladoriaNav'

export const siglaEmpresa = (e) => e?.sigla_empresa || e?.empresa_fantasia || e?.nome_empresa || '?'
export const nomeEmpresaCompleto = (e) => e ? `${e.codigo_empresa} — ${e.empresa_fantasia || e.nome_empresa}` : ''

// Lista de empresas com checkbox: filtro por agrupamento, "Marcar todas" (as que estão aparecendo),
// "Desmarcar todas" e, quando informado o sistema (ex.: Dealer.net), atalho pra marcar as empresas
// daquele DMS (dim_empresas.sistema_dms).
export default function SeletorEmpresas({ empresas, value, onChange, sistemaNome, titulo = 'Empresas', obrigatorio = false }) {
  const [agrupamento, setAgrupamento] = useState('')
  const ativas = useMemo(() => empresas.filter(e => e.ativo !== false || value.includes(e.id)), [empresas, value])
  const agrupamentos = useMemo(
    () => [...new Set(ativas.map(e => e.agrupamento_nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [ativas]
  )
  const listadas = useMemo(() => agrupamento ? ativas.filter(e => e.agrupamento_nome === agrupamento) : ativas, [ativas, agrupamento])
  const doSistema = useMemo(
    () => sistemaNome ? ativas.filter(e => (e.sistema_dms || '').toLowerCase() === sistemaNome.toLowerCase()) : [],
    [ativas, sistemaNome]
  )
  const marcar = (ids) => onChange([...new Set([...value, ...ids])])
  const alternar = (id) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        <label className={LABEL}>{titulo}{obrigatorio ? ' *' : ''} <span className="normal-case font-semibold text-slate-400">({value.length} marcada(s))</span></label>
        <select value={agrupamento} onChange={e => setAgrupamento(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto py-1 pr-7 ml-auto`}>
          <option value="">Todos os agrupamentos</option>
          {agrupamentos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <button type="button" onClick={() => marcar(listadas.map(e => e.id))} className="text-[11px] font-semibold text-blue-600 hover:underline whitespace-nowrap">Marcar todas</button>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline whitespace-nowrap">Desmarcar todas</button>
        )}
      </div>
      {doSistema.length > 0 && (
        <button type="button" onClick={() => marcar(doSistema.map(e => e.id))} className="self-start text-[11px] font-semibold text-indigo-600 hover:underline">
          Marcar as {doSistema.length} empresa(s) do {sistemaNome}
        </button>
      )}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 border border-slate-200 rounded-lg p-2.5 max-h-44 overflow-y-auto">
        {listadas.map(e => (
          <label key={e.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5 min-w-0">
            <input type="checkbox" checked={value.includes(e.id)} onChange={() => alternar(e.id)} className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium truncate" title={nomeEmpresaCompleto(e)}>{nomeEmpresaCompleto(e)}</span>
            {e.sistema_dms && <span className="text-[10px] text-slate-400 shrink-0">{e.sistema_dms}</span>}
          </label>
        ))}
        {listadas.length === 0 && <p className="text-[11px] text-slate-400 col-span-2">Nenhuma empresa.</p>}
      </div>
    </div>
  )
}
