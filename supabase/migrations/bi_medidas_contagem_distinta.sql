-- Adiciona "Contagem Distinta" (COUNT DISTINCT sobre a coluna do valor) como Tipo de Cálculo
-- em dim_medidas_bi, além de Soma/Contagem/Média já existentes.
ALTER TABLE dim_medidas_bi DROP CONSTRAINT IF EXISTS dim_medidas_bi_tipo_agregacao_check;

ALTER TABLE dim_medidas_bi ADD CONSTRAINT dim_medidas_bi_tipo_agregacao_check
  CHECK (tipo_agregacao IN ('SOMA', 'CONTAGEM', 'CONTAGEM_DISTINTA', 'MEDIA'));
