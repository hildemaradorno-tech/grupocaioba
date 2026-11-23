-- pv_prod_os mais enxuta (23/11/2026, achado pelo Monitor Supabase): a chave primária juntava 7 colunas de texto
-- (data, empresa, papel, pessoa, os, tipo_os, tmo) e ocupava 48 MB — mais que os próprios dados (45 MB).
-- Ela só servia para impedir linha duplicada (a atualização apaga o mês inteiro e regrava; nada faz upsert nem aponta
-- para ela). Troca por um índice único sobre um resumo (md5 → uuid, 16 bytes) das mesmas 7 colunas: mesma garantia.

-- Função imutável (exigida para índice): data vira nº de dias desde 2000-01-01 (sem depender de formato de data)
create or replace function public.pv_prod_os_chave(d date, e text, pa text, pe text, o text, t text, tm text)
returns uuid
language sql
immutable
parallel safe
as $$ select md5((d - date '2000-01-01')::text || '|' || e || '|' || pa || '|' || pe || '|' || o || '|' || t || '|' || tm)::uuid $$;

alter table public.pv_prod_os drop constraint if exists pv_prod_os_pkey;
create unique index if not exists pv_prod_os_chave_uidx
  on public.pv_prod_os (public.pv_prod_os_chave(data, empresa, papel, pessoa, os, tipo_os, tmo));
