import React from 'react'
import { X, AlertTriangle, Briefcase, CheckSquare, Square } from 'lucide-react'

// Formulário de cargo (Incluir / Editar) — extraído de Cargos.jsx em 18/11/2026 para ser reaproveitado
// na importação de funcionários (cargo não encontrado → abre este formulário já preenchido com
// nome, código e empresa da planilha, para completar nível, agrupamento, departamentos e setores).
// O estado do formulário fica com quem chama (form / setForm).

export const NIVEIS_CARGO = ['Operacional', 'Líder', 'Coordenação', 'Supervisão', 'Gerência', 'Direção', 'Departamento']

// Nome do cargo é sempre gravado em maiúsculas — padronizado em todo o sistema.
export const toUpperCargo = (str) => String(str || '').trim().replace(/\s+/g, ' ').toUpperCase()

export const formCargoVazio = (agrupamentos = []) => ({
  nome_cargo: '', tipo_contratacao: 'CLT', codigo_cargo_clt: '', codigo_cargo_pj: '',
  agrupamento_id: agrupamentos[0]?.id || '', empresa_id: '', departamento_ids: [], setor_ids: [], nivel_cargo: '',
})

function CheckList({ itens, campo, subcampo, selecionados, onToggle }) {
  // Selecionados sobem pro topo — facilita ver de cara o que já está marcado numa lista longa.
  const ordenados = [...itens].sort((a, b) =>
    (selecionados.includes(b.id) ? 1 : 0) - (selecionados.includes(a.id) ? 1 : 0)
  )
  return (
    <div className="max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 space-y-1 custom-scrollbar">
      {ordenados.length === 0 ? (
        <p className="text-xs text-slate-400 p-1">Nenhum registro.</p>
      ) : ordenados.map(item => {
        const sel = selecionados.includes(item.id)
        return (
          <div
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 p-1.5 rounded cursor-pointer text-xs font-semibold select-none transition-colors ${
              sel ? 'bg-blue-50/60 text-blue-900 border border-blue-200/50' : 'text-slate-700 hover:bg-slate-100 border border-transparent'
            }`}
          >
            {sel
              ? <CheckSquare className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              : <Square className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            }
            <span>
              {item[campo]}
              {subcampo && item[subcampo] && (
                <span className="ml-1 text-[10px] font-normal italic text-slate-400">({item[subcampo]})</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function CargoFormModal({
  titulo, form, setForm, agrupamentos, departamentos, setores, empresas,
  erro, salvando = false, onCancel, onSubmit, aviso = null, zIndex = 'z-50',
}) {
  const toggleDepartamento = (id) => setForm(prev => ({
    ...prev,
    departamento_ids: prev.departamento_ids.includes(id)
      ? prev.departamento_ids.filter(d => d !== id)
      : [...prev.departamento_ids, id],
  }))
  const toggleSetor = (id) => setForm(prev => ({
    ...prev,
    setor_ids: prev.setor_ids.includes(id)
      ? prev.setor_ids.filter(s => s !== id)
      : [...prev.setor_ids, id],
  }))

  return (
    <div className={`fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center ${zIndex}`}>
      <div className="bg-white rounded-lg border border-slate-200 w-[920px] max-h-[92vh] shadow-xl overflow-hidden animate-scale-in flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-blue-600" />
            {titulo}
          </h3>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col overflow-hidden">
          <div className="p-5 space-y-4 overflow-y-auto">
            {aviso}

            {/* Nome do Cargo | CLT ou PJ */}
            <div className="flex items-end gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Cargo *</label>
                <input
                  type="text"
                  required
                  value={form.nome_cargo}
                  onChange={(e) => setForm(prev => ({ ...prev, nome_cargo: e.target.value }))}
                  onBlur={(e) => setForm(prev => ({ ...prev, nome_cargo: toUpperCargo(e.target.value) }))}
                  placeholder="Ex: Técnico de Manutenção"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Contratação</label>
                <div className="flex border border-slate-200 rounded-md overflow-hidden">
                  {['CLT', 'PJ'].map(tipo => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, tipo_contratacao: tipo }))}
                      className={`px-3 py-2 text-xs font-bold transition-colors ${
                        form.tipo_contratacao === tipo
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Nível do Cargo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nível do Cargo</label>
              <div className="flex flex-wrap gap-2">
                {NIVEIS_CARGO.map(nivel => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, nivel_cargo: prev.nivel_cargo === nivel ? '' : nivel }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      form.nivel_cargo === nivel
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {nivel}
                  </button>
                ))}
              </div>
            </div>

            {/* Código | Empresa | Agrupamento */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código do Cargo</label>
                <input
                  type="text"
                  value={form.tipo_contratacao === 'PJ' ? form.codigo_cargo_pj : form.codigo_cargo_clt}
                  onChange={(e) => setForm(prev => (
                    prev.tipo_contratacao === 'PJ'
                      ? { ...prev, codigo_cargo_pj: e.target.value }
                      : { ...prev, codigo_cargo_clt: e.target.value }
                  ))}
                  placeholder="Ex: CGO-001"
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                {form.tipo_contratacao === 'PJ' && form.codigo_cargo_clt && (
                  <span className="text-[10px] text-slate-400">CLT: {form.codigo_cargo_clt}</span>
                )}
                {form.tipo_contratacao === 'CLT' && form.codigo_cargo_pj && (
                  <span className="text-[10px] text-slate-400">PJ: {form.codigo_cargo_pj}</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Empresa</label>
                <select
                  value={form.empresa_id}
                  onChange={(e) => setForm(prev => ({ ...prev, empresa_id: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">— Selecione —</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa} — {e.cnpj}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Agrupamento *</label>
                <select
                  value={form.agrupamento_id}
                  onChange={(e) => setForm(prev => ({ ...prev, agrupamento_id: e.target.value }))}
                  required
                  className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Selecione um agrupamento</option>
                  {agrupamentos.map(a => (
                    <option key={a.id} value={a.id}>{a.nome_agrupamento_cargo}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Área | Departamentos | Setores */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  Área
                  <span className="text-[9px] font-normal text-slate-400 normal-case">(automático)</span>
                </label>
                <div className="max-h-[150px] overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50/50 flex flex-wrap gap-1.5 content-start custom-scrollbar">
                  {(() => {
                    const areas = [...new Set(
                      form.departamento_ids
                        .map(id => departamentos.find(d => d.id === id)?.area)
                        .filter(Boolean)
                    )]
                    return areas.length > 0
                      ? areas.map(area => (
                          <span key={area} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {area}
                          </span>
                        ))
                      : <p className="text-xs text-slate-400 p-1">Selecione departamentos.</p>
                  })()}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Departamentos</label>
                <CheckList
                  itens={departamentos}
                  campo="nome_departamento"
                  subcampo="agrupamento_departamento_nome"
                  selecionados={form.departamento_ids}
                  onToggle={toggleDepartamento}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                  Setores
                  {form.departamento_ids.length > 0 && (
                    <span className="text-[9px] font-normal text-slate-400 normal-case">(só dos departamentos marcados)</span>
                  )}
                </label>
                <CheckList
                  itens={form.departamento_ids.length === 0 ? setores : setores.filter(s => form.departamento_ids.includes(s.departamento_id))}
                  campo="nome_setor"
                  selecionados={form.setor_ids}
                  onToggle={toggleSetor}
                />
              </div>
            </div>
          </div>

          {erro && (
            <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erro}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
            <button type="button" onClick={onCancel}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={salvando}
              className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
              {salvando ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
