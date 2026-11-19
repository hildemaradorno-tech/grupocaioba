-- Pós-Vendas › Indicadores de Produtividade › aba "Encerrado × Faturado" (17/11/2026)
-- Para cada O.S. que teve tempo encerrado pelo mecânico OU nota fiscal emitida no período, devolve TODO o
-- histórico dela (qualquer mês): dia × pessoa com Hr. Vendidas encerradas e Hr. Vendidas faturadas.
-- A tela compara o mês do encerramento com o mês da NF (faturado no mesmo mês / em outro mês / ainda não).
-- security invoker: vale a RLS de pv_prod_os (quem tem o menu pos-vendas/).

CREATE OR REPLACE FUNCTION pv_prod_enc_fat(p_ini date, p_fim date)
RETURNS TABLE (
  marca text, empresa text, os text, tipo_os text, pessoa text, data date,
  hr_vend_enc numeric, hr_vend_fat numeric, vl_servicos numeric
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  WITH alvo AS (
    SELECT DISTINCT p.marca, p.empresa, p.os
      FROM pv_prod_os p
     WHERE p.papel = 'mecanico' AND p.os <> '' AND p.data BETWEEN p_ini AND p_fim
       AND (p.hr_vend_enc <> 0 OR p.hr_vend_fat <> 0)
  )
  SELECT p.marca, p.empresa, p.os, max(p.tipo_os), p.pessoa, p.data,
         sum(p.hr_vend_enc), sum(p.hr_vend_fat), sum(p.vl_servicos)
    FROM pv_prod_os p
    JOIN alvo a ON a.marca = p.marca AND a.empresa = p.empresa AND a.os = p.os
   WHERE p.papel = 'mecanico' AND (p.hr_vend_enc <> 0 OR p.hr_vend_fat <> 0)
   GROUP BY p.marca, p.empresa, p.os, p.pessoa, p.data
$$;

GRANT EXECUTE ON FUNCTION pv_prod_enc_fat(date, date) TO authenticated;
