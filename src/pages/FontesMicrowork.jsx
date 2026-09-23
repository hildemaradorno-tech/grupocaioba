import React, { useEffect, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Radio, Eye, Loader2, PlayCircle, Info, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const FORM_VAZIO = {
  nome: '', descricao: '',
  idrelatorioconfiguracao: '', idrelatorioconsulta: '', idrelatorioconfiguracaoleiaute: '', idrelatoriousuarioleiaute: '',
  ididioma: 1, listaempresas: '', filtros_fixos: '',
  coluna_empresa: '', coluna_data: '', coluna_funcionario: '',
  ativo: true,
}

const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// "1, 2, 13" -> [1, 2, 13] (ignora vazios/não-números)
function parseListaEmpresas(texto) {
  return String(texto || '')
    .split(',')
    .map(s => parseInt(s.trim(), 10))
    .filter(n => !isNaN(n))
}

// Identifica os campos a partir do texto colado (aceita o corpo/JSON puro ou o bloco inteiro
// com "POST:", "Header:", "Body Request:" na frente — só usa regex, não JSON.parse, porque o
// "filtros" costuma vir com quebras de linha dentro da string, o que não é JSON válido).
function parseRequisicaoMicrowork(texto) {
  const num = (regex) => {
    const m = texto.match(regex)
    return m ? parseInt(m[1], 10) : null
  }

  const idrelatorioconfiguracao = num(/"idrelatorioconfiguracao"\s*:\s*(\d+)/)
  const idrelatorioconsulta = num(/"idrelatorioconsulta"\s*:\s*(\d+)/)
  const idrelatorioconfiguracaoleiaute = num(/"idrelatorioconfiguracaoleiaute"\s*:\s*(\d+)/)
  const idrelatoriousuarioleiaute = num(/"idrelatoriousuarioleiaute"\s*:\s*(\d+)/)
  const ididioma = num(/"ididioma"\s*:\s*(\d+)/) || 1

  const empresasMatch = texto.match(/"listaempresas"\s*:\s*\[([^\]]*)\]/)
  const listaempresas = empresasMatch ? parseListaEmpresas(empresasMatch[1]) : []

  // Captura tudo entre "filtros": " e a última aspas antes do } final — cobre o valor
  // inteiro mesmo com quebras de linha/indentação no meio.
  const filtrosMatch = texto.match(/"filtros"\s*:\s*"([\s\S]*)"\s*\}/)
  let filtrosFixos = ''
  if (filtrosMatch) {
    const semEspacos = filtrosMatch[1].replace(/\s+/g, '')
    filtrosFixos = semEspacos
      .split(';')
      .filter(Boolean)
      .filter(par => !/^Periododeconclusao(Inicial|Final)=/i.test(par))
      .join(';')
  }

  const ok = !!(idrelatorioconfiguracao && idrelatorioconsulta && idrelatorioconfiguracaoleiaute && idrelatoriousuarioleiaute)

  return { idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute, idrelatoriousuarioleiaute, ididioma, listaempresas, filtrosFixos, ok }
}

// A resposta do MicroWork vem como array na raiz (ou, pra alguns relatórios, dentro de uma
// propriedade do objeto) — tenta achar a lista de registros nos dois formatos.
function extrairLista(data) {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    for (const v of Object.values(data)) {
      if (Array.isArray(v)) return v
    }
  }
  return null
}

