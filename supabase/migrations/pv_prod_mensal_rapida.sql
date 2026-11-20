-- vw_pv_prod_mensal mais rápida (19/11/2026, achado pelo Monitor Supabase: média 1,4 s, 295 execuções).
-- date_trunc('month', data) com `data` DATE converte para timestamp COM fuso (lento, linha a linha, em 168 mil
-- linhas). Convertendo para timestamp SEM fuso o resultado é idêntico (data pura, sem hora) e a consulta da tela
-- Indicadores de Produtividade caiu de ~2,5 s para ~0,3 s no EXPLAIN ANALYZE. Mesmas colunas, mesma ordem.
CREATE OR REPLACE VIEW vw_pv_prod_mensal WITH (security_invoker = true) AS
SELECT date_trunc('month', data::timestamp)::date mes, marca, empresa, papel, pessoa,
       sum(hr_disp) hr_disp, sum(hr_disp_reais) hr_disp_reais, sum(hr_aplic) hr_aplic,
       sum(hr_vend_enc) hr_vend_enc, sum(hr_gasto_enc) hr_gasto_enc,
       sum(hr_vend_fat) hr_vend_fat, sum(hr_gasto_fat) hr_gasto_fat, sum(vl_servicos) vl_servicos
  FROM pv_prod_os
 GROUP BY 1, marca, empresa, papel, pessoa;

GRANT SELECT ON vw_pv_prod_mensal TO authenticated;
