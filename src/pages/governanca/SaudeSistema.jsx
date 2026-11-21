// Governança › Saúde do Sistema (19/11/2026).
// Semáforo de tudo que mantém o portal funcionando: Railway (backend), Supabase (banco), SharePoint (planilhas),
// Cloudflare (telas), rotinas automáticas do backend e integrações (e-mail, MicroWork, IA, Power BI).
// Dados do backend (/api/saude-sistema). Cada card leva ao monitor detalhado.
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  HeartPulse, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, LayoutDashboard, Timer, Plug, Loader2,
  ChevronRight, Mail, Bot, BarChart3, Wrench, FileSpreadsheet,
} from 'lucide-react'
import { PainelControles, useAbaNaUrl, useRolarParaAlvo, idAlvo, linkDestino } from '../../components/monitor/MonitorUI'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
const ABAS = [
  ['resumo', 'Resumo', LayoutDashboard],
  ['rotinas', 'Rotinas automáticas', Timer],
  ['integracoes', 'Integrações', Plug],
]
const dataHora = (iso) => iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const tempoAtras = (iso) => {
  if (!iso) return ''
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `há ${Math.max(min, 1)} min`
  const h = Math.round(min / 60)
  if (h < 48) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}

async function api(caminho) {
  const r = await fetch(`${BACKEND_URL}/api/saude-sistema${caminho}`)
  let j = null
  try { j = await r.json() } catch { /* */ }
  if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`)
  return j
}

const SEM = {
  ok: { txt: 'Saudável', cor: 'emerald', icon: CheckCircle2, borda: 'border-emerald-200', fundo: 'bg-emerald-50', texto: 'text-emerald-700', dot: 'bg-emerald-500' },
  info: { txt: 'Informação', cor: 'sky', icon: Activity, borda: 'border-sky-200', fundo: 'bg-sky-50', texto: 'text-sky-700', dot: 'bg-sky-500' },
  atencao: { txt: 'Atenção', cor: 'amber', icon: AlertTriangle, borda: 'border-amber-200', fundo: 'bg-amber-50', texto: 'text-amber-700', dot: 'bg-amber-500' },
  critico: { txt: 'Crítico', cor: 'red', icon: XCircle, borda: 'border-red-200', fundo: 'bg-red-50', texto: 'text-red-700', dot: 'bg-red-500' },
}
const FRASE_GERAL = {
  ok: 'Tudo funcionando — nenhum ponto passou dos limites.',
  info: 'Tudo funcionando — só há recomendações.',
  atencao: 'O portal está funcionando, mas há pontos que precisam de atenção.',
  critico: 'Há problema que pode afetar o uso do portal — veja os itens em vermelho.',
}

export default function SaudeSistema() {
  // Aba na URL + rolagem até o alvo do alerta clicado (21/11/2026)
  const [aba, setAba, irPara] = useAbaNaUrl(ABAS.map(a => a[0]), 'resumo')
  useRolarParaAlvo()
  const [resumo, setResumo] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const carregar = async (refresh = false) => {
    setCarregando(true); setErro(null)
    try { setResumo(await api(`/resumo${refresh ? '?refresh=1' : ''}`)) } catch (e) { setErro(e.message) } finally { setCarregando(false) }
  }
  useEffect(() => { carregar() }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <HeartPulse className="h-10 w-10 text-rose-500 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Saúde do Sistema</h1>
            <p className="text-[10px] text-slate-500">Visão única de tudo que mantém o portal funcionando — servidor, banco de dados, planilhas, telas, rotinas automáticas e integrações. Confira uma vez por dia.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[10px] text-slate-500 leading-tight text-right whitespace-nowrap">
            Lido em: <strong className="text-slate-700">{carregando ? '...' : dataHora(resumo?.lido_em)}</strong>
          </p>
          <button type="button" onClick={() => carregar(true)} disabled={carregando} title="Verificar tudo de novo" aria-label="Atualizar dados"
            className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm disabled:opacity-60 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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

      {aba === 'resumo' && (resumo
        ? <AbaResumo resumo={resumo} />
        : carregando && <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verificando todos os sistemas (leva alguns segundos)...</p>)}
      {aba === 'rotinas' && <AbaRotinas onIr={irPara} />}
      {aba === 'integracoes' && <AbaIntegracoes onIr={irPara} />}
    </div>
  )
}

// ── Resumo: semáforo geral + um card por sistema ──────────────────────────
function AbaResumo({ resumo }) {
  const g = SEM[resumo.geral] || SEM.ok
  const GIcon = g.icon
  return (
    <div className="space-y-3">
      <div className={`rounded-xl border ${g.borda} ${g.fundo} px-5 py-4 flex items-center gap-3`}>
        <GIcon className={`h-8 w-8 ${g.texto} shrink-0`} />
        <div>
          <p className={`text-base font-bold ${g.texto}`}>{g.txt}</p>
          <p className="text-[11px] text-slate-600">{FRASE_GERAL[resumo.geral]}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {resumo.blocos.map(b => {
          const s = SEM[b.nivel] || SEM.ok
          const Icon = s.icon
          return (
            <div key={b.id} className={`bg-white border rounded-xl overflow-hidden flex flex-col ${b.nivel === 'critico' ? 'border-red-200' : b.nivel === 'atencao' ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                <p className="text-[11px] font-bold text-slate-800 flex-1">{b.nome}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${s.texto}`}><Icon className="h-3.5 w-3.5" /> {s.txt}</span>
              </div>
              <div className="px-4 py-3 flex-1 space-y-1.5">
                {b.aviso && <p className="text-[11px] text-slate-500">{b.aviso}</p>}
                {b.resumo && (
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                    {[['critico', 'crítico'], ['atencao', 'atenção'], ['info', 'recomendação'], ['ok', 'ok']].map(([k, n]) => b.resumo[k] > 0 && (
                      <span key={k} className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${SEM[k].dot}`} /> {b.resumo[k]} {n}</span>
                    ))}
                  </div>
                )}
                {b.problemas.length === 0 && !b.aviso && <p className="text-[11px] text-emerald-700 font-semibold">Nada passou dos limites.</p>}
                {b.problemas.map(p => (
                  <Link key={p.id} to={linkDestino(b.link, p.destino)} title="Abrir onde está a informação"
                    className={`text-[11px] flex items-start gap-1.5 rounded px-1 -mx-1 hover:bg-slate-50 hover:underline ${p.nivel === 'critico' ? 'text-red-700' : 'text-amber-700'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${SEM[p.nivel].dot}`} /> <span className="flex-1">{p.titulo}</span> <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 opacity-60" />
                  </Link>
                ))}
              </div>
              <Link to={b.aba_padrao ? linkDestino(b.link, { aba: b.aba_padrao }) : b.link} className="flex items-center justify-end gap-1 px-4 py-2 border-t border-slate-100 text-[11px] font-semibold text-indigo-600 hover:bg-slate-50">
                Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Rotinas automáticas ───────────────────────────────────────────────────
