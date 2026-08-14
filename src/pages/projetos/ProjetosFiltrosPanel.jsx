import React from 'react'
import { Filter, RotateCcw, X } from 'lucide-react'
import { useProjetosFiltros } from '../../context/ProjetosFiltrosContext'

const sel = 'text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white w-full'

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const fmtBR = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : ''

// Barra compacta: botão toggle + chips dos filtros ativos + Limpar tudo
// Usada em ProjetosDashboard e CalendarioProjetos (modo showTrigger=false)
export function FiltrosCompactBar() {
  const {
    filtroEmpresa,      setFiltroEmpresa,
    filtroDepartamento, setFiltroDepartamento,
    filtroArea,         setFiltroArea,
    filtroFase,         setFiltroFase,
    filtroSistema,      setFiltroSistema,
    filtroRespProjeto,  setFiltroRespProjeto,
    filtroRespTarefa,   setFiltroRespTarefa,
    filtrosAbertos,     setFiltrosAbertos,
    filtroDataIni,      setFiltroDataIni,
    filtroDataFim,      setFiltroDataFim,
    filtroDataProjIni,  setFiltroDataProjIni,
    filtroDataProjFim,  setFiltroDataProjFim,
    limparFiltros,
  } = useProjetosFiltros()

  const chips = [
    filtroEmpresa      && { key: 'emp',  text: `Empresa: ${filtroEmpresa}`,           clear: () => setFiltroEmpresa('') },
    filtroDepartamento && { key: 'dep',  text: `Depto: ${filtroDepartamento}`,         clear: () => setFiltroDepartamento('') },
    filtroArea         && { key: 'area', text: `Área: ${filtroArea}`,                  clear: () => setFiltroArea('') },
    filtroFase         && { key: 'fase', text: `Fase: ${filtroFase}`,                  clear: () => setFiltroFase('') },
    filtroSistema      && { key: 'sist', text: `Sistema: ${filtroSistema}`,            clear: () => setFiltroSistema('') },
    filtroRespProjeto  && { key: 'rp',   text: `Resp. Proj.: ${filtroRespProjeto}`,    clear: () => setFiltroRespProjeto('') },
    filtroRespTarefa   && { key: 'rt',   text: `Resp. Tarefa: ${filtroRespTarefa}`,    clear: () => setFiltroRespTarefa('') },
    (filtroDataProjIni || filtroDataProjFim) && {
      key: 'dpj',
      text: `Térm. Proj.: ${fmtBR(filtroDataProjIni) || '—'} → ${fmtBR(filtroDataProjFim) || '—'}`,
      clear: () => { setFiltroDataProjIni(''); setFiltroDataProjFim('') },
    },
    (filtroDataIni || filtroDataFim) && {
      key: 'dtar',
      text: `Térm. Tarefa: ${fmtBR(filtroDataIni) || '—'} → ${fmtBR(filtroDataFim) || '—'}`,
      clear: () => { setFiltroDataIni(''); setFiltroDataFim('') },
    },
  ].filter(Boolean)

  return (
    <div className="flex flex-col items-end gap-1.5 shrink-0">
      <button
        onClick={() => setFiltrosAbertos(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
          filtrosAbertos
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        <Filter className="h-3.5 w-3.5" />
        Filtros Avançados
        {chips.length > 0 && (
          <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {chips.length}
          </span>
        )}
        <span className="text-slate-400 text-[10px]">{filtrosAbertos ? '▲' : '▼'}</span>
      </button>

      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {chips.map(chip => (
            <span key={chip.key} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
              <span className="truncate max-w-[180px]">{chip.text}</span>
              <button
                onClick={chip.clear}
                className="shrink-0 p-0.5 hover:bg-indigo-100 rounded-full transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-red-500 hover:bg-red-50 border border-red-200 transition-colors shrink-0"
          >
            <RotateCcw className="h-3 w-3" /> Limpar tudo
          </button>
        </div>
      )}
    </div>
  )
}

export default function ProjetosFiltrosPanel({ projetos = [], children, showTrigger = true }) {
  const {
    filtroEmpresa,      setFiltroEmpresa,
    filtroDepartamento, setFiltroDepartamento,
    filtroArea,         setFiltroArea,
    filtroFase,         setFiltroFase,
    filtroSistema,      setFiltroSistema,
    filtroRespProjeto,  setFiltroRespProjeto,
    filtroRespTarefa,   setFiltroRespTarefa,
    filtrosAbertos,     setFiltrosAbertos,
    filtroDataIni,      setFiltroDataIni,
    filtroDataFim,      setFiltroDataFim,
    filtroDataProjIni,  setFiltroDataProjIni,
    filtroDataProjFim,  setFiltroDataProjFim,
    limparFiltros,      temFiltroAtivo,
  } = useProjetosFiltros()

  const hasAnyFilter = temFiltroAtivo || Boolean(filtroDataIni) || Boolean(filtroDataFim) || Boolean(filtroDataProjIni) || Boolean(filtroDataProjFim)

  const tarefas = projetos.flatMap(p => p.proj_tarefas || [])

  const optsEmpresa     = uniq(projetos.map(p => p.empresa_nome))
  const optsDepto       = uniq(projetos.map(p => p.departamento_nome))
  const optsArea        = uniq(projetos.map(p => p.area_nome))
  const optsFase        = uniq(tarefas.map(t => t.fase_nome))
  const optsSistema     = uniq(tarefas.map(t => t.sistema_nome))
  const optsRespProjeto = uniq(projetos.map(p => p.responsavel_nome))
  const optsRespTarefa  = uniq(tarefas.map(t => t.responsavel_nome))

  const filterBody = (
    <>
      {children && <div className="mt-3">{children}</div>}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={sel}>
            <option value="">Todas</option>
            {optsEmpresa.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Departamento</label>
          <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {optsDepto.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Área</label>
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={sel}>
            <option value="">Todas</option>
            {optsArea.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Fase</label>
          <select value={filtroFase} onChange={e => setFiltroFase(e.target.value)} className={sel}>
            <option value="">Todas</option>
            {optsFase.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Sistema</label>
          <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {optsSistema.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Projeto</label>
          <select value={filtroRespProjeto} onChange={e => setFiltroRespProjeto(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {optsRespProjeto.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Resp.Tarefa</label>
          <select value={filtroRespTarefa} onChange={e => setFiltroRespTarefa(e.target.value)} className={sel}>
            <option value="">Todos</option>
            {optsRespTarefa.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Térm. Projeto</label>
          <span className="text-[10px] text-slate-400 shrink-0">de</span>
          <input type="date" value={filtroDataProjIni} onChange={e => setFiltroDataProjIni(e.target.value)} onClick={e => e.target.showPicker?.()} className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer" />
          <span className="text-[10px] text-slate-400 shrink-0">até</span>
          <input type="date" value={filtroDataProjFim} min={filtroDataProjIni || undefined} onChange={e => setFiltroDataProjFim(e.target.value)} onClick={e => e.target.showPicker?.()} className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer" />
          {(filtroDataProjIni || filtroDataProjFim) && (
            <button onClick={() => { setFiltroDataProjIni(''); setFiltroDataProjFim('') }} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Térm. Tarefa</label>
          <span className="text-[10px] text-slate-400 shrink-0">de</span>
          <input type="date" value={filtroDataIni} onChange={e => setFiltroDataIni(e.target.value)} onClick={e => e.target.showPicker?.()} className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer" />
          <span className="text-[10px] text-slate-400 shrink-0">até</span>
          <input type="date" value={filtroDataFim} min={filtroDataIni || undefined} onChange={e => setFiltroDataFim(e.target.value)} onClick={e => e.target.showPicker?.()} className="text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer" />
          {(filtroDataIni || filtroDataFim) && (
            <button onClick={() => { setFiltroDataIni(''); setFiltroDataFim('') }} className="p-1 text-slate-300 hover:text-red-500 transition-colors"><X className="h-3 w-3" /></button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <button
          onClick={limparFiltros}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Limpar Filtros
        </button>
      </div>
    </>
  )

  // Modo sem trigger: apenas o conteúdo expansível (controlado externamente via ctx.filtrosAbertos)
  if (!showTrigger) {
    if (!filtrosAbertos) return null
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-4 pb-4 pt-1 shadow-sm">
        {filterBody}
      </div>
    )
  }

  // Modo padrão: toggle embutido (usado em CalendarioProjetos, EntregasProjetos, ListaWhatsApp)
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <button
        onClick={() => setFiltrosAbertos(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="shrink-0">Filtros Avançados</span>
          {[
            [filtroEmpresa,      setFiltroEmpresa],
            [filtroDepartamento, setFiltroDepartamento],
            [filtroArea,         setFiltroArea],
            [filtroFase,         setFiltroFase],
            [filtroSistema,      setFiltroSistema],
            [filtroRespProjeto,  setFiltroRespProjeto],
            [filtroRespTarefa,   setFiltroRespTarefa],
          ]
            .filter(([v]) => Boolean(v))
            .map(([v, setter], i) => (
              <span key={i} className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold max-w-[180px]">
                <span className="truncate">{v}</span>
                <button
                  onClick={e => { e.stopPropagation(); setter('') }}
                  className="shrink-0 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                  title="Remover filtro"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          {(filtroDataProjIni || filtroDataProjFim) && (
            <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
              <span className="truncate">Térm. Proj: {filtroDataProjIni ? fmtBR(filtroDataProjIni) : '—'} → {filtroDataProjFim ? fmtBR(filtroDataProjFim) : '—'}</span>
              <button onClick={e => { e.stopPropagation(); setFiltroDataProjIni(''); setFiltroDataProjFim('') }} className="shrink-0 p-0.5 hover:bg-indigo-200 rounded-full transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          )}
          {(filtroDataIni || filtroDataFim) && (
            <span className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] bg-violet-100 text-violet-700 font-bold">
              <span className="truncate">Térm. Tarefa: {filtroDataIni ? fmtBR(filtroDataIni) : '—'} → {filtroDataFim ? fmtBR(filtroDataFim) : '—'}</span>
              <button onClick={e => { e.stopPropagation(); setFiltroDataIni(''); setFiltroDataFim('') }} className="shrink-0 p-0.5 hover:bg-violet-200 rounded-full transition-colors"><X className="h-2.5 w-2.5" /></button>
            </span>
          )}
          {hasAnyFilter && !filtrosAbertos && (
            <button
              onClick={e => { e.stopPropagation(); limparFiltros() }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-red-500 hover:bg-red-50 transition-colors shrink-0"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="h-3 w-3" /> Limpar tudo
            </button>
          )}
        </span>
        <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
      </button>

      {filtrosAbertos && (
        <div className="px-4 pb-4 border-t border-slate-100">
          {filterBody}
        </div>
      )}
    </div>
  )
}
