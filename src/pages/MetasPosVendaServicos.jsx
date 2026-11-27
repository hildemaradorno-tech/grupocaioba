import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessionState, useLimparSessaoAoEntrar } from '../hooks/useSessionState'
import { Cog, AlertTriangle } from 'lucide-react'
import { apiService } from '../services/api'
import { EmpresaMultiFilter, empresaParam, filtrarPorEmpresas, useEscopoEmpresasMetas, useFiltroEmpresaEfetivo } from '../components/EmpresaMultiFilter'
import { useAuth } from '../context/AuthContext'
import { linhaPendente } from '../utils/totalPosVendas'
import { valoresMetaMecanico } from '../utils/metasMecanico'
import MetasServicosMecanico from './MetasServicosMecanico'
import MetasServicosConsultor from './MetasServicosConsultor'
import MetasPecas from './MetasPecas'
import MetasPosVendaTotal from './MetasPosVendaTotal'

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 7 }, (_, i) => anoAtual - 1 + i)
const SEL = 'border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'

// Cada aba é uma permissão própria no Grupo de Acessos (menuTree: Planejamento de Metas › Pós-Vendas).
const ABAS = [
  { key: 'mecanico',     label: 'Mecânico',  perm: 'metas/pos-vendas/servicos_pecas/aba-mecanico' },
  { key: 'consultor',    label: 'Consultor', perm: 'metas/pos-vendas/servicos_pecas/aba-consultor' },
  { key: 'pecas',        label: 'Peças',     perm: 'metas/pos-vendas/servicos_pecas/aba-pecas' },
  { key: 'total',        label: 'Total',     perm: 'metas/pos-vendas/servicos_pecas/aba-total' },
  { key: 'grupo',        label: 'Grupo',     perm: 'metas/pos-vendas/servicos_pecas/aba-grupo' },
]

// Filtros que voltam ao padrão (nada filtrado/selecionado) toda vez que se entra na tela — de todas as abas.
const FILTROS_POS_VENDAS = [
  'mpvs_servicos_empresas', 'mpvs_servicos_ano', 'mpvs_servicos_visu', 'mpvs_servicos_meses',
  'msm_mecanico', 'msm_setor', 'msm_box',
  'msc_setor', 'msc_consultor',
  'mpc_setor', 'mpc_box', 'mpc_colab',
  'mpvt_depto', 'mpvt_setor', 'mpvt_box', 'mpvt_colab',
]

