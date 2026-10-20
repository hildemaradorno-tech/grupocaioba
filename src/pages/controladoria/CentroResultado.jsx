import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Target, Search } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, ModalForm, ConfirmarExclusao, BadgeAtivo, INPUT, LABEL, mensagemErro } from './ControladoriaNav'

const MENU = 'controladoria/centro-resultado'
const FORM_VAZIO = { codigo: '', descricao: '', sistema_id: '', ativo: true }

export default function CentroResultado() {
  const [centros, setCentros] = useState([])
  // Sistemas vêm do cadastro Gestão de Projetos → Cadastros → Sistemas (proj_sistemas).
  const [sistemas, setSistemas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState(null)

  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault(MENU, 'editar')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s] = await Promise.all([apiService.getCtbCentrosResultado(), apiService.getProjSistemas()])
      setCentros(c)
      setSistemas(s)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const sistemasMap = useMemo(() => Object.fromEntries(sistemas.map(s => [s.id, s])), [sistemas])

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const lista = [...centros].sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
    if (!t) return lista
    return lista.filter(c => c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t))
  }, [centros, busca])

  const abrirIncluir = () => { setEditingId(null); setForm(FORM_VAZIO); setErroModal(null); setModalAberto(true) }
  const abrirEditar = (c) => {
    setEditingId(c.id)
    setForm({ codigo: c.codigo, descricao: c.descricao, sistema_id: c.sistema_id || '', ativo: c.ativo ?? true })
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErroModal(null)
    try {
      await apiService.salvarCtbCentroResultado(editingId, form)
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal(mensagemErro(err, 'um centro de resultado'))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteCtbCentroResultado(excluir.id)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluir(null)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <CabecalhoControladoria
        descricao="Centros de Resultado: unidades de apuração de receitas e despesas, por sistema."
        acao={canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Centro de Resultado
          </button>
        )}
      />

      {loading ? (
        <div className="text-sm text-slate-500">Carregando...</div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
          <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="mb-4 text-sm text-slate-700">{error}</p>
          <button onClick={loadData} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">Tentar novamente</button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <div className="relative w-80">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código ou descrição" className={`${INPUT} pl-8`} />
            </div>
            <span className="text-[11px] text-slate-400">{visiveis.length} de {centros.length} centro(s)</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-3 w-32">Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 w-64">Sistema</th>
                  <th className="p-3 w-24 text-center">Situação</th>
                  <th className="p-3 w-24 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {visiveis.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-400">{centros.length === 0 ? 'Nenhum centro de resultado cadastrado.' : 'Nenhum centro encontrado.'}</td></tr>
                ) : visiveis.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono text-slate-600">{c.codigo}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-indigo-500 shrink-0" />{c.descricao}</div>
                    </td>
                    <td className="p-3 text-[11px]">
                      {c.sistema_id && sistemasMap[c.sistema_id] ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: sistemasMap[c.sistema_id].cor || '#1e293b', color: sistemasMap[c.sistema_id].cor_texto || '#ffffff' }}>
                          {sistemasMap[c.sistema_id].nome}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3 text-center"><BadgeAtivo ativo={c.ativo} /></td>
                    <td className="p-3"><PermissionActionButtons menuPath={MENU} onEdit={() => abrirEditar(c)} onDelete={() => setExcluir(c)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalAberto && (
        <ModalForm
          titulo={editingId ? 'Editar Centro de Resultado' : 'Incluir Centro de Resultado'}
          icon={Target}
          erro={erroModal}
          salvando={salvando}
          onFechar={() => setModalAberto(false)}
          onSalvar={handleSalvar}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Código *</label>
              <input required value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: 101" className={`${INPUT} font-mono`} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Descrição *</label>
              <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Oficina Campo Grande" className={INPUT} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Sistema</label>
            <select value={form.sistema_id} onChange={e => setForm(f => ({ ...f, sistema_id: e.target.value }))} className={INPUT}>
              <option value="">— Não se aplica —</option>
              {/* Inativos só aparecem se já estiverem vinculados a este centro. */}
              {sistemas.filter(s => s.ativo !== false || s.id === form.sistema_id).map(s => <option key={s.id} value={s.id}>{s.nome}{s.ativo === false ? ' (inativo)' : ''}</option>)}
            </select>
            <p className="text-[11px] text-slate-400">Cadastro em Gestão de Projetos → Cadastros → Sistemas.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
            Ativo
          </label>
        </ModalForm>
      )}

      {excluir && (
        <ConfirmarExclusao
          texto={<>Tem certeza que deseja excluir o centro de resultado <strong className="text-slate-800">"{excluir.codigo} — {excluir.descricao}"</strong>?</>}
          onVoltar={() => setExcluir(null)}
          onConfirmar={handleExcluir}
        />
      )}
    </div>
  )
}
