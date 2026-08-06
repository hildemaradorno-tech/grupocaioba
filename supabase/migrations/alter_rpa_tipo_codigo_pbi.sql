-- ============================================================
-- MÓDULO: Agendamento de Rotinas RPA / Power BI
-- Ajuste 4: o valor salvo em rpa_rotina_execucoes.tipo para Power BI passa
-- de 'Power BI' para o código 'PBI' — nos seletores da tela aparece o nome
-- completo ("Robert Automation" / "Power BI"), nas telas de visualização
-- aparece só o código ("RPA" / "PBI").
-- Executar no Supabase SQL Editor
-- ============================================================

UPDATE rpa_rotina_execucoes SET tipo = 'PBI' WHERE tipo = 'Power BI';

ALTER TABLE rpa_rotina_execucoes DROP CONSTRAINT IF EXISTS rpa_rotina_processos_tipo_check;
ALTER TABLE rpa_rotina_execucoes
  ADD CONSTRAINT rpa_rotina_execucoes_tipo_check CHECK (tipo IS NULL OR tipo IN ('RPA', 'PBI'));
