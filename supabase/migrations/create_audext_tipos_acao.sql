-- ============================================================
-- MÓDULO: Gestão de Projetos — Auditoria Externa
-- Cadastro de Tipos de Ação Tomada (usado no Plano de Ação)
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_tipos_acao (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_planos_acao ADD COLUMN IF NOT EXISTS tipo_acao_id uuid REFERENCES audext_tipos_acao(id) ON DELETE SET NULL;

-- ============================================================
-- RLS — leitura/gravação exigem acesso ao módulo (mesma função usada nas
-- outras tabelas); quem pode CRIAR/EDITAR um tipo é controlado na aplicação
-- pela ação 'editar' do menu auditoria-externa/tipos-acao (admin sempre pode,
-- outros grupos só se liberados em Grupos de Acesso).
-- ============================================================
ALTER TABLE audext_tipos_acao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_tipos_acao;
CREATE POLICY "audext_acesso_modulo" ON audext_tipos_acao
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());
