-- Custos de Projetos: status e data da entrega do custo, para acompanhamento (25/11/2026).
-- status: em_andamento | concluido. Lançamentos existentes ficam "em_andamento".
-- data_entrega: opcional (data prevista/realizada da entrega do que foi contratado).
ALTER TABLE proj_custos_lancamentos
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'em_andamento';
ALTER TABLE proj_custos_lancamentos
  ADD COLUMN IF NOT EXISTS data_entrega date;
-- tarefa_id: tarefa do projeto vinculada ao custo (opcional). Ao salvar o custo como Concluído com
-- Data da Entrega, a tela conclui a tarefa (status concluído, 100%, término = data da entrega).
ALTER TABLE proj_custos_lancamentos
  ADD COLUMN IF NOT EXISTS tarefa_id uuid REFERENCES proj_tarefas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proj_custos_lancamentos_tarefa_idx ON proj_custos_lancamentos (tarefa_id);
-- horas: usado nas categorias por hora (ex.: RPA). Custo por hora = valor / horas (calculado na tela).
ALTER TABLE proj_custos_lancamentos
  ADD COLUMN IF NOT EXISTS horas numeric(10,2) CHECK (horas IS NULL OR horas >= 0);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proj_custos_lancamentos_status_chk') THEN
    ALTER TABLE proj_custos_lancamentos
      ADD CONSTRAINT proj_custos_lancamentos_status_chk CHECK (status IN ('em_andamento', 'concluido'));
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
