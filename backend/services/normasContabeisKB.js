// Base de conhecimento estática de normas contábeis, usada como contexto (RAG
// simples por keyword-match, sem embeddings/vector DB) no chat do Copiloto de
// Auditoria. Resumos objetivos — não substituem a leitura da norma completa.

export const NORMAS_CONTABEIS = [
  {
    codigo: 'NBC TG 26',
    titulo: 'Apresentação das Demonstrações Contábeis',
    resumo: 'Define estrutura geral, requisitos mínimos de conteúdo e conceitos de apresentação (continuidade, competência, materialidade, compensação) das demonstrações contábeis. Base para avaliar se saldos e classificações estão apresentados de forma fidedigna.',
    palavrasChave: ['apresentação', 'demonstrações', 'competência', 'materialidade', 'balanço patrimonial'],
  },
  {
    codigo: 'NBC TA 300',
    titulo: 'Planejamento de Auditoria de Demonstrações Contábeis',
    resumo: 'Trata do planejamento da auditoria: estratégia geral, plano de auditoria e ajustes ao longo do trabalho conforme riscos identificados.',
    palavrasChave: ['planejamento', 'estratégia de auditoria', 'plano de auditoria'],
  },
  {
    codigo: 'NBC TA 315',
    titulo: 'Identificação e Avaliação dos Riscos de Distorção Relevante',
    resumo: 'Exige que o auditor entenda a entidade e seu ambiente (incluindo controles internos) para identificar e avaliar riscos de distorção relevante nas demonstrações contábeis — base técnica para classificar achados por relevância/risco (Alta/Média/Baixa).',
    palavrasChave: ['risco', 'distorção relevante', 'controles internos', 'relevância', 'classificação de risco'],
  },
  {
    codigo: 'NBC TG 08',
    titulo: 'Custos de Transação e Prêmios na Emissão de Títulos e Valores Mobiliários',
    resumo: 'Trata do reconhecimento e mensuração de custos de transação associados à emissão de títulos e valores mobiliários — relevante em achados envolvendo instrumentos financeiros e mútuos intercompany.',
    palavrasChave: ['custos de transação', 'títulos', 'valores mobiliários', 'mútuo', 'instrumento financeiro'],
  },
  {
    codigo: 'CPC 25',
    titulo: 'Provisões, Passivos Contingentes e Ativos Contingentes',
    resumo: 'Define quando reconhecer uma provisão (obrigação presente, saída de recursos provável, valor estimável) versus quando apenas divulgar um passivo contingente — relevante para achados de "ausência de reconhecimento contábil".',
    palavrasChave: ['provisão', 'passivo contingente', 'ativo contingente', 'ausência de reconhecimento'],
  },
  {
    codigo: 'CPC 46',
    titulo: 'Mensuração do Valor Justo',
    resumo: 'Estabelece hierarquia e técnicas de mensuração a valor justo — relevante quando o achado envolve divergência entre saldo contábil e valor de mercado/suporte financeiro.',
    palavrasChave: ['valor justo', 'mensuração', 'hierarquia de valor justo'],
  },
]

/**
 * Retorna as normas cujo texto (código, título, palavras-chave) casa com
 * algum termo da pergunta do usuário — contexto simples para o system prompt
 * do chat, sem precisar de embeddings.
 */
export function buscarNormasRelevantes(texto) {
  const alvo = String(texto || '').toLowerCase()
  if (!alvo) return []
  return NORMAS_CONTABEIS.filter(n =>
    alvo.includes(n.codigo.toLowerCase()) ||
    n.palavrasChave.some(p => alvo.includes(p.toLowerCase()))
  )
}

export function formatarNormasParaPrompt(normas) {
  if (!normas.length) return NORMAS_CONTABEIS.map(n => `${n.codigo} — ${n.titulo}: ${n.resumo}`).join('\n')
  return normas.map(n => `${n.codigo} — ${n.titulo}: ${n.resumo}`).join('\n')
}
