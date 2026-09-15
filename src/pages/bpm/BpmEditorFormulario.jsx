import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

export const TIPOS_CAMPO = ['texto', 'texto_longo', 'numero', 'booleano', 'selecao']

// Mesma normalização usada no resto do módulo BPM para nomes/chaves, mas com "_" (convenção das
// chaves de campo, ex.: valor_nf) e sem cair num valor padrão quando vazio.
export function slugifyChave(texto) {
  return String(texto || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
}

// Editor da lista de campos de um formulário — usado tanto no Modelador BPMN (campos de uma user
// task/evento de início) quanto no cadastro de Modelos de Formulário (BpmModelosFormulario.jsx),
// pra manter a mesma UX nos dois lugares.
// "Rótulo" é o texto que a pessoa vê no formulário (ex.: "Valor da NF-e"). "Chave" é o nome
// interno usado pelo motor para guardar/consultar essa resposta (ex.: valor_nf — sem espaço nem
// acento, é isso que entra numa condição de gateway) — normalmente nem precisa mexer nela, é
// gerada sozinha a partir do rótulo; só edite se quiser um nome específico.
export default function EditorFormulario({ campos, onChange }) {
  const lista = campos || []
  const atualizar = (i, patch) => onChange(lista.map((c, idx) => idx === i ? { ...c, ...patch } : c))
  const remover = (i) => onChange(lista.filter((_, idx) => idx !== i))
  const adicionar = () => onChange([...lista, { key: '', label: '', tipo: 'texto' }])

  const alterarRotulo = (i, novoRotulo) => {
    const campo = lista[i]
    const chaveAutomatica = !campo.key || campo.key === slugifyChave(campo.label)
    atualizar(i, { label: novoRotulo, key: chaveAutomatica ? slugifyChave(novoRotulo) : campo.key })
  }

  return (
    <div className="flex flex-col gap-2">
      {lista.map((campo, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-2 flex flex-col gap-1.5 bg-slate-50">
          <div className="flex items-end gap-1.5">
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-400 uppercase">Rótulo — texto que a pessoa vê no formulário</span>
              <input placeholder="ex.: Valor da NF-e" value={campo.label} onChange={e => alterarRotulo(i, e.target.value)}
                className="text-[11px] p-1.5 border border-slate-200 rounded" />
            </div>
            <button onClick={() => remover(i)} className="text-slate-400 hover:text-red-600 px-1 pb-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase">Chave — identificador interno (gerado automaticamente, só mude se precisar)</span>
            <input placeholder="ex.: valor_nf" value={campo.key} onChange={e => atualizar(i, { key: e.target.value })}
              className="text-[11px] p-1.5 border border-slate-200 rounded w-full font-mono" />
          </div>
          <div className="flex gap-1.5">
            <select value={campo.tipo} onChange={e => atualizar(i, { tipo: e.target.value })} className="text-[11px] p-1.5 border border-slate-200 rounded bg-white">
              {TIPOS_CAMPO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {campo.tipo === 'selecao' && (
              <input placeholder="opções separadas por vírgula" value={(campo.opcoes || []).join(', ')}
                onChange={e => atualizar(i, { opcoes: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                className="text-[11px] p-1.5 border border-slate-200 rounded flex-1" />
            )}
            <label className="text-[10px] text-slate-500 flex items-center gap-1 shrink-0">
              <input type="checkbox" checked={!!campo.obrigatorio} onChange={e => atualizar(i, { obrigatorio: e.target.checked })} /> obrigatório
            </label>
          </div>
        </div>
      ))}
      <button onClick={adicionar} className="flex items-center justify-center gap-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg py-1.5">
        <Plus className="h-3.5 w-3.5" /> Adicionar campo
      </button>
    </div>
  )
}
