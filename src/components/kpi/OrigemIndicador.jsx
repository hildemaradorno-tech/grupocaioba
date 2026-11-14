import React from 'react'
import { Database, ShieldCheck, ClipboardList, Calendar, Wrench, Target, Gauge } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Matriz KPIs › Bloco 3 - Serviços (abas Equipe, Setores e Gerentes): ao lado de cada indicador, um botão
// cinza com o ícone da tela de onde o valor sai (o mesmo ícone do menu) — abre essa tela, na aba certa,
// em outra aba do navegador. Só aparece para quem pode ver a tela de destino; indicador sem tela de
// origem fica sem botão. perm = permissão conferida pela própria tela de destino.
const FONTES_MATRIZ = { url: '/kpi/matriz?aba=auditoria', perm: 'kpi/auditoria', nome: 'Matriz KPIs › Fontes', icone: Database }
const GARANTIAS_ABERTO = { url: '/bi/garantias-daf?aba=aberto&modo=dashboard', perm: 'bi/garantias-daf', nome: 'Garantias DAF › Com Garantista (Em Aberto)', icone: ShieldCheck }
const GARANTIAS_TITULOS = { url: '/bi/garantias-daf?aba=titulos&modo=dashboard', perm: 'bi/garantias-daf', nome: 'Garantias DAF › Títulos a Receber', icone: ShieldCheck }
const AUDITORIA_OS = { url: '/bi/auditoria-os-aberto?modo=dashboard', perm: 'auditoria-os-aberto/dashboard', nome: 'Auditoria O.S. Aberta › Dashboard', icone: ClipboardList }
const PLANOS = { url: '/bi/planos-manutencao?aba=Resultado', perm: 'bi/planos-manutencao', nome: 'BI Planos de Manutenção › Resultado', icone: Wrench }
const agendamento = (aba) => ({ url: `/bi/agendamento-servicos?aba=${encodeURIComponent(aba)}`, perm: 'bi/agendamento-servicos', nome: `BI Agendamento de Serviços › ${aba}`, icone: Calendar })

const ORIGEM_INDICADOR = {
  // Fontes da Matriz (relatórios do SharePoint)
  'Faturamento Total Oficina (Peças + Serviços)': FONTES_MATRIZ,
  'Faturamento Total Oficina (Serviços)': FONTES_MATRIZ,
  'Faturamento Total Oficina (Equipe)': FONTES_MATRIZ,
  'Faturamento Total Funilaria/Pintura (Departamento)': FONTES_MATRIZ,
  'Faturamento Oficina (Serviços)': FONTES_MATRIZ,
  'Faturamento Balcão': FONTES_MATRIZ,
  'Margem Bruta Serviços': FONTES_MATRIZ,
  'Margem Bruta Peças Oficina': FONTES_MATRIZ,
  'Margem Bruta Peças Balcão': FONTES_MATRIZ,
  'Ticket Médio da Oficina': FONTES_MATRIZ,
  'Eficácia da Oficina': FONTES_MATRIZ,
  'Produtividade da Oficina': FONTES_MATRIZ,
  // BI Planos de Manutenção
  'Contratos novos': PLANOS,
  'Contratos renovados': PLANOS,
  // Auditoria O.S. Aberta
  'O.S. aberta sem veículo na oficina': AUDITORIA_OS,
  'O.S. abertas >= 30 dias': AUDITORIA_OS,
  'O.S. >= 30 dias (% do Valor)': AUDITORIA_OS,
  // Garantias DAF
  'Garantias com Digitação Atrasada': GARANTIAS_ABERTO,
  'Garantias Aguardando Aprovação DAF (fora do prazo)': GARANTIAS_ABERTO,
  'Garantias Aprovada sem Faturamento': GARANTIAS_ABERTO,
  'Garantias Recusadas (fora do prazo)': GARANTIAS_ABERTO,
  'Garantias a Receber Vencidas': GARANTIAS_TITULOS,
  // BI Agendamento de Serviços
  'Taxa de Agendamento (Por Campanhas)': agendamento('Por Campanhas'),
  'Taxa de Agendamento Ativo (Por Data Agendamento)': agendamento('Por Data Agendamento'),
  'Taxa de No-show (Por Data Agendamento)': agendamento('Por Data Agendamento'),
}

// Mesmo indicador com origem diferente em um quadro: chave "QUADRO|Indicador" (vale antes da tabela acima).
// Consultor de Serviços › Produtividade da Oficina: valor e meta vêm de Pós-Vendas › Indicadores de
// Produtividade (aba Consultores) — ícone de alvo, o mesmo da meta do consultor naquela tela.
// Bloco 3 - Serviços: faturamento/margem/ticket vêm do BI Possibilidades - Sintonia do Dia (aba Serviços),
// não mais de Matriz › Fontes (13/11/2026) — nos quadros de Gerentes continuam das Fontes.
const POSSIBILIDADES = { url: '/pos-vendas/possibilidades?visao=oficina', perm: 'bi/possibilidades', nome: 'Pós-Vendas › Possibilidades - Sintonia do Dia › Serviços', icone: Gauge }
const ORIGEM_POR_QUADRO = {
  'CONSULTOR DE SERVIÇOS|Produtividade da Oficina': { url: '/pos-vendas/produtividade?aba=consultores', perm: 'pos-vendas/produtividade', nome: 'Pós-Vendas › Indicadores de Produtividade › Consultores', icone: Target },
  'CONSULTOR DE SERVIÇOS|Faturamento Total Oficina (Peças + Serviços)': POSSIBILIDADES,
  'CONSULTOR DE SERVIÇOS|Margem Bruta Serviços': POSSIBILIDADES,
  'CONSULTOR DE SERVIÇOS|Margem Bruta Peças Oficina': POSSIBILIDADES,
  'CONSULTOR DE SERVIÇOS|Ticket Médio da Oficina': POSSIBILIDADES,
  'MECÂNICO|Faturamento Total Oficina (Serviços)': POSSIBILIDADES,
  'SETOR FUNILARIA/PINTURA|Faturamento Total Funilaria/Pintura (Departamento)': POSSIBILIDADES,
}

export default function OrigemIndicador({ indicador, quadro = null }) {
  const { hasPermission } = useAuth()
  const origem = ORIGEM_POR_QUADRO[`${quadro}|${indicador}`] || ORIGEM_INDICADOR[indicador]
  if (!origem || !hasPermission(origem.perm)) return null
  const Icone = origem.icone
  return (
    <button type="button" onClick={() => window.open(origem.url, '_blank', 'noopener')}
      title={`Abrir em outra aba: ${origem.nome}`}
      aria-label={`Abrir a origem de ${indicador} (${origem.nome}) em outra aba`}
      className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded border border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 align-middle shrink-0 transition-colors">
      <Icone className="h-3 w-3" />
    </button>
  )
}
