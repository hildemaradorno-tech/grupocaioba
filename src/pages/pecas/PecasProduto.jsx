import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Package, Search } from 'lucide-react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Abas, Badge, BadgeClasse, BotaoAnaliseIA, CardGrafico, CardKpi, CORES, eixo, fmtData, fmtMoeda, fmtMoeda2, fmtNum, fmtPct, inputCls, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas } from './components/ui'
import { buscarProdutos, getProduto, listarSnapshotsItem } from './gestorPecasApi'
import { INFO } from './gestorPecasTextos'

const CAMPOS = ['loja']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const rotMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`

export default function PecasProduto() {
  const [params, setParams] = useSearchParams()
  const codigo = params.get('codigo') || ''
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const [termo, setTermo] = useState('')
  const [sugestoes, setSugestoes] = useState([])
  const [dados, setDados] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [erroSnap, setErroSnap] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(null)
  const [aba, setAba] = useState('lojas')

  useEffect(() => {
    if (termo.trim().length < 2) { setSugestoes([]); return }
    const t = setTimeout(() => buscarProdutos(termo).then(setSugestoes).catch(() => setSugestoes([])), 250)
    return () => clearTimeout(t)
  }, [termo])

  const chaveFiltros = JSON.stringify(filtros)
  useEffect(() => {
    if (!codigo) { setDados(null); return }
    setCarregando(true); setErro(null)
    getProduto(codigo, JSON.parse(chaveFiltros)).then(setDados).catch(e => { setErro(e.message); setDados(null) }).finally(() => setCarregando(false))
    listarSnapshotsItem(codigo).then(s => { setSnapshots(s); setErroSnap(null) }).catch(e => setErroSnap(e.message))
  }, [codigo, chaveFiltros])

  const escolher = (c) => { setParams({ codigo: c }); setTermo(''); setSugestoes([]) }
  const it = dados?.item
  const lojas = dados?.lojas || []
  const tot = useMemo(() => ({
    saldo: lojas.reduce((a, l) => a + l.saldo, 0),
    valor: lojas.reduce((a, l) => a + l.valor_estoque, 0),
    pendente: lojas.reduce((a, l) => a + l.pendente, 0),
    vendas12: lojas.reduce((a, l) => a + l.vendas12, 0),
    previsao: lojas.reduce((a, l) => a + l.previsao_mes, 0),
    sugestao: lojas.reduce((a, l) => a + l.sugestao_compra, 0),
  }), [lojas])
  const margem = it?.preco ? (it.preco - it.custo) / it.preco * 100 : null
  // Snapshot: soma das lojas por data
  const evolucao = useMemo(() => {
    const m = new Map()
    for (const s of snapshots) {
      if (filtros.loja && s.empresa_nome !== filtros.loja) continue
      const o = m.get(s.data) || { data: s.data, saldo: 0, valor: 0, classes: new Set() }
      o.saldo += Number(s.saldo) || 0; o.valor += Number(s.valor_estoque) || 0; o.classes.add(`${s.abc}${s.xyz}${s.freq}`)
      m.set(s.data, o)
    }
    return [...m.values()].map(o => ({ ...o, classes: [...o.classes].join(', ') }))
  }, [snapshots, filtros.loja])

  return (
    <PaginaPecas icone={Package} titulo="Evolução do Produto (360º)" tela="produto" fonte={dados?.fonte} carregando={carregando} erro={erro}
      filtros={filtros} setFiltros={setFiltros} mostrarFiltros={CAMPOS}
      acoes={codigo && <BotaoAnaliseIA tela="produto" titulo={`Produto ${codigo}`} filtros={filtros} codigo={codigo} rotulo="Analisar item com IA" />}>
      <div className="relative max-w-xl">
        <Search className="h-4 w-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
        <input className={`${inputCls} w-full pl-8 py-2 text-[12px]`} placeholder="Buscar item por código ou descrição..." value={termo} onChange={e => setTermo(e.target.value)} />
        {sugestoes.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
            {sugestoes.map(s => (
              <button key={s.codigo} type="button" onClick={() => escolher(s.codigo)} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-orange-50 flex items-center gap-2">
                <span className="font-semibold text-orange-700">{s.codigo}</span><span className="flex-1 truncate">{s.descricao}</span><Badge texto={s.abc} /><span className="text-slate-500">saldo {fmtNum(s.saldo)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!codigo && <p className="text-[11px] text-slate-500">Escolha um item na busca acima, ou clique no código de um item em qualquer tela do Gestor.</p>}

      {it && (
        <>
          <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[260px]">
              <p className="text-[11px] text-slate-500">{it.codigo}{it.referencia ? ` · ref. ${it.referencia}` : ''} · {it.grupo}{it.grupo_produto ? ` (${it.grupo_produto})` : ''} · {it.marca} · {it.fornecedor}</p>
              <p className="text-base font-bold text-slate-900">{it.descricao}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {it.abc && <BadgeClasse r={it} />}
                {it.politica && <span className="text-[11px] text-slate-600">Política: <strong>{it.politica}</strong></span>}
                <span className="text-[11px] text-slate-600">Lead time {it.lead_time_dias} d · lote mín. {it.lote_minimo} · múltiplo {it.multiplo}</span>
              </div>
              {it.orientacao && <p className="text-[11px] text-slate-500 mt-1">{it.orientacao}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <CardKpi label="Saldo" valor={fmtNum(tot.saldo)} sub={fmtMoeda(tot.valor)} info={INFO.valorEstoque} />
            <CardKpi label="Pendente" valor={fmtNum(tot.pendente)} info={INFO.pedidos} cor="#0ea5e9" />
            <CardKpi label="Vendas 12m" valor={fmtNum(tot.vendas12)} cor="#16a34a" />
            <CardKpi label="Previsão mês" valor={fmtNum(tot.previsao, 1)} info={INFO.previsao} cor="#16a34a" />
            <CardKpi label="Tendência" valor={fmtPct((it.tendencia || 0) * 100, 0)} info={INFO.tendencia} cor={(it.tendencia || 0) >= 0 ? '#16a34a' : '#dc2626'} />
            <CardKpi label="Custo / Preço" valor={`${fmtMoeda2(it.custo)}`} sub={`Preço ${fmtMoeda2(it.preco)}`} cor="#a855f7" />
            <CardKpi label="Margem" valor={fmtPct(margem)} info={INFO.anomaliaPreco} cor={margem < 15 ? '#dc2626' : '#a855f7'} />
            <CardKpi label="Sugestão de compra" valor={fmtNum(tot.sugestao)} info={INFO.reposicao} cor="#ea580c" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardGrafico titulo="Vendas mensais por loja (24 meses)">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dados.series.map(s => ({ ...s, rot: rotMes(s.mes) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rot" tick={{ ...eixo, fontSize: 10 }} />
                  <YAxis tick={eixo} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} formatter={nomeLoja} />
                  {lojas.map((l, i) => <Bar key={l.empresa_nome} dataKey={l.empresa_nome} name={l.empresa_nome} stackId="v" fill={CORES[i % CORES.length]} />)}
                </ComposedChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Preço × custo (24 meses)" info={INFO.anomaliaPreco}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.series.map(s => ({ ...s, rot: rotMes(s.mes) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rot" tick={{ ...eixo, fontSize: 10 }} />
                  <YAxis tick={eixo} tickFormatter={v => fmtMoeda(v)} width={80} />
                  <Tooltip formatter={(v) => fmtMoeda2(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line dataKey="preco" name="Preço" stroke="#16a34a" strokeWidth={2} dot={false} />
                  <Line dataKey="custo" name="Custo" stroke="#dc2626" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>
          <Abas abas={[['lojas', 'Situação por loja'], ['compras', `Compras (${dados.compras.length})`], ['pedidos', `Pedidos em aberto (${dados.pedidos.length})`], ['transf', `Transferências (${dados.transferencias.length})`], ['historico', `Histórico (snapshots: ${evolucao.length})`]]} aba={aba} onChange={setAba} />
          {aba === 'lojas' && (
            <TabelaPecas rows={lojas} nomeArquivo={`produto-${codigo}-lojas`} cols={[
              { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'situacao', t: 'Situação', render: r => <Badge texto={r.situacao} /> },
              { k: 'classe', t: 'Gestor (Venda·XYZ·Pop.)', render: r => <BadgeClasse r={r} /> },
              { k: 'dealer', t: 'Classe no sistema de origem', dica: 'Letras do Dealer.net (RPR073): Popularidade · Venda · Estoque', render: r => (r.dealer ? `Pop ${r.dealer.popularidade || '—'} · Venda ${r.dealer.venda || '—'} · Estoque ${r.dealer.estoque || '—'}` : '—'), exportar: r => (r.dealer ? `${r.dealer.popularidade}/${r.dealer.venda}/${r.dealer.estoque}` : '') },
              { k: 'saldo', t: 'Saldo disponível', fmt: 'num' }, { k: 'saldo_fisico', t: 'Físico', fmt: 'num' }, { k: 'bloqueado', t: 'Bloqueado', fmt: 'num' }, { k: 'localizacao', t: 'Localização' }, { k: 'pendente', t: 'Pendente', fmt: 'num' }, { k: 'custo_medio', t: 'Custo médio', fmt: 'moeda2' },
              { k: 'vendas12', t: 'Vendas 12m', fmt: 'num' }, { k: 'media_mensal', t: 'Média/mês', fmt: 'num1' }, { k: 'previsao_mes', t: 'Previsão', fmt: 'num1' },
              { k: 'estoque_seguranca', t: 'Segurança', fmt: 'num1' }, { k: 'ponto_pedido', t: 'Ponto pedido', fmt: 'num1' }, { k: 'estoque_maximo', t: 'Máximo', fmt: 'num1' },
              { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' }, { k: 'sugestao_compra', t: 'Sugestão', fmt: 'num' },
              { k: 'ultima_venda', t: 'Última venda', fmt: 'data' }, { k: 'ultima_entrada', t: 'Última entrada', fmt: 'data' },
            ]} />
          )}
          {aba === 'compras' && (
            <TabelaPecas rows={dados.compras} nomeArquivo={`produto-${codigo}-compras`} cols={[
              { k: 'data_pedido', t: 'Pedido', fmt: 'data' }, { k: 'data_recebimento', t: 'Recebimento', fmt: 'data' }, { k: 'nf', t: 'NF' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
              { k: 'qtd_pedida', t: 'Qtd pedida', fmt: 'num' }, { k: 'qtd_recebida', t: 'Qtd recebida', fmt: 'num' }, { k: 'custo_unitario', t: 'Custo unit.', fmt: 'moeda2' },
            ]} />
          )}
          {aba === 'pedidos' && (
            <TabelaPecas rows={dados.pedidos} nomeArquivo={`produto-${codigo}-pedidos`} cols={[
              { k: 'pedido', t: 'Pedido' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'data_pedido', t: 'Data', fmt: 'data' }, { k: 'data_prevista', t: 'Previsão', fmt: 'data' },
              { k: 'qtd_pedida', t: 'Qtd', fmt: 'num' }, { k: 'qtd_recebida', t: 'Recebida', fmt: 'num' }, { k: 'custo_unitario', t: 'Custo', fmt: 'moeda2' },
            ]} />
          )}
          {aba === 'transf' && (
            <TabelaPecas rows={dados.transferencias} nomeArquivo={`produto-${codigo}-transferencias`} cols={[
              { k: 'loja_origem', t: 'Origem', fmt: 'loja' }, { k: 'loja_destino', t: 'Destino', fmt: 'loja' }, { k: 'qtd', t: 'Qtd', fmt: 'num' }, { k: 'valor', t: 'Valor', fmt: 'moeda' }, { k: 'motivo', t: 'Motivo' },
            ]} />
          )}
          {aba === 'historico' && (
            <>
              {erroSnap && <p className="text-[11px] text-amber-700">{erroSnap}</p>}
              {!erroSnap && evolucao.length === 0 && <p className="text-[11px] text-slate-500">Nenhum snapshot gravado ainda para este item. Os snapshots são a "foto do dia" (saldo, classe, situação) — gere em Parâmetros → "Gerar snapshot do dia" (na fase 2 será automático, diário).</p>}
              {evolucao.length > 0 && (
                <>
                  <CardGrafico titulo="Saldo ao longo do tempo (snapshots)">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucao}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="data" tick={eixo} tickFormatter={fmtData} /><YAxis tick={eixo} /><Tooltip labelFormatter={fmtData} /><Line dataKey="saldo" name="Saldo" stroke="#ea580c" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                  </CardGrafico>
                  <TabelaPecas rows={snapshots.filter(s => !filtros.loja || s.empresa_nome === filtros.loja)} nomeArquivo={`produto-${codigo}-snapshots`} cols={[
                    { k: 'data', t: 'Data', fmt: 'data' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'valor_estoque', t: 'Valor', fmt: 'moeda' },
                    { k: 'abc', t: 'Classe', render: r => <BadgeClasse r={r} /> }, { k: 'situacao', t: 'Situação', render: r => <Badge texto={r.situacao} /> },
                    { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' }, { k: 'necessidade', t: 'Necessidade', fmt: 'num' }, { k: 'fonte', t: 'Fonte' },
                  ]} />
                </>
              )}
            </>
          )}
        </>
      )}
    </PaginaPecas>
  )
}
