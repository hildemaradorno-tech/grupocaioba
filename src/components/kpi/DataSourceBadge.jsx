import React, { useEffect, useState } from 'react'
import { Cloud, Database, Loader2 } from 'lucide-react'
import { getStatusSincronizacao } from '../../services/kpiService'

// Fixa o fuso em Brasília para manter o horário exibido consistente.
function formatDataHora(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
}

// Só exibe a origem do dado (sincronizado vs. mock) e quando foi a última
// sincronização. A atualização em si é comandada exclusivamente pelo botão
// "Atualizar Agora" da tela Sincronização de Dados — não existe mais recarga
// por tela individual.
// compacto: fonte e espaçamento menores (Matriz KPIs: embaixo dos seletores de período).
export default function DataSourceBadge({ source, loading, refreshKey = 0, compacto = false }) {
  const [ultimaExecucao, setUltimaExecucao] = useState(null)

  useEffect(() => {
    getStatusSincronizacao().then(st => setUltimaExecucao(st?.ultimaExecucao ?? null))
  }, [refreshKey])

  if (loading) {
    return (
      <div className={`flex items-center gap-1.5 text-slate-400 ${compacto ? 'text-[10px]' : 'text-xs'}`}>
        <Loader2 className={compacto ? 'h-2.5 w-2.5 animate-spin' : 'h-3 w-3 animate-spin'} />
        Carregando...
      </div>
    )
  }

  const isReal = source === 'sharepoint'

  return (
    <span className={`flex items-center gap-1.5 rounded-full font-medium border ${
      compacto ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    } ${
      isReal
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
    }`}>
      {isReal ? <Cloud className={compacto ? 'h-2.5 w-2.5' : 'h-3 w-3'} /> : <Database className={compacto ? 'h-2.5 w-2.5' : 'h-3 w-3'} />}
      {isReal
        ? `Dados sincronizados${ultimaExecucao?.iniciado_em ? ` — ${formatDataHora(ultimaExecucao.iniciado_em)}` : ''}`
        : 'Dados demonstrativos (mock)'}
    </span>
  )
}
