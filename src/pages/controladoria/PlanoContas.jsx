import React, { useEffect, useMemo, useState } from 'react'
import { Plus, ListTree, Search, FolderOpen, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, ModalForm, ConfirmarExclusao, BadgeAtivo, INPUT, LABEL, mensagemErro } from './ControladoriaNav'

const MENU = 'controladoria/plano-contas'
const FORM_VAZIO = { codigo: '', descricao: '', tipo: 'ANALITICA', natureza: 'DEVEDORA', conta_pai_id: '', linha_dre_id: '', ativo: true }

// Ordena em árvore (pai antes dos filhos, irmãos por código) e calcula o nível de cada conta.
// Conta cujo pai sumiu (ou ciclo) vira raiz, pra nunca desaparecer da lista.
function montarArvore(contas) {
  const porPai = new Map()
  const ids = new Set(contas.map(c => c.id))
  for (const c of contas) {
    const pai = c.conta_pai_id && ids.has(c.conta_pai_id) && c.conta_pai_id !== c.id ? c.conta_pai_id : null
    if (!porPai.has(pai)) porPai.set(pai, [])
    porPai.get(pai).push(c)
  }
  for (const lista of porPai.values()) lista.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
  const saida = []
  const visitados = new Set()
  const visitar = (pai, nivel) => {
    for (const c of porPai.get(pai) || []) {
      if (visitados.has(c.id)) continue
      visitados.add(c.id)
      saida.push({ ...c, nivel })
      visitar(c.id, nivel + 1)
    }
  }
  visitar(null, 0)
  for (const c of contas) if (!visitados.has(c.id)) saida.push({ ...c, nivel: 0 })
  return saida
}

// Ids da conta e de todos os descendentes — não podem ser escolhidos como "conta pai" dela.
function descendentes(contas, id) {
  const resultado = new Set([id])
  let mudou = true
  while (mudou) {
    mudou = false
    for (const c of contas) if (c.conta_pai_id && resultado.has(c.conta_pai_id) && !resultado.has(c.id)) { resultado.add(c.id); mudou = true }
  }
  return resultado
}

