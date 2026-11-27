import React, { useCallback, useMemo } from 'react'
import { MultiSearchCombobox } from './SearchCombobox'
import { useAuth } from '../context/AuthContext'

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

// Escopo do grupo de acesso ("Acesso por Empresa", considerando "Visualizar como"): quem não é administrador só
// vê as empresas liberadas no grupo. listar(emps) = empresas das Metas que o usuário pode ver (seletor e modais).
// efetivo(sel, lista) = filtro a aplicar nos dados: sem empresa marcada ("Todas") vira todas as PERMITIDAS;
// sem nenhuma permitida vira um id que não existe (nenhum dado). Administrador: tudo como antes.
const SEM_EMPRESA = ['00000000-0000-0000-0000-0000000000ff']
export function useEscopoEmpresasMetas() {
  const { isAdminEfetivo, empresasPermitidasEfetivas } = useAuth()
  const restrito = !isAdminEfetivo
  const listar = useCallback((emps) => {
    const metas = empresasDasMetas(emps || [])
    return restrito ? metas.filter(e => empresasPermitidasEfetivas.has(e.id)) : metas
  }, [restrito, empresasPermitidasEfetivas])
  const efetivo = useCallback((sel, lista) => {
    if (!restrito) return sel
    const ids = (lista || []).map(e => e.id)
    const ok = (sel || []).filter(id => ids.includes(id))
    if (ok.length) return ok
    return ids.length ? ids : SEM_EMPRESA
  }, [restrito])
  return { restrito, listar, efetivo }
}
// Mesmo filtro efetivo, já memorizado (a identidade do array só muda quando seleção/lista/escopo mudam —
// os useEffect de carga dependem dele).
export function useFiltroEmpresaEfetivo(sel, lista) {
  const { efetivo } = useEscopoEmpresasMetas()
  return useMemo(() => efetivo(sel, lista), [efetivo, sel, lista])
}

// Com exatamente uma empresa a API filtra direto; com várias (ou nenhuma) busca tudo e filtra em memória.
export const empresaParam = (ids) => (ids.length === 1 ? ids[0] : null)
export const filtrarPorEmpresas = (rows, ids) => (ids.length > 1 ? rows.filter(r => ids.includes(r.empresa_id)) : rows)
// Empresa a pré-preencher nos modais de Incluir: só quando o filtro tem exatamente uma.
export const empresaUnica = (ids) => (ids.length === 1 ? ids[0] : '')
