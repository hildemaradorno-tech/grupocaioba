-- Desabilita RLS na tabela de rascunho de metas de funilaria e pintura
-- (padrão do projeto: todas as tabelas fato_rascunho_metas_* têm RLS desabilitado)
ALTER TABLE public.fato_rascunho_metas_funilaria_pintura DISABLE ROW LEVEL SECURITY;
