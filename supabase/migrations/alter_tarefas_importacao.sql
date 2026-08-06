-- Adiciona campos extras em proj_tarefas para suportar importação Excel
ALTER TABLE proj_tarefas ADD COLUMN IF NOT EXISTS area_nome  text;
ALTER TABLE proj_tarefas ADD COLUMN IF NOT EXISTS tipo_item  text;
ALTER TABLE proj_tarefas ADD COLUMN IF NOT EXISTS caminho    text;
