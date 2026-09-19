import React, { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import { valoresMetaMecanico } from '../utils/metasMecanico'
import { apiService } from '../services/api'

const MESES_ABR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const PROD_NAO_ASSOCIADA_ID = '00000000-0000-0000-0000-000000000001'

const fmtNum = (v, dec) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtBRL = (v) => {
  const n = Number(v)
  const s = Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${s})` : s
}
const FORMATOS = {
  brl:  fmtBRL,
  num1: (v) => fmtNum(v, 1),
  num2: (v) => fmtNum(v, 2),
  pct:  (v) => fmtNum(v, 2) + '%',
}

// Monta as seções (uma por origem do valor) com o cálculo mês a mês do funcionário.
// Cada linha de meta recebe um _tipo ('MECANICO' | 'CONSULTOR' | 'PECAS') da tela de origem.
function montarSecoes(linhas, { diasUteis = {}, refs = null } = {}) {
  const porTipo = (t) => {
    const a = Array(12).fill(null)
    linhas.filter(l => l._tipo === t).forEach(l => { a[l.mes - 1] = l })
    return a
  }
  const linha = (label, formula, valores, fmt, { soma = false, totalFn = null, destaque = false } = {}) =>
    ({ label, formula, valores, fmt, soma, totalFn, destaque })
  const dos = (arr, fn) => arr.map(r => (r ? fn(r) : null))
  const secoes = []

  const mec = porTipo('MECANICO')
  if (mec.some(Boolean)) {
    const semAssoc = mec.find(Boolean).colaborador_id === PROD_NAO_ASSOCIADA_ID
    const v = dos(mec, r => valoresMetaMecanico(r))
    if (semAssoc) {
      secoes.push({ titulo: 'Mecânico — Produtivo Não Associado', linhas: [
        linha('Meta Serviços (R$)', 'valor lançado manualmente', dos(v, x => x.meta_servicos), 'brl', { soma: true }),
        linha('Meta Peças (R$)', 'valor lançado manualmente', dos(v, x => x.meta_pecas), 'brl', { soma: true }),
        linha('Meta Total (R$)', 'Meta Serviços + Meta Peças', dos(v, x => x.meta_servicos + x.meta_pecas), 'brl', { soma: true, destaque: true }),
      ] })
    } else {
      const hd = dos(mec, r => Number(r.horas_disponiveis) || 0)
      const prod = dos(mec, r => Number(r.produtividade) || 0)
      secoes.push({ titulo: 'Mecânico', linhas: [
        linha('Dias Úteis', 'calendário da empresa', mec.map((r, i) => (r ? Number(diasUteis[i + 1]) || 0 : null)), 'num1', { soma: true }),
        linha('Dias a Trabalhar', 'dias a trabalhar informados na meta do mecânico', dos(mec, r => Number(r.dias_uteis_reais) || 0), 'num1', { soma: true }),
        linha('Horas Disponíveis', 'Dias a Trabalhar × 8 horas', hd, 'num1', { soma: true }),
        linha('Produtividade (%)', 'definida na meta do mecânico', prod, 'pct'),
        linha('Horas Meta', 'Horas Disponíveis × Produtividade', hd.map((h, i) => (h == null ? null : h * prod[i] / 100)), 'num2', { soma: true }),
        linha('Valor Hora (R$)', 'definido na meta do mecânico', dos(mec, r => Number(r.valor_hora) || 0), 'brl'),
        linha('Meta Serviços (R$)', 'Horas Meta × Valor Hora, arredondado para real inteiro', dos(v, x => x.meta_servicos), 'brl', { soma: true }),
        linha('Coef. Peças', 'definido na meta do mecânico', dos(mec, r => Number(r.coef_pecas) || 0), 'num2'),
        linha('Meta Peças (R$)', 'Meta Serviços × Coef. Peças, sem arredondar', dos(v, x => x.meta_pecas), 'brl', { soma: true }),
        linha('Meta Total (R$)', 'Meta Serviços + Meta Peças', dos(v, x => x.meta_servicos + x.meta_pecas), 'brl', { soma: true, destaque: true }),
      ] })
    }
  }

  const cons = porTipo('CONSULTOR')
  if (cons.some(Boolean)) {
    const pct = dos(cons, r => Number(r.percentual) || 0)
    const ref = cons.map((r, i) => (r ? (refs?.[i] || { pecas: 0, servicos: 0, terceiros: 0 }) : null))
    const arred = (x) => Math.round((Number(x) || 0) * 100 + 1e-7) / 100
    const metaPecas = ref.map((x, i) => (x == null ? null : arred(x.pecas * pct[i] / 100)))
    const metaServ = ref.map((x, i) => (x == null ? null : arred((x.servicos + x.terceiros) * pct[i] / 100)))
    secoes.push({ titulo: 'Consultor (distribuição)', linhas: [
      linha('Ref. Peças (R$)', 'Peças do setor (Mecânica ou Funilaria/Pintura) no mês', dos(ref, x => x.pecas), 'brl', { soma: true }),
      linha('Ref. Serviços (R$)', 'Serviços do setor (Mecânica ou Funilaria/Pintura) no mês', dos(ref, x => x.servicos), 'brl', { soma: true }),
      linha('Ref. Terceiros (R$)', 'Metas de Terceiros da empresa, somadas aos serviços (não têm peças)', dos(ref, x => x.terceiros), 'brl', { soma: true }),
      linha('Ref. Total (R$)', 'Ref. Peças + Ref. Serviços + Ref. Terceiros', dos(ref, x => x.pecas + x.servicos + x.terceiros), 'brl', { soma: true, destaque: true }),
      linha('% deste consultor', 'parcela do setor atribuída ao consultor', pct, 'pct'),
      linha('Meta Peças (R$)', 'Ref. Peças × %', metaPecas, 'brl', { soma: true }),
      linha('Meta Serviços (R$)', '(Ref. Serviços + Ref. Terceiros) × %', metaServ, 'brl', { soma: true }),
      linha('Meta Total (R$)', 'Meta Peças + Meta Serviços', metaPecas.map((x, i) => (x == null ? null : x + metaServ[i])), 'brl', { soma: true, destaque: true }),
    ] })
  }

  const pec = porTipo('PECAS')
  if (pec.some(Boolean)) {
    const meta = dos(pec, r => Number(r.meta_faturamento) || 0)
    const dias = dos(pec, r => Number(r.dias_uteis_reais) || 0)
    const somaMeta = meta.reduce((a, x) => a + (x || 0), 0)
    const somaDias = dias.reduce((a, x) => a + (x || 0), 0)
    secoes.push({ titulo: 'Peças', linhas: [
      linha('Meta (R$)', 'valor lançado', meta, 'brl', { soma: true, destaque: true }),
      linha('Dias Úteis', 'calendário da empresa', dias, 'num1', { soma: true }),
      linha('Média Diária (R$)', 'Meta ÷ Dias Úteis',
        meta.map((m, i) => (m == null ? null : (dias[i] > 0 ? m / dias[i] : 0))), 'brl',
        { totalFn: () => (somaDias > 0 ? somaMeta / somaDias : 0) }),
    ] })
  }
  return secoes
}

// Ícone de informação: o texto aparece ao passar o mouse. Posição "fixed" para não ser cortado pelo scroll da tabela.
function InfoTip({ texto }) {
  const [pos, setPos] = useState(null)
  return (
    <span
      className="inline-flex text-slate-400 hover:text-indigo-600 cursor-help shrink-0"
      onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); setPos({ x: r.left, y: r.bottom + 6 }) }}
      onMouseLeave={() => setPos(null)}
    >
      <Info size={13} />
      {pos && (
        <span
          style={{ position: 'fixed', left: pos.x, top: pos.y }}
          className="z-[60] w-60 bg-slate-800 text-white text-[11px] font-normal leading-snug rounded-md px-2.5 py-1.5 shadow-lg whitespace-normal pointer-events-none"
        >
          {texto}
        </span>
      )}
    </span>
  )
}

// dados: { nome, empresa, ano, linhas } — linhas são as linhas de meta (com _tipo) do funcionário.
export default function CalculoFuncionarioModal({ dados, onClose }) {
  const [diasUteis, setDiasUteis] = useState({})
  useEffect(() => {
    let vivo = true
    if (dados.empresaId && dados.ano) {
      apiService.getDiasUteisPorMes(dados.empresaId, dados.ano).then(m => { if (vivo) setDiasUteis(m || {}) }).catch(() => {})
    }
    return () => { vivo = false }
  }, [dados.empresaId, dados.ano])
  const secoes = montarSecoes(dados.linhas, { diasUteis, refs: dados.refs })
  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Cálculo — {dados.nome}</h2>
            <p className="text-xs text-slate-500">{dados.empresa} · {dados.ano}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="overflow-auto p-6 space-y-6">
          {secoes.length === 0 && <p className="text-sm text-slate-400">Sem dados de cálculo para este funcionário no período.</p>}
          {secoes.map(sec => (
            <div key={sec.titulo}>
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-2">{sec.titulo}</span>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="border-separate border-spacing-0 text-xs" style={{ minWidth: '1100px' }}>
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 w-64">Campo</th>
                      {MESES_ABR.map(m => <th key={m} className="px-2 py-2 text-right font-semibold text-slate-600">{m}</th>)}
                      <th className="px-2 py-2 text-right font-semibold text-indigo-700 bg-indigo-50">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.linhas.map(l => {
                      const total = l.soma ? l.valores.reduce((a, x) => a + (x || 0), 0) : (l.totalFn ? l.totalFn() : null)
                      return (
                        <tr key={l.label} className={l.destaque ? 'bg-indigo-50/60' : ''}>
                          <td className="px-3 py-1.5 border-t border-slate-100 whitespace-nowrap">
                            <div className={`flex items-center gap-1.5 ${l.destaque ? 'font-bold text-indigo-800' : 'font-semibold text-slate-700'}`}>
                              {l.label}
                              <InfoTip texto={l.formula} />
                            </div>
                          </td>
                          {l.valores.map((x, i) => (
                            <td key={i} className={`px-2 py-1.5 text-right font-mono whitespace-nowrap text-slate-800 border-t border-slate-100 ${l.destaque ? 'font-bold' : ''}`}>
                              {x == null ? <span className="text-slate-300">—</span> : FORMATOS[l.fmt](x)}
                            </td>
                          ))}
                          <td className="px-2 py-1.5 text-right font-mono whitespace-nowrap bg-indigo-50 text-indigo-800 font-bold border-t border-slate-100">
                            {total == null ? '—' : FORMATOS[l.fmt](total)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end px-6 py-3 border-t border-slate-200">
          <button onClick={onClose} className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors">Fechar</button>
        </div>
      </div>
    </div>
  )
}
