import React, { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react'
import { RefreshCw, Clock, ClipboardList, AlertTriangle, Hourglass, ChevronRight, ChevronDown, Search, ArrowUp, ArrowDown, ArrowUpDown, X } from 'lucide-react'
import { apiService } from '../../services/api'
import { fmt, fmtDate, primeiroUltimoNome, diasOficina } from './auditoriaOsRegras'

// Visão "Tempo na Oficina" do BI Possibilidades (Pós-Vendas): O.S. em aberto agora (dias da abertura até hoje) +
// O.S. que saíram no período (dias da abertura até o Fechado), das empresas marcadas no cabeçalho do BI.
// Em aberto: Trucks → ROF001_OSABERTA (SharePoint); Motos → MicroWork (mesma fonte da Auditoria O.S. Aberta).
// Saídas: arquivos ROF001_OSAberta_Excel <ano> (SharePoint), só Trucks.
// Setor e Tipo Interno vêm do cadastro Tipos de OS (dim_tipos_os, pela sigla). Uma O.S. pode vir em mais de uma
// linha (um tipo por linha, ex.: F01 Funilaria + V11 Mecânica) — a quantidade conta O.S. distintas; o valor soma as linhas.

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
const fonteMicrowork = (e) => (e?.agrupamento_nome || '').trim().toLowerCase() === 'caiobá motos'
const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa_sistema || e.nome_empresa || ''

// Tipo fora do cadastro (ex.: Motos/MicroWork) → regra pelo nome
const tipoInternoPorNome = (nome) => {
  const n = semAcento(nome)
  if (n.includes('GARANTIA')) return 'Garantia'
  if (n.includes('SEGURADORA')) return 'Seguradora'
  if (n.includes('INTERNA')) return 'Interna'
  if (n.includes('REVISAO DE ENTREGA')) return 'Revisão de Entrega'
  if (n.includes('GRATUIT')) return 'Revisão Gratuita'
  if (n) return 'Cliente'
  return '(Sem tipo)'
}
const setorPorNome = (nome) => {
  const n = semAcento(nome)
  if (n.includes('FUNIL') || n.includes('PINTUR') || n.includes('(FUN')) return 'Funilaria/Pintura'
  return n ? 'Mecânica' : '(Sem setor)'
}

export const FAIXAS_DIAS = [
  // Faixas definidas pelo usuário em 24/11/2026
  { id: 'f0', label: 'Até 2', min: 0, max: 2, cor: 'bg-green-100 text-green-800' },
  { id: 'f1', label: 'Até 7', min: 3, max: 7, cor: 'bg-lime-100 text-lime-800' },
  { id: 'f2', label: 'Até 15', min: 8, max: 15, cor: 'bg-yellow-100 text-yellow-800' },
  { id: 'f3', label: 'Até 30', min: 16, max: 30, cor: 'bg-orange-100 text-orange-800' },
  { id: 'f4', label: 'Até 60', min: 31, max: 60, cor: 'bg-red-100 text-red-700' },
  { id: 'f5', label: '+ de 60', min: 61, max: Infinity, cor: 'bg-red-200 text-red-900' },
]
const faixaDe = (d) => (d === null ? null : FAIXAS_DIAS.find(f => d >= f.min && d <= f.max)?.id || null)

const hojeIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const corDias = (d) => (d >= 30 ? 'bg-red-100 text-red-700' : d >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')

// Campo à direita do relógio (modelo pedido em 24/11/2026: rótulo + caixa cinza com o valor)
function CampoRelogio({ rotulo, valor, cor }) {
  return (
    <div>
      <p className="text-[11px] font-bold text-slate-700 leading-tight">{rotulo}</p>
      <p className="mt-0.5 rounded border border-slate-200 bg-slate-100 px-2 py-1 text-right text-xs font-semibold" style={cor ? { color: cor } : undefined}>{valor}</p>
    </div>
  )
}

// ── Relógio do Tempo na Oficina: % dos veículos que saíram em até N dias, 3 zonas de cor pela regra cadastrada
// (vermelho < atenção ≤ amarelo < meta ≤ verde). Sem regra: ponteiro cinza e aviso para cadastrar na engrenagem. ──
function RelogioTempo({ valor, regra, qtdDentro, qtdTotal }) {
  const v = Math.max(0, Math.min(100, valor || 0))
  const cx = 90, cy = 92, r = 60
  const ang = (t) => (180 - t * 180) * (Math.PI / 180)
  const ponto = (t, raio = r) => [cx + raio * Math.cos(ang(t)), cy - raio * Math.sin(ang(t))]
  const arco = (tIni, tFim, raio = r) => {
    const [x1, y1] = ponto(tIni, raio)
    const [x2, y2] = ponto(tFim, raio)
    return `M ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2}`
  }
  const atencao = regra ? Number(regra.atencao_pct) / 100 : null
  const meta = regra ? Number(regra.meta_pct) / 100 : null
  const cor = !regra ? '#64748b' : v / 100 >= meta ? '#0ca30c' : v / 100 >= atencao ? '#fab219' : '#d03b3b'
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10)
  const tAgulha = v / 100
  const [px, py] = ponto(tAgulha, r - 14)
  const perpAng = ang(tAgulha) + Math.PI / 2
  const [bx1, by1] = [cx + 3.2 * Math.cos(perpAng), cy - 3.2 * Math.sin(perpAng)]
  const [bx2, by2] = [cx - 3.2 * Math.cos(perpAng), cy + 3.2 * Math.sin(perpAng)]
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-4">
      <div className="flex flex-col items-center shrink-0 w-[45%] max-w-[190px]">
      <p className="text-[11px] font-bold uppercase text-slate-700 text-center leading-tight">
        {regra ? `Saíram em até ${regra.dias_limite} dias` : 'Saída no prazo'}
      </p>
      <svg viewBox="0 0 180 116" className="w-full">
        {regra ? (
          <>
            {atencao > 0 && <path d={arco(0, atencao)} stroke="#d03b3b" strokeWidth="11" fill="none" />}
            {meta > atencao && <path d={arco(atencao, meta)} stroke="#fab219" strokeWidth="11" fill="none" />}
            {meta < 1 && <path d={arco(meta, 1)} stroke="#0ca30c" strokeWidth="11" fill="none" />}
          </>
        ) : <path d={arco(0, 1)} stroke="#e2e8f0" strokeWidth="11" fill="none" />}
        {ticks.map((t, i) => {
          const major = i % 2 === 0
          const [x1, y1] = ponto(t, r + 7)
          const [x2, y2] = ponto(t, r + (major ? 15 : 11))
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#898781" strokeWidth={major ? 1.5 : 1} />
        })}
        {[0, 0.5, 1].map((t, i) => {
          const [lx, ly] = ponto(t, r + 24)
          return <text key={i} x={lx} y={ly + 3} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '8px' }}>{Math.round(t * 100)}</text>
        })}
        <polygon points={`${bx1},${by1} ${bx2},${by2} ${px},${py}`} fill="#334155" />
        <circle cx={cx} cy={cy} r="7" fill="#1e293b" stroke={cor} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
      </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <CampoRelogio rotulo="% Realizado" valor={`${v.toFixed(1).replace('.', ',')}%`} cor={cor} />
        <CampoRelogio rotulo="Meta" valor={regra ? `${Number(regra.meta_pct)}%` : '—'} />
        <CampoRelogio rotulo={regra ? `O.S. em até ${regra.dias_limite} dias` : 'O.S. no prazo'} valor={regra ? `${qtdDentro} de ${qtdTotal}` : '—'} />
      </div>
    </div>
  )
}

