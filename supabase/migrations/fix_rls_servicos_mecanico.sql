-- Desabilita RLS na tabela de rascunho de metas de serviços mecânico
-- (padrão do projeto: todas as tabelas fato_rascunho_metas_* têm RLS desabilitado)
ALTER TABLE public.fato_rascunho_metas_servicos_mecanico DISABLE ROW LEVEL SECURITY;
