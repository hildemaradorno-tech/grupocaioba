import React from 'react'
import logoGrupo from '../assets/logo-grupo.png'
import logoDaf from '../assets/logo-daf.png'
import logoHonda from '../assets/logo-honda.png'

// Marca (como vem em dim_empresas.marca, em maiúsculas) → logo. Para uma marca nova, coloque a imagem em
// src/assets/ e acrescente uma linha aqui; sem logo cadastrado a linha aparece só com o texto.
const LOGOS_MARCA = {
  DAF: logoDaf,
  HONDA: logoHonda,
}

// Todos os logos cabem numa mesma caixa fixa (object-contain mantém a proporção de cada imagem), para que
// logos largos (DAF) e quase quadrados (Honda, Grupo) tenham peso visual parecido.
const CAIXA_IMG = 'h-6 w-11 object-contain'

export function LogoGrupo() {
  return <span className="inline-flex items-center shrink-0"><img src={logoGrupo} alt="Grupo Caiobá" className={CAIXA_IMG} /></span>
}

// rotulo: "SEGMENTO - MARCA" (ex.: "MOTOS - HONDA"); a marca é o trecho depois do último " - ".
export function LogoSegmento({ rotulo }) {
  const marca = String(rotulo || '').split(' - ').pop().trim().toUpperCase()
  const src = LOGOS_MARCA[marca]
  if (!src) return null
  return <span className="inline-flex items-center shrink-0"><img src={src} alt={marca} className={CAIXA_IMG} /></span>
}
