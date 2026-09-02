-- ============================================================
-- MÓDULO: Governança — Grupo de Acessos
-- Controle dos grupos de acesso de sistemas externos (Dealer.net,
-- MicroWork), com a lista de permissões/telas que cada grupo libera.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS governanca_grupos_acesso (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  sistema     text NOT NULL CHECK (sistema IN ('Dealer.net', 'MicroWork')),
  descricao   text,
  permissoes  jsonb NOT NULL DEFAULT '[]',
  ativo       boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (nome, sistema)
);

CREATE INDEX IF NOT EXISTS governanca_grupos_acesso_sistema_idx ON governanca_grupos_acesso (sistema);

ALTER TABLE governanca_grupos_acesso ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON governanca_grupos_acesso;
CREATE POLICY "auth_all" ON governanca_grupos_acesso FOR ALL TO authenticated USING (true) WITH CHECK (true);
