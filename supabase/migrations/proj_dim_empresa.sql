-- Unifica Projetos com dim_empresas (Configurações → Empresas)
-- proj_projetos: adiciona empresa_id (FK dim_empresas) + empresa_nome (denormalizado)
ALTER TABLE proj_projetos
  ADD COLUMN IF NOT EXISTS empresa_id   uuid REFERENCES dim_empresas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS empresa_nome text;

-- proj_tarefas: remove FK para proj_empresas, adiciona FK para dim_empresas
-- (empresa_id nunca foi salvo pelo frontend — todos os valores são NULL, sem perda de dados)
ALTER TABLE proj_tarefas DROP CONSTRAINT IF EXISTS proj_tarefas_empresa_id_fkey;
ALTER TABLE proj_tarefas
  ADD CONSTRAINT proj_tarefas_empresa_id_fkey
  FOREIGN KEY (empresa_id) REFERENCES dim_empresas(id) ON DELETE SET NULL;

-- Limpa quaisquer valores órfãos de empresa_id em proj_tarefas (ref proj_empresas que já não é mais válida)
UPDATE proj_tarefas SET empresa_id = NULL WHERE empresa_id IS NOT NULL
  AND empresa_id NOT IN (SELECT id FROM dim_empresas);
