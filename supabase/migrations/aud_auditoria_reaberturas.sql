-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Histórico de reaberturas da auditoria (quem, quando, de qual status, novo prazo).
-- Regra (aplicada na tela):
--   * Admin: reabre qualquer auditoria, sem limite.
--   * Grupo com a ação 'reabrir' (matriz de permissões): só a última auditoria da empresa
--     e só se ela ainda não foi reaberta por um não-admin (1 vez).
-- ============================================================

CREATE TABLE IF NOT EXISTS aud_auditoria_reaberturas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id    uuid NOT NULL REFERENCES aud_auditorias(id) ON DELETE CASCADE,
  reaberto_por    text,
  reaberto_em     timestamptz NOT NULL DEFAULT now(),
  por_admin       boolean NOT NULL DEFAULT false,
  status_anterior text,
  prazo_novo      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aud_reaberturas_auditoria ON aud_auditoria_reaberturas(auditoria_id);

ALTER TABLE aud_auditoria_reaberturas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_auditoria_reaberturas;
CREATE POLICY "auth_all" ON aud_auditoria_reaberturas FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
