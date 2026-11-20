// Pontos de controle do Monitor Railway (19/11/2026) — painel "Precisa de atenção" da Visão Geral.
// Cada controle volta com nivel: 'ok' | 'info' | 'atencao' | 'critico'.
//
// Limites (regra do plano Hobby na documentação do Railway, conferida em 19/11/2026: US$ 5/mês com US$ 5 de
// consumo incluídos; memória US$ 10 por GB/mês é quase todo o custo deste backend):
//   - memória MÉDIA de 7 dias acima de 500 MB  → o consumo passa dos US$ 5 incluídos (cobrança extra)
//   - pico de memória/CPU: 60% do plano = atenção, 85% = crítico (risco de o backend reiniciar)
//   - projeção do ciclo acima do incluído = atenção; acima do limite de gasto (bloqueio) = crítico
//   - domínio sem resposta = crítico; resposta acima de 3 s = atenção
//
// Aviso por e-mail REMOVIDO em 19/11/2026: o plano Hobby do Railway bloqueia SMTP (só no Pro), o envio dava
// "Connection timeout" a cada 30 min. O usuário acompanha pela tela.
import { getVisaoGeral, getPlano, getMetricas, ping } from './railwayMonitor.js'

export const LIMITES = {
  memoriaMediaMb: 500,
  pctAtencao: 60,
  pctCritico: 85,
  respostaLentaMs: 3000,
  usoIncluidoUsd: { HOBBY: 5 },
}

