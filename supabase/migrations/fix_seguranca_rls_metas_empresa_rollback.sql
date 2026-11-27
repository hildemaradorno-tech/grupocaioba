-- Desfaz fix_seguranca_rls_metas_empresa.sql: volta as metas a "qualquer usuário logado lê e grava".
do $$
declare t text;
begin
  foreach t in array array['fato_rascunho_metas_pecas','fato_rascunho_metas_servicos_mecanico',
                           'fato_rascunho_metas_servicos_consultor','fato_metas_publicadas'] loop
    execute format('drop policy if exists metas_por_empresa on public.%I', t);
    execute format('drop policy if exists auth_all on public.%I', t);
    execute format('create policy auth_all on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
