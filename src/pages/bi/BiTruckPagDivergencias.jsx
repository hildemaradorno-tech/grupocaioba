import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, RefreshCw, ArrowLeftRight, Calendar, Building2, TrendingUp } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts'
import { apiService } from '../../services/api'

const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtData = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return iso || '—' } }
const fmtDataHora = (s) => { if (!s) return '—'; try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return s } }

const CORES = ['#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#06b6d4']

function hojeIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function mesPrimeiroIso() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function BiTruckPagDivergencias() {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [dataInicio, setDataInicio] = useState(mesPrimeiroIso())
  const [dataFim, setDataFim] = useState(hojeIso())

  const carregar = async () => {
    setLoading(true)
    setErro(null)
    try {
      const data = await apiService.getTruckPagDivergencias({ dataInicio, dataFim })
      setRegistros(data)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [dataInicio, dataFim])

  // Agrupa por motivo (campos_divergentes)
  const porMotivo = useMemo(() => {
    const map = new Map()
    for (const r of registros) {
      const campos = (r.campos_divergentes || 'Não informado').split(',').map(s => s.trim())
      for (const c of campos) {
        map.set(c, (map.get(c) || 0) + 1)
      }
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))
  }, [registros])

  // Agrupa por empresa
  const porEmpresa = useMemo(() => {
    const map = new Map()
    for (const r of registros) {
      const emp = r.empresa || 'Não informado'
      map.set(emp, (map.get(emp) || 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name: name.length > 25 ? name.slice(0, 23) + '…' : name, value }))
  }, [registros])

  // Agrupa por data de registro (dia)
  const porDia = useMemo(() => {
    const map = new Map()
    for (const r of registros) {
      const dia = r.registrado_em ? r.registrado_em.slice(0, 10) : 'Sem data'
      map.set(dia, (map.get(dia) || 0) + 1)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, qtd]) => ({ name: fmtData(dia), value: qtd }))
  }, [registros])

  const totalValor = useMemo(() => registros.reduce((s, r) => s + (r.valor_parcela_total || 0), 0), [registros])

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              BI — Divergências TruckPag
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Análise histórica das divergências de conciliação entre repasses e títulos.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/truckpag/repasses')} className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-md transition-colors">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Ir para Repasses
            </button>
            <button onClick={carregar} disabled={loading} className="flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-md transition-colors disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filtro período */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 flex flex-wrap items-center gap-4">
          <Calendar className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="text-xs bg-slate-700 border border-slate-600 text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="text-xs bg-slate-700 border border-slate-600 text-white rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>
          <span className="text-[10px] text-slate-500 ml-auto">{registros.length} registro(s) no período</span>
        </div>

        {erro && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-xs text-red-300">{erro}</div>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Divergências', value: registros.length, color: 'text-amber-400', sub: 'registros no período' },
            { label: 'Empresas Afetadas', value: new Set(registros.map(r => r.empresa)).size, color: 'text-blue-400', sub: 'empresas distintas' },
            { label: 'Valor Envolvido', value: fmtMoeda(totalValor), color: 'text-red-400', sub: 'soma dos valores divergentes' },
            { label: 'Tipos de Motivo', value: porMotivo.length, color: 'text-purple-400', sub: 'campos distintos divergentes' },
          ].map(c => (
            <div key={c.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{c.label}</p>
              <p className={`text-2xl font-bold leading-none ${c.color}`}>{c.value}</p>
              <p className="text-[10px] text-slate-500 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        {!loading && registros.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Por motivo (pizza) */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Por Motivo</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={porMotivo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {porMotivo.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Por empresa (barras) */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-400" /> Por Empresa (top 10)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porEmpresa} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" name="Divergências" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Por dia (barras) */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Por Data de Registro</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={porDia} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="value" name="Divergências" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabela detalhada */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-xs font-bold text-slate-300">Detalhe das Divergências</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center p-16">
              <RefreshCw className="h-6 w-6 text-slate-500 animate-spin" />
            </div>
          ) : registros.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-16 text-slate-500">
              <AlertTriangle className="h-6 w-6" />
              <p className="text-sm font-semibold">Nenhuma divergência no período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    {['Registrado em', 'Empresa', 'Data Pagto', 'NF-e', 'NFS-e', 'CNPJ Cliente', 'Valor Total', 'Motivo Divergência', 'Motivo Detalhado', 'Lançamento Título'].map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {registros.map((r, i) => (
                    <tr key={r.id || i} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{fmtDataHora(r.registrado_em)}</td>
                      <td className="px-3 py-2 text-slate-200 font-medium">{r.empresa || '—'}</td>
                      <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{fmtData(r.data_pagamento)}</td>
                      <td className="px-3 py-2 text-slate-300">{r.nf_e || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{r.nfs_e || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{r.cnpj_cliente || '—'}</td>
                      <td className="px-3 py-2 text-right text-slate-200 whitespace-nowrap">{r.valor_parcela_total != null ? fmtMoeda(r.valor_parcela_total) : '—'}</td>
                      <td className="px-3 py-2">
                        {r.campos_divergentes ? (
                          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">
                            <AlertTriangle className="h-2.5 w-2.5" />{r.campos_divergentes}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 max-w-xs truncate" title={r.motivo || ''}>{r.motivo || '—'}</td>
                      <td className="px-3 py-2 text-slate-300">{r.titulo_codigo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
