import React, { useMemo, useState } from 'react'
import { Gauge } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Abas, Badge, BadgeClasse, CardGrafico, CardKpi, eixo, fmtMoeda, fmtNum, fmtPct, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'

const CORES_FAIXA = ['#dc2626', '#f97316', '#f59e0b', '#84cc16', '#16a34a', '#0ea5e9', '#6366f1']

export default function PecasCoberturaRuptura() {
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('cobertura-ruptura', filtros)
  const [aba, setAba] = useState('ruptura')
  const k = dados?.kpis || {}

  const rows = useMemo(() => {
    const r = dados?.rows || []
    if (aba === 'ruptura') return r.filter(x => x.ruptura)
    if (aba === 'risco') return r.filter(x => x.ruptura_projetada)
    return r
  }, [dados, aba])

  return (
    <PaginaPecas icone={Gauge} titulo="Cobertura e Ruptura" tela="cobertura-ruptura" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="cobertura-ruptura">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <CardKpi label="Nível de atendimento" valor={fmtPct(k.nivel_atendimento)} sub={`${fmtNum(k.itens_com_giro)} itens × loja com giro`} info={INFO.nivelAtendimento} cor="#16a34a" />
            <CardKpi label="Ruptura" valor={fmtPct(k.pct_ruptura)} sub={`${fmtNum(k.em_ruptura)} itens zerados`} info={INFO.ruptura} cor="#dc2626" onClick={() => setAba('ruptura')} />
            <CardKpi label="Risco de ruptura" valor={fmtNum(k.risco_ruptura)} sub="Zeram antes da reposição" info={INFO.riscoRuptura} cor="#f59e0b" onClick={() => setAba('risco')} />
            <CardKpi label="Venda perdida estimada" valor={`${fmtMoeda(k.venda_perdida_mes)}/mês`} info={INFO.vendaPerdida} cor="#dc2626" />
            <CardKpi label="Cobertura média" valor={`${fmtNum(k.cobertura_media_dias)} dias`} info={INFO.cobertura} cor="#0ea5e9" />
            <CardKpi label="Ruptura curva A" valor={fmtPct(dados.porClasse.find(c => c.classe === 'A')?.pct_ruptura)} sub={`${fmtNum(dados.porClasse.find(c => c.classe === 'A')?.em_ruptura)} itens A zerados`} info={INFO.ruptura} cor="#ea580c" />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <CardGrafico titulo="Itens por faixa de cobertura (dias)" info={INFO.cobertura}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.faixas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ ...eixo, fontSize: 10 }} />
                  <YAxis tick={eixo} />
                  <Tooltip formatter={(v, n, p) => [`${fmtNum(v)} itens · ${fmtMoeda(p.payload.valor)}`, 'Itens']} />
                  <Bar dataKey="itens">{dados.faixas.map((f, i) => <Cell key={f.faixa} fill={CORES_FAIXA[i]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Ruptura por classe ABC" info={INFO.ruptura}>
              <TabelaSimples linhas={dados.porClasse} chave="classe" rot={c => `Curva ${c}`} />
            </CardGrafico>
            <CardGrafico titulo="Ruptura por loja" info={INFO.ruptura}>
              <TabelaSimples linhas={dados.porLoja} chave="chave" rot={nomeLoja} />
            </CardGrafico>
          </div>
          <Abas abas={[['ruptura', `Em ruptura (${fmtNum(k.em_ruptura)})`], ['risco', `Risco de ruptura (${fmtNum(k.risco_ruptura)})`], ['todos', 'Todos com giro']]} aba={aba} onChange={setAba} />
          <TabelaPecas rows={rows} nomeArquivo={`cobertura-${aba}`} cols={[
            { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
            { k: 'classe', t: 'Classe', render: r => <BadgeClasse r={r} /> },
            { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'pendente', t: 'Pendente', fmt: 'num' },
            { k: 'previsao_mes', t: 'Previsão mês', fmt: 'num1' }, { k: 'cobertura_dias', t: 'Cobertura', fmt: 'dias' },
            { k: 'cobertura_com_pedido', t: 'Cob. c/ pedido', fmt: 'dias' }, { k: 'lead_time', t: 'Lead time', fmt: 'num' },
            { k: 'venda_perdida_mes', t: 'Venda perdida/mês', fmt: 'moeda' },
            { k: 'transferencia_entrada', t: 'Transf. possível', fmt: 'num' },
            { k: 'situacao', t: 'Situação', render: r => <Badge texto={r.situacao} /> },
          ]} />
        </>
      )}
    </PaginaPecas>
  )
}

function TabelaSimples({ linhas, chave, rot }) {
  return (
    <table className="w-full text-[11px]">
      <thead className="text-slate-500"><tr className="text-left"><th className="py-1" /><th className="text-right">Itens</th><th className="text-right">Zerados</th><th className="text-right">%</th><th className="text-right">Risco</th><th className="text-right">Perda/mês</th></tr></thead>
      <tbody>
        {linhas.map(l => (
          <tr key={l[chave]} className="border-t border-slate-100">
            <td className="py-1.5 font-semibold">{rot(l[chave])}</td>
            <td className="text-right">{fmtNum(l.itens)}</td><td className="text-right">{fmtNum(l.em_ruptura)}</td>
            <td className="text-right font-semibold text-red-700">{fmtPct(l.pct_ruptura)}</td><td className="text-right">{fmtNum(l.risco)}</td>
            <td className="text-right">{fmtMoeda(l.venda_perdida_mes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
