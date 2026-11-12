import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Target, Search, FileSpreadsheet, Eye, ArrowUpDown, ArrowUp, ArrowDown, Building2 } from 'lucide-react'
import ImportarCentrosResultadoModal from './ImportarCentrosResultadoModal'
import CrVisuaisModal from './CrVisuaisModal'
import SeletorEmpresas, { siglaEmpresa, nomeEmpresaCompleto } from './SeletorEmpresas'
import MenuEngrenagem from '../../components/MenuEngrenagem'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, ModalForm, ConfirmarExclusao, BadgeAtivo, INPUT, LABEL, mensagemErro } from './ControladoriaNav'

const MENU = 'controladoria/centro-resultado'
const FORM_VAZIO = { codigo: '', descricao: '', sigla: '', sistema_id: '', cr_visual_id: '', empresa_ids: [], ativo: true }

export default function CentroResultado() {
  const [centros, setCentros] = useState([])
  // Sistemas vêm do cadastro Gestão de Projetos → Cadastros → Sistemas (proj_sistemas).
  const [sistemas, setSistemas] = useState([])
  // CR Visual: nomenclatura usada em Orçamento e dashboards (ctb_cr_visuais).
  const [crVisuais, setCrVisuais] = useState([])
  const [modalCrVisualAberto, setModalCrVisualAberto] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroSistema, setFiltroSistema] = useState('') // '' = todos | '__sem' = sem sistema | id
  // Empresas onde o centro existe (ctb_centro_resultado_empresas: uma linha por centro × empresa no Supabase).
  const [empresas, setEmpresas] = useState([])
  const [filtroEmpresa, setFiltroEmpresa] = useState('') // '' = todas | '__sem' = sem empresa | id

  const [modalAberto, setModalAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluir, setExcluir] = useState(null)
  // Seleção em lote: marcar vários centros e aplicar o mesmo Centro de Resultado (Visual) em todos.
  const [selecionados, setSelecionados] = useState(() => new Set())
  const [visualLote, setVisualLote] = useState('') // '' = escolher | '__remover' | id
  const [aplicandoLote, setAplicandoLote] = useState(false)
  const alternarSel = (id) => setSelecionados(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  // Empresas em lote (modal com o mesmo seletor do cadastro).
  const [empresasLote, setEmpresasLote] = useState(null) // null = fechado | { ids: [], modo }
  const [erroEmpresasLote, setErroEmpresasLote] = useState(null)
  const aplicarEmpresasLote = async () => {
    if (empresasLote.ids.length === 0 && empresasLote.modo !== 'substituir') { setErroEmpresasLote('Marque ao menos uma empresa.'); return }
    setAplicandoLote(true)
    setErroEmpresasLote(null)
    try {
      await apiService.definirEmpresasCtbCentrosLote([...selecionados], empresasLote.ids, empresasLote.modo)
      await loadData()
      setEmpresasLote(null)
      setSelecionados(new Set())
    } catch (err) {
      setErroEmpresasLote('Erro ao aplicar: ' + (err.message || String(err)))
    } finally {
      setAplicandoLote(false)
    }
  }
  // Se todos os selecionados são do mesmo sistema, o seletor oferece "Marcar as do <sistema>".
  // Função (e não valor calculado aqui): sistemasMap só é declarado mais abaixo — calcular direto
  // aqui dava "Cannot access before initialization" e deixava a tela em branco.
  const sistemaDaSelecao = () => {
    const ids = new Set(centros.filter(c => selecionados.has(c.id)).map(c => c.sistema_id || ''))
    return ids.size === 1 ? sistemasMap[[...ids][0]]?.nome : undefined
  }

  const aplicarVisualLote = async () => {
    if (!visualLote || selecionados.size === 0) return
    setAplicandoLote(true)
    try {
      await apiService.definirCrVisualCtbCentros([...selecionados], visualLote === '__remover' ? null : visualLote)
      await loadData()
      setSelecionados(new Set())
      setVisualLote('')
    } catch (err) {
      alert('Erro ao aplicar: ' + (err.message || String(err)))
    } finally {
      setAplicandoLote(false)
    }
  }

  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault(MENU, 'editar')

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s, v, e] = await Promise.all([apiService.getCtbCentrosResultado(), apiService.getProjSistemas(), apiService.getCtbCrVisuais(), apiService.getEmpresas()])
      setCentros(c)
      setSistemas(s)
      setCrVisuais(v)
      setEmpresas(e)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const sistemasMap = useMemo(() => Object.fromEntries(sistemas.map(s => [s.id, s])), [sistemas])
  const crVisuaisMap = useMemo(() => Object.fromEntries(crVisuais.map(v => [v.id, v])), [crVisuais])
  const empresasMap = useMemo(() => Object.fromEntries(empresas.map(e => [e.id, e])), [empresas])
  const ordemEmpresa = (id) => empresasMap[id]?.codigo_empresa ?? 9999
  // Seletor de empresa: só as que têm algum centro.
  const empresasComCentro = useMemo(
    () => empresas.filter(e => centros.some(c => (c.empresa_ids || []).includes(e.id))),
    [empresas, centros]
  )

  // Ordenação pelos cabeçalhos: clicar alterna crescente/decrescente; o padrão é por código.
  const [ordem, setOrdem] = useState({ campo: 'codigo', dir: 1 })
  const ordenarPor = (campo) => setOrdem(o => o.campo === campo ? { campo, dir: -o.dir } : { campo, dir: 1 })
  const valorOrdem = (c, campo) => {
    switch (campo) {
      case 'codigo': return c.codigo
      case 'descricao': return c.descricao
      case 'sigla': return c.sigla || ''
      case 'sistema': return sistemasMap[c.sistema_id]?.nome || ''
      case 'empresas': return [...(c.empresa_ids || [])].map(id => siglaEmpresa(empresasMap[id])).sort().join(', ')
      case 'visual': return crVisuaisMap[c.cr_visual_id]?.descricao || ''
      case 'situacao': return c.ativo === false ? 'Inativo' : 'Ativo'
      default: return ''
    }
  }

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const lista = centros
      .filter(c => !filtroSistema || (filtroSistema === '__sem' ? !c.sistema_id : c.sistema_id === filtroSistema))
      .filter(c => !filtroEmpresa || (filtroEmpresa === '__sem' ? !(c.empresa_ids || []).length : (c.empresa_ids || []).includes(filtroEmpresa)))
      .sort((a, b) => {
        const va = valorOrdem(a, ordem.campo)
        const vb = valorOrdem(b, ordem.campo)
        // Vazio sempre por último; empate desempata pelo código.
        if (!va && vb) return 1
        if (va && !vb) return -1
        return (va.localeCompare(vb, 'pt-BR', { numeric: true, sensitivity: 'base' }) * ordem.dir)
          || a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true })
      })
    if (!t) return lista
    return lista.filter(c => c.codigo.toLowerCase().includes(t) || c.descricao.toLowerCase().includes(t) || (c.sigla || '').toLowerCase().includes(t)
      || (crVisuaisMap[c.cr_visual_id]?.descricao || '').toLowerCase().includes(t))
  }, [centros, busca, filtroSistema, filtroEmpresa, crVisuaisMap, ordem, sistemasMap, empresasMap]) // eslint-disable-line react-hooks/exhaustive-deps

  const Th = ({ campo, children, className = '' }) => (
    <th className={`p-3 ${className}`}>
      <button type="button" onClick={() => ordenarPor(campo)} className={`inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-700 transition-colors ${ordem.campo === campo ? 'text-slate-700' : ''}`}>
        {children}
        {ordem.campo !== campo
          ? <ArrowUpDown className="h-3 w-3 opacity-50" />
          : ordem.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      </button>
    </th>
  )

  const abrirIncluir = () => { setEditingId(null); setForm(FORM_VAZIO); setErroModal(null); setModalAberto(true) }
  const abrirEditar = (c) => {
    setEditingId(c.id)
    setForm({ codigo: c.codigo, descricao: c.descricao, sigla: c.sigla || '', sistema_id: c.sistema_id || '', cr_visual_id: c.cr_visual_id || '', empresa_ids: c.empresa_ids || [], ativo: c.ativo ?? true })
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErroModal(null)
    try {
      const salvo = await apiService.salvarCtbCentroResultado(editingId, form)
      await apiService.definirEmpresasCtbCentro(editingId || salvo.id, form.empresa_ids)
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
        descricao="Centros de Resultado: unidades de apuração de receitas e despesas, por sistema e empresa."
        acao={canEdit && (
          <MenuEngrenagem itens={[
            { icon: Plus, cor: 'text-indigo-600', titulo: 'Incluir Centro de Resultado', descricao: 'Cadastra um novo centro de resultado', onClick: abrirIncluir },
            { icon: FileSpreadsheet, cor: 'text-emerald-600', titulo: 'Importar Excel', descricao: 'Importa código e descrição de uma planilha para um sistema e as empresas marcadas', onClick: () => setModalImportarAberto(true) },
            { icon: Eye, cor: 'text-violet-600', titulo: 'Centro de Resultado (Visual)', descricao: 'Cadastra as nomenclaturas de centro de resultado usadas em Orçamento e dashboards', onClick: () => setModalCrVisualAberto(true) },
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
            {/* Só os sistemas que têm centro cadastrado. */}
            {/* INPUT traz w-full: tirado aqui pra o seletor ficar do tamanho do nome do sistema. */}
            <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto shrink-0 pr-7`}>
              <option value="">Todos os sistemas</option>
              {centros.some(c => !c.sistema_id) && <option value="__sem">Sem sistema</option>}
              {sistemas.filter(s => centros.some(c => c.sistema_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            {(empresasComCentro.length > 0 || centros.some(c => !(c.empresa_ids || []).length)) && (
              <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto shrink-0 pr-7`}>
                <option value="">Todas as empresas</option>
                {centros.some(c => !(c.empresa_ids || []).length) && <option value="__sem">Sem empresa</option>}
                {empresasComCentro.map(e => <option key={e.id} value={e.id}>{nomeEmpresaCompleto(e)}</option>)}
              </select>
            )}
            <div className="relative flex-1 max-w-2xl">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por código, descrição ou sigla" className={`${INPUT} pl-8`} />
            </div>
          </div>

          {canEdit && selecionados.size > 0 && (
            <div className="flex items-center gap-3 flex-wrap bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
              <span className="text-xs font-bold text-violet-800">{selecionados.size} centro(s) selecionado(s)</span>
              <span className="text-[11px] font-semibold text-violet-700">Centro de Resultado (Visual):</span>
              <select value={visualLote} onChange={e => setVisualLote(e.target.value)} className={`${INPUT.replace('w-full ', '')} w-auto pr-7 bg-white`}>
                <option value="">Selecione...</option>
                {crVisuais.filter(v => v.ativo !== false).map(v => <option key={v.id} value={v.id}>{v.codigo} — {v.descricao}</option>)}
                <option value="__remover">— Remover o Visual —</option>
              </select>
              <button type="button" onClick={aplicarVisualLote} disabled={!visualLote || aplicandoLote}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 shadow-sm transition-colors disabled:opacity-50">
                {aplicandoLote ? 'Aplicando...' : 'Aplicar nos selecionados'}
              </button>
              <span className="h-5 w-px bg-violet-200" />
              <button type="button" onClick={() => { setErroEmpresasLote(null); setEmpresasLote({ ids: [], modo: 'acrescentar' }) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-violet-700 bg-white border border-violet-300 hover:bg-violet-100 transition-colors">
                <Building2 className="h-3.5 w-3.5" /> Definir empresas
              </button>
              <button type="button" onClick={() => { setSelecionados(new Set()); setVisualLote('') }} className="ml-auto text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline">Limpar seleção</button>
            </div>
          )}

          {/* Empresas lado a lado (sem quebrar): se não couber, a tabela rola na horizontal. */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  {canEdit && (
                    <th className="p-3 w-10 text-center">
                      {/* Marca/desmarca todos os que estão aparecendo (respeita filtros e busca). */}
                      <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer" title="Selecionar todos os listados"
                        checked={visiveis.length > 0 && visiveis.every(c => selecionados.has(c.id))}
                        onChange={e => setSelecionados(s => {
                          const n = new Set(s)
                          visiveis.forEach(c => e.target.checked ? n.add(c.id) : n.delete(c.id))
                          return n
                        })} />
                    </th>
                  )}
                  <th className="p-3 w-24 text-center">Ações</th>
                  <Th campo="codigo" className="w-32">Código</Th>
                  <Th campo="descricao">Descrição no DMS</Th>
                  <Th campo="sigla" className="w-32">Sigla/Fisco</Th>
                  <Th campo="sistema" className="w-48">Sistema</Th>
                  <Th campo="empresas">Empresas</Th>
                  <Th campo="visual" className="w-48">Descrição Visual</Th>
                  <Th campo="situacao" className="w-24 text-center">Situação</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {visiveis.length === 0 ? (
                  <tr><td colSpan={canEdit ? 9 : 8} className="p-6 text-center text-slate-400">{centros.length === 0 ? 'Nenhum centro de resultado cadastrado.' : 'Nenhum centro encontrado.'}</td></tr>
                ) : visiveis.map(c => (
                  <tr key={c.id} className={`transition-colors ${selecionados.has(c.id) ? 'bg-violet-50/60' : 'hover:bg-slate-50/70'}`}>
                    {canEdit && (
                      <td className="p-3 text-center">
                        <input type="checkbox" className="w-3.5 h-3.5 cursor-pointer" checked={selecionados.has(c.id)} onChange={() => alternarSel(c.id)} />
                      </td>
                    )}
                    <td className="p-3"><PermissionActionButtons engrenagem menuPath={MENU} onEdit={() => abrirEditar(c)} onDelete={() => setExcluir(c)} /></td>
                    <td className="p-3 font-mono text-slate-600">{c.codigo}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-indigo-500 shrink-0" />{c.descricao}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{c.sigla || <span className="text-slate-300">—</span>}</td>
                    <td className="p-3 text-[11px]">
                      {c.sistema_id && sistemasMap[c.sistema_id] ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ backgroundColor: sistemasMap[c.sistema_id].cor || '#1e293b', color: sistemasMap[c.sistema_id].cor_texto || '#ffffff' }}>
                          {sistemasMap[c.sistema_id].nome}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="p-3">
                      {(c.empresa_ids || []).length ? (
                        <div className="flex flex-nowrap gap-1 whitespace-nowrap">
                          {[...c.empresa_ids].sort((a, b) => ordemEmpresa(a) - ordemEmpresa(b)).map(id => (
                            <span key={id} title={nomeEmpresaCompleto(empresasMap[id])} className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                              {siglaEmpresa(empresasMap[id])}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[11px] text-amber-600 font-semibold">Sem empresa</span>}
                    </td>
                    <td className="p-3 text-[11px] font-semibold text-violet-700">{crVisuaisMap[c.cr_visual_id]?.descricao || <span className="text-slate-300 font-normal">—</span>}</td>
                    <td className="p-3 text-center"><BadgeAtivo ativo={c.ativo} /></td>
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
          largura="w-[640px]"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Código *</label>
              <input required value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: 101" className={`${INPUT} font-mono`} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className={LABEL}>Descrição no DMS *</label>
              <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Oficina Campo Grande" className={INPUT} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Sigla/Fisco *</label>
            <input required value={form.sigla} onChange={e => setForm(f => ({ ...f, sigla: e.target.value.toUpperCase() }))} placeholder="Ex: OFC-CG" maxLength={20} className={`${INPUT} font-mono`} />
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
          <SeletorEmpresas
            empresas={empresas}
            value={form.empresa_ids}
            onChange={ids => setForm(f => ({ ...f, empresa_ids: ids }))}
            sistemaNome={sistemasMap[form.sistema_id]?.nome}
          />
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>Centro de Resultado (Visual)</label>
            <select value={form.cr_visual_id} onChange={e => setForm(f => ({ ...f, cr_visual_id: e.target.value }))} className={INPUT}>
              <option value="">— Sem Centro de Resultado (Visual) —</option>
              {crVisuais.filter(v => v.ativo !== false || v.id === form.cr_visual_id).map(v => <option key={v.id} value={v.id}>{v.codigo} — {v.descricao}{v.ativo === false ? ' (inativo)' : ''}</option>)}
            </select>
            <p className="text-[11px] text-slate-400">Cadastro na engrenagem → Centro de Resultado (Visual). Usado em Orçamento e dashboards.</p>
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
            Ativo
          </label>
        </ModalForm>
      )}

      {modalImportarAberto && (
        <ImportarCentrosResultadoModal
          centros={centros}
          sistemas={sistemas}
          empresas={empresas}
          onClose={() => setModalImportarAberto(false)}
          onImported={loadData}
        />
      )}

      {modalCrVisualAberto && (
        <CrVisuaisModal
          crVisuais={crVisuais}
          centros={centros}
          onClose={() => setModalCrVisualAberto(false)}
          onChanged={loadData}
        />
      )}

      {empresasLote && (
        <ModalForm
          titulo={`Empresas de ${selecionados.size} centro(s) selecionado(s)`}
          icon={Building2}
          erro={erroEmpresasLote}
          salvando={aplicandoLote}
          onFechar={() => setEmpresasLote(null)}
          onSalvar={aplicarEmpresasLote}
          largura="w-[640px]"
        >
          <div className="flex flex-col gap-1.5">
            <label className={LABEL}>O que fazer com as empresas marcadas</label>
            {[
              ['acrescentar', 'Acrescentar', 'mantém as empresas que cada centro já tem e soma as marcadas'],
              ['substituir', 'Substituir', 'cada centro fica só com as empresas marcadas'],
              ['remover', 'Remover', 'tira as empresas marcadas dos centros selecionados'],
            ].map(([modo, titulo, desc]) => (
              <label key={modo} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                <input type="radio" name="modoEmpresasLote" checked={empresasLote.modo === modo} onChange={() => setEmpresasLote(l => ({ ...l, modo }))} className="mt-0.5" />
                <span><strong>{titulo}</strong> — <span className="text-slate-500">{desc}</span></span>
              </label>
            ))}
          </div>
          <SeletorEmpresas
            empresas={empresas}
            value={empresasLote.ids}
            onChange={ids => setEmpresasLote(l => ({ ...l, ids }))}
            sistemaNome={sistemaDaSelecao()}
          />
          {empresasLote.ids.length === 0 && empresasLote.modo !== 'substituir' && (
            <p className="text-[11px] text-amber-600 font-semibold">Marque ao menos uma empresa.</p>
          )}
          {empresasLote.ids.length === 0 && empresasLote.modo === 'substituir' && (
            <p className="text-[11px] text-amber-600 font-semibold">Sem empresa marcada, "Substituir" deixa os centros selecionados sem nenhuma empresa.</p>
          )}
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
