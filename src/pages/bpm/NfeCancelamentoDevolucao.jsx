import React, { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileWarning, Upload, PlusCircle, AlertTriangle, Loader2, ArrowLeft, ClipboardList,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { listarDefinicoesPublicadas, listarInstancias, iniciarInstancia, mapaEtapaAbertaPorInstancia } from '../../services/bpm/bpmService'
import { parseNfeXml, lerArquivoComoTexto } from '../../services/bpm/nfeXmlParser'

const CHAVE_PROCESSO = 'cancelamento-devolucao-nfe'

const TIPOS_ITEM = ['Veículo', 'Peça', 'Acessório', 'Serviço']

const VAZIO = {
  numero_nf: '', tipo_nota: '', cliente: '', data_nf: '', valor_nf: '',
  tipo_item: '', tipo_devolucao: '', motivo: '', dentro_prazo_sefaz: '',
}

const STATUS_INSTANCIA = {
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
  const [aba, setAba] = useState('nova')
  const [definicao, setDefinicao] = useState(null)
  const [definicaoCarregada, setDefinicaoCarregada] = useState(false)
  const [form, setForm] = useState(VAZIO)
  const [importando, setImportando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [avisoImportacao, setAvisoImportacao] = useState(null)

  const [solicitacoes, setSolicitacoes] = useState([])
  const [etapas, setEtapas] = useState({})
  const [loadingLista, setLoadingLista] = useState(true)

  useEffect(() => {
    listarDefinicoesPublicadas()
      .then(defs => setDefinicao(defs.find(d => d.chave === CHAVE_PROCESSO) || null))
      .catch(e => setErro(e.message || String(e)))
      .finally(() => setDefinicaoCarregada(true))
  }, [])

  const carregarSolicitacoes = useCallback(async () => {
    setLoadingLista(true)
    try {
      const todas = await listarInstancias()
      const doProcesso = todas.filter(i => i.bpm_process_definitions?.chave === CHAVE_PROCESSO)
      setSolicitacoes(doProcesso)
      const mapa = await mapaEtapaAbertaPorInstancia(doProcesso.filter(i => i.status === 'em_andamento').map(i => i.id))
      setEtapas(mapa)
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
      const dados = parseNfeXml(texto)
      set(dados)
      setAvisoImportacao('Número, cliente, valor e data importados do XML. Confira e complete o restante abaixo.')
    } catch (e) {
      setErro('Erro ao importar XML: ' + (e.message || String(e)))
    } finally { setImportando(false) }
  }

  const faltamCampos = !form.numero_nf || !form.tipo_nota || !form.cliente || !form.valor_nf
    || !form.tipo_item || !form.tipo_devolucao || !form.motivo.trim() || form.dentro_prazo_sefaz === ''

  const enviar = async () => {
    if (!definicao) return
    setEnviando(true); setErro(null)
    try {
      const dadosIniciais = {
        ...form,
        valor_nf: Number(form.valor_nf),
        dentro_prazo_sefaz: form.dentro_prazo_sefaz === 'true',
      }
      const r = await iniciarInstancia({
        definitionId: definicao.id,
        titulo: `NF ${form.numero_nf} — ${form.cliente}`,
        dadosIniciais,
        userId: user?.id,
      })
      navigate(`/bpm/instancias/${r.instanciaId}`)
    } catch (e) {
      setErro(e.message || String(e))
    } finally { setEnviando(false) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Link to="/bpm/processos" className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-indigo-600" /> Cancelamento e Devolução de NF-e
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Solicite o cancelamento/devolução de uma nota e acompanhe o andamento até a conclusão.</p>
        </div>
      </div>

      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {[['nova', 'Nova Solicitação'], ['acompanhamento', 'Acompanhamento']].map(([key, label]) => (
          <button key={key} onClick={() => setAba(key)}
            className={`px-4 py-2 text-xs font-bold border-b-2 -mb-px transition-colors ${aba === key ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {aba === 'nova' ? (
        !definicaoCarregada ? (
          <div className="p-10 text-center text-xs text-slate-400 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : !definicao ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
            O processo "Cancelamento e Devolução de NF-e" ainda não está publicado no catálogo.
            Abra o <Link to="/bpm/modelador" className="underline font-semibold">Modelador BPMN</Link>, carregue o exemplo do piloto e publique-o antes de criar solicitações.
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">Importar dados da NF-e</p>
                <p className="text-[11px] text-slate-400">Preenche número, cliente, valor e data automaticamente a partir do XML da nota.</p>
              </div>
              <label className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold cursor-pointer ${importando ? 'text-slate-400 bg-slate-100' : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-200'}`}>
                <Upload className="h-3.5 w-3.5" /> {importando ? 'Importando...' : 'Importar XML'}
                <input type="file" accept=".xml" className="hidden" disabled={importando}
                  onChange={e => { importarXml(e.target.files?.[0]); e.target.value = '' }} />
              </label>
            </div>

            {avisoImportacao && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[11px] text-emerald-700 font-semibold">{avisoImportacao}</div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Número da NF-e', <input key="a" value={form.numero_nf} onChange={e => set({ numero_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md" placeholder="ex.: 123456" />],
                    ['Tipo de nota', <select key="b" value={form.tipo_nota} onChange={e => set({ tipo_nota: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                      <option value="">Selecione...</option><option value="venda">Venda</option><option value="compra">Compra</option>
                    </select>],
                    ['Cliente / Fornecedor', <input key="c" value={form.cliente} onChange={e => set({ cliente: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md" />],
                    ['Data da NF-e', <input key="d" type="date" value={form.data_nf} onChange={e => set({ data_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md" />],
                    ['Valor da NF-e (R$)', <input key="e" type="number" step="0.01" value={form.valor_nf} onChange={e => set({ valor_nf: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md" />],
                    ['Tipo', <select key="f" value={form.tipo_item} onChange={e => set({ tipo_item: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                      <option value="">Selecione...</option>{TIPOS_ITEM.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>],
                    ['Devolução', <select key="g" value={form.tipo_devolucao} onChange={e => set({ tipo_devolucao: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                      <option value="">Selecione...</option><option value="total">Total</option><option value="parcial">Parcial</option>
                    </select>],
                    ['Dentro do prazo de cancelamento SEFAZ?', <select key="h" value={form.dentro_prazo_sefaz} onChange={e => set({ dentro_prazo_sefaz: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white">
                      <option value="">Selecione...</option><option value="true">Sim</option><option value="false">Não</option>
                    </select>],
                    ['Motivo', <textarea key="i" rows={3} value={form.motivo} onChange={e => set({ motivo: e.target.value })} className="w-full text-xs p-2 border border-slate-200 rounded-md" />],
                  ].map(([label, campo]) => (
                    <tr key={label} className="align-top">
                      <td className="w-[38%] min-w-[130px] bg-slate-50 px-3 py-2.5 text-[11px] font-bold text-slate-600 border-r border-slate-200">{label} <span className="text-red-500">*</span></td>
                      <td className="px-3 py-2">{campo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button onClick={enviar} disabled={enviando || faltamCampos}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                <PlusCircle className="h-3.5 w-3.5" /> {enviando ? 'Enviando...' : 'Enviar solicitação'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
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
                  <th className="p-3">Nº da NF</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3 text-right">Valor</th>
                  <th className="p-3">Data da NF</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-center">Situação</th>
                  <th className="p-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {solicitacoes.map(s => {
                  const d = s.dados || {}
                  const st = STATUS_INSTANCIA[s.status] || { label: s.status, cls: 'bg-slate-100 text-slate-500' }
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold">{d.numero_nf || '—'}</td>
                      <td className="p-3 text-slate-500">{d.cliente || '—'}</td>
                      <td className="p-3 text-right">{fmtMoeda(d.valor_nf)}</td>
                      <td className="p-3 text-slate-500">{fmtData(d.data_nf)}</td>
                      <td className="p-3 text-slate-500">{d.tipo_item || '—'}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${st.cls}`}>{st.label}</span>
                        {s.status === 'em_andamento' && etapas[s.id] && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">{etapas[s.id]}</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <Link to={`/bpm/instancias/${s.id}`} className="text-indigo-600 hover:underline text-[11px] font-bold">Abrir</Link>
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