function AbaRotinas({ onIr }) {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  useEffect(() => { api('/rotinas').then(setD).catch(e => setErro(e.message)) }, [])
  if (erro) return <p className="text-[11px] text-red-600">{erro}</p>
  if (!d) return <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</p>
  return (
    <div className="space-y-3">
      <PainelControles controles={d} onIr={onIr} />
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-slate-500 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="text-left px-4 py-2 font-semibold">Rotina</th>
                <th className="text-left px-4 py-2 font-semibold">Quando roda</th>
                <th className="text-left px-4 py-2 font-semibold">Última execução</th>
                <th className="text-left px-4 py-2 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {d.rotinas.map(r => {
                const s = SEM[r.nivel] || SEM.ok
                return (
                  <tr key={r.id} id={idAlvo(`rotina-${r.id}`)} className="border-b border-slate-50 align-top">
                    <td className="px-4 py-2">
                      <p className="flex items-center gap-1.5 font-semibold text-slate-800"><span className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} /> {r.nome}</p>
                      <p className="text-[10px] text-slate-400 pl-3.5">{r.onde}</p>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{r.frequencia}{r.ativo === false && <span className="block text-[10px] text-slate-400">desligada na configuração</span>}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-slate-800">{dataHora(r.ultima_execucao)} <span className="text-slate-400">{tempoAtras(r.ultima_execucao)}</span>
                      {r.duracao_ms != null && <span className="block text-[10px] text-slate-400">levou {Math.round(r.duracao_ms / 1000)} s</span>}
                    </td>
                    <td className="px-4 py-2 text-slate-600 space-y-0.5">
                      {r.scheduler && <p className={r.scheduler.nivel === 'critico' ? 'text-red-600 font-semibold' : ''}>Agendador: {r.scheduler.txt}</p>}
                      {r.status && <p>Resultado: <strong className={r.status === 'SUCESSO' ? 'text-emerald-700' : r.status === 'PARCIAL' ? 'text-amber-700' : 'text-red-700'}>{r.status}</strong></p>}
                      {(r.falhas || []).map(f => <p key={f.parte} className="text-amber-700 text-[10px]">{f.parte}: {f.erros.join('; ')}</p>)}
                      {r.ultimo_ok === false && r.mensagem && <p className="text-red-600 text-[10px]">{r.mensagem}</p>}
                      {r.ultimo_ok !== false && r.mensagem && <p className="text-[10px] text-slate-500">{r.mensagem}</p>}
                      {(r.itens || []).map((i, k) => (
                        <p key={k} className={`text-[10px] ${i.nivel !== 'ok' ? 'text-amber-700' : 'text-slate-500'}`}>
                          {i.responsavel || '—'} às {i.hora}: {i.atrasada ? 'não rodou hoje' : i.resultado || '—'}{i.mensagem && i.resultado === 'erro' ? ` — ${i.mensagem}` : ''}
                        </p>
                      ))}
                      {(r.marcas || []).map(m => <p key={m.marca} className="text-[10px] text-slate-500">{m.marca}: {dataHora(m.em)}</p>)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">
          Situação do backend que respondeu ({d.em_producao ? 'produção, no Railway' : 'este computador'}), ligado desde {dataHora(d.backend_iniciado_em)}.
          O "Agendador" é o relógio interno que dispara a rotina a cada 5 min — se ele parar, a rotina não roda.
        </p>
      </div>
    </div>
  )
}

// ── Integrações ───────────────────────────────────────────────────────────
function AbaIntegracoes({ onIr }) {
  const [d, setD] = useState(null)
  const [erro, setErro] = useState(null)
  const [testando, setTestando] = useState(false)
  const carregar = (refresh) => {
    setTestando(true); setErro(null)
    api(`/integracoes${refresh ? '?refresh=1' : ''}`).then(setD).catch(e => setErro(e.message)).finally(() => setTestando(false))
  }
  useEffect(() => { carregar(false) }, [])
  if (erro) return <p className="text-[11px] text-red-600">{erro}</p>
  if (!d) return <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Testando as integrações...</p>
  const cards = [
    { id: 'email', nome: 'E-mail (SMTP)', icon: Mail, uso: 'Avisos da Manifestação e das tarefas de Projetos', x: d.email,
      linha: d.email.configurado ? `${d.email.servidor} · ${d.email.ok ? `${d.email.ms} ms` : d.email.erro}` : 'não configurado' },
    { id: 'microwork', nome: 'MicroWork (Motos)', icon: Wrench, uso: 'Produtividade, Auditoria e Garantias das Motos', x: d.microwork,
      linha: d.microwork.configurado ? (d.microwork.ok ? `respondendo em ${d.microwork.ms} ms` : d.microwork.erro) : 'sem token' },
    { id: 'ia', nome: `Inteligência Artificial (${d.ia.provedor})`, icon: Bot, uso: 'Gestor de Peças, Auditoria Externa', x: d.ia,
      linha: d.ia.configurado ? (d.ia.ok ? `chave válida · ${d.ia.ms} ms` : d.ia.erro) : `sem chave (${d.ia.variavel})` },
    { id: 'powerbi', nome: 'Power BI', icon: BarChart3, uso: 'Relatórios da Controladoria no Power BI', x: d.powerbi,
      linha: d.powerbi.configurado ? (d.powerbi.ok ? `${d.powerbi.views} views liberadas` : d.powerbi.erro) : 'não configurado' },
    { id: 'kpi', nome: 'Planilha antiga da Matriz KPIs', icon: FileSpreadsheet, uso: 'Matriz KPIs › Bloco 1 - Corporativo', x: { configurado: true, ok: d.kpi_planilha.configurado, opcional: true },
      linha: d.kpi_planilha.configurado ? 'configurada' : `falta ${d.kpi_planilha.faltando.join(', ')}` },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-[11px] text-slate-500 mr-auto">Testes feitos pelo backend {d.em_producao ? 'de produção (Railway)' : 'deste computador'} em {dataHora(d.lido_em)}.</p>
        <button type="button" onClick={() => carregar(true)} disabled={testando} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${testando ? 'animate-spin' : ''}`} /> Testar de novo
        </button>
      </div>
      <PainelControles controles={d} recarregando={testando} onIr={onIr} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cards.map(c => {
          // IA sem chave e planilha antiga da Matriz = não usadas (informação); e-mail bloqueado = atenção (19/11/2026)
          const nivel = c.x.opcional ? (c.x.ok ? 'ok' : 'info')
            : !c.x.configurado ? (c.id === 'ia' || c.id === 'powerbi' ? 'info' : 'atencao')
            : c.x.ok ? 'ok' : (c.id === 'email' ? 'atencao' : 'critico')
          const s = SEM[nivel]
          const Icon = c.icon
          return (
            <div key={c.id} id={idAlvo(`integ-${c.id}`)} className={`bg-white border rounded-xl p-4 ${s.borda}`}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-500" />
                <p className="text-[11px] font-bold text-slate-800 flex-1">{c.nome}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              </div>
              <p className={`text-[11px] font-semibold mt-1 ${s.texto}`}>{c.linha}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Usado em: {c.uso}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
