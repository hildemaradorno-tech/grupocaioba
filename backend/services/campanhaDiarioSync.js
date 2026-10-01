/**
 * Campanha Pós-Venda — grava fato_campanha_diario (1 linha por dia × empresa × pessoa).
 *
 * Roda dentro da sincronização agendada da Matriz KPIs (kpiSyncService), depois das fontes
 * do extrator — os arquivos do SharePoint já estão no cache em memória nesse momento, então
 * este passo só soma e grava. A tela BI Campanha lê essa tabela direto do Supabase (poucas
 * centenas de linhas por empresa/mês) e monta as semanas da campanha a partir do dia.
 *
 * Fontes (mesmas da Matriz KPIs):
 *   consultor → REL_VENDARECEPCIONISTA (tot_serv, tot_pec, margem_peca, OS_Codigo, Usuario_Nome/Codigo)
 *   mecânico  → ROF042 (Hr. Total = aplicadas, Hr. Vend.) + ROF096 (disponíveis)
 *   Produtividade = aplicadas ÷ disponíveis · Eficiência = vendidas ÷ aplicadas (igual à Matriz)
 */
import { getLinhasCampanha } from './sharepointExtractor.js'

const LOTE = 500

// Mesmo nome escrito de jeitos diferentes entre relatórios (acento, espaço duplo, caixa).
const normNome = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toUpperCase().replace(/\s+/g, ' ').trim()
const r2 = (v) => Math.round(v * 100) / 100
const diaIso = (dia) => `${Math.floor(dia / 10000)}-${String(Math.floor(dia / 100) % 100).padStart(2, '0')}-${String(dia % 100).padStart(2, '0')}`

export async function sincronizarCampanhaDiario(supabaseAdmin, ano) {
  const inicio = new Date().toISOString()
  const { recep, rof042, rof096 } = await getLinhasCampanha(ano)

  const mapa = new Map()
  const linha = (dia, empresa, tipo, nome) => {
    const chave = `${dia}|${empresa}|${tipo}|${nome}`
    let l = mapa.get(chave)
    if (!l) {
      l = { dia, empresa, tipo, nome, codigo: null, serv: 0, pecas: 0, margemPecas: 0, os: new Set(), aplic: 0, vend: 0, disp: 0 }
      mapa.set(chave, l)
    }
    return l
  }
  const doAno = (dia) => dia && Math.floor(dia / 10000) === ano

  for (const r of recep) {
    const nome = normNome(r.nomeConsultor)
    if (!doAno(r.dia) || !nome) continue
    const l = linha(r.dia, r.empresaNome, 'consultor', nome)
    if (r.codConsultor) l.codigo = r.codConsultor
    l.serv += r.totServ || 0
    l.pecas += r.totPec || 0
    l.margemPecas += r.margemPeca || 0
    if (r.os) l.os.add(r.os)
  }
  for (const r of rof042) {
    const nome = normNome(r.produtivo)
    if (!doAno(r.dia) || !nome || (!r.hrAplic && !r.hrVend)) continue
    const l = linha(r.dia, r.empresaNome, 'mecanico', nome)
    l.aplic += r.hrAplic || 0
    l.vend += r.hrVend || 0
  }
  for (const r of rof096) {
    const nome = normNome(r.nomeMecanico)
    if (!doAno(r.dia) || !nome) continue
    linha(r.dia, r.empresaNome, 'mecanico', nome).disp += r.disponiveis || 0
  }

  const registros = [...mapa.values()].map((l) => ({
    data: diaIso(l.dia),
    ano,
    mes: Math.floor(l.dia / 100) % 100,
    empresa: l.empresa,
    tipo: l.tipo,
    pessoa_nome: l.nome,
    pessoa_codigo: l.codigo,
    serv_valor: r2(l.serv),
    pecas_valor: r2(l.pecas),
    pecas_margem: r2(l.margemPecas),
    os_codigos: [...l.os],
    horas_aplicadas: r2(l.aplic),
    horas_vendidas: r2(l.vend),
    horas_disponiveis: r2(l.disp),
    atualizado_em: inicio,
  }))

  for (let i = 0; i < registros.length; i += LOTE) {
    const { error } = await supabaseAdmin
      .from('fato_campanha_diario')
      .upsert(registros.slice(i, i + LOTE), { onConflict: 'data,empresa,tipo,pessoa_nome' })
    if (error) throw error
  }
  // Linhas do ano que não vieram nesta leitura (ex.: nota cancelada) saem da tabela.
  const { error: delErr } = await supabaseAdmin
    .from('fato_campanha_diario')
    .delete()
    .eq('ano', ano)
    .lt('atualizado_em', inicio)
  if (delErr) throw delErr

  return { linhas: registros.length }
}
