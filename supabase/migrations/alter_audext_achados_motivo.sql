-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Campo "Motivo" em Achados/Divergências
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_achados ADD COLUMN IF NOT EXISTS motivo text;
