-- Ações de Metas › Peças passam a ser da Aba Peças (metas/pos-vendas/servicos_pecas/aba-pecas).
-- Quem tinha a permissão antiga continua com o mesmo acesso.
INSERT INTO permissoes_grupo (grupo_id, menu_path)
SELECT DISTINCT p.grupo_id, 'metas/pos-vendas/servicos_pecas/aba-pecas'
FROM permissoes_grupo p
WHERE p.menu_path = 'metas/pos-vendas/pecas'
  AND NOT EXISTS (SELECT 1 FROM permissoes_grupo x WHERE x.grupo_id = p.grupo_id AND x.menu_path = 'metas/pos-vendas/servicos_pecas/aba-pecas');

INSERT INTO permissoes_grupo_acoes (grupo_id, menu_path, acao)
SELECT DISTINCT a.grupo_id, 'metas/pos-vendas/servicos_pecas/aba-pecas', a.acao
FROM permissoes_grupo_acoes a
WHERE a.menu_path = 'metas/pos-vendas/pecas'
  AND NOT EXISTS (SELECT 1 FROM permissoes_grupo_acoes x WHERE x.grupo_id = a.grupo_id AND x.menu_path = 'metas/pos-vendas/servicos_pecas/aba-pecas' AND x.acao = a.acao);

SELECT (SELECT count(*) FROM permissoes_grupo WHERE menu_path = 'metas/pos-vendas/servicos_pecas/aba-pecas') AS grupos_aba,
       (SELECT count(*) FROM permissoes_grupo_acoes WHERE menu_path = 'metas/pos-vendas/servicos_pecas/aba-pecas') AS acoes_aba;
