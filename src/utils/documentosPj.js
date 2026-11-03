import { codigoPolitica } from './comissoesFormat'

// Documentos PJ (menu Documentos PJ, tabela pj_documentos_exigidos): escopo 'TODOS' vale pra todo
// prestador PJ; 'REGRA' só pra quem tem aquela Regra PJ (regra_id = grupo_politica_id) no mês.
const grupoDe = (p) => p?.grupo_politica_id || p?.id

// periodo = 'YYYY-MM'
export const documentoVigente = (d, periodo) => d.ativo !== false
  && (!d.vig_inicio || d.vig_inicio.slice(0, 7) <= periodo)
  && (!d.vig_fim || d.vig_fim.slice(0, 7) >= periodo)

// politicas = políticas das linhas calculadas/salvas do prestador no mês.
// Retorna [{ doc, politica }] — politica = a Regra PJ do documento (null quando vale pra todos).
export function documentosDoPrestador(exigidos, politicas, periodo) {
  const lista = (politicas || []).filter(Boolean)
  if (!lista.some(p => p.prestacao_pj)) return []
  return (exigidos || [])
    .filter(d => documentoVigente(d, periodo) && (d.escopo === 'TODOS' || lista.some(p => grupoDe(p) === d.regra_id)))
    .map(d => ({ doc: d, politica: d.escopo === 'REGRA' ? lista.find(p => grupoDe(p) === d.regra_id) : null }))
    .sort((a, b) => (a.politica ? 1 : 0) - (b.politica ? 1 : 0)
      || codigoPolitica(a.politica).localeCompare(codigoPolitica(b.politica), 'pt-BR', { numeric: true })
      || a.doc.nome.localeCompare(b.doc.nome, 'pt-BR'))
}

export const anexosDoDocumentoPj = (anexos, doc, funcionarioId, periodo) => (anexos || [])
  .filter(a => a.documento_id === doc.id && a.funcionario_id === funcionarioId && a.periodo === periodo)

// "Todos os prestadores PJ" ou "PJ006-1 Unimed - 30% Coparticipação" (+ "Opcional").
export const origemDocumentoPj = (item) => `${item.politica ? `${codigoPolitica(item.politica)} ${item.politica.descricao_comissao || ''}`.trim() : 'Todos os prestadores PJ'}${item.doc.obrigatorio ? '' : ' · Opcional'}`

// Campos gravados em pj_anexos ao anexar este documento.
export const dadosAnexoDocumento = (item, funcionarioId, periodo) => ({
  funcionarioId, periodo, tipo: 'DOCUMENTO', documentoId: item.doc.id, regraId: item.doc.regra_id || null, documento: item.doc.nome,
})
