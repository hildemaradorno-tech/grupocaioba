import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSessionState } from '../hooks/useSessionState'
import { Plus, X, AlertTriangle, Hash, Eye, Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PermissionActionButtons from '../components/PermissionActionButtons'
import { apiService } from '../services/api'

const FORM_VAZIO = { codigo: '', descricao: '', ativo: true, empresa_ids: [] }

// Seletor de uma, várias ou todas as empresas (filtro da lista) — mesmo padrão já usado em
// Cálculo de Comissões, Histórico de Comissões, Cargos, Funcionários e Política de Comissão.
function FiltroMultiSelect({ placeholder, opcoes, selecionados, onChange }) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [])
  const toggle = (v) => onChange(selecionados.includes(v) ? selecionados.filter(x => x !== v) : [...selecionados, v])
  const texto = selecionados.length === 0 ? placeholder : selecionados.length === 1 ? selecionados[0] : `${selecionados.length} selecionadas`
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(v => !v)}
        className="w-full flex items-center justify-between gap-1 px-2 py-2 text-xs border border-slate-200 rounded-md bg-white hover:bg-slate-50 focus:outline-none focus:border-blue-400 transition-colors">
        <span className={`truncate ${selecionados.length === 0 ? 'text-slate-400' : 'text-slate-700 font-semibold'}`}>{texto}</span>
        <span className="flex items-center gap-0.5 shrink-0">
          {selecionados.length > 0 && (
            <span role="button" tabIndex={0} title="Limpar"
              onClick={e => { e.stopPropagation(); onChange([]) }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onChange([]) } }}
              className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors">
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </span>
      </button>
      {aberto && (
        <div className="absolute z-50 mt-1 min-w-full w-max max-w-sm max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-xl py-1">
          {opcoes.length === 0
            ? <p className="px-3 py-2 text-xs text-slate-400">Nenhuma opção.</p>
            : opcoes.map(op => (
              <label key={op} className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 cursor-pointer select-none">
                <input type="checkbox" checked={selecionados.includes(op)} onChange={() => toggle(op)} className="w-3.5 h-3.5 rounded accent-blue-600 shrink-0" />
                <span className="whitespace-nowrap">{op}</span>
              </label>
            ))}
        </div>
      )}
    </div>
  )
}

