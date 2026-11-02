import React, { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { fmtBRL } from '../utils/comissoesFormat'
import VisualizadorAnexosPj from './VisualizadorAnexosPj'
import { gruposDeCabecalho, fmtCnpj } from '../utils/notaFiscalPj'

// Tabela "Nota Fiscal — Prestação de Serviços": regras do prestador nas linhas, empresas (marca /
// agrupamento / CNPJ) nas colunas. Usada em Prestadores de Serviços e no Visualizar do Processamento.
// anexos (opcional): anexos do prestador no mês (pj_anexos) — botão "Visualizar anexos" abaixo da Emissão.
// abaixoEmissao (opcional): conteúdo no lugar dos botões (ex: quadros de anexos do Processamento).
// acaoLinha (opcional): (linha) => botão ao lado da descrição (ex: calculadora do Detalhe do Cálculo).
export default function TabelaNotaFiscal({ nf, anexos, abaixoEmissao, acaoLinha }) {
  const [verAnexos, setVerAnexos] = useState(false)
  if (!nf) return <p className="text-xs text-slate-400">Sem valores calculados para este prestador.</p>
  const em = nf.emissao
  return (
    <div className="space-y-4">
    {/* Quanto emitir e pra qual CNPJ — conforme o cadastro do funcionário (aba PJ). */}
    {em?.notas?.length > 0 && (
      <div className="rounded-md border border-emerald-200 overflow-hidden">
        <div className="px-3 py-1.5 bg-emerald-50 text-xs font-bold text-emerald-800">Emissão das Notas Fiscais</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-slate-400">
              <th className="px-3 py-1.5 text-left">Emitir para</th>
              <th className="px-3 py-1.5 text-left">CNPJ</th>
              <th className="px-3 py-1.5 text-left">Referente a</th>
              <th className="px-3 py-1.5 text-right">Valor da NF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {em.notas.map((n, i) => (
              <tr key={i}>
                <td className="px-3 py-1.5 font-semibold text-slate-800">{n.nome}</td>
                <td className="px-3 py-1.5 font-mono text-slate-600">{fmtCnpj(n.cnpj)}</td>
                <td className="px-3 py-1.5 text-[11px] text-slate-500">{n.referente.join(', ')}</td>
                <td className="px-3 py-1.5 text-right font-mono font-bold text-emerald-700">{fmtBRL(n.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
    {abaixoEmissao}
    {!abaixoEmissao && Array.isArray(anexos) && (
      // Um botão por tipo, lado a lado: Notas Fiscais anexadas e Documentos das regras.
      <div className="flex items-center gap-2">
        {[['NF', 'Notas Fiscais anexadas'], ['DOCUMENTO', 'Documentos das regras']].map(([tipo, rotulo]) => {
          const lista = anexos.filter(a => a.tipo === tipo)
          return (
            <button key={tipo} type="button" onClick={() => setVerAnexos(tipo)} disabled={lista.length === 0}
              title={lista.length === 0 ? 'Nenhum arquivo anexado ainda' : `Visualizar: ${rotulo}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 bg-white hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed px-3 py-1.5 rounded-md">
              <Paperclip className="h-3.5 w-3.5" /> {rotulo} ({lista.length})
            </button>
          )
        })}
        {verAnexos && anexos.some(a => a.tipo === verAnexos) && (
          <VisualizadorAnexosPj anexos={anexos.filter(a => a.tipo === verAnexos)} onFechar={() => setVerAnexos(false)} />
        )}
      </div>
    )}
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr>
          <th />
          {gruposDeCabecalho(nf.colunas, 'marca').map((g, i) => (
            <th key={i} colSpan={g.span} className="px-2 py-1.5 text-center bg-blue-800 text-white font-bold border-x border-white">{g.rotulo}</th>
          ))}
          <th />
        </tr>
        <tr>
          <th />
          {gruposDeCabecalho(nf.colunas, 'agrupamento').map((g, i) => (
            <th key={i} colSpan={g.span} className="px-2 py-1 text-center bg-slate-200 text-slate-800 font-bold border-x border-white">{g.rotulo}</th>
          ))}
          <th />
        </tr>
        <tr className="text-[10px] text-slate-600">
          <th />
          {nf.colunas.map(c => (
            <th key={c.id} className="px-2 py-1.5 text-right font-semibold whitespace-nowrap">
              {c.nome}
              <div className="font-mono font-normal text-slate-400">{fmtCnpj(c.cnpj)}</div>
            </th>
          ))}
          <th className="px-2 py-1.5 text-right text-xs font-bold text-slate-900">TOTAL</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {nf.linhas.map((l, i) => (
          <tr key={i}>
            <td className={`px-2 py-1.5 font-semibold whitespace-nowrap ${l.total < 0 ? 'text-rose-700' : 'text-slate-800'}`}>
              {l.codigo && <span className="font-mono text-slate-400 mr-1.5">{l.codigo}</span>}{l.rotulo}{acaoLinha?.(l)}
            </td>
            {l.valores.map((v, j) => (
              <td key={j} className={`px-2 py-1.5 text-right font-mono ${v < 0 ? 'text-rose-600' : 'text-slate-700'}`}>{Math.round(v * 100) === 0 ? '-' : fmtBRL(v)}</td>
            ))}
            <td className={`px-2 py-1.5 text-right font-mono font-bold ${l.total < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{fmtBRL(l.total)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2 border-slate-800 bg-slate-100 font-bold">
          <td className="px-2 py-2 text-slate-900">Valor Total da Nota Fiscal</td>
          {nf.totaisColuna.map((v, j) => <td key={j} className="px-2 py-2 text-right font-mono text-slate-900">{fmtBRL(v)}</td>)}
          <td className="px-2 py-2 text-right font-mono bg-blue-900 text-white">{fmtBRL(nf.total)}</td>
        </tr>
      </tfoot>
    </table>
    </div>
  )
}
