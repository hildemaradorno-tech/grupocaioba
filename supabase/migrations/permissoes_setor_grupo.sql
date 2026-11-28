-- Acesso por Setor (Configurações → Setor de Serviços): regra geral do sistema, como o Acesso por
-- Departamento. setor_modo: TODOS = sem restrição (inclusive setores futuros); INDIVIDUAL = só os marcados.
ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS setor_modo text NOT NULL DEFAULT 'TODOS';

CREATE TABLE IF NOT EXISTS permissoes_setor_grupo (
  grupo_id  uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  setor_id  uuid NOT NULL REFERENCES dim_setores(id) ON DELETE CASCADE,
  criado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, setor_id)
);
ALTER TABLE permissoes_setor_grupo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sel_auth ON permissoes_setor_grupo;
DROP POLICY IF EXISTS escrita_governanca ON permissoes_setor_grupo;
CREATE POLICY sel_auth ON permissoes_setor_grupo FOR SELECT TO authenticated USING (true);
CREATE POLICY escrita_governanca ON permissoes_setor_grupo FOR ALL TO authenticated
  USING ((SELECT sec_tem_menu(VARIADIC ARRAY['grupos', 'permissoes-matriz'])))
  WITH CHECK ((SELECT sec_tem_menu(VARIADIC ARRAY['grupos', 'permissoes-matriz'])));
