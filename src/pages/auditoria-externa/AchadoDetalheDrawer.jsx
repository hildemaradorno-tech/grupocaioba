import React, { useState } from 'react'
import { X, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import EvidenciaUploader from './EvidenciaUploader'
import { fmtMoeda } from './auditExtConstants'

function DiagnosticoIA({ achado }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState(null)

  const gerar = async () => {
    setAberto(true)
    setCarregando(true)
    setErro(null)
    try {
      const r = await apiService.diagnosticoAuditIA({ achado })
      setResultado(r)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="border-t border-slate-100 pt-4">
      <button
        onClick={gerar}
        className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
      >
        <Sparkles className="h-3 w-3" /> Diagnóstico IA
      </button>
      {aberto && (
        <div className="mt-2 bg-indigo-50/60 border border-indigo-200 rounded-md p-3 text-[11px] space-y-2">
          {carregando && (
            <div className="flex items-center gap-1.5 text-indigo-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando diagnóstico...</div>
          )}
          {erro && <div className="text-rose-700">{erro}</div>}
          {resultado && (
            <>
              <div>
                <p className="font-bold text-indigo-800 uppercase text-[10px] tracking-wide">Causa Raiz Provável</p>
                <p className="text-slate-700 mt-0.5">{resultado.causa_raiz}</p>
              </div>
              <div>
                <p className="font-bold text-indigo-800 uppercase text-[10px] tracking-wide">Minuta do Lançamento Contábil</p>
                <div className="text-slate-700 mt-0.5 bg-white rounded border border-indigo-100 p-2 space-y-0.5">
                  <p><strong>Débito:</strong> {resultado.lancamento_contabil?.debito}</p>
                  <p><strong>Crédito:</strong> {resultado.lancamento_contabil?.credito}</p>
                  <p><strong>Histórico:</strong> {resultado.lancamento_contabil?.historico}</p>
                </div>
              </div>
              <div>
                <p className="font-bold text-indigo-800 uppercase text-[10px] tracking-wide">Rascunho da Devolutiva</p>
                <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">{resultado.rascunho_devolutiva}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function AchadoDetalheDrawer({ achado, onClose }) {
  const { hasActionOrDefault } = useAuth()
  const canUsarIA = hasActionOrDefault('auditoria-externa/divergencias', 'usar_diagnostico_ia')

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-3xl max-h-[85vh] shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400">{achado.numero_codigo}</span>
            <h2 className="text-base font-bold text-slate-900">{achado.titulo}</h2>
            <p className="text-[11px] text-slate-500">
              {achado.audext_ciclos?.proj_empresas?.nome || '—'} · {achado.audext_ciclos?.periodo_competencia || '—'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-md shrink-0"><X className="h-4 w-4 text-slate-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {achado.motivo && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Motivo</p>
                <p className="text-slate-700">{achado.motivo}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fundamentação Técnica</p>
              <p className="text-slate-700">{achado.fundamentacao_tecnica || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Apontado</p>
              <p className="text-slate-900 font-bold text-sm">{fmtMoeda(achado.total_apontado)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Valor Corrigido</p>
              <p className="text-emerald-700 font-bold text-sm">{fmtMoeda(achado.valor_corrigido)}</p>
            </div>
            {achado.audext_impactos?.nome && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Impacto</p>
                <p className="text-slate-700">{achado.audext_impactos.nome}</p>
              </div>
            )}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Fatos Apontados</p>
                {achado.fatos_apontados
                  ? <div className="rich-html text-slate-700" dangerouslySetInnerHTML={{ __html: achado.fatos_apontados }} />
                  : <p className="text-slate-700">—</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Recomendações</p>
                {achado.recomendacoes
                  ? <div className="rich-html text-slate-700" dangerouslySetInnerHTML={{ __html: achado.recomendacoes }} />
                  : <p className="text-slate-700">—</p>}
              </div>
            </div>
            {achado.evidencias && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Evidências</p>
                <p className="text-slate-700 whitespace-pre-wrap">{achado.evidencias}</p>
              </div>
            )}
            {achado.evidencias_imagens_urls?.length > 0 && (
              <div className="col-span-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Imagens de Evidência</p>
                <EvidenciaUploader pastaId={achado.id} urls={achado.evidencias_imagens_urls} onChange={() => {}} readOnly />
              </div>
            )}
          </div>

          {canUsarIA && <DiagnosticoIA achado={achado} />}
        </div>
      </div>
    </div>
  )
}
