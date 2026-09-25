import React, { useEffect, useMemo, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import { Plus, X, Edit2, Trash2, ChevronRight, ChevronDown, Search, AlertTriangle, ShieldCheck, Upload, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { apiService } from '../../services/api'
import ImportarMenusModal from './ImportarMenusModal'
import { montarDadosExport, exportarExcel, exportarPdf } from './exportarGrupoAcessos'

const SISTEMAS = ['Dealer.net', 'MicroWork']

// Uma linha do menu (recursiva) — nós filhos só renderizam se o nó estiver
// expandido (ou se a busca estiver ativa, aí tudo que é ancestral de um
// resultado fica visível/aberto).
function LinhaMenu({ no, profundidade, ctx }) {
  const filhosTodos = ctx.filhosPorPai[no.id] || []
  const filhos = filhosTodos.filter(f => !ctx.idsVisiveisBusca || ctx.idsVisiveisBusca.has(f.id))
  const temFilhos = filhos.length > 0
  const expandido = ctx.idsVisiveisBusca ? true : ctx.expandidos.has(no.id)

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

            <span className={`text-xs text-slate-700 truncate ${profundidade === 0 ? 'font-bold' : 'font-medium'}`}>{no.nome}</span>
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

      {expandido && filhos.map(f => <LinhaMenu key={f.id} no={f} profundidade={profundidade + 1} ctx={ctx} />)}
    </>
  )
}

export default function GrupoAcessos() {
  const [sistema, setSistema] = useSessionState('governanca_grupo_sistema', SISTEMAS[0])
  const [menus, setMenus] = useState([])
  const [todosGrupos, setGrupos] = useState([])
  const [marcados, setMarcados] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [expandidos, setExpandidos] = useState(new Set())
  // Busca e filtro de grupos são de cada aba (Dealer.net / MicroWork): trocar de aba não mistura.
  const [buscaPorSistema, setBuscaPorSistema] = useState({})
  const [gruposFiltroPorSistema, setGruposFiltroPorSistema] = useState({})
  const [seletorGruposAberto, setSeletorGruposAberto] = useState(false)
  const busca = buscaPorSistema[sistema] || ''
  const setBusca = (v) => setBuscaPorSistema(prev => ({ ...prev, [sistema]: v }))
  const gruposFiltro = gruposFiltroPorSistema[sistema] || []
  const setGruposFiltro = (ids) => setGruposFiltroPorSistema(prev => ({ ...prev, [sistema]: ids }))
  // Colunas exibidas: todos os grupos da aba, ou só os escolhidos no seletor.
  const grupos = gruposFiltro.length > 0 ? todosGrupos.filter(g => gruposFiltro.includes(g.id)) : todosGrupos


  const [modalGrupo, setModalGrupo] = useState(null) // { id, nome, descricao } | null
  const [confirmarExcluirGrupo, setConfirmarExcluirGrupo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [importarAberto, setImportarAberto] = useState(false)
  const [exportarAberto, setExportarAberto] = useState(false)
  const [exportando, setExportando] = useState(false)

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

  // Exporta a matriz como está na tela: sistema e busca atuais, só o que está marcado.
  const exportar = async (formato) => {
    setExportarAberto(false)
    const dados = montarDadosExport({ menus, grupos, marcados, idsVisiveisBusca })
    if (dados.linhas.length === 0) { alert('Não há nenhum item marcado para exportar com o filtro atual.'); return }
    setExportando(true)
    try {
      const args = { sistema, busca: busca.trim(), dados }
      if (formato === 'excel') await exportarExcel(args)
      else await exportarPdf(args)
    } catch (err) {
      alert('Erro ao exportar: ' + (err.message || String(err)))
    } finally {
      setExportando(false)
    }
  }

  const raizMenus = (filhosPorPai['raiz'] || []).filter(f => !idsVisiveisBusca || idsVisiveisBusca.has(f.id))

  const ctx = {
    filhosPorPai, idsVisiveisBusca, expandidos, marcados, grupos,
    toggleExpandir, toggleMarcado,
  }

  return (
    <div className="p-6 space-y-4 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Grupo de Acessos</h1>
          <p className="text-xs text-slate-500">Matriz de menus/submenus × grupos de acesso cadastrados para cada sistema externo.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setExportarAberto(v => !v)}
              disabled={loading || exportando || todosGrupos.length === 0}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50"
              title="Exportar a matriz (só os itens marcados, respeitando a busca)"
            >
              <Download className="h-4 w-4" />
              {exportando ? 'Exportando...' : 'Exportar'}
            </button>
            {exportarAberto && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setExportarAberto(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-md shadow-lg z-40 py-1">
                  <button onClick={() => exportar('excel')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={() => exportar('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left">
                    <FileText className="h-4 w-4 text-red-600" /> PDF
                  </button>
                </div>
              </>
            )}
          </div>
          {sistema === 'Dealer.net' && (
            <button
              onClick={() => setImportarAberto(true)}
              className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
              title="Importar do Excel os menus, submenus e botões que faltam no catálogo"
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </button>
          )}
          <button
            onClick={() => setModalGrupo({ id: null, nome: '', descricao: '' })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Grupo de Acesso
          </button>
        </div>
      </div>

      {/* SISTEMA */}
      <div className="flex items-center gap-1.5">
        {SISTEMAS.map(s => (
          <button
            key={s}
            onClick={() => { setSistema(s); setSeletorGruposAberto(false) }}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${sistema === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* BUSCA + GRUPOS (valem só para a aba aberta) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder={`Buscar menu em ${sistema}...`}
            className="text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setSeletorGruposAberto(v => !v)}
            disabled={todosGrupos.length === 0}
            className="flex items-center justify-between gap-2 w-64 text-xs px-3 py-2 border border-slate-200 rounded-md bg-white hover:border-slate-300 disabled:opacity-50"
          >
            <span className="truncate text-slate-700">
              {gruposFiltro.length === 0 || gruposFiltro.length === todosGrupos.length
                ? 'Todos os grupos de acesso'
                : gruposFiltro.length === 1
                  ? todosGrupos.find(g => g.id === gruposFiltro[0])?.nome
                  : `${gruposFiltro.length} grupos selecionados`}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </button>
          {seletorGruposAberto && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSeletorGruposAberto(false)} />
              <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-md shadow-lg z-40">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 text-[11px]">
                  <button onClick={() => setGruposFiltro([])} className="text-blue-600 hover:underline">Todos os grupos</button>
                  <span className="text-slate-400">{gruposFiltro.length === 0 ? todosGrupos.length : gruposFiltro.length}/{todosGrupos.length}</span>
                </div>
                <div className="max-h-64 overflow-y-auto py-1">
                  {todosGrupos.map(g => {
                    const marcado = gruposFiltro.length === 0 || gruposFiltro.includes(g.id)
                    return (
                      <label key={g.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 select-none">
                        <input
                          type="checkbox"
                          checked={marcado}
                          onChange={() => {
                            const base = gruposFiltro.length === 0 ? todosGrupos.map(x => x.id) : gruposFiltro
                            const novo = marcado ? base.filter(x => x !== g.id) : [...base, g.id]
                            setGruposFiltro(novo.length === todosGrupos.length || novo.length === 0 ? [] : novo)
                          }}
                          className="w-3.5 h-3.5 accent-blue-600"
                        />
                        <span className="truncate">{g.nome}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            </>
          )}
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
      ) : todosGrupos.length === 0 ? (
        <div className="p-16 text-center text-sm text-slate-400 bg-white rounded-lg border border-slate-200">
          Nenhum grupo de acesso cadastrado para {sistema} ainda. Clique em "Novo Grupo de Acesso" para começar.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="p-2 sticky left-0 z-30 bg-slate-50 border-r border-slate-200" style={{ minWidth: 340 }}>
                  Menu / Submenu / Botões
                </th>
                {grupos.map(g => (
                  <th key={g.id} className="p-2 text-center border-l border-slate-100 align-bottom" style={{ minWidth: 56 }}>
                    <div className="flex flex-col items-center gap-1">
                      {/* Nome do grupo "de pé" (vertical, lido de baixo pra cima) pra caber inteiro na coluna estreita */}
                      <span
                        className="normal-case font-bold text-slate-700 whitespace-nowrap max-h-[260px] overflow-hidden"
                        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        title={g.nome}
                      >
                        {g.nome}
                      </span>
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
              {raizMenus.length === 0 && (
                <tr>
                  <td colSpan={grupos.length + 1} className="p-6 text-center text-slate-400">
                    Nenhum menu cadastrado para {sistema}.
                  </td>
                </tr>
              )}
              {raizMenus.map(no => <LinhaMenu key={no.id} no={no} profundidade={0} ctx={ctx} />)}
            </tbody>
          </table>
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

      {importarAberto && (
        <ImportarMenusModal
          sistema={sistema}
          menus={menus}
          marcados={marcados}
          onClose={() => setImportarAberto(false)}
          onImportado={async (res) => {
            setImportarAberto(false)
            await carregar()
            alert(`Importação concluída: ${res.criados} criado(s), ${res.atualizados} atualizado(s) e ${res.excluidos} ramo(s) excluído(s).`)
          }}
        />
      )}
    </div>
  )
}
