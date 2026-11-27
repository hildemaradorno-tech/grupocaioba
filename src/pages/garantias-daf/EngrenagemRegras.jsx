import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings, Target, Database } from 'lucide-react'
import RegrasMetasGarantiasModal from './RegrasMetasGarantiasModal'
import FontesGarantiasModal from './FontesGarantiasModal'

// Engrenagem da Garantias DAF — menu suspenso (mesmo modelo do menu da Auditoria O.S. Aberta), com:
//   • Regras e Metas — Garantias DAF: janela única com uma aba por tela (Na Oficina, Com Garantista, Títulos a
//     Receber), juntando os prazos e as metas daquela tela (inclusive as que vão para a Matriz de KPIs).
//   • Fontes de dados: arquivos do SharePoint usados, pasta e data da última atualização (só consulta).
// Usada no Dashboard e no Controle de todas as abas. onSalvo recebe a configuração gravada; onMetaSalva, metas.
// abaInicial (opcional): aba da janela de regras que abre primeiro ('oficina' | 'garantista' | 'titulos').
const ITENS = [
  { key: 'fontes', icon: Database, cor: 'text-sky-600',    label: 'Fontes de dados',                desc: 'Arquivos do SharePoint usados, pasta e data da última atualização' },
  { key: 'regras', icon: Target,   cor: 'text-orange-600', label: 'Regras e Metas — Garantias DAF', desc: 'Prazos e metas de cada aba (Na Oficina, Com Garantista, Títulos a Receber)' },
]

export default function EngrenagemRegras({ usuario, onSalvo, tiposExtras, onMetaSalva, abaInicial = 'garantista' }) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [janela, setJanela] = useState(null) // null | 'regras' | 'fontes'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuAberto(v => !v)}
        aria-label="Regras, metas e fontes"
        title="Regras, metas e fontes"
        className={`flex items-center justify-center p-1.5 rounded-md text-white shadow-sm transition-colors ${menuAberto ? 'bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'}`}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {menuAberto && (
        <>
          {/* clique fora fecha */}
          <div className="fixed inset-0 z-30" onClick={() => setMenuAberto(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-40 w-72 rounded-lg border border-slate-200 bg-white shadow-xl py-1">
            {ITENS.map(it => (
              <button
                key={it.key}
                type="button"
                onClick={() => { setMenuAberto(false); setJanela(it.key) }}
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
      {janela === 'regras' && createPortal(
        <RegrasMetasGarantiasModal
          usuario={usuario}
          tiposExtras={tiposExtras}
          abaInicial={abaInicial}
          onClose={() => setJanela(null)}
          onSalvo={onSalvo}
          onMetaSalva={onMetaSalva}
        />,
        document.body
      )}
      {janela === 'fontes' && createPortal(<FontesGarantiasModal onClose={() => setJanela(null)} />, document.body)}
    </div>
  )
}
