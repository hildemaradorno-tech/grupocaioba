import React, { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TableProperties, Calculator, ScrollText, Briefcase, Hash, ListChecks, Radio, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessionState } from '../hooks/useSessionState'
import FontesCalculo from './FontesCalculo'
import FontesMicrowork from './FontesMicrowork'
import BasesCalculo from './BasesCalculo'
import PoliticaComissao from './PoliticaComissao'
import CargosRemuneracoes from './CargosRemuneracoes'
import Rubricas from './Rubricas'
import TiposProcesso from './TiposProcesso'

const ABAS = [
  { menuPath: 'fontes-calculo', label: 'Fonte de Cálculo', icon: TableProperties, Componente: FontesCalculo,
    description: 'Cadastre de qual arquivo do SharePoint cada evento de comissão lê seus dados.' },
  { menuPath: 'fontes-microwork', label: 'Fonte MicroWork', icon: Radio, Componente: FontesMicrowork,
    description: 'Cadastre relatórios do MicroWork Cloud (via API) como fonte de dados de comissão.' },
  { menuPath: 'bases-calculo', label: 'Base de Cálculo', icon: Calculator, Componente: BasesCalculo,
    description: 'Defina qual coluna e agregação extraem o valor de cada Fonte de Cálculo.' },
  { menuPath: 'politica-comissao', label: 'Política de Comissões', icon: ScrollText, Componente: PoliticaComissao,
    description: 'Configure as regras de comissão por cargo: fonte e base de cálculo, faixas, vigência e rubrica de pagamento.' },
  { menuPath: 'cargos-remuneracoes', label: 'Cargos e Remunerações', icon: Briefcase, Componente: CargosRemuneracoes,
    description: 'Relatório das políticas salariais por cargo — comissões, ganhos cadastrados e DSR.' },
  { menuPath: 'rubricas', label: 'Rubrica', icon: Hash, Componente: Rubricas,
    description: 'Códigos de rubrica usados no TXT de pagamento (Processamento de Comissões) — selecionáveis em Política de Comissão.' },
  { menuPath: 'tipos-processo', label: 'Tipo de Processo', icon: ListChecks, Componente: TiposProcesso,
    description: 'Códigos de tipo de processo usados no TXT de pagamento (Processamento de Comissões) — selecionáveis em Política de Comissão.' },
]

function InfoAba({ texto }) {
  return (
    <span className="relative inline-flex group">
      <Info className="h-3 w-3 text-slate-400 hover:text-slate-600" />
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {texto}
      </span>
    </span>
  )
}

export default function RegrasComissoes() {
  const { hasPermission } = useAuth()
  const [searchParams] = useSearchParams()
  const abasPermitidas = ABAS.filter(a => hasPermission(a.menuPath))
  const [abaAtivaKey, setAbaAtivaKey] = useSessionState('regras_comissoes_aba', abasPermitidas[0]?.menuPath || '')

  // Só usa ?aba= pra pré-selecionar no primeiro load (sustenta os redirects das rotas antigas,
  // ex: /politica-comissao -> /regras-comissoes?aba=politica-comissao) — depois disso quem manda
  // é o clique nas abas / o que já estava salvo no localStorage.
  useEffect(() => {
    const abaParam = searchParams.get('aba')
    if (abaParam && abasPermitidas.some(a => a.menuPath === abaParam)) setAbaAtivaKey(abaParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abaAtual = abasPermitidas.find(a => a.menuPath === abaAtivaKey) || abasPermitidas[0]
  if (!abaAtual) return null

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 bg-white shrink-0">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Regras de Comissões</h1>
        <p className="text-xs text-slate-500">Defina as regras e políticas de comissionamento por empresa, cargo e tipo de evento.</p>
      </div>
      <div className="flex items-center border-b border-slate-200 bg-white px-6 pt-4 shrink-0 overflow-x-auto">
        {abasPermitidas.map(a => (
          <button
            key={a.menuPath}
            onClick={() => setAbaAtivaKey(a.menuPath)}
            className={`flex items-center gap-1 px-2 py-2 rounded-t-md text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              abaAtual.menuPath === a.menuPath
                ? 'border-blue-600 text-blue-700 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <a.icon className="h-3.5 w-3.5" /> {a.label}
            {a.description && <InfoAba texto={a.description} />}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <abaAtual.Componente />
      </div>
    </div>
  )
}
