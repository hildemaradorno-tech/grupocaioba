import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Copy, CheckSquare, Square, Calendar, Trash2, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
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
  empresa_ids: [],
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

const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa
const anoDe = (dataStr) => Number(dataStr.slice(0, 4))
const fmtData = (d) => d ? d.split('-').reverse().join('/') : '-'

// No banco é uma linha por empresa; a tela agrupa as linhas de uma mesma data (mesma
// descrição e tipos) numa só, com a lista de empresas em que ela vale.
const agruparOcorrencias = (rows) => {
  const map = new Map()
  rows.forEach(r => {
    const k = [r.data_feriado, r.descricao, r.tipo_pausa, r.tipo_feriado, r.tipo_data].join('|')
    if (!map.has(k)) {
      map.set(k, {
        chave: k,
        data_feriado: r.data_feriado,
        descricao: r.descricao,
        tipo_pausa: r.tipo_pausa,
        tipo_feriado: r.tipo_feriado,
        tipo_data: r.tipo_data,
        registros: [],
      })
    }
    map.get(k).registros.push({ id: r.id, empresa_id: r.empresa_id, empresa_nome: r.empresa_nome })
  })
  return [...map.values()].sort((a, b) => a.data_feriado.localeCompare(b.data_feriado) || a.descricao.localeCompare(b.descricao))
}

const LBL = 'block text-xs font-semibold text-slate-600 mb-1'
const INP = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const INP_RO = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-500 bg-slate-50 cursor-not-allowed'
const SEL = `${INP} bg-white`
const BTN_PRI = 'inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_SEC = 'inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors'
const BTN_DNG = 'inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors'

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

