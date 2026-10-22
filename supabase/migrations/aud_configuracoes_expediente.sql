-- ============================================================
-- MÓDULO: Auditoria O.S. Aberta
-- Regra de reabertura passa a ser em HORAS DE EXPEDIENTE:
--   prazo máximo = agora + reabertura_horas, contando só entre expediente_inicio e expediente_fim
--   (e só em dias úteis se reabertura_pular_fds). reabertura_dias/reabertura_hora ficam sem uso.
-- ============================================================

ALTER TABLE aud_configuracoes
  ADD COLUMN IF NOT EXISTS reabertura_horas  int  NOT NULL DEFAULT 8 CHECK (reabertura_horas BETWEEN 1 AND 200),
  ADD COLUMN IF NOT EXISTS expediente_inicio time NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS expediente_fim    time NOT NULL DEFAULT '18:00';

NOTIFY pgrst, 'reload schema';
