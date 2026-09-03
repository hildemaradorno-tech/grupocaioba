import React, { useEffect, useState } from 'react'
import { useSessionState } from '../../hooks/useSessionState'
import {
  Search, ChevronRight, ChevronDown, Check, Upload, Users2,
  Maximize2, Minimize2, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import ImportarOrganogramaModal from './ImportarOrganogramaModal'

const cmpTexto = (a, b) => (a || '').localeCompare(b || '', 'pt-BR')

// Vive só como aba dentro de Grade de Treinamentos (rota /treinamentos/grade)
// — não tem menu/rota próprios, por isso usa a mesma permissão da página mãe.
export default function OrganogramaTreinamentos({ onAlterado }) {
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('treinamentos/grade')

  const [organograma, setOrganograma] = useState([])
  const [cursos, setCursos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [busca, setBusca] = useSessionState('trein_org_busca', '')
  const [filtroCurso, setFiltroCurso] = useSessionState('trein_org_filtro_curso', '')
  const [expandedIds, setExpandedIds] = useSessionState('trein_org_expandidos', [])
  const [modalImportarAberto, setModalImportarAberto] = useState(false)

  // vinculos[cargoId] = { [cursoId]: 'OBR' | 'SUG' } — espelha trein_curso_cargos,
  // atualizado otimisticamente ao clicar numa bolinha
  const [vinculos, setVinculos] = useState({})
  const [salvandoCel, setSalvandoCel] = useState(null) // `${cargoId}:${cursoId}` enquanto salva

  const expandedSet = new Set(expandedIds)
  const toggleExpandido = (id) => {
    const next = new Set(expandedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedIds([...next])
  }

  const loadDados = async () => {
    setLoading(true); setError(null)
    try {
      const [org, cur] = await Promise.all([
        apiService.getTreinOrganograma(),
        apiService.getTreinCursos(),
      ])
      setOrganograma(org.filter(o => o.ativo !== false).sort((a, b) => cmpTexto(a.nome, b.nome)))
      setCursos(cur.filter(c => c.ativo).sort((a, b) => cmpTexto(a.categoria_nome, b.categoria_nome) || cmpTexto(a.nome, b.nome)))

      const mapa = {}
      cur.forEach(c => {
        ;(c.cargos || []).forEach(cc => {
          if (!mapa[cc.cargo_id]) mapa[cc.cargo_id] = {}
          mapa[cc.cargo_id][c.id] = cc.obrigatorio !== false ? 'OBR' : 'SUG'
        })
      })
      setVinculos(mapa)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDados() }, [])

  // Clique na bolinha: cicla Nenhum → Obrigatório → Sugerido → Nenhum, salvando
  // no mesmo trein_curso_cargos que a Grade de Treinamentos usa — o dado é o
  // mesmo, mas cada tela mantém sua própria cópia em memória (state React),
  // então depois de salvar avisa o pai via onAlterado (quando embutido em
  // Grade de Treinamentos) pra ele recarregar as próprias abas também.
  const toggleVinculo = async (cargo, curso) => {
    const chave = `${cargo.id}:${curso.id}`
    const atualCargo = vinculos[cargo.id] || {}
    const atualEstado = atualCargo[curso.id]
    const proximo = atualEstado === undefined ? 'OBR' : atualEstado === 'OBR' ? 'SUG' : undefined
    const novoMapaCargo = { ...atualCargo }
    if (proximo === undefined) delete novoMapaCargo[curso.id]
    else novoMapaCargo[curso.id] = proximo

    setVinculos(prev => ({ ...prev, [cargo.id]: novoMapaCargo }))
    setSalvandoCel(chave)
    try {
      const cursosArray = Object.entries(novoMapaCargo).map(([id, tipo]) => ({ id, obrigatorio: tipo === 'OBR' }))
      await apiService.salvarTreinCargoCursos(cargo.id, cargo.nome, cursosArray)
      onAlterado?.()
    } catch (err) {
      alert('Erro ao salvar vínculo: ' + (err.message || String(err)))
      setVinculos(prev => ({ ...prev, [cargo.id]: atualCargo }))
    } finally {
      setSalvandoCel(null)
    }
  }

  if (loading) return <div>Carregando...</div>

  if (error) return (
    <div>
      <div className="bg-yellow-50 border border-yellow-200 rounded p-6">
        <h2 className="text-lg font-semibold mb-2">Erro ao carregar organograma</h2>
        <p className="mb-4 text-sm text-slate-700">{error}</p>
        <button onClick={loadDados} className="bg-blue-600 text-white px-4 py-2 rounded-md">Tentar novamente</button>
      </div>
    </div>
  )

  // ── Árvore ───────────────────────────────────────────────────────────────
  const filhosPorPai = {}
  organograma.forEach(n => {
    const chave = n.pai_id || '__raiz__'
    ;(filhosPorPai[chave] = filhosPorPai[chave] || []).push(n)
  })
  Object.values(filhosPorPai).forEach(lista => lista.sort((a, b) => cmpTexto(a.nome, b.nome)))
  const raizes = filhosPorPai['__raiz__'] || []

  const buscaUp = busca.trim().toUpperCase()
  const idPorId = Object.fromEntries(organograma.map(n => [n.id, n]))
  const ancestraisDeMatches = new Set()
  if (buscaUp) {
    organograma.filter(n => n.nome.toUpperCase().includes(buscaUp)).forEach(n => {
      let atual = idPorId[n.pai_id]
      while (atual) { ancestraisDeMatches.add(atual.id); atual = idPorId[atual.pai_id] }
    })
  }
  const expandidoEfetivo = (id) => expandedSet.has(id) || ancestraisDeMatches.has(id)

  const linhas = []
  const montarLinhas = (lista, profundidade) => {
    lista.forEach(n => {
      const filhos = filhosPorPai[n.id] || []
      if (buscaUp && !n.nome.toUpperCase().includes(buscaUp) && !ancestraisDeMatches.has(n.id)) {
        // fora do filtro de busca e não é ancestral de um match — ainda assim
        // pode ter filho que dá match, então checa recursivamente sem listar o nó
        const temDescendenteMatch = filhos.length > 0
        if (!temDescendenteMatch) return
      }
      linhas.push({ node: n, profundidade, temFilhos: filhos.length > 0 })
      if (filhos.length > 0 && (expandidoEfetivo(n.id) || buscaUp)) {
        montarLinhas(filhos, profundidade + 1)
      }
    })
  }
  montarLinhas(raizes, 0)
  // Com busca ativa, remove linhas de nós que nem são match nem ancestrais de match
  // (a recursão acima ainda pode ter incluído irmãos sem match dentro de um pai expandido)
  const linhasVisiveis = buscaUp
    ? linhas.filter(l => l.node.nome.toUpperCase().includes(buscaUp) || ancestraisDeMatches.has(l.node.id))
    : linhas

  // Seletor de Curso: só estreita quais colunas aparecem, não mexe nas linhas
  const cursosExibidos = filtroCurso ? cursos.filter(c => c.id === filtroCurso) : cursos

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cargo..."
            className="text-xs pl-8 pr-7 py-2 border border-slate-200 rounded-md font-medium text-slate-700 w-full focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={filtroCurso}
          onChange={e => setFiltroCurso(e.target.value)}
          className="text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-700 bg-white min-w-56 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <option value="">Todos os cursos</option>
          {cursos.map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setExpandedIds(organograma.filter(n => (filhosPorPai[n.id] || []).length > 0).map(n => n.id))}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Expandir tudo
        </button>
        <button
          type="button"
          onClick={() => setExpandedIds([])}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Minimize2 className="h-3.5 w-3.5" /> Recolher tudo
        </button>
        {canEdit && (
          <button onClick={() => setModalImportarAberto(true)} className="flex items-center gap-2 whitespace-nowrap bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors ml-auto">
            <Upload className="h-4 w-4 shrink-0" /> Importar Organograma
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 border border-emerald-700">
            <Check className="h-3 w-3 text-white" />
          </span>
          Obrigatório
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 border border-slate-400">
            <Check className="h-3 w-3 text-slate-700" />
          </span>
          Sugerido
        </span>
        <span className="text-slate-400">— clique na bolinha do curso pra ciclar entre nenhum / obrigatório / sugerido</span>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
        <table className="table-auto text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              <th className="px-3 py-2 min-w-[320px] sticky left-0 bg-slate-50 z-10 align-bottom">Cargo</th>
              {cursosExibidos.map(c => (
                <th key={c.id} title={`${c.nome} — Categoria: ${c.categoria_nome || '—'}`} className="p-0 relative" style={{ width: 42, minWidth: 42, height: 170, verticalAlign: 'bottom' }}>
                  <div
                    className="text-[10px] font-semibold normal-case leading-tight text-slate-500"
                    style={{
                      position: 'absolute', bottom: 10, left: '50%',
                      transform: 'rotate(-90deg)', transformOrigin: 'left bottom',
                      whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis',
                    }}
                  >
                    {c.nome}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
            {linhasVisiveis.length === 0 ? (
              <tr><td colSpan={cursosExibidos.length + 1} className="p-6 text-center text-slate-400">Nenhum cargo encontrado. Importe o organograma pra começar.</td></tr>
            ) : linhasVisiveis.map(({ node, profundidade, temFilhos }) => (
              <tr key={node.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-1.5 align-top sticky left-0 bg-white z-10 whitespace-nowrap">
                  <div className="flex items-center gap-1" style={{ paddingLeft: profundidade * 18 }}>
                    {temFilhos ? (
                      <button type="button" onClick={() => toggleExpandido(node.id)} className="p-0.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0">
                        {expandidoEfetivo(node.id) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      <span className="w-[18px] shrink-0" />
                    )}
                    <span className="font-bold text-slate-800">{node.nome}</span>
                    {node.headcount > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-slate-400 shrink-0">
                        <Users2 className="h-3 w-3" /> {node.headcount}
                      </span>
                    )}
                  </div>
                </td>
                {cursosExibidos.map(c => {
                  const estado = vinculos[node.id]?.[c.id]
                  const chave = `${node.id}:${c.id}`
                  return (
                    <td key={c.id} className="p-1 text-center align-middle">
                      <button
                        type="button"
                        disabled={!canEdit || salvandoCel === chave}
                        onClick={() => toggleVinculo(node, c)}
                        title={`${node.nome} — ${estado === 'OBR' ? 'Obrigatório' : estado === 'SUG' ? 'Sugerido' : 'Não vinculado'}: ${c.nome}`}
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-colors disabled:cursor-not-allowed ${
                          estado === 'OBR' ? 'bg-emerald-600 border-emerald-700' :
                          estado === 'SUG' ? 'bg-slate-300 border-slate-400' :
                          'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {estado && <Check className={`h-3 w-3 ${estado === 'OBR' ? 'text-white' : 'text-slate-700'}`} />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalImportarAberto && (
        <ImportarOrganogramaModal
          organograma={organograma}
          onClose={() => setModalImportarAberto(false)}
          onImported={() => { loadDados(); onAlterado?.() }}
        />
      )}
    </div>
  )
}
