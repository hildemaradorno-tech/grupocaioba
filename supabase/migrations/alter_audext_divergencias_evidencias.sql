-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Evidências (imagens) coladas/anexadas em cada item de Divergência
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_divergencias ADD COLUMN IF NOT EXISTS evidencias_urls text[] NOT NULL DEFAULT '{}';
