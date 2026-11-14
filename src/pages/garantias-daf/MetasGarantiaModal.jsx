import React, { useEffect, useState } from 'react'
import { Target, X, Loader2, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { apiService } from '../../services/api'

// Metas dos indicadores do SETOR GARANTIA (Matriz KPIs › Bloco 3 - Serviços), por empresa — engrenagem das
// Regras do Sistema de Garantias DAF. Mesmo modelo das Metas dos indicadores da Auditoria O.S. Aberta:
// meta geral (vale para os meses em branco) e meta por mês, cadastrada ano a ano. Quantidade (O.S. ou
// títulos), menor é melhor. "Todas as empresas" na Matriz = soma das metas das lojas.
// Gravado em gar_metas_indicadores (geral = ano 0, mês 0).
export const INDICADORES_META_GARANTIA = [
  { campo: 'digitacaoAtrasada',      unidade: 'O.S.',    curto: 'Digit. atrasada',   titulo: 'Garantias com Digitação Atrasada' },
  { campo: 'aguardandoForaPrazo',    unidade: 'O.S.',    curto: 'Aguard. DAF',       titulo: 'Garantias Aguardando Aprovação DAF (fora do prazo)' },
  { campo: 'aprovadaSemFaturamento', unidade: 'O.S.',    curto: 'Aprov. s/ fat.',    titulo: 'Garantias Aprovada sem Faturamento' },
  { campo: 'recusadaForaPrazo',      unidade: 'O.S.',    curto: 'Recusadas',         titulo: 'Garantias Recusadas (fora do prazo)' },
  { campo: 'titulosVencidos',        unidade: 'títulos', curto: 'A receber venc.',   titulo: 'Garantias a Receber Vencidas' },
]
const EMPRESAS = ['CAMPO GRANDE', 'DOURADOS', 'TRÊS LAGOAS', 'CHAPADÃO DO SUL']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const paraTexto = (v) => (v != null && v !== '' ? String(Number(v)).replace('.', ',') : '')
// '' → null; número >= 0 → número; outro → NaN (inválido)
const paraNumero = (txt) => {
  const t = String(txt ?? '').trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}
const linhaVazia = () => Object.fromEntries(INDICADORES_META_GARANTIA.map(i => [i.campo, '']))

export default function MetasGarantiaModal({ usuario, onClose }) {
  const [empresa, setEmpresa] = useState(EMPRESAS[0])
  const [ano, setAno] = useState(new Date().getFullYear())
  // rascunho[empresa] = { geral: {campo: txt}, anos: { 2026: [12 × {campo: txt}] } }
  const [rascunho, setRascunho] = useState({})
  const [original, setOriginal] = useState({}) // mesmo formato: o que veio do banco (para saber o que apagar)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    apiService.getGarantiaMetas()
      .then(lista => {
        const r = {}
        for (const e of EMPRESAS) r[e] = { geral: linhaVazia(), anos: {} }
        for (const l of lista) {
          const alvo = r[l.empresa]
          if (!alvo) continue
          if (Number(l.ano) === 0) { alvo.geral[l.indicador] = paraTexto(l.meta); continue }
          if (!alvo.anos[l.ano]) alvo.anos[l.ano] = Array.from({ length: 12 }, linhaVazia)
          alvo.anos[l.ano][l.mes - 1][l.indicador] = paraTexto(l.meta)
        }
        setRascunho(r)
        setOriginal(JSON.parse(JSON.stringify(r)))
      })
      .catch(err => setErro('Erro ao carregar as metas: ' + (err.message || String(err))))
      .finally(() => setCarregando(false))
  }, [])

  const atual = rascunho[empresa]
  const mesesAno = atual?.anos?.[ano] || Array.from({ length: 12 }, linhaVazia)
  const alterarGeral = (campo, v) => setRascunho(p => ({ ...p, [empresa]: { ...p[empresa], geral: { ...p[empresa].geral, [campo]: v } } }))
  const alterarMes = (idx, campo, v) => setRascunho(p => {
    const e = p[empresa]
    const linhas = (e.anos[ano] || Array.from({ length: 12 }, linhaVazia)).map((l, i) => (i === idx ? { ...l, [campo]: v } : l))
    return { ...p, [empresa]: { ...e, anos: { ...e.anos, [ano]: linhas } } }
  })
  // Repete Janeiro nos outros 11 meses do ano aberto (desta empresa)
  const copiarJaneiro = () => setRascunho(p => {
    const e = p[empresa]
    const jan = (e.anos[ano] || [])[0] || linhaVazia()
    return { ...p, [empresa]: { ...e, anos: { ...e.anos, [ano]: Array.from({ length: 12 }, () => ({ ...jan })) } } }
  })
  // Copia geral + todos os anos desta empresa para as outras três
  const copiarParaTodas = () => {
    if (!window.confirm(`Copiar as metas de ${empresa} (geral e por mês) para as outras empresas? As metas já digitadas nelas serão substituídas.`)) return
    setRascunho(p => Object.fromEntries(EMPRESAS.map(e => [e, e === empresa ? p[e] : JSON.parse(JSON.stringify(p[empresa]))])))
  }

  const salvar = async () => {
    // Monta todas as linhas que mudaram (gravar ou apagar), validando os números
    const linhas = []
    for (const e of EMPRESAS) {
      const r = rascunho[e], o = original[e]
      for (const { campo, titulo } of INDICADORES_META_GARANTIA) {
        const v = r.geral[campo]
        if (v === (o.geral[campo] || '')) continue
        const n = paraNumero(v)
        if (Number.isNaN(n)) { setErro(`${e} — meta geral de ${titulo}: informe um número maior ou igual a zero.`); setEmpresa(e); return }
        linhas.push({ empresa: e, ano: 0, mes: 0, indicador: campo, meta: n })
      }
      for (const [a, meses] of Object.entries(r.anos)) {
        meses.forEach((l, idx) => {
          for (const { campo, titulo } of INDICADORES_META_GARANTIA) {
            const antes = o.anos?.[a]?.[idx]?.[campo] || ''
            if (l[campo] === antes) continue
            const n = paraNumero(l[campo])
            if (Number.isNaN(n)) throw Object.assign(new Error(`${e} — ${MESES[idx]}/${a}, ${titulo}: informe um número maior ou igual a zero.`), { empresa: e, ano: Number(a) })
            linhas.push({ empresa: e, ano: Number(a), mes: idx + 1, indicador: campo, meta: n })
          }
        })
      }
    }
    if (!linhas.length) { onClose(); return }
    setSalvando(true); setErro(null)
    try {
      await apiService.saveGarantiaMetas(linhas, usuario)
      onClose()
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }
  const salvarSeguro = () => salvar().catch(err => { setErro(err.message); if (err.empresa) { setEmpresa(err.empresa); setAno(err.ano) } })

  const inputCls = 'w-14 text-xs text-right p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20'
  const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() : -1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Target className="h-4 w-4 text-rose-600" /> Metas — Setor Garantia (Matriz KPIs)
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
          Meta em <strong>quantidade</strong> (não em dias): número máximo aceito de O.S. (ou de títulos, no A receber vencidas) em cada indicador, <strong>por empresa</strong>. Os prazos em dias ficam nas Regras. A Matriz usa a meta do{' '}
          <strong>mês</strong>; mês em branco usa a meta geral. "Todas as empresas" soma as metas das lojas.
        </p>
        {erro && <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erro}</div>}

        {/* Empresa */}
        <div className="flex flex-wrap items-center gap-1 mb-3">
          {EMPRESAS.map(e => (
            <button key={e} type="button" onClick={() => setEmpresa(e)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${e === empresa ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {e}
            </button>
          ))}
          <button type="button" onClick={copiarParaTodas} disabled={carregando}
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
            <Copy className="h-3.5 w-3.5" /> Copiar para as outras empresas
          </button>
        </div>

        {carregando || !atual ? (
          <p className="flex items-center gap-2 text-xs text-slate-400 py-10 justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Carregando metas...</p>
        ) : (
          <div className="overflow-auto pr-1 -mr-1">
            <table className="w-full text-xs border border-slate-200 rounded-md">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                <tr>
                  <th className="text-left p-2">
                    <span className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => setAno(a => a - 1)} title="Ano anterior" className="p-0.5 rounded hover:bg-slate-200"><ChevronLeft className="h-3.5 w-3.5" /></button>
                      <span className="text-slate-800 normal-case text-xs">{ano}</span>
                      <button type="button" onClick={() => setAno(a => a + 1)} title="Próximo ano" className="p-0.5 rounded hover:bg-slate-200"><ChevronRight className="h-3.5 w-3.5" /></button>
                    </span>
                  </th>
                  {INDICADORES_META_GARANTIA.map(i => (
                    <th key={i.campo} className="text-right p-2" title={`${i.titulo} — quantidade de ${i.unidade}`}>
                      {i.curto}
                      <span className="block normal-case font-semibold text-slate-400">qtd. {i.unidade}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-slate-50">
                  <td className="p-1.5 pl-2 font-bold text-slate-700">Meta geral</td>
                  {INDICADORES_META_GARANTIA.map(i => (
                    <td key={i.campo} className="p-1.5 text-right">
                      <input type="text" inputMode="decimal" value={atual.geral[i.campo]} placeholder="—" aria-label={`Meta geral — ${i.titulo}`}
                        onChange={e => alterarGeral(i.campo, e.target.value)} className={inputCls} />
                    </td>
                  ))}
                </tr>
                {mesesAno.map((l, idx) => (
                  <tr key={idx} className={idx === mesAtual ? 'bg-amber-50/60' : ''}>
                    <td className="p-1.5 pl-2 font-semibold text-slate-700">{MESES[idx]}</td>
                    {INDICADORES_META_GARANTIA.map(i => (
                      <td key={i.campo} className="p-1.5 text-right">
                        <input type="text" inputMode="decimal" value={l[i.campo]} placeholder={atual.geral[i.campo] || '—'}
                          title="Em branco = meta geral" aria-label={`${MESES[idx]}/${ano} — ${i.titulo}`}
                          onChange={e => alterarMes(idx, i.campo, e.target.value)} className={inputCls} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={copiarJaneiro}
              className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors">
              <Copy className="h-3.5 w-3.5" /> Copiar Janeiro para todos os meses de {ano} ({empresa})
            </button>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
          <button onClick={onClose} disabled={salvando}
            className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
            Cancelar
          </button>
          <button onClick={salvarSeguro} disabled={salvando || carregando}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
            {salvando && <Loader2 className="h-3 w-3 animate-spin" />}
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
