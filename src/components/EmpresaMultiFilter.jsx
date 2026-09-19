import React from 'react'
import { MultiSearchCombobox } from './SearchCombobox'

// Filtro de Empresa com seleção múltipla: nenhuma marcada = todas as empresas.
export function EmpresaMultiFilter({ value, onChange, empresas }) {
  const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa
  return (
    <MultiSearchCombobox
      value={value}
      onChange={onChange}
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
export const empresasDasMetas = (emps) => emps.filter(e => ['Caiobá Trucks', 'Caiobá Motos'].includes(e.agrupamento_nome))

// Com exatamente uma empresa a API filtra direto; com várias (ou nenhuma) busca tudo e filtra em memória.
export const empresaParam = (ids) => (ids.length === 1 ? ids[0] : null)
export const filtrarPorEmpresas = (rows, ids) => (ids.length > 1 ? rows.filter(r => ids.includes(r.empresa_id)) : rows)
// Empresa a pré-preencher nos modais de Incluir: só quando o filtro tem exatamente uma.
export const empresaUnica = (ids) => (ids.length === 1 ? ids[0] : '')
