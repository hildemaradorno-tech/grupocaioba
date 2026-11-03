import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, AlertTriangle, Loader2, Paperclip } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'
import AcoesDropdown from '../components/AcoesDropdown'
import { codigoPolitica, compararCodigoPolitica } from '../utils/comissoesFormat'

// Documentos PJ: documentos que o prestador PJ envia todo mês (pj_documentos_exigidos). Vale para todos
// os prestadores PJ ou só para quem tem uma Regra PJ (ex: Unimed). Obrigatório: em Prestadores de
// Serviços o Conferir Comissões só libera com o documento anexado; opcional só fica disponível para anexar.

const SEL = 'w-full text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const FORM_VAZIO = { nome: '', obrigatorio: true, escopo: 'TODOS', regra_id: '', vig_inicio: '', vig_fim: '', ativo: true }

const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}

export default function DocumentosPJ() {
  const { hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault('documentos-pj', 'editar')
  const canDelete = hasActionOrDefault('documentos-pj', 'excluir')

  const [documentos, setDocumentos] = useState([])
  const [regrasPj, setRegrasPj] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const [erroForm, setErroForm] = useState(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [docs, politicas] = await Promise.all([apiService.getPjDocumentosExigidos(), apiService.getPoliticaComissao()])
      setDocumentos(docs)
      // Uma opção por regra (grupo_politica_id) — versões da mesma regra contam uma vez.
      const porGrupo = new Map()
      politicas.filter(p => p.prestacao_pj).sort(compararCodigoPolitica)
        .forEach(p => { const g = p.grupo_politica_id || p.id; if (!porGrupo.has(g) || p.ativo !== false) porGrupo.set(g, p) })
      setRegrasPj([...porGrupo.entries()].map(([id, p]) => ({ id, politica: p })))
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { loadData() }, [])

  const regraPorId = useMemo(() => Object.fromEntries(regrasPj.map(r => [r.id, r.politica])), [regrasPj])
  const nomeRegra = (id) => {
    const p = regraPorId[id]
    return p ? `${codigoPolitica(p)} ${p.descricao_comissao || ''}`.trim() : 'Regra não encontrada'
  }
  const lista = useMemo(() => [...documentos].sort((a, b) =>
    (a.escopo === 'TODOS' ? 0 : 1) - (b.escopo === 'TODOS' ? 0 : 1)
    || (a.escopo === 'REGRA' ? nomeRegra(a.regra_id).localeCompare(nomeRegra(b.regra_id), 'pt-BR', { numeric: true }) : 0)
    || a.nome.localeCompare(b.nome, 'pt-BR')), [documentos, regraPorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const abrirIncluir = () => {
    setEditingId(null)
    setForm(FORM_VAZIO)
    setErroForm(null)
    setModalAberto(true)
  }
  const abrirEditar = (d, duplicar = false) => {
    setEditingId(duplicar ? null : d.id)
    setForm({
      nome: d.nome || '', obrigatorio: d.obrigatorio !== false, escopo: d.escopo || 'TODOS', regra_id: d.regra_id || '',
      vig_inicio: d.vig_inicio || '', vig_fim: d.vig_fim || '', ativo: d.ativo !== false,
    })
    setErroForm(null)
    setModalAberto(true)
  }

  const handleSalvar = async (e) => {
    e.preventDefault()
    if (salvandoRef.current) return
    salvandoRef.current = true
    setSalvando(true)
    setErroForm(null)
    try {
      if (!form.nome.trim()) throw new Error('informe o nome do documento.')
      if (form.escopo === 'REGRA' && !form.regra_id) throw new Error('escolha a Regra PJ.')
      await apiService.salvarPjDocumentoExigido(editingId, {
        nome: form.nome.trim(),
        obrigatorio: form.obrigatorio,
        escopo: form.escopo,
        regra_id: form.escopo === 'REGRA' ? form.regra_id : null,
        vig_inicio: form.vig_inicio || null,
        vig_fim: form.vig_fim || null,
        ativo: form.ativo,
      })
      setModalAberto(false)
      await loadData()
    } catch (err) {
      setErroForm(err.message || String(err))
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  const handleExcluir = async (d) => {
    if (!window.confirm(`Excluir o documento "${d.nome}"? Os arquivos já anexados continuam guardados.`)) return
    try {
      await apiService.excluirPjDocumentoExigido(d.id)
      await loadData()
    } catch (err) {
      setError(err.message || String(err))
    }
  }

  return (
    <div className="min-h-full w-full p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Documentos PJ</h1>
          <p className="text-xs text-slate-500">Documentos que o prestador PJ envia todo mês — para todos os prestadores ou só para quem tem uma Regra PJ. Obrigatórios travam o Conferir Comissões até serem anexados.</p>
        </div>
        {canEdit && (
          <button onClick={abrirIncluir}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
            <Plus className="h-4 w-4" /> Cadastrar Documento
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              {(canEdit || canDelete) && <th className="p-3 w-12 text-center">Ações</th>}
              <th className="p-3 min-w-[260px]">Documento</th>
              <th className="p-3 min-w-[260px]">Vale para</th>
              <th className="p-3 w-32 text-center">Obrigatoriedade</th>
              <th className="p-3 min-w-[110px]">Vigência</th>
              <th className="p-3 w-20 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan="6" className="p-6 text-center text-slate-400">Nenhum documento cadastrado.</td></tr>
            ) : lista.map(d => (
              <tr key={d.id} className="hover:bg-slate-50/70">
                {(canEdit || canDelete) && (
                  <td className="p-3 text-center">
                    <AcoesDropdown
                      onEditar={canEdit ? () => abrirEditar(d) : null}
                      onDuplicar={canEdit ? () => abrirEditar(d, true) : null}
                      onExcluir={canDelete ? () => handleExcluir(d) : null}
                    />
                  </td>
                )}
                <td className="p-3 font-semibold text-slate-800"><Paperclip className="h-3.5 w-3.5 inline mr-1.5 text-slate-400" />{d.nome}</td>
                <td className="p-3 text-slate-700">{d.escopo === 'TODOS' ? 'Todos os prestadores PJ' : <>Regra <span className="font-semibold">{nomeRegra(d.regra_id)}</span></>}</td>
                <td className="p-3 text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${d.obrigatorio ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {d.obrigatorio ? 'Obrigatório' : 'Opcional'}
                  </span>
                </td>
                <td className="p-3 font-mono text-[11px] text-slate-600">
                  <div>{fmtDate(d.vig_inicio)}</div>
                  <div className="text-slate-400">{fmtDate(d.vig_fim)}</div>
                </td>
                <td className="p-3 text-center">
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${d.ativo !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {d.ativo !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[560px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-600" /> {editingId ? 'Editar Documento PJ' : 'Cadastrar Documento PJ'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Nome do documento <span className="text-red-500">*</span></label>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: DARF INSS" className={INP} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Obrigatoriedade</label>
                  <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2"><input type="radio" checked={form.obrigatorio} onChange={() => setForm(f => ({ ...f, obrigatorio: true }))} /> Documento obrigatório</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={!form.obrigatorio} onChange={() => setForm(f => ({ ...f, obrigatorio: false }))} /> Documento opcional</label>
                  </div>
                  <p className="text-[11px] text-slate-400">{form.obrigatorio ? 'Sem o anexo, o Conferir Comissões do prestador fica bloqueado.' : 'Fica disponível para anexar, mas não trava o Conferir Comissões.'}</p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Vale para</label>
                  <div className="flex items-center gap-5 text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2"><input type="radio" checked={form.escopo === 'TODOS'} onChange={() => setForm(f => ({ ...f, escopo: 'TODOS' }))} /> Todos os prestadores PJ</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={form.escopo === 'REGRA'} onChange={() => setForm(f => ({ ...f, escopo: 'REGRA' }))} /> Quem tem uma Regra PJ</label>
                  </div>
                  {form.escopo === 'REGRA' && (
                    <select value={form.regra_id} onChange={e => setForm(f => ({ ...f, regra_id: e.target.value }))} className={SEL}>
                      <option value="">Selecione a regra...</option>
                      {regrasPj.map(r => (
                        <option key={r.id} value={r.id}>{codigoPolitica(r.politica)} {r.politica.descricao_comissao} — {r.politica.cargo_nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Início</label>
                    <input type="date" value={form.vig_inicio} onChange={e => setForm(f => ({ ...f, vig_inicio: e.target.value }))} className={INP} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Vigência Fim</label>
                    <input type="date" value={form.vig_fim} onChange={e => setForm(f => ({ ...f, vig_fim: e.target.value }))} className={INP} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="w-4 h-4" />
                  Documento ativo
                </label>

                {erroForm && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md px-3 py-2">
                    <AlertTriangle className="h-4 w-4" /> Erro ao salvar: {erroForm}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-4 py-2 rounded-md">
                  {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
