import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSessionState } from '../../hooks/useSessionState'
import { Settings, ChevronRight, ExternalLink, Download, Pencil, CalendarClock, Trash2, Plus, X, AlertTriangle, CopyPlus, Clock, ClipboardList, RefreshCw, Link2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { itensPlanos } from '../../components/monitor/MonitorUI'
import { useAuth } from '../../context/AuthContext'
import { MultiSearchCombobox } from '../../components/SearchCombobox'
import { apiService } from '../../services/api'
import { ACOES_POR_PATH } from '../../config/acoesMenu'

const DIAS_SEMANA = [
  { n: 1, curto: 'Seg', label: 'Segunda-feira' },
  { n: 2, curto: 'Ter', label: 'Terça-feira' },
  { n: 3, curto: 'Qua', label: 'Quarta-feira' },
  { n: 4, curto: 'Qui', label: 'Quinta-feira' },
  { n: 5, curto: 'Sex', label: 'Sexta-feira' },
  { n: 6, curto: 'Sáb', label: 'Sábado' },
  { n: 7, curto: 'Dom', label: 'Domingo' },
]

const TIPOS = [
  { codigo: 'RPA', nome: 'Robert Automation' },
  { codigo: 'PBI', nome: 'Power BI' },
  { codigo: 'FAB', nome: 'Microsoft Fabric' },
]

// Tipo de RPA (21/11/2026, pedido do usuário) — coluna rpa_processos.tipo_processo
const TIPOS_PROCESSO = [
  { codigo: 'EXTRACAO', nome: 'Extração de Arquivos' },
  { codigo: 'OPERACIONAL', nome: 'Operacional' },
]
const nomeTipoProcesso = (c) => TIPOS_PROCESSO.find(t => t.codigo === c)?.nome || null
// Arquivos Extraídos em tabela (21/11/2026): [{ arquivo, pasta }]. Processo antigo sem a lista usa o texto antigo.
const arquivosDoProcesso = (p) => Array.isArray(p?.arquivos_extraidos) && p.arquivos_extraidos.length
  ? p.arquivos_extraidos.map(a => ({ arquivo: a.arquivo || '', pasta: a.pasta || '' }))
  : (p?.relatorios_extraidos ? [{ arquivo: p.relatorios_extraidos, pasta: p.local_fonte || '' }] : [])
// Linhas preenchidas + textos antigos derivados (lista de nomes e de pastas) para quem ainda lê os campos de texto
const arquivosParaSalvar = (linhas) => {
  const ok = (linhas || []).map(l => ({ arquivo: (l.arquivo || '').trim().toUpperCase(), pasta: (l.pasta || '').trim().toUpperCase() }))
    .filter(l => l.arquivo || l.pasta)
  return {
    arquivos_extraidos: ok,
    relatorios_extraidos: ok.map(l => l.arquivo).filter(Boolean).join('\n'),
    local_fonte: [...new Set(ok.map(l => l.pasta).filter(Boolean))].join('\n'),
  }
}

const formatHora = (h) => h ? h.slice(0, 5) : '—'

// Relatórios (PBI/FAB): têm preferência na aba Atualização e podem ter RPA vinculado
const ehRelatorio = (tipo) => tipo === 'PBI' || tipo === 'FAB'

// Só o PBI é configurado em horário de Brasília; RPA e FAB são em MS
const ehBrasilia = (tipo) => tipo === 'PBI'

// Cores de badge por tipo: RPA índigo, PBI âmbar, FAB verde-água (teal)
const tipoBadgeClasses = (tipo) =>
  tipo === 'PBI' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tipo === 'FAB' ? 'bg-teal-50 text-teal-700 border-teal-100'
    : 'bg-indigo-50 text-indigo-700 border-indigo-100'

// Na aba Atualização o RPA usa azul-claro (sky) para casar com as horas
const tipoBadgeAtuClasses = (tipo) =>
  tipo === 'PBI' ? 'bg-amber-50 text-amber-700 border-amber-100'
    : tipo === 'FAB' ? 'bg-teal-50 text-teal-700 border-teal-100'
    : 'bg-sky-50 text-sky-700 border-sky-100'

// PBI/FAB são configurados em horário de Brasília, mas as grades exibem tudo
// em horário de MS (Brasília − 1h, fixo — sem horário de verão desde 2019).
// Horários convertidos ganham "*" e tooltip com o horário real de Brasília.
const horaParaMS = (hora, tipo) => {
  if (!hora || !ehBrasilia(tipo)) return hora
  const [h, m] = hora.split(':')
  return `${String((parseInt(h, 10) + 23) % 24).padStart(2, '0')}:${m}`
}

const tooltipHoraReal = (hora, tipo) =>
  ehBrasilia(tipo) && hora ? `Horário configurado (Brasília): ${formatHora(hora)}` : undefined

// Dia da semana (1=Seg..7=Dom) em MS. Horário de Brasília entre 00:00 e 00:59
// vira 23:xx do dia anterior em MS — o dia também precisa recuar.
const diaParaMS = (dia, hora, tipo) => {
  if (!hora || !ehBrasilia(tipo)) return dia
  return parseInt(hora.split(':')[0], 10) === 0 ? (dia === 1 ? 7 : dia - 1) : dia
}

// Soma N minutos a uma hora "HH:MM" (passa da meia-noite se necessário)
const somarMinutos = (hora, minutos) => {
  if (!hora) return hora
  const [h, m] = hora.split(':').map(Number)
  // tempo do cadastro pode chegar como texto ("5") — converte antes de somar; vazio/ inválido = 15
  const min = minutos === '' || minutos == null ? NaN : Number(minutos)
  const total = (h * 60 + m + (Number.isFinite(min) ? min : 15)) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Traduz erros do Postgres/Supabase para mensagens amigáveis (ex.: violação
// de UNIQUE vira "já se encontra cadastrado").
// Hora "HH:MM" + minutos, devolvendo também quantos dias avançou (0 ou 1)
const somarMinutosComDia = (hora, minutos) => {
  const [h, m] = hora.split(':').map(Number)
  const min = minutos === '' || minutos == null ? NaN : Number(minutos)
  const total = h * 60 + m + (Number.isFinite(min) ? min : 15)
  return { hora: somarMinutos(hora, minutos), avancaDias: Math.floor(total / (24 * 60)) }
}

const msgErro = (err, entidade = 'registro') => {
  const m = err?.message || String(err)
  if (err?.code === '23505' || m.includes('duplicate key')) return `Este ${entidade} já se encontra cadastrado.`
  return m
}

// Caixa de erro inline dos formulários
function ErroForm({ children }) {
  if (!children) return null
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-2.5 py-2 text-[11px] font-semibold">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </div>
  )
}

const novaOcorrencia = () => ({ hora: '' })

const diasVazios = () => Object.fromEntries(DIAS_SEMANA.map(d => [d.n, { ativo: false, execucoes: [novaOcorrencia()] }]))

const formInicial = () => ({
  processo_id: '', processo: '',
  departamento_id: '', departamento_nome: '',
  tipo: '',
  ativo: true,
  dias: diasVazios(),
})

const cmpTexto = (a, b) => (a || '').localeCompare(b || '')

// Cabeçalho de coluna ordenável: clique alterna A→Z / Z→A; seta indica a
// coluna ativa e a direção.
function ThSort({ label, col, sort, onSort, center, className = '' }) {
  const ativo = sort.col === col
  const Icon = ativo ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th className={`p-3 whitespace-nowrap ${center ? 'text-center' : ''} ${className}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        title="Ordenar"
        className={`inline-flex items-center gap-1 uppercase tracking-wider text-[11px] font-semibold transition-colors ${ativo ? 'text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
      >
        {label} <Icon className={`h-3 w-3 shrink-0 ${ativo ? '' : 'opacity-50'}`} />
      </button>
    </th>
  )
}

// Engrenagem da coluna Ações: abre a lista com todas as opções da linha. O menu usa
// position: fixed para não ser cortado pelo overflow da tabela. Itens com `acao`
// ('editar'/'excluir') respeitam a permissão configurada em Grupos de Acesso.
function AcoesMenu({ itens }) {
  const { hasActionOrDefault } = useAuth()
  const [pos, setPos] = useState(null)

  useEffect(() => {
    if (!pos) return
    const fechar = () => setPos(null)
    const onKey = (e) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', fechar, true)
    window.addEventListener('resize', fechar)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', fechar, true)
      window.removeEventListener('resize', fechar)
    }
  }, [pos])

  const permite = (acao) => !acao
    || !(ACOES_POR_PATH['rpa/agendamentos'] || []).some(a => a.value === acao)
    || hasActionOrDefault('rpa/agendamentos', acao)
  const visiveis = itens.filter(i => i.onClick && permite(i.acao))
  if (!visiveis.length) return null

  // Abre para baixo; se não couber até o fim da tela, abre para cima do botão (21/11/2026 — nas últimas linhas
  // o menu ficava fora da tela). Também não passa da borda direita.
  const abrir = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const altura = visiveis.length * 34 + 10 // ~34 px por item + bordas
    const largura = 240 // w-60
    const cabeEmbaixo = r.bottom + 4 + altura <= window.innerHeight - 8
    const top = cabeEmbaixo ? r.bottom + 4 : Math.max(8, r.top - 4 - altura)
    const left = Math.min(r.left, window.innerWidth - largura - 8)
    setPos({ top, left })
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Ações"
        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        <Settings className="h-4 w-4" />
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div style={{ top: pos.top, left: pos.left }} className="fixed z-50 w-60 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs font-medium">
            {visiveis.map(i => (
              <button
                key={i.label}
                type="button"
                onClick={() => { setPos(null); i.onClick() }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i.perigo ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <i.icon className="h-3.5 w-3.5 shrink-0" /> {i.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// Engrenagem do cabeçalho (18/11/2026): reúne Novo Processo, Nova Rotina e Baixar PDF num menu, alinhado à direita.
// Expandir/retrair do processo (substituiu o ⓘ em 18/11/2026): botão antes do nome e linha de detalhe
// logo abaixo com Objetivo, Atende, Processo Realizado e Local da Fonte (cadastro do processo).
function BotaoExpandir({ aberto, onClick }) {
  return (
    <button type="button" data-export-ocultar onClick={onClick} title={aberto ? 'Retrair' : 'Expandir detalhes do processo'}
      className="p-0.5 -ml-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${aberto ? 'rotate-90' : ''}`} />
    </button>
  )
}
// Tabela editável Arquivo × Pasta do cadastro do processo (21/11/2026). Texto em MAIÚSCULAS, como os demais campos.
function TabelaArquivosExtraidos({ linhas, onChange }) {
  const alterar = (i, campo, valor) => onChange(linhas.map((l, k) => (k === i ? { ...l, [campo]: valor.toUpperCase() } : l)))
  const inp = 'w-full text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Arquivos Extraídos</label>
      <div className="border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wide">
            <tr>
              <th className="text-left px-2 py-1.5 font-semibold w-[45%]">Nome do arquivo</th>
              <th className="text-left px-2 py-1.5 font-semibold">Pasta onde fica</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="p-1.5"><input value={l.arquivo} onChange={e => alterar(i, 'arquivo', e.target.value)} placeholder="Ex.: RFS026_RELICMSESTADO" className={inp} /></td>
                <td className="p-1.5"><input value={l.pasta} onChange={e => alterar(i, 'pasta', e.target.value)} placeholder="Ex.: SharePoint › Banco de Dados › Contabilidade" className={inp} /></td>
                <td className="p-1.5 text-center">
                  <button type="button" onClick={() => onChange(linhas.filter((_, k) => k !== i))} title="Remover este arquivo"
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </td>
              </tr>
            ))}
            {!linhas.length && <tr><td colSpan={3} className="px-2 py-2 text-[11px] text-slate-400">Nenhum arquivo informado.</td></tr>}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => onChange([...linhas, { arquivo: '', pasta: linhas[linhas.length - 1]?.pasta || '' }])}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
        <Plus className="h-3.5 w-3.5" /> Adicionar arquivo
      </button>
    </div>
  )
}

function LinhaDetalheProcesso({ p, colSpan }) {
  const campos = [
    ['Objetivo do Processo', p?.objetivo],
    ['Atende', p?.atende],
  ]
  return (
    <tr className="bg-slate-50/60">
      <td data-export-ocultar />
      <td colSpan={colSpan} className="px-3 pb-3 pt-1">
        {/* Um campo abaixo do outro, fonte menor; fica preso à esquerda para não sumir na rolagem lateral */}
        <div className="sticky left-3 max-w-[760px] space-y-1.5">
          {campos.map(([rot, val]) => (
            <div key={rot} className="min-w-0">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{rot}</div>
              <div className={`text-[10px] leading-snug whitespace-pre-wrap break-words ${val ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>{val || '—'}</div>
            </div>
          ))}
          {/* Arquivos Extraídos × Pasta (21/11/2026) */}
          <div className="min-w-0">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide leading-tight">Arquivos Extraídos</div>
            {arquivosDoProcesso(p).length ? (
              <table className="mt-0.5 text-[10px] border border-slate-200 rounded bg-white">
                <thead><tr className="bg-slate-50 text-slate-500"><th className="text-left px-2 py-1 font-semibold">Arquivo</th><th className="text-left px-2 py-1 font-semibold">Pasta</th></tr></thead>
                <tbody>
                  {arquivosDoProcesso(p).map((a, i) => (
                    <tr key={i} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-1 text-slate-700 font-medium break-words">{a.arquivo || '—'}</td>
                      <td className="px-2 py-1 text-slate-600 break-words">{a.pasta || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="text-[10px] text-slate-300">—</div>}
          </div>
        </div>
      </td>
    </tr>
  )
}

// Item com `submenu` (ex.: Exportar → PDF/PNG/JPG) abre as opções logo abaixo dele, ao clicar.
function EngrenagemCabecalho({ itens }) {
  const [pos, setPos] = useState(null)
  const [aberto, setAberto] = useState(null)
  useEffect(() => { if (!pos) setAberto(null) }, [pos])
  useEffect(() => {
    if (!pos) return
    const fechar = () => setPos(null)
    const onKey = (e) => { if (e.key === 'Escape') fechar() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', fechar)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', fechar) }
  }, [pos])
  if (!itens.length) return null
  const abrir = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
  }
  return (
    <>
      <button type="button" onClick={pos ? () => setPos(null) : abrir} title="Ações" aria-label="Ações"
        className="flex items-center justify-center p-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors">
        <Settings className="h-3.5 w-3.5" />
      </button>
      {pos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPos(null)} />
          <div style={{ top: pos.top, right: pos.right }} className="fixed z-50 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 text-xs font-medium">
            {itens.map(i => i.submenu ? (
              <div key={i.label}>
                <button type="button" disabled={i.disabled}
                  onClick={() => setAberto(a => a === i.label ? null : i.label)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                  <i.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{i.label}</span>
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${aberto === i.label ? 'rotate-90' : ''}`} />
                </button>
                {aberto === i.label && (
                  <div className="bg-slate-50 border-y border-slate-100 py-1">
                    {i.submenu.map(s => (
                      <button key={s.label} type="button" disabled={s.disabled}
                        onClick={() => { setPos(null); s.onClick() }}
                        className="w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-left text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button key={i.label} type="button" disabled={i.disabled}
                onClick={() => { setPos(null); i.onClick() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                <i.icon className="h-3.5 w-3.5 shrink-0" /> {i.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

const _cache = { uid: null, dados: null, departamentos: null, processos: null }

// sistema (21/11/2026): RPA | PBI | FAB — a tela vira o monitor de um sistema só (menus Monitor Robert Automation,
// Monitor Power BI e Monitor Microsoft Fabric): filtra os processos por tipo e o cadastro novo já nasce desse tipo.
// abaExterna (21/11/2026): processos | horario | atualizacao — a aba vem da fileira única de abas do monitor
// (BiRpaExecucoes) e o seletor interno some.
// setorExterno / onSetorExterno (21/11/2026): o filtro de setor vem do monitor e vale para TODAS as abas (Dashboard e
// Controle ao mesmo tempo). Compara pela "chave" do setor (sem acento, espaço ou pontuação: "Pos Vendas" = "PÓS-VENDAS").
const chaveSetorTxt = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
export default function RpaAgendamentos({ acoesDireita = null, slotAcoes = null, sistema = null, abaExterna = null, setorExterno = null, onSetorExterno = null }) {
  const { hasPermission, user } = useAuth()
  const uid = user?.id ?? user?.email ?? null
  // cache em memória só vale para o mesmo usuário (troca de login sem recarregar a página)
  if (_cache.uid !== uid) Object.assign(_cache, { uid, dados: null, departamentos: null, processos: null })
  const [dados, setDados] = useState(() => _cache.dados ?? [])
  const [departamentos, setDepartamentos] = useState(() => _cache.departamentos ?? [])
  const [processos, setProcessos] = useState(() => _cache.processos ?? [])
  const [loading, setLoading] = useState(() => _cache.dados === null)
  const [error, setError] = useState(null)
  const [erroRecarga, setErroRecarga] = useState(null)

  // O filtro de setor guarda o NOME do setor: boa parte das rotinas/processos tem só o nome
  // gravado (departamento_id nulo), então comparar por id escondia esses registros.
  const [filtroDept, setFiltroDept] = useSessionState('rpa_agend_filtro_setor', '')
  const nomeSetor = (id, nome) => nome || departamentos.find(d => d.id === id)?.nome_departamento || ''
  const usaSetorExterno = typeof onSetorExterno === 'function'
  const setorPassa = (id, nome) => usaSetorExterno
    ? (!setorExterno?.chave || chaveSetorTxt(nomeSetor(id, nome)) === setorExterno.chave)
    : (!filtroDept || nomeSetor(id, nome) === filtroDept)
  const [filtroTipo, setFiltroTipo] = useSessionState('rpa_agend_filtro_tipo', [])
  // Seleção múltipla de tipos; compatível com o valor antigo (string) salvo no navegador
  const tiposFiltro = sistema ? [sistema] : Array.isArray(filtroTipo) ? filtroTipo : (filtroTipo ? [filtroTipo] : [])
  const tipoPassa = (tipo) => tiposFiltro.length === 0 || tiposFiltro.includes(tipo)
  const toggleFiltroTipo = (codigo) => {
    setFiltroTipo(prev => {
      const arr = Array.isArray(prev) ? prev : (prev ? [prev] : [])
      return arr.includes(codigo) ? arr.filter(c => c !== codigo) : [...arr, codigo]
    })
  }
  // Seleção de processos (um, vários ou nenhum = todos)
  const [filtroProc, setFiltroProc] = useSessionState('rpa_agend_filtro_proc', [])
  const procsFiltro = Array.isArray(filtroProc) ? filtroProc : []
  const procPassa = (id) => procsFiltro.length === 0 || procsFiltro.includes(id)
  // 18/11/2026: a aba Por Rotina foi unificada na aba Processos (grade semanal + cadastro na mesma aba);
  // quem tinha 'rotina' guardado na sessão cai em 'processos'.
  const [visualizacaoSalva, setVisualizacao] = useSessionState('rpa_agend_visualizacao', 'processos')
  const visualizacao = abaExterna || (visualizacaoSalva === 'rotina' ? 'processos' : visualizacaoSalva)
  const [sortRotina, setSortRotina] = useSessionState('rpa_agend_sort_rotina', { col: 'hora', dir: 'asc' })
  const [sortHorario, setSortHorario] = useSessionState('rpa_agend_sort_horario', { col: 'hora', dir: 'asc' })
  const [sortProc, setSortProc] = useSessionState('rpa_agend_sort_proc', { col: 'nome', dir: 'asc' })
  const [sortAtu, setSortAtu] = useSessionState('rpa_agend_sort_atu', { col: 'hora', dir: 'asc' })

  const toggleSort = (setter) => (col) =>
    setter(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  const toggleSortRotina = toggleSort(setSortRotina)
  const toggleSortHorario = toggleSort(setSortHorario)
  const toggleSortProc = toggleSort(setSortProc)
  const toggleSortAtu = toggleSort(setSortAtu)

  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [form, setForm] = useState(formInicial())
  const [salvando, setSalvando] = useState(false)
  const [novoProcessoAberto, setNovoProcessoAberto] = useState(false)
  const [novoProcessoNome, setNovoProcessoNome] = useState('')
  const [novoProcessoDeptId, setNovoProcessoDeptId] = useState('')
  const [novoProcessoTipo, setNovoProcessoTipo] = useState(sistema || 'RPA')
  const [novoProcessoRpaVincId, setNovoProcessoRpaVincId] = useState('')
  const [criandoProcesso, setCriandoProcesso] = useState(false)

  const [modalNovoProcessoAberto, setModalNovoProcessoAberto] = useState(false)
  const [novoProcessoNomeHeader, setNovoProcessoNomeHeader] = useState('')
  const [novoProcessoDeptIdHeader, setNovoProcessoDeptIdHeader] = useState('')
  const [novoProcessoTipoHeader, setNovoProcessoTipoHeader] = useState('RPA')
  const [novoProcessoRpaVincIdHeader, setNovoProcessoRpaVincIdHeader] = useState('')
  const [novoProcessoTempoHeader, setNovoProcessoTempoHeader] = useState(15)
  const [novoProcessoAtivoHeader, setNovoProcessoAtivoHeader] = useState(true)
  // Documentação do processo (18/11/2026): o que atende, relatórios extraídos e local da fonte
  // Linhas expandidas na tabela da aba Processos (detalhe do processo abaixo da linha)
  const [expandidos, setExpandidos] = useState(() => new Set())
  const alternarExpandido = (chave) => setExpandidos(prev => {
    const s = new Set(prev)
    if (s.has(chave)) s.delete(chave); else s.add(chave)
    return s
  })
  const [docProcesso, setDocProcesso] = useState({ tipo_processo: '', tempo_humano_min: '', objetivo: '', atende: '', relatorios_extraidos: '', local_fonte: '', arquivos_extraidos: [] })
  const [criandoProcessoHeader, setCriandoProcessoHeader] = useState(false)
  const [procEditId, setProcEditId] = useState(null)
  const [modalExcluirProcAberto, setModalExcluirProcAberto] = useState(false)
  const [procExcluir, setProcExcluir] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(false)
  const [erroRotina, setErroRotina] = useState(null)
  const [erroProcesso, setErroProcesso] = useState(null)
  const [erroProcessoHeader, setErroProcessoHeader] = useState(null)

  const [templateHora, setTemplateHora] = useState('')
  const [diasTemplate, setDiasTemplate] = useState(() => new Set())
  const [execSelecionadas, setExecSelecionadas] = useState(() => new Set())

  const canEdit = hasPermission('rpa/agendamentos')

  useEffect(() => { loadDados(_cache.dados !== null) }, [])
  useEffect(() => { _cache.dados = dados }, [dados])
  useEffect(() => { _cache.departamentos = departamentos }, [departamentos])
  useEffect(() => { _cache.processos = processos }, [processos])

  const loadDados = async (silent = false) => {
    if (!silent) { setLoading(true); setError(null) }
    try {
      const [rotinas, deps, procs] = await Promise.all([
        apiService.getRpaGradeSemanal(),
        apiService.getDepartamentos(),
        apiService.getRpaProcessos(),
      ])
      setDados(rotinas)
      setDepartamentos(deps.filter(d => d.ativo))
      setProcessos(procs)
      setErroRecarga(null)
    } catch (err) {
      if (!silent) setError(err.message || String(err))
      else setErroRecarga(err.message || String(err))
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(formInicial())
    setErroRotina(null)
    setErroProcesso(null)
    setNovoProcessoAberto(false)
    setNovoProcessoNome('')
    setNovoProcessoDeptId('')
    setNovoProcessoTipo(sistema || 'RPA')
    setTemplateHora('')
    setDiasTemplate(new Set())
    setExecSelecionadas(new Set())
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    const proc = processos.find(p => p.id === item.processo_id)
    setForm({
      processo_id: item.processo_id || '',
      processo: item.processo || '',
      departamento_id: item.departamento_id || '',
      departamento_nome: item.departamento_nome || '',
      tipo: proc?.tipo || (item.execucoes || []).find(e => e.tipo)?.tipo || 'RPA',
      ativo: item.ativo,
      dias: Object.fromEntries(DIAS_SEMANA.map(d => {
        const ocorrencias = (item.porDia?.[d.n] || []).slice().sort((a, b) => cmpTexto(a.hora, b.hora))
        return [d.n, {
          ativo: !!ocorrencias.length,
          execucoes: ocorrencias.length ? ocorrencias.map(o => ({ hora: o.hora || '' })) : [novaOcorrencia()],
        }]
      })),
    })
    setErroRotina(null)
    setErroProcesso(null)
    setNovoProcessoAberto(false)
    setNovoProcessoNome('')
    setNovoProcessoDeptId('')
    setNovoProcessoTipo(sistema || 'RPA')
    setTemplateHora('')
    setDiasTemplate(new Set())
    setExecSelecionadas(new Set())
    setModalAberto(true)
  }

  // Abre "Incluir Nova Rotina" com o processo já selecionado (usado nos
  // chips do alerta de processos sem agendamento)
  const abrirIncluirComProcesso = (p) => {
    abrirIncluir()
    setForm({
      ...formInicial(),
      processo_id: p.id,
      processo: p.nome || '',
      departamento_id: p.departamento_id || '',
      departamento_nome: p.departamento_nome || '',
      tipo: p.tipo || 'RPA',
    })
  }

  // Aba Processos: clicar no nome abre a edição dos horários de agendamento
  // (a rotina do processo) — o lápis da coluna Ações continua editando os
  // dados do processo em si (nome/tipo/setor/vínculo).
  const abrirAgendamentoDoProcesso = (proc) => {
    const rotina = dados.find(r => r.processo_id === proc.id)
    if (rotina) abrirEditar(rotina)
    else abrirIncluirComProcesso(proc)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, processo: item.processo }))
    setModalExcluirAberto(true)
  }

  const toggleDia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], ativo: !prev.dias[n].ativo } } }))
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const addOcorrencia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], execucoes: [...prev.dias[n].execucoes, novaOcorrencia()] } } }))
  }

  const removeOcorrencia = (n, idx) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ...prev.dias[n], execucoes: prev.dias[n].execucoes.filter((_, i) => i !== idx) } } }))
    // índices mudam após a remoção — limpa a seleção desse dia p/ evitar checkbox referenciando a linha errada
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const limparDia = (n) => {
    setForm(prev => ({ ...prev, dias: { ...prev.dias, [n]: { ativo: false, execucoes: [novaOcorrencia()] } } }))
    setExecSelecionadas(prev => new Set([...prev].filter(k => !k.startsWith(`${n}|`))))
  }

  const limparCronograma = () => {
    setForm(prev => ({ ...prev, dias: diasVazios() }))
    setExecSelecionadas(new Set())
  }

  const chaveExec = (n, idx) => `${n}|${idx}`

  const toggleExecSelecionada = (chave) => {
    setExecSelecionadas(prev => {
      const next = new Set(prev)
      if (next.has(chave)) next.delete(chave)
      else next.add(chave)
      return next
    })
  }

  const todasChavesExec = (dias) =>
    DIAS_SEMANA.flatMap(d => dias[d.n].ativo ? dias[d.n].execucoes.map((_, idx) => chaveExec(d.n, idx)) : [])

  const toggleSelecionarTodasExec = () => {
    const todas = todasChavesExec(form.dias)
    setExecSelecionadas(prev => prev.size === todas.length ? new Set() : new Set(todas))
  }

  const excluirSelecionadas = () => {
    if (execSelecionadas.size === 0) return
    setForm(prev => {
      const dias = { ...prev.dias }
      DIAS_SEMANA.forEach(d => {
        if (!dias[d.n].ativo) return
        const restantes = dias[d.n].execucoes.filter((_, idx) => !execSelecionadas.has(chaveExec(d.n, idx)))
        dias[d.n] = restantes.length
          ? { ativo: true, execucoes: restantes }
          : { ativo: false, execucoes: [novaOcorrencia()] }
      })
      return { ...prev, dias }
    })
    setExecSelecionadas(new Set())
  }

  // Agrupa as execuções preenchidas por hora (HH:MM): chips no topo do
  // cronograma para marcar/desmarcar todos os horários iguais de uma vez
  const horasDoCronograma = (() => {
    const grupos = {}
    DIAS_SEMANA.forEach(d => {
      const dia = form.dias[d.n]
      if (!dia.ativo) return
      dia.execucoes.forEach((oc, idx) => {
        if (!oc.hora) return
        const h = oc.hora.slice(0, 5)
        if (!grupos[h]) grupos[h] = []
        grupos[h].push(chaveExec(d.n, idx))
      })
    })
    return Object.entries(grupos)
      .map(([hora, chaves]) => ({ hora, chaves }))
      .sort((a, b) => cmpTexto(a.hora, b.hora))
  })()

  const toggleGrupoHora = (chaves) => {
    setExecSelecionadas(prev => {
      const todasMarcadas = chaves.every(k => prev.has(k))
      const next = new Set(prev)
      chaves.forEach(k => { if (todasMarcadas) next.delete(k); else next.add(k) })
      return next
    })
  }

  const setOcorrenciaCampo = (n, idx, campo, valor) => {
    setForm(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [n]: {
          ...prev.dias[n],
          execucoes: prev.dias[n].execucoes.map((oc, i) => i === idx ? { ...oc, [campo]: valor } : oc),
        },
      },
    }))
  }

  const toggleDiaTemplate = (n) => {
    setDiasTemplate(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const toggleTodosDiasTemplate = () => {
    setDiasTemplate(prev => prev.size === DIAS_SEMANA.length ? new Set() : new Set(DIAS_SEMANA.map(d => d.n)))
  }

  const aplicarTemplate = () => {
    if (!templateHora || diasTemplate.size === 0) return
    setForm(prev => {
      const dias = { ...prev.dias }
      diasTemplate.forEach(n => {
        const dia = dias[n]
        const semHoraPreenchida = dia.execucoes.length === 1 && !dia.execucoes[0].hora
        dias[n] = {
          ativo: true,
          execucoes: semHoraPreenchida
            ? [{ hora: templateHora }]
            : [...dia.execucoes, { hora: templateHora }],
        }
      })
      return { ...prev, dias }
    })
  }

  const handleProcessoChange = (id) => {
    const proc = processos.find(p => p.id === id)
    setForm(prev => ({
      ...prev,
      processo_id: id,
      processo: proc?.nome || '',
      departamento_id: proc?.departamento_id || '',
      departamento_nome: proc?.departamento_nome || '',
      tipo: proc?.tipo || '',
    }))
  }

  const handleCriarProcesso = async () => {
    const nome = novoProcessoNome.trim()
    if (!nome) return
    setCriandoProcesso(true)
    setErroProcesso(null)
    try {
      const dep = departamentos.find(d => d.id === novoProcessoDeptId)
      const rpaVinc = processos.find(p => p.id === novoProcessoRpaVincId)
      const criado = await apiService.createRpaProcesso({ nome, departamento_id: novoProcessoDeptId, departamento_nome: dep?.nome_departamento, tipo: novoProcessoTipo, rpa_vinculado_id: novoProcessoRpaVincId, rpa_vinculado_nome: rpaVinc?.nome })
      setProcessos(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      setForm(prev => ({
        ...prev,
        processo_id: criado.id,
        processo: criado.nome,
        departamento_id: criado.departamento_id || '',
        departamento_nome: criado.departamento_nome || '',
        tipo: criado.tipo || 'RPA',
      }))
      setNovoProcessoNome('')
      setNovoProcessoDeptId('')
      setNovoProcessoTipo(sistema || 'RPA')
      setNovoProcessoRpaVincId('')
      setNovoProcessoAberto(false)
    } catch (err) {
      setErroProcesso(msgErro(err, 'processo/relatório'))
    } finally {
      setCriandoProcesso(false)
    }
  }

  const abrirNovoProcessoHeader = () => {
    setProcEditId(null)
    setNovoProcessoNomeHeader('')
    setNovoProcessoDeptIdHeader('')
    setNovoProcessoTipoHeader(sistema || 'RPA')
    setNovoProcessoRpaVincIdHeader('')
    setNovoProcessoTempoHeader(15)
    setNovoProcessoAtivoHeader(true)
    setDocProcesso({ tipo_processo: '', tempo_humano_min: '', objetivo: '', atende: '', relatorios_extraidos: '', local_fonte: '', arquivos_extraidos: [] })
    setErroProcessoHeader(null)
    setModalNovoProcessoAberto(true)
  }

  const abrirEditarProcesso = (p) => {
    setProcEditId(p.id)
    setNovoProcessoNomeHeader(p.nome || '')
    setNovoProcessoDeptIdHeader(p.departamento_id || '')
    setNovoProcessoTipoHeader(p.tipo || 'RPA')
    setNovoProcessoRpaVincIdHeader(p.rpa_vinculado_id || '')
    setNovoProcessoTempoHeader(p.tempo_atualizacao_min ?? 15)
    setNovoProcessoAtivoHeader(p.ativo)
    setDocProcesso({ arquivos_extraidos: arquivosDoProcesso(p), tempo_humano_min: p.tempo_humano_min ?? '', tipo_processo: p.tipo_processo || '', objetivo: p.objetivo || '', atende: p.atende || '', relatorios_extraidos: p.relatorios_extraidos || '', local_fonte: p.local_fonte || '' })
    setErroProcessoHeader(null)
    setModalNovoProcessoAberto(true)
  }

  const handleCriarProcessoHeader = async (e) => {
    e.preventDefault()
    const nome = novoProcessoNomeHeader.trim()
    if (!nome) return
    setCriandoProcessoHeader(true)
    setErroProcessoHeader(null)
    try {
      const dep = departamentos.find(d => d.id === novoProcessoDeptIdHeader)
      const rpaVinc = processos.find(p => p.id === novoProcessoRpaVincIdHeader)
      const payload = {
        nome,
        departamento_id: novoProcessoDeptIdHeader,
        departamento_nome: dep?.nome_departamento,
        tipo: novoProcessoTipoHeader,
        rpa_vinculado_id: novoProcessoRpaVincIdHeader,
        rpa_vinculado_nome: rpaVinc?.nome,
        tempo_atualizacao_min: Number(novoProcessoTempoHeader) > 0 ? Number(novoProcessoTempoHeader) : 15,
        ...docProcesso,
        ...arquivosParaSalvar(docProcesso.arquivos_extraidos),
        ativo: novoProcessoAtivoHeader,
      }
      if (procEditId) {
        const atual = processos.find(p => p.id === procEditId)
        if (atual && ehBrasilia(atual.tipo) !== ehBrasilia(novoProcessoTipoHeader) && rotinasDoProcesso(procEditId) > 0) {
          const ok = window.confirm(
            `Trocar o tipo de ${atual.tipo} para ${novoProcessoTipoHeader} muda o fuso dos horários já agendados ` +
            `(Power BI é em horário de Brasília; RPA e Fabric, em MS). Os horários gravados serão reinterpretados ` +
            `e deslocados em 1h na tela — revise-os depois. Deseja continuar?`
          )
          if (!ok) return
        }
        await apiService.updateRpaProcesso(procEditId, payload)
        await loadDados(true)
      } else {
        const criado = await apiService.createRpaProcesso(payload)
        setProcessos(prev => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)))
      }
      setNovoProcessoNomeHeader('')
      setNovoProcessoDeptIdHeader('')
      setModalNovoProcessoAberto(false)
    } catch (err) {
      setErroProcessoHeader(msgErro(err, 'processo/relatório'))
    } finally {
      setCriandoProcessoHeader(false)
    }
  }

  const abrirExcluirProcesso = (p) => {
    setProcExcluir(p)
    setModalExcluirProcAberto(true)
  }

  // Exporta a tabela da aba aberta (Processos, Agenda ou Atualização) em PDF (A4 paisagem),
  // PNG ou JPG — html2canvas + jsPDF via import dinâmico (mesmo padrão de AtaReuniao.jsx).
  // A coluna Ações (engrenagens) não entra na exportação.
  const ABAS_EXPORT = {
    processos: { id: 'rpa-processos-tabela', titulo: 'Processos', arquivo: 'processos-rpa' },
    horario: { id: 'rpa-horario-tabela', titulo: 'Agenda', arquivo: 'agenda-rpa' },
    atualizacao: { id: 'rpa-atualizacao-tabela', titulo: 'Atualização', arquivo: 'atualizacao-rpa-powerbi' },
  }
  const handleExportar = async (formato) => {
    const aba = ABAS_EXPORT[visualizacao]
    const el = aba && document.getElementById(aba.id)
    if (!el) return
    setGerandoPDF(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])
      const nomeMonitor = { RPA: 'Monitor Robert Automation', PBI: 'Monitor Power BI', FAB: 'Monitor Microsoft Fabric' }[sistema] || 'Controle de Processos'
      const tituloTxt = `${aba.titulo} — ${nomeMonitor}`
      const geradoTxt = `Gerado em ${new Date().toLocaleString('pt-BR')}`
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        // a tabela fica num contêiner com overflow-x: captura a largura inteira, não só a visível
        width: el.scrollWidth, windowWidth: el.scrollWidth,
        onclone: (doc) => {
          const c = doc.getElementById(aba.id)
          if (c) {
            c.style.overflow = 'visible'
            c.querySelectorAll('[data-export-ocultar]').forEach(n => n.remove())
            // O html2canvas calcula a altura da linha menor que o navegador e corta a parte de baixo das letras;
            // "sticky" e "truncate" também saem errados na imagem. Só na cópia: altura de linha folgada, nada
            // grudado, nada cortado e o texto alinhado ao centro das células.
            const st = doc.createElement('style')
            st.textContent = `
              #${aba.id} * { line-height: 1.45 !important; text-overflow: clip !important; }
              #${aba.id} .sticky { position: static !important; }
              #${aba.id} .truncate, #${aba.id} .line-clamp-3 { overflow: visible !important; white-space: normal !important; -webkit-line-clamp: unset !important; }
              #${aba.id} span.inline-block, #${aba.id} button.inline-block { padding-top: 2px !important; padding-bottom: 4px !important; vertical-align: middle !important; }
              #${aba.id} td { vertical-align: middle !important; }
              #${aba.id} table table td, #${aba.id} table table th { padding-top: 3px !important; padding-bottom: 5px !important; }
            `
            doc.head.appendChild(st)
          }
        },
      })

      if (formato === 'png' || formato === 'jpg') {
        // imagem única: faixa de título em cima + tabela
        const PAD = 32, CAB = 90
        const img = document.createElement('canvas')
        img.width = canvas.width + PAD * 2
        img.height = canvas.height + CAB + PAD
        const ctx = img.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, img.width, img.height)
        ctx.fillStyle = '#1e293b'
        ctx.font = 'bold 32px sans-serif'
        ctx.fillText(tituloTxt, PAD, PAD + 28)
        ctx.fillStyle = '#787878'
        ctx.font = '20px sans-serif'
        ctx.fillText(geradoTxt, PAD, PAD + 58)
        ctx.drawImage(canvas, PAD, CAB)
        const url = formato === 'png' ? img.toDataURL('image/png') : img.toDataURL('image/jpeg', 0.93)
        const a = document.createElement('a')
        a.href = url
        a.download = `${aba.arquivo}.${formato}`
        document.body.appendChild(a)
        a.click()
        a.remove()
        return
      }

      const MARGIN = 20
      const TITULO_H = 40
      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
      const CW = pdf.internal.pageSize.getWidth() - 2 * MARGIN
      const CH = pdf.internal.pageSize.getHeight() - 2 * MARGIN

      pdf.setFontSize(14)
      pdf.setFont(undefined, 'bold')
      pdf.setTextColor(30, 41, 59)
      pdf.text(tituloTxt, MARGIN, MARGIN + 10)
      pdf.setFontSize(8)
      pdf.setFont(undefined, 'normal')
      pdf.setTextColor(120, 120, 120)
      pdf.text(geradoTxt, MARGIN, MARGIN + 24)

      let sy = 0
      let primeira = true
      while (sy < canvas.height) {
        const alturaDisponivel = primeira ? CH - TITULO_H : CH
        const fatiaPx = Math.min(canvas.height - sy, Math.floor(canvas.width * alturaDisponivel / CW))
        const fatia = document.createElement('canvas')
        fatia.width = canvas.width
        fatia.height = fatiaPx
        fatia.getContext('2d').drawImage(canvas, 0, sy, canvas.width, fatiaPx, 0, 0, canvas.width, fatiaPx)
        if (!primeira) pdf.addPage()
        pdf.addImage(fatia.toDataURL('image/jpeg', 0.93), 'JPEG', MARGIN, primeira ? MARGIN + TITULO_H : MARGIN, CW, (fatiaPx / canvas.width) * CW)
        sy += fatiaPx
        primeira = false
      }
      pdf.save(`${aba.arquivo}.pdf`)
    } catch (err) {
      alert('Erro ao exportar: ' + (err.message || String(err)))
    } finally {
      setGerandoPDF(false)
    }
  }

  const handleConfirmarExclusaoProcesso = async () => {
    try {
      await apiService.deleteRpaProcesso(procExcluir.id)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir processo: ' + msgErro(err, 'processo/relatório'))
    } finally {
      setModalExcluirProcAberto(false)
    }
  }

  // Outros processos (rotinas ativas) agendados no mesmo dia e horário, comparando em
  // horário de MS (PBI é convertido de Brasília) — ou seja, os que "batem de frente".
  const outrosNoMesmoHorario = (processoId, diaN, hora, tipo) => {
    if (!hora) return []
    const alvoH = formatHora(horaParaMS(hora, tipo))
    const alvoD = diaParaMS(diaN, hora, tipo)
    const nomes = new Set()
    dados.forEach(r => {
      if (!r.ativo || r.processo_id === processoId) return
      ;(r.execucoes || []).forEach(e => {
        if (e.hora && formatHora(horaParaMS(e.hora, e.tipo)) === alvoH && diaParaMS(e.dia_semana, e.hora, e.tipo) === alvoD) {
          nomes.add(r.processo || '—')
        }
      })
    })
    return [...nomes]
  }

  // Texto descrevendo a rotina que já existe para o processo: situação, horários e coincidências
  const descreverRotinaExistente = (processoId) => {
    const r = dados.find(x => x.processo_id === processoId)
    if (!r) return ''
    const execs = (r.execucoes || []).filter(e => e.hora)
    const situacao = !r.ativo ? ' (está INATIVA)' : execs.length === 0 ? ' (está sem horários)' : ''
    const horas = [...new Set(execs.map(e => formatHora(horaParaMS(e.hora, e.tipo))))].sort()
    const coincide = []
    execs.forEach(e => {
      const dia = DIAS_SEMANA.find(d => d.n === diaParaMS(e.dia_semana, e.hora, e.tipo))
      outrosNoMesmoHorario(processoId, e.dia_semana, e.hora, e.tipo).forEach(nome => {
        coincide.push(`${nome} (${dia?.curto} ${formatHora(horaParaMS(e.hora, e.tipo))})`)
      })
    })
    return `${situacao}${horas.length ? ` — horários atuais (MS): ${horas.join(', ')}` : ''}` +
      (coincide.length ? `. Coincide com: ${coincide.slice(0, 5).join('; ')}${coincide.length > 5 ? ` e mais ${coincide.length - 5}` : ''}` : '')
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    // Dia marcado sem nenhum horário preenchido seria descartado em silêncio
    const diaSemHora = DIAS_SEMANA.find(d => form.dias[d.n].ativo && !form.dias[d.n].execucoes.some(oc => oc.hora))
    if (diaSemHora) {
      setErroRotina(`Preencha o horário de ${diaSemHora.label} ou desmarque o dia.`)
      return
    }
    // Uma rotina por processo: evita duplicar o agendamento
    if (!editingId && dados.some(r => r.processo_id === form.processo_id)) {
      setErroRotina(`Este processo já possui rotina${descreverRotinaExistente(form.processo_id)}. Edite a rotina existente para ajustar os horários.`)
      return
    }
    // Todas as execuções assumem o tipo do processo selecionado (horários repetidos no mesmo dia são unificados)
    const execucoes = DIAS_SEMANA
      .filter(d => form.dias[d.n].ativo)
      .flatMap(d => [...new Set(form.dias[d.n].execucoes.filter(oc => oc.hora).map(oc => oc.hora.slice(0, 5)))]
        .map(hora => ({ dia_semana: d.n, hora, tipo: form.tipo || 'RPA' })))

    setSalvando(true)
    setErroRotina(null)
    try {
      if (editingId) await apiService.updateRpaRotina(editingId, { ...form, execucoes })
      else await apiService.createRpaRotina({ ...form, execucoes })
      await loadDados(true)
      setModalAberto(false)
    } catch (err) {
      setErroRotina(msgErro(err, 'rotina'))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteRpaRotina(idExcluir)
      await loadDados(true)
    } catch (err) {
      alert('Erro ao excluir rotina: ' + msgErro(err, 'rotina'))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  const rotinasFiltradas = dados.filter(r => {
    if (!setorPassa(r.departamento_id, r.departamento_nome)) return false
    if (tiposFiltro.length && !(r.execucoes || []).some(e => tipoPassa(e.tipo))) return false
    if (!procPassa(r.processo_id)) return false
    return true
  })

  // Visão "Por Rotina": cada horário distinto vira uma linha separada — um
  // processo com mais de uma hora registrada aparece em várias linhas, cada
  // uma com os dias em que aquela hora roda. A ordenação é aplicada linha a
  // linha (não por rotina), para a classificação por hora valer globalmente.
  const linhasRotina = rotinasFiltradas.flatMap(r => {
    const tempo = processos.find(p => p.id === r.processo_id)?.tempo_atualizacao_min ?? 15
    const porHora = {}
    DIAS_SEMANA.forEach(d => {
      ;(r.porDia[d.n] || [])
        .filter(oc => tipoPassa(oc.tipo))
        .forEach(oc => {
          const key = `${formatHora(horaParaMS(oc.hora, oc.tipo))}|${oc.tipo || ''}`
          if (!porHora[key]) porHora[key] = { rotina: r, hora: oc.hora, tipo: oc.tipo, tempo, dias: {} }
          porHora[key].dias[diaParaMS(d.n, oc.hora, oc.tipo)] = oc
        })
    })
    const linhas = Object.values(porHora)
    return linhas.length ? linhas : [{ rotina: r, hora: null, tipo: null, tempo, dias: {} }]
  }).sort((a, b) => {
    const dir = sortRotina.dir === 'asc' ? 1 : -1
    const horaMS = (l) => l.hora ? formatHora(horaParaMS(l.hora, l.tipo)) : null
    let v
    if (sortRotina.col === 'setor') {
      v = cmpTexto(a.rotina.departamento_nome, b.rotina.departamento_nome)
    } else if (sortRotina.col === 'processo') {
      v = cmpTexto(a.rotina.processo, b.rotina.processo)
    } else if (sortRotina.col === 'tipo') {
      v = cmpTexto(a.tipo, b.tipo)
    } else {
      // ordenação automática por hora exibida; linhas sem hora vão para o fim
      const ha = horaMS(a)
      const hb = horaMS(b)
      if ((ha === null) !== (hb === null)) return ha === null ? 1 : -1
      v = cmpTexto(ha, hb)
    }
    if (v !== 0) return v * dir
    // desempate: processo A–Z e depois hora exibida crescente
    const vp = cmpTexto(a.rotina.processo, b.rotina.processo)
    return vp !== 0 ? vp : cmpTexto(horaMS(a), horaMS(b))
  })

  // Visão "Atualização": hora em que o processo/relatório fica atualizado —
  // hora agendada + tempo médio de atualização do processo (cadastro, default
  // 15 min), preferindo a hora do relatório (PBI/FAB) e, na ausência dele no
  // dia, a hora do RPA.
  // RPAs vinculados a algum PBI ativo — somem da aba Atualização (a
  // atualização que vale é a do relatório) e ganham ícone de vínculo
  const rpasVinculados = new Set(
    processos.filter(p => ehRelatorio(p.tipo) && p.ativo && p.rpa_vinculado_id).map(p => p.rpa_vinculado_id)
  )
  // Só esconde o RPA da aba Atualização se o relatório vinculado tem agenda ativa;
  // sem ela, o RPA sumiria sozinho.
  const comAgenda = new Set(
    dados.filter(r => r.ativo && (r.execucoes || []).length > 0).map(r => r.processo_id)
  )
  const rpasEscondidosAtu = new Set(
    processos
      .filter(p => ehRelatorio(p.tipo) && p.ativo && p.rpa_vinculado_id && comAgenda.has(p.id))
      .map(p => p.rpa_vinculado_id)
  )

  const linhasAtualizacao = (() => {
    const porProcesso = {}
    rotinasFiltradas.forEach(r => {
      if (r.processo_id && rpasEscondidosAtu.has(r.processo_id)) return
      const key = r.processo_id || r.processo || r.id
      if (!porProcesso[key]) {
        porProcesso[key] = {
          processo: r.processo, departamento_nome: r.departamento_nome, ativo: false, porDia: {},
          processoId: r.processo_id || null,
          tempo: processos.find(p => p.id === r.processo_id)?.tempo_atualizacao_min ?? 15,
        }
      }
      if (r.ativo) porProcesso[key].ativo = true
      DIAS_SEMANA.forEach(d => {
        ;(r.porDia[d.n] || []).forEach(oc => {
          if (!tipoPassa(oc.tipo)) return
          if (!oc.hora) return
          const diaMS = diaParaMS(d.n, oc.hora, oc.tipo)
          if (!porProcesso[key].porDia[diaMS]) porProcesso[key].porDia[diaMS] = []
          porProcesso[key].porDia[diaMS].push(oc)
        })
      })
    })
    // Uma linha por processo, com os horários de atualização agrupados:
    // "horas" = lista distinta ordenada; porDiaAtu[n] = horários daquele dia
    const linhas = Object.values(porProcesso).map(p => {
      const porDiaAtu = {}
      const horasMap = new Map()
      DIAS_SEMANA.forEach(d => {
        const ocs = p.porDia[d.n] || []
        const relatorio = ocs.filter(o => ehRelatorio(o.tipo))
        const base = relatorio.length ? relatorio : ocs
        base.forEach(oc => {
          const { hora: horaAtu, avancaDias } = somarMinutosComDia(formatHora(horaParaMS(oc.hora, oc.tipo)), p.tempo)
          // pronto depois da meia-noite: aparece no dia seguinte
          const diaAtu = ((d.n - 1 + avancaDias) % 7) + 1
          if (!porDiaAtu[diaAtu]) porDiaAtu[diaAtu] = []
          if (!porDiaAtu[diaAtu].some(x => x.horaAtu === horaAtu)) {
            porDiaAtu[diaAtu].push({ horaAtu, tipo: oc.tipo, horaBase: oc.hora })
          }
          if (!horasMap.has(horaAtu)) horasMap.set(horaAtu, { horaAtu, tipo: oc.tipo, horaBase: oc.hora })
        })
      })
      Object.values(porDiaAtu).forEach(list => list.sort((a, b) => cmpTexto(a.horaAtu, b.horaAtu)))
      const horas = [...horasMap.values()].sort((a, b) => cmpTexto(a.horaAtu, b.horaAtu))
      const tipos = TIPOS.map(t => t.codigo).filter(c => horas.some(h => (h.tipo || 'RPA') === c))
      // Horários do RPA vinculado (por dia) para exibir no tooltip
      const cad = processos.find(pp => pp.id === p.processoId)
      const rpaVincId = cad?.rpa_vinculado_id || null
      const rpaVincNome = rpaVincId ? (cad?.rpa_vinculado_nome || processos.find(x => x.id === rpaVincId)?.nome || null) : null
      const rpaHorasPorDia = {}
      if (rpaVincId) {
        dados.filter(r => r.processo_id === rpaVincId).forEach(r => {
          DIAS_SEMANA.forEach(d => {
            ;(r.porDia[d.n] || []).forEach(oc => {
              if (!oc.hora) return
              const hr = formatHora(oc.hora)
              if (!rpaHorasPorDia[d.n]) rpaHorasPorDia[d.n] = []
              if (!rpaHorasPorDia[d.n].includes(hr)) rpaHorasPorDia[d.n].push(hr)
            })
          })
        })
        Object.values(rpaHorasPorDia).forEach(list => list.sort())
      }
      return { processo: p.processo, processoId: p.processoId, departamento_nome: p.departamento_nome, ativo: p.ativo, porDia: porDiaAtu, horas, tipos, tempo: p.tempo, rpaVincNome, rpaHorasPorDia }
    }).filter(l => l.horas.length)

    return linhas.sort((a, b) => {
      const dir = sortAtu.dir === 'asc' ? 1 : -1
      let v
      if (sortAtu.col === 'processo') v = cmpTexto(a.processo, b.processo)
      else if (sortAtu.col === 'setor') v = cmpTexto(a.departamento_nome, b.departamento_nome)
      else if (sortAtu.col === 'tipo') v = cmpTexto(a.tipos.join(','), b.tipos.join(','))
      else v = cmpTexto(a.horas[0]?.horaAtu, b.horas[0]?.horaAtu)
      if (v !== 0) return v * dir
      return cmpTexto(a.processo, b.processo)
    })
  })()

  // Selects de rotina só mostram processos ativos; ao editar uma rotina cujo
  // processo foi inativado, inclui esse processo para não quebrar a seleção.
  const processosAtivos = processos.filter(p => p.ativo)
  const processosSelect = form.processo_id && !processosAtivos.some(p => p.id === form.processo_id)
    ? [...processosAtivos, ...processos.filter(p => p.id === form.processo_id)].sort((a, b) => a.nome.localeCompare(b.nome))
    : processosAtivos

  const rotinasDoProcesso = (id) => dados.filter(r => r.processo_id === id).length

  // Processos ativos sem nenhum horário agendado (sem rotina ativa com
  // execuções), respeitando os filtros de setor/tipo/processo da tela
  const processosSemAgendamento = processos.filter(p => {
    if (!p.ativo) return false
    if (!setorPassa(p.departamento_id, p.departamento_nome)) return false
    if (!tipoPassa(p.tipo || 'RPA')) return false
    if (!procPassa(p.id)) return false
    return !dados.some(r => r.processo_id === p.id && r.ativo && (r.execucoes || []).length > 0)
  }).sort((a, b) => cmpTexto(a.nome, b.nome))

  // Opções do seletor de processos: acompanham os filtros de setor/tipo
  const opcoesProcessoFiltro = processos.filter(p => {
    if (!setorPassa(p.departamento_id, p.departamento_nome)) return false
    return tipoPassa(p.tipo || 'RPA')
  }).sort((a, b) => cmpTexto(a.nome, b.nome))

  const processosFiltrados = processos.filter(p => {
    if (!setorPassa(p.departamento_id, p.departamento_nome)) return false
    if (!tipoPassa(p.tipo || 'RPA')) return false
    if (!procPassa(p.id)) return false
    return true
  }).sort((a, b) => {
    const dir = sortProc.dir === 'asc' ? 1 : -1
    let v = 0
    switch (sortProc.col) {
      case 'setor': v = cmpTexto(a.departamento_nome, b.departamento_nome); break
      case 'tipo': v = cmpTexto(a.tipo, b.tipo); break
      case 'rotinas': v = rotinasDoProcesso(a.id) - rotinasDoProcesso(b.id); break
      case 'status': v = (b.ativo ? 1 : 0) - (a.ativo ? 1 : 0); break
      default: v = cmpTexto(a.nome, b.nome)
    }
    return v !== 0 ? v * dir : cmpTexto(a.nome, b.nome)
  })

  // Visão "por horário": uma linha por horário+tipo+processo+setor, com os dias
  // da semana em que aquela combinação roda marcados nas colunas Seg..Dom.
  const gradePorHorario = (() => {
    const grupos = {}
    rotinasFiltradas.forEach(r => {
      DIAS_SEMANA.forEach(d => {
        ;(r.porDia[d.n] || []).forEach(oc => {
          if (!tipoPassa(oc.tipo)) return
          const key = `${oc.hora || ''}|${oc.tipo || ''}|${r.processo || ''}|${r.departamento_id || ''}`
          if (!grupos[key]) {
            grupos[key] = {
              hora: oc.hora, tipo: oc.tipo, processo: r.processo,
              departamento_nome: r.departamento_nome, ativo: r.ativo,
              rotina: r, dias: new Set(),
            }
          }
          grupos[key].dias.add(diaParaMS(d.n, oc.hora, oc.tipo))
        })
      })
    })
    return Object.values(grupos).sort((a, b) => {
      const dir = sortHorario.dir === 'asc' ? 1 : -1
      // Compara no horário de MS (o que é exibido), não no configurado
      // col 'rpa' / 'rel': linhas do outro tipo vão para o fim
      const horaDe = (g) => {
        if (!g.hora) return '99:99'
        if (sortHorario.col === 'rpa' && ehRelatorio(g.tipo)) return '99:99'
        if (sortHorario.col === 'rel' && !ehRelatorio(g.tipo)) return '99:99'
        return horaParaMS(g.hora, g.tipo).slice(0, 5)
      }
      const cmpHora = () => {
        const ha = horaDe(a)
        const hb = horaDe(b)
        return ha === hb ? 0 : (ha < hb ? -1 : 1)
      }
      let v
      if (sortHorario.col === 'setor') {
        v = cmpTexto(a.departamento_nome, b.departamento_nome)
      } else {
        v = cmpHora()
      }
      return v !== 0 ? v * dir : cmpTexto(a.processo, b.processo)
    })
  })()

  // Setores do seletor: só os que aparecem na tabela abaixo (respeitando tipo e
  // processo escolhidos), identificados pelo nome exibido na coluna Setor; o setor
  // já selecionado nunca some da lista.
  const nomesSetores = new Set()
  const addSetor = (id, nome) => { const n = nomeSetor(id, nome); if (n) nomesSetores.add(n) }
  if (visualizacao === 'processos') {
    // Aba Processos mostra a grade das rotinas e o cadastro: setores das duas tabelas
    processos.filter(p => tipoPassa(p.tipo || 'RPA') && procPassa(p.id)).forEach(p => addSetor(p.departamento_id, p.departamento_nome))
    dados.filter(r => procPassa(r.processo_id) && (r.execucoes || []).some(e => tipoPassa(e.tipo)))
      .forEach(r => addSetor(r.departamento_id, r.departamento_nome))
  } else {
    dados.filter(r =>
      procPassa(r.processo_id) &&
      (r.execucoes || []).some(e => tipoPassa(e.tipo)) &&
      !(visualizacao === 'atualizacao' && r.processo_id && rpasEscondidosAtu.has(r.processo_id))
    ).forEach(r => addSetor(r.departamento_id, r.departamento_nome))
  }
  if (usaSetorExterno) {
    // setor escolhido em outra aba que não tem processo aqui: continua aparecendo no seletor
    if (setorExterno?.nome && ![...nomesSetores].some(n => chaveSetorTxt(n) === setorExterno.chave)) nomesSetores.add(setorExterno.nome)
  } else if (filtroDept) nomesSetores.add(filtroDept)
  const setoresDisponiveis = [...nomesSetores].sort(cmpTexto)
  const valorSetor = usaSetorExterno
    ? (setoresDisponiveis.find(n => chaveSetorTxt(n) === setorExterno?.chave) || '')
    : filtroDept

  if (loading) return <div className="p-6">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar agendamentos</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={() => loadDados()} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    // Desde 18/11/2026 esta tela é a visão Controle de Governança › Controle de Execuções RPA (BiRpaExecucoes.jsx):
    // o título e a troca Dashboard | Controle ficam lá; aqui só o subtítulo e os botões de cadastro.
    <div className="space-y-4">
      {/* Engrenagem com Novo Processo, Nova Rotina e Baixar PDF (só na aba Atualização), na linha do título da
          página (slotAcoes vem do BiRpaExecucoes; sem slot, fica aqui mesmo, à direita). */}
      {(() => {
        const engrenagem = (
          <EngrenagemCabecalho itens={[
            canEdit && { label: 'Novo Processo', icon: Plus, onClick: abrirNovoProcessoHeader },
            {
              label: gerandoPDF ? 'Exportando...' : 'Exportar', icon: Download, disabled: gerandoPDF,
              submenu: [
                { label: 'PDF', onClick: () => handleExportar('pdf') },
                { label: 'PNG', onClick: () => handleExportar('png') },
                { label: 'JPG', onClick: () => handleExportar('jpg') },
              ],
            },
            // Planos do serviço (contratar), só nos monitores Power BI e Microsoft Fabric — 21/11/2026
            ...itensPlanos({ RPA: 'robert', PBI: 'powerbi', FAB: 'fabric' }[sistema]).map(p => ({ label: p.label, icon: ExternalLink, onClick: () => p.href && window.open(p.href, '_blank', 'noopener,noreferrer') })),
          ].filter(Boolean)} />
        )
        return slotAcoes ? createPortal(engrenagem, slotAcoes) : <div className="flex justify-end">{engrenagem}</div>
      })()}

      {erroRecarga && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-md px-3 py-2 text-xs font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Não foi possível atualizar os dados — o que aparece pode estar desatualizado. ({erroRecarga})</span>
          <button type="button" onClick={() => loadDados(true)} className="underline hover:text-red-900">Tentar novamente</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        {!abaExterna && <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          {/* Processos é a primeira aba (18/11/2026) */}
          <button
            type="button"
            onClick={() => setVisualizacao('processos')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'processos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" /> Processos
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('horario')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'horario' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="h-3.5 w-3.5" /> Agenda
          </button>
          <button
            type="button"
            onClick={() => setVisualizacao('atualizacao')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              visualizacao === 'atualizacao' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Atualização
          </button>
        </div>}
        {!sistema && <div className="flex items-center gap-1 bg-slate-100 rounded-md p-1">
          <button
            type="button"
            onClick={() => setFiltroTipo([])}
            className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
              tiposFiltro.length === 0 ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todos
          </button>
          {TIPOS.map(t => (
            <button
              key={t.codigo}
              type="button"
              onClick={() => toggleFiltroTipo(t.codigo)}
              title="Clique para incluir/remover do filtro (aceita mais de um)"
              className={`px-2.5 py-1.5 rounded text-[11px] font-semibold transition-colors ${
                tiposFiltro.includes(t.codigo)
                  ? t.codigo === 'PBI'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : t.codigo === 'FAB'
                      ? 'bg-teal-500 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.nome}
            </button>
          ))}
        </div>}
        {/* Troca Dashboard | Controle da tela Controle de Execuções RPA, na linha das abas, à direita */}
        {acoesDireita && <div className="ml-auto">{acoesDireita}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-[34rem] max-w-full text-xs">
          <MultiSearchCombobox
            value={procsFiltro}
            onChange={setFiltroProc}
            opcoes={opcoesProcessoFiltro}
            placeholder="Todos os processos"
            searchPlaceholder="Buscar processo/relatório..."
            notFoundLabel="Nenhum processo encontrado"
            getLabel={p => p.nome}
            getSearchText={p => p.nome || ''}
            resumo={sel => sel.length === 1 ? sel[0].nome : `${sel.length} processos selecionados`}
            quebrarTexto
          />
        </div>
        <select
          value={valorSetor}
          onChange={e => usaSetorExterno
            ? onSetorExterno(e.target.value ? { chave: chaveSetorTxt(e.target.value), nome: e.target.value } : null)
            : setFiltroDept(e.target.value)}
          className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">Todos os setores</option>
          {setoresDisponiveis.map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {/* Alerta: processos/relatórios cadastrados sem agendamento */}
      {processosSemAgendamento.length > 0 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-md px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-amber-800">
            <strong className="font-bold">
              {processosSemAgendamento.length === 1
                ? '1 processo/relatório sem agendamento'
                : `${processosSemAgendamento.length} processos/relatórios sem agendamento`}
              {canEdit ? ' — clique para criar a rotina:' : ':'}
            </strong>
            {processosSemAgendamento.map(p => canEdit ? (
              <button
                key={p.id}
                type="button"
                onClick={() => abrirAgendamentoDoProcesso(p)}
                title="Criar rotina para este processo"
                className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-400 transition-colors"
              >
                {p.nome}
              </button>
            ) : (
              <span key={p.id} className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white border border-amber-200 text-amber-800">
                {p.nome}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Processos — tabela única (18/11/2026): cadastro + grade semanal das rotinas. Uma linha por
          rotina/horário (como era a Por Rotina) e, no fim, os processos/relatórios ainda sem rotina. */}
      {visualizacao === 'processos' && (() => {
        const comRotina = new Set(linhasRotina.map(l => l.rotina.processo_id))
        const semRotina = processosFiltrados.filter(p => !comRotina.has(p.id))
        return (
      <div id="rpa-processos-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1450px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th data-export-ocultar className="p-3 w-14 text-center">Ações</th>
              <ThSort label="Processos" col="processo" sort={sortRotina} onSort={toggleSortRotina} className="min-w-[300px]" />
              <ThSort label="Setor" col="setor" sort={sortRotina} onSort={toggleSortRotina} />
              {/* Tipo de RPA em coluna (21/11/2026), logo após Setor */}
              <th className="p-3 whitespace-nowrap">Tipo de RPA</th>
              {/* Coluna Sistema some no monitor de um sistema só (21/11/2026) */}
              {!sistema && <ThSort label="Sistema" col="tipo" sort={sortRotina} onSort={toggleSortRotina} />}
              <th className="p-3 whitespace-nowrap" title="Tempo médio de execução/atualização (cadastro do processo)">Tempo</th>
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {linhasRotina.length === 0 && semRotina.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + (sistema ? 5 : 6)} className="p-6 text-center text-slate-400">Nenhum processo/relatório cadastrado.</td></tr>
            ) : null}
            {linhasRotina.map(linha => {
              const proc = processos.find(p => p.id === linha.rotina.processo_id)
              const chave = `${linha.rotina.id}|${linha.hora || ''}|${linha.tipo || ''}`
              const aberto = expandidos.has(chave)
              return (
              <React.Fragment key={chave}>
              <tr className={`hover:bg-slate-50/70 transition-colors ${!linha.rotina.ativo || (proc && !proc.ativo) ? 'opacity-50' : ''}`}>
                <td data-export-ocultar className="p-3 align-top text-center">
                  <AcoesMenu itens={canEdit ? [
                    { label: 'Editar horários da rotina', icon: CalendarClock, onClick: () => abrirEditar(linha.rotina), acao: 'editar' },
                    { label: 'Editar processo / relatório', icon: Pencil, onClick: proc ? () => abrirEditarProcesso(proc) : null, acao: 'editar' },
                    { label: 'Excluir rotina', icon: Trash2, onClick: () => abrirExcluir(linha.rotina), acao: 'excluir', perigo: true },
                    proc && { label: 'Excluir processo / relatório', icon: Trash2, onClick: () => abrirExcluirProcesso(proc), acao: 'excluir', perigo: true },
                  ].filter(Boolean) : []} />
                </td>
                <td className="p-3 align-top font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <BotaoExpandir aberto={aberto} onClick={() => alternarExpandido(chave)} />
                    {linha.rotina.processo || '—'}
                    {proc && ehRelatorio(proc.tipo) && proc.rpa_vinculado_id && (
                      <span title={`Vinculado ao RPA: ${proc.rpa_vinculado_nome || processos.find(x => x.id === proc.rpa_vinculado_id)?.nome || '—'}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      </span>
                    )}
                    {sistema !== 'RPA' && proc && !ehRelatorio(proc.tipo) && rpasVinculados.has(proc.id) && (
                      <span title={`RPA vinculado a: ${processos.filter(x => x.rpa_vinculado_id === proc.id).map(x => x.nome).join(', ')}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap align-top">{linha.rotina.departamento_nome || '—'}</td>
                <td className="p-3 whitespace-nowrap align-top">{nomeTipoProcesso(proc?.tipo_processo) || <span className="text-slate-300">—</span>}</td>
                {!sistema && <td className="p-3 whitespace-nowrap align-top">
                  {(() => {
                    const t = linha.tipo || processos.find(p => p.id === linha.rotina.processo_id)?.tipo
                    return t ? (
                      <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(t)}`}>
                        {t}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )
                  })()}
                </td>}
                <td className="p-3 whitespace-nowrap align-top tabular-nums">{linha.tempo ?? 15} min</td>
                {DIAS_SEMANA.map(d => {
                  const oc = linha.dias[d.n]
                  return (
                    <td key={d.n} className="p-2 align-top">
                      {oc ? (() => {
                        const ini = formatHora(horaParaMS(oc.hora, oc.tipo))
                        const fim = oc.hora ? somarMinutos(ini, linha.tempo) : null
                        const ast = ehBrasilia(oc.tipo) && oc.hora ? '*' : ''
                        return (
                          <span
                            title={[
                              `Agendamento ${oc.tipo || '—'}: ${ini} MS${ehBrasilia(oc.tipo) && oc.hora ? ` (Brasília: ${formatHora(oc.hora)})` : ''}`,
                              fim ? `Atualização termina às ${fim} — tempo médio de ${linha.tempo ?? 15} min` : null,
                            ].filter(Boolean).join('\n')}
                            className={`inline-block whitespace-nowrap rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border tabular-nums cursor-help ${tipoBadgeClasses(oc.tipo)}`}
                          >
                            {ini}{ast}{fim ? ` · ${fim}${ast}` : ''}
                          </span>
                        )
                      })() : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
              {aberto && <LinhaDetalheProcesso p={proc} colSpan={DIAS_SEMANA.length + (sistema ? 4 : 5)} />}
              </React.Fragment>
              )
            })}
            {/* Processos/relatórios cadastrados sem nenhuma rotina */}
            {semRotina.map(p => {
              const chave = `sem-${p.id}`
              const aberto = expandidos.has(chave)
              return (
              <React.Fragment key={chave}>
              <tr className={`hover:bg-slate-50/70 transition-colors ${!p.ativo ? 'opacity-50' : ''}`}>
                <td data-export-ocultar className="p-3 align-top text-center">
                  <AcoesMenu itens={canEdit ? [
                    { label: 'Criar rotina (horários de agendamento)', icon: CalendarClock, onClick: () => abrirAgendamentoDoProcesso(p), acao: 'editar' },
                    { label: 'Editar processo / relatório', icon: Pencil, onClick: () => abrirEditarProcesso(p), acao: 'editar' },
                    { label: 'Excluir processo / relatório', icon: Trash2, onClick: () => abrirExcluirProcesso(p), acao: 'excluir', perigo: true },
                  ] : []} />
                </td>
                <td className="p-3 align-top font-bold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <BotaoExpandir aberto={aberto} onClick={() => alternarExpandido(chave)} />
                    {p.nome}
                    {ehRelatorio(p.tipo) && p.rpa_vinculado_id && (
                      <span title={`Vinculado ao RPA: ${p.rpa_vinculado_nome || processos.find(x => x.id === p.rpa_vinculado_id)?.nome || '—'}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      </span>
                    )}
                    {sistema !== 'RPA' && !ehRelatorio(p.tipo) && rpasVinculados.has(p.id) && (
                      <span title={`RPA vinculado a: ${processos.filter(x => x.rpa_vinculado_id === p.id).map(x => x.nome).join(', ')}`} className="cursor-help">
                        <Link2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap align-top">{p.departamento_nome || '—'}</td>
                <td className="p-3 whitespace-nowrap align-top">{nomeTipoProcesso(p.tipo_processo) || <span className="text-slate-300">—</span>}</td>
                {!sistema && <td className="p-3 whitespace-nowrap align-top">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(p.tipo || 'RPA')}`}>
                    {p.tipo || 'RPA'}
                  </span>
                </td>}
                <td className="p-3 whitespace-nowrap align-top tabular-nums">{p.tempo_atualizacao_min ?? 15} min</td>
                <td colSpan={DIAS_SEMANA.length} className="p-3 align-top text-[11px] text-slate-400 italic">Sem rotina agendada</td>
              </tr>
              {aberto && <LinhaDetalheProcesso p={p} colSpan={DIAS_SEMANA.length + (sistema ? 4 : 5)} />}
              </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
        )
      })()}

      {/* Grade semanal — por Horário: linhas ordenadas por horário (RPA), setor em coluna,
          processos distribuídos nas colunas de dias da semana */}
      {visualizacao === 'horario' && (
      <div id="rpa-horario-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              {/* Monitor de um sistema só: uma coluna "Horário" (RPA no Robert; PBI/FAB no Power BI e no Fabric) — 21/11/2026 */}
              {(!sistema || sistema === 'RPA') && <ThSort label={sistema ? 'Horário' : 'RPA'} col="rpa" sort={sortHorario} onSort={toggleSortHorario} />}
              {(!sistema || sistema !== 'RPA') && <ThSort label={sistema ? 'Horário' : 'PBI / FAB'} col="rel" sort={sortHorario} onSort={toggleSortHorario} />}
              <ThSort label="Setor" col="setor" sort={sortHorario} onSort={toggleSortHorario} />
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {gradePorHorario.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + (sistema ? 2 : 3)} className="p-6 text-center text-slate-400">Nenhum horário cadastrado.</td></tr>
            ) : gradePorHorario.map((g, i) => (
              <tr key={i} className={`hover:bg-slate-50/70 transition-colors ${!g.ativo ? 'opacity-50' : ''}`}>
                {(!sistema || sistema === 'RPA') && <td className="p-3 whitespace-nowrap align-top">
                  {!ehRelatorio(g.tipo) ? (
                    <span className="inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border tabular-nums bg-indigo-50 text-indigo-700 border-indigo-100">
                      {formatHora(g.hora)}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>}
                {(!sistema || sistema !== 'RPA') && <td className="p-3 whitespace-nowrap align-top">
                  {ehRelatorio(g.tipo) ? (
                    <span title={tooltipHoraReal(g.hora, g.tipo)} className={`inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border tabular-nums ${ehBrasilia(g.tipo) ? 'cursor-help' : ''} ${tipoBadgeClasses(g.tipo)}`}>
                      {formatHora(horaParaMS(g.hora, g.tipo))}{ehBrasilia(g.tipo) && g.hora ? '*' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>}
                <td className="p-3 whitespace-nowrap align-top">{g.departamento_nome || '—'}</td>
                {DIAS_SEMANA.map(d => (
                  <td key={d.n} className="p-2 align-top">
                    {g.dias.has(d.n) ? (
                      canEdit ? (
                        <button
                          type="button"
                          onClick={() => abrirEditar(g.rotina)}
                          title="Editar rotina (horários de agendamento)"
                          className={`inline-block rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border hover:underline transition-colors ${tipoBadgeClasses(g.tipo)}`}
                        >
                          {g.processo}
                        </button>
                      ) : (
                        <span className={`inline-block rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border ${tipoBadgeClasses(g.tipo)}`}>
                          {g.processo}
                        </span>
                      )
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Atualização — hora em que cada processo/relatório fica atualizado
          (hora agendada + tempo médio do cadastro; relatório tem preferência sobre RPA) */}
      {visualizacao === 'atualizacao' && (
      <div id="rpa-atualizacao-tabela" className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full table-auto text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <ThSort label="Processos" col="processo" sort={sortAtu} onSort={toggleSortAtu} />
              <ThSort label="Setor" col="setor" sort={sortAtu} onSort={toggleSortAtu} />
              {!sistema && <ThSort label="Sistema" col="tipo" sort={sortAtu} onSort={toggleSortAtu} />}
              {DIAS_SEMANA.map(d => (
                <th key={d.n} className="p-3 whitespace-nowrap">{d.curto}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {linhasAtualizacao.length === 0 ? (
              <tr><td colSpan={DIAS_SEMANA.length + (sistema ? 2 : 3)} className="p-6 text-center text-slate-400">Nenhuma atualização agendada.</td></tr>
            ) : linhasAtualizacao.map((l, i) => (
              <tr key={i} className={`hover:bg-slate-50/70 transition-colors ${!l.ativo ? 'opacity-50' : ''}`}>
                <td className="p-3 align-top font-bold text-slate-800">
                  {(() => {
                    const proc = processos.find(p => p.id === l.processoId)
                    return canEdit && proc ? (
                      <button
                        type="button"
                        onClick={() => abrirAgendamentoDoProcesso(proc)}
                        title="Editar horários de agendamento"
                        className="text-left hover:text-blue-600 hover:underline transition-colors"
                      >
                        {l.processo || '—'}
                      </button>
                    ) : (l.processo || '—')
                  })()}
                </td>
                <td className="p-3 whitespace-nowrap align-top">{l.departamento_nome || '—'}</td>
                {!sistema && <td className="p-3 whitespace-nowrap align-top">
                  <div className="flex items-center gap-1">
                    {l.tipos.map(t => (
                      <span key={t} className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeAtuClasses(t)}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </td>}
                {DIAS_SEMANA.map(d => (
                  <td key={d.n} className="p-2 align-top">
                    {l.porDia[d.n]?.length ? (
                      <div className="flex flex-col gap-1">
                        {l.porDia[d.n].map(h => (
                          <span
                            key={h.horaAtu}
                            title={[
                              `Pronto às ${h.horaAtu} — ${l.tempo ?? 15} min após o agendamento`,
                              `Agendamento ${h.tipo || '—'}: ${formatHora(horaParaMS(h.horaBase, h.tipo))} MS${ehBrasilia(h.tipo) ? ` (Brasília: ${formatHora(h.horaBase)})` : ''}`,
                              l.rpaVincNome
                                ? `RPA vinculado (${l.rpaVincNome}): ${(l.rpaHorasPorDia[d.n] || []).join(', ') || 'sem horário neste dia'}${(l.rpaHorasPorDia[d.n] || []).length ? ' MS' : ''}`
                                : null,
                            ].filter(Boolean).join('\n')}
                            className={`inline-block w-fit rounded px-1.5 py-1 text-[10px] font-semibold leading-snug border tabular-nums cursor-help ${tipoBadgeAtuClasses(h.tipo)}`}
                          >
                            {h.horaAtu}{ehBrasilia(h.tipo) ? '*' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Modal criar/editar */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[820px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">{editingId ? 'Editar Rotina' : 'Incluir Nova Rotina'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Processo / Relatório *</label>
                  <div className="flex items-center gap-2">
                    <select
                      required
                      value={form.processo_id}
                      onChange={e => handleProcessoChange(e.target.value)}
                      className="flex-1 text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Selecione...</option>
                      {processosSelect.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNovoProcessoAberto(v => !v)}
                      title="Cadastrar novo processo/relatório"
                      className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {novoProcessoAberto && (
                    <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={novoProcessoNome}
                          onChange={e => setNovoProcessoNome(e.target.value)}
                          placeholder="NOME DO NOVO PROCESSO/RELATÓRIO"
                          className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <select
                          value={novoProcessoDeptId}
                          onChange={e => setNovoProcessoDeptId(e.target.value)}
                          className="w-36 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          <option value="">Setor...</option>
                          {departamentos.map(d => (
                            <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                          ))}
                        </select>
                        {!sistema && <select
                          value={novoProcessoTipo}
                          onChange={e => setNovoProcessoTipo(e.target.value)}
                          className="w-36 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        >
                          {TIPOS.map(t => (
                            <option key={t.codigo} value={t.codigo}>{t.nome}</option>
                          ))}
                        </select>}
                      </div>
                      {ehRelatorio(novoProcessoTipo) && (
                        <div className="flex items-center gap-2">
                          <select
                            value={novoProcessoRpaVincId}
                            onChange={e => setNovoProcessoRpaVincId(e.target.value)}
                            className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          >
                            <option value="">RPA vinculado: nenhum</option>
                            {processos.filter(p => p.tipo === 'RPA' && p.ativo).map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <ErroForm>{erroProcesso}</ErroForm>
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => { setNovoProcessoAberto(false); setNovoProcessoNome(''); setNovoProcessoDeptId(''); setNovoProcessoTipo(sistema || 'RPA'); setNovoProcessoRpaVincId(''); setErroProcesso(null) }}
                          className="text-slate-400 hover:text-slate-600 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={criandoProcesso || !novoProcessoNome.trim()} onClick={handleCriarProcesso}
                          className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
                          {criandoProcesso ? 'Salvando...' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">Selecionado uma única vez — vale para todos os dias e horários marcados abaixo.</span>
                </div>

                <div className="flex items-start gap-8">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setor</label>
                    <span className="text-xs font-semibold text-slate-700">
                      {form.departamento_nome || 'Preenchido automaticamente ao selecionar o processo'}
                    </span>
                  </div>
                  {!sistema && <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistema</label>
                    {form.tipo ? (
                      <span className={`inline-block w-fit rounded px-1.5 py-0.5 text-[10px] font-bold border ${tipoBadgeClasses(form.tipo)}`}>
                        {TIPOS.find(t => t.codigo === form.tipo)?.nome || form.tipo}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-700">Preenchido automaticamente ao selecionar o processo</span>
                    )}
                  </div>}
                </div>

                <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200 rounded-md p-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Horário de Agendamento</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="time"
                      value={templateHora}
                      onChange={e => setTemplateHora(e.target.value)}
                      className="w-24 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <span className="text-[10px] text-slate-400">
                      {ehBrasilia(form.tipo) ? 'Horário de Brasília' : 'Horário de MS'} — tipo definido no cadastro do processo
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={toggleTodosDiasTemplate}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                        diasTemplate.size === DIAS_SEMANA.length ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Todos
                    </button>
                    {DIAS_SEMANA.map(d => (
                      <button
                        key={d.n}
                        type="button"
                        onClick={() => toggleDiaTemplate(d.n)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold transition-colors ${
                          diasTemplate.has(d.n) ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.curto}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={!templateHora || diasTemplate.size === 0}
                      onClick={aplicarTemplate}
                      className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" /> Adicionar ao Cronograma
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Cronograma Semanal</label>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todasChavesExec(form.dias).length > 0 && execSelecionadas.size === todasChavesExec(form.dias).length}
                          onChange={toggleSelecionarTodasExec}
                          className="w-3.5 h-3.5"
                        />
                        Selecionar Todos
                      </label>
                      <button
                        type="button"
                        disabled={execSelecionadas.size === 0}
                        onClick={excluirSelecionadas}
                        className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Excluir Selecionados{execSelecionadas.size > 0 ? ` (${execSelecionadas.size})` : ''}
                      </button>
                      <button type="button" onClick={limparCronograma} className="text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors">
                        Excluir Todos os Dias e Horários
                      </button>
                    </div>
                  </div>
                  {horasDoCronograma.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap bg-slate-50 border border-slate-200 rounded-md p-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">Selecionar por horário:</span>
                      {horasDoCronograma.map(g => {
                        const marcado = g.chaves.every(k => execSelecionadas.has(k))
                        return (
                          <button
                            key={g.hora}
                            type="button"
                            onClick={() => toggleGrupoHora(g.chaves)}
                            title={marcado ? 'Desmarcar todos os horários iguais a este' : 'Selecionar todos os horários iguais a este'}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold tabular-nums border transition-colors ${
                              marcado
                                ? 'bg-red-600 text-white border-red-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {g.hora} ({g.chaves.length}x)
                          </button>
                        )
                      })}
                      <span className="text-[10px] text-slate-400">clique no horário e depois em "Excluir Selecionados"</span>
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-md divide-y divide-slate-100 overflow-hidden">
                    {DIAS_SEMANA.map(d => {
                      const dia = form.dias[d.n]
                      return (
                        <div key={d.n} className="flex items-start gap-3 p-2 bg-white">
                          <label className="flex items-center gap-2 w-28 shrink-0 text-xs font-semibold text-slate-700 cursor-pointer pt-1.5">
                            <input type="checkbox" checked={dia.ativo} onChange={() => toggleDia(d.n)} className="w-4 h-4" />
                            {d.label}
                          </label>
                          <div className="flex-1 flex flex-col gap-1.5">
                            {dia.ativo && dia.execucoes.map((oc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={execSelecionadas.has(chaveExec(d.n, idx))}
                                  onChange={() => toggleExecSelecionada(chaveExec(d.n, idx))}
                                  title="Selecionar este horário"
                                  className="w-3.5 h-3.5 shrink-0"
                                />
                                <input
                                  type="time"
                                  value={oc.hora}
                                  onChange={e => setOcorrenciaCampo(d.n, idx, 'hora', e.target.value)}
                                  className="w-24 shrink-0 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                                <span className="text-[9px] text-slate-400 shrink-0">{ehBrasilia(form.tipo) ? 'Brasília' : 'MS'}</span>
                                {(() => {
                                  const outros = outrosNoMesmoHorario(form.processo_id, d.n, oc.hora, form.tipo)
                                  return outros.length ? (
                                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5" title={outros.join(', ')}>
                                      Mesmo horário: {outros.slice(0, 2).join('; ')}{outros.length > 2 ? ` e mais ${outros.length - 2}` : ''}
                                    </span>
                                  ) : null
                                })()}
                                {dia.execucoes.length > 1 && (
                                  <button type="button" onClick={() => removeOcorrencia(d.n, idx)} className="text-slate-400 hover:text-red-600 transition-colors" title="Remover horário">
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {dia.ativo && (
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => addOcorrencia(d.n)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  <CopyPlus className="h-3 w-3" /> Repetir {d.curto}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => limparDia(d.n)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors"
                                >
                                  <X className="h-3 w-3" /> Excluir {d.curto}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={form.ativo} onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))} className="w-4 h-4" />
                  Ativo
                </label>
                <ErroForm>{erroRotina}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {salvando ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal novo processo (cabeçalho da página) */}
      {modalNovoProcessoAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[900px] max-w-[95vw] max-h-[92vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900">{procEditId ? 'Editar Processo / Relatório' : 'Cadastrar Processo / Relatório'}</h3>
              <button onClick={() => setModalNovoProcessoAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCriarProcessoHeader} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Processo *</label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={novoProcessoNomeHeader}
                    onChange={e => setNovoProcessoNomeHeader(e.target.value)}
                    placeholder="NOME DO PROCESSO/RELATÓRIO"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {/* Setor, Tipo e Tempo médio na mesma linha (18/11/2026) */}
                <div className={`grid ${sistema ? 'grid-cols-4' : 'grid-cols-5'} gap-3 items-start`}>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Setor</label>
                  <select
                    value={novoProcessoDeptIdHeader}
                    onChange={e => setNovoProcessoDeptIdHeader(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {departamentos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome_departamento}</option>
                    ))}
                  </select>
                </div>
                {!sistema && <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Sistema *</label>
                  <select
                    value={novoProcessoTipoHeader}
                    onChange={e => setNovoProcessoTipoHeader(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    {TIPOS.map(t => (
                      <option key={t.codigo} value={t.codigo}>{t.nome}</option>
                    ))}
                  </select>
                </div>}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Tipo de RPA</label>
                  <select
                    value={docProcesso.tipo_processo || ''}
                    onChange={e => setDocProcesso(d => ({ ...d, tipo_processo: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {TIPOS_PROCESSO.map(t => <option key={t.codigo} value={t.codigo}>{t.nome}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap" title="Hora agendada + este tempo = hora em que termina/fica pronto. Ex.: agendado 13:00 com 30 min → pronto às 13:30.">Tempo Médio (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={novoProcessoTempoHeader}
                    onChange={e => setNovoProcessoTempoHeader(e.target.value)}
                    title="Tempo médio de execução: hora agendada + este tempo = hora em que termina/fica pronto"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                {/* Tempo Humano (21/11/2026): quanto uma pessoa levaria para fazer à mão uma execução deste processo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap" title="Quanto tempo uma pessoa levaria para fazer à mão o que o robô faz em uma execução. Usado no card Tempo total humano do Resumo.">Tempo Humano (min)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={docProcesso.tempo_humano_min ?? ''}
                    onChange={e => setDocProcesso(d => ({ ...d, tempo_humano_min: e.target.value }))}
                    placeholder="Ex.: 60"
                    title="Quanto tempo uma pessoa levaria para fazer à mão uma execução deste processo"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                </div>
                {ehRelatorio(novoProcessoTipoHeader) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">RPA Vinculado</label>
                    <select
                      value={novoProcessoRpaVincIdHeader}
                      onChange={e => setNovoProcessoRpaVincIdHeader(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Nenhum</option>
                      {processos.filter(p => p.tipo === 'RPA' && p.ativo && p.id !== procEditId).map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400">
                      Qual processo RPA alimenta este relatório. O RPA vinculado não aparece na aba Atualização — vale a hora do Power BI.
                    </span>
                  </div>
                )}
                {[
                  { campo: 'objetivo', label: 'Objetivo do Processo', ph: 'Para que serve este processo/relatório...' },
                  { campo: 'atende', label: 'Atende', ph: 'Ex.: BI Faturamento, BI Planos de Manutenção, Dealer.net...' },
                ].map(f => (
                  <div key={f.campo} className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{f.label}</label>
                    <textarea
                      rows={2}
                      value={docProcesso[f.campo]}
                      onChange={e => setDocProcesso(d => ({ ...d, [f.campo]: e.target.value.toUpperCase() }))}
                      placeholder={f.ph}
                      className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 uppercase placeholder:normal-case resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                ))}
                {/* Arquivos Extraídos em tabela: nome do arquivo e pasta lado a lado (21/11/2026) */}
                <TabelaArquivosExtraidos
                  linhas={docProcesso.arquivos_extraidos || []}
                  onChange={linhas => setDocProcesso(d => ({ ...d, arquivos_extraidos: linhas }))}
                />
                {procEditId && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={novoProcessoAtivoHeader} onChange={(e) => setNovoProcessoAtivoHeader(e.target.checked)} className="w-4 h-4" />
                    Ativo
                  </label>
                )}
                <ErroForm>{erroProcessoHeader}</ErroForm>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalNovoProcessoAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
                <button type="submit" disabled={criandoProcessoHeader} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-60">
                  {criandoProcessoHeader ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal exclusão de processo */}
      {modalExcluirProcAberto && procExcluir && (() => {
        const emUso = rotinasDoProcesso(procExcluir.id)
        return (
          <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                  {emUso > 0 ? (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      O processo <strong className="text-slate-800">"{procExcluir.nome}"</strong> está em uso por <strong className="text-slate-800">{emUso} rotina{emUso > 1 ? 's' : ''}</strong>. Exclua ou altere as rotinas antes, ou apenas inative o processo pela edição.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir o processo <strong className="text-slate-800">"{procExcluir.nome}"</strong> do cadastro?</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => setModalExcluirProcAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
                {emUso === 0 && (
                  <button onClick={handleConfirmarExclusaoProcesso} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal exclusão */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[400px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Deseja excluir a rotina <strong className="text-slate-800">"{form.processo || '—'}"</strong>? Todos os horários vinculados aos dias da semana também serão removidos.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Voltar</button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
