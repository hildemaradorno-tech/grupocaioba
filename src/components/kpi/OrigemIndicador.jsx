import React from 'react'
import { ShieldCheck, ClipboardList, Calendar, Wrench, Target, Gauge } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Matriz KPIs › Bloco 3 - Serviços (abas Equipe, Setores e Gerentes): ao lado de cada indicador, um botão
// cinza com o ícone da tela de onde o valor sai (o mesmo ícone do menu) — abre essa tela, na aba certa,
// em outra aba do navegador. Só aparece para quem pode ver a tela de destino; indicador sem tela de
// origem fica sem botão. perm = permissão conferida pela própria tela de destino.
const GARANTIAS_ABERTO = { url: '/bi/garantias-daf?aba=aberto&modo=dashboard', perm: 'bi/garantias-daf', nome: 'Garantias DAF › Com Garantista (Em Aberto)', icone: ShieldCheck }
const GARANTIAS_TITULOS = { url: '/bi/garantias-daf?aba=titulos&modo=dashboard', perm: 'bi/garantias-daf', nome: 'Garantias DAF › Títulos a Receber', icone: ShieldCheck }
const AUDITORIA_OS = { url: '/bi/auditoria-os-aberto?modo=dashboard', perm: 'auditoria-os-aberto/dashboard', nome: 'Auditoria O.S. Aberta › Dashboard', icone: ClipboardList }
const PLANOS = { url: '/bi/planos-manutencao?aba=Resultado', perm: 'bi/planos-manutencao', nome: 'BI Planos de Manutenção › Resultado', icone: Wrench }
const agendamento = (aba) => ({ url: `/bi/agendamento-servicos?aba=${encodeURIComponent(aba)}`, perm: 'bi/agendamento-servicos', nome: `BI Agendamento de Serviços › ${aba}`, icone: Calendar })

const ORIGEM_INDICADOR = {
  // (Faturamento, Margens, Ticket, Eficácia e Produtividade apontavam para Matriz › Fontes — aba retirada em
  // 14/11/2026; agora cada quadro aponta para a Possibilidades ou os Indicadores, em ORIGEM_POR_QUADRO.)
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
  // Linha do setor Mecânica (abaixo de OFICINA) na empresa escolhida — 14/11/2026.
  'CHEFE DE OFICINA|Faturamento Total Oficina (Equipe)': { ...POSSIBILIDADES, nome: 'Pós-Vendas › Possibilidades - Sintonia do Dia › Serviços (setor Mecânica)' },
}
// Gerentes (14/11/2026): Faturamento Total Oficina e Margens vêm da linha OFICINA da Possibilidades.
for (const g of ['GERENTE GERAL PÓS-VENDAS', 'GERENTE DE SERVIÇO - CAMPO GRANDE', 'GERENTE FILIAL - DOURADOS', 'GERENTE FILIAL - TRÊS LAGOAS', 'GERENTE FILIAL - CHAPADÃO DO SUL']) {
  for (const ind of ['Faturamento Total Oficina (Peças + Serviços)', 'Margem Bruta Serviços', 'Margem Bruta Peças Oficina']) {
    // Abre direto na aba Serviços (14/11/2026), como o Balcão abre na aba Peças.
    ORIGEM_POR_QUADRO[`${g}|${ind}`] = { ...POSSIBILIDADES, url: '/pos-vendas/possibilidades?visao=oficina', nome: 'Pós-Vendas › Possibilidades - Sintonia do Dia › Serviços (linha OFICINA)' }
  }
}
// Gerentes Filial (14/11/2026): Faturamento Balcão e Margem Bruta Peças Balcão — linha BALCÃO PEÇAS da Possibilidades.
for (const g of ['GERENTE FILIAL - DOURADOS', 'GERENTE FILIAL - TRÊS LAGOAS', 'GERENTE FILIAL - CHAPADÃO DO SUL']) {
  for (const ind of ['Faturamento Balcão', 'Margem Bruta Peças Balcão']) {
    ORIGEM_POR_QUADRO[`${g}|${ind}`] = { ...POSSIBILIDADES, url: '/pos-vendas/possibilidades?visao=balcao', nome: 'Pós-Vendas › Possibilidades - Sintonia do Dia › Peças (linha BALCÃO PEÇAS)' }
  }
}
// SETOR DE MECÂNICA (14/11/2026): Eficácia da Oficina = total da empresa escolhida na tela Indicadores de Produtividade.
ORIGEM_POR_QUADRO['SETOR DE MECÂNICA|Eficácia da Oficina'] = { url: '/pos-vendas/produtividade', perm: 'pos-vendas/produtividade', nome: 'Pós-Vendas › Indicadores de Produtividade (total da empresa)', icone: Target }
ORIGEM_POR_QUADRO['CHEFE DE OFICINA|Eficácia da Oficina'] = ORIGEM_POR_QUADRO['SETOR DE MECÂNICA|Eficácia da Oficina']
// MECÂNICO (14/11/2026): Eficácia e Produtividade do mecânico — aba Mecânicos da tela Indicadores de Produtividade.
for (const ind of ['Eficácia da Oficina', 'Produtividade da Oficina']) {
  ORIGEM_POR_QUADRO[`MECÂNICO|${ind}`] = { url: '/pos-vendas/produtividade?aba=mecanicos', perm: 'pos-vendas/produtividade', nome: 'Pós-Vendas › Indicadores de Produtividade › Mecânicos', icone: Target }
}
// Gerentes de loja (14/11/2026): Eficácia e Produtividade da Oficina vêm do total da empresa na tela
// Indicadores de Produtividade (Resumo).
for (const g of ['GERENTE DE SERVIÇO - CAMPO GRANDE', 'GERENTE FILIAL - DOURADOS', 'GERENTE FILIAL - TRÊS LAGOAS', 'GERENTE FILIAL - CHAPADÃO DO SUL']) {
  for (const ind of ['Eficácia da Oficina', 'Produtividade da Oficina']) {
    ORIGEM_POR_QUADRO[`${g}|${ind}`] = { url: '/pos-vendas/produtividade', perm: 'pos-vendas/produtividade', nome: 'Pós-Vendas › Indicadores de Produtividade (total da empresa)', icone: Target }
  }
}

