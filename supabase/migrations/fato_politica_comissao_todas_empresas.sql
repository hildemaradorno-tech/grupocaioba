ALTER TABLE fato_politica_comissao
  ADD COLUMN IF NOT EXISTS comissao_todas_empresas boolean NOT NULL DEFAULT false;
