import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Save, ArrowLeft,
  Building2, Wrench, BarChart2, XCircle, History, Lock,
  Search, CheckCircle, AlertCircle, Loader2, Eye,
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import GarantiasNav from './GarantiasNav'
import TituloObservacoesPanel from './TituloObservacoesPanel'

const STATUS_OPTIONS = [
  { value: 'A',  label: 'A — Em Análise no Setor de Garantia' },
  { value: 'B',  label: 'B — Em processo de consideração' },
  { value: 'C',  label: 'C — Processo Fora de Garantia (aceita)' },
  { value: 'E',  label: 'E — Nota Fiscal Emitida' },
  { value: 'G',  label: 'G — Reivindicação apresentada' },
  { value: 'M',  label: 'M — Reivindicação para aprovação por matriz' },
  { value: 'N',  label: 'N — Para análise da Subsidiária da DAF' },
  { value: 'P',  label: 'P — Enviada para ASI' },
  { value: 'Q',  label: 'Q — Processo Avaliado, aguardando material (peças)' },
  { value: 'R',  label: 'R — Para avaliação da subsidiária da DAF' },
  { value: 'S',  label: 'S — Processo selecionado' },
  { value: 'T',  label: 'T — Para análise do escritório da DAF' },
  { value: 'U',  label: 'U — Processo em fase de crédito para a concessionária' },
  { value: 'V',  label: 'V — Valor de reembolso calculado' },
  { value: 'W',  label: 'W — Processo aguardando material ou informação' },
  { value: 'X',  label: 'X — Pronta para análise do escritório da DAF' },
  { value: 'Y',  label: 'Y — Processo em fase de crédito para a concessionária' },
  { value: 'F',  label: 'F — Enviado para Fábrica' },
  { value: 'FA', label: 'F — Liberado para o Financeiro - APROVADO' },
  { value: 'FR', label: 'F — Liberado para o Financeiro - RECUSADO' },
  { value: 'Z',  label: 'Z — Processo recusado (automático)' },
]

// Traduz código de status para label legível no histórico
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]))

const ACOES_TOMADAS = [
  'Débito Interno - Serviços',
  'Débito Interno - Comercial',
  'Recurso junto à DAF',
]

const MOTIVOS_RECUSA_FR = [
  'Falha no Diagnóstico',
  'Falha Preenchimento Diagnóstico',
  'Falta de Evidências',
  'Falta envio da nota fiscal a DAF',
  'Falta Envio Doc/Doc Incompletos',
  'Fora do Cronograma',
  'Inconsistencia na documentação',
  'OS Rasurada',
  'Peça não enviada para análise',
  'Perdeu Prazo Digitação',
  'Reparo Realizado sem Autorização',
  'Serviço realizado em Duplicidade',
  'TMO Incorreto',
  'Veiculo',
  'Veiculo com Contrato vencido',
  'Veiculo Sem Contrato',
]

const FORM_VAZIO = {
  empresa_id: '', empresa_nome: '',
  cliente: '',
  consultor_id: '', consultor_nome: '',
  tipo_garantia_id: '', tipo_garantia_descricao: '',
  numero_os: '', chassi: '', numero_sg: '', data_sg: '', numero_sg_reapresentacao: '', data_abertura_os: '',
  fechado: false, data_fechamento_os: '',
  valor_pecas: '', valor_servicos: '',
  data_lancamento: '', status_codigo: 'A',
  sg_reapresentada: '', data_reapresentacao: '', resposta_shc: '', data_final_avaliacao: '',
  numero_nf: '',
  data_emissao_nf: '', data_envio_fabrica: '',
  numero_titulo: '', titulo_observacao: '',
  nf_valor_produto: '', nf_valor_servico: '', nf_margem_contabil: '',
  previsao_pagamento: '', aceite_fabrica: '', data_ultima_verificacao: '',
  data_recusa: '', motivo_recusa_id: '', motivo_recusa_descricao: '', acao_tomada: '', plano_acao: '',
  nf_peca_numero: '', nf_peca_data: '', observacoes: '',
}

const ETAPAS = [
  { id: 1, label: 'Abertura',    icon: Building2 },
  { id: 2, label: 'Análise',     icon: Wrench },
  { id: 3, label: 'Faturamento', icon: BarChart2 },
  { id: 5, label: 'Recusado',    icon: XCircle },
]

const diffDias = (a, b) => {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000))
}

// Formata qualquer valor de data (ISO, timestamp, YYYY-MM-DD) para DD/MM/YYYY
const fmtDate = (val) => {
  if (!val) return ''
  const s = String(val).slice(0, 10)         // pega só YYYY-MM-DD
  try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch { return s }
}

const LabelField = ({ children, required, locked }) => (
  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    {locked && <Lock className="h-2.5 w-2.5 text-slate-300 ml-0.5" />}
  </label>
)

const ReadOnlyField = ({ value, placeholder = '—' }) => (
  <div className="w-full text-xs p-2 border border-slate-100 rounded-md bg-slate-50 font-medium text-slate-600 min-h-[30px] select-none">
    {value || <span className="text-slate-300">{placeholder}</span>}
  </div>
)

const InputField = (props) => (
  <input
    {...props}
    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
  />
)

const SelectField = ({ children, ...props }) => (
  <select
    {...props}
    className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
  >
    {children}
  </select>
)

