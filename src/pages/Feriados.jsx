import React, { useEffect, useState, useCallback } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Copy, CheckSquare, Square, Calendar } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const TIPOS_PAUSA   = ['FERIADO', 'PARADA PARCIAL', 'PARADA TOTAL']
const TIPOS_FERIADO = ['ESTADUAL', 'MUNICIPAL', 'NACIONAL']
const TIPOS_DATA    = ['FIXA', 'MÓVEL']
const DIAS_SEMANA   = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 11 }, (_, i) => anoAtual - 2 + i)

const FORM_VAZIO = {
  empresa_id: '', empresa_nome: '',
  data_feriado: '', dia_semana: '',
  descricao: '',
  tipo_pausa: 'FERIADO', tipo_feriado: 'NACIONAL', tipo_data: 'FIXA',
  ano: anoAtual,
}

const calcDiaSemana = (dateStr) => {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const INP = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const INP_RO = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed'
const SEL = `${INP} bg-white`
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_DNG = 'inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'

export default function Feriados() {
  const [empresas, setEmpresas]       = useState([])
  const [dados, setDados]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)

  const [filtroEmpresa, setFiltroEmpresa] = useSessionState('fer_empresa', '')
  const [filtroAno, setFiltroAno]         = useSessionState('fer_ano', anoAtual)

  const [selecionados, setSelecionados] = useState([])

  const [modalAberto, setModalAberto]           = useState(false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalDuplicarAberto, setModalDuplicarAberto] = useState(false)
  const [modo, setModo]                         = useState('incluir')
  const [idSelecionado, setIdSelecionado]       = useState(null)
  const [form, setForm]                         = useState(FORM_VAZIO)
  const [salvando, setSalvando]                 = useState(false)
  const [anoDestino, setAnoDestino]             = useState(anoAtual + 1)
  const [datesMoveis, setDatesMoveis]           = useState({})
  const [erroModal, setErroModal]               = useState(null)
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('feriados', 'editar')
  const canDelete = hasPermission('feriados', 'excluir')

  useEffect(() => { loadData() }, [filtroEmpresa, filtroAno])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelecionados([])
    try {
      const [feriadosData, empresasData] = await Promise.all([
        apiService.getFeriados(filtroEmpresa || null, filtroAno || null),
        apiService.getEmpresas(),
      ])
      const sorted = [...empresasData].sort((a, b) =>
        (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '')
      )
      setEmpresas(sorted)
      setDados(feriadosData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [filtroEmpresa, filtroAno])

  const abrirIncluir = () => {
    const empSel = empresas.find(e => e.id === filtroEmpresa)
    setForm({
      ...FORM_VAZIO,
      empresa_id: filtroEmpresa || '',
      empresa_nome: empSel ? (empSel.empresa_fantasia || empSel.nome_empresa) : '',
      ano: filtroAno || anoAtual,
    })
    setErroModal(null)
    setModo('incluir')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setForm({
      empresa_id:   item.empresa_id   || '',
      empresa_nome: item.empresa_nome || '',
      data_feriado: item.data_feriado || '',
      dia_semana:   item.dia_semana   || calcDiaSemana(item.data_feriado),
      descricao:    item.descricao    || '',
      tipo_pausa:   item.tipo_pausa   || 'FERIADO',
      tipo_feriado: item.tipo_feriado || 'NACIONAL',
      tipo_data:    item.tipo_data    || 'FIXA',
      ano:          item.ano          || anoAtual,
    })
    setIdSelecionado(item.id)
    setErroModal(null)
    setModo('editar')
    setModalAberto(true)
  }

  const abrirVisualizar = (item) => {
    setForm({
      empresa_id:   item.empresa_id   || '',
      empresa_nome: item.empresa_nome || '',
      data_feriado: item.data_feriado || '',
      dia_semana:   item.dia_semana   || calcDiaSemana(item.data_feriado),
      descricao:    item.descricao    || '',
      tipo_pausa:   item.tipo_pausa   || 'FERIADO',
      tipo_feriado: item.tipo_feriado || 'NACIONAL',
      tipo_data:    item.tipo_data    || 'FIXA',
      ano:          item.ano          || anoAtual,
    })
    setIdSelecionado(item.id)
    setErroModal(null)
    setModo('visualizar')
    setModalAberto(true)
  }

  const abrirExcluir = (id) => { setIdSelecionado(id); setModalExcluirAberto(true) }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    if (name === 'data_feriado') {
      const dia = calcDiaSemana(value)
      const ano = value ? parseInt(value.split('-')[0], 10) : form.ano
      const emp = empresas.find(x => x.id === form.empresa_id)
      setForm(prev => ({ ...prev, data_feriado: value, dia_semana: dia, ano }))
      return
    }
    if (name === 'empresa_id') {
      const emp = empresas.find(x => x.id === value)
      setForm(prev => ({ ...prev, empresa_id: value, empresa_nome: emp ? (emp.empresa_fantasia || emp.nome_empresa) : '' }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSalvar = async () => {
    if (!form.empresa_id) { setErroModal('Selecione a Empresa.'); return }
    if (!form.data_feriado) { setErroModal('Informe a Data do Feriado.'); return }
    if (!form.descricao.trim()) { setErroModal('Informe a Descrição.'); return }
    setSalvando(true)
    setErroModal(null)
    try {
      const payload = { ...form, ano: form.ano || parseInt(form.data_feriado.split('-')[0], 10) }
      if (modo === 'incluir') {
        await apiService.createFeriado(payload)
      } else {
        await apiService.updateFeriado(idSelecionado, payload)
      }
      setModalAberto(false)
      await loadData()
    } catch (err) {
      setErroModal(err.message || String(err))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteFeriado(idSelecionado)
      setModalExcluirAberto(false)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
      setModalExcluirAberto(false)
    }
  }

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return
    if (!window.confirm(`Excluir ${selecionados.length} feriado(s) selecionado(s)?`)) return
    try {
      await apiService.deleteFeriadosLote(selecionados)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const handleDuplicar = async () => {
    if (!filtroEmpresa) { alert('Selecione uma Empresa no filtro para duplicar.'); return }
    if (!filtroAno)     { alert('Selecione um Ano no filtro para usar como origem.'); return }
    const novoAno = filtroAno + 1
    setAnoDestino(novoAno)
    const iniciais = {}
    dados.filter(d => d.tipo_data === 'MÓVEL').forEach(d => {
      iniciais[d.id] = d.data_feriado
        ? d.data_feriado.replace(/^\d{4}/, String(novoAno))
        : ''
    })
    setDatesMoveis(iniciais)
    setModalDuplicarAberto(true)
  }

  const handleAnoDestinoChange = (novoAno) => {
    setAnoDestino(novoAno)
    setDatesMoveis(prev => {
      const atualizado = {}
      Object.keys(prev).forEach(id => {
        const orig = prev[id]
        atualizado[id] = orig ? orig.replace(/^\d{4}/, String(novoAno)) : ''
      })
      return atualizado
    })
  }

  const confirmarDuplicar = async () => {
    if (!anoDestino || anoDestino === filtroAno) {
      alert('O ano de destino deve ser diferente do ano de origem.')
      return
    }
    const dadosComMoveis = dados.map(d => {
      if (d.tipo_data === 'MÓVEL' && datesMoveis[d.id] !== undefined) {
        return { ...d, data_feriado: datesMoveis[d.id], dia_semana: calcDiaSemana(datesMoveis[d.id]) }
      }
      return d
    })
    try {
      await apiService.duplicarAnoFeriados(dadosComMoveis, anoDestino)
      setModalDuplicarAberto(false)
      setFiltroAno(anoDestino)
    } catch (err) {
      setError(err.message || String(err))
      setModalDuplicarAberto(false)
    }
  }

  const toggleSelecionado = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleTodos = () => {
    setSelecionados(prev => prev.length === dados.length ? [] : dados.map(d => d.id))
  }

  const BADGE_PAUSA = {
    'FERIADO':        'bg-red-100 text-red-700 border border-red-200',
    'PARADA PARCIAL': 'bg-orange-100 text-orange-700 border border-orange-200',
    'PARADA TOTAL':   'bg-rose-100 text-rose-700 border border-rose-200',
  }
  const BADGE_TIPO = {
    'NACIONAL':  'bg-blue-100 text-blue-700 border border-blue-200',
    'ESTADUAL':  'bg-violet-100 text-violet-700 border border-violet-200',
    'MUNICIPAL': 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  }
  const BADGE_DATA = {
    'FIXA':  'bg-emerald-100 text-emerald-700 border border-emerald-200',
    'MÓVEL': 'bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200',
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">Feriados e Calendário</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDuplicar} className={BTN_SEC}>
            <Copy size={16} /> Duplicar Ano Operacional
          </button>
          {canEdit && (
            <button onClick={abrirIncluir} className={BTN_PRI}>
              <Plus size={16} /> Incluir Feriado
            </button>
          )}
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex-1 max-w-xs">
          <label className={LBL}>Empresa</label>
          <select className={SEL} value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
            <option value="">Todas as empresas</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className={LBL}>Ano</label>
          <select className={SEL} value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))}>
            <option value="">Todos</option>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {selecionados.length > 0 && (
          <button onClick={handleExcluirSelecionados} className={BTN_DNG}>
            <Trash2 size={16} /> Excluir Selecionados ({selecionados.length})
          </button>
        )}
        <span className="ml-auto text-sm text-slate-500 self-end">{dados.length} registro(s)</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full min-w-[960px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <button onClick={toggleTodos} className="text-slate-500 hover:text-indigo-600">
                    {selecionados.length === dados.length && dados.length > 0
                      ? <CheckSquare size={16} />
                      : <Square size={16} />}
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Data</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Dia da Semana</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Empresa</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Descrição</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo Pausa</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo Feriado</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">Tipo Data</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400">Carregando...</td></tr>
              ) : dados.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400">Nenhum feriado encontrado.</td></tr>
              ) : dados.map((item, idx) => (
                <tr key={item.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => toggleSelecionado(item.id)} className="text-slate-400 hover:text-indigo-600">
                      {selecionados.includes(item.id) ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">
                    {item.data_feriado ? item.data_feriado.split('-').reverse().join('/') : '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{item.dia_semana || '-'}</td>
                  <td className="px-3 py-2 text-slate-700 font-medium">{item.empresa_nome || '-'}</td>
                  <td className="px-3 py-2 text-slate-700">{item.descricao}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_PAUSA[item.tipo_pausa] || 'bg-slate-100 text-slate-600'}`}>
                      {item.tipo_pausa}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_TIPO[item.tipo_feriado] || 'bg-slate-100 text-slate-600'}`}>
                      {item.tipo_feriado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_DATA[item.tipo_data] || 'bg-slate-100 text-slate-600'}`}>
                      {item.tipo_data}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <PermissionActionButtons
                      menuPath="feriados"
                      onView={() => abrirVisualizar(item)}
                      onEdit={() => abrirEditar(item)}
                      onDelete={() => abrirExcluir(item.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {modo === 'incluir' ? 'Incluir Feriado' : 'Editar Feriado'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Empresa */}
              <div className="col-span-2">
                <label className={LBL}>Empresa *</label>
                <select name="empresa_id" className={SEL} value={form.empresa_id} onChange={handleFormChange}>
                  <option value="">Selecione...</option>
                  {empresas.map(e => (
                    <option key={e.id} value={e.id}>{e.empresa_fantasia || e.nome_empresa}</option>
                  ))}
                </select>
              </div>

              {/* Data */}
              <div>
                <label className={LBL}>Data do Feriado *</label>
                <input type="date" name="data_feriado" className={INP} value={form.data_feriado} onChange={handleFormChange} />
              </div>

              {/* Dia da Semana (auto) */}
              <div>
                <label className={LBL}>Dia da Semana</label>
                <input type="text" className={INP_RO} value={form.dia_semana} readOnly disabled />
              </div>

              {/* Descrição */}
              <div className="col-span-2">
                <label className={LBL}>Descrição *</label>
                <input type="text" name="descricao" className={INP} value={form.descricao} onChange={handleFormChange} placeholder="Ex: Natal, Tiradentes..." maxLength={120} />
              </div>

              {/* Tipo Pausa */}
              <div>
                <label className={LBL}>Tipo Pausa *</label>
                <select name="tipo_pausa" className={SEL} value={form.tipo_pausa} onChange={handleFormChange}>
                  {TIPOS_PAUSA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Tipo Feriado */}
              <div>
                <label className={LBL}>Tipo Feriado *</label>
                <select name="tipo_feriado" className={SEL} value={form.tipo_feriado} onChange={handleFormChange}>
                  {TIPOS_FERIADO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Tipo Data */}
              <div>
                <label className={LBL}>Tipo Data *</label>
                <select name="tipo_data" className={SEL} value={form.tipo_data} onChange={handleFormChange}>
                  {TIPOS_DATA.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Ano (readonly, derivado da data) */}
              <div>
                <label className={LBL}>Ano</label>
                <input type="text" className={INP_RO} value={form.ano || ''} readOnly disabled />
              </div>
            </div>

            {erroModal && (
              <div className="mx-6 mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                <AlertTriangle size={15} /> {erroModal}
              </div>
            )}

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setModalAberto(false)} className={BTN_SEC} disabled={salvando}>Cancelar</button>
              <button onClick={handleSalvar} className={BTN_PRI} disabled={salvando}>
                {salvando ? 'Salvando...' : modo === 'incluir' ? 'Incluir' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">Excluir Feriado</h2>
              <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalExcluirAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={handleExcluir} className={`${BTN_DNG} flex-1 justify-center`}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DUPLICAR ANO */}
      {modalDuplicarAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Duplicar Ano Operacional</h2>
              <button onClick={() => setModalDuplicarAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Todos os <strong>{dados.length}</strong> feriado(s) de <strong>{filtroAno}</strong> serão copiados para o ano abaixo.<br />
                Feriados <strong>FIXA</strong> terão o ano atualizado automaticamente.<br />
                Feriados <strong>MÓVEL</strong> podem ter a data ajustada abaixo antes de duplicar.
              </p>
              <div>
                <label className={LBL}>Ano de Destino *</label>
                <select className={SEL} value={anoDestino} onChange={e => handleAnoDestinoChange(Number(e.target.value))}>
                  {ANOS.filter(a => a !== filtroAno).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {dados.filter(d => d.tipo_data === 'MÓVEL').length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-fuchsia-700 uppercase tracking-wide">Datas Móveis — ajuste se necessário</p>
                  <div className="border border-fuchsia-200 rounded-lg divide-y divide-fuchsia-100 bg-fuchsia-50/40">
                    {dados.filter(d => d.tipo_data === 'MÓVEL').map(d => (
                      <div key={d.id} className="px-3 py-2.5">
                        <label className="block text-xs font-semibold text-fuchsia-700 mb-1">{d.descricao}</label>
                        <input
                          type="date"
                          className={INP}
                          value={datesMoveis[d.id] || ''}
                          onChange={e => setDatesMoveis(prev => ({ ...prev, [d.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setModalDuplicarAberto(false)} className={`${BTN_SEC} flex-1 justify-center`}>Cancelar</button>
              <button onClick={confirmarDuplicar} className={`${BTN_PRI} flex-1 justify-center`}>
                <Copy size={15} /> Duplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
