import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { Check, FileSpreadsheet, ShoppingCart, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Abas, Badge, BadgeClasse, btnPri, btnSec, CardKpi, fmtMoeda, fmtNum, inputCls, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { listarSugestoes, listarSugestoesRecentes, salvarSugestoes } from './gestorPecasApi'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const chave = (r) => `${r.codigo}|${r.empresa_nome}`

export default function PecasReposicao() {
  const sg = useSegmento()
  const { hasActionOrDefault } = useAuth()
  const podeAprovar = hasActionOrDefault(sg.perm('reposicao'), 'aprovar_sugestao')
  const [filtros, setFiltros] = useFiltrosPecas()
  const { dados, carregando, erro, recarregar } = useTela('reposicao', filtros)
  const [aba, setAba] = useState('sugestao')
  const [salvas, setSalvas] = useState(new Map())
  const [historico, setHistorico] = useState([])
  const [erroSalvar, setErroSalvar] = useState(null)
  const [qtdEditada, setQtdEditada] = useState({})
  const [selecionados, setSelecionados] = useState(new Set())
  const [soCompra, setSoCompra] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const k = dados?.kpis || {}

  const carregarSalvas = useCallback(async () => {
    if (!dados?.data_base) return
    try {
      const lista = await listarSugestoes(dados.data_base)
      setSalvas(new Map(lista.map(s => [`${s.codigo}|${s.empresa_nome}`, s])))
      setErroSalvar(null)
    } catch (e) { setErroSalvar(e.message) }
  }, [dados?.data_base])
  useEffect(() => { carregarSalvas() }, [carregarSalvas])
  useEffect(() => { if (aba === 'historico') listarSugestoesRecentes().then(setHistorico).catch(e => setErroSalvar(e.message)) }, [aba])

  const linhas = useMemo(() => (dados?.rows || [])
    .filter(r => !soCompra || r.sugestao_compra > 0)
    .map(r => {
      const s = salvas.get(chave(r))
      const qtd = qtdEditada[chave(r)] ?? s?.qtd_aprovada ?? r.sugestao_compra
      return { ...r, qtd_compra: qtd, valor_compra: qtd * r.custo, status: s?.status || 'Pendente' }
    }), [dados, salvas, qtdEditada, soCompra])

  const gravar = async (status) => {
    const alvo = linhas.filter(r => selecionados.has(chave(r)))
    if (!alvo.length) return
    setSalvando(true)
    try {
      await salvarSugestoes(alvo.map(r => ({
        data_referencia: dados.data_base, codigo: r.codigo, descricao: r.descricao, empresa_nome: r.empresa_nome, fornecedor: r.fornecedor,
        qtd_sugerida: r.sugestao_compra, qtd_aprovada: status === 'Rejeitada' ? 0 : r.qtd_compra, custo_unitario: r.custo, status,
      })))
      setSelecionados(new Set())
      await carregarSalvas()
    } catch (e) { setErroSalvar(e.message) }
    finally { setSalvando(false) }
  }

  // Uma aba por fornecedor com os itens aprovados (ou os selecionados, se não houver aprovados)
  const exportarPorFornecedor = () => {
    let base = linhas.filter(r => r.status === 'Aprovada' || r.status === 'Pedido emitido')
    if (!base.length) base = linhas.filter(r => selecionados.has(chave(r)))
    if (!base.length) base = linhas
    const wb = XLSX.utils.book_new()
    const porForn = new Map()
    base.forEach(r => { if (!porForn.has(r.fornecedor)) porForn.set(r.fornecedor, []); porForn.get(r.fornecedor).push(r) })
    for (const [forn, itens] of porForn) {
      const ws = XLSX.utils.json_to_sheet(itens.filter(r => r.qtd_compra > 0).map(r => ({
        'Código': r.codigo, 'Descrição': r.descricao, 'Loja': nomeLoja(r.empresa_nome), 'Qtd': r.qtd_compra, 'Custo unit.': r.custo, 'Total': Math.round(r.qtd_compra * r.custo * 100) / 100, 'Classe': r.classe, 'Status': r.status,
      })))
      XLSX.utils.book_append_sheet(wb, ws, forn.replace(/[\\/?*[\]:]/g, '').slice(0, 31))
    }
    XLSX.writeFile(wb, `pedido-compra-por-fornecedor-${dados.data_base}.xlsx`)
  }

  const totalSel = linhas.filter(r => selecionados.has(chave(r))).reduce((a, r) => a + r.valor_compra, 0)

  return (
    <PaginaPecas icone={ShoppingCart} titulo="Necessidade de Reposição e Sugestão de Compra" tela="reposicao" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="reposicao">
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <CardKpi label="Itens abaixo do ponto de pedido" valor={fmtNum(k.itens_abaixo_pp)} info={INFO.reposicao} />
            <CardKpi label="Itens a comprar" valor={fmtNum(k.itens_comprar)} info={INFO.reposicao} cor="#16a34a" />
            <CardKpi label="Valor da sugestão" valor={fmtMoeda(k.valor_sugestao)} info={INFO.reposicao} cor="#16a34a" />
            <CardKpi label="Em ruptura" valor={fmtNum(k.em_ruptura)} info={INFO.ruptura} cor="#dc2626" />
            <CardKpi label="Atendidos por transferência" valor={fmtNum(k.itens_cobertos_transferencia)} sub={`${fmtMoeda(k.valor_evitado_transferencia)} sem comprar`} info={INFO.transferencia} cor="#0ea5e9" />
            <CardKpi label="Aprovados hoje" valor={fmtNum([...salvas.values()].filter(s => s.status === 'Aprovada').length)} sub={fmtMoeda([...salvas.values()].filter(s => s.status === 'Aprovada').reduce((a, s) => a + (s.qtd_aprovada || 0) * (s.custo_unitario || 0), 0))} cor="#a855f7" />
          </div>
          {erroSalvar && <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{erroSalvar} A sugestão continua visível, mas aprovações não serão gravadas.</div>}

          <Abas abas={[['sugestao', 'Sugestão de compra'], ['fornecedor', 'Por fornecedor'], ['historico', 'Revisões gravadas']]} aba={aba} onChange={setAba} />

          {aba === 'sugestao' && (
            <TabelaPecas rows={linhas} nomeArquivo="sugestao-compra" selecao={{ selecionados, setSelecionados, chave }}
              linhaClasse={r => (r.status === 'Aprovada' ? 'bg-green-50/60' : r.status === 'Rejeitada' ? 'opacity-50' : '')}
              acoesTopo={
                <>
                  <label className="flex items-center gap-1 text-[11px] text-slate-600"><input type="checkbox" checked={soCompra} onChange={e => setSoCompra(e.target.checked)} /> Só itens a comprar</label>
                  {selecionados.size > 0 && <span className="text-[11px] text-slate-600">Selecionado: <strong>{fmtMoeda(totalSel)}</strong></span>}
                  {podeAprovar && <button type="button" className={btnPri} disabled={!selecionados.size || salvando} onClick={() => gravar('Aprovada')}><Check className="h-3.5 w-3.5" /> Aprovar</button>}
                  {podeAprovar && <button type="button" className={btnSec} disabled={!selecionados.size || salvando} onClick={() => gravar('Rejeitada')}><X className="h-3.5 w-3.5" /> Rejeitar</button>}
                  {podeAprovar && <button type="button" className={btnSec} disabled={!selecionados.size || salvando} onClick={() => gravar('Pedido emitido')}>Pedido emitido</button>}
                  <button type="button" className={btnSec} onClick={exportarPorFornecedor}><FileSpreadsheet className="h-3.5 w-3.5" /> Pedido por fornecedor</button>
                </>
              }
              cols={[
                { k: 'status', t: 'Status', render: r => <Badge texto={r.status} /> },
                { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'fornecedor', t: 'Fornecedor' },
                { k: 'classe', t: 'Classe', render: r => <BadgeClasse r={r} /> },
                { k: 'saldo', t: 'Saldo', fmt: 'num' }, { k: 'pendente', t: 'Pendente', fmt: 'num' },
                { k: 'previsao_mes', t: 'Prev. mês', fmt: 'num1' }, { k: 'estoque_seguranca', t: 'Segurança', fmt: 'num1' },
                { k: 'ponto_pedido', t: 'Ponto pedido', fmt: 'num1' }, { k: 'estoque_maximo', t: 'Máximo', fmt: 'num1' },
                { k: 'lead_time', t: 'LT (d)', fmt: 'num' }, { k: 'necessidade', t: 'Necessidade', fmt: 'num' },
                { k: 'transferencia_entrada', t: 'Via transf.', fmt: 'num' }, { k: 'sugestao_compra', t: 'Sugestão', fmt: 'num' },
                { k: 'qtd_compra', t: 'Qtd a comprar', render: r => (
                  <input type="number" min={0} className={`${inputCls} w-16 text-right`} value={r.qtd_compra} disabled={!podeAprovar}
                    onChange={e => setQtdEditada(q => ({ ...q, [chave(r)]: Math.max(0, Number(e.target.value) || 0) }))} />
                ), exportar: r => r.qtd_compra },
                { k: 'valor_compra', t: 'Valor', fmt: 'moeda' },
                { k: 'ruptura', t: 'Zerado', render: r => (r.ruptura ? <Badge texto="Ruptura" /> : '') },
              ]} />
          )}
          {aba === 'fornecedor' && (
            <TabelaPecas rows={dados.porFornecedor} nomeArquivo="sugestao-por-fornecedor" cols={[
              { k: 'chave', t: 'Fornecedor' }, { k: 'itens', t: 'Itens a comprar', fmt: 'num' }, { k: 'qtd', t: 'Unidades', fmt: 'num' },
              { k: 'valor', t: 'Valor', fmt: 'moeda' }, { k: 'em_ruptura', t: 'Itens em ruptura', fmt: 'num' },
            ]} />
          )}
          {aba === 'historico' && (
            <TabelaPecas rows={historico} nomeArquivo="sugestoes-revisadas" cols={[
              { k: 'data_referencia', t: 'Data', fmt: 'data' }, { k: 'status', t: 'Status', render: r => <Badge texto={r.status} /> },
              { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'empresa_nome', t: 'Loja', fmt: 'loja' }, { k: 'fornecedor', t: 'Fornecedor' },
              { k: 'qtd_sugerida', t: 'Sugerida', fmt: 'num' }, { k: 'qtd_aprovada', t: 'Aprovada', fmt: 'num' }, { k: 'custo_unitario', t: 'Custo', fmt: 'moeda2' },
              { k: 'usuario', t: 'Usuário' },
            ]} />
          )}
        </>
      )}
    </PaginaPecas>
  )
}
