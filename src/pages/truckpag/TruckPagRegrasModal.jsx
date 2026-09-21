import React from 'react'
import { X, CheckCircle2, AlertTriangle, XCircle, Link2 } from 'lucide-react'

// Modal informativo (sem ação nenhuma) explicando a regra de conciliação — aberto pelo botão de
// regras nas 3 telas do módulo. `variante` escolhe qual regra explicar, já que Títulos/Repasses
// usam uma lógica (identidade título × repasse) e a aba Saldo Concessionária usa outra (repasse × crédito
// por valor).
export default function TruckPagRegrasModal({ aberto, onFechar, variante = 'titulos-repasses' }) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onFechar}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {variante === 'repasses-creditos' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Regras — Repasses × Saldo Concessionária</h2>
              <button onClick={onFechar} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs text-slate-600">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <p className="font-bold text-slate-700 mb-1">1. Agrupamento dos repasses</p>
                <p>
                  As linhas do repasse (uma por NF/OS) são agrupadas por <strong>Estabelecimento + Data de
                  Pagamento</strong> — cada grupo representa um depósito bancário só, com o total bruto, a taxa
                  administrativa e o líquido somados.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Link2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-700">2. Vínculo com o saldo</p>
                  <p>
                    O valor líquido total de cada grupo é comparado com o valor dos créditos não identificados —
                    considerados só os que têm algum "Tipo de Saldo" cadastrado batendo com a Observação do
                    crédito. Bate dentro de poucos centavos de tolerância (arredondamento) = vinculado. Cada
                    crédito só pode ser usado uma vez.
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                Os "Tipos de Saldo" cadastrados definem quais créditos entram nessa conferência — configure em
                Configurações. Sem nenhum tipo cadastrado, todos os créditos entram na comparação.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900">Regras de Conciliação — Títulos × Repasses</h2>
              <button onClick={onFechar} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
                <p className="font-bold text-slate-700 mb-1">1. Identidade obrigatória (pra virar candidato)</p>
                <p>
                  <strong>Código da Empresa</strong>, <strong>Parcela</strong> e <strong>CNPJ do Cliente</strong> precisam bater — E pelo menos uma
                  <strong> Nota Fiscal</strong> (Nº NF-e ou Nº NFS-e) em comum entre título e repasse. Se faltar
                  qualquer um desses, o título/repasse não é considerado um candidato.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-700">Identificado</p>
                  <p>Identidade obrigatória bate, e <strong>Valor</strong> e <strong>Saldo</strong> também conferem com o repasse (dentro da tolerância configurada).</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-700">Divergente</p>
                  <p>Identidade obrigatória bate, mas <strong>Valor</strong> ou <strong>Saldo</strong> não conferem (fora da tolerância configurada).</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-700">Não encontrado / Sem título</p>
                  <p>Nenhum repasse (ou título) bate a identidade obrigatória (código + parcela + CNPJ do cliente + nota fiscal).</p>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                A Nota Fiscal do título é conferida contra um conjunto único (Nota Fiscal própria, RPS, NFS-e e o número
                do título), já que a planilha às vezes traz o número de serviço na coluna de peças e vice-versa. A
                diferença máxima aceita entre Valor/Saldo do título e o valor do repasse é a mesma tolerância
                configurável em Configurações → Tolerância de Valor.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
