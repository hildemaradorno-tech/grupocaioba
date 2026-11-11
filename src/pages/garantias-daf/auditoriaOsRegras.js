// Regras e formatações compartilhadas pela Auditoria O.S. Aberta — Controle (AuditoriaOsAberto.jsx)
// e Dashboard (AuditoriaOsAbertoDashboard.jsx). Mudou aqui, muda nos dois.

export const fmt = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const fmtDate = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—'
export const primeiroUltimoNome = (nome) => {
  if (!nome) return '—'
  const partes = nome.trim().split(/\s+/)
  if (partes.length <= 2) return nome
  return `${partes[0]} ${partes[partes.length - 1]}`
}

export const diasOficina = (criacao, auditoria) => {
  if (!criacao || !auditoria) return null
  return Math.floor((new Date(auditoria + 'T12:00:00') - new Date(criacao + 'T12:00:00')) / 86400000)
}

// Nome exibido no seletor de empresa: nome fantasia (ex.: "CAIOBÁ MOTOS - CAMPO GRANDE"); reserva: nome do sistema
export const nomeSeletorEmpresa = (e) => e.empresa_fantasia || e.nome_empresa_sistema || e.nome_empresa || ''

// Empresas com auditoria de OS: agrupamentos Caiobá Trucks e Caiobá Motos, sem as empresas "visuais"
export const AGRUPAMENTOS_AUDITORIA = ['caiobá trucks', 'caiobá motos']
export const empresaDaAuditoria = (e) =>
  AGRUPAMENTOS_AUDITORIA.includes((e.agrupamento_nome || '').trim().toLowerCase()) && !e.empresa_visual

// Pendente: 30+ dias na oficina ou Na Oficina = Não
export const isPendente = (row) => {
  const d = diasOficina(row.data_criacao, row.data_auditoria)
  return (d !== null && d >= 30) || row.na_oficina === false
}

// Respondida: Situação, Observação e Dt. Previsão preenchidas
export const isRespondida = (row) => !!(row.situacao_id && (row.observacao || '').trim() && row.data_previsao)

// Auditoria encerrada (prazo vencido ou respostas concluídas)
export const STATUS_ENCERRADOS = ['respondido_total', 'respondido_parcial', 'sem_resposta']
