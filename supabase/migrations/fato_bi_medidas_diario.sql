-- BI Possibilidades ("Faturamento — Total"): resultado das Medidas BI com Slot gravado por dia,
-- pra tela abrir lendo do Supabase em vez de ler os arquivos do SharePoint a cada acesso.
-- Uma linha por Medida × dia × empresa (nome normalizado, como vem no arquivo) × Tipo de OS
-- (valor cru do arquivo). A conversão Tipo de OS → Departamento/Setor continua no frontend
-- (cadastro de Tipos de O.S.), então corrigir o cadastro reflete na hora, sem nova sincronização.
-- Gravada pelo backend (service role): biMedidasDiarioSync.js — só manual, pelo botão
-- "Atualizar agora" da tela ou pelo "Atualizar Agora" da Matriz KPIs.
CREATE TABLE IF NOT EXISTS fato_bi_medidas_diario (
  medida_id     uuid        NOT NULL REFERENCES dim_medidas_bi(id) ON DELETE CASCADE,
  data          date        NOT NULL,
  empresa_norm  text        NOT NULL DEFAULT '',
  tipo_os       text        NOT NULL DEFAULT '',
  soma          numeric     NOT NULL DEFAULT 0,
  linhas        integer     NOT NULL DEFAULT 0,
  -- Só pra Medida de Contagem Distinta (ex.: Passagens = OS distintas): valores crus do dia.
  distintos     text[],
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (medida_id, data, empresa_norm, tipo_os)
);

CREATE INDEX IF NOT EXISTS fato_bi_medidas_diario_data_idx ON fato_bi_medidas_diario (data, empresa_norm);

ALTER TABLE fato_bi_medidas_diario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_select" ON fato_bi_medidas_diario;
CREATE POLICY "auth_select" ON fato_bi_medidas_diario
  FOR SELECT TO authenticated USING (true);

-- Soma o período filtrado na própria base (uma chamada, poucas linhas de volta): por Medida ×
-- Tipo de OS, com a união dos distintos (contagem distinta correta entre dias) e a data da
-- gravação mais antiga do período ("Última atualização" da tela).
CREATE OR REPLACE FUNCTION bi_medidas_agregado(p_inicio date, p_fim date, p_empresa_norm text DEFAULT NULL)
RETURNS TABLE (medida_id uuid, tipo_os text, soma numeric, linhas bigint, distintos text[], atualizado_em timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  WITH base AS (
    SELECT d.*
    FROM fato_bi_medidas_diario d
    WHERE d.data BETWEEN p_inicio AND p_fim
      AND (p_empresa_norm IS NULL OR d.empresa_norm = p_empresa_norm)
  )
  SELECT b.medida_id, b.tipo_os, sum(b.soma), sum(b.linhas)::bigint,
    (SELECT array_agg(DISTINCT v) FROM base b2 CROSS JOIN LATERAL unnest(b2.distintos) v
      WHERE b2.medida_id = b.medida_id AND b2.tipo_os = b.tipo_os),
    min(b.atualizado_em)
  FROM base b
  GROUP BY b.medida_id, b.tipo_os
$$;

GRANT EXECUTE ON FUNCTION bi_medidas_agregado(date, date, text) TO authenticated;
