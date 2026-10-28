import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Empresas que o usuário pode ver em Garantias DAF (inclusive em "Visualizar como"). Os arquivos do
// SharePoint trazem só o nome da empresa, então o nome é casado com fantasia, nome oficial e nome no
// sistema do cadastro de Empresas, sem diferenciar acento e maiúscula.
export function useEmpresasGarantias() {
  const { isAdminEfetivo, empresasPermitidasEfetivas } = useAuth()
  const restrito = !isAdminEfetivo
  const [empresas, setEmpresas] = useState([])

  useEffect(() => {
    apiService.getEmpresas().then(setEmpresas).catch(() => {})
  }, [])

  const nomesPermitidos = useMemo(() => {
    const set = new Set()
    for (const e of empresas) {
      if (!empresasPermitidasEfetivas.has(e.id)) continue
      for (const n of [e.empresa_fantasia, e.nome_empresa, e.nome_empresa_sistema]) if (n) set.add(normalizar(n))
    }
    return set
  }, [empresas, empresasPermitidasEfetivas])

  const permiteId = useCallback((id) => !restrito || empresasPermitidasEfetivas.has(id), [restrito, empresasPermitidasEfetivas])
  const permiteNome = useCallback((nome) => !restrito || nomesPermitidos.has(normalizar(nome)), [restrito, nomesPermitidos])

  // Filtro para as consultas do Supabase (mesmo formato já usado pelas telas)
  const filtrosEmpresa = useMemo(
    () => (restrito ? { empresa_ids: [...empresasPermitidasEfetivas] } : {}),
    [restrito, empresasPermitidasEfetivas]
  )

  return { restrito, permiteId, permiteNome, filtrosEmpresa, carregado: !restrito || empresas.length > 0 }
}
