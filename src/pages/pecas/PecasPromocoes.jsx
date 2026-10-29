import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../../context/AuthContext'
import { Abas, Badge, BadgeClasse, btnPri, btnSec, CardGrafico, CardKpi, eixo, fmtData, fmtMil, fmtMoeda, fmtNum, fmtPct, inputCls, Modal, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { atualizarPromocao, criarPromocao, excluirPromocao, listarPromocoes } from './gestorPecasApi'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const chave = (r) => `${r.codigo}|${r.empresa_nome}`
const hoje = () => new Date().toISOString().slice(0, 10)
const emDias = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

export default function PecasPromocoes() {
  const sg = useSegmento()
  const { hasActionOrDefault } = useAuth()
  const podeCriar = hasActionOrDefault(sg.perm('promocoes'), 'criar_promocao')
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('promocoes', filtros)
  const [aba, setAba] = useState('candidatos')
  const [selecionados, setSelecionados] = useState(new Set())
  const [campanhas, setCampanhas] = useState([])
  const [erroBanco, setErroBanco] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', data_inicio: hoje(), data_fim: emDias(30), observacao: '' })
  const [descontos, setDescontos] = useState({})
  const [abertas, setAbertas] = useState(null)
  const k = dados?.kpis || {}

  const carregarCampanhas = useCallback(() => listarPromocoes().then(c => { setCampanhas(c); setErroBanco(null) }).catch(e => setErroBanco(e.message)), [])
  useEffect(() => { carregarCampanhas() }, [carregarCampanhas])

  const linhas = useMemo(() => (dados?.rows || []).map(r => {
    const d = descontos[chave(r)] ?? r.desconto_sugerido
    const preco = r.preco * (1 - d / 100)
    return { ...r, desconto: d, preco_final: preco, margem_final: preco > 0 ? (preco - r.custo_medio) / preco * 100 : 0, receita_final: preco * r.qtd_liquidar }
  }), [dados, descontos])
  const sel = linhas.filter(r => selecionados.has(chave(r)))

  const criar = async () => {
    try {
      await criarPromocao({
        ...form,
        itens: sel.map(r => ({
          codigo: r.codigo, descricao: r.descricao, empresa_nome: r.empresa_nome, qtd_alvo: r.qtd_liquidar,
          preco_original: r.preco, desconto_pct: r.desconto, preco_promocional: Math.round(r.preco_final * 100) / 100,
          custo_unitario: r.custo_medio, vendas_antes_mes: r.media_mensal,
        })),
      })
      setModal(false); setSelecionados(new Set()); setAba('campanhas'); carregarCampanhas()
    } catch (e) { setErroBanco(e.message) }
  }

  return (
    <PaginaPecas icone={Megaphone} titulo="Oportunidades de Promoção" tela="promocoes" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="promocoes">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardKpi label="Candidatos" valor={fmtNum(k.candidatos)} info={INFO.promocao} />
            <CardKpi label="Capital que pode ser liberado" valor={fmtMoeda(k.capital_liberado)} info={INFO.promocao} cor="#16a34a" />
            <CardKpi label="Receita potencial" valor={fmtMoeda(k.receita_potencial)} info={INFO.promocao} cor="#0ea5e9" />
            <CardKpi label="Desconto médio sugerido" valor={fmtPct(k.desconto_medio)} info={INFO.promocao} cor="#a855f7" />
          </div>
          {erroBanco && <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{erroBanco}</div>}
          <Abas abas={[['candidatos', 'Candidatos'], ['grupo', 'Por tipo de produto'], ['campanhas', `Campanhas (${campanhas.length})`]]} aba={aba} onChange={setAba} />

          {aba === 'candidatos' && (
            <TabelaPecas rows={linhas} nomeArquivo="promocao-candidatos" selecao={{ selecionados, setSelecionados, chave }}
              acoesTopo={podeCriar && <button type="button" className={btnPri} disabled={!selecionados.size} onClick={() => { setForm(f => ({ ...f, nome: f.nome || `Queima de estoque ${new Date().toLocaleDateString('pt-BR')}` })); setModal(true) }}><Plus className="h-3.5 w-3.5" /> Criar campanha ({selecionados.size})</button>}
              cols={[
                { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
                { k: 'situacao', t: 'Situação', render: r => <Badge texto={r.situacao} /> }, { k: 'classe', t: 'Classe', render: r => <BadgeClasse r={r} /> },
                { k: 'motivo', t: 'Motivo' }, { k: 'qtd_liquidar', t: 'Qtd a liquidar', fmt: 'num' },
                { k: 'preco', t: 'Preço', fmt: 'moeda2' }, { k: 'custo_medio', t: 'Custo', fmt: 'moeda2' }, { k: 'margem_atual', t: 'Margem atual', fmt: 'pct' },
                { k: 'desconto', t: 'Desconto %', render: r => (
                  <input type="number" min={0} max={90} step={0.5} className={`${inputCls} w-16 text-right`} value={r.desconto}
                    onChange={e => setDescontos(d => ({ ...d, [chave(r)]: Math.min(90, Math.max(0, Number(e.target.value) || 0)) }))} />
                ), exportar: r => r.desconto },
                { k: 'preco_final', t: 'Preço promo', fmt: 'moeda2' },
                { k: 'margem_final', t: 'Margem promo', render: r => <span className={r.margem_final < 0 ? 'text-red-600 font-semibold' : ''}>{fmtPct(r.margem_final)}</span>, exportar: r => r.margem_final },
                { k: 'capital_liberado', t: 'Capital liberado', fmt: 'moeda' }, { k: 'receita_final', t: 'Receita', fmt: 'moeda' },
              ]} />
          )}
          {aba === 'grupo' && (
            <CardGrafico titulo="Capital liberável por tipo de produto" info={INFO.promocao} altura="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.porGrupo}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="chave" tick={{ ...eixo, fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis tick={eixo} tickFormatter={fmtMil} /><Tooltip formatter={(v, n, p) => [`${fmtMoeda(v)} · ${p.payload.itens} itens`, 'Capital']} /><Bar dataKey="capital_liberado" fill="#16a34a" /></BarChart>
              </ResponsiveContainer>
            </CardGrafico>
          )}
          {aba === 'campanhas' && (
            <div className="space-y-2">
              {!campanhas.length && <p className="text-[11px] text-slate-500">Nenhuma campanha criada. Selecione candidatos e clique em "Criar campanha".</p>}
              {campanhas.map(c => {
                const capital = (c.itens || []).reduce((a, i) => a + (i.qtd_alvo || 0) * (i.custo_unitario || 0), 0)
                const receita = (c.itens || []).reduce((a, i) => a + (i.qtd_alvo || 0) * (i.preco_promocional || 0), 0)
                return (
                  <div key={c.id} className="bg-white border border-slate-200 rounded-lg">
                    <div className="flex flex-wrap items-center gap-3 p-3">
                      <button type="button" className="text-left flex-1 min-w-[200px]" onClick={() => setAbertas(abertas === c.id ? null : c.id)}>
                        <p className="text-[12px] font-bold text-slate-900">{c.nome}</p>
                        <p className="text-[11px] text-slate-500">{fmtData(c.data_inicio)} a {fmtData(c.data_fim)} · {(c.itens || []).length} itens · capital {fmtMoeda(capital)} · receita alvo {fmtMoeda(receita)}</p>
                      </button>
                      <Badge texto={c.status} />
                      {podeCriar && (
                        <select className={inputCls} value={c.status} onChange={e => atualizarPromocao(c.id, { status: e.target.value }).then(carregarCampanhas).catch(er => setErroBanco(er.message))}>
                          {['Planejada', 'Ativa', 'Encerrada', 'Cancelada'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      )}
                      {podeCriar && <button type="button" className="p-1 text-slate-400 hover:text-red-600" title="Excluir campanha" onClick={() => window.confirm('Excluir esta campanha?') && excluirPromocao(c.id).then(carregarCampanhas)}><Trash2 className="h-4 w-4" /></button>}
                    </div>
                    {abertas === c.id && (
                      <div className="border-t border-slate-100 p-2">
                        <p className="text-[10px] text-slate-500 mb-1">Resultado (vendas durante a campanha × média antes) será calculado quando as vendas reais estiverem conectadas (fase 2).</p>
                        <TabelaPecas rows={c.itens || []} nomeArquivo={`campanha-${c.nome}`} tamanhoPagina={10} cols={[
                          { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' },
                          { k: 'qtd_alvo', t: 'Qtd alvo', fmt: 'num' }, { k: 'preco_original', t: 'Preço', fmt: 'moeda2' }, { k: 'desconto_pct', t: 'Desc.', fmt: 'pct' },
                          { k: 'preco_promocional', t: 'Preço promo', fmt: 'moeda2' }, { k: 'vendas_antes_mes', t: 'Venda média antes (un/mês)', fmt: 'num1' },
                        ]} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {modal && (
            <Modal titulo="Nova campanha promocional" onFechar={() => setModal(false)} rodape={<>
              <button type="button" className={btnSec} onClick={() => setModal(false)}>Cancelar</button>
              <button type="button" className={btnPri} disabled={!form.nome || !form.data_inicio || !form.data_fim} onClick={criar}>Criar campanha</button>
            </>}>
              <div className="space-y-3">
                <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase">Nome</span><input className={`${inputCls} w-full`} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} /></label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase">Início</span><input type="date" className={`${inputCls} w-full`} value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} /></label>
                  <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase">Fim</span><input type="date" className={`${inputCls} w-full`} value={form.data_fim} onChange={e => setForm({ ...form, data_fim: e.target.value })} /></label>
                </div>
                <label className="block"><span className="text-[10px] font-bold text-slate-500 uppercase">Observação</span><textarea className={`${inputCls} w-full`} rows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} /></label>
                <div className="p-2 rounded-md bg-slate-50">
                  <p><strong>{sel.length}</strong> itens · capital {fmtMoeda(sel.reduce((a, r) => a + r.capital_liberado, 0))} · receita {fmtMoeda(sel.reduce((a, r) => a + r.receita_final, 0))}</p>
                  <p className="text-slate-500 mt-1">Lojas: {[...new Set(sel.map(r => nomeLoja(r.empresa_nome)))].join(', ')}</p>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </PaginaPecas>
  )
}
