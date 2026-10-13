-- Peso e Meta Manual do Bloco 3 - Serviços/Peças passam a ter permissão própria (Editar) em
-- permissoes_grupo_acoes. Para não tirar acesso de ninguém, cada grupo que já tem a tela recebe
-- a ação; depois é só desmarcar onde quiser em Grupos de Acessos.
INSERT INTO permissoes_grupo_acoes (grupo_id, menu_path, acao)
SELECT pg.grupo_id, pg.menu_path, 'editar'
FROM permissoes_grupo pg
WHERE pg.menu_path IN ('kpi/bloco3-servicos', 'kpi/bloco3-pecas')
ON CONFLICT (grupo_id, menu_path, acao) DO NOTHING;
