-- ============================================================
-- Tempo médio de atualização por processo (em minutos).
-- Usado na aba "Atualização": hora agendada + tempo médio =
-- hora em que o processo/relatório fica pronto.
-- Ex.: PBI agendado 13:00 com tempo médio 30 min → pronto 13:30.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS tempo_atualizacao_min integer NOT NULL DEFAULT 15 CHECK (tempo_atualizacao_min >= 0);
