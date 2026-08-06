ALTER TABLE fato_politica_comissao
  ADD COLUMN IF NOT EXISTS detalhar_por_empresa boolean NOT NULL DEFAULT false;