// ── Relógio da Média de dias na oficina (menos é melhor): verde até a meta de dias, amarelo até o limite de
// atenção, vermelho acima — faixas da mesma regra da engrenagem. Escala de 0 até 1,5× o limite de atenção. ──
function RelogioMedia({ media, regra }) {
  const temFaixas = regra && regra.media_meta_dias != null && regra.media_atencao_dias != null
  const metaD = temFaixas ? Number(regra.media_meta_dias) : null
  const atencaoD = temFaixas ? Number(regra.media_atencao_dias) : null
  const max = Math.max(temFaixas ? Math.ceil(atencaoD * 1.5) : 30, 1)
  // Dias inteiros (pedido do usuário, 24/11/2026): número, ponteiro e cor usam a média arredondada
  const m = media === null || media === undefined ? null : Math.round(media)
  const t = m === null ? 0 : Math.max(0, Math.min(1, m / max))
  const cx = 90, cy = 92, r = 60
  const ang = (x) => (180 - x * 180) * (Math.PI / 180)
  const ponto = (x, raio = r) => [cx + raio * Math.cos(ang(x)), cy - raio * Math.sin(ang(x))]
  const arco = (a, b, raio = r) => {
    const [x1, y1] = ponto(a, raio)
    const [x2, y2] = ponto(b, raio)
    return `M ${x1} ${y1} A ${raio} ${raio} 0 0 1 ${x2} ${y2}`
  }
  const cor = !temFaixas || m === null ? '#64748b' : m <= metaD ? '#0ca30c' : m <= atencaoD ? '#fab219' : '#d03b3b'
  const tMeta = temFaixas ? Math.min(1, metaD / max) : 0
  const tAtencao = temFaixas ? Math.min(1, atencaoD / max) : 0
  const ticks = Array.from({ length: 11 }, (_, i) => i / 10)
  const [px, py] = ponto(t, r - 14)
  const perpAng = ang(t) + Math.PI / 2
  const [bx1, by1] = [cx + 3.2 * Math.cos(perpAng), cy - 3.2 * Math.sin(perpAng)]
  const [bx2, by2] = [cx - 3.2 * Math.cos(perpAng), cy + 3.2 * Math.sin(perpAng)]
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-3 flex items-center gap-4">
      <div className="flex flex-col items-center shrink-0 w-[45%] max-w-[190px]">
      <p className="text-[11px] font-bold uppercase text-slate-700 text-center leading-tight">Média de dias na oficina</p>
      <svg viewBox="0 0 180 116" className="w-full">
        {temFaixas ? (
          <>
            {tMeta > 0 && <path d={arco(0, tMeta)} stroke="#0ca30c" strokeWidth="11" fill="none" />}
            {tAtencao > tMeta && <path d={arco(tMeta, tAtencao)} stroke="#fab219" strokeWidth="11" fill="none" />}
            {tAtencao < 1 && <path d={arco(tAtencao, 1)} stroke="#d03b3b" strokeWidth="11" fill="none" />}
          </>
        ) : <path d={arco(0, 1)} stroke="#e2e8f0" strokeWidth="11" fill="none" />}
        {ticks.map((x, i) => {
          const major = i % 2 === 0
          const [x1, y1] = ponto(x, r + 7)
          const [x2, y2] = ponto(x, r + (major ? 15 : 11))
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#898781" strokeWidth={major ? 1.5 : 1} />
        })}
        {[0, 0.5, 1].map((x, i) => {
          const [lx, ly] = ponto(x, r + 24)
          return <text key={i} x={lx} y={ly + 3} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '8px' }}>{Math.round(x * max)}d</text>
        })}
        <polygon points={`${bx1},${by1} ${bx2},${by2} ${px},${py}`} fill="#334155" />
        <circle cx={cx} cy={cy} r="7" fill="#1e293b" stroke={cor} strokeWidth="2" />
        <circle cx={cx} cy={cy} r="2.5" fill="#ffffff" />
      </svg>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <CampoRelogio rotulo="Realizado" valor={m === null ? '—' : `${m} ${m === 1 ? 'dia' : 'dias'}`} cor={cor} />
        <CampoRelogio rotulo="Meta" valor={temFaixas ? `até ${metaD} dias` : '—'} />
        <CampoRelogio rotulo="Atenção" valor={temFaixas ? `até ${atencaoD} dias` : '—'} />
      </div>
    </div>
  )
}

