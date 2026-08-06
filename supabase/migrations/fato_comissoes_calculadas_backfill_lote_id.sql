-- Correção de dados: até agora, handleSalvar (CalculoComissoes.jsx) nunca gravava lote_id nos
-- registros de fato_comissoes_calculadas (só a tabela de histórico de eventos usava esse campo)
-- — o código já foi corrigido pra gravar daqui pra frente, mas os registros já salvos com o
-- fluxo de lote por empresa (empresa_id preenchido em fato_comissoes_lotes) ficaram órfãos, sem
-- saber a qual lote pertencem. Religa cada um ao lote correto via funcionário -> empresa +
-- período (o segmento salvo precisa estar DENTRO do período do lote, pra cobrir os segmentos
-- parciais criados por férias).
UPDATE fato_comissoes_calculadas fc
SET lote_id = l.id
FROM fato_comissoes_lotes l
JOIN dim_funcionarios f ON f.empresa_id = l.empresa_id
WHERE fc.funcionario_id = f.id
  AND fc.lote_id IS NULL
  AND l.empresa_id IS NOT NULL
  AND fc.periodo_inicio >= l.periodo_inicio
  AND fc.periodo_fim <= l.periodo_fim;
