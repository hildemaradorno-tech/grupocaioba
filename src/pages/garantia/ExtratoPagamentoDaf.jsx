// Controle de Processos › Extrato de Pagamento DAF.
// Fonte: SharePoint › BD › "Banco de Dados - DAF - Extrato de Pagamentos" (planilha exportada do SAP pela DAF,
// ex.: Account-303920.xlsx), lida ao vivo pelo backend (/api/extrato-daf). Cabeçalho traduzido para português.
// Aba Conciliação (/api/extrato-daf/conciliacao): cruza o extrato com os títulos a receber da DAF do RFN003
// Analítico (Financeiro - DAF) — Referência = NFS-e ou "NFP" (Nota Fiscal do título); sem nota, pelo Texto
// (chassi, O.S., número "O0xxxxx" da Observação). Nada é gravado: vale só enquanto os títulos não são baixados.
import React, { useEffect, useMemo, useState } from 'react'
import {
  RefreshCw, Search, FileSpreadsheet, Download, Receipt, Landmark, Wallet, Hash, CheckCircle2, AlertTriangle,
  HelpCircle, ChevronRight, ChevronDown, ListChecks, Scale, FolderOpen,
} from 'lucide-react'
import * as XLSX from 'xlsx'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const ABAS = [
  ['extrato', 'Extrato', ListChecks],
  ['conciliacao', 'Conciliação', Scale],
  ['aberto', 'Títulos em Aberto', FolderOpen],
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
}
const DICA_SITUACAO = {
  Conciliado: 'Valor pago = valor do título e líquido pago = saldo (tolerância de R$ 0,05).',
  'Retenção divergente': 'Valor pago bate com o título, mas o líquido não bate com o saldo: a retenção feita pela DAF é diferente da descontada no título.',
  'Pago a menor': 'A DAF pagou menos que o valor do título (ex.: só o serviço ou só as peças).',
  'Pago a maior': 'A DAF pagou mais que o valor do título.',
  'Já baixado': 'O título já está com saldo zero no RFN003.',
}
function Badge({ texto }) {
  return <span title={DICA_SITUACAO[texto] || ''} className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${COR_SITUACAO[texto] || 'bg-slate-100 text-slate-600'}`}>{texto}</span>
}

function Card({ icon: Icon, titulo, valor, sub, cor, ativo, onClick }) {
  return (
    <div onClick={onClick}
      className={`bg-white border rounded-xl p-3 shadow-sm flex items-start gap-3 ${onClick ? 'cursor-pointer hover:border-indigo-300' : ''} ${ativo ? 'border-indigo-500 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
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

function exportarXlsx(nome, aba, linhas) {
  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, aba)
  XLSX.writeFile(wb, nome)
}

// ── Aba Extrato ─────────────────────────────────────────────────────────────
function AbaExtrato({ dados, carregando, busca, setBusca, situacaoPorLinha }) {
  const colunas = dados?.colunas || []
  const termo = semAcento(busca.trim())
  const registros = useMemo(() => (dados?.registros || []).map((r, i) => ({ ...r, _i: i }))
    .filter(r => !termo || colunas.some(c => semAcento(CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : r[c.campo]).includes(termo))), [dados, termo, colunas])
  const totais = useMemo(() => registros.reduce((t, r) => ({
    bruto: t.bruto + (r.valor_moeda_documento || 0), imposto: t.imposto + (r.imposto_retido || 0), liquido: t.liquido + (r.valor_moeda_local || 0),
  }), { bruto: 0, imposto: 0, liquido: 0 }), [registros])
  const temConc = !!situacaoPorLinha

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card icon={Hash} titulo="Lançamentos" valor={registros.length.toLocaleString('pt-BR')} cor="bg-slate-100 text-slate-600" />
        <Card icon={Receipt} titulo="Valor Bruto" valor={fmtMoeda(totais.bruto)} cor="bg-indigo-100 text-indigo-600" />
        <Card icon={Landmark} titulo="Imposto Retido" valor={fmtMoeda(totais.imposto)} cor="bg-amber-100 text-amber-600" />
        <Card icon={Wallet} titulo="Valor Líquido" valor={fmtMoeda(totais.liquido)} cor="bg-emerald-100 text-emerald-600" />
      </div>
      <CaixaTabela busca={busca} setBusca={setBusca} placeholder="Buscar em qualquer coluna (referência, documento, chassi, O.S....)">
        <table className="min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              {colunas.map(c => <Th key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right' : ''}>{c.rotulo}</Th>)}
              {temConc && <><Th>Título</Th><Th>Situação</Th></>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {carregando && !dados ? (
              <tr><td colSpan={17} className="px-3 py-6 text-center text-[11px] text-slate-400">Lendo planilha do SharePoint...</td></tr>
            ) : registros.length === 0 ? (
              <tr><td colSpan={17} className="px-3 py-6 text-center text-[11px] text-slate-400">Nenhum lançamento.</td></tr>
            ) : registros.map(r => {
              const s = situacaoPorLinha?.get(r._i)
              return (
                <tr key={r._i} className="hover:bg-slate-50">
                  {colunas.map(c => (
                    <Td key={c.campo} className={CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}>
                      {CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : CAMPOS_VALOR.has(c.campo) ? fmtValor(r[c.campo]) : r[c.campo]}
                    </Td>
                  ))}
                  {temConc && <><Td>{s?.lancamento || '—'}</Td><Td>{s ? <Badge texto={s.situacao} /> : ''}</Td></>}
                </tr>
              )
            })}
          </tbody>
          {registros.length > 0 && (
            <tfoot className="bg-slate-50 sticky bottom-0">
              <tr>
                {colunas.map((c, k) => (
                  <td key={c.campo} className={`px-3 py-2 text-[11px] font-bold text-slate-900 whitespace-nowrap ${CAMPOS_VALOR.has(c.campo) ? 'text-right tabular-nums' : ''}`}>
                    {k === 0 ? 'Total' : c.campo === 'valor_moeda_documento' ? fmtValor(totais.bruto) : c.campo === 'imposto_retido' ? fmtValor(totais.imposto) : c.campo === 'valor_moeda_local' ? fmtValor(totais.liquido) : ''}
                  </td>
                ))}
                {temConc && <><td /><td /></>}
              </tr>
            </tfoot>
          )}
        </table>
      </CaixaTabela>
    </>
  )
}

// ── Aba Conciliação ─────────────────────────────────────────────────────────
function AbaConciliacao({ conc, carregando, busca, setBusca }) {
  const [filtro, setFiltro] = useState('')
  const [abertos, setAbertos] = useState(() => new Set())
  const termo = semAcento(busca.trim())
  const lista = conc?.conciliacao || []
  const semTitulo = conc?.sem_titulo || []

  const contagem = useMemo(() => {
    const c = { total: lista.length, Conciliado: 0, divergente: 0, sugerido: 0 }
    lista.forEach(t => { if (t.situacao === 'Conciliado') c.Conciliado++; else c.divergente++; if (t.sugerido) c.sugerido++ })
    return c
  }, [lista])
  const pagoTotal = lista.reduce((s, t) => s + t.pago_liquido, 0)

  const filtrados = useMemo(() => lista.filter(t => {
    if (filtro === 'Conciliado' && t.situacao !== 'Conciliado') return false
    if (filtro === 'divergente' && t.situacao === 'Conciliado') return false
    if (filtro === 'sugerido' && !t.sugerido) return false
    if (filtro && !['Conciliado', 'divergente', 'sugerido', 'sem'].includes(filtro) && t.situacao !== filtro) return false
    if (filtro === 'sem') return false
    return contem(t, ['lancamento', 'nro_titulo', 'empresa', 'os', 'chassi', 'placa', 'nota_fiscal_servico', 'nota_fiscal', 'observacao', 'situacao'], termo)
      || t.linhas.some(l => contem(l, ['referencia', 'texto', 'numero_documento'], termo))
  }), [lista, filtro, termo])
  const semTituloFiltrado = useMemo(() => (filtro && filtro !== 'sem') ? [] : semTitulo.filter(l => contem(l, ['referencia', 'texto', 'numero_documento', 'motivo'], termo)), [semTitulo, filtro, termo])

  const alternar = (k) => setAbertos(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n })
  const situacoes = [...new Set(lista.map(t => t.situacao))]

  const exportar = () => exportarXlsx('Conciliacao Extrato DAF.xlsx', 'Conciliação', [
    ...filtrados.flatMap(t => t.linhas.map(l => ({
      'Título (Lanc.)': t.lancamento, 'Nº Título': t.nro_titulo, Empresa: t.empresa, 'O.S.': t.os, Chassi: t.chassi,
      'NF / NFS-e': t.nota_fiscal_servico, 'Nota Fiscal (NFP)': t.nota_fiscal, 'Valor Título': t.valor, 'Saldo Título': t.saldo,
      'Pago Bruto (título)': t.pago_bruto, 'Retido (título)': t.retido, 'Pago Líquido (título)': t.pago_liquido,
      'Dif. Valor': t.dif_valor, 'Dif. Saldo': t.dif_saldo, Situação: t.situacao,
      'Referência Extrato': l.referencia, 'Nº Documento': l.numero_documento, 'Texto': l.texto, 'Valor Linha': l.valor,
      'Retido Linha': l.retido, 'Líquido Linha': l.liquido, Vínculo: l.vinculo, Motivo: l.motivo,
    }))),
    ...semTituloFiltrado.map(l => ({ Situação: 'Sem título', 'Referência Extrato': l.referencia, 'Nº Documento': l.numero_documento, Texto: l.texto, 'Valor Linha': l.valor, 'Retido Linha': l.retido, 'Líquido Linha': l.liquido, Motivo: l.motivo })),
  ])

  if (carregando && !conc) return <p className="text-[11px] text-slate-400 px-1">Cruzando o extrato com o RFN003 (títulos a receber)...</p>

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card icon={Hash} titulo="Títulos no Extrato" valor={contagem.total} sub={fmtMoeda(pagoTotal) + ' líquido'} cor="bg-slate-100 text-slate-600" ativo={filtro === ''} onClick={() => setFiltro('')} />
        <Card icon={CheckCircle2} titulo="Conciliados" valor={contagem.Conciliado} cor="bg-emerald-100 text-emerald-600" ativo={filtro === 'Conciliado'} onClick={() => setFiltro(f => f === 'Conciliado' ? '' : 'Conciliado')} />
        <Card icon={AlertTriangle} titulo="Com Divergência" valor={contagem.divergente} cor="bg-amber-100 text-amber-600" ativo={filtro === 'divergente'} onClick={() => setFiltro(f => f === 'divergente' ? '' : 'divergente')} />
        <Card icon={HelpCircle} titulo="Vínculo Sugerido" valor={contagem.sugerido} sub="achado pelo texto, conferir" cor="bg-sky-100 text-sky-600" ativo={filtro === 'sugerido'} onClick={() => setFiltro(f => f === 'sugerido' ? '' : 'sugerido')} />
        <Card icon={Receipt} titulo="Linhas sem Título" valor={semTitulo.length} cor="bg-red-100 text-red-600" ativo={filtro === 'sem'} onClick={() => setFiltro(f => f === 'sem' ? '' : 'sem')} />
      </div>

      <CaixaTabela busca={busca} setBusca={setBusca} placeholder="Buscar por título, O.S., chassi, nota, texto..."
        extra={<>
          <select value={situacoes.includes(filtro) ? filtro : ''} onChange={e => setFiltro(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todas as situações</option>
            {situacoes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={exportar} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> Exportar</button>
        </>}>
        <table className="min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr>
              <Th className="w-6" /><Th>Título</Th><Th>Empresa</Th><Th>Tipo</Th><Th>O.S.</Th><Th>Chassi</Th><Th>NF / NFS-e</Th><Th>NFP</Th>
              <Th className="text-right">Valor Título</Th><Th className="text-right">Pago Bruto</Th><Th className="text-right">Dif. Valor</Th>
              <Th className="text-right">Retido DAF</Th><Th className="text-right">Saldo Título</Th><Th className="text-right">Pago Líquido</Th><Th className="text-right">Dif. Saldo</Th><Th>Situação</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map(t => {
              const aberto = abertos.has(t.lancamento)
              return (
                <React.Fragment key={t.lancamento}>
                  <tr className="hover:bg-slate-50 cursor-pointer" onClick={() => alternar(t.lancamento)}>
                    <Td>{aberto ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}</Td>
                    <Td className="font-semibold text-slate-900">{t.lancamento} <span className="text-slate-400 font-normal">({t.nro_titulo})</span></Td>
                    <Td>{empresaCurta(t.empresa)}</Td>
                    <Td>{t.tipo_titulo}</Td>
                    <Td>{t.os}</Td>
                    <Td className="font-mono">{t.chassi}</Td>
                    <Td>{t.nota_fiscal_servico}</Td>
                    <Td>{t.nota_fiscal}</Td>
                    <TdV v={t.valor} /><TdV v={t.pago_bruto} /><TdV v={t.dif_valor} destaque />
                    <TdV v={t.retido} /><TdV v={t.saldo} /><TdV v={t.pago_liquido} /><TdV v={t.dif_saldo} destaque />
                    <Td><Badge texto={t.situacao} />{t.sugerido && <span title="Vínculo achado pelo texto (chassi/O.S.), não pela nota — conferir" className="ml-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-700">Sugerido</span>}</Td>
                  </tr>
                  {aberto && (
                    <tr className="bg-slate-50/60">
                      <td />
                      <td colSpan={15} className="px-3 py-2">
                        {t.observacao && <p className="text-[11px] text-slate-500 mb-1.5"><span className="font-semibold">Observação do título:</span> {t.observacao}</p>}
                        <table className="min-w-full bg-white border border-slate-200 rounded-lg">
                          <thead><tr><Th>Referência</Th><Th>Nº Documento</Th><Th>Texto</Th><Th className="text-right">Valor</Th><Th className="text-right">Retido</Th><Th className="text-right">Líquido</Th><Th>Vínculo</Th></tr></thead>
                          <tbody className="divide-y divide-slate-100">
                            {t.linhas.map(l => (
                              <tr key={l.i}>
                                <Td>{l.referencia}</Td><Td>{l.numero_documento}</Td><Td>{l.texto}</Td>
                                <TdV v={l.valor} /><TdV v={l.retido} /><TdV v={l.liquido} />
                                <Td><span className={l.vinculo === 'Sugerido' ? 'text-sky-700 font-semibold' : ''}>{l.vinculo}</span> <span className="text-slate-400">— {l.motivo}</span></Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {semTituloFiltrado.map(l => (
              <tr key={`sem-${l.i}`} className="bg-red-50/40">
                <Td /><Td className="text-red-700 font-semibold">—</Td>
                <Td colSpan={6}><span className="font-semibold">{l.referencia}</span> · {l.texto} <span className="text-slate-400">— {l.motivo}{l.candidatos?.length ? `: ${l.candidatos.join(', ')}` : ''}</span></Td>
                <Td /><TdV v={-(l.valor || 0)} /><Td /><TdV v={-(l.retido || 0)} /><Td /><TdV v={-(l.liquido || 0)} /><Td />
                <Td><Badge texto={l.vinculo === 'Ambíguo' ? 'Ambíguo' : 'Sem título'} /></Td>
              </tr>
            ))}
            {filtrados.length === 0 && semTituloFiltrado.length === 0 && (
              <tr><td colSpan={16} className="px-3 py-6 text-center text-[11px] text-slate-400">Nada para mostrar.</td></tr>
            )}
          </tbody>
        </table>
      </CaixaTabela>
      <p className="text-[10px] text-slate-400">
        Vínculo pela Referência: número da NFS-e = Nota de Serviço do título; "NFP" = Nota Fiscal do título (RFN003 Analítico).
        Sem nota, procura pelo Texto (chassi, O.S. e o número "O0..." anotado na Observação). Tolerância de R$ {fmtValor(conc?.tolerancia ?? 0.05)}.
        Nada fica gravado: a conciliação é refeita a cada leitura.
      </p>
    </>
  )
}

// ── Aba Títulos em Aberto ───────────────────────────────────────────────────
function AbaEmAberto({ conc, carregando, busca, setBusca }) {
  const todasEmpresas = useMemo(() => [...new Set((conc?.em_aberto || []).map(t => t.empresa))].sort(), [conc])
  const [empresa, setEmpresa] = useState(null) // null = empresas do extrato
  const [tipo, setTipo] = useState('')
  const empresaSel = empresa ?? (conc?.empresas_no_extrato?.length === 1 ? conc.empresas_no_extrato[0] : '')
  const termo = semAcento(busca.trim())
  const tipos = useMemo(() => [...new Set((conc?.em_aberto || []).map(t => t.tipo_titulo))].sort(), [conc])
  const lista = useMemo(() => (conc?.em_aberto || []).filter(t =>
    (!empresaSel || t.empresa === empresaSel) && (!tipo || t.tipo_titulo === tipo)
    && contem(t, ['lancamento', 'nro_titulo', 'os', 'chassi', 'nota_fiscal_servico', 'nota_fiscal', 'observacao', 'tipo_titulo'], termo)), [conc, empresaSel, tipo, termo])
  const total = lista.reduce((s, t) => s + t.saldo, 0)

  if (carregando && !conc) return <p className="text-[11px] text-slate-400 px-1">Lendo o RFN003 (títulos a receber)...</p>

  return (
    <>
      <p className="text-[11px] text-slate-500">Títulos da DAF com saldo no RFN003 que <b>não</b> aparecem neste extrato — {lista.length} título(s), saldo de {fmtMoeda(total)}.</p>
      <CaixaTabela busca={busca} setBusca={setBusca} placeholder="Buscar por título, O.S., chassi, nota, observação..."
        extra={<>
          <select value={empresaSel} onChange={e => setEmpresa(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todas as empresas</option>
            {todasEmpresas.map(e => <option key={e} value={e}>{empresaCurta(e)}</option>)}
          </select>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-[11px] bg-white">
            <option value="">Todos os tipos</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => exportarXlsx('Titulos DAF em aberto.xlsx', 'Em aberto', lista.map(t => ({
            'Título (Lanc.)': t.lancamento, 'Nº Título': t.nro_titulo, Empresa: t.empresa, Tipo: t.tipo_titulo, 'O.S.': t.os, Chassi: t.chassi,
            'NF / NFS-e': t.nota_fiscal_servico, 'Nota Fiscal (NFP)': t.nota_fiscal, Emissão: fmtData(t.emissao), Vencimento: fmtData(t.vencimento),
            'Dias Atraso': t.atraso, Valor: t.valor, Saldo: t.saldo, Observação: t.observacao,
          })))} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"><Download className="h-3.5 w-3.5" /> Exportar</button>
        </>}>
        <table className="min-w-full">
          <thead className="bg-slate-50 sticky top-0 z-10">
            <tr><Th>Título</Th><Th>Empresa</Th><Th>Tipo</Th><Th>O.S.</Th><Th>Chassi</Th><Th>NF / NFS-e</Th><Th>NFP</Th><Th>Emissão</Th><Th>Vencimento</Th><Th className="text-right">Atraso</Th><Th className="text-right">Valor</Th><Th className="text-right">Saldo</Th><Th>Observação</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map(t => (
              <tr key={t.lancamento} className="hover:bg-slate-50">
                <Td className="font-semibold text-slate-900">{t.lancamento} <span className="text-slate-400 font-normal">({t.nro_titulo})</span></Td>
                <Td>{empresaCurta(t.empresa)}</Td><Td>{t.tipo_titulo}</Td><Td>{t.os}</Td><Td className="font-mono">{t.chassi}</Td>
                <Td>{t.nota_fiscal_servico}</Td><Td>{t.nota_fiscal}</Td><Td>{fmtData(t.emissao)}</Td><Td>{fmtData(t.vencimento)}</Td>
                <Td className={`text-right ${t.atraso > 0 ? 'text-red-600 font-semibold' : ''}`}>{t.atraso ?? ''}</Td>
                <TdV v={t.valor} /><TdV v={t.saldo} />
                <Td className="max-w-[360px] truncate" title={t.observacao}>{t.observacao}</Td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={13} className="px-3 py-6 text-center text-[11px] text-slate-400">Nenhum título em aberto.</td></tr>}
          </tbody>
        </table>
      </CaixaTabela>
    </>
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

  // linha do extrato → título e situação (coluna extra na aba Extrato)
  const situacaoPorLinha = useMemo(() => {
    if (!conc) return null
    const m = new Map()
    conc.conciliacao.forEach(t => t.linhas.forEach(l => m.set(l.i, { lancamento: t.lancamento, situacao: t.situacao })))
    conc.sem_titulo.forEach(l => m.set(l.i, { lancamento: null, situacao: l.vinculo === 'Ambíguo' ? 'Ambíguo' : 'Sem título' }))
    return m
  }, [conc])

  const exportarExtrato = () => {
    const colunas = dados?.colunas || []
    exportarXlsx(`Extrato Pagamento DAF - ${(arquivo || 'extrato').replace(/\.xlsx?$/i, '')}.xlsx`, 'Extrato',
      (dados?.registros || []).map((r, i) => ({
        ...Object.fromEntries(colunas.map(c => [c.rotulo, CAMPOS_DATA.has(c.campo) ? fmtData(r[c.campo]) : r[c.campo]])),
        ...(situacaoPorLinha ? { 'Título': situacaoPorLinha.get(i)?.lancamento || '', 'Situação': situacaoPorLinha.get(i)?.situacao || '' } : {}),
      })))
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
          {(dados?.arquivos?.length || 0) === 1 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />{arquivo}
            </span>
          )}
          {aba === 'extrato' && (
            <button onClick={exportarExtrato} disabled={!dados?.registros?.length}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40">
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          )}
          <button onClick={() => carregar(arquivo, true)} disabled={carregando || carregandoConc}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando || carregandoConc ? 'animate-spin' : ''}`} /> Atualizar
          </button>
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
      {dados?.colunas_nao_encontradas?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-[11px] rounded-lg px-3 py-2">
          Colunas não encontradas na planilha: {dados.colunas_nao_encontradas.join(', ')}. O layout do arquivo pode ter mudado.
        </div>
      )}
      {dados && !dados.arquivo && !erro && (
        <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] rounded-lg px-3 py-2">Nenhuma planilha encontrada na pasta do SharePoint.</div>
      )}

      {aba === 'extrato' && <AbaExtrato dados={dados} carregando={carregando} busca={busca} setBusca={setBusca} situacaoPorLinha={situacaoPorLinha} />}
      {aba === 'conciliacao' && <AbaConciliacao conc={conc} carregando={carregandoConc} busca={busca} setBusca={setBusca} />}
      {aba === 'aberto' && <AbaEmAberto conc={conc} carregando={carregandoConc} busca={busca} setBusca={setBusca} />}
    </div>
  )
}
