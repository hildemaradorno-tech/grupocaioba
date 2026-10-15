-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Quem fez e quando cada etapa da auditoria, para exibir em sequência:
--   Aberta por X em ... · Conferido por Y em ... · Respondido por Z em ...
-- (Aberta = importado_por / criado_em, já existentes)
-- ============================================================

ALTER TABLE aud_auditorias
  ADD COLUMN IF NOT EXISTS conferido_por  text,
  ADD COLUMN IF NOT EXISTS conferido_em   timestamptz,
  ADD COLUMN IF NOT EXISTS respondido_por text,
  ADD COLUMN IF NOT EXISTS respondido_em  timestamptz;

-- Preenche as auditorias que já passaram por essas etapas
UPDATE aud_auditorias
   SET conferido_por = status_atualizado_por, conferido_em = status_atualizado_em
 WHERE ultimo_procedimento = 'Conferido' AND conferido_em IS NULL;

UPDATE aud_auditorias
   SET respondido_por = status_atualizado_por, respondido_em = status_atualizado_em
 WHERE ultimo_procedimento = 'Respondido' AND respondido_em IS NULL;
