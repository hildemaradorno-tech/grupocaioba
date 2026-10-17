import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { ClipboardList, Download, ChevronDown, Save, AlertTriangle, Building2, ShieldAlert, Trash2, Calendar, User, Banknote, Search, XCircle, X, Clock, ClipboardCheck, FileText, List, ThumbsUp, CheckCircle2, ShieldCheck, ArrowUpDown, ArrowUp, ArrowDown, Settings, RotateCcw, History, Pencil, Tag, CalendarClock } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import AuditoriaSituacoes from '../auditoria/AuditoriaSituacoes'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const primeiroUltimoNome = (nome) => {
  if (!nome) return '—'
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 2) return nome
  return `${partes[0]} ${partes[partes.length - 1]}`
}

const diasOficina = (criacao, auditoria) => {
  if (!criacao || !auditoria) return null
  return Math.floor((new Date(auditoria + 'T12:00:00') - new Date(criacao + 'T12:00:00')) / 86400000)
}

// Fonte da importação por agrupamento: Caiobá Motos → API MicroWork; Caiobá Trucks → SharePoint
const fonteMicrowork = (e) => (e?.agrupamento_nome || '').trim().toLowerCase() === 'caiobá motos'

// Nome exibido no seletor de empresa: nome fantasia (ex.: "CAIOBÁ MOTOS - CAMPO GRANDE"); reserva: nome do sistema
const nomeSeletorEmpresa = (e) => e.empresa_fantasia || e.nome_empresa_sistema || e.nome_empresa || ''

// Pendente ("P" na coluna Auto): 30+ dias na oficina ou Na Oficina = Não
const isPendente = (row) => {
  const d = diasOficina(row.data_criacao, row.data_auditoria)
  return (d !== null && d >= 30) || row.na_oficina === false
}

// Respondida: Situação, Observação e Dt. Previsão preenchidas (o modal exige os três)
const isRespondida = (row) => !!(row.situacao_id && (row.observacao || '').trim() && row.data_previsao)

// Status da AUDITORIA (aud_auditorias.status) — toda auditoria passa pelas 3 etapas, em ordem
const ETAPAS_AUDITORIA = [
  { id: 'conferencia', label: 'Modo Conferência', icon: ClipboardCheck },
  { id: 'a_responder', label: 'Modo Relatório — A Responder', icon: FileText },
  { id: 'respondido_total', label: 'Modo Relatório — Respondido Total', icon: CheckCircle2 },
  { id: 'respondido_parcial', label: 'Modo Relatório — Respondido Parcial', icon: AlertTriangle },
  { id: 'sem_resposta', label: 'Modo Relatório — Sem Resposta', icon: XCircle },
]

