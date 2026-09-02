-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Evidências (imagens) coladas/anexadas direto no Achado (Divergência)
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_achados ADD COLUMN IF NOT EXISTS evidencias_imagens_urls text[] NOT NULL DEFAULT '{}';
