-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Configurações gerais (uma linha, id = 'geral'), editadas pelo Admin na engrenagem.
-- Regra de reabertura: o novo prazo é calculado a partir da data da reabertura:
--   + reabertura_dias dias (pulando sábado/domingo se reabertura_pular_fds), às reabertura_hora.
-- Usuários não-Admin não alteram o prazo calculado; o Admin pode ajustar.
-- ============================================================

CREATE TABLE IF NOT EXISTS aud_configuracoes (
  id                    text PRIMARY KEY DEFAULT 'geral',
  reabertura_dias       int  NOT NULL DEFAULT 1 CHECK (reabertura_dias BETWEEN 0 AND 60),
  reabertura_hora       time NOT NULL DEFAULT '15:00',
  reabertura_pular_fds  boolean NOT NULL DEFAULT true,
  atualizado_em         timestamptz,
  atualizado_por        text
);

INSERT INTO aud_configuracoes (id) VALUES ('geral') ON CONFLICT (id) DO NOTHING;

ALTER TABLE aud_configuracoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON aud_configuracoes;
CREATE POLICY "auth_all" ON aud_configuracoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
