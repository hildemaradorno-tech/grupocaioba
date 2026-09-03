-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Divergências (Discrepancy Items) — itens individuais de cada achado
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_divergencias (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achado_id             uuid NOT NULL REFERENCES audext_achados(id) ON DELETE CASCADE,
  conta_codigo          text,
  conta_descricao       text,
  parte_relacionada     text,
  saldo_contabil        numeric NOT NULL DEFAULT 0,
  saldo_financeiro      numeric NOT NULL DEFAULT 0,
  divergencia_apurada   numeric NOT NULL DEFAULT 0,
  tipo_inconsistencia   text NOT NULL,
  status_contabil       text NOT NULL DEFAULT 'em_revisao',
  observacoes           text,
  data_vencimento       date,
  criado_em             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_divergencias DROP CONSTRAINT IF EXISTS audext_diverg_tipo_check;
ALTER TABLE audext_divergencias ADD CONSTRAINT audext_diverg_tipo_check
  CHECK (tipo_inconsistencia IN ('diferenca_criterio', 'saldo_invertido', 'ausencia_reconhecimento', 'aging_vencido'));

ALTER TABLE audext_divergencias DROP CONSTRAINT IF EXISTS audext_diverg_status_check;
ALTER TABLE audext_divergencias ADD CONSTRAINT audext_diverg_status_check
  CHECK (status_contabil IN ('sem_impacto', 'exige_ajuste', 'ja_corrigido', 'em_revisao'));

CREATE INDEX IF NOT EXISTS audext_divergencias_achado_idx ON audext_divergencias (achado_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE audext_divergencias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON audext_divergencias;
CREATE POLICY "auth_all" ON audext_divergencias FOR ALL TO authenticated USING (true) WITH CHECK (true);
