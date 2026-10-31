-- % do consultor com mais casas decimais: com só 2 casas, "% do box × Ref. Total" não fechava com o
-- valor exato do box (diferença de alguns reais). 6 casas deixam a meta igual ao valor do box.
ALTER TABLE public.fato_rascunho_metas_servicos_consultor
  ALTER COLUMN percentual TYPE numeric(10,6);
