import React, { useState } from 'react'
import { Warehouse } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Abas, Badge, BadgeClasse, CardGrafico, CardKpi, eixo, fmtMil, fmtMoeda, fmtNum, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

// Sem o seletor de Fornecedor nesta tela (pedido do usuário, 28/10/2026)
const CAMPOS = ['loja', 'marca', 'grupo', 'abc', 'xyz', 'freq']
const FAIXAS = ['0-90', '91-180', '181-365', '>365']
const COLS_RESUMO = (rotulo) => [
  { k: 'chave', t: rotulo, render: r => (rotulo === 'Loja' ? nomeLoja(r.chave) : r.chave) },
  { k: 'valor', t: 'Valor em estoque', fmt: 'moeda' },
  { k: 'qtd', t: 'Unidades', fmt: 'num' },
  { k: 'skus_ativos', t: 'Largura (SKUs c/ saldo)', fmt: 'num' },
  { k: 'skus_mix', t: 'SKUs no mix', fmt: 'num' },
  { k: 'profundidade_un', t: 'Profundidade (un/SKU)', fmt: 'num1' },
  { k: 'profundidade_valor', t: 'Profundidade (R$/SKU)', fmt: 'moeda' },
  { k: 'giro_anual', t: 'Giro anual', fmt: 'num2' },
  { k: 'cobertura_media_dias', t: 'Cobertura (dias)', fmt: 'num' },
]

export default function PecasEstoque() {
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const { dados, carregando, erro, recarregar } = useTela('estoque', filtros)
  const [aba, setAba] = useState('loja')
  const k = dados?.kpis || {}

  return (
    <PaginaPecas icone={Warehouse} titulo="Posição de Estoque" tela="estoque" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} mostrarFiltros={CAMPOS} iaTela="estoque">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <CardKpi label="Valor em estoque" valor={fmtMoeda(k.valor)} sub={`${fmtNum(k.qtd)} unidades`} info={INFO.valorEstoque} />
            <CardKpi label="Largura (SKUs com saldo)" valor={fmtNum(k.skus_ativos)} sub={`${fmtNum(k.skus_mix)} SKUs no mix`} info={INFO.skusAtivos} cor="#0ea5e9" />
            <CardKpi label="Profundidade (un/SKU)" valor={fmtNum(k.profundidade_un, 1)} info={INFO.profundidade} cor="#16a34a" />
            <CardKpi label="Profundidade (R$/SKU)" valor={fmtMoeda(k.profundidade_valor)} info={INFO.profundidade} cor="#16a34a" />
            <CardKpi label="Giro anual" valor={`${fmtNum(k.giro_anual, 2)}x`} info={INFO.giro} cor="#a855f7" />
            <CardKpi label="Cobertura média" valor={`${fmtNum(k.cobertura_media_dias)} dias`} info={INFO.cobertura} cor="#eab308" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardGrafico titulo="Largura × profundidade por tipo de produto" info={INFO.profundidade}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dados.porGrupo}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="chave" tick={{ ...eixo, fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={55} />
                  <YAxis yAxisId="l" tick={eixo} />
                  <YAxis yAxisId="r" orientation="right" tick={eixo} tickFormatter={fmtMil} />
                  <Tooltip formatter={(v, n) => (n === 'Profundidade (R$/SKU)' ? fmtMoeda(v) : fmtNum(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="skus_ativos" name="Largura (SKUs)" fill="#0ea5e9" />
                  <Line yAxisId="r" dataKey="profundidade_valor" name="Profundidade (R$/SKU)" stroke="#ea580c" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Aging do estoque por loja (dias desde a última entrada)" info={INFO.aging}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(dados.porLoja || []).map(l => ({ loja: nomeLoja(l.chave), ...l.aging }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="loja" tick={eixo} />
                  <YAxis tick={eixo} tickFormatter={fmtMil} />
                  <Tooltip formatter={(v) => fmtMoeda(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {FAIXAS.map((f, i) => <Bar key={f} dataKey={f} name={`${f} dias`} stackId="a" fill={['#16a34a', '#eab308', '#f97316', '#dc2626'][i]} />)}
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>

          <Abas abas={[['loja', 'Por loja'], ['grupo', 'Por tipo de produto'], ['marca', 'Por marca'], ['itens', 'Itens']]} aba={aba} onChange={setAba} />
          {aba === 'loja' && <TabelaPecas rows={dados.porLoja} cols={COLS_RESUMO('Loja')} nomeArquivo="estoque-por-loja" />}
          {aba === 'grupo' && <TabelaPecas rows={dados.porGrupo} cols={COLS_RESUMO('Tipo de produto')} nomeArquivo="estoque-por-tipo-produto" />}
          {aba === 'marca' && <TabelaPecas rows={dados.porMarca} cols={COLS_RESUMO('Marca')} nomeArquivo="estoque-por-marca" />}
          {aba === 'itens' && (
            <TabelaPecas rows={dados.rows} nomeArquivo="estoque-itens" ordemInicial={{ k: 'valor_estoque', dir: 'desc' }} cols={[
              { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
              { k: 'grupo', t: 'Tipo de produto' }, { k: 'marca', t: 'Marca' },
              { k: 'classe', t: 'Classe', render: r => <BadgeClasse r={r} /> },
              { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'custo_medio', t: 'Custo médio', fmt: 'moeda2' }, { k: 'valor_estoque', t: 'Valor', fmt: 'moeda' },
              { k: 'giro_anual', t: 'Giro', fmt: 'num2' }, { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' },
              { k: 'faixa_aging', t: 'Aging' }, { k: 'situacao', t: 'Situação', render: r => <Badge texto={r.situacao} /> },
            ]} />
          )}
        </>
      )}
    </PaginaPecas>
  )
}
