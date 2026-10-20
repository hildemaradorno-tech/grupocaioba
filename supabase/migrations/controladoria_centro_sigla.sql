-- Centro de Resultado: campo Sigla (texto curto opcional). Views do Power BI ganham a coluna
-- no final (CREATE OR REPLACE VIEW só aceita colunas novas ao fim, sem mexer nas existentes).
ALTER TABLE ctb_centros_resultado ADD COLUMN IF NOT EXISTS sigla text;

CREATE OR REPLACE VIEW vw_ctb_centros_resultado AS
SELECT
  cr.id         AS centro_resultado_id,
  cr.codigo,
  cr.descricao,
  cr.ativo,
  s.id          AS sistema_id,
  s.nome        AS sistema,
  cr.sigla
FROM ctb_centros_resultado cr
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id;

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
  cr.sigla                 AS centro_resultado_sigla
FROM ctb_orcamento o
JOIN ctb_plano_contas c ON c.id = o.conta_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id
LEFT JOIN ctb_centros_resultado cr ON cr.id = o.centro_resultado_id
LEFT JOIN proj_sistemas s ON s.id = cr.sistema_id;
