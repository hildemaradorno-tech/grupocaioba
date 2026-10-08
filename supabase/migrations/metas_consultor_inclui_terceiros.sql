-- Metas - Consultor: se o setor escolhido ("Mecânica + Terceiro" / "Funilaria + Terceiro") soma os
-- lançamentos de Terceiro (aba Mecânico, Setor "Terceiro") na referência, além do setor base.
ALTER TABLE public.fato_rascunho_metas_servicos_consultor
  ADD COLUMN IF NOT EXISTS inclui_terceiros boolean NOT NULL DEFAULT false;
