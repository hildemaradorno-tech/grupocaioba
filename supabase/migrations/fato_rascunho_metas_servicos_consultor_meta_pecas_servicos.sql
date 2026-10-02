-- O cadastro de Consultor já CALCULA o split Peças/Serviços (calcMetaConsultorDetalhe), mas até
-- aqui só gravava o total combinado (meta_faturamento) — faltavam as colunas pra guardar a parte
-- de Peças e de Serviços separadamente, igual já existe em fato_metas_publicadas e nas rascunho
-- de Mecânico/Funilaria.
ALTER TABLE fato_rascunho_metas_servicos_consultor ADD COLUMN IF NOT EXISTS meta_pecas numeric(15,2);
ALTER TABLE fato_rascunho_metas_servicos_consultor ADD COLUMN IF NOT EXISTS meta_servicos numeric(15,2);