function LogHistorico({ log, logAberto, setLogAberto }) {
  const grupos = useMemo(() => {
    const map = new Map()
    for (const entry of log) {
      const key = entry.alterado_em
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(entry)
    }
    return Array.from(map.entries())
  }, [log])

  const fmtValor = (entry, campo) =>
    campo === 'status_codigo' ? (STATUS_LABEL[entry] ?? entry) : entry

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={() => setLogAberto(v => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 hover:bg-slate-50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700">Histórico de Alterações</h3>
          <span className="text-[11px] text-slate-400 font-normal">{log.length} {log.length === 1 ? 'registro' : 'registros'}</span>
        </div>
        {logAberto ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {logAberto && (
        <>
          <div className="grid grid-cols-[180px_160px_1fr_240px] border-t border-b border-slate-100 px-4 py-2 bg-slate-50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data / Hora</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Campo</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alteração</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuário</span>
          </div>
          <div className="divide-y divide-slate-100">
            {grupos.map(([ts, entries]) => (
              <div key={ts} className="flex hover:bg-slate-50/60 transition-colors">
                {/* Data/hora — aparece uma vez para o grupo */}
                <div className="w-[180px] shrink-0 px-4 py-3 text-xs text-slate-500 font-mono">
                  {new Date(ts).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
                {/* Campos do grupo */}
                <div className="flex-1 divide-y divide-slate-50">
                  {entries.map((entry, i) => (
                    <div key={entry.id} className="flex items-center text-xs py-3 pr-4">
                      <div className="w-[160px] shrink-0 font-semibold text-slate-800 pr-4">{entry.campo}</div>
                      <div className="flex-1 text-slate-600 pr-4 flex items-center flex-wrap gap-1">
                        {entry.valor_antes && (
                          <>
                            <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-mono break-all">
                              {fmtValor(entry.valor_antes, entry.campo)}
                            </span>
                            <span className="text-slate-300">→</span>
                          </>
                        )}
                        {entry.valor_depois && (
                          <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-mono break-all">
                            {fmtValor(entry.valor_depois, entry.campo)}
                          </span>
                        )}
                      </div>
                      {/* Usuário só na primeira linha do grupo */}
                      <div className="w-[240px] shrink-0 text-slate-400 truncate text-[11px]" title={entry.alterado_por}>
                        {i === 0 ? entry.alterado_por : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function GarantiasDafForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, hasActionOrDefault } = useAuth()
  const modoEdicao = Boolean(id)
  const modoVisualizar = location.state?.modo === 'visualizar'
  const canEditarOS = hasActionOrDefault('garantias-daf', 'editar')
  const voltarPara = location.state?.from || '/garantias-daf'

  const [etapa, setEtapa] = useState(() => {
    if (id) return 1
    try {
      const s = localStorage.getItem('daf_novo_etapa')
      if (s) return Math.max(1, parseInt(s, 10))
    } catch {}
    return 1
  })
  const [form, setForm] = useState(() => {
    if (id) return FORM_VAZIO
    try {
      const s = localStorage.getItem('daf_novo_form')
      if (s) return { ...FORM_VAZIO, ...JSON.parse(s) }
    } catch {}
    return FORM_VAZIO
  })
  const [statusAnterior, setStatusAnterior] = useState(null)
  const [wCamposOriginais, setWCamposOriginais] = useState({ nf_peca_numero: '', nf_peca_data: '', observacoes: '' })
  const [empresas, setEmpresas] = useState([])
  const [tiposOS, setTiposOS] = useState([])
  const [funcionarios, setFuncionarios] = useState([])
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState(null)
  const [buscandoFaturamento, setBuscandoFaturamento] = useState(false)
  const [resultadoFaturamento, setResultadoFaturamento] = useState(null) // null | 'found' | {type:'not_found', siglas:[]} | 'error'
  const [nfList, setNfList] = useState([]) // [{numero, data_faturamento}]
  const [zerandoSG, setZerandoSG] = useState(false)
  const [logAberto, setLogAberto] = useState(false)
  const [tituloEncontrado, setTituloEncontrado] = useState(null) // título a receber (RFN003) localizado por OS + Nota Fiscal
  const [titulosObs, setTitulosObs] = useState([]) // histórico de observações (gar_titulos_observacoes)
  const loadTitulosObs = () => apiService.getTitulosObservacoes().then(setTitulosObs).catch(() => {})

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [emps, tipos, funcs] = await Promise.all([
          apiService.getEmpresas(),
          apiService.getTiposOS(),
          apiService.getFuncionarios(),
        ])
        setEmpresas(emps)
        setTiposOS(tipos.filter(t => t.ativo))
        setFuncionarios(funcs.filter(f => f.ativo !== false && f.cargo_nome === 'Consultor de Serviços'))
        loadTitulosObs()

        if (modoEdicao) {
          const [garantia, logData] = await Promise.all([
            apiService.getGarantiaById(id),
            apiService.getGarantiaLog(id),
          ])

          setStatusAnterior(garantia.status_codigo)
          setWCamposOriginais({
            nf_peca_numero: garantia.nf_peca_numero || '',
            nf_peca_data:   garantia.nf_peca_data   || '',
            observacoes:    garantia.observacoes     || '',
          })
          setLog(logData)

          // Sempre carrega do banco — o PermissionRoute já impede desmontagem por troca de aba
          const statusInicial =
            garantia.numero_sg?.trim() && garantia.status_codigo === 'A'
              ? 'G'
              : garantia.status_codigo

          setForm({
            ...FORM_VAZIO,
            ...garantia,
            valor_pecas:    garantia.valor_pecas    ?? '',
            valor_servicos: garantia.valor_servicos ?? '',
            status_codigo:  statusInicial,
          })
          if (garantia.nf_lista_json) {
            try { setNfList(JSON.parse(garantia.nf_lista_json)) } catch {}
          } else if (garantia.numero_nf) {
            const nums = garantia.numero_nf.split('/').map(n => n.trim()).filter(Boolean)
            setNfList(nums.map(numero => ({ numero, data_faturamento: garantia.data_emissao_nf || null })))
          }
          if (['FA', 'E', 'F'].includes(statusInicial)) setEtapa(3)
          else if (statusInicial === 'FR') setEtapa(5)
          else if (garantia.numero_sg?.trim()) setEtapa(2)
        }
      } catch (err) { setError(err.message || String(err)) }
      finally { setLoading(false) }
    }
    init()
  }, [id])

  useEffect(() => {
    if (modoEdicao || loading) return
    try { localStorage.setItem('daf_novo_form', JSON.stringify(form)) } catch {}
  }, [form, modoEdicao, loading])

  useEffect(() => {
    if (modoEdicao || loading) return
    try { localStorage.setItem('daf_novo_etapa', String(etapa)) } catch {}
  }, [etapa, modoEdicao, loading])

  // Localiza automaticamente o título a receber (RFN003) desta OS/NF, para exibir
  // Nº Título, Nº Lançamento e Data de Vencimento na aba Faturamento.
  useEffect(() => {
    const osKey = form.numero_os?.trim()
    if (!osKey) { setTituloEncontrado(null); return }
    const nfNums = nfList.length > 0
      ? nfList.map(n => String(n.numero || '').trim()).filter(Boolean)
      : (form.numero_nf ? form.numero_nf.split('/').map(s => s.trim()).filter(Boolean) : [])

    let cancelado = false
    fetch(`${BACKEND_URL}/api/garantias/financeiro/titulos`)
      .then(r => r.ok ? r.json() : { rows: [] })
      .then(data => {
        if (cancelado) return
        const rows = data.rows ?? []
        const match = rows.find(t =>
          String(t.os_numero ?? '').trim() === osKey &&
          (nfNums.length === 0 || nfNums.includes(String(t.nota_fiscal ?? '').trim()))
        )
        setTituloEncontrado(match || null)
      })
      .catch(() => { if (!cancelado) setTituloEncontrado(null) })
    return () => { cancelado = true }
  }, [form.numero_os, form.numero_nf, nfList])

  const handleChange = (e) => {
    if (modoVisualizar) return
    const { name, value, type, checked } = e.target
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: checked }))
      return
    }
    if (name === 'empresa_id') {
      const emp = empresas.find(e => e.id === value)
      setForm(prev => ({ ...prev, empresa_id: value, empresa_nome: emp?.empresa_fantasia || emp?.nome_empresa || '' }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleBuscarFaturamento = async () => {
    if (modoVisualizar) return
    if (!form.numero_os?.trim()) {
      alert('Número da OS não informado.')
      return
    }
    // Prioriza a sigla embutida na própria descrição ("G03 - PLANO..." → "G03"): garante
    // que a busca use o tipo real desta OS, mesmo que tipo_os_sigla esteja desatualizado
    // (ex: OS com múltiplas linhas/tipos no ROF001 pode ter sido sincronizada com sigla errada).
    const candidatoDesc = (form.tipo_garantia_descricao?.trim() || '').split(' ')[0].toUpperCase()
    const siglaDaDescricao = /^[A-Z]\d{2,3}$/.test(candidatoDesc) ? candidatoDesc : ''
    const sigla = (siglaDaDescricao || form.tipo_os_sigla?.trim() || '').toUpperCase()
    if (!sigla) {
      alert('Tipo de OS não informado. Preencha o tipo antes de buscar.')
      return
    }
    setBuscandoFaturamento(true)
    setResultadoFaturamento(null)
    // Limpa dados de NF anteriores antes de buscar
    setNfList([])
    setForm(prev => ({
      ...prev,
      numero_nf: '', data_emissao_nf: '',
      nf_valor_produto: '', nf_valor_servico: '', nf_margem_contabil: '',
    }))
    try {
      const params = new URLSearchParams()
      params.set('tipoSigla', sigla)
      if (form.tipo_garantia_descricao?.trim()) params.set('tipoOS', form.tipo_garantia_descricao.trim())
      const res = await fetch(`${BACKEND_URL}/api/garantias/faturamento/${encodeURIComponent(form.numero_os.trim())}?${params}`)
      if (res.status === 404) {
        const body = await res.json().catch(() => ({}))
        setResultadoFaturamento({ type: 'not_found', siglas: body.siglas_disponiveis || [] })
        return
      }
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()

      // Popula nfList — novo formato: notas_fiscais array; fallback: nf_numeros string (formato antigo)
      if (data.notas_fiscais?.length) {
        setNfList(data.notas_fiscais)
      } else if (data.nf_numeros) {
        const nums = String(data.nf_numeros).split('/').map(n => n.trim()).filter(Boolean)
        setNfList(nums.map(numero => ({ numero, data_faturamento: data.nf_data_emissao || null })))
      }

      setForm(prev => ({
        ...prev,
        tipo_os_sigla:      prev.tipo_os_sigla?.trim() ? prev.tipo_os_sigla : sigla,
        numero_nf:          data.nf_numeros      || '',
        data_emissao_nf:    data.nf_data_emissao  || '',
        nf_valor_produto:   data.nf_valor_produto  ?? '',
        nf_valor_servico:   data.nf_valor_servico  ?? '',
        nf_margem_contabil: data.nf_margem_contabil ?? '',
      }))
      setResultadoFaturamento('found')
    } catch (err) {
      console.error('[Faturamento]', err)
      setResultadoFaturamento('error')
    } finally {
      setBuscandoFaturamento(false)
    }
  }

  const handleZerarSG = async () => {
    if (!modoEdicao || modoVisualizar) return
    setZerandoSG(true)
    try {
      await apiService.updateGarantia(id, { numero_sg: null, data_sg: null }, user?.email, statusAnterior)
      setForm(prev => ({ ...prev, numero_sg: '', data_sg: '' }))
    } catch (err) {
      alert('Erro ao zerar SG: ' + (err.message || String(err)))
    } finally {
      setZerandoSG(false)
    }
  }

  const handleSalvar = async () => {
    if (modoVisualizar) return
    if (!form.numero_os) { alert('Informe o Número da OS.'); return }

    // Nº SG e Data SG obrigatórios
    if (!form.numero_sg?.trim()) {
      alert('Preencha o Nº SG (Solicitação de Garantia) antes de salvar.')
      setEtapa(modoEdicao ? 2 : 1)
      return
    }
    if (!form.data_sg?.trim()) {
      alert('Preencha a Data SG antes de salvar.')
      setEtapa(modoEdicao ? 2 : 1)
      return
    }

    // Campos obrigatórios quando status FR — Recusado
    if (form.status_codigo === 'FR') {
      if (!form.motivo_recusa_descricao?.trim()) {
        alert('Status RECUSADO: preencha o campo Motivo da Recusa antes de salvar.')
        setEtapa(2)
        return
      }
      if (!form.data_final_avaliacao?.trim()) {
        alert('Status RECUSADO: preencha a Data Final Avaliação antes de salvar.')
        setEtapa(2)
        return
      }
      if (!form.resposta_shc?.trim()) {
        alert('Status RECUSADO: preencha o campo Resposta SHC antes de salvar.')
        setEtapa(2)
        return
      }
      if (!form.acao_tomada?.trim()) {
        alert('Status RECUSADO: selecione a Ação Tomada antes de salvar.')
        setEtapa(5)
        return
      }
      if (!form.data_recusa?.trim()) {
        alert('Status RECUSADO: preencha a Data da Ação Tomada antes de salvar.')
        setEtapa(5)
        return
      }
      if (!form.plano_acao?.trim()) {
        alert('Status RECUSADO: preencha o Plano de Ação antes de salvar.')
        setEtapa(5)
        return
      }
    }

    setSalvando(true)
    try {
      // Avança automaticamente (FR e Z nunca são sobrescritos):
      // • NF + data envio fábrica preenchidos → F — Enviado para Fábrica
      // • NF + data emissão preenchidos (sem envio fábrica) → E — Nota Fiscal Emitida
      // • Ainda em A (sem NF) → G — Reivindicação apresentada
      const STATUSES_PROTEGIDOS = ['FR', 'Z']
      const temNF          = form.numero_nf?.trim() && form.data_emissao_nf?.trim()
      const temEnvioFabrica = form.data_envio_fabrica?.trim()
      const novoStatus = STATUSES_PROTEGIDOS.includes(form.status_codigo)
        ? form.status_codigo
        : temNF && temEnvioFabrica
          ? 'F'
          : temNF
            ? 'E'
            : form.status_codigo === 'A'
              ? 'G'
              : form.status_codigo

      const nullIfEmpty = (v) => (v === '' || v === undefined ? null : v)
      const parseNumeric = (v) => { const n = parseFloat(v); return isNaN(n) ? null : n }
      // Remove campos que não existem no banco (legado / removidos)
      const { numero_nf_servicos: _removed, ...formLimpo } = form
      const payload = {
        ...formLimpo,
        valor_pecas:            parseFloat(form.valor_pecas)    || 0,
        valor_servicos:         parseFloat(form.valor_servicos) || 0,
        nf_valor_produto:       parseNumeric(form.nf_valor_produto),
        nf_valor_servico:       parseNumeric(form.nf_valor_servico),
        nf_margem_contabil:     parseNumeric(form.nf_margem_contabil),
        nf_lista_json:          nfList.length > 0 ? JSON.stringify(nfList) : null,
        status_codigo:          novoStatus,
        // UUID fields — string vazia vira null
        empresa_id:             nullIfEmpty(form.empresa_id),
        consultor_id:           nullIfEmpty(form.consultor_id),
        tipo_garantia_id:       nullIfEmpty(form.tipo_garantia_id),
        motivo_recusa_id:       nullIfEmpty(form.motivo_recusa_id),
        // Date fields — string vazia vira null
        data_abertura_os:       nullIfEmpty(form.data_abertura_os),
        data_fechamento_os:     nullIfEmpty(form.data_fechamento_os),
        data_sg:                nullIfEmpty(form.data_sg),
        data_lancamento:        nullIfEmpty(form.data_lancamento),
        data_reapresentacao:    nullIfEmpty(form.data_reapresentacao),
        data_final_avaliacao:   nullIfEmpty(form.data_final_avaliacao),
        data_emissao_nf:        nullIfEmpty(form.data_emissao_nf),
        data_envio_fabrica:     nullIfEmpty(form.data_envio_fabrica),
        previsao_pagamento:     nullIfEmpty(form.previsao_pagamento),
        data_ultima_verificacao: nullIfEmpty(form.data_ultima_verificacao),
        data_recusa:            nullIfEmpty(form.data_recusa),
        nf_peca_data:           nullIfEmpty(form.nf_peca_data),
      }
      if (modoEdicao) {
        await apiService.updateGarantia(id, payload, user?.email, statusAnterior, wCamposOriginais)
        navigate(voltarPara)
      } else {
        const nova = await apiService.createGarantia(payload, user?.email)
        try { localStorage.removeItem('daf_novo_form') } catch {}
        try { localStorage.removeItem('daf_novo_etapa') } catch {}
        navigate(`/garantias-daf/${nova.id}`)
      }
    } catch (err) { alert('Erro ao salvar: ' + (err.message || String(err))) }
    finally { setSalvando(false) }
  }

  const delta1 = diffDias(form.data_abertura_os, form.data_lancamento)
  const delta2 = diffDias(form.data_emissao_nf, form.data_envio_fabrica)
  const valorTotal = (parseFloat(form.valor_pecas) || 0) + (parseFloat(form.valor_servicos) || 0)
  const mostrarRecusa = form.status_codigo === 'FR'
  // Sigla exibida sempre derivada da própria descrição ("G03 - PLANO..." → "G03"), garantindo
  // que bata com "OS / Tipo de OS" mesmo se tipo_os_sigla estiver desatualizado no banco.
  const candidatoSiglaDesc = (form.tipo_garantia_descricao?.trim() || '').split(' ')[0].toUpperCase()
  const siglaExibida = /^[A-Z]\d{2,3}$/.test(candidatoSiglaDesc) ? candidatoSiglaDesc : (form.tipo_os_sigla?.trim() || '')

  if (loading) return <div className="p-6 text-xs text-slate-400">Carregando...</div>
  if (error) return <div className="p-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded">{error}</div>

  return (
    <div className="p-6 max-w-5xl space-y-5">

      {/* CABEÇALHO */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={() => navigate(voltarPara)} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {modoEdicao ? `Editar Garantia — OS ${form.numero_os}` : 'Nova Garantia DAF'}
            {modoVisualizar && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <Eye className="h-3 w-3" /> Modo visualização
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500">
            {modoVisualizar ? 'Somente leitura — nenhuma alteração será salva.' : 'Preencha as etapas conforme o avanço do processo.'}
          </p>
          <div className="mt-3"><GarantiasNav /></div>
        </div>
      </div>

      {/* STEPPER */}
      <div className="flex items-center gap-0">
        {ETAPAS.map((e, idx) => {
          const ativo = etapa === e.id
          const concluido = etapa > e.id
          const visivel = e.id !== 5 || mostrarRecusa
          if (!visivel) return null
          return (
            <React.Fragment key={e.id}>
              <button
                onClick={() => setEtapa(e.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${ativo ? 'bg-blue-600 text-white shadow-sm' : concluido ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <e.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{e.label}</span>
              </button>
              {idx < ETAPAS.length - 1 && visivel && (
                <div className="h-px flex-1 bg-slate-200 mx-1" />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* CORPO DO FORMULÁRIO */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">

        {/* ── ETAPA 1: ABERTURA ── */}
        {etapa === 1 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">1 — Abertura e Entrada</p>
              {modoEdicao && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                  <Lock className="h-3 w-3" /> Dados importados — somente Nº SG e Data SG editáveis
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5">

              {/* Empresa + Data Criação */}
              <div className="flex flex-col gap-1 col-span-2">
                <LabelField locked={modoEdicao}>Empresa</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.empresa_nome} />
                  : <SelectField name="empresa_id" value={form.empresa_id} onChange={handleChange}>
                      <option value="">Selecione</option>
                      {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
                    </SelectField>
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Data de Criação</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={fmtDate(form.data_abertura_os)} />
                  : <InputField type="date" name="data_abertura_os" value={form.data_abertura_os} onChange={handleChange} />
                }
              </div>

              {/* Data Fechado */}
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Data Fechado</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.data_fechamento_os ? fmtDate(form.data_fechamento_os) : ''} placeholder="Aberto" />
                  : <InputField type="date" name="data_fechamento_os" value={form.data_fechamento_os || ''} onChange={handleChange} />
                }
              </div>

              {/* Nº OS + Tipo OS + Consultor */}
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao} required={!modoEdicao}>OS / Número</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.numero_os} />
                  : <InputField type="text" name="numero_os" value={form.numero_os} onChange={handleChange} placeholder="Ex: 123456" />
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>OS / Tipo de OS</LabelField>
                {modoEdicao
                  ? (
                    <div className="flex items-center gap-2">
                      <ReadOnlyField value={form.tipo_garantia_descricao} />
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Sigla</span>
                        {siglaExibida
                          ? <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[11px] font-bold font-mono">{siglaExibida}</span>
                          : <span className="px-2 py-1 bg-red-50 text-red-400 rounded text-[10px] font-semibold border border-red-100">—</span>
                        }
                      </div>
                    </div>
                  )
                  : <SelectField name="tipo_garantia_descricao" value={form.tipo_garantia_descricao} onChange={handleChange}>
                      <option value="">Selecione</option>
                      {tiposOS.map(t => (
                        <option key={t.id} value={t.tipo_os}>{t.tipo_os}</option>
                      ))}
                    </SelectField>
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Consultor Nome</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.consultor_nome} />
                  : <SelectField name="consultor_nome" value={form.consultor_nome} onChange={handleChange}>
                      <option value="">Selecione</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.nome_funcionario}>{f.nome_funcionario}</option>
                      ))}
                    </SelectField>
                }
              </div>

              {/* Proprietário + Chassi */}
              <div className="flex flex-col gap-1 col-span-2">
                <LabelField locked={modoEdicao}>Proprietário do Veículo</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.cliente} />
                  : <InputField type="text" name="cliente" value={form.cliente} onChange={handleChange} placeholder="Nome do proprietário" />
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Nº Chassi</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={form.chassi} />
                  : <InputField type="text" name="chassi" value={form.chassi} onChange={handleChange} placeholder="Ex: 9BM..." />
                }
              </div>

              {/* Valores */}
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Valor Peças (R$)</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={Number(form.valor_pecas || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  : <InputField type="number" step="0.01" min="0" name="valor_pecas" value={form.valor_pecas} onChange={handleChange} placeholder="0,00" />
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={modoEdicao}>Valor Serviços (R$)</LabelField>
                {modoEdicao
                  ? <ReadOnlyField value={Number(form.valor_servicos || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
                  : <InputField type="number" step="0.01" min="0" name="valor_servicos" value={form.valor_servicos} onChange={handleChange} placeholder="0,00" />
                }
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked>Total (calculado)</LabelField>
                <div className="w-full text-xs p-2 border border-slate-100 rounded-md bg-slate-50 font-bold text-blue-700">
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>

              {/* Separador SG */}
              <div className="col-span-3 border-t border-dashed border-blue-100 pt-2 mt-1 flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Solicitação de Garantia</span>
                {modoEdicao && (form.numero_sg || form.data_sg) && (
                  <button
                    type="button"
                    onClick={handleZerarSG}
                    disabled={zerandoSG || modoVisualizar}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {zerandoSG ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                    Zerar Nº SG e Data SG
                  </button>
                )}
              </div>

              {/* Nº SG + Data SG — sempre editáveis */}
              <div className="flex flex-col gap-1">
                <LabelField required>Nº SG (Solicitação de Garantia)</LabelField>
                <InputField type="text" name="numero_sg" value={form.numero_sg} onChange={handleChange} placeholder="Código SG" />
              </div>
              <div className="flex flex-col gap-1">
                <LabelField required>Data SG</LabelField>
                <InputField type="date" name="data_sg" value={form.data_sg || ''} onChange={handleChange} />
              </div>

            </div>
          </div>
        )}

        {/* ── ETAPA 2: ANÁLISE ── */}
        {etapa === 2 && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">2 — Processamento e Análise</p>
              <div className="flex items-center gap-5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sg_reapresentada_toggle"
                    checked={form.sg_reapresentada !== 'S'}
                    onChange={() => setForm(f => ({ ...f, sg_reapresentada: '', data_reapresentacao: '' }))}
                    disabled={modoVisualizar}
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-slate-600">Nova Garantia</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="sg_reapresentada_toggle"
                    checked={form.sg_reapresentada === 'S'}
                    onChange={() => setForm(f => ({ ...f, sg_reapresentada: 'S', status_codigo: 'G' }))}
                    disabled={modoVisualizar}
                    className="accent-blue-600 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] font-medium text-slate-600">Garantia Reapresentada</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3.5">

              {/* Linha SG — layout muda conforme Nova/Reapresentada */}
              {form.sg_reapresentada === 'S' ? (
                <>
                  {/* Reapresentação: novos campos + status auto G */}
                  <div className="flex flex-col gap-1">
                    <LabelField>Nº SG (Reapresentação)</LabelField>
                    <InputField type="text" name="numero_sg_reapresentacao" value={form.numero_sg_reapresentacao || ''} onChange={handleChange} placeholder="Código SG da reapresentação" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelField>Data de Reapresentação</LabelField>
                    <InputField type="date" name="data_reapresentacao" value={form.data_reapresentacao || ''} onChange={handleChange} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelField required>Status Atual</LabelField>
                    <SelectField name="status_codigo" value={form.status_codigo} onChange={handleChange}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </SelectField>
                  </div>
                  {/* SG original — somente leitura */}
                  <div className="flex flex-col gap-1">
                    <LabelField locked>Nº SG (Solicitação de Garantia)</LabelField>
                    <ReadOnlyField value={form.numero_sg} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelField locked>Data SG</LabelField>
                    <ReadOnlyField value={fmtDate(form.data_sg)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelField locked>Data Final Avaliação (SG anterior)</LabelField>
                    <ReadOnlyField value={fmtDate(form.data_final_avaliacao)} />
                  </div>
                </>
              ) : (
                <>
                  {/* Nova Garantia: campos editáveis originais */}
                  <div className="flex flex-col gap-1">
                    <LabelField>Nº SG (Solicitação de Garantia)</LabelField>
                    <InputField type="text" name="numero_sg" value={form.numero_sg} onChange={handleChange} placeholder="Código SG" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <LabelField>Data SG</LabelField>
                      {(form.numero_sg || form.data_sg) && (
                        <button
                          type="button"
                          onClick={handleZerarSG}
                          disabled={zerandoSG}
                          className="flex items-center gap-1 text-[10px] font-semibold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                        >
                          {zerandoSG ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                          Zerar SG
                        </button>
                      )}
                    </div>
                    <InputField type="date" name="data_sg" value={form.data_sg || ''} onChange={handleChange} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <LabelField required>Status Atual</LabelField>
                    <SelectField name="status_codigo" value={form.status_codigo} onChange={handleChange}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </SelectField>
                  </div>
                </>
              )}

              {/* Referências travadas — Tipo OS, Chassi */}
              <div className="flex flex-col gap-1">
                <LabelField locked>OS / Tipo de OS</LabelField>
                <ReadOnlyField value={form.tipo_garantia_descricao} />
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked>Nº Chassi</LabelField>
                <ReadOnlyField value={form.chassi} />
              </div>
              {/* coluna vazia para fechar a linha de 3 */}
              <div />

              {/* Datas — Data Criação, Data Fechado, Data Final Avaliação, Data Reapresentação */}
              <div className="flex flex-col gap-1">
                <LabelField locked>Data de Criação</LabelField>
                <ReadOnlyField value={fmtDate(form.data_abertura_os)} />
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked>Data Fechado</LabelField>
                <ReadOnlyField value={form.data_fechamento_os ? fmtDate(form.data_fechamento_os) : ''} placeholder="Aberto" />
              </div>
              <div className="flex flex-col gap-1">
                <LabelField locked={!['FA','FR','Z'].includes(form.status_codigo)}>
                  Data Final Avaliação
                  {!['FA','FR','Z'].includes(form.status_codigo) && (
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400 normal-case">(disponível em F — Aprovado/Recusado/Z)</span>
                  )}
                </LabelField>
                {['FA','FR','Z'].includes(form.status_codigo)
                  ? <InputField type="date" name="data_final_avaliacao" value={form.data_final_avaliacao || ''} onChange={handleChange} />
                  : <div className="w-full text-xs p-2 border border-slate-100 rounded-md bg-slate-50 text-slate-300 select-none cursor-not-allowed">—</div>
                }
              </div>
              {/* Campos específicos do status W — Aguardando material ou informação */}
              {form.status_codigo === 'W' && (
                <div className="col-span-3 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    Aguardando Material / Informação
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    <div className="flex flex-col gap-1">
                      <LabelField>Nº da NF de Envio de Peça</LabelField>
                      <InputField
                        type="text"
                        name="nf_peca_numero"
                        value={form.nf_peca_numero || ''}
                        onChange={handleChange}
                        placeholder="Número da nota fiscal"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <LabelField>Data da NF de Envio de Peça/Informação</LabelField>
                      <InputField
                        type="date"
                        name="nf_peca_data"
                        value={form.nf_peca_data || ''}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <LabelField>Informações</LabelField>
                      <textarea
                        name="observacoes"
                        value={form.observacoes || ''}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Informações sobre o material ou informação aguardada..."
                        className="w-full text-xs p-2 border border-amber-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 outline-none resize-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Motivo da Recusa — visível apenas quando FR */}
              {form.status_codigo === 'FR' && (
                <div className="flex flex-col gap-1 col-span-3">
                  <LabelField>Motivo da Recusa</LabelField>
                  <SelectField
                    name="motivo_recusa_descricao"
                    value={form.motivo_recusa_descricao || ''}
                    onChange={handleChange}
                  >
                    <option value="">Selecione o motivo</option>
                    {MOTIVOS_RECUSA_FR.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </SelectField>
                </div>
              )}

              {/* Linha 3: Resposta SHC — campo largo */}
              <div className="flex flex-col gap-1 col-span-3">
                <LabelField>Resposta SHC</LabelField>
                <textarea
                  name="resposta_shc"
                  value={form.resposta_shc || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Resposta do SHC..."
                  className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none resize-none"
                />
              </div>

            </div>
          </div>
        )}

        {/* ── ETAPA 3: FATURAMENTO ── */}
        {etapa === 3 && (
          <div className="p-5 space-y-4">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">3 — Faturamento</p>
              </div>
              <div className="flex items-center gap-2">
                {nfList.length > 0 && !buscandoFaturamento && (
                  <button
                    type="button"
                    onClick={() => {
                      setNfList([])
                      setResultadoFaturamento(null)
                      setForm(prev => ({ ...prev, numero_nf: '', data_emissao_nf: '', nf_valor_produto: '', nf_valor_servico: '', nf_margem_contabil: '' }))
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Limpar NFs
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBuscarFaturamento}
                  disabled={buscandoFaturamento || modoVisualizar}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-60"
                >
                  {buscandoFaturamento
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...</>
                    : <><Search className="h-3.5 w-3.5" /> Buscar Faturamento</>
                  }
                </button>
              </div>
            </div>

            {/* Banners de resultado */}
            {resultadoFaturamento === 'found' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 font-semibold">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                Dados de faturamento encontrados no ROF017 e preenchidos automaticamente.
              </div>
            )}
            {resultadoFaturamento?.type === 'not_found' && (
              <div className="flex flex-col gap-1 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Tipo OS <span className="font-mono">{siglaExibida || '—'}</span> não encontrado para OS {form.numero_os} no ROF017.
                </div>
                {resultadoFaturamento.siglas?.length > 0 && (
                  <div className="pl-5 text-amber-600">
                    Tipos disponíveis para esta OS: <span className="font-mono font-bold">{resultadoFaturamento.siglas.join(' | ')}</span>
                  </div>
                )}
              </div>
            )}
            {resultadoFaturamento === 'error' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-semibold">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Erro ao consultar o SharePoint. Verifique a conexão e tente novamente.
              </div>
            )}

            {/* Layout principal: NFs + Envio Fábrica lado a lado */}
            <div className="space-y-4">
            <div className="flex gap-4 items-start">

              {/* Notas Fiscais */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Notas Fiscais Emitidas</span>
                  {nfList.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold">{nfList.length} NF{nfList.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  {(() => {
                    const temFinanceiro = nfList.some(n => n.prod_valor || n.serv_valor)
                    const fmtR = v => v != null && Number(v) !== 0 ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'
                    const getTipoDoc = (nf) => {
                      if (nf.prod_valor != null && Number(nf.prod_valor) !== 0) return 'DANFE'
                      if (nf.serv_valor != null && Number(nf.serv_valor) !== 0) return 'RPS'
                      return '—'
                    }
                    const parseNFNum = (numero) => {
                      const parts = String(numero || '').split('/').map(s => s.trim()).filter(Boolean)
                      return parts.length >= 2
                        ? { rps: parts[0], nfse: parts[1] }
                        : { rps: parts[0] || '—', nfse: parts[0] || '—' }
                    }
                    const cols = temFinanceiro
                      ? 'grid-cols-[70px_90px_90px_110px_110px_110px_110px]'
                      : 'grid-cols-[70px_90px_90px_140px]'
                    return (
                      <>
                        <div className={`grid ${cols} bg-slate-50 border-b border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap`}>
                          <div>Tipo Doc.</div>
                          <div>RPS</div>
                          <div>NFSe</div>
                          <div>Faturamento</div>
                          {temFinanceiro && <>
                            <div className="text-right">Prod Valor</div>
                            <div className="text-right">Serv Valor</div>
                            <div className="text-right">Total</div>
                          </>}
                        </div>
                        {nfList.length > 0 ? (
                          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                            {nfList.map((nf, i) => {
                              const { rps, nfse } = parseNFNum(nf.numero)
                              return (
                              <div key={i} className={`grid ${cols} px-3 py-2.5 text-xs hover:bg-slate-50/70 transition-colors`}>
                                <div>
                                  {(() => {
                                    const t = getTipoDoc(nf)
                                    return t !== '—'
                                      ? <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${t === 'DANFE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{t}</span>
                                      : <span className="text-slate-300">—</span>
                                  })()}
                                </div>
                                <div className="font-mono font-bold text-slate-800">{rps}</div>
                                <div className="font-mono font-semibold text-slate-600">{nfse}</div>
                                <div className="text-slate-500">
                                  {nf.data_faturamento
                                    ? new Date(nf.data_faturamento + 'T12:00:00').toLocaleDateString('pt-BR')
                                    : '—'}
                                </div>
                                {temFinanceiro && (() => {
                                  const tot = (nf.prod_valor || 0) + (nf.serv_valor || 0)
                                  return <>
                                    <div className="text-right text-slate-700 font-mono">{fmtR(nf.prod_valor)}</div>
                                    <div className="text-right text-slate-700 font-mono">{fmtR(nf.serv_valor)}</div>
                                    <div className="text-right text-slate-800 font-mono font-bold">{tot !== 0 ? tot.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</div>
                                  </>
                                })()}
                              </div>
                              )
                            })}
                            {temFinanceiro && nfList.length > 1 && (() => {
                              const totProd = nfList.reduce((s, n) => s + (n.prod_valor || 0), 0)
                              const totServ = nfList.reduce((s, n) => s + (n.serv_valor || 0), 0)
                              const totGeral = totProd + totServ
                              return (
                                <div className={`grid ${cols} px-3 py-2 text-xs bg-slate-50 border-t border-slate-200 font-bold`}>
                                  <div className="text-slate-500 col-span-4">Total</div>
                                  <div className="text-right text-slate-800 font-mono">{fmtR(totProd)}</div>
                                  <div className="text-right text-slate-800 font-mono">{fmtR(totServ)}</div>
                                  <div className="text-right text-blue-700 font-mono">{totGeral !== 0 ? totGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</div>
                                </div>
                              )
                            })()}
                          </div>
                        ) : (
                          <div className="px-3 py-6 text-center text-xs text-slate-400">
                            Clique em <span className="font-semibold text-indigo-500">Buscar Faturamento</span> para carregar as notas fiscais do ROF017.
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Envio para Fábrica — coluna estreita ao lado das NFs */}
              <div className="w-48 shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Envio para Fábrica</span>
                <div className="flex flex-col gap-1">
                  <LabelField>Data de Envio</LabelField>
                  <InputField type="date" name="data_envio_fabrica" value={form.data_envio_fabrica} onChange={handleChange} />
                </div>
                {delta2 !== null && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Δ Faturamento → Envio</span>
                    <span className={`text-sm font-bold ${delta2 > 30 ? 'text-red-600' : delta2 > 15 ? 'text-yellow-600' : 'text-green-600'}`}>{delta2}d</span>
                  </div>
                )}
              </div>

            </div>

              {/* Título a Receber localizado (RFN003) por OS + Nota Fiscal — abaixo de Data de Envio.
                  Nº Título cai no fallback gravado na OS (numero_titulo) quando o título some do
                  RFN003 (ex: já liquidado). Observações vêm direto de gar_titulos_observacoes,
                  mesma fonte usada em "Editar Título" (Títulos a Receber). */}
              {(() => {
                const nroTitulo = tituloEncontrado?.nro_titulo || form.numero_titulo
                if (!nroTitulo) return null
                return (
                <div className="space-y-2">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center gap-6 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide shrink-0">Título a Receber Localizado</span>
                    <div className="flex items-center gap-2">
                      <LabelField locked>Nº Título</LabelField>
                      <ReadOnlyField value={nroTitulo} />
                    </div>
                    {tituloEncontrado && (
                      <div className="flex items-center gap-2">
                        <LabelField locked>Nº Lançamento</LabelField>
                        <ReadOnlyField value={tituloEncontrado.nro_lancamento} />
                      </div>
                    )}
                    {tituloEncontrado && (
                      <div className="flex items-center gap-2">
                        <LabelField locked>Data de Vencimento</LabelField>
                        <ReadOnlyField value={fmtDate(tituloEncontrado.data_vencimento)} />
                      </div>
                    )}
                  </div>
                  <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg px-4 py-3">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mb-2 block">Observações do Título</label>
                    <TituloObservacoesPanel
                      nroTitulo={nroTitulo}
                      observacoes={titulosObs}
                      podeEditar={canEditarOS && !modoVisualizar}
                      bloqueado={false}
                      userEmail={user?.email}
                      onChange={loadTitulosObs}
                    />
                  </div>
                </div>
                )
              })()}
            </div>

          </div>
        )}

        {/* ── ETAPA 5: RECUSADO — PLANO DE AÇÃO (condicional, status FR) ── */}
        {etapa === 5 && mostrarRecusa && (
          <div className="p-5 space-y-5">

            {/* Cabeçalho */}
            <div className="flex items-center gap-3 border-b border-red-100 pb-3">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">5 — Recusado — Plano de Ação</p>
              <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">F — RECUSADO</span>
            </div>

            {/* ── Resumo: Análise ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumo — Processamento e Análise</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col gap-1">
                  <LabelField locked>Nº SG</LabelField>
                  <ReadOnlyField value={form.numero_sg} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data SG</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_sg)} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Status</LabelField>
                  <ReadOnlyField value={STATUS_LABEL['FR']} />
                </div>
                <div className="flex flex-col gap-1 col-span-3">
                  <LabelField locked>Motivo da Recusa</LabelField>
                  <ReadOnlyField value={form.motivo_recusa_descricao} placeholder="Não informado" />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>OS / Tipo de OS</LabelField>
                  <ReadOnlyField value={form.tipo_garantia_descricao} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Nº Chassi</LabelField>
                  <ReadOnlyField value={form.chassi} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data Final Avaliação</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_final_avaliacao)} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data de Criação</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_abertura_os)} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data Fechado</LabelField>
                  <ReadOnlyField value={form.data_fechamento_os ? fmtDate(form.data_fechamento_os) : ''} placeholder="Aberto" />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data de Reapresentação</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_reapresentacao)} />
                </div>
                <div className="flex flex-col gap-1 col-span-3">
                  <LabelField locked>Resposta SHC</LabelField>
                  <div className="w-full text-xs p-2 border border-slate-100 rounded-md bg-white font-medium text-slate-600 min-h-[52px] select-none whitespace-pre-wrap">
                    {form.resposta_shc || <span className="text-slate-300">—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Resumo: Faturamento ── */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resumo — Faturamento</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex flex-col gap-1">
                  <LabelField locked>Nº Nota Fiscal de Peças/Serviços</LabelField>
                  <ReadOnlyField value={form.numero_nf} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data de Emissão da NF</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_emissao_nf)} />
                </div>
                <div className="flex flex-col gap-1">
                  <LabelField locked>Data de Envio para Fábrica</LabelField>
                  <ReadOnlyField value={fmtDate(form.data_envio_fabrica)} />
                </div>
                <div className="flex flex-col gap-1 col-span-3">
                  <LabelField locked>Total da OS</LabelField>
                  <div className="w-full text-xs p-2 border border-slate-100 rounded-md bg-white font-bold text-red-600">
                    {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    <span className="ml-2 text-[10px] font-normal text-slate-400">(valor em disputa)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Plano de Ação (editável pela direção) ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Plano de Ação — Direção</p>
                <span className="text-[10px] text-slate-400 font-normal">(campos editáveis)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 p-4 bg-red-50/40 rounded-lg border border-red-100">
                <div className="flex flex-col gap-1">
                  <LabelField required>Data da Ação Tomada</LabelField>
                  <InputField type="date" name="data_recusa" value={form.data_recusa || ''} onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <LabelField required>Ação Tomada</LabelField>
                  <SelectField name="acao_tomada" value={form.acao_tomada || ''} onChange={handleChange}>
                    <option value="">Selecione a ação</option>
                    {ACOES_TOMADAS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </SelectField>
                </div>
                <div className="flex flex-col gap-1 col-span-3">
                  <LabelField required>Plano de Ação</LabelField>
                  <textarea
                    name="plano_acao"
                    value={form.plano_acao || ''}
                    onChange={handleChange}
                    rows={6}
                    placeholder="Descreva o plano de ação da direção para recurso, reapresentação ou encerramento do processo..."
                    className="w-full text-xs p-2 border border-red-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-red-500/20 focus:border-red-400 outline-none resize-none bg-white"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* RODAPÉ DO FORMULÁRIO */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
          <div className="flex items-center gap-2">
            {etapa > 1 && (
              <button type="button" onClick={() => setEtapa(p => p - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
            )}
            {etapa < (mostrarRecusa ? 5 : 3) && (
              <button type="button" onClick={() => setEtapa(p => p + 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                Próxima <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {!modoVisualizar && (
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || (modoEdicao && !canEditarOS)}
            title={modoEdicao && !canEditarOS ? 'Sem permissão para editar — fale com um administrador' : undefined}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-60"
          >
            <Save className="h-3.5 w-3.5" />
            {salvando ? 'Salvando...' : 'Salvar Garantia'}
          </button>
          )}
        </div>
      </div>

      {/* HISTÓRICO DE ALTERAÇÕES (só no modo edição) */}
      {modoEdicao && log.length > 0 && (
        <LogHistorico log={log} logAberto={logAberto} setLogAberto={setLogAberto} />
      )}
    </div>
  )
}
