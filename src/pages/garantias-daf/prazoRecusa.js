// Prazo para tratar recusa (Regras do Sistema → dias_recusa). Usado pelo card Recusas do Controle
// (Com Garantista) e do Dashboard, para os dois mostrarem os mesmos números.
// Contagem: da Data Final Avaliação (dia em que a DAF recusou) até hoje. Sem essa data
// (ex.: status Z, que entra automático), conta da Data SG.

function hojeLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function diasRecusada(g) {
  const inicio = (g.data_final_avaliacao || g.data_sg || '').slice(0, 10)
  if (!inicio) return null
  const ms = new Date(hojeLocalISO() + 'T12:00:00') - new Date(inicio + 'T12:00:00')
  return Math.max(0, Math.round(ms / 86400000))
}

// 'prazo' = até N dias · 'fora' = mais de N dias (sem data conta como fora, para não sumir do controle)
export function situacaoPrazoRecusa(g, diasRecusa) {
  const d = diasRecusada(g)
  if (d === null) return 'fora'
  return d <= diasRecusa ? 'prazo' : 'fora'
}
