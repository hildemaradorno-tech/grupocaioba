import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Abas, Badge, btnPri, CardKpi, fmtMoeda, fmtNum, inputCls, nomeLoja, PaginaPecas, TabelaPecas, useFiltrosPecas, useTela } from './components/ui'
import { atualizarTransferencia, criarTransferencias, listarTransferencias } from './gestorPecasApi'
import { INFO } from './gestorPecasTextos'
import { useSegmento } from './segmento'

const CAMPOS = ['marca', 'grupo', 'fornecedor', 'abc']

const chave = (r) => `${r.codigo}|${r.loja_origem}|${r.loja_destino}`
const STATUS = ['Sugerida', 'Aprovada', 'Enviada', 'Recebida', 'Cancelada']

export default function PecasTransferencias() {
  const sg = useSegmento()
  const { hasActionOrDefault } = useAuth()
  const podeGerar = hasActionOrDefault(sg.perm('transferencias'), 'gerar_transferencia')
  const [filtros, setFiltros] = useFiltrosPecas(CAMPOS)
  const { dados, carregando, erro, recarregar } = useTela('transferencias', filtros)
  const [aba, setAba] = useState('sugestoes')
  const [selecionados, setSelecionados] = useState(new Set())
  const [geradas, setGeradas] = useState([])
  const [erroBanco, setErroBanco] = useState(null)
  const [msg, setMsg] = useState(null)
  const k = dados?.kpis || {}

  const carregarGeradas = useCallback(() => listarTransferencias().then(g => { setGeradas(g); setErroBanco(null) }).catch(e => setErroBanco(e.message)), [])
  useEffect(() => { carregarGeradas() }, [carregarGeradas])

  // Sugestão já gerada e ainda em andamento não é oferecida de novo
  const emAndamento = new Set(geradas.filter(g => !['Recebida', 'Cancelada'].includes(g.status)).map(chave))
  const sugestoes = (dados?.rows || []).map(r => ({ ...r, ja_gerada: emAndamento.has(chave(r)) }))

  const gerar = async () => {
    const alvo = sugestoes.filter(r => selecionados.has(chave(r)) && !r.ja_gerada)
    if (!alvo.length) return
    try {
      await criarTransferencias(alvo.map(r => ({ codigo: r.codigo, descricao: r.descricao, loja_origem: r.loja_origem, loja_destino: r.loja_destino, qtd: r.qtd, custo_unitario: r.custo_unitario, motivo: r.motivo })))
      setSelecionados(new Set()); setMsg(`${alvo.length} transferência(s) gerada(s).`); carregarGeradas()
    } catch (e) { setErroBanco(e.message) }
  }

  return (
    <PaginaPecas icone={ArrowRightLeft} titulo="Realocação e Transferência entre Lojas" tela="transferencias" fonte={dados?.fonte} carregando={carregando} erro={erro}
      onRecarregar={recarregar} filtros={filtros} setFiltros={setFiltros} iaTela="transferencias" mostrarFiltros={CAMPOS}>
      {dados && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CardKpi label="Transferências sugeridas" valor={fmtNum(k.sugestoes)} sub={`${fmtNum(k.qtd)} unidades`} info={INFO.transferencia} />
            <CardKpi label="Valor realocado" valor={fmtMoeda(k.valor)} sub="Compra evitada" info={INFO.transferencia} cor="#16a34a" />
            <CardKpi label="Resolvem ruptura" valor={fmtNum(k.rupturas_resolvidas)} info={INFO.transferencia} cor="#dc2626" />
            <CardKpi label="Em andamento" valor={fmtNum(geradas.filter(g => !['Recebida', 'Cancelada'].includes(g.status)).length)} cor="#0ea5e9" onClick={() => setAba('geradas')} />
          </div>
          {erroBanco && <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-800">{erroBanco}</div>}
          {msg && <div className="p-2 rounded-md bg-green-50 border border-green-200 text-[11px] text-green-800">{msg}</div>}
          <Abas abas={[['sugestoes', 'Sugestões'], ['rotas', 'Rotas entre lojas'], ['geradas', `Geradas (${geradas.length})`]]} aba={aba} onChange={setAba} />
          {aba === 'sugestoes' && (
            <TabelaPecas rows={sugestoes} nomeArquivo="transferencias-sugeridas" selecao={{ selecionados, setSelecionados, chave }}
              linhaClasse={r => (r.ja_gerada ? 'opacity-50' : '')}
              acoesTopo={podeGerar && <button type="button" className={btnPri} disabled={!selecionados.size} onClick={gerar}><Send className="h-3.5 w-3.5" /> Gerar transferências</button>}
              cols={[
                { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' }, { k: 'abc', t: 'Curva Venda', render: r => <Badge texto={r.abc} /> },
                { k: 'loja_origem', t: 'Origem', fmt: 'loja' }, { k: 'situacao_origem', t: 'Situação origem', render: r => <Badge texto={r.situacao_origem} /> },
                { k: 'loja_destino', t: 'Destino', fmt: 'loja' }, { k: 'situacao_destino', t: 'Situação destino', render: r => <Badge texto={r.situacao_destino} /> },
                { k: 'qtd', t: 'Qtd', fmt: 'num' }, { k: 'valor', t: 'Valor', fmt: 'moeda' }, { k: 'motivo', t: 'Motivo' },
                { k: 'ja_gerada', t: 'Já gerada' },
              ]} />
          )}
          {aba === 'rotas' && (
            <TabelaPecas rows={dados.rotas} nomeArquivo="transferencias-rotas" cols={[
              { k: 'loja_origem', t: 'Origem', fmt: 'loja' }, { k: 'loja_destino', t: 'Destino', fmt: 'loja' },
              { k: 'itens', t: 'Itens', fmt: 'num' }, { k: 'qtd', t: 'Unidades', fmt: 'num' }, { k: 'valor', t: 'Valor', fmt: 'moeda' },
            ]} />
          )}
          {aba === 'geradas' && (
            <TabelaPecas rows={geradas} nomeArquivo="transferencias-geradas" cols={[
              { k: 'criado_em', t: 'Gerada em', fmt: 'data' }, { k: 'codigo', t: 'Código' }, { k: 'descricao', t: 'Descrição' },
              { k: 'loja_origem', t: 'Origem', render: r => nomeLoja(r.loja_origem) }, { k: 'loja_destino', t: 'Destino', render: r => nomeLoja(r.loja_destino) },
              { k: 'qtd', t: 'Qtd', fmt: 'num' }, { k: 'motivo', t: 'Motivo' }, { k: 'usuario', t: 'Usuário' },
              { k: 'status', t: 'Status', render: r => (podeGerar
                ? <select className={inputCls} value={r.status} onChange={e => atualizarTransferencia(r.id, { status: e.target.value }).then(carregarGeradas).catch(er => setErroBanco(er.message))}>{STATUS.map(s => <option key={s}>{s}</option>)}</select>
                : <Badge texto={r.status} />), exportar: r => r.status },
            ]} />
          )}
        </>
      )}
    </PaginaPecas>
  )
}
