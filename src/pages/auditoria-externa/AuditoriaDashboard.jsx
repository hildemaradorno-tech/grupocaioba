import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie, Legend, FunnelChart, Funnel, LabelList } from 'recharts'
import { AlertTriangle, CheckCircle2, ShieldAlert, Layers } from 'lucide-react'
import { apiService } from '../../services/api'
import AuditoriaExternaNav from './AuditoriaExternaNav'
import { calcularPercentualAtingidoAchado, statusAgregadoAchado, achadoResolvido } from './auditExtConstants'

function KpiCard({ icon: Icon, label, valor, sub, cor }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${cor.bg} ${cor.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className={`p-1 rounded ${cor.icoBg}`}><Icon className={`h-3.5 w-3.5 ${cor.icoTxt}`} /></div>
        <p className={`text-[10px] font-bold uppercase tracking-wide ${cor.labelTxt}`}>{label}</p>
      </div>
      <p className={`text-xl font-bold ${cor.numTxt}`}>{valor}</p>
      {sub && <p className={`text-[10px] mt-1 ${cor.labelTxt}`}>{sub}</p>}
    </div>
  )
}

const PIE_CORES_DEPARTAMENTO = ['#2563eb', '#0ea5e9', '#14b8a6', '#0d9488', '#6366f1', '#3b82f6', '#22d3ee', '#0891b2']
const PIE_CORES_TIPO_ACAO = ['#7c3aed', '#c026d3', '#db2777', '#f97316', '#ea580c', '#a855f7', '#e11d48', '#d946ef']

