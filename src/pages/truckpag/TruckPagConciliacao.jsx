import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { RefreshCw, AlertTriangle, Filter, ChevronDown, ChevronUp, X, Link2, Link2Off, ArrowLeftRight, Wallet, Settings, List, HelpCircle, Info, Truck } from 'lucide-react'
import { apiService } from '../../services/api'
import TruckPagNav from './TruckPagNav'
import TruckPagConfigModal from './TruckPagConfigModal'
import TruckPagRelatorioDivergencias from './TruckPagRelatorioDivergencias'
import TruckPagDataArquivo from './TruckPagDataArquivo'
import TruckPagRepasseDetalheModal from './TruckPagRepasseDetalheModal'
import TruckPagRegrasModal from './TruckPagRegrasModal'
import { fmtMoeda, fmtData, sincronizarTudoTruckPag, conciliarRepassesCreditos, filtrarCreditosPorTipoSaldo } from './truckpagUtils'

const TIPO_INFO = {
  repasse: { label: 'Repasse Fabricante', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: ArrowLeftRight },
  credito: { label: 'Saldo Concessionária', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: Wallet },
}

export default function TruckPagConciliacao() {
  const [creditos, setCreditos] = useState([])
  const [repasses, setRepasses] = useState([])
  const [tiposSaldo, setTiposSaldo] = useState([])
  const [tolerancia, setTolerancia] = useState(0.02)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [erro, setErro] = useState(null)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)
  const [regrasAberto, setRegrasAberto] = useState(false)
  const [detalheRepasse, setDetalheRepasse] = useState(null) // { empresa, data, linhas } | null
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroTipo, setFiltroTipo] = useState(null) // null | 'repasse' | 'credito'
  const [filtroConciliado, setFiltroConciliado] = useState(null) // null | true | false
  const [sortDir, setSortDir] = useState('desc')

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const [c, r, t, tol] = await Promise.all([
        apiService.getTruckPagCreditos(),
        apiService.getTruckPagRepasses({ dataInicio: dataInicio || undefined, dataFim: dataFim || undefined }),
        apiService.getTruckPagTiposSaldo(),
        apiService.getTruckPagToleranciaConciliacao(),
      ])
      setCreditos(c)
      setRepasses(r)
      setTiposSaldo(t)
      setTolerancia(tol)
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim])

  useEffect(() => { carregar() }, [carregar])

  // Sincroniza as 3 fontes TruckPag (títulos, créditos, repasses) de uma vez, não só esta tela.
  const sincronizar = useCallback(async () => {
    setSincronizando(true)
    setErro(null)
    try {
      const resultados = await sincronizarTudoTruckPag()
      const falhas = resultados.filter(r => !r.ok)
      if (falhas.length > 0) setErro(falhas.map(f => f.erro).join(' | '))
      await carregar()
    } catch (e) {
      setErro(e.message || String(e))
    } finally {
      setSincronizando(false)
    }
  }, [carregar])

  // Filtro configurável (botão "Configurações" → Tipo de Saldo): só entram créditos cuja
  // Observação contenha algum dos padrões cadastrados. Sem padrões cadastrados, não filtra.
  const creditosFiltrados = useMemo(() => filtrarCreditosPorTipoSaldo(creditos, tiposSaldo), [creditos, tiposSaldo])

  // Concilia repasses × créditos: agrupa repasses por estabelecimento+data (cada grupo é um
  // depósito bancário) e casa o total com o valor de um crédito não identificado.
  const { grupos, creditoParaGrupo } = useMemo(() => conciliarRepassesCreditos(repasses, creditosFiltrados, tolerancia), [repasses, creditosFiltrados, tolerancia])

  // Linha por linha: cada depósito de repasse vira uma linha "Repasse Fabricante" e cada crédito uma
  // linha "Saldo Concessionária" — usado só pros totais dos cards (a tabela em si é montada em
  // blocos, ver abaixo, pra poder juntar repasse + crédito conciliados lado a lado).
  const linhas = useMemo(() => {
    const linhasRepasse = grupos.map(g => ({ tipo: 'repasse', valorLiquido: g.total, vinculado: !!g.creditoVinculado }))
    const linhasCredito = creditosFiltrados.map(c => ({ tipo: 'credito', valorLiquido: c.valor, vinculado: !!creditoParaGrupo.get(c.id) }))
    return [...linhasRepasse, ...linhasCredito]
  }, [grupos, creditosFiltrados, creditoParaGrupo])

  // Monta blocos: o crédito vinculado (Saldo Concessionária) vem primeiro, seguido imediatamente
  // pelo depósito de repasse que ele concilia (as duas linhas juntas, uma abaixo da outra);
  // repasses sem crédito e créditos sem repasse ficam como bloco de 1 linha só. `conciliado`
  // marca o bloco inteiro pro ícone.
  const blocos = useMemo(() => {
    const usados = new Set()
    const lista = []
    for (const g of grupos) {
      const linhasBloco = []
      if (g.creditoVinculado) {
        const c = g.creditoVinculado
        usados.add(c.id)
        linhasBloco.push({
          tipo: 'credito', key: `c-${c.id}`, empresa: c.empresa_desc, codigoEmpresa: '',
          contaGerencial: c.conta_gerencial_desc, codigoTesouraria: c.tesouraria_codigo, observacao: c.observacao,
          data: c.data_caixa, valorBruto: null, valorTaxa: null, valorLiquido: c.valor,
          saldoDocto: c.saldo_docto_controlado ?? null,
        })
      }
      linhasBloco.push({
        tipo: 'repasse', key: `r-${g.chave}`, empresa: g.empresa, codigoEmpresa: g.codigoEmpresa,
        contaGerencial: '', codigoTesouraria: '', observacao: '', data: g.data_pagamento,
        valorBruto: g.totalBruto, valorTaxa: g.totalTaxa, valorLiquido: g.total,
        saldoDocto: null,
        detalhe: g.linhas,
      })
      lista.push({ chave: g.chave, dataOrdenacao: g.data_pagamento || '', conciliado: !!g.creditoVinculado, linhas: linhasBloco })
    }
    for (const c of creditosFiltrados) {
      if (usados.has(c.id)) continue
      lista.push({
        chave: `c-${c.id}`, dataOrdenacao: c.data_caixa || '', conciliado: false,
        linhas: [{
          tipo: 'credito', key: `c-${c.id}`, empresa: c.empresa_desc, codigoEmpresa: '',
          contaGerencial: c.conta_gerencial_desc, codigoTesouraria: c.tesouraria_codigo, observacao: c.observacao,
          data: c.data_caixa, valorBruto: null, valorTaxa: null, valorLiquido: c.valor,
          saldoDocto: c.saldo_docto_controlado ?? null,
        }],
      })
    }
    return lista
  }, [grupos, creditosFiltrados])

  // Filtro por tipo (cards clicáveis): dentro de cada bloco, mostra só as linhas do tipo
  // escolhido — quebra o pareamento de propósito, já que o usuário quer isolar um lado só.
  // Filtro por conciliação (card "Vinculados"): mostra só blocos conciliados ou só os não
  // conciliados, dependendo do estado do clique (null | true | false).
  const blocosFiltrados = useMemo(() => {
    let arr = blocos
    if (filtroConciliado !== null) arr = arr.filter(b => b.conciliado === filtroConciliado)
    if (filtroTipo) {
      arr = arr
        .map(b => ({ ...b, linhas: b.linhas.filter(l => l.tipo === filtroTipo) }))
        .filter(b => b.linhas.length > 0)
    }
    return arr
  }, [blocos, filtroTipo, filtroConciliado])

  const blocosOrdenados = useMemo(() => {
    const arr = [...blocosFiltrados]
    arr.sort((a, b) => {
      const cmp = String(a.dataOrdenacao).localeCompare(String(b.dataOrdenacao))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [blocosFiltrados, sortDir])

  // Vinculados e não vinculados ficam em tabelas separadas (não vinculado é "o problema a
  // resolver", fica mais fácil de bater o olho numa lista à parte do que espalhado no meio dos
  // pares certos).
  const blocosVinculados = useMemo(() => blocosOrdenados.filter(b => b.conciliado), [blocosOrdenados])
  const blocosNaoVinculados = useMemo(() => blocosOrdenados.filter(b => !b.conciliado), [blocosOrdenados])

  const linhasRepasseAtual = linhas.filter(l => l.tipo === 'repasse')
  const linhasCreditoAtual = linhas.filter(l => l.tipo === 'credito')
  const qtdCredito = linhasCreditoAtual.length
  const qtdVinculados = linhas.filter(l => l.vinculado).length
  const valorCredito = linhasCreditoAtual.reduce((s, l) => s + (l.valorLiquido || 0), 0)
  const saldoDoctoTotal = creditosFiltrados.reduce((s, c) => s + (c.saldo_docto_controlado || 0), 0)
  const valorVinculado = linhasRepasseAtual.filter(l => l.vinculado).reduce((s, l) => s + (l.valorLiquido || 0), 0)
  // "Não conciliado" é só o lado do Saldo Concessionária (crédito) que não bateu com nenhum
  // repasse — não soma mais o lado do repasse, pra o card representar exclusivamente o crédito
  // ainda não identificado.
  const linhasCreditoNaoVinculado = linhasCreditoAtual.filter(l => !l.vinculado)
  const qtdNaoVinculados = linhasCreditoNaoVinculado.length
  const valorNaoVinculado = linhasCreditoNaoVinculado.reduce((s, l) => s + (l.valorLiquido || 0), 0)
  const filtroAtivo = !!(dataInicio || dataFim)

  const colunas = [
    { key: 'empresa', label: 'Empresa' },
    { key: 'codigoEmpresa', label: 'Código Empresa' },
    { key: 'data', label: 'Data', formatar: fmtData },
    { key: 'observacao', label: 'Observação' },
    { key: 'valorBruto', label: 'Valor Bruto', numerico: true, formatar: (v) => v === null ? '—' : fmtMoeda(v) },
    { key: 'valorTaxa', label: 'Valor Taxa', numerico: true, formatar: (v) => v === null ? '—' : fmtMoeda(v) },
    { key: 'valorLiquido', label: 'Valor Líquido', numerico: true, formatar: fmtMoeda },
    { key: 'saldoDocto', label: 'Saldo Atual', numerico: true, formatar: (v) => v === null ? '—' : fmtMoeda(v) },
    { key: 'contaGerencial', label: 'Conta Gerencial' },
    { key: 'codigoTesouraria', label: 'Código Tesouraria' },
  ]

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              TruckPag a Receber
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <TruckPagDataArquivo chave="creditos" />
            <button onClick={sincronizar} disabled={sincronizando} title={sincronizando ? 'Atualizando...' : 'Atualizar todas as abas do SharePoint'} className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md shadow-sm transition-colors disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => setConfigAberto(true)} title="Configurações" className="flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-50 p-2 rounded-md transition-colors">
              <Settings className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setRegrasAberto(true)} title="Regras de conciliação" className="flex items-center justify-center p-2 rounded-md text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-colors">
              <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
            </button>
            <TruckPagRelatorioDivergencias />
          </div>
        </div>
        <TruckPagNav />
      </div>
      <TruckPagRegrasModal aberto={regrasAberto} onFechar={() => setRegrasAberto(false)} variante="repasses-creditos" />

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setFiltroTipo(p => p === 'credito' ? null : 'credito')}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-purple-50 border-purple-200 ${filtroTipo === 'credito' ? 'ring-2 ring-offset-1 ring-purple-300 shadow-md' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-purple-100"><Wallet className="h-3.5 w-3.5 text-purple-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-purple-500">Saldo Concessionária</p>
          </div>
          <p className="text-2xl font-bold text-purple-700 leading-none">{fmtMoeda(valorCredito)}</p>
          <p className="text-[10px] text-purple-500 mt-0.5">{qtdCredito} crédito(s)</p>
          {saldoDoctoTotal !== 0 && (
            <p className="text-[10px] text-purple-400 mt-1">Saldo Atual: <span className="font-bold text-purple-600">{fmtMoeda(saldoDoctoTotal)}</span></p>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFiltroConciliado(p => p === true ? null : true)}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-emerald-50 border-emerald-200 ${filtroConciliado === true ? 'ring-2 ring-offset-1 ring-emerald-300 shadow-md' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-emerald-100"><Link2 className="h-3.5 w-3.5 text-emerald-600" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-500">Conciliados</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700 leading-none">{fmtMoeda(valorVinculado)}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{qtdVinculados} de {linhas.length} linha(s)</p>
        </button>
        <button
          type="button"
          onClick={() => setFiltroConciliado(p => p === false ? null : false)}
          className={`text-left rounded-lg border p-4 shadow-sm transition-all hover:shadow-md bg-red-50 border-red-200 ${filtroConciliado === false ? 'ring-2 ring-offset-1 ring-red-300 shadow-md' : ''}`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-1 rounded bg-red-100"><Link2Off className="h-3.5 w-3.5 text-red-500" /></div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Não conciliado</p>
          </div>
          <p className="text-2xl font-bold text-red-700 leading-none">{fmtMoeda(valorNaoVinculado)}</p>
          <p className="text-[10px] text-red-500 mt-0.5">{qtdNaoVinculados} de {qtdCredito} crédito(s)</p>
        </button>
      </div>


      {loading ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex items-center justify-center">
          <RefreshCw className="h-6 w-6 text-slate-300 animate-spin" />
        </div>
      ) : blocosOrdenados.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-2">
          <Link2 className="h-6 w-6 text-slate-400" />
          <p className="text-sm font-semibold text-slate-500">Nenhum dado sincronizado ainda</p>
          <p className="text-xs text-slate-400">Clique em "Atualizar do SharePoint" para carregar créditos e repasses.</p>
        </div>
      ) : (
        <>
          {blocosVinculados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-emerald-700">Conciliados</h2>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">{blocosVinculados.length}</span>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="p-3 whitespace-nowrap">Tipo</th>
                    <th className="p-3 whitespace-nowrap text-center">Detalhes</th>
                    {colunas.map(c => (
                      <th
                        key={c.key}
                        onClick={c.key === 'data' ? () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc')) : undefined}
                        className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right' : ''} ${c.key === 'data' ? 'cursor-pointer select-none hover:bg-slate-100 hover:text-slate-600 transition-colors' : ''}`}
                      >
                        <span className={`flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                          {c.label}
                          {c.key === 'data' && <span className="text-slate-300">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-xs font-medium text-slate-700">
                  {blocosVinculados.map((bloco) => (
                    <React.Fragment key={bloco.chave}>
                      {bloco.linhas.map((l, iLinha) => {
                        const tipoInfo = TIPO_INFO[l.tipo]
                        const ultimaDoBloco = iLinha === bloco.linhas.length - 1
                        return (
                          <tr
                            key={l.key}
                            className={`hover:bg-slate-50/70 transition-colors ${ultimaDoBloco ? 'border-b border-slate-200' : 'border-b border-dashed border-slate-100'}`}
                          >
                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tipoInfo.cls}`}>
                                <tipoInfo.icon className="h-3 w-3" /> {tipoInfo.label}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap text-center">
                              {l.tipo === 'repasse' && l.detalhe && (
                                <button
                                  onClick={() => setDetalheRepasse({ empresa: l.empresa, codigoEmpresa: l.codigoEmpresa, data: l.data, linhas: l.detalhe })}
                                  title="Ver linhas do repasse"
                                  className="text-slate-400 hover:text-blue-600 transition-colors"
                                >
                                  <List className="h-4 w-4" />
                                </button>
                              )}
                            </td>
                            {colunas.map(c => (
                              <td key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right font-semibold text-slate-900' : ''}`}>
                                {c.formatar ? c.formatar(l[c.key]) : (l[c.key] || '—')}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {blocosNaoVinculados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link2Off className="h-4 w-4 text-red-500" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-red-600">Não conciliados</h2>
                <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">{blocosNaoVinculados.length}</span>
              </div>
              <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-x-auto custom-scrollbar-light">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-red-50/60 border-b border-red-200 text-red-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3 whitespace-nowrap">Tipo</th>
                      <th className="p-3 whitespace-nowrap text-center">Detalhes</th>
                      {colunas.map(c => (
                        <th
                          key={c.key}
                          onClick={c.key === 'data' ? () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc')) : undefined}
                          className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right' : ''} ${c.key === 'data' ? 'cursor-pointer select-none hover:bg-red-100 hover:text-red-600 transition-colors' : ''}`}
                        >
                          <span className={`flex items-center gap-1 ${c.numerico ? 'justify-end' : ''}`}>
                            {c.label}
                            {c.key === 'data' && <span className="text-red-300">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-xs font-medium text-slate-700">
                    {blocosNaoVinculados.map((bloco) => (
                      <React.Fragment key={bloco.chave}>
                        {bloco.linhas.map((l) => {
                          const tipoInfo = TIPO_INFO[l.tipo]
                          return (
                            <tr key={l.key} className="hover:bg-red-50/40 transition-colors border-b border-slate-100">
                              <td className="p-3 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${tipoInfo.cls}`}>
                                  <tipoInfo.icon className="h-3 w-3" /> {tipoInfo.label}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap text-center">
                                {l.tipo === 'repasse' && l.detalhe && (
                                  <button
                                    onClick={() => setDetalheRepasse({ empresa: l.empresa, codigoEmpresa: l.codigoEmpresa, data: l.data, linhas: l.detalhe })}
                                    title="Ver linhas do repasse"
                                    className="text-slate-400 hover:text-blue-600 transition-colors"
                                  >
                                    <List className="h-4 w-4" />
                                  </button>
                                )}
                              </td>
                              {colunas.map(c => (
                                <td key={c.key} className={`p-3 whitespace-nowrap ${c.numerico ? 'text-right font-semibold text-slate-900' : ''}`}>
                                  {c.formatar ? c.formatar(l[c.key]) : (l[c.key] || '—')}
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {configAberto && (
        <TruckPagConfigModal onClose={() => { setConfigAberto(false); carregar() }} />
      )}

      {detalheRepasse && (
        <TruckPagRepasseDetalheModal
          empresa={detalheRepasse.empresa}
          codigoEmpresa={detalheRepasse.codigoEmpresa}
          data={detalheRepasse.data}
          linhas={detalheRepasse.linhas}
          onClose={() => setDetalheRepasse(null)}
        />
      )}
    </div>
  )
}
