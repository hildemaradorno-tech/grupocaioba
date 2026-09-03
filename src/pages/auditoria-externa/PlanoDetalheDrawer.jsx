import React from 'react'
import { X, User, Clock } from 'lucide-react'
import { fmtData, fmtMoeda, STATUS_PLANO_MAP, Badge, calcularPercentualPlano } from './auditExtConstants'

export default function PlanoDetalheDrawer({ plano, achado, onClose }) {
  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-2xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">{achado?.numero_codigo}</span>
            <h2 className="text-base font-bold text-slate-900">{achado?.titulo}</h2>
            <p className="text-[11px] text-slate-500">Ação de {plano.audext_tipos_acao?.nome || 'tipo não definido'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-md shrink-0"><X className="h-4 w-4 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Tipo de Ação Tomada</p>
              <p className="text-slate-700">{plano.audext_tipos_acao?.nome || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Empresa</p>
              <p className="text-slate-700">{plano.dim_empresas?.empresa_fantasia || plano.dim_empresas?.nome_empresa || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Departamento</p>
              <p className="text-slate-700">{plano.proj_departamentos?.nome || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Responsável</p>
              {plano.proj_responsaveis?.nome
                ? <p className="flex items-center gap-1 text-slate-700"><User className="h-3 w-3" /> {plano.proj_responsaveis.nome}</p>
                : <p className="text-slate-700">—</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prazo Limite</p>
              {plano.prazo_limite
                ? <p className="flex items-center gap-1 text-slate-700"><Clock className="h-3 w-3" /> {fmtData(plano.prazo_limite)}</p>
                : <p className="text-slate-700">—</p>}
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Causa Raiz Apurada</p>
              {plano.causa_raiz
                ? <div className="rich-html text-slate-700" dangerouslySetInnerHTML={{ __html: plano.causa_raiz }} />
                : <p className="text-slate-700">—</p>}
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Ação Corretiva / Preventiva</p>
              {plano.acao_proposta
                ? <div className="rich-html text-slate-700" dangerouslySetInnerHTML={{ __html: plano.acao_proposta }} />
                : <p className="text-slate-700">—</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Apontado</p>
              <p className="text-slate-900 font-bold text-sm">{fmtMoeda(plano.total_apontado)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Valor Corrigido</p>
              <p className="text-emerald-700 font-bold text-sm">{fmtMoeda(plano.valor_corrigido)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status / % Atingido</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge map={STATUS_PLANO_MAP} value={plano.status} />
                <span className="text-[11px] font-bold text-slate-500">{calcularPercentualPlano(plano)}%</span>
              </div>
            </div>
            {plano.validado_em && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Validado pela Auditoria</p>
                <p className="text-slate-700">{fmtData(plano.validado_em.slice(0, 10))} · {plano.validado_por || '—'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
