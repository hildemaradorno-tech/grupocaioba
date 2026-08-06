-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Ajuste: horário e tipo (RPA / Power BI) passam a ser definidos por dia
-- da semana (em rpa_rotina_processos), em vez de fixos no cabeçalho da
-- rotina (rpa_rotinas.hr_rpa / hr_powerbi / hr_atualizado).
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_rotina_processos
  ADD COLUMN IF NOT EXISTS hora time,
  ADD COLUMN IF NOT EXISTS tipo  text;

ALTER TABLE rpa_rotina_processos
  DROP CONSTRAINT IF EXISTS rpa_rotina_processos_tipo_check;
ALTER TABLE rpa_rotina_processos
  ADD CONSTRAINT rpa_rotina_processos_tipo_check CHECK (tipo IS NULL OR tipo IN ('RPA', 'Power BI'));

ALTER TABLE rpa_rotinas
  DROP COLUMN IF EXISTS hr_rpa,
  DROP COLUMN IF EXISTS hr_powerbi,
  DROP COLUMN IF EXISTS hr_atualizado;
