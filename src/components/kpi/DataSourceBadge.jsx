import React, { useEffect, useState } from 'react'
import { Cloud, Database, Loader2, AlertTriangle } from 'lucide-react'
import { getStatusSincronizacao } from '../../services/kpiService'

function formatDataHora(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

// Só exibe a origem do dado (sincronizado vs. mock) e quando foi a última
// sincronização. A atualização em si é comandada exclusivamente pelo botão
// "Atualizar Agora" da tela Sincronização de Dados — não existe mais recarga
// por tela individual.
export default function DataSourceBadge({ source, loading }) {
  const [ultimaExecucao, setUltimaExecucao] = useState(null)

  useEffect(() => {
    getStatusSincronizacao().then(st => setUltimaExecucao(st?.ultimaExecucao ?? null))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Carregando...
      </div>
    )
  }

  const isReal = source === 'sharepoint'
  const comProblema = ultimaExecucao && (ultimaExecucao.status === 'PARCIAL' || ultimaExecucao.status === 'ERRO')

  return (
    <div className="flex flex-col items-end gap-1">
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        isReal
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}>
        {isReal
          ? <><Cloud className="h-3 w-3" /> Dados sincronizados</>
          : <><Database className="h-3 w-3" /> Dados demonstrativos (mock)</>
        }
      </span>
      {ultimaExecucao?.iniciado_em && (
        <span className={`flex items-center gap-1 text-[11px] ${comProblema ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
          {comProblema && <AlertTriangle className="h-3 w-3" />}
          Última sincronização: {formatDataHora(ultimaExecucao.iniciado_em)}
        </span>
      )}
    </div>
  )
}
