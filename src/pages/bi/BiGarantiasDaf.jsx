import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, FileText, DollarSign, Receipt, BarChart2, ClipboardList, RefreshCw, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoCaioba from '../../assets/logo-grupo.png'
import EngrenagemRegras from '../garantias-daf/EngrenagemRegras'
import GarantiasOficinaDashboard from '../garantias-daf/GarantiasOficinaDashboard'
import GarantiasAbertoDashboard from '../garantias-daf/GarantiasAbertoDashboard'
import GarantiasTitulosDashboard from '../garantias-daf/GarantiasTitulosDashboard'
import GarantiasDafDashboard from '../garantias-daf/GarantiasDafDashboard'
import GarantiasDafTitulos from '../garantias-daf/GarantiasDafTitulos'
import GarantiasDafFaturadas from '../garantias-daf/GarantiasDafFaturadas'

// Cada aba tem a visão Dashboard (permissão bi/garantias-daf) e a visão Controle (permissão da própria
// aba). Histórico de O.S. só tem Controle.
const ABAS = [
  {
    key: 'oficina', label: 'Na Oficina (Em Aberto)', icon: Activity, permKey: 'garantias-daf-andamento',
    objetivo: 'acompanhar as ordens de serviço de garantia que estão atualmente na oficina, executando o serviço.',
    dashboard: (p) => <GarantiasOficinaDashboard {...p} />,
    controle: (p) => <GarantiasDafDashboard key="andamento" variante="andamento" {...p} />,
  },
  {
    key: 'aberto', label: 'Com Garantista (Em Aberto)', icon: FileText, permKey: 'garantias-daf',
    objetivo: 'acompanhar o andamento das garantias já encerradas na oficina e que já se encontra com o departamento de garantia.',
    dashboard: (p) => <GarantiasAbertoDashboard {...p} />,
    controle: (p) => <GarantiasDafDashboard key="aberto" {...p} />,
  },
  {
    key: 'titulos', label: 'Títulos a Receber (Faturadas)', icon: DollarSign, permKey: 'garantias-daf-titulos',
    objetivo: 'acompanhar os títulos financeiros a receber vinculados às garantias faturadas.',
    dashboard: (p) => <GarantiasTitulosDashboard {...p} />,
    controle: (p) => <GarantiasDafTitulos {...p} />,
  },
  {
    key: 'historico', label: 'Histórico de O.S.', icon: Receipt, permKey: 'garantias-daf-historicodeos',
    objetivo: 'consultar as garantias com nota fiscal emitida ou enviadas à fábrica.',
    dashboard: null,
    controle: (p) => <GarantiasDafFaturadas slotAcoes={p.slotAcoes} onLastModified={p.onLastModified} />,
  },
]

