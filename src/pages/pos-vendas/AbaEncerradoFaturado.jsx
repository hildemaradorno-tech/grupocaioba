/**
 * Pós-Vendas › Indicadores de Produtividade › aba "Encerrado × Faturado" (17/11/2026, pedido do usuário).
 *
 * Compara Horas Vendidas do TEMPO ENCERRADO DO MECÂNICO (ROF036 / apontamentos MicroWork) com as da NOTA
 * FISCAL EMITIDA (ROF042 / vendas MicroWork), ligando pela O.S. (marca + empresa + nº da O.S.), em horas e
 * em valor de faturamento (Vlr. Serviços da NF):
 *
 *  Encerrado → Faturamento: o que o mecânico encerrou no período foi faturado no mesmo mês do encerramento,
 *    num mês seguinte, antes (NF antes do encerramento) ou ainda não foi faturado?
 *    Valor = Vlr. Serviços das NFs da O.S. × (horas encerradas da linha ÷ horas encerradas da O.S. inteira).
 *  Faturado → Origem: o que foi faturado no período veio de horas encerradas no mesmo mês da NF, em meses
 *    anteriores, depois da NF, ou a O.S. não tem tempo encerrado?
 *    Horas e valor da NF divididos na proporção das horas encerradas da O.S. em cada mês.
 *
 * Fonte: função pv_prod_enc_fat(ini, fim) — histórico inteiro (qualquer mês) das O.S. mexidas no período.
 * Dados lidos desde jan/2025: O.S. encerrada antes disso aparece como "sem tempo encerrado".
 */
import React, { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Ban, ChevronDown, ChevronRight, Clock, Receipt, Info, Search, X } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../services/supabaseClient'
import AbaNaoCobrado from './AbaNaoCobrado'
import { semAcento, fmtH, fmtPct, fmtR$ } from './produtividadeCalculos'

const NAO_PESSOA = /produtivo\s+n[aã]o\s+associado|^\s*sem\s+t[eé]cnico\s*$/i
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtData = (s) => (s ? s.split('-').reverse().join('/') : '')
const mesDe = (d) => d.slice(0, 7) // 'AAAA-MM'
const nomeMes = (am) => (am ? `${MESES[Number(am.slice(5, 7)) - 1]}/${am.slice(0, 4)}` : '')
const SEM_NOME = '(Sem mecânico)'

// Categorias de cada sentido (chave, rótulo, cor).
// Encerrado → Faturamento (pedido do usuário 17/11/2026): o que foi encerrado e quando, quanto já foi faturado e o
// que falta faturar. "Quando foi faturado" (mesmo mês / mês seguinte / NF antes do encerramento) fica como detalhe.
const CAT_ENC = [
  // Faturado separado (18/11/2026): NF no mesmo mês do encerramento × NF em mês posterior.
  // (NF antes do encerramento — raro, reabertura — conta como "no mês".)
  ['fatm', 'Faturado no mês', 'text-emerald-700', 'bg-emerald-500'],
  ['fatp', 'Faturado mês posterior', 'text-cyan-700', 'bg-cyan-500'],
  // Não cobrado (18/11/2026): ROF101 Serviços executados Não Cobrados (só Trucks) — sai do Já faturado/Falta faturar.
  ['nc', 'Não cobrado', 'text-amber-700', 'bg-amber-400'],
  ['nao', 'Falta faturar', 'text-red-700', 'bg-red-500'],
]
const QUANDO = { mesmo: 'no mesmo mês', depois: 'em mês seguinte', antes: 'NF antes do encerramento' }
const CAT_FAT = [
  ['mesmo', 'Encerrado no mesmo mês da NF', 'text-emerald-700', 'bg-emerald-500'],
  ['antes', 'Encerrado em mês anterior', 'text-sky-700', 'bg-sky-500'],
  // 'Encerrado depois da NF' retirado de toda a aba (pedido do usuário 18/11/2026; era sempre ~0) — essas horas, se houver, não entram em coluna nenhuma
  ['sem', 'Sem tempo encerrado', 'text-red-700', 'bg-red-500'],
]
// Cores das barras do gráfico por tipo de O.S. interno (total + cada categoria; mesmas cores dos cards).
const COR_BARRA = { total: '#6366f1', fat: '#10b981', fatm: '#10b981', fatp: '#06b6d4', nc: '#f59e0b', nao: '#ef4444', mesmo: '#10b981', antes: '#0ea5e9', depois: '#f59e0b', sem: '#ef4444' }
// Cores dos cards (fundo, borda e anel quando selecionado) — as mesmas do gráfico/régua/tabela.
const COR_CARD = {
  total: { base: 'bg-indigo-50 border-indigo-200', sel: 'ring-2 ring-indigo-500 border-indigo-500', txt: 'text-indigo-700' },
  fat: { base: 'bg-emerald-50 border-emerald-200', sel: 'ring-2 ring-emerald-500 border-emerald-500', txt: 'text-emerald-700' },
  mesmo: { base: 'bg-emerald-50 border-emerald-200', sel: 'ring-2 ring-emerald-500 border-emerald-500', txt: 'text-emerald-700' },
  antes: { base: 'bg-sky-50 border-sky-200', sel: 'ring-2 ring-sky-500 border-sky-500', txt: 'text-sky-700' },
  depois: { base: 'bg-amber-50 border-amber-200', sel: 'ring-2 ring-amber-500 border-amber-500', txt: 'text-amber-700' },
  fatm: { base: 'bg-emerald-50 border-emerald-200', sel: 'ring-2 ring-emerald-500 border-emerald-500', txt: 'text-emerald-700' },
  fatp: { base: 'bg-cyan-50 border-cyan-200', sel: 'ring-2 ring-cyan-500 border-cyan-500', txt: 'text-cyan-700' },
  nc: { base: 'bg-amber-50 border-amber-200', sel: 'ring-2 ring-amber-500 border-amber-500', txt: 'text-amber-700' },
  nao: { base: 'bg-red-50 border-red-200', sel: 'ring-2 ring-red-500 border-red-500', txt: 'text-red-700' },
  sem: { base: 'bg-red-50 border-red-200', sel: 'ring-2 ring-red-500 border-red-500', txt: 'text-red-700' },
}
const vazio = (cats) => Object.fromEntries(cats.map(([k]) => [k, { h: 0, vl: 0 }]))

// Tipo de O.S. interno (agrupa as O.S. abaixo do mecânico — pedido do usuário 17/11/2026).
// Trucks: dim_tipos_os (sigla → tipo_interno, ex.: Cliente, Garantia, TruckPag, Interna Usados).
// Motos: o MicroWork manda o tipo por extenso e não há cadastro — agrupado pelo começo do nome.
export function tipoInternoMotos(t) {
  const u = String(t || '').toUpperCase()
  if (!u) return 'Sem tipo'
  if (u.startsWith('INTERNA')) return 'Interna'
  if (u.startsWith('GARANTIA')) return 'Garantia'
  if (u.startsWith('SEGURADORA')) return 'Seguradora'
  if (/GRATUIT/.test(u)) return 'Revisão/Óleo Gratuito'
  return 'Cliente'
}

