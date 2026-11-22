// Controle de Processos › Extrato de Pagamento DAF.
// Fonte: SharePoint › BD › "Banco de Dados - DAF - Extrato de Pagamentos" (planilha exportada do SAP pela DAF,
// ex.: Account-303920.xlsx), lida ao vivo pelo backend (/api/extrato-daf). Cabeçalho traduzido para português.
// Conciliação (/api/extrato-daf/conciliacao): cruza o extrato com os títulos a receber da DAF do RFN003
// Analítico (Financeiro - DAF) — Referência = NFS-e ou "NFP" (Nota Fiscal do título); sem nota, pelo Texto
// (chassi, O.S., número "O0xxxxx" da Observação). Mostrada na aba Extrato (coluna Situação + expandir a linha)
// e na aba Títulos em Aberto. A aba Conciliação foi excluída a pedido do usuário em 22/11/2026.
// Nada é gravado: vale só enquanto os títulos não são baixados.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  RefreshCw, Search, FileSpreadsheet, Receipt, Landmark,
  ChevronRight, ChevronDown, ListChecks, FolderOpen, Check, FileText, FileDown, Settings, Upload,
} from 'lucide-react'
// Arquivo de baixa no layout que o Dealer.net aceita — o mesmo do TruckPag
import { gerarArquivoBaixaTitulos, siglaEmpresaPorNome } from '../truckpag/truckpagUtils'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['extrato', 'Extrato', ListChecks],
  ['aberto', 'Títulos', FolderOpen],
]
const CAMPOS_DATA = new Set(['data_lancamento', 'data_documento', 'data_compensacao'])
const CAMPOS_VALOR = new Set(['valor_moeda_documento', 'imposto_retido', 'valor_moeda_local'])
const fmtData = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : (iso || ''))
const fmtValor = (n) => (n == null ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtMoeda = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')
const semAcento = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const contem = (obj, campos, termo) => !termo || campos.some(c => semAcento(obj[c]).includes(termo))
const empresaCurta = (s) => String(s || '').replace(/^CAIOBA TRUCKS\s*-\s*/i, '')

const COR_SITUACAO = {
  Conciliado: 'bg-emerald-100 text-emerald-700',
  'Retenção divergente': 'bg-amber-100 text-amber-700',
  'Pago a menor': 'bg-red-100 text-red-700',
  'Pago a maior': 'bg-violet-100 text-violet-700',
  'Já baixado': 'bg-slate-100 text-slate-600',
  'Sem título': 'bg-red-100 text-red-700',
  Ambíguo: 'bg-orange-100 text-orange-700',
  'Fora do extrato': 'bg-slate-100 text-slate-500',
}
const DICA_SITUACAO = {
  Conciliado: 'Valor pago = valor do título e líquido pago = saldo (tolerância de R$ 0,05).',
  'Retenção divergente': 'Valor pago bate com o título, mas o líquido não bate com o saldo: a retenção feita pela DAF é diferente da descontada no título.',
  'Pago a menor': 'A DAF pagou menos que o valor do título (ex.: só o serviço ou só as peças).',
  'Pago a maior': 'A DAF pagou mais que o valor do título.',
  'Já baixado': 'O título já está com saldo zero no RFN003.',
  'Fora do extrato': 'Título da DAF com saldo no RFN003 sem nenhum valor neste extrato.',
}
function Badge({ texto }) {
  return <span title={DICA_SITUACAO[texto] || ''} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${COR_SITUACAO[texto] || 'bg-slate-100 text-slate-600'}`}>{texto}</span>
}

function Card({ icon: Icon, titulo, valor, sub, cor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex items-start gap-3">
      <div className={`p-2 rounded-lg ${cor}`}><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 uppercase tracking-wide">{titulo}</p>
        <p className="text-base font-bold text-slate-900 leading-tight">{valor}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

const Th = ({ children, className = '' }) => <th className={`px-3 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap text-left ${className}`}>{children}</th>
const Td = ({ children, className = '', ...p }) => <td className={`px-3 py-1.5 text-[11px] text-slate-700 whitespace-nowrap ${className}`} {...p}>{children}</td>
const TdV = ({ v, destaque }) => <Td className={`text-right tabular-nums ${destaque && Math.abs(v) > 0.05 ? 'text-red-600 font-semibold' : ''}`}>{fmtValor(v)}</Td>

function CaixaTabela({ busca, setBusca, placeholder, extra, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-200">
        <Search className="h-3.5 w-3.5 text-slate-400" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder={placeholder} className="flex-1 min-w-[200px] text-[11px] outline-none" />
        {extra}
      </div>
      <div className="overflow-auto max-h-[calc(100vh-340px)]">{children}</div>
    </div>
  )
}


// ── Aba Extrato ─────────────────────────────────────────────────────────────
// O chassi do título aparece no Texto do extrato? Completo (98PTTH430TB171089) ou só o final de 8 (TB171089).
function chassiNoTexto(chassi, texto) {
  const c = String(chassi || '').trim().toUpperCase()
  const t = String(texto || '').toUpperCase()
  if (c.length < 8 || !t) return false
  return t.includes(c) || t.includes(c.slice(-8))
}
function BolinhaVerde({ dica }) {
  return (
    <span title={dica} className="inline-flex items-center justify-center ml-1.5 h-4 w-4 rounded-full bg-green-500 align-middle">
      <Check className="h-3 w-3 text-white" strokeWidth={4} />
    </span>
  )
}

// ✔ verde ao lado do campo do título que casou com a linha do extrato (NFS-e, NFP ou O.S.).
function Conciliou({ chave, linha }) {
  if (!linha?.chaves?.includes(chave)) return null
  return (
    <span title={linha.motivo} className="inline-flex items-center justify-center ml-1.5 h-4 w-4 rounded-full bg-green-500 align-middle">
      <Check className="h-3 w-3 text-white" strokeWidth={4} />
    </span>
  )
}

// Conferência de valor contra o Valor Líquido (Moeda Local) do extrato: ✔ verde se bate (até R$ 0,05),
// bolinha amarela com "!" se diverge.
// ref_ = coluna do extrato comparada: "Valor" (com o Valor do Título) ou "Valor Líquido" (com o Saldo do Título).
function Confere({ dif, rotulo, ref_ = 'Valor Líquido' }) {
  const ok = Math.abs(dif) <= 0.05
  return (
    <span title={ok ? `${rotulo} confere com o ${ref_} do extrato` : `${rotulo} diverge do ${ref_} do extrato em ${fmtValor(dif)}`}
      className={`inline-flex items-center justify-center ml-1.5 h-4 w-4 rounded-full align-middle ${ok ? 'bg-green-500' : 'bg-amber-400'}`}>
      {ok ? <Check className="h-3 w-3 text-white" strokeWidth={4} /> : <span className="text-white text-[11px] font-black leading-none">!</span>}
    </span>
  )
}

// Detalhe expandido de uma linha do extrato: o título do RFN003 com que ela foi conciliada.
function DetalheTituloDaLinha({ vinculo, carregandoConc, linhaAtual }) {
  if (!vinculo) {
    return <p className="text-[11px] text-slate-400">{carregandoConc ? 'Cruzando com o RFN003 (títulos a receber)...' : 'Conciliação indisponível.'}</p>
  }
  if (!vinculo.titulo) {
    const l = vinculo.linha
    return (
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <Badge texto={l.vinculo === 'Ambíguo' ? 'Ambíguo' : 'Sem título'} />
        <span className="text-slate-600">{l.motivo}{l.candidatos?.length ? `: ${l.candidatos.join(', ')}` : ''}</span>
      </div>
    )
  }
  const t = vinculo.titulo
  const linha = t.linhas.find(l => l.i === linhaAtual)
  // Valor Título × soma do Valor (bruto) do extrato; Saldo Título × soma do Valor Líquido (pedido do usuário)
  const difValorLiquido = Math.round((t.valor - t.pago_bruto) * 100) / 100
  return (
    <div className="space-y-2">
      {/* Lançamento e situação já aparecem na tabela abaixo e na coluna Situação; só fica o aviso do vínculo
          pelo texto (chassi/observação não têm coluna aqui), com o motivo na dica */}
      {linha?.vinculo === 'Sugerido' && (
        <span title={linha.motivo} className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">Sugerido pelo texto — conferir</span>
      )}
      <div className="overflow-x-auto">
        {/* Tabela do título (RFN003) em cinza — mesma cor do expandir da aba Títulos (pedido do usuário) */}
        <table className="min-w-full bg-slate-50 border border-slate-300 rounded-lg">
          <thead className="bg-slate-200">
            <tr>
              <Th>Lançamento</Th><Th>Nº Título</Th><Th>Empresa</Th><Th>Cliente/Fornecedor</Th><Th>Tipo de Título</Th><Th>Agente Cobrador</Th><Th>Conta Gerencial</Th><Th>O.S.</Th><Th>Chassi</Th>
              <Th>NF / NFS-e</Th><Th>NFP</Th><Th>Emissão</Th><Th>Vencimento</Th>
              <Th className="text-right">Valor Título</Th><Th className="text-right">Dif. Valor</Th>
              <Th className="text-right">Saldo Título</Th><Th className="text-right">Dif. Saldo</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="font-semibold text-slate-900">{t.lancamento}</Td><Td>{t.nro_titulo}</Td><Td>{empresaCurta(t.empresa)}</Td><Td>{t.cliente_fornecedor}</Td><Td>{t.tipo_titulo}</Td><Td>{t.agente_cobrador}</Td><Td>{t.conta_gerencial}</Td>
              <Td>{t.os}<Conciliou chave="os" linha={linha} /></Td>
              <Td className="font-mono">{t.chassi}{linha && chassiNoTexto(t.chassi, linha.texto) && <BolinhaVerde dica="O chassi do título aparece no Texto do extrato" />}</Td>
              <Td>{t.nota_fiscal_servico}<Conciliou chave="nfs" linha={linha} /></Td>
              <Td>{t.nota_fiscal}<Conciliou chave="nfp" linha={linha} /></Td>
              <Td>{fmtData(t.emissao)}</Td><Td>{fmtData(t.vencimento)}</Td>
              {/* Duas conferências separadas, ambas contra o Valor Líquido (Moeda Local) somado das linhas do extrato
                  ligadas ao título (o líquido em si não aparece aqui: não é dado do título) */}
              <Td className="text-right tabular-nums">{fmtValor(t.valor)}<Confere dif={difValorLiquido} rotulo="Valor do título" ref_="Valor" /></Td>
              <TdV v={difValorLiquido} destaque />
              <Td className="text-right tabular-nums">{fmtValor(t.saldo)}<Confere dif={t.dif_saldo} rotulo="Saldo do título" /></Td>
              {/* Dif. Saldo: negativo = fundo amarelo, positivo = fundo verde */}
              <Td className={`text-right tabular-nums font-semibold ${t.dif_saldo < 0 ? 'bg-amber-100 text-amber-800' : t.dif_saldo > 0 ? 'bg-green-100 text-green-800' : ''}`}>{fmtValor(t.dif_saldo)}</Td>
            </tr>
          </tbody>
        </table>
      </div>
      {t.observacao && <p className="text-[11px] text-slate-500"><span className="font-semibold">Observação do título:</span> {t.observacao}</p>}
      {t.linhas.length > 1 && (
        <div>
          <p className="text-[11px] text-slate-500 mb-1">Linhas do extrato que compõem este título:</p>
          <table className="min-w-full bg-white border border-slate-200 rounded-lg">
            <thead><tr><Th>Referência</Th><Th>Nº Documento</Th><Th>Texto</Th><Th className="text-right">Valor</Th><Th className="text-right">Retido</Th><Th className="text-right">Líquido</Th><Th>Vínculo utilizado</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.linhas.map(l => (
                <tr key={l.i} className={l.i === linhaAtual ? 'bg-indigo-50/60' : ''}>
                  <Td className={l.i === linhaAtual ? 'font-semibold' : ''}>{l.referencia}</Td><Td>{l.numero_documento}</Td><Td>{l.texto}</Td>
                  <TdV v={l.valor} /><TdV v={l.retido} /><TdV v={l.liquido} />
                  <Td><span className={l.vinculo === 'Sugerido' ? 'text-sky-700 font-semibold' : 'text-emerald-700 font-semibold'}>{l.vinculo === 'Sugerido' ? 'Sugerido' : 'Nota'}</span> <span className="text-slate-500">— {l.motivo}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Só as colunas do arquivo (pedido do usuário em 22/11/2026: sem Título/Situação da conciliação aqui);
// cada linha expande para mostrar o título conciliado.
function AbaExtrato({ dados, carregando, busca, setBusca, conc, carregandoConc }) {
  const [abertos, setAbertos] = useState(() => new Set())
  const alternar = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  // linha do extrato → título conciliado (ou a linha sem título, com o motivo)
  const vinculoPorLinha = useMemo(() => {
    if (!conc) return null
    const m = new Map()
    conc.conciliacao.forEach(t => t.linhas.forEach(l => m.set(l.i, { titulo: t })))
    conc.sem_titulo.forEach(l => m.set(l.i, { titulo: null, linha: l }))
    return m
  }, [conc])
  const colunas = dados?.colunas || []
  const termo = semAcento(busca.trim())
  const registros = useMemo(() => (dados?.registros || []).map((r, i) => ({ ...r, _i: i }))
    .filter(r => !termo || colunas.some(c => semAcento(CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : r[c.campo]).includes(termo))), [dados, termo, colunas])
  const totais = useMemo(() => registros.reduce((t, r) => ({
    bruto: t.bruto + (r.valor_moeda_documento || 0), imposto: t.imposto + (r.imposto_retido || 0), liquido: t.liquido + (r.valor_moeda_local || 0),
  }), { bruto: 0, imposto: 0, liquido: 0 }), [registros])

  return (
    <>
      {/* Cards Lançamentos/Valor Bruto/Imposto Retido/Valor Líquido saíram daqui (22/11/2026): Valor Bruto e
          Imposto Retido foram para o resumo das duas abas; Lançamentos e Valor Líquido = Total do Arquivo. */}
      <CaixaTabela busca={busca} setBusca={setBusca} placeholder="Buscar em qualquer coluna (referência, documento, chassi, O.S....)">
        <table className="min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <Th className="w-6" />
              <Th>Situação</Th>
              {colunas.map(c => <Th key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right' : ''}>{c.rotulo}</Th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando && !dados ? (
              <tr><td colSpan={(colunas.length || 15) + 2} className="px-3 py-6 text-center text-[11px] text-slate-400">Lendo planilha do SharePoint...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={(colunas.length || 15) + 2} className="px-3 py-6 text-center text-[11px] text-slate-400">Nenhum lançamento.</td></tr>
            ) : registros.map(r => {
              const aberto = abertos.has(r._i)
              const v = vinculoPorLinha?.get(r._i)
              const situacao = v ? (v.titulo ? v.titulo.situacao : (v.linha.vinculo === 'Ambíguo' ? 'Ambíguo' : 'Sem título')) : null
              return (
                <React.Fragment key={r._i}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => alternar(r._i)} title="Ver o título conciliado">
                    <Td>{aberto ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}</Td>
                    <Td>{situacao ? <Badge texto={situacao} /> : <span className="text-slate-300">{carregandoConc ? '...' : '—'}</span>}</Td>
                    {colunas.map(c => (
                      <Td key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}>
                        {CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : CAMPOS_VALOR.has(c.campo) ? fmtValor(r[c.campo]) : r[c.campo]}
                        {c.campo === 'texto' && v?.titulo && chassiNoTexto(v.titulo.chassi, r.texto) && <BolinhaVerde dica="O chassi do título conciliado aparece neste Texto" />}
                      </Td>
                    ))}
                  </tr>
                  {aberto && (
                    <tr className="bg-slate-50/60">
                      <td />
                      <td colSpan={colunas.length + 1} className="px-3 py-2">
                        <DetalheTituloDaLinha vinculo={vinculoPorLinha?.get(r._i)} carregandoConc={carregandoConc} linhaAtual={r._i} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
          {registros.length > 0 && (
            <tfoot className="bg-slate-50 sticky bottom-0">
              <tr>
                <td /><td />
                {colunas.map((c, k) => (
                  <td key={c.campo} className={`px-3 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap ${CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}`}>
                    {k === 0 ? 'Total' : c.campo === 'valor_moeda_documento' ? fmtValor(totais.bruto) : c.campo === 'imposto_retido' ? fmtValor(totais.imposto) : c.campo === 'valor_moeda_local' ? fmtValor(totais.liquido) : ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </CaixaTabela>
    </>
  )
}

// Detalhe expandido de um título: as linhas do extrato que o pagaram, com as colunas do arquivo.
// ✔ verde na Referência quando o vínculo foi pela nota (NFS-e/NFP); no Texto quando foi sugerido pelo texto.
function DetalheExtratoDoTitulo({ titulo, dados }) {
  const colunas = dados?.colunas || []
  if (!titulo.linhas?.length) return <p className="text-[11px] text-slate-400">Nenhum valor deste título no extrato.</p>
  const linhas = titulo.linhas.map(l => ({ ...(dados?.registros?.[l.i] || {}), _l: l }))
  const soma = (campo) => linhas.reduce((s, r) => s + (r[campo] || 0), 0)
  const marca = (r, campo) => {
    const l = r._l
    const pelaNota = (l.chaves || []).some(c => c === 'nfs' || c === 'nfp')
    if (campo === 'referencia' && pelaNota) return <Conciliou chave={l.chaves[0]} linha={l} />
    // Texto: ✔ verde quando nele aparece o chassi do título (ou quando o vínculo veio pelo texto)
    if (campo === 'texto' && chassiNoTexto(titulo.chassi, r.texto)) return <BolinhaVerde dica="O chassi do título aparece neste Texto" />
    if (campo === 'texto' && l.vinculo === 'Sugerido' && l.chaves?.length) return <Conciliou chave={l.chaves[0]} linha={l} />
    return null
  }
  // Bolinhas da conferência (✔ verde / "!" amarela), as mesmas da aba Extrato: soma do Valor Líquido das linhas
  // × Valor do Título e × Saldo do Título. Ficam na célula Valor Líquido da linha (1 linha) ou do Total (2+).
  // Valor (bruto) × Valor do Título → bolinha na célula Valor; Valor Líquido × Saldo do Título → bolinha na célula Valor Líquido.
  const difValorTitulo = Math.round((titulo.valor - titulo.pago_bruto) * 100) / 100
  // Sem rótulo ao lado (pedido do usuário); a dica do mouse diz com o que foi comparado.
  const bolinhaValor = <Confere dif={difValorTitulo} rotulo="Valor do título" ref_="Valor" />
  const bolinhaSaldo = <Confere dif={titulo.dif_saldo} rotulo="Saldo do título" />
  const bolinhas = (campo) => (campo === 'valor_moeda_documento' ? bolinhaValor : campo === 'valor_moeda_local' ? bolinhaSaldo : null)
  return (
    <div className="space-y-1.5">
      {titulo.sugerido && (
        <span className="inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">Sugerido pelo texto — conferir</span>
      )}
      <div className="overflow-x-auto">
        {/* Linhas do extrato (arquivo da DAF) em cinza — era verde e se confundia com os ✔ (pedido do usuário) */}
        <table className="min-w-full bg-slate-50 border border-slate-300 rounded-lg">
          <thead className="bg-slate-200">
            <tr>{colunas.map(c => <Th key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right' : ''}>{c.rotulo}</Th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {linhas.map(r => (
              <tr key={r._l.i}>
                {colunas.map(c => (
                  <Td key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}>
                    {CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : CAMPOS_VALOR.has(c.campo) ? fmtValor(r[c.campo]) : r[c.campo]}
                    {marca(r, c.campo)}
                    {linhas.length === 1 && bolinhas(c.campo)}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
          {linhas.length > 1 && (
            <tfoot className="bg-slate-200">
              <tr>
                {colunas.map((c, k) => (
                  <td key={c.campo} className={`px-3 py-1.5 text-[11px] font-bold text-slate-900 whitespace-nowrap ${CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}`}>
                    {k === 0 ? 'Total' : CAMPOS_VALOR.has(c.campo) ? fmtValor(soma(c.campo)) : ''}
                    {bolinhas(c.campo)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

// ── Aba Títulos ─────────────────────────────────────────────────────────────
// Todos os títulos da DAF: os que têm valor no extrato (com a situação da conciliação) e os em aberto
// fora do extrato ("Fora do extrato"). Mesmas colunas/nomes da tabela do título da aba Extrato
// + Atraso e Observação; cada linha expande e mostra as linhas do extrato que pagaram o título.
function AbaTitulos({ conc, dados, carregando, busca, setBusca }) {
  const [abertos, setAbertos] = useState(() => new Set())
  const alternar = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const todos = useMemo(() => [
    ...(conc?.conciliacao || []),
    ...(conc?.em_aberto || []).map(t => ({ ...t, situacao: 'Fora do extrato', linhas: [] })),
  ], [conc])
  const todasEmpresas = useMemo(() => [...new Set(todos.map(t => t.empresa))].sort(), [todos])
  const [empresa, setEmpresa] = useState(null) // null = empresa do extrato
  const [tipo, setTipo] = useState('')
  const [situacao, setSituacao] = useState('')
  const empresaSel = empresa ?? (conc?.empresas_no_extrato?.length === 1 ? conc.empresas_no_extrato[0] : '')
  const termo = semAcento(busca.trim())
  const tipos = useMemo(() => [...new Set(todos.map(t => t.tipo_titulo))].sort(), [todos])
  const situacoes = useMemo(() => [...new Set(todos.map(t => t.situacao))], [todos])
  const lista = useMemo(() => todos.filter(t =>
    (!empresaSel || t.empresa === empresaSel) && (!tipo || t.tipo_titulo === tipo) && (!situacao || t.situacao === situacao)
    && contem(t, ['lancamento', 'nro_titulo', 'os', 'chassi', 'nota_fiscal_servico', 'nota_fiscal', 'observacao', 'tipo_titulo', 'agente_cobrador', 'conta_gerencial', 'situacao'], termo)),
  [todos, empresaSel, tipo, situacao, termo])

  // ── Seleção para baixa: só títulos com valor no extrato (os "Fora do extrato" não têm o que baixar) ──
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [gerandoPdf, setGerandoPdf] = useState(false)
  const [erroBaixa, setErroBaixa] = useState(null)
  // Data de pagamento padrão = Data Compensação mais frequente do extrato (dia em que a DAF pagou)
  const dataPadrao = useMemo(() => {
    const cont = {}
    ;(dados?.registros || []).forEach(r => { if (r.data_compensacao) cont[r.data_compensacao] = (cont[r.data_compensacao] || 0) + 1 })
    return Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] || new Date().toISOString().slice(0, 10)
  }, [dados])
  const [dataPagto, setDataPagto] = useState(null)
  const dataBaixa = dataPagto || dataPadrao
  const selecionaveis = lista.filter(t => t.linhas.length)
  const todosMarcados = selecionaveis.length > 0 && selecionaveis.every(t => selecionados.has(t.lancamento))
  const alternarSelecao = (k) => setSelecionados(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const alternarTodos = () => setSelecionados(todosMarcados ? new Set() : new Set(selecionaveis.map(t => t.lancamento)))
  const titulosBaixa = todos.filter(t => selecionados.has(t.lancamento) && t.linhas.length)
  const totalBaixa = titulosBaixa.reduce((s, t) => s + t.pago_liquido, 0)

  // Arquivo de baixa no mesmo layout do TruckPag (Dealer.net › Banco Retorno, registro de 39 posições):
  // Lançamento + data de pagamento + valor = Valor Líquido pago pela DAF (o que entrou na conta).
  const nomeBase = () => {
    const siglas = [...new Set(titulosBaixa.map(t => siglaEmpresaPorNome(t.empresa)).filter(Boolean))].join('-')
    return `${dataBaixa.split('-').reverse().join('')}${siglas ? ` ${siglas}` : ''} Extrato DAF Total Recebido ${fmtMoeda(totalBaixa)}`
  }
  // Salva um arquivo abrindo a janela "Salvar como" do navegador (Chrome/Edge: showSaveFilePicker); nos
  // navegadores sem essa janela, faz o download normal. Devolve false se o usuário cancelar.
  // `gerar` monta o conteúdo DEPOIS de abrir a janela, para o clique do usuário não "expirar" enquanto monta.
  // Se o navegador/política da empresa bloquear a gravação pela janela (createWritable → NotAllowedError),
  // cai no download normal e não tenta mais a janela nesta sessão (salvarComJanela = false).
  const salvarArquivo = async (gerar, nome, descricao, mime, ext) => {
    if (window.showSaveFilePicker && salvarComJanela) {
      let handle
      try {
        handle = await window.showSaveFilePicker({ suggestedName: nome, types: [{ description: descricao, accept: { [mime]: [ext] } }] })
      } catch (e) {
        if (e?.name === 'AbortError') return false
        salvarComJanela = false
        handle = null
      }
      if (handle) {
        try {
          const w = await handle.createWritable()
          await w.write(await gerar()); await w.close()
          return true
        } catch {
          salvarComJanela = false // bloqueado: segue para o download normal abaixo
        }
      }
    }
    const blob = await gerar()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nome
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  }

  // Exportar Baixa em duas etapas (pedido do usuário): 1º aviso → Salvar o .txt de baixa; 2º → Salvar o
  // recibo em PDF. Cada etapa tem o próprio clique, porque o navegador só abre a janela de salvar logo
  // depois de um clique.
  const [etapaBaixa, setEtapaBaixa] = useState(null) // null | 'txt' | 'pdf'
  const [msgBaixa, setMsgBaixa] = useState(null)
  const salvarTxt = async () => {
    setErroBaixa(null)
    try {
      const conteudo = gerarArquivoBaixaTitulos(titulosBaixa.map(t => ({ titulo_codigo: t.lancamento, titulo_saldo: t.pago_liquido })), dataBaixa)
      const ok = await salvarArquivo(async () => new Blob([conteudo], { type: 'text/plain;charset=utf-8' }), `${nomeBase()}.txt`, 'Arquivo de baixa', 'text/plain', '.txt')
      if (ok) setEtapaBaixa('pdf')
    } catch (e) {
      setErroBaixa('Não foi possível salvar o arquivo de baixa: ' + (e.message || String(e)))
    }
  }
  const salvarPdf = async () => {
    setGerandoPdf(true); setErroBaixa(null)
    try {
      const ok = await salvarArquivo(montarPdf, `${nomeBase()}.pdf`, 'Recibo de baixa (PDF)', 'application/pdf', '.pdf')
      if (ok) { setEtapaBaixa(null); setMsgBaixa('Arquivo de baixa e recibo salvos.') }
    } catch (e) {
      setErroBaixa('Não foi possível gerar o recibo: ' + (e.message || String(e)))
    } finally {
      setGerandoPdf(false)
    }
  }

  // PDF (recibo): para cada título, a tabela do título (o que está sendo baixado, azul) e as linhas do
  // extrato que o pagam (com o que está sendo baixado, verde). Desenhado direto com jsPDF (texto e
  // retângulos), sem html2canvas: o "print" de cada bloco copiava a página inteira e deixava o PDF lento.
  const montarPdf = async () => {
    {
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const PW = pdf.internal.pageSize.getWidth(), PH = pdf.internal.pageSize.getHeight()
      const M = 24, CW = PW - 2 * M
      const PAD = 3, ALT = 13
      let y = M

      const novaPagina = () => { pdf.addPage(); y = M }
      const garantir = (h) => { if (y + h > PH - M) novaPagina() }

      // Tabela sem cortar texto: cada coluna tem no mínimo a largura da sua maior palavra; o que sobra da folha vai
      // para as colunas que precisam (proporcional ao texto que falta caber). Se nem as palavras cabem, a fonte
      // diminui (6,5 → 4,5). Textos maiores (Cliente/Fornecedor, Texto, Observação…) quebram linha na célula e a
      // linha da tabela cresce. O cabeçalho também quebra e se repete quando a tabela passa de página.
      const tabela = ({ x, largura, colunas, linhas, corCab, corCorpo, corBorda }) => {
        const txt = (v) => String(v ?? '')
        const maiorPalavra = (s) => Math.max(0, ...s.split(/\s+/).filter(Boolean).map(p => pdf.getTextWidth(p)))
        let fonte = 6.5, ws = null
        for (; fonte >= 4.5; fonte -= 0.5) {
          pdf.setFontSize(fonte)
          const minW = [], natW = []
          colunas.forEach((c, k) => {
            pdf.setFont('helvetica', 'bold')
            const cab = c.rotulo.toUpperCase()
            let mn = maiorPalavra(cab), nat = pdf.getTextWidth(cab)
            pdf.setFont('helvetica', 'normal')
            linhas.forEach(l => {
              const s = txt(l[k])
              // valores, datas e números curtos não quebram: mínimo = texto inteiro
              mn = Math.max(mn, c.direita || s.length <= 12 ? pdf.getTextWidth(s) : maiorPalavra(s))
              nat = Math.max(nat, pdf.getTextWidth(s))
            })
            // +2pt de folga: a medida do splitTextToSize arredonda diferente e quebrava palavras no limite
            minW.push(mn + 2 * PAD + 2); natW.push(Math.max(nat, mn) + 2 * PAD + 2)
          })
          const somaMin = minW.reduce((a, b) => a + b, 0)
          if (somaMin > largura && fonte > 4.5) continue
          const somaNat = natW.reduce((a, b) => a + b, 0)
          if (somaNat <= largura) {
            const f = largura / somaNat
            ws = natW.map(w => w * f)
          } else {
            const sobra = Math.max(0, largura - somaMin)
            const falta = natW.map((w, k) => w - minW[k])
            const totalFalta = falta.reduce((a, b) => a + b, 0) || 1
            ws = minW.map((w, k) => w + sobra * (falta[k] / totalFalta))
            if (somaMin > largura) ws = ws.map(w => w * (largura / somaMin)) // último recurso
          }
          break
        }
        pdf.setFontSize(fonte)
        const LH = fonte * 1.25
        // Valores (colunas à direita) e textos curtos (até 12 caracteres, ex.: datas, números) nunca quebram
        const quebrar = (s, k, cabecalho) => {
          const v = txt(s)
          if (!cabecalho && (colunas[k].direita || v.length <= 12)) return [v]
          return pdf.splitTextToSize(v, Math.max(4, ws[k] - 2 * PAD))
        }
        const desenharLinha = (celulas, negrito, cor, corTexto) => {
          pdf.setFont('helvetica', negrito ? 'bold' : 'normal')
          const partes = celulas.map((s, k) => quebrar(s, k, negrito))
          const h = Math.max(ALT, Math.max(...partes.map(p => p.length)) * LH + 2 * PAD)
          return { partes, h, desenhar: () => {
            pdf.setFillColor(...cor); pdf.setDrawColor(...corBorda)
            pdf.rect(x, y, largura, h, 'FD')
            pdf.setTextColor(...corTexto)
            let cx = x
            colunas.forEach((c, k) => {
              partes[k].forEach((linhaTxt, i) => {
                pdf.text(linhaTxt, c.direita ? cx + ws[k] - PAD : cx + PAD, y + PAD + LH * (i + 1) - LH * 0.25, { align: c.direita ? 'right' : 'left' })
              })
              cx += ws[k]
            })
            y += h
          } }
        }
        const cabecalho = () => desenharLinha(colunas.map(c => c.rotulo.toUpperCase()), true, corCab, [71, 85, 105])
        const cab = cabecalho()
        garantir(cab.h + ALT)
        cab.desenhar()
        linhas.forEach(l => {
          const ln = desenharLinha(l, false, corCorpo, [30, 41, 59])
          if (y + ln.h > PH - M) { novaPagina(); cabecalho().desenhar() }
          ln.desenhar()
        })
      }

      // Cabeçalho do recibo
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(15, 23, 42)
      pdf.text('Recibo de Baixa — Extrato de Pagamento DAF', M, y + 12)
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(71, 85, 105)
      pdf.text(`Arquivo: ${dados?.arquivo?.nome || ''} · Data de pagamento: ${fmtData(dataBaixa)}`, M, y + 26)
      pdf.text(`${titulosBaixa.length} título(s) · Total líquido: ${fmtMoeda(totalBaixa)}`, PW - M, y + 12, { align: 'right' })
      pdf.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, PW - M, y + 26, { align: 'right' })
      y += 34
      pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(1.2); pdf.line(M, y, PW - M, y); pdf.setLineWidth(0.5)
      y += 10

      const colTitulo = [
        'Lançamento', 'Nº Título', 'Empresa', 'Cliente/Fornecedor', 'Tipo de Título', 'Agente Cobrador', 'Conta Gerencial',
        'O.S.', 'Chassi', 'NF / NFS-e', 'NFP', 'Emissão', 'Vencimento',
      ].map(r => ({ rotulo: r })).concat(['Valor Título', 'Dif. Valor', 'Saldo Título', 'Dif. Saldo'].map(r => ({ rotulo: r, direita: true })))
        .concat([{ rotulo: 'Observação' }])
      const colExtrato = (dados?.colunas || []).map(c => ({ rotulo: c.rotulo, direita: CAMPOS_VALOR.has(c.campo) }))
      const valorCelula = (r, c) => (CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : CAMPOS_VALOR.has(c.campo) ? fmtValor(r[c.campo]) : (r[c.campo] ?? ''))

      for (const t of titulosBaixa) {
        // Mesma tabela do título da tela (sem a linha "Título baixado — Lançamento … · situação", tirada a pedido)
        garantir(ALT * 6 + 20)
        tabela({
          x: M, largura: CW, colunas: colTitulo, corCab: [224, 231, 255], corCorpo: [238, 242, 255], corBorda: [199, 210, 254],
          linhas: [[t.lancamento, t.nro_titulo, empresaCurta(t.empresa), t.cliente_fornecedor, t.tipo_titulo, t.agente_cobrador, t.conta_gerencial,
            t.os, t.chassi, t.nota_fiscal_servico, t.nota_fiscal, fmtData(t.emissao), fmtData(t.vencimento),
            fmtValor(t.valor), fmtValor(Math.round((t.valor - t.pago_bruto) * 100) / 100), fmtValor(t.saldo), fmtValor(t.dif_saldo), t.observacao]],
        })
        y += 5
        garantir(ALT * 3)
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.setTextColor(4, 120, 87)
        pdf.text('PAGO COM (LINHAS DO EXTRATO)', M + 14, y + 7)
        y += 10
        tabela({
          x: M + 14, largura: CW - 14, colunas: colExtrato, corCab: [209, 250, 229], corCorpo: [236, 253, 245], corBorda: [167, 243, 208],
          linhas: t.linhas.map(l => (dados?.colunas || []).map(c => valorCelula(dados?.registros?.[l.i] || {}, c))),
        })
        y += 12
      }

      garantir(30)
      pdf.setDrawColor(30, 41, 59); pdf.setLineWidth(1.2); pdf.line(M, y, PW - M, y)
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(15, 23, 42)
      pdf.text(`Total baixado: ${fmtMoeda(totalBaixa)} em ${titulosBaixa.length} título(s)`, PW - M, y + 16, { align: 'right' })

      return pdf.output('blob')
    }
  }

  if (carregando && !conc) return <p className="text-[11px] text-slate-400 px-1">Lendo o RFN003 (títulos a receber)...</p>

  const difValor = (t) => (t.linhas.length ? Math.round((t.valor - t.pago_bruto) * 100) / 100 : null)

  return (
    <>
      {titulosBaixa.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-700">{titulosBaixa.length} título(s) selecionado(s) · {fmtMoeda(totalBaixa)}</span>
          <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400 ml-2">Data Pagto</label>
          <input type="date" value={dataBaixa} onChange={e => setDataPagto(e.target.value)} className="text-[11px] border border-slate-200 rounded-md px-2 py-1" />
          <button onClick={() => { setMsgBaixa(null); setErroBaixa(null); setEtapaBaixa('txt') }}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded-md shadow-sm">
            <FileDown className="h-3.5 w-3.5" /> Exportar Baixa
          </button>
          <button onClick={() => setSelecionados(new Set())} className="text-[11px] text-slate-500 hover:text-slate-800 ml-auto">Limpar seleção</button>
          {erroBaixa && !etapaBaixa && <span className="w-full text-[11px] text-red-600">{erroBaixa}</span>}
        </div>
      )}
      {msgBaixa && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] rounded-lg px-3 py-2">
          <span>{msgBaixa}</span>
          <button onClick={() => setMsgBaixa(null)} className="text-emerald-600 hover:text-emerald-800">fechar</button>
        </div>
      )}

      {/* Janela da Exportar Baixa: 1) arquivo .txt  2) recibo em PDF */}
      {etapaBaixa && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${etapaBaixa === 'txt' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {etapaBaixa === 'txt' ? <FileDown className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <p className="text-sm font-bold text-slate-900">
                {etapaBaixa === 'txt' ? '1 de 2 — Arquivo de baixa (.txt)' : '2 de 2 — Recibo da baixa (PDF)'}
              </p>
            </div>
            {etapaBaixa === 'txt' ? (
              <p className="text-[12px] text-slate-600">
                Será baixado primeiro o arquivo de baixa (.txt) para o Dealer.net, com <b>{titulosBaixa.length} título(s)</b>,
                total de <b>{fmtMoeda(totalBaixa)}</b> e data de pagamento <b>{fmtData(dataBaixa)}</b>.
                Clique em <b>Salvar</b> para escolher onde salvar o arquivo.
              </p>
            ) : (
              <p className="text-[12px] text-slate-600">
                Arquivo de baixa salvo. Agora salve o <b>recibo do extrato da baixa</b> (PDF), com os títulos baixados e as linhas
                do extrato que pagaram cada um. Clique em <b>Salvar</b> para escolher onde salvar.
              </p>
            )}
            <p className="text-[11px] text-slate-400 break-all">{nomeBase()}.{etapaBaixa === 'txt' ? 'txt' : 'pdf'}</p>
            {erroBaixa && <p className="text-[11px] text-red-600">{erroBaixa}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setEtapaBaixa(null); setErroBaixa(null) }} disabled={gerandoPdf}
                className="text-[11px] px-3 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                {etapaBaixa === 'txt' ? 'Cancelar' : 'Não salvar o recibo'}
              </button>
              <button onClick={etapaBaixa === 'txt' ? salvarTxt : salvarPdf} disabled={gerandoPdf}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                {gerandoPdf && <RefreshCw className="h-3.5 w-3.5 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      <CaixaTabela busca={busca} setBusca={setBusca} placeholder="Buscar por lançamento, O.S., nota, observação..."
        extra={<>
          <select value={situacao} onChange={e => setSituacao(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todas as situações</option>
            {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={empresaSel} onChange={e => setEmpresa(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todas as empresas</option>
            {todasEmpresas.map(e => <option key={e} value={e}>{empresaCurta(e)}</option>)}
          </select>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todos os tipos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </>}>
        <table className="min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 w-6">
                <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} disabled={!selecionaveis.length}
                  title="Selecionar todos os títulos com valor no extrato" className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer" />
              </th>
              <Th className="w-6" /><Th>Situação</Th>
              <Th>Lançamento</Th><Th>Nº Título</Th><Th>Empresa</Th><Th>Cliente/Fornecedor</Th><Th>Tipo de Título</Th><Th>Agente Cobrador</Th><Th>Conta Gerencial</Th><Th>O.S.</Th><Th>Chassi</Th>
              <Th>NF / NFS-e</Th><Th>NFP</Th><Th>Emissão</Th><Th>Vencimento</Th>
              <Th className="text-right">Valor Título</Th><Th className="text-right">Dif. Valor</Th><Th className="text-right">Saldo Título</Th><Th className="text-right">Dif. Saldo</Th>
              <Th className="text-right">Atraso</Th><Th>Observação</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map(t => {
              const aberto = abertos.has(t.lancamento)
              const tem = t.linhas.length > 0
              const chaves = new Set(t.linhas.flatMap(l => l.chaves || []))
              const linhaChave = (c) => t.linhas.find(l => (l.chaves || []).includes(c))
              const dv = difValor(t)
              return (
                <React.Fragment key={t.lancamento}>
                  <tr className={`cursor-pointer ${selecionados.has(t.lancamento) ? 'bg-emerald-50/70' : 'hover:bg-slate-50'}`} onClick={() => alternar(t.lancamento)} title="Ver os valores do extrato deste título">
                    <td className="px-3 py-1.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selecionados.has(t.lancamento)} onChange={() => alternarSelecao(t.lancamento)} disabled={!tem}
                        title={tem ? 'Selecionar para baixa' : 'Sem valor no extrato: nada para baixar'} className="h-3.5 w-3.5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30" />
                    </td>
                    <Td>{aberto ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}</Td>
                    <Td><Badge texto={t.situacao} /></Td>
                    <Td className="font-semibold text-slate-900">{t.lancamento}</Td><Td>{t.nro_titulo}</Td><Td>{empresaCurta(t.empresa)}</Td><Td>{t.cliente_fornecedor}</Td>
                    <Td>{t.tipo_titulo}</Td><Td>{t.agente_cobrador}</Td><Td>{t.conta_gerencial}</Td>
                    <Td>{t.os}{chaves.has('os') && <Conciliou chave="os" linha={linhaChave('os')} />}</Td>
                    <Td className="font-mono">{t.chassi}{t.linhas.some(l => chassiNoTexto(t.chassi, l.texto)) && <BolinhaVerde dica="O chassi do título aparece no Texto do extrato" />}</Td>
                    <Td>{t.nota_fiscal_servico}{chaves.has('nfs') && <Conciliou chave="nfs" linha={linhaChave('nfs')} />}</Td>
                    <Td>{t.nota_fiscal}{chaves.has('nfp') && <Conciliou chave="nfp" linha={linhaChave('nfp')} />}</Td>
                    <Td>{fmtData(t.emissao)}</Td><Td>{fmtData(t.vencimento)}</Td>
                    <Td className="text-right tabular-nums">{fmtValor(t.valor)}{tem && <Confere dif={dv} rotulo="Valor do título" ref_="Valor" />}</Td>
                    {tem ? <TdV v={dv} destaque /> : <Td />}
                    <Td className="text-right tabular-nums">{fmtValor(t.saldo)}{tem && <Confere dif={t.dif_saldo} rotulo="Saldo do título" />}</Td>
                    {tem
                      ? <Td className={`text-right tabular-nums font-semibold ${t.dif_saldo < 0 ? 'bg-amber-100 text-amber-800' : t.dif_saldo > 0 ? 'bg-green-100 text-green-800' : ''}`}>{fmtValor(t.dif_saldo)}</Td>
                      : <Td />}
                    <Td className={`text-right ${t.atraso > 0 ? 'text-red-600 font-semibold' : ''}`}>{t.atraso ?? ''}</Td>
                    <Td className="max-w-[360px] truncate" title={t.observacao}>{t.observacao}</Td>
                  </tr>
                  {aberto && (
                    <tr className="bg-slate-50/60">
                      <td /><td />
                      <td colSpan={20} className="px-3 py-2"><DetalheExtratoDoTitulo titulo={t} dados={dados} /></td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {lista.length === 0 && <tr><td colSpan={22} className="px-3 py-6 text-center text-[11px] text-slate-400">Nenhum título.</td></tr>}
          </tbody>
        </table>
      </CaixaTabela>
    </>
  )
}

// false depois que o navegador bloquear a gravação pela janela "Salvar como" (ver salvarArquivo na aba Títulos)
let salvarComJanela = true

// Resumo da conciliação (aparece nas abas Extrato e Títulos), sempre sobre o arquivo inteiro (ignora a busca):
// Total do Arquivo, Valor Conciliado (linhas que acharam título) e Falta Conciliar (linhas sem título ou ambíguas),
// pelo Valor Líquido (Moeda Local), com o mesmo sinal do arquivo.
function ResumoConciliacao({ dados, conc, carregandoConc }) {
  const registros = dados?.registros || []
  if (!registros.length) return null
  const liquido = (r) => r?.valor_moeda_local || 0
  const total = registros.reduce((s, r) => s + liquido(r), 0)
  const idxConciliados = new Set((conc?.conciliacao || []).flatMap(t => t.linhas.map(l => l.i)))
  const conciliado = registros.reduce((s, r, i) => s + (idxConciliados.has(i) ? liquido(r) : 0), 0)
  const falta = Math.round((total - conciliado) * 100) / 100
  const qtdFalta = registros.length - idxConciliados.size
  const espera = carregandoConc && !conc
  const bruto = registros.reduce((s, r) => s + (r.valor_moeda_documento || 0), 0)
  const imposto = registros.reduce((s, r) => s + (r.imposto_retido || 0), 0)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card icon={Receipt} titulo="Valor Bruto" valor={fmtMoeda(bruto)} cor="bg-indigo-100 text-indigo-600" />
      <Card icon={Landmark} titulo="Imposto Retido" valor={fmtMoeda(imposto)} cor="bg-amber-100 text-amber-600" />
      <Card icon={FileSpreadsheet} titulo="Valor Líquido" valor={fmtMoeda(total)} cor="bg-slate-100 text-slate-600" />
      <Card icon={Check} titulo="Valor Conciliado" valor={espera ? '...' : fmtMoeda(conciliado)} cor="bg-emerald-100 text-emerald-600" />
      <Card icon={Receipt} titulo="Falta Conciliar" valor={espera ? '...' : fmtMoeda(falta)} cor={!espera && qtdFalta ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'} />
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function ExtratoPagamentoDaf() {
  const [aba, setAba] = useState('extrato')
  const [dados, setDados] = useState(null)
  const [conc, setConc] = useState(null)
  const [arquivo, setArquivo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoConc, setCarregandoConc] = useState(false)
  const [erro, setErro] = useState(null)
  const [busca, setBusca] = useState('')

  const buscarJson = async (caminho, nome, refresh) => {
    const q = new URLSearchParams()
    if (nome) q.set('arquivo', nome)
    if (refresh) q.set('refresh', '1')
    const r = await fetch(`${BACKEND_URL}/api/extrato-daf${caminho}?${q}`)
    const j = await r.json()
    if (!r.ok) throw new Error(j.error === 'sharepoint_not_configured' ? 'SharePoint não configurado no backend.' : (j.error || `HTTP ${r.status}`))
    return j
  }
  const carregarConc = async (nome, refresh = false) => {
    setCarregandoConc(true)
    try { setConc(await buscarJson('/conciliacao', nome, refresh)) }
    catch (e) { setErro(`Conciliação: ${e.message}`) }
    finally { setCarregandoConc(false) }
  }
  const carregar = async (nome = arquivo, refresh = false) => {
    setCarregando(true); setErro(null)
    try {
      const j = await buscarJson('', nome, refresh)
      // Moeda Doc. e Moeda Local não aparecem em nenhuma aba nem no PDF (o backend já não manda; garantia extra)
      j.colunas = (j.colunas || []).filter(c => !['moeda_documento', 'moeda_local'].includes(c.campo))
      setDados(j)
      setArquivo(j.arquivo?.nome || '')
      if (j.arquivo) carregarConc(j.arquivo.nome, refresh)
      else setConc(null)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { carregar() }, [])

  // ── Engrenagem › Importar arquivo ─────────────────────────────────────────
  // Grava a planilha do SAP na pasta do SharePoint (substitui a de mesmo nome) e, a pedido do usuário,
  // LIMPA a tela inteira (busca, seleção, linhas abertas, conciliação anterior) e refaz a conciliação do
  // zero com o arquivo importado — relendo também o RFN003 (refresh).
  const [menuAberto, setMenuAberto] = useState(false)
  const [importando, setImportando] = useState(false)
  const [avisoImport, setAvisoImport] = useState(null)
  const [versao, setVersao] = useState(0) // muda a cada importação → recria as abas (zera seleção/expansão)
  const inputArquivo = useRef(null)
  const menuRef = useRef(null)
  useEffect(() => {
    if (!menuAberto) return
    const fechar = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [menuAberto])

  const importar = async (file) => {
    if (!file) return
    setImportando(true); setErro(null); setAvisoImport(null)
    try {
      const base64 = await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(String(fr.result).split(',')[1] || '')
        fr.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
        fr.readAsDataURL(file)
      })
      const r = await fetch(`${BACKEND_URL}/api/extrato-daf/importar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: file.name, conteudoBase64: base64 }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`)
      // Limpa tudo e concilia de novo com o arquivo importado
      setDados(null); setConc(null); setBusca(''); setVersao(v => v + 1); setAba('extrato')
      await carregar(j.arquivo, true)
      setAvisoImport(`Arquivo ${j.arquivo} importado (${j.lancamentos} lançamento(s)) e conciliação refeita.`)
    } catch (e) {
      setErro(`Importação: ${e.message}`)
    } finally {
      setImportando(false)
      if (inputArquivo.current) inputArquivo.current.value = ''
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Extrato de Pagamento DAF</h1>
          <p className="text-[11px] text-slate-500">
            SharePoint › Banco de Dados - DAF - Extrato de Pagamentos
            {dados?.arquivo && <> · extrato de {fmtDataHora(dados.arquivo.modificado_em)}</>}
            {conc?.rfn003_atualizado_em && <> · RFN003 de {fmtDataHora(conc.rfn003_atualizado_em)}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(dados?.arquivos?.length || 0) > 1 && (
            <select value={arquivo} onChange={e => carregar(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] bg-white">
              {dados.arquivos.map(a => <option key={a.nome} value={a.nome}>{a.nome}</option>)}
            </select>
          )}
          {/* Última atualização = quando o extrato foi lido do SharePoint pela última vez (lido_em do backend) */}
          {dados?.lido_em && (
            <span className="text-[11px] text-slate-500 whitespace-nowrap" title="Última vez que o extrato e a conciliação foram lidos">
              Atualizado em {fmtDataHora(dados.lido_em)}
            </span>
          )}
          <button onClick={() => carregar(arquivo, true)} disabled={carregando || carregandoConc} title="Atualizar" aria-label="Atualizar"
            className="flex items-center justify-center p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${carregando || carregandoConc ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuAberto(m => !m)} disabled={importando} title="Configurações"
              className="flex items-center justify-center p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              {importando ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
            </button>
            {menuAberto && (
              <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1">
                <button onClick={() => { setMenuAberto(false); inputArquivo.current?.click() }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 text-left">
                  <Upload className="h-3.5 w-3.5 text-slate-500" /> Importar arquivo
                </button>
              </div>
            )}
            <input ref={inputArquivo} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => importar(e.target.files?.[0])} />
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {ABAS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setAba(k)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 -mb-px ${aba === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg px-3 py-2">Não foi possível ler: {erro}</div>}
      {avisoImport && !erro && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] rounded-lg px-3 py-2">
          <span>{avisoImport}</span>
          <button onClick={() => setAvisoImport(null)} className="text-emerald-600 hover:text-emerald-800">fechar</button>
        </div>
      )}
      {importando && <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-lg px-3 py-2">Importando o arquivo e refazendo a conciliação...</div>}
      {dados?.colunas_nao_encontradas?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] rounded-lg px-3 py-2">
          Colunas não encontradas na planilha: {dados.colunas_nao_encontradas.join(', ')}. O layout do arquivo pode ter mudado.
        </div>
      )}
      {dados && !dados.arquivo && !erro && (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-lg px-3 py-2">Nenhuma planilha encontrada na pasta do SharePoint.</div>
      )}

      <ResumoConciliacao dados={dados} conc={conc} carregandoConc={carregandoConc} />
      {aba === 'extrato' && <AbaExtrato key={`ext-${versao}`} dados={dados} carregando={carregando} busca={busca} setBusca={setBusca} conc={conc} carregandoConc={carregandoConc} />}
      {aba === 'aberto' && <AbaTitulos key={`tit-${versao}`} conc={conc} dados={dados} carregando={carregandoConc} busca={busca} setBusca={setBusca} />}
    </div>
  )
}
