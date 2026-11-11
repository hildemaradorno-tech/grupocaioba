-- Auditoria O.S. Aberta (BI): qual visão abre primeiro para cada grupo — 'dashboard' ou 'controle'.
-- Mesmo modelo de grupos_acesso.garantias_daf_default_view. Sem permissão para a escolhida, abre na outra.
alter table public.grupos_acesso
  add column if not exists auditoria_os_default_view text not null default 'dashboard'
  check (auditoria_os_default_view in ('dashboard', 'controle'));

notify pgrst, 'reload schema';
