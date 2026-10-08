-- Define, por empresa, se o valor de Terceiro (aba Mecânico, Setor "Terceiro") entra na Referência de
-- Mecânica ou de Funilaria/Pintura pros consultores — switch único por empresa (nunca os dois ao mesmo
-- tempo, pra não contar em dobro entre as abas Consultor e Total). null = não entra em nenhum dos dois.
ALTER TABLE public.dim_empresas
  ADD COLUMN IF NOT EXISTS terceiros_setor text
  CHECK (terceiros_setor IS NULL OR terceiros_setor IN ('mecanica', 'funilaria'));
