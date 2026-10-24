// Cálculo da regra de Sobreaviso/Plantão (valores em config_sobreaviso, editados em Regras):
// a cada 7 dias de sobreaviso paga o valor da semana completa; os dias que sobram pagam o valor
// diário. Sem valor semanal (0/vazio), todos os dias pagam o valor diário. Deslocamento é por
// acionamento.
export function calcularSobreaviso(dias, deslocamentos, config) {
  const valorDia = Number(config?.valor_dia_sobreaviso) || 0
  const valorSemana = Number(config?.valor_semana_sobreaviso) || 0
  const valorDesloc = Number(config?.valor_deslocamento) || 0
  const totalDias = Math.max(0, Number(dias) || 0)
  const semanas = valorSemana > 0 ? Math.floor(totalDias / 7) : 0
  const diasAvulsos = totalDias - semanas * 7
  const valorSobreaviso = semanas * valorSemana + diasAvulsos * valorDia
  const valorDeslocamento = (Number(deslocamentos) || 0) * valorDesloc
  return {
    semanas,
    diasAvulsos,
    valorSobreaviso,
    valorDeslocamento,
    total: Math.round((valorSobreaviso + valorDeslocamento) * 100) / 100,
  }
}
