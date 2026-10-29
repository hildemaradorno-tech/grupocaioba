import React, { useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { Abas, Badge, CardKpi, fmtMoeda, fmtNum, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

export default function PecasPedidosPendentes() {
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('pedidos-pendentes', filtros)
  const [aba, setAba] = useState('todos')
  const k = dados?.kpis || {}

  const rows = useMemo(() => {
    const r = dados?.rows || []
    if (aba === 'atrasados') return r.filter(x => x.status === 'Atrasado')
    if (aba === 'criticos') return r.filter(x => x.criticidade === 'Crítica')
    return r
  }, [dados, aba])

  return (
    <PaginaPecas icone={ClipboardList} titulo="Itens em Pedido Pendente" tela="pedidos-pendentes" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="pedidos-pendentes">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <CardKpi label="Pedidos em aberto" valor={fmtNum(k.pedidos)} sub={`${fmtNum(k.itens)} itens`} info={INFO.pedidos} />
            <CardKpi label="Valor em aberto" valor={fmtMoeda(k.valor)} info={INFO.pedidos} cor="#0ea5e9" />
            <CardKpi label="Itens atrasados" valor={fmtNum(k.atrasados)} info={INFO.pedidos} cor="#f59e0b" onClick={() => setAba('atrasados')} />
            <CardKpi label="Valor atrasado" valor={fmtMoeda(k.valor_atrasado)} info={INFO.pedidos} cor="#f59e0b" />
            <CardKpi label="Críticos (atrasado e zerado)" valor={fmtNum(k.criticos)} info={INFO.pedidos} cor="#dc2626" onClick={() => setAba('criticos')} />
          </div>
          <Abas abas={[['atrasados', `Atrasados (${fmtNum(k.atrasados)})`], ['criticos', `Críticos (${fmtNum(k.criticos)})`], ['todos', 'Todos'], ['fornecedor', 'Por fornecedor']]} aba={aba} onChange={setAba} />
          {aba === 'fornecedor' ? (
            <TabelaPecas rows={dados.porFornecedor} nomeArquivo="pedidos-por-fornecedor" cols={[
              { k: 'chave', t: 'Fornecedor' }, { k: 'itens', t: 'Itens em aberto', fmt: 'num' }, { k: 'valor', t: 'Valor', fmt: 'moeda' },
              { k: 'atrasados', t: 'Atrasados', fmt: 'num' }, { k: 'atraso_medio', t: 'Atraso médio (dias)', fmt: 'num1' },
            ]} />
          ) : (
            <TabelaPecas rows={rows} nomeArquivo={`pedidos-${aba}`} cols={[
              { k: 'criticidade', t: 'Criticidade', render: r => <Badge texto={r.criticidade} /> },
              { k: 'status', t: 'Status', render: r => <Badge texto={r.status} /> },
              { k: 'pedido', t: 'Pedido' }, { k: 'fornecedor', t: 'Fornecedor' },
              { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
              { k: 'abc', t: 'Curva Venda', render: r => <Badge texto={r.abc} /> },
              { k: 'data_pedido', t: 'Data pedido', fmt: 'data' }, { k: 'data_prevista', t: 'Previsão', fmt: 'data' },
              { k: 'dias_atraso', t: 'Dias atraso', fmt: 'num' }, { k: 'saldo_pedido', t: 'Qtd pendente', fmt: 'num' }, { k: 'valor', t: 'Valor', fmt: 'moeda' },
              { k: 'saldo_estoque', t: 'Saldo estoque', fmt: 'num' }, { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' },
              { k: 'situacao_item', t: 'Situação item', render: r => <Badge texto={r.situacao_item} /> },
            ]} />
          )}
        </>
      )}
    </PaginaPecas>
  )
}
