-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Status da AUDITORIA (cabeçalho). Toda auditoria passa por 3 etapas:
--   conferencia  → Modo Conferência (marca Na Oficina de cada OS)
--   a_responder  → Modo Relatório — A Responder (responde as OS pendentes)
--   respondido   → Modo Relatório — Respondido (auditoria concluída)
-- Toda auditoria nova (e as existentes) começa em 'conferencia'.
-- ============================================================

ALTER TABLE aud_auditorias
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'conferencia'
    CHECK (status IN ('conferencia', 'a_responder', 'respondido')),
  ADD COLUMN IF NOT EXISTS status_atualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS status_atualizado_por text,
  -- Último procedimento realizado na auditoria (ex.: Conferido, Respondido, Reaberta)
  ADD COLUMN IF NOT EXISTS ultimo_procedimento text;
