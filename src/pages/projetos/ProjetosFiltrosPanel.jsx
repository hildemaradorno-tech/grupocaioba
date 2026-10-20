import React from 'react'
import { RotateCcw } from 'lucide-react'
import { useProjetosFiltros } from '../../context/ProjetosFiltrosContext'

const sel = (val) =>
  val
    ? 'text-xs p-1.5 border border-indigo-400 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-indigo-50 text-indigo-700 font-semibold w-full'
    : 'text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white w-full'

const dateClass = (val) =>
  val
    ? 'text-xs px-2 py-1.5 border border-indigo-400 rounded-md bg-indigo-50 text-indigo-700 font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer'
    : 'text-xs px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer'

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function filtrarProjetos(projetos, { empresa, departamento, area, fase, sistema, respProjeto, respTarefa }, excluir = null) {
  return projetos.filter(p => {
    const tfs = p.proj_tarefas || []
    if (excluir !== 'empresa'      && empresa      && p.empresa_nome      !== empresa)                             return false
    if (excluir !== 'departamento' && departamento && p.departamento_nome !== departamento)                        return false
    if (excluir !== 'area'         && area         && p.area_nome         !== area)                                return false
    if (excluir !== 'respProjeto'  && respProjeto  && p.responsavel_nome  !== respProjeto)                         return false
    if (excluir !== 'fase'         && fase         && !tfs.some(t => t.fase_nome        === fase))                 return false
    if (excluir !== 'sistema'      && sistema      && !tfs.some(t => t.sistema_nome     === sistema))              return false
    if (excluir !== 'respTarefa'   && respTarefa   && !tfs.some(t => t.responsavel_nome === respTarefa))           return false
    return true
  })
}

// Mantido por compatibilidade mas não renderiza mais o botão toggle
export function FiltrosCompactBar() { return null }

