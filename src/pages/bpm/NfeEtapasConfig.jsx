import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Settings, Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle, Loader2 } from 'lucide-react'
import { listarEtapas, salvarEtapa, excluirEtapa } from '../../services/nfeSolicitacoesService'

const PAPEIS = ['fiscal', 'financeiro', 'estoque', 'gerencia']

const VAZIO = { nome: '', papel: 'fiscal', prazo_horas: 24, ativo: true }

export default function NfeEtapasConfig() {
  const [etapas, setEtapas] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [form, setForm] = useState(VAZIO)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try { setEtapas(await listarEtapas()) }
    catch (e) { setErro(e.message || String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const adicionar = async () => {
    if (!form.nome.trim()) return
    setSalvando(true); setErro(null)
    try {
      const proximaOrdem = etapas.length ? Math.max(...etapas.map(e => e.ordem)) + 1 : 1
      await salvarEtapa({ ...form, ordem: proximaOrdem })
      setForm(VAZIO)
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvando(false) }
  }

  const alternarAtivo = async (etapa) => {
    try { await salvarEtapa({ ...etapa, ativo: !etapa.ativo }); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
  }

  const excluir = async (etapa) => {
    try { await excluirEtapa(etapa.id); await carregar() }
    catch (e) { setErro(e.message || String(e)) }
  }

  const mover = async (etapa, direcao) => {
    const idx = etapas.findIndex(e => e.id === etapa.id)
    const vizinho = etapas[idx + direcao]
    if (!vizinho) return
    try {
      // troca as ordens entre os dois (via valor temporário pra não colidir com a UNIQUE(ordem))
      await salvarEtapa({ ...etapa, ordem: -1 })
      await salvarEtapa({ ...vizinho, ordem: etapa.ordem })
      await salvarEtapa({ ...etapa, ordem: vizinho.ordem })
      await carregar()
    } catch (e) { setErro(e.message || String(e)) }
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Link to="/bpm/nfe-cancelamento-devolucao" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" /> Etapas — Cancelamento/Devolução NF-e
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Toda solicitação passa por estas etapas, nesta ordem. Setor define quem pode assumir/decidir cada uma.</p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Nova etapa</h2>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
            <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="ex.: Análise Fiscal"
              className="text-xs p-2 border border-slate-200 rounded-md" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Setor</label>
            <select value={form.papel} onChange={e => setForm(p => ({ ...p, papel: e.target.value }))} className="text-xs p-2 border border-slate-200 rounded-md bg-white">
              {PAPEIS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 w-28">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Prazo (horas)</label>
            <input type="number" value={form.prazo_horas} onChange={e => setForm(p => ({ ...p, prazo_horas: e.target.value ? Number(e.target.value) : null }))}
              className="text-xs p-2 border border-slate-200 rounded-md" />
          </div>
          <button onClick={adicionar} disabled={salvando || !form.nome.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : etapas.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">Nenhuma etapa cadastrada ainda.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-3 w-16">Ordem</th><th className="p-3">Nome</th><th className="p-3">Setor</th>
                <th className="p-3 text-center">Prazo</th><th className="p-3 text-center">Ativa</th><th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {etapas.map((e, i) => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => mover(e, -1)} disabled={i === 0} className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button onClick={() => mover(e, 1)} disabled={i === etapas.length - 1} className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20"><ArrowDown className="h-3.5 w-3.5" /></button>
                      <span className="ml-1 text-slate-400">{i + 1}</span>
                    </div>
                  </td>
                  <td className="p-3 font-semibold">{e.nome}</td>
                  <td className="p-3 text-slate-500 capitalize">{e.papel}</td>
                  <td className="p-3 text-center">{e.prazo_horas ? `${e.prazo_horas}h` : '—'}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => alternarAtivo(e)} className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${e.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {e.ativo ? 'Sim' : 'Não'}
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => excluir(e)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
