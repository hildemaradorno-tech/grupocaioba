// Nota Fiscal do Prestador PJ (Prestadores de Serviços → Emitir Nota Fiscal): tabela-resumo com as
// regras do prestador nas linhas e as empresas (por marca/agrupamento, com CNPJ) nas colunas.
// O modal da tela e a 1ª página do PDF usam a mesma estrutura:
// nf = { prestador, colunas: [{ id, nome, cnpj, marca, agrupamento }],
//        linhas: [{ codigo, rotulo, valores: [n por coluna], total }], totaisColuna: [n], total }

import { fmtBRL } from './comissoesFormat'
import { esc } from './comissoesPdf'
import { montarPercentualPj } from './regrasPj'

export const fmtCnpj = (v) => {
  const d = String(v || '').replace(/\D/g, '')
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : (v || '')
}

// Faixas de cabeçalho: colunas seguidas da mesma marca / agrupamento viram uma célula só (colspan).
export const gruposDeCabecalho = (colunas, campo) => {
  const grupos = []
  colunas.forEach(c => {
    const rotulo = c[campo] || ''
    const ultimo = grupos[grupos.length - 1]
    if (ultimo && ultimo.rotulo === rotulo) ultimo.span++
    else grupos.push({ rotulo, span: 1 })
  })
  return grupos
}

const normNome = (v) => String(v || '').normalize('NFD').replace(/\p{M}/gu, '').trim().toUpperCase()
const grupoDe = (p) => p.grupo_politica_id || p.id
const codigoDe = (p) => (p?.codigo_politica || '').trim()

