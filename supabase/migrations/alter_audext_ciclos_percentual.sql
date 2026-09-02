-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Percentual atingido (editável manualmente) em Ciclos de Auditoria
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_ciclos ADD COLUMN IF NOT EXISTS percentual_atingido numeric NOT NULL DEFAULT 0;
