-- ============================================================
-- MÓDULO: Configurações > Cadastro de Tabelas > Auditoria Externa
-- Cadastro de Tipos de Divergência (usado em Nova/Editar Divergência)
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS audext_tipos_divergencia (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL UNIQUE,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audext_achados ADD COLUMN IF NOT EXISTS tipo_divergencia_id uuid REFERENCES audext_tipos_divergencia(id) ON DELETE SET NULL;

-- ============================================================
-- RLS — mesmo padrão de audext_tipos_acao: leitura/gravação exigem acesso ao
-- módulo (audext_tem_acesso()); quem pode CRIAR/EDITAR um tipo é controlado na
-- aplicação pela ação 'editar' do menu auditoria-externa/tipos-divergencia.
-- ============================================================
ALTER TABLE audext_tipos_divergencia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audext_acesso_modulo" ON audext_tipos_divergencia;
CREATE POLICY "audext_acesso_modulo" ON audext_tipos_divergencia
  FOR ALL TO authenticated USING (audext_tem_acesso()) WITH CHECK (audext_tem_acesso());