// Monta a nota a partir das linhas calculadas/salvas do prestador:
// linhas = [{ politica, valor, detalhe: [{ empresa, valorComissao }] }] (detalhe = detalhe por empresa).
// Comissões de uma Regra PJ "Variáveis" do cargo viram uma linha só; % sobre regras (pagamento ou
// desconto) aplica o % no valor de cada regra em cada empresa; Bonificação divide igual entre as
// empresas da regra; linha sem detalhe divide igual entre as colunas.
export function montarNotaFiscalPj({ linhas: entrada, politicas = [], empresas = [], prestador = '', emissaoConfig = null }) {
  if (!entrada?.length) return null
  const empresasPorId = Object.fromEntries(empresas.map(e => [e.id, e]))
  const porNome = new Map()
  empresas.forEach(e => [e.empresa_fantasia, e.nome_empresa, e.nome_empresa_sistema, e.sigla_empresa]
    .filter(Boolean).forEach(n => { if (!porNome.has(normNome(n))) porNome.set(normNome(n), e) }))
  const cargoId = entrada.find(l => l.politica?.cargo_id)?.politica.cargo_id
  const regrasVariaveis = politicas.filter(p => p.pj_variaveis && p.ativo !== false && (!cargoId || p.cargo_id === cargoId))
  const variaveisDe = (p) => regrasVariaveis.find(r => (r.pj_politica_ids || []).includes(grupoDe(p))) || null
  const mapaDetalhe = (l) => {
    const lista = (l.detalhe || []).filter(d => Math.round((Number(d.valorComissao) || 0) * 100) !== 0)
    if (lista.length === 0) return null
    const m = new Map()
    lista.forEach(d => { const id = porNome.get(normNome(d.empresa))?.id || `?${d.empresa}`; m.set(id, (m.get(id) || 0) + (Number(d.valorComissao) || 0)) })
    return m
  }

  const linhas = []
  const porVariaveis = new Map()
  for (const l of entrada) {
    if (!l.politica) continue
    const rv = variaveisDe(l.politica)
    if (rv) {
      if (!porVariaveis.has(rv.id)) { const g = { politica: rv, comps: [] }; porVariaveis.set(rv.id, g); linhas.push(g) }
      porVariaveis.get(rv.id).comps.push(l)
    } else linhas.push({ politica: l.politica, comps: [l] })
  }
  linhas.forEach(l => {
    l.total = l.comps.reduce((acc, c) => acc + (Number(c.valor) || 0), 0)
    const p = l.politica
    if (p.pj_percentual || p.pj_desconto?.tipo === 'PERCENTUAL') { l.mapa = undefined; return }
    if (p.pj_bonificacao) {
      const ids = (p.pj_bonificacao.empresa_ids || []).filter(id => empresasPorId[id])
      l.mapa = ids.length ? new Map(ids.map(id => [id, l.total / ids.length])) : null
      return
    }
    const mapas = l.comps.map(mapaDetalhe)
    if (mapas.some(m => !m)) { l.mapa = null; return }
    l.mapa = new Map()
    mapas.forEach(m => m.forEach((v, id) => l.mapa.set(id, (l.mapa.get(id) || 0) + v)))
  })
  linhas.filter(l => l.mapa === undefined).forEach(l => {
    const p = l.politica
    const itens = p.pj_desconto ? (p.pj_desconto.itens || []) : (p.pj_percentuais || [])
    const sinal = p.pj_desconto ? -1 : 1
    const m = new Map()
    let ok = true
    itens.forEach(it => {
      const ref = linhas.find(x => grupoDe(x.politica) === it.regra_id)
      if (!ref || !(ref.mapa instanceof Map)) { ok = false; return }
      ref.mapa.forEach((v, id) => m.set(id, (m.get(id) || 0) + sinal * v * (Number(it.percentual) || 0) / 100))
    })
    l.mapa = ok && m.size ? m : null
  })

  const colunas = [...new Set(linhas.flatMap(l => l.mapa ? [...l.mapa.keys()] : []))].map(id => {
    const e = empresasPorId[id]
    return e
      ? { id, nome: e.nome_empresa_sistema || e.empresa_fantasia || e.nome_empresa, cnpj: e.cnpj, marca: e.marca || '', agrupamento: e.agrupamento_nome || '' }
      : { id, nome: id.slice(1), cnpj: '', marca: '', agrupamento: '' }
  }).sort((a, b) => (a.agrupamento || '~').localeCompare(b.agrupamento || '~', 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'))

  const linhasNf = linhas.map(l => {
    const valores = colunas.map(col => l.mapa ? (l.mapa.get(col.id) || 0) : (colunas.length ? l.total / colunas.length : 0))
    // Centavos de arredondamento vão pra última empresa com valor — a linha fecha com o total.
    const arred = valores.map(v => Math.round(v * 100) / 100)
    const dif = Math.round((l.total - arred.reduce((a, v) => a + v, 0)) * 100) / 100
    const idx = arred.map((v, i) => (v !== 0 ? i : -1)).filter(i => i >= 0).pop()
    if (dif && idx != null) arred[idx] = Math.round((arred[idx] + dif) * 100) / 100
    return { politicaId: l.politica.id, codigo: codigoDe(l.politica), rotulo: `${l.politica.pj_desconto ? '(-) ' : ''}${l.politica.descricao_comissao || '-'}`, valores: arred, total: l.total }
  }).sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))

  const totaisColuna = colunas.map((_, i) => linhasNf.reduce((acc, l) => acc + l.valores[i], 0))
  return {
    prestador,
    colunas,
    linhas: linhasNf,
    totaisColuna,
    total: linhasNf.reduce((acc, l) => acc + l.total, 0),
    emissao: emissaoNotasFiscais({ colunas, totaisColuna }, emissaoConfig, empresasPorId),
  }
}

