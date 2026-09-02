-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Percentual atingido (editável) em cada Plano de Ação — o percentual do
-- Ciclo de Auditoria passa a ser calculado automaticamente (média dos
-- percentuais dos planos das suas divergências), não mais editado direto.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS percentual_atingido numeric NOT NULL DEFAULT 0;
