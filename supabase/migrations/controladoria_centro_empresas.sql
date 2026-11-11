-- Centro de Resultado × Empresa: em quais empresas cada centro (departamento) existe.
-- Uma linha por centro × empresa (ex.: OFICINA em DAF CGR, DAF DOU e DAF TRES = 3 linhas).
-- Na tela o centro aparece uma vez só, com as empresas agrupadas numa coluna.
CREATE TABLE IF NOT EXISTS ctb_centro_resultado_empresas (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centro_resultado_id  uuid NOT NULL REFERENCES ctb_centros_resultado(id) ON DELETE CASCADE,
  empresa_id           uuid NOT NULL REFERENCES dim_empresas(id) ON DELETE CASCADE,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ctb_centro_resultado_empresas_key UNIQUE (centro_resultado_id, empresa_id)
);
CREATE INDEX IF NOT EXISTS ctb_centro_resultado_empresas_empresa_idx ON ctb_centro_resultado_empresas (empresa_id);

ALTER TABLE ctb_centro_resultado_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS por_modulo ON ctb_centro_resultado_empresas;
CREATE POLICY por_modulo ON ctb_centro_resultado_empresas FOR ALL TO authenticated
  USING (public.sec_tem_menu_like('controladoria', 'integracoes/controladoria'))
  WITH CHECK (public.sec_tem_menu_like('controladoria', 'integracoes/controladoria'));

-- Power BI: uma linha por centro × empresa, com os dados do centro e da empresa.
CREATE OR REPLACE VIEW vw_ctb_centros_resultado_empresas AS
SELECT
  ce.id          AS centro_empresa_id,
  cr.id          AS centro_resultado_id,
  cr.codigo,
  cr.descricao,
  cr.sigla,
  cr.ativo,
  s.id           AS sistema_id,
  s.nome         AS sistema,
  v.id           AS cr_visual_id,
  v.codigo       AS cr_visual_codigo,
  v.descricao    AS cr_visual,
  e.id           AS empresa_id,
  e.codigo_empresa,
  e.sigla_empresa,
  COALESCE(e.empresa_fantasia, e.nome_empresa) AS empresa
FROM ctb_centro_resultado_empresas ce
JOIN ctb_centros_resultado cr ON cr.id = ce.centro_resultado_id
JOIN dim_empresas e ON e.id = ce.empresa_id
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id
LEFT JOIN ctb_cr_visuais v ON v.id = cr.cr_visual_id;

-- View por centro (uma linha por centro) ganha no fim a quantidade e as siglas das empresas.
CREATE OR REPLACE VIEW vw_ctb_centros_resultado AS
SELECT
  cr.id         AS centro_resultado_id,
  cr.codigo,
  cr.descricao,
  cr.ativo,
  s.id          AS sistema_id,
  s.nome        AS sistema,
  cr.sigla,
  v.id          AS cr_visual_id,
  v.codigo      AS cr_visual_codigo,
  v.descricao   AS cr_visual,
  (SELECT count(*) FROM ctb_centro_resultado_empresas ce WHERE ce.centro_resultado_id = cr.id) AS qtd_empresas,
  (SELECT string_agg(e.sigla_empresa, ', ' ORDER BY e.codigo_empresa)
     FROM ctb_centro_resultado_empresas ce JOIN dim_empresas e ON e.id = ce.empresa_id
    WHERE ce.centro_resultado_id = cr.id) AS empresas
FROM ctb_centros_resultado cr
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id
LEFT JOIN ctb_cr_visuais v ON v.id = cr.cr_visual_id;

ALTER VIEW vw_ctb_centros_resultado_empresas SET (security_invoker = true);
ALTER VIEW vw_ctb_centros_resultado          SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
