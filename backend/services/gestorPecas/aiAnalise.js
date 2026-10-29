// Gestor de Peças 2.0 — análises com IA (via adaptador único chamarIA, provedor em AI_PROVIDER).
// A IA recebe só RESUMOS (KPIs + linhas mais relevantes), nunca o dataset inteiro.
// Sem chave de IA configurada (ou se o provedor falhar), devolve uma análise por regras calculada
// aqui mesmo, para a tela continuar funcional — o campo `motor` diz qual das duas respondeu.
import { chamarIA } from '../auditAiService.js'

const fmtR = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const loja = (n) => String(n || '').replace(/^CAIOB[AÁ] (TRUCKS|MOTOS) - /i, '')

const CONTEXTO_SEGMENTO = {
  trucks: 'concessionárias de caminhões (pós-venda DAF, grupo Caioba Trucks, lojas em Campo Grande, Dourados, Três Lagoas e Chapadão do Sul; dados de origem: Dealer.net)',
  motos: 'concessionárias de motos (pós-venda Honda, grupo Caioba Motos, lojas em Campo Grande e Barretos; dados de origem: MicroWork)',
}
const sistemaBase = (segmento) => `Você é um especialista sênior em gestão de estoque e compras de peças para ${CONTEXTO_SEGMENTO[segmento] || CONTEXTO_SEGMENTO.trucks}.
Domina curva ABC/XYZ, frequência de vendas, estoque de segurança, ponto de pedido, cobertura, ruptura, excesso, obsolescência, giro, transferência entre lojas, precificação e negociação com fornecedores.
Responda SEMPRE em português do Brasil, de forma objetiva e acionável, citando códigos de item, lojas e valores quando houver.

GLOSSÁRIO DO GESTOR (use exatamente estes significados — eles seguem o Dealer.net/MicroWork da empresa, não a literatura):
- abc = Curva de Venda: % acumulado da quantidade (ou valor) vendida no período configurado. A = itens que fazem os primeiros 70%.
- xyz = Curva de Estoque: % acumulado do VALOR EM ESTOQUE (custo médio × saldo). X = itens que concentram os primeiros 70% do dinheiro em estoque. NÃO é variabilidade da demanda.
- freq = Popularidade: meses com venda nos últimos 12 (F alta, M média, R baixa).
- reg = Regularidade da demanda (E estável, V variável, I irregular) — coeficiente de variação mensal.
- mobilidade = tempo desde a última saída: Rápido, Lento, Parado, Obsoleto (D = Curva D).
- politica = dias de estoque da célula Curva de Venda × XYZ ("Sob encomenda" = 0 dias, não gera compra).`

const FORMATO_JSON = `Responda SOMENTE com JSON válido, sem texto fora do JSON, no formato:
{
  "resumo": "2 a 4 frases com o diagnóstico geral",
  "achados": [{ "titulo": "string", "detalhe": "string" }],
  "riscos": [{ "titulo": "string", "detalhe": "string", "impacto": "Alto|Médio|Baixo" }],
  "acoes": [{ "acao": "string", "prioridade": "Alta|Média|Baixa", "itens": ["códigos de item citados"], "ganho_estimado": "string opcional" }]
}
Máximo de 6 achados, 4 riscos e 8 ações.`