// Faixa da régua: escreve o % dentro só quando o texto cabe na largura real da faixa (mede na tela e
// remede quando a janela muda de tamanho) — faixas pequenas, como o Não cobrado, mostram o % se houver espaço.
function FaixaRegua({ cor, largura, titulo, texto, onClick }) {
  const ref = useRef(null)
  const medidaRef = useRef(null)
  const [cabe, setCabe] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current, m = medidaRef.current
    if (!el || !m) return
    const medir = () => setCabe(m.offsetWidth + 6 <= el.clientWidth)
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [texto, largura])
  return (
    <div ref={ref} onClick={onClick} role="button"
      className={`${cor} relative flex items-center justify-center text-[11px] font-bold text-white whitespace-nowrap overflow-hidden cursor-pointer hover:brightness-110`}
      // Largura proporcional (flex-grow) com largura mínima para caber o % — faixas pequenas como o Não cobrado
      // (≈1–2%) ficam um pouco maiores que a proporção real, mas mostram o número (pedido do usuário 18/11/2026).
      style={{ flex: `${largura} 1 0px`, minWidth: largura > 0 && texto ? 44 : 0 }} title={titulo}>
      {/* medida invisível do texto */}
      <span ref={medidaRef} className="absolute invisible">{texto}</span>
      {cabe ? texto : ''}
    </div>
  )
}

