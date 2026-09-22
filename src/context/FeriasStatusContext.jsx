import React, { createContext, useContext, useState } from 'react'

// O botão "Atualizar Férias"/"Férias Atualizadas" mora no título compartilhado da página
// (FolhaPagamentoDaf.jsx, ao lado de "Comissões Pós-Vendas"), só quando a aba ativa é uma das de
// Cálculo de Comissões — mas quem sabe se o arquivo de férias está desatualizado é o próprio
// CalculoComissoes.jsx (também usa isso pra bloquear o botão Calcular). Mesmo padrão de
// KpiSourceStatusContext: a aba ativa publica aqui, o pai lê sem precisar subir o fetch inteiro.
const FeriasStatusContext = createContext(null)

export function FeriasStatusProvider({ children }) {
  const [status, setStatus] = useState({ desatualizada: false, atualizada: false })
  return (
    <FeriasStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </FeriasStatusContext.Provider>
  )
}

const NOOP = { status: { desatualizada: false, atualizada: false }, setStatus: () => {} }

export function useFeriasStatus() {
  return useContext(FeriasStatusContext) || NOOP
}
