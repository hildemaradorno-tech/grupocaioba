-- Separa a restrição por Departamento de Auditoria Externa da de Gestão de Projetos — hoje as
-- duas telas compartilham a mesma tabela (permissoes_depto_grupo), então restringir um grupo
-- em Projetos restringia ele em Auditoria também. Mesmo formato da tabela original.
CREATE TABLE IF NOT EXISTS permissoes_depto_grupo_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  departamento_nome text NOT NULL
);

ALTER TABLE permissoes_depto_grupo_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON permissoes_depto_grupo_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);
