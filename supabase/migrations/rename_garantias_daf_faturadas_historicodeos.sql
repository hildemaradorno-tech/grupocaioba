-- Renomeia a rota/menu "garantias-daf-faturadas" (Garantias DAF Faturadas) para
-- "garantias-daf-historicodeos" (Histórico de O.S.). Atualiza os grupos de acesso
-- que já tinham permissão concedida para essa tela, preservando o acesso.
UPDATE public.permissoes_grupo
SET menu_path = 'garantias-daf-historicodeos'
WHERE menu_path = 'garantias-daf-faturadas';

UPDATE public.permissoes_grupo_acoes
SET menu_path = 'garantias-daf-historicodeos'
WHERE menu_path = 'garantias-daf-faturadas';
