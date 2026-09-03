-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Remove o campo Sócio Responsável de Ciclos de Auditoria (não usado)
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_ciclos DROP COLUMN IF EXISTS socio_responsavel;
