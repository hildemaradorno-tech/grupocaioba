-- Adiciona Margem Peças/Margem Serviços/Passagens como opções de Slot no BI (além de
-- Real Peças/Real Serviços), pra alimentar direto as colunas correspondentes da tabela de
-- Faturamento em BI — Possibilidades.
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_slot_faturamento_check;

ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_slot_faturamento_check
  CHECK (slot_faturamento IN ('realPecas', 'realServicos', 'margemPecas', 'margemServicos', 'pass'));
