import React, { useState, useEffect, useCallback } from 'react'
import { X, Settings, Layers, Plus, Trash2, Pencil, Check, AlertTriangle, Loader2, Scale } from 'lucide-react'
import { apiService } from '../../services/api'

// Categorias de configuração da tela de Conciliação TruckPag — o shell (lista de categorias à
// esquerda + painel à direita) fica pronto pra novas categorias além destas duas.
const CATEGORIAS = [
  { key: 'tipos-saldo', label: 'Tipo de Saldo', icon: Layers },
  { key: 'tolerancia', label: 'Tolerância de Valor', icon: Scale },
]

function PainelTolerancia() {
  const [valor, setValor] = useState('0,02')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      setErro(null)
      try {
        const v = await apiService.getTruckPagToleranciaConciliacao()
        setValor(Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
      } catch (e) {
        setErro(e.message || String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const salvar = async () => {
    const num = parseFloat(String(valor).replace(/\./g, '').replace(',', '.'))
    if (isNaN(num) || num < 0) { setErro('Digite um valor válido (ex: 0,02).'); return }
    setSalvando(true)
    setErro(null)
    setSalvo(false)
    try {
      await apiService.updateTruckPagToleranciaConciliacao(num)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2500)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Tolerância de Valor</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Diferença máxima (pra mais ou pra menos) entre o valor líquido de um repasse e o valor de um crédito não
          identificado pra considerar os dois vinculados na tela de Conciliação. Ex: com tolerância de R$ 0,05, um
          repasse de R$ 11.230,41 concilia com um crédito de R$ 11.230,45 (diferença de 4 centavos).
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{erro}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-slate-300 animate-spin" />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') salvar() }}
            placeholder="0,02"
            className="w-32 text-xs border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
          />
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
          >
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
          </button>
          {salvo && <span className="text-[11px] font-semibold text-emerald-600">Salvo!</span>}
        </div>
      )}
    </div>
  )
}

function PainelTiposSaldo() {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [novoTexto, setNovoTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [textoEdicao, setTextoEdicao] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      setItens(await apiService.getTruckPagTiposSaldo())
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const handleAdicionar = async () => {
    const texto = novoTexto.trim()
    if (!texto) return
    setSalvando(true)
    setErro(null)
    try {
      await apiService.createTruckPagTipoSaldo(texto)
      setNovoTexto('')
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSalvando(false)
    }
  }

  const iniciarEdicao = (item) => { setEditandoId(item.id); setTextoEdicao(item.texto) }
  const cancelarEdicao = () => { setEditandoId(null); setTextoEdicao('') }

  const salvarEdicao = async (id) => {
    const texto = textoEdicao.trim()
    if (!texto) return
    setSalvando(true)
    setErro(null)
    try {
      await apiService.updateTruckPagTipoSaldo(id, { texto })
      cancelarEdicao()
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSalvando(false)
    }
  }

  const excluir = async (id) => {
    setExcluindoId(id)
    setErro(null)
    try {
      await apiService.deleteTruckPagTipoSaldo(id)
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-800">Tipo de Saldo</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Padrões de texto (contém, sem diferenciar maiúsculas/minúsculas) comparados contra a Observação de cada
          crédito da tesouraria. Só créditos cuja observação contiver algum destes padrões aparecem como
          "Saldo Concessionária" na tela de Conciliação — ex: cadastrar <strong>TRUCKPA</strong> casa com
          "INTBAN -[2090007] PIX TRANSF TRUCKPA02/09 Imp[577] C[0]". Sem nenhum padrão cadastrado, todos os créditos aparecem.
        </p>
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-700">{erro}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={novoTexto}
          onChange={e => setNovoTexto(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdicionar() }}
          placeholder="Ex: TRUCKPA"
          className="flex-1 text-xs border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
        <button
          onClick={handleAdicionar}
          disabled={salvando || !novoTexto.trim()}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 text-slate-300 animate-spin" />
        </div>
      ) : itens.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Nenhum tipo de saldo cadastrado ainda.</p>
      ) : (
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
          {itens.map(item => (
            <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50/70">
              {editandoId === item.id ? (
                <>
                  <input
                    type="text"
                    value={textoEdicao}
                    onChange={e => setTextoEdicao(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(item.id); if (e.key === 'Escape') cancelarEdicao() }}
                    autoFocus
                    className="flex-1 text-xs border border-blue-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                  <button onClick={() => salvarEdicao(item.id)} disabled={salvando} className="text-emerald-600 hover:text-emerald-800 p-1"><Check className="h-4 w-4" /></button>
                  <button onClick={cancelarEdicao} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs font-mono text-slate-700">{item.texto}</span>
                  <button onClick={() => iniciarEdicao(item)} className="text-slate-400 hover:text-blue-600 p-1"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => excluir(item.id)} disabled={excluindoId === item.id} className="text-slate-400 hover:text-red-600 p-1">
                    {excluindoId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TruckPagConfigModal({ onClose }) {
  const [categoriaAtiva, setCategoriaAtiva] = useState('tipos-saldo')

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl border border-slate-200 w-[720px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">

        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Settings className="h-5 w-5 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Configurações — Contas a Receber TruckPag</h2>
              <p className="text-[11px] text-slate-500">Parâmetros usados pelo módulo, editáveis sem precisar de código novo.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-48 border-r border-slate-100 bg-slate-50/50 p-2 shrink-0 overflow-y-auto">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategoriaAtiva(cat.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold text-left transition-colors ${
                  categoriaAtiva === cat.key ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <cat.icon className="h-3.5 w-3.5" /> {cat.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {categoriaAtiva === 'tipos-saldo' && <PainelTiposSaldo />}
            {categoriaAtiva === 'tolerancia' && <PainelTolerancia />}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