export default function BiGarantiasDaf() {
  const { hasPermission, hasActionOrDefault, user, garantiasVisaoPadraoEfetiva } = useAuth()
  // Mesma permissão da engrenagem nas telas de Controle (ação "regras")
  const podeRegras = hasActionOrDefault('garantias-daf', 'regras') || hasActionOrDefault('garantias-daf-andamento', 'regras')
  const [params, setParams] = useSearchParams()

  const podeDashboard = (a) => !!a.dashboard && hasPermission('bi/garantias-daf')
  const podeControle = (a) => hasPermission(a.permKey)
  const abasVisiveis = ABAS.filter(a => podeDashboard(a) || podeControle(a))

  // Aba e visão ficam na URL (?aba=...&modo=...), para voltar ao mesmo lugar depois de editar uma garantia.
  const abaAtual = abasVisiveis.find(a => a.key === params.get('aba')) || abasVisiveis[0]
  const modoPedido = params.get('modo')
  const modo = !abaAtual ? null
    : modoPedido === 'controle' && podeControle(abaAtual) ? 'controle'
    : modoPedido === 'dashboard' && podeDashboard(abaAtual) ? 'dashboard'
    // Sem visão na URL: a do grupo (Grupos de Acessos → "Garantias DAF abre em"), se o usuário puder vê-la
    : garantiasVisaoPadraoEfetiva === 'controle' && podeControle(abaAtual) ? 'controle'
    : podeDashboard(abaAtual) ? 'dashboard' : 'controle'

  const irPara = (aba, novoModo) => setParams({ aba, modo: novoModo }, { replace: true })
  const trocarAba = (a) => {
    const proximo = modo === 'controle' && podeControle(a) ? 'controle' : podeDashboard(a) ? 'dashboard' : 'controle'
    irPara(a.key, proximo)
  }

  // Todas as telas (aba × Dashboard/Controle) que o usuário pode ver são montadas UMA vez ao entrar e ficam
  // carregadas: trocar de aba ou de modo só mostra/esconde — não lê o banco/SharePoint de novo. Para reler,
  // botão Atualizar (no Dashboard remonta só a tela visível; no Controle, o próprio botão da tela).
  const telas = useMemo(() => abasVisiveis.flatMap(a => [
    podeDashboard(a) && { key: `${a.key}:dashboard`, aba: a, modo: 'dashboard' },
    podeControle(a) && { key: `${a.key}:controle`, aba: a, modo: 'controle' },
  ].filter(Boolean)), [abasVisiveis.map(a => a.key).join(','), hasPermission]) // eslint-disable-line react-hooks/exhaustive-deps
  const chaveAtiva = abaAtual ? `${abaAtual.key}:${modo}` : null
  // versão de cada tela (muda = remonta = lê de novo)
  const [versoes, setVersoes] = useState({})
  const recarregarTela = (k) => setVersoes(v => ({ ...v, [k]: (v[k] || 0) + 1 }))
  const recarregarDashboards = () => setVersoes(v => {
    const n = { ...v }
    for (const tl of telas) if (tl.modo === 'dashboard') n[tl.key] = (n[tl.key] || 0) + 1
    return n
  })
  // Data do arquivo de cada tela; o topo mostra a da tela visível
  const [lastModifiedPorTela, setLastModifiedPorTela] = useState({})
  const setters = useMemo(() => Object.fromEntries(telas.map(tl => [tl.key,
    (v) => setLastModifiedPorTela(p => (p[tl.key] === v ? p : { ...p, [tl.key]: v }))])), [telas])
  const lastModified = chaveAtiva ? lastModifiedPorTela[chaveAtiva] ?? null : null
  // Espaço ao lado de Dashboard | Controle onde a tela de Controle visível coloca seus botões (Atualizar, Regras, Manual)
  const [slotAcoes, setSlotAcoes] = useState(null)

  // Visão Dashboard: "Atualizar arquivo" relê o arquivo da aba no SharePoint (sem o cache do backend)
  // e remonta o dashboard, que busca tudo de novo.
  const [atualizandoDash, setAtualizandoDash] = useState(false)
  const atualizarDashboard = async () => {
    const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'
    const rota = { oficina: '/api/garantias/sharepoint/aberta/refresh', aberto: '/api/garantias/sharepoint/encerrada/refresh', titulos: '/api/garantias/financeiro/titulos/refresh' }[abaAtual?.key]
    setAtualizandoDash(true)
    try { if (rota) await fetch(`${BACKEND}${rota}`, { method: 'POST' }) } catch {}
    finally {
      setAtualizandoDash(false)
      recarregarTela(chaveAtiva)
    }
  }

  const fmtDataHora = (s) => { if (!s) return null; try { return new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return null } }

  if (!abaAtual) {
    return <div className="p-6 text-xs text-slate-500">Sem acesso às telas de Garantias DAF.</div>
  }

  const botaoModo = (valor, label, Icon, habilitado, dica) => (
    <button
      type="button"
      onClick={() => habilitado && irPara(abaAtual.key, valor)}
      disabled={!habilitado}
      title={`${label} — ${dica}`}
      aria-label={label}
      className={`flex items-center justify-center p-1.5 rounded-md transition-colors ${
        modo === valor ? 'bg-orange-500 text-white shadow-sm'
          : habilitado ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div className="min-h-full bg-white p-6 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* CABEÇALHO — mesmo modelo do BI Planos de Manutenção, em laranja: título à esquerda; à direita,
            atualização + botões em cima e, no lugar dos filtros, a escolha Dashboard | Controle. */}
        <div
          className="relative z-10 rounded-lg shadow-sm"
          style={{ background: 'linear-gradient(90deg, #fdf8ec 0%, #f8d78c 28%, #f0a30a 50%, #a08a35 68%, #4f6a6a 84%, #1a4d8f 100%)' }}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <img src={logoCaioba} alt="Caiobá" className="h-11 w-auto" />
            </div>
            <div className="w-0.5 self-stretch bg-[#1a4d8f]" />
            <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
              <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Garantias DAF</h1>
              <p className="text-[17px] italic text-slate-900 uppercase leading-tight mt-0.5">Pós-Vendas</p>
            </div>
          </div>
          {/* Atualização + botões na altura do título (alinhados ao topo) */}
          <div className="flex flex-col items-end justify-start ml-auto self-start pt-1">
            <div className="flex items-center gap-3">
            <p className="text-[10px] text-white/90 leading-tight whitespace-nowrap">
              Arquivo atualizado em: <strong className="text-white">{fmtDataHora(lastModified) || '—'}</strong>
            </p>
            {/* Botões da tela de Controle (Atualizar, Regras, Manual) */}
            {/* sempre montado (fica escondido no Dashboard) para o espaço não mudar ao trocar de modo */}
            <div ref={setSlotAcoes} className={`flex items-center gap-2 ${modo === 'controle' ? '' : 'hidden'}`} />
            {/* Visão Dashboard: a mesma engrenagem (Regras do Sistema), que vale para Controle e Dashboard */}
            {modo === 'dashboard' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={atualizarDashboard}
                  disabled={atualizandoDash}
                  title="Atualizar arquivo"
                  aria-label="Atualizar arquivo"
                  className="flex items-center justify-center p-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${atualizandoDash ? 'animate-spin' : ''}`} />
                </button>
                {podeRegras && <EngrenagemRegras usuario={user?.email} abaInicial={{ oficina: 'oficina', titulos: 'titulos' }[abaAtual.key] || 'garantista'} onSalvo={recarregarDashboards} onMetaSalva={recarregarDashboards} />}
                {/* Manual de operação — livre para todos (não entra no Grupo de Acessos) */}
                <button
                  type="button"
                  onClick={() => window.open('/garantias-daf-manual', '_blank')}
                  title="Manual de operação"
                  aria-label="Manual de operação"
                  className="flex items-center justify-center p-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            </div>
          </div>
          </div>
        </div>

        {/* Abas tipo "pasta" (mesmo modelo do BI Possibilidades): cantos de cima arredondados, inativas
            cinza-claro com borda, ativa azul-marinho (#1a4d8f) preenchida e um pouco mais alta, linha de base azul */}
        <div className="flex items-end justify-between gap-3 border-b-2 border-[#1a4d8f]">
        <div className="flex items-end gap-1 flex-wrap">
          {abasVisiveis.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => trocarAba(a)}
                className={`inline-flex items-center gap-1.5 px-4 rounded-t-md border border-b-0 text-[11px] font-semibold uppercase transition-colors ${
                  abaAtual.key === a.key
                    ? 'py-2 bg-[#1a4d8f] border-[#1a4d8f] text-white shadow-sm'
                    : 'py-1.5 bg-gradient-to-b from-white to-slate-100 border-slate-300 text-slate-500 hover:text-slate-800 hover:to-slate-50'}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            )
          })}
        </div>

        {/* Visão Dashboard | Controle — ícones, na linha das abas, à direita */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 mb-1">
          {botaoModo('dashboard', 'Dashboard', BarChart2, podeDashboard(abaAtual),
            !abaAtual.dashboard ? 'Esta aba não tem dashboard' : !hasPermission('bi/garantias-daf') ? 'Sem permissão para o dashboard' : 'Ver indicadores')}
          {botaoModo('controle', 'Controle', ClipboardList, podeControle(abaAtual),
            podeControle(abaAtual) ? 'Ver e editar as garantias' : 'Sem permissão para o controle desta aba')}
        </div>
        </div>

        <p className="text-xs text-slate-600">
          <strong className="font-bold text-slate-900">Objetivo:</strong> {abaAtual.objetivo}
        </p>

        {/* Todas as telas montadas desde a entrada; só a visível aparece (as outras ficam escondidas, já carregadas) */}
        {telas.map(tl => {
          const ativa = tl.key === chaveAtiva
          return (
            <div key={`${tl.key}#${versoes[tl.key] || 0}`} className={ativa ? '' : 'hidden'}>
              {tl.modo === 'dashboard'
                ? tl.aba.dashboard({ onLastModified: setters[tl.key] })
                : tl.aba.controle({ onLastModified: setters[tl.key], slotAcoes: ativa ? slotAcoes : null })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
