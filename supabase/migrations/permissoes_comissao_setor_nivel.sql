-- Move nível de acesso e responsável de Departamento para Setor em Comissões.
CREATE TABLE IF NOT EXISTS permissoes_comissao_setor_nivel (
  grupo_id     uuid NOT NULL REFERENCES grupos_acesso(id) ON DELETE CASCADE,
  setor_id     uuid NOT NULL REFERENCES dim_setores(id) ON DELETE CASCADE,
  nivel_acesso text NOT NULL DEFAULT 'editar' CHECK (nivel_acesso IN ('editar', 'visualizar')),
  responsavel  boolean NOT NULL DEFAULT false,
  PRIMARY KEY (grupo_id, setor_id)
);

ALTER TABLE permissoes_comissao_setor_nivel ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON permissoes_comissao_setor_nivel;
CREATE POLICY "auth_all" ON permissoes_comissao_setor_nivel
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Preserva as configurações atuais, aplicando-as a cada setor do Departamento.
INSERT INTO permissoes_comissao_setor_nivel (grupo_id, setor_id, nivel_acesso, responsavel)
SELECT p.grupo_id, s.id, p.nivel_acesso, p.responsavel
FROM permissoes_comissao_departamento_nivel p
JOIN dim_setores s ON s.departamento_id = p.departamento_id
ON CONFLICT (grupo_id, setor_id) DO NOTHING;