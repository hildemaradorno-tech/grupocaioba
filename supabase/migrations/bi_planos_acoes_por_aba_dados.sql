-- BI Planos de Manutenção: move as liberações já feitas para o menu da aba (08/11/2026).
-- editar_metas: Tela → Aba Resultado · definir_acao: Tela → Aba Oportunidades · ver_manual: removida (manual é livre).
INSERT INTO permissoes_grupo_acoes (grupo_id, menu_path, acao)
SELECT a.grupo_id, 'bi/planos-manutencao/resultado', 'editar_metas'
FROM permissoes_grupo_acoes a
WHERE a.menu_path = 'bi/planos-manutencao' AND a.acao = 'editar_metas'
  AND NOT EXISTS (SELECT 1 FROM permissoes_grupo_acoes b WHERE b.grupo_id = a.grupo_id
                  AND b.menu_path = 'bi/planos-manutencao/resultado' AND b.acao = 'editar_metas');

INSERT INTO permissoes_grupo_acoes (grupo_id, menu_path, acao)
SELECT a.grupo_id, 'bi/planos-manutencao/oportunidades', 'definir_acao'
FROM permissoes_grupo_acoes a
WHERE a.menu_path = 'bi/planos-manutencao' AND a.acao = 'definir_acao'
  AND NOT EXISTS (SELECT 1 FROM permissoes_grupo_acoes b WHERE b.grupo_id = a.grupo_id
                  AND b.menu_path = 'bi/planos-manutencao/oportunidades' AND b.acao = 'definir_acao');

DELETE FROM permissoes_grupo_acoes
WHERE menu_path = 'bi/planos-manutencao' AND acao IN ('editar_metas', 'definir_acao', 'ver_manual');