export default function Rubricas() {
  const [dados, setDados] = useState([])
  const [empresas, setEmpresas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [modalAberto, setModalAberto] = useSessionState('rubricas_modal', false)
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false)
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false)
  const [editingId, setEditingId] = useSessionState('rubricas_editid', null)
  const [idExcluir, setIdExcluir] = useState(null)
  const [itemVisualizado, setItemVisualizado] = useState(null)
  const [form, setForm] = useSessionState('rubricas_form', FORM_VAZIO)
  const [buscaEmpresa, setBuscaEmpresa] = useState('')
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [busca, setBusca] = useState('')
  const [ordenacao, setOrdenacao] = useState({ coluna: 'codigo', direcao: 'asc' })
  const [filtroEmpresas, setFiltroEmpresas] = useState([])

  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('rubricas', 'editar')
  const canDelete = hasActionOrDefault('rubricas', 'excluir')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rubricas, emps] = await Promise.all([apiService.getRubricas(), apiService.getEmpresas()])
      setDados(rubricas)
      setEmpresas([...emps].sort((a, b) => (a.empresa_fantasia || a.nome_empresa || '').localeCompare(b.empresa_fantasia || b.nome_empresa || '', 'pt-BR')))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const nomeEmpresa = (e) => e.empresa_fantasia || e.nome_empresa
  const formatarCnpj = (v) => {
    const d = String(v || '').replace(/\D/g, '')
    if (d.length !== 14) return v || ''
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
  }
  const nomesEmpresas = (ids) => (ids || []).map(id => empresas.find(e => e.id === id)).filter(Boolean).map(nomeEmpresa)

  const alternarOrdenacao = (coluna) => setOrdenacao(prev => prev.coluna === coluna
    ? { coluna, direcao: prev.direcao === 'asc' ? 'desc' : 'asc' }
    : { coluna, direcao: 'asc' })
  const iconeOrdenacao = (coluna) => ordenacao.coluna !== coluna
    ? <ArrowUpDown className="h-3 w-3 opacity-30" />
    : ordenacao.direcao === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />

  const empresasOpcoes = useMemo(() => empresas.map(nomeEmpresa), [empresas])

  const dadosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    let filtrados = !termo ? dados : dados.filter(item =>
      (item.codigo || '').toLowerCase().includes(termo) || (item.descricao || '').toLowerCase().includes(termo)
    )
    if (filtroEmpresas.length > 0) {
      filtrados = filtrados.filter(item =>
        (item.empresa_ids || []).length === 0 || nomesEmpresas(item.empresa_ids).some(n => filtroEmpresas.includes(n))
      )
    }
    const dir = ordenacao.direcao === 'asc' ? 1 : -1
    if (ordenacao.coluna === 'ativo') {
      return [...filtrados].sort((a, b) => dir * ((a.ativo ? 1 : 0) - (b.ativo ? 1 : 0)))
    }
    const campo = ordenacao.coluna === 'descricao' ? 'descricao' : 'codigo'
    // localeCompare com numeric:true faz ordenação "natural" (6 < 56 < 315), em vez de lexicográfica pura.
    return [...filtrados].sort((a, b) => dir * (a[campo] || '').localeCompare(b[campo] || '', 'pt-BR', { numeric: true, sensitivity: 'base' }))
  }, [dados, busca, ordenacao, filtroEmpresas, empresas])

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(FORM_VAZIO)
    setErroModal(null)
    setBuscaEmpresa('')
    setModalAberto(true)
  }

  const abrirEditar = (item) => {
    setEditingId(item.id)
    setForm({ codigo: item.codigo, descricao: item.descricao || '', ativo: item.ativo ?? true, empresa_ids: item.empresa_ids || [] })
    setErroModal(null)
    setBuscaEmpresa('')
    setModalAberto(true)
  }

  const abrirExcluir = (item) => {
    setIdExcluir(item.id)
    setForm(prev => ({ ...prev, codigo: item.codigo }))
    setModalExcluirAberto(true)
  }

  const abrirVisualizar = (item) => { setItemVisualizado(item); setModalVisualizarAberto(true) }

  const toggleEmpresa = (id) => setForm(prev => ({
    ...prev,
    empresa_ids: prev.empresa_ids.includes(id) ? prev.empresa_ids.filter(x => x !== id) : [...prev.empresa_ids, id],
  }))

  const handleSalvar = async (e) => {
    e.preventDefault()
    setSalvando(true)
    setErroModal(null)
    try {
      if (editingId) {
        await apiService.updateRubrica(editingId, form)
      } else {
        await apiService.createRubrica(form)
      }
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    try {
      await apiService.deleteRubrica(idExcluir)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setModalExcluirAberto(false)
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Carregando...</div>

  if (error) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">Tentar novamente</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-full w-full p-6 space-y-4">

      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Rubrica</h1>
          <p className="text-xs text-slate-500">Códigos de rubrica usados no TXT de pagamento (Processamento de Comissões) — selecionáveis em Política de Comissão.</p>
        </div>
        {canEdit && (
          <button
            onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Incluir Rubrica
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por código ou descrição..."
            className="w-full text-xs pl-8 pr-2 py-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
        </div>
        <div className="w-56">
          <FiltroMultiSelect placeholder="Todas as empresas" opcoes={empresasOpcoes} selecionados={filtroEmpresas} onChange={setFiltroEmpresas} />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="p-3 w-32">
                <button onClick={() => alternarOrdenacao('codigo')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Código {iconeOrdenacao('codigo')}
                </button>
              </th>
              <th className="p-3">
                <button onClick={() => alternarOrdenacao('descricao')} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                  Descrição {iconeOrdenacao('descricao')}
                </button>
              </th>
              <th className="p-3">Empresas</th>
              <th className="p-3 w-28 text-center">
                <button onClick={() => alternarOrdenacao('ativo')} className="flex items-center gap-1 mx-auto hover:text-slate-700 transition-colors">
                  Situação {iconeOrdenacao('ativo')}
                </button>
              </th>
              <th className="p-3 w-24 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
            {dadosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-6 text-center text-slate-400">{busca ? 'Nenhuma rubrica encontrada.' : 'Nenhuma rubrica cadastrada.'}</td>
              </tr>
            ) : dadosFiltrados.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="p-3 text-slate-900 font-bold font-mono">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                    {item.codigo}
                  </div>
                </td>
                <td className="p-3 text-slate-600 whitespace-nowrap">{item.descricao || '-'}</td>
                <td className="p-3 text-slate-600">
                  {(item.empresa_ids || []).length === 0 ? (
                    <span className="text-slate-300">Todas</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {nomesEmpresas(item.empresa_ids).map(n => (
                        <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600">{n}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${item.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-3">
                  <PermissionActionButtons
                    menuPath="rubricas"
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
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[460px] max-h-[90vh] shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Hash className="h-4 w-4 text-indigo-600" />
                {editingId ? 'Editar Rubrica' : 'Incluir Nova Rubrica'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSalvar} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Código *</label>
                  <input
                    type="text"
                    required
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                    placeholder="Ex: 315"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-mono font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                  <input
                    type="text"
                    value={form.descricao}
                    onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Ex: Comissão sobre Margem de Venda"
                    className="w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Empresas que atendem ({form.empresa_ids.length === 0 ? 'todas' : form.empresa_ids.length})
                    </label>
                    {form.empresa_ids.length > 0 && (
                      <button type="button" onClick={() => setForm(prev => ({ ...prev, empresa_ids: [] }))}
                        title="Limpar seleção (volta a valer pra todas)"
                        className="text-slate-400 hover:text-red-600 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 leading-relaxed">Nenhuma empresa marcada = vale pra todas.</span>
                  <div className="relative">
                    <input type="text" value={buscaEmpresa} onChange={e => setBuscaEmpresa(e.target.value)}
                      placeholder="Buscar por nome ou CNPJ..."
                      className="w-full text-xs p-2 pr-7 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                    {buscaEmpresa && (
                      <button type="button" onClick={() => setBuscaEmpresa('')}
                        title="Limpar busca"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-600 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="border border-slate-200 rounded-md max-h-40 overflow-y-auto divide-y divide-slate-100">
                    {empresas
                      .filter(e => {
                        const termo = buscaEmpresa.trim().toLowerCase()
                        if (!termo) return true
                        const termoDigitos = termo.replace(/\D/g, '')
                        return nomeEmpresa(e).toLowerCase().includes(termo) ||
                          (termoDigitos && String(e.cnpj || '').replace(/\D/g, '').includes(termoDigitos))
                      })
                      .sort((a, b) => Number(form.empresa_ids.includes(b.id)) - Number(form.empresa_ids.includes(a.id)))
                      .map(e => (
                        <label key={e.id} className={`flex items-center gap-2 px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${form.empresa_ids.includes(e.id) ? 'bg-emerald-50/60' : ''}`}>
                          <input type="checkbox" className="w-3.5 h-3.5" checked={form.empresa_ids.includes(e.id)} onChange={() => toggleEmpresa(e.id)} />
                          <span className="font-medium text-slate-700">{nomeEmpresa(e)}</span>
                          {e.cnpj && <span className="text-[10px] text-slate-400 font-mono">{formatarCnpj(e.cnpj)}</span>}
                        </label>
                      ))}
                    {empresas.length === 0 && <div className="px-3 py-3 text-[11px] text-slate-400">Nenhuma empresa cadastrada.</div>}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.ativo}
                    onChange={(e) => setForm(prev => ({ ...prev, ativo: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  Ativo
                </label>
              </div>
              {erroModal && (
                <div className="mx-5 mb-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erroModal}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100 shrink-0">
                <button type="button" onClick={() => setModalAberto(false)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
                  {salvando ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR */}
      {modalVisualizarAberto && itemVisualizado && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[380px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Eye className="h-4 w-4 text-slate-500" />Visualizar Rubrica</h3>
              <button onClick={() => setModalVisualizarAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Código</span>
                <span className="text-xs font-mono font-semibold text-slate-800">{itemVisualizado.codigo || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Descrição</span>
                <span className="text-xs font-semibold text-slate-800">{itemVisualizado.descricao || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Empresas que atendem</span>
                {(itemVisualizado.empresa_ids || []).length === 0 ? (
                  <span className="text-xs font-semibold text-slate-800">Todas</span>
                ) : (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {nomesEmpresas(itemVisualizado.empresa_ids).map(n => (
                      <span key={n} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700">{n}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Situação</span>
                <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${itemVisualizado.ativo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {itemVisualizado.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
            <div className="flex justify-end p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalVisualizarAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXCLUIR */}
      {modalExcluirAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tem certeza que deseja excluir a rubrica <strong className="text-slate-800 font-mono">"{form.codigo}"</strong>? Políticas de Comissão que já usam esse código continuam com o valor salvo — só o cadastro que alimenta o seletor é removido.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setModalExcluirAberto(false)}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Voltar
              </button>
              <button onClick={handleConfirmarExclusao}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors">
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