// Forma de emitir as NFs (cadastro do Funcionário → aba PJ, pj_emissao_nf):
//  RATEADA     — uma NF por CNPJ, cada empresa com o seu valor (padrão);
//  UNICA       — uma NF só, pra empresa escolhida, com o total de todas;
//  AGRUPAMENTO — uma NF por agrupamento, pra empresa escolhida de cada um, com o total do agrupamento.
// Retorna { modo, notas: [{ nome, cnpj, valor, referente: [nomes] }] }.
export const MODOS_EMISSAO_NF = { RATEADA: 'Uma NF por CNPJ', UNICA: 'Uma NF única', AGRUPAMENTO: 'Uma NF por agrupamento' }
function emissaoNotasFiscais({ colunas, totaisColuna }, cfg, empresasPorId) {
  const modo = cfg?.modo && MODOS_EMISSAO_NF[cfg.modo] ? cfg.modo : 'RATEADA'
  const cols = colunas.map((c, i) => ({ ...c, valor: totaisColuna[i] })).filter(c => Math.round(c.valor * 100) !== 0)
  const destino = (id, fallback) => {
    const e = id && empresasPorId[id]
    return e ? { nome: e.nome_empresa_sistema || e.empresa_fantasia || e.nome_empresa, cnpj: e.cnpj } : { nome: fallback?.nome || '—', cnpj: fallback?.cnpj || '' }
  }
  if (modo === 'UNICA') {
    return { modo, notas: cols.length ? [{ ...destino(cfg.empresa_id, cols[0]), valor: cols.reduce((a, c) => a + c.valor, 0), referente: cols.map(c => c.nome) }] : [] }
  }
  if (modo === 'AGRUPAMENTO') {
    const grupos = new Map()
    cols.forEach(c => { if (!grupos.has(c.agrupamento)) grupos.set(c.agrupamento, []); grupos.get(c.agrupamento).push(c) })
    // Por agrupamento: a empresa escolhida recebe o total do agrupamento, ou 'RATEADA' = uma NF por CNPJ
    // só naquele agrupamento (ex: Motos por CNPJ e Trucks tudo em Campo Grande).
    return { modo, notas: [...grupos.entries()].flatMap(([agrup, lista]) => cfg.por_agrupamento?.[agrup] === 'RATEADA'
      ? lista.map(c => ({ nome: c.nome, cnpj: c.cnpj, agrupamento: agrup, valor: c.valor, referente: [c.nome] }))
      : [{
        ...destino(cfg.por_agrupamento?.[agrup], lista[0]), agrupamento: agrup,
        valor: lista.reduce((a, c) => a + c.valor, 0), referente: lista.map(c => c.nome),
      }]) }
  }
  return { modo, notas: cols.map(c => ({ nome: c.nome, cnpj: c.cnpj, valor: c.valor, referente: [c.nome] })) }
}

// Anexos (pj_anexos tipo NF): cada nota do quadro de emissão é identificada pelo CNPJ (só dígitos),
// ou pelo nome da empresa quando não tem CNPJ cadastrado.
export const chaveNotaFiscal = (nota) => String(nota?.cnpj || '').replace(/\D/g, '') || nota?.nome || ''
export const anexosDaNota = (anexos, nota, funcionarioId, periodo) => (anexos || []).filter(a => a.tipo === 'NF'
  && a.funcionario_id === funcionarioId && a.periodo === periodo && a.cnpj === chaveNotaFiscal(nota))
// Todas as notas do quadro com pelo menos um arquivo anexado.
export const notasFiscaisRecebidas = (nf, anexos, funcionarioId, periodo) => !!nf?.emissao?.notas?.length
  && nf.emissao.notas.every(n => anexosDaNota(anexos, n, funcionarioId, periodo).length > 0)