// Gráfico de pizza por contagem, usado em "por Departamento" / "por Tipo de Ação".
// Por fora de cada fatia mostra o % do total; passando o mouse (tooltip) mostra
// só a quantidade.
function RankingPie({ dados, cores }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={dados} dataKey="qtd" nameKey="label" cx="50%" cy="48%" outerRadius={70}
          label={({ percent }) => `${Math.round(percent * 100)}%`}
        >
          {dados.map((d, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
        </Pie>
        <Tooltip formatter={(v, n, p) => [v, p.payload.label]} />
        <Legend wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Gráfico de funil por contagem — maior quantidade no topo, decrescendo.
function RankingFunil({ dados, cores }) {
  if (dados.length === 0) return <p className="text-xs text-slate-400">Sem dados ainda.</p>
  return (
    <ResponsiveContainer width="100%" height={240}>
      <FunnelChart>
        <Tooltip formatter={(v, n, p) => [v, p.payload.label]} />
        <Funnel data={dados} dataKey="qtd" nameKey="label" isAnimationActive>
          <LabelList position="right" dataKey="label" fill="#334155" stroke="none" fontSize={11} />
          {dados.map((d, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}

const STATUS_COR_CHART = { sem_plano: '#94a3b8', pendente: '#94a3b8', em_andamento: '#3b82f6', concluido: '#10b981', validado_auditoria: '#4f46e5' }

export default function AuditoriaDashboard() {
  const [achados, setAchados] = useState([])
  const [planos, setPlanos] = useState([])
  const [ciclos, setCiclos] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      const [a, p, c] = await Promise.all([
        apiService.getAuditExtAchados(),
        apiService.getAuditExtPlanosAcao(),
        apiService.getAuditExtCiclos(),
      ])
      setAchados(a)
      setPlanos(p)
      setCiclos(c)
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadDados() }, [loadDados])

  // Uma divergência pode ter várias ações (planos de ação).
  const planosPorAchado = useMemo(() => {
    const m = new Map()
    for (const p of planos) {
      if (!m.has(p.achado_id)) m.set(p.achado_id, [])
      m.get(p.achado_id).push(p)
    }
    return m
  }, [planos])

  const totalDivergencias = achados.length

  const resolvidas = useMemo(() =>
    achados.filter(a => achadoResolvido(planosPorAchado.get(a.id))).length,
    [achados, planosPorAchado])

  const naoResolvidas = totalDivergencias - resolvidas

  // % de conclusão geral = média do % atingido (Valor Corrigido ÷ Total
  // Apontado) de cada divergência — automático.
  const percentualGeral = useMemo(() => {
    if (achados.length === 0) return 0
    const soma = achados.reduce((s, a) => s + calcularPercentualAtingidoAchado(a), 0)
    return Math.round(soma / achados.length)
  }, [achados])

  // Como estão as soluções: quantidade de divergências em cada estágio (o
  // estágio da divergência é o mais atrasado entre as ações dela).
  // "Validado pela Auditoria" entra junto com "Concluído" aqui.
  const statusData = useMemo(() => {
    const m = { sem_plano: 0, pendente: 0, em_andamento: 0, concluido: 0 }
    for (const a of achados) {
      const st = statusAgregadoAchado(planosPorAchado.get(a.id))
      const chave = st === 'validado_auditoria' ? 'concluido' : (st || 'sem_plano')
      m[chave]++
    }
    const labels = { sem_plano: 'Sem Plano', pendente: 'Pendente', em_andamento: 'Em Andamento', concluido: 'Concluído' }
    return Object.entries(m).map(([k, qtd]) => ({ status: labels[k], qtd, cor: STATUS_COR_CHART[k] }))
  }, [achados, planosPorAchado])

  // Em quais departamentos tiveram mais ações (cada ação conta pro seu departamento).
  const porDepartamento = useMemo(() => {
    const m = new Map()
    for (const p of planos) {
      const nome = p.proj_departamentos?.nome || 'Não atribuído'
      m.set(nome, (m.get(nome) || 0) + 1)
    }
    return Array.from(m.entries()).map(([label, qtd]) => ({ label, qtd })).sort((a, b) => b.qtd - a.qtd)
  }, [planos])

  // Que tipo de ação foi realizada (cada ação conta pro seu tipo).
  const porTipoAcao = useMemo(() => {
    const m = new Map()
    for (const p of planos) {
      const nome = p.audext_tipos_acao?.nome || 'Não definido'
      m.set(nome, (m.get(nome) || 0) + 1)
    }
    return Array.from(m.entries()).map(([label, qtd]) => ({ label, qtd })).sort((a, b) => b.qtd - a.qtd)
  }, [planos])

  if (loading) return <div className="p-6">Carregando...</div>

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard — Auditoria Externa</h1>
          <p className="text-xs text-slate-500">Visão consolidada por quantidade de divergências, andamento das soluções e conclusão dos ciclos de auditoria.</p>
        </div>
        <AuditoriaExternaNav />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          icon={ShieldAlert} label="Total de Divergências" valor={totalDivergencias}
          sub={`${ciclos.length} ciclo(s) de auditoria`}
          cor={{ bg: 'bg-indigo-50', border: 'border-indigo-200', icoBg: 'bg-indigo-100', icoTxt: 'text-indigo-600', numTxt: 'text-indigo-700', labelTxt: 'text-indigo-500' }}
        />
        <KpiCard
          icon={AlertTriangle} label="Não Resolvidas" valor={naoResolvidas}
          sub={`de ${totalDivergencias} divergência(s) no total`}
          cor={{ bg: 'bg-rose-50', border: 'border-rose-200', icoBg: 'bg-rose-100', icoTxt: 'text-rose-600', numTxt: 'text-rose-700', labelTxt: 'text-rose-500' }}
        />
        <KpiCard
          icon={CheckCircle2} label="Divergências Resolvidas" valor={resolvidas}
          sub={`Concluídas ou validadas de ${totalDivergencias}`}
          cor={{ bg: 'bg-emerald-50', border: 'border-emerald-200', icoBg: 'bg-emerald-100', icoTxt: 'text-emerald-600', numTxt: 'text-emerald-700', labelTxt: 'text-emerald-500' }}
        />
        <KpiCard
          icon={Layers} label="% de Conclusão Geral" valor={`${percentualGeral}%`}
          sub="Média do % atingido de todas as divergências"
          cor={{ bg: 'bg-amber-50', border: 'border-amber-200', icoBg: 'bg-amber-100', icoTxt: 'text-amber-600', numTxt: 'text-amber-700', labelTxt: 'text-amber-500' }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Como Estão as Soluções — Divergências por Status</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={v => [`${v} divergência(s) (${totalDivergencias ? Math.round((v / totalDivergencias) * 100) : 0}% do total)`, '']} />
              <Bar dataKey="qtd" radius={[0, 4, 4, 0]}>
                {statusData.map((d, i) => <Cell key={i} fill={d.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
          <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Tipo de Ação Tomada</h3>
          <RankingFunil dados={porTipoAcao} cores={PIE_CORES_TIPO_ACAO} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h3 className="text-xs font-bold text-slate-700 mb-3">Divergências por Departamento</h3>
        <RankingPie dados={porDepartamento} cores={PIE_CORES_DEPARTAMENTO} />
      </div>
    </div>
  )
}
