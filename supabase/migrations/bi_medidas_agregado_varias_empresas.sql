-- BI Possibilidades: seletor de empresa passou a aceitar várias empresas (e agrupamento inteiro).
-- bi_medidas_agregado recebe uma LISTA de empresas normalizadas; NULL ou lista vazia = todas.
DROP FUNCTION IF EXISTS bi_medidas_agregado(date, date, text);

CREATE OR REPLACE FUNCTION bi_medidas_agregado(p_inicio date, p_fim date, p_empresas_norm text[] DEFAULT NULL)
RETURNS TABLE (medida_id uuid, tipo_os text, soma numeric, linhas bigint, distintos text[], atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.*
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresas_norm IS NULL OR cardinality(p_empresas_norm) = 0 OR d.empresa_norm = ANY (p_empresas_norm))
  )
  SELECT b.medida_id, b.tipo_os, sum(b.soma), sum(b.linhas)::bigint,
    (SELECT array_agg(DISTINCT v) FROM base b2 CROSS JOIN LATERAL unnest(b2.distintos) v
      WHERE b2.medida_id = b.medida_id AND b2.tipo_os = b.tipo_os),
    min(b.atualizado_em)
  FROM base b
  GROUP BY b.medida_id, b.tipo_os
$$;

GRANT EXECUTE ON FUNCTION bi_medidas_agregado(date, date, text[]) TO authenticated;
