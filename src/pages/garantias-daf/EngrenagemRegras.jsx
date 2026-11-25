import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Settings } from 'lucide-react'
import RegrasMetasGarantiasModal from './RegrasMetasGarantiasModal'

// Engrenagem das Regras do Sistema de Garantias DAF. Desde 25/11/2026 (pedido do usuário) abre direto a janela única
// "Regras e Metas", com uma aba por tela (Na Oficina, Com Garantista, Títulos a Receber) — cada aba junta os prazos
// e as metas daquela tela (inclusive as que vão para a Matriz de KPIs). Antes era uma lista com 5 itens separados.
// Usada no Dashboard e no Controle de todas as abas. onSalvo recebe a configuração gravada; onMetaSalva, metas.
// abaInicial (opcional): aba da janela que abre primeiro ('oficina' | 'garantista' | 'titulos').
export default function EngrenagemRegras({ usuario, onSalvo, tiposExtras, onMetaSalva, abaInicial = 'garantista' }) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label="Regras e metas"
        title="Regras e metas"
        className={`flex items-center justify-center p-1.5 rounded-md text-white shadow-sm transition-colors ${aberto ? 'bg-orange-600' : 'bg-orange-500 hover:bg-orange-600'}`}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {/* Portal: a engrenagem fica dentro do cabeçalho (z-10); a janela vai para o body para ficar por cima de tudo */}
      {aberto && createPortal(
        <RegrasMetasGarantiasModal
          usuario={usuario}
          tiposExtras={tiposExtras}
          abaInicial={abaInicial}
          onClose={() => setAberto(false)}
          onSalvo={onSalvo}
          onMetaSalva={onMetaSalva}
        />,
        document.body
      )}
    </div>
  )
}
