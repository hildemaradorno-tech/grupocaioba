-- Remove os cadastros De-Para e Painéis do motor de BI — não chegaram a ser usados (nenhum
-- registro criado) e o usuário decidiu seguir só com o fluxo "Medida + Slot no Faturamento"
-- direto em dim_medidas_bi, mais simples.
DROP TABLE IF EXISTS dim_fontes_bi_colunas_depara CASCADE;
DROP TABLE IF EXISTS dim_bi_depara_valores CASCADE;
DROP TABLE IF EXISTS dim_bi_depara CASCADE;
DROP TABLE IF EXISTS dim_bi_paineis CASCADE;
