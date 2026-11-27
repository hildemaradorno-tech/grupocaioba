-- "Editar por Mês" separado por aba (27/11/2026): a ação única editar_por_mes vira editar_por_mes_mecanico,
-- editar_por_mes_consultor e editar_por_mes_pecas. Cada grupo recebe só a(s) da(s) aba(s) que já edita:
--   Mecânico / Consultor ← quem tem "Incluir / Editar" em Pós-Vendas (metas/pos-vendas/servicos_pecas)
--   Peças                ← quem tem "Incluir / Editar vendedores" (metas/pos-vendas/pecas)
insert into public.permissoes_grupo_acoes (grupo_id, menu_path, acao)
select distinct a.grupo_id, 'metas/pos-vendas/servicos_pecas', n.acao
from public.permissoes_grupo_acoes a
join (values
  ('metas/pos-vendas/servicos_pecas', 'editar_por_mes_mecanico'),
  ('metas/pos-vendas/servicos_pecas', 'editar_por_mes_consultor'),
  ('metas/pos-vendas/pecas',          'editar_por_mes_pecas')
) as n(menu_origem, acao) on n.menu_origem = a.menu_path and a.acao = 'editar'
where exists (select 1 from public.permissoes_grupo_acoes o
              where o.grupo_id = a.grupo_id and o.menu_path = 'metas/pos-vendas/servicos_pecas' and o.acao = 'editar_por_mes')
  and not exists (select 1 from public.permissoes_grupo_acoes x
                  where x.grupo_id = a.grupo_id and x.menu_path = 'metas/pos-vendas/servicos_pecas' and x.acao = n.acao);

delete from public.permissoes_grupo_acoes
where menu_path = 'metas/pos-vendas/servicos_pecas' and acao = 'editar_por_mes';
