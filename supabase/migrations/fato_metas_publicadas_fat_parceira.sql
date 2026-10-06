-- Metas - Peças (Balcão): parcela TRP (marca parceira) da Meta R$ do vendedor, publicada
-- junto com a meta para a Matriz KPIs (Faturamento TRP). Null para os demais tipos.
ALTER TABLE public.fato_metas_publicadas
  ADD COLUMN IF NOT EXISTS fat_parceira numeric;
