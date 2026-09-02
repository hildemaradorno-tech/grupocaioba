import React, { useEffect, useMemo, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, AlertTriangle, Database, Eye, Search, Loader2, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'

const FORM_VAZIO = {
  nome: '', codigo: '', descricao: '',
  pasta_sharepoint: '', prefixo_arquivo: '', usa_subpasta_ano: false, linha_cabecalho: 0,
  coluna_empresa: '', coluna_data: '', coluna_funcionario: '', campo_relacao_funcionario: 'nome_funcionario',
  coluna_tipo_os: '', coluna_natureza_operacao: '', coluna_movimento: '',
  ativo: true,
}

const CAMPOS_RELACAO_FUNCIONARIO = [
  { value: 'nome_funcionario', label: 'Nome do Funcionário' },
  { value: 'codigo_sistema_bi', label: 'Código no Sistema' },
]

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

export default function FontesBi() {
  const [dados, setDados] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('fontebi_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('fontebi_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('fontebi_form', FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [erroExcluir, setErroExcluir] = useState(null)

  const [detectando, setDetectando] = useState(false)
  const [erroDetectar, setErroDetectar] = useState(null)
  const [colunasDetectadas, setColunasDetectadas] = useState(null)
  const [filtroColunas, setFiltroColunas] = useState('')

  const { hasPermission } = useAuth()
  const canEdit = hasPermission('bi/fontes', 'editar')
  const canDelete = hasPermission('bi/fontes', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const fontes = await apiService.getFontesBi()
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

  const colunasFiltradas = useMemo(() => {
    const colunas = colunasDetectadas?.colunas || []
    const alvo = filtroColunas.trim().toLowerCase()
    if (!alvo) return colunas
    return colunas.filter(c => c.toLowerCase().includes(alvo))
  }, [colunasDetectadas, filtroColunas])

  const abrirIncluir = () => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO })
    setErroModal(null)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setFiltroColunas('')
    setModalAberto(true)
  }

  const abrirEditar = async (item) => {
    setEditingId(item.id)
    setForm({
      nome: item.nome || '',
      codigo: item.codigo || '',
      descricao: item.descricao || '',
      pasta_sharepoint: item.pasta_sharepoint || '',
      prefixo_arquivo: item.prefixo_arquivo || '',
      usa_subpasta_ano: item.usa_subpasta_ano || false,
      linha_cabecalho: item.linha_cabecalho ?? 0,
      coluna_empresa: item.coluna_empresa || '',
      coluna_data: item.coluna_data || '',
      coluna_funcionario: item.coluna_funcionario || '',
      campo_relacao_funcionario: item.campo_relacao_funcionario || 'nome_funcionario',
      coluna_tipo_os: item.coluna_tipo_os || '',
      coluna_natureza_operacao: item.coluna_natureza_operacao || '',
      coluna_movimento: item.coluna_movimento || '',
      ativo: item.ativo ?? true,
    })
    setErroModal(null)
    setColunasDetectadas(null)
    setErroDetectar(null)
    setFiltroColunas('')
    setModalAberto(true)
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

  const handleDetectarColunas = async () => {
    if (!form.pasta_sharepoint || !form.prefixo_arquivo) return
    setDetectando(true)
    setErroDetectar(null)
    setColunasDetectadas(null)
    setFiltroColunas('')
    try {
      const info = await apiService.getColunasFonteBi({
        pasta: form.pasta_sharepoint,
        prefixo: form.prefixo_arquivo,
        usaSubpastaAno: form.usa_subpasta_ano,
        linhaCabecalho: form.linha_cabecalho,
      })
      setColunasDetectadas(info)
    } catch (err) {
      setErroDetectar(err.message || String(err))
    } finally {
      setDetectando(false)
    }
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    try {
      const payload = {
        nome: form.nome,
        codigo: form.codigo.trim().toUpperCase(),
        descricao: form.descricao || null,
        pasta_sharepoint: form.pasta_sharepoint || null,
        prefixo_arquivo: form.prefixo_arquivo || null,
        usa_subpasta_ano: !!form.usa_subpasta_ano,
        linha_cabecalho: parseInt(form.linha_cabecalho, 10) || 0,
        coluna_empresa: form.coluna_empresa || null,
        coluna_data: form.coluna_data || null,
        coluna_funcionario: form.coluna_funcionario || null,
        campo_relacao_funcionario: form.campo_relacao_funcionario || 'nome_funcionario',
        coluna_tipo_os: form.coluna_tipo_os || null,
        coluna_natureza_operacao: form.coluna_natureza_operacao || null,
        coluna_movimento: form.coluna_movimento || null,
        ativo: form.ativo,
      }
      if (editingId) {
        await apiService.updateFonteBi(editingId, payload)
      } else {
        await apiService.createFonteBi(payload)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      const msg = String(err.message || err)
      setErroModal(msg.includes('duplicate key') || msg.includes('unique')
        ? `Já existe uma Fonte BI com o código "${form.codigo}".`
        : 'Erro ao salvar: ' + msg)
    }
  }

  const handleConfirmarExclusao = async () => {
    setErroExcluir(null)
    try {
      await apiService.deleteFonteBi(idExcluir)
      await loadData()
      setModalExcluirAberto(false)
    } catch (err) {
      const msg = String(err.message || err)
      setErroExcluir(
        msg.includes('foreign key') || msg.includes('violates')
          ? 'Não é possível excluir: existem Medida(s) BI vinculada(s) a esta Fonte.'
          : 'Erro ao excluir: ' + msg
      )
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">BI — Fontes</h1>
          <p className="text-xs text-slate-500">Cadastre de qual arquivo do SharePoint cada Medida de BI lê seus dados. Independente do cadastro de Comissões.</p>
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
              <th className="p-3 w-40">Código</th>
              <th className="p-3">Pasta SharePoint</th>
              <th className="p-3 w-48">Arquivo (prefixo)</th>
              <th className="p-3 w-20 text-center">Ativo</th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-6 text-center text-slate-400">Nenhuma Fonte BI cadastrada.</td>
              </tr>
            ) : dados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    {item.nome}
                  </div>
                </td>
                <td className="p-3">
                  <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">{item.codigo}</span>
                </td>
                <td className="p-3 text-slate-600 truncate max-w-[280px]" title={item.pasta_sharepoint}>
                  {item.pasta_sharepoint || <span className="text-amber-500">não configurada</span>}
                </td>
                <td className="p-3 text-slate-600 font-mono text-[11px]">{item.prefixo_arquivo || '-'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="bi/fontes"
                    onView={() => abrirVisualizar(item)}
                    onEdit={() => abrirEditar(item)}
                    onDelete={() => abrirExcluir(item)}
                  />
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
                <Database className="h-4 w-4 text-blue-600" />
                {editingId ? 'Editar Fonte BI' : 'Incluir Fonte BI'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto custom-scrollbar">

                {/* Nome + Código */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Nome *</label>
                    <input type="text" name="nome" required value={form.nome} onChange={handleInputChange} placeholder="Ex: Venda de Produtos" className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Código *</label>
                    <input type="text" name="codigo" required value={form.codigo} onChange={handleInputChange} placeholder="Ex: VENDA_PRODUTO" className={`${INP} font-mono uppercase`} />
                  </div>
                </div>

                {/* Descrição */}
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Descrição</label>
                  <input type="text" name="descricao" value={form.descricao} onChange={handleInputChange} placeholder="Observações sobre esta fonte" className={INP} />
                </div>

                {/* Pasta + Prefixo */}
                <div className="rounded-md border border-indigo-200 bg-indigo-50/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-200">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Arquivo no SharePoint</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Pasta SharePoint</label>
                        <input type="text" name="pasta_sharepoint" value={form.pasta_sharepoint} onChange={handleInputChange}
                          placeholder="/Banco de Dados - DAF - Pós-Vendas/Vendas de Produtos" className={INP} />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={LBL}>Prefixo do Arquivo</label>
                        <input type="text" name="prefixo_arquivo" value={form.prefixo_arquivo} onChange={handleInputChange}
                          placeholder="RPR001_VENDAPRODUTO" className={`${INP} font-mono`} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input type="checkbox" name="usa_subpasta_ano" checked={form.usa_subpasta_ano} onChange={handleInputChange} className="w-4 h-4" />
                        Arquivo fica dentro de subpastas por ano (ex: .../2026/arquivo.xlsx)
                      </label>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">Linha do Cabeçalho</label>
                        <input type="number" min="0" name="linha_cabecalho" value={form.linha_cabecalho} onChange={handleInputChange}
                          title="Quantas linhas de título existem acima do cabeçalho real (0 = cabeçalho é a 1ª linha)"
                          className="w-14 text-xs p-1.5 border border-slate-200 rounded-md font-medium text-slate-800 text-center" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDetectarColunas}
                        disabled={!form.pasta_sharepoint || !form.prefixo_arquivo || detectando}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        {detectando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                        Detectar Colunas
                      </button>
                      {colunasDetectadas && (
                        <span className="text-[10px] text-slate-400">
                          {colunasDetectadas.total_linhas.toLocaleString('pt-BR')} linha(s) no arquivo
                        </span>
                      )}
                    </div>

                    {erroDetectar && (
                      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-[11px] leading-relaxed">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroDetectar}
                      </div>
                    )}

                    {colunasDetectadas && colunasDetectadas.colunas.length > 0 && (
                      <div className="space-y-2 border-t border-indigo-100 pt-3">
                        <div className="relative">
                          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={filtroColunas}
                            onChange={e => setFiltroColunas(e.target.value)}
                            placeholder={`Buscar entre ${colunasDetectadas.colunas.length} colunas...`}
                            className={`${INP} pl-7`}
                          />
                        </div>
                        {colunasFiltradas.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-2">Nenhuma coluna encontrada para "{filtroColunas}".</p>
                        ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                        {colunasFiltradas.map(col => (
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
                              Func.
                            </button>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_tipo_os: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-cyan-100 text-slate-500 hover:text-cyan-700 border-l border-slate-200" title="Usar como Coluna Tipo de OS">
                              Tipo OS
                            </button>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_natureza_operacao: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-amber-100 text-slate-500 hover:text-amber-700 border-l border-slate-200" title="Usar como Coluna Natureza de Operação">
                              Natureza
                            </button>
                            <button type="button" onClick={() => setForm(prev => ({ ...prev, coluna_movimento: col }))}
                              className="px-1.5 py-1 bg-slate-50 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border-l border-slate-200" title="Usar como Coluna Tipo de Movimento">
                              Movimento
                            </button>
                          </div>
                        ))}
                        </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Coluna Empresa + Coluna Data */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna Empresa</label>
                    <input type="text" name="coluna_empresa" value={form.coluna_empresa} onChange={handleInputChange} placeholder="Ex: EmpNome" className={`${INP} font-mono`} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Coluna Data</label>
                    <input type="text" name="coluna_data" value={form.coluna_data} onChange={handleInputChange} placeholder="Ex: NF_Dataemis" className={`${INP} font-mono`} />
                  </div>
                </div>

                {/* Colunas de dimensão — todas opcionais, cada arquivo tem um subconjunto */}
                <div className="rounded-md border border-slate-200 bg-slate-50/40 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                      Colunas de Dimensão (corte)
                      <span className="relative group cursor-help">
                        <Info className="h-3 w-3 text-slate-400" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 text-[10px] text-white bg-slate-700 rounded px-2 py-1.5 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-center normal-case font-normal tracking-normal">
                          Todas opcionais — a maioria dos arquivos não tem todas. Departamento/Setor/Box não entram aqui: são resolvidos a partir do Funcionário no cadastro de Funcionários.
                        </span>
                      </span>
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Coluna Funcionário</label>
                      <input type="text" name="coluna_funcionario" value={form.coluna_funcionario} onChange={handleInputChange} placeholder="Ex: NF_UsuNomVendedor" className={`${INP} font-mono`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Relacionar Funcionário por</label>
                      <select name="campo_relacao_funcionario" value={form.campo_relacao_funcionario} onChange={handleInputChange} className={SEL}>
                        {CAMPOS_RELACAO_FUNCIONARIO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Coluna Tipo de OS</label>
                      <input type="text" name="coluna_tipo_os" value={form.coluna_tipo_os} onChange={handleInputChange} placeholder="Ex: NF_OsTipo" className={`${INP} font-mono`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Coluna Natureza de Operação</label>
                      <input type="text" name="coluna_natureza_operacao" value={form.coluna_natureza_operacao} onChange={handleInputChange} placeholder="Ex: NaturezaOperacao" className={`${INP} font-mono`} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={LBL}>Coluna Tipo de Movimento</label>
                      <input type="text" name="coluna_movimento" value={form.coluna_movimento} onChange={handleInputChange} placeholder="Ex: NF_Origem" className={`${INP} font-mono`} />
                    </div>
                  </div>
                </div>

                {/* Ativo */}
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
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[620px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-500" />
                Visualizar Fonte BI
              </h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-x-6 gap-y-4">
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nome</span>
                <span className="text-sm font-bold text-slate-900">{itemVisualizado.nome}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Ativo</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.ativo ? 'Sim' : 'Não'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao || '-'}</span>
              </div>
              <div className="col-span-2 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pasta SharePoint</span>
                <span className="text-xs font-mono font-semibold text-slate-800 break-all">{itemVisualizado.pasta_sharepoint || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Prefixo do Arquivo</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.prefixo_arquivo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Usa Subpasta por Ano</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.usa_subpasta_ano ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Linha do Cabeçalho</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.linha_cabecalho ?? 0}</span>
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
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Relacionar Funcionário por</span>
                <span className="text-xs font-semibold text-slate-800">{CAMPOS_RELACAO_FUNCIONARIO.find(c => c.value === itemVisualizado.campo_relacao_funcionario)?.label || 'Nome do Funcionário'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Tipo de OS</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_tipo_os || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Natureza de Operação</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_natureza_operacao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Coluna Tipo de Movimento</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.coluna_movimento || '-'}</span>
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

    </div>
  )
}
