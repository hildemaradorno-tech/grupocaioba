-- Simplifica o Slot no Faturamento: a tabela de BI — Possibilidades agora tem só a linha
-- Total (departamentos removidos por enquanto), então o slot não faz mais sentido por
-- departamento — só por COLUNA (Real Peças / Real Serviços).
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_slot_faturamento_check;

ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_slot_faturamento_check
  CHECK (slot_faturamento IN ('realPecas', 'realServicos'));

-- Limpa valores antigos (por departamento) que não existem mais como opção válida.
UPDATE dim_medidas_bi SET slot_faturamento = NULL
WHERE slot_faturamento IS NOT NULL AND slot_faturamento NOT IN ('realPecas', 'realServicos');
