import React, { useEffect, useState, useMemo } from 'react'
import { PhoneCall, Plus, X, AlertTriangle, Loader2, Edit2, Trash2, Settings2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiService } from '../services/api'

const SEL = 'text-xs p-2 border border-slate-200 rounded-md bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-auto min-w-[180px]'
const INP = 'w-full text-xs p-2 border border-slate-200 rounded-md font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
const LBL = 'text-[11px] font-bold text-slate-500 uppercase tracking-wide'

const fmtBRL = (v) => (v != null && v !== '') ? parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
const fmtDate = (v) => {
  if (!v) return '-'
  const [y, m, d] = String(v).split('-')
  return `${d}/${m}/${y}`
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const mesRefDe = (data) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-01`

const FORM_VAZIO = { funcionario_id: '', data_inicio: '', data_fim: '', deslocamentos: '', cliente_atendido: '' }

// Dias corridos entre Data Início e Data Fim, incluindo os dois extremos (ex: 01/09 a 03/09 = 3
// dias) — mesmo critério de "dias corridos" usado no RH, sem descontar fim de semana/feriado.
const diasCorridos = (inicio, fim) => {
  if (!inicio || !fim) return 0
  const d1 = new Date(`${inicio}T00:00:00`)
  const d2 = new Date(`${fim}T00:00:00`)
  const dias = Math.round((d2 - d1) / 86400000) + 1
  return dias > 0 ? dias : 0
}

export default function SobreavisoPlantao() {
  const { hasAction } = useAuth()
  const canEditar = hasAction('sobreaviso-plantao', 'editar')
  const canExcluir = hasAction('sobreaviso-plantao', 'excluir')
  const canConfigurar = hasAction('sobreaviso-plantao', 'configurar_valores')

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [funcionarios, setFuncionarios] = useState([])
  const [config, setConfig] = useState(null)
  const [lancamentos, setLancamentos] = useState([])
  // Vem pré-selecionado com o mês anterior — é o mês recém-fechado, mesmo padrão já usado como
  // período padrão em Cálculo de Comissões e Processamento de Comissões.
  const [mesReferencia, setMesReferencia] = useState(() => {
    const hoje = new Date()
    return mesRefDe(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1))
  })

  const [formConfig, setFormConfig] = useState({ valor_dia_sobreaviso: '', valor_deslocamento: '' })
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [erroConfig, setErroConfig] = useState(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(FORM_VAZIO)
  const [erroModal, setErroModal] = useState(null)
  const [salvando, setSalvando] = useState(false)

  // Confirmação de exclusão em modal próprio — não usa window.confirm(), que fica
  // desabilitado em alguns navegadores/webviews (ex: preview embutido do Claude).
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState(null)

  const loadBase = async () => {
    setLoading(true)
    setErro(null)
    // Funcionários e config vêm de tabelas independentes — uma falhar (ex: migração da
    // config ainda não rodada) não pode impedir a outra de carregar.
    const [funcsResult, cfgResult] = await Promise.allSettled([
      apiService.getFuncionarios(),
      apiService.getSobreavisoConfig(),
    ])
    if (funcsResult.status === 'fulfilled') {
      setFuncionarios(
        funcsResult.value.filter(f => f.ativo !== false)
          .sort((a, b) => a.nome_funcionario.localeCompare(b.nome_funcionario, 'pt-BR'))
      )
    }
    if (cfgResult.status === 'fulfilled') {
      const cfg = cfgResult.value
      setConfig(cfg)
      setFormConfig({
        valor_dia_sobreaviso: parseFloat(cfg.valor_dia_sobreaviso).toFixed(2),
        valor_deslocamento: parseFloat(cfg.valor_deslocamento).toFixed(2),
      })
    }
    const erros = [funcsResult, cfgResult].filter(r => r.status === 'rejected').map(r => r.reason?.message || String(r.reason))
    if (erros.length > 0) setErro('Erro ao carregar dados: ' + erros.join(' | '))
    setLoading(false)
  }

  const loadLancamentos = async (mes) => {
    try {
      const dados = await apiService.getSobreavisoLancamentos(mes)
      setLancamentos(dados)
    } catch (err) {
      setErro('Erro ao carregar lançamentos: ' + (err.message || String(err)))
    }
  }

  useEffect(() => { loadBase() }, [])
  useEffect(() => { loadLancamentos(mesReferencia) }, [mesReferencia])

  const totalMes = useMemo(() => lancamentos.reduce((acc, l) => acc + Number(l.total || 0), 0), [lancamentos])

  // Últimos 12 meses (incluindo o atual) pra seleção rápida do período de referência.
  const opcoesMes = useMemo(() => {
    const hoje = new Date()
    const lista = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      lista.push({ valor: mesRefDe(d), label: `${MESES[d.getMonth()]}/${d.getFullYear()}` })
    }
    return lista
  }, [])

  const handleSalvarConfig = async (e) => {
    e.preventDefault()
    setErroConfig(null)
    if (!config) { setErroConfig('Configuração ainda não carregada. Recarregue a página.'); return }
    setSalvandoConfig(true)
    try {
      const payload = {
        valor_dia_sobreaviso: parseFloat(formConfig.valor_dia_sobreaviso),
        valor_deslocamento: parseFloat(formConfig.valor_deslocamento),
      }
      const atualizado = await apiService.updateSobreavisoConfig(config.id, payload)
      setConfig(atualizado)
    } catch (err) {
      setErroConfig('Erro ao salvar: ' + (err.message || String(err)))
    } finally {
      setSalvandoConfig(false)
    }
  }

  const abrirNovo = () => {
    setEditandoId(null)
    setForm(FORM_VAZIO)
    setErroModal(null)
    setModalAberto(true)
  }

  const abrirEditar = (l) => {
    setEditandoId(l.id)
    setForm({
      funcionario_id: l.funcionario_id,
      data_inicio: l.data_inicio || '',
      data_fim: l.data_fim || '',
      deslocamentos: l.deslocamentos,
      cliente_atendido: l.cliente_atendido || '',
    })
    setErroModal(null)
    setModalAberto(true)
  }

  const diasCalculados = useMemo(() => diasCorridos(form.data_inicio, form.data_fim), [form.data_inicio, form.data_fim])

  const totalCalculado = useMemo(() => {
    if (!config) return 0
    const desloc = parseFloat(form.deslocamentos) || 0
    return diasCalculados * Number(config.valor_dia_sobreaviso) + desloc * Number(config.valor_deslocamento)
  }, [diasCalculados, form.deslocamentos, config])

  const handleSalvar = async (e) => {
    e.preventDefault()
    setErroModal(null)
    if (!form.funcionario_id) { setErroModal('Selecione o colaborador.'); return }
    if (!form.data_inicio || !form.data_fim) { setErroModal('Informe a Data Início e a Data Fim do sobreaviso.'); return }
    if (form.data_fim < form.data_inicio) { setErroModal('A Data Fim não pode ser antes da Data Início.'); return }
    if (!config) { setErroModal('Configuração de valores ainda não carregada. Recarregue a página.'); return }
    setSalvando(true)
    try {
      const funcionario = funcionarios.find(f => f.id === form.funcionario_id)
      const dias = diasCalculados
      const desloc = parseInt(form.deslocamentos, 10) || 0
      const payload = {
        funcionario_id: form.funcionario_id,
        funcionario_nome: funcionario?.nome_funcionario || '',
        mes_referencia: mesReferencia,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        dias_sobreaviso: dias,
        deslocamentos: desloc,
        cliente_atendido: form.cliente_atendido || null,
        valor_dia_sobreaviso: config.valor_dia_sobreaviso,
        valor_deslocamento: config.valor_deslocamento,
        total: dias * Number(config.valor_dia_sobreaviso) + desloc * Number(config.valor_deslocamento),
      }
      if (editandoId) {
        await apiService.updateSobreavisoLancamento(editandoId, payload)
      } else {
        await apiService.createSobreavisoLancamento(payload)
      }
      await loadLancamentos(mesReferencia)
      setModalAberto(false)
    } catch (err) {
      const msg = /duplicate key|unique constraint/i.test(err.message || '')
        ? 'Já existe um lançamento para esse colaborador neste mês. Edite o lançamento existente.'
        : 'Erro ao salvar: ' + (err.message || String(err))
      setErroModal(msg)
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!confirmandoExclusao) return
    setExcluindo(true)
    setErroExclusao(null)
    try {
      await apiService.deleteSobreavisoLancamento(confirmandoExclusao.id)
      await loadLancamentos(mesReferencia)
      setConfirmandoExclusao(null)
    } catch (err) {
      setErroExclusao('Erro ao excluir: ' + (err.message || String(err)))
    } finally {
      setExcluindo(false)
    }
  }

  if (loading) return <div className="p-6 text-xs text-slate-500">Carregando...</div>

  return (
    <div className="p-6 space-y-4 max-w-[1400px]">

      {/* CABEÇALHO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-blue-600" />
            Sobreaviso/Plantão
          </h1>
          <p className="text-xs text-slate-500">Controle mensal de sobreaviso e deslocamentos por colaborador.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mesReferencia} onChange={e => setMesReferencia(e.target.value)} className={SEL}>
            {opcoesMes.map(o => <option key={o.valor} value={o.valor}>{o.label}</option>)}
          </select>
          {canEditar && (
            <button onClick={abrirNovo} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-md shadow-sm transition-colors">
              <Plus className="h-3.5 w-3.5" /> Novo Lançamento
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erro}
        </div>
      )}

      {/* CONFIGURAÇÃO DE VALORES */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-3">
          <Settings2 className="h-3.5 w-3.5 text-blue-600" /> Configuração de Valores
        </h2>
        {canConfigurar ? (
          <form onSubmit={handleSalvarConfig} className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Valor por dia de sobreaviso (R$)</label>
              <input
                type="number" step="0.01" min="0" required
                value={formConfig.valor_dia_sobreaviso}
                onChange={e => setFormConfig(prev => ({ ...prev, valor_dia_sobreaviso: e.target.value }))}
                className={`${INP} w-40`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LBL}>Valor por deslocamento (R$)</label>
              <input
                type="number" step="0.01" min="0" required
                value={formConfig.valor_deslocamento}
                onChange={e => setFormConfig(prev => ({ ...prev, valor_deslocamento: e.target.value }))}
                className={`${INP} w-40`}
              />
            </div>
            <button type="submit" disabled={salvandoConfig} className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
              {salvandoConfig && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar Valores
            </button>
            {erroConfig && <span className="text-xs text-red-600">{erroConfig}</span>}
          </form>
        ) : (
          <div className="flex flex-wrap gap-6 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-500">Sobreaviso:</span> {fmtBRL(config?.valor_dia_sobreaviso)}/dia</span>
            <span><span className="font-semibold text-slate-500">Deslocamento:</span> {fmtBRL(config?.valor_deslocamento)}/acionamento</span>
          </div>
        )}
      </div>

      {/* TABELA DE LANÇAMENTOS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wide">
              <th className="text-left px-4 py-2.5">Colaborador</th>
              <th className="text-center px-4 py-2.5">Dias Sobreaviso</th>
              <th className="text-center px-4 py-2.5">Deslocamentos</th>
              <th className="text-left px-4 py-2.5">Cliente Atendido/OS</th>
              <th className="text-right px-4 py-2.5">Total R$</th>
              {(canEditar || canExcluir) && <th className="text-center px-4 py-2.5">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {lancamentos.length === 0 && (
              <tr><td colSpan={6} className="text-center px-4 py-6 text-slate-400">Nenhum lançamento neste mês.</td></tr>
            )}
            {lancamentos.map(l => (
              <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{l.funcionario_nome}</td>
                <td className="px-4 py-2.5 text-center">
                  {l.dias_sobreaviso}
                  {l.data_inicio && l.data_fim && (
                    <div className="text-[10px] text-slate-400 font-normal">{fmtDate(l.data_inicio)} a {fmtDate(l.data_fim)}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">{l.deslocamentos}</td>
                <td className="px-4 py-2.5 text-slate-500">{l.cliente_atendido || '-'}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{fmtBRL(l.total)}</td>
                {(canEditar || canExcluir) && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-center gap-2">
                      {canEditar && (
                        <button onClick={() => abrirEditar(l)} className="text-slate-400 hover:text-blue-600">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canExcluir && (
                        <button onClick={() => { setConfirmandoExclusao(l); setErroExclusao(null) }} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {lancamentos.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                <td className="px-4 py-2.5" colSpan={4}>Total do Mês</td>
                <td className="px-4 py-2.5 text-right">{fmtBRL(totalMes)}</td>
                {(canEditar || canExcluir) && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* MODAL: NOVO/EDITAR LANÇAMENTO */}
      {modalAberto && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[480px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-blue-600" />
                {editandoId ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleSalvar}>
              <div className="p-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Colaborador *</label>
                  <select
                    required
                    value={form.funcionario_id}
                    onChange={e => setForm(prev => ({ ...prev, funcionario_id: e.target.value }))}
                    className={`${SEL} w-full`}
                  >
                    <option value="">Selecione o colaborador</option>
                    {funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome_funcionario}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Data Início *</label>
                    <input
                      type="date" required
                      value={form.data_inicio}
                      onChange={e => setForm(prev => ({ ...prev, data_inicio: e.target.value }))}
                      className={INP}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={LBL}>Data Fim *</label>
                    <input
                      type="date" required
                      value={form.data_fim}
                      onChange={e => setForm(prev => ({ ...prev, data_fim: e.target.value }))}
                      className={INP}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <span className={LBL}>Dias Sobreaviso (corridos)</span>
                  <span className="text-sm font-bold text-slate-800">{diasCalculados}</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Deslocamentos</label>
                  <input
                    type="number" min="0" step="1"
                    value={form.deslocamentos}
                    onChange={e => setForm(prev => ({ ...prev, deslocamentos: e.target.value }))}
                    placeholder="0" className={INP}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={LBL}>Cliente Atendido/OS</label>
                  <input
                    type="text"
                    value={form.cliente_atendido}
                    onChange={e => setForm(prev => ({ ...prev, cliente_atendido: e.target.value }))}
                    placeholder="Opcional" className={INP}
                  />
                </div>
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <span className={LBL}>Total calculado</span>
                  <span className="text-sm font-bold text-slate-800">{fmtBRL(totalCalculado)}</span>
                </div>
                {erroModal && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroModal}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setModalAberto(false)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shadow-sm transition-colors">
                  {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {confirmandoExclusao && (
        <div className="fixed top-0 right-0 bottom-0 left-16 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 w-full max-w-[420px] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Excluir Lançamento
              </h3>
              <button onClick={() => setConfirmandoExclusao(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-700">
                Excluir o lançamento de <span className="font-semibold">"{confirmandoExclusao.funcionario_nome}"</span>? Essa ação não pode ser desfeita.
              </p>
              {erroExclusao && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2 text-red-700 text-xs leading-relaxed">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {erroExclusao}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-3 bg-slate-50 border-t border-slate-100">
              <button type="button" onClick={() => setConfirmandoExclusao(null)} className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors">
                Cancelar
              </button>
              <button type="button" onClick={handleExcluir} disabled={excluindo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 shadow-sm transition-colors">
                {excluindo && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
