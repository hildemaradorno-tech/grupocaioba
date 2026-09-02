-- ============================================================
-- Governança — cruzamento Grupo de Acesso × item de menu (matriz
-- da tela /governanca/grupo-acessos: menus em cascata nas linhas,
-- grupos de acesso nas colunas, checkbox no cruzamento).
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS governanca_grupo_menus (
  grupo_id   uuid NOT NULL REFERENCES governanca_grupos_acesso(id) ON DELETE CASCADE,
  menu_id    uuid NOT NULL REFERENCES governanca_menus(id) ON DELETE CASCADE,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, menu_id)
);

CREATE INDEX IF NOT EXISTS governanca_grupo_menus_menu_idx ON governanca_grupo_menus (menu_id);

ALTER TABLE governanca_grupo_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON governanca_grupo_menus;
CREATE POLICY "auth_all" ON governanca_grupo_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
