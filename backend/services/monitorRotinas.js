// Registro das rotinas automáticas do backend para a Saúde do Sistema (19/11/2026).
// Cada scheduler avisa aqui a cada "batida" (prova de que está vivo) e ao terminar uma execução (ok/erro).
// Fica em memória do processo: um reinício do backend zera (a tela avisa "desde o último reinício").
// Execuções que já gravam o resultado no banco (aud_agendamentos, proj_email_config, kpi_sync_execucoes,
// pv_prod_sync) são lidas de lá pela saudeSistema.js — aqui fica o que só existia no console.

const estado = new Map() // nome -> { ultima_batida, ultima_execucao, ultimo_ok, ultima_mensagem, duracao_ms, execucoes, erros }
export const INICIADO_EM = new Date().toISOString()

function reg(nome) {
  if (!estado.has(nome)) estado.set(nome, { ultima_batida: null, ultima_execucao: null, ultimo_ok: null, ultima_mensagem: null, duracao_ms: null, execucoes: 0, erros: 0 })
  return estado.get(nome)
}

// O scheduler rodou o "tick" (mesmo que não tenha nada para fazer)
export function batimento(nome) { reg(nome).ultima_batida = new Date().toISOString() }

// Terminou uma execução de verdade
export function resultado(nome, { ok, mensagem = null, inicio = null }) {
  const r = reg(nome)
  r.ultima_execucao = new Date().toISOString()
  r.ultimo_ok = !!ok
  r.ultima_mensagem = mensagem ? String(mensagem).slice(0, 500) : null
  r.duracao_ms = inicio ? Date.now() - inicio : null
  r.execucoes += 1
  if (!ok) r.erros += 1
}

// Atalho: roda fn registrando sucesso/erro (relança o erro)
export async function registrar(nome, fn) {
  const inicio = Date.now()
  try {
    const out = await fn()
    resultado(nome, { ok: true, inicio })
    return out
  } catch (e) {
    resultado(nome, { ok: false, mensagem: e.message, inicio })
    throw e
  }
}

export function lerEstado() { return Object.fromEntries(estado) }
