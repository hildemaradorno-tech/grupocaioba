import React, { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Eraser, Settings, X } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { CORES, HEX_COR, INDICADORES, REGRA_PADRAO } from './produtividadeCalculos'

// Engrenagem da tela Indicadores de Produtividade: regras de cores (verde / amarelo / vermelho) da
// Eficiência, Eficácia e Produtividade, mês a mês, por ano. Grava em pv_prod_regras_cor.
// Mês sem regra = faixas padrão do Power BI.
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const VAZIA = { inf: '', sup: '', abaixo: '', meio: '', acima: '' }
// fração ↔ texto em % (0,8 → "80")
const paraPct = (v) => (v == null || v === '' ? '' : String(Math.round(Number(v) * 10000) / 100).replace('.', ','))
const dePct = (t) => {
  const n = Number(String(t).replace(',', '.'))
  return t === '' || !Number.isFinite(n) ? null : n / 100
}

function montar(regras, ano) {
  const out = {}
  for (const ind of INDICADORES) {
    out[ind.id] = Array.from({ length: 12 }, () => ({ ...VAZIA }))
  }
  for (const r of regras) {
    if (r.ano !== ano || !out[r.indicador]) continue
    out[r.indicador][r.mes - 1] = { inf: paraPct(r.limite_inf), sup: paraPct(r.limite_sup), abaixo: r.cor_abaixo, meio: r.cor_meio, acima: r.cor_acima }
  }
  return out
}
const preenchida = (l) => Object.values(l).some(v => v !== '')

function SeletorCor({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-full border border-slate-300 shrink-0" style={{ background: value ? HEX_COR[value] : 'transparent' }} />
      <select value={value} onChange={e => onChange(e.target.value)}
        className="h-7 text-[11px] px-1 border border-slate-300 rounded-md bg-white w-[92px]">
        <option value="">—</option>
        {CORES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
  )
}

function CampoPct({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-0.5">
      <input type="text" inputMode="decimal" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value.replace(/[^\d,.]/g, ''))}
        className="h-7 w-16 text-[11px] px-1.5 text-right border border-slate-300 rounded-md bg-white tabular-nums" />
      <span className="text-[11px] text-slate-500">%</span>
    </div>
  )
}

