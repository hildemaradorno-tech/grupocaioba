-- ============================================================
-- Documentação do processo/relatório (18/11/2026) — Governança › Controle de Processos
--   atende               : BI/dashboards ou sistemas que o processo atende
--   relatorios_extraidos : relatórios que o processo extrai (ex.: ROF001, RCR038...)
--   local_fonte          : local da fonte de dados (pasta SharePoint, servidor, sistema...)
-- Texto livre, opcionais.
-- ============================================================

ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS atende text,
  ADD COLUMN IF NOT EXISTS relatorios_extraidos text,
  ADD COLUMN IF NOT EXISTS local_fonte text;

-- Objetivo do processo (18/11/2026)
ALTER TABLE rpa_processos
  ADD COLUMN IF NOT EXISTS objetivo text;
