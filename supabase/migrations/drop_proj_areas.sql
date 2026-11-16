-- Exclusão do cadastro "Áreas" próprio da Gestão de Projetos (menu Projetos → Cadastros → Áreas), a pedido
-- do usuário em 16/11/2026. Projetos usa o cadastro de Áreas da organização (dim_areas) — ver
-- proj_areas_para_dim_areas.sql, que já levou para dim_areas todas as áreas em uso.
-- Registro do conteúdo apagado (26 áreas, todas ativas):
--   BI, Caminhões Novos, Caminhões Usados, Cobrança, Compras, Contas a Pagar, Contas a Receber, Controladoria,
--   Crédito, CRM, Diretoria, Fiscal, Garantias, Geral, Gestão, Marketing, Novos, Peças, Pós-Vendas, Projetos,
--   Relacionamentos, RH, Seminovos, Serviços, Tesouraria, Vendas
-- (sem uso e NÃO levadas para dim_areas: Cobrança, Diretoria, Garantias, Novos, Projetos, RH, Seminovos, Tesouraria)
DELETE FROM permissoes_grupo_acoes WHERE menu_path IN ('projetos/areas', '/projetos/areas');
DELETE FROM permissoes_grupo       WHERE menu_path IN ('projetos/areas', '/projetos/areas');
DROP TABLE IF EXISTS proj_areas;

NOTIFY pgrst, 'reload schema';
