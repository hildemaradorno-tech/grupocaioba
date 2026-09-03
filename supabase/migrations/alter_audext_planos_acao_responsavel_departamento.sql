-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Separa "Responsável / Setor" em dois seletores: Responsável (cadastro
-- proj_responsaveis) e Departamento (cadastro proj_departamentos), ambos já
-- usados em Gestão de Projetos — substitui o campo fixo responsavel_setor.
-- Executar no Supabase SQL Editor
-- ============================================================

ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES proj_responsaveis(id) ON DELETE SET NULL;
ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS departamento_id uuid REFERENCES proj_departamentos(id) ON DELETE SET NULL;

ALTER TABLE audext_planos_acao DROP CONSTRAINT IF EXISTS audext_planos_setor_check;
