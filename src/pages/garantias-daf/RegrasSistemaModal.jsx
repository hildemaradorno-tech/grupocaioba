import React, { useEffect, useMemo, useState } from 'react'
import { Settings, X, Loader2, Activity, FileText, DollarSign, ChevronLeft, ChevronRight, ChevronDown, Copy } from 'lucide-react'
import { apiService } from '../../services/api'
import { carregarRegrasMes } from './regrasGarantiasMes'

// Menus da engrenagem: cada aba de Garantias DAF com as regras que ela usa.
// mensais: regras que também têm valor por mês (gar_regras_mes) — colunas da tabela Janeiro..Dezembro.
// inicio: data de onde a contagem parte — o mês dela escolhe a regra.
const ABAS_REGRAS = [
  { key: 'oficina', label: 'Na Oficina', icon: Activity,
    mensais: [{ campo: 'dias_oficina', curto: 'Dias na Oficina', inicio: 'criação da OS' }] },
  { key: 'garantista', label: 'Com Garantista', icon: FileText,
    mensais: [
      { campo: 'dias_digitacao', curto: 'Digitação', inicio: 'fechamento da OS' },
      { campo: 'dias_solucao', curto: 'Solução', inicio: 'digitação da garantia' },
      { campo: 'dias_recusa', curto: 'Recusa', inicio: 'Data Final Avaliação' },
    ] },
  { key: 'titulos', label: 'Títulos a Receber', icon: DollarSign,
    mensais: [{ campo: 'dias_nf_envio', curto: 'Envio da NF', inicio: 'emissão da NF' }] },
]
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// '' → null · inteiro > 0 → número · outro → NaN (inválido)
const paraDias = (txt) => {
  const t = String(txt ?? '').trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isInteger(n) && n > 0 ? n : NaN
}
const txt = (v) => (v != null && v !== '' ? String(v) : '')