// Regra que vale para o mês do fim do período: mensal > anual; da empresa (só ela selecionada) > todas as empresas.
function regraDoPeriodo(regras, ano, mes, empresaUnica) {
  const candidatas = [
    r => empresaUnica && r.empresa_id === empresaUnica && Number(r.mes) === mes,
    r => empresaUnica && r.empresa_id === empresaUnica && !r.mes,
    r => !r.empresa_id && Number(r.mes) === mes,
    r => !r.empresa_id && !r.mes,
  ]
  const doAno = regras.filter(r => Number(r.ano) === ano)
  for (const c of candidatas) { const achou = doAno.find(c); if (achou) return achou }
  return null
}

// Resumo de um conjunto de linhas: O.S. distintas, valor, média/maior de dias (por O.S.) e O.S. por faixa
function resumir(linhas) {
  const porOs = new Map()
  let valor = 0
  linhas.forEach(r => {
    valor += Number(r.total) || 0
    const k = `${r._empresa}|${r.os_numero}`
    if (!porOs.has(k)) porOs.set(k, r.dias)
  })
  const dias = [...porOs.values()].filter(d => d !== null)
  const faixas = Object.fromEntries(FAIXAS_DIAS.map(f => [f.id, 0]))
  dias.forEach(d => { const f = faixaDe(d); if (f) faixas[f] += 1 })
  return {
    qtd: porOs.size,
    valor,
    media: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null,
    maior: dias.length ? Math.max(...dias) : null,
    faixas,
  }
}

const NIVEIS = [
  { campo: 'setor', label: 'Setor' },
  { campo: 'tipo_interno', label: 'Tipo Interno' },
  { campo: 'tipo_os', label: 'Tipo de OS' },
]

const FILTROS_VAZIO = { setor: '', tipo_interno: '', tipo_os: '', consultor: '', faixa: '' }

const inicioMes = () => `${hojeIso().slice(0, 8)}01`

