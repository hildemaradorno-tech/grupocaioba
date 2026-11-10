import React, { useEffect, useMemo, useState } from 'react'
import { Plus, ListTree, Search, FolderOpen, FolderClosed, FileText, FileSpreadsheet, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import ImportarPlanoContasModal from './ImportarPlanoContasModal'
import MenuEngrenagem from '../../components/MenuEngrenagem'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, ModalForm, ConfirmarExclusao, BadgeAtivo, INPUT, LABEL, mensagemErro } from './ControladoriaNav'

const MENU = 'controladoria/plano-contas'
const FORM_VAZIO = { empresa_id: '', codigo: '', descricao: '', conta_reduzida: '', conta_referencial: '', tipo: 'ANALITICA', natureza: 'DEVEDORA', conta_pai_id: '', linha_dre_id: '', demonstrativo: '', ativo: true }
// Tipo de Conta: em qual demonstrativo a conta entra.
const DEMONSTRATIVOS = { DRE: { label: 'DRE', cor: 'bg-violet-50 text-violet-700 border-violet-200' }, BALANCO: { label: 'Balanço Patrimonial', cor: 'bg-teal-50 text-teal-700 border-teal-200' } }
const SEM_EMPRESA = '__sem'
const nomeEmpresa = (e) => e ? `${e.codigo_empresa} — ${e.empresa_fantasia || e.nome_empresa}` : ''

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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroDemonstrativo, setFiltroDemonstrativo] = useState('') // '' | DRE | BALANCO | __sem
  const [aplicarFilhas, setAplicarFilhas] = useState(true)
  const [abertas, setAbertas] = useState(() => new Set()) // contas expandidas na árvore (começa tudo recolhido)
  const [empresas, setEmpresas] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('') // id da empresa | SEM_EMPRESA
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

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
      const [c, e] = await Promise.all([apiService.getCtbPlanoContas(), apiService.getEmpresas()])
      setContas(c)
      setEmpresas(e)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  // Cada empresa tem o seu plano: o seletor lista só as empresas que têm conta cadastrada.
  const empresasComPlano = useMemo(() => empresas.filter(e => contas.some(c => c.empresa_id === e.id)), [empresas, contas])
  const temSemEmpresa = useMemo(() => contas.some(c => !c.empresa_id), [contas])
  useEffect(() => {
    const valido = filtroEmpresa === SEM_EMPRESA ? temSemEmpresa : empresasComPlano.some(e => e.id === filtroEmpresa)
    if (!valido) setFiltroEmpresa(empresasComPlano[0]?.id || (temSemEmpresa ? SEM_EMPRESA : ''))
  }, [empresasComPlano, temSemEmpresa, filtroEmpresa])
  const contasDaEmpresa = useMemo(
    () => contas.filter(c => filtroEmpresa === SEM_EMPRESA ? !c.empresa_id : c.empresa_id === filtroEmpresa),
    [contas, filtroEmpresa]
  )

  const arvore = useMemo(() => montarArvore(contasDaEmpresa), [contasDaEmpresa])
  const filtrando = !!busca.trim() || !!filtroDemonstrativo
  // Quantos filhos diretos cada conta tem (só as que têm filhos ganham o botão de expandir).
  const filhosPorConta = useMemo(() => {
    const m = new Map()
    for (const c of contasDaEmpresa) if (c.conta_pai_id) m.set(c.conta_pai_id, (m.get(c.conta_pai_id) || 0) + 1)
    return m
  }, [contasDaEmpresa])
  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    let lista = arvore
    if (filtroDemonstrativo) lista = lista.filter(c => filtroDemonstrativo === '__sem' ? !c.demonstrativo : c.demonstrativo === filtroDemonstrativo)
    if (t) lista = lista.filter(c => c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t) || (c.conta_reduzida || '').includes(t))
    if (filtrando) return lista // buscando/filtrando: lista achatada, sem recolher
    // Árvore recolhível: a árvore vem em pré-ordem, então tudo abaixo de uma conta fechada é pulado
    // até voltar a um nível igual ou acima dela.
    const saida = []
    let escondeAbaixoDe = null
    for (const c of lista) {
      if (escondeAbaixoDe !== null && c.nivel > escondeAbaixoDe) continue
      escondeAbaixoDe = null
      saida.push(c)
      if (filhosPorConta.get(c.id) && !abertas.has(c.id)) escondeAbaixoDe = c.nivel
    }
    return saida
  }, [arvore, busca, filtroDemonstrativo, filtrando, filhosPorConta, abertas])

  const alternar = (id) => setAbertas(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandirTudo = () => setAbertas(new Set(contasDaEmpresa.filter(c => filhosPorConta.get(c.id)).map(c => c.id)))
  const retrairTudo = () => setAbertas(new Set())

  // Conta pai: só da mesma empresa do formulário.
  const opcoesPai = useMemo(() => {
    const bloqueados = editingId ? descendentes(contas, editingId) : new Set()
    const daEmpresa = contas.filter(c => (c.empresa_id || '') === (form.empresa_id || ''))
    return montarArvore(daEmpresa).filter(c => c.tipo === 'SINTETICA' && !bloqueados.has(c.id))
  }, [contas, editingId, form.empresa_id])

  const abrirIncluir = (pai = null) => {
    setEditingId(null)
    const empresa_id = pai ? (pai.empresa_id || '') : (filtroEmpresa === SEM_EMPRESA ? '' : filtroEmpresa)
    setForm({ ...FORM_VAZIO, empresa_id, conta_pai_id: pai?.id || '', codigo: pai ? `${pai.codigo}.` : '', demonstrativo: pai?.demonstrativo || '' })
    setAplicarFilhas(true)
    setErroModal(null)
    setModalAberto(true)
  }
  const abrirEditar = (c) => {
    setEditingId(c.id)
    setForm({
      empresa_id: c.empresa_id || '', codigo: c.codigo, descricao: c.descricao, tipo: c.tipo, natureza: c.natureza,
      conta_reduzida: c.conta_reduzida || '', conta_referencial: c.conta_referencial || '',
      conta_pai_id: c.conta_pai_id || '', linha_dre_id: c.linha_dre_id || '', demonstrativo: c.demonstrativo || '', ativo: c.ativo ?? true,
    })
    setAplicarFilhas(true)
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErroModal(null)
    try {
      // Só conta Analítica entra na DRE — Sintética só agrupa.
      await apiService.salvarCtbPlanoConta(editingId, { ...form, linha_dre_id: form.tipo === 'ANALITICA' ? form.linha_dre_id : null })
      // Sintética: o Tipo de Conta pode descer pra todas as contas abaixo dela.
      if (editingId && form.tipo === 'SINTETICA' && aplicarFilhas) {
        const abaixo = [...descendentes(contas, editingId)].filter(id => id !== editingId)
        if (abaixo.length) await apiService.definirCtbDemonstrativo(abaixo, form.demonstrativo || null)
      }
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
        descricao="Plano de Contas: estrutura hierárquica das contas contábeis de cada empresa, separadas em DRE e Balanço Patrimonial."
        acao={canEdit && (
          <MenuEngrenagem itens={[
            { icon: Plus, cor: 'text-indigo-600', titulo: 'Incluir Conta', descricao: 'Cadastra uma conta no plano da empresa selecionada', onClick: () => abrirIncluir() },
            { icon: FileSpreadsheet, cor: 'text-emerald-600', titulo: 'Importar Plano de Contas', descricao: 'Dealer.net (.xlsx) ou MicroWork (.txt): cria as novas e atualiza as alteradas, por empresa', onClick: () => setModalImportarAberto(true) },
          ]} />
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
            {/* Só as empresas que têm plano cadastrado; INPUT sem w-full pra caber no tamanho do nome. */}
            {(empresasComPlano.length > 0 || temSemEmpresa) && (
              <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto shrink-0 pr-7`}>
                {empresasComPlano.map(e => <option key={e.id} value={e.id}>{nomeEmpresa(e)}</option>)}
                {temSemEmpresa && <option value={SEM_EMPRESA}>Sem empresa</option>}
              </select>
            )}
            <select value={filtroDemonstrativo} onChange={e => setFiltroDemonstrativo(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto shrink-0 pr-7`}>
              <option value="">Todos os tipos de conta</option>
              <option value="DRE">DRE</option>
              <option value="BALANCO">Balanço Patrimonial</option>
              <option value="__sem">Sem tipo de conta</option>
            </select>
            <div className="relative flex-1 max-w-2xl">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código, conta reduzida ou descrição" className={`${INPUT} pl-8`} />
            </div>
            {!filtrando && (
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <button type="button" onClick={expandirTudo} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  <ChevronsUpDown className="h-3.5 w-3.5" /> Expandir tudo
                </button>
                <button type="button" onClick={retrairTudo} className="flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                  <ChevronsDownUp className="h-3.5 w-3.5" /> Retrair tudo
                </button>
              </div>
            )}
          </div>

          {/* Descrição sem quebra de linha: se não couber, a tabela rola na horizontal. */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse [&_td]:whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-3">Descrição</th>
                  <th className="p-3 w-24">Reduzida</th>
                  <th className="p-3 w-28 text-center">Tipo</th>
                  <th className="p-3 w-28 text-center">Natureza</th>
                  <th className="p-3 w-40 text-center">Tipo de Conta</th>
                  <th className="p-3 w-24 text-center">Situação</th>
                  <th className="p-3 w-28 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {visiveis.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400">{contasDaEmpresa.length === 0 ? 'Nenhuma conta cadastrada. Use a engrenagem → Importar Plano de Contas.' : 'Nenhuma conta encontrada.'}</td></tr>
                ) : visiveis.map(c => {
                  const sintetica = c.tipo === 'SINTETICA'
                  return (
                    <tr key={c.id} className={`hover:bg-slate-50/70 transition-colors ${sintetica ? 'bg-slate-50/40' : ''}`}>
                      <td className={`p-3 whitespace-nowrap ${sintetica ? 'font-bold text-slate-900' : ''}`}>
                        <span style={{ paddingLeft: filtrando ? 0 : c.nivel * 18 }} className="inline-flex items-center gap-1.5">
                          {!filtrando && (filhosPorConta.get(c.id) ? (
                            <button type="button" onClick={() => alternar(c.id)} title={abertas.has(c.id) ? 'Retrair' : `Expandir (${filhosPorConta.get(c.id)} conta(s))`}
                              className="p-0.5 -ml-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors shrink-0">
                              <ChevronRight className={`h-3.5 w-3.5 transition-transform ${abertas.has(c.id) ? 'rotate-90' : ''}`} />
                            </button>
                          ) : <span className="w-4 shrink-0" />)}
                          {sintetica
                            ? (abertas.has(c.id) || filtrando ? <FolderOpen className="h-3.5 w-3.5 text-amber-500 shrink-0" /> : <FolderClosed className="h-3.5 w-3.5 text-amber-500 shrink-0" />)
                            : <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                          {/* Só na tela: no Supabase código e descrição seguem em colunas separadas (relacionamentos pelo código). */}
                          <span><span className="font-mono text-[11px] text-slate-500 mr-1">{c.codigo} -</span>{c.descricao}</span>
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{c.conta_reduzida || <span className="text-slate-300">—</span>}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sintetica ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {sintetica ? 'Sintética' : 'Analítica'}
                        </span>
                      </td>
                      <td className="p-3 text-center text-[11px] text-slate-500">{c.natureza === 'CREDORA' ? 'Credora' : 'Devedora'}</td>
                      <td className="p-3 text-center">
                        {DEMONSTRATIVOS[c.demonstrativo]
                          ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${DEMONSTRATIVOS[c.demonstrativo].cor}`}>{DEMONSTRATIVOS[c.demonstrativo].label}</span>
                          : <span className="text-slate-300">—</span>}
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
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Empresa</label>
            <select value={form.empresa_id} onChange={e => setForm(f => ({ ...f, empresa_id: e.target.value, conta_pai_id: '' }))} className={INPUT}>
              <option value="">— Sem empresa —</option>
              {empresas.filter(e => e.ativo !== false || e.id === form.empresa_id).map(e => <option key={e.id} value={e.id}>{nomeEmpresa(e)}</option>)}
            </select>
          </div>
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
              <label className={LABEL}>Conta Reduzida</label>
              <input value={form.conta_reduzida} onChange={e => setForm(f => ({ ...f, conta_reduzida: e.target.value }))} placeholder="Ex: 000101" className={`${INPUT} font-mono`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Conta Ref. ECD/ECF</label>
              <input value={form.conta_referencial} onChange={e => setForm(f => ({ ...f, conta_referencial: e.target.value }))} placeholder="Ex: 1.01.01.01.01" className={`${INPUT} font-mono`} />
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
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Tipo de Conta</label>
            <select value={form.demonstrativo} onChange={e => setForm(f => ({ ...f, demonstrativo: e.target.value }))} className={INPUT}>
              <option value="">— Não definido —</option>
              <option value="DRE">DRE</option>
              <option value="BALANCO">Balanço Patrimonial</option>
            </select>
            {editingId && form.tipo === 'SINTETICA' && qtdFilhos(editingId) > 0 && (
              <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer mt-0.5">
                <input type="checkbox" checked={aplicarFilhas} onChange={e => setAplicarFilhas(e.target.checked)} className="w-3.5 h-3.5" />
                Aplicar também a todas as contas abaixo desta ({[...descendentes(contas, editingId)].length - 1})
              </label>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
            Ativo
          </label>
        </ModalForm>
      )}

      {modalImportarAberto && (
        <ImportarPlanoContasModal
          empresas={empresas}
          empresaInicial={filtroEmpresa === SEM_EMPRESA ? '' : filtroEmpresa}
          onClose={() => setModalImportarAberto(false)}
          onImported={async (empId) => { await loadData(); setFiltroEmpresa(empId) }}
        />
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
