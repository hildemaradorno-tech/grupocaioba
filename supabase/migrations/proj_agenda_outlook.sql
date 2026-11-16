-- Agenda de Projetos → Outlook (assinatura de calendário .ics)
-- 1) Horário opcional nas tarefas: sem horário = dia inteiro no Outlook; com horário = evento com hora.
alter table proj_tarefas add column if not exists hora_inicio time;
alter table proj_tarefas add column if not exists hora_fim    time;

-- 2) Link secreto (token) de cada usuário para assinar a agenda no Outlook.
--    Só o backend (service role) lê/grava: RLS ligada e sem policies.
create table if not exists proj_agenda_tokens (
  usuario_id uuid primary key references usuarios(id) on delete cascade,
  token      text not null unique,
  criado_em  timestamptz not null default now(),
  ultimo_acesso_em timestamptz
);
alter table proj_agenda_tokens enable row level security;
