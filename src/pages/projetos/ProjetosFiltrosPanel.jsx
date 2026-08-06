import React from 'react'
import { Filter, RotateCcw, X } from 'lucide-react'
import { useProjetosFiltros } from '../../context/ProjetosFiltrosContext'

const sel = 'text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 bg-white w-full'

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export default function ProjetosFiltrosPanel({ projetos = [], children }) {
  const {
    filtroEmpresa,      setFiltroEmpresa,
    filtroDepartamento, setFiltroDepartamento,
    filtroArea,         setFiltroArea,
    filtroFase,         setFiltroFase,
    filtroSistema,      setFiltroSistema,
    filtroRespProjeto,  setFiltroRespProjeto,
    filtroRespTarefa,   setFiltroRespTarefa,
    filtrosAbertos,     setFiltrosAbertos,
    limparFiltros,      temFiltroAtivo,
  } = useProjetosFiltros()

  const tarefas = projetos.flatMap(p => p.proj_tarefas || [])

  const optsEmpresa     = uniq(projetos.map(p => p.empresa_nome))
  const optsDepto       = uniq(projetos.map(p => p.departamento_nome))
  const optsArea        = uniq(projetos.map(p => p.area_nome))
  const optsFase        = uniq(tarefas.map(t => t.fase_nome))
  const optsSistema     = uniq(tarefas.map(t => t.sistema_nome))
  const optsRespProjeto = uniq(projetos.map(p => p.responsavel_nome))
  const optsRespTarefa  = uniq(tarefas.map(t => t.responsavel_nome))

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
        </span>
        <span className="text-slate-400">{filtrosAbertos ? '▲' : '▼'}</span>
      </button>

      {filtrosAbertos && (
        <div className="px-4 pb-4 border-t border-slate-100">
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
          <div className="mt-3">
            <button
              onClick={limparFiltros}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Limpar Filtros
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
