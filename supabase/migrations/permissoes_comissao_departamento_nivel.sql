-- Nível de acesso por Departamento dentro do escopo de Cálculo de Comissões: complementa
-- permissoes_comissao_valor (que já controla QUAIS departamentos o grupo enxerga) com UM
-- controle a mais por departamento — 'editar' (default, comportamento de hoje: os botões de
-- ação continuam valendo o que as Ações do grupo já permitem) ou 'visualizar' (força os
-- botões de ação desligados NESSE departamento, mesmo que a Ação esteja marcada pro grupo).
-- `responsavel` é só uma marcação informativa (mostrada nas telas de Comissões como
-- "Responsável: fulano"), sem efeito nenhum em permissão.
-- Ausência de linha pra um departamento = nivel_acesso 'editar' e responsavel false (não
-- muda nada pra quem já está configurado).
CREATE TABLE IF NOT EXISTS permissoes_comissao_departamento_nivel (
  grupo_id        uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  departamento_id uuid NOT NULL REFERENCES dim_departamentos(id) ON DELETE CASCADE,
  nivel_acesso    text NOT NULL DEFAULT 'editar' CHECK (nivel_acesso IN ('editar','visualizar')),
  responsavel     boolean NOT NULL DEFAULT false,
  PRIMARY KEY (grupo_id, departamento_id)
);
ALTER TABLE permissoes_comissao_departamento_nivel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON permissoes_comissao_departamento_nivel;
CREATE POLICY "auth_all" ON permissoes_comissao_departamento_nivel FOR ALL TO authenticated USING (true) WITH CHECK (true);
