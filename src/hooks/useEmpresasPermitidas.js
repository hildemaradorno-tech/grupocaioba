import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

export const normalizarEmpresa = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Empresas que o usuário pode ver nos dashboards: as liberadas no grupo de acesso ("Acesso por Empresa"),
// considerando "Visualizar como". Administrador vê todas. Fontes que trazem só o nome/sigla da empresa
// são casadas com fantasia, nome oficial, nome no sistema e sigla do cadastro de Empresas, sem
// diferenciar acento e maiúscula.
export function useEmpresasPermitidas() {
  const { isAdminEfetivo, empresasPermitidasEfetivas } = useAuth()
  const restrito = !isAdminEfetivo
  const [empresas, setEmpresas] = useState([])
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    apiService.getEmpresas().then(setEmpresas).catch(() => {}).finally(() => setCarregado(true))
  }, [])

  const permitidas = useMemo(
    () => (restrito ? empresas.filter(e => empresasPermitidasEfetivas.has(e.id)) : empresas),
    [empresas, restrito, empresasPermitidasEfetivas]
  )
  const idsPermitidos = useMemo(() => new Set(permitidas.map(e => e.id)), [permitidas])
  const nomesPermitidos = useMemo(() => {
    const set = new Set()
    for (const e of permitidas) {
      for (const n of [e.empresa_fantasia, e.nome_empresa, e.nome_empresa_sistema, e.sigla_empresa]) if (n) set.add(normalizarEmpresa(n))
    }
    return set
  }, [permitidas])

  // Sem restrição (admin) tudo passa; com restrição, só o que estiver no grupo.
  const permiteId = useCallback((id) => !restrito || idsPermitidos.has(id), [restrito, idsPermitidos])
  const permiteNome = useCallback((nome) => !restrito || nomesPermitidos.has(normalizarEmpresa(nome)), [restrito, nomesPermitidos])

  return { restrito, permitidas, idsPermitidos, permiteId, permiteNome, carregado }
}
