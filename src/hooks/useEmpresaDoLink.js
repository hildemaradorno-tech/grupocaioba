import { useEffect, useRef } from 'react'

// Link de origem da Matriz KPIs (?loja=CAMPO GRANDE): ao abrir a tela, aplica UMA vez o filtro de empresa
// (ex.: fatia "por Empresa" dos dashboards de Garantias DAF) no nome que corresponde à loja, assim que os
// dados chegam. valores = nomes de empresa presentes nos dados; aplicar(nome) = liga o filtro da tela.
// 'TRUCKS' (todas as Trucks) não filtra nada.
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').replace(/ DO SUL\b/, '').trim()

export function useEmpresaDoLink(valores, aplicar) {
  const loja = useRef(new URLSearchParams(window.location.search).get('loja'))
  useEffect(() => {
    const alvo = loja.current
    if (!alvo || !valores?.length) return
    loja.current = null
    if (norm(alvo) === 'TRUCKS') return
    const nome = valores.find(v => norm(v).includes(norm(alvo)) && !/MOTOS/.test(norm(v)))
    if (nome) aplicar(nome)
  }, [valores]) // eslint-disable-line react-hooks/exhaustive-deps
}
