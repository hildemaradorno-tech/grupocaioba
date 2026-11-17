/**
 * Resultados dos cálculos da Matriz KPIs guardados em memória, valendo para TODOS os usuários até a próxima
 * Atualização (pedido do usuário, 17/11/2026: "uma atualização quando o usuário entrar já grava para todos; se
 * quiser atualizar, clico no botão"). Antes recalculava a cada entrada depois de 1 min sem uso.
 *   - até `fresco` (padrão 20 h)  → o guardado, sem recalcular;
 *   - até `maximo` (padrão 36 h)  → o guardado NA HORA e recalcula por trás (rede de segurança se ninguém
 *     atualizar por um dia);
 *   - nada guardado (ex.: servidor reiniciou) → calcula uma vez e guarda.
 * limparCachesSwr() é chamado no fim de cada Atualização (kpiSyncService) — aí tudo é refeito com os dados novos.
 * Cálculo que falha não fica guardado. Um recálculo por trás de cada vez por chave.
 */
const _mapas = new Set()

export function limparCachesSwr() {
  for (const m of _mapas) m.clear()
}

export function cacheSwr(mapa, chave, calcular, { fresco = 20 * 3600_000, maximo = 36 * 3600_000, rotulo = 'cache' } = {}) {
  _mapas.add(mapa)
  const hit = mapa.get(chave)
  const idade = hit ? Date.now() - hit.ts : Infinity
  if (hit && (idade < fresco || hit.relendo)) return hit.promessa
  if (hit && hit.ok && idade < maximo) {
    hit.relendo = true
    calcular()
      .then(v => mapa.set(chave, { ts: Date.now(), promessa: Promise.resolve(v), ok: true }))
      .catch(err => { hit.relendo = false; console.error(`[${rotulo}] recálculo por trás falhou:`, err.message) })
    return hit.promessa
  }
  const promessa = calcular()
  const entrada = { ts: Date.now(), promessa, ok: false }
  mapa.set(chave, entrada)
  promessa.then(() => { entrada.ok = true }).catch(() => { if (mapa.get(chave) === entrada) mapa.delete(chave) })
  return promessa
}
