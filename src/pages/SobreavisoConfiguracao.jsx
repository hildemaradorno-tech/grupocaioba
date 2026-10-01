import React, { useEffect, useState } from 'react'
import { Settings2, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'

export default function SobreavisoConfiguracao() {
  const { hasAction } = useAuth()
  const canConfigurar = hasAction('sobreaviso-plantao', 'configurar_valores')

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [config, setConfig] = useState(null)
  const [formConfig, setFormConfig] = useState({ valor_dia_sobreaviso: '', valor_deslocamento: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setErro(null)
    try {
      const cfg = await apiService.getSobreavisoConfig()
      setConfig(cfg)
      setFormConfig({
        valor_dia_sobreaviso: parseFloat(cfg.valor_dia_sobreaviso).toFixed(2),
        valor_deslocamento: parseFloat(cfg.valor_deslocamento).toFixed(2),
      })
    } catch (err) {
      setErro('Erro ao carregar configuração: ' + (err.message || String(err)))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroSalvar(null)
    if (!config) { setErroSalvar('Configuração ainda não carregada. Recarregue a página.'); return }
    setSalvando(true)
    try {
      const payload = {
        valor_dia_sobreaviso: parseFloat(formConfig.valor_dia_sobreaviso),
        valor_deslocamento: parseFloat(formConfig.valor_deslocamento),
      }
      const atualizado = await apiService.updateSobreavisoConfig(config.id, payload)
      setConfig(atualizado)
    } catch (err) {
      setErroSalvar('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="min-h-full w-full p-6 space-y-4">

      {/* CABEÇALHO */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-blue-600" />
          Configuração de Valores
        </h1>
        <p className="text-xs text-slate-500">Valor por dia de sobreaviso e por deslocamento — usados para calcular automaticamente os lançamentos de Sobreaviso/Plantão.</p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        {canConfigurar ? (
          <form onSubmit={handleSalvar} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Valor por dia de sobreaviso (R$)</label>
              <input
                type="number" step="0.01" min="0" required
                value={formConfig.valor_dia_sobreaviso}
                onChange={e => setFormConfig(prev => ({ ...prev, valor_dia_sobreaviso: e.target.value }))}
                className={`${INP} w-40`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Valor por deslocamento (R$)</label>
              <input
                type="number" step="0.01" min="0" required
                value={formConfig.valor_deslocamento}
                onChange={e => setFormConfig(prev => ({ ...prev, valor_deslocamento: e.target.value }))}
                className={`${INP} w-40`}
              />
            </div>
            <button type="submit" disabled={salvando} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
              {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Valores
            </button>
            {erroSalvar && <span className="text-xs text-red-600">{erroSalvar}</span>}
          </form>
        ) : (
          <div className="flex flex-wrap gap-6 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-500">Sobreaviso:</span> {fmtBRL(config?.valor_dia_sobreaviso)}/dia</span>
            <span><span className="font-semibold text-slate-500">Deslocamento:</span> {fmtBRL(config?.valor_deslocamento)}/acionamento</span>
          </div>
        )}
      </div>

    </div>
  )
}
