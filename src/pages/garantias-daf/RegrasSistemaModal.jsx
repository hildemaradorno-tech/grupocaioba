import React, { useEffect, useMemo, useState } from 'react'
import { Settings, X, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'

// Regras do Sistema de Garantias DAF (gar_configuracoes, registro único). Usada pela engrenagem de
// todas as abas de Controle. onSalvo recebe a configuração gravada, para a tela aplicar na hora.
// tiposExtras: Map sigla → descrição de tipos que só existem nas garantias (fora do cadastro).
export default function RegrasSistemaModal({ onClose, onSalvo, usuario, tiposExtras }) {
  const [carregando, setCarregando] = useState(true)
  const [tiposDim, setTiposDim] = useState([])
  const [diasOficinaInput, setDiasOficinaInput] = useState('14')
  const [diasDigitacaoInput, setDiasDigitacaoInput] = useState('14')
  const [diasSolucao, setDiasSolucao] = useState(14)
  const [diasRecusaInput, setDiasRecusaInput] = useState('15')
  const [diasSolucaoPorTipoInput, setDiasSolucaoPorTipoInput] = useState({})
  const [selecionadosTipos, setSelecionadosTipos] = useState(new Set())
  const [valorAplicarTipos, setValorAplicarTipos] = useState('14')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    Promise.all([
      apiService.getConfiguracoesGarantias().catch(() => null),
      apiService.getTiposOS().catch(() => []),
    ]).then(([cfg, tipos]) => {
      setDiasOficinaInput(String(cfg?.dias_oficina ?? 14))
      setDiasDigitacaoInput(String(cfg?.dias_digitacao ?? 14))
      setDiasSolucao(cfg?.dias_solucao ?? 14)
      setDiasRecusaInput(String(cfg?.dias_recusa ?? 15))
      const porTipo = cfg?.dias_solucao_por_tipo ?? {}
      setDiasSolucaoPorTipoInput(Object.fromEntries(Object.entries(porTipo).map(([k, v]) => [k, String(v)])))
      setTiposDim(tipos.filter(t => t.classificacao === 'Garantia' && t.sigla))
    }).finally(() => setCarregando(false))
  }, [])

  // Todos os tipos de garantia do cadastro de Tipos de OS + os que só existem nas garantias.
  const tipos = useMemo(() => {
    const map = new Map()
    for (const t of tiposDim) {
      const sigla = String(t.sigla).trim().toUpperCase()
      if (!map.has(sigla)) map.set(sigla, t.tipo_os || sigla)
    }
    for (const [sigla, descricao] of (tiposExtras || new Map())) {
      if (!map.has(sigla)) map.set(sigla, descricao)
    }
    return Array.from(map, ([sigla, descricao]) => ({ sigla, descricao }))
      .sort((a, b) => a.sigla.localeCompare(b.sigla, 'pt-BR'))
  }, [tiposDim, tiposExtras])

  const toggleSelecionado = (sigla) => setSelecionadosTipos(prev => {
    const next = new Set(prev)
    if (next.has(sigla)) next.delete(sigla)
    else next.add(sigla)
    return next
  })

  const aplicarAosSelecionados = () => {
    const n = Number(valorAplicarTipos)
    if (!Number.isFinite(n) || n <= 0) return
    setDiasSolucaoPorTipoInput(prev => {
      const next = { ...prev }
      for (const sigla of selecionadosTipos) next[sigla] = String(n)
      return next
    })
  }

  const salvar = async () => {
    const dias = Number(diasDigitacaoInput)
    const diasOfi = Number(diasOficinaInput)
    const diasRec = Number(diasRecusaInput)
    if ([dias, diasOfi, diasRec].some(n => !Number.isFinite(n) || n <= 0)) {
      setErro('Informe números de dias válidos (maiores que zero).')
      return
    }
    const porTipo = {}
    for (const [sigla, v] of Object.entries(diasSolucaoPorTipoInput)) {
      const n = Number(v)
      if (v !== '' && v != null && Number.isFinite(n) && n > 0) porTipo[sigla] = n
    }
    setSalvando(true); setErro(null)
    try {
      const cfg = { dias_digitacao: dias, dias_oficina: diasOfi, dias_solucao: diasSolucao, dias_solucao_por_tipo: porTipo, dias_recusa: diasRec }
      await apiService.updateConfiguracoesGarantias(cfg, usuario)
      onSalvo?.(cfg)
      onClose()
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const campoCls = 'text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const lblCls = 'text-[10px] font-bold text-slate-400 uppercase'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-slate-500" /> Regras do Sistema
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {carregando ? (
          <p className="flex items-center gap-2 text-xs text-slate-400 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Carregando regras...</p>
        ) : (
          <>
            {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias na Oficina</label>
              <input type="number" min="1" value={diasOficinaInput} onChange={e => setDiasOficinaInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Contado da data de criação da OS — controla o card "Mais de N Dias na Oficina" da aba Na Oficina.
              </p>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias para Digitação</label>
              <input type="number" min="1" value={diasDigitacaoInput} onChange={e => setDiasDigitacaoInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                D = dia em que a OS foi fechada.
                {Number(diasDigitacaoInput) > 0 && (
                  <>
                    <br />• <strong>A Digitar</strong>: de D até D+{Number(diasDigitacaoInput)}
                    <br />• <strong>Digitação Atrasada</strong>: a partir de D+{Number(diasDigitacaoInput) + 1}
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias para Tratar Recusa</label>
              <input type="number" min="1" value={diasRecusaInput} onChange={e => setDiasRecusaInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Contado da Data Final Avaliação (dia em que a DAF recusou) — controla o card Recusas no Controle e no Dashboard.
                {Number(diasRecusaInput) > 0 && (
                  <>
                    <br />• <strong>No prazo</strong>: até {Number(diasRecusaInput)} dia{Number(diasRecusaInput) === 1 ? '' : 's'}
                    <br />• <strong>Fora do prazo</strong>: a partir de {Number(diasRecusaInput) + 1} dias
                  </>
                )}
              </p>
            </div>
            {tipos.length > 0 && (
              <div className="flex flex-col gap-1 mb-5">
                <label className={lblCls}>Dias para Solucionar por Tipo de OS</label>
                <div className="flex items-center gap-2 mt-1 mb-1.5">
                  <input type="number" min="1" value={valorAplicarTipos} onChange={e => setValorAplicarTipos(e.target.value)}
                    className="w-16 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                  <button type="button" onClick={aplicarAosSelecionados} disabled={selecionadosTipos.size === 0}
                    className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Aplicar aos selecionados ({selecionadosTipos.size})
                  </button>
                </div>
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {tipos.map(({ sigla, descricao }) => (
                    <div key={sigla} className="flex items-center gap-2">
                      <input type="checkbox" checked={selecionadosTipos.has(sigla)} onChange={() => toggleSelecionado(sigla)} className="shrink-0" />
                      <span className="flex-1 text-[11px] text-slate-600 truncate" title={descricao}>{descricao}</span>
                      <input type="number" min="1" placeholder={String(diasSolucao)}
                        value={diasSolucaoPorTipoInput[sigla] ?? ''}
                        onChange={e => setDiasSolucaoPorTipoInput(prev => ({ ...prev, [sigla]: e.target.value }))}
                        className="w-16 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={salvando}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || carregando}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
            {salvando && <Loader2 className="h-3 w-3 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
