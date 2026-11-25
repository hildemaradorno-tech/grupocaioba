import React, { useEffect, useState } from 'react'
import { Target, X, Loader2, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { apiService } from '../../services/api'

// Meta do indicador "Tempo de garantia em aberto" (Dashboard da aba Com Garantista): média de dias em
// aberto (da criação da O.S. até hoje). Cadastro ano a ano em gar_metas_tempo_aberto:
//   mes 0 = meta anual (vale para os meses em branco) · mes 1..12 = meta do mês.
// O Dashboard usa a meta do mês atual; mês em branco usa a anual.
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const paraTexto = (v) => (v != null && v !== '' ? String(Number(v)).replace('.', ',') : '')
// '' → null · número > 0 → número · outro → NaN (inválido)
const paraNumero = (txt) => {
  const t = String(txt ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n > 0 ? n : NaN
}
const vazioAno = () => Array.from({ length: 13 }, () => '') // índice 0 = anual, 1..12 = meses

export default function MetaTempoAbertoModal({ usuario, onClose, onSalvo }) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [anos, setAnos] = useState({}) // { 2026: ['anual', jan, ..., dez] }
  const [mexidos, setMexidos] = useState(() => new Set())
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (anos[ano]) return
    setCarregando(true)
    apiService.getGarMetasTempoAno(ano)
      .then(lista => {
        const v = vazioAno()
        for (const r of lista) if (r.mes >= 0 && r.mes <= 12) v[r.mes] = paraTexto(r.meta_dias)
        setAnos(p => ({ ...p, [ano]: v }))
      })
      .catch(err => { setErro('Erro ao carregar as metas de ' + ano + ': ' + (err.message || String(err))); setAnos(p => ({ ...p, [ano]: vazioAno() })) })
      .finally(() => setCarregando(false))
  }, [ano]) // eslint-disable-line react-hooks/exhaustive-deps

  const valores = anos[ano]
  const alterar = (idx, valor) => {
    setAnos(p => ({ ...p, [ano]: p[ano].map((x, i) => (i === idx ? valor : x)) }))
    setMexidos(p => new Set(p).add(ano))
  }
  const copiarJaneiro = () => {
    setAnos(p => ({ ...p, [ano]: p[ano].map((x, i) => (i === 0 ? x : p[ano][1])) }))
    setMexidos(p => new Set(p).add(ano))
  }

  const salvar = async () => {
    const porAno = []
    for (const a of mexidos) {
      const linhas = []
      for (let m = 0; m <= 12; m++) {
        const n = paraNumero(anos[a][m])
        if (Number.isNaN(n)) { setErro(`${m === 0 ? 'Meta anual' : MESES[m - 1]}/${a}: informe um número de dias maior que zero (ou deixe em branco).`); setAno(a); return }
        linhas.push({ mes: m, meta_dias: n })
      }
      porAno.push([a, linhas])
    }
    setSalvando(true); setErro(null)
    try {
      for (const [a, linhas] of porAno) await apiService.saveGarMetasTempoAno(a, linhas, usuario)
      onSalvo?.()
      onClose()
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'w-20 text-xs text-right p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() + 1 : -1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-rose-600" /> Meta — Tempo de garantia em aberto
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Média máxima de dias em aberto das O.S. com garantista (da criação da O.S. até hoje). O Dashboard usa a meta do{' '}
          <strong>mês atual</strong>; mês em branco usa a <strong>meta anual</strong>. No indicador, fica{' '}
          <strong className="text-emerald-700">verde</strong> até a meta e <strong className="text-red-700">vermelho</strong> acima dela.
        </p>
        {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}

        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Metas do ano</p>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setAno(a => a - 1)} title="Ano anterior" className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-sm font-bold text-slate-800 w-12 text-center">{ano}</span>
            <button type="button" onClick={() => setAno(a => a + 1)} title="Próximo ano" className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="overflow-y-auto pr-1 -mr-1">
          {!valores || carregando ? (
            <p className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Carregando {ano}...</p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 mb-2">
                <span className="text-xs font-bold text-slate-700">Meta anual {ano} <span className="font-normal text-slate-400">(meses em branco)</span></span>
                <span className="flex items-center gap-1">
                  <input type="text" inputMode="decimal" value={valores[0]} placeholder="—" onChange={e => alterar(0, e.target.value)} className={inputCls} />
                  <span className="text-xs text-slate-500">dias</span>
                </span>
              </div>
              <table className="w-full text-xs border border-slate-200 rounded-md overflow-hidden">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                  <tr><th className="text-left p-2">Mês</th><th className="text-right p-2">Meta (dias em média)</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MESES.map((nome, i) => (
                    <tr key={nome} className={i + 1 === mesAtual ? 'bg-amber-50/60' : ''}>
                      <td className="p-1.5 pl-2 font-semibold text-slate-700">{nome}</td>
                      <td className="p-1.5 text-right">
                        <input type="text" inputMode="decimal" value={valores[i + 1]} placeholder={valores[0] || '—'} title="Em branco = meta anual"
                          onChange={e => alterar(i + 1, e.target.value)} className={inputCls} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" onClick={copiarJaneiro}
                className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
                <Copy className="h-3.5 w-3.5" /> Copiar Janeiro para todos os meses de {ano}
              </button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancelar</button>
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
