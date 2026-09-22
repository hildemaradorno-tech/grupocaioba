import React, { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Palmtree, Wallet, PhoneCall, ClipboardCheck, BarChart2, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessionState } from '../hooks/useSessionState'
import { FeriasStatusProvider, useFeriasStatus } from '../context/FeriasStatusContext'
import Ferias from './Ferias'
import CalculoComissoes from './CalculoComissoes'
import SobreavisoPlantao from './SobreavisoPlantao'
import HistoricoComissoes from './HistoricoComissoes'

// Duplicata de Cálculo de Comissões pro agrupamento Caiobá Motos — mesmo componente (a lógica de
// lote/departamento/PDF é idêntica), só troca o agrupamento de empresas que alimenta a aba de
// Empresa (ver prop agrupamentoNome em CalculoComissoes.jsx). Referência de módulo estável, pra
// não recriar o componente a cada render do array ABAS.
const CalculoComissoesMotos = () => <CalculoComissoes agrupamentoNome="Caiobá Motos" />

// Abas onde faz sentido mostrar o status de Férias (só as duas telas que o calculam/usam).
const ABAS_COM_FERIAS = new Set(['calculo-comissoes', 'calculo-comissoes-motos'])

// "key" identifica a aba (seleção/URL); "menuPath" é a permissão que libera ela — Cálculo de
// Comissões e sua duplicata de Motos compartilham a mesma permissão (a separação de quem vê o
// quê já é feita pelas 5 dimensões de escopo de Grupos de Acesso → Empresa, não por aba aqui).
// Ordem confirmada com o usuário: Férias -> Sobreaviso/Plantão -> Cálculo de Comissões -> Cálculo
// de Comissões (Motos) -> Processamento de Comissões (por último).
const ABAS = [
  { key: 'ferias', menuPath: 'ferias', label: 'Férias', icon: Palmtree, Componente: Ferias },
  { key: 'sobreaviso-plantao', menuPath: 'sobreaviso-plantao', label: 'Sobreaviso/Plantão', icon: PhoneCall, Componente: SobreavisoPlantao },
  { key: 'calculo-comissoes', menuPath: 'calculo-comissoes', label: 'Comissões - DAF', icon: Wallet, Componente: CalculoComissoes },
  { key: 'calculo-comissoes-motos', menuPath: 'calculo-comissoes', label: 'Comissões - HONDA', icon: Wallet, Componente: CalculoComissoesMotos },
  { key: 'processamento-comissoes', menuPath: 'processamento-comissoes', label: 'Processamento de Comissões', icon: ClipboardCheck, Componente: HistoricoComissoes },
]

// Botão "Atualizar Férias"/"Férias Atualizadas" — a aba ativa (uma das de Cálculo de Comissões)
// publica o status em FeriasStatusContext; aqui só lê e mostra, na mesma linha do título.
function BotaoStatusFerias() {
  const navigate = useNavigate()
  const { status } = useFeriasStatus()
  if (status.desatualizada) {
    return (
      <button
        onClick={() => navigate('/ferias')}
        title="A data de modificação do arquivo de férias não é do mês do período selecionado — atualize antes de calcular (Calcular Comissões fica bloqueado até lá)"
        className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 px-3 py-2 rounded-md transition-colors"
      >
        <RefreshCw className="h-4 w-4" /> Atualizar Férias
      </button>
    )
  }
  if (status.atualizada) {
    return (
      <button
        onClick={() => navigate('/ferias')}
        title="O arquivo de férias já está atualizado com o mês do período selecionado"
        className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3 py-2 rounded-md transition-colors"
      >
        <CheckCircle2 className="h-4 w-4" /> Férias Atualizadas
      </button>
    )
  }
  return null
}

function FolhaPagamentoDafConteudo() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const abasPermitidas = ABAS.filter(a => hasPermission(a.menuPath))
  const [abaAtivaKey, setAbaAtivaKey] = useSessionState('folha_daf_aba', abasPermitidas[0]?.key || '')

  // Só usa ?aba= pra pré-selecionar no primeiro load (sustenta os redirects das rotas antigas,
  // ex: /processamento-comissoes -> /folha-pagamento-daf?aba=processamento-comissoes) — depois
  // disso quem manda é o clique nas abas / o que já estava salvo no localStorage.
  useEffect(() => {
    const abaParam = searchParams.get('aba')
    if (abaParam && abasPermitidas.some(a => a.key === abaParam)) setAbaAtivaKey(abaParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abaAtual = abasPermitidas.find(a => a.key === abaAtivaKey) || abasPermitidas[0]
  if (!abaAtual) return null

  return (
    <div className="h-full flex flex-col relative">
      {abaAtual.key === 'processamento-comissoes' && hasPermission('bi/comissoes') && (
        <button
          onClick={() => navigate('/bi/comissoes')}
          className="absolute top-4 right-4 z-10 shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors"
        >
          <BarChart2 className="h-3.5 w-3.5 text-indigo-500" /> Ir para Dashboard
        </button>
      )}
      <div className="px-6 pt-6 bg-white shrink-0 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Wallet className="h-5 w-5 text-blue-600" />
          Comissões Pós-Vendas
        </h1>
        {ABAS_COM_FERIAS.has(abaAtual.key) && <BotaoStatusFerias />}
      </div>
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-6 pt-4 shrink-0 overflow-x-auto">
        {abasPermitidas.map(a => (
          <button
            key={a.key}
            onClick={() => setAbaAtivaKey(a.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-md text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              abaAtual.key === a.key
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <a.icon className="h-3.5 w-3.5" /> {a.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <abaAtual.Componente />
      </div>
    </div>
  )
}

export default function FolhaPagamentoDaf() {
  return (
    <FeriasStatusProvider>
      <FolhaPagamentoDafConteudo />
    </FeriasStatusProvider>
  )
}
