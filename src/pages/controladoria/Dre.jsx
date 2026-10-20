import React, { useEffect, useMemo, useState } from 'react'
import { Plus, FileBarChart, ChevronRight, ChevronDown, Info } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PermissionActionButtons from '../../components/PermissionActionButtons'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, ModalForm, ConfirmarExclusao, BadgeAtivo, INPUT, LABEL } from './ControladoriaNav'

const MENU = 'controladoria/dre'
const FORM_VAZIO = { ordem: '', descricao: '', tipo: 'CONTAS', sinal: 1, destaque: false, ativo: true }

// Prefixo exibido antes da descrição, no padrão de DRE: (+) soma, (-) subtrai, (=) subtotal.
const prefixo = (l) => l.tipo === 'SUBTOTAL' ? '(=)' : l.sinal === -1 ? '(-)' : '(+)'

export default function Dre() {
  const [linhas, setLinhas] = useState([])
  const [contas, setContas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandidas, setExpandidas] = useState(new Set())

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
      const [l, c] = await Promise.all([apiService.getCtbDreLinhas(), apiService.getCtbPlanoContas()])
      setLinhas(l)
      setContas(c)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const contasPorLinha = useMemo(() => {
    const mapa = {}
    for (const c of contas) {
      if (!c.linha_dre_id) continue
      if (!mapa[c.linha_dre_id]) mapa[c.linha_dre_id] = []
      mapa[c.linha_dre_id].push(c)
    }
    for (const lista of Object.values(mapa)) lista.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
    return mapa
  }, [contas])
  const qtdAnaliticasSemLinha = useMemo(() => contas.filter(c => c.tipo === 'ANALITICA' && c.ativo !== false && !c.linha_dre_id).length, [contas])

  const proximaOrdem = () => (linhas.reduce((m, l) => Math.max(m, l.ordem || 0), 0) + 10)
  const abrirIncluir = () => { setEditingId(null); setForm({ ...FORM_VAZIO, ordem: proximaOrdem() }); setErroModal(null); setModalAberto(true) }
  const abrirEditar = (l) => {
    setEditingId(l.id)
    setForm({ ordem: l.ordem, descricao: l.descricao, tipo: l.tipo, sinal: l.sinal, destaque: !!l.destaque, ativo: l.ativo ?? true })
    setErroModal(null)
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErroModal(null)
    try {
      await apiService.salvarCtbDreLinha(editingId, form)
      await loadData()
      setModalAberto(false)
    } catch (err) {
      setErroModal('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    try {
      await apiService.deleteCtbDreLinha(excluir.id)
      await loadData()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluir(null)
    }
  }

  const alternar = (id) => setExpandidas(prev => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })

  return (
    <div className="p-6 space-y-4 max-w-screen-xl">
      <CabecalhoControladoria
        descricao="DRE: estrutura da Demonstração do Resultado do Exercício — linhas que somam contas do Plano de Contas e subtotais."
        acao={canEdit && (
          <button onClick={abrirIncluir} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Incluir Linha
          </button>
        )}
      />

      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] text-blue-800">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Nesta etapa a DRE é a <strong>estrutura</strong> do relatório. Os valores por período/empresa entram quando a fonte dos
          lançamentos contábeis for definida. Tudo fica gravado no Supabase e disponível ao Power BI pelas views
          <code className="mx-1 font-mono">vw_ctb_dre_estrutura</code>e<code className="mx-1 font-mono">vw_ctb_plano_contas</code>.
        </span>
      </div>

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
          {qtdAnaliticasSemLinha > 0 && (
            <p className="text-[11px] text-amber-600">{qtdAnaliticasSemLinha} conta(s) analítica(s) ativa(s) do Plano de Contas ainda sem linha da DRE vinculada.</p>
          )}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="p-3 w-20 text-center">Ordem</th>
                  <th className="p-3">Linha da DRE</th>
                  <th className="p-3 w-32 text-center">Tipo</th>
                  <th className="p-3 w-32 text-center">Contas</th>
                  <th className="p-3 w-24 text-center">Situação</th>
                  <th className="p-3 w-24 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {linhas.length === 0 ? (
                  <tr><td colSpan="6" className="p-6 text-center text-slate-400">Nenhuma linha cadastrada. Comece por "Incluir Linha" (ex: Receita Bruta, Deduções, Receita Líquida...).</td></tr>
                ) : linhas.map(l => {
                  const vinculadas = contasPorLinha[l.id] || []
                  const aberta = expandidas.has(l.id)
                  const subtotal = l.tipo === 'SUBTOTAL'
                  return (
                    <React.Fragment key={l.id}>
                      <tr className={`transition-colors ${subtotal || l.destaque ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                        <td className="p-3 text-center font-mono text-slate-400">{l.ordem}</td>
                        <td className={`p-3 ${subtotal || l.destaque ? 'font-bold text-slate-900' : ''}`}>
                          <span className={`font-mono mr-2 ${subtotal ? 'text-indigo-600' : l.sinal === -1 ? 'text-red-500' : 'text-emerald-600'}`}>{prefixo(l)}</span>
                          {l.descricao}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${subtotal ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {subtotal ? 'Subtotal' : 'Soma contas'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {subtotal ? <span className="text-slate-300">—</span> : (
                            <button type="button" disabled={vinculadas.length === 0} onClick={() => alternar(l.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-default">
                              {vinculadas.length > 0 && (aberta ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                              {vinculadas.length} conta(s)
                            </button>
                          )}
                        </td>
                        <td className="p-3 text-center"><BadgeAtivo ativo={l.ativo} /></td>
                        <td className="p-3"><PermissionActionButtons menuPath={MENU} onEdit={() => abrirEditar(l)} onDelete={() => setExcluir(l)} /></td>
                      </tr>
                      {aberta && vinculadas.map(c => (
                        <tr key={c.id} className="bg-white">
                          <td />
                          <td colSpan="5" className="px-3 py-1.5 pl-12 text-[11px] text-slate-500">
                            <span className="font-mono mr-2">{c.codigo}</span>{c.descricao}
                            {c.ativo === false && <span className="ml-2 text-slate-300">(inativa)</span>}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">Vincule as contas a cada linha na aba <strong>Plano de Contas</strong> (campo "Linha da DRE" das contas analíticas).</p>
        </>
      )}

      {modalAberto && (
        <ModalForm
          titulo={editingId ? 'Editar Linha da DRE' : 'Incluir Linha da DRE'}
          icon={FileBarChart}
          erro={erroModal}
          salvando={salvando}
          onFechar={() => setModalAberto(false)}
          onSalvar={handleSalvar}
        >
          <div className="grid grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Ordem *</label>
              <input required type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: e.target.value }))} className={INPUT} />
            </div>
            <div className="flex flex-col gap-1.5 col-span-3">
              <label className={LABEL}>Descrição *</label>
              <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Receita Bruta de Vendas" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={LABEL}>Tipo *</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={INPUT}>
                <option value="CONTAS">Soma contas do Plano</option>
                <option value="SUBTOTAL">Subtotal (linhas acima)</option>
              </select>
            </div>
            {form.tipo === 'CONTAS' && (
              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Sinal *</label>
                <select value={form.sinal} onChange={e => setForm(f => ({ ...f, sinal: Number(e.target.value) }))} className={INPUT}>
                  <option value={1}>(+) Soma</option>
                  <option value={-1}>(-) Subtrai</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.destaque} onChange={e => setForm(f => ({ ...f, destaque: e.target.checked }))} className="w-4 h-4" />
              Destacar (negrito)
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
              Ativo
            </label>
          </div>
        </ModalForm>
      )}

      {excluir && (
        <ConfirmarExclusao
          texto={<>Tem certeza que deseja excluir a linha <strong className="text-slate-800">"{excluir.descricao}"</strong>?{(contasPorLinha[excluir.id] || []).length > 0 && ` As ${(contasPorLinha[excluir.id] || []).length} conta(s) vinculada(s) ficarão sem linha da DRE.`}</>}
          onVoltar={() => setExcluir(null)}
          onConfirmar={handleExcluir}
        />
      )}
    </div>
  )
}