const usd = (v) => `US$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const mb = (gb) => gb == null ? '—' : gb < 1 ? `${Math.round(gb * 1024)} MB` : `${gb.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
const nivelPct = (pct) => pct >= LIMITES.pctCritico ? 'critico' : pct >= LIMITES.pctAtencao ? 'atencao' : 'ok'
const LINK_BILLING = 'https://railway.com/workspace/billing'
const LINK_USAGE = 'https://railway.com/workspace/usage'

export async function calcularControles({ refresh = false } = {}) {
  const controles = []
  const add = (c) => controles.push(c)

  let visao = null
  let plano = null
  try { visao = await getVisaoGeral({ refresh }) } catch (e) {
    add({ id: 'api', grupo: 'Railway', nivel: 'critico', titulo: 'Não foi possível consultar o Railway', detalhe: e.message })
  }
  try { plano = await getPlano({ refresh }) } catch (e) {
    add({ id: 'api-plano', grupo: 'Plano', nivel: 'atencao', titulo: 'Plano indisponível na API do Railway', detalhe: e.message })
  }

  // ── Plano / cobrança ──
  const ws = plano?.workspaces?.[0] || null
  if (ws) {
    const a = ws.assinatura
    add(a.situacao === 'ACTIVE'
      ? { id: 'assinatura', grupo: 'Cobrança', nivel: 'ok', titulo: 'Assinatura em dia', detalhe: `Plano ${ws.plano}` }
      : { id: 'assinatura', grupo: 'Cobrança', nivel: 'critico', titulo: `Assinatura: ${a.situacao === 'PAST_DUE' ? 'pagamento em atraso' : a.situacao}`,
          detalhe: 'Se não for paga, o Railway para os serviços até quitar as faturas — o backend sai do ar.', link: LINK_BILLING, linkTxt: 'Pagar no Railway' })

    const incluido = LIMITES.usoIncluidoUsd[ws.plano] ?? null
    const ini = a.ciclo_inicio ? new Date(a.ciclo_inicio).getTime() : null
    const fim = a.ciclo_fim ? new Date(a.ciclo_fim).getTime() : null
    const diasTot = ini && fim ? (fim - ini) / 864e5 : null
    const diasPass = ini ? Math.max(0.5, (Date.now() - ini) / 864e5) : null
    const projecao = a.uso_atual_usd != null && diasTot && diasPass ? (a.uso_atual_usd / diasPass) * diasTot : null
    const limBloqueio = a.limite_gasto?.rigido != null ? a.limite_gasto.rigido : null
    const limAviso = a.limite_gasto?.aviso != null ? a.limite_gasto.aviso : null
    if (projecao != null) {
      let nivel = 'ok'
      let detalhe = `Consumo até agora ${usd(a.uso_atual_usd)}; projeção até o fim do ciclo ${usd(projecao)}`
      if (limBloqueio != null && projecao >= limBloqueio) {
        nivel = 'critico'; detalhe += ` — passa do limite de bloqueio (${usd(limBloqueio)}): o Railway vai parar os serviços.`
      } else if (limAviso != null && projecao >= limAviso) {
        nivel = 'atencao'; detalhe += ` — passa do limite de aviso (${usd(limAviso)}) definido no Railway.`
      } else if (incluido != null && projecao > incluido) {
        nivel = 'atencao'; detalhe += ` — passa dos ${usd(incluido)} incluídos na mensalidade: cobrança extra de ≈ ${usd(projecao - incluido)}.`
      } else if (incluido != null) {
        detalhe += ` — dentro dos ${usd(incluido)} incluídos (sem cobrança extra).`
      }
      add({ id: 'gasto', grupo: 'Cobrança', nivel, titulo: nivel === 'ok' ? 'Consumo do mês dentro do plano' : 'Consumo do mês acima do plano', detalhe, valor: projecao, limite: incluido })
    }
    if (a.limite_gasto?.estourado) {
      add({ id: 'limite-estourado', grupo: 'Cobrança', nivel: 'critico', titulo: 'Limite de gasto atingido', detalhe: 'O Railway pode parar os serviços.', link: LINK_USAGE, linkTxt: 'Ver no Railway' })
    }
    add(a.limite_gasto
      ? { id: 'limite-gasto', grupo: 'Cobrança', nivel: 'ok', titulo: 'Limite de gasto definido no Railway', detalhe: [a.limite_gasto.aviso != null && `aviso em ${usd(a.limite_gasto.aviso)}`, a.limite_gasto.rigido != null && `bloqueio em ${usd(a.limite_gasto.rigido)}`].filter(Boolean).join(' · ') }
      : { id: 'limite-gasto', grupo: 'Cobrança', nivel: 'info', titulo: 'Sem limite de gasto no Railway', detalhe: 'Recomendado: aviso por e-mail do próprio Railway em US$ 5.', link: LINK_USAGE, linkTxt: 'Definir no Railway' })
  }

  // ── Serviços: deploy, resposta, memória, CPU ──
  const cap = ws?.capacidade || {}
  const memLimGb = cap.memoria_bytes ? cap.memoria_bytes / 1e9 : null
  for (const s of visao?.servicos || []) {
    const nome = `${s.servico} (${s.ambiente})`
    const st = s.ultimo?.status
    if (st === 'SUCCESS') add({ id: `deploy:${s.chave}`, grupo: nome, nivel: 'ok', titulo: 'Deploy no ar', detalhe: s.ultimo.commit ? `commit ${s.ultimo.commit}` : '' })
    else if (st === 'FAILED' || st === 'CRASHED') add({ id: `deploy:${s.chave}`, grupo: nome, nivel: 'critico', titulo: st === 'CRASHED' ? 'Serviço travou' : 'Último deploy falhou',
      detalhe: s.ativo ? `Está rodando o deploy anterior (${s.ativo.commit || s.ativo.criado_em}).` : 'Nenhum deploy anterior em uso — o serviço pode estar fora do ar.' })
    else if (st) add({ id: `deploy:${s.chave}`, grupo: nome, nivel: 'info', titulo: `Deploy em andamento (${st})`, detalhe: '' })

    if (s.dominio) {
      const p = await ping(s.dominio).catch(e => ({ no_ar: false, erro: e.message }))
      if (!p.no_ar) add({ id: `ping:${s.chave}`, grupo: nome, nivel: 'critico', titulo: 'Endereço não responde', detalhe: `${s.dominio}${p.http ? ` — HTTP ${p.http}` : ''}${p.erro ? ` — ${p.erro}` : ''}` })
      else add({ id: `ping:${s.chave}`, grupo: nome, nivel: p.ms > LIMITES.respostaLentaMs ? 'atencao' : 'ok', titulo: p.ms > LIMITES.respostaLentaMs ? 'Resposta lenta' : 'Respondendo', detalhe: `${p.ms} ms`, valor: p.ms })
    }

    try {
      const m = await getMetricas({ projectId: s.projeto_id, serviceId: s.servico_id, environmentId: s.ambiente_id, horas: 168 })
      const mem = (m.series.MEMORY_USAGE_GB || []).map(x => x.valor)
      const cpu = (m.series.CPU_USAGE || []).map(x => x.valor)
      if (mem.length) {
        const media = mem.reduce((a, b) => a + b, 0) / mem.length
        const pico = Math.max(...mem)
        const mediaMb = media * 1024
        add({ id: `mem-media:${s.chave}`, grupo: nome, nivel: mediaMb > LIMITES.memoriaMediaMb ? 'atencao' : 'ok',
          titulo: mediaMb > LIMITES.memoriaMediaMb ? 'Memória média alta (custo acima do incluído)' : 'Memória média dentro do custo do plano',
          detalhe: `Média de 7 dias: ${mb(media)} (limite de controle ${LIMITES.memoriaMediaMb} MB ≈ US$ 5/mês)`, valor: mediaMb, limite: LIMITES.memoriaMediaMb })
        if (memLimGb) {
          const pct = (pico / memLimGb) * 100
          add({ id: `mem-pico:${s.chave}`, grupo: nome, nivel: nivelPct(pct), titulo: nivelPct(pct) === 'ok' ? 'Pico de memória com folga' : 'Pico de memória perto do limite do plano',
            detalhe: `Pico de 7 dias: ${mb(pico)} de ${cap.memoria} (${Math.round(pct)}%)`, valor: pct, limite: LIMITES.pctAtencao })
        }
      }
      if (cpu.length && cap.cpu_vcpu) {
        const pico = Math.max(...cpu)
        const pct = (pico / cap.cpu_vcpu) * 100
        add({ id: `cpu-pico:${s.chave}`, grupo: nome, nivel: nivelPct(pct), titulo: nivelPct(pct) === 'ok' ? 'Processador com folga' : 'Processador perto do limite do plano',
          detalhe: `Pico de 7 dias: ${pico.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} de ${cap.cpu} (${pct < 1 ? '<1' : Math.round(pct)}%)`, valor: pct, limite: LIMITES.pctAtencao })
      }
    } catch (e) {
      add({ id: `metricas:${s.chave}`, grupo: nome, nivel: 'info', titulo: 'Consumo indisponível', detalhe: e.message })
    }
  }

  // Memória média é a CAUSA do custo; o que decide se há cobrança extra é a projeção do ciclo. Se a projeção
  // está dentro do incluído, a memória média não vira alerta (só mostra o valor) — evita aviso contraditório.
  const gasto = controles.find(c => c.id === 'gasto')
  if (gasto && gasto.nivel === 'ok') {
    controles.filter(c => c.id.startsWith('mem-media:') && c.nivel === 'atencao').forEach(c => {
      c.nivel = 'ok'
      c.titulo = 'Memória média no limite do custo do plano'
      c.detalhe += ' — a projeção do mês ainda está dentro do incluído; se a média subir, o consumo passa de US$ 5.'
    })
  }

  const ordem = { critico: 0, atencao: 1, info: 2, ok: 3 }
  controles.sort((a, b) => ordem[a.nivel] - ordem[b.nivel])
  return {
    controles,
    resumo: {
      critico: controles.filter(c => c.nivel === 'critico').length,
      atencao: controles.filter(c => c.nivel === 'atencao').length,
      info: controles.filter(c => c.nivel === 'info').length,
      ok: controles.filter(c => c.nivel === 'ok').length,
    },
    limites: LIMITES,
    calculado_em: new Date().toISOString(),
  }
}