// Empresa que o link leva para a tela de destino (Possibilidades / Indicadores de Produtividade abrem com ela
// marcada, 14/11/2026): gerentes pelo quadro (Gerente Geral = todas as Trucks); quadros com seletor de empresa
// passam a escolhida (prop empresa).
const EMPRESA_DO_QUADRO = {
  'GERENTE GERAL PÓS-VENDAS': 'TRUCKS',
  'GERENTE DE SERVIÇO - CAMPO GRANDE': 'CAMPO GRANDE',
  'GERENTE FILIAL - DOURADOS': 'DOURADOS',
  'GERENTE FILIAL - TRÊS LAGOAS': 'TRÊS LAGOAS',
  'GERENTE FILIAL - CHAPADÃO DO SUL': 'CHAPADÃO DO SUL',
}

export default function OrigemIndicador({ indicador, quadro = null, empresa = null }) {
  const { hasPermission } = useAuth()
  const origem = ORIGEM_POR_QUADRO[`${quadro}|${indicador}`] || ORIGEM_INDICADOR[indicador]
  if (!origem || !hasPermission(origem.perm)) return null
  const Icone = origem.icone
  const emp = (empresa && empresa !== 'TODAS' ? empresa : null) || EMPRESA_DO_QUADRO[quadro]
  // Parâmetro da empresa em cada tela de destino (a Auditoria já usa "empresa" para o código, então "loja").
  const param = origem.url.startsWith('/pos-vendas/') ? 'empresa'
    : origem.url.startsWith('/bi/auditoria-os-aberto') || origem.url.startsWith('/bi/garantias-daf') ? 'loja' : null
  const url = emp && param
    ? `${origem.url}${origem.url.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(emp)}`
    : origem.url
  return (
    <button type="button" onClick={() => window.open(url, '_blank', 'noopener')}
      title={`Abrir em outra aba: ${origem.nome}`}
      aria-label={`Abrir a origem de ${indicador} (${origem.nome}) em outra aba`}
      className="ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded border border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 align-middle shrink-0 transition-colors">
      <Icone className="h-3 w-3" />
    </button>
  )
}
