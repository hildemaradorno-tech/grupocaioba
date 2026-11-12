import React, { useEffect, useMemo, useState } from 'react'
import { Settings, X, Loader2, Activity, FileText, DollarSign } from 'lucide-react'
import { apiService } from '../../services/api'

// Menus da engrenagem: cada aba de Garantias DAF com as regras que ela usa
const ABAS_REGRAS = [
  { key: 'oficina', label: 'Na Oficina', icon: Activity },
  { key: 'garantista', label: 'Com Garantista', icon: FileText },
  { key: 'titulos', label: 'Títulos a Receber', icon: DollarSign },
]

// Regras do Sistema de Garantias DAF (gar_configuracoes, registro único). Usada pela engrenagem de
// todas as abas de Controle. onSalvo recebe a configuração gravada, para a tela aplicar na hora.
// tiposExtras: Map sigla → descrição de tipos que só existem nas garantias (fora do cadastro).
// abaInicial: 'oficina' | 'garantista' | 'titulos' — abre no menu da aba de onde a engrenagem foi clicada
// somenteAba: aberta por um item da engrenagem — mostra só as regras daquela aba, sem os menus no topo
export default function RegrasSistemaModal({ onClose, onSalvo, usuario, tiposExtras, abaInicial, somenteAba = false }) {
  const [aba, setAba] = useState(ABAS_REGRAS.some(a => a.key === abaInicial) ? abaInicial : 'oficina')
  const [carregando, setCarregando] = useState(true)
  const [tiposDim, setTiposDim] = useState([])
  const [diasOficinaInput, setDiasOficinaInput] = useState('14')
  const [diasDigitacaoInput, setDiasDigitacaoInput] = useState('14')
  const [diasSolucao, setDiasSolucao] = useState(14)
  const [diasRecusaInput, setDiasRecusaInput] = useState('15')
  // "Dias para Envio da NF" (card NF sem envio). temColunaNf: a coluna dias_nf_envio já existe no banco —
  // sem ela o campo fica só leitura e não é enviado ao salvar (senão o update falharia).
  const [diasNfInput, setDiasNfInput] = useState('4')
  const [temColunaNf, setTemColunaNf] = useState(false)
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
      setTemColunaNf(!!cfg && 'dias_nf_envio' in cfg)
      setDiasNfInput(String(cfg?.dias_nf_envio ?? 4))
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
    const diasNf = Number(diasNfInput)
    if ([dias, diasOfi, diasRec, ...(temColunaNf ? [diasNf] : [])].some(n => !Number.isFinite(n) || n <= 0)) {
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
      const cfg = { dias_digitacao: dias, dias_oficina: diasOfi, dias_solucao: diasSolucao, dias_solucao_por_tipo: porTipo, dias_recusa: diasRec, ...(temColunaNf ? { dias_nf_envio: diasNf } : {}) }
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
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Settings className="h-4 w-4 text-slate-500" /> Regras do Sistema
            {somenteAba && <span className="font-semibold text-slate-500">— {ABAS_REGRAS.find(a => a.key === aba)?.label}</span>}
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
            {/* Um menu por aba — cada um mostra só as regras que aquela aba usa */}
            {!somenteAba && <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 mb-4">
              {ABAS_REGRAS.map(a => {
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
            </div>}
            {aba === 'oficina' && (
            <div className="flex flex-col gap-1 mb-4">
              <label className={lblCls}>Dias na Oficina</label>
              <input type="number" min="1" value={diasOficinaInput} onChange={e => setDiasOficinaInput(e.target.value)} className={campoCls} />
              <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                Contado da data de criação da OS — controla o card "Mais de N Dias na Oficina" da aba Na Oficina.
              </p>
            </div>
            )}
            {aba === 'garantista' && (<>
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
            </>)}
            {aba === 'titulos' && (
              <div className="mb-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <label className={lblCls}>Dias para Envio da NF</label>
                  <input type="number" min="1" value={diasNfInput} onChange={e => setDiasNfInput(e.target.value)}
                    disabled={!temColunaNf} className={`${campoCls} disabled:bg-slate-50 disabled:text-slate-400`} />
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    Contado da data de emissão da NF — controla a linha "NF sem envio" do card Pendências: NF não enviada à
                    fábrica e emitida há {Number(diasNfInput) > 0 ? Number(diasNfInput) : 'N'} dia{Number(diasNfInput) === 1 ? '' : 's'} ou mais.
                  </p>
                  {!temColunaNf && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                      Campo ainda não liberado no banco — por enquanto vale o padrão de 4 dias.
                    </p>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Vencidos / Vence Hoje / A Vencer</strong>: regra fixa — data de vencimento comparada com hoje.
                </p>
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
