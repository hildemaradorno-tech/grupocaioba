-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa (Achados/Divergências)
-- Ciclos de Auditoria (Audit Engagement)
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_ciclos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           uuid REFERENCES proj_empresas(id) ON DELETE SET NULL,
  periodo_competencia  text NOT NULL,
  firma_auditoria      text,
  status               text NOT NULL DEFAULT 'em_andamento',
  observacoes          text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  criado_por           text
);

ALTER TABLE audext_ciclos DROP CONSTRAINT IF EXISTS audext_ciclos_status_check;
ALTER TABLE audext_ciclos ADD CONSTRAINT audext_ciclos_status_check
  CHECK (status IN ('em_andamento', 'concluido', 'arquivado'));

CREATE INDEX IF NOT EXISTS audext_ciclos_empresa_idx ON audext_ciclos (empresa_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE audext_ciclos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON audext_ciclos;
CREATE POLICY "auth_all" ON audext_ciclos FOR ALL TO authenticated USING (true) WITH CHECK (true);