// Campos enviados por linha, por tela (o resto é descartado para economizar tokens)
const CAMPOS = {
  padrao: ['codigo', 'descricao', 'empresa_nome', 'abc', 'xyz', 'freq', 'reg', 'mobilidade', 'saldo', 'valor_estoque', 'media_mensal', 'cobertura_dias', 'situacao'],
  reposicao: ['codigo', 'descricao', 'empresa_nome', 'fornecedor', 'abc', 'saldo', 'pendente', 'ponto_pedido', 'estoque_maximo', 'sugestao_compra', 'valor_sugestao', 'transferencia_entrada', 'ruptura'],
  promocoes: ['codigo', 'descricao', 'empresa_nome', 'situacao', 'qtd_liquidar', 'margem_atual', 'desconto_sugerido', 'capital_liberado', 'motivo'],
  pedidos: ['pedido', 'codigo', 'descricao', 'empresa_nome', 'fornecedor', 'saldo_pedido', 'valor', 'dias_atraso', 'saldo_estoque', 'criticidade'],
  transferencias: ['codigo', 'descricao', 'loja_origem', 'loja_destino', 'qtd', 'valor', 'motivo'],
  anomalias: ['codigo', 'descricao', 'empresa_nome', 'severidade', 'motivos', 'valor', 'custo', 'preco', 'margem'],
  fornecedores: ['fornecedor', 'compras', 'valor_12m', 'lead_time_real', 'lead_time_cadastro', 'pct_no_prazo', 'fill_rate', 'abertos_atrasados', 'nota'],
  demanda: ['codigo', 'descricao', 'abc', 'qtd12', 'qtd12_anterior', 'variacao_ano', 'tendencia', 'previsao_mes', 'saldo'],
  classificacao: ['codigo', 'descricao', 'abc', 'xyz', 'freq', 'reg', 'mobilidade', 'politica', 'qtd_periodo', 'part_fat', 'part_xyz', 'cv', 'meses_com_venda', 'valor_estoque'],
}

function enxugar(rows, campos, limite = 25) {
  return (rows || []).slice(0, limite).map(r => Object.fromEntries(campos.filter(c => r[c] !== undefined).map(c => [c, c.startsWith('empresa') || c.startsWith('loja_') ? loja(r[c]) : r[c]])))
}

function extrairJson(texto) {
  const ini = texto.indexOf('{'), fim = texto.lastIndexOf('}')
  if (ini < 0 || fim <= ini) throw new Error('IA retornou um formato inesperado.')
  return JSON.parse(texto.slice(ini, fim + 1))
}

/** Monta o contexto resumido de uma tela: { titulo, kpis, listas: { nome: rows } } */
export function contextoTela(tela, dados) {
  const k = dados.kpis || {}
  const L = {}
  switch (tela) {
    case 'reposicao': L['Sugestões de compra (prioridade)'] = enxugar(dados.rows, CAMPOS.reposicao, 30); L['Por fornecedor'] = (dados.porFornecedor || []).slice(0, 10); break
    case 'promocoes': L['Candidatos à promoção'] = enxugar(dados.rows, CAMPOS.promocoes, 30); break
    case 'pedidos-pendentes': L['Pedidos pendentes (mais atrasados)'] = enxugar(dados.rows, CAMPOS.pedidos, 30); L['Por fornecedor'] = (dados.porFornecedor || []).slice(0, 10); break
    case 'transferencias': L['Transferências sugeridas'] = enxugar(dados.rows, CAMPOS.transferencias, 30); L['Rotas'] = dados.rotas; break
    case 'anomalias-compra': case 'anomalias-preco': L['Anomalias'] = enxugar(dados.rows, CAMPOS.anomalias, 30); break
    case 'fornecedores': L['Fornecedores'] = enxugar(dados.rows, CAMPOS.fornecedores, 20); break
    case 'demanda': L['Itens em crescimento'] = enxugar(dados.crescentes, CAMPOS.demanda, 15); L['Itens em queda'] = enxugar(dados.em_queda, CAMPOS.demanda, 15); L['Sazonalidade (índice por mês)'] = dados.sazonalidade; L['Por tipo de produto'] = (dados.porGrupo || []).slice(0, 12); break
    case 'classificacao': L['Curva de Venda (abc)'] = dados.abc; L['Curva XYZ (valor em estoque)'] = dados.xyz; L['Popularidade (freq)'] = dados.freq; L['Regularidade (reg)'] = dados.reg; L['Mobilidade'] = dados.mobilidade; L['Política de compra — Venda × XYZ'] = (dados.matrizCompra || []).map(({ orientacao, ...m }) => m); L['Configuração'] = dados.parametros; break
    case 'excesso-obsoletos': L['Maiores excessos'] = enxugar(dados.excesso, CAMPOS.padrao, 15); L['Maiores obsoletos'] = enxugar(dados.obsoletos, CAMPOS.padrao, 15); L['Pré-obsoletos'] = enxugar(dados.pre_obsoletos, CAMPOS.padrao, 15); L['Por loja'] = dados.porLoja; break
    case 'cobertura-ruptura': L['Itens em ruptura/risco'] = enxugar((dados.rows || []).filter(r => r.ruptura || r.ruptura_projetada), [...CAMPOS.padrao, 'venda_perdida_mes', 'pendente', 'lead_time'], 30); L['Por classe'] = dados.porClasse; L['Por loja'] = dados.porLoja; break
    case 'estoque': L['Por loja'] = dados.porLoja; L['Por tipo de produto'] = (dados.porGrupo || []).slice(0, 12); L['Por marca'] = (dados.porMarca || []).slice(0, 10); break
    case 'produto': L['Item'] = dados.item; L['Por loja'] = enxugar(dados.lojas, [...CAMPOS.padrao, 'previsao_mes', 'tendencia', 'pendente', 'ponto_pedido', 'estoque_maximo', 'sugestao_compra'], 10); L['Vendas mensais (total) e preço/custo'] = (dados.series || []).map(s => ({ mes: s.mes, total: s.total, custo: s.custo, preco: s.preco })); L['Últimas compras'] = (dados.compras || []).slice(0, 8); break
    default: L['Situação do estoque'] = dados.porSituacao; L['Por loja'] = dados.porLoja; L['Alertas por tipo'] = dados.porTipo; L['Principais alertas'] = enxugar(dados.alertas, ['tipo', 'severidade', 'codigo', 'descricao', 'empresa_nome', 'valor', 'mensagem'], 30)
  }
  return { kpis: k, listas: L }
}

