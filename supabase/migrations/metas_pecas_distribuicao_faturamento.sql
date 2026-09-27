-- Metas - Peças (vendedores): distribuição da Meta R$ do mês em três linhas.
--   Marca DAF   : fat_marca = Faturamento DAF,   fat_parceira = Faturamento TRP
--   Marca HONDA : fat_marca = Faturamento HONDA, fat_parceira = Faturamento HAMP
--   fat_outros = Faturamento Outros = meta_faturamento - fat_marca - fat_parceira (calculado na tela e gravado)
ALTER TABLE public.fato_rascunho_metas_pecas
  ADD COLUMN IF NOT EXISTS fat_marca    numeric,
  ADD COLUMN IF NOT EXISTS fat_parceira numeric,
  ADD COLUMN IF NOT EXISTS fat_outros   numeric;