export default function RegrasCoresModal({ regras, anoInicial, usuario, onClose, onSalvo }) {
  const [ano, setAno] = useState(anoInicial)
  const [ind, setInd] = useState('eficiencia')
  const [dados, setDados] = useState(() => montar(regras, anoInicial))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [alterado, setAlterado] = useState(false)

  const anos = useMemo(() => {
    const atual = new Date().getFullYear()
    return [...new Set([...regras.map(r => r.ano), atual - 1, atual, atual + 1, anoInicial])].sort()
  }, [regras, anoInicial])

  const trocarAno = (a) => {
    if (alterado && !window.confirm('Há alterações não salvas neste ano. Trocar de ano e descartar?')) return
    setAno(a); setDados(montar(regras, a)); setAlterado(false); setErro('')
  }
  const mudar = (mes, campo, valor) => {
    setDados(d => ({ ...d, [ind]: d[ind].map((l, i) => (i === mes ? { ...l, [campo]: valor } : l)) }))
    setAlterado(true)
  }
  const sugerir = (mes) => {
    const p = REGRA_PADRAO[ind]
    setDados(d => ({ ...d, [ind]: d[ind].map((l, i) => (i === mes ? { inf: paraPct(p.inf), sup: paraPct(p.sup), abaixo: p.abaixo, meio: p.meio, acima: p.acima } : l)) }))
    setAlterado(true)
  }
  const limpar = (mes) => { setDados(d => ({ ...d, [ind]: d[ind].map((l, i) => (i === mes ? { ...VAZIA } : l)) })); setAlterado(true) }
  // Duplica limites e cores do mês para os meses seguintes do ano (até dezembro).
  const duplicarProximos = (mes) => {
    const base = dados[ind][mes]
    setDados(d => ({ ...d, [ind]: d[ind].map((l, i) => (i > mes ? { ...base } : l)) }))
    setAlterado(true)
  }

  const salvar = async () => {
    setErro('')
    const gravar = [], apagar = []
    for (const { id, label } of INDICADORES) {
      for (let m = 0; m < 12; m++) {
        const l = dados[id][m]
        if (!preenchida(l)) { apagar.push({ indicador: id, mes: m + 1 }); continue }
        const inf = dePct(l.inf), sup = dePct(l.sup)
        if (inf == null || sup == null || !l.abaixo || !l.meio || !l.acima) {
          setErro(`${label} — ${MESES[m]}: preencha os dois limites e as três cores (ou limpe a linha).`); setInd(id); return
        }
        if (inf > sup) { setErro(`${label} — ${MESES[m]}: o limite de baixo não pode ser maior que o de cima.`); setInd(id); return }
        gravar.push({ ano, mes: m + 1, indicador: id, limite_inf: inf, limite_sup: sup, cor_abaixo: l.abaixo, cor_meio: l.meio, cor_acima: l.acima })
      }
    }
    setSalvando(true)
    try {
      const agora = new Date().toISOString()
      if (gravar.length) {
        const { error } = await supabase.from('pv_prod_regras_cor')
          .upsert(gravar.map(g => ({ ...g, atualizado_em: agora, atualizado_por: usuario })), { onConflict: 'ano,mes,indicador' })
        if (error) throw error
      }
      // Linhas limpas: apaga a regra daquele mês (volta ao padrão).
      const existentes = new Set(regras.filter(r => r.ano === ano).map(r => `${r.indicador}|${r.mes}`))
      for (const a of apagar.filter(x => existentes.has(`${x.indicador}|${x.mes}`))) {
        const { error } = await supabase.from('pv_prod_regras_cor').delete().eq('ano', ano).eq('mes', a.mes).eq('indicador', a.indicador)
        if (error) throw error
      }
      await onSalvo?.()
      onClose()
    } catch (e) {
      setErro(/row-level security|permission/i.test(e.message || '') ? 'Sem permissão para gravar as regras de cores (ação "Regras de cores dos indicadores" no Grupo de Acessos).' : (e.message || String(e)))
    } finally {
      setSalvando(false)
    }
  }

  const linhas = dados[ind]
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget && !salvando) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Settings className="h-4 w-4 text-slate-500" /> Regras de cores dos indicadores</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1 rounded hover:bg-slate-100"><X className="h-4 w-4 text-slate-500" /></button>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-end gap-4 border-b border-slate-100">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Ano</label>
            <select value={ano} onChange={e => trocarAno(Number(e.target.value))} className="h-8 text-[11px] px-2 border border-slate-300 rounded-md bg-white w-24">
              {anos.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
            {INDICADORES.map(i => (
              <button key={i.id} type="button" onClick={() => setInd(i.id)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-semibold ${ind === i.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                {i.label.replace(' %', '')}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 max-w-md">
            Vale a regra do mês da data final do calendário. Mês em branco usa as faixas padrão do Power BI.
          </p>
        </div>

        <div className="overflow-auto px-5 py-3">
          <table className="text-[11px] min-w-full">
            <thead>
              <tr className="text-slate-600 border-b border-sky-300 text-left">
                <th className="py-2 pr-3">Mês</th>
                <th className="py-2 px-2">Abaixo de</th>
                <th className="py-2 px-2">Cor</th>
                <th className="py-2 px-2">Entre os limites — até</th>
                <th className="py-2 px-2">Cor</th>
                <th className="py-2 px-2">Acima do limite</th>
                <th className="py-2 px-2">Cor</th>
                <th className="py-2 pl-2"></th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, m) => (
                <tr key={m} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{MESES[m]}</td>
                  <td className="px-2"><CampoPct value={l.inf} onChange={v => mudar(m, 'inf', v)} placeholder={paraPct(REGRA_PADRAO[ind].inf)} /></td>
                  <td className="px-2"><SeletorCor value={l.abaixo} onChange={v => mudar(m, 'abaixo', v)} /></td>
                  <td className="px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 whitespace-nowrap">{l.inf || '…'}% até</span>
                      <CampoPct value={l.sup} onChange={v => mudar(m, 'sup', v)} placeholder={paraPct(REGRA_PADRAO[ind].sup)} />
                    </div>
                  </td>
                  <td className="px-2"><SeletorCor value={l.meio} onChange={v => mudar(m, 'meio', v)} /></td>
                  <td className="px-2 text-slate-500 whitespace-nowrap">acima de {l.sup || '…'}%</td>
                  <td className="px-2"><SeletorCor value={l.acima} onChange={v => mudar(m, 'acima', v)} /></td>
                  <td className="pl-2">
                    <div className="flex items-center gap-1 justify-end">
                      {!preenchida(l) && (
                        <button type="button" onClick={() => sugerir(m)} title="Preencher com as faixas padrão (Power BI)"
                          className="px-2 h-7 rounded-md border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-50 whitespace-nowrap">Usar padrão</button>
                      )}
                      {preenchida(l) && (
                        <>
                          {m < 11 && (
                            <button type="button" onClick={() => duplicarProximos(m)} title={`Duplicar valores e cores para os próximos meses (${MESES[m + 1]} a Dezembro)`}
                              className="flex items-center gap-1 px-2 h-7 rounded-md border border-slate-300 text-[10px] text-slate-600 hover:bg-slate-50 whitespace-nowrap">
                              <Copy className="h-3.5 w-3.5" /> Próximos meses
                            </button>
                          )}
                          <button type="button" onClick={() => limpar(m)} title="Limpar (volta às faixas padrão)"
                            className="p-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"><Eraser className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200">
          <p className="text-[11px] text-red-600 font-semibold">{erro}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={salvando} className="px-4 h-8 rounded-md border border-slate-300 text-[11px] text-slate-600 hover:bg-slate-50">Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando}
              className="px-4 h-8 rounded-md bg-indigo-600 text-white text-[11px] font-semibold hover:bg-indigo-700 disabled:opacity-60">{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
