-- Cadastro de Rubrica — alimenta o seletor "Código da Rubrica" em Política de Comissão (antes
-- era texto livre). Por enquanto só o código, sem seletor de sistema (adiado pelo usuário).
CREATE TABLE IF NOT EXISTS dim_rubricas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dim_rubricas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_rubricas;
CREATE POLICY "auth_all" ON dim_rubricas FOR ALL TO authenticated USING (true) WITH CHECK (true);
