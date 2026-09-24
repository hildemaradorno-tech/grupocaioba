-- Aba "Serviços" da Matriz KPIs passou a incluir o antigo Pós-Venda: uma única permissão
-- (kpi/bloco3-servicos). Quem tinha kpi/bloco3-pos-venda passa a ter kpi/bloco3-servicos.
INSERT INTO permissoes_grupo (grupo_id, menu_path)
SELECT DISTINCT grupo_id, 'kpi/bloco3-servicos'
FROM permissoes_grupo
WHERE menu_path = 'kpi/bloco3-pos-venda'
  AND NOT EXISTS (
    SELECT 1 FROM permissoes_grupo x
    WHERE x.grupo_id = permissoes_grupo.grupo_id AND x.menu_path = 'kpi/bloco3-servicos'
  );

DELETE FROM permissoes_grupo WHERE menu_path = 'kpi/bloco3-pos-venda';
