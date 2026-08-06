-- ============================================================
-- MÓDULO: Grade de Treinamentos — Cadastro de Cargos próprio
-- Substitui o uso de dim_cargos (corporativo) na Grade de
-- Treinamentos por um cadastro de cargos exclusivo do módulo,
-- com um campo fixo "Setor" (Peças/Serviços/Administrativo/Loja).
-- Também remove a dependência de Agrupamento de Empresa: a
-- segmentação passa a ser por Cargo + Setor.
-- Executar no Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS trein_cargos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  setor      text NOT NULL CHECK (setor IN ('Peças','Serviços','Administrativo','Loja')),
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Começar do zero: os vínculos hoje existentes em trein_curso_cargos
-- apontam para dim_cargos (cadastro corporativo, abandonado pelo
-- módulo); precisam ser apagados antes de trocar a FK de destino.
DELETE FROM trein_curso_cargos;

ALTER TABLE trein_curso_cargos DROP CONSTRAINT IF EXISTS trein_curso_cargos_cargo_id_fkey;
ALTER TABLE trein_curso_cargos
  ADD CONSTRAINT trein_curso_cargos_cargo_id_fkey
  FOREIGN KEY (cargo_id) REFERENCES trein_cargos(id) ON DELETE CASCADE;

-- trein_curso_agrupamentos (Agrupamento de Empresa) não é dropada —
-- o módulo só para de ler/escrever nela.

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE trein_cargos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON trein_cargos;

CREATE POLICY "auth_all" ON trein_cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);
