import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileWarning, Upload, PlusCircle, AlertTriangle, Loader2, ClipboardList, CheckSquare, Square,
  Wrench, Package, ArrowRight, Settings, Lock,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import { listarDefinicoes, listarInstancias, iniciarInstancia, mapaTarefaAbertaPorInstancia } from '../../services/bpm/bpmService'
import { parseNfeXml, lerArquivoComoTexto } from '../../services/bpm/nfeXmlParser'

const CHAVE_PROCESSO = 'cancelamento-devolucao-nfe'

const TIPOS_ITEM = ['Veículo', 'Peça', 'Serviço']

const TIPOS_SOLICITACAO = [
  { value: 'cancelamento', label: 'Cancelamento' },
  { value: 'devolucao_parcial', label: 'Devolução Parcial' },
  { value: 'devolucao_total', label: 'Devolução Total' },
]

const MOTIVOS = [
  'Erro de cadastro (cliente/CNPJ)',
  'Erro de valor/preço',
  'Erro de item/produto lançado',
  'Produto/peça com defeito',
  'Desistência do cliente',
  'Nota emitida em duplicidade',
  'Erro fiscal (CFOP, natureza da operação, imposto)',
  'Outro',
]

const VAZIO = {
  numero_nf: '', serie: '', chave_acesso: '', natureza_operacao: '', nota_referenciada: '',
  tipo_nota: '', cliente: '', cnpj_cliente: '', data_nf: '', valor_nf: '',
  tipo_item: '', tipo_solicitacao: '', motivo: '',
  itens: [], itensSelecionados: [],
}

function fmtNumero(v) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function slaBadge(prazoEm) {
  if (!prazoEm) return { label: 'Sem prazo', cls: 'bg-slate-100 text-slate-400' }
  const horas = (new Date(prazoEm) - new Date()) / 3600000
  if (horas < 0) return { label: 'Atrasado', cls: 'bg-red-50 text-red-700' }
  if (horas <= 6) return { label: 'Vence em breve', cls: 'bg-amber-50 text-amber-700' }
  return { label: 'No prazo', cls: 'bg-emerald-50 text-emerald-700' }
}

