// Catálogo do menu Treinamentos › Apresentações.
// Cada apresentação é feita em React (pasta própria nesta pasta), com slides
// desenhados num palco de 1280 × 720 px. Para incluir uma nova: criar a pasta
// com o index.jsx exportando { slug, titulo, descricao, categoria, empresa, slides }
// e acrescentar aqui.
import gestaoPosVendas from './gestao-pos-vendas'
import gestaoPosVendasMotos from './gestao-pos-vendas-motos'

export const APRESENTACOES = [
  gestaoPosVendas,
  gestaoPosVendasMotos,
]

export const getApresentacao = (slug) => APRESENTACOES.find(a => a.slug === slug) || null

export const PALCO_W = 1280
export const PALCO_H = 720
