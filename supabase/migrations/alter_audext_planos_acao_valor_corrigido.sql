-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Valor Corrigido em cada Plano de Ação — o % Atingido passa a ser
-- calculado automaticamente (Valor Corrigido ÷ Total Apontado da
-- divergência), não é mais editado manualmente.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS valor_corrigido numeric NOT NULL DEFAULT 0;
