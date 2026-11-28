import React from 'react'
import { Map as MapaIcone, Search, Phone, MapPin, Facebook, Instagram, Globe, PhoneCall, ExternalLink, Pin, Linkedin } from 'lucide-react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { Slide, Titulo, ItemCheck, ListaVisto, Foto, sangrar, COR, FONTE_TITULO, FundoEscuro, FundoFachada, FUNDO_ESCURO, VIDRO, DESTAQUE, LINHA_ESCURO } from './ui'
import { MS_VIEWBOX, MS_PATH, BRASIL_VIEWBOX, BRASIL_PATH } from './mapas'

import fachada from '../../../../assets/apresentacoes/gestao-pos-vendas/fachada.jpg'
import oficina from '../../../../assets/apresentacoes/gestao-pos-vendas/oficina.jpg'
import br163 from '../../../../assets/apresentacoes/gestao-pos-vendas/br163.jpg'
import dafAcademy from '../../../../assets/apresentacoes/gestao-pos-vendas/daf-academy.jpg'
import assistanceVan from '../../../../assets/apresentacoes/gestao-pos-vendas/assistance-van.jpg'
import webshop from '../../../../assets/apresentacoes/gestao-pos-vendas/webshop.jpg'
import trpCatalogo from '../../../../assets/apresentacoes/gestao-pos-vendas/trp-catalogo.jpg'
import paccarPartsLinhas from '../../../../assets/apresentacoes/gestao-pos-vendas/paccar-parts-linhas.jpg'
import paccarCaixa from '../../../../assets/apresentacoes/gestao-pos-vendas/paccar-caixa.png'
import dafPecas from '../../../../assets/apresentacoes/gestao-pos-vendas/daf-pecas.jpg'
import dafAcessorios from '../../../../assets/apresentacoes/gestao-pos-vendas/daf-acessorios.jpg'
import trpPecas from '../../../../assets/apresentacoes/gestao-pos-vendas/trp-pecas.jpg'
import multisuporteLogo from '../../../../assets/apresentacoes/gestao-pos-vendas/multisuporte-logo.jpg'
import msOleos from '../../../../assets/apresentacoes/gestao-pos-vendas/multisuporte-oleos.png'
import msPreventivo from '../../../../assets/apresentacoes/gestao-pos-vendas/multisuporte-preventivo.png'
import msPleno from '../../../../assets/apresentacoes/gestao-pos-vendas/multisuporte-pleno.png'
import frotaClientes from '../../../../assets/apresentacoes/gestao-pos-vendas/frota-clientes.jpg'
import logoCaioba from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-caioba-trucks.png'
import logoDaf from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-daf.png'
import logoTrp from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-trp.jpg'
import logoPaccarParts from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-paccar-parts.png'
import logoPaccar from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-paccar.png'
import logoTrpGrande from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-trp-grande.png'
import logoBizneo from '../../../../assets/apresentacoes/gestao-pos-vendas/logo-bizneo.png'
// logos das marcas (os mesmos do componente LogosMarca do sistema)
import logoMarcaDaf from '../../../../assets/logo-daf.png'
import logoMarcaHonda from '../../../../assets/logo-honda.png'
import fotoHildemar from '../../../../assets/apresentacoes/gestao-pos-vendas/foto-hildemar.png'


// ─── 1. Capa ────────────────────────────────────────────────────────────────
function Capa() {
  return (
    <Slide>
      <div style={{ ...sangrar(0, 0, 1280, 630), overflow: 'hidden' }}>
        <img src={fachada} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(12, 45, 54, 0.7)' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 80, width: 1280, display: 'flex', justifyContent: 'center' }}>
        <img src={logoCaioba} alt="Caiobá Trucks" style={{ width: 250, display: 'block' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, top: 245, width: 1280, textAlign: 'center', color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 64, lineHeight: 1 }}>
        GESTÃO DE
        <div style={{ width: 545, height: 4, background: COR.bege, margin: '18px auto 22px' }} />
        PÓS-VENDAS
      </div>
      <div style={{ position: 'absolute', left: 138, top: 456, width: 1004, height: 64, background: 'rgba(20,112,126,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COR.bege, fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 22, letterSpacing: 0.4, padding: '0 24px', textAlign: 'center' }}>
        Gestão que se mede, indicadores que guiam, performance que se entrega.
      </div>
      <div style={{ position: 'absolute', left: 0, top: 630, width: 1280, height: 90, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '0 120px' }}>
        <img src={logoPaccarParts} alt="PACCAR Parts" style={{ height: 38 }} />
        <img src={logoDaf} alt="DAF" style={{ height: 34 }} />
        <img src={logoTrp} alt="TRP" style={{ height: 34 }} />
      </div>
    </Slide>
  )
}

// ─── Organização da empresa: organograma ────────────────────────────────────
// Caixas em HTML; linhas e setas em SVG (mesmas coordenadas do palco).
// Caixa do organograma no padrão escuro (mesmo cartão de vidro / destaque do slide Atribuições).
//  tipo 'destaque' = azul-petróleo (Presidência e Inteligência de Negócios)
//  tipo 'diretoria' = vidro um pouco mais forte · tipo 'vidro' = demais
//  marca = cor da empresa (bolinha antes do nome)
//  tipo 'apresentador' = cobre (Hildemar)
function CaixaOrg({ x, y, w = 200, h = 60, nome, cargo, tipo = 'vidro', marca }) {
  const apresentador = tipo === 'apresentador'
  const fundo = tipo === 'destaque' ? DESTAQUE
    : apresentador ? { background: 'linear-gradient(160deg, #C8865A 0%, #A9653D 55%, #8C4F2E 100%)', border: '1px solid rgba(240,207,160,.5)', boxShadow: '0 10px 24px rgba(0,0,0,.3)', boxSizing: 'border-box' }
    : tipo === 'diretoria' ? { ...VIDRO, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(240,207,160,.38)' }
    : VIDRO
  return (
    <div style={{ ...fundo, position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONTE_TITULO, lineHeight: 1.2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 16 }}>
        {marca && <span style={{ width: 11, height: 11, borderRadius: '50%', background: marca, boxShadow: `0 0 8px ${marca}` }} />}
        {nome}
      </div>
      {cargo && <div style={{ marginTop: 2, color: apresentador ? '#FBEBD3' : COR.bege, fontWeight: 600, fontSize: 13 }}>{cargo}</div>}
    </div>
  )
}

function Organograma() {
  const linha = { stroke: LINHA_ESCURO, strokeWidth: 1.8, fill: 'none' }
  const seta = { markerEnd: 'url(#org-seta)' }

  // Níveis (y) e colunas (centro x) — tudo alinhado ao tronco central (x = 640)
  const TRONCO = 640
  const Y_PRES = 122, H_PRES = 56
  const Y_BARRA_ASSES = 198, Y_ASSES = 214, H_ASSES = 52
  const Y_BARRA_DIR = 298, Y_DIR = 322, H_DIR = 56
  const Y_BARRA_EMP = 558, Y_EMP = 582
  const COL_DIR = [300, 640, 980]
  const ASSES_ESQ = [['PEDRITA', 'Gerente de Contabilidade', 135], ['EDIANE', 'Gerente de Controladoria', 330], ['VALDIR', 'Auditor Interno', 525]]

  return (
    <Slide fundo={FUNDO_ESCURO}>
      <FundoEscuro />
      <Titulo claro maiusculo tamanho={40} y={40} linha={260}>Organograma</Titulo>

      <svg width={1280} height={720} style={{ position: 'absolute', left: 0, top: 0 }}>
        <defs>
          <marker id="org-seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill={LINHA_ESCURO} />
          </marker>
        </defs>
        {/* Tronco: Presidente → barra da diretoria */}
        <path d={`M${TRONCO} ${Y_PRES + H_PRES} V${Y_BARRA_DIR}`} style={linha} />
        {/* Assessoria do Presidente (à esquerda) */}
        <path d={`M135 ${Y_BARRA_ASSES} H${TRONCO}`} style={linha} />
        {ASSES_ESQ.map(([, , x]) => <path key={x} d={`M${x} ${Y_BARRA_ASSES} V${Y_ASSES - 2}`} style={linha} {...seta} />)}
        {/* Inteligência de Negócios (à direita) → Assistente */}
        <path d={`M${TRONCO} ${Y_BARRA_ASSES} H800 V${Y_ASSES - 2}`} style={linha} {...seta} />
        <path d={`M900 ${Y_ASSES + H_ASSES / 2} H933`} style={linha} {...seta} />
        {/* Diretoria */}
        <path d={`M${COL_DIR[0]} ${Y_BARRA_DIR} H${COL_DIR[2]}`} style={linha} />
        {COL_DIR.map(x => <path key={x} d={`M${x} ${Y_BARRA_DIR} V${Y_DIR - 2}`} style={linha} {...seta} />)}
        {/* Diretor Financeiro → Gerente Financeiro */}
        <path d={`M${COL_DIR[0]} ${Y_DIR + H_DIR} V410`} style={linha} {...seta} />
        {/* Tronco continua → empresas */}
        <path d={`M${TRONCO} ${Y_DIR + H_DIR} V${Y_BARRA_EMP} M${COL_DIR[0]} ${Y_BARRA_EMP} H${COL_DIR[2]}`} style={linha} />
        {COL_DIR.map(x => <path key={x} d={`M${x} ${Y_BARRA_EMP} V${Y_EMP - 2}`} style={linha} {...seta} />)}
      </svg>

      {/* Presidência */}
      <CaixaOrg x={TRONCO - 115} y={Y_PRES} w={230} h={H_PRES} tipo="destaque" nome="EVALDO" cargo="Presidente" />

      {/* Assessoria do Presidente */}
      {ASSES_ESQ.map(([nome, cargo, x]) => (
        <CaixaOrg key={nome} x={x - 92} y={Y_ASSES} w={184} h={H_ASSES} nome={nome} cargo={cargo} />
      ))}
      <CaixaOrg x={700} y={Y_ASSES} w={200} h={H_ASSES} tipo="apresentador" nome="HILDEMAR" cargo="Inteligência de Negócios" />
      <CaixaOrg x={935} y={Y_ASSES} w={180} h={H_ASSES} nome="LOHANA" cargo="Assistente Adm" />

      {/* Diretoria */}
      <CaixaOrg x={COL_DIR[0] - 120} y={Y_DIR} w={240} h={H_DIR} tipo="diretoria" nome="YURI" cargo="Diretor Financeiro" />
      <CaixaOrg x={COL_DIR[1] - 120} y={Y_DIR} w={240} h={H_DIR} tipo="diretoria" nome="ALBANY" cargo="Diretora de ADM e RH" />
      <CaixaOrg x={COL_DIR[2] - 120} y={Y_DIR} w={240} h={H_DIR} tipo="diretoria" nome="URIÁ" cargo="Diretor Comercial e Marketing" />
      <CaixaOrg x={COL_DIR[0] - 105} y={412} w={210} h={50} nome="FERNANDA" cargo="Gerente Financeiro" />

      {/* Empresas */}
      <CaixaOrg x={COL_DIR[0] - 110} y={Y_EMP} w={220} h={52} marca="#FF3B30" nome="Caiobá Motos" />
      <CaixaOrg x={COL_DIR[1] - 110} y={Y_EMP} w={220} h={52} marca="#A78BDA" nome="Caiobá Trucks" />
      <CaixaOrg x={COL_DIR[2] - 110} y={Y_EMP} w={220} h={52} marca="#E08A4F" nome="Outras Caiobá" />

      {/* Organograma completo no Bizneo — mesmo estilo dos botões de redes do slide Atribuições
          (abre em outra aba; o clique não passa o slide) */}
      <style>{'@keyframes orgBizneoPulso{0%,100%{box-shadow:0 0 0 0 rgba(240,207,160,.55)}50%{box-shadow:0 0 0 10px rgba(240,207,160,0)}}'}</style>
      <a
        href={LINK_ORGANOGRAMA_BIZNEO}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{ position: 'absolute', left: 900, top: 44, width: 320, display: 'flex', alignItems: 'center', gap: 12, padding: '9px 16px 9px 9px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(240,207,160,.45)', color: '#fff', textDecoration: 'none', cursor: 'pointer', boxSizing: 'border-box', animation: 'orgBizneoPulso 2.4s ease-in-out infinite' }}
      >
        <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <img src={logoBizneo} alt="Bizneo" style={{ width: 30, height: 30, display: 'block' }} />
        </span>
        <span style={{ flex: 1, lineHeight: 1.2, fontFamily: FONTE_TITULO }}>
          <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>Organograma completo</span>
          <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: COR.bege }}>Abrir no Bizneo</span>
        </span>
        <ExternalLink size={17} color={COR.bege} />
      </a>
    </Slide>
  )
}