// Regras do Sistema de Garantias DAF: regra geral (gar_configuracoes, registro único) + regra por mês,
// ano a ano (gar_regras_mes). Aberta pela engrenagem, um item por aba. onSalvo(cfg, meses) recebe a
// configuração geral gravada e as regras mensais recarregadas, para a tela aplicar na hora.
// tiposExtras: Map sigla → descrição de tipos que só existem nas garantias (fora do cadastro).
// abaInicial: 'oficina' | 'garantista' | 'titulos' · somenteAba: sem os menus no topo
export default function RegrasSistemaModal({ onClose, onSalvo, usuario, tiposExtras, abaInicial, somenteAba = false }) {
  const [aba, setAba] = useState(ABAS_REGRAS.some(a => a.key === abaInicial) ? abaInicial : 'oficina')
  const [carregando, setCarregando] = useState(true)
  const [tiposDim, setTiposDim] = useState([])
  const [diasOficinaInput, setDiasOficinaInput] = useState('14')
  const [diasDigitacaoInput, setDiasDigitacaoInput] = useState('14')
  const [diasSolucao, setDiasSolucao] = useState(14)
  const [diasRecusaInput, setDiasRecusaInput] = useState('15')
  // "Dias para Envio da NF" (card NF sem envio). temColunaNf: a coluna dias_nf_envio já existe no banco —
  // sem ela o campo fica só leitura e não é enviado ao salvar (senão o update falharia).
  const [diasNfInput, setDiasNfInput] = useState('4')
  const [temColunaNf, setTemColunaNf] = useState(false)
  const [diasSolucaoPorTipoInput, setDiasSolucaoPorTipoInput] = useState({})
  const [selecionadosTipos, setSelecionadosTipos] = useState(new Set())
  const [valorAplicarTipos, setValorAplicarTipos] = useState('14')
  // Regras por mês: anos abertos nesta janela { 2026: [12 linhas] } — Salvar grava os que foram mexidos
  const [ano, setAno] = useState(new Date().getFullYear())
  const [anos, setAnos] = useState({})
  const [mexidos, setMexidos] = useState(() => new Set())
  const [carregandoAno, setCarregandoAno] = useState(false)
  const [temTabelaMes, setTemTabelaMes] = useState(true)
  const [mesTiposAberto, setMesTiposAberto] = useState(null) // índice do mês com "Por tipo" aberto
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const abaCfg = ABAS_REGRAS.find(a => a.key === aba)
  const mensais = abaCfg.mensais

  useEffect(() => {
    Promise.all([
      apiService.getConfiguracoesGarantias().catch(() => null),
      apiService.getTiposOS().catch(() => []),
    ]).then(([cfg, tipos]) => {
      setDiasOficinaInput(String(cfg?.dias_oficina ?? 14))
      setDiasDigitacaoInput(String(cfg?.dias_digitacao ?? 14))
      setDiasSolucao(cfg?.dias_solucao ?? 14)
      setDiasRecusaInput(String(cfg?.dias_recusa ?? 15))
      setTemColunaNf(!!cfg && 'dias_nf_envio' in cfg)
      setDiasNfInput(String(cfg?.dias_nf_envio ?? 4))
      const porTipo = cfg?.dias_solucao_por_tipo ?? {}
      setDiasSolucaoPorTipoInput(Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, String(v)])))
      setTiposDim(tipos.filter(t => t.classificacao === 'Garantia' && t.sigla))
    }).finally(() => setCarregando(false))
  }, [])

  // Carrega o ano aberto no seletor (uma vez por ano)
  useEffect(() => {
    if (anos[ano]) return
    setCarregandoAno(true)
    apiService.getRegrasGarantiasMes(ano)
      .then(lista => {
        const linhas = Array.from({ length: 12 }, () => ({}))
        for (const r of lista) {
          if (r.mes < 1 || r.mes > 12) continue
          const l = linhas[r.mes - 1]
          for (const a of ABAS_REGRAS) for (const { campo } of a.mensais) l[campo] = txt(r[campo])
          l.dias_solucao_por_tipo = Object.fromEntries(Object.entries(r.dias_solucao_por_tipo || {}).map(([k, v]) => [k, txt(v)]))
        }
        setAnos(p => ({ ...p, [ano]: linhas }))
      })
      .catch(() => { setTemTabelaMes(false); setAnos(p => ({ ...p, [ano]: Array.from({ length: 12 }, () => ({})) })) })
      .finally(() => setCarregandoAno(false))
  }, [ano]) // eslint-disable-line react-hooks/exhaustive-deps

  // Todos os tipos de garantia do cadastro de Tipos de OS + os que só existem nas garantias.
  const tipos = useMemo(() => {
    const map = new Map()
    for (const t of tiposDim) {
      const sigla = String(t.sigla).trim().toUpperCase()
      if (!map.has(sigla)) map.set(sigla, t.tipo_os || sigla)
    }
    for (const [sigla, descricao] of (tiposExtras || new Map())) {
      if (!map.has(sigla)) map.set(sigla, descricao)
    }
    return Array.from(map, ([sigla, descricao]) => ({ sigla, descricao }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'))
  }, [tiposDim, tiposExtras])

  const toggleSelecionado = (sigla) => setSelecionadosTipos(prev => {
    const next = new Set(prev)
    if (next.has(sigla)) next.delete(sigla)
    else next.add(sigla)
    return next
  })

  const aplicarAosSelecionados = () => {
    const n = Number(valorAplicarTipos)
    if (!Number.isFinite(n) || n <= 0) return
    setDiasSolucaoPorTipoInput(prev => {
      const next = { ...prev }
      for (const sigla of selecionadosTipos) next[sigla] = String(n)
      return next
    })
  }

  // Valor geral de cada campo (placeholder dos meses em branco)
  const geralDe = {
    dias_oficina: diasOficinaInput, dias_digitacao: diasDigitacaoInput, dias_solucao: String(diasSolucao),
    dias_recusa: diasRecusaInput, dias_nf_envio: diasNfInput,
  }

  const linhasAno = anos[ano]
  const marcarMexido = () => setMexidos(p => new Set(p).add(ano))
  const alterarMes = (idx, campo, valor) => {
    setAnos(p => ({ ...p, [ano]: p[ano].map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)) }))
    marcarMexido()
  }
  const alterarMesTipo = (idx, sigla, valor) => {
    setAnos(p => ({ ...p, [ano]: p[ano].map((l, i) => (i === idx ? { ...l, dias_solucao_por_tipo: { ...(l.dias_solucao_por_tipo || {}), [sigla]: valor } } : l)) }))
    marcarMexido()
  }
  // Repete Janeiro nos outros 11 meses — só os campos desta aba
  const copiarJaneiro = () => {
    setAnos(p => {
      const jan = p[ano][0]
      return {
        ...p, [ano]: p[ano].map(l => {
          const n = { ...l }
          for (const { campo } of mensais) n[campo] = jan[campo] ?? ''
          if (aba === 'garantista') n.dias_solucao_por_tipo = { ...(jan.dias_solucao_por_tipo || {}) }
          return n
        }),
      }
    })
    marcarMexido()
  }

  const salvar = async () => {
    const dias = Number(diasDigitacaoInput)
    const diasOfi = Number(diasOficinaInput)
    const diasRec = Number(diasRecusaInput)
    const diasNf = Number(diasNfInput)
    if ([dias, diasOfi, diasRec, ...(temColunaNf ? [diasNf] : [])].some(n => !Number.isFinite(n) || n <= 0)) {
      setErro('Informe números de dias válidos (maiores que zero).')
      return
    }
    const porTipo = {}
    for (const [sigla, v] of Object.entries(diasSolucaoPorTipoInput)) {
      const n = Number(v)
      if (v !== '' && v != null && Number.isFinite(n) && n > 0) porTipo[sigla] = n
    }
    // Regras por mês dos anos mexidos — só os campos desta aba (o upsert não toca nos das outras)
    const porAno = []
    for (const a of mexidos) {
      const linhas = []
      for (let m = 0; m < 12; m++) {
        const l = anos[a][m] || {}
        const linha = { mes: m + 1 }
        for (const { campo, curto } of mensais) {
          const n = paraDias(l[campo])
          if (Number.isNaN(n)) { setErro(`${MESES[m]}/${a} — ${curto}: informe um número de dias inteiro maior que zero (ou deixe em branco).`); setAno(a); return }
          linha[campo] = n
        }
        if (aba === 'garantista') {
          const pt = {}
          for (const [sigla, v] of Object.entries(l.dias_solucao_por_tipo || {})) {
            const n = paraDias(v)
            if (Number.isNaN(n)) { setErro(`${MESES[m]}/${a} — Solução do tipo ${sigla}: informe um número de dias inteiro maior que zero.`); setAno(a); setMesTiposAberto(m); return }
            if (n != null) pt[sigla] = n
          }
          linha.dias_solucao_por_tipo = Object.keys(pt).length ? pt : null
        }
        linhas.push(linha)
      }
      porAno.push([a, linhas])
    }
    setSalvando(true); setErro(null)
    try {
      const cfg = { dias_digitacao: dias, dias_oficina: diasOfi, dias_solucao: diasSolucao, dias_solucao_por_tipo: porTipo, dias_recusa: diasRec, ...(temColunaNf ? { dias_nf_envio: diasNf } : {}) }
      await apiService.updateConfiguracoesGarantias(cfg, usuario)
      for (const [a, linhas] of porAno) await apiService.saveRegrasGarantiasMes(a, linhas, usuario)
      const meses = await carregarRegrasMes()
      onSalvo?.(cfg, meses)
      onClose()
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const campoCls = 'text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const lblCls = 'text-[10px] font-bold text-slate-400 uppercase'
  const inputMesCls = 'w-14 text-xs text-right p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() : -1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-xl mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-slate-500" /> Regras do Sistema
            {somenteAba && <span className="font-semibold text-slate-500">— {abaCfg.label}</span>}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {carregando ? (
          <p className="flex items-center gap-2 text-xs text-slate-400 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando regras...</p>
        ) : (
          <div className="overflow-y-auto pr-1 -mr-1">
            {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}
            {/* Um menu por aba — cada um mostra só as regras que aquela aba usa */}
            {!somenteAba && <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 mb-4">
              {ABAS_REGRAS.map(a => {
                const Icon = a.icon
                return (
                  <button key={a.key} type="button" onClick={() => { setAba(a.key); setMesTiposAberto(null) }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                      aba === a.key ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                    }`}>
                    <Icon className="h-3.5 w-3.5" /> {a.label}
                  </button>
                )
              })}
            </div>}

            {/* ── Regra geral — vale para os meses sem regra própria ── */}
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-3">Regra geral (meses em branco)</p>
            {aba === 'oficina' && (
            <div className="flex flex-col gap-1">
              <label className={lblCls}>Dias na Oficina</label>
              <input type="number" min="1" value={diasOficinaInput} onChange={e => setDiasOficinaInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Contado da data de criação da OS — controla o card "Mais de N Dias na Oficina" da aba Na Oficina.
              </p>
            </div>
            )}
            {aba === 'garantista' && (<>
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias para Digitação</label>
              <input type="number" min="1" value={diasDigitacaoInput} onChange={e => setDiasDigitacaoInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                D = dia em que a OS foi fechada.
                {Number(diasDigitacaoInput) > 0 && (
                  <>
                    <br />• <strong>A Digitar</strong>: de D até D+{Number(diasDigitacaoInput)}
                    <br />• <strong>Digitação Atrasada</strong>: a partir de D+{Number(diasDigitacaoInput) + 1}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias para Tratar Recusa</label>
              <input type="number" min="1" value={diasRecusaInput} onChange={e => setDiasRecusaInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Contado da Data Final Avaliação (dia em que a DAF recusou) — controla o card Recusas no Controle e no Dashboard.
                {Number(diasRecusaInput) > 0 && (
                  <>
                    <br />• <strong>No prazo</strong>: até {Number(diasRecusaInput)} dia{Number(diasRecusaInput) === 1 ? '' : 's'}
                    <br />• <strong>Fora do prazo</strong>: a partir de {Number(diasRecusaInput) + 1} dias
                  </>
                )}
              </p>
            </div>
            {tipos.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className={lblCls}>Dias para Solucionar por Tipo de OS</label>
                <div className="flex items-center gap-2 mt-1 mb-1.5">
                  <input type="number" min="1" value={valorAplicarTipos} onChange={e => setValorAplicarTipos(e.target.value)}
                    className="w-16 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                  <button type="button" onClick={aplicarAosSelecionados} disabled={selecionadosTipos.size === 0}
                    className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Aplicar aos selecionados ({selecionadosTipos.size})
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {tipos.map(({ sigla, descricao }) => (
                    <div key={sigla} className="flex items-center gap-2">
                      <input type="checkbox" checked={selecionadosTipos.has(sigla)} onChange={() => toggleSelecionado(sigla)} className="shrink-0" />
                      <span className="flex-1 text-[11px] text-slate-600 truncate" title={descricao}>{descricao}</span>
                      <input type="number" min="1" placeholder={String(diasSolucao)}
                        value={diasSolucaoPorTipoInput[sigla] ?? ''}
                        onChange={e => setDiasSolucaoPorTipoInput(prev => ({ ...prev, [sigla]: e.target.value }))}
                        className="w-16 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>)}
            {aba === 'titulos' && (
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <label className={lblCls}>Dias para Envio da NF</label>
                  <input type="number" min="1" value={diasNfInput} onChange={e => setDiasNfInput(e.target.value)}
                    disabled={!temColunaNf} className={`${campoCls} disabled:bg-slate-50 disabled:text-slate-400`} />
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Contado da data de emissão da NF — controla a linha "NF sem envio" do card Pendências: NF não enviada à
                    fábrica e emitida há {Number(diasNfInput) > 0 ? Number(diasNfInput) : 'N'} dia{Number(diasNfInput) === 1 ? '' : 's'} ou mais.
                  </p>
                  {!temColunaNf && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                      Campo ainda não liberado no banco — por enquanto vale o padrão de 4 dias.
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Vencidos / Vence Hoje / A Vencer</strong>: regra fixa — data de vencimento comparada com hoje.
                </p>
              </div>
            )}
            </div>

            {/* ── Regra por mês, ano a ano ── */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Regra por mês</p>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => { setAno(a => a - 1); setMesTiposAberto(null) }} title="Ano anterior"
                    className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm font-bold text-slate-800 w-12 text-center">{ano}</span>
                  <button type="button" onClick={() => { setAno(a => a + 1); setMesTiposAberto(null) }} title="Próximo ano"
                    className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                Vale o mês em que a contagem começa ({mensais.map(m => `${m.curto}: ${m.inicio}`).join(' · ')}).
                Mês em branco usa a regra geral.
                {aba === 'garantista' && ' Solução: tipo no mês → geral do mês → tipo na regra geral → regra geral.'}
              </p>
              {!temTabelaMes ? (
                <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                  Tabela de regras por mês ainda não liberada no banco — por enquanto vale só a regra geral.
                </p>
              ) : !linhasAno || carregandoAno ? (
                <p className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Carregando {ano}...</p>
              ) : (
                <>
                  <table className="w-full text-xs border border-slate-200 rounded-md overflow-hidden">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                      <tr>
                        <th className="text-left p-2">Mês</th>
                        {mensais.map(m => <th key={m.campo} className="text-right p-2">{m.curto} (dias)</th>)}
                        {aba === 'garantista' && tipos.length > 0 && <th className="text-right p-2">Por tipo</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {linhasAno.map((l, idx) => {
                        const qtdTipos = Object.values(l.dias_solucao_por_tipo || {}).filter(v => v !== '' && v != null).length
                        const aberto = mesTiposAberto === idx
                        return (
                          <React.Fragment key={idx}>
                            <tr className={idx === mesAtual ? 'bg-amber-50/60' : ''}>
                              <td className="p-1.5 pl-2 font-semibold text-slate-700">{MESES[idx]}</td>
                              {mensais.map(m => (
                                <td key={m.campo} className="p-1.5 text-right">
                                  <input type="number" min="1" value={l[m.campo] ?? ''}
                                    placeholder={geralDe[m.campo] || '—'} title="Em branco = regra geral"
                                    onChange={e => alterarMes(idx, m.campo, e.target.value)} className={inputMesCls} />
                                </td>
                              ))}
                              {aba === 'garantista' && tipos.length > 0 && (
                                <td className="p-1.5 text-right">
                                  <button type="button" onClick={() => setMesTiposAberto(aberto ? null : idx)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-colors ${
                                      qtdTipos ? 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'
                                    }`}>
                                    {qtdTipos ? `${qtdTipos} tipo${qtdTipos === 1 ? '' : 's'}` : 'Definir'}
                                    <ChevronDown className={`h-3 w-3 transition-transform ${aberto ? 'rotate-180' : ''}`} />
                                  </button>
                                </td>
                              )}
                            </tr>
                            {aberto && (
                              <tr className="bg-indigo-50/40">
                                <td colSpan={mensais.length + 2} className="p-2">
                                  <p className="text-[10px] text-slate-500 mb-1.5">
                                    Dias para solucionar por tipo de OS em <strong>{MESES[idx]}/{ano}</strong> — em branco usa a Solução do mês (ou a regra geral do tipo).
                                  </p>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 max-h-40 overflow-y-auto pr-1">
                                    {tipos.map(({ sigla, descricao }) => (
                                      <div key={sigla} className="flex items-center gap-2">
                                        <span className="flex-1 text-[11px] text-slate-600 truncate" title={descricao}>{descricao}</span>
                                        <input type="number" min="1"
                                          placeholder={l.dias_solucao || diasSolucaoPorTipoInput[sigla] || String(diasSolucao)}
                                          value={l.dias_solucao_por_tipo?.[sigla] ?? ''}
                                          onChange={e => alterarMesTipo(idx, sigla, e.target.value)} className={inputMesCls} />
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                  <button type="button" onClick={copiarJaneiro}
                    className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                    <Copy className="h-3.5 w-3.5" /> Copiar Janeiro para todos os meses de {ano}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || carregando || carregandoAno}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
            {salvando && <Loader2 className="h-3 w-3 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
