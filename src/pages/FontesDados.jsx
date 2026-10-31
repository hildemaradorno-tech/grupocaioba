import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { TableProperties } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import FontesCalculo from './FontesCalculo'
import FontesMicrowork from './FontesMicrowork'

// Fonte de Dados (menu Comissões → Regras de Comissões): Dealer.net (arquivos do SharePoint) e MicroWork
// (relatórios via API) numa tela só, em abas. Cada aba segue a permissão que já existia
// (fontes-calculo / fontes-microwork). A aba aberta fica na URL (?aba=microwork).
const ABAS = [
  { id: 'dealernet', label: 'Dealer.net', permissao: 'fontes-calculo', Tela: FontesCalculo },
  { id: 'microwork', label: 'MicroWork', permissao: 'fontes-microwork', Tela: FontesMicrowork },
]

export default function FontesDados() {
  const { hasPermission } = useAuth()
  const [params, setParams] = useSearchParams()
  const abas = ABAS.filter(a => hasPermission(a.permissao))
  const atual = abas.find(a => a.id === params.get('aba')) || abas[0]

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <TableProperties className="h-5 w-5 text-blue-600" />
          Fonte de Dados
        </h1>
        <p className="text-xs text-slate-500">De onde as Bases de Cálculo leem os dados: arquivos do Dealer.net (SharePoint) e relatórios do MicroWork Cloud.</p>
      </div>

      {abas.length === 0 ? (
        <p className="text-xs text-slate-500">Sem acesso às fontes de dados.</p>
      ) : (
        <>
          <div className="flex gap-1 border-b border-slate-200">
            {abas.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => setParams({ aba: a.id }, { replace: true })}
                className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                  atual.id === a.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <atual.Tela embutido />
        </>
      )}
    </div>
  )
}
