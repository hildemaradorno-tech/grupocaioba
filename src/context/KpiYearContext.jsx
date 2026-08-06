import React, { createContext, useContext, useState } from 'react'

const KpiYearContext = createContext(null)

const currentYear = new Date().getFullYear()
export const KPI_YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)

export function KpiYearProvider({ children }) {
  const [year, setYearState] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem('kpi_year') || '', 10)
      return KPI_YEARS.includes(saved) ? saved : currentYear
    } catch { return currentYear }
  })

  const setYear = (y) => {
    try { localStorage.setItem('kpi_year', String(y)) } catch {}
    setYearState(y)
  }

  return (
    <KpiYearContext.Provider value={{ year, setYear }}>
      {children}
    </KpiYearContext.Provider>
  )
}

export function useKpiYear() {
  const ctx = useContext(KpiYearContext)
  if (!ctx) throw new Error('useKpiYear must be used inside KpiYearProvider')
  return ctx
}
