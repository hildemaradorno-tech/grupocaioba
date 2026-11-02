import React from 'react'
import { MultiSearchCombobox } from './SearchCombobox'

// Filtro de Empresa com seleção múltipla: nenhuma marcada = todas as empresas.
// No topo da lista, um atalho por Agrupamento (ex.: Caiobá Trucks, Caiobá Motos) marca/desmarca todas as empresas dele.
export function EmpresaMultiFilter({ value, onChange, empresas }) {
  const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa
  const porGrupo = new Map()
  empresas.forEach(e => {
    const g = e.agrupamento_nome
    if (!g) return
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g).push(e.id)
  })
  const grupos = [...porGrupo.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
    .map(([nome, ids]) => ({ id: nome, label: nome.toUpperCase(), ids }))
  return (
    <MultiSearchCombobox
      value={value}
      onChange={onChange}
      grupos={grupos}
      opcoes={empresas}
      placeholder="Todas as empresas"
      searchPlaceholder="Buscar empresa..."
      notFoundLabel="Nenhuma empresa encontrada."
      getLabel={nomeEmpresa}
      getSearchText={nomeEmpresa}
      resumo={(sel) => sel.length === empresas.length ? 'Todas as empresas' : sel.length === 1 ? nomeEmpresa(sel[0]) : `${sel.length} empresas selecionadas`}
    />
  )
}

// Empresas que entram no filtro das telas de Metas (mesma lista em todas as abas): Caiobá Trucks e Caiobá Motos.
// Empresas "Visual" (ex.: CAIOBÁ MOTOS / CAIOBÁ TRUCKS, só de agrupamento) não recebem meta — ficam fora.
export const empresasDasMetas = (emps) => emps.filter(e => ['Caiobá Trucks', 'Caiobá Motos'].includes(e.agrupamento_nome) && !e.empresa_visual)

// Com exatamente uma empresa a API filtra direto; com várias (ou nenhuma) busca tudo e filtra em memória.
export const empresaParam = (ids) => (ids.length === 1 ? ids[0] : null)
export const filtrarPorEmpresas = (rows, ids) => (ids.length > 1 ? rows.filter(r => ids.includes(r.empresa_id)) : rows)
// Empresa a pré-preencher nos modais de Incluir: só quando o filtro tem exatamente uma.
export const empresaUnica = (ids) => (ids.length === 1 ? ids[0] : '')
