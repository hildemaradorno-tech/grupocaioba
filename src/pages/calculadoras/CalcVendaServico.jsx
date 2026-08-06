import React, { useState } from 'react'
import { Calculator } from 'lucide-react'

const ISS = 0.05
const PIS_COFINS = 0.0925

function fmt(val) {
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseBR(str) {
  const cleaned = String(str).replace(/\./g, '').replace(',', '.')
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

function MoneyInput({ value, onChange, id }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)

  const handleFocus = () => {
    setRaw(value === 0 ? '' : String(value).replace('.', ','))
    setFocused(true)
  }
  const handleBlur = () => {
    setFocused(false)
    setRaw('')
    onChange(parseBR(raw))
  }
  const handleChange = (e) => {
    const v = e.target.value.replace(/[^0-9,]/g, '')
    setRaw(v)
    onChange(parseBR(v))
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={focused ? raw : fmt(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className="w-full text-right font-mono bg-yellow-50 border border-yellow-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
    />
  )
}

function PercentInput({ value, onChange }) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)

  const handleFocus = () => {
    setRaw(value === 0 ? '' : String(value).replace('.', ','))
    setFocused(true)
  }
  const handleBlur = () => {
    setFocused(false)
    setRaw('')
    onChange(parseBR(raw))
  }
  const handleChange = (e) => {
    const v = e.target.value.replace(/[^0-9,]/g, '')
    setRaw(v)
    onChange(parseBR(v))
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? raw : fmt(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className="w-full text-right font-mono bg-yellow-50 border border-yellow-400 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-yellow-400"
    />
  )
}

function ResultRow({ label, value, highlight, prefix = 'R$' }) {
  return (
    <div className={`flex justify-between items-center px-4 py-2.5 rounded-lg ${highlight || ''}`}>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="font-mono text-sm font-semibold text-slate-800">
        {prefix} {fmt(value)}
      </span>
    </div>
  )
}

export default function CalcVendaServico() {
  const [aba, setAba] = useState('margem')

  // Estado aba: pelo valor de venda
  const [vendaA, setVendaA] = useState(2000)
  const [custoA, setCustoA] = useState(1000)

  // Estado aba: pela margem final
  const [margemB, setMargemB] = useState(30)
  const [custoB, setCustoB] = useState(200)

  // Cálculos aba A
  const issA = vendaA * ISS
  const pisCofinsA = vendaA * PIS_COFINS
  const custoTotalA = custoA + issA + pisCofinsA
  const lucroA = vendaA - custoTotalA
  const margemA = vendaA > 0 ? (lucroA / vendaA) * 100 : 0
  const fatorA = custoA > 0 ? vendaA / custoA : 0

  // Cálculos aba B
  const m = margemB / 100
  const denominador = 1 - ISS - PIS_COFINS - m
  const vendaB = denominador > 0 ? custoB / denominador : 0
  const issB = vendaB * ISS
  const pisCofinsB = vendaB * PIS_COFINS
  const custoTotalB = custoB + issB + pisCofinsB
  const lucroB = vendaB - custoTotalB
  const fatorB = custoB > 0 ? vendaB / custoB : 0

  const tabs = [
    { id: 'margem', label: 'Pela Margem Final' },
    { id: 'venda', label: 'Pelo Valor de Venda' },
  ]

  return (
    <div className="p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Calculator className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-800 uppercase tracking-wide">
            Calculadora — Venda de Serviço Terceiro
          </h1>
          <p className="text-xs text-slate-500">ISS 5% · PIS/COFINS 9,25%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Abas */}
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                aba === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-slate-400 hover:text-slate-600 bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── ABA: PELA MARGEM FINAL ── */}
        {aba === 'margem' && (
          <div className="px-6 py-5 space-y-4">

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-1.5">
                  Margem Final Desejada
                </label>
                <div className="flex items-center gap-2">
                  <PercentInput value={margemB} onChange={setMargemB} />
                  <span className="text-sm font-bold text-slate-500">%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Custo do Serviço (NF)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono shrink-0">R$</span>
                  <MoneyInput value={custoB} onChange={setCustoB} id="custo-b" />
                </div>
              </div>
            </div>

            {/* Valor de Venda resultante — destaque */}
            <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Valor de Venda ao Cliente</p>
                <p className="text-[11px] text-emerald-500 mt-0.5">Calculado com base na margem</p>
              </div>
              <span className="font-mono text-xl font-bold text-emerald-700">R$ {fmt(vendaB)}</span>
            </div>

            {/* Decomposição */}
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              <ResultRow label="(-) ISS — 5%" value={issB} />
              <ResultRow label="(-) PIS/COFINS — 9,25%" value={pisCofinsB} />
              <ResultRow label="(=) Custo Total do Serviço" value={custoTotalB} highlight="bg-slate-50" />
            </div>

            {/* Resultados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Lucro no Serviço</p>
                <p className="font-mono text-lg font-bold text-blue-800 mt-1">R$ {fmt(lucroB)}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-yellow-700 uppercase tracking-wide">Margem de Serviço</p>
                <p className="font-mono text-lg font-bold text-yellow-800 mt-1">{fmt(margemB)}%</p>
              </div>
            </div>

            {/* Fator */}
            <div className="flex justify-end">
              <span className="text-[11px] text-slate-400">Fator (Venda / Custo NF): <strong className="text-slate-500">{fatorB.toFixed(4)}</strong></span>
            </div>
          </div>
        )}

        {/* ── ABA: PELO VALOR DE VENDA ── */}
        {aba === 'venda' && (
          <div className="px-6 py-5 space-y-4">

            {/* Inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Valor de Venda ao Cliente
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono shrink-0">R$</span>
                  <MoneyInput value={vendaA} onChange={setVendaA} id="venda-a" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Custo do Serviço (NF)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono shrink-0">R$</span>
                  <MoneyInput value={custoA} onChange={setCustoA} id="custo-a" />
                </div>
              </div>
            </div>

            {/* Decomposição */}
            <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
              <ResultRow label="(-) ISS — 5%" value={issA} />
              <ResultRow label="(-) PIS/COFINS — 9,25%" value={pisCofinsA} />
              <ResultRow label="(=) Custo Total do Serviço" value={custoTotalA} highlight="bg-slate-50" />
            </div>

            {/* Resultados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Lucro no Serviço</p>
                <p className="font-mono text-lg font-bold text-blue-800 mt-1">R$ {fmt(lucroA)}</p>
              </div>
              <div className="bg-slate-100 rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Margem de Serviço</p>
                <p className="font-mono text-lg font-bold text-slate-800 mt-1">{fmt(margemA)}%</p>
              </div>
            </div>

            {/* Fator */}
            <div className="flex justify-end">
              <span className="text-[11px] text-slate-400">Fator (Venda / Custo NF): <strong className="text-slate-500">{fatorA.toFixed(4)}</strong></span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3">
          <p className="text-[11px] text-slate-400">
            <strong className="text-slate-500">Fórmula:</strong>{' '}
            Venda × (1 − ISS − PIS/COFINS − Margem) = Custo NF
            {' · '}
            <strong className="text-slate-500">Margem</strong> = (Venda − Custo Total) / Venda
          </p>
        </div>

      </div>
    </div>
  )
}
