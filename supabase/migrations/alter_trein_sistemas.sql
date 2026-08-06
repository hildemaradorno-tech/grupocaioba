-- ============================================================
-- Grade de Treinamentos: cadastro de apoio "Sistema" (ex.: Bizneo,
-- SAP, Portal de Gestão...) para os cursos, no mesmo padrão de
-- trein_categorias — select + quick-add "+" no modal de curso.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS trein_sistemas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trein_cursos
  ADD COLUMN IF NOT EXISTS sistema_id   uuid REFERENCES trein_sistemas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sistema_nome text;

ALTER TABLE trein_sistemas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON trein_sistemas;
CREATE POLICY "auth_all" ON trein_sistemas FOR ALL TO authenticated USING (true) WITH CHECK (true);
