import React, { createContext, useContext, useState } from 'react'

// Cada aba da Matriz KPIs busca seus próprios dados (useKpiData) e publica aqui se veio do
// SharePoint ou é mock — o badge "Dados sincronizados" mora no cabeçalho compartilhado
// (KpiMatriz.jsx, ao lado do seletor de Ano), não em cada aba, então precisa saber o status
// da aba ativa sem subir o fetch inteiro pro componente pai.
const KpiSourceStatusContext = createContext(null)

export function KpiSourceStatusProvider({ children }) {
  const [status, setStatus] = useState({ source: null, loading: false })
  return (
    <KpiSourceStatusContext.Provider value={{ status, setStatus }}>
      {children}
    </KpiSourceStatusContext.Provider>
  )
}

// Fora do provider (ou aba sem useKpiData) devolve um no-op — nunca quebra quem chama.
const NOOP = { status: { source: null, loading: false }, setStatus: () => {} }

export function useKpiSourceStatus() {
  return useContext(KpiSourceStatusContext) || NOOP
}
