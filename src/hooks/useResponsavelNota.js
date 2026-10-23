import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

// Nome completo (ou nome no sistema) e cargo do usuário logado, usados na assinatura da Nota de Débito.
// Busca no cadastro de Usuários na hora, para valer o que estiver salvo sem precisar sair e entrar.
export function useResponsavelNota() {
  const { userNome, userNomeCompleto, userCargoId, user } = useAuth()
  const [dados, setDados] = useState(null)
  useEffect(() => {
    let ativo = true
    apiService.getResponsavelUsuario(user?.email)
      .then(d => { if (ativo) setDados(d) })
      .catch(() => {})
    return () => { ativo = false }
  }, [user?.email])
  const [cargoAuth, setCargoAuth] = useState('')
  useEffect(() => {
    let ativo = true
    if (!dados) apiService.getNomeCargo(userCargoId).then(n => { if (ativo) setCargoAuth(n) }).catch(() => {})
    return () => { ativo = false }
  }, [userCargoId, dados])
  return {
    nome: dados?.nome_completo || dados?.nome || userNomeCompleto || userNome || user?.email || '',
    cargo: dados ? dados.cargo : cargoAuth,
  }
}
