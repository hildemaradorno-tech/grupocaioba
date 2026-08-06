CREATE TABLE IF NOT EXISTS proj_departamentos (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  ativo     boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO proj_departamentos (nome)
VALUES 
  ('Contabilidade'), ('Controladoria'), ('Financeiro'), ('Holding'), 
  ('Peças'), ('Pós-Vendas'), ('RH'), ('Serviços'), ('Tecnologia'), ('Vendas')
ON CONFLICT DO NOTHING;

ALTER TABLE proj_projetos DROP CONSTRAINT IF EXISTS proj_projetos_departamento_id_fkey;

ALTER TABLE proj_projetos 
ADD CONSTRAINT proj_projetos_departamento_id_fkey 
FOREIGN KEY (departamento_id) REFERENCES proj_departamentos(id) ON DELETE SET NULL;

ALTER TABLE proj_departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all" ON proj_departamentos;
CREATE POLICY "auth_all" ON proj_departamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