// empresas: empresas marcadas no BI (objetos de dim_empresas) · periodo: { de, ate } do cabeçalho do BI (data de saída);
// sem periodo, a própria visão mostra os campos de data.
export default function TempoNaOficina({ empresas = [], backend, periodo: periodoExterno = null, recarga = 0, onCarregando = null, regrasVersao = 0 }) {
  // Uma visão só: O.S. em aberto agora (abertura → hoje) + O.S. que saíram no período (abertura → Fechado).
  // Flags: "Desconsiderar O.S. em aberto" (só as que saíram) e "Considerar somente O.S. em aberto" — uma exclui a outra.
  // Desde 24/11/2026 (pedido do usuário): só as O.S. do Pass (faturadas, pela data de emissão da nota) —
  // as em aberto saíram, e as opções "Desconsiderar/Considerar somente O.S. em aberto" foram retiradas por enquanto.
  const semAbertas = true
  const soAbertas = false
  const [periodoInterno, setPeriodo] = useState(() => ({ de: inicioMes(), ate: hojeIso() }))
  const periodo = periodoExterno || periodoInterno
  const [abertasBrutas, setAbertasBrutas] = useState([])
  const [saidasBrutas, setSaidasBrutas] = useState([])
  const [carregandoAbertas, setCarregandoAbertas] = useState(false)
  const [carregandoSaidas, setCarregandoSaidas] = useState(false)
  const carregando = carregandoAbertas || carregandoSaidas
  const [erro, setErro] = useState(null)
  const [avisoSaidas, setAvisoSaidas] = useState(null)
  const [tiposOs, setTiposOs] = useState([])
  const [filtros, setFiltros] = useState(FILTROS_VAZIO)
  const [busca, setBusca] = useState('')
  const [abertos, setAbertos] = useState(() => new Set())
  const [ordem, setOrdem] = useState({ col: 'dias', dir: 'desc' })

  useEffect(() => { apiService.getTiposOS().then(setTiposOs).catch(() => setTiposOs([])) }, [])

  // Chave estável das empresas (o array muda de referência a cada render do BI)
  const chaveEmpresas = empresas.map(e => e.id).sort().join(',')
  const { trucks, motos, nomeTrucks } = useMemo(() => {
    const t = empresas.filter(e => !fonteMicrowork(e))
    const nomes = new Map() // nome no arquivo (minúsculo) → nome exibido
    t.forEach(e => [e.nome_empresa, e.nome_empresa_sistema].filter(Boolean).forEach(n => nomes.set(n.toLowerCase(), nomeEmpresa(e))))
    return { trucks: t, motos: empresas.filter(fonteMicrowork), nomeTrucks: nomes }
  }, [chaveEmpresas]) // eslint-disable-line react-hooks/exhaustive-deps
  const variasEmpresas = empresas.length > 1

  const lerJson = async (url, origem) => {
    const r = await fetch(url)
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.message || data.error || `Erro ao ler ${origem} (HTTP ${r.status})`)
    return data
  }

  // O.S. em aberto agora — mesma fonte da importação da Auditoria O.S. Aberta
  const carregarAbertas = useCallback(async () => {
    setAbertasBrutas([])
    if (!trucks.length && !motos.length) return
    setCarregandoAbertas(true); setErro(null)
    try {
      const partes = await Promise.all([
        trucks.length
          ? lerJson(`${backend}/api/garantias/sharepoint/aberta`, 'o SharePoint').then(data => (Array.isArray(data) ? data : (data.rows ?? []))
              .filter(sp => nomeTrucks.has((sp.empresa_nome || '').toLowerCase()))
              .map(sp => ({ ...sp, _empresa: nomeTrucks.get(sp.empresa_nome.toLowerCase()) })))
          : [],
        ...motos.map(e => lerJson(`${backend}/api/microwork/os-aberta?empresa=${e.codigo_empresa}`, 'o MicroWork')
          .then(data => (data.rows || []).map(r => ({ ...r, _empresa: nomeEmpresa(e) })))),
      ])
      setAbertasBrutas(partes.flat())
    } catch (e) { setErro(e.message || String(e)) }
    finally { setCarregandoAbertas(false) }
  }, [trucks, motos, nomeTrucks, backend]) // eslint-disable-line react-hooks/exhaustive-deps

  // O.S. que saíram no período — arquivos ROF001_OSAberta_Excel <ano> (SharePoint), só Caiobá Trucks
  const carregarSaidas = useCallback(async () => {
    setSaidasBrutas([])
    setAvisoSaidas(motos.length ? 'As O.S. que já saíram estão disponíveis só para Caiobá Trucks — das Motos aparecem só as em aberto.' : null)
    if (!trucks.length || !periodo.de || !periodo.ate) return
    setCarregandoSaidas(true)
    try {
      // Mesma base do Pass (24/11/2026): as O.S. da Venda de Serviços com nota emitida no período. O ROF001 entra só
      // para a abertura e o fechamento de cada uma — busca os fechamentos desde 1 ano antes (O.S. fechada num mês e
      // faturada no outro) e sem limite no fim.
      const umAnoAntes = `${Number(periodo.de.slice(0, 4)) - 1}${periodo.de.slice(4)}`
      const [data, passOs] = await Promise.all([
        lerJson(`${backend}/api/garantias/sharepoint/tempo-oficina?de=${umAnoAntes}&ate=`, 'o SharePoint'),
        apiService.getPassOsPeriodo({ dataInicio: periodo.de, dataFim: periodo.ate }),
      ])
      const comTipo = new Set(passOs.map(p => `${semAcento(p.empresa_norm)}|${p.os}|${semAcento(p.tipo_os)}`))
      const soOs = new Set(passOs.map(p => `${semAcento(p.empresa_norm)}|${p.os}`))
      // Data de saída = emissão da nota fiscal (a mais recente da O.S. no período) — o tempo na oficina vai da
      // abertura até a nota (pedido do usuário, 24/11/2026), não até o Fechado do ROF001.
      const dataNota = new Map()
      for (const p of passOs) { const k = `${semAcento(p.empresa_norm)}|${p.os}`; const d = String(p.data || '').slice(0, 10); if (d && (!dataNota.has(k) || d > dataNota.get(k))) dataNota.set(k, d) }
      const rof = (data.rows || []).filter(sp => nomeTrucks.has((sp.empresa_nome || '').toLowerCase()))
      // Linha da O.S. com o mesmo Tipo de OS faturado; se nenhum tipo bater, todas as linhas daquela O.S.
      const osComTipo = new Set(rof.filter(sp => comTipo.has(`${semAcento(sp.empresa_nome)}|${String(sp.os_numero).trim()}|${semAcento(sp.tipo_os_sigla)}`))
        .map(sp => `${semAcento(sp.empresa_nome)}|${String(sp.os_numero).trim()}`))
      setSaidasBrutas(rof
        .filter(sp => {
          const os = `${semAcento(sp.empresa_nome)}|${String(sp.os_numero).trim()}`
          if (!soOs.has(os)) return false
          return osComTipo.has(os) ? comTipo.has(`${os}|${semAcento(sp.tipo_os_sigla)}`) : true
        })
        .map(sp => ({ ...sp, fechado_data: dataNota.get(`${semAcento(sp.empresa_nome)}|${String(sp.os_numero).trim()}`) || sp.fechado_data, _empresa: nomeTrucks.get(sp.empresa_nome.toLowerCase()) })))
    } catch (e) { setErro(e.message || String(e)) }
    finally { setCarregandoSaidas(false) }
  }, [trucks, motos, nomeTrucks, backend, periodo.de, periodo.ate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { carregarSaidas() }, [carregarSaidas])
  const carregar = () => { carregarSaidas() }
  // Botão Atualizar do cabeçalho do BI (recarga muda) e indicador de carregando lá em cima.
  const primeiraRecarga = useRef(true)
  useEffect(() => { if (primeiraRecarga.current) { primeiraRecarga.current = false; return } carregar() }, [recarga]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onCarregando?.(carregando) }, [carregando]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setFiltros(FILTROS_VAZIO); setBusca('') }, [chaveEmpresas])

  const linhasBrutas = useMemo(() => [
    ...(semAbertas ? [] : abertasBrutas.map(r => ({ ...r, fechado_data: null, _status: 'Em aberto' }))),
    ...(soAbertas ? [] : saidasBrutas.map(r => ({ ...r, _status: 'Saiu' }))),
  ], [abertasBrutas, saidasBrutas, semAbertas, soAbertas])

  // Cadastro Tipos de OS → Setor / Tipo Interno (pela sigla; reserva pelo nome)
  const classificar = useMemo(() => {
    const porSigla = new Map(), porNome = new Map()
    tiposOs.forEach(t => {
      const info = { setor: t.setor_servico || null, tipo_interno: t.tipo_interno || null, nome: t.tipo_os || null }
      if (t.sigla) porSigla.set(semAcento(t.sigla), info)
      if (t.tipo_os) porNome.set(semAcento(t.tipo_os), info)
    })
    return (r) => {
      const nome = r.tipo_os_descricao || r.tipo_os_sigla
      const c = porSigla.get(semAcento(r.tipo_os_sigla)) || porNome.get(semAcento(r.tipo_os_descricao)) || {}
      return { setor: c.setor || setorPorNome(nome), tipo_interno: c.tipo_interno || tipoInternoPorNome(nome), nome: c.nome }
    }
  }, [tiposOs])

  const linhas = useMemo(() => {
    const hoje = hojeIso()
    return linhasBrutas
      .filter(r => String(r.os_numero || '').trim() !== '')
      .map(r => {
        const criacao = r.data_criacao ? String(r.data_criacao).slice(0, 10) : null
        const saida = r.fechado_data ? String(r.fechado_data).slice(0, 10) : null
        const c = classificar(r)
        const sigla = (r.tipo_os_sigla || '').trim()
        const desc = (r.tipo_os_descricao || c.nome || '').trim() // arquivo Excel anual só traz a sigla → nome do cadastro
        return {
          ...r,
          os_numero: String(r.os_numero).trim(),
          data_criacao: criacao,
          fechado_data: saida,
          dias: diasOficina(criacao, r._status === 'Saiu' ? saida : hoje),
          setor: c.setor,
          tipo_interno: c.tipo_interno,
          tipo_os: desc ? (sigla && !desc.toUpperCase().startsWith(sigla.toUpperCase()) ? `${sigla} - ${desc}` : desc) : (sigla || '(Sem tipo)'),
          consultor: r.consultor_nome || '(Sem consultor)',
        }
      })
  }, [linhasBrutas, classificar])

  // Link da Matriz (Bloco 2 › Tempo veículo oficina / funilaria, 24/11/2026): ?setor=mecanica | funilaria abre a aba
  // já filtrada no setor. Aplica uma vez, quando as O.S. chegam (o filtro some se o usuário limpar).
  const setorDoLink = useRef(new URLSearchParams(window.location.search).get('setor'))
  useEffect(() => {
    const pedido = setorDoLink.current
    if (!pedido) return
    const achou = [...new Set(linhas.map(r => r.setor))].find(x => (pedido === 'funilaria' ? semAcento(x).includes('FUNIL') : semAcento(x) === 'MECANICA'))
    if (!achou) return
    setorDoLink.current = null
    setFiltros(f => ({ ...f, setor: achou }))
  }, [linhas])

  const opcoes = useMemo(() => {
    const u = (campo) => [...new Set(linhas.map(r => r[campo]))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
    return { setor: u('setor'), tipo_interno: u('tipo_interno'), tipo_os: u('tipo_os'), consultor: u('consultor') }
  }, [linhas])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return linhas.filter(r =>
      (!filtros.setor || r.setor === filtros.setor)
      && (!filtros.tipo_interno || r.tipo_interno === filtros.tipo_interno)
      && (!filtros.tipo_os || r.tipo_os === filtros.tipo_os)
      && (!filtros.consultor || r.consultor === filtros.consultor)
      && (!filtros.faixa || faixaDe(r.dias) === filtros.faixa)
      && (!q || [r.os_numero, r.veiculo_placa, r.veiculo_chassi, r.proprietario_veiculo].some(v => String(v || '').toLowerCase().includes(q)))
    )
  }, [linhas, filtros, busca])

  const total = useMemo(() => resumir(filtradas), [filtradas])

  // Relógio: regras cadastradas na engrenagem do cabeçalho (recarrega quando regrasVersao muda)
  const [regras, setRegras] = useState([])
  useEffect(() => { apiService.getTempoOficinaRegras().then(setRegras).catch(() => setRegras([])) }, [regrasVersao])
  const regra = useMemo(() => {
    const fim = periodo.ate || hojeIso()
    return regraDoPeriodo(regras, Number(fim.slice(0, 4)), Number(fim.slice(5, 7)), empresas.length === 1 ? empresas[0].id : null)
  }, [regras, periodo.ate, chaveEmpresas]) // eslint-disable-line react-hooks/exhaustive-deps
  // % sobre TODAS as O.S. (sem o filtro de faixa clicada): uma vez por O.S.
  const relogio = useMemo(() => {
    const porOs = new Map()
    // Com o filtro de Setor (link da Matriz), os relógios mostram só aquele setor
    linhas.forEach(r => { if (filtros.setor && r.setor !== filtros.setor) return; const k = `${r._empresa}|${r.os_numero}`; if (!porOs.has(k)) porOs.set(k, r.dias) })
    const dias = [...porOs.values()].filter(d => d !== null)
    const dentro = regra ? dias.filter(d => d <= Number(regra.dias_limite)).length : 0
    return { qtdTotal: dias.length, qtdDentro: dentro, pct: dias.length && regra ? (dentro / dias.length) * 100 : 0,
      media: dias.length ? dias.reduce((a, b) => a + b, 0) / dias.length : null }
  }, [linhas, regra, filtros.setor])
  const osMaisAntiga = useMemo(() => filtradas.reduce((m, r) => (r.dias !== null && (!m || r.dias > m.dias) ? r : m), null), [filtradas])

  // Árvore Setor › Tipo Interno › Tipo de OS
  const arvore = useMemo(() => {
    const montar = (rows, nivel, caminho) => {
      if (nivel >= NIVEIS.length) return []
      const campo = NIVEIS[nivel].campo
      const grupos = new Map()
      rows.forEach(r => { const k = r[campo]; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(r) })
      return [...grupos.entries()]
        .map(([nome, rs]) => {
          const chave = [...caminho, nome].join('›')
          return { chave, nome, nivel, campo, filtroCaminho: [...caminho, nome], ...resumir(rs), filhos: montar(rs, nivel + 1, [...caminho, nome]) }
        })
        .sort((a, b) => (b.media ?? -1) - (a.media ?? -1))
    }
    return montar(filtradas, 0, [])
  }, [filtradas])

  const alternar = (chave) => setAbertos(prev => { const s = new Set(prev); s.has(chave) ? s.delete(chave) : s.add(chave); return s })

  // Clique numa linha da árvore → filtra a aba inteira até aquele nível (clicar de novo limpa)
  const filtrarPorNo = (no) => {
    const novo = { ...filtros }
    const jaFiltrado = NIVEIS.slice(0, no.nivel + 1).every((n, i) => filtros[n.campo] === no.filtroCaminho[i])
      && NIVEIS.slice(no.nivel + 1).every(n => !filtros[n.campo])
    NIVEIS.forEach((n, i) => { novo[n.campo] = !jaFiltrado && i <= no.nivel ? no.filtroCaminho[i] : '' })
    setFiltros(novo)
  }

  const valorOrdem = {
    os_numero: r => Number(r.os_numero) || 0,
    data_criacao: r => r.data_criacao || '',
    fechado_data: r => r.fechado_data || '',
    status: r => r._status || '',
    empresa: r => r._empresa || '',
    dias: r => r.dias ?? -1,
    setor: r => r.setor, tipo_interno: r => r.tipo_interno, tipo_os: r => r.tipo_os,
    consultor: r => r.consultor, proprietario: r => r.proprietario_veiculo || '',
    placa: r => r.veiculo_placa || '', total: r => Number(r.total) || 0,
  }
  const ordenadas = useMemo(() => {
    const f = valorOrdem[ordem.col]
    if (!f) return filtradas
    const mult = ordem.dir === 'asc' ? 1 : -1
    return [...filtradas].sort((a, b) => {
      const va = f(a), vb = f(b)
      return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR')) * mult
    })
  }, [filtradas, ordem]) // eslint-disable-line react-hooks/exhaustive-deps

  const thOrd = (col, label, cls = '') => {
    const ativo = ordem.col === col
    const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={`p-2 font-semibold cursor-pointer select-none whitespace-nowrap ${cls}`}
        onClick={() => setOrdem(o => (o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: col === 'dias' || col === 'total' ? 'desc' : 'asc' }))}>
        <span className="inline-flex items-center gap-1">{label}<Icone className={`h-3 w-3 ${ativo ? 'text-indigo-600' : 'text-slate-300'}`} /></span>
      </th>
    )
  }

  const tituloOs = soAbertas ? 'O.S. em aberto' : semAbertas ? 'Passagens' : 'O.S. em aberto + saídas no período'
  const filtrosAtivos = Object.entries(filtros).filter(([, v]) => v)
  const ROTULO = { setor: 'Setor', tipo_interno: 'Tipo Interno', tipo_os: 'Tipo de OS', consultor: 'Consultor', faixa: 'Dias' }
  const fmtDias = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}d`)

  if (!empresas.length) {
    return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">Nenhuma empresa liberada para ver o tempo dos veículos na oficina.</div>
  }

  const seletor = (campo, rotulo) => (
    <select value={filtros[campo]} onChange={e => setFiltros(f => ({ ...f, [campo]: e.target.value }))}
      className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 min-w-[170px] max-w-[260px]">
      <option value="">{rotulo}: todos</option>
      {opcoes[campo].map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  const renderNo = (no) => {
    const temFilhos = no.filhos.length > 0
    const aberto = abertos.has(no.chave)
    const filtrado = NIVEIS.slice(0, no.nivel + 1).every((n, i) => filtros[n.campo] === no.filtroCaminho[i])
    return (
      <Fragment key={no.chave}>
        <tr className={`border-t border-slate-100 hover:bg-slate-50 ${no.nivel === 0 ? 'font-semibold' : ''} ${filtrado ? 'bg-indigo-50' : ''}`}>
          <td className="p-2">
            <div className="flex items-center gap-1" style={{ paddingLeft: no.nivel * 18 }}>
              {temFilhos
                ? <button type="button" onClick={() => alternar(no.chave)} className="text-slate-500 hover:text-slate-800">
                    {aberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                : <span className="w-3.5" />}
              <button type="button" onClick={() => filtrarPorNo(no)} className="text-left hover:underline" title="Clique para filtrar a aba por este item">{no.nome}</button>
            </div>
          </td>
          <td className="p-2 text-right">{no.qtd}</td>
          <td className="p-2 text-center">{no.media === null ? '—' : <span className={`inline-flex px-1.5 rounded font-bold ${corDias(no.media)}`}>{fmtDias(no.media)}</span>}</td>
          <td className="p-2 text-center">{fmtDias(no.maior)}</td>
          {FAIXAS_DIAS.map(f => <td key={f.id} className="p-2 text-center text-slate-600">{no.faixas[f.id] || ''}</td>)}
        </tr>
        {aberto && no.filhos.map(renderNo)}
      </Fragment>
    )
  }

  const card = (Icone, titulo, valor, sub, cores) => (
    <div className={`rounded-lg border p-4 ${cores.box}`}>
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${cores.icone}`}><Icone className="h-4 w-4" /></span>
        <p className={`text-[11px] font-bold uppercase ${cores.texto}`}>{titulo}</p>
      </div>
      <p className={`mt-3 text-base font-bold ${cores.texto}`}>{valor}</p>
      {sub && <p className={`mt-1 text-[11px] font-semibold ${cores.texto}`}>{sub}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Flags, período (saída) e atualizar */}
      <div className="flex flex-wrap items-center gap-4">
        {!soAbertas && !periodoExterno && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
            Saída de
            <input type="date" value={periodo.de} max={periodo.ate || undefined} onChange={e => setPeriodo(p => ({ ...p, de: e.target.value }))}
              className="h-8 rounded-md border border-slate-300 px-2 text-xs" />
            até
            <input type="date" value={periodo.ate} min={periodo.de || undefined} onChange={e => setPeriodo(p => ({ ...p, ate: e.target.value }))}
              className="h-8 rounded-md border border-slate-300 px-2 text-xs" />
          </div>
        )}
        {/* No BI (período vindo do cabeçalho) quem atualiza é o botão do cabeçalho — sem botão próprio aqui */}
        {!periodoExterno && (
        <button type="button" onClick={carregar} disabled={carregando}
          className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
        )}
      </div>

      {erro && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{erro}</div>}
      {carregandoSaidas && !soAbertas && linhas.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-slate-200">
          <RefreshCw className="h-3 w-3 animate-spin" /> Carregando as O.S. que saíram no período…
        </div>
      )}

      {carregando && !linhas.length ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
          Carregando O.S.… (a primeira leitura dos arquivos ROF001_OSAberta_Excel pode levar alguns minutos)
        </div>
      ) : (
        <>
          {/* Relógios lado a lado; as Passagens foram para a faixa de dias, em cinza antes de "Até 2" (24/11/2026) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

          {/* Relógio: % dos veículos que saíram em até N dias (regra da engrenagem) */}
          <div>
            <RelogioTempo valor={relogio.pct} regra={regra} qtdDentro={relogio.qtdDentro} qtdTotal={relogio.qtdTotal} />
          </div>

          {/* Relógio: média de dias na oficina (faixas da mesma regra) */}
          <div>
            <RelogioMedia media={relogio.media} regra={regra} />
          </div>
          </div>

          {/* Faixas de dias — clique filtra (abaixo dos indicadores, largura toda) */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-bold text-slate-700 uppercase mb-2">O.S. por tempo na oficina (dias)</p>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
              {/* Passagens (O.S. faturadas): total das faixas, em cinza; clique limpa o filtro de faixa */}
              <button type="button" onClick={() => setFiltros(x => ({ ...x, faixa: '' }))}
                className={`rounded-md p-2 text-left transition bg-slate-100 text-slate-700 ${!filtros.faixa ? '' : 'hover:brightness-95'}`}>
                <p className="text-[11px] font-semibold">{tituloOs}</p>
                <p className="text-base font-bold">{total.qtd}</p>
                <p className="text-[11px]">O.S. faturadas</p>
              </button>
              {FAIXAS_DIAS.map(f => {
                const qtd = total.faixas[f.id]
                const pct = total.qtd ? (qtd / total.qtd) * 100 : 0
                const ativo = filtros.faixa === f.id
                return (
                  <button key={f.id} type="button" onClick={() => setFiltros(x => ({ ...x, faixa: x.faixa === f.id ? '' : f.id }))}
                    className={`rounded-md p-2 text-left transition ${f.cor} ${ativo ? 'ring-2 ring-indigo-500' : 'hover:brightness-95'}`}>
                    <p className="text-[11px] font-semibold">{f.label} dias</p>
                    <p className="text-base font-bold">{qtd}</p>
                    <p className="text-[11px]">{pct.toFixed(1).replace('.', ',')}%</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Seletores (Setor, Tipo Interno, Tipo de OS, Consultor) e busca retirados (24/11/2026); fica só o filtro da faixa clicada */}
          <div className="empty:hidden">
            {filtrosAtivos.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {filtrosAtivos.map(([k, v]) => (
                  <button key={k} type="button" onClick={() => setFiltros(f => ({ ...f, [k]: '' }))}
                    className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] text-indigo-700">
                    {ROTULO[k]}: {k === 'faixa' ? FAIXAS_DIAS.find(f => f.id === v)?.label : v} <X className="h-3 w-3" />
                  </button>
                ))}
                <button type="button" onClick={() => setFiltros(FILTROS_VAZIO)} className="text-[11px] text-slate-200 hover:text-white hover:underline">Limpar filtros</button>
              </div>
            )}
          </div>

          {/* Setor › Tipo Interno › Tipo de OS */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="p-2 text-left font-semibold">Setor › Tipo Interno › Tipo de OS</th>
                  <th className="p-2 text-right font-semibold">Qtde O.S.</th>
                  <th className="p-2 text-center font-semibold">Média dias</th>
                  <th className="p-2 text-center font-semibold">Maior</th>
                  {FAIXAS_DIAS.map(f => <th key={f.id} className="p-2 text-center font-semibold whitespace-nowrap">{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {arvore.length === 0
                  ? <tr><td colSpan={4 + FAIXAS_DIAS.length} className="p-6 text-center text-slate-400">Nenhuma O.S.</td></tr>
                  : arvore.map(renderNo)}
              </tbody>
              {arvore.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right">{total.qtd}</td>
                    <td className="p-2 text-center">{fmtDias(total.media)}</td>
                    <td className="p-2 text-center">{fmtDias(total.maior)}</td>
                    {FAIXAS_DIAS.map(f => <td key={f.id} className="p-2 text-center">{total.faixas[f.id] || ''}</td>)}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Lista das O.S. */}
          <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
            <p className="px-3 pt-3 text-[11px] font-bold text-slate-700 uppercase">{tituloOs} ({filtradas.length} linhas)</p>
            <table className="w-full text-xs mt-2">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]">
                <tr>
                  {variasEmpresas && thOrd('empresa', 'Empresa', 'text-left')}
                  {thOrd('os_numero', 'Nº OS', 'text-left')}
                  {thOrd('data_criacao', 'Dt. Abertura', 'text-center')}
                  {!soAbertas && thOrd('fechado_data', 'Dt. Nota Fiscal', 'text-center')}
                  {thOrd('dias', 'Dias Oficina', 'text-center')}
                  {thOrd('tipo_os', 'Tipo de OS', 'text-left')}
                  {thOrd('consultor', 'Consultor', 'text-left')}
                  {thOrd('proprietario', 'Proprietário', 'text-left')}
                  {thOrd('total', 'Total', 'text-right')}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((r, i) => (
                  <tr key={`${r.os_numero}|${r.tipo_os}|${i}`} className="border-t border-slate-100 hover:bg-slate-50">
                    {variasEmpresas && <td className="p-2 whitespace-nowrap">{r._empresa}</td>}
                    <td className="p-2 font-semibold">{r.os_numero}</td>
                    <td className="p-2 text-center">{fmtDate(r.data_criacao)}</td>
                    {!soAbertas && <td className="p-2 text-center">{r.fechado_data ? fmtDate(r.fechado_data) : '—'}</td>}
                    <td className="p-2 text-center">{r.dias === null ? '—' : <span className={`inline-flex px-1.5 rounded font-bold ${corDias(r.dias)}`}>{r.dias}d</span>}</td>
                    <td className="p-2">{r.tipo_os}</td>
                    <td className="p-2 whitespace-nowrap">{primeiroUltimoNome(r.consultor)}</td>
                    <td className="p-2">{r.proprietario_veiculo || '—'}</td>
                    <td className="p-2 text-right whitespace-nowrap">{fmt(r.total)}</td>
                  </tr>
                ))}
                {ordenadas.length === 0 && <tr><td colSpan={(soAbertas ? 6 : 7) + (variasEmpresas ? 1 : 0)} className="p-6 text-center text-slate-400">Nenhuma O.S. com os filtros escolhidos.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
