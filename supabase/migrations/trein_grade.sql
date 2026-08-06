-- ============================================================
-- MÓDULO: Grade de Treinamentos (Documentações)
-- Cadastro de cursos por categoria, com cargos obrigatórios e
-- agrupamentos de empresa que devem realizar. Cargos, funcionários
-- e agrupamentos vêm dos cadastros corporativos (dim_*).
-- Executar no Supabase SQL Editor
-- ============================================================

-- Categorias de treinamento (cadastro de apoio do módulo)
CREATE TABLE IF NOT EXISTS trein_categorias (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Sistemas (ex.: Bizneo, SAP, Portal de Gestão...) — cadastro de apoio
-- do módulo, mesmo padrão de trein_categorias
CREATE TABLE IF NOT EXISTS trein_sistemas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text NOT NULL UNIQUE,
  ativo      boolean NOT NULL DEFAULT true,
  criado_em  timestamptz NOT NULL DEFAULT now()
);

-- Cursos/treinamentos
CREATE TABLE IF NOT EXISTS trein_cursos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL UNIQUE,
  categoria_id   uuid REFERENCES trein_categorias(id) ON DELETE SET NULL,
  categoria_nome text,
  sistema_id     uuid REFERENCES trein_sistemas(id) ON DELETE SET NULL,
  sistema_nome   text,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- Cargos de cada curso (N:N com dim_cargos); obrigatorio=true → curso
-- obrigatório para o cargo, false → apenas sugerido
CREATE TABLE IF NOT EXISTS trein_curso_cargos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id    uuid NOT NULL REFERENCES trein_cursos(id) ON DELETE CASCADE,
  cargo_id    uuid NOT NULL REFERENCES dim_cargos(id) ON DELETE CASCADE,
  cargo_nome  text,
  obrigatorio boolean NOT NULL DEFAULT true,
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_id, cargo_id)
);

CREATE INDEX IF NOT EXISTS trein_curso_cargos_curso_idx ON trein_curso_cargos (curso_id);
CREATE INDEX IF NOT EXISTS trein_curso_cargos_cargo_idx ON trein_curso_cargos (cargo_id);

-- Agrupamentos de empresa que devem realizar cada curso (N:N).
-- Curso sem nenhuma linha aqui = vale para todos os agrupamentos.
CREATE TABLE IF NOT EXISTS trein_curso_agrupamentos (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id               uuid NOT NULL REFERENCES trein_cursos(id) ON DELETE CASCADE,
  agrupamento_empresa_id uuid NOT NULL REFERENCES dim_agrupamento_empresas(id) ON DELETE CASCADE,
  agrupamento_nome       text,
  criado_em              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curso_id, agrupamento_empresa_id)
);

CREATE INDEX IF NOT EXISTS trein_curso_agrup_curso_idx ON trein_curso_agrupamentos (curso_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE trein_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE trein_sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE trein_cursos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trein_curso_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trein_curso_agrupamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON trein_categorias;
DROP POLICY IF EXISTS "auth_all" ON trein_sistemas;
DROP POLICY IF EXISTS "auth_all" ON trein_cursos;
DROP POLICY IF EXISTS "auth_all" ON trein_curso_cargos;
DROP POLICY IF EXISTS "auth_all" ON trein_curso_agrupamentos;

CREATE POLICY "auth_all" ON trein_categorias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON trein_sistemas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON trein_cursos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON trein_curso_cargos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON trein_curso_agrupamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
