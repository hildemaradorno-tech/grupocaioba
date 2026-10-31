-- Guarda o % de Faturamento marca (DAF/HONDA) e parceira (TRP/HAMP) sobre a Meta R$ do vendedor: ao alterar
-- só a Meta, os valores se recalculam por esse %. Digitar o valor à mão atualiza o %. Null = sem % definido.
ALTER TABLE public.fato_rascunho_metas_pecas
  ADD COLUMN IF NOT EXISTS fat_marca_pct    numeric(10,6),
  ADD COLUMN IF NOT EXISTS fat_parceira_pct numeric(10,6);