export default function ProjetosFiltrosPanel({ projetos = [], children, showTrigger = true, hiddenFilters = [] }) {
  const {
    filtroEmpresa,      setFiltroEmpresa,
    filtroDepartamento, setFiltroDepartamento,
    filtroArea,         setFiltroArea,
    filtroFase,         setFiltroFase,
    filtroSistema,      setFiltroSistema,
    filtroRespProjeto,  setFiltroRespProjeto,
    filtroRespTarefa,   setFiltroRespTarefa,
    filtroDataIni,      setFiltroDataIni,
    filtroDataFim,      setFiltroDataFim,
    filtroDataProjIni,  setFiltroDataProjIni,
    filtroDataProjFim,  setFiltroDataProjFim,
    limparFiltros,      temFiltroAtivo,
  } = useProjetosFiltros()

  const hasAnyFilter = temFiltroAtivo || Boolean(filtroDataIni) || Boolean(filtroDataFim) || Boolean(filtroDataProjIni) || Boolean(filtroDataProjFim)

  const filtrosAtivos = {
    empresa: filtroEmpresa, departamento: filtroDepartamento, area: filtroArea,
    fase: filtroFase, sistema: filtroSistema, respProjeto: filtroRespProjeto, respTarefa: filtroRespTarefa,
  }

  const optsEmpresa     = uniq(filtrarProjetos(projetos, filtrosAtivos, 'empresa').map(p => p.empresa_nome))
  const optsDepto       = uniq(filtrarProjetos(projetos, filtrosAtivos, 'departamento').map(p => p.departamento_nome))
  const optsArea        = uniq(filtrarProjetos(projetos, filtrosAtivos, 'area').map(p => p.area_nome))
  const optsRespProjeto = uniq(filtrarProjetos(projetos, filtrosAtivos, 'respProjeto').map(p => p.responsavel_nome))
  const optsFase        = uniq(filtrarProjetos(projetos, filtrosAtivos, 'fase').flatMap(p => (p.proj_tarefas || []).map(t => t.fase_nome)))
  const optsSistema     = uniq(filtrarProjetos(projetos, filtrosAtivos, 'sistema').flatMap(p => (p.proj_tarefas || []).map(t => t.sistema_nome)))
  const optsRespTarefa  = uniq(filtrarProjetos(projetos, filtrosAtivos, 'respTarefa').flatMap(p => (p.proj_tarefas || []).map(t => t.responsavel_nome)))

  const filterBody = (
    <>
      {children && <div className="mt-3">{children}</div>}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroEmpresa ? 'text-indigo-500' : 'text-slate-400'}`}>Empresa</label>
          <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={sel(filtroEmpresa)}>
            <option value="">Todas</option>
            {optsEmpresa.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroDepartamento ? 'text-indigo-500' : 'text-slate-400'}`}>Departamento</label>
          <select value={filtroDepartamento} onChange={e => setFiltroDepartamento(e.target.value)} className={sel(filtroDepartamento)}>
            <option value="">Todos</option>
            {optsDepto.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroArea ? 'text-indigo-500' : 'text-slate-400'}`}>Área</label>
          <select value={filtroArea} onChange={e => setFiltroArea(e.target.value)} className={sel(filtroArea)}>
            <option value="">Todas</option>
            {optsArea.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroFase ? 'text-indigo-500' : 'text-slate-400'}`}>Fase</label>
          <select value={filtroFase} onChange={e => setFiltroFase(e.target.value)} className={sel(filtroFase)}>
            <option value="">Todas</option>
            {optsFase.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroSistema ? 'text-indigo-500' : 'text-slate-400'}`}>Sistema</label>
          <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} className={sel(filtroSistema)}>
            <option value="">Todos</option>
            {optsSistema.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroRespProjeto ? 'text-indigo-500' : 'text-slate-400'}`}>Resp.Projeto</label>
          <select value={filtroRespProjeto} onChange={e => setFiltroRespProjeto(e.target.value)} className={sel(filtroRespProjeto)}>
            <option value="">Todos</option>
            {optsRespProjeto.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={`text-[10px] font-bold uppercase ${filtroRespTarefa ? 'text-indigo-500' : 'text-slate-400'}`}>Resp.Tarefa</label>
          <select value={filtroRespTarefa} onChange={e => setFiltroRespTarefa(e.target.value)} className={sel(filtroRespTarefa)}>
            <option value="">Todos</option>
            {optsRespTarefa.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-6 flex-wrap">
        {!hiddenFilters.includes('termProjeto') && (
          <div className="flex items-center gap-2">
            <label className={`text-[10px] font-bold uppercase shrink-0 ${(filtroDataProjIni || filtroDataProjFim) ? 'text-indigo-500' : 'text-slate-400'}`}>Térm. Projeto</label>
            <span className="text-[10px] text-slate-400 shrink-0">de</span>
            <input type="date" value={filtroDataProjIni} onChange={e => setFiltroDataProjIni(e.target.value)} onClick={e => e.target.showPicker?.()} className={dateClass(filtroDataProjIni)} />
            <span className="text-[10px] text-slate-400 shrink-0">até</span>
            <input type="date" value={filtroDataProjFim} min={filtroDataProjIni || undefined} onChange={e => setFiltroDataProjFim(e.target.value)} onClick={e => e.target.showPicker?.()} className={dateClass(filtroDataProjFim)} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className={`text-[10px] font-bold uppercase shrink-0 ${(filtroDataIni || filtroDataFim) ? 'text-indigo-500' : 'text-slate-400'}`}>Térm. Tarefa</label>
          <span className="text-[10px] text-slate-400 shrink-0">de</span>
          <input type="date" value={filtroDataIni} onChange={e => setFiltroDataIni(e.target.value)} onClick={e => e.target.showPicker?.()} className={dateClass(filtroDataIni)} />
          <span className="text-[10px] text-slate-400 shrink-0">até</span>
          <input type="date" value={filtroDataFim} min={filtroDataIni || undefined} onChange={e => setFiltroDataFim(e.target.value)} onClick={e => e.target.showPicker?.()} className={dateClass(filtroDataFim)} />
        </div>
      </div>
      {hasAnyFilter && (
        <div className="mt-3">
          <button
            onClick={limparFiltros}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Limpar Filtros
          </button>
        </div>
      )}
    </>
  )

  // Sempre visível — sem toggle
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 pb-4 pt-1 shadow-sm">
      {filterBody}
    </div>
  )
}
