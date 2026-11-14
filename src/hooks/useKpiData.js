import { useState, useEffect, useCallback, useRef } from 'react'
import { useKpiSourceStatus } from '../context/KpiSourceStatusContext'

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
  // dataKey: de qual filtro é o `data` na tela. Ao trocar o filtro (ex.: escolher um consultor), o dado
  // anterior continua em `data` até a resposta nova chegar — `atualizado` avisa a tela para não mostrá-lo
  // como se fosse do filtro novo (mostrava o total do grupo no quadro do consultor escolhido).
  const [dataKey, setDataKey] = useState(stored ? paramsKey : null)
  const keyAtual = useRef(paramsKey)
  keyAtual.current = paramsKey
  const [loading, setLoading] = useState(!stored)
  const [error,   setError]   = useState(null)
  const [source,  setSource]  = useState(stored?.source ?? null)

  // Publica source/loading no context compartilhado — o badge "Dados sincronizados" mora no
  // cabeçalho da Matriz KPIs (ao lado do Ano), não em cada aba; só a aba ativa fica montada
  // por vez, então não há conflito entre publishers.
  const { setStatus, refreshToken } = useKpiSourceStatus()
  const lastRefreshToken = useRef(refreshToken)
  useEffect(() => { setStatus({ source, loading }) }, [source, loading, setStatus])

  const load = useCallback(async (extraParams = {}) => {
    const isForce = !!extraParams._forceReload
    // Mostra spinner apenas se não houver dado em cache ou for recarga forçada
    if (!getStored(fetchFn, paramsKey) || isForce) setLoading(true)
    setError(null)
    try {
      const result = await fetchFn({ ...params, ...extraParams })
      setStored(fetchFn, paramsKey, result)
      // Resposta de um filtro que já foi trocado (chegou depois da do filtro novo): só guarda.
      if (keyAtual.current !== paramsKey) return
      setData(result.data)
      setDataKey(paramsKey)
      setSource(result.source)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, paramsKey])

  useEffect(() => {
    const atualizarForcado = lastRefreshToken.current !== refreshToken
    lastRefreshToken.current = refreshToken
    load(atualizarForcado ? { _forceReload: true } : {})
  }, [load, refreshToken])

  const forceReload = useCallback(() => load({ _forceReload: true }), [load])

  // Filtro novo já guardado nesta sessão: usa direto (sem esperar o efeito); senão, o que está na tela.
  const guardado = getStored(fetchFn, paramsKey)
  const atualizado = !!guardado || dataKey === paramsKey
  return { data: guardado?.data ?? data, atualizado, loading, error, source, reload: load, forceReload }
}
