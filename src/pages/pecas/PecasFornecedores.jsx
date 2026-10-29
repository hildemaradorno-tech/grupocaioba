import React from 'react'
import { Truck } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CardGrafico, eixo, fmtNum, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

const CAMPOS = ['loja', 'marca', 'grupo', 'abc']
const corNota = (n) => (n >= 85 ? '#16a34a' : n >= 70 ? '#f59e0b' : '#dc2626')

export default function PecasFornecedores() {
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const { dados, carregando, erro, recarregar } = useTela('fornecedores', filtros)
  const rows = dados?.rows || []

  return (
    <PaginaPecas icone={Truck} titulo="Desempenho de Fornecedores" tela="fornecedores" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} mostrarFiltros={CAMPOS} iaTela="fornecedores">
      {dados && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardGrafico titulo="Nota do fornecedor (0-100)" info={INFO.fornecedor}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={eixo} />
                  <YAxis type="category" dataKey="fornecedor" tick={{ ...eixo, fontSize: 10 }} width={140} />
                  <Tooltip />
                  <Bar dataKey="nota" name="Nota">{rows.map(r => <Cell key={r.fornecedor} fill={corNota(r.nota)} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Lead time real × cadastrado (dias)" info={INFO.fornecedor}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="fornecedor" tick={{ ...eixo, fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis tick={eixo} />
                  <Tooltip formatter={(v) => fmtNum(v, 1)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="lead_time_cadastro" name="Cadastrado" fill="#94a3b8" />
                  <Bar dataKey="lead_time_real" name="Real" fill="#ea580c" />
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          </div>
          <TabelaPecas rows={rows} nomeArquivo="fornecedores" ordemInicial={{ k: 'valor_12m', dir: 'desc' }} cols={[
            { k: 'fornecedor', t: 'Fornecedor' },
            { k: 'nota', t: 'Nota', render: r => <span className="font-bold" style={{ color: corNota(r.nota) }}>{r.nota}</span>, exportar: r => r.nota },
            { k: 'compras', t: 'Recebimentos 12m', fmt: 'num' }, { k: 'valor_12m', t: 'Valor 12m', fmt: 'moeda' },
            { k: 'lead_time_cadastro', t: 'LT cadastro', fmt: 'num1' }, { k: 'lead_time_real', t: 'LT real', fmt: 'num1' },
            { k: 'pct_no_prazo', t: '% no prazo', fmt: 'pct' }, { k: 'atraso_medio', t: 'Atraso médio (d)', fmt: 'num1' }, { k: 'fill_rate', t: 'Fill rate', fmt: 'pct' },
            { k: 'pedidos_abertos', t: 'Pedidos abertos', fmt: 'num' }, { k: 'abertos_atrasados', t: 'Abertos atrasados', fmt: 'num' }, { k: 'valor_aberto', t: 'Valor aberto', fmt: 'moeda' },
          ]} />
        </>
      )}
    </PaginaPecas>
  )
}
