-- BI Possibilidades › aba Evolução: mesma soma de bi_medidas_agregado, mas por MÊS (ano/mês) × Medida ×
-- Tipo de OS (sem funcionário — o gráfico corta só por departamento, que vem do Tipo de OS).
CREATE OR REPLACE FUNCTION bi_medidas_agregado_mensal(p_inicio date, p_fim date, p_empresas_norm text[] DEFAULT NULL)
RETURNS TABLE (medida_id uuid, ano int, mes int, tipo_os text, soma numeric, linhas bigint, distintos text[])
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.*, extract(year FROM d.data)::int AS ano, extract(month FROM d.data)::int AS mes
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresas_norm IS NULL OR cardinality(p_empresas_norm) = 0 OR d.empresa_norm = ANY (p_empresas_norm))
  )
  SELECT b.medida_id, b.ano, b.mes, b.tipo_os, sum(b.soma), sum(b.linhas)::bigint,
    (SELECT array_agg(DISTINCT v) FROM base b2 CROSS JOIN LATERAL unnest(b2.distintos) v
      WHERE b2.medida_id = b.medida_id AND b2.ano = b.ano AND b2.mes = b.mes AND b2.tipo_os = b.tipo_os)
  FROM base b
  GROUP BY b.medida_id, b.ano, b.mes, b.tipo_os
$$;

GRANT EXECUTE ON FUNCTION bi_medidas_agregado_mensal(date, date, text[]) TO authenticated;
