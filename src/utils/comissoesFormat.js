// Formatadores e rótulos compartilhados pelas telas de Cálculo de Comissões e Processamento de
// Comissões (antes duplicados em cada página).

export const fmtBRL = (v) => v == null ? '-' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtPct = (v) => v == null ? '-' : `${parseFloat(v).toFixed(2)}%`
export const fmtDiaMes = (iso) => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : ''

// Rótulos das ações gravadas no histórico do lote (fato_comissoes_lotes_historico.acao).
export const ROTULO_ACAO_HISTORICO = {
  CRIADO: 'Cálculo realizado',
  CONFERIDO: 'Conferido',
  CONFERIDO_DP: 'Conferido pelo DP',
  PROCESSADO: 'Processado p/ pagamento',
  REPROCESSAMENTO_AUTORIZADO: 'Reprocessamento autorizado',
  REPROCESSAMENTO_SALVO: 'Correção salva — conferência do DP reaberta',
}

// Código da Política de Comissão (cadastro da política) — ordena as comissões nas telas de
// Comissões e Processamento: com código primeiro, em ordem numérica (2 antes de 10); sem código no fim.
export const codigoPolitica = (politica) => (politica?.codigo_politica || '').trim()
export const compararCodigoPolitica = (pa, pb) => {
  const a = codigoPolitica(pa), b = codigoPolitica(pb)
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b, 'pt-BR', { numeric: true })
}
// Texto da comissão com o código na frente ("001 — Comissão s/..."), pro PDF.
export const comissaoComCodigo = (politica, descricao) => {
  const codigo = codigoPolitica(politica)
  return codigo ? `${codigo} — ${descricao}` : descricao
}

export const TIPOS_META_LABEL = { pecas: 'Peças', mecanico: 'Serviços — Mecânico', consultor: 'Serviços — Consultor', funilaria: 'Funilaria/Pintura', terceiros: 'Terceiros' }
export const CAMPO_META_LABEL = { pecas: ' · só Peças', servicos: ' · só Serviços' }

// Faixas da Regra da política (na ordem cadastrada), marcando a que foi aplicada (mesmo percentual
// calculado da linha) — usado na tela e no PDF pra mostrar a regra completa.
export const faixasDaRegra = (politica, valorAplicado) => {
  if (politica?.usa_faixa !== 'SIM') return []
  const tipoFaixa = politica.regra_comissao?.tipo_faixa
  const porMeta = tipoFaixa !== 'VALOR'
  const fixo = tipoFaixa === 'VALOR_FIXO_META'
  return [...(politica.regra_comissao?.faixas || [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map(f => ({
      texto: `${f.operador} ${porMeta ? `${parseFloat(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% da meta` : fmtBRL(parseFloat(f.valor))}`,
      percentual: fixo ? fmtBRL(parseFloat(f.percentual)) : `${parseFloat(f.percentual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}%`,
      aplicada: valorAplicado != null && parseFloat(f.percentual) === parseFloat(valorAplicado),
    }))
}
