-- A restrição de "quem pode assumir" já era comparada por Agrupamento de Cargos (não pelo
-- cargo exato) — só que o Modelador ainda guardava um dim_cargos.id por tarefa, e o motor
-- resolvia o agrupamento dele em tempo de execução. Simplifica: a tarefa passa a guardar
-- direto o agrupamento_cargo_id, igual ao que o usuário tem cadastrado.
-- Mantém responsavel_cargo_id na tabela (não usado mais, mas sem motivo pra apagar dado).

alter table bpm_tasks
  add column if not exists responsavel_agrupamento_cargo_id uuid references dim_agrupamento_cargos(id) on delete set null;

create index if not exists idx_bpm_tasks_responsavel_agrupamento_cargo_id on bpm_tasks(responsavel_agrupamento_cargo_id);