const LINK_ORGANOGRAMA_BIZNEO = 'https://grupocaioba.bizneohr.com/people/chart?taxonomy_id=15599025'

// ─── Organização da empresa: Hildemar — atribuições e foco ──────────────────
// Ícones desenhados em SVG (traço branco + detalhe bege), inspirados na arte original.
function IconeSvg({ children, tamanho = 76 }) {
  return (
    <svg viewBox="0 0 64 64" width={tamanho} height={tamanho} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}
const B = COR.bege

const IcoMira = ({ tamanho }) => (
  <IconeSvg tamanho={tamanho}>
    <path d="M6 18v-8a4 4 0 0 1 4-4h8M46 6h8a4 4 0 0 1 4 4v8M58 46v8a4 4 0 0 1-4 4h-8M18 58h-8a4 4 0 0 1-4-4v-8" />
    <circle cx="32" cy="32" r="11" />
    <path d="M32 15v9M32 40v9M15 32h9M40 32h9" />
    <circle cx="32" cy="32" r="2.6" fill={B} stroke={B} />
  </IconeSvg>
)

const IcoAlvo = ({ tamanho }) => (
  <IconeSvg tamanho={tamanho}>
    <circle cx="29" cy="35" r="23" />
    <circle cx="29" cy="35" r="15" />
    <circle cx="29" cy="35" r="7" fill="rgba(255,255,255,.12)" />
    <path d="M29 35L53 11" stroke={B} strokeWidth={2.8} />
    <path d="M48 6v10h10M53 3v8h8" stroke={B} />
  </IconeSvg>
)

// Engrenagem: círculo + dentes radiais (gerados por ângulo)
function Engrenagem({ cx, cy, r, dentes, dente, espessura, cor = '#fff', furo }) {
  const d = Array.from({ length: dentes }, (_, i) => {
    const a = (i / dentes) * Math.PI * 2
    const x1 = cx + Math.cos(a) * r, y1 = cy + Math.sin(a) * r
    const x2 = cx + Math.cos(a) * (r + dente), y2 = cy + Math.sin(a) * (r + dente)
    return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`
  }).join('')
  return (
    <g stroke={cor}>
      <circle cx={cx} cy={cy} r={r} />
      <path d={d} strokeWidth={espessura} strokeLinecap="butt" />
      <circle cx={cx} cy={cy} r={furo} />
    </g>
  )
}

// Automação de processos: engrenagens + setas de ciclo contínuo
const IcoAutomacao = ({ tamanho }) => (
  <IconeSvg tamanho={tamanho}>
    <Engrenagem cx={25} cy={30} r={11} dentes={8} dente={5} espessura={5} furo={4} />
    <Engrenagem cx={45} cy={45} r={6.5} dentes={7} dente={3.5} espessura={3.6} furo={2.2} cor={B} />
    {/* setas de ciclo */}
    <path d="M38 6a26 26 0 0 1 20 16" stroke={B} strokeWidth={2.6} />
    <path d="M59 14l-1 8-8-2" stroke={B} strokeWidth={2.6} />
    <path d="M26 60A26 26 0 0 1 5 46" stroke={B} strokeWidth={2.6} />
    <path d="M4 54l1-8 8 1" stroke={B} strokeWidth={2.6} />
  </IconeSvg>
)

// Digitalização de processos: documento de papel → seta → tela com fluxo digital
const IcoDigitalizacao = ({ tamanho }) => (
  <IconeSvg tamanho={tamanho}>
    {/* papel */}
    <path d="M4 8h14l6 6v24H4z" />
    <path d="M18 8v6h6M8 20h12M8 26h12M8 32h8" />
    {/* seta */}
    <path d="M27 24h9" stroke={B} strokeWidth={2.8} />
    <path d="M32 19l5 5-5 5" stroke={B} strokeWidth={2.8} />
    {/* tela */}
    <rect x="39" y="10" width="22" height="28" rx="2.5" />
    <path d="M46 44h8M50 38v6" />
    {/* fluxo digital dentro da tela */}
    <circle cx="45" cy="18" r="2" fill={B} stroke={B} />
    <circle cx="55" cy="24" r="2" fill={B} stroke={B} />
    <circle cx="45" cy="30" r="2" fill={B} stroke={B} />
    <path d="M47 18h4a2 2 0 0 1 2 2v2M53 26v2a2 2 0 0 1-2 2h-4" stroke={B} strokeWidth={1.8} />
    {/* base: etapas do processo */}
    <path d="M10 52h44" />
    <circle cx="10" cy="52" r="3" fill="rgba(255,255,255,.15)" />
    <circle cx="32" cy="52" r="3" fill="rgba(255,255,255,.15)" />
    <circle cx="54" cy="52" r="3" fill={B} stroke={B} />
  </IconeSvg>
)

// Gestão de projetos: quadro de cronograma (Gantt) com marco de entrega
const IcoProjetos = ({ tamanho }) => (
  <IconeSvg tamanho={tamanho}>
    <rect x="5" y="8" width="54" height="48" rx="4" />
    <path d="M5 18h54M16 8v-4M48 8v-4" />
    <rect x="11" y="24" width="20" height="6" rx="2" fill="rgba(255,255,255,.18)" />
    <rect x="21" y="34" width="22" height="6" rx="2" fill={B} stroke={B} />
    <rect x="31" y="44" width="16" height="6" rx="2" fill="rgba(255,255,255,.18)" />
    <path d="M53 41l3.5 3.5L53 48l-3.5-3.5z" fill={B} stroke={B} />
  </IconeSvg>
)

const ATRIBUICOES = [
  { Icone: IcoMira, texto: 'Suporte à direção da empresa' },
  { Icone: IcoAlvo, texto: 'Desenvolvimento de dashboards' },
  { Icone: IcoDigitalizacao, texto: 'Digitalização de processos' },
  { Icone: IcoAutomacao, texto: 'Automação de processos' },
  { Icone: IcoProjetos, texto: 'Gestão de projetos' },
]

// Redes do Hildemar no cartão de perfil
const REDES_HILDEMAR = [
  { Icone: Linkedin, rotulo: 'LinkedIn', usuario: 'hildemarlima', url: 'https://www.linkedin.com/in/hildemarlima/', cor: '#0A66C2' },
  { Icone: Instagram, rotulo: 'Instagram', usuario: '@limainteligenciadenegocios', url: 'https://www.instagram.com/limainteligenciadenegocios', cor: 'linear-gradient(45deg, #F58529, #DD2A7B 50%, #8134AF)' },
]

// Layout em três painéis: perfil (esquerda) · atribuições (centro) · foco (direita).
function Atribuicoes() {
  const vidro = VIDRO
  const impar = ATRIBUICOES.length % 2 === 1
  return (
    <Slide fundo={FUNDO_ESCURO}>
      {/* fundo escuro com brilho suave azul-petróleo e bege */}
      <FundoEscuro />

      <Titulo claro maiusculo tamanho={40} y={40} linha={260}>Atribuições</Titulo>

      {/* Perfil */}
      <div style={{ ...vidro, position: 'absolute', left: 96, top: 150, width: 290, height: 480, padding: '36px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 150, height: 150, borderRadius: '50%', padding: 6, background: `conic-gradient(${COR.bege}, ${COR.petroleo}, ${COR.bege})` }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#0E4F5A' }}>
            <img src={fotoHildemar} alt="Hildemar" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scale(1.06)' }} />
          </div>
        </div>
        <div style={{ marginTop: 26, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 34 }}>Hildemar</div>
        <div style={{ marginTop: 22, width: 70, height: 3, background: COR.bege, opacity: 0.7 }} />
        {/* Redes sociais (abrem em outra aba; o clique não passa o slide) */}
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
          {REDES_HILDEMAR.map(({ Icone, rotulo, usuario, url, cor }) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px 9px 9px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(240,207,160,.3)', color: '#fff', textDecoration: 'none', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <span style={{ width: 32, height: 32, borderRadius: '50%', background: cor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icone size={17} color="#fff" />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 1.2 }}>
                <span style={{ display: 'block', fontSize: 14 }}>{rotulo}</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,.65)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario}</span>
              </span>
              <ExternalLink size={15} color={COR.bege} />
            </a>
          ))}
        </div>
      </div>

      {/* Atribuições */}
      <div style={{ position: 'absolute', left: 416, top: 150, width: 480, display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: 145, gap: 22 }}>
        {ATRIBUICOES.map(({ Icone, texto }, i) => (
          <div key={texto} style={{ ...vidro, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px 14px', gridColumn: impar && i === ATRIBUICOES.length - 1 ? '1 / span 2' : undefined }}>
            <Icone tamanho={58} />
            <div style={{ marginTop: 10, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 17, lineHeight: 1.25 }}>{texto}</div>
          </div>
        ))}
      </div>

      {/* Foco */}
      <div style={{ position: 'absolute', left: 926, top: 150, width: 294, height: 480, borderRadius: 16, overflow: 'hidden', background: `linear-gradient(160deg, #1A8392 0%, ${COR.petroleo} 45%, ${COR.petroleoEscuro} 100%)`, boxShadow: '0 14px 34px rgba(0,0,0,.35)' }}>
        {/* alvo concêntrico decorativo */}
        <svg width={294} height={480} style={{ position: 'absolute', left: 0, top: 0 }}>
          {[150, 115, 80, 45].map((r, i) => <circle key={r} cx={230} cy={420} r={r} fill="none" stroke={COR.bege} strokeOpacity={0.1 + i * 0.07} strokeWidth={2} />)}
          <circle cx={230} cy={420} r={14} fill={COR.bege} fillOpacity={0.5} />
        </svg>
        <div style={{ position: 'relative', padding: '38px 30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: COR.bege, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 22, textTransform: 'uppercase', letterSpacing: 2 }}>
            <Pin size={22} color="#E2445C" fill="#E2445C" /> Foco
          </div>
          <div style={{ marginTop: 18, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 26, lineHeight: 1.25 }}>
            Inteligência de Negócios
          </div>
          <div style={{ margin: '14px 0', color: COR.bege, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 30 }}>&amp;</div>
          <div style={{ color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 26, lineHeight: 1.25 }}>
            Desenvolvimento da concessionária
          </div>
        </div>
      </div>
    </Slide>
  )
}

// ═══ Slides 4 em diante: fundo da fachada + padrão das Atribuições ══════════
// (título branco 40px com traço bege, texto claro, cartões de vidro, destaques azul-petróleo)
const TXT = 'rgba(255,255,255,.88)'
const TXT_SUAVE = 'rgba(255,255,255,.7)'
// Sobre a foto da fachada o vidro precisa ser mais denso para o texto ler bem
const VIDRO_F = { ...VIDRO, background: 'rgba(14,22,27,.62)', backdropFilter: 'blur(6px)' }

function SlideFachada({ titulo, linha = 260, children }) {
  return (
    <Slide fundo={FUNDO_ESCURO} style={{ color: TXT }}>
      <FundoFachada />
      {titulo && <Titulo claro maiusculo tamanho={40} y={40} linha={linha}>{titulo}</Titulo>}
      {children}
    </Slide>
  )
}

// Cartão de vidro posicionado
function Cartao({ x, y, w, h, children, style, destaque }) {
  return (
    <div style={{ ...(destaque ? { ...DESTAQUE, borderRadius: 16 } : VIDRO_F), position: 'absolute', left: x, top: y, width: w, height: h, padding: '22px 26px', ...style }}>
      {children}
    </div>
  )
}

// Foto em cartão arredondado. branco = imagem com fundo branco (logo/produto) → cartão branco com respiro.
function CartaoFoto({ src, x, y, w, h, branco = false, posicao = 'center' }) {
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: 16, overflow: 'hidden', background: branco ? '#fff' : '#0E181E', border: '1px solid rgba(240,207,160,.3)', boxShadow: '0 12px 28px rgba(0,0,0,.35)', boxSizing: 'border-box', padding: branco ? 18 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img src={src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: branco ? 'contain' : 'cover', objectPosition: posicao, display: 'block' }} />
    </div>
  )
}

// Link externo clicável (abre em outra aba; o clique não passa o slide)
function LinkExterno({ href, children, style }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      style={{ color: COR.bege, fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', ...style }}>
      {children} <ExternalLink size={14} />
    </a>
  )
}

const P = (mb = 12) => ({ margin: `0 0 ${mb}px` })
const SUBTITULO = { fontFamily: FONTE_TITULO, fontWeight: 700, color: '#fff', fontSize: 19, marginBottom: 8 }

// ─── 4. Sobre o Grupo Caiobá (conteúdo do "Quem somos" do site) ──────────────
const LINHA_DO_TEMPO = [
  { ano: '1984', titulo: 'O início da jornada', texto: 'Auto Moto — primeiros passos com seminovas em Campo Grande/MS.' },
  { ano: '1997', titulo: 'Primeira Honda em Campo Grande', texto: 'Concessionária oficial Honda 2W no Mato Grosso do Sul.' },
  { ano: '2005–2006', titulo: 'Expansão para São Paulo', texto: 'Abertura das unidades em Olímpia e Barretos/SP.' },
  { ano: '2013', titulo: 'Entrada no segmento DAF', texto: 'Nasce a Caiobá Trucks, concessionária DAF Caminhões em Campo Grande/MS.' },
  { ano: 'Hoje', titulo: '~13 pontos · 2 marcas · +210 pessoas', texto: 'Grupo consolidado em MS e SP, com as operações Honda e DAF.', atual: true },
]

const QUEM_SOMOS_SITES = [
  { nome: 'Caiobá Trucks', url: 'https://caiobatrucks.com.br/quem-somos', logo: logoMarcaDaf },
  { nome: 'Caiobá Motos', url: 'https://caiobahonda.com.br/quem-somos/', logo: logoMarcaHonda },
]

function Sobre() {
  const numeros = [['~13', 'pontos'], ['2', 'marcas · Honda e DAF'], ['+210', 'pessoas']]
  return (
    <SlideFachada titulo="Sobre o Grupo Caiobá" linha={330}>
      {/* Quem somos */}
      <Cartao x={96} y={140} w={520} h={360} style={{ padding: '32px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: COR.bege, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 15, letterSpacing: 4 }}>
          <span style={{ width: 34, height: 3, background: COR.bege }} /> QUEM SOMOS
        </div>
        <div style={{ marginTop: 12, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 40, lineHeight: 1.05, color: '#fff' }}>
          Uma história<br /><span style={{ color: COR.bege }}>de movimento</span>
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.55, color: TXT }}>
          Um grupo familiar com mais de quatro décadas de história e gestão profissional — presença consolidada em dois estados, conectando a mobilidade das pessoas à logística que move a economia.
        </p>
        {/* Nossa história completa nos sites (abrem em outra aba; o clique não passa o slide) */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {QUEM_SOMOS_SITES.map(({ nome, url, logo }) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px 8px 12px', borderRadius: 999, background: '#fff', border: '1px solid rgba(240,207,160,.6)', boxShadow: '0 6px 16px rgba(0,0,0,.3)', color: '#132028', textDecoration: 'none', cursor: 'pointer' }}>
              <span style={{ width: 40, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img src={logo} alt="" style={{ display: 'block', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </span>
              <span style={{ flex: 1, lineHeight: 1.15 }}>
                <span style={{ display: 'block', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 14 }}>{nome}</span>
                <span style={{ display: 'block', fontSize: 11.5, color: '#14707E', fontWeight: 600 }}>Quem somos</span>
              </span>
              <ExternalLink size={14} color="#14707E" />
            </a>
          ))}
        </div>
      </Cartao>
      <div style={{ position: 'absolute', left: 96, top: 520, width: 520, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {numeros.map(([n, r]) => (
          <div key={r} style={{ ...VIDRO_F, padding: '16px 10px', textAlign: 'center', height: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 34, color: COR.bege, lineHeight: 1 }}>{n}</div>
            <div style={{ fontSize: 13.5, color: TXT_SUAVE, marginTop: 8, lineHeight: 1.3 }}>{r}</div>
          </div>
        ))}
      </div>

      {/* Linha do tempo */}
      <Cartao x={646} y={140} w={574} h={500} style={{ padding: '26px 30px 26px 26px' }}>
        <div style={{ position: 'relative', height: '100%' }}>
          {/* trilho vertical que liga os marcos */}
          <div style={{ position: 'absolute', left: 10, top: 14, bottom: 30, width: 2, background: `linear-gradient(180deg, rgba(240,207,160,.35), ${COR.bege})` }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
            {LINHA_DO_TEMPO.map(m => (
              <div key={m.ano} style={{ display: 'flex', gap: 20, position: 'relative' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 4, boxSizing: 'border-box', border: `2.5px solid ${COR.bege}`, background: m.atual ? COR.bege : '#132028', boxShadow: m.atual ? '0 0 0 5px rgba(240,207,160,.22)' : 'none', position: 'relative', zIndex: 1 }} />
                <div style={{ lineHeight: 1.35 }}>
                  <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, fontStyle: 'italic', fontSize: 22, color: COR.bege }}>{m.ano}</div>
                  <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 17, color: '#fff' }}>{m.titulo}</div>
                  <div style={{ fontSize: 14, color: TXT_SUAVE }}>{m.texto}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 5 e 6. Serviços que oferecemos ─────────────────────────────────────────
function PainelServicos({ foto, titulo, itens, tamanho }) {
  return (
    <SlideFachada titulo={titulo} linha={330}>
      <Cartao x={96} y={140} w={640} h={500} style={{ padding: '30px 34px', display: 'flex', alignItems: 'center' }}>
        <ItemCheck claro icone={28} tamanho={tamanho}>
          {itens.map(t => <div key={t} style={{ fontWeight: 600, color: '#fff', marginBottom: tamanho * 0.85 }}>{t}</div>)}
        </ItemCheck>
      </Cartao>
      <CartaoFoto src={foto} x={766} y={140} w={454} h={500} />
    </SlideFachada>
  )
}

const ServicosVendas = () => (
  <PainelServicos foto={fachada} titulo="Serviços que oferecemos — Vendas" tamanho={18} itens={[
    'Comércio por atacado de caminhões novos e usados',
    'Comércio por atacado de reboques e semirreboques novos e usados',
    'Comércio sob consignação de veículos automotores',
    'Consórcios',
    'Financiamentos',
  ]} />
)

const ServicosPosVendas = () => (
  <PainelServicos foto={oficina} titulo="Serviços que oferecemos — Pós-Vendas" tamanho={15.5} itens={[
    'Manutenção e reparação mecânica de veículos automotores',
    'Lanternagem ou funilaria e pintura de veículos automotores',
    'Manutenção e reparação elétrica de veículos automotores',
    'Alinhamento e balanceamento de veículos automotores',
    'Lavagem, lubrificação e polimento de veículos automotores',
    'Serviços de borracharia para veículos automotores',
    'Instalação, manutenção e reparação de acessórios para veículos automotores',
    'Comércio a varejo de peças e acessórios novos para veículos automotores',
  ]} />
)

// ─── Mapas (7, 8, 9) ────────────────────────────────────────────────────────
// Posições relativas (0–1) das cidades dentro do contorno de MS.
const CIDADES = {
  campoGrande: { x: 0.473, y: 0.453, nome: 'CAMPO GRANDE', rotulo: { dx: -0.33, dy: 0.06 } },
  dourados: { x: 0.568, y: 0.676, nome: 'DOURADOS', rotulo: { dx: -0.19, dy: 0.06 } },
  tresLagoas: { x: 0.919, y: 0.413, nome: 'TRÊS LAGOAS', rotulo: { dx: -0.33, dy: 0.0 } },
}
const COR_MAPA = '#2A8C99'

function MapaMS({ x, y, w, cidades }) {
  const h = w * (384.4 / 400)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      <svg viewBox={MS_VIEWBOX} width={w} height={h} style={{ display: 'block', filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.4))' }}>
        <path d={MS_PATH} fill={COR_MAPA} stroke={COR.bege} strokeOpacity={0.7} strokeWidth={1.5} />
      </svg>
      {cidades.map(({ id, cor }) => {
        const c = CIDADES[id]
        const r = w / 26
        return (
          <React.Fragment key={id}>
            <div style={{ position: 'absolute', left: c.x * w - r / 2, top: c.y * h - r / 2, width: r, height: r, borderRadius: '50%', background: cor, border: '1.5px solid #fff', boxShadow: `0 0 10px ${cor}` }} />
            <div style={{ position: 'absolute', left: (c.x + c.rotulo.dx) * w, top: (c.y + c.rotulo.dy) * h, width: w * 0.33, textAlign: 'center', color: '#fff', fontSize: Math.max(9, w / 37), fontWeight: 700 }}>{c.nome}</div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function MapaBrasil({ x, y, w }) {
  const h = w * (311.6 / 300)
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: w, height: h }}>
      <svg viewBox={BRASIL_VIEWBOX} width={w} height={h} style={{ display: 'block' }}>
        <path d={BRASIL_PATH} fill={COR_MAPA} stroke="rgba(255,255,255,.6)" strokeWidth={0.6} />
      </svg>
      <div style={{ position: 'absolute', left: 0.333 * w, top: 0.4 * h, width: 0.43 * w, height: 0.343 * h, border: `2px solid ${COR.bege}` }} />
    </div>
  )
}

function Localizacao() {
  return (
    <SlideFachada titulo="Localização estratégica" linha={330}>
      <CartaoFoto src={br163} x={96} y={140} w={560} h={315} />
      <Cartao x={686} y={140} w={534} h={315} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 24px' }}>
        <div style={{ position: 'relative', width: 250, height: 240, flexShrink: 0 }}>
          <MapaMS x={0} y={0} w={250} cidades={[{ id: 'campoGrande', cor: '#fff' }]} />
        </div>
        <div style={{ fontSize: 17, lineHeight: 1.4 }}>
          <div style={{ ...SUBTITULO, fontSize: 20 }}>1 concessionária DAF</div>
          Atendendo todo o estado de Mato Grosso do Sul a partir de <b style={{ color: COR.bege }}>Campo Grande</b>.
        </div>
      </Cartao>
      {[
        { el: <div style={{ position: 'relative', width: 80, height: 84 }}><MapaBrasil x={0} y={0} w={80} /></div>, texto: <>No centro-oeste do país, em <b style={{ color: COR.bege }}>Mato Grosso do Sul</b></> },
        { el: <MapaIcone size={46} strokeWidth={1.6} color="#fff" />, texto: <>Em uma das principais rodovias do país: <b style={{ color: COR.bege }}>BR-163</b></> },
        { el: <Search size={46} strokeWidth={1.8} color="#fff" />, texto: <>Área total de aproximadamente <b style={{ color: COR.bege }}>22.000 m²</b></> },
      ].map((c, i) => (
        <Cartao key={i} x={96 + i * 385} y={480} w={355} h={130} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', fontSize: 16, lineHeight: 1.4 }}>
          <div style={{ width: 80, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{c.el}</div>
          <div>{c.texto}</div>
        </Cartao>
      ))}
    </SlideFachada>
  )
}

function Bolinha({ cor }) {
  return <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', background: cor, marginRight: 10, verticalAlign: -1, boxShadow: `0 0 8px ${cor}` }} />
}

function ExpansaoConcessionarias() {
  return (
    <SlideFachada titulo="DAF Caiobá Trucks — expansão futura" linha={330}>
      <MapaMS x={150} y={150} w={380} cidades={[{ id: 'campoGrande', cor: '#fff' }, { id: 'dourados', cor: '#ED7D31' }, { id: 'tresLagoas', cor: '#ED7D31' }]} />
      <MapaBrasil x={70} y={510} w={110} />
      <Cartao x={640} y={260} w={540} h={190} style={{ fontSize: 19, lineHeight: 1.6, padding: '30px 34px' }}>
        <div style={{ ...SUBTITULO, fontSize: 21 }}><Bolinha cor="#ED7D31" />Investimentos em concessionárias futuras</div>
        <div style={{ paddingLeft: 26 }}>• Dourados<br />• Três Lagoas</div>
      </Cartao>
    </SlideFachada>
  )
}

function ExpansaoPosto() {
  return (
    <SlideFachada titulo="DAF Caiobá Trucks — expansão futura" linha={330}>
      <MapaMS x={150} y={150} w={380} cidades={[{ id: 'campoGrande', cor: '#fff' }, { id: 'dourados', cor: '#8C8C8C' }, { id: 'tresLagoas', cor: '#FFE600' }]} />
      <div style={{ ...DESTAQUE, position: 'absolute', left: 470, top: 128, width: 290, height: 150, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 19, lineHeight: 1.3, padding: 30 }}>
        Abertura de Posto Avançado de Serviços
      </div>
      {/* "rabicho" do balão apontando para Três Lagoas */}
      <div style={{ position: 'absolute', left: 494, top: 262, width: 0, height: 0, borderLeft: '13px solid transparent', borderRight: '13px solid transparent', borderTop: '34px solid #14707E', transform: 'rotate(28deg)' }} />
      <MapaBrasil x={70} y={510} w={110} />
      <Cartao x={640} y={300} w={540} h={190} style={{ fontSize: 19, lineHeight: 1.6, padding: '30px 34px' }}>
        <div style={{ ...SUBTITULO, fontSize: 21 }}><Bolinha cor="#FFE600" />Abertura de Posto Avançado de Serviços</div>
        <div style={{ paddingLeft: 26 }}>• Três Lagoas<br />• Até dezembro de 2020</div>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 10. Oficina especializada ──────────────────────────────────────────────
function OficinaEspecializada() {
  return (
    <SlideFachada titulo="Oficina especializada" linha={330}>
      <CartaoFoto src={dafAcademy} x={96} y={140} w={470} h={500} />
      <Cartao x={596} y={140} w={624} h={500} style={{ padding: '34px 38px' }}>
        <ItemCheck claro icone={30} tamanho={20} titulo="Mecânicos treinados pela fábrica" />
        <ItemCheck claro icone={30} tamanho={16.5} style={{ marginTop: 26, lineHeight: 1.6 }}>
          A <b style={{ color: COR.bege }}>DAF Academy</b> foi implementada no Brasil seguindo o padrão de treinamento da companhia na Europa e é responsável pela capacitação das equipes de fábrica, serviços e comercial da Rede de Concessionárias.
          <p style={{ margin: '14px 0 0' }}>O centro local é equivalente ao da matriz em tecnologia, com ferramental, componentes, equipamentos de diagnóstico e veículos que simulam a manutenção dos caminhões DAF.</p>
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 11. DAF Assistance ─────────────────────────────────────────────────────
function DafAssistance() {
  const vantagens = [
    'Serviço 24 horas x 365 dias/ano', 'Maior disponibilidade dos caminhões', 'Uso das Peças Genuínas DAF', 'Uso do Serviço Genuíno DAF',
    'Garantia de suporte e reposição de peças', 'Acompanhamento do caso até a liberação do veículo', 'Informação para o cliente e concessionária de origem',
    'Atendimento gratuito durante o período de garantia', 'Deslocamento até a oficina e mão de obra incluídos durante a garantia',
  ]
  return (
    <SlideFachada titulo="DAF Assistance" linha={260}>
      <CartaoFoto src={assistanceVan} x={96} y={140} w={360} h={300} branco />
      <Cartao x={96} y={460} w={360} h={180} destaque style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '18px 20px' }}>
        <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, color: COR.bege, fontSize: 15, letterSpacing: 1 }}>DAF ASSISTANCE · 24 HORAS</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 32 }}>
          <PhoneCall size={28} /> 0800 703 3360
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'rgba(255,255,255,.8)' }}>Chamada gratuita · tenha em mãos o documento do veículo e a localização exata.</div>
      </Cartao>
      <Cartao x={486} y={140} w={734} h={500} style={{ padding: '28px 32px', fontSize: 15, lineHeight: 1.5 }}>
        <p style={{ ...P(16), color: '#fff', fontWeight: 600 }}>Serviço de assistência técnica emergencial 24 horas para todos os caminhões DAF — gratuito para caminhões em período de garantia.</p>
        <p style={P(14)}>Com o DAF Assistance o cliente viaja mais tranquilo, com o suporte de toda uma rede DAF altamente qualificada no Brasil. Principais vantagens:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 22, rowGap: 10 }}>
          {vantagens.map(v => (
            <ItemCheck key={v} claro icone={20} tamanho={14}>{v}</ItemCheck>
          ))}
        </div>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 12. DAF Webshop ────────────────────────────────────────────────────────
function Webshop() {
  return (
    <SlideFachada titulo="DAF Webshop" linha={260}>
      <CartaoFoto src={webshop} x={96} y={140} w={540} h={330} branco />
      <div style={{ position: 'absolute', left: 96, top: 490, width: 540, textAlign: 'center', fontSize: 17 }}>
        <LinkExterno href="https://parts.daf.com/pt-BR">parts.daf.com/pt-BR</LinkExterno>
      </div>
      <Cartao x={666} y={140} w={554} h={500} style={{ padding: '28px 32px', fontSize: 15, lineHeight: 1.55 }}>
        <p style={P(14)}>Com o DAF Webshop é possível selecionar e comprar peças pela internet diretamente com os concessionários da marca.</p>
        <p style={P(14)}>A pesquisa pode ser feita de forma visual, por desenhos técnicos, para encontrar a peça exata e a aplicação correta — com disponibilidade e preço na hora.</p>
        <p style={P(14)}>O site traz o portfólio completo de peças DAF e TRP: clientes de todo o Brasil recebem as peças onde estiverem. Basta filtrar, adicionar ao carrinho e comprar.</p>
        <p style={{ ...P(0), color: '#fff', fontWeight: 600 }}>Disponível 24 h por dia, 7 dias por semana — no smartphone, computador ou tablet.</p>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 13. Catálogo eletrônico TRP ────────────────────────────────────────────
function CatalogoTrp() {
  return (
    <SlideFachada titulo="Catálogo eletrônico TRP" linha={330}>
      <CartaoFoto src={trpCatalogo} x={96} y={170} w={520} h={290} branco />
      <div style={{ position: 'absolute', left: 96, top: 480, width: 520, textAlign: 'center', fontSize: 17 }}>
        <LinkExterno href="https://www.trp.eu/pt-BR">trp.eu/pt-BR</LinkExterno>
      </div>
      <Cartao x={646} y={170} w={574} h={330} style={{ padding: '34px 38px', fontSize: 17, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={17}>
          <p style={P(18)}>O catálogo de peças TRP conta com <b style={{ color: COR.bege }}>mais de 5.000 peças multimarcas</b>, todas com 1 ano de garantia nacional e sem limite de quilometragem.</p>
          <p style={P(0)}>Com navegação simples, é possível buscar, filtrar e visualizar as peças, conferir informações técnicas e encontrar a concessionária DAF mais próxima.</p>
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

// ─── 14. Disponibilidade de peças ───────────────────────────────────────────
function CirculoMarca({ cx, cy, r, anel, cor, logo, logoW, titulo, sub, rotuloY }) {
  return (
    <>
      <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: '#fff', border: `${anel}px solid ${cor}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 34px rgba(0,0,0,.45)' }}>
        <img src={logo} alt="" style={{ width: logoW }} />
      </div>
      <div style={{ position: 'absolute', left: cx - 160, top: rotuloY, width: 320, textAlign: 'center' }}>
        <div style={{ color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 21 }}>{titulo}</div>
        <div style={{ color: COR.bege, fontSize: 16 }}>{sub}</div>
      </div>
    </>
  )
}

function DisponibilidadePecas() {
  return (
    <SlideFachada titulo="Disponibilidade de peças" linha={330}>
      <div style={{ ...sangrar(0, 300, 1280, 130), background: 'rgba(20,112,126,.55)', borderTop: '1px solid rgba(240,207,160,.25)', borderBottom: '1px solid rgba(240,207,160,.25)' }} />
      <CirculoMarca cx={310} cy={365} r={140} anel={18} cor="#6AB3C2" logo={logoPaccar} logoW={200} titulo="Peças Genuínas PACCAR" sub="Peças para o motor PACCAR" rotuloY={525} />
      <CirculoMarca cx={970} cy={365} r={140} anel={18} cor="#6AB3C2" logo={logoTrpGrande} logoW={180} titulo="Peças Multimarcas TRP" sub="Para caminhões, carretas e ônibus" rotuloY={525} />
      <CirculoMarca cx={640} cy={372} r={195} anel={34} cor={COR.bege} logo={logoDaf} logoW={235} titulo="Peças Genuínas DAF" sub="Peças para veículos DAF" rotuloY={590} />
    </SlideFachada>
  )
}

// ─── 15–19. Peças ───────────────────────────────────────────────────────────
function PaccarParts() {
  return (
    <SlideFachada titulo="PACCAR Parts" linha={260}>
      <CartaoFoto src={paccarPartsLinhas} x={96} y={160} w={520} h={300} branco />
      <Cartao x={646} y={160} w={574} h={380} style={{ padding: '34px 38px', fontSize: 17, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={17}>
          <p style={P(18)}>A <b style={{ color: COR.bege }}>PACCAR Parts</b> é a fornecedora líder em peças de alta qualidade para veículos pesados e extrapesados, com serviços e soluções de suporte desenvolvidos em torno das necessidades do transporte profissional.</p>
          <p style={P(0)}>Atinge os mais altos padrões de eficiência de distribuição, serviço e suporte comercial no mercado brasileiro, em estreita cooperação com fornecedores estratégicos e concessionários DAF.</p>
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

function PecasPaccar() {
  return (
    <SlideFachada titulo="Peças Genuínas PACCAR" linha={330}>
      <CartaoFoto src={paccarCaixa} x={96} y={170} w={440} h={300} branco />
      <Cartao x={566} y={150} w={654} h={470} style={{ padding: '30px 36px', fontSize: 16.5, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={16.5}>
          <p style={P(14)}>A DAF conta com uma linha completa de peças genuínas para o motor exclusivo <b style={{ color: COR.bege }}>PACCAR MX13</b>, garantindo qualidade e desempenho em qualquer aplicação.</p>
          <ListaVisto tamanho={16.5} itens={['Qualidade premium, valor e performance', 'Peças de motores']} />
          <div style={{ ...SUBTITULO, marginTop: 18 }}>Desempenho</div>
          <p style={P(0)}>Materiais de primeira linha trazem alta confiança e durabilidade ao motor PACCAR — e aumentam o seu desempenho.</p>
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

function PecasDaf() {
  return (
    <SlideFachada titulo="Peças Genuínas DAF" linha={330}>
      <CartaoFoto src={dafPecas} x={96} y={170} w={440} h={300} />
      <Cartao x={566} y={150} w={654} h={470} style={{ padding: '30px 36px', fontSize: 16, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={16}>
          <p style={P(14)}>O desenho preciso de cada peça genuína DAF garante desempenho otimizado, segurança máxima e vida útil prolongada.</p>
          <div style={SUBTITULO}>Benefícios das peças Genuínas DAF</div>
          <p style={P(14)}>Selecionadas junto aos melhores fornecedores globais, seguindo os padrões DAF de qualidade e disponibilidade de entrega.</p>
          <ListaVisto tamanho={16} itens={['Qualidade premium, valor e desempenho', 'Peça genuína DAF ou patenteada', 'Peças vendidas globalmente', 'Embalagem genuína DAF']} />
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

function AcessoriosDaf() {
  return (
    <SlideFachada titulo="Acessórios Genuínos DAF" linha={330}>
      <CartaoFoto src={dafAcessorios} x={96} y={190} w={520} h={260} branco />
      <Cartao x={646} y={190} w={574} h={300} style={{ padding: '34px 38px', fontSize: 17, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={17} titulo="Funcional e confortável">
          Os caminhões DAF oferecem excelente retorno sobre o investimento, com baixo consumo de combustível, alta qualidade e baixos custos de manutenção. Com a linha de acessórios DAF, você aprimora o desempenho e a aparência do veículo, ajustando o caminhão às suas necessidades.
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

function PecasTrp() {
  const blocos = [
    ['Qualidade TRP', 'Peças multimarcas que atendem às mais rigorosas exigências de qualidade: todos os produtos passam por testes rigorosos e condições extremas e cumprem as normas do setor.'],
    ['Uma solução para seu veículo', 'Ampla gama de peças de alta qualidade e equipamentos de oficina para todas as marcas de caminhões, ônibus e carretas.'],
    ['Multimarcas e marcas conhecidas', 'Os pontos de venda TRP também têm uma gama completa de peças de marcas conhecidas: o produto certo e o preço justo para cada cliente.'],
    ['Garantia de peças e mão de obra', 'Toda a gama TRP tem garantia total de um ano. Com instalação na oficina TRP, a garantia abrange peças e mão de obra.'],
  ]
  return (
    <SlideFachada titulo="Peças TRP" linha={260}>
      <CartaoFoto src={trpPecas} x={96} y={150} w={440} h={250} />
      <div style={{ position: 'absolute', left: 566, top: 150, width: 654, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {blocos.map(([t, d]) => (
          <div key={t} style={{ ...VIDRO_F, padding: '18px 20px', height: 222, fontSize: 14, lineHeight: 1.5 }}>
            <div style={{ ...SUBTITULO, fontSize: 17 }}>{t}</div>
            {d}
          </div>
        ))}
      </div>
    </SlideFachada>
  )
}

// ─── 20–21. DAF Multisuporte ────────────────────────────────────────────────
function Multisuporte() {
  return (
    <SlideFachada titulo="DAF Multisuporte" linha={330}>
      <CartaoFoto src={multisuporteLogo} x={96} y={190} w={440} h={240} branco />
      <Cartao x={566} y={150} w={654} h={440} style={{ padding: '30px 36px', fontSize: 16.5, lineHeight: 1.6 }}>
        <ItemCheck claro icone={26} tamanho={16.5}>
          <div style={SUBTITULO}>Produtos para melhor gestão da sua frota</div>
          <p style={P(14)}>Os contratos de manutenção DAF Multisuporte dão ao cliente mais confiabilidade nas manutenções, a um <b style={{ color: COR.bege }}>preço fixo por quilômetro rodado</b>. Você decide o nível de serviço.</p>
          <p style={P(14)}>Você fica sempre informado da manutenção necessária, com o máximo de disponibilidade do veículo — e pode se concentrar na atividade-fim do seu negócio.</p>
          <p style={P(0)}>Uma ferramenta importante para a administração e o planejamento da manutenção dos caminhões DAF.</p>
        </ItemCheck>
      </Cartao>
    </SlideFachada>
  )
}

function PlanoMultisuporte() {
  const planos = [msOleos, msPreventivo, msPleno]
  return (
    <SlideFachada titulo="Plano de manutenção DAF Multisuporte" linha={330}>
      <div style={{ position: 'absolute', left: 96, top: 170, width: 1124, display: 'flex', justifyContent: 'space-between' }}>
        {planos.map(src => (
          <div key={src} style={{ width: 340, height: 360, borderRadius: 16, background: '#fff', border: '1px solid rgba(240,207,160,.3)', boxShadow: '0 12px 28px rgba(0,0,0,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box' }}>
            <img src={src} alt="" style={{ width: '100%' }} />
          </div>
        ))}
      </div>
    </SlideFachada>
  )
}

// ─── 22–25. Clientes ────────────────────────────────────────────────────────
function NossosClientesAbertura() {
  return (
    <SlideFachada>
      <CartaoFoto src={frotaClientes} x={96} y={110} w={520} h={500} />
      <div style={{ ...DESTAQUE, position: 'absolute', left: 646, top: 210, width: 574, height: 300, borderRadius: 16, padding: '70px 60px' }}>
        <div style={{ color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 44, lineHeight: 1.1 }}>NOSSOS CLIENTES</div>
        <div style={{ marginTop: 14, width: 260, height: 4, background: COR.bege }} />
        <div style={{ marginTop: 22, color: COR.bege, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 36 }}>CAIOBÁ</div>
      </div>
    </SlideFachada>
  )
}

function TotalClientes() {
  const itens = [['197', 'Clientes'], ['449', 'Veículos vendidos']]
  return (
    <SlideFachada titulo="Nossos clientes" linha={260}>
      <div style={{ position: 'absolute', left: 240, top: 200, width: 800, textAlign: 'center', fontFamily: FONTE_TITULO, color: COR.bege, fontWeight: 700, fontSize: 18, letterSpacing: 2 }}>TOTAL DE CLIENTES CAIOBÁ</div>
      {itens.map(([valor, rotulo], i) => (
        <div key={rotulo} style={{ ...(i === 0 ? { ...DESTAQUE, borderRadius: 16 } : VIDRO_F), position: 'absolute', left: 240 + i * 420, top: 250, width: 380, height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 96, color: '#fff', lineHeight: 1 }}>{valor}</div>
          <div style={{ fontSize: 20, color: COR.bege, marginTop: 14, fontWeight: 600 }}>{rotulo}</div>
        </div>
      ))}
    </SlideFachada>
  )
}

const MESES = ['jan/20', 'fev/20', 'mar/20', 'abr/20', 'mai/20', 'jun/20', 'jul/20']
const MARCAS = [
  { nome: 'Volvo', cor: '#00B0F0', v: [27.4, 26.8, 37.2, 38.3, 30.0, 23.0, 30.5], total: 29.8 },
  { nome: 'MB', cor: '#00B050', v: [41.1, 21.6, 10.3, 44.7, 20.0, 29.9, 27.6], total: 26.6 },
  { nome: 'DAF', cor: '#FFC000', v: [4.1, 23.7, 6.4, 8.5, 13.8, 19.5, 21.0], total: 15.0 },
  { nome: 'Scania', cor: '#B37FE0', v: [26.0, 11.3, 17.9, 2.1, 16.2, 13.8, 10.5], total: 14.3 },
  { nome: 'Iveco', cor: '#FF5CF0', v: [0.0, 14.4, 16.7, 0.0, 8.8, 2.3, 3.8], total: 7.1 },
  { nome: 'Man', cor: '#C99A6B', v: [1.4, 1.0, 9.0, 4.3, 11.2, 8.0, 6.7], total: 6.0 },
  { nome: 'VW', cor: '#FF4D4D', v: [0.0, 1.0, 2.6, 2.1, 0.0, 3.4, 0.0], total: 1.2 },
]
const pct = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'

function MarketShare() {
  const dados = MESES.map((m, i) => Object.fromEntries([['mes', m], ...MARCAS.map(b => [b.nome, b.v[i]])]))
  const eixo = { fontSize: 12, fill: 'rgba(255,255,255,.7)' }
  return (
    <SlideFachada titulo="Market share de pesados — 2020" linha={330}>
      <Cartao x={96} y={130} w={1124} h={300} style={{ padding: '14px 18px 6px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 6, right: 16, bottom: 0, left: -6 }}>
            <CartesianGrid stroke="rgba(255,255,255,.1)" vertical={false} />
            <XAxis dataKey="mes" tick={eixo} axisLine={{ stroke: 'rgba(255,255,255,.25)' }} tickLine={false} />
            <YAxis tickFormatter={v => v + '%'} tick={eixo} axisLine={false} tickLine={false} domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} />
            <Tooltip formatter={(v, n) => [pct(v), n]} contentStyle={{ fontSize: 13, background: '#132028', border: '1px solid rgba(240,207,160,.4)', borderRadius: 8, color: '#fff' }} labelStyle={{ color: COR.bege }} />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 13, paddingBottom: 4, color: '#fff' }} />
            {MARCAS.map(b => (
              <Line key={b.nome} type="monotone" dataKey={b.nome} stroke={b.cor} strokeWidth={b.nome === 'DAF' ? 4 : 2.2} strokeOpacity={b.nome === 'DAF' ? 1 : 0.85} dot={{ r: 3.5, fill: b.cor }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Cartao>
      <Cartao x={96} y={444} w={1124} h={196} style={{ padding: '10px 18px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, color: TXT }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(240,207,160,.35)', color: COR.bege }}>
              <th style={{ textAlign: 'left', padding: '3px 6px', width: 100 }} />
              {MESES.map(m => <th key={m} style={{ padding: '3px 6px', fontWeight: 600 }}>{m}</th>)}
              <th style={{ padding: '3px 6px', fontWeight: 700 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {MARCAS.map(b => (
              <tr key={b.nome} style={{ borderBottom: '1px solid rgba(255,255,255,.06)', fontWeight: b.nome === 'DAF' ? 700 : 400, background: b.nome === 'DAF' ? 'rgba(255,192,0,.14)' : 'transparent', color: b.nome === 'DAF' ? '#fff' : TXT }}>
                <td style={{ padding: '2px 6px' }}><span style={{ display: 'inline-block', width: 18, height: 3, background: b.cor, marginRight: 8, verticalAlign: 3 }} />{b.nome}</td>
                {b.v.map((v, i) => <td key={i} style={{ textAlign: 'center', padding: '2px 6px' }}>{pct(v)}</td>)}
                <td style={{ textAlign: 'center', padding: '2px 6px', fontWeight: 700 }}>{pct(b.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>
    </SlideFachada>
  )
}

// Principais clientes: nome do proprietário e telefone do original NÃO entram
// (dados pessoais ficariam no código do site, acessível sem login).
const CLIENTES = [
  ['LONTANO TRANSPORTES EIRELI', 90], ['RODOMAIOR TRANSPORTES LTDA', 26], ['GS LOGISTICA LTDA', 19],
  ['TRANSPORTADORA SANTA IZABEL LTDA', 6], ['CENZE', 5], ['ZERO HUM LOGISTICA E TRANSPORTES LTDA - EPP', 12],
  ['MS TRANSPORTES LTDA', 10], ['CEZAR QUEIROZ EIRELI', 7], ['CONSTRUPEDRA MATERIAIS PARA CONSTRUCAO EIRELI-EPP', 4],
  ['BOTTAN & CIA LTDA', 5], ['C.S. MENDES TRANSPORTES LTDA', 7], ['RODOBELO TRANSPORTES RODOVIARIOS LTDA', 5],
  ['TRANSPORTADORA RODOMASTER LTDA', 5], ['TRENTIN & TRENTIN TRANSPORTES LTDA', 4], ['PAJOARA INDUSTRIA E COMERCIO LTDA', 7],
]

function PrincipaisClientes() {
  return (
    <SlideFachada titulo="Principais clientes" linha={330}>
      <Cartao x={96} y={130} w={820} h={510} style={{ padding: '10px 14px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ color: COR.bege, textAlign: 'left', borderBottom: '1px solid rgba(240,207,160,.35)' }}>
              <th style={{ padding: '7px 10px' }}>CLIENTE</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', width: 70 }}>MODELO</th>
              <th style={{ padding: '7px 10px', textAlign: 'center', width: 90 }}>QUANT.</th>
            </tr>
          </thead>
          <tbody>
            {CLIENTES.map(([nome, qtd], i) => (
              <tr key={nome} style={{ background: i % 2 ? 'transparent' : 'rgba(255,255,255,.04)', color: TXT }}>
                <td style={{ padding: '5.5px 10px' }}>{nome}</td>
                <td style={{ padding: '5.5px 10px', textAlign: 'center' }}>XF</td>
                <td style={{ padding: '5.5px 10px', textAlign: 'center', fontWeight: 700, color: '#fff' }}>{qtd}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>
      <div style={{ ...DESTAQUE, position: 'absolute', left: 946, top: 130, width: 274, borderRadius: 16, color: '#fff', textAlign: 'center', padding: '34px 16px' }}>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1, fontFamily: FONTE_TITULO }}>{CLIENTES.reduce((s, [, q]) => s + q, 0)}</div>
        <div style={{ fontSize: 15, marginTop: 10, color: COR.bege, fontWeight: 600 }}>caminhões XF<br />nos 15 principais clientes</div>
      </div>
    </SlideFachada>
  )
}

// ─── 26–27. Encerramento ────────────────────────────────────────────────────
function SigaDaf() {
  const links = [
    [Facebook, 'facebook.com/DAFcaminhoes', 'https://www.facebook.com/DAFcaminhoes'],
    [Instagram, 'instagram.com/dafcaminhoes', 'https://www.instagram.com/dafcaminhoes'],
    [Globe, 'caiobatrucks.com.br', 'https://caiobatrucks.com.br'],
    [Instagram, 'instagram.com/dafcaiobatrucks', 'https://www.instagram.com/dafcaiobatrucks'],
    [Facebook, 'facebook.com/caiobatrucks', 'https://www.facebook.com/caiobatrucks'],
  ]
  return (
    <SlideFachada titulo="Siga a DAF" linha={260}>
      <div style={{ position: 'absolute', left: 0, top: 170, width: 1280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {links.map(([Icone, t, url]) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
            style={{ ...VIDRO_F, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 14, padding: '9px 20px 9px 9px', width: 460, fontSize: 19, color: '#fff', textDecoration: 'none', cursor: 'pointer' }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: '#14707E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icone size={21} color="#fff" /></span>
            <span style={{ flex: 1 }}>{t}</span>
            <ExternalLink size={17} color={COR.bege} />
          </a>
        ))}
      </div>
    </SlideFachada>
  )
}

function Obrigado() {
  const linha = { display: 'flex', alignItems: 'flex-start', gap: 16, color: COR.bege, fontSize: 20, lineHeight: 1.5, fontWeight: 600 }
  const icone = { width: 36, height: 36, borderRadius: '50%', border: `2px solid ${COR.bege}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }
  return (
    <SlideFachada>
      <div style={{ ...DESTAQUE, position: 'absolute', left: 96, top: 130, width: 620, height: 460, borderRadius: 16, padding: '56px 56px' }}>
        <div style={{ color: '#fff', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: 60 }}>OBRIGADO!</div>
        <div style={{ marginTop: 12, width: 260, height: 4, background: COR.bege }} />
        <div style={{ ...linha, marginTop: 46 }}>
          <span style={{ ...icone, marginTop: 2 }}><MapPin size={18} /></span>
          <div><span style={{ color: '#fff' }}>CAIOBÁ TRUCKS</span><br />Av. Zilá Correa Machado, 2281<br />Campo Grande – MS</div>
        </div>
        <div style={{ ...linha, marginTop: 16 }}>
          <span style={icone}><Phone size={17} /></span>
          <div>+55 67 9 99691 6420 · (67) 4141 7271</div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 760, top: 330, width: 460, textAlign: 'center' }}>
        <LinkExterno href="https://caiobatrucks.com.br" style={{ fontSize: 30, fontFamily: FONTE_TITULO, fontWeight: 700, color: '#fff' }}>caiobatrucks.com.br</LinkExterno>
      </div>
    </SlideFachada>
  )
}

export default {
  slug: 'gestao-pos-vendas',
  titulo: 'Gestão de Pós-Vendas',
  descricao: 'Organização da empresa, estrutura, serviços, peças, contratos de manutenção e clientes da Caiobá Trucks.',
  categoria: 'Pós-Vendas',
  empresa: 'Caiobá Trucks',
  // secao = título no índice da apresentação (botão lateral do player);
  // titulo = subtítulo (o slide). Slides seguidos com a mesma seção ficam agrupados.
  slides: [
    { secao: 'Capa', titulo: 'Gestão de Pós-Vendas', Componente: Capa },
    { secao: 'Organização da Empresa', titulo: 'Organograma', Componente: Organograma },
    { secao: 'Organização da Empresa', titulo: 'Hildemar — atribuições e foco', Componente: Atribuicoes },
    { secao: 'A Caiobá Trucks', titulo: 'Sobre o Grupo Caiobá', Componente: Sobre },
    { secao: 'A Caiobá Trucks', titulo: 'Serviços que oferecemos — Vendas', Componente: ServicosVendas },
    { secao: 'A Caiobá Trucks', titulo: 'Serviços que oferecemos — Pós-Vendas', Componente: ServicosPosVendas },
    { secao: 'A Caiobá Trucks', titulo: 'Localização estratégica', Componente: Localizacao },
    { secao: 'A Caiobá Trucks', titulo: 'Expansão futura — concessionárias', Componente: ExpansaoConcessionarias },
    { secao: 'A Caiobá Trucks', titulo: 'Expansão futura — posto avançado', Componente: ExpansaoPosto },
    { secao: 'Serviços e canais DAF', titulo: 'Oficina especializada', Componente: OficinaEspecializada },
    { secao: 'Serviços e canais DAF', titulo: 'DAF Assistance', Componente: DafAssistance },
    { secao: 'Serviços e canais DAF', titulo: 'DAF Webshop', Componente: Webshop },
    { secao: 'Serviços e canais DAF', titulo: 'Catálogo eletrônico TRP', Componente: CatalogoTrp },
    { secao: 'Peças e acessórios', titulo: 'Disponibilidade de peças', Componente: DisponibilidadePecas },
    { secao: 'Peças e acessórios', titulo: 'PACCAR Parts', Componente: PaccarParts },
    { secao: 'Peças e acessórios', titulo: 'Peças Genuínas PACCAR', Componente: PecasPaccar },
    { secao: 'Peças e acessórios', titulo: 'Peças Genuínas DAF', Componente: PecasDaf },
    { secao: 'Peças e acessórios', titulo: 'Acessórios Genuínos DAF', Componente: AcessoriosDaf },
    { secao: 'Peças e acessórios', titulo: 'Peças TRP', Componente: PecasTrp },
    { secao: 'Contratos de manutenção', titulo: 'DAF Multisuporte', Componente: Multisuporte },
    { secao: 'Contratos de manutenção', titulo: 'Plano de manutenção DAF Multisuporte', Componente: PlanoMultisuporte },
    { secao: 'Clientes e mercado', titulo: 'Nossos clientes', Componente: NossosClientesAbertura },
    { secao: 'Clientes e mercado', titulo: 'Total de clientes Caiobá', Componente: TotalClientes },
    { secao: 'Clientes e mercado', titulo: 'Market share de pesados — 2020', Componente: MarketShare },
    { secao: 'Clientes e mercado', titulo: 'Principais clientes', Componente: PrincipaisClientes },
    { secao: 'Encerramento', titulo: 'Siga a DAF', Componente: SigaDaf },
    { secao: 'Encerramento', titulo: 'Obrigado!', Componente: Obrigado },
  ],
}
