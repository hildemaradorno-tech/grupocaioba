-- Remoção da Agenda de Projetos (16/11/2026): Outlook (.ics), Google Agenda e horário das tarefas.
-- ⚠ RODAR SÓ DEPOIS de publicar frontend + backend sem essas funcionalidades.
--   O frontend publicado antes disso envia hora_inicio/hora_fim ao salvar tarefa:
--   apagar as colunas antes da publicação faz o salvamento de tarefas falhar em produção.
-- Situação em 16/11/2026: 0 tarefas com horário, 0 contas Google conectadas, 1 link de Outlook (teste).

-- permissões órfãs da aba Agenda (menu projetos/calendario excluído)
delete from permissoes_grupo_acoes where menu_path = 'projetos/calendario';
delete from permissoes_grupo       where menu_path = 'projetos/calendario';

drop table if exists proj_agenda_tokens;
drop table if exists user_google_tokens;
alter table proj_tarefas drop column if exists hora_inicio;
alter table proj_tarefas drop column if exists hora_fim;
