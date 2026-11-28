import React from 'react'
import { PALCO_W, PALCO_H } from './catalogo'

// Fonte dos títulos das apresentações (Montserrat) — carregada uma vez, sob demanda.
// No Windows com Office instalado o título usa Gill Sans MT, igual ao PowerPoint original.
let fonteCarregada = false
export function useFonteApresentacao() {
  React.useEffect(() => {
    if (fonteCarregada) return
    fonteCarregada = true
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap'
    document.head.appendChild(link)
  }, [])
}

// Desenha um slide (palco de 1280 × 720).
//  • escala            → miniatura em proporção 16:9 (capas e grade).
//  • largura + altura  → preenche a área inteira: o conteúdo é escalado para
//    caber (sem distorcer) e centralizado; a sobra vai em --sx / --sy para os
//    fundos, fotos e painéis que encostam na borda se esticarem até a borda
//    (ver sangrar() no ui.jsx da apresentação).
export default function Palco({ Componente, escala, largura, altura, style }) {
  const preencher = largura > 0 && altura > 0
  const k = preencher ? Math.min(largura / PALCO_W, altura / PALCO_H) : (escala ?? 1)
  const w = preencher ? largura : PALCO_W * k
  const h = preencher ? altura : PALCO_H * k
  const sx = preencher ? (largura / k - PALCO_W) / 2 : 0
  const sy = preencher ? (altura / k - PALCO_H) / 2 : 0

  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', ...style }}>
      <div
        style={{
          width: PALCO_W, height: PALCO_H, position: 'absolute',
          left: sx * k, top: sy * k,
          transform: `scale(${k})`, transformOrigin: '0 0',
          '--sx': `${sx}px`, '--sy': `${sy}px`,
        }}
      >
        <Componente />
      </div>
    </div>
  )
}
