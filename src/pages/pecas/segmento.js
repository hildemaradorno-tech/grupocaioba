// Dois Gestores de Peças separados, com as mesmas telas:
//   Trucks → rotas /pecas/...        menus pecas/...        BI bi/gestor-pecas        (Dealer.net)
//   Motos  → rotas /pecas-motos/...  menus pecas-motos/...  BI bi/gestor-pecas-motos  (MicroWork)
// O segmento sai da rota atual, então as telas não precisam receber props.
import { useLocation } from 'react-router-dom'

export const SEGMENTOS = {
  trucks: { seg: 'trucks', base: '/pecas', menu: 'pecas', bi: 'bi/gestor-pecas', nome: 'Trucks', empresa: 'Caioba Trucks', sistema: 'Dealer.net' },
  motos:  { seg: 'motos', base: '/pecas-motos', menu: 'pecas-motos', bi: 'bi/gestor-pecas-motos', nome: 'Motos', empresa: 'Caioba Motos', sistema: 'MicroWork' },
}

export const segmentoDoCaminho = (pathname = '') =>
  (pathname.startsWith('/pecas-motos') || pathname.startsWith('/bi/gestor-pecas-motos') ? SEGMENTOS.motos : SEGMENTOS.trucks)

// Para o gestorPecasApi.js (chamado sempre a partir de uma tela do próprio Gestor)
export const segmentoAtual = () => segmentoDoCaminho(typeof window !== 'undefined' ? window.location.pathname : '')

export function useSegmento() {
  const { pathname } = useLocation()
  const s = segmentoDoCaminho(pathname)
  return {
    ...s,
    rota: (slug) => `${s.base}/${slug}`,          // 'reposicao' → '/pecas-motos/reposicao'
    perm: (slug) => `${s.menu}/${slug}`,          // 'reposicao' → 'pecas-motos/reposicao'
    // telas devolvidas pelo backend vêm como 'pecas/xxx' → rota do segmento atual
    rotaTela: (tela) => `${s.base}/${String(tela).replace(/^pecas(-motos)?\//, '')}`,
  }
}
