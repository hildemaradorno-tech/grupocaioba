// Regra ÚNICA de semanas do backend (Matriz KPIs + Campanha Pós-Venda). Mesma regra do frontend
// (src/utils/kpiPeriods.js → semanasDoMes) — se mudar aqui, mudar lá também.
//
// Cada mês é cortado em semanas de domingo a sábado (a 1ª começa no dia 1, a última termina no fim
// do mês). Uma semana PARCIAL do começo ou do fim do mês só conta sozinha se tiver uma quarta-feira;
// sem quarta, é anexada à semana vizinha (a do começo junta com a seguinte, a do fim com a anterior).
// Toda semana pertence a um único mês. As chaves s01, s02… seguem numeradas no ano inteiro.

const QUARTA = 3

function temQuarta(ano, mes, inicio, fim) {
  for (let d = inicio; d <= fim; d++) {
    if (new Date(Date.UTC(ano, mes - 1, d)).getUTCDay() === QUARTA) return true
  }
  return false
}

const _cacheMes = new Map()

// Semanas de um mês: [{ inicio, fim }] (dias do mês). Cacheado (o extrator chama 1x por linha).
export function semanasDoMes(ano, mes) {
  const chave = `${ano}-${mes}`
  if (!_cacheMes.has(chave)) _cacheMes.set(chave, calcularSemanasDoMes(ano, mes))
  return _cacheMes.get(chave)
}

function calcularSemanasDoMes(ano, mes) {
  const dim = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const pedacos = []
  let inicio = 1
  while (inicio <= dim) {
    const dow = new Date(Date.UTC(ano, mes - 1, inicio)).getUTCDay() // 0 = domingo
    const fim = Math.min(inicio + (6 - dow), dim)                     // até o sábado (ou fim do mês)
    pedacos.push({ inicio, fim })
    inicio = fim + 1
  }
  // Semana parcial do começo sem quarta → junta com a seguinte.
  if (pedacos.length > 1 && pedacos[0].fim - pedacos[0].inicio < 6 && !temQuarta(ano, mes, pedacos[0].inicio, pedacos[0].fim)) {
    pedacos[1].inicio = pedacos[0].inicio
    pedacos.shift()
  }
  // Semana parcial do fim sem quarta → junta com a anterior.
  const ult = pedacos[pedacos.length - 1]
  if (pedacos.length > 1 && ult.fim - ult.inicio < 6 && !temQuarta(ano, mes, ult.inicio, ult.fim)) {
    pedacos[pedacos.length - 2].fim = ult.fim
    pedacos.pop()
  }
  return pedacos
}

const _cacheAno = new Map()

// Todas as semanas do ano: { s01: { mes, inicio, fim }, … } (numeração contínua no ano).
export function semanasDoAno(ano) {
  if (_cacheAno.has(ano)) return _cacheAno.get(ano)
  const out = {}
  let n = 1
  for (let m = 1; m <= 12; m++) {
    for (const s of semanasDoMes(ano, m)) {
      out[`s${String(n).padStart(2, '0')}`] = { mes: m, inicio: s.inicio, fim: s.fim }
      n++
    }
  }
  _cacheAno.set(ano, out)
  return out
}

// Número global (1, 2, …) da semana de uma data.
export function numeroSemanaDoDia(ano, mes, dia) {
  let n = 0
  for (let m = 1; m < mes; m++) n += semanasDoMes(ano, m).length
  const doMes = semanasDoMes(ano, mes)
  const i = doMes.findIndex((s) => dia >= s.inicio && dia <= s.fim)
  return n + (i < 0 ? doMes.length : i + 1)
}
