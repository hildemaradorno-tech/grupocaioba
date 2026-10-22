-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Janela de reabertura: por quantos dias (úteis, se reabertura_pular_fds) após o FECHAMENTO
-- da auditoria ainda é permitido reabrir. Vale até o fim do expediente do N-ésimo dia.
--   0 = só no mesmo dia do fechamento · 1 = até o fim do expediente do dia seguinte …
-- O Admin não tem esse limite.
-- ============================================================

ALTER TABLE aud_configuracoes
  ADD COLUMN IF NOT EXISTS reabertura_janela_dias int NOT NULL DEFAULT 1 CHECK (reabertura_janela_dias BETWEEN 0 AND 30);

NOTIFY pgrst, 'reload schema';
