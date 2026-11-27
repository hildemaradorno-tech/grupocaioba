-- Planejamento de Metas: escopo por EMPRESA também no banco (27/11/2026). Antes, qualquer usuário logado lia e
-- gravava metas de todas as empresas pela API (políticas abertas). Agora cada usuário só enxerga/grava linhas das
-- empresas marcadas no "Acesso por Empresa" do seu grupo (permissoes_empresa_grupo); administrador vê tudo.
-- Não afeta: backend (usa service role: KPIs, Produtividade, Power BI via /api/powerbi) e as funções de aprovação
-- approve_metas_* (SECURITY DEFINER). Desfazer: fix_seguranca_rls_metas_empresa_rollback.sql
-- sec_* embrulhados em (SELECT ...) = avaliados uma vez por consulta (ver fix_seguranca_rls_performance.sql).

do $$
declare
  t text;
  p record;
begin
  foreach t in array array['fato_rascunho_metas_pecas','fato_rascunho_metas_servicos_mecanico',
                           'fato_rascunho_metas_servicos_consultor','fato_metas_publicadas'] loop
    execute format('alter table public.%I enable row level security', t);
    -- remove as políticas abertas (auth_all, "Leitura autenticados", "autenticado"...)
    for p in select polname from pg_policy where polrelid = format('public.%I', t)::regclass loop
      execute format('drop policy %I on public.%I', p.polname, t);
    end loop;
    execute format($f$
      create policy metas_por_empresa on public.%I
        for all to authenticated
        using ((select public.sec_is_admin())
               or empresa_id in (select pe.empresa_id from public.permissoes_empresa_grupo pe
                                 where pe.grupo_id = (select public.sec_grupo_id())))
        with check ((select public.sec_is_admin())
               or empresa_id in (select pe.empresa_id from public.permissoes_empresa_grupo pe
                                 where pe.grupo_id = (select public.sec_grupo_id())))
    $f$, t);
  end loop;
end $$;
