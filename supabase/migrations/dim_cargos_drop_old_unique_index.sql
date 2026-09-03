-- O índice antigo (nome_cargo, agrupamento_empresa_id) ficou pra trás quando os Cargos passaram a
-- ser escopados por Empresa em vez de Agrupamento de Empresas (ver dim_cargos_empresa_id.sql).
-- Ele ainda bloqueia renomear/importar um cargo pro mesmo nome de outro cargo do mesmo agrupamento
-- — exatamente o cenário que motivou a mudança pra empresa_id (mesmo nome_cargo, CNPJs diferentes
-- dentro do mesmo agrupamento, ex: "ASSISTENTE ADMINISTRATIVO" em mais de uma empresa do grupo).
-- A chave correta agora é dim_cargos_empresa_codigo_unique (empresa_id, codigo_cargo).
DROP INDEX IF EXISTS dim_cargos_nome_agrupamento_unique;
