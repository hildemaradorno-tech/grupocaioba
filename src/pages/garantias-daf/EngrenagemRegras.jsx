import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings, Activity, FileText, DollarSign } from 'lucide-react'
import RegrasSistemaModal from './RegrasSistemaModal'

// Engrenagem das Regras do Sistema de Garantias DAF — mesmo modelo do menu da Auditoria O.S. Aberta:
// lista suspensa com ícone, título e descrição; cada item abre só as regras daquela aba.
// Usada no Dashboard e no Controle de todas as abas. onSalvo recebe a configuração gravada.
const ITENS = [
  { key: 'oficina',    icon: Activity,   cor: 'text-orange-600',  label: 'Regras — Na Oficina',        desc: 'Dias na Oficina' },
  { key: 'garantista', icon: FileText,   cor: 'text-indigo-600',  label: 'Regras — Com Garantista',    desc: 'Digitação, prazo de solução e recusa' },
  { key: 'titulos',    icon: DollarSign, cor: 'text-emerald-600', label: 'Regras — Títulos a Receber', desc: 'Dias para envio da NF' },
]

export default function EngrenagemRegras({ usuario, onSalvo, tiposExtras }) {
  const [aberto, setAberto] = useState(false)
  const [aba, setAba] = useState(null)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(v => !v)}
        aria-label="Regras do sistema"
        title="Regras do sistema"
        className={`flex items-center justify-center p-1.5 rounded-md text-white shadow-sm transition-colors ${aberto ? 'bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'}`}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {aberto && (
        <>
          {/* clique fora fecha */}
          <div className="fixed inset-0 z-30" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-lg border border-slate-200 bg-white shadow-xl py-1">
            {ITENS.map(it => (
              <button
                key={it.key}
                type="button"
                onClick={() => { setAberto(false); setAba(it.key) }}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <it.icon className={`h-4 w-4 mt-0.5 shrink-0 ${it.cor}`} />
                <span className="leading-tight flex-1">
                  <span className="block text-xs font-semibold text-slate-800">{it.label}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">{it.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Portal: a engrenagem fica dentro do cabeçalho (z-10); a janela vai para o body para ficar por cima de tudo */}
      {aba && createPortal(
        <RegrasSistemaModal
          abaInicial={aba}
          somenteAba
          usuario={usuario}
          tiposExtras={tiposExtras}
          onClose={() => setAba(null)}
          onSalvo={onSalvo}
        />,
        document.body
      )}
    </div>
  )
}
