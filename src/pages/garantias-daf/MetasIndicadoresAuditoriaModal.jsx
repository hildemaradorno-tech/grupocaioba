import React, { useEffect, useState } from 'react'
import { Target, X, Loader2, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { apiService } from '../../services/api'

// Metas dos indicadores do Dashboard da Auditoria O.S. Aberta — percentual máximo aceito do total em aberto,
// igual para todas as empresas. Vazio = sem meta.
//  • Meta por mês, cadastrada ano a ano (aud_metas_indicadores) — o Dashboard usa a do mês/ano da auditoria
//  • Meta geral (aud_configuracoes, linha 'geral') — vale para os meses sem meta cadastrada
export const INDICADORES_META = [
  { campo: 'meta_pendentes_pct', titulo: 'Total O.S. pendentes', curto: 'O.S. pendentes', desc: 'O.S. em aberto sem que o veículo esteja na oficina' },
  { campo: 'meta_mais30_pct',    titulo: 'Total O.S. > 30 dias', curto: 'O.S. > 30 dias', desc: 'Veículos na oficina com O.S. aberta há mais de 30 dias' },
]
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const paraTexto = (v) => (v != null && v !== '' ? String(Number(v)).replace('.', ',') : '')
// '' → null; número 0–100 → número; outro → NaN (inválido)
const paraNumero = (txt) => {
  const t = String(txt ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : NaN
}
const vazioAno = () => Array.from({ length: 12 }, () => Object.fromEntries(INDICADORES_META.map(i => [i.campo, ''])))

export default function MetasIndicadoresAuditoriaModal({ config, usuario, onClose, onSalvo }) {
  const [geral, setGeral] = useState(() => Object.fromEntries(INDICADORES_META.map(i => [i.campo, paraTexto(config?.[i.campo])])))
  const [ano, setAno] = useState(new Date().getFullYear())
  // Anos já abertos nesta janela: { 2026: [12 linhas], ... } — Salvar grava todos os que foram mexidos
  const [anos, setAnos] = useState({})
  const [mexidos, setMexidos] = useState(() => new Set())
  const [carregandoAno, setCarregandoAno] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (anos[ano]) return
    setCarregandoAno(true)
    apiService.getAuditoriaMetasAno(ano)
      .then(lista => {
        const linhas = vazioAno()
        for (const r of lista) {
          if (r.mes >= 1 && r.mes <= 12) INDICADORES_META.forEach(i => { linhas[r.mes - 1][i.campo] = paraTexto(r[i.campo]) })
        }
        setAnos(p => ({ ...p, [ano]: linhas }))
      })
      .catch(err => { setErro('Erro ao carregar as metas de ' + ano + ': ' + (err.message || String(err))); setAnos(p => ({ ...p, [ano]: vazioAno() })) })
      .finally(() => setCarregandoAno(false))
  }, [ano]) // eslint-disable-line react-hooks/exhaustive-deps

  const linhasAno = anos[ano]
  const alterarMes = (idx, campo, valor) => {
    setAnos(p => ({ ...p, [ano]: p[ano].map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)) }))
    setMexidos(p => new Set(p).add(ano))
  }
  // Repete o valor de Janeiro nos outros 11 meses do ano aberto
  const copiarJaneiro = () => {
    setAnos(p => ({ ...p, [ano]: p[ano].map(() => ({ ...p[ano][0] })) }))
    setMexidos(p => new Set(p).add(ano))
  }

  const salvar = async () => {
    // Meta geral
    const payloadGeral = {}
    for (const { campo, titulo } of INDICADORES_META) {
      const n = paraNumero(geral[campo])
      if (Number.isNaN(n)) { setErro(`Meta geral — ${titulo}: informe um percentual entre 0 e 100.`); return }
      payloadGeral[campo] = n
    }
    // Metas por mês dos anos mexidos
    const porAno = []
    for (const a of mexidos) {
      const linhas = []
      for (let m = 0; m < 12; m++) {
        const linha = { mes: m + 1 }
        for (const { campo, curto } of INDICADORES_META) {
          const n = paraNumero(anos[a][m][campo])
          if (Number.isNaN(n)) { setErro(`${MESES[m]}/${a} — ${curto}: informe um percentual entre 0 e 100.`); setAno(a); return }
          linha[campo] = n
        }
        linhas.push(linha)
      }
      porAno.push([a, linhas])
    }
    setSalvando(true); setErro(null)
    try {
      const salvo = await apiService.saveAuditoriaConfig(payloadGeral, usuario)
      for (const [a, linhas] of porAno) await apiService.saveAuditoriaMetasAno(a, linhas, usuario)
      onSalvo?.(salvo)
      onClose()
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const inputCls = 'w-16 text-xs text-right p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() : -1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-rose-600" /> Metas dos indicadores
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Percentual máximo aceito do total em aberto, igual para todas as empresas. O Dashboard usa a meta do{' '}
          <strong>mês da data da auditoria</strong>; mês em branco usa a meta geral. No medidor, o arco fica{' '}
          <strong className="text-emerald-700">verde</strong> até a meta e <strong className="text-red-700">vermelho</strong> acima dela.
        </p>
        {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}

        <div className="overflow-y-auto pr-1 -mr-1 space-y-4">
          {/* Meta geral — vale para os meses sem meta */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Meta geral (meses em branco)</p>
            <div className="space-y-2">
              {INDICADORES_META.map(({ campo, titulo, desc }) => (
                <div key={campo} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{titulo}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input type="text" inputMode="decimal" value={geral[campo]} placeholder="—"
                      onChange={e => setGeral(p => ({ ...p, [campo]: e.target.value }))} className={inputCls} />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Meta por mês, ano a ano */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Meta por mês</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setAno(a => a - 1)} title="Ano anterior"
                  className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronLeft className="h-4 w-4" /></button>
                <span className="text-sm font-bold text-slate-800 w-12 text-center">{ano}</span>
                <button type="button" onClick={() => setAno(a => a + 1)} title="Próximo ano"
                  className="p-1 rounded text-slate-500 hover:bg-slate-100"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
            {!linhasAno || carregandoAno ? (
              <p className="flex items-center gap-2 text-xs text-slate-400 py-6 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Carregando {ano}...</p>
            ) : (
              <>
                <table className="w-full text-xs border border-slate-200 rounded-md overflow-hidden">
                  <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold">
                    <tr>
                      <th className="text-left p-2">Mês</th>
                      {INDICADORES_META.map(i => <th key={i.campo} className="text-right p-2">{i.curto} (%)</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {linhasAno.map((l, idx) => (
                      <tr key={idx} className={idx === mesAtual ? 'bg-amber-50/60' : ''}>
                        <td className="p-1.5 pl-2 font-semibold text-slate-700">{MESES[idx]}</td>
                        {INDICADORES_META.map(i => (
                          <td key={i.campo} className="p-1.5 text-right">
                            <input type="text" inputMode="decimal" value={l[i.campo]}
                              placeholder={geral[i.campo] || '—'} title="Em branco = meta geral"
                              onChange={e => alterarMes(idx, i.campo, e.target.value)} className={inputCls} />
                          </td>
                        ))}
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
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={salvar} disabled={salvando || carregandoAno}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
            {salvando && <Loader2 className="h-3 w-3 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
