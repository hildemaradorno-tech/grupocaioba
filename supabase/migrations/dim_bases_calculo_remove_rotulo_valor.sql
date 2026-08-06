-- Remove "Rótulo do Valor" — o Nome da Base de Cálculo passa a ser usado diretamente como
-- título da coluna "Valor" e para identificar Peças/Serviços no Cálculo de Comissões.
ALTER TABLE dim_bases_calculo DROP COLUMN IF EXISTS rotulo_valor;
