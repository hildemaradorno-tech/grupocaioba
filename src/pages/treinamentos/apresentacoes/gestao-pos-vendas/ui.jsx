import React from 'react'
import { CheckCircle as CircleCheck } from 'lucide-react'
import fundoFachada from '../../../../assets/apresentacoes/gestao-pos-vendas/fundo-fachada.jpg'
import logoCaiobaGrupo from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-caioba-grupo.png'

// Tema da apresentação "Gestão de Pós-Vendas" (Caiobá Trucks).
// Tudo é desenhado em um palco fixo de 1280 × 720 px; o player escala o palco
// para caber na tela. Por isso as medidas aqui são em px absolutos.
export const COR = {
  petroleo: '#14707E',      // azul-petróleo dos painéis
  petroleoEscuro: '#0E4F5A',
  azulClaro: '#6AB3C2',     // anel dos círculos (Disponibilidade de Peças)
  bege: '#F0CFA0',          // sublinhado dos títulos e ponto do canto
  laranja: '#F7962C',       // cabeçalho da tabela da meta
  pessego: '#FDEEE6',
  texto: '#3B3B3B',
  cinza: '#6B6B6B',
}

export const FONTE_TITULO = '"Gill Sans MT", "Gill Sans", Montserrat, "Segoe UI", Arial, sans-serif'
export const FONTE_TEXTO = 'Arial, "Segoe UI", Helvetica, sans-serif'

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

// ─── Padrão "escuro" (Organização da Empresa: Organograma, Atribuições) ─────
// Fundo, cartão de vidro e painel de destaque compartilhados, para os slides
// da seção usarem exatamente o mesmo visual.
export const FUNDO_ESCURO = '#132028'
export function FundoEscuro() {
  return (
    <>
      <div style={{ ...sangrar(0, 0, 1280, 720), background: 'radial-gradient(ellipse 45% 60% at 12% 85%, rgba(20,112,126,.45), rgba(20,112,126,0) 70%), radial-gradient(ellipse 40% 50% at 92% 15%, rgba(240,207,160,.16), rgba(240,207,160,0) 70%), linear-gradient(160deg, #1A2B33 0%, #132028 60%, #0E181E 100%)' }} />
      <LogoCaiobaBranco />
    </>
  )
}

// Logo Caiobá em branco no canto inferior direito — em todos os slides, exceto a capa.
export function LogoCaiobaBranco() {
  return <img src={logoCaiobaGrupo} alt="Caiobá" draggable={false} style={{ position: 'absolute', right: 'calc(40px - var(--sx, 0px))', bottom: 'calc(26px - var(--sy, 0px))', width: 125, filter: 'brightness(0) invert(1)', opacity: 0.9 }} />
}
// Fundo dos slides 4 em diante: foto da fachada (da apresentação "Pós-Vendas e seus
// Indicadores") com véu escuro e o logo Caiobá em branco no canto inferior direito.
export function FundoFachada() {
  return (
    <>
      <img src={fundoFachada} alt="" draggable={false} style={{ ...sangrar(0, 0, 1280, 720), objectFit: 'cover' }} />
      <div style={{ ...sangrar(0, 0, 1280, 720), background: 'linear-gradient(180deg, rgba(16,22,26,.80) 0%, rgba(16,22,26,.66) 45%, rgba(16,22,26,.78) 100%)' }} />
      <LogoCaiobaBranco />
    </>
  )
}

export const VIDRO = { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(240,207,160,.22)', borderRadius: 16, boxSizing: 'border-box' }
export const DESTAQUE = { background: 'linear-gradient(160deg, #1A8392 0%, #14707E 45%, #0E4F5A 100%)', border: '1px solid rgba(240,207,160,.35)', boxShadow: '0 12px 28px rgba(0,0,0,.35)', boxSizing: 'border-box' }
export const LINHA_ESCURO = 'rgba(240,207,160,.55)'

// Painel/faixa de cor sólida (estica até a borda da tela se encostar na borda do slide).
export function Painel({ x, y, w, h, cor, style, children }) {
  return <div style={{ ...sangrar(x, y, w, h), background: cor, ...style }}>{children}</div>
}

// Título com o sublinhado bege. claro = texto branco (slides com foto/painel).
export function Titulo({ children, x = 96, y = 50, w = 1100, tamanho = 30, claro = false, linha = 340, maiusculo = false }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w }}>
      <h2 style={{
        margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanho, lineHeight: 1.1,
        color: claro ? '#FFFFFF' : COR.petroleo, textTransform: maiusculo ? 'uppercase' : 'none', letterSpacing: 0.3,
      }}>
        {children}
      </h2>
      {linha > 0 && <div style={{ marginTop: 10, width: linha, height: 4, background: COR.bege }} />}
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
