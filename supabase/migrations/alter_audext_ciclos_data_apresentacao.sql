-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Data de Apresentação da Auditoria em Ciclos de Auditoria
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_ciclos ADD COLUMN IF NOT EXISTS data_apresentacao date;
