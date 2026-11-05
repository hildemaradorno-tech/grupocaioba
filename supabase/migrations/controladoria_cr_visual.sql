-- CR Visual: nomenclatura própria dos Centros de Resultado usada em Orçamento e nos dashboards.
-- Vários centros (de sistemas diferentes) podem apontar para o mesmo CR Visual.
CREATE TABLE IF NOT EXISTS ctb_cr_visuais (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao   text NOT NULL UNIQUE,
  ordem       integer NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ctb_cr_visuais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS por_modulo ON ctb_cr_visuais;
CREATE POLICY por_modulo ON ctb_cr_visuais FOR ALL TO authenticated
  USING (public.sec_tem_menu_like('controladoria', 'integracoes/controladoria'))
  WITH CHECK (public.sec_tem_menu_like('controladoria', 'integracoes/controladoria'));

ALTER TABLE ctb_centros_resultado ADD COLUMN IF NOT EXISTS cr_visual_id uuid REFERENCES ctb_cr_visuais(id) ON DELETE SET NULL;

-- Views do Power BI (colunas novas sempre no final).
CREATE OR REPLACE VIEW vw_ctb_cr_visuais AS
SELECT
  v.id         AS cr_visual_id,
  v.descricao  AS cr_visual,
  v.ordem,
  v.ativo,
  (SELECT count(*) FROM ctb_centros_resultado cr WHERE cr.cr_visual_id = v.id) AS qtd_centros
FROM ctb_cr_visuais v;

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
  v.descricao   AS cr_visual,
  v.ordem       AS cr_visual_ordem
FROM ctb_centros_resultado cr
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id
LEFT JOIN ctb_cr_visuais v ON v.id = cr.cr_visual_id;

CREATE OR REPLACE VIEW vw_ctb_orcamento AS
SELECT
  o.id                     AS orcamento_id,
  o.ano,
  o.mes,
  make_date(o.ano, o.mes, 1) AS data_competencia,
  o.valor,
  o.conta_id,
  c.codigo                 AS conta_codigo,
  c.descricao              AS conta_descricao,
  c.natureza               AS conta_natureza,
  l.id                     AS linha_dre_id,
  l.ordem                  AS linha_dre_ordem,
  l.descricao              AS linha_dre,
  l.sinal                  AS linha_dre_sinal,
  o.centro_resultado_id,
  cr.codigo                AS centro_resultado_codigo,
  COALESCE(cr.descricao, '(Geral)') AS centro_resultado,
  s.id                     AS sistema_id,
  s.nome                   AS sistema,
  o.atualizado_por,
  o.atualizado_em,
  cr.sigla                 AS centro_resultado_sigla,
  v.id                     AS cr_visual_id,
  v.descricao              AS cr_visual
FROM ctb_orcamento o
JOIN ctb_plano_contas c ON c.id = o.conta_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id
LEFT JOIN ctb_centros_resultado cr ON cr.id = o.centro_resultado_id
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id
LEFT JOIN ctb_cr_visuais v ON v.id = cr.cr_visual_id;

ALTER VIEW vw_ctb_cr_visuais         SET (security_invoker = true);
ALTER VIEW vw_ctb_centros_resultado  SET (security_invoker = true);
ALTER VIEW vw_ctb_orcamento          SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
