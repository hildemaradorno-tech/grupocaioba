import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { KpiYearProvider } from './context/KpiYearContext'
import { normalizePath } from './config/menuTree'
import Login from './pages/Login'
import RedefinirSenha from './pages/RedefinirSenha'
import SidebarLayout from './layouts/SidebarLayout'
import Home from './pages/Home'
import Usuarios from './pages/Usuarios'
import Grupos from './pages/Grupos'
import PermissoesMatriz from './pages/PermissoesMatriz'
import Empresas from './pages/Empresas'
import Departamentos from './pages/Departamentos'
import Setores from './pages/Setores'
import Box from './pages/Box'
import Cargos from './pages/Cargos'
import TiposOS from './pages/TiposOS'
import TiposProdutos from './pages/TiposProdutos'
import ClassificacaoCompra from './pages/ClassificacaoCompra'
import MovimentoVenda from './pages/MovimentoVenda'
import NaturezaOperacoes from './pages/NaturezaOperacoes'
import AgrupamentoEmpresas from './pages/AgrupamentoEmpresas'
import AgrupamentoDepartamentos from './pages/AgrupamentoDepartamentos'
import AgrupamentoCargos from './pages/AgrupamentoCargos'
import Areas from './pages/Areas'
import Segmentos from './pages/Segmentos'
import PoliticaComissao from './pages/PoliticaComissao'
import CargosRemuneracoes from './pages/CargosRemuneracoes'
import FontesCalculo from './pages/FontesCalculo'
import BasesCalculo from './pages/BasesCalculo'
import Medidas from './pages/Medidas'
import CalculoComissoes from './pages/CalculoComissoes'
import HistoricoComissoes from './pages/HistoricoComissoes'
import Ferias from './pages/Ferias'
import SobreavisoPlantao from './pages/SobreavisoPlantao'
import Funcionarios from './pages/Funcionarios'
import Feriados from './pages/Feriados'
import Calendario from './pages/Calendario'
import SincronizacaoDados from './pages/SincronizacaoDados'
import MetasPecas from './pages/MetasPecas'
import MetasVendaNovos from './pages/MetasVendaNovos'
import MetasVendaSeminovos from './pages/MetasVendaSeminovos'
import MetasPosVendaServicos from './pages/MetasPosVendaServicos'
import MetasServicosMecanico from './pages/MetasServicosMecanico'
import MetasServicosConsultor from './pages/MetasServicosConsultor'
import MetasPosVendaFunilariaPintura from './pages/MetasPosVendaFunilariaPintura'
import MetasTerceiros from './pages/MetasTerceiros'
import MetasGestaoAprovacao from './pages/MetasGestaoAprovacao'
import MetasVendaTotal from './pages/MetasVendaTotal'
import MetasPosVendaTotal from './pages/MetasPosVendaTotal'
import MetasTotalGrupo from './pages/MetasTotalGrupo'
import MetasDistribuicaoConsultores from './pages/MetasDistribuicaoConsultores'
import GarantiasDafDashboard from './pages/garantias-daf/GarantiasDafDashboard'
import GarantiasDafFaturadas from './pages/garantias-daf/GarantiasDafFaturadas'
import GarantiasDafTitulos from './pages/garantias-daf/GarantiasDafTitulos'
import GarantiasDafForm from './pages/garantias-daf/GarantiasDafForm'
import AuditoriaOsAberto from './pages/garantias-daf/AuditoriaOsAberto'
import HondaGarantiasReceber from './pages/honda/HondaGarantiasReceber'
import AuditoriaResponsaveis from './pages/auditoria/AuditoriaResponsaveis'
import AuditoriaSituacoes from './pages/auditoria/AuditoriaSituacoes'
import TipoTituloGarantia from './pages/garantia/TipoTituloGarantia'
import ProjetosDashboard from './pages/projetos/ProjetosDashboard'
import ProjetoDetalhe from './pages/projetos/ProjetoDetalhe'
import ProjetoEditor from './pages/projetos/ProjetoEditor'
import ProjFases from './pages/projetos/cadastros/ProjFases'
import ProjResponsaveis from './pages/projetos/cadastros/ProjResponsaveis'
import ProjSistemas from './pages/projetos/cadastros/ProjSistemas'
import ProjEmpresas from './pages/projetos/cadastros/ProjEmpresas'
import ProjDepartamentos from './pages/projetos/cadastros/ProjDepartamentos'
import ProjAreas from './pages/projetos/cadastros/ProjAreas'
import ProjStatus from './pages/projetos/cadastros/ProjStatus'
import ProjTemplates from './pages/projetos/cadastros/ProjTemplates'
import CalendarioProjetos from './pages/projetos/CalendarioProjetos'
import AtaReuniao from './pages/projetos/AtaReuniao'
import PlanejamentoProjetos from './pages/projetos/PlanejamentoProjetos'
import { ProjetosFiltrosProvider } from './context/ProjetosFiltrosContext'
import Fornecedores from './pages/Fornecedores'
import KpiMatriz, { KPI_MATRIZ_PERMS } from './pages/kpi/KpiMatriz'
import CalcVendaServico from './pages/calculadoras/CalcVendaServico'
import Documentacoes from './pages/Documentacoes'
import RpaAgendamentos from './pages/rpa/RpaAgendamentos'
import GradeTreinamentos from './pages/treinamentos/GradeTreinamentos'
import Ecossistema from './pages/Ecossistema'
import Organograma from './pages/Organograma'
import BiGarantiasDaf from './pages/bi/BiGarantiasDaf'
import BiProjetos from './pages/bi/BiProjetos'
import BiPossibilidades from './pages/bi/BiPossibilidades'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="text-xs text-slate-400">Carregando...</span>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Flag em nível de módulo: persiste entre navegações de rota (ao contrário de useRef).
// Garante que TOKEN_REFRESHED não cause unmount de componentes filhos ao navegar.
let _permissionsEverLoaded = false

