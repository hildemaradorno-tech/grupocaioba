-- Fontes BI foram unificadas em dim_fontes_calculo (bi_unifica_fontes_calculo.sql) e validadas.
-- Remove a tabela antiga (sem dependências: dim_medidas_bi já aponta pra dim_fontes_calculo).
DROP TABLE IF EXISTS dim_fontes_bi;
