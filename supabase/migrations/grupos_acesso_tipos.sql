-- Tipo do grupo de acesso (Gerentes, Diretores, Coordenadores, Garantistas…) — só classificação,
-- não interfere na liberação de acessos. Administrador continua sendo grupos_acesso.is_admin.
CREATE TABLE IF NOT EXISTS grupos_acesso_tipos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
INSERT INTO grupos_acesso_tipos (nome) VALUES ('Gerentes'), ('Diretores'), ('Coordenadores'), ('Garantistas')
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS tipo_id uuid REFERENCES grupos_acesso_tipos(id) ON DELETE SET NULL;

ALTER TABLE grupos_acesso_tipos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON grupos_acesso_tipos;
DROP POLICY IF EXISTS escrita_governanca ON grupos_acesso_tipos;
CREATE POLICY sel_auth ON grupos_acesso_tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_governanca ON grupos_acesso_tipos FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['grupos', 'permissoes-matriz'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['grupos', 'permissoes-matriz'])));