export default function FontesMicrowork() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('fontemw_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [modalTestarAberto, setModalTestarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('fontemw_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [itemTestando, setItemTestando] = useState(null)
  const [form, setForm] = useSessionState('fontemw_form', FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [erroExcluir, setErroExcluir] = useState(null)

  const [colarTexto, setColarTexto] = useState('')
  const [erroColar, setErroColar] = useState(null)
  const [colarOk, setColarOk] = useState(false)

  const [detectando, setDetectando] = useState(false)
  const [erroDetectar, setErroDetectar] = useState(null)
  const [colunasDetectadas, setColunasDetectadas] = useState(null)
  const [filtroColuna, setFiltroColuna] = useState('')

  const agora = new Date()
  const [testeAno, setTesteAno] = useState(agora.getFullYear())
  const [testeMes, setTesteMes] = useState(agora.getMonth() + 1)
  const [testando, setTestando] = useState(false)
  const [erroTeste, setErroTeste] = useState(null)
  const [resultadoTeste, setResultadoTeste] = useState(null)

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('fontes-microwork', 'editar')
  const canDelete = hasPermission('fontes-microwork', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const fontes = await apiService.getFontesMicrowork()
      setDados(fontes)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO })
    setErroModal(null)
    setColarTexto('')
    setErroColar(null)
    setColarOk(false)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setFiltroColuna('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({
      nome: item.nome || '',
      descricao: item.descricao || '',
      idrelatorioconfiguracao: item.idrelatorioconfiguracao ?? '',
      idrelatorioconsulta: item.idrelatorioconsulta ?? '',
      idrelatorioconfiguracaoleiaute: item.idrelatorioconfiguracaoleiaute ?? '',
      idrelatoriousuarioleiaute: item.idrelatoriousuarioleiaute ?? '',
      ididioma: item.ididioma ?? 1,
      listaempresas: (item.listaempresas || []).join(', '),
      filtros_fixos: item.filtros_fixos || '',
      coluna_empresa: item.coluna_empresa || '',
      coluna_data: item.coluna_data || '',
      coluna_funcionario: item.coluna_funcionario || '',
      ativo: item.ativo ?? true,
    })
    setErroModal(null)
    setColarTexto('')
    setErroColar(null)
    setColarOk(false)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setFiltroColuna('')
    setModalAberto(true)
  }

  const handleDetectarColunas = async () => {
    setErroDetectar(null)
    setColunasDetectadas(null)
    setFiltroColuna('')
    const idsOk = form.idrelatorioconfiguracao && form.idrelatorioconsulta && form.idrelatorioconfiguracaoleiaute && form.idrelatoriousuarioleiaute
    if (!idsOk) {
      setErroDetectar('Preencha os 4 IDs do relatório (ou use "Preencher automaticamente" acima) antes de detectar os campos.')
      return
    }
    setDetectando(true)
    try {
      const agoraDetec = new Date()
      const fonteParaTeste = {
        idrelatorioconfiguracao: parseInt(form.idrelatorioconfiguracao, 10),
        idrelatorioconsulta: parseInt(form.idrelatorioconsulta, 10),
        idrelatorioconfiguracaoleiaute: parseInt(form.idrelatorioconfiguracaoleiaute, 10),
        idrelatoriousuarioleiaute: parseInt(form.idrelatoriousuarioleiaute, 10),
        ididioma: parseInt(form.ididioma, 10) || 1,
        listaempresas: parseListaEmpresas(form.listaempresas),
        filtros_fixos: form.filtros_fixos,
      }
      const resultado = await apiService.testarFonteMicrowork(fonteParaTeste, { ano: agoraDetec.getFullYear(), mes: agoraDetec.getMonth() + 1 })
      const lista = extrairLista(resultado)
      if (!lista || lista.length === 0) {
        setErroDetectar('A API não retornou nenhuma linha pro mês atual — tente ajustar os filtros, ou confira num mês com movimento pelo botão "Testar".')
        return
      }
      setColunasDetectadas(Object.keys(lista[0]))
    } catch (err) {
      setErroDetectar(err.message || String(err))
    } finally {
      setDetectando(false)
    }
  }

  const handlePreencherAutomatico = () => {
    setErroColar(null)
    setColarOk(false)
    if (!colarTexto.trim()) {
      setErroColar('Cole a requisição (corpo/JSON) antes de identificar os campos.')
      return
    }
    const r = parseRequisicaoMicrowork(colarTexto)
    if (!r.ok) {
      setErroColar('Não consegui identificar todos os campos obrigatórios (idrelatorioconfiguracao, idrelatorioconsulta, idrelatorioconfiguracaoleiaute, idrelatoriousuarioleiaute). Confira se colou o corpo (body) completo da requisição.')
      return
    }
    setForm(prev => ({
      ...prev,
      idrelatorioconfiguracao: r.idrelatorioconfiguracao,
      idrelatorioconsulta: r.idrelatorioconsulta,
      idrelatorioconfiguracaoleiaute: r.idrelatorioconfiguracaoleiaute,
      idrelatoriousuarioleiaute: r.idrelatoriousuarioleiaute,
      ididioma: r.ididioma,
      listaempresas: r.listaempresas.join(', '),
      filtros_fixos: r.filtrosFixos,
    }))
    setColarOk(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setItemVisualizado(item)
    setErroExcluir(null)
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => {
    setItemVisualizado(item)
    setModalVisualizarAberto(true)
  }

  const abrirTestar = (item) => {
    setItemTestando(item)
    setErroTeste(null)
    setResultadoTeste(null)
    setModalTestarAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    try {
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        idrelatorioconfiguracao: parseInt(form.idrelatorioconfiguracao, 10),
        idrelatorioconsulta: parseInt(form.idrelatorioconsulta, 10),
        idrelatorioconfiguracaoleiaute: parseInt(form.idrelatorioconfiguracaoleiaute, 10),
        idrelatoriousuarioleiaute: parseInt(form.idrelatoriousuarioleiaute, 10),
        ididioma: parseInt(form.ididioma, 10) || 1,
        listaempresas: parseListaEmpresas(form.listaempresas),
        filtros_fixos: form.filtros_fixos || null,
        coluna_empresa: form.coluna_empresa || null,
        coluna_data: form.coluna_data || null,
        coluna_funcionario: form.coluna_funcionario || null,
        ativo: form.ativo,
      }
      if (editingId) {
        await apiService.updateFonteMicrowork(editingId, payload)
      } else {
        await apiService.createFonteMicrowork(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    }
  }

  const handleConfirmarExclusao = async () => {
    setErroExcluir(null)
    try {
      await apiService.deleteFonteMicrowork(idExcluir)
      await loadData()
      setModalExcluirAberto(false)
    } catch (err) {
      setErroExcluir('Erro ao excluir: ' + (err.message || String(err)))
    }
  }

  const handleTestar = async () => {
    setTestando(true)
    setErroTeste(null)
    setResultadoTeste(null)
    try {
      const resultado = await apiService.testarFonteMicrowork(itemTestando, { ano: testeAno, mes: testeMes })
      setResultadoTeste(resultado)
    } catch (err) {
      setErroTeste(err.message || String(err))
    } finally {
      setTestando(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-xs">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fonte MicroWork</h1>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Fonte
          </button>
        )}
      </div>

      {/* TABELA */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3">Nome</th>
              <th className="p-3 w-32">Relatório</th>
              <th className="p-3 w-28">Empresas</th>
              <th className="p-3 w-20 text-center">Ativo</th>
              <th className="p-3 w-32 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">Nenhuma Fonte MicroWork cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {item.nome}
                  </div>
                </td>
                <td className="p-3 text-slate-600 font-mono text-[11px]">#{item.idrelatorioconfiguracao}</td>
                <td className="p-3 text-slate-600">{(item.listaempresas || []).length}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {canEdit && (
                      <button type="button" onClick={() => abrirTestar(item)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors" title="Testar">
                        <PlayCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <PermissionActionButtons
                      menuPath="fontes-microwork"
                      onView={() => abrirVisualizar(item)}
                      onEdit={canEdit ? () => abrirEditar(item) : undefined}
                      onDelete={canDelete ? () => abrirExcluir(item) : undefined}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL: INCLUIR / EDITAR */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[720px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Radio className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Fonte MicroWork' : 'Incluir Fonte MicroWork'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto custom-scrollbar">

                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Nome *</label>
                  <input type="text" name="nome" required value={form.nome} onChange={handleInputChange} placeholder="Ex: OS Concluídas" className={INP} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição</label>
                  <input type="text" name="descricao" value={form.descricao} onChange={handleInputChange} placeholder="Observações sobre este relatório" className={INP} />
                </div>

                <div className="rounded-md border border-emerald-200 bg-emerald-50/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-200">
                    <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Colar requisição completa</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Cole aqui o corpo (body/JSON) da requisição do MicroWork — pode colar só o JSON ou o bloco inteiro com "POST:", "Header:" etc., o sistema identifica os campos sozinho.
                    </p>
                    <textarea
                      value={colarTexto}
                      onChange={e => { setColarTexto(e.target.value); setColarOk(false); setErroColar(null) }}
                      rows={5}
                      placeholder='{ "idrelatorioconfiguracao": 188, "idrelatorioconsulta": 95, ... }'
                      className={`${INP} font-mono resize-y`}
                    />
                    <button
                      type="button"
                      onClick={handlePreencherAutomatico}
                      className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1.5 rounded-md transition-colors"
                    >
                      Preencher automaticamente
                    </button>
                    {erroColar && (
                      <p className="text-[11px] text-red-600 leading-relaxed">{erroColar}</p>
                    )}
                    {colarOk && (
                      <p className="text-[11px] text-emerald-700 leading-relaxed">Campos identificados e preenchidos abaixo — confira antes de salvar.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-md border border-indigo-200 bg-indigo-50/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Relatório no MicroWork Cloud</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>ID Configuração *</label>
                        <input type="number" name="idrelatorioconfiguracao" required value={form.idrelatorioconfiguracao} onChange={handleInputChange} className={`${INP} font-mono`} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>ID Consulta *</label>
                        <input type="number" name="idrelatorioconsulta" required value={form.idrelatorioconsulta} onChange={handleInputChange} className={`${INP} font-mono`} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>ID Configuração Leiaute *</label>
                        <input type="number" name="idrelatorioconfiguracaoleiaute" required value={form.idrelatorioconfiguracaoleiaute} onChange={handleInputChange} className={`${INP} font-mono`} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>ID Usuário Leiaute *</label>
                        <input type="number" name="idrelatoriousuarioleiaute" required value={form.idrelatoriousuarioleiaute} onChange={handleInputChange} className={`${INP} font-mono`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>ID Idioma</label>
                        <input type="number" name="ididioma" value={form.ididioma} onChange={handleInputChange} className={`${INP} font-mono`} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Empresas (IDs separados por vírgula)</label>
                        <input type="text" name="listaempresas" value={form.listaempresas} onChange={handleInputChange} placeholder="1, 2, 13, 4" className={`${INP} font-mono`} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`${LBL} flex items-center gap-1`}>
                        Filtros fixos
                        <span className="relative group cursor-help">
                          <Info className="h-3 w-3 text-slate-400" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                            Cole os filtros do relatório no formato Chave=Valor;Chave=Valor — sem incluir Periododeconclusaoinicial/Periododeconclusaofinal, que o sistema calcula sozinho a partir do mês/ano escolhido ao testar/rodar.
                          </span>
                        </span>
                      </label>
                      <textarea name="filtros_fixos" value={form.filtros_fixos} onChange={handleInputChange} rows={4}
                        placeholder="TipoMercadoria=null;ConsiderarTecnico=True;..." className={`${INP} font-mono resize-y`} />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDetectarColunas}
                        disabled={detectando}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        {detectando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                        Detectar Colunas
                      </button>
                      {colunasDetectadas && (
                        <span className="text-[10px] text-slate-400">
                          {colunasDetectadas.length} campo(s) encontrados no mês atual
                        </span>
                      )}
                    </div>

                    {erroDetectar && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-[11px] leading-relaxed">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroDetectar}
                      </div>
                    )}

                    {colunasDetectadas && colunasDetectadas.length > 0 && (
                      <div className="relative border-t border-indigo-100 pt-3">
                        <Search className="h-3.5 w-3.5 text-slate-300 absolute left-2.5 top-1/2 -translate-y-1/2 mt-1.5" />
                        <input
                          type="text"
                          value={filtroColuna}
                          onChange={e => setFiltroColuna(e.target.value)}
                          placeholder="Buscar campo..."
                          className="w-full text-[11px] pl-8 pr-2 py-1.5 border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-400"
                        />
                      </div>
                    )}

                    {colunasDetectadas && colunasDetectadas.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {colunasDetectadas.filter(col => col.toLowerCase().includes(filtroColuna.trim().toLowerCase())).length === 0 ? (
                          <p className="text-[11px] text-slate-400 p-1">Nenhum campo encontrado para "{filtroColuna}".</p>
                        ) : colunasDetectadas.filter(col => col.toLowerCase().includes(filtroColuna.trim().toLowerCase())).map(col => (
                          <div key={col} className="flex items-center border border-slate-200 rounded overflow-hidden text-[10px]">
                            <span className="px-2 py-1 font-mono text-slate-700 bg-white">{col}</span>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_empresa: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-blue-100 text-slate-500 hover:text-blue-700 border-l border-slate-200" title="Usar como Coluna Empresa">
                              Empresa
                            </button>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_data: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-emerald-100 text-slate-500 hover:text-emerald-700 border-l border-slate-200" title="Usar como Coluna Data">
                              Data
                            </button>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_funcionario: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-purple-100 text-slate-500 hover:text-purple-700 border-l border-slate-200" title="Usar como Coluna Funcionário">
                              Funcionário
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Empresa + Coluna Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna Empresa</label>
                    <input type="text" name="coluna_empresa" value={form.coluna_empresa} onChange={handleInputChange} placeholder="Ex: fantasiaempresa" className={`${INP} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna Data</label>
                    <input type="text" name="coluna_data" value={form.coluna_data} onChange={handleInputChange} placeholder="Ex: dataemissao" className={`${INP} font-mono`} />
                  </div>
                </div>

                {/* Coluna Funcionário */}
                <div className="flex flex-col gap-1.5">
                  <label className={`${LBL} flex items-center gap-1`}>
                    Coluna Funcionário
                    <span className="relative group cursor-help">
                      <Info className="h-3 w-3 text-slate-400" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                        Opcional. Campo do JSON com o nome do vendedor/consultor/técnico, usado só quando a Política de Comissão do funcionário for nível INDIVIDUAL.
                      </span>
                    </span>
                  </label>
                  <input type="text" name="coluna_funcionario" value={form.coluna_funcionario} onChange={handleInputChange} placeholder="Ex: tecniconome, pessoaconsultor" className={`${INP} font-mono`} />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" name="ativo" checked={form.ativo} onChange={handleInputChange} className="w-4 h-4" />
                  Ativo
                </label>
              </div>

              {erroModal && (
                <div className="mx-4 mb-2 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
                  Salvar Dados
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[600px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Fonte MicroWork
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                <span className="text-sm font-bold text-slate-900">{itemVisualizado.nome}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Configuração</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.idrelatorioconfiguracao}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Consulta</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.idrelatorioconsulta}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Configuração Leiaute</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.idrelatorioconfiguracaoleiaute}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID Usuário Leiaute</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.idrelatoriousuarioleiaute}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresas</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{(itemVisualizado.listaempresas || []).join(', ') || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ativo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.ativo ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Empresa</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_empresa || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Data</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_data || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Funcionário</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_funcionario || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtros fixos</span>
                <span className="text-xs font-mono font-semibold text-slate-800 break-all whitespace-pre-wrap">{itemVisualizado.filtros_fixos || '-'}</span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Confirma a remoção da fonte <strong className="text-slate-800">"{itemVisualizado.nome}"</strong>? Esta ação não pode ser desfeita.
                </p>
                {erroExcluir && (
                  <p className="text-xs text-red-600 leading-relaxed pt-1">{erroExcluir}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirmarExclusao} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TESTAR */}
      {modalTestarAberto && itemTestando && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[820px] max-h-[85vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-emerald-600" />
                Testar "{itemTestando.nome}"
              </h3>
              <button onClick={() => setModalTestarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 flex items-end gap-3 border-b border-slate-100 shrink-0">
              <div className="flex flex-col gap-1.5">
                <label className={LBL}>Mês</label>
                <select value={testeMes} onChange={e => setTesteMes(Number(e.target.value))} className={INP}>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 w-28">
                <label className={LBL}>Ano</label>
                <input type="number" value={testeAno} onChange={e => setTesteAno(Number(e.target.value))} className={INP} />
              </div>
              <button
                type="button"
                onClick={handleTestar}
                disabled={testando}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
              >
                {testando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                Buscar
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
              {erroTeste && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroTeste}
                </div>
              )}
              {!erroTeste && !resultadoTeste && !testando && (
                <p className="text-xs text-slate-400">Escolha o mês/ano e clique em "Buscar" pra ver a resposta do MicroWork.</p>
              )}
              {resultadoTeste && (
                <pre className="text-[11px] font-mono bg-slate-900 text-emerald-300 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(resultadoTeste, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
