-- Restrição de acesso aos dados de Cálculo de Comissões por grupo, em 5 dimensões
-- independentes (Empresa, Área, Departamento, Setor, Agrupamento de Cargos). Cada
-- dimensão tem um modo TODOS (sem restrição) ou INDIVIDUAL (só os valores marcados) —
-- separado da restrição de Empresa já existente pra Garantias DAF
-- (permissoes_empresa_grupo) pra não acoplar os dois módulos. `valor` guarda o id (texto)
-- de empresa/departamento/setor/agrupamento_cargo, ou o texto literal da área (única
-- dimensão sem tabela própria — é uma coluna livre em dim_departamentos.area).
-- Grupo sem nenhuma linha em permissoes_comissao_modo pra uma dimensão = TODOS (sem
-- restrição) por padrão, pra não travar grupos que ainda não foram configurados.
CREATE TABLE IF NOT EXISTS permissoes_comissao_modo (
  grupo_id  uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  dimensao  text NOT NULL CHECK (dimensao IN ('empresa','area','departamento','setor','agrupamento_cargo')),
  modo      text NOT NULL DEFAULT 'TODOS' CHECK (modo IN ('TODOS','INDIVIDUAL')),
  PRIMARY KEY (grupo_id, dimensao)
);

CREATE TABLE IF NOT EXISTS permissoes_comissao_valor (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id  uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  dimensao  text NOT NULL CHECK (dimensao IN ('empresa','area','departamento','setor','agrupamento_cargo')),
  valor     text NOT NULL,
  UNIQUE (grupo_id, dimensao, valor)
);
CREATE INDEX IF NOT EXISTS idx_perm_comissao_valor_grupo ON permissoes_comissao_valor(grupo_id, dimensao);

ALTER TABLE permissoes_comissao_modo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON permissoes_comissao_modo;
CREATE POLICY "auth_all" ON permissoes_comissao_modo FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE permissoes_comissao_valor ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON permissoes_comissao_valor;
CREATE POLICY "auth_all" ON permissoes_comissao_valor FOR ALL TO authenticated USING (true) WITH CHECK (true);
