-- BI Possibilidades: as funções de soma calculavam os "distintos" (OS distintas das Passagens) com um
-- subselect por grupo que varria o período inteiro de novo — com o ano todo (aba Evolução) levava
-- 18–22 s e estourava o tempo limite das consultas da tela. Agora: somas num GROUP BY e distintos
-- noutro (unnest uma vez só), juntados no fim. Mesmo resultado, ordem de grandeza mais rápido.

CREATE OR REPLACE FUNCTION bi_medidas_agregado(p_inicio date, p_fim date, p_empresas_norm text[] DEFAULT NULL)
RETURNS TABLE (medida_id uuid, tipo_os text, funcionario text, soma numeric, linhas bigint, distintos text[], atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.medida_id, d.tipo_os, d.funcionario, d.soma, d.linhas, d.distintos, d.atualizado_em
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresas_norm IS NULL OR cardinality(p_empresas_norm) = 0 OR d.empresa_norm = ANY (p_empresas_norm))
  ),
  somas AS (
    SELECT b.medida_id, b.tipo_os, b.funcionario, sum(b.soma) AS soma, sum(b.linhas)::bigint AS linhas, min(b.atualizado_em) AS atualizado_em
    FROM base b GROUP BY b.medida_id, b.tipo_os, b.funcionario
  ),
  dist AS (
    SELECT b.medida_id, b.tipo_os, b.funcionario, array_agg(DISTINCT v) AS distintos
    FROM base b CROSS JOIN LATERAL unnest(b.distintos) v
    GROUP BY b.medida_id, b.tipo_os, b.funcionario
  )
  SELECT s.medida_id, s.tipo_os, s.funcionario, s.soma, s.linhas, d.distintos, s.atualizado_em
  FROM somas s
  LEFT JOIN dist d ON d.medida_id = s.medida_id AND d.tipo_os = s.tipo_os AND d.funcionario = s.funcionario
$$;

CREATE OR REPLACE FUNCTION bi_medidas_agregado_mensal(p_inicio date, p_fim date, p_empresas_norm text[] DEFAULT NULL)
RETURNS TABLE (medida_id uuid, ano int, mes int, tipo_os text, soma numeric, linhas bigint, distintos text[])
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.medida_id, extract(year FROM d.data)::int AS ano, extract(month FROM d.data)::int AS mes,
      d.tipo_os, d.soma, d.linhas, d.distintos
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresas_norm IS NULL OR cardinality(p_empresas_norm) = 0 OR d.empresa_norm = ANY (p_empresas_norm))
  ),
  somas AS (
    SELECT b.medida_id, b.ano, b.mes, b.tipo_os, sum(b.soma) AS soma, sum(b.linhas)::bigint AS linhas
    FROM base b GROUP BY b.medida_id, b.ano, b.mes, b.tipo_os
  ),
  dist AS (
    SELECT b.medida_id, b.ano, b.mes, b.tipo_os, array_agg(DISTINCT v) AS distintos
    FROM base b CROSS JOIN LATERAL unnest(b.distintos) v
    GROUP BY b.medida_id, b.ano, b.mes, b.tipo_os
  )
  SELECT s.medida_id, s.ano, s.mes, s.tipo_os, s.soma, s.linhas, d.distintos
  FROM somas s
  LEFT JOIN dist d ON d.medida_id = s.medida_id AND d.ano = s.ano AND d.mes = s.mes AND d.tipo_os = s.tipo_os
$$;

GRANT EXECUTE ON FUNCTION bi_medidas_agregado(date, date, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION bi_medidas_agregado_mensal(date, date, text[]) TO authenticated;
