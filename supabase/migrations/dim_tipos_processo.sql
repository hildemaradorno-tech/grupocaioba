-- Cadastro de Tipo de Processo — alimenta o seletor "Tipo do Processo" em Política de Comissão
-- (antes era texto livre, ex: "11" para Mensal).
CREATE TABLE IF NOT EXISTS dim_tipos_processo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dim_tipos_processo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON dim_tipos_processo;
CREATE POLICY "auth_all" ON dim_tipos_processo FOR ALL TO authenticated USING (true) WITH CHECK (true);
