// Governança › Monitor SharePoint (19/11/2026).
// Confere as planilhas do SharePoint que alimentam o portal (existem? atualizadas?), o tempo de resposta, o espaço da
// biblioteca e a validade da senha do aplicativo no Azure. Dados do backend (/api/sharepoint-monitor), que usa o
// mesmo acesso ao SharePoint das outras telas — nada sai do navegador para a Microsoft.
import React, { useEffect, useState } from 'react'
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, LayoutDashboard, FileSpreadsheet, Loader2, Search,
  KeyRound, ExternalLink, Clock,
} from 'lucide-react'
import { PainelControles, Relogio, useAbaNaUrl, useRolarParaAlvo, idAlvo, EngrenagemPlanos } from '../../components/monitor/MonitorUI'
import logoSharepoint from '../../assets/logo-sharepoint.webp' // logo enviado pelo usuário em 19/11/2026

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const ABAS = [
  ['visao', 'Visão Geral', LayoutDashboard],
  ['planilhas', 'Planilhas', FileSpreadsheet],
]
const LINK_STATUS_MS = 'https://status.cloud.microsoft'

const dataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const tempoAtras = (iso) => {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `há ${Math.max(min, 1)} min`
  const h = Math.round(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}
const tam = (b) => {
  const n = Number(b) || 0
  if (n >= 1e12) return `${(n / 1e12).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} TB`
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${Math.round(n / 1e3)} KB`
}

async function api(caminho) {
  const r = await fetch(`${BACKEND_URL}/api/sharepoint-monitor${caminho}`)
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) {
    if (j?.error === 'sharepoint_not_configured') throw new Error('O acesso ao SharePoint não está configurado no backend (AZURE_* e SHAREPOINT_DRIVE_ID).')
    throw new Error(j?.error || `HTTP ${r.status}`)
  }
  return j
}

const COR_NIVEL = {
  ok: { dot: 'bg-emerald-500', txt: 'Em dia', cls: 'text-emerald-700' },
  atencao: { dot: 'bg-amber-500', txt: 'Atrasada', cls: 'text-amber-700' },
  critico: { dot: 'bg-red-500', txt: 'Problema', cls: 'text-red-700' },
}

// Relógio "% de planilhas em dia": aqui alto é bom — vermelho até 70%, âmbar até 90%, verde acima
const FAIXAS_EM_DIA = [
  { ate: 70, txt: 'Ruim', cor: '#f87171', corTexto: '#dc2626' },
  { ate: 90, txt: 'Atenção', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 100, txt: 'Bom', cor: '#10b981' },
]
// Tempo de resposta por pasta: 0–4 s
const FAIXAS_RESP = [
  { ate: 500, txt: 'Ótimo', cor: '#10b981' },
  { ate: 1500, txt: 'Bom', cor: '#6ee7b7', corTexto: '#059669' },
  { ate: 3000, txt: 'Lento', cor: '#fbbf24', corTexto: '#d97706' },
  { ate: 4000, txt: 'Ruim', cor: '#f87171', corTexto: '#dc2626' },
]

export default function MonitorSharepoint() {
  // Aba na URL + rolagem até o alvo do alerta clicado (21/11/2026)
  const [aba, setAba, irPara] = useAbaNaUrl(ABAS.map(a => a[0]), 'visao')
  useRolarParaAlvo()
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)

  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try { setDados(await api(`/visao${refresh ? '?refresh=1' : ''}`)) } catch (e) { setErro(e.message) } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img src={logoSharepoint} alt="SharePoint" className="h-10 w-10 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Monitor SharePoint</h1>
            <p className="text-[10px] text-slate-500">Fonte de planilhas — é onde ficam os relatórios gerados pelo RPA (Dealer.net, SAP, CRM) que o portal lê para montar os indicadores, controles e BIs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 leading-tight text-right whitespace-nowrap">
            Lido em: <strong className="text-slate-700">{carregando ? '...' : dataHora(dados?.lido_em)}</strong>
          </p>
          <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Atualizar dados" aria-label="Atualizar dados"
            className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
          {/* Planos do serviço (contratar) — 21/11/2026 */}
          <EngrenagemPlanos chave="sharepoint" />
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map(([k, n, Icon]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px ${aba === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <Icon className="h-3.5 w-3.5" /> {n}
          </button>
        ))}
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-[11px] text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {erro}
        </div>
      )}
      {!dados && carregando && <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Conferindo as planilhas no SharePoint (leva alguns segundos)...</p>}

      {dados && aba === 'visao' && <AbaVisao dados={dados} recarregando={carregando} irPlanilhas={() => setAba('planilhas')} onIr={irPara} />}
      {dados && aba === 'planilhas' && <AbaPlanilhas dados={dados} recarregar={() => carregar(true)} />}
    </div>
  )
}

// ── Visão Geral ───────────────────────────────────────────────────────────
function AbaVisao({ dados, recarregando, irPlanilhas, onIr }) {
  const f = dados.fontes || []
  const emDia = f.filter(x => x.nivel === 'ok').length
  const pctEmDia = f.length ? (emDia / f.length) * 100 : 0
  const b = dados.biblioteca
  const senha = dados.aplicativo?.proxima
  const diasSenha = senha ? Math.floor((Date.parse(senha.vence_em) - Date.now()) / 86400000) : null
  return (
    <div className="space-y-3">
      <PainelControles controles={dados.controles} recarregando={recarregando} onIr={onIr} />
      <div id={idAlvo('sp-biblioteca')} className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_auto] gap-6 items-center">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[11px] text-slate-400">Biblioteca</p>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{b?.nome || '—'}</p>
                {b
                  ? <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3" /> Conectado</span>
                  : <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3" /> Sem acesso</span>}
              </div>
              {b?.link && <a href={b.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline">Abrir no SharePoint <ExternalLink className="h-3 w-3" /></a>}
            </div>
            <div className="text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-500">
              {b?.total && <span>Espaço: <strong className="text-slate-800">{tam(b.usado)}</strong> de {tam(b.total)}</span>}
              {b?.lixeira > 0 && <span>Na lixeira: <strong className="text-slate-800">{tam(b.lixeira)}</strong></span>}
              {senha && (
                <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> Senha do app no Azure:{' '}
                  <strong className={diasSenha <= 30 ? 'text-red-600' : diasSenha <= 90 ? 'text-amber-600' : 'text-slate-800'}>vence {new Date(senha.vence_em).toLocaleDateString('pt-BR')}</strong>
                  <span className="text-slate-400">({diasSenha} dias)</span>
                </span>
              )}
              <span>Status da Microsoft: <a href={LINK_STATUS_MS} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold">ver página oficial</a></span>
            </div>
          </div>
          <div className="w-56 text-center">
            <p className="text-[11px] font-semibold text-slate-600">Planilhas em dia</p>
            <Relogio valor={pctEmDia} faixas={FAIXAS_EM_DIA} marcas={[0, 25, 50, 75, 100]} fmtMarca={v => `${v}%`} rotuloAria={`Planilhas em dia ${Math.round(pctEmDia)}%`} />
            <button type="button" onClick={irPlanilhas} className="text-[11px] text-slate-500 hover:text-indigo-600">
              <strong className="text-slate-800">{emDia}</strong> de {f.length} planilhas · ver lista
            </button>
          </div>
          <div className="w-56 text-center">
            <p className="text-[11px] font-semibold text-slate-600">Tempo de resposta</p>
            <Relogio valor={dados.ms_medio || 0} faixas={FAIXAS_RESP} marcas={[0, 1000, 2000, 3000, 4000]} fmtMarca={v => `${v / 1000}s`} rotuloAria={`Tempo de resposta ${dados.ms_medio} ms`} />
            <p className="text-[11px] text-slate-500"><strong className="text-slate-800">{dados.ms_medio ?? '—'} ms</strong> em média por pasta</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Planilhas ─────────────────────────────────────────────────────────────
const FREQ = [
  ['diaria', 'Todo dia útil'],
  ['semanal', 'Semanal'],
  ['mensal', 'Mensal'],
  ['manual', 'Manual (sem alerta)'],
]
function AbaPlanilhas({ dados, recarregar }) {
  const [filtro, setFiltro] = useState('todas')
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(null) // fonte_id em gravação
  const [erroFreq, setErroFreq] = useState(null)
  const mudarFrequencia = async (fonteId, frequencia) => {
    setSalvando(fonteId); setErroFreq(null)
    try {
      const r = await fetch(`${BACKEND_URL}/api/sharepoint-monitor/frequencia`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fonte_id: fonteId, frequencia }),
      })
      if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || `HTTP ${r.status}`)
      await recarregar()
    } catch (e) {
      setErroFreq(`Não foi possível salvar a frequência: ${e.message}`)
    } finally {
      setSalvando(null)
    }
  }
  const lim = dados.limites
  const ordem = { critico: 0, atencao: 1, ok: 2 }
  const lista = (dados.fontes || [])
    .filter(f => filtro === 'todas' || f.nivel !== 'ok')
    .filter(f => !busca || `${f.nome} ${f.telas} ${f.pasta} ${f.recente?.nome || ''}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => ordem[a.nivel] - ordem[b.nivel] || a.nome.localeCompare(b.nome))
  const qtdProblema = (dados.fontes || []).filter(f => f.nivel !== 'ok').length
  return (
    <div id={idAlvo('sp-planilhas')} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        {[['todas', `Todas (${(dados.fontes || []).length})`], ['problemas', `Com problema (${qtdProblema})`]].map(([k, n]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-2 py-1 rounded-md text-[11px] font-semibold border ${filtro === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{n}</button>
        ))}
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar planilha, tela ou pasta..." className="pl-7 pr-2 py-1 border border-slate-200 rounded-md text-[11px] w-64" />
        </div>
      </div>
      {erroFreq && <p className="px-4 py-2 text-[11px] text-red-600 border-b border-red-100 bg-red-50">{erroFreq}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2 font-semibold">Planilha</th>
              <th className="text-left px-4 py-2 font-semibold">Usada em</th>
              <th className="text-left px-4 py-2 font-semibold">Deve atualizar</th>
              <th className="text-left px-4 py-2 font-semibold">Última atualização</th>
              <th className="text-left px-4 py-2 font-semibold">Arquivo mais recente</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(f => {
              const n = COR_NIVEL[f.nivel]
              return (
                <tr key={f.id} id={idAlvo(`fonte-${f.id}`)} className="border-b border-slate-50 align-top hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <p className="flex items-center gap-1.5 font-semibold text-slate-800"><span className={`h-2 w-2 rounded-full shrink-0 ${n.dot}`} /> {f.nome}</p>
                    <p className="text-[10px] text-slate-400 pl-3.5 break-all">{f.pasta}</p>
                    {f.cadastrada && <p className="text-[10px] text-indigo-500 pl-3.5">Cadastrada em Fontes de Cálculo</p>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{f.telas}</td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <select value={f.frequencia} disabled={salvando === f.id} onChange={e => mudarFrequencia(f.id, e.target.value)}
                        title={f.frequencia_definida ? 'Definida por você' : 'Padrão do sistema'}
                        className={`border rounded-md px-1.5 py-0.5 text-[11px] bg-white ${f.frequencia_definida ? 'border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-700'}`}>
                        {FREQ.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                      </select>
                      {salvando === f.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    {f.encontrado ? (
                      <>
                        <p className="text-slate-800">{dataHora(f.recente.modificado_em)} <span className="text-slate-400">{tempoAtras(f.recente.modificado_em)}</span></p>
                        <p className={`text-[10px] font-semibold ${n.cls}`}>
                          {f.frequencia === 'manual'
                            ? <span className="text-slate-400 font-normal flex items-center gap-1"><Clock className="h-3 w-3" /> atualização manual</span>
                            : f.nivel === 'ok' ? 'Em dia'
                            : f.frequencia === 'diaria' ? `${Math.round(f.horas_uteis)} h úteis sem atualizar`
                            : `${Math.floor((Date.now() - Date.parse(f.recente.modificado_em)) / 86400000)} dias sem atualizar`}
                        </p>
                      </>
                    ) : <p className="text-red-600 font-semibold whitespace-normal max-w-xs">{f.motivo}</p>}
                  </td>
                  <td className="px-4 py-2">
                    {f.encontrado && (
                      <>
                        {f.recente.link
                          ? <a href={f.recente.link} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-all">{f.recente.nome}</a>
                          : <span className="break-all text-slate-700">{f.recente.nome}</span>}
                        <p className="text-[10px] text-slate-400">{tam(f.recente.tamanho)}{f.arquivos > 1 ? ` · ${f.arquivos} arquivos na pasta` : ''}{f.recente.por ? ` · por ${f.recente.por}` : ''}</p>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {!lista.length && <tr><td colSpan={5}className="px-4 py-4 text-center text-emerald-700 font-semibold">Nenhuma planilha com problema.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
        Escolha em "Deve atualizar" com que frequência cada planilha é gerada (em azul = definida por você).
        Todo dia útil: em dia até {lim.atencaoHorasUteis} h úteis, atrasada até {lim.criticoHorasUteis} h, problema acima (sábado e domingo não contam).
        Semanal: atrasada após 8 dias, problema após 14. Mensal: atrasada após 35 dias, problema após 45. Manual: sem alerta, só mostra a data.
      </p>
    </div>
  )
}
