import React, { useEffect, useState } from 'react'
import { X, Settings, Plus, Trash2, Pencil, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'

// Cadastro dos códigos de tipo de título usados no arquivo de baixa (Dealer.net › Banco Retorno)
// do Extrato de Pagamento DAF — antes só "GARANTIA FABRICA" = 4, fixo no código; agora qualquer
// tipo de título novo (ex.: PLANO MANUTENCAO DAF) pode ganhar um código aqui, sem precisar de
// código novo na tela. `tiposPendentes` são tipos selecionados pra baixa que ainda não têm código
// (vindos da própria tela) — aparecem como atalho de cadastro rápido no topo.
export default function ExtratoDafCodigosModal({ tiposPendentes = [], onClose, onSalvou }) {
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [novoTipo, setNovoTipo] = useState('')
  const [novoCodigo, setNovoCodigo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [codigoEdicao, setCodigoEdicao] = useState('')
  const [excluindoId, setExcluindoId] = useState(null)

  const carregar = async () => {
    setLoading(true)
    setErro(null)
    try {
      setItens(await apiService.getExtratoDafCodigosBaixa())
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const jaTemCodigo = (tipo) => itens.some(i => i.tipo_titulo === tipo)
  const pendentesSemCodigo = tiposPendentes.filter(tp => tp !== '(sem tipo)' && !jaTemCodigo(tp))

  const salvar = async (tipo, codigo) => {
    const t = (tipo || '').trim()
    const c = (codigo || '').trim()
    if (!t || !c) return
    setSalvando(true)
    setErro(null)
    try {
      await apiService.salvarExtratoDafCodigoBaixa(t, c)
      setNovoTipo('')
      setNovoCodigo('')
      setEditandoId(null)
      await carregar()
      onSalvou?.()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSalvando(false)
    }
  }

  const iniciarEdicao = (item) => { setEditandoId(item.id); setCodigoEdicao(item.codigo) }

  const excluir = async (id) => {
    setExcluindoId(id)
    setErro(null)
    try {
      await apiService.deleteExtratoDafCodigoBaixa(id)
      await carregar()
      onSalvou?.()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-100 rounded-lg"><Settings className="h-4 w-4 text-blue-600" /></div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Códigos de Tipo de Título</h2>
              <p className="text-[11px] text-slate-500">Usados na 1ª posição de cada linha do arquivo de baixa (.txt)</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          <p className="text-[11px] text-slate-500">
            Cada tipo de título precisa de um código (1 caractere) pra virar a 1ª posição da linha correspondente no
            arquivo de baixa. Sem código cadastrado aqui, o arquivo não é gerado pra esse tipo.
          </p>

          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{erro}</p>
            </div>
          )}

          {pendentesSemCodigo.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <p className="text-[11px] font-semibold text-amber-800">Selecionados na baixa, ainda sem código:</p>
              {pendentesSemCodigo.map(tp => (
                <div key={tp} className="flex items-center gap-2">
                  <span className="flex-1 text-xs font-mono text-amber-900 truncate">{tp}</span>
                  <input
                    type="text"
                    maxLength={1}
                    placeholder="Cód."
                    className="w-14 text-xs text-center border border-amber-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    onKeyDown={e => { if (e.key === 'Enter') salvar(tp, e.currentTarget.value) }}
                    id={`codigo-pendente-${tp}`}
                  />
                  <button
                    onClick={() => salvar(tp, document.getElementById(`codigo-pendente-${tp}`)?.value)}
                    disabled={salvando}
                    className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-md disabled:opacity-50"
                  >
                    <Check className="h-3 w-3" /> Salvar
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={novoTipo}
              onChange={e => setNovoTipo(e.target.value)}
              placeholder="Tipo de título (ex: PLANO MANUTENCAO DAF)"
              className="flex-1 text-xs border border-slate-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
            <input
              type="text"
              maxLength={1}
              value={novoCodigo}
              onChange={e => setNovoCodigo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvar(novoTipo, novoCodigo) }}
              placeholder="Cód."
              className="w-16 text-xs text-center border border-slate-200 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
            />
            <button
              onClick={() => salvar(novoTipo, novoCodigo)}
              disabled={salvando || !novoTipo.trim() || !novoCodigo.trim()}
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
            <p className="text-xs text-slate-400 text-center py-8">Nenhum código cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {itens.map(item => (
                <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50/70">
                  <span className="flex-1 text-xs font-mono text-slate-700 truncate">{item.tipo_titulo}</span>
                  {editandoId === item.id ? (
                    <>
                      <input
                        type="text"
                        maxLength={1}
                        value={codigoEdicao}
                        onChange={e => setCodigoEdicao(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') salvar(item.tipo_titulo, codigoEdicao); if (e.key === 'Escape') setEditandoId(null) }}
                        autoFocus
                        className="w-14 text-xs text-center border border-blue-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                      <button onClick={() => salvar(item.tipo_titulo, codigoEdicao)} disabled={salvando} className="text-emerald-600 hover:text-emerald-800 p-1"><Check className="h-4 w-4" /></button>
                      <button onClick={() => setEditandoId(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="h-4 w-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="w-14 text-center text-xs font-bold text-slate-800 bg-slate-100 rounded-md py-1">{item.codigo}</span>
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
      </div>
    </div>
  )
}
