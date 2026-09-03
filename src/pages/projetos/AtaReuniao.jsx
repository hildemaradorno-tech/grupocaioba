import React, { useState, useEffect, useRef } from 'react'
import {
  FileText, Plus, ChevronRight, ChevronLeft, Loader2, Download,
  Check, X as XIcon, MapPin, Pencil, Trash2, Settings2, ArrowLeft,
  Eye, Save, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

// ── constantes ────────────────────────────────────────────────────────────────
const LOGO_URL = 'https://limadigitalnet-my.sharepoint.com/:i:/g/personal/hildemar_limadigital_net_br/IQCLK28KdsSHRLtlmwLrO2whAV-i_i673amZBEJ41hOimkY?e=2yp4pZ'

// ── helpers ───────────────────────────────────────────────────────────────────
const dataHoje    = () => new Date().toISOString().split('T')[0]
const dataPassada = (dias) => { const d = new Date(); d.setDate(d.getDate() - dias); return d.toISOString().split('T')[0] }
const fmtData     = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const fmtDataExtenso = (d) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'
const noPeriodo   = (dataStr, ini, fim) =>
  Boolean(dataStr && ini && fim && dataStr >= ini && dataStr <= fim)

// Mesma lógica de "TÉRM. PROJETO" do ProjetosDashboard: data_fim_real → max tarefa → data_fim_prevista
const dataFimConc = (p) => {
  const taskMax = (p.proj_tarefas || []).map(t => t.data_fim).filter(Boolean).sort().reverse()[0] || null
  return p.data_fim_real || taskMax || p.data_fim_prevista || null
}

// ── form inicial ──────────────────────────────────────────────────────────────
const makeFormInit = () => ({
  data: dataHoje(),
  horarioInicio: '',
  horarioFim: '',
  local: '',
  proximaReuniao: '',
  logoUrl: LOGO_URL,
  responsavelAta: '',
  responsavelAtaNome: '',
  participantesIds: new Set(),
  participantesNomes: [],
  participantesExternos: [''],
  periodoIni: dataPassada(7),
  periodoFim: dataHoje(),
  concluidos: [],
  andamento: [],
  mapeados: [],
})

// ── serialização Supabase ↔ form ──────────────────────────────────────────────
const rowToForm = (row) => {
  const d = row.dados || {}
  return {
    data: row.data || dataHoje(),
    horarioInicio: row.horario_inicio || '',
    horarioFim: row.horario_fim || '',
    local: row.local || '',
    proximaReuniao: row.proxima_reuniao || '',
    logoUrl: d.logoUrl || LOGO_URL,
    responsavelAta: d.responsavelAta || '',
    responsavelAtaNome: row.responsavel_ata_nome || '',
    participantesIds: new Set(d.participantesIds || []),
    participantesNomes: row.participantes_nomes || [],
    participantesExternos: d.participantesExternos?.length ? d.participantesExternos : [''],
    periodoIni: row.periodo_ini || dataPassada(7),
    periodoFim: row.periodo_fim || dataHoje(),
    concluidos: (d.concluidos || []).map(p => ({
      ...p,
      tarefasIncluidas: new Set(p.tarefasIncluidas || []),
    })),
    andamento: d.andamento || [],
    mapeados: d.mapeados || [],
  }
}

const formToPayload = (form, userNome) => ({
  data: form.data,
  horario_inicio: form.horarioInicio || null,
  horario_fim: form.horarioFim || null,
  local: form.local || null,
  proxima_reuniao: form.proximaReuniao || null,
  responsavel_ata_nome: form.responsavelAtaNome || null,
  participantes_nomes: form.participantesNomes,
  periodo_ini: form.periodoIni || null,
  periodo_fim: form.periodoFim || null,
  dados: {
    logoUrl: form.logoUrl,
    responsavelAta: form.responsavelAta,
    participantesIds: [...form.participantesIds],
    participantesExternos: form.participantesExternos,
    concluidos: form.concluidos.map(p => ({
      ...p,
      tarefasIncluidas: [...p.tarefasIncluidas],
    })),
    andamento: form.andamento,
    mapeados: form.mapeados,
  },
  criado_por: userNome,
  atualizado_em: new Date().toISOString(),
})

// ── AtaPreview: layout A4 profissional ───────────────────────────────────────
const AtaPreview = React.forwardRef(function AtaPreview({ form }, ref) {
  const participantesNomes = [
    ...form.participantesNomes,
    ...form.participantesExternos.filter(Boolean),
  ]
  const concluidos = form.concluidos.filter(p => p.incluido)
  const andamento  = form.andamento.filter(p => p.incluido)
  const mapeados   = form.mapeados.filter(p => p.incluido)

  const s = {
    page:       { width: '794px', backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1e293b', padding: '48px 56px', boxSizing: 'border-box' },
    sectionBar: (cor) => ({ fontSize: '11px', fontWeight: '700', color: '#1e3a5f', textTransform: 'uppercase', letterSpacing: '0.8px', borderLeft: `3px solid ${cor}`, paddingLeft: '10px', marginBottom: '10px' }),
    th:         (cor) => ({ padding: '7px 10px', textAlign: 'left', color: cor, fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', border: '1px solid #e2e8f0' }),
    td:         { padding: '7px 10px', border: '1px solid #e2e8f0' },
  }

  let secNum = 0

  return (
    <div ref={ref} style={s.page}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '3px solid #1e3a5f', paddingBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {form.logoUrl && (
            <img src={form.logoUrl} alt="Logo" crossOrigin="anonymous"
              style={{ height: '54px', objectFit: 'contain', maxWidth: '160px' }} />
          )}
          <div>
            <div style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Gestão de Projetos</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Reunião Gerencial</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#1e3a5f', letterSpacing: '-0.5px' }}>ATA DE REUNIÃO</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Documento interno — confidencial</div>
        </div>
      </div>

      {/* Dados da reunião */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '22px', background: '#f8fafc', borderRadius: '8px', padding: '14px 18px', border: '1px solid #e2e8f0' }}>
        {[
          { label: 'Data', value: fmtDataExtenso(form.data) },
          { label: 'Horário', value: form.horarioInicio ? `${form.horarioInicio}${form.horarioFim ? ` às ${form.horarioFim}` : ''}` : '—' },
          { label: 'Local', value: form.local || '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '3px' }}>{label}</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Participantes */}
      {participantesNomes.length > 0 && (
        <section style={{ marginBottom: '22px' }}>
          <div style={s.sectionBar('#475569')}>Participantes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {participantesNomes.map((n, i) => (
              <span key={i} style={{ fontSize: '11px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '20px', padding: '3px 11px', color: '#334155', fontWeight: '500' }}>
                {n}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Projetos Concluídos */}
      {concluidos.length > 0 && (
        <section style={{ marginBottom: '22px' }}>
          <div style={s.sectionBar('#0d9488')}>{++secNum}. Projetos Concluídos no Período ({fmtData(form.periodoIni)} a {fmtData(form.periodoFim)})</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f0fdf4' }}>
                <th style={{ ...s.th('#047857'), width: '90px' }}>Concluído em</th>
                <th style={{ ...s.th('#047857'), width: 'auto' }}>Projeto</th>
                <th style={{ ...s.th('#047857'), width: '120px' }}>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {concluidos.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={{ ...s.td, width: '90px', color: '#475569', whiteSpace: 'nowrap' }}>{fmtData(dataFimConc(p))}</td>
                  <td style={s.td}>
                    <div style={{ fontWeight: '600' }}>{p.nome}</div>
                    {[p.departamento_nome, p.area_nome, p.sistema_nome].filter(Boolean).length > 0 && (
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {[p.departamento_nome, p.area_nome, p.sistema_nome].filter(Boolean).join(' › ')}
                      </div>
                    )}
                  </td>
                  <td style={{ ...s.td, color: '#475569' }}>{p.responsavel_nome || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Projetos em Andamento — Tarefas no período */}
      {(() => {
        const ini = form.data
        const fim = form.proximaReuniao
        const tarefas = andamento
          .flatMap(p => (p.proj_tarefas || [])
            .filter(t => t.data_fim && (!ini || t.data_fim >= ini) && (!fim || t.data_fim <= fim))
            .map(t => ({
              ...t,
              projetoNome:   p.nome,
              projetoResp:   p.responsavel_nome,
              projetoDepto:  p.departamento_nome,
              projetoArea:   p.area_nome,
              projetoSistema: p.sistema_nome,
            }))
          )
          .sort((a, b) => (a.data_fim || '').localeCompare(b.data_fim || ''))

        if (andamento.length === 0 && tarefas.length === 0) return null

        const porDepto = {}
        tarefas.forEach(t => {
          const depto = t.projetoDepto || '(Sem departamento)'
          if (!porDepto[depto]) porDepto[depto] = []
          porDepto[depto].push(t)
        })

        const statusLabel = { mapeado: 'Mapeado', programado: 'Programado', em_andamento: 'Em Andamento', pausado: 'Pausado', concluido: 'Concluído' }
        const statusColor = { mapeado: '#64748b', programado: '#2563eb', em_andamento: '#d97706', pausado: '#7c3aed', concluido: '#0d9488' }

        return (
          <section style={{ marginBottom: '22px' }}>
            <div style={s.sectionBar('#d97706')}>{++secNum}. Projetos em Andamento — Tarefas para serem entregues até a próxima reunião</div>
            {tarefas.length === 0
              ? <p style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma tarefa com prazo neste período.</p>
              : Object.entries(porDepto).sort(([a], [b]) => a.localeCompare(b)).map(([depto, ts]) => {
                const resps = [...new Set(ts.map(t => t.projetoResp).filter(Boolean))]
                return (
                  <div key={depto} style={{ marginBottom: '10px' }}>
                    <div style={{ background: '#fef3c7', borderLeft: '3px solid #d97706', padding: '5px 10px', borderRadius: '4px', marginBottom: '5px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{depto}</span>
                      {resps.length > 0 && <span style={{ fontSize: '9px', color: '#b45309' }}>· Resp.: {resps.join(', ')}</span>}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                      <thead>
                        <tr style={{ background: '#fef3c7' }}>
                          <th style={{ ...s.th('#92400e'), width: '90px' }}>Término</th>
                          <th style={{ ...s.th('#92400e') }}>Tarefa</th>
                          <th style={{ ...s.th('#92400e'), width: '120px' }}>Responsável</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ts.map((t, i) => (
                          <tr key={t.id} style={{ background: i % 2 === 0 ? '#fff' : '#fffbeb' }}>
                            <td style={{ ...s.td, width: '90px', fontWeight: '700', color: '#b45309', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{fmtData(t.data_fim)}</td>
                            <td style={s.td}>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{t.nome}</div>
                              <div style={{ marginTop: '2px' }}>
                                <span style={{ fontSize: '8px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '3px' }}>Projeto</span>
                                <span style={{ fontWeight: '600', fontSize: '9px', color: '#92400e' }}>{t.projetoNome}</span>
                              </div>
                              {[t.projetoArea, t.projetoSistema].filter(Boolean).length > 0 && (
                                <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '1px' }}>
                                  {[t.projetoArea, t.projetoSistema].filter(Boolean).join(' › ')}
                                </div>
                              )}
                            </td>
                            <td style={{ ...s.td, width: '120px', fontSize: '9px', color: '#475569', verticalAlign: 'top' }}>
                              {t.responsavel_nome || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })
            }
          </section>
        )
      })()}

      {/* Projetos Mapeados */}
      {mapeados.length > 0 && (
        <section style={{ marginBottom: '22px' }}>
          <div style={s.sectionBar('#6366f1')}>{++secNum}. Projetos Mapeados / Planejados</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ background: '#f5f3ff' }}>
                <th style={{ ...s.th('#4338ca'), width: 'auto' }}>Projeto</th>
                <th style={{ ...s.th('#4338ca'), width: '130px' }}>Responsável</th>
                <th style={{ ...s.th('#4338ca'), width: '100px' }}>Previsão</th>
              </tr>
            </thead>
            <tbody>
              {mapeados.map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <td style={s.td}>
                    <div style={{ fontWeight: '500' }}>{p.nome}</div>
                    {[p.departamento_nome, p.area_nome, p.sistema_nome].filter(Boolean).length > 0 && (
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {[p.departamento_nome, p.area_nome, p.sistema_nome].filter(Boolean).join(' › ')}
                      </div>
                    )}
                  </td>
                  <td style={{ ...s.td, color: '#475569' }}>{p.responsavel_nome || '—'}</td>
                  <td style={{ ...s.td, color: '#475569' }}>{fmtData(p.data_fim_prevista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: '28px', borderTop: '2px solid #e2e8f0', paddingTop: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px 16px', border: '1px solid #e2e8f0', alignSelf: 'start' }}>
          <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>Próxima Reunião</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#1e3a5f' }}>
            {form.proximaReuniao ? fmtDataExtenso(form.proximaReuniao) : '—'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ borderTop: '1px solid #1e293b', paddingTop: '6px', textAlign: 'center', minWidth: '220px' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b' }}>{form.responsavelAtaNome || '___________________________'}</div>
            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>Responsável pela Ata</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
        Documento gerado em {new Date().toLocaleString('pt-BR')} · Sistema de Gestão de Projetos
      </div>
    </div>
  )
})

// ── AtaReuniao (página) ──────────────────────────────────────────────────────
export default function AtaReuniao() {
  const { userNome } = useAuth()
  const navigate = useNavigate()
  const pdfRef = useRef(null)

  // ── locais (localStorage) ─────────────────────────────────────────────────
  const [locais, setLocais] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ata_locais') || '[]') } catch { return [] }
  })
  const [modalLocais, setModalLocais] = useState(false)
  const [novoLocal, setNovoLocal]     = useState('')
  const [editLocal, setEditLocal]     = useState(null)

  const persistirLocais = (arr) => { setLocais(arr); localStorage.setItem('ata_locais', JSON.stringify(arr)) }
  const adicionarLocal  = () => { const v = novoLocal.trim(); if (!v || locais.includes(v)) return; persistirLocais([...locais, v]); setNovoLocal('') }
  const salvarEdicaoLocal = () => {
    if (!editLocal) return
    const v = editLocal.valor.trim()
    if (!v) return
    const arr = locais.map((l, i) => i === editLocal.idx ? v : l)
    persistirLocais(arr)
    if (form.local === locais[editLocal.idx]) set('local', v)
    setEditLocal(null)
  }
  const excluirLocal = (idx) => persistirLocais(locais.filter((_, i) => i !== idx))

  // ── lista de atas salvas ──────────────────────────────────────────────────
  const [atas, setAtas]               = useState([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [confirmDelete, setConfirmDelete]     = useState(null)
  const [ataVisualizar, setAtaVisualizar]     = useState(null) // row da ata aberta no modal A4

  useEffect(() => {
    apiService.getAtasReuniao()
      .then(setAtas)
      .catch(err => console.error('Erro ao carregar atas:', err))
      .finally(() => setCarregandoLista(false))
  }, [])

  // ── wizard state ──────────────────────────────────────────────────────────
  const [modalAberto,   setModalAberto]   = useState(false)
  const [etapa,         setEtapa]         = useState(1)
  const [ataEditandoId, setAtaEditandoId] = useState(null)
  const [carregando,    setCarregando]    = useState(false)
  const [salvando,      setSalvando]      = useState(false)
  const [gerandoPdf,    setGerandoPdf]    = useState(false)
  const [todosUsuarios, setTodosUsuarios] = useState([])
  const [buscaPartic,   setBuscaPartic]   = useState('')
  const [abaStep3,      setAbaStep3]      = useState('concluidos')
  const [form, setForm] = useState(() => makeFormInit())
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // ── abrir wizard para nova ata ────────────────────────────────────────────
  const abrirNovaAta = async () => {
    const init = makeFormInit()
    setAtaEditandoId(null)
    setForm(init)
    setEtapa(1)

    setBuscaPartic('')
    setModalAberto(true)
    setCarregando(true)
    try {
      const [projetos, usuarios] = await Promise.all([
        apiService.getProjetosParaAta(),
        apiService.getUsuarios().catch(() => []),
      ])
      const us = usuarios.filter(u => u.ativo !== false)
      setTodosUsuarios(us)
      const ini = init.periodoIni
      const fim = init.periodoFim
      setForm(f => ({
        ...f,
        concluidos: projetos
          .filter(p => p.status === 'concluido')
          .sort((a, b) => (b.data_fim_real || b.data_fim_prevista || '').localeCompare(a.data_fim_real || a.data_fim_prevista || ''))
          .map(p => {
            const tfNoPeriodo = (p.proj_tarefas || []).filter(t => t.status_kanban === 'concluido' && noPeriodo(t.data_fim, ini, fim))
            return { ...p, incluido: noPeriodo(dataFimConc(p), ini, fim), obs: '', tarefasIncluidas: new Set(tfNoPeriodo.map(t => t.id)) }
          }),
        andamento: projetos
          .filter(p => p.status === 'em_andamento')
          .sort((a, b) => (a.data_fim_prevista || '').localeCompare(b.data_fim_prevista || ''))
          .map(p => ({ ...p, incluido: true, deliberacao: '', prazoProxima: '' })),
        mapeados: projetos
          .filter(p => p.status === 'mapeado')
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
          .map(p => ({ ...p, incluido: noPeriodo(p.criado_em ? new Date(p.criado_em).toLocaleDateString('sv-SE') : '', ini, fim), obs: '' })),
      }))
    } catch (err) {
      alert('Erro ao carregar dados: ' + err.message)
    } finally {
      setCarregando(false)
    }
  }

  // ── editar ata salva ──────────────────────────────────────────────────────
  const editarAta = async (ata) => {
    const f = rowToForm(ata)
    setAtaEditandoId(ata.id)
    setForm(f)
    setEtapa(1)
    setBuscaPartic('')
    setModalAberto(true)

    // Carrega usuários em paralelo
    apiService.getUsuarios()
      .then(us => setTodosUsuarios(us.filter(u => u.ativo !== false)))
      .catch(() => {})

    // Se a ata foi salva sem projetos (ex.: salvo no step 1 antes do carregamento),
    // busca a lista atualizada do banco. Usa início do ano até hoje como período padrão
    // para garantir que projetos concluídos no ano corrente sejam auto-selecionados.
    if ((f.concluidos.length === 0) && (f.andamento.length === 0) && (f.mapeados.length === 0)) {
      setCarregando(true)
      try {
        const projetos = await apiService.getProjetosParaAta()
        const hoje = dataHoje()
        const ini = `${hoje.substring(0, 4)}-01-01`
        const fim = hoje
        setForm(prev => ({
          ...prev,
          periodoIni: ini,
          periodoFim: fim,
          concluidos: projetos
            .filter(p => p.status === 'concluido')
            .sort((a, b) => (b.data_fim_real || b.data_fim_prevista || '').localeCompare(a.data_fim_real || a.data_fim_prevista || ''))
            .map(p => ({ ...p, incluido: noPeriodo(dataFimConc(p), ini, fim), obs: '', tarefasIncluidas: new Set() })),
          andamento: projetos
            .filter(p => p.status === 'em_andamento')
            .sort((a, b) => (a.data_fim_prevista || '').localeCompare(b.data_fim_prevista || ''))
            .map(p => ({ ...p, incluido: true, deliberacao: '', prazoProxima: '' })),
          mapeados: projetos
            .filter(p => p.status === 'mapeado')
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map(p => ({ ...p, incluido: noPeriodo(p.criado_em ? new Date(p.criado_em).toLocaleDateString('sv-SE') : '', ini, fim), obs: '' })),
        }))
      } catch {
        // silently ignore
      } finally {
        setCarregando(false)
      }
    }
  }

  // ── visualizar ata salva (modal A4 limpo, sem wizard) ────────────────────
  const visualizarAta = (ata) => {
    setAtaVisualizar(ata)
  }

  // ── download direto (sem abrir modal) ────────────────────────────────────
  const downloadAtaDireto = async (ata) => {
    const f = rowToForm(ata)
    setForm(f)
    await new Promise(r => setTimeout(r, 150))
    await gerarPdf(f.data)
  }

  // ── excluir ata ───────────────────────────────────────────────────────────
  const excluirAta = async (id) => {
    try {
      await apiService.deleteAtaReuniao(id)
      setAtas(prev => prev.filter(a => a.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      alert('Erro ao excluir ata: ' + err.message)
    }
  }

  // ── salvar / atualizar ata ────────────────────────────────────────────────
  const salvarAta = async () => {
    setSalvando(true)
    try {
      const payload = formToPayload(form, userNome)
      if (ataEditandoId) {
        const updated = await apiService.updateAtaReuniao(ataEditandoId, payload)
        setAtas(prev => prev.map(a => a.id === ataEditandoId ? updated : a))
      } else {
        const created = await apiService.createAtaReuniao(payload)
        setAtaEditandoId(created.id)
        setAtas(prev => [created, ...prev])
      }
      setModalAberto(false)
    } catch (err) {
      alert('Erro ao salvar ata: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  // ── recarregar projetos/tarefas do servidor (Step 3) ─────────────────────
  const recarregarProjetos = async () => {
    setCarregando(true)
    try {
      const projetos = await apiService.getProjetosParaAta()
      const ini = form.periodoIni
      const fim = form.periodoFim
      setForm(f => {
        // preserva deliberações já preenchidas
        const deliberacoesMap = Object.fromEntries(f.andamento.map(p => [p.id, { deliberacao: p.deliberacao, prazoProxima: p.prazoProxima }]))
        return {
          ...f,
          concluidos: projetos
            .filter(p => p.status === 'concluido')
            .sort((a, b) => (b.data_fim_real || b.data_fim_prevista || '').localeCompare(a.data_fim_real || a.data_fim_prevista || ''))
            .map(p => {
              const tfNoPeriodo = (p.proj_tarefas || []).filter(t => t.status_kanban === 'concluido' && noPeriodo(t.data_fim, ini, fim))
              return { ...p, incluido: noPeriodo(dataFimConc(p), ini, fim), obs: '', tarefasIncluidas: new Set(tfNoPeriodo.map(t => t.id)) }
            }),
          andamento: projetos
            .filter(p => p.status === 'em_andamento')
            .sort((a, b) => (a.data_fim_prevista || '').localeCompare(b.data_fim_prevista || ''))
            .map(p => ({ ...p, incluido: true, ...(deliberacoesMap[p.id] || { deliberacao: '', prazoProxima: '' }) })),
          mapeados: projetos
            .filter(p => p.status === 'mapeado')
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
            .map(p => ({ ...p, incluido: noPeriodo(p.criado_em ? new Date(p.criado_em).toLocaleDateString('sv-SE') : '', ini, fim), obs: '' })),
        }
      })
    } catch (err) {
      alert('Erro ao recarregar: ' + err.message)
    } finally {
      setCarregando(false)
    }
  }

  // ── mudar período (re-filtra concluídos) ──────────────────────────────────
  const mudarPeriodo = (campo, valor) => {
    const novoIni = campo === 'periodoIni' ? valor : form.periodoIni
    const novoFim = campo === 'periodoFim' ? valor : form.periodoFim
    setForm(f => ({
      ...f,
      [campo]: valor,
      concluidos: f.concluidos.map(p => {
        const novasIncluidas = new Set(
          (p.proj_tarefas || [])
            .filter(t => t.status_kanban === 'concluido' && noPeriodo(t.data_fim, novoIni, novoFim))
            .map(t => t.id)
        )
        return { ...p, incluido: noPeriodo(dataFimConc(p), novoIni, novoFim), tarefasIncluidas: novasIncluidas }
      }),
      mapeados: f.mapeados.map(p => ({
        ...p, incluido: noPeriodo(p.criado_em ? new Date(p.criado_em).toLocaleDateString('sv-SE') : '', novoIni, novoFim)
      })),
    }))
  }

  // ── participantes ─────────────────────────────────────────────────────────
  const togglePartic = (u) => {
    setForm(f => {
      const ids = new Set(f.participantesIds)
      ids.has(u.id) ? ids.delete(u.id) : ids.add(u.id)
      return {
        ...f,
        participantesIds: ids,
        participantesNomes: todosUsuarios.filter(x => ids.has(x.id)).map(x => x.nome),
      }
    })
  }

  // ── gerar PDF ─────────────────────────────────────────────────────────────
  const gerarPdf = async (dataArquivo = form.data) => {
    const el = pdfRef.current
    if (!el) return
    setGerandoPdf(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf'),
      ])
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, allowTaint: true, logging: false, backgroundColor: '#ffffff' })
      const pdf  = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
      const PW   = pdf.internal.pageSize.getWidth()
      const PH   = pdf.internal.pageSize.getHeight()
      const imgW = PW
      const totalH = (canvas.height / canvas.width) * imgW
      let srcY = 0
      while (srcY < canvas.height) {
        const pageH = Math.min(PH, (canvas.height - srcY) / canvas.height * totalH)
        const srcH  = Math.round((pageH / totalH) * canvas.height)
        const chunk = document.createElement('canvas')
        chunk.width  = canvas.width
        chunk.height = srcH
        chunk.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)
        if (srcY > 0) pdf.addPage()
        pdf.addImage(chunk.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PW, pageH)
        srcY += srcH
      }
      pdf.save(`Ata_Reuniao_${(dataArquivo || form.data).replace(/-/g, '')}.pdf`)
    } catch (err) {
      alert('Erro ao gerar PDF: ' + err.message)
    } finally {
      setGerandoPdf(false)
    }
  }

  // ── wizard steps ──────────────────────────────────────────────────────────
  const ETAPAS    = ['Cabeçalho', 'Participantes', 'Projetos', 'Ata Final']
  // Ao editar ata já salva, libera navegação entre etapas sem bloquear na etapa 1
  const podeAvancar = (etapa === 1 && !ataEditandoId) ? Boolean(form.data && form.local) : true

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Data da Reunião *</label>
          <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
            onClick={e => e.target.showPicker?.()}
            className="text-sm px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Local *</label>
            <button onClick={() => { setNovoLocal(''); setEditLocal(null); setModalLocais(true) }}
              className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              <Settings2 className="h-3 w-3" /> Gerenciar locais
            </button>
          </div>
          <div className="flex gap-1.5">
            <select value={form.local} onChange={e => set('local', e.target.value)}
              className={`flex-1 text-sm px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none ${form.local ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium' : 'border-slate-200 bg-white'}`}>
              <option value="">Selecionar local...</option>
              {locais.map((l, i) => <option key={i} value={l}>{l}</option>)}
            </select>
            <button onClick={() => { setNovoLocal(''); setEditLocal(null); setModalLocais(true) }}
              title="Adicionar novo local"
              className="px-2.5 py-2 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {locais.length === 0 && (
            <p className="text-[10px] text-slate-400 italic">Nenhum local cadastrado. Clique em "Gerenciar locais" para adicionar.</p>
          )}
        </div>

        {[
          { label: 'Horário de Início',   type: 'time', key: 'horarioInicio' },
          { label: 'Horário de Término',  type: 'time', key: 'horarioFim' },
          { label: 'Próxima Reunião',     type: 'date', key: 'proximaReuniao' },
        ].map(({ label, type, key }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</label>
            <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
              onClick={type === 'date' ? e => e.target.showPicker?.() : undefined}
              className="text-sm px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
          </div>
        ))}
      </div>
    </div>
  )

  const renderStep2 = () => {
    const q = buscaPartic.toLowerCase().trim()
    const lista = q
      ? todosUsuarios.filter(u => u.nome?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      : todosUsuarios
    return (
      <div className="space-y-5">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Usuários do sistema</label>
          <input type="text" value={buscaPartic} onChange={e => setBuscaPartic(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full mb-2 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none" />
          <div className="border border-slate-200 rounded-md max-h-44 overflow-y-auto divide-y divide-slate-50">
            {lista.map(u => (
              <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <input type="checkbox" checked={form.participantesIds.has(u.id)}
                  onChange={() => togglePartic(u)}
                  className="w-3.5 h-3.5 accent-blue-600 shrink-0" />
                <span className="text-xs font-medium text-slate-700 flex-1 truncate">{u.nome}</span>
                <span className="text-[10px] text-slate-400 truncate max-w-[160px]">{u.email}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Participantes externos</label>
          <div className="space-y-2">
            {form.participantesExternos.map((nome, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={nome}
                  onChange={e => { const arr = [...form.participantesExternos]; arr[i] = e.target.value; set('participantesExternos', arr) }}
                  placeholder="Nome completo do participante"
                  className="flex-1 text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 outline-none" />
                <button onClick={() => { const arr = form.participantesExternos.filter((_, j) => j !== i); set('participantesExternos', arr.length ? arr : ['']) }}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => set('participantesExternos', [...form.participantesExternos, ''])}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
              + Adicionar participante externo
            </button>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Responsável pela Ata</label>
          <select value={form.responsavelAta}
            onChange={e => {
              const u = todosUsuarios.find(x => x.id === e.target.value)
              setForm(f => ({ ...f, responsavelAta: e.target.value, responsavelAtaNome: u?.nome || '' }))
            }}
            className="text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20 w-full">
            <option value="">Selecionar responsável...</option>
            {todosUsuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
      </div>
    )
  }

  const renderStep3 = () => {
    const countConc = form.concluidos.filter(p => p.incluido).length
    const countAnd  = form.andamento.filter(p => p.incluido).length
    const countMap  = form.mapeados.filter(p => p.incluido).length

    const projPct = (p) => {
      const ts = p.proj_tarefas || []
      if (!ts.length) return 0
      return Math.round(ts.reduce((s, t) => s + (t.status_kanban === 'concluido' ? 100 : (Number(t.progresso_pct) || 0)), 0) / ts.length)
    }

    const projSistemas = (p) =>
      (p.sistemas_nomes?.length ? p.sistemas_nomes : p.sistema_nome ? [p.sistema_nome] : [])

    const projInfoStr = (p) => {
      const local = [p.departamento_nome, p.area_nome].filter(Boolean).join(' › ')
      const dataFim = dataFimConc(p)
      const parts = []
      if (local) parts.push(local)
      if (p.responsavel_nome) parts.push(`Resp.: ${p.responsavel_nome}`)
      if (dataFim) parts.push(`Concluído: ${fmtData(dataFim)}`)
      return parts.join('  ·  ')
    }

    return (
      <div className="space-y-4">
        {/* Período — varia por aba */}
        {abaStep3 === 'concluidos' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-2">Período</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 shrink-0">De</span>
                <input type="date" value={form.periodoIni}
                  onChange={e => mudarPeriodo('periodoIni', e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  className="text-xs px-2 py-1 border border-blue-300 rounded bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 shrink-0">até</span>
                <input type="date" value={form.periodoFim}
                  onChange={e => mudarPeriodo('periodoFim', e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  className="text-xs px-2 py-1 border border-blue-300 rounded bg-white focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer" />
              </div>
              <span className="text-[10px] text-blue-500">{countConc} projeto(s) concluído(s)</span>
            </div>
          </div>
        )}
        {(abaStep3 === 'mapeados') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Período — Data de Criação do Projeto</p>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-blue-700">De</span>
              <span className="text-xs font-semibold text-blue-900">{fmtData(form.periodoIni)}</span>
              <span className="text-xs text-blue-700">até</span>
              <span className="text-xs font-semibold text-blue-900">{fmtData(form.periodoFim)}</span>
              <span className="text-[10px] text-blue-500">{form.mapeados.filter(p => p.incluido).length} projeto(s) mapeado(s)</span>
            </div>
          </div>
        )}
        {abaStep3 === 'andamento' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Período — Esta reunião até a próxima</p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 shrink-0">De</span>
                <span className="text-xs font-semibold text-amber-900">{form.data ? fmtData(form.data) : '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-700 shrink-0">até</span>
                <span className="text-xs font-semibold text-amber-900">{form.proximaReuniao ? fmtData(form.proximaReuniao) : '—'}</span>
              </div>
              {!form.proximaReuniao && (
                <span className="text-[10px] text-amber-500 italic">Defina a próxima reunião na Etapa 1</span>
              )}
            </div>
          </div>
        )}

        {/* Abas */}
        <div className="flex items-end justify-between border-b border-slate-200">
        <div className="flex gap-1">
          {[
            { id: 'concluidos', label: `✅ Concluídos`, count: countConc },
            { id: 'andamento',  label: `▶ Em Andamento`, count: countAnd },
            { id: 'mapeados',   label: `📋 Mapeados`, count: countMap },
          ].map(ab => (
            <button key={ab.id} onClick={() => setAbaStep3(ab.id)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-t-lg border border-b-0 transition-colors ${
                abaStep3 === ab.id
                  ? 'bg-white border-slate-200 text-slate-800'
                  : 'bg-slate-50 border-transparent text-slate-400 hover:text-slate-600'
              }`}>
              {ab.label} <span className="ml-1 text-[10px] font-semibold opacity-70">({ab.count})</span>
            </button>
          ))}
        </div>
          <button onClick={recarregarProjetos} disabled={carregando}
            title="Recarregar dados do servidor"
            className="flex items-center gap-1 px-2 py-1 mb-0.5 text-[10px] font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-40">
            {carregando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Atualizar
          </button>
        </div>

        <div className="space-y-5">
          {/* Concluídos */}
          {abaStep3 === 'concluidos' && <div>
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-2">✅ Concluídos no período ({countConc})</p>
            {form.concluidos.filter(p => p.incluido).length === 0
              ? <p className="text-xs text-slate-400 italic">Nenhum projeto concluído no período selecionado.</p>
              : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {form.concluidos.filter(p => p.incluido).map((p) => {
                    const pct = projPct(p)
                    return (
                      <div key={p.id} className="rounded-lg border p-3 border-teal-200 bg-teal-50/40">
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{p.nome}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {projSistemas(p).map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 whitespace-nowrap">{s}</span>
                          ))}
                          {pct > 0 && <span className="text-[10px] font-bold text-slate-500">{pct}%</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{projInfoStr(p)}</p>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>}

          {/* Em Andamento */}
          {abaStep3 === 'andamento' && <div className="space-y-4">
            {/* Tarefas no período — lista cronológica */}
            {(() => {
              const ini = form.data
              const fim = form.proximaReuniao
              const tarefas = form.andamento
                .flatMap(p => (p.proj_tarefas || [])
                  .filter(t => t.data_fim && (!ini || t.data_fim >= ini) && (!fim || t.data_fim <= fim))
                  .map(t => ({
                    ...t,
                    projetoNome:      p.nome,
                    projetoResp:      p.responsavel_nome,

                    projetoDepto:     p.departamento_nome,
                    projetoArea:      p.area_nome,
                    projetoSistema:   p.sistema_nome,
                  }))
                )
                .sort((a, b) => (a.data_fim || '').localeCompare(b.data_fim || ''))
              if (tarefas.length === 0)
                return <p className="text-xs text-slate-400 italic">Nenhuma tarefa com prazo neste período.</p>

              // Agrupar por departamento mantendo ordem cronológica dentro de cada grupo
              const porDepto = {}
              tarefas.forEach(t => {
                const depto = t.projetoDepto || '(Sem departamento)'
                if (!porDepto[depto]) porDepto[depto] = []
                porDepto[depto].push(t)
              })

              return (
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">📋 Tarefas no período ({tarefas.length})</p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {Object.entries(porDepto).sort(([a], [b]) => a.localeCompare(b)).map(([depto, ts]) => {
                      const resps = [...new Set(ts.map(t => t.projetoResp).filter(Boolean))]
                      return (
                        <div key={depto}>
                          <div className="flex items-baseline gap-2 px-2 py-1 bg-amber-100 rounded-md mb-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">{depto}</span>
                            {resps.length > 0 && (
                              <span className="text-[10px] text-amber-700">· Resp.: {resps.join(', ')}</span>
                            )}
                          </div>
                          <div className="space-y-1 pl-1">
                            {ts.map(t => (
                              <div key={t.id} className="flex items-start gap-3 px-3 py-2 rounded-lg border border-amber-100 bg-amber-50/30">
                                <span className="text-[11px] font-bold text-amber-700 shrink-0 w-20">{fmtData(t.data_fim)}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="text-xs font-semibold text-slate-800 leading-tight">{t.nome}</p>
                                    {t.status_kanban && (() => {
                                      const cfg = {
                                        mapeado:      { label: 'Mapeado',      cls: 'bg-slate-100 text-slate-600' },
                                        programado:   { label: 'Programado',   cls: 'bg-blue-100 text-blue-700' },
                                        em_andamento: { label: 'Em Andamento', cls: 'bg-amber-100 text-amber-700' },
                                        pausado:      { label: 'Pausado',      cls: 'bg-purple-100 text-purple-700' },
                                        concluido:    { label: 'Concluído',    cls: 'bg-teal-100 text-teal-700' },
                                      }[t.status_kanban] || { label: t.status_kanban, cls: 'bg-slate-100 text-slate-500' }
                                      return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>
                                    })()}
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-700 mt-1">
                                    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mr-1">Projeto</span>
                                    {t.projetoNome}
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">
                                    {[t.projetoArea, t.projetoSistema].filter(Boolean).join(' › ')}
                                    {t.responsavel_nome ? `  ·  Resp.: ${t.responsavel_nome}` : ''}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

          </div>}

          {/* Mapeados */}
          {abaStep3 === 'mapeados' && <div>
            {form.mapeados.filter(p => p.incluido).length === 0
              ? <p className="text-xs text-slate-400 italic">Nenhum projeto mapeado criado no período selecionado.</p>
              : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {form.mapeados.filter(p => p.incluido).map((p) => {
                    const pct = projPct(p)
                    return (
                      <div key={p.id} className="rounded-lg border p-3 border-indigo-200 bg-indigo-50/40">
                        <p className="text-xs font-semibold text-slate-800 leading-tight">{p.nome}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {projSistemas(p).map(s => (
                            <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 whitespace-nowrap">{s}</span>
                          ))}
                          {pct > 0 && <span className="text-[10px] font-bold text-slate-500">{pct}%</span>}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {[p.departamento_nome, p.area_nome].filter(Boolean).join(' › ')}
                          {p.responsavel_nome ? `  ·  Resp.: ${p.responsavel_nome}` : ''}
                          {p.criado_em ? `  ·  Criado em: ${fmtData(new Date(p.criado_em).toLocaleDateString('sv-SE'))}` : ''}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>}
        </div>
      </div>
    )
  }

  const renderStep4 = () => (
    <div>
      <p className="text-xs text-slate-500 mb-3">Revise a ata abaixo antes de salvar ou baixar o PDF. Role para ver o conteúdo completo.</p>
      <div className="overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 shadow-sm bg-white" style={{ maxHeight: '68vh' }}>
        <AtaPreview form={form} />
      </div>
    </div>
  )

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl">
      {/* Cabeçalho da página */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/projetos')}
            className="mt-0.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Voltar para Projetos">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Ata de Reunião</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gere e gerencie atas profissionais das reuniões gerenciais</p>
          </div>
        </div>
        <button onClick={abrirNovaAta}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
          <Plus className="h-4 w-4" /> Gerar Nova Ata
        </button>
      </div>

      {/* Lista de atas ou empty state */}
      {carregandoLista ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-400">Carregando atas...</span>
        </div>
      ) : atas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Nenhuma ata registrada</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">Clique em "Gerar Nova Ata" para criar a primeira ata da reunião</p>
        </div>
      ) : (
        <div className="space-y-2">
          {atas.map(ata => {
            const nPartic = (ata.participantes_nomes || []).length
            const dataStr = ata.data ? fmtData(ata.data) : '—'
            return (
              <div key={ata.id}
                className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                {/* Ícone */}
                <div className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">{dataStr}</span>
                    {ata.local && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />{ata.local}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {ata.responsavel_ata_nome && (
                      <span className="text-[11px] text-slate-500">Resp.: {ata.responsavel_ata_nome}</span>
                    )}
                    {nPartic > 0 && (
                      <span className="text-[11px] text-slate-400">{nPartic} participante{nPartic !== 1 ? 's' : ''}</span>
                    )}
                    <span className="text-[11px] text-slate-300">
                      Salva em {fmtData((ata.criado_em || '').split('T')[0])}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => visualizarAta(ata)} title="Visualizar"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => editarAta(ata)} title="Editar"
                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => downloadAtaDireto(ata)} title="Baixar PDF"
                    disabled={gerandoPdf}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-40">
                    {gerandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={() => setConfirmDelete(ata.id)} title="Excluir"
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal — Gerenciar Locais */}
      {modalLocais && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900">Locais de Reunião</h3>
              </div>
              <button onClick={() => setModalLocais(false)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <input type="text" value={novoLocal} onChange={e => setNovoLocal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && adicionarLocal()}
                  placeholder="Ex: Sala de Reuniões – Matriz"
                  className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                <button onClick={adicionarLocal} disabled={!novoLocal.trim()}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-md transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {locais.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhum local cadastrado ainda.</p>
                ) : locais.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 group">
                    {editLocal?.idx === idx ? (
                      <>
                        <input type="text" value={editLocal.valor}
                          onChange={e => setEditLocal(ev => ({ ...ev, valor: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && salvarEdicaoLocal()}
                          autoFocus
                          className="flex-1 text-xs px-2 py-1 border border-blue-300 rounded bg-white focus:ring-2 focus:ring-blue-500/20 outline-none" />
                        <button onClick={salvarEdicaoLocal} className="p-1 text-teal-600 hover:text-teal-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditLocal(null)} className="p-1 text-slate-400 hover:text-red-500">
                          <XIcon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="flex-1 text-xs text-slate-700 truncate">{l}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditLocal({ idx, valor: l })} title="Editar"
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => excluirLocal(idx)} title="Excluir"
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button onClick={() => { set('local', l); setModalLocais(false) }}
                          title="Usar este local"
                          className="px-2 py-0.5 rounded text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors shrink-0">
                          Usar
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Confirmar exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir ata?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={() => excluirAta(confirmDelete)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Visualizar ata (formato A4 limpo) */}
      {ataVisualizar && (() => {
        const fv = rowToForm(ataVisualizar)
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ maxWidth: '860px', width: '100%', maxHeight: '96vh' }}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
                <span className="text-sm font-bold text-slate-800">Ata — {fmtData(ataVisualizar.data)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAtaVisualizar(null); editarAta(ataVisualizar) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200 hover:bg-amber-50 rounded-lg transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Atualizar Ata
                  </button>
                  <button onClick={() => { setForm(fv); setTimeout(() => gerarPdf(fv.data), 150) }}
                    disabled={gerandoPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-40">
                    {gerandoPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Baixar PDF
                  </button>
                  <button onClick={() => setAtaVisualizar(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="overflow-auto p-4" style={{ background: '#e5e7eb' }}>
                <div className="mx-auto shadow-lg" style={{ width: '794px' }}>
                  <AtaPreview form={fv} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Preview off-screen para PDF */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <AtaPreview form={form} ref={pdfRef} />
      </div>

      {/* Modal wizard */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col ${etapa === 4 ? 'max-w-4xl' : 'max-w-2xl'}`} style={{ maxHeight: '92vh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {ataEditandoId ? 'Editar Ata de Reunião' : 'Gerar Ata de Reunião'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Etapa {etapa} de {ETAPAS.length} — {ETAPAS[etapa - 1]}</p>
              </div>
              <button onClick={() => setModalAberto(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Barra de progresso */}
            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                {ETAPAS.map((label, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      i + 1 === etapa ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300' :
                      i + 1 < etapa  ? 'bg-teal-100 text-teal-700' : 'text-slate-400'
                    }`}>
                      {i + 1 < etapa ? <Check className="h-3 w-3" /> : <span className="w-3 text-center">{i + 1}</span>}
                      {label}
                    </div>
                    {i < ETAPAS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Corpo */}
            <div className="flex-1 overflow-y-auto p-6">
              {carregando ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
                  <span className="text-sm text-slate-500">Carregando projetos...</span>
                </div>
              ) : (
                <>
                  {etapa === 1 && renderStep1()}
                  {etapa === 2 && renderStep2()}
                  {etapa === 3 && renderStep3()}
                  {etapa === 4 && renderStep4()}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl">
              <button
                onClick={() => etapa > 1 ? setEtapa(e => e - 1) : setModalAberto(false)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                {etapa > 1 ? 'Voltar' : 'Cancelar'}
              </button>

              <div className="flex items-center gap-2">
                {/* Salvar — disponível em todas as etapas */}
                <button onClick={salvarAta} disabled={salvando || carregando || (!ataEditandoId && (!form.data || !form.local))}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {salvando ? 'Salvando...' : ataEditandoId ? 'Atualizar Ata' : 'Salvar Ata'}
                </button>

                {/* Baixar PDF — apenas etapa 4 */}
                {etapa === 4 && (
                  <button onClick={() => gerarPdf()} disabled={gerandoPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                    {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {gerandoPdf ? 'Gerando...' : 'Baixar PDF'}
                  </button>
                )}

                {/* Fechar — todas as etapas */}
                <button onClick={() => setModalAberto(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold rounded-lg transition-colors">
                  <XIcon className="h-4 w-4" />
                  Fechar
                </button>

                {/* Avançar — etapas 1–3 */}
                {etapa < 4 && (
                  <button onClick={() => setEtapa(e => e + 1)} disabled={!podeAvancar || carregando}
                    className="flex items-center gap-2 px-5 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                    Avançar <ChevronRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
