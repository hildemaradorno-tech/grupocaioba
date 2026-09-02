import React, { useEffect, useMemo, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, Edit2, Trash2, ChevronRight, ChevronDown, Search, AlertTriangle, ShieldCheck } from 'lucide-react'
import { apiService } from '../../services/api'

const SISTEMAS = ['Dealer.net', 'MicroWork']

// Uma linha do menu (recursiva) — nós filhos só renderizam se o nó estiver
// expandido (ou se a busca estiver ativa, aí tudo que é ancestral de um
// resultado fica visível/aberto).
function LinhaMenu({ no, profundidade, ctx }) {
  const filhosTodos = ctx.filhosPorPai[no.id] || []
  const filhos = filhosTodos.filter(f => !ctx.idsVisiveisBusca || ctx.idsVisiveisBusca.has(f.id))
  const temFilhos = filhos.length > 0
  const expandido = ctx.idsVisiveisBusca ? true : ctx.expandidos.has(no.id)
  const editando = ctx.editandoId === no.id
  const adicionando = ctx.adicionandoFilhoDe === no.id

  return (
    <>
      <tr className="hover:bg-slate-50/70 group">
        <td className="p-1.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50/70 border-r border-slate-100"
          style={{ minWidth: 340 }}>
          <div className="flex items-center gap-1" style={{ paddingLeft: profundidade * 18 }}>
            {temFilhos ? (
              <button onClick={() => ctx.toggleExpandir(no.id)} className="p-0.5 text-slate-400 hover:text-slate-700 shrink-0">
                {expandido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : <span className="w-4 h-4 inline-block shrink-0" />}

            {editando ? (
              <input
                autoFocus
                value={ctx.editandoNome}
                onChange={e => ctx.setEditandoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ctx.salvarRenomeio(); if (e.key === 'Escape') ctx.cancelarEditar() }}
                onBlur={ctx.salvarRenomeio}
                className="text-xs p-1 border border-blue-300 rounded flex-1 min-w-0"
              />
            ) : (
              <span className={`text-xs text-slate-700 truncate ${profundidade === 0 ? 'font-bold' : 'font-medium'}`}>{no.nome}</span>
            )}

            <div className="hidden group-hover:flex items-center gap-0.5 ml-auto pl-1 shrink-0">
              <button onClick={() => ctx.iniciarAdicionarFilho(no.id)} title="Adicionar submenu" className="p-0.5 text-slate-400 hover:text-blue-600"><Plus className="h-3 w-3" /></button>
              <button onClick={() => ctx.iniciarEditar(no)} title="Renomear" className="p-0.5 text-slate-400 hover:text-blue-600"><Edit2 className="h-3 w-3" /></button>
              <button onClick={() => ctx.pedirExclusao(no)} title="Excluir" className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        </td>
        {ctx.grupos.map(g => (
          <td key={g.id} className="p-1.5 text-center border-l border-slate-50">
            <input
              type="checkbox"
              checked={ctx.marcados.has(`${g.id}::${no.id}`)}
              onChange={() => ctx.toggleMarcado(g.id, no.id)}
              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
            />
          </td>
        ))}
      </tr>

      {adicionando && (
        <tr>
          <td colSpan={ctx.grupos.length + 1} className="p-1.5 sticky left-0 bg-blue-50/40">
            <div className="flex items-center gap-2" style={{ paddingLeft: (profundidade + 1) * 18 }}>
              <input
                autoFocus
                value={ctx.novoNome}
                onChange={e => ctx.setNovoNome(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') ctx.confirmarAdicionarFilho(); if (e.key === 'Escape') ctx.cancelarAdicionarFilho() }}
                placeholder="Nome do novo submenu..."
                className="text-xs p-1.5 border border-blue-200 rounded flex-1 max-w-xs"
              />
              <button onClick={ctx.confirmarAdicionarFilho} className="text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /></button>
              <button onClick={ctx.cancelarAdicionarFilho} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
            </div>
          </td>
        </tr>
      )}

      {expandido && filhos.map(f => <LinhaMenu key={f.id} no={f} profundidade={profundidade + 1} ctx={ctx} />)}
    </>
  )
}

export default function GrupoAcessos() {
  const [sistema, setSistema] = useSessionState('governanca_grupo_sistema', SISTEMAS[0])
  const [menus, setMenus] = useState([])
  const [grupos, setGrupos] = useState([])
  const [marcados, setMarcados] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [expandidos, setExpandidos] = useState(new Set())
  const [busca, setBusca] = useState('')

  const [editandoId, setEditandoId] = useState(null)
  const [editandoNome, setEditandoNome] = useState('')
  const [adicionandoFilhoDe, setAdicionandoFilhoDe] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [confirmarExcluirMenu, setConfirmarExcluirMenu] = useState(null)

  const [modalGrupo, setModalGrupo] = useState(null) // { id, nome, descricao } | null
  const [confirmarExcluirGrupo, setConfirmarExcluirGrupo] = useState(null)
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    setErro(null)
    try {
      const [menusData, gruposData] = await Promise.all([
        apiService.getGovernancaMenus(sistema),
        apiService.getGovernancaGrupos(),
      ])
      const gruposDoSistema = gruposData.filter(g => g.sistema === sistema)
      setMenus(menusData)
      setGrupos(gruposDoSistema)
      const pares = await apiService.getGovernancaGrupoMenus(gruposDoSistema.map(g => g.id))
      setMarcados(new Set(pares.map(x => `${x.grupo_id}::${x.menu_id}`)))
    } catch (err) {
      console.error('Erro ao carregar grupos de acesso', err)
      setErro(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [sistema])

  const filhosPorPai = useMemo(() => {
    const m = {}
    menus.forEach(item => { (m[item.pai_id || 'raiz'] ||= []).push(item) })
    Object.values(m).forEach(arr => arr.sort((a, b) => a.ordem - b.ordem))
    return m
  }, [menus])

  const idsVisiveisBusca = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return null
    const porId = Object.fromEntries(menus.map(m => [m.id, m]))
    const visiveis = new Set()
    menus.forEach(m => {
      if (m.nome.toLowerCase().includes(termo)) {
        let atual = m
        while (atual) {
          visiveis.add(atual.id)
          atual = atual.pai_id ? porId[atual.pai_id] : null
        }
      }
    })
    return visiveis
  }, [busca, menus])

  const toggleExpandir = (id) => setExpandidos(prev => {
    const novo = new Set(prev)
    novo.has(id) ? novo.delete(id) : novo.add(id)
    return novo
  })

  const toggleMarcado = async (grupoId, menuId) => {
    const chave = `${grupoId}::${menuId}`
    const estavaMarcado = marcados.has(chave)
    setMarcados(prev => {
      const novo = new Set(prev)
      estavaMarcado ? novo.delete(chave) : novo.add(chave)
      return novo
    })
    try {
      if (estavaMarcado) await apiService.desmarcarGovernancaGrupoMenu(grupoId, menuId)
      else await apiService.marcarGovernancaGrupoMenu(grupoId, menuId)
    } catch (err) {
      setMarcados(prev => {
        const novo = new Set(prev)
        estavaMarcado ? novo.add(chave) : novo.delete(chave)
        return novo
      })
      alert('Erro ao salvar: ' + (err.message || String(err)))
    }
  }

  const iniciarEditar = (no) => { setEditandoId(no.id); setEditandoNome(no.nome); setAdicionandoFilhoDe(null) }
  const cancelarEditar = () => setEditandoId(null)
  const salvarRenomeio = async () => {
    if (!editandoId) return
    const nomeNovo = editandoNome.trim()
    const idAlvo = editandoId
    setEditandoId(null)
    if (!nomeNovo) return
    try {
      await apiService.updateGovernancaMenu(idAlvo, { nome: nomeNovo })
      setMenus(prev => prev.map(m => m.id === idAlvo ? { ...m, nome: nomeNovo } : m))
    } catch (err) {
      alert('Erro ao renomear: ' + (err.message || String(err)))
    }
  }

  const RAIZ = '__RAIZ__'
  const iniciarAdicionarFilho = (paiId) => { setAdicionandoFilhoDe(paiId); setNovoNome(''); setEditandoId(null) }
  const cancelarAdicionarFilho = () => setAdicionandoFilhoDe(null)
  const confirmarAdicionarFilho = async () => {
    const nomeNovo = novoNome.trim()
    const paiId = adicionandoFilhoDe === RAIZ ? null : adicionandoFilhoDe
    if (!nomeNovo) return
    try {
      const irmaos = filhosPorPai[paiId || 'raiz'] || []
      const ordem = irmaos.length
      const novo = await apiService.createGovernancaMenu({ sistema, pai_id: paiId, nome: nomeNovo, ordem })
      setMenus(prev => [...prev, novo])
      if (paiId) setExpandidos(prev => new Set(prev).add(paiId))
      setAdicionandoFilhoDe(null)
      setNovoNome('')
    } catch (err) {
      alert('Erro ao adicionar: ' + (err.message || String(err)))
    }
  }

  const pedirExclusao = (no) => setConfirmarExcluirMenu(no)
  const excluirMenu = async () => {
    if (!confirmarExcluirMenu) return
    try {
      await apiService.deleteGovernancaMenu(confirmarExcluirMenu.id)
      await carregar()
    } catch (err) {
      alert('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setConfirmarExcluirMenu(null)
    }
  }

  const salvarGrupo = async (e) => {
    e.preventDefault()
    setSalvando(true)
    try {
      if (modalGrupo.id) {
        await apiService.updateGovernancaGrupo(modalGrupo.id, { nome: modalGrupo.nome, sistema, descricao: modalGrupo.descricao })
      } else {
        await apiService.createGovernancaGrupo({ nome: modalGrupo.nome, sistema, descricao: modalGrupo.descricao, permissoes: [] })
      }
      setModalGrupo(null)
      await carregar()
    } catch (err) {
      alert('Erro ao salvar grupo: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const excluirGrupo = async () => {
    if (!confirmarExcluirGrupo) return
    try {
      await apiService.deleteGovernancaGrupo(confirmarExcluirGrupo.id)
      await carregar()
    } catch (err) {
      alert('Erro ao excluir grupo: ' + (err.message || String(err)))
    } finally {
      setConfirmarExcluirGrupo(null)
    }
  }

  const raizMenus = (filhosPorPai['raiz'] || []).filter(f => !idsVisiveisBusca || idsVisiveisBusca.has(f.id))

  const ctx = {
    filhosPorPai, idsVisiveisBusca, expandidos, marcados, grupos,
    editandoId, editandoNome, setEditandoNome, salvarRenomeio, cancelarEditar, iniciarEditar,
    adicionandoFilhoDe, novoNome, setNovoNome, confirmarAdicionarFilho, cancelarAdicionarFilho, iniciarAdicionarFilho,
    toggleExpandir, toggleMarcado, pedirExclusao,
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Grupo de Acessos</h1>
          <p className="text-xs text-slate-500">Matriz de menus/submenus × grupos de acesso cadastrados para cada sistema externo.</p>
        </div>
        <button
          onClick={() => setModalGrupo({ id: null, nome: '', descricao: '' })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Grupo de Acesso
        </button>
      </div>

      {/* SISTEMA + BUSCA */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          {SISTEMAS.map(s => (
            <button
              key={s}
              onClick={() => setSistema(s)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${sistema === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar menu..."
            className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-sm text-slate-400">Carregando...</div>
      ) : erro ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
          <h2 className="text-lg font-semibold mb-2">Erro ao carregar dados</h2>
          <p className="mb-4 text-sm text-slate-700">{erro}</p>
          <button onClick={carregar} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
        </div>
      ) : grupos.length === 0 ? (
        <div className="p-16 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">
          Nenhum grupo de acesso cadastrado para {sistema} ainda. Clique em "Novo Grupo de Acesso" para começar.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-2 sticky left-0 z-30 bg-slate-50 border-r border-slate-200" style={{ minWidth: 340 }}>
                  Menu / Submenu ({menus.length})
                </th>
                {grupos.map(g => (
                  <th key={g.id} className="p-2 text-center border-l border-slate-100" style={{ minWidth: 110 }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="normal-case font-bold text-slate-700 truncate max-w-[100px]" title={g.nome}>{g.nome}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModalGrupo({ id: g.id, nome: g.nome, descricao: g.descricao || '' })}
                          title="Editar grupo" className="p-0.5 text-slate-400 hover:text-blue-600"><Edit2 className="h-3 w-3" /></button>
                        <button onClick={() => setConfirmarExcluirGrupo(g)}
                          title="Excluir grupo" className="p-0.5 text-slate-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {raizMenus.length === 0 && !adicionandoFilhoDe && (
                <tr>
                  <td colSpan={grupos.length + 1} className="p-6 text-center text-slate-400">
                    Nenhum menu cadastrado para {sistema}.
                  </td>
                </tr>
              )}
              {raizMenus.map(no => <LinhaMenu key={no.id} no={no} profundidade={0} ctx={ctx} />)}
            </tbody>
          </table>
          <div className="p-2 border-t border-slate-100">
            {adicionandoFilhoDe === RAIZ ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmarAdicionarFilho(); if (e.key === 'Escape') cancelarAdicionarFilho() }}
                  placeholder="Nome do novo menu de nível 1..."
                  className="text-xs p-1.5 border border-blue-200 rounded flex-1 max-w-xs"
                />
                <button onClick={confirmarAdicionarFilho} className="text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /></button>
                <button onClick={cancelarAdicionarFilho} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => iniciarAdicionarFilho(RAIZ)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1"
              >
                <Plus className="h-3.5 w-3.5" /> Novo menu de nível 1
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL GRUPO (criar/editar) */}
      {modalGrupo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                {modalGrupo.id ? 'Editar Grupo de Acesso' : 'Novo Grupo de Acesso'}
              </h3>
              <button onClick={() => setModalGrupo(null)} className="p-1 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2">Sistema: <strong className="text-slate-600">{sistema}</strong></p>
            <form onSubmit={salvarGrupo} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Nome do Grupo *</label>
                <input
                  autoFocus
                  required
                  value={modalGrupo.nome}
                  onChange={e => setModalGrupo(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex.: Gerente de Loja, Vendedor..."
                  className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Descrição</label>
                <textarea
                  rows={2}
                  value={modalGrupo.descricao}
                  onChange={e => setModalGrupo(prev => ({ ...prev, descricao: e.target.value }))}
                  className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModalGrupo(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
                <button type="submit" disabled={salvando} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAR EXCLUSÃO GRUPO */}
      {confirmarExcluirGrupo && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir grupo de acesso?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tem certeza que deseja excluir o grupo <strong className="text-slate-800">"{confirmarExcluirGrupo.nome}"</strong>? Todas as marcações de acesso dele serão perdidas.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarExcluirGrupo(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
              <button onClick={excluirGrupo} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAR EXCLUSÃO MENU */}
      {confirmarExcluirMenu && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Excluir menu?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tem certeza que deseja excluir <strong className="text-slate-800">"{confirmarExcluirMenu.nome}"</strong>? Todos os submenus dentro dele (se houver) e as marcações de acesso associadas também serão excluídos.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmarExcluirMenu(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
              <button onClick={excluirMenu} className="px-3 py-1.5 rounded-md text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