// ── Análise por regras (fallback sem IA) ─────────────────────────────────────
function analiseRegras(tela, dados) {
  const k = dados.kpis || {}
  const achados = [], riscos = [], acoes = []
  const top = (rows, n = 5) => (rows || []).slice(0, n).map(r => r.codigo).filter(Boolean)
  switch (tela) {
    case 'reposicao':
      achados.push({ titulo: 'Volume de compra sugerido', detalhe: `${k.itens_comprar} itens a comprar, total de ${fmtR(k.valor_sugestao)}.` })
      if (k.itens_cobertos_transferencia) achados.push({ titulo: 'Transferências evitam compra', detalhe: `${k.itens_cobertos_transferencia} necessidades podem ser atendidas por outra loja (${fmtR(k.valor_evitado_transferencia)} sem desembolso).` })
      if (k.em_ruptura) riscos.push({ titulo: 'Itens já em ruptura', detalhe: `${k.em_ruptura} itens abaixo do ponto de pedido estão zerados.`, impacto: 'Alto' })
      acoes.push({ acao: 'Aprovar primeiro as sugestões de itens em ruptura e curva A', prioridade: 'Alta', itens: top((dados.rows || []).filter(r => r.ruptura)) })
      acoes.push({ acao: 'Efetivar as transferências antes de emitir os pedidos', prioridade: 'Alta', itens: top((dados.rows || []).filter(r => r.transferencia_entrada > 0)) })
      break
    case 'promocoes':
      achados.push({ titulo: 'Capital que pode ser liberado', detalhe: `${k.candidatos} candidatos somam ${fmtR(k.capital_liberado)} de custo; receita potencial ${fmtR(k.receita_potencial)} com desconto médio de ${k.desconto_medio}%.` })
      acoes.push({ acao: 'Montar campanha com os 20 primeiros do ranking (maior capital parado)', prioridade: 'Alta', itens: top(dados.rows, 8) })
      break
    case 'pedidos-pendentes':
      achados.push({ titulo: 'Pedidos atrasados', detalhe: `${k.atrasados} itens atrasados (${fmtR(k.valor_atrasado)}); ${k.criticos} críticos (item zerado).` })
      if (k.criticos) riscos.push({ titulo: 'Atraso com ruptura', detalhe: 'Itens críticos estão sem saldo e o pedido não chegou.', impacto: 'Alto' })
      acoes.push({ acao: 'Cobrar fornecedores dos pedidos críticos e avaliar transferência entre lojas', prioridade: 'Alta', itens: top((dados.rows || []).filter(r => r.criticidade === 'Crítica')) })
      break
    case 'transferencias':
      achados.push({ titulo: 'Realocação possível', detalhe: `${k.sugestoes} transferências (${k.qtd} un, ${fmtR(k.valor)}), ${k.rupturas_resolvidas} resolvem rupturas.` })
      acoes.push({ acao: 'Gerar as transferências que resolvem ruptura', prioridade: 'Alta', itens: top((dados.rows || []).filter(r => r.motivo === 'Destino em ruptura')) })
      break
    case 'excesso-obsoletos':
      achados.push({ titulo: 'Capital parado', detalhe: `Excesso ${fmtR(k.excesso_valor)} (${k.excesso_itens} itens), obsoleto ${fmtR(k.obsoleto_valor)} (${k.obsoleto_itens}), pré-obsoleto ${fmtR(k.pre_obsoleto_valor)} (${k.pre_obsoleto_itens}).` })
      riscos.push({ titulo: 'Pré-obsoletos virando obsoletos', detalhe: 'Agir agora (promoção/transferência) custa menos desconto do que depois.', impacto: 'Médio' })
      acoes.push({ acao: 'Bloquear novas compras dos itens obsoletos e pré-obsoletos', prioridade: 'Alta', itens: top(dados.obsoletos) })
      acoes.push({ acao: 'Levar os maiores excessos para a tela de Promoções/Transferências', prioridade: 'Média', itens: top(dados.excesso) })
      break
    case 'anomalias-compra': case 'anomalias-preco':
      achados.push({ titulo: 'Anomalias encontradas', detalhe: `${k.compras ?? k.itens} ocorrências, ${k.criticas} críticas.` })
      acoes.push({ acao: 'Revisar as ocorrências críticas com o comprador/precificação', prioridade: 'Alta', itens: top(dados.rows) })
      break
    case 'produto': {
      const it = dados.item || {}
      const lj = dados.lojas || []
      const margem = it.preco ? (it.preco - it.custo) / it.preco : null
      achados.push({ titulo: 'Classificação', detalhe: `${it.descricao}: classe ${it.classe || '—'} (${it.politica || '—'}), vendas 12m ${it.qtd12 ?? '—'} un, tendência ${Math.round((it.tendencia || 0) * 100)}%/ano.` })
      for (const l of lj) achados.push({ titulo: loja(l.empresa_nome), detalhe: `${l.situacao}: saldo ${l.saldo}, pendente ${l.pendente}, cobertura ${l.cobertura_dias ?? '∞'} dias, sugestão de compra ${l.sugestao_compra}.` })
      if (margem != null && margem < 0.15) riscos.push({ titulo: 'Margem baixa', detalhe: `Margem atual de ${Math.round(margem * 100)}%.`, impacto: 'Alto' })
      if (lj.some(l => l.ruptura)) riscos.push({ titulo: 'Ruptura', detalhe: `Zerado em ${lj.filter(l => l.ruptura).map(l => loja(l.empresa_nome)).join(', ')}.`, impacto: 'Alto' })
      if (lj.some(l => l.transferencia_entrada > 0)) acoes.push({ acao: 'Transferir entre lojas antes de comprar (ver Realocação)', prioridade: 'Alta', itens: [it.codigo] })
      if (lj.some(l => l.sugestao_compra > 0)) acoes.push({ acao: `Comprar ${lj.reduce((a, l) => a + l.sugestao_compra, 0)} un (ver Reposição)`, prioridade: 'Alta', itens: [it.codigo] })
      if (lj.some(l => ['Excesso', 'Pré-obsoleto', 'Obsoleto'].includes(l.situacao))) acoes.push({ acao: 'Avaliar promoção do excedente e bloquear novas compras', prioridade: 'Média', itens: [it.codigo] })
      break
    }
    default:
      if (k.valor != null) achados.push({ titulo: 'Estoque', detalhe: `${fmtR(k.valor)} em estoque, giro ${k.giro_anual ?? '—'}x/ano, cobertura média ${k.cobertura_media_dias ?? '—'} dias.` })
      if (k.pct_ruptura != null) achados.push({ titulo: 'Ruptura', detalhe: `${k.pct_ruptura}% dos itens com giro estão zerados; venda perdida estimada ${fmtR(k.venda_perdida_mes)}/mês.` })
      if (k.excesso_valor != null) achados.push({ titulo: 'Excesso e obsoletos', detalhe: `Excesso ${fmtR(k.excesso_valor)}, obsoleto ${fmtR(k.obsoleto_valor)} (${k.pct_obsoleto}% do estoque).` })
      if (k.sugestao_compra_valor != null) acoes.push({ acao: `Revisar a sugestão de compra (${fmtR(k.sugestao_compra_valor)}) priorizando rupturas`, prioridade: 'Alta', itens: [] })
      if (k.transferencias_valor) acoes.push({ acao: `Executar transferências sugeridas (${fmtR(k.transferencias_valor)}) antes de comprar`, prioridade: 'Alta', itens: [] })
      if (k.pedidos_atrasados) riscos.push({ titulo: 'Pedidos atrasados', detalhe: `${k.pedidos_atrasados} itens com pedido atrasado.`, impacto: 'Alto' })
  }
  return {
    resumo: achados.map(a => a.detalhe).slice(0, 2).join(' ') || 'Sem destaques para os filtros atuais.',
    achados, riscos, acoes,
  }
}

