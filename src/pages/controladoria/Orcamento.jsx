import React, { useEffect, useMemo, useState } from 'react'
import { Save, ChevronLeft, ChevronRight, Info, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { apiService } from '../../services/api'
import { CabecalhoControladoria, INPUT, LABEL } from './ControladoriaNav'

const MENU = 'controladoria/orcamento'
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const SEM_LINHA = '__sem_linha__'
const chave = (contaId, mes) => `${contaId}|${mes}`
const fmt = (v) => (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

export default function Orcamento() {
  const { user, hasActionOrDefault } = useAuth()
  const canEdit = hasActionOrDefault(MENU, 'editar')

  const [ano, setAno] = useState(new Date().getFullYear())
  const [centroId, setCentroId] = useState('')
  const [contas, setContas] = useState([])
  const [linhasDre, setLinhasDre] = useState([])
  const [centros, setCentros] = useState([])
  const [valores, setValores] = useState({}) // chave(conta, mes) -> string digitada
  const [alterado, setAlterado] = useState(false)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null)

  const [carregandoBase, setCarregandoBase] = useState(true)
  const [carregandoValores, setCarregandoValores] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [c, l, cr] = await Promise.all([apiService.getCtbPlanoContas(), apiService.getCtbDreLinhas(), apiService.getCtbCentrosResultado()])
        setContas(c)
        setLinhasDre(l)
        setCentros(cr.filter(x => x.ativo !== false))
      } catch (err) {
        setErro(err.message || String(err))
      } finally {
        setCarregandoBase(false)
      }
    })()
  }, [])

  const carregarValores = async () => {
    setCarregandoValores(true)
    setErro(null)
    setMensagem(null)
    try {
      const dados = await apiService.getCtbOrcamento(ano, centroId || null)
      setValores(Object.fromEntries(dados.map(d => [chave(d.conta_id, d.mes), String(d.valor)])))
      const ultima = dados.reduce((m, d) => (!m || d.atualizado_em > m.atualizado_em ? d : m), null)
      setUltimaAtualizacao(ultima ? { por: ultima.atualizado_por, em: ultima.atualizado_em } : null)
      setAlterado(false)
    } catch (err) {
      setErro(err.message || String(err))
    } finally {
      setCarregandoValores(false)
    }
  }
  useEffect(() => { carregarValores() }, [ano, centroId])

  // Contas analíticas ativas agrupadas pela linha da DRE (na ordem da DRE); sem linha vão no fim.
  const grupos = useMemo(() => {
    const analiticas = contas
      .filter(c => c.tipo === 'ANALITICA' && c.ativo !== false)
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
    const linhasContas = linhasDre.filter(l => l.tipo === 'CONTAS')
    const lista = linhasContas.map(l => ({ id: l.id, titulo: l.descricao, sinal: l.sinal, contas: analiticas.filter(c => c.linha_dre_id === l.id) }))
    const idsLinhas = new Set(linhasContas.map(l => l.id))
    const sem = analiticas.filter(c => !c.linha_dre_id || !idsLinhas.has(c.linha_dre_id))
    if (sem.length > 0) lista.push({ id: SEM_LINHA, titulo: 'Sem linha da DRE', sinal: 1, contas: sem })
    return lista.filter(g => g.contas.length > 0)
  }, [contas, linhasDre])

  const totalConta = (contaId) => MESES.reduce((s, _, i) => s + num(valores[chave(contaId, i + 1)]), 0)
  const totalGrupoMes = (g, mes) => g.contas.reduce((s, c) => s + num(valores[chave(c.id, mes)]), 0)
  const totalGrupo = (g) => g.contas.reduce((s, c) => s + totalConta(c.id), 0)

  const alterar = (contaId, mes, v) => {
    setValores(prev => ({ ...prev, [chave(contaId, mes)]: v }))
    setAlterado(true)
    setMensagem(null)
  }
  // Repete o valor de Jan nos 12 meses da conta (atalho comum de orçamento linear).
  const replicarJaneiro = (contaId) => {
    const v = valores[chave(contaId, 1)] ?? ''
    setValores(prev => {
      const n = { ...prev }
      for (let m = 2; m <= 12; m++) n[chave(contaId, m)] = v
      return n
    })
    setAlterado(true)
  }

  const salvar = async () => {
    setSalvando(true)
    setErro(null)
    setMensagem(null)
    try {
      const itens = Object.entries(valores).map(([k, v]) => {
        const [conta_id, mes] = k.split('|')
        return { conta_id, mes: Number(mes), valor: num(v) }
      })
      const r = await apiService.salvarCtbOrcamento(ano, centroId || null, itens, user?.email || 'desconhecido')
      await carregarValores()
      setMensagem(`Orçamento salvo (${r.qtd} valor(es) gravado(s)).`)
    } catch (err) {
      setErro('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvando(false)
    }
  }

  const trocarFiltro = (fn) => {
    if (alterado && !window.confirm('Há alterações não salvas. Descartar e trocar?')) return
    fn()
  }

  const centroNome = (c) => `${c.codigo} — ${c.descricao}`
  const TH = 'p-2 text-right font-semibold'

  return (
    <div className="p-6 space-y-4">
      <CabecalhoControladoria
        descricao="Orçamento: valor orçado por conta do Plano de Contas, mês a mês, por ano e centro de resultado."
        acao={canEdit && (
          <button onClick={salvar} disabled={!alterado || salvando || carregandoValores}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Salvar Orçamento'}
          </button>
        )}
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={LABEL}>Ano</label>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => trocarFiltro(() => setAno(a => a - 1))} className="p-2 border border-slate-200 rounded-md hover:bg-slate-50"><ChevronLeft className="h-3.5 w-3.5" /></button>
            <span className="w-16 text-center text-sm font-bold text-slate-800">{ano}</span>
            <button type="button" onClick={() => trocarFiltro(() => setAno(a => a + 1))} className="p-2 border border-slate-200 rounded-md hover:bg-slate-50"><ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 w-80">
          <label className={LABEL}>Centro de Resultado</label>
          <select value={centroId} onChange={e => { const v = e.target.value; trocarFiltro(() => setCentroId(v)) }} className={INPUT}>
            <option value="">(Geral — sem centro de resultado)</option>
            {centros.map(c => <option key={c.id} value={c.id}>{centroNome(c)}</option>)}
          </select>
        </div>
        {ultimaAtualizacao && (
          <span className="text-[11px] text-slate-400 pb-2">
            Última atualização: {ultimaAtualizacao.por} em {new Date(ultimaAtualizacao.em).toLocaleString('pt-BR')}
          </span>
        )}
        {alterado && <span className="text-[11px] font-semibold text-amber-600 pb-2">Alterações não salvas</span>}
      </div>

      {erro && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-700 text-xs"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {erro}</div>
      )}
      {mensagem && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-emerald-700 text-xs"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> {mensagem}</div>
      )}

      {carregandoBase ? (
        <div className="text-sm text-slate-500">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-[11px] text-blue-800">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Nenhuma conta analítica ativa no Plano de Contas. Cadastre as contas (e vincule às linhas da DRE) para orçar.
        </div>
      ) : (
        <div className={`bg-white rounded-lg border border-slate-200 shadow-sm overflow-auto max-h-[70vh] ${carregandoValores ? 'opacity-50 pointer-events-none' : ''}`}>
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[11px] uppercase tracking-wider">
                <th className="p-2 text-left font-semibold sticky left-0 bg-slate-50 min-w-[260px]">Conta</th>
                {MESES.map(m => <th key={m} className={`${TH} min-w-[96px]`}>{m}</th>)}
                <th className={`${TH} min-w-[110px] text-slate-600`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {grupos.map(g => (
                <React.Fragment key={g.id}>
                  <tr className="bg-slate-100/70 border-y border-slate-200 font-bold text-slate-800">
                    <td className="p-2 sticky left-0 bg-slate-100">
                      <span className={`font-mono mr-1.5 ${g.sinal === -1 ? 'text-red-500' : 'text-emerald-600'}`}>{g.id === SEM_LINHA ? '' : g.sinal === -1 ? '(-)' : '(+)'}</span>
                      {g.titulo}
                    </td>
                    {MESES.map((_, i) => <td key={i} className="p-2 text-right font-mono">{fmt(totalGrupoMes(g, i + 1))}</td>)}
                    <td className="p-2 text-right font-mono">{fmt(totalGrupo(g))}</td>
                  </tr>
                  {g.contas.map(c => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="p-2 sticky left-0 bg-white text-slate-700">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate"><span className="font-mono text-slate-400 mr-1.5">{c.codigo}</span>{c.descricao}</span>
                          {canEdit && (
                            <button type="button" onClick={() => replicarJaneiro(c.id)} title="Repetir o valor de Jan em todos os meses"
                              className="text-[10px] text-blue-600 hover:underline shrink-0">Jan → ano</button>
                          )}
                        </div>
                      </td>
                      {MESES.map((_, i) => (
                        <td key={i} className="p-1">
                          <input
                            type="number"
                            step="0.01"
                            disabled={!canEdit}
                            value={valores[chave(c.id, i + 1)] ?? ''}
                            onChange={e => alterar(c.id, i + 1, e.target.value)}
                            className="w-full text-right font-mono text-xs px-1.5 py-1 border border-transparent hover:border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded disabled:bg-transparent disabled:text-slate-600"
                          />
                        </td>
                      ))}
                      <td className="p-2 text-right font-mono font-semibold text-slate-700">{fmt(totalConta(c.id))}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-slate-400">
        Gravado no Supabase em <code className="font-mono">ctb_orcamento</code> — o Power BI lê pela view <code className="font-mono">vw_ctb_orcamento</code> (com data de competência, conta, linha da DRE, centro de resultado e sistema).
      </p>
    </div>
  )
}
