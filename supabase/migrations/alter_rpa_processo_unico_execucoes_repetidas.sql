-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Ajuste 2:
--  - "Processo/Relatório" passa a ser preenchido uma única vez no cabeçalho
--    da rotina (rpa_rotinas.processo), valendo para todos os dias/horários.
--  - Cada dia da semana passa a aceitar mais de uma execução (ex.: RPA às
--    08:00 e Power BI às 14:00 no mesmo dia) — por isso a tabela de dias é
--    renomeada de rpa_rotina_processos para rpa_rotina_execucoes, perde a
--    coluna "processo" (subiu para o cabeçalho) e a restrição de 1 linha
--    por dia.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_rotinas ADD COLUMN IF NOT EXISTS processo text;

ALTER TABLE rpa_rotina_processos RENAME TO rpa_rotina_execucoes;

ALTER TABLE rpa_rotina_execucoes
  DROP CONSTRAINT IF EXISTS rpa_rotina_processos_rotina_id_dia_semana_key;

ALTER TABLE rpa_rotina_execucoes DROP COLUMN IF EXISTS processo;
ALTER TABLE rpa_rotina_execucoes DROP COLUMN IF EXISTS ativo;
