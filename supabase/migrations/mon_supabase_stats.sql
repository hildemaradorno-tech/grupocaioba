-- Governança › Monitor Supabase (19/11/2026)
-- Estatísticas do banco para o monitor: tamanho, maiores tabelas, conexões, Storage por bucket,
-- usuários de login, aproveitamento de cache e consultas mais lentas (pg_stat_statements).
-- Só LEITURA. Liberada apenas para o service_role (backend) — anon/authenticated não executam.

create or replace function public.mon_supabase_stats()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
stable
as $$
  select jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    -- "Database size" do painel do Supabase = soma de todos os bancos do servidor (conferido em 19/11/2026)
    'db_bytes_total', (select sum(pg_database_size(datname))::bigint from pg_database),
    'versao', current_setting('server_version'),
    'max_conexoes', current_setting('max_connections')::int,
    'conexoes', (
      select jsonb_build_object(
        'total', count(*),
        'ativas', count(*) filter (where state = 'active'),
        'ociosas', count(*) filter (where state = 'idle'),
        'ociosas_em_transacao', count(*) filter (where state like 'idle in transaction%')
      ) from pg_stat_activity where backend_type = 'client backend'
    ),
    'conexoes_todas', (select count(*) from pg_stat_activity),
    'tabelas', (
      select coalesce(jsonb_agg(t order by t.bytes desc), '[]'::jsonb) from (
        select n.nspname as schema, c.relname as tabela,
               pg_total_relation_size(c.oid) as bytes,
               pg_relation_size(c.oid) as bytes_dados,
               greatest(coalesce(s.n_live_tup, 0), 0) as linhas,
               coalesce(s.n_dead_tup, 0) as linhas_mortas
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_stat_user_tables s on s.relid = c.oid
        where c.relkind in ('r', 'p', 'm')
          and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
        order by pg_total_relation_size(c.oid) desc
        limit 20
      ) t
    ),
    'qtd_tabelas_public', (
      select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r', 'p') and n.nspname = 'public'
    ),
    'storage', (
      select coalesce(jsonb_agg(b order by b.bytes desc), '[]'::jsonb) from (
        select bk.id as bucket, bk.public as publico,
               count(o.id) as arquivos,
               coalesce(sum((o.metadata->>'size')::bigint), 0) as bytes
        from storage.buckets bk
        left join storage.objects o on o.bucket_id = bk.id
        group by bk.id, bk.public
      ) b
    ),
    'usuarios_auth', (select count(*) from auth.users),
    'usuarios_auth_mes', (select count(*) from auth.users where last_sign_in_at >= date_trunc('month', now())),
    'usuarios_auth_30d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
    'cache_hit', (
      select case when sum(heap_blks_hit) + sum(heap_blks_read) = 0 then null
                  else round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2) end
      from pg_statio_user_tables
    ),
    'consultas_lentas', (
      select coalesce(jsonb_agg(q order by q.media_ms desc), '[]'::jsonb) from (
        select left(regexp_replace(s.query, '\s+', ' ', 'g'), 220) as consulta,
               -- objetos (tabelas/views/funções do schema public) citados no texto INTEIRO da consulta (21/11/2026):
               -- nas chamadas de função pela API o nome vem depois dos 220 primeiros caracteres
               (select coalesce(jsonb_agg(distinct m[1]), '[]'::jsonb)
                  from regexp_matches(s.query, '"?public"?\."?([a-z0-9_]+)"?', 'g') m) as objetos,
               s.calls as chamadas,
               round(s.mean_exec_time::numeric, 1) as media_ms,
               round(s.total_exec_time::numeric / 1000, 1) as total_s,
               r.rolname as papel
        from extensions.pg_stat_statements s
        join pg_roles r on r.oid = s.userid
        where s.calls >= 5
          and r.rolname not like 'supabase%'
          -- authenticator = consultas internas da API do Supabase (ex.: SELECT name FROM pg_timezone_names a cada
          -- recarga do cache da API); não vêm das telas e não dá para otimizar do nosso lado
          and r.rolname <> 'authenticator'
          -- comandos de manutenção (criar índice, alterar tabela, testes com EXPLAIN...) não são consultas das telas
          and s.query !~* '^\s*(create|alter|drop|explain|begin|commit|rollback|analyze|vacuum|grant|revoke|comment|do|set|reset|truncate|refresh)\M'
          and s.query not ilike '%pg_stat_statements%'
        order by s.mean_exec_time desc
        limit 15
      ) q
    ),
    'lido_em', now()
  );
$$;

revoke all on function public.mon_supabase_stats() from public, anon, authenticated;
grant execute on function public.mon_supabase_stats() to service_role;
