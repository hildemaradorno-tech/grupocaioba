import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Activity, FileText, DollarSign, PieChart, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import GarantiasOficinaDashboard from '../garantias-daf/GarantiasOficinaDashboard'
import GarantiasAbertoDashboard from '../garantias-daf/GarantiasAbertoDashboard'
import GarantiasTitulosDashboard from '../garantias-daf/GarantiasTitulosDashboard'

const ABAS = [
  {
    key: 'oficina', label: 'Em Andamento', icon: Activity, rota: '/garantias-daf-andamento', permKey: 'garantias-daf-andamento',
    objetivo: 'acompanhar as ordens de serviço de garantia que estão atualmente na oficina, executando o serviço.',
  },
  {
    key: 'aberto', label: 'Encerrada', icon: FileText, rota: '/garantias-daf', permKey: 'garantias-daf',
    objetivo: 'acompanhar o andamento das garantias já encerradas na oficina e que já se encontra com o departamento de garantia.',
  },
  {
    key: 'titulos', label: 'Títulos a Receber', icon: DollarSign, rota: '/garantias-daf-titulos', permKey: 'garantias-daf-titulos',
    objetivo: 'acompanhar os títulos financeiros a receber vinculados às garantias faturadas.',
  },
]

// Visão BI, somente leitura — sempre em modo dashboard, sem tabela nem edição.
// Tema escuro dedicado a este módulo (storytelling: KPIs totais → categorias → detalhe por OS/título).
export default function BiGarantiasDaf() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasPermission } = useAuth()
  const [aba, setAba] = useState(() => ABAS.some(a => a.key === location.state?.aba) ? location.state.aba : 'oficina')
  const abaAtual = ABAS.find(a => a.key === aba)

  const [lastModified, setLastModified] = useState(null)
  useEffect(() => { setLastModified(null) }, [aba])

  const fmtDataHora = (s) => { if (!s) return null; try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return null } }

  return (
    <div className="min-h-full bg-[#020617] p-6 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <PieChart className="h-5 w-5 text-violet-400" />
              BI — Garantias DAF
            </h1>
            <p className="text-xs text-[#898781]">
              Indicadores e dashboards do Controle de Garantias DAF — somente visualização.
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-3">
            {fmtDataHora(lastModified) && (
              <p className="flex items-center gap-1.5 text-[11px] text-[#898781] whitespace-nowrap">
                <RefreshCw className="h-3 w-3" /> Arquivo atualizado em: {fmtDataHora(lastModified)}
              </p>
            )}
            {hasPermission(abaAtual.permKey) && (
              <button
                onClick={() => navigate(abaAtual.rota)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-[#c3c2b7] border border-white/10 bg-[#0f172a] hover:bg-[#182238] shadow-sm transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-violet-400" />
                Ir para Controle de Garantias
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 bg-[#0f172a] border border-white/10 rounded-lg p-0.5 w-fit">
          {ABAS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                aba === key ? 'bg-violet-600 text-white shadow-sm' : 'text-[#898781] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-[#c3c2b7]">
          <strong className="font-bold text-white">Objetivo:</strong> {abaAtual.objetivo}
        </p>

        {aba === 'oficina' && <GarantiasOficinaDashboard onLastModified={setLastModified} />}
        {aba === 'aberto' && <GarantiasAbertoDashboard onLastModified={setLastModified} />}
        {aba === 'titulos' && <GarantiasTitulosDashboard onLastModified={setLastModified} />}
      </div>
    </div>
  )
}
