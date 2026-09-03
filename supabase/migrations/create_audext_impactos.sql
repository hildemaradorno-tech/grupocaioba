-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Cadastro de Impactos (usado na Divergência) — mesmo padrão do cadastro de
-- Tipos de Ação.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_impactos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_achados ADD COLUMN IF NOT EXISTS impacto_id uuid REFERENCES audext_impactos(id) ON DELETE SET NULL;

-- ============================================================
-- RLS — mesma função de acesso ao módulo já usada nas outras tabelas; quem
-- pode CRIAR/EDITAR um impacto é controlado na aplicação pela ação 'editar'
-- do menu auditoria-externa/impactos (admin sempre pode, outros grupos só se
-- liberados em Grupos de Acesso).
-- ============================================================
ALTER TABLE audext_impactos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_impactos;
CREATE POLICY "audext_acesso_modulo" ON audext_impactos
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());
