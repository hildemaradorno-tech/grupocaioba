-- Plano de Contas por empresa + importação do DMS (Dealer.net .xlsx / MicroWork .txt).
-- empresa_id: cada empresa tem o seu plano (Dealer.net e MicroWork têm estruturas diferentes).
-- conta_reduzida: código reduzido do DMS (Dealer.net PlanoConta_Codigo / MicroWork "Conta Reduzida")
--   — é por ele que os lançamentos contábeis costumam referenciar a conta.
-- conta_referencial: conta referencial ECD/ECF (só o MicroWork traz).
-- Chave: empresa + código + conta reduzida (o Dealer.net tem códigos repetidos com reduzidas
-- diferentes, ex.: 2.1.1.05.01.007 FINANCIAMENTO DAF / FINANCIAMENTO BANCO PACCAR).
-- Tabela vazia quando esta migration foi criada.

ALTER TABLE ctb_plano_contas ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES dim_empresas(id);
ALTER TABLE ctb_plano_contas ADD COLUMN IF NOT EXISTS conta_reduzida text;
ALTER TABLE ctb_plano_contas ADD COLUMN IF NOT EXISTS conta_referencial text;

ALTER TABLE ctb_plano_contas DROP CONSTRAINT IF EXISTS ctb_plano_contas_codigo_key;
ALTER TABLE ctb_plano_contas DROP CONSTRAINT IF EXISTS ctb_plano_contas_chave_key;
ALTER TABLE ctb_plano_contas ADD CONSTRAINT ctb_plano_contas_chave_key
  UNIQUE NULLS NOT DISTINCT (empresa_id, codigo, conta_reduzida);

CREATE INDEX IF NOT EXISTS ctb_plano_contas_empresa_idx ON ctb_plano_contas (empresa_id);

-- View pro Power BI: mesmas colunas de antes + empresa, conta reduzida e referencial no fim.
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
  c.conta_referencial
FROM ctb_plano_contas c
LEFT JOIN arvore a ON a.id = c.id
LEFT JOIN ctb_plano_contas p ON p.id = c.conta_pai_id
LEFT JOIN ctb_plano_contas r ON r.id = a.raiz_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id
LEFT JOIN dim_empresas e ON e.id = c.empresa_id;

ALTER VIEW vw_ctb_plano_contas SET (security_invoker = true);

NOTIFY pgrst, 'reload schema';
