import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

// Regra geral "Acesso por Setor" do grupo (Grupos de Acessos; setores de Configurações → Setor de Serviços),
// considerando "Visualizar como". Administrador ou grupo em "Todos" = sem restrição. Use em qualquer tela
// que precise mostrar só os setores do usuário (por id ou pelo nome do setor).
export function useSetoresPermitidos() {
  const { isAdminEfetivo, user, impersonando } = useAuth()
  const email = impersonando?.email || user?.email
  const [escopo, setEscopo] = useState(null) // { modo, setorIds:Set, nomes:Set } | null enquanto carrega

  useEffect(() => {
    let ativo = true
    if (isAdminEfetivo || !email) { setEscopo({ modo: 'TODOS', setorIds: new Set(), nomes: new Set() }); return }
    apiService.getEscopoSetorDoUsuario(email)
      .then(r => { if (ativo) setEscopo(r) })
      .catch(() => { if (ativo) setEscopo({ modo: 'TODOS', setorIds: new Set(), nomes: new Set() }) })
    return () => { ativo = false }
  }, [isAdminEfetivo, email])

  const restrito = escopo?.modo === 'INDIVIDUAL'
  const nomesNorm = useMemo(() => new Set([...(escopo?.nomes || [])].map(normalizar)), [escopo])
  const permiteSetorId = useCallback((id) => !restrito || escopo.setorIds.has(id), [restrito, escopo])
  const permiteSetorNome = useCallback((nome) => !restrito || nomesNorm.has(normalizar(nome)), [restrito, nomesNorm])

  return { carregado: escopo !== null, restrito, permiteSetorId, permiteSetorNome }
}
