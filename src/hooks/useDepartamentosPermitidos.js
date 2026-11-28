import { useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

// Regra geral "Acesso por Departamento" do grupo (Grupos de Acessos; departamentos de Configurações →
// Departamentos), considerando "Visualizar como". Administrador ou grupo em "Todos" = sem restrição.
// Use em qualquer tela que precise restringir dados por departamento.
export function useDepartamentosPermitidos() {
  const { departamentosPermitidosEfetivos } = useAuth()
  const restrito = (departamentosPermitidosEfetivos?.size || 0) > 0
  const permiteDepartamento = useCallback((nome) => {
    if (!restrito) return true
    const n = normalizar(nome)
    for (const d of departamentosPermitidosEfetivos) if (normalizar(d) === n) return true
    return false
  }, [restrito, departamentosPermitidosEfetivos])
  return { restrito, permiteDepartamento, departamentos: departamentosPermitidosEfetivos }
}
