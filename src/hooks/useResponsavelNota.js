import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

// Nome completo (ou nome no sistema), cargo e assinatura do usuário da Nota de Débito. Em "Visualizar
// como", usa o usuário visualizado — a nota sai igual à que ele veria. Busca no cadastro de Usuários
// na hora, para valer o que estiver salvo sem precisar sair e entrar.
export function useResponsavelNota() {
  const { userNome, userNomeCompleto, cargoIdEfetivo, user, impersonando } = useAuth()
  const emailEfetivo = impersonando?.email || user?.email
  const [dados, setDados] = useState(null)
  useEffect(() => {
    let ativo = true
    setDados(null)
    apiService.getResponsavelUsuario(emailEfetivo)
      .then(d => { if (ativo) setDados(d) })
      .catch(() => {})
    return () => { ativo = false }
  }, [emailEfetivo])
  // Imagem da assinatura do funcionário vinculado ao usuário (cadastro de Funcionários); sem vínculo ou sem imagem, fica vazia.
  const [assinatura, setAssinatura] = useState('')
  useEffect(() => {
    let ativo = true
    if (!dados?.funcionario_id) { setAssinatura(''); return }
    apiService.getAssinaturaFuncionario(dados.funcionario_id)
      .then(img => { if (ativo) setAssinatura(img || '') })
      .catch(() => {})
    return () => { ativo = false }
  }, [dados?.funcionario_id])
  const [cargoAuth, setCargoAuth] = useState('')
  useEffect(() => {
    let ativo = true
    if (!dados) apiService.getNomeCargo(cargoIdEfetivo).then(n => { if (ativo) setCargoAuth(n) }).catch(() => {})
    return () => { ativo = false }
  }, [cargoIdEfetivo, dados])
  return {
    nome: dados?.nome_completo || dados?.nome
      || (impersonando ? (impersonando.nome || impersonando.email) : (userNomeCompleto || userNome || user?.email)) || '',
    cargo: dados ? dados.cargo : cargoAuth,
    assinatura,
  }
}
