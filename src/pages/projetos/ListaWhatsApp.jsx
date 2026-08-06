import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MessageCircle, Copy, Check, Users, FolderOpen, CalendarDays, Send, X } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import ProjetosFiltrosPanel from './ProjetosFiltrosPanel'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais } from '../../context/ProjetosFiltrosContext'
import { getProjetosCache, setProjetosCache, clearProjetosCache } from '../../services/projetosCache'

const hojeISO = new Date().toISOString().slice(0, 10)

const STATUS_EMOJI = {
  mapeado:      '⚪',
  programado:   '🔵',
  em_andamento: '🟡',
  pausado:      '🟣',
  concluido:    '✅',
}
const STATUS_LABEL = {
  mapeado:      'Mapeado',
  programado:   'Programado',
  em_andamento: 'Em Andamento',
  pausado:      'Pausado',
  concluido:    'Concluído',
}
const STATUS_COR = {
  mapeado:      '#94a3b8',
  programado:   '#3b82f6',
  em_andamento: '#f59e0b',
  pausado:      '#a855f7',
  concluido:    '#0d9488',
}

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const fmtDataLonga = () => {
  const d = new Date()
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function gerarTexto(tarefas, agrupamento, titulo, filtroDataIni, filtroDataFim, filtroResp) {
  let dataStr
  if (filtroDataIni || filtroDataFim) {
    const ini = filtroDataIni ? fmtData(filtroDataIni) : '—'
    const fim = filtroDataFim ? fmtData(filtroDataFim) : '—'
    dataStr = `${ini} → ${fim}`
  } else {
    const dataHoje = fmtDataLonga()
    dataStr = dataHoje.charAt(0).toUpperCase() + dataHoje.slice(1)
  }

  const lines = []
  lines.push(`📋 *${titulo || 'TAREFAS — GESTÃO DE PROJETOS'}*`)
  lines.push(`📅 ${dataStr}`)
  if (filtroResp) lines.push(`👤 ${filtroResp}`)
  lines.push('')

  const renderTarefa = (t, ocultarProjeto = false, ocultarResp = false) => {
    const atrasada    = t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO
    const terminaHoje = t.status_kanban !== 'concluido' && t.data_fim === hojeISO
    const emoji = atrasada ? '🔴' : terminaHoje ? '🟢' : (STATUS_EMOJI[t.status_kanban] || '⚪')
    if (!ocultarResp && t.responsavel_nome) lines.push(`👤 ${t.responsavel_nome}`)
    lines.push(`${emoji} *${t.nome}*`)
    if (!ocultarProjeto && t.projeto_nome) lines.push(`   📁 ${t.projeto_nome}`)
    if (t.data_fim) {
      const label = atrasada ? ` _(Atrasada)_` : terminaHoje ? ` _(Hoje)_` : ''
      lines.push(`   📅 ${fmtData(t.data_fim)}${label}`)
    }
    if (t.fase_nome) lines.push(`   🏷 _${t.fase_nome}_`)
    lines.push('')
  }

  const grupos = {}
  tarefas.forEach(t => {
    let key
    if      (agrupamento === 'responsavel') key = t.responsavel_nome || '— Sem responsável —'
    else if (agrupamento === 'projeto')     key = t.projeto_nome     || '— Sem projeto —'
    else                                    key = t.data_fim         || '— Sem data —'
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(t)
  })

  const sortedKeys = Object.keys(grupos).sort((a, b) => {
    if (a.startsWith('—')) return 1
    if (b.startsWith('—')) return -1
    if (agrupamento === 'data') return a < b ? -1 : a > b ? 1 : 0
    if (agrupamento === 'responsavel') {
      const minA = grupos[a].map(t => t.data_fim).filter(Boolean).sort()[0] || '9999-99-99'
      const minB = grupos[b].map(t => t.data_fim).filter(Boolean).sort()[0] || '9999-99-99'
      return minA < minB ? -1 : minA > minB ? 1 : a.localeCompare(b, 'pt-BR')
    }
    return a.localeCompare(b, 'pt-BR')
  })

  const SECOES_STATUS = [
    { emoji: '🔴', label: 'ATRASADAS',    fn: t => t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO },
    { emoji: '🟢', label: 'VENCEM HOJE',  fn: t => t.status_kanban !== 'concluido' && t.data_fim === hojeISO },
    { emoji: '🟡', label: 'EM ANDAMENTO', fn: t => t.status_kanban === 'em_andamento' && !(t.data_fim && t.data_fim <= hojeISO) },
    { emoji: '🔵', label: 'PROGRAMADAS',  fn: t => t.status_kanban === 'programado'   && !(t.data_fim && t.data_fim <= hojeISO) },
    { emoji: '🟣', label: 'PAUSADAS',     fn: t => t.status_kanban === 'pausado' },
    { emoji: '⚪', label: 'MAPEADAS',     fn: t => t.status_kanban === 'mapeado' || !t.status_kanban },
    { emoji: '✅', label: 'CONCLUÍDAS',   fn: t => t.status_kanban === 'concluido' },
  ]

  sortedKeys.forEach(grupo => {
    if (agrupamento !== 'responsavel') {
      lines.push('━━━━━━━━━━━━━━━━━━━━')
      if      (agrupamento === 'projeto')    lines.push(`📁 *${grupo}*`)
      else if (!grupo.startsWith('—'))       lines.push(`📅 *Término: ${fmtData(grupo)}*`)
      else                                   lines.push(`📅 *${grupo}*`)
      lines.push('')
    }

    if (agrupamento === 'responsavel') {
      const secoesComTarefas = SECOES_STATUS
        .map(({ emoji, label, fn }) => {
          const sub = grupos[grupo].filter(fn).sort((a, b) => {
            const da = a.data_fim || '9999-99-99'
            const db = b.data_fim || '9999-99-99'
            return da < db ? -1 : da > db ? 1 : 0
          })
          const minData = sub.find(t => t.data_fim)?.data_fim || '9999-99-99'
          return { emoji, label, sub, minData }
        })
        .filter(s => s.sub.length > 0)
        .sort((a, b) => a.minData < b.minData ? -1 : a.minData > b.minData ? 1 : 0)

      secoesComTarefas.forEach(({ emoji, label, sub }) => {
        lines.push(`👤 *${grupo.toUpperCase()}*`)
        lines.push(`${emoji} *${label}* (${sub.length})`)
        lines.push('')
        sub.forEach(t => renderTarefa(t, false, true))
      })
    } else {
      grupos[grupo]
        .sort((a, b) => {
          const da = a.data_fim || '9999-99-99'
          const db = b.data_fim || '9999-99-99'
          return da < db ? -1 : da > db ? 1 : 0
        })
        .forEach(t => renderTarefa(t, agrupamento === 'projeto', false))
    }
  })

  const total       = tarefas.length
  const concluidas  = tarefas.filter(t => t.status_kanban === 'concluido').length
  const atrasadas   = tarefas.filter(t => t.status_kanban !== 'concluido' && t.data_fim && t.data_fim < hojeISO).length
  const emAndamento = tarefas.filter(t => t.status_kanban === 'em_andamento').length
  const programadas = tarefas.filter(t => t.status_kanban === 'programado').length

  lines.push('━━━━━━━━━━━━━━━━━━━━')
  const parts = [`*${total} tarefa${total !== 1 ? 's' : ''}*`]
  if (emAndamento > 0) parts.push(`🟡 ${emAndamento} em andamento`)
  if (programadas > 0) parts.push(`🔵 ${programadas} programada${programadas !== 1 ? 's' : ''}`)
  if (atrasadas   > 0) parts.push(`🔴 ${atrasadas} atrasada${atrasadas !== 1 ? 's' : ''}`)
  if (concluidas  > 0) parts.push(`✅ ${concluidas} concluída${concluidas !== 1 ? 's' : ''}`)
  lines.push('📊 ' + parts.join(' · '))

  return lines.join('\n')
}

export default function ListaWhatsApp() {
  const navigate = useNavigate()
  const { isAdmin, empresasPermitidas, departamentosPermitidosEfetivos } = useAuth()
  const ctx = useProjetosFiltros()

  const [projetos, setProjetos]             = useState(getProjetosCache() ?? [])
  const [loading, setLoading]               = useState(getProjetosCache() === null)
  const filtroDataIni    = ctx.filtroDataIni
  const setFiltroDataIni = ctx.setFiltroDataIni
  const filtroDataFim    = ctx.filtroDataFim
  const setFiltroDataFim = ctx.setFiltroDataFim

  const [agrupamento, setAgrupamento]       = useState('responsavel')
  const [filtroStatus, setFiltroStatus]     = useState(['programado', 'em_andamento'])
  const [copiado, setCopiado]               = useState(false)
  const [titulo, setTitulo]                 = useState('')

  useEffect(() => {
    if (getProjetosCache()) return
    const filtrosEmpresa = isAdmin ? {} : { empresa_ids: [...empresasPermitidas] }
    apiService.getProjetosParaAta(filtrosEmpresa)
      .then(data => { setProjetosCache(data); setProjetos(data) })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [isAdmin, empresasPermitidas])

  const projetosGlobal = useMemo(() => aplicarFiltrosGlobais(projetos, ctx, departamentosPermitidosEfetivos), [
    projetos, ctx.filtroEmpresa, ctx.filtroDepartamento, ctx.filtroArea,
    ctx.filtroFase, ctx.filtroSistema, ctx.filtroRespProjeto, ctx.filtroRespTarefa,
    departamentosPermitidosEfetivos,
  ])

  const tarefas = useMemo(() =>
    projetosGlobal.flatMap(p =>
      (p.proj_tarefas || [])
        .filter(t => filtroStatus.length === 0 || filtroStatus.includes(t.status_kanban || 'mapeado'))
        .filter(t => !ctx.filtroSistema || (t.sistema_nome || '') === ctx.filtroSistema)
        .filter(t => {
          const temFiltroData = filtroDataIni || filtroDataFim
          if (temFiltroData && !t.data_fim) return false
          if (filtroDataIni && t.data_fim && t.data_fim < filtroDataIni) return false
          if (filtroDataFim && t.data_fim && t.data_fim > filtroDataFim) return false
          return true
        })
        .map(t => ({
          ...t,
          projeto_nome:      p.nome,
          departamento_nome: p.departamento_nome || '',
          area_nome:         t.area_nome || p.area_nome || '',
          sistema_nome:      t.sistema_nome || p.sistema_nome || '',
        }))
    ),
    [projetosGlobal, filtroStatus, filtroDataIni, filtroDataFim, ctx.filtroSistema]
  )

  const texto = useMemo(() => gerarTexto(tarefas, agrupamento, titulo, filtroDataIni, filtroDataFim, ctx.filtroRespTarefa), [tarefas, agrupamento, titulo, filtroDataIni, filtroDataFim, ctx.filtroRespTarefa])

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      const el = document.createElement('textarea')
      el.value = texto
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  const AGRUP = [
    { key: 'responsavel', label: 'Por Responsável', icon: Users },
    { key: 'projeto',     label: 'Por Projeto',     icon: FolderOpen },
    { key: 'data',        label: 'Por Data',         icon: CalendarDays },
  ]

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projetos')}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="p-2 bg-green-600 rounded-lg shrink-0">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">WhatsApp</h1>
            <p className="text-xs text-slate-500">Texto formatado para envio via WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botão copiar — fallback para mensagens longas */}
          <button
            onClick={copiar}
            disabled={tarefas.length === 0}
            title="Copiar texto"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              copiado
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>

          {/* Botão principal — abre WhatsApp */}
          <button
            onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank')}
            disabled={tarefas.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5c] text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Enviar por WhatsApp
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <ProjetosNav />
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">De</span>
          <input
            type="date"
            value={filtroDataIni}
            onChange={e => setFiltroDataIni(e.target.value)}
            className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
          />
          <span className="text-[10px] text-slate-400">até</span>
          <input
            type="date"
            value={filtroDataFim}
            onChange={e => setFiltroDataFim(e.target.value)}
            min={filtroDataIni || undefined}
            className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
          />
          <button
            onClick={() => { setFiltroDataIni(''); setFiltroDataFim('') }}
            className={`p-1 rounded transition-colors ${(filtroDataIni || filtroDataFim) ? 'text-red-400 hover:text-red-600' : 'text-slate-200 cursor-default'}`}
            title="Limpar datas"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <ProjetosFiltrosPanel projetos={projetos} />

      {/* Controles */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-4">

        {/* Título opcional */}
        <div className="flex items-center gap-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-20">Título</label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="TAREFAS — GESTÃO DE PROJETOS"
            className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
          />
        </div>

        {/* Agrupamento */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-20">Agrupar</span>
          <div className="flex items-center gap-1.5">
            {AGRUP.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setAgrupamento(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  agrupamento === key
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro de status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide shrink-0 w-24">Status Tarefa:</span>
          {Object.keys(STATUS_LABEL).map(s => {
            const cor   = STATUS_COR[s]
            const ativo = filtroStatus.includes(s)
            return (
              <button key={s}
                onClick={() => setFiltroStatus(prev => ativo ? prev.filter(x => x !== s) : [...prev, s])}
                style={{ background: ativo ? cor : cor + '18', color: ativo ? '#fff' : cor, border: `1.5px solid ${cor}40` }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all"
              >
                {STATUS_EMOJI[s]} {STATUS_LABEL[s]}
              </button>
            )
          })}
          <button onClick={() => setFiltroStatus(Object.keys(STATUS_LABEL))} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Todos</button>
          <button onClick={() => setFiltroStatus([])} className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Nenhum</button>
        </div>
      </div>

      {/* Prévia + Texto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Texto gerado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Texto para copiar</span>
            <span className="text-[10px] text-slate-400">{tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Carregando...</div>
          ) : tarefas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Nenhuma tarefa encontrada com os filtros selecionados.</div>
          ) : (
            <textarea
              readOnly
              value={texto}
              className="w-full h-[520px] p-4 text-xs font-mono text-slate-700 resize-none border-none outline-none bg-white leading-relaxed"
            />
          )}
        </div>

        {/* Prévia visual estilo WhatsApp */}
        <div className="bg-[#e5ddd5] rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-300 bg-[#075e54] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center shrink-0">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-white text-xs font-bold block">Gestão de Projetos</span>
              <span className="text-green-200 text-[10px]">online</span>
            </div>
          </div>
          <div className="flex-1 p-3 overflow-y-auto h-[484px]">
            {tarefas.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-3 max-w-[90%] ml-auto">
                <pre className="text-[11px] text-slate-800 whitespace-pre-wrap font-sans leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: texto
                      .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                      .replace(/_([^_]+)_/g, '<em>$1</em>')
                  }}
                />
                <div className="text-right mt-1.5">
                  <span className="text-[9px] text-slate-400">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
