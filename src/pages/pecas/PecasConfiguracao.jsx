import React, { useEffect, useMemo, useState } from 'react'
import { FlaskConical, Plus, RotateCcw, Save, Settings2, Trash2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Abas, BotaoInfo, btnPri, btnSec, fmtMoeda, fmtNum, inputCls, PaginaPecas, TabelaPecas, useOpcoes } from './components/ui'
import { salvarParametros, simularClassificacao } from './gestorPecasApi'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const ler = (obj, chave) => chave.split('.').reduce((o, k) => o?.[k], obj)
function gravar(obj, chave, valor) {
  const [a, b] = chave.split('.')
  return b ? { ...obj, [a]: { ...obj[a], [b]: valor } } : { ...obj, [a]: valor }
}

const DIMENSOES = {
  'Curva de Venda': ['A', 'B', 'C'],
  'XYZ': ['X', 'Y', 'Z'],
  'Popularidade': ['F', 'M', 'R'],
  'Mobilidade': ['Rápido', 'Lento', 'Parado', 'Obsoleto (D)'],
}
const ROT_CLASSE = { F: 'Alta', M: 'Média', R: 'Baixa' }
// Mesmas opções do MicroWork (cálculo em engine.js → BASES_CURVA_VENDA)
const BASES_CURVA_VENDA = [
  ['quantidade', 'Quantidade'],
  ['qtd_custo_aquisicao', 'Quantidade * Custo Aquisição'],
  ['qtd_custo_medio', 'Quantidade * Custo Médio'],
  ['qtd_custo_medio_contabil', 'Quantidade * Custo Médio Contábil'],
  ['qtd_valor_base_venda', 'Quantidade * Valor Base Venda'],
  ['meses_com_saida', 'Quantidade de Meses com Saída'],
]

function Campo({ v, set, chave, rotulo, ajuda, escala, sufixo, desabilitado, tipo = 'number', opcoes }) {
  const valor = ler(v, chave)
  return (
    <label className="flex items-start justify-between gap-3 py-1">
      <span className="text-[11px] text-slate-700">{rotulo}{ajuda && <span className="block text-[10px] text-slate-500">{ajuda}</span>}</span>
      <span className="flex items-center gap-1 shrink-0">
        {tipo === 'select'
          ? <select className={inputCls} value={valor} disabled={desabilitado} onChange={e => set(p => gravar(p, chave, e.target.value))}>{opcoes.map(([o, t]) => <option key={o} value={o}>{t}</option>)}</select>
          : <input type="number" step="any" className={`${inputCls} w-20 text-right`} disabled={desabilitado}
              value={valor == null ? '' : escala ? Math.round(valor * escala * 100) / 100 : valor}
              onChange={e => set(p => gravar(p, chave, e.target.value === '' ? null : Number(e.target.value) / (escala || 1)))} />}
        {sufixo && <span className="text-[10px] text-slate-500 w-10">{sufixo}</span>}
      </span>
    </label>
  )
}

function Bloco({ titulo, info, children, className = '' }) {
  return (
    <div className={`relative bg-white border border-slate-200 rounded-lg p-4 ${className}`}>
      <BotaoInfo titulo={titulo} info={info} />
      <p className="text-[12px] font-bold text-slate-800 mb-2 pr-6">{titulo}</p>
      {children}
    </div>
  )
}

