import React from 'react'
import { CheckCircle as CircleCheck } from 'lucide-react'
import fundoTextura from '../../../../assets/apresentacoes/gestao-pos-vendas-motos/fundo-textura.jpg'
import logoCaiobaBranco from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-caioba-grupo.png'

// Tema da apresentação "Gestão de Pós-Vendas — Caiobá Motos".
// Padrão visual do PowerPoint "Gestão de Mercadorias - Caiobá Motos": fundo escuro
// texturizado, títulos dourados em caixa alta (Century Gothic), logo Caiobá branco no canto
// inferior direito; destaques em azul claro.
// Tudo é desenhado em um palco fixo de 1280 × 720 px; o player escala o palco
// para caber na tela. Por isso as medidas aqui são em px absolutos.
export const COR = {
  petroleo: '#2B7BC0',      // azul claro (painéis de destaque)
  petroleoEscuro: '#1C5A93',
  azulClaro: '#6AB3C2',     // anel dos círculos (Disponibilidade de Peças)
  bege: '#D9A93D',          // dourado dos títulos e detalhes (padrão Motos)
  laranja: '#F7962C',       // cabeçalho da tabela da meta
  pessego: '#FDEEE6',
  texto: '#3B3B3B',
  cinza: '#6B6B6B',
}

export const FONTE_TITULO = '"Century Gothic", "Questrial", Montserrat, "Segoe UI", Arial, sans-serif'
export const FONTE_TEXTO = '"Century Gothic", Arial, "Segoe UI", Helvetica, sans-serif'

// Sangria: quando a tela não é 16:9, o palco 1280 × 720 fica centralizado e
// sobra espaço nas laterais (ou em cima/embaixo). O Palco informa essa sobra
// em --sx / --sy (px do palco). Um retângulo que encosta na borda do palco é
// esticado até a borda real da tela — assim fundo, fotos e painéis preenchem
// a tela toda sem distorcer o conteúdo.
const SX = 'var(--sx, 0px)'
const SY = 'var(--sy, 0px)'
export function sangrar(x, y, w, h) {
  const l = x <= 0, r = x + w >= 1280, t = y <= 0, b = y + h >= 720
  return {
    position: 'absolute',
    left: l ? `calc(${x}px - ${SX})` : x,
    top: t ? `calc(${y}px - ${SY})` : y,
    width: `calc(${w}px${l ? ` + ${SX}` : ''}${r ? ` + ${SX}` : ''})`,
    height: `calc(${h}px${t ? ` + ${SY}` : ''}${b ? ` + ${SY}` : ''})`,
  }
}

// Base de todo slide: fundo (esticado até a borda da tela) e fonte.
export function Slide({ children, fundo = '#FFFFFF', style }) {
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONTE_TEXTO, color: COR.texto, ...style }}>
      <div style={{ ...sangrar(0, 0, 1280, 720), background: fundo }} />
      {children}
    </div>
  )
}

// Foto de fundo cobrindo a tela toda, com véu escuro azul-petróleo por cima.
export function FundoFoto({ src, veu = 0.72, posicao = 'center' }) {
  return (
    <>
      <img src={src} alt="" draggable={false} style={{ ...sangrar(0, 0, 1280, 720), objectFit: 'cover', objectPosition: posicao }} />
      {veu > 0 && <div style={{ ...sangrar(0, 0, 1280, 720), background: `rgba(12, 45, 54, ${veu})` }} />}
    </>
  )
}

