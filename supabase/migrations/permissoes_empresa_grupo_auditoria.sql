-- A restrição de Empresa já usada em Garantias DAF/Projetos/Comissões (permissoes_empresa_grupo)
-- guarda dim_empresas.id — mas o Ciclo de Auditoria Externa referencia proj_empresas.id, uma
-- tabela diferente com ids que não se cruzam. Reaproveitar o mecanismo genérico escondia TODAS
-- as divergências de qualquer grupo que já tivesse uma restrição de Empresa configurada (pra
-- outro módulo), mesmo sem nenhuma relação com Auditoria Externa. Criando escopo próprio, no
-- mesmo padrão de permissoes_depto_grupo_auditoria.
CREATE TABLE IF NOT EXISTS permissoes_empresa_grupo_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES proj_empresas(id) ON DELETE CASCADE
);

ALTER TABLE permissoes_empresa_grupo_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY auth_all ON permissoes_empresa_grupo_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE grupos_acesso ADD COLUMN IF NOT EXISTS auditoria_empresa_modo text NOT NULL DEFAULT 'TODOS' CHECK (auditoria_empresa_modo IN ('TODOS','INDIVIDUAL'));