export default function PecasConfiguracao() {
  const sg = useSegmento()
  const { hasActionOrDefault } = useAuth()
  const pode = hasActionOrDefault(sg.perm('configuracao'), 'editar_parametros')
  const { opcoes, recarregar } = useOpcoes()
  const [v, setV] = useState(null)
  const [aba, setAba] = useState('regras')
  const [msg, setMsg] = useState(null)
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [sim, setSim] = useState(null)
  const [simulando, setSimulando] = useState(false)

  useEffect(() => { if (opcoes?.parametros && !v) setV(opcoes.parametros) }, [opcoes, v])
  const alterado = useMemo(() => v && opcoes?.parametros && JSON.stringify(v) !== JSON.stringify(opcoes.parametros), [v, opcoes])
  const dis = !pode

  const salvar = async () => {
    setSalvando(true); setErro(null); setMsg(null)
    try {
      const novos = await salvarParametros(v)
      setV(novos); recarregar(); setSim(null)
      setMsg('Configuração salva. Todas as telas do Gestor de Peças já classificam com as novas regras.')
    } catch (e) { setErro(e.message) }
    finally { setSalvando(false) }
  }
  const simular = async () => {
    setSimulando(true); setErro(null); setAba('simulacao')
    try { setSim(await simularClassificacao(v)) }
    catch (e) { setErro(e.message) }
    finally { setSimulando(false) }
  }

  const dePara = v?.de_para || []
  const setDePara = (fn) => setV(p => ({ ...p, de_para: fn(p.de_para || []) }))
  const sistemas = [...new Set(dePara.map(d => d.sistema))]

  return (
    <PaginaPecas icone={Settings2} titulo={`Classificação de Estoque — Peças ${sg.nome}`} tela="configuracao" fonte={opcoes?.fonte} erro={erro}
      acoes={v && <>
        {pode && <button type="button" className={btnSec} onClick={() => setV(opcoes.parametros_padrao)}><RotateCcw className="h-3.5 w-3.5" /> Restaurar padrões</button>}
        <button type="button" className={btnSec} onClick={simular} disabled={simulando}><FlaskConical className="h-3.5 w-3.5" /> Simular</button>
        {pode && <button type="button" className={btnPri} onClick={salvar} disabled={salvando || !alterado}><Save className="h-3.5 w-3.5" /> Salvar</button>}
      </>}>
      {msg && <div className="p-2 rounded-md bg-green-50 border border-green-200 text-[11px] text-green-800">{msg}</div>}
      {alterado && <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">Há alterações não salvas. Use <strong>Simular</strong> para ver o impacto antes de salvar.</div>}
      {!pode && <p className="text-[11px] text-slate-500">Somente leitura — seu grupo não tem a ação "Editar Parâmetros".</p>}

      {v && (
        <>
          <Abas abas={[['regras', 'Regras de classificação'], ['compra', 'Política de compra'], ['depara', 'De-para dos sistemas'], ['simulacao', 'Simulação']]} aba={aba} onChange={setAba} />

          {aba === 'regras' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Bloco titulo="Classificação Curva de Venda (ABC) — quanto vende?" info={INFO.abc}>
                <Campo v={v} set={setV} desabilitado={dis} chave="abc_base" rotulo="Base de classificação" tipo="select" opcoes={BASES_CURVA_VENDA} />
                <Campo v={v} set={setV} desabilitado={dis} chave="abc_periodo_meses" rotulo="Período de saída" sufixo="meses" />
                <Campo v={v} set={setV} desabilitado={dis} chave="abc_corte_a" rotulo="Curva A — até % acumulado" sufixo="%" />
                <Campo v={v} set={setV} desabilitado={dis} chave="abc_corte_b" rotulo="Curva B — até % acumulado" sufixo="%" ajuda="C = restante" />
                <p className="text-[10px] text-slate-500 mt-1">Equivale a A {v.abc_corte_a}% · B {Math.round((v.abc_corte_b - v.abc_corte_a) * 100) / 100}% · C {Math.round((100 - v.abc_corte_b) * 100) / 100}% (forma do MicroWork) ou 70/90/100 acumulado (forma do Dealer.net).</p>
              </Bloco>
              <Bloco titulo="Curva XYZ — quanto dinheiro tem em estoque?" info={INFO.xyz}>
                <Campo v={v} set={setV} desabilitado={dis} chave="xyz_base" rotulo="Base de classificação" tipo="select" opcoes={[['valor_estoque', 'Custo médio × saldo atual'], ['custo_medio', 'Custo médio unitário']]} />
                <Campo v={v} set={setV} desabilitado={dis} chave="xyz_corte_x" rotulo="Curva X — até % acumulado" sufixo="%" />
                <Campo v={v} set={setV} desabilitado={dis} chave="xyz_corte_y" rotulo="Curva Y — até % acumulado" sufixo="%" ajuda="Z = restante (e itens sem saldo)" />
              </Bloco>
              <Bloco titulo="Popularidade — em quantos meses vende?" info={INFO.freq}>
                <Campo v={v} set={setV} desabilitado={dis} chave="freq_alta_meses" rotulo="Alta — mínimo de meses com venda (de 12)" sufixo="meses" />
                <Campo v={v} set={setV} desabilitado={dis} chave="freq_media_meses" rotulo="Média — mínimo de meses com venda" sufixo="meses" ajuda="Abaixo disso = Baixa" />
                <p className="text-[10px] text-slate-500 mt-1">Clientes distintos (como no MicroWork) entram quando as vendas reais estiverem conectadas.</p>
              </Bloco>
              <Bloco titulo="Regularidade — a venda é constante?" info={INFO.reg}>
                <Campo v={v} set={setV} desabilitado={dis} chave="reg_cv_estavel" rotulo="Estável — coeficiente de variação até" />
                <Campo v={v} set={setV} desabilitado={dis} chave="reg_cv_variavel" rotulo="Variável — coeficiente de variação até" ajuda="Acima disso = Irregular" />
              </Bloco>
              <Bloco titulo="Mobilidade e Curva D — há quanto tempo não sai?" info={INFO.mobilidade} className="xl:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6">
                  <Campo v={v} set={setV} desabilitado={dis} chave="mob_rapido_meses" rotulo="Rápido: última saída até" sufixo="meses" />
                  <Campo v={v} set={setV} desabilitado={dis} chave="mob_lento_meses" rotulo="Lento: até" sufixo="meses" ajuda="Acima = Parado (alerta pré-obsoleto)" />
                  <Campo v={v} set={setV} desabilitado={dis} chave="obsoleto_meses" rotulo="Obsoleto (Curva D): sem saída há" sufixo="meses" />
                </div>
              </Bloco>
            </div>
          )}

          {aba === 'compra' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Bloco titulo="Dias de estoque por célula (Curva de Venda × XYZ)" info={INFO.matriz} className="xl:col-span-2">
                <Campo v={v} set={setV} desabilitado={dis} chave="metodo_compra" rotulo="Método de cálculo da compra" tipo="select" opcoes={[['dias', 'Dias de estoque por célula (padrão)'], ['estatistico', 'Estatístico (nível de serviço)']]} />
                <Campo v={v} set={setV} desabilitado={dis} chave="tempo_reposicao_dias" rotulo="Tempo de reposição padrão" sufixo="dias" ajuda="Usado quando o fornecedor e o item não têm lead time" />
                <table className={`mt-2 text-[11px] border-separate border-spacing-1 ${v.metodo_compra === 'estatistico' ? 'opacity-40' : ''}`}>
                  <thead><tr><th /><th className="text-slate-500">X</th><th className="text-slate-500">Y</th><th className="text-slate-500">Z</th></tr></thead>
                  <tbody>{[['A', '', 'Venda A'], ['B', '', 'Venda B'], ['C', '', 'Venda C'], ['C', '_POP', 'Venda C popular']].map(([a, suf, rot]) => (
                    <tr key={a + suf}><th className="text-slate-500 pr-2 text-right whitespace-nowrap">{rot}</th>
                      {['X', 'Y', 'Z'].map(x => (
                        <td key={x}><label className="flex items-center gap-1"><span className="text-[10px] text-slate-500 w-8">{a}{x}{suf ? '+' : ''}</span>
                          <input type="number" min={0} className={`${inputCls} w-16 text-right`} disabled={dis || v.metodo_compra === 'estatistico'}
                            value={v.dias_estoque?.[a + x + suf] ?? 0} onChange={e => setV(p => ({ ...p, dias_estoque: { ...p.dias_estoque, [a + x + suf]: Math.max(0, Number(e.target.value) || 0) } }))} />
                        </label></td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-700">
                  <span><strong>Venda C popular</strong> = item C com Popularidade:</span>
                  {[['F', 'Alta'], ['M', 'Média'], ['R', 'Baixa']].map(([f, rot]) => (
                    <label key={f} className="flex items-center gap-1">
                      <input type="checkbox" disabled={dis || v.metodo_compra === 'estatistico'} checked={(v.c_popular_freq || []).includes(f)}
                        onChange={e => setV(p => ({ ...p, c_popular_freq: e.target.checked ? [...new Set([...(p.c_popular_freq || []), f])] : (p.c_popular_freq || []).filter(x => x !== f) }))} />
                      {rot}
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">0 dias = <strong>Sob encomenda</strong> (a célula não gera sugestão de compra). Na linha "Venda C popular", 0 dias = segue a regra da Venda C.</p>
              </Bloco>
              <Bloco titulo="Estoque de segurança e método estatístico" info={INFO.reposicao}>
                <Campo v={v} set={setV} desabilitado={dis} chave="nivel_servico.A" rotulo="Nível de serviço — Venda A" sufixo="%" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis} chave="nivel_servico.B" rotulo="Nível de serviço — Venda B" sufixo="%" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis} chave="nivel_servico.C" rotulo="Nível de serviço — Venda C" sufixo="%" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis || v.metodo_compra !== 'estatistico'} chave="ciclo_revisao_dias" rotulo="Ciclo de compra (só no método estatístico)" sufixo="dias" />
              </Bloco>
              <Bloco titulo="Excesso, preço e compras" info={INFO.excesso}>
                <Campo v={v} set={setV} desabilitado={dis} chave="cobertura_alvo_dias" rotulo="Cobertura alvo (acima = excesso)" sufixo="dias" />
                <Campo v={v} set={setV} desabilitado={dis} chave="tendencia_queda" rotulo="Queda de vendas para alerta pré-obsoleto" sufixo="%/ano" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis} chave="margem_minima" rotulo="Margem mínima" sufixo="%" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis} chave="variacao_custo_alerta" rotulo="Variação de custo para alerta" sufixo="%" escala={100} />
                <Campo v={v} set={setV} desabilitado={dis} chave="dias_preco_desatualizado" rotulo="Preço sem reajuste para alerta" sufixo="dias" />
                <Campo v={v} set={setV} desabilitado={dis} chave="anomalia_compra_z" rotulo="Compra fora do padrão (z-score)" />
              </Bloco>
              <Bloco titulo="Lead time por fornecedor (dias)" className="xl:col-span-2">
                <p className="text-[10px] text-slate-500 mb-2">Em branco = usa o lead time do cadastro do item. Compare com o lead time real na tela Fornecedores.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {(opcoes?.fornecedores || []).map(f => (
                    <label key={f} className="flex items-center justify-between gap-2 text-[11px] text-slate-700">
                      <span className="truncate">{f}</span>
                      <input type="number" min={0} className={`${inputCls} w-20 text-right`} disabled={dis} value={v.lead_time_fornecedor?.[f] ?? ''}
                        onChange={e => setV(p => { const lt = { ...(p.lead_time_fornecedor || {}) }; if (e.target.value === '') delete lt[f]; else lt[f] = Number(e.target.value); return { ...p, lead_time_fornecedor: lt } })} />
                    </label>
                  ))}
                </div>
              </Bloco>
            </div>
          )}

          {aba === 'depara' && (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-600 max-w-4xl">A letra oficial é a do Gestor (regras acima, iguais para todas as lojas). Este de-para liga cada classificação dos sistemas de origem à classificação do Gestor. Quando os dados reais estiverem conectados, as telas mostram ao lado a letra do sistema de origem e avisam quando ela divergir da do Gestor.</p>
              {sistemas.map(sis => (
                <div key={sis} className="bg-white border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                    <p className="text-[12px] font-bold text-slate-800">{sis} <span className="font-normal text-slate-500">— {dePara.find(d => d.sistema === sis)?.empresa}</span></p>
                    {pode && <button type="button" className={btnSec} onClick={() => setDePara(l => [...l, { sistema: sis, empresa: l.find(d => d.sistema === sis)?.empresa, origem: '', letra: '', descricao: '', dimensao: 'Curva de Venda', classe: 'A' }])}><Plus className="h-3.5 w-3.5" /> Linha</button>}
                  </div>
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-600"><tr className="text-left"><th className="px-2 py-1.5">Classificação no {sis}</th><th className="px-2">Letra</th><th className="px-2">Descrição no {sis}</th><th className="px-2">→ Classificação no Gestor</th><th className="px-2">Classe</th><th /></tr></thead>
                    <tbody>
                      {dePara.map((d, i) => d.sistema !== sis ? null : (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="px-2 py-1"><input className={`${inputCls} w-40`} disabled={dis} value={d.origem} onChange={e => setDePara(l => l.map((x, j) => (j === i ? { ...x, origem: e.target.value } : x)))} /></td>
                          <td className="px-2"><input className={`${inputCls} w-14`} disabled={dis} value={d.letra} onChange={e => setDePara(l => l.map((x, j) => (j === i ? { ...x, letra: e.target.value } : x)))} /></td>
                          <td className="px-2"><input className={`${inputCls} w-full min-w-[220px]`} disabled={dis} value={d.descricao} onChange={e => setDePara(l => l.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} /></td>
                          <td className="px-2"><select className={inputCls} disabled={dis} value={d.dimensao} onChange={e => setDePara(l => l.map((x, j) => (j === i ? { ...x, dimensao: e.target.value, classe: DIMENSOES[e.target.value][0] } : x)))}>{Object.keys(DIMENSOES).map(o => <option key={o}>{o}</option>)}</select></td>
                          <td className="px-2"><select className={inputCls} disabled={dis} value={d.classe} onChange={e => setDePara(l => l.map((x, j) => (j === i ? { ...x, classe: e.target.value } : x)))}>{(DIMENSOES[d.dimensao] || []).map(o => <option key={o} value={o}>{ROT_CLASSE[o] || o}</option>)}</select></td>
                          <td className="px-2">{pode && <button type="button" className="p-1 text-slate-400 hover:text-red-600" title="Remover" onClick={() => setDePara(l => l.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {aba === 'simulacao' && (
            <div className="space-y-3">
              {!sim && !simulando && <p className="text-[11px] text-slate-500">Altere as regras e clique em <strong>Simular</strong> para comparar a classificação atual com a proposta (sem salvar).</p>}
              {simulando && <p className="text-[11px] text-slate-500">Simulando...</p>}
              {sim && (
                <>
                  <p className="text-[12px] text-slate-700"><strong>{fmtNum(sim.mudam.total)}</strong> itens mudam de classificação — Curva de Venda: {fmtNum(sim.mudam.abc)} · XYZ: {fmtNum(sim.mudam.xyz)} · Popularidade: {fmtNum(sim.mudam.freq)} · Mobilidade: {fmtNum(sim.mudam.mobilidade)}</p>
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead className="bg-slate-50 text-slate-600"><tr className="text-left"><th className="px-3 py-1.5">Indicador</th><th className="px-3 text-right">Atual</th><th className="px-3 text-right">Simulado</th></tr></thead>
                      <tbody>
                        {[
                          ['Curva de Venda A / B / C', s => `${s.abc.A} / ${s.abc.B} / ${s.abc.C}`],
                          ['XYZ X / Y / Z', s => `${s.xyz.X} / ${s.xyz.Y} / ${s.xyz.Z}`],
                          ['Popularidade Alta / Média / Baixa', s => `${s.freq.F} / ${s.freq.M} / ${s.freq.R}`],
                          ['Mobilidade Rápido / Lento / Parado / Obsoleto', s => `${s.mobilidade['Rápido']} / ${s.mobilidade.Lento} / ${s.mobilidade.Parado} / ${s.mobilidade['Obsoleto (D)']}`],
                          ['Itens sob encomenda', s => fmtNum(s.sob_encomenda)],
                          ['Sugestão de compra', s => `${fmtMoeda(s.compra_valor)} (${fmtNum(s.compra_itens)} itens × loja)`],
                          ['Excesso', s => fmtMoeda(s.excesso_valor)],
                          ['Pré-obsoleto (Parado)', s => fmtMoeda(s.pre_obsoleto_valor)],
                          ['Obsoleto (Curva D)', s => fmtMoeda(s.obsoleto_valor)],
                        ].map(([nome, fn]) => {
                          const a = fn(sim.atual), b = fn(sim.simulado)
                          return <tr key={nome} className="border-t border-slate-100"><td className="px-3 py-1.5">{nome}</td><td className="px-3 text-right tabular-nums">{a}</td><td className={`px-3 text-right tabular-nums ${a !== b ? 'font-bold text-orange-700' : ''}`}>{b}</td></tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                  <TabelaPecas rows={sim.exemplos} nomeArquivo="simulacao-classificacao" vazio="Nenhum item muda de classificação." cols={[
                    { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' },
                    { k: 'de', t: 'Atual (Venda·XYZ·Popularidade·Mobilidade)' }, { k: 'para', t: 'Simulado' },
                    { k: 'campos', t: 'O que muda', render: r => r.campos.map(c => ({ abc: 'Venda', xyz: 'XYZ', freq: 'Popularidade', mobilidade: 'Mobilidade' }[c])).join(', ') },
                  ]} />
                </>
              )}
            </div>
          )}
        </>
      )}
    </PaginaPecas>
  )
}
