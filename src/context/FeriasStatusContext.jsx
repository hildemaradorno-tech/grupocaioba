import React, { createContext, useContext, useState } from 'react'

// O botão "Atualizar Férias"/"Férias Atualizadas" mora no cabeçalho de CalculoComissoes.jsx —
// mas quem sabe se o arquivo de férias está desatualizado é o próprio CalculoComissoes.jsx
// (também usa isso pra bloquear o botão Calcular). Mesmo padrão de KpiSourceStatusContext.
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