export default function PlanoContas() {
  const [contas, setContas] = useState([])
  const [linhasDre, setLinhasDre] = useState([])
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
      const [c, l] = await Promise.all([apiService.getCtbPlanoContas(), apiService.getCtbDreLinhas()])
      setContas(c)
      setLinhasDre(l)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const arvore = useMemo(() => montarArvore(contas), [contas])
  const linhasDreMap = useMemo(() => Object.fromEntries(linhasDre.map(l => [l.id, l])), [linhasDre])
  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return arvore
    return arvore.filter(c => c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t))
  }, [arvore, busca])

  const opcoesPai = useMemo(() => {
    const bloqueados = editingId ? descendentes(contas, editingId) : new Set()
    return arvore.filter(c => c.tipo === 'SINTETICA' && !bloqueados.has(c.id))
  }, [arvore, contas, editingId])

  const abrirIncluir = (pai = null) => {
    setEditingId(null)
    setForm({ ...FORM_VAZIO, conta_pai_id: pai?.id || '', codigo: pai ? `${pai.codigo}.` : '' })
    setErroModal(null)
    setModalAberto(true)
  }
  const abrirEditar = (c) => {
    setEditingId(c.id)
    setForm({
      codigo: c.codigo, descricao: c.descricao, tipo: c.tipo, natureza: c.natureza,
      conta_pai_id: c.conta_pai_id || '', linha_dre_id: c.linha_dre_id || '', ativo: c.ativo ?? true,
    })
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErroModal(null)
    try {
      // Só conta Analítica entra na DRE — Sintética só agrupa.
      await apiService.salvarCtbPlanoConta(editingId, { ...form, linha_dre_id: form.tipo === 'ANALITICA' ? form.linha_dre_id : null })
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal(mensagemErro(err, 'uma conta'))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteCtbPlanoConta(excluir.id)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluir(null)
    }
  }

  const qtdFilhos = (id) => contas.filter(c => c.conta_pai_id === id).length

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <CabecalhoControladoria
        descricao="Plano de Contas: estrutura hierárquica das contas contábeis, ligadas às linhas da DRE."
        acao={canEdit && (
          <button onClick={() => abrirIncluir()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Conta
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
            <span className="text-[11px] text-slate-400">{visiveis.length} de {contas.length} conta(s)</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-3 w-48">Código</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3 w-28 text-center">Tipo</th>
                  <th className="p-3 w-28 text-center">Natureza</th>
                  <th className="p-3 w-56">Linha da DRE</th>
                  <th className="p-3 w-24 text-center">Situação</th>
                  <th className="p-3 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {visiveis.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400">{contas.length === 0 ? 'Nenhuma conta cadastrada.' : 'Nenhuma conta encontrada.'}</td></tr>
                ) : visiveis.map(c => {
                  const sintetica = c.tipo === 'SINTETICA'
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/70 transition-colors ${sintetica ? 'bg-slate-50/40' : ''}`}>
                      <td className="p-3 font-mono text-slate-600">
                        <span style={{ paddingLeft: busca ? 0 : c.nivel * 16 }} className="inline-flex items-center gap-1.5">
                          {sintetica ? <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          {c.codigo}
                        </span>
                      </td>
                      <td className={`p-3 ${sintetica ? 'font-bold text-slate-900' : ''}`}>{c.descricao}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sintetica ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {sintetica ? 'Sintética' : 'Analítica'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[11px] text-slate-500">{c.natureza === 'CREDORA' ? 'Credora' : 'Devedora'}</td>
                      <td className="p-3 text-[11px]">
                        {c.linha_dre_id ? linhasDreMap[c.linha_dre_id]?.descricao || '—' : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="p-3 text-center"><BadgeAtivo ativo={c.ativo} /></td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && sintetica && (
                            <button type="button" onClick={() => abrirIncluir(c)} title="Incluir conta filha" className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <PermissionActionButtons menuPath={MENU} onEdit={() => abrirEditar(c)} onDelete={() => setExcluir(c)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modalAberto && (
        <ModalForm
          titulo={editingId ? 'Editar Conta' : 'Incluir Conta'}
          icon={ListTree}
          erro={erroModal}
          salvando={salvando}
          onFechar={() => setModalAberto(false)}
          onSalvar={handleSalvar}
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Código *</label>
              <input required value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: 3.1.01" className={`${INPUT} font-mono`} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Descrição *</label>
              <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Receita de Venda de Peças" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={INPUT}>
                <option value="SINTETICA">Sintética (agrupa contas)</option>
                <option value="ANALITICA">Analítica (recebe lançamento)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Natureza *</label>
              <select value={form.natureza} onChange={e => setForm(f => ({ ...f, natureza: e.target.value }))} className={INPUT}>
                <option value="DEVEDORA">Devedora</option>
                <option value="CREDORA">Credora</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Conta Pai</label>
            <select value={form.conta_pai_id} onChange={e => setForm(f => ({ ...f, conta_pai_id: e.target.value }))} className={INPUT}>
              <option value="">— Nenhuma (conta de 1º nível) —</option>
              {opcoesPai.map(c => <option key={c.id} value={c.id}>{'  '.repeat(c.nivel)}{c.codigo} — {c.descricao}</option>)}
            </select>
          </div>
          {form.tipo === 'ANALITICA' && (
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Linha da DRE</label>
              <select value={form.linha_dre_id} onChange={e => setForm(f => ({ ...f, linha_dre_id: e.target.value }))} className={INPUT}>
                <option value="">— Não entra na DRE —</option>
                {linhasDre.filter(l => l.tipo === 'CONTAS').map(l => <option key={l.id} value={l.id}>{l.ordem} — {l.descricao}</option>)}
              </select>
              {linhasDre.length === 0 && <p className="text-[11px] text-slate-400">Cadastre as linhas na aba DRE para vincular.</p>}
            </div>
          )}
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
            Ativo
          </label>
        </ModalForm>
      )}

      {excluir && (
        <ConfirmarExclusao
          texto={<>Tem certeza que deseja excluir a conta <strong className="text-slate-800">"{excluir.codigo} — {excluir.descricao}"</strong>?{qtdFilhos(excluir.id) > 0 && ` As ${qtdFilhos(excluir.id)} conta(s) filha(s) ficarão sem conta pai.`}</>}
          onVoltar={() => setExcluir(null)}
          onConfirmar={handleExcluir}
        />
      )}
    </div>
  )
}
