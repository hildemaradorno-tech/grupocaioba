-- Plano DMS — base do futuro cálculo de comissões desse plano: cadastro de categorias
-- (Óleos e Filtros, Dinâmico, Preventivo, Pleno, ...) e a tabela de valores por categoria +
-- prazo (tempo em meses). A quantidade vendida de cada plano (que vai cruzar com esses valores
-- pra calcular a comissão) ainda não tem fonte definida — só o cadastro de valores por enquanto.
CREATE TABLE IF NOT EXISTS dim_categorias_plano_dms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fato_plano_dms_valores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES dim_categorias_plano_dms(id) ON DELETE CASCADE,
  tempo_meses integer NOT NULL,
  valor numeric(10,2) NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, tempo_meses)
);

ALTER TABLE dim_categorias_plano_dms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_categorias_plano_dms;
CREATE POLICY "auth_all" ON dim_categorias_plano_dms FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE fato_plano_dms_valores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON fato_plano_dms_valores;
CREATE POLICY "auth_all" ON fato_plano_dms_valores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed com os valores da planilha "VALORES CONSULTOR PLANO DE MANUTENÇÃO.xlsx" (aba Agosto).
-- Observação: no PREVENTIVO, o valor de 36 meses (140,40) é MENOR que o de 24 meses (166,05) —
-- mantido igual à planilha original; se for erro de digitação na fonte, é só corrigir depois
-- pela tela.
WITH cat AS (
  INSERT INTO dim_categorias_plano_dms (nome) VALUES
    ('ÓLEOS E FILTROS'), ('DINÂMICO'), ('PREVENTIVO'), ('PLENO')
  ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome
  RETURNING id, nome
)
INSERT INTO fato_plano_dms_valores (categoria_id, tempo_meses, valor)
SELECT cat.id, v.tempo_meses, v.valor
FROM cat
JOIN (VALUES
  ('ÓLEOS E FILTROS', 12, 66.00),
  ('ÓLEOS E FILTROS', 24, 101.25),
  ('ÓLEOS E FILTROS', 36, 151.20),
  ('ÓLEOS E FILTROS', 48, 190.35),
  ('ÓLEOS E FILTROS', 60, 230.85),
  ('DINÂMICO', 12, 75.60),
  ('DINÂMICO', 24, 125.55),
  ('DINÂMICO', 36, 180.90),
  ('DINÂMICO', 48, 251.10),
  ('DINÂMICO', 60, 290.25),
  ('PREVENTIVO', 12, 125.55),
  ('PREVENTIVO', 24, 166.05),
  ('PREVENTIVO', 36, 140.40),
  ('PREVENTIVO', 48, 251.10),
  ('PREVENTIVO', 60, 330.75),
  ('PLENO', 12, 151.20),
  ('PLENO', 24, 210.60),
  ('PLENO', 36, 290.25),
  ('PLENO', 48, 375.30),
  ('PLENO', 60, 500.85)
) AS v(nome, tempo_meses, valor) ON v.nome = cat.nome
ON CONFLICT (categoria_id, tempo_meses) DO UPDATE SET valor = EXCLUDED.valor;
