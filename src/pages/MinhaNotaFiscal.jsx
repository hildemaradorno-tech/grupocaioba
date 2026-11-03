import React, { useEffect, useMemo, useState } from 'react'
import { FileText, FileDown, Loader2, AlertTriangle, Paperclip, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import { supabase } from '../services/supabaseClient'
import TabelaNotaFiscal from '../components/TabelaNotaFiscal'
import AnexoPjSlot from '../components/AnexoPjSlot'
import { montarNotaFiscalPj, montarHtmlNotaFiscal, montarPaginasCalculoPj, chaveNotaFiscal, anexosDaNota, fmtCnpj, etapaNfPj, STATUS_NF_PRESTADOR } from '../utils/notaFiscalPj'
import { fmtBRL } from '../utils/comissoesFormat'
import { gerarPdfComissoes, paraNomeArquivo } from '../utils/comissoesPdf'

// Minha Nota Fiscal: o prestador PJ (usuário ligado a um funcionário em Usuários) vê a Nota Fiscal
// dos meses já conferidos pelo DP ("Aguardando Nota Fiscal") e baixa o PDF — resumo por empresa/CNPJ
// em cima e o cálculo detalhado com as regras embaixo. O banco só devolve as linhas do próprio
// funcionário (policies "minha-nota-fiscal"). Aqui o PJ também anexa as notas emitidas (pj_anexos tipo NF)
// e clica em Confirmar (pj_nf_envios): fica "Aguardando recebimento da Nota Fiscal", com os anexos
// travados, até o Processamento confirmar o recebimento ("Nota Fiscal Recebida") ou devolver.
const STATUS_LIBERADOS = ['CONFERIDO_DP', 'PROCESSAMENTO_PARCIAL', 'PROCESSADO']
const fmtData = (v) => (v ? String(v).split('-').reverse().join('/') : '')

export default function MinhaNotaFiscal() {
  const { userFuncionarioId } = useAuth()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [func, setFunc] = useState(null)
  const [empresas, setEmpresas] = useState([])
  const [politicas, setPoliticas] = useState([])
  const [registros, setRegistros] = useState([])
  const [lotes, setLotes] = useState([])
  const [loteId, setLoteId] = useState('')
  const [gerando, setGerando] = useState(false)
  const [anexos, setAnexos] = useState([])
  const [envios, setEnvios] = useState([])
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!userFuncionarioId) { setCarregando(false); return }
    let ativo = true
    ;(async () => {
      setCarregando(true)
      setErro(null)
      try {
        const [{ data: f, error: eF }, emps, pols, { data: calc, error: eC }] = await Promise.all([
          supabase.from('dim_funcionarios').select('*').eq('id', userFuncionarioId).maybeSingle(),
          apiService.getEmpresas(),
          apiService.getPoliticaComissao(),
          supabase.from('fato_comissoes_calculadas').select('*').eq('funcionario_id', userFuncionarioId).not('lote_id', 'is', null),
        ])
        if (eF) throw eF
        if (eC) throw eC
        const ls = await apiService.getLotesPorIds([...new Set((calc || []).map(r => r.lote_id))])
        if (!ativo) return
        const liberados = ls.filter(l => STATUS_LIBERADOS.includes(l.status))
          .sort((a, b) => (b.periodo_inicio || '').localeCompare(a.periodo_inicio || ''))
        setFunc(f)
        setEmpresas(emps)
        setPoliticas(pols)
        setRegistros(calc || [])
        setLotes(liberados)
        setLoteId(liberados[0]?.id || '')
      } catch (err) {
        if (ativo) setErro(err.message || String(err))
      } finally {
        if (ativo) setCarregando(false)
      }
    })()
    return () => { ativo = false }
  }, [userFuncionarioId])

  const lote = lotes.find(l => l.id === loteId) || null
  const periodo = (lote?.periodo_inicio || '').slice(0, 7)
  const carregarAnexos = async () => {
    if (!userFuncionarioId) return
    try {
      setAnexos(await apiService.getPjAnexos({ funcionarioIds: [userFuncionarioId] }))
    } catch (err) {
      setErro(err.message || String(err))
    }
  }
  useEffect(() => { carregarAnexos() }, [userFuncionarioId]) // eslint-disable-line react-hooks/exhaustive-deps
  const carregarEnvios = async () => {
    if (!userFuncionarioId) return
    try {
      setEnvios(await apiService.getPjNfEnvios({ funcionarioIds: [userFuncionarioId] }))
    } catch (err) {
      setErro(err.message || String(err))
    }
  }
  useEffect(() => { carregarEnvios() }, [userFuncionarioId]) // eslint-disable-line react-hooks/exhaustive-deps
  const envio = envios.find(e => e.lote_id === loteId) || null
  const etapa = lote ? etapaNfPj(lote, userFuncionarioId, envio) : 'aguardando'
  const travado = etapa === 'enviada' || etapa === 'recebida'
  const politicasPorId = useMemo(() => Object.fromEntries(politicas.map(p => [p.id, p])), [politicas])
  const registrosLote = useMemo(() => registros
    .filter(r => r.lote_id === loteId)
    .map(r => ({ ...r, politica: politicasPorId[r.politica_id] || null }))
    .filter(r => r.politica), [registros, loteId, politicasPorId])
  const prestador = func ? `${func.codigo_funcionario ? `${func.codigo_funcionario} — ` : ''}${func.nome_funcionario}` : ''
  const nf = useMemo(() => (registrosLote.length === 0 ? null : montarNotaFiscalPj({
    linhas: registrosLote.map(r => ({ politica: r.politica, valor: r.valor_comissao, detalhe: Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas : [] })),
    politicas, empresas, prestador, emissaoConfig: func?.pj_emissao_nf || null,
  })), [registrosLote, politicas, empresas, prestador, func])

  const baixarPdf = async () => {
    if (!nf || !lote) return
    setGerando(true)
    setErro(null)
    try {
      const periodoLabel = `${fmtData(lote.periodo_inicio)} a ${fmtData(lote.periodo_fim)}`
      await gerarPdfComissoes({
        paginasIniciais: [montarHtmlNotaFiscal(nf, { periodoLabel }), ...montarPaginasCalculoPj({ registros: registrosLote, prestador, periodoLabel, politicas })],
        setores: [],
        periodoInicio: lote.periodo_inicio, periodoFim: lote.periodo_fim,
        nomeArquivo: ['Nota_Fiscal', lote.periodo_inicio, lote.periodo_fim, func?.nome_funcionario].map(paraNomeArquivo).join('_'),
      })
    } catch (err) {
      setErro('Erro ao gerar o PDF: ' + (err.message || String(err)))
    } finally {
      setGerando(false)
    }
  }

  // Confirmar: só com todas as notas do quadro anexadas — envia para o Processamento receber.
  const confirmarEnvio = async () => {
    if (!nf || !lote || travado) return
    const faltando = (nf.emissao?.notas || []).filter(n => anexosDaNota(anexos, n, userFuncionarioId, periodo).length === 0)
    if (faltando.length > 0) {
      setErro(`Anexe a Nota Fiscal de: ${faltando.map(n => n.nome).join(', ')}.`)
      return
    }
    if (!window.confirm('Confirmar o envio das Notas Fiscais? Depois disso os anexos ficam travados até o recebimento.')) return
    setEnviando(true)
    setErro(null)
    try {
      await apiService.enviarNfPj({ loteId: lote.id, funcionarioId: userFuncionarioId, periodo })
      await carregarEnvios()
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-full w-full p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Minha Nota Fiscal</h1>
          <p className="text-xs text-slate-500">Valores da sua prestação de serviços já conferidos pelo DP — emita as notas conforme o quadro abaixo e baixe o PDF.</p>
          {lote && (
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_NF_PRESTADOR[etapa].className}`}>{STATUS_NF_PRESTADOR[etapa].label}</span>
          )}
        </div>
        {lotes.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={loteId} onChange={e => setLoteId(e.target.value)} className="text-xs p-2 border border-slate-200 rounded-md bg-white font-medium">
              {lotes.map(l => <option key={l.id} value={l.id}>{fmtData(l.periodo_inicio)} a {fmtData(l.periodo_fim)}</option>)}
            </select>
            <button type="button" onClick={baixarPdf} disabled={gerando || !nf}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-md">
              {gerando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Baixar PDF
            </button>
          </div>
        )}
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4" /> {erro}
        </div>
      )}

      {carregando ? (
        <p className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</p>
      ) : !userFuncionarioId ? (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">Seu usuário não está ligado a um funcionário. Peça ao administrador para informar o funcionário no cadastro de Usuários.</p>
      ) : lotes.length === 0 ? (
        <p className="text-xs text-slate-400">Nenhuma Nota Fiscal liberada ainda — ela aparece aqui depois que o DP conferir o mês.</p>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 overflow-auto">
            <TabelaNotaFiscal nf={nf} anexos={anexos.filter(a => a.periodo === periodo)} />
          </div>
          {nf?.emissao?.notas?.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-2 max-w-3xl">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Paperclip className="h-4 w-4 text-blue-600" /> Anexar Notas Fiscais emitidas</h2>
              {etapa === 'devolvida' && (
                <p className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  Nota Fiscal devolvida{envio?.devolvido_por ? ` por ${envio.devolvido_por}` : ''}{envio?.motivo_devolucao ? `: ${envio.motivo_devolucao}` : ''}. Corrija os anexos e confirme de novo.
                </p>
              )}
              <p className="text-[11px] text-slate-500">
                {travado ? 'Notas Fiscais enviadas — os anexos ficam travados.' : 'Emita cada nota conforme o quadro acima, anexe o arquivo (PDF ou imagem, até 5 MB) e clique em Confirmar.'}
              </p>
              {nf.emissao.notas.map(n => (
                <AnexoPjSlot key={chaveNotaFiscal(n)} rotulo={n.nome} detalhe={`${n.cnpj ? `CNPJ ${fmtCnpj(n.cnpj)} · ` : ''}${fmtBRL(n.valor)}`}
                  anexos={anexosDaNota(anexos, n, userFuncionarioId, periodo)}
                  dados={{ funcionarioId: userFuncionarioId, periodo, tipo: 'NF', cnpj: chaveNotaFiscal(n), empresaNome: n.nome }}
                  podeEditar={!travado}
                  onAlterado={carregarAnexos} />
              ))}
              {!travado && (
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={confirmarEnvio} disabled={enviando}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-md">
                    {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Confirmar
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
