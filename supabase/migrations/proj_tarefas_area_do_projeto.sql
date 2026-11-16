-- Área da tarefa = Área do projeto (sempre). Departamento já vinha do projeto.
-- Pedido do usuário em 16/11/2026: tarefas com área diferente do projeto são trocadas.

-- 1) Backup das áreas antigas (59 tarefas na data da migração) — para consulta/reversão
create table if not exists proj_tarefas_area_backup_20261116 as
select t.id as tarefa_id, t.projeto_id, t.area_nome as area_antiga, p.area_nome as area_nova, now() as em
from proj_tarefas t join proj_projetos p on p.id = t.projeto_id
where t.area_nome is distinct from p.area_nome;
alter table proj_tarefas_area_backup_20261116 enable row level security;

-- 2) Corrige as existentes
update proj_tarefas t set area_nome = p.area_nome
from proj_projetos p
where p.id = t.projeto_id and t.area_nome is distinct from p.area_nome;

-- 3) Toda tarefa gravada (criar, editar, copiar, mover, importar) recebe a área do projeto
create or replace function proj_tarefa_area_do_projeto() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select p.area_nome into new.area_nome from proj_projetos p where p.id = new.projeto_id;
  return new;
end $$;

drop trigger if exists trg_proj_tarefa_area_do_projeto on proj_tarefas;
create trigger trg_proj_tarefa_area_do_projeto
  before insert or update of area_nome, projeto_id on proj_tarefas
  for each row execute function proj_tarefa_area_do_projeto();

-- 4) Mudou a área do projeto → atualiza as tarefas dele
create or replace function proj_projeto_area_para_tarefas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update proj_tarefas set area_nome = new.area_nome
  where projeto_id = new.id and area_nome is distinct from new.area_nome;
  return new;
end $$;

drop trigger if exists trg_proj_projeto_area_para_tarefas on proj_projetos;
create trigger trg_proj_projeto_area_para_tarefas
  after update of area_nome on proj_projetos
  for each row when (old.area_nome is distinct from new.area_nome)
  execute function proj_projeto_area_para_tarefas();