const STATUS_SOLICITACAO = {
  em_andamento: { label: 'Em andamento', cls: 'bg-blue-50 text-blue-700' },
  concluido: { label: 'Concluído', cls: 'bg-emerald-50 text-emerald-700' },
  pendencia_manual: { label: 'Pendência manual', cls: 'bg-red-50 text-red-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-slate-100 text-slate-500' },
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

function fmtMoeda(v) {
  if (v === '' || v === null || v === undefined) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function NfeCancelamentoDevolucao() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [aba, setAba] = useState('acompanhamento')
  const [definicao, setDefinicao] = useState(null)
  const [definicaoCarregada, setDefinicaoCarregada] = useState(false)
  const [ultimaDefinicaoId, setUltimaDefinicaoId] = useState(null)
  const [form, setForm] = useState(VAZIO)
  const [tipoDocEscolhido, setTipoDocEscolhido] = useState('')
  const [importando, setImportando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [avisoImportacao, setAvisoImportacao] = useState(null)
  const [xmlImportado, setXmlImportado] = useState(false)

  const [solicitacoes, setSolicitacoes] = useState([])
  const [tarefasAbertas, setTarefasAbertas] = useState({})
  const [usuariosMap, setUsuariosMap] = useState({})
  const [cargosMap, setCargosMap] = useState({})
  const [loadingLista, setLoadingLista] = useState(true)

  useEffect(() => {
    // listarDefinicoes traz TODAS as versões/status (não só publicadas) — precisamos disso pra
    // sempre reabrir a última versão salva no Modelador (senão o botão "Fluxo" abre sempre um
    // diagrama em branco e o rascunho que a pessoa estava montando "some" da tela).
    listarDefinicoes()
      .then(defs => {
        const doProcesso = defs.filter(d => d.chave === CHAVE_PROCESSO) // já vem ordenado por versão desc
        setDefinicao(doProcesso.find(d => d.status === 'publicado') || null)
        setUltimaDefinicaoId(doProcesso[0]?.id || null)
      })
      .catch(e => setErro(e.message || String(e)))
      .finally(() => setDefinicaoCarregada(true))
  }, [])

  // Sem rascunho/publicado ainda: manda pro Modelador em branco já com a chave certa (via query
  // param), senão um processo criado do zero salvaria com uma chave derivada do nome digitado —
  // que quase nunca bate com CHAVE_PROCESSO, e o processo "sumiria" desta tela mesmo salvo.
  const linkModelador = ultimaDefinicaoId ? `/bpm/modelador/${ultimaDefinicaoId}` : `/bpm/modelador?chave=${CHAVE_PROCESSO}`

  const carregarSolicitacoes = useCallback(async () => {
    setLoadingLista(true)
    try {
      const todas = await listarInstancias()
      const doProcesso = todas.filter(i => i.bpm_process_definitions?.chave === CHAVE_PROCESSO)
      setSolicitacoes(doProcesso)
      const mapa = await mapaTarefaAbertaPorInstancia(doProcesso.filter(i => i.status === 'em_andamento').map(i => i.id))
      setTarefasAbertas(mapa)
      const ids = [...new Set(Object.values(mapa).map(t => t.responsavel_user_id).filter(Boolean))]
      if (ids.length) {
        const usuarios = await apiService.getUsuarios()
        setUsuariosMap(Object.fromEntries(usuarios.map(u => [u.id, u.nome])))
      }
      if (Object.values(mapa).some(t => t.responsavel_agrupamento_cargo_id)) {
        const agrupamentos = await apiService.getAgrupamentoCargos()
        setCargosMap(Object.fromEntries(agrupamentos.map(a => [a.id, a.nome_agrupamento_cargo])))
      }
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setLoadingLista(false) }
  }, [])

  useEffect(() => { if (aba === 'acompanhamento') carregarSolicitacoes() }, [aba, carregarSolicitacoes])

  const set = (patch) => setForm(p => ({ ...p, ...patch }))

  const importarXml = async (file) => {
    if (!file) return
    setImportando(true); setAvisoImportacao(null); setErro(null)
    try {
      const texto = await lerArquivoComoTexto(file)
      const { tipoDocumento, tipoItemSugerido, itens, ...dados } = parseNfeXml(texto)

      const esperado = tipoDocEscolhido === 'servico' ? 'NFS-e' : 'NF-e'
      if (tipoDocumento !== esperado) {
        setErro(`Você marcou "${tipoDocEscolhido === 'servico' ? 'Serviço' : 'Produto/Peça'}", mas esse arquivo é uma ${tipoDocumento}. Confira o arquivo ou troque a opção acima antes de importar.`)
        return
      }

      set({
        ...dados,
        itens,
        itensSelecionados: itens.map(i => i.codigo),
        tipo_item: tipoDocEscolhido === 'servico' ? 'Serviço' : (tipoItemSugerido || form.tipo_item),
      })
      setXmlImportado(true)
      setAvisoImportacao(`Dados importados do XML (${tipoDocumento})${itens.length ? ` — ${itens.length} ${itens.length === 1 ? 'item' : 'itens'} encontrado(s)` : ''}. Os campos abaixo ficam travados (vieram do XML); use "Trocar arquivo" se precisar importar outro.`)
    } catch (e) {
      setErro('Erro ao importar XML: ' + (e.message || String(e)))
    } finally { setImportando(false) }
  }

  const alternarItem = (codigo) => {
    setForm(p => ({
      ...p,
      itensSelecionados: p.itensSelecionados.includes(codigo)
        ? p.itensSelecionados.filter(c => c !== codigo)
        : [...p.itensSelecionados, codigo],
    }))
  }

  const alternarTodosItens = () => {
    setForm(p => ({ ...p, itensSelecionados: p.itensSelecionados.length === p.itens.length ? [] : p.itens.map(i => i.codigo) }))
  }

  // Só libera "Detalhes da Nota Fiscal" (e o resto do formulário) depois que o bloco de cima
  // (tipo de documento, tipo de nota, tipo de venda, tipo de solicitação e motivo) for preenchido.
  const topoCompleto = !!(tipoDocEscolhido && form.tipo_nota && form.tipo_item && form.tipo_solicitacao && form.motivo)

  const faltamCampos = !form.numero_nf || !form.tipo_nota || !form.cliente || !form.valor_nf
    || !form.tipo_item || !form.tipo_solicitacao || !form.motivo
    || (form.itens.length > 0 && form.itensSelecionados.length === 0)

  const iniciarNovaSolicitacao = () => {
    setForm(VAZIO); setTipoDocEscolhido(''); setAvisoImportacao(null); setErro(null); setXmlImportado(false)
    setAba('nova')
  }

  const enviar = async () => {
    if (!definicao) return
    setEnviando(true); setErro(null)
    try {
      const { itensSelecionados, ...formSemSelecao } = form
      const itensDevolvidos = form.itens.filter(i => itensSelecionados.includes(i.codigo))
      const dadosIniciais = {
        ...formSemSelecao,
        valor_nf: Number(form.valor_nf),
        data_nf: form.data_nf || null,
        itens_devolvidos: itensDevolvidos,
      }
      const r = await iniciarInstancia({
        definitionId: definicao.id,
        titulo: `NF ${form.numero_nf} — ${form.cliente}`,
        dadosIniciais,
        userId: user?.id,
      })
      navigate(`/bpm/nfe-solicitacoes/${r.instanciaId}`)
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setEnviando(false) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-indigo-600" /> Cancelamento e Devolução de NF-e
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Solicite o cancelamento/devolução de uma nota e acompanhe o andamento até a conclusão.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={linkModelador} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200">
            <Settings className="h-3.5 w-3.5" /> Fluxo (BPM/BPMN)
          </Link>
          <button onClick={iniciarNovaSolicitacao}
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
            <PlusCircle className="h-3.5 w-3.5" /> Nova Solicitação
          </button>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      {aba === 'nova' ? (
        !definicaoCarregada ? (
          <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : !definicao ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
            O processo "Cancelamento e Devolução de NF-e" ainda não está publicado. Abra o <Link to={linkModelador} className="underline font-semibold">Modelador BPMN</Link>, carregue o exemplo do piloto (ou monte o seu, o tutorial te ajuda) e publique antes de criar solicitações.
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700">Importar dados do XML</p>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] text-slate-500 shrink-0">1. Essa nota é de:</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setTipoDocEscolhido('produto')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${tipoDocEscolhido === 'produto' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    <Package className="h-3.5 w-3.5" /> Produto/Peça (NF-e)
                  </button>
                  <button onClick={() => setTipoDocEscolhido('servico')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${tipoDocEscolhido === 'servico' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                    <Wrench className="h-3.5 w-3.5" /> Serviço (NFS-e)
                  </button>
                </div>

                {tipoDocEscolhido && (
                  <>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                    <span className="text-[11px] text-slate-500 shrink-0">2.</span>
                    <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${importando ? 'text-slate-400 bg-slate-100' : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'}`}>
                      <Upload className="h-3.5 w-3.5" /> {importando ? 'Importando...' : 'Importar XML'}
                      <input type="file" accept=".xml" className="hidden" disabled={importando}
                        onChange={e => { importarXml(e.target.files?.[0]); e.target.value = '' }} />
                    </label>
                  </>
                )}
              </div>

              <div className="flex items-start gap-3 pt-1">
                <div className="flex flex-col gap-1 max-w-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de nota <span className="text-red-500">*</span></label>
                  <select value={form.tipo_nota} onChange={e => set({ tipo_nota: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                    <option value="">Selecione...</option><option value="venda">Venda</option><option value="compra">Compra</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de venda <span className="text-red-500">*</span></label>
                  <select value={form.tipo_item} onChange={e => set({ tipo_item: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                    <option value="">Selecione...</option>{TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de solicitação <span className="text-red-500">*</span></label>
                  <select value={form.tipo_solicitacao} onChange={e => set({ tipo_solicitacao: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                    <option value="">Selecione...</option>{TIPOS_SOLICITACAO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 max-w-xs">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo <span className="text-red-500">*</span></label>
                  <select value={form.motivo} onChange={e => set({ motivo: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                    <option value="">Selecione...</option>{MOTIVOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {avisoImportacao && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-700 font-semibold">{avisoImportacao}</div>
            )}

            {!topoCompleto ? (
              <p className="text-xs text-slate-400 italic px-1">Preencha as informações acima (tipo de nota, tipo de venda, tipo de solicitação e motivo) para continuar.</p>
            ) : (
            <>
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <p className="text-xs font-bold text-slate-700">Detalhes da Nota Fiscal</p>
                {xmlImportado && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5" /> Travado (veio do XML)
                  </span>
                )}
              </div>
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Número da nota (NF-e/NFS-e)', true, <input key="a" disabled={xmlImportado} value={form.numero_nf} onChange={e => set({ numero_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" placeholder="ex.: 123456" />],
                    ['Série', false, <input key="a2" disabled={xmlImportado} value={form.serie} onChange={e => set({ serie: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" />],
                    ['Chave de acesso', false, <input key="a3" disabled={xmlImportado} value={form.chave_acesso} onChange={e => set({ chave_acesso: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono disabled:bg-slate-50 disabled:text-slate-500" maxLength={44} placeholder="44 dígitos (só em NF-e)" />],
                    ['Natureza da operação', false, <input key="a4" disabled={xmlImportado} value={form.natureza_operacao} onChange={e => set({ natureza_operacao: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" placeholder="ex.: VENDA POR O.S. - OFICINA" />],
                    ['Cliente / Fornecedor', true, <input key="c" disabled={xmlImportado} value={form.cliente} onChange={e => set({ cliente: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" />],
                    ['CNPJ/CPF do cliente', false, <input key="c2" disabled={xmlImportado} value={form.cnpj_cliente} onChange={e => set({ cnpj_cliente: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" />],
                    ['Data da nota', true, <input key="d" type="date" disabled={xmlImportado} value={form.data_nf} onChange={e => set({ data_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" />],
                    ['Valor da nota (R$)', true, <input key="e" type="number" step="0.01" disabled={xmlImportado} value={form.valor_nf} onChange={e => set({ valor_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md disabled:bg-slate-50 disabled:text-slate-500" />],
                  ].map(([label, obrigatorio, campo]) => (
                    <tr key={label} className="align-top">
                      <td className="w-[38%] min-w-[130px] bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-600 border-r border-slate-200">
                        {label} {obrigatorio && <span className="text-red-500">*</span>}
                      </td>
                      <td className="px-3 py-2">{campo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {form.itens.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700">Itens da nota — marque os que estão sendo devolvidos</p>
                  <button onClick={alternarTodosItens} className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline">
                    {form.itensSelecionados.length === form.itens.length
                      ? <><Square className="h-3.5 w-3.5" /> Desmarcar todos</>
                      : <><CheckSquare className="h-3.5 w-3.5" /> Marcar todos</>}
                  </button>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">Código</th>
                      <th className="p-2">Descrição</th>
                      <th className="p-2 text-right">Qtd.</th>
                      <th className="p-2 text-right">Valor unit.</th>
                      <th className="p-2 text-right">Valor total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {form.itens.map(item => {
                      const marcado = form.itensSelecionados.includes(item.codigo)
                      return (
                        <tr key={item.codigo} className={`cursor-pointer transition-colors ${marcado ? 'bg-indigo-50/40' : 'hover:bg-slate-50/70'}`} onClick={() => alternarItem(item.codigo)}>
                          <td className="p-2 text-center">
                            <input type="checkbox" checked={marcado} onChange={() => alternarItem(item.codigo)} onClick={e => e.stopPropagation()} className="w-3.5 h-3.5" />
                          </td>
                          <td className="p-2 font-mono text-[11px] text-slate-500">{item.codigo}</td>
                          <td className="p-2">{item.descricao}</td>
                          <td className="p-2 text-right">{item.quantidade}</td>
                          <td className="p-2 text-right">{fmtNumero(item.valorUnitario)}</td>
                          <td className="p-2 text-right font-semibold">{fmtNumero(item.valorTotal)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setAba('acompanhamento')}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button onClick={enviar} disabled={enviando || faltamCampos}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                <PlusCircle className="h-3.5 w-3.5" /> {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
            </>
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          {loadingLista ? (
            <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : solicitacoes.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
              <ClipboardList className="h-6 w-6 text-slate-300" /> Nenhuma solicitação criada ainda.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3">Nº da nota</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3">Cargo responsável</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3">Ação necessária</th>
                  <th className="p-3 text-center">SLA</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {solicitacoes.map(s => {
                  const d = s.dados || {}
                  const tarefa = tarefasAbertas[s.id]
                  const st = STATUS_SOLICITACAO[s.status] || { label: s.status, cls: 'bg-slate-100 text-slate-500' }
                  const sla = s.status === 'em_andamento' ? slaBadge(tarefa?.prazo_em) : null
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold whitespace-nowrap">{d.numero_nf || '—'}</td>
                      <td className="p-3 text-slate-500 whitespace-nowrap">{d.cliente || '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap">{fmtMoeda(d.valor_nf)}</td>
                      <td className="p-3 whitespace-nowrap">{cargosMap[tarefa?.responsavel_agrupamento_cargo_id] || (s.status === 'em_andamento' ? '—' : '')}</td>
                      <td className="p-3 whitespace-nowrap">
                        {s.status !== 'em_andamento' ? '' : tarefa?.responsavel_user_id ? (usuariosMap[tarefa.responsavel_user_id] || '—') : <span className="text-slate-400 italic">Sem responsável</span>}
                      </td>
                      <td className="p-3 whitespace-nowrap">{tarefa?.elemento_nome || '—'}</td>
                      <td className="p-3 text-center">
                        {sla && <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${sla.cls}`}>{sla.label}</span>}
                      </td>
                      <td className="p-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${st.cls}`}>{st.label}</span></td>
                      <td className="p-3 text-center">
                        <Link to={`/bpm/nfe-solicitacoes/${s.id}`}
                          className="inline-flex items-center px-3 py-1.5 rounded-md text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700">
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