function PermissionRoute({ menuPath, children }) {
  const { hasPermission, permissionsLoading } = useAuth()
  if (!permissionsLoading) _permissionsEverLoaded = true
  if (!_permissionsEverLoaded && permissionsLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <span className="text-xs text-slate-400">Carregando...</span>
    </div>
  )
  const permitido = Array.isArray(menuPath)
    ? menuPath.some(p => hasPermission(normalizePath(p)))
    : hasPermission(normalizePath(menuPath))
  if (!permitido) return <Navigate to="/" replace />
  return children
}

export default function App() {
  useEffect(() => {
    let savedEl = null

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const el = document.activeElement
        if (el && el !== document.body && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) {
          savedEl = el
        }
      } else {
        if (savedEl && document.contains(savedEl)) {
          setTimeout(() => {
            savedEl.focus()
            if (savedEl.tagName === 'INPUT' || savedEl.tagName === 'TEXTAREA') {
              try {
                const len = savedEl.value.length
                savedEl.setSelectionRange(len, len)
              } catch {}
            }
          }, 100)
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return (
    <AuthProvider>
    <KpiYearProvider>
    <ProjetosFiltrosProvider>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
        {[
          { path: '/', element: <Home /> },
          { path: '/usuarios', element: <Usuarios />, menuPath: 'usuarios' },
          { path: '/grupos', element: <Grupos />, menuPath: 'grupos' },
          { path: '/permissoes-matriz', element: <PermissoesMatriz />, menuPath: 'permissoes-matriz' },
          { path: '/segmentos', element: <Segmentos />, menuPath: 'segmentos' },
          { path: '/agrup-empresas', element: <AgrupamentoEmpresas />, menuPath: 'agrup-empresas' },
          { path: '/empresas', element: <Empresas />, menuPath: 'empresas' },
          { path: '/areas', element: <Areas />, menuPath: 'areas' },
          { path: '/agrup-departamentos', element: <AgrupamentoDepartamentos />, menuPath: 'agrup-departamentos' },
          { path: '/departamentos', element: <Departamentos />, menuPath: 'departamentos' },
          { path: '/setores', element: <Setores />, menuPath: 'setores' },
          { path: '/box', element: <Box />, menuPath: 'box' },
          { path: '/agrup-cargos', element: <AgrupamentoCargos />, menuPath: 'agrup-cargos' },
          { path: '/cargos', element: <Cargos />, menuPath: 'cargos' },
          { path: '/tipos-os', element: <TiposOS />, menuPath: 'tipos-os' },
          { path: '/tipos-produtos', element: <TiposProdutos />, menuPath: 'tipos-produtos' },
          { path: '/classificacao-compra', element: <ClassificacaoCompra />, menuPath: 'classificacao-compra' },
          { path: '/movimento-venda', element: <MovimentoVenda />, menuPath: 'movimento-venda' },
          { path: '/natureza-operacoes', element: <NaturezaOperacoes />, menuPath: 'natureza-operacoes' },
          { path: '/politica-comissao', element: <PoliticaComissao />, menuPath: 'politica-comissao' },
          { path: '/cargos-remuneracoes', element: <CargosRemuneracoes />, menuPath: 'cargos-remuneracoes' },
          { path: '/fontes-calculo', element: <FontesCalculo />, menuPath: 'fontes-calculo' },
          { path: '/bases-calculo', element: <BasesCalculo />, menuPath: 'bases-calculo' },
          { path: '/calculo-comissoes', element: <CalculoComissoes />, menuPath: 'calculo-comissoes' },
          { path: '/historico-comissoes', element: <HistoricoComissoes />, menuPath: 'calculo-comissoes' },
          { path: '/ferias', element: <Ferias />, menuPath: 'ferias' },
          { path: '/sobreaviso-plantao', element: <SobreavisoPlantao />, menuPath: 'sobreaviso-plantao' },
          { path: '/funcionarios', element: <Funcionarios />, menuPath: 'funcionarios' },
          { path: '/feriados', element: <Feriados />, menuPath: 'feriados' },
          { path: '/calendario', element: <Calendario />, menuPath: 'calendario' },
          { path: '/sincronizacao-dados', element: <SincronizacaoDados />, menuPath: 'sincronizacao-dados' },
          { path: '/medidas-bi', element: <Medidas />, menuPath: 'medidas-bi' },
          { path: '/metas/vendas/novos', element: <MetasVendaNovos />, menuPath: '/metas/vendas/novos' },
          { path: '/metas/vendas/seminovos', element: <MetasVendaSeminovos />, menuPath: '/metas/vendas/seminovos' },
          { path: '/metas/vendas/total', element: <MetasVendaTotal />, menuPath: '/metas/vendas/total' },
          { path: '/metas/pos-vendas/pecas', element: <MetasPecas />, menuPath: '/metas/pos-vendas/pecas' },
          { path: '/metas/pos-vendas/servicos', element: <MetasPosVendaServicos />, menuPath: '/metas/pos-vendas/servicos' },
          { path: '/metas/pos-vendas/servicos/mecanico', element: <MetasServicosMecanico />, menuPath: '/metas/pos-vendas/servicos' },
          { path: '/metas/pos-vendas/servicos/consultor', element: <MetasServicosConsultor />, menuPath: '/metas/pos-vendas/servicos' },
          { path: '/metas/pos-vendas/funilaria-pintura', element: <MetasPosVendaFunilariaPintura />, menuPath: '/metas/pos-vendas/funilaria-pintura' },
          { path: '/metas/pos-vendas/terceiros', element: <MetasTerceiros />, menuPath: '/metas/pos-vendas/terceiros' },

          { path: '/metas/pos-vendas/distribuicao-consultores', element: <MetasDistribuicaoConsultores />, menuPath: '/metas/pos-vendas/distribuicao-consultores' },
          { path: '/metas/pos-vendas/total', element: <MetasPosVendaTotal />, menuPath: '/metas/pos-vendas/total' },
          { path: '/metas/total-grupo', element: <MetasTotalGrupo />, menuPath: '/metas/total-grupo' },
          { path: '/metas/gestao-aprovacao', element: <MetasGestaoAprovacao />, menuPath: '/metas/gestao-aprovacao' },
          { path: '/auditoria-os-aberto', element: <AuditoriaOsAberto />, menuPath: '/auditoria-os-aberto' },
          { path: '/honda/garantias-a-receber', element: <HondaGarantiasReceber />, menuPath: 'honda/garantias-a-receber' },
          { path: '/auditoria/responsaveis', element: <AuditoriaResponsaveis />, menuPath: 'auditoria/responsaveis' },
          { path: '/auditoria/situacoes', element: <AuditoriaSituacoes />, menuPath: 'auditoria/situacoes' },
          { path: '/garantia/tipo-titulo', element: <TipoTituloGarantia />, menuPath: 'garantia/tipo-titulo' },
          { path: '/garantias-daf-andamento', element: <GarantiasDafDashboard key="andamento" variante="andamento" />, menuPath: '/garantias-daf-andamento' },
          { path: '/garantias-daf', element: <GarantiasDafDashboard key="aberto" />, menuPath: '/garantias-daf' },
          { path: '/garantias-daf/novo', element: <GarantiasDafForm />, menuPath: '/garantias-daf' },
          { path: '/garantias-daf/:id', element: <GarantiasDafForm />, menuPath: '/garantias-daf' },
          { path: '/garantias-daf-faturadas', element: <GarantiasDafFaturadas />, menuPath: '/garantias-daf-faturadas' },
          { path: '/garantias-daf-titulos',   element: <GarantiasDafTitulos />,   menuPath: '/garantias-daf-titulos' },
          { path: '/projetos', element: <ProjetosDashboard />, menuPath: 'projetos' },
          { path: '/projetos/pdca', element: <AtaReuniao />, menuPath: 'projetos/pdca' },
          { path: '/projetos/planejamento', element: <PlanejamentoProjetos />, menuPath: 'projetos/planejamento' },
          { path: '/projetos/lista-tarefas', element: <CalendarioProjetos abaInicial="lista" />, menuPath: 'projetos/lista-tarefas' },
          { path: '/projetos/calendario', element: <CalendarioProjetos abaInicial="calendario" />, menuPath: 'projetos/calendario' },
          { path: '/fornecedores', element: <Fornecedores />, menuPath: 'fornecedores' },
          { path: '/projetos/novo', element: <ProjetoEditor />, menuPath: 'projetos' },
          { path: '/projetos/:id/editar', element: <ProjetoEditor />, menuPath: 'projetos' },
          { path: '/projetos/:id', element: <ProjetoDetalhe />, menuPath: 'projetos' },
          { path: '/projetos/empresas', element: <ProjEmpresas />, menuPath: '/projetos/empresas' },
          { path: '/projetos/departamentos', element: <ProjDepartamentos />, menuPath: '/projetos/departamentos' },
          { path: '/projetos/areas', element: <ProjAreas />, menuPath: '/projetos/areas' },
          { path: '/projetos/status', element: <ProjStatus />, menuPath: '/projetos/status' },
          { path: '/projetos/sistemas', element: <ProjSistemas />, menuPath: '/projetos/sistemas' },
          { path: '/projetos/responsaveis', element: <ProjResponsaveis />, menuPath: '/projetos/responsaveis' },
          { path: '/projetos/fases', element: <ProjFases />, menuPath: '/projetos/fases' },
          { path: '/projetos/templates', element: <ProjTemplates />, menuPath: '/projetos/templates' },
          { path: '/kpi/matriz', element: <KpiMatriz />, menuPath: KPI_MATRIZ_PERMS },
          { path: '/calculadoras/venda-servico', element: <CalcVendaServico />, menuPath: 'calculadoras/venda-servico' },
          { path: '/documentacoes', element: <Documentacoes />, menuPath: 'documentacoes' },
          { path: '/rpa/agendamentos', element: <RpaAgendamentos />, menuPath: 'rpa/agendamentos' },
          { path: '/treinamentos/grade', element: <GradeTreinamentos />, menuPath: 'treinamentos/grade' },
          { path: '/ecossistema', element: <Ecossistema />, menuPath: 'ecossistema' },
          { path: '/organograma', element: <Organograma />, menuPath: 'organograma' },
          { path: '/bi/garantias-daf', element: <BiGarantiasDaf />, menuPath: 'bi/garantias-daf' },
          { path: '/bi/projetos', element: <BiProjetos />, menuPath: 'bi/projetos' },
          { path: '/bi/possibilidades', element: <BiPossibilidades />, menuPath: 'bi/possibilidades' },
        ].map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={route.menuPath ? <PermissionRoute menuPath={route.menuPath}>{route.element}</PermissionRoute> : route.element}
          />
        ))}
      </Route>
    </Routes>
    </ProjetosFiltrosProvider>
    </KpiYearProvider>
    </AuthProvider>
  )
}
