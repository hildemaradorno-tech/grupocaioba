import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

// Garantias DAF é só do agrupamento Caiobá Trucks (cadastro de Empresas → Agrupamento).
const AGRUPAMENTO_GARANTIAS = 'caioba trucks'
const ehDoAgrupamento = (e) => normalizar(e.agrupamento_nome) === AGRUPAMENTO_GARANTIAS

// Empresas que o usuário pode ver em Garantias DAF: só as do agrupamento Caiobá Trucks e, para quem
// não é administrador, só as liberadas no grupo (inclusive em "Visualizar como"). Os arquivos do
// SharePoint trazem só o nome da empresa, então o nome é casado com fantasia, nome oficial e nome no
// sistema do cadastro de Empresas, sem diferenciar acento e maiúscula.
export function useEmpresasGarantias() {
  const { isAdminEfetivo, empresasPermitidasEfetivas } = useAuth()
  const restrito = !isAdminEfetivo
  const [empresas, setEmpresas] = useState([])

  useEffect(() => {
    apiService.getEmpresas().then(setEmpresas).catch(() => {})
  }, [])

  const permitidas = useMemo(
    () => empresas.filter(e => ehDoAgrupamento(e) && (!restrito || empresasPermitidasEfetivas.has(e.id))),
    [empresas, restrito, empresasPermitidasEfetivas]
  )
  const idsPermitidos = useMemo(() => new Set(permitidas.map(e => e.id)), [permitidas])
  const nomesPermitidos = useMemo(() => {
    const set = new Set()
    for (const e of permitidas) {
      for (const n of [e.empresa_fantasia, e.nome_empresa, e.nome_empresa_sistema]) if (n) set.add(normalizar(n))
    }
    return set
  }, [permitidas])

  const permiteId = useCallback((id) => idsPermitidos.has(id), [idsPermitidos])
  const permiteNome = useCallback((nome) => nomesPermitidos.has(normalizar(nome)), [nomesPermitidos])

  // Filtro para as consultas do Supabase (mesmo formato já usado pelas telas). Enquanto o cadastro
  // não carrega, administrador busca tudo (o que não for Trucks é tirado pelas telas via permiteNome).
  const filtrosEmpresa = useMemo(() => {
    if (restrito) return { empresa_ids: [...empresasPermitidasEfetivas].filter(id => empresas.length === 0 || idsPermitidos.has(id)) }
    return empresas.length > 0 ? { empresa_ids: [...idsPermitidos] } : {}
  }, [restrito, empresasPermitidasEfetivas, empresas.length, idsPermitidos])

  return { restrito, permiteId, permiteNome, filtrosEmpresa, carregado: empresas.length > 0 }
}