export default function Feriados() {
  const [empresas, setEmpresas] = useState([])
  const [dados, setDados]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  // Sempre abre em "Todos" (não guarda a empresa escolhida da última visita).
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroAno, setFiltroAno]         = useSessionState('fer_ano', anoAtual)
  const [filtroTipoFeriado, setFiltroTipoFeriado] = useSessionState('fer_tipo_feriado', '')
  const [filtroTipoPausa, setFiltroTipoPausa]     = useSessionState('fer_tipo_pausa', '')
  const [filtroTipoData, setFiltroTipoData]       = useSessionState('fer_tipo_data', '')

  const [selecionados, setSelecionados] = useState([])
  const [ordem, setOrdem] = useState({ campo: 'data_feriado', dir: 'asc' })

  const [modalAberto, setModalAberto]                 = useState(false)
  const [modalDuplicarAberto, setModalDuplicarAberto] = useState(false)
  const [modo, setModo]                               = useState('incluir')
  const [ocorrenciaEditando, setOcorrenciaEditando]     = useState(null)
  const [form, setForm]                               = useState(FORM_VAZIO)
  const [salvando, setSalvando]                       = useState(false)
  const [anoDestino, setAnoDestino]                   = useState(anoAtual + 1)
  const [datesMoveis, setDatesMoveis]                 = useState({})
  const [naoDuplicar, setNaoDuplicar]                 = useState([])
  const [erroModal, setErroModal]                     = useState(null)
  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('feriados', 'editar')

  // Carrega todos os anos (a tela mostra uma linha por série, com data inicial e final) e
  // todas as empresas — o filtro de empresa é aplicado na tela, senão um feriado que vale
  // pra várias empresas apareceria só com a empresa filtrada.
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSelecionados([])
    try {
      const [feriadosData, empresasData] = await Promise.all([
        apiService.getFeriados(null, null),
        apiService.getEmpresas(),
      ])
      setEmpresas([...empresasData].sort((a, b) => nomeEmpresa(a).localeCompare(nomeEmpresa(b), 'pt-BR')))
      setDados(feriadosData)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const ocorrencias = useMemo(() => agruparOcorrencias(dados), [dados])
  const ocorrenciasFiltradas = useMemo(
    () => ocorrencias.filter(o =>
      (!filtroEmpresa || o.registros.some(r => r.empresa_id === filtroEmpresa)) &&
      (!filtroAno || anoDe(o.data_feriado) === filtroAno) &&
      (!filtroTipoFeriado || o.tipo_feriado === filtroTipoFeriado) &&
      (!filtroTipoPausa || o.tipo_pausa === filtroTipoPausa) &&
      (!filtroTipoData || o.tipo_data === filtroTipoData)
    ),
    [ocorrencias, filtroEmpresa, filtroAno, filtroTipoFeriado, filtroTipoPausa, filtroTipoData]
  )

  const ocorrenciasOrdenadas = useMemo(() => {
    const valor = {
      data_feriado: o => o.data_feriado,
      dia_semana: o => String(DIAS_SEMANA.indexOf(calcDiaSemana(o.data_feriado))).padStart(2, '0'),
      descricao: o => o.descricao || '',
      qtd_empresas: o => String(o.registros.length).padStart(4, '0'),
      tipo_pausa: o => o.tipo_pausa || '',
      tipo_feriado: o => o.tipo_feriado || '',
      tipo_data: o => o.tipo_data || '',
    }[ordem.campo]
    const fator = ordem.dir === 'asc' ? 1 : -1
    return [...ocorrenciasFiltradas].sort((a, b) =>
      fator * (String(valor(a)).localeCompare(String(valor(b)), 'pt-BR') || a.data_feriado.localeCompare(b.data_feriado)))
  }, [ocorrenciasFiltradas, ordem])

  const alternarOrdem = (campo) =>
    setOrdem(prev => prev.campo === campo ? { campo, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { campo, dir: 'asc' })

  const cabecalho = (campo, label, alinhamento = 'left', extra = '') => {
    const ativo = ordem.campo === campo
    const Icone = !ativo ? ArrowUpDown : ordem.dir === 'asc' ? ArrowUp : ArrowDown
    return (
      <th className={`px-3 py-3 text-${alinhamento} text-xs font-semibold text-slate-600 uppercase tracking-wide ${extra}`}>
        <button
          type="button"
          onClick={() => alternarOrdem(campo)}
          className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-indigo-600 ${ativo ? 'text-indigo-600' : ''}`}
          title="Ordenar"
        >
          {label}
          <Icone size={12} className={ativo ? '' : 'opacity-40'} />
        </button>
      </th>
    )
  }

  const anoDaData = form.data_feriado ? anoDe(form.data_feriado) : null

  const abrirIncluir = () => {
    setForm({
      ...FORM_VAZIO,
      empresa_ids: filtroEmpresa ? [filtroEmpresa] : [],
      ano: filtroAno || anoAtual,
    })
    setOcorrenciaEditando(null)
    setErroModal(null)
    setModo('incluir')
    setModalAberto(true)
  }

  const abrirEditar = (o) => {
    setForm({
      empresa_ids:  o.registros.map(r => r.empresa_id),
      data_feriado: o.data_feriado,
      dia_semana:   calcDiaSemana(o.data_feriado),
      descricao:    o.descricao || '',
      tipo_pausa:   o.tipo_pausa || 'FERIADO',
      tipo_feriado: o.tipo_feriado || 'NACIONAL',
      tipo_data:    o.tipo_data || 'FIXA',
      ano:          anoDe(o.data_feriado),
    })
    setOcorrenciaEditando(o)
    setErroModal(null)
    setModo('editar')
    setModalAberto(true)
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    if (name === 'data_feriado') {
      const ano = value ? anoDe(value) : form.ano
      setForm(prev => ({ ...prev, data_feriado: value, dia_semana: calcDiaSemana(value), ano }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const toggleEmpresaForm = (id) => {
    setForm(prev => ({
      ...prev,
      empresa_ids: prev.empresa_ids.includes(id) ? prev.empresa_ids.filter(x => x !== id) : [...prev.empresa_ids, id],
    }))
  }

  const handleSalvar = async () => {
    if (form.empresa_ids.length === 0) { setErroModal('Selecione pelo menos uma Empresa.'); return }
    if (!form.data_feriado) { setErroModal('Informe a Data do Feriado.'); return }
    if (!form.descricao.trim()) { setErroModal('Informe a Descrição.'); return }
    setSalvando(true)
    setErroModal(null)
    try {
      const { empresa_ids, ...campos } = form
      const base = { ...campos, descricao: form.descricao.trim(), ano: anoDaData }
      const selecionadas = empresas
        .filter(e => empresa_ids.includes(e.id))
        .map(e => ({ id: e.id, nome: nomeEmpresa(e) }))
      if (modo === 'incluir') {
        await apiService.createFeriadoEmpresas(base, selecionadas)
      } else {
        await apiService.salvarFeriadoEmpresas(ocorrenciaEditando.registros, base, selecionadas)
      }
      setModalAberto(false)
      await loadData()
    } catch (err) {
      setErroModal(err.message || String(err))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluirSelecionados = async () => {
    if (selecionados.length === 0) return
    if (!window.confirm(`Excluir ${selecionados.length} feriado(s) selecionado(s)? Eles serão removidos de todas as empresas em que aparecem.`)) return
    const ids = ocorrencias
      .filter(o => selecionados.includes(o.chave))
      .flatMap(o => o.registros.map(r => r.id))
    try {
      await apiService.deleteFeriadosLote(ids)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  const dataNoAno = (dataStr, ano) => dataStr ? dataStr.replace(/^\d{4}/, String(ano)) : ''

  const ocorrenciasOrigem = ocorrencias.filter(o => anoDe(o.data_feriado) === filtroAno)
  const ocorrenciasMoveis = ocorrenciasOrigem.filter(o => o.tipo_data === 'MÓVEL')

  const handleDuplicar = () => {
    if (!filtroAno) { alert('Selecione um Ano no filtro para usar como origem.'); return }
    if (ocorrenciasOrigem.length === 0) { alert('Não há feriados neste ano para duplicar.'); return }
    const novoAno = filtroAno + 1
    setAnoDestino(novoAno)
    setDatesMoveis(Object.fromEntries(ocorrenciasMoveis.map(o => [o.chave, dataNoAno(o.data_feriado, novoAno)])))
    setNaoDuplicar([])
    setModalDuplicarAberto(true)
  }

  const handleAnoDestinoChange = (novoAno) => {
    setAnoDestino(novoAno)
    setDatesMoveis(prev => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, dataNoAno(v, novoAno)])))
  }

  const toggleNaoDuplicar = (chave) => {
    setNaoDuplicar(prev => prev.includes(chave) ? prev.filter(x => x !== chave) : [...prev, chave])
  }

  const confirmarDuplicar = async () => {
    if (!anoDestino || anoDestino === filtroAno) {
      alert('O ano de destino deve ser diferente do ano de origem.')
      return
    }
    const semData = ocorrenciasMoveis.find(o => !naoDuplicar.includes(o.chave) && !datesMoveis[o.chave])
    if (semData) {
      alert(`Informe a data de "${semData.descricao}" no ano de destino, ou marque "Não duplicar".`)
      return
    }
    try {
      const jaExistentes = await apiService.getFeriados(null, anoDestino)
      if (jaExistentes.length > 0 && !window.confirm(`Já existem ${jaExistentes.length} registro(s) de feriado em ${anoDestino}. Duplicar mesmo assim (pode gerar registros repetidos)?`)) return
      const registros = ocorrenciasOrigem
        .filter(o => !naoDuplicar.includes(o.chave))
        .flatMap(o => {
          const data = o.tipo_data === 'MÓVEL' ? datesMoveis[o.chave] : dataNoAno(o.data_feriado, anoDestino)
          return o.registros.map(r => ({
            empresa_id: r.empresa_id,
            empresa_nome: r.empresa_nome,
            data_feriado: data,
            dia_semana: calcDiaSemana(data),
            descricao: o.descricao,
            tipo_pausa: o.tipo_pausa,
            tipo_feriado: o.tipo_feriado,
            tipo_data: o.tipo_data,
            ano: anoDestino,
          }))
        })
      await apiService.duplicarAnoFeriados(registros, anoDestino)
      setModalDuplicarAberto(false)
      setFiltroAno(anoDestino)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
      setModalDuplicarAberto(false)
    }
  }

  const toggleSelecionado = (chave) => {
    setSelecionados(prev => prev.includes(chave) ? prev.filter(x => x !== chave) : [...prev, chave])
  }

  const toggleTodos = () => {
    setSelecionados(prev => prev.length === ocorrenciasFiltradas.length ? [] : ocorrenciasFiltradas.map(o => o.chave))
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* CABEÇALHO */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">Feriados e Ausências</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDuplicar} className={BTN_SEC}>
            <Copy size={16} /> Duplicar Ano
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
            <option value="">Todos</option>
            {empresas.map(e => (
              <option key={e.id} value={e.id}>{nomeEmpresa(e)}</option>
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
        <div className="w-44">
          <label className={LBL}>Tipo de Feriado</label>
          <select className={SEL} value={filtroTipoFeriado} onChange={e => setFiltroTipoFeriado(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_FERIADO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-44">
          <label className={LBL}>Tipo de Pausa</label>
          <select className={SEL} value={filtroTipoPausa} onChange={e => setFiltroTipoPausa(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_PAUSA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="w-40">
          <label className={LBL}>Tipo de Data</label>
          <select className={SEL} value={filtroTipoData} onChange={e => setFiltroTipoData(e.target.value)}>
            <option value="">Todos</option>
            {TIPOS_DATA.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {selecionados.length > 0 && (
          <button onClick={handleExcluirSelecionados} className={BTN_DNG}>
            <Trash2 size={16} /> Excluir Selecionados ({selecionados.length})
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* TABELA */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-auto h-full">
          <table className="w-full min-w-[960px] text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-3 py-3 text-center">
                  <button onClick={toggleTodos} className="text-slate-500 hover:text-indigo-600">
                    {selecionados.length === ocorrenciasFiltradas.length && ocorrenciasFiltradas.length > 0
                      ? <CheckSquare size={16} />
                      : <Square size={16} />}
                  </button>
                </th>
                {cabecalho('data_feriado', 'Data')}
                {cabecalho('dia_semana', 'Dia da Semana')}
                {cabecalho('descricao', 'Descrição')}
                {cabecalho('qtd_empresas', 'Empresas', 'center')}
                {cabecalho('tipo_pausa', 'Tipo Pausa', 'center')}
                {cabecalho('tipo_feriado', 'Tipo Feriado', 'center')}
                {cabecalho('tipo_data', 'Tipo Data', 'center')}
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400">Carregando...</td></tr>
              ) : ocorrenciasFiltradas.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-400">Nenhum feriado encontrado.</td></tr>
              ) : ocorrenciasOrdenadas.map((s, idx) => (
                <tr key={s.chave} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/30 transition-colors`}>
                  <td className="px-3 py-2 text-center">
                    <button onClick={() => toggleSelecionado(s.chave)} className="text-slate-400 hover:text-indigo-600">
                      {selecionados.includes(s.chave) ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-700">{fmtData(s.data_feriado)}</td>
                  <td className="px-3 py-2 text-slate-600">{calcDiaSemana(s.data_feriado)}</td>
                  <td className="px-3 py-2 text-slate-700">{s.descricao}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className="inline-block min-w-[1.75rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 cursor-help"
                      title={[...s.registros].map(r => r.empresa_nome).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')).join('\n')}
                    >
                      {s.registros.length}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_PAUSA[s.tipo_pausa] || 'bg-slate-100 text-slate-600'}`}>
                      {s.tipo_pausa}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_TIPO[s.tipo_feriado] || 'bg-slate-100 text-slate-600'}`}>
                      {s.tipo_feriado}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_DATA[s.tipo_data] || 'bg-slate-100 text-slate-600'}`}>
                      {s.tipo_data}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <PermissionActionButtons
                      menuPath="feriados"
                      onEdit={() => abrirEditar(s)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">
                {modo === 'incluir' ? 'Incluir Feriado' : 'Editar Feriado'}
              </h2>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {/* Empresas (várias) */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600">Empresas em que este feriado aparece *</label>
                  <div className="flex items-center gap-2 text-xs">
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, empresa_ids: empresas.map(e => e.id) }))} className="text-indigo-600 hover:underline">Todas</button>
                    <span className="text-slate-300">|</span>
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, empresa_ids: [] }))} className="text-slate-500 hover:underline">Nenhuma</button>
                    <span className="text-slate-400">{form.empresa_ids.length}/{empresas.length}</span>
                  </div>
                </div>
                <div className="border border-slate-300 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                  {empresas.map(e => (
                    <label key={e.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
                      <input
                        type="checkbox"
                        checked={form.empresa_ids.includes(e.id)}
                        onChange={() => toggleEmpresaForm(e.id)}
                        className="w-3.5 h-3.5 rounded accent-indigo-600"
                      />
                      {nomeEmpresa(e)}
                    </label>
                  ))}
                </div>
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

              {/* Tipo Pausa, Tipo Feriado e Tipo Data na mesma linha */}
              <div className="col-span-2 grid grid-cols-3 gap-4">
                <div>
                  <label className={LBL}>Tipo Pausa *</label>
                  <select name="tipo_pausa" className={SEL} value={form.tipo_pausa} onChange={handleFormChange}>
                    {TIPOS_PAUSA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Tipo Feriado *</label>
                  <select name="tipo_feriado" className={SEL} value={form.tipo_feriado} onChange={handleFormChange}>
                    {TIPOS_FERIADO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LBL}>Tipo Data *</label>
                  <select name="tipo_data" className={SEL} value={form.tipo_data} onChange={handleFormChange}>
                    {TIPOS_DATA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
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

      {/* MODAL DUPLICAR ANO */}
      {modalDuplicarAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Duplicar Ano</h2>
              <button onClick={() => setModalDuplicarAberto(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">
                Todos os <strong>{ocorrenciasOrigem.length}</strong> feriado(s) de <strong>{filtroAno}</strong> (de todas as empresas) serão copiados para o ano abaixo.<br />
                Feriados <strong>FIXA</strong> terão o ano atualizado automaticamente.<br />
                Feriados <strong>MÓVEL</strong> podem ter a data ajustada ou ficar de fora da cópia.
              </p>
              <div>
                <label className={LBL}>Ano de Destino *</label>
                <select className={SEL} value={anoDestino} onChange={e => handleAnoDestinoChange(Number(e.target.value))}>
                  {ANOS.filter(a => a !== filtroAno).map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              {ocorrenciasMoveis.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-fuchsia-700 uppercase tracking-wide">Feriados e ausências móveis — ajuste a data ou marque para não duplicar</p>
                  <div className="border border-fuchsia-200 rounded-lg divide-y divide-fuchsia-100 bg-fuchsia-50/40">
                    {ocorrenciasMoveis.map(o => {
                      const excluido = naoDuplicar.includes(o.chave)
                      return (
                        <div key={o.chave} className={`px-3 py-2.5 ${excluido ? 'opacity-50' : ''}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <label className="block text-xs font-semibold text-fuchsia-700">{o.descricao}</label>
                            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={excluido}
                                onChange={() => toggleNaoDuplicar(o.chave)}
                                className="w-3.5 h-3.5 rounded accent-red-600"
                              />
                              Não duplicar
                            </label>
                          </div>
                          <input
                            type="date"
                            className={INP}
                            disabled={excluido}
                            value={datesMoveis[o.chave] || ''}
                            onChange={e => setDatesMoveis(prev => ({ ...prev, [o.chave]: e.target.value }))}
                          />
                        </div>
                      )
                    })}
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
