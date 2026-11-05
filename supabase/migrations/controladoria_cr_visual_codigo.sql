-- Centro de Resultado (Visual): "ordem" vira "codigo" (texto, obrigatório e único) — é a chave
-- que vai relacionar o CR Visual com outras informações (Orçamento, dashboards, Power BI).
-- Tabela ainda vazia quando esta migration foi criada.
-- As views dependem da coluna: derruba antes de alterar e recria no fim.
DROP VIEW IF EXISTS vw_ctb_cr_visuais;
DROP VIEW IF EXISTS vw_ctb_centros_resultado;
DROP VIEW IF EXISTS vw_ctb_orcamento;

ALTER TABLE ctb_cr_visuais RENAME COLUMN ordem TO codigo;
ALTER TABLE ctb_cr_visuais ALTER COLUMN codigo DROP DEFAULT;
ALTER TABLE ctb_cr_visuais ALTER COLUMN codigo TYPE text USING codigo::text;
ALTER TABLE ctb_cr_visuais ALTER COLUMN codigo SET NOT NULL;
ALTER TABLE ctb_cr_visuais DROP CONSTRAINT IF EXISTS ctb_cr_visuais_codigo_key;
ALTER TABLE ctb_cr_visuais ADD CONSTRAINT ctb_cr_visuais_codigo_key UNIQUE (codigo);

CREATE VIEW vw_ctb_cr_visuais AS
SELECT
  v.id         AS cr_visual_id,
  v.codigo     AS cr_visual_codigo,
  v.descricao  AS cr_visual,
  v.ativo,
  (SELECT count(*) FROM ctb_centros_resultado cr WHERE cr.cr_visual_id = v.id) AS qtd_centros
FROM ctb_cr_visuais v;

CREATE VIEW vw_ctb_centros_resultado AS
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
  v.descricao   AS cr_visual
FROM ctb_centros_resultado cr
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id
LEFT JOIN ctb_cr_visuais v ON v.id = cr.cr_visual_id;

CREATE VIEW vw_ctb_orcamento AS
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
  v.descricao              AS cr_visual,
  v.codigo                 AS cr_visual_codigo
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