export default function AuditoriaOsAberto() {
  const { user, isAdmin, isAdminEfetivo, hasAction, empresasPermitidas } = useAuth()
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

  // ── Listas de apoio ──
  const [empresas, setEmpresas] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [situacoes, setSituacoes] = useState([])
  const [nomePorEmail, setNomePorEmail] = useState(new Map())

  // ── Filtro e seleção de auditoria ──
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [auditorias, setAuditorias] = useState([])
  const [auditoriaId, setAuditoriaId] = useState('')
  const [rows, setRows] = useState([])

  // ── Estado ──
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState(null)

  // ── Modal de detalhe da OS (Situação / Observação / Dt. Previsão) ──
  const [modalDetalheRow, setModalDetalheRow] = useState(null)
  const [formDetalhe, setFormDetalhe] = useState({ situacao_id: '', observacao: '', data_previsao: '' })
  const [salvandoDetalhe, setSalvandoDetalhe] = useState(false)

  // ── Modal de importação ──
  const [modalImportar, setModalImportar] = useState(false)
  const [responsavelImportId, setResponsavelImportId] = useState('')

  // ── Modal de exclusão da auditoria ──
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // ── Busca por Nº OS / Placa / Chassi ──
  const [buscaOs, setBuscaOs] = useState('')

  // ── Modo de tela: conferência (checagem física no pátio) ou relatório (visão completa) ──
  const [relatorioVerTodos, setRelatorioVerTodos] = useState(false) // relatório: só pendentes (padrão) ou todas
  const [cardFiltro, setCardFiltro] = useState(null) // null | mais30 | semVeiculo | total
  const [filtroNaOficina, setFiltroNaOficina] = useState('') // conferência: '' | sim | nao | vazio
  const [ordem, setOrdem] = useState({ key: null, dir: 'asc' }) // ordenação da tabela

  // ── Seleção de OS (Modo Conferência) + Pendenciar em lote ──
  const [selecionadas, setSelecionadas] = useState(new Set())
  const [modalPendenciar, setModalPendenciar] = useState(false)
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false) // engrenagem do cabeçalho

  // ── Editar auditoria (engrenagem): tabela de conferência com só Na Oficina editável ──
  const [modalEditar, setModalEditar] = useState(false)
  const [edicaoNaOficina, setEdicaoNaOficina] = useState({}) // { [osId]: true | false | null } — só o que mudou
  const [buscaEditar, setBuscaEditar] = useState('')
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // ── Programar auditorias automáticas (engrenagem, só Admin) ──
  const [modalProgramar, setModalProgramar] = useState(false)
  const [agendamentos, setAgendamentos] = useState([])
  const AG_VAZIO = { id: null, empresa_id: '', dias_semana: [1], hora: '07:00', responsavel_id: '', ativo: true }
  const [formAg, setFormAg] = useState(AG_VAZIO)
  const [salvandoAg, setSalvandoAg] = useState(false)
  const [excluirAgId, setExcluirAgId] = useState(null)

  // ── Cadastro de Situações (engrenagem) ──
  const [modalSituacoes, setModalSituacoes] = useState(false)

  // ── Histórico de reaberturas da auditoria selecionada ──
  const [reaberturas, setReaberturas] = useState([])
  const [modalHistorico, setModalHistorico] = useState(false)
  const [pendenciando, setPendenciando] = useState(false)

  // ── Mudança de status da auditoria (confirmação) ──
  const [modalStatus, setModalStatus] = useState(null) // { para, titulo, texto }
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  // ── Prazo de resposta (abre ao clicar Conferido / Reabrir): padrão amanhã às 15:00 ──
  const [modalPrazo, setModalPrazo] = useState(null) // { procedimento: 'Conferido' | 'Reaberta' }
  const [prazoData, setPrazoData] = useState('')
  const [prazoHora, setPrazoHora] = useState('15:00')
  const [agora, setAgora] = useState(() => Date.now()) // relógio do contador regressivo

  // ── Data de atualização do arquivo ROF001_OSABERTA (fonte da importação) ──
  const [arquivoAtualizadoEm, setArquivoAtualizadoEm] = useState(null)
  const [arquivoInfoStatus, setArquivoInfoStatus] = useState('carregando') // carregando | ok | erro

  const carregarArquivoInfo = useCallback(() => {
    setArquivoInfoStatus('carregando')
    fetch(`${BACKEND}/api/garantias/sharepoint/aberta/info`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setArquivoAtualizadoEm(d.lastModified); setArquivoInfoStatus('ok') })
      .catch(() => setArquivoInfoStatus('erro'))
  }, [BACKEND])

  const loadApoio = useCallback(async () => {
    // Encerra prazos vencidos antes de listar (o pg_cron também faz isso a cada 5 min)
    await apiService.encerrarPrazosAuditoria().catch(() => {})
    const [emps, funcs, cargos, sit, auds] = await Promise.all([
      apiService.getEmpresas(),
      apiService.getFuncionarios(),
      apiService.getCargos(),
      apiService.getAuditoriaSituacoes(),
      apiService.getAuditorias(),
    ])
    // Só empresas com auditoria de OS: agrupamentos Caiobá Trucks e Caiobá Motos, em ordem alfabética
    const AGRUPAMENTOS_AUDITORIA = ['caiobá trucks', 'caiobá motos']
    const empsFiltradas = (isAdmin ? emps : emps.filter(e => empresasPermitidas.has(e.id)))
      .filter(e => AGRUPAMENTOS_AUDITORIA.includes((e.agrupamento_nome || '').trim().toLowerCase()))
      .sort((a, b) => nomeSeletorEmpresa(a).localeCompare(nomeSeletorEmpresa(b), 'pt-BR'))
    setEmpresas(empsFiltradas)
    // Responsável pela auditoria = funcionários ativos cujo cargo está no agrupamento "Gerentes" ou "Gerente Geral"
    const AGRUPAMENTOS_RESPONSAVEL = ['gerentes', 'gerente geral']
    const cargosGerentes = new Set(
      cargos.filter(c => AGRUPAMENTOS_RESPONSAVEL.includes((c.nome_agrupamento_cargo || '').trim().toLowerCase())).map(c => c.id)
    )
    const respAtivos = funcs
      .filter(f => f.ativo && cargosGerentes.has(f.cargo_id))
      .map(f => ({ id: f.id, nome: f.nome_funcionario, empresa_id: f.empresa_id, cargo_nome: f.cargo_nome }))
    setResponsaveis(respAtivos)
    setSituacoes(sit.filter(s => s.ativo))
    setAuditorias(auds)
    // e-mail → nome do usuário (para "quem fez o quê"); se não puder ler, mostra o e-mail
    apiService.getUsuarios()
      .then(us => setNomePorEmail(new Map(us.filter(u => u.email).map(u => [u.email.toLowerCase(), u.nome]))))
      .catch(() => {})
    return { emps: empsFiltradas, respAtivos }
  }, [isAdmin, empresasPermitidas])

  useEffect(() => { loadApoio() }, [loadApoio])

  // Gerentes da empresa selecionada (opções de Responsável na importação)
  const responsaveisEmpresa = useMemo(
    () => responsaveis.filter(r => r.empresa_id === filtroEmpresaId),
    [responsaveis, filtroEmpresaId]
  )

  // Auditorias filtradas pela empresa selecionada
  // Auditorias de uma empresa, da mais recente para a mais antiga (por id; nome como reserva p/ registros antigos)
  const auditoriasDaEmpresa = (empresaId) => {
    const emp = empresas.find(e => e.id === empresaId)
    if (!emp) return []
    return auditorias
      .filter(a => a.empresa_id === emp.id || a.empresa_nome === emp.nome_empresa || a.empresa_nome === emp.nome_empresa_sistema)
      .sort((a, b) => `${b.data_auditoria || ''}|${b.criado_em || ''}`.localeCompare(`${a.data_auditoria || ''}|${a.criado_em || ''}`))
  }

  const auditoriasFiltradas = useMemo(() => {
    if (!filtroEmpresaId) return auditorias
    if (!empresas.some(e => e.id === filtroEmpresaId)) return auditorias
    return auditoriasDaEmpresa(filtroEmpresaId)
  }, [auditorias, filtroEmpresaId, empresas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Quando empresa muda, limpa auditoria se não pertence a ela
  useEffect(() => {
    if (!auditoriaId) return
    const ainda = auditoriasFiltradas.find(a => a.id === auditoriaId)
    if (!ainda) setAuditoriaId('')
  }, [auditoriasFiltradas])

  const loadRows = useCallback(async (id) => {
    if (!id) { setRows([]); return }
    setLoading(true)
    try { setRows(await apiService.getAuditoriaOs(id)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadRows(auditoriaId); setBuscaOs(''); setCardFiltro(null); setFiltroNaOficina(''); setSelecionadas(new Set())
  }, [auditoriaId, loadRows])

  // ── Abre modal de importação ──
  const empresaImportMicrowork = fonteMicrowork(empresas.find(e => e.id === filtroEmpresaId))
  const handleAbrirImport = () => {
    if (!filtroEmpresaId) { setErro('Selecione uma empresa antes de importar.'); return }
    setResponsavelImportId('')
    if (!empresaImportMicrowork) carregarArquivoInfo() // data do arquivo só faz sentido para o SharePoint (Trucks)
    setModalImportar(true)
  }

  // ── Importar (chamado após confirmar no modal) ──
  const handleImportar = async () => {
    const empSel = empresas.find(e => e.id === filtroEmpresaId)
    if (!empSel) return
    const respSel = responsaveis.find(r => r.id === responsavelImportId)

    setModalImportar(false)
    setImportando(true); setErro(null)
    try {
      const nomeExibicao = empSel.nome_empresa_sistema || empSel.nome_empresa
      let spRows

      if (fonteMicrowork(empSel)) {
        // Caiobá Motos → API MicroWork (OS em aberto), já filtrada pela empresa (codigo_empresa)
        const r = await fetch(`${BACKEND}/api/microwork/os-aberta?empresa=${empSel.codigo_empresa}`)
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.message || data.error || `Erro ao consultar o MicroWork (HTTP ${r.status})`)
        spRows = data.rows || []
        if (spRows.length === 0) { setErro(`Nenhuma OS em aberto encontrada para "${nomeExibicao}" no MicroWork.`); return }
      } else {
        // Caiobá Trucks → SharePoint (ROF001_OSABERTA)
        const r = await fetch(`${BACKEND}/api/garantias/sharepoint/aberta`)
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.message || data.error || `Erro ao ler o SharePoint (HTTP ${r.status})`)
        if (data.lastModified) { setArquivoAtualizadoEm(data.lastModified); setArquivoInfoStatus('ok') }
        const spTodos = Array.isArray(data) ? data : (data.rows ?? [])
        if (!Array.isArray(spTodos)) { setErro('Resposta inválida do servidor.'); return }

        // Filtra apenas OS da empresa selecionada
        spRows = spTodos.filter(sp => {
          const n = (sp.empresa_nome || '').toLowerCase()
          return n === (empSel.nome_empresa || '').toLowerCase()
            || n === (empSel.nome_empresa_sistema || '').toLowerCase()
        })
        if (spRows.length === 0) { setErro(`Nenhuma OS encontrada para "${nomeExibicao}" no SharePoint.`); return }
      }

      // Data local (não UTC) — importação à noite não cai no dia seguinte
      const d = new Date()
      const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const auditoria = await apiService.createAuditoria({
        data_auditoria: hoje,
        importado_por: user?.email || '',
        total_os: spRows.length,
        empresa_id: filtroEmpresaId,
        empresa_nome: nomeExibicao,
      })

      // Pré-preenche responsável em todas as linhas se selecionado
      const linhas = spRows.map(sp => ({
        auditoria_id: auditoria.id,
        data_auditoria: hoje,
        os_numero:           sp.OS_Numero           || sp.os_numero           || '',
        empresa_nome:        sp.Empresa_Nome         || sp.empresa_nome        || '',
        tipo_os_descricao:   sp.TipoOS_Descricao     || sp.tipo_os_descricao   || sp.tipo_os_sigla || '',
        tipo_os_sigla:       sp.TipoOS_Sigla         || sp.tipo_os_sigla       || '',
        consultor_nome:      sp.Consultor_Nome       || sp.consultor_nome      || '',
        proprietario_veiculo: sp.Proprietario_Veiculo      || sp.proprietario_veiculo || '',
        veiculo_modelo:      sp.modelo_veiculo || '',
        veiculo_placa:       sp.Veiculo_Placa || sp.veiculo_placa || '',
        veiculo_chassi:      sp.Veiculo_Chassi       || sp.veiculo_chassi      || '',
        data_criacao:        sp.Data_Criacao         || sp.data_criacao        || null,
        total:               sp.Total                || sp.total               || 0,
        produto:             sp.Produto              || sp.produto             || 0,
        servico:             sp.Servico              || sp.servico             || 0,
        responsavel_id:   respSel?.id   || null,
        responsavel_nome: respSel?.nome || null,
        na_oficina:       null, // "—" = ainda não conferida; Sim/Não é marcado na conferência
      }))
      try {
        await apiService.createAuditoriaOsLote(linhas)
      } catch (e) {
        // Desfaz o cabeçalho para não deixar auditoria vazia
        await apiService.deleteAuditoria(auditoria.id).catch(() => {})
        throw e
      }
      await loadApoio()
      setAuditoriaId(auditoria.id)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setImportando(false) }
  }

  // ── Modal de detalhe da OS (Situação / Observação / Dt. Previsão) — abre ao clicar na linha ──
  const abrirModalDetalhe = (row) => {
    if (auditoriaEncerrada) return // Respondido Total/Parcial ou Sem Resposta: OS não pode ser editada
    setModalDetalheRow(row)
    setFormDetalhe({
      situacao_id: row.situacao_id || '',
      observacao: row.observacao || '',
      data_previsao: row.data_previsao || '',
    })
  }

  const fecharModalDetalhe = () => {
    setModalDetalheRow(null)
    setFormDetalhe({ situacao_id: '', observacao: '', data_previsao: '' })
  }

  const detalheValido = formDetalhe.situacao_id.trim() !== '' && formDetalhe.observacao.trim() !== '' && formDetalhe.data_previsao.trim() !== ''

  const temDetalheSalvo = !!(modalDetalheRow && (modalDetalheRow.situacao_id || modalDetalheRow.observacao || modalDetalheRow.data_previsao))

  // Apaga a resposta da OS (Situação, Observação, Dt. Previsão) e fecha o modal
  const handleExcluirDetalhe = async () => {
    if (!modalDetalheRow) return
    setSalvandoDetalhe(true)
    try {
      const payload = { situacao_id: null, situacao_nome: null, observacao: null, data_previsao: null }
      await apiService.updateAuditoriaOsItem(modalDetalheRow.id, payload, user?.email || '')
      setRows(prev => prev.map(r => r.id === modalDetalheRow.id ? { ...r, ...payload } : r))
      fecharModalDetalhe()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvandoDetalhe(false) }
  }

  const handleSalvarDetalhe = async () => {
    if (!modalDetalheRow) return
    if (!detalheValido) { setErro('Preencha Situação, Observação e Dt. Previsão antes de salvar.'); return }
    setSalvandoDetalhe(true)
    try {
      const sit = situacoes.find(s => s.id === formDetalhe.situacao_id)
      const payload = {
        situacao_id: formDetalhe.situacao_id || null,
        situacao_nome: sit?.nome || null,
        observacao: formDetalhe.observacao || null,
        data_previsao: formDetalhe.data_previsao || null,
      }
      await apiService.updateAuditoriaOsItem(modalDetalheRow.id, payload, user?.email || '')
      setRows(prev => prev.map(r => r.id === modalDetalheRow.id ? { ...r, ...payload } : r))
      fecharModalDetalhe()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvandoDetalhe(false) }
  }

  // ── Muda "Na Oficina" (Sim/Não) — salva na hora, sem precisar clicar em Salvar ──
  const handleMudarNaOficina = async (row, valor) => {
    const anterior = row.na_oficina
    if (anterior === valor) return
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, na_oficina: valor } : r))
    try {
      await apiService.updateAuditoriaOsItem(row.id, { na_oficina: valor }, user?.email || '')
    } catch (e) {
      setErro(e.message || String(e))
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, na_oficina: anterior } : r))
    }
  }

  // Seletor Na Oficina (Sim/Não) — usado nos dois modos de tela
  const renderNaOficina = (row) => (
    <select
      disabled={!emConferencia} // Na Oficina só muda no Modo Conferência
      title={!emConferencia ? 'Na Oficina só pode ser alterado no Modo Conferência' : undefined}
      value={row.na_oficina === true ? 'sim' : row.na_oficina === false ? 'nao' : ''}
      onChange={e => {
        const v = e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null
        handleMudarNaOficina(row, v)
      }}
      className={`text-xs p-1 border rounded-md outline-none focus:outline-none focus:ring-0 w-20 font-semibold disabled:cursor-not-allowed disabled:appearance-none disabled:text-center ${
        row.na_oficina === true ? 'bg-green-100 border-green-300 text-green-700'
        : row.na_oficina === false ? 'bg-red-100 border-red-300 text-red-700'
        : 'bg-white border-slate-200 text-slate-700'
      }`}
    >
      {/* Opções com fundo branco próprio — senão herdam a cor do select e se confundem */}
      <option value="" className="bg-white text-slate-500">—</option>
      <option value="sim" className="bg-white text-green-700 font-semibold">Sim</option>
      <option value="nao" className="bg-white text-red-700 font-semibold">Não</option>
    </select>
  )

  const handleExcluirAuditoria = async () => {
    setExcluindo(true); setErro(null)
    try {
      await apiService.deleteAuditoria(auditoriaId)
      setAuditoriaId('')
      setRows([])
      setModalExcluir(false)
      await loadApoio()
    } catch (e) { setErro(e.message || String(e)); setModalExcluir(false) }
    finally { setExcluindo(false) }
  }

  const auditoriaAtual = useMemo(() => auditorias.find(a => a.id === auditoriaId), [auditorias, auditoriaId])
  const totalValorOS = useMemo(() => rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0), [rows])

  // Status da auditoria define a tela:
  //  conferencia            → tabela de conferência (todas as OS)
  //  a_responder/respondido → tabela de relatório (só pendentes; "Ver todas" inclui as não pendentes)
  const statusAud = auditoriaAtual?.status || 'conferencia'
  const etapaIdx = ETAPAS_AUDITORIA.findIndex(e => e.id === statusAud)
  const emConferencia = statusAud === 'conferencia'
  // Encerrada (prazo vencido ou concluída): OS ficam só para consulta
  const auditoriaEncerrada = ['respondido_total', 'respondido_parcial', 'sem_resposta'].includes(statusAud)

  // ── Quem pode reabrir ──
  //  Admin: qualquer auditoria, sem limite.
  //  Grupo com a ação 'reabrir': só a última auditoria da empresa e só 1 vez (reabertura por não-admin).
  const ehUltimaDaEmpresa = useMemo(() => {
    if (!auditoriaAtual) return false
    const daEmpresa = auditorias.filter(a =>
      auditoriaAtual.empresa_id ? a.empresa_id === auditoriaAtual.empresa_id : a.empresa_nome === auditoriaAtual.empresa_nome
    )
    const chave = (a) => `${a.data_auditoria || ''}|${a.criado_em || ''}`
    const ultima = daEmpresa.reduce((m, a) => (!m || chave(a) > chave(m) ? a : m), null)
    return ultima?.id === auditoriaAtual.id
  }, [auditorias, auditoriaAtual])
  // Histórico (fechamentos + reaberturas): recarrega ao trocar de auditoria e a cada mudança de status
  // (inclusive o encerramento automático por prazo, que grava o fechamento no banco)
  useEffect(() => {
    setReaberturas([])
    if (auditoriaId) apiService.getAuditoriaReaberturas(auditoriaId).then(setReaberturas).catch(() => {})
  }, [auditoriaId, statusAud])
  const soReaberturas = reaberturas.filter(r => (r.tipo || 'reabertura') === 'reabertura')

  const reabrir = (() => {
    if (!auditoriaAtual) return { pode: false, motivo: 'Selecione uma auditoria' }
    if (!auditoriaEncerrada) return { pode: false, motivo: 'Só para auditoria encerrada (Respondido / Sem Resposta)' }
    if (isAdminEfetivo) return { pode: true, motivo: 'Volta para A Responder com novo prazo (Admin, sem limite)' }
    if (!hasAction('auditoria-os-aberto', 'reabrir')) return { pode: false, motivo: 'Sem permissão para reabrir' }
    if (!ehUltimaDaEmpresa) return { pode: false, motivo: 'Só a última auditoria da empresa pode ser reaberta — antigas: somente Admin' }
    if (soReaberturas.some(r => !r.por_admin)) return { pode: false, motivo: 'Já reaberta uma vez — somente o Admin pode reabrir novamente' }
    return { pode: true, motivo: 'Volta para A Responder com novo prazo (permitido 1 vez)' }
  })()
  const podeCadastrarSituacoes = isAdminEfetivo || hasAction('auditoria-os-aberto', 'cadastrar_situacoes')

  // ── Programar auditorias: carregar / salvar / excluir ──
  const abrirModalProgramar = async () => {
    setFormAg(AG_VAZIO); setExcluirAgId(null); setModalProgramar(true)
    try { setAgendamentos(await apiService.getAuditoriaAgendamentos()) } catch (e) { setErro(e.message || String(e)) }
  }
  const formAgValido = formAg.empresa_id && formAg.dias_semana.length > 0 && /^\d{2}:\d{2}/.test(formAg.hora || '')
  const handleSalvarAg = async () => {
    if (!formAgValido) return
    setSalvandoAg(true)
    try {
      const resp = responsaveis.find(r => r.id === formAg.responsavel_id)
      const payload = {
        empresa_id: formAg.empresa_id,
        dias_semana: [...formAg.dias_semana].sort(),
        hora: formAg.hora,
        responsavel_id: resp?.id || null,
        responsavel_nome: resp?.nome || null,
        ativo: formAg.ativo,
      }
      await apiService.saveAuditoriaAgendamento(formAg.id, payload, user?.email || '')
      setAgendamentos(await apiService.getAuditoriaAgendamentos())
      setFormAg(AG_VAZIO)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvandoAg(false) }
  }
  const handleExcluirAg = async (id) => {
    try {
      await apiService.deleteAuditoriaAgendamento(id)
      setAgendamentos(prev => prev.filter(a => a.id !== id))
      if (formAg.id === id) setFormAg(AG_VAZIO)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setExcluirAgId(null) }
  }

  // ── Editar auditoria: quem pode e salvar ──
  const editar = (() => {
    if (!auditoriaAtual) return { pode: false, motivo: 'Selecione uma auditoria' }
    if (emConferencia) return { pode: false, motivo: 'No Modo Conferência a coluna Na Oficina já é editável na tabela' }
    if (!isAdminEfetivo && !hasAction('auditoria-os-aberto', 'editar_na_oficina')) return { pode: false, motivo: 'Sem permissão para editar' }
    return { pode: true, motivo: 'Alterar Na Oficina das OS (tabela de conferência)' }
  })()
  const abrirModalEditar = () => { setEdicaoNaOficina({}); setBuscaEditar(''); setModalEditar(true) }
  const qtdAlteracoes = Object.keys(edicaoNaOficina).length
  const handleSalvarEdicao = async () => {
    if (!qtdAlteracoes) { setModalEditar(false); return }
    setSalvandoEdicao(true)
    try {
      // agrupa por valor para gravar em lote (Sim / Não / —)
      const grupos = new Map()
      Object.entries(edicaoNaOficina).forEach(([id, v]) => {
        const k = String(v); if (!grupos.has(k)) grupos.set(k, { valor: v, ids: [] }); grupos.get(k).ids.push(id)
      })
      for (const { valor, ids } of grupos.values()) {
        await apiService.updateAuditoriaOsLote(ids, { na_oficina: valor }, user?.email || '')
      }
      setRows(prev => prev.map(r => r.id in edicaoNaOficina ? { ...r, na_oficina: edicaoNaOficina[r.id] } : r))
      setModalEditar(false)
      setEdicaoNaOficina({})
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvandoEdicao(false) }
  }

  const soPendentes = !emConferencia && !relatorioVerTodos
  const pendentesSemResposta = useMemo(() => rows.filter(r => isPendente(r) && !isRespondida(r)).length, [rows])
  // Responsável da auditoria: gravado em todas as OS na importação (junta os nomes caso haja mais de um)
  const responsavelAuditoria = useMemo(
    () => [...new Set(rows.map(r => r.responsavel_nome).filter(Boolean))].join(', '),
    [rows]
  )
  const naoConferidas = useMemo(() => rows.filter(r => r.na_oficina !== true && r.na_oficina !== false).length, [rows])
  // Cards de resumo — clicar filtra a tabela (clicar de novo limpa)
  const CARDS_RESUMO = [
    { id: 'mais30', label: 'Veículos com mais de 30 dias na oficina', pred: r => { const d = diasOficina(r.data_criacao, r.data_auditoria); return r.na_oficina === true && d !== null && d >= 30 }, cor: 'red' }, // só com veículo na oficina (Sim); "Não" vai para o card abaixo
    { id: 'semVeiculo', label: 'OS em aberto sem veículo na oficina', pred: r => r.na_oficina === false, cor: 'amber' },
    // Total: no relatório mostra só as pendentes; todas apenas com "Ver todas" (na conferência, todas)
    soPendentes
      ? { id: 'total', label: 'Total pendentes', pred: isPendente, cor: 'indigo' }
      : { id: 'total', label: 'Total', pred: () => true, cor: 'indigo' },
  ]
  const resumoCards = useMemo(() => {
    const out = {}
    for (const c of CARDS_RESUMO) {
      const lista = rows.filter(c.pred)
      out[c.id] = { qtd: lista.length, valor: lista.reduce((acc, r) => acc + (Number(r.total) || 0), 0) }
    }
    return out
  }, [rows, soPendentes]) // eslint-disable-line react-hooks/exhaustive-deps

  const rowsDoModo = useMemo(() => {
    if (cardFiltro) return rows.filter(CARDS_RESUMO.find(c => c.id === cardFiltro).pred)
    return soPendentes ? rows.filter(isPendente) : rows
  }, [rows, soPendentes, cardFiltro]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMudarStatus = async () => {
    if (!modalStatus || !auditoriaAtual) return
    setSalvandoStatus(true)
    try {
      const atualizada = await apiService.updateAuditoriaStatus(auditoriaAtual.id, modalStatus.para, user?.email || '', modalStatus.procedimento)
      // Fechamento manual (Concluir respostas) entra na linha do tempo do histórico
      if (modalStatus.para === 'respondido_total') {
        await apiService.createAuditoriaReabertura({
          auditoria_id: auditoriaAtual.id, tipo: 'fechamento', resultado: 'respondido_total',
          reaberto_por: user?.email || null, reaberto_em: atualizada?.respondido_em || new Date().toISOString(),
          por_admin: !!isAdminEfetivo,
        }).catch(() => {})
      }
      setAuditorias(prev => prev.map(a => a.id === auditoriaAtual.id ? { ...a, ...atualizada } : a))
      setRelatorioVerTodos(false)
      setModalStatus(null)
    } catch (e) { setErro(e.message || String(e)); setModalStatus(null) }
    finally { setSalvandoStatus(false) }
  }

  // ── Prazo de resposta ──
  const abrirModalPrazo = (procedimento) => {
    const amanha = new Date(); amanha.setDate(amanha.getDate() + 1)
    const pad = (n) => String(n).padStart(2, '0')
    setPrazoData(`${amanha.getFullYear()}-${pad(amanha.getMonth() + 1)}-${pad(amanha.getDate())}`)
    setPrazoHora('15:00')
    setModalPrazo({ procedimento })
  }

  const prazoEscolhido = prazoData && prazoHora ? new Date(`${prazoData}T${prazoHora}:00`) : null // horário local
  const prazoValido = !!prazoEscolhido && !isNaN(prazoEscolhido.getTime()) && prazoEscolhido.getTime() > Date.now()

  const handleConfirmarPrazo = async () => {
    if (!modalPrazo || !auditoriaAtual || !prazoValido) return
    const reabrindo = modalPrazo.procedimento === 'Reaberta'
    if (reabrindo && !reabrir.pode) { setErro(reabrir.motivo); setModalPrazo(null); return }
    setSalvandoStatus(true)
    try {
      // Reabertura: registra no histórico antes de mudar o status (guarda o status anterior)
      if (reabrindo) {
        const reg = await apiService.createAuditoriaReabertura({
          auditoria_id: auditoriaAtual.id,
          tipo: 'reabertura',
          reaberto_por: user?.email || null,
          por_admin: !!isAdminEfetivo,
          status_anterior: statusAud,
          prazo_novo: prazoEscolhido.toISOString(),
        })
        setReaberturas(prev => [...prev, reg])
      }
      const atualizada = await apiService.updateAuditoriaStatus(
        auditoriaAtual.id, 'a_responder', user?.email || '', modalPrazo.procedimento, prazoEscolhido.toISOString()
      )
      setAuditorias(prev => prev.map(a => a.id === auditoriaAtual.id ? { ...a, ...atualizada } : a))
      setRelatorioVerTodos(false)
      setModalPrazo(null)
    } catch (e) { setErro(e.message || String(e)); setModalPrazo(null) }
    finally { setSalvandoStatus(false) }
  }

  // Contador regressivo: atualiza a cada 30s; ao vencer, encerra no banco e recarrega o status
  const prazoMs = statusAud === 'a_responder' && auditoriaAtual?.prazo_resposta ? new Date(auditoriaAtual.prazo_resposta).getTime() : null
  useEffect(() => {
    if (!prazoMs) return
    const t = setInterval(() => setAgora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [prazoMs])
  useEffect(() => {
    if (prazoMs && agora >= prazoMs) loadApoio()
  }, [agora, prazoMs]) // eslint-disable-line react-hooks/exhaustive-deps

  const restanteTexto = (() => {
    if (!prazoMs) return ''
    const ms = prazoMs - agora
    if (ms <= 0) return 'Prazo encerrado'
    const min = Math.floor(ms / 60000)
    const d = Math.floor(min / 1440), h = Math.floor((min % 1440) / 60), m = min % 60
    return `Faltam ${d > 0 ? `${d}d ` : ''}${h}h ${String(m).padStart(2, '0')}min`
  })()
  const prazoUrgente = prazoMs && prazoMs - agora <= 2 * 3600000 // menos de 2 horas

  // Filtro Na Oficina (só no Modo Conferência)
  const porNaOficina = useMemo(() => {
    if (!emConferencia || !filtroNaOficina) return rowsDoModo
    return rowsDoModo.filter(r =>
      filtroNaOficina === 'sim' ? r.na_oficina === true
      : filtroNaOficina === 'nao' ? r.na_oficina === false
      : r.na_oficina !== true && r.na_oficina !== false
    )
  }, [rowsDoModo, emConferencia, filtroNaOficina])

  const rowsFiltradas = useMemo(() => {
    const q = buscaOs.trim().toLowerCase()
    if (!q) return porNaOficina
    return porNaOficina.filter(r =>
      String(r.os_numero || '').toLowerCase().includes(q) ||
      String(r.veiculo_placa || '').toLowerCase().includes(q) ||
      String(r.veiculo_chassi || '').toLowerCase().includes(q)
    )
  }, [porNaOficina, buscaOs])

  // ── Ordenação das colunas (clique no cabeçalho: asc → desc → sem ordenação) ──
  const valorOrdenacao = (r, k) => {
    switch (k) {
      case 'auto':       return isPendente(r) ? (isRespondida(r) ? 1 : 2) : 0 // P > R > OK
      case 'dias':       return diasOficina(r.data_criacao, r.data_auditoria)
      case 'tipo_os':    return r.tipo_os_descricao || r.tipo_os_sigla
      case 'total':      return Number(r.total) || 0
      case 'na_oficina': return r.na_oficina === true ? 2 : r.na_oficina === false ? 1 : null
      case 'os_numero':  return Number(r.os_numero) || r.os_numero
      default:           return r[k]
    }
  }
  const rowsOrdenadas = useMemo(() => {
    if (!ordem.key) return rowsFiltradas
    const sinal = ordem.dir === 'asc' ? 1 : -1
    return [...rowsFiltradas].sort((a, b) => {
      const va = valorOrdenacao(a, ordem.key), vb = valorOrdenacao(b, ordem.key)
      const vaVazio = va === null || va === undefined || va === ''
      const vbVazio = vb === null || vb === undefined || vb === ''
      if (vaVazio || vbVazio) return vaVazio === vbVazio ? 0 : vaVazio ? 1 : -1 // vazios sempre no fim
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal
      return String(va).localeCompare(String(vb), 'pt-BR', { numeric: true, sensitivity: 'base' }) * sinal
    })
  }, [rowsFiltradas, ordem]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seleção: "todas" = todas as OS visíveis (respeita busca, filtros e cards)
  const todasVisiveisSelecionadas = rowsOrdenadas.length > 0 && rowsOrdenadas.every(r => selecionadas.has(r.id))
  const algumaVisivelSelecionada = rowsOrdenadas.some(r => selecionadas.has(r.id))
  const alternarSelecao = (id) => setSelecionadas(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const alternarTodas = () => setSelecionadas(prev => {
    const s = new Set(prev)
    if (todasVisiveisSelecionadas) rowsOrdenadas.forEach(r => s.delete(r.id))
    else rowsOrdenadas.forEach(r => s.add(r.id))
    return s
  })

  // Pendenciar = marcar Na Oficina = Não nas OS selecionadas
  const handlePendenciar = async () => {
    const ids = [...selecionadas]
    if (!ids.length) return
    setPendenciando(true)
    try {
      await apiService.updateAuditoriaOsLote(ids, { na_oficina: false }, user?.email || '')
      const idSet = new Set(ids)
      setRows(prev => prev.map(r => idSet.has(r.id) ? { ...r, na_oficina: false } : r))
      setSelecionadas(new Set())
      setModalPendenciar(false)
    } catch (e) { setErro(e.message || String(e)); setModalPendenciar(false) }
    finally { setPendenciando(false) }
  }

  const alternarOrdem = (k) => setOrdem(o =>
    o.key !== k ? { key: k, dir: 'asc' } : o.dir === 'asc' ? { key: k, dir: 'desc' } : { key: null, dir: 'asc' }
  )

  const thOrd = (k, label, cls = '', alinhar = 'start') => {
    const ativo = ordem.key === k
    const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th
        key={k}
        onClick={() => alternarOrdem(k)}
        className={`p-3 whitespace-nowrap cursor-pointer select-none hover:text-slate-600 transition-colors ${ativo ? 'text-indigo-600' : ''} ${cls}`}
        title="Clique para ordenar"
      >
        <span className={`inline-flex items-center gap-1 ${alinhar === 'center' ? 'justify-center w-full' : alinhar === 'end' ? 'justify-end w-full' : ''}`}>
          {label}
          <Icone className={`h-3 w-3 ${ativo ? '' : 'opacity-40'}`} />
        </span>
      </th>
    )
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Auditoria O.S. Aberta
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione a empresa, importe as OS do SharePoint e acompanhe por auditoria.
          </p>
        </div>
        <div className="flex items-end gap-3 flex-wrap justify-end">
          {/* Empresa */}
          <div className="flex flex-col gap-1 w-[240px]">
            <label className="h-4 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Empresa
            </label>
            <div className="relative">
              <select
                value={filtroEmpresaId}
                onChange={e => {
                  // Já seleciona a última auditoria realizada da empresa; sem auditoria → "Selecione uma auditoria"
                  setFiltroEmpresaId(e.target.value)
                  setAuditoriaId(e.target.value ? (auditoriasDaEmpresa(e.target.value)[0]?.id || '') : '')
                }}
                className="w-full h-9 text-xs px-2 pr-8 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none font-semibold"
              >
                <option value="">— Selecione uma empresa —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{nomeSeletorEmpresa(e)}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Auditoria */}
          <div className="flex flex-col gap-1 w-[285px]">{/* largo o bastante para "dd/mm/aaaa — 999 OS · Respondido Parcial" */}
            <label className="h-4 text-[10px] font-bold text-slate-400 uppercase flex items-center">Data da Auditoria</label>
            <div className="relative">
              <select
                value={auditoriaId}
                onChange={e => setAuditoriaId(e.target.value)}
                disabled={!filtroEmpresaId}
                className="w-full h-9 text-xs px-2 pr-8 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Selecione uma auditoria —</option>
                {auditoriasFiltradas.map(a => (
                  <option key={a.id} value={a.id}>
                    {fmtDate(a.data_auditoria)} — {a.total_os} OS · {{ conferencia: 'Conferência', a_responder: 'A Responder', respondido_total: 'Respondido Total', respondido_parcial: 'Respondido Parcial', sem_resposta: 'Sem Resposta' }[a.status || 'conferencia']}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Engrenagem: Inserir / Reabrir / Excluir auditoria */}
          <div className="relative">
            <button
              onClick={() => setMenuAcoesAberto(v => !v)}
              aria-label="Opções da auditoria"
              title="Opções da auditoria"
              className={`flex items-center justify-center h-9 w-9 rounded-md border shadow-sm transition-colors ${
                menuAcoesAberto ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className={`h-4 w-4 ${importando ? 'animate-spin' : ''}`} />
            </button>

            {menuAcoesAberto && (
              <>
                {/* clique fora fecha */}
                <div className="fixed inset-0 z-30" onClick={() => setMenuAcoesAberto(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-lg border border-slate-200 bg-white shadow-xl py-1">
                  {[
                    {
                      id: 'inserir', icon: Download, label: 'Inserir auditoria',
                      desc: importando ? 'Importando...' : !filtroEmpresaId ? 'Selecione uma empresa antes' : empresaImportMicrowork ? 'Importar OS do MicroWork (API)' : 'Importar OS do SharePoint',
                      disabled: importando || !filtroEmpresaId, onClick: handleAbrirImport, cor: 'text-indigo-600',
                    },
                    {
                      id: 'editar', icon: Pencil, label: 'Editar auditoria',
                      desc: editar.motivo,
                      disabled: !editar.pode, onClick: abrirModalEditar, cor: 'text-slate-600',
                    },
                    {
                      id: 'reabrir', icon: RotateCcw, label: 'Reabrir auditoria',
                      desc: reabrir.motivo,
                      disabled: !reabrir.pode, onClick: () => abrirModalPrazo('Reaberta'), cor: 'text-amber-600',
                    },
                    {
                      id: 'programar', icon: CalendarClock, label: 'Programar auditorias',
                      desc: isAdminEfetivo ? 'Gerar auditorias automáticas por dia da semana e horário' : 'Somente o Admin pode programar',
                      disabled: !isAdminEfetivo, onClick: abrirModalProgramar, cor: 'text-emerald-600',
                    },
                    {
                      id: 'situacoes', icon: Tag, label: 'Situações de auditoria',
                      desc: podeCadastrarSituacoes ? 'Cadastrar / editar as situações das OS' : 'Sem permissão para cadastrar situações',
                      disabled: !podeCadastrarSituacoes, onClick: () => setModalSituacoes(true), cor: 'text-violet-600',
                    },
                    {
                      id: 'excluir', icon: Trash2, label: 'Excluir auditoria',
                      desc: auditoriaAtual ? `Auditoria de ${fmtDate(auditoriaAtual.data_auditoria)}` : 'Selecione uma auditoria',
                      disabled: !auditoriaAtual, onClick: () => setModalExcluir(true), cor: 'text-red-600',
                    },
                  ].map(op => (
                    <button
                      key={op.id}
                      disabled={op.disabled}
                      onClick={() => { setMenuAcoesAberto(false); op.onClick() }}
                      className="w-full flex items-start gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                      <op.icon className={`h-4 w-4 mt-0.5 shrink-0 ${op.cor}`} />
                      <span className="leading-tight">
                        <span className="block text-xs font-semibold text-slate-800">{op.label}</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">{op.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* Aviso: empresa sem auditoria */}
      {filtroEmpresaId && auditoriasFiltradas.length === 0 && (
        <p className="text-xs text-slate-500">Nenhuma auditoria para esta empresa. Use o botão de inserir auditoria (ícone de download) no topo.</p>
      )}

      {/* Status da auditoria — etapas (concluída / atual / próxima) + ação para avançar */}
      {auditoriaAtual && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5">
          {/* Linha 1: status */}
          <div className="flex items-center gap-4 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status da Auditoria</span>
          {(() => {
            const et = ETAPAS_AUDITORIA[etapaIdx] || ETAPAS_AUDITORIA[0]
            // Cor de fundo por status: A Responder verde-claro; encerradas: Total verde, Parcial amarelo, Sem Resposta vermelho
            const corStatus = {
              conferencia:        'text-indigo-700',
              a_responder:        'px-2.5 py-1 rounded-md bg-green-50 border border-green-300 text-green-700',
              respondido_total:   'px-2.5 py-1 rounded-md bg-green-600 text-white',
              respondido_parcial: 'px-2.5 py-1 rounded-md bg-[#ffff00] border border-yellow-500 text-slate-900 shadow-sm',
              sem_resposta:       'px-2.5 py-1 rounded-md bg-red-600 text-white',
            }[et.id] || 'text-indigo-700'
            return (
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${corStatus}`}>
                <et.icon className="h-4 w-4" />
                {et.label}
              </span>
            )
          })()}
          </div>

          {/* Linha 2: quantidade de OS + valor total + responsável (definido na importação) */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
              <strong className="text-slate-700">{auditoriaAtual.total_os}</strong> OS
            </span>
            {!loading && rows.length > 0 && (
              <span className="flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-700">{fmt(totalValorOS)}</strong>
              </span>
            )}
            <span className="hidden sm:block h-4 w-px bg-slate-200" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
              Responsável:
              <strong className="text-slate-700">{responsavelAuditoria || '—'}</strong>
            </span>
          </div>

          {/* Linha 3: etapas realizadas, lado a lado — Aberta · Conferido · Respondido (quem e quando) */}
          {(() => {
            const a = auditoriaAtual
            const nomeDe = (email) => nomePorEmail.get((email || '').toLowerCase()) || email || '—'
            const fmtDH = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            // Reaberturas ficam só no histórico; o fechamento é sempre o último da linha
            const etapas = [
              { proc: 'Aberta',     por: a.importado_por,  em: a.criado_em },
              { proc: 'Conferido',  por: a.conferido_por,  em: a.conferido_em },
              { proc: { respondido_parcial: 'Respondido Parcial', sem_resposta: 'Sem Resposta' }[a.status] || 'Respondido Total', por: a.respondido_por, em: a.respondido_em },
            ].filter(e => e && e.em)
             .sort((x, y) => new Date(x.em) - new Date(y.em))
            return (
              <span className="flex items-center gap-x-3 gap-y-1 text-xs text-slate-500 flex-wrap">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {etapas.map((e, i) => (
                  <React.Fragment key={e.proc}>
                    {i > 0 && <span className="text-slate-300">·</span>}
                    <span className="flex items-center gap-1">
                      <strong className="text-slate-700">{e.proc}</strong>
                      por <strong className="text-slate-700">{nomeDe(e.por)}</strong>
                      em {fmtDH(e.em)}
                    </span>
                  </React.Fragment>
                ))}

                {/* Histórico de fechamentos/reaberturas — só ícone + quantidade; descrição no balão */}
                <span className="relative group ml-1">
                  <button
                    onClick={() => setModalHistorico(true)}
                    aria-label="Histórico de reaberturas"
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border transition-colors ${
                      soReaberturas.length ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">{soReaberturas.length}</span>
                  </button>
                  <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    Histórico de fechamentos e reaberturas ({soReaberturas.length} reabertura{soReaberturas.length === 1 ? '' : 's'})
                  </span>
                </span>
              </span>
            )
          })()}
          </div>

          {/* Lado direito: prazo de resposta e, abaixo dele, os botões de etapa */}
          <div className="flex flex-col items-end gap-2 ml-auto">
          {/* Prazo de resposta — bem visível enquanto A Responder */}
          {prazoMs && (
            <div className={`flex items-center gap-3 rounded-lg border-2 px-4 py-2 ${
              prazoUrgente ? 'border-red-400 bg-red-50 text-red-700' : 'border-amber-300 bg-amber-50 text-amber-800'
            }`}>
              <Clock className={`h-6 w-6 shrink-0 ${prazoUrgente ? 'animate-pulse' : ''}`} />
              <div className="leading-tight">
                <p className="text-[10px] font-bold uppercase opacity-80">Prazo para responder</p>
                <p className="text-sm font-bold">
                  {new Date(prazoMs).toLocaleDateString('pt-BR')} às {new Date(prazoMs).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {statusAud === 'a_responder' && (
              <button
                onClick={() => setModalStatus({ para: 'conferencia', procedimento: 'Voltou para Conferência', titulo: 'Voltar para Conferência', texto: 'A auditoria volta para o Modo Conferência. Nada do que foi preenchido é apagado.' })}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Voltar etapa
              </button>
            )}
            {statusAud === 'conferencia' && (
              <div className="relative group">
                <button
                  onClick={() => abrirModalPrazo('Conferido')}
                  disabled={loading || rows.length === 0 || naoConferidas > 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conferido
                </button>
                {naoConferidas > 0 && (
                  <span className="pointer-events-none absolute right-0 top-full mt-1.5 z-20 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    Faltam {naoConferidas} OS sem Na Oficina (Sim/Não)
                  </span>
                )}
              </div>
            )}
            {statusAud === 'a_responder' && (
              <div className="relative group">
                <button
                  onClick={() => setModalStatus({ para: 'respondido_total', procedimento: 'Respondido Total', titulo: 'Concluir respostas', texto: 'Todas as OS pendentes estão respondidas. A auditoria passa para Modo Relatório — Respondido Total (concluída).' })}
                  disabled={pendentesSemResposta > 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Concluir respostas →
                </button>
                {pendentesSemResposta > 0 && (
                  <span className="pointer-events-none absolute right-0 top-full mt-1.5 z-20 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    Faltam {pendentesSemResposta} OS pendentes sem resposta
                  </span>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      )}


      {/* CARDS DE RESUMO — filtram a tabela */}
      {auditoriaId && !loading && rows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {CARDS_RESUMO.map(c => {
            const ativo = cardFiltro === c.id
            const r = resumoCards[c.id] || { qtd: 0, valor: 0 }
            const tons = {
              red:    { borda: 'border-red-500 ring-2 ring-red-500/20',       num: 'text-red-600',    barra: 'bg-red-500' },
              amber:  { borda: 'border-amber-500 ring-2 ring-amber-500/20',   num: 'text-amber-600',  barra: 'bg-amber-500' },
              indigo: { borda: 'border-indigo-500 ring-2 ring-indigo-500/20', num: 'text-indigo-600', barra: 'bg-indigo-500' },
            }[c.cor]
            return (
              <button
                key={c.id}
                onClick={() => setCardFiltro(ativo ? null : c.id)}
                title={ativo ? 'Clique para limpar o filtro' : 'Clique para filtrar a tabela'}
                className={`relative overflow-hidden text-left bg-white rounded-lg border shadow-sm px-4 py-3 transition-all hover:shadow-md ${
                  ativo ? tons.borda : 'border-slate-200'
                }`}
              >
                <span className={`absolute left-0 top-0 bottom-0 w-1 ${tons.barra}`} />
                <p className="text-[10px] font-bold text-slate-400 uppercase">{c.label}</p>
                <div className="flex items-baseline justify-between gap-3 mt-1">
                  <p className={`text-2xl font-bold ${tons.num}`}>
                    {r.qtd} <span className="text-xs font-semibold text-slate-400">OS</span>
                  </p>
                  <p className="text-sm font-semibold text-slate-700">{fmt(r.valor)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* BUSCA */}
      {auditoriaId && rows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={buscaOs}
              onChange={e => setBuscaOs(e.target.value)}
              placeholder="Buscar por Nº OS, placa ou chassi..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
            {buscaOs && (
              <button
                onClick={() => setBuscaOs('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpar busca"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Conferência: filtro por Na Oficina, ao lado da busca */}
          {emConferencia && (
            <div className="relative w-[230px]">
              <select
                value={filtroNaOficina}
                onChange={e => setFiltroNaOficina(e.target.value)}
                className="w-full text-xs py-1.5 pl-2 pr-8 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white appearance-none"
              >
                {/* Sem filtro = mostra todas; o texto funciona como instrução */}
                <option value="">Selecione o status Na Oficina</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
                <option value="vazio">Não conferidas</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}

          {/* Pendenciar — só ícone, vermelho; descrição no balão ao passar o mouse */}
          {emConferencia && (
            <div className="relative group">
              <button
                onClick={() => setModalPendenciar(true)}
                disabled={selecionadas.size === 0}
                aria-label="Pendenciar"
                className="relative flex items-center justify-center h-8 w-8 rounded-md bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <AlertTriangle className="h-4 w-4" />
                {selecionadas.size > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-white text-red-600 border border-red-300 text-[9px] font-bold flex items-center justify-center">
                    {selecionadas.size}
                  </span>
                )}
              </button>
              <span className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {selecionadas.size === 0
                  ? 'Pendenciar — selecione uma ou mais OS'
                  : `Pendenciar ${selecionadas.size} OS selecionada(s) (Na Oficina = Não)`}
              </span>
            </div>
          )}
          <div className="flex-1" />

          {/* A Responder: alterna entre só pendentes e todas as OS sem resposta */}
          <div className="flex items-center gap-2">
          {!emConferencia && (
            <button
              onClick={() => setRelatorioVerTodos(v => !v)}
              title={relatorioVerTodos ? 'Mostrar só as OS pendentes' : 'Mostrar pendentes e não pendentes'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                relatorioVerTodos
                  ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              {relatorioVerTodos ? 'Ver só pendentes' : 'Ver todas'}
            </button>
          )}
          </div>
        </div>
      )}

      {/* TABELA */}
      {auditoriaId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando OS da auditoria...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhuma OS nesta auditoria.</div>
          ) : rowsDoModo.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {cardFiltro ? 'Nenhuma OS neste filtro.' : 'Nenhuma OS pendente nesta auditoria.'}
            </div>
          ) : rowsFiltradas.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              {buscaOs.trim() ? `Nenhuma OS encontrada para "${buscaOs.trim()}".` : 'Nenhuma OS neste filtro.'}
            </div>
          ) : emConferencia ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={todasVisiveisSelecionadas}
                      ref={el => { if (el) el.indeterminate = !todasVisiveisSelecionadas && algumaVisivelSelecionada }}
                      onChange={alternarTodas}
                      title="Selecionar todas"
                      className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
                    />
                  </th>
                  {thOrd('data_criacao', 'Dt. OS')}
                  {thOrd('os_numero', 'Nº OS')}
                  {thOrd('veiculo_placa', 'Placa')}
                  {thOrd('veiculo_chassi', 'Chassi')}
                  {thOrd('proprietario_veiculo', 'Proprietário', 'min-w-[280px]')}
                  {thOrd('veiculo_modelo', 'Modelo', 'min-w-[160px]')}
                  {thOrd('na_oficina', 'Na Oficina', 'text-center w-28', 'center')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {rowsOrdenadas.map(row => (
                  <tr key={row.id} className={`transition-colors ${selecionadas.has(row.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50/70'}`}>
                    <td className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selecionadas.has(row.id)}
                        onChange={() => alternarSelecao(row.id)}
                        className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap text-slate-500">{fmtDate(row.data_criacao)}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{row.os_numero || '—'}</td>
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap font-semibold">{row.veiculo_placa || '—'}</td>
                    <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{row.veiculo_chassi || '—'}</td>
                    <td className="p-3 text-slate-700">{row.proprietario_veiculo || '—'}</td>
                    <td className="p-3 text-slate-600">{row.veiculo_modelo || '—'}</td>
                    <td className="p-3 text-center">{renderNaOficina(row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  {thOrd('auto', 'Auto', 'text-center w-14', 'center')}
                  {thOrd('data_criacao', 'Dt. Criação')}
                  {thOrd('dias', 'Dias Oficina', 'text-center', 'center')}
                  {thOrd('os_numero', 'Nº OS')}
                  {thOrd('consultor_nome', 'Consultor')}
                  {thOrd('proprietario_veiculo', 'Proprietário', 'min-w-[320px]')}
                  {thOrd('veiculo_placa', 'Placa')}
                  {thOrd('veiculo_chassi', 'Chassi')}
                  {thOrd('veiculo_modelo', 'Modelo', 'min-w-[160px]')}
                  {thOrd('tipo_os', 'Tipo OS', 'min-w-[180px]')}
                  {thOrd('total', 'Total', 'text-right', 'end')}
                  {thOrd('na_oficina', 'Na Oficina', 'text-center w-28', 'center')}
                  {thOrd('situacao_nome', 'Situação', 'min-w-[200px]')}
                  {thOrd('observacao', 'Observação', 'min-w-[240px]')}
                  {thOrd('data_previsao', 'Dt. Previsão')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {rowsOrdenadas.map(row => {
                  return (
                    <tr
                      key={row.id}
                      onClick={() => { if (!auditoriaEncerrada) abrirModalDetalhe(row) }}
                      title={auditoriaEncerrada ? 'Auditoria encerrada — edição bloqueada' : undefined}
                      className={`transition-colors hover:bg-slate-50/70 ${auditoriaEncerrada ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {/* Auto — P (vermelho) quando dias >= 30 ou Na Oficina = Não */}
                      <td className="p-3 text-center">
                        {(() => {
                          // P = pendente sem resposta (vermelho forte) · R = pendente já respondida (vermelho claro)
                          if (isPendente(row)) return isRespondida(row)
                            ? <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-500 border border-red-200" title="Pendência respondida">R</span>
                            : <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white" title="Pendente — sem resposta">P</span>
                          return<span className="inline-flex px-1.5 py-0.5 rounded bg-green-100 text-green-700" title="OK — não pendente"><ThumbsUp className="h-3 w-3" /></span>
                        })()}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-500">{fmtDate(row.data_criacao)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(() => {
                          const d = diasOficina(row.data_criacao, row.data_auditoria)
                          if (d === null) return <span className="text-slate-300">—</span>
                          const cls = d >= 30 ? 'bg-red-100 text-red-700' : d >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          return <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[11px] ${cls}`}>{d}d</span>
                        })()}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{row.os_numero || '—'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{primeiroUltimoNome(row.consultor_nome)}</td>
                      <td className="p-3 text-slate-700">{row.proprietario_veiculo || '—'}</td>
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap font-semibold">{row.veiculo_placa || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{row.veiculo_chassi || '—'}</td>
                      <td className="p-3 text-slate-600">{row.veiculo_modelo || '—'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{row.tipo_os_descricao || row.tipo_os_sigla || '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap font-semibold text-slate-900">{row.total > 0 ? fmt(row.total) : '—'}</td>

                      {/* Na Oficina */}
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        {renderNaOficina(row)}
                      </td>

                      {/* Resposta da OS (preenchida no modal ao clicar na linha) */}
                      <td className="p-3">
                        {row.situacao_nome ? (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${
                            situacoes.find(s => s.id === row.situacao_id)?.cor || 'bg-slate-100 text-slate-700'
                          }`}>
                            {row.situacao_nome}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-slate-600 max-w-[320px]">
                        {row.observacao
                          ? <span className="line-clamp-2" title={row.observacao}>{row.observacao}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-600">
                        {row.data_previsao ? fmtDate(row.data_previsao) : <span className="text-slate-300">—</span>}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {auditoriaId && !loading && (
        <p className="text-[10px] text-slate-400">
          {cardFiltro
            ? `${rowsFiltradas.length} de ${rows.length} OS — filtro: ${CARDS_RESUMO.find(c => c.id === cardFiltro).label}`
            : soPendentes
            ? `${rowsFiltradas.length} OS pendentes de ${rows.length}${statusAud === 'a_responder' ? ` · ${pendentesSemResposta} sem resposta` : ''}`
            : `${rowsFiltradas.length} de ${rows.length} OS`} — auditoria de {auditoriaAtual ? fmtDate(auditoriaAtual.data_auditoria) : ''}
          {auditoriaAtual?.empresa_nome ? ` · ${auditoriaAtual.empresa_nome}` : ''}
        </p>
      )}

      {!auditoriaId && !filtroEmpresaId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-full">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Selecione uma empresa para começar</p>
          <p className="text-xs text-slate-400">Depois escolha uma auditoria existente ou importe novas OS.</p>
        </div>
      )}

      {/* MODAL PRAZO DE RESPOSTA (Conferido / Reabrir) */}
      {modalPrazo && auditoriaAtual && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-full shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalPrazo.procedimento === 'Conferido' ? 'Conferido — prazo de resposta' : 'Reabrir — novo prazo de resposta'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Até quando as OS pendentes devem ser respondidas no Modo Relatório — A Responder.
                    Vencido o prazo, a auditoria vira <strong>Respondido Total</strong> (tudo respondido), <strong>Respondido Parcial</strong> ou <strong>Sem Resposta</strong> (nada respondido).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                  <input
                    type="date"
                    value={prazoData}
                    onChange={e => setPrazoData(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Horário</label>
                  <input
                    type="time"
                    value={prazoHora}
                    onChange={e => setPrazoHora(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              {!prazoValido && (
                <p className="text-[10px] text-red-600 font-semibold">Informe uma data e horário no futuro.</p>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalPrazo(null)}
                disabled={salvandoStatus}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPrazo}
                disabled={salvandoStatus || !prazoValido}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {salvandoStatus ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR AUDITORIA — tabela de conferência, só Na Oficina editável */}
      {modalEditar && auditoriaAtual && (() => {
        const q = buscaEditar.trim().toLowerCase()
        const lista = [...rows]
          .sort((a, b) => String(a.os_numero).localeCompare(String(b.os_numero), 'pt-BR', { numeric: true }))
          .filter(r => !q || [r.os_numero, r.veiculo_placa, r.veiculo_chassi].some(v => String(v || '').toLowerCase().includes(q)))
        const valorDe = (r) => (r.id in edicaoNaOficina ? edicaoNaOficina[r.id] : r.na_oficina)
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg border border-slate-200 w-full max-w-5xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Pencil className="h-4 w-4 text-indigo-600" /> Editar auditoria — Na Oficina
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Auditoria de {fmtDate(auditoriaAtual.data_auditoria)}{auditoriaAtual.empresa_nome ? ` — ${auditoriaAtual.empresa_nome}` : ''} · só a coluna Na Oficina pode ser alterada.
                  </p>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    value={buscaEditar}
                    onChange={e => setBuscaEditar(e.target.value)}
                    placeholder="Buscar Nº OS, placa ou chassi..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="p-3 whitespace-nowrap">Dt. OS</th>
                      <th className="p-3 whitespace-nowrap">Nº OS</th>
                      <th className="p-3 whitespace-nowrap">Placa</th>
                      <th className="p-3 whitespace-nowrap">Chassi</th>
                      <th className="p-3 whitespace-nowrap min-w-[240px]">Proprietário</th>
                      <th className="p-3 whitespace-nowrap min-w-[150px]">Modelo</th>
                      <th className="p-3 whitespace-nowrap text-center w-28">Na Oficina</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {lista.map(r => {
                      const v = valorDe(r)
                      const alterado = r.id in edicaoNaOficina
                      return (
                        <tr key={r.id} className={alterado ? 'bg-indigo-50/60' : ''}>
                          <td className="p-3 whitespace-nowrap text-slate-500">{fmtDate(r.data_criacao)}</td>
                          <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{r.os_numero || '—'}</td>
                          <td className="p-3 font-mono whitespace-nowrap font-semibold">{r.veiculo_placa || '—'}</td>
                          <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{r.veiculo_chassi || '—'}</td>
                          <td className="p-3">{r.proprietario_veiculo || '—'}</td>
                          <td className="p-3 text-slate-600">{r.veiculo_modelo || '—'}</td>
                          <td className="p-3 text-center">
                            <select
                              value={v === true ? 'sim' : v === false ? 'nao' : ''}
                              onChange={e => {
                                const novo = e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null
                                setEdicaoNaOficina(prev => {
                                  const n = { ...prev }
                                  if (novo === (r.na_oficina ?? null)) delete n[r.id]; else n[r.id] = novo // voltou ao original = sem alteração
                                  return n
                                })
                              }}
                              className={`text-xs p-1 border rounded-md outline-none w-20 font-semibold ${
                                v === true ? 'bg-green-100 border-green-300 text-green-700'
                                : v === false ? 'bg-red-100 border-red-300 text-red-700'
                                : 'bg-white border-slate-200 text-slate-700'
                              }`}
                            >
                              <option value="" className="bg-white text-slate-500">—</option>
                              <option value="sim" className="bg-white text-green-700 font-semibold">Sim</option>
                              <option value="nao" className="bg-white text-red-700 font-semibold">Não</option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  {qtdAlteracoes ? <><strong className="text-indigo-700">{qtdAlteracoes}</strong> OS alterada(s) — ainda não salvas</> : 'Nenhuma alteração'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setModalEditar(false); setEdicaoNaOficina({}) }}
                    disabled={salvandoEdicao}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarEdicao}
                    disabled={salvandoEdicao || !qtdAlteracoes}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-40"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {salvandoEdicao ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL PROGRAMAR AUDITORIAS (só Admin) */}
      {modalProgramar && (() => {
        const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        const empresaDe = (id) => empresas.find(e => e.id === id)
        const gerentesForm = responsaveis.filter(r => r.empresa_id === formAg.empresa_id)
        const dh = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
        const corResultado = { gerada: 'bg-green-100 text-green-700', pulada: 'bg-amber-100 text-amber-700', erro: 'bg-red-100 text-red-700' }
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-50 rounded-lg border border-slate-200 w-full max-w-5xl max-h-[92vh] shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-emerald-600" /> Programar auditorias
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    A auditoria é gerada sozinha no dia e horário programados (Trucks: SharePoint · Motos: MicroWork).
                    Não é gerada se a empresa já tiver auditoria em Conferência ou A Responder.
                  </p>
                </div>
                <button onClick={() => setModalProgramar(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Formulário */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">{formAg.id ? 'Editar programação' : 'Nova programação'}</h4>
                  <div className="flex items-end gap-3 flex-wrap">
                    <div className="flex flex-col gap-1 w-[240px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Empresa</label>
                      <select
                        value={formAg.empresa_id}
                        onChange={e => setFormAg(p => ({ ...p, empresa_id: e.target.value, responsavel_id: '' }))}
                        className="text-xs p-2 border border-slate-300 rounded-md bg-white"
                      >
                        <option value="">— Selecione —</option>
                        {empresas.map(e => <option key={e.id} value={e.id}>{nomeSeletorEmpresa(e)}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Dias da semana</label>
                      <div className="flex gap-1">
                        {DIAS_SEMANA.map((d, i) => {
                          const on = formAg.dias_semana.includes(i)
                          return (
                            <button
                              key={d}
                              type="button"
                              onClick={() => setFormAg(p => ({ ...p, dias_semana: on ? p.dias_semana.filter(x => x !== i) : [...p.dias_semana, i] }))}
                              className={`px-2 py-1.5 rounded-md text-[11px] font-semibold border transition-colors ${
                                on ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >{d}</button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Horário</label>
                      <input
                        type="time"
                        value={formAg.hora}
                        onChange={e => setFormAg(p => ({ ...p, hora: e.target.value }))}
                        className="text-xs p-2 border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="flex flex-col gap-1 w-[260px]">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Responsável pela auditoria</label>
                      <select
                        value={formAg.responsavel_id}
                        onChange={e => setFormAg(p => ({ ...p, responsavel_id: e.target.value }))}
                        disabled={!formAg.empresa_id}
                        className="text-xs p-2 border border-slate-300 rounded-md bg-white disabled:opacity-50"
                      >
                        <option value="">— Sem responsável —</option>
                        {gerentesForm.map(r => <option key={r.id} value={r.id}>{r.nome}{r.cargo_nome ? ` — ${r.cargo_nome}` : ''}</option>)}
                      </select>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 pb-2">
                      <input type="checkbox" checked={formAg.ativo} onChange={e => setFormAg(p => ({ ...p, ativo: e.target.checked }))} className="accent-emerald-600" />
                      Ativo
                    </label>
                    <div className="flex items-center gap-2 ml-auto">
                      {formAg.id && (
                        <button onClick={() => setFormAg(AG_VAZIO)} className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancelar</button>
                      )}
                      <button
                        onClick={handleSalvarAg}
                        disabled={salvandoAg || !formAgValido}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-40"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {salvandoAg ? 'Salvando...' : formAg.id ? 'Salvar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">Horário de Mato Grosso do Sul (Campo Grande). Verificação a cada 5 minutos — a auditoria aparece em até 5 min após o horário.</p>
                </div>

                {/* Lista */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
                  {agendamentos.length === 0 ? (
                    <p className="p-8 text-center text-xs text-slate-400">Nenhuma auditoria programada.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase">
                          <th className="p-3">Empresa</th>
                          <th className="p-3">Dias</th>
                          <th className="p-3">Horário</th>
                          <th className="p-3">Responsável</th>
                          <th className="p-3 text-center">Ativo</th>
                          <th className="p-3">Última execução</th>
                          <th className="p-3 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {agendamentos.map(ag => {
                          const emp = empresaDe(ag.empresa_id)
                          return (
                            <tr key={ag.id} className={formAg.id === ag.id ? 'bg-emerald-50/60' : ''}>
                              <td className="p-3 font-semibold whitespace-nowrap">{emp ? nomeSeletorEmpresa(emp) : '—'}</td>
                              <td className="p-3 whitespace-nowrap">{(ag.dias_semana || []).map(i => DIAS_SEMANA[i]).join(', ')}</td>
                              <td className="p-3 whitespace-nowrap">{String(ag.hora || '').slice(0, 5)}</td>
                              <td className="p-3">{ag.responsavel_nome || '—'}</td>
                              <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ag.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{ag.ativo ? 'Sim' : 'Não'}</span>
                              </td>
                              <td className="p-3">
                                {ag.ultimo_resultado ? (
                                  <div className="space-y-0.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${corResultado[ag.ultimo_resultado] || ''}`}>
                                      {{ gerada: 'Gerada', pulada: 'Não gerada', erro: 'Erro' }[ag.ultimo_resultado]}
                                    </span>
                                    <span className="ml-1.5 text-slate-500">{dh(ag.ultima_execucao_em)}</span>
                                    {ag.ultima_mensagem && <p className="text-[10px] text-slate-500">{ag.ultima_mensagem}</p>}
                                  </div>
                                ) : <span className="text-slate-300">Ainda não executado</span>}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {excluirAgId === ag.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <button onClick={() => handleExcluirAg(ag.id)} className="px-2 py-1 rounded text-[10px] font-bold text-white bg-red-600 hover:bg-red-700">Excluir</button>
                                    <button onClick={() => setExcluirAgId(null)} className="px-2 py-1 rounded text-[10px] font-semibold text-slate-500 hover:bg-slate-100">Voltar</button>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => setFormAg({ id: ag.id, empresa_id: ag.empresa_id, dias_semana: ag.dias_semana || [], hora: String(ag.hora || '').slice(0, 5), responsavel_id: ag.responsavel_id || '', ativo: ag.ativo })}
                                      className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Editar (trocar responsável, dias, horário)"
                                    ><Pencil className="h-3.5 w-3.5" /></button>
                                    <button onClick={() => setExcluirAgId(ag.id)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded" title="Excluir">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL SITUAÇÕES DE AUDITORIA (cadastro, aberto pela engrenagem) */}
      {modalSituacoes && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-50 rounded-lg border border-slate-200 w-full max-w-6xl max-h-[92vh] shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-violet-600" /> Situações de Auditoria
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Cadastro de situações para classificar as OS nas auditorias.</p>
              </div>
              <button onClick={() => setModalSituacoes(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <AuditoriaSituacoes embedded onChange={lista => setSituacoes(lista.filter(s => s.ativo))} />
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DE REABERTURAS */}
      {modalHistorico && auditoriaAtual && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-xl shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <History className="h-4 w-4 text-amber-600" /> Histórico de fechamentos e reaberturas
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auditoria de {fmtDate(auditoriaAtual.data_auditoria)}{auditoriaAtual.empresa_nome ? ` — ${auditoriaAtual.empresa_nome}` : ''}
                </p>
              </div>
              <button onClick={() => setModalHistorico(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {reaberturas.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-400">Esta auditoria ainda não foi fechada nem reaberta.</p>
              ) : (
                // Linha do tempo, em ordem: Fechada → Reaberta → Fechada → …
                <ol className="p-4 space-y-3">
                  {reaberturas.map((r, i) => {
                    const dh = (d) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
                    const fechamento = r.tipo === 'fechamento'
                    const nomeStatus = (s) => ({ respondido_total: 'Respondido Total', respondido_parcial: 'Respondido Parcial', sem_resposta: 'Sem Resposta' }[s] || s || '')
                    const quem = nomePorEmail.get((r.reaberto_por || '').toLowerCase()) || r.reaberto_por || '—'
                    return (
                      <li key={r.id} className="flex items-start gap-3">
                        <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          fechamento ? 'bg-slate-700 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>{i + 1}</span>
                        <div className="text-xs text-slate-600 leading-relaxed">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5 ${
                            fechamento ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {fechamento ? `Fechada — ${nomeStatus(r.resultado)}` : 'Reaberta'}
                          </span>
                          por <strong className="text-slate-800">{quem}</strong>
                          {r.por_admin && <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">ADMIN</span>}
                          {' '}em <strong className="text-slate-800">{dh(r.reaberto_em)}</strong>
                          {!fechamento && (
                            <span className="block text-[11px] text-slate-500">
                              Estava em {nomeStatus(r.status_anterior) || '—'} · novo prazo: {dh(r.prazo_novo)}
                            </span>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENDENCIAR */}
      {modalPendenciar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-5 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Pendenciar OS</h3>
                <p className="text-xs text-slate-500">
                  Marcar <strong className="text-slate-700">{selecionadas.size} OS</strong> selecionada(s) como <strong className="text-red-600">Na Oficina = Não</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalPendenciar(false)}
                disabled={pendenciando}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handlePendenciar}
                disabled={pendenciando}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {pendenciando ? 'Pendenciando...' : 'Pendenciar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MUDAR STATUS DA AUDITORIA */}
      {modalStatus && auditoriaAtual && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-5 space-y-1">
              <h3 className="text-sm font-bold text-slate-900">{modalStatus.titulo}</h3>
              <p className="text-xs text-slate-500">
                Auditoria de <strong className="text-slate-700">{fmtDate(auditoriaAtual.data_auditoria)}</strong>
                {auditoriaAtual.empresa_nome ? ` — ${auditoriaAtual.empresa_nome}` : ''}.
              </p>
              <p className="text-xs text-slate-600 pt-1">{modalStatus.texto}</p>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalStatus(null)}
                disabled={salvandoStatus}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMudarStatus}
                disabled={salvandoStatus}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-50"
              >
                {salvandoStatus ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR AUDITORIA */}
      {modalExcluir && auditoriaAtual && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-5 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Excluir Auditoria</h3>
                <p className="text-xs text-slate-500">
                  Confirma a exclusão da auditoria de <strong className="text-slate-700">{fmtDate(auditoriaAtual.data_auditoria)}</strong>
                  {auditoriaAtual.empresa_nome ? ` — ${auditoriaAtual.empresa_nome}` : ''}?
                </p>
                <p className="text-xs text-red-600 font-semibold mt-1">
                  Todas as {auditoriaAtual.total_os} OS e edições serão removidas permanentemente.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalExcluir(false)}
                disabled={excluindo}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirAuditoria}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO */}
      {modalImportar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[440px] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {empresaImportMicrowork ? 'Importar OS do MicroWork' : 'Importar OS do SharePoint'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Empresa: <strong className="text-slate-700">{(() => { const e = empresas.find(e => e.id === filtroEmpresaId); return e ? nomeSeletorEmpresa(e) : '' })()}</strong>
                  </p>
                  {empresaImportMicrowork ? (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      Fonte: <strong className="text-slate-700">API MicroWork — consulta em tempo real</strong>
                    </p>
                  ) : (
                  <p
                    className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"
                    title="Data de atualização do arquivo ROF001_OSABERTA no SharePoint, usado na importação"
                  >
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    Arquivo atualizado em
                    <strong className={arquivoInfoStatus === 'erro' ? 'text-red-600' : 'text-slate-700'}>
                      {arquivoInfoStatus === 'carregando' ? '...'
                        : arquivoInfoStatus === 'erro' || !arquivoAtualizadoEm ? 'indisponível'
                        : new Date(arquivoAtualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </strong>
                  </p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Responsável pela Auditoria
                </label>
                <div className="relative">
                  <select
                    value={responsavelImportId}
                    onChange={e => setResponsavelImportId(e.target.value)}
                    className="w-full text-xs p-2.5 pr-8 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none"
                  >
                    <option value="">— Sem responsável definido —</option>
                    {responsaveisEmpresa.map(r => (
                      <option key={r.id} value={r.id}>{r.nome}{r.cargo_nome ? ` — ${r.cargo_nome}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">
                  {responsaveisEmpresa.length === 0
                    ? 'Nenhum funcionário ativo dos agrupamentos Gerentes / Gerente Geral nesta empresa (verifique em Funcionários / Cargos).'
                    : 'Funcionários ativos dos agrupamentos Gerentes e Gerente Geral desta empresa. O responsável será gravado em todas as OS importadas.'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalImportar(false)}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA OS — Situação / Observação / Dt. Previsão */}
      {modalDetalheRow && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">OS {modalDetalheRow.os_numero}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Situação, observação e data de previsão.</p>
              </div>
              <button onClick={fecharModalDetalhe} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Situação <span className="text-red-500">*</span></label>
                <select
                  value={formDetalhe.situacao_id}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, situacao_id: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {situacoes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Observação <span className="text-red-500">*</span></label>
                <textarea
                  value={formDetalhe.observacao}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observação..."
                  rows={3}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dt. Previsão <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formDetalhe.data_previsao}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, data_previsao: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {!detalheValido && (
                <p className="text-[10px] text-amber-600 font-semibold">Preencha todos os campos para poder salvar.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
              {/* Excluir informação: limpa Situação/Observação/Dt. Previsão da OS e fecha */}
              <button
                onClick={handleExcluirDetalhe}
                disabled={salvandoDetalhe || !temDetalheSalvo}
                title={temDetalheSalvo ? 'Apagar Situação, Observação e Dt. Previsão desta OS' : 'Nada salvo para excluir'}
                className="mr-auto flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir informação
              </button>
              <button
                onClick={fecharModalDetalhe}
                disabled={salvandoDetalhe}
                className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarDetalhe}
                disabled={salvandoDetalhe || !detalheValido}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-40"
              >
                <Save className={`h-3.5 w-3.5 ${salvandoDetalhe ? 'animate-spin' : ''}`} />
                {salvandoDetalhe ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