// Fundo padrão Motos: textura pontilhada escurecida, com brilho suave no alto,
// e logo Caiobá branco no canto inferior direito.
function FundoMotos() {
  return (
    <>
      <img src={fundoTextura} alt="" draggable={false} style={{ ...sangrar(0, 0, 1280, 720), objectFit: 'cover' }} />
      <div style={{ ...sangrar(0, 0, 1280, 720), background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(30,32,36,.55), rgba(18,19,22,.86) 70%), linear-gradient(180deg, rgba(22,23,26,.70), rgba(14,15,17,.88))' }} />
      {/* logo Caiobá em branco no canto inferior direito (mesmo lugar da apresentação da Trucks), em todos os slides exceto a capa */}
      <img src={logoCaiobaBranco} alt="Caiobá" draggable={false} style={{ position: 'absolute', right: 'calc(40px - var(--sx, 0px))', bottom: 'calc(26px - var(--sy, 0px))', width: 125, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
    </>
  )
}

// ─── Padrão "escuro" (Organização da Empresa: Organograma, Atribuições) ─────
// Fundo, cartão de vidro e painel de destaque compartilhados, para os slides
// da seção usarem exatamente o mesmo visual.
export const FUNDO_ESCURO = '#16171A'
export function FundoEscuro() {
  return <FundoMotos />
}
// Fundo dos slides 4 em diante: foto da fachada (da apresentação "Pós-Vendas e seus
// Indicadores") com véu escuro e o logo Caiobá em branco no canto inferior direito.
export function FundoFachada() {
  return <FundoMotos />
}

export const VIDRO = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(217,169,61,.25)', borderRadius: 16, boxSizing: 'border-box' }
export const DESTAQUE = { background: 'linear-gradient(160deg, #4AA3E0 0%, #2B7BC0 50%, #1C5A93 100%)', border: '1px solid rgba(217,169,61,.4)', boxShadow: '0 12px 28px rgba(0,0,0,.4)', boxSizing: 'border-box' }
export const LINHA_ESCURO = 'rgba(217,169,61,.6)'

// Painel/faixa de cor sólida (estica até a borda da tela se encostar na borda do slide).
export function Painel({ x, y, w, h, cor, style, children }) {
  return <div style={{ ...sangrar(x, y, w, h), background: cor, ...style }}>{children}</div>
}

// Título com o sublinhado bege. claro = texto branco (slides com foto/painel).
export function Titulo({ children, x = 96, y = 50, w = 1100, tamanho = 30, claro = false, linha = 340, maiusculo = false }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w }}>
      <h2 style={{
        margin: 0, fontFamily: FONTE_TITULO, fontWeight: 400, fontSize: tamanho, lineHeight: 1.1,
        color: COR.bege, textTransform: maiusculo ? 'uppercase' : 'none', letterSpacing: 1.5,
      }}>
        {children}
      </h2>
      {/* padrão Motos: título sem sublinhado */}
    </div>
  )
}

// Item de lista com o check bege (marcador usado em quase todos os slides).
export function ItemCheck({ titulo, children, claro = false, tamanho = 15, icone = 26, style }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', ...style }}>
      <CircleCheck size={icone} strokeWidth={1.8} color={COR.bege} style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ color: claro ? '#FFFFFF' : COR.texto, fontSize: tamanho, lineHeight: 1.4 }}>
        {titulo && <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanho + 3, marginBottom: 6 }}>{titulo}</div>}
        {children}
      </div>
    </div>
  )
}

// Lista com ✓ simples (texto corrido dos slides de peças).
export function ListaVisto({ itens, tamanho = 15 }) {
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {itens.map(t => (
        <li key={t} style={{ fontSize: tamanho, lineHeight: 1.5 }}><span style={{ color: COR.petroleo, marginRight: 8 }}>✓</span>{t}</li>
      ))}
    </ul>
  )
}

// Moldura bege atrás de uma foto/painel (detalhe deslocado dos slides 4, 5, 6 e 22).
export function MolduraBege({ x, y, w, h }) {
  return <div style={{ ...sangrar(x, y, w, h), background: COR.bege }} />
}

// Foto posicionada; se encostar na borda do slide, estica até a borda da tela.
export function Foto({ src, x, y, w, h, ajuste = 'cover', style }) {
  return <img src={src} alt="" draggable={false} style={{ ...sangrar(x, y, w, h), objectFit: ajuste, ...style }} />
}
