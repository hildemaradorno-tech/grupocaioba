// Constantes compartilhadas entre as telas do módulo Auditoria Externa —
// badges de severidade/status e helpers de formatação, seguindo o padrão de
// paleta pedido (rose/amber/emerald) e o estilo de mapas locais já usado em
// Garantias DAF e Manifestações.
import React, { useState, useEffect } from 'react'

export const RISCO_MAP = {
  alta:  { label: 'Alta',  cor: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300' },
  media: { label: 'Média', cor: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300' },
  baixa: { label: 'Baixa', cor: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300' },
}

export const STATUS_CONTABIL_MAP = {
  sem_impacto:  { label: 'Sem Impacto Contábil', cor: 'bg-slate-100 text-slate-600' },
  exige_ajuste: { label: 'Exige Ajuste Contábil', cor: 'bg-rose-100 text-rose-700' },
  ja_corrigido: { label: 'Já Corrigido', cor: 'bg-emerald-100 text-emerald-700' },
  em_revisao:   { label: 'Em Revisão', cor: 'bg-blue-100 text-blue-700' },
}

export const TIPO_INCONSISTENCIA_MAP = {
  diferenca_criterio:      'Diferença de Critério (Competência vs. Caixa)',
  saldo_invertido:         'Natureza de Saldo Invertido (Ativo Credor / Passivo Devedor)',
  ausencia_reconhecimento: 'Ausência de Reconhecimento Contábil',
  aging_vencido:           'Aging / Títulos Vencidos',
}

export const STATUS_PLANO_MAP = {
  pendente:           { label: 'Pendente', cor: 'bg-amber-100 text-amber-700' },
  em_andamento:       { label: 'Em Andamento', cor: 'bg-blue-100 text-blue-700' },
  concluido:          { label: 'Concluído', cor: 'bg-emerald-100 text-emerald-700' },
  validado_auditoria: { label: 'Validado pela Auditoria', cor: 'bg-indigo-100 text-indigo-700' },
}

export const SETOR_MAP = {
  contabilidade: 'Contabilidade',
  financeiro:    'Financeiro',
  fiscal:        'Fiscal',
  ti:            'TI',
}

export const CICLO_STATUS_MAP = {
  em_andamento: { label: 'Em Andamento', cor: 'bg-blue-100 text-blue-700' },
  concluido:    { label: 'Concluído', cor: 'bg-emerald-100 text-emerald-700' },
  arquivado:    { label: 'Arquivado', cor: 'bg-slate-100 text-slate-500' },
}

export const fmtMoeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const fmtData = (s) => s ? new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') : '—'

// Ordena por numero_codigo (ex: "#01", "#02"...) numericamente, não como texto.
export function compararPorCodigo(a, b) {
  const numA = parseInt(String(a.numero_codigo || '').replace(/\D/g, ''), 10) || 0
  const numB = parseInt(String(b.numero_codigo || '').replace(/\D/g, ''), 10) || 0
  return numA - numB
}

// Valor Corrigido é um campo da própria divergência (não soma de ações — uma
// divergência pode ter várias ações, mas só um valor corrigido). % Atingido =
// Valor Corrigido ÷ Total Apontado.
export function calcularPercentualAtingidoAchado(achado) {
  const total = Number(achado?.total_apontado || 0)
  if (total <= 0) return 0
  const corrigido = Number(achado?.valor_corrigido || 0)
  return Math.max(0, Math.min(100, Math.floor((corrigido / total) * 100)))
}

// % Atingido de uma Ação (Plano de Ação) — próprio Total Apontado/Valor
// Corrigido da ação, independente do total da divergência.
export function calcularPercentualPlano(plano) {
  const total = Number(plano?.total_apontado || 0)
  if (total <= 0) return 0
  const corrigido = Number(plano?.valor_corrigido || 0)
  return Math.max(0, Math.min(100, Math.floor((corrigido / total) * 100)))
}

const STATUS_PRIORIDADE = { pendente: 0, em_andamento: 1, concluido: 2, validado_auditoria: 3 }

// Status representativo da divergência = o status menos avançado entre as
// ações cadastradas (o "gargalo" que ainda falta resolver). null = sem ação.
export function statusAgregadoAchado(planos) {
  if (!planos || planos.length === 0) return null
  return planos.reduce((pior, p) =>
    (STATUS_PRIORIDADE[p.status] ?? 0) < (STATUS_PRIORIDADE[pior] ?? 0) ? p.status : pior,
    planos[0].status)
}

// Divergência resolvida = todas as ações cadastradas concluídas/validadas.
export function achadoResolvido(planos) {
  return !!planos && planos.length > 0 && planos.every(p => p.status === 'concluido' || p.status === 'validado_auditoria')
}

export function Badge({ map, value, fallback = '—' }) {
  const item = map[value]
  if (!item) return <span className="text-slate-400 text-[10px]">{fallback}</span>
  return (
    <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.cor}`}>
      {item.label}
    </span>
  )
}

// Input de valor em Real — vai assumindo casas decimais e separador de milhar
// conforme o usuário digita (ex: "895690511" digitado vira "8.956.905,11"),
// em vez do <input type="number"> padrão do navegador (que só aceita ponto).
// `value`/`onChange` trabalham com número puro (ou ''), igual ao resto do form.
export function MoedaInput({ value, onChange, placeholder, className }) {
  const display = value === '' || value === null || value === undefined
    ? ''
    : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    onChange(digits ? Number(digits) / 100 : '')
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder || '0,00'}
      className={className}
    />
  )
}

// Barra de % atingido — clicável quando editável, vira um input numérico até
// perder o foco ou apertar Enter, salvando automaticamente. Quando não
// editável (ex: percentual do Ciclo, calculado a partir dos Planos de Ação),
// é só uma barra de leitura.
export function PercentualBar({ value, onSave, editable }) {
  const [editando, setEditando] = useState(false)
  const [valorInput, setValorInput] = useState(value ?? 0)

  useEffect(() => { setValorInput(value ?? 0) }, [value])

  const salvar = () => {
    const v = Math.max(0, Math.min(100, Math.round(Number(valorInput) || 0)))
    setEditando(false)
    if (v !== Number(value ?? 0)) onSave(v)
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          type="number" min="0" max="100" autoFocus
          value={valorInput}
          onChange={e => setValorInput(e.target.value)}
          onBlur={salvar}
          onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
          className="w-14 text-xs p-1 border border-slate-300 rounded-md"
        />
        <span className="text-[10px] text-slate-400">%</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => editable && setEditando(true)}
      disabled={!editable}
      className="flex items-center gap-2 w-full min-w-[100px] disabled:cursor-default"
      title={editable ? 'Clique para alterar' : ''}
    >
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value || 0))}%` }} />
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right shrink-0">{value || 0}%</span>
    </button>
  )
}
