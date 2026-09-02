-- ============================================================
-- MÓDULO: Governança — Perfis de Acesso (matriz menu × perfil)
-- Catálogo real do menu de cada sistema externo (importado do próprio
-- sistema, ex.: Dealer.net) em árvore, perfis cadastrados pelo usuário
-- como colunas, e o cruzamento (perfil tem acesso a este item de menu?).
-- Executar no Supabase SQL Editor
-- ============================================================

-- Árvore de menus/submenus de cada sistema externo (pai_id nulo = nível 1)
CREATE TABLE IF NOT EXISTS governanca_menus (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema    text NOT NULL CHECK (sistema IN ('Dealer.net', 'MicroWork')),
  pai_id     uuid REFERENCES governanca_menus(id) ON DELETE CASCADE,
  nome       text NOT NULL,
  ordem      int NOT NULL DEFAULT 0,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS governanca_menus_sistema_idx ON governanca_menus (sistema);
CREATE INDEX IF NOT EXISTS governanca_menus_pai_idx ON governanca_menus (pai_id);

-- Perfis de acesso cadastrados pelo usuário (as "colunas" da matriz)
CREATE TABLE IF NOT EXISTS governanca_perfis (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sistema    text NOT NULL CHECK (sistema IN ('Dealer.net', 'MicroWork')),
  nome       text NOT NULL,
  descricao  text,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sistema, nome)
);

-- Cruzamento perfil × item de menu (o "check" da matriz)
CREATE TABLE IF NOT EXISTS governanca_perfil_menus (
  perfil_id  uuid NOT NULL REFERENCES governanca_perfis(id) ON DELETE CASCADE,
  menu_id    uuid NOT NULL REFERENCES governanca_menus(id) ON DELETE CASCADE,
  criado_em  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (perfil_id, menu_id)
);

CREATE INDEX IF NOT EXISTS governanca_perfil_menus_menu_idx ON governanca_perfil_menus (menu_id);

ALTER TABLE governanca_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE governanca_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE governanca_perfil_menus ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON governanca_menus;
DROP POLICY IF EXISTS "auth_all" ON governanca_perfis;
DROP POLICY IF EXISTS "auth_all" ON governanca_perfil_menus;

CREATE POLICY "auth_all" ON governanca_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON governanca_perfis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON governanca_perfil_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
