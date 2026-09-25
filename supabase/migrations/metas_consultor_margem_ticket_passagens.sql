-- Metas - Consultor: margem, tickets e passagens por mês (gravados junto da distribuição %).
--   margem_pecas_pct / margem_servicos_pct : meta de margem (%) de Peças e de Serviços
--   ticket_pecas / ticket_servicos         : ticket médio (R$) de Peças e de Serviços
--   ticket_total                           : ticket_pecas + ticket_servicos (calculado na tela e gravado)
--   passagens                              : Ref. Total do setor ÷ ticket_total (calculado na tela e gravado)
ALTER TABLE public.fato_rascunho_metas_servicos_consultor
  ADD COLUMN IF NOT EXISTS margem_pecas_pct    numeric,
  ADD COLUMN IF NOT EXISTS margem_servicos_pct numeric,
  ADD COLUMN IF NOT EXISTS ticket_pecas        numeric,
  ADD COLUMN IF NOT EXISTS ticket_servicos     numeric,
  ADD COLUMN IF NOT EXISTS ticket_total        numeric,
  ADD COLUMN IF NOT EXISTS passagens           numeric;
