import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Activity, FileText, DollarSign, Receipt, BarChart2, ClipboardList } from 'lucide-react'
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
    controle: (p) => <GarantiasDafFaturadas slotAcoes={p.slotAcoes} />,
  },
]

export default function BiGarantiasDaf() {
  const { hasPermission, hasActionOrDefault, user, garantiasVisaoPadraoEfetiva } = useAuth()
  // Mesma permissão da engrenagem nas telas de Controle (ação "regras")
  const podeRegras = hasActionOrDefault('garantias-daf', 'regras') || hasActionOrDefault('garantias-daf-andamento', 'regras')
  const [versaoRegras, setVersaoRegras] = useState(0)
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

  const [lastModified, setLastModified] = useState(null)
  // Espaço ao lado de Dashboard | Controle onde a tela de Controle coloca seus botões (Atualizar, Regras, Manual)
  const [slotAcoes, setSlotAcoes] = useState(null)
  useEffect(() => { setLastModified(null) }, [abaAtual?.key, modo])

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
              <span className="text-[30px] leading-none font-black italic tracking-tight text-[#1a4d8f]"
                style={{ fontFamily: "'Arial Black', 'Segoe UI Black', Arial, sans-serif" }}>CAIOBÁ</span>
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
            {modo === 'controle' && <div ref={setSlotAcoes} className="flex items-center gap-2" />}
            {/* Visão Dashboard: a mesma engrenagem (Regras do Sistema), que vale para Controle e Dashboard */}
            {modo === 'dashboard' && podeRegras && (
              <div className="flex items-center gap-2">
                <EngrenagemRegras usuario={user?.email} onSalvo={() => setVersaoRegras(v => v + 1)} />
              </div>
            )}
            </div>
          </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 w-fit">
          {abasVisiveis.map(a => {
            const Icon = a.icon
            return (
              <button
                key={a.key}
                onClick={() => trocarAba(a)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  abaAtual.key === a.key ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            )
          })}
        </div>

        {/* Visão Dashboard | Controle — ícones, na linha das abas, à direita */}
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
          {botaoModo('dashboard', 'Dashboard', BarChart2, podeDashboard(abaAtual),
            !abaAtual.dashboard ? 'Esta aba não tem dashboard' : !hasPermission('bi/garantias-daf') ? 'Sem permissão para o dashboard' : 'Ver indicadores')}
          {botaoModo('controle', 'Controle', ClipboardList, podeControle(abaAtual),
            podeControle(abaAtual) ? 'Ver e editar as garantias' : 'Sem permissão para o controle desta aba')}
        </div>
        </div>

        <p className="text-xs text-slate-600">
          <strong className="font-bold text-slate-900">Objetivo:</strong> {abaAtual.objetivo}
        </p>

        {/* Só a visão escolhida é montada — a outra não carrega dados enquanto estiver fechada. */}
        {/* versaoRegras: ao salvar a engrenagem no Dashboard, ele é recarregado com as regras novas */}
        {modo === 'dashboard'
          ? <React.Fragment key={versaoRegras}>{abaAtual.dashboard({ onLastModified: setLastModified })}</React.Fragment>
          : abaAtual.controle({ onLastModified: setLastModified, slotAcoes })}
      </div>
    </div>
  )
}
