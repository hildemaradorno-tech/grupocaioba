import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { ClipboardList, Download, ChevronDown, Save, AlertTriangle, Building2, ShieldAlert, Trash2, Calendar, User, Banknote, Search, XCircle, X } from 'lucide-react'
import { apiService } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
const primeiroUltimoNome = (nome) => {
  if (!nome) return '—'
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 2) return nome
  return `${partes[0]} ${partes[partes.length - 1]}`
}

const diasOficina = (criacao, auditoria) => {
  if (!criacao || !auditoria) return null
  return Math.floor((new Date(auditoria + 'T12:00:00') - new Date(criacao + 'T12:00:00')) / 86400000)
}

export default function AuditoriaOsAberto() {
  const { user, isAdmin, empresasPermitidas } = useAuth()
  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

  // ── Listas de apoio ──
  const [empresas, setEmpresas] = useState([])
  const [responsaveis, setResponsaveis] = useState([])
  const [situacoes, setSituacoes] = useState([])

  // ── Filtro e seleção de auditoria ──
  const [filtroEmpresaId, setFiltroEmpresaId] = useState('')
  const [auditorias, setAuditorias] = useState([])
  const [auditoriaId, setAuditoriaId] = useState('')
  const [rows, setRows] = useState([])

  // ── Estado ──
  const [loading, setLoading] = useState(false)
  const [importando, setImportando] = useState(false)
  const [erro, setErro] = useState(null)

  // ── Modal de detalhe da OS (Situação / Observação / Dt. Previsão) ──
  const [modalDetalheRow, setModalDetalheRow] = useState(null)
  const [formDetalhe, setFormDetalhe] = useState({ situacao_id: '', observacao: '', data_previsao: '' })
  const [salvandoDetalhe, setSalvandoDetalhe] = useState(false)

  // ── Modal de importação ──
  const [modalImportar, setModalImportar] = useState(false)
  const [responsavelImportId, setResponsavelImportId] = useState('')

  // ── Modal de exclusão da auditoria ──
  const [modalExcluir, setModalExcluir] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // ── Busca por Nº OS / Placa / Chassi ──
  const [buscaOs, setBuscaOs] = useState('')

  const loadApoio = useCallback(async () => {
    const [emps, resp, sit, auds] = await Promise.all([
      apiService.getEmpresas(),
      apiService.getAuditoriaResponsaveis(),
      apiService.getAuditoriaSituacoes(),
      apiService.getAuditorias(),
    ])
    const empsFiltradas = isAdmin ? emps : emps.filter(e => empresasPermitidas.has(e.id))
    setEmpresas(empsFiltradas)
    const respAtivos = resp.filter(r => r.ativo)
    setResponsaveis(respAtivos)
    setSituacoes(sit.filter(s => s.ativo))
    setAuditorias(auds)
    return { emps: empsFiltradas, respAtivos }
  }, [isAdmin, empresasPermitidas])

  useEffect(() => { loadApoio() }, [loadApoio])

  // Auditorias filtradas pela empresa selecionada
  const auditoriasFiltradas = useMemo(() => {
    if (!filtroEmpresaId) return auditorias
    const emp = empresas.find(e => e.id === filtroEmpresaId)
    if (!emp) return auditorias
    return auditorias.filter(a =>
      a.empresa_nome === emp.nome_empresa || a.empresa_nome === emp.nome_empresa_sistema
    )
  }, [auditorias, filtroEmpresaId, empresas])

  // Quando empresa muda, limpa auditoria se não pertence a ela
  useEffect(() => {
    if (!auditoriaId) return
    const ainda = auditoriasFiltradas.find(a => a.id === auditoriaId)
    if (!ainda) setAuditoriaId('')
  }, [auditoriasFiltradas])

  const loadRows = useCallback(async (id) => {
    if (!id) { setRows([]); return }
    setLoading(true)
    try { setRows(await apiService.getAuditoriaOs(id)) }
    catch (e) { setErro(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadRows(auditoriaId); setBuscaOs('')
  }, [auditoriaId, loadRows])

  // ── Abre modal de importação ──
  const handleAbrirImport = () => {
    if (!filtroEmpresaId) { setErro('Selecione uma empresa antes de importar.'); return }
    setResponsavelImportId('')
    setModalImportar(true)
  }

  // ── Importar (chamado após confirmar no modal) ──
  const handleImportar = async () => {
    const empSel = empresas.find(e => e.id === filtroEmpresaId)
    if (!empSel) return
    const respSel = responsaveis.find(r => r.id === responsavelImportId)

    setModalImportar(false)
    setImportando(true); setErro(null)
    try {
      const r = await fetch(`${BACKEND}/api/garantias/sharepoint/aberta`)
      const data = r.ok ? await r.json() : { rows: [] }
      const spTodos = Array.isArray(data) ? data : (data.rows ?? [])
      if (!Array.isArray(spTodos)) { setErro('Resposta inválida do servidor.'); return }

      // Filtra apenas OS da empresa selecionada
      const nomeExibicao = empSel.nome_empresa_sistema || empSel.nome_empresa
      const spRows = spTodos.filter(sp => {
        const n = (sp.empresa_nome || '').toLowerCase()
        return n === (empSel.nome_empresa || '').toLowerCase()
          || n === (empSel.nome_empresa_sistema || '').toLowerCase()
      })

      if (spRows.length === 0) {
        setErro(`Nenhuma OS encontrada para "${nomeExibicao}" no SharePoint.`); return
      }

      const hoje = new Date().toISOString().slice(0, 10)
      const auditoria = await apiService.createAuditoria({
        data_auditoria: hoje,
        importado_por: user?.email || '',
        total_os: spRows.length,
        empresa_id: filtroEmpresaId,
        empresa_nome: nomeExibicao,
      })

      // Pré-preenche responsável em todas as linhas se selecionado
      const linhas = spRows.map(sp => ({
        auditoria_id: auditoria.id,
        data_auditoria: hoje,
        os_numero:           sp.OS_Numero           || sp.os_numero           || '',
        empresa_nome:        sp.Empresa_Nome         || sp.empresa_nome        || '',
        tipo_os_descricao:   sp.TipoOS_Descricao     || sp.tipo_os_descricao   || sp.tipo_os_sigla || '',
        tipo_os_sigla:       sp.TipoOS_Sigla         || sp.tipo_os_sigla       || '',
        consultor_nome:      sp.Consultor_Nome       || sp.consultor_nome      || '',
        proprietario_veiculo: sp.Proprietario_Veiculo      || sp.proprietario_veiculo || '',
        veiculo_modelo:      sp.modelo_veiculo || '',
        veiculo_placa:       sp.Veiculo_Placa || sp.veiculo_placa || '',
        veiculo_chassi:      sp.Veiculo_Chassi       || sp.veiculo_chassi      || '',
        data_criacao:        sp.Data_Criacao         || sp.data_criacao        || null,
        total:               sp.Total                || sp.total               || 0,
        produto:             sp.Produto              || sp.produto             || 0,
        servico:             sp.Servico              || sp.servico             || 0,
        responsavel_id:   respSel?.id   || null,
        responsavel_nome: respSel?.nome || null,
        na_oficina:       false,
      }))
      await apiService.createAuditoriaOsLote(linhas)
      await loadApoio()
      setAuditoriaId(auditoria.id)
    } catch (e) { setErro(e.message || String(e)) }
    finally { setImportando(false) }
  }

  // ── Modal de detalhe da OS (Situação / Observação / Dt. Previsão) — abre ao clicar na linha ──
  const abrirModalDetalhe = (row) => {
    setModalDetalheRow(row)
    setFormDetalhe({
      situacao_id: row.situacao_id || '',
      observacao: row.observacao || '',
      data_previsao: row.data_previsao || '',
    })
  }

  const fecharModalDetalhe = () => {
    setModalDetalheRow(null)
    setFormDetalhe({ situacao_id: '', observacao: '', data_previsao: '' })
  }

  const detalheValido = formDetalhe.situacao_id.trim() !== '' && formDetalhe.observacao.trim() !== '' && formDetalhe.data_previsao.trim() !== ''

  const handleSalvarDetalhe = async () => {
    if (!modalDetalheRow) return
    if (!detalheValido) { setErro('Preencha Situação, Observação e Dt. Previsão antes de salvar.'); return }
    setSalvandoDetalhe(true)
    try {
      const sit = situacoes.find(s => s.id === formDetalhe.situacao_id)
      const payload = {
        situacao_id: formDetalhe.situacao_id || null,
        situacao_nome: sit?.nome || null,
        observacao: formDetalhe.observacao || null,
        data_previsao: formDetalhe.data_previsao || null,
      }
      await apiService.updateAuditoriaOsItem(modalDetalheRow.id, payload, user?.email || '')
      setRows(prev => prev.map(r => r.id === modalDetalheRow.id ? { ...r, ...payload } : r))
      fecharModalDetalhe()
    } catch (e) { setErro(e.message || String(e)) }
    finally { setSalvandoDetalhe(false) }
  }

  // ── Muda "Na Oficina" (Sim/Não) — salva na hora, sem precisar clicar em Salvar ──
  const handleMudarNaOficina = async (row, valor) => {
    const anterior = row.na_oficina
    if (anterior === valor) return
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, na_oficina: valor } : r))
    try {
      await apiService.updateAuditoriaOsItem(row.id, { na_oficina: valor }, user?.email || '')
    } catch (e) {
      setErro(e.message || String(e))
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, na_oficina: anterior } : r))
    }
  }

  const handleExcluirAuditoria = async () => {
    setExcluindo(true); setErro(null)
    try {
      await apiService.deleteAuditoria(auditoriaId)
      setAuditoriaId('')
      setRows([])
      setPendentes({})
      setModalExcluir(false)
      await loadApoio()
    } catch (e) { setErro(e.message || String(e)); setModalExcluir(false) }
    finally { setExcluindo(false) }
  }

  const auditoriaAtual = useMemo(() => auditorias.find(a => a.id === auditoriaId), [auditorias, auditoriaId])
  const totalValorOS = useMemo(() => rows.reduce((acc, r) => acc + (Number(r.total) || 0), 0), [rows])

  const rowsFiltradas = useMemo(() => {
    const q = buscaOs.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r =>
      String(r.os_numero || '').toLowerCase().includes(q) ||
      String(r.veiculo_placa || '').toLowerCase().includes(q) ||
      String(r.veiculo_chassi || '').toLowerCase().includes(q)
    )
  }, [rows, buscaOs])

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            Auditoria O.S. Aberta
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Selecione a empresa, importe as OS do SharePoint e acompanhe por auditoria.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAbrirImport}
            disabled={importando || !filtroEmpresaId}
            title={!filtroEmpresaId ? 'Selecione uma empresa antes de importar' : ''}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className={`h-4 w-4 ${importando ? 'animate-bounce' : ''}`} />
            {importando ? 'Importando...' : 'Inserir Auditoria'}
          </button>
        </div>
      </div>

      {/* ERRO */}
      {erro && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700 font-semibold">{erro}</p>
          <button onClick={() => setErro(null)} className="ml-auto text-red-400 hover:text-red-600 text-xs">✕</button>
        </div>
      )}

      {/* FILTROS — Empresa + Auditoria */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-end gap-4 flex-wrap">

          {/* Empresa */}
          <div className="flex flex-col gap-1 min-w-[260px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Empresa
            </label>
            <div className="relative">
              <select
                value={filtroEmpresaId}
                onChange={e => { setFiltroEmpresaId(e.target.value); setAuditoriaId('') }}
                className="w-full text-xs p-2 pr-8 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none font-semibold"
              >
                <option value="">— Selecione uma empresa —</option>
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome_empresa_sistema || e.nome_empresa}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Auditoria */}
          <div className="flex flex-col gap-1 min-w-[300px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Data da Auditoria</label>
            <div className="relative">
              <select
                value={auditoriaId}
                onChange={e => setAuditoriaId(e.target.value)}
                disabled={!filtroEmpresaId}
                className="w-full text-xs p-2 pr-8 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">— Selecione uma auditoria —</option>
                {auditoriasFiltradas.map(a => (
                  <option key={a.id} value={a.id}>
                    {fmtDate(a.data_auditoria)} — {a.total_os} OS
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
            {filtroEmpresaId && auditoriasFiltradas.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">Nenhuma auditoria para esta empresa. Clique em "Inserir Auditoria".</p>
            )}
          </div>

          {/* Info auditoria selecionada + botão excluir */}
          {auditoriaAtual && (
            <div className="flex items-center gap-4 text-xs text-slate-500 pb-0.5 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-700">{fmtDate(auditoriaAtual.data_auditoria)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-700">{auditoriaAtual.total_os}</strong> OS
              </span>
              {!loading && rows.length > 0 && (
                <span className="flex items-center gap-1">
                  <Banknote className="h-3.5 w-3.5 text-slate-400" />
                  <strong className="text-slate-700">{fmt(totalValorOS)}</strong>
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {auditoriaAtual.importado_por || '—'}
              </span>
              <button
                onClick={() => setModalExcluir(true)}
                className="flex items-center gap-1 ml-2 px-2.5 py-1 rounded-md text-[10px] font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3 w-3" />
                Excluir auditoria
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BUSCA */}
      {auditoriaId && rows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm px-4 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={buscaOs}
              onChange={e => setBuscaOs(e.target.value)}
              placeholder="Buscar por Nº OS, placa ou chassi..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 outline-none"
            />
            {buscaOs && (
              <button
                onClick={() => setBuscaOs('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                title="Limpar busca"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* TABELA */}
      {auditoriaId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto custom-scrollbar-light">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Carregando OS da auditoria...</div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">Nenhuma OS nesta auditoria.</div>
          ) : rowsFiltradas.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400">
              Nenhuma OS encontrada para "{buscaOs.trim()}".
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-3 whitespace-nowrap text-center w-14">Auto</th>
                  <th className="p-3 whitespace-nowrap">Dt. Criação</th>
                  <th className="p-3 whitespace-nowrap text-center">Dias Oficina</th>
                  <th className="p-3 whitespace-nowrap">Nº OS</th>
                  <th className="p-3 whitespace-nowrap">Placa</th>
                  <th className="p-3 whitespace-nowrap">Chassi</th>
                  <th className="p-3 whitespace-nowrap text-center w-28">Na Oficina</th>
                  <th className="p-3 whitespace-nowrap">Consultor</th>
                  <th className="p-3 whitespace-nowrap min-w-[320px]">Proprietário</th>
                  <th className="p-3 whitespace-nowrap min-w-[160px]">Modelo</th>
                  <th className="p-3 whitespace-nowrap min-w-[180px]">Tipo OS</th>
                  <th className="p-3 whitespace-nowrap text-right">Total</th>
                  <th className="p-3 whitespace-nowrap min-w-[160px]">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {rowsFiltradas.map(row => {
                  return (
                    <tr
                      key={row.id}
                      onClick={() => abrirModalDetalhe(row)}
                      className="transition-colors hover:bg-slate-50/70 cursor-pointer"
                    >
                      {/* Auto — P (vermelho) quando dias >= 30 ou Na Oficina = Não */}
                      <td className="p-3 text-center">
                        {(() => {
                          const d = diasOficina(row.data_criacao, row.data_auditoria)
                          const isPen = (d !== null && d >= 30) || row.na_oficina === false
                          return isPen
                            ? <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">P</span>
                            : <span className="text-slate-300 text-[10px]">—</span>
                        })()}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-500">{fmtDate(row.data_criacao)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(() => {
                          const d = diasOficina(row.data_criacao, row.data_auditoria)
                          if (d === null) return <span className="text-slate-300">—</span>
                          const cls = d >= 30 ? 'bg-red-100 text-red-700' : d >= 20 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                          return <span className={`inline-flex px-2 py-0.5 rounded font-bold text-[11px] ${cls}`}>{d}d</span>
                        })()}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">{row.os_numero || '—'}</td>
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap font-semibold">{row.veiculo_placa || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{row.veiculo_chassi || '—'}</td>

                      {/* Na Oficina */}
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <select
                          value={row.na_oficina === true ? 'sim' : row.na_oficina === false ? 'nao' : ''}
                          onChange={e => {
                            const v = e.target.value === 'sim' ? true : e.target.value === 'nao' ? false : null
                            handleMudarNaOficina(row, v)
                          }}
                          className={`text-xs p-1 border rounded-md focus:ring-2 focus:ring-indigo-500/20 w-20 font-semibold ${
                            row.na_oficina === true ? 'bg-green-100 border-green-300 text-green-700'
                            : row.na_oficina === false ? 'bg-red-100 border-red-300 text-red-700'
                            : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="">—</option>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </td>

                      <td className="p-3 whitespace-nowrap text-slate-600">{primeiroUltimoNome(row.consultor_nome)}</td>
                      <td className="p-3 text-slate-700">{row.proprietario_veiculo || '—'}</td>
                      <td className="p-3 text-slate-600">{row.veiculo_modelo || '—'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-600">{row.tipo_os_descricao || row.tipo_os_sigla || '—'}</td>
                      <td className="p-3 text-right whitespace-nowrap font-semibold text-slate-900">{row.total > 0 ? fmt(row.total) : '—'}</td>

                      {/* Responsável — somente leitura, definido no import */}
                      <td className="p-3">
                        <span className="text-xs text-slate-600 font-semibold">
                          {row.responsavel_nome || <span className="text-slate-300 font-normal">—</span>}
                        </span>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {auditoriaId && !loading && (
        <p className="text-[10px] text-slate-400">
          {rowsFiltradas.length} de {rows.length} OS — auditoria de {auditoriaAtual ? fmtDate(auditoriaAtual.data_auditoria) : ''}
          {auditoriaAtual?.empresa_nome ? ` · ${auditoriaAtual.empresa_nome}` : ''}
        </p>
      )}

      {!auditoriaId && !filtroEmpresaId && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-16 flex flex-col items-center gap-3">
          <div className="p-3 bg-slate-100 rounded-full">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Selecione uma empresa para começar</p>
          <p className="text-xs text-slate-400">Depois escolha uma auditoria existente ou importe novas OS.</p>
        </div>
      )}

      {/* MODAL EXCLUIR AUDITORIA */}
      {modalExcluir && auditoriaAtual && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[420px] shadow-xl overflow-hidden">
            <div className="p-5 flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-full shrink-0">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Excluir Auditoria</h3>
                <p className="text-xs text-slate-500">
                  Confirma a exclusão da auditoria de <strong className="text-slate-700">{fmtDate(auditoriaAtual.data_auditoria)}</strong>
                  {auditoriaAtual.empresa_nome ? ` — ${auditoriaAtual.empresa_nome}` : ''}?
                </p>
                <p className="text-xs text-red-600 font-semibold mt-1">
                  Todas as {auditoriaAtual.total_os} OS e edições serão removidas permanentemente.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalExcluir(false)}
                disabled={excluindo}
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluirAuditoria}
                disabled={excluindo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO */}
      {modalImportar && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-slate-200 w-[440px] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full shrink-0">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Importar OS do SharePoint</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Empresa: <strong className="text-slate-700">{(() => { const e = empresas.find(e => e.id === filtroEmpresaId); return e?.nome_empresa_sistema || e?.nome_empresa })()}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  Responsável pela Auditoria
                </label>
                <div className="relative">
                  <select
                    value={responsavelImportId}
                    onChange={e => setResponsavelImportId(e.target.value)}
                    className="w-full text-xs p-2.5 pr-8 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white appearance-none"
                  >
                    <option value="">— Sem responsável definido —</option>
                    {responsaveis.map(r => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                </div>
                <p className="text-[10px] text-slate-400">
                  O responsável será pré-preenchido em todas as OS importadas. Pode ser alterado individualmente depois.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setModalImportar(false)}
                className="px-4 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Confirmar Importação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHE DA OS — Situação / Observação / Dt. Previsão */}
      {modalDetalheRow && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-md shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">OS {modalDetalheRow.os_numero}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Situação, observação e data de previsão.</p>
              </div>
              <button onClick={fecharModalDetalhe} className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Situação <span className="text-red-500">*</span></label>
                <select
                  value={formDetalhe.situacao_id}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, situacao_id: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {situacoes.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Observação <span className="text-red-500">*</span></label>
                <textarea
                  value={formDetalhe.observacao}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, observacao: e.target.value }))}
                  placeholder="Observação..."
                  rows={3}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Dt. Previsão <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={formDetalhe.data_previsao}
                  onChange={e => setFormDetalhe(prev => ({ ...prev, data_previsao: e.target.value }))}
                  className="w-full text-xs p-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {!detalheValido && (
                <p className="text-[10px] text-amber-600 font-semibold">Preencha todos os campos para poder salvar.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={fecharModalDetalhe}
                disabled={salvandoDetalhe}
                className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarDetalhe}
                disabled={salvandoDetalhe || !detalheValido}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors disabled:opacity-40"
              >
                <Save className={`h-3.5 w-3.5 ${salvandoDetalhe ? 'animate-spin' : ''}`} />
                {salvandoDetalhe ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
