-- Metas - Peças (vendedores): meta de margem (%) por mês. Lucro Peças = meta_faturamento × margem_pecas_pct / 100
-- (calculado na tela e no indicador do Balcão Peças).
ALTER TABLE public.fato_rascunho_metas_pecas
  ADD COLUMN IF NOT EXISTS margem_pecas_pct numeric;
