import React, { useEffect, useState } from 'react'
import { Cloud, Database, Loader2, AlertTriangle, XCircle } from 'lucide-react'
import { getStatusSincronizacao } from '../../services/kpiService'

// Fixa o fuso de Mato Grosso do Sul (Campo Grande, UTC−4) — com o de Brasília o horário aparecia 1 h à frente
// (23/11/2026).
function formatDataHora(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Campo_Grande' })
}

// Partes que falharam na última Atualização (kpi_sync_execucoes.detalhes: planilhas, extrator, biFaturamento,
// campanha…) — viram a dica da etiqueta (passar o mouse). Nomes das planilhas da Matriz em português.
const NOME_PARTE = { resultados: 'Resultados', bloco1: 'Bloco 1', bloco2: 'Bloco 2', backlog: 'Orçamento & Backlog' }
function falhasDaExecucao(det) {
  let d = det
  if (typeof d === 'string') { try { d = JSON.parse(d) } catch { return [] } }
  if (!d || typeof d !== 'object') return []
  const out = []
  const ver = (item, rotulo) => { if (item && item.ok === false) out.push(`${rotulo}: ${item.erro || 'falhou'}`) }
  for (const [parte, v] of Object.entries(d)) {
    if (Array.isArray(v)) {
      for (const it of v) ver(it, NOME_PARTE[it?.chave] || [it?.fonte, it?.empresa, it?.medida, it?.chave].filter(Boolean).join(' · ') || parte)
    } else if (v && typeof v === 'object') {
      ver(v, parte)
      if (Array.isArray(v.detalhes)) for (const it of v.detalhes) ver(it, `${parte} · ${it?.medida || it?.chave || ''}`)
    }
  }
  return out
}

// Só exibe a origem do dado (sincronizado vs. mock) e quando foi a última sincronização — e, desde
// 16/11/2026, se ela terminou parcial (alguma parte falhou) ou com erro, com o motivo na dica.
// compacto: fonte e espaçamento menores (Matriz de KPIs: embaixo dos seletores de período).
export default function DataSourceBadge({ source, loading, refreshKey = 0, compacto = false }) {
  const [ultimaExecucao, setUltimaExecucao] = useState(null)

  useEffect(() => {
    getStatusSincronizacao().then(st => setUltimaExecucao(st?.ultimaExecucao ?? null))
  }, [refreshKey])

  const tam = compacto ? 'h-2.5 w-2.5' : 'h-3 w-3'
  if (loading) {
    return (
      <div className={`flex items-center gap-1.5 text-slate-400 ${compacto ? 'text-[10px]' : 'text-xs'}`}>
        <Loader2 className={`${tam} animate-spin`} />
        Carregando...
      </div>
    )
  }

  const isReal = source === 'sharepoint'
  const quando = formatDataHora(ultimaExecucao?.iniciado_em)
  const status = ultimaExecucao?.status
  const falhas = falhasDaExecucao(ultimaExecucao?.detalhes)
  // EXECUTANDO aqui = registro de uma atualização que não terminou (a que está rodando aparece como
  // "Sincronizando…" na própria Matriz).
  const tipo = !isReal ? 'mock' : status === 'ERRO' ? 'erro' : (status === 'PARCIAL' || status === 'EXECUTANDO') ? 'parcial' : 'ok'
  const cores = {
    ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    parcial: 'bg-amber-50 text-amber-800 border-amber-300',
    erro: 'bg-red-50 text-red-700 border-red-200',
    mock: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  const Icone = tipo === 'ok' ? Cloud : tipo === 'parcial' ? AlertTriangle : tipo === 'erro' ? XCircle : Database
  const texto = tipo === 'mock' ? 'Dados demonstrativos (mock)'
    : tipo === 'erro' ? `Erro na última atualização${quando ? ` — ${quando}` : ''}`
    : tipo === 'parcial' ? `Dados sincronizados${quando ? ` — ${quando}` : ''} · ${status === 'EXECUTANDO' ? 'atualização não concluída' : 'parcial'}`
    : `Dados sincronizados${quando ? ` — ${quando}` : ''}`
  const dica = tipo === 'parcial' || tipo === 'erro'
    ? [status === 'EXECUTANDO' ? 'A última atualização não terminou (o sistema pode ter reiniciado no meio).'
        : tipo === 'erro' ? 'A última atualização terminou com erro — os dados não foram atualizados.'
        : 'A última atualização terminou, mas algumas partes falharam (o restante foi atualizado):',
      ...falhas.map(f => `• ${f}`)].join('\n')
    : undefined

  return (
    <span title={dica} className={`flex items-center gap-1.5 rounded-full font-medium border ${
      compacto ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    } ${cores[tipo]} ${dica ? 'cursor-help' : ''}`}>
      <Icone className={tam} />
      {texto}
    </span>
  )
}