// Etapa da Nota Fiscal do PJ num lote já Conferido DP (pj_nf_envios + funcionarios_processados):
// 'recebida' (Processamento confirmou), 'enviada' (PJ confirmou, falta receber), 'devolvida' ou 'aguardando'.
export const etapaNfPj = (lote, funcionarioId, envio) => {
  if (lote?.funcionarios_processados?.includes(funcionarioId)) return 'recebida'
  if (envio?.status === 'ENVIADA' || envio?.status === 'RECEBIDA') return 'enviada'
  if (envio?.status === 'DEVOLVIDA') return 'devolvida'
  return 'aguardando'
}
// Rótulo visto pelo PJ (Minha Nota Fiscal) e em Prestadores de Serviços.
export const STATUS_NF_PRESTADOR = {
  aguardando: { label: 'Aguardando Nota Fiscal', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  devolvida: { label: 'Nota Fiscal Devolvida', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  enviada: { label: 'Aguardando recebimento da Nota Fiscal', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  recebida: { label: 'Nota Fiscal Recebida', className: 'bg-teal-600 text-white border-teal-600' },
}

const montarHtmlEmissao = (em) => !em?.notas?.length ? '' : `
      <div style="margin-bottom:16px;border:1px solid #a7f3d0;border-radius:6px;overflow:hidden;">
        <div style="background:#ecfdf5;padding:6px 10px;font-size:13px;font-weight:700;color:#065f46;">Emissão das Notas Fiscais</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr style="font-size:11px;color:#64748b;text-transform:uppercase;"><th style="padding:5px 10px;text-align:left;">Emitir para</th><th style="padding:5px 10px;text-align:left;">CNPJ</th><th style="padding:5px 10px;text-align:left;">Referente a</th><th style="padding:5px 10px;text-align:right;">Valor da NF</th></tr>
          ${em.notas.map(n => `<tr><td style="padding:5px 10px;font-weight:700;">${esc(n.nome)}</td><td style="padding:5px 10px;font-family:monospace;">${esc(fmtCnpj(n.cnpj))}</td><td style="padding:5px 10px;color:#64748b;font-size:11px;">${esc(n.referente.join(', '))}</td><td style="padding:5px 10px;text-align:right;font-family:monospace;font-weight:700;">${fmtBRL(n.valor)}</td></tr>`).join('')}
        </table>
      </div>`

const valorCel = (v) => (Math.round((Number(v) || 0) * 100) === 0 ? '-' : fmtBRL(v))

export function montarHtmlNotaFiscal(nf, { periodoLabel, largura = 1600 }) {
  const cab = (campo, cor) => gruposDeCabecalho(nf.colunas, campo).map(g =>
    `<th colspan="${g.span}" style="padding:6px 8px;text-align:center;background:${cor};color:#fff;font-size:13px;">${esc(g.rotulo)}</th>`).join('')
  const linhas = nf.linhas.map(l => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-weight:600;color:${l.total < 0 ? '#be123c' : '#1e293b'};white-space:nowrap;">
        ${l.codigo ? `<span style="font-family:monospace;color:#94a3b8;margin-right:6px;">${esc(l.codigo)}</span>` : ''}${esc(l.rotulo)}
      </td>
      ${l.valores.map(v => `<td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;color:${v < 0 ? '#be123c' : '#334155'};">${valorCel(v)}</td>`).join('')}
      <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-family:monospace;font-weight:700;color:${l.total < 0 ? '#be123c' : '#0f172a'};">${valorCel(l.total)}</td>
    </tr>`).join('')
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px;width:${largura}px;box-sizing:border-box;">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;margin-bottom:16px;">
        <div>
          <div style="font-size:22px;font-weight:800;color:#0f172a;">Nota Fiscal — Prestação de Serviços</div>
          <div style="font-size:15px;font-weight:700;color:#1e293b;margin-top:2px;">${esc(nf.prestador)}</div>
        </div>
        <div style="text-align:right;font-size:13px;color:#475569;">
          <div>Período: ${esc(periodoLabel)}</div>
          <div>Gerado em: ${new Date().toLocaleString('pt-BR')}</div>
        </div>
      </div>
      ${montarHtmlEmissao(nf.emissao)}
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr><th></th>${cab('marca', '#1e40af')}<th></th></tr>
          <tr><th></th>${gruposDeCabecalho(nf.colunas, 'agrupamento').map(g => `<th colspan="${g.span}" style="padding:5px 8px;text-align:center;background:#e2e8f0;color:#1e293b;">${esc(g.rotulo)}</th>`).join('')}<th></th></tr>
          <tr>
            <th></th>
            ${nf.colunas.map(c => `<th style="padding:6px 8px;text-align:right;font-size:11px;color:#334155;">${esc(c.nome)}<div style="font-weight:400;color:#64748b;margin-top:2px;">${esc(fmtCnpj(c.cnpj))}</div></th>`).join('')}
            <th style="padding:6px 8px;text-align:right;font-size:13px;color:#0f172a;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${linhas}</tbody>
        <tfoot>
          <tr style="border-top:2px solid #1e293b;background:#f1f5f9;">
            <td style="padding:8px;font-weight:800;color:#0f172a;">Valor Total da Nota Fiscal</td>
            ${nf.totaisColuna.map(v => `<td style="padding:8px;text-align:right;font-family:monospace;font-weight:800;color:#0f172a;">${valorCel(v)}</td>`).join('')}
            <td style="padding:8px;text-align:right;font-family:monospace;font-weight:800;background:#1e3a8a;color:#fff;">${fmtBRL(nf.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`
}

const fmtPctPdf = (v) => (v == null || v === '' ? '-' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`)
const fmtDiaMesPdf = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')
const nomeRegra = (p) => [codigoDe(p), p?.descricao_comissao].filter(Boolean).join(' ')

function descreverRegra(p, politicas) {
  const porGrupo = (id) => politicas.find(x => grupoDe(x) === id)
  if (p.pj_desconto) {
    const d = p.pj_desconto
    if (d.tipo === 'FIXO') return { nome: `${nomeRegra(p)} — desconto fixo`, faixas: [{ texto: 'Valor do desconto', percentual: fmtBRL(-(Number(d.valor) || 0)) }, ...(d.empresas || []).map(e => ({ texto: `Rateio: ${e.empresa_nome}`, percentual: 'partes iguais' }))] }
    if (d.tipo === 'PERCENTUAL') return { nome: `${nomeRegra(p)} — desconto % sobre regras`, faixas: (d.itens || []).map(it => ({ texto: nomeRegra(porGrupo(it.regra_id)) || '(regra excluída)', percentual: `-${fmtPctPdf(it.percentual)}` })) }
    return { nome: `${nomeRegra(p)} — desconto lançado no mês`, faixas: [{ texto: 'Valor informado no mês', percentual: 'lançado' }] }
  }
  if (p.pj_bonificacao) {
    const b = p.pj_bonificacao
    const porMargem = b.modo === 'MARGEM'
    return { nome: `${nomeRegra(p)} — bonificação por ${porMargem ? 'margem (lucro ÷ faturamento)' : 'meta (realizado ÷ meta)'}`, faixas: (b.faixas || []).map(f => ({ texto: `${f.nome ? `${f.nome}: ` : ''}${porMargem ? 'margem' : 'atingido'} ${f.operador} ${fmtPctPdf(f.valor)}`, percentual: fmtBRL(f.premio) })) }
  }
  if (p.pj_coparticipacao) return { nome: `${nomeRegra(p)} — coparticipação`, faixas: [{ texto: '% sobre o boleto do mês', percentual: fmtPctPdf(p.pj_coparticipacao.percentual) }, ...(p.pj_coparticipacao.empresas || []).map(e => ({ texto: `Divide com: ${e.empresa_nome}`, percentual: 'partes iguais' }))] }
  if (p.pj_percentual) return { nome: `${nomeRegra(p)} — % sobre regras`, faixas: (p.pj_percentuais || []).map(it => ({ texto: nomeRegra(porGrupo(it.regra_id)) || '(regra excluída)', percentual: fmtPctPdf(it.percentual) })) }
  if (p.pj_variaveis) return { nome: `${nomeRegra(p)} — variáveis (soma das comissões)`, faixas: (p.pj_politica_ids || []).map(id => ({ texto: nomeRegra(porGrupo(id)) || '(comissão excluída)', percentual: 'soma' })) }
  if (p.prestacao_pj) return { nome: `${nomeRegra(p)} — valor fixo`, faixas: (p.pj_empresas || []).map(e => ({ texto: e.empresa_nome, percentual: fmtBRL(e.valor) })) }
  return null
}

// ── Cálculo detalhado (páginas seguintes do PDF): UMA página por regra, com a descrição da regra e a
// memória do cálculo — de onde vem cada valor até chegar no valor da regra. As comissões de uma Regra
// PJ "Variáveis" do cargo ficam juntas na página dessa regra.
// registros: [{ politica, valor_comissao, valor_base, percentual_aplicado, periodo_inicio, periodo_fim,
//               detalhe_empresas, detalhe_calculo }]
const TD = 'padding:6px 10px;border-bottom:1px solid #e2e8f0;'
const TDR = `${TD}text-align:right;font-family:monospace;`
const TH = 'padding:6px 10px;text-align:left;background:#f1f5f9;font-size:11px;text-transform:uppercase;color:#475569;'
const THR = `${TH}text-align:right;`
const TOT = 'padding:7px 10px;font-weight:800;background:#ecfdf5;border-top:2px solid #10b981;'
const tabela = (cab, linhas, rodape = '') => `
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:6px;">
    <thead><tr>${cab}</tr></thead><tbody>${linhas}</tbody>${rodape ? `<tfoot>${rodape}</tfoot>` : ''}
  </table>`
const secao = (titulo, corpo) => `
  <div style="margin-top:18px;">
    <div style="font-size:13px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;">${esc(titulo)}</div>
    ${corpo}
  </div>`
const nota = (texto) => `<div style="font-size:12px;color:#475569;margin-top:4px;">${texto}</div>`
const pctDe = (a, b) => (b > 0 ? (a / b) * 100 : null)
const empresasDe = (r) => (Array.isArray(r.detalhe_empresas) ? r.detalhe_empresas : [])
  .filter(d => Math.round(Math.abs(Number(d.valorBase) || 0) * 100) !== 0 || Math.round(Math.abs(Number(d.valorComissao) || 0) * 100) !== 0)

// Valor da regra repartido por empresa (detalhe_empresas).
const tabelaEmpresas = (r, { comBase = false } = {}) => {
  const lista = empresasDe(r)
  if (!lista.length) return ''
  return secao('Valor por empresa', tabela(
    `<th style="${TH}">Empresa</th>${comBase ? `<th style="${THR}">Base</th>` : ''}<th style="${THR}">Valor</th>`,
    lista.map(d => `<tr><td style="${TD}">${esc(d.empresa)}</td>${comBase ? `<td style="${TDR}">${fmtBRL(d.valorBase)}</td>` : ''}<td style="${TDR}">${fmtBRL(d.valorComissao)}</td></tr>`).join(''),
    `<tr><td style="${TOT}">Total</td>${comBase ? `<td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(lista.reduce((s, d) => s + (Number(d.valorBase) || 0), 0))}</td>` : ''}<td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(lista.reduce((s, d) => s + (Number(d.valorComissao) || 0), 0))}</td></tr>`,
  ))
}

// Comissão comum (ex: componente de Variáveis): base (por coluna) × % = valor.
const memoriaComissao = (r) => {
  const cols = r.detalhe_calculo?.valorPorColuna || []
  const pct = r.percentual_aplicado ?? r.politica?.comissao_total
  const base = cols.length ? tabela(
    `<th style="${TH}">Base — ${esc(r.politica?.base_calculo?.nome || 'colunas somadas')}</th><th style="${THR}">Valor</th>`,
    cols.map(c => `<tr><td style="${TD}">${esc(c.coluna)}</td><td style="${TDR}">${fmtBRL(c.valor)}</td></tr>`).join(''),
    `<tr><td style="${TOT}">Base da comissão</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(r.valor_base)}</td></tr>`,
  ) : ''
  const conta = pct != null && r.valor_base != null
    ? `Base ${fmtBRL(r.valor_base)} × ${fmtPctPdf(pct)} = <b>${fmtBRL(r.valor_comissao)}</b>`
    : `Valor calculado: <b>${fmtBRL(r.valor_comissao)}</b>`
  return `${base}${nota(conta)}`
}

const memoriaBonificacao = (b) => {
  const margem = b.modo === 'MARGEM'
  const tab = margem
    ? tabela(`<th style="${TH}">Empresa</th><th style="${THR}">Faturamento</th><th style="${THR}">Lucro</th><th style="${THR}">Margem %</th>`,
      (b.linhas || []).map(l => `<tr><td style="${TD}">${esc(l.empresa)}</td><td style="${TDR}">${fmtBRL(l.faturamento)}</td><td style="${TDR}">${fmtBRL(l.lucro)}</td><td style="${TDR}">${fmtPctPdf(pctDe(l.lucro, l.faturamento))}</td></tr>`).join(''),
      `<tr><td style="${TOT}">Total (lucro ÷ faturamento)</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(b.faturamento)}</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(b.lucro)}</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtPctPdf(b.pct)}</td></tr>`)
    : tabela(`<th style="${TH}">Empresa</th><th style="${THR}">Meta</th><th style="${THR}">Realizado</th><th style="${THR}">% atingido</th>`,
      (b.linhas || []).map(l => `<tr><td style="${TD}">${esc(l.empresa)}</td><td style="${TDR}">${fmtBRL(l.meta)}</td><td style="${TDR}">${fmtBRL(l.realizado)}</td><td style="${TDR}">${fmtPctPdf(pctDe(l.realizado, l.meta))}</td></tr>`).join(''),
      `<tr><td style="${TOT}">Total (realizado ÷ meta)</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(b.meta)}</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(b.realizado)}</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtPctPdf(b.pct)}</td></tr>`)
  const faixas = (b.faixas || []).map(f => {
    const rot = `${f.nome ? `${f.nome}: ` : ''}${f.operador} ${f.valor}%`
    const aplicada = b.faixa === rot || b.faixa === `${f.operador} ${f.valor}%`
    return `<tr style="${aplicada ? 'background:#d1fae5;font-weight:700;' : ''}"><td style="${TD}">${esc(f.nome || '')}</td><td style="${TD}">${margem ? 'margem' : 'atingido'} ${esc(f.operador)} ${fmtPctPdf(f.valor)}${aplicada ? ' ✓ aplicada' : ''}</td><td style="${TDR}">${fmtBRL(f.premio)}</td></tr>`
  }).join('')
  return `${tab}${faixas ? tabela(`<th style="${TH}">Faixa</th><th style="${TH}">Condição</th><th style="${THR}">Prêmio</th>`, faixas) : ''}
    ${nota(`${margem ? 'Margem' : 'Atingido'} de ${fmtPctPdf(b.pct)} → ${b.faixa ? `faixa ${esc(b.faixa)}` : 'nenhuma faixa atingida'} → prêmio <b>${fmtBRL(b.premio)}</b>`)}`
}

const memoriaPercentual = (p) => `${tabela(
  `<th style="${TH}">Regra / de onde vem o valor</th><th style="${THR}">Valor da regra</th><th style="${THR}">%</th><th style="${THR}">Resultado</th>`,
  (p.itens || []).map(it => `<tr><td style="${TD}"><b>${esc([it.codigo, it.descricao].filter(Boolean).join(' '))}</b>${it.origem ? `<div style="font-size:11px;color:#64748b;">${esc(it.origem)}</div>` : ''}</td><td style="${TDR}">${fmtBRL(it.valor)}</td><td style="${TDR}">× ${fmtPctPdf(it.percentual)}</td><td style="${TDR}">= ${fmtBRL(it.resultado)}</td></tr>`).join(''),
  `<tr><td style="${TOT}">Soma dos resultados</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(p.base)}</td><td style="${TOT}"></td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(p.comissao)}</td></tr>`,
)}${nota('Para cada regra: valor da regra no mês × % = resultado; o valor desta regra é a soma dos resultados.')}`

// Memória do cálculo de uma linha salva, conforme o tipo da regra.
function memoriaDaRegra(r, politicas) {
  const p = r.politica || {}
  const dc = r.detalhe_calculo || {}
  if (dc.bonificacao) return memoriaBonificacao({ ...dc.bonificacao, faixas: dc.bonificacao.faixas || p.pj_bonificacao?.faixas || [] }) + tabelaEmpresas(r)
  const perc = (p.pj_percentual || p.pj_desconto?.tipo === 'PERCENTUAL')
    ? (montarPercentualPj({ politica: { ...p, pj_percentual: true }, percentualPj: dc.percentualPj, valorPorColuna: dc.valorPorColuna, valorComissao: r.valor_comissao, politicas }) || dc.percentualPj)
    : null
  if (perc) return memoriaPercentual(perc) + tabelaEmpresas(r)
  if (p.pj_coparticipacao) {
    const pct = p.pj_coparticipacao.percentual
    const n = empresasDe(r).length
    return nota(`Boleto do mês ${fmtBRL(r.valor_base)} × ${fmtPctPdf(pct)} = <b>${fmtBRL(r.valor_comissao)}</b>${n > 1 ? `, dividido em partes iguais entre ${n} empresas` : ''}`) + tabelaEmpresas(r)
  }
  if (p.pj_desconto) {
    const n = empresasDe(r).length
    const texto = p.pj_desconto.tipo === 'FIXO' ? `Desconto fixo cadastrado na regra: <b>${fmtBRL(r.valor_comissao)}</b>` : `Valor lançado no mês: <b>${fmtBRL(r.valor_comissao)}</b>`
    return nota(`${texto}${n > 1 ? `, rateado em partes iguais entre ${n} empresas` : ''}`) + tabelaEmpresas(r)
  }
  if (p.prestacao_pj) return nota(`Valor fixo cadastrado por empresa; a soma é o valor da regra: <b>${fmtBRL(r.valor_comissao)}</b>`) + tabelaEmpresas(r)
  return memoriaComissao(r) + tabelaEmpresas(r, { comBase: true })
}

const blocoRegra = (desc) => !desc ? '' : `
  <div style="margin-top:12px;padding:8px 12px;background:#eef2ff;border-left:4px solid #6366f1;border-radius:4px;font-size:12px;">
    <div style="font-weight:800;color:#4338ca;margin-bottom:3px;">Regra: ${esc(desc.nome)}</div>
    ${(desc.faixas || []).map(f => `<div style="color:#475569;">${esc(f.texto)} → ${esc(f.percentual)}</div>`).join('')}
  </div>`

const paginaRegra = ({ titulo, periodo, desc, corpo, valor, prestador, periodoLabel, indice, totalPaginas, parte = 1, totalPartes = 1 }) => `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#fff;padding:20px;width:1600px;box-sizing:border-box;">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1e293b;padding-bottom:12px;">
      <div>
        <div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;">Memória do cálculo — regra ${indice} de ${totalPaginas}${totalPartes > 1 ? ` · página ${parte} de ${totalPartes}` : ''}</div>
        <div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:2px;">${esc(titulo)} <span style="font-size:14px;color:#2563eb;">${esc(periodo)}</span></div>
        <div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:2px;">${esc(prestador)}</div>
      </div>
      <div style="text-align:right;font-size:13px;color:#475569;">
        <div>Período: ${esc(periodoLabel)}</div>
        <div style="font-size:18px;font-weight:800;color:${Number(valor) < 0 ? '#e11d48' : '#047857'};margin-top:4px;">${fmtBRL(valor)}</div>
      </div>
    </div>
    ${parte === 1 ? blocoRegra(desc) : ''}
    ${corpo}
    <div style="display:flex;justify-content:flex-end;margin-top:16px;">
      <div style="padding:8px 14px;background:#1e3a8a;color:#fff;font-weight:800;font-size:14px;border-radius:4px;">Valor da regra: ${fmtBRL(valor)}</div>
    </div>
  </div>`

export function montarPaginasCalculoPj({ registros, prestador, periodoLabel = '', politicas = [] }) {
  const cargoId = registros.find(r => r.politica?.cargo_id)?.politica.cargo_id
  const variaveis = politicas.filter(p => p.pj_variaveis && p.ativo !== false && p.cargo_id === cargoId)
  let restantes = registros.filter(r => r.politica)
  const itens = []
  // Variáveis: 1ª página com a regra e a soma das comissões; depois uma página por comissão, com a
  // sua conta (numa página só a tabela ficava alta demais e o PDF reduzia o tamanho).
  for (const v of variaveis) {
    const ids = new Set(v.pj_politica_ids || [])
    const comps = restantes.filter(r => ids.has(grupoDe(r.politica)))
    if (!comps.length) continue
    restantes = restantes.filter(r => !comps.includes(r))
    const total = comps.reduce((s, r) => s + (Number(r.valor_comissao) || 0), 0)
    const ordenadas = [...comps].sort((a, b) => codigoDe(a.politica).localeCompare(codigoDe(b.politica), 'pt-BR', { numeric: true }) || nomeRegra(a.politica).localeCompare(nomeRegra(b.politica), 'pt-BR'))
    const partesComps = ordenadas.map(r => secao(`${nomeRegra(r.politica)}${r.periodo_inicio ? ` (${fmtDiaMesPdf(r.periodo_inicio)} a ${fmtDiaMesPdf(r.periodo_fim)})` : ''} — ${fmtBRL(r.valor_comissao)}`, memoriaDaRegra(r, politicas)))
    const resumo = secao('Soma das comissões', tabela(`<th style="${TH}">Comissão</th><th style="${THR}">Valor</th>`,
        ordenadas.map(r => `<tr><td style="${TD}">${esc(nomeRegra(r.politica))}</td><td style="${TDR}">${fmtBRL(r.valor_comissao)}</td></tr>`).join(''),
        `<tr><td style="${TOT}">Total da regra</td><td style="${TOT}text-align:right;font-family:monospace;">${fmtBRL(total)}</td></tr>`))
    itens.push({ codigo: codigoDe(v), titulo: nomeRegra(v), periodo: '', desc: (d => d && { ...d, nome: d.nome.replace(`${nomeRegra(v)} — `, '') })(descreverRegra(v, politicas)), partes: [resumo, ...partesComps], valor: total })
  }
  restantes.forEach(r => {
    const d = descreverRegra(r.politica, politicas)
    itens.push({
      codigo: codigoDe(r.politica),
      titulo: nomeRegra(r.politica),
      periodo: r.periodo_inicio && r.periodo_fim ? `${fmtDiaMesPdf(r.periodo_inicio)} a ${fmtDiaMesPdf(r.periodo_fim)}` : '',
      desc: d ? { ...d, nome: d.nome.replace(`${nomeRegra(r.politica)} — `, '') } : null,
      partes: [secao('Memória do cálculo', memoriaDaRegra(r, politicas))],
      valor: r.valor_comissao,
    })
  })
  itens.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }))
  return itens.flatMap((it, i) => it.partes.map((corpo, k) => paginaRegra({ ...it, corpo, prestador, periodoLabel, indice: i + 1, totalPaginas: itens.length, parte: k + 1, totalPartes: it.partes.length })))
}
