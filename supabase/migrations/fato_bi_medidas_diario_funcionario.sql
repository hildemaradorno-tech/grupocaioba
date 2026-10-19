-- BI Possibilidades: aba Balcão mostra os vendedores abaixo do setor — o resultado diário passa a
-- guardar também o Funcionário da linha do relatório (coluna "Funcionário" da Fonte; no Balcão,
-- NF_UsuNomVendedor). Valor cru, como vem do arquivo; o casamento com a meta é por nome normalizado
-- no frontend.
ALTER TABLE fato_bi_medidas_diario ADD COLUMN IF NOT EXISTS funcionario text NOT NULL DEFAULT '';

ALTER TABLE fato_bi_medidas_diario DROP CONSTRAINT IF EXISTS fato_bi_medidas_diario_pkey;
ALTER TABLE fato_bi_medidas_diario ADD CONSTRAINT fato_bi_medidas_diario_pkey
  PRIMARY KEY (medida_id, data, empresa_norm, tipo_os, funcionario);

-- Mesma soma do período, agora também por Funcionário.
DROP FUNCTION IF EXISTS bi_medidas_agregado(date, date, text[]);

CREATE OR REPLACE FUNCTION bi_medidas_agregado(p_inicio date, p_fim date, p_empresas_norm text[] DEFAULT NULL)
RETURNS TABLE (medida_id uuid, tipo_os text, funcionario text, soma numeric, linhas bigint, distintos text[], atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.*
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresas_norm IS NULL OR cardinality(p_empresas_norm) = 0 OR d.empresa_norm = ANY (p_empresas_norm))
  )
  SELECT b.medida_id, b.tipo_os, b.funcionario, sum(b.soma), sum(b.linhas)::bigint,
    (SELECT array_agg(DISTINCT v) FROM base b2 CROSS JOIN LATERAL unnest(b2.distintos) v
      WHERE b2.medida_id = b.medida_id AND b2.tipo_os = b.tipo_os AND b2.funcionario = b.funcionario),
    min(b.atualizado_em)
  FROM base b
  GROUP BY b.medida_id, b.tipo_os, b.funcionario
$$;

GRANT EXECUTE ON FUNCTION bi_medidas_agregado(date, date, text[]) TO authenticated;