function avisoSemIA(err) {
  return `Análise gerada por regras (IA indisponível: ${err.message}). Configure a chave do provedor de IA no backend (AI_PROVIDER + GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY) para a análise completa.`
}

/** Análise da tela atual (ou resumo executivo quando tela = 'painel'/'alertas'). */
export async function analisarTela({ tela, titulo, dados, filtros, segmento }) {
  const ctx = contextoTela(tela, dados)
  const userPrompt = `Tela: ${titulo || tela}
Filtros aplicados: ${JSON.stringify(filtros || {})}
Indicadores: ${JSON.stringify(ctx.kpis)}
${Object.entries(ctx.listas).map(([nome, v]) => `${nome}: ${JSON.stringify(v)}`).join('\n')}

Analise esses dados, aponte padrões, tendências, causas prováveis e riscos, e proponha ações concretas priorizadas (citando itens/lojas).`
  try {
    const texto = await chamarIA({ systemPrompt: `${sistemaBase(segmento)}\n\n${FORMATO_JSON}`, userPrompt, jsonMode: true })
    return { motor: 'ia', ...extrairJson(texto) }
  } catch (err) {
    return { motor: 'regras', aviso: avisoSemIA(err), ...analiseRegras(tela, dados) }
  }
}

/** Chat livre sobre o estoque. `contexto` = resumo do painel/alertas + itens citados na pergunta. */
export async function conversar({ mensagem, historico = [], contexto, segmento }) {
  const systemPrompt = `${sistemaBase(segmento)}
Você é o Assistente do Gestor de Peças 2.0. Use os dados abaixo (situação atual do estoque, já filtrada pelas lojas do usuário). Se a pergunta exigir dados que não estão aqui, diga quais telas do Gestor consultar (Classificação, Demanda, Reposição, Cobertura e Ruptura, Excesso e Obsoletos, Promoções, Pedidos Pendentes, Transferências, Anomalias, Evolução do Produto, Fornecedores).
Use markdown simples (listas, negrito) e seja conciso.

DADOS:
${JSON.stringify(contexto)}`
  const historicoTexto = historico.slice(-8).map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.text}`).join('\n')
  const userPrompt = historicoTexto ? `${historicoTexto}\nUsuário: ${mensagem}` : mensagem
  try {
    const resposta = await chamarIA({ systemPrompt, userPrompt, jsonMode: false })
    return { motor: 'ia', resposta }
  } catch (err) {
    return { motor: 'regras', resposta: `⚠️ ${avisoSemIA(err)}\n\nEnquanto isso, use o **Resumo executivo** (análise por regras) ou as telas do Gestor para a pergunta: "${mensagem}".` }
  }
}
