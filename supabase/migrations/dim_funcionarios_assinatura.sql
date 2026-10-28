-- Assinatura (imagem PNG em data URL) do funcionário, usada em documentos.
-- Tabela separada para não pesar a listagem de dim_funcionarios.
CREATE TABLE IF NOT EXISTS dim_funcionarios_assinatura (
  funcionario_id uuid PRIMARY KEY REFERENCES dim_funcionarios(id) ON DELETE CASCADE,
  imagem         text NOT NULL,
  atualizado_em  timestamptz NOT NULL DEFAULT now(),
  atualizado_por text
);
ALTER TABLE dim_funcionarios_assinatura ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON dim_funcionarios_assinatura;
DROP POLICY IF EXISTS escrita_por_menu ON dim_funcionarios_assinatura;
CREATE POLICY sel_auth ON dim_funcionarios_assinatura FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_por_menu ON dim_funcionarios_assinatura FOR ALL TO authenticated
  USING (sec_tem_menu(VARIADIC ARRAY['funcionarios']))
  WITH CHECK (sec_tem_menu(VARIADIC ARRAY['funcionarios']));