// Textos curtos dos rótulos do gráfico: horas com 1 casa; valor abreviado (mil / mi) para caber.
const rotH = (v) => `${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`
function rotVl(v) {
  v = v || 0
  if (Math.abs(v) >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} mi`
  if (Math.abs(v) >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

async function lerRpc(ini, fim) {
  const out = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.rpc('pv_prod_enc_fat', { p_ini: ini, p_fim: fim })
      .order('marca').order('empresa').order('os').order('pessoa').order('data').range(de, de + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

function Info2({ children }) {
  return (
    <span className="relative group inline-flex">
      <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
      <span className="hidden group-hover:block absolute left-0 top-5 z-30 w-96 bg-slate-800 text-white text-[11px] font-normal normal-case leading-snug rounded-md p-2.5 shadow-lg">
        {children}
      </span>
    </span>
  )
}

export default function AbaEncerradoFaturado({ periodo, noEscopo, excluidos, slotSentido, recarga }) {
  const [sentido, setSentido] = useState('enc') // enc = Encerrado → Faturamento | fat = Faturado → Origem
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(() => new Set())
  const [tiposTrucks, setTiposTrucks] = useState(() => new Map()) // sigla → { nome, interno }

  useEffect(() => {
    supabase.from('dim_tipos_os').select('sigla, tipo_os, tipo_interno, agrupamento_nome').then(({ data }) => {
      const m = new Map()
      for (const t of data || []) if (t.sigla && /truck/i.test(t.agrupamento_nome || '')) m.set(t.sigla.trim().toUpperCase(), { nome: t.tipo_os, interno: t.tipo_interno })
      setTiposTrucks(m)
    })
  }, [])
  const tipoDe = useMemo(() => (o) => {
    if (o.marca === 'TRUCKS') {
      const t = tiposTrucks.get(String(o.tipo || '').trim().toUpperCase())
      return { nome: t?.nome || o.tipo || '', interno: t?.interno || 'Sem cadastro' }
    }
    return { nome: o.tipo || '', interno: tipoInternoMotos(o.tipo) }
  }, [tiposTrucks])

  useEffect(() => {
    let vivo = true
    if (!periodo.ini || !periodo.fim || periodo.ini > periodo.fim) return
    setCarregando(true); setErro('')
    lerRpc(periodo.ini, periodo.fim)
      .then(d => { if (vivo) setLinhas(d) })
      .catch(e => { if (vivo) setErro(/pv_prod_enc_fat/.test(e.message || '') ? 'Função pv_prod_enc_fat ainda não criada no banco (migration pv_prod_enc_fat.sql).' : (e.message || String(e))) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [periodo.ini, periodo.fim, recarga]) // recarga = syncs da página: relê quando a página recarrega (ex.: depois do botão atualizar)

  // Junta por O.S.: horas encerradas e NF (horas + valor) por mês, de todo o histórico da O.S.
  const { itensEnc: itensEncTodos, itensFat: itensFatTodos } = useMemo(() => {
    const porOs = new Map()
    for (const r of linhas) {
      if (!noEscopo(r.empresa, r.marca)) continue
      const pessoa = r.pessoa || ''
      if (NAO_PESSOA.test(pessoa) || excluidos.has(semAcento(pessoa))) continue
      const k = `${r.marca}|${r.empresa}|${r.os}`
      let o = porOs.get(k)
      if (!o) { o = { marca: r.marca, empresa: r.empresa, os: r.os, tipo: r.tipo_os, linhas: [], encMes: new Map(), fatMes: new Map(), encTot: 0, fatTot: 0, vlTot: 0, nfDatas: [], ncH: 0, ncV: 0 }; porOs.set(k, o) }
      const enc = Number(r.hr_vend_enc) || 0, fat = Number(r.hr_vend_fat) || 0, vl = Number(r.vl_servicos) || 0
      o.ncH += Number(r.hr_nao_cobrado) || 0; o.ncV += Number(r.vl_nao_cobrado) || 0 // ROF101 (O.S. inteira, qualquer mês)
      const m = mesDe(r.data)
      if (enc) { o.encMes.set(m, (o.encMes.get(m) || 0) + enc); o.encTot += enc }
      if (fat || vl) {
        const f = o.fatMes.get(m) || { h: 0, vl: 0 }
        f.h += fat; f.vl += vl; o.fatMes.set(m, f)
        o.fatTot += fat; o.vlTot += vl
        if (!o.nfDatas.includes(r.data)) o.nfDatas.push(r.data)
      }
      if (!o.tipo && r.tipo_os) o.tipo = r.tipo_os
      o.linhas.push({ ...r, enc, fat, vl, m, pessoa: pessoa || SEM_NOME })
    }
    const noPeriodo = (d) => d >= periodo.ini && d <= periodo.fim
    // Vlr. Hora Vendida por empresa (NFs do período: Vlr. Serviços ÷ Hr. Faturadas) — valoriza as horas encerradas de
    // O.S. ainda sem NF. Os relatórios de tempo encerrado (ROF036 / apontamentos MicroWork) não têm valor.
    const vhEmp = new Map()
    let vhTotH = 0, vhTotV = 0
    for (const o of porOs.values()) for (const l of o.linhas) {
      if (!l.fat || !noPeriodo(l.data)) continue
      const e = vhEmp.get(o.empresa) || { h: 0, v: 0 }
      e.h += l.fat; e.v += l.vl; vhEmp.set(o.empresa, e)
      vhTotH += l.fat; vhTotV += l.vl
    }
    const vhDaEmpresa = (emp) => { const e = vhEmp.get(emp); return e && e.h ? e.v / e.h : (vhTotH ? vhTotV / vhTotH : 0) }
    const encItens = [], fatItens = []
    for (const o of porOs.values()) {
      o.nfDatas.sort()
      const mesesNf = [...o.fatMes.keys()].sort()
      // Encerrado no período → onde foi faturado
      for (const l of o.linhas) {
        if (!l.enc || !noPeriodo(l.data)) continue
        const quando = o.fatMes.has(l.m) ? 'mesmo' : mesesNf.some(x => x > l.m) ? 'depois' : mesesNf.length ? 'antes' : 'nao'
        const cat = quando === 'nao' ? 'nao' : quando === 'depois' ? 'fatp' : 'fatm'
        // Valor das horas vendidas encerradas = horas × Vlr. Hora Vendida: o da NF da própria O.S. (Vlr. Serviços ÷ Hr.
        // Faturadas) quando já faturada; senão o médio da empresa no período. Encerrado = Já faturado + Falta faturar.
        const vh = o.fatTot > 0 ? o.vlTot / o.fatTot : vhDaEmpresa(o.empresa)
        // Não cobrado (ROF101): parte das horas encerradas da O.S. que não vai ser cobrada — dividida entre as linhas
        // encerradas na proporção das horas (no máximo todas). Sai do Já faturado / Falta faturar (pedido do usuário
        // 18/11/2026); valor = ValorTotal do ROF101 na mesma proporção. Encerrado = Já faturado + Não cobrado + Falta faturar.
        const fracNc = o.encTot > 0 ? Math.min(o.ncH / o.encTot, 1) : 0
        const hNc = l.enc * fracNc, hResto = l.enc - hNc
        if (hNc > 1e-6) encItens.push({ o, pessoa: l.pessoa, data: l.data, cat: 'nc', quando, h: hNc, vl: o.encTot > 0 ? o.ncV * (l.enc / o.encTot) : 0 })
        if (hResto > 1e-6) encItens.push({ o, pessoa: l.pessoa, data: l.data, cat, quando, h: hResto, vl: hResto * vh })
      }
      // Faturado no período → de que mês vieram as horas encerradas
      for (const l of o.linhas) {
        if (!(l.fat || l.vl) || !noPeriodo(l.data)) continue
        const partes = { mesmo: 0, antes: 0, depois: 0, sem: 0 }
        const origem = new Map() // mês do encerramento → fração
        if (!o.encTot) partes.sem = 1
        else for (const [m, h] of o.encMes) {
          const f = h / o.encTot
          partes[m === l.m ? 'mesmo' : m < l.m ? 'antes' : 'depois'] += f
          origem.set(m, (origem.get(m) || 0) + f)
        }
        fatItens.push({ o, pessoa: l.pessoa, data: l.data, h: l.fat, vl: l.vl, partes, origem })
      }
    }
    return { itensEnc: encItens, itensFat: fatItens }
  }, [linhas, noEscopo, excluidos, periodo.ini, periodo.fim])

  const cats = sentido === 'enc' ? CAT_ENC : CAT_FAT
  // Clique num card filtra a tabela por mecânico (só as O.S. daquela situação); clicar de novo ou no 1º card limpa.
  const [filtro, setFiltro] = useState('')
  // Clique numa barra do gráfico filtra a tela toda (cards, régua, gráfico e tabela) pelo tipo de O.S. interno da
  // barra e pela situação dela (barra Encerrado/Faturado no período = só o tipo). Clicar de novo tira (18/11/2026).
  const [filtroTipo, setFiltroTipo] = useState('')
  // Busca por nº da O.S. (18/11/2026): filtra a tela toda (cards, régua, tabelas) e abre os mecânicos/tipos da O.S.
  const [busca, setBusca] = useState('')
  const buscaOs = busca.trim()
  const passaFiltros = (it) => (!filtroTipo || tipoDe(it.o).interno === filtroTipo) && (!buscaOs || String(it.o.os).includes(buscaOs))
  // Todo filtro por clique (card, régua, tabela por tipo, gráfico por mês, busca) vale para a tela inteira: cards,
  // régua, gráfico e tabelas (pedido do usuário 18/11/2026). Por isso o filtro é aplicado aqui, nos itens.
  const [filtroMes, setFiltroMes] = useState('') // Faturado: mês do encerramento clicado no gráfico ('AAAA-MM' ou 'sem')
  const itensEnc = useMemo(() => itensEncTodos.filter(it => passaFiltros(it) && (!filtro || it.cat === filtro)),
    [itensEncTodos, filtroTipo, tipoDe, buscaOs, filtro]) // eslint-disable-line react-hooks/exhaustive-deps
  // Faturado: cada linha da NF é dividida pelos meses de encerramento; com filtro de situação/mês fica só a fatia
  // correspondente (horas e valor proporcionais), assim os números batem em todos os quadros.
  const itensFat = useMemo(() => {
    const out = []
    for (const it of itensFatTodos) {
      if (!passaFiltros(it)) continue
      if (!filtro && !filtroMes) { out.push(it); continue }
      const mNf = mesDe(it.data)
      const pedacos = [...it.origem].map(([m, f]) => ({ m, f, cat: m === mNf ? 'mesmo' : m < mNf ? 'antes' : 'depois' }))
      if (it.partes.sem > 0) pedacos.push({ m: 'sem', f: it.partes.sem, cat: 'sem' })
      const fica = pedacos.filter(x => (!filtro || x.cat === filtro) && (!filtroMes || x.m === filtroMes))
      const soma = fica.reduce((a, x) => a + x.f, 0)
      if (soma <= 1e-9) continue
      const partes = { mesmo: 0, antes: 0, depois: 0, sem: 0 }, origem = new Map()
      for (const x of fica) { partes[x.cat] += x.f / soma; if (x.m !== 'sem') origem.set(x.m, (origem.get(x.m) || 0) + x.f / soma) }
      out.push({ ...it, h: it.h * soma, vl: it.vl * soma, partes, origem })
    }
    return out
  }, [itensFatTodos, filtroTipo, tipoDe, buscaOs, filtro, filtroMes]) // eslint-disable-line react-hooks/exhaustive-deps
  const clicarBarra = (tipo, k) => {
    const cat = k === 'total' ? '' : k
    if (tipo === filtroTipo && cat === filtro) { setFiltroTipo(''); setFiltro('') } else { setFiltroTipo(tipo); setFiltro(cat) }
  }

  // Totais e por mecânico (com as O.S. de cada um).
  const { total, totalTab, pessoas, origemMeses } = useMemo(() => {
    // Os itens já vêm filtrados (situação, tipo, mês, busca): cards e tabelas somam o mesmo conjunto.
    const total = { h: 0, vl: 0, cat: vazio(cats), quando: { mesmo: 0, depois: 0, antes: 0 } }
    const totalTab = { h: 0, vl: 0, cat: vazio(cats) }
    const passa = () => true
    const porPessoa = new Map()
    const origemMeses = new Map()
    const pegar = (nome) => {
      let p = porPessoa.get(nome)
      if (!p) { p = { nome, h: 0, vl: 0, cat: vazio(cats), os: new Map() }; porPessoa.set(nome, p) }
      return p
    }
    const somarEm = (alvo, cat, h, vl) => { alvo.cat[cat].h += h; alvo.cat[cat].vl += vl }
    if (sentido === 'enc') {
      for (const it of itensEnc) {
        const ok = passa(it)
        const p = ok ? pegar(it.pessoa) : null
        for (const a of ok ? [total, totalTab, p] : [total]) { a.h += it.h; a.vl += it.vl; somarEm(a, it.cat, it.h, it.vl) }
        if (it.cat === 'fatm' || it.cat === 'fatp') total.quando[it.quando] += it.h
        if (!ok) continue
        const ko = `${it.o.empresa}|${it.o.os}`
        const x = p.os.get(ko) || { o: it.o, cv: vazio(cats), datas: [], h: 0, vl: 0 } // cv = horas/valor por situação
        x.h += it.h; x.vl += it.vl; x.cv[it.cat].h += it.h; x.cv[it.cat].vl += it.vl; if (!x.datas.includes(it.data)) x.datas.push(it.data)
        p.os.set(ko, x)
      }
    } else {
      for (const it of itensFat) {
        const ok = passa(it)
        const p = ok ? pegar(it.pessoa) : null
        for (const a of ok ? [total, totalTab, p] : [total]) {
          a.h += it.h; a.vl += it.vl
          for (const c of Object.keys(it.partes)) if (it.partes[c] && a.cat[c]) somarEm(a, c, it.h * it.partes[c], it.vl * it.partes[c])
        }
        for (const [m, f] of it.origem) {
          const g = origemMeses.get(m) || { h: 0, vl: 0 }
          g.h += it.h * f; g.vl += it.vl * f; origemMeses.set(m, g)
        }
        if (!ok) continue
        const ko = `${it.o.empresa}|${it.o.os}`
        const x = p.os.get(ko) || { o: it.o, datas: [], h: 0, vl: 0, partes: { mesmo: 0, antes: 0, depois: 0, sem: 0 }, partesVl: { mesmo: 0, antes: 0, depois: 0, sem: 0 }, origem: it.origem }
        x.h += it.h; x.vl += it.vl; if (!x.datas.includes(it.data)) x.datas.push(it.data)
        for (const c of Object.keys(it.partes)) { x.partes[c] += it.h * it.partes[c]; x.partesVl[c] += it.vl * it.partes[c] }
        p.os.set(ko, x)
      }
    }
    const pessoas = [...porPessoa.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) // ordem alfabética do mecânico (pedido do usuário)
    for (const p of pessoas) p.listaOs = [...p.os.values()].sort((a, b) => (a.datas[0] || '').localeCompare(b.datas[0] || '') || a.o.os.localeCompare(b.o.os))
    return { total, totalTab, pessoas, origemMeses }
  }, [sentido, itensEnc, itensFat, cats])

  // % da coluna final: Encerrado → % já faturado | Faturado → % encerrado no mesmo mês
  // % faturado (Encerrado: no mês + mês posterior) | % mesmo mês (Faturado)
  const pctDe = (v) => (v.h ? (sentido === 'enc' ? (v.cat.fatm.h + v.cat.fatp.h) : v.cat.mesmo.h) / v.h : null)
  const pctPrincipal = pctDe(total)


  // Gráfico por tipo de O.S. interno: total + cada categoria, em horas ou valor — segue o filtro dos cards, como a tabela.
  const [graficoEm, setGraficoEm] = useState('h') // h | vl
  const dadosGrafico = useMemo(() => {
    const g = new Map()
    const pegar = (o) => {
      const t = tipoDe(o).interno
      if (!g.has(t)) g.set(t, { tipo: t, total: { h: 0, vl: 0 }, ...vazio(cats) })
      return g.get(t)
    }
    if (sentido === 'enc') {
      for (const it of itensEnc) { if (filtro && it.cat !== filtro) continue; const a = pegar(it.o); a.total.h += it.h; a.total.vl += it.vl; a[it.cat].h += it.h; a[it.cat].vl += it.vl }
    } else {
      for (const it of itensFat) {
        if (filtro && !((it.partes[filtro] || 0) > 0)) continue
        const a = pegar(it.o); a.total.h += it.h; a.total.vl += it.vl
        for (const c of Object.keys(it.partes)) if (a[c]) { a[c].h += it.h * it.partes[c]; a[c].vl += it.vl * it.partes[c] }
      }
    }
    return [...g.values()].sort((a, b) => b.total.h - a.total.h)
      // k = altura da barra (medida escolhida); k_h / k_vl = horas e valor (balão); k_rot = rótulo "medida escolhida|outra"
      .map(a => Object.fromEntries([['tipo', a.tipo], ...['total', ...cats.map(c => c[0])].flatMap(k => [
        [k, +(a[k][graficoEm]).toFixed(2)], [`${k}_h`, a[k].h], [`${k}_vl`, a[k].vl],
        [`${k}_rot`, a[k].h > 0.005 || Math.abs(a[k].vl) > 0.5
          ? (graficoEm === 'h' ? rotH(a[k].h) : rotVl(a[k].vl)) : ''], // só a medida do modo (pedido do usuário 18/11/2026)
      ])]))
  }, [sentido, itensEnc, itensFat, cats, tipoDe, graficoEm, filtro])

  // Rótulo em cima de cada barra, nos dois modos (pedido do usuário 18/11/2026): 1ª linha a medida escolhida
  // (Horas ou Valor), 2ª linha a outra. Texto vem pronto em k_rot ("a|b").
  // Recharts 3 entrega a posição da barra em viewBox (x/y na raiz podem não vir) — usa os dois.
  const rotuloDuplo = (props) => {
    const vb = props.viewBox || {}
    const x = props.x ?? vb.x, y = props.y ?? vb.y, width = props.width ?? vb.width, value = props.value
    if (!value || x == null || y == null) return null
    const cx = Number(x) + Number(width || 0) / 2
    return (
      <text x={cx} y={Number(y) - 5} textAnchor="middle" fontSize={9} fontWeight={700} fill="#334155">{value}</text>
    )
  }

  // Com card selecionado a tabela mostra só as colunas daquela situação (sem Encerrado/Faturado no período e sem o %).
  const catsVis = filtro ? cats.filter(([k]) => k === filtro) : cats
  const comTotal = !filtro
  // Séries do gráfico, na ordem pedida pelo usuário: Encerrado → Faturado → Falta faturar.
  const ordemSerie = (item) => series.findIndex(([k]) => k === item?.dataKey)
  const series = [...(comTotal ? [['total', sentido === 'enc' ? 'Encerrado no período' : 'Faturado no período']] : []), ...catsVis.map(([k, rot]) => [k, rot])]

  const alternar = (nome) => setAberto(s => { const n = new Set(s); n.has(nome) ? n.delete(nome) : n.add(nome); return n })

  const celPct = (h, tot) => <td className="px-2 text-right tabular-nums text-slate-500">{tot && h ? fmtPct(h / tot) : ''}</td>
  const celula = (v) => (
    <>
      <td className="px-2 text-right tabular-nums">{fmtH(v.h || null)}</td>
      <td className="px-2 text-right tabular-nums whitespace-nowrap text-slate-500">{fmtR$(v.vl || null)}</td>
    </>
  )

  // Botões Encerrado | Faturado: no canto direito da linha das abas (pedido do usuário 17/11/2026).
  // Com busca de O.S., abre todos os mecânicos que têm a O.S.
  useEffect(() => { if (buscaOs) setAberto(new Set(pessoas.map(p => p.nome))) }, [buscaOs, pessoas])
  useEffect(() => { if (!buscaOs) setAberto(new Set()) }, [buscaOs]) // limpou a busca: fecha tudo

  // Campo de busca por nº da O.S. — logo abaixo das abas, no começo da aba (pedido do usuário 18/11/2026).
  const campoBusca = (
      <div className="flex items-center">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 h-[30px]">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value.replace(/\D/g, ''))} placeholder="Buscar nº da O.S." inputMode="numeric"
            className="w-32 text-[11px] outline-none bg-transparent" aria-label="Buscar número da O.S." />
          {busca && <button type="button" onClick={() => setBusca('')} className="text-slate-400 hover:text-slate-600" aria-label="Limpar busca"><X className="h-3.5 w-3.5" /></button>}
        </div>
      </div>
  )

  // Mesmo modelo do "Modo Visualização" do Resumo: rótulo em cima + botões com ícone (pedido do usuário 18/11/2026).
  const botoesSentido = (
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold text-slate-500 uppercase">Modo Visualização</label>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {[['enc', 'Encerrado', Clock], ['fat', 'Faturado', Receipt], ['nc', 'Não cobrado', Ban]].map(([v, r, Ic]) => (
            <button key={v} type="button" onClick={() => { setSentido(v); setAberto(new Set()); setFiltro(''); setFiltroTipo(''); setFiltroMes('') }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-semibold ${sentido === v ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Ic className="h-3.5 w-3.5" /> {r}
            </button>
          ))}
        </div>
      </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Botões Encerrado | Faturado | Não cobrado antes da busca de O.S., na mesma linha (pedido do usuário 18/11/2026) */}
      <div className="flex flex-wrap items-end gap-3">{botoesSentido}{campoBusca}</div>
      {/* ⓘ com a explicação retirado por enquanto (pedido do usuário 17/11/2026) — componente Info2 continua no arquivo */}
      {/* Botão "Não cobrado" (18/11/2026): tela própria (AbaNaoCobrado) com o ROF101 — no lugar dos quadros abaixo */}
      {sentido === 'nc' ? (
        <AbaNaoCobrado periodo={periodo} noEscopo={noEscopo} excluidos={excluidos} tipoDe={tipoDe} buscaOs={buscaOs} recarga={recarga} />
      ) : (<>

      {erro && <p className="text-[11px] text-red-600 font-semibold">{erro}</p>}
      {carregando && <p className="text-[11px] text-slate-500">Carregando…</p>}

      {/* Cards: total + cada categoria (horas, valor e % das horas) */}
      <div className={`grid grid-cols-2 gap-2 ${sentido === 'fat' ? 'md:grid-cols-4' : 'md:grid-cols-5'}`}>
        <div role="button" tabIndex={0} onClick={() => setFiltro('')} title="Mostrar todas as O.S."
          className={`border rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md ${COR_CARD.total.base} ${!filtro ? COR_CARD.total.sel : ''}`}>
          <p className={`text-[11px] font-semibold ${COR_CARD.total.txt}`}>{sentido === 'enc' ? 'Hr. Vendidas encerradas no período' : 'Hr. Faturadas no período'}</p>
          <p className="text-base font-bold text-slate-800 tabular-nums">{fmtH(total.h)} h</p>
          <p className="text-[11px] text-slate-500 tabular-nums">{fmtR$(total.vl)}</p>
        </div>
        {/* Card "Sem tempo encerrado" voltou no lugar do alerta (pedido do usuário 18/11/2026), sem a lista de arquivos. */}
        {cats.map(([k, rot, cor]) => (
          <div key={k} role="button" tabIndex={0} onClick={() => setFiltro(f => (f === k ? '' : k))} title={filtro === k ? 'Tirar o filtro' : `Filtrar a tabela: ${rot}`}
            className={`border rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md ${COR_CARD[k].base} ${filtro === k ? COR_CARD[k].sel : ''}`}>
            <p className={`text-[11px] font-semibold ${cor}`}>{rot}</p>
            <p className="text-base font-bold text-slate-800 tabular-nums">{fmtH(total.cat[k].h)} h</p>
            <p className="text-[11px] text-slate-500 tabular-nums">{fmtR$(total.cat[k].vl)}{sentido === 'enc' && k === 'nao' ? ' (estimado)' : ''}</p>
          </div>
        ))}
      </div>
      {total.h > 0 && (
        // Régua com o % de cada situação escrito dentro (some o texto quando a faixa é estreita demais).
        <div className="flex h-5 rounded-full overflow-hidden bg-slate-100">
          {cats.map(([k, rot, , bg]) => {
            const pct = total.cat[k].h / total.h
            // Com card selecionado, a régua mostra só a faixa daquela situação (as outras ficam vazias, cinza).
            const visivel = !filtro || filtro === k
            return (
              // Clique na faixa = clique no card (filtra a tela toda; clicar de novo tira o filtro)
              <FaixaRegua key={k} cor={visivel ? bg : 'bg-transparent'} largura={pct} titulo={`${rot}: ${fmtPct(pct)} — clique para ${filtro === k ? 'tirar o filtro' : 'filtrar'}`}
                onClick={() => setFiltro(f => (f === k ? '' : k))}
                texto={visivel && pct > 0 ? fmtPct(pct) : ''} />
            )
          })}
        </div>
      )}

      {/* Tabela por tipo de O.S. interno */}
      {dadosGrafico.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-slate-600">Por tipo de O.S. interno</p>
              {filtroTipo && (
                <button type="button" onClick={() => { setFiltroTipo(''); setFiltro('') }} title="Tirar o filtro da tabela por tipo"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-600 text-white text-[10px] font-semibold hover:bg-slate-700">
                  Filtro: {filtroTipo}{filtro ? ` · ${cats.find(c => c[0] === filtro)?.[1] || ''}` : ''} ✕
                </button>
              )}
            </div>
          </div>
          {/* Tabela por tipo de O.S. interno (era gráfico de barras — trocado a pedido do usuário 18/11/2026).
              Clique numa célula = clique na barra: filtra a tela toda pelo tipo (e pela situação da coluna). */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-slate-600">
                  <th rowSpan={2} className="text-left py-1 pl-2 align-bottom border-b border-sky-300">Tipo de O.S. interno</th>
                  {series.map(([k, rot]) => (
                    <th key={k} colSpan={k !== 'total' && comTotal ? 3 : 2} className="px-2 text-center border-b border-slate-200" style={{ color: COR_BARRA[k] }}>{rot}</th>
                  ))}
                </tr>
                <tr className="text-slate-500 border-b border-sky-300">
                  {series.map(([k]) => (
                    <Fragment key={k}>
                      <th className="px-2 text-right font-semibold">Horas</th><th className="px-2 text-right font-semibold">Valor</th>
                      {k !== 'total' && comTotal && <th className="px-2 text-right font-semibold">%</th>}
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...dadosGrafico, { tipo: null, ...Object.fromEntries(series.flatMap(([k]) => [
                  [`${k}_h`, dadosGrafico.reduce((a, d) => a + (d[`${k}_h`] || 0), 0)],
                  [`${k}_vl`, dadosGrafico.reduce((a, d) => a + (d[`${k}_vl`] || 0), 0)],
                ])) }].map(d => {
                  const ehTotal = d.tipo == null
                  return (
                    <tr key={d.tipo ?? '__total'} className={ehTotal ? 'font-bold bg-slate-50' : `border-b border-slate-100 hover:bg-sky-50/40 ${filtroTipo === d.tipo ? 'bg-sky-50' : ''}`}>
                      <td className="py-1 pl-2 whitespace-nowrap">{ehTotal ? 'Total' : d.tipo}</td>
                      {series.map(([k]) => {
                        const h = d[`${k}_h`] || 0, vl = d[`${k}_vl`] || 0, base = d.total_h || 0
                        const clique = ehTotal ? undefined : () => clicarBarra(d.tipo, k)
                        const cls = `px-2 text-right tabular-nums ${ehTotal ? '' : 'cursor-pointer hover:underline'}`
                        return (
                          <Fragment key={k}>
                            <td className={cls} onClick={clique}>{h > 0.005 ? fmtH(h) : ''}</td>
                            <td className={`${cls} whitespace-nowrap text-slate-500`} onClick={clique}>{Math.abs(vl) > 0.005 ? fmtR$(vl) : ''}</td>
                            {k !== 'total' && comTotal && <td className="px-2 text-right tabular-nums text-slate-500">{base && h > 0.005 ? fmtPct(h / base) : ''}</td>}
                          </Fragment>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Faturado → Origem: de que mês vieram as horas faturadas — gráfico (era tabela; pedido do usuário 18/11/2026).
          Meses em ordem cronológica + "Sem tempo encerrado" no fim (vermelho); rótulo = medida do botão Horas | Valor;
          balão com horas, valor e %. */}
      {sentido === 'fat' && origemMeses.size > 0 && (() => {
        const dados = [...origemMeses.entries()].sort((a, b) => a[0].localeCompare(b[0]))
          .map(([m, g]) => ({ m, nome: nomeMes(m), h: g.h, vl: g.vl, sem: false }))
        if (total.cat.sem.h > 0) dados.push({ m: 'sem', nome: 'Sem tempo encerrado', h: total.cat.sem.h, vl: total.cat.sem.vl, sem: true })
        for (const d of dados) { d.y = graficoEm === 'h' ? d.h : d.vl; d.pct = total.h ? d.h / total.h : 0; d.rot = `${graficoEm === 'h' ? rotH(d.h) : rotVl(d.vl)}|${fmtPct(d.pct)}` }
        dados.sort((x, y) => y.y - x.y) // do maior para o menor, pela medida do botão (pedido do usuário 18/11/2026)
        return (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-bold text-slate-600">Faturado no período por mês do encerramento</p>
                {filtroMes && (
                  <button type="button" onClick={() => setFiltroMes('')} title="Tirar o filtro do mês"
                    className="px-2 py-0.5 rounded-full bg-slate-600 text-white text-[10px] font-semibold hover:bg-slate-700">
                    Filtro: {filtroMes === 'sem' ? 'Sem tempo encerrado' : nomeMes(filtroMes)} ✕
                  </button>
                )}
              </div>
              <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                {[['h', 'Horas'], ['vl', 'Valor']].map(([v, r]) => (
                  <button key={v} type="button" onClick={() => setGraficoEm(v)}
                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${graficoEm === v ? 'bg-slate-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{r}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados} margin={{ top: 22, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 11 }}
                  formatter={(v, n, item) => { const d = item?.payload || {}; return [`${fmtH(d.h)} h · ${fmtR$(d.vl)} · ${fmtPct(d.pct)}`, 'Faturado'] }} />
                {/* clique na barra = filtra a tela toda por esse mês de encerramento (clicar de novo tira) */}
                <Bar dataKey="y" radius={[3, 3, 0, 0]} maxBarSize={70} cursor="pointer"
                  onClick={(d) => { const m = d?.payload?.m ?? d?.m; if (m) setFiltroMes(f => (f === m ? '' : m)) }}>
                  {dados.map(d => <Cell key={d.nome} fill={d.sem ? '#ef4444' : '#6366f1'} />)}
                  <LabelList dataKey="rot" content={(pr) => {
                    const vb = pr.viewBox || {}, x = pr.x ?? vb.x, y = pr.y ?? vb.y, w = pr.width ?? vb.width
                    if (!pr.value || x == null || y == null) return null
                    const [l1, l2] = String(pr.value).split('|')
                    const cx = Number(x) + Number(w || 0) / 2
                    return (
                      <text x={cx} y={Number(y) - 14} textAnchor="middle" fontSize={10} fill="#334155">
                        <tspan x={cx} dy={0} fontWeight={700}>{l1}</tspan>
                        <tspan x={cx} dy={11} fill="#64748b">{l2}</tspan>
                      </text>
                    )
                  }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })()}

      {/* Por mecânico (abre as O.S.) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-slate-600">
              <th rowSpan={2} className="text-left py-1 pl-2 align-bottom border-b border-sky-300">Mecânico</th>
              {comTotal && <th colSpan={2} className="px-2 text-center border-b border-slate-200">{sentido === 'enc' ? 'Encerrado no período' : 'Faturado no período'}</th>}
              {catsVis.map(([k, rot, cor]) => <th key={k} colSpan={comTotal ? 3 : 2} className={`px-2 text-center border-b border-slate-200 ${cor}`}>{rot}</th>)}
            </tr>
            <tr className="text-slate-500 border-b border-sky-300">
              {comTotal && <><th className="px-2 text-right font-semibold">Horas</th><th className="px-2 text-right font-semibold">Valor</th></>}
              {/* % depois do Valor de cada situação = horas da situação ÷ horas do Encerrado/Faturado no período da linha (some com filtro de card, seria sempre 100%) */}
              {catsVis.map(([k]) => <Fragment key={k}><th className="px-2 text-right font-semibold">Horas</th><th className="px-2 text-right font-semibold">Valor</th>{comTotal && <th className="px-2 text-right font-semibold">%</th>}</Fragment>)}
            </tr>
          </thead>
          <tbody>
            {pessoas.map(p => (
              <Fragment key={p.nome}>
                <tr className="border-b border-slate-100 hover:bg-sky-50/40 cursor-pointer" onClick={() => alternar(p.nome)}>
                  <td className="py-1 pl-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      {aberto.has(p.nome) ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}{p.nome}
                    </span>
                  </td>
                  {comTotal && celula(p)}
                  {catsVis.map(([k]) => <Fragment key={k}>{celula(p.cat[k])}{comTotal && celPct(p.cat[k].h, p.h)}</Fragment>)}
                </tr>
                {aberto.has(p.nome) && (
                  <tr className="bg-slate-50/70">
                    <td colSpan={1 + (comTotal ? 2 + catsVis.length * 3 : catsVis.length * 2)} className="px-6 py-2">
                      <DetalheOs sentido={sentido} lista={p.listaOs} tipoDe={tipoDe} cats={catsVis} comTotal={comTotal} pessoa={p.nome} abrirTudo={!!buscaOs} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {pessoas.length > 0 && (
              <tr className="font-bold bg-slate-50">
                <td className="py-1 pl-2">Total</td>
                {comTotal && celula(totalTab)}
                {catsVis.map(([k]) => <Fragment key={k}>{celula(totalTab.cat[k])}{comTotal && celPct(totalTab.cat[k].h, totalTab.h)}</Fragment>)}
              </tr>
            )}
            {!carregando && !pessoas.length && <tr><td colSpan={20} className="py-3 text-center text-slate-500">Nada no período/empresas.</td></tr>}
          </tbody>
        </table>
      </div>
      </>)}
    </div>
  )
}

// Horas e valor de cada categoria de uma O.S. (mesmas colunas da tabela por mecânico).
function catsDaOs(x, sentido, cats) {
  const out = Object.fromEntries(cats.map(([k]) => [k, { h: 0, vl: 0 }]))
  if (sentido === 'enc') { for (const [k] of cats) out[k] = x.cv?.[k] || { h: 0, vl: 0 } }
  else for (const [k] of cats) out[k] = { h: x.partes[k] || 0, vl: x.partesVl[k] || 0 }
  return out
}

// Agrupa as O.S. pelo tipo de O.S. interno, com subtotal (mesmas colunas da tabela por mecânico) em cada grupo.
function agruparPorTipo(lista, tipoDe, sentido, cats) {
  const g = new Map()
  for (const x of lista) {
    const t = tipoDe(x.o)
    if (!g.has(t.interno)) g.set(t.interno, { interno: t.interno, itens: [], h: 0, vl: 0, os: new Set(), cat: Object.fromEntries(cats.map(([k]) => [k, { h: 0, vl: 0 }])) })
    const a = g.get(t.interno)
    const c = catsDaOs(x, sentido, cats)
    a.itens.push({ ...x, tipoNome: t.nome, catVal: c }); a.h += x.h; a.vl += x.vl; a.os.add(`${x.o.empresa}|${x.o.os}`)
    for (const [k] of cats) { a.cat[k].h += c[k].h; a.cat[k].vl += c[k].vl }
  }
  return [...g.values()].sort((a, b) => b.h - a.h)
}

// TMOs de uma O.S. do mecânico (lido na hora em que abre): tempo encerrado (ROF036 / apontamentos), nota fiscal
// (ROF042 / vendas MicroWork) e não cobrado (ROF101), juntos pela DESCRIÇÃO do TMO sem os códigos do começo — o
// Cartão Tarefa às vezes vem sem código ("DIAGNOSTICO MECÂNICO" × "SR100 DIAGNOSTICO MECÂNICO") e o ROF101 repete o
// código ("4014402 4014402 1 gaxeta…"). Histórico inteiro da O.S.
function TmosDaOs({ o, pessoa, sentido = 'enc' }) {
  const [linhas, setLinhas] = useState(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let vivo = true
    const filtroPessoa = pessoa && pessoa !== SEM_NOME ? pessoa : ''
    Promise.all([
      supabase.from('pv_prod_os').select('data, tmo, hr_vend_enc, hr_vend_fat, vl_servicos')
        .eq('marca', o.marca).eq('empresa', o.empresa).eq('os', o.os).eq('papel', 'mecanico').eq('pessoa', filtroPessoa).order('data'),
      o.marca === 'TRUCKS'
        ? supabase.from('pv_prod_nao_cobrado').select('data, servico, horas, valor_total')
          .eq('marca', o.marca).eq('empresa', o.empresa).eq('os', o.os).eq('pessoa', filtroPessoa)
        : Promise.resolve({ data: [] }),
    ]).then(([a, b]) => {
      if (!vivo) return
      if (a.error || b.error) { setErro((a.error || b.error).message); return }
      const m = new Map()
      const pegar = (txtTmo) => {
        const t = String(txtTmo || '').trim()
        // tira do começo as palavras com número (códigos: 0010101, SR100, 4014402, "1"…) e normaliza acento/maiúscula
        const pal = t.split(/\s+/)
        while (pal.length > 1 && /\d/.test(pal[0])) pal.shift()
        const k = semAcento(pal.join(' ')) || '(SEM TMO)'
        if (!m.has(k)) m.set(k, { k, desc: t || '(sem TMO)', enc: 0, encDatas: new Set(), fat: 0, vl: 0, nfDatas: new Set(), ncH: 0, ncV: 0 })
        const g = m.get(k)
        if (t.length > g.desc.length) g.desc = t
        return g
      }
      for (const r of a.data || []) {
        const enc = Number(r.hr_vend_enc) || 0, fat = Number(r.hr_vend_fat) || 0, vl = Number(r.vl_servicos) || 0
        if (!enc && !fat && !vl) continue
        const g = pegar(r.tmo)
        if (enc) { g.enc += enc; g.encDatas.add(r.data) }
        if (fat || vl) { g.fat += fat; g.vl += vl; g.nfDatas.add(r.data) }
      }
      for (const r of b.data || []) { const g = pegar(r.servico); g.ncH += Number(r.horas) || 0; g.ncV += Number(r.valor_total) || 0 }
      setLinhas([...m.values()].sort((x, y) => y.enc - x.enc || x.desc.localeCompare(y.desc)))
    })
    return () => { vivo = false }
  }, [o.marca, o.empresa, o.os, pessoa])
  if (erro) return <p className="text-[11px] text-red-600">{erro}</p>
  if (!linhas) return <p className="text-[11px] text-slate-500">Carregando TMOs…</p>
  if (!linhas.length) return <p className="text-[11px] text-slate-500">Sem TMO lançado para este mecânico na O.S.</p>
  const datas = (set) => [...set].sort().map(fmtData).join(', ')
  // Modo Faturado: só os TMOs da nota, com Hr. Faturadas e Valor (pedido do usuário 18/11/2026).
  if (sentido === 'fat') {
    const comNf = linhas.filter(g => g.fat > 0.005 || Math.abs(g.vl) > 0.005)
    if (!comNf.length) return <p className="text-[11px] text-slate-500">Sem TMO faturado para este mecânico na O.S.</p>
    return (
      <table className="w-auto min-w-[420px] text-[11px] border border-slate-200 rounded">
        <thead><tr className="text-slate-500 bg-slate-50 border-b">
          <th className="text-left py-1 pl-2 pr-6">TMO</th><th className="text-right px-2">Hr. Faturadas</th><th className="text-right px-2">Valor</th>
        </tr></thead>
        <tbody>
          {comNf.map(g => (
            <tr key={g.k} className="border-b border-slate-100">
              <td className="py-0.5 pl-2 pr-6">{g.desc}</td>
              <td className="px-2 text-right tabular-nums">{fmtH(g.fat || null)}</td>
              <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(g.vl || null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  return (
    <table className="w-full text-[11px] border border-slate-200 rounded">
      <thead><tr className="text-slate-500 bg-slate-50 border-b">
        <th className="text-left py-1 pl-2">TMO</th>
        <th className="text-left px-2">Encerrado em</th><th className="text-right px-2">Hr. Vendidas</th>
        <th className="text-left px-2">Data NF</th><th className="text-right px-2">Hr. Faturadas</th><th className="text-right px-2">Vlr. NF</th>
        <th className="text-right px-2 text-amber-700">Não cobrado (h)</th><th className="text-right px-2 text-amber-700">Não cobrado (R$)</th>
      </tr></thead>
      <tbody>
        {linhas.map(g => (
          <tr key={g.k} className="border-b border-slate-100">
            <td className="py-0.5 pl-2">{g.desc}</td>
            <td className="px-2">{datas(g.encDatas)}</td><td className="px-2 text-right tabular-nums">{fmtH(g.enc || null)}</td>
            <td className="px-2">{datas(g.nfDatas) || '—'}</td><td className="px-2 text-right tabular-nums">{fmtH(g.fat || null)}</td>
            <td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(g.vl || null)}</td>
            <td className="px-2 text-right tabular-nums">{fmtH(g.ncH || null)}</td><td className="px-2 text-right tabular-nums whitespace-nowrap">{fmtR$(g.ncV || null)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DetalheOs({ sentido, lista, tipoDe, cats, comTotal = true, pessoa, abrirTudo = false }) {
  const grupos = agruparPorTipo(lista, tipoDe, sentido, cats)
  // Cada tipo interno abre/fecha as O.S. dele (começa fechado; com busca de O.S., começa aberto).
  const [abertos, setAbertos] = useState(() => new Set(abrirTudo ? grupos.map(g => g.interno) : []))
  const alternarGrupo = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  // Cada O.S. abre os TMOs dela (pedido do usuário 18/11/2026).
  const [osAbertas, setOsAbertas] = useState(() => new Set())
  const alternarOs = (k) => setOsAbertas(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const enc = sentido === 'enc'
  const totalCols = 4 + (comTotal ? 2 : 0) + cats.length * 2
  const colsInfo = 4
  const hv = (v) => (
    <>
      <td className="px-2 text-right tabular-nums">{fmtH(v.h || null)}</td>
      <td className="px-2 text-right tabular-nums whitespace-nowrap text-slate-500">{fmtR$(v.vl || null)}</td>
    </>
  )
  const numeros = (v) => (
    <>
      {comTotal && hv(v)}
      {cats.map(([k]) => <Fragment key={k}>{hv(v.cat[k])}</Fragment>)}
    </>
  )
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-slate-600">
          <th rowSpan={2} className="text-left py-1 align-bottom border-b">O.S.</th>
          <th rowSpan={2} className="text-left align-bottom border-b">Tipo O.S.</th>
          {enc ? <>
            <th rowSpan={2} className="text-left align-bottom border-b">Encerrado em</th>
            <th rowSpan={2} className="text-left align-bottom border-b">Data NF</th>
          </> : <>
            <th rowSpan={2} className="text-left align-bottom border-b">Data NF</th>
            <th rowSpan={2} className="text-left align-bottom border-b">Encerrado em (mês)</th>
          </>}
          {comTotal && <th colSpan={2} className="px-2 text-center border-b border-slate-200">{enc ? 'Encerrado no período' : 'Faturado no período'}</th>}
          {cats.map(([k, rot, cor]) => <th key={k} colSpan={2} className={`px-2 text-center border-b border-slate-200 ${cor}`}>{rot}</th>)}
        </tr>
        <tr className="text-slate-500 border-b">
          {[...(comTotal ? [0] : []), ...cats].map((_, i) => <Fragment key={i}><th className="px-2 text-right font-semibold">Horas</th><th className="px-2 text-right font-semibold">Valor</th></Fragment>)}
        </tr>
      </thead>
      <tbody>{grupos.map(g => (
        <Fragment key={g.interno}>
          <tr className="bg-indigo-50/70 border-b border-indigo-100 font-bold text-slate-700 cursor-pointer hover:bg-indigo-100/70" onClick={() => alternarGrupo(g.interno)}>
            <td colSpan={colsInfo} className="py-1 pl-1">
              <span className="inline-flex items-center gap-1">
                {abertos.has(g.interno) ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
                {g.interno}
              </span>
            </td>
            {numeros(g)}
          </tr>
          {abertos.has(g.interno) && g.itens.map((x, i) => {
            const kOs = `${x.o.marca}|${x.o.empresa}|${x.o.os}`
            return (
              <Fragment key={i}>
              <tr className="border-b border-slate-100">
                <td className="py-0.5 pl-3 font-semibold whitespace-nowrap">
                  <button type="button" onClick={() => alternarOs(kOs)} title="Ver os TMOs da O.S." className="inline-flex items-center gap-0.5 hover:text-sky-700">
                    {osAbertas.has(kOs) ? <ChevronDown className="h-3 w-3 text-slate-400" /> : <ChevronRight className="h-3 w-3 text-slate-400" />}{x.o.os}
                  </button>
                </td><td>{x.tipoNome}</td>
                {enc ? <>
                  <td>{x.datas.sort().map(fmtData).join(', ')}</td>
                  <td>{x.o.nfDatas.map(fmtData).join(', ') || '—'}</td>
                </> : <>
                  <td>{x.datas.sort().map(fmtData).join(', ')}</td>
                  <td>{[...x.origem.keys()].sort().map(nomeMes).join(', ') || '—'}</td>
                </>}
                {numeros({ h: x.h, vl: x.vl, cat: x.catVal })}
              </tr>
              {osAbertas.has(kOs) && (
                <tr className="bg-white"><td colSpan={totalCols} className="pl-8 pr-2 py-1.5"><TmosDaOs o={x.o} pessoa={pessoa} sentido={sentido} /></td></tr>
              )}
              </Fragment>
            )
          })}
        </Fragment>
      ))}</tbody>
    </table>
  )
}
