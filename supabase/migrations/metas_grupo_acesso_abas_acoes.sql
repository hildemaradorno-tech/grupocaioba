-- Planejamento de Metas no Grupo de Acessos (27/11/2026): cada aba virou permissão própria e os botões viraram
-- ações. Este script só COPIA o acesso de quem já tinha o equivalente antes — ninguém perde o que já via/fazia.
-- Idempotente (não duplica se rodar de novo).

-- 1) Abas: quem tem a tela recebe todas as abas dela.
insert into public.permissoes_grupo (grupo_id, menu_path)
select distinct p.grupo_id, a.aba
from public.permissoes_grupo p
join (values
  ('metas/pos-vendas/servicos_pecas', 'metas/pos-vendas/servicos_pecas/aba-mecanico'),
  ('metas/pos-vendas/servicos_pecas', 'metas/pos-vendas/servicos_pecas/aba-consultor'),
  ('metas/pos-vendas/servicos_pecas', 'metas/pos-vendas/servicos_pecas/aba-pecas'),
  ('metas/pos-vendas/servicos_pecas', 'metas/pos-vendas/servicos_pecas/aba-total'),
  ('metas/pos-vendas/servicos_pecas', 'metas/pos-vendas/servicos_pecas/aba-grupo'),
  ('metas/gestao-aprovacao',          'metas/gestao-aprovacao/aba-posvendas'),
  ('metas/gestao-aprovacao',          'metas/gestao-aprovacao/aba-vendas'),
  ('metas/gestao-aprovacao',          'metas/gestao-aprovacao/aba-geral'),
  ('metas/vendas',                    'metas/vendas/aba-novos'),
  ('metas/vendas',                    'metas/vendas/aba-seminovos'),
  ('metas/vendas',                    'metas/vendas/aba-total')
) as a(tela, aba) on a.tela = p.menu_path
where not exists (select 1 from public.permissoes_grupo x where x.grupo_id = p.grupo_id and x.menu_path = a.aba);

-- 2) Ações novas, para quem já podia usar o botão antes:
--    Editar por Mês      ← quem edita Mecânico/Consultor ou Peças
--    Atualizar Dias Úteis ← quem edita Peças
--    Excluir vendedor    ← quem edita Peças (o botão Excluir de Peças dependia de "editar")
insert into public.permissoes_grupo_acoes (grupo_id, menu_path, acao)
select distinct a.grupo_id, n.menu_path, n.acao
from public.permissoes_grupo_acoes a
join (values
  ('metas/pos-vendas/servicos_pecas', 'editar', 'metas/pos-vendas/servicos_pecas', 'editar_por_mes'),
  ('metas/pos-vendas/pecas',          'editar', 'metas/pos-vendas/servicos_pecas', 'editar_por_mes'),
  ('metas/pos-vendas/pecas',          'editar', 'metas/pos-vendas/servicos_pecas', 'atualizar_dias_uteis'),
  ('metas/pos-vendas/pecas',          'editar', 'metas/pos-vendas/pecas',          'excluir')
) as n(menu_origem, acao_origem, menu_path, acao) on n.menu_origem = a.menu_path and n.acao_origem = a.acao
where not exists (
  select 1 from public.permissoes_grupo_acoes x
  where x.grupo_id = a.grupo_id and x.menu_path = n.menu_path and x.acao = n.acao
);
