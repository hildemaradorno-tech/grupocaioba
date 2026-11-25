import React, { useRef, useState } from 'react'
import { Settings, X, Loader2, Activity, FileText, DollarSign } from 'lucide-react'
import RegrasSistemaModal from './RegrasSistemaModal'
import MetaTempoAbertoModal from './MetaTempoAbertoModal'
import MetasGarantiaModal from './MetasGarantiaModal'

// Janela única "Regras e Metas" de Garantias DAF (25/11/2026, pedido do usuário): a engrenagem abre direto esta
// janela, com uma aba por tela. Cada aba junta os prazos (Regras) e as metas daquela tela:
//   Na Oficina        → prazos (dias na oficina)
//   Com Garantista    → prazos (digitação, solução, recusa, cores) + metas do Dashboard (Tempo e Recusas)
//                       + metas da Matriz de KPIs (digitação atrasada, aguardando DAF, aprovada s/ fat., recusadas)
//   Títulos a Receber → prazos (envio da NF) + meta da Matriz (a receber vencidas)
// As partes ficam montadas o tempo todo (trocar de aba não perde o que foi digitado); um Salvar grava tudo.
const ABAS = [
  { key: 'oficina', label: 'Na Oficina', icon: Activity },
  { key: 'garantista', label: 'Com Garantista', icon: FileText },
  { key: 'titulos', label: 'Títulos a Receber', icon: DollarSign },
]

function Secao({ titulo, descricao, children }) {
  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <p className="text-xs font-bold uppercase text-slate-800">{titulo}</p>
      {descricao && <p className="mt-0.5 mb-3 text-[11px] text-slate-500 leading-relaxed">{descricao}</p>}
      {children}
    </section>
  )
}

export default function RegrasMetasGarantiasModal({ usuario, tiposExtras, abaInicial = 'garantista', onClose, onSalvo, onMetaSalva }) {
  const [aba, setAba] = useState(abaInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  // Funções de gravação entregues por cada parte (registrarSalvar)
  const gravadores = useRef({})
  const registrar = (nome) => (fn) => { gravadores.current[nome] = fn }

  const salvar = async () => {
    setSalvando(true); setErro(null)
    let etapa = 'regras'
    try {
      const regras = await gravadores.current.regras?.()
      if (regras) onSalvo?.(regras.cfg, regras.meses) // já gravadas: a tela aplica mesmo se uma meta falhar
      for (const nome of ['metasDashboard', 'metasMatrizGarantista', 'metasMatrizTitulos']) {
        etapa = nome
        await gravadores.current[nome]?.()
      }
      onMetaSalva?.()
      onClose()
    } catch (err) {
      setErro(err.message || String(err))
      // Erro numa meta: leva para a aba onde ela está
      if (etapa === 'metasMatrizTitulos') setAba('titulos')
      else if (etapa !== 'regras') setAba('garantista')
    } finally {
      setSalvando(false)
    }
  }

  const visivel = (k) => (aba === k ? '' : 'hidden')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-slate-500" /> Regras e Metas — Garantias DAF
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 mb-3">
          {ABAS.map(a => {
            const Icon = a.icon
            return (
              <button key={a.key} type="button" onClick={() => setAba(a.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
                  aba === a.key ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-white'
                }`}>
                <Icon className="h-3.5 w-3.5" /> {a.label}
              </button>
            )
          })}
        </div>

        {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}

        <div className="overflow-y-auto pr-1 -mr-1 space-y-4">
          {/* Prazos: uma parte só para as 3 abas (mesma configuração), mostra a aba escolhida */}
          <Secao titulo="Prazos (regras)" descricao="Dias que decidem o que está no prazo, atrasado ou fora do prazo nas telas e nos indicadores.">
            <RegrasSistemaModal embutido somenteAba abaInicial={aba} usuario={usuario} tiposExtras={tiposExtras} registrarSalvar={registrar('regras')} />
          </Secao>

          <div className={`space-y-4 ${visivel('garantista')}`}>
            <Secao titulo="Metas dos indicadores do Dashboard" descricao="Tempo de garantia em aberto (dias) e Recusas de garantia (%), por mês e anual.">
              <MetaTempoAbertoModal embutido usuario={usuario} registrarSalvar={registrar('metasDashboard')} />
            </Secao>
            <Secao titulo="Metas da Matriz de KPIs (Setor Garantia)" descricao="Quantidade máxima de O.S. em cada indicador do quadro SETOR GARANTIA da Matriz, por empresa e mês.">
              <MetasGarantiaModal embutido usuario={usuario} indicadores={['digitacaoAtrasada', 'aguardandoForaPrazo', 'aprovadaSemFaturamento', 'recusadaForaPrazo']}
                registrarSalvar={registrar('metasMatrizGarantista')} />
            </Secao>
          </div>

          <div className={visivel('titulos')}>
            <Secao titulo="Metas da Matriz de KPIs (Setor Garantia)" descricao="Quantidade máxima de títulos de garantia a receber vencidos, por empresa e mês.">
              <MetasGarantiaModal embutido usuario={usuario} indicadores={['titulosVencidos']} registrarSalvar={registrar('metasMatrizTitulos')} />
            </Secao>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
            {salvando && <Loader2 className="h-3 w-3 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