export default function MetasPosVendaServicos() {
  useLimparSessaoAoEntrar(FILTROS_POS_VENDAS)
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [abaSalva, setAba] = useSessionState('mpvs_aba', 'mecanico')
  // Aba salva que não existe mais (ex.: Total Oficina, removida) volta para a primeira.
  const abasLiberadas = ABAS.filter(a => hasPermission(a.perm))
  const aba = abasLiberadas.some(a => a.key === abaSalva) ? abaSalva : (abasLiberadas[0]?.key || null)

  // Empresa e Ano ficam aqui (mesma chave usada pelas 4 abas) e valem pra todas juntas.
  // filtroEmpresaSel = o que está marcado no seletor; filtroEmpresa = o que vale nos dados (só as empresas
  // liberadas no grupo de acesso — "Todas" = todas as permitidas). Administrador vê tudo.
  const [filtroEmpresaSel, setFiltroEmpresa] = useSessionState('mpvs_servicos_empresas', [])
  const [filtroAno,     setFiltroAno]     = useSessionState('mpvs_servicos_ano', anoAtual)
  // Total/Peças/Serviços — mesma chave usada por Mecânico, Consultor e Total.
  const [filtroVisu,    setFiltroVisu]    = useSessionState('mpvs_servicos_visu', 'total')
  const [empresas,      setEmpresas]      = useState([])
  const [empresasCarregadas, setEmpresasCarregadas] = useState(false)
  const { restrito, listar } = useEscopoEmpresasMetas()
  const filtroEmpresa = useFiltroEmpresaEfetivo(filtroEmpresaSel, empresas)
  // Botão "+ Adicionar X" — cada aba registra o seu (Peças/Mecânico/Consultor têm; Total não tem).
  const [botaoAcao,     setBotaoAcao]     = useState(null)
  // Pendências de aprovação (Empresa/Ano filtrados) — mesmo critério da Gestão de Aprovação
  // (valor gravado difere do último aprovado, ou nunca foi aprovado).
  const [pendentes,     setPendentes]     = useState(0)

  useEffect(() => {
    apiService.getEmpresas()
      .then(emps => setEmpresas([...listar(emps)].sort((a, b) => (a.empresa_fantasia || '').localeCompare(b.empresa_fantasia || ''))))
      .catch(() => {})
      .finally(() => setEmpresasCarregadas(true))
  }, [listar])

  useEffect(() => {
    let cancelado = false
    const checarPendencias = async () => {
      try {
        const [mec, cons, pecas] = await Promise.all([
          apiService.getMetasMecanico(empresaParam(filtroEmpresa), filtroAno),
          apiService.getMetasConsultor(empresaParam(filtroEmpresa), filtroAno),
          apiService.getMetasPecas(empresaParam(filtroEmpresa), filtroAno),
        ])
        const contarMec = filtrarPorEmpresas(mec, filtroEmpresa).filter(r => {
          const { meta_servicos, meta_pecas } = valoresMetaMecanico(r)
          return linhaPendente(meta_servicos + meta_pecas, r.meta_aprovada)
        }).length
        const contarSimples = (rows) => filtrarPorEmpresas(rows, filtroEmpresa)
          .filter(r => linhaPendente(Number(r.meta_faturamento) || 0, r.meta_aprovada)).length
        if (!cancelado) setPendentes(contarMec + contarSimples(cons) + contarSimples(pecas))
      } catch { /* non-fatal */ }
    }
    checarPendencias()
    return () => { cancelado = true }
  }, [filtroEmpresa, filtroAno])

  return (
    <div className="flex flex-col h-full">
      {/* Título da página + Empresa / Ano */}
      <div className="flex items-center justify-between gap-3 bg-white px-6 pt-5 pb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Cog size={24} className="text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">Planejamento de Metas - Pós-Vendas</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-96"><EmpresaMultiFilter value={filtroEmpresaSel.filter(id => empresas.some(e => e.id === id))} onChange={setFiltroEmpresa} empresas={empresas} /></div>
          <select value={filtroAno} onChange={e => setFiltroAno(Number(e.target.value))} className={SEL}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {pendentes > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 px-6 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <span>
            <strong>{pendentes}</strong> {pendentes === 1 ? 'lançamento aguardando' : 'lançamentos aguardando'} aprovação
            {filtroEmpresa.length === 1 ? ' nesta empresa' : ''} em {filtroAno}.
          </span>
          {hasPermission('metas/gestao-aprovacao') && (
            <button onClick={() => navigate('/metas/gestao-aprovacao')} className="ml-auto font-semibold text-amber-900 hover:underline whitespace-nowrap">
              Ir para Gestão de Aprovação →
            </button>
          )}
        </div>
      )}

      {/* Abas + Total/Peças/Serviços + botão de ação da aba, tudo na mesma linha quando cabe; em telas
          estreitas o grupo da direita quebra pra uma 2ª linha (nunca fica escondido ou cortado). */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 pt-1 gap-3 flex-wrap">
        <div className="flex gap-1 shrink-0">
          {abasLiberadas.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px whitespace-nowrap ${
                aba === key
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pb-2 shrink-0">
          {aba !== 'pecas' && (
            <div className="flex rounded-lg border border-slate-300 overflow-hidden text-xs font-semibold shrink-0">
              {[
                { key: 'total',    label: 'Total' },
                { key: 'pecas',    label: 'Peças' },
                { key: 'servicos', label: 'Serviços' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setFiltroVisu(key)}
                  className={`px-3 py-2 transition-colors whitespace-nowrap ${filtroVisu === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {botaoAcao}
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {restrito && empresasCarregadas && empresas.length === 0 && (
          <div className="m-6 flex items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-white">
            Nenhuma empresa está liberada para o seu grupo de acesso (Grupos de Acessos › Acesso por Empresa).
          </div>
        )}
        {!aba && (
          <div className="m-6 flex items-center justify-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl bg-white">
            Nenhuma aba do Planejamento de Metas - Pós-Vendas está liberada para o seu grupo de acesso.
          </div>
        )}
        {aba === 'mecanico'     && <MetasServicosMecanico empresaExterna={filtroEmpresa} anoExterno={filtroAno} filtroVisuExterno={filtroVisu} setFiltroVisuExterno={setFiltroVisu} aoDefinirBotaoAcao={setBotaoAcao} />}
        {aba === 'consultor'    && <MetasServicosConsultor empresaExterna={filtroEmpresa} anoExterno={filtroAno} filtroVisuExterno={filtroVisu} setFiltroVisuExterno={setFiltroVisu} aoDefinirBotaoAcao={setBotaoAcao} />}
        {aba === 'pecas'        && <MetasPecas empresaExterna={filtroEmpresa} anoExterno={filtroAno} aoDefinirBotaoAcao={setBotaoAcao} />}
        {aba === 'total'        && <MetasPosVendaTotal empresasExterno={filtroEmpresa} anoExterno={filtroAno} filtroVisuExterno={filtroVisu} setFiltroVisuExterno={setFiltroVisu} />}
        {aba === 'grupo'        && <MetasPosVendaTotal visao="grupoDAF" empresasExterno={filtroEmpresa} anoExterno={filtroAno} filtroVisuExterno={filtroVisu} setFiltroVisuExterno={setFiltroVisu} />}
      </div>
    </div>
  )
}
