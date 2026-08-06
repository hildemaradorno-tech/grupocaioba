import { useState, useCallback } from 'react'

export function useSessionState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key)
      return saved !== null ? JSON.parse(saved) : initialValue
    } catch { return initialValue }
  })

  const setValue = useCallback((value) => {
    setState(prev => {
      const next = typeof value === 'function' ? value(prev) : value
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [state, setValue]
}
