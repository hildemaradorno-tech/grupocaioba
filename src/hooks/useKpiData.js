import { useState, useEffect, useCallback } from 'react'

// Store module-level: persiste entre desmonte/remonte de componentes na mesma sessão.
// Chave = (referência da função fetch, paramsKey) — garante unicidade por endpoint+params.
const _store = new Map()

function getStored(fn, paramsKey) {
  return _store.get(fn)?.get(paramsKey) ?? null
}

function setStored(fn, paramsKey, value) {
  if (!_store.has(fn)) _store.set(fn, new Map())
  _store.get(fn).set(paramsKey, value)
}

/**
 * Hook genérico para carregar dados KPI do serviço (SharePoint ou mock).
 * Ao navegar de volta para a página, exibe os dados imediatamente (sem spinner)
 * enquanto re-valida em background.
 *
 * @param {Function} fetchFn  - função do kpiService (ex: fetchBloco1)
 * @param {*}        fallback - valor inicial enquanto carrega pela primeira vez
 * @param {Object}   params   - parâmetros extras passados para fetchFn (ex: { year, empresa })
 */
export function useKpiData(fetchFn, fallback, params = {}) {
  const paramsKey = JSON.stringify(params)
  const stored    = getStored(fetchFn, paramsKey)

  const [data,    setData]    = useState(stored?.data   ?? fallback)
  const [loading, setLoading] = useState(!stored)
  const [error,   setError]   = useState(null)
  const [source,  setSource]  = useState(stored?.source ?? null)

  const load = useCallback(async (extraParams = {}) => {
    const isForce = !!extraParams._forceReload
    // Mostra spinner apenas se não houver dado em cache ou for recarga forçada
    if (!getStored(fetchFn, paramsKey) || isForce) setLoading(true)
    setError(null)
    try {
      const result = await fetchFn({ ...params, ...extraParams })
      setStored(fetchFn, paramsKey, result)
      setData(result.data)
      setSource(result.source)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, paramsKey])

  useEffect(() => { load() }, [load])

  const forceReload = useCallback(() => load({ _forceReload: true }), [load])

  return { data, loading, error, source, reload: load, forceReload }
}
