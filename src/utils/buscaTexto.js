// Normaliza (minusculas + sem acento) pra comparacao tolerante.
const normalizar = (s) => (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// Busca com curinga: um "%" no meio do filtro funciona como "qualquer coisa no meio"  — em vez
// de exigir um trecho contiguo, confere se cada pedaco aparece no texto NESSA ORDEM (nao precisa
// ser um atras do outro). Ex: "mec%senio" bate com "MECANICO SENIOR". Sem "%", cai no
// comportamento de sempre (contem o texto digitado, so isso).
export function buscaComCoringa(texto, filtro) {
  if (!filtro) return true
  const textoNorm = normalizar(texto)
  if (!filtro.includes('%')) return textoNorm.includes(normalizar(filtro))
  const partes = filtro.split('%').map(normalizar).filter(Boolean)
  let pos = 0
  for (const parte of partes) {
    const idx = textoNorm.indexOf(parte, pos)
    if (idx === -1) return false
    pos = idx + parte.length
  }
  return true
}