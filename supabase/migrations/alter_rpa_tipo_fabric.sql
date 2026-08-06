-- ============================================================
-- Novo tipo 'FAB' (Microsoft Fabric) no cadastro de processos
-- e nas execuções agendadas. Comporta-se como o Power BI:
-- horário configurado em Brasília, pode ter RPA vinculado.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE rpa_processos DROP CONSTRAINT IF EXISTS rpa_processos_tipo_check;
ALTER TABLE rpa_processos
  ADD CONSTRAINT rpa_processos_tipo_check CHECK (tipo IN ('RPA', 'PBI', 'FAB'));

-- O CHECK das execuções pode ter o nome antigo (rpa_rotina_processos_tipo_check,
-- herdado de antes do rename da tabela) ou o novo — dropa os dois por garantia.
ALTER TABLE rpa_rotina_execucoes DROP CONSTRAINT IF EXISTS rpa_rotina_execucoes_tipo_check;
ALTER TABLE rpa_rotina_execucoes DROP CONSTRAINT IF EXISTS rpa_rotina_processos_tipo_check;
ALTER TABLE rpa_rotina_execucoes
  ADD CONSTRAINT rpa_rotina_execucoes_tipo_check CHECK (tipo IS NULL OR tipo IN ('RPA', 'PBI', 'FAB'));
