// Mantém o cursor no lugar nos campos que viram MAIÚSCULAS enquanto se digita (21/11/2026, pedido do usuário).
//
// Vários campos do portal fazem onChange={e => set(e.target.value.toUpperCase())}. O React troca o valor do campo
// pelo texto convertido e o navegador manda o cursor para o FINAL — quem edita no meio de um texto já preenchido
// perde a posição a cada letra. Esta correção vale para o portal inteiro (inclusive campos novos):
// guarda a posição do cursor no momento da digitação e, se depois o campo só mudou de maiúscula/minúscula
// (mesmo tamanho) e o cursor foi parar no fim, devolve o cursor para onde estava.
const TIPOS_TEXTO = /^(text|search|url|tel|password)$/i

function ehCampoDeTexto(el) {
  if (el instanceof HTMLTextAreaElement) return true
  return el instanceof HTMLInputElement && TIPOS_TEXTO.test(el.type || 'text')
}

export function instalarManterCursor() {
  if (typeof document === 'undefined' || window.__manterCursorInstalado) return
  window.__manterCursorInstalado = true
  document.addEventListener('input', (e) => {
    const el = e.target
    if (!ehCampoDeTexto(el)) return
    let ini, fim
    try { ini = el.selectionStart; fim = el.selectionEnd } catch { return }
    if (ini == null) return
    const digitado = el.value
    if (ini >= digitado.length) return // já estava no fim: nada a corrigir
    // depois que o React aplicar o valor convertido
    requestAnimationFrame(() => {
      if (document.activeElement !== el) return
      const atual = el.value
      const soMudouCaixa = atual !== digitado && atual.length === digitado.length && atual.toUpperCase() === digitado.toUpperCase()
      if (!soMudouCaixa) return
      try {
        if (el.selectionStart === atual.length) el.setSelectionRange(ini, fim)
      } catch { /* campo sem suporte a seleção */ }
    })
  }, true)
}
