import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Settings } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { Abas, BadgeClasse, BadgeMobilidade, BotaoInfo, btnSec, CardGrafico, eixo, fmtMil, fmtMoeda, fmtNum, fmtPct, NOME_REG, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const CAMPOS = ['loja', 'marca', 'grupo', 'fornecedor']

function TabelaResumo({ linhas, nome }) {
  return (
    <TabelaPecas rows={linhas} nomeArquivo={`curva-${nome}`} tamanhoPagina={10} cols={[
      { k: 'classe', t: 'Classe', render: r => (r.nome ? `${r.classe} — ${r.nome}` : r.classe) },
      { k: 'itens', t: 'Itens', fmt: 'num' }, { k: 'pct_itens', t: '% itens', fmt: 'pct' },
      { k: 'pct_faturamento', t: '% Curva de Venda', fmt: 'pct' },
      { k: 'valor_estoque', t: 'Valor em estoque', fmt: 'moeda' }, { k: 'pct_estoque', t: '% do estoque', fmt: 'pct' },
    ]} />
  )
}

function BlocoResumo({ titulo, linhas, info, rotulo = (l) => l.classe }) {
  return (
    <div className="relative bg-white border border-slate-200 rounded-lg p-3">
      <BotaoInfo titulo={titulo} info={info} />
      <p className="text-[11px] font-semibold text-slate-700 mb-2 pr-5">{titulo}</p>
      <div className={`grid gap-2 ${linhas.length > 3 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {linhas.map(l => (
          <div key={l.classe} className="rounded-md bg-slate-50 p-2">
            <p className="text-[10px] font-bold text-slate-500">{rotulo(l)}</p>
            <p className="text-base font-bold text-slate-900">{fmtNum(l.itens)}</p>
            <p className="text-[10px] text-slate-500">{fmtPct(l.pct_itens)} itens · {fmtMoeda(l.valor_estoque)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PecasClassificacao() {
  const sg = useSegmento()
  const { hasPermission } = useAuth()
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const { dados, carregando, erro, recarregar } = useTela('classificacao', filtros)
  const [aba, setAba] = useState('matriz')
  const [celula, setCelula] = useState(null)

  const itens = useMemo(() => (dados?.rows || []).filter(r => !celula || r.celula === celula), [dados, celula])
  const celulaInfo = dados?.matrizCompra?.find(m => m.celula === celula)
  const maxItens = Math.max(1, ...(dados?.matrizCompra || []).map(m => m.itens))
  const cfg = dados?.parametros || {}
  const baseVenda = { quantidade: 'quantidade', qtd_custo_aquisicao: 'quantidade × custo aquisição', qtd_custo_medio: 'quantidade × custo médio', qtd_custo_medio_contabil: 'quantidade × custo médio contábil', qtd_valor_base_venda: 'quantidade × valor base venda', meses_com_saida: 'quantidade de meses com saída' }[cfg.abc_base] || cfg.abc_base
  const nomePop = (cfg.c_popular_freq || []).map(f => ({ F: 'Alta', M: 'Média', R: 'Baixa' }[f])).join('/') || '—'

  return (
    <PaginaPecas icone={Layers} titulo="Classificação e Curvas" tela="classificacao" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="classificacao" mostrarFiltros={CAMPOS}
      acoes={hasPermission(sg.perm('configuracao')) && <Link to={sg.rota('configuracao')} className={btnSec}><Settings className="h-3.5 w-3.5" /> Configurar classificações</Link>}>
      {dados && (
        <>
          <p className="text-[11px] text-slate-500">
            Curva de Venda por <strong>{baseVenda}</strong> dos últimos <strong>{cfg.abc_periodo_meses} meses</strong> · XYZ por <strong>{cfg.xyz_base === 'custo_medio' ? 'custo médio unitário' : 'custo médio × saldo atual'}</strong> · política de compra: <strong>{cfg.metodo_compra === 'estatistico' ? 'estatística' : 'dias de estoque por célula'}</strong>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <BlocoResumo titulo="Curva de Venda (ABC)" linhas={dados.abc} info={INFO.abc} />
            <BlocoResumo titulo="XYZ — valor em estoque" linhas={dados.xyz} info={INFO.xyz} />
            <BlocoResumo titulo="Popularidade" linhas={dados.freq} info={INFO.freq} rotulo={l => l.nome} />
            <BlocoResumo titulo="Regularidade" linhas={dados.reg} info={INFO.reg} rotulo={l => l.nome} />
            <BlocoResumo titulo="Mobilidade (última saída)" linhas={dados.mobilidade} info={INFO.mobilidade} />
          </div>

          <Abas abas={[['matriz', 'Política de compra (Venda × XYZ)'], ['abc', 'Curva de Venda'], ['xyz', 'Curva XYZ'], ['pop', 'Popularidade e Regularidade'], ['itens', `Itens${celula ? ` (${celula})` : ''}`]]} aba={aba} onChange={setAba} />

          {aba === 'matriz' && (
            <div className="relative bg-white border border-slate-200 rounded-lg p-3 space-y-3">
              <BotaoInfo titulo="Política de compra" info={INFO.matriz} />
              <p className="text-[11px] text-slate-600 pr-6">Linhas = Curva de Venda, colunas = XYZ (dinheiro em estoque). Cada célula mostra os dias de estoque da política e quantos itens estão nela. Clique para ver os itens.</p>
              <table className="text-[11px] border-separate border-spacing-1.5">
                <thead><tr><th /><th className="text-slate-500 px-2">X — concentra o estoque</th><th className="text-slate-500 px-2">Y</th><th className="text-slate-500 px-2">Z — pouco estoque</th></tr></thead>
                <tbody>
                  {[['A', false], ['B', false], ['C', false], ['C', true]].map(([a, pop]) => (
                    <tr key={a + pop}>
                      <th className="text-slate-500 pr-2 text-right">{pop ? <>Venda C popular<span className="block text-[9px] font-normal">Popularidade {nomePop}</span></> : `Venda ${a}`}</th>
                      {['X', 'Y', 'Z'].map(x => {
                        const m = dados.matrizCompra.find(c => c.abc === a && c.xyz === x && !!c.c_popular === pop)
                        const sel = celula === m.celula
                        return (
                          <td key={x} onClick={() => { setCelula(sel ? null : m.celula); if (!sel) setAba('itens') }} title={m.orientacao}
                            className={`cursor-pointer rounded-md p-2.5 min-w-[150px] align-top border ${sel ? 'border-orange-600 ring-2 ring-orange-200' : 'border-transparent'}`}
                            style={{ backgroundColor: m.estocar ? `rgba(234, 88, 12, ${0.08 + (m.itens / maxItens) * 0.55})` : '#f1f5f9' }}>
                            <p className="font-bold text-slate-900 text-[12px]">{m.celula}</p>
                            <p className={`font-semibold ${m.estocar ? 'text-orange-900' : 'text-slate-500'}`}>{m.politica}</p>
                            <p className="text-slate-700">{fmtNum(m.itens)} itens · {fmtMil(m.valor_estoque)}</p>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {aba === 'abc' && (
            <>
              <CardGrafico titulo={`Curva de Pareto — ${baseVenda} acumulada × % dos itens`} info={INFO.abc}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dados.pareto.map(p => ({ ...p, pct_itens: Math.round(p.idx / Math.max(1, dados.pareto.length - 1) * 100) }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pct_itens" tick={eixo} tickFormatter={v => `${v}%`} />
                    <YAxis tick={eixo} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => `${v}%`} labelFormatter={v => `${v}% dos itens`} />
                    <ReferenceLine y={cfg.abc_corte_a} stroke="#ea580c" strokeDasharray="4 4" label={{ value: 'A', fontSize: 11, position: 'insideTopLeft' }} />
                    <ReferenceLine y={cfg.abc_corte_b} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'B', fontSize: 11, position: 'insideTopLeft' }} />
                    <Area dataKey="part_acum" name="Acumulado" stroke="#ea580c" fill="#fed7aa" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardGrafico>
              <TabelaResumo linhas={dados.abc} nome="venda" />
            </>
          )}
          {aba === 'xyz' && (
            <>
              <CardGrafico titulo="XYZ — itens e valor em estoque" info={INFO.xyz}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dados.xyz}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="classe" tick={eixo} /><YAxis yAxisId="l" tick={eixo} /><YAxis yAxisId="r" orientation="right" tick={eixo} tickFormatter={fmtMil} /><Tooltip formatter={(v, n) => (n === 'Valor em estoque' ? fmtMoeda(v) : fmtNum(v))} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar yAxisId="l" dataKey="itens" name="Itens" fill="#6366f1" /><Bar yAxisId="r" dataKey="valor_estoque" name="Valor em estoque" fill="#ea580c" /></BarChart>
                </ResponsiveContainer>
              </CardGrafico>
              <TabelaResumo linhas={dados.xyz} nome="xyz" />
            </>
          )}
          {aba === 'pop' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="space-y-2"><p className="text-[11px] font-semibold text-slate-700">Popularidade (meses com venda em 12)</p><TabelaResumo linhas={dados.freq} nome="popularidade" /></div>
              <div className="space-y-2"><p className="text-[11px] font-semibold text-slate-700">Regularidade (variação mensal da venda)</p><TabelaResumo linhas={dados.reg} nome="regularidade" /></div>
            </div>
          )}
          {aba === 'itens' && (
            <>
              {celulaInfo && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-md bg-orange-50 border border-orange-200 text-[11px]">
                  <strong>Célula {celulaInfo.celula} — {celulaInfo.politica}:</strong> <span>{celulaInfo.orientacao}</span>
                  <button type="button" className="ml-auto text-orange-700 hover:underline" onClick={() => setCelula(null)}>Ver todos</button>
                </div>
              )}
              <TabelaPecas rows={itens} nomeArquivo="classificacao-itens" ordemInicial={{ k: 'part_fat', dir: 'desc' }} cols={[
                { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'grupo', t: 'Tipo de produto' }, { k: 'marca', t: 'Marca' },
                { k: 'classe', t: 'Venda · XYZ · Popularidade', render: r => <BadgeClasse r={r} /> },
                { k: 'reg', t: 'Regularidade', render: r => NOME_REG[r.reg] }, { k: 'mobilidade', t: 'Mobilidade', render: r => <BadgeMobilidade m={r.mobilidade} /> },
                { k: 'politica', t: 'Política' },
                { k: 'celula', t: 'Célula' },
                { k: 'qtd_periodo', t: `Qtd ${cfg.abc_periodo_meses}m`, fmt: 'num' }, { k: 'base_venda', t: `Base ABC (${baseVenda})`, fmt: 'num2' },
                { k: 'part_fat', t: '% venda', fmt: 'pct' }, { k: 'part_acum', t: '% acum.', fmt: 'pct' },
                { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'valor_estoque', t: 'Valor estoque', fmt: 'moeda' }, { k: 'part_xyz', t: '% estoque', fmt: 'pct' },
                { k: 'meses_com_venda', t: 'Meses c/ venda', fmt: 'num' }, { k: 'cv', t: 'CV', fmt: 'num2', dica: 'Coeficiente de variação mensal (Regularidade)' },
              ]} />
            </>
          )}
        </>
      )}
    </PaginaPecas>
  )
}
