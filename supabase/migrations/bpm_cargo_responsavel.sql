-- Liga cada tarefa do BPM a um Cargo (dim_cargos) e cada usuário do sistema ao seu Cargo, pra
-- permitir restringir quem pode "assumir" uma tarefa: só quem está no cargo exigido pela etapa.
-- Tarefas sem cargo definido (responsavel_cargo_id null) continuam livres pra qualquer um assumir,
-- igual ao comportamento anterior.

alter table usuarios
  add column if not exists cargo_id uuid references dim_cargos(id) on delete set null;

alter table bpm_tasks
  add column if not exists responsavel_cargo_id uuid references dim_cargos(id) on delete set null;

create index if not exists idx_usuarios_cargo_id on usuarios(cargo_id);
create index if not exists idx_bpm_tasks_responsavel_cargo_id on bpm_tasks(responsavel_cargo_id);
