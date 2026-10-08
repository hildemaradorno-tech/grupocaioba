import { useCallback, useEffect, useRef, useState } from 'react'
import { getStatusSincronizacao, executarSincronizacaoAgora } from '../services/kpiService'

// Atualização da Matriz KPIs compartilhada entre telas (Matriz KPIs e BI Campanha Pós-Venda).
// Um único processo no backend: a sincronização completa grava a Matriz e, no último passo, a
// Campanha (fato_campanha_diario). O backend tem uma trava — enquanto alguém está atualizando,
// ninguém mais consegue iniciar. Este hook consulta /sync/status periodicamente para que o botão
// fique travado em TODAS as telas abertas (de qualquer pessoa) até a atualização terminar.
//   executando: true enquanto há uma atualização rodando no backend (iniciada por qualquer um)
//   porQuem:    e-mail de quem iniciou (quando o backend informa)
//   iniciar():  dispara a atualização (se já houver uma rodando, só passa a acompanhar)
//   onConcluido(status): chamado quando uma atualização acompanhada termina ('SUCESSO' | 'PARCIAL' | 'ERRO')
const INTERVALO_RODANDO_MS = 5000
const INTERVALO_PARADO_MS = 20000

export function useSincronizacaoKpi(onConcluido) {
  const [executando, setExecutando] = useState(false)
  const [porQuem, setPorQuem] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const rodandoAntes = useRef(false)
  const concluidoRef = useRef(onConcluido)
  concluidoRef.current = onConcluido

  const consultar = useCallback(async () => {
    const st = await getStatusSincronizacao()
    const ult = st?.ultimaExecucao
    const agora = !!st?.executandoAgora
    setExecutando(agora)
    setPorQuem(agora ? (ult?.status === 'EXECUTANDO' ? ult.usuario_email || null : null) : null)
    // Terminou (estava rodando e parou): avisa a tela para recarregar os dados.
    if (rodandoAntes.current && !agora) {
      const status = ult?.status || 'SUCESSO'
      setMensagem(status === 'ERRO' ? 'A atualização terminou com erro. Os dados não foram atualizados.'
        : status === 'PARCIAL' ? 'Atualização parcial concluída.' : 'Dados atualizados.')
      concluidoRef.current?.(status)
    }
    rodandoAntes.current = agora
    return agora
  }, [])

  // Consulta contínua: rápida enquanto há atualização rodando, lenta quando parada.
  useEffect(() => {
    let vivo = true
    let timer = null
    const ciclo = async () => {
      let agora = false
      try { agora = await consultar() } catch { /* backend fora do ar: tenta de novo no próximo ciclo */ }
      if (vivo) timer = setTimeout(ciclo, agora ? INTERVALO_RODANDO_MS : INTERVALO_PARADO_MS)
    }
    ciclo()
    return () => { vivo = false; clearTimeout(timer) }
  }, [consultar])

  const iniciar = useCallback(async (usuarioEmail) => {
    setMensagem('')
    try {
      if (await consultar()) {
        setMensagem('Já existe uma atualização em andamento — aguarde terminar.')
        return
      }
      await executarSincronizacaoAgora(usuarioEmail)
      setExecutando(true)
      setPorQuem(usuarioEmail || null)
      rodandoAntes.current = true
      setMensagem('Atualizando a Matriz KPIs e a Campanha… pode levar alguns minutos.')
    } catch (err) {
      // 409 = outra pessoa iniciou no mesmo instante: passa a acompanhar a dela.
      if (/andamento/i.test(err.message || '')) {
        rodandoAntes.current = true
        setExecutando(true)
        setMensagem('Já existe uma atualização em andamento — aguarde terminar.')
      } else {
        setMensagem(err.message || 'Não foi possível iniciar a atualização.')
      }
    }
  }, [consultar])

  return { executando, porQuem, mensagem, iniciar }
}
