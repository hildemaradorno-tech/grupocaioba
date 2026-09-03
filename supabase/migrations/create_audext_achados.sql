-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Achados (Findings)
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_achados (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciclo_id              uuid NOT NULL REFERENCES audext_ciclos(id) ON DELETE CASCADE,
  numero_codigo         text NOT NULL,
  titulo                text NOT NULL,
  classificacao_risco   text NOT NULL DEFAULT 'media',
  fundamentacao_tecnica text,
  fatos_apontados       text,
  recomendacoes         text,
  total_apontado        numeric NOT NULL DEFAULT 0,
  criado_em             timestamptz NOT NULL DEFAULT now(),
  criado_por            text,
  atualizado_em         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_achados DROP CONSTRAINT IF EXISTS audext_achados_risco_check;
ALTER TABLE audext_achados ADD CONSTRAINT audext_achados_risco_check
  CHECK (classificacao_risco IN ('alta', 'media', 'baixa'));

CREATE INDEX IF NOT EXISTS audext_achados_ciclo_idx ON audext_achados (ciclo_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE audext_achados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON audext_achados;
CREATE POLICY "auth_all" ON audext_achados FOR ALL TO authenticated USING (true) WITH CHECK (true);
