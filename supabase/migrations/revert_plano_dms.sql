-- Reverte o recurso de Comissão Plano DMS por completo (decisão do usuário: deixar como já era
-- pra todos os cargos, sem esse motor bespoke de cálculo). A política de comissão do cargo do
-- consultor que estava com tipo_calculo = 'PLANO_DMS' fica intacta em todo o resto — só perde
-- essa coluna (o usuário reconfigura Fonte/Base/percentuais normalmente pela tela depois).
ALTER TABLE fato_politica_comissao DROP COLUMN IF EXISTS tipo_calculo;

DROP TABLE IF EXISTS fato_plano_dms_valores;
DROP TABLE IF EXISTS dim_categorias_plano_dms;
