import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, CardGrafico, CardKpi, COR_SITUACAO, eixo, fmtMil, fmtMoeda, fmtNum, fmtPct, nomeLoja, PaginaPecas, Secao, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const CAMPOS = ['loja', 'marca', 'grupo', 'fornecedor', 'abc']

const ORDEM_SEV = ['Crítica', 'Alta', 'Média', 'Baixa']

export default function PecasCentralAlertas() {
  const sg = useSegmento()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const { dados, carregando, erro, recarregar } = useTela('alertas', filtros)
  const [tipo, setTipo] = useState(null)
  const [sev, setSev] = useState(null)
  const k = dados?.kpis || {}

  const alertas = useMemo(() => (dados?.alertas || []).filter(a => (!tipo || a.tipo === tipo) && (!sev || a.severidade === sev)), [dados, tipo, sev])

  return (
    <PaginaPecas icone={Bell} titulo="Central de Alertas" tela="central-alertas" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="alertas" mostrarFiltros={CAMPOS}>
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <CardKpi label="Valor em estoque" valor={fmtMoeda(k.valor)} sub={`${fmtNum(k.skus_ativos)} SKUs ativos`} info={INFO.valorEstoque} onClick={() => navigate(sg.rota('estoque'))} />
            <CardKpi label="Giro anual" valor={`${fmtNum(k.giro_anual, 2)}x`} sub={`Cobertura média ${fmtNum(k.cobertura_media_dias)} dias`} info={INFO.giro} cor="#0ea5e9" />
            <CardKpi label="Ruptura" valor={fmtPct(k.pct_ruptura)} sub={`${fmtNum(k.ruptura_itens)} itens · perda ${fmtMoeda(k.venda_perdida_mes)}/mês`} info={INFO.ruptura} cor="#dc2626" onClick={() => navigate(sg.rota('cobertura-ruptura'))} />
            <CardKpi label="Excesso" valor={fmtMoeda(k.excesso_valor)} info={INFO.excesso} cor="#0ea5e9" onClick={() => navigate(sg.rota('excesso-obsoletos'))} />
            <CardKpi label="Obsoletos" valor={fmtMoeda(k.obsoleto_valor)} sub={`${fmtPct(k.pct_obsoleto)} do estoque · pré-obsoletos ${fmtMoeda(k.pre_obsoleto_valor)}`} info={INFO.obsoleto} cor="#475569" onClick={() => navigate(sg.rota('excesso-obsoletos'))} />
            <CardKpi label="Sugestão de compra" valor={fmtMoeda(k.sugestao_compra_valor)} sub={`Transferências possíveis ${fmtMoeda(k.transferencias_valor)}`} info={INFO.reposicao} cor="#16a34a" onClick={() => navigate(sg.rota('reposicao'))} />
          </div>

          <Secao titulo={`Alertas por tipo (${fmtNum(dados.total_alertas)})`}>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {[...(dados.porTipo || [])].sort((a, b) => b.criticas - a.criticas || b.altas - a.altas).map(t => (
                <button key={t.chave} type="button" onClick={() => setTipo(tipo === t.chave ? null : t.chave)}
                  className={`text-left bg-white border rounded-lg p-3 hover:shadow-sm transition ${tipo === t.chave ? 'border-orange-500 ring-2 ring-orange-200' : 'border-slate-200'}`}>
                  <p className="text-[11px] font-semibold text-slate-600">{t.chave}</p>
                  <p className="text-base font-bold text-slate-900">{fmtNum(t.total)}</p>
                  <div className="flex gap-1 mt-1">{t.criticas > 0 && <Badge texto="Crítica" />}{t.criticas > 0 && <span className="text-[10px] text-slate-500">{t.criticas}</span>}{t.altas > 0 && <Badge texto="Alta" />}{t.altas > 0 && <span className="text-[10px] text-slate-500">{t.altas}</span>}</div>
                  <span className="text-[10px] text-orange-700 hover:underline mt-1 inline-block" onClick={(e) => { e.stopPropagation(); navigate(sg.rotaTela(t.tela)) }}>Abrir tela →</span>
                </button>
              ))}
            </div>
          </Secao>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <CardGrafico titulo="Estoque por situação (valor)" info={INFO.valorEstoque}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.porSituacao} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={eixo} tickFormatter={fmtMil} />
                  <YAxis type="category" dataKey="situacao" tick={eixo} width={110} />
                  <Tooltip formatter={(v, n, p) => [`${fmtMoeda(v)} · ${fmtNum(p.payload.itens)} itens×loja`, 'Valor']} />
                  <Bar dataKey="valor">{dados.porSituacao.map(s => <Cell key={s.situacao} fill={COR_SITUACAO[s.situacao]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardGrafico>
            <CardGrafico titulo="Comparativo por loja" info={INFO.ruptura}>
              <TabelaLojas lojas={dados.porLoja} />
            </CardGrafico>
          </div>

          <Secao titulo="Lista de alertas" acoes={
            <div className="flex items-center gap-1">
              {ORDEM_SEV.map(s => <button key={s} type="button" onClick={() => setSev(sev === s ? null : s)} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sev === s ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'}`}>{s}</button>)}
              {(tipo || sev) && <button type="button" className="text-[11px] text-orange-700 hover:underline ml-2" onClick={() => { setTipo(null); setSev(null) }}>Limpar</button>}
            </div>
          }>
            <TabelaPecas rows={alertas} nomeArquivo="alertas-pecas" cols={[
              { k: 'severidade', t: 'Severidade', render: r => <Badge texto={r.severidade} /> },
              { k: 'tipo', t: 'Tipo' },
              { k: 'codigo', t: 'Código' },
              { k: 'descricao', t: 'Descrição' },
              { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
              { k: 'mensagem', t: 'Detalhe', w: 'min-w-[320px]' },
              { k: 'valor', t: 'Valor', fmt: 'moeda' },
              { k: '_acoes', t: '', render: r => <button type="button" className="text-orange-700 hover:underline whitespace-nowrap" onClick={() => navigate(sg.rotaTela(r.tela))}>Tratar →</button> },
            ]} />
          </Secao>
        </>
      )}
    </PaginaPecas>
  )
}

function TabelaLojas({ lojas }) {
  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-[11px]">
        <thead className="text-slate-500"><tr className="text-left"><th className="py-1">Loja</th><th className="text-right">Estoque</th><th className="text-right">SKUs</th><th className="text-right">Giro</th><th className="text-right">Ruptura</th><th className="text-right">Excesso</th><th className="text-right">Obsoleto</th></tr></thead>
        <tbody>
          {(lojas || []).map(l => (
            <tr key={l.chave} className="border-t border-slate-100">
              <td className="py-1.5 font-semibold">{nomeLoja(l.chave)}</td>
              <td className="text-right">{fmtMoeda(l.valor)}</td>
              <td className="text-right">{fmtNum(l.skus_ativos)}</td>
              <td className="text-right">{fmtNum(l.giro_anual, 2)}x</td>
              <td className="text-right">{fmtPct(l.pct_ruptura)}</td>
              <td className="text-right">{fmtMoeda(l.excesso_valor)}</td>
              <td className="text-right">{fmtMoeda(l.obsoleto_valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
