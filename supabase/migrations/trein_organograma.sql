-- ============================================================
-- MÓDULO: Grade de Treinamentos — Organograma de Treinamentos
-- Cadastro de cargos em árvore, importado do relatório de
-- organograma do Bizneo (chart-report.xlsx). Substitui dim_cargos
-- como fonte de cargos da Grade de Treinamentos (3ª troca de fonte
-- nesta mesma sessão — ver memória do módulo).
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS trein_organograma (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bizneo_org_id   bigint NOT NULL UNIQUE,
  nome            text NOT NULL,
  pai_id          uuid REFERENCES trein_organograma(id) ON DELETE SET NULL,
  supervisor_nome text,
  headcount       integer NOT NULL DEFAULT 0,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trein_organograma_pai_idx ON trein_organograma (pai_id);

-- Começar do zero de novo: os vínculos hoje em trein_curso_cargos
-- apontam para dim_cargos (fonte anterior, abandonada pela Grade de
-- Treinamentos), precisam ser apagados antes de trocar a FK de destino.
DELETE FROM trein_curso_cargos;

ALTER TABLE trein_curso_cargos DROP CONSTRAINT IF EXISTS trein_curso_cargos_cargo_id_fkey;
ALTER TABLE trein_curso_cargos
  ADD CONSTRAINT trein_curso_cargos_cargo_id_fkey
  FOREIGN KEY (cargo_id) REFERENCES trein_organograma(id) ON DELETE CASCADE;

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE trein_organograma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON trein_organograma;

CREATE POLICY "auth_all" ON trein_organograma FOR ALL TO authenticated USING (true) WITH CHECK (true);
