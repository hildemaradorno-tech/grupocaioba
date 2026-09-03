-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Campo "Evidências" (texto) em Achados/Divergências
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_achados ADD COLUMN IF NOT EXISTS evidencias text;
