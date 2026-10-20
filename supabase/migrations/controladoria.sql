-- Menu Controladoria (Configurações → Departamentos → Controladoria): estrutura da DRE,
-- Plano de Contas e Centros de Resultado. Prefixo ctb_ (contábil) nas tabelas; o Power BI lê
-- pelas views vw_ctb_* no fim do arquivo.

-- Linhas da DRE (estrutura do relatório). tipo CONTAS = soma as contas do Plano de Contas
-- vinculadas a ela; SUBTOTAL = soma de todas as linhas CONTAS acima dela (ex: Receita Líquida,
-- Lucro Bruto, Resultado Líquido). sinal: +1 soma, -1 subtrai (ex: deduções, custos, despesas).
CREATE TABLE IF NOT EXISTS ctb_dre_linhas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem      integer NOT NULL DEFAULT 0,
  descricao  text NOT NULL,
  tipo       text NOT NULL DEFAULT 'CONTAS' CHECK (tipo IN ('CONTAS', 'SUBTOTAL')),
  sinal      smallint NOT NULL DEFAULT 1 CHECK (sinal IN (1, -1)),
  destaque   boolean NOT NULL DEFAULT false,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Plano de Contas hierárquico (conta_pai_id). Sintética agrupa, Analítica recebe lançamento.
-- linha_dre_id: em qual linha da DRE a conta (analítica) é somada.
CREATE TABLE IF NOT EXISTS ctb_plano_contas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  descricao     text NOT NULL,
  tipo          text NOT NULL DEFAULT 'ANALITICA' CHECK (tipo IN ('SINTETICA', 'ANALITICA')),
  natureza      text NOT NULL DEFAULT 'DEVEDORA' CHECK (natureza IN ('DEVEDORA', 'CREDORA')),
  conta_pai_id  uuid REFERENCES ctb_plano_contas(id) ON DELETE SET NULL,
  linha_dre_id  uuid REFERENCES ctb_dre_linhas(id) ON DELETE SET NULL,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ctb_centros_resultado (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           text NOT NULL UNIQUE,
  descricao        text NOT NULL,
  empresa_id       uuid REFERENCES dim_empresas(id) ON DELETE SET NULL,
  departamento_id  uuid REFERENCES dim_departamentos(id) ON DELETE SET NULL,
  ativo            boolean NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ctb_dre_linhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctb_plano_contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctb_centros_resultado ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON ctb_dre_linhas;
DROP POLICY IF EXISTS "auth_all" ON ctb_plano_contas;
DROP POLICY IF EXISTS "auth_all" ON ctb_centros_resultado;
CREATE POLICY "auth_all" ON ctb_dre_linhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON ctb_plano_contas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON ctb_centros_resultado FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS ctb_plano_contas_pai_idx ON ctb_plano_contas (conta_pai_id);
CREATE INDEX IF NOT EXISTS ctb_plano_contas_linha_dre_idx ON ctb_plano_contas (linha_dre_id);

-- ── Views para Power BI ──────────────────────────────────────────────────────
-- Joins já resolvidos (nomes no lugar de ids) e hierarquia achatada, prontas pra conectar
-- direto no Power BI. Os ids continuam presentes pra relacionar as views entre si.

CREATE OR REPLACE VIEW vw_ctb_dre_estrutura AS
SELECT
  l.id         AS linha_dre_id,
  l.ordem,
  l.descricao  AS linha_dre,
  l.tipo,
  l.sinal,
  l.destaque,
  l.ativo,
  (SELECT count(*) FROM ctb_plano_contas c WHERE c.linha_dre_id = l.id) AS qtd_contas
FROM ctb_dre_linhas l;

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
  l.sinal         AS linha_dre_sinal
FROM ctb_plano_contas c
LEFT JOIN arvore a ON a.id = c.id
LEFT JOIN ctb_plano_contas p ON p.id = c.conta_pai_id
LEFT JOIN ctb_plano_contas r ON r.id = a.raiz_id
LEFT JOIN ctb_dre_linhas l ON l.id = c.linha_dre_id;

CREATE OR REPLACE VIEW vw_ctb_centros_resultado AS
SELECT
  cr.id                 AS centro_resultado_id,
  cr.codigo,
  cr.descricao,
  cr.ativo,
  e.id                  AS empresa_id,
  e.codigo_empresa,
  COALESCE(e.empresa_fantasia, e.nome_empresa) AS empresa,
  d.id                  AS departamento_id,
  d.nome_departamento   AS departamento,
  d.area
FROM ctb_centros_resultado cr
LEFT JOIN dim_empresas e ON e.id = cr.empresa_id
LEFT JOIN dim_departamentos d ON d.id = cr.departamento_id;
