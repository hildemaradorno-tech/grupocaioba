import React, { useState, useEffect, useRef } from 'react'
import { X, Save, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { apiService } from '../../services/api'
import CalendarioPicker from './CalendarioPicker'

const hoje = new Date().toISOString().slice(0, 10)

const FORM_VAZIO = {
  nome: '', descricao: '',
  sistema_id: '', sistema_nome: '',
  fase_id: '', fase_nome: '',
  responsavel_id: '', responsavel_nome: '',
  empresa_id: '', empresa_nome: '',
  area_id: '', area_nome: '',
  data_inicio: '', data_fim: '', progresso_pct: 0,
  status_kanban: 'mapeado', cor: '#2563eb',
  etapa: null,
}

const ordinal = (n) => `${n}ª Etapa`

const alertSel = (empty) =>
  `w-full text-xs p-2 border rounded-md bg-white focus:ring-2 ${
    empty ? 'border-amber-300 bg-amber-50/60 focus:ring-amber-400/30' : 'border-slate-200 focus:ring-blue-500/20'
  }`
const alertLabel = (empty) =>
  `text-[10px] font-bold uppercase flex items-center gap-1 ${empty ? 'text-amber-600' : 'text-slate-500'}`

const STATUS_KANBAN_OPTIONS = [
  { value: 'mapeado',      label: 'Mapeado' },
  { value: 'programado',   label: 'Programado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'pausado',      label: 'Pausado' },
  { value: 'concluido',    label: 'Concluído' },
]


export default function TarefaFormModal({ projetoId, tarefa, initialValues, tarefas, dependenciasAtuais, responsaveis, sistemas, fases, empresas, areas, onClose, onSaved, onNavigate }) {
  const modoEdicao = Boolean(tarefa)

  const tarefasOrdenadas = [...tarefas].sort((a, b) => {
    const ea = a.etapa ?? 9999, eb = b.etapa ?? 9999
    return ea !== eb ? ea - eb : (a.nome || '').localeCompare(b.nome || '', 'pt-BR')
  })
  const currentIndex = modoEdicao ? tarefasOrdenadas.findIndex(t => t.id === tarefa.id) : -1
  const prevTarefa   = currentIndex > 0 ? tarefasOrdenadas[currentIndex - 1] : null
  const nextTarefa   = currentIndex >= 0 && currentIndex < tarefasOrdenadas.length - 1 ? tarefasOrdenadas[currentIndex + 1] : null

  // Ref sempre atualizado com os arrays de opções — resolve closure stale no fetch assíncrono
  const optsRef = useRef({ responsaveis, sistemas, fases, empresas, areas })
  useEffect(() => {
    optsRef.current = { responsaveis, sistemas, fases, empresas, areas }
  }, [responsaveis, sistemas, fases, empresas, areas])

  // Busca case-insensitive com trim para lookup de nome→id
  const findByNome = (list, nome) =>
    list?.find(x => x.nome?.trim().toLowerCase() === nome?.trim().toLowerCase())

  const normalizarBase = (raw, opts) => {
    const { responsaveis: rs, sistemas: ss, fases: fs, empresas: es, areas: as } =
      opts || optsRef.current
    const base = { ...FORM_VAZIO, ...raw }
    ;['nome', 'descricao', 'empresa_nome', 'area_nome', 'sistema_nome',
      'fase_nome', 'responsavel_nome', 'data_inicio', 'data_fim'].forEach(k => {
      if (base[k] == null) base[k] = ''
    })
    if (!base.responsavel_id && base.responsavel_nome)
      { const r = findByNome(rs, base.responsavel_nome); if (r) base.responsavel_id = r.id }
    if (!base.sistema_id && base.sistema_nome)
      { const s = findByNome(ss, base.sistema_nome); if (s) base.sistema_id = s.id }
    if (!base.fase_id && base.fase_nome)
      { const f = findByNome(fs, base.fase_nome); if (f) base.fase_id = f.id }
    if (!base.empresa_id && base.empresa_nome)
      { const e = findByNome(es, base.empresa_nome); if (e) base.empresa_id = e.id }
    if (!base.area_id && base.area_nome)
      { const a = findByNome(as, base.area_nome); if (a) base.area_id = a.id }
    if (base.status_kanban === 'concluido') base.progresso_pct = 100
    return base
  }

  const [form, setForm] = useState(() => {
    const base = normalizarBase(tarefa || (initialValues || {}), { responsaveis, sistemas, fases, empresas, areas })
    if (!modoEdicao && base.etapa == null) {
      const tomadas = new Set(tarefas.filter(t => t.etapa != null).map(t => t.etapa))
      let prox = 1
      while (tomadas.has(prox) && prox <= 50) prox++
      if (prox <= 50) base.etapa = prox
    }
    return base
  })
  const [dependeDe, setDependeDe] = useState(() =>
    modoEdicao ? dependenciasAtuais.filter(d => d.tarefa_id === tarefa.id).map(d => d.depende_de_tarefa_id) : []
  )
  const [salvando, setSalvando] = useState(false)
  const [salvandoSemFechar, setSalvandoSemFechar] = useState(false)
  const [salvoMsg, setSalvoMsg] = useState(false)
  const [error, setError] = useState(null)
  const [deliberacoes, setDeliberacoes] = useState([])
  const [novaDelib, setNovaDelib] = useState({ data: hoje, texto: '' })
  const [adicionandoDelib, setAdicionandoDelib] = useState(false)
  const [templates, setTemplates] = useState([])
  const [ocupacao, setOcupacao] = useState([])
  const [carregandoOcup, setCarregandoOcup] = useState(false)
  const nomeRef = useRef(null)

  // Re-deriva _id a partir do _nome sempre que os arrays de opções chegam/mudam.
  useEffect(() => {
    setForm(prev => {
      const next = { ...prev }
      let changed = false
      if (!next.responsavel_id && next.responsavel_nome && responsaveis?.length) {
        const r = findByNome(responsaveis, next.responsavel_nome)
        if (r) { next.responsavel_id = r.id; changed = true }
      }
      if (!next.sistema_id && next.sistema_nome && sistemas?.length) {
        const s = findByNome(sistemas, next.sistema_nome)
        if (s) { next.sistema_id = s.id; changed = true }
      }
      if (!next.fase_id && next.fase_nome && fases?.length) {
        const f = findByNome(fases, next.fase_nome)
        if (f) { next.fase_id = f.id; changed = true }
      }
      if (!next.empresa_id && next.empresa_nome && empresas?.length) {
        const e = findByNome(empresas, next.empresa_nome)
        if (e) { next.empresa_id = e.id; changed = true }
      }
      if (!next.area_id && next.area_nome && areas?.length) {
        const a = findByNome(areas, next.area_nome)
        if (a) { next.area_id = a.id; changed = true }
      }
      return changed ? next : prev
    })
  }, [responsaveis, sistemas, fases, empresas, areas])

  // Fetch fresco do Supabase ao abrir em modo edição — usa optsRef para evitar closure stale
  useEffect(() => {
    if (!modoEdicao || !tarefa?.id) return
    apiService.getTarefaById(tarefa.id).then(fresh => {
      if (!fresh) return
      // optsRef.current sempre tem os arrays mais atuais, independente do timing do fetch
      setForm(normalizarBase(fresh, optsRef.current))
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tarefa?.id])

  useEffect(() => {
    if (modoEdicao && tarefa?.id) {
      apiService.getDeliberacoes(tarefa.id).then(setDeliberacoes).catch(() => {})
    }
  }, [modoEdicao, tarefa?.id])

  useEffect(() => {
    apiService.getProjTemplates().then(t => setTemplates(t.filter(x => x.ativo !== false))).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.responsavel_nome) { setOcupacao([]); return }
    setCarregandoOcup(true)
    apiService.getTarefasByResponsavelNome(form.responsavel_nome, tarefa?.id)
      .then(setOcupacao)
      .catch(() => setOcupacao([]))
      .finally(() => setCarregandoOcup(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.responsavel_nome])

  const outrasTarefas = tarefas.filter(t => !modoEdicao || t.id !== tarefa.id)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'responsavel_id') {
      const resp = responsaveis?.find(r => r.id === value)
      setForm(prev => ({ ...prev, responsavel_id: value, responsavel_nome: resp?.nome || '' }))
      return
    }
    if (name === 'sistema_id') {
      const sist = sistemas?.find(s => s.id === value)
      setForm(prev => ({ ...prev, sistema_id: value, sistema_nome: sist?.nome || '' }))
      return
    }
    if (name === 'fase_id') {
      const fase = fases?.find(f => f.id === value)
      setForm(prev => ({ ...prev, fase_id: value, fase_nome: fase?.nome || '' }))
      return
    }
    if (name === 'empresa_id') {
      const emp = empresas?.find(e => e.id === value)
      setForm(prev => ({ ...prev, empresa_id: value, empresa_nome: emp?.nome || '' }))
      return
    }
    if (name === 'area_id') {
      const area = areas?.find(a => a.id === value)
      setForm(prev => ({ ...prev, area_id: value, area_nome: area?.nome || '' }))
      return
    }
    if (name === 'status_kanban' && value === 'concluido') {
      setForm(prev => ({ ...prev, status_kanban: value, progresso_pct: 100 }))
      return
    }
    if (name === 'etapa') {
      setForm(prev => ({ ...prev, etapa: value === '' ? null : parseInt(value, 10) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleDependencia = (id) => {
    setDependeDe(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id])
  }

  const executarSalvamento = async () => {
    if (!form.nome.trim()) { setError('Informe o nome da tarefa.'); return false }
    setError(null)
    // _id auxiliares são apenas para os <select> de lookup — não existem na tabela proj_tarefas
    const { fase_id, sistema_id, responsavel_id, empresa_id, area_id, ...formSemIds } = form
    const payload = {
      ...formSemIds,
      projeto_id: projetoId,
      progresso_pct: Number(form.progresso_pct) || 0,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
    }

    if (payload.etapa != null) {
      if (!modoEdicao) {
        // Nova tarefa: desloca todas as etapas >= N para cima (mais alta primeiro, evita colisão)
        const afetadas = tarefas
          .filter(t => t.etapa != null && t.etapa >= payload.etapa)
          .sort((a, b) => b.etapa - a.etapa)
        for (const t of afetadas) {
          await apiService.updateTarefa(t.id, { etapa: t.etapa + 1 })
        }
      } else {
        // Edição: apenas libera conflito na etapa destino
        const conflito = tarefas.find(t => t.id !== tarefa?.id && t.etapa === payload.etapa)
        if (conflito) await apiService.updateTarefa(conflito.id, { etapa: null })
      }
    }

    let tarefaId
    if (modoEdicao) {
      const atualizada = await apiService.updateTarefa(tarefa.id, payload)
      tarefaId = atualizada.id
    } else {
      const nova = await apiService.createTarefa(payload)
      tarefaId = nova.id
    }

    const existentes = modoEdicao ? dependenciasAtuais.filter(d => d.tarefa_id === tarefaId) : []
    const existentesIds = existentes.map(d => d.depende_de_tarefa_id)
    const paraRemover = existentes.filter(d => !dependeDe.includes(d.depende_de_tarefa_id))
    const paraAdicionar = dependeDe.filter(id => !existentesIds.includes(id))

    await Promise.all([
      ...paraRemover.map(d => apiService.deleteDependencia(d.id)),
      ...paraAdicionar.map(id => apiService.createDependencia(tarefaId, id)),
    ])

    return true
  }

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      const ok = await executarSalvamento()
      if (ok) onSaved()
    } catch (err) { setError(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  const handleSalvarSemFechar = async () => {
    setSalvandoSemFechar(true)
    try {
      const ok = await executarSalvamento()
      if (ok) { setSalvoMsg(true); setTimeout(() => setSalvoMsg(false), 2000) }
    } catch (err) { setError(err.message || String(err)) }
    finally { setSalvandoSemFechar(false) }
  }

  return (
    <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-slate-200 w-[780px] max-h-[94vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{modoEdicao ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
          <div className="flex items-center gap-1">
            {modoEdicao && onNavigate && (
              <>
                <button
                  onClick={() => prevTarefa && onNavigate(prevTarefa)}
                  disabled={!prevTarefa}
                  title={prevTarefa ? `Anterior: ${prevTarefa.nome}` : 'Primeira tarefa'}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <span className="text-slate-200 text-sm">|</span>
                <button
                  onClick={() => nextTarefa && onNavigate(nextTarefa)}
                  disabled={!nextTarefa}
                  title={nextTarefa ? `Próxima: ${nextTarefa.nome}` : 'Última tarefa'}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <span className="text-slate-200 text-sm mx-1">|</span>
              </>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700">{error}</div>}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nome da Tarefa *</label>
            <textarea ref={nomeRef} name="nome" value={form.nome} onChange={handleChange} rows={5}
              className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 resize-none" />
            {templates.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      const el = nomeRef.current
                      const start = el ? el.selectionStart : (form.nome || '').length
                      const end = el ? el.selectionEnd : start
                      const atual = form.nome || ''
                      const novo = atual.slice(0, start) + t.texto + atual.slice(end)
                      setForm(prev => ({ ...prev, nome: novo }))
                      setTimeout(() => {
                        if (el) { el.focus(); el.setSelectionRange(start + t.texto.length, start + t.texto.length) }
                      }, 0)
                    }}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-400 transition-colors"
                    title={t.texto}
                  >
                    {t.texto.length > 50 ? t.texto.slice(0, 50) + '…' : t.texto}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className={alertLabel(!form.responsavel_id)}>
              Resp. Tarefa{!form.responsavel_id && <span className="text-amber-500">⚠</span>}
            </label>
            <select name="responsavel_id" value={form.responsavel_id} onChange={handleChange}
              className={alertSel(!form.responsavel_id)}>
              <option value="">Selecione</option>
              {responsaveis?.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>

          {/* Linha 1: Etapa | Início | Fim */}
          {(() => {
            const etapasTomadas = new Set(
              tarefas.filter(t => t.id !== tarefa?.id && t.etapa != null).map(t => t.etapa)
            )
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={alertLabel(form.etapa == null)}>
                    Etapa{form.etapa == null && <span className="text-amber-500">⚠</span>}
                  </label>
                  <select name="etapa" value={form.etapa ?? ''} onChange={handleChange}
                    className={alertSel(form.etapa == null)}>
                    <option value="">— Sem etapa —</option>
                    {Array.from({ length: 50 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        {ordinal(n)}{etapasTomadas.has(n) ? ' (em uso)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Início</label>
                  <CalendarioPicker name="data_inicio" value={form.data_inicio || ''} onChange={handleChange} ocupacao={ocupacao} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Fim</label>
                  <CalendarioPicker name="data_fim" value={form.data_fim || ''} onChange={handleChange} ocupacao={ocupacao} initialViewDate={form.data_inicio || ''} />
                </div>
              </div>
            )
          })()}

          {/* Linha 2: Sistema | Fase | Área */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className={alertLabel(!form.sistema_id)}>
                Sistema{!form.sistema_id && <span className="text-amber-500">⚠</span>}
              </label>
              <select name="sistema_id" value={form.sistema_id} onChange={handleChange}
                className={alertSel(!form.sistema_id)}>
                <option value="">Selecione</option>
                {sistemas?.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={alertLabel(!form.fase_id)}>
                Fase{!form.fase_id && <span className="text-amber-500">⚠</span>}
              </label>
              <select name="fase_id" value={form.fase_id} onChange={handleChange}
                className={alertSel(!form.fase_id)}>
                <option value="">Selecione</option>
                {fases?.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={alertLabel(!form.area_id)}>
                Área{!form.area_id && <span className="text-amber-500">⚠</span>}
              </label>
              <select name="area_id" value={form.area_id} onChange={handleChange}
                className={alertSel(!form.area_id)}>
                <option value="">Selecione</option>
                {areas?.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Linha 3: Empresa | Status | Progresso */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className={alertLabel(!form.empresa_id)}>
                Empresa{!form.empresa_id && <span className="text-amber-500">⚠</span>}
              </label>
              <select name="empresa_id" value={form.empresa_id} onChange={handleChange}
                className={alertSel(!form.empresa_id)}>
                <option value="">Selecione</option>
                {empresas?.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Status (Kanban)</label>
              <select name="status_kanban" value={form.status_kanban} onChange={handleChange}
                className="w-full text-xs p-2 border border-slate-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/20">
                {STATUS_KANBAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Progresso (%)</label>
              <input type="number" min="0" max="100" name="progresso_pct" value={form.progresso_pct} onChange={handleChange}
                className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>

          {outrasTarefas.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Depende de</label>
              <div className="border border-slate-200 rounded-md max-h-32 overflow-y-auto divide-y divide-slate-50">
                {outrasTarefas.map(t => (
                  <label key={t.id} className="flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={dependeDe.includes(t.id)} onChange={() => toggleDependencia(t.id)} />
                    {t.nome}
                  </label>
                ))}
              </div>
            </div>
          )}

          {modoEdicao && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Deliberações</label>
              {deliberacoes.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Nenhuma deliberação registrada.</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {deliberacoes.map(d => (
                    <div key={d.id} className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 rounded px-2 py-1.5">
                      <span className="text-slate-400 shrink-0 font-medium">
                        {d.data ? new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                      </span>
                      <span className="flex-1">{d.texto}</span>
                      <button
                        onClick={async () => {
                          await apiService.deleteDeliberacao(d.id)
                          setDeliberacoes(prev => prev.filter(x => x.id !== d.id))
                        }}
                        className="shrink-0 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <input type="date" value={novaDelib.data}
                  onChange={e => setNovaDelib(p => ({ ...p, data: e.target.value }))}
                  className="text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20 w-36 shrink-0" />
                <input
                  value={novaDelib.texto}
                  onChange={e => setNovaDelib(p => ({ ...p, texto: e.target.value }))}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && novaDelib.texto.trim()) {
                      setAdicionandoDelib(true)
                      try {
                        await apiService.createDeliberacao(tarefa.id, novaDelib.data || hoje, novaDelib.texto.trim(), null)
                        const rows = await apiService.getDeliberacoes(tarefa.id)
                        setDeliberacoes(rows)
                        setNovaDelib({ data: hoje, texto: '' })
                      } finally { setAdicionandoDelib(false) }
                    }
                  }}
                  placeholder="Nova deliberação... (Enter para salvar)"
                  className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500/20" />
                <button
                  disabled={!novaDelib.texto.trim() || adicionandoDelib}
                  onClick={async () => {
                    if (!novaDelib.texto.trim()) return
                    setAdicionandoDelib(true)
                    try {
                      await apiService.createDeliberacao(tarefa.id, novaDelib.data || hoje, novaDelib.texto.trim(), null)
                      const rows = await apiService.getDeliberacoes(tarefa.id)
                      setDeliberacoes(rows)
                      setNovaDelib({ data: hoje, texto: '' })
                    } finally { setAdicionandoDelib(false) }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors shrink-0"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Cancelar</button>
          <button onClick={handleSalvarSemFechar} disabled={salvandoSemFechar || salvando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 disabled:opacity-60 transition-colors">
            {salvandoSemFechar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {salvoMsg ? 'Salvo!' : 'Salvar tarefa'}
          </button>
          <button onClick={handleSalvar} disabled={salvando || salvandoSemFechar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
