import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageCheck, X } from 'lucide-react'
import ProjetosNav from './ProjetosNav'
import { apiService } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { useProjetosFiltros, aplicarFiltrosGlobais } from '../../context/ProjetosFiltrosContext'
import ProjetosFiltrosPanel from './ProjetosFiltrosPanel'

const fmtData = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

function getTextColor(hex) {
  const h = hex || '#1e293b'
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#1e293b' : '#ffffff'
}

const getDataFimTarefas = (p) => {
  const datas = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort()
  return datas.length ? datas[datas.length - 1] : null
}

const _ent = { dados: null, sistemas: [] }

export default function EntregasProjetos() {
  const navigate = useNavigate()
  const { departamentosPermitidosEfetivos } = useAuth()
  const ctx = useProjetosFiltros()

  const [dados, setDados] = useState(() => _ent.dados ?? [])
  const [sistemas, setSistemas] = useState(() => _ent.sistemas)
  const [loading, setLoading] = useState(() => _ent.dados === null)
  const [filtroDataIni, setFiltroDataIni] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')

  useEffect(() => {
    if (_ent.dados !== null) return
    setLoading(true)
    Promise.all([apiService.getProjetos(), apiService.getProjSistemas()])
      .then(([proj, sis]) => {
        _ent.dados = proj; _ent.sistemas = sis
        setDados(proj); setSistemas(sis)
      })
      .finally(() => setLoading(false))
  }, [])

  const sistemaCorMap      = Object.fromEntries(sistemas.map(s => [s.nome, s.cor || '#1e293b']))
  const sistemaCorTextoMap = Object.fromEntries(sistemas.map(s => [s.nome, s.cor_texto || null]))

  const projetos = useMemo(() => {
    let base = aplicarFiltrosGlobais(dados, ctx, departamentosPermitidosEfetivos)
    // somente projetos concluídos
    base = base.filter(p => p.status === 'concluido')
    // filtro de data término
    if (filtroDataIni || filtroDataFim) {
      base = base.filter(p => {
        const df = getDataFimTarefas(p)
        if (!df) return false
        if (filtroDataIni && df < filtroDataIni) return false
        if (filtroDataFim && df > filtroDataFim) return false
        return true
      })
    }
    // ordenar por data término ASC, depois nome A-Z
    return [...base].sort((a, b) => {
      const da = getDataFimTarefas(a) || '9999-99-99'
      const db = getDataFimTarefas(b) || '9999-99-99'
      if (da !== db) return da < db ? -1 : 1
      return (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
    })
  }, [dados, ctx, filtroDataIni, filtroDataFim, departamentosPermitidosEfetivos])

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="border-b border-slate-200 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gestão de Projetos</h1>
            <p className="text-xs text-slate-500">Controle de tarefas, cronograma e quadro Kanban dos projetos.</p>
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
              onClick={e => e.target.showPicker?.()}
              className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400">até</span>
            <input
              type="date"
              value={filtroDataFim}
              onChange={e => setFiltroDataFim(e.target.value)}
              onClick={e => e.target.showPicker?.()}
              min={filtroDataIni || undefined}
              className="text-xs px-2 py-1 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
            />
            {(filtroDataIni || filtroDataFim) && (
              <button
                onClick={() => { setFiltroDataIni(''); setFiltroDataFim('') }}
                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                title="Limpar datas"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS AVANÇADOS */}
      <ProjetosFiltrosPanel projetos={dados} />

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
        {!loading && (
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <PackageCheck className="h-3.5 w-3.5 text-teal-500" />
            <span className="text-[11px] text-slate-400 font-medium">
              {projetos.length} entrega{projetos.length !== 1 ? 's' : ''} concluída{projetos.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 whitespace-nowrap">Data Entrega</th>
                <th className="p-3" style={{ minWidth: '360px' }}>Título do Projeto</th>
                <th className="p-3" style={{ minWidth: '160px' }}>Sistemas</th>
                <th className="p-3" style={{ minWidth: '200px' }}>Departamento / Área</th>
                <th className="p-3" style={{ minWidth: '160px' }}>Resp. Projeto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {projetos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-400">
                    Nenhum projeto entregue encontrado.
                  </td>
                </tr>
              ) : projetos.map(p => {
                const dataFim = getDataFimTarefas(p)
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-teal-50/40 transition-colors cursor-pointer border-b border-slate-100"
                    onClick={() => navigate(`/projetos/${p.id}`)}
                  >
                    {/* Data Término */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="text-teal-600 font-semibold">{fmtData(dataFim)}</span>
                    </td>
                    {/* Título */}
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        <span className="font-bold text-slate-900">{p.nome}</span>
                      </div>
                    </td>
                    {/* Sistemas */}
                    <td className="p-3">
                      {p.sistemas_nomes && p.sistemas_nomes.length > 0
                        ? <div className="flex flex-wrap gap-1">
                            {p.sistemas_nomes.map(nome => {
                              const cor = sistemaCorMap[nome] || '#1e293b'
                              return (
                                <span key={nome}
                                  style={{ backgroundColor: cor, color: sistemaCorTextoMap[nome] || getTextColor(cor) }}
                                  className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                                  {nome}
                                </span>
                              )
                            })}
                          </div>
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    {/* Departamento / Área */}
                    <td className="p-3 text-slate-600 leading-tight">
                      <span className="block">{p.departamento_nome || '—'}</span>
                      {p.area_nome && <span className="block italic text-slate-400 text-[10px]">{p.area_nome}</span>}
                    </td>
                    {/* Responsável */}
                    <td className="p-3 text-slate-600 whitespace-nowrap">{p.responsavel_nome || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[10px] text-slate-400">{projetos.length} entrega(s) exibida(s)</p>
    </div>
  )
}
