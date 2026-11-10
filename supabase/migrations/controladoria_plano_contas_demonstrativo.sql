-- Plano de Contas: "Tipo de Conta" = em qual demonstrativo a conta entra: DRE ou Balanço Patrimonial.
-- Substitui, na tela, o campo "Linha da DRE" (a coluna linha_dre_id continua no banco, sem uso na tela).
-- Preenchimento inicial pelo grupo (1º dígito do código), igual nos dois DMS:
--   1 Ativo, 2 Passivo → BALANCO;  3 Receitas/Resultado, 4 Custos/Apuração → DRE;
--   demais (5 Transitórias, 6 Encerramento, 7/8 Compensação) ficam em branco pra definir na tela.
ALTER TABLE ctb_plano_contas ADD COLUMN IF NOT EXISTS demonstrativo text
  CHECK (demonstrativo IN ('DRE', 'BALANCO'));

UPDATE ctb_plano_contas
SET demonstrativo = CASE left(codigo, 1) WHEN '1' THEN 'BALANCO' WHEN '2' THEN 'BALANCO' WHEN '3' THEN 'DRE' WHEN '4' THEN 'DRE' END
WHERE demonstrativo IS NULL;

-- View do Power BI: mesma definição + demonstrativo no fim.
CREATE OR REPLACE VIEW vw_ctb_plano_contas AS
WITH RECURSIVE arvore AS (
  SELECT c.id, c.codigo, c.descricao, 1 AS nivel, c.codigo::text AS caminho_codigo, c.descricao::text AS caminho_descricao,
         c.id AS raiz_id
  FROM ctb_plano_contas c WHERE c.conta_pai_id IS NULL
  UNION ALL
  SELECT f.id, f.codigo, f.descricao, a.nivel + 1, a.caminho_codigo || ' > ' || f.codigo, a.caminho_descricao || ' > ' || f.descricao,
         a.raiz_id
  FROM ctb_plano_contas f JOIN arvore a ON f.conta_pai_id = a.id
  WHERE a.nivel < 20
)
SELECT
  c.id            AS conta_id,
  c.codigo,
  c.descricao,
  c.tipo,
  c.natureza,
  c.ativo,
  a.nivel,
  a.caminho_codigo,
  a.caminho_descricao,
  p.id            AS conta_pai_id,
  p.codigo        AS conta_pai_codigo,
  p.descricao     AS conta_pai_descricao,
  r.codigo        AS grupo_codigo,
  r.descricao     AS grupo_descricao,
  l.id            AS linha_dre_id,
  l.ordem         AS linha_dre_ordem,
  l.descricao     AS linha_dre,
  l.sinal         AS linha_dre_sinal,
  e.id            AS empresa_id,
  e.codigo_empresa,
  e.sigla_empresa,
  COALESCE(e.empresa_fantasia, e.nome_empresa) AS empresa,
  c.conta_reduzida,
  c.conta_referencial,
  c.demonstrativo,
  CASE c.demonstrativo WHEN 'DRE' THEN 'DRE' WHEN 'BALANCO' THEN 'Balanço Patrimonial' END AS demonstrativo_descricao
FROM ctb_plano_contas c
LEFT JOIN arvore a ON a.id = c.id
LEFT JOIN ctb_plano_contas p ON p.id = c.conta_pai_id
LEFT JOIN ctb_plano_contas r ON r.id = a.raiz_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id
LEFT JOIN dim_empresas e ON e.id = c.empresa_id;

ALTER VIEW vw_ctb_plano_contas SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
