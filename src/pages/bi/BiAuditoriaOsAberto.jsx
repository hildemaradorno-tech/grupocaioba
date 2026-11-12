import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { BarChart2, ClipboardList, BookOpen } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import logoCaioba from '../../assets/logo-grupo.png'
import AuditoriaOsAberto from '../garantias-daf/AuditoriaOsAberto'
import AuditoriaOsAbertoDashboard from '../garantias-daf/AuditoriaOsAbertoDashboard'

// Auditoria O.S. Aberta numa tela só (mesmo modelo do BI Garantias DAF): botões Dashboard | Controle no topo.
// Permissões: Dashboard = 'auditoria-os-aberto/dashboard'; Controle = 'auditoria-os-aberto' (a tela de antes, com as
// mesmas ações). As duas começam com "auditoria", então a trava do banco (sec_tem_menu_like('auditoria')) vale para ambas.
const PERM_DASHBOARD = 'auditoria-os-aberto/dashboard'
const PERM_CONTROLE = 'auditoria-os-aberto'

export default function BiAuditoriaOsAberto() {
  const { hasPermission, auditoriaVisaoPadraoEfetiva } = useAuth()
  const [params, setParams] = useSearchParams()
  const [slotVisao, setSlotVisao] = useState(null)
  const [slotFiltros, setSlotFiltros] = useState(null)
  const [slotEngrenagem, setSlotEngrenagem] = useState(null)
  const [versao, setVersao] = useState(0) // engrenagem mudou alguma auditoria → Dashboard recarrega

  // Empresa / auditoria iguais nas duas visões — ficam na URL (?empresa=&auditoria=&data=); cada visão lê ao abrir
  // e devolve as trocas por onSelecao
  const selecao = { empresa: params.get('empresa') || '', auditoria: params.get('auditoria') || '', data: params.get('data') || '' }
  const atualizarParams = (mudancas) => setParams(prev => {
    const p = new URLSearchParams(prev)
    Object.entries(mudancas).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)))
    return p
  }, { replace: true })
  const onSelecao = (s) => atualizarParams({ empresa: s.empresa, auditoria: s.auditoria, data: s.data })
  const podeDashboard = hasPermission(PERM_DASHBOARD)
  const podeControle = hasPermission(PERM_CONTROLE)

  // Visão na URL (?modo=dashboard|controle); sem ela, a "Visão inicial" do grupo (Grupos de Acessos),
  // se o usuário puder vê-la; senão a outra
  const pedido = params.get('modo')
  const modo = pedido === 'controle' && podeControle ? 'controle'
    : pedido === 'dashboard' && podeDashboard ? 'dashboard'
    : auditoriaVisaoPadraoEfetiva === 'controle' && podeControle ? 'controle'
    : podeDashboard ? 'dashboard' : podeControle ? 'controle' : null

  if (!modo) return <div className="p-6 text-xs text-slate-500">Sem acesso à Auditoria O.S. Aberta.</div>

  // Só ícone; o nome aparece no balão (title)
  const botaoModo = (valor, label, Icon, habilitado, dica) => (
    <button
      type="button"
      onClick={() => habilitado && atualizarParams({ modo: valor })}
      disabled={!habilitado}
      title={`${label} — ${dica}`}
      aria-label={label}
      className={`flex items-center justify-center h-8 w-8 rounded-md transition-colors ${
        modo === valor ? 'bg-indigo-600 text-white shadow-sm'
          : habilitado ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-300 cursor-not-allowed'
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
  // Visão Dashboard | Controle — cada visão reserva o lugar (onSlotVisao) na linha das abas / dos seletores, à direita
  const seletorVisao = (
    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
      {botaoModo('dashboard', 'Dashboard', BarChart2, podeDashboard, podeDashboard ? 'ver indicadores' : 'sem permissão')}
      {botaoModo('controle', 'Controle', ClipboardList, podeControle, podeControle ? 'conferir e responder as auditorias' : 'sem permissão')}
    </div>
  )

  return (
    <div className="min-h-full bg-white p-6 space-y-5">
      <div className="max-w-screen-2xl mx-auto space-y-5">
        {/* CABEÇALHO — cores e logo do painel Power BI da Caiobá: degradê creme → laranja → azul, logo à esquerda */}
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
              {/* Mesma fonte do painel Power BI (serifada) */}
              <div style={{ fontFamily: "Cambria, Georgia, 'Times New Roman', serif" }}>
                <h1 className="text-[22px] font-bold text-slate-900 uppercase leading-tight">Auditoria de ordens de serviço em aberto</h1>
                <p className="text-[17px] italic text-slate-900 uppercase leading-tight mt-0.5">Pós-Vendas</p>
              </div>
            </div>
            {/* Empresa / Data da Auditoria da visão aberta (cada visão desenha os seus seletores aqui) */}
            {/* ml-auto: fica à direita mesmo quando a tela é estreita e a linha quebra */}
            <div className="flex items-end justify-end gap-3 ml-auto">
              <div ref={setSlotFiltros} className="flex items-end" />
              {/* Engrenagem — nas duas visões, ao lado da Data da Auditoria */}
              <div ref={setSlotEngrenagem} className="flex items-end" />
              {/* Manual de operação — nas duas visões, abre numa aba nova (livre para todos) */}
              <button
                type="button"
                onClick={() => window.open('/auditoria-os-aberto-manual', '_blank')}
                title="Manual de operação"
                aria-label="Manual de operação"
                className="flex items-center justify-center h-9 w-9 rounded-md border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <BookOpen className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {slotVisao && createPortal(seletorVisao, slotVisao)}

        {/* Só a visão escolhida é montada — a outra não carrega dados enquanto estiver fechada */}
        {modo === 'dashboard'
          ? <>
              <AuditoriaOsAbertoDashboard selecao={selecao} onSelecao={onSelecao} slotFiltros={slotFiltros} onSlotVisao={setSlotVisao} versao={versao} />
              {/* Engrenagem no Dashboard: a mesma do Controle (só ela e as janelas, sem a tabela) — quem tem o Controle */}
              {podeControle && (
                <AuditoriaOsAberto embedded soEngrenagem slotEngrenagem={slotEngrenagem} selecao={selecao}
                  onAlterado={() => setVersao(v => v + 1)} />
              )}
            </>
          : <AuditoriaOsAberto embedded slotFiltros={slotFiltros} slotEngrenagem={slotEngrenagem} onSlotVisao={setSlotVisao} selecao={selecao} onSelecao={(s) => onSelecao({ ...s, data: selecao.data })} />}
      </div>
    </div>
  )
}
