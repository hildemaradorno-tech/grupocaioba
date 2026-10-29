import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, Archive, Tag } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Abas, BadgeClasse, btnSec, CardGrafico, CardKpi, eixo, fmtMil, fmtMoeda, fmtNum, fmtPct, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const colsBase = [
  { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'grupo', t: 'Tipo de produto' },
  { k: 'classe', t: 'Classe', render: r => <BadgeClasse r={r} /> },
  { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'valor_estoque', t: 'Valor', fmt: 'moeda' },
]

export default function PecasExcessoObsoletos() {
  const sg = useSegmento()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('excesso-obsoletos', filtros)
  const [aba, setAba] = useState('excesso')
  const k = dados?.kpis || {}
  const pct = (v) => (k.valor_estoque ? (v / k.valor_estoque) * 100 : null)

  return (
    <PaginaPecas icone={Archive} titulo="Excesso, Obsoletos e Alerta Pré-obsoleto" tela="excesso-obsoletos" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="excesso-obsoletos"
      acoes={<>
        <button type="button" className={btnSec} onClick={() => navigate(sg.rota('promocoes'))}><Tag className="h-3.5 w-3.5" /> Promoções</button>
        <button type="button" className={btnSec} onClick={() => navigate(sg.rota('transferencias'))}><ArrowRightLeft className="h-3.5 w-3.5" /> Transferências</button>
      </>}>
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardKpi label="Valor em estoque" valor={fmtMoeda(k.valor_estoque)} info={INFO.valorEstoque} cor="#64748b" />
            <CardKpi label="Excesso" valor={fmtMoeda(k.excesso_valor)} sub={`${fmtNum(k.excesso_itens)} itens × loja · ${fmtPct(pct(k.excesso_valor))} do estoque`} info={INFO.excesso} cor="#0ea5e9" onClick={() => setAba('excesso')} />
            <CardKpi label="Obsoletos" valor={fmtMoeda(k.obsoleto_valor)} sub={`${fmtNum(k.obsoleto_itens)} itens × loja · ${fmtPct(pct(k.obsoleto_valor))} do estoque`} info={INFO.obsoleto} cor="#475569" onClick={() => setAba('obsoletos')} />
            <CardKpi label="Alerta pré-obsoleto" valor={fmtMoeda(k.pre_obsoleto_valor)} sub={`${fmtNum(k.pre_obsoleto_itens)} itens × loja · ${fmtPct(pct(k.pre_obsoleto_valor))} do estoque`} info={INFO.preObsoleto} cor="#a855f7" onClick={() => setAba('pre')} />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardGrafico titulo="Estoque por dias sem venda" info={INFO.obsoleto}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.faixasSemVenda}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="faixa" tick={eixo} />
                  <YAxis tick={eixo} tickFormatter={fmtMil} />
                  <Tooltip formatter={(v, n, p) => [`${fmtMoeda(v)} · ${fmtNum(p.payload.itens)} itens`, 'Valor']} />
                  <Bar dataKey="valor" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Capital parado por loja" info={INFO.excesso}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.porLoja.map(l => ({ ...l, loja: nomeLoja(l.chave) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="loja" tick={eixo} />
                  <YAxis tick={eixo} tickFormatter={fmtMil} />
                  <Tooltip formatter={(v) => fmtMoeda(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="excesso_valor" name="Excesso" stackId="a" fill="#0ea5e9" />
                  <Bar dataKey="pre_obsoleto_valor" name="Pré-obsoleto" stackId="a" fill="#a855f7" />
                  <Bar dataKey="obsoleto_valor" name="Obsoleto" stackId="a" fill="#475569" />
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>
          <Abas abas={[['excesso', `Excesso (${fmtNum(k.excesso_itens)})`], ['pre', `Alerta pré-obsoleto (${fmtNum(k.pre_obsoleto_itens)})`], ['obsoletos', `Obsoletos (${fmtNum(k.obsoleto_itens)})`]]} aba={aba} onChange={setAba} />
          {aba === 'excesso' && (
            <TabelaPecas rows={dados.excesso} nomeArquivo="excesso" cols={[...colsBase,
              { k: 'estoque_maximo', t: 'Estoque máx.', fmt: 'num1' }, { k: 'previsao_mes', t: 'Prev. mês', fmt: 'num1' }, { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' },
              { k: 'excesso_qtd', t: 'Excesso (un)', fmt: 'num' }, { k: 'excesso_valor', t: 'Excesso (R$)', fmt: 'moeda' }, { k: 'transferencia_saida', t: 'Sai por transf.', fmt: 'num' },
            ]} />
          )}
          {aba === 'pre' && (
            <TabelaPecas rows={dados.pre_obsoletos} nomeArquivo="pre-obsoletos" cols={[...colsBase,
              { k: 'dias_sem_venda', t: 'Dias sem venda', fmt: 'num' }, { k: 'ultima_venda', t: 'Última venda', fmt: 'data' },
              { k: 'vendas12', t: 'Vendas 12m', fmt: 'num' }, { k: 'tendencia', t: 'Tendência', render: r => fmtPct(r.tendencia * 100, 0) },
              { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' }, { k: 'faixa_aging', t: 'Aging' },
            ]} />
          )}
          {aba === 'obsoletos' && (
            <TabelaPecas rows={dados.obsoletos} nomeArquivo="obsoletos" cols={[...colsBase,
              { k: 'dias_sem_venda', t: 'Dias sem venda', render: r => (r.dias_sem_venda == null ? '+730' : fmtNum(r.dias_sem_venda)) }, { k: 'ultima_venda', t: 'Última venda', fmt: 'data' },
              { k: 'ultima_entrada', t: 'Última entrada', fmt: 'data' }, { k: 'transferencia_saida', t: 'Sai por transf.', fmt: 'num' },
            ]} />
          )}
        </>
      )}
    </PaginaPecas>
  )
}
