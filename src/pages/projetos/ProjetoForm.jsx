import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const FORM_VAZIO = {
  codigo: '', nome: '', descricao: '',
  empresa_id: '', empresa_nome: '',
  departamento_id: '', departamento_nome: '',
  area_nome: '',
  sistema_id: '', sistema_nome: '',
  fase_id: '', fase_nome: '',
  responsavel_id: '', responsavel_nome: '',
  data_inicio: '', data_fim_prevista: '', data_fim_real: '',
  status: 'planejado', cor: '#2563eb',
}

const STATUS_OPTIONS = [
  { value: 'planejado',    label: 'Planejado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'concluido',    label: 'Concluído' },
  { value: 'pausado',      label: 'Pausado' },
  { value: 'cancelado',    label: 'Cancelado' },
]


const LabelField = ({ children, required }) => (
  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
    {children}{required && <span className="text-red-400 ml-0.5">*</span>}
  </label>
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

export default function ProjetoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const modoEdicao = Boolean(id)

  const [form, setForm] = useState(FORM_VAZIO)
  const [empresas, setEmpresas] = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [areas, setAreas] = useState([])
  const [sistemas, setSistemas] = useState([])
  const [fases, setFases] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const [emps, deps, ars, sis, fas, resps] = await Promise.all([
          apiService.getEmpresas(),
          apiService.getProjDepartamentos(),
          apiService.getProjAreas(),
          apiService.getProjSistemas(),
          apiService.getProjFases(),
          apiService.getProjResponsaveis(),
        ])
        setEmpresas(emps.filter(e => e.ativo !== false))
        setDepartamentos(deps.filter(d => d.ativo !== false))
        setAreas(ars.filter(a => a.ativo !== false))
        setSistemas(sis.filter(s => s.ativo !== false))
        setFases(fas.filter(f => f.ativo !== false))
        setResponsaveis(resps.filter(r => r.ativo !== false))

        if (modoEdicao) {
          const projeto = await apiService.getProjetoById(id)
          setForm({ ...FORM_VAZIO, ...projeto })
        }
      } catch (err) { setError(err.message || String(err)) }
      finally { setLoading(false) }
    }
    init()
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      setForm(prev => ({ ...prev, empresa_id: value, empresa_nome: emp?.empresa_fantasia || emp?.nome_empresa || '' }))
      return
    }
    if (name === 'departamento_id') {
      const dep = departamentos.find(x => x.id === value)
      setForm(prev => ({ ...prev, departamento_id: value, departamento_nome: dep?.nome || '' }))
      return
    }
    if (name === 'sistema_id') {
      const sis = sistemas.find(x => x.id === value)
      setForm(prev => ({ ...prev, sistema_id: value, sistema_nome: sis?.nome || '' }))
      return
    }
    if (name === 'fase_id') {
      const fase = fases.find(x => x.id === value)
      setForm(prev => ({ ...prev, fase_id: value, fase_nome: fase?.nome || '' }))
      return
    }
    if (name === 'responsavel_id') {
      const resp = responsaveis.find(x => x.id === value)
      setForm(prev => ({ ...prev, responsavel_id: value, responsavel_nome: resp?.nome || '' }))
      return
    }
    if (name === 'nome') {
      const start = e.target.selectionStart
      const end = e.target.selectionEnd
      setForm(prev => ({ ...prev, nome: value.toUpperCase() }))
      requestAnimationFrame(() => nomeRef.current?.setSelectionRange(start, end))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const nomeRef = useRef(null)

  const handleSalvar = async () => {
    if (!form.nome.trim()) { setError('Informe o nome do projeto.'); return }
    setSalvando(true); setError(null)
    try {
      const payload = { ...form }
      ;['codigo', 'descricao', 'empresa_id', 'departamento_id', 'sistema_id', 'fase_id', 'responsavel_id', 'data_inicio', 'data_fim_prevista', 'data_fim_real'].forEach(k => {
        if (payload[k] === '') payload[k] = null
      })
      if (modoEdicao) {
        await apiService.updateProjeto(id, payload)
        navigate(`/projetos/detalhe/${id}`)
      } else {
        const novo = await apiService.createProjeto(payload, user?.email)
        navigate(`/projetos/detalhe/${novo.id}`)
      }
    } catch (err) { setError(err.message || String(err)) }
    finally { setSalvando(false) }
  }

  if (loading) return <div className="p-10 text-center text-xs text-slate-400">Carregando...</div>

  return (
    <div className="p-6 space-y-5 max-w-screen-md">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
        <button onClick={() => navigate('/projetos')} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{modoEdicao ? 'Editar Projeto' : 'Novo Projeto'}</h1>
          <p className="text-xs text-slate-500">Dados gerais do projeto.</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col gap-1">
            <LabelField required>Nome do Projeto</LabelField>
            <input ref={nomeRef} name="nome" value={form.nome} onChange={handleChange} placeholder="Ex: Implantação Novo CRM"
              className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Código</LabelField>
            <InputField name="codigo" value={form.codigo} onChange={handleChange} placeholder="Ex: PRJ-001" />
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Cor</LabelField>
            <input type="color" name="cor" value={form.cor} onChange={handleChange} className="w-full h-[30px] border border-slate-200 rounded-md cursor-pointer" />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <LabelField>Descrição</LabelField>
            <textarea name="descricao" value={form.descricao} onChange={handleChange} rows={3}
              className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Empresa</LabelField>
            <SelectField name="empresa_id" value={form.empresa_id} onChange={handleChange}>
              <option value="">Selecione</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Departamento</LabelField>
            <SelectField name="departamento_id" value={form.departamento_id} onChange={handleChange}>
              <option value="">Selecione</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Área</LabelField>
            <SelectField name="area_nome" value={form.area_nome} onChange={handleChange}>
              <option value="">Selecione</option>
              {areas.map(a => <option key={a.id} value={a.nome}>{a.nome}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Fase</LabelField>
            <SelectField name="fase_id" value={form.fase_id} onChange={handleChange}>
              <option value="">Selecione</option>
              {fases.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Sistema</LabelField>
            <SelectField name="sistema_id" value={form.sistema_id} onChange={handleChange}>
              <option value="">Selecione</option>
              {sistemas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Responsável</LabelField>
            <SelectField name="responsavel_id" value={form.responsavel_id} onChange={handleChange}>
              <option value="">Selecione</option>
              {responsaveis.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </SelectField>
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Data Início</LabelField>
            <InputField type="date" name="data_inicio" value={form.data_inicio || ''} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Fim Previsto</LabelField>
            <InputField type="date" name="data_fim_prevista" value={form.data_fim_prevista || ''} onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <LabelField>Status</LabelField>
            <SelectField name="status" value={form.status} onChange={handleChange}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </SelectField>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={() => navigate('/projetos')} className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
        <button onClick={handleSalvar} disabled={salvando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </button>
      </div>
    </div>
  )
}
