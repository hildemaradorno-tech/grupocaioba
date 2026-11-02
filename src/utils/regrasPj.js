// Regra PJ "Percentual sobre regras" — monta o detalhe mostrado no modal Base de Cálculo (telas
// de Comissões e Processamento): cada regra usada, DE ONDE vem o valor dela, o % e o resultado.

const textoCodigo = (p) => [p?.codigo_politica, p?.descricao_comissao].filter(Boolean).join(' ')

// De onde vem o valor de uma regra PJ usada pelo Percentual.
export function origemRegraPj(regra, politicas = []) {
  if (!regra) return ''
  if (regra.pj_variaveis) {
    const nomes = (regra.pj_politica_ids || [])
      .map(id => politicas.find(p => (p.grupo_politica_id || p.id) === id))
      .filter(Boolean)
      .map(textoCodigo)
    return `Soma das comissões calculadas no período: ${[...new Set(nomes)].join(' + ') || '—'}`
  }
  const n = (regra.pj_empresas || []).length
  return `Valor fixo cadastrado na regra${n > 0 ? ` (${n} empresa${n === 1 ? '' : 's'})` : ''}`
}

// percentualPj gravado no cálculo, completado com a origem; cálculo antigo (só valorPorColuna, rótulo
// "PJ001 Descrição (8%)") é convertido pro mesmo formato.
export function montarPercentualPj({ politica, percentualPj, valorPorColuna, valorComissao, politicas = [] }) {
  if (!politica?.pj_percentual) return null
  const regrasPj = politicas.filter(p => p.prestacao_pj && !p.pj_percentual && p.cargo_id === politica.cargo_id)
  const acharRegra = (it) => politicas.find(p => (p.grupo_politica_id || p.id) === it.regraId)
    || regrasPj.find(p => (p.codigo_politica || '') === (it.codigo || '') && (p.descricao_comissao || '') === (it.descricao || ''))
    || regrasPj.find(p => it.codigo && p.codigo_politica === it.codigo)
  let itens = percentualPj?.itens
  if (!itens && Array.isArray(valorPorColuna)) {
    itens = valorPorColuna.map(col => {
      const m = String(col.coluna || '').match(/^(.*)\((\d+(?:[.,]\d+)?)%\)\s*$/)
      const texto = (m ? m[1] : String(col.coluna || '')).trim()
      const percentual = m ? Number(m[2].replace(',', '.')) : null
      const [codigo, ...resto] = texto.split(' ')
      const valor = Number(col.valor) || 0
      return { codigo, descricao: resto.join(' '), valor, percentual, resultado: percentual != null ? valor * percentual / 100 : null }
    })
  }
  if (!itens) return null
  const comOrigem = itens.map(it => {
    const regra = acharRegra(it)
    return { ...it, tipo: it.tipo || (regra ? (regra.pj_variaveis ? 'Variáveis' : 'Valor fixo') : ''), origem: origemRegraPj(regra, politicas) }
  })
  return {
    itens: comOrigem,
    base: percentualPj?.base ?? comOrigem.reduce((s, it) => s + (Number(it.valor) || 0), 0),
    comissao: percentualPj?.comissao ?? valorComissao ?? comOrigem.reduce((s, it) => s + (Number(it.resultado) || 0), 0),
  }
}
