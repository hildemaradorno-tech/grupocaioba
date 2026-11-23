-- Indicadores de Produtividade: resumo mensal PRONTO (23/11/2026, achado pelo Monitor Supabase).
-- Antes, vw_pv_prod_mensal somava ~73 mil linhas de pv_prod_os a cada abertura da tela (2,4 s em média no servidor
-- Nano, 2,8 s com o banco "frio"). Agora a soma fica guardada em pv_prod_mensal_resumo (~1.300 linhas) e é refeita só
-- para o mês atualizado, no fim de cada atualização da Produtividade (backend: sincronizarProdutividadeMes).
-- A tela continua lendo vw_pv_prod_mensal, com as mesmas colunas e a mesma permissão (menu Pós-Vendas).

create table if not exists public.pv_prod_mensal_resumo (
  mes           date not null,
  marca         text,
  empresa       text,
  papel         text,
  pessoa        text,
  hr_disp       numeric,
  hr_disp_reais numeric,
  hr_aplic      numeric,
  hr_vend_enc   numeric,
  hr_gasto_enc  numeric,
  hr_vend_fat   numeric,
  hr_gasto_fat  numeric,
  vl_servicos   numeric
);
create index if not exists pv_prod_mensal_resumo_mes_idx on public.pv_prod_mensal_resumo (mes);

-- Mesma regra de leitura de pv_prod_os: só quem tem menu de Pós-Vendas; gravação só pelo backend/função
alter table public.pv_prod_mensal_resumo enable row level security;
drop policy if exists "por_modulo_leitura" on public.pv_prod_mensal_resumo;
create policy "por_modulo_leitura" on public.pv_prod_mensal_resumo for select to authenticated
  using ((select sec_tem_menu_like(variadic array['pos-vendas/'::text])));
grant select on public.pv_prod_mensal_resumo to authenticated;

-- Refaz o resumo de UM mês a partir de pv_prod_os (mesma soma da view antiga)
create or replace function public.pv_prod_mensal_recalcular(p_ano int, p_mes int)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ini date := make_date(p_ano, p_mes, 1);
  v_n integer;
begin
  delete from pv_prod_mensal_resumo where mes = v_ini;
  insert into pv_prod_mensal_resumo
  select date_trunc('month', data::timestamp)::date, marca, empresa, papel, pessoa,
         sum(hr_disp), sum(hr_disp_reais), sum(hr_aplic), sum(hr_vend_enc), sum(hr_gasto_enc),
         sum(hr_vend_fat), sum(hr_gasto_fat), sum(vl_servicos)
    from pv_prod_os
   where data >= v_ini and data < (v_ini + interval '1 month')
   group by 1, marca, empresa, papel, pessoa;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function public.pv_prod_mensal_recalcular(int, int) from public, anon, authenticated;
grant execute on function public.pv_prod_mensal_recalcular(int, int) to service_role;

-- Carga inicial: todos os meses que existem hoje
do $$
declare r record;
begin
  for r in select distinct extract(year from data)::int a, extract(month from data)::int m from pv_prod_os loop
    perform pv_prod_mensal_recalcular(r.a, r.m);
  end loop;
end $$;

-- A view que a tela lê passa a vir do resumo (mesmas colunas, mesma ordem)
create or replace view public.vw_pv_prod_mensal with (security_invoker = true) as
select mes, marca, empresa, papel, pessoa, hr_disp, hr_disp_reais, hr_aplic, hr_vend_enc, hr_gasto_enc,
       hr_vend_fat, hr_gasto_fat, vl_servicos
  from public.pv_prod_mensal_resumo;
grant select on public.vw_pv_prod_mensal to authenticated;

notify pgrst, 'reload schema';
